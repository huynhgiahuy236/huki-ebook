import { apiClient } from './apiClient';
import type { ApiResponse } from './types';
import type { BusinessData, StoreData } from './businessApi';
import type { BookData } from './catalogApi';

export interface AdminServiceCheck {
  service: string;
  status: 'ok' | 'unhealthy' | 'unavailable';
  statusCode?: number;
}

export interface AdminHealthResponse {
  status: 'ok' | 'unhealthy' | 'unavailable';
  services: AdminServiceCheck[];
}

export interface AdminStatsData {
  pendingBusinesses: number;
  approvedBusinesses: number;
  totalBusinesses: number;
  pendingStores: number;
  approvedStores: number;
  totalStores: number;
  totalBooks: number;
  activeBooks: number;
  suspendedBooks: number;
  healthStatus: 'ok' | 'degraded' | 'down';
}

export interface AdminBusinessFilter {
  status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminStoreFilter {
  status?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'CLOSED';
  search?: string;
  page?: number;
  limit?: number;
}

export interface AdminBookFilter {
  status?: string;
  search?: string;
  categoryId?: string;
  businessId?: string;
  page?: number;
  limit?: number;
}

export interface AdminDisputeFilter {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export type ArbitrationRuling =
  | 'BUYER_WINS'
  | 'SELLER_WINS'
  | 'PARTIAL_SETTLEMENT'
  | 'CARRIER_AT_FAULT'
  | 'REQUEST_MORE_INFO';

export interface DisputeItem {
  id: string;
  orderId: string;
  orderCode: string;
  userId: string;
  grandTotal: number;
  paymentMethod?: string;
  paymentStatus?: string;
  sellerOrderId?: string | null;
  type: string;
  description: string;
  resolution: string;
  evidence: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
  ruling?: string | null;
  rulingNotes?: string | null;
  refundPercentage?: number | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  adminEmail?: string | null;
}

export interface DisputeDetailData {
  disputeId: string;
  orderId: string;
  orderCode: string;
  buyerId?: string;
  orderGrandTotal: number;
  orderPaymentMethod?: string;
  orderPaymentStatus?: string;
  orderStatus?: string;
  shippingAddress?: any;
  sellerOrderId?: string | null;
  targetSellerOrder?: {
    id: string;
    code: string;
    storeId: string;
    ownerUserId: string;
    grandTotal: number;
    status: string;
    carrier?: string;
    trackingCode?: string;
    items: Array<{
      id: string;
      bookId: string;
      bookTitle: string;
      bookCoverUrl?: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      format: string;
    }>;
  } | null;
  type: string;
  description: string;
  resolution: string;
  evidence: string[];
  currentStatus: string;
  isFinalized: boolean;
  ruling?: string | null;
  rulingNotes?: string | null;
  refundPercentage?: number | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  adminEmail?: string | null;
  timeline: Array<{
    id: string;
    fromStatus?: string;
    toStatus: string;
    title: string;
    description?: string;
    actorType: string;
    actorId?: string;
    metadata?: any;
    createdAt: string;
  }>;
}

export interface ArbitrateDisputePayload {
  ruling: ArbitrationRuling;
  notes: string;
  refundPercentage?: number;
  targetSellerOrderId?: string;
}

export const adminApi = {
  /**
   * Lấy danh sách tranh chấp / khiếu nại (Task 64 / POL-12)
   */
  async getDisputes(params: AdminDisputeFilter = {}): Promise<ApiResponse<{ data: DisputeItem[]; total: number }>> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.type) query.append('type', params.type);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return apiClient<{ data: DisputeItem[]; total: number }>(`/orders/admin/disputes${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Lấy chi tiết hồ sơ tranh chấp và bằng chứng (Task 64 / POL-12)
   */
  async getDisputeDetail(disputeId: string): Promise<ApiResponse<DisputeDetailData>> {
    return apiClient<DisputeDetailData>(`/orders/admin/disputes/${disputeId}`, {
      method: 'GET',
    });
  },

  /**
   * Ban hành phán quyết trọng tài Platform Admin (Task 64 / POL-12)
   */
  async arbitrateDispute(disputeId: string, payload: ArbitrateDisputePayload): Promise<ApiResponse<any>> {
    return apiClient<any>(`/orders/admin/disputes/${disputeId}/arbitrate`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  /**
   * Lấy danh sách doanh nghiệp dành riêng cho Admin HUKI
   */
  async getBusinesses(params: AdminBusinessFilter = {}): Promise<ApiResponse<BusinessData[]>> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return apiClient<BusinessData[]>(`/businesses/admin/all${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Phê duyệt hồ sơ doanh nghiệp
   */
  async approveBusiness(id: string): Promise<ApiResponse<BusinessData>> {
    return apiClient<BusinessData>(`/businesses/${id}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Từ chối hồ sơ doanh nghiệp kèm lý do
   */
  async rejectBusiness(id: string, reason: string): Promise<ApiResponse<BusinessData>> {
    return apiClient<BusinessData>(`/businesses/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Lấy danh sách cửa hàng (Stores) dành riêng cho Admin HUKI
   */
  async getStores(params: AdminStoreFilter = {}): Promise<ApiResponse<StoreData[]>> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    return apiClient<StoreData[]>(`/stores/admin/all${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Phê duyệt cửa hàng
   */
  async approveStore(id: string): Promise<ApiResponse<StoreData>> {
    return apiClient<StoreData>(`/stores/${id}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Từ chối cửa hàng kèm lý do
   */
  async rejectStore(id: string, reason?: string): Promise<ApiResponse<StoreData>> {
    return apiClient<StoreData>(`/stores/${id}/reject`, {
      method: 'POST',
      body: reason ? JSON.stringify({ reason }) : undefined,
    });
  },

  /**
   * Lấy danh sách sách toàn sàn dành cho Admin
   */
  async getBooks(params: AdminBookFilter = {}): Promise<ApiResponse<BookData[]>> {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.search) query.append('search', params.search);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    if (params.businessId) query.append('business', params.businessId);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit || 50));

    const qs = query.toString();
    return apiClient<BookData[]>(`/books${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Khóa / Đình chỉ sách vi phạm chính sách nền tảng (PLATFORM_ADMIN only)
   */
  async suspendBook(bookId: string): Promise<ApiResponse<BookData>> {
    return apiClient<BookData>(`/books/${bookId}/suspend`, {
      method: 'POST',
    });
  },

  /**
   * Mở khóa / Kích hoạt lại sách
   */
  async activateBook(bookId: string): Promise<ApiResponse<BookData>> {
    return apiClient<BookData>(`/books/${bookId}/publish`, {
      method: 'POST',
    });
  },

  /**
   * Kiểm tra trạng thái sức khỏe Gateway và 6 Microservices backend
   */
  async getServiceHealth(): Promise<ApiResponse<AdminHealthResponse>> {
    return apiClient<AdminHealthResponse>('/health/services', {
      method: 'GET',
    });
  },

  /**
   * Lấy số liệu thống kê tổng quan cho Admin Dashboard
   */
  async getAdminStats(): Promise<ApiResponse<AdminStatsData>> {
    try {
      const [businessesRes, storesRes, booksRes, healthRes] = await Promise.allSettled([
        this.getBusinesses({ limit: 100 }),
        this.getStores({ limit: 100 }),
        this.getBooks({ limit: 100 }),
        this.getServiceHealth(),
      ]);

      const businesses = businessesRes.status === 'fulfilled' && businessesRes.value.success && Array.isArray(businessesRes.value.data)
        ? businessesRes.value.data
        : [];

      const stores = storesRes.status === 'fulfilled' && storesRes.value.success && Array.isArray(storesRes.value.data)
        ? storesRes.value.data
        : [];

      const books = booksRes.status === 'fulfilled' && booksRes.value.success && Array.isArray(booksRes.value.data)
        ? booksRes.value.data
        : [];

      const health = healthRes.status === 'fulfilled' && healthRes.value.success
        ? healthRes.value.data
        : null;

      const pendingBusinesses = businesses.filter(b => b.status === 'PENDING_APPROVAL').length;
      const approvedBusinesses = businesses.filter(b => b.status === 'APPROVED').length;
      const pendingStores = stores.filter(s => s.status === 'PENDING_APPROVAL').length;
      const approvedStores = stores.filter(s => s.status === 'APPROVED').length;
      const suspendedBooks = books.filter(b => b.status === 'SUSPENDED').length;
      const activeBooks = books.filter(b => b.status === 'PUBLISHED').length;

      let healthStatus: 'ok' | 'degraded' | 'down' = 'ok';
      if (!health || health.status !== 'ok') {
        healthStatus = health?.services?.some(s => s.status === 'ok') ? 'degraded' : 'down';
      }

      return {
        success: true,
        data: {
          pendingBusinesses,
          approvedBusinesses,
          totalBusinesses: businesses.length,
          pendingStores,
          approvedStores,
          totalStores: stores.length,
          totalBooks: books.length,
          activeBooks,
          suspendedBooks,
          healthStatus,
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: {
          code: 'ADMIN_STATS_FAILED',
          message: error instanceof Error
            ? error.message
            : 'Không thể lấy số liệu thống kê quản trị',
        },
      };
    }
  },

  /**
   * Lấy danh sách toàn bộ người dùng từ DB dành cho Admin Sàn
   */
  async getUsers(params: { search?: string; role?: string; status?: string } = {}): Promise<ApiResponse<any[]>> {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.role) query.append('role', params.role);
    if (params.status) query.append('status', params.status);

    const qs = query.toString();
    return apiClient<any[]>(`/users/admin/all${qs ? `?${qs}` : ''}`, {
      method: 'GET',
    });
  },

  /**
   * Tạo khách hàng mới vào database
   */
  async createCustomer(dto: { fullName: string; email: string; phone: string; password?: string }): Promise<ApiResponse<any>> {
    return apiClient<any>('/users/admin/customer', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Cập nhật thông tin người dùng trong database
   */
  async updateUser(id: string, dto: { fullName?: string; email?: string; phone?: string; password?: string; role?: string; status?: string; storeName?: string }): Promise<ApiResponse<any>> {
    return apiClient<any>(`/users/admin/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(dto),
    });
  },

  /**
   * Khóa hoặc mở khóa người dùng trong database
   */
  async toggleLockUser(id: string): Promise<ApiResponse<any>> {
    return apiClient<any>(`/users/admin/${id}/toggle-lock`, {
      method: 'POST',
    });
  },

  /**
   * Xóa người dùng (soft-delete) trong database
   */
  async deleteUser(id: string): Promise<ApiResponse<any>> {
    return apiClient<any>(`/users/admin/${id}`, {
      method: 'DELETE',
    });
  },
};

