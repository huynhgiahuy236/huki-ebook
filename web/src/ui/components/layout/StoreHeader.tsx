"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCart } from '@/ui/context/CartContext';
import { useAuth } from '@/ui/context/AuthContext';
import { useTheme } from '@/ui/context/ThemeContext';
import { catalogApi, BookData } from '@/ui/api/catalogApi';
import { useDebounce } from '@/ui/utils/useDebounce';
import UserAvatar from '@/ui/components/common/UserAvatar';

interface StoreHeaderProps {
  onToggleSidebar?: () => void;
  onToggleMobileSidebar?: () => void;
  isSidebarCollapsed?: boolean;
}

export default function StoreHeader({
  onToggleSidebar,
  onToggleMobileSidebar,
  isSidebarCollapsed = true,
}: StoreHeaderProps) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { totalItemsCount } = useCart();
  const { user, isLoggedIn, logout, hasRole } = useAuth();
  const { theme, setTheme, isDarkMode, toggleDarkMode, palettes, currentPalette } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 250);
  const [apiSearchResults, setApiSearchResults] = useState<BookData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('huki_search_history');
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveToHistory = (term: string) => {
    const clean = term.trim();
    if (!clean) return;
    try {
      const updated = [clean, ...searchHistory.filter((h) => h.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      setSearchHistory(updated);
      localStorage.setItem('huki_search_history', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const removeFromHistory = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = searchHistory.filter((h) => h !== term);
    setSearchHistory(updated);
    try {
      localStorage.setItem('huki_search_history', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearAllHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchHistory([]);
    try {
      localStorage.removeItem('huki_search_history');
    } catch {
      // ignore
    }
  };

  // Fetch real search results from backend catalogApi
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setApiSearchResults([]);
      setIsSearching(false);
      return;
    }
    let isCancelled = false;
    setIsSearching(true);
    catalogApi
      .getPublicBooks({ search: debouncedQuery.trim(), limit: 6 })
      .then((res) => {
        if (!isCancelled && res && res.success && res.data) {
          const items = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
          setApiSearchResults(items);
        }
      })
      .catch((err) => {
        console.warn('Search autocomplete error', err);
      })
      .finally(() => {
        if (!isCancelled) setIsSearching(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedQuery]);

  // Derived user display properties
  const userDisplayName = useMemo(() => {
    if (!user) return 'Khách';
    return (
      (user as any).username ||
      user.fullName ||
      user.name ||
      (user as any).profile?.fullName ||
      (user.role === 'PLATFORM_ADMIN'
        ? 'Super Admin'
        : user.role === 'BUSINESS'
        ? 'Chủ Doanh Nghiệp'
        : user.email
        ? user.email.split('@')[0]
        : 'Khách Hàng')
    );
  }, [user]);

  const roleLabel = useMemo(() => {
    if (!user) return '';
    if (user.role === 'PLATFORM_ADMIN') return 'Super Admin';
    if (user.role === 'BUSINESS') return 'Chủ Doanh Nghiệp';
    if (user.role === 'USER') return 'Độc Giả HUKI';
    return user.role || 'Hội viên';
  }, [user]);

  const TRENDING_KEYWORDS = [
    'Thám Tử Lừng Danh Conan',
    'Dế Mèn Phiêu Lưu Ký',
    'Đắc Nhân Tâm',
    'Kinh Tế Học',
    'Vũ Trụ Trong Vỏ Hạt Dẻ',
    'Manga',
  ];

  const handleSelectKeyword = (keyword: string) => {
    setSearchQuery(keyword);
    saveToHistory(keyword);
    setShowSearchSuggestions(false);
    router.push(`/books?q=${encodeURIComponent(keyword)}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveToHistory(searchQuery.trim());
      setShowSearchSuggestions(false);
      router.push(`/books?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    router.push('/auth/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--theme-surface,#ffffff)] border-b border-[var(--theme-border,#e8e5df)] shadow-2xs shrink-0 transition-colors duration-200">
      {/* Top Utility Bar (h-[28px]) */}
      <div className="h-[28px] bg-[var(--theme-header-top,#003b2b)] text-[var(--theme-header-top-text,#ffffff)] text-[10.5px] px-4 md:px-6 flex items-center justify-between font-medium shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[var(--theme-header-top-accent,#94f5d6)]">verified_user</span>
            <span className="hidden sm:inline">Hệ sinh thái đọc Sách Thật &amp; Bản quyền số HUKI</span>
            <span className="sm:hidden font-semibold">HUKI EBOOK</span>
          </span>
          <span className="hidden sm:inline-block opacity-40">|</span>
          <span className="hidden md:flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px] text-[var(--theme-header-top-accent,#94f5d6)]">support_agent</span>
            Hotline: 1900 8866 (8:00 - 21:00)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/vouchers"
            className="hover:text-[var(--theme-header-top-accent,#94f5d6)] transition-colors flex items-center gap-1 font-semibold text-emerald-200"
          >
            <span className="material-symbols-outlined text-[13px]">confirmation_number</span>
            <span>Mã Giảm Giá</span>
          </Link>
          <span className="opacity-40">|</span>
          <Link
            href="/flash-sale"
            className="hover:text-amber-300 transition-colors flex items-center gap-1 font-extrabold text-amber-300 animate-pulse"
          >
            <span className="material-symbols-outlined text-[13px]">bolt</span>
            <span>⚡ Flash Sale</span>
          </Link>
          <span className="opacity-40">|</span>
          <Link
            href={hasRole('seller') ? '/seller/dashboard' : '/seller'}
            className="hover:text-[var(--theme-header-top-accent,#94f5d6)] transition-colors flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-[13px]">storefront</span>
            <span>Kênh Người Bán</span>
          </Link>
          <span className="opacity-40">|</span>
          <div className="opacity-40 cursor-not-allowed pointer-events-none select-none hidden sm:flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">download</span>
            <span>Tải App (Sắp ra mắt)</span>
          </div>
          <span className="opacity-40 hidden sm:inline">|</span>
          <span className="text-[var(--theme-header-top-accent,#94f5d6)] font-semibold">VN</span>
        </div>
      </div>

      {/* Main Header Bar (h-[52px]) */}
      <div className="h-[52px] w-full flex items-center justify-between pr-3 md:pr-6 pl-0 shrink-0">
        {/* Left: Sidebar Toggle & Brand Typography */}
        <div className="flex items-center">
          {/* Hamburger / Sidebar Toggle Container - exactly w-[60px] to align with sidebar column */}
          <div className="w-[60px] flex items-center justify-center shrink-0">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  if (onToggleMobileSidebar) onToggleMobileSidebar();
                } else {
                  if (onToggleSidebar) onToggleSidebar();
                }
              }}
              className="w-9 h-9 rounded-xl border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] flex items-center justify-center text-on-surface hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] active:scale-95 transition-all cursor-pointer shadow-2xs"
              title="Menu điều hướng"
              aria-label="Toggle Sidebar Navigation"
            >
              <span className="material-symbols-outlined text-[20px] text-[var(--theme-primary,#003b2b)]">
                menu
              </span>
            </button>
          </div>

          <Link href="/" className="flex flex-col group pl-1.5 pr-2 select-none">
            <span className="font-editorial text-lg md:text-xl font-black tracking-tight text-[var(--theme-primary,#003b2b)] leading-none">
              HUKI EBOOK
            </span>
            <span className="text-[7.5px] md:text-[8px] uppercase tracking-widest text-[#006953] font-bold mt-0.5">
              Sách Số &amp; Sách In
            </span>
          </Link>
        </div>

        {/* Global Semantic Search Bar */}
        <div ref={searchContainerRef} className="flex-1 max-w-xl mx-2 lg:mx-4 relative hidden md:block">
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-[var(--theme-surface-subtle,#f8f6f1)] border border-[var(--theme-border,#e8e5df)] rounded-lg px-2.5 py-1 focus-within:border-[var(--theme-primary,#003b2b)] focus-within:bg-[var(--theme-surface,#ffffff)] focus-within:ring-1 focus-within:ring-[var(--theme-primary,#003b2b)]/20 transition-all shadow-2xs">
              <span className="material-symbols-outlined text-[var(--theme-text-muted,#6b7280)] text-sm mr-1.5 shrink-0">search</span>
              <input
                type="text"
                placeholder="Tìm tác phẩm, tác giả, ISBN, chủ đề..."
                value={searchQuery}
                onFocus={() => setShowSearchSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                className="w-full bg-transparent border-none outline-none text-[11.5px] text-[var(--theme-text,#17201f)] placeholder-[var(--theme-text-muted,#6b7280)]"
              />
              <button
                type="submit"
                className="bg-[#003b2b] text-white px-2.5 py-0.5 rounded-md text-[11px] font-semibold hover:bg-[#00281d] transition-colors ml-1 shrink-0 cursor-pointer shadow-2xs"
              >
                Tìm
              </button>
            </div>
          </form>

          {/* Live Search Autocomplete Popover */}
          {showSearchSuggestions && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[var(--theme-surface,#ffffff)] rounded-2xl shadow-2xl border border-[var(--theme-border,#e8e5df)] p-3 z-50 animate-fade-in-up text-xs overflow-hidden max-h-[460px] overflow-y-auto">
              {/* Case 1: Search Query is Empty -> Show Search History & Trending */}
              {!searchQuery.trim() ? (
                <div className="flex flex-col gap-3">
                  {/* Search History */}
                  {searchHistory.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between px-1 mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">history</span>
                          <span>Lịch sử tìm kiếm</span>
                        </span>
                        <button
                          type="button"
                          onClick={clearAllHistory}
                          className="text-[10.5px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          Xóa tất cả
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {searchHistory.map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectKeyword(item)}
                            className="group/item flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                          >
                            <span>{item}</span>
                            <button
                              type="button"
                              onClick={(e) => removeFromHistory(item, e)}
                              className="text-slate-400 hover:text-rose-600 rounded-full p-0.5"
                              title="Xóa khỏi lịch sử"
                            >
                              <span className="material-symbols-outlined text-[13px] block">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Trending Keywords */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-amber-500">trending_up</span>
                      <span>Từ khóa phổ biến</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {TRENDING_KEYWORDS.map((kw, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectKeyword(kw)}
                          className="px-2.5 py-1 bg-emerald-50/60 hover:bg-emerald-100 text-[#003b2b] border border-emerald-200/60 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:scale-102"
                        >
                          {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Case 2: Search Query is typed -> Show Live Books Autocomplete */
                <div>
                  <div className="text-[10px] font-bold text-[var(--theme-text-muted,#6b7280)] uppercase tracking-wider px-1 py-0.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      {isSearching ? (
                        <span className="material-symbols-outlined animate-spin text-[13px] text-[#003b2b]">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-[13px]">auto_stories</span>
                      )}
                      <span>Gợi ý tác phẩm</span>
                    </span>
                    <span>{apiSearchResults.length} kết quả</span>
                  </div>

                  {isSearching && apiSearchResults.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      <span>Đang tìm kiếm...</span>
                    </div>
                  ) : apiSearchResults.length > 0 ? (
                    <div className="divide-y divide-slate-100 mt-1">
                      {apiSearchResults.map((b) => {
                        const coverSrc = b.coverImage || b.coverUrl || b.cover || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80';
                        const authorName = typeof b.author === 'string' ? b.author : (b.author as any)?.name || 'Nhiều tác giả';
                        const categoryName = typeof b.category === 'string' ? b.category : (b.category as any)?.name || 'Văn học & Tri thức';

                        return (
                          <Link
                            key={b.id}
                            href={`/book/${b.id}`}
                            onClick={() => {
                              saveToHistory(b.title);
                              setShowSearchSuggestions(false);
                            }}
                            className="flex items-center gap-3 p-2 rounded-xl hover:bg-emerald-50/50 transition-colors group"
                          >
                            <img
                              src={coverSrc}
                              alt={b.title}
                              className="w-9 h-12 rounded-md object-cover border border-black/10 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-slate-900 group-hover:text-[#003b2b] transition-colors line-clamp-1">
                                {b.title}
                              </p>
                              <p className="text-[11px] text-slate-500 line-clamp-1">
                                Tác giả: {authorName} • <span className="text-[#00875A] font-semibold">{categoryName}</span>
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-bold text-[#003b2b] block">
                                {(b.price || 89000).toLocaleString('vi-VN')}đ
                              </span>
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                {b.format === 'DIGITAL' ? 'Ebook' : b.format === 'PHYSICAL' ? 'Sách Giấy' : 'Ebook + Giấy'}
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-400">
                      Không tìm thấy sách nào khớp với "{searchQuery}"
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSearch}
                    className="w-full mt-2 py-2 rounded-xl bg-slate-50 hover:bg-[#003b2b] hover:text-white text-[#003b2b] font-bold text-center transition-colors text-xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Xem tất cả kết quả cho "{searchQuery}"</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Action Icons & User Account */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Cart Icon */}
          <Link
            href="/cart"
            className="w-9 h-9 rounded-xl border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] flex items-center justify-center text-[var(--theme-text,#17201f)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] transition-all relative"
            title="Giỏ hàng HUKI"
          >
            <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
            {totalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#003b2b] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {totalItemsCount > 99 ? '99+' : totalItemsCount}
              </span>
            )}
          </Link>

          {/* User Account / Auth Buttons */}
          {isLoggedIn ? (
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 pl-1.5 pr-2.5 rounded-full border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] transition-all cursor-pointer shadow-2xs group"
                title="Tài khoản cá nhân"
              >
                <UserAvatar user={user} size="sm" />
                <span className="hidden sm:inline-block text-xs font-bold text-[var(--theme-text,#17201f)] group-hover:text-[var(--theme-primary,#003b2b)] max-w-[130px] truncate transition-colors">
                  {userDisplayName}
                </span>
                <span className="material-symbols-outlined text-base text-[var(--theme-text-muted,#6b7280)] group-hover:text-[var(--theme-primary,#003b2b)] transition-colors">
                  arrow_drop_down
                </span>
              </button>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-[var(--theme-surface,#ffffff)] rounded-2xl shadow-xl border border-[var(--theme-border,#e8e5df)] p-2 z-50 animate-fade-in-up text-xs">
                  <div className="p-2 border-b border-[var(--theme-border,#e8e5df)]">
                    <p className="font-bold text-[var(--theme-text,#17201f)] text-sm">{userDisplayName}</p>
                    <p className="text-[11px] text-[var(--theme-text-muted,#6b7280)]">{user?.email}</p>
                    <span className="inline-block mt-1 bg-[var(--theme-secondary-subtle,#e6f4f0)] text-[var(--theme-primary,#003b2b)] px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {roleLabel}
                    </span>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/profile"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">person</span>
                        <span>Trang Cá Nhân &amp; Tài Khoản</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                    </Link>

                    <Link
                      href="/library"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">auto_stories</span>
                        <span>Tủ Sách Cá Nhân</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                    </Link>

                    <Link
                      href="/orders"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">local_shipping</span>
                        <span>Đơn Mua Của Tôi</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                    </Link>

                    <Link
                      href="/vouchers?tab=wallet"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">confirmation_number</span>
                        <span>Ví Voucher Của Tôi</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                    </Link>

                    <Link
                      href="/profile/addresses"
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">location_on</span>
                        <span>Sổ Địa Chỉ Giao Hàng</span>
                      </div>
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                    </Link>

                    <div className="pt-1">
                      <Link
                        href="/seller/register"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold border border-emerald-200/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-base text-[#003b2b]">store</span>
                          <span>Đăng Ký Trở Thành NXB</span>
                        </div>
                        <span className="material-symbols-outlined text-sm text-[#003b2b]">chevron_right</span>
                      </Link>
                    </div>
                  </div>

                  {/* Dark Mode Toggle */}
                  <div className="border-t border-[var(--theme-border,#e8e5df)] my-1.5 pt-1.5">
                    <div className="flex items-center justify-between px-2.5 py-1.5 text-[11.5px] font-medium text-[var(--theme-text,#17201f)]">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-[var(--theme-text-muted,#6b7280)]">
                          {isDarkMode ? 'dark_mode' : 'light_mode'}
                        </span>
                        <span>Chế độ ban đêm</span>
                      </div>
                      <button
                        type="button"
                        onClick={toggleDarkMode}
                        className={`w-8 h-5 rounded-full p-0.5 flex items-center transition-colors cursor-pointer ${
                          isDarkMode ? 'bg-[#003b2b]' : 'bg-gray-300'
                        }`}
                        aria-label="Chuyển đổi Dark mode"
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-3.5' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[var(--theme-border,#e8e5df)] my-1.5"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-emerald-50 text-[#003b2b] font-bold text-left transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>Đăng Xuất Tài Khoản</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/auth/login"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--theme-primary,#003b2b)] border border-[var(--theme-primary,#003b2b)]/30 hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">login</span>
                <span>Đăng Nhập</span>
              </Link>
              <Link
                href="/auth/register"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#003b2b] hover:bg-[#00281d] transition-all shadow-xs flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                <span className="hidden sm:inline">Đăng Ký</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
