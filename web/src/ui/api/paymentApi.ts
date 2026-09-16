import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface PaymentView {
  id: string;
  orderId: string;
  amount: number;
  method: 'COD' | 'ONLINE_PAYMENT';
  provider?: string;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'CANCELLED' | 'REFUND_PENDING' | 'REFUNDED';
  transactionId?: string;
  checkoutUrl?: string;
  qrCode?: string;
  expiresAt?: string;
  paidAt?: string;
  createdAt: string;
}

export interface OrderPaymentResponse {
  orderId: string;
  orderCode: string;
  paymentStatus: string;
  payments: PaymentView[];
  refunds: Array<{
    id: string;
    amount: number;
    reason: string;
    status: string;
    createdAt: string;
  }>;
}

export interface InitiatePaymentPayload {
  returnUrl?: string;
  cancelUrl?: string;
}

export const paymentApi = {
  initiatePayment: async (
    orderId: string,
    payload: InitiatePaymentPayload = {}
  ): Promise<ApiResponse<PaymentView>> => {
    return apiClient<PaymentView>(`/payments/orders/${orderId}/initiate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getOrderPayment: async (orderId: string): Promise<ApiResponse<OrderPaymentResponse>> => {
    return apiClient<OrderPaymentResponse>(`/payments/orders/${orderId}`, {
      method: 'GET',
    });
  },

  requestRefund: async (
    orderId: string,
    payload: { amount?: number; reason: string }
  ): Promise<ApiResponse<any>> => {
    return apiClient<any>(`/payments/orders/${orderId}/refunds`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
