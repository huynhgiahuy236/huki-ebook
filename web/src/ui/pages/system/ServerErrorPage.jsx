import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

export default function ServerErrorPage() {
  const { showToast } = useToast();
  const [isReloading, setIsReloading] = useState(false);

  const handleReload = () => {
    setIsReloading(true);
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleReportIssue = () => {
    showToast('Đã gửi báo cáo sự cố máy chủ đến đội ngũ kỹ thuật HUKI!', 'success');
  };

  return (
    <main id="main-content" tabIndex="-1" className="h-screen w-screen max-h-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased outline-none selection:bg-[#94f5d6]/30">
      <div className="grid h-screen w-full grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* LEFT COLUMN: Brand & 500 Mascot Showcase */}
        <section
          className="relative hidden lg:flex h-full flex-col justify-between overflow-hidden p-6 xl:p-10 lg:col-span-5 text-white"
          style={{ background: 'linear-gradient(to bottom right, #003B2B, #0f2b1d, #1a2310)' }}
        >
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-[#94f5d6]/10 blur-3xl pointer-events-none" />

          {/* Top: Brand Logo & Status Pill */}
          <div className="relative z-10 shrink-0">
            <div>
              <Link to="/" className="inline-flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:scale-105 transition-transform shadow-inner">
                  <span className="material-symbols-outlined text-2xl text-amber-300">power</span>
                </div>
                <div>
                  <span className="font-editorial text-2xl font-bold tracking-tight text-white block leading-none">
                    HUKI EBOOK
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-amber-300 font-bold mt-0.5 block">
                    Sự Cố Máy Chủ Tạm Thời
                  </span>
                </div>
              </Link>
            </div>

            <div className="mt-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-amber-200 text-xs font-semibold backdrop-blur-sm shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>Sự cố kỹ thuật · Mã lỗi #ERR-500-SHARK</span>
              </span>
            </div>
          </div>

          {/* Center: Hero Mascot & 500 Badge */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2">
            <div className="relative mb-1 inline-block text-center">
              <div className="text-7xl xl:text-8xl font-editorial font-extrabold text-white tracking-tight leading-none drop-shadow-md">
                500
              </div>
              <span className="absolute -top-1 -right-4 rotate-12 px-2.5 py-0.5 rounded-full bg-[#E11D48] text-white text-[11px] font-bold tracking-wide shadow-lg transform hover:scale-105 transition-transform animate-bounce">
                Ối... chập rồi!
              </span>
            </div>

            {/* SVG Mascot Shark */}
            <div className="w-full max-w-[220px] h-28 flex items-center justify-center">
              <svg viewBox="0 0 240 140" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M30 140 Q35 100 25 70 T35 30" stroke="#10B981" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                <path d="M210 140 Q205 105 215 75 T208 40" stroke="#10B981" strokeWidth="3" strokeLinecap="round" opacity="0.5" />
                
                <rect x="55" y="85" width="40" height="35" rx="4" fill="#1E293B" stroke="#475569" strokeWidth="2" />
                <line x1="60" y1="94" x2="90" y2="94" stroke="#334155" strokeWidth="2" />
                <line x1="60" y1="102" x2="90" y2="102" stroke="#334155" strokeWidth="2" />
                <circle cx="62" cy="94" r="1.5" fill="#EF4444" className="animate-ping" />
                <circle cx="67" cy="94" r="1.5" fill="#F59E0B" />
                <circle cx="72" cy="94" r="1.5" fill="#10B981" />

                <path d="M95 105 C115 105 120 95 130 95" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" />
                <path d="M145 95 C155 95 165 92 185 85" stroke="#0F172A" strokeWidth="4" strokeLinecap="round" strokeDasharray="3 3" />
                <path d="M132 93 L138 88 L135 97 L142 92" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-pulse" />

                <g transform="translate(95, 26)">
                  <path d="M0 35 C-15 25 -25 20 -30 15 C-25 35 -25 45 -30 65 C-20 55 -10 50 0 42 Z" fill="#0284C7" />
                  <path d="M30 15 C35 -5 45 -10 55 -5 C50 10 45 15 40 18 Z" fill="#0284C7" />
                  <ellipse cx="45" cy="38" rx="45" ry="26" fill="#0EA5E9" />
                  <path d="M15 45 Q45 62 80 45 Q45 52 15 45 Z" fill="#FFFFFF" opacity="0.9" />
                  <path d="M38 48 C42 62 55 68 62 65 C55 55 50 50 42 46 Z" fill="#0284C7" />
                  <circle cx="68" cy="30" r="7" fill="#FFFFFF" />
                  <circle cx="70" cy="30" r="4.5" fill="#0F172A" />
                  <circle cx="69" cy="28" r="1.5" fill="#FFFFFF" />
                  <ellipse cx="62" cy="40" rx="4" ry="2.5" fill="#FDA4AF" />
                  <path d="M68 45 Q75 52 82 45" stroke="#0F172A" strokeWidth="2.5" fill="#BE123C" strokeLinecap="round" />
                </g>
                <circle cx="190" cy="40" r="3.5" fill="#BAE6FD" opacity="0.7" />
              </svg>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-amber-300 mt-2">
              <span className="material-symbols-outlined text-xs animate-spin">sync</span>
              <span>Máy chủ đang tự khởi động lại</span>
            </div>
          </div>

          {/* Bottom: Status Footer */}
          <div className="relative z-10 pt-3 border-t border-white/15 shrink-0">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Đội ngũ SRE HUKI đang xử lý</span>
              </span>
              <span className="font-semibold text-white/90">Data 100% Safe</span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive Content, Actions & Trust Bar */}
        <section className="h-full flex flex-col justify-between bg-white dark:bg-slate-900 p-6 sm:p-8 xl:p-12 lg:col-span-7 overflow-y-auto lg:overflow-hidden">
          
          {/* Top Header */}
          <div className="flex items-center justify-between shrink-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#005E44] dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              <span>Về trang chủ HUKI</span>
            </Link>

            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 px-2.5 py-0.5 rounded-full">
              Mã lỗi 500 Internal Error
            </span>
          </div>

          {/* Center Main Content */}
          <div className="my-auto py-2 max-w-lg">
            
            {/* Mobile Mascot Badge */}
            <div className="lg:hidden mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-xs font-semibold text-amber-700 dark:text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>500 · Máy chủ chập mạch</span>
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
              Cá mập làm máy chủ <br className="hidden sm:inline" />
              <span className="text-amber-600 dark:text-amber-400 italic">chập mạch rồi!</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed font-light">
              Hệ thống đang gặp sự cố gián đoạn tạm thời ngoài dự kiến. Đội ngũ kỹ thuật HUKI đang khôi phục dữ liệu đường truyền, bạn vui lòng tải lại trang sau giây lát.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 mt-4">
              <button
                type="button"
                onClick={handleReload}
                disabled={isReloading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#005E44] hover:bg-[#004733] text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-base ${isReloading ? 'animate-spin' : ''}`}>refresh</span>
                <span>{isReloading ? 'Đang tải lại...' : 'Thử tải lại'}</span>
              </button>

              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">home</span>
                <span>Về trang chủ</span>
              </Link>
            </div>

            {/* Trust Status Bar */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-medium">
                <span className="material-symbols-outlined text-base text-emerald-600">verified_user</span>
                <span>Dữ liệu sách &amp; tài khoản an toàn tuyệt đối</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                <span>Hệ thống bảo vệ active</span>
              </div>
            </div>

          </div>

          {/* Bottom Discovery Suggestions & Report */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              TRONG LÚC CHỜ ĐỢI, BẠN CÓ THỂ:
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                to="/books"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all"
              >
                <span>⭐</span>
                <span>Xem sách nổi bật</span>
              </Link>

              <Link
                to="/library"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all"
              >
                <span>📚</span>
                <span>Khám phá thư viện</span>
              </Link>

              <Link
                to="/community/clubs"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all"
              >
                <span>👥</span>
                <span>Ghé CLB đọc sách</span>
              </Link>

              <button
                type="button"
                onClick={handleReportIssue}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-rose-500 hover:text-rose-600 dark:hover:text-rose-400 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <span>📢</span>
                <span>Báo cáo sự cố</span>
              </button>
            </div>
          </div>

        </section>

      </div>
    </main>
  );
}
