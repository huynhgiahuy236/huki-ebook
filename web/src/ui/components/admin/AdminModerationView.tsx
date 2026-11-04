"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  moderationApi,
  type ModerationReportItem,
  type ReportStatus,
  type ReportReason,
  type ModerationAction,
} from '../../api/moderationApi';
import { AdminStatusBadge, AdminPagination } from './AdminUI';

export function AdminModerationView() {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ModerationReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | ReportStatus>('ALL');
  const [selectedReason, setSelectedReason] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Detail / Action Modal State
  const [selectedReport, setSelectedReport] = useState<ModerationReportItem | null>(null);
  const [actionModalType, setActionModalType] = useState<'RESOLVE' | 'DISMISS' | null>(null);
  const [chosenAction, setChosenAction] = useState<ModerationAction>('HIDE');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await moderationApi.listReports({
        page: currentPage,
        limit: 50,
        status: activeTab !== 'ALL' ? activeTab : undefined,
        reason: selectedReason !== 'ALL' ? selectedReason : undefined,
      });

      if (res?.success && res.data) {
        setReports(res.data.data || []);
      } else {
        setReports([]);
      }
    } catch {
      showToast('Không thể tải danh sách báo cáo kiểm duyệt.', 'error');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeTab, selectedReason, showToast]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  // Client-side filtering for search query
  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchId = (item.id || '').toLowerCase().includes(q);
      const matchTargetId = (item.targetId || '').toLowerCase().includes(q);
      const matchDesc = (item.description || '').toLowerCase().includes(q);
      const matchReason = (item.reason || '').toLowerCase().includes(q);
      return matchId || matchTargetId || matchDesc || matchReason;
    });
  }, [reports, searchQuery]);

  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  const stats = useMemo(() => {
    return {
      total: reports.length,
      pending: reports.filter((r) => r.status === 'PENDING').length,
      reviewing: reports.filter((r) => r.status === 'REVIEWING').length,
      resolved: reports.filter((r) => r.status === 'RESOLVED').length,
      dismissed: reports.filter((r) => r.status === 'DISMISSED').length,
    };
  }, [reports]);

  const handleStartReview = async (reportId: string) => {
    try {
      const res = await moderationApi.startReview(reportId);
      if (res?.success) {
        showToast('Đã tiếp nhận báo cáo vào trạng thái Đang xử lý.', 'success');
        loadReports();
      } else {
        showToast((res as any)?.error?.message || 'Không thể cập nhật trạng thái.', 'error');
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
          showToast(`Đã giải quyết báo cáo và áp dụng biện pháp: ${chosenAction}`, 'success');
          setSelectedReport(null);
          setActionModalType(null);
          setResolutionNotes('');
          loadReports();
        } else {
          showToast((res as any)?.error?.message || 'Không thể giải quyết báo cáo.', 'error');
        }
      } else if (actionModalType === 'DISMISS') {
        const res = await moderationApi.resolveReport(selectedReport.id, {
          status: 'DISMISSED',
          resolutionNotes: resolutionNotes.trim() || 'Báo cáo không vi phạm tiêu chuẩn cộng đồng.',
        });
        if (res?.success) {
          showToast('Đã bác bỏ báo cáo hợp lệ.', 'success');
          setSelectedReport(null);
          setActionModalType(null);
          setResolutionNotes('');
          loadReports();
        } else {
          showToast((res as any)?.error?.message || 'Không thể bác bỏ báo cáo.', 'error');
        }
      }
    } catch {
      showToast('Lỗi máy chủ khi xử lý báo cáo kiểm duyệt.', 'error');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const getReasonLabel = (reason: ReportReason) => {
    switch (reason) {
      case 'SPAM':
        return { label: 'Spam / Rác', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'OFFENSIVE':
        return { label: 'Ngôn từ xúc phạm', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'HARASSMENT':
        return { label: 'Quấy rối / Bắt nạt', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'MISINFORMATION':
        return { label: 'Thông tin sai lệch', color: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'COPYRIGHT':
        return { label: 'Vi phạm bản quyền', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'OTHER':
      default:
        return { label: 'Lý do khác', color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
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
              Quản lý danh sách khiếu nại đánh giá, bình luận cộng đồng và nội dung bị gắn cờ vi phạm tiêu chuẩn HUKI.
            </p>
          </div>

          <button
            type="button"
            onClick={loadReports}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin text-[#006953]' : ''}`}>
              refresh
            </span>
            <span>Làm Mới</span>
          </button>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5 text-xs">
          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-100 flex items-center justify-between">
            <div>
              <span className="text-gray-500 font-medium block">Tổng Báo Cáo</span>
              <span className="text-2xl font-black text-gray-900 mt-0.5 block">{stats.total}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gray-200 text-gray-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">flag</span>
            </div>
          </div>

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
              <span className="text-blue-700 font-medium block">Đang Xử Lý</span>
              <span className="text-2xl font-black text-blue-700 mt-0.5 block">{stats.reviewing}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">visibility</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-between">
            <div>
              <span className="text-[#006953] font-medium block">Đã Xử Lý Thành Công</span>
              <span className="text-2xl font-black text-[#006953] mt-0.5 block">{stats.resolved}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#006953] flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">task_alt</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Controls & Tabs */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3.5">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none w-full min-w-0">
          {(
            [
              { key: 'ALL', label: 'Tất Cả', count: stats.total },
              { key: 'PENDING', label: 'Chờ Duyệt', count: stats.pending },
              { key: 'REVIEWING', label: 'Đang Xử Lý', count: stats.reviewing },
              { key: 'RESOLVED', label: 'Đã Giải Quyết', count: stats.resolved },
              { key: 'DISMISSED', label: 'Đã Bác Bỏ', count: stats.dismissed },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setCurrentPage(1);
                }}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#003B2B] text-white shadow-2xs font-bold'
                    : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 flex-1 max-w-lg">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo ID báo cáo, Target ID, nội dung vi phạm..."
                className="w-full pl-9 pr-9 py-2 bg-gray-50 border border-gray-200 focus:border-[#006953] rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            <select
              value={selectedReason}
              onChange={(e) => {
                setSelectedReason(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 cursor-pointer focus:outline-none"
            >
              <option value="ALL">Mọi Lý Do</option>
              <option value="SPAM">Spam / Rác</option>
              <option value="OFFENSIVE">Xúc Phạm</option>
              <option value="HARASSMENT">Quấy Rối</option>
              <option value="MISINFORMATION">Sai Lệch</option>
              <option value="COPYRIGHT">Bản Quyền</option>
              <option value="OTHER">Lý Do Khác</option>
            </select>
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Hiển thị <strong className="text-gray-800">{filteredReports.length}</strong> báo cáo
          </div>
        </div>
      </div>

      {/* 3. Reports Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-400 flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-3xl animate-spin text-[#006953]">sync</span>
            <span>Đang tải danh sách báo cáo vi phạm...</span>
          </div>
        ) : paginatedReports.length === 0 ? (
          <div className="py-16 text-center text-gray-400 max-w-sm mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#006953] flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-3xl">verified_user</span>
            </div>
            <h4 className="text-sm font-bold text-gray-700 mb-1">Không có báo cáo nào</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              {searchQuery || selectedReason !== 'ALL' || activeTab !== 'ALL'
                ? 'Không tìm thấy báo cáo nào khớp với bộ lọc hiện tại.'
                : 'Tuyệt vời! Hiện tại không có nội dung nào bị khiếu nại hoặc gắn cờ vi phạm.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Mã Báo Cáo</th>
                  <th className="py-3 px-4">Đối Tượng</th>
                  <th className="py-3 px-4">Lý Do Vi Phạm</th>
                  <th className="py-3 px-4">Mô Tả Khiếu Nại</th>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedReports.map((item) => {
                  const reasonInfo = getReasonLabel(item.reason);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-gray-900">
                        #{item.id.slice(-6)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800">
                          {item.targetType === 'REVIEW' ? 'Đánh Giá Sách' : item.targetType}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400 truncate max-w-[120px]">
                          ID: {item.targetId}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold border ${reasonInfo.color}`}>
                          {reasonInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <p className="text-gray-700 line-clamp-2 leading-relaxed">
                          {item.description || 'Không có mô tả chi tiết từ người báo cáo.'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-gray-500 whitespace-nowrap text-[11px]">
                        {new Date(item.createdAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleStartReview(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 transition-colors cursor-pointer"
                              title="Bắt đầu xem xét báo cáo này"
                            >
                              Tiếp Nhận
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
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition-colors cursor-pointer"
                                title="Xử lý nội dung vi phạm"
                              >
                                Xử Lý
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedReport(item);
                                  setActionModalType('DISMISS');
                                  setResolutionNotes('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium text-[11px] transition-colors cursor-pointer"
                                title="Bác bỏ báo cáo nếu không vi phạm"
                              >
                                Bác Bỏ
                              </button>
                            </>
                          )}

                          {item.status === 'RESOLVED' && (
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-0.5 justify-end">
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              <span>{item.actionTaken || 'Đã xử lý'}</span>
                            </span>
                          )}

                          {item.status === 'DISMISSED' && (
                            <span className="text-[11px] text-gray-400 font-medium italic">
                              Đã bác bỏ
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredReports.length > pageSize && (
          <div className="p-4 border-t border-gray-100">
            <AdminPagination
              currentPage={currentPage}
              totalPages={Math.ceil(filteredReports.length / pageSize)}
              onPageChange={(p) => setCurrentPage(p)}
              totalItems={filteredReports.length}
              pageSize={pageSize}
            />
          </div>
        )}
      </div>

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
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 space-y-4"
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
              <div className="p-3 bg-gray-50 rounded-xl space-y-1 border border-gray-100">
                <div className="text-gray-500">Mã Báo Cáo: <strong className="text-gray-800 font-mono">#{selectedReport.id}</strong></div>
                <div className="text-gray-500">Lý do: <strong className="text-rose-700">{selectedReport.reason}</strong></div>
                {selectedReport.description && (
                  <p className="text-gray-700 italic pt-1 border-t border-gray-200/60 mt-1">
                    &quot;{selectedReport.description}&quot;
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
                    onChange={(e) => setChosenAction(e.target.value as any)}
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
                  Bác bỏ báo cáo này nếu nội dung không vi phạm tiêu chuẩn cộng đồng hoặc do người dùng nhầm lẫn. Báo cáo sẽ được chuyển sang trạng thái <strong>ĐÃ BÁC BỎ</strong>.
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
                  className={`px-4 py-1.5 rounded-xl text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                    actionModalType === 'RESOLVE'
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

