/**
 * Recommendations API Client
 *
 * API calls for personalized book recommendations
 */

import { apiClient } from './apiClient';

export interface RecommendedBook {
  id: string;
  title: string;
  coverImage: string | null;
  price: number;
  authorName: string | null;
  categoryName: string | null;
  score: number;
}

export interface SimilarBook {
  id: string;
  title: string;
  coverImage: string | null;
  price: number;
  authorName: string | null;
  similarityScore: number;
}

export interface FootprintsSummary {
  totalEvents: number;
  categoryAffinities: number;
  authorAffinities: number;
  topCategories: { categoryId: string; score: number }[];
  topAuthors: { authorId: string; score: number }[];
}

export interface FootprintsDeletionResult {
  deletedEvents: number;
  deletedCategoryAffinities: number;
  deletedAuthorAffinities: number;
  deletedAt: string;
}

/**
 * Get personalized "For You" recommendations
 */
export async function getForYouRecommendations(limit: number = 20): Promise<RecommendedBook[]> {
  const response = await apiClient<{ data: RecommendedBook[] }>(
    `/analytics/recommendations/for-you?limit=${limit}`,
    { method: 'GET' }
  );
  return response.success ? response.data?.data || [] : [];
}

/**
 * Get similar books based on a book
 */
export async function getSimilarBooks(
  bookId: string,
  limit: number = 10,
  userId?: string
): Promise<SimilarBook[]> {
  let url = `/analytics/recommendations/similar/${bookId}?limit=${limit}`;
  if (userId) {
    url += `&userId=${userId}`;
  }
  const response = await apiClient<{ data: SimilarBook[] }>(
    url,
    { method: 'GET' }
  );
  return response.success ? response.data?.data || [] : [];
}

/**
 * Get user's footprint summary
 */
export async function getFootprintsSummary(userId: string): Promise<FootprintsSummary | null> {
  const response = await apiClient<{ data: FootprintsSummary }>(
    `/analytics/recommendations/footprint/${userId}`,
    { method: 'GET' }
  );
  return response.success ? response.data?.data || null : null;
}

/**
 * Delete user's footprint data (GDPR)
 */
export async function deleteFootprint(userId: string): Promise<FootprintsDeletionResult | null> {
  const response = await apiClient<{
    message: string;
    data: FootprintsDeletionResult
  }>(
    `/analytics/recommendations/footprint/${userId}`,
    { method: 'DELETE' }
  );
  return response.success ? response.data?.data || null : null;
}
