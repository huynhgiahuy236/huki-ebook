'use client';

/**
 * Personalized "For You" Section Component
 *
 * Displays personalized book recommendations for the current user
 * - For logged-in users: real personalized books from /analytics/recommendations/for-you
 * - For guests: trending/popular books fallback with login CTA
 */

import { useForYouBooks } from '@/hooks/usePersonalizedBooks';
import { useAuth } from '@/ui/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import BookCard from '../common/BookCard';

interface PersonalizedForYouSectionProps {
  limit?: number;
  title?: string;
  subtitle?: string;
  showSeeAll?: boolean;
  onSeeAllClick?: () => void;
  currentSearchQuery?: string;
  excludeBookIds?: string[] | Set<string>;
}

export function PersonalizedForYouSection({
  limit = 10,
  title = 'Gợi ý cho bạn',
  subtitle,
  showSeeAll = true,
  onSeeAllClick,
  currentSearchQuery,
  excludeBookIds,
}: PersonalizedForYouSectionProps) {
  const { user } = useAuth();
  const router = useRouter();
  const { books, loading, error } = useForYouBooks({
    limit,
    enabled: true,
    currentSearchQuery,
    excludeBookIds,
  });
  const [hovered, setHovered] = useState<string | null>(null);

  // Nếu có lỗi API thì ẩn section (không hiển thị lỗi cho người dùng)
  if (error) {
    console.warn('Failed to load personalized recommendations:', error);
    return null;
  }

  // Nếu chưa load xong thì hiển thị skeleton
  if (loading) {
    return (
      <section className="py-2">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-[#17201F]">
            {title}
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-xl aspect-[3/4] mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-1.5"></div>
              <div className="h-2.5 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Nếu không có data → ẩn section luôn (tránh "Đang tải mãi")
  if (books.length === 0) {
    return null;
  }

  // Nếu có data → render grid cá nhân hóa
  return (
    <section className="bg-white rounded-xl p-4 sm:p-5 border border-gray-200/90 shadow-2xs flex flex-col gap-3 my-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-gray-100">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            {title}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {subtitle || 'Gợi ý các tựa sách phù hợp dựa trên chủ đề và thể loại bạn quan tâm'}
          </p>
        </div>

        {showSeeAll && (
          <button
            onClick={onSeeAllClick || (() => router.push('/books'))}
            className="text-xs text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Khám phá thêm</span>
            <span className="material-symbols-outlined text-[15px]">chevron_right</span>
          </button>
        )}
      </div>

      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4"
        onMouseLeave={() => setHovered(null)}
      >
        {books.map((book) => {
          const bookData = (book as any).book || {};
          return (
            <div
              key={book.id}
              onMouseEnter={() => setHovered(book.id)}
              className={`flex flex-col transition-transform duration-200 ${
                hovered === book.id ? '-translate-y-1' : ''
              }`}
            >
              <BookCard
                book={{
                  id: book.id,
                  title: book.title,
                  cover: book.coverImage || bookData.coverUrl || undefined,
                  price: book.price || bookData.price || 0,
                  originalPrice: bookData.originalPrice || undefined,
                  discountPercent: bookData.discountPercent || undefined,
                  rating: bookData.rating || undefined,
                  sales: bookData.soldCount ?? bookData.sales ?? undefined,
                  author: book.authorName || undefined,
                  authorName: book.authorName || undefined,
                  format: book.categoryName || 'Sách',
                  formatType: bookData.format === 'DIGITAL' ? 'ebook' : 'physical',
                }}
                variant="standard"
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
