'use client';

import React, { useState, useEffect } from 'react';
import { catalogApi, type BookData } from '@/ui/api/catalogApi';

export interface ChatBookPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: string;
  onSelectBook: (book: {
    id: string;
    title: string;
    price: number;
    coverUrl: string;
    slug?: string;
    author?: string;
    format?: string;
  }) => void;
}

export default function ChatBookPickerModal({
  isOpen,
  onClose,
  storeId,
  onSelectBook,
}: ChatBookPickerModalProps) {
  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 8;

  // Debounce search query 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch books from real store catalog
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const fetchBooks = async () => {
      setLoading(true);
      try {
        const res = await catalogApi.getPublicBooks({
          search: debouncedSearch || undefined,
          store: storeId || undefined,
          page,
          limit,
        });

        if (!active) return;

        if (res.success && res.data) {
          const list = Array.isArray(res.data)
            ? res.data
            : (res.data as any)?.items || [];
          setBooks(list);
          const totalCount =
            (res.data as any)?.total ||
            (res as any)?.meta?.total ||
            list.length;
          setTotal(totalCount);
        } else {
          setBooks([]);
          setTotal(0);
        }
      } catch (err) {
        console.error('Error fetching store books for chat:', err);
        if (active) {
          setBooks([]);
          setTotal(0);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchBooks();

    return () => {
      active = false;
    };
  }, [isOpen, debouncedSearch, page, storeId]);

  if (!isOpen) return null;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handlePickBook = (book: BookData) => {
    const cover = book.coverUrl || book.coverImage || book.cover || '';
    const authorName =
      typeof book.author === 'string'
        ? book.author
        : book.author?.name || 'Tác giả HuKi';

    onSelectBook({
      id: book.id,
      title: book.title,
      price: Number(book.price || 0),
      coverUrl: cover,
      slug: book.slug,
      author: authorName,
      format: book.format,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 font-sans">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-tight">Chọn Sách Tư Vấn Khách Hàng</h2>
              <p className="text-[11px] text-white/80">
                Kho sách gian hàng ({total} đầu sách)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 text-lg">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên sách, tác giả, thể loại..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-hidden focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Book Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
              <span className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium">Đang tải kho sách của gian hàng...</p>
            </div>
          ) : books.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
              <span className="material-symbols-outlined text-4xl text-slate-300">menu_book</span>
              <p className="text-sm font-semibold text-slate-600">Không tìm thấy sách nào phù hợp</p>
              <p className="text-xs text-slate-400">
                Thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại bộ lọc.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {books.map((book) => {
                const cover = book.coverUrl || book.coverImage || book.cover || '';
                const authorName =
                  typeof book.author === 'string'
                    ? book.author
                    : book.author?.name || 'Tác giả HuKi';

                return (
                  <div
                    key={book.id}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex items-start gap-3 bg-white group cursor-pointer"
                    onClick={() => handlePickBook(book)}
                  >
                    <div className="w-16 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-2xs">
                      {cover ? (
                        <img
                          src={cover}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                          <span className="material-symbols-outlined text-xl">book</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                          {book.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {authorName}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="font-mono font-bold text-xs text-emerald-700">
                          {Number(book.price || 0).toLocaleString('vi-VN')} ₫
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
                          Chọn gửi →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Pagination */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
            <span>
              Trang <strong>{page}</strong> / {totalPages} ({total} sách)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">chevron_left</span>
                <span>Trước</span>
              </button>
              <button
                type="button"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold flex items-center gap-1"
              >
                <span>Sau</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
