'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRealtimeNotifications, RealtimeNotification } from '../../hooks/useRealtimeNotifications';

export interface UniversalNotificationBellProps {
  variant?: 'user' | 'seller' | 'shipper' | 'admin';
  fullPageRoute?: string;
  className?: string;
}

export default function UniversalNotificationBell({
  variant = 'user',
  fullPageRoute,
  className = '',
}: UniversalNotificationBellProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MANUAL' | 'AUTO'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useRealtimeNotifications();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const defaultFullPage =
    fullPageRoute ||
    (variant === 'seller'
      ? '/seller/notifications'
      : variant === 'shipper'
      ? '/shipper/notifications'
      : variant === 'admin'
      ? '/admin/notifications'
      : '/account/notifications');

  // Filter notifications by active tab
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'MANUAL') {
      return n.category === 'MANUAL_DIRECT' || n.category === 'MANUAL_BROADCAST';
    }
    if (activeTab === 'AUTO') {
      return n.category === 'AUTO_LIFECYCLE' || n.category === 'AUTO_WATCHDOG';
    }
    return true;
  });

  const handleNotificationClick = async (n: RealtimeNotification) => {
    if (!n.isRead) {
      await markAsRead(n.id);
    }
    setIsOpen(false);
    if (n.actionUrl) {
      router.push(n.actionUrl);
    }
  };

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  const getSenderBadge = (senderType: string, senderName?: string) => {
    switch (senderType) {
      case 'ADMIN':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
            🛡️ Quản trị viên
          </span>
        );
      case 'SELLER':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            🏪 {senderName || 'Người bán'}
          </span>
        );
      case 'SHIPPER':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            🛵 {senderName || 'Bưu tá Express'}
          </span>
        );
      case 'USER':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            👤 {senderName || 'Khách hàng'}
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            ⚙️ Hệ thống
          </span>
        );
    }
  };

  // Button style per variant
  const getButtonStyles = () => {
    if (variant === 'shipper') {
      return 'w-9 h-9 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-gray-100 text-gray-700 hover:text-[#003B2B]';
    }
    if (variant === 'admin') {
      return 'w-8 h-8 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-gray-100 text-gray-700 hover:text-[#003B2B]';
    }
    if (variant === 'seller') {
      return 'w-8 sm:w-9 h-8 sm:h-9 rounded-xl border border-theme-border text-on-surface hover:text-[#003B2B] hover:bg-theme-secondary-subtle';
    }
    // user (buyer)
    return 'w-9 h-9 rounded-xl border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] text-[var(--theme-text,#17201f)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)]';
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) refresh();
        }}
        className={`relative flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${getButtonStyles()}`}
        title="Thông báo toàn hệ thống"
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <span
          className={`material-symbols-outlined text-[20px] transition-transform ${
            unreadCount > 0 ? 'text-[#00875A] animate-wiggle' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          notifications
        </span>

        {/* Unread Counter Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-[#dc2626] text-white text-[10px] font-bold min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-zinc-900 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 z-50 overflow-hidden flex flex-col text-slate-900 dark:text-slate-100 animate-fade-in-up">
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50/80 dark:bg-zinc-800/60 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Thông Báo</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 text-[10px] font-extrabold">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Đánh dấu tất cả đã đọc"
              >
                <span className="material-symbols-outlined text-sm">done_all</span>
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 px-3 bg-slate-50/40 dark:bg-zinc-850 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'ALL'
                  ? 'border-[#003B2B] text-[#003B2B] dark:border-emerald-400 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('MANUAL')}
              className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'MANUAL'
                  ? 'border-[#003B2B] text-[#003B2B] dark:border-emerald-400 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Chủ động (1-1)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('AUTO')}
              className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'AUTO'
                  ? 'border-[#003B2B] text-[#003B2B] dark:border-emerald-400 dark:text-emerald-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Tự động & Cảnh báo
            </button>
          </div>

          {/* List of Notifications */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/60">
            {isLoading && filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <span>Đang tải thông báo...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-zinc-600">
                  notifications_off
                </span>
                <span className="font-medium">Chưa có thông báo nào trong mục này</span>
              </div>
            ) : (
              filteredNotifications.map((n) => {
                const isCritical = n.priority === 'CRITICAL';
                const isHigh = n.priority === 'HIGH';

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 transition-colors cursor-pointer flex gap-3 relative ${
                      !n.isRead
                        ? isCritical
                          ? 'bg-rose-50/70 dark:bg-rose-950/30'
                          : isHigh
                          ? 'bg-amber-50/60 dark:bg-amber-950/20'
                          : 'bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-800/40'
                    }`}
                  >
                    {/* Unread dot indicator */}
                    {!n.isRead && (
                      <span className="absolute top-4 right-3 w-2 h-2 rounded-full bg-emerald-500 shadow-xs" />
                    )}

                    {/* Leading Priority/Category Icon */}
                    <div className="shrink-0 mt-0.5">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                          isCritical
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                            : isHigh
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-200'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isCritical
                            ? 'warning'
                            : isHigh
                            ? 'report_problem'
                            : n.category === 'MANUAL_DIRECT'
                            ? 'chat'
                            : n.category === 'MANUAL_BROADCAST'
                            ? 'campaign'
                            : 'notifications'}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {getSenderBadge(n.senderType, n.senderName)}
                        {isCritical && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                            Khẩn cấp
                          </span>
                        )}
                        {isHigh && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500 text-white">
                            Ưu tiên
                          </span>
                        )}
                      </div>

                      <h4
                        className={`text-xs font-bold leading-snug line-clamp-2 ${
                          !n.isRead ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {n.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                        <span>{formatRelativeTime(n.createdAt)}</span>
                        {n.actionUrl && (
                          <span className="text-[#00875A] font-semibold hover:underline flex items-center gap-0.5">
                            Chi tiết <span className="material-symbols-outlined text-[11px]">arrow_forward</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 dark:bg-zinc-800/60 border-t border-slate-200 dark:border-zinc-800 text-center">
            <Link
              href={defaultFullPage}
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[#003B2B] dark:text-emerald-400 hover:underline flex items-center justify-center gap-1 py-1"
            >
              <span>Xem toàn bộ lịch sử thông báo</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
