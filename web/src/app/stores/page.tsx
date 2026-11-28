'use client';

import React, { useCallback, useEffect, useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { businessApi, type BusinessData } from '@/ui/api/businessApi';
import { catalogApi } from '@/ui/api/catalogApi';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { StoreLogoImg } from '@/ui/components/common/StoreLogoImg';
import { sanitizeImageUrl } from '@/ui/utils/imageUtils';

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
  previewBooks: Array<{ id: string; title: string; coverUrl: string }>;
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
          const previewBooks = authorBooks.slice(0, 4).map((b: any) => ({
            id: b.id,
            title: b.title || 'Tác phẩm',
            coverUrl: b.coverUrl || b.coverImage || b.cover || '',
          }));
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
            description: a.bio || (worksCount > 0 ? `${worksCount} tác phẩm trên HUKI` : 'Tác giả trên HUKI'),
            notableWorks: notableWorks,
            previewBooks,
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

  const [favoriteAuthors, setFavoriteAuthors] = useState<Record<string, { id: string; name: string; title?: string; avatar?: string }>>(() => {
    try {
      const raw = localStorage.getItem('huki_favorite_authors');
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
    const seenIds = new Set<string>();

    realBusinesses.forEach(biz => {
      if (biz.stores && biz.stores.length > 0) {
        biz.stores.forEach(st => {
          if ((st as any).isActive === false) return;
          const storeKey = st.slug || st.id;
          if (seenIds.has(storeKey) || seenIds.has(st.id)) return;
          seenIds.add(storeKey);
          seenIds.add(st.id);

          const storeBooks = catalogBooks.filter(b => {
            const sId = b.storeId || (b as any).store_id;
            const bId = b.businessId || (b as any).business_id;
            const oId = (b as any).ownerUserId;
            return sId === st.id || bId === biz.id || sId === biz.id || sId === biz.ownerId || bId === biz.ownerId || oId === biz.ownerId;
          });
          const totalBooks = Math.max((st as any).totalProducts || 0, storeBooks.length);

          combined.push({
            id: st.id,
            name: st.name,
            slug: st.slug || st.id,
            category: 'Gian hàng sách',
            logo: sanitizeImageUrl(st.logo) || sanitizeImageUrl(biz.logo) || null,
            banner: sanitizeImageUrl(st.banner) || sanitizeImageUrl(biz.banner) || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
            rating: 5.0,
            reviewsCount: 'Mới',
            followersCount: followedIds[st.id] ? 'Đang theo dõi' : 'Gian hàng đã xác thực',
            totalBooks: totalBooks,
            description: biz.description || 'Gian hàng bán sách chính hãng hoạt động trên hệ thống HUKI.',
            address: biz.address || 'Việt Nam',
            responseRate: '100%',
            isVerified: true,
            isMock: false,
          });
        });
      } else {
        if (seenIds.has(biz.slug || biz.id) || seenIds.has(biz.id)) return;
        seenIds.add(biz.slug || biz.id);
        seenIds.add(biz.id);

        const storeBooks = catalogBooks.filter(b => {
          const sId = b.storeId || (b as any).store_id;
          const bId = b.businessId || (b as any).business_id;
          const oId = (b as any).ownerUserId;
          return sId === biz.id || bId === biz.id || sId === biz.ownerId || bId === biz.ownerId || oId === biz.ownerId;
        });
        const totalBooks = storeBooks.length;

        combined.push({
          id: biz.id,
          name: biz.name,
          slug: biz.slug || biz.id,
          category: 'Gian hàng sách',
          logo: sanitizeImageUrl(biz.logo) || null,
          banner: sanitizeImageUrl(biz.banner) || 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80',
          rating: 5.0,
          reviewsCount: 'Mới',
          followersCount: followedIds[biz.id] ? 'Đang theo dõi' : 'Gian hàng đã xác thực',
          totalBooks: totalBooks,
          description: biz.description || 'Gian hàng bán sách chính hãng hoạt động trên hệ thống HUKI.',
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
      list = list.filter(author => Boolean(favoriteAuthors[author.id]));
    }

    return list.filter(author => {
      const matchSearch = !searchQuery ||
        author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        author.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'all' || author.category.toLowerCase().includes(selectedCategory.toLowerCase());
      return matchSearch && matchCat;
    });
  }, [realAuthors, filterFollowing, favoriteAuthors, searchQuery, selectedCategory]);

  const followedAuthorsCount = useMemo(() => {
    return realAuthors.filter(a => Boolean(favoriteAuthors[a.id])).length;
  }, [realAuthors, favoriteAuthors]);

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

  const toggleFavoriteAuthor = (author: AuthorItem) => {
    const isCurrentlyFav = Boolean(favoriteAuthors[author.id]);
    const nextState = !isCurrentlyFav;

    setFavoriteAuthors((prev) => {
      const updated = { ...prev };
      if (nextState) {
        updated[author.id] = {
          id: author.id,
          name: author.name,
          title: author.title,
          avatar: author.avatar,
        };
      } else {
        delete updated[author.id];
      }
      try {
        localStorage.setItem('huki_favorite_authors', JSON.stringify(updated));
        window.dispatchEvent(new Event('huki_favorite_authors_updated'));
      } catch { }
      return updated;
    });

    if (nextState) {
      showToast(`Đã thêm ${author.name} vào Tác giả yêu thích.`, 'success');
    } else {
      showToast(`Đã bỏ ${author.name} khỏi danh sách yêu thích.`, 'info');
    }
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
      {/* HERO HEADER (Tinh gọn - tách biệt Gian hàng Seller và Tác giả) */}
      <section className="bg-primary text-white py-8 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Gian Hàng &amp; Tác Giả
            </h1>
            <p className="text-white/80 text-xs sm:text-sm mt-1.5 leading-relaxed">
              Khám phá các gian hàng bán sách chính thức và đội ngũ tác giả đang phân phối tác phẩm trên HuKi Ebook.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/15">
              <span className="font-editorial text-lg font-bold text-tertiary-fixed mr-1.5">
                {combinedAllPublishers.length}
              </span>
              <span className="text-white/85 font-medium">Gian hàng</span>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/15">
              <span className="font-editorial text-lg font-bold text-tertiary-fixed mr-1.5">
                {realAuthors.length}
              </span>
              <span className="text-white/85 font-medium">Tác giả</span>
            </div>
          </div>
        </div>
      </section>

      {/* HUB NAVIGATION TABS & SEARCH CONTROLS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Main Segment Tabs (Không icon rối mắt) */}
          <div className="flex items-center gap-2 overflow-x-auto w-full max-w-full min-w-0">
            <button
              onClick={() => handleTabChange('publishers')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'publishers'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
            >
              <span>Gian hàng</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'publishers' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}>
                {publishersList.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('authors')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'authors'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
            >
              <span>Tác giả</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full ${activeTab === 'authors' ? 'bg-white/20 text-white' : 'bg-surface-container text-on-surface-variant'
                }`}>
                {authorsList.length}
              </span>
            </button>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="flex items-center gap-2 w-full md:w-auto min-w-0 flex-1 md:flex-initial">
            <div className="relative flex-1 md:w-64">
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
                placeholder={activeTab === 'publishers' ? "Tìm tên gian hàng..." : "Tìm tên tác giả, tác phẩm..."}
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
        {/* TAB 1: SELLER STORES DIRECTORY */}
        {activeTab === 'publishers' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-editorial text-xl sm:text-2xl font-bold text-on-surface">
                  Danh Sách Gian Hàng
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Các nhà bán hàng đối tác đang hoạt động trên hệ thống HuKi.
                </p>
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs">
                <button
                  type="button"
                  onClick={() => updateFilterFollowing(false)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${!filterFollowing
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => updateFilterFollowing(true)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${filterFollowing
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-amber-700'
                    }`}
                >
                  <span>Đang theo dõi</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${filterFollowing ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
                    }`}>
                    {followedPublishersCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Stores Grid */}
            {loading ? (
              <div className="py-16 text-center text-on-surface-variant">
                <p className="text-xs font-semibold">Đang tải danh sách gian hàng…</p>
              </div>
            ) : publishersList.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-10 text-center">
                <h3 className="font-bold text-base text-on-surface">Không tìm thấy gian hàng phù hợp</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {filterFollowing
                    ? 'Bạn chưa theo dõi gian hàng nào.'
                    : 'Thử tìm kiếm với từ khóa khác hoặc quay lại danh sách đầy đủ.'}
                </p>
                <button
                  onClick={() => {
                    router.push('/stores');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Xem tất cả gian hàng
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paginatedPublishers.map((pub) => {
                    const isFollowed = Boolean(followedIds[pub.id] || (pub.slug && followedIds[pub.slug]));

                    return (
                      <article
                        key={pub.id}
                        className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                      >
                        {/* Clean Banner Header */}
                        <div className="relative h-24 bg-surface-container-low overflow-hidden">
                          <StoreLogoImg
                            src={pub.banner}
                            fallbackSrc="https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80"
                            alt={pub.name}
                            fallbackText={pub.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                            fallbackClassName="w-full h-full flex items-center justify-center bg-[#003b2b]/15 text-[#003b2b] font-bold text-2xl"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                        </div>

                        {/* Content Body */}
                        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                          <div>
                            {/* Logo & Follow Button Row */}
                            <div className="flex items-start justify-between gap-3 -mt-9 mb-3">
                              <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest p-1 border-2 border-surface-container-lowest shadow-md shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-outline-variant/30 z-10">
                                <StoreLogoImg
                                  src={pub.logo}
                                  alt={pub.name}
                                  fallbackText={pub.name.charAt(0).toUpperCase()}
                                  className="w-full h-full object-cover rounded-xl"
                                  fallbackClassName="w-full h-full rounded-xl bg-primary text-on-primary font-bold text-xl flex items-center justify-center"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleFollow(pub.id, pub.name, false, pub.slug)}
                                className={`mt-5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${isFollowed
                                  ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                                  : 'border border-primary text-primary hover:bg-primary/10'
                                  }`}
                              >
                                {isFollowed ? 'Đang theo dõi' : 'Theo dõi'}
                              </button>
                            </div>

                            {/* Store Name & Real Meta */}
                            <div className="mb-2">
                              <Link href={`/shop/${pub.slug || pub.id}`} className="hover:text-primary transition-colors block">
                                <h3 className="font-editorial text-lg font-bold text-on-surface leading-tight line-clamp-1 group-hover:text-primary">
                                  {pub.name}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-2 mt-1 text-[11px] text-on-surface-variant">
                                <span className="font-semibold text-primary">Gian hàng đối tác</span>
                                <span>•</span>
                                <span>{pub.totalBooks} đầu sách</span>
                              </div>
                            </div>

                            <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed mb-4 min-h-[32px]">
                              {pub.description}
                            </p>
                          </div>

                          {/* Action CTA Button */}
                          <div className="pt-2 border-t border-outline-variant/30">
                            <Link
                              href={`/shop/${pub.slug || pub.id}`}
                              className="w-full py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-bold flex items-center justify-center shadow-xs transition-colors"
                            >
                              Xem gian hàng
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
          <div className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="font-editorial text-xl sm:text-2xl font-bold text-on-surface">
                  Danh Sách Tác Giả
                </h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Lưu tác giả yêu thích và bấm vào để xem toàn bộ sách của họ trên sàn.
                </p>
              </div>

              {/* Filter Controls */}
              <div className="flex items-center gap-1 p-1 bg-surface-container-low rounded-xl border border-outline-variant/30 text-xs">
                <button
                  type="button"
                  onClick={() => updateFilterFollowing(false)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${!filterFollowing
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => updateFilterFollowing(true)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${filterFollowing
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-rose-600'
                    }`}
                >
                  <span>Yêu thích</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${filterFollowing ? 'bg-white/25 text-white' : 'bg-rose-100 text-rose-700'
                    }`}>
                    {followedAuthorsCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Authors Grid */}
            {authorsList.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-10 text-center">
                <h3 className="font-bold text-base text-on-surface">Không tìm thấy Tác giả phù hợp</h3>
                <p className="text-xs text-on-surface-variant mt-1">
                  {filterFollowing
                    ? 'Bạn chưa theo dõi Tác giả nào.'
                    : 'Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc.'}
                </p>
                <button
                  onClick={() => {
                    router.push('/stores?tab=authors');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  Xem tất cả tác giả
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {paginatedAuthors.map((author) => {
                    const isFavorited = Boolean(favoriteAuthors[author.id]);
                    const authorBooksHref = `/books?author=${encodeURIComponent(author.name)}`;

                    return (
                      <article
                        key={author.id}
                        className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-md hover:border-[#006953]/30 transition-all duration-200 flex flex-col justify-between gap-3.5 group"
                      >
                        {/* Top Row: Avatar Left + Short Info Right + Favorite Heart */}
                        <div className="flex items-start justify-between gap-3">
                          <Link href={authorBooksHref} className="flex items-center gap-3 min-w-0 flex-1">
                            {author.avatar ? (
                              <img
                                src={author.avatar}
                                alt={author.name}
                                className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-[#003B2B] text-white font-bold text-base flex items-center justify-center shrink-0">
                                {author.name.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <h3 className="font-bold text-sm text-slate-900 group-hover:text-[#006953] transition-colors truncate">
                                {author.name}
                              </h3>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">
                                {author.worksCount > 0 ? `${author.worksCount} tác phẩm` : author.title}
                              </p>
                            </div>
                          </Link>

                          <button
                            type="button"
                            onClick={() => toggleFavoriteAuthor(author)}
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${isFavorited
                              ? 'bg-rose-50 text-rose-600'
                              : 'text-slate-400 hover:bg-slate-100 hover:text-rose-500'
                              }`}
                            title={isFavorited ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
                            aria-label={isFavorited ? 'Bỏ yêu thích' : 'Yêu thích'}
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {isFavorited ? 'favorite' : 'favorite_border'}
                            </span>
                          </button>
                        </div>

                        {/* 4 Small Book Covers with Hover Title */}
                        {author.previewBooks.length > 0 ? (
                          <div className="grid grid-cols-4 gap-1.5">
                            {author.previewBooks.map((book) => (
                              <Link
                                key={book.id}
                                href={authorBooksHref}
                                title={book.title}
                                className="relative aspect-[2/3] rounded-lg overflow-hidden bg-slate-100 border border-slate-200/70 group/book block"
                              >
                                {book.coverUrl ? (
                                  <img
                                    src={book.coverUrl}
                                    alt={book.title}
                                    className="w-full h-full object-cover group-hover/book:scale-105 transition-transform duration-200"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <span className="material-symbols-outlined text-[18px]">menu_book</span>
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover/book:opacity-100 transition-opacity duration-150 p-1 flex items-end">
                                  <span className="text-[9px] leading-tight font-medium text-white line-clamp-3">
                                    {book.title}
                                  </span>
                                </div>
                              </Link>
                            ))}
                          </div>
                        ) : (
                          <div className="py-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-[11px] text-slate-400">
                            Đang cập nhật tác phẩm
                          </div>
                        )}

                        {/* Compact Footer Link */}
                        <Link
                          href={authorBooksHref}
                          className="text-xs font-semibold text-[#006953] hover:text-[#003B2B] flex items-center justify-between pt-2 border-t border-slate-100 transition-colors"
                        >
                          <span>Xem tất cả sách</span>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </Link>
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
