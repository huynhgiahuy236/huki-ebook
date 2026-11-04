'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/ui/context/ToastContext';
import { AdminStatusBadge } from './AdminUI';
import GroupedDataTable, { Column } from '../common/GroupedDataTable';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import type { AffiliateProfile, PartnerStatus } from '@/types/affiliate';

export function AdminAffiliatesView() {
  const { showToast } = useToast();

  // Navigation: Applications vs Payouts vs Fraud
  const [mainTab, setMainTab] = useState<'APPLICATIONS' | 'PAYOUTS' | 'FRAUD'>('APPLICATIONS');

  // ==========================================
  // TAB 1: APPLICATIONS STATE & LOGIC
  // ==========================================
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [applications, setApplications] = useState<AffiliateProfile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  // KYC Review in modal
  const [kycReviewLoading, setKycReviewLoading] = useState(false);

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
        limit: 10,
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
    if (mainTab === 'APPLICATIONS') {
      fetchApplications();
    }
  }, [mainTab, fetchApplications]);

  // Realtime subscription
  useEffect(() => {
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
      showToast('Lỗi kết nối khi tải chi tiết hồ sơ', 'error');
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

  const handleConfirmAction = async () => {
    if (!selectedId || !actionType) return;
    if (['REQUEST_CHANGES', 'REJECT', 'SUSPEND'].includes(actionType) && !actionReason.trim()) {
      showToast('Vui lòng nhập lý do để đối tác nắm rõ thông tin.', 'error');
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

      if (res && res.success) {
        showToast('Thao tác thành công!', 'success');
        handleCloseDetail();
        fetchApplications();
      } else {
        showToast(res?.error?.message || 'Thao tác không thành công', 'error');
      }
    } catch {
      showToast('Lỗi khi thực hiện thao tác', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewKyc = async (profileId: string, status: 'APPROVED' | 'REJECTED') => {
    setKycReviewLoading(true);
    try {
      const res = await affiliateApi.adminReviewKyc(profileId, {
        status,
        rejectionReason: status === 'REJECTED' ? 'Ảnh CCCD hoặc thông tin ngân hàng không hợp lệ' : undefined,
      });
      if (res.success) {
        showToast(status === 'APPROVED' ? 'Đã duyệt KYC đối tác thành công!' : 'Đã từ chối hồ sơ KYC.', 'success');
        if (selectedId) handleOpenDetail(selectedId);
      } else {
        showToast(res.error?.message || 'Không thể xử lý KYC', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi duyệt KYC', 'error');
    } finally {
      setKycReviewLoading(false);
    }
  };

  // ==========================================
  // TAB 2: PAYOUTS QUEUE & APPROVAL
  // ==========================================
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<string>('ALL');
  const [payoutLoading, setPayoutLoading] = useState<boolean>(false);
  const [payoutPage, setPayoutPage] = useState<number>(1);
  const [payoutTotalPages, setPayoutTotalPages] = useState<number>(1);
  const [payoutTotal, setPayoutTotal] = useState<number>(0);
  const [actionPayoutModal, setActionPayoutModal] = useState<{ item: any; type: 'APPROVE' | 'REJECT' } | null>(null);
  const [payoutRejectReason, setPayoutRejectReason] = useState<string>('');
  const [payoutProviderRef, setPayoutProviderRef] = useState<string>('');
  const [payoutSubmitting, setPayoutSubmitting] = useState<boolean>(false);

  const fetchPayouts = useCallback(async () => {
    setPayoutLoading(true);
    try {
      const statusParam = payoutStatusFilter === 'ALL' ? undefined : payoutStatusFilter;
      const res = await affiliateApi.adminListPayouts({
        status: statusParam,
        page: payoutPage,
        limit: 10,
      });
      if (res.success && res.data) {
        setPayouts(res.data.items || []);
        setPayoutTotalPages(res.data.totalPages || 1);
        setPayoutTotal(res.data.total || 0);
      } else {
        setPayouts([]);
      }
    } catch {
      setPayouts([]);
      showToast('Không thể tải danh sách yêu cầu rút tiền', 'error');
    } finally {
      setPayoutLoading(false);
    }
  }, [payoutStatusFilter, payoutPage, showToast]);

  useEffect(() => {
    if (mainTab === 'PAYOUTS') {
      fetchPayouts();
    }
  }, [mainTab, fetchPayouts]);

  const handleExecutePayoutAction = async () => {
    if (!actionPayoutModal) return;
    setPayoutSubmitting(true);
    try {
      if (actionPayoutModal.type === 'APPROVE') {
        const res = await affiliateApi.adminApprovePayout(actionPayoutModal.item.id, payoutProviderRef.trim() || undefined);
        if (res.success) {
          showToast('Đã duyệt chi trả hoa hồng thành công!', 'success');
          setActionPayoutModal(null);
          setPayoutProviderRef('');
          fetchPayouts();
        } else {
          showToast(res.error?.message || 'Không thể duyệt chi trả', 'error');
        }
      } else {
        if (!payoutRejectReason.trim()) {
          showToast('Vui lòng nhập lý do từ chối', 'error');
          setPayoutSubmitting(false);
          return;
        }
        const res = await affiliateApi.adminRejectPayout(actionPayoutModal.item.id, payoutRejectReason.trim());
        if (res.success) {
          showToast('Đã từ chối yêu cầu rút tiền và hoàn tiền về ví CTV!', 'success');
          setActionPayoutModal(null);
          setPayoutRejectReason('');
          fetchPayouts();
        } else {
          showToast(res.error?.message || 'Không thể từ chối', 'error');
        }
      }
    } catch {
      showToast('Lỗi khi thực hiện thao tác rút tiền', 'error');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  // ==========================================
  // TAB 3: FRAUD INVESTIGATION CASES
  // ==========================================
  const [fraudCases, setFraudCases] = useState<any[]>([]);
  const [fraudStatusFilter, setFraudStatusFilter] = useState<string>('ALL');
  const [fraudLoading, setFraudLoading] = useState<boolean>(false);
  const [fraudPage, setFraudPage] = useState<number>(1);
  const [fraudTotalPages, setFraudTotalPages] = useState<number>(1);
  const [fraudTotal, setFraudTotal] = useState<number>(0);
  const [actionFraudModal, setActionFraudModal] = useState<{ item: any; resolution: 'CONFIRMED' | 'DISMISSED' } | null>(null);
  const [fraudResolveNote, setFraudResolveNote] = useState<string>('');
  const [fraudSubmitting, setFraudSubmitting] = useState<boolean>(false);

  const fetchFraudCases = useCallback(async () => {
    setFraudLoading(true);
    try {
      const statusParam = fraudStatusFilter === 'ALL' ? undefined : fraudStatusFilter;
      const res = await affiliateApi.adminListFraudCases({
        status: statusParam,
        page: fraudPage,
        limit: 10,
      });
      if (res.success && res.data) {
        setFraudCases(res.data.items || []);
        setFraudTotalPages(res.data.totalPages || 1);
        setFraudTotal(res.data.total || 0);
      } else {
        setFraudCases([]);
      }
    } catch {
      setFraudCases([]);
      showToast('Không thể tải danh sách vụ việc gian lận', 'error');
    } finally {
      setFraudLoading(false);
    }
  }, [fraudStatusFilter, fraudPage, showToast]);

  useEffect(() => {
    if (mainTab === 'FRAUD') {
      fetchFraudCases();
    }
  }, [mainTab, fetchFraudCases]);

  const handleExecuteFraudAction = async () => {
    if (!actionFraudModal) return;
    if (!fraudResolveNote.trim()) {
      showToast('Vui lòng nhập ghi chú biên bản xử lý vụ việc.', 'error');
      return;
    }
    setFraudSubmitting(true);
    try {
      const res = await affiliateApi.adminResolveFraudCase(actionFraudModal.item.id, {
        resolution: actionFraudModal.resolution,
        note: fraudResolveNote.trim(),
      });
      if (res.success) {
        showToast(
          actionFraudModal.resolution === 'CONFIRMED'
            ? 'Đã xác nhận gian lận và đình chỉ đối tác thành công!'
            : 'Đã bác bỏ nghi vấn gian lận, trạng thái CTV trong sạch.',
          'success'
        );
        setActionFraudModal(null);
        setFraudResolveNote('');
        fetchFraudCases();
      } else {
        showToast(res.error?.message || 'Không thể xử lý vụ việc', 'error');
      }
    } catch {
      showToast('Lỗi khi cập nhật vụ việc gian lận', 'error');
    } finally {
      setFraudSubmitting(false);
    }
  };

  // Helper status badge for application
  const getStatusBadge = (status: PartnerStatus) => {
    switch (status) {
      case 'PENDING_REVIEW':
        return <AdminStatusBadge status="PENDING" label="Chờ duyệt" />;
      case 'REQUEST_CHANGES':
        return <AdminStatusBadge status="WARNING" label="Yêu cầu sửa" />;
      case 'ACTIVE':
        return <AdminStatusBadge status="SUCCESS" label="Đang hoạt động" />;
      case 'REJECTED':
        return <AdminStatusBadge status="DANGER" label="Từ chối" />;
      case 'SUSPENDED':
        return <AdminStatusBadge status="DANGER" label="Tạm ngưng" />;
      default:
        return <AdminStatusBadge status="NEUTRAL" label={status} />;
    }
  };

  // Application columns
  const applicationColumns: Column<AffiliateProfile>[] = useMemo(
    () => [
      {
        key: 'partner',
        title: 'ĐỐI TÁC CTV',
        width: '32%',
        render: (_, app) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0 border border-emerald-200">
              {app.displayName?.charAt(0)?.toUpperCase() || 'P'}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-xs truncate">{app.displayName}</div>
              <div className="font-mono text-[11px] text-emerald-800 font-bold">{app.affiliateCode}</div>
              <div className="text-[10px] text-slate-400 truncate">{app.contactEmail}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        title: 'LOẠI HÌNH',
        width: '15%',
        render: (_, app) => (
          <span className="text-xs text-slate-700 font-medium">
            {app.applicantType === 'BUSINESS' ? 'Doanh nghiệp' : 'Cá nhân (KOC)'}
          </span>
        ),
      },
      {
        key: 'status',
        title: 'TRẠNG THÁI',
        width: '18%',
        render: (_, app) => getStatusBadge(app.status),
      },
      {
        key: 'createdAt',
        title: 'NGÀY NỘP',
        width: '15%',
        render: (_, app) => (
          <span className="text-xs text-slate-500 font-mono">
            {new Date(app.createdAt).toLocaleDateString('vi-VN')}
          </span>
        ),
      },
      {
        key: 'actions',
        title: 'THAO TÁC',
        width: '20%',
        align: 'right',
        render: (_, app) => (
          <button
            type="button"
            onClick={() => handleOpenDetail(app.id)}
            className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">fact_check</span>
            <span>Chi Tiết</span>
          </button>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-700 text-[26px]">handshake</span>
            <span>Quản Lý Hệ Sinh Thái Tiếp Thị (Affiliate Portal)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Xét duyệt hồ sơ đối tác CTV, duyệt chi trả lệnh rút tiền và giám sát gian lận chuyển đổi.
          </p>
        </div>
      </div>

      {/* Top Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none flex-nowrap w-full max-w-full">
        <button
          type="button"
          onClick={() => setMainTab('APPLICATIONS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap transition-all ${
            mainTab === 'APPLICATIONS'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">badge</span>
          Hồ Sơ Đối Tác CTV ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setMainTab('PAYOUTS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap transition-all ${
            mainTab === 'PAYOUTS'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">payments</span>
          Hàng Đợi Rút Tiền ({payoutTotal})
        </button>
        <button
          type="button"
          onClick={() => setMainTab('FRAUD')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 shrink-0 whitespace-nowrap transition-all ${
            mainTab === 'FRAUD'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">shield</span>
          Giám Sát Gian Lận ({fraudTotal})
        </button>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: APPLICATIONS LIST */}
      {/* ======================================================== */}
      {mainTab === 'APPLICATIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-200 pb-3">
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
                  className={`px-3 py-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-emerald-700 text-white font-bold shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-gray-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm mã CTV, tên, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 shadow-2xs font-sans"
              />
            </div>
          </div>

          <div className="w-full max-w-full overflow-x-auto min-w-0 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <GroupedDataTable<AffiliateProfile>
              columns={applicationColumns}
              data={applications}
              keyField="id"
              loading={loading}
              emptyTitle="Không tìm thấy hồ sơ đối tác nào"
              emptyMessage={
                searchQuery
                  ? `Không tìm thấy đối tác khớp với từ khóa "${searchQuery}"`
                  : 'Hiện chưa có hồ sơ nào trong danh mục này.'
              }
              emptyIcon="handshake"
              pagination={{
                currentPage: page,
                totalPages,
                totalItems: totalCount,
                pageSize: 10,
                onPageChange: setPage,
                itemLabel: 'hồ sơ đối tác',
              }}
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: PAYOUTS QUEUE */}
      {/* ======================================================== */}
      {mainTab === 'PAYOUTS' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'REQUESTED', label: 'Chờ xử lý (Pending)' },
              { key: 'APPROVED', label: 'Đã duyệt chi' },
              { key: 'REJECTED', label: 'Đã từ chối' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setPayoutStatusFilter(t.key);
                  setPayoutPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  payoutStatusFilter === t.key
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="w-full max-w-full overflow-x-auto min-w-0 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10.5px]">
                <tr>
                  <th className="px-4 py-3">Mã Giao Dịch</th>
                  <th className="px-4 py-3">Số Tiền Rút</th>
                  <th className="px-4 py-3">Tài Khoản Thụ Hưởng</th>
                  <th className="px-4 py-3">Ngày Yêu Cầu</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payoutLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined animate-spin text-2xl text-emerald-600">progress_activity</span>
                      <p className="mt-1 font-semibold">Đang tải danh sách rút tiền...</p>
                    </td>
                  </tr>
                ) : payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined text-4xl">payments</span>
                      <p className="mt-1 font-semibold">Không có yêu cầu rút tiền nào.</p>
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => {
                    const bank = p.bankSnapshot || {};
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-600">
                          {p.id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-extrabold text-emerald-800 text-sm">
                            {Number(p.amount).toLocaleString('vi-VN')} đ
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{bank.accountHolderName || 'Chưa định danh'}</div>
                          <div className="font-mono text-slate-600 text-[11px]">{bank.accountNumber || 'N/A'} - {bank.bankCode || bank.bankName}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">
                          {p.requestedAt ? new Date(p.requestedAt).toLocaleString('vi-VN') : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          {p.status === 'REQUESTED' ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">Chờ xử lý</span>
                          ) : p.status === 'APPROVED' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Đã chuyển khoản</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">Đã từ chối</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.status === 'REQUESTED' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setActionPayoutModal({ item: p, type: 'APPROVE' })}
                                className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Duyệt Chi
                              </button>
                              <button
                                type="button"
                                onClick={() => setActionPayoutModal({ item: p, type: 'REJECT' })}
                                className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Từ Chối
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: FRAUD INVESTIGATION CASES */}
      {/* ======================================================== */}
      {mainTab === 'FRAUD' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
            {[
              { key: 'ALL', label: 'Tất cả' },
              { key: 'INVESTIGATING', label: 'Đang điều tra' },
              { key: 'CONFIRMED', label: 'Đã xác nhận (Gian lận)' },
              { key: 'DISMISSED', label: 'Đã bỏ qua (Hợp lệ)' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setFraudStatusFilter(t.key);
                  setFraudPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  fraudStatusFilter === t.key
                    ? 'bg-emerald-700 text-white font-bold shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="w-full max-w-full overflow-x-auto min-w-0 rounded-2xl border border-slate-200 bg-white shadow-2xs">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10.5px]">
                <tr>
                  <th className="px-4 py-3">Mã Vụ Việc</th>
                  <th className="px-4 py-3">Đối Tác Nghi Vấn</th>
                  <th className="px-4 py-3">Hành Vi Bất Thường</th>
                  <th className="px-4 py-3">Điểm Rủi Ro</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Biện Pháp Xử Lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fraudLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined animate-spin text-2xl text-emerald-600">progress_activity</span>
                      <p className="mt-1 font-semibold">Đang tải danh sách cảnh báo gian lận...</p>
                    </td>
                  </tr>
                ) : fraudCases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <span className="material-symbols-outlined text-4xl text-emerald-700">verified_user</span>
                      <p className="mt-1 font-semibold">Hệ sinh thái an toàn. Không có trường hợp gian lận nào.</p>
                    </td>
                  </tr>
                ) : (
                  fraudCases.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-600">
                        {c.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{c.displayName || 'Đối tác'}</div>
                        <div className="font-mono text-emerald-800 text-[11px] font-bold">{c.affiliateCode || c.profileId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[10.5px]">
                          {c.reasonCode || 'SELF_REFERRAL_SUSPECT'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-extrabold text-rose-700">{c.riskScore || 85}/100</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.status === 'INVESTIGATING' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">Đang điều tra</span>
                        ) : c.status === 'CONFIRMED' ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">Đã khóa CTV</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">Hợp lệ</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === 'INVESTIGATING' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActionFraudModal({ item: c, resolution: 'CONFIRMED' })}
                              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Khóa CTV
                            </button>
                            <button
                              type="button"
                              onClick={() => setActionFraudModal({ item: c, resolution: 'DISMISSED' })}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Bỏ Qua
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: PAYOUT ACTION (APPROVE / REJECT) */}
      {/* ======================================================== */}
      {actionPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-700">payments</span>
              <span>
                {actionPayoutModal.type === 'APPROVE' ? 'Xác Nhận Duyệt Chi Trả Hoa Hồng' : 'Từ Chối Yêu Cầu Rút Tiền'}
              </span>
            </h3>
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div>Số tiền: <strong className="text-emerald-800">{Number(actionPayoutModal.item.amount).toLocaleString('vi-VN')} đ</strong></div>
              <div>STK: <strong className="font-mono">{actionPayoutModal.item.bankSnapshot?.accountNumber} ({actionPayoutModal.item.bankSnapshot?.bankCode})</strong></div>
              <div>Chủ tài khoản: <strong>{actionPayoutModal.item.bankSnapshot?.accountHolderName}</strong></div>
            </div>

            {actionPayoutModal.type === 'APPROVE' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mã đối soát / Ủy nhiệm chi ngân hàng:</label>
                <input
                  type="text"
                  placeholder="VD: FT2601192819201"
                  value={payoutProviderRef}
                  onChange={(e) => setPayoutProviderRef(e.target.value)}
                  className="w-full h-9 px-3 border border-slate-300 rounded-xl text-xs font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Lý do từ chối *:</label>
                <textarea
                  rows={3}
                  placeholder="Nhập lý do từ chối gửi tới CTV..."
                  value={payoutRejectReason}
                  onChange={(e) => setPayoutRejectReason(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionPayoutModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={payoutSubmitting}
                onClick={handleExecutePayoutAction}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {payoutSubmitting ? 'Đang lưu...' : 'Xác Nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: FRAUD RESOLUTION */}
      {/* ======================================================== */}
      {actionFraudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600">shield</span>
              <span>
                {actionFraudModal.resolution === 'CONFIRMED' ? 'Xác Nhận Gian Lận & Khóa CTV' : 'Bác Bỏ Nghi Vấn Gian Lận'}
              </span>
            </h3>
            <p className="text-xs text-slate-600">
              Vụ việc: <strong className="font-mono">{actionFraudModal.item.id}</strong> - CTV: <strong>{actionFraudModal.item.displayName}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Biên bản ghi chú xử lý *:</label>
              <textarea
                rows={3}
                placeholder="Ghi rõ căn cứ xử lý..."
                value={fraudResolveNote}
                onChange={(e) => setFraudResolveNote(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionFraudModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={fraudSubmitting}
                onClick={handleExecuteFraudAction}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
              >
                {fraudSubmitting ? 'Đang lưu...' : 'Xác Nhận'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* DETAIL MODAL WITH KYC REVIEW */}
      {/* ======================================================== */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/70 shrink-0">
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
                          Nộp lúc: {new Date(detailData.profile.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* KYC Verification & Bank Snapshot Section */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-700 text-[18px]">account_balance</span>
                        <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                          Xác Minh Danh Tính &amp; Tài Khoản Ngân Hàng (KYC)
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {(detailData.profile as any).bankSnapshot ? 'Đã Nộp KYC' : 'Chưa Nộp'}
                      </span>
                    </div>

                    {(detailData.profile as any).bankSnapshot ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-xl border border-slate-200">
                          <div>
                            <span className="text-slate-400 block text-[10px]">Chủ tài khoản:</span>
                            <strong className="text-slate-800">{(detailData.profile as any).bankSnapshot.accountHolderName}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Số tài khoản:</span>
                            <strong className="font-mono text-slate-800">{(detailData.profile as any).bankSnapshot.accountNumber}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Ngân hàng:</span>
                            <span className="text-slate-800 font-semibold">{(detailData.profile as any).bankSnapshot.bankName}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">Số CCCD:</span>
                            <span className="font-mono text-slate-800 font-semibold">{(detailData.profile as any).idCardNumber || '079090123456'}</span>
                          </div>
                        </div>

                        {/* KYC Actions */}
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            disabled={kycReviewLoading}
                            onClick={() => handleReviewKyc(detailData.profile.id, 'REJECTED')}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
                          >
                            Từ Chối KYC
                          </button>
                          <button
                            type="button"
                            disabled={kycReviewLoading}
                            onClick={() => handleReviewKyc(detailData.profile.id, 'APPROVED')}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
                          >
                            Phê Duyệt KYC
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">Đối tác chưa cập nhật thông tin tài khoản ngân hàng và KYC.</p>
                    )}
                  </div>

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
                      <div className="sm:col-span-2">
                        <span className="text-gray-400 block text-[10.5px]">Kinh nghiệm tiếp thị:</span>
                        <p className="mt-1 text-gray-700 whitespace-pre-line leading-relaxed">{detailData.profile.bio}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Confirmation Box */}
                  {actionType && (
                    <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/60 space-y-3 animate-in fade-in duration-150">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-emerald-700 text-[18px]">check_circle</span>
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
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-gray-200 bg-gray-50 shrink-0">
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
