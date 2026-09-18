import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface CheckoutShippingAddress {
  recipientName: string;
  phone: string;
  line1: string;
  ward: string;
  district: string;
  province: string;
}

export interface CheckoutPreviewPayload {
  addressId?: string; // NEW: Preferred - validates ownership
  shippingAddress?: CheckoutShippingAddress; // Deprecated - use addressId
  note?: string;
  platformVoucherCode?: string; // NEW
  storeVoucherCodes?: Record<string, string>; // NEW: storeId -> code
  shippingVoucherCode?: string; // NEW
}

export interface CheckoutSnapshotItem {
  id: string;
  bookId: string;
  title: string;
  coverUrl?: string;
  format: 'PHYSICAL' | 'DIGITAL';
  quantity: number;
  unitPrice: number;
  subtotal: number;
  storeId: string;
  weight?: number;
  isFlashSale?: boolean;
}

export interface CheckoutSnapshotGroup {
  storeId: string;
  storeName?: string;
  requiresShipping: boolean;
  items: CheckoutSnapshotItem[];
  itemSubtotal: number;
  shippingFee: number;
  storeVoucherDiscount: number;
  storeVoucherCode?: string;
  grandTotal: number;
}

export interface VoucherDetails {
  code: string;
  discount: number;
}

export interface CheckoutPreviewResponse {
  sessionId: string;
  expiresAt: string;
  userId: string;
  items: CheckoutSnapshotItem[];
  groups: CheckoutSnapshotGroup[];
  itemSubtotal: number;
  shippingTotal: number;
  storeDiscountTotal: number;
  platformDiscountTotal: number;
  shippingDiscountTotal: number;
  discountTotal: number;
  grandTotal: number;
  vouchers: {
    platform?: VoucherDetails;
    stores: Array<{ storeId: string; code: string; discount: number }>;
    shipping?: VoucherDetails;
  };
  requiresShipping: boolean;
  shippingAddress?: CheckoutShippingAddress;
  note?: string;
}

export interface CheckoutConfirmPayload {
  sessionId: string;
  addressId?: string; // NEW
  paymentMethod: 'COD' | 'ONLINE_PAYMENT' | 'VNPAY' | 'MOMO' | 'CARD' | 'WALLET';
  paymentProvider?: string;
  platformVoucherCode?: string; // NEW
  storeVoucherCodes?: Record<string, string>; // NEW
  shippingVoucherCode?: string; // NEW
}

export interface CheckoutConfirmResponse {
  order: {
    id: string;
    code: string;
    userId: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    itemSubtotal: number;
    shippingTotal: number;
    discountTotal: number;
    grandTotal: number;
    createdAt: string;
  };
  sellerOrders: Array<{
    id: string;
    code: string;
    storeId: string;
    itemSubtotal: number;
    shippingFee: number;
    grandTotal: number;
    status: string;
  }>;
  payment?: {
    id: string;
    method: string;
    status: string;
    amount: number;
    checkoutUrl?: string;
  };
  idempotentReplay?: boolean;
  paymentRequired?: boolean;
}

export const checkoutApi = {
  previewCheckout: async (payload: CheckoutPreviewPayload): Promise<ApiResponse<CheckoutPreviewResponse>> => {
    return apiClient<CheckoutPreviewResponse>('/cart/checkout/preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  confirmCheckout: async (
    payload: CheckoutConfirmPayload,
    idempotencyKey?: string
  ): Promise<ApiResponse<CheckoutConfirmResponse>> => {
    const key = idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`);
    return apiClient<CheckoutConfirmResponse>('/cart/checkout/confirm', {
      method: 'POST',
      headers: {
        'idempotency-key': key,
      },
      body: JSON.stringify(payload),
    });
  },
};
