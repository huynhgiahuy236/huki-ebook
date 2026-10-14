"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import {
  walletApi,
  payoutApi,
  type SellerEscrowItem,
  type WalletData,
  type WalletTransactionItem,
  type PayoutRequestItem,
} from '@/ui/api/walletApi';
import EscrowTableBadge from '@/ui/components/seller/EscrowTableBadge';
import { SellerPagination } from '@/ui/components/seller/SellerUI';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { useToast } from '@/ui/context/ToastContext';
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
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Time filters
  const [dateRange, setDateRange] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'TRANSACTIONS' | 'PAYOUTS'>('ITEMS');
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const fetchData = useCallback(async (isSilent?: boolean) => {
    if (!isSilent) setIsLoading(true);
    try {
      const [wRes, escRes, txRes, pRes] = await Promise.all([
        walletApi.getStoreWallet(storeId),
        walletApi.getSellerEscrowItems(),
        walletApi.getStoreWalletTransactions(storeId, { page: 1, limit: 100 }),
        payoutApi.getStorePayoutRequests(storeId, { page: 1, limit: 50 }),
      ]);

      if (wRes.success && wRes.data) {
        setWallet(wRes.data);
      }
      if (escRes.success && Array.isArray(escRes.data)) {
        setEscrowItems(escRes.data);
      }
      if (txRes.success && txRes.data?.items) {
        setTransactions(txRes.data.items);
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

  // Silent Background Auto-Polling (3.5s - Chuẩn Shopee Zero-F5) & RealtimeSyncBus
  useEffect(() => {
    const pollTimer = setInterval(() => {
      fetchData(true);
    }, 3500);

    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      const payload = msg.payload as any;
      const isCurrentStore = !payload?.storeId || payload.storeId === storeId;

      if ((msg.type === 'ORDER_CREATED' || msg.type === 'ORDER_PAYMENT_SUCCEEDED') && isCurrentStore) {
        fetchData(true);
        showToast?.('Khách vừa thanh toán đơn hàng VietQR/PayOS mới! Tiền đã nổ vào mục Tiền Ký Quỹ Đang Giữ.', 'success');
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
      `Đơn #${item.orderCode} đã hoàn tất 2 phút đổi trả! +${formatVND(item.sellerNet)} đã chuyển sang Số Dư Khả Dụng!`,
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

  // Financial Computations & Unified Data
  // Financial Computations & Unified Data via Centralized Engine
  const stats = useMemo(() => {
    return calculateSellerFinancials({
      escrowItems: filteredItems,
      wallet,
      payouts,
      transactions,
    });
  }, [filteredItems, wallet, payouts, transactions]);

  // Pagination States for all 3 Tabs (Chuẩn Shopee)
  const [itemsPage, setItemsPage] = useState(1);
  const itemsPageSize = 10;
  const itemsTotalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPageSize));
  const paginatedItems = useMemo(() => {
    const start = (itemsPage - 1) * itemsPageSize;
    return filteredItems.slice(start, start + itemsPageSize);
  }, [filteredItems, itemsPage, itemsPageSize]);

  const [txPage, setTxPage] = useState(1);
  const txPageSize = 10;
  const txTotalPages = Math.max(1, Math.ceil(transactions.length / txPageSize));
  const paginatedTransactions = useMemo(() => {
    const start = (txPage - 1) * txPageSize;
    return transactions.slice(start, start + txPageSize);
  }, [transactions, txPage, txPageSize]);

  const [payoutPage, setPayoutPage] = useState(1);
  const payoutPageSize = 10;
  const payoutTotalPages = Math.max(1, Math.ceil(payouts.length / payoutPageSize));
  const paginatedPayouts = useMemo(() => {
    const start = (payoutPage - 1) * payoutPageSize;
    return payouts.slice(start, start + payoutPageSize);
  }, [payouts, payoutPage, payoutPageSize]);

  // Reset itemsPage khi bộ lọc thời gian thay đổi
  useEffect(() => {
    setItemsPage(1);
  }, [dateRange, customStartDate, customEndDate]);

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
          ? 'Đang Ký Quỹ Đổi Trả (2 phút)'
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

  // Tính tỷ lệ % cho biểu đồ Donut phương thức thanh toán
  const totalPaymentGMV = (stats.codGMV + stats.payosGMV) || 1;
  const codPercent = Math.round((stats.codGMV / totalPaymentGMV) * 100);
  const payosPercent = 100 - codPercent;

  // Tính tỷ lệ cho biểu đồ Dòng tiền (Waterfall flow)
  const totalFlowBase = (stats.inTransitNet + stats.holdingNet + stats.availableBalance + stats.totalWithdrawn) || 1;
  const inTransitFlowPct = Math.round((stats.inTransitNet / totalFlowBase) * 100);
  const holdingFlowPct = Math.round((stats.holdingNet / totalFlowBase) * 100);
  const availableFlowPct = Math.round((stats.availableBalance / totalFlowBase) * 100);
  const withdrawnFlowPct = Math.max(0, 100 - inTransitFlowPct - holdingFlowPct - availableFlowPct);

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
              <p className="text-[11px] text-gray-500 mt-0.5">Quản lý đơn hàng bảo chứng &amp; hạn đổi trả 2 phút</p>
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                dateRange === btn.key && !customStartDate
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

      {/* 4. 5 THẺ THỐNG KÊ DÒNG TIỀN THEO ĐÚNG YÊU CẦU NGƯỜI DÙNG */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Thẻ 1: Tiền lúc đang giao hàng (Dự kiến để kiểm soát đơn) */}
        <div className="bg-white rounded-2xl border border-blue-200 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-b from-blue-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              1. Tiền Đang Giao (Dự Kiến)
            </span>
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-blue-700 font-mono">
              {formatVND(stats.inTransitNet)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {stats.inTransitCount} món đang được Shipper vận chuyển
            </p>
          </div>
          <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-[10.5px] text-blue-700 font-medium">
            <span>Giá trị gộp 100%:</span>
            <span className="font-bold">{formatVND(stats.inTransitGross)}</span>
          </div>
        </div>

        {/* Thẻ 2: Tiền Ký Quỹ Sàn Giữ (Đổi trả 2 phút) */}
        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-b from-amber-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
              2. Tiền Ký Quỹ (Sàn Giữ)
            </span>
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <span className="material-symbols-outlined text-[18px]">lock_clock</span>
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-amber-700 font-mono">
              {formatVND(stats.holdingNet)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {stats.holdingCount} món đang đếm ngược hạn đổi trả (2 phút)
            </p>
          </div>
          <div className="pt-2 border-t border-amber-100 flex items-center justify-between text-[10.5px] text-amber-700 font-medium">
            <span>Tự động chuyển:</span>
            <span className="font-bold">Vào ví khi hết hạn</span>
          </div>
        </div>

        {/* Thẻ 3: Tiền Khả Dụng (Ví rút tiền) */}
        <div className="bg-gradient-to-br from-[#003B2B] to-[#00694A] rounded-2xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between text-white border border-emerald-700">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
              3. Tiền Khả Dụng (Ví Rút)
            </span>
            <span className="p-1.5 rounded-lg bg-white/20 text-emerald-200">
              <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-white font-mono">
              {formatVND(stats.availableBalance)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-emerald-200 mt-0.5">
              <span>Sẵn sàng rút về STK</span>
              <Link href="/seller/finance" className="underline font-bold text-white hover:text-emerald-300">
                Rút ngay &rarr;
              </Link>
            </div>
          </div>
          <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[10.5px] text-emerald-200">
            <span>Đã rút về STK:</span>
            <span className="font-bold text-white">{formatVND(stats.totalWithdrawn)}</span>
          </div>
        </div>

        {/* Thẻ 4: Tiền COD (Doanh thu tiền mặt) */}
        <div className="bg-white rounded-2xl border border-orange-200 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-b from-orange-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-orange-800 uppercase tracking-wider">
              4. Doanh Thu Tiền COD
            </span>
            <span className="p-1.5 rounded-lg bg-orange-100 text-orange-700">
              <span className="material-symbols-outlined text-[18px]">payments</span>
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-orange-700 font-mono">
              {formatVND(stats.codNet)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {stats.codCount} đơn thanh toán tiền mặt qua Shipper
            </p>
          </div>
          <div className="pt-2 border-t border-orange-100 flex items-center justify-between text-[10.5px] text-orange-700 font-medium">
            <span>Tỷ trọng thanh toán:</span>
            <span className="font-bold">{codPercent}%</span>
          </div>
        </div>

        {/* Thẻ 5: Tiền Chuyển Khoản (Doanh thu online) */}
        <div className="bg-white rounded-2xl border border-indigo-200 p-4 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-b from-indigo-50/30 to-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
              5. Tiền Chuyển Khoản
            </span>
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <span className="material-symbols-outlined text-[18px]">qr_code_2</span>
            </span>
          </div>
          <div className="my-2.5">
            <div className="text-xl sm:text-2xl font-black text-indigo-700 font-mono">
              {formatVND(stats.payosNet)}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              {stats.payosCount} đơn thanh toán VietQR / PayOS
            </p>
          </div>
          <div className="pt-2 border-t border-indigo-100 flex items-center justify-between text-[10.5px] text-indigo-700 font-medium">
            <span>Tỷ trọng thanh toán:</span>
            <span className="font-bold">{payosPercent}%</span>
          </div>
        </div>
      </div>

      {/* 5. CỤM BIỂU ĐỒ DASHBOARD DÒNG TIỀN (INTERACTIVE CHARTS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* BIỂU ĐỒ 1: PHỄU VÒNG ĐỜI DÒNG TIỀN (WATERFALL / LIFECYCLE PIPELINE) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">schema</span>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Biểu Đồ Vòng Đời Dòng Tiền (Cash Flow Lifecycle)</h3>
                  <p className="text-[11px] text-gray-500">Tiến trình luân chuyển tiền từ lúc giao hàng đến khi rút về ngân hàng</p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                Tổng 95%: {formatVND(stats.totalNetRevenue)}
              </span>
            </div>

            {/* Pipeline Step Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-center">
                <span className="text-[10px] font-bold text-blue-700 uppercase">1. Đang Giao</span>
                <div className="text-sm font-black text-blue-800 font-mono mt-1">{formatVND(stats.inTransitNet)}</div>
                <div className="text-[10px] text-blue-600 mt-0.5">{stats.inTransitCount} món ({inTransitFlowPct}%)</div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
                <span className="text-[10px] font-bold text-amber-700 uppercase">2. Ký Quỹ Đổi Trả</span>
                <div className="text-sm font-black text-amber-800 font-mono mt-1">{formatVND(stats.holdingNet)}</div>
                <div className="text-[10px] text-amber-600 mt-0.5">{stats.holdingCount} món ({holdingFlowPct}%)</div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                <span className="text-[10px] font-bold text-emerald-700 uppercase">3. Khả Dụng Ví</span>
                <div className="text-sm font-black text-emerald-800 font-mono mt-1">{formatVND(stats.availableBalance)}</div>
                <div className="text-[10px] text-emerald-600 mt-0.5">Sẵn sàng rút ({availableFlowPct}%)</div>
              </div>

              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-center">
                <span className="text-[10px] font-bold text-indigo-700 uppercase">4. Đã Rút Về STK</span>
                <div className="text-sm font-black text-indigo-800 font-mono mt-1">{formatVND(stats.totalWithdrawn)}</div>
                <div className="text-[10px] text-indigo-600 mt-0.5">Giải ngân ({withdrawnFlowPct}%)</div>
              </div>
            </div>

            {/* Visual Multi-Segment Progress Bar */}
            <div className="space-y-1.5 mt-2">
              <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${Math.max(stats.inTransitNet > 0 ? 5 : 0, inTransitFlowPct)}%` }}
                  className="bg-blue-500 h-full transition-all duration-500"
                  title={`Đang giao: ${formatVND(stats.inTransitNet)} (${inTransitFlowPct}%)`}
                />
                <div
                  style={{ width: `${Math.max(stats.holdingNet > 0 ? 5 : 0, holdingFlowPct)}%` }}
                  className="bg-amber-500 h-full transition-all duration-500"
                  title={`Ký quỹ: ${formatVND(stats.holdingNet)} (${holdingFlowPct}%)`}
                />
                <div
                  style={{ width: `${Math.max(stats.availableBalance > 0 ? 5 : 0, availableFlowPct)}%` }}
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title={`Khả dụng: ${formatVND(stats.availableBalance)} (${availableFlowPct}%)`}
                />
                <div
                  style={{ width: `${Math.max(stats.totalWithdrawn > 0 ? 5 : 0, withdrawnFlowPct)}%` }}
                  className="bg-indigo-600 h-full transition-all duration-500"
                  title={`Đã rút về STK: ${formatVND(stats.totalWithdrawn)} (${withdrawnFlowPct}%)`}
                />
              </div>

              <div className="flex items-center justify-between text-[10.5px] text-gray-500 pt-1">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span> Đang giao
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Ký quỹ đổi trả
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Khả dụng trong ví
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-600"></span> Đã giải ngân về STK
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 bg-gray-50/70 p-3 rounded-xl">
            <span className="flex items-center gap-1 text-[11px]">
              <span className="material-symbols-outlined text-sm text-emerald-600">verified</span>
              <span>Bảo chứng Escrow: Hết 2 phút đổi trả, tiền tự động nhảy sang Khả dụng và ghi lịch sử.</span>
            </span>
            <Link href="/seller/finance" className="text-emerald-700 font-bold hover:underline shrink-0 text-xs">
              Mở Ví Rút Tiền &rarr;
            </Link>
          </div>
        </div>

        {/* BIỂU ĐỒ 2: CƠ CẤU THANH TOÁN (COD vs CHUYỂN KHOẢN) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">pie_chart</span>
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Cơ Cấu Phương Thức Thanh Toán</h3>
                  <p className="text-[11px] text-gray-500">Tiền mặt COD vs Chuyển khoản trực tuyến</p>
                </div>
              </div>
            </div>

            {/* Donut Chart Visual */}
            <div className="flex items-center justify-center gap-6 my-4">
              <div className="relative w-32 h-32 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-100"
                    strokeWidth="4"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* COD Segment */}
                  <path
                    className="text-orange-500 transition-all duration-700"
                    strokeDasharray={`${codPercent}, 100`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  {/* PayOS Segment */}
                  <path
                    className="text-indigo-600 transition-all duration-700"
                    strokeDasharray={`${payosPercent}, 100`}
                    strokeDashoffset={`-${codPercent}`}
                    strokeWidth="4"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Tổng GMV</span>
                  <span className="text-xs font-black text-gray-900 font-mono">{formatVND(stats.totalGrossGMV)}</span>
                </div>
              </div>

              <div className="space-y-3 flex-1 text-xs">
                <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-200">
                  <div className="flex items-center justify-between text-orange-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                      <span>Tiền Mặt COD ({codPercent}%)</span>
                    </span>
                    <span className="font-mono">{formatVND(stats.codGMV)}</span>
                  </div>
                  <div className="text-[10.5px] text-orange-700 mt-0.5 flex justify-between">
                    <span>{stats.codCount} đơn hàng thu tiền tận nơi</span>
                    <span>Thực nhận: {formatVND(stats.codNet)}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-200">
                  <div className="flex items-center justify-between text-indigo-900 font-bold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      <span>Chuyển Khoản ({payosPercent}%)</span>
                    </span>
                    <span className="font-mono">{formatVND(stats.payosGMV)}</span>
                  </div>
                  <div className="text-[10.5px] text-indigo-700 mt-0.5 flex justify-between">
                    <span>{stats.payosCount} đơn VietQR / PayOS</span>
                    <span>Thực nhận: {formatVND(stats.payosNet)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2.5 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Khấu trừ sàn cố định 5%: <strong>-{formatVND(stats.totalPlatformFee)}</strong></span>
            <span className="text-emerald-700 font-bold">Shop hưởng 95%</span>
          </div>
        </div>
      </div>

      {/* 6. BẢNG DỮ LIỆU ĐỐI SOÁT CHI TIẾT & NHẬT KÝ BIẾN ĐỘNG */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {/* Navigation Tabs for Tables */}
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('ITEMS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ITEMS'
                  ? 'bg-[#00875A] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">receipt_long</span>
              <span>Chi Tiết Từng Món Hàng &amp; Dòng Tiền ({filteredItems.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-[#00875A] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">sync_alt</span>
              <span>Sổ Cái Biến Động Ví ({transactions.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PAYOUTS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'PAYOUTS'
                  ? 'bg-[#00875A] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">account_balance</span>
              <span>Lệnh Rút Tiền Về STK ({payouts.length})</span>
            </button>
          </div>

          <Link
            href="/seller/escrow"
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">hourglass_top</span>
            <span>Xem Tiền Chờ Quyết Toán</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        {/* TAB 1: BẢNG KÊ CHI TIẾT TỪNG MÓN HÀNG */}
        {activeTab === 'ITEMS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
                <tr>
                  <th className="p-3.5">Mã Đơn &amp; Thời Gian</th>
                  <th className="p-3.5">Sách &amp; Ảnh Bìa</th>
                  <th className="p-3.5">Khách Hàng &amp; Nhận Hàng</th>
                  <th className="p-3.5 text-right">Tổng Tiền (100%)</th>
                  <th className="p-3.5 text-right text-amber-700">Phí Sàn (5%)</th>
                  <th className="p-3.5 text-right text-emerald-700 font-bold">Thực Nhận (95%)</th>
                  <th className="p-3.5 text-center">Trạng Thái Dòng Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></span>
                        <span>Đang tải dữ liệu báo cáo tài chính...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      Không có đơn hàng nào trong khoảng thời gian đã chọn.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-gray-900 font-mono">{it.orderCode || it.orderId}</div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {formatVietnamDateTime(it.orderCreatedAt)}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              it.paymentMethod === 'COD'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {it.paymentMethod === 'COD' ? '💵 COD (Tiền mặt)' : '💳 Chuyển khoản VietQR'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          {it.coverUrl ? (
                            <img
                              src={it.coverUrl}
                              alt={it.bookTitle}
                              className="w-10 h-14 object-cover rounded-md border border-gray-200 shadow-2xs shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-14 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                              <span className="material-symbols-outlined text-lg">menu_book</span>
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-gray-900 max-w-xs line-clamp-2" title={it.bookTitle}>
                              {it.bookTitle}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5">
                              SL: <span className="font-bold text-gray-700">{it.quantity}</span> × {formatVND(it.unitPrice)}
                            </div>
                            <div className="mt-0.5">
                              <span
                                className={`inline-block px-1.5 py-0.2 rounded text-[9.5px] font-semibold ${
                                  it.format === 'DIGITAL' || it.bookTitle?.toLowerCase().includes('ebook')
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {it.format === 'DIGITAL' || it.bookTitle?.toLowerCase().includes('ebook')
                                  ? '📱 Ebook'
                                  : '📦 Sách Giấy'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-gray-900">{it.customerName || 'Khách hàng HuKi'}</div>
                        <div className="text-[11px] text-gray-500">{it.customerPhone || '0901234567'}</div>
                        <div className="text-[11px] text-gray-500 truncate max-w-xs" title={it.shippingAddress}>
                          {it.shippingAddress || 'Nhận sách điện tử / Giao hàng tận nơi'}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-semibold text-gray-900">
                        {formatVND(it.subtotal)}
                      </td>
                      <td className="p-3.5 text-right font-semibold text-amber-700">
                        -{formatVND(it.platformFee)}
                      </td>
                      <td className="p-3.5 text-right font-bold text-emerald-700 font-mono">
                        +{formatVND(it.sellerNet)}
                      </td>
                      <td className="p-3.5 text-center">
                        <EscrowTableBadge item={it} onAutoRelease={handleAutoReleaseItem} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Phân trang Tab 1 */}
            {filteredItems.length > 0 && (
              <div className="p-3.5 border-t border-gray-100 bg-white">
                <SellerPagination
                  currentPage={itemsPage}
                  totalPages={itemsTotalPages}
                  totalItems={filteredItems.length}
                  pageSize={itemsPageSize}
                  onPageChange={(p) => setItemsPage(p)}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 2: NHẬT KÝ DÒNG TIỀN VÀO - RA */}
        {activeTab === 'TRANSACTIONS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
                <tr>
                  <th className="p-3.5">Thời Gian</th>
                  <th className="p-3.5">Loại Biến Động</th>
                  <th className="p-3.5">Nội Dung Chi Tiết</th>
                  <th className="p-3.5 text-right">Số Tiền Phát Sinh</th>
                  <th className="p-3.5 text-right">Khả Dụng Trước</th>
                  <th className="p-3.5 text-right">Khả Dụng Sau</th>
                  <th className="p-3.5 text-center">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      Chưa có giao dịch biến động số dư nào được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  paginatedTransactions.map((tx) => {
                    const isCredit = tx.type === 'CREDIT_AVAILABLE';
                    const isDebit = tx.type === 'DEBIT_AVAILABLE';
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="p-3.5 font-mono text-gray-500 whitespace-nowrap">
                          {formatVietnamDateTime(tx.createdAt)}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {isCredit ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="material-symbols-outlined text-[13px]">arrow_downward</span>
                              <span>+ Cộng Doanh Thu</span>
                            </span>
                          ) : isDebit ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="material-symbols-outlined text-[13px]">arrow_upward</span>
                              <span>- Rút Tiền Về STK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="material-symbols-outlined text-[13px]">sync</span>
                              <span>Chuyển Quỹ Ký Quỹ</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 max-w-sm">
                          <div className="font-semibold text-gray-900">{tx.description || 'Giao dịch hệ thống'}</div>
                          {tx.metadata?.orderCode && (
                            <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                              Đơn hàng: #{tx.metadata.orderCode}
                            </div>
                          )}
                        </td>
                        <td className={`p-3.5 text-right font-black font-mono text-sm ${isCredit ? 'text-emerald-700' : isDebit ? 'text-rose-600' : 'text-gray-900'}`}>
                          {isCredit ? '+' : isDebit ? '-' : ''}
                          {formatVND(tx.amount)}
                        </td>
                        <td className="p-3.5 text-right font-mono text-gray-500">
                          {formatVND(tx.availableBefore)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-gray-900">
                          {formatVND(tx.availableAfter)}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="material-symbols-outlined text-[12px]">check</span>
                            <span>Thành công</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Phân trang Tab 2 */}
            {transactions.length > 0 && (
              <div className="p-3.5 border-t border-gray-100 bg-white">
                <SellerPagination
                  currentPage={txPage}
                  totalPages={txTotalPages}
                  totalItems={transactions.length}
                  pageSize={txPageSize}
                  onPageChange={(p) => setTxPage(p)}
                />
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LỆNH RÚT TIỀN VỀ NGÂN HÀNG */}
        {activeTab === 'PAYOUTS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
                <tr>
                  <th className="p-3.5">Mã Lệnh Rút</th>
                  <th className="p-3.5">Thời Gian Yêu Cầu</th>
                  <th className="p-3.5">Ngân Hàng Thụ Hưởng</th>
                  <th className="p-3.5 text-right">Số Tiền Rút</th>
                  <th className="p-3.5 text-center">Trạng Thái Xử Lý</th>
                  <th className="p-3.5 text-right">Cơ Chế Giải Ngân</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Chưa có lệnh rút tiền nào được tạo.
                    </td>
                  </tr>
                ) : (
                  paginatedPayouts.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-gray-900">
                        #{req.id.slice(0, 8)}
                      </td>
                      <td className="p-3.5 font-mono text-gray-500 whitespace-nowrap">
                        {formatVietnamDateTime(req.createdAt)}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-gray-900">{req.bankSnapshot?.bankName}</div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          STK: {req.bankSnapshot?.maskedAccountNumber || req.bankSnapshot?.accountNumber} ({req.bankSnapshot?.accountHolder})
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-black font-mono text-emerald-700 text-sm">
                        {formatVND(req.amount)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="material-symbols-outlined text-[13px]">verified</span>
                          <span>Hoàn Tất</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-right text-gray-600 text-[11px]">
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                          <span className="material-symbols-outlined text-[13px]">lock</span>
                          <span>Xác thực mã PIN 6 số</span>
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Phân trang Tab 3 */}
            {payouts.length > 0 && (
              <div className="p-3.5 border-t border-gray-100 bg-white">
                <SellerPagination
                  currentPage={payoutPage}
                  totalPages={payoutTotalPages}
                  totalItems={payouts.length}
                  pageSize={payoutPageSize}
                  onPageChange={(p) => setPayoutPage(p)}
                />
              </div>
            )}
          </div>
        )}
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
                Đơn đã giao thành công, tiền 95% nằm trong quỹ bảo chứng của sàn trong thời gian người mua được đổi trả (2 phút test).
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
