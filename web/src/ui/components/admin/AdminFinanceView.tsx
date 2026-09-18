"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  payoutApi,
  reconciliationApi,
  type PayoutRequestView,
  type EodReconciliationRunView,
} from '../../api/walletApi';

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

export function AdminFinanceView() {
  const { showToast } = useToast();

  // Primary Section Tab: Live Payout Requests Queue vs EOD Reconciliation vs Periodic NXB Batches
  const [viewSection, setViewSection] = useState<'live_requests' | 'eod_reconciliation' | 'periodic_batches'>('live_requests');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Payout Requests State
  const [liveRequests, setLiveRequests] = useState<PayoutRequestView[]>([]);
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
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
      if (res.success && res.data) {
        setLiveRequests(res.data.items || []);
      } else {
        setLiveError(res.error?.message || 'Không thể tải hàng đợi rút tiền từ máy chủ.');
      }
    } catch (err: any) {
      setLiveError(err?.message || 'Lỗi kết nối khi tải danh sách yêu cầu rút tiền.');
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
  };

  const handleCloseReviewModal = () => {
    setSelectedRequest(null);
    setReviewAction(null);
    setRejectReason('');
    setIsSubmittingReview(false);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest || !reviewAction) return;

    if ((reviewAction === 'REJECT' || reviewAction === 'CANCEL_REFUND') && !rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối / hủy lệnh rút tiền.', 'warning');
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
  const filteredLiveRequests = liveRequests.filter((req) => {
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

  const pendingCount = liveRequests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = liveRequests.filter((r) => r.status === 'APPROVED').length;
  const completedCount = liveRequests.filter((r) => r.status === 'COMPLETED').length;
  const failedCount = liveRequests.filter((r) => r.status === 'FAILED').length;
  const rejectedCount = liveRequests.filter((r) => r.status === 'REJECTED').length;

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto p-4 sm:p-6 animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-semibold text-gray-500">Tài Chính &amp; Kế Toán Trung Ương</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
              ĐỐI SOÁT &amp; GIẢI NGÂN TỰ ĐỘNG • TASK 77
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-0.5 font-editorial">
            Phê Duyệt &amp; Giải Ngân Ngân Hàng Tự Động
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Kiểm soát luồng rút tiền người bán, phê duyệt, giải ngân chuyển khoản ngân hàng (Task 77) bảo đảm tính toàn vẹn kế toán kép.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {approvedCount > 0 && (
            <button
              disabled={isDisbursing}
              onClick={handleDisburseBatch}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              <span>{isDisbursing ? 'Đang Giải Ngân...' : `Giải Ngân Toàn Bộ (${approvedCount})`}</span>
            </button>
          )}

          <button
            onClick={() => fetchLivePayoutRequests()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors shadow-2xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            <span>Làm Mới Hàng Đợi</span>
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Chờ Duyệt (Pending)</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">{pendingCount}</div>
          <div className="mt-2 text-xs text-amber-700 font-bold">Cần kế toán xác nhận</div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Đã Duyệt (Approved)</span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">{approvedCount}</div>
          <div className="mt-2 text-xs text-blue-600 font-medium">Sẵn sàng chi trả Task 77</div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Đã Giải Ngân (Completed)</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">task_alt</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-[#00875A] mt-2">{completedCount}</div>
          <div className="mt-2 text-xs text-emerald-700 font-medium">Đã ghi sổ DEBIT_FROZEN</div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Chi Thất Bại (Failed)</span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">warning</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">{failedCount}</div>
          <div className="mt-2 text-xs text-amber-600 font-medium">Có thể thử lại hoặc hoàn tiền</div>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500">Đã Từ Chối (Rejected)</span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[18px]">cancel</span>
            </span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 mt-2">{rejectedCount}</div>
          <div className="mt-2 text-xs text-rose-600 font-medium">Đã hoàn trả số dư khả dụng</div>
        </div>
      </div>

      {/* 3. SECTION TABS */}
      <div className="flex items-center gap-2 border-b border-[#E2E8F0] pb-3">
        <button
          onClick={() => setViewSection('live_requests')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
            viewSection === 'live_requests'
              ? 'bg-[#00875A] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">payments</span>
          <span>Hàng Đợi Rút Tiền Seller ({liveRequests.length})</span>
        </button>

        <button
          onClick={() => setViewSection('eod_reconciliation')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
            viewSection === 'eod_reconciliation'
              ? 'bg-[#00875A] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          <span>Đối Soát EOD & Kiểm Toán ({eodRuns.length})</span>
        </button>

        <button
          onClick={() => setViewSection('periodic_batches')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all ${
            viewSection === 'periodic_batches'
              ? 'bg-[#00875A] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">calendar_month</span>
          <span>Kỳ Đối Soát NXB Định Kỳ (85/15)</span>
        </button>
      </div>

      {/* SECTION 1: LIVE PAYOUT REQUESTS REVIEW & DISBURSEMENT QUEUE */}
      {viewSection === 'live_requests' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3.5">
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl w-full md:w-auto">
              {[
                { key: 'ALL', label: `Tất cả (${liveRequests.length})` },
                { key: 'PENDING', label: `Chờ duyệt (${pendingCount})` },
                { key: 'APPROVED', label: `Đã duyệt (${approvedCount})` },
                { key: 'COMPLETED', label: `Đã chi (${completedCount})` },
                { key: 'FAILED', label: `Chi lỗi (${failedCount})` },
                { key: 'REJECTED', label: `Từ chối (${rejectedCount})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setStatusFilter(tab.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === tab.key ? 'bg-white text-gray-900 shadow-xs border border-gray-200' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
              <input
                type="text"
                placeholder="Tìm mã lệnh, gian hàng, STK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
              />
            </div>
          </div>

          {liveError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                <span>{liveError}</span>
              </div>
              <button onClick={fetchLivePayoutRequests} className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold">
                Thử lại
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
            {isLoadingLive ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-xl"></div>
                ))}
              </div>
            ) : filteredLiveRequests.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Không Có Lệnh Rút Tiền Phù Hợp</p>
                  <p className="text-xs text-gray-500 mt-0.5">Không tìm thấy yêu cầu rút tiền nào với bộ lọc hiện tại.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3.5 px-4">Thời Gian &amp; Mã Lệnh</th>
                      <th className="py-3.5 px-3">Gian Hàng</th>
                      <th className="py-3.5 px-3">Tài Khoản Thụ Hưởng</th>
                      <th className="py-3.5 px-3 text-right">Số Tiền Rút</th>
                      <th className="py-3.5 px-3">Trạng Thái</th>
                      <th className="py-3.5 px-3">Thông Tin Giải Ngân / Lỗi</th>
                      <th className="py-3.5 px-4 text-right">Thao Tác Xử Lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLiveRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-gray-900 font-bold">{req.id.slice(0, 10)}...</span>
                            <span className="text-[11px] text-gray-400">{formatDate(req.createdAt)}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <span className="font-mono text-xs font-semibold text-gray-700">{req.storeId}</span>
                        </td>

                        <td className="py-3.5 px-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{req.bankSnapshot?.bankName || 'Ngân Hàng'}</span>
                            <span className="text-[11px] text-gray-500 font-mono">
                              STK: {req.bankSnapshot?.maskedAccountNumber || req.bankSnapshot?.accountNumberMasked || req.bankSnapshot?.accountNumber} ({req.bankSnapshot?.accountHolder})
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          <span className="font-extrabold text-base text-[#00875A] font-mono">
                            {formatVND(req.amount)}
                          </span>
                        </td>

                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              req.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : req.status === 'APPROVED'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : req.status === 'PROCESSING'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse'
                                : req.status === 'COMPLETED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : req.status === 'FAILED'
                                ? 'bg-amber-50 text-amber-700 border border-amber-300'
                                : req.status === 'REJECTED'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-gray-50 text-gray-700 border border-gray-200'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[12px]">
                              {req.status === 'PENDING'
                                ? 'hourglass_top'
                                : req.status === 'APPROVED'
                                ? 'verified'
                                : req.status === 'PROCESSING'
                                ? 'sync'
                                : req.status === 'COMPLETED'
                                ? 'task_alt'
                                : req.status === 'FAILED'
                                ? 'warning'
                                : req.status === 'REJECTED'
                                ? 'cancel'
                                : 'info'}
                            </span>
                            <span>{req.status}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-3 max-w-xs text-[11px] text-gray-500">
                          {req.status === 'COMPLETED' && (
                            <div className="flex flex-col">
                              <span className="text-emerald-700 font-bold">Giải ngân lúc {formatDate(req.disbursedAt)}</span>
                              {req.providerRef && (
                                <span className="font-mono text-[10px] text-gray-400 truncate">Mã GD: {req.providerRef}</span>
                              )}
                            </div>
                          )}
                          {req.status === 'FAILED' && (
                            <div className="flex flex-col">
                              <span className="text-amber-700 font-bold">Lỗi: {req.failureReason || 'Lỗi cổng ngân hàng'}</span>
                              <span className="text-[10px] text-gray-400">Tiền vẫn đóng băng an toàn</span>
                            </div>
                          )}
                          {req.status === 'REJECTED' && (req.rejectionReason || req.rejectReason) && (
                            <span className="text-rose-600 font-medium">Lý do: {req.rejectionReason || req.rejectReason}</span>
                          )}
                          {req.status === 'APPROVED' && (
                            <span className="text-blue-600 font-medium">Đã duyệt (Sẵn sàng giải ngân)</span>
                          )}
                          {req.status === 'PENDING' && (
                            <span className="text-amber-600">Chờ kế toán phê duyệt</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {req.status === 'PENDING' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenReviewModal(req, 'APPROVE')}
                                className="px-3 py-1.5 rounded-lg bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                <span>Phê Duyệt</span>
                              </button>
                              <button
                                onClick={() => handleOpenReviewModal(req, 'REJECT')}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">close</span>
                                <span>Từ Chối</span>
                              </button>
                            </div>
                          )}

                          {req.status === 'APPROVED' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                disabled={disbursingId === req.id}
                                onClick={() => handleDisburseSingle(req.id)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[14px]">send</span>
                                <span>{disbursingId === req.id ? 'Đang Chuyển...' : 'Giải Ngân'}</span>
                              </button>
                            </div>
                          )}

                          {req.status === 'FAILED' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                disabled={disbursingId === req.id}
                                onClick={() => handleRetryDisburse(req.id)}
                                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs flex items-center gap-1 disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-[14px]">replay</span>
                                <span>{disbursingId === req.id ? 'Đang Thử...' : 'Thử Lại'}</span>
                              </button>
                              <button
                                onClick={() => handleOpenReviewModal(req, 'CANCEL_REFUND')}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[14px]">undo</span>
                                <span>Hủy &amp; Hoàn Tiền</span>
                              </button>
                            </div>
                          )}

                          {req.status === 'COMPLETED' && (
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center justify-end gap-1">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              <span>Hoàn Tất</span>
                            </span>
                          )}

                          {req.status === 'REJECTED' && (
                            <span className="text-[11px] text-gray-400 italic">Đã từ chối</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 2: EOD FINANCIAL RECONCILIATION & AUDIT REPORTS (Task 78) */}
      {viewSection === 'eod_reconciliation' && (
        <div className="space-y-6">
          {/* 1. Governance & Limitation Alert Banner */}
          <div className="p-4.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-[13px] text-amber-800">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
              <span>Kiểm Soát Tài Chính Cuối Ngày &amp; Giới Hạn Hệ Thống (Task 78 Invariants)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 text-[11.5px] text-amber-900/90 leading-relaxed">
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
          <div className="bg-white rounded-2xl p-5 border border-[#E2E8F0] shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="font-extrabold text-gray-900 text-base">Đối Soát Tài Chính EOD</h3>
                {latestEodRun && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      latestEodRun.status === 'COMPLETED_PASS'
                        ? 'bg-emerald-50 text-[#00875A] border border-emerald-200'
                        : latestEodRun.status === 'COMPLETED_WARNING'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : latestEodRun.status === 'RUNNING'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {latestEodRun.status === 'COMPLETED_PASS' ? 'check_circle' : latestEodRun.status === 'RUNNING' ? 'sync' : 'warning'}
                    </span>
                    <span>{latestEodRun.status}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Quét toàn bộ bất biến Double-Entry Ledger, Seller Wallet, Escrow Settlement và Payout Clearing.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <input
                type="date"
                value={eodDateInput}
                onChange={(e) => setEodDateInput(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-700 focus:outline-none focus:border-[#00875A]"
                placeholder="YYYY-MM-DD"
              />
              <button
                type="button"
                disabled={isRunningEod}
                onClick={handleRunEod}
                className="px-5 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50 transition-all shrink-0"
              >
                <span className={`material-symbols-outlined text-[16px] ${isRunningEod ? 'animate-spin' : ''}`}>
                  {isRunningEod ? 'sync' : 'play_arrow'}
                </span>
                <span>{isRunningEod ? 'Đang Đối Soát...' : 'Chạy Đối Soát EOD'}</span>
              </button>
            </div>
          </div>

          {/* 3. Latest EOD Financial Control Summary Cards */}
          {latestEodRun?.summary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>Ví Seller &amp; Bất Biến WAL-001</span>
                  <span className="material-symbols-outlined text-emerald-600 text-[18px]">account_balance_wallet</span>
                </div>
                <div className="text-xl font-extrabold text-gray-900">
                  {latestEodRun.summary.walletsHealthy} / {latestEodRun.summary.walletsAudited} Ví Khỏe
                </div>
                <div className="text-[11px] text-gray-500">
                  Số dư không âm &amp; tái tạo lịch sử giao dịch ví khớp 100%
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>Ghi Sổ Kép &amp; Ký Quỹ Escrow</span>
                  <span className="material-symbols-outlined text-blue-600 text-[18px]">receipt_long</span>
                </div>
                <div className="text-xl font-extrabold text-gray-900">
                  {latestEodRun.summary.ledgerTransactionsAudited} Ledger / {latestEodRun.summary.escrowRecordsAudited} Đơn Escrow
                </div>
                <div className="text-[11px] text-gray-500">
                  Nợ = Có (Debit = Credit) &amp; giải phóng ký quỹ hợp lệ
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>Rút Tiền &amp; Chi Trả Seller</span>
                  <span className="material-symbols-outlined text-indigo-600 text-[18px]">payments</span>
                </div>
                <div className="text-xl font-extrabold text-gray-900">
                  {formatVND(latestEodRun.summary.totalPayoutsCompletedAmount)}
                </div>
                <div className="text-[11px] text-gray-500">
                  {latestEodRun.summary.payoutsCompleted} Đã chi, {latestEodRun.summary.payoutsPending + latestEodRun.summary.payoutsApproved} Đang phong tỏa ({formatVND(latestEodRun.summary.totalPayoutsReservedAmount)})
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4.5 border border-[#E2E8F0] shadow-2xs space-y-2">
                <div className="flex justify-between items-center text-xs text-gray-500 font-semibold">
                  <span>Tài Khoản PAYOUT_CLEARING</span>
                  <span className="material-symbols-outlined text-amber-600 text-[18px]">balance</span>
                </div>
                <div className="text-xl font-extrabold font-mono text-gray-900">
                  {formatVND(latestEodRun.summary.actualPayoutClearingNetBalance)}
                </div>
                <div className="text-[11px] text-gray-500">
                  Kỳ vọng: {formatVND(latestEodRun.summary.expectedOpenPayoutClearingAmount)} | Lệch: <span className="font-bold text-[#00875A]">{formatVND(latestEodRun.summary.payoutClearingDifference)}</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. Historical EOD Runs Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">
                Lịch Sử Các Đợt Đối Soát EOD (Audit Evidence Immutability)
              </h4>
              <button
                type="button"
                onClick={fetchEodData}
                className="text-xs text-[#00875A] font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
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
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                    <tr>
                      <th className="py-3.5 px-4">Mã Đợt Chạy (Run Number)</th>
                      <th className="py-3.5 px-3">Ngày Kinh Doanh</th>
                      <th className="py-3.5 px-3">Trạng Thái</th>
                      <th className="py-3.5 px-3">Tổng Bản Ghi / Khớp</th>
                      <th className="py-3.5 px-3">Sai Lệch (Discrepancies)</th>
                      <th className="py-3.5 px-3">Thời Gian / Thời Lượng</th>
                      <th className="py-3.5 px-4 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {eodRuns.map((run) => (
                      <tr key={run.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-gray-900 text-[12px]">{run.runNumber}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-gray-700">{run.businessDate}</span>
                          <span className="text-[10px] text-gray-400 block">{run.timezone}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              run.status === 'COMPLETED_PASS'
                                ? 'bg-emerald-50 text-[#00875A] border border-emerald-200'
                                : run.status === 'COMPLETED_WARNING'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : run.status === 'RUNNING'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            <span>{run.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-gray-800">{run.counts?.totalMatched ?? 0}</span>
                          <span className="text-gray-400"> / {run.counts?.totalChecked ?? 0}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          {run.counts?.totalDiscrepancies ? (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                              <span className="material-symbols-outlined text-[14px]">warning</span>
                              <span>{run.counts.totalDiscrepancies} sai lệch</span>
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold">0 (Khớp 100%)</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="text-[11px] text-gray-700">{formatDate(run.startedAt)}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{run.durationMs ? `${run.durationMs}ms` : 'N/A'}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedEodRun(run)}
                            className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] cursor-pointer"
                          >
                            Xem Chi Tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: PERIODIC SETTLEMENT BATCHES */}
      {viewSection === 'periodic_batches' && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3.5 px-4">Nhà Xuất Bản &amp; Kỳ Đối Soát</th>
                  <th className="py-3.5 px-3">Tổng Đơn &amp; GMV Bán</th>
                  <th className="py-3.5 px-3">Phí Sàn 15%</th>
                  <th className="py-3.5 px-3">Thực Nhận NXB</th>
                  <th className="py-3.5 px-3">Tài Khoản Thụ Hưởng</th>
                  <th className="py-3.5 px-3">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payoutBatches.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F9FAFB] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 text-[13px]">{item.publisher}</span>
                        <span className="text-[11px] text-gray-500 mt-0.5">{item.period}</span>
                        <span className="text-[10px] text-emerald-700 font-mono mt-0.5">#{item.id}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col">
                        <span className="font-extrabold text-gray-900">{item.grossSales.toLocaleString()}₫</span>
                        <span className="text-[10px] text-gray-500">{item.ordersCount.toLocaleString()} đơn hàng</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-bold text-amber-700">-{item.platformFee.toLocaleString()}₫</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="font-extrabold text-base text-[#00875A]">{item.netPayout.toLocaleString()}₫</span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="text-[11px] text-gray-700 truncate max-w-[200px] block" title={item.bankAccount}>
                        {item.bankAccount}
                      </span>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {item.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. EOD DISCREPANCY DIAGNOSTIC MODAL (Task 78) */}
      {selectedEodRun && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setSelectedEodRun(null)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-gray-900">Chi Tiết Báo Cáo Đối Soát: {selectedEodRun.runNumber}</h3>
                <p className="text-xs text-gray-500">Ngày kinh doanh: {selectedEodRun.businessDate} ({selectedEodRun.timezone})</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEodRun(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <div className="text-gray-400 text-[10px]">Trạng Thái</div>
                  <div className="font-bold text-gray-900">{selectedEodRun.status}</div>
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

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEodRun(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ADMIN REVIEW / CANCEL MODAL */}
      {selectedRequest && reviewAction && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-xs" onClick={handleCloseReviewModal}></div>
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-gray-200 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {reviewAction === 'APPROVE'
                ? 'Xác Nhận Phê Duyệt Lệnh Rút Tiền'
                : reviewAction === 'CANCEL_REFUND'
                ? 'Hủy Lệnh Chi Thất Bại & Hoàn Số Dư Khả Dụng'
                : 'Từ Chối Lệnh Rút Tiền & Hoàn Tiền'}
            </h3>
            <p className="text-xs text-gray-500">
              {reviewAction === 'APPROVE'
                ? 'Lệnh rút tiền sẽ được chuyển sang trạng thái APPROVED và sẵn sàng giải ngân chuyển khoản ngân hàng (Task 77).'
                : reviewAction === 'CANCEL_REFUND'
                ? 'Lệnh rút tiền thất bại sẽ chuyển sang trạng thái REJECTED và hoàn trả toàn bộ số tiền đang phong tỏa về số dư khả dụng (Available).'
                : 'Tiền đang đóng băng trong ví sẽ tự động được hoàn trả về số dư khả dụng (Available) của gian hàng.'}
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
                <span className="font-black text-lg text-[#00875A] font-mono">{formatVND(selectedRequest.amount)}</span>
              </div>
            </div>

            {(reviewAction === 'REJECT' || reviewAction === 'CANCEL_REFUND') && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Lý Do {reviewAction === 'CANCEL_REFUND' ? 'Hủy Lệnh' : 'Từ Chối'} (Bắt buộc) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={
                    reviewAction === 'CANCEL_REFUND'
                      ? 'Nhập lý do hủy lệnh chi lỗi (ví dụ: Số tài khoản thụ hưởng bị khóa, ngân hàng từ chối nhận tiền...)'
                      : 'Nhập lý do từ chối (ví dụ: Thông tin tài khoản ngân hàng không khớp hồ sơ thuế, nghi vấn gian lận...)'
                  }
                  className="w-full p-3 rounded-xl border border-gray-300 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-rose-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleCloseReviewModal}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isSubmittingReview}
                onClick={handleSubmitReview}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5 disabled:opacity-50 ${
                  reviewAction === 'APPROVE' ? 'bg-[#00875A] hover:bg-[#00734c]' : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {isSubmittingReview ? (
                  <span>Đang Xử Lý...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
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
        </div>
      )}
    </div>
  );
}

export default AdminFinanceView;
