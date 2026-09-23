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

/**
 * Format chuỗi thời gian sang chuẩn Việt Nam (GMT+7: DD/MM/YYYY HH:mm)
 */
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

/**
 * Helper rút gọn text tối đa 10 ký tự, nếu dài hơn thì thêm ...
 */
function truncate10(str?: string | null): { text: string; isTruncated: boolean } {
  if (!str) return { text: '', isTruncated: false };
  if (str.length <= 10) return { text: str, isTruncated: false };
  return {
    text: `${str.slice(0, 10)}...`,
    isTruncated: true,
  };
}

/**
 * Component hiển thị text tối đa 10 ký tự, khi hover hiển thị tooltip bên dưới
 */
function TruncatedCellWithTooltip({
  text,
  className = '',
}: {
  text?: string | null;
  className?: string;
}) {
  const content = text || '';
  const { text: displayText, isTruncated } = truncate10(content);

  return (
    <div className={`group relative inline-flex items-center ${className}`}>
      <span className="cursor-default font-medium text-slate-800 dark:text-slate-100 select-none">
        {displayText || '—'}
      </span>
      {isTruncated && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 hidden group-hover:flex flex-col items-center z-50 pointer-events-none transition-all duration-200">
          <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 shadow-sm"></div>
          <div className="bg-slate-900 text-white text-xs px-2.5 py-1.5 rounded-md shadow-xl border border-slate-700 whitespace-nowrap max-w-xs break-words text-center font-normal">
            {content}
          </div>
        </div>
      )}
    </div>
  );
}

