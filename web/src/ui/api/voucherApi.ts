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
    return apiClient<Voucher[]>(`/vouchers?scope=STORE&storeId=${storeId}`, {
      method: 'GET',
    });
  },

  /**
   * Get platform vouchers
   */
  getPlatformVouchers: async (): Promise<ApiResponse<Voucher[]>> => {
    return apiClient<Voucher[]>('/vouchers?scope=PLATFORM', {
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
   * Get voucher by code
   */
  getVoucherByCode: async (code: string): Promise<ApiResponse<Voucher>> => {
    return apiClient<Voucher>(`/vouchers/code/${code}`, {
      method: 'GET',
    });
  },
};
