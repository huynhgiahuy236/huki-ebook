'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminNotificationService, AdminBroadcastNotification } from '@/ui/services/adminNotificationService';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { useAuth } from '@/ui/context/AuthContext';

export default function SellerNotificationBell() {
  const router = useRouter();
  const { user, activeBusinessId } = useAuth();
  const currentBizId = user?.business?.id || activeBusinessId || undefined;

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'admin'>('all');
  const [notifications, setNotifications] = useState<AdminBroadcastNotification[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    const list = adminNotificationService.getForSeller(currentBizId, true);
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    window.addEventListener('huki_admin_notifications_updated', loadNotifications);
    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'ADMIN_NOTIFICATIONS_UPDATED' || msg.type === 'FEATURE_FLAGS_UPDATED') {
        loadNotifications();
      }
    });

    return () => {
      window.removeEventListener('huki_admin_notifications_updated', loadNotifications);
      unsubscribe();
    };
  }, [currentBizId]);

  // Click outside listener
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

  const unreadCount = notifications.filter(
    (n) => !currentBizId || !n.readByBusinessIds?.includes(currentBizId)
  ).length;

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.preventDefault();
    adminNotificationService.markAllAsRead(currentBizId);
  };

  const handleNotificationClick = (n: AdminBroadcastNotification) => {
    adminNotificationService.markAsRead(n.id, currentBizId);
    setIsOpen(false);
    if (n.actionUrl) {
      router.push(n.actionUrl);
    } else {
      router.push(`/seller/notifications?id=${n.id}`);
    }
  };

  const filtered = notifications.filter((n) => {
    if (activeTab === 'admin') {
      return n.category === 'MAINTENANCE' || n.category === 'POLICY';
    }
    return true;
  });

  const formatRelativeTime = (isoString: string) => {
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex items-center justify-center w-8 sm:w-9 h-8 sm:h-9 rounded-xl border border-theme-border text-on-surface hover:text-[#003B2B] hover:bg-theme-secondary-subtle transition-all cursor-pointer shadow-2xs active:scale-95"
        title="Thông báo hệ thống và sàn"
        aria-label="Thông báo"
        aria-expanded={isOpen}
      >
        <span className={`material-symbols-outlined text-[19px] ${unreadCount > 0 ? 'text-[#00875A]' : 'text-slate-600'}`}>
          {unreadCount > 0 ? 'notifications_active' : 'notifications'}
        </span>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] bg-rose-600 text-white text-[9.5px] font-black rounded-full flex items-center justify-center px-1 shadow-xs border-2 border-white animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-50 overflow-hidden flex flex-col max-h-[500px] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-slate-900">Thông Báo</h3>
              {unreadCount > 0 && (
                <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-[#00875A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[13px]">done_all</span>
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="flex border-b border-slate-100 bg-white px-2 pt-1.5 gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-100 text-slate-900 font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tất Cả ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-emerald-50 text-[#00875A] font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Từ Ban Quản Trị Sàn
            </button>
          </div>

          {/* List items */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 overscroll-contain">
            {filtered.length === 0 ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <span className="material-symbols-outlined text-4xl block mx-auto text-slate-300">
                  notifications_none
                </span>
                <p className="text-xs">Không có thông báo nào</p>
              </div>
            ) : (
              filtered.slice(0, 6).map((n) => {
                const isRead = currentBizId && n.readByBusinessIds?.includes(currentBizId);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 text-left relative ${
                      !isRead ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        n.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-600'
                          : n.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-[#00875A]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[17px]">
                        {n.category === 'MAINTENANCE'
                          ? 'build'
                          : n.category === 'FINANCE'
                          ? 'account_balance_wallet'
                          : n.category === 'POLICY'
                          ? 'policy'
                          : 'campaign'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          {n.category}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatRelativeTime(n.createdAt)}
                        </span>
                      </div>
                      <h4 className={`text-xs leading-snug line-clamp-1 ${!isRead ? 'font-black text-slate-900' : 'font-semibold text-slate-700'}`}>
                        {n.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {n.summary}
                      </p>
                    </div>

                    {/* Unread Dot */}
                    {!isRead && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 self-center" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Link to full center */}
          <div className="p-2.5 border-t border-slate-100 bg-slate-50 text-center">
            <Link
              href="/seller/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs font-bold text-[#00875A] hover:underline inline-flex items-center gap-1.5"
            >
              <span>Vào Trung Tâm Thông Báo Đầy Đủ</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
