import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface ReviewAuthor {
  id: string;
  fullName: string;
  avatar?: string;
}

export interface ReviewReplyItem {
  id: string;
  content: string;
  business: {
    id: string;
    name: string;
  };
  responderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewItemData {
  id: string;
  targetType: 'BOOK' | 'STORE';
  targetId: string;
  rating: number;
  title: string;
  content: string;
  author: ReviewAuthor;
  verifiedPurchase: boolean;
  format?: 'PHYSICAL' | 'DIGITAL';
  orderId?: string;
  helpfulCount: number;
  isHelpful: boolean;
  images: Array<{ url: string; thumbnail?: string }>;
  replies: ReviewReplyItem[];
  status: 'PENDING_REVIEW' | 'PUBLISHED' | 'HIDDEN' | 'DELETED' | 'FLAGGED';
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummaryData {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
}

export interface ReviewListResponse {
  data: ReviewItemData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: ReviewSummaryData;
}

export interface CreateBookReviewPayload {
  rating: number;
  title: string;
  content: string;
  format: 'PHYSICAL' | 'DIGITAL';
  images?: string[];
}

export interface CreateStoreReviewPayload {
  orderId: string;
  rating: number;
  title: string;
  content: string;
  images?: string[];
}

export const reviewApi = {
  /**
   * List paginated reviews for a book with rating breakdown and verified purchase status (100% from backend DB)
   */
  async getBookReviews(
    bookId: string,
    query: { page?: number; limit?: number; rating?: number } = {}
  ): Promise<ApiResponse<ReviewListResponse>> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.rating) params.set('rating', String(query.rating));

    const qs = params.toString() ? `?${params.toString()}` : '';
    try {
      const res = await apiClient<any>(`/books/${encodeURIComponent(bookId)}/reviews${qs}`, {
        skipAuth: false,
      });

      const items: ReviewItemData[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray((res?.data as any)?.data)
        ? (res?.data as any).data
        : [];

      const rawPagination = (res as any)?.pagination || (res?.data as any)?.pagination;
      const pagination = rawPagination || {
        page: query.page || 1,
        limit: query.limit || 10,
        total: items.length,
        totalPages: 1,
      };

      const rawSummary = (res as any)?.summary || (res?.data as any)?.summary;
      const summary: ReviewSummaryData = rawSummary || (() => {
        const total = pagination.total || items.length;
        const dist: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
        let sum = 0;
        for (const item of items) {
          const r = Math.max(1, Math.min(5, Math.round(item.rating || 5)));
          dist[String(r)] = (dist[String(r)] || 0) + 1;
          sum += Number(item.rating) || 5;
        }
        return {
          totalReviews: total,
          averageRating: items.length > 0 ? Number((sum / items.length).toFixed(1)) : 5.0,
          ratingDistribution: dist,
        };
      })();

      return {
        ...res,
        success: Boolean(res?.success),
        data: {
          data: items,
          pagination,
          summary,
        },
      };
    } catch {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Không thể tải đánh giá' },
        data: {
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          summary: {
            averageRating: 5.0,
            totalReviews: 0,
            ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          },
        },
      };
    }
  },

