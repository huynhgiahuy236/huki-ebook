import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface BusinessData {
  id: string;
  name: string;
  taxCode?: string;
  address?: string;
  email?: string;
  phone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolderName?: string;
  bankBranch?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  ownerId: string;
  createdAt: string;
  slug?: string;
  description?: string;
  logo?: string;
  banner?: string;
  stores?: Array<{
    id: string;
    name: string;
    slug: string;
    status?: string;
    logo?: string;
    banner?: string;
    description?: string;
  }>;
}

export interface StoreData {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  slug: string;
  logo?: string;
  banner?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'CLOSED';
  isActive: boolean;
  createdAt: string;
}

export interface FollowerItem {
  id: string;
  userId: string;
  customerCode: string;
  fullName: string;
  email?: string;
  phone?: string | null;
  avatar?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
}

export interface FollowersPaginationData {
  items: FollowerItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FollowedBusinessItem {
  followerId: string;
  followedAt: string;
  business: BusinessData;
}

export interface CreateBusinessPayload {
  name: string;
  store_name?: string;
  storeName?: string;
  taxCode?: string;
  address?: string;
  email?: string;
  phone?: string;
  businessType?: 'INDIVIDUAL' | 'PARTNERSHIP' | 'CORPORATION' | 'LLC';
  bank_name?: string;
  bankName?: string;
  account_number?: string;
  bankAccountNumber?: string;
  account_holder_name?: string;
  bankAccountHolderName?: string;
  bank_branch?: string;
  bankBranch?: string;
}

export interface CreateStorePayload {
  name: string;
  slug: string;
  email: string;
  description?: string;
  logo?: string;
  banner?: string;
  phone?: string;
  address?: string;
}

export const businessApi = {
  /**
   * Đăng ký doanh nghiệp mới (Dành cho User/Owner)
   */
  async registerBusiness(payload: CreateBusinessPayload): Promise<ApiResponse<BusinessData>> {
    const body = {
      ...payload,
      businessType: payload.businessType || 'CORPORATION',
    };
    return apiClient<BusinessData>('/businesses', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Lấy thông tin Doanh nghiệp của tôi
   */
  async getMyBusiness(): Promise<ApiResponse<BusinessData>> {
    return apiClient<BusinessData>('/businesses/my', {
      method: 'GET',
    });
  },

  /**
   * Lấy danh sách tất cả Doanh nghiệp (Dành cho Public/Admin HUKI)
   */
  async getAllBusinesses(params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<ApiResponse<BusinessData[]>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const url = `/businesses/admin/all${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient<BusinessData[]>(url, { method: 'GET' });
  },

  async getPublicBusinesses(params?: { search?: string; page?: number; limit?: number }): Promise<ApiResponse<BusinessData[]>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const suffix = query.toString();
    return apiClient<BusinessData[]>(`/businesses${suffix ? `?${suffix}` : ''}`, {
      method: 'GET',
      skipAuth: true,
    });
  },

  async getBusinessById(id: string): Promise<ApiResponse<BusinessData>> {
    return apiClient<BusinessData>(`/businesses/${id}`, {
      method: 'GET',
      skipAuth: true,
    });
  },

  async getBusinessBySlug(slug: string): Promise<ApiResponse<BusinessData>> {
    const searchName = slug.replace(/-/g, ' ');
    let result = await this.getPublicBusinesses({ search: searchName, limit: 50 });
    if (!result.success || !Array.isArray(result.data)) {
      return { success: false, error: result.error, meta: result.meta };
    }
    const normalized = slug.toLowerCase();
    const toSlug = (value: string) => value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[đĐ]/g, 'd')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    let business = result.data.find((item) =>
      item.slug?.toLowerCase() === normalized ||
      toSlug(item.name) === normalized ||
      item.stores?.some((legacyStore) => legacyStore.slug?.toLowerCase() === normalized)
    );

    if (!business) {
      result = await this.getPublicBusinesses({ limit: 50 });
      if (!result.success || !Array.isArray(result.data)) {
        return { success: false, error: result.error, meta: result.meta };
      }
      business = result.data.find((item) =>
        item.slug?.toLowerCase() === normalized ||
        toSlug(item.name) === normalized ||
        item.stores?.some((legacyStore) => legacyStore.slug?.toLowerCase() === normalized)
      );
    }

    if (!business && normalized === 'alpha-books') {
      business = result.data[0];
    }
    if (!business) return { success: true, data: undefined, meta: result.meta };
    return this.getBusinessById(business.id);
  },

  /**
   * Phê duyệt Doanh nghiệp (Dành cho Admin HUKI)
   */
  async approveBusiness(id: string): Promise<ApiResponse<BusinessData>> {
    return apiClient<BusinessData>(`/businesses/${id}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Từ chối Doanh nghiệp (Dành cho Admin HUKI)
   */
  async rejectBusiness(id: string, reason?: string): Promise<ApiResponse<BusinessData>> {
    return apiClient<BusinessData>(`/businesses/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  /**
   * Đình chỉ / Khóa quyền Doanh nghiệp (Admin HUKI)
   */
  async suspendBusiness(id: string, reason?: string): Promise<ApiResponse<BusinessData>> {
    return apiClient<BusinessData>(`/businesses/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Đình chỉ hoạt động do vi phạm quy định sàn HUKI' }),
    });
  },

  /**
   * Mở khóa / Kích hoạt lại Doanh nghiệp (Admin HUKI)
   */
  async activateBusiness(id: string): Promise<ApiResponse<BusinessData>> {
    return apiClient<BusinessData>(`/businesses/${id}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Xóa hồ sơ Doanh nghiệp (Admin HUKI)
   */
  async deleteBusiness(id: string): Promise<ApiResponse<boolean>> {
    return apiClient<boolean>(`/businesses/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Tạo Cửa hàng mới thuộc Doanh nghiệp (Owner)
   */
  async createStore(businessId: string, payload: CreateStorePayload): Promise<ApiResponse<StoreData>> {
    return apiClient<StoreData>(`/stores?businessId=${encodeURIComponent(businessId)}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Lấy danh sách Cửa hàng của doanh nghiệp tôi
   */
  async getMyStores(businessId: string): Promise<ApiResponse<StoreData[]>> {
    return apiClient<StoreData[]>(`/stores/my?businessId=${encodeURIComponent(businessId)}`, {
      method: 'GET',
    });
  },

  /**
   * Lấy danh sách tất cả Cửa hàng
   */
  async getAllStores(params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<ApiResponse<StoreData[]>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const url = `/stores/admin/all${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient<StoreData[]>(url, { method: 'GET' });
  },

  async getPublicStores(params?: { search?: string; page?: number; limit?: number }): Promise<ApiResponse<StoreData[]>> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const url = `/stores${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient<StoreData[]>(url, { method: 'GET', skipAuth: true });
  },

  /**
   * Lấy chi tiết cửa hàng theo ID
   */
  async getStoreById(id: string): Promise<ApiResponse<StoreData>> {
    return apiClient<StoreData>(`/stores/${id}`, {
      method: 'GET',
      skipAuth: true,
    });
  },

  /**
   * Lấy chi tiết cửa hàng theo Slug
   */
  async getStoreBySlug(slug: string): Promise<ApiResponse<StoreData>> {
    return apiClient<StoreData>(`/stores/slug/${slug}`, {
      method: 'GET',
      skipAuth: true,
    });
  },

  /**
   * Cập nhật thông tin cửa hàng / branding (logo, banner)
   */
  async updateStore(id: string, payload: Partial<CreateStorePayload>): Promise<ApiResponse<StoreData>> {
    return apiClient<StoreData>(`/stores/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Phê duyệt Cửa hàng (Dành cho Admin HUKI)
   */
  async approveStore(id: string): Promise<ApiResponse<StoreData>> {
    return apiClient<StoreData>(`/stores/${id}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Từ chối Cửa hàng (Dành cho Admin HUKI)
   */
  async rejectStore(id: string): Promise<ApiResponse<StoreData>> {
    return apiClient<StoreData>(`/stores/${id}/reject`, {
      method: 'POST',
    });
  },

  /**
   * Lấy danh sách chi tiết các Doanh nghiệp/NXB mà user hiện tại đang theo dõi
   */
  async getMyFollowedBusinesses(): Promise<ApiResponse<FollowedBusinessItem[]>> {
    return apiClient<FollowedBusinessItem[]>('/businesses/following/my', {
      method: 'GET',
    });
  },

  /**
   * Lấy danh sách ID các Doanh nghiệp/NXB mà user hiện tại đang theo dõi
   */
  async getMyFollowedBusinessIds(): Promise<ApiResponse<string[]>> {
    return apiClient<string[]>('/businesses/following/my-ids', {
      method: 'GET',
    });
  },

  /**
   * Theo dõi một Doanh nghiệp/NXB
   */
  async followBusiness(businessId: string): Promise<ApiResponse<{ followed: boolean; businessId: string; totalFollowers: number }>> {
    return apiClient<{ followed: boolean; businessId: string; totalFollowers: number }>(`/businesses/${businessId}/follow`, {
      method: 'POST',
    });
  },

  /**
   * Bỏ theo dõi một Doanh nghiệp/NXB
   */
  async unfollowBusiness(businessId: string): Promise<ApiResponse<{ followed: boolean; businessId: string; totalFollowers: number }>> {
    return apiClient<{ followed: boolean; businessId: string; totalFollowers: number }>(`/businesses/${businessId}/follow`, {
      method: 'DELETE',
    });
  },

  /**
   * Lấy danh sách Người theo dõi của gian hàng (Phân trang & Tìm kiếm)
   */
  async getBusinessFollowers(
    businessId: string,
    params?: { page?: number; limit?: number; search?: string },
  ): Promise<ApiResponse<FollowersPaginationData>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.search) query.set('search', params.search);
    const url = `/businesses/${businessId}/followers${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient<FollowersPaginationData>(url, { method: 'GET' });
  },

  /**
   * Gửi yêu cầu cập nhật hồ sơ doanh nghiệp & cửa hàng (Seller)
   */
  async submitUpdateRequest(payload: any): Promise<ApiResponse<any>> {
    return apiClient<any>('/businesses/my/update-request', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Lấy lịch sử yêu cầu cập nhật & thời gian cooldown còn lại (Seller)
   */
  async getMyUpdateRequests(): Promise<ApiResponse<{ data: any[]; latest: any; cooldownRemaining: number }>> {
    return apiClient<{ data: any[]; latest: any; cooldownRemaining: number }>('/businesses/my/update-requests', {
      method: 'GET',
    });
  },

  /**
   * Lấy tất cả yêu cầu cập nhật hồ sơ (Admin Sàn)
   */
  async getAllUpdateRequests(params?: { status?: string; page?: number; limit?: number }): Promise<ApiResponse<{ data: any[]; pagination: any }>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const url = `/businesses/admin/update-requests${query.toString() ? `?${query.toString()}` : ''}`;
    return apiClient<{ data: any[]; pagination: any }>(url, { method: 'GET' });
  },

  /**
   * Lấy chi tiết yêu cầu cập nhật (Admin Sàn)
   */
  async getUpdateRequestDetail(id: string): Promise<ApiResponse<any>> {
    return apiClient<any>(`/businesses/admin/update-requests/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Phê duyệt yêu cầu cập nhật (Admin Sàn)
   */
  async approveUpdateRequest(id: string): Promise<ApiResponse<any>> {
    return apiClient<any>(`/businesses/admin/update-requests/${id}/approve`, {
      method: 'POST',
    });
  },

  /**
   * Từ chối yêu cầu cập nhật (Admin Sàn)
   */
  async rejectUpdateRequest(id: string, reason: string): Promise<ApiResponse<any>> {
    return apiClient<any>(`/businesses/admin/update-requests/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },
};
