'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRealtimeNotifications, RealtimeNotification } from '../../hooks/useRealtimeNotifications';

export interface UniversalNotificationBellProps {
  variant?: 'user' | 'seller' | 'shipper' | 'admin';
  fullPageRoute?: string;
  className?: string;
}

type DrawerFilterTab = 'ALL' | 'ALERTS' | 'ORDERS' | 'MESSAGES';

export default function UniversalNotificationBell({
  variant = 'user',
  fullPageRoute,
  className = '',
}: UniversalNotificationBellProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DrawerFilterTab>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [viewingDetailNotif, setViewingDetailNotif] = useState<RealtimeNotification | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useRealtimeNotifications();

  // Route dẫn tới Trung tâm thông báo đầy đủ
  const defaultFullPage =
    fullPageRoute ||
    (variant === 'seller'
      ? '/seller/notifications'
      : variant === 'shipper'
      ? '/shipper/notifications'
      : variant === 'admin'
      ? '/admin/notifications'
      : '/account/notifications');

  // Lọc chỉ các thông báo CHƯA ĐỌC cho Drawer bên phải
  const unreadNotifications = useMemo(() => {
    return notifications.filter((n) => !n.isRead);
  }, [notifications]);

  // Lọc theo các Tab phân loại trong Drawer
  const filteredUnread = useMemo(() => {
    return unreadNotifications.filter((n) => {
      if (activeTab === 'ALERTS') {
        return (
          n.priority === 'CRITICAL' ||
          n.priority === 'HIGH' ||
          n.category === 'AUTO_WATCHDOG' ||
          n.type?.includes('ALERT') ||
          n.type?.includes('OVERDUE') ||
          n.type?.includes('LOW_STOCK')
        );
      }
      if (activeTab === 'ORDERS') {
        return (
          n.category === 'AUTO_LIFECYCLE' ||
          n.type?.includes('ORDER') ||
          n.title?.toLowerCase().includes('đơn') ||
          n.title?.toLowerCase().includes('order')
        );
      }
      if (activeTab === 'MESSAGES') {
        return (
          n.category === 'MANUAL_DIRECT' ||
          n.category === 'MANUAL_BROADCAST' ||
          n.senderType === 'USER' ||
          n.senderType === 'SELLER' ||
          n.senderType === 'SHIPPER' ||
          n.senderType === 'ADMIN'
        );
      }
      return true;
    });
  }, [unreadNotifications, activeTab]);

  // Đếm số lượng theo tab
  const tabCounts = useMemo(() => {
    const all = unreadNotifications.length;
    const alerts = unreadNotifications.filter(
      (n) =>
        n.priority === 'CRITICAL' ||
        n.priority === 'HIGH' ||
        n.category === 'AUTO_WATCHDOG' ||
        n.type?.includes('ALERT')
    ).length;
    const orders = unreadNotifications.filter(
      (n) =>
        n.category === 'AUTO_LIFECYCLE' ||
        n.type?.includes('ORDER') ||
        n.title?.toLowerCase().includes('đơn')
    ).length;
    const messages = unreadNotifications.filter(
      (n) => n.category === 'MANUAL_DIRECT' || n.category === 'MANUAL_BROADCAST'
    ).length;
    return { all, alerts, orders, messages };
  }, [unreadNotifications]);

  // Đóng Drawer khi nhấn ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (viewingDetailNotif) {
          setViewingDetailNotif(null);
        } else if (isDrawerOpen) {
          setIsDrawerOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, viewingDetailNotif]);

  // Khi đóng drawer thì reset selection
  useEffect(() => {
    if (!isDrawerOpen) {
      setSelectedIds([]);
      setIsMultiSelectMode(false);
    }
  }, [isDrawerOpen]);

  // Toggle chọn 1 thông báo
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle chọn tất cả thông báo đang lọc
  const handleToggleSelectAll = () => {
    const allFilteredIds = filteredUnread.map((n) => n.id);
    const areAllSelected = allFilteredIds.every((id) => selectedIds.includes(id));
    if (areAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Đánh dấu đã đọc các thông báo đã chọn (sẽ tự động dời khỏi drawer chưa đọc)
  const handleBulkMarkAsRead = async () => {
    if (selectedIds.length === 0) return;
    const idsToMark = [...selectedIds];
    setSelectedIds([]);
    for (const id of idsToMark) {
      await markAsRead(id);
    }
  };

  // Bấm vào 1 thông báo để xem chi tiết
  const handleOpenDetail = async (n: RealtimeNotification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setViewingDetailNotif(n);
    if (!n.isRead) {
      await markAsRead(n.id);
    }
  };

  // Định dạng thời gian tương đối
  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  // Badge người gửi
  const getSenderBadge = (senderType: string, senderName?: string) => {
    switch (senderType) {
      case 'ADMIN':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 flex items-center gap-1">
            <span>🛡️</span>
            <span>Quản trị viên</span>
          </span>
        );
      case 'SELLER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1">
            <span>🏪</span>
            <span className="truncate max-w-[120px]">{senderName || 'Người bán'}</span>
          </span>
        );
      case 'SHIPPER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-1">
            <span>🛵</span>
            <span className="truncate max-w-[120px]">{senderName || 'Bưu tá Express'}</span>
          </span>
        );
      case 'USER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 flex items-center gap-1">
            <span>👤</span>
            <span className="truncate max-w-[120px]">{senderName || 'Khách hàng'}</span>
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center gap-1">
            <span>⚙️</span>
            <span>Hệ thống</span>
          </span>
        );
    }
  };

  // Button styles theo từng phân hệ
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
    return 'w-9 h-9 rounded-xl border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] text-[var(--theme-text,#17201f)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)]';
  };

  const areAllCurrentFilteredSelected =
    filteredUnread.length > 0 &&
    filteredUnread.every((n) => selectedIds.includes(n.id));

  return (
    <>
      {/* 1. NÚT CHUÔNG TRIGGER (HEADER) */}
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => {
            setIsDrawerOpen(true);
            refresh();
          }}
          className={`relative flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${getButtonStyles()}`}
          title="Thông báo chưa đọc (Mở ngăn kéo)"
          aria-label="Thông báo"
          aria-expanded={isDrawerOpen}
        >
          <span
            className={`material-symbols-outlined text-[20px] transition-transform ${
              unreadCount > 0 ? 'text-[#00875A] animate-wiggle' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            notifications
          </span>

          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#dc2626] text-white text-[10px] font-bold min-w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-zinc-900 animate-pulse">
              {unreadCount > 999 ? '999+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. SLIDE-OVER DRAWER (VÙNG BÊN PHẢI CHẠY RA) */}
      {isMounted && isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[80] overflow-hidden font-sans">
          {/* Backdrop mờ nền */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Container trượt từ mép phải */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[80]">
            <div className="w-screen max-w-[440px] sm:max-w-[480px] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
              
              {/* --- DRAWER HEADER --- */}
              <div className="p-4 sm:px-5 sm:py-4 bg-slate-50/90 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#003B2B] dark:text-emerald-400 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[20px]">mark_chat_unread</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Thông Báo Chưa Đọc</span>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold animate-pulse">
                          {unreadCount} mới
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Đọc xong sẽ tự động chuyển vào Trung tâm thông báo
                    </p>
                  </div>
                </div>

                {/* Actions on Header */}
                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          await markAllAsRead();
                          setSelectedIds([]);
                          setIsMultiSelectMode(false);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer flex items-center gap-1"
                        title="Đánh dấu tất cả thông báo là đã đọc"
                      >
                        <span className="material-symbols-outlined text-sm">done_all</span>
                        <span>Đọc tất cả</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
                          isMultiSelectMode
                            ? 'bg-emerald-800 text-white'
                            : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                        }`}
                        title="Bật/Tắt chế độ chọn nhiều"
                      >
                        <span className="material-symbols-outlined text-sm">checklist</span>
                        <span className="hidden sm:inline">Chọn</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Đóng ngăn kéo"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>

              {/* --- DRAWER FILTER TABS --- */}
              <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 px-3 bg-slate-50/50 dark:bg-zinc-850 text-xs font-semibold overflow-x-auto no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'ALL'
                      ? 'border-[#003B2B] text-[#003B2B] dark:border-emerald-400 dark:text-emerald-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Tất cả</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-zinc-700 text-[10px] font-bold">
                    {tabCounts.all}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ALERTS')}
                  className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'ALERTS'
                      ? 'border-rose-600 text-rose-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Cảnh báo &amp; Khẩn</span>
                  {tabCounts.alerts > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold">
                      {tabCounts.alerts}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ORDERS')}
                  className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'ORDERS'
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Đơn hàng</span>
                  {tabCounts.orders > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                      {tabCounts.orders}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('MESSAGES')}
                  className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === 'MESSAGES'
                      ? 'border-purple-600 text-purple-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Chủ động 1-1</span>
                  {tabCounts.messages > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-800 text-[10px] font-bold">
                      {tabCounts.messages}
                    </span>
                  )}
                </button>
              </div>

              {/* --- BULK ACTION TOOLBAR (KHI CHỌN HOẶC BẬT CHẾ ĐỘ CHỌN NHIỀU) --- */}
              {(isMultiSelectMode || selectedIds.length > 0) && (
                <div className="px-4 py-2.5 bg-slate-900 text-white dark:bg-zinc-800 border-b border-slate-700 flex items-center justify-between gap-3 text-xs shrink-0 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={areAllCurrentFilteredSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span>
                        Chọn tất cả ({filteredUnread.length})
                      </span>
                    </label>

                    {selectedIds.length > 0 && (
                      <span className="text-amber-400 font-bold ml-1">
                        • Đã chọn: {selectedIds.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleBulkMarkAsRead}
                      disabled={selectedIds.length === 0}
                      className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">done_all</span>
                      <span>Đánh dấu đã đọc ({selectedIds.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIds([]);
                        setIsMultiSelectMode(false);
                      }}
                      className="text-slate-400 hover:text-white px-1.5 py-1 text-xs cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                </div>
              )}

              {/* --- DANH SÁCH THÔNG BÁO CHƯA ĐỌC --- */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/70 p-1 sm:p-2">
                {isLoading && filteredUnread.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                    <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span>Đang làm mới thông báo...</span>
                  </div>
                ) : filteredUnread.length === 0 ? (
                  <div className="py-20 px-6 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[36px]">done_all</span>
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                        Bạn không còn thông báo chưa đọc nào!
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[280px]">
                        Mọi thông báo đã xử lý được lưu trữ đầy đủ trong Trung tâm thông báo.
                      </p>
                    </div>

                    <Link
                      href={defaultFullPage}
                      onClick={() => setIsDrawerOpen(false)}
                      className="mt-2 inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors"
                    >
                      <span>Vào Trung Tâm Thông Báo</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </Link>
                  </div>
                ) : (
                  filteredUnread.map((n) => {
                    const isCritical = n.priority === 'CRITICAL';
                    const isHigh = n.priority === 'HIGH';
                    const isSelected = selectedIds.includes(n.id);

                    return (
                      <div
                        key={n.id}
                        onClick={(e) => {
                          if (isMultiSelectMode) {
                            handleToggleSelect(n.id, e);
                          } else {
                            handleOpenDetail(n, e);
                          }
                        }}
                        className={`p-3.5 rounded-2xl mb-1 transition-all cursor-pointer flex items-start gap-3 relative border ${
                          isSelected
                            ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-500 shadow-xs'
                            : isCritical
                            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100/60'
                            : isHigh
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100/50'
                            : 'bg-white dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850'
                        }`}
                      >
                        {/* Checkbox chọn */}
                        {(isMultiSelectMode || isSelected) && (
                          <div className="pt-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(n.id)}
                              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                          </div>
                        )}

                        {/* Icon trạng thái / danh mục */}
                        <div className="shrink-0 mt-0.5">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                              isCritical
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                                : isHigh
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-slate-200'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[19px]">
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

                        {/* Nội dung thông báo */}
                        <div className="flex-1 min-w-0 pr-1">
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

                          <h4 className="text-xs font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">
                            {n.title}
                          </h4>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>

                          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-100 dark:border-zinc-800/60">
                            <span>{formatRelativeTime(n.createdAt)}</span>

                            <button
                              type="button"
                              onClick={(e) => handleOpenDetail(n, e)}
                              className="text-[#00875A] font-bold hover:underline flex items-center gap-0.5 cursor-pointer text-[11px]"
                            >
                              <span>Chi tiết</span>
                              <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* --- DRAWER FOOTER: LINK VÀO TRUNG TÂM THÔNG BÁO --- */}
              <div className="p-3.5 bg-slate-50/90 dark:bg-zinc-850 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs font-bold text-slate-600 hover:text-emerald-700 dark:text-slate-300 dark:hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">done_all</span>
                    <span>Đã đọc tất cả</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-400">Đã cập nhật mới nhất</span>
                )}

                <Link
                  href={defaultFullPage}
                  onClick={() => setIsDrawerOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003B2B] hover:bg-[#00271E] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                >
                  <span>Trung Tâm Thông Báo ({notifications.length})</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. MODAL XEM CHI TIẾT THÔNG BÁO (NOTIFICATION DETAIL MODAL) */}
      {isMounted && viewingDetailNotif && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in font-sans"
          onClick={() => setViewingDetailNotif(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 text-slate-900 dark:text-slate-100 relative z-[101]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-4 sm:px-5 bg-slate-50 dark:bg-zinc-850 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {getSenderBadge(viewingDetailNotif.senderType, viewingDetailNotif.senderName)}
                {viewingDetailNotif.priority === 'CRITICAL' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white animate-pulse">
                    Báo động đỏ
                  </span>
                )}
                {viewingDetailNotif.priority === 'HIGH' && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-white">
                    Ưu tiên cao
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewingDetailNotif(null)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="space-y-1.5">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  {new Date(viewingDetailNotif.createdAt).toLocaleString('vi-VN')} ({formatRelativeTime(viewingDetailNotif.createdAt)})
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                  {viewingDetailNotif.title}
                </h2>
              </div>

              {/* Message content */}
              <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-100 dark:border-zinc-800">
                {viewingDetailNotif.message}
              </div>

              {/* Related Order Context Card */}
              {(() => {
                const pCode = (viewingDetailNotif.payload as any)?.orderCode;
                const match = viewingDetailNotif.title?.match(/#(ORD-[A-Za-z0-9-]+)/i) || viewingDetailNotif.message?.match(/#(ORD-[A-Za-z0-9-]+)/i);
                const orderCode = pCode ? String(pCode).replace(/^#/, '') : match ? match[1] : null;

                if (!orderCode) return null;

                return (
                  <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">
                            Đơn hàng liên quan
                          </span>
                          <span className="font-mono font-black text-xs text-emerald-900 dark:text-emerald-200">
                            #{orderCode}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setViewingDetailNotif(null);
                          setIsDrawerOpen(false);
                          router.push(`/seller/orders?search=${encodeURIComponent(orderCode)}&code=${encodeURIComponent(orderCode)}&tab=ALL`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>Mở xem đơn này</span>
                        <span className="material-symbols-outlined text-xs">open_in_new</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Bấm nút để tự động tìm kiếm, lọc và mở chi tiết đơn hàng <strong>#{orderCode}</strong> trên trang Quản lý đơn hàng.
                    </p>
                  </div>
                );
              })()}

              {/* Image if available */}
              {viewingDetailNotif.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 max-h-60">
                  <img
                    src={viewingDetailNotif.imageUrl}
                    alt="Notification Attachment"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-850 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3">
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Đã ghi nhận đã đọc</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingDetailNotif(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Đóng
                </button>

                {(() => {
                  const pCode = (viewingDetailNotif.payload as any)?.orderCode;
                  const match = viewingDetailNotif.title?.match(/#(ORD-[A-Za-z0-9-]+)/i) || viewingDetailNotif.message?.match(/#(ORD-[A-Za-z0-9-]+)/i);
                  const orderCode = pCode ? String(pCode).replace(/^#/, '') : match ? match[1] : null;

                  if (orderCode) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setViewingDetailNotif(null);
                          setIsDrawerOpen(false);
                          router.push(`/seller/orders?search=${encodeURIComponent(orderCode)}&code=${encodeURIComponent(orderCode)}&tab=ALL`);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-[#003B2B] hover:bg-[#00271E] text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Xem đơn #{orderCode}</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    );
                  }

                  if (viewingDetailNotif.actionUrl) {
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          const url = viewingDetailNotif.actionUrl!;
                          setViewingDetailNotif(null);
                          setIsDrawerOpen(false);
                          router.push(url);
                        }}
                        className="px-4 py-1.5 rounded-xl bg-[#003B2B] hover:bg-[#00271E] text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>Chuyển tới xử lý</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    );
                  }

                  return null;
                })()}
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
