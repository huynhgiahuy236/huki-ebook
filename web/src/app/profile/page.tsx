"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'library' | 'posts' | 'reviews' | 'quotes' | 'activity' | 'clubs'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.name || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const displayName = user?.fullName || user?.name || user?.email?.split('@')[0] || 'Độc Giả HUKI';
  const displayEmail = user?.email || 'reader@hukiebook.vn';
  const displayPhone = user?.phone || 'Chưa cập nhật';
  const roleLabel =
    user?.role === 'PLATFORM_ADMIN'
      ? 'Platform Admin'
      : user?.role === 'BUSINESS'
      ? 'Chủ Doanh Nghiệp / NXB'
      : 'Độc Giả Cá Nhân';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = formData.fullName.trim();
    if (!trimmedName) {
      setFormError('Họ và tên không được để trống.');
      return;
    }

    if (formData.phone && !/^0[0-9]{9}$/.test(formData.phone.trim())) {
      setFormError('Số điện thoại không hợp lệ (phải gồm 10 chữ số bắt đầu bằng số 0).');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateUserProfile({
        fullName: trimmedName,
        phone: formData.phone.trim() || undefined,
      });

      if (res.success) {
        setIsEditing(false);
        showToast(
          {
            title: 'Cập nhật thành công!',
            message: 'Thông tin hồ sơ cá nhân của bạn đã được lưu lại.',
            type: 'success',
          },
          'success'
        );
      } else {
        const msg = res.error?.message || (typeof res.error === 'string' ? res.error : 'Không thể cập nhật hồ sơ. Vui lòng thử lại sau.');
        setFormError(msg);
        showToast({ title: 'Cập nhật thất bại', message: msg, type: 'error' }, 'error');
      }
    } catch {
      const msg = 'Lỗi kết nối máy chủ khi cập nhật hồ sơ.';
      setFormError(msg);
      showToast({ title: 'Lỗi kết nối', message: msg, type: 'error' }, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormError('');
    setFormData({
      fullName: user?.fullName || user?.name || '',
      phone: user?.phone || '',
    });
  };

  return (
    <div className="w-full min-h-screen flex flex-col font-sans text-on-surface bg-theme-bg py-6 md:py-8">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between mb-6">
          <nav className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link className="hover:text-theme-primary inline-flex items-center gap-1 font-semibold transition-colors" href="/">
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Trang chủ</span>
            </Link>
            <span>/</span>
            <span>Tài khoản độc giả</span>
            <span>/</span>
            <span className="text-on-surface font-bold">{displayName}</span>
          </nav>

          <div className="text-xs text-on-surface-variant flex items-center gap-1.5 bg-theme-surface px-3 py-1.5 rounded-full border border-theme-border shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Tài khoản đang hoạt động</span>
          </div>
        </div>

        {/* Profile Card Header */}
        <section className="bg-theme-surface rounded-3xl border border-theme-border shadow-xs overflow-hidden mb-8">
          {/* Cover Banner */}
          <div
            className="relative h-44 sm:h-56 w-full overflow-hidden"
            style={{
              background:
                'linear-gradient(to right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #005140), var(--theme-hero-to, #00241A))',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-between px-8 sm:px-12 pointer-events-none">
              <div className="max-w-md hidden md:block text-white/75 italic font-editorial text-lg leading-relaxed">
                “Một cuốn sách hay trên giá gỗ là một người bạn trầm lặng luôn sẵn lòng đợi ta trở lại.”
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1.5 rounded-xl bg-black/30 backdrop-blur-md text-white/90 font-mono text-xs border border-white/15">
                  ID: #{user?.id ? String(user.id).slice(0, 8) : 'GUEST'}
                </span>
              </div>
            </div>
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent"></div>
          </div>

          {/* Profile Details Bar */}
          <div className="px-6 sm:px-8 pb-6 pt-0 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-theme-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                {/* Avatar */}
                <div className="relative group shrink-0 -mt-14 sm:-mt-16">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-theme-primary text-white flex items-center justify-center font-editorial font-bold text-3xl sm:text-4xl ring-4 ring-white shadow-xl border-2 border-theme-primary/30">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs ring-2 ring-white shadow-sm"
                    title="Tài khoản hợp lệ"
                  >
                    <span className="material-symbols-outlined text-sm">verified</span>
                  </span>
                </div>

                {/* User Info */}
                <div className="space-y-1.5 pt-2 sm:pt-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface leading-tight">
                      {displayName}
                    </h1>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full font-bold text-xs border ${
                        user?.role === 'PLATFORM_ADMIN'
                          ? 'bg-purple-50 text-purple-800 border-purple-200'
                          : user?.role === 'BUSINESS'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-theme-secondary-subtle text-theme-secondary border-theme-border'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">shield_person</span>
                      {roleLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-on-surface-variant">
                    <span className="font-semibold text-on-surface inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-theme-primary">mail</span>
                      {displayEmail}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-theme-primary">call</span>
                      {displayPhone}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">calendar_today</span>
                      Thành viên HUKI 2026
                    </span>
                  </div>
                  <p className="max-w-2xl text-sm text-on-surface-variant leading-relaxed">
                    Hồ sơ độc giả HUKI — nơi lưu giữ thông tin cá nhân, sổ địa chỉ và lịch sử ấn phẩm bạn đã đồng hành.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                    isEditing
                      ? 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                      : 'bg-theme-surface hover:bg-theme-bg border border-theme-border text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isEditing ? 'close' : 'edit'}
                  </span>
                  <span>{isEditing ? 'Đóng Chỉnh Sửa' : 'Sửa Thông Tin'}</span>
                </button>

                <Link
                  href="/orders"
                  className="px-4 py-2 rounded-xl bg-theme-surface hover:bg-theme-bg border border-theme-border text-on-surface text-xs font-bold inline-flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-base text-theme-primary">receipt_long</span>
                  <span>Đơn Hàng Của Bạn</span>
                </Link>

                <Link
                  href="/profile/addresses"
                  className="px-4 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-theme-primary-hover transition-all shadow-xs"
                >
                  <span className="material-symbols-outlined text-base">location_on</span>
                  <span>Sổ Địa Chỉ</span>
                </Link>

                <Link
                  href="/profile/security"
                  className="px-3.5 py-2 rounded-xl bg-theme-surface hover:bg-theme-bg border border-theme-border text-on-surface text-xs font-semibold inline-flex items-center gap-1 transition-all shadow-xs"
                  title="Đổi mật khẩu & bảo mật"
                >
                  <span className="material-symbols-outlined text-base">lock</span>
                </Link>
              </div>
            </div>

            {/* INLINE EDIT FORM */}
            {isEditing && (
              <div className="mt-6 p-6 rounded-2xl bg-theme-surface-subtle border border-theme-border animate-fadeIn">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-editorial text-base font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-theme-primary">edit_note</span>
                    <span>Cập Nhật Thông Tin Cá Nhân</span>
                  </h3>
                  <span className="text-[11px] text-on-surface-variant italic">
                    * Mọi thay đổi sẽ được cập nhật ngay lập tức
                  </span>
                </div>

                {formError && (
                  <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
                    <span className="material-symbols-outlined text-sm shrink-0">error</span>
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">
                        Họ và Tên <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        placeholder="Nhập họ và tên đầy đủ"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-theme-surface border border-theme-border text-on-surface text-xs font-medium focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                        disabled={isSaving}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-on-surface mb-1.5">
                        Số Điện Thoại Nhận Hàng
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Ví dụ: 0988123456"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-theme-surface border border-theme-border text-on-surface text-xs font-medium focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-on-surface mb-1.5">
                      Địa Chỉ Email (Tài khoản)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={displayEmail}
                        disabled
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-theme-border text-on-surface-variant text-xs font-medium cursor-not-allowed opacity-80"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Đã xác thực
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-theme-surface hover:bg-theme-bg border border-theme-border text-on-surface text-xs font-semibold transition-all cursor-pointer"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2 rounded-xl bg-theme-primary text-white text-xs font-bold hover:bg-theme-primary-hover transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Đang Lưu...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-base">check</span>
                          <span>Lưu Thay Đổi</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Metrics Ribbon */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-theme-surface-subtle rounded-2xl border border-theme-border">
              <Link
                href="/orders"
                className="px-3 py-2 flex items-center gap-3 hover:bg-theme-surface rounded-xl transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">receipt_long</span>
                </div>
                <div>
                  <div className="font-bold text-xs text-on-surface leading-tight">Lịch Sử Đơn Hàng</div>
                  <div className="text-[11px] text-on-surface-variant font-medium">Theo dõi tiến trình</div>
                </div>
              </Link>

              <div className="px-3 py-2 flex items-center gap-3 sm:border-l sm:border-theme-border">
                <div className="w-9 h-9 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">menu_book</span>
                </div>
                <div>
                  <div className="font-bold text-base text-on-surface leading-tight">0</div>
                  <div className="text-[11px] text-on-surface-variant font-medium">Sách trong tủ</div>
                </div>
              </div>

              <div className="px-3 py-2 flex items-center gap-3 border-l border-theme-border opacity-60" aria-disabled="true">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">local_fire_department</span>
                </div>
                <div>
                  <div className="font-bold text-base text-amber-600 leading-tight">—</div>
                  <div className="text-[11px] text-on-surface-variant font-medium">Chuỗi đọc · Sắp ra mắt</div>
                </div>
              </div>

              <div className="px-3 py-2 flex items-center gap-3 border-l border-theme-border opacity-60" aria-disabled="true">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">savings</span>
                </div>
                <div>
                  <div className="font-bold text-base text-on-surface leading-tight">—</div>
                  <div className="text-[11px] text-on-surface-variant font-medium">Ví đọc sách · Sắp ra mắt</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 border-b border-theme-border text-xs">
          {[
            { id: 'overview' as const, label: 'Tổng Quan', icon: 'dashboard', deferred: false },
            { id: 'library' as const, label: 'Tủ Sách Cá Nhân', icon: 'shelves', deferred: false },
            { id: 'posts' as const, label: 'Bài Viết', icon: 'article', deferred: true },
            { id: 'reviews' as const, label: 'Đánh Giá & Nhận Xét', icon: 'rate_review', deferred: true },
            { id: 'quotes' as const, label: 'Trích Dẫn Yêu Thích', icon: 'format_quote', deferred: true },
            { id: 'activity' as const, label: 'Hoạt Động Đọc', icon: 'timeline', deferred: true },
            { id: 'clubs' as const, label: 'CLB Đang Tham Gia', icon: 'groups', deferred: true },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.deferred && setActiveTab(tab.id)}
              disabled={tab.deferred}
              aria-disabled={tab.deferred}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-theme-primary text-white shadow-xs'
                  : `bg-theme-surface text-on-surface-variant border border-theme-border ${
                      tab.deferred ? 'opacity-55 cursor-not-allowed pointer-events-none' : 'hover:text-on-surface'
                    }`
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        <div className="space-y-6 pb-12">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-8 bg-theme-surface rounded-3xl border border-theme-border p-6 sm:p-8 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-editorial text-lg font-bold text-on-surface">Hoạt Động Đọc Sách Gần Đây</h3>
                  <Link href="/orders" className="text-xs font-bold text-theme-primary hover:underline flex items-center gap-1">
                    <span>Xem tất cả đơn hàng</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
                <div className="py-12 text-center text-on-surface-variant">
                  <span className="material-symbols-outlined text-4xl text-theme-primary/30 mb-2 block">auto_stories</span>
                  <p className="font-semibold text-xs text-on-surface">Chưa Có Hoạt Động Đọc Sách Nào</p>
                  <p className="text-[11px] text-on-surface-variant mt-1 mb-4">
                    Mở một cuốn sách điện tử hoặc mua sách in trên sàn để bắt đầu ghi lại hành trình đọc.
                  </p>
                  <Link
                    href="/books"
                    className="bg-theme-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-theme-primary-hover transition-all shadow-xs inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">explore</span>
                    <span>Khám Phá Sách Ngay</span>
                  </Link>
                </div>
              </div>

              <div className="md:col-span-4 space-y-6">
                <div
                  className="bg-theme-surface rounded-3xl border border-theme-border p-6 shadow-xs pointer-events-none opacity-60"
                  aria-disabled="true"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-editorial text-base font-bold text-on-surface flex items-center gap-2">
                      <span className="material-symbols-outlined text-theme-primary">emoji_events</span>
                      Thử Thách Đọc 2026
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-theme-surface-subtle">Sắp ra mắt</span>
                  </div>
                  <div className="h-2 rounded-full bg-theme-bg overflow-hidden">
                    <div className="h-full w-0 bg-theme-primary" />
                  </div>
                  <p className="text-xs text-on-surface-variant mt-3">
                    Tiến độ, chuỗi đọc và huy hiệu sẽ được mở khi tính năng Reader hoạt động.
                  </p>
                </div>

                <div className="bg-theme-surface rounded-3xl border border-theme-border p-6 shadow-xs">
                  <h4 className="font-editorial text-base font-bold text-on-surface mb-3">Lối Tắt Tiện Ích</h4>
                  <div className="space-y-2 text-xs">
                    <Link
                      href="/orders"
                      className="flex items-center justify-between p-3 rounded-xl bg-theme-surface-subtle hover:bg-theme-secondary-subtle transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-theme-primary">receipt_long</span>
                        <span className="font-semibold">Quản Lý Đơn Hàng</span>
                      </div>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>

                    <Link
                      href="/profile/addresses"
                      className="flex items-center justify-between p-3 rounded-xl bg-theme-surface-subtle hover:bg-theme-secondary-subtle transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-theme-primary">location_on</span>
                        <span className="font-semibold">Sổ Địa Chỉ Giao Hàng</span>
                      </div>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>

                    <Link
                      href="/cart"
                      className="flex items-center justify-between p-3 rounded-xl bg-theme-surface-subtle hover:bg-theme-secondary-subtle transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base text-theme-primary">shopping_cart</span>
                        <span className="font-semibold">Giỏ Hàng Của Bạn</span>
                      </div>
                      <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'library' && (
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-10 sm:p-14 text-center shadow-xs">
              <span className="material-symbols-outlined text-4xl text-theme-primary/30 mb-2 block">shelves</span>
              <h3 className="font-editorial text-xl font-bold text-on-surface mb-1">Tủ Sách Đang Trống</h3>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-6">
                Bạn chưa mua cuốn sách nào. Mọi ấn phẩm Ebook bản quyền DRM bạn sở hữu sẽ xuất hiện tại đây.
              </p>
              <Link
                href="/books"
                className="bg-theme-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-theme-primary-hover transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">explore</span>
                <span>Tìm Sách Ngay</span>
              </Link>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-10 sm:p-14 text-center shadow-xs">
              <span className="material-symbols-outlined text-4xl text-theme-primary/30 mb-2 block">rate_review</span>
              <h3 className="font-editorial text-xl font-bold text-on-surface mb-1">Chưa Có Bài Đánh Giá Nào</h3>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-6">
                Sau khi đọc xong các tác phẩm, bạn có thể để lại nhận xét sâu để chia sẻ cảm nhận với cộng đồng bạn đọc.
              </p>
              <Link
                href="/books"
                className="bg-theme-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-theme-primary-hover transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">menu_book</span>
                <span>Khám Phá Sách Để Đánh Giá</span>
              </Link>
            </div>
          )}

          {activeTab === 'quotes' && (
            <div className="bg-theme-surface rounded-3xl border border-theme-border p-10 sm:p-14 text-center shadow-xs">
              <span className="material-symbols-outlined text-4xl text-theme-primary/30 mb-2 block">format_quote</span>
              <h3 className="font-editorial text-xl font-bold text-on-surface mb-1">Chưa Có Trích Dẫn Nào</h3>
              <p className="text-xs text-on-surface-variant max-w-md mx-auto mb-6">
                Khi đọc sách trên HUKI Reader, bạn có thể bôi đen các câu văn hay để lưu vào kho trích dẫn tâm đắc của mình.
              </p>
              <Link
                href="/books"
                className="bg-theme-primary text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-theme-primary-hover transition-all shadow-xs inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">auto_stories</span>
                <span>Đọc Sách Ngay</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
