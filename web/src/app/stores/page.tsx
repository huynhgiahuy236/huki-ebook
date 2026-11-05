'use client';

import React, { useCallback, useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { businessApi, type BusinessData } from '@/ui/api/businessApi';
import { catalogApi } from '@/ui/api/catalogApi';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';

// Số lượng phần tử mỗi trang
const PUBLISHERS_PER_PAGE = 6;
const AUTHORS_PER_PAGE = 8;

interface AuthorItem {
  id: string;
  name: string;
  title: string;
  avatar: string;
  coverBg: string;
  followersCount: string;
  worksCount: number;
  rating: number;
  category: string;
  description: string;
  notableWorks: string[];
  isVerified: boolean;
  isMock: boolean;
}

interface PublisherItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  logo: string | null;
  banner: string;
  rating: number;
  reviewsCount: string;
  followersCount: string;
  totalBooks: number;
  description: string;
  address: string;
  responseRate: string;
  isVerified: boolean;
  isMock: boolean;
}

function StoresContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { isLoggedIn } = useAuth();

  const activeTab = searchParams.get('tab') === 'authors' ? 'authors' : 'publishers';
  const searchQuery = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || 'all';
  const filterFollowing = searchParams.get('filter') === 'following';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [realBusinesses, setRealBusinesses] = useState<BusinessData[]>([]);
  const [realAuthors, setRealAuthors] = useState<AuthorItem[]>([]);
  const [catalogBooks, setCatalogBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingAuthors, setIsLoadingAuthors] = useState(true);

  // 1. Tải toàn bộ sách catalog để tính số lượng sách và tác phẩm thật 100%
  const loadBooks = useCallback(async () => {
    try {
      const res = await catalogApi.getPublicBooks({ limit: 1000 });
      if (res && res.success && res.data) {
        const list = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
        setCatalogBooks(list);
        return list;
      }
    } catch (err) {
      console.warn('Failed to load catalog books for stores:', err);
    }
    return [];
  }, []);

  // 2. Tải tác giả thật từ database và liên kết số tác phẩm từ catalog sách
  const loadAuthors = useCallback(async (currentBooks?: any[]) => {
    setIsLoadingAuthors(true);
    try {
      const [res, booksList] = await Promise.all([
        catalogApi.getAuthors(),
        currentBooks && currentBooks.length > 0 ? Promise.resolve(currentBooks) : catalogApi.getPublicBooks({ limit: 1000 }).then(r => (r && r.data ? (Array.isArray(r.data) ? r.data : (r.data as any).data || []) : [])),
      ]);

      if (res && res.data && Array.isArray(res.data)) {
        const mapped: AuthorItem[] = res.data.map((a: any, idx: number) => {
          const authorBooks = (booksList || []).filter((b: any) => {
            const authorId = b.authorId || b.author_id;
            const authorName = typeof b.author === 'string' ? b.author : b.author?.name;
            return (
              (authorId && authorId === a.id) ||
              (authorName && a.name && authorName.toLowerCase().includes(a.name.toLowerCase()))
            );
          });

          const worksCount = authorBooks.length;
          const notableWorks = authorBooks.slice(0, 3).map((b: any) => b.title);
          const avgRating = worksCount > 0
            ? Number((authorBooks.reduce((sum: number, b: any) => sum + (Number(b.rating) || 5), 0) / worksCount).toFixed(1))
            : 5.0;

          return {
            id: a.id,
            name: a.name,
            title: a.bio ? 'Tác giả' : 'Tác giả HUKI',
            avatar: a.avatar || '',
            coverBg: idx % 3 === 0 ? 'from-emerald-600/20 to-teal-900/10' : idx % 3 === 1 ? 'from-amber-600/20 to-amber-900/10' : 'from-blue-600/20 to-blue-900/10',
            followersCount: worksCount > 0 ? `${worksCount} tác phẩm` : 'Tác giả',
            worksCount: worksCount,
            rating: avgRating,
            category: 'Văn học & Tri thức',
            description: a.bio || (worksCount > 0 ? `Đã xuất bản ${worksCount} tác phẩm trên nền tảng HUKI.` : 'Tác giả tham gia xuất bản tác phẩm trên nền tảng HUKI.'),
            notableWorks: notableWorks,
            isVerified: true,
            isMock: false,
          };
        });
        setRealAuthors(mapped);
      }
    } catch (err) {
      console.warn('Failed to load authors:', err);
    } finally {
      setIsLoadingAuthors(false);
    }
  }, []);

  const [followedIds, setFollowedIds] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem('huki_followed_stores');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // Đồng bộ searchInput khi URL q thay đổi từ bên ngoài
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // 3. Tải danh sách Doanh nghiệp/NXB thực tế từ backend
  const loadBusinesses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await businessApi.getPublicBusinesses({ limit: 100 });
      const rawList = Array.isArray(res?.data)
        ? res.data
        : (Array.isArray((res?.data as any)?.data) ? (res.data as any).data : []);
      if (rawList.length > 0) {
        setRealBusinesses(rawList);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, []);

  // 4. Tải danh sách ID đã theo dõi từ backend nếu đã đăng nhập
  const loadFollowed = useCallback(async () => {
    let localMap: Record<string, boolean> = {};
    try {
      const raw = localStorage.getItem('huki_followed_stores');
      if (raw) localMap = JSON.parse(raw);
    } catch {
      localMap = {};
    }

    if (isLoggedIn) {
      try {
        const res = await businessApi.getMyFollowedBusinessIds();
        if (res && res.success && Array.isArray(res.data)) {
          const merged = { ...localMap };
          res.data.forEach(id => {
            merged[id] = true;
          });
          setFollowedIds(merged);
          try {
            localStorage.setItem('huki_followed_stores', JSON.stringify(merged));
          } catch { }
          return;
        }
      } catch {
        // Fallback to local
      }
    }
    setFollowedIds(localMap);
  }, [isLoggedIn]);

  useEffect(() => {
    loadBooks().then((books) => {
      loadAuthors(books);
    });
    loadBusinesses();
    loadFollowed();
  }, [loadBooks, loadAuthors, loadBusinesses, loadFollowed]);

  const updateQueryParams = useCallback((updater: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    updater(next);
    router.push(`/stores?${next.toString()}`);
  }, [router, searchParams]);

  // Hợp nhất danh sách NXB từ Doanh nghiệp & Gian hàng thực tế 100% từ Database
  const combinedAllPublishers = useMemo<PublisherItem[]>(() => {
    const combined: PublisherItem[] = [];

    realBusinesses.forEach(biz => {
      if (biz.stores && biz.stores.length > 0) {
        biz.stores.forEach(st => {
          const storeBooks = catalogBooks.filter(b => {
            const sId = b.storeId || (b as any).store_id;
            const pId = b.publisherId || (b as any).publisher_id;
            const bId = b.businessId || (b as any).business_id;
            return sId === st.id || pId === st.id || bId === biz.id || sId === biz.id;
          });
          const totalBooks = storeBooks.length;

          combined.push({
            id: st.id,
            name: st.name,
            slug: st.slug || st.id,
            category: 'Nhà Xuất Bản & Đối Tác',
            logo: st.logo || null,
            banner: st.banner || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
            rating: 5.0,
            reviewsCount: 'Mới',
            followersCount: followedIds[st.id] ? 'Đang theo dõi' : (totalBooks > 0 ? `${totalBooks} ấn phẩm` : 'Gian hàng'),
            totalBooks: totalBooks,
            description: biz.description || 'Gian hàng chính hãng đã được xác thực giấy phép xuất bản bởi HUKI.',
            address: biz.address || 'Việt Nam',
            responseRate: '100%',
            isVerified: true,
            isMock: false,
          });
        });
      } else {
        const storeBooks = catalogBooks.filter(b => {
          const sId = b.storeId || (b as any).store_id;
          const pId = b.publisherId || (b as any).publisher_id;
          const bId = b.businessId || (b as any).business_id;
          return sId === biz.id || pId === biz.id || bId === biz.id;
        });
        const totalBooks = storeBooks.length;

        combined.push({
          id: biz.id,
          name: biz.name,
          slug: biz.slug || biz.id,
          category: 'Doanh nghiệp Xuất bản',
          logo: biz.logo || null,
          banner: biz.banner || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
          rating: 5.0,
          reviewsCount: 'Mới',
          followersCount: followedIds[biz.id] ? 'Đang theo dõi' : (totalBooks > 0 ? `${totalBooks} ấn phẩm` : 'Gian hàng'),
          totalBooks: totalBooks,
          description: biz.description || 'Gian hàng chính hãng đã được xác thực giấy phép xuất bản bởi HUKI.',
          address: biz.address || 'Việt Nam',
          responseRate: '100%',
          isVerified: true,
          isMock: false,
        });
      }
    });

    return combined;
  }, [realBusinesses, catalogBooks, followedIds]);

  // Danh sách NXB sau khi lọc
  const publishersList = useMemo(() => {
    let list = combinedAllPublishers;

    if (filterFollowing) {
      list = list.filter(pub => Boolean(followedIds[pub.id] || (pub.slug && followedIds[pub.slug])));
    }

    return list.filter(pub => {
      const matchSearch = !searchQuery ||
        pub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pub.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || pub.category.toLowerCase().includes(selectedCategory.toLowerCase());
      return matchSearch && matchCat;
    });
  }, [combinedAllPublishers, filterFollowing, followedIds, searchQuery, selectedCategory]);

  const followedPublishersCount = useMemo(() => {
    return combinedAllPublishers.filter(p => Boolean(followedIds[p.id] || (p.slug && followedIds[p.slug]))).length;
  }, [combinedAllPublishers, followedIds]);

  // Danh sách tác giả lọc từ CSDL thực tế (BUG-018)
  const authorsList = useMemo(() => {
    let list = realAuthors;
    if (filterFollowing) {
      list = list.filter(author => Boolean(followedIds[author.id]));
    }

    return list.filter(author => {
      const matchSearch = !searchQuery ||
        author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        author.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || author.category.toLowerCase().includes(selectedCategory.toLowerCase());
      return matchSearch && matchCat;
    });
  }, [realAuthors, filterFollowing, followedIds, searchQuery, selectedCategory]);

  const followedAuthorsCount = useMemo(() => {
    return realAuthors.filter(a => Boolean(followedIds[a.id])).length;
  }, [realAuthors, followedIds]);

  // Phân trang dữ liệu
  const currentItems = activeTab === 'publishers' ? publishersList : authorsList;
  const itemsPerPage = activeTab === 'publishers' ? PUBLISHERS_PER_PAGE : AUTHORS_PER_PAGE;
  const totalPages = Math.ceil(currentItems.length / itemsPerPage) || 1;
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedPublishers = useMemo(() => {
    const startIndex = (validPage - 1) * PUBLISHERS_PER_PAGE;
    return publishersList.slice(startIndex, startIndex + PUBLISHERS_PER_PAGE);
  }, [publishersList, validPage]);

  const paginatedAuthors = useMemo(() => {
    const startIndex = (validPage - 1) * AUTHORS_PER_PAGE;
    return authorsList.slice(startIndex, startIndex + AUTHORS_PER_PAGE);
  }, [authorsList, validPage]);

  const handlePageChange = (newPage: number) => {
    updateQueryParams((p) => p.set('page', String(newPage)));
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  const handleTabChange = (tabName: string) => {
    updateQueryParams((p) => {
      p.set('tab', tabName);
      p.delete('page');
      p.delete('category');
    });
  };

  const updateFilterFollowing = (isFollowing: boolean) => {
    updateQueryParams((p) => {
      if (isFollowing) {
        p.set('filter', 'following');
      } else {
        p.delete('filter');
      }
      p.delete('page');
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParams((p) => {
      if (searchInput.trim()) {
        p.set('q', searchInput.trim());
      } else {
        p.delete('q');
      }
      p.delete('page');
    });
  };

  const updateCategory = (cat: string) => {
    updateQueryParams((p) => {
      if (cat === 'all') {
        p.delete('category');
      } else {
        p.set('category', cat);
      }
      p.delete('page');
    });
  };

  const toggleFollow = async (id: string, name: string, isMock = false, slug: string | null = null) => {
    const isCurrentlyFollowed = Boolean(followedIds[id] || (slug && followedIds[slug]));
    const nextState = !isCurrentlyFollowed;

    setFollowedIds(prev => {
      const updated = { ...prev };
      if (nextState) {
        updated[id] = true;
        if (slug) updated[slug] = true;
      } else {
        delete updated[id];
        if (slug) delete updated[slug];
      }
      try {
        localStorage.setItem('huki_followed_stores', JSON.stringify(updated));
      } catch { }
      return updated;
    });

    if (nextState) {
      showToast(`Đã theo dõi ${name}! Bạn sẽ nhận được thông báo sách mới phát hành.`, 'success');
    } else {
      showToast(`Đã bỏ theo dõi ${name}.`, 'info');
    }

    if (isLoggedIn && !isMock) {
      try {
        if (nextState) {
          await businessApi.followBusiness(id);
        } else {
          await businessApi.unfollowBusiness(id);
        }
      } catch (err) {
        console.warn('Sync follow to backend failed:', err);
      }
    }
  };

  return (
    <main className="min-h-screen bg-surface-container-lowest pb-16 w-full max-w-full min-w-0 overflow-x-clip">
      {/* HERO BANNER */}
      <section className="relative bg-gradient-to-r from-primary to-primary-container text-white py-12 px-4 sm:px-6 lg:px-8 overflow-hidden shadow-sm">
        {/* BUG-014: Removed overflow blur-3xl decorative orbs */}

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-tertiary-fixed text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-3">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                Không Gian Tinh Hoa Bản Quyền
              </span>
              <h1 className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">
                Nhà Xuất Bản &amp; Tác Giả Đồng Hành
              </h1>
              <p className="text-white/80 text-sm sm:text-base leading-relaxed">
                Khám phá hệ sinh thái hơn 50+ Nhà xuất bản chính hãng, Doanh nghiệp phát hành cùng đội ngũ tác giả danh tiếng trong nước và quốc tế trên nền tảng HuKi Ebook.
              </p>
            </div>

            {/* Hub Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 text-center">
                <span className="block font-editorial text-2xl font-bold text-tertiary-fixed">
                  {combinedAllPublishers.length}+
                </span>
                <span className="text-[11px] text-white/75 font-medium">NXB &amp; Doanh Nghiệp</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 text-center">
                <span className="block font-editorial text-2xl font-bold text-tertiary-fixed">150+</span>
                <span className="text-[11px] text-white/75 font-medium">Tác Giả &amp; Dịch Giả</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/15 text-center col-span-2 sm:col-span-1">
                <span className="block font-editorial text-2xl font-bold text-tertiary-fixed">100%</span>
                <span className="text-[11px] text-white/75 font-medium">Sách Bản Quyền DRM</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HUB NAVIGATION TABS & SEARCH CONTROLS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Segment Tabs */}
          <div className="flex items-center gap-2 border-b md:border-b-0 border-outline-variant/30 pb-3 md:pb-0 overflow-x-auto w-full max-w-full min-w-0">
            <button
              onClick={() => handleTabChange('publishers')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'publishers'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">apartment</span>
              <span>Nhà Xuất Bản &amp; Doanh Nghiệp</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'publishers' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}>
                {publishersList.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('authors')}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'authors'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">person_star</span>
              <span>Tác Giả &amp; Dịch Giả</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'authors' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}>
                {authorsList.length}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto min-w-0 flex-1 md:flex-initial">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (!e.target.value) {
                    updateQueryParams((p) => {
                      p.delete('q');
                      p.delete('page');
                    });
                  }
                }}
                placeholder={activeTab === 'publishers' ? "Tìm theo tên NXB, giấy phép..." : "Tìm tác giả, tác phẩm tiêu biểu..."}
                className="w-full pl-9 pr-8 py-2 text-xs bg-surface-container-low border border-outline-variant/40 rounded-xl focus:outline-hidden focus:border-primary text-on-surface placeholder:text-on-surface-variant/60"
              />
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant">
                search
              </span>
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    updateQueryParams((p) => {
                      p.delete('q');
                      p.delete('page');
                    });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
            >
              Tìm
            </button>
          </form>
        </div>
      </section>

      {/* CONTENT SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* TAB 1: PUBLISHERS DIRECTORY */}
        {activeTab === 'publishers' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-editorial text-2xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">storefront</span>
                  Gian Hàng NXB &amp; Đối Tác Phát Hành
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Tất cả các gian hàng đều sở hữu giấy phép kinh doanh xuất bản và phát hành sách số hợp pháp.
                </p>
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs">
                  <button
                    type="button"
                    onClick={() => updateFilterFollowing(false)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${!filterFollowing
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    Tất cả NXB
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFilterFollowing(true)}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${filterFollowing
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-amber-700'
                      }`}
                  >
                    <span className="material-symbols-outlined text-sm">star</span>
                    <span>Đang theo dõi</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${filterFollowing ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                      {followedPublishersCount}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs w-full max-w-full min-w-0">
                  {['all', 'Kinh tế', 'Văn học', 'Thiếu nhi', 'Tâm hồn', 'Phật pháp'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => updateCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${(cat === 'all' && selectedCategory === 'all') || selectedCategory === cat
                        ? 'bg-primary text-on-primary font-bold shadow-xs'
                        : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:border-primary'
                        }`}
                    >
                      {cat === 'all' ? 'Tất cả lĩnh vực' : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Publishers Grid */}
            {loading ? (
              <div className="py-20 text-center text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl text-primary animate-spin mb-2">
                  progress_activity
                </span>
                <p className="text-xs font-semibold">Đang tải danh bạ Nhà xuất bản…</p>
              </div>
            ) : publishersList.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-outline-variant mb-2">apartment</span>
                <h3 className="font-bold text-base text-on-surface">Không tìm thấy Nhà xuất bản phù hợp</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {filterFollowing
                    ? 'Bạn chưa theo dõi Nhà xuất bản nào trong danh mục này.'
                    : 'Danh mục tác giả đang được ban biên tập HUKI cập nhật ấn phẩm mới.'}
                </p>
                <button
                  onClick={() => {
                    router.push('/stores?tab=publishers');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Xem tất cả Nhà xuất bản
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedPublishers.map((pub) => {
                    const isFollowed = Boolean(followedIds[pub.id] || (pub.slug && followedIds[pub.slug]));
                    const mockClasses = 'shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer';

                    return (
                      <article
                        key={pub.id}
                        className={`bg-surface-container-lowest rounded-2xl border border-outline-variant/40 overflow-hidden transition-all duration-300 flex flex-col justify-between group relative ${mockClasses}`}
                      >
                        {/* Banner Header */}
                        <div className="relative h-28 bg-surface-container-low overflow-hidden">
                          <img
                            src={pub.banner}
                            alt={pub.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                          <span className="absolute top-2.5 left-2.5 z-20 bg-primary/90 backdrop-blur-xs text-white text-[9.5px] font-bold px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">verified</span>
                            ĐỐI TÁC CHÍNH THỨC
                          </span>

                          <span className="absolute top-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                            <span className="material-symbols-outlined text-xs text-amber-400 fill">star</span>
                            {pub.rating || '4.9'} ({pub.reviewsCount || '100+'})
                          </span>
                        </div>

                        {/* Content Body */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                          <div>
                            {/* Logo & Follow Button Row */}
                            <div className="flex items-start justify-between gap-3 -mt-10 mb-3">
                              <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest p-1 border-2 border-surface-container-lowest shadow-md shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-outline-variant/30 z-10">
                                {pub.logo ? (
                                  <img src={pub.logo} alt={pub.name} className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                  <div className="w-full h-full rounded-xl bg-primary text-on-primary font-bold text-xl flex items-center justify-center">
                                    {pub.name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleFollow(pub.id, pub.name, false, pub.slug)}
                                className={`mt-6 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${isFollowed
                                  ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                                  : 'border border-primary text-primary hover:bg-primary/10'
                                  }`}
                              >
                                <span className="material-symbols-outlined text-sm">
                                  {isFollowed ? 'check' : 'add'}
                                </span>
                                <span>{isFollowed ? 'Đang theo dõi' : 'Theo dõi'}</span>
                              </button>
                            </div>

                            {/* Store Name & Category */}
                            <div className="mb-2">
                              <Link href={`/shop/${pub.slug || pub.id}`} className="hover:text-primary transition-colors block">
                                <h3 className="font-editorial text-lg font-bold text-on-surface leading-tight line-clamp-1 group-hover:text-primary">
                                  {pub.name}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-primary">
                                  <span className="material-symbols-outlined text-[13px]">verified</span>
                                  NXB Chính Hãng
                                </span>
                                <span className="text-[10.5px] text-on-surface-variant/80 bg-surface-container px-2 py-0.5 rounded-md">
                                  {pub.category}
                                </span>
                              </div>
                            </div>

                            <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                              {pub.description}
                            </p>

                            {/* Quick Stats Grid */}
                            <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-2.5 rounded-xl text-[11px] text-on-surface-variant mb-4">
                              <div>
                                <span className="block text-outline text-[10px]">Quy mô:</span>
                                <strong className="text-on-surface">{pub.totalBooks} đầu sách</strong>
                              </div>
                              <div>
                                <span className="block text-outline text-[10px]">Người theo dõi:</span>
                                <strong className="text-on-surface">{pub.followersCount}</strong>
                              </div>
                            </div>
                          </div>

                          {/* Action CTA Button */}
                          <div className="pt-2 border-t border-outline-variant/30">
                            <Link
                              href={`/shop/${pub.slug || pub.id}`}
                              className="w-full py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">storefront</span>
                              <span>Xem Gian Hàng</span>
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-8 pt-5 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-on-surface-variant">
                      Hiển thị <span className="font-semibold text-on-surface">{(validPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-on-surface">{Math.min(validPage * itemsPerPage, currentItems.length)}</span> trong tổng số <span className="font-semibold text-on-surface">{currentItems.length}</span> doanh nghiệp
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={validPage <= 1}
                        onClick={() => handlePageChange(validPage - 1)}
                        className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        aria-label="Trang trước"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        const isActive = p === validPage;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${isActive
                              ? 'bg-primary text-on-primary shadow-xs scale-105'
                              : 'border border-outline-variant/40 text-on-surface hover:bg-surface-container-low'
                              }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={validPage >= totalPages}
                        onClick={() => handlePageChange(validPage + 1)}
                        className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        aria-label="Trang sau"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: AUTHORS DIRECTORY */}
        {activeTab === 'authors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="font-editorial text-2xl font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">person_star</span>
                  Tác Giả Được Yêu Thích Nhất
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Theo dõi tác giả để nhận thông báo tác phẩm mới phát hành, trích dẫn tinh hoa và giao lưu trực tuyến.
                </p>
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs">
                  <button
                    type="button"
                    onClick={() => updateFilterFollowing(false)}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${!filterFollowing
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                  >
                    Tất cả Tác giả
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFilterFollowing(true)}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${filterFollowing
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-on-surface-variant hover:text-amber-700'
                      }`}
                  >
                    <span className="material-symbols-outlined text-sm">star</span>
                    <span>Đang theo dõi</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${filterFollowing ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                      {followedAuthorsCount}
                    </span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  {['all', 'Phát triển bản thân', 'Tài chính', 'Lịch sử', 'Văn học', 'Tâm thức'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => updateCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${(cat === 'all' && selectedCategory === 'all') || selectedCategory === cat
                        ? 'bg-primary text-on-primary font-bold shadow-xs'
                        : 'bg-surface-container-lowest border border-outline-variant/40 text-on-surface-variant hover:border-primary'
                        }`}
                    >
                      {cat === 'all' ? 'Tất cả thể loại' : cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Authors Grid */}
            {authorsList.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-12 text-center">
                <span className="material-symbols-outlined text-5xl text-outline-variant mb-2">person_search</span>
                <h3 className="font-bold text-base text-on-surface">Không tìm thấy Tác giả phù hợp</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {filterFollowing
                    ? 'Bạn chưa theo dõi Tác giả nào trong danh mục này.'
                    : 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.'}
                </p>
                <button
                  onClick={() => {
                    router.push('/stores?tab=authors');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Xem tất cả Tác giả
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {paginatedAuthors.map((author) => {
                    const isFollowed = Boolean(followedIds[author.id]);
                    const mockClasses = 'shadow-xs hover:shadow-md hover:-translate-y-1 cursor-pointer';

                    return (
                      <article
                        key={author.id}
                        className={`bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-5 transition-all duration-300 flex flex-col justify-between text-center group relative ${mockClasses}`}
                      >

                        <div>
                          {/* Avatar with gradient halo */}
                          <div className="relative w-20 h-20 mx-auto mb-3">
                            <div className={`w-full h-full rounded-full p-1 bg-gradient-to-tr ${author.coverBg} border-2 border-primary/40 shadow-xs`}>
                              {author.avatar ? (
                                <img
                                  src={author.avatar}
                                  alt={author.name}
                                  className="w-full h-full object-cover rounded-full"
                                />
                              ) : (
                                <div className="w-full h-full rounded-full bg-primary text-on-primary font-bold text-lg flex items-center justify-center">
                                  {author.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            {author.isVerified && (
                              <span className="absolute bottom-0 right-0 bg-primary text-on-primary rounded-full p-0.5 shadow-xs" title="Tác giả xác thực">
                                <span className="material-symbols-outlined text-xs block">verified</span>
                              </span>
                            )}
                          </div>

                          <h3 className="font-editorial text-lg font-bold text-on-surface group-hover:text-primary transition-colors leading-tight">
                            {author.name}
                          </h3>
                          <span className="text-[11px] text-primary font-semibold block mt-0.5 line-clamp-1">
                            {author.title}
                          </span>

                          <p className="text-xs text-on-surface-variant line-clamp-2 mt-2 leading-relaxed">
                            {author.description}
                          </p>

                          {/* Top notable works */}
                          <div className="mt-3 pt-3 border-t border-outline-variant/20 text-left">
                            <span className="text-[10px] font-bold text-outline uppercase tracking-wider block mb-1.5">
                              Tác phẩm tiêu biểu:
                            </span>
                            <div className="space-y-1">
                              {author.notableWorks.map((work, idx) => (
                                <Link
                                  key={idx}
                                  href={`/books?q=${encodeURIComponent(work)}`}
                                  className="text-xs text-on-surface hover:text-primary flex items-center gap-1 truncate"
                                >
                                  <span className="material-symbols-outlined text-[13px] text-on-surface-variant">auto_stories</span>
                                  <span className="truncate">{work}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-4 pt-3 border-t border-outline-variant/20 space-y-2">
                          <button
                            type="button"
                            onClick={() => toggleFollow(author.id, author.name, false)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${isFollowed
                              ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                              : 'bg-primary/10 text-primary hover:bg-primary hover:text-on-primary'
                              }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isFollowed ? 'check' : 'add'}
                            </span>
                            {isFollowed ? 'Đang theo dõi' : 'Theo dõi tác giả'}
                          </button>

                          <Link
                            href={`/author/${author.id}`}
                            className="block text-center text-xs font-semibold text-on-surface-variant hover:text-primary py-1 transition-colors"
                          >
                            Xem trang tác giả →
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Pagination For Authors */}
                {totalPages > 1 && (
                  <div className="mt-8 pt-5 border-t border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-on-surface-variant">
                      Hiển thị <span className="font-semibold text-on-surface">{(validPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-on-surface">{Math.min(validPage * itemsPerPage, currentItems.length)}</span> trong tổng số <span className="font-semibold text-on-surface">{currentItems.length}</span> tác giả
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={validPage <= 1}
                        onClick={() => handlePageChange(validPage - 1)}
                        className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        aria-label="Trang trước"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        const isActive = p === validPage;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => handlePageChange(p)}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${isActive
                              ? 'bg-primary text-on-primary shadow-xs scale-105'
                              : 'border border-outline-variant/40 text-on-surface hover:bg-surface-container-low'
                              }`}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        disabled={validPage >= totalPages}
                        onClick={() => handlePageChange(validPage + 1)}
                        className="w-8 h-8 rounded-xl border border-outline-variant/40 flex items-center justify-center text-on-surface hover:bg-surface-container-low disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                        aria-label="Trang sau"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default function StoresPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f2fbf9] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-[#003B2B] animate-pulse">store</span>
          <p className="mt-4 text-[#49454f] font-medium">Đang tải cửa hàng...</p>
        </div>
      </div>
    }>
      <StoresContent />
    </Suspense>
  );
}
