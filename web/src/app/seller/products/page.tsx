"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { catalogApi, BookFormat } from '@/ui/api/catalogApi';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';
import { businessApi } from '@/ui/api/businessApi';
import { aiAudioService, AiAudioPlan, BookAiSubscription } from '@/ui/services/aiAudioService';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { can, PERMISSIONS } from '@/ui/utils/permissions';
import GroupedDataTable, { Column } from '@/ui/components/common/GroupedDataTable';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerActionButton,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';
import {
  DataTableFilterBar,
  DateFilterValue,
  matchesDateFilter,
  BulkActionGroup,
} from '@/ui/components/common';

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
  isAffiliateEligible?: boolean;
  affiliateSetting?: {
    isEligible: boolean;
    customRate?: number | null;
  } | null;
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
  const [selectedAffiliateFilter, setSelectedAffiliateFilter] = useState<'ALL' | 'AFFILIATE_ON' | 'AFFILIATE_OFF'>('ALL');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
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
    enableAffiliate: boolean;
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
    enableAffiliate: false,
  });
  const [isSavingBook, setIsSavingBook] = useState(false);
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  // AI Audio Subscriptions & Plans
  const [aiSubscriptionsMap, setAiSubscriptionsMap] = useState<Record<string, BookAiSubscription>>({});
  const [aiPlans, setAiPlans] = useState<AiAudioPlan[]>([]);
  const [subscribingBook, setSubscribingBook] = useState<SellerBookItem | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [aiPaymentMethod, setAiPaymentMethod] = useState<'WALLET' | 'PAYOS' | 'QR_TRANSFER'>('WALLET');
  const [isSubscribingAi, setIsSubscribingAi] = useState<boolean>(false);
  const [isCreateDropdownOpen, setIsCreateDropdownOpen] = useState<boolean>(false);
  const createDropdownRef = React.useRef<HTMLDivElement>(null);

  // Standard Multi-tier Date Filter & Bulk Actions State
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({ mode: 'ALL_TIME' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBooks.length && filteredBooks.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBooks.map((b) => b.id));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (createDropdownRef.current && !createDropdownRef.current.contains(event.target as Node)) {
        setIsCreateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleExpandProduct = (id: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Load books & AI audio subscriptions from backend
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

      const [res, subs] = await Promise.all([
        catalogApi.getSellerBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) }),
        aiAudioService.getSubscriptions().catch(() => []),
      ]);

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

      // Build map of active subscriptions
      const map: Record<string, BookAiSubscription> = {};
      if (Array.isArray(subs)) {
        subs.forEach((s) => {
          if (s.bookId && s.status === 'ACTIVE') {
            map[s.bookId] = s;
          }
        });
      }
      setAiSubscriptionsMap(map);
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

  // Load categories & AI Plans
  useEffect(() => {
    catalogApi.getCategories().then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setCategories(res.data as CategoryOption[]);
      }
    }).catch(() => {});

    aiAudioService.getPlans().then((plans) => {
      const activeList = plans.filter((p) => p.status === 'ACTIVE');
      setAiPlans(activeList);
      if (activeList.length > 0) {
        setSelectedPlanId(activeList[0].id);
      }
    }).catch(() => {});
  }, []);

  const handleRegisterAiVoice = async () => {
    if (!subscribingBook || !selectedPlanId) return;
    setIsSubscribingAi(true);
    try {
      const currentBizId = user?.business?.id || activeBusinessId || 'default-store';
      const currentBizName = user?.business?.name || 'Gian hàng HUKI';
      await aiAudioService.registerBookSubscription({
        bookId: subscribingBook.id,
        bookTitle: subscribingBook.title,
        coverUrl: subscribingBook.coverUrl || subscribingBook.coverImage || subscribingBook.cover,
        storeId: currentBizId,
        storeName: currentBizName,
        planId: selectedPlanId,
        paymentMethod: aiPaymentMethod,
      });
      showToast?.(`Kích hoạt thành công gói Giọng đọc AI cho "${subscribingBook.title}"!`, 'success');
      setSubscribingBook(null);
      await loadBooks();
    } catch (err: any) {
      console.error('Lỗi đăng ký gói AI:', err);
      showToast?.(`Lỗi đăng ký gói: ${err?.message || 'Vui lòng thử lại sau'}`, 'error');
    } finally {
      setIsSubscribingAi(false);
    }
  };

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
      enableAffiliate: Boolean(book.isAffiliateEligible || book.affiliateSetting?.isEligible),
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
        enableAffiliate: bookFormData.enableAffiliate,
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
        if (currentBizId) {
          try {
            await affiliateApi.updateBookAffiliateSetting(currentBizId, editingBook.id, {
              isEligible: bookFormData.enableAffiliate,
            });
          } catch { /* ignore fallback */ }
        }

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

      // Affiliate filter
      if (selectedAffiliateFilter === 'AFFILIATE_ON') {
        const isAff = Boolean(b.isAffiliateEligible || b.affiliateSetting?.isEligible);
        if (!isAff) return false;
      } else if (selectedAffiliateFilter === 'AFFILIATE_OFF') {
        const isAff = Boolean(b.isAffiliateEligible || b.affiliateSetting?.isEligible);
        if (isAff) return false;
      }

      // Stock filter
      if (selectedStockFilter !== 'ALL') {
        const stock = b.physicalDetails?.stock ?? 0;
        if (selectedStockFilter === 'IN_STOCK') {
          // Có sẵn dồi dào: Sách giấy > 10 cuốn hoặc Ebook
          if (b.format !== 'DIGITAL' && stock <= 10) return false;
        } else if (selectedStockFilter === 'LOW_STOCK') {
          // Sắp hết kho: Sách giấy từ 1 đến 10 cuốn
          if (b.format === 'DIGITAL' || stock <= 0 || stock > 10) return false;
        } else if (selectedStockFilter === 'OUT_OF_STOCK') {
          // Hết hàng: stock = 0 và không phải chỉ Ebook
          if (b.format === 'DIGITAL' || stock > 0) return false;
        }
      }

      // Multi-tier Date Filter
      if (!matchesDateFilter(b.createdAt, dateFilter)) {
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
  }, [books, searchQuery, selectedFormat, selectedAffiliateFilter, selectedStockFilter, activeTab, dateFilter]);

  const totalPages = Math.ceil(filteredBooks.length / pageSize) || 1;
  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, currentPage, pageSize]);

  // Bulk action groups definition
  const productBulkActionGroups: BulkActionGroup[] = [
    {
      groupLabel: 'TIẾN TRÌNH PHÁT HÀNH',
      actions: [
        { value: 'PUBLISH_ALL', label: 'Xuất bản hàng loạt (Công khai)' },
        { value: 'HIDE_ALL', label: 'Tạm ẩn hàng loạt (Ẩn khỏi sàn)' },
      ],
    },
    {
      groupLabel: 'TIẾP THỊ LIÊN KẾT (AFFILIATE)',
      actions: [
        { value: 'AFFILIATE_ENABLE_ALL', label: 'Bật Affiliate hàng loạt (Cho phép tiếp thị)' },
        { value: 'AFFILIATE_DISABLE_ALL', label: 'Tắt Affiliate hàng loạt (Dừng tiếp thị)' },
      ],
    },
    {
      groupLabel: 'XUẤT DỮ LIỆU',
      actions: [{ value: 'EXPORT_CSV', label: 'Xuất danh sách sách (.csv)' }],
    },
  ];

  const handleExecuteBulkAction = async (actionValue: string) => {
    if (selectedIds.length === 0) return;
    setBulkLoading(true);
    try {
      if (actionValue === 'PUBLISH_ALL') {
        let count = 0;
        for (const id of selectedIds) {
          try {
            const res = await catalogApi.publishBook(id);
            if (res.success) count++;
          } catch {}
        }
        showToast?.(`Đã xuất bản thành công ${count} đầu sách!`, 'success');
        setSelectedIds([]);
        void loadBooks();
      } else if (actionValue === 'HIDE_ALL') {
        let count = 0;
        for (const id of selectedIds) {
          try {
            const res = await catalogApi.hideBook(id);
            if (res.success) count++;
          } catch {}
        }
        showToast?.(`Đã tạm ẩn ${count} đầu sách khỏi sàn!`, 'success');
        setSelectedIds([]);
        void loadBooks();
      } else if (actionValue === 'AFFILIATE_ENABLE_ALL') {
        const storeId = currentBizId || 'default-store';
        const res = await affiliateApi.bulkUpdateBooksAffiliate(storeId, {
          bookIds: selectedIds,
          isEligible: true,
        });
        if (res.success || res.data) {
          showToast?.(`Đã bật Tiếp thị liên kết (Affiliate) cho ${selectedIds.length} đầu sách!`, 'success');
        } else {
          showToast?.(res.error?.message || 'Không thể cập nhật Affiliate hàng loạt.', 'error');
        }
        setSelectedIds([]);
        void loadBooks();
      } else if (actionValue === 'AFFILIATE_DISABLE_ALL') {
        const storeId = currentBizId || 'default-store';
        const res = await affiliateApi.bulkUpdateBooksAffiliate(storeId, {
          bookIds: selectedIds,
          isEligible: false,
        });
        if (res.success || res.data) {
          showToast?.(`Đã tắt Tiếp thị liên kết (Affiliate) cho ${selectedIds.length} đầu sách!`, 'success');
        } else {
          showToast?.(res.error?.message || 'Không thể cập nhật Affiliate hàng loạt.', 'error');
        }
        setSelectedIds([]);
        void loadBooks();
      } else if (actionValue === 'EXPORT_CSV') {
        const rows = books.filter((b) => selectedIds.includes(b.id));
        const headers = ['ID,Tên sách,Tác giả,Định dạng,Giá bán,Tồn kho,Affiliate,Trạng thái,Ngày tạo'];
        const csvContent =
          'data:text/csv;charset=utf-8,\uFEFF' +
          headers
            .concat(
              rows.map(
                (r) =>
                  `"${r.id}","${(r.title || '').replace(/"/g, '""')}","${(typeof r.author === 'string' ? r.author : r.author?.name || '').replace(/"/g, '""')}","${r.format || ''}",${r.price || 0},${r.physicalDetails?.stock ?? 0},"${Boolean(r.isAffiliateEligible || r.affiliateSetting?.isEligible) ? 'Bật' : 'Tắt'}","${r.status || ''}","${r.createdAt || ''}"`
              )
            )
            .join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `danh_sach_san_pham_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast?.(`Đã xuất CSV cho ${rows.length} tựa sách!`, 'success');
      }
    } catch {
      showToast?.('Có lỗi xảy ra trong quá trình thực hiện hàng loạt.', 'error');
    } finally {
      setBulkLoading(false);
    }
  };

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


  const productColumns: Column<SellerBookItem>[] = useMemo(
    () => [
      {
        key: 'book',
        title: 'Sản Phẩm & Bìa Sách',
        minWidth: 260,
        render: (_val, book) => {
          const cover = book.coverUrl || book.coverImage || book.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80';
          return (
            <div className="flex items-center gap-3 py-1">
              <img
                src={cover}
                alt={book.title}
                className="w-9 h-12 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0 bg-slate-100"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80';
                }}
              />
              <div className="min-w-0">
                <span
                  title={book.title}
                  className="font-bold text-slate-900 hover:text-[#00875A] block break-words line-clamp-2 leading-snug transition-colors text-xs"
                >
                  {book.title}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-slate-400 font-mono">
                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                    #{book.id.substring(0, 6).toUpperCase()}
                  </span>
                  {book.category?.name && (
                    <span className="text-slate-500 font-sans">
                      · {book.category.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: 'author',
        title: 'Tác Giả & NXB',
        width: 180,
        render: (_val, book) => {
          const authorName = typeof book.author === 'string' ? book.author : book.author?.name || 'Chưa cập nhật';
          const publisherName = typeof book.publisher === 'string' ? book.publisher : book.publisher?.name || 'Tự xuất bản';
          return (
            <div className="py-1 text-xs">
              <span className="font-semibold text-slate-800 block break-words line-clamp-1">{authorName}</span>
              <span className="text-[10.5px] text-slate-400 mt-0.5 block break-words line-clamp-1">{publisherName}</span>
            </div>
          );
        },
      },
      {
        key: 'format',
        title: 'Định Dạng & Tồn Kho',
        width: 190,
        render: (_val, book) => {
          const stock = book.physicalDetails?.stock ?? 0;
          const isLowStock = book.format !== 'DIGITAL' && stock > 0 && stock < 10;
          const isOutOfStock = book.format !== 'DIGITAL' && stock === 0;

          return (
            <div className="py-1 flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1.5 flex-wrap">
                {book.format === 'PHYSICAL' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                    <span className="material-symbols-outlined text-xs">menu_book</span>
                    <span>Sách Giấy</span>
                  </span>
                )}
                {book.format === 'DIGITAL' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                    <span className="material-symbols-outlined text-xs">devices</span>
                    <span>Ebook DRM</span>
                  </span>
                )}
                {book.format === 'BOTH' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                    <span className="material-symbols-outlined text-xs">auto_stories</span>
                    <span>Combo</span>
                  </span>
                )}

                {Boolean(book.isAffiliateEligible || book.affiliateSetting?.isEligible) && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
                    <span className="material-symbols-outlined text-[12px] text-amber-600">campaign</span>
                    <span>Affiliate</span>
                  </span>
                )}
              </div>
              <div className="text-[11px]">
                {book.format === 'DIGITAL' ? (
                  <span className="text-purple-600 font-semibold text-[10.5px]">DRM Vô hạn</span>
                ) : isOutOfStock ? (
                  <span className="text-rose-600 font-bold text-[10.5px]">Hết hàng (0)</span>
                ) : isLowStock ? (
                  <span className="text-amber-700 font-bold text-[10.5px]">Còn {stock} cuốn</span>
                ) : (
                  <span className="text-slate-600 font-medium text-[10.5px]">{stock.toLocaleString('vi-VN')} cuốn</span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        key: 'price',
        title: 'Giá Bán',
        width: 150,
        render: (_val, book) => (
          <div className="py-1">
            <span className="font-bold text-slate-900 block text-xs">
              {Number(book.price ?? 0).toLocaleString('vi-VN')} ₫
            </span>
            {Boolean(book.originalPrice && book.originalPrice > (book.price ?? 0)) && (
              <span className="text-[10.5px] text-slate-400 line-through block mt-0.5">
                {Number(book.originalPrice).toLocaleString('vi-VN')} ₫
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        title: 'Trạng Thái & Thao Tác',
        width: 250,
        align: 'right',
        render: (_val, book) => {
          const isBusy = actionLoadingId === book.id;
          return (
            <div className="flex items-center justify-end gap-1.5 flex-wrap">
              <SellerStatusBadge status={book.status || 'DRAFT'} />

              {canUpdateProduct && (
                <>
                  <Link href={`/seller/product/${book.id}/edit`}>
                    <SellerActionButton
                      variant="primary"
                      size="sm"
                      label="Sửa"
                      icon="edit"
                      disabled={isBusy}
                    />
                  </Link>

                  <SellerActionButton
                    variant="neutral"
                    size="sm"
                    label="Nhanh"
                    icon="tune"
                    disabled={isBusy}
                    onClick={() => openEditForm(book)}
                  />

                  {(book.status === 'PUBLISHED' || book.status === 'HIDDEN') && (
                    <button
                      type="button"
                      onClick={() => handleVisibility(book)}
                      disabled={isBusy}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      title={book.status === 'PUBLISHED' ? 'Tạm ẩn sách' : 'Mở bán sách'}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {book.status === 'PUBLISHED' ? 'visibility_off' : 'visibility'}
                      </span>
                      <span>{book.status === 'PUBLISHED' ? 'Ẩn' : 'Hiện'}</span>
                    </button>
                  )}
                </>
              )}
            </div>
          );
        },
      },
    ],
    [canUpdateProduct, actionLoadingId]
  );

  const renderExpandedBookDetail = (book: SellerBookItem) => {
    const isPhysical = book.format === 'PHYSICAL' || book.format === 'BOTH';
    return (
      <div className="flex flex-col gap-4 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Kho & Kích thước */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#00875A]">inventory_2</span>
              <span>Kho Hàng & Quy Cách</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Tồn kho khả dụng:</span>
                <span className="font-bold text-slate-900">{isPhysical ? `${book.physicalDetails?.stock ?? 0} cuốn` : 'Không giới hạn (Ebook)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Trọng lượng bưu kiện:</span>
                <span className="font-mono text-slate-800">{book.physicalDetails?.weight ? `${book.physicalDetails.weight}g` : 'Tiêu chuẩn (300g)'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kích thước đóng gói:</span>
                <span className="font-mono text-slate-800">
                  {book.physicalDetails?.length && book.physicalDetails?.width ? `${book.physicalDetails.length}x${book.physicalDetails.width}x${book.physicalDetails.height || 2} cm` : '14x20x2 cm'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Giá & Tiếp thị Affiliate */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
              <span className="material-symbols-outlined text-[15px] text-amber-600">campaign</span>
              <span>Giá Bán & Tiếp Thị Affiliate</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Giá bán thực tế:</span>
                <span className="font-bold text-[#00875A] font-mono">{Number(book.price ?? 0).toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Giá bìa niêm yết:</span>
                <span className="font-mono text-slate-600">{Number(book.originalPrice ?? book.price ?? 0).toLocaleString('vi-VN')} ₫</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Chương trình Affiliate:</span>
                <span className="font-semibold text-amber-800">
                  {book.isAffiliateEligible || book.affiliateSetting?.isEligible ? `Bật ${book.affiliateSetting?.customRate ? `(${book.affiliateSetting.customRate}%)` : ''}` : 'Chưa bật'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Thao tác & Điều hướng */}
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
                <span className="material-symbols-outlined text-[15px] text-indigo-600">tune</span>
                <span>Thao Tác Quản Lý</span>
              </div>
              <p className="text-[11.5px] text-slate-500 mt-2 leading-relaxed">
                Chỉnh sửa toàn bộ thông tin mô tả, ảnh bìa, mục lục hoặc xem giao diện trang sách trên sàn.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 flex-wrap">
              <Link
                href={`/seller/product/${book.id}/edit`}
                className="px-3 py-1.5 rounded-lg bg-[#00875A] hover:bg-[#00704A] text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Sửa Đầy Đủ</span>
              </Link>
              <Link
                href={`/books/${book.id}`}
                target="_blank"
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                <span>Xem Trang Sách</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
            <div className="relative inline-flex items-center" ref={createDropdownRef}>
              {/* Nút bấm chính: Bấm vào là điều hướng thẳng tới form tạo sách */}
              <Link
                href="/seller/product/create-hybrid"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-l-xl text-xs font-bold bg-[#00875A] hover:bg-[#00704A] text-white shadow-sm transition-all border-r border-emerald-600/50"
              >
                <span className="material-symbols-outlined text-[17px]">add_circle</span>
                <span>+ Thêm Sản Phẩm Mới</span>
              </Link>

              {/* Nút mũi tên mở danh sách định dạng */}
              <button
                type="button"
                onClick={() => setIsCreateDropdownOpen((prev) => !prev)}
                className="inline-flex items-center justify-center w-8 py-1.5 rounded-r-xl text-xs font-bold bg-[#00875A] hover:bg-[#00704A] text-white shadow-sm transition-all cursor-pointer"
                title="Chọn định dạng sách cần tạo"
              >
                <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isCreateDropdownOpen ? 'rotate-180' : ''}`}>
                  keyboard_arrow_down
                </span>
              </button>

              {/* Dropdown Options */}
              {isCreateDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Chọn Định Dạng Ấn Phẩm
                  </div>

                  <Link
                    href="/seller/product/create-hybrid"
                    onClick={() => setIsCreateDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-900 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg text-emerald-600">auto_stories</span>
                    <div>
                      <div className="font-bold text-slate-900">Đăng Combo Sách + Ebook</div>
                      <div className="text-[10px] text-slate-500 font-normal">Gói Hybrid đồng bộ cả 2 ấn phẩm (Khuyên dùng)</div>
                    </div>
                  </Link>

                  <Link
                    href="/seller/product/create-physical"
                    onClick={() => setIsCreateDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-amber-50 hover:text-amber-900 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg text-amber-600">inventory_2</span>
                    <div>
                      <div className="font-bold text-slate-900">Đăng Sách Giấy</div>
                      <div className="text-[10px] text-slate-500 font-normal">Quản lý kho vật lý &amp; kích thước cân nặng</div>
                    </div>
                  </Link>

                  <Link
                    href="/seller/product/create-ebook"
                    onClick={() => setIsCreateDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-purple-50 hover:text-purple-900 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg text-purple-600">menu_book</span>
                    <div>
                      <div className="font-bold text-slate-900">Đăng Ebook Kỹ Thuật Số</div>
                      <div className="text-[10px] text-slate-500 font-normal">Cấp quyền đọc số, mã hóa DRM &amp; Giọng đọc AI</div>
                    </div>
                  </Link>
                </div>
              )}
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
            <div className="flex items-center gap-2">
              <Link
                href={`/seller/products/${editingBook.id}/edit`}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-2xs"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                <span>Mở Trang Sửa Chi Tiết (Đầy Đủ &amp; Xác Thực)</span>
              </Link>
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
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

            {/* Tiếp thị liên kết (Affiliate) Toggle */}
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-amber-600">campaign</span>
                  <span>Tiếp Thị Liên Kết (Affiliate)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Cho phép đối tác / KOC nhận link giới thiệu và quảng bá tựa sách này để nhận hoa hồng.
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-emerald-800">
                  <input
                    type="radio"
                    name="quickEditAffiliate"
                    checked={bookFormData.enableAffiliate === true}
                    onChange={() => setBookFormData((prev) => ({ ...prev, enableAffiliate: true }))}
                    className="w-4 h-4 text-[#00875A] focus:ring-[#00875A]"
                  />
                  <span>Bật Affiliate</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-600">
                  <input
                    type="radio"
                    name="quickEditAffiliate"
                    checked={bookFormData.enableAffiliate === false}
                    onChange={() => setBookFormData((prev) => ({ ...prev, enableAffiliate: false }))}
                    className="w-4 h-4 text-slate-500 focus:ring-slate-400"
                  />
                  <span>Tắt Affiliate</span>
                </label>
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

      {/* 4. FILTER BAR VỚI 2 SELECT THỜI GIAN & THAO TÁC HÀNG LOẠT TRÊN THANH LỌC */}
      <DataTableFilterBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(key) => {
          setActiveTab(key);
          setCurrentPage(1);
        }}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Tìm tên sách, slug..."
        className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs"
        extraFilters={
          <div className="flex flex-wrap items-center gap-2">
            {/* Format Filter */}
            <select
              value={selectedFormat}
              onChange={(e) => {
                setSelectedFormat(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">Mọi Định Dạng</option>
              <option value="PHYSICAL">Sách Giấy</option>
              <option value="DIGITAL">Ebook DRM</option>
              <option value="BOTH">Combo Sách + Ebook</option>
            </select>

            {/* Affiliate Filter */}
            <select
              value={selectedAffiliateFilter}
              onChange={(e) => {
                setSelectedAffiliateFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">Tất Cả Affiliate</option>
              <option value="AFFILIATE_ON">Đã bật Affiliate</option>
              <option value="AFFILIATE_OFF">Chưa bật Affiliate</option>
            </select>

            {/* Stock Quantity Filter */}
            <select
              value={selectedStockFilter}
              onChange={(e) => {
                setSelectedStockFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="h-9 px-3 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value="ALL">Mọi Mức Tồn Kho</option>
              <option value="IN_STOCK">Còn Dồi Dào (&gt; 10)</option>
              <option value="LOW_STOCK">Sắp Hết Kho (1 - 10)</option>
              <option value="OUT_OF_STOCK">Đã Hết Hàng (0)</option>
            </select>
          </div>
        }
        bulkActionGroups={productBulkActionGroups}
        selectedCount={selectedIds.length}
        totalCount={filteredBooks.length}
        onExecuteBulkAction={handleExecuteBulkAction}
        onClearSelection={() => setSelectedIds([])}
        bulkLoading={bulkLoading}
        itemName="đầu sách"
      />

      {/* 5. PRODUCTS TABLE LIST CHUẨN HÓA GROUPED DATA TABLE */}
      <GroupedDataTable<SellerBookItem>
        columns={productColumns}
        data={paginatedBooks}
        keyField="id"
        loading={loading}
        selectable={true}
        selectedRowKeys={selectedIds}
        onSelectionChange={(keys) => setSelectedIds(keys as string[])}
        expandable={true}
        expandedRowKeys={Array.from(expandedProductIds)}
        onExpandedRowsChange={(keys) => setExpandedProductIds(new Set(keys as string[]))}
        expandedRowRender={renderExpandedBookDetail}
        emptyTitle="Chưa có sản phẩm nào phù hợp"
        emptyMessage={
          searchQuery
            ? `Không tìm thấy đầu sách nào trùng khớp với từ khóa "${searchQuery}"`
            : 'Hiện chưa có đầu sách nào trong danh mục hoặc bộ lọc này.'
        }
        emptyIcon="auto_stories"
        pagination={{
          currentPage,
          totalPages,
          totalItems: filteredBooks.length,
          pageSize: 10,
          onPageChange: setCurrentPage,
          itemLabel: 'đầu sách',
        }}
        className="w-full"
      />
    </div>
  );
}
