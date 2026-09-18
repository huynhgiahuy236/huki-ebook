"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { catalogApi, toCatalogBook } from '@/ui/api/catalogApi';

interface EbookBook {
  id: string;
  title: string;
  author: string;
  price: number;
  originalPrice: number;
  cover: string;
  rating: number;
  reviews: string;
}

export default function EbooksSection() {
  const [books, setBooks] = useState<EbookBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchEbooks = async () => {
      try {
        setIsLoading(true);
        // Fetch digital books only
        const res = await catalogApi.getPublicBooks({ format: 'DIGITAL', limit: 6 });
        if (res.success && res.data) {
          const mapped = res.data.map(book => {
            const cb = toCatalogBook(book);
            return {
              id: cb.id,
              title: cb.title,
              author: cb.author,
              price: cb.price,
              originalPrice: cb.originalPrice,
              cover: cb.cover,
              rating: 5,
              reviews: '0',
            };
          });
          setBooks(mapped);
        }
      } catch (err) {
        console.warn('Ebooks fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEbooks();
  }, []);

  if (isLoading) {
    return (
      <section className="animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (books.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-1 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-600 text-[22px]">devices</span>
          <div>
            <h2 className="text-[15px] sm:text-[16px] font-bold text-gray-900">Ebook & Đọc Online Bản Quyền</h2>
            <p className="text-[11px] text-gray-500">Đọc tức thì trên WebReader độc quyền</p>
          </div>
        </div>
        <Link href="/books?format=ebook" className="text-[12.5px] text-[#003B2B] hover:underline font-semibold flex items-center gap-0.5">
          <span>Xem thêm</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </Link>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-2.5 sm:gap-3">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/book/${book.id}`}
            className="bg-white rounded-xl p-2.5 border border-gray-100 flex flex-col justify-between hover:border-[#003B2B]/30 hover:shadow-md transition-all"
          >
            {/* Cover */}
            <div className="aspect-[2/3] w-full rounded-lg overflow-hidden mb-2 bg-gray-50">
              <img src={book.cover} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1">
              <div className="flex items-center gap-1 text-[10px] text-amber-500 font-semibold mb-0.5">
                <span className="material-symbols-outlined text-[11px] fill-icon">star</span>
                <span>{book.rating}</span>
                <span className="text-gray-400">({book.reviews})</span>
              </div>
              <h3 className="text-[11.5px] font-semibold text-gray-900 line-clamp-2 leading-tight mb-1">{book.title}</h3>
              <span className="text-[10px] text-gray-500 truncate mb-2">{book.author}</span>
              <div className="mt-auto">
                <span className="text-[13px] font-bold text-[#003B2B]">{book.price.toLocaleString('vi-VN')}₫</span>
                {book.originalPrice > book.price && (
                  <span className="text-[10px] text-gray-400 line-through ml-1">{book.originalPrice.toLocaleString('vi-VN')}₫</span>
                )}
              </div>
            </div>

            {/* Read Now Badge */}
            <div className="mt-2 pt-2 border-t border-gray-100">
              <span className="text-[10px] font-bold text-teal-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">auto_stories</span>
                Đọc ngay
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
