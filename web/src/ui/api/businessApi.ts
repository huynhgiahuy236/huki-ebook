import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface BusinessData {
  id: string;
  name: string;
  taxCode?: string;
  address?: string;
  email?: string;
  phone?: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  ownerId: string;
  createdAt: string;
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

export interface CreateBusinessPayload {
  name: string;
  taxCode?: string;
  address?: string;
  email?: string;
  phone?: string;
  businessType?: 'INDIVIDUAL' | 'PARTNERSHIP' | 'CORPORATION' | 'LLC';
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
};
