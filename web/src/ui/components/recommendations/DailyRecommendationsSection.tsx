'use client';

/**
 * Daily Recommendations Section Component
 *
 * Like Shopee's "Daily Discover" - shows recommendations based on
 * user's recent activity, follow history, and trending categories
 */

import { useForYouBooks } from '@/hooks/usePersonalizedBooks';
import BookCard from '../common/BookCard';

interface DailyRecommendationsSectionProps {
  limit?: number;
  title?: string;
  subtitle?: string;
}

export function DailyRecommendationsSection({
  limit = 12,
  title = '🎯 Gợi ý hôm nay cho bạn',
  subtitle = 'Cập nhật mỗi ngày dựa trên sở thích & hoạt động của bạn',
}: DailyRecommendationsSectionProps) {
  const { books, loading, error } = useForYouBooks({ limit, enabled: true });

  if (error) {
    console.warn('Failed to load daily recommendations:', error);
    return null;
  }

  if (!loading && books.length === 0) {
    return null;
  }

  // Loading skeleton
  if (loading) {
    return (
      <section className="py-8">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full">
            Đang cập nhật
          </span>
        </div>
        <p className="text-sm text-gray-500 mb-6">{subtitle}</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg aspect-[3/4] mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Render with shopee-style "Daily" badge
  const today = new Date();
  const todayStr = today.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  });

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <span className="text-[11px] text-[#003b2b] font-semibold bg-[#e6f4f0] border border-[#003b2b]/20 px-2 py-0.5 rounded-full uppercase tracking-wide">
            {todayStr}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">
        {subtitle}
        <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 font-medium">
          <span className="material-symbols-outlined text-sm">auto_awesome</span>
          Cá nhân hóa bằng AI
        </span>
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={{
              id: book.id,
              title: book.title,
              cover: book.coverImage || undefined,
              price: book.price,
              author: book.authorName || undefined,
              authorName: book.authorName || undefined,
              format: book.categoryName || 'Sách',
              formatType: 'physical',
            }}
            variant="compact"
          />
        ))}
      </div>
    </section>
  );
}