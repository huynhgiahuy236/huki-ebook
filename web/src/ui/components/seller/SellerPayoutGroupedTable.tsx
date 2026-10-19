"use client";

import React, { useState, useMemo } from 'react';
import GroupedDataTable, { type Column } from '../common/GroupedDataTable';
import type { PayoutRequestItem } from '@/ui/api/walletApi';
import { formatVND } from '@/ui/utils/sellerFinanceEngine';
import { useToast } from '@/ui/context/ToastContext';

export interface SellerPayoutGroupedTableProps {
  items: PayoutRequestItem[];
  loading?: boolean;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  defaultBankName?: string;
  defaultAccountNumber?: string;
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

export function SellerPayoutGroupedTable({
  items,
  loading = false,
  totalItems = 0,
  currentPage = 1,
  onPageChange,
  defaultBankName = 'Vietcombank',
  defaultAccountNumber = '—',
}: SellerPayoutGroupedTableProps) {
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedKeys, setExpandedKeys] = useState<(string | number)[]>([]);

  // Filter Items
  const filteredItems = useMemo(() => {
    return items.filter((req) => {
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'COMPLETED' && req.status !== 'COMPLETED' && (req.status as any) !== 'DISBURSED') return false;
        if (statusFilter !== 'COMPLETED' && req.status !== statusFilter) return false;
      }

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchId = req.id?.toLowerCase().includes(query);
        const matchBank = req.bankSnapshot?.bankName?.toLowerCase().includes(query);
        const matchAcc = req.bankSnapshot?.accountNumber?.includes(query);
        if (!matchId && !matchBank && !matchAcc) return false;
      }

      return true;
    });
  }, [items, statusFilter, searchTerm]);

  // Grand Total
  const grandTotal = useMemo(() => {
    return filteredItems.reduce((acc, req) => acc + (Number(req.amount) || 0), 0);
  }, [filteredItems]);

  const handleExportCsv = () => {
    const headers = [
      'Mã Lệnh Rút',
      'Thời Gian Tạo',
      'Số Tiền (VND)',
      'Ngân Hàng Nhận',
      'Số Tài Khoản',
      'Chủ Tài Khoản',
      'Trạng Thái',
      'Thời Gian Giải Ngân',
    ];

    const rows = filteredItems.map((req) => [
      `"#${req.id}"`,
      `"${formatVietnamDateTime(req.requestedAt || req.createdAt)}"`,
      req.amount,
      `"${req.bankSnapshot?.bankName || defaultBankName}"`,
      `"${req.bankSnapshot?.accountNumber || defaultAccountNumber}"`,
      `"${req.bankSnapshot?.accountHolder || ''}"`,
      req.status,
      `"${formatVietnamDateTime(req.disbursedAt || req.reviewedAt)}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `HuKi_LichSu_RutTien_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã xuất lịch sử rút tiền CSV!', 'success');
  };

  const columns: Column<PayoutRequestItem>[] = useMemo(
    () => [
      {
        key: 'id',
        title: 'Mã Lệnh Rút',
        width: 140,
        render: (_val, req) => (
          <div className="py-1">
            <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block">
              #{req.id.slice(0, 10)}
            </span>
            <span className="text-[10px] text-slate-400 font-mono block">
              {req.id.length > 10 ? `...${req.id.slice(-6)}` : ''}
            </span>
          </div>
        ),
      },
      {
        key: 'requestedAt',
        title: 'Thời Gian Tạo Lệnh',
        width: 160,
        render: (_val, req) => (
          <span className="text-slate-600 dark:text-slate-300 font-mono text-xs">
            {formatVietnamDateTime(req.requestedAt || req.createdAt)}
          </span>
        ),
      },
      {
        key: 'amount',
        title: 'Số Tiền Rút',
        width: 150,
        align: 'right',
        render: (_val, req) => (
          <div className="text-right">
            <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
              {formatVND(req.amount)}
            </span>
            <span className="text-[10px] text-slate-400 block">Miễn phí rút tiền</span>
          </div>
        ),
      },
      {
        key: 'bank',
        title: 'Ngân Hàng & STK Nhận',
        minWidth: 200,
        render: (_val, req) => (
          <div className="py-1 text-xs">
            <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
              {req.bankSnapshot?.bankName || defaultBankName}
            </span>
            <span className="font-mono text-slate-500 block text-[11px] mt-0.5">
              STK: {req.bankSnapshot?.accountNumber || defaultAccountNumber}
            </span>
            {req.bankSnapshot?.accountHolder && (
              <span className="text-[10px] text-slate-400 uppercase font-medium block">
                {req.bankSnapshot.accountHolder}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        title: 'Trạng Thái Duyệt',
        width: 170,
        align: 'center',
        render: (_val, req) => {
          const status = req.status;
          let badge: { label: string; bg: string } = { label: status, bg: 'bg-slate-100 text-slate-700 border-slate-200' };
          if (status === 'PENDING') {
            badge = { label: 'Chờ kế toán duyệt', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
          } else if (status === 'APPROVED') {
            badge = { label: 'Đã phê duyệt', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
          } else if (status === 'PROCESSING') {
            badge = { label: 'Đang chuyển khoản', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
          } else if (status === 'COMPLETED' || (status as any) === 'DISBURSED') {
            badge = { label: 'Giải ngân thành công', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
          } else if (status === 'REJECTED') {
            badge = { label: 'Bị từ chối', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
          }

          return (
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
              {badge.label}
            </span>
          );
        },
      },
      {
        key: 'disbursedAt',
        title: 'Thời Gian Giải Ngân',
        width: 160,
        render: (_val, req) => (
          <span className="text-slate-500 font-mono text-xs">
            {req.disbursedAt || req.reviewedAt ? formatVietnamDateTime(req.disbursedAt || req.reviewedAt) : 'Đang xử lý'}
          </span>
        ),
      },
    ],
    [defaultBankName, defaultAccountNumber]
  );

  const renderExpandedPayout = (req: PayoutRequestItem) => (
    <div className="p-4 bg-gray-50/80 rounded-xl m-2 border border-gray-200 text-xs text-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <span className="text-gray-400 block text-[11px]">Thông Tin Giao Dịch:</span>
          <p className="font-mono font-bold text-gray-900 mt-0.5">ID: {req.id}</p>
          <p className="text-gray-500 text-[11px] mt-0.5">Ví nguồn: {req.walletId || 'Ví chính thức'}</p>
        </div>
        <div>
          <span className="text-gray-400 block text-[11px]">Chi Nhánh &amp; Đối Soát Ngân Hàng:</span>
          <p className="font-bold text-gray-900 mt-0.5">{req.bankSnapshot?.branch || (req.bankSnapshot as any)?.bankBranch || 'Hội sở chính'}</p>
          <p className="text-emerald-700 font-medium text-[11px] mt-0.5">✓ Chuyển khoản NAPAS 24/7</p>
        </div>
        <div>
          <span className="text-gray-400 block text-[11px]">Ghi Chú Quyết Toán:</span>
          <p className="font-medium text-gray-800 mt-0.5">
            {req.status === 'COMPLETED'
              ? 'Tiền đã về tài khoản ngân hàng của shop trong vòng 5 phút.'
              : 'Yêu cầu rút tiền được bộ phận kế toán sàn xử lý trong giờ hành chính.'}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-500 mr-1">Trạng thái:</span>
          {[
            { id: 'ALL', label: 'Tất Cả Lệnh' },
            { id: 'PENDING', label: 'Chờ Duyệt' },
            { id: 'COMPLETED', label: 'Đã Giải Ngân' },
            { id: 'REJECTED', label: 'Bị Từ Chối' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === s.id
                  ? 'bg-[#00875A] text-white shadow-2xs'
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm mã lệnh, ngân hàng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
        <GroupedDataTable<PayoutRequestItem>
          columns={columns}
          data={filteredItems}
          keyField="id"
          loading={loading}
          expandable
          expandedRowKeys={expandedKeys}
          onExpandedRowsChange={setExpandedKeys}
          expandedRowRender={renderExpandedPayout}
          emptyTitle="Chưa có lệnh rút tiền nào"
          emptyMessage="Các lệnh rút tiền về tài khoản ngân hàng sẽ được lưu vết đầy đủ tại đây."
          summaryRow={
            <tr className="bg-gray-100/90 font-black text-xs text-gray-900 border-t-2 border-gray-300">
              <td className="py-3 px-3 text-center">Σ</td>
              <td className="py-3 px-3">
                <span className="font-bold uppercase tracking-wider text-gray-800">
                  Tổng Rút ({filteredItems.length} Lệnh)
                </span>
              </td>
              <td className="py-3 px-3 text-right font-mono text-emerald-700 text-sm">
                {formatVND(grandTotal)}
              </td>
              <td className="py-3 px-3" colSpan={3}>
                <span className="text-xs text-gray-500 font-medium">Đối soát tài khoản ngân hàng gian hàng</span>
              </td>
            </tr>
          }
          pagination={
            onPageChange
              ? {
                  currentPage,
                  totalItems: totalItems || filteredItems.length,
                  pageSize: 10,
                  onPageChange,
                  itemLabel: 'lệnh rút',
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
