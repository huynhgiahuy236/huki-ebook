"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ShipperProvider, useShipper } from '@/ui/context/ShipperContext';
import { useAuth } from '@/ui/context/AuthContext';

export interface ShipperMenuItem {
  label: string;
  to: string;
  icon: string;
  count?: string;
  badgeColor?: string;
}

export interface ShipperMenuSection {
  group: string;
  items: ShipperMenuItem[];
}

function ShipperLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isOnline, setIsOnline, profile, availableOrders, activeDeliveries, wallet, resetDemoData } = useShipper();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const routeMap: Record<string, { parent: string; title: string }> = {
    '/shipper': { parent: 'Điều Hành Giao Hàng', title: 'Bảng Điều Khiển Bưu Tá' },
    '/shipper/available-orders': { parent: 'Sàn Điều Phối', title: 'Sàn Đơn Hàng Chờ Nhận' },
    '/shipper/active-deliveries': { parent: 'Hành Trình Giao', title: 'Đơn Hàng Đang Thực Hiện' },
    '/shipper/history': { parent: 'Dữ Liệu Vận Hành', title: 'Lịch Sử Giao Hàng & Báo Cáo' },
    '/shipper/wallet': { parent: 'Tài Chính & Kế Toán', title: 'Ví Thu Nhập & Đối Soát COD' },
    '/shipper/profile': { parent: 'Thiết Lập Tài Xế', title: 'Hồ Sơ & Phương Tiện Giao Sách' },
  };

  const currentRouteInfo = routeMap[pathname] || { parent: 'Bưu Tá HuKi Express', title: 'Hệ Thống Vận Hành' };

  const menuSections: ShipperMenuSection[] = [
    {
      group: 'TỔNG QUAN HỆ THỐNG',
      items: [
        { label: 'Bảng Điều Hành', to: '/shipper', icon: 'dashboard' },
      ],
    },
    {
      group: 'VẬN HÀNH GIAO HÀNG',
      items: [
        {
          label: 'Sàn Đơn Chờ Nhận',
          to: '/shipper/available-orders',
          icon: 'electric_moped',
          count: availableOrders.length > 0 ? String(availableOrders.length) : undefined,
        },
        {
          label: 'Đơn Đang Giao',
          to: '/shipper/active-deliveries',
          icon: 'route',
          count: activeDeliveries.length > 0 ? String(activeDeliveries.length) : undefined,
        },
        {
          label: 'Lịch Sử Giao Hàng',
          to: '/shipper/history',
          icon: 'history',
        },
      ],
    },
    {
      group: 'TÀI CHÍNH & VẬN HÀNH',
      items: [
        {
          label: 'Ví Tiền & Nợ COD',
          to: '/shipper/wallet',
          icon: 'account_balance_wallet',
          count: wallet.codDebt > 0 ? `${(wallet.codDebt / 1000).toFixed(0)}k` : undefined,
        },
      ],
    },
    {
      group: 'THIẾT LẬP TÀI XẾ',
      items: [
        {
          label: 'Hồ Sơ & Xe Giao',
          to: '/shipper/profile',
          icon: 'badge',
        },
      ],
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shipper/available-orders?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/auth/login');
  };

  return (
    <div className="admin-portal h-screen w-full bg-white text-[#1E293B] flex flex-col font-sans antialiased overflow-hidden selection:bg-[#00875A] selection:text-white">
      {/* 1. TOP APP BAR / HEADER */}
      <header className="h-[54px] min-h-[54px] border-b border-[#E2E8F0] pl-0 pr-3.5 sm:pr-5 lg:pr-6 flex items-center justify-between gap-3 shrink-0 bg-white z-30">
        {/* Left: Sidebar Toggle & Brand Identity */}
        <div className="flex items-center">
          {/* Hamburger / Sidebar Toggle Container */}
          <div className="w-[60px] flex items-center justify-center shrink-0">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl text-gray-500 hover:text-[#003B2B] hover:bg-gray-100 transition-all cursor-pointer border border-[#E2E8F0] hover:border-[#003B2B]/30 shadow-2xs active:scale-95"
              title={isSidebarCollapsed ? 'Mở rộng thanh menu' : 'Thu gọn thanh menu'}
            >
              <span className="material-symbols-outlined text-[20px] text-[#003B2B] transition-transform duration-300">
                {isSidebarCollapsed ? 'menu' : 'menu_open'}
              </span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 border border-[#E2E8F0] cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[20px] text-[#003B2B]">menu</span>
            </button>
          </div>

          {/* Brand Identity */}
          <Link href="/shipper" className="flex flex-col group select-none pl-1 pr-3">
            <div className="flex items-center gap-1.5">
              <span className="font-editorial text-base sm:text-lg font-black tracking-tight text-[#003B2B] leading-none">
                HUKI EBOOK
              </span>
              <span className="bg-[#003B2B] text-white text-[7.5px] sm:text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                EXPRESS
              </span>
            </div>
            <span className="text-[7.5px] sm:text-[8px] uppercase tracking-widest text-[#00875A] font-bold mt-0.5">
              Cổng Bưu Tá Giao Sách
            </span>
          </Link>

          {/* Global Search Bar */}
          <form onSubmit={handleSearch} className="relative hidden md:block w-56 lg:w-72 ml-1">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">
              search
            </span>
            <input
              type="text"
              placeholder="Tìm mã đơn, địa chỉ giao..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-gray-800 placeholder:text-gray-400 focus:outline-hidden focus:border-[#003B2B] focus:bg-white transition-all shadow-2xs"
            />
          </form>
        </div>

        {/* Right: Duty Switch, Wallet Pill, Profile & Avatar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Duty Status Button */}
          <button
            type="button"
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-semibold transition-colors shadow-2xs cursor-pointer ${
              isOnline
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="hidden sm:inline text-gray-500">Trạng thái:</span>
            <span className={isOnline ? 'text-emerald-700 font-bold' : 'text-gray-600 font-bold'}>
              {isOnline ? 'Trực tuyến' : 'Tạm nghỉ'}
            </span>
          </button>

          {/* Wallet Quick Pill */}
          <Link
            href="/shipper/wallet"
            className="hidden sm:flex items-center gap-2 bg-[#F8FAFC] hover:bg-gray-100 px-2.5 py-1 rounded-xl border border-[#E2E8F0] text-xs transition-colors shadow-2xs"
          >
            <span className="text-gray-500">Ví:</span>
            <strong className="text-[#00875A] font-bold">{wallet.availableEarnings.toLocaleString('vi-VN')}đ</strong>
            {wallet.codDebt > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-rose-600 font-bold">Nợ COD: {wallet.codDebt.toLocaleString('vi-VN')}đ</span>
              </>
            )}
          </Link>

          {/* Profile & Avatar */}
          <div className="flex items-center gap-2 pl-2 sm:pl-2.5 border-l border-[#E2E8F0]">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#003B2B] to-[#00875A] text-white flex items-center justify-center font-bold text-xs border border-[#E2E8F0] shadow-2xs">
              {profile.name ? profile.name.charAt(0) : 'H'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[120px]">
                {profile.name}
              </span>
              <span className="text-[9px] text-emerald-700 font-semibold leading-tight">
                ⭐ {profile.rating} • {profile.licensePlate}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <span className="material-symbols-outlined text-[17px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. BODY CONTAINER: SIDEBAR + MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP SIDEBAR (#003B2B exact Admin theme) */}
        <aside
          className={`
            hidden lg:flex flex-col
            bg-[#003B2B] text-white border-r border-[#00281D]
            shrink-0 transition-all duration-300 select-none shadow-md
            ${isSidebarCollapsed ? 'w-[60px]' : 'w-[235px]'}
          `}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-1.5 flex flex-col gap-3.5 select-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {menuSections.map((sec, sIdx) => (
              <div key={sIdx} className="flex flex-col gap-1">
                {!isSidebarCollapsed && (
                  <div className="px-2.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-widest text-white/50">
                    {sec.group}
                  </div>
                )}
                {sec.items.map((item, iIdx) => {
                  const isActive = pathname === item.to || (item.to !== '/shipper' && pathname.startsWith(item.to));

                  return (
                    <div key={iIdx} className="relative group">
                      {isSidebarCollapsed ? (
                        /* Collapsed Icon-Only View */
                        <div className="flex items-center justify-center py-0.5">
                          <Link
                            href={item.to}
                            className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150 relative shrink-0 ${
                              isActive
                                ? 'bg-white text-[#003B2B] shadow-sm font-bold border border-white/40'
                                : 'text-white/80 hover:bg-white/15 hover:text-white border border-transparent'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[19px] shrink-0">{item.icon}</span>
                            {item.count && (
                              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-400 ring-2 ring-[#003B2B] animate-pulse" />
                            )}
                          </Link>

                          {/* Floating Tooltip khi hover */}
                          <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-150 absolute left-full ml-2.5 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-xl whitespace-nowrap z-50 flex items-center gap-1.5">
                            <span>{item.label}</span>
                            {item.count && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white text-[9px] font-black">
                                {item.count}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Expanded Clean Item View */
                        <Link
                          href={item.to}
                          className={`flex items-center justify-between gap-2 px-2.5 h-9 rounded-xl text-[12.5px] transition-all duration-150 shrink-0 ${
                            isActive
                              ? 'bg-white text-[#003B2B] font-bold shadow-sm border border-white/40'
                              : 'text-white/85 font-medium hover:bg-white/15 hover:text-white border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span
                              className={`material-symbols-outlined text-[18px] shrink-0 ${
                                isActive ? 'text-[#003B2B] font-bold' : 'text-white/75 group-hover:text-white'
                              }`}
                            >
                              {item.icon}
                            </span>
                            <span className="truncate leading-none min-w-0">{item.label}</span>
                          </div>
                          {item.count && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded-full font-black whitespace-nowrap shrink-0 ${
                                isActive
                                  ? 'bg-[#003B2B]/15 text-[#003B2B]'
                                  : 'bg-rose-500 text-white animate-pulse'
                              }`}
                            >
                              {item.count}
                            </span>
                          )}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Sidebar Action: Reset Demo */}
          <div className="p-2 border-t border-[#00281D] bg-[#00281D]/50">
            {!isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  alert('Đã khôi phục dữ liệu mẫu bưu tá thành công!');
                }}
                className="w-full py-1.5 px-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[14px]">restart_alt</span>
                <span>Khôi Phục Dữ Liệu</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetDemoData();
                  alert('Đã khôi phục dữ liệu mẫu bưu tá thành công!');
                }}
                className="w-full flex items-center justify-center p-1 text-white/70 hover:text-white cursor-pointer"
                title="Khôi Phục Dữ Liệu"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              </button>
            )}
          </div>
        </aside>

        {/* 3. MAIN CANVAS */}
        <main className="flex-1 flex flex-col overflow-y-auto bg-[#F8FAFC]">
          {/* Breadcrumbs Header */}
          <div className="bg-white border-b border-[#E2E8F0] px-4 sm:px-6 py-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                  <span>HUKI EBOOK EXPRESS</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span>{currentRouteInfo.parent}</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="text-[#00875A] font-semibold">{currentRouteInfo.title}</span>
                </div>
                <h1 className="text-lg sm:text-xl font-black text-[#003B2B] tracking-tight mt-0.5">
                  {currentRouteInfo.title}
                </h1>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Link
                  href="/shipper/available-orders"
                  className="px-3 py-1.5 bg-[#00875A] hover:bg-[#003B2B] text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">electric_moped</span>
                  <span>Sàn Nhận Đơn ({availableOrders.length})</span>
                </Link>
                <Link
                  href="/shipper/wallet"
                  className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-[#CBD5E1] text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px] text-amber-600">account_balance_wallet</span>
                  <span>Ví Tiền</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Children View Content */}
          <div className="flex-1 p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ShipperLayout({ children }: { children: React.ReactNode }) {
  return (
    <ShipperProvider>
      <ShipperLayoutContent>{children}</ShipperLayoutContent>
    </ShipperProvider>
  );
}
