"use client";

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/ui/context/AuthContext';

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName?: string;
  actorEmail?: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  storeId?: string;
  timestamp: string | Date;
  ipAddress?: string;
  requestId?: string;
  changedFields?: string[];
  stateBefore?: Record<string, any> | null;
  stateAfter?: Record<string, any> | null;
  description?: string;
  metadata?: Record<string, any>;
}

export interface AuditHistoryTimelineProps {
  items: AuditLogItem[];
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyMessage?: string;
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Action badge configuration for consistent governance styling
 */
function getActionBadgeStyle(action: string): { label: string; className: string; icon: string } {
  const upperAction = (action || '').toUpperCase();

  switch (upperAction) {
    case 'APPROVE':
    case 'CONFIRM':
    case 'UNBLOCK':
    case 'UNSUSPEND':
    case 'ACTIVATE':
      return {
        label: action === 'APPROVE' ? 'Phê Duyệt' : action === 'CONFIRM' ? 'Xác Nhận' : action === 'UNBLOCK' ? 'Mở Khóa' : 'Kích Hoạt',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200/80',
        icon: 'check_circle',
      };
    case 'REJECT':
    case 'BLOCK':
    case 'CANCEL':
    case 'DELETE':
      return {
        label: action === 'REJECT' ? 'Từ Chối' : action === 'BLOCK' ? 'Khóa' : action === 'CANCEL' ? 'Hủy Bỏ' : 'Xóa',
        className: 'bg-rose-100 text-rose-800 border-rose-200/80',
        icon: 'cancel',
      };
    case 'SUSPEND':
    case 'FREEZE':
    case 'ARBITRATE':
      return {
        label: action === 'SUSPEND' ? 'Tạm Ngưng' : action === 'FREEZE' ? 'Đóng Băng' : 'Phán Quyết Trọng Tài',
        className: 'bg-amber-100 text-amber-800 border-amber-200/80',
        icon: 'gavel',
      };
    case 'PAYOUT_REVIEW':
    case 'PAYOUT_REQUEST':
    case 'REFUND':
    case 'ESCROW_RELEASE':
      return {
        label: action === 'PAYOUT_REVIEW' ? 'Duyệt Rút Tiền' : action === 'PAYOUT_REQUEST' ? 'Yêu Cầu Rút' : action === 'REFUND' ? 'Hoàn Tiền' : 'Giải Phóng Escrow',
        className: 'bg-sky-100 text-sky-800 border-sky-200/80',
        icon: 'payments',
      };
    case 'SHIP':
    case 'DELIVERY':
      return {
        label: 'Giao Cho ĐVVC',
        className: 'bg-indigo-100 text-indigo-800 border-indigo-200/80',
        icon: 'local_shipping',
      };
    case 'ROLE_CHANGE':
    case 'PERMISSION_CHANGE':
    case 'PIN_CHANGE':
      return {
        label: action === 'ROLE_CHANGE' ? 'Đổi Vai Trò' : action === 'PERMISSION_CHANGE' ? 'Đổi Quyền Hạn' : 'Đổi Mật Khẩu / PIN',
        className: 'bg-purple-100 text-purple-800 border-purple-200/80',
        icon: 'manage_accounts',
      };
    case 'ADJUST_INVENTORY':
      return {
        label: 'Điều Chỉnh Kho',
        className: 'bg-teal-100 text-teal-800 border-teal-200/80',
        icon: 'inventory',
      };
    case 'CREATE':
      return {
        label: 'Tạo Mới',
        className: 'bg-blue-100 text-blue-800 border-blue-200/80',
        icon: 'add_circle',
      };
    case 'UPDATE':
    default:
      return {
        label: action || 'Cập Nhật',
        className: 'bg-gray-100 text-gray-800 border-gray-200/80',
        icon: 'history',
      };
  }
}

/**
 * Format timestamp into standard DD/MM/YYYY HH:mm:ss
 */
function formatAuditTime(ts: string | Date): string {
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
 * Render sanitized value cleanly in diff
 */
function renderDiffValue(val: any): React.ReactNode {
  if (val === null || val === undefined) {
    return <span className="text-theme-text-muted/60 italic font-mono text-[11px]">(trống)</span>;
  }
  if (typeof val === 'boolean') {
    return (
      <span className={`font-mono font-bold text-[11px] ${val ? 'text-emerald-700' : 'text-rose-700'}`}>
        {val ? 'true' : 'false'}
      </span>
    );
  }
  if (typeof val === 'object') {
    return (
      <pre className="text-[10.5px] font-mono bg-theme-surface-subtle/70 p-1.5 rounded border border-theme-border/60 max-h-32 overflow-y-auto whitespace-pre-wrap">
        {JSON.stringify(val, null, 2)}
      </pre>
    );
  }
  return <span className="font-mono text-[11.5px] text-theme-text">{String(val)}</span>;
}

/**
 * Resolve actor identity with user context or fallback
 */
export function resolveActorInfo(item: AuditLogItem, currentUser?: any): {
  displayName: string;
  displayEmail?: string;
  displayRole: string;
  isSelf: boolean;
  avatarChar: string;
} {
  const isMatchCurrent = Boolean(
    currentUser &&
    (item.actorId === currentUser.id ||
      item.actorId === 'admin' ||
      item.actorEmail === currentUser.email)
  );

  let name = item.actorName || item.metadata?.actorName || item.metadata?.authorName;
  let email = item.actorEmail || item.metadata?.actorEmail;

  if (!name && isMatchCurrent) {
    name = currentUser.fullName || currentUser.name || 'Chủ doanh nghiệp';
    email = currentUser.email || email;
  }

  if (!name) {
    if (item.actorRole === 'OWNER') {
      name = 'Chủ doanh nghiệp / Quản trị viên';
    } else if (item.actorRole === 'STAFF' || item.actorRole === 'ORDER_STAFF') {
      name = 'Nhân sự vận hành';
    } else {
      name = `Quản trị viên (#${item.actorId ? item.actorId.slice(0, 8) : 'sys'})`;
    }
  }

  const roleLabels: Record<string, string> = {
    OWNER: 'Chủ sở hữu',
    ADMIN: 'Quản trị viên',
    ORDER_STAFF: 'Nhân viên đơn hàng',
    STAFF: 'Nhân sự vận hành',
    WAREHOUSE_STAFF: 'Nhân viên kho',
    CS_STAFF: 'Nhân viên CSKH',
  };

  const roleText = roleLabels[item.actorRole] || item.actorRole || 'OWNER';
  const char = (name ? name.trim().charAt(0) : 'Q').toUpperCase();

  return {
    displayName: name,
    displayEmail: email,
    displayRole: roleText,
    isSelf: isMatchCurrent,
    avatarChar: char,
  };
}

/**
 * Shared AuditHistoryTimeline Component for Governance Traceability
 */
export default function AuditHistoryTimeline({
  items = [],
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Chưa có lịch sử thao tác',
  emptyMessage = 'Hiện chưa ghi nhận hành động quản trị nào trên tài nguyên này.',
  title = 'Nhật Ký Quản Trị & Audit Log',
  description = 'Theo dõi chi tiết các thao tác thay đổi, người thực hiện, trước/sau và mã định danh đối soát.',
  className = '',
}: AuditHistoryTimelineProps) {
  // Try retrieving current authenticated user for actor resolution
  let currentUser: any = null;
  try {
    const auth = useAuth();
    currentUser = auth?.user;
  } catch {
    // If rendered outside AuthContext
  }

  // Filter States
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Track open state of diffs per audit item
  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});

