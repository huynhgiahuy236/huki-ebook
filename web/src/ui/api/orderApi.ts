import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export type SellerOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING_CONFIRMATION'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface OrderItem {
  id: string;
  orderId?: string;
  sellerOrderId?: string;
  bookId: string;
  title: string;
  format: 'PHYSICAL' | 'DIGITAL' | 'BOTH';
  price: number;
  quantity: number;
  subtotal?: number;
  coverImage?: string;
  coverUrl?: string;
}

export interface ShippingAddress {
  recipientName?: string;
  fullName?: string;
  phone?: string;
  line1?: string;
  address?: string;
  ward?: string;
  district?: string;
  province?: string;
  city?: string;
  fullAddress?: string;
}

export interface OrderBuyerInfo {
  id: string;
  code: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress?: ShippingAddress | null;
  note?: string;
  createdAt: string;
}

export interface SellerOrder {
  id: string;
  orderId: string;
  code: string;
  storeId: string;
  ownerUserId: string;
  requiresShipping: boolean;
  itemSubtotal: number;
  shippingFee: number;
  grandTotal: number;
  status: SellerOrderStatus;
  carrier?: string | null;
  trackingCode?: string | null;
  confirmedAt?: string | null;
  shippedAt?: string | null;
  completedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  items: OrderItem[];
  order?: OrderBuyerInfo | null;
  timeline?: Array<{
    id?: string;
    fromStatus?: string | null;
    toStatus: string;
    title?: string;
    description?: string | null;
    actorType?: string;
    createdAt: string;
  }>;
}

export interface OrderQuery {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  business?: string;
  store?: string;
}

export interface ShipOrderPayload {
  carrier: string;
  trackingCode: string;
}

export interface CancelOrderPayload {
  reason: string;
}

export interface OrderPagination {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
}

