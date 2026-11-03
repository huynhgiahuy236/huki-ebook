"use client";

import React, { useEffect, useState } from 'react';
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
  targetBlank?: boolean;
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

  const isAdmin = Boolean(
    user?.role === 'PLATFORM_ADMIN' ||
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    (user as any)?.role === 'ADMIN_CON' ||
    hasRole('PLATFORM_ADMIN') ||
    hasRole('admin')
  );

  const isSeller = !isAdmin && Boolean(
    user?.role === 'BUSINESS' ||
    user?.hasApprovedBusiness ||
    user?.business ||
    (Array.isArray(user?.memberships) && user.memberships.length > 0)
  );

  const [isSetupCompleted, setIsSetupCompleted] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.business?.id) {
      const completed = localStorage.getItem(`huki_store_setup_completed_${user.business.id}`) === 'true';
      const hasBank = Boolean(user?.business?.bankAccountNumber && user?.business?.bankName);
      setIsSetupCompleted(completed || hasBank);
    }
  }, [user]);

  const sellerTargetUrl = user?.business?.status === 'PENDING_APPROVAL'
    ? '/seller/pending'
    : !isSetupCompleted
    ? '/seller/stores/setup'
    : '/seller/dashboard';

  const sellerTargetTitle = user?.business?.status === 'PENDING_APPROVAL'
    ? 'Hồ Sơ Chờ Duyệt'
    : !isSetupCompleted
    ? 'Cài Đặt Ngân Hàng'
    : 'Kênh Người Bán';

  // Close mobile drawer automatically on route change
  useEffect(() => {
    if (isMobileOpen && setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [pathname]);

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
          to: '/library',
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
          title: isSeller ? 'Chat Kênh Bán' : 'Tin Nhắn & Chat',
          to: isSeller ? '/seller/chat' : '/account/messages',
          icon: 'chat',
          targetBlank: true,
        },
        {
          id: 'cart',
          title: 'Giỏ Hàng',
          to: '/cart',
          icon: 'shopping_cart',
          badge: totalItemsCount > 0 ? totalItemsCount : null,
          badgeColor: 'bg-[#003b2b] text-white',
        },
        {
          id: 'orders',
          title: 'Đơn Hàng',
          to: '/orders',
          icon: 'receipt_long',
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            id: 'admin',
            title: 'HỆ THỐNG QUẢN TRỊ',
            items: [
              {
                id: 'admin-portal',
                title: 'Bảng Điều Hành Admin',
                to: '/admin',
                icon: 'admin_panel_settings',
                badge: 'ADMIN',
                badgeColor: 'bg-amber-400 text-zinc-950 font-black',
              },
            ],
          },
        ]
      : isSeller
      ? [
          {
            id: 'business',
            title: 'DOANH NGHIỆP',
            items: [
              {
                id: 'seller-portal',
                title: sellerTargetTitle,
                to: sellerTargetUrl,
                icon: !isSetupCompleted ? 'account_balance' : 'storefront',
              },
            ],
          },
        ]
      : []),
  ];

  // Dynamic filter for authorized roles
  const navGroups = allNavGroups.filter((g) => {
    if (g.id === 'admin') {
      return isLoggedIn && isAdmin;
    }
    if (g.id === 'business') {
      return isLoggedIn && isSeller;
    }
    return true;
  });

  const closeMobile = () => {
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  // Crucial: On mobile drawer, ALWAYS show expanded items (with icons AND text)!
  // Only collapse when on desktop and isCollapsed is true.
  const showCollapsed = isCollapsed && !isMobileOpen;

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={closeMobile}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Main Clean Sidebar Shell */}
      <aside
        className={`
          fixed bottom-0 left-0
          bg-[var(--theme-header-top,#003b2b)] border-r border-white/15
          flex flex-col text-white
          transition-all duration-300 ease-in-out shadow-2xl
          ${
            isMobileOpen
              ? 'top-0 z-50 w-[270px] sm:w-[280px] translate-x-0'
              : '-translate-x-full lg:translate-x-0 lg:top-[78px] lg:z-30 ' +
                (isCollapsed ? 'lg:w-[60px]' : 'lg:w-[220px]')
          }
        `}
      >
        {/* Mobile-Only Drawer Header with Brand & Close Button */}
        {isMobileOpen && (
          <div className="lg:hidden p-3.5 border-b border-white/15 flex items-center justify-between bg-black/20 shrink-0">
            <div className="flex flex-col select-none">
              <span className="font-editorial text-base font-black tracking-tight text-white leading-none">
                HUKI EBOOK
              </span>
              <span className="text-[7.5px] uppercase tracking-widest text-[#94f5d6] font-bold mt-0.5">
                Sách Số &amp; Sách In
              </span>
            </div>
            <button
              type="button"
              onClick={closeMobile}
              className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
              title="Đóng menu"
              aria-label="Đóng menu điều hướng"
            >
              <span className="material-symbols-outlined text-[19px]">close</span>
            </button>
          </div>
        )}

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-3 select-none scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-1">
              {/* Group Header - Always show when not collapsed (including on mobile!) */}
              {!showCollapsed && (
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
                      {showCollapsed ? (
                        /* Collapsed Icon-Only View (Desktop only) */
                        <div className="flex items-center justify-center py-0.5">
                          <Link
                            href={item.to}
                            target={item.targetBlank || item.id === 'web-reader' ? '_blank' : undefined}
                            rel={item.targetBlank || item.id === 'web-reader' ? 'noopener noreferrer' : undefined}
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
                        /* Expanded Clean Item View (Both on expanded desktop AND full mobile drawer!) */
                        <Link
                          href={item.to}
                          target={item.targetBlank || item.id === 'web-reader' ? '_blank' : undefined}
                          rel={item.targetBlank || item.id === 'web-reader' ? 'noopener noreferrer' : undefined}
                          onClick={closeMobile}
                          className={`flex items-center justify-between gap-2 px-2.5 h-9 rounded-xl text-[12.5px] transition-colors duration-150 shrink-0 ${
                            isActive
                              ? 'bg-white text-[var(--theme-primary,#003b2b)] font-bold shadow-sm border border-white/40'
                              : 'text-white/85 font-medium hover:bg-white/15 hover:text-white border border-transparent'
                          }`}
                          title={item.title}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
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
                                  ? 'bg-[#006953] text-white'
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

        {/* Mobile-Only Drawer Bottom User Card */}
        {isMobileOpen && (
          <div className="lg:hidden p-3 border-t border-white/15 bg-black/20 shrink-0">
            {isLoggedIn ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-white/20 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {user?.fullName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{user?.fullName || user?.email}</p>
                    <p className="text-[10px] text-emerald-200/80 truncate">{user?.role || 'Hội viên'}</p>
                  </div>
                </div>
                <Link
                  href="/profile"
                  onClick={closeMobile}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
                  title="Tài khoản cá nhân"
                >
                  <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  onClick={closeMobile}
                  className="flex-1 py-1.5 text-center text-xs font-bold rounded-lg bg-white text-[#003b2b] hover:bg-emerald-50 transition-colors shadow-xs"
                >
                  Đăng Nhập
                </Link>
                <Link
                  href="/auth/register"
                  onClick={closeMobile}
                  className="flex-1 py-1.5 text-center text-xs font-bold rounded-lg border border-white/30 text-white hover:bg-white/10 transition-colors"
                >
                  Đăng Ký
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Bottom Expand / Collapse Handle (Desktop only) */}
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
