/**
 * Seller Feature Flags & Business-level Access Control Service
 * Manages global feature enablement, maintenance status, reasons, and per-business overrides.
 */

export interface SellerFeature {
  id: string;
  name: string;
  category: 'marketing' | 'finance' | 'inventory' | 'customer' | 'operations';
  description: string;
  isEnabledGlobally: boolean;
  maintenanceReason?: string;
  disabledBusinesses: string[]; // List of Business IDs where this feature is specifically disabled
  enabledBusinesses?: string[]; // Specific whitelist overrides if globally disabled
  updatedAt: string;
  updatedBy: string;
}

import { realtimeSyncBus } from './realtimeSyncBus';
import { adminNotificationService } from './adminNotificationService';

const STORAGE_KEY = 'huki_seller_feature_flags';

export const DEFAULT_SELLER_FEATURES: SellerFeature[] = [
  {
    id: 'FLASH_SALE',
    name: 'Chương trình Flash Sale',
    category: 'marketing',
    description: 'Cho phép Người bán đăng ký sản phẩm tham gia Flash Sale theo khung giờ hệ thống.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'VOUCHERS',
    name: 'Mã giảm giá & Voucher Cửa hàng',
    category: 'marketing',
    description: 'Tạo mã voucher giảm giá, hoàn xu và mã tri ân khách hàng riêng cho từng gian hàng.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'DISCOUNTS',
    name: 'Chương trình Combo & Khuyến mãi',
    category: 'marketing',
    description: 'Thiết lập mua kèm deal sốc, mua nhiều giảm sâu và combo trọn bộ tác phẩm.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'DIGITAL_PUBLISHING',
    name: 'Xuất bản Sách điện tử (DRM / Ebook)',
    category: 'inventory',
    description: 'Đăng tải bản đọc thử, đóng gói file EPUB/PDF có mã hóa bảo vệ bản quyền DRM HuKi.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'BULK_UPLOAD',
    name: 'Nhập sách hàng loạt (Excel / CSV)',
    category: 'inventory',
    description: 'Tải file mẫu và nhập thông tin hàng trăm đầu sách cùng lúc vào kho lưu trữ.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'WITHDRAWALS',
    name: 'Rút tiền & Quyết toán Escrow',
    category: 'finance',
    description: 'Yêu cầu chuyển doanh thu từ Ví Escrow bảo đảm về tài khoản ngân hàng doanh nghiệp.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'RETURNS_MANAGEMENT',
    name: 'Quản lý & Xử lý Trả hàng / Hoàn tiền',
    category: 'operations',
    description: 'Tiếp nhận yêu cầu khiếu nại, phản hồi bằng chứng và duyệt đổi trả từ người mua.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'STAFF_MANAGEMENT',
    name: 'Phân quyền & Quản lý Nhân viên',
    category: 'operations',
    description: 'Thêm tài khoản nhân viên vận hành kho, thủ kho, kế toán với phân quyền theo vai trò.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'CUSTOMER_CHAT',
    name: 'Tin nhắn CSKH & Tư vấn Trực tuyến',
    category: 'customer',
    description: 'Trò chuyện thời gian thực với độc giả, giải đáp thắc mắc và gửi ưu đãi trực tiếp.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
];

class FeatureFlagsService {
  private cache: SellerFeature[] | null = null;
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.syncFromServer();
      window.addEventListener('focus', () => this.syncFromServer());
      setInterval(() => this.syncFromServer(), 3000);
    }
  }

  public async syncFromServer(): Promise<SellerFeature[]> {
    if (typeof window === 'undefined' || this.isSyncing) return this.getStoredFeatures();
    this.isSyncing = true;
    try {
      const res = await fetch('/api/seller/feature-flags', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const serverList: SellerFeature[] = json.data;
          const currentStored = this.getStoredFeatures();
          const isChanged = JSON.stringify(serverList) !== JSON.stringify(currentStored);
          this.cache = serverList;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverList));
          if (isChanged) {
            realtimeSyncBus.publish('FEATURE_FLAGS_UPDATED', serverList);
          }
          return serverList;
        }
      }
    } catch {
      // offline fallback
    } finally {
      this.isSyncing = false;
    }
    return this.getStoredFeatures();
  }

  private getStoredFeatures(): SellerFeature[] {
    if (this.cache) return this.cache;
    if (typeof window === 'undefined') return DEFAULT_SELLER_FEATURES;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SELLER_FEATURES));
        this.cache = DEFAULT_SELLER_FEATURES;
        return DEFAULT_SELLER_FEATURES;
      }
      const parsed = JSON.parse(data);
      this.cache = parsed;
      return parsed;
    } catch (e) {
      console.error('Error reading feature flags from storage', e);
      return DEFAULT_SELLER_FEATURES;
    }
  }

  private saveFeatures(features: SellerFeature[]): void {
    this.cache = features;
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
      // Dispatch real-time cross-tab sync message
      realtimeSyncBus.publish('FEATURE_FLAGS_UPDATED', features);
    } catch (e) {
      console.error('Error saving feature flags', e);
    }
  }

  public getAllFeatures(): SellerFeature[] {
    return this.getStoredFeatures();
  }

  public getFeature(featureId: string): SellerFeature | undefined {
    return this.getStoredFeatures().find(f => f.id === featureId);
  }

  public toggleGlobalFeature(featureId: string, isEnabled: boolean, maintenanceReason?: string): void {
    const features = this.getStoredFeatures();
    const targetFeat = features.find(f => f.id === featureId);
    const featName = targetFeat?.name || featureId;
    const finalReason = isEnabled ? '' : (maintenanceReason || 'Tính năng đang được nâng cấp bảo trì');

    const updated = features.map(f => {
      if (f.id === featureId) {
        return {
          ...f,
          isEnabledGlobally: isEnabled,
          maintenanceReason: finalReason,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin HuKi',
        };
      }
      return f;
    });

    this.saveFeatures(updated);

    if (typeof window !== 'undefined') {
      fetch('/api/seller/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'TOGGLE_GLOBAL',
          featureId,
          isEnabled,
          maintenanceReason: finalReason,
        }),
      }).catch(() => {});
    }

    // Synchronize announcement notification
    try {
      if (!isEnabled) {
        adminNotificationService.createNotification({
          id: `maint-${featureId}`,
          title: `[Tạm bảo trì] ${featName}`,
          summary: finalReason,
          content: `Hệ thống HUKI đang tiến hành bảo trì, nâng cấp tính năng "${featName}".\n\nLý do: ${finalReason}\n\nTrong thời gian này, quý đối tác Seller tạm thời không thể sử dụng tính năng này. Chúng tôi sẽ mở lại tính năng ngay khi hoàn tất. Trân trọng cảm ơn sự thông cảm của Quý Đối Tác!`,
          category: 'MAINTENANCE',
          severity: 'WARNING',
          targetType: 'ALL',
          channels: ['TOP_BAR', 'BELL'],
          isPinnedTop: true,
          isDismissible: true,
          scheduleType: 'INSTANT',
          status: 'ACTIVE',
          authorName: 'Hệ Thống Quản Trị HUKI',
          actionUrl: '/seller/notifications',
          actionLabel: 'Xem Chi Tiết',
        });
      } else {
        adminNotificationService.deleteNotification(`maint-${featureId}`);
      }
    } catch (e) {
      console.warn('Failed to auto-sync maintenance announcement:', e);
    }
  }

  public updateFeatureDetails(featureId: string, updates: Partial<SellerFeature>): void {
    const features = this.getStoredFeatures();
    const updated = features.map(f => {
      if (f.id === featureId) {
        return {
          ...f,
          ...updates,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin HuKi',
        };
      }
      return f;
    });
    this.saveFeatures(updated);

    if (typeof window !== 'undefined') {
      fetch('/api/seller/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE', featureId, updates }),
      }).catch(() => {});
    }
  }

  public toggleBusinessForFeature(featureId: string, businessId: string, block: boolean): void {
    const features = this.getStoredFeatures();
    const updated = features.map(f => {
      if (f.id === featureId) {
        const disabledSet = new Set(f.disabledBusinesses || []);
        if (block) {
          disabledSet.add(businessId);
        } else {
          disabledSet.delete(businessId);
        }
        return {
          ...f,
          disabledBusinesses: Array.from(disabledSet),
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin HuKi',
        };
      }
      return f;
    });
    this.saveFeatures(updated);

    if (typeof window !== 'undefined') {
      fetch('/api/seller/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_BUSINESS', featureId, businessId, block }),
      }).catch(() => {});
    }
  }

  public bulkToggleBusinessFeatures(businessIds: string[], featureIds: string[], block: boolean): void {
    const features = this.getStoredFeatures();
    const updated = features.map(f => {
      if (featureIds.includes(f.id)) {
        const disabledSet = new Set(f.disabledBusinesses || []);
        businessIds.forEach(bId => {
          if (block) disabledSet.add(bId);
          else disabledSet.delete(bId);
        });
        return {
          ...f,
          disabledBusinesses: Array.from(disabledSet),
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin HuKi',
        };
      }
      return f;
    });
    this.saveFeatures(updated);

    if (typeof window !== 'undefined') {
      fetch('/api/seller/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'BULK_TOGGLE', businessIds, featureIds, block }),
      }).catch(() => {});
    }
  }

  /**
   * Check if a feature is accessible for a specific seller/business
   */
  public isFeatureAccessible(featureId: string, businessId?: string): {
    accessible: boolean;
    reason?: string;
  } {
    const feature = this.getFeature(featureId);
    if (!feature) {
      return { accessible: true };
    }

    if (!feature.isEnabledGlobally) {
      return {
        accessible: false,
        reason: feature.maintenanceReason || 'Tính năng này đang tạm đóng để bảo trì hệ thống.',
      };
    }

    if (businessId && feature.disabledBusinesses && feature.disabledBusinesses.includes(businessId)) {
      return {
        accessible: false,
        reason: 'Doanh nghiệp của bạn đang bị giới hạn quyền truy cập tính năng này bởi Quản trị viên.',
      };
    }

    return { accessible: true };
  }
}

export const featureFlagsService = new FeatureFlagsService();
