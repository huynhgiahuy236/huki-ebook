import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface BannerData {
  id: string;
  title: string;
  image: string;
  link?: string;
  position?: number;
  startDate?: string;
  endDate?: string;
  scope?: 'HOMEPAGE' | 'CATEGORY' | 'STORE';
  storeId?: string;
  isActive?: boolean;
  clicks?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const bannerApi = {
  async getBanners(query?: { scope?: string; storeId?: string }): Promise<ApiResponse<BannerData[]>> {
    const params = new URLSearchParams();
    if (query?.scope) params.set('scope', query.scope);
    if (query?.storeId) params.set('storeId', query.storeId);
    return apiClient<BannerData[]>(`/banners${params.toString() ? `?${params.toString()}` : ''}`, {
      method: 'GET',
    });
  },

  async getActiveBanners(scope = 'HOMEPAGE', storeId?: string): Promise<ApiResponse<BannerData[]>> {
    const params = new URLSearchParams({ scope });
    if (storeId) params.set('storeId', storeId);
    return apiClient<BannerData[]>(`/banners/active?${params.toString()}`, {
      method: 'GET',
      skipAuth: true,
    });
  },

  async createBanner(payload: Partial<BannerData>): Promise<ApiResponse<BannerData>> {
    return apiClient<BannerData>('/banners', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateBanner(id: string, payload: Partial<BannerData>): Promise<ApiResponse<BannerData>> {
    return apiClient<BannerData>(`/banners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteBanner(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return apiClient<{ success: boolean }>(`/banners/${id}`, {
      method: 'DELETE',
    });
  },
};

