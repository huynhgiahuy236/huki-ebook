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

export const FEATURE_ROUTE_URL_MAP: Record<string, string> = {
  FLASH_SALE: '/seller/promotions/flash-sale',
  VOUCHERS: '/seller/promotions/vouchers',
  DISCOUNTS: '/seller/promotions/discounts',
  DIGITAL_PUBLISHING: '/seller/product/create-ebook',
  BULK_UPLOAD: '/seller/products/bulk',
  WITHDRAWALS: '/seller/finance',
  RETURNS_MANAGEMENT: '/seller/returns',
  STAFF_MANAGEMENT: '/seller/staff',
  CUSTOMER_CHAT: '/seller/chat',
};


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
      // 0. Update internal cache on custom event
      window.addEventListener('huki_feature_flags_updated', (e: any) => {
        if (Array.isArray(e.detail)) {
          this.cache = e.detail;
        }
      });

      // 1. Cross-tab storage synchronization
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.cache = parsed;
            window.dispatchEvent(new CustomEvent('huki_feature_flags_updated', { detail: parsed }));
          } catch {}
        }
      });

      // 2. RealtimeSyncBus event listener
      realtimeSyncBus.subscribe((msg) => {
        if (msg.type === 'FEATURE_FLAGS_UPDATED') {
          if (Array.isArray(msg.payload)) {
            this.cache = msg.payload as SellerFeature[];
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(msg.payload));
            } catch {}
          } else {
            this.cache = null;
            this.getStoredFeatures();
          }
          window.dispatchEvent(new CustomEvent('huki_feature_flags_updated', { detail: this.cache }));
        }
      });

      this.syncFromServer();
      window.addEventListener('focus', () => this.syncFromServer());
      setInterval(() => this.syncFromServer(), 2000);
    }
  }

  public async syncFromServer(): Promise<SellerFeature[]> {
    if (typeof window === 'undefined' || this.isSyncing) return this.getStoredFeatures();
    this.isSyncing = true;
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('huki_access_token') : null;
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/seller/feature-flags', { headers, cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const dataList = json.data || (Array.isArray(json) ? json : null);
        if ((json.success || json.status === 'success' || Array.isArray(json.data)) && Array.isArray(dataList)) {
          const serverList: SellerFeature[] = dataList;
          const currentStored = this.getStoredFeatures();
          const isChanged = JSON.stringify(serverList) !== JSON.stringify(currentStored);
          this.cache = serverList;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverList));
          if (isChanged) {
            realtimeSyncBus.publish('FEATURE_FLAGS_UPDATED', serverList, { roles: ['ALL'] });
            window.dispatchEvent(new CustomEvent('huki_feature_flags_updated', { detail: serverList }));
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
    if (typeof window === 'undefined') return DEFAULT_SELLER_FEATURES;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        this.cache = parsed;
        return parsed;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SELLER_FEATURES));
      this.cache = DEFAULT_SELLER_FEATURES;
      return DEFAULT_SELLER_FEATURES;
    } catch (e) {
      console.error('Error reading feature flags from storage', e);
      return this.cache || DEFAULT_SELLER_FEATURES;
    }
  }

  private saveFeatures(features: SellerFeature[]): void {
    this.cache = features;
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(features));
      // Dispatch real-time cross-tab sync message
      realtimeSyncBus.publish('FEATURE_FLAGS_UPDATED', features, { roles: ['ALL'] });
      window.dispatchEvent(new CustomEvent('huki_feature_flags_updated', { detail: features }));
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
      const token = localStorage.getItem('huki_access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/seller/feature-flags', {
        method: 'POST',
        headers,
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
          targetRole: 'ALL',
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
        // 1. Remove maintenance notification
        adminNotificationService.deleteNotification(`maint-${featureId}`);

        // 2. Dispatch official celebratory Re-open Notification to all sellers
        const featureUrl = FEATURE_ROUTE_URL_MAP[featureId] || '/seller/dashboard';
        adminNotificationService.createNotification({
          id: `reopen-${featureId}-${Date.now()}`,
          title: `[Đã Mở Lại] ${featName}`,
          summary: `Tính năng "${featName}" đã hoàn tất nâng cấp bảo trì và mở lại hoạt động bình thường trên kênh Người Bán.`,
          content: `Hệ thống HUKI thông báo: Quá trình bảo trì, nâng cấp tính năng "${featName}" đã hoàn tất thành công.\n\nTính năng hiện đã mở lại 100% hoạt động bình thường trên toàn hệ thống Kênh Người Bán. Quý Đối Tác có thể tiếp tục thao tác tạo mới và quản trị ngay từ bây giờ.\n\nChúc Quý Đối Tác kinh doanh hồng phát và đạt nhiều đơn hàng mới!`,
          category: 'SYSTEM',
          severity: 'INFO',
          targetRole: 'ALL',
          targetType: 'ALL',
          channels: ['TOP_BAR', 'BELL'],
          isPinnedTop: false,
          isDismissible: true,
          scheduleType: 'INSTANT',
          status: 'ACTIVE',
          authorName: 'Ban Quản Trị HUKI',
          actionUrl: featureUrl,
          actionLabel: 'Truy cập ngay',
        });
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

    const isGloballyActive = feature.isEnabledGlobally !== undefined 
      ? Boolean(feature.isEnabledGlobally) 
      : (feature as any).isEnabled !== false;

    if (!isGloballyActive) {
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
