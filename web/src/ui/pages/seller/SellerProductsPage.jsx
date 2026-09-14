import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalogApi } from '../../api/catalogApi';
import { businessApi } from '../../api/businessApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { can, PERMISSIONS } from '../../utils/permissions';

export default function SellerProductsPage() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [stockReason, setStockReason] = useState('MANUAL_ADJUSTMENT');

  const currentBizId = user?.business?.id || activeBusinessId;
  const canViewProduct = can(PERMISSIONS.PRODUCT_VIEW, currentBizId, user);
  const canUpdateProduct = can(PERMISSIONS.PRODUCT_UPDATE, currentBizId, user);
  const canUpdateInventory = can(PERMISSIONS.INVENTORY_UPDATE, currentBizId, user);

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
      if (res.success && Array.isArray(res.data)) {
        const sellerBooks = bizId
          ? res.data.filter(b => b.businessId === bizId || b.business?.id === bizId)
          : res.data;
        setBooks(sellerBooks);
      } else {
        setBooks([]);
      }
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

  const [editingStockBook, setEditingStockBook] = useState(null);
  const [stockInput, setStockInput] = useState(0);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);

  // Handle Publish Book
  const handlePublish = async (bookId, title) => {
    setActionLoadingId(bookId);
    try {
      const res = await catalogApi.publishBook(bookId);
      if (res.success) {
        showToast(`Đã xuất bản thành công sách "${title}"!`, 'success');
        await loadBooks();
      } else {
        showToast(res.error?.message || 'Không thể xuất bản sách.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi xuất bản sách.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleVisibility = async (book) => {
    setActionLoadingId(book.id);
    try {
      const res = book.status === 'PUBLISHED'
        ? await catalogApi.hideBook(book.id)
        : await catalogApi.publishBook(book.id);
      if (res.success) {
        showToast(book.status === 'PUBLISHED' ? `Đã tạm ẩn sách "${book.title}".` : `Đã mở bán sách "${book.title}".`, 'success');
        await loadBooks();
      } else {
        showToast(res.error?.message || 'Không thể thay đổi trạng thái sách.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi thay đổi trạng thái sách.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Quick Inventory Update
  const openStockModal = (book) => {
    setEditingStockBook(book);
    setStockInput(book.physicalDetails?.stock ?? 0);
    setStockReason('MANUAL_ADJUSTMENT');
  };

  const handleSaveStock = async (e) => {
    if (e) e.preventDefault();
    if (!editingStockBook) return;
    const newStock = Number(stockInput);
    if (isNaN(newStock) || newStock < 0) {
      showToast('Số lượng tồn kho không hợp lệ!', 'error');
      return;
    }

    setIsUpdatingStock(true);
    try {
      const res = await catalogApi.updateInventory(editingStockBook.id, newStock, stockReason);
      if (res.success || res.data) {
        showToast(`Đã cập nhật tồn kho sách "${editingStockBook.title}" thành ${newStock} cuốn!`, 'success');
        setEditingStockBook(null);
        await loadBooks();
      } else {
        showToast(res.error?.message || 'Không thể cập nhật tồn kho.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi cập nhật tồn kho.', 'error');
    } finally {
      setIsUpdatingStock(false);
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

  const fmtCurrency = (val) => {
    if (!val || isNaN(val)) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  if (!canViewProduct) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-4 border border-amber-500/20 shadow-xs">
          <span className="material-symbols-outlined text-3xl">lock</span>
        </div>
        <h2 className="text-xl font-bold font-editorial text-theme-on-surface mb-2">
          Không Có Quyền Truy Cập (403 Forbidden)
        </h2>
        <p className="text-xs sm:text-sm text-theme-on-surface-variant max-w-md mb-6">
          Tài khoản nhân viên của bạn chưa được cấp quyền xem danh mục sản phẩm (`PRODUCT_VIEW`).
        </p>
        <Link
          to="/seller/dashboard"
          className="px-4 py-2.5 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary/90 transition-all shadow-sm"
        >
          Quay lại Bảng Điều Khiển
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/seller/dashboard" className="text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Kênh Người Bán</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700 text-xs">/</span>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Kho Sản Phẩm</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Quản Lý Sản Phẩm Đang Bán
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Xem danh mục tất cả đầu sách, trạng thái kiểm duyệt, giá niêm yết và tồn kho thực tế từ Database.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => loadBooks()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <span className={`material-symbols-outlined text-base ${loading ? 'animate-spin' : ''}`}>refresh</span>
            <span className="hidden sm:inline">Làm Mới</span>
          </button>

          {can(PERMISSIONS.PRODUCT_CREATE, user?.business?.id || activeBusinessId, user) && (
            <div className="relative group">
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs sm:text-sm transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">add_circle</span>
                <span>+ Thêm Sản Phẩm Mới</span>
                <span className="material-symbols-outlined text-sm">expand_more</span>
              </button>

              {/* Dropdown Options */}
              <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-30 hidden group-hover:block transition-all">
                <Link
                  to="/seller/product/create-physical"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-amber-600">inventory_2</span>
                  <div>
                    <div className="font-bold">Đăng Sách Giấy</div>
                    <div className="text-[10px] text-slate-400 font-normal">Quản lý kho vật lý &amp; kích thước</div>
                  </div>
                </Link>
                <Link
                  to="/seller/product/create-ebook"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-purple-600">menu_book</span>
                  <div>
                    <div className="font-bold">Đăng Ebook Kỹ Thuật Số</div>
                    <div className="text-[10px] text-slate-400 font-normal">Cấp quyền số &amp; bảo vệ DRM</div>
                  </div>
                </Link>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <Link
                  to="/seller/product/create-hybrid"
                  className="flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-emerald-600">auto_stories</span>
                  <div>
                    <div className="font-bold">Đăng Combo Sách + Ebook</div>
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
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Tổng Đầu Sách</span>
              <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {loading ? '…' : metrics.total}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">library_books</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Tất cả ấn phẩm trong gian hàng
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Đang Bán Công Khai</span>
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {loading ? '…' : metrics.published}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">store</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 font-bold">
            Hiển thị cho độc giả toàn sàn
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Bản Nháp (Chưa Bán)</span>
              <div className="text-xl sm:text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
                {loading ? '…' : metrics.draft}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">edit_note</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 font-medium">
            Có thể bấm &quot;Xuất bản ngay&quot;
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500">Tổng Tồn Kho Sách Giấy</span>
              <div className="text-xl sm:text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
                {loading ? '…' : metrics.totalStock.toLocaleString('vi-VN')}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-lg">warehouse</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            {metrics.digitalCount} tựa có phiên bản Ebook DRM
          </div>
        </div>
      </div>

      {/* 3. FILTER TABS & SEARCH BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {[
              { key: 'ALL', label: 'Tất Cả', count: metrics.total },
              { key: 'PUBLISHED', label: 'Đang Bán', count: metrics.published },
              { key: 'DRAFT', label: 'Bản Nháp', count: metrics.draft },
              { key: 'LOW_STOCK', label: 'Sắp Hết Kho', count: metrics.lowStock + metrics.outOfStock },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  activeTab === tab.key
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search & Format Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* Format Filter */}
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Mọi Định Dạng</option>
              <option value="PHYSICAL">Sách Giấy</option>
              <option value="DIGITAL">Ebook DRM</option>
              <option value="BOTH">Combo Sách + Ebook</option>
            </select>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên sách, slug..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-sm cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. PRODUCTS TABLE LIST */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <div className="text-xs font-bold text-slate-500">Đang tải danh mục sách từ máy chủ...</div>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-20 px-4 text-center max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">auto_stories</span>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Chưa có sản phẩm nào phù hợp</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {searchQuery || selectedFormat !== 'ALL' || activeTab !== 'ALL'
                  ? 'Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc để xem đầy đủ.'
                  : 'Bắt đầu xuất bản cuốn sách đầu tiên của bạn lên hệ sinh thái HUKI Ebook ngay!'}
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <Link
                to="/seller/product/create-physical"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all"
              >
                + Đăng Sách Mới
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Sản Phẩm &amp; Bìa</th>
                  <th className="py-3.5 px-3">Định Dạng</th>
                  <th className="py-3.5 px-3">Giá Bán</th>
                  <th className="py-3.5 px-3">Tồn Kho</th>
                  <th className="py-3.5 px-3">Trạng Thái</th>
                  <th className="py-3.5 px-3">Ngày Tạo</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                {filteredBooks.map((book) => {
                  const cover = book.coverUrl || book.coverImage || book.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80';
                  const isPublished = book.status === 'PUBLISHED';
                  const isDraft = book.status === 'DRAFT' || !book.status;
                  const stock = book.physicalDetails?.stock ?? 0;
                  const isLowStock = book.format !== 'DIGITAL' && stock > 0 && stock < 10;
                  const isOutOfStock = book.format !== 'DIGITAL' && stock === 0;

                  return (
                    <tr key={book.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      
                      {/* Product & Cover */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={cover}
                            alt={book.title}
                            className="w-10 h-14 object-cover rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0 bg-slate-100"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80';
                            }}
                          />
                          <div className="min-w-0 max-w-xs sm:max-w-md">
                            <Link
                              to={`/books/${book.id}`}
                              target="_blank"
                              title={book.title}
                              className="font-bold text-slate-900 dark:text-white hover:text-emerald-700 dark:hover:text-emerald-400 line-clamp-2 transition-colors leading-snug break-words text-xs"
                            >
                              {book.title}
                            </Link>
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium cursor-help" title={`ID: ${book.id}`}>
                                #{book.id.substring(0, 6).toUpperCase()}
                              </span>
                              {book.slug && (
                                <span className="truncate max-w-[140px] text-slate-400 cursor-help" title={`Slug: ${book.slug}`}>
                                  · {book.slug}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Format */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {book.format === 'PHYSICAL' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-[11px] border border-amber-200/60 dark:border-amber-800/50">
                            <span className="material-symbols-outlined text-xs">menu_book</span>
                            <span>Sách Giấy</span>
                          </span>
                        )}
                        {book.format === 'DIGITAL' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-[11px] border border-purple-200/60 dark:border-purple-800/50">
                            <span className="material-symbols-outlined text-xs">phonelink</span>
                            <span>Ebook DRM</span>
                          </span>
                        )}
                        {book.format === 'BOTH' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold text-[11px] border border-emerald-200/60 dark:border-emerald-800/50">
                            <span className="material-symbols-outlined text-xs">auto_stories</span>
                            <span>Combo</span>
                          </span>
                        )}
                        {!book.format && (
                          <span className="text-slate-400 text-[11px]">Chưa xác định</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {book.price != null && !isNaN(Number(book.price))
                          ? Number(book.price).toLocaleString('vi-VN') + ' ₫'
                          : '0 ₫'}
                      </td>

                      {/* Stock */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {book.format === 'DIGITAL' ? (
                          <span className="text-purple-600 font-bold text-[11px] flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">all_inclusive</span>
                            <span>Ebook DRM</span>
                          </span>
                        ) : isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>Hết hàng (0)</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 font-bold text-[11px]">
                            <span className="material-symbols-outlined text-xs">warning</span>
                            <span>Còn {stock} cuốn</span>
                          </span>
                        ) : (
                          <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {stock.toLocaleString('vi-VN')} cuốn
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Đang Bán</span>
                          </span>
                        ) : isDraft ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/50 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Bản Nháp</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[11px]">
                            <span>{book.status}</span>
                          </span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-3 text-slate-400 text-[11px] whitespace-nowrap">
                        {book.createdAt ? new Date(book.createdAt).toLocaleDateString('vi-VN') : 'Hôm nay'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {book.format !== 'DIGITAL' && canUpdateInventory && (
                            <button
                              type="button"
                              onClick={() => openStockModal(book)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="Cập nhật số lượng tồn kho"
                            >
                              <span className="material-symbols-outlined text-sm text-amber-600">inventory</span>
                              <span className="hidden sm:inline">Sửa kho</span>
                            </button>
                          )}

                          {canUpdateProduct && (book.status === 'PUBLISHED' || book.status === 'HIDDEN') && (
                            <button
                              type="button"
                              onClick={() => handleVisibility(book)}
                              disabled={actionLoadingId === book.id}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title={book.status === 'PUBLISHED' ? 'Tạm ẩn khỏi sàn' : 'Mở bán lại'}
                            >
                              <span className="material-symbols-outlined text-sm">{book.status === 'PUBLISHED' ? 'visibility_off' : 'visibility'}</span>
                              <span>{book.status === 'PUBLISHED' ? 'Ẩn' : 'Mở bán'}</span>
                            </button>
                          )}

                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handlePublish(book.id, book.title)}
                              disabled={actionLoadingId === book.id}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              title="Xuất bản sách công khai lên sàn"
                            >
                              {actionLoadingId === book.id ? (
                                <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                              ) : (
                                <span className="material-symbols-outlined text-xs">publish</span>
                              )}
                              <span>Xuất Bản</span>
                            </button>
                          )}

                          <Link
                            to={`/books/${book.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shadow-2xs"
                            title="Xem trên sàn HUKI"
                          >
                            <span className="material-symbols-outlined text-base">open_in_new</span>
                          </Link>
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

      {/* 5. QUICK INVENTORY ADJUSTMENT MODAL */}
      {editingStockBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                  Điều chỉnh kho vật lý
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                  {editingStockBook.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setEditingStockBook(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Số lượng tồn kho thực tế (cuốn)
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">inventory_2</span>
                  <input
                    type="number"
                    min="0"
                    max="99999"
                    value={stockInput}
                    onChange={(e) => setStockInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                    placeholder="Nhập số lượng tồn kho..."
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tồn kho hiện tại: <strong>{editingStockBook.physicalDetails?.stock ?? 0}</strong> cuốn.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Lý do điều chỉnh
                </label>
                <select
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  required
                >
                  <option value="MANUAL_ADJUSTMENT">Kiểm kê / điều chỉnh thủ công</option>
                  <option value="CORRECTION">Sửa sai lệch dữ liệu</option>
                  <option value="DAMAGED">Sách hư hỏng</option>
                  <option value="RETURNED">Hàng khách trả lại</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStockBook(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStock}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isUpdatingStock ? (
                    <>
                      <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-xs">check</span>
                      <span>Lưu tồn kho</span>
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
