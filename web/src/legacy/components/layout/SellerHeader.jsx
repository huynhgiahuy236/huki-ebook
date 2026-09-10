import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function SellerHeader({ isSidebarCollapsed, toggleSidebar, toggleMobileSidebar }) {
  const { seller } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-theme-surface/95 backdrop-blur-md border-b border-theme-border px-4 md:px-6 py-2.5 flex items-center justify-between shadow-2xs">
      {/* Left: Hamburger & Brand & Shop Identity */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={toggleSidebar}
          className="hidden lg:flex w-9 h-9 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-secondary-subtle text-on-surface items-center justify-center transition-all cursor-pointer shadow-2xs hover:border-theme-primary/40"
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
          className="lg:hidden flex w-9 h-9 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-secondary-subtle text-on-surface items-center justify-center transition-all cursor-pointer shadow-2xs"
          title="Mở menu"
          aria-label="Open Mobile Menu"
        >
          <span className="material-symbols-outlined text-xl text-on-surface">menu</span>
        </button>

        {/* Brand */}
        <Link to="/seller/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-theme-primary flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <span className="material-symbols-outlined text-xl">store</span>
          </div>
          <div className="flex flex-col">
            <span className="font-editorial text-lg sm:text-xl font-bold text-theme-primary leading-none">HUKI SELLER</span>
            <span className="text-[8.5px] uppercase tracking-widest text-theme-secondary font-bold">Kênh NXB &amp; Tác Giả</span>
          </div>
        </Link>

        {/* Shop Badge */}
        <div className="hidden xl:flex items-center gap-2 bg-theme-secondary-subtle/60 px-3 py-1.5 rounded-full border border-theme-border">
          <span className="w-2 h-2 rounded-full bg-theme-primary animate-pulse" aria-hidden="true"></span>
          <span className="text-xs font-bold text-on-surface">{seller?.name || "Alpha Books Official"}</span>
          <span className="text-[10px] bg-theme-primary/10 text-theme-primary px-2 py-0.5 rounded-full font-bold">Đối tác cấp 1</span>
        </div>
      </div>

      {/* Center Search */}
      <div className="hidden md:flex items-center bg-surface-container-low/80 border border-theme-border rounded-full px-4 py-1.5 w-64 lg:w-80 text-xs text-on-surface-variant focus-within:border-theme-primary focus-within:ring-2 focus-within:ring-theme-primary/10 transition-all">
        <span className="material-symbols-outlined text-base mr-2 text-on-surface-variant">search</span>
        <input
          type="text"
          placeholder="Tìm mã đơn #HK..., SKU, tựa sách..."
          className="bg-transparent border-none outline-none w-full text-xs text-on-surface placeholder:text-on-surface-variant/70"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Messenger / Chat Hộp Thư Khách Hàng */}
        <Link
          to="/seller/chat"
          className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border border-theme-border bg-theme-surface hover:bg-theme-secondary-subtle text-on-surface hover:text-theme-primary transition-all shadow-2xs group"
          title="Hộp thư & Tin nhắn khách hàng"
          aria-label="Tin nhắn"
        >
          <span className="material-symbols-outlined text-xl text-theme-primary group-hover:scale-110 transition-transform">chat</span>
          <span className="hidden md:inline text-xs font-bold text-on-surface group-hover:text-theme-primary">Tin nhắn</span>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full flex items-center justify-center shadow-xs animate-pulse">
            3
          </span>
        </Link>

        <Link
          to="/seller/product/create-hybrid"
          className="flex items-center gap-1.5 bg-theme-primary text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold hover:opacity-90 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          <span className="hidden sm:inline">Thêm Sản Phẩm Mới</span>
          <span className="sm:hidden">Thêm</span>
        </Link>

        <div className="h-6 w-px bg-theme-border"></div>

        <Link
          to="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-theme-primary hover:bg-theme-secondary-subtle px-3 py-1.5 rounded-xl border border-theme-border transition-colors"
        >
          <span className="material-symbols-outlined text-base">open_in_new</span>
          <span className="hidden sm:inline">Về Sàn HUKI</span>
        </Link>
      </div>
    </header>
  );
}
