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

export interface AuditStaffOption {
  id?: string;
  userId?: string;
  fullName?: string;
  email?: string;
}

export interface AuditHistoryTimelineProps {
  items: AuditLogItem[];
  staffList?: AuditStaffOption[];
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
    case 'INVITE':
    case 'PROVISION':
      return {
        label: 'Cấp Tài Khoản Mới',
        className: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        icon: 'person_add',
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

export const PERMISSION_LABEL_MAP: Record<string, string> = {
  DASHBOARD_VIEW: 'Xem bảng tổng quan',
  STORE_VIEW: 'Xem thông tin gian hàng',
  STORE_UPDATE: 'Chỉnh sửa gian hàng',
  PRODUCT_VIEW: 'Xem danh mục sản phẩm',
  PRODUCT_CREATE: 'Đăng bán sách mới',
  PRODUCT_UPDATE: 'Chỉnh sửa thông tin sách',
  INVENTORY_UPDATE: 'Cập nhật kho hàng',
  ORDER_VIEW: 'Xem danh sách đơn hàng',
  ORDER_PROCESS: 'Xử lý & Cập nhật đơn hàng',
  ORDER_CANCEL: 'Hủy đơn hàng',
  MEMBER_VIEW: 'Xem danh sách nhân sự',
  MEMBER_MANAGE: 'Quản trị phân quyền nhân sự',
  FINANCE_VIEW: 'Xem doanh thu & ví tiền',
  FINANCE_WITHDRAW: 'Yêu cầu rút tiền',
  VOUCHER_MANAGE: 'Quản lý mã giảm giá',
  FLASH_SALE_MANAGE: 'Quản lý Flash Sale',
  REVIEW_MANAGE: 'Quản lý đánh giá & phản hồi',
  STAFF_MANAGE: 'Quản trị nhân sự',
  ORDER_MANAGE: 'Quản lý đơn hàng',
  PRODUCT_MANAGE: 'Quản lý sản phẩm',
  INVENTORY_MANAGE: 'Quản lý kho hàng',
};

export const ROLE_LABEL_MAP: Record<string, string> = {
  OWNER: 'Chủ sở hữu gian hàng',
  ADMIN: 'Quản trị viên',
  MANAGER: 'Quản lý toàn quyền gian hàng',
  ORDER_STAFF: 'Nhân viên xử lý đơn hàng',
  CONTENT_STAFF: 'Biên tập viên nội dung sách',
  FINANCE_STAFF: 'Kế toán & Thu ngân',
  WAREHOUSE_STAFF: 'Nhân viên kho vận',
  CS_STAFF: 'Nhân viên CSKH',
  STAFF: 'Nhân sự vận hành',
};

export const STATUS_LABEL_MAP: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Đang hoạt động', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  SUSPENDED: { label: 'Tạm khóa', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  PENDING: { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  PENDING_INVITATION: { label: 'Đang chờ xác nhận', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  DELETED: { label: 'Đã xóa', color: 'bg-slate-200 text-slate-700 border-slate-300' },
};

export const FIELD_LABEL_MAP: Record<string, string> = {
  fullName: 'Họ và tên nhân sự',
  email: 'Email đăng nhập',
  phone: 'Số điện thoại',
  role: 'Vai trò chức danh',
  status: 'Trạng thái tài khoản',
  permissions: 'Danh sách quyền hạn',
  initialPin: 'Mã PIN bảo mật',
  passwordReset: 'Đặt lại mật khẩu',
  deletedAt: 'Thời điểm xóa tài khoản',
};

export const TECHNICAL_KEYS = new Set([
  'id',
  'userId',
  'businessId',
  'storeId',
  'requestId',
  'actorId',
  'resourceId',
  'createdAt',
  'updatedAt',
]);

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
 * Generate human-friendly action title and subtitle for regular users (Sellers)
 */
function getFriendlyActionTitle(item: AuditLogItem): { title: string; subtitle?: string } {
  const staffName =
    item.metadata?.staffName ||
    item.stateAfter?.fullName ||
    item.stateBefore?.fullName ||
    item.metadata?.staffEmail ||
    item.stateAfter?.email ||
    '';

  const action = (item.action || '').toUpperCase();
  const resource = (item.resource || '').toUpperCase();

  if (resource === 'MEMBER' || resource === 'STAFF' || resource === 'INVITATION') {
    if (action === 'INVITE' || action === 'PROVISION' || action === 'CREATE') {
      const roleStr = item.stateAfter?.role ? (ROLE_LABEL_MAP[item.stateAfter.role] || item.stateAfter.role) : '';
      return {
        title: staffName ? `Cấp tài khoản mới cho nhân viên ${staffName}` : 'Cấp tài khoản nhân viên mới',
        subtitle: roleStr ? `Vai trò: ${roleStr}` : undefined,
      };
    }
    if (action === 'PERMISSION_CHANGE') {
      return {
        title: staffName ? `Cập nhật quyền hạn cho nhân viên ${staffName}` : 'Cập nhật phân quyền nhân sự',
        subtitle: item.metadata?.newCount ? `Tổng cộng: ${item.metadata.newCount} quyền hạn chức năng` : undefined,
      };
    }
    if (action === 'ROLE_CHANGE') {
      const roleStr = item.stateAfter?.role ? (ROLE_LABEL_MAP[item.stateAfter.role] || item.stateAfter.role) : '';
      return {
        title: staffName ? `Đổi vai trò chức danh của nhân viên ${staffName}` : 'Thay đổi vai trò nhân sự',
        subtitle: roleStr ? `Vai trò mới: ${roleStr}` : undefined,
      };
    }
    if (action === 'DELETE') {
      return {
        title: staffName ? `Xóa tài khoản nhân viên ${staffName}` : 'Xóa tài khoản nhân sự',
        subtitle: 'Đã thu hồi toàn bộ quyền truy cập gian hàng',
      };
    }
    if (action === 'STATUS_CHANGE' || action === 'UPDATE') {
      if (item.stateAfter?.status === 'SUSPENDED') {
        return {
          title: staffName ? `Tạm khóa tài khoản nhân viên ${staffName}` : 'Tạm khóa tài khoản nhân viên',
          subtitle: 'Tài khoản nhân sự tạm thời bị ngưng quyền truy cập',
        };
      }
      if (item.stateAfter?.status === 'ACTIVE') {
        return {
          title: staffName ? `Mở khóa tài khoản nhân viên ${staffName}` : 'Mở khóa tài khoản nhân viên',
          subtitle: 'Tài khoản nhân viên đã được kích hoạt hoạt động trở lại',
        };
      }
      if (item.stateAfter?.passwordReset) {
        return {
          title: staffName ? `Đặt lại mật khẩu cho nhân viên ${staffName}` : 'Đặt lại mật khẩu nhân viên',
          subtitle: 'Đã cấp mật khẩu tạm mới và yêu cầu đổi mật khẩu ở lần đăng nhập tới',
        };
      }
    }
  }

  const resName = item.resource === 'Member' ? 'Nhân sự' : item.resource === 'Product' ? 'Sản phẩm' : item.resource === 'Order' ? 'Đơn hàng' : item.resource;
  return {
    title: `${resName} ${item.metadata?.staffName || item.metadata?.bookTitle || (item.resourceId ? '#' + item.resourceId.slice(0, 8) : '')}`.trim(),
    subtitle: item.description,
  };
}

/**
 * Render sanitized value cleanly in diff
 */
function renderDiffValue(val: any, key?: string): React.ReactNode {
  if (val === null || val === undefined) {
    return <span className="text-slate-400 italic text-[11px]">(trống)</span>;
  }

  // Permissions array -> Pretty colored tag chips
  if (key === 'permissions' && Array.isArray(val)) {
    if (val.length === 0) {
      return <span className="text-slate-400 italic text-[11px]">Không có quyền nào</span>;
    }
    return (
      <div className="space-y-1.5 py-1">
        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          Được cấp {val.length} quyền:
        </span>
        <div className="flex flex-wrap gap-1 pt-1 max-h-48 overflow-y-auto">
          {val.map((permKey: string) => (
            <span
              key={permKey}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-emerald-50 text-emerald-900 border border-emerald-200 shadow-2xs"
            >
              <span className="material-symbols-outlined text-[12px] text-emerald-600">check_circle</span>
              <span>{PERMISSION_LABEL_MAP[permKey] || permKey}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Role -> Friendly Role Badge
  if (key === 'role' && typeof val === 'string') {
    const label = ROLE_LABEL_MAP[val] || val;
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-900 border border-blue-200">
        <span className="material-symbols-outlined text-[13px] text-blue-600">badge</span>
        <span>{label}</span>
      </span>
    );
  }

  // Status -> Friendly Status Badge
  if (key === 'status' && typeof val === 'string') {
    const st = STATUS_LABEL_MAP[val] || { label: val, color: 'bg-slate-100 text-slate-800' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${st.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${val === 'ACTIVE' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
        <span>{st.label}</span>
      </span>
    );
  }

  if (typeof val === 'boolean') {
    return (
      <span className={`font-semibold text-xs ${val ? 'text-emerald-700' : 'text-slate-500'}`}>
        {val ? 'Có / Đã kích hoạt' : 'Không'}
      </span>
    );
  }

  if (typeof val === 'object') {
    return (
      <pre className="text-[10.5px] font-mono bg-slate-50 p-2 rounded-lg border border-slate-200 max-h-32 overflow-y-auto whitespace-pre-wrap text-slate-800">
        {JSON.stringify(val, null, 2)}
      </pre>
    );
  }

  return <span className="font-semibold text-xs text-slate-900">{String(val)}</span>;
}

/**
 * Resolve actor identity with user context or fallback
 */
export function resolveActorInfo(item: AuditLogItem, currentUser?: any, staffList?: AuditStaffOption[]): {
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

  let name = item.actorName || item.metadata?.actorName || item.metadata?.staffName || item.metadata?.authorName;
  let email = item.actorEmail || item.metadata?.actorEmail || item.metadata?.staffEmail;

  if (staffList && staffList.length > 0 && (!name || !email)) {
    const matched = staffList.find(
      (s) =>
        (item.actorId && (s.id === item.actorId || s.userId === item.actorId)) ||
        (item.actorEmail && s.email?.toLowerCase() === item.actorEmail.toLowerCase())
    );
    if (matched) {
      name = name || matched.fullName;
      email = email || matched.email;
    }
  }

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
  staffList = [],
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
  const [selectedStaff, setSelectedStaff] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');

  // Pagination States
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Track open state of diffs per audit item
  const [expandedDiffs, setExpandedDiffs] = useState<Record<string, boolean>>({});
  const [showTechDetails, setShowTechDetails] = useState<Record<string, boolean>>({});

  const toggleDiff = (id: string) => {
    setExpandedDiffs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleTechDetails = (id: string) => {
    setShowTechDetails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Distinct staff members for the Staff Filter Dropdown
  const staffOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; email?: string }>();

    // 1. From staffList prop if provided
    if (staffList && staffList.length > 0) {
      staffList.forEach((st) => {
        const key = (st.email || st.fullName || st.id || st.userId || '').trim();
        if (key) {
          const label = st.fullName ? `${st.fullName}${st.email ? ` (${st.email})` : ''}` : (st.email || key);
          map.set(key.toLowerCase(), {
            key,
            label,
            email: st.email,
          });
        }
      });
    }

    // 2. Also extract from items (both targets and actors)
    items.forEach((it) => {
      const staffName = (it.metadata?.staffName || it.stateAfter?.fullName || it.stateBefore?.fullName || '').trim();
      const staffEmail = (it.metadata?.staffEmail || it.stateAfter?.email || it.stateBefore?.email || '').trim();
      const key = staffEmail || staffName || it.resourceId;

      if (key) {
        const lowerKey = key.toLowerCase();
        if (!map.has(lowerKey)) {
          const label = staffName
            ? `${staffName}${staffEmail ? ` (${staffEmail})` : ''}`
            : (staffEmail || `Nhân sự #${key.slice(0, 8)}`);
          map.set(lowerKey, {
            key,
            label,
            email: staffEmail,
          });
        }
      }

      // Also extract actor if known
      const actorName = (it.actorName || '').trim();
      const actorEmail = (it.actorEmail || '').trim();
      const actorKey = actorEmail || actorName || it.actorId;
      if (actorKey) {
        const lowerActorKey = actorKey.toLowerCase();
        if (!map.has(lowerActorKey)) {
          const label = actorName
            ? `${actorName}${actorEmail ? ` (${actorEmail})` : ''}`
            : (actorEmail || `Nhân sự #${actorKey.slice(0, 8)}`);
          map.set(lowerActorKey, {
            key: actorKey,
            label,
            email: actorEmail,
          });
        }
      }
    });

    return Array.from(map.values());
  }, [items, staffList]);

  // Standardized Feature Categories for Action Dropdown with exact counts
  const featureCategories = useMemo(() => {
    const counts: Record<string, number> = {
      ORDER: 0,
      CREATE: 0,
      PERMISSION: 0,
      ROLE: 0,
      STATUS: 0,
      SECURITY: 0,
      DELETE: 0,
    };

    items.forEach((it) => {
      const act = (it.action || '').toUpperCase();
      const res = (it.resource || '').toUpperCase();
      if (['CONFIRM', 'PREPARE', 'SHIP', 'CANCEL', 'ORDER_CONFIRM', 'ORDER_PREPARE'].includes(act) || res === 'ORDER') {
        counts.ORDER++;
      } else if (['INVITE', 'PROVISION', 'CREATE'].includes(act)) {
        counts.CREATE++;
      } else if (act === 'PERMISSION_CHANGE') {
        counts.PERMISSION++;
      } else if (act === 'ROLE_CHANGE') {
        counts.ROLE++;
      } else if (['STATUS_CHANGE', 'BLOCK', 'UNBLOCK', 'SUSPEND', 'ACTIVATE'].includes(act) || it.changedFields?.includes('status')) {
        counts.STATUS++;
      } else if (['PIN_CHANGE', 'PASSWORD_RESET'].includes(act) || it.stateAfter?.passwordReset || it.stateAfter?.passwordUpdated) {
        counts.SECURITY++;
      } else if (['DELETE', 'REMOVE'].includes(act)) {
        counts.DELETE++;
      }
    });

    return [
      { id: 'ALL', label: 'Tất cả tác vụ', count: items.length },
      { id: 'ORDER', label: 'Xử lý đơn hàng', count: counts.ORDER },
      { id: 'CREATE', label: 'Cấp tài khoản mới', count: counts.CREATE },
      { id: 'PERMISSION', label: 'Cập nhật phân quyền', count: counts.PERMISSION },
      { id: 'ROLE', label: 'Đổi vai trò chức danh', count: counts.ROLE },
      { id: 'STATUS', label: 'Khóa / Mở khóa tài khoản', count: counts.STATUS },
      { id: 'SECURITY', label: 'Đổi mật khẩu / PIN', count: counts.SECURITY },
      { id: 'DELETE', label: 'Xóa tài khoản nhân sự', count: counts.DELETE },
    ];
  }, [items]);

  // Compute filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const act = (item.action || '').toUpperCase();

      // 1. Action / Feature filter
      if (selectedAction !== 'ALL') {
        const res = (item.resource || '').toUpperCase();
        if (selectedAction === 'ORDER') {
          if (!['CONFIRM', 'PREPARE', 'SHIP', 'CANCEL', 'ORDER_CONFIRM', 'ORDER_PREPARE'].includes(act) && res !== 'ORDER') return false;
        } else if (selectedAction === 'CREATE') {
          if (!['INVITE', 'PROVISION', 'CREATE'].includes(act) || res === 'ORDER') return false;
        } else if (selectedAction === 'PERMISSION') {
          if (act !== 'PERMISSION_CHANGE') return false;
        } else if (selectedAction === 'ROLE') {
          if (act !== 'ROLE_CHANGE') return false;
        } else if (selectedAction === 'STATUS') {
          if (!['STATUS_CHANGE', 'BLOCK', 'UNBLOCK', 'SUSPEND', 'ACTIVATE'].includes(act) && !item.changedFields?.includes('status')) return false;
        } else if (selectedAction === 'SECURITY') {
          if (!['PIN_CHANGE', 'PASSWORD_RESET'].includes(act) && !item.stateAfter?.passwordReset && !item.stateAfter?.passwordUpdated) return false;
        } else if (selectedAction === 'DELETE') {
          if (!['DELETE', 'REMOVE'].includes(act)) return false;
        } else if (act !== selectedAction) {
          return false;
        }
      }

      // 2. Staff Member filter (matches either as actor or as affected member)
      if (selectedStaff !== 'ALL') {
        const q = selectedStaff.toLowerCase();
        const targetName = (item.metadata?.staffName || item.stateAfter?.fullName || item.stateBefore?.fullName || '').toLowerCase();
        const targetEmail = (item.metadata?.staffEmail || item.stateAfter?.email || item.stateBefore?.email || '').toLowerCase();
        const targetId = (item.resourceId || item.stateAfter?.id || item.stateAfter?.userId || '').toLowerCase();

        const actorName = (item.actorName || '').toLowerCase();
        const actorEmail = (item.actorEmail || '').toLowerCase();
        const actorId = (item.actorId || '').toLowerCase();

        const match =
          targetId === q ||
          targetEmail === q ||
          targetName === q ||
          actorId === q ||
          actorEmail === q ||
          actorName === q ||
          targetEmail.includes(q) ||
          targetName.includes(q) ||
          actorEmail.includes(q) ||
          actorName.includes(q) ||
          (targetEmail.length > 3 && q.includes(targetEmail)) ||
          (targetName.length > 2 && q.includes(targetName)) ||
          (actorEmail.length > 3 && q.includes(actorEmail)) ||
          (actorName.length > 2 && q.includes(actorName));

        if (!match) return false;
      }

      // 3. Date filter
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

      // 4. Search query
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase().trim();
        const actor = resolveActorInfo(item, currentUser, staffList);

        const matchActorName = actor.displayName.toLowerCase().includes(q);
        const matchActorEmail = (actor.displayEmail || '').toLowerCase().includes(q);
        const matchActorId = (item.actorId || '').toLowerCase().includes(q);
        const matchResourceId = (item.resourceId || '').toLowerCase().includes(q);
        const matchStaffName = (item.metadata?.staffName || item.stateAfter?.fullName || item.stateBefore?.fullName || '').toLowerCase().includes(q);
        const matchStaffEmail = (item.metadata?.staffEmail || item.stateAfter?.email || item.stateBefore?.email || '').toLowerCase().includes(q);
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
  }, [items, selectedAction, selectedStaff, dateFilter, startDate, endDate, searchKeyword, currentUser]);

  const hasActiveFilters =
    selectedAction !== 'ALL' ||
    selectedStaff !== 'ALL' ||
    dateFilter !== 'ALL' ||
    Boolean(searchKeyword.trim()) ||
    Boolean(startDate) ||
    Boolean(endDate);

  const resetFilters = () => {
    setSelectedAction('ALL');
    setSelectedStaff('ALL');
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
                onChange={(e) => {
                  setSelectedAction(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-2 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer shadow-2xs"
              >
                {featureCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} ({cat.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Staff Member Dropdown Filter (New!) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Nhân sự:</span>
              <select
                value={selectedStaff}
                onChange={(e) => {
                  setSelectedStaff(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-2 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer shadow-2xs max-w-[220px] truncate"
              >
                <option value="ALL">Tất cả nhân sự ({staffOptions.length})</option>
                {staffOptions.map((st) => (
                  <option key={st.key} value={st.key}>
                    {st.label}
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
                  onClick={() => {
                    setDateFilter(p.id);
                    setCurrentPage(1);
                  }}
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
                    Tác vụ: {featureCategories.find((c) => c.id === selectedAction)?.label || selectedAction}
                    <button
                      type="button"
                      onClick={() => setSelectedAction('ALL')}
                      className="hover:text-blue-900 cursor-pointer"
                    >
                      &times;
                    </button>
                  </span>
                )}
                {selectedStaff !== 'ALL' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[11px] font-semibold">
                    Nhân sự: {staffOptions.find((s) => s.key === selectedStaff)?.label || selectedStaff}
                    <button
                      type="button"
                      onClick={() => setSelectedStaff('ALL')}
                      className="hover:text-purple-900 cursor-pointer"
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
          /* Activity Stream Feed */
          <div className="space-y-4">
            <div className="divide-y divide-slate-100 bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs">
              {paginatedItems.map((item, idx) => {
                const itemKey = item.id || String(idx);
                const isDiffOpen = Boolean(expandedDiffs[itemKey]);
                const showTech = Boolean(showTechDetails[itemKey]);
                const actor = resolveActorInfo(item, currentUser, staffList);
                const action = (item.action || '').toUpperCase();
                const resource = (item.resource || '').toUpperCase();
                const isMemberResource = resource === 'MEMBER' || resource === 'STAFF' || resource === 'INVITATION';

                const targetName =
                  item.metadata?.staffName ||
                  item.stateAfter?.fullName ||
                  item.stateBefore?.fullName ||
                  '';
                const targetEmail =
                  item.metadata?.staffEmail ||
                  item.stateAfter?.email ||
                  item.stateBefore?.email ||
                  '';

                const roleAfter = item.stateAfter?.role ? (ROLE_LABEL_MAP[item.stateAfter.role] || item.stateAfter.role) : '';
                const roleBefore = item.stateBefore?.role ? (ROLE_LABEL_MAP[item.stateBefore.role] || item.stateBefore.role) : '';

                const permsAfter: string[] = Array.isArray(item.stateAfter?.permissions) ? item.stateAfter.permissions : [];
                const permsBefore: string[] = Array.isArray(item.stateBefore?.permissions) ? item.stateBefore.permissions : [];

                const addedPerms = permsAfter.filter((p) => !permsBefore.includes(p));
                const removedPerms = permsBefore.filter((p) => !permsAfter.includes(p));

                // Determine icon & clean styling
                let iconName = 'history';
                let iconBg = 'bg-slate-100 text-slate-700';
                if (action === 'INVITE' || action === 'PROVISION' || action === 'CREATE') {
                  iconName = 'person_add';
                  iconBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
                } else if (action === 'PERMISSION_CHANGE') {
                  iconName = 'key';
                  iconBg = 'bg-blue-50 text-blue-700 border border-blue-200/80';
                } else if (action === 'ROLE_CHANGE') {
                  iconName = 'badge';
                  iconBg = 'bg-indigo-50 text-indigo-700 border border-indigo-200/80';
                } else if (action === 'DELETE') {
                  iconName = 'person_remove';
                  iconBg = 'bg-rose-50 text-rose-700 border border-rose-200/80';
                } else if (item.stateAfter?.status === 'SUSPENDED') {
                  iconName = 'lock';
                  iconBg = 'bg-amber-50 text-amber-700 border border-amber-200/80';
                } else if (item.stateAfter?.status === 'ACTIVE') {
                  iconName = 'lock_open';
                  iconBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
                }

                // Construct natural human sentence
                let sentence: React.ReactNode = null;
                if (isMemberResource) {
                  if (action === 'INVITE' || action === 'PROVISION' || action === 'CREATE') {
                    sentence = (
                      <span>
                        đã cấp tài khoản mới cho{' '}
                        <strong className="font-semibold text-slate-900">{targetName || 'nhân viên mới'}</strong>
                        {targetEmail && <span className="text-slate-500 font-normal"> ({targetEmail})</span>}
                      </span>
                    );
                  } else if (action === 'PERMISSION_CHANGE') {
                    sentence = (
                      <span>
                        đã cập nhật quyền hạn cho{' '}
                        <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
                      </span>
                    );
                  } else if (action === 'ROLE_CHANGE') {
                    sentence = (
                      <span>
                        đã thay đổi vai trò của{' '}
                        <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
                      </span>
                    );
                  } else if (action === 'DELETE') {
                    sentence = (
                      <span>
                        đã xóa tài khoản nhân viên{' '}
                        <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
                      </span>
                    );
                  } else if (action === 'PIN_CHANGE' || action === 'PASSWORD_RESET' || item.stateAfter?.passwordReset || item.stateAfter?.passwordUpdated) {
                    sentence = (
                      <span>
                        đã đặt lại mật khẩu cho{' '}
                        <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
                        {targetEmail && <span className="text-slate-500 font-normal"> ({targetEmail})</span>}
                      </span>
                    );
                  } else if (item.stateAfter?.status === 'SUSPENDED') {
                    sentence = (
                      <span>
                        đã tạm khóa tài khoản của{' '}
                        <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
                      </span>
                    );
                  } else if (item.stateAfter?.status === 'ACTIVE') {
                    sentence = (
                      <span>
                        đã mở khóa tài khoản cho{' '}
                        <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
                      </span>
                    );
                  } else {
                    sentence = (
                      <span>
                        đã cập nhật thông tin của{' '}
                        <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
                      </span>
                    );
                  }
                } else if (resource === 'ORDER' || item.resource === 'Order') {
                  const orderCode = item.metadata?.orderCode || item.resourceId?.slice(0, 8);
                  if (action === 'CONFIRM' || action === 'ORDER_CONFIRM') {
                    iconName = 'check_circle';
                    iconBg = 'bg-emerald-50 text-emerald-700 border border-emerald-200/80';
                    sentence = (
                      <span>
                        đã <strong className="font-semibold text-emerald-700">xác nhận đơn hàng</strong>{' '}
                        <span className="font-mono font-bold text-slate-900 text-xs">#{orderCode}</span>
                      </span>
                    );
                  } else if (action === 'PREPARE' || action === 'ORDER_PREPARE') {
                    iconName = 'inventory_2';
                    iconBg = 'bg-blue-50 text-blue-700 border border-blue-200/80';
                    sentence = (
                      <span>
                        đã chuyển đơn hàng sang trạng thái <strong className="font-semibold text-blue-700">chuẩn bị đóng gói</strong>{' '}
                        <span className="font-mono font-bold text-slate-900 text-xs">#{orderCode}</span>
                      </span>
                    );
                  } else if (action === 'SHIP') {
                    iconName = 'local_shipping';
                    iconBg = 'bg-indigo-50 text-indigo-700 border border-indigo-200/80';
                    sentence = (
                      <span>
                        đã bàn giao đơn hàng cho <strong className="font-semibold text-indigo-700">đơn vị vận chuyển</strong>{' '}
                        <span className="font-mono font-bold text-slate-900 text-xs">#{orderCode}</span>
                      </span>
                    );
                  } else if (action === 'CANCEL') {
                    iconName = 'cancel';
                    iconBg = 'bg-rose-50 text-rose-700 border border-rose-200/80';
                    sentence = (
                      <span>
                        đã <strong className="font-semibold text-rose-700">hủy đơn hàng</strong>{' '}
                        <span className="font-mono font-bold text-slate-900 text-xs">#{orderCode}</span>
                      </span>
                    );
                  } else {
                    sentence = (
                      <span>
                        đã cập nhật trạng thái đơn hàng{' '}
                        <span className="font-mono font-bold text-slate-900 text-xs">#{orderCode}</span>
                      </span>
                    );
                  }
                } else {
                  const resName = item.resource === 'Product' ? 'sản phẩm' : item.resource === 'Order' ? 'đơn hàng' : item.resource;
                  sentence = (
                    <span>
                      đã thực hiện thao tác trên {resName}{' '}
                      <span className="font-mono text-slate-500 text-xs">#{item.resourceId?.slice(0, 8)}</span>
                    </span>
                  );
                }

                return (
                  <div key={itemKey} className="flex gap-3.5 items-start py-3.5 first:pt-0 last:pb-0">
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                      <span className="material-symbols-outlined text-[17px]">{iconName}</span>
                    </div>

                    {/* Main content */}
                    <div className="grow min-w-0">
                      {/* Top: Sentence + Time */}
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <div className="text-[13px] text-slate-700 leading-relaxed">
                          <span className="font-semibold text-slate-900">{actor.displayName}</span>
                          {actor.isSelf && (
                            <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                              Bạn
                            </span>
                          )}
                          <span className="text-slate-400 font-normal"> ({actor.displayRole})</span>
                          {' '}
                          {sentence}
                        </div>
                        <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                          {formatAuditTime(item.timestamp)}
                        </span>
                      </div>

                      {/* Middle: Natural Action Details (clean inline metadata, no clunky tables) */}
                      {isMemberResource && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                          {/* If Provision / Create */}
                          {(action === 'INVITE' || action === 'PROVISION' || action === 'CREATE') && (
                            <>
                              {roleAfter && (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-400 text-[11px]">Vai trò:</span>
                                  <span className="font-medium text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                    {roleAfter}
                                  </span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <span className="text-slate-400 text-[11px]">Trạng thái:</span>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Đang hoạt động
                                </span>
                              </div>
                              {permsAfter.length > 0 && (
                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="text-slate-400">Quyền hạn:</span>
                                  <span className="font-medium text-slate-700">{permsAfter.length} quyền</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleDiff(itemKey)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1"
                                  >
                                    {isDiffOpen ? 'Thu gọn' : 'Xem chi tiết'}
                                  </button>
                                </div>
                              )}
                            </>
                          )}

                          {/* If Role change */}
                          {action === 'ROLE_CHANGE' && roleAfter && (
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-400 text-[11px]">Vai trò:</span>
                              {roleBefore && <span className="line-through text-slate-400 text-[11px]">{roleBefore}</span>}
                              {roleBefore && <span className="text-slate-400">&rarr;</span>}
                              <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {roleAfter}
                              </span>
                            </div>
                          )}

                          {/* If Permission change */}
                          {action === 'PERMISSION_CHANGE' && (
                            <div className="w-full mt-1 space-y-1">
                              {addedPerms.length > 0 && (
                                <div className="flex items-start gap-1.5 text-xs">
                                  <span className="text-emerald-700 font-medium text-[11px] shrink-0">+ Thêm quyền:</span>
                                  <span className="text-slate-700 font-medium text-[11px]">
                                    {addedPerms.map((p) => PERMISSION_LABEL_MAP[p] || p).join(', ')}
                                  </span>
                                </div>
                              )}
                              {removedPerms.length > 0 && (
                                <div className="flex items-start gap-1.5 text-xs">
                                  <span className="text-rose-600 font-medium text-[11px] shrink-0">- Thu hồi:</span>
                                  <span className="text-slate-500 line-through text-[11px]">
                                    {removedPerms.map((p) => PERMISSION_LABEL_MAP[p] || p).join(', ')}
                                  </span>
                                </div>
                              )}
                              {addedPerms.length === 0 && removedPerms.length === 0 && permsAfter.length > 0 && (
                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="text-slate-400">Tổng cộng:</span>
                                  <span className="font-medium text-slate-700">{permsAfter.length} quyền</span>
                                  <button
                                    type="button"
                                    onClick={() => toggleDiff(itemKey)}
                                    className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer ml-1"
                                  >
                                    {isDiffOpen ? 'Thu gọn' : 'Xem chi tiết'}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                          {/* If Password / PIN Reset */}
                          {(action === 'PIN_CHANGE' || action === 'PASSWORD_RESET' || item.stateAfter?.passwordReset || item.stateAfter?.passwordUpdated) && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/80">
                              <span className="material-symbols-outlined text-[14px] text-amber-600">lock_reset</span>
                              <span>Đã cấp mật khẩu tạm mới &amp; yêu cầu đổi mật khẩu ở lần đăng nhập tiếp theo</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Collapsible Permissions list (clean & light, NOT giant neon pills) */}
                      {isDiffOpen && permsAfter.length > 0 && (
                        <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50/80 border border-slate-200/60 text-xs animate-in fade-in duration-150">
                          <div className="text-[11px] font-medium text-slate-500 mb-1.5">
                            Danh sách quyền được cấp ({permsAfter.length}):
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {permsAfter.map((p: string) => (
                              <span
                                key={p}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200 text-[11px]"
                              >
                                <span className="text-emerald-600 font-bold">✓</span>
                                <span>{PERMISSION_LABEL_MAP[p] || p}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Non-member generic diff if available */}
                      {!isMemberResource && (item.stateBefore || item.stateAfter) && (
                        <div className="mt-1.5 text-xs text-slate-600 space-y-0.5">
                          {Object.keys(item.stateAfter || {}).filter(k => !TECHNICAL_KEYS.has(k)).map(k => (
                            <div key={k} className="flex items-center gap-1 text-[11.5px]">
                              <span className="text-slate-400">• {FIELD_LABEL_MAP[k] || k}:</span>
                              {item.stateBefore?.[k] !== undefined && (
                                <span className="line-through text-slate-400 mr-1">{String(item.stateBefore[k])} &rarr;</span>
                              )}
                              <span className="font-medium text-slate-800">{String(item.stateAfter?.[k] ?? '')}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Note / Description */}
                      {item.description && (
                        <p className="mt-1 text-xs text-slate-500 italic">{item.description}</p>
                      )}

                      {/* Footer: Traceable & Serious Governance Audit Trail */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span className="font-mono text-[10.5px] text-slate-500">
                          Mã đối soát: #{item.id ? (item.id.length > 18 ? item.id.slice(0, 16) : item.id) : itemKey}
                        </span>
                        <span>•</span>
                        <span>Thiết bị: <strong className="font-mono text-slate-600">{item.ipAddress || '127.0.0.1'}</strong></span>
                        {item.metadata?.pinVerified && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[10.5px]">
                              <span className="material-symbols-outlined text-[13px]">verified</span>
                              Đã xác thực mã PIN bảo mật
                            </span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleTechDetails(itemKey)}
                          className="hover:text-slate-700 cursor-pointer ml-auto text-[10.5px] text-slate-500 hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[13px]">code</span>
                          <span>{showTech ? 'Ẩn debug' : 'Dữ liệu kỹ thuật'}</span>
                        </button>
                      </div>

                      {/* Raw Debug JSON (Only if user explicitly wants IT view) */}
                      {showTech && (
                        <pre className="mt-2 p-2.5 bg-slate-900 text-slate-100 rounded-lg text-[10px] font-mono overflow-x-auto max-h-40">
                          {JSON.stringify(
                            {
                              id: item.id,
                              action: item.action,
                              resource: item.resource,
                              resourceId: item.resourceId,
                              storeId: item.storeId,
                              actorId: item.actorId,
                              before: item.stateBefore,
                              after: item.stateAfter,
                            },
                            null,
                            2
                          )}
                        </pre>
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
