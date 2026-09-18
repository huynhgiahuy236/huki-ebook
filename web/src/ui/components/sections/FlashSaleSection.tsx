"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { flashSaleApi, FlashSaleSlot, FlashSaleItem } from '@/ui/api/flashSaleApi';
import { catalogApi } from '@/ui/api/catalogApi';

interface FlashSaleBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  price: number;
  originalPrice: number;
  discount: string;
  rating: number;
  reviews: string;
  soldPercent: number;
  soldText: string;
}

export default function FlashSaleSection() {
  const [flashSale, setFlashSale] = useState<FlashSaleSlot | null>(null);
  const [books, setBooks] = useState<FlashSaleBook[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFlashSale = async () => {
      try {
        const res = await flashSaleApi.getActiveFlashSales();
        if (res.success && res.data && res.data.length > 0) {
          const sale = res.data[0];
          setFlashSale(sale);
          setSeconds(sale.remainingSeconds || 0);

          // Fetch book details for each item
          const bookDetails = await Promise.all(
            sale.items.slice(0, 6).map(async (item) => {
              const bookRes = await catalogApi.getBookById(item.bookId);
              const book = bookRes.data;
              return {
                id: item.bookId,
                title: book?.title || item.bookTitle || `Sách #${item.bookId.slice(0, 6)}`,
                author: book?.author?.name || 'Tác giả HUKI',
                cover: book?.coverUrl || '/banners/book-placeholder.jpg',
                price: item.salePrice,
                originalPrice: item.originalPrice,
                discount: `-${item.discountPercent}%`,
                rating: 5,
                reviews: 'Mới',
                soldPercent: item.soldPercent,
                soldText: item.isSoldOut ? 'Đã bán hết' : `Đã bán ${item.sold} cuốn`,
              };
            })
          );
          setBooks(bookDetails);
        }
      } catch (err) {
        console.warn('Flash sale fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFlashSale();
  }, []);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s: number) => ({
    hours: String(Math.floor(s / 3600)).padStart(2, '0'),
    minutes: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
    seconds: String(s % 60).padStart(2, '0'),
  });

  const time = formatTime(seconds);

  if (isLoading) {
    return (
      <section className="bg-[#FAF3EE] rounded-3xl p-4 sm:p-6 border border-[#EADBCE]">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!flashSale || books.length === 0) {
    return null; // Don't show section if no flash sale
  }

  return (
    <section className="bg-[#FAF3EE] rounded-3xl p-4 sm:p-6 border border-[#EADBCE] shadow-sm flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8D6C4]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-[#B02E1B] text-white px-3.5 py-1.5 rounded-xl font-editorial font-bold text-sm tracking-wide flex items-center gap-1.5 shadow-xs">
            <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
            <span>{flashSale.name || 'HUKI DEAL HÔM NAY'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#59413C] font-semibold">
            <span>Kết thúc sau:</span>
            <span className="bg-[#17201F] text-white px-2 py-1 rounded-lg text-xs font-mono font-bold">{time.hours}</span>
            <span>:</span>
            <span className="bg-[#17201F] text-white px-2 py-1 rounded-lg text-xs font-mono font-bold">{time.minutes}</span>
            <span>:</span>
            <span className="bg-[#17201F] text-white px-2 py-1 rounded-lg text-xs font-mono font-bold">{time.seconds}</span>
          </div>
        </div>
        <Link href="/flash-sale" className="text-xs text-[#B02E1B] hover:underline font-bold flex items-center gap-0.5">
          <span>Xem tất cả</span>
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>

      {/* Book Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {books.map((book) => (
          <Link
            key={book.id}
            href={`/book/${book.id}`}
            className="bg-white rounded-2xl p-3 border border-[#E8E5DF] flex flex-col justify-between hover:border-[#B02E1B]/50 hover:shadow-lg transition-all"
          >
            {/* Discount Badge */}
            <span className="absolute top-2.5 left-2.5 z-20 bg-[#B02E1B] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
              {book.discount}
            </span>

            {/* Cover */}
            <div className="aspect-[3/4] w-full rounded-xl overflow-hidden mb-2 bg-[#FAF8F5] relative mt-5">
              <img src={book.cover} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
            </div>

            {/* Info */}
            <div className="flex flex-col flex-1">
              <div className="flex items-center gap-1 text-[11px] text-amber-500 font-bold mb-1">
                <span>★</span>
                <span>{book.rating}</span>
                <span className="text-gray-400 font-normal">({book.reviews})</span>
              </div>
              <h3 className="text-xs font-bold text-[#17201F] line-clamp-1 hover:text-[#003B2B] transition-colors">
                {book.title}
              </h3>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="text-sm font-bold text-[#B02E1B]">{book.price.toLocaleString('vi-VN')}₫</span>
                <span className="text-[10px] text-gray-400 line-through">{book.originalPrice.toLocaleString('vi-VN')}₫</span>
              </div>
              <div className="text-[10px] text-gray-500 font-medium mt-0.5">{book.soldText}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
