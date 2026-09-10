import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { booksData } from '../../data/mockData';
import UserAvatar from '../common/UserAvatar';

export default function StoreHeader({ onToggleSidebar, onToggleMobileSidebar, isSidebarCollapsed }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalItemsCount } = useCart();
  const { user, isLoggedIn, logout, switchDemoAccount, hasRole } = useAuth();
  const { theme, setTheme, isDarkMode, toggleDarkMode, palettes, currentPalette } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const userMenuRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Live matching books for autocomplete
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    return booksData.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.author.toLowerCase().includes(q) || 
      (b.category && b.category.toLowerCase().includes(q))
    ).slice(0, 5);
  }, [searchQuery]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSearchSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setShowUserMenu(false);
    setShowSearchSuggestions(false);
  }, [location.pathname]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSearchSuggestions(false);
      navigate(`/books?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--theme-surface,#ffffff)] border-b border-[var(--theme-border,#e8e5df)] shadow-sm shrink-0 transition-colors duration-200">
      {/* Top Utility Bar (h-[30px]) */}
      <div className="h-[30px] bg-[var(--theme-header-top,#003b2b)] text-[var(--theme-header-top-text,#ffffff)] text-[11px] px-4 md:px-8 flex items-center justify-between font-medium shrink-0 transition-colors duration-200">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-[var(--theme-header-top-accent,#94f5d6)]">verified_user</span>
            <span className="hidden sm:inline">Hệ sinh thái đọc Sách Thật &amp; Bản quyền số HUKI</span>
            <span className="sm:hidden font-semibold">HUKI EBOOK</span>
          </span>
          <span className="hidden sm:inline-block opacity-40">|</span>
          <span className="hidden md:flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-[var(--theme-header-top-accent,#94f5d6)]">support_agent</span>
            Hotline: 1900 8866 (8:00 - 21:00)
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={hasRole('seller') ? '/seller/dashboard' : '/seller'}
            className="hover:text-[var(--theme-header-top-accent,#94f5d6)] transition-colors flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-[14px]">storefront</span>
            <span>Kênh Người Bán</span>
          </Link>
          <span className="opacity-40">|</span>
          <Link to="/reader" aria-disabled="true" tabIndex={-1} className="pointer-events-none opacity-40 grayscale hidden sm:flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">download</span>
            <span>Tải App Huki</span>
          </Link>
          <span className="opacity-40 hidden sm:inline">|</span>
          <span className="text-[var(--theme-header-top-accent,#94f5d6)] font-semibold">VN</span>
        </div>
      </div>

      {/* Main Header Bar (h-[62px]) */}
      <div className="h-[62px] w-full pr-4 md:pr-6 pl-0 flex items-center justify-between gap-3 lg:gap-6 shrink-0">
        {/* Left: Sidebar Toggle & Brand Logo */}
        <div className="flex items-center">
          {/* Hamburger / Sidebar Toggle Button Box (68px width matches mini-rail center alignment) */}
          <div className="w-[56px] lg:w-[68px] flex items-center justify-center shrink-0">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  if (onToggleMobileSidebar) onToggleMobileSidebar();
                } else {
                  if (onToggleSidebar) onToggleSidebar();
                }
              }}
              className="w-10 h-10 rounded-xl border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] flex items-center justify-center text-on-surface hover:text-primary hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] active:scale-95 transition-all cursor-pointer"
              title={isSidebarCollapsed ? 'Mở rộng menu điều hướng' : 'Thu gọn menu điều hướng'}
              aria-label="Toggle Sidebar Navigation"
            >
              <span className="material-symbols-outlined text-[22px] transition-transform duration-200">
                {isSidebarCollapsed ? 'menu' : 'menu_open'}
              </span>
            </button>
          </div>

          <Link to="/" className="flex items-center gap-2.5 group pr-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary,#003b2b)] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
              <span className="material-symbols-outlined text-xl">menu_book</span>
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-xl md:text-2xl font-bold tracking-tight text-[var(--theme-primary,#003b2b)] leading-none">
                HUKI EBOOK
              </span>
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-[#ac2c19] font-bold mt-0.5">
                Sách Số &amp; Sách In
              </span>
            </div>
          </Link>
        </div>

        {/* Global Semantic Search Bar (Lengthened & Centered) */}
        <div ref={searchContainerRef} className="flex-1 max-w-2xl mx-2 lg:mx-4 relative hidden md:block">
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-[var(--theme-surface-subtle,#f8f6f1)] border border-[var(--theme-border,#e8e5df)] rounded-xl px-4 py-2 focus-within:border-[var(--theme-primary,#003b2b)] focus-within:bg-[var(--theme-surface,#ffffff)] focus-within:ring-2 focus-within:ring-[var(--theme-primary,#003b2b)]/15 transition-all shadow-2xs">
              <span className="material-symbols-outlined text-[var(--theme-text-muted,#6b7280)] text-lg mr-2.5 shrink-0">search</span>
              <input
                type="text"
                placeholder="Tìm kiếm tác phẩm, tác giả, ISBN, bài review hoặc chủ đề..."
                value={searchQuery}
                onFocus={() => setShowSearchSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                className="w-full bg-transparent border-none outline-none text-xs md:text-sm text-[var(--theme-text,#17201f)] placeholder-[var(--theme-text-muted,#6b7280)]"
              />
              <button
                type="submit"
                className="bg-[var(--theme-accent,#ac2c19)] text-white px-4 py-1.5 rounded-lg text-xs font-semibold hover:bg-[var(--theme-accent-hover,#8e1404)] transition-colors ml-2 shrink-0 cursor-pointer shadow-xs"
              >
                Tìm
              </button>
            </div>
          </form>

          {/* Live Search Autocomplete Popover */}
          {showSearchSuggestions && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--theme-surface,#ffffff)] rounded-2xl shadow-2xl border border-[var(--theme-border,#e8e5df)] p-3 z-50 animate-fade-in-up text-xs overflow-hidden">
              <div className="text-[11px] font-bold text-[var(--theme-text-muted,#6b7280)] uppercase tracking-wider px-2 py-1 flex items-center justify-between">
                <span>Gợi ý tác phẩm</span>
                <span>{searchResults.length} kết quả</span>
              </div>

              {searchResults.length > 0 ? (
                <div className="divide-y divide-[var(--theme-border,#e8e5df)]/50 mt-1">
                  {searchResults.map((b) => (
                    <Link
                      key={b.id}
                      to={`/book/${b.id}`}
                      onClick={() => setShowSearchSuggestions(false)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] transition-colors group"
                    >
                      <img src={b.cover} alt={b.title} className="w-9 h-12 rounded object-cover border border-black/10 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[var(--theme-text,#17201f)] truncate group-hover:text-[var(--theme-primary,#003b2b)] transition-colors">
                          {b.title}
                        </p>
                        <p className="text-[11px] text-[var(--theme-text-muted,#6b7280)] truncate">
                          Tác giả: {b.author} • <span className="text-[var(--theme-primary,#003b2b)] font-semibold">{b.category}</span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-[var(--theme-accent,#ac2c19)] block">
                          {(b.priceEbook || b.pricePaper || 89000).toLocaleString('vi-VN')}đ
                        </span>
                        <span className="text-[9px] bg-[#006953]/10 text-[#006953] px-1.5 py-0.2 rounded font-bold">
                          Ebook / Giấy
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-[var(--theme-text-muted,#6b7280)]">
                  Không tìm thấy sách nào khớp với "{searchQuery}"
                </div>
              )}

              <button
                onClick={handleSearch}
                className="w-full mt-2 py-2 rounded-xl bg-[var(--theme-surface-subtle,#f8f6f1)] hover:bg-[var(--theme-primary,#003b2b)] hover:text-white text-[var(--theme-primary,#003b2b)] font-bold text-center transition-colors text-xs flex items-center justify-center gap-1"
              >
                <span>Xem tất cả kết quả cho "{searchQuery}"</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Actions: Messenger, Cart & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Messenger / Tin nhắn */}
          <Link
            to="/chat"
            aria-disabled="true"
            tabIndex={-1}
            className={`pointer-events-none opacity-35 grayscale w-10 h-10 rounded-xl border transition-all flex items-center justify-center relative group ${
              location.pathname.startsWith('/chat') || location.pathname.startsWith('/messages')
                ? 'bg-[var(--theme-primary,#003b2b)] text-white border-[var(--theme-primary,#003b2b)] shadow-xs'
                : 'border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)]'
            }`}
            title="Tin nhắn & Trò chuyện"
            aria-label="Tin nhắn & Trò chuyện"
          >
            <span className={`material-symbols-outlined text-[22px] transition-colors ${
              location.pathname.startsWith('/chat') || location.pathname.startsWith('/messages')
                ? 'text-white'
                : 'group-hover:text-[var(--theme-primary,#003b2b)]'
            }`}>
              chat
            </span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-xs">
              1
            </span>
          </Link>

          {/* Cart Icon */}
          <Link
            to="/cart"
            className={`w-10 h-10 rounded-xl border transition-all flex items-center justify-center relative group ${
              location.pathname.startsWith('/cart')
                ? 'bg-[var(--theme-primary,#003b2b)] text-white border-[var(--theme-primary,#003b2b)] shadow-xs'
                : 'border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)]'
            }`}
            title="Xem giỏ hàng"
            aria-label="Xem giỏ hàng"
          >
            <span className={`material-symbols-outlined text-[22px] transition-colors ${
              location.pathname.startsWith('/cart')
                ? 'text-white'
                : 'group-hover:text-[var(--theme-primary,#003b2b)]'
            }`}>
              shopping_cart
            </span>
            {totalItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[var(--theme-accent,#ac2c19)] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                {totalItemsCount}
              </span>
            )}
          </Link>

          {/* User Profile or Login/Register Buttons */}
          {isLoggedIn && user ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] hover:border-[var(--theme-primary,#003b2b)] transition-all border border-[var(--theme-border,#e8e5df)] cursor-pointer"
                aria-expanded={showUserMenu}
                aria-label="Menu tài khoản"
              >
                <UserAvatar src={user?.avatar} name={user?.name || "Khách"} size="w-7 h-7" />
                <span className="hidden xl:inline text-xs font-bold text-[var(--theme-text,#17201f)] pr-1.5 truncate max-w-[110px]">
                  {user?.name || "Khách"}
                </span>
                <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)] -ml-1">
                  expand_more
                </span>
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-72 sm:w-80 max-h-[calc(100vh-105px)] overflow-y-auto overscroll-contain custom-scroll bg-[var(--theme-surface,#ffffff)] rounded-2xl shadow-2xl border border-[var(--theme-border,#e8e5df)] p-2.5 z-50 text-xs animate-fade-in-up"
                >
                  <div className="px-3 py-2.5 border-b border-[var(--theme-border,#e8e5df)] mb-1 bg-[var(--theme-surface-subtle,#f9fbfb)] rounded-xl">
                    <p className="font-bold text-[var(--theme-text,#17201f)] text-sm truncate">{user?.name || "Khách Hàng"}</p>
                    <p className="text-[11px] text-[var(--theme-text-muted,#6b7280)] truncate">{user?.email}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[var(--theme-accent,#ac2c19)] font-bold text-[11px]">{user?.role || "Hội viên Gold"}</span>
                      <span className="text-[10px] bg-[#fea619]/20 text-[#684000] px-1.5 py-0.5 rounded font-bold">
                        🔥 {user?.streakDays || 14} ngày
                      </span>
                    </div>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-medium"
                  >
                    <span className="material-symbols-outlined text-base text-[var(--theme-secondary,#006953)]">account_circle</span>
                    <span>Hồ sơ cá nhân &amp; Streak</span>
                  </Link>

                  <Link
                    to="/library"
                    onClick={() => setShowUserMenu(false)}
                    aria-disabled="true"
                    tabIndex={-1}
                    className="pointer-events-none opacity-35 grayscale flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--theme-text,#17201f)] font-medium"
                  >
                    <span className="material-symbols-outlined text-base text-[var(--theme-secondary,#006953)]">auto_stories</span>
                    <span>Tủ sách của tôi</span>
                  </Link>

                  <Link
                    to="/orders"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-text,#17201f)] font-medium"
                  >
                    <span className="material-symbols-outlined text-base text-[var(--theme-secondary,#006953)]">local_shipping</span>
                    <span>Lịch sử đơn hàng</span>
                  </Link>

                  <Link
                    to="/wallet"
                    onClick={() => setShowUserMenu(false)}
                    aria-disabled="true"
                    tabIndex={-1}
                    className="pointer-events-none opacity-35 grayscale flex items-center gap-2.5 px-3 py-2 rounded-xl text-[var(--theme-text,#17201f)] font-medium"
                  >
                    <span className="material-symbols-outlined text-base text-[var(--theme-secondary,#006953)]">account_balance_wallet</span>
                    <span>Ví HUKI Xu &amp; Ưu Đãi</span>
                  </Link>

                  <Link
                    to={hasRole('seller') ? '/seller/dashboard' : '/seller/register'}
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] text-[var(--theme-accent,#ac2c19)] font-bold"
                  >
                    <span className="material-symbols-outlined text-base text-[var(--theme-accent,#ac2c19)]">store</span>
                    <span>{hasRole('seller') ? 'Kênh Người Bán & DRM' : 'Đăng ký Người Bán'}</span>
                  </Link>

                  {/* ---------------------------------------------------- */}
                  {/* READING THEME / COLOR PALETTES PERSONALIZATION SECTION */}
                  {/* ---------------------------------------------------- */}
                  <div className="border-t border-[var(--theme-border,#e8e5df)] my-1.5 pt-1.5">
                    <div className="px-2.5 py-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-[var(--theme-text-muted,#6b7280)] uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[14px] text-[var(--theme-primary,#003b2b)]">palette</span>
                        <span>Giao Diện Đọc &amp; Màu Sắc</span>
                      </div>
                      <span className="text-[10px] font-bold text-[var(--theme-primary,#003b2b)] bg-[var(--theme-secondary-subtle,#e6f4f0)] px-2 py-0.5 rounded-full">
                        {currentPalette.name}
                      </span>
                    </div>

                    {/* 8-Palette Grid (2x4 Compact Swatch Tiles) */}
                    <div className="grid grid-cols-2 gap-1 my-1.5">
                      {palettes.map((p) => {
                        const isSelected = theme === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setTheme(p.id)}
                            className={`flex items-center justify-between p-1.5 rounded-xl text-[11px] transition-all cursor-pointer border ${
                              isSelected
                                ? 'bg-[var(--theme-secondary-subtle,#e6f4f0)] text-[var(--theme-primary,#003b2b)] border-[var(--theme-primary,#003b2b)]/40 font-bold shadow-2xs'
                                : 'text-[var(--theme-text,#17201f)] border-transparent hover:bg-black/5 font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0 shadow-2xs"
                                style={{ backgroundColor: p.colors.primary }}
                                title={p.name}
                              />
                              <span className="truncate text-left leading-none">{p.name}</span>
                            </div>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[13px] text-[var(--theme-primary,#003b2b)] font-bold shrink-0">
                                check
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-t border-[var(--theme-border,#e8e5df)]/60 text-[11.5px] font-medium text-[var(--theme-text,#17201f)]">
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
                          isDarkMode ? 'bg-[var(--theme-primary,#003b2b)]' : 'bg-gray-300'
                        }`}
                        aria-label="Chuyển đổi Dark mode"
                      >
                        <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${isDarkMode ? 'translate-x-3.5' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-[var(--theme-border,#e8e5df)] my-1"></div>

                  {import.meta.env.DEV && <><div className="px-2 py-1 text-[10px] text-[var(--theme-text-muted,#6b7280)] font-bold uppercase tracking-wider">
                    Đổi Tài Khoản Mẫu:
                  </div></>}
                  <div className="grid grid-cols-2 gap-1 mb-1">
                    <button
                      type="button"
                      onClick={() => {
                        switchDemoAccount('reader');
                        setShowUserMenu(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-[var(--theme-surface-subtle,#f8f6f1)] hover:bg-[var(--theme-primary,#003b2b)] hover:text-white text-[var(--theme-primary,#003b2b)] text-[11px] font-semibold text-left truncate transition-colors cursor-pointer"
                    >
                      Độc giả VIP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        switchDemoAccount('seller');
                        setShowUserMenu(false);
                      }}
                      className="px-2 py-1 rounded-lg bg-[var(--theme-surface-subtle,#f8f6f1)] hover:bg-[var(--theme-accent,#ac2c19)] hover:text-white text-[var(--theme-accent,#ac2c19)] text-[11px] font-semibold text-left truncate transition-colors cursor-pointer"
                    >
                      NXB Alpha
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-red-50 text-[var(--theme-accent,#ac2c19)] font-bold text-left transition-colors cursor-pointer"
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
                to="/login"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--theme-primary,#003b2b)] border border-[var(--theme-primary,#003b2b)]/30 hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] transition-all flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-base">login</span>
                <span>Đăng Nhập</span>
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[var(--theme-accent,#ac2c19)] hover:bg-[var(--theme-accent-hover,#8e1404)] transition-all shadow-xs flex items-center gap-1"
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

