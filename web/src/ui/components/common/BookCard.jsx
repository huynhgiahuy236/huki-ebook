import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import BookCover from './BookCover';

/**
 * Enhanced BookCard Component for HUKI EBOOK
 * Supports variants:
 * - 'standard': Default catalog & shop grid card
 * - 'compact': Shelf horizontal scroll / compact grid (HomePage)
 * - 'list': Horizontal list item (Catalog list view)
 */
export default function BookCard({
  book,
  variant = 'standard',
  className = '',
  isMock: explicitMock
}) {
  const navigate = useNavigate();
  const { addToCart } = useCart();

  if (!book) return null;

  const isMock = explicitMock !== undefined ? explicitMock : (book.isMock ?? false);

  // Normalized book properties
  const price = book.price ?? book.priceEbook ?? 0;
  const originalPrice = book.originalPrice ?? book.originalPriceEbook;
  const discountLabel = book.discount ?? (book.discountPercent ? `-${book.discountPercent}%` : null);
  const rating = book.rating ?? 5.0;
  const reviewCount = book.reviewCount ?? book.reviews ?? book.sales ?? '0';
  const publisher = (typeof book.publisher === 'object' && book.publisher !== null) ? (book.publisher.displayName || book.publisher.name) : (book.publisher ?? book.shop ?? 'HUKI Publisher');
  const format = (typeof book.format === 'object' && book.format !== null) ? book.format.name : (book.format ?? (book.hasEbook && book.hasPaper ? 'Combo' : book.hasEbook ? 'Ebook' : 'Sách giấy'));
  const formatType = book.formatType ?? (book.hasEbook && !book.hasPaper ? 'ebook' : book.hasPaper && !book.hasEbook ? 'physical' : 'hybrid');
  const authorName = (typeof book.author === 'object' && book.author !== null) ? book.author.name : (book.author || book.authorName || 'Tác giả');

  const handleCardClick = (e) => {
    if (isMock) return;
    // If the click is inside a button or explicit anchor, let that element handle it
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    navigate(`/book/${book.id}`);
  };

  const handleAddToCart = (e) => {
    if (isMock) return;
    e.preventDefault();
    e.stopPropagation();
    addToCart(
      {
        id: book.id,
        title: book.title,
        price: price,
        priceEbook: book.priceEbook ?? price,
        pricePaper: book.pricePaper ?? (book.formatType === 'physical' ? price : originalPrice ?? price),
        originalPriceEbook: book.originalPriceEbook,
        originalPricePaper: book.originalPricePaper,
        cover: book.cover || book.coverUrl,
        author: book.author || book.authorName,
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
    ? 'opacity-40 pointer-events-none select-none relative cursor-not-allowed'
    : 'cursor-pointer';

  // 1. LIST VARIANT (Catalog List Mode)
  if (variant === 'list') {
    return (
      <article
        onClick={handleCardClick}
        className={`bg-theme-surface border border-theme-border/60 rounded-2xl p-4 flex flex-row items-center justify-between gap-4 hover:shadow-md hover:border-theme-secondary/40 transition-all duration-300 group relative ${mockClasses} ${className}`}
      >
        {isMock && (
          <span className="absolute top-2 right-2 z-30 bg-blue-100 text-blue-800 border border-blue-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
            MẪU (MOCK)
          </span>
        )}

        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="block relative aspect-[2/3] w-24 rounded-xl overflow-hidden bg-theme-surface-subtle shadow-xs shrink-0">
            <BookCover
              src={book.cover || book.coverUrl}
              title={book.title}
              author={authorName}
              className="group-hover:scale-105 transition-transform duration-300"
            />
            {format && (
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-theme-primary text-white shadow-xs">
                {format}
              </span>
            )}
            {discountLabel && (
              <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-theme-accent text-white shadow-xs">
                {discountLabel}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-[11px] text-theme-secondary block font-bold uppercase tracking-wider mb-0.5 truncate">
              {publisher}
            </span>
            <h3 className="font-bold text-sm text-theme-text group-hover:text-theme-secondary transition-colors line-clamp-1 truncate leading-snug">
              {book.title}
            </h3>
            <p className="text-xs text-theme-text-muted mt-0.5 truncate">{authorName}</p>

            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-theme-text">
              <span className="material-symbols-outlined text-amber-500 text-[15px] fill-current">star</span>
              <span className="font-bold">{rating}</span>
              <span className="text-theme-text-muted text-[11px]">({reviewCount})</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="text-right">
            <span className="text-sm sm:text-base font-bold text-theme-secondary block">
              {price.toLocaleString('vi-VN')}đ
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[11px] text-theme-text-muted/70 line-through">
                {originalPrice.toLocaleString('vi-VN')}đ
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Link
              to={isMock ? '#' : `/reader?book=${encodeURIComponent(book.id)}`}
              onClick={(e) => e.stopPropagation()}
              tabIndex={isMock ? -1 : 0}
              state={{ bookId: book.id, bookTitle: book.title }}
              className="w-9 h-9 rounded-xl bg-theme-surface-subtle text-theme-secondary hover:bg-theme-secondary hover:text-white flex items-center justify-center transition-colors shadow-2xs"
              title="Đọc thử miễn phí"
              aria-label={`Đọc thử ${book.title}`}
            >
              <span className="material-symbols-outlined text-[18px]">menu_book</span>
            </Link>
            <button
              onClick={handleAddToCart}
              tabIndex={isMock ? -1 : 0}
              className="w-9 h-9 rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="Thêm vào giỏ hàng"
              aria-label={`Thêm ${book.title} vào giỏ hàng`}
            >
              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
            </button>
          </div>
        </div>
      </article>
    );
  }

  // 2. COMPACT VARIANT (HomePage Shelf & Grids)
  if (variant === 'compact') {
    return (
      <div
        onClick={handleCardClick}
        className={`bg-theme-surface rounded-xl p-2.5 border border-theme-border/50 flex flex-col justify-between group hover:border-theme-secondary/50 hover:shadow-md transition-all duration-300 relative ${mockClasses} ${className}`}
      >
        {isMock && (
          <span className="absolute top-1.5 right-1.5 z-30 bg-blue-100 text-blue-800 border border-blue-200 text-[8.5px] font-bold px-1 py-0.5 rounded shadow-xs uppercase tracking-wider">
            MẪU (MOCK)
          </span>
        )}

        <div>
          <div className="aspect-[2/3] w-full rounded-lg overflow-hidden mb-2 bg-theme-surface-subtle relative shadow-xs">
            <BookCover
              src={book.cover || book.coverUrl}
              title={book.title}
              author={authorName}
              className="group-hover:scale-105 transition-transform duration-300"
            />
            {format && (
              <span className="absolute bottom-1.5 left-1.5 bg-theme-primary/90 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                {format}
              </span>
            )}
            {discountLabel && (
              <span className="absolute top-1.5 right-1.5 bg-theme-accent text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                {discountLabel}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10.5px] text-amber-500 font-semibold mb-0.5">
            <span className="material-symbols-outlined text-[12px] fill-current">star</span>
            <span className="text-theme-text font-bold">{rating}</span>
            <span className="text-theme-text-muted font-normal">({reviewCount})</span>
          </div>

          <h4
            title={book.title}
            className="text-[12.5px] font-semibold text-theme-text line-clamp-2 leading-tight group-hover:text-theme-secondary transition-colors h-[32px] block"
          >
            {book.title}
          </h4>
          <span className="text-[11px] text-theme-text-muted truncate mt-0.5 block">{authorName}</span>
        </div>

        <div className="mt-2 pt-1.5 border-t border-theme-border/40 flex items-center justify-between gap-1">
          <div>
            <span className="text-[13px] font-bold text-theme-secondary block">
              {price.toLocaleString('vi-VN')}đ
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-[10px] text-theme-text-muted/70 line-through block">
                {originalPrice.toLocaleString('vi-VN')}đ
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Link
              to={isMock ? '#' : `/reader?book=${encodeURIComponent(book.id)}`}
              onClick={(e) => e.stopPropagation()}
              tabIndex={isMock ? -1 : 0}
              state={{ bookId: book.id, bookTitle: book.title }}
              className="p-1.5 rounded-lg bg-theme-surface-subtle text-theme-secondary hover:bg-theme-secondary hover:text-white transition-colors"
              title="Đọc thử"
              aria-label={`Đọc thử ${book.title}`}
            >
              <span className="material-symbols-outlined text-[16px]">menu_book</span>
            </Link>
            <button
              onClick={handleAddToCart}
              tabIndex={isMock ? -1 : 0}
              className="p-1.5 rounded-lg bg-theme-primary text-white hover:bg-theme-primary-hover transition-colors cursor-pointer"
              title="Thêm vào giỏ"
              aria-label={`Thêm ${book.title} vào giỏ hàng`}
            >
              <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. STANDARD VARIANT (Catalog Grid & Shop Page)
  return (
    <article
      onClick={handleCardClick}
      className={`group bg-theme-surface rounded-2xl border border-theme-border/60 p-4 flex flex-col justify-between hover:shadow-md hover:border-theme-secondary/40 transition-all duration-300 hover:-translate-y-0.5 relative ${mockClasses} ${className}`}
    >
      {isMock && (
        <span className="absolute top-2 right-2 z-30 bg-blue-100 text-blue-800 border border-blue-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider">
          MẪU (MOCK)
        </span>
      )}

      <div>
        {/* Cover with 2:3 Aspect Ratio and Spine Crease */}
        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-theme-surface-subtle mb-3 book-spine-shadow shadow-xs">
          <BookCover
            src={book.cover || book.coverUrl}
            title={book.title}
            author={authorName}
            className="group-hover:scale-105 transition-transform duration-500"
          />

          {/* Discount Badge */}
          {discountLabel && (
            <span className="absolute top-2 left-2 bg-theme-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs z-20">
              {discountLabel}
            </span>
          )}

          {/* Format Badges on Cover */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
            {format && (
              <span className="bg-theme-primary/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs shadow-xs">
                {format}
              </span>
            )}
          </div>
        </div>

        {/* Publisher Tag */}
        <p className="text-[11px] font-bold text-theme-secondary uppercase tracking-wider truncate mb-1">
          {publisher}
        </p>

        {/* Book Title */}
        <h3
          className="font-bold text-sm text-theme-text line-clamp-1 truncate group-hover:text-theme-secondary transition-colors leading-snug mb-1 block"
          title={book.title}
        >
          {book.title}
        </h3>

        {/* Author */}
        <p className="text-xs text-theme-text-muted truncate mb-2">
          {authorName}
        </p>

        {/* Rating & Review Count */}
        <div className="flex items-center gap-1.5 text-xs text-theme-text mb-3">
          <span className="material-symbols-outlined text-amber-500 text-[15px] fill-current">star</span>
          <span className="font-bold">{rating}</span>
          <span className="text-theme-text-muted text-[11px]">({reviewCount})</span>
        </div>
      </div>

      {/* Pricing & Actions */}
      <div className="pt-3 border-t border-theme-border/50 flex items-center justify-between gap-2">
        <div>
          <span className="text-sm sm:text-base font-bold text-theme-secondary block">
            {price.toLocaleString('vi-VN')}đ
          </span>
          {originalPrice && originalPrice > price && (
            <span className="text-[11px] text-theme-text-muted/70 line-through">
              {originalPrice.toLocaleString('vi-VN')}đ
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={isMock ? '#' : `/reader?book=${encodeURIComponent(book.id)}`}
            onClick={(e) => e.stopPropagation()}
            tabIndex={isMock ? -1 : 0}
            state={{ bookId: book.id, bookTitle: book.title }}
            className="w-9 h-9 rounded-xl bg-theme-surface-subtle text-theme-secondary hover:bg-theme-secondary hover:text-white flex items-center justify-center transition-colors shadow-2xs"
            title="Đọc thử miễn phí"
            aria-label={`Đọc thử ${book.title}`}
          >
            <span className="material-symbols-outlined text-[18px]">menu_book</span>
          </Link>
          <button
            onClick={handleAddToCart}
            tabIndex={isMock ? -1 : 0}
            className="w-9 h-9 rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
            title="Thêm vào giỏ hàng"
            aria-label={`Thêm ${book.title} vào giỏ hàng`}
          >
            <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
          </button>
        </div>
      </div>
    </article>
  );
}
