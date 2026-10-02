"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import {
  walletApi,
  payoutApi,
  type WalletData,
  type SellerEscrowItem,
  type WalletTransactionItem,
  type PayoutRequestItem,
} from '@/ui/api/walletApi';
import WithdrawalPinModal, { type BankInfo } from '@/ui/components/seller/WithdrawalPinModal';

function formatVND(amount?: number | string | null): string {
  if (amount === undefined || amount === null || amount === '') return '0đ';
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) return '0đ';
  return `${Math.round(num).toLocaleString('vi-VN')}đ`;
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

export default function SellerFinancePage() {
  const { user, activeBusinessId, isLoading: isAuthLoading } = useAuth();
  const storeId = user?.business?.id || activeBusinessId || (user as any)?.storeId || null;

  // Bank Info KYC
  const bankInfo: BankInfo = useMemo(() => {
    const b = user?.business as any;
    return {
      bankName: b?.bankName || 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
      accountNumber: b?.bankAccountNumber || '0071001234567',
      accountHolder: b?.bankAccountHolder || b?.ownerName || user?.fullName || 'HUỲNH GIA HUY',
    };
  }, [user]);

  // States
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [escrowItems, setEscrowItems] = useState<SellerEscrowItem[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<WalletTransactionItem[]>([]);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [isWithdrawalModalOpen, setIsWithdrawalModalOpen] = useState(false);

  // Payout Requests History State
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequestItem[]>([]);
  const [isPayoutsLoading, setIsPayoutsLoading] = useState(true);
  const [payoutPage, setPayoutPage] = useState(1);
  const [payoutTotalPages, setPayoutTotalPages] = useState(1);

  // Fetch Wallet Data
  const fetchWallet = useCallback(async () => {
    if (!storeId) {
      if (!isAuthLoading) setIsWalletLoading(false);
      return;
    }
    setIsWalletLoading(true);
    setWalletError(null);
    try {
      const res = await walletApi.getStoreWallet(storeId);
      if (res.success && res.data) {
        setWallet(res.data);
      } else {
        setWalletError(res.error?.message || 'Không thể tải thông tin số dư ví.');
      }
    } catch (err: any) {
      setWalletError(err?.message || 'Lỗi kết nối máy chủ khi tải ví.');
    } finally {
      setIsWalletLoading(false);
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
      const res = await walletApi.getStoreWalletTransactions(storeId, { page: 1, limit: 5 });
      if (res.success && res.data?.items) {
        setRecentTransactions(res.data.items);
      }
    } catch (err) {
      console.warn('Lỗi tải giao dịch gần đây:', err);
    }
  }, [storeId]);

  // Fetch Payout Requests History
  const fetchPayoutRequests = useCallback(async (pageNum = 1) => {
    if (!storeId) {
      if (!isAuthLoading) setIsPayoutsLoading(false);
      return;
    }
    setIsPayoutsLoading(true);
    try {
      const res = await payoutApi.getStorePayoutRequests(storeId, { page: pageNum, limit: 10 });
      if (res.success && res.data) {
        setPayoutRequests(res.data.items || []);
        setPayoutPage(res.data.page || pageNum);
        setPayoutTotalPages(Math.ceil((res.data.total || 0) / (res.data.limit || 10)) || 1);
      }
    } catch (err) {
      console.warn('Lỗi tải lịch sử yêu cầu rút tiền:', err);
    } finally {
      setIsPayoutsLoading(false);
    }
  }, [storeId, isAuthLoading]);

  const handleRefreshAll = useCallback(async () => {
    if (!storeId && isAuthLoading) return;
    await Promise.all([fetchWallet(), fetchEscrowItems(), fetchRecentTransactions(), fetchPayoutRequests(1)]);
  }, [storeId, isAuthLoading, fetchWallet, fetchEscrowItems, fetchRecentTransactions, fetchPayoutRequests]);

  useEffect(() => {
    handleRefreshAll();
  }, [handleRefreshAll]);

  // Statistics
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
    };
  }, [escrowItems]);

  // Active Balances
  const effectiveAvailableBalance = wallet?.availableBalance !== undefined && wallet?.availableBalance !== null
    ? Number(wallet.availableBalance)
    : escrowStats.totalReleasedAmount;
  const effectivePendingBalance = wallet?.pendingBalance !== undefined && wallet?.pendingBalance !== null
    ? Number(wallet.pendingBalance)
    : (escrowStats.totalHoldingAmount + escrowStats.totalPendingPaymentAmount);
  const effectiveTotalBalance = wallet?.totalBalance !== undefined && wallet?.totalBalance !== null
    ? Number(wallet.totalBalance)
    : (effectiveAvailableBalance + effectivePendingBalance);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Ví Số Dư &amp; Rút Tiền</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý số dư khả dụng thực nhận và thực hiện lệnh rút tiền về tài khoản ngân hàng chính chủ.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shadow-2xs"
            title="Tải lại dữ liệu"
          >
            <span className={`material-symbols-outlined text-[18px] ${isWalletLoading ? 'animate-spin text-[#00875A]' : ''}`}>refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setIsWithdrawalModalOpen(true)}
            disabled={effectiveAvailableBalance <= 0}
            className="px-4 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-base">payments</span>
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

      {/* 2. TOP METRIC CARDS */}
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
              {escrowStats.releasedCount} đơn/món đã giải ngân xong
            </p>
          </div>
          <div className="pt-2 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Trạng thái ví:</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Sẵn sàng rút ngay</span>
          </div>
        </div>

        {/* Card 2: Tiền Đang Treo */}
        <Link
          href="/seller/escrow"
          className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <span>Tiền Đang Treo (Ký Quỹ)</span>
              <span className="material-symbols-outlined text-xs group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
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
              {escrowStats.holdingCount + escrowStats.pendingPaymentCount} món đang giao / chờ hạn đổi trả
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Xem bảng ký quỹ:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400 underline">Chi tiết &rarr;</span>
          </div>
        </Link>

        {/* Card 3: Tổng Tài Sản */}
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
              Tổng {escrowStats.totalCount} món hàng trên sàn HuKi
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Khấu trừ sàn:</span>
            <span className="font-semibold text-amber-600">5% phí dịch vụ</span>
          </div>
        </div>

        {/* Card 4: Tài Khoản Ngân Hàng KYC */}
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
          <div className="my-2 space-y-0.5">
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
            <span className="text-slate-500">Mã PIN giao dịch:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">123456 (Mặc định)</span>
          </div>
        </div>
      </div>

      {/* 3. MAIN SECTION: VÍ KHẢ DỤNG & THÔNG TIN RÚT TIỀN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: Ví Khả Dụng & Rút Tiền */}
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
              <span className="text-slate-500">Số dư khả dụng trong ví:</span>
              <span className="font-bold text-emerald-700 dark:text-emerald-400 font-mono">{formatVND(effectiveAvailableBalance)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500">Doanh thu đang tạm giữ (Escrow):</span>
              <span className="font-bold text-blue-600 dark:text-blue-400 font-mono">{formatVND(effectivePendingBalance)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/60">
              <span className="text-slate-500">Số tiền bị đóng băng khiếu nại:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{formatVND(escrowStats.totalFrozenAmount)}</span>
            </div>
            <div className="flex justify-between py-1.5 font-bold text-slate-900 dark:text-white">
              <span>Tổng tài sản trên HuKi:</span>
              <span className="font-mono text-sm text-emerald-600">{formatVND(effectiveTotalBalance)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsWithdrawalModalOpen(true)}
            disabled={effectiveAvailableBalance <= 0}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="mt-4 space-y-2.5 text-xs">
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
                <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm uppercase">{bankInfo.accountHolder}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">lock</span>
            <p>
              Mã PIN giao dịch rút tiền 6 số bảo mật cấp 2 (Mặc định: <strong>123456</strong>). Rút tiền thực hiện an toàn 100%.
            </p>
          </div>
        </div>
      </div>

      {/* 4. QUICK LINKS TO SEPARATE PAGES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/seller/reports"
          className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-500 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">analytics</span>
            </span>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                Báo Cáo Doanh Thu
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Bảng phân tích kế toán chi tiết, đối soát GMV &amp; 5% phí sàn.
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>

        <Link
          href="/seller/escrow"
          className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-blue-400 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">hourglass_top</span>
            </span>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                Tiền Đang Treo ({escrowStats.totalCount})
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý ký quỹ, đếm ngược hạn đổi trả 2 phút.
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>

        <Link
          href="/seller/transactions"
          className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-400 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3.5">
            <span className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">receipt_long</span>
            </span>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                Nhật Ký Biến Động
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Lịch sử cộng doanh thu và các lệnh rút tiền.
              </p>
            </div>
          </div>
          <span className="material-symbols-outlined text-slate-400 group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* 5. RECENT TRANSACTIONS PREVIEW */}
      {recentTransactions.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-lg">history</span>
              <span>Giao Dịch Gần Đây Nhất</span>
            </h3>
            <Link
              href="/seller/transactions"
              className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {recentTransactions.slice(0, 3).map((item) => {
              const isCredit = item.type === 'CREDIT_AVAILABLE' || item.type === 'MOVE_PENDING_TO_AVAILABLE';
              return (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <span className="material-symbols-outlined text-base">
                        {isCredit ? 'add_circle' : 'remove_circle'}
                      </span>
                    </span>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white truncate max-w-sm sm:max-w-md">
                        {item.description || 'Giao dịch ví'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {formatVietnamDateTime(item.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className={`font-mono font-bold whitespace-nowrap text-right ${
                    isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {isCredit ? `+${formatVND(item.amount)}` : `-${formatVND(item.amount)}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. PAYOUT REQUESTS HISTORY (LỊCH SỬ RÚT TIỀN VỀ NGÂN HÀNG) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-600 text-lg">payments</span>
              <span>Lịch Sử Yêu Cầu Rút Tiền Về Ngân Hàng (Payout Requests)</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Theo dõi trạng thái duyệt lệnh, thời gian xử lý và lịch sử giải ngân của từng yêu cầu rút tiền
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchPayoutRequests(payoutPage)}
            disabled={isPayoutsLoading}
            className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-sm ${isPayoutsLoading ? 'animate-spin' : ''}`}>refresh</span>
            <span>Làm mới</span>
          </button>
        </div>

        {isPayoutsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
            <span className="material-symbols-outlined text-2xl animate-spin text-emerald-600">progress_activity</span>
            <span className="text-xs">Đang tải lịch sử rút tiền...</span>
          </div>
        ) : payoutRequests.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-center">
            <span className="material-symbols-outlined text-3xl text-slate-300">account_balance_wallet</span>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Chưa có yêu cầu rút tiền nào</p>
            <p className="text-[11px] text-slate-400">Các lệnh rút tiền về tài khoản ngân hàng sẽ được lưu vết đầy đủ tại đây</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-semibold text-[11px] border-b border-slate-100 dark:border-slate-700">
                  <th className="py-2.5 px-3">Mã Lệnh</th>
                  <th className="py-2.5 px-3">Thời Gian Tạo</th>
                  <th className="py-2.5 px-3">Số Tiền Rút</th>
                  <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                  <th className="py-2.5 px-3">Người Duyệt / Thời Gian</th>
                  <th className="py-2.5 px-3">Chi Tiết / Lý Do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {payoutRequests.map((req) => {
                  const status = req.status;
                  let statusBadge: { label: string; bg: string } = { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
                  if (status === 'PENDING') {
                    statusBadge = { label: 'Chờ duyệt', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
                  } else if (status === 'APPROVED') {
                    statusBadge = { label: 'Đã duyệt', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
                  } else if (status === 'PROCESSING') {
                    statusBadge = { label: 'Đang giải ngân', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
                  } else if (status === 'COMPLETED') {
                    statusBadge = { label: 'Hoàn tất', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                  } else if (status === 'REJECTED') {
                    statusBadge = { label: 'Từ chối', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
                  } else if (status === 'FAILED') {
                    statusBadge = { label: 'Thất bại', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
                  }

                  const reasonText = req.rejectionReason || req.rejectReason || req.failureReason;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white text-[11px]">
                        #{req.id.slice(0, 8)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        {formatVietnamDateTime(req.requestedAt || req.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-bold font-mono text-emerald-700 dark:text-emerald-400">
                        {formatVND(req.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${statusBadge.bg}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 text-[11px]">
                        {req.reviewedBy ? (
                          <div>
                            <span className="font-semibold">{req.reviewedBy === 'ADMIN' ? 'Platform Admin' : req.reviewedBy}</span>
                            {req.reviewedAt && (
                              <span className="block text-[10px] text-slate-400 font-mono">
                                {formatVietnamDateTime(req.reviewedAt)}
                              </span>
                            )}
                          </div>
                        ) : req.disbursedAt ? (
                          <div>
                            <span className="font-semibold text-emerald-600">Đã giải ngân</span>
                            <span className="block text-[10px] text-slate-400 font-mono">
                              {formatVietnamDateTime(req.disbursedAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Đang chờ xử lý</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400 text-[11px] max-w-[200px] truncate">
                        {reasonText ? (
                          <span className="text-rose-600 font-medium" title={reasonText}>
                            Lý do: {reasonText}
                          </span>
                        ) : req.providerRef ? (
                          <span className="font-mono text-[10.5px] text-slate-500">
                            Ref: {req.providerRef}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {payoutTotalPages > 1 && (
              <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 text-xs">
                <span className="text-slate-500 text-[11px]">
                  Trang {payoutPage} / {payoutTotalPages}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={payoutPage <= 1 || isPayoutsLoading}
                    onClick={() => fetchPayoutRequests(payoutPage - 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={payoutPage >= payoutTotalPages || isPayoutsLoading}
                    onClick={() => fetchPayoutRequests(payoutPage + 1)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Tiếp
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL RÚT TIỀN 2 BƯỚC (PIN 6 SỐ) */}
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
