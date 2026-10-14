/**
 * HUKI Realtime Synchronization Bus
 * Provides instant zero-latency cross-tab and cross-window messaging using BroadcastChannel
 * with fallback to StorageEvents and CustomEvents.
 * 
 * PHÂN QUYỀN THÔNG BÁO TÁCH BIỆT GIỮA 5 NHÓM VAI TRÒ (NHỊP 6):
 * - ADMIN: Platform Super Admin (Ký quỹ sàn, Trọng tài, Báo cáo toàn hệ thống)
 * - ADMIN_CON: Sub-admin / Staff CSKH (Soát xét khiếu nại, hỗ trợ tranh chấp)
 * - SELLER: Chủ Shop / Người Bán (Đơn hàng mới, Hàng hoàn về kho, Giải ngân ví shop)
 * - SHIPPER: Bưu Tá HuKi Express (Cuốc giao mới, Đơn hoàn thu hồi, Nộp COD)
 * - BUYER: Người Mua Hàng (Trạng thái giao hàng, Sàn hoàn tiền, Chat shop)
 */

import {
  playBuyerNotificationSound,
  playSellerOrderChimeSound,
  playShipperDispatchSound,
  playAdminAlertSound,
  playSubAdminStaffSound,
} from '../utils/chatSound';

export type NotificationRole = 'ADMIN' | 'ADMIN_CON' | 'SELLER' | 'SHIPPER' | 'BUYER' | 'ALL';

export interface NotificationTarget {
  roles?: (NotificationRole | 'ALL')[];
  userId?: string;            // Targeted specifically to this user
  storeId?: string;           // Targeted specifically to this store
  shipperId?: string;         // Targeted specifically to this shipper
  orderId?: string;           // Filterable by orderId
}

export interface SubscriberFilter {
  role?: NotificationRole;
  userId?: string;
  storeId?: string;
  shipperId?: string;
}

export type SyncEventType =
  | 'FEATURE_FLAGS_UPDATED'
  | 'ADMIN_NOTIFICATIONS_UPDATED'
  | 'NOTIFICATION_READ'
  | 'NOTIFICATION_DISMISSED'
  | 'SELLER_FEATURE_TOGGLED'
  | 'ORDER_CREATED'
  | 'ORDER_PAYMENT_SUCCEEDED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED'
  | 'INVENTORY_UPDATED'
  | 'DRM_READER_JOINED'
  | 'DRM_READER_LEFT'
  | 'DRM_LICENSE_REVOKED'
  | 'DRM_LICENSE_RESTORED'
  | 'DRM_ACTIVE_READERS_CHANGED'
  | 'PAYOUT_REQUESTED'
  | 'PAYOUT_APPROVED'
  | 'PAYOUT_REJECTED'
  | 'PAYOUT_DISBURSED'
  | 'WALLET_BALANCE_UPDATED'
  | 'ESCROW_RELEASED'
  | 'ESCROW_UPDATED'
  | 'VOUCHER_USAGE_UPDATED'
  | 'ESCROW_FROZEN'
  | 'ESCROW_UNFROZEN'
  | 'ESCROW_REFUNDED'
  | 'ORDER_DELIVERED'
  | 'SHIPPER_AVAILABLE_ORDER_BROADCAST'
  | 'SHIPPER_ORDER_CLAIMED'
  | 'SHIPPER_PICKED_UP'
  | 'SHIPPER_DELIVERED'
  | 'SHIPPER_COD_REMITTED'
  | 'CHAT_MESSAGE_RECEIVED'
  | 'CHAT_UNREAD_COUNT_CHANGED'
  | 'RETURN_REQUESTED'
  | 'RETURN_FORWARDED'
  | 'RETURN_SELLER_ACCEPTED'
  | 'RETURN_SELLER_DISPUTED'
  | 'DISPUTE_ARBITRATED'
  | 'RETURN_REPLACEMENT_SHIPPED'
  | 'RETURN_PICKED_UP'
  | 'RETURN_DELIVERED_TO_STORE'
  | 'RETURN_COMPLETED'
  | 'BUSINESS_APPROVED'
  | 'BUSINESS_STATUS_UPDATED'
  | 'STAFF_PERMISSIONS_UPDATED'
  | 'STAFF_AUDIT_LOG_CREATED'
  | 'SELLER_PENALTY_UPDATED'
  | 'SYSTEM_MAINTENANCE_CHANGED';

