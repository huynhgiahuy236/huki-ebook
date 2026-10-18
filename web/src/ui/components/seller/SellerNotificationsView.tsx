'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRealtimeNotifications, RealtimeNotification } from '@/ui/hooks/useRealtimeNotifications';
import { SellerPagination } from './SellerUI';

type TabFilter = 'all' | 'admin' | 'alerts' | 'orders' | 'messages';

export default function SellerNotificationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useRealtimeNotifications();

  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<RealtimeNotification | null>(null);

  // Multi-select bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Open modal if URL has ?id=
  useEffect(() => {
    if (highlightId && notifications.length > 0) {
      const found = notifications.find((n) => n.id === highlightId);
      if (found) {
        setSelectedNotif(found);
        if (!found.isRead) {
          markAsRead(found.id);
        }
      }
    }
  }, [highlightId, notifications, markAsRead]);

  const handleOpenDetail = (notif: RealtimeNotification) => {
    setSelectedNotif(notif);
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
  };

  // Toggle selection for bulk actions
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = (filteredIds: string[]) => {
    const areAllSelected = filteredIds.every((id) => selectedIds.includes(id));
    if (areAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    setSelectedIds([]);
    for (const id of ids) {
      await markAsRead(id);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = unreadCount;
    const adminNotifs = notifications.filter(
      (n) => n.senderType === 'ADMIN' || n.category === 'MANUAL_BROADCAST'
    ).length;
    const alertNotifs = notifications.filter(
      (n) => n.priority === 'CRITICAL' || n.priority === 'HIGH' || n.category === 'AUTO_WATCHDOG'
    ).length;
    const orderNotifs = notifications.filter(
      (n) => n.category === 'AUTO_LIFECYCLE' || n.type?.includes('ORDER')
    ).length;
    return { total, unread, adminNotifs, alertNotifs, orderNotifs };
  }, [notifications, unreadCount]);

  // Filtering notifications
  const filteredList = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Tab filter
      if (activeTab === 'admin') {
        if (n.senderType !== 'ADMIN' && n.category !== 'MANUAL_BROADCAST') return false;
      } else if (activeTab === 'alerts') {
        if (
          n.priority !== 'CRITICAL' &&
          n.priority !== 'HIGH' &&
          n.category !== 'AUTO_WATCHDOG' &&
          !n.type?.includes('ALERT') &&
          !n.type?.includes('OVERDUE')
        ) {
          return false;
        }
      } else if (activeTab === 'orders') {
        if (n.category !== 'AUTO_LIFECYCLE' && !n.type?.includes('ORDER') && !n.title?.toLowerCase().includes('đơn')) {
          return false;
        }
      } else if (activeTab === 'messages') {
        if (
          n.category !== 'MANUAL_DIRECT' &&
          n.senderType !== 'USER' &&
          n.senderType !== 'SHIPPER'
        ) {
          return false;
        }
      }

      // 2. Unread only filter
      if (unreadOnly && n.isRead) {
        return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchMessage = n.message?.toLowerCase().includes(q);
        const matchSender = n.senderName?.toLowerCase().includes(q);
        if (!matchTitle && !matchMessage && !matchSender) return false;
      }

      return true;
    });
  }, [notifications, activeTab, unreadOnly, searchQuery]);

  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const pagedIds = useMemo(() => pagedList.map((n) => n.id), [pagedList]);
  const areAllCurrentPageSelected = pagedIds.length > 0 && pagedIds.every((id) => selectedIds.includes(id));

  // Sender badges
  const getSenderBadge = (senderType: string, senderName?: string) => {
    switch (senderType) {
      case 'ADMIN':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 flex items-center gap-1">
            <span>🛡️</span>
            <span>Ban Quản Trị HUKI</span>
          </span>
        );
      case 'SELLER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center gap-1">
            <span>🏪</span>
            <span>{senderName || 'Người bán'}</span>
          </span>
        );
      case 'SHIPPER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 flex items-center gap-1">
            <span>🛵</span>
            <span>{senderName || 'Bưu tá Express'}</span>
          </span>
        );
      case 'USER':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 flex items-center gap-1">
            <span>👤</span>
            <span>{senderName || 'Khách hàng'}</span>
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

  const formatRelativeTime = (isoString?: string) => {
    if (!isoString) return '';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* 1. Header Banner & Quick Stats */}
      <section
        className="rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg border border-white/10"
        style={{
          background: 'linear-gradient(135deg, #003B2B 0%, #005A3E 60%, #00271E 100%)',
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[#94F5D6] text-xs font-bold backdrop-blur-md border border-white/20">
              <span className="material-symbols-outlined text-[15px] text-[#FBBF24]">notifications_active</span>
              <span>Trung Tâm Thông Báo &amp; Lịch Sử Toàn Sàn Realtime</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Trung Tâm Thông Báo Gian Hàng
            </h1>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
              Theo dõi và quản lý đầy đủ lịch sử thông báo: bảo trì hệ thống, lịch đối soát tài chính, cập nhật đơn hàng và tương tác trực tiếp từ khách hàng &amp; bưu tá.
            </p>
          </div>

          {/* Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="block text-xl font-black text-white">{stats.total}</span>
              <span className="text-[11px] text-emerald-200/90 font-medium">Tổng lịch sử</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="block text-xl font-black text-rose-300">{stats.unread}</span>
              <span className="text-[11px] text-emerald-200/90 font-medium">Chưa đọc</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="block text-xl font-black text-amber-300">{stats.alertNotifs}</span>
              <span className="text-[11px] text-emerald-200/90 font-medium">Cảnh báo</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="block text-xl font-black text-[#94F5D6]">{stats.adminNotifs}</span>
              <span className="text-[11px] text-emerald-200/90 font-medium">Từ BQT</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Controls & Tabs (Framed Card) */}
      <section className="bg-white dark:bg-neutral-900 border border-slate-200/80 dark:border-neutral-800 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
        {/* Horizontal Category Tabs */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#003B2B] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">all_inbox</span>
              <span>Tất Cả ({notifications.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">shield</span>
              <span>Từ Ban Quản Trị ({stats.adminNotifs})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('alerts');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'alerts'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span>Cảnh Báo &amp; Khẩn ({stats.alertNotifs})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('orders');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              <span>Đơn Hàng ({stats.orderNotifs})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('messages');
                setCurrentPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'messages'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              <span>Chủ Động (1-1)</span>
            </button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                isMultiSelectMode
                  ? 'bg-emerald-800 text-white border-emerald-800'
                  : 'border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-sm">checklist</span>
              <span>{isMultiSelectMode ? 'Đang chọn nhiều' : 'Chọn nhiều'}</span>
            </button>

            {stats.unread > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:text-[#00875A] hover:bg-emerald-50 text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">done_all</span>
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-zinc-800">
          <div className="relative w-full sm:max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo tiêu đề, người gửi hoặc nội dung thông báo..."
              className="w-full h-10 pl-9 pr-8 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer self-start sm:self-auto select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                setCurrentPage(1);
              }}
              className="w-4 h-4 rounded text-[#00875A] focus:ring-[#00875A] border-slate-300 rounded cursor-pointer"
            />
            <span>Chỉ xem thông báo chưa đọc</span>
          </label>
        </div>

        {/* Bulk Action Bar (When selection is active) */}
        {(isMultiSelectMode || selectedIds.length > 0) && (
          <div className="px-4 py-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <label className="flex items-center gap-2 cursor-pointer font-semibold select-none">
                <input
                  type="checkbox"
                  checked={areAllCurrentPageSelected}
                  onChange={() => handleToggleSelectAll(pagedIds)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Chọn tất cả trang này ({pagedList.length})</span>
              </label>

              {selectedIds.length > 0 && (
                <span className="text-amber-400 font-bold">
                  • Đã chọn: {selectedIds.length} thông báo
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkMarkAsRead}
                disabled={selectedIds.length === 0}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
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
                className="text-slate-400 hover:text-white px-2 py-1 text-xs cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. Notification List (Card Container) */}
      <section className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">notifications_off</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Không có thông báo nào</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                {searchQuery || unreadOnly
                  ? 'Thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.'
                  : 'Hiện tại bạn đã cập nhật đầy đủ mọi thông báo mới nhất từ Ban quản trị sàn.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {pagedList.map((n) => {
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
                      handleOpenDetail(n);
                    }
                  }}
                  className={`bg-white dark:bg-neutral-900 rounded-2xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:shadow-md relative overflow-hidden ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-1 ring-emerald-500/30'
                      : !n.isRead
                      ? isCritical
                        ? 'border-rose-300 bg-rose-50/20 dark:bg-rose-950/20 ring-1 ring-rose-500/20'
                        : isHigh
                        ? 'border-amber-300 bg-amber-50/20 dark:bg-amber-950/20 ring-1 ring-amber-500/20'
                        : 'border-emerald-300/80 bg-emerald-50/15 ring-1 ring-emerald-500/10'
                      : 'border-slate-200/90 dark:border-neutral-800 hover:border-slate-300'
                  }`}
                >
                  {/* Left: Icon, Checkbox & Body */}
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {/* Checkbox */}
                    {(isMultiSelectMode || isSelected) && (
                      <div className="pt-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(n.id)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                      </div>
                    )}

                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                        isCritical
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300'
                          : isHigh
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          : 'bg-emerald-100 text-[#00875A] dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
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

                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getSenderBadge(n.senderType, n.senderName)}
                        {isCritical && (
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-600 text-white animate-pulse">
                            Khẩn cấp
                          </span>
                        )}
                        {isHigh && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-md bg-amber-500 text-white">
                            Ưu tiên
                          </span>
                        )}
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          • {formatRelativeTime(n.createdAt)}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Chưa đọc" />
                        )}
                      </div>

                      <h3
                        className={`text-sm sm:text-base leading-snug line-clamp-1 ${
                          !n.isRead ? 'font-black text-slate-900 dark:text-white' : 'font-bold text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {n.title}
                      </h3>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  {/* Right: Action CTA */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {n.actionUrl && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!n.isRead) markAsRead(n.id);
                          router.push(n.actionUrl!);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#00875A] hover:text-white dark:bg-zinc-800 dark:hover:bg-emerald-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      >
                        Xử lý ngay →
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(n)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Xem chi tiết"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Pagination Toolbar */}
            {filteredList.length > pageSize && (
              <div className="pt-2">
                <SellerPagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredList.length / pageSize) || 1}
                  totalItems={filteredList.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  itemLabel="thông báo"
                />
              </div>
            )}
          </>
        )}
      </section>

      {/* 4. Notification Detail Modal */}
      {selectedNotif && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedNotif(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 dark:border-zinc-800 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  {getSenderBadge(selectedNotif.senderType, selectedNotif.senderName)}
                  {selectedNotif.priority === 'CRITICAL' && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-600 text-white animate-pulse">
                      Báo động đỏ
                    </span>
                  )}
                  {selectedNotif.priority === 'HIGH' && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-500 text-white">
                      Ưu tiên cao
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {new Date(selectedNotif.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedNotif.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/60 dark:border-zinc-700 font-medium">
                {selectedNotif.message}
              </div>

              {selectedNotif.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 max-h-64">
                  <img src={selectedNotif.imageUrl} alt="Attachment" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                <span>Đã ghi nhận đã đọc</span>
              </span>

              <div className="flex items-center gap-2">
                {selectedNotif.actionUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = selectedNotif.actionUrl!;
                      setSelectedNotif(null);
                      router.push(url);
                    }}
                    className="bg-[#00875A] hover:bg-[#00704A] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span>Truy cập xử lý ngay</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedNotif(null)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
