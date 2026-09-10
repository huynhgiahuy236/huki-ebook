import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ReaderContext = createContext();

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', name: 'Vàng Dạ Quang', color: '#fef08a', bgClass: 'bg-yellow-200' },
  { id: 'green', name: 'Xanh Lá Non', color: '#86efac', bgClass: 'bg-green-300' },
  { id: 'blue', name: 'Xanh Lam Dịu', color: '#7dd3fc', bgClass: 'bg-sky-300' },
  { id: 'pink', name: 'Hồng Pastel', color: '#f472b6', bgClass: 'bg-pink-400' },
  { id: 'orange', name: 'Cam Nhạt', color: '#fb923c', bgClass: 'bg-orange-400' },
  { id: 'purple', name: 'Tím Lavender', color: '#c084fc', bgClass: 'bg-purple-400' }
];

export const ReaderProvider = ({ children }) => {
  // Theme & Appearance
  const [theme, setTheme] = useState(() => localStorage.getItem('huki_reader_theme') || 'dark');
  const [fontSize, setFontSize] = useState(() => parseInt(localStorage.getItem('huki_reader_font_size') || '18', 10));
  
  // PDF Navigation State
  const [activeBookId, setActiveBookId] = useState('con-duong-phia-truoc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(166);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState('single'); // 'single' | 'spread' (double)
  const [fitMode, setFitMode] = useState('fit-width'); // 'fit-width' | 'fit-page' | 'custom'
  const [showToc, setShowToc] = useState(false);
  const [isSavedProgress, setIsSavedProgress] = useState(true);

  // EPUB / Chapter fallback state
  const [currentChapter, setCurrentChapter] = useState(1);
  const [readingProgress, setReadingProgress] = useState(0);

  // Highlighter Tool State
  const [isHighlighterActive, setIsHighlighterActive] = useState(false);
  const [highlighterColor, setHighlighterColor] = useState('#fef08a');
  const [highlighterSize, setHighlighterSize] = useState(20);
  const [highlighterMode, setHighlighterMode] = useState('draw'); // 'draw' | 'eraser'
  const [highlighterShape, setHighlighterShape] = useState('rect'); // 'rect' (kéo hình chữ nhật thẳng tắp) | 'freehand'
  
  // Highlights storage mapped by [bookId]: { [pageNumber]: [ strokes ] }
  const [highlights, setHighlights] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('huki_reader_highlights') || '{}');
    } catch {
      return {};
    }
  });

  // Bookmarks storage: [ { bookId, page, title, timestamp } ]
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('huki_reader_bookmarks') || '[]');
    } catch {
      return [];
    }
  });

  // Sync theme
  useEffect(() => {
    localStorage.setItem('huki_reader_theme', theme);
  }, [theme]);

  // Sync font size
  useEffect(() => {
    localStorage.setItem('huki_reader_font_size', fontSize);
  }, [fontSize]);

  // Sync highlights
  useEffect(() => {
    try {
      localStorage.setItem('huki_reader_highlights', JSON.stringify(highlights));
    } catch (e) {
      console.warn('Could not save highlights to localStorage:', e);
    }
  }, [highlights]);

  // Sync bookmarks
  useEffect(() => {
    try {
      localStorage.setItem('huki_reader_bookmarks', JSON.stringify(bookmarks));
    } catch (e) {
      console.warn('Could not save bookmarks to localStorage:', e);
    }
  }, [bookmarks]);

  // Auto-save page progress for active book
  useEffect(() => {
    if (!activeBookId) return;
    try {
      const progressKey = `huki_progress_${activeBookId}`;
      localStorage.setItem(progressKey, JSON.stringify({
        page: currentPage,
        totalPages,
        updatedAt: new Date().toISOString()
      }));
      setIsSavedProgress(true);
      const timer = setTimeout(() => setIsSavedProgress(true), 300);
      return () => clearTimeout(timer);
    } catch (err) {
      console.error('Error saving progress:', err);
    }
  }, [activeBookId, currentPage, totalPages]);

  // Add stroke highlight
  const addHighlightStroke = useCallback((bookId, pageNum, stroke) => {
    setHighlights(prev => {
      const bookHighlights = prev[bookId] || {};
      const pageStrokes = bookHighlights[pageNum] || [];
      return {
        ...prev,
        [bookId]: {
          ...bookHighlights,
          [pageNum]: [...pageStrokes, stroke]
        }
      };
    });
  }, []);

  // Remove single highlight stroke
  const removeHighlightStroke = useCallback((bookId, pageNum, strokeId) => {
    setHighlights(prev => {
      const bookHighlights = prev[bookId] || {};
      const pageStrokes = bookHighlights[pageNum] || [];
      return {
        ...prev,
        [bookId]: {
          ...bookHighlights,
          [pageNum]: pageStrokes.filter(s => s.id !== strokeId)
        }
      };
    });
  }, []);

  // Clear all highlights on a specific page
  const clearPageHighlights = useCallback((bookId, pageNum) => {
    setHighlights(prev => {
      const bookHighlights = prev[bookId] || {};
      const updated = { ...bookHighlights };
      delete updated[pageNum];
      return {
        ...prev,
        [bookId]: updated
      };
    });
  }, []);

  // Toggle bookmark for current page
  const toggleBookmark = useCallback((bookId, pageNum, note = '') => {
    setBookmarks(prev => {
      const exists = prev.some(b => b.bookId === bookId && b.page === pageNum);
      if (exists) {
        return prev.filter(b => !(b.bookId === bookId && b.page === pageNum));
      } else {
        return [
          ...prev,
          {
            id: `bm_${Date.now()}`,
            bookId,
            page: pageNum,
            note: note || `Dấu trang tại Trang ${pageNum}`,
            timestamp: new Date().toISOString()
          }
        ];
      }
    });
  }, []);

  const isCurrentPageBookmarked = bookmarks.some(
    b => b.bookId === activeBookId && b.page === currentPage
  );

  const changeFontSize = (delta) => {
    setFontSize(prev => Math.max(14, Math.min(28, prev + delta)));
  };

  const changeZoom = (delta) => {
    setZoom(prev => Math.max(50, Math.min(300, prev + delta)));
  };

  return (
    <ReaderContext.Provider value={{
      theme,
      setTheme,
      fontSize,
      changeFontSize,
      activeBookId,
      setActiveBookId,
      currentPage,
      setCurrentPage,
      totalPages,
      setTotalPages,
      zoom,
      setZoom,
      changeZoom,
      viewMode,
      setViewMode,
      fitMode,
      setFitMode,
      showToc,
      setShowToc,
      isSavedProgress,
      
      // Highlighter
      isHighlighterActive,
      setIsHighlighterActive,
      highlighterColor,
      setHighlighterColor,
      highlighterSize,
      setHighlighterSize,
      highlighterMode,
      setHighlighterMode,
      highlighterShape,
      setHighlighterShape,
      highlights,
      addHighlightStroke,
      removeHighlightStroke,
      clearPageHighlights,

      // Bookmarks
      bookmarks,
      toggleBookmark,
      isCurrentPageBookmarked,

      // EPUB / Chapter compatibility
      currentChapter,
      setCurrentChapter,
      readingProgress,
      setReadingProgress
    }}>
      {children}
    </ReaderContext.Provider>
  );
};

export const useReader = () => useContext(ReaderContext);