const ESCROW_STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'PENDING_PAYMENT', label: 'Chờ Thanh Toán' },
  { key: 'HOLDING', label: 'Tiền Về Sàn' },
  { key: 'RELEASED', label: 'Đã Nhận Tiền' },
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

  const storeId = user?.business?.id || activeBusinessId || (user as any)?.storeId;
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
      bankName: (businessProfile as any)?.bankName || (businessProfile as any)?.bank_name || 'Chưa cập nhật ngân hàng',
      accountNumber: (businessProfile as any)?.bankAccountNumber || (businessProfile as any)?.account_number || (businessProfile as any)?.accountNumber || 'Chưa cập nhật số tài khoản',
      accountHolder: (businessProfile as any)?.bankAccountHolderName || (businessProfile as any)?.account_holder_name || businessProfile?.name || 'Chưa cập nhật chủ tài khoản',
      businessName: businessProfile?.name || 'Doanh Nghiệp Đối Tác HUKI',
    };
  }, [businessProfile]);

  // Fetch Wallet Data
  const fetchWallet = useCallback(async () => {
    if (!storeId) {
      setIsWalletLoading(false);
      return;
    }

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
    if (!storeId) return;
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

  // Filter Escrow Items
  const filteredEscrowItems = useMemo(() => {
    return escrowItems.filter((it) => {
      if (escrowActiveFilter !== 'ALL' && it.escrowStatus !== escrowActiveFilter) {
        return false;
      }
      if (escrowSearchQuery.trim()) {
        const q = escrowSearchQuery.toLowerCase();
        const matchOrder = it.orderCode?.toLowerCase().includes(q);
        const matchCustomer = it.customerName?.toLowerCase().includes(q) || it.customerPhone?.includes(q);
        const matchBook = it.bookTitle?.toLowerCase().includes(q) || it.bookId?.toLowerCase().includes(q);
        return matchOrder || matchCustomer || matchBook;
      }
      return true;
    });
  }, [escrowItems, escrowActiveFilter, escrowSearchQuery]);

  // Group Escrow Items by Order
  const groupedEscrowOrders = useMemo(() => {
    const map = new Map<string, { orderCode: string; orderCreatedAt: string; items: SellerEscrowItem[] }>();

    filteredEscrowItems.forEach((it) => {
      if (!map.has(it.orderCode)) {
        map.set(it.orderCode, {
          orderCode: it.orderCode,
          orderCreatedAt: it.orderCreatedAt,
          items: [],
        });
      }
      map.get(it.orderCode)!.items.push(it);
    });

    return Array.from(map.values());
  }, [filteredEscrowItems]);

  // Escrow Stats
  const escrowStats = useMemo(() => {
    const pendingPaymentCount = escrowItems.filter((it) => it.escrowStatus === 'PENDING_PAYMENT').length;
    const holdingCount = escrowItems.filter((it) => it.escrowStatus === 'HOLDING').length;
    const releasedCount = escrowItems.filter((it) => it.escrowStatus === 'RELEASED').length;
    const frozenCount = escrowItems.filter((it) => it.escrowStatus === 'FROZEN').length;

    const totalHoldingAmount = escrowItems
      .filter((it) => it.escrowStatus === 'HOLDING')
      .reduce((sum, it) => sum + (it.sellerNet || Math.round(it.subtotal * 0.95)), 0);

    return {
      pendingPaymentCount,
      holdingCount,
      releasedCount,
      frozenCount,
      totalCount: escrowItems.length,
      totalHoldingAmount,
    };
  }, [escrowItems]);

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Header Trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl sm:text-3xl">
              account_balance_wallet
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold font-editorial text-slate-900 dark:text-white">
              Ví &amp; Doanh Thu Doanh Nghiệp
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-2xl">
            Quản lý số dư ví, theo dõi quỹ ký quỹ tiền đang treo theo từng món hàng (PayOS &amp; COD) và rút tiền bảo mật bằng mã PIN 6 số.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenWithdrawal}
          disabled={!wallet || wallet.availableBalance <= 0}
          className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-lg">outbox</span>
          <span>Rút Tiền Về Ngân Hàng</span>
        </button>
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

      {/* 3 TABS NAVIGATION CHUẨN HOÁ */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-700 pb-3">
        {/* Tab 1: Số Dư Ví */}
        <button
          type="button"
          onClick={() => setActiveTab('balance')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'balance'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          <span>Số Dư Ví</span>
        </button>

        {/* Tab 2: Tiền Đang Treo */}
        <button
          type="button"
          onClick={() => setActiveTab('escrow')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'escrow'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
          <span>Tiền Đang Treo ({escrowStats.holdingCount + escrowStats.pendingPaymentCount})</span>
        </button>

        {/* Tab 3: Nhật Ký Biến Động Ví */}
        <button
          type="button"
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">receipt_long</span>
          <span>Nhật Ký Biến Động Ví ({txTotal})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SỐ DƯ VÍ (MỤC MỚI) */}
      {/* ========================================================================= */}
      {activeTab === 'balance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Số Dư Khả Dụng */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border-2 border-emerald-500/50 shadow-xs flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Số Dư Khả Dụng Trong Ví
                </span>
                <span className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">account_balance</span>
                </span>
              </div>

              <div>
                {isWalletLoading ? (
                  <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 animate-pulse rounded-xl my-1"></div>
                ) : (
                  <div className="font-mono text-3xl sm:text-4xl font-black text-emerald-700 dark:text-emerald-400">
                    {formatVND(wallet?.availableBalance)}
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Doanh thu sau khi trừ 5% phí sàn đã được Ban quản trị bàn giao đầy đủ, sẵn sàng rút về tài khoản ngân hàng.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-slate-500">Mã PIN giao dịch:</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-sm">lock</span>
                  <span>Đã kích hoạt (Mặc định: 123456)</span>
                </span>
              </div>
            </div>

            {/* Card 2: Tài Khoản Thụ Hưởng Doanh Nghiệp (Đã KYC) */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-lg">verified</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Tài Khoản Ngân Hàng Thụ Hưởng (Đã KYC)
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold uppercase">
                  Đã Xác Thực
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-500">Ngân hàng:</span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">{bankInfo.bankName}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-700/50">
                  <span className="text-slate-500">Số tài khoản:</span>
                  <span className="font-mono font-bold text-base text-slate-900 dark:text-white">{bankInfo.accountNumber}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500">Chủ tài khoản:</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase">{bankInfo.accountHolder}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOpenWithdrawal}
                  disabled={!wallet || wallet.availableBalance <= 0}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">outbox</span>
                  <span>Rút Toàn Bộ {formatVND(wallet?.availableBalance)}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TIỀN ĐANG TREO (MỤC MỚI) */}
      {/* ========================================================================= */}
      {activeTab === 'escrow' && (
        <div className="space-y-5">
          {/* Thẻ Thống Kê Tiền Đang Treo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Chờ thanh toán */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Chờ Thanh Toán (COD)
                </span>
                <span className="material-symbols-outlined text-amber-500 text-20">schedule</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-amber-900 dark:text-amber-200">
                {escrowStats.pendingPaymentCount} món
              </div>
              <div className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
                Khách chọn COD, chưa nạp vào PayOS sàn
              </div>
            </div>

            {/* Tiền về sàn */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                  Tiền Về Sàn (PayOS)
                </span>
                <span className="material-symbols-outlined text-blue-500 text-20">account_balance</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-blue-900 dark:text-blue-200">
                {escrowStats.holdingCount} món
              </div>
              <div className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1">
                Tiền đã vào tài khoản PayOS của sàn
              </div>
            </div>

            {/* Đã nhận tiền */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Đã Nhận Tiền Vào Ví
                </span>
                <span className="material-symbols-outlined text-emerald-500 text-20">verified</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-emerald-900 dark:text-emerald-200">
                {escrowStats.releasedCount} món
              </div>
              <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
                Admin sàn đã bấm Bàn giao (+95% ví)
              </div>
            </div>

            {/* Bị đóng băng */}
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 p-4 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Bị Đóng Băng
                </span>
                <span className="material-symbols-outlined text-rose-500 text-20">lock_clock</span>
              </div>
              <div className="mt-2 text-2xl font-extrabold text-rose-900 dark:text-rose-200">
                {escrowStats.frozenCount} món
              </div>
              <div className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1">
                Phát sinh khiếu nại tranh chấp
              </div>
            </div>
          </div>

          {/* Bộ Lọc Trạng Thái & Ô Tìm Kiếm */}
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Tabs Trạng Thái */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-x-auto no-scrollbar shrink-0">
                {ESCROW_STATUS_TABS.map((tab) => {
                  const count =
                    tab.key === 'ALL'
                      ? escrowStats.totalCount
                      : tab.key === 'PENDING_PAYMENT'
                      ? escrowStats.pendingPaymentCount
                      : tab.key === 'HOLDING'
                      ? escrowStats.holdingCount
                      : tab.key === 'RELEASED'
                      ? escrowStats.releasedCount
                      : escrowStats.frozenCount;
                  const isActive = escrowActiveFilter === tab.key;

                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setEscrowActiveFilter(tab.key)}
                      className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-all select-none ${
                        isActive
                          ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
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
              <div className="relative w-full lg:w-72 shrink-0">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-18">
                  search
                </span>
                <input
                  type="text"
                  value={escrowSearchQuery}
                  onChange={(e) => setEscrowSearchQuery(e.target.value)}
                  placeholder="Tìm mã đơn, SĐT, tên sách..."
                  className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white placeholder-slate-400"
                />
                {escrowSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setEscrowSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <span className="material-symbols-outlined text-14">close</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* BẢNG TIỀN ĐANG TREO 12 CỘT QUY CHUẨN */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
            <div className="overflow-x-auto min-h-[350px]">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-700">
                    <th className="py-3 px-3">Mã Đơn Hàng</th>
                    <th className="py-3 px-3">Ngày Giờ Tạo Đơn</th>
                    <th className="py-3 px-3">Khách Hàng</th>
                    <th className="py-3 px-3">SĐT Khách</th>
                    <th className="py-3 px-3">Mã Sản Phẩm</th>
                    <th className="py-3 px-3">Tên Sách</th>
                    <th className="py-3 px-3 text-center">Số Lượng</th>
                    <th className="py-3 px-3 text-right">Đơn Giá</th>
                    <th className="py-3 px-3 text-right">Thành Tiền</th>
                    <th className="py-3 px-3 text-right">Phí Sàn (5%)</th>
                    <th className="py-3 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">Thực Nhận (95%)</th>
                    <th className="py-3 px-3 text-center">Trạng Thái Dòng Tiền</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {isEscrowLoading ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <span className="inline-block w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                        <p className="mt-2 text-xs">Đang tải danh sách tiền đang treo...</p>
                      </td>
                    </tr>
                  ) : groupedEscrowOrders.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-48 text-slate-300 dark:text-slate-600">
                            inbox
                          </span>
                          <p className="text-sm font-medium">Không có món hàng ký quỹ nào phù hợp.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    groupedEscrowOrders.map((group, groupIndex) => {
                      const groupBgClass =
                        groupIndex % 2 === 0
                          ? 'bg-white dark:bg-slate-800'
                          : 'bg-slate-50/80 dark:bg-slate-850/50';

                      return (
                        <React.Fragment key={group.orderCode}>
                          {/* Dòng phân cách đơn hàng */}
                          <tr className="bg-slate-200/80 dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border-y border-slate-300 dark:border-slate-700">
                            <td colSpan={12} className="py-2 px-3.5">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-16">
                                    shopping_bag
                                  </span>
                                  <span>ĐƠN HÀNG: #{group.orderCode}</span>
                                  <span className="text-slate-400 font-normal">|</span>
                                  <span className="text-slate-600 dark:text-slate-400 font-normal">
                                    Ngày tạo: {formatVietnamDateTime(group.orderCreatedAt)}
                                  </span>
                                </div>
                                <span className="text-slate-500 dark:text-slate-400 font-normal text-[11px]">
                                  {group.items.length} món hàng trong đơn
                                </span>
                              </div>
                            </td>
                          </tr>

                          {/* Danh sách từng món hàng */}
                          {group.items.map((item) => {
                            const fee = item.platformFee || Math.round(item.subtotal * 0.05);
                            const net = item.sellerNet || item.subtotal - fee;

                            const isPendingPayment = item.escrowStatus === 'PENDING_PAYMENT';
                            const isHolding = item.escrowStatus === 'HOLDING';
                            const isReleased = item.escrowStatus === 'RELEASED';
                            const isFrozen = item.escrowStatus === 'FROZEN';

                            return (
                              <tr
                                key={item.id}
                                className={`${groupBgClass} hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-colors`}
                              >
                                {/* 1. Mã đơn hàng */}
                                <td className="py-3 px-3 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                  {item.orderCode}
                                </td>

                                {/* 2. Ngày giờ tạo đơn */}
                                <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {formatVietnamDateTime(item.orderCreatedAt)}
                                </td>

                                {/* 3. Khách hàng */}
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <TruncatedCellWithTooltip text={item.customerName} />
                                </td>

                                {/* 4. SĐT Khách */}
                                <td className="py-3 px-3 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {item.customerPhone}
                                </td>

                                {/* 5. Mã sản phẩm */}
                                <td className="py-3 px-3 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {item.bookId}
                                </td>

                                {/* 6. Tên sách */}
                                <td className="py-3 px-3 whitespace-nowrap">
                                  <TruncatedCellWithTooltip text={item.bookTitle} />
                                </td>

                                {/* 7. Số lượng */}
                                <td className="py-3 px-3 text-center font-bold text-slate-800 dark:text-slate-100">
                                  {item.quantity}
                                </td>

                                {/* 8. Đơn giá */}
                                <td className="py-3 px-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                  {formatVND(item.unitPrice)}
                                </td>

                                {/* 9. Thành tiền */}
                                <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                  {formatVND(item.subtotal)}
                                </td>

                                {/* 10. Phí sàn 5% */}
                                <td className="py-3 px-3 text-right font-medium text-amber-700 dark:text-amber-400 whitespace-nowrap">
                                  {formatVND(fee)}
                                </td>

                                {/* 11. Thực nhận 95% */}
                                <td className="py-3 px-3 text-right font-black text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                                  {formatVND(net)}
                                </td>

                                {/* 12. Trạng thái dòng tiền */}
                                <td className="py-3 px-3 text-center whitespace-nowrap">
                                  {isPendingPayment && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                      Chờ thanh toán
                                    </span>
                                  )}
                                  {isHolding && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                      Tiền về sàn
                                    </span>
                                  )}
                                  {isReleased && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                      Đã nhận tiền
                                    </span>
                                  )}
                                  {isFrozen && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                      Bị đóng băng
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
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
      {/* TAB 3: NHẬT KÝ BIẾN ĐỘNG VÍ */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-[20px]">history</span>
              <span>Lịch Sử Biến Động Số Dư Ví</span>
            </h3>
            <button
              type="button"
              onClick={fetchTransactions}
              className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              <span>Làm mới</span>
            </button>
          </div>

          {isTxLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-100 dark:bg-slate-850 animate-pulse rounded-xl"></div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">receipt_long</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Chưa Có Biến Động Số Dư</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lịch sử giao dịch sẽ tự động ghi nhận khi Admin sàn bàn giao tiền hoặc khi bạn thực hiện rút tiền.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-3">Thời Gian</th>
                    <th className="py-3 px-3">Loại Giao Dịch</th>
                    <th className="py-3 px-3">Mô Tả / Tham Chiếu</th>
                    <th className="py-3 px-3 text-right">Số Tiền Biến Động</th>
                    <th className="py-3 px-3 text-right">Số Dư Khả Dụng (Trước → Sau)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {transactions.map((item) => {
                    const typeMeta = getTransactionTypeDetails(item.type);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-750 transition-colors">
                        <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400 font-mono whitespace-nowrap">
                          {formatVietnamDateTime(item.createdAt)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeMeta.badgeClass}`}>
                            <span className="material-symbols-outlined text-[12px]">{typeMeta.icon}</span>
                            <span>{typeMeta.label}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-800 dark:text-slate-200 max-w-xs truncate">
                          <div className="font-medium text-xs">{item.description || 'Giao dịch ví'}</div>
                          {item.referenceType && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {item.referenceType}: {item.referenceId || 'N/A'}
                            </div>
                          )}
                        </td>
                        <td className={`py-3 px-3 font-mono font-bold text-right whitespace-nowrap ${
                          typeMeta.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {typeMeta.isPositive ? `+${formatVND(item.amount)}` : `-${formatVND(item.amount)}`}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-right text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {formatVND(item.availableBefore)} → <strong className="text-slate-900 dark:text-white">{formatVND(item.availableAfter)}</strong>
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
        availableBalance={wallet?.availableBalance || 0}
        bankInfo={bankInfo}
        onSuccess={handleRefreshAll}
      />
    </div>
  );
}
