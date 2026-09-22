'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import BookCard, { type BookCardData } from '@/ui/components/common/BookCard';
import EmptyState from '@/ui/components/common/EmptyState';
import { businessApi, type BusinessData } from '@/ui/api/businessApi';
import { catalogApi, toCatalogBook, type BookData } from '@/ui/api/catalogApi';

export default function ShopPage() {
  const params = useParams();
  const businessSlugOrId = (params?.id as string) || '';
  const { showToast } = useToast();
  const { user, activeBusinessId } = useAuth();

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [realBooks, setRealBooks] = useState<BookData[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'new' | 'bestseller' | 'ebook' | 'physical' | 'hybrid'
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFollowed, setIsFollowed] = useState(false);
  const [isFollowDropdownOpen, setIsFollowDropdownOpen] = useState(false);
  const [isUnfollowModalOpen, setIsUnfollowModalOpen] = useState(false);
  const [unfollowCountdown, setUnfollowCountdown] = useState(5);
  const [isUnfollowing, setIsUnfollowing] = useState(false);
  const followDropdownRef = useRef<HTMLDivElement>(null);

  // Owner branding state
  const [isImageDropdownOpen, setIsImageDropdownOpen] = useState(false);
  const [activeImageModal, setActiveImageModal] = useState<'avatar' | 'banner' | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isApplyingImage, setIsApplyingImage] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener for image dropdown & follow dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsImageDropdownOpen(false);
      }
      if (followDropdownRef.current && !followDropdownRef.current.contains(event.target as Node)) {
        setIsFollowDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Check initial follow state
  useEffect(() => {
    if (user && business?.id) {
      businessApi
        .getMyFollowedBusinessIds()
        .then((res) => {
          if (res?.success && Array.isArray(res.data)) {
            setIsFollowed(res.data.includes(business.id));
          }
        })
        .catch(() => {});
    }
  }, [user, business?.id]);

  // Handle countdown for unfollow modal
  useEffect(() => {
    if (!isUnfollowModalOpen) {
      setUnfollowCountdown(5);
      return undefined;
    }
    setUnfollowCountdown(5);
    const timer = window.setInterval(() => {
      setUnfollowCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isUnfollowModalOpen]);

  const handleFollowStore = async () => {
    if (!user) {
      showToast('Vui lòng đăng nhập để theo dõi gian hàng!', 'warning');
      return;
    }
    if (!business?.id) return;

    try {
      const res = await businessApi.followBusiness(business.id);
      if (res?.success) {
        setIsFollowed(true);
        showToast(`Đã theo dõi gian hàng ${business.name}!`, 'success');
      } else {
        showToast(res?.error?.message || 'Không thể theo dõi gian hàng', 'error');
      }
    } catch {
      showToast('Có lỗi xảy ra khi theo dõi gian hàng', 'error');
    }
  };

  const handleConfirmUnfollow = async () => {
    if (unfollowCountdown > 0 || !business?.id) return;

    setIsUnfollowing(true);
    try {
      const res = await businessApi.unfollowBusiness(business.id);
      if (res?.success) {
        setIsFollowed(false);
        setIsFollowDropdownOpen(false);
        setIsUnfollowModalOpen(false);
        showToast(`Đã hủy theo dõi gian hàng ${business.name}!`, 'info');
      } else {
        showToast(res?.error?.message || 'Không thể hủy theo dõi', 'error');
      }
    } catch {
      showToast('Có lỗi xảy ra khi hủy theo dõi', 'error');
    } finally {
      setIsUnfollowing(false);
    }
  };

  // Check if current user is owner or manager of this business
  const isOwner = Boolean(
    user && business && (
      (user.business?.id && user.business.id === business.id) ||
      (user.business?.slug && user.business.slug.toLowerCase() === businessSlugOrId.toLowerCase()) ||
      (business.slug && business.slug.toLowerCase() === businessSlugOrId.toLowerCase() && user.business?.id === business.id) ||
      user.id === business.ownerId ||
      activeBusinessId === business.id
    )
  );

  // Xử lý chọn tệp từ máy trong modal
  const handleModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_SIZE) {
      showToast('Dung lượng ảnh vượt quá 2MB. Vui lòng chọn ảnh có dung lượng tối đa 2MB!', 'error');
      if (modalFileInputRef.current) modalFileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP).', 'error');
      if (modalFileInputRef.current) modalFileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Xử lý bấm Áp dụng cập nhật ảnh vào DB
  const handleApplyImage = async () => {
    if (!activeImageModal) return;
    setIsApplyingImage(true);
    try {
      const targetStoreId = business?.stores?.[0]?.id;
      const isDefault = previewImage === 'DEFAULT';
      const finalUrl = isDefault ? '' : (previewImage || '');

      if (activeImageModal === 'avatar') {
        if (targetStoreId) {
          await businessApi.updateStore(targetStoreId, { logo: finalUrl });
        }
        setBusiness((prev) =>
          prev
            ? {
                ...prev,
                logo: isDefault ? undefined : (finalUrl || prev.logo),
                stores: prev.stores?.length
                  ? prev.stores.map((s, idx) => (idx === 0 ? { ...s, logo: isDefault ? undefined : (finalUrl || s.logo) } : s))
                  : [{ id: targetStoreId || '1', name: prev.name, slug: prev.slug || '', logo: isDefault ? undefined : finalUrl }],
              }
            : null
        );
        showToast(isDefault ? 'Đã khôi phục ảnh đại diện mặc định!' : 'Cập nhật ảnh đại diện thành công!', 'success');
      } else {
        if (targetStoreId) {
          await businessApi.updateStore(targetStoreId, { banner: finalUrl });
        }
        setBusiness((prev) =>
          prev
            ? {
                ...prev,
                banner: isDefault ? undefined : (finalUrl || prev.banner),
                stores: prev.stores?.length
                  ? prev.stores.map((s, idx) => (idx === 0 ? { ...s, banner: isDefault ? undefined : (finalUrl || s.banner) } : s))
                  : [{ id: targetStoreId || '1', name: prev.name, slug: prev.slug || '', banner: isDefault ? undefined : finalUrl }],
              }
            : null
        );
        showToast(isDefault ? 'Đã khôi phục ảnh bìa mặc định!' : 'Cập nhật ảnh bìa gian hàng thành công!', 'success');
      }
      setActiveImageModal(null);
      setPreviewImage(null);
    } catch {
      showToast('Có lỗi khi cập nhật ảnh. Vui lòng thử lại!', 'error');
    } finally {
      setIsApplyingImage(false);
      if (modalFileInputRef.current) modalFileInputRef.current.value = '';
    }
  };

  const fetchBusinessData = useCallback(async () => {
    setIsLoadingStore(true);
    const identifier = businessSlugOrId || '';
    if (!identifier) {
      setBusiness(null);
      setIsLoadingStore(false);
      return;
    }
    try {
      let businessData: BusinessData | null = null;
      const res = await businessApi.getBusinessBySlug(identifier);
      if (res.success && res.data) {
        businessData = res.data;
      } else {
        const idRes = await businessApi.getBusinessById(identifier);
        if (idRes.success && idRes.data) {
          businessData = idRes.data;
        }
      }
      setBusiness(businessData || null);
    } catch {
      setBusiness(null);
    } finally {
      setIsLoadingStore(false);
    }
  }, [businessSlugOrId]);

  // Fetch Books from Commerce Backend
  useEffect(() => {
    fetchBusinessData();
  }, [fetchBusinessData]);

  useEffect(() => {
    if (!business?.id) return;
    catalogApi.getPublicBooks({ limit: 50, business: business.id })
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const owned = res.data.filter((book) =>
            book.businessId === business.id || !book.businessId
          );
          setRealBooks(owned);
        }
      })
      .catch(() => setRealBooks([]));
  }, [business]);

  const handleFollow = () => {
    setIsFollowed(prev => {
      const next = !prev;
      showToast(next ? `Đã theo dõi ${business?.name || 'doanh nghiệp'}!` : `Đã bỏ theo dõi.`, next ? 'success' : 'info');
      return next;
    });
  };

  // Format real books from DB and combine with store mocks
  const allStoreBooks: BookCardData[] = useMemo(() => {
    const formattedRealBooks: BookCardData[] = realBooks.map(rb => {
      const normalized = toCatalogBook(rb);
      const rawRb = rb as any;
      const priceVal = Number(rb.price !== undefined ? rb.price : rawRb.priceEbook || rawRb.pricePaper || 0);
      const originalPriceVal = Number(rb.originalPrice !== undefined ? rb.originalPrice : rawRb.originalPriceEbook || rawRb.originalPricePaper || 0);
      const hasEb = Boolean(rawRb.hasEbook || rawRb.priceEbook || rb.digitalDetails?.digitalEnabled);
      const hasPa = Boolean(rawRb.hasPaper || rawRb.pricePaper || rb.physicalDetails?.physicalEnabled);
      const fmt = (hasEb && hasPa) ? 'Combo' : hasEb ? 'Ebook' : 'Sách giấy';
      const fmtType = (hasEb && hasPa) ? 'hybrid' : hasEb ? 'ebook' : 'physical';

      let catSlug = 'selfhelp';
      if (rb.category) {
        const catStr = (typeof rb.category === 'object' ? rb.category.slug || rb.category.name : rb.category).toLowerCase();
        if (catStr.includes('kinh-te') || catStr.includes('business')) catSlug = 'business';
        else if (catStr.includes('cong-nghe') || catStr.includes('tech')) catSlug = 'technology';
        else if (catStr.includes('van-hoc') || catStr.includes('literature')) catSlug = 'literature';
      }

      return {
        ...normalized,
        id: rb.id,
        title: rb.title,
        author: (typeof rb.author === 'object' ? rb.author?.name : rb.author) || 'Tác giả HUKI',
        publisher: business?.name || normalized.publisher,
        category: catSlug,
        format: fmt,
        formatType: fmtType,
        price: priceVal,
        originalPrice: originalPriceVal > priceVal ? originalPriceVal : undefined,
        discount: (rb as any).discountPercent ? `-${(rb as any).discountPercent}%` : '',
        rating: Number((rb as any).rating || 5.0),
        sales: (rb as any).sales ? String((rb as any).sales) : '1.8k',
        cover: rb.coverUrl || rb.coverImage || '',
        isMock: false,
      };
    });

    return formattedRealBooks;
  }, [realBooks, business]);

  // Filter books by tabs & search
  const filteredBooks = useMemo(() => {
    return allStoreBooks.filter(book => {
      if (activeTab === 'ebook' && book.formatType !== 'ebook') return false;
      if (activeTab === 'physical' && book.formatType !== 'physical') return false;
      if (activeTab === 'hybrid' && book.formatType !== 'hybrid') return false;
      if (activeTab === 'bestseller' && (book.rating || 0) < 4.85) return false;
      if (activeCategory !== 'all' && (book as any).category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const auth = typeof book.author === 'string' ? book.author : book.author?.name || '';
        return book.title.toLowerCase().includes(q) || auth.toLowerCase().includes(q);
      }
      return true;
    });
  }, [allStoreBooks, activeTab, activeCategory, searchQuery]);

  const legacyProfile = business?.stores?.[0];
  const bannerImg = business?.banner || legacyProfile?.banner || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80';

  if (isLoadingStore) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <span className="inline-block w-8 h-8 border-3 border-theme-primary/20 border-t-theme-primary rounded-full animate-spin mb-3"></span>
          <p className="text-xs text-on-surface-variant font-medium">Đang tải gian hàng...</p>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="bg-theme-surface rounded-3xl border border-theme-border p-12 max-w-lg mx-auto shadow-xs">
          <span className="material-symbols-outlined text-5xl text-theme-primary/30 mb-3 block">storefront</span>
          <h2 className="font-editorial text-2xl font-bold text-on-surface mb-2">Không Tìm Thấy Doanh Nghiệp</h2>
          <p className="text-xs sm:text-sm text-on-surface-variant mb-6">Doanh nghiệp này chưa được phê duyệt hoặc đã tạm ngừng hoạt động.</p>
          <Link href="/" className="bg-theme-primary text-white px-6 py-3 rounded-2xl text-xs sm:text-sm font-bold hover:bg-theme-primary-hover transition-all shadow-sm inline-flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">home</span>
            <span>Về Trang Chủ Sàn</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1520px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 font-body-md">
      {/* Breadcrumb */}
      <nav className="text-body-sm text-on-surface-variant flex items-center gap-2 mb-6">
        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">home</span>
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/stores" className="hover:text-primary transition-colors">Doanh nghiệp phát hành</Link>
        <span>/</span>
        <span className="text-theme-primary font-semibold truncate">{business?.name || 'Chi tiết doanh nghiệp'}</span>
      </nav>

      {/* Publisher Hero Header & Profile Card */}
      <section className="relative rounded-3xl shadow-sm bg-theme-surface border border-theme-border mb-8 z-30">
        {/* Panoramic Banner */}
        <div
          className="h-56 md:h-72 w-full relative bg-cover bg-center rounded-t-3xl overflow-hidden"
          style={{ backgroundImage: `url('${bannerImg}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6 text-white flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="px-3 py-1 bg-theme-accent text-white text-xs font-bold rounded-full uppercase tracking-wider mb-2 inline-block shadow-sm">
                NXB Đối Tác Độc Quyền Mall
              </span>
              <h1 className="font-editorial text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                {business?.name || 'Doanh Nghiệp Sách Chính Hãng'}
              </h1>
              <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-xl line-clamp-2">
                {business?.description || legacyProfile?.description || `Trang phát hành chính thức của ${business?.name || 'doanh nghiệp'} trên HUKI.`}
              </p>
            </div>
            <div className="text-right hidden md:block shrink-0">
              <span className="text-emerald-300 font-semibold text-sm flex items-center justify-end gap-1">
                <span className="material-symbols-outlined text-base">verified</span>
                HUKI DRM Verified Publisher
              </span>
              <span className="text-stone-300 text-xs">Phân phối chính hãng toàn quốc</span>
            </div>
          </div>
        </div>

        {/* Info & Stats Bar Below Banner */}
        <div className="p-6 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-t border-theme-border/30 bg-theme-surface rounded-b-3xl relative">
          <div className="flex items-center gap-4">
            {business?.logo || legacyProfile?.logo ? (
              <img
                src={business?.logo || legacyProfile?.logo}
                alt={business?.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white shadow-md -mt-10 lg:-mt-12 bg-white shrink-0 relative z-10"
              />
            ) : (
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#003b2b] text-white font-black text-2xl sm:text-3xl flex items-center justify-center border-2 border-white shadow-md -mt-10 lg:-mt-12 shrink-0 relative z-10">
                {(business?.name || 'H').slice(0, 1).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg sm:text-xl text-theme-text">{business?.name}</h2>
                <span className="material-symbols-outlined text-theme-primary text-[20px] fill-current" title="Chứng nhận Chính Hãng">
                  verified
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-theme-text-muted mt-1">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-amber-500 text-sm fill-current">star</span>
                  <strong className="text-theme-text">—</strong> Đánh giá
                </span>
                <span>•</span>
                <span><strong>{allStoreBooks.length}</strong> Đầu sách</span>
                <span>•</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Phản hồi chat — Sắp ra mắt
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto relative">
            {isOwner ? (
              <>
                {/* Nút Cập Nhật Ảnh (Dropdown Menu) */}
                <div
                  ref={dropdownRef}
                  className="relative flex-1 lg:flex-none"
                >
                  <button
                    type="button"
                    onClick={() => setIsImageDropdownOpen((prev) => !prev)}
                    disabled={isApplyingImage}
                    className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">
                      {isApplyingImage ? 'progress_activity' : 'photo_camera'}
                    </span>
                    <span>{isApplyingImage ? 'Đang Xử Lý...' : 'Cập Nhật Ảnh'}</span>
                    <span className={`material-symbols-outlined text-sm transition-transform duration-200 ${isImageDropdownOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {/* Dropdown Menu - Chỉ 2 lựa chọn */}
                  {isImageDropdownOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-theme-border p-1.5 z-[999] animate-in fade-in slide-in-from-top-2 duration-150">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveImageModal('avatar');
                          setPreviewImage(business?.logo || null);
                          setIsImageDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-theme-secondary-subtle hover:text-theme-primary transition-colors flex items-center gap-2.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg text-theme-primary">account_circle</span>
                        <span>Chọn ảnh đại diện</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveImageModal('banner');
                          setPreviewImage(business?.banner || legacyProfile?.banner || null);
                          setIsImageDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-gray-700 hover:bg-theme-secondary-subtle hover:text-theme-primary transition-colors flex items-center gap-2.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-lg text-theme-primary">panorama</span>
                        <span>Chọn ảnh nền</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Nút Quay Lại Trang Quản Lý */}
                <Link
                  href="/seller/dashboard"
                  className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl border border-theme-border bg-white hover:bg-theme-surface-subtle text-theme-text font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <span className="material-symbols-outlined text-base">dashboard</span>
                  <span>Quay Lại Trang Quản Lý</span>
                </Link>
              </>
            ) : (
              <div className="relative flex-1 lg:flex-none">
                {!isFollowed ? (
                  <button
                    type="button"
                    onClick={handleFollowStore}
                    className="w-full lg:w-auto px-5 py-2.5 rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span className="material-symbols-outlined text-base">person_add</span>
                    <span>Theo Dõi Gian Hàng</span>
                  </button>
                ) : (
                  <div className="relative" ref={followDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsFollowDropdownOpen((prev) => !prev)}
                      className="w-full lg:w-auto px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span className="material-symbols-outlined text-base">check</span>
                      <span>Đang Theo Dõi</span>
                      <span className="material-symbols-outlined text-sm">expand_more</span>
                    </button>

                    {isFollowDropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-theme-border p-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                        {/* Option 1: Nhắn tin (disabled) */}
                        <div
                          className="w-full px-3 py-2 rounded-xl text-xs font-medium text-gray-400 flex items-center justify-between cursor-not-allowed select-none bg-gray-50/50 mb-1"
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
                          type="button"
                          onClick={() => {
                            setIsFollowDropdownOpen(false);
                            setIsUnfollowModalOpen(true);
                          }}
                          className="w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors cursor-pointer text-left"
                        >
                          <span className="material-symbols-outlined text-sm text-rose-600">person_remove</span>
                          <span>Hủy theo dõi</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modal Popup Cập Nhật Ảnh (Avatar hoặc Banner) */}
      {activeImageModal && (
        <div
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen min-h-screen bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-[99999] animate-in fade-in duration-200"
          onClick={() => {
            if (!isApplyingImage) {
              setActiveImageModal(null);
              setPreviewImage(null);
            }
          }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl border border-theme-border w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-surface-container-lowest">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-theme-primary/10 text-theme-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">
                    {activeImageModal === 'avatar' ? 'account_circle' : 'panorama'}
                  </span>
                </div>
                <div>
                  <h3 className="font-title-md text-base font-bold text-on-surface">
                    {activeImageModal === 'avatar' ? 'Cập Nhật Ảnh Đại Diện' : 'Cập Nhật Ảnh Bìa Gian Hàng'}
                  </h3>
                  <p className="text-[11px] text-on-surface-variant">
                    {activeImageModal === 'avatar'
                      ? 'Logo đại diện chính thức của gian hàng'
                      : 'Ảnh nền panorama hiển thị đầu trang gian hàng'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!isApplyingImage) {
                    setActiveImageModal(null);
                    setPreviewImage(null);
                  }
                }}
                disabled={isApplyingImage}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Body Modal */}
            <div className="p-6 space-y-5">
              {/* Preview Box */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
                  Xem trước ảnh:
                </label>
                {activeImageModal === 'avatar' ? (
                  <div className="w-28 h-28 rounded-2xl border-2 border-theme-border overflow-hidden bg-gray-50 flex items-center justify-center mx-auto shadow-inner relative">
                    {previewImage === 'DEFAULT' || (!previewImage && !business?.logo && !legacyProfile?.logo) ? (
                      <div className="w-full h-full bg-[#003b2b] text-white font-black text-3xl flex items-center justify-center">
                        {(business?.name || 'H').slice(0, 1).toUpperCase()}
                      </div>
                    ) : (
                      <img
                        src={previewImage || business?.logo || legacyProfile?.logo}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                ) : (
                  <div className="w-full h-36 sm:h-44 rounded-2xl border-2 border-theme-border overflow-hidden bg-gray-50 flex items-center justify-center mx-auto shadow-inner relative">
                    <img
                      src={
                        previewImage === 'DEFAULT'
                          ? 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1600&q=80'
                          : previewImage || bannerImg
                      }
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    {previewImage === 'DEFAULT' && (
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                        Ảnh bìa mặc định
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Upload Dropzone */}
              <div
                onClick={() => modalFileInputRef.current?.click()}
                className="border-2 border-dashed border-theme-primary/30 hover:border-theme-primary hover:bg-theme-primary/[0.03] rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 group"
              >
                <div className="w-10 h-10 rounded-full bg-theme-primary/10 text-theme-primary flex items-center justify-center group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-xl">cloud_upload</span>
                </div>
                <div className="font-semibold text-xs text-theme-text">
                  Bấm để chọn ảnh từ thiết bị
                </div>
                <p className="text-[11px] text-theme-text-muted">
                  Định dạng hỗ trợ: PNG, JPG, WEBP • Dung lượng tối đa: <strong>2MB</strong>
                </p>
              </div>

              <input
                type="file"
                ref={modalFileInputRef}
                onChange={handleModalFileChange}
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
              />
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPreviewImage('DEFAULT')}
                disabled={isApplyingImage}
                className="px-3.5 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                <span>Chọn ảnh mặc định</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveImageModal(null);
                    setPreviewImage(null);
                  }}
                  disabled={isApplyingImage}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleApplyImage}
                  disabled={isApplyingImage}
                  className="px-5 py-2 rounded-xl bg-theme-primary hover:bg-theme-primary-hover text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">
                    {isApplyingImage ? 'progress_activity' : 'check'}
                  </span>
                  <span>{isApplyingImage ? 'Đang Lưu...' : 'Áp Dụng'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Showcase & Filtering */}
      <section>
        {/* Navigation Tabs Bar & Search */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-theme-border mb-6">
          {/* Format / Highlight Tabs */}
          <div className="flex items-center flex-wrap gap-1 bg-[#f2fbf9] p-1 rounded-2xl border border-[#e8e5df]">
            {[
              { id: 'all', name: 'Tất Cả Sách', count: allStoreBooks.length },
              { id: 'bestseller', name: 'Bán Chạy Nhất' },
              { id: 'ebook', name: 'Ebook DRM' },
              { id: 'physical', name: 'Sách Giấy' },
              { id: 'hybrid', name: 'Combo Hybrid' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-[#003b2b] shadow-2xs border border-[#e8e5df]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{tab.name}</span>
                  {tab.count !== undefined && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-semibold">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search inside shop */}
          <div className="relative w-full md:w-72">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-base">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm trong gian hàng này..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-[#e8e5df] text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#003b2b] shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Tag Pills */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <span className="text-xs text-slate-500 font-semibold shrink-0">Chủ đề:</span>
          {[
            { id: 'all', name: 'Tất cả' },
            { id: 'selfhelp', name: 'Phát triển bản thân' },
            { id: 'business', name: 'Kinh doanh & Đầu tư' },
            { id: 'technology', name: 'Công nghệ & AI' },
            { id: 'literature', name: 'Văn học & Nghệ thuật' },
          ].map((cat) => {
            const isCatActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  isCatActive
                    ? 'bg-[#003b2b] text-white'
                    : 'bg-white border border-[#e8e5df] text-slate-700 hover:bg-slate-50'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Books Grid */}
        {filteredBooks.length === 0 ? (
          <EmptyState
            icon="menu_book"
            title="Gian hàng chưa có sản phẩm phù hợp"
            description="Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm để khám phá thêm nhiều đầu sách khác của shop."
            actionText="Xem tất cả sách"
            onAction={() => {
              setActiveTab('all');
              setActiveCategory('all');
              setSearchQuery('');
            }}
          />
        ) : (
          <div className="grid grid-cols-2 min-[540px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-5">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                isMock={book.isMock}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modal Popup Xác Nhận Hủy Theo Dõi (Đếm ngược 5s) */}
      {isUnfollowModalOpen && (
        <div className="fixed inset-0 w-screen h-screen z-[99999] bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-theme-border relative animate-in fade-in zoom-in-95 duration-150">
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
              <strong className="text-gray-900">{business?.name || 'này'}</strong> không? Bạn sẽ không còn nhận được các thông báo cập nhật sách mới và ưu đãi độc quyền từ gian hàng này.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsUnfollowModalOpen(false)}
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
