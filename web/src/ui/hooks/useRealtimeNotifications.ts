'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '../api/apiClient';
import { tokenStorage } from '../api/tokenStorage';
import { soundEffects } from '../utils/soundEffects';
import { useToast } from '../context/ToastContext';
import { realtimeSyncBus } from '../services/realtimeSyncBus';

export interface RealtimeNotification {
  id: string;
  recipientId: string;
  recipientType: 'USER' | 'BUSINESS' | 'DELIVERY' | 'ADMIN' | 'ALL';
  senderType: 'SYSTEM' | 'ADMIN' | 'SELLER' | 'SHIPPER' | 'USER';
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  category: 'AUTO_LIFECYCLE' | 'AUTO_WATCHDOG' | 'MANUAL_DIRECT' | 'MANUAL_BROADCAST';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
  type: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
  imageUrl?: string;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface UseRealtimeNotificationsOptions {
  autoFetch?: boolean;
  limit?: number;
  recipientType?: 'USER' | 'BUSINESS' | 'DELIVERY' | 'ADMIN';
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { autoFetch = true, limit = 20, recipientType } = options;
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const socketRef = useRef<Socket | null>(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setUnreadCount(0);
      return;
    }
    try {
      const queryParams = new URLSearchParams();
      if (recipientType) {
        queryParams.set('recipientType', recipientType);
      }
      const qs = queryParams.toString();
      const res = await apiClient<{ count: number }>(`/notifications/unread-count${qs ? `?${qs}` : ''}`);
      if (res && res.data) {
        setUnreadCount(res.data.count ?? 0);
      }
    } catch {
      // Ignore
    }
  }, [recipientType]);

  // Fetch notifications list
  const fetchNotifications = useCallback(
    async (page = 1, append = false, isReadFilter?: boolean) => {
      const token = tokenStorage.getAccessToken();
      if (!token) return;

      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      try {
        const queryParams = new URLSearchParams();
        queryParams.set('page', String(page));
        queryParams.set('limit', String(limit));
        if (recipientType) {
          queryParams.set('recipientType', recipientType);
        }
        if (isReadFilter !== undefined) {
          queryParams.set('isRead', String(isReadFilter));
        }

        const res = await apiClient<{
          data: RealtimeNotification[];
          pagination?: { page: number; limit: number; total: number; totalPages: number };
          summary?: { unreadCount: number };
        } | RealtimeNotification[]>(`/notifications?${queryParams.toString()}`);

        if (res && res.data) {
          let items: RealtimeNotification[] = [];
          let total = 0;

          if (Array.isArray(res.data)) {
            items = res.data;
            total = items.length;
          } else {
            const raw = res.data as any;
            items = raw.data || [];
            total = raw.pagination?.total ?? items.length;
          }

          if (append) {
            setNotifications((prev) => {
              const existingIds = new Set(prev.map((n) => n.id));
              const newItems = items.filter((n) => !existingIds.has(n.id));
              return [...prev, ...newItems];
            });
          } else {
            setNotifications(items);
          }

          setCurrentPage(page);
          setTotalCount(total);
          setHasMore(page * limit < total);

          const summaryUnread = (res as any).summary?.unreadCount ?? (res.data as any)?.summary?.unreadCount;
          if (summaryUnread !== undefined) {
            setUnreadCount(summaryUnread);
          }
        }
      } catch {
        // Ignore
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [limit, recipientType]
  );

  // Load more pages
  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    await fetchNotifications(currentPage + 1, true);
  }, [fetchNotifications, currentPage, hasMore, isLoadingMore]);

  // Mark single as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      realtimeSyncBus.publish('NOTIFICATIONS_UPDATED');
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient('/notifications/read-all', {
        method: 'POST',
        body: JSON.stringify({ recipientType }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      realtimeSyncBus.publish('NOTIFICATIONS_UPDATED');
      await fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, [fetchUnreadCount, recipientType]);

  // Initial load
  useEffect(() => {
    if (autoFetch) {
      fetchUnreadCount();
      fetchNotifications(1, false);
    }
  }, [autoFetch, fetchUnreadCount, fetchNotifications]);

  // Realtime Socket.io listener
  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3005';
    const socket = io(`${socketUrl}/notifications`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('notification', (newNoti: RealtimeNotification) => {
      // Filter by recipientType if specified
      if (recipientType) {
        const matches =
          newNoti.recipientType === 'ALL' || newNoti.recipientType === recipientType;
        if (!matches) {
          return;
        }
      }

      // 1. Play priority sound
      soundEffects.playPriorityAlert(newNoti.priority || 'NORMAL');

      // 2. Prepend to list
      setNotifications((prev) => [newNoti, ...prev.filter((n) => n.id !== newNoti.id)]);

      // 3. Increment unread count
      setUnreadCount((prev) => prev + 1);
      setTotalCount((prev) => prev + 1);

      // 4. Show Toast popup with appropriate priority style
      const toastType =
        newNoti.priority === 'CRITICAL'
          ? 'error'
          : newNoti.priority === 'HIGH'
          ? 'warning'
          : 'info';

      showToast({
        title: `${newNoti.priority === 'CRITICAL' ? '🚨 ' : newNoti.priority === 'HIGH' ? '⚠️ ' : '🔔 '}${newNoti.title}`,
        message: newNoti.message,
        type: toastType,
        actionUrl: newNoti.actionUrl,
        actionLabel: newNoti.actionUrl ? 'Xem ngay' : undefined,
        duration: newNoti.priority === 'CRITICAL' ? 10000 : 6000,
        playSound: false, // already played priority sound above
      });

      // 5. Broadcast to internal app bus
      realtimeSyncBus.publish('NOTIFICATIONS_UPDATED', newNoti);
    });

    socket.on('notification_read', ({ notificationId }: { notificationId: string }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });

    socket.on('notification_read_all', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [showToast, recipientType]);

  // Sync across tabs via realtimeSyncBus
  useEffect(() => {
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'NOTIFICATIONS_UPDATED') {
        fetchUnreadCount();
      }
    });
    return () => unsub();
  }, [fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    isConnected,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh: () => fetchNotifications(1, false),
    fetchUnreadCount,
  };
}
