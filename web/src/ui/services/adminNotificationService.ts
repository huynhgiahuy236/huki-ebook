/**
 * Admin Notification & Broadcast Management Service
 * Supports:
 * - Realtime announcements (WordPress-style Top Notice Bar, Bell dropdown, Full page center)
 * - Audience targeting: Global (All Sellers), Segment (Ebook / Physical / New), Direct (1-1 Shop)
 * - Severity levels: INFO, WARNING, CRITICAL
 * - Placements: TOP_BAR, BELL, MODAL
 * - Scheduling: INSTANT, SCHEDULED, RECURRING (e.g. Day 1 & 15 Escrow reconciliation)
 */

export type NotificationCategory = 'MAINTENANCE' | 'POLICY' | 'ORDER' | 'FINANCE' | 'MARKETING' | 'SECURITY';
export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type TargetRole = 'ALL' | 'SELLER' | 'CUSTOMER' | 'SHIPPER';
export type TargetAudienceType = 'ALL' | 'SEGMENT' | 'DIRECT';
export type TargetSegment =
  | 'ALL'
  | 'DIGITAL_SELLERS'
  | 'PHYSICAL_SELLERS'
  | 'NEW_SELLERS'
  | 'AT_RISK_SELLERS'
  | 'ALL_CUSTOMERS'
  | 'VIP_CUSTOMERS'
  | 'CUSTOMERS_WITH_ACTIVE_ORDERS'
  | 'ALL_SHIPPERS'
  | 'ONLINE_SHIPPERS'
  | 'REGION_HANOI'
  | 'REGION_HCMC'
  | 'REGION_OTHER';
export type NotificationPlacement = 'TOP_BAR' | 'BELL' | 'MODAL';
export type ScheduleType = 'INSTANT' | 'SCHEDULED' | 'RECURRING';
export type RecurringFrequency = 'BI_MONTHLY' | 'WEEKLY_MONDAY' | 'MONTHLY_FIRST';

export interface AdminBroadcastNotification {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  targetRole?: TargetRole;
  targetType: TargetAudienceType;
  targetSegment?: TargetSegment;
  targetBusinessIds?: string[];
  targetBusinessNames?: string[];
  channels: NotificationPlacement[];
  isPinnedTop?: boolean;
  isDismissible?: boolean;
  scheduleType: ScheduleType;
  scheduledAt?: string;
  recurringRule?: RecurringFrequency;
  status: 'ACTIVE' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  authorName: string;
  readByBusinessIds: string[];
  dismissedByBusinessIds: string[];
  actionUrl?: string;
  actionLabel?: string;
}

import { realtimeSyncBus } from './realtimeSyncBus';

const STORAGE_KEY = 'huki_admin_broadcast_notifications';

