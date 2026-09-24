"use client";

import React from 'react';

/**
 * 1. AdminStatusBadge
 * Pill badge bo tròn (rounded-full) với dot màu và typography chuẩn Be Vietnam Pro (text-[11px] font-semibold)
 */
export type AdminStatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';

export interface AdminStatusBadgeProps {
  variant?: AdminStatusVariant;
  status?: string;
  label?: string;
  icon?: string;
  dot?: boolean;
  className?: string;
  title?: string;
}

const variantStyles: Record<AdminStatusVariant, { bg: string; text: string; border: string; dotColor: string }> = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/60',
    dotColor: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200/60',
    dotColor: 'bg-amber-500',
  },
  danger: {
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200/60',
    dotColor: 'bg-rose-500',
  },
  info: {
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200/60',
    dotColor: 'bg-sky-500',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200/60',
    dotColor: 'bg-purple-500',
  },
  neutral: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200/70',
    dotColor: 'bg-gray-400',
  },
};

const statusToVariantMap: Record<string, AdminStatusVariant> = {
  APPROVED: 'success',
  ACTIVE: 'success',
  RESOLVED: 'success',
  COMPLETED: 'success',
  PAID: 'success',
  SUCCESS: 'success',
  RELEASED: 'success',
  OPERATIONAL: 'success',
  VALID: 'success',
  SECURE: 'success',
  LIVE: 'success',
  SCHEDULED: 'success',
  UNLOCKED: 'success',

  PENDING: 'warning',
  PENDING_APPROVAL: 'warning',
  PROCESSING: 'warning',
  INVESTIGATING: 'warning',
  WARNING: 'warning',
  HOLDING: 'warning',
  UPGRADE_NEEDED: 'warning',
  EXPIRING_SOON: 'warning',

  REJECTED: 'danger',
  BANNED: 'danger',
  SUSPENDED: 'danger',
  FAILED: 'danger',
  CANCELLED: 'danger',
  DANGER: 'danger',
  FROZEN: 'danger',
  REVOKED: 'danger',
  DISPUTED: 'danger',
  EXPIRED: 'danger',
  LOCKED: 'danger',

  REFUNDED: 'info',
  INFO: 'info',
  SUBMITTED: 'info',
  DRAFT: 'info',
  CLOSED: 'info',
  SELLER_ACCEPTED: 'info',

  DRM: 'purple',
  EXCLUSIVE: 'purple',
  PURPLE: 'purple',
};

const statusLabels: Record<string, string> = {
  APPROVED: 'Đang Hoạt Động',
  ACTIVE: 'Đang Hoạt Động',
  RESOLVED: 'Đã Giải Quyết',
  COMPLETED: 'Hoàn Tất',
  PAID: 'Đã Thanh Toán',
  SUCCESS: 'Thành Công',
  RELEASED: 'Đã Giải Ngân',
  OPERATIONAL: 'Vận Hành Ổn Định',
  VALID: 'Hợp Lệ',
  SECURE: 'An Toàn Tuyệt Đối',
  LIVE: 'Đang Diễn Ra',
  UNLOCKED: 'Hoạt Động Bình Thường',

  PENDING: 'Chờ Xử Lý',
  PENDING_APPROVAL: 'Chờ Xét Duyệt',
  PROCESSING: 'Đang Xử Lý',
  INVESTIGATING: 'Đang Xác Minh',
  WARNING: 'Cảnh Báo',
  HOLDING: 'Đang Tạm Giữ',
  UPGRADE_NEEDED: 'Cần Nâng Cấp',
  EXPIRING_SOON: 'Sắp Hết Hạn',

  REJECTED: 'Đã Từ Chối',
  BANNED: 'Đã Khóa Vĩnh Viễn',
  SUSPENDED: 'Tạm Khóa',
  FAILED: 'Thất Bại',
  CANCELLED: 'Đã Hủy',
  FROZEN: 'Đóng Băng Dòng Tiền',
  REVOKED: 'Đã Thu Hồi',
  DISPUTED: 'Đang Khiếu Nại',
  EXPIRED: 'Đã Hết Hạn',
  LOCKED: 'Đang Bị Khóa',

  REFUNDED: 'Đã Hoàn Tiền',
  SUBMITTED: 'Đã Tiếp Nhận',
  DRAFT: 'Bản Nháp',
  CLOSED: 'Đã Đóng',
};

