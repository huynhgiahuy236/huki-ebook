"use client";

import React from 'react';
import Link from 'next/link';

export default function StoreFooter() {
  return (
    <footer className="bg-[var(--theme-header-top,#003b2b)] text-[var(--theme-header-top-text,#ffffff)] pt-10 pb-8 border-t border-[var(--theme-primary-hover,#005140)] mt-auto select-none transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-8 border-b border-white/15 text-xs">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-3.5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white text-[var(--theme-primary,#003b2b)] flex items-center justify-center font-bold shadow-sm">
                <span className="material-symbols-outlined text-xl">menu_book</span>
              </div>
              <div className="flex flex-col">
                <span className="font-editorial text-2xl font-bold tracking-tight leading-none text-white">HUKI EBOOK</span>
                <span className="text-[10px] uppercase tracking-widest text-[var(--theme-header-top-accent,#94f5d6)] font-semibold mt-0.5">Sàn TMĐT Sách &amp; Bản Quyền Số</span>
              </div>
            </Link>
            <p className="text-[var(--theme-header-top-accent,#94f5d6)] text-xs leading-relaxed max-w-sm">
              Hệ sinh thái đọc toàn diện kết hợp Sàn Thương Mại Sách chính hãng và Nền tảng Đọc Ebook bản quyền cao cấp. Nâng tầm tri thức và văn hóa đọc của người Việt.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Link href="/policy/drm-copyright" className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full text-[11px] text-[var(--theme-header-top-accent,#94f5d6)] transition">
                <span className="material-symbols-outlined text-[13px]">verified</span>
                Bảo vệ DRM v3.4
              </Link>
              <Link href="/policy/returns" className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full text-[11px] text-[var(--theme-header-top-accent,#94f5d6)] transition">
                <span className="material-symbols-outlined text-[13px]">shield</span>
                Đổi trả 7 ngày
              </Link>
              <Link href="/policy/payment-escrow" className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full text-[11px] text-[var(--theme-header-top-accent,#94f5d6)] transition">
                <span className="material-symbols-outlined text-[13px]">lock</span>
                Ví Escrow an toàn
              </Link>
            </div>
          </div>

          {/* Links Column 1: Mua sắm */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-[var(--theme-header-top-accent,#94f5d6)] uppercase tracking-wider">Dành Cho Độc Giả</h4>
            <ul className="space-y-2 text-white/80">
              <li><Link href="/" className="hover:text-white transition-colors">Sàn TMĐT Sách In</Link></li>
              <li><Link href="/books" className="hover:text-white transition-colors">Khám phá Sách &amp; Combo</Link></li>
              <li><Link href="/policy/shipping" className="hover:text-white transition-colors">Vận chuyển &amp; Giao nhận</Link></li>
              <li><Link href="/policy/returns" className="hover:text-white transition-colors">Chính sách Đổi trả 7 ngày</Link></li>
              <li><Link href="/policy/drm-copyright" className="hover:text-white transition-colors">Quyền đọc Ebook DRM</Link></li>
            </ul>
          </div>

          {/* Links Column 2: Nhà bán */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-[var(--theme-header-top-accent,#94f5d6)] uppercase tracking-wider">Kênh Người Bán &amp; NXB</h4>
            <ul className="space-y-2 text-white/80">
              <li><Link href="/seller/dashboard" className="hover:text-white transition-colors">Bảng điều khiển Seller</Link></li>
              <li><Link href="/seller/register" className="hover:text-white transition-colors">Đăng ký Mở Gian Hàng</Link></li>
              <li><Link href="/policy/seller-rules" className="hover:text-white transition-colors">Quy chế Nhà bán hàng</Link></li>
              <li><Link href="/policy/payment-escrow" className="hover:text-white transition-colors">Thanh toán &amp; Rút tiền Escrow</Link></li>
              <li><Link href="/policy/disputes" className="hover:text-white transition-colors">Giải quyết Tranh chấp</Link></li>
            </ul>
          </div>

          {/* Links Column 3: Chính sách & Pháp lý */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-[var(--theme-header-top-accent,#94f5d6)] uppercase tracking-wider">Chính Sách &amp; Pháp Lý</h4>
            <ul className="space-y-2 text-white/80">
              <li><Link href="/policy/terms" className="hover:text-white transition-colors font-medium">Điều khoản Dịch vụ</Link></li>
              <li><Link href="/policy/privacy" className="hover:text-white transition-colors font-medium">Chính sách Bảo mật</Link></li>
              <li><Link href="/policy/drm-copyright" className="hover:text-white transition-colors font-medium">Bảo vệ Tác quyền DRM</Link></li>
              <li><Link href="/policy/returns" className="hover:text-white transition-colors font-medium">Đổi trả &amp; Bồi hoàn</Link></li>
              <li>
                <Link href="/policy" className="inline-flex items-center gap-1 text-[var(--theme-header-top-accent,#94f5d6)] font-bold hover:underline pt-1">
                  <span>Trung tâm chính sách (POL-01 → 17)</span>
                  <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[var(--theme-header-top-accent,#94f5d6)]/70 gap-2">
          <p>© 2026 HUKI EBOOK. Bản quyền thuộc về Công ty TNHH Sách Điện Tử Huki.</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/policy" className="hover:underline text-white">Chính Sách Sàn</Link>
            <span>•</span>
            <Link href="/policy/terms" className="hover:underline text-white">Quy Chế Hoạt Động</Link>
            <span>•</span>
            <Link href="/policy/privacy" className="hover:underline text-white">Bảo Mật Dữ Liệu</Link>
            <span>•</span>
            <span>Hotline: 1900 8866</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
