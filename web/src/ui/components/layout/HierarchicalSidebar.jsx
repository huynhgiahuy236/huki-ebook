import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

const DEFERRED_PREFIXES = [
  '/audiobooks',
  '/chat',
  '/community',
  '/author/',
  '/challenge',
  '/library',
  '/reader',
  '/settings/devices',
  '/seller/chat',
  '/seller/product/correction',
  '/seller/edge-cases',
  '/settings/security',
  '/wallet',
  'invoice',
  'review',
  'return',
  '/forgot-password',
  '/reset-password',
];

export const isDeferredRoute = (to) => {
  if (!to) return false;
  return DEFERRED_PREFIXES.some(prefix => to.includes(prefix));
};

export default function HierarchicalSidebar({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) {
  const location = useLocation();
  const { totalItemsCount } = useCart();
  const { user, isLoggedIn, hasRole } = useAuth();

  // Navigation Schema with nested levels
  const allNavGroups = [
    {
      id: 'store',
      title: 'SÀN THƯƠNG MẠI SÁCH',
      icon: 'storefront',
      items: [
        {
          id: 'store-home',
          title: 'Trang Chủ Sàn',
          to: '/',
          icon: 'home',
          end: true
        },
        {
          id: 'store-flash-sale',
          title: 'Flash Sale Giờ Vàng',
          to: '/flash-sale',
          icon: 'bolt',
          badge: 'HOT',
          badgeColor: 'bg-rose-500 text-white animate-pulse'
        },
        {
          id: 'store-shop',
          title: 'Gian Hàng Mall (Alpha Books)',
          to: '/shop/alpha-books',
          icon: 'verified',
          badge: 'Official',
          badgeColor: 'bg-theme-accent text-white'
        },
        {
          id: 'store-catalog',
          title: 'Khám Phá Sách',
          to: '/books',
          icon: 'menu_book',
          hasSubmenu: true,
          subItems: [
            { title: 'Tất Cả Danh Mục', to: '/books', icon: 'category' },
            { title: 'Sách In & Sách Giấy', to: '/books?format=physical', icon: 'inventory_2' },
            { title: 'Ebook Số Bản Quyền DRM', to: '/books?format=ebook', icon: 'tablet_mac', badge: 'Hot' },
            { title: 'Combo Hybrid Tiết Kiệm', to: '/books?format=hybrid', icon: 'auto_stories' },
            { title: 'Sách Bán Chạy (Bestsellers)', to: '/books?filter=bestseller', icon: 'local_fire_department' }
          ]
        },
        {
          id: 'store-publishers-hub',
          title: 'Nhà Xuất Bản & Tác Giả',
          to: '/stores',
          icon: 'apartment',
          badge: 'Hub',
          badgeColor: 'bg-emerald-600 text-white',
          hasSubmenu: true,
          subItems: [
            { title: 'Gian Hàng NXB Chính Hãng', to: '/stores?tab=publishers', icon: 'storefront' },
            { title: 'Tác Giả & Dịch Giả', to: '/stores?tab=authors', icon: 'person_star' }
          ]
        },
        {
          id: 'store-audiobooks',
          title: 'Sách Nói & Podcasts',
          to: '/audiobooks',
          icon: 'headphones',
          badge: 'Studio',
        },
        {
          id: 'store-chat',
          title: 'Tin Nhắn & Chat Messenger',
          to: '/chat',
          icon: 'chat',
          badge: 'Live',
          badgeColor: 'bg-emerald-600 text-white'
        },
        {
          id: 'store-cart',
          title: 'Giỏ Hàng Của Bạn',
          to: '/cart',
          icon: 'shopping_cart',
          badge: totalItemsCount > 0 ? `${totalItemsCount}` : null,
          badgeColor: 'bg-theme-accent text-white'
        },
        {
          id: 'store-checkout',
          title: 'Thanh Toán & Đơn Hàng',
          to: '/checkout',
          icon: 'receipt_long'
        }
      ]
    },
    {
      id: 'community',
      title: 'MẠNG XÃ HỘI & ĐỘC GIẢ',
      icon: 'groups',
      items: [
        {
          id: 'comm-forum',
          title: 'Diễn Đàn Độc Giả',
          to: '/community',
          icon: 'forum',
          hasSubmenu: true,
          subItems: [
            { title: 'Bảng Tin Thảo Luận', to: '/community', icon: 'dynamic_feed' },
            { title: 'Chuyên Trang Đánh Giá Sách', to: '/community/reviews', icon: 'rate_review', badge: '125k' },
            { title: 'Kho Trích Dẫn Tinh Hoa', to: '/community/quotes', icon: 'format_quote' },
            { title: 'Danh Bạ Book Clubs', to: '/community/clubs', icon: 'diversity_3' },
            { title: 'Thử Thách Đọc 2026', to: '/challenge/2026', icon: 'military_tech', badge: 'Top 10' }
          ]
        },
        {
          id: 'comm-club-detail',
          title: 'CLB Tư Duy Tinh Gọn',
          to: '/community/club/lean-growth',
          icon: 'diversity_3'
        },
        {
          id: 'comm-author',
          title: 'Tác Giả James Clear',
          to: '/author/james-clear',
          icon: 'person_star'
        },
        {
          id: 'comm-challenge',
          title: 'Thử Thách Đọc 2026',
          to: '/challenge/2026',
          icon: 'military_tech'
        }
      ]
    },
    {
      id: 'library',
      title: 'TỦ SÁCH & TRÌNH ĐỌC',
      icon: 'local_library',
      items: [
        {
          id: 'lib-my-books',
          title: 'Tủ Sách Của Tôi',
          to: '/library',
          icon: 'auto_stories',
          hasSubmenu: true,
          subItems: [
            { title: 'Tất Cả Sách Trong Tủ', to: '/library', icon: 'menu_book' },
            { title: 'Sách Đang Đọc Dở', to: '/library?tab=reading', icon: 'schedule' },
            { title: 'Ebook Bản Quyền DRM', to: '/library?tab=drm', icon: 'lock_open' },
            { title: 'Sách Yêu Thích & Muốn Đọc', to: '/library?tab=favorites', icon: 'star' },
            { title: 'Ghi Chú & Trích Dẫn', to: '/library?tab=notes', icon: 'bookmark' }
          ]
        },
        {
          id: 'lib-reader',
          title: 'Trình Đọc Ebook Web',
          to: '/reader',
          icon: 'chrome_reader_mode'
        },
        {
          id: 'lib-devices',
          title: 'Quản Lý Thiết Bị DRM',
          to: '/settings/devices',
          icon: 'devices'
        }
      ]
    },
    {
      id: 'admin',
      title: 'BAN ĐIỀU HÀNH SUPER ADMIN',
      icon: 'admin_panel_settings',
      items: [
        {
          id: 'admin-dash',
          title: 'Bảng Điều Hành Sàn',
          to: '/admin/dashboard',
          icon: 'dashboard'
        },
        {
          id: 'admin-leads',
          title: 'Duyệt Đăng Ký Mới',
          to: '/admin/leads',
          icon: 'how_to_reg'
        },
        {
          id: 'admin-publishers',
          title: 'Quản Lý Nhà Xuất Bản',
          to: '/admin/publishers',
          icon: 'domain'
        },
        {
          id: 'admin-tasks',
          title: 'Kiểm Duyệt Sách & DRM',
          to: '/admin/tasks',
          icon: 'verified'
        },
        {
          id: 'admin-users',
          title: 'Danh Sách Bạn Đọc',
          to: '/admin/users',
          icon: 'groups'
        },
        {
          id: 'admin-deals',
          title: 'Đối Soát Doanh Thu 85/15',
          to: '/admin/deals',
          icon: 'payments'
        }
      ]
    },
    {
      id: 'seller',
      title: 'DOANH NGHIỆP & XUẤT BẢN',
      icon: 'domain',
      items: [
        {
          id: 'seller-dash',
          title: 'Kênh Quản Lý Doanh Nghiệp',
          to: '/seller/dashboard',
          icon: 'dashboard'
        },
        {
          id: 'seller-business-profile',
          title: 'Hồ Sơ Doanh Nghiệp',
          to: '/seller/business',
          icon: 'domain',
          badge: 'Business',
          badgeColor: 'bg-emerald-600 text-white'
        },
        {
          id: 'seller-staff',
          title: 'Quản Lý Nhân Viên',
          to: '/seller/staff',
          icon: 'badge',
          badge: 'Staff',
          badgeColor: 'bg-blue-600 text-white'
        },
        {
          id: 'seller-orders',
          title: 'Quản Lý Đơn Hàng',
          to: '/seller/orders',
          icon: 'local_mall',
          badge: '12',
          badgeColor: 'bg-theme-accent text-white'
        },
        {
          id: 'seller-products',
          title: 'Quản Lý Kho Sách & Xuất Bản',
          to: '/seller/products',
          icon: 'inventory',
          hasSubmenu: true,
          subItems: [
            { title: 'Quản Lý Tồn Kho (3 Tầng)', to: '/seller/inventory', icon: 'warehouse', badge: '3-Tier', badgeColor: 'bg-emerald-600 text-white' },
            { title: 'Thêm Sách Hybrid (Giấy+Ebook)', to: '/seller/product/create-hybrid', icon: 'add_circle' },
            { title: 'Thêm Ebook Kỹ Thuật Số', to: '/seller/product/create-ebook', icon: 'note_add' },
            { title: 'Thêm Sách Giấy & Kho', to: '/seller/product/create-physical', icon: 'library_add' },
            { title: 'Sản Phẩm Đang Bán', to: '/seller/products', icon: 'view_list' },
            { title: 'Sản Phẩm Cần Sửa Lỗi', to: '/seller/product/correction', icon: 'report_problem', badge: '3', badgeColor: 'bg-red-600 text-white' }
          ]
        },
        {
          id: 'seller-partner',
          title: 'Đăng Ký Doanh Nghiệp / NXB',
          to: '/seller/register',
          icon: 'how_to_reg'
        },
        {
          id: 'seller-status',
          title: 'Trạng Thái Thẩm Định Hồ Sơ',
          to: '/status',
          icon: 'pending_actions',
          badge: 'Status',
          badgeColor: 'bg-amber-500 text-stone-900'
        }
      ]
    },
    {
      id: 'account',
      title: 'TÀI KHOẢN & XÁC THỰC',
      icon: 'person',
      items: [
        {
          id: 'acc-profile',
          title: 'Hồ Sơ & Thống Kê',
          to: '/profile',
          icon: 'account_circle'
        },
        {
          id: 'acc-addresses',
          title: 'Sổ Địa Chỉ Giao Hàng',
          to: '/settings/addresses',
          icon: 'location_on'
        },
        {
          id: 'acc-security',
          title: 'Bảo Mật & Đổi Mật Khẩu',
          to: '/settings/security',
          icon: 'shield_person'
        },
        {
          id: 'acc-wallet',
          title: 'Ví Xu & Điểm Thưởng',
          to: '/wallet',
          icon: 'account_balance_wallet'
        },
        {
          id: 'acc-order-tracking',
          title: 'Theo Dõi Đơn Hàng',
          to: '/orders',
          icon: 'local_shipping'
        },
        {
          id: 'acc-order-invoice',
          title: 'Hóa Đơn Điện Tử VAT',
          to: '/orders/invoice',
          icon: 'receipt_long'
        },
        {
          id: 'acc-order-review',
          title: 'Đánh Giá Đơn Hàng',
          to: '/orders/review',
          icon: 'reviews'
        },
        {
          id: 'acc-order-return',
          title: 'Yêu Cầu Đổi Trả / Bảo Hành',
          to: '/orders/return',
          icon: 'assignment_return'
        },
        {
          id: 'acc-auth-group',
          title: 'Luồng Xác Thực (Auth Suite)',
          to: '/login',
          icon: 'lock_person',
          hasSubmenu: true,
          subItems: [
            { title: 'Đăng Nhập (Login)', to: '/login', icon: 'login' },
            { title: 'Đăng Ký Độc Giả (Register)', to: '/register', icon: 'person_add', badge: 'Tặng 150k' },
            { title: 'Quên Mật Khẩu (Forgot)', to: '/forgot-password', icon: 'lock_reset' },
            { title: 'Xác Thực OTP (Verify)', to: '/verify-otp', icon: 'sms' },
            { title: 'Đặt Lại Mật Khẩu (Reset)', to: '/reset-password', icon: 'password' }
          ]
        }
      ]
    }
  ];

  const isAdmin = user?.role === 'PLATFORM_ADMIN';
  const isSeller = !isAdmin && (user?.role === 'BUSINESS' || user?.hasApprovedBusiness || Boolean(user?.business));
  const isBuyer = isLoggedIn && !isAdmin && !isSeller;

  const navGroups = allNavGroups
    .filter(group => {
      if (group.id === 'admin') return isAdmin;
      if (group.id === 'seller') return isSeller;
      if (group.id === 'library' || group.id === 'account') return isBuyer;
      return true;
    })
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (item.id === 'store-shop') return isSeller;
        if (!isLoggedIn && item.id === 'store-checkout') return false;
        return item.id !== 'acc-auth-group';
      })
    }));

  // Primary items for the Mini-Rail mode (clean 8 items with hover tooltips)
  const miniRailItems = [
    { id: 'mini-home', to: '/', icon: 'home', title: 'Trang Chủ Sàn TMĐT' },
    { id: 'mini-books', to: '/books', icon: 'menu_book', title: 'Khám Phá Sách' },
    { id: 'mini-stores', to: '/stores', icon: 'apartment', title: 'Nhà Xuất Bản & Tác Giả' },
    { id: 'mini-community', to: '/community', icon: 'forum', title: 'Mạng Xã Hội Độc Giả' },
    { id: 'mini-chat', to: '/chat', icon: 'chat', title: 'Tin Nhắn & Chat Messenger', badge: '1' },
    ...(isAdmin ? [{ id: 'mini-admin', to: '/admin/dashboard', icon: 'admin_panel_settings', title: 'Bảng Điều Hành Super Admin' }] : []),
    ...(isSeller ? [{ id: 'mini-seller', to: '/seller/dashboard', icon: 'storefront', title: 'Kênh Người Bán & Quản Lý' }] : []),
    ...(isBuyer ? [
      { id: 'mini-library', to: '/library', icon: 'auto_stories', title: 'Tủ Sách & Tiến Độ Đọc' },
      { id: 'mini-reader', to: '/reader', icon: 'chrome_reader_mode', title: 'Trình Đọc Ebook Web' },
      { id: 'mini-profile', to: '/profile', icon: 'account_circle', title: 'Tài Khoản Cá Nhân' }
    ] : []),
    { id: 'mini-cart', to: '/cart', icon: 'shopping_cart', title: 'Giỏ Hàng', badge: totalItemsCount > 0 ? `${totalItemsCount}` : null }
  ];

  // Accordion state: default expand active store & library groups to reduce cognitive clutter
  const [expandedGroups, setExpandedGroups] = useState({
    store: true,
    community: false,
    library: false,
    seller: true,
    admin: true,
    account: false
  });

  const [expandedSubmenus, setExpandedSubmenus] = useState({
    'store-catalog': true,
    'store-publishers-hub': false,
    'comm-forum': false,
    'lib-my-books': false,
    'seller-products': false
  });

  // Auto-expand group and submenu based on current location
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/admin')) {
      setExpandedGroups(prev => ({ ...prev, admin: true }));
    } else if (path.startsWith('/seller')) {
      setExpandedGroups(prev => ({ ...prev, seller: true }));
      if (path.includes('/product/')) {
        setExpandedSubmenus(prev => ({ ...prev, 'seller-products': true }));
      }
    } else if (path.startsWith('/community')) {
      setExpandedGroups(prev => ({ ...prev, community: true }));
      setExpandedSubmenus(prev => ({ ...prev, 'comm-forum': true }));
    } else if (path.startsWith('/library') || path.startsWith('/reader')) {
      setExpandedGroups(prev => ({ ...prev, library: true }));
      setExpandedSubmenus(prev => ({ ...prev, 'lib-my-books': true }));
    } else if (path.startsWith('/stores') || path.startsWith('/publisher') || path.startsWith('/author')) {
      setExpandedGroups(prev => ({ ...prev, store: true }));
      setExpandedSubmenus(prev => ({ ...prev, 'store-publishers-hub': true }));
    } else if (path.startsWith('/books')) {
      setExpandedGroups(prev => ({ ...prev, store: true }));
      setExpandedSubmenus(prev => ({ ...prev, 'store-catalog': true }));
    }
  }, [location.pathname]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const toggleSubmenu = (itemId, e) => {
    if (e) e.preventDefault();
    setExpandedSubmenus(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const closeMobile = () => {
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside
        className={`
          fixed left-0 bottom-0 bg-[var(--theme-surface,#ffffff)] border-r border-[var(--theme-border,#e8e5df)] flex flex-col justify-between
          transition-all duration-300 ease-in-out select-none
          /* Mobile Drawer: full height with top-0 and z-50 */
          ${isMobileOpen ? 'top-0 z-50 translate-x-0 shadow-2xl w-[310px]' : '-translate-x-full lg:translate-x-0'}
          /* Desktop: positioned precisely under StoreHeader (top-[92px]) with z-30 */
          lg:top-[92px] lg:z-30
          ${isCollapsed ? 'lg:w-[68px]' : 'lg:w-[310px]'}
        `}
      >
        {/* Mobile-Only Header Bar with Brand & Close Button */}
        <div className="h-[62px] border-b border-[var(--theme-border,#e8e5df)] px-4 flex items-center justify-between shrink-0 bg-[var(--theme-surface-subtle,#f9fbfb)] lg:hidden">
          <Link to="/" onClick={closeMobile} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--theme-primary,#003b2b)] flex items-center justify-center text-white shadow-sm shrink-0">
              <span className="material-symbols-outlined text-xl">menu_book</span>
            </div>
            <div className="flex flex-col">
              <span className="font-editorial text-lg font-bold tracking-tight text-[var(--theme-primary,#003b2b)] leading-tight">HUKI EBOOK</span>
              <span className="text-[9px] uppercase tracking-wider text-[var(--theme-accent,#ac2c19)] font-bold">Hệ Thống Phân Tầng</span>
            </div>
          </Link>

          <button
            onClick={closeMobile}
            className="p-1.5 rounded-lg text-[var(--theme-text-muted,#6b7280)] hover:text-[var(--theme-text,#17201f)] hover:bg-black/5"
            aria-label="Đóng sidebar"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* ---------------------------------------------------- */}
        {/* VIEW 1: MINI-RAIL MODE (Clean, Elegant 8 primary buttons) */}
        {/* ---------------------------------------------------- */}
        {isCollapsed ? (
          <div className="hidden lg:flex flex-1 flex-col items-center py-4 px-2 space-y-2 overflow-y-auto custom-scroll">
            {miniRailItems.map((item) => {
              const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));
              const isDeferred = isDeferredRoute(item.to);

              if (isDeferred) {
                return (
                  <div key={item.id} className="relative group w-full flex justify-center">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center relative opacity-35 cursor-not-allowed pointer-events-none select-none text-[var(--theme-text-muted,#556963)] bg-black/5 dark:bg-white/5"
                    >
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    </div>
                    {/* Floating Hover Tooltip */}
                    <div className="absolute left-[54px] top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-150">
                      <div className="bg-gray-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5">
                        <span>{item.title}</span>
                        <span className="bg-amber-500/20 text-amber-300 text-[9px] px-1.5 py-0.2 rounded font-bold">
                          Sắp ra mắt
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={item.id} className="relative group w-full flex justify-center">
                  <NavLink
                    to={item.to}
                    className={`
                      w-11 h-11 rounded-xl flex items-center justify-center relative transition-all
                      ${isActive
                        ? 'bg-[var(--theme-primary,#003b2b)] text-white shadow-sm'
                        : 'text-[var(--theme-text-muted,#556963)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)]'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>

                    {/* Notification badge */}
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-[var(--theme-accent,#ac2c19)] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>

                  {/* Floating Hover Tooltip */}
                  <div className="absolute left-[54px] top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-150">
                    <div className="bg-[var(--theme-primary,#003b2b)] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap flex items-center gap-1.5 border border-white/10">
                      <span>{item.title}</span>
                      {item.badge && (
                        <span className="bg-[var(--theme-accent,#ac2c19)] text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ---------------------------------------------------- */
          /* VIEW 2: FULL EXPANDED HIERARCHICAL TREE VIEW          */
          /* ---------------------------------------------------- */
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-3 custom-scroll">
            {navGroups.map((group) => {
              const isGrpExpanded = expandedGroups[group.id];

              return (
                <div key={group.id} className="space-y-1">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2 py-1.5 text-[10.5px] font-bold tracking-wider text-[var(--theme-text-muted,#8d706b)] hover:text-[var(--theme-primary,#003b2b)] rounded-lg transition-colors group cursor-pointer outline-none focus:outline-none"
                  >
                    <span className="uppercase truncate text-left">{group.title}</span>
                    <span className={`material-symbols-outlined text-[18px] text-[var(--theme-text-muted,#8d706b)] group-hover:text-[var(--theme-primary,#003b2b)] transition-transform duration-200 shrink-0 ml-1 ${isGrpExpanded ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {/* Group Items */}
                  {isGrpExpanded && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const isSubExpanded = expandedSubmenus[item.id];
                        const currentFullPath = location.pathname + location.search;
                        const isParentActive = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
                        const isDeferred = isDeferredRoute(item.to);

                        return (
                          <div key={item.id} className="space-y-0.5">
                            {/* Main Item NavLink / Pill Container */}
                            <div className="w-full">
                              {isDeferred ? (
                                <div className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-[12px] font-medium text-[var(--theme-text-muted,#8d706b)] opacity-40 cursor-not-allowed pointer-events-none select-none bg-black/[0.02] dark:bg-white/[0.02]">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className="material-symbols-outlined text-[18px] shrink-0 text-[var(--theme-text-muted,#8d706b)]">
                                      {item.icon}
                                    </span>
                                    <span className="truncate leading-tight">{item.title}</span>
                                  </div>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-gray-500 bg-gray-200/80 dark:bg-gray-700/80 shrink-0 whitespace-nowrap leading-none ml-1">
                                    Sắp ra mắt
                                  </span>
                                </div>
                              ) : (
                                <div
                                  className={`flex items-center justify-between rounded-xl transition-all ${
                                    isParentActive
                                      ? 'bg-[var(--theme-primary,#003b2b)] text-white shadow-xs'
                                      : 'text-[var(--theme-text,#33443f)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] hover:text-[var(--theme-primary,#003b2b)]'
                                  }`}
                                >
                                  <NavLink
                                    to={item.to}
                                    end={item.end}
                                    onClick={closeMobile}
                                    className="flex-1 min-w-0 flex items-center justify-between px-2.5 py-2 text-[12px] font-semibold outline-none focus:outline-none"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <span className="material-symbols-outlined text-[18px] shrink-0">
                                        {item.icon}
                                      </span>
                                      <span className="truncate leading-tight">{item.title}</span>
                                    </div>

                                    {item.badge && (
                                      <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-white shrink-0 whitespace-nowrap leading-none mr-1 ${
                                          item.badgeColor || 'bg-[var(--theme-secondary,#006953)]'
                                        }`}
                                      >
                                        {item.badge}
                                      </span>
                                    )}
                                  </NavLink>

                                  {/* Integrated Dropdown toggle for items with submenus */}
                                  {item.hasSubmenu && (
                                    <button
                                      onClick={(e) => toggleSubmenu(item.id, e)}
                                      className={`p-1.5 mr-1 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center justify-center outline-none focus:outline-none ${
                                        isParentActive
                                          ? 'text-white/80 hover:text-white hover:bg-white/15'
                                          : 'text-[var(--theme-text-muted,#6b7280)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-black/5'
                                      }`}
                                      title={isSubExpanded ? "Thu gọn danh mục con" : "Mở rộng danh mục con"}
                                      aria-label="Toggle submenu"
                                    >
                                      <span
                                        className={`material-symbols-outlined text-base transition-transform duration-200 block ${
                                          isSubExpanded ? 'rotate-180' : ''
                                        }`}
                                      >
                                        keyboard_arrow_down
                                      </span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Submenu Items (Level 2 Tree) */}
                            {item.hasSubmenu && isSubExpanded && (
                              <div className="pl-2.5 pr-1 py-1 space-y-1 border-l-2 border-[var(--theme-border,#ded8cf)] ml-3.5 mt-1">
                                {item.subItems.map((sub, idx) => {
                                  const isSubDeferred = isDeferredRoute(sub.to);
                                  const isSubActive = currentFullPath === sub.to || (sub.to === '/books' && currentFullPath === '/books');

                                  if (isSubDeferred) {
                                    return (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg text-[11.5px] font-medium text-[var(--theme-text-muted,#8d706b)] opacity-40 cursor-not-allowed pointer-events-none select-none"
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <span className="material-symbols-outlined text-[16px] text-[var(--theme-text-muted,#8d706b)] shrink-0">
                                            {sub.icon}
                                          </span>
                                          <span className="truncate leading-tight">{sub.title}</span>
                                        </div>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold text-gray-500 bg-gray-200/80 dark:bg-gray-700/80 shrink-0 whitespace-nowrap leading-none">
                                          Mẫu
                                        </span>
                                      </div>
                                    );
                                  }

                                  return (
                                    <Link
                                      key={idx}
                                      to={sub.to}
                                      onClick={closeMobile}
                                      className={`flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg text-[11.5px] transition-all outline-none focus:outline-none group ${
                                        isSubActive
                                          ? 'bg-[var(--theme-secondary-subtle,#e6f4f0)] text-[var(--theme-primary,#003b2b)] font-bold shadow-xs'
                                          : 'font-medium text-[var(--theme-text-muted,#556963)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)]'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className={`material-symbols-outlined text-[16px] shrink-0 transition-colors ${
                                          isSubActive
                                            ? 'text-[var(--theme-secondary,#006953)]'
                                            : 'text-[var(--theme-text-muted,#8d706b)] group-hover:text-[var(--theme-primary,#003b2b)]'
                                        }`}>
                                          {sub.icon}
                                        </span>
                                        <span className="truncate leading-tight">{sub.title}</span>
                                      </div>
                                      {sub.badge && (
                                        <span
                                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 whitespace-nowrap leading-none ${
                                            sub.badgeColor || 'bg-[var(--theme-accent,#ac2c19)] text-white'
                                          }`}
                                        >
                                          {sub.badge}
                                        </span>
                                      )}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Bar: Expand / Collapse Toggle Handle */}
        <div className="p-2 border-t border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface-subtle,#fbfdfc)] shrink-0 hidden lg:block">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[var(--theme-text-muted,#556963)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#eaf4f1)] transition-all border border-transparent hover:border-[var(--theme-border,#cfe5dd)] cursor-pointer outline-none focus:outline-none"
            title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
            </span>
            {!isCollapsed && <span>Thu gọn thanh bên</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
