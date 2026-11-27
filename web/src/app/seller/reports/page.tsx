"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import {
  walletApi,
  payoutApi,
  type SellerEscrowItem,
  type WalletData,
  type PayoutRequestItem,
} from '@/ui/api/walletApi';
import { SellerGroupedOrderTable } from '@/ui/components/seller/SellerGroupedOrderTable';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { useToast } from '@/ui/context/ToastContext';
import { calculateSellerFinancials, formatVND, ESCROW_CONFIG } from '@/ui/utils/sellerFinanceEngine';

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
    return `${getPart('day')}/${getPart('month')}/${getPart('year')} ${getPart('hour')}:${getPart('minute')}`;
  } catch {
    return dateStr;
  }
}

export default function SellerFinancialReportsPage() {
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();
  const storeId = user?.business?.id || activeBusinessId || (user as any)?.storeId || '501ece69-23b9-4126-9b5e-e3dc206d0c20';

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [escrowItems, setEscrowItems] = useState<SellerEscrowItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Time filters
  const [dateRange, setDateRange] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const fetchData = useCallback(async (isSilent?: boolean) => {
    if (!isSilent) setIsLoading(true);
    try {
      const [wRes, escRes, pRes] = await Promise.all([
        walletApi.getStoreWallet(storeId),
        walletApi.getSellerEscrowItems(),
        payoutApi.getStorePayoutRequests(storeId, { page: 1, limit: 50 }),
      ]);

      if (wRes.success && wRes.data) {
        setWallet(wRes.data);
      }
      if (escRes.success && Array.isArray(escRes.data)) {
        setEscrowItems(escRes.data);
      }
      if (pRes.success && pRes.data?.items) {
        setPayouts(pRes.data.items);
      }
    } catch (err) {
      console.warn('Lỗi tải báo cáo tài chính:', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Gentle Fallback Polling (45s heartbeat with visibility guard) & RealtimeSyncBus
  useEffect(() => {
    const pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      fetchData(true);
    }, 45000);

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchData(true);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      const payload = msg.payload as any;
      const isCurrentStore = !payload?.storeId || payload.storeId === storeId;

      if (msg.type === 'ORDER_PAYMENT_SUCCEEDED' && isCurrentStore) {
        fetchData(true);
        showToast?.('Khách đã thanh toán đơn hàng VietQR/PayOS mới! Tiền đã nổ vào mục Tiền Ký Quỹ Đang Giữ.', 'success');
      } else if (msg.type === 'ORDER_CREATED' && isCurrentStore && payload?.paymentMethod === 'COD') {
        fetchData(true);
        showToast?.('Đơn hàng COD mới đã được tạo và chờ giao hàng!', 'info');
      } else if ((msg.type === 'ESCROW_RELEASED' || msg.type === 'WALLET_BALANCE_UPDATED') && isCurrentStore) {
        fetchData(true);
        showToast?.('Tiền hàng đã được giải ngân thành công vào Số Dư Khả Dụng!', 'info');
      } else if (msg.type === 'PAYOUT_APPROVED' && isCurrentStore) {
        fetchData(true);
        showToast?.('Lệnh rút tiền của bạn đã được Kế Toán Sàn phê duyệt!', 'success');
      } else if (msg.type === 'PAYOUT_DISBURSED' && isCurrentStore) {
        fetchData(true);
        showToast?.('Tiền rút đã được ngân hàng giải ngân thành công về STK của bạn!', 'success');
      } else if (msg.type === 'PAYOUT_REJECTED' && isCurrentStore) {
        fetchData(true);
        showToast?.(`Lệnh rút tiền bị từ chối: ${payload?.reason || ''}. Tiền đã hoàn lại ví khả dụng!`, 'error');
      }
    });

    return () => {
      clearInterval(pollTimer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      unsubscribe();
    };
  }, [storeId, fetchData, showToast]);

  const handleAutoReleaseItem = useCallback((item: SellerEscrowItem) => {
    // 1. Publish Realtime Sync event
    realtimeSyncBus.publish('ESCROW_RELEASED', {
      storeId,
      amount: item.sellerNet,
      orderId: item.orderId,
      orderCode: item.orderCode,
    });

    // 2. Optimistically update local escrow items and wallet
    setEscrowItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, escrowStatus: 'RELEASED' } : it))
    );
    setWallet((prev) =>
      prev
        ? {
          ...prev,
          availableBalance: Number(prev.availableBalance) + Number(item.sellerNet),
          pendingBalance: Math.max(0, Number(prev.pendingBalance) - Number(item.sellerNet)),
        }
        : prev
    );

    // 3. Notify toast
    showToast?.(
      `Đơn #${item.orderCode} đã hoàn tất ${ESCROW_CONFIG.DURATION_LABEL} đổi trả! +${formatVND(item.sellerNet)} đã chuyển sang Số Dư Khả Dụng!`,
      'success'
    );

    // 4. Silently fetch from server
    fetchData(true);
  }, [storeId, fetchData, showToast]);

  // Filtered Escrow Items based on date and excluding cancelled orders
  const filteredItems = useMemo(() => {
    return escrowItems.filter((it) => {
      if (it.orderStatus === 'CANCELLED' || (it as any).status === 'CANCELLED') {
        return false;
      }
      if (!it.orderCreatedAt) return true;
      const itTime = new Date(it.orderCreatedAt).getTime();
      const now = new Date();

      if (dateRange === 'TODAY') {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return itTime >= startOfDay;
      }
      if (dateRange === '7DAYS') {
        const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        return itTime >= sevenDaysAgo;
      }
      if (dateRange === '30DAYS') {
        const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        return itTime >= thirtyDaysAgo;
      }
      if (dateRange === 'THIS_MONTH') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return itTime >= startOfMonth;
      }
      if (customStartDate && customEndDate) {
        const start = new Date(customStartDate).getTime();
        const end = new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000;
        return itTime >= start && itTime <= end;
      }
      return true;
    });
  }, [escrowItems, dateRange, customStartDate, customEndDate]);

  // Financial Computations & Unified Data via Centralized Engine
  const stats = useMemo(() => {
    return calculateSellerFinancials({
      escrowItems: filteredItems,
      wallet,
      payouts,
    });
  }, [filteredItems, wallet, payouts]);

  // Tỷ trọng phương thức thanh toán cho thẻ KPI 4 & 5
  const totalPaymentGMV = stats.codGMV + stats.payosGMV || 1;
  const codPercent = Math.round((stats.codGMV / totalPaymentGMV) * 100);
  const payosPercent = 100 - codPercent;

  // Export CSV Function
  const handleExportCSV = () => {
    const headers = [
      'Mã Đơn Hàng',
      'Thời Gian Đặt',
      'Khách Hàng',
      'Số Điện Thoại',
      'Địa Chỉ Giao',
      'Tên Sách',
      'Phân Loại',
      'Số Lượng',
      'Đơn Giá (VNĐ)',
      'Tổng Tiền Đơn (VNĐ)',
      'Phí Sàn 5% (VNĐ)',
      'Shop Thực Nhận 95% (VNĐ)',
      'Phương Thức Thanh Toán',
      'Trạng Thái Dòng Tiền',
    ];

    const rows = filteredItems.map((it) => {
      const subtotal = Number(it.subtotal) || (Number(it.unitPrice) * Number(it.quantity)) || 0;
      const fee = Number(it.platformFee) || Math.round(subtotal * 0.05);
      const net = Number(it.sellerNet) || (subtotal - fee);
      const escrowLabel =
        it.escrowStatus === 'RELEASED'
          ? 'Đã Giải Ngân Khả Dụng'
          : it.escrowStatus === 'HOLDING'
            ? `Đang Ký Quỹ Đổi Trả (${ESCROW_CONFIG.DURATION_LABEL})`
            : it.escrowStatus === 'PENDING_PAYMENT'
              ? 'Đang Giao Hàng (Dự Kiến)'
              : 'Đang Phong Tỏa Khiếu Nại';

      return [
        `"${it.orderCode || it.orderId}"`,
        `"${formatVietnamDateTime(it.orderCreatedAt)}"`,
        `"${it.customerName || 'N/A'}"`,
        `"${it.customerPhone || 'N/A'}"`,
        `"${(it.shippingAddress || '').replace(/"/g, '""')}"`,
        `"${(it.bookTitle || '').replace(/"/g, '""')}"`,
        `"${it.format === 'DIGITAL' ? 'Ebook' : 'Sách Giấy'}"`,
        it.quantity,
        it.unitPrice,
        subtotal,
        fee,
        net,
        `"${it.paymentMethod === 'COD' ? 'Tiền mặt COD' : 'Chuyển khoản VietQR/PayOS'}"`,
        `"${escrowLabel}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bao_Cao_Tai_Chinh_HuKi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* 1. HEADER & ACTION TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Báo Cáo Doanh Thu &amp; Sổ Cái Tài Chính</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi toàn diện vòng đời dòng tiền: Phân tích doanh thu kinh doanh, phí sàn 5%, lợi nhuận ròng và sổ cái biến động số dư.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer shadow-2xs"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-600">calculate</span>
            <span>Diễn Giải Vòng Đời Tiền</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#00875A] text-white hover:bg-[#00734c] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Xuất Báo Cáo (CSV / Excel)</span>
          </button>
        </div>
      </div>

      {/* 2. THANH ĐIỀU HƯỚNG 3 TRỤ CỘT TÀI CHÍNH (CHUẨN PHƯƠNG ÁN B) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-white border-2 border-[#00875A] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#00875A] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-xl">analytics</span>
            </span>
            <div>
              <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <span>Báo Cáo Doanh Thu &amp; Sổ Cái</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-bold">Đang xem</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Phân tích dòng tiền &amp; nhật ký biến động ví</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-emerald-700 text-lg">check_circle</span>
        </div>

        <Link
          href="/seller/escrow"
          className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-blue-400 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">hourglass_top</span>
            </span>
            <div>
              <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <span>Tiền Chờ Quyết Toán ({stats.holdingCount + stats.inTransitCount})</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Quản lý đơn hàng bảo chứng &amp; hạn đổi trả {ESCROW_CONFIG.DURATION_LABEL}</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all text-lg">arrow_forward</span>
        </Link>

        <Link
          href="/seller/finance"
          className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-emerald-400 hover:shadow-xs transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
            </span>
            <div>
              <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <span>Số Dư Ví &amp; Rút Tiền</span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Tạo lệnh rút tiền về ngân hàng qua mã PIN</p>
            </div>
          </div>
          <span className="material-symbols-outlined text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-1 transition-all text-lg">arrow_forward</span>
        </Link>
      </div>

      {/* 3. TIME FILTER TOOLBAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-gray-500 uppercase mr-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">filter_alt</span>
            Kỳ Báo Cáo:
          </span>
          {(
            [
              { key: 'ALL', label: 'Toàn Bộ Thời Gian' },
              { key: 'TODAY', label: 'Hôm Nay' },
              { key: '7DAYS', label: '7 Ngày Gần Nhất' },
              { key: '30DAYS', label: '30 Ngày Gần Nhất' },
              { key: 'THIS_MONTH', label: 'Tháng Này' },
            ] as const
          ).map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => {
                setDateRange(btn.key);
                setCustomStartDate('');
                setCustomEndDate('');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${dateRange === btn.key && !customStartDate
                ? 'bg-[#00875A] text-white shadow-xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="font-medium">Tùy chọn ngày:</span>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => {
              setCustomStartDate(e.target.value);
              setDateRange('ALL');
            }}
            className="border border-gray-200 rounded-xl px-2.5 py-1 text-xs focus:outline-hidden focus:border-emerald-600"
          />
          <span>→</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => {
              setCustomEndDate(e.target.value);
              setDateRange('ALL');
            }}
            className="border border-gray-200 rounded-xl px-2.5 py-1 text-xs focus:outline-hidden focus:border-emerald-600"
          />
        </div>
      </div>

      {/* 4. 5 THẺ THỐNG KÊ DÒNG TIỀN THEO ĐÚNG YÊU CẦU NGƯỜI DÙNG (CLEAN MINIMALIST CHUẨN SHOPEE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Thẻ 1: Tiền lúc đang giao hàng (Dự kiến để kiểm soát đơn) */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between border-t-4 border-t-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              1. Tiền Đang Giao (Dự Kiến)
            </span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono">
              {formatVND(stats.inTransitNet)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {stats.inTransitCount} món đang được Shipper vận chuyển
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[10.5px] text-emerald-700 dark:text-emerald-400 font-medium">
            <span>Giá trị gộp 100%:</span>
            <span className="font-bold">{formatVND(stats.inTransitGross)}</span>
          </div>
        </div>

        {/* Thẻ 2: Tiền Ký Quỹ Sàn Giữ (Đổi trả 2 phút) */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between border-t-4 border-t-blue-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 dark:text-blue-400 uppercase tracking-wider">
              2. Tiền Ký Quỹ (Sàn Giữ)
            </span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
              <span className="material-symbols-outlined text-[18px]">lock_clock</span>
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono">
              {formatVND(stats.holdingNet)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {stats.holdingCount} món đang đếm ngược hạn đổi trả ({ESCROW_CONFIG.DURATION_LABEL})
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[10.5px] text-blue-700 dark:text-blue-400 font-medium">
            <span>Tự động chuyển:</span>
            <span className="font-bold">Vào ví khi hết hạn</span>
          </div>
        </div>

        {/* Thẻ 3: Tiền Khả Dụng (Ví rút tiền) - Chuẩn Clean White Minimalist */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between border-t-4 border-t-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
              3. Tiền Khả Dụng (Ví Rút)
            </span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono">
              {formatVND(stats.availableBalance)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-0.5">
              <span>Sẵn sàng rút về STK</span>
              <Link href="/seller/finance" className="underline font-bold text-[#00875A] hover:text-emerald-700">
                Rút ngay &rarr;
              </Link>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[10.5px] text-amber-800 dark:text-amber-400">
            <span>Đã rút về STK:</span>
            <span className="font-bold">{formatVND(stats.totalWithdrawn)}</span>
          </div>
        </div>

        {/* Thẻ 4: Tiền COD (Doanh thu tiền mặt) */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between border-t-4 border-t-slate-500">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-300 uppercase tracking-wider">
              4. Doanh Thu Tiền COD
            </span>
            <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono">
              {formatVND(stats.codNet)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {stats.codCount} đơn thanh toán tiền mặt qua Shipper
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[10.5px] text-slate-700 dark:text-slate-400 font-medium">
            <span>Tỷ trọng thanh toán:</span>
            <span className="font-bold">{codPercent}%</span>
          </div>
        </div>

        {/* Thẻ 5: Tiền Chuyển Khoản (Doanh thu online) */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200/80 dark:border-neutral-800 p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between border-t-4 border-t-purple-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-800 dark:text-purple-400 uppercase tracking-wider">
              5. Tiền Chuyển Khoản
            </span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white font-mono">
              {formatVND(stats.payosNet)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {stats.payosCount} đơn thanh toán VietQR / PayOS
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[10.5px] text-purple-700 dark:text-purple-400 font-medium">
            <span>Tỷ trọng thanh toán:</span>
            <span className="font-bold">{payosPercent}%</span>
          </div>
        </div>
      </div>

      {/* 5. BẢNG ĐỐI SOÁT DOANH THU TỪNG MÓN HÀNG & DÒNG TIỀN */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#00875A] text-white shadow-xs">
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Chi Tiết Từng Món Hàng &amp; Dòng Tiền ({filteredItems.length})</span>
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/seller/finance"
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
              <span>Ví &amp; Sổ Cái Biến Động</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>

            <Link
              href="/seller/escrow"
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">hourglass_top</span>
              <span>Xem Tiền Chờ Quyết Toán</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <SellerGroupedOrderTable
            items={filteredItems}
            loading={isLoading}
            onAutoReleaseItem={handleAutoReleaseItem}
            title="Bảng Kê Chi Tiết Đơn Hàng & Dòng Tiền"
            subtitle="Báo cáo sao kê đơn hàng thực nhận 95% theo thời gian thực"
          />
        </div>
      </div>

      {/* 7. MODAL DIỄN GIẢI CÔNG THỨC DÒNG TIỀN */}
      {showFormulaModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">account_tree</span>
                <span>Diễn Giải Vòng Đời Dòng Tiền HuKi Ebook</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                <strong className="block text-blue-800 text-xs mb-1">1. Tiền Đang Giao Hàng (Dự kiến):</strong>
                Đơn hàng đang trên đường giao bởi Shipper. Tiền này được thống kê để Seller kiểm soát lượng hàng đang vận chuyển.
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                <strong className="block text-amber-800 text-xs mb-1">2. Tiền Ký Quỹ Escrow (Sàn bảo chứng):</strong>
                Đơn đã giao thành công, tiền 95% nằm trong quỹ bảo chứng của sàn trong thời gian người mua được đổi trả ({ESCROW_CONFIG.DURATION_LABEL}).
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <strong className="block text-emerald-800 text-xs mb-1">3. Tự Động Giải Ngân Sang Khả Dụng:</strong>
                Ngay khi hết hạn đổi trả, tiền tự động chuyển sang Số Dư Khả Dụng và ghi một bản ghi kiểm toán biến động số dư.
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900">
                <strong className="block text-purple-800 text-xs mb-1">4. Rút Tiền Về Ngân Hàng Qua Mã PIN:</strong>
                Seller nhập mã PIN 6 số là tiền được giải ngân tự động về tài khoản ngân hàng chính chủ, phía Admin lưu vết nhật ký đối soát.
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-[#00875A] text-white rounded-xl font-bold text-xs hover:bg-[#00734c] transition-colors cursor-pointer"
              >
                Đã Hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
