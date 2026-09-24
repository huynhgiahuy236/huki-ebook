/**
 * HUKI EBOOK - Seller Voucher API Client
 * Shop Voucher CRUD operations for Sellers
 */

import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

// ========== TYPES ==========

export type VoucherType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
export type VoucherStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'USED_UP';
export type VoucherTargetAudience = 'ALL' | 'FOLLOWERS_ONLY' | 'NEW_CUSTOMERS_ONLY';

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: VoucherType;
  value: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  scope: string;
  storeId?: string;
  store?: { id: string; name: string };
  targetAudience?: VoucherTargetAudience;
  minFollowDays?: number;
  totalUsage: number;
  maxUsagePerUser?: number;
  currentUsage: number;
  startsAt: string;
  expiresAt: string;
  status: VoucherStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVoucherPayload {
  code: string;
  name: string;
  description?: string;
  type: VoucherType;
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  scope?: 'PLATFORM' | 'STORE';
  storeId?: string;
  targetAudience?: VoucherTargetAudience;
  minFollowDays?: number;
  totalUsage?: number;
  maxUsagePerUser?: number;
  startsAt: string;
  expiresAt: string;
}

export interface UpdateVoucherPayload {
  name?: string;
  description?: string;
  type?: VoucherType;
  value?: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  scope?: 'PLATFORM' | 'STORE';
  storeId?: string;
  targetAudience?: VoucherTargetAudience;
  minFollowDays?: number;
  totalUsage?: number;
  maxUsagePerUser?: number;
  startsAt?: string;
  expiresAt?: string;
  status?: VoucherStatus;
}

