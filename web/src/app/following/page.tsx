'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { businessApi, type FollowedBusinessItem } from '@/ui/api/businessApi';

export default function FollowingPage() {
  const { user, isLoggedIn } = useAuth();
  const { showToast } = useToast();

  const [followedItems, setFollowedItems] = useState<FollowedBusinessItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown & Modal states
  const [activeDropdownStoreId, setActiveDropdownStoreId] = useState<string | null>(null);
  const [storeToUnfollow, setStoreToUnfollow] = useState<{ id: string; name: string } | null>(null);
  const [unfollowCountdown, setUnfollowCountdown] = useState(5);
  const [isUnfollowing, setIsUnfollowing] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setActiveDropdownStoreId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch followed stores
  const fetchFollowed = async () => {
    if (!isLoggedIn) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await businessApi.getMyFollowedBusinesses();
      if (res.success && Array.isArray(res.data)) {
        setFollowedItems(res.data);
      } else {
        setFollowedItems([]);
      }
    } catch (err) {
      console.warn('Could not fetch followed stores:', err);
      setFollowedItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowed();
  }, [isLoggedIn]);

  // Handle countdown for unfollow modal
  useEffect(() => {
    if (!storeToUnfollow) {
      setUnfollowCountdown(5);
      return undefined;
    }

    setUnfollowCountdown(5);
    const interval = window.setInterval(() => {
      setUnfollowCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [storeToUnfollow]);

  // Confirm unfollow
  const handleConfirmUnfollow = async () => {
    if (!storeToUnfollow || unfollowCountdown > 0) return;
    setIsUnfollowing(true);
    try {
      const res = await businessApi.unfollowBusiness(storeToUnfollow.id);
      if (res.success) {
        showToast(`Đã hủy theo dõi gian hàng ${storeToUnfollow.name}`, 'info');
        setFollowedItems((prev) => prev.filter((item) => item.business.id !== storeToUnfollow.id));
      } else {
        showToast(res.error?.message || 'Không thể hủy theo dõi. Vui lòng thử lại!', 'error');
      }
    } catch {
      showToast('Có lỗi xảy ra khi hủy theo dõi.', 'error');
    } finally {
      setIsUnfollowing(false);
      setStoreToUnfollow(null);
      setActiveDropdownStoreId(null);
    }
  };

  // Filter items by search query
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return followedItems;
    const q = searchQuery.toLowerCase().trim();
    return followedItems.filter((item) => {
      const b = item.business;
      return (
        b.name?.toLowerCase().includes(q) ||
        b.slug?.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
      );
    });
  }, [followedItems, searchQuery]);

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 font-sans">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex items-center gap-2 mb-6">
        <Link href="/" className="hover:text-[#006953] transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">home</span>
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-gray-400">Sàn thương mại sách</span>
        <span>/</span>
        <span className="text-[#006953] font-semibold">Gian hàng đang theo dõi</span>
      </nav>

      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#003b2b] via-[#00523c] to-[#006953] rounded-3xl p-6 sm:p-10 text-white shadow-sm mb-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-emerald-300 uppercase tracking-wider mb-3">
            <span className="material-symbols-outlined text-sm">favorite</span>
            <span>Bộ Sưu Tập Gian Hàng Của Bạn</span>
          </div>
          <h1 className="font-editorial text-2xl sm:text-4xl font-bold tracking-tight mb-2 text-white">
            Gian Hàng Đang Theo Dõi
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed">
            Danh sách các Nhà xuất bản, Đơn vị phát hành và Tác giả đối tác chính hãng bạn đang quan tâm. Nhận thông báo sách mới phát hành và voucher ưu đãi sớm nhất.
          </p>
        </div>
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-800">
            Tổng cộng: <span className="text-[#006953]">{followedItems.length}</span> gian hàng
          </span>
        </div>

        <div className="w-full sm:w-80 relative">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm gian hàng đã theo dõi..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#006953] focus:ring-1 focus:ring-[#006953] shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <span className="inline-block w-8 h-8 border-3 border-[#006953]/20 border-t-[#006953] rounded-full animate-spin mb-3"></span>
          <p className="text-xs text-gray-500 font-medium">Đang tải danh sách gian hàng...</p>
        </div>
      ) : !isLoggedIn ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#006953] flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">lock</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">Đăng Nhập Để Xem Gian Hàng Đang Theo Dõi</h3>
          <p className="text-xs text-gray-500 mb-6">
            Vui lòng đăng nhập tài khoản HUKI để quản lý và theo dõi các gian hàng bạn yêu thích.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white text-xs sm:text-sm font-bold transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">login</span>
            Đăng Nhập Ngay
          </Link>
        </div>
      ) : filteredStores.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">favorite_border</span>
          </div>
          <h3 className="font-bold text-gray-900 text-lg mb-2">
            {searchQuery ? 'Không Tìm Thấy Gian Hàng Nào' : 'Chưa Theo Dõi Gian Hàng Nào'}
          </h3>
          <p className="text-xs text-gray-500 mb-6">
            {searchQuery
              ? `Không có gian hàng nào khớp với từ khóa "${searchQuery}". Vui lòng thử tìm kiếm khác.`
              : 'Hãy khám phá các Nhà xuất bản và Gian hàng chính hãng trên HUKI để nhận cập nhật sách mới nhất.'}
          </p>
          <Link
            href="/stores"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#006953] hover:bg-[#00523c] text-white text-xs sm:text-sm font-bold transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">storefront</span>
            Khám Phá Gian Hàng NXB
          </Link>
        </div>
      ) : (
        /* Store Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" ref={dropdownRef}>
          {filteredStores.map((item) => {
            const b = item.business;
            const legacyStore = b.stores?.[0];
            const logoImg = b.logo || legacyStore?.logo;
            const bannerImg =
              b.banner ||
              legacyStore?.banner ||
              'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80';
            const shopTarget = b.slug || legacyStore?.slug || b.id;
            const isDropdownOpen = activeDropdownStoreId === b.id;

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
              >
                {/* Banner */}
                <div
                  className="h-28 w-full relative bg-cover bg-center"
                  style={{ backgroundImage: `url('${bannerImg}')` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  <span className="absolute top-3 right-3 px-2.5 py-0.5 bg-[#006953] text-white text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-xs">verified</span>
                    Official
                  </span>
                </div>

                {/* Body & Profile */}
                <div className="p-5 pt-0 flex-1 flex flex-col relative">
                  {/* Avatar overlapping banner */}
                  <div className="flex items-end justify-between -mt-8 mb-3">
                    <div className="relative w-16 h-16 rounded-2xl bg-white border-2 border-white shadow-md flex items-center justify-center overflow-hidden shrink-0">
                      {logoImg ? (
                        <img src={logoImg} alt={b.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#003b2b] text-white font-black text-2xl flex items-center justify-center">
                          {b.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-amber-500 text-sm fill-current">star</span>
                      <strong className="text-gray-800">4.9</strong>
                      <span className="text-gray-400">• Đang theo dõi</span>
                    </span>
                  </div>

                  {/* Title & Description */}
                  <Link
                    href={`/shop/${shopTarget}`}
                    className="font-bold text-base text-gray-900 hover:text-[#006953] transition-colors truncate block mb-1"
                  >
                    {b.name}
                  </Link>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-1">
                    {b.description || legacyStore?.description || 'Gian hàng sách và đối tác bản quyền chính hãng tại HUKI.'}
                  </p>

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex items-center gap-2 relative">
                    <Link
                      href={`/shop/${shopTarget}`}
                      className="flex-1 px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border border-gray-200"
                    >
                      <span className="material-symbols-outlined text-sm">storefront</span>
                      Xem Gian Hàng
                    </Link>

                    {/* Following Button with Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() =>
                          setActiveDropdownStoreId(isDropdownOpen ? null : b.id)
                        }
                        className="px-3 py-2 rounded-xl bg-[#006953]/10 hover:bg-[#006953]/15 text-[#006953] text-xs font-bold transition-colors flex items-center justify-center gap-1 border border-[#006953]/30 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        <span>Đang theo dõi</span>
                        <span className="material-symbols-outlined text-xs">expand_more</span>
                      </button>

                      {/* Dropdown Menu */}
                      {isDropdownOpen && (
                        <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 z-40 animate-in fade-in zoom-in-95 duration-100">
                          {/* Option 1: Nhắn tin (disabled) */}
                          <div
                            className="w-full px-3 py-2 rounded-lg text-xs font-medium text-gray-400 flex items-center justify-between cursor-not-allowed select-none bg-gray-50/50 mb-1"
                            title="Chức năng nhắn tin đang được phát triển"
                          >
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-gray-400">chat</span>
                              <span>Nhắn tin</span>
                            </div>
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">
                              Sắp ra mắt
                            </span>
                          </div>

                          {/* Option 2: Hủy theo dõi */}
                          <button
                            onClick={() => {
                              setActiveDropdownStoreId(null);
                              setStoreToUnfollow({ id: b.id, name: b.name });
                            }}
                            className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer text-left"
                          >
                            <span className="material-symbols-outlined text-sm text-rose-600">person_remove</span>
                            <span>Hủy theo dõi</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Popup Xác Nhận Hủy Theo Dõi (Đếm ngược 5s) */}
      {storeToUnfollow && (
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Icon Warning */}
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-100">
              <span className="material-symbols-outlined text-2xl">person_remove</span>
            </div>

            {/* Title & Body */}
            <h3 className="font-bold text-center text-gray-900 text-lg mb-2">
              Xác Nhận Hủy Theo Dõi Gian Hàng
            </h3>
            <p className="text-xs sm:text-sm text-center text-gray-600 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn hủy theo dõi gian hàng{' '}
              <strong className="text-gray-900">{storeToUnfollow.name}</strong> không? Bạn sẽ không còn nhận được các thông báo cập nhật sách mới và ưu đãi độc quyền từ gian hàng này.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStoreToUnfollow(null)}
                disabled={isUnfollowing}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Đóng / Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmUnfollow}
                disabled={unfollowCountdown > 0 || isUnfollowing}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                  unfollowCountdown > 0 || isUnfollowing
                    ? 'bg-gray-400 cursor-not-allowed opacity-80'
                    : 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                }`}
              >
                {isUnfollowing ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Đang xử lý...</span>
                  </>
                ) : unfollowCountdown > 0 ? (
                  <>
                    <span className="material-symbols-outlined text-sm">timer</span>
                    <span>Xác nhận ({unfollowCountdown}s)</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">check</span>
                    <span>Xác nhận hủy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
