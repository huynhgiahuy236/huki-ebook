'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import BookCard, { type BookCardData } from '@/ui/components/common/BookCard';
import EmptyState from '@/ui/components/common/EmptyState';
import { businessApi, type BusinessData } from '@/ui/api/businessApi';
import { catalogApi, toCatalogBook, type BookData } from '@/ui/api/catalogApi';

export default function ShopPage() {
  const params = useParams();
  const businessSlugOrId = (params?.id as string) || '';
  const { showToast } = useToast();

  const [business, setBusiness] = useState<BusinessData | null>(null);
  const [realBooks, setRealBooks] = useState<BookData[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'new' | 'bestseller' | 'ebook' | 'physical' | 'hybrid'
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFollowed, setIsFollowed] = useState(false);

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
      const priceVal = Number((rb as any).priceEbook || (rb as any).pricePaper || rb.price || 0);
      const originalPriceVal = Number((rb as any).originalPriceEbook || (rb as any).originalPricePaper || rb.originalPrice || 0);
      const hasEb = Boolean((rb as any).hasEbook || (rb as any).priceEbook || rb.digitalDetails?.digitalEnabled);
      const hasPa = Boolean((rb as any).hasPaper || (rb as any).pricePaper || rb.physicalDetails?.physicalEnabled);
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
      <section className="relative rounded-3xl overflow-hidden shadow-sm bg-theme-surface border border-theme-border mb-8">
        {/* Panoramic Banner */}
        <div
          className="h-56 md:h-72 w-full relative bg-cover bg-center"
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
        <div className="p-6 md:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 border-t border-theme-border/30 bg-theme-surface">
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
          <div className="flex items-center gap-3 w-full lg:w-auto pointer-events-none opacity-60" aria-disabled="true">
            <button
              type="button"
              onClick={handleFollow}
              className={`flex-1 lg:flex-none px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs ${
                isFollowed
                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                  : 'bg-theme-primary hover:bg-theme-primary-hover text-white'
              }`}
            >
              <span className="material-symbols-outlined text-base">
                {isFollowed ? 'check' : 'add'}
              </span>
              <span>{isFollowed ? 'Đã Theo Dõi' : 'Theo Dõi Doanh Nghiệp'}</span>
            </button>

            <Link
              href="/chat"
              className="flex-1 lg:flex-none px-4 py-2.5 rounded-xl border border-theme-border hover:bg-theme-surface-subtle text-theme-text font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span className="material-symbols-outlined text-base">chat</span>
              <span>Chat — Sắp Ra Mắt</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Store Vouchers Section */}
      <section className="mb-8">
        <header className="flex items-center justify-between mb-3">
          <div className="font-bold text-sm text-theme-text flex items-center gap-1.5">
            <span className="material-symbols-outlined text-theme-accent text-lg">local_activity</span>
            Voucher Ưu Đãi Dành Riêng Cho Bạn
          </div>
          <p className="text-xs text-theme-text-muted">Áp dụng trực tiếp khi thanh toán</p>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pointer-events-none opacity-60" aria-disabled="true">
          <div className="bg-white rounded-2xl border border-[#e8e5df] p-3.5 flex items-center justify-between gap-3 shadow-2xs">
            <div>
              <span className="font-mono font-bold text-xs text-[#003b2b] bg-[#f2fbf9] px-2 py-0.5 rounded-md border border-[#94f5d6]/40">SẮP RA MẮT</span>
              <div className="font-bold text-xs text-slate-800 mt-1">Ưu đãi doanh nghiệp</div>
              <div className="text-[10.5px] text-slate-500">Tính năng ngoài happy case</div>
            </div>
            <button type="button" disabled className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300">Sắp Ra Mắt</button>
          </div>
          <div className="bg-white rounded-2xl border border-[#e8e5df] p-3.5 flex items-center justify-between gap-3 shadow-2xs">
            <div>
              <span className="font-mono font-bold text-xs text-[#003b2b] bg-[#f2fbf9] px-2 py-0.5 rounded-md border border-[#94f5d6]/40">SẮP RA MẮT</span>
              <div className="font-bold text-xs text-slate-800 mt-1">Miễn phí vận chuyển</div>
              <div className="text-[10.5px] text-slate-500">Tính năng ngoài happy case</div>
            </div>
            <button type="button" disabled className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-500 border border-slate-300">Sắp Ra Mắt</button>
          </div>
        </div>
      </section>

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
    </div>
  );
}
