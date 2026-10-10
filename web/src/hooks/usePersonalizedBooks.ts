/**
 * usePersonalizedBooks Hook
 *
 * React hook for fetching personalized book recommendations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { getForYouRecommendations, getSimilarBooks, RecommendedBook, SimilarBook } from '@/ui/api/recommendationApi';

import { catalogApi, type BookData } from '@/ui/api/catalogApi';
import { personalizationService, type PersonalizedBookItem } from '@/ui/services/personalizationService';

interface UsePersonalizedBooksOptions {
  limit?: number;
  enabled?: boolean;
  currentSearchQuery?: string;
  excludeBookIds?: string[] | Set<string>;
}

interface UseForYouOptions extends UsePersonalizedBooksOptions {
  onSuccess?: (books: RecommendedBook[]) => void;
  onError?: (error: Error) => void;
}

interface UseSimilarBooksOptions extends UsePersonalizedBooksOptions {
  bookId?: string;
  onSuccess?: (books: SimilarBook[]) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for "For You" personalized recommendations
 * Tự động đồng bộ theo sở thích Onboarding & Lịch sử tìm kiếm của người dùng
 */
export function useForYouBooks(options: UseForYouOptions = {}) {
  const { limit = 20, enabled = true, currentSearchQuery, excludeBookIds, onSuccess, onError } = options;
  const { user } = useAuth();

  const [books, setBooks] = useState<RecommendedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBooks = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Lấy toàn bộ sách thật từ Catalog (loại bỏ hoàn toàn bất kỳ mock data nào)
      const res = await catalogApi.getPublicBooks({ limit: 100 });
      const rawCatalog: BookData[] = res.success && Array.isArray(res.data) ? res.data : [];
      const allCatalog = rawCatalog.filter((b) => b && b.id && !String(b.id).startsWith('mock-'));

      if (allCatalog.length === 0) {
        setBooks([]);
        setLoading(false);
        return;
      }

      // 2. Chấm điểm & lọc trùng lặp cá nhân hóa qua personalizationService
      const personalized = personalizationService.getPersonalizedRecommendations(allCatalog, {
        limit,
        currentSearchQuery,
        excludeBookIds,
      });

      // 3. Map sang RecommendedBook view model (100% dữ liệu thật, không có mock sao hay lượt bán)
      const mapped: RecommendedBook[] = personalized.map((b: PersonalizedBookItem) => ({
        id: b.id,
        title: b.title,
        coverImage: b.coverUrl || b.coverImage || null,
        price: b.price || 0,
        originalPrice: b.originalPrice || undefined,
        discountPercent: (b as any).discountPercent || undefined,
        authorName: b.author?.name || (b as any).authorName || '',
        categoryName: b.category?.name || (b as any).categoryName || 'Sách',
        score: b.relevanceScore || 0,
        recommendationReason: b.recommendationReason,
        rating: (b as any).rating || (b as any).averageRating || 0,
        sales: (b as any).soldCount || (b as any).sales || (b as any).salesCount || 0,
        format: b.format === 'DIGITAL' ? 'Ebook' : b.format === 'BOTH' ? 'Combo' : 'Sách giấy',
        formatType: b.format === 'DIGITAL' ? 'ebook' : b.format === 'BOTH' ? 'hybrid' : 'physical',
        book: b,
      } as any));

      setBooks(mapped);
      onSuccess?.(mapped);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch recommendations');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [enabled, limit, currentSearchQuery, excludeBookIds, onSuccess, onError]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Lắng nghe sự kiện tìm kiếm, AI chat, và xem chi tiết để tự động cập nhật ngay lập tức
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUpdate = () => {
      fetchBooks();
    };

    window.addEventListener('huki:search_updated', handleUpdate);
    window.addEventListener('huki:personalization_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('huki:search_updated', handleUpdate);
      window.removeEventListener('huki:personalization_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [fetchBooks]);

  return {
    books,
    loading,
    error,
    refetch: fetchBooks,
  };
}

/**
 * Hook for similar books recommendations
 */
export function useSimilarBooks(options: UseSimilarBooksOptions = {}) {
  const { limit = 10, bookId, enabled = true, onSuccess, onError } = options;

  const [books, setBooks] = useState<SimilarBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBooks = useCallback(async () => {
    if (!enabled || !bookId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getSimilarBooks(bookId, limit);
      setBooks(data);
      onSuccess?.(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch similar books');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [bookId, enabled, limit, onSuccess, onError]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return {
    books,
    loading,
    error,
    refetch: fetchBooks,
  };
}

/**
 * Hook for refreshing recommendations when user interacts
 */
export function useRefreshRecommendations() {
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return { refreshKey, triggerRefresh };
}
