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
  targetAudience?: 'ALL' | 'NEW_CUSTOMERS_ONLY' | 'FOLLOWERS_ONLY';
  minFollowDays?: number;
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
    scope?: 'PLATFORM' | 'STORE';
    storeId?: string;
  };
  discount?: number;
  reason?: string;
}

export interface ValidateVoucherPayload {
  code: string;
  orderSubtotal: number;
  storeId?: string;
}

export interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  banner?: string;
  businessId?: string;
}

export interface EligibleFeedResponse {
  platformVouchers: (Voucher & { isSaved?: boolean })[];
  shopVouchersGrouped: Array<{
    store: StoreInfo;
    vouchers: (Voucher & { isSaved?: boolean })[];
  }>;
}

export interface HomepageFeedResponse {
  vouchers: (Voucher & { isSaved?: boolean; store?: StoreInfo })[];
  platformVouchers: (Voucher & { isSaved?: boolean })[];
  shopVouchers: (Voucher & { isSaved?: boolean; store?: StoreInfo })[];
}

export interface WalletVouchersResponse {
  platform: {
    freeship: (Voucher & { isSaved?: boolean; savedAt?: string })[];
    discount: (Voucher & { isSaved?: boolean; savedAt?: string })[];
    all: (Voucher & { isSaved?: boolean; savedAt?: string })[];
  };
  stores: Array<{
    store: StoreInfo;
    vouchers: (Voucher & { isSaved?: boolean; savedAt?: string })[];
  }>;
  totalCount: number;
}

export const voucherApi = {
  /**
   * Get eligible vouchers feed for current user (Platform + Shop grouped by store)
   */
  getEligibleFeed: async (): Promise<ApiResponse<EligibleFeedResponse>> => {
    return apiClient<EligibleFeedResponse>('/vouchers/eligible-feed', {
      method: 'GET',
    });
  },

  /**
   * Get homepage vouchers feed (Platform + followed stores eligible vouchers)
   */
  getHomepageFeed: async (): Promise<ApiResponse<HomepageFeedResponse>> => {
    return apiClient<HomepageFeedResponse>('/vouchers/homepage-feed', {
      method: 'GET',
    });
  },

  /**
   * Get user voucher wallet (Active saved vouchers grouped by platform/stores)
   */
  getWalletVouchers: async (): Promise<ApiResponse<WalletVouchersResponse>> => {
    return apiClient<WalletVouchersResponse>('/vouchers/wallet', {
      method: 'GET',
    });
  },

  /**
   * Save voucher to user wallet
   */
  saveVoucher: async (voucherId: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient<{ success: boolean; message: string }>(`/vouchers/${voucherId}/save`, {
      method: 'POST',
    });
  },

  /**
   * Remove voucher from user wallet
   */
  unsaveVoucher: async (voucherId: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiClient<{ success: boolean; message: string }>(`/vouchers/${voucherId}/save`, {
      method: 'DELETE',
    });
  },

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

