import React, { useState, useMemo } from 'react';

export interface AuditLogItem {
  id: string;
  actorId: string;
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
  const upperAction = action.toUpperCase();

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
        label: action === 'ROLE_CHANGE' ? 'Đổi Vai Trò' : action === 'PERMISSION_CHANGE' ? 'Đổi Quyền Hạn' : 'Đổi Mã PIN',
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
  // Track open state of diffs per audit item
  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});

  const toggleDiff = (id: string) => {
    setExpandedDiffs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
        <div className="text-[11px] text-theme-text-muted font-medium">
          Tổng cộng: <strong className="text-theme-text font-bold">{items.length}</strong> bản ghi
        </div>
      </div>

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
        ) : (
          /* Timeline Feed */
          <div className="relative border-l-2 border-theme-border/80 ml-3 sm:ml-4 pl-4 sm:pl-6 space-y-6">
            {items.map((item, idx) => {
              const badge = getActionBadgeStyle(item.action);
              const isDiffOpen = Boolean(expandedDiffs[item.id || idx]);
              const hasDiff =
                Boolean(item.changedFields && item.changedFields.length > 0) ||
                Boolean(item.stateBefore || item.stateAfter);

              // Extract all keys to compare if changedFields is missing
              const diffKeys: string[] = useMemo(() => {
                if (item.changedFields && item.changedFields.length > 0) {
                  return item.changedFields;
                }
                const beforeKeys = item.stateBefore ? Object.keys(item.stateBefore) : [];
                const afterKeys = item.stateAfter ? Object.keys(item.stateAfter) : [];
                return Array.from(new Set([...beforeKeys, ...afterKeys]));
              }, [item.changedFields, item.stateBefore, item.stateAfter]);

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
                              #{item.resourceId}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Timestamp */}
                      <div className="text-[11px] text-theme-text-muted font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>{formatAuditTime(item.timestamp)}</span>
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] bg-theme-surface-subtle/50 p-2.5 rounded-lg border border-theme-border/50 mb-3">
                      {/* Actor */}
                      <div>
                        <span className="text-theme-text-muted block text-[10px] uppercase font-bold tracking-wider">
                          Người thực hiện:
                        </span>
                        <span className="font-semibold text-theme-text font-mono truncate block" title={item.actorId}>
                          {item.actorId || '-'}
                        </span>
                      </div>

                      {/* Role */}
                      <div>
                        <span className="text-theme-text-muted block text-[10px] uppercase font-bold tracking-wider">
                          Vai trò (Role):
                        </span>
                        <span className="font-semibold text-theme-text">
                          {item.actorRole || '-'}
                        </span>
                      </div>

                      {/* IP Address */}
                      <div>
                        <span className="text-theme-text-muted block text-[10px] uppercase font-bold tracking-wider">
                          Địa chỉ IP:
                        </span>
                        <span className="font-mono text-theme-text">
                          {item.ipAddress || '-'}
                        </span>
                      </div>

                      {/* Request Correlation ID */}
                      <div>
                        <span className="text-theme-text-muted block text-[10px] uppercase font-bold tracking-wider">
                          Request ID:
                        </span>
                        <span className="font-mono text-theme-text-muted truncate block" title={item.requestId}>
                          {item.requestId || '-'}
                        </span>
                      </div>

                      {/* Store ID (if available) */}
                      {item.storeId && (
                        <div className="sm:col-span-2">
                          <span className="text-theme-text-muted block text-[10px] uppercase font-bold tracking-wider">
                            Store ID:
                          </span>
                          <span className="font-mono text-theme-text truncate block">
                            {item.storeId}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Description / Note if present */}
                    {item.description && (
                      <p className="text-xs text-theme-text mb-3 leading-relaxed bg-white p-2 rounded border border-theme-border/50">
                        {item.description}
                      </p>
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
        )}
      </div>
    </div>
  );
}