export interface VoucherListResponse {
  items: Voucher[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface VoucherUsageStats {
  voucher: {
    id: string;
    code: string;
    totalUsage: number;
    currentUsage: number;
    remainingUsage: number;
  };
  statistics: {
    totalUsed: number;
    totalDiscount: number;
  };
  recentUsages: Array<{
    id: string;
    createdAt: string;
    discount: number;
    order: { id: string; code: string; grandTotal: number };
    user: { id: string; email: string };
  }>;
}

// ========== API FUNCTIONS ==========

const BASE_URL = '/seller/vouchers';

/**
 * Get all shop vouchers for seller
 */
export async function getSellerVouchers(
  params?: { page?: number; limit?: number; storeId?: string; status?: VoucherStatus }
): Promise<ApiResponse<VoucherListResponse>> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set('page', String(params.page));
  if (params?.limit) searchParams.set('limit', String(params.limit));
  if (params?.storeId) searchParams.set('storeId', params.storeId);
  if (params?.status) searchParams.set('status', params.status);

  const queryString = searchParams.toString();
  return apiClient<VoucherListResponse>(
    `${BASE_URL}${queryString ? `?${queryString}` : ''}`,
    { method: 'GET' }
  );
}

/**
 * Get voucher by ID
 */
export async function getSellerVoucherById(
  voucherId: string
): Promise<ApiResponse<Voucher>> {
  return apiClient<Voucher>(`${BASE_URL}/${voucherId}`, { method: 'GET' });
}

/**
 * Create a new shop voucher
 */
export async function createSellerVoucher(
  payload: CreateVoucherPayload
): Promise<ApiResponse<Voucher>> {
  return apiClient<Voucher>(BASE_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Update a shop voucher
 */
export async function updateSellerVoucher(
  voucherId: string,
  payload: UpdateVoucherPayload
): Promise<ApiResponse<Voucher>> {
  return apiClient<Voucher>(`${BASE_URL}/${voucherId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/**
 * Activate a voucher
 */
export async function activateSellerVoucher(
  voucherId: string
): Promise<ApiResponse<Voucher>> {
  return apiClient<Voucher>(`${BASE_URL}/${voucherId}/activate`, {
    method: 'PATCH',
  });
}

/**
 * Deactivate a voucher
 */
export async function deactivateSellerVoucher(
  voucherId: string
): Promise<ApiResponse<Voucher>> {
  return apiClient<Voucher>(`${BASE_URL}/${voucherId}/deactivate`, {
    method: 'PATCH',
  });
}

/**
 * Delete a voucher
 */
export async function deleteSellerVoucher(
  voucherId: string
): Promise<ApiResponse<{ success: boolean }>> {
  return apiClient<{ success: boolean }>(`${BASE_URL}/${voucherId}`, {
    method: 'DELETE',
  });
}

/**
 * Get voucher usage statistics
 */
export async function getSellerVoucherUsage(
  voucherId: string
): Promise<ApiResponse<VoucherUsageStats>> {
  return apiClient<VoucherUsageStats>(`${BASE_URL}/${voucherId}/usage`, {
    method: 'GET',
  });
}

// ========== HELPERS ==========

/**
 * Format voucher type for display
 */
export function formatVoucherType(type: VoucherType): string {
  switch (type) {
    case 'PERCENTAGE':
      return 'Giảm %';
    case 'FIXED_AMOUNT':
      return 'Giảm tiền';
    case 'FREE_SHIPPING':
      return 'Miễn phí vận chuyển';
    default:
      return type;
  }
}

/**
 * Format voucher status for display
 */
export function formatVoucherStatus(status: VoucherStatus): { label: string; color: string } {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Đang hoạt động', color: 'emerald' };
    case 'INACTIVE':
      return { label: 'Tạm tắt', color: 'gray' };
    case 'EXPIRED':
      return { label: 'Đã hết hạn', color: 'red' };
    case 'USED_UP':
      return { label: 'Đã hết lượt', color: 'orange' };
    default:
      return { label: status, color: 'gray' };
  }
}

/**
 * Format discount value for display
 */
export function formatDiscountValue(type: VoucherType, value: number): string {
  switch (type) {
    case 'PERCENTAGE':
      return `Giảm ${value}%`;
    case 'FIXED_AMOUNT':
      return `Giảm ${value.toLocaleString('vi-VN')}đ`;
    case 'FREE_SHIPPING':
      return 'Miễn phí vận chuyển';
    default:
      return `${value}`;
  }
}

/**
 * Format target audience for display
 */
export function formatTargetAudience(targetAudience?: VoucherTargetAudience): { label: string; icon: string; description: string } {
  switch (targetAudience) {
    case 'FOLLOWERS_ONLY':
      return {
        label: 'Người theo dõi Shop',
        icon: 'favorite',
        description: 'Chỉ khách hàng đã nhấn Theo dõi gian hàng mới dùng được mã',
      };
    case 'NEW_CUSTOMERS_ONLY':
      return {
        label: 'Khách hàng mới',
        icon: 'person_add',
        description: 'Chỉ khách hàng chưa từng mua hàng tại Shop',
      };
    case 'ALL':
    default:
      return {
        label: 'Tất cả khách hàng',
        icon: 'public',
        description: 'Bất kỳ người mua nào cũng có thể áp dụng mã',
      };
  }
}

/**
 * Helper to calculate loyalty tier from follow days
 */
export function getFollowerBadge(daysOrDate: number | string | Date): {
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  label: string;
  badge: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  days: number;
} {
  let days = 0;
  if (typeof daysOrDate === 'number') {
    days = daysOrDate;
  } else {
    const d = new Date(daysOrDate);
    const now = new Date();
    days = Math.max(0, Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)));
  }

  if (days >= 365) {
    return {
      tier: 'DIAMOND',
      label: 'Fan Kim Cương (Tri Ân 1 Năm+)',
      badge: '💎 Kim Cương (1 Năm+)',
      icon: 'diamond',
      colorClass: 'text-cyan-700',
      bgClass: 'bg-gradient-to-r from-cyan-50 to-blue-50',
      borderClass: 'border-cyan-300 text-cyan-800',
      days,
    };
  }
  if (days >= 90) {
    return {
      tier: 'GOLD',
      label: 'Fan Vàng (Thân Thiết 3 Tháng+)',
      badge: '🥇 Fan Vàng (3 Tháng+)',
      icon: 'workspace_premium',
      colorClass: 'text-amber-700',
      bgClass: 'bg-gradient-to-r from-amber-50 to-yellow-50',
      borderClass: 'border-amber-300 text-amber-800',
      days,
    };
  }
  if (days >= 30) {
    return {
      tier: 'SILVER',
      label: 'Fan Bạc (Gắn Bó 1 Tháng+)',
      badge: '🥈 Fan Bạc (1 Tháng+)',
      icon: 'military_tech',
      colorClass: 'text-slate-700',
      bgClass: 'bg-gradient-to-r from-slate-100 to-gray-100',
      borderClass: 'border-slate-300 text-slate-800',
      days,
    };
  }
  return {
    tier: 'BRONZE',
    label: 'Fan Đồng (Mới Theo Dõi)',
    badge: '🥉 Fan Đồng (< 1 Tháng)',
    icon: 'star',
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-200 text-orange-800',
    days,
  };
}

/**
 * Format follower tier requirement for vouchers
 */
export function formatFollowerRequirement(minFollowDays?: number): {
  label: string;
  badge: string;
  icon: string;
} {
  const days = minFollowDays || 0;
  if (days >= 365) {
    return {
      label: `Tri ân Fan Kim Cương (Theo dõi ≥ ${days} ngày / 1 năm)`,
      badge: '💎 Fan Kim Cương (1 Năm+)',
      icon: 'diamond',
    };
  }
  if (days >= 90) {
    return {
      label: `Dành cho Fan Vàng (Theo dõi ≥ ${days} ngày / 3 tháng)`,
      badge: '🥇 Fan Vàng (90 Ngày+)',
      icon: 'workspace_premium',
    };
  }
  if (days >= 30) {
    return {
      label: `Dành cho Fan Bạc (Theo dõi ≥ ${days} ngày / 1 tháng)`,
      badge: '🥈 Fan Bạc (30 Ngày+)',
      icon: 'military_tech',
    };
  }
  if (days > 0) {
    return {
      label: `Người theo dõi gắn bó ≥ ${days} ngày`,
      badge: `⭐ Theo dõi ≥ ${days} ngày`,
      icon: 'verified',
    };
  }
  return {
    label: 'Tất cả người theo dõi Shop',
    badge: 'Mọi Người Theo Dõi',
    icon: 'favorite',
  };
}

