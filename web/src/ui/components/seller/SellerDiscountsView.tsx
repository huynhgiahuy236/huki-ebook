'use client';

/**
 * HUKI EBOOK - Seller Custom Book Discounts View (Giảm Giá Tự Do)
 * Quản lý chương trình giảm giá trực tiếp theo sách của Seller
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { catalogApi } from '@/ui/api/catalogApi';
import { discountApi, BookDiscount, DiscountType } from '@/ui/api/discountApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';

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

  // Modal State
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [startsAt, setStartsAt] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Helper to format VND
  const formatVND = (amount?: number | string | null) => {
    const num = Number(amount) || 0;
    return num.toLocaleString('vi-VN') + 'đ';
  };

  // Truncate helper (> 10 chars -> ...)
  const truncateText = (text: string, maxLen: number = 10) => {
    if (!text) return '—';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen) + '...';
  };

  // Get author name helper
  const getAuthorName = (book: BookItem): string => {
    if (!book.author) return 'HUKI Official';
    if (typeof book.author === 'string') return book.author;
    return book.author.name || 'HUKI Official';
  };

  // Format datetime for datetime-local input
  const toLocalDatetimeString = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  // Load books & discounts
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const bizId = user?.business?.id || activeBusinessId;
      const booksRes = await catalogApi.getPublicBooks({
        limit: 100,
        ...(bizId ? { business: bizId } : {}),
      });

      if (booksRes.success && Array.isArray(booksRes.data)) {
        // Only keep PUBLISHED books belonging to current seller
        const publishedBooks = booksRes.data.filter((b: any) => {
          const belongsToBiz = bizId ? (b.business?.id || b.businessId) === bizId : true;
          return (b.status === 'PUBLISHED' || !b.status) && belongsToBiz;
        });

        setBooks(publishedBooks);

        // Fetch discounts in batch
        const bookIds = publishedBooks.map((b: any) => b.id);
        if (bookIds.length > 0) {
          try {
            const discRes = await discountApi.getDiscountsForBooks(bookIds);
            if (discRes.success && Array.isArray(discRes.data)) {
              const map: Record<string, BookDiscount> = {};
              for (const d of discRes.data) {
                map[d.bookId] = d;
              }
              setDiscountsMap(map);
            }
          } catch (e) {
            console.error('Failed to load discounts batch:', e);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load seller books for discounts:', err);
      showToast({ title: 'Lỗi', message: 'Không thể tải danh sách sách' }, 'error');
    } finally {
      setLoading(false);
    }
  }, [user, activeBusinessId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open discount modal for a book
  const handleOpenModal = (book: BookItem) => {
    setSelectedBook(book);
    const existing = discountsMap[book.id];

    if (existing) {
      setDiscountType(existing.type);
      setDiscountValue(String(existing.value));
      setStartsAt(toLocalDatetimeString(new Date(existing.startsAt)));
      setExpiresAt(toLocalDatetimeString(new Date(existing.expiresAt)));
    } else {
      // Default initial dates: starts now, expires in 7 days
      const now = new Date();
      const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      setDiscountType('PERCENTAGE');
      setDiscountValue('');
      setStartsAt(toLocalDatetimeString(now));
      setExpiresAt(toLocalDatetimeString(in7Days));
    }
  };

  const handleCloseModal = () => {
    setSelectedBook(null);
    setDiscountValue('');
    setStartsAt('');
    setExpiresAt('');
  };

  // Cancel discount
  const handleCancelDiscount = async (bookId: string) => {
    const existing = discountsMap[bookId];
    if (!existing) return;

    setCancellingId(existing.id);
    try {
      const res = await discountApi.cancelDiscount(existing.id);
      if (res.success) {
        showToast({ title: 'Thành công', message: 'Đã hủy giảm giá cho cuốn sách' }, 'success');
        await loadData();
      } else {
        showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể hủy giảm giá' }, 'error');
      }
    } catch (e) {
      showToast({ title: 'Lỗi', message: 'Không thể kết nối máy chủ' }, 'error');
    } finally {
      setCancellingId(null);
    }
  };

  // Numerical change handler (Blocks non-numeric characters)
  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setDiscountValue(val);
  };

  // Realtime Validation Logic
  const validation = useMemo(() => {
    if (!selectedBook) return { isValid: false, message: '' };

    // 1. Check empty
    if (!discountValue || discountValue.trim() === '') {
      return { isValid: false, message: 'Vui lòng nhập giá trị giảm giá' };
    }
    if (!startsAt) {
      return { isValid: false, message: 'Vui lòng chọn ngày và giờ bắt đầu' };
    }
    if (!expiresAt) {
      return { isValid: false, message: 'Vui lòng chọn ngày và giờ kết thúc' };
    }

    const numValue = Number(discountValue);
    if (isNaN(numValue) || numValue <= 0) {
      return { isValid: false, message: 'Giá trị giảm giá phải lớn hơn 0' };
    }

    const basePrice = Number(selectedBook.price) || 0;

    // 2. Validate percentage or fixed amount
    if (discountType === 'PERCENTAGE') {
      if (numValue > 100) {
        return { isValid: false, message: 'Phần trăm giảm giá không được vượt quá 100%' };
      }
    } else {
      if (numValue > basePrice) {
        return {
          isValid: false,
          message: `Số tiền giảm không được vượt quá giá gốc (${formatVND(basePrice)})`,
        };
      }
    }

    // 3. Validate start & end time
    const startDate = new Date(startsAt);
    const endDate = new Date(expiresAt);
    const now = new Date(Date.now() - 2 * 60 * 1000); // 2 min grace

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { isValid: false, message: 'Định dạng ngày giờ không hợp lệ' };
    }

    if (startDate < now) {
      return { isValid: false, message: 'Ngày và giờ bắt đầu không được ở trong quá khứ' };
    }

    if (startDate.getTime() === endDate.getTime()) {
      return { isValid: false, message: 'Ngày bắt đầu và ngày kết thúc không được trùng nhau' };
    }

    if (endDate <= startDate) {
      return { isValid: false, message: 'Ngày kết thúc phải diễn ra sau ngày bắt đầu' };
    }

    return { isValid: true, message: '' };
  }, [selectedBook, discountType, discountValue, startsAt, expiresAt]);

  // Preview Price Calculations
  const preview = useMemo(() => {
    if (!selectedBook) return { discountAmt: 0, salePrice: 0 };
    const basePrice = Number(selectedBook.price) || 0;
    const numValue = Number(discountValue) || 0;

    let discountAmt = 0;
    if (discountType === 'PERCENTAGE') {
      discountAmt = Math.round(basePrice * (numValue / 100));
    } else {
      discountAmt = Math.min(basePrice, numValue);
    }
    const salePrice = Math.max(0, basePrice - discountAmt);
    return { discountAmt, salePrice };
  }, [selectedBook, discountType, discountValue]);

  // Submit Discount
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid || !selectedBook) return;

    setSubmitting(true);
    try {
      const res = await discountApi.createOrUpdateDiscount({
        bookId: selectedBook.id,
        type: discountType,
        value: Number(discountValue),
        startsAt: new Date(startsAt).toISOString(),
        expiresAt: new Date(expiresAt).toISOString(),
      });

      if (res.success) {
        showToast(
          {
            title: 'Thành công',
            message: `Đã áp dụng giảm giá cho "${truncateText(selectedBook.title, 20)}"`,
          },
          'success'
        );
        handleCloseModal();
        await loadData();
      } else {
        showToast(
          { title: 'Lỗi', message: res.error?.message || 'Không thể thiết lập giảm giá' },
          'error'
        );
      }
    } catch (err: any) {
      showToast({ title: 'Lỗi kết nối', message: err?.message || 'Không thể kết nối máy chủ' }, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter books
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      const discount = discountsMap[b.id];
      const isDiscounted = Boolean(discount && discount.status === 'ACTIVE');

      if (filterTab === 'DISCOUNTED' && !isDiscounted) return false;
      if (filterTab === 'NOT_DISCOUNTED' && isDiscounted) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = b.title.toLowerCase().includes(q);
        const idMatch = b.id.toLowerCase().includes(q);
        const authorMatch = getAuthorName(b).toLowerCase().includes(q);
        return titleMatch || idMatch || authorMatch;
      }
      return true;
    });
  }, [books, discountsMap, filterTab, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = books.length;
    let discounted = 0;
    for (const b of books) {
      if (discountsMap[b.id] && discountsMap[b.id].status === 'ACTIVE') {
        discounted++;
      }
    }
    return {
      total,
      discounted,
      notDiscounted: total - discounted,
    };
  }, [books, discountsMap]);

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-theme-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-theme-primary">sell</span>
            <h1 className="text-xl font-bold text-on-surface tracking-tight">
              Quản Lý Giảm Giá Sách (Giảm giá tự do)
            </h1>
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Thiết lập chương trình giảm giá theo % hoặc giá tiền cụ thể cho các đầu sách đã xuất bản của cửa hàng.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-theme-border hover:bg-theme-secondary-subtle text-xs font-semibold text-on-surface transition-all cursor-pointer self-start sm:self-auto"
        >
          <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>
            sync
          </span>
          Làm mới
        </button>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-theme-surface border border-theme-border flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
            <span className="material-symbols-outlined text-xl">menu_book</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Sách Đã Xuất Bản
            </p>
            <p className="text-xl font-bold text-on-surface">{stats.total}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-theme-surface border border-theme-border flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
            <span className="material-symbols-outlined text-xl">local_offer</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Đang Áp Dụng Giảm Giá
            </p>
            <p className="text-xl font-bold text-rose-600">{stats.discounted}</p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-theme-surface border border-theme-border flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-600 shrink-0">
            <span className="material-symbols-outlined text-xl">sell</span>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              Bán Đúng Giá Gốc
            </p>
            <p className="text-xl font-bold text-on-surface">{stats.notDiscounted}</p>
          </div>
        </div>
      </div>

      {/* 3. Search & Tabs Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-theme-secondary-subtle rounded-xl border border-theme-border/60 self-start">
          <button
            type="button"
            onClick={() => setFilterTab('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'ALL'
                ? 'bg-theme-surface text-theme-primary shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Tất cả ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('DISCOUNTED')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'DISCOUNTED'
                ? 'bg-theme-surface text-rose-600 shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Đang giảm giá ({stats.discounted})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('NOT_DISCOUNTED')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filterTab === 'NOT_DISCOUNTED'
                ? 'bg-theme-surface text-theme-primary shadow-xs font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Chưa giảm giá ({stats.notDiscounted})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            search
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên sách, tác giả, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-theme-surface border border-theme-border focus:outline-hidden focus:ring-2 focus:ring-theme-primary/30 text-on-surface"
          />
        </div>
      </div>

      {/* 4. Book Discounts Table */}
      <div className="bg-theme-surface rounded-2xl border border-theme-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-theme-secondary-subtle border-b border-theme-border text-on-surface-variant font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-44">ID Sách</th>
                <th className="py-3 px-4 min-w-[200px]">Tên Sách</th>
                <th className="py-3 px-4 min-w-[150px]">Tác Giả</th>
                <th className="py-3 px-4 min-w-[220px]">Giảm Giá & Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-theme-border/60">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-on-surface-variant">
                    <div className="inline-flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg animate-spin text-theme-primary">
                        progress_activity
                      </span>
                      <span>Đang tải danh sách sách...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBooks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-on-surface-variant">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-gray-300">
                        menu_book
                      </span>
                      <p className="font-semibold text-xs text-on-surface">Không tìm thấy sách nào</p>
                      <p className="text-[11px] text-gray-400">
                        {searchQuery ? 'Thử thay đổi từ khóa tìm kiếm' : 'Chưa có sách nào đã xuất bản'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBooks.map((book) => {
                  const discount = discountsMap[book.id];
                  const hasDiscount = Boolean(discount && discount.status === 'ACTIVE');
                  const author = getAuthorName(book);
                  const basePrice = Number(book.price) || 0;

                  return (
                    <tr key={book.id} className="hover:bg-theme-secondary-subtle/40 transition-colors">
                      {/* Cột 1: ID Sách */}
                      <td className="py-3 px-4 font-mono text-[11px] text-on-surface-variant align-middle">
                        <div className="flex items-center gap-1.5 group/id relative">
                          <span title={book.id} className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded font-bold">
                            {book.id.slice(0, 8)}...
                          </span>
                          <button
                            type="button"
                            title="Sao chép ID đầy đủ"
                            onClick={() => {
                              navigator.clipboard.writeText(book.id);
                              showToast({ title: 'Đã sao chép', message: book.id }, 'info');
                            }}
                            className="opacity-0 group-hover/id:opacity-100 hover:text-theme-primary transition-opacity cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-xs">content_copy</span>
                          </button>
                        </div>
                      </td>

                      {/* Cột 2: Tên Sách (Avatar + Tên cắt > 10 ký tự kèm Hover Tooltip bên dưới) */}
                      <td className="py-3 px-4 align-middle">
                        <div className="flex items-center gap-3">
                          {/* Book Avatar */}
                          <div className="w-10 h-14 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 border border-theme-border/60 shrink-0 relative shadow-xs flex items-center justify-center">
                            {book.coverUrl ? (
                              <img
                                src={book.coverUrl}
                                alt={book.title}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-gray-400 text-lg">
                                auto_stories
                              </span>
                            )}
                          </div>

                          {/* Truncated Title with Floating Hover Tooltip below */}
                          <div className="relative group/tooltip min-w-0">
                            <span className="font-semibold text-on-surface cursor-pointer inline-block">
                              {truncateText(book.title, 10)}
                            </span>

                            {/* Floating Tooltip below when hovered */}
                            <div className="absolute left-0 top-full mt-1.5 z-30 hidden group-hover/tooltip:block pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap max-w-xs break-words">
                                <p className="font-bold text-[11px] text-gray-300">Tên tác phẩm:</p>
                                <p>{book.title}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: Tác Giả (Cắt > 10 ký tự kèm Hover Tooltip bên dưới) */}
                      <td className="py-3 px-4 align-middle">
                        <div className="relative group/author min-w-0 inline-block">
                          <span className="text-on-surface-variant font-medium cursor-pointer">
                            {truncateText(author, 10)}
                          </span>

                          {/* Floating Tooltip below when hovered */}
                          <div className="absolute left-0 top-full mt-1.5 z-30 hidden group-hover/author:block pointer-events-none">
                            <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap max-w-xs break-words">
                              <p className="font-bold text-[11px] text-gray-300">Tác giả / Dịch giả:</p>
                              <p>{author}</p>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cột 4: Giảm Giá & Nút Thiết Lập */}
                      <td className="py-3 px-4 align-middle">
                        {hasDiscount ? (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 font-extrabold text-[11px] border border-rose-500/20">
                                  {discount.type === 'PERCENTAGE'
                                    ? `GIẢM ${discount.value}%`
                                    : `GIẢM ${formatVND(discount.value)}`}
                                </span>
                                <span className="line-through text-gray-400 text-[11px]">
                                  {formatVND(basePrice)}
                                </span>
                              </div>
                              <p className="text-[10px] text-on-surface-variant mt-0.5">
                                Hạn:{' '}
                                {new Date(discount.expiresAt).toLocaleDateString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                })}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenModal(book)}
                                className="px-2.5 py-1 rounded-lg bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-white text-xs font-bold transition-colors cursor-pointer"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                disabled={cancellingId === discount.id}
                                onClick={() => handleCancelDiscount(book.id)}
                                title="Hủy giảm giá"
                                className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {cancellingId === discount.id ? 'progress_activity' : 'delete'}
                                </span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-on-surface-variant font-medium text-xs">
                              {formatVND(basePrice)}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleOpenModal(book)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-theme-primary text-white hover:bg-theme-primary/90 text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-xs">add_circle</span>
                              Thiết lập
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Modal / Popup Thiết Lập Giảm Giá */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-theme-surface rounded-2xl border border-theme-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-theme-border bg-theme-secondary-subtle/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-theme-primary/10 flex items-center justify-center text-theme-primary">
                  <span className="material-symbols-outlined text-lg">sell</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Thiết Lập Giảm Giá Sách</h3>
                  <p className="text-[11px] text-on-surface-variant">
                    Tùy chỉnh mức giảm và thời hạn áp dụng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={submitting}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-theme-secondary-subtle cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              {/* Selected Book Info Card */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-theme-secondary-subtle/60 border border-theme-border/60">
                <div className="w-11 h-15 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 border border-theme-border shrink-0 relative flex items-center justify-center">
                  {selectedBook.coverUrl ? (
                    <img
                      src={selectedBook.coverUrl}
                      alt={selectedBook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-gray-400 text-sm">auto_stories</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs text-on-surface truncate">{selectedBook.title}</p>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Tác giả: {getAuthorName(selectedBook)}
                  </p>
                  <p className="text-xs font-bold text-theme-primary mt-1">
                    Giá gốc: {formatVND(selectedBook.price)}
                  </p>
                </div>
              </div>

              {/* Lựa chọn 1 & 2: Hình thức giảm giá */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-2">
                  Hình Thức Giảm Giá <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType('PERCENTAGE')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      discountType === 'PERCENTAGE'
                        ? 'border-theme-primary bg-theme-primary/10 text-theme-primary shadow-xs'
                        : 'border-theme-border text-on-surface-variant hover:bg-theme-secondary-subtle'
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
                        ? 'border-theme-primary bg-theme-primary/10 text-theme-primary shadow-xs'
                        : 'border-theme-border text-on-surface-variant hover:bg-theme-secondary-subtle'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">attach_money</span>
                    Giảm theo giá tiền (VNĐ)
                  </button>
                </div>
              </div>

              {/* Input Giá Trị Giảm (Chặn ký tự chữ) */}
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
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
                    className="w-full px-3 py-2 text-xs rounded-xl bg-theme-surface border border-theme-border focus:outline-hidden focus:ring-2 focus:ring-theme-primary/30 text-on-surface font-semibold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                    {discountType === 'PERCENTAGE' ? '%' : 'đ'}
                  </span>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">
                  {discountType === 'PERCENTAGE'
                    ? 'Chỉ nhập số từ 1 đến 100.'
                    : `Chỉ nhập số tiền không vượt quá giá gốc (${formatVND(selectedBook.price)}).`}
                </p>
              </div>

              {/* Live Preview Box */}
              {discountValue && Number(discountValue) > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20 text-xs space-y-1 animate-in fade-in">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Số tiền được giảm:</span>
                    <span className="font-bold text-rose-600">-{formatVND(preview.discountAmt)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t border-rose-500/10 pt-1">
                    <span className="text-on-surface">Giá bán sau khi giảm:</span>
                    <span className="text-theme-primary text-sm font-extrabold">{formatVND(preview.salePrice)}</span>
                  </div>
                </div>
              )}

              {/* Lựa chọn Ngày & Giờ Bắt Đầu - Kết Thúc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Ngày & Giờ Bắt Đầu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-theme-surface border border-theme-border focus:outline-hidden focus:ring-2 focus:ring-theme-primary/30 text-on-surface"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface mb-1">
                    Ngày & Giờ Kết Thúc <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-theme-surface border border-theme-border focus:outline-hidden focus:ring-2 focus:ring-theme-primary/30 text-on-surface"
                  />
                </div>
              </div>

              {/* Validation Warning Alert */}
              {!validation.isValid && validation.message && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
                  <span className="material-symbols-outlined text-sm shrink-0">warning</span>
                  <span>{validation.message}</span>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-theme-border">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl border border-theme-border text-xs font-semibold text-on-surface hover:bg-theme-secondary-subtle transition-colors cursor-pointer"
                >
                  Hủy
                </button>

                {/* Apply Button: Disabled until form is 100% valid */}
                <button
                  type="submit"
                  disabled={!validation.isValid || submitting}
                  className={`inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    validation.isValid && !submitting
                      ? 'bg-theme-primary text-white hover:bg-theme-primary/90 cursor-pointer shadow-theme-primary/20'
                      : 'bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed pointer-events-none opacity-60'
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Áp dụng
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default SellerDiscountsView;
