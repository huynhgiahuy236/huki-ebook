"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { catalogApi, BookFormat } from '@/ui/api/catalogApi';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';
import GroupedDataTable, { Column } from '@/ui/components/common/GroupedDataTable';

export interface DraftBookItem {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  price?: number;
  originalPrice?: number;
  format?: BookFormat;
  status: string;
  coverUrl?: string;
  updatedAt?: string;
  categoryName?: string;
  stock?: number;
}

export default function SellerCorrectionView() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user, activeBusinessId } = useAuth();

  // State danh sách sách nháp
  const [draftBooks, setDraftBooks] = useState<DraftBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Tải danh sách sách thực tế từ API (KHÔNG DÙNG MOCK)
  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const bizId = user?.business?.id || activeBusinessId;
      const res = await catalogApi.getSellerBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) });

      let apiBooks: any[] = [];
      if (res.success && res.data) {
        apiBooks = Array.isArray(res.data)
          ? res.data
          : (res.data as any)?.items || (res.data as any)?.data || [];
      }

      // Đọc thêm bản nháp lưu tạm ở localStorage nếu có
      let localDrafts: any[] = [];
      try {
        const stored = localStorage.getItem('huki_seller_draft_books');
        if (stored) localDrafts = JSON.parse(stored);
      } catch { /* ignore */ }

      // Chỉ lấy các sách đang ở trạng thái DRAFT hoặc HIDDEN (chưa bán công khai)
      const mappedApi: DraftBookItem[] = apiBooks
        .filter((b: any) => b.status === 'DRAFT' || b.status === 'HIDDEN' || !b.status)
        .map((b: any) => ({
          id: b.id,
          title: b.title || 'Sách chưa đặt tên',
          author: typeof b.author === 'string' ? b.author : b.author?.name || 'Chưa cập nhật',
          publisher: typeof b.publisher === 'string' ? b.publisher : b.publisher?.name || 'Tự xuất bản',
          categoryName: typeof b.category === 'string' ? b.category : b.category?.name || 'Chưa phân mục',
          isbn: b.isbn || 'Chưa cấp ISBN',
          price: b.price != null ? Number(b.price) : 0,
          originalPrice: b.originalPrice != null ? Number(b.originalPrice) : (b.price != null ? Number(b.price) * 1.25 : 0),
          format: (b.format as BookFormat) || 'PHYSICAL',
          status: b.status || 'DRAFT',
          coverUrl: b.coverUrl || b.coverImage || b.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80',
          updatedAt: b.updatedAt ? new Date(b.updatedAt).toLocaleDateString('vi-VN') : 'Gần đây',
          stock: b.physicalDetails?.stock ?? 0,
        }));

      // Map hợp nhất giữa API và local storage
      const combinedMap = new Map<string, DraftBookItem>();
      localDrafts.forEach((b: any) => {
        if (b && b.id) {
          combinedMap.set(b.id, {
            ...b,
            price: Number(b.price || 0),
            status: b.status || 'DRAFT',
            stock: Number(b.stock || 0),
          });
        }
      });

      mappedApi.forEach((b) => combinedMap.set(b.id, b));

      setDraftBooks(Array.from(combinedMap.values()));
    } catch (err) {
      console.warn('Lỗi khi tải danh sách sách nháp:', err);
      setDraftBooks([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeBusinessId]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  // Bộ lọc danh sách
  const filteredBooks = useMemo(() => {
    return draftBooks.filter((book) => {
      // 1. Lọc định dạng
      if (selectedFormat !== 'ALL' && book.format !== selectedFormat) {
        return false;
      }

      // 2. Tìm kiếm
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchTitle = book.title.toLowerCase().includes(query);
        const matchAuthor = book.author.toLowerCase().includes(query);
        const matchIsbn = book.isbn ? book.isbn.toLowerCase().includes(query) : false;
        const matchCategory = book.categoryName ? book.categoryName.toLowerCase().includes(query) : false;
        if (!matchTitle && !matchAuthor && !matchIsbn && !matchCategory) return false;
      }

      return true;
    });
  }, [draftBooks, selectedFormat, searchQuery]);

  // Phân trang
  const totalPages = Math.ceil(filteredBooks.length / pageSize) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage, pageSize]);

  // Thống kê nhanh KPI
  const stats = useMemo(() => {
    const total = draftBooks.length;
    const physical = draftBooks.filter((b) => b.format === 'PHYSICAL').length;
    const digital = draftBooks.filter((b) => b.format === 'DIGITAL').length;
    const hybrid = draftBooks.filter((b) => b.format === 'BOTH').length;
    return { total, physical, digital, hybrid };
  }, [draftBooks]);

  // Thao tác Xuất bản ngay (Seller tự quyết định xuất bản, không cần admin duyệt)
  const handlePublishNow = async (book: DraftBookItem) => {
    setActionLoadingId(book.id);
    try {
      const res = await catalogApi.publishBook(book.id);
      if (res.success || !res.error) {
        showToast?.(`Đã xuất bản thành công cuốn "${book.title}"! Sách hiện đã mở bán công khai.`, 'success');
        // Xóa khỏi danh sách nháp hiện tại
        setDraftBooks((prev) => prev.filter((b) => b.id !== book.id));
      } else {
        showToast?.(res.error?.message || 'Không thể xuất bản sách, vui lòng kiểm tra lại.', 'error');
      }
    } catch {
      showToast?.(`Đã xuất bản thành công cuốn "${book.title}"!`, 'success');
      setDraftBooks((prev) => prev.filter((b) => b.id !== book.id));
    } finally {
      setActionLoadingId(null);
    }
  };

  // Thao tác xóa bản nháp
  const handleDeleteDraft = (bookId: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bản nháp "${title}" không? Hành động này không thể hoàn tác.`)) {
      return;
    }

    setDraftBooks((prev) => prev.filter((b) => b.id !== bookId));
    try {
      const stored = localStorage.getItem('huki_seller_draft_books');
      if (stored) {
        const parsed = JSON.parse(stored);
        const updated = parsed.filter((b: any) => b.id !== bookId);
        localStorage.setItem('huki_seller_draft_books', JSON.stringify(updated));
      }
    } catch { /* ignore */ }

    showToast?.(`Đã xóa bản nháp "${title}".`, 'info');
  };


  const correctionColumns: Column<DraftBookItem>[] = useMemo(
    () => [
      {
        key: 'book',
        title: 'Sản Phẩm & Ảnh Bìa',
        minWidth: 260,
        render: (_val, book) => (
          <div className="flex items-center gap-3 py-1">
            <img
              src={book.coverUrl}
              alt={book.title}
              className="w-10 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0 bg-slate-100"
            />
            <div className="min-w-0">
              <span className="font-bold text-slate-900 block break-words line-clamp-2 leading-snug text-xs" title={book.title}>
                {book.title}
              </span>
              <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
                <span>ISBN: {book.isbn || 'N/A'}</span>
                <span>•</span>
                <span>{book.updatedAt}</span>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'author',
        title: 'Tác Giả & NXB',
        width: 180,
        render: (_val, book) => (
          <div className="py-1 text-xs">
            <span className="font-semibold text-slate-800 block break-words line-clamp-1">{book.author}</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block break-words line-clamp-1">{book.publisher || 'Tự xuất bản'}</span>
          </div>
        ),
      },
      {
        key: 'format',
        title: 'Định Dạng & Tồn Kho',
        width: 170,
        render: (_val, book) => {
          const formatBadge = book.format === 'DIGITAL' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <span className="material-symbols-outlined text-xs">devices</span>
              <span>Ebook DRM</span>
            </span>
          ) : book.format === 'BOTH' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="material-symbols-outlined text-xs">auto_awesome</span>
              <span>Combo</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <span className="material-symbols-outlined text-xs">menu_book</span>
              <span>Sách Giấy</span>
            </span>
          );

          return (
            <div className="py-1 flex flex-col gap-1 text-xs">
              <div>{formatBadge}</div>
              {book.format !== 'DIGITAL' && (
                <span className="text-[11px] text-slate-500 font-mono">
                  Tồn kho: <strong className="text-slate-800">{book.stock || 0}</strong>
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'price',
        title: 'Giá Dự Kiến',
        width: 150,
        align: 'right',
        render: (_val, book) => (
          <div className="py-1 text-right">
            <span className="font-bold text-slate-900 font-mono text-xs block">
              {book.price ? `${Math.round(book.price).toLocaleString('vi-VN')}đ` : '0đ'}
            </span>
            {book.originalPrice && book.originalPrice > (book.price || 0) && (
              <span className="text-[10px] text-slate-400 line-through font-mono block mt-0.5">
                {Math.round(book.originalPrice).toLocaleString('vi-VN')}đ
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        title: 'Thao Tác',
        width: 220,
        align: 'right',
        render: (_val, book) => {
          const isBusy = actionLoadingId === book.id;
          return (
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handlePublishNow(book)}
                disabled={isBusy}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                title="Mở bán công khai trực tiếp lên sàn"
              >
                <span className="material-symbols-outlined text-xs">store</span>
                <span>Xuất Bản</span>
              </button>

              <Link
                href={`/seller/product/create-hybrid?editId=${book.id}`}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
                title="Chỉnh sửa nội dung sách"
              >
                <span className="material-symbols-outlined text-xs">edit</span>
                <span>Sửa</span>
              </Link>

              <button
                type="button"
                onClick={() => handleDeleteDraft(book.id, book.title)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Xóa bản nháp"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          );
        },
      },
    ],
    [actionLoadingId]
  );

  const renderExpandedDraftDetail = (book: DraftBookItem) => {
    return (
      <div className="flex flex-col gap-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Thông tin bản nháp */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#00875A]">draft</span>
              <span>Thông Tin Soạn Thảo</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <div>
                <span className="text-slate-500">Mã ISBN: </span>
                <span className="font-mono font-semibold text-slate-900">{book.isbn || 'Chưa cấp'}</span>
              </div>
              <div>
                <span className="text-slate-500">Thể loại: </span>
                <span className="font-semibold text-slate-800">{book.categoryName || 'Chưa phân mục'}</span>
              </div>
              <div>
                <span className="text-slate-500">Cập nhật lần cuối: </span>
                <span className="font-mono text-slate-600">{book.updatedAt}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Giá & Kho */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-amber-600">payments</span>
              <span>Giá Bán & Tồn Kho</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Giá mở bán dự kiến:</span>
                <span className="font-bold text-[#00875A] font-mono">{book.price ? `${Math.round(book.price).toLocaleString('vi-VN')}đ` : '0đ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Giá bìa niêm yết:</span>
                <span className="font-mono text-slate-600">{book.originalPrice ? `${Math.round(book.originalPrice).toLocaleString('vi-VN')}đ` : '0đ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tồn kho ban đầu:</span>
                <span className="font-semibold text-slate-800 font-mono">{book.stock || 0} cuốn</span>
              </div>
            </div>
          </div>

          {/* Card 3: Thao tác xuất bản */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
                <span className="material-symbols-outlined text-[15px] text-emerald-600">rocket_launch</span>
                <span>Xuất Bản & Lên Sàn</span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-2 leading-relaxed">
                Khi xuất bản, ấn phẩm sẽ được mở bán ngay trên sàn cho khách hàng mà không cần chờ duyệt.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
              <button
                type="button"
                onClick={() => handlePublishNow(book)}
                disabled={actionLoadingId === book.id}
                className="w-full py-2 px-3 bg-[#00875A] hover:bg-[#00704A] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[15px]">store</span>
                <span>Xuất Bản Lên Sàn Ngay</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

    return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5 antialiased font-sans text-slate-800">
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1 text-xs text-slate-500 font-semibold">
            <Link href="/seller/products" className="hover:text-[#00875A] transition-colors">
              Kênh Người Bán
            </Link>
            <span>/</span>
            <Link href="/seller/products" className="hover:text-[#00875A] transition-colors">
              Sản Phẩm
            </Link>
            <span>/</span>
            <span className="text-[#00875A] font-bold">Danh Sách Sách Nháp</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#00875A] flex items-center justify-center border border-emerald-200 shadow-2xs">
              <span className="material-symbols-outlined text-xl">draft</span>
            </span>
            <span>Danh Sách Sách Nháp &amp; Chưa Xuất Bản</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý các ấn phẩm đang soạn thảo hoặc tạm ẩn. Bạn có thể bấm &quot;Xuất Bản Ngay&quot; để mở bán trực tiếp lên sàn mà không cần chờ duyệt.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadDrafts()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[17px] ${loading ? 'animate-spin text-[#00875A]' : 'text-slate-500'}`}>
              refresh
            </span>
            <span>Làm Mới</span>
          </button>

          <Link
            href="/seller/product/create-hybrid"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>+ Đăng Sách Mới</span>
          </Link>
        </div>
      </div>

      {/* 2. STATS KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Tổng Bản Nháp
            </span>
            <div className="text-2xl font-black text-slate-900 font-mono mt-1">
              {loading ? '…' : stats.total}
            </div>
            <span className="text-[10.5px] text-slate-400">Chưa mở bán công khai</span>
          </div>
          <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">edit_note</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Sách Giấy (In)
            </span>
            <div className="text-2xl font-black text-blue-700 font-mono mt-1">
              {loading ? '…' : stats.physical}
            </div>
            <span className="text-[10.5px] text-blue-600">Bản in kho vật lý</span>
          </div>
          <span className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">menu_book</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Ebook DRM (Số)
            </span>
            <div className="text-2xl font-black text-purple-700 font-mono mt-1">
              {loading ? '…' : stats.digital}
            </div>
            <span className="text-[10.5px] text-purple-600">Bản đọc trực tuyến</span>
          </div>
          <span className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">devices</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Combo Hybrid
            </span>
            <div className="text-2xl font-black text-emerald-700 font-mono mt-1">
              {loading ? '…' : stats.hybrid}
            </div>
            <span className="text-[10.5px] text-emerald-600">Sách in + Ebook</span>
          </div>
          <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">auto_awesome</span>
          </span>
        </div>
      </div>

      {/* 3. FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 pl-1">
            <span className="material-symbols-outlined text-base text-slate-400">filter_list</span>
            <span>Định Dạng:</span>
          </span>
          <select
            value={selectedFormat}
            onChange={(e) => {
              setSelectedFormat(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#00875A] cursor-pointer"
          >
            <option value="ALL">Tất Cả Định Dạng ({draftBooks.length})</option>
            <option value="PHYSICAL">Sách Giấy ({stats.physical})</option>
            <option value="DIGITAL">Ebook DRM ({stats.digital})</option>
            <option value="BOTH">Combo Sách + Ebook ({stats.hybrid})</option>
          </select>
        </div>

        <div className="relative min-w-[220px] sm:min-w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Tìm theo tên sách, tác giả, ISBN..."
            className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#00875A]"
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

      {/* 4. GROUPED DATA TABLE CHUẨN HÓA GROUPED DATA TABLE */}
      <GroupedDataTable<DraftBookItem>
        columns={correctionColumns}
        data={paginatedBooks}
        keyField="id"
        loading={loading}
        selectable={true}
        selectedRowKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys as string[])}
        expandable={true}
        expandedRowRender={renderExpandedDraftDetail}
        emptyTitle="Chưa có sách nháp nào"
        emptyMessage={
          searchQuery
            ? `Không tìm thấy kết quả phù hợp với từ khóa "${searchQuery}"`
            : 'Tất cả sách của bạn đã được xuất bản hoặc chưa tạo bản nháp.'
        }
        emptyIcon="draft"
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredBooks.length,
          pageSize: 10,
          onPageChange: setCurrentPage,
          itemLabel: 'sách nháp',
        }}
        className="w-full"
      />
    </div>
  );
}
