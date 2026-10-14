'use client';

import React from 'react';
import Link from 'next/link';
import { POLICIES_DATA } from '../../data/policiesData';

interface PolicyQuickModalProps {
  isOpen: boolean;
  onClose: () => void;
  slug: string;
}

export const PolicyQuickModal: React.FC<PolicyQuickModalProps> = ({ isOpen, onClose, slug }) => {
  if (!isOpen) return null;

  const policy = POLICIES_DATA[slug] || POLICIES_DATA['terms'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-stone-900 w-full max-w-3xl max-h-[85vh] rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/70 dark:bg-stone-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">{policy.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-stone-900 dark:text-stone-100 leading-tight">
                  {policy.shortTitle}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                  v{policy.version}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">Hiệu lực: {policy.effectiveDate} • {policy.applicableTo}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-stone-700 dark:text-stone-300 text-sm leading-relaxed">
          {/* Summary Box */}
          <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 rounded-2xl">
            <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 text-xs uppercase tracking-wider mb-1">
              Tóm Tắt Cốt Lõi
            </h4>
            <p className="text-stone-700 dark:text-stone-300 text-xs">
              {policy.summary}
            </p>
          </div>

          {/* Sections List */}
          <div className="space-y-6">
            {policy.sections.map((section) => (
              <div key={section.id} className="space-y-2">
                <h4 className="font-serif font-bold text-stone-900 dark:text-stone-100 text-base">
                  {section.title}
                </h4>
                <div className="space-y-2 text-xs sm:text-sm text-stone-600 dark:text-stone-400">
                  {section.content.map((p, pIdx) => (
                    <p key={pIdx}>{p}</p>
                  ))}
                </div>

                {section.callout && (
                  <div className={`mt-2 p-3 rounded-xl border text-xs ${
                    section.callout.type === 'drm'
                      ? 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 text-purple-900 dark:text-purple-300'
                      : section.callout.type === 'warning'
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 text-amber-900 dark:text-amber-300'
                      : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 text-stone-700 dark:text-stone-300'
                  }`}>
                    <strong className="block mb-0.5">{section.callout.title}</strong>
                    <span>{section.callout.text}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900/50">
          <Link
            href={`/policy/${policy.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
          >
            <span>Mở toàn văn trang chính sách</span>
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </Link>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-bold hover:bg-stone-800 dark:hover:bg-white transition"
          >
            Tôi Đã Hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
