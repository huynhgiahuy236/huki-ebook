import React from 'react';
import Link from 'next/link';

export default function SellerFooter() {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 px-4 md:px-8 text-xs text-slate-500 mt-auto">
      <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-editorial font-bold text-[#003B2B] dark:text-emerald-400 text-base">HUKI SELLER CENTER</span>
          <span>•</span>
          <span>Cổng dịch vụ TMĐT Sách &amp; Bản Quyền Số</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/policy/seller-rules" target="_blank" className="hover:text-[#003B2B] dark:hover:text-emerald-400 transition-colors">
            Quy chế người bán
          </Link>
          <span>•</span>
          <Link href="/policy/drm-copyright" target="_blank" className="hover:text-[#003B2B] dark:hover:text-emerald-400 transition-colors">
            Chính sách DRM
          </Link>
          <span>•</span>
          <Link href="/policy/payment-escrow" target="_blank" className="hover:text-[#003B2B] dark:hover:text-emerald-400 transition-colors">
            Rút tiền &amp; Escrow
          </Link>
          <span>•</span>
          <Link href="/policy/disputes" target="_blank" className="hover:text-[#003B2B] dark:hover:text-emerald-400 transition-colors">
            Xử lý khiếu nại
          </Link>
          <span>•</span>
          <a href="tel:19008866" className="text-emerald-700 dark:text-emerald-400 font-bold">
            Hotline B2B: 1900 8866
          </a>
        </div>
      </div>
    </footer>
  );
}
