"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useToast } from '../../context/ToastContext';
import { realtimeSyncBus } from '../../services/realtimeSyncBus';
import {
  bookModerationService,
  ReportedBook,
  BookReportReason,
  BOOK_REPORT_REASON_LABELS,
  BookModerationStatus,
} from '../../services/bookModerationService';
import { AdminStatusBadge, AdminPagination } from './AdminUI';

export function AdminBookModerationView() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | BookModerationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [isLoading, setIsLoading] = useState(true);

  const [reportedBooks, setReportedBooks] = useState<ReportedBook[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, blocked: 0, dismissed: 0 });

  // Detail & Action Modal State
  const [activeBook, setActiveBook] = useState<ReportedBook | null>(null);
  const [actionTab, setActionTab] = useState<'BLOCK' | 'DISMISS' | 'UNBLOCK'>('BLOCK');
  const [blockReason, setBlockReason] = useState<BookReportReason>('COPYRIGHT');
  const [adminNote, setAdminNote] = useState('');
  const [notifySeller, setNotifySeller] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await bookModerationService.getReportedBooks({
        status: activeTab,
        reason: selectedReason,
        searchQuery,
      });
      setReportedBooks(res.items);
      setStats(res.stats);

      // Nếu đang mở xem xét một cuốn sách, cập nhật lại dữ liệu mới nhất
      if (activeBook) {
        const latest = res.items.find((b) => b.bookId === activeBook.bookId);
        if (latest) setActiveBook(latest);
      }
    } catch (err) {
      if (!silent) {
        showToast({
          title: 'Lỗi tải dữ liệu',
          message: 'Không thể tải danh sách sách bị báo cáo.',
          type: 'error',
        });
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [activeTab, selectedReason, searchQuery, activeBook, showToast]);

  useEffect(() => {
    loadData(false);

    // Lắng nghe sự kiện Realtime khi có độc giả gửi báo cáo hoặc admin xử lý
    const unsubscribe = realtimeSyncBus.subscribe((event) => {
      if (
        event.type === 'BOOK_REPORTED' ||
        event.type === 'BOOK_MODERATED' ||
        event.type === 'ADMIN_NOTIFICATIONS_UPDATED'
      ) {
        void loadData(true);
        if (event.type === 'BOOK_REPORTED') {
          showToast({
            title: 'Báo cáo sách mới',
            message: `Có độc giả vừa báo cáo vi phạm tác phẩm: ${(event.payload as any)?.bookTitle || 'Sách'}`,
            type: 'warning',
          });
        }
      }
    });

    return () => unsubscribe();
  }, [loadData, showToast]);

  // Reset trang về 1 khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedReason, searchQuery]);

  // Phân trang
  const totalPages = Math.ceil(reportedBooks.length / pageSize) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return reportedBooks.slice(start, start + pageSize);
  }, [reportedBooks, currentPage, pageSize]);

  // Mở modal xem xét và chuẩn bị dữ liệu
  const handleOpenActionCenter = (book: ReportedBook) => {
    setActiveBook(book);
    setActionTab(book.status === 'BLOCKED' ? 'UNBLOCK' : 'BLOCK');
    setBlockReason(book.reasons[0]?.reason || 'COPYRIGHT');
    setAdminNote('');
    setNotifySeller(true);
  };

  // Thực thi hành động của Admin
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook) return;

    setIsSubmittingAction(true);
    try {
      const reasonLabel = BOOK_REPORT_REASON_LABELS[blockReason]?.label || 'Vi phạm chính sách';
      await bookModerationService.moderateBook({
        bookId: activeBook.bookId,
        action: actionTab,
        reasonText: actionTab === 'BLOCK' ? reasonLabel : undefined,
        note: adminNote.trim(),
        adminName: 'Huki Super Admin',
        notifySeller,
      });

      showToast({
        title: actionTab === 'BLOCK' ? 'Đã khóa sách vi phạm' : actionTab === 'DISMISS' ? 'Đã bác bỏ báo cáo' : 'Đã mở khóa sách',
        message: actionTab === 'BLOCK'
          ? `Tác phẩm "${activeBook.title}" đã bị khóa và gửi thông báo kỷ luật về Shop.`
          : actionTab === 'DISMISS'
          ? `Đã xác nhận tác phẩm "${activeBook.title}" hợp lệ, bác bỏ các phản ánh.`
          : `Đã mở khóa và khôi phục phát hành tác phẩm "${activeBook.title}".`,
        type: actionTab === 'BLOCK' ? 'warning' : 'success',
      });

      setActiveBook(null);
      void loadData(false);
    } catch (err: any) {
      showToast({
        title: 'Thao tác thất bại',
        message: err.message || 'Có lỗi xảy ra khi xử lý kiểm duyệt.',
        type: 'error',
      });
    } finally {
      setIsSubmittingAction(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. TOP HEADER & TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 mb-1.5">
            <span className="material-symbols-outlined text-[15px]">report_problem</span>
            <span>Hậu Kiểm &amp; Xử Lý Vi Phạm Tác Phẩm</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight font-editorial">
            Kiểm Duyệt Sách Vi Phạm (Báo Cáo Độc Giả)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Người bán đăng sách tự do. Ban Quản Trị tiếp nhận phản ánh vi phạm bản quyền, nội dung nhạy cảm và chất lượng từ cộng đồng để thẩm tra và xử lý.
          </p>
        </div>

        <button
          onClick={() => loadData(false)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
            refresh
          </span>
          <span>Làm mới Realtime</span>
        </button>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tổng Sách Bị Báo Cáo</span>
            <div className="text-2xl font-black text-gray-900">{stats.total}</div>
            <span className="text-[11px] text-gray-400">Toàn bộ tác phẩm có phản ánh</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <span className="material-symbols-outlined text-[22px]">inventory_2</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Chờ Admin Xem Xét</span>
            <div className="text-2xl font-black text-amber-700">{stats.pending}</div>
            <span className="text-[11px] text-amber-600">Cần BQT thẩm định &amp; xử lý</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0 border border-amber-200/60">
            <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-rose-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Đã Khóa / Chặn Sàn</span>
            <div className="text-2xl font-black text-rose-700">{stats.blocked}</div>
            <span className="text-[11px] text-rose-600">Đã gỡ và thông báo kỷ luật Shop</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-700 shrink-0 border border-rose-200/60">
            <span className="material-symbols-outlined text-[22px]">lock</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-emerald-200 shadow-2xs flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Đã Bác Bỏ / Hợp Lệ</span>
            <div className="text-2xl font-black text-emerald-700">{stats.dismissed}</div>
            <span className="text-[11px] text-emerald-600">Sách an toàn, báo cáo sai lệch</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0 border border-emerald-200/60">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
        </div>
      </div>

      {/* 3. TABS & FILTER BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {[
            { key: 'all', label: 'Tất Cả', count: stats.total },
            { key: 'PENDING_REVIEW', label: 'Chờ Xem Xét', count: stats.pending, alert: stats.pending > 0 },
            { key: 'BLOCKED', label: 'Đã Khóa / Chặn', count: stats.blocked },
            { key: 'DISMISSED', label: 'Bác Bỏ / Hợp Lệ', count: stats.dismissed },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                activeTab === tab.key
                  ? 'bg-[#00875A] text-white shadow-xs'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-white/20 text-white'
                    : tab.alert
                    ? 'bg-amber-100 text-amber-800 font-extrabold'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Reason Filter & Search Input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="h-9 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 cursor-pointer focus:outline-none focus:border-[#00875A]"
          >
            <option value="all">Tất Cả Loại Vi Phạm</option>
            {(Object.keys(BOOK_REPORT_REASON_LABELS) as BookReportReason[]).map((r) => (
              <option key={r} value={r}>
                {BOOK_REPORT_REASON_LABELS[r].label}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tên sách, shop, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* 4. REPORTED BOOKS TABLE CONTAINER */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#003B2B] text-[10.5px] uppercase font-bold text-white tracking-wider select-none border-b border-[#00281D]">
              <tr>
                <th className="py-3 px-4 text-white">Tác Phẩm Bị Báo Cáo</th>
                <th className="py-3 px-4 text-white">Gian Hàng / Đối Tác</th>
                <th className="py-3 px-4 text-white text-center">Lượt Báo Cáo</th>
                <th className="py-3 px-4 text-white">Phản Ánh Phổ Biến</th>
                <th className="py-3 px-4 text-white text-center">Trạng Thái Sàn</th>
                <th className="py-3 px-4 text-white text-right">Thao Tác Xử Lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                      <span className="text-xs font-semibold">Đang tải danh sách sách bị báo cáo...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedBooks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <span className="material-symbols-outlined text-[36px] text-emerald-600/70">verified</span>
                      <h3 className="text-sm font-bold text-gray-700">Không có tác phẩm nào bị báo cáo</h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        Hiện không có sách nào vi phạm tiêu chuẩn cộng đồng theo bộ lọc hiện tại. Toàn sàn đang hoạt động an toàn.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBooks.map((item) => {
                  const mainReason = item.reasons[0]?.reason || 'OTHER';
                  const reasonMeta = BOOK_REPORT_REASON_LABELS[mainReason] || BOOK_REPORT_REASON_LABELS.OTHER;

                  return (
                    <tr key={item.bookId} className="hover:bg-slate-50/70 transition-colors">
                      {/* Tác phẩm */}
                      <td className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          <img
                            src={item.cover}
                            alt={item.title}
                            className="w-10 h-14 object-cover rounded-lg shadow-2xs shrink-0 border border-slate-200"
                            onError={(e) => {
                              (e.target as any).src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=100&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="space-y-0.5 min-w-0">
                            <span className="font-bold text-slate-900 block truncate max-w-xs sm:max-w-md">
                              {item.title}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500">
                              <span>Tác giả: <strong className="text-slate-700 font-semibold">{item.author}</strong></span>
                              <span>•</span>
                              <span>ISBN: <strong className="text-slate-700 font-semibold">{item.isbn}</strong></span>
                            </div>
                            <span className="inline-block text-[10px] px-2 py-0.2 rounded-md bg-slate-100 text-slate-600 font-semibold">
                              {item.formatLabel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Gian hàng */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 block truncate max-w-[200px]">
                            {item.sellerName}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {item.sellerEmail || item.publisher}
                          </span>
                        </div>
                      </td>

                      {/* Lượt báo cáo */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black border ${
                            item.totalReports >= 3
                              ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">
                            {item.totalReports >= 3 ? 'local_fire_department' : 'warning'}
                          </span>
                          <span>{item.totalReports} phản ánh</span>
                        </span>
                      </td>

                      {/* Phản ánh phổ biến */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-bold border ${reasonMeta.color}`}>
                            {reasonMeta.label}
                          </span>
                          <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                            &ldquo;{item.reports[0]?.description || 'Độc giả phản ánh nội dung có vấn đề'}&rdquo;
                          </p>
                        </div>
                      </td>

                      {/* Trạng thái kiểm duyệt */}
                      <td className="py-3 px-4 text-center">
                        {item.status === 'BLOCKED' ? (
                          <AdminStatusBadge
                            variant="danger"
                            label="Đã khóa / Chặn"
                            icon="lock"
                            dot
                          />
                        ) : item.status === 'DISMISSED' ? (
                          <AdminStatusBadge
                            variant="success"
                            label="Đã bác bỏ / Hợp lệ"
                            icon="verified"
                            dot
                          />
                        ) : (
                          <AdminStatusBadge
                            variant="warning"
                            label="Chờ BQT xem xét"
                            icon="hourglass_top"
                            dot
                          />
                        )}
                      </td>

                      {/* Nút hành động */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenActionCenter(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-[#00875A] text-xs font-bold text-slate-800 hover:text-[#00875A] transition-all shadow-2xs cursor-pointer active:scale-95"
                          title="Mở hồ sơ bằng chứng &amp; Xử lý vi phạm"
                        >
                          <span className="material-symbols-outlined text-[16px] text-slate-500">gavel</span>
                          <span>Xử Lý Vi Phạm</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION */}
        {!isLoading && reportedBooks.length > 0 && (
          <AdminPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={reportedBooks.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            itemLabel="sách bị báo cáo"
            className="p-4 border-t border-gray-100"
          />
        )}
      </div>

      {/* 6. MODERATION ACTION CENTER MODAL */}
      {activeBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-[22px]">gavel</span>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">
                    Hồ Sơ Thẩm Tra &amp; Xử Lý Vi Phạm Sách
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Xem xét bằng chứng từ độc giả và quyết định chặn lưu hành tác phẩm hoặc gửi cảnh cáo trực tiếp đến Shop.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveBook(null)}
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto space-y-6 pr-1 text-xs">
              {/* Sách & Gian hàng card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <img
                    src={activeBook.cover}
                    alt={activeBook.title}
                    className="w-14 h-20 object-cover rounded-xl shadow-xs border border-slate-200 shrink-0"
                  />
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">{activeBook.title}</h3>
                    <div className="flex flex-wrap gap-2 text-slate-600 text-xs">
                      <span>Tác giả: <strong>{activeBook.author}</strong></span>
                      <span>•</span>
                      <span>ISBN: <strong>{activeBook.isbn}</strong></span>
                      <span>•</span>
                      <span>Định dạng: <strong>{activeBook.formatLabel}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[#006953] font-bold">Gian hàng: {activeBook.sellerName}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-500 font-semibold">{activeBook.price.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Trạng thái sàn:</span>
                    {activeBook.status === 'BLOCKED' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold">
                        Đang bị khóa
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        Đang lưu hành
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/book/${activeBook.bookId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold shadow-2xs hover:bg-slate-100 transition-colors"
                  >
                    <span>Mở trang sách trên sàn</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </Link>
                </div>
              </div>

              {/* Danh sách các báo cáo từ độc giả */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-rose-600 text-[18px]">feedback</span>
                    <span>Danh Sách Phản Ánh Từ Độc Giả ({activeBook.reports.length})</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Báo cáo mới nhất: {new Date(activeBook.lastReportedAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {activeBook.reports.map((r, idx) => {
                    const rMeta = BOOK_REPORT_REASON_LABELS[r.reason] || BOOK_REPORT_REASON_LABELS.OTHER;
                    return (
                      <div
                        key={r.id || idx}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 shadow-2xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900">{r.reporterName}</span>
                            <span className={`text-[10px] px-2 py-0.2 rounded-md font-bold border ${rMeta.color}`}>
                              {rMeta.label}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(r.createdAt).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <p className="text-slate-800 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          {r.description}
                        </p>

                        {r.evidenceUrl && (
                          <div className="pt-1 flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                            <span className="material-symbols-outlined text-[14px]">link</span>
                            <a href={r.evidenceUrl} target="_blank" rel="noopener noreferrer">
                              Bằng chứng đối chiếu: {r.evidenceUrl}
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Hành Động Của Admin */}
              <form onSubmit={handleExecuteAction} className="pt-4 border-t border-slate-200 space-y-4">
                <div className="space-y-2">
                  <label className="block font-black text-slate-900 text-xs uppercase tracking-wider">
                    Quyết Định Xử Lý Của Ban Quản Trị *
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActionTab('BLOCK')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                        actionTab === 'BLOCK'
                          ? 'border-rose-600 bg-rose-50 text-rose-800 shadow-2xs ring-2 ring-rose-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[17px]">lock</span>
                        <span>Khóa Sách &amp; Xử Phạt Shop</span>
                      </div>
                      <span className="text-[10.5px] text-slate-500">Gỡ sách khỏi sàn, bắn cảnh cáo về shop</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionTab('DISMISS')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                        actionTab === 'DISMISS'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[17px]">verified</span>
                        <span>Bác Bỏ Báo Cáo (Hợp Lệ)</span>
                      </div>
                      <span className="text-[10.5px] text-slate-500">Xác minh sách hợp lệ, giữ lưu hành bình thường</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionTab('UNBLOCK')}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                        actionTab === 'UNBLOCK'
                          ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-2xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[17px]">lock_open</span>
                        <span>Mở Khóa Lại Sách</span>
                      </div>
                      <span className="text-[10.5px] text-slate-500">Khôi phục sau khi shop khiếu nại thành công</span>
                    </button>
                  </div>
                </div>

                {/* Sub Options when BLOCK */}
                {actionTab === 'BLOCK' && (
                  <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200/80 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Lý Do Xử Phạt Vi Phạm *
                        </label>
                        <select
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value as any)}
                          className="w-full h-10 px-3.5 bg-white border border-slate-200 rounded-lg font-semibold text-xs text-slate-800 focus:outline-none focus:border-rose-600"
                        >
                          {(Object.keys(BOOK_REPORT_REASON_LABELS) as BookReportReason[]).map((rKey) => (
                            <option key={rKey} value={rKey}>
                              {BOOK_REPORT_REASON_LABELS[rKey].label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center pt-5">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={notifySeller}
                            onChange={(e) => setNotifySeller(e.target.checked)}
                            className="w-4 h-4 rounded text-rose-600"
                          />
                          <span>Tự động bắn thông báo vi phạm đến Shop qua Top Bar &amp; Chuông</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Ghi Chú Kỷ Luật &amp; Yêu Cầu Giải Trình Cho Shop *
                      </label>
                      <textarea
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        rows={3}
                        placeholder="Ví dụ: Tác phẩm nhận phản ánh vi phạm bản quyền dịch. Gian hàng vui lòng cung cấp hợp đồng chuyển nhượng hợp lệ trong vòng 48h..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-rose-600 leading-relaxed"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Sub Options when DISMISS */}
                {actionTab === 'DISMISS' && (
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-2">
                    <label className="block font-bold text-slate-700">
                      Ghi Chú Xác Minh Của Admin (Lưu hồ sơ nội bộ)
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={2}
                      placeholder="Ví dụ: Đã kiểm tra số ISBN và giấy phép NXB đối chiếu hợp lệ. Bác bỏ các phản ánh sai lệch..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-emerald-600 leading-relaxed"
                    />
                  </div>
                )}

                {/* Sub Options when UNBLOCK */}
                {actionTab === 'UNBLOCK' && (
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={notifySeller}
                        onChange={(e) => setNotifySeller(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      <span>Gửi thông báo xác nhận mở khóa hoạt động lại cho gian hàng</span>
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={2}
                      placeholder="Ghi chú mở khóa lại sách..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-600 leading-relaxed"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-3 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveBook(null)}
                    disabled={isSubmittingAction}
                    className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer text-xs"
                  >
                    Hủy Bỏ
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmittingAction || (actionTab === 'BLOCK' && !adminNote.trim())}
                    className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-md inline-flex items-center gap-2 cursor-pointer text-xs text-white ${
                      actionTab === 'BLOCK'
                        ? 'bg-rose-600 hover:bg-rose-700 disabled:opacity-50'
                        : actionTab === 'DISMISS'
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSubmittingAction ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                        <span>Đang thực thi...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">
                          {actionTab === 'BLOCK' ? 'lock' : actionTab === 'DISMISS' ? 'verified' : 'lock_open'}
                        </span>
                        <span>
                          {actionTab === 'BLOCK'
                            ? 'Xác Nhận Khóa Sách & Bắn Thông Báo Shop'
                            : actionTab === 'DISMISS'
                            ? 'Bác Bỏ Báo Cáo (Sách Hợp Lệ)'
                            : 'Mở Khóa Lưu Hành Lại Sách'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBookModerationView;
