'use client';

/**
 * HUKI EBOOK - Seller Vouchers View (Quản Lý Voucher Gian Hàng)
 * 100% In-Page Expansion (No Popup Modal)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { businessApi, type StoreData } from '@/ui/api/businessApi';
import {
  getSellerVouchers,
  createSellerVoucher,
  updateSellerVoucher,
  activateSellerVoucher,
  deactivateSellerVoucher,
  deleteSellerVoucher,
  getSellerVoucherUsage,
  formatVoucherType,
  formatDiscountValue,
  formatTargetAudience,
  formatFollowerRequirement,
  type Voucher,
  type VoucherType,
  type VoucherStatus,
  type VoucherTargetAudience,
  type VoucherUsageStats,
  type CreateVoucherPayload,
  type UpdateVoucherPayload,
} from '@/ui/api/sellerVoucherApi';
import {
  SellerTableContainer,
  SellerStatusBadge,
  SellerActionButton,
  SellerFilterTabs,
  SellerPagination,
} from '@/ui/components/seller/SellerUI';

export function SellerVouchersView() {
  const { user, activeBusinessId } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // In-Page Form State (CREATE / EDIT) - NO POPUP
  const [formMode, setFormMode] = useState<'NONE' | 'CREATE' | 'EDIT'>('NONE');
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);

  // Form Fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<VoucherType>('PERCENTAGE');
  const [targetAudience, setTargetAudience] = useState<VoucherTargetAudience>('ALL');
  const [minFollowDays, setMinFollowDays] = useState<number>(0);
  const [customDaysInput, setCustomDaysInput] = useState<string>('30');
  const [value, setValue] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('0');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('');
  const [formStoreId, setFormStoreId] = useState<string>('');
  const [totalUsage, setTotalUsage] = useState('100');
  const [maxUsagePerUser, setMaxUsagePerUser] = useState('1');
  const [startsAt, setStartsAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // In-Page Usage Stats State (NO POPUP)
  const [statsVoucherId, setStatsVoucherId] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<VoucherUsageStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Action Loading states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedVoucherIds, setExpandedVoucherIds] = useState<Set<string>>(new Set());

  const toggleExpandVoucher = (id: string) => {
    setExpandedVoucherIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toLocalDatetimeString = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const mi = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const formatVND = (num?: number | string | null) => {
    const val = Number(num) || 0;
    return val.toLocaleString('vi-VN') + 'đ';
  };

  // Load vouchers & stores from API
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const bizId = user?.business?.id || activeBusinessId;
      if (bizId) {
        try {
          const storesRes = await businessApi.getMyStores(bizId);
          if (storesRes.success && Array.isArray(storesRes.data)) {
            setStores(storesRes.data);
          }
        } catch {
          // ignore
        }
      }

      const res = await getSellerVouchers({
        limit: 100,
        storeId: selectedStoreId || undefined,
      });
      if (res.success && res.data) {
        let items: Voucher[] = [];
        if (Array.isArray(res.data)) {
          items = res.data;
        } else if (Array.isArray((res.data as any).items)) {
          items = (res.data as any).items;
        } else if (Array.isArray((res.data as any).data)) {
          items = (res.data as any).data;
        }
        setVouchers(items);
      } else {
        setVouchers([]);
      }
    } catch (err: any) {
      console.warn('Failed to load seller vouchers:', err);
      showToast({ title: 'Lỗi', message: 'Không thể tải danh sách voucher.' }, 'error');
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  }, [user, activeBusinessId, selectedStoreId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Form
  const handleOpenCreate = () => {
    setFormMode('CREATE');
    setEditingVoucher(null);
    setStatsVoucherId(null);
    setUsageStats(null);

    // Default form values
    setCode('');
    setName('');
    setDescription('');
    setType('PERCENTAGE');
    setTargetAudience('ALL');
    setMinFollowDays(0);
    setCustomDaysInput('30');
    setValue('10');
    setMinOrderAmount('100000');
    setMaxDiscountAmount('30000');
    setFormStoreId(stores[0]?.id || selectedStoreId || '');
    setTotalUsage('50');
    setMaxUsagePerUser('1');

    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setStartsAt(toLocalDatetimeString(now));
    setExpiresAt(toLocalDatetimeString(nextMonth));
  };

  // Open Edit Form
  const handleOpenEdit = (voucher: Voucher) => {
    setFormMode('EDIT');
    setEditingVoucher(voucher);
    setStatsVoucherId(null);
    setUsageStats(null);

    setCode(voucher.code);
    setName(voucher.name);
    setDescription(voucher.description || '');
    setType(voucher.type);
    setTargetAudience(voucher.targetAudience || 'ALL');
    const initialMinDays = voucher.minFollowDays || 0;
    setMinFollowDays(initialMinDays);
    setCustomDaysInput(initialMinDays > 0 ? initialMinDays.toString() : '30');
    setValue(voucher.value.toString());
    setMinOrderAmount((voucher.minOrderAmount || 0).toString());
    setMaxDiscountAmount(voucher.maxDiscountAmount ? voucher.maxDiscountAmount.toString() : '');
    setFormStoreId(voucher.storeId || stores[0]?.id || selectedStoreId || '');
    setTotalUsage((voucher.totalUsage || 0).toString());
    setMaxUsagePerUser((voucher.maxUsagePerUser || 1).toString());
    setStartsAt(toLocalDatetimeString(new Date(voucher.startsAt)));
    setExpiresAt(toLocalDatetimeString(new Date(voucher.expiresAt)));
  };

  // Close Form
  const handleCloseForm = () => {
    setFormMode('NONE');
    setEditingVoucher(null);
  };

  // Open Stats
  const handleOpenStats = async (voucher: Voucher) => {
    if (statsVoucherId === voucher.id) {
      setStatsVoucherId(null);
      setUsageStats(null);
      return;
    }
    setFormMode('NONE');
    setStatsVoucherId(voucher.id);
    setLoadingStats(true);
    try {
      const res = await getSellerVoucherUsage(voucher.id);
      if (res.success && res.data) {
        setUsageStats(res.data);
      } else {
        showToast({ title: 'Thông báo', message: 'Chưa có dữ liệu thống kê sử dụng.' }, 'info');
      }
    } catch {
      showToast({ title: 'Lỗi', message: 'Không thể tải thống kê sử dụng voucher.' }, 'error');
    } finally {
      setLoadingStats(false);
    }
  };

  // Toggle Active / Deactive
  const handleToggleStatus = async (voucher: Voucher) => {
    setActionLoadingId(voucher.id);
    try {
      if (voucher.status === 'ACTIVE') {
        const res = await deactivateSellerVoucher(voucher.id);
        if (res.success) {
          showToast({ title: 'Thành công', message: `Đã tạm tắt voucher ${voucher.code}` }, 'success');
          setVouchers((prev) => prev.map((v) => v.id === voucher.id ? { ...v, status: 'INACTIVE' } : v));
          await loadData();
        } else {
          showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể tạm tắt voucher' }, 'error');
        }
      } else {
        const res = await activateSellerVoucher(voucher.id);
        if (res.success) {
          showToast({ title: 'Thành công', message: `Đã kích hoạt voucher ${voucher.code}` }, 'success');
          setVouchers((prev) => prev.map((v) => v.id === voucher.id ? { ...v, status: 'ACTIVE' } : v));
          await loadData();
        } else {
          showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể kích hoạt voucher' }, 'error');
        }
      }
    } catch {
      showToast({ title: 'Lỗi kết nối', message: 'Không thể kết nối máy chủ.' }, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete Voucher
  const handleDeleteVoucher = async (voucher: Voucher) => {
    if (voucher.currentUsage > 0) {
      showToast({ title: 'Không thể xóa', message: 'Voucher đã có lượt sử dụng thực tế. Bạn chỉ có thể Tạm Tắt voucher.' }, 'warning');
      return;
    }
    if (!window.confirm(`Bạn có chắc muốn xóa mã voucher "${voucher.code}" không?`)) {
      return;
    }

    setActionLoadingId(voucher.id);
    try {
      const res = await deleteSellerVoucher(voucher.id);
      if (res.success) {
        showToast({ title: 'Thành công', message: `Đã xóa voucher ${voucher.code}` }, 'success');
        setVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
        if (editingVoucher?.id === voucher.id) setFormMode('NONE');
        if (statsVoucherId === voucher.id) setStatsVoucherId(null);
        await loadData();
      } else {
        showToast({ title: 'Lỗi', message: res.error?.message || 'Không thể xóa voucher' }, 'error');
      }
    } catch {
      showToast({ title: 'Lỗi kết nối', message: 'Lỗi kết nối khi xóa voucher.' }, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Submit Form (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      showToast({ title: 'Thiếu thông tin', message: 'Vui lòng nhập mã voucher.' }, 'warning');
      return;
    }
    const numValue = Number(value) || 0;
    if (type !== 'FREE_SHIPPING' && numValue <= 0) {
      showToast({ title: 'Lỗi giá trị', message: 'Mức giảm giá phải lớn hơn 0.' }, 'warning');
      return;
    }
    if (type === 'PERCENTAGE' && (numValue < 1 || numValue > 90)) {
      showToast({ title: 'Lỗi giá trị', message: 'Mức giảm % phải từ 1% đến 90%.' }, 'warning');
      return;
    }
    if (!startsAt || !expiresAt) {
      showToast({ title: 'Thiếu thời gian', message: 'Vui lòng chọn ngày bắt đầu và kết thúc.' }, 'warning');
      return;
    }
    if (new Date(expiresAt) <= new Date(startsAt)) {
      showToast({ title: 'Lỗi thời gian', message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' }, 'warning');
      return;
    }

    const storeIdToUse = formStoreId || selectedStoreId || stores[0]?.id;

    setSubmitting(true);
    try {
      if (formMode === 'CREATE') {
        const payload: CreateVoucherPayload = {
          code: cleanCode,
          name: name.trim() || cleanCode,
          description: description.trim() || undefined,
          type,
          value: numValue,
          minOrderAmount: Number(minOrderAmount) || 0,
          maxDiscountAmount: type === 'PERCENTAGE' && maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
          scope: 'STORE',
          storeId: storeIdToUse || undefined,
          targetAudience,
          minFollowDays: targetAudience === 'FOLLOWERS_ONLY' ? Number(minFollowDays) : 0,
          totalUsage: Number(totalUsage) || 0,
          maxUsagePerUser: Number(maxUsagePerUser) || 1,
          startsAt: new Date(startsAt).toISOString(),
          expiresAt: new Date(expiresAt).toISOString(),
        };

        const res = await createSellerVoucher(payload);
        if (res.success) {
          showToast({ title: 'Thành công', message: `Đã tạo mới mã voucher ${cleanCode} thành công!` }, 'success');
          setFormMode('NONE');
          const createdVoucher = res.data as Voucher | undefined;
          if (createdVoucher && createdVoucher.id) {
            setVouchers((prev) => [createdVoucher, ...prev.filter((v) => v.id !== createdVoucher.id)]);
          }
          await loadData();
        } else {
          showToast({ title: 'Lỗi tạo voucher', message: res.error?.message || 'Không thể tạo voucher' }, 'error');
        }
      } else if (formMode === 'EDIT' && editingVoucher) {
        const payload: UpdateVoucherPayload = {
          name: name.trim() || editingVoucher.name,
          description: description.trim() || undefined,
          type,
          value: numValue,
          minOrderAmount: Number(minOrderAmount) || 0,
          maxDiscountAmount: type === 'PERCENTAGE' && maxDiscountAmount ? Number(maxDiscountAmount) : undefined,
          scope: 'STORE',
          storeId: storeIdToUse || undefined,
          targetAudience,
          minFollowDays: targetAudience === 'FOLLOWERS_ONLY' ? Number(minFollowDays) : 0,
          totalUsage: Number(totalUsage) || 0,
          maxUsagePerUser: Number(maxUsagePerUser) || 1,
          startsAt: new Date(startsAt).toISOString(),
          expiresAt: new Date(expiresAt).toISOString(),
        };

        const res = await updateSellerVoucher(editingVoucher.id, payload);
        if (res.success) {
          showToast({ title: 'Thành công', message: `Đã cập nhật voucher ${editingVoucher.code} thành công!` }, 'success');
          setFormMode('NONE');
          const updatedVoucher = res.data as Voucher | undefined;
          if (updatedVoucher && updatedVoucher.id) {
            setVouchers((prev) => prev.map((v) => v.id === editingVoucher.id ? updatedVoucher : v));
          }
          await loadData();
        } else {
          showToast({ title: 'Lỗi cập nhật', message: res.error?.message || 'Không thể cập nhật voucher' }, 'error');
        }
      }
    } catch {
      showToast({ title: 'Lỗi kết nối', message: 'Lỗi kết nối máy chủ khi lưu voucher.' }, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Counts for tabs
  const counts = useMemo(() => {
    const total = vouchers.length;
    const now = new Date();
    let active = 0;
    let upcoming = 0;
    let inactive = 0;
    let expired = 0;
    let usedUp = 0;

    vouchers.forEach((v) => {
      const isExpired = new Date(v.expiresAt) < now;
      const isUpcoming = new Date(v.startsAt) > now;
      const isUsedUp = v.totalUsage > 0 && v.currentUsage >= v.totalUsage;
      if (isExpired || v.status === 'EXPIRED') expired++;
      else if (isUsedUp || v.status === 'USED_UP') usedUp++;
      else if (v.status === 'INACTIVE') inactive++;
      else if (isUpcoming && v.status === 'ACTIVE') upcoming++;
      else if (v.status === 'ACTIVE') active++;
    });

    return { total, active, upcoming, inactive, expired, usedUp };
  }, [vouchers]);

  // Filtered Vouchers
  const filteredVouchers = useMemo(() => {
    const now = new Date();
    return vouchers.filter((v) => {
      const isExpired = new Date(v.expiresAt) < now || v.status === 'EXPIRED';
      const isUpcoming = new Date(v.startsAt) > now;
      const isUsedUp = (v.totalUsage > 0 && v.currentUsage >= v.totalUsage) || v.status === 'USED_UP';

      // Tab filter
      if (activeTab === 'ACTIVE') {
        if (v.status !== 'ACTIVE' || isUpcoming || isExpired || isUsedUp) return false;
      } else if (activeTab === 'UPCOMING') {
        if (v.status !== 'ACTIVE' || !isUpcoming || isExpired) return false;
      } else if (activeTab === 'INACTIVE') {
        if (v.status !== 'INACTIVE' || isExpired) return false;
      } else if (activeTab === 'EXPIRED') {
        if (!isExpired) return false;
      } else if (activeTab === 'USED_UP') {
        if (!isUsedUp) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const codeMatch = v.code.toLowerCase().includes(q);
        const nameMatch = v.name?.toLowerCase().includes(q);
        if (!codeMatch && !nameMatch) return false;
      }

      return true;
    });
  }, [vouchers, activeTab, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const totalItems = filteredVouchers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);

  const paginatedVouchers = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredVouchers.slice(start, start + pageSize);
  }, [filteredVouchers, validPage, pageSize]);

  return (
    <div className="flex flex-col gap-6 w-full max-w-[1600px] mx-auto animate-in fade-in duration-200 font-sans">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-editorial text-slate-900 tracking-tight flex items-center gap-2.5">
            <span className="w-2.5 h-6 bg-[#00875A] rounded-full inline-block"></span>
            <span>Voucher Giảm Giá Gian Hàng</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tạo và quản lý các mã giảm giá riêng của shop (giảm %, giảm tiền mặt, freeship) để kích cầu người mua.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <span className={`material-symbols-outlined text-[16px] text-slate-500 ${loading ? 'animate-spin text-[#00875A]' : ''}`}>
              refresh
            </span>
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white font-semibold text-xs transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[17px]">add_circle</span>
            <span>Tạo Voucher Mới</span>
          </button>
        </div>
      </div>

      {/* 2. In-Page Collapsible Form (CREATE / EDIT) */}
      {formMode !== 'NONE' && (
        <div className="bg-white rounded-2xl p-5 border-2 border-emerald-500/40 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#00875A] flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">
                  {formMode === 'CREATE' ? 'confirmation_number' : 'edit_square'}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {formMode === 'CREATE' ? 'Thiết Lập Voucher Gian Hàng Mới' : `Chỉnh Sửa Voucher #${editingVoucher?.code}`}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {formMode === 'CREATE'
                    ? 'Nhập các thông số mã giảm giá để áp dụng cho khách mua hàng của Shop'
                    : 'Cập nhật lại hạn mức hoặc thời gian hiệu lực của mã'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseForm}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Đóng form"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmitForm} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã Voucher <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={formMode === 'EDIT'}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="VD: HUKIBOOK20, VIP50K..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:border-[#00875A] focus:bg-white disabled:bg-slate-100 disabled:text-slate-500"
                />
                <span className="text-[10.5px] text-slate-400 mt-1 block">Chỉ gồm chữ in hoa và chữ số (không dấu).</span>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Chương Trình <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Tri ân độc giả tháng 9..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>

              {/* Store selection if seller has multiple stores */}
              {stores.length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Áp Dụng Cho Gian Hàng <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formStoreId}
                    onChange={(e) => setFormStoreId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                  >
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loại Ưu Đãi <span className="text-rose-500">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as VoucherType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                >
                  <option value="PERCENTAGE">Giảm theo % (PERCENTAGE)</option>
                  <option value="FIXED_AMOUNT">Giảm số tiền cố định (FIXED AMOUNT)</option>
                  <option value="FREE_SHIPPING">Miễn phí vận chuyển (FREE SHIPPING)</option>
                </select>
              </div>

              {/* Value */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {type === 'PERCENTAGE'
                    ? 'Mức Giảm (%) *'
                    : type === 'FIXED_AMOUNT'
                    ? 'Số Tiền Giảm (VNĐ) *'
                    : 'Mức Hỗ Trợ Ship (VNĐ)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={type === 'PERCENTAGE' ? 90 : 10000000}
                  required={type !== 'FREE_SHIPPING'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === 'PERCENTAGE' ? 'VD: 15 (15%)' : 'VD: 20000'}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>

              {/* Max Discount Amount (Only for percentage) */}
              {type === 'PERCENTAGE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mức Giảm Tối Đa (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={maxDiscountAmount}
                    onChange={(e) => setMaxDiscountAmount(e.target.value)}
                    placeholder="VD: 50000 (Không giới hạn để trống)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                  />
                  <span className="text-[10.5px] text-slate-400 mt-1 block">Chặn trần để tránh thâm hụt với đơn giá trị cao.</span>
                </div>
              )}

              {/* Min Order Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giá Trị Đơn Tối Thiểu (VNĐ)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={minOrderAmount}
                  onChange={(e) => setMinOrderAmount(e.target.value)}
                  placeholder="VD: 150000 (0đ là áp dụng mọi đơn)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>

              {/* Total Usage */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tổng Lượt Sử Dụng
                </label>
                <input
                  type="number"
                  min="0"
                  value={totalUsage}
                  onChange={(e) => setTotalUsage(e.target.value)}
                  placeholder="VD: 100 (0 là không giới hạn)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>

              {/* Max Per User */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lượt Dùng / Khách Hàng
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={maxUsagePerUser}
                  onChange={(e) => setMaxUsagePerUser(e.target.value)}
                  placeholder="Mặc định: 1"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>

              {/* StartsAt */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thời Gian Bắt Đầu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>

              {/* ExpiresAt */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Thời Gian Kết Thúc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  required
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white"
                />
              </div>
            </div>

            {/* Target Audience Segment Selector */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[17px] text-[#00875A]">group</span>
                  <span>Đối Tượng Khách Hàng Áp Dụng</span>
                  <span className="text-rose-500">*</span>
                </label>
                <Link
                  href="/seller/followers"
                  target="_blank"
                  className="text-[11px] text-[#00875A] hover:underline font-medium inline-flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[13px]">favorite</span>
                  <span>Xem danh sách Người theo dõi ({stores[0]?.name || 'Shop'})</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. ALL */}
                <div
                  onClick={() => setTargetAudience('ALL')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    targetAudience === 'ALL'
                      ? 'border-[#00875A] bg-emerald-50/40 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${targetAudience === 'ALL' ? 'bg-[#00875A] text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <span className="material-symbols-outlined text-[16px]">public</span>
                      </div>
                      <span className="font-bold text-xs text-slate-900">Tất Cả Khách Hàng</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${targetAudience === 'ALL' ? 'border-[#00875A] bg-[#00875A]' : 'border-slate-300'}`}>
                      {targetAudience === 'ALL' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Công khai cho mọi độc giả mua sách của gian hàng.
                  </p>
                </div>

                {/* 2. FOLLOWERS ONLY */}
                <div
                  onClick={() => setTargetAudience('FOLLOWERS_ONLY')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    targetAudience === 'FOLLOWERS_ONLY'
                      ? 'border-pink-500 bg-pink-50/40 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${targetAudience === 'FOLLOWERS_ONLY' ? 'bg-pink-600 text-white' : 'bg-pink-50 text-pink-600'}`}>
                        <span className="material-symbols-outlined text-[16px]">favorite</span>
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900">Người Theo Dõi Shop</span>
                        <span className="ml-1.5 text-[9.5px] px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-700 font-bold uppercase">Độc quyền</span>
                      </div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${targetAudience === 'FOLLOWERS_ONLY' ? 'border-pink-600 bg-pink-600' : 'border-slate-300'}`}>
                      {targetAudience === 'FOLLOWERS_ONLY' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Chỉ khách đã nhấn <strong>Theo dõi (Follow)</strong> mới có thể lưu &amp; áp mã giảm giá này.
                  </p>
                </div>

                {/* 3. NEW CUSTOMERS ONLY */}
                <div
                  onClick={() => setTargetAudience('NEW_CUSTOMERS_ONLY')}
                  className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                    targetAudience === 'NEW_CUSTOMERS_ONLY'
                      ? 'border-amber-500 bg-amber-50/40 shadow-2xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${targetAudience === 'NEW_CUSTOMERS_ONLY' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600'}`}>
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                      </div>
                      <span className="font-bold text-xs text-slate-900">Khách Hàng Mới</span>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${targetAudience === 'NEW_CUSTOMERS_ONLY' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'}`}>
                      {targetAudience === 'NEW_CUSTOMERS_ONLY' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Chỉ áp dụng cho đơn hàng đầu tiên của khách mua tại gian hàng.
                  </p>
                </div>
              </div>

              {/* Sub-panel: Loyalty Milestone / Follower Tenure Badges */}
              {targetAudience === 'FOLLOWERS_ONLY' && (
                <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-pink-50/80 via-purple-50/40 to-cyan-50/60 border border-pink-200/80 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-pink-600 text-lg">workspace_premium</span>
                      <span className="font-bold text-xs text-slate-900">Huy Hiệu Gắn Bó &amp; Thời Gian Theo Dõi Tối Thiểu:</span>
                    </div>
                    <span className="text-[11px] text-slate-500 italic">
                      Áp dụng cho khách đạt mốc số ngày theo dõi
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5">
                    {/* Option 1: All Followers (0 days) */}
                    <button
                      type="button"
                      onClick={() => setMinFollowDays(0)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        minFollowDays === 0
                          ? 'bg-white border-pink-500 shadow-2xs ring-1 ring-pink-500'
                          : 'bg-white/70 border-slate-200 hover:border-pink-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                          <span>🌟</span>
                          <span>Mọi Follower</span>
                        </span>
                        {minFollowDays === 0 && <span className="w-2 h-2 rounded-full bg-pink-500"></span>}
                      </div>
                      <span className="text-[10.5px] text-slate-500">Bất kỳ thời điểm nào</span>
                    </button>

                    {/* Option 2: Silver Fan (>= 30 days) */}
                    <button
                      type="button"
                      onClick={() => setMinFollowDays(30)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        minFollowDays === 30
                          ? 'bg-white border-slate-600 shadow-2xs ring-1 ring-slate-600'
                          : 'bg-white/70 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <span>🥈</span>
                          <span>Fan Bạc (30N+)</span>
                        </span>
                        {minFollowDays === 30 && <span className="w-2 h-2 rounded-full bg-slate-600"></span>}
                      </div>
                      <span className="text-[10.5px] text-slate-500">Gắn bó từ 1 tháng trở lên</span>
                    </button>

                    {/* Option 3: Gold Fan (>= 90 days) */}
                    <button
                      type="button"
                      onClick={() => setMinFollowDays(90)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        minFollowDays === 90
                          ? 'bg-white border-amber-500 shadow-2xs ring-1 ring-amber-500'
                          : 'bg-white/70 border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                          <span>🥇</span>
                          <span>Fan Vàng (90N+)</span>
                        </span>
                        {minFollowDays === 90 && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                      </div>
                      <span className="text-[10.5px] text-slate-500">Thân thiết từ 3 tháng trở lên</span>
                    </button>

                    {/* Option 4: Diamond Fan (>= 365 days / 1 year) */}
                    <button
                      type="button"
                      onClick={() => setMinFollowDays(365)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        minFollowDays === 365
                          ? 'bg-white border-cyan-600 shadow-2xs ring-1 ring-cyan-600'
                          : 'bg-white/70 border-slate-200 hover:border-cyan-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-cyan-900 flex items-center gap-1">
                          <span>💎</span>
                          <span>Kim Cương (1 Năm+)</span>
                        </span>
                        {minFollowDays === 365 && <span className="w-2 h-2 rounded-full bg-cyan-600"></span>}
                      </div>
                      <span className="text-[10.5px] text-cyan-700 font-medium">Tri ân fan cứng 1 năm</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Live Preview Ticket */}
            <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-2xl text-[#00875A]">sell</span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-sm text-[#00875A]">{code || 'MA_VOUCHER'}</span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      {formatVoucherType(type)}
                    </span>
                    {targetAudience === 'FOLLOWERS_ONLY' && (
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">favorite</span>
                        <span>{formatFollowerRequirement(minFollowDays).badge}</span>
                      </span>
                    )}
                    {targetAudience === 'NEW_CUSTOMERS_ONLY' && (
                      <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">person_add</span>
                        <span>Khách hàng mới</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {type === 'PERCENTAGE'
                      ? `Giảm ${value || 0}% (Tối đa ${maxDiscountAmount ? formatVND(maxDiscountAmount) : 'không giới hạn'}) cho đơn từ ${formatVND(minOrderAmount)}`
                      : type === 'FIXED_AMOUNT'
                      ? `Giảm ${formatVND(value)} cho đơn từ ${formatVND(minOrderAmount)}`
                      : `Miễn phí vận chuyển cho đơn từ ${formatVND(minOrderAmount)}`}
                  </p>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 self-end sm:self-center">
                Số lượng: <strong className="text-slate-800">{totalUsage || '∞'}</strong> lượt
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <SellerActionButton
                variant="neutral"
                label="Hủy bỏ"
                onClick={handleCloseForm}
              />
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 bg-[#00875A] hover:bg-[#00704A] text-white rounded-xl text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-[0.96]"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {submitting ? 'sync' : 'check_circle'}
                </span>
                <span>{submitting ? 'Đang lưu...' : formMode === 'CREATE' ? 'Tạo Voucher' : 'Lưu Thay Đổi'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. In-Page Usage Stats Box */}
      {statsVoucherId && usageStats && (
        <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-3 duration-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <span className="material-symbols-outlined text-[20px]">analytics</span>
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Thống Kê Hiệu Quả Voucher #{usageStats.voucher.code}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Theo dõi số lượng đơn hàng và tổng giá trị giảm giá đã kích cầu
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStatsVoucherId(null)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Đóng thống kê"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[10.5px] uppercase font-bold text-slate-400">Đã Sử Dụng</span>
              <div className="text-xl font-bold font-mono text-slate-800 mt-1">
                {usageStats.voucher.currentUsage} <span className="text-xs font-normal text-slate-400">/ {usageStats.voucher.totalUsage || '∞'}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[10.5px] uppercase font-bold text-slate-400">Lượt Còn Lại</span>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {usageStats.voucher.totalUsage > 0 ? usageStats.voucher.remainingUsage : 'Không giới hạn'}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <span className="text-[10.5px] uppercase font-bold text-slate-400">Tổng Tiền Đã Giảm</span>
              <div className="text-xl font-bold font-mono text-[#00875A] mt-1">
                {formatVND(usageStats.statistics.totalDiscount)}
              </div>
            </div>
          </div>

          {/* Recent 10 Usages */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2">Đơn Hàng Gần Đây Đã Áp Dụng Mã:</h4>
            {usageStats.recentUsages.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">Chưa có đơn hàng nào áp dụng mã này.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3">Mã Đơn</th>
                      <th className="py-2 px-3">Khách Hàng</th>
                      <th className="py-2 px-3 text-right">Tổng Tiền Đơn</th>
                      <th className="py-2 px-3 text-right">Số Tiền Giảm</th>
                      <th className="py-2 px-3 text-center">Thời Gian</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usageStats.recentUsages.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-800">#{u.order?.code || u.order?.id}</td>
                        <td className="py-2 px-3 text-slate-600">{u.user?.email || 'Khách hàng'}</td>
                        <td className="py-2 px-3 text-right font-mono">{formatVND(u.order?.grandTotal)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-600">-{formatVND(u.discount)}</td>
                        <td className="py-2 px-3 text-center text-slate-400 text-[11px]">{new Date(u.createdAt).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Filter Tabs & Search */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <SellerFilterTabs
          tabs={[
            { id: 'ALL', label: 'Tất Cả', count: counts.total },
            { id: 'ACTIVE', label: 'Đang Hoạt Động', count: counts.active },
            { id: 'UPCOMING', label: 'Sắp Diễn Ra', count: counts.upcoming },
            { id: 'INACTIVE', label: 'Tạm Tắt', count: counts.inactive },
            { id: 'EXPIRED', label: 'Hết Hạn', count: counts.expired },
            { id: 'USED_UP', label: 'Hết Lượt Dùng', count: counts.usedUp },
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto shrink-0">
          {stores.length > 1 && (
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="px-3 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all cursor-pointer"
            >
              <option value="">Tất cả gian hàng của tôi ({stores.length})</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full md:w-72 shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã hoặc tên voucher..."
              className="w-full pl-9 pr-7 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Vouchers Table */}
      <SellerTableContainer>
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="w-9 h-9 border-3 border-[#00875A] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="font-medium text-xs mt-2.5">Đang tải danh sách voucher...</p>
          </div>
        ) : filteredVouchers.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-3xl text-slate-300">
                confirmation_number
              </span>
              <p className="font-semibold text-slate-700">Chưa có voucher nào</p>
              <p className="text-[11.5px] text-slate-400">
                {vouchers.length === 0
                  ? 'Gian hàng chưa tạo mã giảm giá nào. Hãy bấm "Tạo Voucher Mới" để bắt đầu!'
                  : 'Không tìm thấy voucher nào phù hợp với bộ lọc.'}
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-500 font-semibold uppercase tracking-wider text-[10.5px] border-b border-slate-200">
                <th className="py-3 px-2 w-10 text-center"></th>
                <th className="py-3 px-2 w-12 text-center">STT</th>
                <th className="py-3 px-3.5">Mã &amp; Chiến Dịch</th>
                <th className="py-3 px-3.5">Mức Giảm &amp; Điều Kiện</th>
                <th className="py-3 px-3.5">Phân Khúc &amp; Hạn Dùng</th>
                <th className="py-3 px-3.5">Tiến Độ Lượt Dùng</th>
                <th className="py-3 px-3.5 text-right">Trạng Thái &amp; Thao Tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {paginatedVouchers.map((voucher, idx) => {
                const now = new Date();
                const isExpired = new Date(voucher.expiresAt) < now;
                const isUpcoming = new Date(voucher.startsAt) > now;
                const isUsedUp = voucher.totalUsage > 0 && voucher.currentUsage >= voucher.totalUsage;
                const isActionLoading = actionLoadingId === voucher.id;

                let statusBadgeVariant: any = 'success';
                let statusLabel = 'Đang Bán';

                if (isExpired || voucher.status === 'EXPIRED') {
                  statusBadgeVariant = 'danger';
                  statusLabel = 'Hết Hạn';
                } else if (isUsedUp || voucher.status === 'USED_UP') {
                  statusBadgeVariant = 'warning';
                  statusLabel = 'Hết Lượt';
                } else if (voucher.status === 'INACTIVE') {
                  statusBadgeVariant = 'neutral';
                  statusLabel = 'Tạm Tắt';
                } else if (isUpcoming) {
                  statusBadgeVariant = 'info';
                  statusLabel = 'Sắp Diễn Ra';
                } else {
                  statusBadgeVariant = 'success';
                  statusLabel = 'Đang Diễn Ra';
                }

                const isExpanded = expandedVoucherIds.has(voucher.id);
                const usagePercent = voucher.totalUsage > 0 ? Math.min(100, Math.round(((voucher.currentUsage || 0) / voucher.totalUsage) * 100)) : 0;

                return (
                  <React.Fragment key={voucher.id}>
                    <tr className={`transition-colors group ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-emerald-50/40`}>
                      {/* Expand Arrow */}
                      <td className="py-3 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpandVoucher(voucher.id)}
                          className="w-7 h-7 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-700 flex items-center justify-center transition-colors cursor-pointer"
                          aria-label={isExpanded ? 'Thu gọn chi tiết' : 'Mở rộng chi tiết'}
                        >
                          <span className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${isExpanded ? 'rotate-90 text-emerald-600 font-bold' : ''}`}>
                            chevron_right
                          </span>
                        </button>
                      </td>

                      {/* STT */}
                      <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-400">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>

                      {/* Mã & Chiến Dịch */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono font-extrabold text-[#00875A] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-xs w-fit">
                            {voucher.code}
                          </span>
                          <span className="font-bold text-slate-900 text-xs truncate max-w-[220px]" title={voucher.name}>
                            {voucher.name}
                          </span>
                        </div>
                      </td>

                      {/* Mức Giảm & Điều Kiện */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-[#00875A] text-xs">
                            {formatDiscountValue(voucher.type, voucher.value)}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Đơn từ {formatVND(voucher.minOrderAmount)}
                          </span>
                        </div>
                      </td>

                      {/* Phân Khúc & Hạn Dùng */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-col gap-1">
                          {voucher.targetAudience === 'FOLLOWERS_ONLY' ? (
                            <Link
                              href="/seller/followers"
                              className="inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded-full bg-pink-50 text-pink-700 font-bold border border-pink-200 hover:bg-pink-100 transition-colors w-fit"
                              title={`Voucher độc quyền cho ${formatFollowerRequirement(voucher.minFollowDays).label}`}
                            >
                              <span className="material-symbols-outlined text-[12px] text-pink-600">
                                {voucher.minFollowDays && voucher.minFollowDays >= 365
                                  ? 'diamond'
                                  : voucher.minFollowDays && voucher.minFollowDays >= 90
                                  ? 'workspace_premium'
                                  : voucher.minFollowDays && voucher.minFollowDays >= 30
                                  ? 'military_tech'
                                  : 'favorite'}
                              </span>
                              <span>{formatFollowerRequirement(voucher.minFollowDays).badge}</span>
                            </Link>
                          ) : voucher.targetAudience === 'NEW_CUSTOMERS_ONLY' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.2 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 w-fit">
                              <span className="material-symbols-outlined text-[12px] text-amber-600">person_add</span>
                              <span>Khách mới</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-normal border border-slate-200/60 w-fit">
                              <span className="material-symbols-outlined text-[11px] text-slate-400">public</span>
                              <span>Tất cả độc giả</span>
                            </span>
                          )}
                          <span className="text-slate-400 font-mono text-[10.5px]">
                            {isExpired ? (
                              <span className="text-rose-600 font-bold">Hết hạn: {new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}</span>
                            ) : (
                              <span>Hạn: {new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}</span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Tiến Độ Lượt Dùng */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-col gap-1 max-w-[130px]">
                          <span className="font-mono text-[11px] font-bold text-slate-800">
                            {voucher.currentUsage} / {voucher.totalUsage || '∞'}
                          </span>
                          {voucher.totalUsage > 0 && (
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${isUsedUp ? 'bg-amber-500' : 'bg-[#00875A]'}`}
                                style={{ width: `${usagePercent}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Trạng Thái & Thao Tác */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <SellerStatusBadge variant={statusBadgeVariant} label={statusLabel} />
                          <div className="flex items-center gap-1">
                            {!isExpired && (
                              <SellerActionButton
                                size="sm"
                                variant={voucher.status === 'ACTIVE' ? 'warning' : 'success'}
                                icon={voucher.status === 'ACTIVE' ? 'pause_circle' : 'play_circle'}
                                title={voucher.status === 'ACTIVE' ? 'Tạm tắt voucher' : 'Kích hoạt voucher'}
                                loading={isActionLoading}
                                onClick={() => handleToggleStatus(voucher)}
                              />
                            )}
                            <SellerActionButton
                              size="sm"
                              variant="info"
                              icon="analytics"
                              title="Xem thống kê sử dụng"
                              onClick={() => handleOpenStats(voucher)}
                            />
                            <SellerActionButton
                              size="sm"
                              variant="edit"
                              icon="edit"
                              title="Chỉnh sửa voucher"
                              onClick={() => handleOpenEdit(voucher)}
                            />
                            {voucher.currentUsage === 0 && (
                              <SellerActionButton
                                size="sm"
                                variant="danger"
                                icon="delete"
                                title="Xóa voucher"
                                loading={isActionLoading}
                                onClick={() => handleDeleteVoucher(voucher)}
                              />
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Master-Detail Subcard */}
                    {isExpanded && (
                      <tr className="bg-emerald-50/20 border-b border-emerald-100">
                        <td colSpan={7} className="p-4 sm:p-5">
                          <div className="rounded-2xl border border-emerald-200/80 bg-white p-4 shadow-2xs flex flex-col gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                              {/* Card 1: Chi Tiết Mức Giảm */}
                              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
                                  <span className="material-symbols-outlined text-[15px] text-[#00875A]">sell</span>
                                  <span>Quy Định Chiết Khấu</span>
                                </div>
                                <div className="space-y-1.5 text-[11.5px]">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Mã Voucher:</span>
                                    <span className="font-mono font-bold text-[#00875A]">{voucher.code}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Loại Giảm Giá:</span>
                                    <span className="font-semibold text-slate-900">{formatVoucherType(voucher.type)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Mức Giảm:</span>
                                    <span className="font-bold text-emerald-800">{formatDiscountValue(voucher.type, voucher.value)}</span>
                                  </div>
                                  {voucher.type === 'PERCENTAGE' && voucher.maxDiscountAmount && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Trần Giảm Tối Đa:</span>
                                      <span className="font-mono text-slate-800">{formatVND(voucher.maxDiscountAmount)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Đơn Tối Thiểu:</span>
                                    <span className="font-mono text-slate-800">{formatVND(voucher.minOrderAmount)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Card 2: Phân Khúc & Giới Hạn */}
                              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
                                  <span className="material-symbols-outlined text-[15px] text-pink-600">group</span>
                                  <span>Phân Khúc &amp; Giới Hạn</span>
                                </div>
                                <div className="space-y-1.5 text-[11.5px]">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Đối Tượng Áp Dụng:</span>
                                    <span className="font-bold text-slate-900">{formatTargetAudience(voucher.targetAudience).label}</span>
                                  </div>
                                  {voucher.targetAudience === 'FOLLOWERS_ONLY' && (
                                    <div className="flex justify-between">
                                      <span className="text-slate-500">Mốc Follow:</span>
                                      <span className="font-bold text-pink-700">{formatFollowerRequirement(voucher.minFollowDays).label}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Tổng Lượt Phát Hành:</span>
                                    <span className="font-mono font-semibold text-slate-800">{voucher.totalUsage > 0 ? `${voucher.totalUsage} lượt` : 'Không giới hạn'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Đã Sử Dụng:</span>
                                    <span className="font-mono font-bold text-emerald-700">{voucher.currentUsage || 0} lượt ({usagePercent}%)</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Tối Đa / Khách:</span>
                                    <span className="font-mono text-slate-800">{voucher.maxUsagePerUser || 1} lần / độc giả</span>
                                  </div>
                                </div>
                              </div>

                              {/* Card 3: Hiệu Lực & Gian Hàng */}
                              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col gap-2">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider border-b border-slate-200/60 pb-1.5">
                                  <span className="material-symbols-outlined text-[15px] text-blue-600">schedule</span>
                                  <span>Thời Gian &amp; Gian Hàng</span>
                                </div>
                                <div className="space-y-1.5 text-[11.5px]">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Bắt Đầu:</span>
                                    <span className="font-mono text-slate-800">{new Date(voucher.startsAt).toLocaleString('vi-VN')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Kết Thúc:</span>
                                    <span className="font-mono text-slate-800">{new Date(voucher.expiresAt).toLocaleString('vi-VN')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Gian Hàng:</span>
                                    <span className="font-medium text-slate-800">{stores.find((s) => s.id === voucher.storeId)?.name || 'Tất cả Shop'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Nguồn Kinh Phí:</span>
                                    <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded">Gian hàng chi trả 100%</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Toolbar */}
                            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
                              <span className="text-[11px] text-slate-500">
                                {voucher.description ? `Mô tả: "${voucher.description}"` : 'Mã giảm giá do gian hàng tự phát hành'}
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenStats(voucher)}
                                  className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">analytics</span>
                                  <span>Xem Báo Cáo Hiệu Quả</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(voucher)}
                                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-[14px]">edit</span>
                                  <span>Chỉnh Sửa</span>
                                </button>
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
        )}

        <SellerPagination
          currentPage={validPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          itemLabel="voucher"
        />
      </SellerTableContainer>
    </div>
  );
}
