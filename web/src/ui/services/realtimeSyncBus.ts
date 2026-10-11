/**
 * HUKI Realtime Synchronization Bus
 * Provides instant zero-latency cross-tab and cross-window messaging using BroadcastChannel
 * with fallback to StorageEvents and CustomEvents.
 */

export type SyncEventType =
  | 'FEATURE_FLAGS_UPDATED'
  | 'ADMIN_NOTIFICATIONS_UPDATED'
  | 'NOTIFICATION_READ'
  | 'NOTIFICATION_DISMISSED'
  | 'SELLER_FEATURE_TOGGLED'
  | 'ORDER_CREATED'
  | 'ORDER_PAYMENT_SUCCEEDED'
  | 'ORDER_STATUS_CHANGED'
  | 'ORDER_CANCELLED';

export interface SyncMessage<T = unknown> {
  type: SyncEventType;
  payload?: T;
  timestamp: number;
  senderId?: string;
}

type SyncListener = (message: SyncMessage) => void;

class RealtimeSyncBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SyncListener> = new Set();
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
          });
        }
        if (e.key === 'huki_admin_broadcast_notifications') {
          this.notifyListeners({
            type: 'ADMIN_NOTIFICATIONS_UPDATED',
            timestamp: Date.now(),
          });
        }
        if (e.key === 'huki_latest_order_event' && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            if (data?.type) {
              this.notifyListeners({
                type: data.type,
                payload: data.payload,
                timestamp: data.t || Date.now(),
              });
            }
          } catch {}
        }
      });
    }
  }

  public publish<T = unknown>(type: SyncEventType, payload?: T): void {
    const message: SyncMessage<T> = {
      type,
      payload,
      timestamp: Date.now(),
      senderId: this.instanceId,
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

    if (typeof window !== 'undefined') {
      // Also trigger traditional window CustomEvents for legacy subscribers
      if (type === 'FEATURE_FLAGS_UPDATED') {
        window.dispatchEvent(new CustomEvent('huki_feature_flags_updated', { detail: payload }));
      }
      if (type === 'ADMIN_NOTIFICATIONS_UPDATED') {
        window.dispatchEvent(new CustomEvent('huki_admin_notifications_updated', { detail: payload }));
      }
      if (type.startsWith('ORDER_')) {
        try {
          localStorage.setItem(
            'huki_latest_order_event',
            JSON.stringify({ type, payload, t: Date.now() })
          );
        } catch {}
      }
    }
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
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
    }

    this.listeners.forEach((listener) => {
      try {
        listener(message);
      } catch (err) {
        console.error('Error in realtime sync listener', err);
      }
    });
  }
}

export const realtimeSyncBus = new RealtimeSyncBus();
