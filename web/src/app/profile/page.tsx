'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import UserAvatar from '@/ui/components/common/UserAvatar';

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const { showToast } = useToast();

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
  const displayEmail = user?.email || 'Chưa cập nhật';
  const displayPhone = user?.phone || 'Chưa cập nhật';
  const roleLabel =
    user?.role === 'PLATFORM_ADMIN'
      ? 'Quản Trị Viên (Admin)'
      : user?.role === 'BUSINESS'
      ? 'Chủ Doanh Nghiệp / Nhà Xuất Bản'
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
        showToast('Cập nhật hồ sơ cá nhân thành công!', 'success');
      } else {
        const msg = res.error?.message || (typeof res.error === 'string' ? res.error : 'Không thể cập nhật hồ sơ.');
        setFormError(msg);
        showToast(msg, 'error');
      }
    } catch {
      const msg = 'Lỗi kết nối máy chủ khi cập nhật hồ sơ.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AccountLayout>
      <div className="p-6 sm:p-8">
        {/* Title Header */}
        <div className="border-b border-gray-100 pb-5 mb-6">
          <h1 className="text-xl font-bold text-gray-900">Hồ Sơ Của Tôi</h1>
          <p className="text-xs text-gray-500 mt-1">
            Quản lý thông tin cá nhân và bảo mật tài khoản độc giả HUKI
          </p>
        </div>

        {formError && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Form Fields (8 cols) */}
          <div className="lg:col-span-8 space-y-5 text-xs">
            
            {/* Họ và tên */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 block">
                Họ và Tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Nhập họ và tên đầy đủ"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#003B2B] focus:ring-1 focus:ring-[#003B2B] transition-all text-gray-900 font-medium"
                required
              />
            </div>

            {/* Email (Readonly with Verified Badge) */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 block">
                Địa Chỉ Email Đăng Nhập
              </label>
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl">
                <span className="text-gray-900 font-medium">{displayEmail}</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  Đã xác thực
                </span>
              </div>
            </div>

            {/* Số điện thoại */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 block">
                Số Điện Thoại Nhận Sách
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Ví dụ: 0988123456"
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs focus:outline-none focus:border-[#003B2B] focus:ring-1 focus:ring-[#003B2B] transition-all text-gray-900 font-medium"
              />
            </div>

            {/* Vai trò tài khoản */}
            <div className="space-y-1.5">
              <label className="font-bold text-gray-700 block">
                Loại Tài Khoản
              </label>
              <div className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#003B2B]">shield_person</span>
                <span>{roleLabel}</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#003B2B] hover:bg-[#00241A] text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
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
          </div>

          {/* Right Column: Avatar Preview (4 cols) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-center space-y-4">
            <UserAvatar user={user} size="xl" className="w-24 h-24 shadow-sm" />
            
            <div>
              <span className="font-bold text-sm text-gray-900 block">{displayName}</span>
              <span className="text-[11px] text-gray-400 block mt-0.5">{displayEmail}</span>
            </div>

            <button
              type="button"
              onClick={() => showToast('Mở trình chọn ảnh đại diện từ máy tính', 'info')}
              className="px-4 py-2 bg-white border border-gray-300 hover:border-[#003B2B] text-gray-700 hover:text-[#003B2B] font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer"
            >
              Chọn Ảnh Đại Diện
            </button>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Dung lượng tối đa 2 MB<br />Định dạng hỗ trợ: .JPEG, .PNG, .WEBP
            </p>
          </div>
        </form>
      </div>
    </AccountLayout>
  );
}
