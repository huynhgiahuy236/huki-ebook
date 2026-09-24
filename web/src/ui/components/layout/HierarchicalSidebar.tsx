"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/ui/context/CartContext';
import { useAuth } from '@/ui/context/AuthContext';

interface NavItem {
  id: string;
  title: string;
  to: string;
  icon: string;
  badge?: string | number | null;
  badgeColor?: string;
}

interface NavGroup {
  id: string;
  title: string;
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

  // Clean, focused, single-level Navigation Schema
  const allNavGroups: NavGroup[] = [
    {
      id: 'shopping',
      title: 'MUA SẮM',
      items: [
        {
          id: 'home',
          title: 'Trang Chủ',
          to: '/',
          icon: 'home',
        },
        {
          id: 'flash-sale',
          title: 'Flash Sale',
          to: '/flash-sale',
          icon: 'bolt',
          badge: 'HOT',
          badgeColor: 'bg-rose-500 text-white',
        },
        {
          id: 'catalog',
          title: 'Khám Phá Sách',
          to: '/books',
          icon: 'menu_book',
        },
        {
          id: 'stores',
          title: 'NXB & Tác Giả',
          to: '/stores',
          icon: 'apartment',
        },
        {
          id: 'following',
          title: 'Đang Theo Dõi',
          to: '/following',
          icon: 'favorite_border',
        },
        {
          id: 'audiobooks',
          title: 'Sách Nói',
          to: '/audiobooks',
          icon: 'headphones',
        },
      ],
    },
    {
      id: 'reader',
      title: 'TỦ SÁCH',
      items: [
        {
          id: 'my-library',
          title: 'Tủ Sách Cá Nhân',
          to: '/library',
          icon: 'auto_stories',
        },
        {
          id: 'web-reader',
          title: 'Trình Đọc Ebook',
          to: '/reader',
          icon: 'chrome_reader_mode',
        },
      ],
    },
    {
      id: 'personal',
      title: 'TIỆN ÍCH',
      items: [
        {
          id: 'messages',
          title: 'Tin Nhắn',
          to: '/account/messages',
          icon: 'chat',
        },
        {
          id: 'cart',
          title: 'Giỏ Hàng',
          to: '/cart',
          icon: 'shopping_cart',
          badge: totalItemsCount > 0 ? totalItemsCount : null,
          badgeColor: 'bg-[#ac2c19] text-white',
        },
        {
          id: 'orders',
          title: 'Đơn Hàng',
          to: '/account/orders',
          icon: 'receipt_long',
        },
      ],
    },
    {
      id: 'business',
      title: 'DOANH NGHIỆP',
      items: [
        {
          id: 'seller-portal',
          title: 'Kênh Người Bán',
          to: '/seller/dashboard',
          icon: 'storefront',
        },
      ],
    },
  ];

  // Dynamic filter for authorized roles
  const navGroups = allNavGroups.filter((g) => {
    if (g.id === 'admin') {
      return isLoggedIn && hasRole('PLATFORM_ADMIN');
    }
    if (g.id === 'business') {
      return (
        isLoggedIn &&
        (hasRole(['BUSINESS', 'PLATFORM_ADMIN']) ||
          Boolean((user as any)?.businessId || (user as any)?.business || (user as any)?.businessMemberships?.length))
      );
    }
    return true;
  });

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

      {/* Main Clean Sidebar Shell */}
      <aside
        className={`
          fixed top-[80px] bottom-0 left-0 z-30
          bg-[var(--theme-header-top,#003b2b)] border-r-2 border-white/25
          flex flex-col text-white
          transition-all duration-300 ease-in-out shadow-md
          ${isCollapsed ? 'w-[60px]' : 'w-[220px]'}
          ${isMobileOpen ? 'translate-x-0 !w-[220px] z-50' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-1.5 space-y-3 select-none scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {/* Group Header */}
              {!isCollapsed && (
                <div className="px-2.5 py-0.5 text-[9.5px] font-extrabold text-white/50 uppercase tracking-wider">
                  {group.title}
                </div>
              )}

              {/* Navigation Items */}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    item.to === '/' ? pathname === '/' : pathname.startsWith(item.to);

                  return (
                    <div key={item.id} className="relative group">
                      {isCollapsed ? (
                        /* Collapsed Icon-Only View - Centered perfectly in w-[60px] with zero jitter */
                        <div className="flex items-center justify-center py-0.5">
                          <Link
                            href={item.to}
                            onClick={closeMobile}
                            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-150 relative shrink-0 ${
                              isActive
                                ? 'bg-white text-[var(--theme-primary,#003b2b)] shadow-sm font-bold border border-white/40'
                                : 'text-white/80 hover:bg-white/15 hover:text-white border border-transparent'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[19px] shrink-0">{item.icon}</span>
                            {item.badge && (
                              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-400" />
                            )}
                          </Link>

                          {/* Floating Tooltip */}
                          <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-xl whitespace-nowrap z-50">
                            {item.title}
                          </div>
                        </div>
                      ) : (
                        /* Expanded Clean Item View with fixed h-9 and zero jitter */
                        <Link
                          href={item.to}
                          onClick={closeMobile}
                          className={`flex items-center justify-between gap-2 px-2.5 h-9 rounded-xl text-[12.5px] transition-colors duration-150 shrink-0 ${
                            isActive
                              ? 'bg-white text-[var(--theme-primary,#003b2b)] font-bold shadow-sm border border-white/40'
                              : 'text-white/85 font-medium hover:bg-white/15 hover:text-white border border-transparent'
                          }`}
                          title={item.title}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`material-symbols-outlined text-[18px] shrink-0 transition-colors ${
                                isActive
                                  ? 'text-[var(--theme-primary,#003b2b)] font-bold'
                                  : 'text-white/75 group-hover:text-white'
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span className="truncate leading-none min-w-0">{item.title}</span>
                          </div>

                          {item.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 whitespace-nowrap leading-none ${
                                isActive
                                  ? 'bg-[var(--theme-accent,#ac2c19)] text-white'
                                  : 'bg-white/20 text-white'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Expand / Collapse Handle */}
        <div className="p-1 border-t border-white/15 bg-black/10 shrink-0 hidden lg:block">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex items-center justify-center gap-1 h-8 rounded-lg text-[11px] font-semibold text-white/70 hover:text-white hover:bg-white/15 transition-colors duration-150 cursor-pointer"
            title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
          >
            <span className="material-symbols-outlined text-[15px] shrink-0">
              {isCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}
            </span>
            {!isCollapsed && <span className="truncate">Thu gọn thanh bên</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
