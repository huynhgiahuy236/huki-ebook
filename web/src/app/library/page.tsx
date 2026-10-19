'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/ui/context/AuthContext';
import { libraryApi, type UserLibraryBook } from '@/ui/api/libraryApi';
import { catalogApi, type BookData } from '@/ui/api/catalogApi';
import BookCover from '@/ui/components/common/BookCover';

type FilterTab = 'all' | 'reading' | 'favorite' | 'completed';

export default function LibraryPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [books, setBooks] = useState<UserLibraryBook[]>([]);
  const [externalWishlistBooks, setExternalWishlistBooks] = useState<UserLibraryBook[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'progress_desc' | 'title_asc'>('recent');
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  // 1. Tải danh sách yêu thích từ localStorage & lắng nghe sự kiện
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const loadWishlist = () => {
      try {
        const saved = JSON.parse(localStorage.getItem('huki_wishlist_ids') || '[]');
        if (Array.isArray(saved)) {
          setWishlistIds(saved);
        }
      } catch {}
    };

    loadWishlist();

    const handleWishlistUpdate = () => {
      loadWishlist();
    };

    window.addEventListener('huki_wishlist_updated', handleWishlistUpdate);
    return () => {
      window.removeEventListener('huki_wishlist_updated', handleWishlistUpdate);
    };
  }, []);

  // 1b. Tải thông tin sách yêu thích thật từ Database nếu chưa có trong tủ cá nhân & đồng bộ ID hợp lệ
  useEffect(() => {
    if (wishlistIds.length === 0) {
      setExternalWishlistBooks([]);
      return;
    }

    const ownedIds = new Set(books.map((b) => b.bookId || b.id));
    const missingIds = wishlistIds.filter((id) => !ownedIds.has(id));

    if (missingIds.length === 0) {
      setExternalWishlistBooks([]);
      return;
    }

    catalogApi
      .getPublicBooks({ limit: 100 })
      .then((res) => {
        if (!res || !res.success || !res.data) return;
        const allBooks = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
        const matched: UserLibraryBook[] = allBooks
          .filter((b: BookData) => missingIds.includes(b.id))
          .map((b: BookData) => ({
            accessId: `wishlist-${b.id}`,
            bookId: b.id,
            id: b.id,
            title: b.title,
            slug: b.slug,
            author: typeof b.author === 'string' ? b.author : (b.author as any)?.name || 'Tác giả HUKI',
            publisher: typeof b.publisher === 'string' ? b.publisher : (b.publisher as any)?.name || 'NXB HUKI',
            category: typeof b.category === 'string' ? b.category : (b.category as any)?.name || 'Sách Số',
            categorySlug: (b.category as any)?.slug,
            coverUrl: b.coverUrl || (b as any).coverImage || (b as any).cover,
            cover: b.coverUrl || (b as any).coverImage || (b as any).cover,
            format: b.format || 'DIGITAL',
            price: Number(b.price || 0),
            readingProgress: 0,
            status: 'WISHLIST',
          }));
        setExternalWishlistBooks(matched);

        // Dọn dẹp ID rác không tồn tại trong DB để số lượng hiển thị trên badge luôn khớp 100% với danh sách thực tế
        const validIds = [
          ...books.filter((b) => wishlistIds.includes(b.bookId || b.id)).map((b) => b.bookId || b.id),
          ...matched.map((m) => m.id),
        ];
        if (validIds.length > 0 && validIds.length !== wishlistIds.length) {
          setWishlistIds(validIds);
          try {
            localStorage.setItem('huki_wishlist_ids', JSON.stringify(validIds));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('Lỗi lấy sách yêu thích từ catalog DB:', err);
      });
  }, [wishlistIds, books]);

  // 2. Tải sách thật từ cơ sở dữ liệu (PostgreSQL / commerce-service)
  useEffect(() => {
    let isMounted = true;

    if (isAuthLoading) {
      return;
    }

    if (!user?.id) {
      setBooks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    libraryApi.getMyLibrary(user.id)
      .then((data) => {
        if (!isMounted) return;
        setBooks(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Lỗi tải tủ sách cá nhân từ DB:', err);
        setBooks([]);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.id, isAuthLoading]);

  // 3. Toggle yêu thích trực tiếp trong tủ sách
  const handleToggleFavorite = (bookId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const willWishlist = !wishlistIds.includes(bookId);
      const newIds = willWishlist
        ? [...wishlistIds, bookId]
        : wishlistIds.filter((id) => id !== bookId);

      setWishlistIds(newIds);
      localStorage.setItem('huki_wishlist_ids', JSON.stringify(newIds));

      window.dispatchEvent(
        new CustomEvent('huki_wishlist_updated', {
          detail: { bookId, wishlisted: willWishlist },
        })
      );
    } catch (err) {
      console.warn('Lỗi cập nhật yêu thích:', err);
    }
  };

  // Danh sách toàn bộ sách yêu thích thực tế (gộp sách trong tủ + sách ngoài sàn từ DB)
  const allFavoriteBooks = useMemo(() => {
    const ownedFavorites = books.filter((b) => wishlistIds.includes(b.bookId || b.id));
    return [...ownedFavorites, ...externalWishlistBooks];
  }, [books, wishlistIds, externalWishlistBooks]);

  // 4. Thống kê số lượng sách theo từng danh mục (Số lượng khớp 100% với số sách thực tế)
  const counts = useMemo(() => {
    const total = books.length;
    const reading = books.filter((b) => b.readingProgress > 0 && b.readingProgress < 100).length;
    const completed = books.filter((b) => b.readingProgress >= 100).length;
    const favorite = allFavoriteBooks.length;
    return { total, reading, completed, favorite };
  }, [books, allFavoriteBooks]);

  // 5. Lọc và sắp xếp sách theo tab & từ khóa
  const filteredBooks = useMemo(() => {
    let result = [...books];

    // Lọc theo tab
    if (activeTab === 'reading') {
      result = result.filter((b) => b.readingProgress > 0 && b.readingProgress < 100);
    } else if (activeTab === 'completed') {
      result = result.filter((b) => b.readingProgress >= 100);
    } else if (activeTab === 'favorite') {
      result = allFavoriteBooks;
    }


    // Lọc theo tìm kiếm
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.title?.toLowerCase().includes(q) ||
          b.author?.toLowerCase().includes(q) ||
          b.category?.toLowerCase().includes(q)
      );
    }

    // Sắp xếp
    if (sortBy === 'progress_desc') {
      result.sort((a, b) => b.readingProgress - a.readingProgress);
    } else if (sortBy === 'title_asc') {
      result.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else {
      // Mới cập nhật nhất
      result.sort(
        (a, b) =>
          new Date(b.lastReadAt || 0).getTime() - new Date(a.lastReadAt || 0).getTime()
      );
    }

    return result;
  }, [books, activeTab, searchQuery, sortBy, wishlistIds]);

  return (
    <div className="w-full bg-[#f8fafc] min-h-screen font-sans pb-24 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 1. Header Banner & Stats Card */}
        <section
          className="w-full rounded-3xl text-white p-6 sm:p-8 relative overflow-hidden shadow-xl border border-white/10"
          style={{
            background: 'linear-gradient(135deg, #003B2B 0%, #005A3E 50%, #00271E 100%)',
          }}
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-[#94F5D6] text-xs font-bold backdrop-blur-md border border-white/20">
                <span className="material-symbols-outlined text-sm text-[#FBBF24]">auto_awesome</span>
                <span>Tủ Sách Số Bản Quyền DRM • Đồng Bộ Thời Gian Thực</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                Không Gian Đọc Sách Số Cá Nhân
              </h1>
              <p className="text-white/80 text-xs sm:text-sm leading-relaxed max-w-xl">
                Toàn bộ ấn bản sách điện tử (EPUB / PDF) của bạn được lưu trữ vĩnh viễn trên HUKI Cloud, tự động lưu dấu trang và đồng bộ tiến độ đọc.
              </p>
            </div>

            {/* Quick stats pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full md:w-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
                <span className="block text-xl font-black text-white">{counts.total}</span>
                <span className="text-[11px] text-emerald-200/90 font-medium">Tổng sách</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
                <span className="block text-xl font-black text-[#94F5D6]">{counts.reading}</span>
                <span className="text-[11px] text-emerald-200/90 font-medium">Đang đọc</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
                <span className="block text-xl font-black text-rose-300">{counts.favorite}</span>
                <span className="text-[11px] text-emerald-200/90 font-medium">Yêu thích</span>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
                <span className="block text-xl font-black text-amber-300">{counts.completed}</span>
                <span className="text-[11px] text-emerald-200/90 font-medium">Đã xong</span>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Thanh ngang chọn lọc & Tabs phân loại (Horizontal Filter Bar) */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-3.5 shadow-xs space-y-3">
          {/* Hàng Tabs Ngang chính */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-[#003B2B] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">menu_book</span>
                <span>Tất Cả Sách</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                    activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.total}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reading')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'reading'
                    ? 'bg-[#00875A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base text-emerald-400">schedule</span>
                <span>Đang Đọc Dở</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                    activeTab === 'reading' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.reading}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('favorite')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'favorite'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base text-rose-400">favorite</span>
                <span>Sách Yêu Thích</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                    activeTab === 'favorite' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.favorite}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('completed')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'completed'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base text-amber-300">task_alt</span>
                <span>Đã Hoàn Thành</span>
                <span
                  className={`px-1.5 py-0.2 rounded-md text-[10px] font-extrabold ${
                    activeTab === 'completed' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {counts.completed}
                </span>
              </button>
            </div>

            {/* Link sang Quản lý thiết bị DRM */}
            <Link
              href="/library/devices"
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#00875A] hover:bg-emerald-50 border border-slate-200 flex items-center gap-1.5 shrink-0 transition-colors"
              title="Quản lý các thiết bị đọc sách được cấp bản quyền DRM"
            >
              <span className="material-symbols-outlined text-base">devices</span>
              <span className="hidden sm:inline">Quản Lý Thiết Bị DRM</span>
            </Link>
          </div>

          {/* Hàng Thanh Công Cụ: Tìm kiếm + Sắp xếp */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
            {/* Search Input Ngang */}
            <div className="relative w-full sm:max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <span className="material-symbols-outlined text-lg">search</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tựa sách, tác giả, thể loại trong tủ..."
                className="w-full h-10 pl-9 pr-8 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#00875A] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 text-xs">
              <span className="text-slate-400 font-medium">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#00875A] cursor-pointer"
              >
                <option value="recent">Đọc gần đây nhất</option>
                <option value="progress_desc">Tiến độ đọc cao nhất</option>
                <option value="title_asc">Tên sách (A-Z)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. Danh sách Sách Trong Tủ (Grid Cards Lấy Từ DB Thật) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm sm:text-base text-slate-800 flex items-center gap-2">
              <span>Danh sách tác phẩm ({filteredBooks.length})</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h2>
            <Link
              href="/books"
              className="text-xs font-bold text-[#00875A] hover:underline flex items-center gap-1"
            >
              <span>Mua thêm sách số</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 py-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-3 border border-slate-200 animate-pulse space-y-3">
                  <div className="aspect-[3/4] bg-slate-200 rounded-xl" />
                  <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                  <div className="h-2 bg-slate-200 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 sm:p-14 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-[#00875A] flex items-center justify-center mx-auto shadow-xs">
                <span className="material-symbols-outlined text-3xl">auto_stories</span>
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="font-bold text-base sm:text-lg text-slate-900">
                  {searchQuery
                    ? 'Không tìm thấy sách phù hợp'
                    : !user
                    ? 'Bạn chưa đăng nhập'
                    : activeTab === 'favorite'
                    ? 'Chưa có sách nào trong danh sách yêu thích'
                    : activeTab === 'reading'
                    ? 'Bạn chưa có cuốn sách nào đang đọc dở'
                    : 'Tủ Sách Của Bạn Đang Trống'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {searchQuery
                    ? `Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc tìm kiếm "${searchQuery}".`
                    : !user
                    ? 'Vui lòng đăng nhập để xem tủ sách cá nhân và tiếp tục đọc các ấn bản số đã sở hữu.'
                    : activeTab === 'favorite'
                    ? 'Bấm nút trái tim trên bìa bất kỳ cuốn sách nào để lưu vào danh sách yêu thích tiện theo dõi.'
                    : 'Bạn chưa sở hữu tựa sách số nào trong tủ sách. Khám phá hàng ngàn tựa sách bản quyền số DRM trên sàn HUKI để bắt đầu hành trình đọc sách của bạn.'}
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                {!user ? (
                  <>
                    <Link
                      href="/login"
                      className="bg-[#00875A] hover:bg-[#00704A] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">login</span>
                      <span>Đăng Nhập Ngay</span>
                    </Link>
                    <Link
                      href="/books"
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">explore</span>
                      <span>Khám Phá Sách</span>
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/books"
                    className="bg-[#00875A] hover:bg-[#00704A] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md inline-flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">explore</span>
                    <span>Khám Phá Kho Sách Ngay</span>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredBooks.map((book) => {
                const bookKey = book.bookId || book.id;
                const isFav = wishlistIds.includes(bookKey);
                const progress = Math.min(100, Math.max(0, book.readingProgress || 0));

                return (
                  <div
                    key={book.accessId || bookKey}
                    className="group bg-white rounded-2xl border border-slate-200/90 hover:border-[#00875A] hover:shadow-md transition-all p-3 flex flex-col justify-between relative overflow-hidden"
                  >
                    <div>
                      {/* Book Cover */}
                      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-slate-100 mb-2.5 flex items-center justify-center border border-slate-100 group/cover">
                        <BookCover
                          src={book.coverUrl || book.cover}
                          title={book.title}
                          author={book.author}
                          className="group-hover/cover:scale-105 transition-transform duration-300 w-full h-full object-cover"
                        />

                        {/* Format Badge */}
                        <span className="absolute top-1.5 left-1.5 bg-[#003B2B] text-white text-[8.5px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          {book.format === 'BOTH' ? 'Combo DRM' : 'Ebook DRM'}
                        </span>

                        {/* Nút Yêu Thích Trái Tim */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(bookKey, e)}
                          className={`absolute top-1.5 right-1.5 z-20 w-7 h-7 rounded-full flex items-center justify-center transition-all backdrop-blur-md shadow-xs cursor-pointer ${
                            isFav
                              ? 'bg-rose-500 text-white shadow-rose-500/30 scale-105'
                              : 'bg-black/35 hover:bg-black/60 text-white/90 hover:text-white'
                          }`}
                          title={isFav ? 'Bỏ khỏi yêu thích' : 'Thêm vào yêu thích'}
                        >
                          <span className={`material-symbols-outlined text-[15px] ${isFav ? 'fill-current' : ''}`}>
                            {isFav ? 'favorite' : 'favorite_border'}
                          </span>
                        </button>

                        {/* Hover Overlay Play Icon */}
                        <Link
                          href={book.status === 'WISHLIST' ? `/book/${bookKey}` : `/reader?book=${bookKey}`}
                          className="absolute inset-0 bg-black/35 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center"
                          title={book.status === 'WISHLIST' ? 'Bấm để xem chi tiết sách' : 'Bấm để đọc sách'}
                        >
                          <div className="w-10 h-10 rounded-full bg-[#00875A] text-white flex items-center justify-center shadow-lg transform scale-90 group-hover/cover:scale-100 transition-transform">
                            <span className="material-symbols-outlined text-2xl">
                              {book.status === 'WISHLIST' ? 'visibility' : 'auto_stories'}
                            </span>
                          </div>
                        </Link>
                      </div>

                      {/* Book Title */}
                      <Link
                        href={book.status === 'WISHLIST' ? `/book/${bookKey}` : `/reader?book=${bookKey}`}
                        className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug hover:text-[#00875A] transition-colors block mb-1"
                        title={book.title}
                      >
                        {book.title}
                      </Link>

                      {/* Author */}
                      <p className="text-[11px] text-slate-500 truncate mb-2">
                        {book.author}
                      </p>

                      {/* Reading Progress Bar */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Tiến độ</span>
                          <span
                            className={`font-bold ${
                              progress >= 100
                                ? 'text-amber-600'
                                : progress > 0
                                ? 'text-[#00875A]'
                                : 'text-slate-400'
                            }`}
                          >
                            {progress >= 100 ? 'Đã xong' : `${progress}%`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              progress >= 100
                                ? 'bg-amber-500'
                                : progress > 0
                                ? 'bg-[#00875A]'
                                : 'bg-transparent'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                      {book.status === 'WISHLIST' ? (
                        <Link
                          href={`/book/${bookKey}`}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[13px]">shopping_bag</span>
                          <span>Xem &amp; Mua Sách</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/reader?book=${bookKey}`}
                          className="flex-1 py-1.5 rounded-lg bg-[#00875A] hover:bg-[#00704A] text-white text-[11px] font-bold transition-all text-center flex items-center justify-center gap-1 shadow-2xs"
                        >
                          <span className="material-symbols-outlined text-[13px]">auto_stories</span>
                          <span>{progress > 0 ? 'Đọc Tiếp' : 'Đọc Sách'}</span>
                        </Link>
                      )}

                      <Link
                        href={book.status === 'WISHLIST' ? `/book/${bookKey}` : `/reader?book=${bookKey}&autoplay=true`}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#00875A] transition-colors flex items-center justify-center"
                        title={book.status === 'WISHLIST' ? 'Xem chi tiết sách' : 'Nghe Giọng Đọc AI'}
                      >
                        <span className="material-symbols-outlined text-[15px]">
                          {book.status === 'WISHLIST' ? 'visibility' : 'headphones'}
                        </span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
