'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/ui/context/ToastContext';
import { AdminStatusBadge } from './AdminUI';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import type { AffiliateProfile, PartnerStatus } from '@/types/affiliate';

export function AdminAffiliatesView() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [applications, setApplications] = useState<AffiliateProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Detail Modal
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<{
    profile: AffiliateProfile;
    auditTimeline: any[];
  } | null>(null);

  // Action Dialogs
  const [actionType, setActionType] = useState<
    'APPROVE' | 'REQUEST_CHANGES' | 'REJECT' | 'SUSPEND' | 'ACTIVATE' | null
  >(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = activeTab === 'ALL' ? undefined : (activeTab as PartnerStatus);
      const res = await affiliateApi.adminListApplications({
        status: statusParam,
        search: debouncedSearch || undefined,
        page,
        limit: 15,
      });

      if (res.success && res.data) {
        setApplications(res.data.items || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      } else {
        setApplications([]);
        if (res.error?.message) {
          showToast(res.error.message, 'error');
        }
      }
    } catch {
      setApplications([]);
      showToast('Không thể tải danh sách hồ sơ đối tác', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, debouncedSearch, page, showToast]);

  useEffect(() => {
    fetchApplications();

    // Event-driven real-time synchronization across tabs (zero jitter, no polling)
    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (
        msg.type === 'AFFILIATE_APPLICATION_UPDATED' ||
        msg.type === 'AFFILIATE_STATUS_CHANGED'
      ) {
        fetchApplications();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [fetchApplications]);

  // Load detail modal
  const handleOpenDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await affiliateApi.adminGetApplicationDetail(id);
      if (res.success && res.data) {
        setDetailData(res.data);
      } else {
        showToast(res.error?.message || 'Không thể tải chi tiết hồ sơ', 'error');
        setSelectedId(null);
      }
    } catch {
      showToast('Lỗi khi tải chi tiết hồ sơ', 'error');
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedId(null);
    setDetailData(null);
    setActionType(null);
    setActionReason('');
  };

  // Submit Review Actions
  const handleConfirmAction = async () => {
    if (!selectedId || !actionType) return;

    if (['REQUEST_CHANGES', 'REJECT', 'SUSPEND'].includes(actionType) && !actionReason.trim()) {
      showToast('Vui lòng nhập lý do xử lý', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      let res;
      if (actionType === 'APPROVE') {
        res = await affiliateApi.adminApprove(selectedId);
      } else if (actionType === 'REQUEST_CHANGES') {
        res = await affiliateApi.adminRequestChanges(selectedId, actionReason.trim());
      } else if (actionType === 'REJECT') {
        res = await affiliateApi.adminReject(selectedId, actionReason.trim());
      } else if (actionType === 'SUSPEND') {
        res = await affiliateApi.adminSuspend(selectedId, actionReason.trim());
      } else if (actionType === 'ACTIVATE') {
        res = await affiliateApi.adminActivate(selectedId);
      }

      if (res?.success) {
        showToast('Cập nhật trạng thái đối tác thành công!', 'success');
        realtimeSyncBus.publish('AFFILIATE_STATUS_CHANGED', {
          profileId: selectedId,
          status: actionType === 'APPROVE' ? 'ACTIVE' : actionType,
        });
        setActionType(null);
        setActionReason('');
        await handleOpenDetail(selectedId);
        fetchApplications();
      } else {
        showToast(res?.error?.message || 'Thao tác không thành công', 'error');
      }
    } catch {
      showToast('Lỗi hệ thống khi thực hiện thao tác', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: PartnerStatus) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <AdminStatusBadge variant="warning" label="Chờ duyệt" icon="schedule" />;
      case 'REQUEST_CHANGES':
        return <AdminStatusBadge variant="purple" label="Yêu cầu sửa" icon="edit_note" />;
      case 'ACTIVE':
        return <AdminStatusBadge variant="success" label="Đang hoạt động" icon="check_circle" />;
      case 'REJECTED':
        return <AdminStatusBadge variant="danger" label="Từ chối" icon="cancel" />;
      case 'SUSPENDED':
        return <AdminStatusBadge variant="danger" label="Tạm ngưng" icon="block" />;
      default:
        return <AdminStatusBadge variant="neutral" label={status} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-[26px]">handshake</span>
            <span>Quản Lý Tiếp Thị Liên Kết (Affiliate)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Xét duyệt hồ sơ đối tác CTV tiếp thị, quản lý mã giới thiệu và kênh phân phối nội dung.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-200 pb-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'PENDING_REVIEW', label: 'Chờ duyệt' },
            { key: 'REQUEST_CHANGES', label: 'Yêu cầu sửa' },
            { key: 'ACTIVE', label: 'Đang hoạt động' },
            { key: 'REJECTED', label: 'Từ chối' },
            { key: 'SUSPENDED', label: 'Tạm ngưng' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-emerald-700 text-white shadow-xs font-bold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, mã, email..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Đối Tác &amp; Mã</th>
                <th className="py-3 px-4">Loại Hình</th>
                <th className="py-3 px-4">Kênh Phân Phối</th>
                <th className="py-3 px-4">Liên Hệ</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4">Ngày Nộp</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <span className="material-symbols-outlined animate-spin text-[28px] text-emerald-600">
                      progress_activity
                    </span>
                    <p className="mt-2 text-xs font-medium">Đang tải danh sách hồ sơ...</p>
                  </td>
                </tr>
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <span className="material-symbols-outlined text-[36px] text-gray-300">
                      inbox
                    </span>
                    <p className="mt-1 text-xs font-medium">Không tìm thấy hồ sơ đối tác nào</p>
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {app.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{app.displayName}</div>
                          <div className="font-mono text-[11px] text-emerald-700 font-semibold">
                            {app.affiliateCode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 font-medium">
                      {app.applicantType === 'BUSINESS' ? 'Doanh nghiệp' : 'Cá nhân'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-semibold text-gray-800">
                          {app.channels?.length || 0} kênh
                        </span>
                        {app.channels && app.channels[0] && (
                          <div className="text-[10.5px] text-gray-500 truncate max-w-[180px]">
                            {app.channels[0].type}: {app.channels[0].url}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-700 font-medium">{app.contactEmail}</div>
                      <div className="text-[11px] text-gray-400">{app.contactPhone}</div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(app.status)}</td>
                    <td className="py-3 px-4 text-gray-500 text-[11px]">
                      {new Date(app.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(app.id)}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            <span>
              Tổng số: <strong>{totalCount}</strong> hồ sơ
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md border border-gray-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Trước
              </button>
              <span className="px-2 font-semibold text-gray-700">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-md border border-gray-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail & Review Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/70">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-700 text-[26px]">
                  badge
                </span>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    Chi Tiết Hồ Sơ Đối Tác Tiếp Thị
                  </h2>
                  <p className="text-xs text-gray-500">
                    ID: <span className="font-mono">{selectedId}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                className="w-8 h-8 rounded-full hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-gray-700">
              {detailLoading || !detailData ? (
                <div className="py-16 text-center text-gray-400">
                  <span className="material-symbols-outlined animate-spin text-[32px] text-emerald-600">
                    progress_activity
                  </span>
                  <p className="mt-2 font-medium">Đang tải thông tin chi tiết...</p>
                </div>
              ) : (
                <>
                  {/* Status Banner */}
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>{getStatusBadge(detailData.profile.status)}</div>
                      <div>
                        <div className="font-bold text-gray-900 text-sm">
                          {detailData.profile.displayName} (Mã: {detailData.profile.affiliateCode})
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Nộp lúc:{' '}
                          {new Date(detailData.profile.createdAt).toLocaleString('vi-VN')}
                          {(detailData.profile as any).resubmitCount > 0 && (
                            <span className="ml-2 font-semibold text-purple-700">
                              (Lần nộp lại: {(detailData.profile as any).resubmitCount}/3)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {detailData.profile.rejectionReason && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        <span>Lý do xử lý / Ghi chú ban quản trị:</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        {detailData.profile.rejectionReason}
                      </p>
                    </div>
                  )}

                  {/* Section 1: Identification & Experience */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] border-b pb-1">
                      1. Thông Tin Định Danh &amp; Kinh Nghiệm
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/60 p-4 rounded-xl border border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[10.5px]">Tên hiển thị:</span>
                        <span className="font-bold text-gray-800">{detailData.profile.displayName}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10.5px]">Mã CTV:</span>
                        <span className="font-mono font-bold text-emerald-700">{detailData.profile.affiliateCode}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10.5px]">Email liên hệ:</span>
                        <span className="font-medium text-gray-800">{detailData.profile.contactEmail}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10.5px]">Số điện thoại:</span>
                        <span className="font-medium text-gray-800">{detailData.profile.contactPhone}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10.5px]">Loại hình:</span>
                        <span className="font-medium text-gray-800">
                          {detailData.profile.applicantType === 'BUSINESS'
                            ? 'Doanh nghiệp / Tổ chức'
                            : 'Cá nhân'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10.5px]">Mã số thuế:</span>
                        <span className="font-mono text-gray-800">
                          {detailData.profile.taxId || 'Chưa cung cấp (MVP)'}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray-400 block text-[10.5px]">Kinh nghiệm tiếp thị:</span>
                        <p className="mt-1 text-gray-700 whitespace-pre-line leading-relaxed">
                          {detailData.profile.bio}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Distribution Channels */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] border-b pb-1">
                      2. Kênh Phân Phối ({detailData.profile.channels?.length || 0})
                    </h3>
                    <div className="space-y-2">
                      {detailData.profile.channels?.map((ch, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl border border-gray-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md bg-gray-100 font-bold text-gray-800 text-[10.5px]">
                                {ch.type}
                              </span>
                              {ch.isPrimary && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                  Kênh chính
                                </span>
                              )}
                              {ch.handle && (
                                <span className="text-gray-500 font-mono text-[11px]">
                                  @{ch.handle}
                                </span>
                              )}
                            </div>
                            <a
                              href={ch.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-700 hover:underline font-mono text-[11px] break-all block"
                            >
                              {ch.url}
                            </a>
                          </div>
                          <div className="text-[11px] text-gray-500 text-right sm:shrink-0">
                            Lượng theo dõi: <strong>{ch.followersRange}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 3: Promotion Methods & Traffic */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] border-b pb-1">
                      3. Phương Thức Tiếp Thị &amp; Lưu Lượng
                    </h3>
                    <div className="bg-gray-50/60 p-4 rounded-xl border border-gray-100 space-y-3">
                      <div>
                        <span className="text-gray-400 block text-[10.5px]">Chủ đề nội dung:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {detailData.profile.contentCategories?.map((cat, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-[11px] font-semibold"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-400 block text-[10.5px]">Hình thức quảng bá:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {detailData.profile.promotionMethods?.map((pm, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-700 text-[11px] font-semibold"
                            >
                              {pm}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-400 block text-[10.5px]">Lưu lượng trả phí (Paid Traffic):</span>
                        <span className="font-semibold text-gray-800">
                          {detailData.profile.hasPaidTraffic
                            ? `Có sử dụng (${detailData.profile.paidTrafficSources?.join(', ') || 'N/A'})`
                            : 'Không sử dụng (Hoàn toàn Organic Traffic)'}
                        </span>
                      </div>

                      {detailData.profile.promotionDescription && (
                        <div>
                          <span className="text-gray-400 block text-[10.5px]">Kế hoạch phân phối:</span>
                          <p className="mt-1 text-gray-700 whitespace-pre-line leading-relaxed">
                            {detailData.profile.promotionDescription}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section 4: Audit Timeline */}
                  {detailData.auditTimeline && detailData.auditTimeline.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-gray-900 uppercase tracking-wider text-[11px] border-b pb-1">
                        4. Lịch Sử Hoạt Động &amp; Kiểm Duyệt
                      </h3>
                      <div className="space-y-2 border-l-2 border-gray-200 pl-4 ml-1">
                        {detailData.auditTimeline.map((item, idx) => (
                          <div key={idx} className="relative space-y-0.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[21px] top-1" />
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-800">{item.action}</span>
                              <span className="text-[10px] text-gray-400">
                                {new Date(item.createdAt).toLocaleString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600">
                              Người thực hiện: <strong className="font-mono">{item.actorId}</strong>
                            </p>
                            {item.details && (
                              <p className="text-[10.5px] text-gray-500 font-mono bg-gray-50 p-1.5 rounded">
                                {JSON.stringify(item.details)}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Confirmation Box */}
                  {actionType && (
                    <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 space-y-3 animate-in fade-in duration-150">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-700 text-[18px]">
                          check_circle
                        </span>
                        <span>
                          {actionType === 'APPROVE' && 'Xác nhận Phê Duyệt Hồ Sơ'}
                          {actionType === 'REQUEST_CHANGES' && 'Yêu Cầu Bổ Sung Thông Tin'}
                          {actionType === 'REJECT' && 'Từ Chối Hồ Sơ Đối Tác'}
                          {actionType === 'SUSPEND' && 'Tạm Ngưng Tài Khoản Đối Tác'}
                          {actionType === 'ACTIVATE' && 'Kích Hoạt Lại Tài Khoản'}
                        </span>
                      </div>

                      {['REQUEST_CHANGES', 'REJECT', 'SUSPEND'].includes(actionType) && (
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            Lý do / Hướng dẫn gửi cho đối tác <span className="text-red-500">*</span>:
                          </label>
                          <textarea
                            rows={3}
                            value={actionReason}
                            onChange={(e) => setActionReason(e.target.value)}
                            placeholder="Nhập lý do cụ thể..."
                            className="w-full p-2.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setActionType(null);
                            setActionReason('');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-white cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={handleConfirmAction}
                          className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          {actionLoading ? 'Đang xử lý...' : 'Xác Nhận'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer Controls */}
            {detailData && !actionType && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-gray-200 bg-gray-50">
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-semibold hover:bg-white cursor-pointer"
                >
                  Đóng
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  {['PENDING_REVIEW', 'REQUEST_CHANGES'].includes(detailData.profile.status) && (
                    <>
                      <button
                        type="button"
                        onClick={() => setActionType('REQUEST_CHANGES')}
                        className="px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Yêu Cầu Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionType('REJECT')}
                        className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Từ Chối
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionType('APPROVE')}
                        className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
                      >
                        Phê Duyệt
                      </button>
                    </>
                  )}

                  {detailData.profile.status === 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => setActionType('SUSPEND')}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Tạm Ngưng Đối Tác
                    </button>
                  )}

                  {detailData.profile.status === 'SUSPENDED' && (
                    <button
                      type="button"
                      onClick={() => setActionType('ACTIVATE')}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Kích Hoạt Lại
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