export function AdminStatusBadge({
  variant,
  status,
  label,
  icon,
  dot = true,
  className = '',
  title,
}: AdminStatusBadgeProps) {
  const finalVariant: AdminStatusVariant =
    variant ||
    (status ? statusToVariantMap[status.toUpperCase()] || 'neutral' : 'neutral');

  const finalLabel = label || (status ? statusLabels[status.toUpperCase()] || status : 'N/A');
  const st = variantStyles[finalVariant] || variantStyles.neutral;

  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold tracking-tight whitespace-nowrap ${st.bg} ${st.text} ${st.border} ${className}`}
    >
      {icon ? (
        <span className="material-symbols-outlined text-[13px]">{icon}</span>
      ) : dot ? (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${st.dotColor}`} />
      ) : null}
      <span>{finalLabel}</span>
    </span>
  );
}

/**
 * 2. AdminFilterTabs
 * Bộ Tab lọc trạng thái chuẩn có badge đếm số lượng
 */
export interface AdminFilterTabItem {
  id?: string;
  key?: string;
  label: string;
  count?: number | string;
  color?: string;
}

export interface AdminFilterTabsProps {
  tabs: AdminFilterTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  counts?: Record<string, number | string>;
  className?: string;
}

export function AdminFilterTabs({
  tabs,
  activeTab,
  onChange,
  counts,
  className = '',
}: AdminFilterTabsProps) {
  return (
    <div className={`flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 custom-scrollbar ${className}`}>
      {tabs.map((tab) => {
        const tabId = tab.id || tab.key || '';
        const isActive = activeTab === tabId;
        const displayCount = tab.count !== undefined ? tab.count : (counts ? counts[tabId] : undefined);

        return (
          <button
            key={tabId}
            type="button"
            onClick={() => onChange(tabId)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-[#00875A] text-white shadow-2xs font-bold'
                : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 border border-gray-200/70'
            }`}
          >
            <span>{tab.label}</span>
            {displayCount !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black transition-colors ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                }`}
              >
                {displayCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 3. AdminPagination
 * Thanh phân trang mềm mại luôn hiển thị mặc định ở chân bảng (tối đa 10 item/trang)
 */
export interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemLabel = 'mục',
  className = '',
}: AdminPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  // Tính toán dải số trang hiển thị
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, '...', safeTotalPages);
      } else if (safeCurrentPage >= safeTotalPages - 3) {
        pages.push(1, '...', safeTotalPages - 4, safeTotalPages - 3, safeTotalPages - 2, safeTotalPages - 1, safeTotalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', safeTotalPages);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();
  const startIdx = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIdx = Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div className={`p-3 sm:px-4 sm:py-3 bg-white border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500 font-sans select-none ${className}`}>
      {/* Thông tin số lượng */}
      <div className="text-[11.5px] font-medium text-gray-600 whitespace-nowrap">
        Hiển thị <strong className="text-gray-900 font-bold">{totalItems === 0 ? 0 : `${startIdx} - ${endIdx}`}</strong> / <strong className="text-gray-900 font-bold">{totalItems}</strong> {itemLabel}
      </div>

      {/* Điều hướng phân trang */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Nút Trang trước */}
        <button
          type="button"
          disabled={safeCurrentPage <= 1}
          onClick={() => onPageChange(safeCurrentPage - 1)}
          className={`px-2.5 py-1.2 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
            safeCurrentPage <= 1
              ? 'opacity-40 border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
              : 'border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer bg-white shadow-2xs'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">chevron_left</span>
          <span>Trang trước</span>
        </button>

        {/* Danh sách các trang */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-gray-400 font-bold text-xs">
                  ...
                </span>
              );
            }
            const pageNum = p as number;
            const isCurrent = pageNum === safeCurrentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                  isCurrent
                    ? 'bg-[#00875A] text-white shadow-2xs'
                    : 'text-gray-700 hover:bg-gray-100 border border-gray-200/70 bg-white'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Nút Trang sau */}
        <button
          type="button"
          disabled={safeCurrentPage >= safeTotalPages}
          onClick={() => onPageChange(safeCurrentPage + 1)}
          className={`px-2.5 py-1.2 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
            safeCurrentPage >= safeTotalPages
              ? 'opacity-40 border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
              : 'border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer bg-white shadow-2xs'
          }`}
        >
          <span>Trang sau</span>
          <span className="material-symbols-outlined text-[15px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

/**
 * 4. AdminTableContainer
 * Khung chứa chuẩn có bo góc, viền nhẹ và cuộn ngang
 */
export function AdminTableContainer({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs overflow-hidden ${className}`}>
      <div className="overflow-x-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
}

/**
 * 5. AdminActionButton
 * Bộ nút thao tác mềm mại chuẩn dùng chung cho tất cả các bảng quản trị
 */
export type AdminActionVariant =
  | 'view'
  | 'edit'
  | 'lock'
  | 'unlock'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'neutral';

export interface AdminActionButtonProps {
  variant?: AdminActionVariant;
  label?: string;
  icon?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  title?: string;
  size?: 'sm' | 'md';
  className?: string;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const actionVariantStyles: Record<
  AdminActionVariant,
  { bg: string; text: string; border: string; iconColor: string; shadow: string }
> = {
  view: {
    bg: 'bg-slate-50/80 hover:bg-slate-100',
    text: 'text-slate-700 hover:text-slate-900',
    border: 'border-slate-200/70 hover:border-slate-300',
    iconColor: 'text-slate-500 group-hover:text-slate-800',
    shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
  },
  info: {
    bg: 'bg-sky-50/80 hover:bg-sky-100',
    text: 'text-sky-700 hover:text-sky-900',
    border: 'border-sky-200/70 hover:border-sky-300',
    iconColor: 'text-sky-600',
    shadow: 'shadow-[0_1px_2px_rgba(14,165,233,0.04)]',
  },
  edit: {
    bg: 'bg-amber-50/80 hover:bg-amber-100',
    text: 'text-amber-800 hover:text-amber-950',
    border: 'border-amber-200/70 hover:border-amber-300',
    iconColor: 'text-amber-600',
    shadow: 'shadow-[0_1px_2px_rgba(245,158,11,0.04)]',
  },
  warning: {
    bg: 'bg-amber-50/80 hover:bg-amber-100',
    text: 'text-amber-800 hover:text-amber-950',
    border: 'border-amber-200/70 hover:border-amber-300',
    iconColor: 'text-amber-600',
    shadow: 'shadow-[0_1px_2px_rgba(245,158,11,0.04)]',
  },
  lock: {
    bg: 'bg-rose-50/70 hover:bg-rose-100',
    text: 'text-rose-700 hover:text-rose-900',
    border: 'border-rose-200/60 hover:border-rose-300',
    iconColor: 'text-rose-600',
    shadow: 'shadow-[0_1px_2px_rgba(244,63,94,0.04)]',
  },
  danger: {
    bg: 'bg-rose-50/70 hover:bg-rose-100',
    text: 'text-rose-700 hover:text-rose-900',
    border: 'border-rose-200/60 hover:border-rose-300',
    iconColor: 'text-rose-600',
    shadow: 'shadow-[0_1px_2px_rgba(244,63,94,0.04)]',
  },
  unlock: {
    bg: 'bg-emerald-50/70 hover:bg-emerald-100',
    text: 'text-emerald-700 hover:text-emerald-900',
    border: 'border-emerald-200/60 hover:border-emerald-300',
    iconColor: 'text-emerald-600',
    shadow: 'shadow-[0_1px_2px_rgba(16,185,129,0.04)]',
  },
  success: {
    bg: 'bg-emerald-50/70 hover:bg-emerald-100',
    text: 'text-emerald-700 hover:text-emerald-900',
    border: 'border-emerald-200/60 hover:border-emerald-300',
    iconColor: 'text-emerald-600',
    shadow: 'shadow-[0_1px_2px_rgba(16,185,129,0.04)]',
  },
  neutral: {
    bg: 'bg-white hover:bg-gray-50',
    text: 'text-gray-700 hover:text-gray-900',
    border: 'border-gray-200/80 hover:border-gray-300',
    iconColor: 'text-gray-500',
    shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
  },
};

export function AdminActionButton({
  variant = 'view',
  label,
  icon,
  onClick,
  disabled = false,
  title,
  size = 'md',
  className = '',
  loading = false,
  type = 'button',
}: AdminActionButtonProps) {
  const st = actionVariantStyles[variant] || actionVariantStyles.view;
  const paddingClass = size === 'sm' ? 'px-2 py-1 text-[10.5px]' : 'px-2.5 py-1.25 text-[11.5px]';
  const iconSize = size === 'sm' ? 'text-[13.5px]' : 'text-[15px]';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title || label}
      className={`group inline-flex items-center justify-center gap-1.5 rounded-xl border font-semibold tracking-tight transition-all duration-150 ease-out select-none active:scale-[0.96] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${paddingClass} ${st.bg} ${st.text} ${st.border} ${st.shadow} ${className}`}
    >
      {loading ? (
        <span className={`material-symbols-outlined ${iconSize} animate-spin`}>refresh</span>
      ) : icon ? (
        <span className={`material-symbols-outlined ${iconSize} ${st.iconColor} transition-colors`}>{icon}</span>
      ) : null}
      {label && <span>{label}</span>}
    </button>
  );
}

