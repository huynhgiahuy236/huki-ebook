'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { POLICIES_DATA, PolicyDocument } from '../../ui/data/policiesData';

export default function PolicyHubPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const policiesList: PolicyDocument[] = Object.values(POLICIES_DATA);

  const filteredPolicies = policiesList.filter((doc) => {
    const matchesCategory =
      selectedCategory === 'ALL' || doc.category === selectedCategory;
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.shortTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.mappedPol.some((pol) => pol.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-12 w-full">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-stone-900 to-emerald-900 text-white p-8 sm:p-14 lg:p-16 shadow-xl border border-emerald-800/30">
        <div className="relative z-10 max-w-3xl space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs sm:text-sm font-semibold backdrop-blur-sm border border-emerald-500/30">
            <span className="material-symbols-outlined text-base">verified_user</span>
            <span>Bộ Quy Chuẩn Hoạt Động &amp; Pháp Lý HuKi</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15]">
            Minh Bạch • An Toàn • Bảo Vệ Tác Quyền
          </h1>
          <p className="text-stone-300 text-sm sm:text-lg leading-relaxed max-w-2xl">
            Tra cứu đầy đủ và tức thì các điều khoản mua bán sách in, quyền đọc sách số DRM, chính sách hoàn tiền 7 ngày và tiêu chuẩn hợp tác nhà bán hàng.
          </p>

          {/* Search Box */}
          <div className="pt-3">
            <div className="relative max-w-xl">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-xl">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm chính sách (đổi trả, DRM, rút tiền, vận chuyển, POL-03...)"
                className="w-full pl-12 pr-4 py-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white placeholder-stone-400 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white/15 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-white"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none select-none text-white">
          <span className="material-symbols-outlined text-[360px]">policy</span>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-stone-200 dark:border-stone-800 pb-5">
        {[
          { key: 'ALL', label: 'Tất Cả Chính Sách' },
          { key: 'CHUNG', label: 'Quy Định Chung' },
          { key: 'KHACH_HANG', label: 'Dành Cho Độc Giả' },
          { key: 'DOI_TAC', label: 'Dành Cho Nhà Bán' },
          { key: 'BAN_QUYEN', label: 'Bản Quyền & An Toàn' },
        ].map((cat) => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(cat.key)}
            className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all ${
              selectedCategory === cat.key
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200/80 dark:border-stone-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {filteredPolicies.map((item) => (
          <Link
            key={item.slug}
            href={`/policy/${item.slug}`}
            className="group flex flex-col justify-between bg-white dark:bg-stone-900 rounded-3xl p-7 border border-stone-200/80 dark:border-stone-800 hover:border-emerald-600/50 hover:shadow-xl transition-all duration-300"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 flex items-center justify-center group-hover:scale-105 transition shadow-2xs">
                  <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 font-bold">
                    v{item.version}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  {item.categoryLabel}
                </span>
                <h3 className="font-serif font-bold text-xl text-stone-900 dark:text-stone-100 mt-1.5 group-hover:text-emerald-800 dark:group-hover:text-emerald-300 transition leading-snug">
                  {item.title}
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 line-clamp-3 leading-relaxed">
                {item.summary}
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 text-stone-400">
                <span className="material-symbols-outlined text-base">update</span>
                <span>{item.effectiveDate}</span>
              </div>
              <span className="font-semibold text-emerald-800 dark:text-emerald-400 group-hover:translate-x-1 transition flex items-center gap-1">
                Xem toàn văn
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* No Results */}
      {filteredPolicies.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-stone-900 rounded-3xl border border-dashed border-stone-300 dark:border-stone-700 p-8">
          <span className="material-symbols-outlined text-5xl text-stone-400 mb-2">policy</span>
          <p className="text-lg font-semibold text-stone-800 dark:text-stone-200">Không tìm thấy tài liệu phù hợp</p>
          <p className="text-sm text-stone-500 mt-1">Thử tìm bằng các từ khóa khác như: đổi trả, drm, rút tiền, vận chuyển...</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
            className="mt-5 px-5 py-2.5 rounded-xl bg-emerald-800 text-white text-xs sm:text-sm font-semibold"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      )}

      {/* Legal Contact Callout */}
      <div className="bg-stone-100/80 dark:bg-stone-900/60 rounded-3xl p-8 sm:p-10 border border-stone-200/80 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-left">
          <h4 className="font-serif font-bold text-xl sm:text-2xl text-stone-900 dark:text-stone-100">
            Bạn cần tư vấn giải quyết tranh chấp hoặc báo cáo vi phạm tác quyền?
          </h4>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 max-w-2xl leading-relaxed">
            Bộ phận Pháp lý &amp; Bảo vệ Bản quyền HuKi túc trực hỗ trợ 24/7 theo quy chuẩn DMCA và Luật Sở Hữu Trí Tuệ Việt Nam.
          </p>
        </div>
        <div className="flex items-center gap-3.5 flex-shrink-0">
          <a
            href="mailto:legal@huki.vn"
            className="px-6 py-3 rounded-2xl bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm font-bold hover:bg-stone-50 transition flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">mail</span>
            <span>legal@huki.vn</span>
          </a>
          <a
            href="tel:19006868"
            className="px-6 py-3 rounded-2xl bg-emerald-800 text-white text-xs sm:text-sm font-bold hover:bg-emerald-700 transition flex items-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-lg">call</span>
            <span>Hotline 1900-6868</span>
          </a>
        </div>
      </div>
    </div>
  );
}
