"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { walletApi, payoutApi, type WalletData, type WalletTransactionItem, type PayoutRequestView } from '@/ui/api/walletApi';
import WithdrawalPinModal from '@/ui/components/seller/WithdrawalPinModal';

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

function getPayoutStatusMeta(status: string): { label: string; badgeClass: string; icon: string } {
  switch (status) {
    case 'PENDING':
      return {
        label: 'Chờ Sàn Duyệt (Pending)',
        badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        icon: 'hourglass_top',
      };
    case 'APPROVED':
      return {
        label: 'Đã Duyệt (Approved)',
        badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        icon: 'verified',
      };
    case 'REJECTED':
      return {
        label: 'Từ Chối (Đã Hoàn Số Dư)',
        badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        icon: 'cancel',
      };
    case 'PROCESSING':
      return {
        label: 'Đang Chi Trả',
        badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        icon: 'sync',
      };
    case 'COMPLETED':
      return {
        label: 'Hoàn Tất Giải Ngân',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        icon: 'check_circle',
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-800',
        icon: 'help',
      };
  }
}

function getTransactionTypeDetails(type: string): {
  label: string;
  badgeClass: string;
  isPositive: boolean;
  icon: string;
} {
  switch (type) {
    case 'CREDIT_PENDING':
      return {
        label: 'Ghi nhận doanh thu chờ quyết toán',
        badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        isPositive: true,
        icon: 'hourglass_top',
      };
    case 'MOVE_PENDING_TO_AVAILABLE':
      return {
        label: 'Quyết toán tiền vào số dư khả dụng',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        isPositive: true,
        icon: 'check_circle',
      };
    case 'CREDIT_AVAILABLE':
      return {
        label: 'Cộng trực tiếp số dư khả dụng',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        isPositive: true,
        icon: 'add_circle',
      };
    case 'MOVE_AVAILABLE_TO_FROZEN':
      return {
        label: 'Đóng băng số dư khả dụng do khiếu nại',
        badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        isPositive: false,
        icon: 'lock',
      };
    case 'MOVE_FROZEN_TO_AVAILABLE':
      return {
        label: 'Giải phóng số dư đóng băng sau phân xử',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        isPositive: true,
        icon: 'lock_open',
      };
    case 'MOVE_FROZEN_TO_PENDING':
      return {
        label: 'Chuyển số dư đóng băng về chờ quyết toán',
        badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        isPositive: true,
        icon: 'restore',
      };
    case 'CREDIT_FROZEN':
      return {
        label: 'Ghi nhận số dư đóng băng tạm thời',
        badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        isPositive: true,
        icon: 'lock',
      };
    case 'DEBIT_AVAILABLE':
      return {
        label: 'Khấu trừ số dư khả dụng',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        isPositive: false,
        icon: 'remove_circle',
      };
    default:
      return {
        label: type,
        badgeClass: 'bg-slate-50 text-slate-700 dark:bg-slate-900 dark:text-slate-300 border-slate-200 dark:border-slate-800',
        isPositive: true,
        icon: 'receipt',
      };
  }
}

