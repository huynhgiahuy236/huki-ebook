"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { flashSaleApi, invalidateFlashSaleCache, type FlashSaleSlot } from "../../api/flashSaleApi";
import { catalogApi, type BookData } from "../../api/catalogApi";
import { AdminStatusBadge } from './AdminUI';
import GroupedDataTable, { type Column } from '../common/GroupedDataTable';
import CountdownConfirmModal from '../common/CountdownConfirmModal';
import { AdminPenaltyArbitrationView } from './AdminPenaltyArbitrationView';
import { sellerPenaltyService } from '../../services/sellerPenaltyService';
import { realtimeSyncBus } from '../../services/realtimeSyncBus';
import {
  resolveBookOriginalPriceByFormat,
  getDefaultFlashSaleTargetFormat,
  getFlashSaleFormatStyle,
  type FlashSaleTargetFormat,
} from '../../utils/flashSaleFormat';

interface ConfiguredBookItem {
  book: BookData;
  isSelected: boolean;
  targetFormat: FlashSaleTargetFormat;
  salePrice: number;
  stock: number;
  maxPerUser: number;
}

function toLocalDatetimeString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return year + '-' + month + '-' + day + 'T' + hours + ':' + minutes;
}

/**
 * Isolated 1-second timer for each Flash Sale slot so ticking does not re-render
 * the entire AdminFlashSaleView tree every second (prevents UI lag / jitter).
 */
function SlotCountdownBadge({
  slot,
  onEndEarlyClick,
}: {
  slot: FlashSaleSlot;
  onEndEarlyClick: (slot: FlashSaleSlot) => void;
}) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (slot.status !== "ACTIVE") return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [slot.status]);

  const remainingSeconds = Math.max(0, Math.floor((new Date(slot.endsAt).getTime() - nowMs) / 1000));
  const isEndingEarly = slot.status === "ACTIVE" && remainingSeconds <= 300 && remainingSeconds > 0;
  const isLive = slot.status === "ACTIVE" && !isEndingEarly && remainingSeconds > 0;

  if (isEndingEarly) {
    return (
      <button
        disabled
        className="px-3 py-1.5 rounded-xl font-bold text-xs border border-amber-300 bg-amber-50 text-amber-800 flex items-center gap-1.5 cursor-not-allowed shadow-2xs"
        title="Khung giờ này đã được kích hoạt kết thúc sớm sau 5 phút"
      >
        <span className="material-symbols-outlined text-[15px] animate-spin text-amber-600">progress_activity</span>
        <span>Đang kết thúc ({Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, "0")})</span>
      </button>
    );
  }

  if (isLive) {
    return (
      <button
        onClick={() => onEndEarlyClick(slot)}
        className="px-3 py-1.5 rounded-xl font-bold text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
        title="Kết thúc sớm đợt Flash Sale này (chờ 5 phút để khách hoàn tất thanh toán)"
      >
        <span className="material-symbols-outlined text-sm">timer_off</span>
        <span>Kết Thúc Sớm</span>
      </button>
    );
  }

  return null;
}

function SlotStatusBadge({ slot }: { slot: FlashSaleSlot }) {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    if (slot.status !== "ACTIVE") return;
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [slot.status]);

  const remainingSeconds = Math.max(0, Math.floor((new Date(slot.endsAt).getTime() - nowMs) / 1000));
  const isEndingEarly = slot.status === "ACTIVE" && remainingSeconds <= 300 && remainingSeconds > 0;
  const isLive = slot.status === "ACTIVE" && !isEndingEarly && remainingSeconds > 0;
  const isScheduled = slot.status === "SCHEDULED";
  const isCancelled = slot.status === "CANCELLED";

  if (isEndingEarly) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
        <span>{`Kết thúc sau ${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`}</span>
      </span>
    );
  }
  if (isLive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
        <span>Đang Diễn Ra</span>
      </span>
    );
  }
  if (isScheduled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        <span>Đã Lên Lịch</span>
      </span>
    );
  }
  if (isCancelled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        <span>Đã Hủy</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gray-100 text-gray-600 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
      <span>Đã Kết Thúc</span>
    </span>
  );
}

