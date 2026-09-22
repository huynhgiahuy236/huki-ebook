"use client";

import React, { Suspense, useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import BookCard from '@/ui/components/common/BookCard';
import EmptyState from '@/ui/components/common/EmptyState';
import { catalogApi, type BookData } from '@/ui/api/catalogApi';

const ITEMS_PER_PAGE = 8;

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
}

function CatalogPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const topGridRef = useRef<HTMLDivElement>(null);

  const selectedCat = searchParams.get('cat') || searchParams.get('category') || 'all';
  const selectedFormat = searchParams.get('format') || 'all';
  const selectedSort = searchParams.get('sort') || 'popular';
  const searchQuery = searchParams.get('q') || searchParams.get('search') || '';
  const currentPageParam = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = isNaN(currentPageParam) || currentPageParam < 1 ? 1 : currentPageParam;

  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [realBooks, setRealBooks] = useState<BookData[]>([]);
  const [, setIsLoadingRealBooks] = useState(true);

  useEffect(() => {
    let isMounted = true;
    catalogApi.getPublicBooks({ limit: 50 })
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
  }, [searchQuery]);

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

  const handlePageChange = (newPage: number) => {
    updateParam('page', newPage === 1 ? null : String(newPage));
    if (topGridRef.current) {
      topGridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const mockBooksList = useMemo<CatalogBookItem[]>(
    () => [
      { id: 'atomic-habits', title: 'Atomic Habits - Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ', author: 'James Clear', publisher: 'Alpha Books', category: 'selfhelp', format: 'Ebook', formatType: 'ebook', price: 79000, originalPrice: 119000, discount: '-34%', rating: 4.9, sales: '8.6k', cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDLJxGEmdyoWHJaML4r0fjhy-pwbtgp7K9qLyLsNNwNW286Ktk5gQ-3VewcqEla5ymD3ZNzwg7t1y-2PsIQb7yPIkcGwQuERA0Itq1qT5O14aEGSG876FleaCfm62Nj1OzUPgxPhlX-QKiAyyYKMfpj0ngsjKpXuJNURlFyrrOkB5mNkkWUW3yBSioWXpa0PnnvHWBhGsbkGPa8eMhu8Bv7eGGni1sRI3qinMFFmeNBDbZQfyyZB0ubsA', isMock: true },
      { id: 'nha-gia-kim', title: 'Nhà Giả Kim (The Alchemist)', author: 'Paulo Coelho', publisher: 'Nhã Nam', category: 'literature', format: 'Combo', formatType: 'hybrid', price: 64000, originalPrice: 80000, discount: '-20%', rating: 5.0, sales: '9.2k', cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNSJv8WbQTwJya636_FW0mYshlMn8ZpW5DfTmCp3q_pz4q9n5jP3hiiK3mafekUIWZ4se4a15jzeHs71mnK4Mviw5CtTeXeiMfOy_D7OQY08FMOEvWoMRV_yHkKNkWgtp3-9ssDhlPZWDF47EM35t0qWNVVwHzwqTo3ic5EjVPrw5a8l3rlNpdZ4cU3R2LgXrZCzqw-9l1_d2KZaINmahY_3bxKAudtwN7-VybtwPcyEU6QBBbn5z-Fw', isMock: true },
      { id: 'tu-duy-nhanh-va-cham', title: 'Tư Duy Nhanh Và Chậm (Thinking, Fast and Slow)', author: 'Daniel Kahneman', publisher: 'Alpha Books', category: 'business', format: 'Ebook', formatType: 'ebook', price: 139000, originalPrice: 199000, discount: '-30%', rating: 4.8, sales: '3.1k', cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAs4TOGpw97Vnc6jgkJQMlOiU7qkOiSmZMU8P6YK_c_Xv4yyyh5kcdgWdNcmp_7lzHDU83XTVXrEQfQ_DPSN-Mp9dSA0MQApwu8ZLxoCWnLRzqWiFkVvWX2RVAkwZvps1dOv0-yTu-_yB4018zA1AdeR8PRZO-z44u04brEkbSH_KBxSDPYogcbHMroUxaLZGIV609Be_tEY3scjX_tvWAlaSAs_WqnVoLBT2e7gBWeTaofdU_B8QdTww', isMock: true },
      { id: 'tam-ly-hoc-ve-tien', title: 'Tâm Lý Học Về Tiền (The Psychology of Money)', author: 'Morgan Housel', publisher: 'NXB Trẻ', category: 'business', format: 'Sách giấy', formatType: 'physical', price: 92000, originalPrice: 108000, discount: '-15%', rating: 4.9, sales: '5.4k', cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC7ouqQ7elIuGRHZ7rj7l5cYrPzWtVWXyk8F3s9fBkQf8lEZFMOCpZ1WNMWOVoN5Uy13M3ZCCtm0Kp6qODtQ3a5mAu81yactomECdD4kLkkrlCvqEPHOgvwES7pkRYwgFiAN7MHH3veqNbCNbdX5MfzYRgsIN5CRugb_eWd0jzg2YPAWJlzYTmoYx-QBxSmQa0tUxtsTK7oDOF1qSFqUnhLUn91MXUytXRomvOwDXqwzBlH_CfbqtBLxg', isMock: true },
      { id: 'deep-work', title: 'Deep Work - Làm Ra Làm, Chơi Ra Chơi', author: 'Cal Newport', publisher: 'Alpha Books', category: 'selfhelp', format: 'Ebook', formatType: 'ebook', price: 112000, originalPrice: 140000, discount: '-20%', rating: 4.8, sales: '2.9k', cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-Td_fncjsrtfhP7pD1zoyow8X0cbRu6_n_thngTwB6nLhuC7eqp1Pd51OhQUdL5VFM-pFQHaRRHrxlicYEZOTgkzJDiL3_QUDrKQSgoawjEqamxNDNc-uoZAhi3U_D_vCsLO5lkm_oUjQbWeVl0xqSwQuzfubBlRvSLA7o3cEOKFyI7Q_vXNj5PHG1cdctYb2ECJPxHkHvyCQdVC1NQ3PlkWtsGi4eIvk2UDDHzeKGT6zlcIK_leb6A', isMock: true },
      { id: 'clean-code', title: 'Clean Code - Mã Sạch Trong Lập Trình Phần Mềm', author: 'Robert C. Martin', publisher: 'Alpha Books', category: 'technology', format: 'Sách giấy', formatType: 'physical', price: 225000, originalPrice: 275000, discount: '-18%', rating: 4.9, sales: '1.6k', cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDYD__UmCCqKlTM22GbDoPZqtdjw0iEjqWN6T80ZcIMdl-FMIkOxY5vWGs7tcVfInEqG4TCljslu--bVITD9IuFq1v5dawGTDsIGZPWRaPQrMMPb-8S0YiEtKVlkjyvMqezW4xZawW-TEEqMzhxNvfUfSf-YrEvSo-w0DQW-ks8Vlt9o5RyACER1nuaSKnPGpT0tS8AcA1qv2a3ZmvjsRRZVxCZcBxkeUwE-8JGDpb9W71CLFOlv1BIhg', isMock: true },
      { id: 'dam-bi-ghet', title: 'Dám Bị Ghét (The Courage to Be Disliked)', author: 'Kishimi Ichiro, Koga Fumitake', publisher: 'Nhã Nam', category: 'selfhelp', format: 'Combo', formatType: 'hybrid', price: 89000, originalPrice: 115000, discount: '-22%', rating: 4.8, sales: '4.1k', cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBDv1JdME3PJnFHb-TdqnRjNsNPr9SMcBhVNpimC-ikDBPmeI_JCpp77WbxFZ9ryp3D2HSWLKM79oY8gT3wtpuB5fUQxoDZ3PXC7y9iDwvYOw1xkPGGyCWF-6nNwrcgakfFjFPLzIZhRwBW8S4GF4m2a0PxJdsQa5xK1L9MeD3iXNJ5lc7ZIY-r7SzZ1xDbxVb3JYeXfMruiAK9qaUg_v8OzYUgR-HW8j73LGNwq0xUpPs_BGf6sgMSdA', isMock: true },
      { id: 'sapiens', title: 'Sapiens: Lược Sử Loài Người', author: 'Yuval Noah Harari', publisher: 'Nhã Nam', category: 'literature', format: 'Ebook', formatType: 'ebook', price: 145000, originalPrice: 195000, discount: '-25%', rating: 4.9, sales: '6.7k', cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVtbO0fbu_8b9geTD9ziXMlIqLZMCpTBEvBf0qOCnOlNDbsbRdunucqKd3rfBkDm7Uzj20MFU8ehNJiY-0vkw2zV8g0q_Wf2PXklSNO1745JwGPynDsJj4YB2ranVzQKLm1m4GZQoPS99U-fPeR1ErYzxThCf9ylQWFuJ4g3018BL9iME7qHokMxZ5g0O8XmJDSxjJIqiAwjzlJg390f3eYwePhtIsM36z2M4P7jk2FUrMfX3oiGPB-Q', isMock: true },
    ],
    []
  );

  const allBooks = useMemo<CatalogBookItem[]>(() => {
    const formattedRealBooks: CatalogBookItem[] = realBooks.map((rb) => {
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
      };
    });
    return [...formattedRealBooks, ...mockBooksList];
  }, [realBooks, mockBooksList]);

  const categoryCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = { all: allBooks.length, selfhelp: 0, technology: 0, business: 0, literature: 0 };
    allBooks.forEach((b) => {
      if (counts[b.category] !== undefined) {
        counts[b.category]++;
      } else {
        counts[b.category] = 1;
      }
    });
    return counts;
  }, [allBooks]);

  const filteredBooks = useMemo(() => {
    const matches = allBooks.filter((book) => {
      if (selectedCat !== 'all') {
        const catMap: Record<string, string> = { 'van-hoc': 'literature', 'kinh-te': 'business', 'ky-nang': 'selfhelp', 'cong-nghe': 'technology' };
        const normalizedSelected = catMap[selectedCat] || selectedCat;
        if (book.category !== normalizedSelected) return false;
      }
      if (selectedFormat === 'ebook' && book.formatType !== 'ebook') return false;
      if (selectedFormat === 'physical' && book.formatType !== 'physical') return false;
      if (selectedFormat === 'hybrid' && book.formatType !== 'hybrid') return false;
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
  }, [allBooks, selectedCat, selectedFormat, selectedSort, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / ITEMS_PER_PAGE));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedBooks = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredBooks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBooks, validCurrentPage]);

  return (
    <div className="max-w-[1680px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
      <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-4">
        <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">home</span>Trang chủ
        </Link>
        <span className="material-symbols-outlined text-[13px]">chevron_right</span>
        <span className="text-on-surface font-semibold">Tất cả sách & Ebook</span>
      </nav>

      <section className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-outline-variant/30">
        <div>
          <span className="text-primary font-bold text-xs tracking-widest uppercase mb-1 block">Khám phá kho tàng tri thức</span>
          <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-on-surface tracking-tight flex items-baseline gap-3">
            Tất Cả Sách & Ấn Phẩm Số
            <span className="font-sans text-xs font-normal text-on-surface-variant">({filteredBooks.length} sản phẩm phù hợp)</span>
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-1 max-w-2xl leading-relaxed">
            Khám phá những đầu sách nổi bật từ các nhà xuất bản hàng đầu. Trải nghiệm kết hợp hoàn hảo giữa ấn bản Ebook DRM và Sách in cao cấp.
          </p>
        </div>
        <div className="w-full md:w-[360px] shrink-0">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-3.5 text-on-surface-variant text-[18px]">search</span>
            <input value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); updateParam('q', e.target.value); }} className="w-full h-10 pl-10 pr-4 rounded-xl bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary shadow-2xs transition-all" placeholder="Tìm theo tựa sách, tác giả..." type="text" />
          </div>
        </div>
      </section>

      <button type="button" onClick={() => setIsFilterOpen((value) => !value)} className="mb-4 flex min-h-11 w-full items-center justify-between rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-sm font-semibold text-on-surface lg:hidden" aria-expanded={isFilterOpen} aria-controls="catalog-filters">
        <span className="flex items-center gap-2"><span className="material-symbols-outlined" aria-hidden="true">tune</span>Bộ lọc sách</span>
        <span className="material-symbols-outlined" aria-hidden="true">{isFilterOpen ? 'expand_less' : 'expand_more'}</span>
      </button>

      <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
        <aside id="catalog-filters" className={`${isFilterOpen ? 'block' : 'hidden'} col-span-12 lg:col-span-4 xl:col-span-3 lg:block bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 sm:p-5 shadow-xs lg:sticky lg:top-28`}>
          <div className="flex items-center justify-between pb-3.5 border-b border-outline-variant/20">
            <div className="flex items-center gap-2 font-bold text-sm text-on-surface">
              <span className="material-symbols-outlined text-primary text-[19px]">tune</span><span>Bộ Lọc Sách</span>
            </div>
            {(selectedCat !== 'all' || selectedFormat !== 'all' || searchTerm) && (
              <button onClick={() => router.push('/books')} className="text-[11px] font-semibold text-primary hover:underline px-2 py-0.5 rounded-md hover:bg-primary/10 transition-colors cursor-pointer">Xóa bộ lọc</button>
            )}
          </div>

          <div className="py-3.5 border-b border-outline-variant/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Định dạng</h3>
              {selectedFormat !== 'all' && <button onClick={() => updateParam('format', 'all')} className="text-[10px] text-primary hover:underline cursor-pointer">Mặc định</button>}
            </div>
            <div className="space-y-1 text-xs">
              {[{ id: 'all', name: 'Tất cả định dạng', icon: 'apps' }, { id: 'ebook', name: 'Ebook DRM Bản Quyền', icon: 'bolt' }, { id: 'physical', name: 'Sách Giấy Bìa Mềm', icon: 'menu_book' }, { id: 'hybrid', name: 'Combo Hybrid (Giấy + Ebook)', icon: 'auto_stories' }].map((fmt) => (
                <button key={fmt.id} type="button" onClick={() => updateParam('format', fmt.id)} className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all duration-150 cursor-pointer ${selectedFormat === fmt.id ? 'bg-primary/10 text-primary font-bold border border-primary/25 shadow-2xs' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border border-transparent'}`}>
                  <span className="flex items-center gap-2"><span className={`material-symbols-outlined text-[17px] ${selectedFormat === fmt.id ? 'text-primary' : 'text-on-surface-variant'}`}>{fmt.icon}</span><span>{fmt.name}</span></span>
                  {selectedFormat === fmt.id && <span className="material-symbols-outlined text-primary text-[15px]">check</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="py-3.5 border-b border-outline-variant/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant">Chủ đề</h3>
              {selectedCat !== 'all' && <button onClick={() => updateParam('cat', 'all')} className="text-[10px] text-primary hover:underline cursor-pointer">Mặc định</button>}
            </div>
            <div className="space-y-1 text-xs">
              {[{ id: 'all', name: 'Tất cả chủ đề', count: categoryCounts.all || 0 }, { id: 'selfhelp', name: 'Phát triển bản thân', count: categoryCounts.selfhelp || 0 }, { id: 'technology', name: 'Công nghệ & AI', count: categoryCounts.technology || 0 }, { id: 'business', name: 'Kinh doanh & Đầu tư', count: categoryCounts.business || 0 }, { id: 'literature', name: 'Văn học & Nghệ thuật', count: categoryCounts.literature || 0 }].map((cat) => (
                <button key={cat.id} type="button" onClick={() => updateParam('cat', cat.id)} className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all duration-150 cursor-pointer ${selectedCat === cat.id ? 'bg-primary/10 text-primary font-bold border border-primary/25 shadow-2xs' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface border border-transparent'}`}>
                  <span className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${selectedCat === cat.id ? 'bg-primary scale-125' : 'bg-outline-variant'}`}></span><span>{cat.name}</span></span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${selectedCat === cat.id ? 'bg-primary/15 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{cat.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3.5">
            <h3 className="font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-2">Nhà xuất bản</h3>
            <div className="space-y-1 text-xs text-on-surface-variant">
              {[{ slug: 'alpha-books', name: 'Alpha Books', count: '420' }, { slug: 'nha-nam', name: 'Nhã Nam', count: '315' }, { slug: 'first-news', name: 'First News Trí Việt', count: '280' }, { slug: 'nxb-tre', name: 'NXB Trẻ', count: '190' }].map((pub) => (
                <Link key={pub.slug} href={`/shop/${pub.slug}`} className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-surface-container-low hover:text-primary transition-all group">
                  <span className="group-hover:translate-x-0.5 transition-transform">{pub.name}</span>
                  <span className="text-[10px] font-semibold bg-surface-container group-hover:bg-primary/10 group-hover:text-primary px-1.5 py-0.2 rounded-full text-on-surface-variant transition-colors">{pub.count}</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

        <section ref={topGridRef} className="col-span-12 lg:col-span-8 xl:col-span-9 flex flex-col">
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl px-4 py-2.5 mb-5 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-semibold text-on-surface pr-2 border-r border-outline-variant/30">{filteredBooks.length} kết quả</span>
              {selectedCat !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[11px]">
                  Chủ đề: {selectedCat}<button onClick={() => updateParam('cat', 'all')} aria-label="Xóa bộ lọc chủ đề"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
              {selectedFormat !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[11px]">
                  Định dạng: {selectedFormat}<button onClick={() => updateParam('format', 'all')} aria-label="Xóa bộ lọc định dạng"><span className="material-symbols-outlined text-[13px]">close</span></button>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-on-surface-variant">Sắp xếp:</span>
                <select value={selectedSort} onChange={(e) => updateParam('sort', e.target.value)} className="bg-surface-container-low border border-outline-variant/40 rounded-lg py-1 px-2 text-xs font-semibold text-on-surface focus:outline-none focus:border-primary cursor-pointer">
                  <option value="popular">Phổ biến nhất</option><option value="bestseller">Bán chạy nhất</option><option value="new">Mới phát hành</option><option value="price-low">Giá: Thấp đến Cao</option><option value="price-high">Giá: Cao đến Thấp</option>
                </select>
              </div>
              <div className="flex items-center bg-surface-container-low p-0.5 rounded-lg border border-outline-variant/30">
                <button onClick={() => setViewMode('grid')} className={`p-1 rounded cursor-pointer ${viewMode === 'grid' ? 'bg-white text-primary shadow-2xs font-bold' : 'text-on-surface-variant'}`} title="Hiển thị lưới" aria-label="Hiển thị lưới"><span className="material-symbols-outlined text-[16px]">grid_view</span></button>
                <button onClick={() => setViewMode('list')} className={`p-1 rounded cursor-pointer ${viewMode === 'list' ? 'bg-white text-primary shadow-2xs font-bold' : 'text-on-surface-variant'}`} title="Hiển thị danh sách" aria-label="Hiển thị danh sách"><span className="material-symbols-outlined text-[16px]">view_list</span></button>
              </div>
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <EmptyState icon="search_off" title="Không tìm thấy sách phù hợp" description="Hãy thử từ khóa khác hoặc xóa bớt bộ lọc đang chọn để tìm thêm nhiều đầu sách hấp dẫn." actionText="Xóa tất cả bộ lọc" actionLink="/books" actionIcon="tune" />
          ) : (
            <>
              <div className={viewMode === 'grid' ? "grid grid-cols-2 min-[540px]:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-5" : "flex flex-col gap-3"}>
                {paginatedBooks.map((book) => (
                  <BookCard key={book.id} book={book} variant={viewMode} isMock={book.isMock} />
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-8 pt-5 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-on-surface-variant">Hiển thị <span className="font-semibold text-on-surface">{(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-semibold text-on-surface">{Math.min(validCurrentPage * ITEMS_PER_PAGE, filteredBooks.length)}</span> trong tổng số <span className="font-semibold text-on-surface">{filteredBooks.length}</span> sách</div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" disabled={validCurrentPage <= 1} onClick={() => handlePageChange(validCurrentPage - 1)} className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer" aria-label="Trang trước"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button key={p} type="button" onClick={() => handlePageChange(p)} className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${p === validCurrentPage ? 'bg-primary text-white shadow-xs scale-105' : 'border border-outline-variant/40 text-on-surface hover:bg-surface-container-low'}`}>{p}</button>
                    ))}
                    <button type="button" disabled={validCurrentPage >= totalPages} onClick={() => handlePageChange(validCurrentPage + 1)} className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer" aria-label="Trang sau"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
                  </div>
                </div>
              )}
            </>
          )}

          <div style={{ background: 'linear-gradient(to right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #006B4F), var(--theme-hero-to, #124E3F))' }} className="my-8 rounded-2xl p-6 text-white relative overflow-hidden shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/15 text-white border border-white/20 mb-2 uppercase"><span className="material-symbols-outlined text-[12px]">auto_awesome</span> Tuyển Chọn Tháng 2026</span>
              <h3 className="font-editorial text-xl font-bold">Combo Tủ Sách Phát Triển Bản Thân & Kỷ Luật Thói Quen</h3>
              <p className="text-xs opacity-85 mt-1 leading-relaxed">Nhận ngay Ebook bản quyền trọn đời + Sách in giấy ivory tặng kèm hộp quà HUKI Gift Box.</p>
            </div>
            <Link href="/book/atomic-habits" className="px-5 py-2.5 rounded-xl bg-white text-[var(--theme-primary,#003B2B)] font-bold text-xs shadow-xs hover:bg-surface-container transition-colors flex-shrink-0 z-10">Xem Chi Tiết Combo</Link>
            <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-[110px] text-white/10 pointer-events-none">auto_stories</span>
          </div>
        </section>
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
