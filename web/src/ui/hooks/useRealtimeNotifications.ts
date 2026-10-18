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
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { autoFetch = true, limit = 20 } = options;
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
      const res = await apiClient<{ count: number }>('/notifications/unread-count');
      if (res && res.data) {
        setUnreadCount(res.data.count ?? 0);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Fetch notifications list
  const fetchNotifications = useCallback(async (category?: string) => {
    const token = tokenStorage.getAccessToken();
    if (!token) return;

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('limit', String(limit));
      if (category && category !== 'ALL') {
        queryParams.set('category', category);
      }
      const res = await apiClient<RealtimeNotification[]>(`/notifications?${queryParams.toString()}`);
      if (res && res.data) {
        const items = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
        setNotifications(items);
        if ((res as any).summary?.unreadCount !== undefined) {
          setUnreadCount((res as any).summary.unreadCount);
        }
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

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
      await apiClient('/notifications/read-all', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      realtimeSyncBus.publish('NOTIFICATIONS_UPDATED');
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (autoFetch) {
      fetchUnreadCount();
      fetchNotifications();
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
      // 1. Play priority sound
      soundEffects.playPriorityAlert(newNoti.priority || 'NORMAL');

      // 2. Prepend to list
      setNotifications((prev) => [newNoti, ...prev.filter((n) => n.id !== newNoti.id)]);

      // 3. Increment unread count
      setUnreadCount((prev) => prev + 1);

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
  }, [showToast]);

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
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
    fetchUnreadCount,
  };
}
