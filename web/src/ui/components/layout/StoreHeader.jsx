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
  const { user, isLoggedIn, logout, hasRole } = useAuth();
  const { theme, setTheme, isDarkMode, toggleDarkMode, palettes, currentPalette } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const userMenuRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Derived user display properties
  const userDisplayName = useMemo(() => {
    if (!user) return 'Khách';
    return (
      user.fullName ||
      user.name ||
      user.profile?.fullName ||
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
            to="/flash-sale"
            className="hover:text-amber-300 transition-colors flex items-center gap-1 font-extrabold text-amber-300 animate-pulse"
          >
            <span className="material-symbols-outlined text-[14px]">bolt</span>
            <span>⚡ Flash Sale</span>
          </Link>
          <span className="opacity-40">|</span>
          <Link
            to={hasRole('seller') ? '/seller/dashboard' : '/seller'}
            className="hover:text-[var(--theme-header-top-accent,#94f5d6)] transition-colors flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-[14px]">storefront</span>
            <span>Kênh Người Bán</span>
          </Link>
          <span className="opacity-40">|</span>
          <div className="opacity-40 cursor-not-allowed pointer-events-none select-none hidden sm:flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">download</span>
            <span>Tải App (Sắp ra mắt)</span>
          </div>
          <span className="opacity-40 hidden sm:inline">|</span>
          <span className="text-[var(--theme-header-top-accent,#94f5d6)] font-semibold">VN</span>
        </div>
      </div>

      {/* Main Header Bar (h-[54px]) */}
      <div className="h-[54px] w-full pr-4 md:pr-6 pl-0 flex items-center justify-between gap-3 lg:gap-5 shrink-0">
        {/* Left: Sidebar Toggle & Brand Logo */}
        <div className="flex items-center">
          {/* Hamburger / Sidebar Toggle Button Box (56px/60px width matches mini-rail center alignment) */}
          <div className="w-[52px] lg:w-[60px] flex items-center justify-center shrink-0">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  if (onToggleMobileSidebar) onToggleMobileSidebar();
                } else {
                  if (onToggleSidebar) onToggleSidebar();
                }
              }}
              className="w-8 h-8 rounded-xl border border-[var(--theme-border,#e8e5df)] hover:border-[var(--theme-primary,#003b2b)] flex items-center justify-center text-on-surface hover:text-primary hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] active:scale-95 transition-all cursor-pointer"
              title={isSidebarCollapsed ? 'Mở rộng menu điều hướng' : 'Thu gọn menu điều hướng'}
              aria-label="Toggle Sidebar Navigation"
            >
              <span className="material-symbols-outlined text-[18px] transition-transform duration-200">
                {isSidebarCollapsed ? 'menu' : 'menu_open'}
              </span>
            </button>
          </div>

          <Link to="/" className="flex items-center gap-2 group pr-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--theme-primary,#003b2b)] flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform shrink-0">
              <span className="material-symbols-outlined text-lg">menu_book</span>
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-lg md:text-xl font-bold tracking-tight text-[var(--theme-primary,#003b2b)] leading-none">
                HUKI EBOOK
              </span>
              <span className="text-[8px] md:text-[9px] uppercase tracking-widest text-[#ac2c19] font-bold mt-0.5">
                Sách Số &amp; Sách In
              </span>
            </div>
          </Link>
        </div>

        {/* Global Semantic Search Bar (Lengthened & Centered) */}
        <div ref={searchContainerRef} className="flex-1 max-w-2xl mx-2 lg:mx-4 relative hidden md:block">
          <form onSubmit={handleSearch}>
            <div className="flex items-center bg-[var(--theme-surface-subtle,#f8f6f1)] border border-[var(--theme-border,#e8e5df)] rounded-xl px-3 py-1.5 focus-within:border-[var(--theme-primary,#003b2b)] focus-within:bg-[var(--theme-surface,#ffffff)] focus-within:ring-2 focus-within:ring-[var(--theme-primary,#003b2b)]/15 transition-all shadow-2xs">
              <span className="material-symbols-outlined text-[var(--theme-text-muted,#6b7280)] text-base mr-2 shrink-0">search</span>
              <input
                type="text"
                placeholder="Tìm tác phẩm, tác giả, ISBN, chủ đề..."
                value={searchQuery}
                onFocus={() => setShowSearchSuggestions(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(true);
                }}
                className="w-full bg-transparent border-none outline-none text-xs text-[var(--theme-text,#17201f)] placeholder-[var(--theme-text-muted,#6b7280)]"
              />
              <button
                type="submit"
                className="bg-[var(--theme-accent,#ac2c19)] text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-[var(--theme-accent-hover,#8e1404)] transition-colors ml-1.5 shrink-0 cursor-pointer shadow-xs"
              >
                Tìm
              </button>
            </div>
          </form>

          {/* Live Search Autocomplete Popover */}
          {showSearchSuggestions && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-[var(--theme-surface,#ffffff)] rounded-xl shadow-xl border border-[var(--theme-border,#e8e5df)] p-2.5 z-50 animate-fade-in-up text-xs overflow-hidden">
              <div className="text-[10px] font-bold text-[var(--theme-text-muted,#6b7280)] uppercase tracking-wider px-2 py-0.5 flex items-center justify-between">
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
          {/* Messenger / Tin nhắn (Deferred) */}
          <div
            className="w-10 h-10 rounded-xl border border-[var(--theme-border,#e8e5df)] flex items-center justify-center relative opacity-35 cursor-not-allowed pointer-events-none select-none text-[var(--theme-text-muted,#8d706b)] bg-black/5 dark:bg-white/5"
            title="Tin nhắn (Sắp ra mắt)"
            aria-label="Tin nhắn (Sắp ra mắt)"
          >
            <span className="material-symbols-outlined text-[22px]">
              chat
            </span>
          </div>

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
                <UserAvatar src={user?.avatar} name={userDisplayName} size="w-7 h-7" />
                <span className="hidden xl:inline text-xs font-bold text-[var(--theme-text,#17201f)] pr-1.5 truncate max-w-[120px]">
                  {userDisplayName}
                </span>
                <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)] -ml-1">
                  expand_more
                </span>
              </button>

              {showUserMenu && (
                <div
                  className="absolute right-0 mt-2 w-76 sm:w-80 max-h-[calc(100vh-100px)] overflow-y-auto overscroll-contain custom-scroll bg-[var(--theme-surface,#ffffff)] rounded-2xl shadow-2xl border border-[var(--theme-border,#e8e5df)] p-3 z-50 text-xs animate-fade-in-up"
                >
                  {/* User Profile Header Card */}
                  <div className="p-3 border border-[var(--theme-border,#e8e5df)] mb-2 bg-[var(--theme-surface-subtle,#f9fbfb)] rounded-xl">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <UserAvatar src={user?.avatar} name={userDisplayName} size="w-9 h-9" />
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--theme-text,#17201f)] text-sm truncate">{userDisplayName}</p>
                          <p className="text-[11px] text-[var(--theme-text-muted,#6b7280)] truncate">{user?.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-[#fea619]/20 text-[#684000] px-2 py-0.5 rounded-full font-bold shrink-0 flex items-center gap-1">
                        🔥 {user?.streakDays || 0} ngày
                      </span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-[var(--theme-border,#e8e5df)]/60 flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        user?.role === 'PLATFORM_ADMIN'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : user?.role === 'BUSINESS' || user?.hasApprovedBusiness || Boolean(user?.business)
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {user?.role === 'PLATFORM_ADMIN'
                          ? 'SUPER ADMIN (ROOT)'
                          : user?.role === 'BUSINESS' || user?.hasApprovedBusiness || Boolean(user?.business)
                          ? 'NXB CHÍNH HÃNG (MALL)'
                          : 'ĐỘC GIẢ THÂN THIẾT'}
                      </span>
                      <Link
                        to="/profile"
                        onClick={() => setShowUserMenu(false)}
                        className="text-[11px] text-[var(--theme-primary,#003b2b)] hover:underline font-semibold flex items-center gap-0.5"
                      >
                        <span>Hồ sơ cá nhân</span>
                        <span className="material-symbols-outlined text-[13px]">chevron_right</span>
                      </Link>
                    </div>
                  </div>

                  {/* ---------------------------------------------------- */}
                  {/* CASE 1: SUPER ADMIN (PLATFORM_ADMIN)                */}
                  {/* ---------------------------------------------------- */}
                  {user?.role === 'PLATFORM_ADMIN' && (
                    <div className="mb-2 space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold text-purple-800 uppercase tracking-wider flex items-center justify-between">
                        <span>Ban Quản Trị Hệ Thống</span>
                        <span className="text-[9px] bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded font-extrabold">ADMIN</span>
                      </div>

                      <Link
                        to="/admin/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold border border-purple-200/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-base text-purple-700">dashboard</span>
                          <span>Bảng Điều Hành Sàn</span>
                        </div>
                        <span className="material-symbols-outlined text-sm text-purple-700">chevron_right</span>
                      </Link>

                      <Link
                        to="/admin/leads"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-purple-50/50 text-purple-950 font-semibold transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-base text-amber-600">how_to_reg</span>
                          <span>Duyệt Đăng Ký Mới</span>
                        </div>
                        <span className="material-symbols-outlined text-sm text-gray-400">chevron_right</span>
                      </Link>
                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* CASE 2: SELLER / PUBLISHER (BUSINESS)               */}
                  {/* ---------------------------------------------------- */}
                  {user?.role !== 'PLATFORM_ADMIN' && (user?.role === 'BUSINESS' || user?.hasApprovedBusiness || Boolean(user?.business)) && (
                    <div className="mb-2 space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                        <span>Kênh Nhà Xuất Bản</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-extrabold">MALL</span>
                      </div>

                      <Link
                        to="/seller/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold border border-emerald-200/80 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-base text-emerald-700">dashboard</span>
                          <span>Bàn Làm Việc NXB</span>
                        </div>
                        <span className="material-symbols-outlined text-sm text-emerald-700">chevron_right</span>
                      </Link>

                      <Link
                        to="/seller/products"
                        onClick={() => setShowUserMenu(false)}
                        className="flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-emerald-50/50 text-[var(--theme-text,#17201f)] font-semibold transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-base text-[var(--theme-primary,#003b2b)]">inventory</span>
                          <span>Kho Sách &amp; Xuất Bản</span>
                        </div>
                        <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted,#6b7280)]">chevron_right</span>
                      </Link>
                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* CASE 3: BUYER / REGULAR USER (USER)                 */}
                  {/* ---------------------------------------------------- */}
                  {user?.role !== 'PLATFORM_ADMIN' && user?.role !== 'BUSINESS' && !user?.hasApprovedBusiness && !user?.business && (
                    <div className="mb-2 space-y-1">
                      <div className="px-2 py-1 text-[10px] font-bold text-[var(--theme-text-muted,#6b7280)] uppercase tracking-wider">
                        Lối Tắt Bạn Đọc
                      </div>

                      <Link
                        to="/orders"
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
                        to="/settings/addresses"
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
                          to="/seller/register"
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-200/80 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="material-symbols-outlined text-base text-amber-700">store</span>
                            <span>Đăng Ký Trở Thành NXB</span>
                          </div>
                          <span className="material-symbols-outlined text-sm text-amber-700">chevron_right</span>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* ---------------------------------------------------- */}
                  {/* READING THEME / COLOR PALETTES PERSONALIZATION SECTION */}
                  {/* ---------------------------------------------------- */}
                  <div className="border-t border-[var(--theme-border,#e8e5df)] my-1.5 pt-1.5">
                    <div className="px-2 py-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--theme-text-muted,#6b7280)] uppercase tracking-wider">
                        <span className="material-symbols-outlined text-[13px] text-[var(--theme-primary,#003b2b)]">palette</span>
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

                  <div className="border-t border-[var(--theme-border,#e8e5df)] my-1.5"></div>

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