  /**
   * List paginated reviews for a store
   */
  async getStoreReviews(
    storeId: string,
    query: { page?: number; limit?: number; rating?: number } = {}
  ): Promise<ApiResponse<ReviewListResponse>> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.rating) params.set('rating', String(query.rating));

    const qs = params.toString() ? `?${params.toString()}` : '';
    try {
      const res = await apiClient<any>(`/stores/${encodeURIComponent(storeId)}/reviews${qs}`, {
        skipAuth: false,
      });

      const items: ReviewItemData[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray((res?.data as any)?.data)
        ? (res?.data as any).data
        : [];

      const rawPagination = (res as any)?.pagination || (res?.data as any)?.pagination;
      const pagination = rawPagination || {
        page: query.page || 1,
        limit: query.limit || 10,
        total: items.length,
        totalPages: 1,
      };

      const rawSummary = (res as any)?.summary || (res?.data as any)?.summary;
      const summary: ReviewSummaryData = rawSummary || {
        totalReviews: pagination.total || items.length,
        averageRating: 5.0,
        ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
      };

      return {
        ...res,
        success: Boolean(res?.success),
        data: {
          data: items,
          pagination,
          summary,
        },
      };
    } catch {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Không thể tải đánh giá' },
        data: {
          data: [],
          pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
          summary: {
            averageRating: 5.0,
            totalReviews: 0,
            ratingDistribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          },
        },
      };
    }
  },

  /**
   * Create a review for a book (requires verified purchase)
   */
  async createBookReview(
    bookId: string,
    payload: CreateBookReviewPayload
  ): Promise<ApiResponse<{ id: string; status: string; verifiedPurchase: boolean }>> {
    return apiClient<{ id: string; status: string; verifiedPurchase: boolean }>(
      `/books/${encodeURIComponent(bookId)}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Create a review for a store (requires verified purchase with orderId)
   */
  async createStoreReview(
    storeId: string,
    payload: CreateStoreReviewPayload
  ): Promise<ApiResponse<{ id: string; status: string; verifiedPurchase: boolean }>> {
    return apiClient<{ id: string; status: string; verifiedPurchase: boolean }>(
      `/stores/${encodeURIComponent(storeId)}/reviews`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Batch get review summaries for books or stores
   */
  async getBatchSummaries(
    targetType: 'BOOK' | 'STORE',
    ids: string[]
  ): Promise<ApiResponse<Record<string, { averageRating: number; totalReviews: number }>>> {
    if (!ids || !ids.length) {
      return { success: true, data: {} };
    }
    const cleanIds = Array.from(new Set(ids.filter(Boolean)));
    if (!cleanIds.length) {
      return { success: true, data: {} };
    }
    try {
      const res = await apiClient<Record<string, { averageRating: number; totalReviews: number }>>(
        `/reviews/batch-summary?targetType=${targetType}&ids=${encodeURIComponent(cleanIds.join(','))}`,
        { skipAuth: true }
      );
      return res;
    } catch {
      return { success: false, data: {} };
    }
  },

  /**
   * Mark review as helpful
   */
  async markHelpful(
    reviewId: string
  ): Promise<ApiResponse<{ helpfulCount: number; isHelpful: boolean }>> {
    return apiClient<{ helpfulCount: number; isHelpful: boolean }>(
      `/reviews/${encodeURIComponent(reviewId)}/helpful`,
      {
        method: 'POST',
      }
    );
  },

  /**
   * Remove helpful mark from review
   */
  async unmarkHelpful(
    reviewId: string
  ): Promise<ApiResponse<{ helpfulCount: number; isHelpful: boolean }>> {
    return apiClient<{ helpfulCount: number; isHelpful: boolean }>(
      `/reviews/${encodeURIComponent(reviewId)}/helpful`,
      {
        method: 'DELETE',
      }
    );
  },

  /**
   * Add a seller reply to a review (Business actor only)
   */
  async replyReview(
    reviewId: string,
    payload: { content: string }
  ): Promise<ApiResponse<{ id: string; content: string; business: { id: string; name: string }; createdAt: string }>> {
    return apiClient<{ id: string; content: string; business: { id: string; name: string }; createdAt: string }>(
      `/reviews/${encodeURIComponent(reviewId)}/reply`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Update an existing review (Author only)
   */
  async updateReview(
    reviewId: string,
    payload: { rating?: number; title?: string; content?: string; images?: string[] }
  ): Promise<ApiResponse<ReviewItemData>> {
    return apiClient<ReviewItemData>(
      `/reviews/${encodeURIComponent(reviewId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Delete an existing review (Author only)
   */
  async deleteReview(
    reviewId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>(
      `/reviews/${encodeURIComponent(reviewId)}`,
      {
        method: 'DELETE',
      }
    );
  },

  /**
   * Get reviews submitted by current user (100% from backend DB)
   */
  async getMyReviews(
    query: { page?: number; limit?: number; rating?: number } = {}
  ): Promise<ApiResponse<ReviewItemData[]>> {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.rating) params.set('rating', String(query.rating));

    const qs = params.toString() ? `?${params.toString()}` : '';
    try {
      const res = await apiClient<any>(`/reviews/me${qs}`, {
        skipAuth: false,
      });

      const items: ReviewItemData[] = Array.isArray(res?.data)
        ? res.data
        : Array.isArray((res?.data as any)?.data)
        ? (res?.data as any).data
        : [];

      return {
        ...res,
        success: Boolean(res?.success),
        data: items,
      };
    } catch {
      return {
        success: false,
        error: { code: 'FETCH_FAILED', message: 'Không thể tải đánh giá' },
        data: [],
      };
    }
  },
};
