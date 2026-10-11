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
export type TargetAudienceType = 'ALL' | 'SEGMENT' | 'DIRECT';
export type TargetSegment = 'ALL' | 'DIGITAL_SELLERS' | 'PHYSICAL_SELLERS' | 'NEW_SELLERS' | 'AT_RISK_SELLERS';
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
   * Filter notifications relevant to a specific seller/business
   */
  public getForSeller(businessId?: string, isDigitalSeller: boolean = true): AdminBroadcastNotification[] {
    const all = this.getStored().filter((n) => n.status === 'ACTIVE');
    return all.filter((n) => {
      if (n.targetType === 'ALL') return true;
      if (n.targetType === 'DIRECT') {
        if (!businessId) return true;
        return n.targetBusinessIds?.includes(businessId);
      }
      if (n.targetType === 'SEGMENT') {
        if (n.targetSegment === 'DIGITAL_SELLERS' && isDigitalSeller) return true;
        if (n.targetSegment === 'PHYSICAL_SELLERS' && !isDigitalSeller) return true;
        if (n.targetSegment === 'ALL') return true;
      }
      return false;
    });
  }

  /**
   * Get active pinned notifications that should render in the Top Notice Bar
   */
  public getTopNoticeForSeller(businessId?: string, isDigitalSeller: boolean = true): AdminBroadcastNotification[] {
    const sellerNotifs = this.getForSeller(businessId, isDigitalSeller);
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
