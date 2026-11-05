"use client";

import React, { Suspense, useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import BookCard from '@/ui/components/common/BookCard';
import EmptyState from '@/ui/components/common/EmptyState';
import { catalogApi, type BookData } from '@/ui/api/catalogApi';
import { trackEvent } from '@/lib/tracker';
import { personalizationService, normalizeVietnameseText } from '@/ui/services/personalizationService';
import { reviewSummaryService } from '@/ui/services/reviewSummaryService';
import { PersonalizedForYouSection } from '@/ui/components/recommendations/PersonalizedForYouSection';

const ITEMS_PER_PAGE = 20; // 5 columns x 4 rows = 20 items per page (Shopee standard)

export interface CatalogBookItem {
  id: string;
  title: string;
  author: string;
  publisher: string;
  category: string;
  format: string;
  formatType: 'ebook' | 'physical' | 'hybrid';
  hasEbook?: boolean;
  hasPaper?: boolean;
  price: number;
  originalPrice?: number;
  discount?: string;
  rating?: number;
  sales?: string;
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
  const selectedAuthor = searchParams.get('author') || 'all';
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
  const [reviewsTick, setReviewsTick] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function loadBooks() {
      try {
        let res = await catalogApi.getPublicBooks({ limit: 1000 });
        if (!res.success || !Array.isArray(res.data) || res.data.length === 0) {
          res = await catalogApi.getPublicBooks({ limit: 100 });
        }
        if (isMounted && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRealBooks(res.data);
          res.data.forEach((b) => reviewSummaryService.register(b.id));
        }
      } catch (err) {
        console.warn('Could not fetch real books:', err);
        try {
          const fallbackRes = await catalogApi.getPublicBooks({ limit: 100 });
          if (isMounted && fallbackRes.success && Array.isArray(fallbackRes.data)) {
            setRealBooks(fallbackRes.data);
            fallbackRes.data.forEach((b) => reviewSummaryService.register(b.id));
          }
        } catch {
          // ignore
        }
      } finally {
        if (isMounted) setIsLoadingRealBooks(false);
      }
    }
    loadBooks();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleUpdate = () => setReviewsTick((t) => t + 1);
    window.addEventListener('huki_reviews_updated', handleUpdate);
    return () => window.removeEventListener('huki_reviews_updated', handleUpdate);
  }, []);

  useEffect(() => {
    setSearchTerm(searchQuery);
    if (searchQuery && searchQuery.trim()) {
      trackEvent.searchQuery(searchQuery.trim(), selectedCat !== 'all' ? selectedCat : undefined);
      personalizationService.recordSearch(searchQuery.trim());
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
        if (catStr.includes('kinh-te') || catStr.includes('business') || catStr.includes('kinh-doanh')) catSlug = 'business';
        else if (catStr.includes('cong-nghe') || catStr.includes('tech') || catStr.includes('khoa-hoc')) catSlug = 'technology';
        else if (catStr.includes('van-hoc') || catStr.includes('literature') || catStr.includes('tieu-thuyet')) catSlug = 'literature';
      } else {
        const text = `${rb.title || ''} ${rb.description || ''}`.toLowerCase();
        if (text.includes('kinh doanh') || text.includes('kinh tế') || text.includes('tài chính') || text.includes('đầu tư')) catSlug = 'business';
        else if (text.includes('công nghệ') || text.includes('ai') || text.includes('lập trình') || text.includes('khoa học')) catSlug = 'technology';
        else if (text.includes('tiểu thuyết') || text.includes('truyện') || text.includes('thơ') || text.includes('văn học')) catSlug = 'literature';
      }
      const authorName = rb.author?.name || (typeof rb.author === 'string' ? rb.author : null) || rawRb.authorName || 'Tác giả HUKI';
      const publisherName = rb.publisher?.name || (typeof rb.publisher === 'string' ? rb.publisher : null) || rawRb.publisherName || rawRb.shopName || 'HUKI Publisher';
      const coverUrl = rb.coverUrl || rawRb.coverImage || rb.cover || '';
      const discountPercent = rawRb.discountPercent;
      const cached = reviewSummaryService.get(rb.id);
      const computedRating = (cached && cached.totalReviews > 0)
        ? cached.averageRating
        : (rawRb.rating ? Number(rawRb.rating) : undefined);
      const rawSales = rawRb.soldCount ?? rawRb.sales ?? rawRb.soldQuantity ?? 0;
      const salesNum = typeof rawSales === 'number' ? rawSales : (!isNaN(Number(rawSales)) ? Number(rawSales) : 0);
      const salesStr = salesNum >= 1000 ? `${(salesNum / 1000).toFixed(1)}k` : `${salesNum}`;

      return {
        id: rb.id,
        storeId: rb.storeId || rawRb.store_id || rb.businessId || rawRb.business_id,
        businessId: rb.businessId || rawRb.business_id || rb.storeId || rawRb.store_id,
        book: rawRb,
        title: rb.title,
        author: authorName,
        publisher: publisherName,
        category: catSlug,
        hasEbook: hasEb,
        hasPaper: hasPa,
        format: fmt,
        formatType: fmtType,
        price: priceVal,
        originalPrice: originalPriceVal > priceVal ? originalPriceVal : undefined,
        discount: discountPercent ? `-${discountPercent}%` : '',
        rating: computedRating,
        sales: salesStr,
        cover: coverUrl,
        isMock: false,
        location: rawRb.location || 'TP. Hồ Chí Minh'
      };
    });
  }, [realBooks, reviewsTick]);

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
      if (selectedFormat === 'ebook' && !book.hasEbook) return false;
      if (selectedFormat === 'physical' && !book.hasPaper) return false;
      if (selectedFormat === 'hybrid' && (!book.hasEbook || !book.hasPaper)) return false;
      
      // Publisher filter (supports both accented name and hyphenated slug e.g. "nha-nam")
      if (selectedPublisher !== 'all') {
        const normSelected = normalizeVietnameseText(selectedPublisher.replace(/-/g, ' '));
        const normBookPub = normalizeVietnameseText(book.publisher || '');
        if (!normBookPub.includes(normSelected) && !normSelected.includes(normBookPub)) return false;
      }

      // Author filter
      if (selectedAuthor !== 'all') {
        const normAuthor = normalizeVietnameseText(book.author || '');
        const normSelectedAuthor = normalizeVietnameseText(selectedAuthor);
        if (!normAuthor.includes(normSelectedAuthor)) return false;
      }

      // Rating filter
      if (selectedRating !== 'all') {
        const minRating = Number(selectedRating);
        if (!isNaN(minRating) && (book.rating ?? 0) < minRating) return false;
      }

      // Price range
      if (minP !== null && !isNaN(minP) && book.price < minP) return false;
      if (maxP !== null && !isNaN(maxP) && book.price > maxP) return false;

      // Search term (hỗ trợ tiếng Việt không dấu, tác giả, NXB, mô tả, isbn)
      if (searchTerm) {
        const rawQ = searchTerm.toLowerCase();
        const normQ = normalizeVietnameseText(searchTerm);
        const normTitle = normalizeVietnameseText(book.title || '');
        const normAuthor = normalizeVietnameseText(book.author || '');
        const normPublisher = normalizeVietnameseText(book.publisher || '');
        const normCategory = normalizeVietnameseText(book.category || '');
        const normDesc = normalizeVietnameseText(book.book?.description || '');
        const isbn = String(book.book?.isbn || '').toLowerCase();

        const match =
          normTitle.includes(normQ) ||
          normAuthor.includes(normQ) ||
          normPublisher.includes(normQ) ||
          normCategory.includes(normQ) ||
          normDesc.includes(normQ) ||
          book.title.toLowerCase().includes(rawQ) ||
          (book.author && book.author.toLowerCase().includes(rawQ)) ||
          isbn.includes(rawQ);

        if (!match) return false;
      }
      return true;
    });

    return [...matches].sort((a, b) => {
      if (selectedSort === 'popular' && a.isMock !== b.isMock) return a.isMock ? 1 : -1;
      if (selectedSort === 'price-low') return a.price - b.price;
      if (selectedSort === 'price-high') return b.price - a.price;
      if (selectedSort === 'bestseller') return parseSales(b.sales) - parseSales(a.sales);
      if (selectedSort === 'new') return String(b.id).localeCompare(String(a.id));
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  }, [allBooks, selectedCat, selectedFormat, selectedPublisher, selectedAuthor, selectedRating, minPriceParam, maxPriceParam, selectedSort, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedBooks = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredBooks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBooks, validCurrentPage]);

  const hasActiveFilters = selectedCat !== 'all' || selectedFormat !== 'all' || selectedPublisher !== 'all' || selectedAuthor !== 'all' || selectedRating !== 'all' || Boolean(minPriceParam) || Boolean(maxPriceParam) || Boolean(searchTerm);

  // Computed dynamic filters data
  const counts = useMemo(() => {
    return {
      formats: {
        all: allBooks.length,
        ebook: allBooks.filter((b) => b.hasEbook).length,
        physical: allBooks.filter((b) => b.hasPaper).length,
        hybrid: allBooks.filter((b) => b.hasEbook && b.hasPaper).length,
      },
      categories: {
        all: allBooks.length,
        selfhelp: allBooks.filter((b) => b.category === 'selfhelp').length,
        technology: allBooks.filter((b) => b.category === 'technology').length,
        business: allBooks.filter((b) => b.category === 'business').length,
        literature: allBooks.filter((b) => b.category === 'literature').length,
      },
    };
  }, [allBooks]);

  const popularAuthors = useMemo(() => {
    const authorMap: Record<string, number> = {};
    allBooks.forEach((b) => {
      const a = (b.author || '').trim();
      if (a && a !== 'Tác giả HUKI' && a.length > 2) {
        authorMap[a] = (authorMap[a] || 0) + 1;
      }
    });
    const sorted = Object.entries(authorMap).sort((a, b) => b[1] - a[1]);
    const defaultList = ['Dale Carnegie', 'James Clear', 'Yuval Noah Harari', 'Haruki Murakami', 'Rosie Nguyễn'];
    const extracted = sorted.slice(0, 5).map(([name]) => name);
    return Array.from(new Set([...extracted, ...defaultList])).slice(0, 5);
  }, [allBooks]);

  const popularPublishers = useMemo(() => {
    const pubMap: Record<string, number> = {};
    allBooks.forEach((b) => {
      const p = (b.publisher || '').trim();
      if (p && p !== 'HUKI Publisher' && p.length > 2) {
        pubMap[p] = (pubMap[p] || 0) + 1;
      }
    });
    const sorted = Object.entries(pubMap).sort((a, b) => b[1] - a[1]);
    const defaultList = ['Nhã Nam', 'NXB Trẻ', 'Alpha Books', 'First News', 'Kim Đồng'];
    const extracted = sorted.slice(0, 5).map(([name]) => name);
    return Array.from(new Set([...extracted, ...defaultList])).slice(0, 5);
  }, [allBooks]);

  const quickPriceRanges = [
    { label: 'Tất cả mức giá', min: '', max: '' },
    { label: 'Dưới 50.000₫', min: '', max: '50000' },
    { label: '50.000₫ - 100.000₫', min: '50000', max: '100000' },
    { label: '100.000₫ - 200.000₫', min: '100000', max: '200000' },
    { label: 'Trên 200.000₫', min: '200000', max: '' },
  ];

  const handleQuickPrice = (min: string, max: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (min) params.set('minPrice', min);
    else params.delete('minPrice');
    if (max) params.set('maxPrice', max);
    else params.delete('maxPrice');
    params.delete('page');
    setMinPriceInput(min);
    setMaxPriceInput(max);
    router.push(`/books?${params.toString()}`);
  };

  const isCurrentPrice = (min: string, max: string) => {
    if (!min && !max) return !minPriceParam && !maxPriceParam;
    return minPriceParam === min && maxPriceParam === max;
  };

  return (
    <div className="max-w-[1360px] w-full mx-auto px-3 sm:px-4 py-3 flex-1 flex flex-col font-sans">
      
      {/* 1. TOP CAMPAIGN BANNER (HUKI Green Signature Tone) */}
      <div className="w-full bg-gradient-to-r from-[#003b2b] via-[#005a42] to-[#01261c] rounded-lg p-3 sm:p-4 mb-4 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 relative overflow-hidden">
        <div className="z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-xs shrink-0 text-[#94f5d6]">
            <span className="material-symbols-outlined text-[20px]">auto_stories</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-[#94f5d6] text-[#003b2b] text-[10.5px] font-black px-2 py-0.5 rounded shadow-2xs uppercase tracking-wider">
                SIÊU HỘI TRI THỨC
              </span>
              <span className="text-xs font-medium text-white/90">HUKI EBOOK &amp; SÁCH GIẤY</span>
            </div>
            <h2 className="text-base sm:text-lg font-black tracking-tight mt-0.5 drop-shadow-xs">
              KHÁM PHÁ KHO SÁCH BẢN QUYỀN - ĐỌC VÀ TRẢI NGHIỆM KHÔNG GIỚI HẠN
            </h2>
          </div>
        </div>
        <div className="z-10 flex items-center gap-2 shrink-0">
          <Link
            href="/flash-sale"
            className="px-3.5 py-1.5 rounded-full bg-white text-[#003b2b] hover:bg-[#e6f4f0] font-bold text-xs shadow-md transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px] text-[#006953]">sell</span>
            <span>Săn Ngay</span>
          </Link>
        </div>
        {/* Background decorative pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 skew-x-12 pointer-events-none" />
      </div>

      {/* 2. MAIN SECTION: SIDEBAR FILTER + PRODUCT GRID */}
      <div className="grid grid-cols-12 gap-3.5 lg:gap-4 items-start">
        
        {/* === LEFT SIDEBAR: BỘ LỌC TÌM KIẾM === */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-2.5 bg-white border border-gray-200 rounded-lg p-3.5 shadow-2xs">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-900">
              Bộ Lọc Tìm Kiếm
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-[11px] font-semibold text-red-600 hover:underline cursor-pointer"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* 1. Định dạng sách */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-900 mb-2">Định Dạng Sách</h4>
            <div className="space-y-1.5 text-xs text-gray-700">
              {[
                { id: 'all', label: 'Tất cả định dạng', count: counts.formats.all },
                { id: 'ebook', label: 'Ebook Bản Quyền DRM', count: counts.formats.ebook },
                { id: 'physical', label: 'Sách Giấy In', count: counts.formats.physical },
                { id: 'hybrid', label: 'Combo Giấy + Ebook', count: counts.formats.hybrid },
              ].map((fmt) => (
                <label
                  key={fmt.id}
                  onClick={() => updateParam('format', fmt.id)}
                  className={`flex items-center justify-between cursor-pointer py-0.5 hover:text-[#003b2b] transition-colors ${
                    selectedFormat === fmt.id ? 'text-[#003b2b] font-bold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="format_filter"
                      checked={selectedFormat === fmt.id}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 accent-[#003b2b] cursor-pointer"
                    />
                    <span>{fmt.label}</span>
                  </div>
                  {fmt.count > 0 && <span className="text-[11px] text-gray-400">({fmt.count})</span>}
                </label>
              ))}
            </div>
          </div>

          {/* 2. Thể loại / Chủ đề */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-900 mb-2">Chủ Đề &amp; Thể Loại</h4>
            <div className="space-y-1.5 text-xs text-gray-700">
              {[
                { id: 'all', label: 'Tất cả chủ đề', count: counts.categories.all },
                { id: 'business', label: 'Kinh doanh & Đầu tư', count: counts.categories.business },
                { id: 'selfhelp', label: 'Phát triển bản thân', count: counts.categories.selfhelp },
                { id: 'technology', label: 'Công nghệ & AI', count: counts.categories.technology },
                { id: 'literature', label: 'Văn học & Tiểu thuyết', count: counts.categories.literature },
              ].map((cat) => (
                <label
                  key={cat.id}
                  onClick={() => updateParam('cat', cat.id)}
                  className={`flex items-center justify-between cursor-pointer py-0.5 hover:text-[#003b2b] transition-colors ${
                    selectedCat === cat.id ? 'text-[#003b2b] font-bold' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="cat_filter"
                      checked={selectedCat === cat.id}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 accent-[#003b2b] cursor-pointer"
                    />
                    <span>{cat.label}</span>
                  </div>
                  {cat.count > 0 && <span className="text-[11px] text-gray-400">({cat.count})</span>}
                </label>
              ))}
            </div>
          </div>

          {/* 3. Tác Giả */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-900 mb-2">Tác Giả</h4>
            <div className="space-y-1.5 text-xs text-gray-700">
              <label
                onClick={() => updateParam('author', 'all')}
                className={`flex items-center gap-2 cursor-pointer py-0.5 hover:text-[#003b2b] transition-colors ${
                  selectedAuthor === 'all' ? 'text-[#003b2b] font-bold' : ''
                }`}
              >
                <input
                  type="radio"
                  name="author_filter"
                  checked={selectedAuthor === 'all'}
                  onChange={() => {}}
                  className="w-3.5 h-3.5 accent-[#003b2b] cursor-pointer"
                />
                <span>Tất cả tác giả</span>
              </label>
              {popularAuthors.map((authorName) => (
                <label
                  key={authorName}
                  onClick={() => updateParam('author', authorName)}
                  className={`flex items-center gap-2 cursor-pointer py-0.5 hover:text-[#003b2b] transition-colors ${
                    selectedAuthor === authorName ? 'text-[#003b2b] font-bold' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="author_filter"
                    checked={selectedAuthor === authorName}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 accent-[#003b2b] cursor-pointer"
                  />
                  <span className="truncate">{authorName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 4. Nhà Xuất Bản */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-900 mb-2">Nhà Xuất Bản</h4>
            <div className="space-y-1.5 text-xs text-gray-700">
              <label
                onClick={() => updateParam('publisher', 'all')}
                className={`flex items-center gap-2 cursor-pointer py-0.5 hover:text-[#003b2b] transition-colors ${
                  selectedPublisher === 'all' ? 'text-[#003b2b] font-bold' : ''
                }`}
              >
                <input
                  type="radio"
                  name="publisher_filter"
                  checked={selectedPublisher === 'all'}
                  onChange={() => {}}
                  className="w-3.5 h-3.5 accent-[#003b2b] cursor-pointer"
                />
                <span>Tất cả NXB</span>
              </label>
              {popularPublishers.map((pubName) => (
                <label
                  key={pubName}
                  onClick={() => updateParam('publisher', pubName)}
                  className={`flex items-center gap-2 cursor-pointer py-0.5 hover:text-[#003b2b] transition-colors ${
                    selectedPublisher === pubName ? 'text-[#003b2b] font-bold' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="publisher_filter"
                    checked={selectedPublisher === pubName}
                    onChange={() => {}}
                    className="w-3.5 h-3.5 accent-[#003b2b] cursor-pointer"
                  />
                  <span className="truncate">{pubName}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 5. Khoảng Giá */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-900 mb-2">Khoảng Giá</h4>
            <div className="space-y-1.5 text-xs text-gray-700 mb-2.5">
              {quickPriceRanges.map((range) => {
                const active = isCurrentPrice(range.min, range.max);
                return (
                  <label
                    key={range.label}
                    onClick={() => handleQuickPrice(range.min, range.max)}
                    className={`flex items-center gap-2 cursor-pointer py-0.5 hover:text-[#003b2b] transition-colors ${
                      active ? 'text-[#003b2b] font-bold' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="price_quick_filter"
                      checked={active}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 accent-[#003b2b] cursor-pointer"
                    />
                    <span>{range.label}</span>
                  </label>
                );
              })}
            </div>
            {/* Nhập khoảng giá tùy chỉnh */}
            <form onSubmit={handleApplyPriceFilter} className="space-y-2 pt-1 border-t border-gray-100">
              <div className="text-[11px] text-gray-500">Hoặc tự nhập khoảng giá:</div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="₫ Từ"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                />
                <span className="text-gray-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="₫ Đến"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-1 text-xs text-gray-800 focus:outline-none focus:border-[#003b2b] focus:bg-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-1.5 rounded bg-[#003b2b] hover:bg-[#00281d] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Áp Dụng
              </button>
            </form>
          </div>

          {/* 6. Đánh giá (BUG-017: Material Symbols Vector Icons) */}
          <div className="py-3 border-b border-gray-100">
            <h4 className="font-bold text-xs text-gray-900 mb-2">Đánh Giá</h4>
            <div className="space-y-1 text-xs">
              {[
                { rating: 5, label: '5 sao' },
                { rating: 4, label: 'Từ 4 sao' },
                { rating: 3, label: 'Từ 3 sao' },
              ].map((r) => (
                <button
                  key={r.rating}
                  type="button"
                  onClick={() => updateParam('rating', selectedRating === String(r.rating) ? 'all' : String(r.rating))}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-left ${
                    selectedRating === String(r.rating) ? 'bg-[#e6f4f0] text-[#003b2b] font-semibold border border-[#003b2b]/30' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`material-symbols-outlined text-[15px] ${
                          star <= r.rating ? 'text-amber-400 fill' : 'text-slate-200'
                        }`}
                      >
                        {star <= r.rating ? 'star' : 'star'}
                      </span>
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-600 font-medium">{r.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 7. Nút đặt lại */}
          {hasActiveFilters && (
            <div className="pt-3">
              <button
                type="button"
                onClick={clearAllFilters}
                className="w-full py-1.5 rounded border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Đặt lại tất cả bộ lọc
              </button>
            </div>
          )}
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
              {selectedAuthor !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#e6f4f0] text-[#003b2b] text-[11px] font-medium">
                  Tác giả: {selectedAuthor}
                  <button onClick={() => updateParam('author', 'all')} className="hover:opacity-75 cursor-pointer"><span className="material-symbols-outlined text-[12px]">close</span></button>
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
            <div className="flex flex-col gap-6">
              <EmptyState
                icon="search_off"
                title="Không tìm thấy sản phẩm phù hợp"
                description={searchTerm ? `Không tìm thấy sách nào cho từ khóa "${searchTerm}". Hãy thử từ khóa khác hoặc tham khảo các gợi ý dưới đây.` : "Hãy thử từ khóa khác hoặc xóa bớt tiêu chí lọc."}
                actionText="Xóa tất cả bộ lọc"
                actionLink="/books"
                actionIcon="tune"
              />
              <div className="mt-4">
                <PersonalizedForYouSection
                  title="Gợi ý tương tự cho bạn"
                  subtitle="Dựa trên thể loại yêu thích và các từ khóa tìm kiếm gần đây của bạn"
                  currentSearchQuery={searchTerm}
                  limit={10}
                />
              </div>
            </div>
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

              {/* Personalized recommendations row */}
              <div className="mt-8 pt-4 border-t border-gray-100">
                <PersonalizedForYouSection
                  title={searchTerm ? `Gợi ý tương tự cho "${searchTerm}"` : `Gợi ý cho bạn`}
                  subtitle="Được cá nhân hóa thông minh dựa trên lịch sử tìm kiếm và sở thích đọc sách của bạn"
                  currentSearchQuery={searchTerm}
                  excludeBookIds={new Set(paginatedBooks.map((b) => b.id))}
                  limit={10}
                />
              </div>
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
