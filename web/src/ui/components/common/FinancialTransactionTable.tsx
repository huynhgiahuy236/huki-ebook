import React, { useMemo } from 'react';
import GroupedDataTable, { Column, PaginationConfig, SortDirection } from './GroupedDataTable';

export interface FinancialTransactionItem {
  id: string;
  referenceCode?: string;
  timestamp: string | Date;
  type: string; // PAYOUT, ESCROW_RELEASE, ESCROW_FREEZE, REFUND, COMMISSION_FEE, DEPOSIT, ADJUSTMENT, etc.
  amount: number;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
  status: string; // COMPLETED, PENDING, PROCESSING, FAILED, CANCELLED, REJECTED
  actorId?: string;
  actorRole?: string;
  referenceId?: string;
  orderCode?: string;
  reason?: string;
  bankName?: string;
  bankAccountNumber?: string;
  metadata?: Record<string, any>;
}

export interface FinancialTransactionTableProps {
  data: FinancialTransactionItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  pagination?: boolean | PaginationConfig;
  sortColumn?: string | null;
  sortDirection?: SortDirection;
  onSortChange?: (sortKey: string, direction: SortDirection) => void;
  onRowClick?: (row: FinancialTransactionItem) => void;
  emptyTitle?: string;
  emptyMessage?: string;
  className?: string;
}

/**
 * Format currency in Vietnamese Dong (VND)
 */
export function formatVND(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '-';
  }
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format timestamp into standard DD/MM/YYYY HH:mm:ss
 */
export function formatDateTime(ts: string | Date | null | undefined): string {
  if (!ts) return '-';
  try {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    if (isNaN(d.getTime())) return String(ts);
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const mins = pad(d.getMinutes());
    const secs = pad(d.getSeconds());
    return `${day}/${month}/${year} ${hours}:${mins}:${secs}`;
  } catch {
    return String(ts);
  }
}

/**
 * Render transaction type badge
 */
function renderTypeBadge(type: string): React.ReactNode {
  const upper = type ? type.toUpperCase() : 'UNKNOWN';
  let label = type;
  let style = 'bg-gray-100 text-gray-700 border-gray-200';

  switch (upper) {
    case 'PAYOUT':
    case 'WITHDRAWAL':
      label = 'Rút Tiền';
      style = 'bg-rose-50 text-rose-700 border-rose-200/80';
      break;
    case 'ESCROW_RELEASE':
      label = 'Giải Phóng Escrow';
      style = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      break;
    case 'ESCROW_FREEZE':
    case 'ESCROW_HOLD':
      label = 'Tạm Giữ Escrow';
      style = 'bg-amber-50 text-amber-700 border-amber-200/80';
      break;
    case 'REFUND':
      label = 'Hoàn Tiền';
      style = 'bg-orange-50 text-orange-700 border-orange-200/80';
      break;
    case 'COMMISSION_FEE':
    case 'FEE':
      label = 'Phí Sàn';
      style = 'bg-purple-50 text-purple-700 border-purple-200/80';
      break;
    case 'DEPOSIT':
      label = 'Nạp Tiền';
      style = 'bg-sky-50 text-sky-700 border-sky-200/80';
      break;
    case 'ADJUSTMENT':
      label = 'Điều Chỉnh';
      style = 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${style}`}>
      {label}
    </span>
  );
}

/**
 * Render transaction status badge
 */
function renderStatusBadge(status: string): React.ReactNode {
  const upper = status ? status.toUpperCase() : 'UNKNOWN';
  let label = status;
  let style = 'bg-gray-100 text-gray-700 border-gray-200';
  let icon = 'help';

  switch (upper) {
    case 'COMPLETED':
    case 'SUCCESS':
      label = 'Thành Công';
      style = 'bg-emerald-100 text-emerald-800 border-emerald-200';
      icon = 'check_circle';
      break;
    case 'PENDING':
      label = 'Chờ Xử Lý';
      style = 'bg-amber-100 text-amber-800 border-amber-200';
      icon = 'schedule';
      break;
    case 'PROCESSING':
      label = 'Đang Xử Lý';
      style = 'bg-sky-100 text-sky-800 border-sky-200';
      icon = 'autorenew';
      break;
    case 'FAILED':
      label = 'Thất Bại';
      style = 'bg-rose-100 text-rose-800 border-rose-200';
      icon = 'error';
      break;
    case 'CANCELLED':
      label = 'Đã Hủy';
      style = 'bg-gray-100 text-gray-700 border-gray-200';
      icon = 'cancel';
      break;
    case 'REJECTED':
      label = 'Từ Chối';
      style = 'bg-rose-100 text-rose-800 border-rose-200';
      icon = 'block';
      break;
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${style}`}>
      <span className="material-symbols-outlined text-[12px]">{icon}</span>
      <span>{label}</span>
    </span>
  );
}

