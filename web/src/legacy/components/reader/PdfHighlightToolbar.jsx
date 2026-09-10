import React from 'react';
import { useReader, HIGHLIGHT_COLORS } from '../../context/ReaderContext';

export default function PdfHighlightToolbar({ bookId, pageNum }) {
  const {
    isHighlighterActive,
    setIsHighlighterActive,
    highlighterColor,
    setHighlighterColor,
    highlighterMode,
    setHighlighterMode,
    highlighterShape,
    setHighlighterShape,
    highlights,
    clearPageHighlights
  } = useReader();

  const pageHighlights = (highlights[bookId] && highlights[bookId][pageNum]) || [];
  const hasHighlights = pageHighlights.length > 0;

  if (!isHighlighterActive) return null;

  return (
    <div className="flex items-center gap-2 bg-[#1c1f26]/95 text-white px-3 py-1.5 rounded-xl shadow-2xl border border-zinc-700/80 backdrop-blur-md text-xs select-none z-50 animate-fade-in">
      {/* Tool / Shape Selector */}
      <div className="flex items-center bg-black/40 p-0.5 rounded-lg border border-white/5">
        {/* Rectangle Highlight (Sniper / Screen-drag style) */}
        <button
          onClick={() => {
            setHighlighterMode('draw');
            setHighlighterShape('rect');
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
            highlighterMode === 'draw' && highlighterShape === 'rect'
              ? 'bg-theme-secondary text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Kéo thả hình chữ nhật thẳng tắp chuẩn chỉ (như chụp ảnh)"
        >
          <span className="material-symbols-outlined text-sm">crop_free</span>
          <span>Khung chữ nhật</span>
        </button>

        {/* Freehand Pen */}
        <button
          onClick={() => {
            setHighlighterMode('draw');
            setHighlighterShape('freehand');
          }}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
            highlighterMode === 'draw' && highlighterShape === 'freehand'
              ? 'bg-theme-secondary text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Bút vẽ tự do"
        >
          <span className="material-symbols-outlined text-sm">edit</span>
          <span>Bút vẽ</span>
        </button>

        {/* Eraser */}
        <button
          onClick={() => setHighlighterMode('eraser')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all font-medium ${
            highlighterMode === 'eraser'
              ? 'bg-theme-accent text-white shadow-sm'
              : 'text-zinc-400 hover:text-white'
          }`}
          title="Tẩy xóa nét highlight"
        >
          <span className="material-symbols-outlined text-sm">ink_eraser</span>
          <span>Tẩy</span>
        </button>
      </div>

      <div className="h-4 w-px bg-zinc-700" />

      {/* Color Palette */}
      {highlighterMode === 'draw' && (
        <div className="flex items-center gap-1.5">
          {HIGHLIGHT_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setHighlighterColor(c.color)}
              className={`w-5 h-5 rounded-full transition-transform flex items-center justify-center border ${
                highlighterColor === c.color
                  ? 'ring-2 ring-white scale-110 border-transparent shadow-md'
                  : 'border-black/30 opacity-80 hover:opacity-100 hover:scale-105'
              }`}
              style={{ backgroundColor: c.color }}
              title={c.name}
            >
              {highlighterColor === c.color && (
                <span className="material-symbols-outlined text-black font-bold text-[10px]">check</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Clear Page Highlights */}
      {hasHighlights && (
        <>
          <div className="h-4 w-px bg-zinc-700" />
          <button
            onClick={() => clearPageHighlights(bookId, pageNum)}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-red-400 hover:text-white hover:bg-red-500/20 transition-all font-medium text-[11px]"
            title="Xóa toàn bộ highlight trên trang hiện tại"
          >
            <span className="material-symbols-outlined text-xs">delete_sweep</span>
            <span>Xóa trang</span>
          </button>
        </>
      )}

      {/* Close button */}
      <div className="h-4 w-px bg-zinc-700" />
      <button
        onClick={() => setIsHighlighterActive(false)}
        className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Đóng thanh công cụ"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}
