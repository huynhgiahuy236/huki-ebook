/**
 * HUKI EBOOK - Seller Voucher API Client
 * Shop Voucher CRUD operations for Sellers
 */

import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

// ========== TYPES ==========

export type VoucherType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
export type VoucherStatus = 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'USED_UP';

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
  storeId?: string;
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
