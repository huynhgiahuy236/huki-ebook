import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SellerHeader({ isSidebarCollapsed, toggleSidebar, toggleMobileSidebar }) {
  const { user } = useAuth();
  const sellerName = user?.business?.name || user?.fullName || user?.name || "NXB Doanh Nghiệp";

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-theme-border px-3 sm:px-5 lg:px-6 py-2.5 flex items-center justify-between shadow-2xs min-h-[64px] gap-2 sm:gap-4">
      {/* Left: Hamburger & Brand & Shop Identity */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden lg:flex w-9 h-9 shrink-0 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-secondary-subtle text-on-surface items-center justify-center transition-all cursor-pointer shadow-2xs hover:border-theme-primary/40"
          title={isSidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          aria-label="Toggle Sidebar"
        >
          <span className="material-symbols-outlined text-xl text-on-surface">
            {isSidebarCollapsed ? 'menu_open' : 'menu'}
          </span>
        </button>

        {/* Mobile Drawer Toggle */}
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="lg:hidden flex w-9 h-9 shrink-0 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-secondary-subtle text-on-surface items-center justify-center transition-all cursor-pointer shadow-2xs"
          title="Mở menu"
          aria-label="Open Mobile Menu"
        >
          <span className="material-symbols-outlined text-xl text-on-surface">menu</span>
        </button>

        {/* Brand */}
        <Link to="/seller/dashboard" className="flex items-center gap-2 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-theme-primary flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">store</span>
          </div>
          <div className="flex flex-col">
            <span className="font-editorial text-base sm:text-lg font-bold text-theme-primary leading-tight">HUKI SELLER</span>
            <span className="text-[8px] uppercase tracking-wider text-theme-secondary font-bold">Kênh NXB &amp; Tác Giả</span>
          </div>
        </Link>

        {/* Shop Badge (Auto-truncated) */}
        <div className="hidden lg:flex items-center gap-2 bg-theme-secondary-subtle/60 px-3 py-1.5 rounded-full border border-theme-border max-w-[220px] xl:max-w-[280px] 2xl:max-w-[360px] min-w-0 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" aria-hidden="true"></span>
          <span className="text-xs font-bold text-on-surface truncate" title={sellerName}>{sellerName}</span>
          <span className="text-[10px] bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-full font-bold shrink-0 whitespace-nowrap">Đối tác cấp 1</span>
        </div>
      </div>

      {/* Center Search */}
      <div className="hidden md:flex items-center bg-surface-container-low/80 border border-theme-border rounded-full px-3.5 py-1.5 w-44 lg:w-56 xl:w-72 text-xs text-on-surface-variant focus-within:border-theme-primary focus-within:ring-2 focus-within:ring-theme-primary/10 transition-all shrink-0">
        <span className="material-symbols-outlined text-base mr-2 text-on-surface-variant shrink-0">search</span>
        <input
          type="text"
          placeholder="Tìm mã đơn, SKU, tựa sách..."
          className="bg-transparent border-none outline-none w-full text-xs text-on-surface placeholder:text-on-surface-variant/70 min-w-0"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Messenger / Chat Hộp Thư Khách Hàng (Deferred) */}
        <div
          className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-theme-border opacity-40 cursor-not-allowed pointer-events-none select-none text-on-surface-variant bg-black/[0.02] dark:bg-white/[0.02] shrink-0"
          title="Hộp thư & Tin nhắn khách hàng (Sắp ra mắt)"
          aria-label="Tin nhắn (Sắp ra mắt)"
        >
          <span className="material-symbols-outlined text-lg sm:text-xl text-on-surface-variant">chat</span>
          <span className="hidden 2xl:inline text-xs font-semibold text-on-surface-variant whitespace-nowrap">Tin nhắn (Sắp ra mắt)</span>
        </div>

        <Link
          to="/seller/product/create-hybrid"
          className="flex items-center gap-1.5 bg-theme-primary text-white px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm shrink-0 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          <span className="hidden sm:inline">Thêm Sản Phẩm</span>
          <span className="sm:hidden">Thêm</span>
        </Link>

        <div className="h-5 w-px bg-theme-border shrink-0"></div>

        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-theme-primary hover:bg-theme-secondary-subtle px-2.5 sm:px-3 py-1.5 rounded-xl border border-theme-border transition-colors shrink-0 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-base">open_in_new</span>
          <span className="hidden sm:inline">Về Sàn HUKI</span>
        </Link>
      </div>
    </header>
  );
}
