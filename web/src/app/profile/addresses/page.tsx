"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { addressApi } from '@/ui/api/addressApi';
import EmptyState from '@/ui/components/common/EmptyState';
import CustomLocationSelector, { LocationChangePayload } from '@/ui/components/common/CustomLocationSelector';
import AddressMapPreview from '@/ui/components/common/AddressMapPreview';

export default function UserAddressesPage() {
  const { showToast } = useToast();
  const { isLoggedIn, user } = useAuth();

  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');
  const [addresses, setAddresses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingAddressId, setEditingAddressId] = useState<string | number | null>(null);

  const [formData, setFormData] = useState({
    name: user?.fullName || user?.name || '',
    phone: user?.phone || '',
    province: 'Thành phố Hồ Chí Minh',
    district: 'Quận Gò Vấp',
    ward: 'Phường 5',
    address: '',
    addressType: 'HOME' as 'HOME' | 'OFFICE',
    isDefault: false,
  });

  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    if (isLoggedIn) {
      try {
        const res = await addressApi.getAddresses();
        if (res.success && Array.isArray(res.data)) {
          setAddresses(res.data);
          // If no addresses, switch to form tab automatically
          if (res.data.length === 0) {
            setActiveTab('form');
          }
        }
      } catch {
        // Fallback to local
      }
    } else {
      try {
        const saved = window.localStorage.getItem('huki.user.addresses');
        if (saved) {
          const parsed = JSON.parse(saved);
          setAddresses(parsed);
          if (parsed.length === 0) setActiveTab('form');
        } else {
          setActiveTab('form');
        }
      } catch {
        // Fallback
      }
    }
    setIsLoading(false);
  }, [isLoggedIn]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleSetDefault = async (addr: any) => {
    if (isLoggedIn && addr.id) {
      try {
        await addressApi.updateAddress(addr.id, { isDefault: true });
        await loadAddresses();
        showToast(
          {
            title: 'Đặt địa chỉ mặc định',
            message: `Đã đặt "${addr.address}" làm địa chỉ giao sách mặc định!`,
          },
          'success'
        );
        return;
      } catch {
        // Fallback
      }
    }

    setAddresses((prev) =>
      prev.map((a) => ({ ...a, isDefault: a.id === addr.id }))
    );
    showToast(
      {
        title: 'Đặt địa chỉ mặc định',
        message: 'Đã đặt địa chỉ giao sách mặc định!',
      },
      'success'
    );
  };

  const handleDelete = async (id: string | number) => {
    if (isLoggedIn && id) {
      try {
        await addressApi.deleteAddress(String(id));
        await loadAddresses();
        showToast(
          {
            title: 'Đã xóa địa chỉ',
            message: 'Địa chỉ đã được xóa khỏi sổ địa chỉ của bạn.',
          },
          'info'
        );
        return;
      } catch {
        // Fallback
      }
    }

    setAddresses((prev) => prev.filter((a) => a.id !== id));
    showToast(
      {
        title: 'Đã xóa địa chỉ',
        message: 'Địa chỉ đã được xóa khỏi sổ địa chỉ của bạn.',
      },
      'info'
    );
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      showToast(
        {
          title: 'Thông tin chưa đầy đủ',
          message: 'Vui lòng điền họ tên, số điện thoại và địa chỉ chi tiết.',
        },
        'warning'
      );
      return;
    }

    if (isLoggedIn) {
      try {
        if (editingAddressId) {
          const res = await addressApi.updateAddress(String(editingAddressId), {
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            province: formData.province.trim(),
            district: formData.district.trim(),
            ward: formData.ward.trim(),
            address: formData.address.trim(),
            isDefault: formData.isDefault,
          });
          if (res.success) {
            showToast(
              {
                title: 'Cập nhật thành công',
                message: 'Thông tin địa chỉ nhận sách đã được cập nhật!',
              },
              'success'
            );
            setEditingAddressId(null);
            setActiveTab('list');
            await loadAddresses();
            return;
          }
        } else {
          const res = await addressApi.createAddress({
            name: formData.name.trim(),
            phone: formData.phone.trim(),
            province: formData.province.trim(),
            district: formData.district.trim(),
            ward: formData.ward.trim(),
            address: formData.address.trim(),
            isDefault: formData.isDefault || addresses.length === 0,
          });
          if (res.success) {
            showToast(
              {
                title: 'Thêm địa chỉ thành công',
                message: 'Địa chỉ mới đã được lưu vào sổ địa chỉ.',
              },
              'success'
            );
            setEditingAddressId(null);
            setActiveTab('list');
            await loadAddresses();
            return;
          }
        }
      } catch {
        // Fallback
      }
    }

    // Local Fallback
    const newAddr = {
      id: editingAddressId || `addr-${Date.now()}`,
      name: formData.name,
      phone: formData.phone,
      province: formData.province,
      district: formData.district,
      ward: formData.ward,
      address: formData.address,
      addressType: formData.addressType || 'HOME',
      isDefault: formData.isDefault || addresses.length === 0,
    };

    if (editingAddressId) {
      setAddresses((prev) =>
        prev.map((a) => (a.id === editingAddressId ? newAddr : a))
      );
    } else if (newAddr.isDefault) {
      setAddresses([newAddr, ...addresses.map((a) => ({ ...a, isDefault: false }))]);
    } else {
      setAddresses([...addresses, newAddr]);
    }

    setEditingAddressId(null);
    setActiveTab('list');
    showToast(
      {
        title: 'Lưu địa chỉ thành công',
        message: 'Đã cập nhật danh sách địa chỉ nhận sách!',
      },
      'success'
    );
  };

  const startEdit = (addr: any) => {
    setEditingAddressId(addr.id);
    setFormData({
      name: addr.name,
      phone: addr.phone,
      province: addr.province || 'Thành phố Hồ Chí Minh',
      district: addr.district || 'Quận Gò Vấp',
      ward: addr.ward || 'Phường 5',
      address: addr.address || '',
      addressType: addr.addressType || 'HOME',
      isDefault: addr.isDefault || false,
    });
    setActiveTab('form');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const switchToNewForm = () => {
    setEditingAddressId(null);
    setFormData({
      name: user?.fullName || user?.name || '',
      phone: user?.phone || '',
      province: 'Thành phố Hồ Chí Minh',
      district: 'Quận Gò Vấp',
      ward: 'Phường 5',
      address: '',
      addressType: 'HOME',
      isDefault: addresses.length === 0,
    });
    setActiveTab('form');
  };

  return (
    <div className="w-full min-h-screen bg-[var(--theme-background,#F2FBF9)] text-[var(--theme-text,#1c1b1f)] py-6 md:py-10 pb-20 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[var(--theme-text-muted,#49454f)] mb-6">
          <Link href="/" className="hover:text-[var(--theme-primary,#003B2B)] font-medium">
            Trang Chủ
          </Link>
          <span className="opacity-40">/</span>
          <Link href="/profile" className="hover:text-[var(--theme-primary,#003B2B)] font-medium">
            Tài Khoản
          </Link>
          <span className="opacity-40">/</span>
          <span className="font-bold text-[var(--theme-text,#1c1b1f)]">Sổ Địa Chỉ Giao Hàng</span>
        </div>

        {/* Header Bar */}
        <div className="bg-[var(--theme-surface,#ffffff)] rounded-3xl border border-[var(--theme-border,#e8e5df)] p-6 sm:p-8 shadow-xs mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-black text-[var(--theme-text,#1c1b1f)]">
              Sổ Địa Chỉ Nhận Hàng
            </h1>
            <p className="text-xs sm:text-sm text-[var(--theme-text-muted,#49454f)] mt-1">
              Quản lý các địa chỉ nhận sách giấy để việc giao nhận sách diễn ra chuẩn xác và nhanh chóng.
            </p>
          </div>

          {/* 2-Tab Navigation Switcher */}
          <div className="flex items-center gap-1.5 p-1.5 bg-[var(--theme-background,#F2FBF9)] rounded-2xl border border-[var(--theme-border,#e8e5df)] shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('list');
                setEditingAddressId(null);
              }}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-[var(--theme-primary,#003B2B)] text-white shadow-sm'
                  : 'text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-text,#1c1b1f)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">list_alt</span>
              <span>Địa Chỉ Đã Lưu</span>
              <span
                className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'list'
                    ? 'bg-white/20 text-white'
                    : 'bg-black/10 dark:bg-white/10 text-[var(--theme-text,#1c1b1f)]'
                }`}
              >
                {addresses.length}
              </span>
            </button>

            <button
              type="button"
              onClick={switchToNewForm}
              className={`px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'form'
                  ? 'bg-[var(--theme-primary,#003B2B)] text-white shadow-sm'
                  : 'text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-text,#1c1b1f)] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {editingAddressId ? 'edit_location' : 'add_location_alt'}
              </span>
              <span>{editingAddressId ? 'Chỉnh Sửa' : '+ Thêm Mới'}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: DANH SÁCH ĐỊA CHỈ ĐANG CÓ */}
        {activeTab === 'list' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {isLoading ? (
              <div className="p-16 text-center text-xs text-[var(--theme-text-muted,#49454f)] bg-[var(--theme-surface,#ffffff)] rounded-3xl border border-[var(--theme-border,#e8e5df)] animate-pulse">
                Đang tải danh sách địa chỉ của bạn...
              </div>
            ) : addresses.length === 0 ? (
              <EmptyState
                icon="location_off"
                title="Chưa có địa chỉ giao hàng nào"
                description="Hãy thêm địa chỉ nhận sách của bạn để quá trình đặt sách giấy diễn ra thuận tiện nhất."
                actionText="+ Thêm Địa Chỉ Đầu Tiên"
                onAction={switchToNewForm}
                actionIcon="add_location_alt"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-6 rounded-3xl border bg-[var(--theme-surface,#ffffff)] shadow-xs flex flex-col justify-between gap-4 transition-all hover:shadow-md ${
                      addr.isDefault
                        ? 'border-2 border-[var(--theme-primary,#003B2B)] ring-4 ring-[var(--theme-primary,#003B2B)]/10'
                        : 'border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003B2B)]/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className="font-bold text-base text-[var(--theme-text,#1c1b1f)]">
                            {addr.name}
                          </strong>
                          <span className="text-xs text-[var(--theme-text-muted,#49454f)] font-medium">
                            ({addr.phone})
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                            addr.addressType === 'OFFICE'
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                              : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          }`}>
                            <span className="material-symbols-outlined text-[12px]">
                              {addr.addressType === 'OFFICE' ? 'domain' : 'home'}
                            </span>
                            {addr.addressType === 'OFFICE' ? 'Văn Phòng' : 'Nhà Riêng'}
                          </span>
                        </div>
                        {addr.isDefault && (
                          <span className="px-3 py-1 rounded-full bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] text-[11px] font-bold">
                            Mặc Định
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-2 text-xs sm:text-sm text-[var(--theme-text-muted,#49454f)] leading-relaxed">
                        <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)] shrink-0 mt-0.5">
                          location_on
                        </span>
                        <span>
                          {addr.address}, {addr.ward}, {addr.district}, {addr.province}
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-[var(--theme-border,#e8e5df)]/60 flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => startEdit(addr)}
                          className="text-[var(--theme-primary,#003B2B)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(addr.id)}
                          className="text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                          Xóa
                        </button>
                      </div>

                      {!addr.isDefault && (
                        <button
                          onClick={() => handleSetDefault(addr)}
                          className="text-xs text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-primary,#003B2B)] font-medium underline cursor-pointer"
                        >
                          Thiết lập mặc định
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: THÊM / CHỈNH SỬA ĐỊA CHỈ VỚI BẢN ĐỒ LIVE */}
        {activeTab === 'form' && (
          <div className="bg-[var(--theme-surface,#ffffff)] rounded-3xl border border-[var(--theme-border,#e8e5df)] p-6 sm:p-8 md:p-10 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[var(--theme-border,#e8e5df)]/60">
              <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[var(--theme-primary,#003B2B)]/10 text-[var(--theme-primary,#003B2B)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px] text-[var(--theme-primary,#003B2B)]">
                    {editingAddressId ? 'edit_location' : 'add_location_alt'}
                  </span>
                </span>
                {editingAddressId ? 'Chỉnh Sửa Địa Chỉ Nhận Hàng' : 'Thêm Địa Chỉ Giao Hàng Mới'}
              </h3>

              {addresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('list');
                    setEditingAddressId(null);
                  }}
                  className="text-xs sm:text-sm text-[var(--theme-text-muted,#49454f)] hover:text-[var(--theme-text,#1c1b1f)] flex items-center gap-1 font-medium cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  Quay lại danh sách
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Bên Trái (7 Cols): Rộng Rãi, Thoáng Mắt */}
              <form onSubmit={handleSaveAddress} className="lg:col-span-7 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
                      Họ và tên người nhận <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] focus:ring-2 focus:ring-[var(--theme-primary,#003B2B)]/10 transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
                      Số điện thoại liên hệ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Ví dụ: 0912345678"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] focus:ring-2 focus:ring-[var(--theme-primary,#003B2B)]/10 transition-all shadow-xs"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <CustomLocationSelector
                      province={formData.province}
                      district={formData.district}
                      ward={formData.ward}
                      onChange={({ province, district, ward }: LocationChangePayload) =>
                        setFormData((prev) => ({ ...prev, province, district, ward }))
                      }
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
                      Số nhà, tên đường chi tiết <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Ví dụ: 123 Đường Nguyễn Huệ"
                      className="w-full px-4 py-3 rounded-xl border border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface,#ffffff)] text-sm focus:outline-none focus:border-[var(--theme-primary,#003B2B)] focus:ring-2 focus:ring-[var(--theme-primary,#003B2B)]/10 transition-all shadow-xs"
                    />
                  </div>

                  {/* Loại Địa Chỉ: Nhà Riêng vs Văn Phòng */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1.5">
                      Loại địa chỉ nhận hàng
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, addressType: 'HOME' })}
                        className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          formData.addressType === 'HOME'
                            ? 'bg-[var(--theme-primary,#003B2B)] text-white border-[var(--theme-primary,#003B2B)] shadow-sm'
                            : 'bg-[var(--theme-surface,#ffffff)] border-[var(--theme-border,#e8e5df)] text-[var(--theme-text,#1c1b1f)] hover:bg-[var(--theme-background,#F2FBF9)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">home</span>
                        <span>Nhà Riêng / Nhà Trọ</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, addressType: 'OFFICE' })}
                        className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          formData.addressType === 'OFFICE'
                            ? 'bg-[var(--theme-primary,#003B2B)] text-white border-[var(--theme-primary,#003B2B)] shadow-sm'
                            : 'bg-[var(--theme-surface,#ffffff)] border-[var(--theme-border,#e8e5df)] text-[var(--theme-text,#1c1b1f)] hover:bg-[var(--theme-background,#F2FBF9)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">domain</span>
                        <span>Văn Phòng / Công Ty</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-[var(--theme-text-muted,#49454f)]/70 italic mt-1 block">
                      {formData.addressType === 'HOME' ? '• Giao hàng tất cả các ngày trong tuần (kể cả Thứ 7 & CN)' : '• Chỉ giao hàng trong giờ hành chính từ Thứ 2 đến Thứ 6'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-[var(--theme-border,#e8e5df)]/80">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-medium text-[var(--theme-text,#1c1b1f)] select-none">
                    <input
                      type="checkbox"
                      checked={formData.isDefault}
                      onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                      className="w-4 h-4 rounded text-[var(--theme-primary,#003B2B)] focus:ring-[var(--theme-primary,#003B2B)] border-[var(--theme-border,#e8e5df)] cursor-pointer"
                    />
                    <span>Đặt làm địa chỉ giao sách mặc định</span>
                  </label>

                  <div className="flex items-center gap-3">
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('list');
                          setEditingAddressId(null);
                        }}
                        className="px-5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs sm:text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer"
                      >
                        Hủy Bỏ
                      </button>
                    )}
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs sm:text-sm font-bold hover:opacity-95 shadow-sm transition-all cursor-pointer"
                    >
                      {editingAddressId ? 'Cập Nhật Địa Chỉ' : 'Lưu Địa Chỉ Mới'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Bản Đồ Bên Phải (5 Cols): Live GPS Map Preview */}
              <div className="lg:col-span-5 h-full min-h-[380px]">
                <AddressMapPreview
                  province={formData.province}
                  district={formData.district}
                  ward={formData.ward}
                  address={formData.address}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