export function AdminFlashSaleView() {
  const { showToast } = useToast();

  const [primaryViewMode, setPrimaryViewMode] = useState<'SLOTS' | 'PENALTY_ARBITRATION'>('SLOTS');
  const [pendingAppealsCount, setPendingAppealsCount] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const lastSilentSyncRef = useRef<number>(0);
  const skipSelfBusUntilRef = useRef<number>(0);
  const [flashSales, setFlashSales] = useState<FlashSaleSlot[]>([]);
  const [catalogBooks, setCatalogBooks] = useState<BookData[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'ENDED' | 'CANCELLED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // In-Page Expandable Create Slot Form (100% In-Page, Zero Modal)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  // End Early 5 Minutes Modal states
  const [endEarlyModalSlot, setEndEarlyModalSlot] = useState<FlashSaleSlot | null>(null);
  const [submittingEndEarly, setSubmittingEndEarly] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    bannerUrl: "",
    registrationStartsAt: toLocalDatetimeString(),
    registrationEndsAt: toLocalDatetimeString(new Date(Date.now() + 3600000 * 2)),
    startsAt: toLocalDatetimeString(new Date(Date.now() + 3600000 * 2 + 120000)),
    endsAt: toLocalDatetimeString(new Date(Date.now() + 3600000 * 6)),
    minStores: 1,
    maxStores: 10,
    discountPercent: 30,
    maxPerUser: 1,
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // In-Page Expandable Studio for Bulk Books Assignment (100% In-Page, Zero Modal)
  const [studioSlotId, setStudioSlotId] = useState<string | null>(null);
  const [bookConfigMap, setBookConfigMap] = useState<Record<string, ConfiguredBookItem>>({});
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookCategoryFilter, setBookCategoryFilter] = useState<string>('ALL');
  const [bookFormatFilter, setBookFormatFilter] = useState<string>('ALL');
  const [bookStoreFilter, setBookStoreFilter] = useState<string>('ALL');

  // Bulk Tool Inputs
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState<string>('30');
  const [bulkStockQuota, setBulkStockQuota] = useState<string>('20');
  const [bulkMaxPerUser, setBulkMaxPerUser] = useState<string>('1');
  const [submittingBatch, setSubmittingBatch] = useState(false);

  // Inline Editing of existing items in slot
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [editingRowData, setEditingRowData] = useState<{
    salePrice: number;
    stock: number;
    maxPerUser: number;
  } | null>(null);
  const [expandedRowKeys, setExpandedRowKeys] = useState<(string | number)[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    kind: 'CANCEL_SLOT' | 'REMOVE_ITEM';
    slot?: FlashSaleSlot;
    itemId?: string;
    bookTitle?: string;
  } | null>(null);
  const [submittingConfirmModal, setSubmittingConfirmModal] = useState(false);

  const fetchFlashSales = async (silent = false) => {
    const showBlockingLoader = !silent && !hasLoadedOnceRef.current;
    try {
      if (showBlockingLoader) setLoading(true);
      if (silent) setIsRefreshing(true);
      const res = await flashSaleApi.getAll({ scope: 'PLATFORM' });
      if (res.success && res.data) {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray((res.data as any)?.items)
            ? (res.data as any).items
            : [];
        const normalized = list
          .filter((s: FlashSaleSlot) => (s.scope === 'PLATFORM' || !s.storeId))
          .map((s: FlashSaleSlot) => {
            if ((s.status as string) === 'PAUSED') {
              const now = Date.now();
              const end = new Date(s.endsAt).getTime();
              const start = new Date(s.startsAt).getTime();
              return {
                ...s,
                status: (now >= start && now <= end ? 'ACTIVE' : now < start ? 'SCHEDULED' : 'ENDED') as any,
              };
            }
            return s;
          });
        setFlashSales(normalized);
        hasLoadedOnceRef.current = true;
        lastSilentSyncRef.current = Date.now();
      }
    } catch (err) {
      console.error("Failed to load flash sales:", err);
    } finally {
      if (showBlockingLoader) setLoading(false);
      setIsRefreshing(false);
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
    fetchFlashSales(false);
    fetchCatalog();

    const refreshAppealsCount = () => {
      const appeals = sellerPenaltyService.getAllAppeals();
      setPendingAppealsCount(appeals.filter((a) => a.record.appealStatus === 'PENDING').length);
    };
    refreshAppealsCount();

    const unsubscribePenalty = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'SELLER_PENALTY_UPDATED') {
        refreshAppealsCount();
      }
      if (Date.now() < skipSelfBusUntilRef.current) return;
      const notiType = String((msg.payload as any)?.type || '');
      const isFlashEvent =
        (msg.type as any) === 'FLASH_SALE_UPDATED' ||
        ((msg.type === 'NOTIFICATIONS_UPDATED' || msg.type === 'ADMIN_NOTIFICATIONS_UPDATED') &&
          notiType.includes('FLASH_SALE'));
      if (isFlashEvent) {
        invalidateFlashSaleCache();
        fetchFlashSales(true);
      }
    });

    const handleDomUpdate = () => {
      invalidateFlashSaleCache();
      fetchFlashSales(true);
    };
    window.addEventListener('huki_flash_sale_updated', handleDomUpdate);

    // Silent background resync only when tab becomes visible after >= 15s (no 5-6s reload heartbeat)
    const handleFocusSync = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastSilentSyncRef.current >= 15000
      ) {
        fetchFlashSales(true);
      }
    };
    document.addEventListener('visibilitychange', handleFocusSync);

    return () => {
      unsubscribePenalty();
      window.removeEventListener('huki_flash_sale_updated', handleDomUpdate);
      document.removeEventListener('visibilitychange', handleFocusSync);
    };
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

  // Check if a platform flash sale is currently active, registering or scheduled
  const activePlatformSlot = useMemo(() => {
    const now = new Date();
    return flashSales.find(
      (s) =>
        (s.scope === "PLATFORM" || !s.storeId) &&
        s.status !== "ENDED" &&
        s.status !== "CANCELLED" &&
        new Date(s.endsAt) > now,
    );
  }, [flashSales]);

  // Tab & Search Filtering
  const filteredFlashSales = useMemo(() => {
    return flashSales.filter((s) => {
      if (s.scope && s.scope !== "PLATFORM") return false;
      if (s.storeId) return false;
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

  // Pagination & Reset
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // Sort Filtered Flash Sales consistently (LIVE -> SCHEDULED -> ENDED -> CANCELLED)
  const sortedFlashSales = useMemo(() => {
    const statusOrder: Record<string, number> = { ACTIVE: 1, SCHEDULED: 2, ENDED: 3, CANCELLED: 4 };
    return [...filteredFlashSales].sort((a, b) => {
      const orderA = statusOrder[a.status] ?? 99;
      const orderB = statusOrder[b.status] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
  }, [filteredFlashSales]);

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
  const handleOpenStudio = useCallback((slot: FlashSaleSlot) => {
    if (studioSlotId === slot.id) {
      setStudioSlotId(null);
      return;
    }
    const initialMap: Record<string, ConfiguredBookItem> = {};
    const existingBookIds = new Set((slot.items || []).map((it) => it.bookId));

    catalogBooks.forEach((b) => {
      const defaultFmt = getDefaultFlashSaleTargetFormat(b);
      const origPrice = resolveBookOriginalPriceByFormat(b, defaultFmt) || Number(b.price || 100000);
      const discountPct = Number(slot.discountPercent || 30);
      const sale = Math.round((origPrice * (100 - discountPct)) / 100);
      initialMap[b.id] = {
        book: b,
        isSelected: existingBookIds.has(b.id),
        targetFormat: defaultFmt,
        salePrice: sale,
        stock: 20,
        maxPerUser: Number(slot.maxPerUser || 1),
      };
    });
    React.startTransition(() => {
      setBookConfigMap(initialMap);
      setStudioSlotId(slot.id);
    });
  }, [studioSlotId, catalogBooks]);

  const studioStoreOptions = useMemo(() => {
    const names = new Set<string>();
    catalogBooks.forEach((b) => {
      const sName = (b as any).store?.name || (b as any).storeName;
      if (sName) names.add(String(sName));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [catalogBooks]);

  // Filter books in studio
  const studioFilteredBooks = useMemo(() => {
    return catalogBooks.filter((b) => {
      if (bookSearchQuery.trim()) {
        const q = bookSearchQuery.toLowerCase().trim();
        const matchTitle = b.title?.toLowerCase().includes(q);
        const matchAuthor = (typeof b.author === 'object' ? b.author?.name : b.author)?.toLowerCase().includes(q);
        if (!matchTitle && !matchAuthor) return false;
      }
      const bStoreName = (b as any).store?.name || (b as any).storeName;
      if (bookStoreFilter !== 'ALL' && bStoreName !== bookStoreFilter) {
        return false;
      }
      if (bookCategoryFilter !== 'ALL' && b.category?.name !== bookCategoryFilter) {
        return false;
      }
      if (bookFormatFilter !== 'ALL') {
        const fmt = String(b.format || 'PHYSICAL').toUpperCase();
        if (bookFormatFilter === 'DIGITAL' && fmt !== 'DIGITAL') return false;
        if (bookFormatFilter === 'PHYSICAL' && fmt !== 'PHYSICAL') return false;
        if (bookFormatFilter === 'BOTH' && fmt !== 'BOTH') return false;
      }
      return true;
    });
  }, [catalogBooks, bookSearchQuery, bookStoreFilter, bookCategoryFilter, bookFormatFilter]);

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
          const orig = resolveBookOriginalPriceByFormat(next[id].book, next[id].targetFormat) || 100000;
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
    showToast?.(` Đã áp dụng ưu đãi hàng loạt cho ${selectedBooksCount} cuốn sách đã chọn!`, "success");
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
      const CHUNK_SIZE = 5;
      for (let i = 0; i < selectedConfigs.length; i += CHUNK_SIZE) {
        const chunk = selectedConfigs.slice(i, i + CHUNK_SIZE);
        const results = await Promise.allSettled(
          chunk.map((config) => {
            const orig = resolveBookOriginalPriceByFormat(config.book, config.targetFormat) || 100000;
            return flashSaleApi.addItem({
              flashSaleId: activeStudioSlot.id,
              bookId: config.book.id,
              originalPrice: orig,
              salePrice: config.salePrice,
              stock: config.stock,
              maxPerUser: config.maxPerUser,
              targetFormat: config.targetFormat,
            });
          }),
        );
        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value?.success) successCount++;
        });
      }

      showToast?.(` Đã gán thành công ${successCount}/${selectedConfigs.length} sách vào khung giờ Flash Sale!`, "success");
      setStudioSlotId(null);
      skipSelfBusUntilRef.current = Date.now() + 800;
      invalidateFlashSaleCache();
      realtimeSyncBus.publish('FLASH_SALE_UPDATED', { flashSaleId: activeStudioSlot.id });
      void fetchFlashSales(true);
    } catch {
      showToast?.("Có lỗi xảy ra khi gán sách hàng loạt", "error");
    } finally {
      setSubmittingBatch(false);
    }
  };

  // File input ref for banner upload
  const bannerFileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast?.("Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP, SVG)", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast?.("Dung lượng ảnh banner không được vượt quá 5MB", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCreateForm((prev) => ({ ...prev, bannerUrl: reader.result as string }));
      setCreateErrors((prev) => ({ ...prev, bannerUrl: "" }));
      showToast?.("Đã tải ảnh banner từ thiết bị thành công!", "success");
    };
    reader.readAsDataURL(file);
  };

  // Create Campaign Validation
  const validateCreateForm = () => {
    const errs: Record<string, string> = {};
    if (!createForm.name.trim()) {
      errs.name = "Tên sự kiện flash sale không được để trống.";
    } else if (createForm.name.trim().length < 5) {
      errs.name = "Tên sự kiện phải có ít nhất 5 ký tự.";
    }

    if (createForm.bannerUrl && createForm.bannerUrl.trim()) {
      const bannerVal = createForm.bannerUrl.trim();
      if (!bannerVal.startsWith("data:image/") && !bannerVal.startsWith("/") && !bannerVal.startsWith("blob:")) {
        try {
          new URL(bannerVal);
        } catch {
          errs.bannerUrl = "URL banner không đúng định dạng hợp lệ (vd: https://...).";
        }
      }
    }

    if (!createForm.registrationStartsAt) errs.registrationStartsAt = "Vui lòng chọn thời gian mở đăng ký.";
    if (!createForm.registrationEndsAt) errs.registrationEndsAt = "Vui lòng chọn thời gian kết thúc đăng ký.";
    if (!createForm.startsAt) errs.startsAt = "Vui lòng chọn thời gian bắt đầu mở bán.";
    if (!createForm.endsAt) errs.endsAt = "Vui lòng chọn thời gian kết thúc.";

    if (createForm.registrationStartsAt && createForm.registrationEndsAt) {
      const regS = new Date(createForm.registrationStartsAt).getTime();
      const regE = new Date(createForm.registrationEndsAt).getTime();
      if (regE <= regS) {
        errs.registrationEndsAt = "Thời gian kết thúc đăng ký phải sau thời gian mở đăng ký.";
      }
    }

    if (createForm.registrationEndsAt && createForm.startsAt) {
      const regE = new Date(createForm.registrationEndsAt).getTime();
      const s = new Date(createForm.startsAt).getTime();
      if (s < regE + 2 * 60 * 1000 - 5000) {
        errs.startsAt = "Thời gian bắt đầu áp dụng phải sau khi đóng đăng ký ít nhất 2 phút (thời gian đệm công bố trước cho khách hàng).";
      }
    }

    if (createForm.startsAt && createForm.endsAt) {
      const s = new Date(createForm.startsAt).getTime();
      const e = new Date(createForm.endsAt).getTime();
      if (e <= s) {
        errs.endsAt = "Thời gian kết thúc phải diễn ra sau thời gian bắt đầu áp dụng.";
      } else {
        // Validate time overlap with existing platform slots (exclude ENDED & CANCELLED)
        const overlap = flashSales.find((slot) => {
          if (slot.scope && slot.scope !== "PLATFORM") return false;
          if (slot.status === "ENDED" || slot.status === "CANCELLED") return false;
          const slotS = new Date(slot.startsAt).getTime();
          const slotE = new Date(slot.endsAt).getTime();
          return s < slotE && e > slotS;
        });
        if (overlap) {
          errs.startsAt = `Khung giờ mở bán bị trùng lặp với đợt "${overlap.name}" (${new Date(overlap.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${new Date(overlap.startsAt).toLocaleDateString()} - ${new Date(overlap.endsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${new Date(overlap.endsAt).toLocaleDateString()}). Vui lòng chọn khung giờ khác.`;
        }
      }
    }

    const minSt = Number(createForm.minStores);
    const maxSt = Number(createForm.maxStores);
    if (isNaN(minSt) || minSt < 1 || minSt > 10) {
      errs.minStores = "Số lượng cửa hàng tối thiểu phải từ 1 đến 10.";
    }
    if (isNaN(maxSt) || maxSt < 1 || maxSt > 10) {
      errs.maxStores = "Số lượng cửa hàng tối đa phải từ 1 đến 10.";
    }
    if (!errs.minStores && !errs.maxStores && minSt > maxSt) {
      errs.maxStores = "Số lượng tối đa phải lớn hơn hoặc bằng số tối thiểu.";
    }

    const discountPct = Number(createForm.discountPercent);
    if (isNaN(discountPct) || discountPct < 20 || discountPct > 80) {
      errs.discountPercent = "Số phần trăm trợ giá phải từ 20% đến 80%.";
    }

    const maxLimit = Number(createForm.maxPerUser);
    if (isNaN(maxLimit) || maxLimit < 1) {
      errs.maxPerUser = "Số lượng sản phẩm mua tối đa cho mỗi khách hàng phải từ 1 trở lên.";
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
        scope: "PLATFORM",
        registrationStartsAt: new Date(createForm.registrationStartsAt).toISOString(),
        registrationEndsAt: new Date(createForm.registrationEndsAt).toISOString(),
        startsAt: new Date(createForm.startsAt).toISOString(),
        endsAt: new Date(createForm.endsAt).toISOString(),
        minStores: Number(createForm.minStores),
        maxStores: Math.min(10, Math.max(1, Number(createForm.maxStores) || 10)),
        discountPercent: Number(createForm.discountPercent),
        maxPerUser: Number(createForm.maxPerUser),
      });

      if (res.success) {
        showToast?.(` Đã tạo thành công khung giờ "${createForm.name}"!`, "success");
        setIsCreateFormOpen(false);
        setCreateErrors({});
        setCreateForm({
          name: "",
          description: "",
          bannerUrl: "",
          registrationStartsAt: toLocalDatetimeString(),
          registrationEndsAt: toLocalDatetimeString(new Date(Date.now() + 3600000 * 2)),
          startsAt: toLocalDatetimeString(new Date(Date.now() + 3600000 * 2 + 120000)),
          endsAt: toLocalDatetimeString(new Date(Date.now() + 3600000 * 6)),
          minStores: 1,
          maxStores: 10,
          discountPercent: 30,
          maxPerUser: 1,
        });
        if (res.data) {
          setFlashSales((prev) => [res.data as FlashSaleSlot, ...prev]);
        }
        skipSelfBusUntilRef.current = Date.now() + 800;
        invalidateFlashSaleCache();
        realtimeSyncBus.publish('FLASH_SALE_UPDATED', { flashSaleId: res.data?.id });
        void fetchFlashSales(true);
      } else {
        showToast?.(res.error?.message || "Không thể tạo khung giờ Flash Sale", "error");
      }
    } catch (err: any) {
      showToast?.(err?.message || "Lỗi máy chủ khi tạo khung giờ Flash Sale", "error");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleConfirmEndEarly = async () => {
    if (!endEarlyModalSlot) return;
    setSubmittingEndEarly(true);
    const slotId = endEarlyModalSlot.id;
    const slotName = endEarlyModalSlot.name;
    try {
      const res = await flashSaleApi.endEarly(slotId);
      if (res.success) {
        showToast?.(`Đã kích hoạt kết thúc sớm 5 phút cho đợt "${slotName}"! Toàn sàn đã nhận thông báo.`, "success");
        setFlashSales((prev) =>
          prev.map((s) =>
            s.id === slotId ? { ...s, ...(res.data || {}), status: (res.data as any)?.status || s.status } : s,
          ),
        );
        setEndEarlyModalSlot(null);
        skipSelfBusUntilRef.current = Date.now() + 800;
        invalidateFlashSaleCache();
        realtimeSyncBus.publish('FLASH_SALE_UPDATED', { flashSaleId: slotId });
        void fetchFlashSales(true);
      } else {
        showToast?.(res.error?.message || "Lỗi khi kích hoạt kết thúc sớm", "error");
      }
    } catch {
      showToast?.("Lỗi kết nối khi kích hoạt kết thúc sớm", "error");
    } finally {
      setSubmittingEndEarly(false);
    }
  };

  const handleCancelSlot = useCallback((slot: FlashSaleSlot) => {
    setConfirmModal({
      kind: 'CANCEL_SLOT',
      slot,
    });
  }, []);

  // Inline edit item in slot
  const handleSaveInlineEdit = async (itemId: string) => {
    if (!editingRowData || savingRowId === itemId) return;
    const nextStock = Number(editingRowData.stock);
    setSavingRowId(itemId);
    try {
      const res = await flashSaleApi.updateItemStock(itemId, nextStock);
      if (res.success) {
        showToast?.("Đã cập nhật tồn kho khuyến mãi thành công!", "success");
        setFlashSales((prev) =>
          prev.map((s) => ({
            ...s,
            items: (s.items || []).map((it: any) => (it.id === itemId ? { ...it, stock: nextStock } : it)),
          })),
        );
        setEditingRowId(null);
        setEditingRowData(null);
        skipSelfBusUntilRef.current = Date.now() + 800;
        invalidateFlashSaleCache();
        realtimeSyncBus.publish('FLASH_SALE_UPDATED', { itemId });
        void fetchFlashSales(true);
      } else {
        showToast?.(res.error?.message || "Không thể cập nhật tồn kho khuyến mãi", "error");
      }
    } catch {
      showToast?.("Không thể cập nhật sách khuyến mãi", "error");
    } finally {
      setSavingRowId(null);
    }
  };

  // Remove item from slot and return to original state (via 5s CountdownConfirmModal)
  const handleRemoveItem = useCallback((itemId: string, bookTitle?: string) => {
    setConfirmModal({
      kind: 'REMOVE_ITEM',
      itemId,
      bookTitle,
    });
  }, []);

  const handleConfirmModalAction = async () => {
    if (!confirmModal) return;
    try {
      setSubmittingConfirmModal(true);
      if (confirmModal.kind === 'CANCEL_SLOT' && confirmModal.slot) {
        const slot = confirmModal.slot;
        const res = await flashSaleApi.cancelFlashSale(slot.id);
        if (res.success) {
          showToast?.(`Đã hủy lịch khung giờ "${slot.name}" thành công!`, "success");
          setFlashSales((prev) =>
            prev.map((s) => (s.id === slot.id ? { ...s, status: 'CANCELLED' } : s)),
          );
          setConfirmModal(null);
          skipSelfBusUntilRef.current = Date.now() + 800;
          realtimeSyncBus.publish('FLASH_SALE_UPDATED', { flashSaleId: slot.id });
          void fetchFlashSales(true);
        } else {
          showToast?.(res.error?.message || "Lỗi khi hủy khung giờ", "error");
        }
      } else if (confirmModal.kind === 'REMOVE_ITEM' && confirmModal.itemId) {
        const itemId = confirmModal.itemId;
        const res = await flashSaleApi.sellerCancelItem(itemId);
        if (res.success) {
          showToast?.("Đã xóa sách khỏi Flash Sale thành công! Sách đã trả về nguyên bản.", "success");
          setFlashSales((prev) =>
            prev.map((s) => ({
              ...s,
              items: (s.items || []).filter((it: any) => it.id !== itemId),
              totalItems: Math.max(0, (s.items || []).filter((it: any) => it.id !== itemId).length),
            })),
          );
          setConfirmModal(null);
          skipSelfBusUntilRef.current = Date.now() + 800;
          realtimeSyncBus.publish('FLASH_SALE_UPDATED', { itemId });
          invalidateFlashSaleCache();
          void fetchFlashSales(true);
        } else {
          showToast?.(res.error?.message || (res as any)?.message || "Không thể xóa sách khỏi đợt Flash Sale", "error");
        }
      }
    } catch {
      showToast?.(
        confirmModal.kind === 'CANCEL_SLOT' ? "Lỗi kết nối khi hủy khung giờ" : "Lỗi kết nối khi xóa sách",
        "error",
      );
    } finally {
      setSubmittingConfirmModal(false);
    }
  };

  const sessionColumns: Column<FlashSaleSlot>[] = useMemo(
    () => [
      {
        key: 'name',
        title: 'Đợt Flash Sale & Khung Giờ',
        width: 300,
        render: (_val, slot) => {
          const startTimeStr = new Date(slot.startsAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const endTimeStr = new Date(slot.endsAt).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          });
          const dateStr = new Date(slot.startsAt).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          return (
            <div className="py-1 space-y-1">
              <div className="font-bold text-sm text-slate-900 line-clamp-1" title={slot.name}>
                {slot.name}
              </div>
              <div className="text-xs text-slate-500 font-mono">
                {startTimeStr} – {endTimeStr} <span className="text-slate-400 font-sans">({dateStr})</span>
              </div>
              {slot.registrationStartsAt && slot.registrationEndsAt && (
                <div className="text-[11px] text-amber-700 font-mono">
                  Mở ĐK: {new Date(slot.registrationStartsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} –{' '}
                  {new Date(slot.registrationEndsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                </div>
              )}
            </div>
          );
        },
      },
      {
        key: 'policy',
        title: 'Shop & Chính Sách',
        width: 210,
        render: (_val, slot) => (
          <div className="py-1 space-y-1 text-xs">
            <div className="font-semibold text-slate-900">
              {slot.participatingStoresCount || 0}/{slot.maxStores || 10} Gian hàng
            </div>
            <div className="text-[11px] text-slate-500">
              <span className="font-semibold text-rose-600">Giảm {slot.discountPercent ?? 30}%</span>
              <span className="mx-1.5 text-slate-300">•</span>
              <span>Tối đa {slot.maxPerUser ?? 1}/khách</span>
            </div>
          </div>
        ),
      },
      {
        key: 'items',
        title: 'Ấn Phẩm Đăng Ký',
        width: 220,
        render: (_val, slot) => {
          const items = slot.items || [];
          const previewTitles = items
            .slice(0, 2)
            .map((it: any) => it.bookTitle || it.book?.title)
            .filter(Boolean);
          return (
            <div className="py-1 space-y-0.5">
              <div className="text-xs font-bold text-slate-800">{items.length} ấn phẩm</div>
              {previewTitles.length > 0 ? (
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {previewTitles.join(', ')}
                  {items.length > 2 ? ` (+${items.length - 2})` : ''}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400 italic">Chưa có sách đăng ký</p>
              )}
            </div>
          );
        },
      },
      {
        key: 'progress',
        title: 'Tiến Độ & Doanh Thu',
        width: 200,
        render: (_val, slot) => {
          const items = slot.items || [];
          const sold = items.reduce((s: number, i: any) => s + Number(i.sold || 0), 0);
          const stock = items.reduce((s: number, i: any) => s + Number(i.stock || 0), 0);
          const total = sold + stock;
          const pct = total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
          const rev = items.reduce((s: number, i: any) => s + Number(i.sold || 0) * Number(i.salePrice || 0), 0);

          return (
            <div className="py-1 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600">
                  Đã bán <strong className="text-slate-900">{sold}</strong>/{total}
                </span>
                <span className="font-mono text-slate-500">{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#00875A] rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-900">
                {rev.toLocaleString('vi-VN')} đ
              </div>
            </div>
          );
        },
      },
      {
        key: 'actions',
        title: 'Trạng Thái & Thao Tác',
        width: 240,
        align: 'right',
        render: (_val, slot) => {
          const isScheduled = slot.status === 'SCHEDULED';

          return (
            <div className="flex items-center justify-end gap-1.5 flex-nowrap whitespace-nowrap">
              <SlotStatusBadge slot={slot} />
              <SlotCountdownBadge slot={slot} onEndEarlyClick={setEndEarlyModalSlot} />
              {isScheduled && (
                <button
                  type="button"
                  onClick={() => handleCancelSlot(slot)}
                  className="px-2.5 py-1 rounded-md font-semibold text-xs cursor-pointer border transition-colors bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 whitespace-nowrap shrink-0"
                  title="Hủy lịch mở bán khung giờ này"
                >
                  Hủy Lịch
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [studioSlotId, handleOpenStudio, handleCancelSlot],
  );

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto pb-4 animate-in fade-in duration-200">
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

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              invalidateFlashSaleCache();
              fetchFlashSales(true);
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl font-bold text-xs border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all shadow-2xs shrink-0 cursor-pointer disabled:opacity-60"
            title="Làm mới danh sách khung giờ"
          >
            <span className={`material-symbols-outlined text-[16px] ${isRefreshing ? 'animate-spin text-[#00875A]' : ''}`}>
              refresh
            </span>
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => setIsCreateFormOpen(!isCreateFormOpen)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs shrink-0 cursor-pointer ${isCreateFormOpen
              ? "bg-gray-800 text-white hover:bg-gray-700"
              : "bg-[#00875A] hover:bg-[#00734c] text-white"
              }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {isCreateFormOpen ? "expand_less" : "add_circle"}
            </span>
            <span>
              {isCreateFormOpen
                ? "Đóng Form Khung Giờ"
                : "+ Thiết Lập Khung Giờ Mới Toàn Sàn"}
            </span>
          </button>
        </div>
      </div>

      {/* 1.5 PRIMARY NAVIGATION SWITCH */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setPrimaryViewMode('SLOTS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${primaryViewMode === 'SLOTS'
            ? 'bg-[#00875A] text-white shadow-xs'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          <span className="material-symbols-outlined text-[17px]">bolt</span>
          <span>Khung Giờ Flash Sale Toàn Sàn</span>
        </button>

        <button
          onClick={() => setPrimaryViewMode('PENALTY_ARBITRATION')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${primaryViewMode === 'PENALTY_ARBITRATION'
            ? 'bg-purple-700 text-white shadow-xs'
            : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
        >
          <span className="material-symbols-outlined text-[17px]">stars</span>
          <span>Kiểm Soát Sao Quả Tạ & Thẩm Định Kháng Nghị</span>
          {pendingAppealsCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {pendingAppealsCount} chờ duyệt
            </span>
          )}
        </button>
      </div>

      {primaryViewMode === 'PENALTY_ARBITRATION' ? (
        <AdminPenaltyArbitrationView />
      ) : (
        <>
          {/* 2. 4 TOP KPI METRIC CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-2xs flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                <span className="material-symbols-outlined text-2xl">local_fire_department</span>
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
                      Khởi tạo phiên giờ vàng toàn sàn với bộ 4 mốc thời gian chuẩn và giới hạn số lượng Shop tham gia
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsCreateFormOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleCreateCampaign} className="space-y-4 pt-4 text-xs">
                {/* Thông tin cơ bản */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Tên Chương Trình / Sự Kiện <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Flash Sale Toàn Sàn Giờ Vàng 20:00 - 24:00"
                      value={createForm.name}
                      onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-bold text-xs focus:border-[#00875A] focus:outline-none"
                    />
                    {createErrors.name && (
                      <p className="text-red-500 text-[10.5px] mt-1">{createErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Mô Tả Chương Trình</label>
                    <input
                      type="text"
                      placeholder="VD: Săn sale sách best-seller giảm sâu tới 50%"
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 text-xs focus:border-[#00875A] focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-gray-700 font-bold">Ảnh Banner Khung Giờ</label>
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="text-[11px] font-bold text-[#00875A] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">cloud_upload</span>
                        <span>Tải ảnh từ máy</span>
                      </button>
                    </div>

                    <input
                      type="file"
                      ref={bannerFileInputRef}
                      accept="image/*"
                      onChange={handleBannerFileUpload}
                      className="hidden"
                    />

                    <div className="relative flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="https://... hoặc tải từ máy"
                        value={createForm.bannerUrl}
                        onChange={(e) => setCreateForm({ ...createForm, bannerUrl: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-300 font-mono text-xs focus:border-[#00875A] focus:outline-none"
                      />
                      {createForm.bannerUrl && (
                        <button
                          type="button"
                          onClick={() => setCreateForm({ ...createForm, bannerUrl: "" })}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                          title="Xóa ảnh"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      )}
                    </div>

                    {createForm.bannerUrl && (
                      <div className="mt-2 relative w-full h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 shadow-2xs group">
                        <img
                          src={createForm.bannerUrl}
                          alt="Banner Preview"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
                          <button
                            type="button"
                            onClick={() => bannerFileInputRef.current?.click()}
                            className="px-2 py-1 rounded bg-white/30 backdrop-blur-md text-[10.5px] font-bold hover:bg-white/50 cursor-pointer"
                          >
                            Đổi ảnh khác
                          </button>
                          <button
                            type="button"
                            onClick={() => setCreateForm({ ...createForm, bannerUrl: "" })}
                            className="px-2 py-1 rounded bg-red-600/80 backdrop-blur-md text-[10.5px] font-bold hover:bg-red-600 cursor-pointer"
                          >
                            Gỡ ảnh
                          </button>
                        </div>
                      </div>
                    )}

                    {createErrors.bannerUrl && (
                      <p className="text-red-500 text-[10.5px] mt-1">{createErrors.bannerUrl}</p>
                    )}
                  </div>
                </div>

                {/* Cấu hình Trợ Giá Sàn & Giới hạn mua mỗi khách hàng */}
                <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">percent</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">Mức Trợ Giá Sàn & Giới Hạn Mua / Khách</h4>
                      <p className="text-[11px] text-gray-500">
                        Sàn quy định % giảm (20% - 80%) và số lượng tối đa mỗi khách được mua cho toàn bộ sách trong đợt
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div>
                      <label className="block text-[11px] text-gray-600 font-bold mb-0.5">% Trợ Giá Sàn (20-80%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={20}
                          max={80}
                          value={createForm.discountPercent}
                          onChange={(e) => setCreateForm({ ...createForm, discountPercent: Number(e.target.value) })}
                          className="w-24 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white font-mono font-bold text-xs text-center focus:border-[#00875A] focus:outline-none"
                        />
                        <span className="absolute right-2 top-1.5 text-gray-400 text-xs pointer-events-none">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 font-bold mb-0.5">Max/Khách (Tối thiểu 1)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          value={createForm.maxPerUser}
                          onChange={(e) => setCreateForm({ ...createForm, maxPerUser: Number(e.target.value) })}
                          className="w-24 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white font-mono font-bold text-xs text-center focus:border-[#00875A] focus:outline-none"
                        />
                        <span className="absolute right-2 top-1.5 text-gray-400 text-[10px] pointer-events-none">cuốn</span>
                      </div>
                    </div>
                  </div>
                </div>
                {(createErrors.discountPercent || createErrors.maxPerUser) && (
                  <p className="text-red-500 text-[10.5px]">{createErrors.discountPercent || createErrors.maxPerUser}</p>
                )}

                {/* Giới hạn số lượng cửa hàng tham gia */}
                <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">storefront</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-xs">Giới Hạn Số Lượng Cửa Hàng Tham Gia (Shop Quota)</h4>
                      <p className="text-[11px] text-gray-500">
                        Quy chuẩn sàn: Tối thiểu 1 Shop, tối đa 10 Shop tham gia vào đợt Flash Sale này
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div>
                      <label className="block text-[11px] text-gray-600 font-bold mb-0.5">Tối thiểu (Shop)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={createForm.minStores}
                        onChange={(e) => setCreateForm({ ...createForm, minStores: Number(e.target.value) })}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white font-mono font-bold text-xs text-center focus:border-[#00875A] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-600 font-bold mb-0.5">Tối đa (Shop)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={createForm.maxStores}
                        onChange={(e) => setCreateForm({ ...createForm, maxStores: Number(e.target.value) })}
                        className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-300 bg-white font-mono font-bold text-xs text-center focus:border-[#00875A] focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                {(createErrors.minStores || createErrors.maxStores) && (
                  <p className="text-red-500 text-[10.5px]">{createErrors.minStores || createErrors.maxStores}</p>
                )}

                {/* Bộ 4 mốc thời gian */}
                <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-[#00875A]">schedule</span>
                      <span>Thiết Lập Bộ 4 Mốc Thời Gian Chuẩn Cho Sàn</span>
                    </span>
                    <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 font-medium">
                      2 phút đệm công bố teaser cho khách hàng giữa Đóng ĐK & Mở Bán
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        1. Mở Đăng Ký Cho Shop <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={createForm.registrationStartsAt}
                        onChange={(e) => setCreateForm({ ...createForm, registrationStartsAt: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-gray-300 font-mono text-xs focus:border-[#00875A] focus:outline-none"
                      />
                      {createErrors.registrationStartsAt && (
                        <p className="text-red-500 text-[10px] mt-0.5">{createErrors.registrationStartsAt}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        2. Đóng Cổng Đăng Ký <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={createForm.registrationEndsAt}
                        onChange={(e) => {
                          const newRegEnd = e.target.value;
                          const regEndTime = new Date(newRegEnd).getTime();
                          const currentStartTime = new Date(createForm.startsAt).getTime();
                          let updatedStartsAt = createForm.startsAt;
                          if (currentStartTime < regEndTime + 120000) {
                            updatedStartsAt = new Date(regEndTime + 120000).toISOString().slice(0, 16);
                          }
                          setCreateForm({
                            ...createForm,
                            registrationEndsAt: newRegEnd,
                            startsAt: updatedStartsAt,
                          });
                        }}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-gray-300 font-mono text-xs focus:border-[#00875A] focus:outline-none"
                      />
                      {createErrors.registrationEndsAt && (
                        <p className="text-red-500 text-[10px] mt-0.5">{createErrors.registrationEndsAt}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        3. Bắt Đầu Mở Bán <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={createForm.startsAt}
                        onChange={(e) => setCreateForm({ ...createForm, startsAt: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-gray-300 font-mono text-xs focus:border-[#00875A] focus:outline-none"
                      />
                      {createErrors.startsAt && (
                        <p className="text-red-500 text-[10px] mt-0.5">{createErrors.startsAt}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-gray-700 font-bold mb-1">
                        4. Kết Thúc Flash Sale <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={createForm.endsAt}
                        onChange={(e) => setCreateForm({ ...createForm, endsAt: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-gray-300 font-mono text-xs focus:border-[#00875A] focus:outline-none"
                      />
                      {createErrors.endsAt && (
                        <p className="text-red-500 text-[10px] mt-0.5">{createErrors.endsAt}</p>
                      )}
                    </div>
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
                    className="px-5 py-2 rounded-xl bg-[#00875A] hover:bg-[#00734c] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    {submittingCreate ? (
                      <>
                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                        <span>Đang Khởi Tạo...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">bolt</span>
                        <span>Tạo Khung Giờ Flash Sale Sàn</span>
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === tab.id
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


          {/* 6. STANDARDIZED GROUPED DATA TABLE (1-1 SYNC WITH SELLER FLASH SALE) */}
          <div className="w-full max-w-full min-w-0">
            <GroupedDataTable<FlashSaleSlot>
              columns={sessionColumns}
              data={sortedFlashSales}
              keyField="id"
              loading={loading}
              emptyTitle="Chưa có khung giờ Flash Sale nào trong mục này"
              emptyMessage='Bấm "+ Thiết Lập Khung Giờ Mới Toàn Sàn" để mở phiên giờ vàng đầu tiên!'
              emptyIcon="bolt"
              pagination={{
                currentPage,
                totalItems: sortedFlashSales.length,
                pageSize,
                onPageChange: setCurrentPage,
                itemLabel: 'phiên Flash Sale',
              }}
              expandable={true}
              expandedRowKeys={expandedRowKeys}
              onExpandedRowsChange={setExpandedRowKeys}
              expandedRowRender={(slot) => {
                const items = slot.items || [];
                if (items.length === 0) {
                  return (
                    <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/70 text-xs text-slate-500">
                      Chưa có gian hàng nào đăng ký sách vào khung giờ này. Seller sẽ tự chọn sách tham gia tại Kênh Người Bán trước hạn chót đăng ký.
                    </div>
                  );
                }

                return (
                  <div className="bg-white rounded-2xl border border-slate-200/80 overflow-x-auto shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse min-w-[920px]">
                      <thead className="bg-[#003B2B] text-[10.5px] font-bold text-white uppercase tracking-wider border-b border-[#00281D]">
                        <tr>
                          <th className="py-2.5 px-3 whitespace-nowrap w-12 text-center">STT</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Tác phẩm &amp; Mã</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">Giá Gốc</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">Giá Flash Sale</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-center">Giảm Giá</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-center">Tồn kho KM</th>
                          <th className="py-2.5 px-3 whitespace-nowrap">Tiến Độ Bán</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-center">Hạn Mức/Khách</th>
                          <th className="py-2.5 px-3 whitespace-nowrap text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item: any, idx: number) => {
                          const isEditing = editingRowId === item.id;
                          const displayTitle = item.bookTitle || item.book?.title || `Sách #${String(item.bookId || '').slice(0, 8)}`;
                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FAFB]'} hover:bg-emerald-50/40`}
                            >
                              <td className="py-2.5 px-3 whitespace-nowrap text-center font-mono text-[11px] text-gray-400">
                                {idx + 1}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-gray-900 block break-words line-clamp-2 leading-snug">
                                  {displayTitle}
                                </span>
                                <span className="font-mono text-[10px] text-gray-400">
                                  Mã: #{String(item.bookId || '').slice(0, 8)}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-right text-gray-400 line-through font-mono">
                                {Number(item.originalPrice || 0).toLocaleString("vi-VN")}₫
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-right font-extrabold text-rose-600 font-mono">
                                {Number(item.salePrice || 0).toLocaleString("vi-VN")}₫
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-center font-bold text-emerald-600">
                                -{item.discountPercent ?? slot.discountPercent ?? 0}%
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-center font-semibold text-gray-800">
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={editingRowData?.stock ?? 0}
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
                              <td className="py-2.5 px-3 whitespace-nowrap">
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
                              <td className="py-2.5 px-3 whitespace-nowrap text-center">
                                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-[10.5px] border border-amber-200">
                                  Max {item.maxPerUser || 1} cuốn
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-right">
                                {isEditing ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      disabled={savingRowId === item.id}
                                      onClick={() => handleSaveInlineEdit(item.id)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                                    >
                                      {savingRowId === item.id ? "Đang lưu..." : "Lưu"}
                                    </button>
                                    <button
                                      type="button"
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
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
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
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveItem(item.id, displayTitle)}
                                      title="Xóa sách này khỏi khung giờ Flash Sale (Trả về nguyên bản)"
                                      className="px-2 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-0.5"
                                    >
                                      <span className="material-symbols-outlined text-[13px]">delete</span>
                                      <span>Xóa</span>
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              }}
            />
          </div>
        </>
      )}
      {/* MODAL XÁC NHẬN KẾT THÚC SỚM (5 PHÚT) */}
      {endEarlyModalSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">alarm_off</span>
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Kết Thúc Sớm Flash Sale (5 Phút)</h3>
                  <p className="text-[11px] text-gray-500 font-medium truncate max-w-[240px]">{endEarlyModalSlot.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEndEarlyModalSlot(null)}
                className="text-gray-400 hover:text-gray-600 rounded-lg p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="my-4 space-y-3">
              <p className="text-xs text-gray-700 leading-relaxed">
                Bạn có chắc chắn muốn kích hoạt <strong>kết thúc sớm sau 5 phút</strong> cho khung giờ Flash Sale này không?
              </p>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                  <span className="material-symbols-outlined text-sm">notifications_active</span>
                  <span>Quy trình đóng phiên an toàn (Chuẩn TMĐT)</span>
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  • <strong>Người mua</strong>: Nhận thông báo đếm ngược 5 phút để hoàn tất thanh toán giỏ hàng.<br />
                  • <strong>Shop tham gia</strong>: Nhận thông báo phiên sắp đóng để chốt các đơn hàng phát sinh.<br />
                  • <strong>Sau 5 phút</strong>: Khung giờ tự động kết thúc vĩnh viễn (ĐÃ KẾT THÚC), giá sách quay về niêm yết.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEndEarlyModalSlot(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={submittingEndEarly}
                onClick={handleConfirmEndEarly}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {submittingEndEarly ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang kích hoạt...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">alarm_off</span>
                    <span>Xác Nhận Đóng Sau 5 Phút</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN ĐẾM NGƯỢC 5S (HỦY LỊCH / XÓA SÁCH) */}
      <CountdownConfirmModal
        isOpen={Boolean(confirmModal)}
        title={
          confirmModal?.kind === 'CANCEL_SLOT'
            ? 'Xác nhận hủy lịch Flash Sale toàn sàn'
            : 'Xác nhận xóa sách khỏi khung giờ Flash Sale'
        }
        description={
          confirmModal?.kind === 'CANCEL_SLOT' ? (
            <span>
              Bạn có chắc chắn muốn hủy lịch mở bán khung giờ{' '}
              <strong className="text-slate-900">&quot;{confirmModal?.slot?.name}&quot;</strong>?
              Đợt sẽ chuyển sang trạng thái <strong>ĐÃ HỦY</strong> và lưu vết lịch sử.
            </span>
          ) : (
            <span>
              Bạn có chắc chắn muốn xóa cuốn sách{' '}
              <strong className="text-slate-900">&quot;{confirmModal?.bookTitle || 'này'}&quot;</strong>{' '}
              khỏi khung giờ Flash Sale? Sách sẽ được trả về trạng thái nguyên bản ngay lập tức.
            </span>
          )
        }
        countdownSeconds={5}
        confirmLabel={
          confirmModal?.kind === 'CANCEL_SLOT' ? 'Xác nhận hủy lịch' : 'Xác nhận xóa sách'
        }
        cancelLabel="Giữ lại"
        loading={submittingConfirmModal}
        onConfirm={handleConfirmModalAction}
        onCancel={() => {
          if (!submittingConfirmModal) setConfirmModal(null);
        }}
      />
    </div>
  );
}