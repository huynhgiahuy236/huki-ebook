'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRealtimeNotifications, RealtimeNotification } from '../../hooks/useRealtimeNotifications';
import { orderApi, SellerOrder } from '../../api/orderApi';

export interface UniversalNotificationBellProps {
  variant?: 'user' | 'seller' | 'shipper' | 'admin';
  fullPageRoute?: string;
  className?: string;
}

type TabType = 'ALL' | 'UNREAD';

export default function UniversalNotificationBell({
  variant = 'user',
  fullPageRoute,
  className = '',
}: UniversalNotificationBellProps) {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('ALL');
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);
  const [isDualView, setIsDualView] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Map variant sang recipientType backend chuẩn
  const recipientType = useMemo(() => {
    switch (variant) {
      case 'seller':
        return 'BUSINESS' as const;
      case 'shipper':
        return 'DELIVERY' as const;
      case 'admin':
        return 'ADMIN' as const;
      case 'user':
      default:
        return 'USER' as const;
    }
  }, [variant]);

  const {
    notifications,
    unreadCount,
    totalCount,
    hasMore,
    isLoading,
    isLoadingMore,
    markAsRead,
    markAllAsRead,
    loadMore,
    refresh,
  } = useRealtimeNotifications({
    recipientType,
    limit: 20,
  });

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

  // Tiêu đề tương ứng theo vai trò
  const portalTitle = useMemo(() => {
    switch (variant) {
      case 'seller':
        return 'Thông Báo Kênh Bán';
      case 'shipper':
        return 'Thông Báo Bưu Tá';
      case 'admin':
        return 'Thông Báo Hệ Thống';
      case 'user':
      default:
        return 'Thông Báo Của Bạn';
    }
  }, [variant]);

  // Lọc thông báo hiển thị theo 2 tab duy nhất: Tất cả / Chưa đọc
  const displayedNotifications = useMemo(() => {
    if (activeTab === 'UNREAD') {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, activeTab]);

  const unreadOnlyCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // Điều hướng Trái / Phải giữa các thông báo
  const canGoPrev = viewingIndex !== null && viewingIndex > 0;
  const canGoNext =
    viewingIndex !== null &&
    (isDualView
      ? viewingIndex < displayedNotifications.length - 2
      : viewingIndex < displayedNotifications.length - 1);

  const handlePrev = useCallback(() => {
    setViewingIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
  }, []);

  const handleNext = useCallback(() => {
    setViewingIndex((prev) => {
      if (prev === null) return null;
      const maxIdx = isDualView
        ? Math.max(0, displayedNotifications.length - 2)
        : displayedNotifications.length - 1;
      return prev < maxIdx ? prev + 1 : prev;
    });
  }, [isDualView, displayedNotifications.length]);

  // Phím tắt bàn phím: ESC để đóng, ← / → để chuyển thông báo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (viewingIndex !== null) {
        if (e.key === 'Escape') {
          setViewingIndex(null);
        } else if (e.key === 'ArrowLeft') {
          handlePrev();
        } else if (e.key === 'ArrowRight') {
          handleNext();
        }
      } else if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, viewingIndex, handlePrev, handleNext]);

  // Bấm vào 1 thông báo để xem chi tiết
  const handleOpenDetail = async (n: RealtimeNotification, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const idx = displayedNotifications.findIndex((item) => item.id === n.id);
    setViewingIndex(idx !== -1 ? idx : 0);
    if (!n.isRead) {
      await markAsRead(n.id);
    }
  };

  // Tự động đánh dấu đã đọc thông báo đang mở (hỗ trợ cả 2 thẻ khi bật chế độ xem đôi)
  useEffect(() => {
    if (viewingIndex !== null && displayedNotifications[viewingIndex]) {
      const n1 = displayedNotifications[viewingIndex];
      if (n1 && !n1.isRead) {
        markAsRead(n1.id);
      }
      if (isDualView && displayedNotifications[viewingIndex + 1]) {
        const n2 = displayedNotifications[viewingIndex + 1];
        if (n2 && !n2.isRead) {
          markAsRead(n2.id);
        }
      }
    }
  }, [viewingIndex, isDualView, displayedNotifications, markAsRead]);

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
          title={`${portalTitle} (Mở ngăn kéo)`}
          aria-label="Thông báo"
          aria-expanded={isDrawerOpen}
        >
          <span
            className={`material-symbols-outlined text-[20px] transition-transform ${
              unreadCount > 0 ? 'text-[#00875A]' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            notifications
          </span>

          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-zinc-900 pointer-events-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* 2. SLIDE-OVER DRAWER (NGĂN KÉO THÔNG BÁO GỌN GÀNG) */}
      {isMounted && isDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[80] overflow-hidden font-sans">
          {/* Backdrop mờ nền */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* Drawer Container */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[80]">
            <div className="w-screen max-w-[420px] sm:max-w-[460px] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-zinc-800 animate-in slide-in-from-right duration-300">
              
              {/* --- DRAWER HEADER --- */}
              <div className="p-4 sm:px-5 sm:py-3.5 bg-slate-50/90 dark:bg-zinc-850 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#003B2B] dark:text-emerald-400 flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[19px]">notifications</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{portalTitle}</span>
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[9px] font-extrabold">
                          {unreadCount > 99 ? '99+' : unreadCount} mới
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {unreadCount > 0 ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo'}
                    </p>
                  </div>
                </div>

                {/* Actions: Đọc tất cả & Nút Đóng */}
                <div className="flex items-center gap-1.5">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors cursor-pointer flex items-center gap-1"
                      title="Đánh dấu tất cả thông báo là đã đọc"
                    >
                      <span className="material-symbols-outlined text-sm">done_all</span>
                      <span>Đọc tất cả</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                    title="Đóng"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
              </div>

              {/* --- DRAWER TABS: CHỈ 2 TAB ĐỌC & CHƯA ĐỌC --- */}
              <div className="flex items-center border-b border-slate-200 dark:border-zinc-800 px-4 bg-slate-50/50 dark:bg-zinc-850 text-xs font-semibold shrink-0 gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('ALL')}
                  className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'ALL'
                      ? 'border-[#003B2B] text-[#003B2B] dark:border-emerald-400 dark:text-emerald-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Tất cả</span>
                  <span className="px-1.5 py-0.2 rounded-md bg-slate-200 dark:bg-zinc-700 text-[10px] font-bold">
                    {totalCount || notifications.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('UNREAD')}
                  className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'UNREAD'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Chưa đọc</span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* --- NOTIFICATIONS LIST --- */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
                {isLoading && notifications.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center">
                    <span className="material-symbols-outlined text-3xl animate-spin mb-2 text-emerald-600">
                      progress_activity
                    </span>
                    <p className="text-xs">Đang tải thông báo...</p>
                  </div>
                ) : displayedNotifications.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center px-4">
                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-2xl text-slate-400">
                        {activeTab === 'UNREAD' ? 'check_circle' : 'notifications_off'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {activeTab === 'UNREAD'
                        ? 'Tuyệt vời! Bạn không có thông báo chưa đọc nào'
                        : 'Chưa có thông báo nào'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      {activeTab === 'UNREAD'
                        ? 'Tất cả các thông báo mới sẽ hiển thị tại đây khi có cập nhật.'
                        : 'Hệ thống sẽ gửi thông báo đến bạn khi có sự kiện mới.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {displayedNotifications.map((n) => {
                      const isUnread = !n.isRead;
                      const isCritical = n.priority === 'CRITICAL';
                      const isHigh = n.priority === 'HIGH';

                      return (
                        <div
                          key={n.id}
                          onClick={(e) => handleOpenDetail(n, e)}
                          className={`p-3.5 rounded-2xl transition-all cursor-pointer flex items-start gap-3 relative border ${
                            isUnread
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40 hover:bg-emerald-50/70'
                              : 'bg-white dark:bg-zinc-900 border-slate-200/70 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-850 opacity-90'
                          }`}
                        >
                          {/* Unread indicator dot */}
                          {isUnread && (
                            <span className="absolute top-3.5 right-3.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
                          )}

                          {/* Icon category */}
                          <div className="shrink-0 mt-0.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
                                isCritical
                                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                                  : isHigh
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                                  : isUnread
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-slate-300'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[19px]">
                                {isCritical
                                  ? 'warning'
                                  : isHigh
                                  ? 'report_problem'
                                  : n.type?.includes('ORDER')
                                  ? 'receipt_long'
                                  : n.type?.includes('SHIPPING')
                                  ? 'local_shipping'
                                  : n.category === 'MANUAL_DIRECT'
                                  ? 'chat'
                                  : 'notifications'}
                              </span>
                            </div>
                          </div>

                          {/* Nội dung thông báo */}
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              {getSenderBadge(n.senderType, n.senderName)}
                              {isCritical && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white">
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
                              className={`text-xs leading-snug line-clamp-2 ${
                                isUnread
                                  ? 'font-bold text-slate-900 dark:text-white'
                                  : 'font-medium text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {n.title}
                            </h4>

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>

                            <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 pt-1.5 border-t border-slate-100 dark:border-zinc-800/60">
                              <span>{formatRelativeTime(n.createdAt)}</span>

                              <span className="text-[#00875A] font-bold hover:underline flex items-center gap-0.5 text-[11px]">
                                <span>Chi tiết</span>
                                <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Nút tải thêm thông báo */}
                    {hasMore && (
                      <div className="pt-2 text-center">
                        <button
                          type="button"
                          onClick={loadMore}
                          disabled={isLoadingMore}
                          className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-emerald-800 dark:text-slate-300 dark:hover:text-emerald-400 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isLoadingMore ? (
                            <>
                              <span className="material-symbols-outlined text-sm animate-spin">
                                progress_activity
                              </span>
                              <span>Đang tải thêm...</span>
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">expand_more</span>
                              <span>Tải thêm thông báo cũ</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* --- DRAWER FOOTER: LINK VÀO TRUNG TÂM THÔNG BÁO --- */}
              <div className="p-3.5 bg-slate-50/90 dark:bg-zinc-850 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Realtime đồng bộ</span>
                </div>

                <Link
                  href={defaultFullPage}
                  onClick={() => setIsDrawerOpen(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#003B2B] hover:bg-[#00271E] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                >
                  <span>Trung Tâm Thông Báo</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3. MODAL XEM CHI TIẾT THÔNG BÁO (HỖ TRỢ ĐIỀU HƯỚNG TRÁI / PHẢI & CHẾ ĐỘ XEM ĐÔI 2 THÔNG BÁO SONG SONG) */}
      {isMounted && viewingIndex !== null && displayedNotifications[viewingIndex] && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in font-sans"
          onClick={() => setViewingIndex(null)}
        >
          <div
            className={`bg-white dark:bg-zinc-900 w-full transition-all duration-300 rounded-2xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 text-slate-900 dark:text-slate-100 relative z-[101] ${
              isDualView ? 'max-w-5xl xl:max-w-6xl' : 'max-w-xl'
            }`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Header Modal với bộ điều hướng Trước/Sau và Nút Chế Độ Xem Đôi */}
            <div className="p-3.5 sm:px-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50/90 dark:bg-zinc-850 gap-2 flex-wrap">
              {/* Tiêu đề & Icon */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-[#003B2B] dark:text-emerald-400 flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[17px]">
                    notifications_active
                  </span>
                </div>
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Chi tiết thông báo
                </span>
              </div>

              {/* Bộ điều hướng Qua Trái / Qua Phải */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800/80 px-2 py-1 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-2xs">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={!canGoPrev}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-0.5 cursor-pointer"
                  title="Thông báo trước (Phím ←)"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span className="hidden sm:inline">Trước</span>
                </button>

                <span className="text-[11px] font-mono font-bold px-1.5 text-emerald-800 dark:text-emerald-400 min-w-[65px] text-center">
                  {isDualView
                    ? `${viewingIndex + 1}-${Math.min(viewingIndex + 2, displayedNotifications.length)} / ${displayedNotifications.length}`
                    : `${viewingIndex + 1} / ${displayedNotifications.length}`}
                </span>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canGoNext}
                  className="px-2 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-0.5 cursor-pointer"
                  title="Thông báo sau (Phím →)"
                >
                  <span className="hidden sm:inline">Sau</span>
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>

              {/* Nút Chuyển Xem 2 Thông Báo Song Song & Đóng Modal */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDualView(!isDualView)}
                  className={`px-2.5 py-1.2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    isDualView
                      ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                      : 'bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-750'
                  }`}
                  title={isDualView ? 'Chuyển về xem 1 thông báo' : 'Xem song song 2 thông báo để tiện đối chiếu lên đơn'}
                >
                  <span className="material-symbols-outlined text-sm">
                    {isDualView ? 'view_agenda' : 'view_column'}
                  </span>
                  <span className="hidden md:inline">
                    {isDualView ? 'Xem 1 thẻ' : 'Xem song song 2 thẻ'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewingIndex(null)}
                  className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
                  title="Đóng (ESC)"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>

            {/* Nội dung thông báo: Hỗ trợ Xem 1 hoặc Xem 2 Song Song */}
            {(() => {
              const notif1 = displayedNotifications[viewingIndex];
              const notif2 = isDualView ? (displayedNotifications[viewingIndex + 1] || null) : null;

              const renderNotifCard = (n: RealtimeNotification, orderIdx: number) => {
                return (
                  <div key={n.id} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      {/* Meta header */}
                      <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                        <div className="flex items-center gap-2">
                          {getSenderBadge(n.senderType, n.senderName)}
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400">
                            {n.type}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            #{orderIdx}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString('vi-VN') : ''}
                        </span>
                      </div>

                      {/* Tiêu đề & Nội dung */}
                      <div>
                        <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                          {n.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                          {n.message}
                        </p>
                      </div>

                      {/* Thẻ Đơn Hàng Tích Hợp (Xem chi tiết + Nút Xác Nhận Đơn Liền) */}
                      <NotificationOrderCard
                        notification={n}
                        variant={variant}
                        onCloseModal={() => {
                          setViewingIndex(null);
                          setIsDrawerOpen(false);
                        }}
                      />

                      {/* Ảnh đính kèm nếu có */}
                      {n.imageUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 max-h-56">
                          <img
                            src={n.imageUrl}
                            alt="Đính kèm"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>

                    {/* Footer của mỗi thông báo */}
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs mt-3">
                      <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>Đã ghi nhận</span>
                      </span>

                      {n.actionUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = n.actionUrl!;
                            setViewingIndex(null);
                            setIsDrawerOpen(false);
                            router.push(url);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#003B2B] hover:bg-[#00271E] text-white text-xs font-bold shadow-2xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>Xem chi tiết trang</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div
                  className={`overflow-y-auto flex-1 ${
                    isDualView
                      ? 'grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-zinc-800'
                      : 'flex flex-col'
                  }`}
                >
                  {/* Cột 1: Thông báo chính */}
                  {renderNotifCard(notif1, viewingIndex + 1)}

                  {/* Cột 2: Thông báo kế tiếp khi ở chế độ xem đôi */}
                  {isDualView && (
                    notif2 ? (
                      renderNotifCard(notif2, viewingIndex + 2)
                    ) : (
                      <div className="p-8 flex flex-col items-center justify-center text-center text-slate-400 space-y-2.5 bg-slate-50/50 dark:bg-zinc-850/50">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl text-slate-400">check_circle</span>
                        </div>
                        <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                          Đã đến thông báo cuối cùng
                        </h4>
                        <p className="text-xs text-slate-400 max-w-xs">
                          Không còn thông báo tiếp theo trong danh sách để đối chiếu song song.
                        </p>
                      </div>
                    )
                  )}
                </div>
              );
            })()}

            {/* Footer Modal Tổng */}
            <div className="p-3 px-4 bg-slate-50 dark:bg-zinc-850 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
              <span className="flex items-center gap-1 text-[11px]">
                <span className="material-symbols-outlined text-sm text-emerald-600">keyboard</span>
                <span>Dùng phím mũi tên <strong>←</strong> / <strong>→</strong> để lướt nhanh, <strong>ESC</strong> để đóng</span>
              </span>

              <button
                type="button"
                onClick={() => setViewingIndex(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// --------------------------------------------------------------------------
// SUBCOMPONENT: THẺ ĐƠN HÀNG TÍCH HỢP CHO THÔNG BÁO (NOTIFICATION ORDER CARD)
// HIỂN THỊ ĐẦY ĐỦ THÔNG TIN LÊN ĐƠN + NÚT XÁC NHẬN ĐƠN NGAY TRONG MODAL
// --------------------------------------------------------------------------
interface NotificationOrderCardProps {
  notification: RealtimeNotification;
  variant: string;
  onCloseModal?: () => void;
}

function NotificationOrderCard({
  notification,
  variant,
  onCloseModal,
}: NotificationOrderCardProps) {
  const router = useRouter();
  const payload = (notification.payload || {}) as Record<string, any>;

  // Trích xuất mã đơn hàng
  const orderCode = useMemo(() => {
    if (payload.orderCode) return String(payload.orderCode).replace(/^#/, '');
    const titleMatch = notification.title?.match(/#(ORD-[A-Za-z0-9-]+)/i) || notification.title?.match(/(ORD-[A-Za-z0-9-]+)/i);
    if (titleMatch) return titleMatch[1];
    const msgMatch = notification.message?.match(/#(ORD-[A-Za-z0-9-]+)/i) || notification.message?.match(/(ORD-[A-Za-z0-9-]+)/i);
    if (msgMatch) return msgMatch[1];
    return null;
  }, [payload, notification]);

  // Trích xuất sellerOrderId (UUID)
  const sellerOrderId = useMemo(() => {
    if (payload.sellerOrderId && typeof payload.sellerOrderId === 'string') return payload.sellerOrderId;
    if (Array.isArray(payload.sellerOrders) && payload.sellerOrders[0]?.sellerOrderId) {
      return payload.sellerOrders[0].sellerOrderId;
    }
    const match = notification.actionUrl?.match(/\/seller\/orders\/([0-9a-fA-F-]+)/);
    if (match) return match[1];
    return null;
  }, [payload, notification]);

  const [orderDetail, setOrderDetail] = useState<SellerOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmedStatus, setConfirmedStatus] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Tải chi tiết đơn hàng thực tế từ API nếu có ID hoặc Code
  useEffect(() => {
    let isCancelled = false;
    async function fetchOrderInfo() {
      if (variant !== 'seller') return;
      if (sellerOrderId) {
        setIsLoading(true);
        try {
          const res = await orderApi.getSellerOrderDetail(sellerOrderId);
          if (!isCancelled && res.success && res.data) {
            setOrderDetail(res.data);
            setConfirmedStatus(res.data.status);
          }
        } catch (err) {
          console.warn('Lỗi tải chi tiết đơn hàng cho thông báo:', err);
        } finally {
          if (!isCancelled) setIsLoading(false);
        }
      } else if (orderCode) {
        setIsLoading(true);
        try {
          const res = await orderApi.getSellerOrders({ search: orderCode, limit: 1 });
          if (!isCancelled && res.success && res.data?.items?.[0]) {
            setOrderDetail(res.data.items[0]);
            setConfirmedStatus(res.data.items[0].status);
          }
        } catch (err) {
          console.warn('Lỗi tìm đơn hàng cho thông báo:', err);
        } finally {
          if (!isCancelled) setIsLoading(false);
        }
      }
    }
    fetchOrderInfo();
    return () => {
      isCancelled = true;
    };
  }, [sellerOrderId, orderCode, variant]);

  // Nếu không phải là thông báo đơn hàng, không render thẻ đơn
  if (!orderCode && !sellerOrderId && !notification.type?.includes('ORDER')) {
    return null;
  }

  // Thao tác Xác Nhận Đơn Hàng Ngay Lập Tức
  const handleConfirmOrder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetId = sellerOrderId || orderDetail?.id;
    if (!targetId) return;

    setIsConfirming(true);
    setConfirmError(null);
    try {
      const res = await orderApi.confirmOrder(targetId);
      if (res.success) {
        setConfirmedStatus('CONFIRMED');
        if (orderDetail) {
          setOrderDetail({ ...orderDetail, status: 'CONFIRMED' });
        }
      } else {
        setConfirmError((res as any)?.message || (res as any)?.error?.message || 'Không thể xác nhận đơn hàng');
      }
    } catch (err: any) {
      setConfirmError(err?.message || 'Lỗi kết nối khi xác nhận đơn');
    } finally {
      setIsConfirming(false);
    }
  };

  const currentStatus = confirmedStatus || orderDetail?.status || 'PENDING_CONFIRMATION';
  const isPending = currentStatus === 'PENDING_CONFIRMATION';
  const isConfirmed = currentStatus === 'CONFIRMED';

  // Thông tin giao nhận
  const shippingAddress = orderDetail?.order?.shippingAddress || payload.shippingAddress;
  const receiverName =
    shippingAddress?.receiverName || shippingAddress?.recipientName || shippingAddress?.fullName || 'Khách nhận';
  const receiverPhone = shippingAddress?.receiverPhone || shippingAddress?.phone || '';
  const fullAddress =
    shippingAddress?.fullAddress ||
    [shippingAddress?.address, shippingAddress?.ward, shippingAddress?.district, shippingAddress?.province]
      .filter(Boolean)
      .join(', ');

  // Danh sách sản phẩm & Tổng tiền
  const items = orderDetail?.items || [];
  const grandTotal = orderDetail?.grandTotal || payload.total || payload.totalAmount || 0;
  const paymentMethod = orderDetail?.order?.paymentMethod || payload.paymentMethod || 'COD';

  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'CONFIRMED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            <span>Đã xác nhận</span>
          </span>
        );
      case 'PREPARING':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">inventory_2</span>
            <span>Đang chuẩn bị</span>
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">local_shipping</span>
            <span>Đang giao</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">verified</span>
            <span>Hoàn tất</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">cancel</span>
            <span>Đã hủy</span>
          </span>
        );
      case 'PENDING_CONFIRMATION':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            <span>Chờ xác nhận</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl p-3.5 space-y-3">
      {/* Thanh tiêu đề thẻ đơn */}
      <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-zinc-700/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-[#003B2B] dark:text-emerald-400 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
              Đơn hàng
            </div>
            <span className="font-mono font-black text-xs text-slate-900 dark:text-white">
              #{orderCode || sellerOrderId?.slice(0, 8) || 'Đơn hàng'}
            </span>
          </div>
        </div>

        <div>{getStatusBadge()}</div>
      </div>

      {/* Trạng thái đang tải */}
      {isLoading && (
        <div className="py-2 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
          <span className="material-symbols-outlined text-sm animate-spin text-emerald-600">progress_activity</span>
          <span>Đang kiểm tra thông tin đơn hàng...</span>
        </div>
      )}

      {/* Thông tin người nhận & Địa chỉ giao hàng */}
      {(receiverName || receiverPhone || fullAddress) && (
        <div className="text-xs space-y-1 bg-white dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-zinc-800">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-emerald-700 dark:text-emerald-400">person</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{receiverName}</span>
              {receiverPhone && <span className="font-mono text-slate-400">({receiverPhone})</span>}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
              {paymentMethod}
            </span>
          </div>

          {fullAddress && (
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug line-clamp-2 flex items-start gap-1">
              <span className="material-symbols-outlined text-xs text-slate-400 mt-0.5 shrink-0">location_on</span>
              <span>{fullAddress}</span>
            </p>
          )}
        </div>
      )}

      {/* Danh sách sách trong đơn */}
      {items.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div
              key={item.id || idx}
              className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                {item.coverImage || item.coverUrl ? (
                  <img
                    src={item.coverImage || item.coverUrl}
                    alt={item.title}
                    className="w-7 h-9 rounded object-cover shrink-0 border border-slate-200 dark:border-zinc-700"
                  />
                ) : (
                  <div className="w-7 h-9 rounded bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 text-slate-400">
                    <span className="material-symbols-outlined text-xs">book</span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-bold text-[11px] text-slate-900 dark:text-white truncate max-w-[170px] sm:max-w-[220px]">
                    {item.title}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <span className="px-1 rounded bg-slate-100 dark:bg-zinc-800 text-[9px] font-semibold">
                      {item.format === 'DIGITAL' ? 'Ebook' : 'Sách giấy'}
                    </span>
                    <span>x{item.quantity}</span>
                  </div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono font-bold text-[11px] text-[#00875A] dark:text-emerald-400">
                  {((item.price || 0) * (item.quantity || 1)).toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tổng tiền thanh toán */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="text-slate-500 dark:text-slate-400 font-semibold">Tổng tiền đơn:</span>
        <span className="font-mono font-black text-sm text-[#003B2B] dark:text-emerald-400">
          {grandTotal ? `${Number(grandTotal).toLocaleString('vi-VN')} ₫` : 'Theo đơn hàng'}
        </span>
      </div>

      {confirmError && (
        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] font-medium flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{confirmError}</span>
        </div>
      )}

      {/* Hành động: Xác nhận đơn ngay & Mở xem đơn */}
      <div className="flex items-center gap-2 pt-1">
        {variant === 'seller' && (sellerOrderId || orderDetail?.id) && isPending && (
          <button
            type="button"
            onClick={handleConfirmOrder}
            disabled={isConfirming}
            className="flex-1 py-2 px-3 rounded-xl bg-[#003B2B] hover:bg-[#00281D] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isConfirming ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                <span>Đang xác nhận...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Xác nhận đơn ngay</span>
              </>
            )}
          </button>
        )}

        {variant === 'seller' && isConfirmed && (
          <div className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-sm">verified</span>
            <span>Đã xác nhận đơn hàng ✔</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onCloseModal?.();
            const target =
              variant === 'seller'
                ? `/seller/orders?search=${encodeURIComponent(orderCode || sellerOrderId || '')}`
                : `/orders/${orderCode || ''}`;
            router.push(target);
          }}
          className="py-2 px-3 rounded-xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer shrink-0"
        >
          <span>Mở chi tiết</span>
          <span className="material-symbols-outlined text-xs">open_in_new</span>
        </button>
      </div>
    </div>
  );
}

