"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../../context/ToastContext";
import { flashSaleApi, type FlashSaleSlot } from "../../api/flashSaleApi";
import { catalogApi, type BookData } from "../../api/catalogApi";
import { AdminStatusBadge } from './AdminUI';

interface ConfiguredBookItem {
  book: BookData;
  isSelected: boolean;
  salePrice: number;
  stock: number;
  maxPerUser: number;
}

export function AdminFlashSaleView() {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [flashSales, setFlashSales] = useState<FlashSaleSlot[]>([]);
  const [catalogBooks, setCatalogBooks] = useState<BookData[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'ENDED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // In-Page Expandable Create Slot Form (100% In-Page, Zero Modal)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    bannerUrl: "",
    startsAt: new Date().toISOString().slice(0, 16),
    endsAt: new Date(Date.now() + 3600000 * 4).toISOString().slice(0, 16),
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // In-Page Expandable Studio for Bulk Books Assignment (100% In-Page, Zero Modal)
  const [studioSlotId, setStudioSlotId] = useState<string | null>(null);
  const [bookConfigMap, setBookConfigMap] = useState<Record<string, ConfiguredBookItem>>({});
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookCategoryFilter, setBookCategoryFilter] = useState<string>('ALL');
  const [bookFormatFilter, setBookFormatFilter] = useState<string>('ALL');

  // Bulk Tool Inputs
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState<string>('30');
  const [bulkStockQuota, setBulkStockQuota] = useState<string>('20');
  const [bulkMaxPerUser, setBulkMaxPerUser] = useState<string>('1');
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Inline Editing of existing items in slot
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowData, setEditingRowData] = useState<{
    salePrice: number;
    stock: number;
    maxPerUser: number;
  } | null>(null);

  const fetchFlashSales = async () => {
    try {
      setLoading(true);
      const res = await flashSaleApi.getAll();
      if (res.success && res.data) {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as any)?.items)
          ? (res.data as any).items
          : [];
        setFlashSales(list);
      }
    } catch (err) {
      console.error("Failed to load flash sales:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await catalogApi.getPublicBooks({ limit: 100 });
      if (res.success && Array.isArray(res.data)) {
        setCatalogBooks(res.data);
      }
    } catch (err) {
      console.warn("Could not load catalog books:", err);
    }
  };

  useEffect(() => {
    fetchFlashSales();
    fetchCatalog();
  }, []);

  // Top KPI Metrics
  const stats = useMemo(() => {
    const liveSessions = flashSales.filter((s) => s.status === 'ACTIVE').length;
    const totalItems = flashSales.reduce((sum, s) => sum + (s.items?.length || 0), 0);
    const totalSold = flashSales.reduce(
      (sum, s) => sum + (s.items?.reduce((iSum, it) => iSum + (it.sold || 0), 0) || 0),
      0,
    );
    const scheduledSessions = flashSales.filter((s) => s.status === 'SCHEDULED').length;

    return {
      liveSessions,
      totalItems,
      totalSold,
      scheduledSessions,
    };
  }, [flashSales]);

  // Tab & Search Filtering
  const filteredFlashSales = useMemo(() => {
    return flashSales.filter((s) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name?.toLowerCase().includes(q);
        const matchDesc = s.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) return false;
      }
      if (activeTab === 'ALL') return true;
      return s.status === activeTab;
    });
  }, [flashSales, activeTab, searchQuery]);

  // Grouped Sessions (Grouped Data Table Structure)
  const groupedSessions = useMemo(() => {
    const live = filteredFlashSales.filter((s) => s.status === 'ACTIVE');
    const scheduled = filteredFlashSales.filter((s) => s.status === 'SCHEDULED');
    const ended = filteredFlashSales.filter((s) => s.status === 'ENDED');

    const result = [];
    if (live.length > 0 || activeTab === 'ACTIVE') {
      result.push({
        groupKey: 'ACTIVE',
        title: '🔥 Phiên Flash Sale Đang Diễn Ra (Live)',
        badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: 'local_fire_department',
        sessions: live,
      });
    }
    if (scheduled.length > 0 || activeTab === 'SCHEDULED') {
      result.push({
        groupKey: 'SCHEDULED',
        title: '⏳ Phiên Flash Sale Sắp Diễn Ra (Đã Lên Lịch)',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        icon: 'schedule',
        sessions: scheduled,
      });
    }
    if (ended.length > 0 || activeTab === 'ENDED') {
      result.push({
        groupKey: 'ENDED',
        title: '⌛ Phiên Flash Sale Đã Kết Thúc (Lịch Sử)',
        badgeColor: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: 'history',
        sessions: ended,
      });
    }
    return result;
  }, [filteredFlashSales, activeTab]);

  // Categories for studio filtering
  const categories = useMemo(() => {
    const set = new Set<string>();
    catalogBooks.forEach((b) => {
      if (b.category?.name) set.add(b.category.name);
    });
    return Array.from(set);
  }, [catalogBooks]);

  // Active studio slot object
  const activeStudioSlot = useMemo(() => {
    return flashSales.find((s) => s.id === studioSlotId) || null;
  }, [flashSales, studioSlotId]);

  // Open Studio for a Slot
  const handleOpenStudio = (slot: FlashSaleSlot) => {
    if (studioSlotId === slot.id) {
      setStudioSlotId(null);
      return;
    }
    setStudioSlotId(slot.id);
    const initialMap: Record<string, ConfiguredBookItem> = {};
    const existingBookIds = new Set((slot.items || []).map((it) => it.bookId));

    catalogBooks.forEach((b) => {
      const origPrice = Number(b.price || (b as any).pricePaper || (b as any).priceEbook || 100000);
      const discountPct = 30;
      const sale = Math.round((origPrice * (100 - discountPct)) / 100);
      initialMap[b.id] = {
        book: b,
        isSelected: existingBookIds.has(b.id),
        salePrice: sale,
        stock: 20,
        maxPerUser: 1,
      };
    });
    setBookConfigMap(initialMap);
  };

  // Filter books in studio
  const studioFilteredBooks = useMemo(() => {
    return catalogBooks.filter((b) => {
      if (bookSearchQuery.trim()) {
        const q = bookSearchQuery.toLowerCase().trim();
        const matchTitle = b.title?.toLowerCase().includes(q);
        const matchAuthor = (typeof b.author === 'object' ? b.author?.name : b.author)?.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor) return false;
      }
      if (bookCategoryFilter !== 'ALL' && b.category?.name !== bookCategoryFilter) {
        return false;
      }
      if (bookFormatFilter !== 'ALL') {
        const isDigital = b.format === 'DIGITAL' || (b as any).hasEbook;
        if (bookFormatFilter === 'DIGITAL' && !isDigital) return false;
        if (bookFormatFilter === 'PHYSICAL' && isDigital) return false;
      }
      return true;
    });
  }, [catalogBooks, bookSearchQuery, bookCategoryFilter, bookFormatFilter]);

  const selectedBooksCount = useMemo(() => {
    return Object.values(bookConfigMap).filter((c) => c.isSelected).length;
  }, [bookConfigMap]);

  // Bulk Apply Tool
  const handleApplyBulkSettings = () => {
    const discountPct = Math.max(5, Math.min(90, Number(bulkDiscountPercent) || 30));
    const stockQty = Math.max(1, Number(bulkStockQuota) || 10);
    const maxLimit = Math.max(1, Number(bulkMaxPerUser) || 1);

    setBookConfigMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id].isSelected) {
          const orig = Number(next[id].book.price || (next[id].book as any).pricePaper || 100000);
          next[id] = {
            ...next[id],
            salePrice: Math.round((orig * (100 - discountPct)) / 100),
            stock: stockQty,
            maxPerUser: maxLimit,
          };
        }
      });
      return next;
    });
    showToast?.(`⚡ Đã áp dụng ưu đãi hàng loạt cho ${selectedBooksCount} cuốn sách đã chọn!`, "success");
  };

  // Toggle Selection
  const handleToggleSelectBook = (id: string) => {
    setBookConfigMap((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        isSelected: !prev[id]?.isSelected,
      },
    }));
  };

  // Select All Filtered Books
  const handleSelectAllFiltered = () => {
    const allSelected = studioFilteredBooks.every((b) => bookConfigMap[b.id]?.isSelected);
    setBookConfigMap((prev) => {
      const next = { ...prev };
      studioFilteredBooks.forEach((b) => {
        if (next[b.id]) {
          next[b.id] = { ...next[b.id], isSelected: !allSelected };
        }
      });
      return next;
    });
  };

  // Batch Submit Selected Books into Slot
  const handleBatchSubmit = async () => {
    if (!activeStudioSlot) return;
    const selectedConfigs = Object.values(bookConfigMap).filter((c) => c.isSelected);

    if (selectedConfigs.length === 0) {
      showToast?.("Vui lòng chọn ít nhất 1 đầu sách để đưa vào Flash Sale!", "warning");
      return;
    }

    try {
      setSubmittingBatch(true);
      let successCount = 0;
      for (const config of selectedConfigs) {
        const orig = Number(config.book.price || (config.book as any).pricePaper || 100000);
        const res = await flashSaleApi.addItem({
          flashSaleId: activeStudioSlot.id,
          bookId: config.book.id,
          originalPrice: orig,
          salePrice: config.salePrice,
          stock: config.stock,
          maxPerUser: config.maxPerUser,
        });
        if (res.success) successCount++;
      }

      showToast?.(`🎉 Đã gán thành công ${successCount}/${selectedConfigs.length} sách vào khung giờ Flash Sale!`, "success");
      setStudioSlotId(null);
      fetchFlashSales();
    } catch {
      showToast?.("Có lỗi xảy ra khi gán sách hàng loạt", "error");
    } finally {
      setSubmittingBatch(false);
    }
  };

  // Create Campaign Validation
  const validateCreateForm = () => {
    const errs: Record<string, string> = {};
    if (!createForm.name.trim()) {
      errs.name = "Tên sự kiện flash sale không được để trống.";
    } else if (createForm.name.trim().length < 5) {
      errs.name = "Tên sự kiện phải có ít nhất 5 ký tự.";
    }

    if (createForm.bannerUrl.trim()) {
      try {
        new URL(createForm.bannerUrl.trim());
      } catch {
        errs.bannerUrl = "URL banner không đúng định dạng hợp lệ (vd: https://...).";
      }
    }

    if (!createForm.startsAt) errs.startsAt = "Vui lòng chọn thời gian bắt đầu.";
    if (!createForm.endsAt) errs.endsAt = "Vui lòng chọn thời gian kết thúc.";

    if (createForm.startsAt && createForm.endsAt) {
      const s = new Date(createForm.startsAt).getTime();
      const e = new Date(createForm.endsAt).getTime();
      if (e <= s) {
        errs.endsAt = "Thời gian kết thúc phải diễn ra sau thời gian bắt đầu.";
      }
    }

    setCreateErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateCampaign = async (e: any) => {
    e.preventDefault();
    if (!validateCreateForm()) {
      showToast?.("Vui lòng kiểm tra lại các trường lỗi trên form!", "warning");
      return;
    }

    try {
      setSubmittingCreate(true);
      const res = await flashSaleApi.createFlashSale({
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        bannerUrl: createForm.bannerUrl.trim() || undefined,
        startsAt: new Date(createForm.startsAt).toISOString(),
        endsAt: new Date(createForm.endsAt).toISOString(),
      });

      if (res.success) {
        showToast?.(`⚡ Đã tạo thành công khung giờ "${createForm.name}"!`, "success");
        setIsCreateFormOpen(false);
        setCreateErrors({});
        setCreateForm({
          name: "",
          description: "",
          bannerUrl: "",
          startsAt: new Date().toISOString().slice(0, 16),
          endsAt: new Date(Date.now() + 3600000 * 4).toISOString().slice(0, 16),
        });
        fetchFlashSales();
      } else {
        showToast?.(res.error?.message || "Không thể tạo khung giờ Flash Sale", "error");
      }
    } catch {
      showToast?.("Lỗi máy chủ khi tạo khung giờ Flash Sale", "error");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleToggleStatus = async (slot: FlashSaleSlot) => {
    const nextStatus = slot.status === "ACTIVE" ? "SCHEDULED" : "ACTIVE";
    try {
      const res = await flashSaleApi.updateStatus(slot.id, nextStatus);
      if (res.success) {
        showToast?.(
          `Đã chuyển trạng thái khung giờ sang: ${nextStatus === "ACTIVE" ? "ĐANG DIỄN RA" : "TẠM DỪNG"}`,
          "success",
        );
        fetchFlashSales();
      }
    } catch {
      showToast?.("Lỗi cập nhật trạng thái Flash Sale", "error");
    }
  };

  const handleDeleteSlot = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa khung giờ Flash Sale "${name}"?`)) return;
    try {
      const res = await flashSaleApi.deleteFlashSale(id);
      if (res.success) {
        showToast?.(`Đã xóa khung giờ "${name}"`, "success");
        fetchFlashSales();
      }
    } catch {
      showToast?.("Không thể xóa khung giờ", "error");
    }
  };

  // Inline edit item in slot
  const handleSaveInlineEdit = async (itemId: string) => {
    if (!editingRowData) return;
    try {
      const res = await flashSaleApi.updateItemStock(itemId, editingRowData.stock);
      if (res.success) {
        showToast?.("Đã cập nhật tồn kho khuyến mãi thành công!", "success");
        setEditingRowId(null);
        setEditingRowData(null);
        fetchFlashSales();
      }
    } catch {
      showToast?.("Không thể cập nhật sách khuyến mãi", "error");
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto w-full pb-16 animate-in fade-in duration-200">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight font-editorial flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A] text-2xl">bolt</span>
            <span>Flash Sale Giờ Vàng Toàn Sàn (Platform Flash Sale Hub)</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Quản trị các khung giờ Flash Sale cấp sàn, phân bổ kho sách trọng điểm và kiểm soát quota mỗi độc giả
          </p>
        </div>

        <button
          onClick={() => setIsCreateFormOpen(!isCreateFormOpen)}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer shrink-0 ${
            isCreateFormOpen
              ? "bg-gray-800 text-white hover:bg-gray-700"
              : "bg-[#00875A] hover:bg-[#00734c] text-white"
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">
            {isCreateFormOpen ? "expand_less" : "add_circle"}
          </span>
          <span>{isCreateFormOpen ? "Đóng Form Khung Giờ" : "Tạo Khung Giờ Mới"}</span>
        </button>
      </div>

      {/* 2. 4 TOP KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
            <span className="material-symbols-outlined text-2xl animate-pulse">local_fire_department</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Phiên Đang Live</span>
            <div className="text-xl font-black text-rose-600 font-mono mt-0.5">{stats.liveSessions}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
            <span className="material-symbols-outlined text-2xl">auto_stories</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Tổng Sách Khuyến Mãi</span>
            <div className="text-xl font-black text-gray-900 font-mono mt-0.5">{stats.totalItems}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
            <span className="material-symbols-outlined text-2xl">trending_up</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Số Cuốn Đã Bán</span>
            <div className="text-xl font-black text-emerald-700 font-mono mt-0.5">{stats.totalSold.toLocaleString('vi-VN')}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
            <span className="material-symbols-outlined text-2xl">schedule</span>
          </div>
          <div>
            <span className="text-[11px] text-gray-500 font-medium">Phiên Đã Lên Lịch</span>
            <div className="text-xl font-black text-blue-700 font-mono mt-0.5">{stats.scheduledSessions}</div>
          </div>
        </div>
      </div>

      {/* 3. IN-PAGE CREATE FLASH SALE SLOT FORM (100% IN-PAGE, ZERO MODAL) */}
      {isCreateFormOpen && (
        <div className="bg-white rounded-3xl p-6 border-2 border-emerald-500/40 shadow-xl animate-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-200">
                <span className="material-symbols-outlined text-xl">bolt</span>
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">
                  Thiết Lập Khung Giờ Flash Sale Mới Toàn Sàn
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Khởi tạo phiên giờ vàng mới để mở cổng đăng ký và phân bổ sách khuyến mãi
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCreateFormOpen(false)}
              className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleCreateCampaign} className="space-y-4 pt-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Tên Khung Giờ / Sự Kiện <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Flash Sale Giờ Vàng 20:00 - 24:00"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-bold text-xs focus:border-[#00875A] focus:outline-none"
                />
                {createErrors.name && (
                  <p className="text-red-500 text-[10.5px] mt-1">{createErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Mô Tả Phiên</label>
                <input
                  type="text"
                  placeholder="VD: Săn sale sách best-seller giảm sâu tới 50%"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-xs focus:border-[#00875A] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Ảnh Banner Khung Giờ (URL)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={createForm.bannerUrl}
                  onChange={(e) => setCreateForm({ ...createForm, bannerUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono text-xs focus:border-[#00875A] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Thời Gian Bắt Đầu <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={createForm.startsAt}
                  onChange={(e) => setCreateForm({ ...createForm, startsAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-medium text-xs focus:border-[#00875A] focus:outline-none"
                />
                {createErrors.startsAt && (
                  <p className="text-red-500 text-[10.5px] mt-1">{createErrors.startsAt}</p>
                )}
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Thời Gian Kết Thúc <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={createForm.endsAt}
                  onChange={(e) => setCreateForm({ ...createForm, endsAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-medium text-xs focus:border-[#00875A] focus:outline-none"
                />
                {createErrors.endsAt && (
                  <p className="text-red-500 text-[10.5px] mt-1">{createErrors.endsAt}</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsCreateFormOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="submit"
                disabled={submittingCreate}
                className="px-6 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                {submittingCreate ? (
                  <span>Đang khởi tạo...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">bolt</span>
                    <span>Xác Nhận Tạo Khung Giờ</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. FILTER & SEARCH TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'Tất Cả Phiên', count: flashSales.length },
            { id: 'ACTIVE', label: 'Đang Diễn Ra (Live)', count: stats.liveSessions },
            { id: 'SCHEDULED', label: 'Sắp Diễn Ra', count: stats.scheduledSessions },
            { id: 'ENDED', label: 'Đã Kết Thúc', count: flashSales.filter((s) => s.status === 'ENDED').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? "bg-[#00875A] text-white shadow-xs"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            placeholder="Tìm theo tên khung giờ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#00875A]"
          />
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-gray-400 text-sm">
            search
          </span>
        </div>
      </div>

      {/* 5. GROUPED SESSIONS & DATA TABLES */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-8 h-8 border-4 border-[#00875A] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-gray-500 mt-2 font-medium">Đang tải danh sách phiên Flash Sale...</p>
        </div>
      ) : groupedSessions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-gray-300">bolt</span>
          <h3 className="text-sm font-bold text-gray-700 mt-2">Chưa có khung giờ Flash Sale nào trong mục này</h3>
          <p className="text-xs text-gray-500 mt-1">Bấm "Tạo Khung Giờ Mới" để mở phiên giờ vàng đầu tiên!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedSessions.map((group) => (
            <div key={group.groupKey} className="space-y-4">
              {/* Group Title */}
              <div className="flex items-center gap-2 px-1">
                <span className="material-symbols-outlined text-lg text-gray-700">{group.icon}</span>
                <h2 className="font-extrabold text-gray-900 text-sm sm:text-base tracking-tight">{group.title}</h2>
                <span className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10.5px] border ${group.badgeColor}`}>
                  {group.sessions.length} phiên
                </span>
              </div>

              {/* Sessions in this group */}
              <div className="grid grid-cols-1 gap-5">
                {group.sessions.map((slot) => {
                  const isLive = slot.status === "ACTIVE";
                  const isScheduled = slot.status === "SCHEDULED";
                  const isStudioOpen = studioSlotId === slot.id;

                  return (
                    <div
                      key={slot.id}
                      className={`bg-white rounded-3xl border transition-all shadow-2xs overflow-hidden ${
                        isStudioOpen ? 'border-2 border-emerald-500/80 shadow-md' : 'border-[#E2E8F0]'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="p-4 bg-gray-50/90 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                              isLive
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : "bg-gray-100 text-gray-600 border border-gray-200"
                            }`}
                          >
                            <span className="material-symbols-outlined text-2xl">bolt</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-extrabold text-gray-900 text-sm">{slot.name}</h3>
                              {isLive ? (
                                <AdminStatusBadge status="danger" label="ĐANG DIỄN RA" icon="bolt" />
                              ) : isScheduled ? (
                                <AdminStatusBadge status="warning" label="ĐÃ LÊN LỊCH" icon="schedule" />
                              ) : (
                                <AdminStatusBadge status="neutral" label="ĐÃ KẾT THÚC" />
                              )}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2 font-mono">
                              <span>Bắt đầu: <strong>{new Date(slot.startsAt).toLocaleString("vi-VN")}</strong></span>
                              <span>-</span>
                              <span>Kết thúc: <strong>{new Date(slot.endsAt).toLocaleString("vi-VN")}</strong></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenStudio(slot)}
                            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs ${
                              isStudioOpen
                                ? "bg-gray-800 text-white hover:bg-gray-700"
                                : "bg-gray-900 hover:bg-gray-800 text-white"
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isStudioOpen ? "expand_less" : "library_add"}
                            </span>
                            <span>{isStudioOpen ? "Đóng Studio Sách" : `Studio Gán Sách (${slot.items?.length || 0})`}</span>
                          </button>
                          <button
                            onClick={() => handleToggleStatus(slot)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs cursor-pointer border transition-colors ${
                              isLive
                                ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                                : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            }`}
                          >
                            {isLive ? "Tạm Dừng" : "Kích Hoạt Live"}
                          </button>
                          <button
                            onClick={() => handleDeleteSlot(slot.id, slot.name)}
                            className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 cursor-pointer transition-colors"
                            title="Xóa khung giờ"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* IN-PAGE MULTI-BOOK BULK REGISTRATION STUDIO (100% IN-PAGE, ZERO MODAL) */}
                      {isStudioOpen && (
                        <div className="p-5 bg-gray-50/50 border-b border-gray-200 animate-in slide-in-from-top-3 duration-150">
                          {/* Bulk Preset Tool Strip */}
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                                <span className="material-symbols-outlined text-base">tune</span>
                                <span>Công cụ hàng loạt:</span>
                              </span>

                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-gray-600">Giảm</span>
                                <input
                                  type="number"
                                  value={bulkDiscountPercent}
                                  onChange={(e) => setBulkDiscountPercent(e.target.value)}
                                  className="w-14 px-2 py-1 rounded-lg bg-white border border-gray-300 text-center font-bold font-mono text-xs"
                                />
                                <span className="text-gray-600">%</span>
                              </div>

                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-gray-600">Phân bổ</span>
                                <input
                                  type="number"
                                  value={bulkStockQuota}
                                  onChange={(e) => setBulkStockQuota(e.target.value)}
                                  className="w-16 px-2 py-1 rounded-lg bg-white border border-gray-300 text-center font-bold font-mono text-xs"
                                />
                                <span className="text-gray-600">cuốn</span>
                              </div>

                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-gray-600">Hạn mức</span>
                                <input
                                  type="number"
                                  value={bulkMaxPerUser}
                                  onChange={(e) => setBulkMaxPerUser(e.target.value)}
                                  className="w-12 px-2 py-1 rounded-lg bg-white border border-gray-300 text-center font-bold font-mono text-xs"
                                />
                                <span className="text-gray-600">cuốn/khách</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleApplyBulkSettings}
                              className="px-3.5 py-1.5 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">done_all</span>
                              <span>Áp Dụng Cho ({selectedBooksCount}) Sách Đã Chọn</span>
                            </button>
                          </div>

                          {/* Filter Search Bar */}
                          <div className="flex items-center gap-2.5 pb-3">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                placeholder="Tìm theo tên sách, tác giả..."
                                value={bookSearchQuery}
                                onChange={(e) => setBookSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-gray-300 text-xs focus:outline-none focus:border-[#00875A]"
                              />
                              <span className="material-symbols-outlined absolute left-2.5 top-2 text-gray-400 text-sm">
                                search
                              </span>
                            </div>

                            <select
                              value={bookCategoryFilter}
                              onChange={(e) => setBookCategoryFilter(e.target.value)}
                              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:border-[#00875A]"
                            >
                              <option value="ALL">Tất Cả Danh Mục</option>
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>

                            <select
                              value={bookFormatFilter}
                              onChange={(e) => setBookFormatFilter(e.target.value)}
                              className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white text-xs font-medium focus:border-[#00875A]"
                            >
                              <option value="ALL">Tất Cả Định Dạng</option>
                              <option value="PHYSICAL">Sách Giấy</option>
                              <option value="DIGITAL">Ebook DRM</option>
                            </select>

                            <button
                              type="button"
                              onClick={handleSelectAllFiltered}
                              className="px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 text-xs font-bold shrink-0 cursor-pointer"
                            >
                              Chọn Tất Cả ({studioFilteredBooks.length})
                            </button>
                          </div>

                          {/* Selection Table */}
                          <div className="max-h-80 overflow-y-auto border border-gray-300 rounded-2xl bg-white">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0] sticky top-0 z-10">
                                <tr>
                                  <th className="py-2.5 px-3 w-10 text-center">Chọn</th>
                                  <th className="py-2.5 px-3">Tác Phẩm &amp; Danh Mục</th>
                                  <th className="py-2.5 px-3 text-right">Giá Gốc</th>
                                  <th className="py-2.5 px-3 text-right">Giá Flash Sale</th>
                                  <th className="py-2.5 px-3 text-center">Tồn Kho Phân Bổ</th>
                                  <th className="py-2.5 px-3 text-center">Hạn Mức/Khách</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {studioFilteredBooks.map((b) => {
                                  const cfg = bookConfigMap[b.id];
                                  const origPrice = Number(b.price || (b as any).pricePaper || 100000);
                                  const isSelected = cfg?.isSelected;

                                  return (
                                    <tr
                                      key={b.id}
                                      onClick={() => handleToggleSelectBook(b.id)}
                                      className={`transition-colors cursor-pointer ${
                                        isSelected ? 'bg-emerald-50/60' : 'hover:bg-gray-50'
                                      }`}
                                    >
                                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handleToggleSelectBook(b.id)}
                                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                        />
                                      </td>
                                      <td className="py-2.5 px-3">
                                        <span className="font-bold text-gray-900 block max-w-md truncate">{b.title}</span>
                                        <span className="text-[10px] text-gray-400">
                                          {(typeof b.author === 'object' ? b.author?.name : b.author) || 'HUKI Author'} • {b.category?.name || 'Văn học'}
                                        </span>
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono text-gray-400 line-through">
                                        {origPrice.toLocaleString('vi-VN')}₫
                                      </td>
                                      <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="number"
                                          value={cfg?.salePrice}
                                          disabled={!isSelected}
                                          onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setBookConfigMap((prev) => ({
                                              ...prev,
                                              [b.id]: { ...prev[b.id], salePrice: val },
                                            }));
                                          }}
                                          className={`w-24 px-2 py-1 rounded border font-mono font-extrabold text-right text-xs ${
                                            isSelected ? 'border-rose-300 text-rose-600 bg-white' : 'border-gray-200 text-gray-400 bg-gray-50'
                                          }`}
                                        />
                                      </td>
                                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="number"
                                          value={cfg?.stock}
                                          disabled={!isSelected}
                                          onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setBookConfigMap((prev) => ({
                                              ...prev,
                                              [b.id]: { ...prev[b.id], stock: val },
                                            }));
                                          }}
                                          className={`w-16 px-2 py-1 rounded border font-mono font-bold text-center text-xs ${
                                            isSelected ? 'border-gray-300 bg-white text-gray-800' : 'border-gray-200 text-gray-400 bg-gray-50'
                                          }`}
                                        />
                                      </td>
                                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                          type="number"
                                          value={cfg?.maxPerUser}
                                          disabled={!isSelected}
                                          onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setBookConfigMap((prev) => ({
                                              ...prev,
                                              [b.id]: { ...prev[b.id], maxPerUser: val },
                                            }));
                                          }}
                                          className={`w-14 px-2 py-1 rounded border font-mono font-bold text-center text-xs ${
                                            isSelected ? 'border-gray-300 bg-white text-gray-800' : 'border-gray-200 text-gray-400 bg-gray-50'
                                          }`}
                                        />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          {/* Footer Studio Action */}
                          <div className="pt-3.5 flex items-center justify-between">
                            <div className="text-xs text-gray-600">
                              Đã chọn: <strong className="text-emerald-700 font-mono text-sm">{selectedBooksCount}</strong> cuốn sách
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setStudioSlotId(null)}
                                className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs cursor-pointer"
                              >
                                Đóng Studio
                              </button>
                              <button
                                type="button"
                                disabled={submittingBatch || selectedBooksCount === 0}
                                onClick={handleBatchSubmit}
                                className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                              >
                                {submittingBatch ? (
                                  <span>Đang gán sách...</span>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined text-base">cloud_upload</span>
                                    <span>Xác Nhận Đưa {selectedBooksCount} Sách Vào Phiên</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Slot Items Table */}
                      {slot.items && slot.items.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse min-w-[1000px]">
                            <thead className="bg-[#F8FAFC] text-[10.5px] font-bold text-gray-500 uppercase tracking-wider border-b border-[#E2E8F0]">
                              <tr>
                                <th className="py-3 px-3.5 whitespace-nowrap w-12 text-center">STT</th>
                                <th className="py-3 px-3.5 whitespace-nowrap">Tên Tác Phẩm &amp; Mã</th>
                                <th className="py-3 px-3 whitespace-nowrap text-right">Giá Gốc</th>
                                <th className="py-3 px-3 whitespace-nowrap text-right">Giá Flash Sale</th>
                                <th className="py-3 px-3 whitespace-nowrap text-center">Giảm Giá</th>
                                <th className="py-3 px-3 whitespace-nowrap text-center">Tồn Kho Khuyến Mãi</th>
                                <th className="py-3 px-3.5 whitespace-nowrap">Tiến Độ Bán</th>
                                <th className="py-3 px-4 whitespace-nowrap text-center">Hạn Mức/Khách</th>
                                <th className="py-3 px-4 whitespace-nowrap text-right">Thao Tác</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {slot.items.map((item: any, idx: number) => {
                                const isEditing = editingRowId === item.id;
                                return (
                                  <tr
                                    key={item.id}
                                    className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                                  >
                                    <td className="py-3 px-3.5 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                                      {idx + 1}
                                    </td>
                                    <td className="py-3 px-3.5 whitespace-nowrap">
                                      <span className="font-bold text-gray-900 block max-w-xs truncate">
                                        {item.bookTitle || `Sách #${item.bookId.slice(0, 8)}`}
                                      </span>
                                      <span className="font-mono text-[10px] text-gray-400">ID: {item.bookId}</span>
                                    </td>
                                    <td className="py-3 px-3 whitespace-nowrap text-right text-gray-400 line-through font-mono">
                                      {Number(item.originalPrice).toLocaleString("vi-VN")}₫
                                    </td>
                                    <td className="py-3 px-3 whitespace-nowrap text-right font-extrabold text-rose-600 font-mono">
                                      {Number(item.salePrice).toLocaleString("vi-VN")}₫
                                    </td>
                                    <td className="py-3 px-3 whitespace-nowrap text-center font-bold text-emerald-600">
                                      -{item.discountPercent}%
                                    </td>
                                    <td className="py-3 px-3 whitespace-nowrap text-center font-semibold text-gray-800">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={editingRowData?.stock}
                                          onChange={(e) =>
                                            setEditingRowData((prev) =>
                                              prev ? { ...prev, stock: Number(e.target.value) } : null,
                                            )
                                          }
                                          className="w-20 px-2 py-1 rounded border border-emerald-500 font-mono font-bold text-center"
                                        />
                                      ) : (
                                        <span>{item.stock} cuốn</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 whitespace-nowrap">
                                      <div className="flex items-center gap-2">
                                        <div className="w-20 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                          <div
                                            className="bg-rose-500 h-full rounded-full"
                                            style={{ width: `${item.soldPercent || 0}%` }}
                                          ></div>
                                        </div>
                                        <span className="text-[11px] font-bold text-gray-700">
                                          {item.sold || 0} đã bán
                                        </span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap text-center">
                                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10.5px] border border-amber-200">
                                        Max {item.maxPerUser || 1} cuốn
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap text-right">
                                      {isEditing ? (
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            onClick={() => handleSaveInlineEdit(item.id)}
                                            className="px-2 py-1 bg-emerald-600 text-white rounded text-[11px] font-bold cursor-pointer"
                                          >
                                            Lưu
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingRowId(null);
                                              setEditingRowData(null);
                                            }}
                                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[11px] cursor-pointer"
                                          >
                                            Hủy
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingRowId(item.id);
                                            setEditingRowData({
                                              salePrice: item.salePrice,
                                              stock: item.stock,
                                              maxPerUser: item.maxPerUser,
                                            });
                                          }}
                                          className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold cursor-pointer"
                                        >
                                          Sửa Tồn
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-gray-400">
                          Chưa có sách nào trong khung giờ này. Hãy bấm <strong>"Studio Gán Sách"</strong> để chọn hàng loạt sản phẩm!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
