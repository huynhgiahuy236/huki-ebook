"use client";

import React, { Suspense, useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import BookCard from '@/ui/components/common/BookCard';
import EmptyState from '@/ui/components/common/EmptyState';
import { catalogApi, type BookData } from '@/ui/api/catalogApi';
import { trackEvent } from '@/lib/tracker';

const ITEMS_PER_PAGE = 20; // 5 columns x 4 rows = 20 items per page (Shopee standard)

export interface CatalogBookItem {
  id: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  format: string;
  formatType: 'ebook' | 'physical' | 'hybrid';
  price: number;
  originalPrice?: number;
  discount?: string;
  rating: number;
  sales: string;
  cover: string;
  isMock: boolean;
  storeId?: string;
  businessId?: string;
  location?: string;
  book?: any;
}

function CatalogPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topGridRef = useRef<HTMLDivElement>(null);

  const selectedCat = searchParams.get('cat') || searchParams.get('category') || 'all';
  const selectedFormat = searchParams.get('format') || 'all';
  const selectedPublisher = searchParams.get('publisher') || 'all';
  const selectedRating = searchParams.get('rating') || 'all';
  const minPriceParam = searchParams.get('minPrice') || '';
  const maxPriceParam = searchParams.get('maxPrice') || '';
  const selectedSort = searchParams.get('sort') || 'popular';
  const searchQuery = searchParams.get('q') || searchParams.get('search') || '';
  const currentPageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;

  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [minPriceInput, setMinPriceInput] = useState(minPriceParam);
  const [maxPriceInput, setMaxPriceInput] = useState(maxPriceParam);
  const [realBooks, setRealBooks] = useState<BookData[]>([]);
  const [, setIsLoadingRealBooks] = useState(true);

  useEffect(() => {
    let isMounted = true;
    catalogApi.getPublicBooks({ limit: 100 })
      .then((res) => {
        if (isMounted) {
          if (res.success && Array.isArray(res.data) && res.data.length > 0) {
            setRealBooks(res.data);
          }
          setIsLoadingRealBooks(false);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch real books:', err);
        if (isMounted) setIsLoadingRealBooks(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setSearchTerm(searchQuery);
    if (searchQuery && searchQuery.trim()) {
      trackEvent.searchQuery(searchQuery.trim(), selectedCat !== 'all' ? selectedCat : undefined);
    }
  }, [searchQuery, selectedCat]);

  useEffect(() => {
    setMinPriceInput(minPriceParam);
    setMaxPriceInput(maxPriceParam);
  }, [minPriceParam, maxPriceParam]);

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all' || !value || (key === 'page' && value === '1')) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (key !== 'page') {
      params.delete('page');
    }
    router.push(`/books?${params.toString()}`);
  };

  const handleApplyPriceFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (minPriceInput && !isNaN(Number(minPriceInput))) {
      params.set('minPrice', minPriceInput);
    } else {
      params.delete('minPrice');
    }
    if (maxPriceInput && !isNaN(Number(maxPriceInput))) {
      params.set('maxPrice', maxPriceInput);
    } else {
      params.delete('maxPrice');
    }
    params.delete('page');
    router.push(`/books?${params.toString()}`);
  };

  const clearAllFilters = () => {
    setMinPriceInput('');
    setMaxPriceInput('');
    router.push('/books');
  };

  const handlePageChange = (newPage: number) => {
    updateParam('page', newPage === 1 ? null : String(newPage));
    if (topGridRef.current) {
      topGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const allBooks = useMemo<CatalogBookItem[]>(() => {
    return realBooks.map((rb) => {
      const rawRb = rb as any;
      const priceVal = Number(rb.price !== undefined ? rb.price : rawRb.priceEbook || rawRb.pricePaper || 0);
      const originalPriceVal = Number(rb.originalPrice !== undefined ? rb.originalPrice : rawRb.originalPriceEbook || rawRb.originalPricePaper || 0);
      const hasEb = Boolean(rawRb.hasEbook || rawRb.priceEbook || rb.digitalDetails?.digitalEnabled || rb.format === 'DIGITAL' || rb.format === 'BOTH');
      const hasPa = Boolean(rawRb.hasPaper || rawRb.pricePaper || rb.physicalDetails?.physicalEnabled || rb.format === 'PHYSICAL' || rb.format === 'BOTH');
      const fmt = hasEb && hasPa ? 'Combo' : hasEb ? 'Ebook' : 'Sách giấy';
      const fmtType: 'ebook' | 'physical' | 'hybrid' = hasEb && hasPa ? 'hybrid' : hasEb ? 'ebook' : 'physical';
      let catSlug = 'selfhelp';
      if (rb.category) {
        const catStr = (typeof rb.category === 'object' ? rb.category?.slug || rb.category?.name : String(rb.category)).toLowerCase();
        if (catStr.includes('kinh-te') || catStr.includes('business')) catSlug = 'business';
        else if (catStr.includes('cong-nghe') || catStr.includes('tech')) catSlug = 'technology';
        else if (catStr.includes('van-hoc') || catStr.includes('literature')) catSlug = 'literature';
      }
      const authorName = rb.author?.name || (typeof rb.author === 'string' ? rb.author : null) || rawRb.authorName || 'Tác giả HUKI';
      const publisherName = rb.publisher?.name || (typeof rb.publisher === 'string' ? rb.publisher : null) || rawRb.publisherName || rawRb.shopName || 'HUKI Publisher';
      const coverUrl = rb.coverUrl || rawRb.coverImage || rb.cover || '';
      const discountPercent = rawRb.discountPercent;
      return {
        id: rb.id,
        storeId: rb.storeId || rawRb.store_id || rb.businessId || rawRb.business_id,
        businessId: rb.businessId || rawRb.business_id || rb.storeId || rawRb.store_id,
        book: rawRb,
        title: rb.title,
        author: authorName,
        publisher: publisherName,
        category: catSlug,
        format: fmt,
        formatType: fmtType,
        price: priceVal,
        originalPrice: originalPriceVal > priceVal ? originalPriceVal : undefined,
        discount: discountPercent ? `-${discountPercent}%` : '',
        rating: Number(rawRb.rating || 5.0),
        sales: rawRb.sales ? String(rawRb.sales) : '1.5k',
        cover: coverUrl,
        isMock: false,
        location: rawRb.location || 'TP. Hồ Chí Minh'
      };
    });
  }, [realBooks]);

  const filteredBooks = useMemo(() => {
    const minP = minPriceParam ? Number(minPriceParam) : null;
    const maxP = maxPriceParam ? Number(maxPriceParam) : null;

    const matches = allBooks.filter((book) => {
      // Category filter
      if (selectedCat !== 'all') {
        const catMap: Record<string, string> = { 'van-hoc': 'literature', 'kinh-te': 'business', 'ky-nang': 'selfhelp', 'cong-nghe': 'technology' };
        const normalizedSelected = catMap[selectedCat] || selectedCat;
        if (book.category !== normalizedSelected) return false;
      }
      // Format filter
      if (selectedFormat === 'ebook' && book.formatType !== 'ebook') return false;
      if (selectedFormat === 'physical' && book.formatType !== 'physical') return false;
      if (selectedFormat === 'hybrid' && book.formatType !== 'hybrid') return false;
      
      // Publisher filter
      if (selectedPublisher !== 'all') {
        const pubLower = book.publisher.toLowerCase();
        if (!pubLower.includes(selectedPublisher.toLowerCase())) return false;
      }

      // Rating filter
      if (selectedRating !== 'all') {
        const minRating = Number(selectedRating);
        if (!isNaN(minRating) && book.rating < minRating) return false;
      }

      // Price range
      if (minP !== null && !isNaN(minP) && book.price < minP) return false;
      if (maxP !== null && !isNaN(maxP) && book.price > maxP) return false;

      // Search term
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return book.title.toLowerCase().includes(q) || (book.author && book.author.toLowerCase().includes(q));
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      if (selectedSort === 'popular' && a.isMock !== b.isMock) return a.isMock ? 1 : -1;
      if (selectedSort === 'price-low') return a.price - b.price;
      if (selectedSort === 'price-high') return b.price - a.price;
      if (selectedSort === 'bestseller') return parseSales(b.sales) - parseSales(a.sales);
      if (selectedSort === 'new') return String(b.id).localeCompare(String(a.id));
      return b.rating - a.rating;
    });
  }, [allBooks, selectedCat, selectedFormat, selectedPublisher, selectedRating, minPriceParam, maxPriceParam, selectedSort, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedBooks = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredBooks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBooks, validCurrentPage]);

  const hasActiveFilters = selectedCat !== 'all' || selectedFormat !== 'all' || selectedPublisher !== 'all' || selectedRating !== 'all' || Boolean(minPriceParam) || Boolean(maxPriceParam) || Boolean(searchTerm);

  // Featured shop showcase books
  const featuredShopBooks = allBooks.slice(0, 4);

  return (
    <div className="max-w-[1360px] w-full mx-auto px-3 sm:px-4 py-3 flex-1 flex flex-col font-sans">
      
      {/* 1. TOP CAMPAIGN BANNER (HUKI Green Signature Tone) */}
      <div className="w-full bg-gradient-to-r from-[#003b2b] via-[#005a42] to-[#01261c] rounded-lg p-3 sm:p-4 mb-4 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden">
        <div className="z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center font-black text-lg border border-white/20 shadow-xs shrink-0 text-[#94f5d6]">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#94f5d6] text-[#003b2b] text-[10.5px] font-black px-2 py-0.5 rounded shadow-2xs uppercase tracking-wider">
                SIÊU HỘI TRI THỨC
              </span>
              <span className="text-xs font-medium text-white/90">HUKI EBOOK &amp; SÁCH GIẤY</span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5 drop-shadow-xs">
              ĐẠI TIỆC TRI THỨC - ĐỒNG GIÁ TỪ 9.000Đ &amp; VOUCHER BẢN QUYỀN GIẢM 50%
            </h2>
          </div>
        </div>
        <div className="z-10 flex items-center gap-2 shrink-0">
          <Link
            href="/flash-sale"
            className="px-3.5 py-1.5 rounded-full bg-white text-[#003b2b] hover:bg-[#e6f4f0] font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] text-[#006953]">local_fire_department</span>
            <span>Săn Ngay</span>
          </Link>
        </div>
        {/* Background decorative pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
      </div>

      {/* 2. OFFICIAL STORE SHOWCASE SECTION (HUKI Green Tone) */}
      <div className="bg-white border border-gray-200/90 rounded-lg p-3 sm:p-3.5 mb-4 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Left: Shop Info Card */}
        <div className="flex items-center gap-3.5 lg:w-[320px] shrink-0 lg:pr-4 lg:border-r border-gray-100">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#003b2b] to-[#006953] p-0.5 shadow-xs shrink-0">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-[#003b2b] text-lg">
              <span className="material-symbols-outlined text-2xl">menu_book</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="bg-[#003b2b] text-white text-[9px] font-black px-1.5 py-0.2 rounded">Official</span>
              <h3 className="font-bold text-xs sm:text-sm text-gray-900 truncate">HUKI Official Books Store</h3>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
              <span>⭐ <strong className="text-gray-800">5.0</strong></span>
              <span>•</span>
              <span>58.6k Người theo dõi</span>
            </p>
            <Link
              href="/shop/huki-official"
              className="inline-block mt-1.5 px-3 py-1 rounded border border-[#003b2b] text-[#003b2b] hover:bg-[#003b2b] hover:text-white font-semibold text-[11px] transition-colors"
            >
              Xem Shop
            </Link>
          </div>
        </div>

        {/* Right: 4 Mini Featured Books */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1">
          {featuredShopBooks.map((item) => (
            <Link
              key={`showcase-${item.id}`}
              href={`/book/${item.id}`}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-[#f2fbf9] border border-transparent hover:border-[#003b2b]/30 transition-all group"
            >
              <img
                src={item.cover}
                alt={item.title}
                className="w-11 h-14 object-cover rounded shadow-2xs group-hover:scale-105 transition-transform shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h4 className="text-[11px] font-medium text-gray-800 line-clamp-1 group-hover:text-[#003b2b] leading-tight">
                  {item.title}
                </h4>
                <div className="text-[11.5px] font-bold text-[#003b2b] mt-0.5">
                  {item.price.toLocaleString('vi-VN')}₫
                </div>
                <div className="text-[9.5px] text-gray-400">Đã bán {item.sales}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 3. MAIN SECTION: SIDEBAR FILTER + PRODUCT GRID */}
      <div className="grid grid-cols-12 gap-3.5 lg:gap-4 items-start">
        
        {/* === LEFT SIDEBAR: BỘ LỌC TÌM KIẾM === */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-2.5 bg-white border border-gray-200/90 rounded-lg p-3.5 shadow-2xs">
          <div className="flex items-center gap-1.5 pb-3 border-b border-gray-200 text-xs font-black uppercase tracking-wider text-gray-900">
            <span className="material-symbols-outlined text-[#003b2b] text-[18px]">filter_list</span>
            <span>Bộ Lọc Tìm Kiếm</span>
          </div>

          {/* 1. Định dạng & Bản quyền */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-800 mb-2">Định dạng &amp; Bản quyền</h4>
            <div className="space-y-1.5 text-xs">
              {[
                { id: 'all', label: 'Tất cả định dạng' },
                { id: 'ebook', label: '⚡ Ebook Bản Quyền DRM' },
                { id: 'physical', label: '📖 Sách Giấy In' },
                { id: 'hybrid', label: '📚 Combo Giấy + Ebook' },
              ].map((fmt) => (
                <label
                  key={fmt.id}
                  onClick={() => updateParam('format', fmt.id)}
                  className={`flex items-center gap-2 cursor-pointer py-0.5 hover:text-[#003b2b] transition-colors ${
                    selectedFormat === fmt.id ? 'text-[#003b2b] font-bold' : 'text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="format_filter"
                    checked={selectedFormat === fmt.id}
                    onChange={() => {}}
                    className="accent-[#003b2b] cursor-pointer"
                  />
                  <span>{fmt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Danh mục / Thể loại */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-800 mb-2">Theo Danh Mục</h4>
            <div className="space-y-1.5 text-xs text-gray-700">
              {[
                { id: 'all', label: 'Tất cả chủ đề' },
                { id: 'selfhelp', label: 'Phát triển bản thân' },
                { id: 'technology', label: 'Công nghệ & AI' },
                { id: 'business', label: 'Kinh doanh & Đầu tư' },
                { id: 'literature', label: 'Văn học & Tiểu thuyết' },
              ].map((cat) => (
                <label
                  key={cat.id}
                  onClick={() => updateParam('cat', cat.id)}
                  className={`flex items-center gap-2 cursor-pointer py-0.5 hover:text-[#003b2b] transition-colors ${
                    selectedCat === cat.id ? 'text-[#003b2b] font-bold' : 'text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="cat_filter"
                    checked={selectedCat === cat.id}
                    onChange={() => {}}
                    className="accent-[#003b2b] cursor-pointer"
                  />
                  <span>{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 3. Nhà xuất bản / Thương hiệu */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-800 mb-2">Nhà Xuất Bản</h4>
            <div className="space-y-1.5 text-xs text-gray-700">
              {[
                { id: 'all', label: 'Tất cả NXB' },
                { id: 'Alpha Books', label: 'Alpha Books' },
                { id: 'Nhã Nam', label: 'Nhã Nam' },
                { id: 'First News', label: 'First News Trí Việt' },
                { id: 'NXB Trẻ', label: 'NXB Trẻ' },
              ].map((pub) => (
                <label
                  key={pub.id}
                  onClick={() => updateParam('publisher', pub.id)}
                  className={`flex items-center gap-2 cursor-pointer py-0.5 hover:text-[#003b2b] transition-colors ${
                    selectedPublisher === pub.id ? 'text-[#003b2b] font-bold' : 'text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="publisher_filter"
                    checked={selectedPublisher === pub.id}
                    onChange={() => {}}
                    className="accent-[#003b2b] cursor-pointer"
                  />
                  <span>{pub.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Khoảng Giá (Green Apply Button) */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-800 mb-2">Khoảng Giá</h4>
            <form onSubmit={handleApplyPriceFilter} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="₫ TỪ"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                />
                <span className="text-gray-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="₫ ĐẾN"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 rounded bg-[#003b2b] hover:bg-[#00281d] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-2xs cursor-pointer"
              >
                Áp Dụng
              </button>
            </form>
          </div>

          {/* 5. Đánh giá */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-800 mb-2">Đánh Giá</h4>
            <div className="space-y-1 text-xs">
              {[
                { rating: '5', stars: '★★★★★', label: '5 sao' },
                { rating: '4', stars: '★★★★☆', label: 'từ 4 sao' },
                { rating: '3', stars: '★★★☆☆', label: 'từ 3 sao' },
              ].map((r) => (
                <button
                  key={r.rating}
                  type="button"
                  onClick={() => updateParam('rating', selectedRating === r.rating ? 'all' : r.rating)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded cursor-pointer transition-colors text-left ${
                    selectedRating === r.rating ? 'bg-[#e6f4f0] text-[#003b2b] font-bold border border-[#003b2b]/30' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-amber-500 tracking-wider text-xs">{r.stars}</span>
                  <span className="text-[11px] text-gray-600">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Nút XÓA TẤT CẢ (Green Theme Button) */}
          <div className="pt-3">
            <button
              type="button"
              onClick={clearAllFilters}
              disabled={!hasActiveFilters}
              className="w-full py-2 rounded bg-[#003b2b] hover:bg-[#00281d] disabled:opacity-40 disabled:pointer-events-none text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[15px]">delete_sweep</span>
              <span>Xóa Tất Cả</span>
            </button>
          </div>
        </aside>

        {/* === RIGHT COLUMN: SORT BAR & 5-COLUMN PRODUCT GRID === */}
        <main ref={topGridRef} className="col-span-12 lg:col-span-9 xl:col-span-9.5 flex flex-col">
          
          {/* Top Sort & Quick Pagination Bar */}
          <div className="bg-[#ededed] rounded-lg p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
            {/* Left: Sort Tabs */}
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-gray-600 font-medium mr-1 hidden sm:inline">Sắp xếp theo</span>
              
              <button
                type="button"
                onClick={() => updateParam('sort', 'popular')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                  selectedSort === 'popular'
                    ? 'bg-[#003b2b] text-white shadow-xs'
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                Phổ biến
              </button>

              <button
                type="button"
                onClick={() => updateParam('sort', 'new')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                  selectedSort === 'new'
                    ? 'bg-[#003b2b] text-white shadow-xs'
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                Mới nhất
              </button>

              <button
                type="button"
                onClick={() => updateParam('sort', 'bestseller')}
                className={`px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer ${
                  selectedSort === 'bestseller'
                    ? 'bg-[#003b2b] text-white shadow-xs'
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                Bán chạy
              </button>

              {/* Price Sort Dropdown */}
              <select
                value={selectedSort.startsWith('price') ? selectedSort : ''}
                onChange={(e) => updateParam('sort', e.target.value)}
                className={`bg-white rounded px-2.5 py-1.5 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#003b2b] cursor-pointer shadow-2xs ${
                  selectedSort.startsWith('price') ? 'border border-[#003b2b] text-[#003b2b]' : 'border border-transparent'
                }`}
              >
                <option value="" disabled hidden>Giá</option>
                <option value="price-low">Giá: Thấp đến Cao</option>
                <option value="price-high">Giá: Cao đến Thấp</option>
              </select>
            </div>

            {/* Right: Quick Pagination Indicator */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="text-xs text-gray-700">
                <strong className="text-[#003b2b]">{validCurrentPage}</strong>/{totalPages}
              </div>
              <div className="flex items-center rounded overflow-hidden shadow-2xs border border-gray-300">
                <button
                  type="button"
                  disabled={validCurrentPage <= 1}
                  onClick={() => handlePageChange(validCurrentPage - 1)}
                  className="w-8 h-7 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-gray-700 border-r border-gray-200 transition-colors cursor-pointer"
                  aria-label="Trang trước"
                >
                  <span className="material-symbols-outlined text-xs">chevron_left</span>
                </button>
                <button
                  type="button"
                  disabled={validCurrentPage >= totalPages}
                  onClick={() => handlePageChange(validCurrentPage + 1)}
                  className="w-8 h-7 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-gray-700 transition-colors cursor-pointer"
                  aria-label="Trang sau"
                >
                  <span className="material-symbols-outlined text-xs">chevron_right</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Badges */}
          {hasActiveFilters && (
            <div className="flex items-center flex-wrap gap-1.5 mb-3 text-xs">
              <span className="text-gray-500">Đang lọc theo:</span>
              {selectedCat !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e6f4f0] text-[#003b2b] text-[11px] font-medium">
                  Chủ đề: {selectedCat}
                  <button onClick={() => updateParam('cat', 'all')} className="hover:opacity-75 cursor-pointer"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
              {selectedFormat !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e6f4f0] text-[#003b2b] text-[11px] font-medium">
                  Định dạng: {selectedFormat}
                  <button onClick={() => updateParam('format', 'all')} className="hover:opacity-75 cursor-pointer"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
              {selectedPublisher !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e6f4f0] text-[#003b2b] text-[11px] font-medium">
                  NXB: {selectedPublisher}
                  <button onClick={() => updateParam('publisher', 'all')} className="hover:opacity-75 cursor-pointer"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
              {(minPriceParam || maxPriceParam) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e6f4f0] text-[#003b2b] text-[11px] font-medium">
                  Giá: {minPriceParam || '0'}đ - {maxPriceParam || '∞'}đ
                  <button onClick={() => { setMinPriceInput(''); setMaxPriceInput(''); updateParam('minPrice', null); updateParam('maxPrice', null); }} className="hover:opacity-75 cursor-pointer"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e6f4f0] text-[#003b2b] text-[11px] font-medium">
                  Từ khóa: &ldquo;{searchTerm}&rdquo;
                  <button onClick={() => { setSearchTerm(''); updateParam('q', null); }} className="hover:opacity-75 cursor-pointer"><span className="material-symbols-outlined text-[12px]">close</span></button>
                </span>
              )}
            </div>
          )}

          {/* 5-Column Grid */}
          {filteredBooks.length === 0 ? (
            <EmptyState
              icon="search_off"
              title="Không tìm thấy sản phẩm phù hợp"
              description="Hãy thử từ khóa khác hoặc xóa bớt tiêu chí lọc."
              actionText="Xóa tất cả bộ lọc"
              actionLink="/books"
              actionIcon="tune"
            />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-2 sm:gap-2.5">
                {paginatedBooks.map((book) => (
                  <BookCard key={book.id} book={book} variant="grid" isMock={book.isMock} />
                ))}
              </div>

              {/* Bottom Standard Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 mb-4 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    Hiển thị <span className="font-bold text-gray-900">{(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-gray-900">{Math.min(validCurrentPage * ITEMS_PER_PAGE, filteredBooks.length)}</span> trong tổng số <span className="font-bold text-gray-900">{filteredBooks.length}</span> sản phẩm
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={validCurrentPage <= 1}
                      onClick={() => handlePageChange(validCurrentPage - 1)}
                      className="w-8 h-8 rounded border border-gray-300 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      aria-label="Trang trước"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 rounded text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                          p === validCurrentPage
                            ? 'bg-[#003b2b] text-white shadow-2xs'
                            : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={validCurrentPage >= totalPages}
                      onClick={() => handlePageChange(validCurrentPage + 1)}
                      className="w-8 h-8 rounded border border-gray-300 bg-white flex items-center justify-center text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      aria-label="Trang sau"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function parseSales(value: string | number | undefined | null): number {
  const normalized = String(value || '').toLowerCase().replace(',', '.');
  const amount = Number.parseFloat(normalized) || 0;
  return normalized.includes('k') ? amount * 1000 : amount;
}

export default function CatalogPage(props: any) {
  return (
    <Suspense fallback={null}>
      <CatalogPageContent {...props} />
    </Suspense>
  );
}
