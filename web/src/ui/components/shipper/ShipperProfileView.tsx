"use client";

import React, { useState } from 'react';
import { useShipper } from '@/ui/context/ShipperContext';

export default function ShipperProfileView() {
  const { profile, updateProfile, isOnline, setIsOnline } = useShipper();

  const [formData, setFormData] = useState({
    name: profile.name,
    phone: profile.phone,
    email: profile.email,
    vehicleType: profile.vehicleType,
    licensePlate: profile.licensePlate,
    activeZone: profile.activeZone,
    identityCard: profile.identityCard,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile(formData);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-[var(--theme-border,#e8e5df)] pb-3.5">
        <h1 className="font-editorial text-xl sm:text-2xl font-bold text-[var(--theme-text,#1c1b1f)] flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-700 dark:text-purple-300 flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">badge</span>
          </span>
          <span>Hồ Sơ Bưu Tá &amp; Phương Tiện Vận Chuyển</span>
        </h1>
        <p className="text-xs text-[var(--theme-text-muted,#49454f)] mt-0.5">
          Quản lý thông tin định danh bưu tá, phương tiện giao hàng và khu vực phụ trách.
        </p>
      </div>

      {/* Driver Badge Card */}
      <div className="bg-gradient-to-r from-[#003B2B] via-[#005a40] to-[#003B2B] text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <img
            src={profile.avatar}
            alt={profile.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/40 shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">{profile.name}</h2>
              <span className="px-2 py-0.2 rounded bg-emerald-400 text-emerald-950 text-[10px] font-black uppercase">
                Đã Xác Minh
              </span>
            </div>
            <p className="text-xs text-emerald-200 mt-1">
              Mã tài xế: <strong className="text-white">{profile.id}</strong> • Gia nhập: {profile.joinDate}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="flex items-center gap-1 font-bold text-amber-300">
                <span className="material-symbols-outlined text-[16px] fill-1">star</span>
                {profile.rating} / 5.0 Đánh giá
              </span>
              <span className="text-emerald-100">•</span>
              <span className="text-emerald-100 font-semibold">{profile.totalDelivered} đơn đã giao</span>
            </div>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/20 text-xs shrink-0 space-y-1">
          <span className="text-emerald-200 text-[11px] block">Trạng thái làm việc:</span>
          <button
            type="button"
            onClick={() => setIsOnline(!isOnline)}
            className={`w-full px-3 py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              isOnline ? 'bg-emerald-400 text-emerald-950' : 'bg-neutral-600 text-white'
            }`}
          >
            <span>{isOnline ? '🟢 Sẵn Sàng Nhận Đơn' : '⚪ Đang Offline'}</span>
          </button>
        </div>
      </div>

      {/* Edit Profile Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-[var(--theme-surface,#ffffff)] rounded-2xl border border-[var(--theme-border,#e8e5df)] p-6 shadow-2xs space-y-5"
      >
        <h3 className="font-bold text-sm text-[var(--theme-text,#1c1b1f)] flex items-center gap-1.5 pb-2 border-b border-[var(--theme-border,#e8e5df)]">
          <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)]">person</span>
          Thông Tin Cá Nhân &amp; Định Danh
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1">
              Họ và tên tài xế <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs font-medium focus:outline-none focus:border-[#00875A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1">
              Số điện thoại liên hệ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs font-medium focus:outline-none focus:border-[#00875A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1">
              Email tài xế
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs font-medium focus:outline-none focus:border-[#00875A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1">
              Số CCCD / Định danh
            </label>
            <input
              type="text"
              value={formData.identityCard}
              onChange={(e) => setFormData({ ...formData, identityCard: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs font-medium focus:outline-none focus:border-[#00875A]"
            />
          </div>
        </div>

        <h3 className="font-bold text-sm text-[var(--theme-text,#1c1b1f)] flex items-center gap-1.5 pt-3 pb-2 border-b border-[var(--theme-border,#e8e5df)]">
          <span className="material-symbols-outlined text-[18px] text-[var(--theme-primary,#003B2B)]">two_wheeler</span>
          Phương Tiện &amp; Khu Vực Giao Hàng
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1">
              Loại phương tiện
            </label>
            <input
              type="text"
              value={formData.vehicleType}
              onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
              placeholder="Ví dụ: Xe máy Honda Wave Alpha"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs font-medium focus:outline-none focus:border-[#00875A]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1">
              Biển số xe đăng ký
            </label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value })}
              placeholder="Ví dụ: 66-F1 987.65"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs font-medium focus:outline-none focus:border-[#00875A]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[var(--theme-text-muted,#49454f)] mb-1">
              Khu vực phụ trách hoạt động chính
            </label>
            <input
              type="text"
              value={formData.activeZone}
              onChange={(e) => setFormData({ ...formData, activeZone: e.target.value })}
              placeholder="Ví dụ: Đồng Tháp (TP. Cao Lãnh & TP. Sa Đéc)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--theme-border,#e8e5df)] text-xs font-medium focus:outline-none focus:border-[#00875A]"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[var(--theme-border,#e8e5df)] flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[var(--theme-primary,#003B2B)] text-white text-xs sm:text-sm font-bold hover:opacity-95 shadow-sm transition-all cursor-pointer"
          >
            Lưu Thay Đổi
          </button>
        </div>
      </form>
    </div>
  );
}
