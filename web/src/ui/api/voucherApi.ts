import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface Voucher {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  scope: 'PLATFORM' | 'STORE';
  storeId?: string;
  expiresAt: string;
  status: 'ACTIVE' | 'INACTIVE' | 'EXPIRED' | 'USED_UP';
}

export interface VoucherValidationResult {
  valid: boolean;
  voucher?: {
    id: string;
    code: string;
    type: string;
    value: number;
    maxDiscountAmount?: number;
  };
  discount?: number;
  reason?: string;
}

export interface ValidateVoucherPayload {
  code: string;
  orderSubtotal: number;
  storeId?: string;
}

export const voucherApi = {
  /**
   * Get available vouchers for current user
   */
  getAvailableVouchers: async (): Promise<ApiResponse<Voucher[]>> => {
    return apiClient<Voucher[]>('/vouchers/available', {
      method: 'GET',
    });
  },

  /**
   * Get vouchers by store
   */
  getVouchersByStore: async (storeId: string): Promise<ApiResponse<Voucher[]>> => {
    return apiClient<Voucher[]>(`/vouchers?scope=STORE&storeId=${storeId}&status=ACTIVE&activeOnly=true`, {
      method: 'GET',
    });
  },

  /**
   * Get platform vouchers
   */
  getPlatformVouchers: async (): Promise<ApiResponse<Voucher[]>> => {
    return apiClient<Voucher[]>('/vouchers?scope=PLATFORM&status=ACTIVE&activeOnly=true', {
      method: 'GET',
    });
  },

  /**
   * Validate a voucher code
   */
  validateVoucher: async (payload: ValidateVoucherPayload): Promise<ApiResponse<VoucherValidationResult>> => {
    return apiClient<VoucherValidationResult>('/vouchers/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Get all vouchers with pagination and query
   */
  getAllVouchers: async (params?: { page?: number; limit?: number; scope?: string; status?: string }): Promise<ApiResponse<{ items: Voucher[]; pagination: any }>> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.scope) query.append('scope', params.scope);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient<{ items: Voucher[]; pagination: any }>(`/vouchers${qs}`, {
      method: 'GET',
    });
  },

  /**
   * Create admin platform voucher
   */
  createAdminVoucher: async (payload: {
    code: string;
    name: string;
    description?: string;
    type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
    value: number;
    minOrderAmount?: number;
    maxDiscountAmount?: number;
    scope: 'PLATFORM' | 'STORE';
    storeId?: string;
    targetAudience?: 'ALL' | 'NEW_CUSTOMERS_ONLY' | 'LOYALTY_TIER' | string;
    totalUsage?: number;
    maxUsagePerUser?: number;
    startsAt: string;
    expiresAt: string;
  }): Promise<ApiResponse<Voucher>> => {
    return apiClient<Voucher>('/vouchers', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Update voucher
   */
  updateAdminVoucher: async (id: string, payload: Partial<Voucher>): Promise<ApiResponse<Voucher>> => {
    return apiClient<Voucher>(`/vouchers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Delete voucher
   */
  deleteAdminVoucher: async (id: string): Promise<ApiResponse<{ success: boolean }>> => {
    return apiClient<{ success: boolean }>(`/vouchers/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get voucher by code
   */
  getVoucherByCode: async (code: string): Promise<ApiResponse<Voucher>> => {
    return apiClient<Voucher>(`/vouchers/code/${code}`, {
      method: 'GET',
    });
  },
};
