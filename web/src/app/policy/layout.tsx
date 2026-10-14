import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Trung Tâm Chính Sách & Điều Khoản | HuKi Ebook',
  description: 'Toàn văn các chính sách, quy chế hoạt động, điều khoản dịch vụ và cam kết bản quyền của sàn thương mại điện tử HuKi.',
};

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-[calc(100vh-140px)] bg-stone-50/50 dark:bg-stone-950 text-stone-800 dark:text-stone-200">
      {/* Top Breadcrumb & Quick Banner */}
      <div className="border-b border-stone-200/80 dark:border-stone-800 bg-white/80 dark:bg-stone-900/70 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1680px] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-10 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-stone-500">
            <Link href="/" className="hover:text-emerald-700 transition">Trang Chủ</Link>
            <span>/</span>
            <Link href="/policy" className="font-semibold text-stone-800 dark:text-stone-200 hover:text-emerald-700 transition">
              Trung Tâm Chính Sách
            </Link>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-xs sm:text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Cập nhật 2026 (POL-01 → POL-17)
            </span>
            <span className="text-stone-300 dark:text-stone-700">|</span>
            <span className="text-stone-500">Hỗ trợ: support@huki.vn</span>
          </div>
        </div>
      </div>

      <main className="max-w-[1680px] 2xl:max-w-[1780px] mx-auto px-4 sm:px-6 lg:px-10 py-8 lg:py-10">
        {children}
      </main>
    </div>
  );
}
