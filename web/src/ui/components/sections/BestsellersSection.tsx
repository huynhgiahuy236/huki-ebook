"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { catalogApi, toCatalogBook } from '@/ui/api/catalogApi';

interface BestsellerBook {
  id: string;
  rank: number;
  title: string;
  author: string;
  shop: string;
  cover: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: string;
  soldSummary: string;
  category: string;
}

export default function BestsellersSection() {
  const [books, setBooks] = useState<BestsellerBook[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'paper' | 'ebook'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBestsellers = async () => {
      try {
        setIsLoading(true);
        // Fetch newest/popular books
        const res = await catalogApi.getPublicBooks({ limit: 12 });
        if (res.success && res.data) {
          const mapped: BestsellerBook[] = res.data.map((book, index) => {
            const catalogBook = toCatalogBook(book);
            return {
              id: catalogBook.id,
              rank: index + 1,
              title: catalogBook.title,
              author: catalogBook.author,
              shop: catalogBook.publisher,
              cover: catalogBook.cover,
              price: catalogBook.price,
              originalPrice: catalogBook.originalPrice,
              rating: catalogBook.rating || 5,
              reviews: catalogBook.sales || '0',
              soldSummary: book.createdAt ? 'Mới phát hành' : 'Đang bán',
              category: catalogBook.formatType,
            };
          });
          setBooks(mapped);
        }
      } catch (err) {
        console.warn('Bestsellers fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBestsellers();
  }, []);

  const filteredBooks = activeTab === 'all'
    ? books
    : books.filter(b =>
        activeTab === 'paper' ? b.category !== 'ebook' : b.category === 'ebook'
      ).slice(0, 6);

  // Rank badge colors
  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-amber-400 text-amber-950 font-black';
    if (rank === 2) return 'bg-slate-300 text-slate-900 font-bold';
    if (rank === 3) return 'bg-amber-600 text-white font-bold';
    return 'bg-slate-700 text-white';
  };

  if (isLoading) {
    return (
      <section className="animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (books.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3.5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8E5DF]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500 text-[24px] fill-icon">emoji_events</span>
          <div>
            <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#17201F]">Sản Phẩm Bán Chạy</h2>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'paper', label: 'Sách Giấy' },
            { id: 'ebook', label: 'Ebook Bản Quyền' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-[#003B2B] text-white shadow-xs'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {filteredBooks.slice(0, 6).map((book) => (
          <div
            key={book.id}
            className="bg-white rounded-xl p-2.5 border border-gray-100 flex flex-col justify-between hover:border-[#003B2B]/30 hover:shadow-md transition-all relative"
          >
            {/* Rank Badge */}
            <div className={`absolute top-2 left-2 z-20 w-6 h-6 rounded-md ${getRankStyle(book.rank)} text-[11px] flex items-center justify-center shadow-xs`}>
              #{book.rank}
            </div>

            {/* Cover */}
            <Link href={`/book/${book.id}`} className="block mt-4">
              <div className="aspect-[2/3] w-full rounded-lg overflow-hidden mb-2 bg-gray-50 relative">
                <img
                  src={book.cover}
                  alt={book.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            </Link>

            {/* Info */}
            <div className="flex flex-col flex-1">
              <div className="flex items-center gap-1 text-[10.5px] text-gray-600 font-semibold mb-0.5">
                <span className="material-symbols-outlined text-[12px] fill-icon text-amber-500">star</span>
                <span>{book.rating}</span>
                <span className="text-gray-400 font-normal">({book.reviews})</span>
              </div>

              <Link href={`/book/${book.id}`} className="text-[12.5px] font-semibold text-gray-900 line-clamp-2 leading-tight hover:text-[#003B2B] transition-colors h-[32px]">
                {book.title}
              </Link>

              <span className="text-[11px] text-gray-500 truncate mt-0.5">{book.author}</span>
              <span className="text-[10px] text-[#003B2B]/80 truncate font-medium">{book.shop}</span>

              <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-[13.5px] font-bold text-[#003B2B]">
                    {book.price.toLocaleString('vi-VN')}₫
                  </div>
                  <span className="text-[9.5px] text-gray-400 font-medium block">{book.soldSummary}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* View All Link */}
      <div className="text-center pt-2">
        <Link href="/books?sort=popular" className="text-xs font-semibold text-[#003B2B] hover:underline">
          Xem tất cả →
        </Link>
      </div>
    </section>
  );
}
