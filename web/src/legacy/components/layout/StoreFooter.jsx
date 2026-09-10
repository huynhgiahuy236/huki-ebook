import React from 'react';
import { Link } from 'react-router-dom';

export default function StoreFooter() {
  return (
    <footer className="bg-[var(--theme-header-top,#003b2b)] text-[var(--theme-header-top-text,#ffffff)] pt-10 pb-8 border-t border-[var(--theme-primary-hover,#005140)] mt-auto select-none transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-8 border-b border-white/15 text-xs">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-3.5">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white text-[var(--theme-primary,#003b2b)] flex items-center justify-center font-bold shadow-sm">
                <span className="material-symbols-outlined text-xl">menu_book</span>
              </div>
              <div className="flex flex-col">
                <span className="font-editorial text-2xl font-bold tracking-tight leading-none text-white">HUKI EBOOK</span>
                <span className="text-[10px] uppercase tracking-widest text-[var(--theme-header-top-accent,#94f5d6)] font-semibold mt-0.5">Sàn TMĐT Sách &amp; Bản Quyền Số</span>
              </div>
            </Link>
            <p className="text-[var(--theme-header-top-accent,#94f5d6)] text-xs leading-relaxed max-w-sm">
              Hệ sinh thái đọc toàn diện kết hợp Sàn Thương Mại Sách chính hãng và Nền tảng Đọc Ebook bản quyền cao cấp. Nâng tầm tri thức và trải nghiệm văn hóa đọc của người Việt.
            </p>
            <div className="flex items-center gap-2.5 pt-1">
              <span className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[11px] text-[var(--theme-header-top-accent,#94f5d6)]">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                Bảo vệ DRM v3.4
              </span>
              <span className="inline-flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[11px] text-[var(--theme-header-top-accent,#94f5d6)]">
                <span className="material-symbols-outlined text-[13px]">shield</span>
                100% Sách Thật
              </span>
            </div>
          </div>

          {/* Links Column 1 */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-[var(--theme-header-top-accent,#94f5d6)] uppercase tracking-wider">Hệ Sinh Thái Huki</h4>
            <ul className="space-y-2 text-white/80">
              <li><Link to="/" className="hover:text-white transition-colors">Sàn TMĐT Sách</Link></li>
              <li><Link to="/books" className="hover:text-white transition-colors">Khám phá Sách &amp; Combo</Link></li>
              <li><Link to="/community" aria-disabled="true" tabIndex={-1} className="pointer-events-none opacity-35">Mạng xã hội Độc giả · Tạm khóa</Link></li>
              <li><Link to="/library" aria-disabled="true" tabIndex={-1} className="pointer-events-none opacity-35">Tủ sách Cá nhân · Tạm khóa</Link></li>
              <li><Link to="/reader" aria-disabled="true" tabIndex={-1} className="pointer-events-none opacity-35">Trình đọc WebReader · Tạm khóa</Link></li>
            </ul>
          </div>

          {/* Links Column 2 */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-[var(--theme-header-top-accent,#94f5d6)] uppercase tracking-wider">Kênh Người Bán &amp; NXB</h4>
            <ul className="space-y-2 text-white/80">
              <li><Link to="/seller/dashboard" className="hover:text-white transition-colors">Bảng điều khiển Seller</Link></li>
              <li><Link to="/seller/orders" className="hover:text-white transition-colors">Quản lý Đơn hàng</Link></li>
              <li><Link to="/seller/product/create-hybrid" className="hover:text-white transition-colors">Đăng tải Sách Hybrid</Link></li>
              <li><Link to="/seller/product/create-ebook" className="hover:text-white transition-colors">Đăng tải Ebook DRM</Link></li>
              <li><Link to="/seller/register" className="hover:text-white transition-colors">Đăng ký Đối tác NXB</Link></li>
            </ul>
          </div>

          {/* Links Column 3 */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-[var(--theme-header-top-accent,#94f5d6)] uppercase tracking-wider">Hỗ Trợ &amp; Ứng Dụng</h4>
            <p className="text-white/80 text-[11px]">Hotline hỗ trợ 24/7: <span className="text-[var(--theme-header-top-accent,#94f5d6)] font-bold">1900 8866</span></p>
            <div className="space-y-2 pt-1">
              <Link to="/reader" aria-disabled="true" tabIndex={-1} className="pointer-events-none opacity-35 grayscale flex items-center gap-2 bg-white/10 p-2 rounded-xl border border-white/10 text-xs">
                <span className="material-symbols-outlined text-lg text-[var(--theme-header-top-accent,#94f5d6)]">devices</span>
                <div>
                  <p className="text-[10px] text-[var(--theme-header-top-accent,#94f5d6)] leading-none">Trải nghiệm</p>
                  <p className="font-bold">Huki Reader App</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[var(--theme-header-top-accent,#94f5d6)]/70 gap-2">
          <p>© 2026 HUKI EBOOK. Bản quyền thuộc về Công ty TNHH Sách Điện Tử Huki.</p>
          <div className="flex items-center gap-3">
            <span>Máy chủ DRM: Sẵn sàng</span>
            <span>•</span>
            <span>Bản quyền số Quốc gia</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
