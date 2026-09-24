"use client";

import React from 'react';

/**
 * 1. SellerStatusBadge
 * Pill badge bo tròn (rounded-full) với dot màu và typography chuẩn Be Vietnam Pro (text-[11px] font-semibold)
 */
export type SellerStatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral';

export interface SellerStatusBadgeProps {
  variant?: SellerStatusVariant;
  status?: string;
  label?: string;
  text?: string;
  icon?: string;
  dot?: boolean;
  className?: string;
  title?: string;
  children?: React.ReactNode;
}

const variantStyles: Record<SellerStatusVariant, { bg: string; text: string; border: string; dotColor: string }> = {
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    border: 'border-emerald-200/60',
    dotColor: 'bg-emerald-500',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200/60',
    dotColor: 'bg-amber-500',
  },
  danger: {
    bg: 'bg-rose-50',
    text: 'text-rose-800',
    border: 'border-rose-200/60',
    dotColor: 'bg-rose-500',
  },
  info: {
    bg: 'bg-sky-50',
    text: 'text-sky-800',
    border: 'border-sky-200/60',
    dotColor: 'bg-sky-500',
  },
  purple: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-800',
    border: 'border-indigo-200/60',
    dotColor: 'bg-indigo-500',
  },
  neutral: {
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200/70',
    dotColor: 'bg-slate-400',
  },
};

const statusToVariantMap: Record<string, SellerStatusVariant> = {
  // Thành công / Hoàn tất
  APPROVED: 'success',
  ACTIVE: 'success',
  COMPLETED: 'success',
  DELIVERED: 'success',
  PAID: 'success',
  SUCCESS: 'success',
  RELEASED: 'success',
  CONFIRMED: 'success',
  AVAILABLE: 'success',

  // Chờ xử lý / Đang giao / Cảnh báo
  PENDING: 'warning',
  PENDING_CONFIRMATION: 'warning',
  PENDING_PAYMENT: 'warning',
  PROCESSING: 'warning',
  PREPARING: 'warning',
  SHIPPING: 'warning',
  IN_TRANSIT: 'warning',
  HOLDING: 'warning',
  LOW_STOCK: 'warning',

  // Hủy / Thất bại / Hết hàng / Khiếu nại
  CANCELLED: 'danger',
  REJECTED: 'danger',
  FAILED: 'danger',
  FROZEN: 'danger',
  RETURNED: 'danger',
  OUT_OF_STOCK: 'danger',
  DISPUTED: 'danger',
  SUSPENDED: 'danger',

  // Thông tin / Đổi trả / Hoàn tiền
  REFUNDED: 'info',
  DRAFT: 'neutral',
  INFO: 'info',
  RETURN_REQUESTED: 'info',
  EXCHANGED: 'info',
};

const statusLabels: Record<string, string> = {
  APPROVED: 'Đã Duyệt',
  ACTIVE: 'Đang Bán',
  COMPLETED: 'Hoàn Tất',
  DELIVERED: 'Đã Giao Hàng',
  PAID: 'Đã Thanh Toán',
  SUCCESS: 'Thành Công',
  RELEASED: 'Đã Nhận Tiền',
  CONFIRMED: 'Đã Xác Nhận',
  AVAILABLE: 'Còn Hàng',

  PENDING: 'Chờ Xử Lý',
  PENDING_CONFIRMATION: 'Chờ Xác Nhận',
  PENDING_PAYMENT: 'Chờ Thanh Toán',
  PROCESSING: 'Đang Xử Lý',
  PREPARING: 'Đang Chuẩn Bị Hàng',
  SHIPPING: 'Đang Giao Hàng',
  IN_TRANSIT: 'Đang Vận Chuyển',
  HOLDING: 'Đang Giữ Tiền (Ký Quỹ)',
  LOW_STOCK: 'Sắp Hết Hàng',

  CANCELLED: 'Đã Hủy',
  REJECTED: 'Từ Chối',
  FAILED: 'Thất Bại',
  FROZEN: 'Đóng Băng Dòng Tiền',
  RETURNED: 'Đã Trả Hàng',
  OUT_OF_STOCK: 'Hết Hàng',
  DISPUTED: 'Đang Khiếu Nại',
  SUSPENDED: 'Tạm Khóa',

  REFUNDED: 'Đã Hoàn Tiền',
  DRAFT: 'Bản Nháp',
  RETURN_REQUESTED: 'Yêu Cầu Đổi Trả',
  EXCHANGED: 'Đã Đổi Mới',
};

