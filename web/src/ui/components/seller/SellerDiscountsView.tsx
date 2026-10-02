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

  const [expandedDiscountIds, setExpandedDiscountIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedDiscountIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const tabs = [
    { key: 'ALL', label: 'Tất cả', count: books.length },
    { key: 'DISCOUNTED', label: 'Đang giảm giá', count: Object.keys(discountsMap).length },
    { key: 'NOT_DISCOUNTED', label: 'Chưa giảm giá', count: Math.max(0, books.length - Object.keys(discountsMap).length) },
  ];

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto font-sans animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Giảm Giá Sách Tự Do</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chủ động cài đặt mức giảm giá theo % hoặc tiền mặt cho từng ấn phẩm của gian hàng
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto active:scale-[0.98]"
        >
          <span className={`material-symbols-outlined text-[16px] text-slate-500 ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
            refresh
          </span>
          <span>Làm mới dữ liệu</span>
        </button>
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
      <SellerTableContainer>
        {loading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined animate-spin text-xl text-[#00875A]">progress_activity</span>
              <span className="text-xs">Đang tải danh sách sách...</span>
            </div>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
              <span className="material-symbols-outlined text-4xl text-slate-300">sell</span>
              <p className="font-medium text-slate-600">Không tìm thấy sách nào phù hợp.</p>
            </div>
          </div>
        ) : (
          <div className="w-full overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3.5 pl-4 pr-2 w-[34%]">Sách &amp; Tác Giả</th>
                  <th className="py-3.5 px-3 w-[22%]">Giá Bán &amp; Giảm Giá</th>
                  <th className="py-3.5 px-3 w-[18%]">Thời Hạn Áp Dụng</th>
                  <th className="py-3.5 px-3 w-[14%] text-center">Trạng Thái</th>
                  <th className="py-3.5 pl-2 pr-4 w-[12%] text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBooks.map((book) => {
                  const isExpanded = !!expandedDiscountIds[book.id];
                  const discount = discountsMap[book.id];
                  const hasDiscount = Boolean(discount);
                  const basePrice = Number(book.price) || 0;
                  const author = getAuthorName(book);
                  const discountedPrice = hasDiscount
                    ? discount.type === 'PERCENTAGE'
                      ? Math.max(0, basePrice * (1 - discount.value / 100))
                      : Math.max(0, basePrice - discount.value)
                    : basePrice;

                  return (
                    <React.Fragment key={book.id}>
                      <tr
                        onClick={() => toggleExpand(book.id)}
                        className={`hover:bg-emerald-50/30 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-emerald-50/40' : 'bg-white'
                        }`}
                      >
                        {/* 1. Sách & Tác Giả */}
                        <td className="py-3 pl-4 pr-2 align-middle">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(book.id);
                              }}
                              className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/50 transition-colors shrink-0"
                            >
                              <span
                                className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${
                                  isExpanded ? 'rotate-90 text-emerald-700' : ''
                                }`}
                              >
                                chevron_right
                              </span>
                            </button>
                            <div className="w-8 h-11 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                              {book.coverUrl ? (
                                <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-slate-400 text-sm flex items-center justify-center h-full">auto_stories</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 block truncate" title={book.title}>
                                {book.title}
                              </span>
                              <span className="text-[10.5px] text-slate-400 block truncate font-mono">
                                #{book.id.slice(0, 8).toUpperCase()} • {author}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. Giá Bán & Mức Giảm */}
                        <td className="py-3 px-3 align-middle">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="font-bold text-slate-900">{formatVND(discountedPrice)}</span>
                              {hasDiscount && (
                                <span className="line-through text-slate-400 text-[11px] font-mono">
                                  {formatVND(basePrice)}
                                </span>
                              )}
                            </div>
                            {hasDiscount ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 w-fit">
                                {discount.type === 'PERCENTAGE' ? `-${discount.value}%` : `-${formatVND(discount.value)}`}
                              </span>
                            ) : (
                              <span className="text-[10.5px] text-slate-400">Giá niêm yết</span>
                            )}
                          </div>
                        </td>

                        {/* 3. Thời Hạn */}
                        <td className="py-3 px-3 align-middle text-slate-600 text-xs">
                          {hasDiscount ? (
                            <div className="flex flex-col text-[11px]">
                              <span>Đến: <b>{new Date(discount.expiresAt).toLocaleDateString('vi-VN')}</b></span>
                              <span className="text-slate-400 text-[10px]">Từ: {new Date(discount.startsAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">—</span>
                          )}
                        </td>

                        {/* 4. Trạng Thái */}
                        <td className="py-3 px-3 align-middle text-center whitespace-nowrap">
                          {hasDiscount ? (
                            <SellerStatusBadge variant="success" dot text="Đang giảm giá" />
                          ) : (
                            <SellerStatusBadge variant="neutral" text="Chưa áp dụng" />
                          )}
                        </td>

                        {/* 5. Thao Tác */}
                        <td className="py-3 pl-2 pr-4 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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

                      {/* Expandable Subcards Detail Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={5} className="p-4 border-t border-b border-emerald-100/70">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-xl p-4 border border-emerald-200/70 shadow-xs animate-in fade-in slide-in-from-top-1 duration-200">
                              {/* Card 1: Thông tin giá & Mức chiết khấu */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                  <span className="material-symbols-outlined text-[16px] text-[#00875A]">price_change</span>
                                  <span>Giá Bán &amp; Mức Giảm</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Giá gốc niêm yết:</span>
                                    <span className="font-bold text-slate-800">{formatVND(basePrice)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Giá sau giảm:</span>
                                    <span className="font-bold text-[#00875A]">{formatVND(discountedPrice)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Tiết kiệm cho khách:</span>
                                    <span className="font-bold text-rose-600">
                                      {hasDiscount ? formatVND(basePrice - discountedPrice) : '0đ'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card 2: Thời hạn chương trình */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                  <span className="material-symbols-outlined text-[16px] text-amber-600">date_range</span>
                                  <span>Thời Gian Khuyến Mãi</span>
                                </div>
                                <div className="space-y-1.5 text-xs">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Bắt đầu từ:</span>
                                    <span className="font-semibold text-slate-800">
                                      {hasDiscount ? new Date(discount.startsAt).toLocaleString('vi-VN') : 'Chưa thiết lập'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Hết hạn vào:</span>
                                    <span className="font-semibold text-slate-800">
                                      {hasDiscount ? new Date(discount.expiresAt).toLocaleString('vi-VN') : 'Chưa thiết lập'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Hình thức giảm:</span>
                                    <span className="font-medium text-slate-700">
                                      {hasDiscount ? (discount.type === 'PERCENTAGE' ? 'Theo tỷ lệ %' : 'Trừ tiền mặt trực tiếp') : '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Card 3: Thao tác nhanh */}
                              <div className="space-y-2 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#003B2B] pb-1.5 border-b border-slate-100">
                                    <span className="material-symbols-outlined text-[16px] text-emerald-600">sell</span>
                                    <span>Hành Động Khuyến Mãi</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-2">
                                    {hasDiscount
                                      ? 'Ấn phẩm đang được giảm giá. Bạn có thể điều chỉnh mức giảm hoặc hủy ngay.'
                                      : 'Cài đặt giảm giá tức thì để tăng tỷ lệ chốt đơn cho ấn phẩm này.'}
                                  </p>
                                </div>
                                <div className="pt-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenForm(book);
                                    }}
                                    className="w-full py-2 px-3 bg-[#00875A] hover:bg-[#003B2B] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">edit_note</span>
                                    <span>{hasDiscount ? 'Chỉnh Sửa Giảm Giá' : 'Thiết Lập Giảm Giá Ngay'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
