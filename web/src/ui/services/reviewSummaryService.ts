import { useEffect, useState } from 'react';
import { reviewApi } from '../api/reviewApi';

export interface TargetReviewSummary {
  averageRating: number;
  totalReviews: number;
}

const STORAGE_KEY = 'huki_review_summaries_cache';
const EVENT_NAME = 'huki_reviews_updated';

class ReviewSummaryService {
  private cache = new Map<string, TargetReviewSummary>();
  private queue = new Set<string>();
  private timer: NodeJS.Timeout | null = null;
  private isClient = typeof window !== 'undefined';

  constructor() {
    if (this.isClient) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            for (const [k, v] of Object.entries(parsed)) {
              if (v && typeof v === 'object') {
                this.cache.set(k, v as TargetReviewSummary);
              }
            }
          }
        }
      } catch {}
    }
  }

  public get(targetId?: string): TargetReviewSummary | undefined {
    if (!targetId) return undefined;
    return this.cache.get(targetId);
  }

  public set(targetId: string, summary: TargetReviewSummary) {
    if (!targetId || !summary) return;
    this.cache.set(targetId, summary);
    this.persistCache();
    this.notify(targetId);
  }

  public register(targetId?: string) {
    if (!targetId || !this.isClient) return;

    // Even if in cache, we might want fresh data once, but if in cache we don't spam.
    // If not in cache, add to queue
    if (!this.cache.has(targetId)) {
      this.queue.add(targetId);
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flushQueue();
    }, 40);
  }

  private async flushQueue() {
    if (this.queue.size === 0) return;
    const idsToFetch = Array.from(this.queue);
    this.queue.clear();

    try {
      const res = await reviewApi.getBatchSummaries('BOOK', idsToFetch);
      if (res.success && res.data) {
        let hasChanges = false;
        for (const id of idsToFetch) {
          const summary = res.data[id];
          if (summary) {
            this.cache.set(id, {
              averageRating: Number(summary.averageRating) || 0,
              totalReviews: Number(summary.totalReviews) || 0,
            });
            hasChanges = true;
          } else {
            // Mark as 0 reviews in cache to prevent continuous re-fetching
            this.cache.set(id, { averageRating: 0, totalReviews: 0 });
            hasChanges = true;
          }
        }
        if (hasChanges) {
          this.persistCache();
          this.notify();
        }
      }
    } catch (err) {
      console.warn('Error fetching batch review summaries:', err);
    }
  }

  private persistCache() {
    if (!this.isClient) return;
    try {
      const obj: Record<string, TargetReviewSummary> = {};
      this.cache.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {}
  }

  private notify(specificId?: string) {
    if (!this.isClient) return;
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { targetId: specificId } }));
  }
}

export const reviewSummaryService = new ReviewSummaryService();

export function useReviewSummary(targetId?: string, fallbackRating?: number) {
  const [summary, setSummary] = useState<TargetReviewSummary | null>(() => {
    if (!targetId) return null;
    return reviewSummaryService.get(targetId) || null;
  });

  useEffect(() => {
    if (!targetId) return;

    // Check existing
    const cached = reviewSummaryService.get(targetId);
    if (cached) {
      setSummary(cached);
    } else {
      reviewSummaryService.register(targetId);
    }

    const handler = (e: any) => {
      if (!e?.detail?.targetId || e.detail.targetId === targetId) {
        const fresh = reviewSummaryService.get(targetId);
        if (fresh) setSummary(fresh);
      }
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => {
      window.removeEventListener(EVENT_NAME, handler);
    };
  }, [targetId]);

  const numRating = summary && summary.totalReviews > 0
    ? summary.averageRating
    : (typeof fallbackRating === 'number' && fallbackRating > 0 ? fallbackRating : 0);

  const totalReviews = summary ? summary.totalReviews : 0;

  return {
    rating: numRating,
    totalReviews,
    displayRating: numRating > 0 ? numRating.toFixed(1) : null,
    hasReviews: totalReviews > 0 || numRating > 0,
  };
}
