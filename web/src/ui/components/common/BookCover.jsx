import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';

// Generates consistent elegant gradient themes based on book title
function getCoverTheme(title = '') {
  const themes = [
    { bg: 'from-[#003b2b] via-[#005a42] to-[#01261c]', text: 'text-[#94f5d6]', accent: '#94f5d6' },
    { bg: 'from-[#ac2c19] via-[#c73b24] to-[#73190c]', text: 'text-[#ffdcd7]', accent: '#ffdcd7' },
    { bg: 'from-[#1e293b] via-[#334155] to-[#0f172a]', text: 'text-[#93c5fd]', accent: '#93c5fd' },
    { bg: 'from-[#855300] via-[#a16207] to-[#593800]', text: 'text-[#fef08a]', accent: '#fef08a' },
    { bg: 'from-[#312e81] via-[#4338ca] to-[#1e1b4b]', text: 'text-[#c7d2fe]', accent: '#c7d2fe' },
    { bg: 'from-[#064e3b] via-[#047857] to-[#022c22]', text: 'text-[#a7f3d0]', accent: '#a7f3d0' }
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  return themes[Math.abs(hash) % themes.length];
}

export default function BookCover({ src, title = 'Sách HUKI', author = 'HUKI EBOOK', className = '' }) {
  const [hasError, setHasError] = useState(false);
  const theme = getCoverTheme(title);

  if (hasError || !src) {
    return (
      <div
        className={`w-full h-full bg-gradient-to-br ${theme.bg} text-white p-3.5 flex flex-col justify-between select-none relative overflow-hidden ${className}`}
      >
        {/* Subtle Decorative Spine & Patterns */}
        <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 border-r border-white/10" />
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />

        {/* Top: Brand mark */}
        <div className="pl-2 flex items-center justify-between z-10">
          <span className="text-[9px] uppercase tracking-widest font-bold opacity-80 flex items-center gap-1">
            <span className="material-symbols-outlined text-[11px]">menu_book</span>
            HUKI
          </span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/90">EDITION</span>
        </div>

        {/* Center: Book Title & Author */}
        <div className="pl-2 my-auto z-10 text-center">
          <h4 className="font-editorial text-sm md:text-base font-bold leading-snug line-clamp-3 mb-1.5 drop-shadow-sm">
            {title}
          </h4>
          <p className={`text-[11px] font-medium ${theme.text} line-clamp-1 opacity-90`}>
            {author}
          </p>
        </div>

        {/* Bottom: Seal */}
        <div className="pl-2 flex items-center justify-between border-t border-white/10 pt-2 z-10">
          <span className="text-[8px] tracking-wider text-white/60">BẢN QUYỀN CHÍNH THỨC</span>
          <span className="material-symbols-outlined text-[14px] text-white/60">verified</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      onError={() => setHasError(true)}
      className={`w-full h-full object-cover ${className}`}
      loading="lazy"
    />
  );
}
