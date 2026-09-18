import React from 'react';
import { useReader } from '../../context/ReaderContext';

export default function PdfReaderFooter() {
  const { currentPage, totalPages } = useReader();

  const percentage = Math.max(1, Math.round((currentPage / (totalPages || 166)) * 100));

  return (
    <footer className="h-10 md:h-11 bg-[#18181b] border-t border-[#27272a] px-4 md:px-6 flex items-center justify-between text-xs text-zinc-400 shrink-0 select-none z-40">
      {/* Left: Branding & Tag */}
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full bg-theme-secondary text-white flex items-center justify-center font-bold text-[9px]">
          H
        </div>
        <span className="hidden sm:inline font-medium text-zinc-300 text-xs">
          Trình đọc PDF Online HUKI Ebook
        </span>
      </div>

      {/* Center: Real-time Page Counter & Progress % */}
      <div className="flex items-center gap-3">
        <div className="font-semibold text-zinc-200 text-xs sm:text-sm font-mono">
          Trang <span className="text-emerald-400 font-bold">{currentPage}</span>/{totalPages} — <span className="text-zinc-100 font-bold">{percentage}%</span>
        </div>
      </div>

      {/* Right: Keyboard Shortcuts Hint */}
      <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400">
        <span>Phím <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">←</kbd> <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">→</kbd> để chuyển trang, <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">+/-</kbd> để phóng to</span>
      </div>
    </footer>
  );
}
