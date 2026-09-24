"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppealDecision,
  SanctionAppeal,
  SanctionLevel,
  sanctionsApi,
} from '@/ui/api/sanctionsApi';
import { useToast } from '@/ui/context/ToastContext';
import { useSmartFormCollapse } from '@/ui/utils/formHooks';
import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer } from './AdminUI';

export function AdminAppealsView() {
  const { showToast } = useToast();

  const [appeals, setAppeals] = useState<SanctionAppeal[]>([]);
  const [totalAppeals, setTotalAppeals] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [filterDecision, setFilterDecision] = useState<AppealDecision | 'ALL'>('PENDING');
  const [searchStoreId, setSearchStoreId] = useState('');
  const [loading, setLoading] = useState(true);

  // Review Form State
  const [selectedAppeal, setSelectedAppeal] = useState<SanctionAppeal | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewNoteError, setReviewNoteError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const isReviewDirty = Boolean(reviewNote.trim());
  const appealPanelRef = useSmartFormCollapse({
    isOpen: Boolean(selectedAppeal),
    onClose: () => {
      setSelectedAppeal(null);
      setReviewNote('');
      setReviewNoteError('');
    },
    isDirty: isReviewDirty,
  });

  // Fetch appeals queue from API
  const fetchAppeals = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sanctionsApi.getAppeals({
        page: 1,
        limit: 100,
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
  }, [filterDecision, searchStoreId, showToast]);

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

  const approvedCount = useMemo(() => appeals.filter((a) => a.decision === 'APPROVED').length, [appeals]);
  const rejectedCount = useMemo(() => appeals.filter((a) => a.decision === 'REJECTED').length, [appeals]);

  const filteredAppeals = useMemo(() => {
    return appeals.filter((a) => {
      if (filterDecision !== 'ALL' && a.decision !== filterDecision) return false;
      if (searchStoreId.trim()) {
        return a.storeId.toLowerCase().includes(searchStoreId.toLowerCase().trim());
      }
      return true;
    });
  }, [appeals, filterDecision, searchStoreId]);

  const totalPages = Math.ceil(filteredAppeals.length / pageSize) || 1;
  const paginatedAppeals = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAppeals.slice(start, start + pageSize);
  }, [filteredAppeals, currentPage, pageSize]);

  const renderLevelBadge = (level?: SanctionLevel) => {
    switch (level) {
      case 'WARNING':
        return <AdminStatusBadge status="warning" label="Cảnh Báo" />;
      case 'PROBATION':
        return <AdminStatusBadge status="warning" label="Quản Chế" />;
      case 'SUSPENSION':
        return <AdminStatusBadge status="danger" label="Đình Chỉ" />;
      case 'BAN':
        return <AdminStatusBadge status="danger" label="Cấm Bán" />;
      default:
        return <AdminStatusBadge status="neutral" label={level || 'Xử Phạt'} />;
    }
  };

  const renderDecisionBadge = (decision: AppealDecision) => {
    switch (decision) {
      case 'PENDING':
        return <AdminStatusBadge status="warning" label="Chờ Xem Xét" icon="hourglass_top" />;
      case 'APPROVED':
        return <AdminStatusBadge status="success" label="Đã Chấp Thuận" icon="check_circle" />;
      case 'REJECTED':
        return <AdminStatusBadge status="danger" label="Bác Bỏ" icon="cancel" />;
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Xử Lý Kháng Nghị Xử Phạt
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Tiếp nhận giải trình và xem xét gỡ phạt hoặc giữ nguyên chế tài gian hàng</p>
        </div>
        <button
          onClick={fetchAppeals}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#E2E8F0] rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
        >
          <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          <span>Làm Mới</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl border border-[#E2E8F0] bg-white shadow-2xs">
          <div className="text-xs font-medium text-gray-500">Kháng nghị chờ xử lý</div>
          <div className="text-xl font-extrabold text-amber-600 mt-1">{pendingCount}</div>
        </div>
        <div className="p-4 rounded-2xl border border-[#E2E8F0] bg-white shadow-2xs">
          <div className="text-xs font-medium text-gray-500">Cảnh báo quá hạn SLA (48h)</div>
          <div className={`text-xl font-extrabold mt-1 ${overdueCount > 0 ? 'text-rose-600 animate-pulse' : 'text-gray-700'}`}>
            {overdueCount}
          </div>
        </div>
        <div className="p-4 rounded-2xl border border-[#E2E8F0] bg-white shadow-2xs">
          <div className="text-xs font-medium text-gray-500">Tổng số hồ sơ tiếp nhận</div>
          <div className="text-xl font-extrabold text-gray-900 mt-1">{totalAppeals}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <AdminFilterTabs
          tabs={[
            { key: 'PENDING', label: 'Chờ duyệt', count: pendingCount },
            { key: 'ALL', label: 'Tất cả', count: appeals.length },
            { key: 'APPROVED', label: 'Đã chấp thuận', count: approvedCount },
            { key: 'REJECTED', label: 'Đã bác bỏ', count: rejectedCount },
          ]}
          activeTab={filterDecision}
          onChange={(tab) => {
            setFilterDecision(tab as any);
            setCurrentPage(1);
          }}
        />

        <div className="relative w-full sm:w-60">
          <span className="material-symbols-outlined text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px]">search</span>
          <input
            type="text"
            value={searchStoreId}
            onChange={(e) => {
              setSearchStoreId(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Lọc theo Store ID..."
            className="w-full text-xs rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-8 pr-3 py-1.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] transition-all"
          />
        </div>
      </div>

      {/* Appeals Queue Table Container */}
      <AdminTableContainer>
        {loading ? (
          <div className="p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : filteredAppeals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-500 text-xs">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">inbox</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">Hàng Đợi Trống</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Không có hồ sơ kháng nghị nào trong trạng thái đã chọn.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1350px]">
              <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Mã Hồ Sơ</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Store ID</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Mức Độ Phạt</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Lý Do Xử Phạt</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Giải Trình Kháng Nghị</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Bằng Chứng</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Thời Gian Nộp</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">SLA 48h</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-center">Trạng Thái</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedAppeals.map((a, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const sla = getSlaStatus(a.submittedAt, a.decision);
                  const attachments = a.evidence?.attachments || [];
                  const urls = a.evidence?.urls || [];
                  const totalProofCount = attachments.length + urls.length;

                  return (
                    <tr
                      key={a.id}
                      className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                    >
                      {/* 1. STT */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                        {itemIndex}
                      </td>

                      {/* 2. Mã Hồ Sơ */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono font-bold text-gray-900 text-[11px]">
                        #{a.id.slice(0, 10)}...
                      </td>

                      {/* 3. Store ID */}
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-gray-700 text-[11px]">
                        {a.storeId.substring(0, 14)}...
                      </td>

                      {/* 4. Mức Độ Phạt */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        {renderLevelBadge(a.sanction?.level)}
                      </td>

                      {/* 5. Lý Do Xử Phạt */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-600 text-[11px] max-w-[180px] truncate" title={a.sanction?.reason || '—'}>
                        {a.sanction?.reason || '—'}
                      </td>

                      {/* 6. Giải Trình Kháng Nghị */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-900 font-medium text-[11px] max-w-[220px] truncate" title={a.reason}>
                        {a.reason}
                      </td>

                      {/* 7. Bằng Chứng */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        {totalProofCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[10.5px] font-bold">
                            <span className="material-symbols-outlined text-[13px]">attach_file</span>
                            <span>{totalProofCount} tệp</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">Không có</span>
                        )}
                      </td>

                      {/* 8. Thời Gian Nộp */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-gray-500 text-[11px]">
                        {new Date(a.submittedAt).toLocaleString('vi-VN')}
                      </td>

                      {/* 9. SLA 48h */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        {sla.isPending ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                            sla.isOverdue
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {sla.label}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[11px]">Đã xong</span>
                        )}
                      </td>

                      {/* 10. Trạng Thái */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-center">
                        {renderDecisionBadge(a.decision)}
                      </td>

                      {/* 11. Thao Tác */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        {a.decision === 'PENDING' ? (
                          <button
                            onClick={() => handleOpenReview(a)}
                            className="px-2.5 py-1 bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-[11px] rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            Thẩm định
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenReview(a)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
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
        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredAppeals.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="hồ sơ kháng nghị"
        />
      </AdminTableContainer>

      {/* Review In-Page Collapsible Panel */}
      {selectedAppeal && (
        <div ref={appealPanelRef} className="mt-4 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-200 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                Thẩm Định Hồ Sơ Kháng Nghị Xử Phạt
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Mã hồ sơ: <span className="font-mono text-gray-700 font-semibold">{selectedAppeal.id}</span> · Cửa hàng: <span className="font-mono text-gray-700 font-semibold">{selectedAppeal.storeId}</span>
              </p>
            </div>
            <button
              onClick={handleCloseReview}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Đóng bảng
            </button>
          </div>

          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Comparison Box */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* Sanction Facts */}
              <div className="p-4 bg-rose-50/60 border border-rose-200/80 rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-rose-900 flex items-center justify-between">
                  <span>Quyết định xử phạt gốc</span>
                  {renderLevelBadge(selectedAppeal.sanction?.level)}
                </div>
                <div className="text-gray-700">
                  <span className="font-semibold text-gray-900">Lý do phạt:</span> {selectedAppeal.sanction?.reason}
                </div>
                {selectedAppeal.sanction?.violationCode && (
                  <div className="text-gray-700">
                    <span className="font-semibold text-gray-900">Mã vi phạm:</span> {selectedAppeal.sanction.violationCode}
                  </div>
                )}
                <div className="text-gray-500 pt-1 border-t border-rose-100">
                  Ban hành: {selectedAppeal.sanction?.issuedAt ? new Date(selectedAppeal.sanction.issuedAt).toLocaleDateString('vi-VN') : '—'}
                </div>
              </div>

              {/* Seller Argument */}
              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-2 text-xs">
                <div className="font-bold text-blue-900">
                  Lý do giải trình của người bán
                </div>
                <div className="text-gray-800 leading-relaxed italic">
                  "{selectedAppeal.reason}"
                </div>
                <div className="text-gray-500 pt-1 border-t border-blue-100">
                  Thời gian nộp: {new Date(selectedAppeal.submittedAt).toLocaleString('vi-VN')}
                </div>
              </div>
            </div>

            {/* Evidence Section */}
            <div className="space-y-2.5 p-4 bg-gray-50 border border-gray-200 rounded-2xl">
              <div className="text-xs font-bold text-gray-900">
                Tài liệu &amp; Chứng cứ người bán đính kèm:
              </div>
              
              {/* Uploaded Attachments */}
              {(selectedAppeal.evidence?.attachments || []).length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10.5px] font-semibold text-gray-500">Tệp đính kèm:</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedAppeal.evidence!.attachments!.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-[#00875A] hover:underline font-medium shadow-2xs"
                      >
                        <span>📄 {att.filename}</span>
                        <span className="text-[10px] text-gray-400">({Math.round((att.size || 0) / 1024)}KB)</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Supplementary URLs */}
              {(selectedAppeal.evidence?.urls || []).length > 0 && (
                <div className="space-y-1 pt-1">
                  <div className="text-[10.5px] font-semibold text-gray-500">Liên kết ngoài:</div>
                  <ul className="space-y-1 text-xs">
                    {selectedAppeal.evidence!.urls!.map((url, idx) => (
                      <li key={idx}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#00875A] hover:underline font-mono text-[11px] truncate block max-w-full"
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
                  <div className="text-xs text-gray-400 italic">Người bán không đính kèm tệp bằng chứng.</div>
                )}
            </div>

            {/* Decision Choice */}
            {selectedAppeal.decision === 'PENDING' ? (
              <div className="space-y-3.5 pt-1">
                <label className="text-xs font-bold text-gray-900 block">
                  Phán quyết của quản trị viên <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDecision('APPROVED')}
                    className={`p-3.5 rounded-2xl border text-left text-xs transition-all cursor-pointer ${
                      selectedDecision === 'APPROVED'
                        ? 'border-[#00875A] bg-emerald-50/70 text-emerald-900 ring-2 ring-[#00875A] font-semibold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-[#00875A]">
                      <span>✓</span> CHẤP THUẬN (LIFTED)
                    </div>
                    <div className="text-[10.5px] text-gray-500 mt-1 leading-relaxed">
                      Gỡ bỏ quyết định xử phạt, khôi phục toàn bộ quyền kinh doanh của cửa hàng.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDecision('REJECTED')}
                    className={`p-3.5 rounded-2xl border text-left text-xs transition-all cursor-pointer ${
                      selectedDecision === 'REJECTED'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 ring-2 ring-rose-500 font-semibold'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5 text-rose-700">
                      <span>✕</span> BÁC BỎ (UPHELD)
                    </div>
                    <div className="text-[10.5px] text-gray-500 mt-1 leading-relaxed">
                      Bác kháng nghị, giữ nguyên mức xử phạt và các giới hạn đối với cửa hàng.
                    </div>
                  </button>
                </div>

                {/* Internal Review Note */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700">
                    Ghi chú thẩm định nội bộ
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNote}
                    onChange={(e) => {
                      setReviewNote(e.target.value);
                      if (reviewNoteError) setReviewNoteError('');
                    }}
                    placeholder="Nhập căn cứ thẩm định hoặc ghi chú lý do đưa ra phán quyết..."
                    className={`w-full text-xs rounded-xl border bg-white p-3 text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all ${
                      reviewNoteError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-gray-300 focus:border-[#00875A]'
                    }`}
                  />
                  {reviewNoteError && (
                    <p className="text-xs text-rose-500 mt-1 flex items-center gap-1 font-medium animate-in fade-in">
                      <span>⚠️</span> {reviewNoteError}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 rounded-2xl space-y-1 text-xs">
                <div className="font-semibold text-gray-900">
                  Hồ sơ đã được thẩm định với kết quả: {renderDecisionBadge(selectedAppeal.decision)}
                </div>
                {selectedAppeal.decisionReason && (
                  <div className="text-gray-600">
                    <span className="font-medium">Ghi chú:</span> {selectedAppeal.decisionReason}
                  </div>
                )}
                <div className="text-gray-500 text-[10.5px]">
                  Thực hiện bởi {selectedAppeal.reviewedBy || 'Admin'} vào {selectedAppeal.reviewedAt ? new Date(selectedAppeal.reviewedAt).toLocaleString('vi-VN') : '—'}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={handleCloseReview}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
              {selectedAppeal.decision === 'PENDING' && (
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2 bg-[#00875A] hover:bg-[#00734c] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {submittingReview ? 'Đang lưu phán quyết...' : 'Xác nhận phán quyết'}
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
