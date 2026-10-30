'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '../../context/CartContext';
import { flashSaleApi, getCachedFlashSale, preloadActiveFlashSales } from '../../api/flashSaleApi';
import { personalizationService } from '../../services/personalizationService';
import { useReviewSummary } from '../../services/reviewSummaryService';
import { userApi } from '../../api/userApi';
import { tokenStorage } from '../../api/tokenStorage';
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
  soldCount?: number | string;
  soldQuantity?: number | string;
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

  // Wishlist state and sync with localStorage
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !book?.id) return;
    try {
      const saved = JSON.parse(localStorage.getItem('huki_wishlist_ids') || '[]');
      setIsWishlisted(Array.isArray(saved) && saved.includes(book.id));
    } catch {}

    const handleWishlistEvent = (e: any) => {
      if (e?.detail?.bookId === book.id) {
        setIsWishlisted(Boolean(e.detail.wishlisted));
      }
    };
    window.addEventListener('huki_wishlist_updated', handleWishlistEvent);
    return () => {
      window.removeEventListener('huki_wishlist_updated', handleWishlistEvent);
    };
  }, [book?.id]);

  const fallbackNum = typeof book?.rating === 'number'
    ? book.rating
    : (!isNaN(Number((book as any)?.averageRating)) ? Number((book as any)?.averageRating) : 0);
  const { rating: reviewRating, displayRating: hookDisplayRating } = useReviewSummary(
    book?.id || '',
    fallbackNum > 0 ? fallbackNum : undefined
  );

  if (!book) return null;

  const isFlashSale = Boolean(flashSale?.salePrice);
  const basePrice = book.price ?? book.priceEbook ?? 0;
  const baseOriginalPrice = book.originalPrice ?? book.originalPriceEbook;

  // Normalized book properties (with Flash Sale priority)
  const price = isFlashSale ? flashSale.salePrice : basePrice;
  const originalPrice = isFlashSale ? (flashSale.originalPrice || basePrice) : baseOriginalPrice;
  const discountPercent = isFlashSale
    ? flashSale.discountPercent
    : (book.discountPercent ?? (originalPrice && originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : null));
  const discountLabel = isFlashSale
    ? `-${flashSale.discountPercent}%`
    : (book.discount ?? (discountPercent ? `-${discountPercent}%` : null));

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof window === 'undefined' || !book?.id) return;
    try {
      const savedIds: string[] = JSON.parse(localStorage.getItem('huki_wishlist_ids') || '[]');
      let newIds: string[];
      const willWishlist = !isWishlisted;
      if (savedIds.includes(book.id)) {
        newIds = savedIds.filter(id => id !== book.id);
      } else {
        newIds = [...savedIds, book.id];
      }
      setIsWishlisted(willWishlist);
      localStorage.setItem('huki_wishlist_ids', JSON.stringify(newIds));

      const savedBooks = JSON.parse(localStorage.getItem('huki_wishlist_books') || '{}');
      if (willWishlist) {
        savedBooks[book.id] = {
          id: book.id,
          title: book.title,
          author: typeof book.author === 'object' && book.author !== null ? (book.author.name || 'Tác giả') : (book.author || book.authorName || 'Tác giả'),
          coverUrl: book.cover || book.coverUrl,
          price: price,
        };
      } else {
        delete savedBooks[book.id];
      }
      localStorage.setItem('huki_wishlist_books', JSON.stringify(savedBooks));

      window.dispatchEvent(new CustomEvent('huki_wishlist_updated', {
        detail: { bookId: book.id, wishlisted: willWishlist }
      }));

      // Sync with server if authenticated
      if (tokenStorage.getAccessToken()) {
        userApi.updateProfile({ wishlist: newIds }).catch((e) => {
          console.warn('Could not sync wishlist to server profile:', e);
        });
      }
    } catch (err) {
      console.warn('Wishlist update error:', err);
    }
  };

  // Authentic rating & sales strictly from DB & reviews service - NO fake data
  const displayRating = hookDisplayRating || (fallbackNum > 0 ? fallbackNum.toFixed(1) : null);

  const rawSales = book.soldCount ?? book.sales ?? book.soldQuantity ?? (book as any).salesCount ?? (book as any).orderCount ?? (book as any).readCount ?? 0;
  const salesNum = typeof rawSales === 'number' ? rawSales : (!isNaN(Number(rawSales)) ? Number(rawSales) : 0);
  const formattedSales = salesNum >= 1000
    ? `${(salesNum / 1000).toFixed(1)}k`
    : `${salesNum}`;
  const displaySales = formattedSales;

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
    // Ghi nhận tương tác xem sách / bấm vô detail ngay lập tức để render lại gợi ý cá nhân hóa
    try {
      personalizationService.recordBookInteraction(
        book.id,
        (book as any).categoryId || (book as any).category?.id,
        (book as any).categoryName || (book as any).category?.name || (typeof book.format === 'string' ? book.format : undefined),
        authorName
      );
    } catch {}
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
        className={`bg-white border border-gray-200/80 rounded-xl p-3 flex flex-row items-center justify-between gap-3 hover:shadow-sm hover:border-[#00875A] transition-all group relative cursor-pointer ${className}`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative aspect-[3/4] w-20 rounded-lg overflow-hidden bg-gray-50 shadow-2xs shrink-0 group/cover">
            <BookCover
              src={book.cover || book.coverUrl}
              title={book.title}
              author={authorName}
              className="group-hover:scale-105 transition-transform duration-300"
            />
            {/* Wishlist Button on List Variant */}
            <button
              type="button"
              onClick={handleToggleWishlist}
              className={`absolute top-1 right-1 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-xs cursor-pointer ${
                isWishlisted
                  ? 'bg-rose-500 text-white shadow-rose-500/30'
                  : 'bg-black/35 hover:bg-black/60 text-white/90 hover:text-white'
              }`}
              title={isWishlisted ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
            >
              <span className={`material-symbols-outlined text-[13px] ${isWishlisted ? 'fill-current' : ''}`}>
                {isWishlisted ? 'favorite' : 'favorite_border'}
              </span>
            </button>
            {isFlashSale && (
              <span className="absolute top-1 left-1 bg-rose-600 text-white font-bold text-[8.5px] px-1.5 py-0.5 rounded shadow-2xs">
                Flash Sale
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-xs text-gray-900 group-hover:text-[#003b2b] transition-colors line-clamp-2 leading-snug">
              {book.title}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5 truncate">{authorName}</p>

            {/* Rating & Sales (Luôn hiển thị rõ ràng, không hiển thị ★ 0) */}
            <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px]">
              {displayRating ? (
                <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                  <span className="material-symbols-outlined text-[12px] fill-current">star</span>
                  <span>{displayRating}</span>
                </div>
              ) : (
                <span className="text-gray-400 text-[10px]">Chưa có đánh giá</span>
              )}
              <span className="text-gray-300 text-[9px]">•</span>
              <span className="text-gray-500 text-[10px]">
                Đã bán {displaySales}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-[#003b2b]">
                {price.toLocaleString('vi-VN')} đ
              </span>
              {discountLabel && (
                <span className="bg-[#e6f4f0] text-[#006953] text-[9px] font-bold px-1 py-0.2 rounded border border-[#006953]/30">
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
              className="px-3 py-1.5 rounded-lg bg-[#003b2b] hover:bg-[#00241a] text-white text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[13px]">bolt</span>
              <span>Mua Ngay</span>
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              title="Thêm vào giỏ"
              className="p-1.5 rounded-lg bg-[#e6f4f0] hover:bg-[#d0ebe3] text-[#003b2b] border border-[#003b2b]/20 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
            >
              <span className="material-symbols-outlined text-[15px]">add_shopping_cart</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            className="px-3 py-1.5 rounded-lg border border-[#003b2b] text-[#003b2b] hover:bg-[#003b2b] hover:text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer"
          >
            Thêm giỏ hàng
          </button>
        )}
      </article>
    );
  }

  // 2. STANDARD / COMPACT / GRID VARIANT (Shopee-style Compact & High-density)
  return (
    <article
      onClick={handleCardClick}
      className={`group bg-white rounded-lg border border-slate-200/80 hover:border-[#00875A] hover:shadow-md transition-all flex flex-col justify-between relative cursor-pointer overflow-hidden ${className}`}
    >
      {/* 1:1 Aspect Ratio Cover Container (Flush with card edges like Shopee) */}
      <div className="relative aspect-square w-full overflow-hidden bg-slate-50 flex items-center justify-center group/cover border-b border-slate-100">
        <BookCover
          src={book.cover || book.coverUrl}
          title={book.title}
          author={authorName}
          className="group-hover:scale-105 transition-transform duration-300 w-full h-full object-cover"
        />

        {/* Nút Yêu Thích (Wishlist Heart Button) - Bottom right of cover image */}
        <button
          type="button"
          onClick={handleToggleWishlist}
          className={`absolute bottom-1.5 right-1.5 z-20 w-6 h-6 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-xs cursor-pointer ${
            isWishlisted
              ? 'bg-rose-500 text-white shadow-rose-500/30 scale-105'
              : 'bg-white/80 hover:bg-white text-slate-600 hover:text-rose-500 shadow-2xs'
          }`}
          title={isWishlisted ? 'Bỏ khỏi danh sách yêu thích' : 'Thêm vào yêu thích'}
        >
          <span className={`material-symbols-outlined text-[14px] ${isWishlisted ? 'fill-current text-white' : ''}`}>
            {isWishlisted ? 'favorite' : 'favorite_border'}
          </span>
        </button>

        {/* Discount Badge in Top-Right Corner (like Shopee) */}
        {discountLabel && (
          <div className="absolute top-0 right-0 z-10 bg-amber-400 text-rose-700 text-[10px] font-black px-1.5 py-0.5 rounded-bl shadow-2xs">
            {discountLabel}
          </div>
        )}

        {/* Genuine Format / Flash Sale Badges in Top-Left */}
        <div className="absolute top-1.5 left-1.5 z-10 flex flex-col gap-1 pointer-events-none">
          {isFlashSale && (
            <span className="bg-rose-600 text-white text-[8.5px] font-bold px-1.5 py-0.5 rounded-sm shadow-2xs">
              Flash Sale
            </span>
          )}
          {formatType === 'ebook' && (
            <span className="bg-[#00875A] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs">
              Ebook
            </span>
          )}
          {formatType === 'hybrid' && (
            <span className="bg-indigo-700 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs">
              Combo
            </span>
          )}
        </div>
      </div>

      {/* Card Body - Ultra Compact Shopee Style */}
      <div className="p-1.5 sm:p-2 flex flex-col flex-1 justify-between gap-1">
        <div>
          {/* Authentic Book Title (2 lines max, 12px, tight line height) */}
          <h3
            className="text-[11.5px] sm:text-[12px] font-medium text-slate-800 line-clamp-2 leading-[1.3] group-hover:text-[#00875A] transition-colors min-h-[29px]"
            title={book.title}
          >
            {book.title}
          </h3>

          {/* Author & Sales in ONE single compact row */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 min-w-0">
            <span className="truncate max-w-[65%]">
              {authorName && authorName !== 'Tác giả' ? authorName : publisher}
            </span>
            <span className="shrink-0 text-slate-500 font-medium">
              Đã bán {displaySales}
            </span>
          </div>
        </div>

        {/* Pricing Row + Compact Add to Cart (Same row to save vertical height) */}
        <div className="flex items-center justify-between gap-1 pt-1 mt-auto border-t border-slate-100/80">
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-[13.5px] font-bold text-[#00875A] font-mono leading-none">
              {price.toLocaleString('vi-VN')}₫
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[9.5px] text-slate-400 line-through font-mono leading-none mt-0.5">
                {originalPrice.toLocaleString('vi-VN')}₫
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            title="Thêm vào giỏ"
            className="w-6 h-6 rounded-md bg-emerald-50 hover:bg-[#00875A] text-[#00875A] hover:text-white border border-emerald-200/50 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-95 shrink-0"
          >
            <span className="material-symbols-outlined text-[13px]">add_shopping_cart</span>
          </button>
        </div>
      </div>
    </article>
  );
}
