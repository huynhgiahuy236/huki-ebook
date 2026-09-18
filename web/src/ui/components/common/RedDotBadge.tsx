/**
 * RedDotBadge - Notification badge component
 * Shows red dot with count for unread notifications
 */

import React from 'react';
import { useNotificationBadge } from '../../../hooks/useNotificationBadge';

interface RedDotBadgeProps {
  count: number;
  maxDisplay?: number;
  className?: string;
  showZero?: boolean;
}

export function RedDotBadge({
  count,
  maxDisplay = 99,
  className = '',
  showZero = false
}: RedDotBadgeProps) {
  // Don't render if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null;
  }

  const displayCount = count > maxDisplay ? `${maxDisplay}+` : count;
  const isLarge = count > 0;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        font-bold text-white
        transition-all duration-200
        ${isLarge
          ? 'bg-red-500 min-w-[18px] h-[18px] px-1 text-[10px]'
          : 'bg-red-400 min-w-[8px] h-[8px]'
        }
        rounded-full shadow-sm
        animate-pulse-subtle
        ${className}
      `}
      title={`${count} thông báo chưa đọc`}
    >
      {isLarge && displayCount}
    </span>
  );
}

interface NotificationBellProps {
  className?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function NotificationBell({
  className = '',
  onClick,
  size = 'md'
}: NotificationBellProps) {
  const { unreadCount, isLoading } = useNotificationBadge();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative
        ${sizeClasses[size]}
        rounded-full
        bg-slate-100 hover:bg-slate-200
        dark:bg-slate-800 dark:hover:bg-slate-700
        flex items-center justify-center
        transition-colors duration-200
        cursor-pointer
        ${className}
      `}
      title="Thông báo"
    >
      <span className={`material-symbols-outlined ${iconSizes[size]} text-slate-600 dark:text-slate-300`}>
        notifications
      </span>

      {!isLoading && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1">
          <RedDotBadge count={unreadCount} />
        </span>
      )}
    </button>
  );
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: Array<{
    id: string;
    title: string;
    message?: string;
    type: string;
    isRead: boolean;
    createdAt: string;
    data?: Record<string, any>;
  }>;
  onMarkAsRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onNotificationClick?: (notification: any) => void;
  isLoading?: boolean;
}

export function NotificationPanel({
  isOpen,
  onClose,
  notifications = [],
  onMarkAsRead,
  onMarkAllRead,
  onNotificationClick,
  isLoading = false,
}: NotificationPanelProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="
        fixed top-0 right-0 bottom-0 w-full max-w-md
        bg-white dark:bg-slate-900
        shadow-2xl z-50
        flex flex-col
        animate-slide-in-right
      ">
        {/* Header */}
        <div className="
          flex items-center justify-between
          px-4 py-3
          border-b border-slate-200 dark:border-slate-700
        ">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl text-slate-600 dark:text-slate-300">
              notifications
            </span>
            <h2 className="font-bold text-slate-900 dark:text-white">
              Thông báo
            </h2>
            {unreadCount > 0 && (
              <span className="
                px-2 py-0.5 rounded-full
                bg-red-500 text-white text-xs font-bold
              ">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Đánh dấu đã đọc
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <span className="material-symbols-outlined text-xl text-slate-500">
                close
              </span>
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-5xl mb-3">notifications_none</span>
              <p className="text-sm font-medium">Không có thông báo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => onNotificationClick?.(notification)}
                  className={`
                    px-4 py-3
                    cursor-pointer
                    transition-colors
                    hover:bg-slate-50 dark:hover:bg-slate-800
                    ${!notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`
                      w-10 h-10 rounded-full
                      flex items-center justify-center
                      shrink-0
                      ${getNotificationIconBg(notification.type)}
                    `}>
                      <span className={`material-symbols-outlined ${getNotificationIconClass(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`
                          text-sm font-semibold truncate
                          ${!notification.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}
                        `}>
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        )}
                      </div>
                      {notification.message && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatRelativeTime(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Helper functions
function getNotificationIcon(type: string): string {
  const icons: Record<string, string> = {
    KYC_APPROVED: 'verified',
    KYC_REJECTED: 'cancel',
    NEW_ORDER: 'shopping_cart',
    ORDER_SHIPPED: 'local_shipping',
    ORDER_DELIVERED: 'check_circle',
    PAYMENT_RECEIVED: 'payments',
    PAYMENT_FAILED: 'error',
    STOCK_LOW: 'inventory_2',
    REVIEW_RECEIVED: 'star',
    DISPUTE_OPENED: 'gavel',
    SYSTEM: 'settings',
  };
  return icons[type] || 'notifications';
}

function getNotificationIconBg(type: string): string {
  const colors: Record<string, string> = {
    KYC_APPROVED: 'bg-green-100 text-green-600',
    KYC_REJECTED: 'bg-red-100 text-red-600',
    NEW_ORDER: 'bg-blue-100 text-blue-600',
    ORDER_SHIPPED: 'bg-purple-100 text-purple-600',
    ORDER_DELIVERED: 'bg-green-100 text-green-600',
    PAYMENT_RECEIVED: 'bg-yellow-100 text-yellow-600',
    PAYMENT_FAILED: 'bg-red-100 text-red-600',
    STOCK_LOW: 'bg-orange-100 text-orange-600',
    REVIEW_RECEIVED: 'bg-yellow-100 text-yellow-600',
    DISPUTE_OPENED: 'bg-red-100 text-red-600',
    SYSTEM: 'bg-slate-100 text-slate-600',
  };
  return colors[type] || 'bg-slate-100 text-slate-600';
}

function getNotificationIconClass(type: string): string {
  return 'text-lg';
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}
