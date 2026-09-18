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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-theme-border px-3 sm:px-4 lg:px-5 py-1.5 flex items-center justify-between shadow-2xs min-h-[52px] h-13.5 gap-2 sm:gap-3">
      {/* Left: Hamburger & Brand & Shop Identity */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden lg:flex w-8 h-8 shrink-0 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-secondary-subtle text-on-surface items-center justify-center transition-all cursor-pointer shadow-2xs hover:border-theme-primary/40"
          title={isSidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          aria-label="Toggle Sidebar"
        >
          <span className="material-symbols-outlined text-[18px] text-on-surface">
            {isSidebarCollapsed ? 'menu_open' : 'menu'}
          </span>
        </button>

        {/* Mobile Drawer Toggle */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="lg:hidden flex w-8 h-8 shrink-0 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-secondary-subtle text-on-surface items-center justify-center transition-all cursor-pointer shadow-2xs"
          title="Mở menu"
          aria-label="Open Mobile Menu"
        >
          <span className="material-symbols-outlined text-[18px] text-on-surface">menu</span>
        </button>

        {/* Brand */}
        <Link href="/seller/dashboard" className="flex items-center gap-2 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-theme-primary flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-lg">store</span>
          </div>
          <div className="flex flex-col">
            <span className="font-editorial text-sm sm:text-base font-bold text-theme-primary leading-tight">HUKI SELLER</span>
            <span className="text-[7.5px] uppercase tracking-wider text-theme-secondary font-bold">Kênh NXB &amp; Tác Giả</span>
          </div>
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
