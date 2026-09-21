"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppealDecision,
  SanctionAppeal,
  SanctionLevel,
  sanctionsApi,
} from '@/ui/api/sanctionsApi';
import { useToast } from '@/ui/context/ToastContext';

export function AdminAppealsView() {
  const { showToast } = useToast();

  const [appeals, setAppeals] = useState<SanctionAppeal[]>([]);
  const [totalAppeals, setTotalAppeals] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filterDecision, setFilterDecision] = useState<AppealDecision | 'ALL'>('PENDING');
  const [searchStoreId, setSearchStoreId] = useState('');
  const [loading, setLoading] = useState(true);

  // Review Modal State
  const [selectedAppeal, setSelectedAppeal] = useState<SanctionAppeal | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Fetch appeals queue from API
  const fetchAppeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sanctionsApi.getAppeals({
        page,
        limit,
        decision: filterDecision === 'ALL' ? undefined : filterDecision,
        storeId: searchStoreId.trim() || undefined,
      });

      if (res.success && res.data) {
        setAppeals(res.data.items);
        setTotalAppeals(res.data.total);
      } else {
        showToast?.(res.error?.message || 'Không thể tải hàng đợi kháng nghị', 'error');
      }
    } catch (err: any) {
      showToast?.(err.message || 'Lỗi kết nối máy chủ', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, filterDecision, searchStoreId, showToast]);

  useEffect(() => {
    fetchAppeals();
  }, [fetchAppeals]);

  // SLA Calculation helper: 48 Hours Target
  const getSlaStatus = (submittedAt: string, decision: AppealDecision) => {
    if (decision !== 'PENDING') {
      return { isPending: false, label: 'Đã hoàn tất', isOverdue: false };
    }

    const submittedTime = new Date(submittedAt).getTime();
    const now = Date.now();
    const elapsedHours = (now - submittedTime) / (1000 * 60 * 60);
    const remainingHours = Math.max(0, Math.floor(48 - elapsedHours));

    if (elapsedHours > 48) {
      const overdueHours = Math.floor(elapsedHours - 48);
      return {
        isPending: true,
        label: `Quá hạn 48h SLA (+${overdueHours}h)`,
        isOverdue: true,
      };
    }

    return {
      isPending: true,
      label: `Còn ${remainingHours}h (SLA 48h)`,
      isOverdue: false,
    };
  };

  const handleOpenReview = (appeal: SanctionAppeal) => {
    setSelectedAppeal(appeal);
    setSelectedDecision('APPROVED');
    setReviewNote('');
  };

  const handleCloseReview = () => {
    setSelectedAppeal(null);
    setReviewNote('');
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppeal) return;

    setSubmittingReview(true);
    try {
      const res = await sanctionsApi.reviewAppeal(selectedAppeal.id, {
        decision: selectedDecision,
        decisionReason: reviewNote.trim() || undefined,
      });

      if (res.success) {
        showToast?.(
          `Đã ghi nhận quyết định [${selectedDecision === 'APPROVED' ? 'Chấp thuận - Gỡ phạt' : 'Bác bỏ - Giữ phạt'}] thành công`,
          'success',
        );
        handleCloseReview();
        fetchAppeals();
      } else {
        showToast?.(res.error?.message || 'Không thể xử lý kháng nghị', 'error');
      }
    } catch (err: any) {
      showToast?.(err.message || 'Lỗi gửi quyết định xem xét', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Metrics summary
  const pendingCount = useMemo(() => {
    return appeals.filter((a) => a.decision === 'PENDING').length;
  }, [appeals]);

  const overdueCount = useMemo(() => {
    return appeals.filter((a) => a.decision === 'PENDING' && getSlaStatus(a.submittedAt, a.decision).isOverdue).length;
  }, [appeals]);

  const renderLevelBadge = (level?: SanctionLevel) => {
    switch (level) {
      case 'WARNING':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 text-amber-800 border border-amber-200">CẢNH BÁO</span>;
      case 'PROBATION':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-100 text-orange-800 border border-orange-200">QUẢN CHẾ</span>;
      case 'SUSPENSION':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-100 text-rose-800 border border-rose-200">ĐÌNH CHỈ</span>;
      case 'BAN':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-200 text-red-900 border border-red-300">CẤM BÁN</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-zinc-100">XỬ PHẠT</span>;
    }
  };

  const renderDecisionBadge = (decision: AppealDecision) => {
    switch (decision) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse"></span>
            Chờ xem xét
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Đã chấp thuận (Gỡ phạt)
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
            Bác bỏ (Giữ phạt)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Hàng Đợi Xử Lý Kháng Nghị Xử Phạt
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Xem xét và thẩm định hồ sơ khiếu nại của người bán đối với các quyết định xử phạt vi phạm chính sách sàn (SLA 48 giờ).
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs font-medium text-zinc-500">Kháng nghị chờ xử lý</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{pendingCount}</div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs font-medium text-zinc-500">Cảnh báo quá hạn SLA (48h)</div>
          <div className={`text-2xl font-bold mt-1 ${overdueCount > 0 ? 'text-rose-600 animate-pulse' : 'text-zinc-700 dark:text-zinc-300'}`}>
            {overdueCount}
          </div>
        </div>
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-xs font-medium text-zinc-500">Tổng số hồ sơ tiếp nhận</div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1">{totalAppeals}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['PENDING', 'ALL', 'APPROVED', 'REJECTED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setFilterDecision(tab);
                setPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filterDecision === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {tab === 'PENDING' && 'Chờ duyệt'}
              {tab === 'ALL' && 'Tất cả'}
              {tab === 'APPROVED' && 'Đã chấp thuận'}
              {tab === 'REJECTED' && 'Đã bác bỏ'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchStoreId}
            onChange={(e) => setSearchStoreId(e.target.value)}
            placeholder="Lọc theo Store ID..."
            className="text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
          />
          {searchStoreId && (
            <button
              onClick={() => setSearchStoreId('')}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Xóa
            </button>
          )}
        </div>
      </div>

      {/* Appeals Queue Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-zinc-500 text-sm">Đang tải hàng đợi kháng nghị...</div>
        ) : appeals.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mx-auto flex items-center justify-center mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">Hàng đợi trống</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Không có hồ sơ kháng nghị nào trong trạng thái đã chọn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs uppercase text-zinc-500 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="px-5 py-3">Store ID</th>
                  <th className="px-5 py-3">Mức độ phạt</th>
                  <th className="px-5 py-3">Lý do xử phạt & Kháng nghị</th>
                  <th className="px-5 py-3">Bằng chứng</th>
                  <th className="px-5 py-3">Thời gian nộp</th>
                  <th className="px-5 py-3">SLA 48h</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {appeals.map((a) => {
                  const sla = getSlaStatus(a.submittedAt, a.decision);
                  const attachments = a.evidence?.attachments || [];
                  const urls = a.evidence?.urls || [];
                  const totalProofCount = attachments.length + urls.length;

                  return (
                    <tr key={a.id} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {a.storeId.substring(0, 12)}...
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {renderLevelBadge(a.sanction?.level)}
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <div className="text-xs text-zinc-500">
                          <span className="font-semibold">Phạt:</span> {a.sanction?.reason || '—'}
                        </div>
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 mt-1 line-clamp-2">
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">Kháng nghị:</span> {a.reason}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        {totalProofCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium">
                            📎 {totalProofCount} tệp/link
                          </span>
                        ) : (
                          <span className="text-zinc-400 italic">Không có</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-zinc-600 dark:text-zinc-400 text-xs">
                        {new Date(a.submittedAt).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs">
                        {sla.isPending ? (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-semibold ${
                            sla.isOverdue
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                          }`}>
                            {sla.label}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {renderDecisionBadge(a.decision)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs">
                        {a.decision === 'PENDING' ? (
                          <button
                            onClick={() => handleOpenReview(a)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                          >
                            Thẩm định
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReview(a)}
                            className="text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium"
                          >
                            Xem lại
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Thẩm Định Hồ Sơ Kháng Nghị Xử Phạt
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Mã hồ sơ: {selectedAppeal.id} · Cửa hàng: {selectedAppeal.storeId}
                </p>
              </div>
              <button
                onClick={handleCloseReview}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Comparison Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Sanction Facts */}
                <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center justify-between">
                    <span>Quyết định xử phạt</span>
                    {renderLevelBadge(selectedAppeal.sanction?.level)}
                  </div>
                  <div className="text-zinc-700 dark:text-zinc-300">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">Lý do phạt:</span> {selectedAppeal.sanction?.reason}
                  </div>
                  {selectedAppeal.sanction?.violationCode && (
                    <div className="text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">Mã vi phạm:</span> {selectedAppeal.sanction.violationCode}
                    </div>
                  )}
                  <div className="text-zinc-500 pt-1">
                    Ban hành: {selectedAppeal.sanction?.issuedAt ? new Date(selectedAppeal.sanction.issuedAt).toLocaleDateString('vi-VN') : '—'}
                  </div>
                </div>

                {/* Seller Argument */}
                <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-indigo-900 dark:text-indigo-200">
                    Lý do giải trình của người bán
                  </div>
                  <div className="text-zinc-800 dark:text-zinc-200 leading-relaxed italic">
                    "{selectedAppeal.reason}"
                  </div>
                  <div className="text-zinc-500 pt-1">
                    Thời gian nộp: {new Date(selectedAppeal.submittedAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* Evidence Section */}
              <div className="space-y-2 p-3.5 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Tài liệu & Chứng cứ người bán đính kèm:
                </div>
                
                {/* Uploaded Attachments */}
                {(selectedAppeal.evidence?.attachments || []).length > 0 && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[11px] font-semibold text-zinc-500">Tệp lưu trữ R2:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedAppeal.evidence!.attachments!.map((att, idx) => (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium"
                        >
                          <span>📄 {att.filename}</span>
                          <span className="text-[10px] text-zinc-400">({Math.round((att.size || 0) / 1024)}KB)</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Supplementary URLs */}
                {(selectedAppeal.evidence?.urls || []).length > 0 && (
                  <div className="space-y-1 pt-2">
                    <div className="text-[11px] font-semibold text-zinc-500">Liên kết ngoài:</div>
                    <ul className="space-y-1 text-xs">
                      {selectedAppeal.evidence!.urls!.map((url, idx) => (
                        <li key={idx}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:underline font-mono text-[11px] truncate block max-w-full"
                          >
                            🔗 {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(!selectedAppeal.evidence?.attachments || selectedAppeal.evidence.attachments.length === 0) &&
                  (!selectedAppeal.evidence?.urls || selectedAppeal.evidence.urls.length === 0) && (
                    <div className="text-xs text-zinc-400 italic">Người bán không đính kèm tệp bằng chứng.</div>
                  )}
              </div>

              {/* Decision Choice */}
              {selectedAppeal.decision === 'PENDING' ? (
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    Phán quyết của quản trị viên <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedDecision('APPROVED')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        selectedDecision === 'APPROVED'
                          ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 ring-2 ring-emerald-500 font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                        <span>✓</span> CHẤP THUẬN (LIFTED)
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        Gỡ bỏ quyết định xử phạt, khôi phục toàn bộ quyền kinh doanh của cửa hàng.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedDecision('REJECTED')}
                      className={`p-3 rounded-xl border text-left text-xs transition-all ${
                        selectedDecision === 'REJECTED'
                          ? 'border-rose-500 bg-rose-50/70 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 ring-2 ring-rose-500 font-semibold'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1 text-rose-700 dark:text-rose-400">
                        <span>✕</span> BÁC BỎ (UPHELD)
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">
                        Bác kháng nghị, giữ nguyên mức xử phạt và các giới hạn đối với cửa hàng.
                      </div>
                    </button>
                  </div>

                  {/* Internal Review Note */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Ghi chú thẩm định nội bộ
                    </label>
                    <textarea
                      rows={3}
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Nhập căn cứ thẩm định hoặc ghi chú lý do đưa ra phán quyết..."
                      className="w-full text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-3 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl space-y-1 text-xs">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Hồ sơ đã được thẩm định với kết quả: {renderDecisionBadge(selectedAppeal.decision)}
                  </div>
                  {selectedAppeal.decisionReason && (
                    <div className="text-zinc-600 dark:text-zinc-400">
                      <span className="font-medium">Ghi chú:</span> {selectedAppeal.decisionReason}
                    </div>
                  )}
                  <div className="text-zinc-500 text-[11px]">
                    Thực hiện bởi {selectedAppeal.reviewedBy || 'Admin'} vào {selectedAppeal.reviewedAt ? new Date(selectedAppeal.reviewedAt).toLocaleString('vi-VN') : '—'}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleCloseReview}
                  className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 rounded-lg"
                >
                  Đóng
                </button>
                {selectedAppeal.decision === 'PENDING' && (
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  >
                    {submittingReview ? 'Đang lưu phán quyết...' : 'Xác nhận phán quyết'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
