"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { walletApi, type SellerEscrowItem, type WalletData, type WalletTransactionItem } from '@/ui/api/walletApi';

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
    return `${getPart('day')}/${getPart('month')}/${getPart('year')} ${getPart('hour')}:${getPart('minute')}`;
  } catch {
    return dateStr;
  }
}

export default function SellerFinancialReportsPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [escrowItems, setEscrowItems] = useState<SellerEscrowItem[]>([]);
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Time filters
  const [dateRange, setDateRange] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [wRes, escRes, txRes] = await Promise.all([
        walletApi.getWallet(),
        walletApi.getSellerEscrowItems(),
        walletApi.getTransactions(1, 100),
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
    } catch (err) {
      console.warn('Lỗi tải báo cáo tài chính:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered Escrow Items based on date
  const filteredItems = useMemo(() => {
    return escrowItems.filter((it) => {
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

  // Financial Computations
  const stats = useMemo(() => {
    let totalGrossGMV = 0; // 100% Tổng giá trị sách
    let totalPlatformFee = 0; // 5% phí sàn
    let totalNetRevenue = 0; // 95% thực nhận

    let physicalGMV = 0;
    let digitalGMV = 0;
    let codGMV = 0;
    let payosGMV = 0;

    let releasedAmount = 0;
    let holdingAmount = 0;
    let pendingPaymentAmount = 0;
    let frozenAmount = 0;

    let releasedCount = 0;
    let holdingCount = 0;
    let pendingPaymentCount = 0;
    let frozenCount = 0;

    filteredItems.forEach((it) => {
      const subtotal = Number(it.subtotal) || (Number(it.unitPrice) * Number(it.quantity)) || 0;
      const fee = Number(it.platformFee) || Math.round(subtotal * 0.05);
      const net = Number(it.sellerNet) || (subtotal - fee);

      totalGrossGMV += subtotal;
      totalPlatformFee += fee;
      totalNetRevenue += net;

      // Format split
      if (it.format === 'DIGITAL' || it.bookTitle?.toLowerCase().includes('ebook')) {
        digitalGMV += subtotal;
      } else {
        physicalGMV += subtotal;
      }

      // Payment Method split
      if (it.paymentMethod === 'COD') {
        codGMV += subtotal;
      } else {
        payosGMV += subtotal;
      }

      // Escrow status split
      if (it.escrowStatus === 'RELEASED') {
        releasedAmount += net;
        releasedCount++;
      } else if (it.escrowStatus === 'HOLDING') {
        holdingAmount += net;
        holdingCount++;
      } else if (it.escrowStatus === 'PENDING_PAYMENT') {
        pendingPaymentAmount += net;
        pendingPaymentCount++;
      } else if (it.escrowStatus === 'FROZEN') {
        frozenAmount += net;
        frozenCount++;
      }
    });

    const totalEscrowHolding = holdingAmount + pendingPaymentAmount + frozenAmount;
    const totalWithdrawn = transactions
      .filter((t) => t.type === 'DEBIT_AVAILABLE')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const availableBalance = wallet?.availableBalance || Math.max(0, releasedAmount - totalWithdrawn);

    return {
      totalGrossGMV,
      totalPlatformFee,
      totalNetRevenue,
      physicalGMV,
      digitalGMV,
      codGMV,
      payosGMV,
      releasedAmount,
      releasedCount,
      holdingAmount,
      holdingCount,
      pendingPaymentAmount,
      pendingPaymentCount,
      frozenAmount,
      frozenCount,
      totalEscrowHolding,
      totalWithdrawn,
      availableBalance,
      totalOrdersCount: filteredItems.length,
    };
  }, [filteredItems, transactions, wallet]);

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
      'Trạng Thái Dòng Tiền (Ký Quỹ)',
    ];

    const rows = filteredItems.map((it) => [
      `"${it.orderCode || it.orderId}"`,
      `"${formatVietnamDateTime(it.orderCreatedAt)}"`,
      `"${it.customerName || 'Khách hàng HuKi'}"`,
      `"${it.customerPhone || ''}"`,
      `"${it.shippingAddress || 'Nhận sách điện tử / Giao hàng tận nơi'}"`,
      `"${it.bookTitle?.replace(/"/g, '""') || ''}"`,
      `"${it.format === 'DIGITAL' ? 'Sách Điện Tử (Ebook)' : 'Sách Giấy Vật Lý'}"`,
      it.quantity,
      it.unitPrice,
      it.subtotal,
      it.platformFee,
      it.sellerNet,
      `"${it.paymentMethod === 'COD' ? 'Thanh toán COD' : 'Cổng PayOS / VietQR'}"`,
      `"${
        it.escrowStatus === 'RELEASED'
          ? 'Đã giải ngân'
          : it.escrowStatus === 'HOLDING'
          ? 'Đang ký quỹ đếm ngược'
          : it.escrowStatus === 'PENDING_PAYMENT'
          ? 'Chờ thu COD'
          : 'Đóng băng tranh chấp'
      }"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
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
            <span>Báo Cáo &amp; Phân Tích Doanh Thu</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bảng phân tích kế toán chi tiết: đối soát doanh thu phát sinh, khấu trừ hoa hồng sàn 5%, dòng tiền ký quỹ và số dư khả dụng thực nhận.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-500">calculate</span>
            <span>Diễn Giải Công Thức Dòng Tiền</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#003B2B] text-white hover:bg-[#00271D] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Xuất Báo Cáo (CSV / Excel)</span>
          </button>
        </div>
      </div>

      {/* 2. TIME FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
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
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                dateRange === btn.key && !customStartDate
                  ? 'bg-[#003B2B] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span>Tùy chọn:</span>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => {
              setCustomStartDate(e.target.value);
              setDateRange('ALL');
            }}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-hidden focus:border-emerald-600"
          />
          <span>→</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => {
              setCustomEndDate(e.target.value);
              setDateRange('ALL');
            }}
            className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-hidden focus:border-emerald-600"
          />
        </div>
      </div>

      {/* 3. EXECUTIVE FINANCIAL KPI CARDS (DẠNG DASHBOARD KẾ TOÁN MINH BẠCH) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng Doanh Thu Phát Sinh (Gross GMV) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              1. Tổng Doanh Thu Phát Sinh (GMV)
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-gray-900">{formatVND(stats.totalGrossGMV)}</div>
            <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
              <span>Tổng {stats.totalOrdersCount} món sách đã bán</span>
              <span className="text-blue-600 font-bold">100% Giá trị</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Sách giấy: {formatVND(stats.physicalGMV)}</span>
            <span>Ebook: {formatVND(stats.digitalGMV)}</span>
          </div>
        </div>

        {/* Card 2: Phí Dịch Vụ Sàn HuKi (5%) */}
        <div className="bg-white rounded-2xl border border-amber-100/80 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-b from-amber-50/20 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              2. Phí Dịch Vụ Sàn (5%)
            </span>
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <span className="material-symbols-outlined text-[20px]">receipt</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">-{formatVND(stats.totalPlatformFee)}</div>
            <div className="text-xs text-amber-900 mt-1 flex items-center justify-between">
              <span>Khấu trừ tự động vào quỹ sàn</span>
              <span className="font-bold">5% Doanh thu</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-800">
            <span>Bảo hộ thanh toán &amp; máy chủ</span>
            <span className="font-semibold">Cố định 5%</span>
          </div>
        </div>

        {/* Card 3: Doanh Thu Thuần Của Shop (95%) */}
        <div className="bg-white rounded-2xl border border-emerald-100/80 p-5 shadow-xs relative overflow-hidden flex flex-col justify-between bg-gradient-to-b from-emerald-50/20 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              3. Doanh Thu Thuần Shop (95%)
            </span>
            <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <span className="material-symbols-outlined text-[20px]">paid</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">{formatVND(stats.totalNetRevenue)}</div>
            <div className="text-xs text-emerald-900 mt-1 flex items-center justify-between">
              <span>Thực nhận về Shop</span>
              <span className="font-bold">95% Giá trị</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center justify-between text-[11px] text-emerald-800">
            <span>Đã giải ngân: {formatVND(stats.releasedAmount)}</span>
            <span>Đang treo: {formatVND(stats.totalEscrowHolding)}</span>
          </div>
        </div>

        {/* Card 4: Số Dư Khả Dụng Sẵn Sàng Rút (Wallet) */}
        <div className="bg-[#003B2B] text-white rounded-2xl p-5 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
              4. Số Dư Khả Dụng (Ví Rút Tiền)
            </span>
            <span className="p-2 rounded-xl bg-white/10 text-emerald-300">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">{formatVND(stats.availableBalance)}</div>
            <div className="text-xs text-emerald-200 mt-1 flex items-center justify-between">
              <span>Tiền đã sẵn sàng rút về STK</span>
              <Link
                href="/seller/finance"
                className="underline text-white font-bold hover:text-emerald-300 cursor-pointer"
              >
                Rút Tiền →
              </Link>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-300">
            <span>Đã rút về STK: {formatVND(stats.totalWithdrawn)}</span>
            <span className="bg-emerald-500/30 px-2 py-0.5 rounded text-[10px] text-white font-bold">
              Miễn phí rút 0đ
            </span>
          </div>
        </div>
      </div>

      {/* 4. FINANCIAL BREAKDOWN EQUATION (DIỄN GIẢI KẾ TOÁN THỜI GIAN THỰC) */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-[20px]">flowsheet</span>
          Bảng Cân Đối Dòng Tiền Thuần &amp; Trạng Thái Phân Bổ (Ledger Balance)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Box A: Dòng Tiền Đang Ký Quỹ (Escrow Holding) */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                <span>TIỀN ĐANG TREO (KÝ QUỸ)</span>
                <span className="material-symbols-outlined text-amber-600 text-sm">hourglass_top</span>
              </div>
              <div className="text-xl font-black text-amber-800 mt-2">
                {formatVND(stats.totalEscrowHolding)}
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Bao gồm {stats.holdingCount + stats.pendingPaymentCount + stats.frozenCount} món sách đang vận chuyển hoặc đang đếm ngược hạn đổi trả (2 phút).
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-amber-200 text-xs text-amber-900 space-y-1">
              <div className="flex justify-between">
                <span>• Chờ Shipper thu COD:</span>
                <span className="font-bold">{formatVND(stats.pendingPaymentAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>• Đang trong hạn 2 phút test:</span>
                <span className="font-bold">{formatVND(stats.holdingAmount)}</span>
              </div>
              {stats.frozenAmount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>• Bị đóng băng khiếu nại:</span>
                  <span className="font-bold">{formatVND(stats.frozenAmount)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Box B: Dòng Tiền Đã Giải Ngân (Released Funds) */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                <span>DOANH THU ĐÃ GIẢI NGÂN</span>
                <span className="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
              </div>
              <div className="text-xl font-black text-emerald-800 mt-2">
                {formatVND(stats.releasedAmount)}
              </div>
              <p className="text-xs text-emerald-700 mt-1">
                Tổng {stats.releasedCount} món sách đã vượt qua hạn đổi trả 2 phút, tiền đã thuộc sở hữu hoàn toàn của Shop.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="flex justify-between">
                <span>• Đã rút về tài khoản Vietcombank:</span>
                <span className="font-bold text-gray-700">-{formatVND(stats.totalWithdrawn)}</span>
              </div>
              <div className="flex justify-between font-black text-emerald-800">
                <span>• Số Dư Khả Dụng Hiện Tại:</span>
                <span>{formatVND(stats.availableBalance)}</span>
              </div>
            </div>
          </div>

          {/* Box C: Cơ Cấu Thanh Toán (Payment Channels) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span>CƠ CẤU THANH TOÁN ĐƠN HÀNG</span>
                <span className="material-symbols-outlined text-slate-600 text-sm">pie_chart</span>
              </div>
              <div className="text-xl font-black text-slate-900 mt-2">
                {formatVND(stats.totalGrossGMV)}
              </div>
              <p className="text-xs text-slate-600 mt-1">
                Phân bổ theo phương thức thanh toán của người mua sách trên sàn.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex justify-between">
                <span>• Chuyển khoản VietQR / PayOS:</span>
                <span className="font-bold text-blue-700">{formatVND(stats.payosGMV)}</span>
              </div>
              <div className="flex justify-between">
                <span>• Thanh toán tiền mặt COD:</span>
                <span className="font-bold text-amber-700">{formatVND(stats.codGMV)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. DETAILED ESCROW & REVENUE BREAKDOWN TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Bảng Kê Chi Tiết Từng Món Hàng &amp; Dòng Tiền Thực Tế
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Hiển thị đầy đủ mọi đơn hàng, công thức trừ 5% phí sàn và trạng thái đếm ngược giải ngân.
            </p>
          </div>
          <Link
            href="/seller/escrow"
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          >
            <span>Quản Lý Ký Quỹ Đầy Đủ</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="p-3.5">Mã Đơn &amp; Thời Gian</th>
                <th className="p-3.5">Khách Hàng &amp; Nhận Hàng</th>
                <th className="p-3.5">Sách &amp; Phân Loại</th>
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
                filteredItems.map((it) => (
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
                          {it.paymentMethod === 'COD' ? '💵 COD' : '💳 PayOS / VietQR'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-gray-900">{it.customerName || 'Khách hàng HuKi'}</div>
                      <div className="text-[11px] text-gray-500">{it.customerPhone || '0901234567'}</div>
                      <div className="text-[11px] text-gray-500 truncate max-w-xs" title={it.shippingAddress}>
                        {it.shippingAddress || 'Nhận sách điện tử / Giao hàng tận nơi'}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-gray-900 max-w-xs">{it.bookTitle}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        SL: <span className="font-bold text-gray-700">{it.quantity}</span> ×{' '}
                        {formatVND(it.unitPrice)}
                      </div>
                      <div className="mt-1">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
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
                    </td>
                    <td className="p-3.5 text-right font-semibold text-gray-900">
                      {formatVND(it.subtotal)}
                    </td>
                    <td className="p-3.5 text-right font-semibold text-amber-700">
                      -{formatVND(it.platformFee)}
                    </td>
                    <td className="p-3.5 text-right font-black text-emerald-700">
                      +{formatVND(it.sellerNet)}
                    </td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          it.escrowStatus === 'RELEASED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : it.escrowStatus === 'HOLDING'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : it.escrowStatus === 'PENDING_PAYMENT'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            it.escrowStatus === 'RELEASED'
                              ? 'bg-emerald-500'
                              : it.escrowStatus === 'HOLDING'
                              ? 'bg-amber-500 animate-pulse'
                              : it.escrowStatus === 'PENDING_PAYMENT'
                              ? 'bg-blue-500'
                              : 'bg-rose-500'
                          }`}
                        ></span>
                        {it.escrowStatus === 'RELEASED'
                          ? 'Đã giải ngân'
                          : it.escrowStatus === 'HOLDING'
                          ? 'Đang đếm ngược'
                          : it.escrowStatus === 'PENDING_PAYMENT'
                          ? 'Chờ thu COD'
                          : 'Đóng băng'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. FORMULA EXPLANATION MODAL */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
                  <span className="material-symbols-outlined">calculate</span>
                </span>
                <h3 className="text-lg font-bold text-gray-900">
                  Diễn Giải Công Thức &amp; Quy Chuẩn Kế Toán HuKi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="py-4 space-y-4 text-xs text-gray-700 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200">
                <div className="font-bold text-gray-900 mb-1">
                  1. Công thức Doanh Thu Thuần Shop (95% Net Revenue):
                </div>
                <div className="font-mono text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                  Thực Nhận = Tổng Giá Bán Sách (100%) - Phí Dịch Vụ Sàn HuKi (5%)
                </div>
                <p className="mt-1 text-gray-500">
                  Ví dụ: Cuốn sách 100.000đ → Sàn thu phí 5.000đ → Shop thực nhận đúng 95.000đ.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
                <div className="font-bold text-amber-900 mb-1">
                  2. Công thức Tiền Đang Treo (Escrow Holding):
                </div>
                <div className="font-mono text-amber-800 bg-white p-2 rounded-lg border border-amber-200">
                  Tiền Treo = [Đang giao hàng (Chờ COD)] + [Đang trong hạn 2 phút test / 7 ngày đổi trả]
                </div>
                <p className="mt-1 text-amber-700">
                  Khoản tiền này được Sàn HuKi giữ bảo chứng an toàn. Người mua không thể tự ý quỵt và Shop được đảm bảo thanh toán sau khi giao thành công.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200">
                <div className="font-bold text-blue-900 mb-1">
                  3. Công thức Số Dư Khả Dụng (Ví Rút Tiền):
                </div>
                <div className="font-mono text-blue-800 bg-white p-2 rounded-lg border border-blue-200">
                  Số Dư Khả Dụng = [Tổng Tiền Đã Giải Ngân (RELEASED)] - [Tổng Tiền Shop Đã Rút Về Ngân Hàng]
                </div>
                <p className="mt-1 text-blue-700">
                  Số tiền này Shop có thể bấm nút "Rút Toàn Bộ Về Ngân Hàng" bất kỳ lúc nào với mã PIN 6 số.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-[#003B2B] text-white hover:bg-[#00271D] cursor-pointer"
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
