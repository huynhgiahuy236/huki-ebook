"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import {
  getSellerVouchers,
  createSellerVoucher,
  updateSellerVoucher,
  activateSellerVoucher,
  deactivateSellerVoucher,
  deleteSellerVoucher,
  formatVoucherType,
  formatVoucherStatus,
  formatDiscountValue,
} from '@/ui/api/sellerVoucherApi';
import type { Voucher, CreateVoucherPayload } from '@/ui/api/sellerVoucherApi';

/**
 * HUKI EBOOK - Seller Shop Voucher Management Page
 * Create, Edit, Activate/Deactivate Shop Vouchers
 */
export function SellerVouchersView() {
  const { showToast } = useToast();

  // State
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Load vouchers
  const loadVouchers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSellerVouchers({
        status: filterStatus !== 'ALL' ? (filterStatus as any) : undefined,
      });
      if (res.success && res.data) {
        setVouchers(res.data.items || []);
      } else {
        showToast?.(
          { title: 'Lỗi', message: res.error?.message || 'Không thể tải danh sách voucher' },
          'error'
        );
      }
    } catch (err) {
      console.error('Failed to load vouchers:', err);
      showToast?.(
        { title: 'Lỗi kết nối', message: 'Không thể tải danh sách voucher' },
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [filterStatus, showToast]);

  useEffect(() => {
    loadVouchers();
  }, [loadVouchers]);

  // Filter vouchers
  const filteredVouchers = vouchers.filter((v) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        v.code.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle activate/deactivate
  const handleToggleStatus = async (voucher: Voucher) => {
    setActionLoading(voucher.id);
    try {
      const res =
        voucher.status === 'ACTIVE'
          ? await deactivateSellerVoucher(voucher.id)
          : await activateSellerVoucher(voucher.id);

      if (res.success) {
        showToast?.(
          {
            title: 'Thành công',
            message:
              voucher.status === 'ACTIVE'
                ? `Đã tắt voucher ${voucher.code}`
                : `Đã bật voucher ${voucher.code}`,
          },
          'success'
        );
        await loadVouchers();
      } else {
        showToast?.(
          { title: 'Lỗi', message: res.error?.message || 'Không thể cập nhật trạng thái' },
          'error'
        );
      }
    } catch {
      showToast?.(
        { title: 'Lỗi', message: 'Không thể cập nhật trạng thái voucher' },
        'error'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Handle delete
  const handleDelete = async (voucher: Voucher) => {
    if (!confirm(`Bạn có chắc muốn xóa voucher "${voucher.code}"?\nKhông thể hoàn tác.`)) {
      return;
    }

    setActionLoading(voucher.id);
    try {
      const res = await deleteSellerVoucher(voucher.id);
      if (res.success) {
        showToast?.(
          { title: 'Thành công', message: `Đã xóa voucher ${voucher.code}` },
          'success'
        );
        await loadVouchers();
      } else {
        showToast?.(
          { title: 'Lỗi', message: res.error?.message || 'Không thể xóa voucher' },
          'error'
        );
      }
    } catch {
      showToast?.(
        { title: 'Lỗi', message: 'Không thể xóa voucher' },
        'error'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const cfg = formatVoucherStatus(status as any);
    const colorMap: Record<string, string> = {
      emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
      gray: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
      red: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300',
      orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300',
    };
    return (
      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${colorMap[cfg.color] || colorMap.gray}`}>
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col gap-6 p-4 sm:p-6 lg:p-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl sm:text-3xl font-black text-[var(--theme-text,#1c1b1f)]">
            Shop Voucher
          </h1>
          <p className="text-xs sm:text-sm text-[var(--theme-text-muted,#49454f)] mt-1">
            Tạo và quản lý mã giảm giá cho Gian hàng của bạn
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs sm:text-sm font-bold hover:opacity-95 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Tạo Voucher Mới</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          {['ALL', 'ACTIVE', 'INACTIVE', 'EXPIRED', 'USED_UP'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterStatus === status
                  ? 'bg-[var(--theme-primary,#003B2B)] text-white'
                  : 'bg-white dark:bg-gray-800 border border-[var(--theme-border,#e8e5df)] text-[var(--theme-text-muted,#49454f)] hover:border-[var(--theme-primary,#003B2B)]'
              }`}
            >
              {status === 'ALL' ? 'Tất cả' :
               status === 'ACTIVE' ? 'Đang hoạt động' :
               status === 'INACTIVE' ? 'Tạm tắt' :
               status === 'EXPIRED' ? 'Hết hạn' : 'Hết lượt'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted,#49454f)] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo mã hoặc tên voucher..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-xs sm:text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Voucher List */}
      {loading ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[var(--theme-border,#e8e5df)] p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-[var(--theme-text-muted,#49454f)] animate-spin">
            progress_activity
          </span>
          <p className="text-sm text-[var(--theme-text-muted,#49454f)] mt-2">Đang tải...</p>
        </div>
      ) : filteredVouchers.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[var(--theme-border,#e8e5df)] p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-[var(--theme-text-muted,#49454f)]">
            local_activity
          </span>
          <h3 className="text-lg font-bold text-[var(--theme-text,#1c1b1f)] mt-4">
            Chưa có Voucher nào
          </h3>
          <p className="text-sm text-[var(--theme-text-muted,#49454f)] mt-2 mb-6">
            Tạo voucher để thu hút khách hàng với ưu đãi hấp dẫn
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-sm font-bold hover:opacity-95 shadow-sm transition-all cursor-pointer"
          >
            Tạo Voucher Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredVouchers.map((voucher) => (
            <div
              key={voucher.id}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-[var(--theme-border,#e8e5df)] p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Discount Tag */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[var(--theme-primary,#003B2B)]/10 flex items-center justify-center text-[var(--theme-primary,#003B2B)] shrink-0">
                    <span className="material-symbols-outlined text-2xl">
                      {voucher.type === 'FREE_SHIPPING' ? 'local_shipping' : 'percent'}
                    </span>
                  </div>
                  <div>
                    <div className="font-mono font-black text-base text-[var(--theme-text,#1c1b1f)] tracking-wider">
                      {voucher.code}
                    </div>
                    <div className="text-xs text-[var(--theme-text-muted,#49454f)] line-clamp-1">
                      {voucher.name}
                    </div>
                  </div>
                </div>
                {getStatusBadge(voucher.status)}
              </div>

              {/* Voucher Details */}
              <div className="flex flex-col gap-1.5 text-xs text-[var(--theme-text-muted,#49454f)] py-2 border-y border-[var(--theme-border,#e8e5df)]/50">
                <div className="flex items-center justify-between">
                  <span>Giảm giá:</span>
                  <span className="font-bold text-[var(--theme-text,#1c1b1f)]">
                    {formatDiscountValue(voucher.type, voucher.value)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Đơn tối thiểu:</span>
                  <span className="font-medium text-[var(--theme-text,#1c1b1f)]">
                    {voucher.minOrderAmount > 0
                      ? `${voucher.minOrderAmount.toLocaleString('vi-VN')}đ`
                      : 'Không giới hạn'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Lượt dùng:</span>
                  <span className="font-medium text-[var(--theme-text,#1c1b1f)]">
                    {voucher.currentUsage} / {voucher.totalUsage && voucher.totalUsage > 0 ? voucher.totalUsage : '∞'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hiệu lực:</span>
                  <span className="font-medium text-[var(--theme-text,#1c1b1f)]">
                    {new Date(voucher.startsAt).toLocaleDateString('vi-VN')} -{' '}
                    {new Date(voucher.expiresAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  disabled={actionLoading === voucher.id}
                  onClick={() => handleToggleStatus(voucher)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    voucher.status === 'ACTIVE'
                      ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                  }`}
                >
                  {voucher.status === 'ACTIVE' ? 'Tắt voucher' : 'Bật voucher'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditingVoucher(voucher)}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--theme-text-muted,#49454f)] transition-colors cursor-pointer"
                    title="Chỉnh sửa"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading === voucher.id}
                    onClick={() => handleDelete(voucher)}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 transition-colors cursor-pointer"
                    title="Xóa"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(showCreateModal || editingVoucher) && (
        <VoucherFormModal
          voucher={editingVoucher}
          onClose={() => {
            setShowCreateModal(false);
            setEditingVoucher(null);
          }}
          onSuccess={async () => {
            setShowCreateModal(false);
            setEditingVoucher(null);
            await loadVouchers();
          }}
        />
      )}
    </div>
  );
}

// ==========================================
// VOUCHER FORM MODAL (CREATE / EDIT)
// ==========================================
interface VoucherFormModalProps {
  voucher?: Voucher | null;
  onClose: () => void;
  onSuccess: () => void;
}

function VoucherFormModal({ voucher, onClose, onSuccess }: VoucherFormModalProps) {
  const { showToast } = useToast();
  const isEditing = !!voucher;

  const [form, setForm] = useState<CreateVoucherPayload>({
    code: voucher?.code || '',
    name: voucher?.name || '',
    type: voucher?.type || 'PERCENTAGE',
    value: voucher?.value || 10,
    maxDiscountAmount: voucher?.maxDiscountAmount || 0,
    minOrderAmount: voucher?.minOrderAmount || 0,
    totalUsage: voucher?.totalUsage || 100,
    maxUsagePerUser: voucher?.maxUsagePerUser || 1,
    startsAt: voucher?.startsAt ? new Date(voucher.startsAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
    expiresAt: voucher?.expiresAt ? new Date(voucher.expiresAt).toISOString().slice(0, 16) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16),
    description: voucher?.description || '',
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.code.trim()) {
      showToast?.({ title: 'Lỗi', message: 'Vui lòng nhập mã voucher' }, 'error');
      return;
    }
    if (!form.name.trim()) {
      showToast?.({ title: 'Lỗi', message: 'Vui lòng nhập tên voucher' }, 'error');
      return;
    }

    setSaving(true);
    try {
      const res = isEditing
        ? await updateSellerVoucher(voucher!.id, form)
        : await createSellerVoucher(form);

      if (res.success) {
        showToast?.(
          {
            title: 'Thành công',
            message: isEditing
              ? `Đã cập nhật voucher ${form.code}`
              : `Đã tạo voucher mới ${form.code}`,
          },
          'success'
        );
        onSuccess();
      } else {
        showToast?.(
          { title: 'Lỗi', message: res.error?.message || 'Không thể lưu voucher' },
          'error'
        );
      }
    } catch {
      showToast?.({ title: 'Lỗi', message: 'Có lỗi xảy ra khi lưu voucher' }, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[var(--theme-border,#e8e5df)] max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--theme-border,#e8e5df)]">
          <h2 className="font-editorial text-xl font-bold text-[var(--theme-text,#1c1b1f)]">
            {isEditing ? 'Chỉnh Sửa Voucher' : 'Tạo Shop Voucher Mới'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[var(--theme-text-muted,#49454f)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
          {/* Code & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
                Mã Voucher *
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="VD: SHOP2026"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-sm font-mono uppercase focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
                Tên hiển thị *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Giảm 20k đơn từ 200k"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors"
              />
            </div>
          </div>

          {/* Voucher Type */}
          <div>
            <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
              Loại giảm giá *
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors"
            >
              <option value="PERCENTAGE">Giảm theo phần trăm (%)</option>
              <option value="FIXED_AMOUNT">Giảm số tiền cố định (VNĐ)</option>
              <option value="FREE_SHIPPING">Miễn phí vận chuyển (Freeship)</option>
            </select>
          </div>

          {/* Discount Value & Max Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
                {form.type === 'PERCENTAGE'
                  ? 'Phần trăm giảm (%) *'
                  : 'Số tiền giảm (VNĐ) *'}
              </label>
              <input
                type="number"
                min={1}
                max={form.type === 'PERCENTAGE' ? 100 : undefined}
                required
                value={form.value}
                onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors"
              />
            </div>

            {form.type === 'PERCENTAGE' && (
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
                  Giảm tối đa (VNĐ, 0 = không giới hạn)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={form.maxDiscountAmount || 0}
                  onChange={(e) => setForm({ ...form, maxDiscountAmount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors"
                />
              </div>
            )}
          </div>

          {/* Min Order & Usage Limit */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
                Đơn hàng tối thiểu (VNĐ)
              </label>
              <input
                type="number"
                min={0}
                step={1000}
                value={form.minOrderAmount || 0}
                onChange={(e) => setForm({ ...form, minOrderAmount: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
                Tổng lượt sử dụng (0 = vô hạn)
              </label>
              <input
                type="number"
                min={0}
                value={form.totalUsage || 0}
                onChange={(e) => setForm({ ...form, totalUsage: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
                Bắt đầu
              </label>
              <input
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
                Hết hạn
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-[var(--theme-text,#1c1b1f)] mb-1.5">
              Mô tả (tùy chọn)
            </label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="VD: Áp dụng cho đơn hàng từ 200.000đ trở lên"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] transition-colors resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-sm font-semibold text-[var(--theme-text,#1c1b1f)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-sm font-bold hover:opacity-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <span>{isEditing ? 'Cập Nhật' : 'Tạo Voucher'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SellerVouchersView;
