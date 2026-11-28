"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import {
  moderationApi,
  type ModerationReportItem,
  type ReportStatus,
  type ReportReason,
  type ModerationAction,
} from '../../api/moderationApi';
import { AdminStatusBadge } from './AdminUI';
import GroupedDataTable, { type Column } from '../common/GroupedDataTable';
import {
  DataTableFilterBar,
  type DateFilterValue,
  matchesDateFilter,
  type BulkActionGroup,
} from '../common';

const REASON_LABELS: Record<string, { label: string; color: string }> = {
  LANGUAGE_VIOLATION: { label: 'Vi phạm ngôn từ', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  SPAM: { label: 'Spam / Rác', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  OFFENSIVE: { label: 'Ngôn từ xúc phạm', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  HARASSMENT: { label: 'Quấy rối / Bắt nạt', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  MISINFORMATION: { label: 'Thông tin sai lệch', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  COPYRIGHT: { label: 'Vi phạm bản quyền', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  OTHER: { label: 'Lý do khác', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const ACTION_LABELS: Record<string, string> = {
  HIDE: 'Ẩn đánh giá',
  DELETE: 'Xóa vĩnh viễn',
  WARN: 'Cảnh cáo tác giả',
  BAN: 'Khóa tài khoản',
  NONE: 'Không xử phạt',
};

export function AdminModerationView() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | ReportStatus>('ALL');
  const [selectedReason, setSelectedReason] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ preset: 'ALL' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Multi-select & Expandable Rows state (GroupedDataTable standard)
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([]);
  const [expandedReportIds, setExpandedReportIds] = useState<(string | number)[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Detail / Action Modal State
  const [selectedReport, setSelectedReport] = useState<ModerationReportItem | null>(null);
  const [actionModalType, setActionModalType] = useState<'RESOLVE' | 'DISMISS' | null>(null);
  const [chosenAction, setChosenAction] = useState<ModerationAction>('HIDE');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadReports = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await moderationApi.listReports({
        page: 1,
        limit: 100,
      });

      if (res?.success && res.data) {
        // Tách riêng bình luận/đánh giá khỏi kiểm duyệt sách (sách đã có /admin/book-moderation)
        const onlyReviews = (res.data.data || []).filter((r: ModerationReportItem) => String(r.targetType) !== 'BOOK');
        setReports(onlyReviews);
      } else if (!silent) {
        setReports([]);
      }
    } catch {
      if (!silent) {
        showToast('Không thể tải danh sách báo cáo kiểm duyệt.', 'error');
        setReports([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadReports(false);
    const unsubscribe = realtimeSyncBus.subscribe((event) => {
      if (
        (event.type as string) === 'MODERATION_UPDATED' ||
        event.type === 'NOTIFICATIONS_UPDATED' ||
        event.type === 'ADMIN_NOTIFICATIONS_UPDATED'
      ) {
        void loadReports(true);
      }
    });
    return () => unsubscribe();
  }, [loadReports]);

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (activeTab !== 'ALL' && item.status !== activeTab) return false;
      if (selectedReason === 'LANGUAGE_VIOLATION') {
        if (
          item.reason !== 'LANGUAGE_VIOLATION' &&
          item.reason !== 'OFFENSIVE' &&
          item.violationCategory !== 'LANGUAGE_VIOLATION'
        ) {
          return false;
        }
      } else if (selectedReason !== 'ALL' && item.reason !== selectedReason) {
        return false;
      }
      if (!matchesDateFilter(item.createdAt, dateFilter)) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const rc = item.content || item.targetContent;
      return (
        (item.id || '').toLowerCase().includes(q) ||
        (item.targetId || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.reason || '').toLowerCase().includes(q) ||
        (item.matchedKeywords || []).some((kw) => kw.toLowerCase().includes(q)) ||
        (rc?.title || '').toLowerCase().includes(q) ||
        (rc?.content || '').toLowerCase().includes(q) ||
        (rc?.authorName || '').toLowerCase().includes(q)
      );
    });
  }, [reports, activeTab, selectedReason, dateFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const stats = useMemo(
    () => ({
      total: reports.length,
      pending: reports.filter((r) => r.status === 'PENDING').length,
      reviewing: reports.filter((r) => r.status === 'REVIEWING').length,
      resolved: reports.filter((r) => r.status === 'RESOLVED').length,
      dismissed: reports.filter((r) => r.status === 'DISMISSED').length,
      languageViolations: reports.filter(
        (r) =>
          (r.status === 'PENDING' || r.status === 'REVIEWING') &&
          (r.reason === 'LANGUAGE_VIOLATION' ||
            r.reason === 'OFFENSIVE' ||
            r.violationCategory === 'LANGUAGE_VIOLATION'),
      ).length,
    }),
    [reports],
  );

  const getReasonLabel = (reason: ReportReason | string) => {
    return REASON_LABELS[reason] || REASON_LABELS.OTHER;
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case 'PENDING':
        return <AdminStatusBadge status="PENDING" label="Chờ duyệt" />;
      case 'REVIEWING':
        return <AdminStatusBadge status="ACTIVE" label="Đang kiểm tra" />;
      case 'RESOLVED':
        return <AdminStatusBadge status="COMPLETED" label="Đã xử lý" />;
      case 'DISMISSED':
        return <AdminStatusBadge status="CANCELLED" label="Đã bác bỏ" />;
      default:
        return <AdminStatusBadge status="DEFAULT" label={status} />;
    }
  };

  const handleStartReview = async (reportId: string) => {
    try {
      const res = await moderationApi.startReview(reportId);
      if (res?.success) {
        showToast('Đã tiếp nhận báo cáo vào trạng thái Đang kiểm tra.', 'success');
        loadReports();
      } else {
        showToast((res as { error?: { message?: string } })?.error?.message || 'Không thể cập nhật trạng thái.', 'error');
      }
    } catch {
      showToast('Đã có lỗi xảy ra khi tiếp nhận kiểm duyệt.', 'error');
    }
  };

  const handleExecuteResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;

    setIsSubmittingAction(true);
    try {
      if (actionModalType === 'RESOLVE') {
        const res = await moderationApi.resolveReport(selectedReport.id, {
          status: 'RESOLVED',
          action: chosenAction,
          resolutionNotes: resolutionNotes.trim() || undefined,
        });
        if (res?.success) {
          showToast(`Đã giải quyết báo cáo và áp dụng: ${ACTION_LABELS[chosenAction] || chosenAction}`, 'success');
          setSelectedReport(null);
          setActionModalType(null);
          setResolutionNotes('');
          loadReports();
        } else {
          showToast((res as { error?: { message?: string } })?.error?.message || 'Không thể giải quyết báo cáo.', 'error');
        }
      } else if (actionModalType === 'DISMISS') {
        const res = await moderationApi.resolveReport(selectedReport.id, {
          status: 'DISMISSED',
          resolutionNotes: resolutionNotes.trim() || 'Báo cáo không vi phạm tiêu chuẩn cộng đồng.',
        });
        if (res?.success) {
          showToast('Đã bác bỏ báo cáo hợp lệ. Đánh giá tiếp tục hiển thị công khai.', 'success');
          setSelectedReport(null);
          setActionModalType(null);
          setResolutionNotes('');
          loadReports();
        } else {
          showToast((res as { error?: { message?: string } })?.error?.message || 'Không thể bác bỏ báo cáo.', 'error');
        }
      }
    } catch {
      showToast('Lỗi máy chủ khi xử lý báo cáo kiểm duyệt.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const bulkActionGroups: BulkActionGroup[] = useMemo(
    () => [
      {
        groupLabel: 'Thao tác kiểm duyệt hàng loạt',
        actions: [
          {
            label: 'Tiếp nhận các báo cáo chờ duyệt',
            value: 'START_REVIEW',
            icon: 'visibility',
          },
          {
            label: 'Ẩn các đánh giá vi phạm đã chọn',
            value: 'RESOLVE_HIDE',
            icon: 'visibility_off',
            variant: 'danger',
          },
          {
            label: 'Xóa vĩnh viễn đánh giá đã chọn',
            value: 'RESOLVE_DELETE',
            icon: 'delete_forever',
            variant: 'danger',
          },
          {
            label: 'Bác bỏ các báo cáo đã chọn (Giữ đánh giá)',
            value: 'DISMISS',
            icon: 'cancel',
          },
        ],
      },
    ],
    [],
  );

  const handleBulkAction = async (actionValue: string) => {
    if (selectedReportIds.length === 0) return;
    const selectedItems = reports.filter((r) => selectedReportIds.includes(r.id));
    if (selectedItems.length === 0) return;

    setBulkLoading(true);
    try {
      if (actionValue === 'START_REVIEW') {
        const pendingItems = selectedItems.filter((r) => r.status === 'PENDING');
        if (pendingItems.length === 0) {
          showToast('Không có báo cáo nào ở trạng thái Chờ duyệt trong vùng chọn.', 'info');
          return;
        }
        await Promise.all(pendingItems.map((r) => moderationApi.startReview(r.id)));
        showToast(`Đã tiếp nhận ${pendingItems.length} báo cáo.`, 'success');
      } else {
        const openItems = selectedItems.filter((r) => r.status === 'PENDING' || r.status === 'REVIEWING');
        if (openItems.length === 0) {
          showToast('Các báo cáo được chọn đều đã được xử lý trước đó.', 'info');
          return;
        }
        if (actionValue === 'RESOLVE_HIDE') {
          await Promise.all(
            openItems.map((r) =>
              moderationApi.resolveReport(r.id, {
                status: 'RESOLVED',
                action: 'HIDE',
                resolutionNotes: 'Ẩn hàng loạt do vi phạm tiêu chuẩn cộng đồng HUKI.',
              }),
            ),
          );
          showToast(`Đã ẩn ${openItems.length} đánh giá vi phạm.`, 'success');
        } else if (actionValue === 'RESOLVE_DELETE') {
          await Promise.all(
            openItems.map((r) =>
              moderationApi.resolveReport(r.id, {
                status: 'RESOLVED',
                action: 'DELETE',
                resolutionNotes: 'Xóa hàng loạt do vi phạm nghiêm trọng tiêu chuẩn cộng đồng.',
              }),
            ),
          );
          showToast(`Đã xóa ${openItems.length} đánh giá vi phạm.`, 'success');
        } else if (actionValue === 'DISMISS') {
          await Promise.all(
            openItems.map((r) =>
              moderationApi.resolveReport(r.id, {
                status: 'DISMISSED',
                resolutionNotes: 'Bác bỏ hàng loạt: nội dung không vi phạm tiêu chuẩn.',
              }),
            ),
          );
          showToast(`Đã bác bỏ ${openItems.length} báo cáo. Đánh giá vẫn hiển thị bình thường.`, 'success');
        }
      }
      setSelectedReportIds([]);
      await loadReports();
    } catch {
      showToast('Có lỗi xảy ra khi thực hiện thao tác hàng loạt.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  const columns: Column<ModerationReportItem>[] = useMemo(
    () => [
      {
        key: 'id',
        title: 'Mã Báo Cáo',
        width: 110,
        sortable: true,
        render: (_, item) => (
          <span className="font-mono font-bold text-gray-900 text-xs">
            #{item.id.slice(-6)}
          </span>
        ),
      },
      {
        key: 'targetType',
        title: 'Đối Tượng',
        width: 150,
        render: (_, item) => {
          const rc = item.content || item.targetContent;
          return (
            <div className="space-y-0.5 min-w-0">
              <div className="font-medium text-slate-800 text-xs">
                {item.targetType === 'REVIEW' ? 'Đánh giá sách' : item.targetType}
              </div>
              {rc?.targetId && (
                <a
                  href={`/book/${rc.targetId}#reviews`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[#006953] hover:underline"
                >
                  <span>Xem trang sách</span>
                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </a>
              )}
            </div>
          );
        },
      },
      {
        key: 'content',
        title: 'Nội Dung Bị Báo Cáo',
        minWidth: 260,
        render: (_, item) => {
          const rc = item.content || item.targetContent;
          if (!rc) {
            return (
              <span className="text-slate-400 italic text-xs">
                Nội dung không còn khả dụng.
              </span>
            );
          }
          const rawTitle = (rc.title || '').trim();
          const rawContent = (rc.content || '').trim();
          const showSeparateTitle = Boolean(rawTitle && rawTitle !== rawContent);
          return (
            <div className="space-y-1 max-w-md min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-900 truncate">
                  {rc.authorName || 'Độc giả HUKI'}
                </span>
                {typeof rc.rating === 'number' && (
                  <span className="text-[11px] text-slate-500 font-medium shrink-0">
                    · {rc.rating}/5★
                  </span>
                )}
                {rc.status === 'HIDDEN' && (
                  <span className="text-[10.5px] font-medium text-slate-500 shrink-0">
                    · Đã ẩn
                  </span>
                )}
              </div>
              {showSeparateTitle && (
                <div className="font-medium text-slate-800 text-xs truncate" title={rawTitle}>
                  {rawTitle}
                </div>
              )}
              <p className="text-slate-600 text-xs line-clamp-2 break-words leading-relaxed">
                {rawContent || '(Không có nội dung chữ)'}
              </p>
            </div>
          );
        },
      },
      {
        key: 'reason',
        title: 'Lý Do Báo Cáo',
        minWidth: 190,
        sortable: true,
        render: (_, item) => {
          const reasonInfo = getReasonLabel(item.reason);
          const isAutoFlagged =
            item.detectionSource === 'AUTO_MODERATION' ||
            item.reporterId === 'system:auto-moderation';
          const keywords = Array.isArray(item.matchedKeywords) && item.matchedKeywords.length > 0
            ? item.matchedKeywords.join(', ')
            : '';
          return (
            <div className="space-y-1 max-w-[240px] min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${reasonInfo.color}`}>
                  {reasonInfo.label}
                </span>
                {isAutoFlagged && (
                  <span className="text-[11px] text-slate-500 font-medium">
                    · Tự động
                  </span>
                )}
              </div>
              {keywords ? (
                <div className="text-[11px] text-slate-600 truncate" title={keywords}>
                  Từ khóa: {keywords}
                </div>
              ) : (
                <p className="text-slate-500 text-[11.5px] line-clamp-1 break-words" title={item.description || ''}>
                  {item.description || 'Không có mô tả thêm'}
                </p>
              )}
            </div>
          );
        },
      },
      {
        key: 'createdAt',
        title: 'Thời Gian',
        width: 135,
        sortable: true,
        render: (_, item) => (
          <span className="text-slate-500 whitespace-nowrap text-xs">
            {new Date(item.createdAt).toLocaleDateString('vi-VN', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        ),
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        width: 135,
        sortable: true,
        render: (_, item) => getStatusBadge(item.status),
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        align: 'right',
        width: 185,
        render: (_, item) => (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {item.status === 'PENDING' && (
              <button
                type="button"
                onClick={() => handleStartReview(item.id)}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
                title="Bắt đầu xem xét báo cáo này"
              >
                Tiếp nhận
              </button>
            )}

            {(item.status === 'PENDING' || item.status === 'REVIEWING') && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(item);
                    setActionModalType('RESOLVE');
                    setChosenAction('HIDE');
                    setResolutionNotes('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors cursor-pointer"
                  title="Xử lý nội dung vi phạm"
                >
                  Xử lý
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(item);
                    setActionModalType('DISMISS');
                    setResolutionNotes('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-600 font-medium text-xs border border-slate-200 transition-colors cursor-pointer"
                  title="Bác bỏ báo cáo nếu không vi phạm"
                >
                  Bác bỏ
                </button>
              </>
            )}

            {item.status === 'RESOLVED' && (
              <span className="text-xs text-slate-500 font-medium">
                {ACTION_LABELS[item.actionTaken || ''] || item.actionTaken || 'Đã xử lý'}
              </span>
            )}

            {item.status === 'DISMISSED' && (
              <span className="text-xs text-slate-400">
                Đã bác bỏ
              </span>
            )}
          </div>
        ),
      },
    ],
    [expandedReportIds],
  );

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full overflow-hidden">
      {/* 1. Header & KPI Cards */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-2xl text-rose-600">shield_person</span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Kiểm Duyệt Nội Dung &amp; Báo Cáo Vi Phạm
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Quản lý danh sách khiếu nại đánh giá, xem đầy đủ nội dung qua mũi tên mở rộng và xử lý đơn lẻ hoặc hàng loạt.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadReports(false)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin text-[#006953]' : ''}`}>
              refresh
            </span>
            <span>Làm Mới</span>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 pt-5 text-xs">
          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-gray-500 font-medium block">Tổng Báo Cáo</span>
              <span className="text-2xl font-black text-gray-900 mt-0.5 block">{stats.total}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">flag</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedReason((prev) => (prev === 'LANGUAGE_VIOLATION' ? 'ALL' : 'LANGUAGE_VIOLATION'));
              setCurrentPage(1);
            }}
            className={`p-4 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${selectedReason === 'LANGUAGE_VIOLATION'
              ? 'bg-rose-100/90 border-rose-400 shadow-xs'
              : 'bg-rose-50/80 border-rose-200/80 hover:border-rose-300'
              }`}
            title="Nhấn để lọc nhanh các bình luận vi phạm ngôn từ chờ xử lý"
          >
            <div>
              <span className="text-rose-700 font-bold block">Vi Phạm Ngôn Từ</span>
              <span className="text-2xl font-black text-rose-700 mt-0.5 block">{stats.languageViolations}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">gavel</span>
            </div>
          </button>

          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
            <div>
              <span className="text-amber-700 font-medium block">Chờ Tiếp Nhận</span>
              <span className="text-2xl font-black text-amber-700 mt-0.5 block">{stats.pending}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">pending</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 flex items-center justify-between">
            <div>
              <span className="text-blue-700 font-medium block">Đang Kiểm Tra</span>
              <span className="text-2xl font-black text-blue-700 mt-0.5 block">{stats.reviewing}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">visibility</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
            <div>
              <span className="text-[#006953] font-medium block">Đã Xử Lý</span>
              <span className="text-2xl font-black text-[#006953] mt-0.5 block">{stats.resolved}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#006953] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">task_alt</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Standardized DataTableFilterBar with Bulk Actions, Status Tabs, Date Filter & Reason Filter */}
      <DataTableFilterBar
        className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs"
        searchPlaceholder="Tìm theo ID báo cáo, tác giả, nội dung đánh giá hoặc khiếu nại..."
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        statusFilter={{
          current: activeTab,
          options: [
            { value: 'ALL', label: 'Tất Cả', count: stats.total },
            { value: 'PENDING', label: 'Chờ Duyệt', count: stats.pending },
            { value: 'REVIEWING', label: 'Đang Kiểm Tra', count: stats.reviewing },
            { value: 'RESOLVED', label: 'Đã Giải Quyết', count: stats.resolved },
            { value: 'DISMISSED', label: 'Đã Bác Bỏ', count: stats.dismissed },
          ],
          onChange: (tab) => {
            setActiveTab(tab as 'ALL' | ReportStatus);
            setCurrentPage(1);
          },
        }}
        dateFilter={{
          value: dateFilter,
          onChange: (df) => {
            setDateFilter(df);
            setCurrentPage(1);
          },
        }}
        bulkActions={{
          selectedCount: selectedReportIds.length,
          loading: bulkLoading,
          groups: bulkActionGroups,
          onSelectAction: handleBulkAction,
        }}
        leftCustomActions={
          <select
            value={selectedReason}
            onChange={(e) => {
              setSelectedReason(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 cursor-pointer focus:outline-none focus:border-[#006953]"
          >
            <option value="ALL">Mọi Lý Do</option>
            <option value="LANGUAGE_VIOLATION">Vi Phạm Ngôn Từ (Tự động &amp; Báo cáo)</option>
            <option value="OFFENSIVE">Ngôn Từ Xúc Phạm</option>
            <option value="SPAM">Spam / Rác</option>
            <option value="HARASSMENT">Quấy Rối / Bắt Nạt</option>
            <option value="MISINFORMATION">Thông Tin Sai Lệch</option>
            <option value="COPYRIGHT">Vi Phạm Bản Quyền</option>
            <option value="OTHER">Lý Do Khác</option>
          </select>
        }
      />

      {/* 3. Standardized GroupedDataTable with Select All / Row Checkboxes + Expandable Long-Content Panel */}
      <GroupedDataTable<ModerationReportItem>
        data={paginatedReports}
        columns={columns}
        keyField="id"
        loading={loading}
        selectable={true}
        selectedRowKeys={selectedReportIds}
        onSelectionChange={(keys) => setSelectedReportIds(keys as string[])}
        getCheckboxProps={(row) => ({
          disabled: row.status === 'RESOLVED' || row.status === 'DISMISSED',
        })}
        expandable={true}
        expandedRowKeys={expandedReportIds}
        onExpandedRowsChange={(keys) => setExpandedReportIds(keys)}
        expandedRowRender={(item) => {
          const rc = item.content || item.targetContent;
          const reasonInfo = getReasonLabel(item.reason);
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 text-xs">
              {/* Card 1: Full Review Content (handles unlimited length cleanly) */}
              <div className="lg:col-span-2 p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-2 min-w-0">
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-amber-200/60">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11px] uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[15px] text-amber-600">rate_review</span>
                    <span>Toàn Bộ Nội Dung Đánh Giá Bị Báo Cáo</span>
                  </div>
                  {rc && typeof rc.rating === 'number' && (
                    <span className="font-bold text-amber-700 text-xs shrink-0">★ {rc.rating}/5 sao</span>
                  )}
                </div>

                {rc ? (
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-600">
                      <span>Tác giả đánh giá: <strong className="text-gray-900">{rc.authorName || 'Độc giả HUKI'}</strong></span>
                      <span>
                        Trạng thái hiển thị:{' '}
                        <strong className={rc.status === 'HIDDEN' ? 'text-rose-700' : 'text-[#006953]'}>
                          {rc.status === 'HIDDEN' ? 'Đã bị Admin ẩn' : 'Đang hiển thị công khai'}
                        </strong>
                      </span>
                    </div>
                    {rc.title && (
                      <div className="font-bold text-gray-900 text-xs break-words">
                        {rc.title}
                      </div>
                    )}
                    <div className="bg-white p-3 rounded-lg border border-amber-100 text-gray-800 leading-relaxed whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                      {rc.content || '(Không có nội dung chữ)'}
                    </div>
                    {rc.targetId && (
                      <div className="pt-1">
                        <a
                          href={`/book/${rc.targetId}#reviews`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006953] hover:underline"
                        >
                          <span>Mở trực tiếp trên trang sách để đối chiếu bối cảnh</span>
                          <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">Nội dung đánh giá gốc đã bị xóa hoặc không còn tồn tại.</p>
                )}
              </div>

              {/* Card 2: Full Complaint Description & Moderation Audit Info */}
              <div className="p-3.5 rounded-xl bg-gray-50/90 border border-gray-200/80 space-y-2.5 min-w-0">
                <div className="flex items-center gap-1.5 font-bold text-gray-800 text-[11px] uppercase tracking-wider pb-1.5 border-b border-gray-200/70">
                  <span className="material-symbols-outlined text-[15px] text-rose-600">flag</span>
                  <span>Chi Tiết Khiếu Nại &amp; Hồ Sơ Duyệt</span>
                </div>

                <div className="space-y-1.5 text-[11.5px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">Lý do:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${reasonInfo.color}`}>
                      {reasonInfo.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">Mã báo cáo:</span>
                    <span className="font-mono text-gray-800 text-[10.5px] break-all">{item.id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-gray-500">Gửi lúc:</span>
                    <span className="font-mono text-gray-700 text-[10.5px]">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10.5px] font-semibold text-gray-500 block">Toàn bộ mô tả từ người báo cáo:</span>
                  <div className="bg-white p-2.5 rounded-lg border border-gray-200/80 text-gray-700 italic whitespace-pre-wrap break-words max-h-36 overflow-y-auto leading-relaxed">
                    {item.description || 'Không có mô tả chi tiết từ người báo cáo.'}
                  </div>
                </div>

                {item.resolutionNotes && (
                  <div className="space-y-1 pt-1 border-t border-gray-200/60">
                    <span className="text-[10.5px] font-semibold text-gray-500 block">Ghi chú quyết định của Admin:</span>
                    <div className="bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/60 text-emerald-900 whitespace-pre-wrap break-words">
                      {item.resolutionNotes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        }}
        emptyIcon="verified_user"
        emptyTitle="Không có báo cáo nào"
        emptyMessage={
          searchQuery || selectedReason !== 'ALL' || activeTab !== 'ALL'
            ? 'Không tìm thấy báo cáo nào khớp với bộ lọc hiện tại.'
            : 'Tuyệt vời! Hiện tại không có nội dung nào bị khiếu nại hoặc gắn cờ vi phạm.'
        }
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredReports.length,
          pageSize,
          itemLabel: 'báo cáo',
          onPageChange: setCurrentPage,
        }}
      />

      {/* 4. Action Resolution Modal */}
      {selectedReport && actionModalType && (
        <div
          onClick={() => {
            setSelectedReport(null);
            setActionModalType(null);
          }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className={`material-symbols-outlined text-lg ${actionModalType === 'RESOLVE' ? 'text-rose-600' : 'text-gray-600'}`}>
                  {actionModalType === 'RESOLVE' ? 'gavel' : 'cancel'}
                </span>
                <h3 className="font-bold text-sm text-gray-900">
                  {actionModalType === 'RESOLVE' ? 'Xử Lý Vi Phạm Nội Dung' : 'Bác Bỏ Báo Cáo Khiếu Nại'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedReport(null);
                  setActionModalType(null);
                }}
                className="w-7 h-7 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleExecuteResolution} className="space-y-3.5 text-xs">
              {(selectedReport.content || selectedReport.targetContent) && (() => {
                const rc = selectedReport.content || selectedReport.targetContent!;
                return (
                  <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-bold text-amber-900">
                        Nội dung đánh giá bị báo cáo — {rc.authorName || 'Độc giả HUKI'}
                      </span>
                      {typeof rc.rating === 'number' && (
                        <span className="font-bold text-amber-700">★ {rc.rating}/5</span>
                      )}
                    </div>
                    {rc.title && <div className="font-bold text-gray-900 text-xs break-words">{rc.title}</div>}
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                      {rc.content || '(Không có nội dung chữ)'}
                    </p>
                    {rc.targetId && (
                      <a
                        href={`/book/${rc.targetId}#reviews`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#006953] hover:underline pt-0.5"
                      >
                        <span>Mở đánh giá trên trang sách</span>
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                      </a>
                    )}
                  </div>
                );
              })()}

              <div className="p-3 bg-gray-50 rounded-xl space-y-1 border border-gray-100">
                <div className="text-gray-500">Mã Báo Cáo: <strong className="text-gray-800 font-mono">#{selectedReport.id}</strong></div>
                <div className="text-gray-500">Lý do khiếu nại: <strong className="text-rose-700">{selectedReport.reason}</strong></div>
                {selectedReport.description && (
                  <p className="text-gray-700 italic pt-1 border-t border-gray-200/60 mt-1 whitespace-pre-wrap break-words max-h-24 overflow-y-auto">
                    Mô tả người báo cáo: &quot;{selectedReport.description}&quot;
                  </p>
                )}
              </div>

              {actionModalType === 'RESOLVE' ? (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Hành động chế tài áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={chosenAction}
                    onChange={(e) => setChosenAction(e.target.value as ModerationAction)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 focus:outline-none focus:border-[#006953] cursor-pointer"
                  >
                    <option value="HIDE">ẨN NỘI DUNG (Chỉ hiển thị với tác giả &amp; Admin)</option>
                    <option value="DELETE">XÓA VĨNH VIỄN (Xóa nội dung khỏi hệ thống)</option>
                    <option value="WARN">CẢNH CÁO TÁC GIẢ (Gửi thông báo vi phạm POL-13)</option>
                    <option value="BAN">KHÓA TÀI KHOẢN (Đóng băng quyền đánh giá)</option>
                    <option value="NONE">KHÔNG ÁP DỤNG HÌNH PHẠT (Chỉ đóng báo cáo)</option>
                  </select>
                </div>
              ) : (
                <p className="text-gray-600 leading-relaxed">
                  Bác bỏ báo cáo này nếu nội dung không vi phạm tiêu chuẩn cộng đồng. Đánh giá gốc sẽ tiếp tục hiển thị công khai bình thường.
                </p>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Ghi chú xử lý / Lý do quyết định <span className="text-gray-400 font-normal">(tùy chọn)</span>
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder={
                    actionModalType === 'RESOLVE'
                      ? 'Nhập lý do áp dụng chế tài để lưu hồ sơ kiểm duyệt...'
                      : 'Lý do bác bỏ báo cáo khiếu nại...'
                  }
                  rows={3}
                  className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#006953] resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedReport(null);
                    setActionModalType(null);
                  }}
                  disabled={isSubmittingAction}
                  className="px-3.5 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className={`px-4 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${actionModalType === 'RESOLVE'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-gray-800 hover:bg-black'
                    }`}
                >
                  {isSubmittingAction && <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>}
                  <span>{actionModalType === 'RESOLVE' ? 'Xác Nhận Xử Lý' : 'Xác Nhận Bác Bỏ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
