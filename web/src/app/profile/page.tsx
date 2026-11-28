'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import AccountLayout from '@/ui/components/layout/AccountLayout';
import UserAvatar from '@/ui/components/common/UserAvatar';
import { businessApi, BusinessData } from '@/ui/api/businessApi';

export default function ProfilePage() {
  const { user, updateUserProfile } = useAuth();
  const { showToast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [formError, setFormError] = useState('');
  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [loadingBusiness, setLoadingBusiness] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: user?.fullName || user?.name || '',
    phone: user?.phone || '',
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra định dạng
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Định dạng ảnh không hỗ trợ. Vui lòng chọn .JPEG, .PNG hoặc .WEBP', 'error');
      return;
    }

    // Kiểm tra dung lượng (tối đa 2MB)
    if (file.size > 2 * 1024 * 1024) {
      showToast('Dung lượng ảnh vượt quá 2 MB. Vui lòng chọn ảnh nhẹ hơn', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Url = reader.result as string;
        try {
          const res = await updateUserProfile({ avatar: base64Url });
          if (res.success) {
            showToast('Cập nhật ảnh đại diện thành công!', 'success');
          } else {
            showToast(res.error?.message || 'Không thể lưu ảnh đại diện.', 'error');
          }
        } catch {
          showToast('Lỗi máy chủ khi cập nhật ảnh đại diện.', 'error');
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      reader.onerror = () => {
        showToast('Không thể đọc file ảnh.', 'error');
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      showToast('Có lỗi xảy ra khi xử lý ảnh.', 'error');
      setIsUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || user.name || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Load business info for seller status
  useEffect(() => {
    const loadBusiness = async () => {
      if (!user) return;
      setLoadingBusiness(true);
      try {
        const res = await businessApi.getMyBusiness();
        if (res.success && res.data) {
          const b = (res.data as any)?.data || res.data;
          setBusiness(b);
        }
      } catch (err) {
        console.error('Error loading business:', err);
      } finally {
        setLoadingBusiness(false);
      }
    };
    loadBusiness();
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
        setIsEditing(false);
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
        <div className="border-b border-gray-100 pb-5 mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hồ Sơ Của Tôi</h1>
            <p className="text-xs text-gray-500 mt-1">
              Quản lý thông tin cá nhân và bảo mật tài khoản độc giả HUKI
            </p>
          </div>

          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-2 rounded-xl border border-gray-200 bg-white hover:border-[#003B2B] hover:bg-emerald-50/40 text-xs font-bold text-gray-700 hover:text-[#003B2B] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>Chỉnh sửa</span>
            </button>
          )}
        </div>

        {formError && (
          <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-8">
          
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
                disabled={!isEditing}
                placeholder="Nhập họ và tên đầy đủ"
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition-all font-medium ${
                  isEditing
                    ? 'bg-white border-gray-300 text-gray-900 focus:outline-none focus:border-[#003B2B] focus:ring-1 focus:ring-[#003B2B]'
                    : 'bg-gray-50 border-gray-200 text-gray-700 cursor-default'
                }`}
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
                disabled={!isEditing}
                placeholder="Ví dụ: 0988123456"
                className={`w-full px-3.5 py-2.5 border rounded-xl text-xs transition-all font-medium ${
                  isEditing
                    ? 'bg-white border-gray-300 text-gray-900 focus:outline-none focus:border-[#003B2B] focus:ring-1 focus:ring-[#003B2B]'
                    : 'bg-gray-50 border-gray-200 text-gray-700 cursor-default'
                }`}
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

            {/* Seller Status - Hiển thị trạng thái đăng ký seller */}
            {user?.hasApprovedBusiness && (
              <div className="space-y-2">
                <label className="font-bold text-gray-700 block">
                  Trạng Thái Đăng Ký Nhà Bán Hàng
                </label>
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl text-emerald-600">storefront</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-emerald-900 text-sm">
                          {business?.name || 'Đối tác Nhà Bán Hàng HUKI'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase">
                          {business?.status === 'APPROVED' ? 'Đã duyệt' : business?.status === 'PENDING_APPROVAL' ? 'Chờ duyệt' : business?.status || '—'}
                        </span>
                      </div>
                      {business?.stores?.[0] && (
                        <p className="text-xs text-emerald-700">
                          Cửa hàng: <strong>{business.stores[0].name}</strong>
                        </p>
                      )}
                      <Link
                        href="/seller/business"
                        className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-700 hover:text-emerald-900 font-semibold hover:underline"
                      >
                        <span>Xem chi tiết hồ sơ doanh nghiệp</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nếu đã gửi đơn nhưng chưa duyệt */}
            {business && business.status === 'PENDING_APPROVAL' && !user?.hasApprovedBusiness && (
              <div className="space-y-2">
                <label className="font-bold text-gray-700 block">
                  Trạng Thái Đăng Ký Nhà Bán Hàng
                </label>
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl text-amber-600">hourglass_empty</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-amber-900 text-sm">
                          {business.name || 'Hồ sơ đã gửi'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase">
                          Đang chờ duyệt
                        </span>
                      </div>
                      <p className="text-xs text-amber-700 mb-2">
                        Hồ sơ đang được Ban thẩm định HUKI xử lý. Thời gian phê duyệt: 24-48h.
                      </p>
                      <Link
                        href="/seller/pending"
                        className="inline-flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-semibold hover:underline"
                      >
                        <span>Xem trạng thái chờ duyệt</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Nếu chưa đăng ký seller */}
            {!business && (
              <div className="space-y-2">
                <label className="font-bold text-gray-700 block">
                  Trạng Thái Đăng Ký Nhà Bán Hàng
                </label>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl text-slate-400">store</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-600 mb-2">
                        Bạn chưa đăng ký trở thành Nhà Bán Hàng trên HUKI.
                      </p>
                      <Link
                        href="/seller/register"
                        className="inline-flex items-center gap-1 text-xs text-[#003B2B] hover:text-[#00281d] font-semibold hover:underline"
                      >
                        <span>Đăng ký ngay</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button (Only when editing) */}
            {isEditing && (
              <div className="pt-2 flex items-center gap-2.5">
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
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setFormData({
                      fullName: user?.fullName || user?.name || '',
                      phone: user?.phone || '',
                    });
                    setFormError('');
                    setIsEditing(false);
                  }}
                  className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Avatar Preview (4 cols) */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center p-6 bg-gray-50/70 border border-gray-200/80 rounded-2xl text-center space-y-4">
            <UserAvatar user={user} size="xl" className="w-24 h-24 shadow-sm" />
            
            <div>
              <span className="font-bold text-sm text-gray-900 block">{displayName}</span>
              <span className="text-[11px] text-gray-400 block mt-0.5">{displayEmail}</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="px-4 py-2 bg-white border border-gray-300 hover:border-[#003B2B] text-gray-700 hover:text-[#003B2B] font-bold rounded-xl text-xs transition-colors shadow-2xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            >
              {isUploadingAvatar ? (
                <>
                  <span className="inline-block w-3.5 h-3.5 border-2 border-[#003B2B]/30 border-t-[#003B2B] rounded-full animate-spin"></span>
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">upload</span>
                  <span>Chọn Ảnh Đại Diện</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-gray-400 leading-relaxed">
              Dung lượng tối đa 2 MB<br />Định dạng hỗ trợ: .JPEG, .PNG, .WEBP
            </p>
          </div>
        </form>

        <FollowedStoresAndAuthorsSection />
      </div>
    </AccountLayout>
  );
}

function FollowedStoresAndAuthorsSection() {
  const [favorites, setFavorites] = useState<Array<{ id: string; name: string; title?: string; avatar?: string }>>([]);
  const [followedStores, setFollowedStores] = useState<Array<{ id: string; name: string; slug?: string; logo?: string }>>([]);

  useEffect(() => {
    const loadAuthors = () => {
      try {
        const raw = localStorage.getItem('huki_favorite_authors');
        const map = raw ? JSON.parse(raw) : {};
        setFavorites(Object.values(map));
      } catch {
        setFavorites([]);
      }
    };

    const loadStores = async () => {
      try {
        const { businessApi } = await import('@/ui/api/businessApi');
        const res = await businessApi.getMyFollowedBusinesses();
        if (res?.success && Array.isArray(res.data)) {
          setFollowedStores(
            res.data.map((r: any) => {
              const biz = r.business || r;
              const store = Array.isArray(biz.stores) && biz.stores.length > 0 ? biz.stores[0] : null;
              return {
                id: biz.id || r.id,
                name: store?.name || biz.name || 'Gian hàng HuKi',
                slug: store?.slug || biz.slug,
                logo: store?.logo || biz.logo || undefined,
              };
            })
          );
          return;
        }
      } catch {
        // fallback below
      }
      setFollowedStores([]);
    };

    loadAuthors();
    loadStores();
    window.addEventListener('huki_favorite_authors_updated', loadAuthors);
    window.addEventListener('huki_followed_stores_updated', loadStores);
    window.addEventListener('storage', loadAuthors);
    return () => {
      window.removeEventListener('huki_favorite_authors_updated', loadAuthors);
      window.removeEventListener('huki_followed_stores_updated', loadStores);
      window.removeEventListener('storage', loadAuthors);
    };
  }, []);

  const removeFavoriteAuthor = (id: string) => {
    try {
      const raw = localStorage.getItem('huki_favorite_authors');
      const map = raw ? JSON.parse(raw) : {};
      delete map[id];
      localStorage.setItem('huki_favorite_authors', JSON.stringify(map));
      setFavorites(Object.values(map));
      window.dispatchEvent(new Event('huki_favorite_authors_updated'));
    } catch { }
  };

  const unfollowStore = async (id: string, slug?: string) => {
    setFollowedStores((prev) => prev.filter((s) => s.id !== id));
    try {
      const raw = localStorage.getItem('huki_followed_stores');
      const map = raw ? JSON.parse(raw) : {};
      delete map[id];
      if (slug) delete map[slug];
      localStorage.setItem('huki_followed_stores', JSON.stringify(map));
      window.dispatchEvent(new Event('huki_followed_stores_updated'));
    } catch { }
    try {
      const { businessApi } = await import('@/ui/api/businessApi');
      await businessApi.unfollowBusiness(id);
    } catch { }
  };

  return (
    <div className="pt-6 border-t border-gray-100 space-y-6">
      {/* Gian hàng đang theo dõi */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#006953] text-[20px]">storefront</span>
              <span>Gian Hàng Đang Theo Dõi ({followedStores.length})</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Sách từ các gian hàng bạn theo dõi sẽ được ưu tiên hiển thị trong mục Gợi ý cho bạn
            </p>
          </div>
          <Link
            href="/stores"
            className="text-xs font-semibold text-[#006953] hover:underline whitespace-nowrap"
          >
            Xem gian hàng →
          </Link>
        </div>

        {followedStores.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 text-center space-y-2">
            <p className="text-xs text-gray-500">Bạn chưa theo dõi gian hàng nào.</p>
            <Link
              href="/stores"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#003B2B] text-white text-xs font-semibold hover:bg-[#00281d] transition-colors"
            >
              <span>Khám phá gian hàng</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {followedStores.map((store) => (
              <div
                key={store.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-[#006953]/40 transition-colors"
              >
                <Link
                  href={`/shop/${store.slug || store.id}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group"
                >
                  {store.logo ? (
                    <img
                      src={store.logo}
                      alt={store.name}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#003B2B] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {store.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 group-hover:text-[#006953] truncate">
                      {store.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">Xem gian hàng</div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => unfollowStore(store.id, store.slug)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                >
                  Bỏ theo dõi
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tác giả yêu thích */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-500 text-[20px]">favorite</span>
              <span>Tác Giả Yêu Thích ({favorites.length})</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Bấm vào tác giả để lọc nhanh toàn bộ sách của họ và ưu tiên hiện trong mục Gợi ý cho bạn
            </p>
          </div>
          <Link
            href="/stores?tab=authors"
            className="text-xs font-semibold text-[#006953] hover:underline whitespace-nowrap"
          >
            Khám phá tác giả →
          </Link>
        </div>

        {favorites.length === 0 ? (
          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 text-center space-y-2">
            <p className="text-xs text-gray-500">Bạn chưa lưu tác giả yêu thích nào.</p>
            <Link
              href="/stores?tab=authors"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-[#003B2B] text-white text-xs font-semibold hover:bg-[#00281d] transition-colors"
            >
              <span>Tìm tác giả yêu thích</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favorites.map((author) => (
              <div
                key={author.id}
                className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 bg-white hover:border-[#006953]/40 transition-colors"
              >
                <Link
                  href={`/books?author=${encodeURIComponent(author.name)}`}
                  className="flex items-center gap-3 min-w-0 flex-1 group"
                >
                  {author.avatar ? (
                    <img
                      src={author.avatar}
                      alt={author.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#003B2B] text-white font-bold text-sm flex items-center justify-center shrink-0">
                      {author.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 group-hover:text-[#006953] truncate">
                      {author.name}
                    </div>
                    <div className="text-[11px] text-gray-500 truncate">
                      {author.title || 'Xem sách của tác giả'}
                    </div>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => removeFavoriteAuthor(author.id)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                  title="Bỏ khỏi danh sách yêu thích"
                  aria-label={`Bỏ thích ${author.name}`}
                >
                  <span className="material-symbols-outlined text-[18px]">heart_minus</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