  const toggleDiff = (id: string) => {
    setExpandedDiffs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Extract distinct actions with their frequency
  const actionOptions = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((it) => {
      if (it.action) {
        map.set(it.action, (map.get(it.action) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([act, count]) => {
      const badge = getActionBadgeStyle(act);
      return {
        action: act,
        count,
        label: badge.label,
        icon: badge.icon,
      };
    });
  }, [items]);

  // Compute filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Action filter
      if (selectedAction !== 'ALL' && item.action !== selectedAction) {
        return false;
      }

      // 2. Date filter
      if (dateFilter !== 'ALL') {
        const itemDate = new Date(item.timestamp);
        const now = new Date();

        if (isNaN(itemDate.getTime())) {
          return true;
        }

        if (dateFilter === 'TODAY') {
          const isToday =
            itemDate.getDate() === now.getDate() &&
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === '7DAYS') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7 || diffDays < 0) return false;
        } else if (dateFilter === '30DAYS') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30 || diffDays < 0) return false;
        } else if (dateFilter === 'CUSTOM') {
          if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (itemDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (itemDate > end) return false;
          }
        }
      }

      // 3. Search query
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase().trim();
        const actor = resolveActorInfo(item, currentUser);

        const matchActorName = actor.displayName.toLowerCase().includes(q);
        const matchActorEmail = (actor.displayEmail || '').toLowerCase().includes(q);
        const matchActorId = (item.actorId || '').toLowerCase().includes(q);
        const matchResourceId = (item.resourceId || '').toLowerCase().includes(q);
        const matchStaffName = (item.metadata?.staffName || '').toLowerCase().includes(q);
        const matchStaffEmail = (item.metadata?.staffEmail || '').toLowerCase().includes(q);
        const matchDescription = (item.description || '').toLowerCase().includes(q);
        const matchAction = (item.action || '').toLowerCase().includes(q);
        const matchStoreId = (item.storeId || '').toLowerCase().includes(q);

        if (
          !matchActorName &&
          !matchActorEmail &&
          !matchActorId &&
          !matchResourceId &&
          !matchStaffName &&
          !matchStaffEmail &&
          !matchDescription &&
          !matchAction &&
          !matchStoreId
        ) {
          return false;
        }
      }

      return true;
    });
  }, [items, selectedAction, dateFilter, startDate, endDate, searchKeyword, currentUser]);

  const hasActiveFilters =
    selectedAction !== 'ALL' ||
    dateFilter !== 'ALL' ||
    Boolean(searchKeyword.trim()) ||
    Boolean(startDate) ||
    Boolean(endDate);

  const resetFilters = () => {
    setSelectedAction('ALL');
    setDateFilter('ALL');
    setStartDate('');
    setEndDate('');
    setSearchKeyword('');
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className={`w-full bg-theme-surface rounded-xl border border-theme-border shadow-2xs overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3.5 sm:px-5 border-b border-theme-border bg-theme-surface-subtle/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="font-editorial text-sm sm:text-base font-bold text-theme-text flex items-center gap-2">
            <span className="material-symbols-outlined text-theme-secondary text-[18px]">verified_user</span>
            <span>{title}</span>
          </h3>
          {description && (
            <p className="text-[11.5px] text-theme-text-muted mt-0.5">{description}</p>
          )}
        </div>
        <div className="text-[11px] text-theme-text-muted font-medium flex items-center gap-2">
          <span>Tổng cộng: <strong className="text-theme-text font-bold">{items.length}</strong> bản ghi</span>
          {hasActiveFilters && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Đang lọc: {filteredItems.length}
            </span>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      {items.length > 0 && (
        <div className="p-3.5 sm:p-4 bg-slate-50/80 border-b border-theme-border space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-slate-400">
                search
              </span>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm kiếm theo người thực hiện, nhân sự, tác vụ, ID..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => setSearchKeyword('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">close</span>
                </button>
              )}
            </div>

            {/* Action Dropdown Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Tác vụ:</span>
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value)}
                className="px-2.5 py-2 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer shadow-2xs"
              >
                <option value="ALL">Tất cả tác vụ ({items.length})</option>
                {actionOptions.map((opt) => (
                  <option key={opt.action} value={opt.action}>
                    {opt.label} ({opt.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Quick Filter Pills */}
            <div className="flex items-center gap-1 shrink-0 overflow-x-auto pb-1 lg:pb-0">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mr-1">Thời gian:</span>
              {(
                [
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'TODAY', label: 'Hôm nay' },
                  { id: '7DAYS', label: '7 ngày qua' },
                  { id: '30DAYS', label: '30 ngày' },
                  { id: 'CUSTOM', label: 'Tùy chọn' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setDateFilter(p.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                    dateFilter === p.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range Picker (shown when CUSTOM is selected) */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-slate-600">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <span className="text-[11px] font-bold text-slate-600">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          )}

          {/* Active Filter Indicators & Reset Action */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/60 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500">Đang lọc theo:</span>
                {selectedAction !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[11px] font-semibold">
                    Tác vụ: {getActionBadgeStyle(selectedAction).label}
                    <button
                      type="button"
                      onClick={() => setSelectedAction('ALL')}
                      className="hover:text-blue-900 cursor-pointer"
                    >
                      &times;
                    </button>
                  </span>
                )}
                {dateFilter !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                    Thời gian: {dateFilter === 'TODAY' ? 'Hôm nay' : dateFilter === '7DAYS' ? '7 ngày qua' : dateFilter === '30DAYS' ? '30 ngày qua' : `${startDate || '...'} -> ${endDate || '...'}`}
                    <button
                      type="button"
                      onClick={() => {
                        setDateFilter('ALL');
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="hover:text-emerald-900 cursor-pointer"
                    >
                      &times;
                    </button>
                  </span>
                )}
                {searchKeyword && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] font-semibold">
                    Từ khóa: &quot;{searchKeyword}&quot;
                    <button
                      type="button"
                      onClick={() => setSearchKeyword('')}
                      className="hover:text-amber-900 cursor-pointer"
                    >
                      &times;
                    </button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer ml-auto"
              >
                <span className="material-symbols-outlined text-[13px]">filter_alt_off</span>
                <span>Đặt lại bộ lọc</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Body State handling */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-theme-text-muted">
            <span className="w-6 h-6 border-2 border-theme-secondary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Đang tải nhật ký audit...</span>
          </div>
        ) : error ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto text-center">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">error</span>
            </div>
            <p className="text-xs font-bold text-theme-text">Không thể tải nhật ký audit</p>
            <p className="text-[11px] text-theme-text-muted">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-theme-surface border border-theme-border hover:bg-theme-surface-subtle text-theme-text flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                <span>Thử lại</span>
              </button>
            )}
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-center max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-xl bg-theme-surface-subtle text-theme-text-muted flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">history_toggle_off</span>
            </div>
            <p className="text-xs font-bold text-theme-text">{emptyTitle}</p>
            <p className="text-[11px] text-theme-text-muted">{emptyMessage}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-center max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">search_off</span>
            </div>
            <p className="text-xs font-bold text-theme-text">Không tìm thấy bản ghi phù hợp</p>
            <p className="text-[11px] text-theme-text-muted">
              Không có bản ghi nhật ký nào thỏa mãn bộ lọc hiện tại.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        ) : (
          /* Timeline Feed */
          <div className="space-y-6">
            <div className="relative border-l-2 border-theme-border/80 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-6">
              {paginatedItems.map((item, idx) => {
              const badge = getActionBadgeStyle(item.action);
              const isDiffOpen = Boolean(expandedDiffs[item.id || idx]);
              const actor = resolveActorInfo(item, currentUser);

              const hasDiff =
                Boolean(item.changedFields && item.changedFields.length > 0) ||
                Boolean(item.stateBefore || item.stateAfter);

              // Extract all keys to compare if changedFields is missing
              const diffKeys: string[] = (item.changedFields && item.changedFields.length > 0)
                ? item.changedFields
                : Array.from(
                    new Set([
                      ...(item.stateBefore ? Object.keys(item.stateBefore) : []),
                      ...(item.stateAfter ? Object.keys(item.stateAfter) : []),
                    ])
                  );

              return (
                <div key={item.id || idx} className="relative group">
                  {/* Timeline Dot Indicator */}
                  <div className="absolute -left-[23px] sm:-left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-theme-surface border-2 border-theme-secondary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <div className="w-1.5 h-1.5 rounded-full bg-theme-secondary" />
                  </div>

                  {/* Card Container */}
                  <div className="rounded-xl border border-theme-border/80 bg-theme-surface p-3.5 sm:p-4 shadow-2xs hover:border-theme-border transition-colors">
                    {/* Top Row: Action Badge + Time + Resource */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Action Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${badge.className}`}
                        >
                          <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>
                          <span>{badge.label}</span>
                        </span>

                        {/* Resource Indicator */}
                        <span className="text-xs font-semibold text-theme-text">
                          {item.resource}
                          {item.resourceId && (
                            <span className="font-mono text-theme-text-muted ml-1 text-[11px]">
                              #{item.resourceId.length > 18 ? `${item.resourceId.slice(0, 14)}...` : item.resourceId}
                            </span>
                          )}
                        </span>

                        {/* Target Person if available */}
                        {item.metadata?.staffName && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                            <span className="material-symbols-outlined text-[12px] text-slate-500">person</span>
                            <span>Nhân sự: <strong>{item.metadata.staffName}</strong></span>
                          </span>
                        )}

                        {/* PIN Verification Badge */}
                        {item.metadata?.pinVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <span className="material-symbols-outlined text-[12px] text-emerald-600">verified_user</span>
                            <span>Đã xác thực PIN</span>
                          </span>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="text-[11px] text-theme-text-muted font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>{formatAuditTime(item.timestamp)}</span>
                      </div>
                    </div>

                    {/* Metadata Grid with Clear Actor Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px] bg-slate-50/70 p-3 rounded-lg border border-slate-200/70 mb-3">
                      {/* Actor (Clear identity with avatar & email) */}
                      <div className="sm:col-span-2 lg:col-span-2">
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                          Người thực hiện:
                        </span>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {actor.avatarChar}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">
                                {actor.displayName}
                              </span>
                              {actor.isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                                  Bạn
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-slate-200/80 text-slate-700">
                                {actor.displayRole}
                              </span>
                            </div>
                            {actor.displayEmail ? (
                              <span className="text-[10.5px] text-slate-500 truncate block">
                                {actor.displayEmail}
                              </span>
                            ) : item.actorId ? (
                              <span className="font-mono text-[10px] text-slate-400 truncate block" title={item.actorId}>
                                ID: {item.actorId}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* IP Address & Network */}
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                          Địa chỉ IP:
                        </span>
                        <span className="font-mono text-slate-700 text-xs block">
                          {item.ipAddress || '127.0.0.1 (Nội bộ)'}
                        </span>
                        {item.requestId && (
                          <span className="font-mono text-[10px] text-slate-400 truncate block mt-0.5" title={item.requestId}>
                            Req: {item.requestId.slice(0, 12)}...
                          </span>
                        )}
                      </div>

                      {/* Store / Business Info */}
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider mb-1">
                          Mã Doanh Nghiệp:
                        </span>
                        <span className="font-mono text-slate-700 text-xs block truncate" title={item.storeId}>
                          {item.storeId ? `${item.storeId.slice(0, 12)}...` : '-'}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {item.metadata?.pinVerified ? 'Bảo mật 2 lớp (PIN)' : 'Bảo mật chuẩn'}
                        </span>
                      </div>
                    </div>

                    {/* Description / Note if present */}
                    {item.description && (
                      <p className="text-xs text-theme-text mb-3 leading-relaxed bg-white p-2.5 rounded-lg border border-theme-border/60">
                        {item.description}
                      </p>
                    )}

                    {/* Note from metadata if available and distinct */}
                    {item.metadata?.note && item.metadata.note !== item.description && (
                      <div className="text-xs text-slate-700 mb-3 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-amber-600">info</span>
                        <span>{item.metadata.note}</span>
                      </div>
                    )}

                    {/* Changed Fields Summary & Diff Toggle */}
                    {hasDiff && (
                      <div className="mt-2 pt-2 border-t border-theme-border/60">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {/* Changed Fields Pills */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold text-theme-text-muted">
                              Các trường thay đổi:
                            </span>
                            {diffKeys.length > 0 ? (
                              diffKeys.map((f) => (
                                <span
                                  key={f}
                                  className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/80 font-mono text-[10px] font-semibold"
                                >
                                  {f}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-theme-text-muted italic">
                                Không có danh sách cụ thể
                              </span>
                            )}
                          </div>

                          {/* Expand/Collapse Button */}
                          <button
                            type="button"
                            onClick={() => toggleDiff(item.id || String(idx))}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-theme-secondary hover:underline cursor-pointer select-none"
                            aria-expanded={isDiffOpen}
                          >
                            <span>{isDiffOpen ? 'Thu gọn diff' : 'Xem thay đổi'}</span>
                            <span className="material-symbols-outlined text-[15px]">
                              {isDiffOpen ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </div>

                        {/* Collapsible Diff Panel */}
                        {isDiffOpen && (
                          <div className="mt-3 rounded-lg border border-theme-border bg-theme-surface-subtle/40 p-3 overflow-x-auto">
                            <div className="text-[11px] font-bold text-theme-text mb-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] text-theme-secondary">
                                difference
                              </span>
                              <span>So sánh trước và sau (Before &rarr; After)</span>
                            </div>

                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-theme-border text-[10px] uppercase font-bold text-theme-text-muted">
                                  <th className="py-1.5 px-2 w-1/4">Trường dữ liệu</th>
                                  <th className="py-1.5 px-2 w-3/8 text-rose-700 bg-rose-50/50 rounded-tl">
                                    Trước (Before)
                                  </th>
                                  <th className="py-1.5 px-2 w-3/8 text-emerald-700 bg-emerald-50/50 rounded-tr">
                                    Sau (After)
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-theme-border/50">
                                {diffKeys.map((key) => {
                                  const beforeVal = item.stateBefore ? item.stateBefore[key] : undefined;
                                  const afterVal = item.stateAfter ? item.stateAfter[key] : undefined;

                                  return (
                                    <tr key={key} className="hover:bg-theme-surface/80">
                                      <td className="py-2 px-2 font-mono text-[11px] font-bold text-theme-text align-top">
                                        {key}
                                      </td>
                                      <td className="py-2 px-2 bg-rose-50/20 text-rose-900 align-top">
                                        {renderDiffValue(beforeVal)}
                                      </td>
                                      <td className="py-2 px-2 bg-emerald-50/20 text-emerald-900 align-top">
                                        {renderDiffValue(afterVal)}
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
                  </div>
                </div>
              );
            })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-theme-border bg-theme-surface-subtle/30 px-3 py-2.5 rounded-xl text-xs text-theme-text-muted">
                <div>
                  Hiển thị <strong>{(currentPage - 1) * pageSize + 1}</strong> -{' '}
                  <strong>{Math.min(currentPage * pageSize, filteredItems.length)}</strong> trên{' '}
                  <strong>{filteredItems.length}</strong> nhật ký
                </div>
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer text-theme-text"
                  >
                    ← Trước
                  </button>
                  <span className="px-2.5 py-1 font-bold text-theme-text">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1 rounded-lg border border-theme-border bg-theme-surface hover:bg-theme-surface-subtle disabled:opacity-40 disabled:cursor-not-allowed font-semibold cursor-pointer text-theme-text"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
