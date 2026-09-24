"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { catalogApi, BookFormat } from '@/ui/api/catalogApi';
import { businessApi } from '@/ui/api/businessApi';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { can, PERMISSIONS } from '@/ui/utils/permissions';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerActionButton,
  SellerFilterTabs,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';

interface BookAuthor {
  name?: string;
}

interface BookPublisher {
  name?: string;
}

interface BookCategory {
  id?: string;
  name?: string;
}

interface BookPhysicalDetails {
  stock?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  physicalEnabled?: boolean;
}

interface SellerBookItem {
  id: string;
  title: string;
  slug?: string;
  price?: number;
  originalPrice?: number;
  format?: BookFormat;
  status?: string;
  createdAt?: string;
  coverUrl?: string;
  coverImage?: string;
  cover?: string;
  description?: string;
  author?: BookAuthor | string;
  publisher?: BookPublisher | string;
  category?: BookCategory;
  categoryId?: string;
  physicalDetails?: BookPhysicalDetails;
}

interface CategoryOption {
  id: string;
  name: string;
}

export default function SellerProductsPage() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();

  const [books, setBooks] = useState<SellerBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const currentBizId = user?.business?.id || activeBusinessId || undefined;
  const canViewProduct = can(PERMISSIONS.PRODUCT_VIEW, currentBizId, user);
  const canUpdateProduct = can(PERMISSIONS.PRODUCT_UPDATE, currentBizId, user);

  // In-Page Edit State (NO POPUP)
  const [editingBook, setEditingBook] = useState<SellerBookItem | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [bookFormData, setBookFormData] = useState<{
    title: string;
    authorName: string;
    publisherName: string;
    categoryId: string;
    price: number;
    originalPrice: number;
    format: BookFormat;
    stock: number;
    coverUrl: string;
    description: string;
    status: string;
  }>({
    title: '',
    authorName: '',
    publisherName: '',
    categoryId: '',
    price: 0,
    originalPrice: 0,
    format: 'PHYSICAL',
    stock: 0,
    coverUrl: '',
    description: '',
    status: 'PUBLISHED',
  });
  const [isSavingBook, setIsSavingBook] = useState(false);

  // Load books from backend
  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      let bizId = user?.business?.id || activeBusinessId;
      if (!bizId) {
        try {
          const myBiz = await businessApi.getMyBusiness();
          if (myBiz.success && myBiz.data?.id) {
            bizId = myBiz.data.id;
            setActiveBusinessId(bizId);
          }
        } catch { /* ignore */ }
      }

      const res = await catalogApi.getSellerBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) });
      let items: SellerBookItem[] = [];
      if (res.data) {
        if (Array.isArray(res.data)) {
          items = res.data as SellerBookItem[];
        } else if (Array.isArray((res.data as { items?: SellerBookItem[] }).items)) {
          items = (res.data as { items: SellerBookItem[] }).items;
        } else if (Array.isArray((res.data as { data?: SellerBookItem[] }).data)) {
          items = (res.data as { data: SellerBookItem[] }).data;
        }
      }
      setBooks(items);
    } catch (err) {
      console.error('Error fetching books:', err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeBusinessId, setActiveBusinessId]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  // Load categories for selector
  useEffect(() => {
    catalogApi.getCategories().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data as CategoryOption[]);
      }
    }).catch(() => {});
  }, []);

  // Handle Publish Book
  const handlePublish = async (bookId: string, title: string) => {
    setActionLoadingId(bookId);
    try {
      const res = await catalogApi.publishBook(bookId);
      if (res.success) {
        showToast?.(`Đã xuất bản thành công sách "${title}"!`, 'success');
        await loadBooks();
      } else {
        showToast?.(res.error?.message || 'Không thể xuất bản sách.', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối khi xuất bản sách.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVisibility = async (book: SellerBookItem) => {
    setActionLoadingId(book.id);
    try {
      const res = book.status === 'PUBLISHED'
        ? await catalogApi.hideBook(book.id)
        : await catalogApi.publishBook(book.id);
      if (res.success) {
        showToast?.(book.status === 'PUBLISHED' ? `Đã tạm ẩn sách "${book.title}".` : `Đã mở bán sách "${book.title}".`, 'success');
        await loadBooks();
      } else {
        showToast?.(res.error?.message || 'Không thể thay đổi trạng thái sách.', 'error');
      }
    } catch {
      showToast?.('Lỗi kết nối khi thay đổi trạng thái sách.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Full Book In-Page Edit Form
  const openEditForm = (book: SellerBookItem) => {
    setEditingBook(book);
    setBookFormData({
      title: book.title || '',
      authorName: (typeof book.author === 'object' ? book.author?.name : book.author) || '',
      publisherName: (typeof book.publisher === 'object' ? book.publisher?.name : book.publisher) || 'HUKI EBOOK',
      categoryId: book.category?.id || book.categoryId || '',
      price: book.price != null ? Number(book.price) : 0,
      originalPrice: book.originalPrice != null ? Number(book.originalPrice) : (book.price != null ? Number(book.price) : 0),
      format: (book.format as BookFormat) || 'PHYSICAL',
      stock: book.physicalDetails?.stock ?? 0,
      coverUrl: book.coverUrl || book.coverImage || book.cover || '',
      description: book.description || '',
      status: book.status || 'PUBLISHED',
    });
  };

  const handleSaveBook = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingBook) return;
    if (!bookFormData.title.trim()) {
      showToast?.('Vui lòng nhập tựa sách!', 'warning');
      return;
    }
    const priceNum = Number(bookFormData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      showToast?.('Giá bán không hợp lệ!', 'warning');
      return;
    }

    setIsSavingBook(true);
    try {
      const updatePayload = {
        title: bookFormData.title.trim(),
        price: priceNum,
        format: bookFormData.format,
        description: bookFormData.description.trim() || undefined,
        coverUrl: bookFormData.coverUrl.trim() || undefined,
        categoryId: bookFormData.categoryId || undefined,
        physicalDetails: (bookFormData.format === 'PHYSICAL' || bookFormData.format === 'BOTH') ? {
          stock: Math.max(0, Number(bookFormData.stock) || 0),
          weight: editingBook?.physicalDetails?.weight || 300,
          length: editingBook?.physicalDetails?.length || 20,
          width: editingBook?.physicalDetails?.width || 13,
          height: editingBook?.physicalDetails?.height || 2,
          physicalEnabled: true,
        } : undefined,
        digitalDetails: (bookFormData.format === 'DIGITAL' || bookFormData.format === 'BOTH') ? {
          digitalEnabled: true,
          drmEnabled: true,
        } : undefined,
      };

      const res = await catalogApi.updateBook(editingBook.id, updatePayload);
      if (res.success || res.data) {
        if (bookFormData.format === 'PHYSICAL' || bookFormData.format === 'BOTH') {
          try {
            await catalogApi.updateInventory(editingBook.id, Math.max(0, Number(bookFormData.stock) || 0), 'MANUAL_ADJUSTMENT');
          } catch { /* ignore */ }
        }
        showToast?.(`Đã cập nhật thông tin sách "${bookFormData.title}" thành công!`, 'success');
        setEditingBook(null);
        await loadBooks();
      } else {
        showToast?.(res.error?.message || 'Không thể cập nhật sách.', 'error');
      }
    } catch (err) {
      console.error('Error updating book:', err);
      showToast?.('Lỗi kết nối khi cập nhật thông tin sách.', 'error');
    } finally {
      setIsSavingBook(false);
    }
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const total = books.length;
    const published = books.filter(b => b.status === 'PUBLISHED').length;
    const draft = books.filter(b => b.status === 'DRAFT' || !b.status).length;
    const totalStock = books.reduce((sum, b) => sum + (b.physicalDetails?.stock || 0), 0);
    const lowStock = books.filter(b => (b.physicalDetails?.stock ?? 0) < 10 && (b.physicalDetails?.stock ?? 0) > 0).length;
    const outOfStock = books.filter(b => b.format !== 'DIGITAL' && (b.physicalDetails?.stock ?? 0) === 0).length;
    const digitalCount = books.filter(b => b.format === 'DIGITAL' || b.format === 'BOTH').length;

    return { total, published, draft, totalStock, lowStock, outOfStock, digitalCount };
  }, [books]);

  // Filtered books
  const filteredBooks = useMemo(() => {
    return books.filter(b => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = (b.title || '').toLowerCase().includes(q);
        const matchSlug = (b.slug || '').toLowerCase().includes(q);
        const matchId = (b.id || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSlug && !matchId) return false;
      }

      // Format filter
      if (selectedFormat !== 'ALL' && b.format !== selectedFormat) {
        return false;
      }

      // Tab status filter
      if (activeTab === 'PUBLISHED' && b.status !== 'PUBLISHED') return false;
      if (activeTab === 'DRAFT' && b.status !== 'DRAFT' && b.status) return false;
      if (activeTab === 'LOW_STOCK') {
        const stock = b.physicalDetails?.stock ?? 0;
        if (b.format === 'DIGITAL' || stock >= 10) return false;
      }

      return true;
    });
  }, [books, searchQuery, selectedFormat, activeTab]);

  const totalPages = Math.ceil(filteredBooks.length / pageSize) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage, pageSize]);

  if (!canViewProduct) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 border border-amber-500/20 shadow-xs">
          <span className="material-symbols-outlined text-3xl">lock</span>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Không Có Quyền Truy Cập (403 Forbidden)
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6">
          Tài khoản nhân viên của bạn chưa được cấp quyền xem danh mục sản phẩm (`PRODUCT_VIEW`).
        </p>
        <Link
          href="/seller/dashboard"
          className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-xs"
        >
          Quay lại Bảng Điều Khiển
        </Link>
      </div>
    );
  }

  const tabs = [
    { key: 'ALL', label: 'Tất Cả', count: metrics.total },
    { key: 'PUBLISHED', label: 'Đang Bán', count: metrics.published },
    { key: 'DRAFT', label: 'Bản Nháp', count: metrics.draft },
    { key: 'LOW_STOCK', label: 'Sắp Hết Kho', count: metrics.lowStock + metrics.outOfStock },
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-5">
      
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <span className="material-symbols-outlined text-[20px]">auto_stories</span>
            </span>
            <span>Quản Lý Sản Phẩm</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Danh mục đầu sách, trạng thái kiểm duyệt, giá niêm yết và tồn kho thực tế
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <SellerActionButton
            type="button"
            variant="secondary"
            size="sm"
            icon="refresh"
            loading={loading}
            onClick={() => loadBooks()}
          >
            Làm Mới
          </SellerActionButton>

          {can(PERMISSIONS.PRODUCT_CREATE, currentBizId, user) && (
            <div className="relative group">
              <SellerActionButton
                type="button"
                variant="primary"
                size="sm"
                icon="add_circle"
              >
                <span>+ Thêm Sản Phẩm Mới</span>
              </SellerActionButton>

              {/* Dropdown Options */}
              <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-2xl shadow-xl border border-slate-200/80 py-1.5 z-30 hidden group-hover:block transition-all">
                <Link
                  href="/seller/product/create-physical"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-amber-600">inventory_2</span>
                  <div>
                    <div className="font-bold text-slate-900">Đăng Sách Giấy</div>
                    <div className="text-[10px] text-slate-400 font-normal">Quản lý kho vật lý &amp; kích thước</div>
                  </div>
                </Link>
                <Link
                  href="/seller/product/create-ebook"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-purple-600">menu_book</span>
                  <div>
                    <div className="font-bold text-slate-900">Đăng Ebook Kỹ Thuật Số</div>
                    <div className="text-[10px] text-slate-400 font-normal">Cấp quyền số &amp; bảo vệ DRM</div>
                  </div>
                </Link>
                <div className="my-1 border-t border-slate-100" />
                <Link
                  href="/seller/product/create-hybrid"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-emerald-600">auto_stories</span>
                  <div>
                    <div className="font-bold text-slate-900">Đăng Combo Sách + Ebook</div>
                    <div className="text-[10px] text-slate-400 font-normal">Gói Hybrid đồng bộ cả 2 ấn phẩm</div>
                  </div>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPI METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500">Tổng Đầu Sách</span>
              <div className="text-xl font-bold text-slate-900 mt-0.5">
                {loading ? '…' : metrics.total}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center shrink-0 border border-slate-100">
              <span className="material-symbols-outlined text-base">library_books</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Tất cả ấn phẩm trong gian hàng
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500">Đang Bán Công Khai</span>
              <div className="text-xl font-bold text-emerald-600 mt-0.5">
                {loading ? '…' : metrics.published}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <span className="material-symbols-outlined text-base">store</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-medium">
            Hiển thị cho độc giả toàn sàn
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500">Bản Nháp (Chưa Bán)</span>
              <div className="text-xl font-bold text-amber-600 mt-0.5">
                {loading ? '…' : metrics.draft}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
              <span className="material-symbols-outlined text-base">edit_note</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 font-medium">
            Có thể bấm &quot;Xuất bản&quot;
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500">Tổng Tồn Kho Sách Giấy</span>
              <div className="text-xl font-bold text-indigo-600 mt-0.5">
                {loading ? '…' : metrics.totalStock.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <span className="material-symbols-outlined text-base">warehouse</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            {metrics.digitalCount} tựa có Ebook DRM
          </div>
        </div>
      </div>

      {/* 3. IN-PAGE COLLAPSIBLE EDIT FORM (NO POPUP) */}
      {editingBook && (
        <div className="p-5 rounded-2xl bg-white border-2 border-amber-200/80 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2 text-amber-700">
              <span className="material-symbols-outlined text-lg">edit_note</span>
              <h3 className="font-bold text-sm text-slate-900">
                Chỉnh Sửa Nhanh Sản Phẩm #{editingBook.id.substring(0, 8).toUpperCase()}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setEditingBook(null)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <form onSubmit={handleSaveBook} className="space-y-4 text-xs">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên Sách / Tựa Tác Phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={bookFormData.title}
                  onChange={(e) => setBookFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                  placeholder="Ví dụ: Chiến Binh Cầu Vồng"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tác Giả
                </label>
                <input
                  type="text"
                  value={bookFormData.authorName}
                  onChange={(e) => setBookFormData((prev) => ({ ...prev, authorName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  placeholder="Tên tác giả..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhà Xuất Bản
                </label>
                <input
                  type="text"
                  value={bookFormData.publisherName}
                  onChange={(e) => setBookFormData((prev) => ({ ...prev, publisherName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                  placeholder="Ví dụ: NXB Hội Nhà Văn"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Danh Mục / Thể Loại
                </label>
                <select
                  value={bookFormData.categoryId}
                  onChange={(e) => setBookFormData((prev) => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Định Dạng Sách
                </label>
                <select
                  value={bookFormData.format}
                  onChange={(e) => setBookFormData((prev) => ({ ...prev, format: e.target.value as BookFormat }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="PHYSICAL">Sách Giấy Vật Lý</option>
                  <option value="DIGITAL">Ebook DRM Kỹ Thuật Số</option>
                  <option value="BOTH">Combo Hybrid (Sách Giấy + Ebook)</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Giá Bán Sàn (₫) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={bookFormData.price}
                  onChange={(e) => setBookFormData((prev) => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Giá Bìa Gốc (₫)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={bookFormData.originalPrice}
                  onChange={(e) => setBookFormData((prev) => ({ ...prev, originalPrice: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-amber-500"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tồn Kho (Cuốn)
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={bookFormData.format === 'DIGITAL'}
                  value={bookFormData.format === 'DIGITAL' ? 0 : bookFormData.stock}
                  onChange={(e) => setBookFormData((prev) => ({ ...prev, stock: Number(e.target.value) }))}
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                    bookFormData.format === 'DIGITAL'
                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                      : 'bg-white text-slate-900 border-slate-200 focus:outline-none focus:border-amber-500'
                  }`}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <SellerActionButton
                type="button"
                variant="neutral"
                size="sm"
                onClick={() => setEditingBook(null)}
              >
                Hủy Bỏ
              </SellerActionButton>
              <SellerActionButton
                type="submit"
                variant="primary"
                size="sm"
                loading={isSavingBook}
                icon="check"
              >
                Lưu Thay Đổi
              </SellerActionButton>
            </div>
          </form>
        </div>
      )}

      {/* 4. FILTER TABS & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <SellerFilterTabs
          tabs={tabs}
          activeTab={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            setCurrentPage(1);
          }}
        />

        <div className="flex items-center gap-2">
          <select
            value={selectedFormat}
            onChange={(e) => {
              setSelectedFormat(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
          >
            <option value="ALL">Mọi Định Dạng</option>
            <option value="PHYSICAL">Sách Giấy</option>
            <option value="DIGITAL">Ebook DRM</option>
            <option value="BOTH">Combo Sách + Ebook</option>
          </select>

          <div className="relative min-w-[200px] sm:min-w-[240px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm tên sách, slug..."
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
      </div>

      {/* 5. PRODUCTS TABLE LIST */}
      <SellerTableContainer minWidth="min-w-[1360px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/80 whitespace-nowrap">
              <th className="py-3.5 px-4">Sản Phẩm &amp; Bìa</th>
              <th className="py-3.5 px-3">Định Dạng</th>
              <th className="py-3.5 px-3">Giá Bán</th>
              <th className="py-3.5 px-3">Tồn Kho</th>
              <th className="py-3.5 px-3">Trạng Thái</th>
              <th className="py-3.5 px-3">Ngày Tạo</th>
              <th className="py-3.5 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-xl text-slate-400">progress_activity</span>
                    <span className="text-xs">Đang tải danh mục sách...</span>
                  </div>
                </td>
              </tr>
            ) : filteredBooks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                    <span className="material-symbols-outlined text-4xl text-slate-300">auto_stories</span>
                    <p className="font-medium text-slate-600">Chưa có sản phẩm nào phù hợp.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedBooks.map((book) => {
                const cover = book.coverUrl || book.coverImage || book.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80';
                const isPublished = book.status === 'PUBLISHED';
                const isDraft = book.status === 'DRAFT' || !book.status;
                const stock = book.physicalDetails?.stock ?? 0;
                const isLowStock = book.format !== 'DIGITAL' && stock > 0 && stock < 10;
                const isOutOfStock = book.format !== 'DIGITAL' && stock === 0;

                return (
                  <tr key={book.id} className="hover:bg-slate-50/60 transition-colors whitespace-nowrap group">
                    {/* Product & Cover */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={cover}
                          alt={book.title}
                          className="w-10 h-14 object-cover rounded-md border border-slate-200 shadow-2xs shrink-0 bg-slate-100"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80';
                          }}
                        />
                        <div className="min-w-0 max-w-xs sm:max-w-md">
                          <Link
                            href={`/books/${book.id}`}
                            target="_blank"
                            title={book.title}
                            className="font-bold text-slate-900 hover:text-blue-600 line-clamp-2 transition-colors leading-snug break-words text-xs"
                          >
                            {book.title}
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 font-mono">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                              #{book.id.substring(0, 6).toUpperCase()}
                            </span>
                            {book.slug && (
                              <span className="truncate max-w-[140px] text-slate-400">
                                · {book.slug}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Format */}
                    <td className="py-3 px-3">
                      {book.format === 'PHYSICAL' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200/60">
                          <span className="material-symbols-outlined text-xs">menu_book</span>
                          <span>Sách Giấy</span>
                        </span>
                      )}
                      {book.format === 'DIGITAL' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200/60">
                          <span className="material-symbols-outlined text-xs">phonelink</span>
                          <span>Ebook DRM</span>
                        </span>
                      )}
                      {book.format === 'BOTH' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200/60">
                          <span className="material-symbols-outlined text-xs">auto_stories</span>
                          <span>Combo</span>
                        </span>
                      )}
                      {!book.format && (
                        <span className="text-slate-400 text-[11px]">Chưa xác định</span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-3 px-3 font-bold text-slate-900">
                      {book.price != null && !isNaN(Number(book.price))
                        ? Number(book.price).toLocaleString('vi-VN') + ' ₫'
                        : '0 ₫'}
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-3">
                      {book.format === 'DIGITAL' ? (
                        <span className="text-purple-600 font-bold text-[11px] flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">all_inclusive</span>
                          <span>Ebook DRM</span>
                        </span>
                      ) : isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 font-bold text-[11px] border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>Hết hàng (0)</span>
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
                          <span className="material-symbols-outlined text-xs">warning</span>
                          <span>Còn {stock} cuốn</span>
                        </span>
                      ) : (
                        <span className="font-semibold text-slate-800 text-xs">
                          {stock.toLocaleString('vi-VN')} cuốn
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      {isPublished ? (
                        <SellerStatusBadge variant="success" dot text="Đang Bán" />
                      ) : isDraft ? (
                        <SellerStatusBadge variant="warning" dot text="Bản Nháp" />
                      ) : (
                        <SellerStatusBadge variant="neutral" text={book.status || 'Ẩn'} />
                      )}
                    </td>

                    {/* Created At */}
                    <td className="py-3 px-3 text-slate-400 text-[11px]">
                      {book.createdAt ? new Date(book.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {canUpdateProduct && (
                          <SellerActionButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            icon="edit"
                            onClick={() => openEditForm(book)}
                          >
                            Sửa
                          </SellerActionButton>
                        )}

                        {canUpdateProduct && (book.status === 'PUBLISHED' || book.status === 'HIDDEN') && (
                          <SellerActionButton
                            type="button"
                            variant="neutral"
                            size="sm"
                            icon={book.status === 'PUBLISHED' ? 'visibility_off' : 'visibility'}
                            loading={actionLoadingId === book.id}
                            onClick={() => handleVisibility(book)}
                          >
                            {book.status === 'PUBLISHED' ? 'Ẩn' : 'Mở bán'}
                          </SellerActionButton>
                        )}

                        {isDraft && (
                          <SellerActionButton
                            type="button"
                            variant="primary"
                            size="sm"
                            icon="publish"
                            loading={actionLoadingId === book.id}
                            onClick={() => handlePublish(book.id, book.title)}
                          >
                            Xuất Bản
                          </SellerActionButton>
                        )}

                        <Link href={`/books/${book.id}`} target="_blank">
                          <SellerActionButton
                            type="button"
                            variant="ghost"
                            size="sm"
                            icon="open_in_new"
                          />
                        </Link>
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
