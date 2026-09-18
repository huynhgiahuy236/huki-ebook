import React, { useEffect, useRef, useState } from 'react';
import { useReader } from '../../context/ReaderContext';

export interface PdfThumbnailListProps {
  totalPages?: number;
  bookId?: string;
}

export default function PdfThumbnailList({ totalPages = 166, bookId = 'con-duong-phia-truoc' }: PdfThumbnailListProps) {
  const {
    currentPage,
    setCurrentPage,
    showToc,
    setShowToc,
    highlights,
    bookmarks,
    toggleBookmark
  } = useReader();

  const [activeTab, setActiveTab] = useState<'pages' | 'bookmarks'>('pages');
  const activeThumbnailRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active thumbnail
  useEffect(() => {
    if (showToc && activeTab === 'pages' && activeThumbnailRef.current) {
      activeThumbnailRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentPage, showToc, activeTab]);

  if (!showToc) return null;

  const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);
  const bookHighlights = highlights[bookId] || {};
  const bookBookmarks = bookmarks.filter(b => b.bookId === bookId);

  return (
    <aside
      className="fixed md:absolute inset-y-0 left-0 w-72 sm:w-80 bg-[#18181b] border-r border-[#27272a] shadow-2xl z-50 flex flex-col text-white select-none transition-transform duration-200"
      aria-label="Mục lục & Dấu trang"
    >
      {/* Header with Title and Close Button */}
      <div className="p-4 border-b border-[#27272a] flex items-center justify-between shrink-0">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 block">
            Điều hướng sách
          </span>
          <h2 className="font-bold text-base text-white mt-0.5">
            {totalPages} trang
          </h2>
        </div>
        <button
          onClick={() => setShowToc(false)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Đóng mục lục"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Tabs: Pages vs Bookmarks */}
      <div className="flex border-b border-[#27272a] bg-[#141416] p-1 gap-1">
        <button
          onClick={() => setActiveTab('pages')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'pages'
              ? 'bg-[#27272a] text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-sm">grid_view</span>
          Trang ({totalPages})
        </button>
        <button
          onClick={() => setActiveTab('bookmarks')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
            activeTab === 'bookmarks'
              ? 'bg-[#27272a] text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <span className="material-symbols-outlined text-sm text-[#fea619]">bookmark</span>
          Dấu trang ({bookBookmarks.length})
        </button>
      </div>

      {/* Content Area */}
      {activeTab === 'pages' ? (
        /* Thumbnails Scroll List */
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          {pagesArray.map((pageNum) => {
            const isActive = currentPage === pageNum;
            const hasHighlight = bookHighlights[pageNum]?.length > 0;
            const hasBookmark = bookBookmarks.some(b => b.page === pageNum);

            return (
              <div
                key={pageNum}
                ref={isActive ? activeThumbnailRef : null}
                onClick={() => setCurrentPage(pageNum)}
                className={`group flex items-center gap-3.5 p-2.5 rounded-xl cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#262930] border-2 border-[#d97706] shadow-lg'
                    : 'bg-[#202328]/80 hover:bg-[#282c34] border border-zinc-800/80'
                }`}
              >
                {/* Mini White Page Preview Card */}
                <div className="relative w-12 h-16 bg-white rounded shadow-sm border border-gray-300 overflow-hidden flex flex-col justify-between p-1 shrink-0">
                  {/* Simulated text lines */}
                  <div className="space-y-1 opacity-50">
                    <div className="h-1 bg-blue-800 rounded w-3/4 mx-auto" />
                    <div className="h-0.5 bg-gray-500 rounded w-full" />
                    <div className="h-0.5 bg-gray-400 rounded w-5/6" />
                    <div className="h-0.5 bg-gray-400 rounded w-full" />
                    <div className="h-0.5 bg-gray-400 rounded w-4/5" />
                    <div className="h-0.5 bg-gray-400 rounded w-full" />
                  </div>

                  {/* Corner Page Number Badge */}
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-[8px] font-mono font-bold text-gray-700 bg-gray-200 px-1 py-0.2 rounded">
                      {pageNum}
                    </span>
                    {hasHighlight && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#fea619]" title="Có nét highlight" />
                    )}
                  </div>
                </div>

                {/* Text Label: "Trang 1", "Trang 2", "Trang 3"... */}
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <span className={`text-sm font-semibold ${isActive ? 'text-white font-bold' : 'text-zinc-200'}`}>
                    Trang {pageNum}
                  </span>

                  {hasBookmark && (
                    <span className="material-symbols-outlined text-sm text-[#fea619]">bookmark</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Bookmarks Dedicated List */
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {bookBookmarks.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-zinc-400">
              <span className="material-symbols-outlined text-3xl mb-2 opacity-50">bookmark_border</span>
              <p className="text-xs">Chưa có dấu trang nào cho cuốn sách này.</p>
              <p className="text-[11px] text-zinc-400 mt-1">Bấm biểu tượng Bookmark trên thanh điều khiển để lưu vị trí đọc.</p>
            </div>
          ) : (
            bookBookmarks.map((bm) => (
              <div
                key={bm.id}
                className="group p-3 rounded-xl bg-[#202328]/80 hover:bg-[#282c34] border border-zinc-800/80 transition-all flex items-start justify-between gap-2"
              >
                <div
                  onClick={() => {
                    setCurrentPage(bm.page);
                  }}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#fea619]/20 text-[#fea619] font-mono text-xs font-bold">
                      Trang {bm.page}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {new Date(bm.timestamp).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-200 mt-1.5 line-clamp-2">
                    {bm.note || `Dấu trang tại Trang ${bm.page}`}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(bookId, bm.page);
                  }}
                  className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                  title="Xóa dấu trang"
                >
                  <span className="material-symbols-outlined text-base">delete</span>
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </aside>
  );
}
