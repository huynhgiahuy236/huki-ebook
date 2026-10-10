/**
 * Unified Local & Remote Review Storage & Synchronization
 * Ensures reviews submitted in Order History and Book Detail Page
 * are immediately consistent, persistent across pages/tabs, and verified under POL-13.
 */

import { ReviewItemData, ReviewSummaryData, ReviewListResponse, ReviewReplyItem } from '../api/reviewApi';

const STORAGE_KEY = 'huki_persisted_reviews';

export const reviewStorage = {
  /**
   * Get all stored local reviews
   */
  getAll(): ReviewItemData[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  /**
   * Get reviews for a specific book ID
   */
  getByBookId(bookId: string, secondaryId?: string): ReviewItemData[] {
    const all = this.getAll();
    const cleanId = String(bookId || '').trim().toLowerCase();
    const cleanSec = secondaryId ? String(secondaryId).trim().toLowerCase() : '';
    return all.filter((r) => {
      const tid = String(r.targetId || (r as any).bookId || '').trim().toLowerCase();
      if (!tid) return false;
      if (cleanId && tid === cleanId) return true;
      if (cleanSec && tid === cleanSec) return true;
      if (cleanId && (tid.endsWith(`-${cleanId}`) || cleanId.endsWith(`-${tid}`))) return true;
      if (cleanSec && (tid.endsWith(`-${cleanSec}`) || cleanSec.endsWith(`-${tid}`))) return true;
      return false;
    });
  },

  /**
   * Check if the current user has already submitted a review for a book
   */
  hasUserReviewed(bookId: string, userId?: string, secondaryId?: string): boolean {
    const reviews = this.getByBookId(bookId, secondaryId);
    if (!reviews.length) return false;
    if (userId) {
      return reviews.some((r) => r.author?.id === userId);
    }
    return reviews.length > 0;
  },

  /**
   * Save a newly created review
   */
  saveReview(review: ReviewItemData): void {
    if (typeof window === 'undefined') return;
    try {
      const all = this.getAll();
      // Remove any existing review with the same id
      const filtered = all.filter((r) => r.id !== review.id);
      const updated = [review, ...filtered];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem('huki_review_sync', Date.now().toString());

      // Broadcast event across same window
      window.dispatchEvent(
        new CustomEvent('huki_review_created', {
          detail: { bookId: review.targetId, rating: review.rating, review },
        })
      );
    } catch (err) {
      console.warn('Could not persist review to localStorage:', err);
    }
  },

  /**
   * Add a seller reply to a review
   */
  addReply(reviewId: string, reply: ReviewReplyItem): void {
    if (typeof window === 'undefined') return;
    try {
      const all = this.getAll();
      const updated = all.map((r) => {
        if (r.id === reviewId) {
          const existingReplies = r.replies || [];
          const withoutDup = existingReplies.filter((rp) => rp.id !== reply.id);
          return {
            ...r,
            replies: [...withoutDup, reply],
          };
        }
        return r;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      localStorage.setItem('huki_review_sync', Date.now().toString());

      window.dispatchEvent(
        new CustomEvent('huki_review_reply_created', {
          detail: { reviewId, reply },
        })
      );
    } catch (err) {
      console.warn('Could not persist reply to localStorage:', err);
    }
  },

  /**
   * Merge API response with stored local reviews
   */
  mergeWithApi(bookId: string, apiResponse?: any, secondaryId?: string): ReviewListResponse {
    const localReviews = this.getByBookId(bookId, secondaryId);
    const apiData: ReviewItemData[] = Array.isArray(apiResponse)
      ? apiResponse
      : Array.isArray(apiResponse?.data)
      ? apiResponse.data
      : Array.isArray(apiResponse?.items)
      ? apiResponse.items
      : [];

    // Deduplicate: local reviews take precedence
    const seenIds = new Set<string>();
    const merged: ReviewItemData[] = [];

    for (const r of localReviews) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        merged.push(r);
      }
    }

    for (const r of apiData) {
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        merged.push(r);
      }
    }

    // Calculate updated summary
    const totalReviews = merged.length;
    const distribution: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    let sumRating = 0;

    for (const r of merged) {
      const score = Math.max(1, Math.min(5, Math.round(r.rating || 5)));
      distribution[String(score)] = (distribution[String(score)] || 0) + 1;
      sumRating += Number(r.rating) || 5;
    }

    const averageRating = totalReviews > 0 ? Number((sumRating / totalReviews).toFixed(1)) : 0;

    const summary: ReviewSummaryData = {
      averageRating,
      totalReviews,
      ratingDistribution: distribution,
    };

    return {
      data: merged,
      pagination: {
        page: 1,
        limit: Math.max(20, totalReviews),
        total: totalReviews,
        totalPages: 1,
      },
      summary,
    };
  },
};
