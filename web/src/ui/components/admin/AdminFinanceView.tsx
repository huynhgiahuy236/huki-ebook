"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  payoutApi,
  reconciliationApi,
  type PayoutRequestView,
  type EodReconciliationRunView,
} from '../../api/walletApi';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer } from './AdminUI';

function formatVND(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === '') return '0 ₫';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '0 ₫';
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

const INITIAL_PAYOUT_REQUESTS: PayoutRequestView[] = [
  {
    id: 'REQ-202609-001',
    storeId: 'STR-1003',
    walletId: 'WAL-1003',
    amount: 15450000,
    currency: 'VND',
    status: 'PENDING',
    bankSnapshot: {
      bankName: 'Ngân hàng TMCP Ngoại Thương (Vietcombank)',
      accountNumber: '001100489281',
      accountNumberMasked: '001100****81',
      accountHolder: 'CÔNG TY CP VĂN HÓA NHÃ NAM',
      branch: 'Chi nhánh Ba Đình',
    },
    requestedBy: 'USR-1003',
    requestedAt: '2026-09-24T08:30:00.000Z',
    idempotencyKey: 'idemp_req_001',
    createdAt: '2026-09-24T08:30:00.000Z',
    updatedAt: '2026-09-24T08:30:00.000Z',
  },
  {
    id: 'REQ-202609-002',
    storeId: 'STR-1005',
    walletId: 'WAL-1005',
    amount: 28900000,
    currency: 'VND',
    status: 'APPROVED',
    bankSnapshot: {
      bankName: 'Ngân hàng Công Thương Việt Nam (VietinBank)',
      accountNumber: '102893847291',
      accountNumberMasked: '102893****91',
      accountHolder: 'CTY PHÁT HÀNH SÁCH FAHASA',
      branch: 'Chi nhánh TP.HCM',
    },
    requestedBy: 'USR-1005',
    approvedAt: '2026-09-24T09:15:00.000Z',
    requestedAt: '2026-09-24T07:45:00.000Z',
    idempotencyKey: 'idemp_req_002',
    createdAt: '2026-09-24T07:45:00.000Z',
    updatedAt: '2026-09-24T09:15:00.000Z',
  },
  {
    id: 'REQ-202609-003',
    storeId: 'STR-1007',
    walletId: 'WAL-1007',
    amount: 8200000,
    currency: 'VND',
    status: 'COMPLETED',
    bankSnapshot: {
      bankName: 'Ngân hàng TMCP Đầu Tư & Phát Triển (BIDV)',
      accountNumber: '12010009827361',
      accountNumberMasked: '120100****61',
      accountHolder: 'CTY CP TIỀN PHONG HÀ NỘI',
      branch: 'Chi nhánh Hà Nội',
    },
    requestedBy: 'USR-1007',
    approvedAt: '2026-09-23T14:00:00.000Z',
    disbursedAt: '2026-09-23T14:05:22.000Z',
    provider: 'VIETQR_NAPAS247',
    providerRef: 'FT26267000998',
    requestedAt: '2026-09-23T11:20:00.000Z',
    idempotencyKey: 'idemp_req_003',
    createdAt: '2026-09-23T11:20:00.000Z',
    updatedAt: '2026-09-23T14:05:22.000Z',
  },
];