export function SellerStatusBadge({
  variant,
  status,
  label,
  text,
  icon,
  dot = true,
  className = '',
  title,
  children,
}: SellerStatusBadgeProps) {
  const finalVariant: SellerStatusVariant =
    variant ||
    (status ? statusToVariantMap[status.toUpperCase()] || 'neutral' : 'neutral');

  const finalLabel = children || label || text || (status ? statusLabels[status.toUpperCase()] || status : 'N/A');
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
 * 2. SellerFilterTabs
 * Bộ Tab lọc trạng thái chuẩn có badge đếm số lượng
 */
export interface SellerFilterTabItem {
  id?: string;
  key?: string;
  label: string;
  count?: number | string;
  color?: string;
}

export interface SellerFilterTabsProps {
  tabs: SellerFilterTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  counts?: Record<string, number | string>;
  className?: string;
}

export function SellerFilterTabs({
  tabs,
  activeTab,
  onChange,
  counts,
  className = '',
}: SellerFilterTabsProps) {
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
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer select-none active:scale-[0.98] ${
              isActive
                ? 'bg-[#00875A] text-white shadow-2xs font-bold'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200/80'
            }`}
          >
            <span>{tab.label}</span>
            {displayCount !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black transition-colors ${
                  isActive
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
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
 * 3. SellerPagination
 * Thanh phân trang mềm mại luôn hiển thị mặc định ở chân bảng (tối đa 10 item/trang)
 */
export interface SellerPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  className?: string;
}

export function SellerPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemLabel = 'mục',
  className = '',
}: SellerPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);
  const safeTotalItems = totalItems !== undefined ? totalItems : safeTotalPages * pageSize;

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
  const startIdx = safeTotalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endIdx = Math.min(safeCurrentPage * pageSize, safeTotalItems);

  return (
    <div className={`p-3 sm:px-4 sm:py-3 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-sans select-none ${className}`}>
      {/* Thông tin số lượng */}
      <div className="text-[11.5px] font-medium text-slate-600 whitespace-nowrap">
        Hiển thị <strong className="text-slate-900 font-bold">{safeTotalItems === 0 ? 0 : `${startIdx} - ${endIdx}`}</strong> / <strong className="text-slate-900 font-bold">{safeTotalItems}</strong> {itemLabel}
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
              ? 'opacity-40 border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
              : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer bg-white shadow-2xs active:scale-95'
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
                <span key={`ellipsis-${idx}`} className="px-1.5 py-1 text-slate-400 font-bold text-xs">
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
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer active:scale-95 ${
                  isCurrent
                    ? 'bg-[#00875A] text-white shadow-2xs'
                    : 'text-slate-700 hover:bg-slate-100 border border-slate-200 bg-white'
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
              ? 'opacity-40 border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50'
              : 'border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900 cursor-pointer bg-white shadow-2xs active:scale-95'
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
 * 4. SellerTableContainer
 * Khung chứa chuẩn có bo góc, viền nhẹ và cuộn ngang
 */
export function SellerTableContainer({
  children,
  className = '',
  minWidth = 'min-w-[1280px]',
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden ${className}`}>
      <div className={`overflow-x-auto custom-scrollbar ${minWidth}`}>
        {children}
      </div>
    </div>
  );
}

/**
 * 5. SellerActionButton
 * Bộ nút thao tác mềm mại chuẩn dùng chung cho Kênh Người Bán
 */
export type SellerActionVariant =
  | 'view'
  | 'edit'
  | 'lock'
  | 'unlock'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'purple'
  | 'neutral'
  | 'primary'
  | 'secondary'
  | 'ghost';

export interface SellerActionButtonProps {
  variant?: SellerActionVariant;
  label?: string;
  icon?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  title?: string;
  size?: 'sm' | 'md';
  className?: string;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children?: React.ReactNode;
}

const actionVariantStyles: Record<
  SellerActionVariant,
  { bg: string; text: string; border: string; iconColor: string; shadow: string }
> = {
  purple: {
    bg: 'bg-indigo-50/80 hover:bg-indigo-100',
    text: 'text-indigo-800 hover:text-indigo-950',
    border: 'border-indigo-200/70 hover:border-indigo-300',
    iconColor: 'text-indigo-600',
    shadow: 'shadow-[0_1px_2px_rgba(99,102,241,0.04)]',
  },
  primary: {
    bg: 'bg-[#00875A] hover:bg-[#00704A]',
    text: 'text-white hover:text-white',
    border: 'border-[#00875A]',
    iconColor: 'text-white',
    shadow: 'shadow-xs',
  },
  secondary: {
    bg: 'bg-white hover:bg-slate-50',
    text: 'text-slate-700 hover:text-slate-900',
    border: 'border-slate-200 hover:border-slate-300',
    iconColor: 'text-slate-500',
    shadow: 'shadow-2xs',
  },
  ghost: {
    bg: 'bg-transparent hover:bg-slate-100',
    text: 'text-slate-600 hover:text-slate-900',
    border: 'border-transparent',
    iconColor: 'text-slate-500',
    shadow: '',
  },
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
    bg: 'bg-white hover:bg-slate-50',
    text: 'text-slate-700 hover:text-slate-900',
    border: 'border-slate-200 hover:border-slate-300',
    iconColor: 'text-slate-500',
    shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
  },
};

export function SellerActionButton({
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
  children,
}: SellerActionButtonProps) {
  const st = actionVariantStyles[variant] || actionVariantStyles.view;
  const paddingClass = size === 'sm' ? 'px-2 py-1 text-[10.5px]' : 'px-2.5 py-1.25 text-[11.5px]';
  const iconSize = size === 'sm' ? 'text-[13.5px]' : 'text-[15px]';
  const content = children || label;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title || (typeof content === 'string' ? content : undefined)}
      className={`group inline-flex items-center justify-center gap-1.5 rounded-xl border font-semibold tracking-tight transition-all duration-150 ease-out select-none active:scale-[0.96] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${paddingClass} ${st.bg} ${st.text} ${st.border} ${st.shadow} ${className}`}
    >
      {loading ? (
        <span className={`material-symbols-outlined ${iconSize} animate-spin`}>refresh</span>
      ) : icon ? (
        <span className={`material-symbols-outlined ${iconSize} ${st.iconColor} transition-colors`}>{icon}</span>
      ) : null}
      {content && <span>{content}</span>}
    </button>
  );
}
