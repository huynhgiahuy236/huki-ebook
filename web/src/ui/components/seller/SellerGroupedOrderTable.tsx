"use client";

import React, { useState, useMemo } from 'react';
import GroupedDataTable, { type Column } from '../common/GroupedDataTable';
import EscrowTableBadge from './EscrowTableBadge';
import type { SellerEscrowItem } from '@/ui/api/walletApi';
import { formatVND } from '@/ui/utils/sellerFinanceEngine';
import { useToast } from '@/ui/context/ToastContext';

export interface SellerGroupedOrderTableProps {
  items: SellerEscrowItem[];
  loading?: boolean;
  onAutoReleaseItem?: (item: SellerEscrowItem) => void;
  title?: string;
  subtitle?: string;
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

export function SellerGroupedOrderTable({
  items,
  loading = false,
  onAutoReleaseItem,
  title = 'Bảng Kê Chi Tiết Đơn Hàng & Dòng Tiền Gian Hàng',
  subtitle = 'Dữ liệu đối soát sao kê tài chính chuẩn Shopee / HuKi Finance Hub',
}: SellerGroupedOrderTableProps) {
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'RELEASED' | 'HOLDING' | 'PENDING_PAYMENT'>('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'COD' | 'PAYOS'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([]);

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      // Escrow status filter
      if (statusFilter !== 'ALL' && it.escrowStatus !== statusFilter) return false;

      // Payment filter
      if (paymentFilter === 'COD' && it.paymentMethod !== 'COD') return false;
      if (paymentFilter === 'PAYOS' && it.paymentMethod === 'COD') return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchCode = it.orderCode?.toLowerCase().includes(query);
        const matchTitle = it.bookTitle?.toLowerCase().includes(query);
        const matchCustomer = it.customerName?.toLowerCase().includes(query);
        const matchPhone = it.customerPhone?.includes(query);
        if (!matchCode && !matchTitle && !matchCustomer && !matchPhone) return false;
      }

      return true;
    });
  }, [items, statusFilter, paymentFilter, searchTerm]);

  // Grand Totals for Summary Row
  const grandTotals = useMemo(() => {
    return filteredItems.reduce(
      (acc, it) => {
        acc.subtotal += it.subtotal || 0;
        acc.platformFee += it.platformFee || 0;
        acc.sellerNet += it.sellerNet || 0;
        acc.quantity += it.quantity || 1;
        return acc;
      },
      { subtotal: 0, platformFee: 0, sellerNet: 0, quantity: 0 }
    );
  }, [filteredItems]);

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Mã Đơn Hàng',
      'Thời Gian Đặt',
      'Phương Thức',
      'Tựa Sách',
      'Số Lượng',
      'Đơn Giá (VND)',
      'Tổng Tiền Hàng 100% (VND)',
      'Phí Sàn 5% (VND)',
      'Thực Nhận 95% (VND)',
      'Khách Hàng',
      'SĐT',
      'Địa Chỉ Nhận',
      'Trạng Thái Ký Quỹ',
    ];

    const rows = filteredItems.map((it) => [
      `"${it.orderCode}"`,
      `"${formatVietnamDateTime(it.orderCreatedAt)}"`,
      it.paymentMethod === 'COD' ? 'Tiền Mặt COD' : 'VietQR / PayOS',
      `"${(it.bookTitle || '').replace(/"/g, '""')}"`,
      it.quantity || 1,
      it.unitPrice || 0,
      it.subtotal || 0,
      it.platformFee || 0,
      it.sellerNet || 0,
      `"${(it.customerName || '').replace(/"/g, '""')}"`,
      `"${it.customerPhone || ''}"`,
      `"${(it.shippingAddress || '').replace(/"/g, '""')}"`,
      it.escrowStatus === 'RELEASED'
        ? 'ĐÃ CỘNG VÍ'
        : it.escrowStatus === 'HOLDING'
        ? 'ĐANG GIỮ HỘ'
        : 'CHỜ THANH TOÁN',
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HuKi_SaoKe_DonHang_Seller_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất file sao kê đơn hàng CSV!', 'success');
  };

  // GroupedDataTable Columns
  const columns: Column<SellerEscrowItem>[] = useMemo(
    () => [
      {
        key: 'orderCode',
        title: 'Mã Đơn & Thời Gian',
        minWidth: 170,
        render: (_val, it) => {
          const isCOD = it.paymentMethod === 'COD';
          return (
            <div className="py-1">
              <span className="font-mono font-bold text-slate-900 dark:text-white block text-xs">
                #{it.orderCode}
              </span>
              <span className="text-[10.5px] text-slate-400 font-mono block mt-0.5">
                {formatVietnamDateTime(it.orderCreatedAt)}
              </span>
              <span
                className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  isCOD
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                }`}
              >
                {isCOD ? '💵 Tiền mặt COD' : '💳 PayOS VietQR'}
              </span>
            </div>
          );
        },
      },
      {
        key: 'book',
        title: 'Sách & Ảnh Bìa',
        minWidth: 220,
        render: (_val, it) => (
          <div className="flex items-center gap-2.5 py-1">
            <div className="w-8 h-11 bg-slate-100 dark:bg-slate-700 rounded overflow-hidden shadow-2xs shrink-0 border border-slate-200">
              {it.coverUrl ? (
                <img
                  src={it.coverUrl}
                  alt={it.bookTitle}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-sm">book</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <span
                className="font-bold text-slate-900 dark:text-white truncate block text-xs"
                title={it.bookTitle}
              >
                {it.bookTitle}
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                SL: <strong className="text-slate-700 dark:text-slate-300">{it.quantity}</strong> &bull;{' '}
                {formatVND(it.unitPrice)}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'customer',
        title: 'Khách Hàng & Nơi Nhận',
        minWidth: 160,
        render: (_val, it) => (
          <div className="py-1 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
              {it.customerName || 'Khách hàng'}
            </span>
            <span className="font-mono text-slate-400 block text-[11px]">
              {it.customerPhone || '—'}
            </span>
            <span
              className="text-slate-400 truncate block text-[10.5px] mt-0.5 max-w-[150px]"
              title={it.shippingAddress}
            >
              {it.shippingAddress || 'Giao tận nơi'}
            </span>
          </div>
        ),
      },
      {
        key: 'subtotal',
        title: 'Tổng Tiền (100%)',
        width: 140,
        align: 'right',
        render: (_val, it) => (
          <div className="text-right">
            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
              {formatVND(it.subtotal)}
            </span>
            <span className="text-[10px] text-slate-400 block">Doanh thu gộp</span>
          </div>
        ),
      },
      {
        key: 'platformFee',
        title: 'Phí Sàn (5%)',
        width: 130,
        align: 'right',
        render: (_val, it) => (
          <div className="text-right">
            <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-xs">
              -{formatVND(it.platformFee)}
            </span>
            <span className="text-[10px] text-amber-600/70 block">Phí nền tảng</span>
          </div>
        ),
      },
      {
        key: 'sellerNet',
        title: 'Thực Nhận (95%)',
        width: 150,
        align: 'right',
        render: (_val, it) => (
          <div className="text-right">
            <span className="font-mono font-black text-[#00875A] text-sm">
              +{formatVND(it.sellerNet)}
            </span>
            <span className="text-[10px] text-emerald-600/70 block">Vào ví gian hàng</span>
          </div>
        ),
      },
      {
        key: 'escrowStatus',
        title: 'Trạng Thái Dòng Tiền',
        width: 160,
        align: 'center',
        render: (_val, it) => (
          <div className="flex justify-center">
            <EscrowTableBadge item={it} onAutoRelease={onAutoReleaseItem} />
          </div>
        ),
      },
    ],
    [onAutoReleaseItem]
  );

  // Expanded Row: Order details & remittance transparency
  const renderExpandedOrder = (it: SellerEscrowItem) => {
    return (
      <div className="p-4 bg-gray-50/80 rounded-xl m-2 border border-gray-200/80 shadow-2xs text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-3 border-b border-gray-200/60">
          <div>
            <span className="text-gray-400 block text-[11px]">Thông Tin Giao Hàng &amp; Vận Đơn:</span>
            <p className="font-bold text-gray-800 mt-0.5">
              Địa chỉ: {it.shippingAddress || 'Địa chỉ tiêu chuẩn'}
            </p>
            {it.deliveredAt && (
              <p className="text-emerald-700 font-medium text-[11px] mt-0.5">
                ✓ Đã giao lúc: {formatVietnamDateTime(it.deliveredAt)}
              </p>
            )}
          </div>

          <div>
            <span className="text-gray-400 block text-[11px]">Quy Trình Giải Ngân Ký Quỹ:</span>
            <p className="font-medium text-gray-700 mt-0.5">
              {it.escrowStatus === 'RELEASED'
                ? 'Tiền đã giải ngân thành công vào số dư khả dụng của ví shop.'
                : 'Tiền đang được bảo vệ trong tài khoản ký quỹ. Hết 7 ngày đổi trả sẽ tự động chuyển vào ví khả dụng.'}
            </p>
          </div>

          <div>
            <span className="text-gray-400 block text-[11px]">Công Thức Quyết Toán Minh Bạch:</span>
            <div className="font-mono text-[11px] text-gray-800 mt-0.5 space-y-0.5">
              <div className="flex justify-between">
                <span>Tiền hàng khách trả:</span>
                <span className="font-bold">{formatVND(it.subtotal)}</span>
              </div>
              <div className="flex justify-between text-amber-700">
                <span>Khấu trừ phí sàn (5%):</span>
                <span>-{formatVND(it.platformFee)}</span>
              </div>
              <div className="flex justify-between text-[#00875A] font-bold border-t border-gray-200 pt-0.5">
                <span>Thực nhận vào ví:</span>
                <span>+{formatVND(it.sellerNet)}</span>
              </div>
            </div>
          </div>
        </div>

        {it.remittanceInfo && (
          <div className="pt-2 text-[11px] text-gray-500 flex items-center justify-between">
            <span>
              Đối soát COD bưu tá: <strong>{it.remittanceInfo.shipperName}</strong> (Mã nộp: {it.remittanceInfo.txCode})
            </span>
            <span className="text-emerald-700 font-bold">✓ Bưu tá đã nộp tiền</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. FILTER TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 mr-1">Dòng tiền:</span>
          {[
            { id: 'ALL', label: 'Tất Cả' },
            { id: 'RELEASED', label: 'Đã Cộng Ví' },
            { id: 'HOLDING', label: 'Đang Giữ Hộ (7 Ngày)' },
            { id: 'PENDING_PAYMENT', label: 'Chờ Thanh Toán' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setStatusFilter(f.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === f.id
                  ? 'bg-[#00875A] text-white shadow-2xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}

          {/* Payment Method Filter */}
          <span className="text-xs font-bold text-gray-500 ml-2 mr-1">Thanh toán:</span>
          {[
            { id: 'ALL', label: 'Tất Cả' },
            { id: 'COD', label: '💵 COD' },
            { id: 'PAYOS', label: '💳 PayOS' },
          ].map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPaymentFilter(p.id as any);
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                paymentFilter === p.id
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Search & CSV Button */}
        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm mã đơn, sách, khách..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#00875A]/20 focus:border-[#00875A] transition-all"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 shadow-2xs transition-all cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[17px] text-[#00875A]">download</span>
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* 2. GROUPED DATA TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px] text-[#00875A]">receipt_long</span>
              <span>{title}</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <div className="text-xs font-medium text-gray-500">
            Tổng số đơn: <strong className="text-gray-900 font-bold">{filteredItems.length}</strong>
          </div>
        </div>

        <GroupedDataTable<SellerEscrowItem>
          columns={columns}
          data={filteredItems.slice((currentPage - 1) * 10, currentPage * 10)}
          keyField="id"
          loading={loading}
          expandable
          expandedRowKeys={expandedKeys}
          onExpandedRowsChange={setExpandedKeys}
          expandedRowRender={renderExpandedOrder}
          emptyTitle="Chưa có món hàng nào phát sinh"
          emptyMessage="Các đơn sách sau khi khách đặt sẽ xuất hiện và đối soát đầy đủ tại đây."
          summaryRow={
            <tr className="bg-gray-100/90 font-black text-xs text-gray-900 border-t-2 border-gray-300">
              <td className="py-3 px-3 text-center">Σ</td>
              <td className="py-3 px-3" colSpan={2}>
                <span className="font-bold uppercase tracking-wider text-gray-800">
                  Tổng Cộng ({filteredItems.length} Đơn Hàng)
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono">
                {formatVND(grandTotals.subtotal)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-amber-700">
                -{formatVND(grandTotals.platformFee)}
              </td>
              <td className="py-3 px-3 text-right font-mono text-[#00875A] text-sm">
                +{formatVND(grandTotals.sellerNet)}
              </td>
              <td className="py-3 px-3 text-center text-gray-500 font-medium">Toàn Bộ Dòng Tiền</td>
            </tr>
          }
          pagination={{
            currentPage,
            totalItems: filteredItems.length,
            pageSize: 10,
            onPageChange: setCurrentPage,
            itemLabel: 'đơn hàng',
          }}
        />
      </div>
    </div>
  );
}
