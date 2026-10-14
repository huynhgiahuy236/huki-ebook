"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import {
  walletApi,
  payoutApi,
  type WalletData,
  type SellerEscrowItem,
  type WalletTransactionItem,
  type PayoutRequestItem,
  type WalletSecurityStatus,
} from '@/ui/api/walletApi';
import { businessApi } from '@/ui/api/businessApi';
import WithdrawalPinModal, { type BankInfo } from '@/ui/components/seller/WithdrawalPinModal';
import UpdateBankModal from '@/ui/components/seller/UpdateBankModal';
import UpdatePinModal from '@/ui/components/seller/UpdatePinModal';
import EscrowTableBadge from '@/ui/components/seller/EscrowTableBadge';
import { SellerPagination } from '@/ui/components/seller/SellerUI';
import { featureFlagsService } from '@/ui/services/featureFlagsService';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { calculateSellerFinancials, formatVND } from '@/ui/utils/sellerFinanceEngine';

function formatVietnamDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    const formatter = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');

    return `${day}/${month}/${year} ${hour}:${minute}`;
  } catch {
    return dateStr;
  }
}

export default function SellerFinancePage() {
  const { user, activeBusinessId, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  const storeId = user?.business?.id || activeBusinessId || (user as any)?.storeId || null;

  const [businessDetail, setBusinessDetail] = useState<any>(null);

  const fetchBiz = useCallback(async () => {
    try {
      const res = await businessApi.getMyBusiness();
      if (res.success && res.data) {
        const b = (res.data as any)?.data || res.data;
        setBusinessDetail(b);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchBiz();
  }, [fetchBiz]);

  // Bank Info KYC
  const bankInfo: BankInfo = useMemo(() => {
    const b = businessDetail || (user?.business as any);
    return {
      bankName: b?.bankName || 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
      accountNumber: b?.bankAccountNumber || 'Chưa thiết lập STK',
      accountHolder: b?.bankAccountHolderName || b?.bankAccountHolder || b?.ownerName || b?.name || user?.fullName || 'CHỦ TÀI KHOẢN',
      businessName: b?.name || 'Gian hàng',
    };
  }, [businessDetail, user]);

  const modalBankInfo = useMemo(() => ({
    bankName: bankInfo.bankName,
    accountNumber: bankInfo.accountNumber,
    accountHolder: bankInfo.accountHolder,
    bankBranch: businessDetail?.bankBranch || '',
  }), [bankInfo, businessDetail?.bankBranch]);

  // States
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [escrowItems, setEscrowItems] = useState<SellerEscrowItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransactionItem[]>([]);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  // Modals State
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // PIN & Security Status (90 days rotation)
  const [securityStatus, setSecurityStatus] = useState<WalletSecurityStatus | null>(null);

  // Tab State: 3 Tab Tinh Gọn
  const [activeTab, setActiveTab] = useState<'ESCROW' | 'PAYOUTS' | 'TRANSACTIONS'>('ESCROW');

  // Pagination States for all 3 Tabs
  const [escrowPage, setEscrowPage] = useState(1);
  const escrowPageSize = 10;
  const escrowTotalPages = Math.max(1, Math.ceil(escrowItems.length / escrowPageSize));
  const paginatedEscrowItems = useMemo(() => {
    const start = (escrowPage - 1) * escrowPageSize;
    return escrowItems.slice(start, start + escrowPageSize);
  }, [escrowItems, escrowPage]);

  // Payout Requests History State & Pagination
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequestItem[]>([]);
  const [isPayoutsLoading, setIsPayoutsLoading] = useState(true);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutTotalPages, setPayoutTotalPages] = useState(1);
  const [payoutTotalItems, setPayoutTotalItems] = useState(0);

  // Transactions Pagination State
  const [txPage, setTxPage] = useState(1);
  const txPageSize = 12;
  const txTotalPages = Math.max(1, Math.ceil(recentTransactions.length / txPageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return recentTransactions.slice(start, start + txPageSize);
  }, [recentTransactions, txPage]);

  // Realtime balance pulse indicator
  const [hasBalancePulse, setHasBalancePulse] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);

  // RT-04 Realtime Feature Flag check for WITHDRAWALS
  const [featureVersion, setFeatureVersion] = useState(0);

  useEffect(() => {
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'FEATURE_FLAGS_UPDATED') {
        setFeatureVersion((v) => v + 1);
      }
    });
    return () => unsub();
  }, []);

  const withdrawalCheck = useMemo(() => {
    return featureFlagsService.isFeatureAccessible('WITHDRAWALS', storeId || undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, featureVersion]);

  // Fetch Wallet Data (supports silent background updates)
  const fetchWallet = useCallback(async (isSilent = false) => {
    if (!storeId) {
      if (!isAuthLoading) setIsWalletLoading(false);
      return;
    }
    if (!isSilent) setIsWalletLoading(true);
    setWalletError(null);
    try {
      const res = await walletApi.getStoreWallet(storeId);
      if (res.success && res.data) {
        setWallet(res.data);
        const avail = Number(res.data.availableBalance) || 0;
        if (prevBalanceRef.current !== null && prevBalanceRef.current !== avail) {
          setHasBalancePulse(true);
          setTimeout(() => setHasBalancePulse(false), 2000);
        }
        prevBalanceRef.current = avail;
      } else {
        if (!isSilent) setWalletError(res.error?.message || 'Không thể tải thông tin số dư ví.');
      }
    } catch (err: any) {
      if (!isSilent) setWalletError(err?.message || 'Lỗi kết nối máy chủ khi tải ví.');
    } finally {
      if (!isSilent) setIsWalletLoading(false);
    }
  }, [storeId, isAuthLoading]);

  // Fetch Escrow Items Summary
  const fetchEscrowItems = useCallback(async () => {
    if (isAuthLoading) return;
    try {
      const res = await walletApi.getSellerEscrowItems();
      if (res.success && Array.isArray(res.data)) {
        setEscrowItems(res.data);
      }
    } catch (err) {
      console.warn('Lỗi tải dữ liệu tiền treo:', err);
    }
  }, [isAuthLoading]);

  // Fetch Recent Transactions
  const fetchRecentTransactions = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await walletApi.getStoreWalletTransactions(storeId, { page: 1, limit: 100 });
      if (res.success && res.data?.items) {
        setRecentTransactions(res.data.items);
      }
    } catch (err) {
      console.warn('Lỗi tải giao dịch gần đây:', err);
    }
  }, [storeId]);

  // Fetch Payout Requests History
  const fetchPayoutRequests = useCallback(async (pageNum = 1, isSilent = false) => {
    if (!storeId) {
      if (!isAuthLoading) setIsPayoutsLoading(false);
      return;
    }
    if (!isSilent) setIsPayoutsLoading(true);
    try {
      const res = await payoutApi.getStorePayoutRequests(storeId, { page: pageNum, limit: 10 });
      if (res.success && res.data) {
        setPayoutRequests(res.data.items || []);
        setPayoutPage(res.data.page || pageNum);
        setPayoutTotalItems(res.data.total || 0);
        setPayoutTotalPages(Math.max(1, Math.ceil((res.data.total || 0) / (res.data.limit || 10))));
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử yêu cầu rút tiền:', err);
    } finally {
      if (!isSilent) setIsPayoutsLoading(false);
    }
  }, [storeId, isAuthLoading]);

  // Fetch Security PIN Status (90 days rotation check)
  const fetchSecurityStatus = useCallback(async () => {
    if (!storeId) return;
    try {
      const res = await walletApi.getSecurityStatus(storeId);
      if (res.success && res.data) {
        setSecurityStatus(res.data);
      }
    } catch (err) {
      console.warn('Lỗi tải trạng thái bảo mật PIN:', err);
    }
  }, [storeId]);

  const handleRefreshAll = useCallback(async () => {
    if (!storeId && isAuthLoading) return;
    await Promise.all([
      fetchWallet(),
      fetchEscrowItems(),
      fetchRecentTransactions(),
      fetchPayoutRequests(1),
      fetchSecurityStatus(),
      fetchBiz(),
    ]);
  }, [storeId, isAuthLoading, fetchWallet, fetchEscrowItems, fetchRecentTransactions, fetchPayoutRequests, fetchSecurityStatus, fetchBiz]);

  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

  // Silent Background Auto-Polling (3.5s - Chuẩn Shopee Zero-F5) & Lắng nghe RealtimeSyncBus
  useEffect(() => {
    if (!storeId) return;

    const pollTimer = setInterval(() => {
      fetchWallet(true);
      fetchEscrowItems();
      fetchPayoutRequests(payoutPage, true);
    }, 3500);

    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      const payload = msg.payload as any;
      const isCurrentStore = !payload?.storeId || payload.storeId === storeId;

      if ((msg.type === 'ORDER_CREATED' || msg.type === 'ORDER_PAYMENT_SUCCEEDED') && isCurrentStore) {
        fetchWallet(true);
        fetchEscrowItems();
        fetchRecentTransactions();
        showToast?.('Khách vừa thanh toán đơn hàng VietQR/PayOS mới! Tiền đã nổ vào mục Tiền Ký Quỹ Đang Giữ.', 'success');
      } else if (msg.type === 'PAYOUT_REQUESTED' && isCurrentStore) {
        fetchWallet(true);
        fetchPayoutRequests(1, true);
      } else if (msg.type === 'PAYOUT_APPROVED' && isCurrentStore) {
        fetchWallet(true);
        fetchPayoutRequests(payoutPage, true);
        showToast?.('Lệnh rút tiền của bạn đã được Kế Toán Sàn phê duyệt!', 'success');
      } else if (msg.type === 'PAYOUT_REJECTED' && isCurrentStore) {
        fetchWallet(true);
        fetchPayoutRequests(payoutPage, true);
        const reason = payload?.reason ? `: ${payload.reason}` : '';
        showToast?.(`Lệnh rút tiền bị từ chối${reason}. Tiền đã được hoàn lại số dư khả dụng!`, 'error');
      } else if (msg.type === 'PAYOUT_DISBURSED' && isCurrentStore) {
        fetchWallet(true);
        fetchPayoutRequests(payoutPage, true);
        showToast?.('Tiền rút đã được ngân hàng giải ngân thành công về STK của bạn!', 'success');
      } else if ((msg.type === 'WALLET_BALANCE_UPDATED' || msg.type === 'ESCROW_RELEASED') && isCurrentStore) {
        fetchWallet(true);
        fetchEscrowItems();
        fetchRecentTransactions();
        showToast?.('Số dư ví vừa được giải phóng tiền hàng thành công vào Số Dư Khả Dụng!', 'success');
      } else if (msg.type === 'BUSINESS_STATUS_UPDATED') {
        fetchBiz();
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsubscribe();
    };
  }, [storeId, payoutPage, fetchWallet, fetchEscrowItems, fetchPayoutRequests, fetchRecentTransactions, fetchBiz, showToast]);

  // Xử lý tự động giải ngân khi bộ đếm 2 phút đổi trả kết thúc
  const handleAutoReleaseItem = useCallback((item: SellerEscrowItem) => {
    realtimeSyncBus.publish('ESCROW_RELEASED', {
      storeId,
      amount: item.sellerNet,
      orderId: item.orderId,
      orderCode: item.orderCode,
    });

    setEscrowItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, escrowStatus: 'RELEASED' } : it))
    );

    showToast?.(
      `Đơn #${item.orderCode} đã hoàn tất 2 phút đổi trả! +${formatVND(item.sellerNet)} đã chuyển sang Số Dư Khả Dụng!`,
      'success'
    );

    fetchWallet(true);
  }, [storeId, fetchWallet, showToast]);

  // TÍNH TOÁN DÒNG TIỀN THEO SINGLE SOURCE OF TRUTH (ENGINE CHUẨN SHOPEE)
  const metrics = useMemo(() => {
    return calculateSellerFinancials({
      escrowItems,
      wallet,
      payouts: payoutRequests,
      transactions: recentTransactions,
      platformFeeRate: 0.05,
    });
  }, [escrowItems, wallet, payoutRequests, recentTransactions]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* 1. TOP BAR & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Tài Chính &amp; Ví Số Dư Người Bán</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Chu kỳ dòng tiền minh bạch: Vận chuyển &rarr; Ký quỹ đổi trả (2 phút) &rarr; Ví khả dụng &rarr; Rút về tài khoản ngân hàng.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
            title="Tải lại dữ liệu thời gian thực"
          >
            <span className={`material-symbols-outlined text-[18px] ${isWalletLoading ? 'animate-spin text-[#00875A]' : ''}`}>
              refresh
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsWithdrawalModalOpen(true)}
            disabled={metrics.availableBalance <= 0 || !withdrawalCheck.accessible}
            title={!withdrawalCheck.accessible ? (withdrawalCheck.reason || 'Tính năng rút tiền đang tạm bảo trì') : undefined}
            className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 ${
              !withdrawalCheck.accessible
                ? 'bg-amber-600/80 cursor-not-allowed opacity-75'
                : 'bg-[#00875A] hover:bg-[#003B2B] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {!withdrawalCheck.accessible ? 'construction' : 'payments'}
            </span>
            <span>{!withdrawalCheck.accessible ? 'Rút Tiền (Đang Bảo Trì)' : `Rút ${formatVND(metrics.availableBalance)} Về STK`}</span>
          </button>
        </div>
      </div>

      {!withdrawalCheck.accessible && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-2.5">
          <span className="material-symbols-outlined text-amber-600 text-xl shrink-0">construction</span>
          <div className="flex-1">
            <span className="font-bold">Cổng Rút Tiền Đang Tạm Bảo Trì: </span>
            <span>{withdrawalCheck.reason || 'Hệ thống đang tiến hành nâng cấp đối soát ngân hàng theo định kỳ. Quý đối tác vui lòng quay lại sau.'}</span>
          </div>
        </div>
      )}

      {walletError && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl shrink-0">error</span>
            <span>{walletError}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchWallet()}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            Thử Lại
          </button>
        </div>
      )}

      {/* Cảnh báo mã PIN hết hạn (chu kỳ 3 tháng / 90 ngày) */}
      {securityStatus?.isPinExpired && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-rose-600 text-2xl shrink-0 animate-bounce">
              security_update_warning
            </span>
            <div className="text-xs sm:text-sm space-y-0.5">
              <p className="font-bold text-rose-950 dark:text-rose-100">
                Mã PIN bảo mật cấp 2 đã quá hạn 3 tháng (90 ngày)
              </p>
              <p className="text-rose-700 dark:text-rose-300 text-xs">
                Theo quy định an toàn tài chính, bạn cần cập nhật mã PIN mới (không trùng mã PIN cũ) để tiếp tục tạo lệnh rút tiền.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPinModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            Đổi PIN Ngay
          </button>
        </div>
      )}

      {/* 2. HEADER: 3 THẺ TINH GỌN CHUẨN SHOPEE (KHÔNG TRÙNG LẶP) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* THẺ 1: SỐ DƯ KHẢ DỤNG (TÂM ĐIỂM) */}
        <div className={`p-6 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-white dark:to-slate-800 border-2 border-emerald-500/40 shadow-sm flex flex-col justify-between transition-all ${
          hasBalancePulse ? 'ring-4 ring-emerald-400/50 scale-[1.01]' : ''
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Số Dư Khả Dụng (Ví Rút Tiền)</span>
              </span>
              <span className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
              </span>
            </div>

            <div className="my-4">
              <div className="text-3xl sm:text-4xl font-black text-emerald-800 dark:text-emerald-300 font-mono tracking-tight">
                {formatVND(metrics.availableBalance)}
              </div>
              <div className="mt-2 text-[11.5px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Tổng đã giải ngân ({metrics.releasedCount} đơn):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{formatVND(metrics.totalReleasedAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>Đã rút về STK ({metrics.withdrawnCount} lệnh):</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">-{formatVND(metrics.totalWithdrawnAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-900/50 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
              {metrics.availableBalance > 0 ? '✓ Sẵn sàng tạo lệnh rút' : 'Chờ hoàn tất đổi trả'}
            </span>
            <button
              type="button"
              onClick={() => setIsWithdrawalModalOpen(true)}
              disabled={metrics.availableBalance <= 0}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <span className="material-symbols-outlined text-sm">payments</span>
              <span>Rút Tiền</span>
            </button>
          </div>
        </div>

        {/* THẺ 2: TIỀN CHỜ QUYẾT TOÁN (ESCROW SÀN TẠM GIỮ) */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-blue-300 transition-all">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base">hourglass_top</span>
                <span>Tiền Chờ Quyết Toán (Sàn Giữ)</span>
              </span>
              <span className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                <span className="material-symbols-outlined text-xl">lock_clock</span>
              </span>
            </div>

            <div className="my-4">
              <div className="text-3xl sm:text-4xl font-black text-blue-700 dark:text-blue-400 font-mono tracking-tight">
                {formatVND(metrics.totalPendingEscrow)}
              </div>
              <div className="mt-2 text-[11.5px] text-slate-600 dark:text-slate-300 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-blue-500">local_shipping</span>
                    <span>Đang giao hàng ({metrics.inTransitCount} món):</span>
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{formatVND(metrics.inTransitAmount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-amber-500">timer</span>
                    <span>Chờ hạn đổi trả 2 phút ({metrics.holdingEscrowCount} món):</span>
                  </span>
                  <span className="font-bold text-amber-600 font-mono">{formatVND(metrics.holdingEscrowAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500">
            <span>Khấu trừ sàn: <strong className="text-slate-700 dark:text-slate-300">5%</strong></span>
            <Link
              href="/seller/escrow"
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline flex items-center gap-0.5"
            >
              <span>Chi tiết đơn chờ giải ngân</span>
              <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </Link>
          </div>
        </div>

        {/* THẺ 3: TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG (KYC) & MÃ PIN */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                <span>Tài Khoản Thụ Hưởng (KYC)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsBankModalOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors cursor-pointer"
                title="Thay đổi tài khoản ngân hàng nhận tiền"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                <span>Cập nhật STK</span>
              </button>
            </div>

            <div className="my-3 space-y-1">
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                {bankInfo.bankName}
              </div>
              <div className="font-mono text-lg font-black text-slate-900 dark:text-white tracking-wider flex items-center gap-2">
                <span>{bankInfo.accountNumber}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Chính chủ
                </span>
              </div>
              <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                {bankInfo.accountHolder}
              </div>
              {businessDetail?.bankBranch && (
                <div className="text-[11px] text-slate-400 truncate">
                  Chi nhánh: {businessDetail.bankBranch}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 font-medium">Mã PIN:</span>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  securityStatus?.isPinExpired
                    ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                    : (securityStatus?.pinDaysRemaining ?? 90) <= 15
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {securityStatus?.isPinExpired
                    ? 'Hết hạn (Quá 90 ngày)'
                    : `An toàn (Còn ${securityStatus?.pinDaysRemaining ?? 90} ngày)`}
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {securityStatus?.pinUpdatedAt
                  ? `Đổi ngày: ${new Date(securityStatus.pinUpdatedAt).toLocaleDateString('vi-VN')}`
                  : 'Mặc định: 123456 (Đổi 3 tháng/lần)'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-bold transition-colors cursor-pointer"
              title="Đổi mã PIN bảo mật 6 số"
            >
              <span className="material-symbols-outlined text-sm">lock_reset</span>
              <span>Đổi mã PIN</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. BẢNG ĐIỀU KHIỂN TRUNG TÂM (3 TABS CHUẨN SHOPEE KÈM PHÂN TRANG) */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 px-6 pt-4 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center gap-2 sm:gap-6 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setActiveTab('ESCROW');
                setEscrowPage(1);
              }}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ESCROW'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">receipt_long</span>
              <span>Đơn Hàng Chờ Quyết Toán</span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {escrowItems.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('PAYOUTS');
                fetchPayoutRequests(1);
              }}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'PAYOUTS'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">payments</span>
              <span>Lịch Sử Rút Tiền Về STK</span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {payoutTotalItems || payoutRequests.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('TRANSACTIONS');
                setTxPage(1);
              }}
              className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'TRANSACTIONS'
                  ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">history</span>
              <span>Nhật Ký Biến Động Ví</span>
              <span className="px-2 py-0.5 rounded-full text-[10.5px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {recentTransactions.length}
              </span>
            </button>
          </div>

          <Link
            href="/seller/reports"
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 pb-3 shrink-0"
          >
            <span>Báo cáo &amp; Sổ cái</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {/* TAB 1: BẢNG DÒNG TIỀN ĐƠN HÀNG & KÝ QUỸ (CÓ PHÂN TRANG) */}
        {activeTab === 'ESCROW' && (
          <div className="p-6">
            {escrowItems.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">hourglass_empty</span>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Chưa có món hàng nào phát sinh</p>
                <p className="text-xs text-slate-400">Các đơn sách sau khi khách đặt sẽ xuất hiện tại đây</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-[11px] border-b border-slate-100 dark:border-slate-700">
                        <th className="py-3 px-3">Mã Đơn &amp; Thời Gian</th>
                        <th className="py-3 px-3">Sách &amp; Ảnh Bìa</th>
                        <th className="py-3 px-3">Khách Hàng &amp; Địa Chỉ</th>
                        <th className="py-3 px-3 text-right">Tổng Tiền (100%)</th>
                        <th className="py-3 px-3 text-right">Phí Sàn (5%)</th>
                        <th className="py-3 px-3 text-right">Thực Nhận (95%)</th>
                        <th className="py-3 px-3 text-center">Trạng Thái Dòng Tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {paginatedEscrowItems.map((item) => {
                        const isCOD = item.paymentMethod === 'COD';
                        const isCancelled = item.orderStatus === 'CANCELLED' || (item as any).status === 'CANCELLED';

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                              isCancelled ? 'opacity-40 bg-slate-50/30 line-through' : ''
                            }`}
                          >
                            <td className="py-3 px-3">
                              <span className="font-mono font-bold text-slate-900 dark:text-white block text-[11.5px]">
                                #{item.orderCode}
                              </span>
                              <span className="text-[10.5px] text-slate-400 font-mono block mt-0.5">
                                {formatVietnamDateTime(item.orderCreatedAt)}
                              </span>
                              <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isCOD ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              }`}>
                                {isCOD ? '💵 COD' : '💳 PayOS'}
                              </span>
                            </td>

                            <td className="py-3 px-3 max-w-[220px]">
                              <div className="flex items-center gap-2.5">
                                {item.coverUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.coverUrl}
                                    alt={item.bookTitle}
                                    className="w-8 h-11 object-cover rounded shadow-2xs shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-11 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-slate-400 text-sm">book</span>
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <span className="font-medium text-slate-900 dark:text-white truncate block text-[11.5px]" title={item.bookTitle}>
                                    {item.bookTitle}
                                  </span>
                                  <span className="text-[10.5px] text-slate-400 block mt-0.5">
                                    SL: <strong>{item.quantity}</strong> &bull; {formatVND(item.unitPrice)}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 text-[11px] max-w-[180px]">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                                {item.customerName || 'Khách hàng'}
                              </span>
                              <span className="font-mono text-slate-400 block text-[10.5px]">
                                {item.customerPhone || '—'}
                              </span>
                              <span className="text-slate-400 truncate block text-[10px] mt-0.5" title={item.shippingAddress}>
                                {item.shippingAddress || 'Giao tận nơi'}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              {formatVND(item.subtotal)}
                            </td>

                            <td className="py-3 px-3 text-right font-mono text-rose-500 font-semibold">
                              -{formatVND(item.platformFee)}
                            </td>

                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              +{formatVND(item.sellerNet)}
                            </td>

                            <td className="py-3 px-3 text-center">
                              <EscrowTableBadge
                                item={item}
                                onAutoRelease={handleAutoReleaseItem}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Phân Trang Tab 1 */}
                <SellerPagination
                  currentPage={escrowPage}
                  totalPages={escrowTotalPages}
                  totalItems={escrowItems.length}
                  pageSize={escrowPageSize}
                  onPageChange={(p) => setEscrowPage(p)}
                  className="pt-2 border-t border-slate-100 dark:border-slate-700/60"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: BẢNG LỊCH SỬ RÚT TIỀN (CÓ PHÂN TRANG) */}
        {activeTab === 'PAYOUTS' && (
          <div className="p-6">
            {isPayoutsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <span className="material-symbols-outlined text-2xl animate-spin text-emerald-600">progress_activity</span>
                <span className="text-xs">Đang tải lịch sử rút tiền...</span>
              </div>
            ) : payoutRequests.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">payments</span>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Chưa có yêu cầu rút tiền nào</p>
                <p className="text-xs text-slate-400">Các lệnh rút tiền về tài khoản ngân hàng sẽ được lưu vết đầy đủ tại đây</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-[11px] border-b border-slate-100 dark:border-slate-700">
                        <th className="py-3 px-3">Mã Lệnh Rút</th>
                        <th className="py-3 px-3">Thời Gian Tạo</th>
                        <th className="py-3 px-3">Số Tiền Rút</th>
                        <th className="py-3 px-3">Ngân Hàng Nhận</th>
                        <th className="py-3 px-3 text-center">Trạng Thái Duyệt</th>
                        <th className="py-3 px-3">Thời Gian Giải Ngân</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                      {payoutRequests.map((req) => {
                        const status = req.status;
                        let statusBadge: { label: string; bg: string } = { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
                        if (status === 'PENDING') {
                          statusBadge = { label: 'Chờ kế toán duyệt', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
                        } else if (status === 'APPROVED') {
                          statusBadge = { label: 'Đã phê duyệt', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
                        } else if (status === 'PROCESSING') {
                          statusBadge = { label: 'Đang chuyển khoản', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                        } else if (status === 'COMPLETED' || (status as any) === 'DISBURSED') {
                          statusBadge = { label: 'Giải ngân thành công', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                        } else if (status === 'REJECTED') {
                          statusBadge = { label: 'Bị từ chối', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
                        }

                        return (
                          <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white text-[11.5px]">
                              #{req.id.slice(0, 10)}
                            </td>
                            <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                              {formatVietnamDateTime(req.requestedAt || req.createdAt)}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                              {formatVND(req.amount)}
                            </td>
                            <td className="py-3 px-3 text-slate-700 dark:text-slate-300 text-[11px]">
                              <span className="font-bold block">{req.bankSnapshot?.bankName || bankInfo.bankName}</span>
                              <span className="font-mono text-slate-400">{req.bankSnapshot?.accountNumber || bankInfo.accountNumber}</span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold border ${statusBadge.bg}`}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                              {req.disbursedAt || req.reviewedAt ? formatVietnamDateTime(req.disbursedAt || req.reviewedAt) : 'Đang xử lý'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Phân Trang Tab 2 */}
                <SellerPagination
                  currentPage={payoutPage}
                  totalPages={payoutTotalPages}
                  totalItems={payoutTotalItems || payoutRequests.length}
                  pageSize={10}
                  onPageChange={(p) => fetchPayoutRequests(p)}
                  className="pt-2 border-t border-slate-100 dark:border-slate-700/60"
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BẢNG NHẬT KÝ BIẾN ĐỘNG VÍ (CÓ PHÂN TRANG) */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="p-6">
            {recentTransactions.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300">receipt_long</span>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Chưa có giao dịch nào</p>
                <p className="text-xs text-slate-400">Các biến động tăng giảm số dư ví sẽ được ghi lại đầy đủ tại đây</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {paginatedTransactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT_AVAILABLE' || tx.type === 'MOVE_PENDING_TO_AVAILABLE';
                    return (
                      <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                        <div className="flex items-center gap-3.5">
                          <span className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                            isCredit ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span className="material-symbols-outlined text-lg">
                              {isCredit ? 'add_circle' : 'remove_circle'}
                            </span>
                          </span>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
                              {tx.description || 'Biến động số dư'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {formatVietnamDateTime(tx.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div className={`font-mono font-bold text-sm whitespace-nowrap text-right ${
                          isCredit ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {isCredit ? `+${formatVND(tx.amount)}` : `-${formatVND(tx.amount)}`}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Phân Trang Tab 3 */}
                <SellerPagination
                  currentPage={txPage}
                  totalPages={txTotalPages}
                  totalItems={recentTransactions.length}
                  pageSize={txPageSize}
                  onPageChange={(p) => setTxPage(p)}
                  className="pt-2 border-t border-slate-100 dark:border-slate-700/60"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL RÚT TIỀN 2 BƯỚC (XÁC THỰC MÃ PIN 6 SỐ) */}
      <WithdrawalPinModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        storeId={storeId || undefined}
        availableBalance={metrics.availableBalance}
        bankInfo={bankInfo}
        onSuccess={handleRefreshAll}
      />

      {/* MODAL CẬP NHẬT TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG */}
      <UpdateBankModal
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        businessId={businessDetail?.id || user?.business?.id || undefined}
        storeId={storeId || undefined}
        currentBankInfo={modalBankInfo}
        onSuccess={handleRefreshAll}
      />

      {/* MODAL CẬP NHẬT MÃ PIN (QUY ĐỊNH 3 THÁNG / LẦN & KHÔNG TRÙNG MÃ PIN CŨ) */}
      <UpdatePinModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        storeId={storeId || undefined}
        onSuccess={handleRefreshAll}
      />
    </div>
  );
}
