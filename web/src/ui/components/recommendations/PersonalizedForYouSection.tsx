'use client';

/**
 * Personalized "For You" Section Component
 *
 * Displays personalized book recommendations for the current user
 */

import { useForYouBooks } from '@/hooks/usePersonalizedBooks';
import BookCard from '../common/BookCard';

interface PersonalizedForYouSectionProps {
  limit?: number;
  title?: string;
  showSeeAll?: boolean;
  onSeeAllClick?: () => void;
}

export function PersonalizedForYouSection({
  limit = 10,
  title = '✨ Dành riêng cho bạn',
  showSeeAll = true,
  onSeeAllClick,
}: PersonalizedForYouSectionProps) {
  const { books, loading, error } = useForYouBooks({ limit, enabled: true });

  // Nếu có lỗi API thì ẩn section (không hiển thị lỗi cho người dùng)
  if (error) {
    console.warn('Failed to load personalized recommendations:', error);
    return null;
  }

  // Nếu chưa load xong thì hiển thị skeleton
  if (loading) {
    return (
      <section className="py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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

  // Nếu không có data → ẩn section luôn (tránh "Đang tải mãi")
  if (books.length === 0) {
    return null;
  }

  // Có data → render grid
  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {showSeeAll && onSeeAllClick && (
          <button
            onClick={onSeeAllClick}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Xem tất cả →
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
            variant="standard"
          />
        ))}
      </div>
    </section>
  );
}
