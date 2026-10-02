'use client';

/**
 * Similar Books Section Component
 *
 * Displays books similar to the current book being viewed
 */

import { useSimilarBooks } from '@/hooks/usePersonalizedBooks';
import BookCard from '../common/BookCard';

interface SimilarBooksSectionProps {
  bookId: string;
  limit?: number;
  title?: string;
}

export function SimilarBooksSection({
  bookId,
  limit = 6,
  title = '📚 Độc giả cùng gu cũng đọc',
}: SimilarBooksSectionProps) {
  const { books, loading, error } = useSimilarBooks({
    bookId,
    limit,
    enabled: !!bookId
  });

  if (error) {
    console.warn('Failed to load similar books:', error);
    return null;
  }

  if (!loading && books.length === 0) {
    return null; // Don't show section if no similar books
  }

  return (
    <section className="py-8 mt-8 border-t">
      <h3 className="text-xl font-bold text-gray-900 mb-6">{title}</h3>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 rounded-lg aspect-[3/4] mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
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
                format: 'Sách',
                formatType: 'physical',
              }}
              variant="compact"
            />
          ))}
        </div>
      )}
    </section>
  );
}
