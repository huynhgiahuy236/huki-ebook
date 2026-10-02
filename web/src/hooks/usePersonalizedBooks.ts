/**
 * usePersonalizedBooks Hook
 *
 * React hook for fetching personalized book recommendations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getForYouRecommendations, getSimilarBooks, RecommendedBook, SimilarBook } from '@/ui/api/recommendationApi';

interface UsePersonalizedBooksOptions {
  limit?: number;
  enabled?: boolean;
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
 */
export function useForYouBooks(options: UseForYouOptions = {}) {
  const { limit = 20, enabled = true, onSuccess, onError } = options;

  const [books, setBooks] = useState<RecommendedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBooks = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getForYouRecommendations(limit);
      setBooks(data);
      onSuccess?.(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch recommendations');
      setError(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  }, [enabled, limit, onSuccess, onError]);

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
