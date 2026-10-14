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

      {/* 4. GROUPED DATA TABLE */}
      <SellerTableContainer>
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200/80">
              <th className="py-3.5 px-3 w-12 text-center">STT</th>
              <th className="py-3.5 px-4">Sản Phẩm &amp; Ảnh Bìa</th>
              <th className="py-3.5 px-3">Tác Giả &amp; NXB</th>
              <th className="py-3.5 px-3">Định Dạng</th>
              <th className="py-3.5 px-3 text-right">Giá Dự Kiến</th>
              <th className="py-3.5 px-3 text-center">Trạng Thái</th>
              <th className="py-3.5 px-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  <div className="flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-xl text-slate-400">progress_activity</span>
                    <span className="text-xs">Đang tải danh sách bản nháp...</span>
                  </div>
                </td>
              </tr>
            ) : filteredBooks.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2.5 max-w-sm mx-auto">
                    <span className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                      <span className="material-symbols-outlined text-2xl">draft</span>
                    </span>
                    <div>
                      <p className="font-bold text-slate-700 text-sm">Chưa có sách nháp nào</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {searchQuery ? 'Không tìm thấy kết quả phù hợp với từ khóa.' : 'Tất cả sách của bạn đã được xuất bản hoặc chưa tạo bản nháp.'}
                      </p>
                    </div>
                    <Link
                      href="/seller/product/create-hybrid"
                      className="mt-1 px-4 py-2 rounded-xl bg-[#00875A] text-white text-xs font-bold hover:bg-[#00704A] transition-colors"
                    >
                      + Đăng Sách Mới Ngay
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedBooks.map((book, idx) => {
                const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                const isActionLoading = actionLoadingId === book.id;

                const formatBadge = book.format === 'DIGITAL' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    <span className="material-symbols-outlined text-xs">devices</span>
                    <span>Ebook DRM</span>
                  </span>
                ) : book.format === 'BOTH' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="material-symbols-outlined text-xs">auto_awesome</span>
                    <span>Sách + Ebook</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <span className="material-symbols-outlined text-xs">menu_book</span>
                    <span>Sách Giấy</span>
                  </span>
                );

                return (
                  <tr key={book.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* STT */}
                    <td className="py-3.5 px-3 text-center text-slate-400 font-mono text-xs">
                      {itemIndex}
                    </td>

                    {/* Sản phẩm & Bìa */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-10 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0 bg-slate-100"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2">
                            {book.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>ISBN: {book.isbn || 'N/A'}</span>
                            <span>•</span>
                            <span>{book.updatedAt}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Tác giả & NXB */}
                    <td className="py-3.5 px-3">
                      <div className="text-slate-800 font-medium text-xs">{book.author}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{book.publisher || 'Tự xuất bản'}</div>
                    </td>

                    {/* Định dạng */}
                    <td className="py-3.5 px-3">
                      {formatBadge}
                      {book.format !== 'DIGITAL' && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          Tồn kho: <strong className="text-slate-700">{book.stock || 0}</strong>
                        </div>
                      )}
                    </td>

                    {/* Giá bán */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="font-bold text-slate-900 font-mono text-xs">
                        {book.price ? `${Math.round(book.price).toLocaleString('vi-VN')}đ` : '0đ'}
                      </div>
                      {book.originalPrice && book.originalPrice > (book.price || 0) && (
                        <div className="text-[10px] text-slate-400 line-through font-mono mt-0.5">
                          {Math.round(book.originalPrice).toLocaleString('vi-VN')}đ
                        </div>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-3 text-center">
                      <SellerStatusBadge
                        variant="warning"
                        label={book.status === 'HIDDEN' ? 'Tạm Ẩn' : 'Bản Nháp'}
                        dot={true}
                      />
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => handlePublishNow(book)}
                          disabled={isActionLoading}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                          title="Mở bán công khai trực tiếp lên sàn"
                        >
                          <span className="material-symbols-outlined text-xs">store</span>
                          <span>Xuất Bản</span>
                        </button>

                        <Link
                          href={`/seller/product/create-hybrid?editId=${book.id}`}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                          title="Chỉnh sửa nội dung sách"
                        >
                          <span className="material-symbols-outlined text-xs">edit</span>
                          <span>Sửa</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => handleDeleteDraft(book.id, book.title)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Xóa bản nháp"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* 5. PHÂN TRANG */}
        {!loading && filteredBooks.length > 0 && (
          <SellerPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredBooks.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            itemLabel="sách nháp"
          />
        )}
      </SellerTableContainer>
    </div>
  );
}
