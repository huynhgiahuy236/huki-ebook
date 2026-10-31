"use client";

import React, { useState, useMemo, useCallback } from 'react';
import GroupedDataTable, { Column } from './GroupedDataTable';
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
    case 'PREPARE':
    case 'ORDER_PREPARE':
      return {
        label: 'Chuẩn Bị Đóng Gói',
        className: 'bg-blue-100 text-blue-800 border-blue-200/80',
        icon: 'inventory_2',
      };
    case 'CONFIRM':
    case 'ORDER_CONFIRM':
    case 'APPROVE':
    case 'ACTIVATE':
    case 'UNBLOCK':
      return {
        label: action.includes('CONFIRM') ? 'Xác Nhận Đơn' : action === 'APPROVE' ? 'Phê Duyệt' : 'Kích Hoạt',
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
      return {
        label: action === 'SUSPEND' ? 'Tạm Ngưng' : 'Đóng Băng',
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
    case 'PASSWORD_RESET':
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
  status: 'Trạng thái',
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

function formatAuditTime(ts: string | Date): string {
  try {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    if (isNaN(d.getTime())) return String(ts);
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return String(ts);
  }
}

function formatAuditDateOnly(ts: string | Date): string {
  try {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    if (isNaN(d.getTime())) return String(ts);
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return String(ts);
  }
}

function formatAuditTimeOnly(ts: string | Date): string {
  try {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => (n < 10 ? `0${n}` : n);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return '';
  }
}

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

  if (resource === 'ORDER' || item.resource === 'Order') {
    const orderCode = item.metadata?.orderCode || item.resourceId?.slice(0, 8);
    if (action === 'CONFIRM' || action === 'ORDER_CONFIRM') {
      return {
        title: `Xác nhận đơn hàng #${orderCode}`,
        subtitle: 'Đơn hàng đã chuyển sang trạng thái đã xác nhận',
      };
    }
    if (action === 'PREPARE' || action === 'ORDER_PREPARE') {
      return {
        title: `Chuẩn bị đóng gói đơn hàng #${orderCode}`,
        subtitle: 'Đơn hàng đã chuyển sang trạng thái chuẩn bị đóng gói',
      };
    }
    if (action === 'SHIP') {
      return {
        title: `Bàn giao đơn hàng #${orderCode} cho bưu tá`,
        subtitle: 'Đơn hàng đang trong quá trình vận chuyển',
      };
    }
    if (action === 'CANCEL') {
      return {
        title: `Hủy đơn hàng #${orderCode}`,
        subtitle: 'Đơn hàng đã được ghi nhận hủy',
      };
    }
  }

  const resName = item.resource === 'Member' ? 'Nhân sự' : item.resource === 'Product' ? 'Sản phẩm' : item.resource === 'Order' ? 'Đơn hàng' : item.resource;
  return {
    title: `${resName} ${item.metadata?.staffName || item.metadata?.bookTitle || (item.resourceId ? '#' + item.resourceId.slice(0, 8) : '')}`.trim(),
    subtitle: item.description,
  };
}

function resolveActorInfo(item: AuditLogItem, currentUser: any, staffList?: AuditStaffOption[]) {
  const currentUserId = currentUser?.id || currentUser?.sub;
  const isSelf = Boolean(currentUserId && item.actorId && item.actorId === currentUserId);

  let displayName = item.actorName || item.metadata?.actorName || '';
  let displayEmail = item.actorEmail || item.metadata?.actorEmail || '';

  if (!displayName && staffList && staffList.length > 0) {
    const matched = staffList.find((s) => s.userId === item.actorId || s.id === item.actorId);
    if (matched) {
      displayName = matched.fullName || matched.email || '';
      displayEmail = displayEmail || matched.email || '';
    }
  }

  if (!displayName) {
    if (item.actorRole === 'OWNER') displayName = 'Chủ sở hữu gian hàng';
    else if (item.actorRole === 'ADMIN') displayName = 'Quản trị viên';
    else displayName = item.actorRole ? `Nhân sự (${item.actorRole})` : 'Nhân sự hệ thống';
  }

  const roleRaw = item.actorRole || 'STAFF';
  const displayRole = ROLE_LABEL_MAP[roleRaw] || (roleRaw === 'OWNER' ? 'Chủ sở hữu' : roleRaw);

  return {
    displayName,
    displayEmail,
    displayRole,
    isSelf,
  };
}

function resolveTargetInfo(item: AuditLogItem): { targetLabel: string; targetSub?: string } {
  const resource = (item.resource || '').toUpperCase();
  const isMember = resource === 'MEMBER' || resource === 'STAFF' || resource === 'INVITATION';

  if (isMember) {
    const name = item.metadata?.staffName || item.stateAfter?.fullName || item.stateBefore?.fullName || 'Nhân sự';
    const email = item.metadata?.staffEmail || item.stateAfter?.email || item.stateBefore?.email;
    return {
      targetLabel: `Nhân sự: ${name}`,
      targetSub: email,
    };
  }

  if (resource === 'ORDER' || item.resource === 'Order') {
    const orderCode = item.metadata?.orderCode || item.resourceId?.slice(0, 8);
    return {
      targetLabel: `Đơn hàng #${orderCode}`,
    };
  }

  if (resource === 'PRODUCT' || item.resource === 'Product') {
    const title = item.metadata?.bookTitle || item.stateAfter?.title || item.resourceId?.slice(0, 8);
    return {
      targetLabel: `Sản phẩm`,
      targetSub: title,
    };
  }

  return {
    targetLabel: item.resource || 'Tài nguyên',
    targetSub: item.resourceId ? `#${item.resourceId.slice(0, 8)}` : undefined,
  };
}

function renderActionSummary(item: AuditLogItem, actor: any): { badge: React.ReactNode; sentence: React.ReactNode } {
  const badgeConfig = getActionBadgeStyle(item.action);
  const action = (item.action || '').toUpperCase();
  const resource = (item.resource || '').toUpperCase();
  const isMember = resource === 'MEMBER' || resource === 'STAFF' || resource === 'INVITATION';

  const badge = (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badgeConfig.className}`}>
      <span className="material-symbols-outlined text-[13px]">{badgeConfig.icon}</span>
      <span>{badgeConfig.label}</span>
    </span>
  );

  let sentence: React.ReactNode = null;
  const targetName = item.metadata?.staffName || item.stateAfter?.fullName || item.stateBefore?.fullName || '';
  const targetEmail = item.metadata?.staffEmail || item.stateAfter?.email || item.stateBefore?.email || '';

  if (isMember) {
    if (action === 'INVITE' || action === 'PROVISION' || action === 'CREATE') {
      sentence = (
        <span>
          Đã cấp tài khoản mới cho <strong className="font-semibold text-slate-900">{targetName || 'nhân viên mới'}</strong>
          {targetEmail && <span className="text-slate-500 font-normal"> ({targetEmail})</span>}
        </span>
      );
    } else if (action === 'PERMISSION_CHANGE') {
      sentence = (
        <span>
          Đã cập nhật quyền hạn cho <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
        </span>
      );
    } else if (action === 'ROLE_CHANGE') {
      sentence = (
        <span>
          Đã thay đổi vai trò của <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
        </span>
      );
    } else if (action === 'DELETE') {
      sentence = (
        <span>
          Đã xóa tài khoản nhân viên <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
        </span>
      );
    } else if (action === 'PIN_CHANGE' || action === 'PASSWORD_RESET' || item.stateAfter?.passwordReset || item.stateAfter?.passwordUpdated) {
      sentence = (
        <span>
          Đã đặt lại mật khẩu cho <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
        </span>
      );
    } else if (item.stateAfter?.status === 'SUSPENDED') {
      sentence = (
        <span>
          Đã tạm khóa tài khoản của <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
        </span>
      );
    } else if (item.stateAfter?.status === 'ACTIVE') {
      sentence = (
        <span>
          Đã mở khóa tài khoản cho <strong className="font-semibold text-slate-900">{targetName || 'nhân sự'}</strong>
        </span>
      );
    } else {
      sentence = (
        <span>
          Đã cập nhật thông tin nhân sự <strong className="font-semibold text-slate-900">{targetName || ''}</strong>
        </span>
      );
    }
  } else if (resource === 'ORDER' || item.resource === 'Order') {
    const orderCode = item.metadata?.orderCode || item.resourceId?.slice(0, 8);
    if (action === 'CONFIRM' || action === 'ORDER_CONFIRM') {
      sentence = (
        <span>
          Đã <strong className="font-semibold text-emerald-700">xác nhận đơn hàng</strong>{' '}
          <span className="font-mono font-bold text-slate-900 text-xs">#{orderCode}</span>
        </span>
      );
    } else if (action === 'PREPARE' || action === 'ORDER_PREPARE') {
      sentence = (
        <span>
          Đã chuyển đơn hàng sang trạng thái <strong className="font-semibold text-blue-700">chuẩn bị đóng gói</strong>{' '}
          <span className="font-mono font-bold text-slate-900 text-xs">#{orderCode}</span>
        </span>
      );
    } else if (action === 'SHIP') {
      sentence = (
        <span>
          Đã bàn giao đơn hàng cho <strong className="font-semibold text-indigo-700">đơn vị vận chuyển</strong>{' '}
          <span className="font-mono font-bold text-slate-900 text-xs">#{orderCode}</span>
        </span>
      );
    } else if (action === 'CANCEL') {
      sentence = (
        <span>
          Đã <strong className="font-semibold text-rose-700">hủy đơn hàng</strong>{' '}
          <span className="font-mono font-bold text-slate-900 text-xs">#{orderCode}</span>
        </span>
      );
    } else {
      sentence = (
        <span>
          Đã cập nhật trạng thái đơn hàng <span className="font-mono font-bold text-slate-900 text-xs">#{orderCode}</span>
        </span>
      );
    }
  } else {
    sentence = (
      <span>
        Đã thực hiện thao tác trên {item.resource}{' '}
        {item.resourceId && <span className="font-mono text-slate-500 text-xs">#{item.resourceId.slice(0, 8)}</span>}
      </span>
    );
  }

  return { badge, sentence };
}

export default function AuditHistoryTimeline({
  items,
  staffList = [],
  loading = false,
  error = null,
  onRetry,
  emptyTitle = 'Chưa có nhật ký ghi nhận',
  emptyMessage = 'Toàn bộ thao tác cấp tài khoản, đổi vai trò, phân quyền hoặc duyệt đơn sẽ được hiển thị minh bạch tại đây.',
  title = 'Lịch Sử Thao Tác Phân Quyền & Quản Trị Nhân Sự',
  description = 'Theo dõi toàn bộ nhật ký cấp tài khoản, cập nhật vai trò, phân quyền hoặc xóa tài khoản nhân sự trong Doanh nghiệp.',
  className = '',
}: AuditHistoryTimelineProps) {
  const { user: currentUser } = useAuth();

  // Filter States
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('ALL');
  const [selectedStaff, setSelectedStaff] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '7DAYS' | '30DAYS' | 'CUSTOM'>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 10;

  // Filter staff options
  const staffOptions = useMemo(() => {
    const map = new Map<string, string>();
    staffList.forEach((s) => {
      const id = s.userId || s.id;
      if (id) {
        map.set(id, s.fullName ? `${s.fullName} (${s.email})` : s.email || id);
      }
    });

    items.forEach((item) => {
      if (item.actorId && !map.has(item.actorId)) {
        const name = item.actorName || item.metadata?.actorName;
        const email = item.actorEmail || item.metadata?.actorEmail;
        map.set(item.actorId, name ? `${name} (${email || item.actorRole})` : email || `ID: ${item.actorId.slice(0, 8)}`);
      }
      const targetId = item.stateAfter?.userId || item.stateAfter?.id || item.metadata?.staffId;
      if (targetId && !map.has(targetId)) {
        const name = item.metadata?.staffName || item.stateAfter?.fullName;
        const email = item.metadata?.staffEmail || item.stateAfter?.email;
        map.set(targetId, name ? `${name} (${email || 'Nhân sự'})` : email || `ID: ${targetId.slice(0, 8)}`);
      }
    });

    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
  }, [items, staffList]);

  // Action categories for dropdown
  const featureCategories = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: items.length,
      PROVISION: 0,
      ROLE_CHANGE: 0,
      PERMISSION_CHANGE: 0,
      PASSWORD_RESET: 0,
      STATUS_CHANGE: 0,
      ORDER_PROCESS: 0,
      DELETE: 0,
    };

    items.forEach((item) => {
      const act = (item.action || '').toUpperCase();
      const res = (item.resource || '').toUpperCase();

      if (act === 'PROVISION' || act === 'INVITE' || act === 'CREATE') {
        counts.PROVISION = (counts.PROVISION || 0) + 1;
      } else if (act === 'ROLE_CHANGE') {
        counts.ROLE_CHANGE = (counts.ROLE_CHANGE || 0) + 1;
      } else if (act === 'PERMISSION_CHANGE') {
        counts.PERMISSION_CHANGE = (counts.PERMISSION_CHANGE || 0) + 1;
      } else if (act === 'PIN_CHANGE' || act === 'PASSWORD_RESET') {
        counts.PASSWORD_RESET = (counts.PASSWORD_RESET || 0) + 1;
      } else if (act === 'SUSPEND' || act === 'ACTIVATE' || act === 'STATUS_CHANGE') {
        counts.STATUS_CHANGE = (counts.STATUS_CHANGE || 0) + 1;
      } else if (res === 'ORDER' || act === 'CONFIRM' || act === 'PREPARE' || act === 'SHIP') {
        counts.ORDER_PROCESS = (counts.ORDER_PROCESS || 0) + 1;
      } else if (act === 'DELETE') {
        counts.DELETE = (counts.DELETE || 0) + 1;
      }
    });

    return [
      { id: 'ALL', label: 'Tất cả tác vụ', count: counts.ALL },
      { id: 'PROVISION', label: 'Cấp Tài Khoản Mới', count: counts.PROVISION },
      { id: 'ROLE_CHANGE', label: 'Đổi Vai Trò', count: counts.ROLE_CHANGE },
      { id: 'PERMISSION_CHANGE', label: 'Đổi Quyền Hạn', count: counts.PERMISSION_CHANGE },
      { id: 'PASSWORD_RESET', label: 'Đặt Lại Mật Khẩu / PIN', count: counts.PASSWORD_RESET },
      { id: 'STATUS_CHANGE', label: 'Khóa / Mở Khóa Tài Khoản', count: counts.STATUS_CHANGE },
      { id: 'ORDER_PROCESS', label: 'Xử Lý Đơn Hàng', count: counts.ORDER_PROCESS },
      { id: 'DELETE', label: 'Xóa Tài Khoản', count: counts.DELETE },
    ].filter((c) => c.id === 'ALL' || c.count > 0);
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Keyword search
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const actorName = (item.actorName || '').toLowerCase();
        const actorEmail = (item.actorEmail || '').toLowerCase();
        const action = (item.action || '').toLowerCase();
        const id = (item.id || '').toLowerCase();
        const targetName = (item.metadata?.staffName || item.stateAfter?.fullName || '').toLowerCase();
        const targetEmail = (item.metadata?.staffEmail || item.stateAfter?.email || '').toLowerCase();
        const orderCode = (item.metadata?.orderCode || item.resourceId || '').toLowerCase();

        const match =
          actorName.includes(kw) ||
          actorEmail.includes(kw) ||
          action.includes(kw) ||
          id.includes(kw) ||
          targetName.includes(kw) ||
          targetEmail.includes(kw) ||
          orderCode.includes(kw);

        if (!match) return false;
      }

      // 2. Action filter
      if (selectedAction !== 'ALL') {
        const act = (item.action || '').toUpperCase();
        const res = (item.resource || '').toUpperCase();

        if (selectedAction === 'PROVISION' && !['PROVISION', 'INVITE', 'CREATE'].includes(act)) return false;
        if (selectedAction === 'ROLE_CHANGE' && act !== 'ROLE_CHANGE') return false;
        if (selectedAction === 'PERMISSION_CHANGE' && act !== 'PERMISSION_CHANGE') return false;
        if (selectedAction === 'PASSWORD_RESET' && !['PIN_CHANGE', 'PASSWORD_RESET'].includes(act) && !item.stateAfter?.passwordReset) return false;
        if (selectedAction === 'STATUS_CHANGE' && !['SUSPEND', 'ACTIVATE', 'STATUS_CHANGE'].includes(act)) return false;
        if (selectedAction === 'ORDER_PROCESS' && res !== 'ORDER' && !['CONFIRM', 'PREPARE', 'SHIP'].includes(act)) return false;
        if (selectedAction === 'DELETE' && act !== 'DELETE') return false;
      }

      // 3. Staff filter
      if (selectedStaff !== 'ALL') {
        const isActor = item.actorId === selectedStaff;
        const isTarget = item.stateAfter?.userId === selectedStaff || item.stateAfter?.id === selectedStaff || item.metadata?.staffId === selectedStaff;
        if (!isActor && !isTarget) return false;
      }

      // 4. Date filter
      if (dateFilter !== 'ALL') {
        const itemDate = new Date(item.timestamp);
        const now = new Date();

        if (dateFilter === 'TODAY') {
          const isToday =
            itemDate.getDate() === now.getDate() &&
            itemDate.getMonth() === now.getMonth() &&
            itemDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === '7DAYS') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        } else if (dateFilter === '30DAYS') {
          const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) return false;
        } else if (dateFilter === 'CUSTOM') {
          if (startDate && new Date(startDate) > itemDate) return false;
          if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (end < itemDate) return false;
          }
        }
      }

      return true;
    });
  }, [items, searchKeyword, selectedAction, selectedStaff, dateFilter, startDate, endDate]);

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;

  const resetFilters = useCallback(() => {
    setSearchKeyword('');
    setSelectedAction('ALL');
    setSelectedStaff('ALL');
    setDateFilter('ALL');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  }, []);

  const hasActiveFilters =
    searchKeyword.trim() !== '' ||
    selectedAction !== 'ALL' ||
    selectedStaff !== 'ALL' ||
    dateFilter !== 'ALL';

  // Define Table Columns (Removed IP & technical trace hash column completely)
  const columns: Column<AuditLogItem>[] = useMemo(() => [
    {
      key: 'timestamp',
      title: 'Thời gian',
      width: '150px',
      render: (_, item) => (
        <div className="flex flex-col">
          <span className="font-semibold text-xs text-slate-800">
            {formatAuditDateOnly(item.timestamp)}
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            {formatAuditTimeOnly(item.timestamp)}
          </span>
        </div>
      ),
    },
    {
      key: 'actor',
      title: 'Người thực hiện',
      width: '230px',
      render: (_, item) => {
        const actor = resolveActorInfo(item, currentUser, staffList);
        return (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 font-bold text-slate-700 text-xs">
              {actor.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-900 truncate max-w-[130px] text-xs">
                  {actor.displayName}
                </span>
                {actor.isSelf && (
                  <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-slate-100 text-slate-600 shrink-0">
                    Bạn
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 truncate">
                {actor.displayRole}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'action',
      title: 'Tác vụ & Sự kiện',
      render: (_, item) => {
        const actor = resolveActorInfo(item, currentUser, staffList);
        const { badge, sentence } = renderActionSummary(item, actor);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {badge}
            </div>
            <div className="text-xs text-slate-700 leading-relaxed">
              {sentence}
            </div>
          </div>
        );
      },
    },
    {
      key: 'resource',
      title: 'Đối tượng',
      width: '200px',
      render: (_, item) => {
        const { targetLabel, targetSub } = resolveTargetInfo(item);
        return (
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
              {targetLabel}
            </span>
            {targetSub && (
              <div className="text-[10.5px] text-slate-400 mt-0.5 truncate max-w-[180px]">
                {targetSub}
              </div>
            )}
          </div>
        );
      },
    },
  ], [currentUser, staffList]);

  // Render Detailed Content when row expands via arrow button (Clean & 100% Seller friendly)
  const renderExpandedDetail = useCallback((item: AuditLogItem) => {
    const action = (item.action || '').toUpperCase();
    const resource = (item.resource || '').toUpperCase();
    const isMemberResource = resource === 'MEMBER' || resource === 'STAFF' || resource === 'INVITATION';
    const isOrderResource = resource === 'ORDER' || item.resource === 'Order';

    const friendly = getFriendlyActionTitle(item);
    const actor = resolveActorInfo(item, currentUser, staffList);

    const roleAfter = item.stateAfter?.role ? (ROLE_LABEL_MAP[item.stateAfter.role] || item.stateAfter.role) : '';
    const roleBefore = item.stateBefore?.role ? (ROLE_LABEL_MAP[item.stateBefore.role] || item.stateBefore.role) : '';

    const permsAfter: string[] = Array.isArray(item.stateAfter?.permissions) ? item.stateAfter.permissions : [];
    const permsBefore: string[] = Array.isArray(item.stateBefore?.permissions) ? item.stateBefore.permissions : [];

    const addedPerms = permsAfter.filter((p) => !permsBefore.includes(p));
    const removedPerms = permsBefore.filter((p) => !permsAfter.includes(p));

    return (
      <div className="space-y-3.5">
        {/* Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-blue-600 text-[17px]">info</span>
              <span>{friendly.title}</span>
            </h4>
            {friendly.subtitle && (
              <p className="text-[11.5px] text-slate-500 mt-0.5">{friendly.subtitle}</p>
            )}
          </div>
          <div className="text-xs text-slate-400">
            <span>Thời gian: <strong className="font-medium text-slate-600">{formatAuditTime(item.timestamp)}</strong></span>
          </div>
        </div>

        {/* Business Change Details */}
        {isMemberResource && (
          <div className="space-y-3">
            {/* If Provision / Create */}
            {(action === 'INVITE' || action === 'PROVISION' || action === 'CREATE') && (
              <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/60 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Họ và tên nhân sự:</span>
                    <span className="font-semibold text-slate-900 text-xs">
                      {item.stateAfter?.fullName || item.metadata?.staffName || '(Trống)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Email đăng nhập:</span>
                    <span className="font-medium text-slate-800 text-xs">
                      {item.stateAfter?.email || item.metadata?.staffEmail || '(Trống)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Vai trò chức danh:</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                      {roleAfter || 'Nhân sự vận hành'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Trạng thái tài khoản:</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Đang hoạt động
                    </span>
                  </div>
                </div>

                {/* Permissions Breakdown */}
                {permsAfter.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <div className="text-[11.5px] font-bold text-slate-700 mb-2">
                      Danh sách quyền hạn được cấp ({permsAfter.length} chức năng):
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {permsAfter.map((perm) => (
                        <div
                          key={perm}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200/80 text-xs text-slate-700 shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-emerald-600 text-[15px] shrink-0 font-bold">
                            check_circle
                          </span>
                          <span className="truncate">{PERMISSION_LABEL_MAP[perm] || perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* If Role change */}
            {action === 'ROLE_CHANGE' && (
              <div className="flex items-center gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                <span className="text-slate-500">Vai trò chức danh:</span>
                {roleBefore && <span className="line-through text-slate-400">{roleBefore}</span>}
                {roleBefore && <span className="text-slate-400">&rarr;</span>}
                <span className="font-bold text-slate-900 bg-white px-2.5 py-1 rounded border border-slate-200">
                  {roleAfter}
                </span>
              </div>
            )}

            {/* If Permission change */}
            {action === 'PERMISSION_CHANGE' && (
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/60 text-xs">
                {addedPerms.length > 0 && (
                  <div>
                    <span className="text-emerald-700 font-bold block mb-1.5">+ Quyền được bổ sung ({addedPerms.length}):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {addedPerms.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[11px]"
                        >
                          <span>+</span>
                          <span>{PERMISSION_LABEL_MAP[p] || p}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {removedPerms.length > 0 && (
                  <div>
                    <span className="text-rose-700 font-bold block mb-1.5">- Quyền bị thu hồi ({removedPerms.length}):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {removedPerms.map((p) => (
                        <span
                          key={p}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 line-through font-medium text-[11px]"
                        >
                          <span>-</span>
                          <span>{PERMISSION_LABEL_MAP[p] || p}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* If Order Resource */}
        {isOrderResource && (
          <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/60 space-y-2.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <span className="text-slate-400 block text-[11px]">Mã đơn hàng:</span>
                <span className="font-mono font-bold text-slate-900 text-xs">
                  #{item.metadata?.orderCode || item.resourceId}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Trạng thái đơn hàng:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {item.stateBefore?.status && (
                    <>
                      <span className="text-slate-400 line-through text-[11px]">{item.stateBefore.status}</span>
                      <span className="text-slate-400">&rarr;</span>
                    </>
                  )}
                  <span className="font-bold text-blue-700 text-xs">{item.stateAfter?.status || action}</span>
                </div>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Nhân viên xử lý:</span>
                <span className="font-semibold text-slate-900 text-xs">
                  {actor.displayName} ({actor.displayRole})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Generic diff if neither member nor order */}
        {!isMemberResource && !isOrderResource && (item.stateBefore || item.stateAfter) && (
          <div className="bg-slate-50/70 rounded-xl p-3 border border-slate-200/60 text-xs space-y-1">
            <div className="text-[11px] font-bold text-slate-500 mb-1">Chi tiết các trường thay đổi:</div>
            {Object.keys(item.stateAfter || {}).filter(k => !TECHNICAL_KEYS.has(k)).map(k => (
              <div key={k} className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">• {FIELD_LABEL_MAP[k] || k}:</span>
                {item.stateBefore?.[k] !== undefined && (
                  <span className="line-through text-slate-400 mr-1">{String(item.stateBefore[k])} &rarr;</span>
                )}
                <span className="font-semibold text-slate-900">{String(item.stateAfter?.[k] ?? '')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Note / Description if present */}
        {item.description && (
          <div className="text-xs text-slate-500 italic pt-1">
            Ghi chú: {item.description}
          </div>
        )}
      </div>
    );
  }, [currentUser, staffList]);

  return (
    <div className={`w-full rounded-2xl border border-theme-border bg-theme-surface shadow-2xs overflow-hidden ${className}`}>
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
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm kiếm theo người thực hiện, nhân sự, tác vụ, ID..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white rounded-lg border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-all shadow-2xs"
              />
              {searchKeyword && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchKeyword('');
                    setCurrentPage(1);
                  }}
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

            {/* Staff Member Dropdown Filter */}
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

          {/* Custom Date Range Picker */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 animate-in fade-in duration-150">
              <span className="text-[11px] font-bold text-slate-600">Từ ngày:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1 text-xs bg-white rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
              <span className="text-[11px] font-bold text-slate-600">Đến ngày:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
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
                      onClick={() => {
                        setSelectedAction('ALL');
                        setCurrentPage(1);
                      }}
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
                      onClick={() => {
                        setSelectedStaff('ALL');
                        setCurrentPage(1);
                      }}
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
                        setCurrentPage(1);
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
                      onClick={() => {
                        setSearchKeyword('');
                        setCurrentPage(1);
                      }}
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
      <div className="p-4 sm:p-5">
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
          /* Rendered via GroupedDataTable: No checkboxes, No technical clutter */
          <GroupedDataTable<AuditLogItem>
            columns={columns}
            data={filteredItems}
            keyField="id"
            expandable={true}
            selectable={false}
            pagination={{
              currentPage,
              totalPages,
              totalItems: filteredItems.length,
              pageSize,
              onPageChange: setCurrentPage,
              itemLabel: 'nhật ký',
            }}
            expandedRowRender={renderExpandedDetail}
            emptyMessage="Không có dữ liệu nhật ký phù hợp"
            containerClassName="border-0 shadow-none"
          />
        )}
      </div>
    </div>
  );
}
