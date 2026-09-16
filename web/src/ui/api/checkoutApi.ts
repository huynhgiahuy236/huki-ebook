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
  shippingAddress?: CheckoutShippingAddress;
  note?: string;
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
}

export interface CheckoutSnapshotGroup {
  storeId: string;
  storeName?: string;
  items: CheckoutSnapshotItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
}

export interface CheckoutPreviewResponse {
  sessionId: string;
  expiresAt: string;
  userId: string;
  items: CheckoutSnapshotItem[];
  groups: CheckoutSnapshotGroup[];
  subtotal: number;
  shippingFee: number;
  discountAmount?: number;
  totalAmount: number;
  requiresShipping: boolean;
  shippingAddress?: CheckoutShippingAddress;
  note?: string;
}

export interface CheckoutConfirmPayload {
  sessionId: string;
  paymentMethod: 'COD' | 'ONLINE_PAYMENT' | 'VNPAY' | 'MOMO' | 'CARD' | 'WALLET';
  paymentProvider?: string;
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
    shippingFee: number;
    grandTotal: number;
    createdAt: string;
  };
  sellerOrders: Array<{
    id: string;
    code: string;
    storeId: string;
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