export const DEFAULT_BROADCAST_NOTIFICATIONS: AdminBroadcastNotification[] = [
  {
    id: 'notif-escrow-recon',
    title: 'Kỳ đối soát & Quyết toán Escrow định kỳ (Kỳ 15 hàng tháng)',
    summary: 'Hệ thống tự động kết chuyển doanh thu các đơn hàng hoàn tất vào Ví Khả Dụng trước 24:00.',
    content: 'Kính gửi Quý Nhà Xuất Bản và Đối Tác Bán Hàng,\n\nTheo quy chế vận hành sàn HUKI, hôm nay là kỳ đối soát doanh thu tự động định kỳ giữa tháng. Toàn bộ tiền giữ ký quỹ (Escrow) của các đơn hàng giao thành công và hết thời hạn đổi trả (sau 7 ngày) sẽ được giải ngân vào Ví Khả Dụng của gian hàng.\n\nQuý đối tác vui lòng kiểm tra mục [Tài chính & Doanh thu > Lịch sử Giao dịch Ví] để đối chiếu chi tiết.',
    category: 'FINANCE',
    severity: 'INFO',
    targetType: 'ALL',
    channels: ['TOP_BAR', 'BELL'],
    isPinnedTop: true,
    isDismissible: true,
    scheduleType: 'RECURRING',
    recurringRule: 'BI_MONTHLY',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    authorName: 'Ban Quản Trị HUKI',
    readByBusinessIds: [],
    dismissedByBusinessIds: [],
    actionUrl: '/seller/finance',
    actionLabel: 'Xem Ví Escrow',
  },
  {
    id: 'notif-maintenance-system',
    title: 'Thông báo kế hoạch bảo trì cổng thanh toán trực tuyến & DRMVault',
    summary: 'Hệ thống bảo trì máy chủ mã hóa DRM từ 01:00 đến 03:00 sáng mai. Tính năng xuất bản tạm ngắt trong khung giờ này.',
    content: 'Ban Quản Trị HUKI xin thông báo kế hoạch nâng cấp hạ tầng mã hóa chống sao chép DRM và hạ tầng cụm thanh toán VietQR:\n\n- Thời gian dự kiến: 01:00 - 03:00 (Sáng mai)\n- Ảnh hưởng: Trong khoảng thời gian này, tính năng tải file EPUB/PDF mới lên sàn và đối soát sẽ tạm ngắt kết nối. Các tính năng bán hàng và đọc sách của độc giả vẫn hoạt động bình thường.\n\nTrân trọng cảm ơn sự hợp tác của Quý Đối Tác!',
    category: 'MAINTENANCE',
    severity: 'WARNING',
    targetType: 'ALL',
    channels: ['TOP_BAR', 'BELL'],
    isPinnedTop: true,
    isDismissible: true,
    scheduleType: 'INSTANT',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    authorName: 'Bộ Phận Kỹ Thuật HUKI',
    readByBusinessIds: [],
    dismissedByBusinessIds: [],
    actionUrl: '/seller/notifications',
    actionLabel: 'Xem Lịch Bảo Trì',
  },
  {
    id: 'notif-policy-copyright',
    title: 'Cập nhật quy định kiểm duyệt bản quyền tác phẩm Ebook & Giấy phép NXB',
    summary: 'Mọi ấn bản số phát hành từ tháng này phải đính kèm hợp đồng chuyển nhượng quyền tác giả hợp lệ.',
    content: 'Nhằm đảm bảo tuân thủ nghiêm ngặt Luật Xuất Bản và bảo vệ quyền tác giả trong thời đại AI, Ban Quản Trị HUKI cập nhật biểu mẫu cam kết quyền sở hữu trí tuệ khi đăng tải tác phẩm sách số.\n\nCác ấn bản chưa bổ sung đủ tài liệu hợp lệ trước ngày 30 hàng tháng sẽ tạm chuyển về trạng thái Lưu Nháp.',
    category: 'POLICY',
    severity: 'CRITICAL',
    targetType: 'SEGMENT',
    targetSegment: 'DIGITAL_SELLERS',
    channels: ['BELL', 'MODAL'],
    isPinnedTop: false,
    isDismissible: true,
    scheduleType: 'INSTANT',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    authorName: 'Phòng Pháp Lý HUKI',
    readByBusinessIds: [],
    dismissedByBusinessIds: [],
    actionUrl: '/seller/product/correction',
    actionLabel: 'Kiểm Tra Danh Mục',
  },
];

