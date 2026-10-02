import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { adminApi } from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import { useSmartFormCollapse } from '../../utils/formHooks';
import { AdminStatusBadge, AdminFilterTabs, AdminPagination, AdminTableContainer } from './AdminUI';

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
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<any>(null);
  const [expandedBookIds, setExpandedBookIds] = useState<Set<string>>(new Set());

  const toggleExpandRow = (id: string) => {
    setExpandedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Drawer / In-Page Form State
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [suspendModalBook, setSuspendModalBook] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendReasonError, setSuspendReasonError] = useState('');

  const bookDetailRef = useSmartFormCollapse({
    isOpen: Boolean(selectedBook),
    onClose: () => setSelectedBook(null),
    isDirty: false,
  });

  const isSuspendDirty = Boolean(suspendReason.trim());
  const suspendFormRef = useSmartFormCollapse({
    isOpen: Boolean(suspendModalBook),
    onClose: () => {
      setSuspendModalBook(null);
      setSuspendReason('');
      setSuspendReasonError('');
    },
    isDirty: isSuspendDirty,
  });

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

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.ceil(filteredBooks.length / pageSize) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setCurrentPage(1);
  };

  // Khóa sách vi phạm
  const handleConfirmSuspend = async () => {
    if (!suspendModalBook || actionLoadingId) return;
    if (!suspendReason.trim()) {
      setSuspendReasonError('Vui lòng nhập lý do khóa phát hành sách vi phạm.');
      return;
    }
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
        setSuspendReasonError('');
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
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200">
      {/* 1. TOP HEADER & SUMMARY */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial">
            Quản Trị Sách Toàn Sàn
          </h1>
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
        <AdminFilterTabs
          tabs={STATUS_TABS}
          activeTab={activeTab}
          onChange={handleTabChange}
          counts={counts}
        />

        {/* Format Filter & Search */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <select
            value={formatFilter}
            onChange={(e: any) => {
              setFormatFilter(e.target.value);
              setCurrentPage(1);
            }}
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
              onChange={(e: any) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
            />
          </div>
        </div>
      </div>

      {/* 3. BOOKS TABLE / CATALOG LIST */}
      <AdminTableContainer>
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
          <div className="w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                <tr>
                  <th className="py-3 px-2 w-10 text-center"></th>
                  <th className="py-3 px-2 w-12 text-center">STT</th>
                  <th className="py-3 px-3.5">Tác Phẩm &amp; Bìa Sách</th>
                  <th className="py-3 px-3.5">Tác Giả &amp; NXB</th>
                  <th className="py-3 px-3.5 text-center">Thể Loại &amp; Định Dạng</th>
                  <th className="py-3 px-3.5">Giá &amp; Tồn Kho</th>
                  <th className="py-3 px-3.5 text-right">Trạng Thái &amp; Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedBooks.map((book: any, idx: number) => {
                  const normStatus = (book.status || 'DRAFT').toUpperCase();
                  const isSuspended = normStatus === 'SUSPENDED';
                  const isBusy = actionLoadingId === book.id;
                  const cover = book.coverImage || book.coverUrl || book.cover;
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const isExpanded = expandedBookIds.has(book.id);

                  let statusVariant: any = 'neutral';
                  let statusLabel = 'Bản nháp';
                  if (normStatus === 'PUBLISHED' || normStatus === 'ACTIVE') {
                    statusVariant = 'success';
                    statusLabel = 'Đang bán';
                  } else if (normStatus === 'SUSPENDED') {
                    statusVariant = 'danger';
                    statusLabel = 'Khóa vi phạm';
                  } else if (normStatus === 'HIDDEN') {
                    statusVariant = 'neutral';
                    statusLabel = 'Tạm ẩn';
                  } else if (normStatus === 'DRAFT') {
                    statusVariant = 'warning';
                    statusLabel = 'Bản nháp';
                  }

                  let formatLabel = 'Sách Giấy';
                  let formatBadge = 'bg-amber-50 text-amber-800 border-amber-200';
                  if (book.format === 'DIGITAL') {
                    formatLabel = 'Ebook Số';
                    formatBadge = 'bg-blue-50 text-blue-800 border-blue-200';
                  } else if (book.format === 'BOTH') {
                    formatLabel = 'Combo Hybrid';
                    formatBadge = 'bg-purple-50 text-purple-800 border-purple-200';
                  }

                  return (
                    <React.Fragment key={book.id}>
                      {/* Dòng tóm tắt chính (Master Row) */}
                      <tr
                        className={`transition-colors group ${
                          isExpanded ? 'bg-emerald-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'
                        } hover:bg-emerald-50/50`}
                      >
                        {/* 1. Mũi tên mở rộng */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => toggleExpandRow(book.id)}
                            className="w-6 h-6 rounded-md hover:bg-emerald-100 text-gray-500 hover:text-emerald-800 flex items-center justify-center transition-all cursor-pointer"
                            title={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
                          >
                            <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isExpanded ? 'rotate-90 text-emerald-700' : ''}`}>
                              chevron_right
                            </span>
                          </button>
                        </td>

                        {/* 2. STT */}
                        <td className="py-3 px-2 text-center text-[11px] font-mono text-gray-400 font-semibold">
                          {itemIndex}
                        </td>

                        {/* 3. Tác Phẩm & Bìa (Xếp chồng: Tiêu đề dòng 1 + ID dòng 2) */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-12 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                              {cover ? (
                                <img src={cover} alt={book.title} className="w-full h-full object-cover" />
                              ) : (
                                <span className="material-symbols-outlined text-gray-400 text-[18px]">book</span>
                              )}
                            </div>
                            <div className="min-w-0 max-w-[260px]">
                              <span
                                className="font-bold text-gray-900 block truncate hover:text-[#00875A] cursor-pointer"
                                onClick={() => toggleExpandRow(book.id)}
                                title={book.title}
                              >
                                {book.title}
                              </span>
                              <span className="text-[10px] text-gray-400 block truncate font-mono mt-0.5">
                                ID: {book.id} {book.isbn ? `• ISBN: ${book.isbn}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 4. Tác Giả & NXB (Xếp chồng: Tác giả dòng 1 + NXB dòng 2) */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-gray-900 break-words">
                              {book.author?.name || 'Tác giả HUKI'}
                            </span>
                            <span className="text-[10.5px] text-gray-500 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-gray-400 shrink-0">storefront</span>
                              <span className="break-words">{book.publisher?.name || 'Gian hàng HUKI'}</span>
                            </span>
                          </div>
                        </td>

                        {/* 5. Thể Loại & Định Dạng (Xếp chồng: Thể loại dòng 1 + Badge định dạng dòng 2) */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-gray-700 font-medium text-xs truncate max-w-[130px]">
                              {book.category?.name || 'Văn học'}
                            </span>
                            <span className={`inline-block px-2 py-0.2 rounded-full text-[9.5px] font-bold border ${formatBadge}`}>
                              {formatLabel}
                            </span>
                          </div>
                        </td>

                        {/* 6. Giá & Tồn Kho (Xếp chồng: Giá dòng 1 + Tồn kho dòng 2) */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-900 font-mono text-[13px]">
                              {book.price ? `${book.price.toLocaleString('vi-VN')} đ` : 'Miễn phí'}
                            </span>
                            <span className="text-[11px]">
                              {book.format === 'DIGITAL' ? (
                                <span className="text-[#006953] font-semibold text-[10.5px]">Vô hạn (Ebook)</span>
                              ) : (
                                <span className={Number(book.physicalDetails?.stock) <= 5 ? 'text-rose-600 font-bold' : 'text-gray-500 font-medium'}>
                                  Kho: {book.physicalDetails?.stock ?? 0} cuốn
                                </span>
                              )}
                            </span>
                          </div>
                        </td>

                        {/* 7. Trạng Thái & Thao Tác Nhanh */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex flex-col items-end gap-1.5">
                            <AdminStatusBadge variant={statusVariant} label={statusLabel} />
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => toggleExpandRow(book.id)}
                                className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 text-gray-700 font-semibold text-[10.5px] transition-colors cursor-pointer flex items-center gap-0.5"
                              >
                                <span>{isExpanded ? 'Thu lại' : 'Chi tiết'}</span>
                                <span className="material-symbols-outlined text-[12px]">
                                  {isExpanded ? 'expand_less' : 'expand_more'}
                                </span>
                              </button>

                              {isSuspended ? (
                                <button
                                  type="button"
                                  onClick={() => handleActivate(book)}
                                  disabled={isBusy}
                                  className="px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10.5px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-0.5 shadow-2xs"
                                  title="Mở khóa sách"
                                >
                                  <span className="material-symbols-outlined text-[12px]">lock_open</span>
                                  <span>Mở</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSuspendModalBook(book);
                                    setSuspendReason('');
                                  }}
                                  disabled={isBusy}
                                  className="px-2 py-0.5 rounded-md bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-[10.5px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-0.5"
                                  title="Khóa sách vi phạm"
                                >
                                  <span className="material-symbols-outlined text-[12px]">lock</span>
                                  <span>Khóa</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Dòng thẻ chi tiết mở rộng (Expanded Detail Sub-Panel) */}
                      {isExpanded && (
                        <tr className="bg-emerald-50/20 border-b border-emerald-100/80 animate-in fade-in duration-200">
                          <td colSpan={7} className="p-4 sm:p-5">
                            <div className="bg-white rounded-2xl p-4.5 border border-emerald-200/70 shadow-xs space-y-4">
                              {/* 3 Cột Chi Tiết Đầy Đủ */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                {/* Cột 1: Xuất Bản & Định Danh */}
                                <div className="space-y-2 p-3 bg-gray-50/80 rounded-xl border border-gray-200/60">
                                  <span className="font-bold text-gray-900 flex items-center gap-1.5 text-[11.5px] uppercase tracking-wider text-emerald-900">
                                    <span className="material-symbols-outlined text-[15px] text-emerald-700">menu_book</span>
                                    Thông Tin Xuất Bản
                                  </span>
                                  <div className="space-y-1 text-gray-600 text-[11.5px]">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Tác giả:</span>
                                      <span className="font-semibold text-gray-800">{book.author?.name || 'Chưa rõ'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">NXB / Phát hành:</span>
                                      <span className="font-semibold text-gray-800">{book.publisher?.name || 'HUKI Sàn'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Mã ISBN:</span>
                                      <span className="font-mono font-bold text-gray-800">{book.isbn || '978-604-x-xxxx'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Ngôn ngữ:</span>
                                      <span className="text-gray-800">{book.language || 'Tiếng Việt'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Cột 2: Phân Phối & Bản Quyền */}
                                <div className="space-y-2 p-3 bg-gray-50/80 rounded-xl border border-gray-200/60">
                                  <span className="font-bold text-gray-900 flex items-center gap-1.5 text-[11.5px] uppercase tracking-wider text-emerald-900">
                                    <span className="material-symbols-outlined text-[15px] text-emerald-700">security</span>
                                    Phân Phối &amp; Bản Quyền
                                  </span>
                                  <div className="space-y-1 text-gray-600 text-[11.5px]">
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Định dạng bán:</span>
                                      <span className="font-semibold text-gray-800">{formatLabel}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Bảo vệ DRM:</span>
                                      <span className="font-semibold text-emerald-700">
                                        {book.format === 'DIGITAL' || book.format === 'BOTH' ? '✓ Mã hóa AES-256' : 'Không áp dụng'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Giá bìa gốc:</span>
                                      <span className="font-mono text-gray-500 line-through">
                                        {(book.originalPrice || Math.round((book.price || 100000) * 1.3)).toLocaleString('vi-VN')} đ
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Tồn kho khả dụng:</span>
                                      <span className="font-bold text-gray-900">
                                        {book.format === 'DIGITAL' ? 'Vô hạn Ebook' : `${book.physicalDetails?.stock ?? 0} cuốn`}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Cột 3: Gian Hàng & Pháp Lý */}
                                <div className="space-y-2 p-3 bg-gray-50/80 rounded-xl border border-gray-200/60">
                                  <span className="font-bold text-gray-900 flex items-center gap-1.5 text-[11.5px] uppercase tracking-wider text-emerald-900">
                                    <span className="material-symbols-outlined text-[15px] text-emerald-700">store</span>
                                    Gian Hàng &amp; Pháp Lý
                                  </span>
                                  <div className="space-y-1 text-gray-600 text-[11.5px]">
                                    <div className="flex justify-between items-start gap-2">
                                      <span className="text-gray-400 shrink-0">Đối tác bán:</span>
                                      <span className="font-semibold text-gray-800 break-words text-right">
                                        {book.business?.name || book.storeName || 'Đối tác ủy quyền'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Business ID:</span>
                                      <span className="font-mono text-[10px] text-gray-500">
                                        {book.businessId ? `${book.businessId.slice(0, 12)}...` : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Tình trạng duyệt:</span>
                                      <span className="font-semibold text-emerald-700">Đạt chuẩn chính sách</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-400">Cập nhật lúc:</span>
                                      <span className="font-mono text-gray-500">
                                        {book.updatedAt ? new Date(book.updatedAt).toLocaleDateString('vi-VN') : 'Mới nhất'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Tác vụ hành động nhanh */}
                              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/book/${book.id}`}
                                    target="_blank"
                                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold flex items-center gap-1.5 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                                    <span>Xem trang người mua</span>
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBook(book)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <span className="material-symbols-outlined text-[15px]">edit_note</span>
                                    <span>Xem toàn bộ hồ sơ</span>
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  {isSuspended ? (
                                    <button
                                      type="button"
                                      onClick={() => handleActivate(book)}
                                      disabled={isBusy}
                                      className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">lock_open</span>
                                      <span>Mở Khóa Phát Hành</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSuspendModalBook(book);
                                        setSuspendReason('');
                                      }}
                                      disabled={isBusy}
                                      className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[15px]">lock</span>
                                      <span>Khóa Vi Phạm Sách</span>
                                    </button>
                                  )}
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

        <AdminPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredBooks.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="ấn phẩm sách"
        />
      </AdminTableContainer>

      {/* 4. BOOK DETAIL IN-PAGE COLLAPSIBLE PANEL */}
      {selectedBook && (
        <div ref={bookDetailRef} className="mt-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-emerald-500/20 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Header */}
          <div className="pb-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <span className="material-symbols-outlined text-[20px]">menu_book</span>
              </span>
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Chi Tiết Tác Phẩm: {selectedBook.title}
                </h2>
                <p className="text-xs text-gray-500 font-mono">Mã: {selectedBook.id}</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedBook(null)}
              className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              ✕ Đóng bảng
            </button>
          </div>

          {/* Body */}
          <div className="space-y-5 text-xs">
            {/* Cover & Main Info */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row gap-4">
              <div className="w-24 h-32 rounded-xl bg-white border border-gray-300 overflow-hidden shrink-0 shadow-xs mx-auto sm:mx-0">
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
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${((STATUS_CONFIG as any)[selectedBook.status?.toUpperCase()] || STATUS_CONFIG.DRAFT).badge}`}>
                    {((STATUS_CONFIG as any)[selectedBook.status?.toUpperCase()] || STATUS_CONFIG.DRAFT).label}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-xl text-[10px] font-bold border ${((FORMAT_CONFIG as any)[selectedBook.format] || FORMAT_CONFIG.PHYSICAL).color}`}>
                    {((FORMAT_CONFIG as any)[selectedBook.format] || FORMAT_CONFIG.PHYSICAL).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MÔ TẢ NỘI DUNG</span>
              <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-gray-100">
                {selectedBook.description || 'Chưa có thông tin mô tả cho cuốn sách này.'}
              </p>
            </div>

            {/* Pricing & Stock Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">GIÁ BÁN NIÊM YẾT</span>
                <span className="font-bold text-base text-gray-900">
                  {selectedBook.price ? `${selectedBook.price.toLocaleString('vi-VN')} đ` : '0 đ'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">TỒN KHO VẬT LÝ</span>
                <span className="font-bold text-base text-gray-900">
                  {selectedBook.format === 'DIGITAL' ? 'Ebook' : `${selectedBook.physicalDetails?.stock ?? 0} cuốn`}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col gap-1 col-span-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">DOANH NGHIỆP PHÁT HÀNH</span>
                <span className="font-mono text-gray-700">{selectedBook.businessId || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              onClick={() => setSelectedBook(null)}
              className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
            >
              Đóng
            </button>

            {selectedBook.status === 'SUSPENDED' ? (
              <button
                onClick={() => handleActivate(selectedBook)}
                disabled={actionLoadingId === selectedBook.id}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-xs"
              >
                Mở khóa phát hành
              </button>
            ) : (
              <button
                onClick={() => {
                  setSuspendModalBook(selectedBook);
                  setSuspendReason('');
                  setSuspendReasonError('');
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all shadow-xs"
              >
                Khóa sách vi phạm
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. SUSPEND BOOK IN-PAGE FORM */}
      {suspendModalBook && (
        <div
          ref={suspendFormRef}
          className="mt-6 bg-white rounded-3xl p-6 sm:p-8 shadow-sm border-2 border-rose-300 animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-center justify-between border-b border-rose-100 pb-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">lock</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Khóa Phát Hành Sách Vi Phạm</h3>
                <p className="text-xs text-slate-500">Ấn phẩm: <strong>{suspendModalBook.title}</strong> (ID: {suspendModalBook.id})</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSuspendModalBook(null);
                setSuspendReason('');
                setSuspendReasonError('');
              }}
              className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          <div className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl text-xs text-rose-900 mt-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-rose-600 shrink-0">info</span>
            <span>Sau khi bị khóa, cuốn sách sẽ bị ẩn hoàn toàn khỏi Storefront và độc giả không thể tìm kiếm hay mua sách.</span>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Lý do khóa phát hành <span className="text-rose-500">*</span>:
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do khóa vi phạm chính sách nền tảng..."
                value={suspendReason}
                onChange={(e: any) => {
                  setSuspendReason(e.target.value);
                  if (suspendReasonError) setSuspendReasonError('');
                }}
                className={`w-full p-3.5 rounded-xl bg-slate-50 border text-sm text-slate-800 focus:outline-none transition-all resize-none ${
                  suspendReasonError
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                    : 'border-slate-200 focus:border-rose-500 focus:bg-white'
                }`}
              />
              {suspendReasonError && (
                <p className="text-xs text-rose-500 mt-1.5 flex items-center gap-1 font-medium animate-in fade-in">
                  <span className="material-symbols-outlined text-[14px]">error</span>
                  <span>{suspendReasonError}</span>
                </p>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-500 font-medium mb-1.5 block">Chọn mẫu lý do nhanh:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  'Vi phạm bản quyền tác giả hoặc giấy phép xuất bản',
                  'Nội dung không phù hợp tiêu chuẩn kiểm duyệt nội dung sàn',
                  'Thông tin sách, giá bìa hoặc mô tả sai lệch nghiêm trọng',
                  'Nhận được khiếu nại tranh chấp bản quyền hợp lệ từ đối tác',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setSuspendReason(preset);
                      if (suspendReasonError) setSuspendReasonError('');
                    }}
                    className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-transparent text-slate-700 font-medium transition-all cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={() => {
                  setSuspendModalBook(null);
                  setSuspendReason('');
                  setSuspendReasonError('');
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspend}
                disabled={actionLoadingId === suspendModalBook.id}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-lg">lock</span>
                <span>{actionLoadingId === suspendModalBook.id ? 'Đang xử lý...' : 'Xác Nhận Khóa Sách'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminBooksView;
