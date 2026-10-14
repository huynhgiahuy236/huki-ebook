'use client';

/**
 * HUKI EBOOK - Seller Flash Sale High-Detail Management Studio
 * 100% In-Page Expansions, Session-Based Grouping, Horizontal Scrollable Tables
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { catalogApi, type BookData } from '@/ui/api/catalogApi';
import { businessApi } from '@/ui/api/businessApi';
import { flashSaleApi, type FlashSaleSlot } from '@/ui/api/flashSaleApi';
import {
  SellerFilterTabs,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';
import {
  sellerPenaltyService,
  PENALTY_TIER_CONFIG,
  type StorePenaltyProfile,
  type EligibilityChecklistItem,
  type PenaltyTier,
  type ViolationType,
} from '@/ui/services/sellerPenaltyService';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

interface ConfiguredBookItem {
  book: BookData;
  isSelected: boolean;
  salePrice: number;
  stock: number;
  maxPerUser: number;
}

export function SellerFlashSaleView() {
  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();

  const currentStoreId = user?.business?.id || activeBusinessId || 'shop-demo';

  // Sao Quả Tạ & Platform Flash Sale Eligibility State
  const [penaltyProfile, setPenaltyProfile] = useState<StorePenaltyProfile>(() =>
    sellerPenaltyService.getProfile(user?.business?.id || activeBusinessId || 'shop-demo')
  );
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [policyActiveTab, setPolicyActiveTab] = useState<'CHECKLIST' | 'TIERS' | 'APPEALS' | 'SIMULATOR'>('CHECKLIST');
  const [appealViolationId, setAppealViolationId] = useState<string>('');
  const [appealReason, setAppealReason] = useState<string>('');
  const [appealProof, setAppealProof] = useState<string>('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);

  // Sync Penalty Profile Realtime via SyncBus
  useEffect(() => {
    const freshProfile = sellerPenaltyService.getProfile(currentStoreId);
    setPenaltyProfile(freshProfile);

    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'SELLER_PENALTY_UPDATED') {
        const payload = msg.payload as any;
        if (!payload?.storeId || payload.storeId === currentStoreId) {
          setPenaltyProfile(sellerPenaltyService.getProfile(currentStoreId));
        }
      }
    });

    return () => unsubscribe();
  }, [currentStoreId]);

  // Dynamic Eligibility & Checklist
  const platformEligibility = useMemo(() => {
    return sellerPenaltyService.canJoinPlatformFlashSale(currentStoreId);
  }, [penaltyProfile, currentStoreId]);

  const eligibilityChecklist = useMemo(() => {
    return sellerPenaltyService.buildEligibilityChecklist(currentStoreId);
  }, [penaltyProfile, currentStoreId]);

  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<FlashSaleSlot[]>([]);
  const [myItems, setMyItems] = useState<any[]>([]);
  const [rawBooks, setRawBooks] = useState<BookData[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  // In-Page Multi-Book Registration Studio State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [slotMode, setSlotMode] = useState<'CUSTOM' | 'EXISTING'>('CUSTOM');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [customSlotName, setCustomSlotName] = useState<string>('Flash Sale Giờ Vàng Shop');
  const [customDescription, setCustomDescription] = useState<string>('');

  const getInitialTimes = () => {
    const now = new Date();
    // Must be at least 2 minutes in the future for warm-up / teaser period
    const start = new Date(now.getTime() + 2 * 60 * 1000 + 10 * 1000);
    const end = new Date(start.getTime() + 4 * 60 * 60 * 1000); // 4 hours
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      startsAt: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`,
      endsAt: `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`,
    };
  };

  const getMinStartsAt = () => {
    const minDate = new Date(Date.now() + 2 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${minDate.getFullYear()}-${pad(minDate.getMonth() + 1)}-${pad(minDate.getDate())}T${pad(minDate.getHours())}:${pad(minDate.getMinutes())}`;
  };

  const handleSetStartNow = () => {
    const freshTimes = getInitialTimes();
    setCustomStartsAt(freshTimes.startsAt);
    setCustomEndsAt(freshTimes.endsAt);
    showToast('Đã thiết lập thời gian bắt đầu sau 2 phút (theo quy định công bố tối thiểu)! ⏳', 'info');
  };

  const [customStartsAt, setCustomStartsAt] = useState<string>(() => getInitialTimes().startsAt);
  const [customEndsAt, setCustomEndsAt] = useState<string>(() => getInitialTimes().endsAt);

  // Check if current seller already has an active or scheduled Flash Sale slot of their OWN SHOP (scope === SHOP)
  const existingShopSlot = useMemo(() => {
    const now = Date.now();
    // 1. Check in loaded slots array for SHOP scope
    const foundInSlots = slots.find((s) => {
      const isShop = s.scope === 'SHOP';
      const endsAt = new Date(s.endsAt || 0).getTime();
      return isShop && endsAt > now && s.status !== 'ENDED' && s.status !== 'CANCELLED';
    });
    if (foundInSlots) return foundInSlots;

    // 2. Also check across myItems belonging to SHOP flash sales
    for (const item of myItems) {
      const fs = item.flashSale;
      const isShop = (fs?.scope || item.scope) === 'SHOP';
      const endsAt = new Date(fs?.endsAt || item.endsAt || 0).getTime();
      const status = fs?.status || item.status;
      if (isShop && endsAt > now && status !== 'ENDED' && status !== 'CANCELLED') {
        return {
          id: fs?.id || item.flashSaleId || 'current-slot',
          name: fs?.name || item.flashSaleName || 'Flash Sale hiện tại của Shop',
          startsAt: fs?.startsAt || item.startsAt,
          endsAt: fs?.endsAt || item.endsAt,
          status: status || 'ACTIVE',
        };
      }
    }
    return null;
  }, [slots, myItems]);

  // Live timestamp ticker for accurate countdowns
  const [nowMs, setNowMs] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Platform Flash Sale Slot currently active, registering or scheduled
  const platformSlot = useMemo(() => {
    return (
      slots.find((s) => {
        const isPlatform = s.scope === 'PLATFORM' || !s.storeId;
        const endsAt = new Date(s.endsAt || 0).getTime();
        return isPlatform && endsAt > nowMs && s.status !== 'ENDED' && s.status !== 'CANCELLED';
      }) || null
    );
  }, [slots, nowMs]);

  // Conflict checker for each book based on active/scheduled sessions
  const bookConflictMap = useMemo(() => {
    const conflictMap = new Map<
      string,
      {
        hasConflict: boolean;
        conflictScope: 'PLATFORM' | 'SHOP';
        conflictSessionName: string;
      }
    >();

    const targetStart =
      slotMode === 'CUSTOM'
        ? new Date(customStartsAt).getTime()
        : new Date(slots.find((s) => s.id === selectedSlotId)?.startsAt || 0).getTime();
    const targetEnd =
      slotMode === 'CUSTOM'
        ? new Date(customEndsAt).getTime()
        : new Date(slots.find((s) => s.id === selectedSlotId)?.endsAt || 0).getTime();
    const targetId = slotMode === 'CUSTOM' ? null : selectedSlotId;

    if (!targetStart || !targetEnd || isNaN(targetStart) || isNaN(targetEnd)) {
      return conflictMap;
    }

    myItems.forEach((item) => {
      const fs = item.flashSale || {};
      const fsId = item.flashSaleId || fs.id;
      if (fsId && targetId && fsId === targetId) return;

      const status = fs.status || item.status || 'SCHEDULED';
      if (status === 'ENDED' || status === 'CANCELLED') return;

      const fsStart = new Date(fs.startsAt || item.startsAt || 0).getTime();
      const fsEnd = new Date(fs.endsAt || item.endsAt || 0).getTime();

      // Overlap condition: (targetStart < fsEnd && targetEnd > fsStart)
      if (targetStart < fsEnd && targetEnd > fsStart) {
        const scope = fs.scope || item.scope || (fs.storeId ? 'SHOP' : 'PLATFORM');
        conflictMap.set(item.bookId, {
          hasConflict: true,
          conflictScope: scope === 'PLATFORM' ? 'PLATFORM' : 'SHOP',
          conflictSessionName: fs.name || item.flashSaleName || 'Flash Sale khác',
        });
      }
    });

    return conflictMap;
  }, [slotMode, customStartsAt, customEndsAt, selectedSlotId, slots, myItems]);

  const formatCountdown = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const [bookConfigMap, setBookConfigMap] = useState<Record<string, ConfiguredBookItem>>({});
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [bookCategoryFilter, setBookCategoryFilter] = useState<string>('ALL');
  const [bookFormatFilter, setBookFormatFilter] = useState<string>('ALL');

  // Bulk Tool Inputs
  const [bulkDiscountPercent, setBulkDiscountPercent] = useState<string>('30');
  const [bulkStockQuota, setBulkStockQuota] = useState<string>('10');
  const [bulkMaxPerUser, setBulkMaxPerUser] = useState<string>('1');
  const [bulkTargetCategory, setBulkTargetCategory] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Inline Editing State (100% In-Page, Zero Modal)
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingRowData, setEditingRowData] = useState<{
    salePrice: number;
    stock: number;
    maxPerUser: number;
    originalPrice: number;
    availableStock: number;
  } | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);

  // View Platform Registered Books Detail Modal / Drawer State
  const [viewPlatformDetailSlot, setViewPlatformDetailSlot] = useState<FlashSaleSlot | null>(null);

  // Selected existing slot in Studio
  const selectedExistingSlot = useMemo(() => {
    return slots.find((s) => s.id === selectedSlotId) || null;
  }, [slots, selectedSlotId]);

  const isPlatformScope = useMemo(() => {
    return (
      slotMode === 'EXISTING' &&
      Boolean(
        selectedExistingSlot &&
        (selectedExistingSlot.scope === 'PLATFORM' || !selectedExistingSlot.storeId),
      )
    );
  }, [slotMode, selectedExistingSlot]);

  const platformDiscountPercent = selectedExistingSlot?.discountPercent ?? 30;
  const platformMaxPerUser = selectedExistingSlot?.maxPerUser ?? 1;

  // Platform Registered My Items (items from this shop in the active platform slot)
  const platformRegisteredMyItems = useMemo(() => {
    if (!platformSlot) return [];
    return myItems.filter(
      (it) => it.flashSaleId === platformSlot.id || it.flashSale?.id === platformSlot.id,
    );
  }, [myItems, platformSlot]);

  // Sao Quả Tạ & Live Appeal Handlers
  const handleSimulateViolation = (
    type: ViolationType,
    points: number,
    reason: string,
    evidence?: string
  ) => {
    const updated = sellerPenaltyService.applyViolation(
      currentStoreId,
      type,
      points,
      reason,
      evidence
    );
    setPenaltyProfile(updated);
    showToast(`Đã áp dụng vi phạm (+${points} điểm Sao Quả Tạ)!`, 'warning');
  };

  const handleSimulateResetQuarter = () => {
    const updated = sellerPenaltyService.resetQuarterly(currentStoreId);
    setPenaltyProfile(updated);
    showToast('Đã làm mới điểm Sao Quả Tạ về 0 theo chu kỳ Quý! 🎉', 'success');
  };

  const handleSubmitAppeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealViolationId) {
      showToast('Vui lòng chọn vi phạm cần khiếu nại', 'warning');
      return;
    }
    if (!appealReason.trim()) {
      showToast('Vui lòng nhập lý do giải trình khiếu nại', 'warning');
      return;
    }

    setAppealSubmitting(true);
    const res = sellerPenaltyService.submitAppeal(
      currentStoreId,
      appealViolationId,
      appealReason.trim(),
      appealProof.trim() || undefined
    );
    setAppealSubmitting(false);

    if (res.success) {
      showToast(res.message, 'success');
      setAppealViolationId('');
      setAppealReason('');
      setAppealProof('');
      setPenaltyProfile(sellerPenaltyService.getProfile(currentStoreId));
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleArbitrateAppeal = (violationId: string, isApproved: boolean) => {
    const res = sellerPenaltyService.arbitrateAppeal(
      currentStoreId,
      violationId,
      isApproved,
      isApproved
        ? 'Admin HuKi xác nhận bằng chứng hợp lệ. Đã thu hồi điểm phạt.'
        : 'Admin HuKi từ chối: Bằng chứng chưa đủ căn cứ chứng minh lý do bất khả kháng.'
    );
    if (res.success) {
      showToast(res.message, isApproved ? 'success' : 'info');
      setPenaltyProfile(sellerPenaltyService.getProfile(currentStoreId));
    } else {
      showToast(res.message, 'error');
    }
  };

  // Inline 5s Countdown Cancel Button State (100% In-Page, Zero Modal)
  const [cancelCountdownState, setCancelCountdownState] = useState<{
    itemId: string;
    secondsLeft: number;
  } | null>(null);

  // Countdown timer for inline cancellation safety
  useEffect(() => {
    let timer: any = null;
    if (cancelCountdownState && cancelCountdownState.secondsLeft > 0) {
      timer = setInterval(() => {
        setCancelCountdownState((prev) => {
          if (!prev || prev.secondsLeft <= 1) {
            clearInterval(timer);
            return prev ? { ...prev, secondsLeft: 0 } : null;
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cancelCountdownState?.itemId, cancelCountdownState?.secondsLeft]);

  // Load All Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

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

      const [slotsRes, itemsRes, booksSellerRes] = await Promise.all([
        flashSaleApi.getSellerSlots(),
        flashSaleApi.getSellerMyItems(),
        catalogApi.getSellerBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) }).catch(() => null),
      ]);

      if (slotsRes.success && slotsRes.data) {
        const raw = slotsRes.data as any;
        const slotsData = Array.isArray(raw)
          ? raw
          : Array.isArray(raw.slots)
          ? raw.slots
          : Array.isArray(raw.items)
          ? raw.items
          : [];
        setSlots(slotsData);
        if (slotsData.length > 0) {
          setSelectedSlotId((prev) => prev || slotsData[0].id);
        }
      }
      if (itemsRes.success && itemsRes.data) {
        const itemsData = Array.isArray(itemsRes.data)
          ? itemsRes.data
          : Array.isArray((itemsRes.data as any)?.items)
          ? (itemsRes.data as any).items
          : [];
        setMyItems(itemsData);
      }

      let books: BookData[] = [];
      if (booksSellerRes?.success && booksSellerRes.data) {
        books = Array.isArray(booksSellerRes.data)
          ? booksSellerRes.data
          : Array.isArray((booksSellerRes.data as any)?.items)
          ? (booksSellerRes.data as any).items
          : [];
      }

      const finalBooks = bizId
        ? books.filter((b) => {
            const bStore = b.storeId || b.businessId || (b as any).business?.id;
            return !bStore || bStore === bizId;
          })
        : books;

      setRawBooks(finalBooks);

      // Initialize Book Config Map for Multi-Selection
      const initialMap: Record<string, ConfiguredBookItem> = {};
      finalBooks.forEach((b) => {
        const origPrice = Number(b.price || 100000);
        const defaultSale = Math.max(1000, Math.round(origPrice * 0.7)); // default 30% off
        const avail = Number((b as any).available ?? b.physicalDetails?.stock ?? (b as any).stock ?? 20);
        initialMap[b.id] = {
          book: b,
          isSelected: false,
          salePrice: defaultSale,
          stock: Math.min(10, Math.max(1, avail)),
          maxPerUser: 1,
        };
      });
      setBookConfigMap(initialMap);
    } catch (err: any) {
      showToast('Không thể tải dữ liệu Flash Sale: ' + (err?.message || 'Lỗi mạng'), 'error');
    } finally {
      setLoading(false);
    }
  }, [user, activeBusinessId, setActiveBusinessId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Categories list extracted from books
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    rawBooks.forEach((b) => {
      const name = b.category?.name || (b as any).categoryName || (b as any).category;
      if (name && typeof name === 'string') set.add(name);
    });
    return Array.from(set);
  }, [rawBooks]);

  // Filtered Books in Studio
  const studioBooks = useMemo(() => {
    return rawBooks.filter((b) => {
      const matchSearch =
        !bookSearchQuery ||
        b.title.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
        (b.author?.name || (b as any).author || '').toLowerCase().includes(bookSearchQuery.toLowerCase());

      const catName = b.category?.name || (b as any).categoryName || (b as any).category;
      const matchCategory = bookCategoryFilter === 'ALL' || catName === bookCategoryFilter;

      const format = b.format || 'PHYSICAL';
      const matchFormat =
        bookFormatFilter === 'ALL' ||
        (bookFormatFilter === 'PHYSICAL' && format === 'PHYSICAL') ||
        (bookFormatFilter === 'DIGITAL' && (format === 'DIGITAL' || format === 'BOTH'));

      return matchSearch && matchCategory && matchFormat;
    });
  }, [rawBooks, bookSearchQuery, bookCategoryFilter, bookFormatFilter]);

  // Selected Count
  const selectedBooksList = useMemo(() => {
    return Object.values(bookConfigMap).filter((item) => item.isSelected);
  }, [bookConfigMap]);

  const isAllStudioSelected = useMemo(() => {
    if (studioBooks.length === 0) return false;
    return studioBooks.every((b) => bookConfigMap[b.id]?.isSelected);
  }, [studioBooks, bookConfigMap]);

  // Toggle single book selection
  const handleToggleSelectBook = (bookId: string) => {
    const conflict = bookConflictMap.get(bookId);
    if (conflict?.hasConflict) {
      showToast(
        `Sách này đang tham gia đợt "${conflict.conflictSessionName}" (${conflict.conflictScope === 'PLATFORM' ? 'Flash Sale Sàn' : 'Flash Sale Shop'}) trong cùng khung giờ, không thể chọn!`,
        'warning'
      );
      return;
    }

    const currentItem = bookConfigMap[bookId];
    // Platform Flash Sale Sao Quả Tạ Eligibility & Quota Guard
    if (isPlatformScope && currentItem && !currentItem.isSelected) {
      if (!platformEligibility.eligible) {
        showToast(
          platformEligibility.reason || 'Gian hàng không đủ điều kiện tham gia Flash Sale Sàn!',
          'error'
        );
        setIsPolicyModalOpen(true);
        return;
      }
      if (selectedBooksList.length >= penaltyProfile.maxBooksPerPlatformSlot) {
        showToast(
          `Cấp Sao Quả Tạ hiện tại của bạn chỉ cho phép tối đa ${penaltyProfile.maxBooksPerPlatformSlot} cuốn sách trong đợt Flash Sale Sàn!`,
          'warning'
        );
        return;
      }
    }

    setBookConfigMap((prev) => {
      const current = prev[bookId];
      if (!current) return prev;
      const nextSelected = !current.isSelected;
      let nextSalePrice = current.salePrice;
      let nextMaxPerUser = current.maxPerUser;

      if (nextSelected && isPlatformScope) {
        const orig = Number(current.book.price || 0);
        nextSalePrice = Math.max(1, Math.round(orig * (1 - platformDiscountPercent / 100)));
        nextMaxPerUser = platformMaxPerUser;
      }

      return {
        ...prev,
        [bookId]: {
          ...current,
          isSelected: nextSelected,
          salePrice: nextSalePrice,
          maxPerUser: nextMaxPerUser,
        },
      };
    });
  };

  // Toggle select all in current filtered view (ignoring conflicted books, honoring penalty quota)
  const handleToggleSelectAll = () => {
    const selectableBooks = studioBooks.filter((b) => !bookConflictMap.get(b.id)?.hasConflict);
    const nextVal = !isAllStudioSelected;

    if (nextVal && isPlatformScope) {
      if (!platformEligibility.eligible) {
        showToast(
          platformEligibility.reason || 'Gian hàng không đủ điều kiện tham gia Flash Sale Sàn!',
          'error'
        );
        setIsPolicyModalOpen(true);
        return;
      }
    }

    setBookConfigMap((prev) => {
      const updated = { ...prev };
      let selectedCount = 0;
      const maxAllowed = isPlatformScope ? penaltyProfile.maxBooksPerPlatformSlot : 99999;

      selectableBooks.forEach((b) => {
        if (updated[b.id]) {
          if (nextVal) {
            if (selectedCount < maxAllowed) {
              const orig = Number(updated[b.id].book.price || 0);
              const nextSalePrice = isPlatformScope
                ? Math.max(1, Math.round(orig * (1 - platformDiscountPercent / 100)))
                : updated[b.id].salePrice;
              const nextMaxPerUser = isPlatformScope ? platformMaxPerUser : updated[b.id].maxPerUser;

              updated[b.id] = {
                ...updated[b.id],
                isSelected: true,
                salePrice: nextSalePrice,
                maxPerUser: nextMaxPerUser,
              };
              selectedCount++;
            } else {
              updated[b.id] = { ...updated[b.id], isSelected: false };
            }
          } else {
            updated[b.id] = { ...updated[b.id], isSelected: false };
          }
        }
      });
      return updated;
    });

    if (nextVal && isPlatformScope && selectableBooks.length > penaltyProfile.maxBooksPerPlatformSlot) {
      showToast(
        `Đã tự động chọn tối đa ${penaltyProfile.maxBooksPerPlatformSlot} cuốn sách theo hạn mức Sao Quả Tạ!`,
        'info'
      );
    }
  };

  // Update a single field on a book
  const handleUpdateBookField = (
    bookId: string,
    field: 'salePrice' | 'stock' | 'maxPerUser',
    val: number
  ) => {
    if (isPlatformScope && (field === 'salePrice' || field === 'maxPerUser')) {
      return; // Locked by platform campaign
    }
    setBookConfigMap((prev) => {
      const current = prev[bookId];
      if (!current) return prev;
      return {
        ...prev,
        [bookId]: { ...current, [field]: val },
      };
    });
  };

  // Bulk Apply Percent Discount
  const handleApplyBulkDiscount = (target: 'ALL_SELECTED' | 'BY_CATEGORY', specificPercent?: number) => {
    if (isPlatformScope) {
      showToast('Khung giờ Flash Sale của Sàn áp dụng mức % trợ giá cố định, không thể chỉnh sửa thủ công!', 'warning');
      return;
    }
    const percent = specificPercent ?? Number(bulkDiscountPercent || 0);
    if (percent <= 0 || percent >= 100) {
      showToast('Vui lòng nhập mức giảm từ 1% đến 99%', 'warning');
      return;
    }

    setBookConfigMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        const item = updated[id];
        const catName = item.book.category?.name || (item.book as any).categoryName || (item.book as any).category;

        let shouldApply = false;
        if (target === 'ALL_SELECTED' && item.isSelected) shouldApply = true;
        if (target === 'BY_CATEGORY' && bulkTargetCategory && catName === bulkTargetCategory) {
          shouldApply = true;
          item.isSelected = true;
        }

        if (shouldApply) {
          const orig = Number(item.book.price || 0);
          const newSale = Math.max(1000, Math.round(orig * (1 - percent / 100)));
          updated[id] = { ...item, salePrice: newSale };
        }
      });
      return updated;
    });

    showToast(`Đã áp dụng giảm ${percent}% cho các sản phẩm phù hợp! ⚡`, 'success');
  };

  // Bulk Apply Stock Quota
  const handleApplyBulkStock = () => {
    const numStock = Number(bulkStockQuota || 0);
    if (numStock <= 0) {
      showToast('Vui lòng nhập số lượng bán lớn hơn 0', 'warning');
      return;
    }

    setBookConfigMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        const item = updated[id];
        if (item.isSelected) {
          const avail = Number((item.book as any).available ?? item.book.physicalDetails?.stock ?? (item.book as any).stock ?? 20);
          updated[id] = { ...item, stock: Math.min(numStock, Math.max(1, avail)) };
        }
      });
      return updated;
    });

    showToast(`Đã áp dụng số lượng ${numStock} cuốn cho tất cả sách đã chọn! 📦`, 'success');
  };

  // Bulk Apply Max Per User
  const handleApplyBulkMaxPerUser = (val: number) => {
    if (isPlatformScope) {
      showToast('Khung giờ Flash Sale của Sàn quy định số lượng mua tối đa / khách cố định!', 'warning');
      return;
    }
    setBulkMaxPerUser(String(val));
    setBookConfigMap((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        const item = updated[id];
        if (item.isSelected) {
          updated[id] = { ...item, maxPerUser: val };
        }
      });
      return updated;
    });
    showToast(`Đã đặt giới hạn tối đa ${val} cuốn / khách hàng`, 'info');
  };

  // Quick Open Form with preselected Slot
  const handleOpenRegisterForSlot = (slotId: string) => {
    const targetSlot = slots.find((s) => s.id === slotId);
    const isPlatform = targetSlot && (targetSlot.scope === 'PLATFORM' || !targetSlot.storeId);
    if (isPlatform) {
      if (!platformEligibility.eligible) {
        showToast(
          platformEligibility.reason || 'Gian hàng không đủ điều kiện tham gia Flash Sale của Sàn do Sao Quả Tạ!',
          'error'
        );
        setIsPolicyModalOpen(true);
        return;
      }
      if (targetSlot?.isUserStoreParticipating || platformRegisteredMyItems.length > 0) {
        showToast('Gian hàng của bạn đã hoàn tất đăng ký sách trong đợt Flash Sale này của Sàn!', 'info');
        return;
      }
    }

    setSlotMode('EXISTING');
    setSelectedSlotId(slotId);
    const disc = targetSlot?.discountPercent ?? 30;
    const maxUser = targetSlot?.maxPerUser ?? 1;

    if (isPlatform) {
      setBulkDiscountPercent(String(disc));
      setBulkMaxPerUser(String(maxUser));
      setBookConfigMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          const item = next[id];
          if (item) {
            const orig = Number(item.book.price || 0);
            next[id] = {
              ...item,
              salePrice: Math.max(1, Math.round(orig * (1 - disc / 100))),
              maxPerUser: maxUser,
            };
          }
        });
        return next;
      });
    }

    setIsFormOpen(true);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Submit Batch Registration
  const handleSubmitBatch = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetSlotId = selectedSlotId;

    if (slotMode === 'CUSTOM') {
      if (existingShopSlot) {
        showToast(`Shop của bạn đã có 1 đợt Flash Sale (${existingShopSlot.name}). Mỗi shop chỉ được tạo tối đa 1 đợt Flash Sale cùng lúc.`, 'error');
        return;
      }
      if (!customSlotName.trim()) {
        showToast('Vui lòng nhập tên chương trình Flash Sale', 'warning');
        return;
      }
      if (!customStartsAt) {
        showToast('Vui lòng chọn ngày giờ bắt đầu', 'warning');
        return;
      }
      if (!customEndsAt) {
        showToast('Vui lòng chọn ngày giờ kết thúc', 'warning');
        return;
      }
      const startDate = new Date(customStartsAt);
      const endDate = new Date(customEndsAt);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        showToast('Định dạng ngày giờ không hợp lệ', 'error');
        return;
      }
      const now = Date.now();
      const minStartsAt = now + 2 * 60 * 1000 - 5000; // 2 minutes minus 5s buffer
      if (startDate.getTime() < minStartsAt) {
        showToast('Thời gian bắt đầu phải sau ít nhất 2 phút kể từ hiện tại (quy định công bố trước tối thiểu 2 phút)', 'warning');
        return;
      }
      if (endDate <= startDate) {
        showToast('Thời gian kết thúc phải sau thời gian bắt đầu', 'warning');
        return;
      }
    } else {
      if (!selectedSlotId) {
        showToast('Vui lòng chọn khung giờ Flash Sale từ danh sách', 'warning');
        return;
      }
      if (isPlatformScope) {
        if (!platformEligibility.eligible) {
          showToast(
            platformEligibility.reason || 'Gian hàng không đủ điều kiện tham gia Flash Sale Sàn!',
            'error'
          );
          setIsPolicyModalOpen(true);
          return;
        }
        if (selectedBooksList.length > penaltyProfile.maxBooksPerPlatformSlot) {
          showToast(
            `Cấp Sao Quả Tạ hiện tại chỉ cho phép tối đa ${penaltyProfile.maxBooksPerPlatformSlot} cuốn sách trong đợt Flash Sale Sàn!`,
            'error'
          );
          return;
        }
      }
    }

    if (selectedBooksList.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 cuốn sách để đăng ký Flash Sale', 'warning');
      return;
    }

    for (const item of selectedBooksList) {
      const orig = Number(item.book.price || 0);
      if (item.salePrice <= 0 || item.salePrice >= orig) {
        showToast(
          `Sách "${item.book.title}" có giá Flash Sale (${item.salePrice.toLocaleString('vi-VN')} đ) không hợp lệ so với giá niêm yết (${orig.toLocaleString('vi-VN')} đ)`,
          'error'
        );
        return;
      }
      if (item.stock <= 0) {
        showToast(`Sách "${item.book.title}" phải có số lượng bán lớn hơn 0`, 'error');
        return;
      }

      // 30-Day Anti-Fake-Discount & Pricing Guard
      const lowest30d = (item.book as any).lowestPrice30Days || Math.round(orig * 0.95);
      const validation = sellerPenaltyService.validateBookForFlashSale(
        orig,
        item.salePrice,
        lowest30d,
        isPlatformScope ? platformDiscountPercent : 10
      );
      if (!validation.isValid) {
        showToast(`Sách "${item.book.title}": ${validation.reason}`, 'error');
        return;
      }
    }

    try {
      setSubmitting(true);

      if (slotMode === 'CUSTOM') {
        const slotRes = await flashSaleApi.createSellerSlot({
          name: customSlotName.trim(),
          description: customDescription.trim() || undefined,
          startsAt: new Date(customStartsAt).toISOString(),
          endsAt: new Date(customEndsAt).toISOString(),
        });

        if (!slotRes.success || !slotRes.data?.id) {
          const slotErr = (slotRes as any)?.error?.message || (slotRes as any)?.message || 'Không thể tạo chương trình Flash Sale mới';
          showToast(slotErr, 'error');
          return;
        }
        targetSlotId = slotRes.data.id;
      }

      const payload = {
        flashSaleId: targetSlotId,
        items: selectedBooksList.map((item) => ({
          bookId: item.book.id,
          salePrice: item.salePrice,
          stock: item.stock,
          maxPerUser: item.maxPerUser || 1,
        })),
      };

      const res = await flashSaleApi.sellerRegisterBatch(payload);
      const registeredCount = Number((res as any)?.data?.registeredCount ?? (res as any)?.data?.items?.length ?? 0);
      const failedCount = Number((res as any)?.data?.failedCount ?? 0);
      const errorsList = (res as any)?.data?.errors || (res as any)?.errors || [];

      if (res.success && registeredCount > 0) {
        if (failedCount > 0) {
          const firstErr = errorsList[0]?.error || errorsList[0]?.message || 'một số sách bị từ chối';
          showToast(`Đã đăng ký thành công ${registeredCount}/${selectedBooksList.length} sách (${firstErr})`, 'warning');
        } else {
          showToast(`Đăng ký thành công ${registeredCount} cuốn sách vào Flash Sale! 🎉`, 'success');
        }
        setIsFormOpen(false);
        setBookConfigMap((prev) => {
          const reset = { ...prev };
          Object.keys(reset).forEach((k) => {
            reset[k] = { ...reset[k], isSelected: false };
          });
          return reset;
        });
        await loadData();
      } else {
        if (slotMode === 'CUSTOM' && targetSlotId) {
          try {
            await flashSaleApi.sellerDeleteSlot(targetSlotId);
          } catch {}
        }
        const errorMsg =
          errorsList[0]?.error ||
          errorsList[0]?.message ||
          (res as any)?.error?.message ||
          (res as any)?.message ||
          'Đăng ký không thành công. Vui lòng kiểm tra lại khung giờ và điều kiện sách.';
        showToast(errorMsg, 'error');
      }
    } catch (err: any) {
      if (slotMode === 'CUSTOM' && targetSlotId) {
        try {
          await flashSaleApi.sellerDeleteSlot(targetSlotId);
        } catch {}
      }
      showToast(err?.message || (err as any)?.error?.message || 'Có lỗi xảy ra khi đăng ký hàng loạt', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Inline 5s Countdown Cancel Handlers (Zero Popup)
  const handleInitiateCancel = (itemId: string) => {
    setCancelCountdownState({ itemId, secondsLeft: 5 });
  };

  const handleAbortCancel = () => {
    setCancelCountdownState(null);
  };

  const handleExecuteCancel = async (itemId: string) => {
    try {
      setCancellingId(itemId);
      const res = await flashSaleApi.sellerCancelItem(itemId);
      if (res.success) {
        showToast('Đã hủy đăng ký Flash Sale thành công', 'success');
        setCancelCountdownState(null);
        await loadData();
      } else {
        showToast((res as any)?.message || 'Không thể hủy đăng ký', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Có lỗi khi hủy đăng ký', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null);

  const handleDeleteSlot = async (slotId: string, slotName?: string) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa đợt Flash Sale "${slotName || 'này'}"? Toàn bộ sách đã đăng ký trong đợt này sẽ bị hủy.`
      )
    ) {
      return;
    }
    try {
      setDeletingSlotId(slotId);
      const res = await flashSaleApi.sellerDeleteSlot(slotId);
      if (res.success) {
        showToast('Đã xóa đợt Flash Sale thành công! 🎉', 'success');
        await loadData();
      } else {
        showToast((res as any)?.message || 'Không thể xóa đợt Flash Sale', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Có lỗi xảy ra khi xóa đợt Flash Sale', 'error');
    } finally {
      setDeletingSlotId(null);
    }
  };

  // Inline Row Editing Handlers (Zero Popup)
  const handleStartInlineEdit = (item: any) => {
    const orig = Number(item.originalPrice || item.book?.price || 0);
    const avail = Number(item.book?.available ?? item.book?.physicalDetails?.stock ?? item.book?.stock ?? 20);
    setEditingRowId(item.id);
    setEditingRowData({
      salePrice: Number(item.salePrice || Math.round(orig * 0.7)),
      stock: Number(item.stock || 10),
      maxPerUser: Number(item.maxPerUser || 1),
      originalPrice: orig,
      availableStock: avail,
    });
  };

  const handleCancelInlineEdit = () => {
    setEditingRowId(null);
    setEditingRowData(null);
  };

  const handleSaveInlineEdit = async (itemId: string) => {
    if (!editingRowData) return;

    if (editingRowData.salePrice <= 0 || editingRowData.salePrice >= editingRowData.originalPrice) {
      showToast(
        `Giá Flash Sale (${editingRowData.salePrice.toLocaleString('vi-VN')} đ) phải nhỏ hơn giá niêm yết (${editingRowData.originalPrice.toLocaleString('vi-VN')} đ)`,
        'error'
      );
      return;
    }

    if (editingRowData.stock <= 0) {
      showToast('Số lượng bán phải lớn hơn 0', 'error');
      return;
    }

    try {
      setSavingRowId(itemId);
      const res = await flashSaleApi.sellerUpdateItem(itemId, {
        salePrice: editingRowData.salePrice,
        stock: editingRowData.stock,
        maxPerUser: editingRowData.maxPerUser,
      });

      if (res.success) {
        showToast('Đã cập nhật Flash Sale thành công! 🎉', 'success');
        setEditingRowId(null);
        setEditingRowData(null);
        await loadData();
      } else {
        showToast((res as any)?.message || 'Cập nhật thất bại', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Có lỗi khi cập nhật sản phẩm', 'error');
    } finally {
      setSavingRowId(null);
    }
  };

  // Overall KPI Calculations
  const stats = useMemo(() => {
    const totalSlots = slots.length;
    const now = Date.now();
    const openSlots = slots.filter((s) => {
      const startsAt = new Date(s.startsAt || 0).getTime();
      const endsAt = new Date(s.endsAt || 0).getTime();
      return s.status === 'SCHEDULED' || (now < startsAt && endsAt > now);
    }).length;
    const activeItems = myItems.filter((i) => {
      const fs = i.flashSale || i;
      const endsAt = new Date(fs.endsAt || i.endsAt || 0).getTime();
      const startsAt = new Date(fs.startsAt || i.startsAt || 0).getTime();
      const isActive = (fs.status || i.status) === 'ACTIVE' || (now >= startsAt && now <= endsAt);
      return isActive && endsAt > now;
    }).length;
    const totalSold = myItems.reduce((sum, i) => sum + Number(i.sold || 0), 0);
    const totalRevenue = myItems.reduce(
      (sum, i) => sum + Number(i.sold || 0) * Number(i.salePrice || 0),
      0
    );

    return { totalSlots, openSlots, activeItems, totalSold, totalRevenue };
  }, [slots, myItems]);

  // Group My Items by Flash Sale Slot (High-Detail Session Grouping)
  const groupedSessions = useMemo(() => {
    const currentBizId = user?.business?.id || activeBusinessId;
    const slotMap = new Map<string, { slot: FlashSaleSlot | any; items: any[] }>();

    // 1. Initialize with all known SHOP slots belonging to current shop
    slots.forEach((s) => {
      if (s.scope === 'SHOP') {
        if (currentBizId && s.storeId && s.storeId !== currentBizId) {
          return;
        }
        slotMap.set(s.id, { slot: s, items: [] });
      }
    });

    // 2. Distribute items into their respective slots (including platform slots only if seller has items in it)
    myItems.forEach((item) => {
      const slotId = item.flashSaleId || item.flashSale?.id;
      if (item.flashSale?.scope === 'SHOP' && currentBizId && item.flashSale?.storeId && item.flashSale?.storeId !== currentBizId) {
        return;
      }
      if (slotId && slotMap.has(slotId)) {
        slotMap.get(slotId)!.items.push(item);
      } else if (slotId) {
        // Create virtual slot entry if not in slots list
        slotMap.set(slotId, {
          slot: item.flashSale || {
            id: slotId,
            name: item.flashSaleName || 'Khung giờ Flash Sale',
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            status: item.status || 'SCHEDULED',
            scope: item.flashSale?.scope || item.scope,
            storeId: item.flashSale?.storeId || item.storeId,
          },
          items: [item],
        });
      }
    });

    // 3. Filter by Active Tab & Search Query
    const sessionList: Array<{ slot: FlashSaleSlot | any; items: any[] }> = [];

    slotMap.forEach((entry) => {
      const now = Date.now();
      const startsAt = new Date(entry.slot?.startsAt || 0).getTime();
      const endsAt = new Date(entry.slot?.endsAt || 0).getTime();
      let slotStatus = entry.slot?.status || 'SCHEDULED';

      if (endsAt > 0 && endsAt < now) {
        slotStatus = 'ENDED';
      } else if (now >= startsAt && now <= endsAt) {
        slotStatus = 'ACTIVE';
      } else if (slotStatus === 'ACTIVE' && endsAt < now) {
        slotStatus = 'ENDED';
      }
      
      // Tab filter
      if (activeTab === 'ACTIVE' && slotStatus !== 'ACTIVE' && slotStatus !== 'SCHEDULED') return;
      if (activeTab === 'ENDED' && slotStatus !== 'ENDED') return;

      // Search filter within items or slot name
      const matchingItems = entry.items.filter((item) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          item.book?.title?.toLowerCase().includes(q) ||
          item.book?.author?.toLowerCase().includes(q) ||
          entry.slot.name?.toLowerCase().includes(q)
        );
      });

      // Show session if it has matching items OR if search query is empty and session is SHOP scope
      if (matchingItems.length > 0 || (!searchQuery && entry.slot && (entry.slot.scope === 'SHOP' || entry.slot.storeId))) {
        sessionList.push({
          slot: { ...entry.slot, status: slotStatus },
          items: matchingItems,
        });
      }
    });

    // Sort: ACTIVE first, then SCHEDULED ascending by startsAt, then ENDED
    sessionList.sort((a, b) => {
      const statusOrder: Record<string, number> = { ACTIVE: 1, SCHEDULED: 2, ENDED: 3 };
      const orderA = statusOrder[a.slot.status] || 99;
      const orderB = statusOrder[b.slot.status] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.slot.startsAt).getTime() - new Date(b.slot.startsAt).getTime();
    });

    return sessionList;
  }, [slots, myItems, activeTab, searchQuery, user, activeBusinessId]);

  // Pagination & Reset
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const paginatedSessions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedSessions.slice(start, start + pageSize);
  }, [groupedSessions, currentPage, pageSize]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200 font-sans pb-16">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-emerald-500/10 p-6 rounded-3xl border border-amber-500/20 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
            <span className="material-symbols-outlined text-2xl animate-pulse">bolt</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <span>Flash Sale Giờ Vàng</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-bold tracking-wider uppercase shadow-xs">
                Chính Thức
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
              Thiết lập khung giờ Flash Sale riêng của Shop hoặc tham gia khung giờ vàng của Sàn để bùng nổ doanh số
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {/* Shop Health & Sao Quả Tạ Badge */}
            <button
              type="button"
              onClick={() => {
                setPolicyActiveTab('CHECKLIST');
                setIsPolicyModalOpen(true);
              }}
              title="Nhấn để xem chi tiết 5 tiêu chuẩn vận hành và điểm Sao Quả Tạ của Shop"
              className={`px-3 py-2 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] ${
                penaltyProfile.penaltyPoints === 0
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : penaltyProfile.penaltyPoints <= 2
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                  : 'bg-rose-50 border-rose-300 text-rose-900 hover:bg-rose-100 animate-pulse'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${
                  penaltyProfile.penaltyPoints === 0
                    ? 'bg-emerald-600'
                    : penaltyProfile.penaltyPoints <= 2
                    ? 'bg-amber-600'
                    : 'bg-rose-600'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">
                  {penaltyProfile.penaltyPoints === 0 ? 'verified' : 'warning'}
                </span>
              </div>
              <div className="text-left">
                <div className="text-[9.5px] uppercase tracking-wider text-gray-500 font-extrabold leading-none">
                  Sao Quả Tạ
                </div>
                <div className="text-xs font-black">
                  {penaltyProfile.penaltyPoints} / 3 ⭐{' '}
                  <span className="font-semibold text-[10.5px] opacity-80">
                    ({penaltyProfile.tier === 'TIER_0_GOOD' ? 'Tốt' : penaltyProfile.tier === 'TIER_1_WARNING' ? 'Cảnh Báo' : 'Khóa FS Sàn'})
                  </span>
                </div>
              </div>
            </button>

            {/* Platform Flash Sale Criteria Policy Button */}
            <button
              type="button"
              onClick={() => {
                setPolicyActiveTab('CHECKLIST');
                setIsPolicyModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer hover:border-gray-400 transition-all"
            >
              <span className="material-symbols-outlined text-sm text-amber-600">policy</span>
              <span>Tiêu Chuẩn Tham Gia Sàn</span>
            </button>

            {/* Primary Action Button */}
            <button
              type="button"
              disabled={Boolean(existingShopSlot) && !isFormOpen}
              onClick={() => {
                if (existingShopSlot && !isFormOpen) {
                  showToast(
                    `Shop hiện đã có 1 đợt Flash Sale "${existingShopSlot.name}". Mỗi shop chỉ được tạo tối đa 1 đợt cùng lúc!`,
                    'warning'
                  );
                  return;
                }
                const nextState = !isFormOpen;
                setIsFormOpen(nextState);
                if (nextState) {
                  const freshTimes = getInitialTimes();
                  setCustomStartsAt(freshTimes.startsAt);
                  setCustomEndsAt(freshTimes.endsAt);
                  if (slots.length > 0 && !selectedSlotId) {
                    setSelectedSlotId(slots[0].id);
                  }
                }
              }}
              className={`px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                existingShopSlot && !isFormOpen
                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed shadow-none'
                  : isFormOpen
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 cursor-pointer shadow-md'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md shadow-orange-500/25 hover:scale-[1.02] cursor-pointer'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {isFormOpen ? 'close' : existingShopSlot ? 'lock' : 'bolt'}
              </span>
              <span>{isFormOpen ? 'Đóng Công Cụ' : '⚡ Tạo Flash Sale & Đăng Ký Sách'}</span>
            </button>
          </div>
          {existingShopSlot && !isFormOpen && (
            <div className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 sm:text-right max-w-sm">
              <span className="material-symbols-outlined text-xs shrink-0">error</span>
              <span>Shop đang có 1 đợt Flash Sale hoạt động ("{existingShopSlot.name}"). Vui lòng đợi kết thúc hoặc xóa đợt cũ.</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. KPI Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">timer</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Khung Giờ Mở Đăng Ký
            </div>
            <div className="text-lg sm:text-xl font-black text-gray-900 mt-0.5">
              {stats.openSlots} <span className="text-xs font-normal text-gray-500">/ {stats.totalSlots} slot</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">local_fire_department</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Đang Bán Trực Tiếp
            </div>
            <div className="text-lg sm:text-xl font-black text-orange-600 mt-0.5">
              {stats.activeItems} <span className="text-xs font-normal text-gray-500">sách</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">shopping_cart_checkout</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Đã Bán Flash Sale
            </div>
            <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
              {stats.totalSold} <span className="text-xs font-normal text-gray-500">cuốn</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-xl">payments</span>
          </div>
          <div>
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Doanh Thu Flash Sale
            </div>
            <div className="text-lg sm:text-xl font-black text-blue-700 mt-0.5">
              {stats.totalRevenue.toLocaleString('vi-VN')} <span className="text-xs font-normal text-gray-500">đ</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2.5 DEDICATED PLATFORM FLASH SALE SECTION: THAM GIA HUKI FLASH SALE */}
      <div className="bg-gradient-to-r from-red-50 via-amber-50/70 to-orange-50 rounded-3xl p-6 border-2 border-red-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-red-200/60 pb-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ac2c19] to-[#c73924] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
              <span className="material-symbols-outlined text-2xl">campaign</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                  Tham Gia Huki Flash Sale
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-[#ac2c19] text-white text-[10.5px] font-bold uppercase tracking-wider shadow-2xs">
                  Sàn Tài Trợ
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Chương trình Flash Sale tập trung toàn sàn do HuKi điều phối và đẩy traffic tối đa
              </p>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100/70 px-3 py-1 rounded-xl border border-amber-200 self-start sm:self-auto flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm text-amber-600">verified</span>
            <span>Chính Sách Giờ Vàng Toàn Sàn</span>
          </span>
        </div>

        {/* Realtime Shop Health & Platform Flash Sale Eligibility Banner */}
        <div
          className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            platformEligibility.eligible
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-950'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                platformEligibility.eligible ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {platformEligibility.eligible ? 'verified' : 'gavel'}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-xs sm:text-sm">
                  {platformEligibility.eligible
                    ? 'Gian Hàng Đủ Tiêu Chuẩn Tham Gia Flash Sale Sàn'
                    : 'Gian Hàng Bị Giới Hạn Tham Gia Flash Sale Sàn'}
                </span>
                <span
                  className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    penaltyProfile.tier === 'TIER_0_GOOD'
                      ? 'bg-emerald-100 text-emerald-800'
                      : penaltyProfile.tier === 'TIER_1_WARNING'
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  Sao Quả Tạ: {penaltyProfile.penaltyPoints}/3 ⭐ ({PENALTY_TIER_CONFIG[penaltyProfile.tier].name})
                </span>
              </div>
              <p className="text-[11px] text-gray-600 mt-0.5">
                {platformEligibility.eligible
                  ? `Hạn mức đăng ký: Tối đa ${penaltyProfile.maxBooksPerPlatformSlot} cuốn sách / slot Flash Sale toàn sàn.`
                  : `${platformEligibility.reason}. Bạn có thể gửi đơn khiếu nại để được Ban Quản Trị thẩm định.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setPolicyActiveTab(platformEligibility.eligible ? 'CHECKLIST' : 'APPEALS');
              setIsPolicyModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-bold text-xs shadow-2xs cursor-pointer self-start md:self-auto flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-xs">
              {platformEligibility.eligible ? 'policy' : 'rate_review'}
            </span>
            <span>{platformEligibility.eligible ? 'Xem 5 Tiêu Chuẩn Sàn' : 'Gửi Khiếu Nại / Xem Chi Tiết'}</span>
          </button>
        </div>

        {platformSlot ? (() => {
          const regStart = new Date(platformSlot.registrationStartsAt || platformSlot.startsAt).getTime();
          const regEnd = new Date(platformSlot.registrationEndsAt || platformSlot.startsAt).getTime();
          const startAt = new Date(platformSlot.startsAt).getTime();
          const endAt = new Date(platformSlot.endsAt).getTime();

          const isRegUpcoming = nowMs < regStart;
          const isRegOpen = nowMs >= regStart && nowMs <= regEnd;
          const isTeaser = nowMs > regEnd && nowMs < startAt;
          const isSaleLive = nowMs >= startAt && nowMs <= endAt;

          const maxStores = platformSlot.maxStores || 10;
          const minStores = platformSlot.minStores || 1;
          const participatingCount = platformSlot.participatingStoresCount || 0;
          const isStoreParticipating = Boolean(
            platformSlot.isUserStoreParticipating || platformRegisteredMyItems.length > 0,
          );
          const isStoreFull = participatingCount >= maxStores && !isStoreParticipating;
          const progressPct = Math.min(100, Math.round((participatingCount / maxStores) * 100));

          const regRemainingSeconds = Math.max(0, Math.floor((regEnd - nowMs) / 1000));
          const startRemainingSeconds = Math.max(0, Math.floor((startAt - nowMs) / 1000));

          return (
            <div className="bg-white/95 rounded-2xl p-5 border border-red-100 shadow-xs space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-red-600 text-lg">bolt</span>
                      <span>{platformSlot.name}</span>
                    </h3>
                    {isRegOpen && !isStoreFull && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10.5px] font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                        ĐANG MỞ ĐĂNG KÝ
                      </span>
                    )}
                    {isRegOpen && isStoreFull && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300 text-[10.5px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">lock</span>
                        ĐÃ ĐỦ SỐ LƯỢNG SHOP ({maxStores}/{maxStores})
                      </span>
                    )}
                    {isTeaser && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10.5px] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs animate-spin">hourglass_top</span>
                        ĐÃ ĐÓNG ĐĂNG KÝ - ĐANG CÔNG BỐ TRƯỚC
                      </span>
                    )}
                    {isSaleLive && (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10.5px] font-bold flex items-center gap-1 shadow-xs animate-pulse">
                        <span className="material-symbols-outlined text-xs">local_fire_department</span>
                        ĐANG MỞ BÁN ⚡
                      </span>
                    )}
                    {isRegUpcoming && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300 text-[10.5px] font-bold">
                        SẮP MỞ ĐĂNG KÝ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    {platformSlot.description || 'Tham gia cùng hàng ngàn độc giả săn sách giá sốc trong sự kiện Flash Sale quy mô toàn sàn!'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                  {isRegOpen && (
                    <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono text-center">
                      <span className="text-[10px] text-amber-700 block uppercase font-sans font-bold">Hạn Chót Đăng Ký</span>
                      <span className="font-black text-sm text-red-600">{formatCountdown(regRemainingSeconds)}</span>
                    </div>
                  )}
                  {isTeaser && (
                    <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-mono text-center">
                      <span className="text-[10px] text-amber-700 block uppercase font-sans font-bold">Mở Bán Chính Thức Sau</span>
                      <span className="font-black text-sm text-red-600">{formatCountdown(startRemainingSeconds)}</span>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    {isStoreParticipating ? (
                      <>
                        <button
                          type="button"
                          disabled
                          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed shadow-none flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">lock</span>
                          <span>🔒 Đã Đăng Ký Tham Gia</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setViewPlatformDetailSlot(platformSlot)}
                          className="px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.02]"
                        >
                          <span className="material-symbols-outlined text-sm">visibility</span>
                          <span>🔍 Xem Chi Tiết ({platformRegisteredMyItems.length} Sách)</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={!platformEligibility.eligible ? false : (!isRegOpen || isStoreFull)}
                        onClick={() => {
                          if (!platformEligibility.eligible) {
                            showToast(platformEligibility.reason || 'Gian hàng không đủ điều kiện tham gia Flash Sale Sàn do Sao Quả Tạ!', 'error');
                            setPolicyActiveTab('APPEALS');
                            setIsPolicyModalOpen(true);
                            return;
                          }
                          handleOpenRegisterForSlot(platformSlot.id);
                        }}
                        className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                          !platformEligibility.eligible
                            ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 cursor-pointer animate-pulse'
                            : !isRegOpen || isStoreFull
                            ? 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed'
                            : 'bg-[#ac2c19] hover:bg-[#8f2415] text-white cursor-pointer hover:scale-[1.02]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-sm">
                          {!platformEligibility.eligible ? 'gavel' : !isRegOpen || isStoreFull ? 'lock' : 'bolt'}
                        </span>
                        <span>
                          {!platformEligibility.eligible
                            ? '🔒 Tạm Khóa (Sao Quả Tạ >= 3)'
                            : isStoreFull
                            ? `Đã Đủ Số Lượng Shop (${maxStores}/${maxStores})`
                            : isTeaser
                            ? 'Đã Đóng Cổng Đăng Ký'
                            : isSaleLive
                            ? 'Đã Hết Hạn Đăng Ký'
                            : '⚡ Đăng Ký Tham Gia Sàn Ngay'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress and Timelines */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-gray-100">
                {/* Store Limit Quota Progress */}
                <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/70 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-emerald-700">storefront</span>
                      <span>Tiến Độ Cửa Hàng Tham Gia:</span>
                    </span>
                    <span className="font-mono font-black text-gray-900">
                      {participatingCount} / {maxStores} Shop (Tối thiểu: {minStores} Shop)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isStoreFull ? 'bg-rose-500' : progressPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[10.5px] text-gray-500">
                    <span>{isStoreFull ? '⚠️ Đã đạt giới hạn tối đa' : `Còn lại ${Math.max(0, maxStores - participatingCount)} suất đăng ký`}</span>
                    <span>{progressPct}% Quota</span>
                  </div>
                </div>

                {/* Timelines Info */}
                <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-200/70 text-xs space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-sans font-medium">Thời gian mở đăng ký:</span>
                    <strong className="text-gray-800">
                      {new Date(regStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(regEnd).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-500 font-sans font-medium">Thời gian mở bán:</span>
                    <strong className="text-red-700">
                      {new Date(startAt).toLocaleString('vi-VN')} - {new Date(endAt).toLocaleString('vi-VN')}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })() : (
          <div className="p-6 bg-white/80 rounded-2xl border border-amber-200/60 text-center space-y-1.5">
            <span className="material-symbols-outlined text-3xl text-amber-500">notifications_active</span>
            <h4 className="text-xs sm:text-sm font-bold text-gray-800">
              Hiện tại chưa có đợt Flash Sale toàn sàn nào mở đăng ký
            </h4>
            <p className="text-[11px] text-gray-500 max-w-lg mx-auto">
              Ban Quản Trị Sàn sẽ thông báo khi có đợt khuyến mãi giờ vàng mới. Bạn có thể tự tạo đợt Flash Sale riêng của Shop bằng nút "⚡ Tạo Flash Sale & Đăng Ký Sách" ở phía trên.
            </p>
          </div>
        )}
      </div>

      {/* 4. Multi-Book Registration Studio (100% In-Page Accordion) */}
      {isFormOpen && (
        <div className="w-full max-w-full min-w-0 bg-white rounded-3xl p-6 border-2 border-orange-500/30 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-xl">playlist_add_check</span>
              </div>
              <div>
                <h2 className="font-title-md text-base sm:text-lg font-bold text-gray-900">
                  Studio Đăng Ký Flash Sale Hàng Loạt
                </h2>
                <p className="text-xs text-gray-500">
                  Chọn nhiều cuốn sách cùng lúc, thiết lập mức giảm % linh hoạt cho toàn bộ hoặc từng thể loại
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer self-end sm:self-auto"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmitBatch} className="space-y-6">
            {/* 1. Thiết Lập Khung Giờ & Thông Tin Flash Sale */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-50/80 via-orange-50/40 to-white border-2 border-amber-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-xs">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-gray-900 uppercase tracking-wider">
                      1. Thông Tin & Khung Giờ Flash Sale
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Tự thiết lập khung giờ riêng của Shop hoặc chọn khung giờ có sẵn từ Sàn
                    </p>
                  </div>
                </div>

                {/* Mode Selector Switch */}
                <div className="inline-flex p-1 bg-amber-100/70 rounded-2xl border border-amber-200/80 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSlotMode('CUSTOM')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      slotMode === 'CUSTOM'
                        ? 'bg-white text-orange-600 shadow-xs ring-1 ring-orange-400/30'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">tune</span>
                    <span>Tự Tạo Giờ Riêng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlotMode('EXISTING')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      slotMode === 'EXISTING'
                        ? 'bg-white text-orange-600 shadow-xs ring-1 ring-orange-400/30'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">event_available</span>
                    <span>Chọn Khung Giờ Sàn ({slots.length})</span>
                  </button>
                </div>
              </div>

              {slotMode === 'CUSTOM' ? (
                <div className="space-y-4">
                  {existingShopSlot && (
                    <div className="p-4 bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl flex items-start gap-3 text-amber-900">
                      <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
                        info
                      </span>
                      <div className="text-xs space-y-1">
                        <div className="font-extrabold text-amber-800">
                          Shop hiện đã có 1 đợt Flash Sale: "{existingShopSlot.name}"
                        </div>
                        <p className="text-amber-700 leading-relaxed">
                          Quy định hệ thống: <strong>Mỗi shop chỉ được duy trì tối đa 1 đợt Flash Sale</strong> đang mở bán hoặc chuẩn bị mở bán. Khi đợt hiện tại kết thúc (hoặc sau khi bạn xóa đợt hiện tại), bạn mới có thể tạo đợt mới.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Tên chương trình */}
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-orange-600">campaign</span>
                        <span>Tên Chương Trình Flash Sale</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={customSlotName}
                        onChange={(e) => setCustomSlotName(e.target.value)}
                        placeholder="VD: Flash Sale Đêm Săn Deal..."
                        disabled={Boolean(existingShopSlot)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-all disabled:bg-gray-100 disabled:opacity-60"
                      />
                    </div>

                    {/* Ngày giờ bắt đầu */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-emerald-600">play_circle</span>
                          <span>Thời Gian Bắt Đầu (Tối thiểu sau 2 phút)</span>
                          <span className="text-red-500">*</span>
                        </label>
                        {!existingShopSlot && (
                          <button
                            type="button"
                            onClick={handleSetStartNow}
                            className="text-[10px] text-orange-600 hover:text-orange-700 font-bold underline cursor-pointer"
                          >
                            ⏳ Sau 2 phút
                          </button>
                        )}
                      </div>
                      <input
                        type="datetime-local"
                        value={customStartsAt}
                        min={getMinStartsAt()}
                        onChange={(e) => setCustomStartsAt(e.target.value)}
                        disabled={Boolean(existingShopSlot)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-all disabled:bg-gray-100 disabled:opacity-60"
                      />
                    </div>

                    {/* Ngày giờ kết thúc */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs text-red-600">stop_circle</span>
                        <span>Thời Gian Kết Thúc</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={customEndsAt}
                        onChange={(e) => setCustomEndsAt(e.target.value)}
                        disabled={Boolean(existingShopSlot)}
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none transition-all disabled:bg-gray-100 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  {/* Duration Presets & Description */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-amber-100">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-gray-500 mr-1">Chọn nhanh thời lượng:</span>
                      {[
                        { label: '+1 Giờ', hours: 1 },
                        { label: '+2 Giờ', hours: 2 },
                        { label: '+4 Giờ', hours: 4 },
                        { label: '+8 Giờ', hours: 8 },
                        { label: '+24 Giờ (1 Ngày)', hours: 24 },
                        { label: '+3 Ngày', hours: 72 },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            const start = customStartsAt ? new Date(customStartsAt) : new Date();
                            const newEnd = new Date(start.getTime() + preset.hours * 60 * 60 * 1000);
                            const pad = (n: number) => String(n).padStart(2, '0');
                            const toInput = (d: Date) =>
                              `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
                            setCustomEndsAt(toInput(newEnd));
                          }}
                          className="text-[10px] px-2.5 py-1 rounded-lg bg-white hover:bg-orange-100 text-gray-700 hover:text-orange-800 font-bold border border-gray-200 transition-colors cursor-pointer shadow-2xs"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex-1 max-w-md">
                      <input
                        type="text"
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="Mô tả chương trình (tùy chọn)..."
                        className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 outline-none focus:border-orange-400"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-gray-600 font-medium">
                      Chọn một trong các khung giờ do Ban Quản Trị Sàn mở:
                    </div>
                    <select
                      value={selectedSlotId}
                      onChange={(e) => setSelectedSlotId(e.target.value)}
                      className="px-4 py-2.5 bg-white border border-amber-300 rounded-xl text-xs sm:text-sm font-bold text-gray-900 focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none min-w-[280px]"
                    >
                      <option value="">-- Chọn khung giờ Flash Sale của Sàn --</option>
                      {slots.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({new Date(s.startsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - {new Date(s.endsAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})
                        </option>
                      ))}
                    </select>
                  </div>

                  {!platformEligibility.eligible && (
                    <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl flex items-start gap-3 text-rose-900">
                      <span className="material-symbols-outlined text-rose-600 text-xl shrink-0 mt-0.5">
                        gavel
                      </span>
                      <div className="text-xs space-y-1">
                        <div className="font-extrabold text-rose-800">
                          Khóa Quyền Đăng Ký Flash Sale Toàn Sàn (Sao Quả Tạ: {penaltyProfile.penaltyPoints}/3 ⭐)
                        </div>
                        <p className="text-rose-700 leading-relaxed">
                          {platformEligibility.reason}. Bạn có thể chuyển sang tab <strong>"Tự Tạo Giờ Riêng"</strong> của Shop để chủ động tạo Flash Sale, hoặc gửi đơn khiếu nại để được Ban Quản Trị xem xét.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Bulk Smart Tools Toolbar */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-emerald-500/5 border border-orange-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black text-gray-900 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-orange-600 text-lg">tune</span>
                  <span>Công Cụ Áp Dụng Giảm Giá Nhanh Hàng Loạt</span>
                </div>
                {isPlatformScope && (
                  <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-xl border border-amber-300 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-amber-700">lock</span>
                    <span>Đợt Flash Sale Sàn: Trợ giá -{platformDiscountPercent}%, Hạn mức: {selectedBooksList.length}/{penaltyProfile.maxBooksPerPlatformSlot} cuốn (Sao Quả Tạ: {penaltyProfile.penaltyPoints}⭐)</span>
                  </span>
                )}
              </div>

              {isPlatformScope && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-amber-600 shrink-0">info</span>
                  <span>
                    Chính sách chiến dịch Sàn đã khóa mức giảm <strong>{platformDiscountPercent}%</strong> và số lượng mua <strong>{platformMaxPerUser} cuốn/khách</strong>. Bạn chỉ cần chọn sách và nhập số lượng kho Flash Sale (Quota).
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Tool 1 */}
                <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase">
                    Giảm % Cho Tất Cả Sách Đã Chọn
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={isPlatformScope ? platformDiscountPercent : bulkDiscountPercent}
                        onChange={(e) => !isPlatformScope && setBulkDiscountPercent(e.target.value)}
                        disabled={isPlatformScope}
                        placeholder="VD: 30"
                        className="w-full pl-3 pr-7 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-orange-700 outline-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">%</span>
                    </div>
                    <button
                      type="button"
                      disabled={isPlatformScope}
                      onClick={() => handleApplyBulkDiscount('ALL_SELECTED')}
                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      Áp dụng
                    </button>
                  </div>
                  <div className="flex gap-1">
                    {[20, 30, 40, 50].map((p) => (
                      <button
                        key={p}
                        type="button"
                        disabled={isPlatformScope}
                        onClick={() => {
                          setBulkDiscountPercent(String(p));
                          handleApplyBulkDiscount('ALL_SELECTED', p);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 font-semibold transition-colors cursor-pointer"
                      >
                        -{p}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tool 2 */}
                <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase">
                    Áp Dụng Giảm % Theo Thể Loại
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      value={bulkTargetCategory}
                      disabled={isPlatformScope}
                      onChange={(e) => setBulkTargetCategory(e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-medium outline-none truncate disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                    >
                      <option value="">-- Chọn thể loại --</option>
                      {categoriesList.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleApplyBulkDiscount('BY_CATEGORY')}
                      disabled={!bulkTargetCategory || isPlatformScope}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
                    >
                      Áp dụng
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {isPlatformScope ? '🔒 Đã khóa theo chính sách trợ giá toàn sàn' : 'Tự động chọn và tính giá theo mức % cho thể loại này'}
                  </p>
                </div>

                {/* Tool 3 */}
                <div className="p-3.5 bg-white rounded-xl border border-gray-200 shadow-2xs space-y-2">
                  <label className="block text-[11px] font-bold text-gray-700 uppercase">
                    Số Lượng Quota & Giới Hạn Mua
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      value={bulkStockQuota}
                      onChange={(e) => setBulkStockQuota(e.target.value)}
                      placeholder="Số lượng"
                      className="w-20 px-2 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-xs font-bold text-gray-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyBulkStock}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      Set Quota
                    </button>
                    <div className="flex gap-1 ml-auto">
                      {isPlatformScope ? (
                        <span className="text-[10px] px-2 py-1 rounded-md font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          🔒 Max {platformMaxPerUser}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApplyBulkMaxPerUser(1)}
                            className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                              bulkMaxPerUser === '1' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            Max 1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyBulkMaxPerUser(2)}
                            className={`text-[10px] px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                              bulkMaxPerUser === '2' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            Max 2
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {isPlatformScope ? `Áp dụng số lượng bán vào kho Flash Sale (Giới hạn: ${platformMaxPerUser} cuốn/khách)` : 'Áp dụng số lượng bán và giới hạn mua mỗi khách'}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Book Selection Table with Horizontal Scroll */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Danh Sách Sách Trong Kho ({studioBooks.length} sách)
                  </span>
                  <span className="text-xs font-extrabold text-orange-600 px-2 py-0.5 rounded-full bg-orange-100">
                    Đã chọn {selectedBooksList.length} cuốn
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[200px]">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      search
                    </span>
                    <input
                      type="text"
                      value={bookSearchQuery}
                      onChange={(e) => setBookSearchQuery(e.target.value)}
                      placeholder="Tìm sách trong kho..."
                      className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                    />
                  </div>

                  <select
                    value={bookCategoryFilter}
                    onChange={(e) => setBookCategoryFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  >
                    <option value="ALL">Tất cả thể loại</option>
                    {categoriesList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  <select
                    value={bookFormatFilter}
                    onChange={(e) => setBookFormatFilter(e.target.value)}
                    className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none"
                  >
                    <option value="ALL">Tất cả định dạng</option>
                    <option value="PHYSICAL">Sách giấy</option>
                    <option value="DIGITAL">Sách điện tử Ebook</option>
                  </select>
                </div>
              </div>

              {/* Horizontal Scrollable Table */}
              <div className="border border-gray-200 rounded-2xl overflow-x-auto max-h-[420px] overflow-y-auto scrollbar-thin [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-orange-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-orange-400">
                <table className="w-full text-left text-xs min-w-[1100px]">
                  <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={isAllStudioSelected}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3 min-w-[260px]">Tựa Sách & Tác Giả</th>
                      <th className="py-2.5 px-3 min-w-[120px]">Định Dạng</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Kho Khả Dụng</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Giá Gốc</th>
                      <th className="py-2.5 px-3 min-w-[160px]">{isPlatformScope ? `Giá Flash Sale (-${platformDiscountPercent}%)` : 'Giá Flash Sale (VNĐ)'}</th>
                      <th className="py-2.5 px-3 min-w-[90px]">% Giảm</th>
                      <th className="py-2.5 px-3 min-w-[110px]">SL Flash Sale</th>
                      <th className="py-2.5 px-3 min-w-[110px]">Max / Khách</th>
                      <th className="py-2.5 px-3 min-w-[140px]">Chống Giá Ảo (30 Ngày)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {studioBooks.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-gray-400">
                          Không tìm thấy cuốn sách nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      studioBooks.map((book) => {
                        const orig = Number(book.price || 0);
                        const defaultSale = isPlatformScope
                          ? Math.max(1, Math.round(orig * (1 - platformDiscountPercent / 100)))
                          : Math.round(orig * 0.7);
                        const defaultMaxUser = isPlatformScope ? platformMaxPerUser : 1;

                        const config = bookConfigMap[book.id] || {
                          book,
                          isSelected: false,
                          salePrice: defaultSale,
                          stock: 10,
                          maxPerUser: defaultMaxUser,
                        };
                        const sale = isPlatformScope ? defaultSale : config.salePrice;
                        const disc = isPlatformScope ? platformDiscountPercent : (orig > 0 && sale > 0 && sale < orig ? Math.round(((orig - sale) / orig) * 100) : 0);
                        const avail = Number((book as any).available ?? book.physicalDetails?.stock ?? (book as any).stock ?? 20);

                        const conflictInfo = bookConflictMap.get(book.id);
                        const isConflicted = Boolean(conflictInfo?.hasConflict);

                        // 30-Day Anti-Fake-Discount & Pricing Guard
                        const lowest30d = (book as any).lowestPrice30Days || Math.round(orig * 0.95);
                        const antiFakeValidation = sellerPenaltyService.validateBookForFlashSale(
                          orig,
                          sale,
                          lowest30d,
                          isPlatformScope ? platformDiscountPercent : 10
                        );

                        return (
                          <tr
                            key={book.id}
                            className={`transition-colors ${
                              isConflicted
                                ? 'bg-gray-100/60 opacity-60'
                                : config.isSelected
                                ? 'bg-orange-50/50 hover:bg-orange-50/80 font-medium'
                                : 'hover:bg-gray-50/60'
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={config.isSelected}
                                disabled={isConflicted}
                                onChange={() => handleToggleSelectBook(book.id)}
                                title={
                                  isConflicted
                                    ? `Cuốn sách này đang tham gia đợt "${conflictInfo?.conflictSessionName}" (${conflictInfo?.conflictScope === 'PLATFORM' ? 'Flash Sale Sàn' : 'Flash Sale Shop'}) trong cùng khung giờ`
                                    : undefined
                                }
                                className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={book.coverImage || book.coverUrl || (book as any).cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=200&q=80'}
                                  alt={book.title}
                                  className="w-8 h-11 object-cover rounded-md border border-gray-200 shadow-2xs shrink-0"
                                />
                                <div className="min-w-0">
                                  <div className="font-bold text-gray-900 line-clamp-1">{book.title}</div>
                                  <div className="text-[10px] text-gray-500">
                                    {book.author?.name || (book as any).author || 'Tác giả'} •{' '}
                                    <span className="text-gray-400">{book.category?.name || 'Chung'}</span>
                                  </div>
                                  {isConflicted && (
                                    <span
                                      title={`Đang tham gia "${conflictInfo?.conflictSessionName}"`}
                                      className={`inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${
                                        conflictInfo?.conflictScope === 'PLATFORM'
                                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      }`}
                                    >
                                      <span className="material-symbols-outlined text-[11px]">lock</span>
                                      <span>
                                        {conflictInfo?.conflictScope === 'PLATFORM'
                                          ? 'Đang tham gia Flash Sale Sàn'
                                          : 'Đang tham gia Flash Sale Shop'}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-2.5 px-3">
                              {book.format === 'DIGITAL' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <span className="material-symbols-outlined text-[12px]">bolt</span>
                                  <span>Ebook DRM</span>
                                </span>
                              ) : book.format === 'BOTH' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                                  <span className="material-symbols-outlined text-[12px]">auto_stories</span>
                                  <span>Hybrid (Cả 2)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  <span className="material-symbols-outlined text-[12px]">inventory_2</span>
                                  <span>Sách Giấy</span>
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-semibold text-gray-600">
                              {avail} cuốn
                            </td>

                            <td className="py-2.5 px-3 font-bold text-gray-800">
                              {orig.toLocaleString('vi-VN')} đ
                            </td>

                            <td className="py-2.5 px-3">
                              {isPlatformScope ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={`${sale.toLocaleString('vi-VN')} đ`}
                                    disabled
                                    className="w-28 px-2 py-1 bg-amber-50/70 border border-amber-300 rounded-lg text-xs font-mono font-bold text-red-700 cursor-not-allowed"
                                  />
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 shrink-0">
                                    Trợ giá
                                  </span>
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min={1000}
                                  max={orig - 1}
                                  value={config.salePrice || ''}
                                  onChange={(e) =>
                                    handleUpdateBookField(book.id, 'salePrice', Number(e.target.value))
                                  }
                                  disabled={!config.isSelected}
                                  className="w-28 px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-orange-700 outline-none focus:border-orange-500 disabled:opacity-50"
                                />
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              {isPlatformScope ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap">
                                  🔒 -{platformDiscountPercent}%
                                </span>
                              ) : (
                                <span
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                    disc >= 50
                                      ? 'bg-red-100 text-red-700'
                                      : disc >= 30
                                      ? 'bg-orange-100 text-orange-700'
                                      : disc > 0
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-gray-100 text-gray-500'
                                  }`}
                                >
                                  -{disc}%
                                </span>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <input
                                type="number"
                                min={1}
                                max={avail || 999}
                                value={config.stock || ''}
                                onChange={(e) =>
                                  handleUpdateBookField(book.id, 'stock', Number(e.target.value))
                                }
                                disabled={!config.isSelected}
                                className="w-20 px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold text-gray-900 outline-none focus:border-orange-500 disabled:opacity-50"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              {isPlatformScope ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                                  🔒 {platformMaxPerUser} cuốn
                                </span>
                              ) : (
                                <select
                                  value={config.maxPerUser || 1}
                                  onChange={(e) =>
                                    handleUpdateBookField(book.id, 'maxPerUser', Number(e.target.value))
                                  }
                                  disabled={!config.isSelected}
                                  className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-[11px] font-medium outline-none disabled:opacity-50"
                                >
                                  <option value="1">1 cuốn</option>
                                  <option value="2">2 cuốn</option>
                                  <option value="5">5 cuốn</option>
                                </select>
                              )}
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex flex-col gap-0.5">
                                <div className="text-[10px] text-gray-500 font-mono">
                                  Min 30d: <strong className="text-gray-800">{lowest30d.toLocaleString('vi-VN')} đ</strong>
                                </div>
                                {antiFakeValidation.isValid ? (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 w-fit">
                                    <span className="material-symbols-outlined text-[10px]">verified</span>
                                    <span>Hợp lệ (-{orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0}%)</span>
                                  </span>
                                ) : (
                                  <span
                                    title={antiFakeValidation.reason}
                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 w-fit"
                                  >
                                    <span className="material-symbols-outlined text-[10px]">warning</span>
                                    <span>Cảnh báo giá ảo</span>
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Submit Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-600 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-600 text-base">check_circle</span>
                <span>
                  Đã chọn <strong>{selectedBooksList.length}</strong> cuốn sách để đăng ký vào khung giờ vàng
                  {isPlatformScope && (
                    <span className="ml-1 text-gray-500 font-medium">
                      (Hạn mức: {selectedBooksList.length}/{penaltyProfile.maxBooksPerPlatformSlot} cuốn)
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    selectedBooksList.length === 0 ||
                    (slotMode === 'CUSTOM' && Boolean(existingShopSlot)) ||
                    (isPlatformScope && !platformEligibility.eligible) ||
                    (isPlatformScope && selectedBooksList.length > penaltyProfile.maxBooksPerPlatformSlot)
                  }
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center gap-2 transition-all cursor-pointer hover:scale-[1.02]"
                >
                  <span className="material-symbols-outlined text-base">
                    {submitting ? 'progress_activity' : isPlatformScope && !platformEligibility.eligible ? 'gavel' : 'bolt'}
                  </span>
                  <span>
                    {submitting
                      ? 'Đang Đăng Ký...'
                      : slotMode === 'CUSTOM' && existingShopSlot
                      ? 'Đã Có 1 Đợt Đang Hoạt Động'
                      : isPlatformScope && !platformEligibility.eligible
                      ? 'Khóa Đăng Ký (Sao Quả Tạ >= 3)'
                      : isPlatformScope && selectedBooksList.length > penaltyProfile.maxBooksPerPlatformSlot
                      ? `Vượt Quá Hạn Mức (${selectedBooksList.length}/${penaltyProfile.maxBooksPerPlatformSlot})`
                      : `Xác Nhận Đăng Ký (${selectedBooksList.length} Sách)`}
                  </span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 5. Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <SellerFilterTabs
          tabs={[
            { key: 'ALL', label: 'Tất Cả Khung Giờ' },
            { key: 'ACTIVE', label: 'Đang Mở Bán ⚡' },
            { key: 'ENDED', label: 'Đã Kết Thúc 🏁' },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab)}
        />

        <div className="relative min-w-[260px]">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên sách, tác giả, khung giờ..."
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 outline-none"
          />
        </div>
      </div>

      {/* 6. High-Detail Session-Based Flash Sale Accordions & Tables */}
      <div className="space-y-6 w-full max-w-full min-w-0">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-400 border border-gray-100 shadow-xs">
            <span className="material-symbols-outlined text-3xl animate-spin text-orange-500 mb-2">
              progress_activity
            </span>
            <div className="font-medium text-sm">Đang tải chi tiết các phiên Flash Sale...</div>
          </div>
        ) : groupedSessions.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-gray-400 border border-gray-100 shadow-xs">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">
              bolt
            </span>
            <div className="font-bold text-gray-700 text-sm">Chưa có dữ liệu Flash Sale trong mục này</div>
            <p className="text-xs text-gray-400 mt-1">Bấm nút "Đăng Ký Sách Hàng Loạt" ở trên để đưa sách tham gia giờ vàng.</p>
          </div>
        ) : (
          paginatedSessions.map(({ slot, items }) => {
            const now = Date.now();
            const startsAt = new Date(slot.startsAt || 0).getTime();
            const endsAt = new Date(slot.endsAt || 0).getTime();
            const isEnded = (endsAt > 0 && endsAt < now) || slot.status === 'ENDED';
            const isActive = !isEnded && ((now >= startsAt && now <= endsAt) || slot.status === 'ACTIVE');
            const isScheduled = !isEnded && !isActive;

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

            const sessionTotalSold = items.reduce((s, i) => s + Number(i.sold || 0), 0);
            const sessionTotalStock = items.reduce((s, i) => s + Number(i.stock || 0), 0);
            const sessionRevenue = items.reduce((s, i) => s + Number(i.sold || 0) * Number(i.salePrice || 0), 0);

            return (
              <div
                key={slot.id}
                className={`w-full max-w-full min-w-0 bg-white rounded-3xl border transition-all overflow-hidden shadow-xs ${
                  isActive
                    ? 'border-orange-500/40 ring-2 ring-orange-500/10'
                    : isScheduled
                    ? 'border-blue-200'
                    : 'border-gray-200 opacity-80'
                }`}
              >
                {/* Session Header Card */}
                <div
                  className={`p-5 sm:p-6 border-b flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-red-500/5 border-orange-500/20'
                      : isScheduled
                      ? 'bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-slate-50 border-blue-100'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-md shrink-0 ${
                        isActive
                          ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/30 animate-pulse'
                          : isScheduled
                          ? 'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/20'
                          : 'bg-gray-500 shadow-none'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl">
                        {isActive ? 'local_fire_department' : isScheduled ? 'alarm_on' : 'check_circle'}
                      </span>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-title-md text-base sm:text-lg font-black text-gray-900">
                          {slot.name}
                        </h3>

                        <span
                          className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1 ${
                            isActive
                              ? 'bg-orange-600 text-white animate-pulse'
                              : isScheduled
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">
                            {isActive ? 'bolt' : isScheduled ? 'schedule' : 'done'}
                          </span>
                          {isActive ? 'ĐANG MỞ BÁN' : isScheduled ? 'SẮP DIỄN RA' : 'ĐÃ KẾT THÚC'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 mt-1 font-medium">
                        <span className="flex items-center gap-1 text-gray-700 font-bold">
                          <span className="material-symbols-outlined text-sm text-gray-400">schedule</span>
                          <span>{startTimeStr} - {endTimeStr}</span>
                          <span className="text-gray-400 font-normal">({dateStr})</span>
                        </span>

                        <span>•</span>
                        <span>{slot.description || 'Khung giờ giá sốc chính thức của Sàn HuKi'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Session Metrics & Actions */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 self-start lg:self-auto">
                    {/* Stat Badges */}
                    <div className="flex items-center gap-2 text-xs">
                      <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-gray-200 shadow-2xs">
                        <span className="text-gray-400 font-medium">Sách: </span>
                        <strong className="text-gray-900 font-black">{items.length}</strong>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-gray-200 shadow-2xs">
                        <span className="text-gray-400 font-medium">Đã bán: </span>
                        <strong className="text-emerald-700 font-black">{sessionTotalSold}</strong>
                        <span className="text-gray-400">/{sessionTotalStock + sessionTotalSold}</span>
                      </div>

                      <div className="px-3 py-1.5 rounded-xl bg-white/80 border border-gray-200 shadow-2xs">
                        <span className="text-gray-400 font-medium">Doanh thu: </span>
                        <strong className="text-blue-700 font-black">{sessionRevenue.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    </div>

                    {!isEnded && (
                      <button
                        type="button"
                        onClick={() => handleOpenRegisterForSlot(slot.id)}
                        className="px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-transform hover:scale-105 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        <span>Thêm sách</span>
                      </button>
                    )}

                    {(slot.scope === 'SHOP' || slot.storeId) && (
                      <button
                        type="button"
                        disabled={deletingSlotId === slot.id}
                        onClick={() => handleDeleteSlot(slot.id, slot.name)}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                        title="Xóa đợt Flash Sale này"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                        <span className="hidden sm:inline">Xóa đợt</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Session Table Container with High-Detail Horizontal Scroll */}
                <div className="w-full overflow-x-auto pb-3 scrollbar-thin [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-orange-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-orange-400">
                  <table className="w-full text-left text-xs min-w-[1450px]">
                    <thead className="bg-gray-50/95 text-gray-600 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200 sticky top-0">
                      <tr>
                        <th className="py-3 px-4 min-w-[320px] whitespace-nowrap">Sản Phẩm & Phân Loại</th>
                        <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">Giá Niêm Yết</th>
                        <th className="py-3 px-4 min-w-[180px] whitespace-nowrap">Giá Flash Sale (-%)</th>
                        <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">Kho Khả Dụng</th>
                        <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">Quota Phiên</th>
                        <th className="py-3 px-4 min-w-[190px] whitespace-nowrap">Tiến Độ Bán Hàng</th>
                        <th className="py-3 px-4 min-w-[140px] whitespace-nowrap">Doanh Thu</th>
                        <th className="py-3 px-4 min-w-[130px] whitespace-nowrap">Max / Khách</th>
                        <th className="py-3 px-4 min-w-[150px] whitespace-nowrap">Trạng Thái</th>
                        <th className="py-3 px-4 min-w-[140px] text-right whitespace-nowrap">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-gray-400 bg-gray-50/30 whitespace-nowrap">
                            Chưa có cuốn sách nào của shop đăng ký trong khung giờ này.{' '}
                            {!isEnded && (
                              <button
                                type="button"
                                onClick={() => handleOpenRegisterForSlot(slot.id)}
                                className="text-orange-600 font-bold hover:underline ml-1 cursor-pointer whitespace-nowrap"
                              >
                                Bấm vào đây để thêm ngay
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => {
                          const orig = Number(item.originalPrice || 0);
                          const sale = Number(item.salePrice || 0);
                          const disc = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;
                          const savings = orig > sale ? orig - sale : 0;
                          const sold = Number(item.sold || 0);
                          const quota = Number(item.stock || 0);
                          const totalAlloc = quota + sold;
                          const percent = totalAlloc > 0 ? Math.round((sold / totalAlloc) * 100) : 0;
                          const revenue = sold * sale;
                          const isSoldOut = quota <= 0 && sold > 0;
                          const isEditing = editingRowId === item.id;
                          const isCancellingThis = cancelCountdownState?.itemId === item.id;
                          const isCountdownActive = isCancellingThis && (cancelCountdownState?.secondsLeft ?? 0) > 0;

                          return (
                            <tr
                              key={item.id}
                              className={`transition-colors ${
                                isEditing ? 'bg-amber-50/60 ring-2 ring-amber-400/40' : 'hover:bg-orange-50/30'
                              }`}
                            >
                              {/* 1. Sản Phẩm */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.book?.coverImage || item.book?.coverUrl || (item.book as any)?.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=200&q=80'}
                                    alt={item.book?.title || 'Book'}
                                    className="w-10 h-14 object-cover rounded-lg border border-gray-200 shadow-2xs shrink-0"
                                  />
                                  <div className="min-w-0 max-w-[240px]">
                                    <div className="font-bold text-gray-900 truncate" title={item.book?.title || item.bookTitle}>
                                      {item.book?.title || item.bookTitle || 'Sách tham gia Flash Sale'}
                                    </div>
                                    <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                                      Tác giả: {item.book?.author || 'Tác giả'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Giá Niêm Yết */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="text-gray-400 line-through font-semibold text-xs">
                                  {orig.toLocaleString('vi-VN')} đ
                                </div>
                              </td>

                              {/* 3. Giá Flash Sale */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {isEditing ? (
                                  <div className="space-y-1">
                                    <div className="relative">
                                      <input
                                        type="number"
                                        min={1000}
                                        max={orig - 1}
                                        value={editingRowData?.salePrice || ''}
                                        onChange={(e) =>
                                          setEditingRowData((prev) =>
                                            prev ? { ...prev, salePrice: Number(e.target.value) } : null
                                          )
                                        }
                                        className="w-28 pl-2 pr-6 py-1 bg-white border-2 border-orange-500 rounded-lg text-xs font-black text-orange-600 outline-none shadow-2xs"
                                      />
                                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">đ</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-orange-600">
                                      -{orig > 0 && editingRowData ? Math.round(((orig - editingRowData.salePrice) / orig) * 100) : 0}% (tiết kiệm {Math.max(0, orig - (editingRowData?.salePrice || 0)).toLocaleString('vi-VN')} đ)
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-orange-600 text-sm">
                                        {sale.toLocaleString('vi-VN')} đ
                                      </span>
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 whitespace-nowrap shrink-0">
                                        -{disc}%
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                      Tiết kiệm {savings.toLocaleString('vi-VN')} đ
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* 4. Kho Khả Dụng */}
                              <td className="py-3.5 px-4 font-semibold text-gray-700 whitespace-nowrap">
                                {item.book?.available ?? 20} cuốn
                              </td>

                              {/* 5. Quota Phiên */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {isEditing ? (
                                  <div className="space-y-0.5">
                                    <input
                                      type="number"
                                      min={1}
                                      max={editingRowData?.availableStock || 999}
                                      value={editingRowData?.stock || ''}
                                      onChange={(e) =>
                                        setEditingRowData((prev) =>
                                          prev ? { ...prev, stock: Number(e.target.value) } : null
                                        )
                                      }
                                      className="w-20 px-2 py-1 bg-white border-2 border-orange-500 rounded-lg text-xs font-bold text-gray-900 outline-none shadow-2xs"
                                    />
                                    <div className="text-[9px] text-gray-400">Max: {editingRowData?.availableStock || 20}</div>
                                  </div>
                                ) : (
                                  <span className="font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                                    {quota} cuốn
                                  </span>
                                )}
                              </td>

                              {/* 6. Tiến Độ Bán Hàng */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="w-40 space-y-1">
                                  <div className="flex justify-between text-[10px] font-bold">
                                    <span className={sold > 0 ? 'text-orange-600' : 'text-gray-500'}>
                                      Đã bán {sold}
                                    </span>
                                    <span className="text-gray-400">{percent}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        percent >= 80
                                          ? 'bg-gradient-to-r from-orange-500 to-red-600 animate-pulse'
                                          : 'bg-gradient-to-r from-amber-400 to-orange-500'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(percent, 0))}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* 7. Doanh Thu */}
                              <td className="py-3.5 px-4 font-black text-blue-700 text-xs whitespace-nowrap">
                                {revenue.toLocaleString('vi-VN')} đ
                              </td>

                              {/* 8. Max / Khách */}
                              <td className="py-3.5 px-4 text-gray-600 font-medium whitespace-nowrap">
                                {isEditing ? (
                                  <select
                                    value={editingRowData?.maxPerUser || 1}
                                    onChange={(e) =>
                                      setEditingRowData((prev) =>
                                        prev ? { ...prev, maxPerUser: Number(e.target.value) } : null
                                      )
                                    }
                                    className="px-2 py-1 bg-white border border-orange-400 rounded-lg text-xs font-semibold text-gray-900 outline-none shadow-2xs"
                                  >
                                    <option value="1">1 cuốn</option>
                                    <option value="2">2 cuốn</option>
                                    <option value="5">5 cuốn</option>
                                    <option value="10">10 cuốn</option>
                                  </select>
                                ) : (
                                  <span>Tối đa {item.maxPerUser || 1} cuốn</span>
                                )}
                              </td>

                              {/* 9. Trạng Thái Sản Phẩm */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                {isSoldOut ? (
                                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-red-100 text-red-700 uppercase whitespace-nowrap inline-flex items-center gap-1 shrink-0">
                                    CHÁY HÀNG
                                  </span>
                                ) : isActive ? (
                                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 uppercase whitespace-nowrap inline-flex items-center gap-1 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-ping shrink-0"></span>
                                    ĐANG MỞ BÁN
                                  </span>
                                ) : isScheduled ? (
                                  <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 uppercase whitespace-nowrap inline-flex items-center gap-1 shrink-0">
                                    <span className="material-symbols-outlined text-[12px] shrink-0">schedule</span>
                                    <span>ĐÃ LÊN LỊCH</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 uppercase whitespace-nowrap inline-flex items-center gap-1 shrink-0">
                                    ĐÃ KẾT THÚC
                                  </span>
                                )}
                              </td>

                              {/* 10. Thao Tác (100% Inline - Không Popup) */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                {isEditing ? (
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handleSaveInlineEdit(item.id)}
                                      disabled={savingRowId === item.id}
                                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <span className="material-symbols-outlined text-sm">
                                        {savingRowId === item.id ? 'progress_activity' : 'check'}
                                      </span>
                                      <span>{savingRowId === item.id ? 'Đang lưu...' : 'Lưu'}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={handleCancelInlineEdit}
                                      disabled={savingRowId === item.id}
                                      className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
                                    >
                                      Hủy
                                    </button>
                                  </div>
                                ) : isScheduled ? (
                                  <div className="inline-flex items-center gap-1.5 justify-end">
                                    {isCancellingThis ? (
                                      isCountdownActive ? (
                                        <div className="inline-flex items-center gap-1">
                                          <button
                                            type="button"
                                            disabled
                                            className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs cursor-wait inline-flex items-center gap-1 animate-pulse whitespace-nowrap shadow-2xs"
                                          >
                                            <span className="material-symbols-outlined text-sm text-amber-700 animate-spin">
                                              timer
                                            </span>
                                            <span>Chờ ({cancelCountdownState?.secondsLeft ?? 5}s)...</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleAbortCancel}
                                            className="w-7 h-7 rounded-xl hover:bg-gray-200 text-gray-500 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                                            title="Hủy bỏ, giữ lại sách"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center gap-1 animate-in zoom-in-90 duration-150">
                                          <button
                                            type="button"
                                            onClick={() => handleExecuteCancel(item.id)}
                                            disabled={cancellingId === item.id}
                                            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs cursor-pointer shadow-md shadow-red-500/30 inline-flex items-center gap-1 animate-pulse whitespace-nowrap hover:scale-105 transition-all"
                                            title="Bấm lần nữa để xác nhận hủy ngay lập tức"
                                          >
                                            <span className="material-symbols-outlined text-sm">
                                              {cancellingId === item.id ? 'progress_activity' : 'delete_forever'}
                                            </span>
                                            <span>
                                              {cancellingId === item.id ? 'Đang hủy...' : 'Xác nhận hủy'}
                                            </span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={handleAbortCancel}
                                            className="w-7 h-7 rounded-xl hover:bg-gray-200 text-gray-500 font-bold text-xs flex items-center justify-center cursor-pointer transition-colors"
                                            title="Giữ lại sách"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      )
                                    ) : (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleStartInlineEdit(item)}
                                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 border border-amber-200 shadow-2xs whitespace-nowrap"
                                          title="Chỉnh sửa giá và số lượng Flash Sale trực tiếp trên dòng"
                                        >
                                          <span className="material-symbols-outlined text-sm">edit</span>
                                          <span>Sửa</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => handleInitiateCancel(item.id)}
                                          className="px-2.5 py-1.5 rounded-xl hover:bg-red-50 text-red-600 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 border border-red-200 shadow-2xs whitespace-nowrap"
                                          title="Hủy đăng ký sản phẩm (Chờ 5s rồi bấm xác nhận)"
                                        >
                                          <span className="material-symbols-outlined text-sm">delete</span>
                                          <span>Hủy</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                ) : isActive ? (
                                  <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg whitespace-nowrap inline-block" title="Sách đang trong khung giờ mở bán trực tiếp">
                                    Đang phát sóng
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-gray-400 italic whitespace-nowrap">Đã đóng</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}

        <SellerPagination
          currentPage={currentPage}
          totalPages={Math.ceil(groupedSessions.length / pageSize) || 1}
          totalItems={groupedSessions.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* 6. PLATFORM REGISTERED BOOKS DETAIL MODAL / DRAWER */}
      {viewPlatformDetailSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-gradient-to-r from-red-600 via-amber-600 to-orange-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-white shadow-inner">
                  <span className="material-symbols-outlined text-2xl">campaign</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-extrabold text-lg sm:text-xl tracking-tight">
                      {viewPlatformDetailSlot.name}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/25 text-white text-[10.5px] font-black uppercase tracking-wider">
                      Flash Sale Sàn
                    </span>
                  </div>
                  <p className="text-xs text-white/90 mt-0.5">
                    Danh sách sản phẩm của Shop đã đăng ký tham gia sự kiện khuyến mãi toàn sàn
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewPlatformDetailSlot(null)}
                className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Campaign Metrics Sub-Header */}
            <div className="p-4 bg-amber-50/70 border-b border-amber-200/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Mức Trợ Giá Sàn</span>
                <span className="text-sm font-black text-red-600 font-mono">
                  -{viewPlatformDetailSlot.discountPercent ?? 30}% Giảm
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Giới Hạn Mua / Khách</span>
                <span className="text-sm font-black text-blue-700 font-mono">
                  Tối đa {viewPlatformDetailSlot.maxPerUser ?? 1} cuốn
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Shop Đã Tham Gia</span>
                <span className="text-sm font-black text-gray-900 font-mono">
                  {viewPlatformDetailSlot.participatingStoresCount ?? 1} / {viewPlatformDetailSlot.maxStores ?? 10} Shop
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-amber-200/70 shadow-2xs">
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Sách Của Shop</span>
                <span className="text-sm font-black text-emerald-700 font-mono">
                  {platformRegisteredMyItems.length} Cuốn
                </span>
              </div>
            </div>

            {/* Modal Body: Registered Books Table */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {platformRegisteredMyItems.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs">
                  Chưa có sản phẩm nào của shop trong khung giờ này.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-2xl overflow-hidden overflow-x-auto shadow-xs">
                  <table className="w-full text-left text-xs min-w-[750px]">
                    <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4 min-w-[260px]">Sách Đăng Ký</th>
                        <th className="py-3 px-3 min-w-[110px]">Giá Gốc</th>
                        <th className="py-3 px-3 min-w-[150px]">Giá Trợ Giá Sàn</th>
                        <th className="py-3 px-3 min-w-[100px]">Quota Phiên</th>
                        <th className="py-3 px-3 min-w-[100px]">Đã Bán</th>
                        <th className="py-3 px-3 min-w-[110px]">Max / Khách</th>
                        <th className="py-3 px-3 min-w-[120px] text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {platformRegisteredMyItems.map((item) => {
                        const orig = Number(item.originalPrice || item.book?.price || 0);
                        const sale = Number(item.salePrice || 0);
                        const disc = orig > 0 ? Math.round(((orig - sale) / orig) * 100) : 0;
                        const isCancellingThis = cancelCountdownState?.itemId === item.id;
                        const isCountdownActive = isCancellingThis && (cancelCountdownState?.secondsLeft ?? 0) > 0;
                        const isLive = viewPlatformDetailSlot.status === 'ACTIVE';

                        return (
                          <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.book?.coverImage || item.book?.coverUrl || (item.book as any)?.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=200&q=80'}
                                  alt={item.book?.title || 'Book'}
                                  className="w-10 h-14 object-cover rounded-lg border border-gray-200 shadow-2xs shrink-0"
                                />
                                <div className="min-w-0 max-w-[220px]">
                                  <div className="font-bold text-gray-900 truncate" title={item.book?.title || item.bookTitle}>
                                    {item.book?.title || item.bookTitle || 'Sách Flash Sale'}
                                  </div>
                                  <div className="text-[10px] text-gray-500 truncate">
                                    {item.book?.author?.name || item.book?.author || 'Tác giả'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 font-semibold text-gray-500">
                              {orig.toLocaleString('vi-VN')} đ
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-black text-red-600 font-mono text-xs">
                                  {sale.toLocaleString('vi-VN')} đ
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 border border-rose-200">
                                  -{disc}%
                                </span>
                              </div>
                            </td>

                            <td className="py-3 px-3 font-bold text-gray-800">
                              {item.stock} cuốn
                            </td>

                            <td className="py-3 px-3 font-bold text-emerald-700">
                              {item.sold || 0} cuốn
                            </td>

                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                                Max {item.maxPerUser || 1}
                              </span>
                            </td>

                            <td className="py-3 px-3 text-right">
                              {isLive ? (
                                <span className="text-[11px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-lg">
                                  Đang phát sóng
                                </span>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  {isCancellingThis ? (
                                    isCountdownActive ? (
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled
                                          className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-black text-[11px] cursor-wait inline-flex items-center gap-1 animate-pulse shadow-2xs"
                                        >
                                          <span>Chờ ({cancelCountdownState?.secondsLeft ?? 5}s)...</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleAbortCancel}
                                          className="w-6 h-6 rounded-lg hover:bg-gray-200 text-gray-500 font-bold text-xs flex items-center justify-center cursor-pointer"
                                          title="Hủy bỏ, giữ lại sách"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleExecuteCancel(item.id)}
                                          disabled={cancellingId === item.id}
                                          className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-[11px] cursor-pointer shadow-md inline-flex items-center gap-1 animate-pulse"
                                        >
                                          <span>{cancellingId === item.id ? 'Đang hủy...' : 'Xác nhận hủy'}</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={handleAbortCancel}
                                          className="w-6 h-6 rounded-lg hover:bg-gray-200 text-gray-500 font-bold text-xs flex items-center justify-center cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    )
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleInitiateCancel(item.id)}
                                      className="px-2.5 py-1 rounded-lg hover:bg-red-50 text-red-600 font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1 border border-red-200 shadow-2xs"
                                      title="Rút sách khỏi chiến dịch Flash Sale Sàn"
                                    >
                                      <span className="material-symbols-outlined text-xs">delete</span>
                                      <span>Rút sách</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewPlatformDetailSlot(null)}
                className="px-5 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. SAO QUẢ TẠ TRANSPARENCY, ELIGIBILITY CRITERIA & APPEAL MODAL */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-gray-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-rose-500/10 border-b border-gray-100 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
                  <span className="material-symbols-outlined text-2xl">policy</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                      Quy Chế Sao Quả Tạ & Tiêu Chuẩn Tham Gia Flash Sale Sàn
                    </h2>
                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        penaltyProfile.tier === 'TIER_0_GOOD'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : penaltyProfile.tier === 'TIER_1_WARNING'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      Hiện tại: {penaltyProfile.penaltyPoints}/3 ⭐ ({PENALTY_TIER_CONFIG[penaltyProfile.tier].name})
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Chuẩn mực vận hành minh bạch theo mô hình Shopee/Lazada bảo vệ uy tín sàn và quyền lợi người đọc
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                className="w-8 h-8 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Tabs Header */}
            <div className="flex items-center gap-1.5 px-6 pt-3 border-b border-gray-100 bg-gray-50/70 overflow-x-auto">
              {[
                { id: 'CHECKLIST', label: '1. 5 Tiêu Chuẩn Vận Hành Sàn', icon: 'checklist' },
                { id: 'TIERS', label: '2. Ma Trận Sao Quả Tạ (5 Cấp)', icon: 'stairs' },
                { id: 'APPEALS', label: `3. Vi Phạm & Khiếu Nại (${penaltyProfile.violationHistory.length})`, icon: 'rate_review' },
                { id: 'SIMULATOR', label: '4. 🧪 Trình Thử Nghiệm Sao Quả Tạ', icon: 'science' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPolicyActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                    policyActiveTab === tab.id
                      ? 'border-orange-600 text-orange-600 bg-white shadow-2xs'
                      : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Modal Body Content */}
            <div className="p-6 overflow-y-auto max-h-[64vh] space-y-6">
              {/* TAB 1: 5 TIÊU CHUẨN VẬN HÀNH SÀN */}
              {policyActiveTab === 'CHECKLIST' && (
                <div className="space-y-5">
                  {/* Overall Status Banner */}
                  <div
                    className={`p-4 rounded-2xl border flex items-start gap-3.5 ${
                      eligibilityChecklist.isEligible
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-2xl mt-0.5 shrink-0 ${
                        eligibilityChecklist.isEligible ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {eligibilityChecklist.isEligible ? 'check_circle' : 'cancel'}
                    </span>
                    <div className="text-xs space-y-1">
                      <div className="text-sm font-black">
                        {eligibilityChecklist.isEligible
                          ? 'Chúc mừng! Gian hàng của bạn ĐỦ ĐIỀU KIỆN tham gia Flash Sale của Sàn'
                          : 'Gian hàng hiện tại CHƯA ĐỦ ĐIỀU KIỆN tham gia Flash Sale của Sàn'}
                      </div>
                      <p className="text-gray-600 leading-relaxed">
                        {eligibilityChecklist.isEligible
                          ? `Gian hàng đạt tất cả 5 tiêu chuẩn khắt khe về chất lượng dịch vụ và uy tín. Bạn được phân bổ tối đa ${eligibilityChecklist.maxBooksPerSlot} cuốn sách trong mỗi khung giờ vàng của Sàn.`
                          : 'Gian hàng vi phạm một hoặc nhiều tiêu chuẩn vận hành. Bạn cần cải thiện các chỉ số dưới đây hoặc nộp đơn khiếu nại đối với điểm Sao Quả Tạ.'}
                      </p>
                    </div>
                  </div>

                  {/* Checklist Items Grid */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                      Bảng Đánh Giá 5 Tiêu Chuẩn Tham Gia Giờ Vàng Sàn:
                    </h3>

                    {eligibilityChecklist.items.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          item.passed
                            ? 'bg-white border-gray-200 shadow-2xs'
                            : 'bg-rose-50/50 border-rose-200 shadow-xs'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                                item.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              <span className="material-symbols-outlined text-base">
                                {item.passed ? 'check' : 'close'}
                              </span>
                            </div>
                            <div>
                              <div className="text-xs font-bold text-gray-900 flex items-center gap-2">
                                <span>{idx + 1}. {item.title}</span>
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <div className="text-right font-mono text-xs">
                              <span className="text-[10px] text-gray-400 block font-sans">Hiện tại / Tiêu chuẩn</span>
                              <span className={`font-black ${item.passed ? 'text-emerald-700' : 'text-rose-700'}`}>
                                {item.currentValue}
                              </span>{' '}
                              <span className="text-gray-400 font-normal">/ {item.benchmark}</span>
                            </div>
                            <span
                              className={`text-[10.5px] font-black px-2.5 py-1 rounded-xl ${
                                item.passed
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                              }`}
                            >
                              {item.passed ? 'ĐẠT CHUẨN ✅' : 'CHƯA ĐẠT ❌'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: MA TRẬN CHẾ TÀI SAO QUẢ TẠ */}
              {policyActiveTab === 'TIERS' && (
                <div className="space-y-5">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
                    <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
                      info
                    </span>
                    <div className="text-xs space-y-1">
                      <div className="font-extrabold text-amber-800">
                        Cơ Chế Khắc Phục & Đặt Lại Theo Quý (Shopee/Lazada Pattern)
                      </div>
                      <p className="text-amber-700 leading-relaxed">
                        Toàn bộ Điểm Sao Quả Tạ được <strong>tự động làm mới về 0</strong> vào ngày đầu tiên của mỗi Quý (01/01, 01/04, 01/07, 01/10). Thời hạn khóa tính năng Flash Sale Sàn đối với Cấp 2 là <strong>28 ngày</strong> kể từ ngày vi phạm cuối cùng.
                      </p>
                    </div>
                  </div>

                  {/* Tier Matrix Table */}
                  <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200">
                        <tr>
                          <th className="py-3 px-4">Cấp Bậc</th>
                          <th className="py-3 px-4">Điểm Sao</th>
                          <th className="py-3 px-4">Quyền Lợi Flash Sale Sàn</th>
                          <th className="py-3 px-4">Quyền Hiển Thị Tìm Kiếm</th>
                          <th className="py-3 px-4">Thanh Toán & Rút Tiền</th>
                          <th className="py-3 px-4 text-center">Trạng Thái Shop</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {[
                          {
                            key: 'TIER_0_GOOD',
                            tier: 'Cấp 0 (Tốt)',
                            points: '0 - 1 điểm',
                            flashSale: 'Tham gia bình thường (Max 20 cuốn/slot)',
                            search: 'Hiển thị tối đa trên toàn sàn',
                            wallet: 'Rút tiền bình thường',
                            bg: 'bg-white',
                          },
                          {
                            key: 'TIER_1_WARNING',
                            tier: 'Cấp 1 (Cảnh Báo)',
                            points: '2 điểm',
                            flashSale: 'Giới hạn tối đa 3 cuốn/slot Flash Sale Sàn',
                            search: 'Bình thường',
                            wallet: 'Bình thường',
                            bg: 'bg-amber-50/40',
                          },
                          {
                            key: 'TIER_2_BLOCKED_FLASH_SALE',
                            tier: 'Cấp 2 (Khóa Flash Sale)',
                            points: '3 - 5 điểm',
                            flashSale: '🚫 Tạm khóa tham gia Flash Sale Sàn trong 28 ngày',
                            search: 'Bình thường',
                            wallet: 'Bình thường',
                            bg: 'bg-rose-50/40',
                          },
                          {
                            key: 'TIER_3_SEARCH_DEBOOST',
                            tier: 'Cấp 3 (Giảm Hiển Thị)',
                            points: '6 - 8 điểm',
                            flashSale: '🚫 Khóa tham gia tất cả chiến dịch khuyến mãi Sàn',
                            search: 'Giảm 50% thứ hạng tìm kiếm và danh mục',
                            wallet: 'Bình thường',
                            bg: 'bg-purple-50/40',
                          },
                          {
                            key: 'TIER_4_FROZEN',
                            tier: 'Cấp 4 (Đóng Băng)',
                            points: '>= 9 điểm',
                            flashSale: '🚫 Khóa toàn bộ tính năng khuyến mãi',
                            search: 'Ẩn toàn bộ sản phẩm khỏi kết quả tìm kiếm',
                            wallet: 'Tạm dừng thanh toán & yêu cầu xác minh bảo mật',
                            bg: 'bg-red-100/50',
                          },
                        ].map((row) => {
                          const isCurrent = penaltyProfile.tier === row.key;
                          return (
                            <tr
                              key={row.key}
                              className={`${row.bg} ${isCurrent ? 'ring-2 ring-orange-500 font-bold' : ''}`}
                            >
                              <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-1.5">
                                <span>{row.tier}</span>
                                {isCurrent && (
                                  <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-orange-600 text-white font-extrabold uppercase">
                                    Hiện Tại
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 font-mono font-bold text-gray-800">{row.points}</td>
                              <td className="py-3 px-4">{row.flashSale}</td>
                              <td className="py-3 px-4">{row.search}</td>
                              <td className="py-3 px-4">{row.wallet}</td>
                              <td className="py-3 px-4 text-center">
                                {isCurrent ? (
                                  <span className="text-xs text-orange-600 font-black">⭐ Đang Áp Dụng</span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                    <span>Chu kỳ reset điểm tiếp theo: <strong>{new Date(penaltyProfile.quarterlyResetDate).toLocaleDateString('vi-VN')}</strong></span>
                    <span>Hệ thống tự động đồng bộ thời gian thực (Zero F5)</span>
                  </div>
                </div>
              )}

              {/* TAB 3: LỊCH SỬ VI PHẠM & KHIẾU NẠI TRỰC TIẾP */}
              {policyActiveTab === 'APPEALS' && (
                <div className="space-y-6">
                  {/* Violations List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Lịch Sử Ghi Nhận Điểm Phạt Của Gian Hàng:</span>
                      <span className="text-gray-400 font-normal">({penaltyProfile.violationHistory.length} vi phạm)</span>
                    </h3>

                    {penaltyProfile.violationHistory.length === 0 ? (
                      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 text-gray-400 space-y-1">
                        <span className="material-symbols-outlined text-3xl text-emerald-500">sentiment_very_satisfied</span>
                        <div className="font-bold text-gray-700">Gian hàng hoàn toàn trong sạch!</div>
                        <p className="text-xs">Chưa có bất kỳ ghi nhận điểm phạt nào từ Ban Quản Trị HuKi.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {penaltyProfile.violationHistory.map((item) => {
                          const isAppealed = Boolean(item.appealStatus);
                          const isPending = item.appealStatus === 'PENDING';
                          const isApproved = item.appealStatus === 'APPROVED';
                          const isRejected = item.appealStatus === 'REJECTED';

                          return (
                            <div
                              key={item.id}
                              className={`p-4 rounded-2xl border space-y-3 ${
                                item.status === 'RESOLVED'
                                  ? 'bg-gray-50/70 border-gray-200 opacity-75'
                                  : 'bg-white border-rose-200 shadow-2xs'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-xs font-bold text-gray-500">{item.code}</span>
                                  <span className="text-xs font-black text-gray-900">{item.reason}</span>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                                    +{item.points} Điểm Phạt
                                  </span>
                                  {item.status === 'RESOLVED' && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                      Đã Khắc Phục / Đã Hủy
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-gray-400 font-mono">
                                  {new Date(item.createdAt).toLocaleString('vi-VN')}
                                </span>
                              </div>

                              {item.evidenceNotes && (
                                <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                                  <span className="font-bold text-gray-700">Ghi chú bằng chứng sàn:</span> {item.evidenceNotes}
                                </div>
                              )}

                              {/* Appeal Section */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                                <div>
                                  {item.appealStatus === 'PENDING' && (
                                    <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-sm animate-spin">hourglass_top</span>
                                      <span>Đang thẩm định khiếu nại (Admin HuKi sẽ phản hồi trong 24h)</span>
                                    </div>
                                  )}
                                  {item.appealStatus === 'APPROVED' && (
                                    <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
                                      <span className="material-symbols-outlined text-sm">check_circle</span>
                                      <span>Khiếu nại thành công: Điểm phạt đã được thu hồi!</span>
                                    </div>
                                  )}
                                  {item.appealStatus === 'REJECTED' && (
                                    <div className="text-xs text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 space-y-0.5">
                                      <div className="font-bold flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">cancel</span>
                                        <span>Khiếu nại bị từ chối</span>
                                      </div>
                                      {item.appealAdminNote && (
                                        <p className="text-[11px] text-rose-600">{item.appealAdminNote}</p>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  {!item.appealStatus && item.canAppeal && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAppealViolationId(item.id);
                                        setAppealReason(`Kính gửi Ban Quản Trị, vi phạm ${item.code} xảy ra do sự cố bất khả kháng...`);
                                      }}
                                      className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1"
                                    >
                                      <span className="material-symbols-outlined text-xs">rate_review</span>
                                      <span>Gửi Đơn Khiếu Nại</span>
                                    </button>
                                  )}

                                  {/* Demo Admin Quick Resolution Buttons */}
                                  {item.appealStatus === 'PENDING' && (
                                    <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                                      <button
                                        type="button"
                                        onClick={() => handleArbitrateAppeal(item.id, true)}
                                        className="text-[10px] px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold cursor-pointer transition-colors"
                                        title="Mô phỏng thao tác Admin HuKi chấp thuận khiếu nại"
                                      >
                                        ⚡ Demo Admin Duyệt
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleArbitrateAppeal(item.id, false)}
                                        className="text-[10px] px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold cursor-pointer transition-colors"
                                        title="Mô phỏng thao tác Admin HuKi từ chối khiếu nại"
                                      >
                                        ⚡ Demo Admin Từ Chối
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Submit Appeal Form */}
                  {appealViolationId && (
                    <form
                      onSubmit={handleSubmitAppeal}
                      className="p-5 bg-gradient-to-br from-orange-50/60 to-amber-50/60 rounded-3xl border-2 border-orange-200 space-y-4 animate-in slide-in-from-bottom-2 duration-150"
                    >
                      <div className="flex items-center justify-between border-b border-orange-200/60 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-orange-600">edit_note</span>
                          <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 uppercase">
                            Đơn Khiếu Nại Điểm Phạt
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAppealViolationId('')}
                          className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer font-bold"
                        >
                          ✕ Hủy
                        </button>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase">
                          Lý do giải trình & Bằng chứng khách quan: <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={appealReason}
                          onChange={(e) => setAppealReason(e.target.value)}
                          placeholder="Trình bày chi tiết lý do bất khả kháng (sự cố đơn vị vận chuyển, thiên tai, nhầm lẫn mã sách...)"
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 resize-none"
                        ></textarea>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase">
                          Ghi chú liên kết bằng chứng hoặc ảnh minh chứng:
                        </label>
                        <input
                          type="text"
                          value={appealProof}
                          onChange={(e) => setAppealProof(e.target.value)}
                          placeholder="VD: Biên bản giao hàng, hình ảnh bưu phẩm, link driver tài liệu..."
                          className="w-full px-3.5 py-2 bg-white border border-gray-300 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setAppealViolationId('')}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-white cursor-pointer"
                        >
                          Đóng
                        </button>
                        <button
                          type="submit"
                          disabled={appealSubmitting || !appealReason.trim()}
                          className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-md transition-all flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">send</span>
                          <span>{appealSubmitting ? 'Đang gửi...' : 'Gửi Đơn Khiếu Nại'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* TAB 4: TRÌNH THỬ NGHIỆM SAO QUẢ TẠ */}
              {policyActiveTab === 'SIMULATOR' && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-start gap-3 text-purple-900">
                    <span className="material-symbols-outlined text-purple-600 text-xl shrink-0 mt-0.5">
                      science
                    </span>
                    <div className="text-xs space-y-1">
                      <div className="font-extrabold text-purple-800">
                        Phòng Thử Nghiệm Tình Huống Thời Gian Thực (Zero-F5 Simulation)
                      </div>
                      <p className="text-purple-700 leading-relaxed">
                        Nhấn vào các nút bên dưới để mô phỏng ngay lập tức việc cộng điểm phạt, kích hoạt chế tài khóa Flash Sale Sàn (khi đạt từ 3 điểm trở lên), hoặc đặt lại điểm về 0 theo Quý. Toàn bộ giao diện Studio, bảng chọn sách, nút đăng ký và thông báo sẽ cập nhật tức thì qua <strong>SyncBus</strong> mà không cần tải lại trang.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleSimulateViolation(
                          'NON_FULFILLMENT',
                          1,
                          'Hủy đơn hàng người mua do hết hàng trong kho (NFR vượt 5%)',
                          'Mã đơn #HK-9921 bị hủy bởi người bán'
                        )
                      }
                      className="p-3.5 rounded-2xl bg-white hover:bg-amber-50 border border-gray-200 hover:border-amber-300 text-left transition-all cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 group-hover:text-amber-800">
                          +1 Điểm: Hủy Đơn Hàng Hết Kho
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          +1 Điểm
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Tỷ lệ đơn hàng không thành công NFR vượt ngưỡng 5%
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSimulateViolation(
                          'LATE_SHIPMENT',
                          2,
                          'Giao hàng cho đơn vị vận chuyển trễ hạn quy định (LSR vượt 10%)',
                          '4 đơn hàng phát sinh quá 48h chưa bàn giao'
                        )
                      }
                      className="p-3.5 rounded-2xl bg-white hover:bg-amber-50 border border-gray-200 hover:border-amber-300 text-left transition-all cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 group-hover:text-amber-800">
                          +2 Điểm: Giao Hàng Quá Hạn
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          +2 Điểm
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Kích hoạt Cấp 1 (Cảnh Báo, giới hạn tối đa 3 sách/đợt Flash Sale Sàn)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSimulateViolation(
                          'COPYRIGHT_VIOLATION',
                          3,
                          'Sách bị báo cáo nghi vấn vi phạm bản quyền / scan lậu',
                          'Nhà xuất bản gửi công văn khiếu nại bản quyền số #CP-883'
                        )
                      }
                      className="p-3.5 rounded-2xl bg-white hover:bg-rose-50 border border-gray-200 hover:border-rose-300 text-left transition-all cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 group-hover:text-rose-800">
                          +3 Điểm: Vi Phạm Bản Quyền Sách
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                          +3 Điểm 🚫
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Kích hoạt ngay Cấp 2: <strong>Khóa tham gia Flash Sale Sàn trong 28 ngày!</strong>
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleSimulateViolation(
                          'PROMOTION_FRAUD',
                          6,
                          'Hành vi tăng giá niêm yết trước giờ mở bán để giả giảm giá sâu',
                          'Audit bot phát hiện tăng giá 150% trước 24h'
                        )
                      }
                      className="p-3.5 rounded-2xl bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-300 text-left transition-all cursor-pointer shadow-2xs group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-gray-900 group-hover:text-purple-800">
                          +6 Điểm: Gian Lận Giá Ảo
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                          +6 Điểm ⚡
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Kích hoạt Cấp 3: Giảm thứ hạng tìm kiếm & khóa toàn bộ khuyến mãi
                      </p>
                    </button>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                    <div>
                      <div className="text-xs font-bold text-gray-900">
                        Đặt Lại Điểm Phạt Về 0 (Quarterly Reset)
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Mô phỏng ngày đầu tiên của Quý mới để khôi phục quyền tham gia Flash Sale Sàn
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateResetQuarter}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <span className="material-symbols-outlined text-sm">restart_alt</span>
                      <span>Reset Về 0 Điểm Phạt</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">
                Mọi khiếu nại về Sao Quả Tạ được thẩm định công khai bởi Hội Đồng Giám Sát HuKi
              </span>
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SellerFlashSaleView;
