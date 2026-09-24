'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import BookCover from './BookCover';

export interface BookCardData {
  id: string;
  title: string;
  price?: number;
  priceEbook?: number;
  pricePaper?: number;
  originalPrice?: number;
  originalPriceEbook?: number;
  originalPricePaper?: number;
  discount?: string | null;
  discountPercent?: number;
  rating?: number;
  reviewCount?: number | string;
  reviews?: number | string;
  sales?: number | string;
  publisher?: string | { name?: string; displayName?: string } | null;
  shop?: string;
  format?: string | { name?: string } | null;
  formatType?: 'ebook' | 'physical' | 'hybrid' | string;
  hasEbook?: boolean;
  hasPaper?: boolean;
  stock?: number;
  author?: string | { name?: string } | null;
  authorName?: string;
  cover?: string;
  coverUrl?: string;
  isMock?: boolean;
}

export interface BookCardProps {
  book: BookCardData;
  variant?: 'standard' | 'compact' | 'list' | 'grid';
  className?: string;
  isMock?: boolean;
}

/**
 * Compact, modern BookCard Component for HUKI EBOOK
 * Optimized to match Shopee/Tiki ecommerce product cards (Screenshot 1)
 */
export default function BookCard({
  book,
  variant = 'standard',
  className = '',
  isMock: explicitMock
}: BookCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  if (!book) return null;

  const isMock = explicitMock !== undefined ? explicitMock : (book.isMock ?? false);

  // Normalized book properties
  const price = book.price ?? book.priceEbook ?? 0;
  const originalPrice = book.originalPrice ?? book.originalPriceEbook ?? (price > 0 ? Math.round(price * 1.35) : undefined);
  const discountPercent = book.discountPercent ?? (originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : null);
  const discountLabel = book.discount ?? (discountPercent ? `-${discountPercent}%` : null);
  const rating = book.rating ?? 5.0;
  const salesCount = book.sales ?? book.reviewCount ?? book.reviews ?? '1.2k';
  const publisher = (typeof book.publisher === 'object' && book.publisher !== null)
    ? (book.publisher.displayName || book.publisher.name || 'HUKI Publisher')
    : (book.publisher ?? book.shop ?? 'HUKI Publisher');
  const format = (typeof book.format === 'object' && book.format !== null)
    ? (book.format.name || '')
    : (book.format ?? (book.hasEbook && book.hasPaper ? 'Combo' : book.hasEbook ? 'Ebook' : 'Sách giấy'));
  const formatType = book.formatType ?? (book.hasEbook && !book.hasPaper ? 'ebook' : book.hasPaper && !book.hasEbook ? 'physical' : 'hybrid');
  const authorName = (typeof book.author === 'object' && book.author !== null)
    ? (book.author.name || 'Tác giả')
    : (book.author || book.authorName || 'Tác giả');

  const handleCardClick = (e: React.MouseEvent) => {
    if (isMock) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a')) {
      return;
    }
    router.push(`/book/${book.id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    if (isMock) return;
    e.preventDefault();
    e.stopPropagation();
    addToCart(
      {
        id: book.id,
        title: book.title,
        price: price,
        priceEbook: book.priceEbook ?? price,
        pricePaper: book.pricePaper ?? (formatType === 'physical' ? price : originalPrice ?? price),
        originalPriceEbook: book.originalPriceEbook,
        originalPricePaper: book.originalPricePaper,
        cover: book.cover || book.coverUrl,
        author: typeof book.author === 'string' ? book.author : authorName,
        publisher: publisher,
        hasEbook: book.hasEbook ?? (formatType === 'ebook' || formatType === 'hybrid'),
        hasPaper: book.hasPaper ?? (formatType === 'physical' || formatType === 'hybrid'),
        stock: book.stock ?? 99
      },
      formatType === 'physical' ? 'paper' : 'ebook',
      1
    );
  };

  const mockClasses = isMock
    ? 'opacity-45 grayscale-[20%] pointer-events-none select-none relative cursor-not-allowed'
    : 'cursor-pointer';

  // 1. LIST VARIANT (Horizontal mode)
  if (variant === 'list') {
    return (
      <article
        onClick={handleCardClick}
        className={`bg-white border border-gray-200/80 rounded-xl p-3 flex flex-row items-center justify-between gap-3 hover:shadow-sm hover:border-[#ac2c19]/40 transition-all group relative ${mockClasses} ${className}`}
      >
        {isMock && (
          <span className="absolute top-2 right-2 z-30 bg-blue-100 text-blue-800 border border-blue-200 text-[8.5px] font-bold px-1.5 py-0.5 rounded shadow-2xs uppercase tracking-wider">
            MẪU (MOCK)
          </span>
        )}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative aspect-[3/4] w-20 rounded-lg overflow-hidden bg-gray-50 shadow-2xs shrink-0">
            <BookCover
              src={book.cover || book.coverUrl}
              title={book.title}
              author={authorName}
              className="group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-xs text-gray-900 group-hover:text-[#ac2c19] transition-colors line-clamp-2 leading-snug">
              {book.title}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{authorName}</p>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-[#ac2c19]">
                {price.toLocaleString('vi-VN')} đ
              </span>
              {discountLabel && (
                <span className="bg-[#ac2c19] text-white text-[9px] font-bold px-1 py-0.2 rounded">
                  {discountLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddToCart}
          className="px-3 py-1.5 rounded-lg border border-[#ac2c19] text-[#ac2c19] hover:bg-[#ac2c19] hover:text-white text-xs font-semibold transition-colors shrink-0"
        >
          Thêm giỏ hàng
        </button>
      </article>
    );
  }

  // 2. STANDARD / COMPACT / GRID VARIANT (Compact Ecommerce Card - Exactly like Screenshot 1)
  return (
    <article
      onClick={handleCardClick}
      className={`group bg-white rounded-xl border border-gray-200/80 p-2.5 flex flex-col justify-between hover:shadow-md hover:border-[#ac2c19]/40 transition-all relative ${mockClasses} ${className}`}
    >
      {isMock && (
        <span className="absolute top-1.5 right-1.5 z-30 bg-blue-100 text-blue-800 border border-blue-200 text-[8.5px] font-bold px-1.5 py-0.5 rounded shadow-2xs uppercase tracking-wider">
          MẪU (MOCK)
        </span>
      )}

      <div>
        {/* Compact Book Cover (Centered, aspect-3/4, max height) */}
        <div className="relative aspect-[3/4] w-full max-h-[175px] mx-auto rounded-lg overflow-hidden bg-gray-50 mb-2 flex items-center justify-center">
          <BookCover
            src={book.cover || book.coverUrl}
            title={book.title}
            author={authorName}
            className="group-hover:scale-105 transition-transform duration-300 w-full h-full object-cover"
          />
        </div>

        {/* Book Title (2 lines clamp, compact font) */}
        <h3
          className="text-[12px] sm:text-[12.5px] font-medium text-gray-800 line-clamp-2 leading-tight h-[32px] group-hover:text-[#ac2c19] transition-colors mb-1.5"
          title={book.title}
        >
          {book.title}
        </h3>

        {/* Pricing Row: Red Price + Discount Badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] sm:text-[14px] font-bold text-[#ac2c19]">
            {price.toLocaleString('vi-VN')} đ
          </span>
          {discountLabel && (
            <span className="bg-[#ac2c19] text-white text-[9px] sm:text-[10px] font-bold px-1 py-0.2 rounded">
              {discountLabel}
            </span>
          )}
        </div>

        {/* Original Strikethrough Price */}
        {originalPrice && originalPrice > price && (
          <div className="text-[11px] text-gray-400 line-through leading-none mt-0.5">
            {originalPrice.toLocaleString('vi-VN')} đ
          </div>
        )}

        {/* Sales count */}
        <div className="text-[10.5px] text-gray-500 mt-1">
          Đã bán {salesCount}
        </div>
      </div>

      {/* Full-width "Thêm giỏ hàng" button (Red outline button matching Screenshot 1) */}
      <div className="mt-2.5 pt-1">
        <button
          type="button"
          onClick={handleAddToCart}
          className="w-full py-1.5 rounded-lg border border-[#ac2c19] text-[#ac2c19] hover:bg-[#ac2c19] hover:text-white transition-colors text-xs font-semibold text-center flex items-center justify-center gap-1 cursor-pointer"
        >
          Thêm giỏ hàng
        </button>
      </div>
    </article>
  );
}
