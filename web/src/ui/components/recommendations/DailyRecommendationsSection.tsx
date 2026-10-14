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
      <section className="flex flex-col gap-3 py-1 sm:py-2">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
          <span className="material-symbols-outlined text-amber-500 text-[24px]">
            auto_awesome
          </span>
          <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#17201F]">{title}</h2>
          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            Đang cập nhật...
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-100 rounded-xl aspect-[3/4]"></div>
          ))}
        </div>
      </section>
    );
  }

  // Render with "Daily" badge
  const today = new Date();
  const todayStr = today.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'numeric',
  });

  return (
    <section className="flex flex-col gap-3 py-1 sm:py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="material-symbols-outlined text-amber-500 text-[24px]">
            auto_awesome
          </span>
          <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#17201F]">{title}</h2>
          <span className="text-[11px] text-[#003B2B] font-bold bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            {todayStr}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11.5px] text-gray-500">
          <span className="material-symbols-outlined text-[15px] text-emerald-600">
            psychology
          </span>
          <span>{subtitle}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {books.map((book) => {
          const reason = (book as any).recommendationReason;
          return (
            <div key={book.id} className="flex flex-col">
              {reason && reason !== 'Gợi ý nổi bật' && (
                <div
                  className="mb-1 flex items-center gap-1 text-[9.5px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded font-medium truncate shadow-2xs"
                  title={reason}
                >
                  <span className="material-symbols-outlined text-[11px] text-emerald-600 shrink-0">
                    {reason.includes('🦊') ? 'auto_awesome' : reason.includes('xem') ? 'visibility' : 'search'}
                  </span>
                  <span className="truncate">{reason}</span>
                </div>
              )}
              <BookCard
                book={{
                  id: book.id,
                  title: book.title,
                  cover: book.coverImage || undefined,
                  price: book.price || 0,
                  originalPrice: (book as any).originalPrice,
                  discountPercent: (book as any).discountPercent,
                  author: book.authorName || undefined,
                  authorName: book.authorName || undefined,
                  format: (book as any).format || book.categoryName || 'Sách',
                  formatType: (book as any).formatType || 'physical',
                  rating: (book as any).rating,
                  sales: (book as any).soldCount ?? (book as any).sales ?? (book as any).soldQuantity ?? 0,
                }}
                variant="compact"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}