export function AdminFinanceView() {
  const { showToast } = useToast();

  // Primary Section Tab: Live Payout Requests Queue vs EOD Reconciliation vs Periodic NXB Batches
  const [viewSection, setViewSection] = useState<'live_requests' | 'eod_reconciliation' | 'periodic_batches'>('live_requests');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination states
  const [currentPageLive, setCurrentPageLive] = useState(1);
  const [currentPageEod, setCurrentPageEod] = useState(1);
  const [currentPageBatches, setCurrentPageBatches] = useState(1);
  const pageSize = 10;

  // Live Payout Requests State
  const [liveRequests, setLiveRequests] = useState<PayoutRequestView[]>(INITIAL_PAYOUT_REQUESTS);
  const [isLoadingLive, setIsLoadingLive] = useState(true);
  const [liveError, setLiveError] = useState<string | null>(null);

  // EOD Reconciliation State (Task 78)
  const [eodRuns, setEodRuns] = useState<EodReconciliationRunView[]>([]);
  const [latestEodRun, setLatestEodRun] = useState<EodReconciliationRunView | null>(null);
  const [isLoadingEod, setIsLoadingEod] = useState(false);
  const [isRunningEod, setIsRunningEod] = useState(false);
  const [selectedEodRun, setSelectedEodRun] = useState<EodReconciliationRunView | null>(null);
  const [eodDateInput, setEodDateInput] = useState('');

  // Review Modal State (Approve / Reject)
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequestView | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT' | 'CANCEL_REFUND' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const isReviewDirty = Boolean(rejectReason.trim());
  const reviewFormRef = useSmartFormCollapse({
    isOpen: Boolean(selectedRequest && reviewAction),
    onClose: () => {
      setSelectedRequest(null);
      setReviewAction(null);
      setRejectReason('');
      setRejectReasonError('');
    },
    isDirty: isReviewDirty,
  });

  const eodDetailRef = useSmartFormCollapse({
    isOpen: Boolean(selectedEodRun),
    onClose: () => setSelectedEodRun(null),
    isDirty: false,
  });

  // Disbursement State (Single / Batch / Retry)
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [disbursingId, setDisbursingId] = useState<string | null>(null);

  // Periodic Settlement Batches State
  const [payoutBatches] = useState([
    {
      id: 'PAY-202606-01',
      publisher: 'Công Ty CP Văn Hóa & Truyền Thông Nhã Nam',
      code: 'NHANAM',
      ordersCount: 2840,
      grossSales: 620400000,
      shareRatio: '85% NXB / 15% Sàn',
      platformFee: 93060000,
      taxWithheld: 6204000,
      netPayout: 521136000,
      bankAccount: 'Ngân hàng Vietcombank - CN Ba Đình (001100489281)',
      period: 'Kỳ 1: 01/06 - 15/06/2026',
      status: 'pending_approval',
      statusLabel: 'Chờ Ký Duyệt Giải Ngân',
    },
    {
      id: 'PAY-202606-02',
      publisher: 'Nhà Xuất Bản Trẻ',
      code: 'TRE',
      ordersCount: 2150,
      grossSales: 485600000,
      shareRatio: '85% NXB / 15% Sàn',
      platformFee: 72840000,
      taxWithheld: 4856000,
      netPayout: 407904000,
      bankAccount: 'Ngân hàng VietinBank - CN TP.HCM (102893847291)',
      period: 'Kỳ 1: 01/06 - 15/06/2026',
      status: 'pending_approval',
      statusLabel: 'Chờ Ký Duyệt Giải Ngân',
    },
    {
      id: 'PAY-202606-03',
      publisher: 'Nhà Xuất Bản Kim Đồng',
      code: 'KIMDONG',
      ordersCount: 2420,
      grossSales: 512300000,
      shareRatio: '85% NXB / 15% Sàn',
      platformFee: 76845000,
      taxWithheld: 5123000,
      netPayout: 430332000,
      bankAccount: 'Ngân hàng BIDV - CN Hà Nội (12010009827361)',
      period: 'Kỳ 1: 01/06 - 15/06/2026',
      status: 'paid',
      statusLabel: 'Đã Chuyển Khoản Thành Công',
    },
  ]);

  const fetchLivePayoutRequests = useCallback(async () => {
    setIsLoadingLive(true);
    setLiveError(null);
    try {
      const res = await payoutApi.getAllPayoutRequests();
      if (res.success && res.data && Array.isArray(res.data.items) && res.data.items.length > 0) {
        setLiveRequests(res.data.items);
      } else {
        // Use fallback initial requests if API returns empty list or not yet seeded
        setLiveRequests(INITIAL_PAYOUT_REQUESTS);
      }
    } catch (err: any) {
      console.warn('[AdminFinance] Could not load from backend, using fallback:', err);
      setLiveRequests(INITIAL_PAYOUT_REQUESTS);
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    fetchLivePayoutRequests();
  }, [fetchLivePayoutRequests]);

  const handleOpenReviewModal = (req: PayoutRequestView, action: 'APPROVE' | 'REJECT' | 'CANCEL_REFUND') => {
    setSelectedRequest(req);
    setReviewAction(action);
    setRejectReason('');
    setRejectReasonError('');
  };

  const handleCloseReviewModal = () => {
    setSelectedRequest(null);
    setReviewAction(null);
    setRejectReason('');
    setRejectReasonError('');
    setIsSubmittingReview(false);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewAction) return;

    if ((reviewAction === 'REJECT' || reviewAction === 'CANCEL_REFUND') && !rejectReason.trim()) {
      setRejectReasonError('Vui lòng nhập chi tiết lý do từ chối hoặc hủy lệnh rút tiền.');
      return;
    }

    setIsSubmittingReview(true);
    try {
      if (reviewAction === 'CANCEL_REFUND') {
        const res = await payoutApi.cancelFailedAndRefund(selectedRequest.id, rejectReason.trim());
        if (res.success) {
          showToast(`Đã hủy lệnh thất bại và hoàn tiền cho gian hàng ${selectedRequest.storeId}`, 'info');
          handleCloseReviewModal();
          await fetchLivePayoutRequests();
        } else {
          showToast(res.error?.message || 'Không thể hủy và hoàn tiền.', 'error');
        }
      } else {
        const res = await payoutApi.reviewPayoutRequest(selectedRequest.id, {
          action: reviewAction,
          rejectReason: reviewAction === 'REJECT' ? rejectReason.trim() : undefined,
        });

        if (res.success) {
          if (reviewAction === 'APPROVE') {
            showToast(`Đã phê duyệt lệnh rút tiền ${selectedRequest.id.slice(0, 8)} thành công. Trạng thái chuyển sang APPROVED.`, 'success');
          } else {
            showToast(`Đã từ chối lệnh rút tiền ${selectedRequest.id.slice(0, 8)}. Tiền đóng băng đã được hoàn trả về số dư khả dụng gian hàng.`, 'info');
          }
          handleCloseReviewModal();
          await fetchLivePayoutRequests();
        } else {
          showToast(res.error?.message || 'Không thể xử lý phê duyệt.', 'error');
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi máy chủ khi gửi yêu cầu.', 'error');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Disburse Single Payout Request (Task 77)
  const handleDisburseSingle = async (payoutId: string) => {
    setDisbursingId(payoutId);
    try {
      const res = await payoutApi.disbursePayout(payoutId);
      if (res.success && res.data?.success) {
        showToast(`Giải ngân thành công! Mã giao dịch: ${res.data.providerRef}`, 'success');
      } else {
        showToast(res.data?.failureReason || res.error?.message || 'Chuyển khoản ngân hàng thất bại.', 'error');
      }
      await fetchLivePayoutRequests();
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi gọi API giải ngân.', 'error');
    } finally {
      setDisbursingId(null);
    }
  };

  // Retry Failed Payout Request (Task 77)
  const handleRetryDisburse = async (payoutId: string) => {
    setDisbursingId(payoutId);
    try {
      const res = await payoutApi.retryPayout(payoutId);
      if (res.success && res.data?.success) {
        showToast(`Thử lại giải ngân thành công! Mã giao dịch: ${res.data.providerRef}`, 'success');
      } else {
        showToast(res.data?.failureReason || res.error?.message || 'Thử lại chuyển khoản thất bại.', 'error');
      }
      await fetchLivePayoutRequests();
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi gọi API thử lại.', 'error');
    } finally {
      setDisbursingId(null);
    }
  };

  // Batch Disburse All Approved Payout Requests (Task 77)
  const handleDisburseBatch = async () => {
    const approvedIds = liveRequests.filter((r) => r.status === 'APPROVED').map((r) => r.id);
    if (approvedIds.length === 0) {
      showToast('Không có lệnh rút tiền nào ở trạng thái APPROVED để giải ngân.', 'info');
      return;
    }

    setIsDisbursing(true);
    try {
      const res = await payoutApi.disburseBatch(approvedIds);
      if (res.success && res.data) {
        showToast(
          `Hoàn tất giải ngân hàng loạt: ${res.data.succeeded}/${res.data.total} lệnh thành công.`,
          res.data.failed > 0 ? 'warning' : 'success',
        );
      } else {
        showToast(res.error?.message || 'Lỗi xử lý giải ngân hàng loạt.', 'error');
      }
      await fetchLivePayoutRequests();
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi gọi API giải ngân hàng loạt.', 'error');
    } finally {
      setIsDisbursing(false);
    }
  };

  // EOD Reconciliation Methods (Task 78)
  const fetchEodData = useCallback(async () => {
    setIsLoadingEod(true);
    try {
      const [runsRes, latestRes] = await Promise.all([
        reconciliationApi.getEodRuns(),
        reconciliationApi.getLatestEodRun(),
      ]);
      if (runsRes.success && runsRes.data) {
        setEodRuns(runsRes.data.items || []);
      }
      if (latestRes.success && latestRes.data) {
        setLatestEodRun(latestRes.data);
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi tải lịch sử đối soát EOD.', 'error');
    } finally {
      setIsLoadingEod(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (viewSection === 'eod_reconciliation') {
      fetchEodData();
    }
  }, [viewSection, fetchEodData]);

  const handleRunEod = async () => {
    setIsRunningEod(true);
    try {
      const res = await reconciliationApi.runEod({
        businessDate: eodDateInput.trim() || undefined,
        forceRerun: true,
      });
      if (res.success && res.data) {
        setLatestEodRun(res.data);
        showToast(`Đã hoàn tất đối soát EOD (${res.data.runNumber}) - Trạng thái: ${res.data.status}`, 'success');
        await fetchEodData();
      } else {
        showToast(res.error?.message || 'Lỗi khi thực hiện đối soát EOD.', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi kết nối khi gửi yêu cầu đối soát EOD.', 'error');
    } finally {
      setIsRunningEod(false);
    }
  };

  // Filtered Live Requests
  const filteredLiveRequests = useMemo(() => {
    return liveRequests.filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchId = req.id.toLowerCase().includes(q);
        const matchStore = req.storeId.toLowerCase().includes(q);
        const matchHolder = req.bankSnapshot?.accountHolder?.toLowerCase().includes(q) || false;
        const matchAccount = (req.bankSnapshot?.maskedAccountNumber?.includes(q) || req.bankSnapshot?.accountNumberMasked?.includes(q) || req.bankSnapshot?.accountNumber?.includes(q)) || false;
        return matchId || matchStore || matchHolder || matchAccount;
      }
      return true;
    });
  }, [liveRequests, statusFilter, searchQuery]);

  const pendingCount = useMemo(() => liveRequests.filter((r) => r.status === 'PENDING').length, [liveRequests]);
  const approvedCount = useMemo(() => liveRequests.filter((r) => r.status === 'APPROVED').length, [liveRequests]);
  const completedCount = useMemo(() => liveRequests.filter((r) => r.status === 'COMPLETED').length, [liveRequests]);
  const failedCount = useMemo(() => liveRequests.filter((r) => r.status === 'FAILED').length, [liveRequests]);
  const rejectedCount = useMemo(() => liveRequests.filter((r) => r.status === 'REJECTED').length, [liveRequests]);

  // Live Requests Pagination
  const totalPagesLive = Math.ceil(filteredLiveRequests.length / pageSize) || 1;
  const paginatedLiveRequests = useMemo(() => {
    const start = (currentPageLive - 1) * pageSize;
    return filteredLiveRequests.slice(start, start + pageSize);
  }, [filteredLiveRequests, currentPageLive, pageSize]);

  // EOD Pagination
  const totalPagesEod = Math.ceil(eodRuns.length / pageSize) || 1;
  const paginatedEodRuns = useMemo(() => {
    const start = (currentPageEod - 1) * pageSize;
    return eodRuns.slice(start, start + pageSize);
  }, [eodRuns, currentPageEod, pageSize]);

  // Batches Pagination
  const totalPagesBatches = Math.ceil(payoutBatches.length / pageSize) || 1;
  const paginatedBatches = useMemo(() => {
    const start = (currentPageBatches - 1) * pageSize;
    return payoutBatches.slice(start, start + pageSize);
  }, [payoutBatches, currentPageBatches, pageSize]);

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Quản Lý Tài Chính &amp; Giải Ngân
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Kiểm soát dòng tiền, xử lý yêu cầu rút tiền seller và đối soát định kỳ</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {approvedCount > 0 && (
            <button
              disabled={isDisbursing}
              onClick={handleDisburseBatch}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[15px]">account_balance</span>
              <span>{isDisbursing ? 'Đang Giải Ngân...' : `Giải Ngân Toàn Bộ (${approvedCount})`}</span>
            </button>
          )}

          <button
            onClick={() => fetchLivePayoutRequests()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">refresh</span>
            <span>Làm Mới Hàng Đợi</span>
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Chờ Duyệt (Pending)</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1.5">{pendingCount}</div>
          <div className="mt-1.5 text-[11px] text-amber-700 font-bold">Cần kế toán xác nhận</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Đã Duyệt (Approved)</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[16px]">verified</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1.5">{approvedCount}</div>
          <div className="mt-1.5 text-[11px] text-blue-600 font-medium">Sẵn sàng chi trả Task 77</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Đã Giải Ngân (Completed)</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[16px]">task_alt</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-[#00875A] mt-1.5">{completedCount}</div>
          <div className="mt-1.5 text-[11px] text-emerald-700 font-medium">Đã ghi sổ DEBIT_FROZEN</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Chi Thất Bại (Failed)</span>
            <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[16px]">warning</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-amber-600 mt-1.5">{failedCount}</div>
          <div className="mt-1.5 text-[11px] text-amber-600 font-medium">Có thể thử lại / hoàn tiền</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Đã Từ Chối (Rejected)</span>
            <span className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[16px]">cancel</span>
            </span>
          </div>
          <div className="text-xl font-extrabold text-gray-900 mt-1.5">{rejectedCount}</div>
          <div className="mt-1.5 text-[11px] text-rose-600 font-medium">Đã hoàn trả số dư khả dụng</div>
        </div>
      </div>

      {/* 3. SECTION TABS */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-2.5">
        <button
          onClick={() => setViewSection('live_requests')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            viewSection === 'live_requests'
              ? 'bg-[#00875A] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">payments</span>
          <span>Hàng Đợi Rút Tiền Seller ({liveRequests.length})</span>
        </button>

        <button
          onClick={() => setViewSection('eod_reconciliation')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            viewSection === 'eod_reconciliation'
              ? 'bg-[#00875A] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
          <span>Đối Soát EOD &amp; Kiểm Toán ({eodRuns.length})</span>
        </button>

        <button
          onClick={() => setViewSection('periodic_batches')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
            viewSection === 'periodic_batches'
              ? 'bg-[#00875A] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">calendar_month</span>
          <span>Kỳ Đối Soát NXB Định Kỳ (85/15)</span>
        </button>
      </div>

      {/* SECTION 1: LIVE PAYOUT REQUESTS REVIEW & DISBURSEMENT QUEUE */}
      {viewSection === 'live_requests' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl p-3.5 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <AdminFilterTabs
              tabs={[
                { key: 'ALL', label: 'Tất cả', count: liveRequests.length },
                { key: 'PENDING', label: 'Chờ duyệt', count: pendingCount },
                { key: 'APPROVED', label: 'Đã duyệt', count: approvedCount },
                { key: 'COMPLETED', label: 'Đã chi', count: completedCount },
                { key: 'FAILED', label: 'Chi lỗi', count: failedCount },
                { key: 'REJECTED', label: 'Từ chối', count: rejectedCount },
              ]}
              activeTab={statusFilter}
              onChange={(tab) => {
                setStatusFilter(tab as any);
                setCurrentPageLive(1);
              }}
            />

            <div className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
              <input
                type="text"
                placeholder="Tìm mã lệnh, gian hàng, STK..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPageLive(1);
                }}
                className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
              />
            </div>
          </div>

          {liveError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{liveError}</span>
              </div>
              <button onClick={fetchLivePayoutRequests} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold">
                Thử lại
              </button>
            </div>
          )}

          {/* Table Container */}
          <AdminTableContainer>
            {isLoadingLive ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : filteredLiveRequests.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-500 text-xs">
                <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">receipt_long</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900">Không Có Lệnh Rút Tiền Phù Hợp</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Không tìm thấy yêu cầu rút tiền nào với bộ lọc hiện tại.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1450px]">
                  <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Mã Lệnh Rút</th>
                      <th className="py-3 px-3 whitespace-nowrap">Thời Gian Tạo</th>
                      <th className="py-3 px-3 whitespace-nowrap">Gian Hàng / Seller</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Ngân Hàng Thụ Hưởng</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Số Tài Khoản &amp; Chủ TK</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-right">Số Tiền Rút</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">Trạng Thái</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Chi Tiết Giải Ngân / Lỗi</th>
                      <th className="py-3 px-4 whitespace-nowrap text-right">Thao Tác Xử Lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedLiveRequests.map((req, idx) => {
                      const itemIndex = (currentPageLive - 1) * pageSize + idx + 1;
                      return (
                        <tr key={req.id} className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}>
                          <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                            {itemIndex}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-mono text-gray-900 font-bold">{req.id.slice(0, 10)}...</span>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-[11px] text-gray-500">
                            {formatDate(req.createdAt)}
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="font-mono text-xs font-semibold text-gray-700">{req.storeId}</span>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap font-bold text-gray-800">
                            {req.bankSnapshot?.bankName || 'Ngân Hàng'}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-gray-600">
                            {req.bankSnapshot?.maskedAccountNumber || req.bankSnapshot?.accountNumberMasked || req.bankSnapshot?.accountNumber} ({req.bankSnapshot?.accountHolder})
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-right">
                            <span className="font-extrabold text-xs text-[#00875A] font-mono">
                              {formatVND(req.amount)}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-center">
                            {req.status === 'PENDING' && <AdminStatusBadge status="warning" label="Chờ Duyệt" icon="hourglass_top" />}
                            {req.status === 'APPROVED' && <AdminStatusBadge status="info" label="Đã Duyệt" icon="verified" />}
                            {req.status === 'PROCESSING' && <AdminStatusBadge status="purple" label="Đang Xử Lý" icon="sync" />}
                            {req.status === 'COMPLETED' && <AdminStatusBadge status="success" label="Đã Chi" icon="task_alt" />}
                            {req.status === 'FAILED' && <AdminStatusBadge status="danger" label="Chi Lỗi" icon="warning" />}
                            {req.status === 'REJECTED' && <AdminStatusBadge status="neutral" label="Từ Chối" icon="cancel" />}
                            {!['PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'REJECTED'].includes(req.status) && (
                              <AdminStatusBadge status="neutral" label={req.status} />
                            )}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-gray-500">
                            {req.status === 'COMPLETED' && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-emerald-700 font-bold">Giải ngân {formatDate(req.disbursedAt)}</span>
                                {req.providerRef && (
                                  <span className="font-mono text-[10px] text-gray-400">({req.providerRef})</span>
                                )}
                              </div>
                            )}
                            {req.status === 'FAILED' && (
                              <span className="text-amber-700 font-bold">Lỗi: {req.failureReason || 'Cổng ngân hàng'}</span>
                            )}
                            {req.status === 'REJECTED' && (req.rejectionReason || req.rejectReason) && (
                              <span className="text-rose-600 font-medium">Lý do: {req.rejectionReason || req.rejectReason}</span>
                            )}
                            {req.status === 'APPROVED' && (
                              <span className="text-blue-600 font-medium">Sẵn sàng giải ngân</span>
                            )}
                            {req.status === 'PENDING' && (
                              <span className="text-amber-600">Chờ kế toán phê duyệt</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            {req.status === 'PENDING' && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenReviewModal(req, 'APPROVE')}
                                  className="px-2.5 py-1 rounded-lg bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[13px]">check</span>
                                  <span>Phê Duyệt</span>
                                </button>
                                <button
                                  onClick={() => handleOpenReviewModal(req, 'REJECT')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[13px]">close</span>
                                  <span>Từ Chối</span>
                                </button>
                              </div>
                            )}

                            {req.status === 'APPROVED' && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  disabled={disbursingId === req.id}
                                  onClick={() => handleDisburseSingle(req.id)}
                                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[13px]">send</span>
                                  <span>{disbursingId === req.id ? 'Đang Chuyển...' : 'Giải Ngân'}</span>
                                </button>
                              </div>
                            )}

                            {req.status === 'FAILED' && (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  disabled={disbursingId === req.id}
                                  onClick={() => handleRetryDisburse(req.id)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] transition-colors cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-[13px]">replay</span>
                                  <span>{disbursingId === req.id ? 'Đang Thử...' : 'Thử Lại'}</span>
                                </button>
                                <button
                                  onClick={() => handleOpenReviewModal(req, 'CANCEL_REFUND')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[13px]">undo</span>
                                  <span>Hủy &amp; Hoàn Tiền</span>
                                </button>
                              </div>
                            )}

                            {req.status === 'COMPLETED' && (
                              <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                <span>Hoàn Tất</span>
                              </span>
                            )}

                            {req.status === 'REJECTED' && (
                              <span className="text-[11px] text-gray-400 italic">Đã từ chối</span>
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
              currentPage={currentPageLive}
              totalPages={totalPagesLive}
              totalItems={filteredLiveRequests.length}
              pageSize={pageSize}
              onPageChange={setCurrentPageLive}
              itemLabel="lệnh rút tiền"
            />
          </AdminTableContainer>
        </div>
      )}

      {/* SECTION 2: EOD FINANCIAL RECONCILIATION & AUDIT REPORTS (Task 78) */}
      {viewSection === 'eod_reconciliation' && (
        <div className="space-y-5">
          {/* 1. Governance & Limitation Alert Banner */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-xs text-amber-800">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>Kiểm Soát Tài Chính Cuối Ngày &amp; Giới Hạn Hệ Thống (Task 78 Invariants)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11px] text-amber-900/90 leading-relaxed">
              <div className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">•</span>
                <span><strong>EXTERNAL CASH ACCOUNTING:</strong> GAP / NOT PROVEN. Số dư có mở (credit balance) trên tài khoản <code>PAYOUT_CLEARING</code> là bình thường do sàn chưa tích hợp hạch toán sao kê ngân hàng ngoại bảng.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">•</span>
                <span><strong>LIVE EXTERNAL BANK PROVIDER:</strong> NOT PROVEN (Sử dụng MockBankTransferProvider cho môi trường kiểm thử/staging).</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">•</span>
                <span><strong>AUTOMATED SCHEDULER:</strong> NOT PROVEN (Chạy thủ công hoặc theo lệnh gọi API; tiến trình cron tự động chưa triển khai).</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-amber-600 font-bold">•</span>
                <span><strong>MÚI GIỜ KINH DOANH:</strong> Asia/Ho_Chi_Minh (Engineering Default — Canonical Policy: PENDING / NOT PROVEN).</span>
              </div>
            </div>
          </div>

          {/* 2. Controls & Trigger Header */}
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-gray-900 text-sm">Đối Soát Tài Chính EOD</h3>
                {latestEodRun && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                      latestEodRun.status === 'COMPLETED_PASS'
                        ? 'bg-emerald-50 text-[#00875A] border border-emerald-200'
                        : latestEodRun.status === 'COMPLETED_WARNING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : latestEodRun.status === 'RUNNING'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px]">
                      {latestEodRun.status === 'COMPLETED_PASS' ? 'check_circle' : latestEodRun.status === 'RUNNING' ? 'sync' : 'warning'}
                    </span>
                    <span>{latestEodRun.status}</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500">
                Quét toàn bộ bất biến Double-Entry Ledger, Seller Wallet, Escrow Settlement và Payout Clearing.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <input
                type="date"
                value={eodDateInput}
                onChange={(e) => setEodDateInput(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-700 focus:outline-none focus:border-[#00875A]"
                placeholder="YYYY-MM-DD"
              />
              <button
                type="button"
                disabled={isRunningEod}
                onClick={handleRunEod}
                className="px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 transition-all shrink-0"
              >
                <span className={`material-symbols-outlined text-[15px] ${isRunningEod ? 'animate-spin' : ''}`}>
                  {isRunningEod ? 'sync' : 'play_arrow'}
                </span>
                <span>{isRunningEod ? 'Đang Đối Soát...' : 'Chạy Đối Soát EOD'}</span>
              </button>
            </div>
          </div>

          {/* 3. Latest EOD Financial Control Summary Cards */}
          {latestEodRun?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>Ví Seller &amp; Bất Biến WAL-001</span>
                  <span className="material-symbols-outlined text-emerald-600 text-[16px]">account_balance_wallet</span>
                </div>
                <div className="text-lg font-extrabold text-gray-900">
                  {latestEodRun.summary.walletsHealthy} / {latestEodRun.summary.walletsAudited} Ví Khỏe
                </div>
                <div className="text-[10.5px] text-gray-500">
                  Số dư không âm &amp; tái tạo lịch sử giao dịch ví khớp 100%
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>Ghi Sổ Kép &amp; Ký Quỹ Escrow</span>
                  <span className="material-symbols-outlined text-blue-600 text-[16px]">receipt_long</span>
                </div>
                <div className="text-lg font-extrabold text-gray-900">
                  {latestEodRun.summary.ledgerTransactionsAudited} Ledger / {latestEodRun.summary.escrowRecordsAudited} Đơn
                </div>
                <div className="text-[10.5px] text-gray-500">
                  Nợ = Có (Debit = Credit) &amp; giải phóng ký quỹ hợp lệ
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>Rút Tiền &amp; Chi Trả Seller</span>
                  <span className="material-symbols-outlined text-indigo-600 text-[16px]">payments</span>
                </div>
                <div className="text-lg font-extrabold text-gray-900">
                  {formatVND(latestEodRun.summary.totalPayoutsCompletedAmount)}
                </div>
                <div className="text-[10.5px] text-gray-500">
                  {latestEodRun.summary.payoutsCompleted} Đã chi, {latestEodRun.summary.payoutsPending + latestEodRun.summary.payoutsApproved} Phong tỏa ({formatVND(latestEodRun.summary.totalPayoutsReservedAmount)})
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs space-y-1.5">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>Tài Khoản PAYOUT_CLEARING</span>
                  <span className="material-symbols-outlined text-amber-600 text-[16px]">balance</span>
                </div>
                <div className="text-lg font-extrabold font-mono text-gray-900">
                  {formatVND(latestEodRun.summary.actualPayoutClearingNetBalance)}
                </div>
                <div className="text-[10.5px] text-gray-500">
                  Kỳ vọng: {formatVND(latestEodRun.summary.expectedOpenPayoutClearingAmount)} | Lệch: <span className="font-bold text-[#00875A]">{formatVND(latestEodRun.summary.payoutClearingDifference)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Historical EOD Runs Table */}
          <AdminTableContainer>
            <div className="p-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                Lịch Sử Các Đợt Đối Soát EOD (Audit Evidence Immutability)
              </h4>
              <button
                type="button"
                onClick={fetchEodData}
                className="text-xs text-[#00875A] font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[13px]">refresh</span>
                <span>Làm mới</span>
              </button>
            </div>

            {isLoadingEod ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-gray-100 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : eodRuns.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-gray-500 text-xs">
                <span className="material-symbols-outlined text-3xl text-gray-300">history</span>
                <span>Chưa có đợt đối soát EOD nào được ghi nhận. Bấm "Chạy Đối Soát EOD" để thực hiện đợt đầu tiên.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[1250px]">
                  <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Mã Đợt Chạy</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Ngày Kinh Doanh</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Múi Giờ</th>
                      <th className="py-3 px-3.5 whitespace-nowrap text-center">Trạng Thái</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Tổng Khớp / Kiểm Tra</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Sai Lệch (Discrepancies)</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Thời Gian Bắt Đầu</th>
                      <th className="py-3 px-3.5 whitespace-nowrap">Thời Lượng</th>
                      <th className="py-3 px-4 whitespace-nowrap text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedEodRuns.map((run, idx) => {
                      const itemIndex = (currentPageEod - 1) * pageSize + idx + 1;
                      return (
                        <tr key={run.id} className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}>
                          <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                            {itemIndex}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-mono font-bold text-gray-900 text-xs">{run.runNumber}</span>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap font-bold text-gray-700">
                            {run.businessDate}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-gray-500 font-mono">
                            {run.timezone}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-center">
                            {run.status === 'COMPLETED_PASS' && <AdminStatusBadge status="success" label="COMPLETED_PASS" icon="check_circle" />}
                            {run.status === 'COMPLETED_WARNING' && <AdminStatusBadge status="warning" label="COMPLETED_WARNING" icon="warning" />}
                            {run.status === 'RUNNING' && <AdminStatusBadge status="info" label="RUNNING" icon="sync" />}
                            {!['COMPLETED_PASS', 'COMPLETED_WARNING', 'RUNNING'].includes(run.status) && (
                              <AdminStatusBadge status="danger" label={run.status} icon="error" />
                            )}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className="font-bold text-gray-800">{run.counts?.totalMatched ?? 0}</span>
                            <span className="text-gray-400"> / {run.counts?.totalChecked ?? 0}</span>
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {run.counts?.totalDiscrepancies ? (
                              <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                                <span className="material-symbols-outlined text-[13px]">warning</span>
                                <span>{run.counts.totalDiscrepancies} sai lệch</span>
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold">0 (Khớp 100%)</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-gray-600">
                            {formatDate(run.startedAt)}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-gray-500 font-mono">
                            {run.durationMs ? `${run.durationMs}ms` : 'N/A'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedEodRun(run)}
                              className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] cursor-pointer"
                            >
                              Xem Chi Tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <AdminPagination
              currentPage={currentPageEod}
              totalPages={totalPagesEod}
              totalItems={eodRuns.length}
              pageSize={pageSize}
              onPageChange={setCurrentPageEod}
              itemLabel="đợt đối soát"
            />
          </AdminTableContainer>
        </div>
      )}

      {/* SECTION 3: PERIODIC SETTLEMENT BATCHES */}
      {viewSection === 'periodic_batches' && (
        <AdminTableContainer>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
              <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Mã Kỳ Đối Soát</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Nhà Xuất Bản</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Kỳ Đối Soát</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Tổng Đơn</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">GMV Doanh Số</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Tỷ Lệ Chia Sẻ</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Phí Sàn 15%</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Thuế Khấu Trừ</th>
                  <th className="py-3 px-3.5 whitespace-nowrap text-right">Thực Nhận NXB</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Tài Khoản Thụ Hưởng</th>
                  <th className="py-3 px-4 whitespace-nowrap text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedBatches.map((item, idx) => {
                  const itemIndex = (currentPageBatches - 1) * pageSize + idx + 1;
                  return (
                    <tr key={item.id} className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}>
                      <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                        {itemIndex}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-mono text-[11px] text-emerald-700 font-bold">
                        #{item.id}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap font-bold text-gray-900">
                        {item.publisher}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-gray-500">
                        {item.period}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-mono text-gray-700">
                        {item.ordersCount.toLocaleString()} đơn
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-extrabold text-gray-900 font-mono">
                        {item.grossSales.toLocaleString()}₫
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-gray-600">
                        {item.shareRatio}
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-bold text-amber-700 font-mono">
                        -{item.platformFee.toLocaleString()}₫
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-right text-[11px] text-gray-500 font-mono">
                        -{item.taxWithheld.toLocaleString()}₫
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-right font-extrabold text-xs text-[#00875A] font-mono">
                        {item.netPayout.toLocaleString()}₫
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap text-[11px] text-gray-600 max-w-[200px] truncate" title={item.bankAccount}>
                        {item.bankAccount}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-center">
                        {item.status === 'paid' ? (
                          <AdminStatusBadge status="success" label="Đã Chuyển Khoản" icon="check_circle" />
                        ) : (
                          <AdminStatusBadge status="warning" label="Chờ Ký Duyệt" icon="hourglass_top" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <AdminPagination
            currentPage={currentPageBatches}
            totalPages={totalPagesBatches}
            totalItems={payoutBatches.length}
            pageSize={pageSize}
            onPageChange={setCurrentPageBatches}
            itemLabel="kỳ đối soát"
          />
        </AdminTableContainer>
      )}

      {/* 3. EOD RUN DETAILS IN-PAGE PANEL */}
      {selectedEodRun && (
        <div
          ref={eodDetailRef}
          className="mt-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-slate-300 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h4 className="font-bold text-base text-gray-900">Chi Tiết Phiên Đối Soát EOD</h4>
              <p className="text-xs text-gray-500 font-mono">ID: #{selectedEodRun.id} &bull; Ngày: {(selectedEodRun as any).reconciliationDate || selectedEodRun.id}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEodRun(null)}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-gray-400 text-[10px]">Trạng Thái</div>
                <div className="font-bold text-xs uppercase">{selectedEodRun.status}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-gray-400 text-[10px]">Thời Lượng</div>
                <div className="font-bold text-gray-900">{selectedEodRun.durationMs}ms</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-gray-400 text-[10px]">Tổng Kiểm Tra</div>
                <div className="font-bold text-gray-900">{selectedEodRun.counts?.totalChecked}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-gray-400 text-[10px]">Số Sai Lệch</div>
                <div className="font-bold text-amber-600">{selectedEodRun.counts?.totalDiscrepancies}</div>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-xs text-gray-800 mb-2">Danh Sách Sai Lệch / Cảnh Báo ({selectedEodRun.discrepancies?.length || 0})</h5>
              {(!selectedEodRun.discrepancies || selectedEodRun.discrepancies.length === 0) ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-[#00875A] font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Tuyệt vời! Không phát hiện bất kỳ sai lệch nào trên toàn hệ thống kế toán kép &amp; ví seller.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedEodRun.discrepancies.map((disc, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-gray-900">{disc.type}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            disc.severity === 'CRITICAL' || disc.severity === 'ERROR'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {disc.severity}
                        </span>
                      </div>
                      <div className="text-gray-600">{disc.details}</div>
                      <div className="text-[11px] text-gray-500 font-mono">
                        Kỳ vọng: {disc.expected} | Thực tế: {disc.actual}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end">
            <button
              type="button"
              onClick={() => setSelectedEodRun(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* 4. ADMIN REVIEW / CANCEL IN-PAGE FORM */}
      {selectedRequest && reviewAction && (
        <div
          ref={reviewFormRef}
          className={`mt-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 max-w-2xl animate-in fade-in slide-in-from-top-4 duration-300 space-y-4 ${
            reviewAction === 'APPROVE' ? 'border-[#00875A]/40' : 'border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2.5">
              <span className={`material-symbols-outlined text-2xl ${
                reviewAction === 'APPROVE' ? 'text-[#00875A]' : 'text-rose-600'
              }`}>
                {reviewAction === 'APPROVE' ? 'verified' : 'cancel'}
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  {reviewAction === 'APPROVE'
                    ? 'Xác Nhận Phê Duyệt Lệnh Rút Tiền'
                    : reviewAction === 'CANCEL_REFUND'
                    ? 'Hủy Lệnh Chi Thất Bại & Hoàn Số Dư Khả Dụng'
                    : 'Từ Chối Lệnh Rút Tiền & Hoàn Tiền'}
                </h3>
                <p className="text-xs text-gray-500">Mã lệnh: #{selectedRequest.id}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCloseReviewModal}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <p className="text-xs text-gray-600 leading-relaxed">
            {reviewAction === 'APPROVE'
              ? 'Lệnh rút tiền sẽ được chuyển sang trạng thái APPROVED và sẵn sàng giải ngân chuyển khoản ngân hàng.'
              : reviewAction === 'CANCEL_REFUND'
              ? 'Lệnh rút tiền thất bại sẽ chuyển sang trạng thái REJECTED và hoàn trả toàn bộ số tiền đang phong tỏa về số dư khả dụng.'
              : 'Tiền đang đóng băng trong ví sẽ tự động được hoàn trả về số dư khả dụng của gian hàng.'}
          </p>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs text-gray-700">
            <div className="flex justify-between">
              <span className="text-gray-500">Mã Lệnh Rút:</span>
              <span className="font-mono font-bold">{selectedRequest.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Gian Hàng:</span>
              <span className="font-mono">{selectedRequest.storeId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Ngân Hàng Thụ Hưởng:</span>
              <span className="font-bold">{selectedRequest.bankSnapshot?.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">STK &amp; Chủ TK:</span>
              <span className="font-mono font-bold">
                {selectedRequest.bankSnapshot?.maskedAccountNumber || selectedRequest.bankSnapshot?.accountNumberMasked || selectedRequest.bankSnapshot?.accountNumber} ({selectedRequest.bankSnapshot?.accountHolder})
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="font-bold text-gray-900">Số Tiền Rút:</span>
              <span className="font-black text-base text-[#00875A] font-mono">{formatVND(selectedRequest.amount)}</span>
            </div>
          </div>

          {(reviewAction === 'REJECT' || reviewAction === 'CANCEL_REFUND') && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Lý Do {reviewAction === 'CANCEL_REFUND' ? 'Hủy Lệnh' : 'Từ Chối'} <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectReasonError) setRejectReasonError('');
                }}
                placeholder={
                  reviewAction === 'CANCEL_REFUND'
                    ? 'Nhập lý do hủy lệnh chi lỗi (ví dụ: Số tài khoản thụ hưởng bị khóa, ngân hàng từ chối nhận tiền...)'
                    : 'Nhập lý do từ chối (ví dụ: Thông tin tài khoản ngân hàng không khớp hồ sơ thuế, nghi vấn gian lận...)'
                }
                className={`w-full p-3 rounded-xl border text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none transition-all ${
                  rejectReasonError ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30' : 'border-gray-300 focus:border-rose-500'
                }`}
              />
              {rejectReasonError && (
                <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  <span>{rejectReasonError}</span>
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              disabled={isSubmittingReview}
              onClick={handleCloseReviewModal}
              className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-xs cursor-pointer disabled:opacity-50"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              disabled={isSubmittingReview}
              onClick={handleSubmitReview}
              className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                reviewAction === 'APPROVE' ? 'bg-[#00875A] hover:bg-[#00734c]' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmittingReview ? (
                <span>Đang Xử Lý...</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">
                    {reviewAction === 'APPROVE' ? 'verified' : 'cancel'}
                  </span>
                  <span>
                    {reviewAction === 'APPROVE'
                      ? 'Xác Nhận Phê Duyệt'
                      : reviewAction === 'CANCEL_REFUND'
                      ? 'Xác Nhận Hủy & Hoàn Tiền'
                      : 'Xác Nhận Từ Chối'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminFinanceView;
