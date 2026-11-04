'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useRealtimeNotifications, RealtimeNotification } from '@/ui/hooks/useRealtimeNotifications';
import { useAuth } from '@/ui/context/AuthContext';
import { adminNotificationService, AdminBroadcastNotification } from '@/ui/services/adminNotificationService';
import { SellerPagination } from './SellerUI';

export type NotificationCategoryTab =
  | 'all'
  | 'sla'
  | 'orders'
  | 'finance'
  | 'admin'
  | 'reviews'
  | 'messages';

export type PriorityFilter = 'all' | 'CRITICAL' | 'HIGH' | 'NORMAL';
export type ReadStatusFilter = 'all' | 'unread' | 'read';
export type DateRangeFilter = 'all' | 'today' | '3days' | '7days' | '30days';
export type SortOrderFilter = 'newest' | 'oldest' | 'priority';

export default function SellerNotificationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  const { user, activeBusinessId } = useAuth();
  const currentBizId = user?.business?.id || activeBusinessId || undefined;
  const sellerCreatedAt = user?.business?.createdAt || user?.createdAt || undefined;

  // Realtime hook
  const {
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useRealtimeNotifications({ recipientType: 'BUSINESS' });

  // Broadcast announcements from admin / system
  const [adminNotifs, setAdminNotifs] = useState<AdminBroadcastNotification[]>(() =>
    adminNotificationService.getForSeller(currentBizId, false, sellerCreatedAt)
  );

  useEffect(() => {
    const handleUpdate = () => {
      setAdminNotifs(adminNotificationService.getForSeller(currentBizId, false, sellerCreatedAt));
    };
    window.addEventListener('huki_admin_notifications_updated', handleUpdate);
    return () => window.removeEventListener('huki_admin_notifications_updated', handleUpdate);
  }, [currentBizId, sellerCreatedAt]);

  // Local read status overrides for instant UI reactivity
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());

  // 1. TỔNG HỢP TOÀN BỘ THÔNG BÁO (Hệ thống, BQT, Đơn hàng, SLA Watchdog, Ví)
  const allMergedNotifications = useMemo((): RealtimeNotification[] => {
    const effectiveBiz = currentBizId || 'default_seller';
    const broadcastList: RealtimeNotification[] = adminNotifs.map((an) => {
      const isAlreadyRead = Boolean(an.readByBusinessIds?.includes(effectiveBiz));
      return {
        id: an.id,
        recipientId: effectiveBiz,
        recipientType: 'BUSINESS',
        senderType: 'ADMIN',
        senderName: an.authorName || 'Ban Quản Trị HUKI',
        category: 'MANUAL_BROADCAST',
        type: an.category === 'MAINTENANCE' ? 'SYSTEM_ALERT' : 'BROADCAST',
        title: an.title,
        message: an.content || an.summary,
        priority: an.severity === 'CRITICAL' ? 'CRITICAL' : an.severity === 'WARNING' ? 'HIGH' : 'NORMAL',
        isRead: isAlreadyRead,
        actionUrl: an.actionUrl,
        createdAt: an.createdAt,
        payload: {
          authorName: an.authorName || 'Ban Quản Trị HUKI',
          actionLabel: an.actionLabel || 'Xem hướng dẫn & chi tiết',
          isBroadcast: true,
          severity: an.severity,
        },
      };
    });

    const map = new Map<string, RealtimeNotification>();
    broadcastList.forEach((n) => map.set(n.id, n));
    notifications.forEach((n) => map.set(n.id, n));

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        isRead: localReadIds.has(item.id) ? true : item.isRead,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [adminNotifs, notifications, currentBizId, localReadIds]);

  // 2. BỘ LỌC VÀ TRẠNG THÁI TÌM KIẾM
  const [activeTab, setActiveTab] = useState<NotificationCategoryTab>('all');
  const [readFilter, setReadFilter] = useState<ReadStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [dateFilter, setDateFilter] = useState<DateRangeFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrderFilter>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Multi-select bulk state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Modal State
  const [selectedNotifIndex, setSelectedNotifIndex] = useState<number | null>(null);

  // Helper helper category matcher
  const isSlaNotice = useCallback((n: RealtimeNotification) => {
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    return (
      n.category === 'AUTO_WATCHDOG' ||
      n.type === 'WATCHDOG_ALERT' ||
      title.includes('sla') ||
      title.includes('sao quả tạ') ||
      title.includes('quá 24h') ||
      title.includes('quá 48h') ||
      title.includes('hủy đơn') ||
      msg.includes('sao quả tạ') ||
      msg.includes('trừ 1 điểm') ||
      msg.includes('trừ 2 điểm') ||
      msg.includes('chưa xử lý đơn') ||
      Boolean((n.payload as any)?.penaltyPoints)
    );
  }, []);

  const isOrderNotice = useCallback((n: RealtimeNotification) => {
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    return (
      n.category === 'AUTO_LIFECYCLE' ||
      n.type?.includes('ORDER') ||
      n.type?.includes('SHIPPING') ||
      title.includes('đơn hàng') ||
      title.includes('vận chuyển') ||
      title.includes('bưu tá') ||
      msg.includes('đơn hàng') ||
      Boolean((n.payload as any)?.orderCode)
    );
  }, []);

  const isFinanceNotice = useCallback((n: RealtimeNotification) => {
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    return (
      n.type?.includes('PAYMENT') ||
      n.type?.includes('ESCROW') ||
      n.type?.includes('PAYOUT') ||
      n.type?.includes('WALLET') ||
      title.includes('thanh toán') ||
      title.includes('ví') ||
      title.includes('escrow') ||
      title.includes('rút tiền') ||
      title.includes('đối soát') ||
      msg.includes('ví') ||
      msg.includes('escrow') ||
      msg.includes('tiền về') ||
      msg.includes('rút tiền')
    );
  }, []);

  const isAdminNotice = useCallback((n: RealtimeNotification) => {
    return (
      n.senderType === 'ADMIN' ||
      n.category === 'MANUAL_BROADCAST' ||
      n.type === 'BROADCAST' ||
      n.type === 'SYSTEM_ALERT' ||
      Boolean((n.payload as any)?.isBroadcast)
    );
  }, []);

  const isReviewNotice = useCallback((n: RealtimeNotification) => {
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    return (
      n.type?.includes('REVIEW') ||
      n.type?.includes('REPLY') ||
      title.includes('đánh giá') ||
      title.includes('nhận xét') ||
      msg.includes('đánh giá') ||
      msg.includes('sao')
    );
  }, []);

  const isMessageNotice = useCallback((n: RealtimeNotification) => {
    const title = (n.title || '').toLowerCase();
    const msg = (n.message || '').toLowerCase();
    return (
      n.category === 'MANUAL_DIRECT' ||
      n.type?.includes('CHAT') ||
      n.senderType === 'USER' ||
      n.senderType === 'SHIPPER' ||
      title.includes('tin nhắn') ||
      title.includes('chat') ||
      msg.includes('tin nhắn')
    );
  }, []);

  // 3. TÍNH TOÁN SỐ LƯỢNG THỐNG KÊ (KPI STATS)
  const stats = useMemo(() => {
    const total = allMergedNotifications.length;
    const unread = allMergedNotifications.filter((n) => !n.isRead).length;

    let slaCount = 0;
    let orderCount = 0;
    let financeCount = 0;
    let adminCount = 0;
    let reviewCount = 0;
    let messageCount = 0;

    let unreadSla = 0;
    let unreadOrders = 0;
    let unreadFinance = 0;
    let unreadAdmin = 0;
    let unreadReviews = 0;
    let unreadMessages = 0;

    allMergedNotifications.forEach((n) => {
      const isUnread = !n.isRead;

      if (isSlaNotice(n)) {
        slaCount++;
        if (isUnread) unreadSla++;
      }
      if (isOrderNotice(n)) {
        orderCount++;
        if (isUnread) unreadOrders++;
      }
      if (isFinanceNotice(n)) {
        financeCount++;
        if (isUnread) unreadFinance++;
      }
      if (isAdminNotice(n)) {
        adminCount++;
        if (isUnread) unreadAdmin++;
      }
      if (isReviewNotice(n)) {
        reviewCount++;
        if (isUnread) unreadReviews++;
      }
      if (isMessageNotice(n)) {
        messageCount++;
        if (isUnread) unreadMessages++;
      }
    });

    return {
      total,
      unread,
      slaCount,
      orderCount,
      financeCount,
      adminCount,
      reviewCount,
      messageCount,
      unreadSla,
      unreadOrders,
      unreadFinance,
      unreadAdmin,
      unreadReviews,
      unreadMessages,
    };
  }, [allMergedNotifications, isSlaNotice, isOrderNotice, isFinanceNotice, isAdminNotice, isReviewNotice, isMessageNotice]);

  // 4. LỌC DANH SÁCH THÔNG BÁO THEO TẤT CẢ ĐIỀU KIỆN
  const filteredList = useMemo(() => {
    const now = Date.now();

    const result = allMergedNotifications.filter((n) => {
      // 1. Tab danh mục chính
      if (activeTab === 'sla') {
        if (!isSlaNotice(n)) return false;
      } else if (activeTab === 'orders') {
        if (!isOrderNotice(n)) return false;
      } else if (activeTab === 'finance') {
        if (!isFinanceNotice(n)) return false;
      } else if (activeTab === 'admin') {
        if (!isAdminNotice(n)) return false;
      } else if (activeTab === 'reviews') {
        if (!isReviewNotice(n)) return false;
      } else if (activeTab === 'messages') {
        if (!isMessageNotice(n)) return false;
      }

      // 2. Trạng thái đọc
      if (readFilter === 'unread' && n.isRead) return false;
      if (readFilter === 'read' && !n.isRead) return false;

      // 3. Mức độ ưu tiên
      if (priorityFilter !== 'all') {
        const itemPriority = n.priority || 'NORMAL';
        if (itemPriority !== priorityFilter) return false;
      }

      // 4. Khoảng thời gian
      if (dateFilter !== 'all') {
        const timeDiff = now - new Date(n.createdAt).getTime();
        const oneDay = 24 * 3600 * 1000;
        if (dateFilter === 'today' && timeDiff > oneDay) return false;
        if (dateFilter === '3days' && timeDiff > 3 * oneDay) return false;
        if (dateFilter === '7days' && timeDiff > 7 * oneDay) return false;
        if (dateFilter === '30days' && timeDiff > 30 * oneDay) return false;
      }

      // 5. Từ khóa tìm kiếm
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (n.title || '').toLowerCase().includes(q);
        const matchMessage = (n.message || '').toLowerCase().includes(q);
        const matchSender = (n.senderName || '').toLowerCase().includes(q);
        const matchOrderCode = Boolean((n.payload as any)?.orderCode?.toLowerCase().includes(q));
        if (!matchTitle && !matchMessage && !matchSender && !matchOrderCode) return false;
      }

      return true;
    });

    // 6. Sắp xếp
    return result.sort((a, b) => {
      if (sortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === 'priority') {
        const weight: Record<string, number> = { CRITICAL: 3, HIGH: 2, NORMAL: 1 };
        const wA = weight[a.priority || 'NORMAL'] || 1;
        const wB = weight[b.priority || 'NORMAL'] || 1;
        if (wB !== wA) return wB - wA;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    allMergedNotifications,
    activeTab,
    readFilter,
    priorityFilter,
    dateFilter,
    searchQuery,
    sortOrder,
    isSlaNotice,
    isOrderNotice,
    isFinanceNotice,
    isAdminNotice,
    isReviewNotice,
    isMessageNotice,
  ]);

  // Phân trang
  const pagedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  const pagedIds = useMemo(() => pagedList.map((n) => n.id), [pagedList]);
  const areAllCurrentPageSelected =
    pagedIds.length > 0 && pagedIds.every((id) => selectedIds.includes(id));

  // Tự động mở modal nếu có query param ?id=
  useEffect(() => {
    if (highlightId && filteredList.length > 0) {
      const idx = filteredList.findIndex((n) => n.id === highlightId);
      if (idx !== -1) {
        setSelectedNotifIndex(idx);
        const target = filteredList[idx];
        if (!target.isRead) {
          handleMarkSingleAsRead(target.id);
        }
      }
    }
  }, [highlightId, filteredList]);

  // Đánh dấu đã đọc 1 thông báo
  const handleMarkSingleAsRead = useCallback(
    (id: string) => {
      setLocalReadIds((prev) => new Set(prev).add(id));
      if (
        id.startsWith('notif-') ||
        id.startsWith('maint-') ||
        id.startsWith('sched-') ||
        id.startsWith('auto-') ||
        id.startsWith('reopen-')
      ) {
        adminNotificationService.markAsRead(id, currentBizId);
      } else {
        markAsRead(id);
      }
    },
    [currentBizId, markAsRead]
  );

  // Mở modal chi tiết
  const handleOpenDetailByIndex = (idx: number) => {
    setSelectedNotifIndex(idx);
    const notif = filteredList[idx];
    if (notif && !notif.isRead) {
      handleMarkSingleAsRead(notif.id);
    }
  };

  // Đánh dấu đã đọc tất cả
  const handleMarkAllUnified = async () => {
    if (!window.confirm('Bạn có chắc muốn đánh dấu TẤT CẢ thông báo là ĐÃ ĐỌC?')) return;
    adminNotificationService.markAllAsRead(currentBizId);
    setLocalReadIds(new Set(allMergedNotifications.map((n) => n.id)));
    await markAllAsRead();
  };

  // Chọn/bỏ chọn checkbox
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (areAllCurrentPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pagedIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pagedIds])));
    }
  };

  const handleBulkMarkSelectedAsRead = async () => {
    if (selectedIds.length === 0) return;
    const ids = [...selectedIds];
    setSelectedIds([]);
    setLocalReadIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    for (const id of ids) {
      if (
        id.startsWith('notif-') ||
        id.startsWith('maint-') ||
        id.startsWith('sched-') ||
        id.startsWith('auto-') ||
        id.startsWith('reopen-')
      ) {
        adminNotificationService.markAsRead(id, currentBizId);
      } else {
        await markAsRead(id);
      }
    }
  };

  // Reset tất cả bộ lọc về mặc định
  const handleResetFilters = () => {
    setActiveTab('all');
    setReadFilter('all');
    setPriorityFilter('all');
    setDateFilter('all');
    setSortOrder('newest');
    setSearchQuery('');
    setCurrentPage(1);
    setSelectedIds([]);
    setIsMultiSelectMode(false);
  };

  const isAnyFilterActive =
    activeTab !== 'all' ||
    readFilter !== 'all' ||
    priorityFilter !== 'all' ||
    dateFilter !== 'all' ||
    sortOrder !== 'newest' ||
    Boolean(searchQuery.trim());

  // Định dạng thời gian
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Vừa xong';
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 86400 * 3) return `${Math.floor(diff / 86400)} ngày trước`;
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const selectedNotif =
    selectedNotifIndex !== null && filteredList[selectedNotifIndex]
      ? filteredList[selectedNotifIndex]
      : null;

  return (
    <div className="flex flex-col gap-5 w-full max-w-[1600px] mx-auto pb-20 font-sans animate-in fade-in duration-200">
      
      {/* ===================================================================== */}
      {/* 1. HEADER KPI SUMMARY CARDS (TRUNG TÂM BÁO CÁO THÔNG BÁO THỜI GIAN THỰC) */}
      {/* ===================================================================== */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Tổng lịch sử */}
        <div
          onClick={() => {
            setActiveTab('all');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-2xs ${
            activeTab === 'all'
              ? 'bg-[#003B2B] text-white border-[#003B2B] ring-2 ring-[#003B2B]/20'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                activeTab === 'all'
                  ? 'bg-white/15 text-[#94F5D6]'
                  : 'bg-emerald-50 text-[#00875A] dark:bg-zinc-800 dark:text-emerald-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">all_inbox</span>
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider opacity-75">Hộp thư</span>
          </div>
          <div className="text-2xl font-black tracking-tight">{stats.total}</div>
          <p className="text-[11px] opacity-80 mt-0.5 truncate">Tất cả thông báo</p>
        </div>

        {/* Card 2: Chưa đọc (High Urgency) */}
        <div
          onClick={() => {
            setReadFilter(readFilter === 'unread' ? 'all' : 'unread');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-2xs ${
            readFilter === 'unread'
              ? 'bg-rose-700 text-white border-rose-700 ring-2 ring-rose-600/30'
              : 'bg-white hover:bg-rose-50/50 text-slate-800 border-rose-200/80 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                readFilter === 'unread'
                  ? 'bg-white/15 text-rose-200'
                  : 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">mark_email_unread</span>
            </span>
            {stats.unread > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-500 text-white animate-pulse">
                Cần xử lý
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.unread}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Tin chưa đọc
          </p>
        </div>

        {/* Card 3: Cảnh báo SLA & Sao Quả Tạ */}
        <div
          onClick={() => {
            setActiveTab('sla');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-2xs ${
            activeTab === 'sla'
              ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-500/20'
              : 'bg-white hover:bg-amber-50/50 text-slate-800 border-amber-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                activeTab === 'sla'
                  ? 'bg-white/15 text-amber-200'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">gavel</span>
            </span>
            {stats.unreadSla > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white">
                +{stats.unreadSla}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">
            {stats.slaCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            SLA &amp; Sao Quả Tạ
          </p>
        </div>

        {/* Card 4: Đơn hàng & Giao vận */}
        <div
          onClick={() => {
            setActiveTab('orders');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-2xs ${
            activeTab === 'orders'
              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500/20'
              : 'bg-white hover:bg-blue-50/50 text-slate-800 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                activeTab === 'orders'
                  ? 'bg-white/15 text-blue-200'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            </span>
            {stats.unreadOrders > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-500 text-white">
                +{stats.unreadOrders}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.orderCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Đơn hàng &amp; Giao vận
          </p>
        </div>

        {/* Card 5: Từ Ban Quản Trị Sàn & Bảo Trì */}
        <div
          onClick={() => {
            setActiveTab('admin');
            setCurrentPage(1);
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group shadow-2xs col-span-2 sm:col-span-1 ${
            activeTab === 'admin'
              ? 'bg-indigo-700 text-white border-indigo-700 ring-2 ring-indigo-500/20'
              : 'bg-white hover:bg-indigo-50/50 text-slate-800 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 dark:text-white'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                activeTab === 'admin'
                  ? 'bg-white/15 text-indigo-200'
                  : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">shield</span>
            </span>
            {stats.unreadAdmin > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500 text-white">
                +{stats.unreadAdmin}
              </span>
            )}
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {stats.adminCount}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
            Chỉ đạo Ban Quản Trị
          </p>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 2. TAB NAVIGATION & ADVANCED FILTER DOCK */}
      {/* ===================================================================== */}
      <section className="bg-white dark:bg-neutral-900 border border-slate-200/90 dark:border-neutral-800 rounded-2xl p-4 shadow-2xs space-y-3.5">
        
        {/* Row 1: Category Tabs (Scrollable on Mobile) */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-1 min-w-0">
            {[
              { id: 'all', label: 'Tất cả', count: stats.total, unread: stats.unread, icon: 'all_inbox' },
              { id: 'sla', label: 'Cảnh báo SLA & Sao Quả Tạ', count: stats.slaCount, unread: stats.unreadSla, icon: 'gavel', badgeClass: 'bg-amber-500' },
              { id: 'orders', label: 'Đơn hàng & Giao nhận', count: stats.orderCount, unread: stats.unreadOrders, icon: 'local_shipping', badgeClass: 'bg-blue-500' },
              { id: 'finance', label: 'Tài chính & Ví Escrow', count: stats.financeCount, unread: stats.unreadFinance, icon: 'account_balance_wallet', badgeClass: 'bg-emerald-600' },
              { id: 'admin', label: 'Từ Ban Quản Trị', count: stats.adminCount, unread: stats.unreadAdmin, icon: 'shield', badgeClass: 'bg-indigo-600' },
              { id: 'reviews', label: 'Đánh giá độc giả', count: stats.reviewCount, unread: stats.unreadReviews, icon: 'star', badgeClass: 'bg-amber-400' },
              { id: 'messages', label: 'Tin nhắn CSKH', count: stats.messageCount, unread: stats.unreadMessages, icon: 'chat', badgeClass: 'bg-purple-500' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id as NotificationCategoryTab);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#003B2B] text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.unread > 0
                        ? `${tab.badgeClass || 'bg-rose-500'} text-white`
                        : 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {stats.unread > 0 && (
              <button
                type="button"
                onClick={handleMarkAllUnified}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-200 hover:text-[#00875A] hover:bg-emerald-50 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Đánh dấu tất cả là đã đọc"
              >
                <span className="material-symbols-outlined text-[16px]">done_all</span>
                <span className="hidden sm:inline">Đã đọc tất cả</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                refresh();
                setAdminNotifs(adminNotificationService.getForSeller(currentBizId, false, sellerCreatedAt));
              }}
              disabled={isLoading}
              className="p-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 hover:text-slate-900 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              title="Làm mới danh sách ngay"
            >
              <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin text-[#00875A]' : ''}`}>
                refresh
              </span>
            </button>
          </div>
        </div>

        {/* Row 2: Search + Dropdowns Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[260px] max-w-lg">
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
              placeholder="Tìm theo tiêu đề, mã đơn (#ORD-...), người gửi..."
              className="w-full h-9 pl-9 pr-8 bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-750 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>

          {/* Secondary Filter Dropdowns */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Read Filter */}
            <select
              value={readFilter}
              onChange={(e) => {
                setReadFilter(e.target.value as ReadStatusFilter);
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-750 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#00875A] cursor-pointer shadow-2xs"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="unread">Chỉ chưa đọc ({stats.unread})</option>
              <option value="read">Đã đọc</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value as PriorityFilter);
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-750 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#00875A] cursor-pointer shadow-2xs"
            >
              <option value="all">Mức độ ưu tiên</option>
              <option value="CRITICAL">🔴 Khẩn cấp (CRITICAL)</option>
              <option value="HIGH">🟡 Ưu tiên cao (HIGH)</option>
              <option value="NORMAL">🟢 Thông thường (NORMAL)</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value as DateRangeFilter);
                setCurrentPage(1);
              }}
              className="h-9 px-2.5 bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-750 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#00875A] cursor-pointer shadow-2xs"
            >
              <option value="all">Toàn bộ thời gian</option>
              <option value="today">Hôm nay (24 giờ)</option>
              <option value="3days">3 ngày qua</option>
              <option value="7days">7 ngày qua</option>
              <option value="30days">30 ngày qua</option>
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrderFilter)}
              className="h-9 px-2.5 bg-slate-50 dark:bg-zinc-850 border border-slate-200 dark:border-zinc-750 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#00875A] cursor-pointer shadow-2xs"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="priority">Ưu tiên cao trước</option>
            </select>

            {/* Multi-Select Toggle */}
            <button
              type="button"
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                if (isMultiSelectMode) setSelectedIds([]);
              }}
              className={`h-9 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isMultiSelectMode || selectedIds.length > 0
                  ? 'bg-emerald-800 text-white border-emerald-800'
                  : 'bg-white dark:bg-zinc-850 border-slate-200 dark:border-zinc-750 text-slate-700 dark:text-slate-200 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">checklist</span>
              <span>{isMultiSelectMode ? 'Đóng chọn nhiều' : 'Chọn nhiều'}</span>
            </button>

            {/* Reset Filter Button */}
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-9 px-2.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                title="Xóa bộ lọc về mặc định"
              >
                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                <span>Đặt lại</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 3: Multi-Select Floating Bulk Action Dock */}
        {(isMultiSelectMode || selectedIds.length > 0) && (
          <div className="p-3 bg-slate-900 text-white rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-150 shadow-md">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold select-none">
                <input
                  type="checkbox"
                  checked={areAllCurrentPageSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Chọn tất cả trang này ({pagedList.length})</span>
              </label>

              {selectedIds.length > 0 && (
                <span className="text-amber-300 font-bold bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-600/40">
                  Đã chọn: {selectedIds.length} mục
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkMarkSelectedAsRead}
                disabled={selectedIds.length === 0}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
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
                Hủy chọn
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ===================================================================== */}
      {/* 3. DANH SÁCH THÔNG BÁO (NOTIFICATION CARDS LIST) */}
      {/* ===================================================================== */}
      <section className="space-y-2.5">
        {filteredList.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-3xl p-12 text-center space-y-4 shadow-2xs">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-800 text-slate-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl">notifications_off</span>
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Không tìm thấy thông báo nào phù hợp
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {isAnyFilterActive
                  ? 'Các tiêu chí tìm kiếm hoặc bộ lọc hiện tại không khớp với thông báo nào. Vui lòng bấm đặt lại để xem đầy đủ.'
                  : 'Hiện tại gian hàng của bạn chưa có thông báo mới nào từ hệ thống sàn.'}
              </p>
            </div>
            {isAnyFilterActive && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-[#003B2B] hover:bg-[#00271E] text-white text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">restart_alt</span>
                <span>Đặt lại tất cả bộ lọc</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Header thanh đếm số lượng kết quả */}
            <div className="flex items-center justify-between text-xs text-slate-500 px-1 font-medium">
              <span>
                Hiển thị{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {Math.min((currentPage - 1) * pageSize + 1, filteredList.length)} -{' '}
                  {Math.min(currentPage * pageSize, filteredList.length)}
                </strong>{' '}
                trên tổng số{' '}
                <strong className="text-slate-800 dark:text-slate-200">{filteredList.length}</strong> thông báo
              </span>

              <div className="flex items-center gap-1.5">
                <span>Số tin mỗi trang:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-transparent text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* List rendered items */}
            {pagedList.map((n, idx) => {
              const isCritical = n.priority === 'CRITICAL';
              const isHigh = n.priority === 'HIGH';
              const isSelected = selectedIds.includes(n.id);
              const isSla = isSlaNotice(n);
              const isOrder = isOrderNotice(n);
              const isFinance = isFinanceNotice(n);
              const isAdmin = isAdminNotice(n);

              const globalIndex = (currentPage - 1) * pageSize + idx;

              return (
                <div
                  key={n.id}
                  onClick={(e) => {
                    if (isMultiSelectMode) {
                      handleToggleSelect(n.id, e);
                    } else {
                      handleOpenDetailByIndex(globalIndex);
                    }
                  }}
                  className={`bg-white dark:bg-neutral-900 rounded-2xl border transition-all p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 cursor-pointer hover:shadow-md relative overflow-hidden group ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 ring-2 ring-emerald-500/20'
                      : !n.isRead
                      ? isCritical || isSla
                        ? 'border-rose-300 bg-rose-50/30 dark:bg-rose-950/20 shadow-2xs'
                        : isHigh
                        ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/20 shadow-2xs'
                        : 'border-emerald-300 bg-emerald-50/25 dark:bg-emerald-950/20 shadow-2xs'
                      : 'border-slate-200/80 dark:border-neutral-800 hover:border-slate-300'
                  }`}
                >
                  {/* Left Indicator Ribbon for unread */}
                  {!n.isRead && (
                    <div
                      className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        isCritical || isSla
                          ? 'bg-rose-600 animate-pulse'
                          : isHigh
                          ? 'bg-amber-500'
                          : 'bg-[#00875A]'
                      }`}
                    />
                  )}

                  {/* Checkbox (if multi-select) & Category Icon */}
                  <div className="flex items-start gap-3 flex-1 min-w-0 pl-1">
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

                    {/* Icon by Category */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                        isSla
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 ring-1 ring-rose-300'
                          : isOrder
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                          : isFinance
                          ? 'bg-emerald-100 text-[#00875A] dark:bg-emerald-950 dark:text-emerald-300'
                          : isAdmin
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isSla
                          ? 'gavel'
                          : isOrder
                          ? 'local_shipping'
                          : isFinance
                          ? 'account_balance_wallet'
                          : isAdmin
                          ? 'shield'
                          : n.category === 'MANUAL_DIRECT'
                          ? 'chat'
                          : 'notifications'}
                      </span>
                    </div>

                    {/* Content Details */}
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Label Pill */}
                        {isSla ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1 shadow-2xs">
                            <span className="material-symbols-outlined text-[12px]">warning</span>
                            <span>Sao Quả Tạ &amp; SLA</span>
                          </span>
                        ) : isOrder ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            Đơn Hàng
                          </span>
                        ) : isFinance ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Tài Chính Ví
                          </span>
                        ) : isAdmin ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                            Ban Quản Trị
                          </span>
                        ) : null}

                        {isCritical && !isSla && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white animate-pulse">
                            Khẩn cấp
                          </span>
                        )}

                        {isHigh && !isCritical && !isSla && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500 text-white">
                            Ưu tiên cao
                          </span>
                        )}

                        <span className="text-[11px] text-slate-400 font-medium">
                          • {formatTime(n.createdAt)}
                        </span>

                        {!n.isRead && (
                          <span
                            className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"
                            title="Tin mới chưa đọc"
                          />
                        )}
                      </div>

                      {/* Notification Title */}
                      <h3
                        className={`text-sm leading-snug line-clamp-1 ${
                          !n.isRead
                            ? 'font-black text-slate-900 dark:text-white'
                            : 'font-bold text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {n.title}
                      </h3>

                      {/* Notification Message Snippet */}
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions & Navigation CTA */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center pl-1 sm:pl-0">
                    {/* Primary CTA button if actionUrl exists */}
                    {n.actionUrl && n.actionUrl.startsWith('/') && !n.actionUrl.includes('sdasd') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!n.isRead) {
                            handleMarkSingleAsRead(n.id);
                          }
                          router.push(n.actionUrl!);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 ${
                          isSla
                            ? 'bg-rose-700 hover:bg-rose-800 text-white'
                            : isOrder
                            ? 'bg-[#003B2B] hover:bg-[#00271E] text-white'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <span>
                          {typeof n.payload?.actionLabel === 'string'
                            ? n.payload.actionLabel
                            : isSla
                            ? 'Xác nhận đóng gói ngay'
                            : 'Xử lý ngay'}
                        </span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </button>
                    )}

                    {/* Toggle Read button on hover */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (n.isRead) {
                          setLocalReadIds((prev) => {
                            const next = new Set(prev);
                            next.delete(n.id);
                            return next;
                          });
                        } else {
                          handleMarkSingleAsRead(n.id);
                        }
                      }}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title={n.isRead ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {n.isRead ? 'mark_chat_unread' : 'done'}
                      </span>
                    </button>

                    {/* Detail button */}
                    <button
                      type="button"
                      onClick={() => handleOpenDetailByIndex(globalIndex)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Xem chi tiết"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Pagination Controls */}
            {filteredList.length > pageSize && (
              <div className="pt-3">
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

      {/* ===================================================================== */}
      {/* 4. MODAL CHI TIẾT THÔNG BÁO (VỚI STEPPER TRƯỚC / SAU TIỆN DỤNG) */}
      {/* ===================================================================== */}
      {selectedNotif && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans"
          onClick={() => setSelectedNotifIndex(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 dark:border-zinc-800 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isSlaNotice(selectedNotif) ? (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-600 text-white flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">warning</span>
                      <span>Sao Quả Tạ &amp; SLA</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-800 dark:bg-zinc-800 dark:text-slate-200">
                      {selectedNotif.senderName || 'Hệ thống HUKI'}
                    </span>
                  )}

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

                  <span className="text-[11px] text-slate-400">
                    {new Date(selectedNotif.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedNotif.title}
                </h2>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedNotifIndex(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              <div className="p-4 bg-slate-50 dark:bg-zinc-800/60 rounded-2xl border border-slate-200/60 dark:border-zinc-700 font-medium">
                {selectedNotif.message}
              </div>

              {selectedNotif.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-700 max-h-64">
                  <img src={selectedNotif.imageUrl} alt="Đính kèm" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Modal Stepper & Action Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
              {/* Previous / Next Stepper buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={selectedNotifIndex === null || selectedNotifIndex <= 0}
                  onClick={() => {
                    if (selectedNotifIndex !== null && selectedNotifIndex > 0) {
                      handleOpenDetailByIndex(selectedNotifIndex - 1);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
                  title="Thông báo trước (phím ←)"
                >
                  <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                  <span className="hidden sm:inline">Trước</span>
                </button>

                <span className="text-[11px] text-slate-400 px-1">
                  {selectedNotifIndex !== null ? selectedNotifIndex + 1 : 1} / {filteredList.length}
                </span>

                <button
                  type="button"
                  disabled={
                    selectedNotifIndex === null || selectedNotifIndex >= filteredList.length - 1
                  }
                  onClick={() => {
                    if (selectedNotifIndex !== null && selectedNotifIndex < filteredList.length - 1) {
                      handleOpenDetailByIndex(selectedNotifIndex + 1);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-1 cursor-pointer"
                  title="Thông báo tiếp theo (phím →)"
                >
                  <span className="hidden sm:inline">Sau</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {selectedNotif.actionUrl &&
                  selectedNotif.actionUrl.startsWith('/') &&
                  !selectedNotif.actionUrl.includes('sdasd') && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = selectedNotif.actionUrl!;
                        setSelectedNotifIndex(null);
                        router.push(url);
                      }}
                      className="bg-[#003B2B] hover:bg-[#00271E] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>
                        {typeof selectedNotif.payload?.actionLabel === 'string'
                          ? selectedNotif.payload.actionLabel
                          : 'Xử lý ngay'}
                      </span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  )}

                <button
                  type="button"
                  onClick={() => setSelectedNotifIndex(null)}
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
