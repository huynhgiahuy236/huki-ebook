import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface GmvQueryParams {
  from?: string | null;
  to?: string | null;
  interval?: 'daily' | 'weekly' | 'monthly';
}

export interface PlatformGmvTimelineItem {
  period: string;
  gmv: string;
  orders: number;
}

export interface PlatformGmvByStoreItem {
  storeId: string;
  gmv: string;
}

export interface PlatformGmvResponse {
  totalGmv: string;
  completedOrders: number;
  from: string | null;
  to: string | null;
  interval: 'daily' | 'weekly' | 'monthly';
  timeline: PlatformGmvTimelineItem[];
  byStore: PlatformGmvByStoreItem[];
}

export interface BestsellerItem {
  bookId: string;
  metricValue: string;
  units: number;
  gmv: string;
}

export interface PlatformBestsellersResponse {
  scope: string;
  from: string | null;
  to: string | null;
  by: string;
  items: BestsellerItem[];
}

export const analyticsApi = {
  getPlatformGmv: (params?: GmvQueryParams): Promise<ApiResponse<PlatformGmvResponse>> => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.interval) query.set('interval', params.interval);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient<PlatformGmvResponse>(`/analytics/gmv${qs}`);
  },

  getPlatformBestsellers: (params?: {
    from?: string | null;
    to?: string | null;
    by?: 'UNITS' | 'GMV';
    limit?: number;
  }): Promise<ApiResponse<PlatformBestsellersResponse>> => {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    if (params?.by) query.set('by', params.by);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient<PlatformBestsellersResponse>(`/analytics/platform/bestsellers${qs}`);
  },
};
