'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { catalogApi, type BookData } from '@/ui/api/catalogApi';
import { businessApi } from '@/ui/api/businessApi';
import { flashSaleApi, invalidateFlashSaleCache, type FlashSaleSlot } from '@/ui/api/flashSaleApi';
import { SellerActionButton, SellerStatusBadge } from '@/ui/components/seller/SellerUI';
import { StandardPaginationBar } from '@/ui/components/common/GroupedDataTable';
import CountdownConfirmModal from '@/ui/components/common/CountdownConfirmModal';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import {
  resolveBookOriginalPriceByFormat,
  getDefaultFlashSaleTargetFormat,
  getFlashSaleFormatStyle,
  type FlashSaleTargetFormat,
} from '@/ui/utils/flashSaleFormat';

interface AddableBookConfig {
  book: BookData;
  isSelected: boolean;
  targetFormat: FlashSaleTargetFormat;
  salePrice: number;
  stock: number;
  maxPerUser: number;
}

const getAuthorLabel = (author: unknown): string => {
  if (!author) return '';
  if (typeof author === 'string') return author;
  if (typeof author === 'object' && author !== null && 'name' in author) {
    return String((author as { name?: unknown }).name || '');
  }
  return '';
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function SellerFlashSaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slotId = typeof params?.id === 'string' ? params.id : '';

  const { user, activeBusinessId, setActiveBusinessId } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [slot, setSlot] = useState<FlashSaleSlot | any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [sellerBooks, setSellerBooks] = useState<BookData[]>([]);

  // Pagination & quick filter for registered books table
  const PAGE_SIZE = 10;
  const [itemSearch, setItemSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Inline Edit Item state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    salePrice: number;
    stock: number;
    maxPerUser: number;
    originalPrice: number;
  } | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  // Two-step inline cancel confirmation
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  // Delete Slot state
  const [deletingSlot, setDeletingSlot] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Add Books inline panel state
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addBookMap, setAddBookMap] = useState<Record<string, AddableBookConfig>>({});
  const [submittingAdd, setSubmittingAdd] = useState(false);

  const loadDetail = useCallback(async (silent = false) => {
    if (!slotId) return;
    try {
      if (!silent) setLoading(true);

      let bizId = user?.business?.id || activeBusinessId;
      if (!bizId) {
        try {
          const myBiz = await businessApi.getMyBusiness();
          if (myBiz.success && myBiz.data?.id) {
            bizId = myBiz.data.id;
            setActiveBusinessId(bizId);
          }
        } catch {
          // ignore
        }
      }

      const [slotsRes, itemsRes, booksRes] = await Promise.all([
        flashSaleApi.getSellerSlots(),
        flashSaleApi.getSellerMyItems(),
        catalogApi.getSellerBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) }).catch(() => null),
      ]);

      const rawSlots = slotsRes.success && slotsRes.data
        ? Array.isArray(slotsRes.data)
          ? slotsRes.data
          : Array.isArray((slotsRes.data as any).slots)
            ? (slotsRes.data as any).slots
            : Array.isArray((slotsRes.data as any).items)
              ? (slotsRes.data as any).items
              : []
        : [];

      const rawItems = itemsRes.success && itemsRes.data
        ? Array.isArray(itemsRes.data)
          ? itemsRes.data
          : Array.isArray((itemsRes.data as any).items)
            ? (itemsRes.data as any).items
            : []
        : [];

      const slotItems = rawItems.filter((it: any) => (it.flashSaleId || it.flashSale?.id) === slotId);
      const matchedSlot =
        rawSlots.find((s: any) => s.id === slotId) ||
        slotItems[0]?.flashSale ||
        null;

      setSlot(matchedSlot);
      setItems(slotItems);

      const rawBooksList: BookData[] = booksRes?.success && booksRes.data
        ? Array.isArray(booksRes.data)
          ? booksRes.data
          : Array.isArray((booksRes.data as any).items)
            ? (booksRes.data as any).items
            : []
        : [];
      setSellerBooks(rawBooksList);
    } catch (err: any) {
      if (!silent) {
        showToast('Không thể tải chi tiết đợt Flash Sale: ' + (err?.message || 'Lỗi mạng'), 'error');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [slotId, user, activeBusinessId, setActiveBusinessId, showToast]);

  useEffect(() => {
    loadDetail(false);
    const unsub = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'FLASH_SALE_UPDATED') {
        invalidateFlashSaleCache();
        loadDetail(true);
      }
    });
    return () => unsub();
  }, [loadDetail]);

  const statusMeta = useMemo(() => {
    if (!slot) {
      return { statusKey: 'DRAFT', label: 'Không xác định', isEnded: true, isActive: false, isScheduled: false };
    }
    const now = Date.now();
    const startsAt = new Date(slot.startsAt || 0).getTime();
    const endsAt = new Date(slot.endsAt || 0).getTime();
    const isEnded = (endsAt > 0 && endsAt < now) || slot.status === 'ENDED' || slot.status === 'CANCELLED';
    const isActive = !isEnded && ((now >= startsAt && now <= endsAt) || slot.status === 'ACTIVE');
    const isScheduled = !isEnded && !isActive;

    if (isActive) {
      return { statusKey: 'ACTIVE', label: 'Đang mở bán', isEnded: false, isActive: true, isScheduled: false };
    }
    if (isScheduled) {
      return { statusKey: 'PENDING', label: 'Sắp diễn ra', isEnded: false, isActive: false, isScheduled: true };
    }
    return { statusKey: 'CANCELLED', label: 'Đã kết thúc', isEnded: true, isActive: false, isScheduled: false };
  }, [slot]);

  const isPlatformScope = useMemo(
    () => Boolean(slot && (slot.scope === 'PLATFORM' || !slot.storeId)),
    [slot]
  );

  const metrics = useMemo(() => {
    const totalSold = items.reduce((sum, i) => sum + Number(i.sold || 0), 0);
    const totalRemaining = items.reduce((sum, i) => sum + Number(i.stock || 0), 0);
    const totalQuota = totalSold + totalRemaining;
    const revenue = items.reduce((sum, i) => sum + Number(i.sold || 0) * Number(i.salePrice || 0), 0);
    const customerSavings = items.reduce((sum, i) => {
      const orig = Number(i.originalPrice || i.book?.price || 0);
      const sale = Number(i.salePrice || 0);
      return sum + Math.max(0, orig - sale) * Number(i.sold || 0);
    }, 0);
    const fillRate = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : 0;
    return { totalSold, totalRemaining, totalQuota, revenue, customerSavings, fillRate };
  }, [items]);

  // Populate addable books whenever opening the Add Books drawer
  const registeredBookIds = useMemo(
    () => new Set(items.map((it) => it.bookId || it.book?.id).filter(Boolean)),
    [items]
  );

  const availableBooksToAdd = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return sellerBooks.filter((b) => {
      if (registeredBookIds.has(b.id)) return false;
      if (!q) return true;
      return (
        b.title?.toLowerCase().includes(q) ||
        getAuthorLabel(b.author).toLowerCase().includes(q)
      );
    });
  }, [sellerBooks, registeredBookIds, addSearch]);

  const openAddPanel = () => {
    const disc = Number(slot?.discountPercent ?? 30);
    const maxUser = Number(slot?.maxPerUser ?? 1);
    const nextMap: Record<string, AddableBookConfig> = {};
    sellerBooks.forEach((b) => {
      if (registeredBookIds.has(b.id)) return;
      const defaultFmt = getDefaultFlashSaleTargetFormat(b);
      const orig = resolveBookOriginalPriceByFormat(b, defaultFmt) || Number(b.price || 100000);
      const avail = Number((b as any).available ?? b.physicalDetails?.stock ?? (b as any).stock ?? 20);
      nextMap[b.id] = {
        book: b,
        isSelected: false,
        targetFormat: defaultFmt,
        salePrice: Math.max(1000, Math.round(orig * (1 - disc / 100))),
        stock: Math.min(10, Math.max(1, avail)),
        maxPerUser: maxUser,
      };
    });
    setAddBookMap(nextMap);
    setIsAddPanelOpen(true);
  };

  const selectedAddBooks = useMemo(
    () => Object.values(addBookMap).filter((c) => c.isSelected),
    [addBookMap]
  );

  const handleSubmitAddBooks = async () => {
    if (!slotId || selectedAddBooks.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 cuốn sách để thêm vào đợt Flash Sale', 'warning');
      return;
    }

    for (const cfg of selectedAddBooks) {
      const orig = resolveBookOriginalPriceByFormat(cfg.book, cfg.targetFormat);
      if (cfg.salePrice <= 0 || (orig > 0 && cfg.salePrice >= orig)) {
        showToast(`Giá Flash Sale của "${cfg.book.title}" phải nhỏ hơn giá gốc (${orig.toLocaleString('vi-VN')} đ)`, 'error');
        return;
      }
      if (cfg.stock <= 0) {
        showToast(`Số lượng mở bán của "${cfg.book.title}" phải lớn hơn 0`, 'error');
        return;
      }
    }

    try {
      setSubmittingAdd(true);
      const res = await flashSaleApi.sellerRegisterBatch({
        flashSaleId: slotId,
        items: selectedAddBooks.map((c) => ({
          bookId: c.book.id,
          salePrice: c.salePrice,
          stock: c.stock,
          maxPerUser: c.maxPerUser,
          targetFormat: c.targetFormat,
        })),
      });

      if (res.success) {
        showToast(`Đã thêm ${selectedAddBooks.length} ấn phẩm vào đợt Flash Sale`, 'success');
        setIsAddPanelOpen(false);
        invalidateFlashSaleCache();
        realtimeSyncBus.publish('FLASH_SALE_UPDATED', { slotId });
        await loadDetail(true);
      } else {
        showToast((res as any)?.message || 'Không thể thêm sách vào đợt Flash Sale', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi thêm sách vào Flash Sale', 'error');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleStartEdit = (item: any) => {
    const orig = Number(item.originalPrice || item.book?.price || 0);
    setEditingItemId(item.id);
    setEditForm({
      salePrice: Number(item.salePrice || Math.round(orig * 0.7)),
      stock: Number(item.stock || 10),
      maxPerUser: Number(item.maxPerUser || 1),
      originalPrice: orig,
    });
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editForm) return;
    if (editForm.salePrice <= 0 || (editForm.originalPrice > 0 && editForm.salePrice >= editForm.originalPrice)) {
      showToast(
        `Giá Flash Sale (${editForm.salePrice.toLocaleString('vi-VN')} đ) phải nhỏ hơn giá niêm yết (${editForm.originalPrice.toLocaleString('vi-VN')} đ)`,
        'error'
      );
      return;
    }
    if (editForm.stock <= 0) {
      showToast('Số lượng bán phải lớn hơn 0', 'error');
      return;
    }

    try {
      setSavingItemId(itemId);
      const res = await flashSaleApi.sellerUpdateItem(itemId, {
        salePrice: editForm.salePrice,
        stock: editForm.stock,
        maxPerUser: editForm.maxPerUser,
      });

      if (res.success) {
        showToast('Đã cập nhật thông số Flash Sale', 'success');
        setItems((prev) =>
          prev.map((it) =>
            it.id === itemId
              ? {
                  ...it,
                  salePrice: editForm.salePrice,
                  stock: editForm.stock,
                  maxPerUser: editForm.maxPerUser,
                }
              : it,
          ),
        );
        setEditingItemId(null);
        setEditForm(null);
        invalidateFlashSaleCache();
        realtimeSyncBus.publish('FLASH_SALE_UPDATED', { slotId, itemId });
        void loadDetail(true);
      } else {
        showToast((res as any)?.message || 'Cập nhật thất bại', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi cập nhật sản phẩm', 'error');
    } finally {
      setSavingItemId(null);
    }
  };

  const handleConfirmCancelItem = async (itemId: string) => {
    try {
      setCancellingId(itemId);
      const res = await flashSaleApi.sellerCancelItem(itemId);
      if (res.success) {
        showToast('Đã gỡ ấn phẩm khỏi đợt Flash Sale', 'success');
        setItems((prev) => prev.filter((it) => it.id !== itemId));
        setConfirmCancelId(null);
        invalidateFlashSaleCache();
        realtimeSyncBus.publish('FLASH_SALE_UPDATED', { slotId, itemId });
        void loadDetail(true);
      } else {
        showToast((res as any)?.message || 'Không thể gỡ sách khỏi Flash Sale', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Có lỗi khi hủy đăng ký sách', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const handleDeleteSlot = () => {
    if (!slot) return;
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteSlot = async () => {
    if (!slot) return;
    try {
      setDeletingSlot(true);
      const res = await flashSaleApi.sellerDeleteSlot(slot.id);
      if (res.success) {
        showToast('Đã xóa đợt Flash Sale thành công', 'success');
        setIsDeleteModalOpen(false);
        invalidateFlashSaleCache();
        realtimeSyncBus.publish('FLASH_SALE_UPDATED', { slotId: slot.id });
        router.push('/seller/promotions/flash-sale');
      } else {
        showToast((res as any)?.message || 'Không thể xóa đợt Flash Sale', 'error');
      }
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi xóa đợt Flash Sale', 'error');
    } finally {
      setDeletingSlot(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <span className="material-symbols-outlined text-3xl animate-spin text-[#00875A] mb-2">
          progress_activity
        </span>
        <p className="text-xs font-medium">Đang tải thông tin chi tiết đợt Flash Sale...</p>
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-10 text-center max-w-lg mx-auto my-8 shadow-2xs space-y-3">
        <span className="material-symbols-outlined text-4xl text-slate-300">bolt</span>
        <h2 className="text-base font-bold text-slate-900">Không tìm thấy đợt Flash Sale</h2>
        <p className="text-xs text-slate-500">
          Khung giờ này có thể đã bị xóa hoặc bạn chưa đăng ký sản phẩm nào vào khung giờ này.
        </p>
        <div className="pt-2">
          <Link
            href="/seller/promotions/flash-sale"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-bold transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Quay lại danh sách Flash Sale</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200 pb-12">
      {/* 1. Breadcrumb & Back Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <button
          type="button"
          onClick={() => router.push('/seller/promotions/flash-sale')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[16px] text-slate-500">arrow_back</span>
          <span>Quay lại danh sách Flash Sale</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Link href="/seller/dashboard" className="hover:text-slate-900">Kênh Người Bán</Link>
          <span className="text-slate-300">/</span>
          <Link href="/seller/promotions/flash-sale" className="hover:text-slate-900">Flash Sale</Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono font-bold text-slate-900">#{slot.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      {/* 2. Campaign Header Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold font-editorial text-slate-900 tracking-tight">
              {slot.name}
            </h1>
            <SellerStatusBadge status={statusMeta.statusKey} label={statusMeta.label} />
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {isPlatformScope ? 'Flash Sale Sàn' : 'Flash Sale Shop'}
            </span>
          </div>
          <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-slate-400">schedule</span>
              <span>
                Khung giờ: <strong className="font-medium text-slate-700">{formatDateTime(slot.startsAt)}</strong> –{' '}
                <strong className="font-medium text-slate-700">{formatDateTime(slot.endsAt)}</strong>
              </span>
            </span>
            {slot.description && (
              <>
                <span className="text-slate-300">•</span>
                <span>{slot.description}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!statusMeta.isEnded && (
            <SellerActionButton
              variant="primary"
              label={isAddPanelOpen ? 'Đóng bảng thêm sách' : 'Thêm sách vào đợt'}
              icon={isAddPanelOpen ? 'close' : 'add'}
              onClick={() => (isAddPanelOpen ? setIsAddPanelOpen(false) : openAddPanel())}
            />
          )}
          {!isPlatformScope && (
            <SellerActionButton
              variant="danger"
              label="Xóa đợt"
              icon="delete"
              onClick={handleDeleteSlot}
              loading={deletingSlot}
            />
          )}
        </div>
      </div>

      {/* 3. Main 12-Col Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (8 Cols): Books List + Inline Add Drawer */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {isAddPanelOpen && !statusMeta.isEnded && (
            <section className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-sm text-slate-900 font-editorial">
                    Chọn sách bổ sung vào đợt Flash Sale
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isPlatformScope
                      ? `Mức giảm giá được sàn ấn định cố định -${slot.discountPercent ?? 30}%, tối đa ${slot.maxPerUser ?? 1} cuốn/khách.`
                      : 'Tùy chỉnh giá ưu đãi và quota mở bán cho từng cuốn sách.'}
                  </p>
                </div>
                <div className="relative min-w-[220px]">
                  <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                    search
                  </span>
                  <input
                    type="text"
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    placeholder="Tìm tên sách hoặc tác giả..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00875A]"
                  />
                </div>
              </div>

              {availableBooksToAdd.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200/60">
                  Toàn bộ sách khả dụng của gian hàng đã có trong đợt này hoặc không khớp từ khóa tìm kiếm.
                </div>
              ) : (
                <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-100 border border-slate-200/80 rounded-xl">
                  {availableBooksToAdd.map((b) => {
                    const cfg = addBookMap[b.id];
                    if (!cfg) return null;
                    const orig = resolveBookOriginalPriceByFormat(b, cfg.targetFormat);
                    return (
                      <div
                        key={b.id}
                        className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                          cfg.isSelected ? 'bg-emerald-50/40' : 'bg-white'
                        }`}
                      >
                        <label className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cfg.isSelected}
                            onChange={(e) =>
                              setAddBookMap((prev) => ({
                                ...prev,
                                [b.id]: { ...prev[b.id], isSelected: e.target.checked },
                              }))
                            }
                            className="w-4 h-4 rounded border-slate-300 text-[#00875A] focus:ring-[#00875A]"
                          />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{b.title}</p>
                            <p className="text-[11px] text-slate-500">
                              Giá gốc: <span className="font-mono">{orig.toLocaleString('vi-VN')} đ</span>
                            </p>
                          </div>
                        </label>

                        {b.format === 'BOTH' && (
                          <select
                            value={cfg.targetFormat}
                            onChange={(e) => {
                              const nextFmt = e.target.value as FlashSaleTargetFormat;
                              const nextOrig = resolveBookOriginalPriceByFormat(b, nextFmt);
                              const discPct = Number(slot?.discountPercent ?? 30);
                              setAddBookMap((prev) => ({
                                ...prev,
                                [b.id]: {
                                  ...prev[b.id],
                                  targetFormat: nextFmt,
                                  salePrice: Math.max(1000, Math.round(nextOrig * (1 - discPct / 100))),
                                },
                              }));
                            }}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-md outline-none shrink-0 border transition-colors ${getFlashSaleFormatStyle(cfg.targetFormat).selectClass}`}
                          >
                            <option value="BOTH">Combo (Giấy + Ebook)</option>
                            <option value="PHYSICAL">Chỉ Sách Giấy</option>
                            <option value="DIGITAL">Chỉ Ebook DRM</option>
                          </select>
                        )}

                        {cfg.isSelected && (
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <div>
                              <span className="text-[10px] text-slate-400 block">Giá sale (đ)</span>
                              <input
                                type="number"
                                disabled={isPlatformScope}
                                value={cfg.salePrice}
                                onChange={(e) =>
                                  setAddBookMap((prev) => ({
                                    ...prev,
                                    [b.id]: { ...prev[b.id], salePrice: Number(e.target.value) },
                                  }))
                                }
                                className="w-24 px-2 py-1 text-xs font-mono border border-slate-200 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Quota</span>
                              <input
                                type="number"
                                min={1}
                                value={cfg.stock}
                                onChange={(e) =>
                                  setAddBookMap((prev) => ({
                                    ...prev,
                                    [b.id]: { ...prev[b.id], stock: Number(e.target.value) },
                                  }))
                                }
                                className="w-16 px-2 py-1 text-xs font-mono border border-slate-200 rounded-lg bg-white"
                              />
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 block">Max/khách</span>
                              <input
                                type="number"
                                min={1}
                                disabled={isPlatformScope}
                                value={cfg.maxPerUser}
                                onChange={(e) =>
                                  setAddBookMap((prev) => ({
                                    ...prev,
                                    [b.id]: { ...prev[b.id], maxPerUser: Number(e.target.value) },
                                  }))
                                }
                                className="w-16 px-2 py-1 text-xs font-mono border border-slate-200 rounded-lg bg-white disabled:bg-slate-100"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <SellerActionButton
                  variant="secondary"
                  label="Hủy"
                  onClick={() => setIsAddPanelOpen(false)}
                />
                <SellerActionButton
                  variant="primary"
                  label={`Xác nhận thêm (${selectedAddBooks.length} sách)`}
                  icon="check"
                  loading={submittingAdd}
                  disabled={selectedAddBooks.length === 0}
                  onClick={handleSubmitAddBooks}
                />
              </div>
            </section>
          )}

          <section className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden">
            {(() => {
              const q = itemSearch.trim().toLowerCase();
              const filteredItems = q
                ? items.filter(
                    (it) =>
                      (it.book?.title || it.title || '').toLowerCase().includes(q) ||
                      getAuthorLabel(it.book?.author).toLowerCase().includes(q)
                  )
                : items;
              const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
              const safePage = Math.min(Math.max(1, currentPage), totalPages);
              const paginatedItems = filteredItems.slice(
                (safePage - 1) * PAGE_SIZE,
                safePage * PAGE_SIZE
              );

              return (
                <>
                  <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-editorial">
                      <span className="material-symbols-outlined text-[#00875A] text-[18px]">menu_book</span>
                      <span>Danh sách ấn phẩm trong đợt ({items.length})</span>
                    </h2>

                    {items.length > 0 && (
                      <div className="relative min-w-[220px]">
                        <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-3 top-1/2 -translate-y-1/2">
                          search
                        </span>
                        <input
                          type="text"
                          value={itemSearch}
                          onChange={(e) => {
                            setItemSearch(e.target.value);
                            setCurrentPage(1);
                          }}
                          placeholder="Tìm sách trong đợt..."
                          className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#00875A]"
                        />
                      </div>
                    )}
                  </div>

                  {filteredItems.length === 0 ? (
                    <div className="py-12 px-6 text-center text-slate-400 text-xs space-y-2">
                      <p>
                        {items.length === 0
                          ? 'Chưa có sản phẩm nào được đăng ký trong khung giờ này.'
                          : 'Không tìm thấy ấn phẩm khớp từ khóa tìm kiếm.'}
                      </p>
                      {items.length === 0 && !statusMeta.isEnded && (
                        <button
                          type="button"
                          onClick={openAddPanel}
                          className="text-[#00875A] font-bold hover:underline cursor-pointer"
                        >
                          + Thêm sách vào đợt ngay
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-500 uppercase text-[10.5px] font-bold tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4 min-w-[230px]">Sản phẩm</th>
                              <th className="py-3 px-3 min-w-[150px]">Giá Flash Sale</th>
                              <th className="py-3 px-3 min-w-[150px]">Tiến độ bán</th>
                              <th className="py-3 px-3 min-w-[90px] text-center">Giới hạn</th>
                              <th className="py-3 px-4 min-w-[140px] text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {paginatedItems.map((item) => {
                      const orig = Number(item.originalPrice || item.book?.price || 0);
                      const sale = Number(item.salePrice || 0);
                      const sold = Number(item.sold || 0);
                      const stock = Number(item.stock || 0);
                      const quota = sold + stock;
                      const pct = quota > 0 ? Math.min(100, Math.round((sold / quota) * 100)) : 0;
                      const discountPct = orig > 0 ? Math.max(1, Math.round(((orig - sale) / orig) * 100)) : 0;
                      const isEditing = editingItemId === item.id;
                      const isConfirmCancel = confirmCancelId === item.id;
                      const coverUrl = item.book?.coverImageUrl || item.book?.coverUrl || item.coverUrl || '/images/placeholder-book.jpg';

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={coverUrl}
                                alt={item.book?.title || 'Book'}
                                className="w-10 h-14 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-100"
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 line-clamp-2 leading-snug">
                                  {item.book?.title || item.title || 'Ấn phẩm HUKI'}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                                  {getAuthorLabel(item.book?.author) || 'Tác giả HUKI'}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-3">
                            {isEditing && editForm ? (
                              <div className="space-y-1">
                                <input
                                  type="number"
                                  disabled={isPlatformScope}
                                  value={editForm.salePrice}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, salePrice: Number(e.target.value) })
                                  }
                                  className="w-28 px-2 py-1 text-xs font-mono border border-slate-300 rounded-lg bg-white disabled:bg-slate-100"
                                />
                                <p className="text-[10.5px] text-slate-400">
                                  Gốc: {orig.toLocaleString('vi-VN')} đ
                                </p>
                              </div>
                            ) : (
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-bold text-[#00875A]">
                                    {sale.toLocaleString('vi-VN')} đ
                                  </span>
                                  {discountPct > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/70 text-[10px] font-bold">
                                      -{discountPct}%
                                    </span>
                                  )}
                                </div>
                                {orig > 0 && (
                                  <span className="text-[11px] text-slate-400 line-through font-mono">
                                    {orig.toLocaleString('vi-VN')} đ
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3">
                            {isEditing && editForm ? (
                              <div className="space-y-1">
                                <label className="text-[10.5px] text-slate-500 block">Quota còn:</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={editForm.stock}
                                  onChange={(e) =>
                                    setEditForm({ ...editForm, stock: Number(e.target.value) })
                                  }
                                  className="w-20 px-2 py-1 text-xs font-mono border border-slate-300 rounded-lg bg-white"
                                />
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-600">
                                    Đã bán <strong className="text-slate-900">{sold}</strong>/{quota}
                                  </span>
                                  <span className="font-mono font-semibold text-slate-500">{pct}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#00875A] rounded-full"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-3 text-center">
                            {isEditing && editForm ? (
                              <input
                                type="number"
                                min={1}
                                disabled={isPlatformScope}
                                value={editForm.maxPerUser}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, maxPerUser: Number(e.target.value) })
                                }
                                className="w-16 px-2 py-1 text-xs font-mono border border-slate-300 rounded-lg bg-white disabled:bg-slate-100 text-center"
                              />
                            ) : (
                              <span className="font-mono text-slate-700">
                                {item.maxPerUser || 1}/khách
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {statusMeta.isEnded ? (
                              <span className="text-[11px] text-slate-400">Đã khóa</span>
                            ) : isEditing ? (
                              <div className="inline-flex items-center gap-1.5">
                                <SellerActionButton
                                  variant="primary"
                                  label="Lưu"
                                  size="sm"
                                  loading={savingItemId === item.id}
                                  onClick={() => handleSaveEdit(item.id)}
                                />
                                <SellerActionButton
                                  variant="secondary"
                                  label="Hủy"
                                  size="sm"
                                  onClick={() => {
                                    setEditingItemId(null);
                                    setEditForm(null);
                                  }}
                                />
                              </div>
                            ) : isConfirmCancel ? (
                              <div className="inline-flex items-center gap-1">
                                <SellerActionButton
                                  variant="danger"
                                  label="Xác nhận gỡ"
                                  size="sm"
                                  loading={cancellingId === item.id}
                                  onClick={() => handleConfirmCancelItem(item.id)}
                                />
                                <SellerActionButton
                                  variant="secondary"
                                  label="Thôi"
                                  size="sm"
                                  onClick={() => setConfirmCancelId(null)}
                                />
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5">
                                <SellerActionButton
                                  variant="edit"
                                  label="Sửa"
                                  icon="edit"
                                  size="sm"
                                  onClick={() => handleStartEdit(item)}
                                />
                                <SellerActionButton
                                  variant="danger"
                                  icon="delete"
                                  title="Gỡ sách khỏi đợt"
                                  size="sm"
                                  onClick={() => setConfirmCancelId(item.id)}
                                />
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                          </tbody>
                        </table>
                      </div>

                      <StandardPaginationBar
                        currentPage={safePage}
                        totalPages={totalPages}
                        totalItems={filteredItems.length}
                        pageSize={PAGE_SIZE}
                        onPageChange={setCurrentPage}
                        itemLabel="ấn phẩm"
                      />
                    </>
                  )}
                </>
              );
            })()}
          </section>
        </div>

        {/* RIGHT COLUMN (4 Cols): Summary & Configuration Cards */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-[#00875A] text-[18px]">analytics</span>
              <span>Tổng Quan Hiệu Quả</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Số sách tham gia:</span>
                <strong className="font-mono text-slate-900">{items.length} ấn phẩm</strong>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Đã bán / Tổng quota:</span>
                <strong className="font-mono text-slate-900">
                  {metrics.totalSold} / {metrics.totalQuota} cuốn ({metrics.fillRate}%)
                </strong>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500">Tiết kiệm cho độc giả:</span>
                <strong className="font-mono text-rose-700">
                  {metrics.customerSavings.toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-bold text-slate-800">Doanh thu Flash Sale:</span>
                <strong className="font-mono text-base font-bold text-[#00875A]">
                  {metrics.revenue.toLocaleString('vi-VN')} đ
                </strong>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2 font-editorial">
              <span className="material-symbols-outlined text-slate-600 text-[18px]">tune</span>
              <span>Thông Tin Khung Giờ</span>
            </h2>

            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-[11px] text-slate-400">Loại chương trình</dt>
                <dd className="font-semibold text-slate-800 mt-0.5">
                  {isPlatformScope ? 'Chiến dịch toàn Sàn HUKI' : 'Khung giờ riêng của Gian hàng'}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Thời gian bắt đầu</dt>
                <dd className="font-medium text-slate-800 font-mono mt-0.5">
                  {formatDateTime(slot.startsAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Thời gian kết thúc</dt>
                <dd className="font-medium text-slate-800 font-mono mt-0.5">
                  {formatDateTime(slot.endsAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-slate-400">Quy tắc định giá &amp; giới hạn</dt>
                <dd className="text-slate-700 mt-0.5">
                  {isPlatformScope
                    ? `Trợ giá đồng mức -${slot.discountPercent ?? 30}% • Tối đa ${slot.maxPerUser ?? 1} cuốn/khách`
                    : 'Shop chủ động cấu hình giá và giới hạn mua theo từng sách'}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <CountdownConfirmModal
        isOpen={isDeleteModalOpen}
        title="Xác nhận xóa đợt Flash Sale"
        description={
          <>
            Bạn có chắc chắn muốn xóa đợt Flash Sale{' '}
            <strong className="text-slate-900">&ldquo;{slot.name}&rdquo;</strong>? Toàn bộ sách đã
            đăng ký trong đợt này sẽ bị hủy và trở về giá niêm yết ban đầu.
          </>
        }
        countdownSeconds={5}
        confirmLabel="Xác nhận xóa"
        loading={deletingSlot}
        onConfirm={handleConfirmDeleteSlot}
        onCancel={() => !deletingSlot && setIsDeleteModalOpen(false)}
      />
    </div>
  );
}