class AdminNotificationService {
  private cache: AdminBroadcastNotification[] | null = null;
  private isSyncing = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.syncFromServer();
      window.addEventListener('focus', () => this.syncFromServer());
      setInterval(() => this.syncFromServer(), 3000);
    }
  }

  public async syncFromServer(): Promise<AdminBroadcastNotification[]> {
    if (typeof window === 'undefined' || this.isSyncing) return this.getStored();
    this.isSyncing = true;
    try {
      const res = await fetch('/api/admin/broadcast-notifications', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const serverList: AdminBroadcastNotification[] = json.data;
          const currentStored = this.getStored();
          const isChanged = JSON.stringify(serverList) !== JSON.stringify(currentStored);
          this.cache = serverList;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverList));
          if (isChanged) {
            realtimeSyncBus.publish('ADMIN_NOTIFICATIONS_UPDATED', serverList);
          }
          return serverList;
        }
      }
    } catch {
      // offline fallback
    } finally {
      this.isSyncing = false;
    }
    return this.getStored();
  }

  private getStored(): AdminBroadcastNotification[] {
    if (this.cache) return this.cache;
    if (typeof window === 'undefined') return DEFAULT_BROADCAST_NOTIFICATIONS;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BROADCAST_NOTIFICATIONS));
        this.cache = DEFAULT_BROADCAST_NOTIFICATIONS;
        return DEFAULT_BROADCAST_NOTIFICATIONS;
      }
      const parsed = JSON.parse(data);
      this.cache = parsed;
      return parsed;
    } catch {
      return DEFAULT_BROADCAST_NOTIFICATIONS;
    }
  }

  private save(list: AdminBroadcastNotification[]): void {
    this.cache = list;
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      realtimeSyncBus.publish('ADMIN_NOTIFICATIONS_UPDATED', list);
    } catch (e) {
      console.error('Error saving notifications', e);
    }
  }

  public getAll(): AdminBroadcastNotification[] {
    return this.getStored();
  }

  public getById(id: string): AdminBroadcastNotification | undefined {
    return this.getStored().find((n) => n.id === id);
  }

  /**
   * Kiểm tra thông báo có phù hợp với người bán (phân biệt Shop mới tạo vs Shop cũ lâu năm):
   * 1. Đối với người bán lâu năm (tạo TRƯỚC khi thông báo được phát hành):
   *    -> Thấy bình thường toàn bộ lịch sử thông báo.
   * 2. Đối với người bán mới tạo (tạo SAU khi thông báo phát hành):
   *    -> KHÔNG thấy những thông báo sự kiện / bảo trì đã qua trong quá khứ.
   *    -> CHỈ thấy thông báo của HIỆN TẠI (chính sách đang áp dụng, thông báo mới)
   *       và SẮP DIỄN RA (lịch hẹn tương lai, kỳ đối soát định kỳ sắp tới).
   */
  public isNotificationRelevantForSeller(
    notif: AdminBroadcastNotification,
    sellerCreatedAt?: string | Date | null,
    now: number = Date.now()
  ): boolean {
    if (!sellerCreatedAt) {
      return true;
    }

    const sellerCreatedTime = new Date(sellerCreatedAt).getTime();
    if (isNaN(sellerCreatedTime)) {
      return true;
    }

    const notifCreatedTime = new Date(notif.createdAt).getTime();

    // 1. Nếu Shop được tạo TRƯỚC thời điểm phát hành thông báo này:
    // Là shop cũ đối với thông báo -> Thấy bình thường toàn bộ lịch sử
    if (sellerCreatedTime <= notifCreatedTime) {
      return true;
    }

    // 2. Nếu Shop MỚI TẠO (tạo sau thời điểm phát hành thông báo):
    // Chỉ thấy những thông báo của "HIỆN TẠI" và "SẮP DIỄN RA", thông báo "ĐÃ QUA" thì ẨN

    // a. SẮP DIỄN RA (Upcoming):
    // - Lịch trình tương lai
    if (notif.scheduleType === 'SCHEDULED' && notif.scheduledAt) {
      const scheduledTime = new Date(notif.scheduledAt).getTime();
      if (scheduledTime >= now - 3600000 * 2) {
        return true;
      }
    }

    // - Thông báo định kỳ lặp lại trong tương lai (ví dụ kỳ 15 đối soát Escrow)
    if (notif.scheduleType === 'RECURRING') {
      return true;
    }

    // b. CỦA HIỆN TẠI (Current / Ongoing):
    // - Chính sách nền tảng hiện hành đang có hiệu lực (POLICY)
    if (notif.category === 'POLICY' && notif.status === 'ACTIVE') {
      return true;
    }

    // - Cảnh báo bảo mật hệ thống đang diễn ra (SECURITY)
    if (notif.category === 'SECURITY' && notif.status === 'ACTIVE') {
      return true;
    }

    // - Thông báo mới được phát hành trong vòng 24 giờ qua
    if (now - notifCreatedTime <= 24 * 3600000 && notif.status === 'ACTIVE') {
      return true;
    }

    // Các thông báo bảo trì quá khứ (MAINTENANCE đã qua) hoặc thông báo tức thời (INSTANT cũ trước khi tạo shop) -> ẨN
    return false;
  }

  /**
   * Filter notifications relevant to a specific seller/business
   */
  public getForSeller(
    businessId?: string,
    isDigitalSeller: boolean = true,
    sellerCreatedAt?: string | Date | null
  ): AdminBroadcastNotification[] {
    const all = this.getStored().filter((n) => n.status === 'ACTIVE');
    const now = Date.now();

    // Tự động phân giải thời gian tạo Shop nếu chưa được truyền
    let effectiveSellerCreatedAt = sellerCreatedAt;
    if (!effectiveSellerCreatedAt && businessId && typeof window !== 'undefined') {
      try {
        const storedDate = localStorage.getItem(`huki_seller_registered_at_${businessId}`);
        if (storedDate) {
          effectiveSellerCreatedAt = storedDate;
        } else {
          const profileStr = localStorage.getItem(`huki_enterprise_profile_${businessId}`);
          if (profileStr) {
            const profile = JSON.parse(profileStr);
            if (profile.submitted_at || profile.createdAt) {
              effectiveSellerCreatedAt = profile.submitted_at || profile.createdAt;
            }
          }
        }
      } catch {}
    }

    return all.filter((n) => {
      // 0. Kiểm tra Vai Trò (Target Role)
      const role = n.targetRole || 'SELLER';
      if (role !== 'ALL' && role !== 'SELLER') {
        return false;
      }

      // 1. Kiểm tra đối tượng nhận thông báo (Audience Targeting)
      let isTargetMatch = false;
      if (n.targetType === 'ALL') isTargetMatch = true;
      else if (n.targetType === 'DIRECT') {
        if (!businessId) isTargetMatch = true;
        else isTargetMatch = Boolean(n.targetBusinessIds?.includes(businessId));
      } else if (n.targetType === 'SEGMENT') {
        if (n.targetSegment === 'DIGITAL_SELLERS' && isDigitalSeller) isTargetMatch = true;
        else if (n.targetSegment === 'PHYSICAL_SELLERS' && !isDigitalSeller) isTargetMatch = true;
        else if (n.targetSegment === 'NEW_SELLERS' || n.targetSegment === 'ALL') isTargetMatch = true;
        else isTargetMatch = true;
      }

      if (!isTargetMatch) return false;

      // 2. Kiểm tra vòng đời thông báo: Shop mới tạo chỉ thấy Hiện tại & Sắp diễn ra, ẩn thông báo đã qua
      return this.isNotificationRelevantForSeller(n, effectiveSellerCreatedAt, now);
    });
  }

  /**
   * Filter notifications relevant to customers
   */
  public getForCustomer(userId?: string): AdminBroadcastNotification[] {
    const all = this.getStored().filter((n) => n.status === 'ACTIVE');
    return all.filter((n) => {
      const role = n.targetRole || 'ALL';
      return role === 'ALL' || role === 'CUSTOMER';
    });
  }

  /**
   * Filter notifications relevant to shippers
   */
  public getForShipper(shipperId?: string, region?: string): AdminBroadcastNotification[] {
    const all = this.getStored().filter((n) => n.status === 'ACTIVE');
    return all.filter((n) => {
      const role = n.targetRole || 'ALL';
      if (role !== 'ALL' && role !== 'SHIPPER') return false;
      if (role === 'SHIPPER' && n.targetSegment && n.targetSegment.startsWith('REGION_')) {
        if (region && n.targetSegment === `REGION_${region.toUpperCase()}`) return true;
        return false;
      }
      return true;
    });
  }

  /**
   * Get active pinned notifications that should render in the Top Notice Bar
   */
  public getTopNoticeForSeller(
    businessId?: string,
    isDigitalSeller: boolean = true,
    sellerCreatedAt?: string | Date | null
  ): AdminBroadcastNotification[] {
    const sellerNotifs = this.getForSeller(businessId, isDigitalSeller, sellerCreatedAt);
    return sellerNotifs.filter(
      (n) => n.channels.includes('TOP_BAR') && (!businessId || !n.dismissedByBusinessIds?.includes(businessId))
    );
  }

  /**
   * Mark a notification as read by a business
   */
  public markAsRead(notificationId: string, businessId?: string): void {
    const list = this.getStored();
    const effectiveBiz = businessId || 'default_seller';
    const updated = list.map((n) => {
      if (n.id === notificationId) {
        const readSet = new Set(n.readByBusinessIds || []);
        readSet.add(effectiveBiz);
        return { ...n, readByBusinessIds: Array.from(readSet) };
      }
      return n;
    });
    this.save(updated);

    if (typeof window !== 'undefined') {
      fetch('/api/admin/broadcast-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READ', id: notificationId, businessId: effectiveBiz }),
      }).catch(() => {});
    }
  }

  /**
   * Mark all notifications as read for a business
   */
  public markAllAsRead(businessId?: string): void {
    const list = this.getStored();
    const effectiveBiz = businessId || 'default_seller';
    const updated = list.map((n) => {
      const readSet = new Set(n.readByBusinessIds || []);
      readSet.add(effectiveBiz);
      return { ...n, readByBusinessIds: Array.from(readSet) };
    });
    this.save(updated);

    if (typeof window !== 'undefined') {
      fetch('/api/admin/broadcast-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_ALL_READ', businessId: effectiveBiz }),
      }).catch(() => {});
    }
  }

  /**
   * Dismiss top notice for a business session
   */
  public dismissTopNotice(notificationId: string, businessId?: string): void {
    const list = this.getStored();
    const effectiveBiz = businessId || 'default_seller';
    const updated = list.map((n) => {
      if (n.id === notificationId) {
        const dismissedSet = new Set(n.dismissedByBusinessIds || []);
        dismissedSet.add(effectiveBiz);
        return { ...n, dismissedByBusinessIds: Array.from(dismissedSet) };
      }
      return n;
    });
    this.save(updated);

    if (typeof window !== 'undefined') {
      fetch('/api/admin/broadcast-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DISMISS', id: notificationId, businessId: effectiveBiz }),
      }).catch(() => {});
    }
  }

  /**
   * Admin: Create and dispatch new notification
   */
  public createNotification(
    data: Omit<AdminBroadcastNotification, 'id' | 'createdAt' | 'updatedAt' | 'readByBusinessIds' | 'dismissedByBusinessIds'> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
      readByBusinessIds?: string[];
      dismissedByBusinessIds?: string[];
    }
  ): AdminBroadcastNotification {
    const list = this.getStored();
    const id = data.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newNotif: AdminBroadcastNotification = {
      ...data,
      id,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      readByBusinessIds: data.readByBusinessIds || [],
      dismissedByBusinessIds: data.dismissedByBusinessIds || [],
    };
    const filtered = list.filter((n) => n.id !== id);
    const updated = [newNotif, ...filtered];
    this.save(updated);

    if (typeof window !== 'undefined') {
      fetch('/api/admin/broadcast-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newNotif),
      }).catch(() => {});
    }

    return newNotif;
  }

  /**
   * Admin: Toggle Pin / Unpin on Top Bar
   */
  public togglePin(id: string): void {
    const list = this.getStored();
    const updated = list.map((n) => {
      if (n.id === id) {
        const nextPinned = !n.isPinnedTop;
        const nextChannels = nextPinned
          ? Array.from(new Set([...n.channels, 'TOP_BAR' as NotificationPlacement]))
          : n.channels.filter((c) => c !== 'TOP_BAR');
        return {
          ...n,
          isPinnedTop: nextPinned,
          channels: nextChannels,
          updatedAt: new Date().toISOString(),
        };
      }
      return n;
    });
    this.save(updated);

    if (typeof window !== 'undefined') {
      fetch('/api/admin/broadcast-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'TOGGLE_PIN', id }),
      }).catch(() => {});
    }
  }

  /**
   * Admin: Delete or revoke notification
   */
  public deleteNotification(id: string): void {
    const list = this.getStored().filter((n) => n.id !== id);
    this.save(list);

    if (typeof window !== 'undefined') {
      fetch(`/api/admin/broadcast-notifications?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  }
}

export const adminNotificationService = new AdminNotificationService();
