/**
 * Seller Feature Flags & Business-level Access Control Service
 * Manages global feature enablement, maintenance status, reasons, and per-business overrides.
 */

export interface SellerFeature {
  id: string;
  name: string;
  category: 'marketing' | 'finance' | 'inventory' | 'customer' | 'operations' | 'expansion';
  description: string;
  isEnabledGlobally: boolean;
  maintenanceReason?: string;
  disabledBusinesses: string[]; // List of Business IDs where this feature is specifically disabled
  enabledBusinesses?: string[]; // Specific whitelist overrides if globally disabled
  updatedAt: string;
  updatedBy: string;
  scheduledDisableAt?: string; // ISO datetime when this feature will auto-disable
  scheduledEnableAt?: string;  // ISO datetime when this feature will auto-enable
  scheduledReason?: string;    // Reason for scheduled maintenance
}

import { realtimeSyncBus } from './realtimeSyncBus';
import { adminNotificationService } from './adminNotificationService';
import { tokenStorage } from '../api/tokenStorage';

const STORAGE_KEY = 'huki_seller_feature_flags';

export const FEATURE_ROUTE_URL_MAP: Record<string, string> = {
  FLASH_SALE: '/seller/promotions/flash-sale',
  VOUCHERS: '/seller/promotions/vouchers',
  DISCOUNTS: '/seller/promotions/discounts',
  AFFILIATE: '/seller/affiliate',
  LIVESTREAM: '/seller/promotions/flash-sale',
  TOP_SELLER_BADGE: '/seller/profile',
  DIGITAL_PUBLISHING: '/seller/product/create-ebook',
  AUDIOBOOKS: '/seller/product/create',
  BULK_UPLOAD: '/seller/inventory',
  INVENTORY_SYNC: '/seller/inventory',
  WITHDRAWALS: '/seller/finance',
  AUTO_PAYOUT: '/seller/finance',
  VAT_INVOICE: '/seller/finance',
  RETURNS_MANAGEMENT: '/seller/returns',
  EXPRESS_SHIPPING: '/seller/orders',
  STAFF_MANAGEMENT: '/seller/staff',
  CUSTOMER_CHAT: '/seller/chat',
  REVIEWS_FEEDBACK: '/seller/reviews',
  AI_ASSISTANT: '/seller/products',
  CUSTOM_STOREFRONT: '/seller/stores',
};

