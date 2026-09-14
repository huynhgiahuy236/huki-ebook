import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export default function CheckoutLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-theme-bg text-theme-text font-sans antialiased selection:bg-theme-secondary/20">
      {/* Distraction-Free Minimalist Checkout Header */}
      <header className="sticky top-0 z-40 bg-theme-surface/95 backdrop-blur-md border-b border-theme-border shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Security Badge */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-theme-primary to-theme-secondary flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[22px]">menu_book</span>
              </div>
              <div className="flex flex-col">
                <span className="font-editorial text-lg sm:text-xl font-bold tracking-tight text-theme-primary leading-none">
                  HUKI EBOOK
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-theme-text-muted">
                  Sàn Sách Số & Sách Giấy
                </span>
              </div>
            </Link>

            <div className="h-5 w-px bg-theme-border mx-1 hidden sm:block"></div>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-theme-secondary-subtle border border-theme-border/60 text-theme-secondary text-xs font-semibold">
              <span className="material-symbols-outlined text-[15px]">lock</span>
              <span>Thanh toán an toàn 256-bit SSL</span>
            </div>
          </div>

          {/* Right Actions: Back to cart & Hotline */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link
              to="/cart"
              className="inline-flex items-center gap-1 text-theme-text-muted hover:text-theme-primary transition-colors py-1 px-2.5 rounded-xl hover:bg-theme-surface-subtle"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              <span className="hidden sm:inline">Quay lại giỏ hàng</span>
            </Link>

            <a
              href="tel:19008866"
              className="inline-flex items-center gap-1.5 text-theme-secondary bg-theme-secondary-subtle hover:opacity-90 px-3 py-1.5 rounded-xl border border-theme-border/60 transition-all font-bold"
            >
              <span className="material-symbols-outlined text-[16px]">support_agent</span>
              <span>1900 8866</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Page Area without Sidebar */}
      <main id="main-content" className="flex-1 min-w-0">
        <Outlet />
      </main>

      {/* Distraction-Free Minimalist Trust Footer */}
      <footer className="bg-theme-surface border-t border-theme-border py-6 px-4 text-xs text-theme-text-muted mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 font-medium text-theme-text">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-theme-secondary text-[18px]">verified_user</span>
              Bảo mật PCI-DSS Level 1
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-theme-secondary text-[18px]">auto_stories</span>
              Bản quyền tác giả 100%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-theme-secondary text-[18px]">cached</span>
              Đổi trả sách in 7 ngày
            </span>
          </div>

          <div className="text-[11px] text-theme-text-muted">
            © 2026 HUKI Ebook Platform. Mọi quyền được bảo lưu.
          </div>
        </div>
      </footer>
    </div>
  );
}
