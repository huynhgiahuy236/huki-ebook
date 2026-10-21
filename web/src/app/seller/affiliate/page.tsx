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

interface StoreOption {
  id: string;
  name: string;
  status: string;
}

export default function SellerAffiliatePage() {
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [loadingStores, setLoadingStores] = useState<boolean>(true);

  // Active Tab: 'SETTINGS' | 'BOOKS'
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'BOOKS'>('SETTINGS');

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
  const [eligibilityFilter, setEligibilityFilter] = useState<string>('');

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
      if (formatFilter) params.format = formatFilter;
      if (eligibilityFilter !== '') params.isEligible = eligibilityFilter === 'true';

      const res = await affiliateApi.listStoreAffiliateBooks(storeId, params);
      if (res.success && res.data) {
        const responseData = res.data;
        setBooks(responseData.items || []);
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

  useEffect(() => {
    if (selectedStoreId) {
      if (activeTab === 'SETTINGS') {
        loadStoreSettings(selectedStoreId);
      } else {
        loadStoreBooks(selectedStoreId);
      }
    }
  }, [selectedStoreId, activeTab, loadStoreSettings, loadStoreBooks]);

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
      const res = await affiliateApi.updateBookAffiliateSetting(selectedStoreId, editingBook.bookId, {
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
      </div>

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
          {/* Filters Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-sm">
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
              <input
                type="text"
                placeholder="Tìm theo tên sách..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full text-xs font-medium pl-9 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                aria-label="Lọc định dạng"
                value={formatFilter}
                onChange={(e) => {
                  setFormatFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">Tất cả định dạng</option>
                <option value="PHYSICAL">Sách giấy</option>
                <option value="DIGITAL">Sách điện tử</option>
                <option value="BOTH">Cả hai</option>
              </select>

              <select
                aria-label="Lọc trạng thái hoa hồng"
                value={eligibilityFilter}
                onChange={(e) => {
                  setEligibilityFilter(e.target.value);
                  setPage(1);
                }}
                className="text-xs font-semibold px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="true">Đang mở hoa hồng</option>
                <option value="false">Tạm ngưng hoa hồng</option>
              </select>
            </div>
          </div>

          {/* Bulk Actions Floating Bar */}
          {selectedBookIds.length > 0 && (
            <div className="bg-emerald-950 text-white px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-lg animate-fadeIn">
              <div className="flex items-center gap-2 text-xs font-bold">
                <span className="bg-emerald-600 px-2.5 py-0.5 rounded-full text-white">
                  {selectedBookIds.length}
                </span>
                <span>cuốn sách đã được chọn</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkEligibility(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-all"
                >
                  Bật hoa hồng
                </button>
                <button
                  type="button"
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkEligibility(false)}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold rounded-lg transition-all"
                >
                  Tắt hoa hồng
                </button>
                <button
                  type="button"
                  disabled={bulkActionLoading}
                  onClick={() => setBulkRateModalOpen(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all"
                >
                  Đặt tỷ lệ chung
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedBookIds([])}
                  className="px-2 py-1.5 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
          )}

          {/* Books Table */}
          <SellerTableContainer>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={books.length > 0 && selectedBookIds.length === books.length}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                    />
                  </th>
                  <th className="p-3">Sách & Định dạng</th>
                  <th className="p-3">Giá bán</th>
                  <th className="p-3 text-center">Trạng thái Affiliate</th>
                  <th className="p-3 text-center">Tỷ lệ hiệu lực</th>
                  <th className="p-3">Ước tính thực nhận (Seller-Net)</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {booksLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 font-semibold">
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                        <span>Đang tải danh mục sách...</span>
                      </div>
                    </td>
                  </tr>
                ) : books.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                      Không tìm thấy cuốn sách nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  books.map((book) => {
                    const isSelected = selectedBookIds.includes(book.bookId);
                    const breakdown = book.sellerNetBreakdown;

                    return (
                      <tr key={book.bookId} className={`hover:bg-slate-50/70 transition-colors ${isSelected ? 'bg-emerald-50/30' : ''}`}>
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectBook(book.bookId)}
                            className="rounded border-slate-300 text-emerald-700 focus:ring-emerald-700"
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-14 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 relative border border-slate-200">
                              {book.coverImage ? (
                                <Image
                                  src={book.coverImage}
                                  alt={book.title}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400">
                                  <span className="material-symbols-outlined text-lg">book</span>
                                </div>
                              )}
                            </div>
                            <div className="max-w-xs">
                              <p className="font-bold text-slate-900 line-clamp-1">{book.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                  {book.format === 'PHYSICAL' ? 'Sách giấy' : book.format === 'DIGITAL' ? 'Sách số' : 'Cả hai'}
                                </span>
                                {book.hasExplicitOverride && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                    Tùy chỉnh riêng
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {Number(book.price).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="p-3 text-center">
                          {book.isEligible ? (
                            <SellerStatusBadge variant="success" text="Đang mở" dot />
                          ) : (
                            <SellerStatusBadge variant="neutral" text="Tạm ngưng" dot />
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className="font-black text-emerald-800 text-sm">
                              {book.effectiveRate}%
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {book.rateSource === 'CUSTOM'
                                ? 'Mức riêng'
                                : book.rateSource === 'STORE_FORMAT'
                                ? 'Theo shop'
                                : 'Mặc định sàn'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="text-left">
                              <span className="font-bold text-slate-900">
                                {Number(breakdown?.sellerNetRevenue || 0).toLocaleString('vi-VN')} đ
                              </span>
                              <span className="text-[11px] text-slate-500 block">
                                (Tỷ suất: {breakdown?.sellerNetMarginPercent || 0}%)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setPreviewModalBook(book)}
                              title="Xem chi tiết phân rã chi phí"
                              className="text-slate-400 hover:text-emerald-700 p-1"
                            >
                              <span className="material-symbols-outlined text-base">info</span>
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => openEditBook(book)}
                            className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-all shadow-sm"
                          >
                            Chỉnh sửa
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </SellerTableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center py-2">
              <span className="text-xs text-slate-500 font-medium">
                Trang {page} / {totalPages} (Tổng số {totalBooks} sách)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
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
