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
   * List paginated reviews for a book with rating breakdown and verified purchase status
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
    return apiClient<ReviewListResponse>(`/books/${encodeURIComponent(bookId)}/reviews${qs}`, {
      skipAuth: false,
    });
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
    return apiClient<ReviewListResponse>(`/stores/${encodeURIComponent(storeId)}/reviews${qs}`, {
      skipAuth: false,
    });
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
};