export interface DisputeArbitratedPayload {
  returnRequestId?: string;
  disputeId?: string;
  orderId?: string;
  sellerOrderId?: string;
  ruling: 'BUYER_WINS' | 'SELLER_WINS' | 'PARTIAL_SETTLEMENT' | string;
  notes?: string;
  refundPercentage?: number;
  arbitratedBy?: string;
  arbitratedAt?: string;
}

export interface ReturnRequestPayload {
  returnRequestId: string;
  orderId?: string;
  sellerOrderId?: string;
  storeId?: string;
  userId?: string;
  type?: 'REFUND' | 'REPLACEMENT' | string;
  reason?: string;
  status?: string;
  returnTrackingCode?: string;
}

export interface InventoryUpdatePayload {
  bookId: string;
  storeId?: string;
  totalStock?: number;
  reservedStock?: number;
  availableStock?: number;
  action: 'RESERVED' | 'COMMITTED' | 'RELEASED' | 'MANUAL_ADJUST';
  quantityDelta?: number;
  updatedAt?: string;
  bookTitle?: string;
}

export interface SyncMessage<T = unknown> {
  type: SyncEventType;
  payload?: T;
  timestamp: number;
  senderId?: string;
  target?: NotificationTarget;
}

export type SyncListener = (message: SyncMessage) => void;

/**
 * Ma trận định tuyến vai trò mặc định (Default Role Mapping)
 */
export function getDefaultRolesForEventType(type: SyncEventType): NotificationRole[] {
  switch (type) {
    case 'ORDER_CREATED':
    case 'ORDER_PAYMENT_SUCCEEDED':
      return ['SELLER', 'ADMIN'];

    case 'ORDER_STATUS_CHANGED':
      return ['BUYER', 'SELLER', 'SHIPPER'];

    case 'ORDER_DELIVERED':
      return ['BUYER', 'SELLER'];

    case 'ORDER_CANCELLED':
      return ['BUYER', 'SELLER', 'ADMIN'];

    case 'ESCROW_FROZEN':
      return ['ADMIN', 'SELLER', 'BUYER'];

    case 'ESCROW_REFUNDED':
      return ['BUYER', 'ADMIN'];

    case 'ESCROW_RELEASED':
      return ['SELLER', 'ADMIN'];

    case 'ESCROW_UPDATED':
    case 'ESCROW_UNFROZEN':
      return ['ADMIN', 'SELLER'];

    case 'RETURN_REQUESTED':
      return ['SELLER', 'ADMIN', 'ADMIN_CON'];

    case 'RETURN_FORWARDED':
      return ['SELLER', 'ADMIN_CON'];

    case 'RETURN_SELLER_ACCEPTED':
      return ['BUYER', 'SHIPPER'];

    case 'RETURN_SELLER_DISPUTED':
      return ['ADMIN', 'ADMIN_CON'];

    case 'RETURN_REPLACEMENT_SHIPPED':
      return ['BUYER'];

    case 'RETURN_PICKED_UP':
      return ['BUYER', 'SELLER', 'SHIPPER'];

    case 'RETURN_DELIVERED_TO_STORE':
      return ['SELLER', 'ADMIN', 'SHIPPER'];

    case 'RETURN_COMPLETED':
      return ['BUYER', 'SELLER', 'ADMIN'];

    case 'DISPUTE_ARBITRATED':
      return ['BUYER', 'SELLER', 'ADMIN', 'ADMIN_CON'];

    case 'SHIPPER_AVAILABLE_ORDER_BROADCAST':
      return ['SHIPPER'];

    case 'SHIPPER_ORDER_CLAIMED':
      return ['SHIPPER', 'SELLER'];

    case 'SHIPPER_PICKED_UP':
    case 'SHIPPER_DELIVERED':
      return ['BUYER', 'SELLER', 'SHIPPER'];

    case 'SHIPPER_COD_REMITTED':
      return ['SHIPPER', 'ADMIN'];

    case 'PAYOUT_REQUESTED':
    case 'PAYOUT_APPROVED':
    case 'PAYOUT_REJECTED':
    case 'PAYOUT_DISBURSED':
      return ['SELLER', 'ADMIN'];

    case 'WALLET_BALANCE_UPDATED':
      return ['SELLER', 'SHIPPER', 'BUYER'];

    case 'ADMIN_NOTIFICATIONS_UPDATED':
      return ['ADMIN', 'ADMIN_CON'];

    case 'FEATURE_FLAGS_UPDATED':
    case 'SELLER_FEATURE_TOGGLED':
      return ['ALL'];

    case 'INVENTORY_UPDATED':
      return ['SELLER'];

    case 'DRM_READER_JOINED':
    case 'DRM_READER_LEFT':
    case 'DRM_LICENSE_REVOKED':
    case 'DRM_LICENSE_RESTORED':
    case 'DRM_ACTIVE_READERS_CHANGED':
      return ['BUYER', 'ADMIN'];

    case 'CHAT_MESSAGE_RECEIVED':
    case 'CHAT_UNREAD_COUNT_CHANGED':
      return ['BUYER', 'SELLER', 'SHIPPER'];

    default:
      return ['ALL'];
  }
}

