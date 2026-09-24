'use client';

/**
 * HUKI EBOOK - Seller Custom Book Discounts View (Giảm Giá Tự Do)
 * Quản lý chương trình giảm giá trực tiếp theo sách của Seller (No Popup / In-Page Expansion)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { catalogApi } from '@/ui/api/catalogApi';
import { discountApi, BookDiscount, DiscountType } from '@/ui/api/discountApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerActionButton,
  SellerFilterTabs,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';

interface BookItem {
  id: string;
  title: string;
  price?: number | string;
  coverUrl?: string | null;
  status?: string;
  author?: string | { name?: string; id?: string } | null;
  businessId?: string;
  storeId?: string;
  category?: { name?: string } | null;
}

export function SellerDiscountsView() {
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [books, setBooks] = useState<BookItem[]>([]);
  const [discountsMap, setDiscountsMap] = useState<Record<string, BookDiscount>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'DISCOUNTED' | 'NOT_DISCOUNTED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // In-Page Configuration State (NO POPUP)
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [startsAt, setStartsAt] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const formatVND = (amount?: number | string | null) => {
    const num = Number(amount) || 0;
    return num.toLocaleString('vi-VN') + 'đ';
  };

  const getAuthorName = (book: BookItem): string => {
    if (!book.author) return 'HUKI Official';
    if (typeof book.author === 'string') return book.author;
    return book.author.name || 'HUKI Official';
  };

  const toLocalDatetimeString = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const bizId = user?.business?.id || activeBusinessId;
      const booksRes = await catalogApi.getPublicBooks({
        limit: 100,
        ...(bizId ? { business: bizId } : {}),
      });

      if (booksRes.success && Array.isArray(booksRes.data)) {
        const publishedBooks = booksRes.data.filter((b: any) => {
          const belongsToBiz = bizId ? (b.business?.id || b.businessId) === bizId : true;
          return (b.status === 'PUBLISHED' || !b.status) && belongsToBiz;
        });

        setBooks(publishedBooks);

        const bookIds = publishedBooks.map((b: any) => b.id);
        if (bookIds.length > 0) {
          try {
            const discRes = await discountApi.getDiscountsForBooks(bookIds);
            if (discRes.success && Array.isArray(discRes.data)) {
              const map: Record<string, BookDiscount> = {};
              discRes.data.forEach((d) => {
                if (d && d.bookId) {
                  map[d.bookId] = d;
                }
              });
              setDiscountsMap(map);
            }
          } catch {
            // ignore
          }
        }
      }
    } catch {
      showToast({ title: 'Lỗi', message: 'Không thể tải danh mục sách.' }, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, activeBusinessId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenForm = (book: BookItem) => {
    setSelectedBook(book);
    const existing = discountsMap[book.id];
    if (existing) {
      setDiscountType(existing.type);
      setDiscountValue(existing.value.toString());
      setStartsAt(toLocalDatetimeString(new Date(existing.startsAt)));
      setExpiresAt(toLocalDatetimeString(new Date(existing.expiresAt)));
    } else {
      setDiscountType('PERCENTAGE');
      setDiscountValue('10');
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setStartsAt(toLocalDatetimeString(now));
      setExpiresAt(toLocalDatetimeString(nextWeek));
    }
  };

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d+$/.test(val)) {
      setDiscountValue(val);
    }
  };

  const validation = useMemo(() => {
    if (!selectedBook) return { isValid: false, message: '' };

    const basePrice = Number(selectedBook.price) || 0;
    const numVal = Number(discountValue);

    if (!discountValue || isNaN(numVal) || numVal <= 0) {
      return { isValid: false, message: 'Vui lòng nhập mức giảm lớn hơn 0.' };
    }

    if (discountType === 'PERCENTAGE') {
      if (numVal < 1 || numVal > 100) {
        return { isValid: false, message: 'Phần trăm giảm phải từ 1% đến 100%.' };
      }
    } else if (discountType === 'FIXED_AMOUNT') {
      if (numVal > basePrice) {
        return {
          isValid: false,
          message: `Số tiền giảm (${formatVND(numVal)}) không được lớn hơn giá gốc (${formatVND(basePrice)}).`,
        };
      }
    }

    if (!startsAt || !expiresAt) {
      return { isValid: false, message: 'Vui lòng chọn thời gian bắt đầu và kết thúc.' };
    }

    const start = new Date(startsAt).getTime();
    const end = new Date(expiresAt).getTime();

    if (isNaN(start) || isNaN(end)) {
      return { isValid: false, message: 'Định dạng ngày giờ không hợp lệ.' };
    }

    if (end <= start) {
      return { isValid: false, message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' };
    }

    return { isValid: true, message: '' };
  }, [selectedBook, discountType, discountValue, startsAt, expiresAt]);

  const preview = useMemo(() => {
    if (!selectedBook) return { discountAmt: 0, salePrice: 0 };
    const basePrice = Number(selectedBook.price) || 0;
    const numVal = Number(discountValue) || 0;

    let discountAmt = 0;
    if (discountType === 'PERCENTAGE') {
      discountAmt = Math.round((basePrice * Math.min(100, Math.max(0, numVal))) / 100);
    } else {
      discountAmt = Math.min(basePrice, Math.max(0, numVal));
    }
    const salePrice = Math.max(0, basePrice - discountAmt);
    return { discountAmt, salePrice };
  }, [selectedBook, discountType, discountValue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !validation.isValid) return;

    setSubmitting(true);
    try {
      const res = await discountApi.createOrUpdateDiscount({
        bookId: selectedBook.id,
        type: discountType,
        value: Number(discountValue),
        startsAt: new Date(startsAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
      });

      if (res.success && res.data) {
        showToast(
          {
            title: 'Thành công',
            message: `Đã thiết lập giảm giá cho sách "${selectedBook.title}".`,
          },
          'success'
        );
        setDiscountsMap((prev) => ({
          ...prev,
          [selectedBook.id]: res.data!,
        }));
        setSelectedBook(null);
      } else {
        showToast(
          {
            title: 'Lỗi',
            message: res.error?.message || 'Không thể áp dụng giảm giá.',
          },
          'error'
        );
      }
    } catch {
      showToast({ title: 'Lỗi', message: 'Lỗi kết nối máy chủ.' }, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDiscount = async (bookId: string) => {
    const disc = discountsMap[bookId];
    if (!disc) return;

    setCancellingId(disc.id);
    try {
      const res = await discountApi.cancelDiscount(disc.id);
      if (res.success) {
        showToast({ title: 'Đã hủy', message: 'Đã hủy áp dụng giảm giá cho ấn phẩm này.' }, 'info');
        setDiscountsMap((prev) => {
          const next = { ...prev };
          delete next[bookId];
          return next;
        });
      } else {
        showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể hủy giảm giá' }, 'error');
      }
    } catch {
      showToast({ title: 'Lỗi', message: 'Lỗi kết nối máy chủ.' }, 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const matchesSearch =
        !searchQuery.trim() ||
        b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.id.toLowerCase().includes(searchQuery.toLowerCase());

      const hasDisc = Boolean(discountsMap[b.id]);
      let matchesTab = true;
      if (filterTab === 'DISCOUNTED') matchesTab = hasDisc;
      if (filterTab === 'NOT_DISCOUNTED') matchesTab = !hasDisc;

      return matchesSearch && matchesTab;
    });
  }, [books, discountsMap, searchQuery, filterTab]);

  const totalPages = Math.ceil(filteredBooks.length / pageSize) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage, pageSize]);

  const tabs = [
    { key: 'ALL', label: 'Tất cả', count: books.length },
    { key: 'DISCOUNTED', label: 'Đang giảm giá', count: Object.keys(discountsMap).length },
    { key: 'NOT_DISCOUNTED', label: 'Chưa giảm giá', count: Math.max(0, books.length - Object.keys(discountsMap).length) },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200/60">
              <span className="material-symbols-outlined text-[20px]">sell</span>
            </span>
            <span>Giảm Giá Sách Tự Do</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chủ động cài đặt mức giảm giá theo % hoặc tiền mặt cho từng ấn phẩm của gian hàng
          </p>
        </div>

        <SellerActionButton
          type="button"
          variant="secondary"
          size="sm"
          icon="refresh"
          loading={loading}
          onClick={loadData}
        >
          Làm Mới
        </SellerActionButton>
      </div>

      {/* In-Page Collapsible Discount Configuration Form (NO POPUP) */}
      {selectedBook && (
        <div className="p-5 rounded-2xl bg-white border-2 border-rose-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-rose-100 pb-3">
            <div className="flex items-center gap-2 text-rose-700">
              <span className="material-symbols-outlined text-lg">sell</span>
              <h3 className="font-bold text-sm text-slate-900">
                Thiết Lập Giảm Giá · {selectedBook.title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedBook(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Selected Book Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-14 rounded-md overflow-hidden bg-slate-200 border border-slate-200 shrink-0 flex items-center justify-center">
                {selectedBook.coverUrl ? (
                  <img src={selectedBook.coverUrl} alt={selectedBook.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-slate-400 text-sm">auto_stories</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-xs text-slate-900 truncate">{selectedBook.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Tác giả: {getAuthorName(selectedBook)}</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">Giá niêm yết: {formatVND(selectedBook.price)}</p>
              </div>
            </div>

            {/* Discount Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Hình thức giảm giá <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENTAGE')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    discountType === 'PERCENTAGE'
                      ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">percent</span>
                  Giảm theo phần trăm (%)
                </button>

                <button
                  type="button"
                  onClick={() => setDiscountType('FIXED_AMOUNT')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    discountType === 'FIXED_AMOUNT'
                      ? 'border-rose-500 bg-rose-50 text-rose-700 font-bold'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">attach_money</span>
                  Giảm theo giá tiền (VNĐ)
                </button>
              </div>
            </div>

            {/* Discount Value */}
            <div className="max-w-md">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {discountType === 'PERCENTAGE' ? 'Số Phần Trăm Giảm (%)' : 'Số Tiền Muốn Giảm (VNĐ)'}{' '}
                <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={discountType === 'PERCENTAGE' ? 'Ví dụ: 5, 10, 20...' : 'Ví dụ: 10000, 20000...'}
                  value={discountValue}
                  onChange={handleValueChange}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 font-semibold focus:outline-none focus:border-rose-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  {discountType === 'PERCENTAGE' ? '%' : 'đ'}
                </span>
              </div>
            </div>

            {/* Live Preview Box */}
            {discountValue && Number(discountValue) > 0 && (
              <div className="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 text-xs space-y-1 max-w-md">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mức giảm:</span>
                  <span className="font-bold text-rose-600">-{formatVND(preview.discountAmt)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-rose-200/60 pt-1">
                  <span className="text-slate-800">Giá bán sau khi giảm:</span>
                  <span className="text-slate-900 text-sm font-extrabold">{formatVND(preview.salePrice)}</span>
                </div>
              </div>
            )}

            {/* Start / End Datetime */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bắt đầu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kết thúc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {!validation.isValid && validation.message && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs max-w-xl">
                <span className="material-symbols-outlined text-sm shrink-0">warning</span>
                <span>{validation.message}</span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <SellerActionButton
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => setSelectedBook(null)}
              >
                Hủy
              </SellerActionButton>
              <SellerActionButton
                type="submit"
                variant="danger"
                size="sm"
                loading={submitting}
                disabled={!validation.isValid}
                icon="check_circle"
              >
                Áp Dụng Giảm Giá
              </SellerActionButton>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <SellerFilterTabs
          tabs={tabs}
          activeTab={filterTab}
          onChange={(key) => {
            setFilterTab(key as any);
            setCurrentPage(1);
          }}
        />

        <div className="relative min-w-[200px] sm:min-w-[260px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên sách..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Discounts Table */}
      <SellerTableContainer minWidth="min-w-[1280px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/80 whitespace-nowrap">
              <th className="py-3.5 px-4 w-28">Mã Sách</th>
              <th className="py-3.5 px-4">Tên Tác Phẩm & Bìa</th>
              <th className="py-3.5 px-4">Tác Giả</th>
              <th className="py-3.5 px-4 text-center">Giá Gốc</th>
              <th className="py-3.5 px-4 text-center">Chương Trình Giảm Giá</th>
              <th className="py-3.5 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-xl text-slate-400">progress_activity</span>
                    <span className="text-xs">Đang tải danh sách sách...</span>
                  </div>
                </td>
              </tr>
            ) : filteredBooks.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <span className="material-symbols-outlined text-4xl text-slate-300">sell</span>
                    <p className="font-medium text-slate-600">Không tìm thấy sách nào phù hợp.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedBooks.map((book) => {
                const discount = discountsMap[book.id];
                const hasDiscount = Boolean(discount);
                const basePrice = Number(book.price) || 0;
                const author = getAuthorName(book);

                return (
                  <tr key={book.id} className="hover:bg-slate-50/60 transition-colors whitespace-nowrap group">
                    {/* Mã Sách */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      #{book.id.slice(0, 8).toUpperCase()}
                    </td>

                    {/* Tên Sách & Bìa */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 rounded-md overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center shadow-2xs">
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-slate-400 text-base">auto_stories</span>
                          )}
                        </div>
                        <span className="font-bold text-slate-900 max-w-xs truncate block" title={book.title}>
                          {book.title}
                        </span>
                      </div>
                    </td>

                    {/* Tác giả */}
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {author}
                    </td>

                    {/* Giá gốc */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                      {formatVND(basePrice)}
                    </td>

                    {/* Chương trình giảm giá */}
                    <td className="py-3.5 px-4 text-center">
                      {hasDiscount ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                            {discount.type === 'PERCENTAGE'
                              ? `Giảm ${discount.value}%`
                              : `Giảm ${formatVND(discount.value)}`}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Hạn: {new Date(discount.expiresAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      ) : (
                        <SellerStatusBadge variant="neutral" text="Chưa áp dụng" />
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {hasDiscount ? (
                          <>
                            <SellerActionButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              icon="edit"
                              onClick={() => handleOpenForm(book)}
                            >
                              Sửa
                            </SellerActionButton>

                            <SellerActionButton
                              type="button"
                              variant="danger"
                              size="sm"
                              icon="delete"
                              loading={cancellingId === discount.id}
                              onClick={() => handleCancelDiscount(book.id)}
                            >
                              Hủy
                            </SellerActionButton>
                          </>
                        ) : (
                          <SellerActionButton
                            type="button"
                            variant="primary"
                            size="sm"
                            icon="add_circle"
                            onClick={() => handleOpenForm(book)}
                          >
                            Thiết Lập
                          </SellerActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </SellerTableContainer>

      {/* Pagination */}
      {!loading && filteredBooks.length > 0 && (
        <SellerPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

export default SellerDiscountsView;