export interface BuyerOrder {
  id: string;
  code: string;
  userId: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  itemSubtotal: number;
  shippingFee: number;
  discountAmount?: number;
  grandTotal: number;
  shippingAddress?: ShippingAddress | null;
  items?: OrderItem[];
  sellerOrders?: SellerOrder[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrderTrackingInfo {
  orderId: string;
  status: string;
  carrier?: string | null;
  trackingCode?: string | null;
  timeline?: Array<{
    status: string;
    description: string;
    timestamp: string;
  }>;
}

export const orderApi = {
  getSellerOrders: async (params?: OrderQuery | string): Promise<ApiResponse<{ items: SellerOrder[]; pagination?: OrderPagination }>> => {
    const query = new URLSearchParams();
    if (typeof params === 'string') {
      query.append('business', params);
    } else if (params) {
      if (params.page) query.append('page', String(params.page));
      if (params.limit) query.append('limit', String(params.limit));
      if (params.status && params.status !== 'ALL') query.append('status', params.status);
      if (params.business) query.append('business', params.business);
      if (params.store) query.append('store', params.store);
    }

    const queryString = query.toString();
    const endpoint = `/seller/orders${queryString ? `?${queryString}` : ''}`;
    return apiClient<{ items: SellerOrder[]; pagination?: OrderPagination }>(endpoint, { method: 'GET' });
  },

  getSellerOrderDetail: async (id: string): Promise<ApiResponse<SellerOrder>> => {
    return apiClient<SellerOrder>(`/seller/orders/${id}`, { method: 'GET' });
  },

  confirmOrder: async (id: string): Promise<ApiResponse<SellerOrder>> => {
    return apiClient<SellerOrder>(`/seller/orders/${id}/confirm`, { method: 'PATCH' });
  },

  prepareOrder: async (id: string): Promise<ApiResponse<SellerOrder>> => {
    return apiClient<SellerOrder>(`/seller/orders/${id}/prepare`, { method: 'PATCH' });
  },

  shipOrder: async (id: string, payload: ShipOrderPayload): Promise<ApiResponse<SellerOrder>> => {
    return apiClient<SellerOrder>(`/seller/orders/${id}/ship`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  deliverOrder: async (id: string): Promise<ApiResponse<SellerOrder>> => {
    return apiClient<SellerOrder>(`/seller/orders/${id}/deliver`, { method: 'PATCH' });
  },

  cancelSellerOrder: async (id: string, payload: CancelOrderPayload): Promise<ApiResponse<SellerOrder>> => {
    return apiClient<SellerOrder>(`/seller/orders/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  getBuyerOrders: async (params?: OrderQuery): Promise<ApiResponse<{ items: BuyerOrder[]; pagination?: OrderPagination }>> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.status) query.append('status', params.status);

    const queryString = query.toString();
    return apiClient<{ items: BuyerOrder[]; pagination?: OrderPagination }>(`/orders${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  },

  getBuyerOrderDetail: async (id: string): Promise<ApiResponse<BuyerOrder>> => {
    return apiClient<BuyerOrder>(`/orders/${id}`, { method: 'GET' });
  },

  getOrderTracking: async (id: string): Promise<ApiResponse<OrderTrackingInfo>> => {
    return apiClient<OrderTrackingInfo>(`/orders/${id}/tracking`, { method: 'GET' });
  },

  cancelBuyerOrder: async (id: string, payload: CancelOrderPayload): Promise<ApiResponse<BuyerOrder>> => {
    return apiClient<BuyerOrder>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cancelBuyerSubOrder: async (orderId: string, sellerOrderId: string, payload: CancelOrderPayload): Promise<ApiResponse<BuyerOrder>> => {
    return apiClient<BuyerOrder>(`/orders/${orderId}/seller-orders/${sellerOrderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  requestCancelBuyerSubOrder: async (orderId: string, sellerOrderId: string, payload: CancelOrderPayload): Promise<ApiResponse<BuyerOrder>> => {
    return apiClient<BuyerOrder>(`/orders/${orderId}/seller-orders/${sellerOrderId}/cancel-request`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  approveSellerCancellation: async (id: string, payload?: CancelOrderPayload): Promise<ApiResponse<SellerOrder>> => {
    return apiClient<SellerOrder>(`/seller/orders/${id}/approve-cancellation`, {
      method: 'PATCH',
      body: payload ? JSON.stringify(payload) : undefined,
    });
  },

  rejectSellerCancellation: async (id: string, payload: CancelOrderPayload): Promise<ApiResponse<SellerOrder>> => {
    return apiClient<SellerOrder>(`/seller/orders/${id}/reject-cancellation`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  createDispute: async (
    orderId: string,
    payload: {
      type: 'NOT_AS_DESCRIBED' | 'DAMAGED' | 'WRONG_PRODUCT' | 'NOT_RECEIVED' | 'COUNTERFEIT' | 'OTHER';
      description: string;
      resolution: 'REFUND' | 'REPLACE' | 'PARTIAL_REFUND';
      evidence?: string[];
      sellerOrderId?: string;
    },
  ): Promise<
    ApiResponse<{
      id: string;
      orderId: string;
      sellerOrderId?: string | null;
      type: string;
      description: string;
      resolution: string;
      evidence: string[];
      status: string;
      createdAt: string;
    }>
  > => {
    return apiClient<{
      id: string;
      orderId: string;
      sellerOrderId?: string | null;
      type: string;
      description: string;
      resolution: string;
      evidence: string[];
      status: string;
      createdAt: string;
    }>(`/orders/${orderId}/disputes`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  uploadDisputeEvidence: async (
    orderId: string,
    file: File,
  ): Promise<
    ApiResponse<{
      url: string;
      key: string;
      filename: string;
      size: number;
      mimeType: string;
      uploadedAt: string;
    }>
  > => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient<{
      url: string;
      key: string;
      filename: string;
      size: number;
      mimeType: string;
      uploadedAt: string;
    }>(`/orders/${orderId}/disputes/evidence`, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Lấy trạng thái ký quỹ Escrow và đóng băng (Task 65 / POL-14)
   */
  getOrderEscrow: async (orderId: string): Promise<ApiResponse<EscrowStatusData>> => {
    return apiClient<EscrowStatusData>(`/orders/${orderId}/escrow`, { method: 'GET' });
  },

  /**
   * Lấy trạng thái ký quỹ cho gói hàng của gian hàng (Task 65 / POL-14)
   */
  getSubOrderEscrow: async (orderId: string, sellerOrderId: string): Promise<ApiResponse<EscrowStatusData>> => {
    return apiClient<EscrowStatusData>(`/orders/${orderId}/seller-orders/${sellerOrderId}/escrow`, { method: 'GET' });
  },

  // ===== FLOW ĐỔI TRẢ V1 =====

  /**
   * Khách hàng xác nhận đã nhận đủ hàng và giải ngân ký quỹ tức thì
   */
  confirmDelivered: async (
    orderId: string,
    subOrderId?: string
  ): Promise<ApiResponse<{ message?: string }>> => {
    return apiClient<{ message?: string }>(`/orders/${orderId}/confirm-delivered`, {
      method: 'POST',
      body: JSON.stringify({ orderId, subOrderId }),
    });
  },

  /**
   * Khách hàng tạo yêu cầu đổi trả cho 1 sản phẩm
   */
  createReturnRequest: async (
    orderId: string,
    orderItemId: string,
    payload: {
      type: 'REFUND' | 'REPLACEMENT';
      reason: 'NOT_AS_DESCRIBED' | 'DAMAGED_TORN' | 'OTHER';
      reasonDetail?: string;
      evidenceImages?: string[];
      evidenceVideos?: string[];
      evidenceDocuments?: string[];
      evidencePdfs?: string[];
      bookTitle?: string;
      bookCoverUrl?: string;
      amount?: number;
      quantity?: number;
    }
  ): Promise<ApiResponse<ReturnRequestData>> => {
    return apiClient<ReturnRequestData>(`/orders/${orderId}/items/${orderItemId}/return-request`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Khách hàng lấy danh sách hàng đổi đang giao
   */
  getBuyerReplacements: async (): Promise<ApiResponse<ReturnRequestData[]>> => {
    return apiClient<ReturnRequestData[]>('/orders/buyer/replacements', { method: 'GET' });
  },

  /**
   * Khách hàng lấy danh sách tất cả yêu cầu đổi trả & hoàn tiền
   */
  getBuyerReturnRequests: async (params?: { type?: string; status?: string }): Promise<ApiResponse<ReturnRequestData[]>> => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return apiClient<ReturnRequestData[]>(`/orders/buyer/returns${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * Seller lấy danh sách yêu cầu đổi trả
   */
  getSellerReturnRequests: async (params?: { status?: string; search?: string }): Promise<ApiResponse<ReturnRequestData[]>> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString();
    return apiClient<ReturnRequestData[]>(`/orders/seller/returns${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /**
   * Seller lấy chi tiết yêu cầu đổi trả
   */
  getSellerReturnRequestDetail: async (id: string): Promise<ApiResponse<ReturnRequestData>> => {
    return apiClient<ReturnRequestData>(`/orders/seller/returns/${id}`, { method: 'GET' });
  },

  /**
   * Seller xác nhận yêu cầu đổi trả (đồng ý)
   */
  sellerAcceptReturnRequest: async (id: string): Promise<ApiResponse<ReturnRequestData>> => {
    return apiClient<ReturnRequestData>(`/orders/seller/returns/${id}/accept`, { method: 'POST' });
  },

  /**
   * Seller yêu cầu phản biện
   */
  sellerDisputeReturnRequest: async (
    id: string,
    payload: {
      reason: string;
      evidenceImages?: string[];
      evidenceVideos?: string[];
      evidenceDocuments?: string[];
      evidencePdfs?: string[];
    }
  ): Promise<ApiResponse<ReturnRequestData>> => {
    return apiClient<ReturnRequestData>(`/orders/seller/returns/${id}/dispute`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Seller nhập mã vận đơn gửi hàng đổi cho khách
   */
  sellerShipReplacement: async (
    id: string,
    payload: {
      carrier: string;
      trackingCode: string;
    }
  ): Promise<ApiResponse<ReturnRequestData>> => {
    return apiClient<ReturnRequestData>(`/orders/seller/returns/${id}/ship-replacement`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Seller lấy danh sách đơn đổi hàng
   */
  getSellerReplacements: async (): Promise<ApiResponse<ReturnRequestData[]>> => {
    return apiClient<ReturnRequestData[]>('/orders/seller/replacements', { method: 'GET' });
  },
};

export interface ReturnRequestData {
  id: string;
  orderId: string;
  orderItemId: string;
  sellerOrderId?: string | null;
  userId: string;
  storeId: string;
  type: 'REFUND' | 'REPLACEMENT';
  reason: 'NOT_AS_DESCRIBED' | 'DAMAGED_TORN' | 'OTHER';
  reasonDetail?: string | null;
  evidenceImages: string[];
  evidenceVideos: string[];
  evidenceDocuments?: string[];
  sellerEvidenceImages?: string[];
  sellerEvidenceVideos?: string[];
  sellerEvidenceDocuments?: string[];
  sellerDisputeReason?: string | null;
  status:
    | 'WAITING_FORWARD'
    | 'FORWARDED_TO_SELLER'
    | 'SELLER_ACCEPTED'
    | 'SELLER_DISPUTED'
    | 'ARBITRATED_BUYER_WINS'
    | 'ARBITRATED_SELLER_WINS'
    | 'COMPLETED';
  forwardedToSellerAt?: string | null;
  sellerRespondedAt?: string | null;
  replacementTrackingCode?: string | null;
  replacementCarrier?: string | null;
  replacementShippedAt?: string | null;
  replacementDeliveredAt?: string | null;
  adminRuling?: string | null;
  adminRulingReason?: string | null;
  arbitratedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  orderItem?: {
    id: string;
    title: string;
    price: number;
    quantity: number;
    coverUrl?: string;
    format?: string;
  };
  order?: {
    code: string;
    createdAt: string;
    shippingAddress?: any;
  };
  store?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name?: string;
    fullName?: string;
    email?: string;
    phone?: string;
  };
}

export interface EscrowStatusData {
  orderId: string;
  orderCode: string;
  sellerOrderId: string | null;
  status: 'ESCROW_HOLDING' | 'ESCROW_FROZEN' | 'ESCROW_UNFROZEN' | 'ESCROW_RELEASED' | 'ESCROW_REFUNDED';
  isFrozen: boolean;
  canRelease: boolean;
  blockReason?: string;
  financials: {
    totalAmount: number;
    platformFee: number;
    sellerNet: number;
    frozenAmount?: number;
    sellerPortion?: number;
  };
  holdingPeriod: {
    totalHoldingSeconds: number;
    deliveredAt: string | null;
    isDelivered: boolean;
    isExpired: boolean;
  };
  disputeContext: {
    disputeId?: string;
    disputeType?: string;
    frozenAt?: string;
    ruling?: string;
    resolvedAt?: string;
    routing?: string;
  } | null;
}



