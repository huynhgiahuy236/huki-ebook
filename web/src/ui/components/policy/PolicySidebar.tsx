'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { POLICIES_DATA, PolicyDocument } from '../../data/policiesData';

interface PolicySidebarProps {
  onItemClick?: () => void;
}

export const PolicySidebar: React.FC<PolicySidebarProps> = ({ onItemClick }) => {
  const pathname = usePathname();
  const currentSlug = pathname.split('/').pop() || '';

  const policiesList = Object.values(POLICIES_DATA);

  // Group by category
  const categories: Record<string, { label: string; items: PolicyDocument[] }> = {
    CHUNG: { label: 'Quy Định & Pháp Lý Chung', items: [] },
    KHACH_HANG: { label: 'Dành Cho Khách Hàng / Độc Giả', items: [] },
    DOI_TAC: { label: 'Dành Cho Nhà Bán Hàng & NXB', items: [] },
    BAN_QUYEN: { label: 'Bản Quyền Số & An Toàn', items: [] }
  };

  policiesList.forEach(item => {
    if (categories[item.category]) {
      categories[item.category].items.push(item);
    }
  });

  return (
    <aside className="w-full lg:w-80 2xl:w-[340px] flex-shrink-0">
      <div className="sticky top-20 bg-white dark:bg-stone-900 rounded-3xl p-5 shadow-sm border border-stone-200 dark:border-stone-800 space-y-6">
        <div className="px-2 pt-1 border-b border-stone-100 dark:border-stone-800 pb-4">
          <Link
            href="/policy"
            className="flex items-center gap-3 text-stone-900 dark:text-stone-100 hover:text-emerald-700 transition"
          >
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">menu_book</span>
            </div>
            <div>
              <span className="font-serif font-bold text-lg block leading-tight">Trung Tâm Chính Sách</span>
              <p className="text-xs text-stone-500 mt-0.5">Chuẩn mực vận hành HuKi</p>
            </div>
          </Link>
        </div>

        <nav className="space-y-6">
          {Object.entries(categories).map(([catKey, cat]) => {
            if (cat.items.length === 0) return null;
            return (
              <div key={catKey} className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 px-3">
                  {cat.label}
                </h4>
                <div className="space-y-1">
                  {cat.items.map(item => {
                    const isActive = currentSlug === item.slug;
                    return (
                      <Link
                        key={item.slug}
                        href={`/policy/${item.slug}`}
                        onClick={onItemClick}
                        className={`group flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm transition-all ${
                          isActive
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 font-semibold shadow-xs border-l-4 border-emerald-700'
                            : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`material-symbols-outlined text-xl ${
                              isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-400 group-hover:text-stone-600'
                            }`}
                          >
                            {item.icon}
                          </span>
                          <span className="truncate font-medium">{item.shortTitle}</span>
                        </div>
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-500 font-medium">
                          {item.version}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 px-2">
          <div className="p-3.5 bg-stone-50 dark:bg-stone-800/50 rounded-2xl text-xs text-stone-500 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-stone-800 dark:text-stone-200">
              <span className="material-symbols-outlined text-base text-emerald-600">verified</span>
              <span>Đảm bảo pháp lý</span>
            </div>
            <p className="text-xs leading-relaxed text-stone-600 dark:text-stone-400">
              Các văn bản được cập nhật định kỳ và kiểm tra theo Bộ Luật Dân Sự &amp; Luật TMĐT Việt Nam.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
};
