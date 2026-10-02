'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import { flashSaleApi, getCachedFlashSale, preloadActiveFlashSales } from '../../api/flashSaleApi';
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
  storeId?: string;
  businessId?: string;
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
  isFlashSale?: boolean;
  flashSaleInfo?: {
    salePrice: number;
    originalPrice: number;
    discountPercent: number;
    flashSaleId?: string;
    endsAt?: string;
  } | null;
}

export interface BookCardProps {
  book: BookCardData;
  variant?: 'standard' | 'compact' | 'list' | 'grid';
  className?: string;
  isMock?: boolean;
}

/**
 * Compact, modern BookCard Component for HUKI EBOOK
 * Optimized to match Shopee/Tiki ecommerce product cards with full Flash Sale support
 */
export default function BookCard({
  book,
  variant = 'standard',
  className = '',
  isMock: explicitMock
}: BookCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();

  const isMock = explicitMock !== undefined ? explicitMock : (book?.isMock ?? false);
  const cachedInitial = book?.flashSaleInfo !== undefined ? book.flashSaleInfo : (book?.id ? getCachedFlashSale(book.id) : null);
  const [flashSale, setFlashSale] = useState<any>(cachedInitial);

  // Auto-detect active Flash Sale price for the book
  useEffect(() => {
    if (book?.flashSaleInfo !== undefined) {
      setFlashSale(book.flashSaleInfo);
      return;
    }
    if (!book?.id || isMock || String(book.id).startsWith('mock-')) return;

    const hit = getCachedFlashSale(book.id);
    if (hit) {
      setFlashSale(hit);
      return;
    }

    let isMounted = true;
    preloadActiveFlashSales().then((map) => {
      if (isMounted) {
        const found = map.get(book.id);
        if (found) {
          setFlashSale(found);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [book?.id, book?.flashSaleInfo, isMock]);

  if (!book) return null;

  const isFlashSale = Boolean(flashSale?.salePrice);
  const basePrice = book.price ?? book.priceEbook ?? 0;
  const baseOriginalPrice = book.originalPrice ?? book.originalPriceEbook ?? (basePrice > 0 ? Math.round(basePrice * 1.35) : undefined);

  // Normalized book properties (with Flash Sale priority)
  const price = isFlashSale ? flashSale.salePrice : basePrice;
  const originalPrice = isFlashSale ? (flashSale.originalPrice || basePrice) : baseOriginalPrice;
  const discountPercent = isFlashSale
    ? flashSale.discountPercent
    : (book.discountPercent ?? (originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : null));
  const discountLabel = isFlashSale
    ? `-${flashSale.discountPercent}%`
    : (book.discount ?? (discountPercent ? `-${discountPercent}%` : null));

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
    const effectiveStoreId =
      book.storeId ||
      book.businessId ||
      (book as any).store?.id ||
      (book as any).business?.id ||
      'huki-official';
    const effectiveBusinessId =
      book.businessId ||
      book.storeId ||
      (book as any).business?.id ||
      effectiveStoreId;

    const resolvedFormat =
      formatType === 'hybrid'
        ? 'Combo Hybrid'
        : formatType === 'physical'
          ? 'Sách giấy'
          : 'Ebook Số';

    const resolvedType =
      formatType === 'hybrid' || formatType === 'physical'
        ? 'physical'
        : 'ebook';

    addToCart(
      {
        id: isFlashSale ? `${book.id}-flash-sale` : book.id,
        bookId: book.id,
        title: book.title,
        price: price,
        priceEbook: book.priceEbook ?? price,
        pricePaper: book.pricePaper ?? (formatType === 'physical' ? price : originalPrice ?? price),
        originalPriceEbook: book.originalPriceEbook,
        originalPricePaper: book.originalPricePaper,
        cover: book.cover || book.coverUrl,
        author: typeof book.author === 'string' ? book.author : authorName,
        publisher: publisher,
        storeId: effectiveStoreId,
        businessId: effectiveBusinessId,
        format: resolvedFormat,
        type: resolvedType,
        hasEbook: book.hasEbook ?? (formatType === 'ebook' || formatType === 'hybrid'),
        hasPaper: book.hasPaper ?? (formatType === 'physical' || formatType === 'hybrid'),
        stock: book.stock ?? 99,
        book: (book as any).book || book,
        store: (book as any).store,
        business: (book as any).business,
      },
      formatType === 'hybrid' ? 'hybrid' : formatType === 'physical' ? 'paper' : 'ebook',
      1
    );
  };

  const handleDirectBuy = (e: React.MouseEvent) => {
    if (isMock) return;
    e.preventDefault();
    e.stopPropagation();

    const effectiveStoreId =
      book.storeId ||
      book.businessId ||
      (book as any).store?.id ||
      (book as any).business?.id ||
      'huki-official';
    const effectiveBusinessId =
      book.businessId ||
      book.storeId ||
      (book as any).business?.id ||
      effectiveStoreId;

    const directItem = {
      id: `${book.id}-direct-flash-sale`,
      bookId: book.id,
      title: book.title,
      author: typeof book.author === 'string' ? book.author : authorName,
      price: price,
      originalPrice: originalPrice,
      cover: book.cover || book.coverUrl,
      quantity: 1,
      format: formatType === 'ebook' ? 'DIGITAL' : 'PHYSICAL',
      type: formatType === 'ebook' ? 'ebook' : 'physical',
      storeId: effectiveStoreId,
      businessId: effectiveBusinessId,
      publisher: publisher,
      flashSaleId: flashSale?.flashSaleId,
      isFlashSale: isFlashSale,
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem('huki_direct_checkout_item', JSON.stringify(directItem));
    }

    router.push('/checkout?direct=1');
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
            {isFlashSale && (
              <span className="absolute top-1 left-1 bg-gradient-to-r from-amber-500 to-rose-600 text-white font-black text-[8px] px-1 py-0.2 rounded shadow-xs flex items-center gap-0.5">
                ⚡ SALE
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-xs text-gray-900 group-hover:text-[#ac2c19] transition-colors line-clamp-2 leading-snug">
              {book.title}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{authorName}</p>

            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold ${isFlashSale ? 'text-rose-600 font-extrabold' : 'text-[#ac2c19]'}`}>
                {price.toLocaleString('vi-VN')} đ
              </span>
              {discountLabel && (
                <span className={`${isFlashSale ? 'bg-rose-600' : 'bg-[#ac2c19]'} text-white text-[9px] font-bold px-1 py-0.2 rounded`}>
                  {discountLabel}
                </span>
              )}
            </div>
          </div>
        </div>

        {isFlashSale ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDirectBuy}
              className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">bolt</span>
              <span>Mua Ngay</span>
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              title="Thêm vào giỏ"
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-[15px]">add_shopping_cart</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className="px-3 py-1.5 rounded-lg border border-[#ac2c19] text-[#ac2c19] hover:bg-[#ac2c19] hover:text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            Thêm giỏ hàng
          </button>
        )}
      </article>
    );
  }

  // 2. STANDARD / COMPACT / GRID VARIANT (Compact Ecommerce Card)
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

          {isFlashSale && (
            <div className="absolute top-1.5 left-1.5 z-20 bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-[9px] px-1.5 py-0.5 rounded-md shadow-md flex items-center gap-0.5 animate-pulse">
              <span className="material-symbols-outlined text-[11px]">bolt</span>
              <span>FLASH SALE</span>
            </div>
          )}
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
          <span className={`text-[13px] sm:text-[14px] font-bold ${isFlashSale ? 'text-rose-600 font-extrabold' : 'text-[#ac2c19]'}`}>
            {price.toLocaleString('vi-VN')} đ
          </span>
          {discountLabel && (
            <span className={`${isFlashSale ? 'bg-rose-600' : 'bg-[#ac2c19]'} text-white text-[9px] sm:text-[10px] font-bold px-1 py-0.2 rounded shadow-2xs`}>
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
        <div className="text-[10.5px] text-gray-500 mt-1 flex items-center justify-between">
          <span>Đã bán {salesCount}</span>
          {isFlashSale && (
            <span className="text-[10px] text-rose-600 font-bold flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[12px]">local_fire_department</span>
              <span>Giá sốc</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons: If Flash Sale, show Mua Ngay + Cart Icon, else Thêm giỏ hàng */}
      <div className="mt-2.5 pt-1">
        {isFlashSale ? (
          <div className="flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={handleDirectBuy}
              className="flex-1 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-[11px] transition-all shadow-2xs hover:shadow-sm flex items-center justify-center gap-1 cursor-pointer uppercase tracking-wider"
            >
              <span className="material-symbols-outlined text-[13px]">bolt</span>
              <span>Mua Ngay</span>
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              title="Thêm vào giỏ hàng với giá Flash Sale"
              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all flex items-center justify-center cursor-pointer shrink-0 shadow-2xs hover:scale-105 active:scale-95"
            >
              <span className="material-symbols-outlined text-[15px]">add_shopping_cart</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className="w-full py-1.5 rounded-lg border border-[#ac2c19] text-[#ac2c19] hover:bg-[#ac2c19] hover:text-white transition-colors text-xs font-semibold text-center flex items-center justify-center gap-1 cursor-pointer"
          >
            Thêm giỏ hàng
          </button>
        )}
      </div>
    </article>
  );
}