export default function SellerFinancePage() {
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();

  const storeId = user?.business?.id || activeBusinessId || (user as any)?.storeId;

  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'payout_requests' | 'settlement_guide'>('overview');
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

  // Wallet Data State
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState(false);
  const [isWalletNotFound, setIsWalletNotFound] = useState(false);

  // Transactions State
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [isTxLoading, setIsTxLoading] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);
  const [txTotal, setTxTotal] = useState(0);

  // Payout Requests State
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequestView[]>([]);
  const [isPayoutLoading, setIsPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);

  // 1. Fetch Wallet Balance
  const fetchWallet = useCallback(async () => {
    if (!storeId) {
      setIsWalletLoading(false);
      return;
    }

    setIsWalletLoading(true);
    setWalletError(null);
    setIsForbidden(false);
    setIsWalletNotFound(false);

    try {
      const res = await walletApi.getStoreWallet(storeId);
      if (res.success && res.data) {
        setWallet(res.data);
      } else {
        const statusCode = res.error?.statusCode;
        if (statusCode === 403) {
          setIsForbidden(true);
        } else if (statusCode === 404) {
          setIsWalletNotFound(true);
        } else {
          setWalletError(res.error?.message || 'Không thể tải thông tin ví của gian hàng.');
        }
      }
    } catch (err: any) {
      setWalletError(err?.message || 'Lỗi kết nối đến máy chủ tài chính.');
    } finally {
      setIsWalletLoading(false);
    }
  }, [storeId]);

  // 2. Fetch Operational Transactions
  const fetchTransactions = useCallback(async () => {
    if (!storeId) {
      setIsTxLoading(false);
      return;
    }

    setIsTxLoading(true);
    setTxError(null);

    try {
      const res = await walletApi.getStoreWalletTransactions(storeId, { page: 1, limit: 30 });
      if (res.success && res.data) {
        setTransactions(res.data.items || []);
        setTxTotal(res.data.total || 0);
      } else {
        setTxError(res.error?.message || 'Không thể tải lịch sử biến động số dư.');
      }
    } catch (err: any) {
      setTxError(err?.message || 'Lỗi kết nối khi tải lịch sử giao dịch.');
    } finally {
      setIsTxLoading(false);
    }
  }, [storeId]);

  // 3. Fetch Payout Requests
  const fetchPayoutRequests = useCallback(async () => {
    if (!storeId) {
      setIsPayoutLoading(false);
      return;
    }

    setIsPayoutLoading(true);
    setPayoutError(null);

    try {
      const res = await payoutApi.getStorePayoutRequests(storeId);
      if (res.success && res.data) {
        setPayoutRequests(res.data.items || []);
      } else {
        setPayoutError(res.error?.message || 'Không thể tải danh sách yêu cầu rút tiền.');
      }
    } catch (err: any) {
      setPayoutError(err?.message || 'Lỗi kết nối khi tải yêu cầu rút tiền.');
    } finally {
      setIsPayoutLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
    fetchPayoutRequests();
  }, [fetchWallet, fetchTransactions, fetchPayoutRequests]);

  const handleRefreshAll = async () => {
    await Promise.all([fetchWallet(), fetchTransactions(), fetchPayoutRequests()]);
  };

  const handleOpenWithdrawal = () => {
    if (!wallet || wallet.availableBalance <= 0) {
      showToast?.('Số dư khả dụng hiện tại là 0 ₫. Không thể tạo lệnh rút tiền.', 'warning');
      return;
    }
    setIsWithdrawalModalOpen(true);
  };

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-container-lowest p-6 rounded-3xl border border-theme-border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>
            <h1 className="font-editorial text-2xl sm:text-3xl font-black text-on-surface">
              Ví Gian Hàng & Quyết Toán Doanh Thu
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1.5 max-w-2xl">
            Theo dõi số dư khả dụng, tiền ký quỹ đang trong thời gian bảo vệ giao dịch và quản lý dòng tiền minh bạch chuẩn kế toán kép.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenWithdrawal}
          className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold hover:opacity-95 shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-[18px]">outbox</span>
          <span>Rút Tiền Về Ngân Hàng</span>
        </button>
      </div>

      {/* Security / Error / Status Banners */}
      {isForbidden && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-xl shrink-0">gpp_bad</span>
          <div>
            <strong>Truy Cập Bị Từ Chối (403):</strong> Bạn không có quyền truy cập thông tin tài chính của gian hàng này. Dữ liệu ví được cô lập nghiêm ngặt theo chủ sở hữu gian hàng.
          </div>
        </div>
      )}

      {isWalletNotFound && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs sm:text-sm flex items-center gap-3">
          <span className="material-symbols-outlined text-xl shrink-0">info</span>
          <div>
            <strong>Ví Chưa Được Khởi Tạo:</strong> Gian hàng của bạn chưa phát sinh giao dịch đầu tiên. Hệ thống sẽ tự động kích hoạt ví với số dư ban đầu 0 ₫ ngay khi có đơn hàng được thanh toán.
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
            onClick={fetchWallet}
            className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors"
          >
            Thử Lại
          </button>
        </div>
      )}

      {/* 4 CANONICAL WALLET METRIC CARDS (WAL-001) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Available Balance */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest border-2 border-emerald-500/40 shadow-xs flex flex-col justify-between gap-3 transition-all hover:border-emerald-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Số Dư Khả Dụng
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">account_balance</span>
            </span>
          </div>
          <div>
            {isWalletLoading ? (
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg my-1"></div>
            ) : (
              <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {formatVND(wallet?.availableBalance)}
              </div>
            )}
            <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
              Doanh thu đã hoàn tất quyết toán, sẵn sàng cho các kỳ giải ngân.
            </p>
          </div>
        </div>

        {/* Card 2: Pending Balance */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest border border-theme-border shadow-xs flex flex-col justify-between gap-3 transition-all hover:border-amber-400">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Ký Quỹ Chờ Quyết Toán
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
            </span>
          </div>
          <div>
            {isWalletLoading ? (
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg my-1"></div>
            ) : (
              <div className="font-mono text-2xl font-black text-amber-600 dark:text-amber-400">
                {formatVND(wallet?.pendingBalance)}
              </div>
            )}
            <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
              Doanh thu thực nhận dự kiến đang trong thời gian bảo vệ giao dịch.
            </p>
          </div>
        </div>

        {/* Card 3: Frozen Balance */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest border border-theme-border shadow-xs flex flex-col justify-between gap-3 transition-all hover:border-rose-400">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Đóng Băng Tạm Thời
            </span>
            <span className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">lock</span>
            </span>
          </div>
          <div>
            {isWalletLoading ? (
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg my-1"></div>
            ) : (
              <div className="font-mono text-2xl font-black text-rose-600 dark:text-rose-400">
                {formatVND(wallet?.frozenBalance)}
              </div>
            )}
            <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
              Khoản tiền tạm phong tỏa xử lý khiếu nại tranh chấp hoặc kiểm duyệt.
            </p>
          </div>
        </div>

        {/* Card 4: Total Wallet Value */}
        <div className="p-5 rounded-3xl bg-surface-container-lowest border border-theme-border shadow-xs flex flex-col justify-between gap-3 transition-all hover:border-primary">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Tổng Giá Trị Tài Sản Ví
            </span>
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </span>
          </div>
          <div>
            {isWalletLoading ? (
              <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg my-1"></div>
            ) : (
              <div className="font-mono text-2xl font-black text-on-surface">
                {formatVND(wallet?.totalBalance)}
              </div>
            )}
            <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">
              Tổng tài sản ví = Khả dụng + Chờ quyết toán + Đóng băng (WAL-001).
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-theme-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Nhật Ký Biến Động Ví ({txTotal})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payout_requests')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'payout_requests'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">payments</span>
          <span>Yêu Cầu Rút Tiền ({payoutRequests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settlement_guide')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            activeTab === 'settlement_guide'
              ? 'bg-primary text-white shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">help_outline</span>
          <span>Cơ Chế Quyết Toán (POL-14)</span>
        </button>
      </div>

      {/* TAB 1: TRANSACTION AUDIT HISTORY */}
      {activeTab === 'overview' && (
        <div className="bg-surface-container-lowest rounded-3xl border border-theme-border p-6 shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">history</span>
              <span>Lịch Sử Giao Dịch Số Dư Ví Gian Hàng</span>
            </h3>
            <button
              type="button"
              onClick={fetchTransactions}
              className="text-xs text-primary font-bold hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Làm mới</span>
            </button>
          </div>

          {txError && (
            <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{txError}</span>
            </div>
          )}

          {isTxLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/60 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">receipt_long</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Chưa Có Biến Động Số Dư</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Lịch sử giao dịch sẽ tự động ghi nhận khi có đơn hàng được thanh toán hoặc quyết toán.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="text-[11px] uppercase font-bold text-on-surface-variant border-b border-theme-border">
                  <tr>
                    <th className="py-3 px-3">Thời Gian</th>
                    <th className="py-3 px-3">Loại Giao Dịch</th>
                    <th className="py-3 px-3">Mô Tả / Tham Chiếu</th>
                    <th className="py-3 px-3 text-right">Số Tiền</th>
                    <th className="py-3 px-3 text-right">Khả Dụng (Trước → Sau)</th>
                    <th className="py-3 px-3 text-right">Chờ Quyết Toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/60">
                  {transactions.map((item) => {
                    const typeMeta = getTransactionTypeDetails(item.type);
                    return (
                      <tr key={item.id} className="hover:bg-theme-secondary-subtle/50 transition-colors">
                        <td className="py-3 px-3 text-xs text-on-surface-variant font-mono whitespace-nowrap">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.badgeClass}`}>
                            <span className="material-symbols-outlined text-[12px]">{typeMeta.icon}</span>
                            <span>{typeMeta.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-on-surface max-w-xs truncate">
                          <div className="font-medium text-xs">{item.description || 'Giao dịch ví'}</div>
                          {item.referenceType && (
                            <div className="text-[10px] text-on-surface-variant font-mono mt-0.5">
                              {item.referenceType}: {item.referenceId || 'N/A'}
                            </div>
                          )}
                        </td>
                        <td className={`py-3 px-3 font-mono font-bold text-right whitespace-nowrap ${
                          typeMeta.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {typeMeta.isPositive ? `+${formatVND(item.amount)}` : `-${formatVND(item.amount)}`}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-right text-on-surface-variant whitespace-nowrap">
                          {formatVND(item.availableBefore)} → <strong className="text-on-surface">{formatVND(item.availableAfter)}</strong>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-right text-on-surface-variant whitespace-nowrap">
                          {formatVND(item.pendingAfter)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYOUT REQUESTS LIST */}
      {activeTab === 'payout_requests' && (
        <div className="bg-surface-container-lowest rounded-3xl border border-theme-border p-6 shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-primary">payments</span>
              <span>Lịch Sử Yêu Cầu Rút Tiền Về Ngân Hàng</span>
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchPayoutRequests}
                className="text-xs text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Làm mới</span>
              </button>
              <button
                type="button"
                onClick={handleOpenWithdrawal}
                className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-95 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">add</span>
                <span>Tạo Lệnh Rút Tiền</span>
              </button>
            </div>
          </div>

          {payoutError && (
            <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{payoutError}</span>
            </div>
          )}

          {isPayoutLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/60 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : payoutRequests.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">account_balance</span>
              </div>
              <div>
                <p className="text-sm font-bold text-on-surface">Chưa Có Yêu Cầu Rút Tiền</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Bạn có thể tạo yêu cầu rút tiền từ số dư khả dụng bất kỳ lúc nào với mã PIN bảo mật 6 số và 2FA OTP.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenWithdrawal}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:opacity-95 transition-all"
              >
                Tạo Yêu Cầu Đầu Tiên
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="text-[11px] uppercase font-bold text-on-surface-variant border-b border-theme-border">
                  <tr>
                    <th className="py-3 px-3">Thời Gian</th>
                    <th className="py-3 px-3">Mã Lệnh</th>
                    <th className="py-3 px-3">Tài Khoản Thụ Hưởng</th>
                    <th className="py-3 px-3 text-right">Số Tiền Rút</th>
                    <th className="py-3 px-3">Trạng Thái</th>
                    <th className="py-3 px-3">Ghi Chú / Phản Hồi Sàn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border/60">
                  {payoutRequests.map((req) => {
                    const statusMeta = getPayoutStatusMeta(req.status);
                    return (
                      <tr key={req.id} className="hover:bg-theme-secondary-subtle/50 transition-colors">
                        <td className="py-3 px-3 text-xs text-on-surface-variant font-mono whitespace-nowrap">
                          {formatDate(req.createdAt)}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs font-bold text-on-surface">
                          {req.id.slice(0, 8)}...
                        </td>
                        <td className="py-3 px-3 text-xs text-on-surface">
                          <div className="font-bold">{req.bankSnapshot?.bankName || 'Ngân Hàng'}</div>
                          <div className="text-[11px] text-on-surface-variant font-mono">
                            STK: {req.bankSnapshot?.maskedAccountNumber || req.bankSnapshot?.accountNumberMasked || req.bankSnapshot?.accountNumber} ({req.bankSnapshot?.accountHolder})
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-right text-base text-primary whitespace-nowrap">
                          {formatVND(req.amount)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusMeta.badgeClass}`}>
                            <span className="material-symbols-outlined text-[12px]">{statusMeta.icon}</span>
                            <span>{statusMeta.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-xs text-on-surface-variant max-w-xs">
                          {req.status === 'REJECTED' && req.rejectReason && (
                            <span className="text-rose-600 dark:text-rose-400 font-medium">
                              Lý do: {req.rejectReason}
                            </span>
                          )}
                          {req.status === 'APPROVED' && (
                            <span className="text-blue-600 dark:text-blue-400">
                              Đã duyệt lúc {formatDate(req.approvedAt)} (Chờ cổng ngân hàng giải ngân)
                            </span>
                          )}
                          {req.status === 'PENDING' && (
                            <span className="text-amber-600 dark:text-amber-400">
                              Đang chờ bộ phận kế toán sàn kiểm tra đối soát
                            </span>
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
      )}

      {/* TAB 3: SETTLEMENT POLICY EXPLANATION */}
      {activeTab === 'settlement_guide' && (
        <div className="bg-surface-container-lowest rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs space-y-6">
          <div>
            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">policy</span>
              <span>Cơ Chế Ký Quỹ & Thanh Quyết Toán (Chính Sách POL-14 / POL-15)</span>
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant mt-1">
              Hệ thống sàn Huki áp dụng mô hình bảo đảm giao dịch tự động nhằm bảo vệ quyền lợi người mua và đảm bảo doanh thu an toàn cho thương nhân.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-surface-container-low border border-theme-border space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-lg">menu_book</span>
                <span>Sách In (Physical Book)</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Sau khi đơn hàng giao thành công (<strong className="text-on-surface">DELIVERED</strong>), tiền doanh thu thực nhận được lưu giữ trong trạng thái <strong className="text-amber-600">Ký quỹ chờ quyết toán</strong> trong thời hạn bảo vệ giao dịch và chính sách đổi trả. Sau khi hết thời hạn bảo vệ hoặc khi người mua xác nhận đã nhận hàng, hệ thống sẽ tự động quyết toán vào số dư khả dụng.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-surface-container-low border border-theme-border space-y-2">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <span className="material-symbols-outlined text-lg">tablet_android</span>
                <span>Sách Điện Tử (Ebook / Digital)</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Người mua được mở khóa quyền truy cập sách ngay khi thanh toán thành công. Tiền ký quỹ của tác giả / nhà xuất bản sẽ được tự động giải ngân sang số dư khả dụng sau khi hoàn tất thời gian an toàn giao dịch thanh toán trực tuyến.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-3">
            <span className="material-symbols-outlined text-lg text-emerald-600 shrink-0 mt-0.5">verified_user</span>
            <div className="space-y-1">
              <div className="font-bold">Minh Bạch & Chuẩn Mực Tài Chính:</div>
              <p className="leading-relaxed">
                Mọi biến động số dư trong ví đều được bảo đảm bằng chứng từ kế toán kép (Double-Entry Ledger). Tổng giá trị tài sản ví luôn tuân thủ bất biến WAL-001: <strong className="font-mono">Tổng Tài Sản = Khả Dụng + Chờ Quyết Toán + Đóng Băng</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal PIN & 2FA Modal */}
      <WithdrawalPinModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        storeId={storeId}
        availableBalance={wallet?.availableBalance || 0}
        onSuccess={handleRefreshAll}
      />
    </div>
  );
}
