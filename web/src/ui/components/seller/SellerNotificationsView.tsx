'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  adminNotificationService,
  AdminBroadcastNotification,
  NotificationCategory,
} from '@/ui/services/adminNotificationService';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { useAuth } from '@/ui/context/AuthContext';
import { SellerPagination } from './SellerUI';

type TabFilter = 'all' | 'admin' | 'finance' | 'orders' | 'marketing';

export default function SellerNotificationsView() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('id');

  const { user, activeBusinessId } = useAuth();
  const currentBizId = user?.business?.id || activeBusinessId || undefined;

  // Xác định mốc thời gian tạo gian hàng / tài khoản người bán
  const sellerCreatedAt = useMemo(() => {
    if (user?.business?.createdAt) return user.business.createdAt;
    if (user?.createdAt) return user.createdAt;
    if (typeof window !== 'undefined') {
      if (currentBizId) {
        const stored = localStorage.getItem(`huki_seller_registered_at_${currentBizId}`);
        if (stored) return stored;
        try {
          const p = localStorage.getItem(`huki_enterprise_profile_${currentBizId}`);
          if (p) {
            const parsed = JSON.parse(p);
            if (parsed.submitted_at || parsed.createdAt) return parsed.submitted_at || parsed.createdAt;
          }
        } catch {}
      }
      const userReg = localStorage.getItem(`huki_seller_registered_at_${user?.id || 'current'}`);
      if (userReg) return userReg;
    }
    // Mặc định shop đang thao tác nếu không có mốc cũ thì xem là mới tạo để lọc đúng quy tắc
    return new Date().toISOString();
  }, [user?.business?.createdAt, user?.createdAt, currentBizId, user?.id]);

  const [notifications, setNotifications] = useState<AdminBroadcastNotification[]>([]);
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<AdminBroadcastNotification | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadNotifs = () => {
    const list = adminNotificationService.getForSeller(currentBizId, true, sellerCreatedAt);
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifs();
    window.addEventListener('huki_admin_notifications_updated', loadNotifs);
    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'ADMIN_NOTIFICATIONS_UPDATED' || msg.type === 'FEATURE_FLAGS_UPDATED') {
        loadNotifs();
      }
    });

    return () => {
      window.removeEventListener('huki_admin_notifications_updated', loadNotifs);
      unsubscribe();
    };
  }, [currentBizId, sellerCreatedAt]);

  // Open modal if URL has ?id=
  useEffect(() => {
    if (highlightId && notifications.length > 0) {
      const found = notifications.find((n) => n.id === highlightId);
      if (found) {
        setSelectedNotif(found);
        adminNotificationService.markAsRead(found.id, currentBizId);
      }
    }
  }, [highlightId, notifications, currentBizId]);

  const handleMarkAllRead = () => {
    adminNotificationService.markAllAsRead(currentBizId);
  };

  const handleOpenDetail = (notif: AdminBroadcastNotification) => {
    adminNotificationService.markAsRead(notif.id, currentBizId);
    setSelectedNotif(notif);
  };

  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(
      (n) => !currentBizId || !n.readByBusinessIds?.includes(currentBizId)
    ).length;
    const adminNotifs = notifications.filter(
      (n) => n.category === 'MAINTENANCE' || n.category === 'POLICY' || n.category === 'SECURITY'
    ).length;
    const financeNotifs = notifications.filter((n) => n.category === 'FINANCE').length;
    return { total, unread, adminNotifs, financeNotifs };
  }, [notifications, currentBizId]);

  const filteredList = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeTab === 'admin') {
        if (n.category !== 'MAINTENANCE' && n.category !== 'POLICY' && n.category !== 'SECURITY') return false;
      } else if (activeTab === 'finance') {
        if (n.category !== 'FINANCE') return false;
      } else if (activeTab === 'orders') {
        if (n.category !== 'ORDER') return false;
      } else if (activeTab === 'marketing') {
        if (n.category !== 'MARKETING') return false;
      }

      // Unread only filter
      if (unreadOnly) {
        const isRead = currentBizId && n.readByBusinessIds?.includes(currentBizId);
        if (isRead) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = n.title.toLowerCase().includes(q);
        const matchSummary = n.summary.toLowerCase().includes(q);
        const matchContent = n.content.toLowerCase().includes(q);
        if (!matchTitle && !matchSummary && !matchContent) return false;
      }

      return true;
    });
  }, [notifications, activeTab, unreadOnly, searchQuery, currentBizId]);

  const getCategoryMeta = (cat: NotificationCategory) => {
    switch (cat) {
      case 'MAINTENANCE':
        return { label: 'Bảo Trì', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: 'build' };
      case 'POLICY':
        return { label: 'Chính Sách', color: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: 'policy' };
      case 'FINANCE':
        return { label: 'Tài Chính & Escrow', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: 'account_balance_wallet' };
      case 'ORDER':
        return { label: 'Đơn Hàng', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: 'local_shipping' };
      case 'MARKETING':
        return { label: 'Khuyến Mãi & Deal', color: 'bg-rose-100 text-rose-800 border-rose-200', icon: 'campaign' };
      case 'SECURITY':
      default:
        return { label: 'Bảo Mật', color: 'bg-slate-100 text-slate-800 border-slate-200', icon: 'security' };
    }
  };

  const formatRelativeTime = (isoString: string) => {
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
              <span>Thông Báo Quản Trị Sàn &amp; Vận Hành Realtime</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Trung Tâm Thông Báo Gian Hàng
            </h1>
            <p className="text-white/80 text-xs sm:text-sm leading-relaxed">
              Theo dõi kịp thời mọi thông báo bảo trì, lịch đối soát tài chính Escrow, thay đổi quy định và cơ hội bán hàng độc quyền từ Ban quản trị HUKI.
            </p>
          </div>

          {/* Stat Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="block text-xl font-black text-white">{stats.total}</span>
              <span className="text-[11px] text-emerald-200/90 font-medium">Tổng thông báo</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="block text-xl font-black text-rose-300">{stats.unread}</span>
              <span className="text-[11px] text-emerald-200/90 font-medium">Chưa đọc</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="block text-xl font-black text-amber-300">{stats.adminNotifs}</span>
              <span className="text-[11px] text-emerald-200/90 font-medium">Từ BQT Sàn</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="block text-xl font-black text-[#94F5D6]">{stats.financeNotifs}</span>
              <span className="text-[11px] text-emerald-200/90 font-medium">Tài chính</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Controls & Tabs */}
      <section className="bg-white border border-slate-200/80 rounded-2xl p-3.5 sm:p-4 shadow-xs space-y-3">
        {/* Horizontal Category Tabs */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-[#003B2B] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">all_inbox</span>
              <span>Tất Cả ({notifications.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'admin'
                  ? 'bg-[#00875A] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">campaign</span>
              <span>Từ Ban Quản Trị Sàn</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('finance')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'finance'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
              <span>Tài Chính &amp; Escrow</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
              <span>Đơn Hàng &amp; Vận Hành</span>
            </button>
          </div>

          {/* Mark all as read */}
          {stats.unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:text-[#00875A] hover:bg-emerald-50 text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">done_all</span>
              <span>Đánh dấu đã đọc tất cả</span>
            </button>
          )}
        </div>

        {/* Search & Filter row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tiêu đề, từ khóa hoặc nội dung thông báo..."
              className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
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

          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer self-start sm:self-auto select-none">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="w-4 h-4 rounded text-[#00875A] focus:ring-[#00875A] border-slate-300 rounded cursor-pointer"
            />
            <span>Chỉ xem thông báo chưa đọc</span>
          </label>
        </div>
      </section>

      {/* 3. Notification List */}
      <section className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">notifications_off</span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-slate-900">Không có thông báo nào</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || unreadOnly
                  ? 'Thử điều chỉnh lại bộ lọc hoặc từ khóa tìm kiếm.'
                  : 'Hiện tại bạn đã cập nhật đầy đủ mọi thông báo mới nhất từ Ban quản trị sàn.'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {filteredList.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((n) => {
            const isRead = currentBizId && n.readByBusinessIds?.includes(currentBizId);
            const catMeta = getCategoryMeta(n.category);

            return (
              <div
                key={n.id}
                onClick={() => handleOpenDetail(n)}
                className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:shadow-md relative overflow-hidden ${
                  !isRead
                    ? 'border-emerald-300/80 bg-emerald-50/15 ring-1 ring-emerald-500/10'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Left: Icon & Body */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                      n.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-700'
                        : n.severity === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-[#00875A]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{catMeta.icon}</span>
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${catMeta.color}`}>
                        {catMeta.label}
                      </span>
                      {n.severity === 'CRITICAL' && (
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-600 text-white">
                          Khẩn cấp
                        </span>
                      )}
                      {n.isPinnedTop && (
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500 text-white flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px]">push_pin</span>
                          <span>Ghim Đầu Trang</span>
                        </span>
                      )}
                      {(n.scheduleType === 'RECURRING' || (n.scheduleType === 'SCHEDULED' && new Date(n.scheduledAt || '').getTime() >= Date.now())) && (
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">event_upcoming</span>
                          <span>Sắp Diễn Ra</span>
                        </span>
                      )}
                      {n.category === 'POLICY' && (
                        <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">verified</span>
                          <span>Hiện Hành</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-medium">
                        • {formatRelativeTime(n.createdAt)}
                      </span>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Chưa đọc" />
                      )}
                    </div>

                    <h3 className={`text-sm sm:text-base leading-snug line-clamp-1 ${!isRead ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                      {n.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {n.summary}
                    </p>
                  </div>
                </div>

                {/* Right: Action CTA */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {n.actionUrl && (
                    <Link
                      href={n.actionUrl}
                      onClick={(e) => e.stopPropagation()}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#00875A] hover:text-white text-slate-700 text-xs font-bold transition-all shadow-2xs"
                    >
                      {n.actionLabel || 'Truy Cập Nhanh'}
                    </Link>
                  )}
                  <button
                    type="button"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
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

      {/* 4. Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${getCategoryMeta(selectedNotif.category).color}`}>
                    {getCategoryMeta(selectedNotif.category).label}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(selectedNotif.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                  {selectedNotif.title}
                </h2>
                <p className="text-xs text-slate-400">Người gửi: {selectedNotif.authorName}</p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedNotif(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 font-semibold text-slate-800">
                📌 {selectedNotif.summary}
              </div>
              <div className="space-y-2">{selectedNotif.content}</div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400 font-medium">HUKI Partner Notification Portal</span>
              <div className="flex items-center gap-2">
                {selectedNotif.actionUrl && (
                  <Link
                    href={selectedNotif.actionUrl}
                    onClick={() => setSelectedNotif(null)}
                    className="bg-[#00875A] hover:bg-[#00704A] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    {selectedNotif.actionLabel || 'Đi Tới Trang Liên Quan'}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedNotif(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
