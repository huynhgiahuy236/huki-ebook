import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';

export interface SellerHeaderProps {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
}

export default function SellerHeader({ isSidebarCollapsed, toggleSidebar, toggleMobileSidebar }: SellerHeaderProps) {
  const { user } = useAuth();
  const sellerName = user?.business?.name || user?.fullName || user?.name || "NXB Doanh Nghiệp";

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] pl-0 pr-3.5 sm:pr-5 lg:pr-6 flex items-center justify-between shadow-2xs min-h-[54px] h-[54px] gap-2 sm:gap-3">
      {/* Left: Sidebar Toggle & Brand Identity */}
      <div className="flex items-center min-w-0">
        {/* Hamburger / Sidebar Toggle Container - exactly w-[60px] to align with collapsed sidebar */}
        <div className="w-[60px] flex items-center justify-center shrink-0">
          {/* Desktop Sidebar Collapse Toggle Button */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden lg:flex w-9 h-9 items-center justify-center rounded-xl text-gray-500 hover:text-[#003B2B] hover:bg-gray-100 transition-all cursor-pointer border border-[#E2E8F0] hover:border-[#003B2B]/30 shadow-2xs active:scale-95"
            title={isSidebarCollapsed ? 'Mở rộng thanh menu (Sidebar)' : 'Thu gọn thanh menu (Sidebar)'}
            aria-label="Toggle Sidebar"
          >
            <span className="material-symbols-outlined text-[20px] text-[#003B2B] transition-transform duration-300">
              {isSidebarCollapsed ? 'menu' : 'menu_open'}
            </span>
          </button>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={toggleMobileSidebar}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 border border-[#E2E8F0] cursor-pointer active:scale-95"
            title="Mở menu"
            aria-label="Open Mobile Menu"
          >
            <span className="material-symbols-outlined text-[20px] text-[#003B2B]">menu</span>
          </button>
        </div>

        {/* Brand - Chuẩn nhận diện Home & Admin (Không icon thừa) */}
        <Link href="/seller/dashboard" className="flex flex-col group select-none pl-1 pr-3 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="font-editorial text-base sm:text-lg font-black tracking-tight text-[#003B2B] leading-none">
              HUKI EBOOK
            </span>
            <span className="bg-[#003B2B] text-white text-[7.5px] sm:text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
              SELLER
            </span>
          </div>
          <span className="text-[7.5px] sm:text-[8px] uppercase tracking-widest text-[#006953] font-bold mt-0.5">
            Kênh NXB &amp; Tác Giả
          </span>
        </Link>

        {/* Shop Badge (Auto-truncated) */}
        <div className="hidden lg:flex items-center gap-1.5 bg-theme-secondary-subtle/60 px-2.5 py-1 rounded-full border border-theme-border max-w-[200px] xl:max-w-[260px] 2xl:max-w-[320px] min-w-0 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true"></span>
          <span className="text-xs font-bold text-on-surface truncate" title={sellerName}>{sellerName}</span>
          <span className="text-[9px] bg-theme-primary/10 text-theme-primary px-1.5 py-0.2 rounded-full font-bold shrink-0 whitespace-nowrap">Đối tác</span>
        </div>
      </div>

      {/* Center Search */}
      <div className="hidden md:flex items-center bg-surface-container-low/80 border border-theme-border rounded-full px-3 py-1 w-40 lg:w-52 xl:w-64 text-xs text-on-surface-variant focus-within:border-theme-primary focus-within:ring-2 focus-within:ring-theme-primary/10 transition-all shrink-0">
        <span className="material-symbols-outlined text-[15px] mr-1.5 text-on-surface-variant shrink-0">search</span>
        <input
          type="text"
          placeholder="Tìm mã đơn, SKU, tựa sách..."
          className="bg-transparent border-none outline-none w-full text-xs text-on-surface placeholder:text-on-surface-variant/70 min-w-0"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Messenger / Chat Hộp Thư Khách Hàng (Deferred) */}
        <div
          className="relative flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl border border-theme-border opacity-40 cursor-not-allowed pointer-events-none select-none text-on-surface-variant bg-black/[0.02] dark:bg-white/[0.02] shrink-0"
          title="Hộp thư & Tin nhắn khách hàng (Sắp ra mắt)"
          aria-label="Tin nhắn (Sắp ra mắt)"
        >
          <span className="material-symbols-outlined text-[17px] text-on-surface-variant">chat</span>
          <span className="hidden 2xl:inline text-[11px] font-semibold text-on-surface-variant whitespace-nowrap">Tin nhắn</span>
        </div>

        <Link
          href="/seller/product/create-hybrid"
          className="flex items-center gap-1.5 bg-theme-primary text-white px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm shrink-0 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[15px]">add_circle</span>
          <span className="hidden sm:inline">Thêm Sản Phẩm</span>
          <span className="sm:hidden">Thêm</span>
        </Link>

        <div className="h-4 w-px bg-theme-border shrink-0"></div>

        <Link
          href="/"
          className="flex items-center gap-1 text-xs font-semibold text-theme-primary hover:bg-theme-secondary-subtle px-2 sm:px-2.5 py-1.5 rounded-xl border border-theme-border transition-colors shrink-0 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[15px]">open_in_new</span>
          <span className="hidden sm:inline">Về Sàn</span>
        </Link>
      </div>
    </header>
  );
}
