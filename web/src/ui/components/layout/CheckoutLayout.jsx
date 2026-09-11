import React from 'react';
import { Link, Outlet } from 'react-router-dom';

export default function CheckoutLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#17201F] font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Distraction-Free Minimalist Checkout Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8E5DF] shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Security Badge */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#003B2B] to-[#006B50] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[22px]">menu_book</span>
              </div>
              <div className="flex flex-col">
                <span className="font-editorial text-lg sm:text-xl font-bold tracking-tight text-[#003B2B] leading-none">
                  HUKI EBOOK
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B7280]">
                  Sàn Sách Số & Sách Giấy
                </span>
              </div>
            </Link>

            <div className="h-5 w-px bg-[#E8E5DF] mx-1 hidden sm:block"></div>

            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-800 text-xs font-semibold">
              <span className="material-symbols-outlined text-[15px] text-emerald-600">lock</span>
              <span>Thanh toán an toàn 256-bit SSL</span>
            </div>
          </div>

          {/* Right Actions: Back to cart & Hotline */}
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link
              to="/cart"
              className="inline-flex items-center gap-1 text-[#6B7280] hover:text-[#003B2B] transition-colors py-1 px-2 rounded-lg hover:bg-gray-50"
            >
              <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
              <span className="hidden sm:inline">Quay lại giỏ hàng</span>
            </Link>

            <a
              href="tel:19008866"
              className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
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
      <footer className="bg-white border-t border-[#E8E5DF] py-6 px-4 text-xs text-[#6B7280] mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 font-medium">
            <span className="flex items-center gap-1 text-[#17201F]">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified_user</span>
              Bảo mật PCI-DSS Level 1
            </span>
            <span className="flex items-center gap-1 text-[#17201F]">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">auto_stories</span>
              Bản quyền tác giả 100%
            </span>
            <span className="flex items-center gap-1 text-[#17201F]">
              <span className="material-symbols-outlined text-emerald-600 text-[18px]">cached</span>
              Đổi trả sách in 7 ngày
            </span>
          </div>

          <div className="text-[11px] text-[#9CA3AF]">
            © 2026 HUKI Ebook Platform. Mọi quyền được bảo lưu.
          </div>
        </div>
      </footer>
    </div>
  );
}
