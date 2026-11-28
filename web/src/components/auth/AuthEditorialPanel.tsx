import Link from 'next/link';
import type { ReactNode } from 'react';
import { HukiLogo } from '@/components/brand/HukiLogo';

interface AuthEditorialPanelProps {
  eyebrow: string;
  titleLine1: string;
  titleAccent: string;
  description: string;
  highlights?: string[];
  extraContent?: ReactNode;
  footerLeft?: string;
  footerRight?: string;
}

/**
 * Shared editorial brand panel for authentication pages.
 */
export function AuthEditorialPanel({
  eyebrow,
  titleLine1,
  titleAccent,
  description,
  highlights = [],
  extraContent,
  footerLeft = 'Hơn 45.000 độc giả đồng hành',
  footerRight = 'HUKI · 2.4',
}: AuthEditorialPanelProps) {
  return (
    <section className="relative hidden min-h-dvh flex-col justify-between bg-[#0B3025] p-12 text-[#F5F2EB] lg:col-span-5 lg:flex xl:p-16 2xl:p-20">
      {/* Top Brand Mark */}
      <div className="relative z-10">
        <Link href="/" className="inline-flex flex-col items-start gap-2 group">
          <HukiLogo variant="mint" className="h-7 w-auto transition-opacity group-hover:opacity-90" priority />
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#9BB5AA]">
            Khởi Nguồn Tri Thức
          </span>
        </Link>
      </div>

      {/* Center Editorial Copy */}
      <div className="relative z-10 my-auto max-w-[400px] py-10">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.2em] text-[#A4BDB2]">
          {eyebrow}
        </p>

        <h1 className="font-editorial text-[34px] font-semibold leading-[1.16] tracking-[-0.02em] text-white xl:text-[40px]">
          {titleLine1}
          <span className="mt-1 block font-normal italic text-[#E6D8BE]">
            {titleAccent}
          </span>
        </h1>

        <p className="mt-5 text-[15px] font-normal leading-[1.68] text-[#C6D5CE]">
          {description}
        </p>

        {(highlights.length > 0 || extraContent) && (
          <div className="my-8 h-px w-12 bg-white/15" />
        )}

        {highlights.length > 0 && (
          <ul className="space-y-3.5 text-[13.5px] text-[#D7E2DD]">
            {highlights.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E6D8BE]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {extraContent}
      </div>

      {/* Bottom: Quiet Editorial Footer */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-[#9BB5AA]">
        <span>{footerLeft}</span>
        <span className="tracking-wide text-[#C6D5CE]">{footerRight}</span>
      </div>
    </section>
  );
}
