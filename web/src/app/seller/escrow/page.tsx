"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { walletApi, type SellerEscrowItem } from '@/ui/api/walletApi';
import EscrowTableBadge from '@/ui/components/seller/EscrowTableBadge';
import GroupedDataTable, { Column } from '@/ui/components/common/GroupedDataTable';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { useToast } from '@/ui/context/ToastContext';

import { calculateSellerFinancials, formatVND } from '@/ui/utils/sellerFinanceEngine';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '@/ui/components/common';

const escrowBulkActionGroups: BulkActionGroup[] = [
  {
    groupLabel: 'XUẤT DỮ LIỆU',
    actions: [
      { value: 'EXPORT_CSV', label: 'Xuất danh sách món hàng ký quỹ (.csv)' },
    ],
  },
];

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
  const { showToast } = useToast();
  const storeId = (user as any)?.business?.id || (user as any)?.storeId || '501ece69-23b9-4126-9b5e-e3dc206d0c20';
  const [escrowItems, setEscrowItems] = useState<SellerEscrowItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [activeStatusTab, setActiveStatusTab] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'PHYSICAL' | 'DIGITAL'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'COD' | 'PAYOS'>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Modal
  const [selectedItem, setSelectedItem] = useState<SellerEscrowItem | null>(null);
  const [expandedEscrowIds, setExpandedEscrowIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedEscrowIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const fetchEscrowItems = useCallback(async (isSilent?: boolean) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await walletApi.getSellerEscrowItems();
      if (res.success && Array.isArray(res.data)) {
        setEscrowItems(res.data);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách tiền đang treo:', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscrowItems();
  }, [fetchEscrowItems]);

  // Silent Background Auto-Polling (3.5s - Chuẩn Shopee Zero-F5) & RealtimeSyncBus
  useEffect(() => {
    const pollTimer = setInterval(() => {
      fetchEscrowItems(true);
    }, 3500);

    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      const payload = msg.payload as any;
      const isCurrentStore = !payload?.storeId || payload.storeId === storeId;

      if ((msg.type === 'ORDER_CREATED' || msg.type === 'ORDER_PAYMENT_SUCCEEDED') && isCurrentStore) {
        fetchEscrowItems(true);
        showToast?.('Khách vừa thanh toán đơn hàng mới! Tiền đã nổ vào mục Tiền Ký Quỹ Đang Giữ.', 'success');
      } else if ((msg.type === 'ESCROW_RELEASED' || msg.type === 'WALLET_BALANCE_UPDATED') && isCurrentStore) {
        fetchEscrowItems(true);
        showToast?.('Tiền hàng đã hoàn tất đổi trả và giải ngân thành công!', 'info');
      }
    });

    return () => {
      clearInterval(pollTimer);
      unsubscribe();
    };
  }, [storeId, fetchEscrowItems, showToast]);

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
      `Đơn #${item.orderCode} đã hoàn tất 2 phút đổi trả! Tiền đã được giải ngân sang Số Dư Khả Dụng!`,
      'success'
    );

    fetchEscrowItems(true);
  }, [storeId, fetchEscrowItems, showToast]);

  // Comprehensive stats (Excluding cancelled orders) via Centralized Engine
  const stats = useMemo(() => {
    return calculateSellerFinancials({ escrowItems });
  }, [escrowItems]);

  // Filtering Logic
  const filteredItems = useMemo(() => {
    return escrowItems.filter((it) => {
      // Exclude CANCELLED orders
      if (it.orderStatus === 'CANCELLED' || (it as any).status === 'CANCELLED') {
        return false;
      }

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

      // 4. Date Filter (Split Presets + Specific Dates)
      if (!matchesDateFilter(it.orderCreatedAt, dateFilter)) {
        return false;
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
  }, [escrowItems, activeStatusTab, formatFilter, paymentFilter, dateFilter, searchQuery]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((it) => it.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleExecuteBulkAction = async (actionId: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      if (actionId === 'EXPORT_CSV') {
        const selected = escrowItems.filter((it) => selectedIds.includes(it.id));
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

        const rows = selected.map((it) => [
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
        showToast({ title: 'Xuất file thành công', message: `Đã xuất ${selected.length} dòng ký quỹ.` }, 'success');
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi', message: err.message || 'Thao tác thất bại' }, 'error');
    } finally {
      setBulkLoading(false);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusTab, searchQuery, formatFilter, paymentFilter, dateFilter, pageSize]);

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


  const escrowColumns: Column<SellerEscrowItem>[] = useMemo(
    () => [
      {
        key: 'orderCode',
        title: 'Mã Đơn & Thời Gian',
        width: 175,
        render: (_val, it) => (
          <div className="py-1">
            <span className="font-mono font-bold text-slate-900 block text-xs">
              #{it.orderCode || it.orderId}
            </span>
            <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
              {formatVietnamDateTime(it.orderCreatedAt)}
            </span>
          </div>
        ),
      },
      {
        key: 'product',
        title: 'Sách & Phân Loại',
        minWidth: 240,
        render: (_val, it) => {
          const isDigital = it.format === 'DIGITAL' || it.bookTitle?.toLowerCase().includes('ebook');
          return (
            <div className="flex items-center gap-2.5 py-1">
              {it.coverUrl ? (
                <img
                  src={it.coverUrl}
                  alt={it.bookTitle}
                  className="w-8 h-11 object-cover rounded bg-slate-100 shrink-0 border border-slate-200"
                />
              ) : (
                <div className="w-8 h-11 rounded bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                </div>
              )}
              <div className="min-w-0">
                <span
                  title={it.bookTitle}
                  className="font-bold text-slate-900 block break-words line-clamp-2 leading-snug text-xs hover:text-[#00875A] transition-colors"
                >
                  {it.bookTitle}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                    isDigital
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {isDigital ? 'Ebook' : 'Sách In'}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    SL: {it.quantity || 1}
                  </span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'financials',
        title: 'Doanh Thu & Thực Nhận',
        width: 200,
        render: (_val, it) => (
          <div className="py-1 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500 text-[11px]">Tiền hàng:</span>
              <span className="font-mono text-slate-800 font-semibold">{formatVND(it.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[10.5px]">
              <span className="text-slate-400">Phí sàn (5%):</span>
              <span className="font-mono text-rose-600">-{formatVND(it.platformFee)}</span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-slate-100 mt-0.5">
              <span className="text-emerald-800 font-semibold text-[11px]">Thực nhận:</span>
              <span className="font-mono text-[#00875A] font-bold text-xs">+{formatVND(it.sellerNet)}</span>
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Trạng Thái Ký Quỹ',
        width: 170,
        align: 'center',
        render: (_val, it) => <EscrowTableBadge item={it} />,
      },
      {
        key: 'actions',
        title: 'Chi Tiết',
        width: 110,
        align: 'right',
        render: (_val, it) => (
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setSelectedItem(it)}
              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#00875A] border border-emerald-200 font-bold text-xs transition-colors cursor-pointer"
            >
              Xem sao kê
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const renderExpandedEscrowDetail = (it: SellerEscrowItem) => {
    return (
      <div className="flex flex-col gap-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Dòng tiền minh bạch */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#00875A]">payments</span>
              <span>Dòng Tiền Quyết Toán</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Doanh thu tạm tính:</span>
                <span className="font-mono font-bold text-slate-900">{formatVND(it.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phí sàn dịch vụ (5%):</span>
                <span className="font-mono text-rose-600 font-medium">-{formatVND(it.platformFee)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-200/60">
                <span className="text-emerald-800 font-bold">Số dư thực nhận shop:</span>
                <span className="font-mono text-[#00875A] font-bold text-sm">+{formatVND(it.sellerNet)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Khách hàng & Vận chuyển */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-amber-600">person</span>
              <span>Khách Hàng & Nơi Nhận</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Người mua:</span>
                <span className="font-semibold text-slate-900">{it.customerName || 'Khách hàng HuKi'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Phương thức thanh toán:</span>
                <span className="font-semibold text-slate-800">
                  {it.paymentMethod === 'COD' ? 'Tiền mặt (COD)' : 'PayOS (VietQR)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Địa chỉ giao:</span>
                <p className="bg-white p-2 rounded-lg text-slate-700 text-[11.5px] border border-slate-200 break-words leading-relaxed" title={it.shippingAddress}>
                  {it.shippingAddress || 'Nhận sách điện tử / Giao tận nơi'}
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Tiến trình ký quỹ */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">hourglass_top</span>
                <span>Tiến Trình Bảo Hộ</span>
              </div>
              <p className="text-[11.5px] text-slate-600 mt-2 leading-relaxed">
                {it.escrowStatus === 'RELEASED'
                  ? 'Đã hoàn tất đối soát & giải ngân vào số dư khả dụng của gian hàng.'
                  : it.escrowStatus === 'HOLDING'
                  ? 'Đang trong thời hạn bảo chứng test đổi trả 2 phút.'
                  : it.escrowStatus === 'PENDING_PAYMENT'
                  ? 'Kiện hàng đang vận chuyển, chờ bưu tá thu tiền COD.'
                  : 'Đang tạm khóa do có khiếu nại phát sinh.'}
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedItem(it)}
                className="w-full py-2 px-3 bg-[#00875A] hover:bg-[#00704A] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
              >
                <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                <span>Mở Bảng Kê Đối Soát Toàn Diện</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

    return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Tiền Chờ Quyết Toán (Escrow)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi chi tiết các đơn hàng đang vận chuyển, chờ khách xác nhận hoặc đếm ngược hạn đổi trả trước khi giải ngân vào Số Dư Khả Dụng.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/seller/finance"
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-emerald-600">account_balance_wallet</span>
            <span>Số Dư Ví &amp; Rút Tiền</span>
          </Link>
          <Link
            href="/seller/reports"
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-slate-500">analytics</span>
            <span>Báo Cáo &amp; Sổ Cái</span>
          </Link>
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#00875A] text-white hover:bg-[#003B2B] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
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

      {/* 3. RICH FILTER & SEARCH TOOLBAR WITH SPLIT DATE FILTER AND BULK ACTIONS */}
      <DataTableFilterBar
        searchPlaceholder="Tìm mã đơn, tên sách, tên khách, SĐT..."
        searchQuery={searchQuery}
        onSearchChange={(v: string) => {
          setSearchQuery(v);
          setCurrentPage(1);
        }}
        className="bg-white dark:bg-neutral-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-2xs"
        tabs={[
          { key: 'ALL', label: 'Tất Cả', count: stats.totalCount },
          { key: 'PENDING_PAYMENT', label: 'Chờ Thu COD', count: stats.pendingCount },
          { key: 'HOLDING', label: 'Đang Ký Quỹ Đếm Ngược', count: stats.holdingCount },
          { key: 'RELEASED', label: 'Đã Giải Ngân', count: stats.releasedCount },
          { key: 'FROZEN', label: 'Đóng Băng', count: stats.frozenCount },
        ]}
        activeTab={activeStatusTab}
        onTabChange={(tab: string) => {
          setActiveStatusTab(tab);
          setCurrentPage(1);
        }}
        extraFilters={
          <div className="flex items-center gap-2">
            <select
              value={formatFilter}
              onChange={(e) => {
                setFormatFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">Tất Cả Định Dạng</option>
              <option value="PHYSICAL">Sách Giấy Vật Lý</option>
              <option value="DIGITAL">Sách Điện Tử (Ebook)</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">Mọi Phương Thức TT</option>
              <option value="COD">Tiền Mặt COD</option>
              <option value="PAYOS">PayOS / VietQR</option>
            </select>
          </div>
        }
        dateFilter={dateFilter}
        onDateFilterChange={(v: DateFilterValue) => {
          setDateFilter(v);
          setCurrentPage(1);
        }}
        bulkActionGroups={escrowBulkActionGroups}
        selectedCount={selectedIds.length}
        totalCount={filteredItems.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds([])}
        bulkLoading={bulkLoading}
        itemName="món ký quỹ"
      />

      {/* 4. MAIN ESCROW DATA TABLE CHUẨN HÓA GROUPED DATA TABLE */}
      <GroupedDataTable<SellerEscrowItem>
        columns={escrowColumns}
        data={paginatedItems}
        keyField="id"
        loading={isLoading}
        selectable={true}
        selectedRowKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys as string[])}
        expandable={true}
        expandedRowRender={renderExpandedEscrowDetail}
        emptyTitle="Không tìm thấy món hàng ký quỹ nào"
        emptyMessage={
          searchQuery
            ? `Không tìm thấy kết quả khớp với từ khóa "${searchQuery}"`
            : 'Hiện chưa có món hàng nào trong danh mục ký quỹ này.'
        }
        emptyIcon="hourglass_bottom"
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredItems.length,
          pageSize: 10,
          onPageChange: setCurrentPage,
          itemLabel: 'món hàng ký quỹ',
        }}
        className="w-full"
      />

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
                    ? 'Đã hết hạn đổi trả, tiền đã cộng vào Số Dư Khả Dụng trong Ví của Shop.'
                    : selectedItem.escrowStatus === 'HOLDING'
                    ? '⏳ Đang trong thời gian 2 phút test đổi trả. Sàn HuKi đang giữ tiền bảo chứng an toàn.'
                    : selectedItem.escrowStatus === 'PENDING_PAYMENT'
                    ? 'Đơn hàng đang được Shipper giao tận nơi, chờ thu tiền mặt COD.'
                    : 'Món hàng đang bị đóng băng do có khiếu nại đổi trả đang xử lý.'}
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