export const DEFAULT_SELLER_FEATURES: SellerFeature[] = [
  {
    id: 'FLASH_SALE',
    name: 'Chương trình Flash Sale Giờ Vàng',
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
    name: 'Chương trình Combo & Mua Kèm Deal Sốc',
    category: 'marketing',
    description: 'Thiết lập mua kèm deal sốc, mua nhiều giảm sâu và combo trọn bộ tác phẩm.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'AFFILIATE',
    name: 'Tiếp Thị Liên Kết (Affiliate KOC/KOL)',
    category: 'marketing',
    description: 'Kích hoạt mạng lưới tiếp thị liên kết, chia sẻ doanh thu và tự động trích hoa hồng cho người giới thiệu.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'LIVESTREAM',
    name: 'Livestream Bán Sách & Mini Game Tương Tác',
    category: 'marketing',
    description: 'Phát trực tiếp giới thiệu sách mới, giao lưu độc giả và tung voucher chớp nhoáng theo thời gian thực.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'TOP_SELLER_BADGE',
    name: 'Huy Hiệu Gian Hàng Uy Tín (HuKi Mall)',
    category: 'marketing',
    description: 'Gắn nhãn chứng nhận NXB / Tác giả chính thức, tăng độ tin cậy và ưu tiên xếp hạng hiển thị.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'DIGITAL_PUBLISHING',
    name: 'Xuất bản Sách điện tử (DRM / Ebook Bảo Vệ Vault)',
    category: 'inventory',
    description: 'Đăng tải bản đọc thử, đóng gói file EPUB/PDF có mã hóa bảo vệ bản quyền DRM HuKi an toàn tuyệt đối.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'AUDIOBOOKS',
    name: 'Phát Hành Sách Nói & Audio DRM Streaming',
    category: 'inventory',
    description: 'Tải lên các file âm thanh giọng đọc bản quyền, tạo danh sách chương và stream có kiểm soát mã hóa.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'BULK_UPLOAD',
    name: 'Nhập sách hàng loạt (Excel / CSV / ONIX)',
    category: 'inventory',
    description: 'Tải file mẫu và nhập thông tin hàng trăm đầu sách cùng lúc vào kho lưu trữ một cách tự động.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'INVENTORY_SYNC',
    name: 'Tự Động Đồng Bộ Tồn Kho Đa Chi Nhánh (API Sync)',
    category: 'inventory',
    description: 'Kết nối webhook đồng bộ tồn kho thời gian thực với phần mềm quản lý kho NXB (KiotViet, Sapo, Haravan).',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'WITHDRAWALS',
    name: 'Rút tiền & Quyết toán Escrow về Ngân hàng',
    category: 'finance',
    description: 'Yêu cầu chuyển doanh thu từ Ví Escrow bảo đảm về tài khoản ngân hàng chính chủ của doanh nghiệp.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'AUTO_PAYOUT',
    name: 'Quyết Toán Tự Động Định Kỳ (Auto Bi-weekly Payout)',
    category: 'finance',
    description: 'Hệ thống tự động giải ngân doanh thu bán sách định kỳ mỗi 2 tuần vào số tài khoản đối soát mặc định.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'VAT_INVOICE',
    name: 'Xuất Hóa Đơn Điện Tử VAT Tự Động',
    category: 'finance',
    description: 'Tự động tạo và gửi hóa đơn GTGT điện tử tới hộp thư độc giả khi đơn hàng được giao thành công.',
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
    description: 'Tiếp nhận yêu cầu khiếu nại, phản hồi bằng chứng và duyệt đổi trả từ người mua theo quy chuẩn sàn.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'EXPRESS_SHIPPING',
    name: 'Giao Hàng Hỏa Tốc 2H & Ghép Tuyến Thông Minh',
    category: 'operations',
    description: 'Bật dịch vụ giao hỏa tốc nội thành 2 giờ kết nối trực tiếp với đội ngũ bưu tá và dịch vụ đối tác.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'STAFF_MANAGEMENT',
    name: 'Phân quyền & Quản lý Nhân viên Gian hàng',
    category: 'operations',
    description: 'Thêm tài khoản nhân viên vận hành kho, thủ kho, kế toán với phân quyền theo vai trò chi tiết.',
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
    description: 'Trò chuyện thời gian thực với độc giả, giải đáp thắc mắc và gửi ưu đãi trực tiếp trong phiên chat.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'REVIEWS_FEEDBACK',
    name: 'Quản Lý Đánh Giá & Phản Hồi Độc Giả',
    category: 'customer',
    description: 'Xem nhận xét, gửi lời cảm ơn người đọc và gửi yêu cầu kiểm duyệt đối với đánh giá vi phạm tiêu chuẩn cộng đồng.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'AI_ASSISTANT',
    name: 'Trợ Lý AI Tóm Tắt Sách & Gợi Ý Tiêu Đề SEO',
    category: 'expansion',
    description: 'Trí tuệ nhân tạo HuKi AI tự động đọc hiểu tóm tắt tác phẩm, sinh mô tả chuẩn SEO và gợi ý từ khóa bán sách.',
    isEnabledGlobally: true,
    maintenanceReason: '',
    disabledBusinesses: [],
    updatedAt: new Date().toISOString(),
    updatedBy: 'Admin System',
  },
  {
    id: 'CUSTOM_STOREFRONT',
    name: 'Tùy Biến Giao Diện Gian Hàng (Trang Trí Shop)',
    category: 'expansion',
    description: 'Thiết kế banner thương hiệu, sắp xếp bố cục tủ sách nổi bật và video trailer giới thiệu NXB.',
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

      // 1. Listen to cross-tab storage events
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            this.cache = parsed;
            window.dispatchEvent(new CustomEvent('huki_feature_flags_updated', { detail: parsed }));
          } catch {}
        }
      });

      // 2. Listen to RealtimeSyncBus
      realtimeSyncBus.subscribe((msg) => {
        if (msg.type === 'FEATURE_FLAGS_UPDATED') {
          const payload = (msg as any).payload as SellerFeature[];
          if (Array.isArray(payload)) {
            this.cache = payload;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            } catch {}
            window.dispatchEvent(new CustomEvent('huki_feature_flags_updated', { detail: payload }));
          }
        }
      });

      // 3. Background interval checking scheduled disable & enable timers (every 1 second)
      setInterval(() => {
        this.checkScheduledTimers();
      }, 1000);

      // Initial async sync from server
      this.syncFromServer();
    }
  }

  public async syncFromServer(businessId?: string): Promise<SellerFeature[]> {
    if (typeof window === 'undefined' || this.isSyncing) return this.getStoredFeatures();
    this.isSyncing = true;
    try {
      const token = tokenStorage.getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const query = businessId ? `?businessId=${encodeURIComponent(businessId)}` : '';
      const res = await fetch(`/api/seller/feature-flags${query}`, {
        headers,
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json().catch(() => ({}));
        if (json && (json.status === 'success' || json.success) && Array.isArray(json.data)) {
          const serverFeatures = json.data as SellerFeature[];
          const current = this.getStoredFeatures();
          const localMap = new Map(current.map(f => [f.id, f]));

          const merged = serverFeatures.map(serverItem => {
            const localItem = localMap.get(serverItem.id);
            if (localItem) {
              const localTime = new Date(localItem.updatedAt || 0).getTime();
              const serverTime = new Date(serverItem.updatedAt || 0).getTime();
              if (localTime > serverTime) {
                return localItem;
              }
            }
            return serverItem;
          });

          this.saveFeatures(merged);
          return merged;
        }
      }
    } catch {
      // Offline fallback
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
        if (Array.isArray(parsed)) {
          // Merge with DEFAULT_SELLER_FEATURES so newly added features appear automatically
          const map = new Map<string, SellerFeature>();
          DEFAULT_SELLER_FEATURES.forEach((df) => map.set(df.id, df));
          parsed.forEach((pf: SellerFeature) => {
            const base = map.get(pf.id);
            if (base) {
              map.set(pf.id, { ...base, ...pf });
            } else {
              map.set(pf.id, pf);
            }
          });
          const merged = Array.from(map.values());
          this.cache = merged;
          return merged;
        }
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
          // If enabled, clear disable schedule
          scheduledDisableAt: isEnabled ? undefined : f.scheduledDisableAt,
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin HuKi',
        };
      }
      return f;
    });

    this.saveFeatures(updated);

    if (typeof window !== 'undefined') {
      const token = tokenStorage.getAccessToken();
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

  /**
   * Schedule automated shutdown / enable timer for a specific feature
   */
  public scheduleFeature(
    featureId: string,
    options: {
      disableAt?: string;
      enableAt?: string;
      reason?: string;
      updatedBy?: string;
    }
  ): void {
    const features = this.getStoredFeatures();
    const target = features.find((f) => f.id === featureId);
    if (!target) return;

    const updated = features.map((f) => {
      if (f.id === featureId) {
        return {
          ...f,
          scheduledDisableAt: options.disableAt || undefined,
          scheduledEnableAt: options.enableAt || undefined,
          scheduledReason: options.reason || f.scheduledReason || 'Hẹn giờ bảo trì nâng cấp hệ thống',
          updatedAt: new Date().toISOString(),
          updatedBy: options.updatedBy || 'Admin System',
        };
      }
      return f;
    });

    this.saveFeatures(updated);

    // Sync to server API
    if (typeof window !== 'undefined') {
      const token = tokenStorage.getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/seller/feature-flags', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'SCHEDULE_TIMER',
          featureId,
          scheduledDisableAt: options.disableAt,
          scheduledEnableAt: options.enableAt,
          scheduledReason: options.reason,
        }),
      }).catch(() => {});
    }

    // Broadcast announcement about upcoming scheduled maintenance
    if (options.disableAt) {
      const scheduledTimeStr = new Date(options.disableAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      });
      adminNotificationService.createNotification({
        id: `sched-notif-${featureId}-${Date.now()}`,
        title: `Lịch hẹn bảo trì tính năng: ${target.name}`,
        summary: `Tính năng "${target.name}" sẽ tạm dừng hoạt động vào lúc ${scheduledTimeStr} để bảo trì.`,
        content: `Kính gửi các Quý Đối Tác Gian Hàng,\n\nBan Quản Trị HUKI xin thông báo lịch bảo trì kỹ thuật đối với tính năng [${target.name}].\n\n- Thời điểm tạm đóng: ${scheduledTimeStr}\n- Lý do: ${options.reason || 'Nâng cấp và tối ưu hệ thống'}${options.enableAt ? `\n- Dự kiến mở lại: ${new Date(options.enableAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}` : ''}\n\nQuý gian hàng vui lòng chủ động hoàn tất các giao dịch liên quan trước khung giờ trên.`,
        category: 'MAINTENANCE',
        severity: 'WARNING',
        targetRole: 'SELLER',
        targetType: 'ALL',
        channels: ['TOP_BAR', 'BELL'],
        isPinnedTop: false,
        isDismissible: true,
        scheduleType: 'INSTANT',
        status: 'ACTIVE',
        actionUrl: FEATURE_ROUTE_URL_MAP[featureId] || '/seller/notifications',
        actionLabel: 'Chi tiết tính năng',
        authorName: 'Bộ Phận Kỹ Thuật HUKI',
      });
    }
  }

  /**
   * Cancel scheduled shutdown / enable for a feature
   */
  public cancelFeatureSchedule(featureId: string): void {
    const features = this.getStoredFeatures();
    const target = features.find((f) => f.id === featureId);
    if (!target) return;

    const updated = features.map((f) => {
      if (f.id === featureId) {
        return {
          ...f,
          scheduledDisableAt: undefined,
          scheduledEnableAt: undefined,
          scheduledReason: undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return f;
    });

    this.saveFeatures(updated);

    if (typeof window !== 'undefined') {
      const token = tokenStorage.getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/seller/feature-flags', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'CANCEL_SCHEDULE',
          featureId,
        }),
      }).catch(() => {});
    }
  }

  /**
   * Background 1-second checker that automatically triggers disable or enable
   */
  private checkScheduledTimers(): void {
    if (typeof window === 'undefined') return;
    const features = this.getStoredFeatures();
    let hasChanges = false;
    const now = Date.now();

    const updated = features.map((f) => {
      const copy = { ...f };

      // 1. Auto-disable check
      if (copy.isEnabledGlobally && copy.scheduledDisableAt) {
        const disableTime = new Date(copy.scheduledDisableAt).getTime();
        if (now >= disableTime) {
          copy.isEnabledGlobally = false;
          copy.maintenanceReason = copy.scheduledReason || 'Tính năng đang tạm dừng theo lịch bảo trì hẹn trước';
          copy.scheduledDisableAt = undefined;
          copy.updatedAt = new Date().toISOString();
          copy.updatedBy = 'Auto Scheduler';
          hasChanges = true;

          adminNotificationService.createNotification({
            id: `auto-off-${copy.id}-${Date.now()}`,
            title: `[Tự Động Tắt] Tính năng: ${copy.name} đã tạm đóng`,
            summary: `Tính năng "${copy.name}" đã tạm đóng tự động theo lịch hẹn để bảo trì.`,
            content: `Tính năng "${copy.name}" đã chuyển sang trạng thái bảo trì tự động lúc ${new Date().toLocaleTimeString('vi-VN')}. Lý do: ${copy.maintenanceReason}.`,
            category: 'MAINTENANCE',
            severity: 'CRITICAL',
            targetRole: 'SELLER',
            targetType: 'ALL',
            channels: ['TOP_BAR', 'BELL'],
            isPinnedTop: true,
            isDismissible: true,
            scheduleType: 'INSTANT',
            status: 'ACTIVE',
            actionUrl: FEATURE_ROUTE_URL_MAP[copy.id] || '/seller/notifications',
            actionLabel: 'Kiểm tra trạng thái',
            authorName: 'Hệ Thống Tự Động HUKI',
          });
        }
      }

      // 2. Auto-enable check
      if (!copy.isEnabledGlobally && copy.scheduledEnableAt) {
        const enableTime = new Date(copy.scheduledEnableAt).getTime();
        if (now >= enableTime) {
          copy.isEnabledGlobally = true;
          copy.maintenanceReason = '';
          copy.scheduledEnableAt = undefined;
          copy.scheduledReason = undefined;
          copy.updatedAt = new Date().toISOString();
          copy.updatedBy = 'Auto Scheduler';
          hasChanges = true;

          adminNotificationService.createNotification({
            id: `auto-on-${copy.id}-${Date.now()}`,
            title: `[Mở Lại] Tính năng: ${copy.name} đã hoạt động trở lại`,
            summary: `Bảo trì hoàn tất, tính năng "${copy.name}" đã được mở lại cho toàn bộ gian hàng.`,
            content: `Ban Quản Trị xin thông báo công tác bảo trì đối với [${copy.name}] đã hoàn tất. Tính năng đã hoạt động ổn định trở lại từ ${new Date().toLocaleTimeString('vi-VN')}.`,
            category: 'SYSTEM',
            severity: 'INFO',
            targetRole: 'SELLER',
            targetType: 'ALL',
            channels: ['TOP_BAR', 'BELL'],
            isPinnedTop: false,
            isDismissible: true,
            scheduleType: 'INSTANT',
            status: 'ACTIVE',
            actionUrl: FEATURE_ROUTE_URL_MAP[copy.id] || '/seller/dashboard',
            actionLabel: 'Truy cập tính năng',
            authorName: 'Bộ Phận Kỹ Thuật HUKI',
          });
        }
      }

      return copy;
    });

    if (hasChanges) {
      this.saveFeatures(updated);
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
      const token = tokenStorage.getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/seller/feature-flags', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'UPDATE_DETAILS',
          featureId,
          ...updates,
        }),
      }).catch(() => {});
    }
  }

  public toggleBusinessForFeature(featureId: string, businessId: string, isBlocked: boolean): void {
    const features = this.getStoredFeatures();
    const updated = features.map(f => {
      if (f.id === featureId) {
        const currentDisabled = new Set(f.disabledBusinesses || []);
        if (isBlocked) {
          currentDisabled.add(businessId);
        } else {
          currentDisabled.delete(businessId);
        }
        return {
          ...f,
          disabledBusinesses: Array.from(currentDisabled),
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin HuKi',
        };
      }
      return f;
    });

    this.saveFeatures(updated);

    if (typeof window !== 'undefined') {
      const token = tokenStorage.getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/seller/feature-flags', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'TOGGLE_BUSINESS',
          featureId,
          businessId,
          isBlocked,
        }),
      }).catch(() => {});
    }
  }

  public bulkToggleBusinessFeatures(businessIds: string[], featureIds: string[], isBlocked: boolean): void {
    const features = this.getStoredFeatures();
    const updated = features.map(f => {
      if (featureIds.includes(f.id)) {
        const currentDisabled = new Set(f.disabledBusinesses || []);
        businessIds.forEach(bId => {
          if (isBlocked) {
            currentDisabled.add(bId);
          } else {
            currentDisabled.delete(bId);
          }
        });
        return {
          ...f,
          disabledBusinesses: Array.from(currentDisabled),
          updatedAt: new Date().toISOString(),
          updatedBy: 'Admin HuKi',
        };
      }
      return f;
    });

    this.saveFeatures(updated);

    if (typeof window !== 'undefined') {
      const token = tokenStorage.getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      fetch('/api/seller/feature-flags', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'BULK_TOGGLE_BUSINESS',
          featureIds,
          businessIds,
          isBlocked,
        }),
      }).catch(() => {});
    }
  }

  public isFeatureEnabledForBusiness(featureId: string, businessId?: string): boolean {
    const feature = this.getFeature(featureId);
    if (!feature) return true;

    if (!feature.isEnabledGlobally) {
      if (businessId && feature.enabledBusinesses && feature.enabledBusinesses.includes(businessId)) {
        return true;
      }
      return false;
    }

    if (businessId && feature.disabledBusinesses && feature.disabledBusinesses.includes(businessId)) {
      return false;
    }

    return true;
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

  public getMaintenanceReason(featureId: string, businessId?: string): string | null {
    const feature = this.getFeature(featureId);
    if (!feature) return null;

    if (!feature.isEnabledGlobally) {
      if (businessId && feature.enabledBusinesses && feature.enabledBusinesses.includes(businessId)) {
        return null;
      }
      return feature.maintenanceReason || 'Tính năng đang được nâng cấp bảo trì định kỳ';
    }

    if (businessId && feature.disabledBusinesses && feature.disabledBusinesses.includes(businessId)) {
      return 'Gian hàng của bạn tạm thời chưa được cấp quyền sử dụng tính năng này. Vui lòng liên hệ hỗ trợ HUKI.';
    }

    return null;
  }
}

export const featureFlagsService = new FeatureFlagsService();
