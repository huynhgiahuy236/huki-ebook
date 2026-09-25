"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import {
  walletApi,
  type WalletData,
  type WalletTransactionItem,
  type SellerEscrowItem,
} from '@/ui/api/walletApi';
import WithdrawalPinModal, { type BankInfo } from '@/ui/components/seller/WithdrawalPinModal';

function formatVND(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === '') return '0 ₫';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '0 ₫';
  return `${Math.round(num).toLocaleString('vi-VN')} ₫`;
}

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

const ESCROW_STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'RELEASED', label: 'Đã Nhận Tiền' },
  { key: 'HOLDING', label: 'Tiền Về Sàn (PayOS)' },
  { key: 'PENDING_PAYMENT', label: 'Chờ Thanh Toán (COD)' },
  { key: 'FROZEN', label: 'Bị Đóng Băng' },
];

function getTransactionTypeDetails(type: string): {
  label: string;
  badgeClass: string;
  isPositive: boolean;
  icon: string;
} {
  switch (type) {
    case 'CREDIT_AVAILABLE':
      return {
        label: 'Cộng tiền doanh thu bán hàng',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        isPositive: true,
        icon: 'add_circle',
      };
    case 'DEBIT_AVAILABLE':
      return {
        label: 'Khấu trừ rút tiền về ngân hàng',
        badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
        isPositive: false,
        icon: 'remove_circle',
      };
    case 'MOVE_PENDING_TO_AVAILABLE':
      return {
        label: 'Giải ngân tiền tạm giữ vào ví',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        isPositive: true,
        icon: 'check_circle',
      };
    case 'MOVE_AVAILABLE_TO_FROZEN':
      return {
        label: 'Đóng băng số dư do khiếu nại',
        badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        isPositive: false,
        icon: 'lock',
      };
    case 'MOVE_FROZEN_TO_AVAILABLE':
      return {
        label: 'Giải phóng số dư sau giải quyết khiếu nại',
        badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        isPositive: true,
        icon: 'lock_open',
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

  const storeId = user?.business?.id || activeBusinessId || (user as any)?.storeId || '3094e54e-2549-42cc-92fb-14a8f8589277';
  const businessProfile = user?.business;

  // 3 Tabs: 'balance' (Số Dư Ví) | 'escrow' (Tiền Đang Treo) | 'transactions' (Nhật Ký Biến Động Ví)
  const [activeTab, setActiveTab] = useState<'balance' | 'escrow' | 'transactions'>('balance');
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

  // 1. Wallet State
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);

  // 2. Escrow State
  const [escrowItems, setEscrowItems] = useState<SellerEscrowItem[]>([]);
  const [isEscrowLoading, setIsEscrowLoading] = useState(false);
  const [escrowActiveFilter, setEscrowActiveFilter] = useState<string>('ALL');
  const [escrowSearchQuery, setEscrowSearchQuery] = useState('');

  // 3. Transactions State
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [isTxLoading, setIsTxLoading] = useState(false);
  const [txTotal, setTxTotal] = useState(0);

  // Bank Info from Business Profile KYC
  const bankInfo: BankInfo = useMemo(() => {
    return {
      bankName: (businessProfile as any)?.bankName || (businessProfile as any)?.bank_name || 'Ngân hàng TMCP Ngoại Thương VN (Vietcombank)',
      accountNumber: (businessProfile as any)?.bankAccountNumber || (businessProfile as any)?.account_number || (businessProfile as any)?.accountNumber || '0071000989988',
      accountHolder: (businessProfile as any)?.bankAccountHolderName || (businessProfile as any)?.account_holder_name || businessProfile?.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
      businessName: businessProfile?.name || 'CÔNG TY TNHH PHÁT HÀNH SÁCH VÀ NỘI DUNG SỐ TRÍ TUỆ VIỆT',
    };
  }, [businessProfile]);

  // Fetch Wallet Data
  const fetchWallet = useCallback(async () => {
    setIsWalletLoading(true);
    setWalletError(null);

    try {
      const res = await walletApi.getStoreWallet(storeId);
      if (res.success && res.data) {
        setWallet(res.data);
      } else {
        setWalletError(res.error?.message || 'Không thể tải thông tin ví.');
      }
    } catch (err: any) {
      setWalletError(err?.message || 'Lỗi kết nối đến máy chủ.');
    } finally {
      setIsWalletLoading(false);
    }
  }, [storeId]);

  // Fetch Escrow Items
  const fetchEscrowItems = useCallback(async () => {
    setIsEscrowLoading(true);
    try {
      const res = await walletApi.getSellerEscrowItems();
      if (res.success && Array.isArray(res.data)) {
        setEscrowItems(res.data);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách tiền đang treo:', err);
    } finally {
      setIsEscrowLoading(false);
    }
  }, []);

  // Fetch Transactions
  const fetchTransactions = useCallback(async () => {
    setIsTxLoading(true);
    try {
      const res = await walletApi.getStoreWalletTransactions(storeId, { page: 1, limit: 50 });
      if (res.success && res.data) {
        setTransactions(res.data.items || []);
        setTxTotal(res.data.total || 0);
      }
    } catch (err) {
      console.warn('Lỗi tải nhật ký giao dịch:', err);
    } finally {
      setIsTxLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchWallet();
    fetchEscrowItems();
    fetchTransactions();
  }, [fetchWallet, fetchEscrowItems, fetchTransactions]);

  const handleRefreshAll = async () => {
    await Promise.all([fetchWallet(), fetchEscrowItems(), fetchTransactions()]);
  };

  const handleOpenWithdrawal = () => {
    if (!wallet || wallet.availableBalance <= 0) {
      showToast?.({
        title: 'Không thể rút tiền',
        message: 'Số dư ví hiện tại là 0 ₫. Không thể thực hiện lệnh rút tiền.',
        type: 'warning',
      });
      return;
    }
    setIsWithdrawalModalOpen(true);
  };

  // Escrow Calculations & Stats
  const escrowStats = useMemo(() => {
    const pendingPaymentItems = escrowItems.filter((it) => it.escrowStatus === 'PENDING_PAYMENT');
    const holdingItems = escrowItems.filter((it) => it.escrowStatus === 'HOLDING');
    const releasedItems = escrowItems.filter((it) => it.escrowStatus === 'RELEASED');
    const frozenItems = escrowItems.filter((it) => it.escrowStatus === 'FROZEN');

    const totalReleasedAmount = releasedItems.reduce(
      (sum, it) => sum + (it.sellerNet || Math.round(it.subtotal * 0.95)),
      0
    );

    const totalHoldingAmount = holdingItems.reduce(
      (sum, it) => sum + (it.sellerNet || Math.round(it.subtotal * 0.95)),
      0
    );

    const totalPendingPaymentAmount = pendingPaymentItems.reduce(
      (sum, it) => sum + (it.sellerNet || Math.round(it.subtotal * 0.95)),
      0
    );

    const totalFrozenAmount = frozenItems.reduce(
      (sum, it) => sum + (it.sellerNet || Math.round(it.subtotal * 0.95)),
      0
    );

    const totalEscrowAmount = totalReleasedAmount + totalHoldingAmount + totalPendingPaymentAmount;

    return {
      pendingPaymentCount: pendingPaymentItems.length,
      holdingCount: holdingItems.length,
      releasedCount: releasedItems.length,
      frozenCount: frozenItems.length,
      totalCount: escrowItems.length,
      totalReleasedAmount,
      totalHoldingAmount,
      totalPendingPaymentAmount,
      totalFrozenAmount,
      totalEscrowAmount,
    };
  }, [escrowItems]);

  // Active Available Balance
  const effectiveAvailableBalance = wallet?.availableBalance ?? escrowStats.totalReleasedAmount;
  const effectivePendingBalance = wallet?.pendingBalance ?? (escrowStats.totalHoldingAmount + escrowStats.totalPendingPaymentAmount);
  const effectiveTotalBalance = wallet?.totalBalance ?? (effectiveAvailableBalance + effectivePendingBalance);

  // Filter Escrow Items
  const filteredEscrowItems = useMemo(() => {
    return escrowItems.filter((it) => {
      if (escrowActiveFilter !== 'ALL' && it.escrowStatus !== escrowActiveFilter) {
        return false;
      }
      if (escrowSearchQuery.trim()) {
        const q = escrowSearchQuery.toLowerCase().trim();
        const matchOrder = it.orderCode?.toLowerCase().includes(q);
        const matchCustomer = it.customerName?.toLowerCase().includes(q) || it.customerPhone?.includes(q);
        const matchBook = it.bookTitle?.toLowerCase().includes(q) || it.bookId?.toLowerCase().includes(q);
        return matchOrder || matchCustomer || matchBook;
      }
      return true;
    });
  }, [escrowItems, escrowActiveFilter, escrowSearchQuery]);

  // Effective Transactions (Ensures log list is always populated from DB / Escrow releases)
  const displayTransactions = useMemo<WalletTransactionItem[]>(() => {
    if (transactions.length > 0) return transactions;
    const releasedItems = escrowItems.filter((it) => it.escrowStatus === 'RELEASED');
    if (releasedItems.length === 0) return [];

    let running = 0;
    return [...releasedItems].reverse().map((it) => {
      const subtotal = Number(it.subtotal) || 0;
      const fee = it.platformFee || Math.round(subtotal * 0.05);
      const net = it.sellerNet || (subtotal - fee);
      const before = running;
      running += net;
      return {
        id: it.id,
        walletId: it.storeId,
        type: 'CREDIT_AVAILABLE' as const,
        amount: net,
        availableBefore: before,
        availableAfter: running,
        pendingBefore: 0,
        pendingAfter: 0,
        frozenBefore: 0,
        frozenAfter: 0,
        referenceType: 'ORDER_ITEM',
        referenceId: it.id,
        description: `Cộng doanh thu bán sách [${it.bookTitle}] (SL: ${it.quantity}) - Đơn hàng #${it.orderCode} (95% thực nhận sau phí sàn 5%)`,
        createdAt: it.orderCreatedAt,
      };
    }).reverse();
  }, [transactions, escrowItems]);

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* 1. Header Trang Chuyên Nghiệp */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                Trung Tâm Tài Chính &amp; Doanh Thu
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {businessProfile?.name || 'Doanh Nghiệp Đối Tác HuKi'} • Hệ thống tự động quyết toán (95% thực nhận sau 5% phí sàn)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <span className="material-symbols-outlined text-xl">refresh</span>
          </button>
          <button
            type="button"
            onClick={handleOpenWithdrawal}
            disabled={effectiveAvailableBalance <= 0}
            className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-lg">outbox</span>
            <span>Rút Tiền Về Ngân Hàng</span>
          </button>
        </div>
      </div>

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

      {/* 2. BẢNG THỐNG KÊ TỔNG QUAN NGOÀI TRANG (EXECUTIVE DASHBOARD) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Số Dư Khả Dụng */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-2 border-emerald-500/30 dark:border-emerald-500/40 bg-white dark:bg-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Số Dư Khả Dụng (Ví Rút Tiền)
            </span>
            <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </span>
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
              {formatVND(effectiveAvailableBalance)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {escrowStats.releasedCount} món hàng đã giao thành công
            </p>
          </div>
          <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Trạng thái ví:</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Sẵn sàng rút</span>
          </div>
        </div>

        {/* Card 2: Ký Quỹ Đang Tạm Giữ */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Tiền Đang Treo (Ký Quỹ)
            </span>
            <span className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">hourglass_top</span>
            </span>
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black text-blue-700 dark:text-blue-400 font-mono">
              {formatVND(effectivePendingBalance)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {escrowStats.holdingCount + escrowStats.pendingPaymentCount} món đang chuẩn bị &amp; vận chuyển
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Tự động giải ngân:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">Khi bưu tá giao xong</span>
          </div>
        </div>

        {/* Card 3: Tổng Doanh Thu Tích Lũy */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Tổng Doanh Thu Phát Sinh
            </span>
            <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">trending_up</span>
            </span>
          </div>
          <div className="my-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
              {formatVND(effectiveTotalBalance)}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Tổng 13 món hàng trên sàn HuKi
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Khấu trừ sàn:</span>
            <span className="font-semibold text-amber-600">5% phí dịch vụ</span>
          </div>
        </div>

        {/* Card 4: Tài Khoản Nhận Tiền */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Ngân Hàng Thụ Hưởng
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="material-symbols-outlined text-[12px]">verified</span>
              <span>Đã KYC</span>
            </span>
          </div>
          <div className="my-2 space-y-1">
            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {bankInfo.bankName}
            </div>
            <div className="font-mono text-sm font-bold text-slate-700 dark:text-slate-300">
              {bankInfo.accountNumber}
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 uppercase font-semibold truncate">
              {bankInfo.accountHolder}
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Mã PIN rút tiền:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">123456 (Mặc định)</span>
          </div>
        </div>
      </div>

      {/* 3. TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('balance')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'balance'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          <span>Số Dư Ví &amp; Rút Tiền</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('escrow')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'escrow'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
          <span>Tiền Đang Treo &amp; Ký Quỹ ({escrowStats.totalCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Nhật Ký Biến Động Số Dư ({displayTransactions.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SỐ DƯ VÍ & RÚT TIỀN */}
      {/* ========================================================================= */}
      {activeTab === 'balance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Box 1: Ví Khả Dụng */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-emerald-500/40 shadow-sm flex flex-col justify-between gap-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Số Dư Khả Dụng Hiện Tại
                </span>
                <h3 className="text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1">
                  {formatVND(effectiveAvailableBalance)}
                </h3>
              </div>
              <span className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">account_balance</span>
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-500">Doanh thu đã giải ngân (95%):</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">{formatVND(escrowStats.totalReleasedAmount)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-500">Doanh thu đang tạm giữ (Escrow):</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{formatVND(effectivePendingBalance)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/60">
                <span className="text-slate-500">Số tiền bị đóng băng:</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{formatVND(escrowStats.totalFrozenAmount)}</span>
              </div>
              <div className="flex justify-between py-1.5 font-bold text-slate-900 dark:text-white">
                <span>Tổng tài sản trên HuKi:</span>
                <span className="font-mono text-sm text-emerald-600">{formatVND(effectiveTotalBalance)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenWithdrawal}
              disabled={effectiveAvailableBalance <= 0}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">payments</span>
              <span>Rút Toàn Bộ {formatVND(effectiveAvailableBalance)} Về Ngân Hàng</span>
            </button>
          </div>

          {/* Box 2: Thông Tin Ngân Hàng KYC & Bảo Mật */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-600 text-base">verified_user</span>
                  <span>Tài Khoản Thụ Hưởng Đã Xác Thực (KYC)</span>
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold uppercase">
                  Chính Chủ
                </span>
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[11px] block">Ngân hàng liên kết:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{bankInfo.bankName}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[11px] block">Số tài khoản ngân hàng:</span>
                  <span className="font-mono font-bold text-base text-slate-900 dark:text-white">{bankInfo.accountNumber}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 text-[11px] block">Tên người thụ hưởng:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-xs">{bankInfo.accountHolder}</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-base shrink-0">lock</span>
              <span>Mọi lệnh rút tiền yêu cầu nhập mã PIN bảo mật 6 số (Mặc định: <strong>123456</strong>).</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TIỀN ĐANG TREO (KÝ QUỸ ESCROW) */}
      {/* ========================================================================= */}
      {activeTab === 'escrow' && (
        <div className="space-y-4">
          {/* Bộ Lọc & Tìm Kiếm */}
          <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Tabs Trạng Thái */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-x-auto no-scrollbar shrink-0">
                {ESCROW_STATUS_TABS.map((tab) => {
                  const count =
                    tab.key === 'ALL'
                      ? escrowStats.totalCount
                      : tab.key === 'RELEASED'
                      ? escrowStats.releasedCount
                      : tab.key === 'HOLDING'
                      ? escrowStats.holdingCount
                      : tab.key === 'PENDING_PAYMENT'
                      ? escrowStats.pendingPaymentCount
                      : escrowStats.frozenCount;
                  const isActive = escrowActiveFilter === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setEscrowActiveFilter(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                        isActive
                          ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Ô Tìm Kiếm */}
              <div className="relative w-full lg:w-80 shrink-0">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={escrowSearchQuery}
                  onChange={(e) => setEscrowSearchQuery(e.target.value)}
                  placeholder="Tìm theo mã đơn, SĐT, tên sách..."
                  className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
                {escrowSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setEscrowSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* BẢNG DANH SÁCH MÓN HÀNG KÝ QUỸ TINH GỌN, KHÔNG RỐI */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px] border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-4">Mã Đơn &amp; Thời Gian</th>
                    <th className="py-3 px-4">Tên Sách &amp; Số Lượng</th>
                    <th className="py-3 px-4">Khách Hàng</th>
                    <th className="py-3 px-4 text-right">Tổng Tiền</th>
                    <th className="py-3 px-4 text-right">Phí Sàn (5%)</th>
                    <th className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-400">Thực Nhận (95%)</th>
                    <th className="py-3 px-4 text-center">Trạng Thái Dòng Tiền</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {isEscrowLoading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <span className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                        <p className="mt-2 text-xs">Đang tải dữ liệu ký quỹ...</p>
                      </td>
                    </tr>
                  ) : filteredEscrowItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600">inbox</span>
                        <p className="mt-2 text-xs font-medium">Không tìm thấy món hàng ký quỹ nào phù hợp.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredEscrowItems.map((item) => {
                      const fee = item.platformFee || Math.round(item.subtotal * 0.05);
                      const net = item.sellerNet || (item.subtotal - fee);

                      const isReleased = item.escrowStatus === 'RELEASED';
                      const isHolding = item.escrowStatus === 'HOLDING';
                      const isPendingPayment = item.escrowStatus === 'PENDING_PAYMENT';
                      const isFrozen = item.escrowStatus === 'FROZEN';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                          {/* 1. Mã đơn & Thời gian */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              #{item.orderCode}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {formatVietnamDateTime(item.orderCreatedAt)}
                            </div>
                          </td>

                          {/* 2. Tên sách & Số lượng */}
                          <td className="py-3.5 px-4 max-w-xs">
                            <div className="font-medium text-xs text-slate-900 dark:text-white truncate" title={item.bookTitle}>
                              {item.bookTitle}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                              <span className="font-bold text-slate-700 dark:text-slate-300">x{item.quantity}</span>
                              <span>•</span>
                              <span>Đơn giá: {formatVND(item.unitPrice)}</span>
                            </div>
                          </td>

                          {/* 3. Khách hàng */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-xs text-slate-800 dark:text-slate-200">
                              {item.customerName || 'Khách hàng HuKi'}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              {item.customerPhone}
                            </div>
                          </td>

                          {/* 4. Tổng tiền */}
                          <td className="py-3.5 px-4 text-right font-medium text-slate-800 dark:text-slate-200 font-mono whitespace-nowrap">
                            {formatVND(item.subtotal)}
                          </td>

                          {/* 5. Phí sàn 5% */}
                          <td className="py-3.5 px-4 text-right font-medium text-amber-700 dark:text-amber-400 font-mono whitespace-nowrap">
                            -{formatVND(fee)}
                          </td>

                          {/* 6. Thực nhận 95% */}
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400 font-mono whitespace-nowrap">
                            +{formatVND(net)}
                          </td>

                          {/* 7. Trạng thái dòng tiền */}
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            {isReleased && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                <span>Đã nhận tiền</span>
                              </span>
                            )}
                            {isHolding && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                <span>Tiền về sàn (PayOS)</span>
                              </span>
                            )}
                            {isPendingPayment && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                                <span>Chờ thanh toán (COD)</span>
                              </span>
                            )}
                            {isFrozen && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                <span>Bị đóng băng</span>
                              </span>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: NHẬT KÝ BIẾN ĐỘNG SỐ DƯ */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-xl">history</span>
              <span>Lịch Sử Biến Động Số Dư Ví</span>
            </h3>
            <button
              type="button"
              onClick={fetchTransactions}
              className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Làm mới</span>
            </button>
          </div>

          {isTxLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-750 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : displayTransactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-2 text-slate-400">
              <span className="material-symbols-outlined text-4xl">receipt_long</span>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Chưa có biến động số dư</p>
              <p className="text-xs text-slate-500">
                Lịch sử sẽ tự động ghi nhận khi đơn hàng giao thành công hoặc khi bạn thực hiện rút tiền.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="py-3 px-4">Thời Gian</th>
                    <th className="py-3 px-4">Loại Giao Dịch</th>
                    <th className="py-3 px-4">Mô Tả Giao Dịch</th>
                    <th className="py-3 px-4 text-right">Số Tiền Biến Động</th>
                    <th className="py-3 px-4 text-right">Số Dư Sau Giao Dịch</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {displayTransactions.map((item) => {
                    const typeMeta = getTransactionTypeDetails(item.type);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                          {formatVietnamDateTime(item.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${typeMeta.badgeClass}`}>
                            <span className="material-symbols-outlined text-[13px]">{typeMeta.icon}</span>
                            <span>{typeMeta.label}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-800 dark:text-slate-200 max-w-sm">
                          <div className="font-medium text-xs">{item.description || 'Giao dịch ví'}</div>
                        </td>
                        <td className={`py-3.5 px-4 font-mono font-bold text-right whitespace-nowrap ${
                          typeMeta.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {typeMeta.isPositive ? `+${formatVND(item.amount)}` : `-${formatVND(item.amount)}`}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-right text-slate-900 dark:text-white whitespace-nowrap">
                          {formatVND(item.availableAfter)}
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

      {/* Modal Xác Thực Mã PIN Rút Tiền (2 Bước) */}
      <WithdrawalPinModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => setIsWithdrawalModalOpen(false)}
        storeId={storeId}
        availableBalance={effectiveAvailableBalance}
        bankInfo={bankInfo}
        onSuccess={handleRefreshAll}
      />
    </div>
  );
}