/**
 * FinancialTransactionTable Component
 * Strictly enforces separated financial columns and atomic ledger presentation.
 */
export default function FinancialTransactionTable({
  data = [],
  loading = false,
  error = null,
  onRetry,
  pagination = true,
  sortColumn,
  sortDirection,
  onSortChange,
  onRowClick,
  emptyTitle = 'Chưa có giao dịch tài chính',
  emptyMessage = 'Không tìm thấy bản ghi giao dịch hoặc biến động số dư nào.',
  className = '',
}: FinancialTransactionTableProps) {
  const columns: Column<FinancialTransactionItem>[] = useMemo(
    () => [
      {
        key: 'id',
        title: 'Mã Giao Dịch',
        width: 150,
        sortable: true,
        render: (_val, row) => (
          <div className="font-mono font-semibold text-theme-text text-[11px] truncate max-w-[140px]" title={row.referenceCode || row.id}>
            {row.referenceCode || row.id}
          </div>
        ),
      },
      {
        key: 'timestamp',
        title: 'Thời Gian',
        width: 150,
        sortable: true,
        render: (val) => (
          <span className="text-[11px] text-theme-text-muted whitespace-nowrap">
            {formatDateTime(val)}
          </span>
        ),
      },
      {
        key: 'type',
        title: 'Loại Giao Dịch',
        width: 140,
        render: (val) => renderTypeBadge(val),
      },
      {
        key: 'amount',
        title: 'Số Tiền (VND)',
        align: 'right',
        width: 140,
        sortable: true,
        render: (val) => {
          const isPositive = typeof val === 'number' && val > 0;
          const isNegative = typeof val === 'number' && val < 0;
          return (
            <span
              className={`font-mono font-bold text-xs whitespace-nowrap ${
                isPositive ? 'text-emerald-700' : isNegative ? 'text-rose-700' : 'text-theme-text'
              }`}
            >
              {isPositive ? `+${formatVND(val)}` : formatVND(val)}
            </span>
          );
        },
      },
      {
        key: 'balanceBefore',
        title: 'Số Dư Trước',
        align: 'right',
        width: 130,
        render: (val) => (
          <span className="font-mono text-[11px] text-theme-text-muted whitespace-nowrap">
            {val !== undefined && val !== null ? formatVND(val) : '-'}
          </span>
        ),
      },
      {
        key: 'balanceAfter',
        title: 'Số Dư Sau',
        align: 'right',
        width: 130,
        render: (val) => (
          <span className="font-mono text-[11px] font-semibold text-theme-text whitespace-nowrap">
            {val !== undefined && val !== null ? formatVND(val) : '-'}
          </span>
        ),
      },
      {
        key: 'status',
        title: 'Trạng Thái',
        width: 130,
        align: 'center',
        render: (val) => renderStatusBadge(val),
      },
      {
        key: 'actorId',
        title: 'Người Thực Hiện',
        width: 140,
        render: (_val, row) => (
          <div className="text-[11px] truncate max-w-[130px]" title={row.actorId || '-'}>
            <span className="font-mono text-theme-text block truncate">{row.actorId || '-'}</span>
            {row.actorRole && (
              <span className="text-[10px] text-theme-text-muted block font-medium">
                {row.actorRole}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'referenceId',
        title: 'Mã Tham Chiếu / Đơn',
        width: 140,
        render: (_val, row) => {
          const ref = row.referenceId || row.orderCode;
          return (
            <span className="font-mono text-[11px] text-theme-text-muted truncate block max-w-[130px]" title={ref || '-'}>
              {ref || '-'}
            </span>
          );
        },
      },
      {
        key: 'reason',
        title: 'Lý Do / Ghi Chú',
        minWidth: 160,
        render: (val) => (
          <span className="text-[11px] text-theme-text-muted line-clamp-2" title={val || '-'}>
            {val || '-'}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <GroupedDataTable<FinancialTransactionItem>
      columns={columns}
      data={data}
      keyField="id"
      loading={loading}
      error={error}
      onRetry={onRetry}
      pagination={pagination}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSortChange={onSortChange}
      onRowClick={onRowClick}
      emptyTitle={emptyTitle}
      emptyMessage={emptyMessage}
      emptyIcon="account_balance_wallet"
      className={className}
    />
  );
}
