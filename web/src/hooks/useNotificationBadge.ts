/**
 * useNotificationBadge - Hook for notification badge count
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../ui/api/apiClient';

interface UseNotificationBadgeOptions {
  /** Auto-refresh interval in milliseconds (default: 30 seconds) */
  refreshInterval?: number;
  /** Enable auto-refresh (default: true) */
  autoRefresh?: boolean;
}

interface Notification {
  id: string;
  title: string;
  message?: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

export function useNotificationBadge(options: UseNotificationBadgeOptions = {}) {
  const { refreshInterval = 30000, autoRefresh = true } = options;

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await apiClient<{ count: number }>('/notifications/unread-count');
      if (res.success || res.data) {
        setUnreadCount(res.data?.count ?? 0);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiClient<any>('/notifications?limit=20');
      if (res.success || res.data) {
        const items = res.data?.items ?? res.data ?? [];
        setNotifications(items);
        setUnreadCount(items.filter((n: Notification) => !n.isRead).length);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch notifications'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (id: string) => {
    try {
      await apiClient(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await apiClient('/notifications/read-all', { method: 'POST' });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchUnreadCount();
    fetchNotifications();
  }, [fetchUnreadCount, fetchNotifications]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchUnreadCount();
      }, refreshInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, fetchUnreadCount]);

  return {
    unreadCount,
    notifications,
    isLoading,
    error,
    refresh: fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}

/**
 * useKYCQueueBadge - Hook for KYC pending count
 */
export function useKYCQueueBadge() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      const res = await apiClient<{ count: number }>('/admin/kyc/count?status=PENDING');
      if (res.success || res.data) {
        setPendingCount(res.data?.count ?? 0);
      }
    } catch (err) {
      console.error('Failed to fetch KYC count:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    // Refresh every minute
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { pendingCount, isLoading, refresh: fetchCount };
}

/**
 * useOrderAlertBadge - Hook for order-related alerts
 */
export function useOrderAlertBadge() {
  const [alertCount, setAlertCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      const res = await apiClient<{ count: number }>('/admin/orders/alerts/count');
      if (res.success || res.data) {
        setAlertCount(res.data?.count ?? 0);
      }
    } catch (err) {
      console.error('Failed to fetch order alert count:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [fetchCount]);

  return { alertCount, isLoading, refresh: fetchCount };
}

