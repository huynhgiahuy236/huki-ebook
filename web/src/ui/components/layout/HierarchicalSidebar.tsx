"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/ui/context/CartContext';
import { useAuth } from '@/ui/context/AuthContext';

interface SubNavItem {
  title: string;
  to: string;
  icon: string;
  badge?: string;
  badgeColor?: string;
}

interface NavItem {
  id: string;
  title: string;
  to: string;
  icon: string;
  badge?: string | null;
  badgeColor?: string;
  hasSubmenu?: boolean;
  subItems?: SubNavItem[];
}

interface NavGroup {
  id: string;
  title: string;
  icon: string;
  items: NavItem[];
}

interface HierarchicalSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export default function HierarchicalSidebar({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}: HierarchicalSidebarProps) {
  const pathname = usePathname() || '';
  const { totalItemsCount } = useCart();
  const { user, isLoggedIn, hasRole } = useAuth();

  // Navigation Schema with nested levels
  const allNavGroups: NavGroup[] = [
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
        },
        {
          id: 'store-flash-sale',
          title: 'Flash Sale Giờ Vàng',
          to: '/flash-sale',
          icon: 'bolt',
          badge: 'HOT',
          badgeColor: 'bg-rose-500 text-white animate-pulse',
        },
        {
          id: 'store-shop',
          title: 'Gian Hàng Mall (Alpha Books)',
          to: '/shop/alpha-books',
          icon: 'verified',
          badge: 'Official',
          badgeColor: 'bg-theme-accent text-white',
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
            { title: 'Sách Bán Chạy (Bestsellers)', to: '/books?filter=bestseller', icon: 'local_fire_department' },
          ],
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
            { title: 'Tác Giả & Dịch Giả', to: '/stores?tab=authors', icon: 'star' },
          ],
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
          to: '/messages',
          icon: 'chat',
          badge: 'Live',
          badgeColor: 'bg-emerald-600 text-white',
        },
        {
          id: 'store-cart',
          title: 'Giỏ Hàng Của Bạn',
          to: '/cart',
          icon: 'shopping_cart',
          badge: totalItemsCount > 0 ? `${totalItemsCount}` : null,
          badgeColor: 'bg-theme-accent text-white',
        },
        {
          id: 'store-checkout',
          title: 'Thanh Toán & Đơn Hàng',
          to: '/checkout',
          icon: 'receipt_long',
        },
      ],
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
            { title: 'Thử Thách Đọc 2026', to: '/community/challenge', icon: 'military_tech', badge: 'Top 10' },
          ],
        },
        {
          id: 'comm-club-detail',
          title: 'CLB Tư Duy Tinh Gọn',
          to: '/community/clubs/lean-growth',
          icon: 'diversity_3',
        },
        {
          id: 'comm-author',
          title: 'Tác Giả James Clear',
          to: '/author/james-clear',
          icon: 'star',
        },
      ],
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
            { title: 'Ghi Chú & Trích Dẫn', to: '/library?tab=notes', icon: 'bookmark' },
          ],
        },
        {
          id: 'lib-reader',
          title: 'Trình Đọc Ebook Web',
          to: '/reader',
          icon: 'chrome_reader_mode',
        },
      ],
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
          icon: 'dashboard',
        },
        {
          id: 'seller-reg',
          title: 'Đăng Ký Trở Thành NXB',
          to: '/seller/register',
          icon: 'app_registration',
        },
      ],
    },
  ];

  // Dynamic filter for authorized roles
  const navGroups = allNavGroups.filter((g) => {
    if (g.id === 'admin') {
      return isLoggedIn && hasRole('PLATFORM_ADMIN');
    }
    return true;
  });

  // Track expanded groups and submenus
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    store: true,
    community: true,
    library: true,
    seller: false,
    admin: false,
  });

  const [expandedSubmenus, setExpandedSubmenus] = useState<Record<string, boolean>>({
    'store-catalog': true,
  });

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const toggleSubmenu = (itemId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedSubmenus((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const closeMobile = () => {
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Shell */}
      <aside
        className={`
          fixed top-[84px] bottom-0 left-0 z-30
          bg-[var(--theme-surface,#ffffff)] border-r border-[var(--theme-border,#e8e5df)]
          flex flex-col
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-[68px]' : 'w-[280px]'}
          ${isMobileOpen ? 'translate-x-0 !w-[280px] z-50' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-4 select-none scrollbar-thin">
          {navGroups.map((group) => {
            const isGroupExpanded = expandedGroups[group.id] !== false;

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Header (Only when not collapsed) */}
                {!isCollapsed && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold text-[var(--theme-text-muted,#6b7280)] hover:text-[var(--theme-primary,#003b2b)] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    <span className="truncate">{group.title}</span>
                    <span
                      className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${
                        isGroupExpanded ? 'rotate-180' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>
                )}

                {/* Items in Group */}
                {(isCollapsed || isGroupExpanded) && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive =
                        item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);
                      const isSubExpanded = expandedSubmenus[item.id] !== false;

                      return (
                        <div key={item.id} className="relative">
                          {isCollapsed ? (
                            /* Collapsed Icon-Only View */
                            <Link
                              href={item.to}
                              onClick={closeMobile}
                              className={`flex items-center justify-center w-11 h-11 mx-auto rounded-xl transition-all relative ${
                                isActive
                                  ? 'bg-[var(--theme-primary,#003b2b)] text-white shadow-xs'
                                  : 'text-[var(--theme-text,#17201f)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] hover:text-[var(--theme-primary,#003b2b)]'
                              }`}
                              title={item.title}
                            >
                              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                              {item.badge && (
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                              )}
                            </Link>
                          ) : (
                            /* Expanded Full Item View */
                            <div>
                              <div className="flex items-center justify-between group">
                                <Link
                                  href={item.to}
                                  onClick={closeMobile}
                                  className={`flex-1 flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                    isActive
                                      ? 'bg-[var(--theme-primary,#003b2b)] text-white shadow-xs'
                                      : 'text-[var(--theme-text,#17201f)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)] hover:text-[var(--theme-primary,#003b2b)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span
                                      className={`material-symbols-outlined text-[18px] shrink-0 ${
                                        isActive
                                          ? 'text-white'
                                          : 'text-[var(--theme-text-muted,#6b7280)] group-hover:text-[var(--theme-primary,#003b2b)]'
                                      }`}
                                    >
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
                                </Link>

                                {item.hasSubmenu && (
                                  <button
                                    onClick={(e) => toggleSubmenu(item.id, e)}
                                    className={`p-1.5 mr-1 rounded-lg transition-colors shrink-0 cursor-pointer flex items-center justify-center ${
                                      isActive
                                        ? 'text-white/80 hover:text-white hover:bg-white/15'
                                        : 'text-[var(--theme-text-muted,#6b7280)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-black/5'
                                    }`}
                                    title={isSubExpanded ? 'Thu gọn danh mục con' : 'Mở rộng danh mục con'}
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

                              {/* Submenu Level 2 */}
                              {item.hasSubmenu && isSubExpanded && item.subItems && (
                                <div className="pl-3 pr-1 py-1 space-y-1 border-l-2 border-[var(--theme-border,#ded8cf)] ml-4 mt-1">
                                  {item.subItems.map((sub, idx) => {
                                    const isSubActive = pathname === sub.to;
                                    return (
                                      <Link
                                        key={idx}
                                        href={sub.to}
                                        onClick={closeMobile}
                                        className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] transition-all group ${
                                          isSubActive
                                            ? 'bg-[var(--theme-secondary-subtle,#e6f4f0)] text-[var(--theme-primary,#003b2b)] font-bold shadow-xs'
                                            : 'font-medium text-[var(--theme-text-muted,#556963)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#f2fbf9)]'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <span
                                            className={`material-symbols-outlined text-[16px] shrink-0 transition-colors ${
                                              isSubActive
                                                ? 'text-[var(--theme-secondary,#006953)]'
                                                : 'text-[var(--theme-text-muted,#8d706b)] group-hover:text-[var(--theme-primary,#003b2b)]'
                                            }`}
                                          >
                                            {sub.icon}
                                          </span>
                                          <span className="truncate leading-tight">{sub.title}</span>
                                        </div>
                                        {sub.badge && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 whitespace-nowrap leading-none bg-[var(--theme-accent,#ac2c19)] text-white">
                                            {sub.badge}
                                          </span>
                                        )}
                                      </Link>
                                    );
                                  })}
                                </div>
                              )}
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

        {/* Bottom Expand / Collapse Handle */}
        <div className="p-2 border-t border-[var(--theme-border,#e8e5df)] bg-[var(--theme-surface-subtle,#fbfdfc)] shrink-0 hidden lg:block">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold text-[var(--theme-text-muted,#556963)] hover:text-[var(--theme-primary,#003b2b)] hover:bg-[var(--theme-secondary-subtle,#eaf4f1)] transition-all border border-transparent hover:border-[var(--theme-border,#cfe5dd)] cursor-pointer"
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
