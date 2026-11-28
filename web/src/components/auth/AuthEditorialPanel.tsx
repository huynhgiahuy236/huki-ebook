import Link from 'next/link';

interface AuthEditorialPanelProps {
  eyebrow: string;
  titleLine1: string;
  titleAccent: string;
  description: string;
  highlights: string[];
}

/**
 * Shared editorial brand panel for authentication pages.
 */
export function AuthEditorialPanel({
  eyebrow,
  titleLine1,
  titleAccent,
  description,
  highlights,
}: AuthEditorialPanelProps) {
  return (
    <section className="relative hidden min-h-dvh flex-col justify-between bg-[#0B3025] p-12 text-[#F5F2EB] lg:col-span-5 lg:flex xl:p-16 2xl:p-20">
      {/* Top Brand Mark */}
      <div className="relative z-10">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/[0.06] text-[#E6D8BE] transition-colors group-hover:border-white/30 group-hover:bg-white/10">
            <span className="material-symbols-outlined text-[20px]">menu_book</span>
          </div>
          <div className="flex flex-col">
            <span className="font-editorial text-lg font-semibold leading-none tracking-tight text-white">
              HUKI
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[#9BB5AA]">
              Khởi Nguồn Tri Thức
            </span>
          </div>
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

        <div className="my-8 h-px w-12 bg-white/15" />

        <ul className="space-y-3.5 text-[13.5px] text-[#D7E2DD]">
          {highlights.map((item) => (
            <li key={item} className="flex items-center gap-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#E6D8BE]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom: Quiet Editorial Footer */}
      <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-5 text-xs text-[#9BB5AA]">
        <span>Hơn 45.000 độc giả đồng hành</span>
        <span className="tracking-wide text-[#C6D5CE]">HUKI · 2.4</span>
      </div>
    </section>
  );
}
