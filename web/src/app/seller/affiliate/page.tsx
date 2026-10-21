"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { businessApi } from '@/ui/api/businessApi';
import { affiliateApi } from '@/lib/affiliate/affiliateApi';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerActionButton,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';
import {
  DataTableFilterBar,
  BulkActionGroup,
} from '@/ui/components/common';
import GroupedDataTable, { type Column } from '@/ui/components/common/GroupedDataTable';

interface StoreOption {
  id: string;
  name: string;
  status: string;
}

interface SellerDashboardData {
  storeId: string;
  metrics: {
    totalAttributedOrders: number;
    totalAttributedRevenue: number;
    totalCommissionCost: number;
    pendingCommissionCost: number;
    settledCommissionCost: number;
    currency: string;
  };
  topBooks: Array<{
    bookId: string;
    bookTitle: string;
    coverUrl?: string | null;
    format?: string;
    price?: number;
    ordersCount: number;
    revenue: number;
    commissionCost: number;
  }>;
  version: string;
  refreshedAt: string;
}

export default function SellerAffiliatePage() {
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loadingStores, setLoadingStores] = useState<boolean>(true);

  // Active Tab: 'DASHBOARD' | 'BOOKS' | 'SETTINGS'
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'BOOKS' | 'SETTINGS'>('DASHBOARD');

  // Dashboard Stats State (Real DB - No Mock)
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);
  const [dashboardData, setDashboardData] = useState<SellerDashboardData | null>(null);
  const [exportingReport, setExportingReport] = useState<boolean>(false);

  // Top Books Filter & Pagination State
  const [topSearch, setTopSearch] = useState<string>('');
  const [topFormatFilter, setTopFormatFilter] = useState<string>('');
  const [topSortTab, setTopSortTab] = useState<'REVENUE' | 'ORDERS' | 'COMMISSION'>('REVENUE');
  const [topPage, setTopPage] = useState<number>(1);

  // Store Settings State
  const [storeSettingsLoading, setStoreSettingsLoading] = useState<boolean>(false);
  const [storeSettingsSaving, setStoreSettingsSaving] = useState<boolean>(false);
  const [storeSetting, setStoreSetting] = useState<{
    isEnabled: boolean;
    autoEnrollNewBooks: boolean;
    physicalRate: number | null;
    ebookRate: number | null;
    audioRate: number | null;
  }>({
    isEnabled: true,
    autoEnrollNewBooks: true,
    physicalRate: null,
    ebookRate: null,
    audioRate: null,
  });

  const [platformPolicy, setPlatformPolicy] = useState<{
    id: string;
    name: string;
    defaultPhysicalRate: number;
    defaultEbookRate: number;
    defaultAudioRate: number;
    minRate: number;
    maxPhysicalRate: number;
    maxDigitalRate: number;
  }>({
    id: 'default',
    name: 'Chính sách sàn mặc định',
    defaultPhysicalRate: 5,
    defaultEbookRate: 10,
    defaultAudioRate: 10,
    minRate: 1,
    maxPhysicalRate: 30,
    maxDigitalRate: 50,
  });

  // Books Catalog State
  const [booksLoading, setBooksLoading] = useState<boolean>(false);
  const [books, setBooks] = useState<any[]>([]);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [search, setSearch] = useState<string>('');
  const [formatFilter, setFormatFilter] = useState<string>('');
  const [eligibilityFilter, setEligibilityFilter] = useState<'ELIGIBLE' | 'INELIGIBLE'>('ELIGIBLE');

  // Bulk Selection State
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState<boolean>(false);

  // Single Edit Modal State
  const [editingBook, setEditingBook] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{
    isEligible: boolean;
    customRate: string;
    notes: string;
  }>({
    isEligible: true,
    customRate: '',
    notes: '',
  });
  const [savingBookSetting, setSavingBookSetting] = useState<boolean>(false);

  // Bulk Custom Rate Modal State
  const [bulkRateModalOpen, setBulkRateModalOpen] = useState<boolean>(false);
  const [bulkCustomRate, setBulkCustomRate] = useState<string>('');

  // Net Revenue Calculator State
  const [previewModalBook, setPreviewModalBook] = useState<any | null>(null);

  // 1. Fetch stores belonging to current seller
  useEffect(() => {
    let cancelled = false;
    const fetchStores = async () => {
      setLoadingStores(true);
      const bizId = user?.business?.id || activeBusinessId;
      if (!bizId) {
        setLoadingStores(false);
        return;
      }
      try {
        const res = await businessApi.getMyStores(bizId);
        if (!cancelled && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const validStores = res.data.map((s: any) => ({
            id: s.id,
            name: s.name,
            status: s.status,
          }));
          setStores(validStores);
          setSelectedStoreId(validStores[0].id);
        }
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Lỗi tải cửa hàng',
          message: err.message || 'Không thể tải danh sách cửa hàng.',
        });
      } finally {
        if (!cancelled) setLoadingStores(false);
      }
    };

    fetchStores();
    return () => {
      cancelled = true;
    };
  }, [user, activeBusinessId, showToast]);

  // 2. Fetch Store Affiliate Settings
  const loadStoreSettings = useCallback(async (storeId: string) => {
    if (!storeId) return;
    setStoreSettingsLoading(true);
    try {
      const res = await affiliateApi.getStoreAffiliateSettings(storeId);
      if (res.success && res.data) {
        setStoreSetting({
          isEnabled: res.data.storeSetting.isEnabled ?? true,
          autoEnrollNewBooks: res.data.storeSetting.autoEnrollNewBooks ?? true,
          physicalRate: res.data.storeSetting.physicalRate,
          ebookRate: res.data.storeSetting.ebookRate,
          audioRate: res.data.storeSetting.audioRate,
        });
        if (res.data.platformPolicy) {
          setPlatformPolicy(res.data.platformPolicy);
        }
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi tải cài đặt gian hàng',
        message: err.message || 'Không thể tải thiết lập affiliate của gian hàng.',
      });
    } finally {
      setStoreSettingsLoading(false);
    }
  }, [showToast]);

  // 3. Fetch Store Books with Affiliate Information
  const loadStoreBooks = useCallback(async (storeId: string) => {
    if (!storeId) return;
    setBooksLoading(true);
    try {
      const params: any = {
        page,
        limit: 10,
      };
      if (search.trim()) params.search = search.trim();
      if (formatFilter && formatFilter !== 'ALL') params.format = formatFilter;
      if (eligibilityFilter === 'ELIGIBLE') {
        params.isEligible = true;
        params.eligibility = 'ELIGIBLE';
      } else {
        params.isEligible = false;
        params.eligibility = 'INELIGIBLE';
      }

      const res = await affiliateApi.listStoreAffiliateBooks(storeId, params);
      if (res.success && res.data) {
        const responseData = res.data;
        const normalizedItems = (responseData.items || []).map((item: any) => ({
          ...item,
          id: item.id || item.bookId,
          bookId: item.bookId || item.id,
          coverUrl: item.coverUrl || item.coverImage || item.cover,
          coverImage: item.coverImage || item.coverUrl || item.cover,
          sellerNetBreakdown: item.sellerNetBreakdown || item.netPreview,
        }));
        setBooks(normalizedItems);
        setTotalBooks(responseData.total || 0);
        setTotalPages(responseData.totalPages || 1);
        if (responseData.caps) {
          const caps = responseData.caps;
          setPlatformPolicy(prev => ({
            ...prev,
            ...caps,
          }));
        }
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi tải danh mục sách',
        message: err.message || 'Không thể tải danh sách sách liên kết.',
      });
    } finally {
      setBooksLoading(false);
    }
  }, [page, search, formatFilter, eligibilityFilter, showToast]);

  // 4. Fetch Seller Affiliate Dashboard Stats (Real DB Data - No Mock)
  const loadDashboard = useCallback(async (storeId: string) => {
    if (!storeId) return;
    setDashboardLoading(true);
    try {
      const res = await affiliateApi.getSellerDashboard(storeId);
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err: any) {
      console.error('Lỗi tải báo cáo hiệu quả tiếp thị:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  // Handle Export Report CSV
  const handleExportReport = async () => {
    if (!selectedStoreId) return;
    setExportingReport(true);
    try {
      const csv = await affiliateApi.exportSellerReport(selectedStoreId, 'csv');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `affiliate-report-${selectedStoreId}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast({
        type: 'success',
        title: 'Xuất báo cáo thành công',
        message: 'File báo cáo tiếp thị liên kết đã được tải về.',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi xuất báo cáo',
        message: err.message || 'Không thể tải file báo cáo.',
      });
    } finally {
      setExportingReport(false);
    }
  };

  useEffect(() => {
    if (selectedStoreId) {
      if (activeTab === 'DASHBOARD') {
        loadDashboard(selectedStoreId);
      } else if (activeTab === 'SETTINGS') {
        loadStoreSettings(selectedStoreId);
      } else if (activeTab === 'BOOKS') {
        loadStoreBooks(selectedStoreId);
      }
    }
  }, [selectedStoreId, activeTab, loadDashboard, loadStoreSettings, loadStoreBooks]);

  // Handle Save Store Settings
  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId) return;

    // Validate Platform Caps
    if (storeSetting.physicalRate !== null && storeSetting.physicalRate !== undefined) {
      if (storeSetting.physicalRate < platformPolicy.minRate || storeSetting.physicalRate > platformPolicy.maxPhysicalRate) {
        showToast({
          type: 'warning',
          title: 'Tỷ lệ sách giấy ngoài giới hạn',
          message: `Tỷ lệ hoa hồng sách giấy phải từ ${platformPolicy.minRate}% đến ${platformPolicy.maxPhysicalRate}%.`,
        });
        return;
      }
    }

    if (storeSetting.ebookRate !== null && storeSetting.ebookRate !== undefined) {
      if (storeSetting.ebookRate < platformPolicy.minRate || storeSetting.ebookRate > platformPolicy.maxDigitalRate) {
        showToast({
          type: 'warning',
          title: 'Tỷ lệ sách số ngoài giới hạn',
          message: `Tỷ lệ hoa hồng sách số phải từ ${platformPolicy.minRate}% đến ${platformPolicy.maxDigitalRate}%.`,
        });
        return;
      }
    }

    if (storeSetting.audioRate !== null && storeSetting.audioRate !== undefined) {
      if (storeSetting.audioRate < platformPolicy.minRate || storeSetting.audioRate > platformPolicy.maxDigitalRate) {
        showToast({
          type: 'warning',
          title: 'Tỷ lệ sách nói ngoài giới hạn',
          message: `Tỷ lệ hoa hồng sách nói phải từ ${platformPolicy.minRate}% đến ${platformPolicy.maxDigitalRate}%.`,
        });
        return;
      }
    }

    setStoreSettingsSaving(true);
    try {
      const res = await affiliateApi.updateStoreAffiliateSettings(selectedStoreId, {
        isEnabled: storeSetting.isEnabled,
        autoEnrollNewBooks: storeSetting.autoEnrollNewBooks,
        physicalRate: storeSetting.physicalRate === null || isNaN(Number(storeSetting.physicalRate)) ? null : Number(storeSetting.physicalRate),
        ebookRate: storeSetting.ebookRate === null || isNaN(Number(storeSetting.ebookRate)) ? null : Number(storeSetting.ebookRate),
        audioRate: storeSetting.audioRate === null || isNaN(Number(storeSetting.audioRate)) ? null : Number(storeSetting.audioRate),
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Thành công',
          message: 'Đã cập nhật chính sách tiếp thị của gian hàng!',
        });
        loadStoreSettings(selectedStoreId);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Cập nhật thất bại',
        message: err.message || 'Không thể lưu cài đặt gian hàng.',
      });
    } finally {
      setStoreSettingsSaving(false);
    }
  };

  // Handle Edit Book Override
  const openEditBook = (book: any) => {
    setEditingBook(book);
    setEditForm({
      isEligible: book.isEligible,
      customRate: book.customRate !== null && book.customRate !== undefined ? String(book.customRate) : '',
      notes: book.notes || '',
    });
  };

  const handleSaveBookSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStoreId || !editingBook) return;

    let parsedCustomRate: number | null = null;
    if (editForm.customRate.trim() !== '') {
      parsedCustomRate = Number(editForm.customRate);
      const isDigital = editingBook.format !== 'PHYSICAL';
      const maxCap = isDigital ? platformPolicy.maxDigitalRate : platformPolicy.maxPhysicalRate;

      if (isNaN(parsedCustomRate) || parsedCustomRate < platformPolicy.minRate || parsedCustomRate > maxCap) {
        showToast({
          type: 'warning',
          title: 'Tỷ lệ hoa hồng không hợp lệ',
          message: `Tỷ lệ hoa hồng cho định dạng này phải từ ${platformPolicy.minRate}% đến ${maxCap}%.`,
        });
        return;
      }
    }

    setSavingBookSetting(true);
    try {
      const bookIdToUpdate = editingBook.id || editingBook.bookId;
      const res = await affiliateApi.updateBookAffiliateSetting(selectedStoreId, bookIdToUpdate, {
        isEligible: editForm.isEligible,
        customRate: parsedCustomRate,
        notes: editForm.notes.trim() || null,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Đã lưu',
          message: `Cập nhật cấu hình hoa hồng cho sách "${editingBook.title}" thành công.`,
        });
        setEditingBook(null);
        loadStoreBooks(selectedStoreId);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi cập nhật sách',
        message: err.message || 'Không thể cập nhật cấu hình sách.',
      });
    } finally {
      setSavingBookSetting(false);
    }
  };

  // Handle Bulk Selection
  const handleToggleSelectAll = () => {
    if (selectedBookIds.length === books.length) {
      setSelectedBookIds([]);
    } else {
      setSelectedBookIds(books.map(b => b.bookId));
    }
  };

  const handleToggleSelectBook = (bookId: string) => {
    setSelectedBookIds(prev =>
      prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]
    );
  };

  // Handle Bulk Eligibility Toggle
  const handleBulkEligibility = async (isEligible: boolean) => {
    if (!selectedStoreId || selectedBookIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await affiliateApi.bulkUpdateBooksAffiliate(selectedStoreId, {
        bookIds: selectedBookIds,
        isEligible,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Cập nhật hàng loạt thành công',
          message: `Đã ${isEligible ? 'bật' : 'tắt'} hoa hồng cho ${res.data?.updatedCount || selectedBookIds.length} cuốn sách.`,
        });
        setSelectedBookIds([]);
        loadStoreBooks(selectedStoreId);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi cập nhật hàng loạt',
        message: err.message || 'Không thể thực hiện cập nhật hàng loạt.',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Handle Bulk Custom Rate Save
  const handleBulkRateSave = async () => {
    if (!selectedStoreId || selectedBookIds.length === 0) return;
    const rate = Number(bulkCustomRate);
    if (isNaN(rate) || rate < platformPolicy.minRate || rate > platformPolicy.maxPhysicalRate) {
      showToast({
        type: 'warning',
        title: 'Tỷ lệ hàng loạt ngoài giới hạn',
        message: `Tỷ lệ hàng loạt áp dụng phải từ ${platformPolicy.minRate}% đến ${platformPolicy.maxPhysicalRate}%.`,
      });
      return;
    }

    setBulkActionLoading(true);
    try {
      const res = await affiliateApi.bulkUpdateBooksAffiliate(selectedStoreId, {
        bookIds: selectedBookIds,
        customRate: rate,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: 'Thiết lập tỷ lệ thành công',
          message: `Đã cập nhật mức ${rate}% cho ${res.data?.updatedCount || selectedBookIds.length} cuốn sách.`,
        });
        setBulkRateModalOpen(false);
        setBulkCustomRate('');
        setSelectedBookIds([]);
        loadStoreBooks(selectedStoreId);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Lỗi áp dụng tỷ lệ hàng loạt',
        message: err.message || 'Không thể lưu tỷ lệ hàng loạt.',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const selectedStore = useMemo(() => {
    return stores.find(s => s.id === selectedStoreId) || null;
  }, [stores, selectedStoreId]);

  // Filtered & Sorted Top Books
  const filteredTopBooks = useMemo(() => {
    const list = dashboardData?.topBooks || [];
    let result = list.filter((item) => {
      if (topSearch.trim()) {
        const q = topSearch.toLowerCase().trim();
        const matchTitle = (item.bookTitle || '').toLowerCase().includes(q);
        const matchId = (item.bookId || '').toLowerCase().includes(q);
        if (!matchTitle && !matchId) return false;
      }
      if (topFormatFilter && item.format !== topFormatFilter) {
        return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (topSortTab === 'ORDERS') {
        return b.ordersCount - a.ordersCount;
      }
      if (topSortTab === 'COMMISSION') {
        return b.commissionCost - a.commissionCost;
      }
      return b.revenue - a.revenue;
    });

    return result;
  }, [dashboardData?.topBooks, topSearch, topFormatFilter, topSortTab]);

  const paginatedTopBooks = useMemo(() => {
    const start = (topPage - 1) * 10;
    return filteredTopBooks.slice(start, start + 10);
  }, [filteredTopBooks, topPage]);

  const topBooksColumns: Column[] = useMemo(() => [
    {
      key: 'rank',
      title: 'HẠNG',
      width: '75px',
      align: 'center',
      render: (_, __, idx) => {
        const rank = (topPage - 1) * 10 + idx + 1;
        if (rank === 1) {
          return (
            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs inline-flex items-center justify-center shadow-xs">
              🥇
            </span>
          );
        }
        if (rank === 2) {
          return (
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 border border-slate-300 font-black text-xs inline-flex items-center justify-center shadow-xs">
              🥈
            </span>
          );
        }
        if (rank === 3) {
          return (
            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-900 border border-orange-300 font-black text-xs inline-flex items-center justify-center shadow-xs">
              🥉
            </span>
          );
        }
        return (
          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[11px] inline-flex items-center justify-center">
            {rank}
          </span>
        );
      },
    },
    {
      key: 'product',
      title: 'ẤN PHẨM & ĐỊNH DẠNG',
      width: '45%',
      render: (_, item) => {
        const cover = item.coverUrl || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80';
        const formatLabel = item.format === 'PHYSICAL' ? 'Sách Giấy' : item.format === 'DIGITAL' ? 'Ebook DRM' : 'Combo';
        const formatBadgeClass = item.format === 'PHYSICAL'
          ? 'bg-amber-50 text-amber-800 border-amber-200/80'
          : item.format === 'DIGITAL'
          ? 'bg-purple-50 text-purple-800 border-purple-200/80'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200/80';

        return (
          <div className="flex items-center gap-3 py-1">
            <img
              src={cover}
              alt={item.bookTitle}
              className="w-10 h-13 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0 bg-slate-100"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80';
              }}
            />
            <div className="min-w-0 max-w-[340px]">
              <span className="font-bold text-slate-900 block truncate text-xs hover:text-[#00875A] transition-colors cursor-pointer" title={item.bookTitle}>
                {item.bookTitle}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold border ${formatBadgeClass}`}>
                  {formatLabel}
                </span>
                {item.price > 0 && (
                  <span className="text-[10.5px] text-slate-500 font-mono">
                    {Number(item.price).toLocaleString('vi-VN')} ₫
                  </span>
                )}
                <span className="text-[10px] text-slate-400 font-mono">
                  #{item.bookId.slice(0, 6).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'ordersCount',
      title: 'SỐ ĐƠN CHỐT',
      width: '15%',
      align: 'center',
      render: (val) => (
        <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md text-xs">
          <span className="material-symbols-outlined text-[13px] text-slate-500">shopping_cart</span>
          <span>{Number(val || 0).toLocaleString('vi-VN')} đơn</span>
        </span>
      ),
    },
    {
      key: 'revenue',
      title: 'DOANH THU MANG LẠI',
      width: '20%',
      align: 'right',
      render: (val) => (
        <span className="font-extrabold text-[#00875A] text-xs">
          {Number(val || 0).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
    {
      key: 'commissionCost',
      title: 'HOA HỒNG ĐÃ TRẢ',
      width: '18%',
      align: 'right',
      render: (val) => (
        <span className="font-bold text-amber-700 text-xs">
          {Number(val || 0).toLocaleString('vi-VN')} ₫
        </span>
      ),
    },
  ], [topPage]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-6 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-950/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-emerald-800 text-2xl">share_reviews</span>
            <h1 className="text-2xl font-black tracking-tight text-emerald-950 font-editorial">
              Chính Sách & Tiếp Thị Liên Kết (Affiliate)
            </h1>
          </div>
          <p className="text-sm text-slate-600">
            Quản lý tỷ lệ chiết khấu cho đối tác tiếp thị, thiết lập tính năng tự động ghi danh và giám sát doanh thu thực nhận.
          </p>
        </div>

        {/* Store Selector */}
        {stores.length > 0 && (
          <div className="flex items-center gap-3 bg-emerald-50/70 p-2.5 rounded-2xl border border-emerald-100">
            <span className="text-xs font-semibold text-emerald-900 whitespace-nowrap">Gian hàng:</span>
            <select
              aria-label="Chọn gian hàng"
              value={selectedStoreId}
              onChange={(e) => {
                setSelectedStoreId(e.target.value);
                setSelectedBookIds([]);
              }}
              className="bg-white text-xs font-bold text-slate-800 px-3 py-1.5 rounded-xl border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {stores.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Store Not Found Alert */}
      {!loadingStores && stores.length === 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-rose-900">
          <span className="material-symbols-outlined text-rose-600 text-xl">warning</span>
          <div>
            <span className="font-bold">Chưa tìm thấy gian hàng: </span>
            <span>Tài khoản của bạn chưa có gian hàng nào được kích hoạt. Vui lòng thiết lập hoặc kích hoạt gian hàng tại mục <a href="/seller/stores" className="underline font-bold text-rose-800">Quản lý gian hàng</a> trước khi cấu hình tiếp thị liên kết.</span>
          </div>
        </div>
      )}

      {/* Platform Cap Notice */}
      <div className="bg-amber-50/60 border border-amber-200/70 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-amber-700 text-xl">verified_user</span>
          <div>
            <span className="font-bold">Quy chuẩn hạn mức sàn (Platform Caps): </span>
            <span>Hoa hồng tối thiểu: {platformPolicy.minRate}%, Sách giấy tối đa: {platformPolicy.maxPhysicalRate}%, Sách số tối đa: {platformPolicy.maxDigitalRate}%.</span>
          </div>
        </div>
        <div className="text-[11px] font-semibold text-amber-800 bg-amber-100/70 px-2.5 py-1 rounded-lg self-end sm:self-auto">
          Phí nền tảng cố định: 10%
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'DASHBOARD'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">monitoring</span>
          Hiệu quả tiếp thị (Dashboard)
        </button>
        <button
          onClick={() => setActiveTab('BOOKS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'BOOKS'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">menu_book</span>
          Danh mục sách & Trạng thái hoa hồng ({totalBooks})
        </button>
        <button
          onClick={() => setActiveTab('SETTINGS')}
          className={`px-5 py-3 text-sm font-bold border-b-2 flex items-center gap-2 transition-all ${
            activeTab === 'SETTINGS'
              ? 'border-emerald-700 text-emerald-800 bg-emerald-50/40 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-lg">tune</span>
          Cấu hình gian hàng
        </button>
      </div>

      {/* TAB 1: DASHBOARD (HIỆU QUẢ TIẾP THỊ - DỮ LIỆU THẬT) */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          {/* Action bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-800">query_stats</span>
                Hiệu Quả Tiếp Thị Liên Kết Thực Tế
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng hợp đơn hàng và chi phí hoa hồng được hệ thống ghi nhận từ đối tác CTV/KOC cho gian hàng này.
              </p>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => selectedStoreId && loadDashboard(selectedStoreId)}
                disabled={dashboardLoading}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-sm ${dashboardLoading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>Làm mới</span>
              </button>
              <button
                type="button"
                onClick={handleExportReport}
                disabled={exportingReport || !selectedStoreId}
                className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
              >
                {exportingReport ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span className="material-symbols-outlined text-sm">download</span>
                )}
                <span>Xuất báo cáo (CSV)</span>
              </button>
            </div>
          </div>

          {dashboardLoading ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold">Đang tải số liệu báo cáo...</p>
            </div>
          ) : (
            <>
              {/* 4 Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Attributed Orders */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đơn hàng tiếp thị</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">shopping_bag</span>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {dashboardData?.metrics?.totalAttributedOrders || 0}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Đơn chốt thành công qua liên kết CTV
                  </p>
                </div>

                {/* Attributed Revenue */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Doanh thu qua Affiliate</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">payments</span>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    {Number(dashboardData?.metrics?.totalAttributedRevenue || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Tổng giá trị ấn phẩm bán ra từ liên kết
                  </p>
                </div>

                {/* Total Commission Cost */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng hoa hồng phát sinh</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">percent</span>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-950">
                    {Number(dashboardData?.metrics?.totalCommissionCost || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Đã quyết toán: {Number(dashboardData?.metrics?.settledCommissionCost || 0).toLocaleString('vi-VN')} đ
                  </p>
                </div>

                {/* Pending Commission */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hoa hồng chờ đối soát</span>
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">hourglass_top</span>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-indigo-950">
                    {Number(dashboardData?.metrics?.pendingCommissionCost || 0).toLocaleString('vi-VN')} đ
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Đang trong thời gian giữ hoặc chờ giao
                  </p>
                </div>
              </div>

              {/* Top Attributed Books */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-800">military_tech</span>
                      Top ấn phẩm bán chạy qua kênh Tiếp Thị Liên Kết
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bảng xếp hạng hiệu quả phân phối theo số đơn chốt, doanh thu thực nhận và hoa hồng tiếp thị
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 font-medium italic">
                    (Theo doanh thu thực nhận)
                  </span>
                </div>

                {/* Filter Bar for Top Books */}
                <DataTableFilterBar
                  tabs={[
                    { key: 'REVENUE', label: 'Doanh Thu Cao Nhất', count: filteredTopBooks.length },
                    { key: 'ORDERS', label: 'Số Đơn Chốt Nhiều Nhất' },
                    { key: 'COMMISSION', label: 'Hoa Hồng Đã Trả' },
                  ]}
                  activeTab={topSortTab}
                  onTabChange={(key) => {
                    setTopSortTab(key as any);
                    setTopPage(1);
                  }}
                  searchQuery={topSearch}
                  onSearchChange={(val) => {
                    setTopSearch(val);
                    setTopPage(1);
                  }}
                  searchPlaceholder="Tìm ấn phẩm trong bảng xếp hạng..."
                  className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 shadow-2xs"
                  extraFilters={
                    <select
                      value={topFormatFilter}
                      onChange={(e) => {
                        setTopFormatFilter(e.target.value);
                        setTopPage(1);
                      }}
                      className="h-9 px-3 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
                    >
                      <option value="">Mọi Định Dạng</option>
                      <option value="PHYSICAL">Sách Giấy</option>
                      <option value="DIGITAL">Ebook DRM</option>
                      <option value="BOTH">Combo Hybrid</option>
                    </select>
                  }
                />

                {/* Grouped Data Table */}
                <GroupedDataTable
                  columns={topBooksColumns}
                  data={paginatedTopBooks}
                  keyField="bookId"
                  loading={dashboardLoading}
                  emptyTitle="Chưa phát sinh đơn hàng qua Tiếp Thị Liên Kết"
                  emptyMessage="Khi các đối tác CTV/KOC chia sẻ liên kết và khách đặt mua thành công, số liệu sẽ được tổng hợp tự động tại đây."
                  emptyIcon="military_tech"
                  pagination={
                    filteredTopBooks.length > 10
                      ? {
                          currentPage: topPage,
                          totalItems: filteredTopBooks.length,
                          pageSize: 10,
                          onPageChange: setTopPage,
                          itemLabel: 'ấn phẩm',
                        }
                      : false
                  }
                  className="border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 1: STORE SETTINGS */}
      {activeTab === 'SETTINGS' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {storeSettingsLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
              <span className="w-8 h-8 border-3 border-emerald-700 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold">Đang tải cấu hình gian hàng...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveStoreSettings} className="space-y-8">
              {/* Main Switches */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/70 p-6 rounded-2xl border border-slate-200/60">
                {/* Enable Store Affiliate */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Mở chương trình Affiliate cho Shop</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Khi tắt, toàn bộ sách thuộc gian hàng sẽ tạm ngưng tiếp thị liên kết dù từng cuốn có bật hay không.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storeSetting.isEnabled}
                      onChange={(e) => setStoreSetting(prev => ({ ...prev, isEnabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Auto Enroll New Books */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Tự động ghi danh sách mới (Auto-enroll)</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Các ấn phẩm xuất bản mới trong tương lai sẽ tự động thừa hưởng tỷ lệ hoa hồng mặc định của shop.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storeSetting.autoEnrollNewBooks}
                      onChange={(e) => setStoreSetting(prev => ({ ...prev, autoEnrollNewBooks: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              </div>

              {/* Commission Rates By Format */}
              <div className="space-y-4">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-800">percent</span>
                  Tỷ lệ hoa hồng mặc định theo định dạng sách
                </h3>
                <p className="text-xs text-slate-600">
                  Nếu để trống, hệ thống sẽ sử dụng mức mặc định của sàn ({platformPolicy.defaultPhysicalRate}% sách giấy, {platformPolicy.defaultEbookRate}% sách số).
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  {/* Physical Rate */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Sách giấy (Physical)</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Tối đa {platformPolicy.maxPhysicalRate}%</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder={`Mặc định sàn (${platformPolicy.defaultPhysicalRate}%)`}
                        value={storeSetting.physicalRate === null || storeSetting.physicalRate === undefined ? '' : storeSetting.physicalRate}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          setStoreSetting(prev => ({ ...prev, physicalRate: val }));
                        }}
                        className="w-full text-sm font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Giới hạn hợp lệ: {platformPolicy.minRate}% - {platformPolicy.maxPhysicalRate}%</p>
                  </div>

                  {/* Ebook Rate */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Sách điện tử (Ebook)</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Tối đa {platformPolicy.maxDigitalRate}%</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder={`Mặc định sàn (${platformPolicy.defaultEbookRate}%)`}
                        value={storeSetting.ebookRate === null || storeSetting.ebookRate === undefined ? '' : storeSetting.ebookRate}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          setStoreSetting(prev => ({ ...prev, ebookRate: val }));
                        }}
                        className="w-full text-sm font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Giới hạn hợp lệ: {platformPolicy.minRate}% - {platformPolicy.maxDigitalRate}%</p>
                  </div>

                  {/* Audio Rate */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Sách nói (Audiobook)</span>
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Tối đa {platformPolicy.maxDigitalRate}%</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        placeholder={`Mặc định sàn (${platformPolicy.defaultAudioRate}%)`}
                        value={storeSetting.audioRate === null || storeSetting.audioRate === undefined ? '' : storeSetting.audioRate}
                        onChange={(e) => {
                          const val = e.target.value === '' ? null : Number(e.target.value);
                          setStoreSetting(prev => ({ ...prev, audioRate: val }));
                        }}
                        className="w-full text-sm font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Giới hạn hợp lệ: {platformPolicy.minRate}% - {platformPolicy.maxDigitalRate}%</p>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="submit"
                  disabled={storeSettingsSaving}
                  className="px-6 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {storeSettingsSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>{storeSettingsSaving ? 'Đang lưu...' : 'Lưu cấu hình gian hàng'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: BOOKS CATALOG & ELIGIBILITY */}
      {activeTab === 'BOOKS' && (
        <div className="space-y-4">
          {/* Standard Filter Bar with Status Tabs & Extra Filters */}
          <DataTableFilterBar
            tabs={[
              { key: 'ELIGIBLE', label: 'Đang Mở Tiếp Thị', count: eligibilityFilter === 'ELIGIBLE' ? totalBooks : undefined },
              { key: 'INELIGIBLE', label: 'Tạm Ngưng Hoa Hồng', count: eligibilityFilter === 'INELIGIBLE' ? totalBooks : undefined },
            ]}
            activeTab={eligibilityFilter}
            onTabChange={(key) => {
              setEligibilityFilter(key as 'ELIGIBLE' | 'INELIGIBLE');
              setPage(1);
            }}
            searchQuery={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            searchPlaceholder="Tìm theo tên sách, ISBN, slug..."
            className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs"
            extraFilters={
              <select
                aria-label="Lọc theo định dạng"
                value={formatFilter}
                onChange={(e) => {
                  setFormatFilter(e.target.value);
                  setPage(1);
                }}
                className="h-9 px-3 rounded-xl text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-neutral-300 focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">Mọi Định Dạng</option>
                <option value="PHYSICAL">Sách Giấy</option>
                <option value="DIGITAL">Sách Số (Ebook)</option>
                <option value="BOTH">Combo Hybrid</option>
              </select>
            }
            bulkActionGroups={[
              {
                groupLabel: 'TIẾN TRÌNH TIẾP THỊ',
                actions: [
                  { value: 'ENABLE_ALL', label: 'Bật hoa hồng hàng loạt' },
                  { value: 'PAUSE_ALL', label: 'Tạm ngưng hoa hồng hàng loạt' },
                  { value: 'SET_RATE', label: 'Đặt tỷ lệ hoa hồng chung' },
                ],
              },
            ]}
            selectedCount={selectedBookIds.length}
            totalCount={totalBooks}
            onExecuteBulkAction={(action) => {
              if (action === 'ENABLE_ALL') handleBulkEligibility(true);
              else if (action === 'PAUSE_ALL') handleBulkEligibility(false);
              else if (action === 'SET_RATE') setBulkRateModalOpen(true);
            }}
            onClearSelection={() => setSelectedBookIds([])}
            bulkLoading={bulkActionLoading}
            itemName="ấn phẩm"
          />

          {/* Standard Grouped Data Table */}
          <GroupedDataTable
            columns={[
              {
                key: 'product',
                title: 'SÁCH & ĐỊNH DẠNG',
                width: '38%',
                render: (_, book) => {
                  const cover = book.coverUrl || book.coverImage || book.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80';
                  const formatLabel = book.format === 'PHYSICAL' ? 'Sách giấy' : book.format === 'DIGITAL' ? 'Sách số' : 'Cả hai';

                  return (
                    <div className="flex items-center gap-3">
                      <img
                        src={cover}
                        alt={book.title}
                        className="w-10 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0 bg-slate-100"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="min-w-0 max-w-[280px]">
                        <p className="font-bold text-slate-900 line-clamp-1 text-xs" title={book.title}>
                          {book.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {formatLabel}
                          </span>
                          {book.isCustomRate && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              Tùy chỉnh riêng
                            </span>
                          )}
                          {book.id && (
                            <span className="text-[10px] font-mono text-slate-400">
                              #{book.id.substring(0, 6).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                },
              },
              {
                key: 'price',
                title: 'GIÁ BÁN',
                align: 'left',
                width: '14%',
                render: (_, book) => (
                  <span className="font-semibold text-slate-800 text-xs">
                    {Number(book.price || 0).toLocaleString('vi-VN')} đ
                  </span>
                ),
              },
              {
                key: 'status',
                title: 'TRẠNG THÁI AFFILIATE',
                align: 'center',
                width: '15%',
                render: (_, book) => (
                  book.isEligible ? (
                    <SellerStatusBadge variant="success" text="Đang mở" dot />
                  ) : (
                    <SellerStatusBadge variant="neutral" text="Tạm ngưng" dot />
                  )
                ),
              },
              {
                key: 'effectiveRate',
                title: 'TỶ LỆ HIỆU LỰC',
                align: 'center',
                width: '12%',
                render: (_, book) => (
                  <div className="flex flex-col items-center">
                    <span className="font-bold text-emerald-800 text-sm">
                      {book.effectiveRate}%
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {book.isCustomRate
                        ? 'Mức riêng'
                        : book.rateSource === 'STORE_FORMAT'
                        ? 'Theo shop'
                        : 'Mặc định sàn'}
                    </span>
                  </div>
                ),
              },
              {
                key: 'sellerNet',
                title: 'ƯỚC TÍNH THỰC NHẬN (SELLER-NET)',
                align: 'left',
                width: '18%',
                render: (_, book) => {
                  const breakdown = book.sellerNetBreakdown || book.netPreview;
                  const netRevenue = breakdown ? Number(breakdown.sellerNetRevenue || 0).toLocaleString('vi-VN') : '0';
                  const margin = breakdown ? breakdown.sellerNetMarginPercent || 0 : 0;

                  return (
                    <div className="flex items-center gap-1.5">
                      <div>
                        <span className="font-bold text-slate-900 text-xs">{netRevenue} đ</span>
                        <span className="text-[10.5px] text-slate-500 block">
                          (Tỷ suất: {margin}%)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewModalBook(book);
                        }}
                        title="Xem chi tiết phân rã chi phí"
                        className="text-slate-400 hover:text-emerald-700 p-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">info</span>
                      </button>
                    </div>
                  );
                },
              },
              {
                key: 'actions',
                title: 'THAO TÁC',
                align: 'right',
                width: '8%',
                render: (_, book) => (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditBook(book);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                  >
                    Chỉnh sửa
                  </button>
                ),
              },
            ]}
            data={books}
            keyField="id"
            loading={booksLoading}
            selectable={true}
            selectedRowKeys={selectedBookIds}
            onSelectionChange={(keys) => setSelectedBookIds(keys as string[])}
            pagination={{
              currentPage: page,
              totalPages: totalPages,
              totalItems: totalBooks,
              pageSize: 10,
              onPageChange: (newPage) => setPage(newPage),
              itemLabel: 'cuốn sách',
            }}
            emptyTitle={
              search || formatFilter
                ? 'Không tìm thấy ấn phẩm nào phù hợp'
                : eligibilityFilter === 'ELIGIBLE'
                ? 'Chưa có ấn phẩm nào bật Tiếp Thị Liên Kết'
                : 'Không có ấn phẩm nào bị tạm ngưng'
            }
            emptyMessage={
              search || formatFilter
                ? 'Vui lòng thử điều chỉnh lại từ khóa tìm kiếm hoặc bỏ bớt các tiêu chí lọc.'
                : eligibilityFilter === 'ELIGIBLE'
                ? 'Các sách được chọn "Bật Tiếp Thị Liên Kết" trong trang Đăng Sách sẽ tự động xuất hiện tại đây.'
                : 'Tất cả các sách đang hoạt động tiếp thị bình thường.'
            }
          />
        </div>
      )}

      {/* SINGLE BOOK EDIT MODAL */}
      {editingBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Cấu hình hoa hồng cho sách</h3>
              <button
                type="button"
                onClick={() => setEditingBook(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800 line-clamp-1">{editingBook.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Giá niêm yết: {Number(editingBook.price).toLocaleString('vi-VN')} đ | Định dạng: {editingBook.format}
              </p>
            </div>

            <form onSubmit={handleSaveBookSetting} className="space-y-4">
              {/* Eligibility Toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Tham gia tiếp thị liên kết</span>
                  <span className="text-[11px] text-slate-500">Tắt nếu không muốn sách này chia hoa hồng</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isEligible}
                    onChange={(e) => setEditForm(prev => ({ ...prev, isEligible: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Custom Rate Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Tỷ lệ hoa hồng riêng (%)</span>
                  <span className="text-[10px] text-slate-400">Để trống để kế thừa tỷ lệ shop</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    placeholder={`Kế thừa từ shop (${editingBook.effectiveRate}%)`}
                    value={editForm.customRate}
                    onChange={(e) => setEditForm(prev => ({ ...prev, customRate: e.target.value }))}
                    className="w-full text-sm font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Hạn mức: {platformPolicy.minRate}% đến {editingBook.format === 'PHYSICAL' ? platformPolicy.maxPhysicalRate : platformPolicy.maxDigitalRate}%
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Ghi chú nội bộ</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú lý do điều chỉnh tỷ lệ..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full text-xs font-medium px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBook(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={savingBookSetting}
                  className="px-5 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
                >
                  {savingBookSetting ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CUSTOM RATE MODAL */}
      {bulkRateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleIn">
            <h3 className="text-base font-black text-slate-900">Thiết lập tỷ lệ chung</h3>
            <p className="text-xs text-slate-600">
              Áp dụng tỷ lệ hoa hồng cố định cho {selectedBookIds.length} cuốn sách đã chọn.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">Tỷ lệ hoa hồng (%)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ví dụ: 8"
                  value={bulkCustomRate}
                  onChange={(e) => setBulkCustomRate(e.target.value)}
                  className="w-full text-sm font-semibold px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-700 focus:outline-none"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Phải nằm trong khoảng từ {platformPolicy.minRate}% đến {platformPolicy.maxPhysicalRate}%.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkRateModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={bulkActionLoading || !bulkCustomRate}
                onClick={handleBulkRateSave}
                className="px-5 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl shadow disabled:opacity-50"
              >
                {bulkActionLoading ? 'Đang áp dụng...' : 'Áp dụng cho tất cả'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELLER-NET BREAKDOWN PREVIEW MODAL */}
      {previewModalBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-800 text-xl">account_balance_wallet</span>
                <h3 className="text-base font-black text-slate-900">Phân rã doanh thu thực nhận</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalBook(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-900">{previewModalBook.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Công thức: Giá bán - Phí sàn (10%) - Hoa hồng Affiliate = Doanh thu thực nhận
              </p>
            </div>

            {previewModalBook.sellerNetBreakdown ? (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-3 text-xs">
                <div className="flex justify-between items-center text-slate-700">
                  <span>Giá niêm yết (Gross Price):</span>
                  <span className="font-bold">{Number(previewModalBook.sellerNetBreakdown.grossPrice).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center text-rose-700">
                  <span>Phí nền tảng ({previewModalBook.sellerNetBreakdown.platformFeePercent}%):</span>
                  <span className="font-semibold">- {Number(previewModalBook.sellerNetBreakdown.platformFeeAmount).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center text-amber-700">
                  <span>Hoa hồng Affiliate ({previewModalBook.sellerNetBreakdown.affiliateRatePercent}%):</span>
                  <span className="font-semibold">- {Number(previewModalBook.sellerNetBreakdown.affiliateCommissionAmount).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-emerald-900 text-sm font-black">
                  <span>Thực nhận (Seller Net):</span>
                  <span>{Number(previewModalBook.sellerNetBreakdown.sellerNetRevenue).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="text-right text-[11px] text-slate-500 font-semibold">
                  Tỷ suất lợi nhuận: {previewModalBook.sellerNetBreakdown.sellerNetMarginPercent}%
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Không có dữ liệu phân tích.</p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewModalBook(null)}
                className="px-5 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
