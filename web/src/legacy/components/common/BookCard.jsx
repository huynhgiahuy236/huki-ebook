import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import BookCover from './BookCover';

export default function BookCard({ book }) {
  const { addToCart } = useCart();

  return (
    <div className="group bg-theme-surface rounded-card border border-theme-border p-4 flex flex-col justify-between hover:shadow-book-hover transition-all duration-300 hover:-translate-y-1">
      <div>
        {/* Cover with Spine Crease Effect */}
        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-theme-bg/60 mb-3 book-spine-shadow shadow-sm">
          <BookCover
            src={book.cover}
            title={book.title}
            author={book.author}
            className="group-hover:scale-105 transition-transform duration-500"
          />

          {/* Discount Badge */}
          {book.discountPercent && (
            <span className="absolute top-2 left-2 bg-theme-accent text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm z-20">
              -{book.discountPercent}%
            </span>
          )}

          {/* Format Badges on Cover */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
            {book.hasEbook && (
              <span className="bg-theme-primary/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur">
                Ebook
              </span>
            )}
            {book.hasPaper && (
              <span className="bg-theme-secondary/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded backdrop-blur">
                Sách Giấy
              </span>
            )}
          </div>
        </div>

        {/* Publisher Tag */}
        <p className="text-xs font-semibold text-theme-text-muted uppercase tracking-wider truncate mb-1">
          {book.publisher}
        </p>

        {/* Book Title */}
        <Link
          to={`/book/${book.id}`}
          className="font-bold text-sm text-theme-text line-clamp-1 truncate hover:text-theme-accent transition-colors leading-snug mb-1"
          title={book.title}
        >
          {book.title}
        </Link>

        {/* Author */}
        <p className="text-xs text-theme-text-muted truncate mb-2">
          {book.author}
        </p>

        {/* Rating & Review Count */}
        <div className="flex items-center gap-1 text-xs text-theme-text mb-3">
          <span className="material-symbols-outlined text-amber-500 text-sm fill-current">star</span>
          <span className="font-bold">{book.rating}</span>
          <span className="text-theme-text-muted text-xs">({book.reviewCount.toLocaleString()} đánh giá)</span>
        </div>
      </div>

      {/* Pricing & Add to Cart Action */}
      <div className="pt-2 border-t border-theme-border/60 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-theme-text-muted block">Giá Ebook từ</span>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm text-theme-accent">
              {book.priceEbook.toLocaleString()}đ
            </span>
            {book.originalPriceEbook && (
              <span className="text-[10px] text-theme-text-muted/70 line-through">
                {book.originalPriceEbook.toLocaleString()}đ
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            to={`/reader?book=${encodeURIComponent(book.id)}`}
            state={{ bookId: book.id, bookTitle: book.title }}
            className="p-2 rounded-lg bg-theme-bg text-theme-secondary hover:bg-theme-secondary hover:text-white transition-colors"
            title="Đọc thử miễn phí"
            aria-label={`Đọc thử ${book.title}`}
          >
            <span className="material-symbols-outlined text-lg">menu_book</span>
          </Link>
          <button
            onClick={() => addToCart(book, 'ebook')}
            className="p-2 rounded-lg bg-theme-primary text-white hover:opacity-90 transition-colors"
            title="Thêm vào giỏ hàng"
            aria-label={`Thêm ${book.title} vào giỏ hàng`}
          >
            <span className="material-symbols-outlined text-lg">add_shopping_cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}
