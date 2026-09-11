import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useReader } from '../../context/ReaderContext';

export default function PdfReaderHeader({ bookTitle = 'Con Đường Phía Trước', bookAuthor = 'Bill Gates', bookId = 'con-duong-phia-truoc' }) {
  const {
    currentPage,
    setCurrentPage,
    totalPages,
    zoom,
    setZoom,
    changeZoom,
    viewMode,
    setViewMode,
    showToc,
    setShowToc,
    isSavedProgress,
    isHighlighterActive,
    setIsHighlighterActive,
    highlighterColor,
    isCurrentPageBookmarked,
    toggleBookmark,
    theme,
    setTheme
  } = useReader();

  const [inputPage, setInputPage] = useState(String(currentPage));
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  const handlePageSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(inputPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
    } else {
      setInputPage(String(currentPage));
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(viewMode === 'spread' ? Math.max(1, currentPage - 2) : currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(viewMode === 'spread' ? Math.min(totalPages, currentPage + 2) : currentPage + 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.warn(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <header className="h-14 bg-[#18181b] border-b border-[#27272a] px-4 md:px-6 flex items-center justify-between z-40 shrink-0 text-white select-none">
      {/* Left Section: Back, TOC Drawer Toggle, Book Title & Author */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to={`/book/${bookId}`}
          className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
          title="Quay lại"
        >
          <span className="material-symbols-outlined text-xl">arrow_back</span>
        </Link>

        <button
          onClick={() => setShowToc(!showToc)}
          className={`p-2 rounded-lg transition-all flex items-center justify-center ${
            showToc ? 'bg-[#006953] text-white shadow-sm' : 'text-zinc-300 hover:text-white hover:bg-white/10'
          }`}
          title="Bật/Tắt Mục lục & Trang thu nhỏ"
          aria-label="Mở mục lục"
        >
          <span className="material-symbols-outlined text-xl">menu</span>
        </button>

        <div className="h-4 w-px bg-zinc-700 hidden sm:block" />

        <div className="min-w-0 max-w-[160px] sm:max-w-xs md:max-w-md truncate">
          <h1 className="font-bold text-xs sm:text-sm text-white truncate leading-tight">
            {bookTitle}
          </h1>
          <p className="text-[11px] text-zinc-400 truncate">
            {bookAuthor}
          </p>
        </div>
      </div>

      {/* Center Section: Navigation < [ 3 ] / 166 > and Status Badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Prev Page */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-colors flex items-center justify-center"
          title="Trang trước (←)"
        >
          <span className="material-symbols-outlined text-xl">chevron_left</span>
        </button>

        {/* Page Input Form */}
        <form onSubmit={handlePageSubmit} className="flex items-center gap-1.5 text-xs sm:text-sm">
          <input
            type="text"
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            onBlur={handlePageSubmit}
            className="w-11 sm:w-12 h-8 text-center rounded-lg bg-[#27272a] border border-zinc-600 text-white font-mono font-bold focus:outline-none focus:border-[#006953] focus:ring-1 focus:ring-[#006953] transition-all"
            title="Nhập số trang và nhấn Enter"
          />
          <span className="text-zinc-400 text-xs font-medium">/ {totalPages}</span>
        </form>

        {/* Next Page */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent transition-colors flex items-center justify-center"
          title="Trang tiếp (→)"
        >
          <span className="material-symbols-outlined text-xl">chevron_right</span>
        </button>

        {/* Saved Progress Badge */}
        {isSavedProgress && (
          <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006953]/20 text-[#34d399] border border-[#006953]/40 text-[11px] font-semibold">
            <span className="material-symbols-outlined text-sm text-[#34d399]">check</span>
            <span>Đã lưu tiến độ</span>
          </div>
        )}
      </div>

      {/* Right Section: Highlighter, Zoom, View Modes, Theme, Fullscreen */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Highlighter Tool Button */}
        <button
          onClick={() => setIsHighlighterActive(!isHighlighterActive)}
          className={`relative p-2 rounded-lg transition-all flex items-center justify-center ${
            isHighlighterActive
              ? 'bg-[#ea580c] text-white shadow-md'
              : 'text-zinc-300 hover:text-white hover:bg-white/10'
          }`}
          title="Bút dạ quang highlight"
        >
          <span className="material-symbols-outlined text-xl">edit</span>
          <span
            className="w-2 h-2 rounded-full absolute bottom-1 right-1 border border-black"
            style={{ backgroundColor: highlighterColor }}
          />
        </button>

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center bg-[#27272a] rounded-lg p-0.5 border border-zinc-700">
          <button
            onClick={() => changeZoom(-10)}
            disabled={zoom <= 50}
            className="p-1 rounded text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
            title="Thu nhỏ (-)"
          >
            <span className="material-symbols-outlined text-base">remove</span>
          </button>

          <button
            onClick={() => setZoom(100)}
            className="px-2 py-0.5 text-xs font-mono font-bold text-zinc-200 hover:text-white hover:bg-white/10 rounded transition-colors"
            title="Đặt lại 100%"
          >
            {zoom}%
          </button>

          <button
            onClick={() => changeZoom(10)}
            disabled={zoom >= 250}
            className="p-1 rounded text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-20 transition-colors"
            title="Phóng to (+)"
          >
            <span className="material-symbols-outlined text-base">add</span>
          </button>
        </div>

        {/* Single vs Dual Spread Page Mode */}
        <button
          onClick={() => setViewMode(viewMode === 'single' ? 'spread' : 'single')}
          className={`hidden md:flex p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors items-center justify-center ${
            viewMode === 'spread' ? 'text-[#fea619]' : ''
          }`}
          title={viewMode === 'single' ? 'Chuyển sang 2 trang song song' : 'Chuyển sang 1 trang đơn'}
        >
          <span className="material-symbols-outlined text-xl">
            {viewMode === 'single' ? 'auto_stories' : 'menu_book'}
          </span>
        </button>

        {/* Bookmark Toggle */}
        <button
          onClick={() => toggleBookmark(bookId, currentPage)}
          className={`p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center ${
            isCurrentPageBookmarked ? 'text-[#fea619]' : ''
          }`}
          title={isCurrentPageBookmarked ? 'Đã lưu dấu trang này' : 'Đánh dấu trang'}
        >
          <span className="material-symbols-outlined text-xl">
            {isCurrentPageBookmarked ? 'bookmark' : 'bookmark_border'}
          </span>
        </button>

        {/* Theme Selector */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
            title="Màu nền đọc sách"
          >
            <span className="material-symbols-outlined text-xl">visibility</span>
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#1f2227] text-white rounded-xl shadow-2xl border border-zinc-700 p-2 z-50 text-xs space-y-1">
              <span className="block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Chế độ đọc
              </span>
              <button
                onClick={() => { setTheme('dark'); setShowThemeMenu(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all ${
                  theme === 'dark' ? 'bg-[#006953] text-white font-bold' : 'hover:bg-zinc-800'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[#121212] border border-zinc-500" />
                <span>Nền Tối (Mặc định)</span>
              </button>
              <button
                onClick={() => { setTheme('sepia'); setShowThemeMenu(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all ${
                  theme === 'sepia' ? 'bg-[#006953] text-white font-bold' : 'hover:bg-zinc-800'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[#f4ecd8] border border-[#e2d6be]" />
                <span>Nền Sepia</span>
              </button>
              <button
                onClick={() => { setTheme('warm'); setShowThemeMenu(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all ${
                  theme === 'warm' ? 'bg-[#006953] text-white font-bold' : 'hover:bg-zinc-800'
                }`}
              >
                <span className="w-3 h-3 rounded-full bg-[#f8f6f1] border border-zinc-400" />
                <span>Nền Ấm (Warm)</span>
              </button>
            </div>
          )}
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-colors hidden sm:flex items-center justify-center"
          title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
        >
          <span className="material-symbols-outlined text-xl">
            {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
          </span>
        </button>
      </div>
    </header>
  );
}
