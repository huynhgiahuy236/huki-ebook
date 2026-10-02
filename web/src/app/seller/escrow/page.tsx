"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { walletApi, type SellerEscrowItem } from '@/ui/api/walletApi';

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

export default function SellerEscrowPage() {
  const { user } = useAuth();
  const [escrowItems, setEscrowItems] = useState<SellerEscrowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'COD' | 'PAYOS'>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Modal
  const [selectedItem, setSelectedItem] = useState<SellerEscrowItem | null>(null);

  const fetchEscrowItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await walletApi.getSellerEscrowItems();
      if (res.success && Array.isArray(res.data)) {
        setEscrowItems(res.data);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách tiền đang treo:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscrowItems();
  }, [fetchEscrowItems]);

  // Comprehensive stats
  const stats = useMemo(() => {
    const pendingItems = escrowItems.filter((it) => it.escrowStatus === 'PENDING_PAYMENT');
    const holdingItems = escrowItems.filter((it) => it.escrowStatus === 'HOLDING');
    const releasedItems = escrowItems.filter((it) => it.escrowStatus === 'RELEASED');
    const frozenItems = escrowItems.filter((it) => it.escrowStatus === 'FROZEN');

    const sumNet = (arr: SellerEscrowItem[]) =>
      arr.reduce((s, it) => s + (Number(it.sellerNet) || Math.round(Number(it.subtotal || 0) * 0.95)), 0);

    const pendingAmount = sumNet(pendingItems);
    const holdingAmount = sumNet(holdingItems);
    const releasedAmount = sumNet(releasedItems);
    const frozenAmount = sumNet(frozenItems);
    const totalEscrowHolding = pendingAmount + holdingAmount + frozenAmount;

    return {
      totalCount: escrowItems.length,
      pendingCount: pendingItems.length,
      holdingCount: holdingItems.length,
      releasedCount: releasedItems.length,
      frozenCount: frozenItems.length,
      pendingAmount,
      holdingAmount,
      releasedAmount,
      frozenAmount,
      totalEscrowHolding,
    };
  }, [escrowItems]);

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return escrowItems.filter((it) => {
      // 1. Status Filter
      if (activeStatusTab !== 'ALL' && it.escrowStatus !== activeStatusTab) {
        return false;
      }

      // 2. Format Filter
      const isDigital = it.format === 'DIGITAL' || it.bookTitle?.toLowerCase().includes('ebook');
      if (formatFilter === 'DIGITAL' && !isDigital) return false;
      if (formatFilter === 'PHYSICAL' && isDigital) return false;

      // 3. Payment Filter
      if (paymentFilter === 'COD' && it.paymentMethod !== 'COD') return false;
      if (paymentFilter === 'PAYOS' && it.paymentMethod === 'COD') return false;

      // 4. Date Range
      if (startDate || endDate) {
        const itemTime = new Date(it.orderCreatedAt).getTime();
        if (startDate) {
          const start = new Date(startDate).getTime();
          if (itemTime < start) return false;
        }
        if (endDate) {
          const end = new Date(endDate).getTime() + 24 * 60 * 60 * 1000;
          if (itemTime > end) return false;
        }
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = it.orderCode?.toLowerCase().includes(q) || it.orderId?.toLowerCase().includes(q);
        const matchCustomer = it.customerName?.toLowerCase().includes(q) || it.customerPhone?.includes(q);
        const matchBook = it.bookTitle?.toLowerCase().includes(q);
        const matchAddress = it.shippingAddress?.toLowerCase().includes(q);
        if (!matchCode && !matchCustomer && !matchBook && !matchAddress) {
          return false;
        }
      }

      return true;
    });
  }, [escrowItems, activeStatusTab, formatFilter, paymentFilter, startDate, endDate, searchQuery]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusTab, searchQuery, formatFilter, paymentFilter, startDate, endDate, pageSize]);

  // Export CSV
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
      'Tổng Tiền (VNĐ)',
      'Phí Sàn 5% (VNĐ)',
      'Shop Thực Nhận 95% (VNĐ)',
      'Phương Thức TT',
      'Trạng Thái Ký Quỹ',
    ];

    const rows = filteredItems.map((it) => [
      `"${it.orderCode || it.orderId}"`,
      `"${formatVietnamDateTime(it.orderCreatedAt)}"`,
      `"${it.customerName || 'Khách hàng HuKi'}"`,
      `"${it.customerPhone || ''}"`,
      `"${it.shippingAddress || 'Nhận sách điện tử / Giao hàng tận nơi'}"`,
      `"${it.bookTitle?.replace(/"/g, '""') || ''}"`,
      `"${it.format === 'DIGITAL' ? 'Ebook' : 'Sách Giấy'}"`,
      it.quantity,
      it.unitPrice,
      it.subtotal,
      it.platformFee,
      it.sellerNet,
      `"${it.paymentMethod === 'COD' ? 'COD' : 'PayOS / VietQR'}"`,
      `"${
        it.escrowStatus === 'RELEASED'
          ? 'Đã giải ngân'
          : it.escrowStatus === 'HOLDING'
          ? 'Đang ký quỹ đếm ngược'
          : it.escrowStatus === 'PENDING_PAYMENT'
          ? 'Chờ thu COD'
          : 'Đóng băng'
      }"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Ky_Quy_Tien_Treo_HuKi_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 font-bold">
              <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Quản Lý Tiền Đang Treo &amp; Ký Quỹ Escrow
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi chi tiết từng cuốn sách trong tất cả đơn hàng: tình trạng giữ tiền bảo chứng, đếm ngược hạn đổi trả 2 phút và tiến trình giải ngân 95% về ví.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/seller/reports"
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-1.5 border border-blue-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">analytics</span>
            <span>Xem Dashboard Báo Cáo</span>
          </Link>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#003B2B] text-white hover:bg-[#00271D] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Xuất Bảng Ký Quỹ (CSV)</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng Tiền Đang Ký Quỹ */}
        <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-xs relative overflow-hidden bg-gradient-to-b from-amber-50/40 to-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Tổng Tiền Đang Ký Quỹ
            </span>
            <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <span className="material-symbols-outlined text-[20px]">hourglass_bottom</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-700">{formatVND(stats.totalEscrowHolding)}</div>
            <div className="text-xs text-amber-900 mt-1">
              Gồm {stats.pendingCount + stats.holdingCount + stats.frozenCount} món sách đang chờ giải ngân
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-800">
            <span>Đang bảo chứng an toàn</span>
            <span className="font-semibold">Tự động chuyển ví</span>
          </div>
        </div>

        {/* Card 2: Chờ Shipper Giao & Thu COD */}
        <div className="bg-white rounded-2xl border border-blue-100 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Chờ Thu COD (Đang Vận Chuyển)
            </span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <span className="material-symbols-outlined text-[20px]">local_shipping</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-blue-700">{formatVND(stats.pendingAmount)}</div>
            <div className="text-xs text-blue-600 mt-1">
              {stats.pendingCount} món đang giao tận nơi
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Tiền mặt bưu tá thu</span>
            <span className="font-semibold">Sẽ nộp về sàn</span>
          </div>
        </div>

        {/* Card 3: Đang Trong Hạn 2 Phút Test Đổi Trả */}
        <div className="bg-white rounded-2xl border border-purple-100 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">
              Đang Đếm Ngược Đổi Trả (2 phút)
            </span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <span className="material-symbols-outlined text-[20px]">timer</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-purple-700">{formatVND(stats.holdingAmount)}</div>
            <div className="text-xs text-purple-600 mt-1">
              {stats.holdingCount} món đã giao / khách đã thanh toán
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Hết 2 phút → Vào ví ngay</span>
            <span className="font-bold text-emerald-600">Auto Release</span>
          </div>
        </div>

        {/* Card 4: Đã Giải Ngân Thành Công */}
        <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
              Đã Giải Ngân Sang Ví
            </span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-emerald-700">{formatVND(stats.releasedAmount)}</div>
            <div className="text-xs text-emerald-600 mt-1">
              {stats.releasedCount} món đã hoàn tất &amp; vào số dư
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Sẵn sàng rút về STK</span>
            <Link href="/seller/finance" className="font-bold text-emerald-700 hover:underline">
              Rút tiền ngay →
            </Link>
          </div>
        </div>
      </div>

      {/* 3. RICH FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-100">
          {[
            { key: 'ALL', label: `Tất Cả (${stats.totalCount})` },
            { key: 'PENDING_PAYMENT', label: `Chờ Thu COD (${stats.pendingCount})` },
            { key: 'HOLDING', label: `Đang Ký Quỹ Đếm Ngược (${stats.holdingCount})` },
            { key: 'RELEASED', label: `Đã Giải Ngân (${stats.releasedCount})` },
            { key: 'FROZEN', label: `Đóng Băng (${stats.frozenCount})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveStatusTab(tab.key)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeStatusTab === tab.key
                  ? 'bg-[#003B2B] text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Multi Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm mã đơn, tên sách, tên khách, SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-emerald-600 focus:bg-white transition-all"
            />
          </div>

          {/* Format Filter */}
          <div>
            <select
              value={formatFilter}
              onChange={(e) => setFormatFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-hidden focus:border-emerald-600 focus:bg-white cursor-pointer"
            >
              <option value="ALL">📦 Tất Cả Định Dạng</option>
              <option value="PHYSICAL">📦 Sách Giấy Vật Lý</option>
              <option value="DIGITAL">📱 Sách Điện Tử (Ebook)</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-hidden focus:border-emerald-600 focus:bg-white cursor-pointer"
            >
              <option value="ALL">💳 Mọi Phương Thức TT</option>
              <option value="COD">💵 Tiền Mặt COD</option>
              <option value="PAYOS">💳 PayOS / VietQR</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveStatusTab('ALL');
                setSearchQuery('');
                setFormatFilter('ALL');
                setPaymentFilter('ALL');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              <span>Đặt Lại Lọc</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN RICH DATA TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider">
            Danh Sách Món Hàng Ký Quỹ ({filteredItems.length} kết quả)
          </div>
          <div className="text-xs text-gray-500">
            Hiển thị {paginatedItems.length} / {filteredItems.length} dòng
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-[#F8FAFC] text-[11px] font-bold text-gray-500 uppercase border-b border-gray-200">
              <tr>
                <th className="p-3.5 whitespace-nowrap">Mã Đơn &amp; Thời Gian</th>
                <th className="p-3.5 whitespace-nowrap">Khách Hàng &amp; Nhận Sách</th>
                <th className="p-3.5">Tên Sách &amp; Phân Loại</th>
                <th className="p-3.5 whitespace-nowrap">Phương Thức TT</th>
                <th className="p-3.5 text-right whitespace-nowrap">Doanh Thu (100%)</th>
                <th className="p-3.5 text-right whitespace-nowrap text-amber-700">Phí Sàn (5%)</th>
                <th className="p-3.5 text-right whitespace-nowrap text-emerald-700 font-bold">Thực Nhận (95%)</th>
                <th className="p-3.5 text-center whitespace-nowrap">Trạng Thái Ký Quỹ</th>
                <th className="p-3.5 text-center whitespace-nowrap">Chi Tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></span>
                      <span>Đang tải bảng đối soát ký quỹ từ cơ sở dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-gray-500">
                    Không tìm thấy món hàng ký quỹ nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5 align-top">
                      <div className="font-bold text-gray-900 font-mono">{it.orderCode || it.orderId}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {formatVietnamDateTime(it.orderCreatedAt)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">ID: {it.id.slice(0, 8)}...</div>
                    </td>
                    <td className="p-3.5 align-top max-w-[200px]">
                      <div className="font-semibold text-gray-900">{it.customerName || 'Khách hàng HuKi'}</div>
                      <div className="text-[11px] text-gray-500">{it.customerPhone || '0901234567'}</div>
                      <div className="text-[11px] text-gray-500 truncate mt-0.5" title={it.shippingAddress}>
                        {it.shippingAddress || 'Nhận sách điện tử / Giao hàng tận nơi'}
                      </div>
                    </td>
                    <td className="p-3.5 align-top max-w-[220px]">
                      <div className="font-semibold text-gray-900 line-clamp-2">{it.bookTitle}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        SL: <span className="font-bold text-gray-800">{it.quantity}</span> ×{' '}
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
                            ? '📱 Ebook Digital'
                            : '📦 Sách Giấy Vật Lý'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3.5 align-top whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                          it.paymentMethod === 'COD'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {it.paymentMethod === 'COD' ? '💵 Tiền Mặt COD' : '💳 PayOS / VietQR'}
                      </span>
                      {it.paymentStatus && (
                        <div className="text-[10px] text-gray-500 mt-1">
                          {it.paymentStatus === 'PAID' ? '✓ Đã Thanh Toán' : '⏳ Chờ Thanh Toán'}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5 align-top text-right font-semibold text-gray-900 whitespace-nowrap">
                      {formatVND(it.subtotal)}
                    </td>
                    <td className="p-3.5 align-top text-right font-semibold text-amber-700 whitespace-nowrap">
                      -{formatVND(it.platformFee)}
                    </td>
                    <td className="p-3.5 align-top text-right font-black text-emerald-700 whitespace-nowrap">
                      +{formatVND(it.sellerNet)}
                    </td>
                    <td className="p-3.5 align-top text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold ${
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
                    <td className="p-3.5 align-top text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(it)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 5. PAGINATION TOOLBAR */}
        <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span>Hiển thị mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-hidden cursor-pointer"
            >
              <option value={10}>10 dòng</option>
              <option value={25}>25 dòng</option>
              <option value={50}>50 dòng</option>
            </select>
            <span>Tổng cộng {filteredItems.length} dòng</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer"
            >
              ← Trước
            </button>
            <span className="px-3 py-1 font-bold text-gray-800">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer"
            >
              Sau →
            </button>
          </div>
        </div>
      </div>

      {/* 6. ESCROW ITEM DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <span className="material-symbols-outlined">receipt_long</span>
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  Chi Tiết Ký Quỹ &amp; Giải Ngân Món Hàng
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-gray-700">
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <span className="text-gray-500">Mã Đơn Hàng:</span>
                  <div className="font-bold text-gray-900 font-mono mt-0.5">
                    {selectedItem.orderCode || selectedItem.orderId}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Thời Gian Đặt:</span>
                  <div className="font-semibold text-gray-900 mt-0.5">
                    {formatVietnamDateTime(selectedItem.orderCreatedAt)}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-gray-500">Tên Cuốn Sách:</span>
                <div className="font-bold text-gray-900 text-sm mt-0.5">{selectedItem.bookTitle}</div>
                <div className="text-gray-500 mt-0.5">
                  Số lượng: {selectedItem.quantity} × {formatVND(selectedItem.unitPrice)}
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tổng Tiền Bán Niêm Yết:</span>
                  <span className="font-bold text-gray-900">{formatVND(selectedItem.subtotal)}</span>
                </div>
                {selectedItem.storeVoucherDiscount && selectedItem.storeVoucherDiscount > 0 ? (
                  <div className="flex justify-between text-rose-600 font-medium">
                    <span>Voucher Shop Tài Trợ ({selectedItem.voucherInfo?.code || 'Shop'}):</span>
                    <span className="font-bold">-{formatVND(selectedItem.storeVoucherDiscount)}</span>
                  </div>
                ) : null}
                {selectedItem.storeVoucherDiscount && selectedItem.storeVoucherDiscount > 0 ? (
                  <div className="flex justify-between text-slate-700 font-medium pt-1 border-t border-dashed border-gray-200">
                    <span>Doanh Thu Tính Phí:</span>
                    <span className="font-bold">{formatVND(selectedItem.effectiveSubtotal || (selectedItem.subtotal - selectedItem.storeVoucherDiscount))}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-amber-700">
                  <span>Phí Dịch Vụ Sàn HuKi (5%):</span>
                  <span className="font-bold">-{formatVND(selectedItem.platformFee)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 pt-1.5 border-t border-gray-200 text-sm">
                  <span className="font-bold">Shop Thực Nhận (95%):</span>
                  <span className="font-black">+{formatVND(selectedItem.sellerNet)}</span>
                </div>
              </div>

              <div>
                <span className="text-gray-500">Người Mua &amp; Địa Chỉ:</span>
                <div className="font-semibold text-gray-900 mt-0.5">
                  {selectedItem.customerName || 'Khách hàng HuKi'} ({selectedItem.customerPhone || '0901234567'})
                </div>
                <div className="text-gray-600 mt-0.5">
                  {selectedItem.shippingAddress || 'Nhận sách điện tử / Giao hàng tận nơi'}
                </div>
              </div>

              {/* COD Remittance Details */}
              {selectedItem.paymentMethod === 'COD' && (
                <div className={`p-3 rounded-xl border ${selectedItem.remittanceInfo?.isRemitted ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-amber-50/60 border-amber-200 text-amber-950'}`}>
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[16px] text-emerald-700">local_shipping</span>
                    <span>Thông Tin Thu Nộp COD (HuKi Express)</span>
                  </div>
                  {selectedItem.remittanceInfo?.isRemitted ? (
                    <div className="mt-1.5 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-emerald-800">Bưu tá thu &amp; nộp:</span>
                        <span className="font-bold">{selectedItem.remittanceInfo.shipperName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-800">Cổng nộp Quỹ Sàn:</span>
                        <span className="font-semibold">{selectedItem.remittanceInfo.method}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-800">Mã giao dịch đối soát:</span>
                        <span className="font-mono font-bold text-emerald-900">{selectedItem.remittanceInfo.txCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-800">Thời gian nộp Quỹ:</span>
                        <span className="font-semibold">{formatVietnamDateTime(selectedItem.remittanceInfo.remittedAt)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-amber-800">
                      Bưu tá đang vận chuyển giao hàng tận nơi. Tiền mặt sẽ được nộp về Quỹ Sàn ngay sau khi giao thành công.
                    </div>
                  )}
                </div>
              )}

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-blue-900">
                <div className="font-bold">Trạng Thái Dòng Tiền:</div>
                <div className="mt-1">
                  {selectedItem.escrowStatus === 'RELEASED'
                    ? '✓ Đã hết hạn đổi trả 2 phút, tiền 95% đã cộng vào Số Dư Khả Dụng trong Ví của Shop.'
                    : selectedItem.escrowStatus === 'HOLDING'
                    ? '⏳ Đang trong thời gian 2 phút test đổi trả. Sàn HuKi đang giữ tiền bảo chứng an toàn.'
                    : selectedItem.escrowStatus === 'PENDING_PAYMENT'
                    ? '🚚 Đơn hàng đang được Shipper giao tận nơi, chờ thu tiền mặt COD.'
                    : '⚠️ Món hàng đang bị đóng băng do có khiếu nại đổi trả đang xử lý.'}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <Link
                href={`/seller/orders?search=${encodeURIComponent(selectedItem.orderCode || selectedItem.orderId)}`}
                className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Xem Đơn Hàng Gốc</span>
                <span className="material-symbols-outlined text-sm">open_in_new</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
