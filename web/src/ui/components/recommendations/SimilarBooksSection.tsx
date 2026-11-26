'use client';

/**
 * Similar Books Section Component
 *
 * Displays books similar to the current book being viewed (category-first + fallback catalog)
 * matching the Book Detail editorial card aesthetic.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getSimilarBooks } from '@/ui/api/recommendationApi';
import { catalogApi, BookData } from '@/ui/api/catalogApi';
import BookCard, { BookCardData } from '../common/BookCard';

interface SimilarBooksSectionProps {
  bookId: string;
  categoryId?: string | null;
  categoryName?: string | null;
  limit?: number;
  title?: string;
}

function mapBookToCard(item: any): BookCardData {
  const authorObj = typeof item.author === 'object' ? item.author : null;
  const pubObj = typeof item.publisher === 'object' ? item.publisher : null;
  const rawFormat = typeof item.format === 'string' ? item.format.toUpperCase() : 'PHYSICAL';
  const formatType =
    item.formatType ||
    (rawFormat === 'DIGITAL' ? 'ebook' : rawFormat === 'BOTH' ? 'hybrid' : 'physical');
  const formatLabel =
    rawFormat === 'DIGITAL' ? 'Ebook' : rawFormat === 'BOTH' ? 'Combo' : 'Sách giấy';

  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    cover: item.coverUrl || item.coverImage || item.cover || undefined,
    coverUrl: item.coverUrl || item.coverImage || undefined,
    price: item.price,
    pricePaper: item.pricePaper,
    priceEbook: item.priceEbook,
    originalPrice: item.originalPrice,
    originalPricePaper: item.originalPricePaper,
    originalPriceEbook: item.originalPriceEbook,
    discountPercent: item.discountPercent,
    rating: item.rating ?? item.averageRating ?? 0,
    sales: item.soldCount ?? item.sales ?? 0,
    soldCount: item.soldCount ?? item.sales ?? 0,
    author: authorObj?.name || item.authorName || undefined,
    authorName: authorObj?.name || item.authorName || undefined,
    publisher: pubObj?.name || item.publisherName || undefined,
    stock: item.available ?? item.stock,
    hasEbook: Boolean(item.hasPdf || item.hasSourceFile || item.hasEpub || rawFormat === 'DIGITAL' || rawFormat === 'BOTH'),
    hasPaper: rawFormat === 'PHYSICAL' || rawFormat === 'BOTH',
    format: formatLabel,
    formatType,
  };
}

export function SimilarBooksSection({
  bookId,
  categoryId,
  categoryName,
  limit = 6,
  title,
}: SimilarBooksSectionProps) {
  const [books, setBooks] = useState<BookCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) return;
    let active = true;
    setLoading(true);

    const loadRelated = async () => {
      try {
        const [relatedRes, analyticsList] = await Promise.all([
          catalogApi.getRelatedBooks(bookId, limit).catch(() => null),
          getSimilarBooks(bookId, limit).catch(() => []),
        ]);

        const rawRelated = (relatedRes as any)?.data?.data || relatedRes?.data;
        const collected: BookCardData[] = [];
        const seen = new Set<string>([bookId]);

        if (Array.isArray(rawRelated)) {
          for (const item of rawRelated) {
            if (!item?.id || seen.has(item.id)) continue;
            seen.add(item.id);
            collected.push(mapBookToCard(item));
            if (collected.length >= limit) break;
          }
        }

        if (collected.length < limit && Array.isArray(analyticsList)) {
          for (const item of analyticsList) {
            if (!item?.id || seen.has(item.id)) continue;
            seen.add(item.id);
            collected.push(mapBookToCard(item));
            if (collected.length >= limit) break;
          }
        }

        // Last-resort catalog fallback if related endpoint isn't populated yet
        if (collected.length < limit) {
          const fallbackRes = await catalogApi
            .getPublicBooks({ categoryId: categoryId || undefined, limit: limit + 4 })
            .catch(() => null);
          const list: BookData[] = Array.isArray(fallbackRes?.data)
            ? fallbackRes.data
            : ((fallbackRes?.data as any)?.data || []);
          for (const item of list) {
            if (!item?.id || seen.has(item.id)) continue;
            seen.add(item.id);
            collected.push(mapBookToCard(item));
            if (collected.length >= limit) break;
          }
        }

        if (active) setBooks(collected);
      } catch {
        if (active) setBooks([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadRelated();
    return () => {
      active = false;
    };
  }, [bookId, categoryId, limit]);

  if (!loading && books.length === 0) {
    return null;
  }

  const sectionHeading =
    title ||
    (categoryName
      ? `Sách Cùng Thể Loại "${categoryName}"`
      : 'Sách Cùng Thể Loại & Gợi Ý Liên Quan');

  return (
    <section className="max-w-[1240px] mx-auto px-4 sm:px-6 mb-10">
      <div className="bg-white rounded-2xl border border-[#e8e5df] shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-gray-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-xl bg-[#006953]/10 text-[#006953] flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[18px]">auto_stories</span>
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-[#17201f] leading-snug">
                {sectionHeading}
              </h3>
              <p className="text-xs text-gray-500">
                Những tựa sách tương đồng về chủ đề, tác giả và định dạng đọc bạn có thể yêu thích
              </p>
            </div>
            {categoryName && (
              <span className="px-2.5 py-1 rounded-full bg-[#f8f6f1] border border-[#e8e5df] text-[#006953] text-[11px] font-bold">
                {categoryName}
              </span>
            )}
          </div>

          <Link
            href={categoryId ? `/books?category=${encodeURIComponent(categoryId)}` : '/books'}
            className="inline-flex items-center gap-1 text-xs font-bold text-[#006953] hover:underline shrink-0 self-start sm:self-auto"
          >
            <span>Khám phá thêm sách</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: limit }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl bg-[#f8f6f1]/70 p-2.5 border border-[#e8e5df]">
                <div className="bg-gray-200 rounded-lg aspect-[3/4] mb-2.5"></div>
                <div className="h-3.5 bg-gray-200 rounded w-5/6 mb-1.5"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {books.map((book) => (
              <BookCard key={book.id} book={book} variant="compact" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
