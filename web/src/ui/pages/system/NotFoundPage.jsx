import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/books?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/books');
    }
  };

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <main id="main-content" tabIndex="-1" className="h-screen w-screen max-h-screen overflow-hidden bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans antialiased outline-none selection:bg-[#94f5d6]/30">
      <div className="grid h-screen w-full grid-cols-1 lg:grid-cols-12 overflow-hidden">
        
        {/* LEFT COLUMN: Brand & Mascot Showcase */}
        <section
          className="relative hidden lg:flex h-full flex-col justify-between overflow-hidden p-6 xl:p-10 lg:col-span-5 text-white"
          style={{ background: 'linear-gradient(to bottom right, var(--theme-hero-from, #003B2B), var(--theme-hero-via, #002B1F), var(--theme-hero-to, #001A13))' }}
        >
          {/* Background Ambient Glows */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-[#94f5d6]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full bg-[#0EA5E9]/15 blur-3xl pointer-events-none" />

          {/* Top: Brand Logo & Status Pill */}
          <div className="relative z-10 shrink-0">
            <div>
              <Link to="/" className="inline-flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 group-hover:scale-105 transition-transform shadow-inner">
                  <span className="material-symbols-outlined text-2xl text-[#94f5d6]">menu_book</span>
                </div>
                <div>
                  <span className="font-editorial text-2xl font-bold tracking-tight text-white block leading-none">
                    HUKI EBOOK
                  </span>
                  <span className="text-[10px] uppercase tracking-widest text-[#94f5d6] font-bold mt-0.5 block">
                    Khởi Nguồn Tri Thức Mới
                  </span>
                </div>
              </Link>
            </div>

            <div className="mt-3">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[#94f5d6] text-xs font-semibold backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                <span>Sự cố biển · Mã lỗi #ERR-404-SHARK</span>
              </span>
            </div>
          </div>

          {/* Center: Hero Mascot & 404 Badge */}
          <div className="relative z-10 flex flex-col items-center justify-center my-auto py-2">
            <div className="relative mb-1 inline-block text-center">
              <div className="text-7xl xl:text-8xl font-editorial font-extrabold text-white tracking-tight leading-none drop-shadow-md">
                404
              </div>
              <span className="absolute -top-1 -right-4 rotate-12 px-2.5 py-0.5 rounded-full bg-[#10B981] text-white text-[11px] font-bold tracking-wide shadow-md animate-bounce">
                Đứt cáp!
              </span>
            </div>

            {/* SVG Mascot Shark */}
            <div className="w-full max-w-[220px] h-28 flex items-center justify-center">
              <svg viewBox="0 0 240 140" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25 140 Q30 100 20 70 T30 30" stroke="#10B981" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
                <path d="M215 140 Q210 105 220 75 T212 40" stroke="#10B981" strokeWidth="3" strokeLinecap="round" opacity="0.6" />

                <path d="M15 85 L85 85" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
                <path d="M145 85 L225 85" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
                
                <line x1="83" y1="85" x2="89" y2="85" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />
                <line x1="141" y1="85" x2="147" y2="85" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" className="animate-pulse" />

                <g transform="translate(85, 26)">
                  <path d="M0 35 C-15 25 -25 20 -30 15 C-25 35 -25 45 -30 65 C-20 55 -10 50 0 42 Z" fill="#0284C7" />
                  <path d="M30 15 C35 -5 45 -10 55 -5 C50 10 45 15 40 18 Z" fill="#0284C7" />
                  <ellipse cx="45" cy="38" rx="45" ry="26" fill="#0EA5E9" />
                  <path d="M15 45 Q45 62 80 45 Q45 52 15 45 Z" fill="#FFFFFF" opacity="0.9" />
                  <path d="M38 48 C42 62 55 68 62 65 C55 55 50 50 42 46 Z" fill="#0284C7" />
                  
                  <g transform="translate(62, 38)">
                    <path d="M0 15 Q14 22 28 10 Q14 6 0 15 Z" fill="#1E293B" />
                    <polygon points="4,10 7,14 10,10" fill="#FFFFFF" />
                    <polygon points="12,10 15,14 18,10" fill="#FFFFFF" />
                    <polygon points="20,9 23,13 26,9" fill="#FFFFFF" />
                    <line x1="-5" y1="12" x2="33" y2="12" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
                  </g>

                  <circle cx="66" cy="26" r="7" fill="#FFFFFF" />
                  <circle cx="68" cy="26" r="4.5" fill="#0F172A" />
                  <circle cx="67" cy="24" r="1.5" fill="#FFFFFF" />
                  <ellipse cx="58" cy="35" rx="4" ry="2.5" fill="#FDA4AF" />
                </g>

                <circle cx="65" cy="40" r="3.5" fill="#BAE6FD" opacity="0.7" />
                <circle cx="180" cy="45" r="3" fill="#BAE6FD" opacity="0.7" />
              </svg>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-[#94f5d6] mt-2">
              <span className="material-symbols-outlined text-xs text-amber-400">bolt</span>
              <span>Tín hiệu quang học: 0 kbps</span>
            </div>
          </div>

          {/* Bottom: Reassurance */}
          <div className="relative z-10 pt-3 border-t border-white/15 shrink-0">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#94f5d6] animate-pulse" />
                <span>Hơn 45.000+ độc giả hoạt động</span>
              </span>
              <span className="font-semibold text-white/90">HUKI Cloud Safe</span>
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: Interactive Content, Search & Navigation */}
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

            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
              Mã lỗi 404
            </span>
          </div>

          {/* Center Main Content */}
          <div className="my-auto py-2 max-w-lg">
            
            {/* Mobile Mascot Badge */}
            <div className="lg:hidden mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F4F0] dark:bg-emerald-950/60 border border-[#BDE6D7] dark:border-emerald-800 text-xs font-semibold text-[#006953] dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              <span>404 · Cá mập cắn đứt cáp</span>
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
              Cá mập cắn mất <br className="hidden sm:inline" />
              <span className="text-[#005E44] dark:text-emerald-400 italic">đường dẫn rồi!</span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed font-light">
              Trang bạn đang tìm kiếm có thể đã bị di chuyển, xóa mất hoặc trôi dạt ngoài đại dương. Toàn bộ kho sách và tài khoản của bạn vẫn an toàn tuyệt đối.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 mt-4">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#005E44] hover:bg-[#004733] text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">home</span>
                <span>Về trang chủ</span>
              </Link>

              <button
                type="button"
                onClick={handleGoBack}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                <span>Quay lại</span>
              </button>
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleSearch} className="w-full relative mt-4">
              <div className="relative flex items-center bg-slate-50 dark:bg-slate-800/90 rounded-full border border-slate-200 dark:border-slate-700 shadow-2xs p-1 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:bg-white transition-all">
                <span className="material-symbols-outlined ml-3 text-slate-400 text-base">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm tựa sách, tác giả hoặc ISBN thay thế..."
                  className="w-full bg-transparent px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full bg-[#005E44] hover:bg-[#004733] text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                >
                  Tìm kiếm
                </button>
              </div>
            </form>

          </div>

          {/* Bottom Discovery Suggestions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              GỢI Ý BẾN ĐỖ AN TOÀN CHO BẠN:
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                to="/books"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all"
              >
                <span>⭐</span>
                <span>Sách Bestseller</span>
              </Link>

              <Link
                to="/library"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all"
              >
                <span>📚</span>
                <span>Tủ Sách Cá Nhân</span>
              </Link>

              <Link
                to="/community/clubs"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all"
              >
                <span>👥</span>
                <span>CLB Đọc Sách</span>
              </Link>

              <Link
                to="/audiobooks"
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-2xs transition-all"
              >
                <span>🎧</span>
                <span>Sách Nói</span>
              </Link>
            </div>
          </div>

        </section>

      </div>
    </main>
  );
}
