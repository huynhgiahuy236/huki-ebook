import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { POLICIES_DATA } from '../../../ui/data/policiesData';
import { PolicySidebar } from '../../../ui/components/policy/PolicySidebar';
import { PolicyTableOfContents } from '../../../ui/components/policy/PolicyTableOfContents';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const policy = POLICIES_DATA[slug];
  if (!policy) return { title: 'Không tìm thấy chính sách | HuKi' };

  return {
    title: `${policy.title} | HuKi Ebook`,
    description: policy.summary,
  };
}

export default async function PolicyDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const policy = POLICIES_DATA[slug];

  if (!policy) {
    notFound();
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start w-full">
      {/* Left Sidebar Navigation */}
      <PolicySidebar />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 bg-white dark:bg-stone-900 rounded-3xl p-6 sm:p-10 lg:p-12 border border-stone-200/80 dark:border-stone-800 shadow-sm space-y-10">
        {/* Document Header */}
        <div className="space-y-6 border-b border-stone-100 dark:border-stone-800 pb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold">
              <span className="material-symbols-outlined text-base">{policy.icon}</span>
              <span>{policy.categoryLabel}</span>
            </div>

            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-stone-500 font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 font-bold">
                Mã: {policy.mappedPol.join(', ')}
              </span>
              <span>•</span>
              <span className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800">
                Phiên bản {policy.version}
              </span>
            </div>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-bold text-stone-900 dark:text-stone-100 tracking-tight leading-[1.25]">
            {policy.title}
          </h1>

          <div className="flex flex-wrap items-center gap-y-2 gap-x-8 text-xs sm:text-sm text-stone-500 pt-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-stone-400">calendar_today</span>
              <span>Ngày ban hành: <strong className="text-stone-700 dark:text-stone-300 font-medium">{policy.effectiveDate}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base text-stone-400">groups</span>
              <span>Phạm vi: <strong className="text-stone-700 dark:text-stone-300 font-medium">{policy.applicableTo}</strong></span>
            </div>
          </div>

          {/* Quick Summary Box */}
          <div className="p-5 sm:p-6 rounded-2xl bg-stone-50/90 dark:bg-stone-800/50 border-l-4 border-emerald-700 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              <span className="material-symbols-outlined text-lg">summarize</span>
              <span>Tóm Lược Cốt Lõi</span>
            </div>
            <p className="text-sm sm:text-base text-stone-700 dark:text-stone-300 leading-relaxed font-normal">
              {policy.summary}
            </p>
          </div>
        </div>

        {/* Document Sections Body */}
        <div className="space-y-12">
          {policy.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24 space-y-4 pt-2 border-b border-stone-100 dark:border-stone-800 pb-10 last:border-b-0"
            >
              <h2 className="font-serif font-bold text-2xl sm:text-3xl text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
                <span className="text-emerald-800 dark:text-emerald-400 font-mono text-xl sm:text-2xl">#</span>
                <span>{section.title}</span>
              </h2>

              <div className="space-y-3.5 text-stone-700 dark:text-stone-300 text-[15px] sm:text-[16px] leading-relaxed">
                {section.content.map((paragraph, pIdx) => (
                  <p key={pIdx} className="leading-relaxed">{paragraph}</p>
                ))}
              </div>

              {/* Callout box if exists */}
              {section.callout && (
                <div
                  className={`mt-4 p-5 rounded-2xl border text-sm sm:text-[15px] space-y-1.5 ${
                    section.callout.type === 'drm'
                      ? 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-950 dark:text-purple-200'
                      : section.callout.type === 'warning'
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                      : section.callout.type === 'highlight'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200'
                      : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    <span className="material-symbols-outlined text-lg">
                      {section.callout.type === 'drm' ? 'lock' : section.callout.type === 'warning' ? 'warning' : 'info'}
                    </span>
                    <span>{section.callout.title}</span>
                  </div>
                  <p className="leading-relaxed opacity-95 text-xs sm:text-sm">{section.callout.text}</p>
                </div>
              )}

              {/* Table if exists */}
              {section.table && (
                <div className="mt-5 overflow-x-auto rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-stone-100/90 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-bold border-b border-stone-200 dark:border-stone-800">
                      <tr>
                        {section.table.headers.map((head, hIdx) => (
                          <th key={hIdx} className="px-5 py-3.5">
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {section.table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-stone-50/60 dark:hover:bg-stone-800/40">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="px-5 py-3.5 text-stone-700 dark:text-stone-300">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* Footer Support Notice */}
        <div className="pt-8 border-t border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-stone-500">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-600 text-lg">verified</span>
            <span>Văn bản có giá trị pháp lý ràng buộc trong giao dịch thương mại điện tử HuKi.</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/policy" className="font-semibold text-emerald-800 dark:text-emerald-400 hover:underline flex items-center gap-1">
              <span>← Tất cả chính sách sàn</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Right Table of Contents (Desktop Sticky) */}
      <PolicyTableOfContents sections={policy.sections} />
    </div>
  );
}
