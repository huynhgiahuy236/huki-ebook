/**
 * AI Audio Service & Subscription Management
 * 
 * 100% REAL DATA - KẾT NỐI TRỰC TIẾP POSTGRESQL & NESTJS COMMERCE SERVICE
 * Quản lý cấu hình gói cước giọng đọc AI, danh sách sách kích hoạt quyền đọc AI thật,
 * và lịch sử dòng tiền thu phí 100% chảy về tài khoản Admin HUKI.
 */

import { apiClient } from '../api/apiClient';

export interface AiAudioPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  durationDays: number;
  description: string;
  voiceType: string;
  isPopular?: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  subscriberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookAiSubscription {
  id: string;
  bookId: string;
  bookTitle: string;
  coverUrl?: string;
  storeId: string;
  storeName: string;
  planId: string;
  planName: string;
  planPrice: number;
  durationDays: number;
  activatedAt: string;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  totalListens?: number;
}

export interface AiRevenueTransaction {
  id: string;
  txnCode: string;
  storeId: string;
  storeName: string;
  bookId: string;
  bookTitle: string;
  planId: string;
  planName: string;
  amount: number;
  paymentMethod: 'WALLET' | 'PAYOS' | 'QR_TRANSFER';
  status: 'SUCCESS' | 'REFUNDED';
  createdAt: string;
}

export interface AiFinancialSummary {
  totalRevenue: number;
  transactionCount: number;
  activeSubscriptionsCount: number;
  activePlansCount: number;
}

// In-memory cache để hỗ trợ cả truy cập đồng bộ khi cần
let cachedPlans: AiAudioPlan[] = [];
let cachedSubscriptions: BookAiSubscription[] = [];
let cachedTransactions: AiRevenueTransaction[] = [];
let cachedSummary: AiFinancialSummary = {
  totalRevenue: 0,
  transactionCount: 0,
  activeSubscriptionsCount: 0,
  activePlansCount: 0,
};

export const aiAudioService = {
  // ==========================================
  // 1. QUẢN LÝ GÓI CƯỚC (PLANS) - POSTGRESQL
  // ==========================================
  async getPlans(): Promise<AiAudioPlan[]> {
    try {
      const res = await apiClient<AiAudioPlan[]>('/ai-audio/plans', {
        method: 'GET',
        skipAuth: true,
      });
      if (res.success && res.data) {
        cachedPlans = res.data;
        return res.data;
      }
      return cachedPlans;
    } catch (err) {
      console.warn('Lỗi tải gói cước AI từ API:', err);
      return cachedPlans;
    }
  },

  getCachedPlans(): AiAudioPlan[] {
    return cachedPlans;
  },

  async savePlan(
    planData: Omit<AiAudioPlan, 'id' | 'createdAt' | 'updatedAt' | 'subscriberCount'> & { id?: string }
  ): Promise<AiAudioPlan> {
    const isEdit = Boolean(planData.id);
    const endpoint = isEdit ? `/ai-audio/plans/${planData.id}` : '/ai-audio/plans';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await apiClient<AiAudioPlan>(endpoint, {
      method,
      body: JSON.stringify(planData),
    });

    if (res.success && res.data) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('huki_ai_audio_updated', { detail: { type: 'plans' } }));
      }
      return res.data;
    }
    throw new Error(res.error?.message || 'Không thể lưu gói cước AI vào máy chủ.');
  },

  async deletePlan(planId: string): Promise<boolean> {
    const res = await apiClient(`/ai-audio/plans/${planId}`, {
      method: 'DELETE',
    });
    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('huki_ai_audio_updated', { detail: { type: 'plans' } }));
      }
      return true;
    }
    throw new Error(res.error?.message || 'Không thể xóa gói cước AI.');
  },

  async togglePlanStatus(planId: string): Promise<AiAudioPlan | null> {
    const res = await apiClient<AiAudioPlan>(`/ai-audio/plans/${planId}/toggle`, {
      method: 'PATCH',
    });
    if (res.success && res.data) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('huki_ai_audio_updated', { detail: { type: 'plans' } }));
      }
      return res.data;
    }
    return null;
  },

  // ==========================================
  // 2. QUẢN LÝ SÁCH KÍCH HOẠT (SUBSCRIPTIONS)
  // ==========================================
  async getSubscriptions(): Promise<BookAiSubscription[]> {
    try {
      const res = await apiClient<BookAiSubscription[]>('/ai-audio/subscriptions', {
        method: 'GET',
      });
      if (res.success && res.data) {
        cachedSubscriptions = res.data;
        return res.data;
      }
      return cachedSubscriptions;
    } catch (err) {
      console.warn('Lỗi tải danh sách sách kích hoạt AI:', err);
      return cachedSubscriptions;
    }
  },

  getCachedSubscriptions(): BookAiSubscription[] {
    return cachedSubscriptions;
  },

  async isBookAiAudioActive(bookId: string): Promise<boolean> {
    try {
      const res = await apiClient<{ active: boolean }>(`/ai-audio/subscriptions/check/${bookId}`, {
        method: 'GET',
        skipAuth: true,
      });
      if (res.success && res.data) {
        return Boolean(res.data.active);
      }
      return false;
    } catch {
      return false;
    }
  },

  async registerBookSubscription(params: {
    bookId: string;
    bookTitle?: string;
    coverUrl?: string;
    storeId?: string;
    storeName?: string;
    planId: string;
    paymentMethod?: 'WALLET' | 'PAYOS' | 'QR_TRANSFER';
  }): Promise<{ subscription: BookAiSubscription; transaction: AiRevenueTransaction }> {
    const res = await apiClient<{ subscription: BookAiSubscription; transaction: AiRevenueTransaction }>(
      '/ai-audio/subscriptions',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );

    if (res.success && res.data) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('huki_ai_audio_updated', { detail: { type: 'subscriptions' } })
        );
      }
      return res.data;
    }
    throw new Error(res.error?.message || 'Không thể đăng ký gói AI Voice cho cuốn sách này.');
  },

  // ==========================================
  // 3. QUẢN LÝ DÒNG TIỀN (REVENUE TRANSACTIONS)
  // ==========================================
  async getTransactions(): Promise<AiRevenueTransaction[]> {
    try {
      const res = await apiClient<AiRevenueTransaction[]>('/ai-audio/transactions', {
        method: 'GET',
      });
      if (res.success && res.data) {
        cachedTransactions = res.data;
        return res.data;
      }
      return cachedTransactions;
    } catch (err) {
      console.warn('Lỗi tải lịch sử dòng tiền:', err);
      return cachedTransactions;
    }
  },

  getCachedTransactions(): AiRevenueTransaction[] {
    return cachedTransactions;
  },

  async getFinancialSummary(): Promise<AiFinancialSummary> {
    try {
      const res = await apiClient<AiFinancialSummary>('/ai-audio/summary', {
        method: 'GET',
      });
      if (res.success && res.data) {
        cachedSummary = res.data;
        return res.data;
      }
      return cachedSummary;
    } catch (err) {
      console.warn('Lỗi tải tóm tắt tài chính:', err);
      return cachedSummary;
    }
  },

  getCachedSummary(): AiFinancialSummary {
    return cachedSummary;
  },
};
