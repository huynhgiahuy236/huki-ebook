"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useToast } from '../../context/ToastContext';
import { realtimeSyncBus, playRoleNotificationChime } from '../../services/realtimeSyncBus';
import {
  bookModerationService,
  ReportedBook,
  BookReportReason,
  BOOK_REPORT_REASON_LABELS,
  BookModerationStatus,
} from '../../services/bookModerationService';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';
import DataTableFilterBar, { BulkActionGroup } from '../common/DataTableFilterBar';

export function AdminBookModerationView() {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  const [reportedBooks, setReportedBooks] = useState<ReportedBook[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, blocked: 0, dismissed: 0 });

  // Selectable State (Grouped Data Standard)
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);

  // Detail & Action Modal State
  const [activeBook, setActiveBook] = useState<ReportedBook | null>(null);
  const [actionTab, setActionTab] = useState<'BLOCK' | 'DISMISS' | 'UNBLOCK'>('BLOCK');
  const [blockReason, setBlockReason] = useState<BookReportReason>('COPYRIGHT');
  const [adminNote, setAdminNote] = useState('');
  const [notifySeller, setNotifySeller] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Load Data
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      bookModerationService.invalidateCache();
      const statusFilter =
        activeTab === 'PENDING'
          ? 'PENDING_REVIEW'
          : activeTab === 'BLOCKED'
          ? 'BLOCKED'
          : activeTab === 'DISMISSED'
          ? 'DISMISSED'
          : 'all';

      const res = await bookModerationService.getReportedBooks({
        status: statusFilter,
        reason: selectedReason,
        searchQuery,
      });
      setReportedBooks(res.items);
      setStats(res.stats);
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
  }, [activeTab, selectedReason, searchQuery, showToast]);

  // Realtime Listeners (SyncBus + Cross-tab Storage Events + 2.5s Polling Fallback)
  useEffect(() => {
    void loadData(false);

    // 1. RealtimeSyncBus subscription
    const unsubscribe = realtimeSyncBus.subscribe((event) => {
      if (
        event.type === 'BOOK_REPORTED' ||
        event.type === 'BOOK_MODERATED' ||
        event.type === 'BOOK_REVIEWED' ||
        event.type === 'ADMIN_NOTIFICATIONS_UPDATED'
      ) {
        bookModerationService.invalidateCache();
        void loadData(true);
        if (event.type === 'BOOK_REPORTED') {
          playRoleNotificationChime('ADMIN');
          showToast({
            title: 'Báo cáo vi phạm mới',
            message: `Độc giả vừa báo cáo tác phẩm: ${(event.payload as any)?.bookTitle || 'Sách'}`,
            type: 'warning',
          });
        }
        if (event.type === 'BOOK_REVIEWED') {
          playRoleNotificationChime('ADMIN');
          showToast({
            title: 'Đánh giá tác phẩm mới',
            message: `Độc giả vừa gửi đánh giá cho tác phẩm: ${(event.payload as any)?.bookTitle || 'Sách'}`,
            type: 'info',
          });
        }
      }
    });

    // 2. Native window storage listener for cross-tab persistence
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'huki_reported_books_v1' || e.key === 'huki_latest_book_moderation_event') {
        bookModerationService.invalidateCache();
        void loadData(true);
      }
    };
    window.addEventListener('storage', handleStorage);

    // 3. Custom DOM event listeners
    const handleCustomReport = () => {
      bookModerationService.invalidateCache();
      void loadData(true);
    };
    window.addEventListener('huki_book_reported', handleCustomReport);
    window.addEventListener('huki_book_moderated', handleCustomReport);

    // 4. Polling fallback (2.5s) to guarantee instant update even across isolated browsing contexts
    const pollInterval = setInterval(() => {
      void loadData(true);
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('huki_book_reported', handleCustomReport);
      window.removeEventListener('huki_book_moderated', handleCustomReport);
    };
  }, [loadData, showToast]);

  // Open modal
  const handleOpenModal = useCallback((book: ReportedBook) => {
    setActiveBook(book);
    setActionTab(book.status === 'BLOCKED' ? 'UNBLOCK' : 'BLOCK');
    setBlockReason(book.reasons[0]?.reason || 'COPYRIGHT');
    setAdminNote('');
    setNotifySeller(true);
  }, []);

  // Execute Action (Fix Point 4: Close modal cleanly)
  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBook) return;

    setIsSubmittingAction(true);
    try {
      const reasonLabel = BOOK_REPORT_REASON_LABELS[blockReason]?.label || 'Vi phạm chính sách';
      const bookTitle = activeBook.title;
      const currentAction = actionTab;

      await bookModerationService.moderateBook({
        bookId: activeBook.bookId,
        action: actionTab,
        reasonText: actionTab === 'BLOCK' ? reasonLabel : undefined,
        note: adminNote.trim(),
        adminName: 'Huki Super Admin',
        notifySeller,
      });

      // Đóng modal ngay lập tức
      setActiveBook(null);
      setAdminNote('');

      showToast({
        title: currentAction === 'BLOCK' ? 'Đã khóa sách vi phạm' : currentAction === 'DISMISS' ? 'Đã bác bỏ báo cáo' : 'Đã mở khóa sách',
        message: currentAction === 'BLOCK'
          ? `Tác phẩm "${bookTitle}" đã bị khóa và phát thông báo kỷ luật về Shop.`
          : currentAction === 'DISMISS'
          ? `Đã xác nhận tác phẩm "${bookTitle}" hợp lệ, bác bỏ các phản ánh.`
          : `Đã mở khóa và khôi phục lưu hành tác phẩm "${bookTitle}".`,
        type: currentAction === 'BLOCK' ? 'warning' : 'success',
      });

      void loadData(true);
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

  // Bulk Actions Handler
  const handleExecuteBulkAction = async (actionValue: string) => {
    if (selectedBookIds.length === 0) return;

    const action = actionValue as 'BLOCK' | 'DISMISS' | 'UNBLOCK';
    try {
      await bookModerationService.moderateBooksBulk(
        selectedBookIds,
        action,
        `Thao tác hàng loạt bởi Quản Trị Viên`
      );
      showToast({
        title: 'Thao tác hàng loạt thành công',
        message: `Đã áp dụng hành động cho ${selectedBookIds.length} tác phẩm được chọn.`,
        type: 'success',
      });
      setSelectedBookIds([]);
      void loadData(true);
    } catch (e: any) {
      showToast({
        title: 'Lỗi thực thi',
        message: e?.message || 'Không thể thực thi thao tác hàng loạt.',
        type: 'error',
      });
    }
  };

  const bulkActionGroups: BulkActionGroup[] = useMemo(() => {
    if (selectedBookIds.length === 0) return [];
    return [
      {
        label: 'Thao tác kiểm duyệt',
        actions: [
          {
            label: `Khóa ${selectedBookIds.length} sách đã chọn`,
            value: 'BLOCK',
            icon: 'lock',
            variant: 'danger',
          },
          {
            label: `Bác bỏ báo cáo (${selectedBookIds.length})`,
            value: 'DISMISS',
            icon: 'verified',
            variant: 'secondary',
          },
          {
            label: `Mở khóa lại (${selectedBookIds.length})`,
            value: 'UNBLOCK',
            icon: 'lock_open',
            variant: 'secondary',
          },
        ],
      },
    ];
  }, [selectedBookIds.length]);

  // Columns Definition matching Standard Enterprise Design
  const columns: Column<ReportedBook>[] = useMemo(
    () => [
      {
        key: 'bookInfo',
        title: 'Tác Phẩm Bị Báo Cáo',
        minWidth: 260,
        render: (_, row) => (
          <div className="flex items-center gap-3 py-1">
            <img
              src={row.cover}
              alt={row.title}
              className="w-10 h-13 object-cover rounded-lg shadow-2xs shrink-0 border border-slate-200"
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <h4 className="font-bold text-xs text-theme-text line-clamp-1 leading-snug">
                {row.title}
              </h4>
              <p className="text-[11px] text-theme-text-muted truncate">
                {row.author || 'Tác giả'}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: 'sellerInfo',
        title: 'Gian Hàng',
        width: 200,
        render: (_, row) => (
          <div className="py-1 text-xs font-medium text-theme-text truncate">
            {row.sellerName}
          </div>
        ),
      },
      {
        key: 'reportsCount',
        title: 'Lượt Báo Cáo',
        align: 'center',
        width: 130,
        render: (_, row) => (
          <div className="flex justify-center">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {row.totalReports} phản ánh
            </span>
          </div>
        ),
      },
      {
        key: 'prominentReason',
        title: 'Lý Do Phổ Biến',
        width: 180,
        render: (_, row) => {
          const topReason = row.reasons[0]?.reason || 'OTHER';
          const meta = BOOK_REPORT_REASON_LABELS[topReason] || BOOK_REPORT_REASON_LABELS.OTHER;
          return (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${meta.color}`}>
              {meta.label}
            </span>
          );
        },
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        align: 'center',
        width: 140,
        render: (_, row) => (
          <div className="flex justify-center">
            {row.status === 'BLOCKED' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span>Đã khóa</span>
              </span>
            ) : row.status === 'DISMISSED' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>Đã bác bỏ</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                <span>Chờ xử lý</span>
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        align: 'center',
        width: 110,
        render: (_, row) => (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(row);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold transition-all shadow-2xs inline-flex items-center gap-1 cursor-pointer active:scale-95"
            >
              <span>Xử lý</span>
            </button>
          </div>
        ),
      },
    ],
    [handleOpenModal]
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. Tiêu Đề Trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-theme-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-theme-text tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-rose-600 rounded-full inline-block"></span>
            <span>Hậu Kiểm &amp; Xử Lý Sách Vi Phạm (Community Reports)</span>
          </h1>
          <p className="text-xs text-theme-text-muted mt-1">
            Mô hình xuất bản tự do: Người bán tự do phát hành, hệ thống thẩm định và xử phạt theo báo cáo vi phạm thực tế từ bạn đọc.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/notifications"
            className="px-4 py-2 rounded-xl bg-theme-surface-subtle hover:bg-slate-100 border border-theme-border text-xs font-bold text-theme-text inline-flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">campaign</span>
            <span>Phát Sóng Thông Báo</span>
          </Link>
        </div>
      </div>

      {/* 2. Thẻ Thống Kê Tổng Quan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/90 dark:border-neutral-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-1">
            <span>Tổng Báo Cáo</span>
            <span className="material-symbols-outlined text-[17px] text-slate-400">inventory_2</span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
            {stats.total}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/90 dark:border-neutral-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 text-xs font-semibold mb-1">
            <span>Chờ Thẩm Tra</span>
            <span className="material-symbols-outlined text-[17px] text-amber-500">pending_actions</span>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {stats.pending}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/90 dark:border-neutral-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 text-xs font-semibold mb-1">
            <span>Đã Khóa / Chặn</span>
            <span className="material-symbols-outlined text-[17px] text-rose-500">block</span>
          </div>
          <div className="text-2xl font-black text-rose-700 font-mono">
            {stats.blocked}
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/90 dark:border-neutral-800 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 text-xs font-semibold mb-1">
            <span>Đã Bác Bỏ (An Toàn)</span>
            <span className="material-symbols-outlined text-[17px] text-emerald-500">verified</span>
          </div>
          <div className="text-2xl font-black text-emerald-700 font-mono">
            {stats.dismissed}
          </div>
        </div>
      </div>

      {/* 3. Thanh Bộ Lọc & Tìm Kiếm Chuẩn DataTableFilterBar */}
      <DataTableFilterBar
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
        searchPlaceholder="Tìm theo tên tác phẩm, tác giả, gian hàng, ISBN..."
        searchQuery={searchQuery}
        onSearchChange={(val) => setSearchQuery(val)}
        tabs={[
          { key: 'ALL', label: 'Tất Cả', count: stats.total },
          { key: 'PENDING', label: 'Chờ Thẩm Tra', count: stats.pending },
          { key: 'BLOCKED', label: 'Đã Khóa / Chặn', count: stats.blocked },
          { key: 'DISMISSED', label: 'Đã Bác Bỏ', count: stats.dismissed },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        bulkActionGroups={bulkActionGroups}
        onExecuteBulkAction={handleExecuteBulkAction}
      />

      {/* 4. Bảng Dữ Liệu GroupedDataTable Chuẩn HuKi */}
      <GroupedDataTable
        columns={columns}
        data={reportedBooks}
        keyField="bookId"
        selectable={true}
        selectedRowKeys={selectedBookIds}
        onSelectionChange={(keys) => setSelectedBookIds(keys as string[])}
        expandable={false}
        onRowClick={(row) => handleOpenModal(row)}
        loading={isLoading}
        onRetry={() => loadData(false)}
        emptyTitle="Hàng đợi kiểm duyệt trống"
        emptyMessage={
          searchQuery
            ? `Không tìm thấy tác phẩm khớp với từ khóa "${searchQuery}"`
            : 'Hiện tại chưa có tác phẩm nào bị độc giả báo cáo vi phạm.'
        }
        emptyIcon="verified"
        pagination={true}
        tableClassName="w-full min-w-[750px]"
      />

      {/* 5. Modal Hồ Sơ Thẩm Tra & Xử Lý Vi Phạm */}
      {activeBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3.5 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-[24px]">gavel</span>
                  <h2 className="text-xl font-black text-slate-900 leading-tight">
                    Hồ Sơ Thẩm Tra &amp; Xử Lý Vi Phạm Tác Phẩm
                  </h2>
                </div>
                <p className="text-xs text-slate-500">
                  Xem xét phản ánh từ độc giả và đưa ra quyết định chế tài, khóa tác phẩm hoặc gửi cảnh cáo vi phạm tới Shop.
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

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1.5 text-xs">
              {/* Sách & Gian hàng card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3.5 min-w-0">
                  <img
                    src={activeBook.cover}
                    alt={activeBook.title}
                    className="w-12 h-16 object-cover rounded-xl shadow-xs shrink-0 border border-slate-200"
                  />
                  <div className="min-w-0 space-y-0.5">
                    <h3 className="font-bold text-sm text-slate-900 truncate">{activeBook.title}</h3>
                    <div className="flex flex-wrap gap-2 text-slate-500 text-xs">
                      <span>Tác giả: <strong>{activeBook.author}</strong></span>
                      <span>•</span>
                      <span>ISBN: <strong className="font-mono">{activeBook.isbn}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="text-[#00875A] font-bold">Gian hàng: {activeBook.sellerName}</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-700 font-semibold">{activeBook.price.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <Link
                    href={`/book/${activeBook.bookId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold shadow-2xs hover:bg-slate-100 transition-colors"
                  >
                    <span>Mở trang sách</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </Link>
                </div>
              </div>

              {/* Danh sách các báo cáo từ độc giả */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-rose-600 text-[18px]">feedback</span>
                  <span>Danh Sách Phản Ánh Từ Độc Giả ({activeBook.reports.length})</span>
                </h4>

                <div className="space-y-2">
                  {activeBook.reports.map((r, idx) => {
                    const rMeta = BOOK_REPORT_REASON_LABELS[r.reason] || BOOK_REPORT_REASON_LABELS.OTHER;
                    return (
                      <div
                        key={r.id || idx}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900">{r.reporterName}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${rMeta.color}`}>
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
                          <div className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline">
                            <span className="material-symbols-outlined text-[13px]">link</span>
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
                  <label className="block font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Quyết Định Xử Lý Của Ban Quản Trị *
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setActionTab('BLOCK')}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                        actionTab === 'BLOCK'
                          ? 'border-rose-600 bg-rose-50 text-rose-800 shadow-2xs ring-2 ring-rose-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[17px]">lock</span>
                        <span>Khóa Sách &amp; Xử Phạt</span>
                      </div>
                      <span className="text-[11px] text-slate-500 leading-snug">Gỡ sách khỏi sàn, gửi cảnh cáo Shop</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionTab('DISMISS')}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                        actionTab === 'DISMISS'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-2xs ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[17px]">verified</span>
                        <span>Bác Bỏ (Sách Hợp Lệ)</span>
                      </div>
                      <span className="text-[11px] text-slate-500 leading-snug">Xác minh an toàn, giữ lưu hành</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActionTab('UNBLOCK')}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex flex-col gap-1 ${
                        actionTab === 'UNBLOCK'
                          ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-2xs ring-2 ring-blue-500/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span className="material-symbols-outlined text-[17px]">lock_open</span>
                        <span>Mở Khóa Lại Sách</span>
                      </div>
                      <span className="text-[11px] text-slate-500 leading-snug">Khôi phục sau khi Shop giải trình</span>
                    </button>
                  </div>
                </div>

                {/* Sub Options when BLOCK */}
                {actionTab === 'BLOCK' && (
                  <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/90 space-y-3">
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
                            className="w-4 h-4 rounded text-rose-600 cursor-pointer"
                          />
                          <span>Tự động gửi cảnh cáo vi phạm đến Shop qua Chuông &amp; Dashboard</span>
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
                  <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/90 space-y-2">
                    <label className="block font-bold text-slate-700">
                      Ghi Chú Xác Minh Nội Bộ (Không bắt buộc)
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={2}
                      placeholder="Ví dụ: Đã kiểm tra số ISBN và giấy phép đối chiếu hợp lệ. Bác bỏ các phản ánh sai lệch..."
                      className="w-full p-3 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-emerald-600 leading-relaxed"
                    />
                  </div>
                )}

                {/* Sub Options when UNBLOCK */}
                {actionTab === 'UNBLOCK' && (
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/90 space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={notifySeller}
                        onChange={(e) => setNotifySeller(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                      />
                      <span>Gửi thông báo mở khóa thành công cho gian hàng</span>
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
                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBook(null);
                      setAdminNote('');
                    }}
                    disabled={isSubmittingAction}
                    className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer text-xs"
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
