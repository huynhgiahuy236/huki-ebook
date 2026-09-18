"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';

const STATUS_TABS = [
  { key: 'ALL', label: 'Tất Cả' },
  { key: 'PUBLISHED', label: 'Đang Bán' },
  { key: 'SUSPENDED', label: 'Bị Khóa Vi Phạm' },
  { key: 'DRAFT', label: 'Bản Nháp' },
  { key: 'HIDDEN', label: 'Tạm Ẩn' },
];

const STATUS_CONFIG = {
  PUBLISHED: {
    label: 'Đang bán',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'verified',
  },
  ACTIVE: {
    label: 'Đang bán',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    icon: 'verified',
  },
  SUSPENDED: {
    label: 'Khóa vi phạm',
    badge: 'bg-rose-100 text-rose-800 border-rose-300',
    icon: 'block',
  },
  DRAFT: {
    label: 'Bản nháp',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    icon: 'edit_note',
  },
  HIDDEN: {
    label: 'Tạm ẩn',
    badge: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: 'visibility_off',
  },
  ARCHIVED: {
    label: 'Lưu trữ',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    icon: 'archive',
  },
};

const FORMAT_CONFIG = {
  PHYSICAL: { label: 'Sách Giấy', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  DIGITAL: { label: 'Ebook Số', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  BOTH: { label: 'Combo Hybrid', color: 'bg-purple-50 text-purple-800 border-purple-200' },
};

export function AdminBooksView() {
  const { showToast } = useToast();
  const [books, setBooks] = useState<any[]>([]);;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<any>(null);

  // Drawer / Modal State
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [suspendModalBook, setSuspendModalBook] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getBooks({ limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setBooks(res.data);
      } else {
        setBooks([]);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải danh mục sách quản trị:', err);
      showToast?.({
        title: 'Lỗi tải sách',
        message: 'Không thể kết nối đến máy chủ quản trị catalog.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Bộ lọc danh sách sách
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      // Filter tab
      if (activeTab !== 'ALL') {
        const normStatus = (b.status || 'DRAFT').toUpperCase();
        if (activeTab === 'PUBLISHED' && normStatus !== 'PUBLISHED' && normStatus !== 'ACTIVE') {
          return false;
        }
        if (activeTab === 'SUSPENDED' && normStatus !== 'SUSPENDED') {
          return false;
        }
        if (activeTab === 'DRAFT' && normStatus !== 'DRAFT') {
          return false;
        }
        if (activeTab === 'HIDDEN' && normStatus !== 'HIDDEN') {
          return false;
        }
      }

      // Format filter
      if (formatFilter !== 'ALL' && b.format !== formatFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = b.title?.toLowerCase().includes(q);
        const matchAuthor = b.author?.name?.toLowerCase().includes(q);
        const matchCategory = b.category?.name?.toLowerCase().includes(q);
        const matchBiz = b.businessId?.toLowerCase().includes(q);
        return matchTitle || matchAuthor || matchCategory || matchBiz;
      }

      return true;
    });
  }, [books, activeTab, formatFilter, searchQuery]);

  // Thống kê đếm số lượng
  const counts = useMemo(() => {
    return {
      ALL: books.length,
      PUBLISHED: books.filter((b) => b.status === 'PUBLISHED' || b.status === 'ACTIVE').length,
      SUSPENDED: books.filter((b) => b.status === 'SUSPENDED').length,
      DRAFT: books.filter((b) => b.status === 'DRAFT' || !b.status).length,
      HIDDEN: books.filter((b) => b.status === 'HIDDEN').length,
    };
  }, [books]);

  // Khóa sách vi phạm
  const handleConfirmSuspend = async () => {
    if (!suspendModalBook || actionLoadingId) return;
    setActionLoadingId(suspendModalBook.id);
    try {
      const res = await adminApi.suspendBook(suspendModalBook.id);
      if (res.success) {
        showToast?.({
          title: 'Đã khóa sách vi phạm',
          message: `Cuốn sách "${suspendModalBook.title}" đã bị đình chỉ phát hành!`,
          type: 'info',
        });
        setSuspendModalBook(null);
        setSuspendReason('');
        fetchBooks();
        if (selectedBook?.id === suspendModalBook.id) {
          setSelectedBook({ ...selectedBook, status: 'SUSPENDED' });
        }
      } else {
        showToast?.({
          title: 'Khóa sách thất bại',
          message: (typeof res.error === 'string' ? res.error : (res.error as any)?.message) || 'Vui lòng kiểm tra lại quyền hạn!',
          type: 'error',
        });
      }
    } catch (err: any) {
      showToast?.({
        title: 'Lỗi thao tác',
        message: err?.message || 'Có lỗi xảy ra khi khóa sách.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Mở khóa / Kích hoạt lại sách
  const handleActivate = async (book: any) => {
    if (!book || actionLoadingId) return;
    setActionLoadingId(book.id);
    try {
      const res = await adminApi.activateBook(book.id);
      if (res.success) {
        showToast?.({
          title: 'Mở khóa thành công',
          message: `Sách "${book.title}" đã được mở khóa và phát hành trở lại!`,
          type: 'success',
        });
        fetchBooks();
        if (selectedBook?.id === book.id) {
          setSelectedBook({ ...selectedBook, status: 'PUBLISHED' });
        }
      } else {
        showToast?.({
          title: 'Mở khóa thất bại',
          message: (typeof res.error === 'string' ? res.error : (res.error as any)?.message) || 'Không thể mở khóa sách.',
          type: 'error',
        });
      }
    } catch (err: any) {
      showToast?.({
        title: 'Lỗi thao tác',
        message: err?.message || 'Có lỗi xảy ra khi mở khóa sách.',
        type: 'error',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      
      {/* 1. TOP HEADER & SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
              QUẢN TRỊ CATALOG
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500 font-medium">Kiểm soát an toàn nội dung toàn sàn</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mt-1 font-editorial">
            Quản Trị Sách Toàn Sàn HUKI
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Giám sát tất cả các đầu sách được phát hành bởi các đối tác NXB / Doanh nghiệp trên nền tảng.
          </p>
        </div>

        <button
          onClick={fetchBooks}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-xs font-semibold text-gray-700 transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin text-emerald-600' : 'text-gray-500'}`}>
            refresh
          </span>
          <span>Làm mới danh mục</span>
        </button>
      </div>

      {/* 2. TABS & SEARCH & FORMAT FILTERS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {STATUS_TABS.map((tab) => {
            const isSelected = activeTab === tab.key;
            const count = (counts as any)[tab.key] || 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-[#00875A] text-white shadow-xs'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : tab.key === 'SUSPENDED' && count > 0
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Format Filter & Search */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={formatFilter}
            onChange={(e: any) => setFormatFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#00875A] cursor-pointer shrink-0"
          >
            <option value="ALL">Mọi Định Dạng</option>
            <option value="PHYSICAL">Sách Giấy</option>
            <option value="DIGITAL">Ebook Số</option>
            <option value="BOTH">Combo Hybrid</option>
          </select>

          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm theo tựa sách, tác giả, NXB..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* 3. BOOKS TABLE / CATALOG LIST */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        {loading ? (
          <div className="py-16 text-center flex flex-col items-center justify-center gap-2 text-gray-400">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <span className="text-xs font-semibold">Đang tải danh sách sách toàn sàn...</span>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center text-gray-400">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">auto_stories</span>
            <p className="text-sm font-bold text-gray-600">Không tìm thấy đầu sách nào</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {searchQuery ? 'Thử thay đổi từ khóa tìm kiếm hoặc chọn bộ lọc khác.' : 'Chưa có cuốn sách nào trong danh mục này.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Tác Phẩm &amp; Tác Giả</th>
                  <th className="py-3 px-4">Định Dạng</th>
                  <th className="py-3 px-4">Giá Niêm Yết</th>
                  <th className="py-3 px-4">Tồn Kho</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Kiểm Soát</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBooks.map((book: any) => {
                  const normStatus = (book.status || 'DRAFT').toUpperCase();
                  const cfg = (STATUS_CONFIG as any)[normStatus] || STATUS_CONFIG.DRAFT;
                  const fmt = (FORMAT_CONFIG as any)[book.format] || FORMAT_CONFIG.PHYSICAL;
                  const isSuspended = normStatus === 'SUSPENDED';
                  const isBusy = actionLoadingId === book.id;
                  const cover = book.coverImage || book.coverUrl || book.cover;

                  return (
                    <tr key={book.id} className="hover:bg-gray-50/60 transition-colors">
                      
                      {/* Cover + Title + Author */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-14 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                            {cover ? (
                              <img src={cover} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                              <span className="material-symbols-outlined text-gray-400 text-[20px]">book</span>
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs sm:max-w-sm">
                            <span 
                              className="font-bold text-gray-900 block truncate hover:text-[#00875A] cursor-pointer"
                              onClick={() => setSelectedBook(book)}
                            >
                              {book.title}
                            </span>
                            <span className="text-[11px] text-gray-500 block truncate">
                              Tác giả: <strong>{book.author?.name || 'Đang cập nhật'}</strong>
                              {book.category?.name ? ` • ${book.category.name}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Format */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${fmt.color}`}>
                          {fmt.label}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {book.price ? `${book.price.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                      </td>

                      {/* Stock */}
                      <td className="py-3.5 px-4">
                        {book.format === 'DIGITAL' ? (
                          <span className="text-gray-400 font-semibold">Vô hạn (Ebook)</span>
                        ) : (
                          <span className={`font-semibold ${Number(book.physicalDetails?.stock) <= 5 ? 'text-rose-600 font-bold' : 'text-gray-700'}`}>
                            {book.physicalDetails?.stock ?? 0} cuốn
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.badge}`}>
                          <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedBook(book)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Xem chi tiết sách"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                          </button>

                          {isSuspended ? (
                            <button
                              onClick={() => handleActivate(book)}
                              disabled={isBusy}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                              title="Mở khóa phát hành lại sách"
                            >
                              <span className="material-symbols-outlined text-[14px]">lock_open</span>
                              <span>Mở khóa</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSuspendModalBook(book);
                                setSuspendReason('');
                              }}
                              disabled={isBusy}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                              title="Khóa sách vi phạm chính sách"
                            >
                              <span className="material-symbols-outlined text-[14px]">lock</span>
                              <span>Khóa sách</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. BOOK DETAIL SIDE DRAWER */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedBook(null)}
          />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden animate-slide-left">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-200 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                  <span className="material-symbols-outlined text-[18px]">menu_book</span>
                </span>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">Chi Tiết Tác Phẩm Catalog</h2>
                  <p className="text-[11px] text-gray-500">Mã: {selectedBook.id}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedBook(null)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5 text-xs">
              
              {/* Cover & Main Info */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 flex gap-4">
                <div className="w-20 h-28 rounded-lg bg-white border border-gray-300 overflow-hidden shrink-0 shadow-2xs">
                  {selectedBook.coverImage || selectedBook.coverUrl || selectedBook.cover ? (
                    <img
                      src={selectedBook.coverImage || selectedBook.coverUrl || selectedBook.cover}
                      alt={selectedBook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="material-symbols-outlined text-3xl">book</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 line-clamp-2">{selectedBook.title}</h3>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Tác giả: <strong>{selectedBook.author?.name || 'N/A'}</strong>
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Thể loại: <strong>{selectedBook.category?.name || 'N/A'}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${((STATUS_CONFIG as any)[selectedBook.status?.toUpperCase()] || STATUS_CONFIG.DRAFT).badge}`}>
                      {((STATUS_CONFIG as any)[selectedBook.status?.toUpperCase()] || STATUS_CONFIG.DRAFT).label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${((FORMAT_CONFIG as any)[selectedBook.format] || FORMAT_CONFIG.PHYSICAL).color}`}>
                      {((FORMAT_CONFIG as any)[selectedBook.format] || FORMAT_CONFIG.PHYSICAL).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MÔ TẢ NỘI DUNG</span>
                <p className="text-gray-700 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  {selectedBook.description || 'Chưa có thông tin mô tả cho cuốn sách này.'}
                </p>
              </div>

              {/* Pricing & Stock Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GIÁ BÁN NIÊM YẾT</span>
                  <span className="font-bold text-base text-gray-900">
                    {selectedBook.price ? `${selectedBook.price.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TỒN KHO VẬT LÝ</span>
                  <span className="font-bold text-base text-gray-900">
                    {selectedBook.format === 'DIGITAL' ? 'Ebook' : `${selectedBook.physicalDetails?.stock ?? 0} cuốn`}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex flex-col gap-1 col-span-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">DOANH NGHIỆP PHÁT HÀNH</span>
                  <span className="font-mono text-gray-700">{selectedBook.businessId || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-gray-200 bg-gray-50/70 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedBook(null)}
                className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors"
              >
                Đóng
              </button>

              {selectedBook.status === 'SUSPENDED' ? (
                <button
                  onClick={() => handleActivate(selectedBook)}
                  disabled={actionLoadingId === selectedBook.id}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs"
                >
                  Mở khóa phát hành
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSuspendModalBook(selectedBook);
                    setSuspendReason('');
                  }}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs"
                >
                  Khóa sách vi phạm
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. SUSPEND BOOK MODAL */}
      {suspendModalBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSuspendModalBook(null)}
          />
          <div className="relative w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl z-10 flex flex-col gap-4 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600">
              <span className="material-symbols-outlined text-3xl">lock</span>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Khóa Phát Hành Sách Vi Phạm</h3>
                <p className="text-xs text-gray-500 truncate max-w-xs">{suspendModalBook.title}</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Sau khi bị khóa, cuốn sách sẽ bị ẩn hoàn toàn khỏi Storefront và độc giả không thể tìm kiếm hay mua sách.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-700">Lý do khóa phát hành:</label>
              <textarea
                rows={3}
                placeholder="Nhập lý do khóa vi phạm chính sách nền tảng..."
                value={suspendReason}
                onChange={(e: any) => setSuspendReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 focus:outline-none focus:border-rose-500 focus:bg-white transition-all resize-none"
              />

              <div className="flex flex-wrap gap-1.5 mt-1">
                {[
                  'Vi phạm bản quyền tác giả',
                  'Nội dung không phù hợp tiêu chuẩn',
                  'Thông tin sách sai lệch nghiêm trọng',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setSuspendReason(preset)}
                    className="text-[10px] px-2 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSuspendModalBook(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={actionLoadingId === suspendModalBook.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs"
              >
                Xác nhận khóa sách
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBooksView;