/**
 * Phát âm thanh thông báo chuẩn xác theo từng vai trò (Nhịp 6)
 */
export function playRoleNotificationChime(role: NotificationRole) {
  switch (role) {
    case 'ADMIN':
      playAdminAlertSound();
      break;
    case 'ADMIN_CON':
      playSubAdminStaffSound();
      break;
    case 'SELLER':
      playSellerOrderChimeSound();
      break;
    case 'SHIPPER':
      playShipperDispatchSound();
      break;
    case 'BUYER':
    default:
      playBuyerNotificationSound();
      break;
  }
}

class RealtimeSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Map<SyncListener, SubscriberFilter | undefined> = new Map();
  private instanceId = `bus_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('huki_global_sync_channel');
        this.channel.onmessage = (event: MessageEvent<SyncMessage>) => {
          if (event.data && event.data.senderId !== this.instanceId) {
            this.notifyListeners(event.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel initialization failed, falling back to window events', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === 'huki_seller_feature_flags') {
          this.notifyListeners({
            type: 'FEATURE_FLAGS_UPDATED',
            timestamp: Date.now(),
            target: { roles: ['ALL'] },
          });
        }
        if (e.key === 'huki_admin_broadcast_notifications') {
          this.notifyListeners({
            type: 'ADMIN_NOTIFICATIONS_UPDATED',
            timestamp: Date.now(),
            target: { roles: ['ADMIN', 'ADMIN_CON'] },
          });
        }

        const jsonKeys = [
          'huki_latest_order_event',
          'huki_latest_inventory_event',
          'huki_drm_sync_event',
          'huki_latest_payout_event',
          'huki_latest_wallet_event',
        ];

        if (jsonKeys.includes(e.key || '') && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data?.type) {
              this.notifyListeners({
                type: data.type,
                payload: data.payload,
                target: data.target,
                timestamp: data.t || Date.now(),
              });
            }
          } catch {}
        }
      });
    }
  }

  /**
   * Kiểm tra thông điệp có phù hợp với bộ lọc vai trò của Subscriber hay không
   */
  public isMessageForSubscriber(message: SyncMessage, filter?: SubscriberFilter): boolean {
    if (!filter) return true; // Legacy subscribers without explicit filter receive everything

    const target = message.target;
    const allowedRoles = target?.roles && target.roles.length > 0
      ? target.roles
      : getDefaultRolesForEventType(message.type);

    // 1. Phân quyền vai trò (Role Check)
    if (filter.role && !allowedRoles.includes('ALL') && !allowedRoles.includes(filter.role)) {
      return false; // Sai vai trò -> Bỏ qua, không nhận chéo và không rung chuông
    }

    // 2. Định danh người dùng (UserId Check)
    if (target?.userId && filter.userId && target.userId !== filter.userId) {
      return false; // Sai người dùng
    }

    // 3. Định danh gian hàng (StoreId Check)
    if (target?.storeId && filter.storeId && target.storeId !== filter.storeId) {
      return false; // Khác gian hàng
    }

    // 4. Định danh bưu tá (ShipperId Check)
    if (target?.shipperId && filter.shipperId && target.shipperId !== filter.shipperId) {
      return false; // Khác bưu tá
    }

    return true;
  }

  /**
   * Phát sự kiện đồng bộ kèm thông tin vai trò đích (Target Auditing)
   */
  public publish<T = unknown>(
    type: SyncEventType,
    payload?: T,
    target?: NotificationTarget
  ): void {
    const payloadObj = (payload as any) || {};
    const resolvedRoles = target?.roles && target.roles.length > 0
      ? target.roles
      : getDefaultRolesForEventType(type);

    const resolvedTarget: NotificationTarget = {
      roles: resolvedRoles,
      userId: target?.userId || payloadObj.userId || payloadObj.buyerId,
      storeId: target?.storeId || payloadObj.storeId,
      shipperId: target?.shipperId || payloadObj.shipperId,
      orderId: target?.orderId || payloadObj.orderId,
    };

    const message: SyncMessage<T> = {
      type,
      payload,
      timestamp: Date.now(),
      senderId: this.instanceId,
      target: resolvedTarget,
    };

    // 1. Post to other tabs / windows
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('Failed to postMessage on BroadcastChannel', err);
      }
    }

    // 2. Dispatch in current window
    this.notifyListeners(message);

    // 3. Fallback to localStorage & DOM events
    if (typeof window !== 'undefined') {
      if (type === 'FEATURE_FLAGS_UPDATED') {
        window.dispatchEvent(new CustomEvent('huki_feature_flags_updated', { detail: payload }));
      }
      if (type === 'ADMIN_NOTIFICATIONS_UPDATED') {
        window.dispatchEvent(new CustomEvent('huki_admin_notifications_updated', { detail: payload }));
      }

      const storagePayload = JSON.stringify({ type, payload, target: resolvedTarget, t: Date.now() });

      if (type.startsWith('ORDER_') || type.startsWith('RETURN_') || type.startsWith('ESCROW_')) {
        try {
          localStorage.setItem('huki_latest_order_event', storagePayload);
        } catch {}
      }
      if (type === 'INVENTORY_UPDATED') {
        try {
          localStorage.setItem('huki_latest_inventory_event', storagePayload);
          window.dispatchEvent(new CustomEvent('huki_inventory_updated', { detail: payload }));
        } catch {}
      }
      if (type.startsWith('DRM_')) {
        try {
          localStorage.setItem('huki_drm_sync_event', storagePayload);
          window.dispatchEvent(new CustomEvent('huki_drm_event', { detail: { type, payload } }));
        } catch {}
      }
      if (type.startsWith('PAYOUT_')) {
        try {
          localStorage.setItem('huki_latest_payout_event', storagePayload);
          window.dispatchEvent(new CustomEvent('huki_payout_event', { detail: { type, payload } }));
        } catch {}
      }
      if (type === 'WALLET_BALANCE_UPDATED' || type === 'ESCROW_RELEASED') {
        try {
          localStorage.setItem('huki_latest_wallet_event', storagePayload);
          window.dispatchEvent(new CustomEvent('huki_wallet_event', { detail: { type, payload } }));
        } catch {}
      }
    }
  }

  /**
   * Đăng ký lắng nghe sự kiện có gắn bộ lọc vai trò (Scoped Subscription)
   */
  public subscribe(listener: SyncListener, filter?: SubscriberFilter): () => void {
    this.listeners.set(listener, filter);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(message: SyncMessage): void {
    if (typeof window !== 'undefined') {
      if (message.type === 'FEATURE_FLAGS_UPDATED') {
        window.dispatchEvent(new CustomEvent('huki_feature_flags_updated', { detail: message.payload }));
      }
      if (message.type === 'ADMIN_NOTIFICATIONS_UPDATED') {
        window.dispatchEvent(new CustomEvent('huki_admin_notifications_updated', { detail: message.payload }));
      }
      if (message.type === 'NOTIFICATION_READ') {
        window.dispatchEvent(new CustomEvent('huki_notification_read', { detail: message.payload }));
      }
      if (message.type === 'INVENTORY_UPDATED') {
        window.dispatchEvent(new CustomEvent('huki_inventory_updated', { detail: message.payload }));
      }
    }

    this.listeners.forEach((filter, listener) => {
      if (this.isMessageForSubscriber(message, filter)) {
        try {
          listener(message);
        } catch (err) {
          console.error('Error in realtime sync listener', err);
        }
      }
    });
  }
}

export const realtimeSyncBus = new RealtimeSyncBus();
