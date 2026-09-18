'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export const HIGHLIGHT_COLORS = [
  { id: 'yellow', name: 'Vàng Dạ Quang', color: '#fef08a', bgClass: 'bg-yellow-200' },
  { id: 'green', name: 'Xanh Lá Non', color: '#86efac', bgClass: 'bg-green-300' },
  { id: 'blue', name: 'Xanh Lam Dịu', color: '#7dd3fc', bgClass: 'bg-sky-300' },
  { id: 'pink', name: 'Hồng Pastel', color: '#f472b6', bgClass: 'bg-pink-400' },
  { id: 'orange', name: 'Cam Nhạt', color: '#fb923c', bgClass: 'bg-orange-400' },
  { id: 'purple', name: 'Tím Lavender', color: '#c084fc', bgClass: 'bg-purple-400' }
];

export const FONT_FAMILIES = [
  { id: 'literata', name: 'Literata (Văn học cổ điển)', value: 'Literata, Georgia, serif' },
  { id: 'merriweather', name: 'Merriweather (Trang nhã)', value: 'Merriweather, serif' },
  { id: 'inter', name: 'Inter (Không chân hiện đại)', value: 'Inter, system-ui, sans-serif' },
  { id: 'roboto', name: 'Roboto (Dễ đọc)', value: 'Roboto, sans-serif' },
  { id: 'playfair', name: 'Playfair Display (Tiêu đề nghệ thuật)', value: '"Playfair Display", serif' },
  { id: 'source-code', name: 'Source Code Pro (Kỹ thuật)', value: '"Source Code Pro", monospace' },
];

export interface Bookmark {
  id: string;
  bookId: string;
  page: number;
  note: string;
  timestamp: string;
}

export interface ReaderContextType {
  theme: string;
  setTheme: (theme: string) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  changeFontSize: (delta: number) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  lineHeight: number;
  setLineHeight: (lh: number) => void;
  margin: 'compact' | 'normal' | 'wide';
  setMargin: (m: 'compact' | 'normal' | 'wide') => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (open: boolean) => void;
  activeBookId: string;
  setActiveBookId: (id: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  setTotalPages: (total: number) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  changeZoom: (delta: number) => void;
  viewMode: 'single' | 'spread';
  setViewMode: (mode: 'single' | 'spread') => void;
  fitMode: 'fit-width' | 'fit-page' | 'custom';
  setFitMode: (mode: 'fit-width' | 'fit-page' | 'custom') => void;
  showToc: boolean;
  setShowToc: (show: boolean) => void;
  isSavedProgress: boolean;

  // Highlighter
  isHighlighterActive: boolean;
  setIsHighlighterActive: (active: boolean) => void;
  highlighterColor: string;
  setHighlighterColor: (color: string) => void;
  highlighterSize: number;
  setHighlighterSize: (size: number) => void;
  highlighterMode: 'draw' | 'eraser';
  setHighlighterMode: (mode: 'draw' | 'eraser') => void;
  highlighterShape: 'rect' | 'freehand';
  setHighlighterShape: (shape: 'rect' | 'freehand') => void;
  highlights: Record<string, Record<number, any[]>>;
  addHighlightStroke: (bookId: string, pageNum: number, stroke: any) => void;
  removeHighlightStroke: (bookId: string, pageNum: number, strokeId: string) => void;
  clearPageHighlights: (bookId: string, pageNum: number) => void;

  // Bookmarks
  bookmarks: Bookmark[];
  toggleBookmark: (bookId: string, pageNum: number, note?: string) => void;
  isCurrentPageBookmarked: boolean;

  // EPUB / Chapter compatibility
  currentChapter: number;
  setCurrentChapter: (ch: number) => void;
  readingProgress: number;
  setReadingProgress: (prog: number) => void;
}

const ReaderContext = createContext<ReaderContextType | null>(null);

export const ReaderProvider = ({ children }: { children: ReactNode }) => {
  // Theme & Appearance (Task 52 Typography & Reader Customization)
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(18);
  const [fontFamily, setFontFamily] = useState('Literata, Georgia, serif');
  const [lineHeight, setLineHeight] = useState(1.6);
  const [margin, setMargin] = useState<'compact' | 'normal' | 'wide'>('normal');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // PDF Navigation State
  const [activeBookId, setActiveBookId] = useState('con-duong-phia-truoc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(166);
  const [zoom, setZoom] = useState(100);
  const [viewMode, setViewMode] = useState<'single' | 'spread'>('single');
  const [fitMode, setFitMode] = useState<'fit-width' | 'fit-page' | 'custom'>('fit-width');
  const [showToc, setShowToc] = useState(false);
  const [isSavedProgress, setIsSavedProgress] = useState(true);

  // EPUB / Chapter fallback state
  const [currentChapter, setCurrentChapter] = useState(1);
  const [readingProgress, setReadingProgress] = useState(0);

  // Highlighter Tool State
  const [isHighlighterActive, setIsHighlighterActive] = useState(false);
  const [highlighterColor, setHighlighterColor] = useState('#fef08a');
  const [highlighterSize, setHighlighterSize] = useState(20);
  const [highlighterMode, setHighlighterMode] = useState<'draw' | 'eraser'>('draw');
  const [highlighterShape, setHighlighterShape] = useState<'rect' | 'freehand'>('rect');
  
  const [highlights, setHighlights] = useState<Record<string, Record<number, any[]>>>({});
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  // Initial client load
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('huki_reader_theme');
      if (savedTheme) setTheme(savedTheme);
      const savedFont = localStorage.getItem('huki_reader_font_size');
      if (savedFont) setFontSize(parseInt(savedFont, 10));
      const savedFamily = localStorage.getItem('huki_reader_font_family');
      if (savedFamily) setFontFamily(savedFamily);
      const savedLh = localStorage.getItem('huki_reader_line_height');
      if (savedLh) setLineHeight(parseFloat(savedLh));
      const savedMargin = localStorage.getItem('huki_reader_margin') as 'compact' | 'normal' | 'wide' | null;
      if (savedMargin) setMargin(savedMargin);
      const savedHighlights = localStorage.getItem('huki_reader_highlights');
      if (savedHighlights) setHighlights(JSON.parse(savedHighlights));
      const savedBookmarks = localStorage.getItem('huki_reader_bookmarks');
      if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
    } catch {
      // ignore
    }
  }, []);

  // Sync theme
  useEffect(() => {
    try {
      localStorage.setItem('huki_reader_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Sync font size
  useEffect(() => {
    try {
      localStorage.setItem('huki_reader_font_size', String(fontSize));
    } catch {
      // ignore
    }
  }, [fontSize]);

  // Sync font family
  useEffect(() => {
    try {
      localStorage.setItem('huki_reader_font_family', fontFamily);
    } catch {
      // ignore
    }
  }, [fontFamily]);

  // Sync line height
  useEffect(() => {
    try {
      localStorage.setItem('huki_reader_line_height', String(lineHeight));
    } catch {
      // ignore
    }
  }, [lineHeight]);

  // Sync margin
  useEffect(() => {
    try {
      localStorage.setItem('huki_reader_margin', margin);
    } catch {
      // ignore
    }
  }, [margin]);


  // Fetch remote bookmarks and progress on activeBookId change
  useEffect(() => {
    if (!activeBookId) return;

    // 1. Fetch bookmarks
    const loadRemoteBookmarks = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('huki_token') || localStorage.getItem('token') : null;
        if (token) {
          const res = await fetch(`/api/reader/bookmarks/${activeBookId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const json = await res.json();
            if (Array.isArray(json.data)) {
              const remoteBms: Bookmark[] = json.data.map((b: any) => ({
                id: b.id,
                bookId: activeBookId,
                page: b.pageNumber,
                note: b.note || `Dấu trang tại Trang ${b.pageNumber}`,
                timestamp: b.createdAt || new Date().toISOString()
              }));
              setBookmarks(prev => {
                const others = prev.filter(b => b.bookId !== activeBookId);
                return [...others, ...remoteBms];
              });
            }
          }
        }
      } catch (e) {
        console.warn('Could not load remote bookmarks:', e);
      }
    };

    loadRemoteBookmarks();
  }, [activeBookId]);

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

  // Auto-save page progress for active book (Debounced)
  useEffect(() => {
    if (!activeBookId || currentPage < 1) return;
    setIsSavedProgress(false);

    try {
      const progressKey = `huki_progress_${activeBookId}`;
      const pct = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;
      localStorage.setItem(progressKey, JSON.stringify({
        page: currentPage,
        totalPages,
        percentage: pct,
        updatedAt: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Error saving progress locally:', err);
    }

    const timer = setTimeout(async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('huki_token') || localStorage.getItem('token') : null;
        if (token) {
          const pct = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;
          await fetch('/api/reader/progress', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              bookId: activeBookId,
              currentPage,
              percentage: pct
            })
          });
        }
        setIsSavedProgress(true);
      } catch (e) {
        console.warn('Could not sync progress to server:', e);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activeBookId, currentPage, totalPages]);

  // Add stroke highlight
  const addHighlightStroke = useCallback((bookId: string, pageNum: number, stroke: any) => {
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
  const removeHighlightStroke = useCallback((bookId: string, pageNum: number, strokeId: string) => {
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
  const clearPageHighlights = useCallback((bookId: string, pageNum: number) => {
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

  // Toggle bookmark for current page with server sync
  const toggleBookmark = useCallback((bookId: string, pageNum: number, note = '') => {
    setBookmarks(prev => {
      const existing = prev.find(b => b.bookId === bookId && b.page === pageNum);
      if (existing) {
        // Delete
        const updated = prev.filter(b => !(b.bookId === bookId && b.page === pageNum));
        const token = typeof window !== 'undefined' ? localStorage.getItem('huki_token') || localStorage.getItem('token') : null;
        if (token && !existing.id.startsWith('bm_')) {
          fetch(`/api/reader/bookmarks/${existing.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          }).catch(() => {});
        }
        return updated;
      } else {
        // Add
        const tempId = `bm_${Date.now()}`;
        const newBm: Bookmark = {
          id: tempId,
          bookId,
          page: pageNum,
          note: note || `Dấu trang tại Trang ${pageNum}`,
          timestamp: new Date().toISOString()
        };

        const token = typeof window !== 'undefined' ? localStorage.getItem('huki_token') || localStorage.getItem('token') : null;
        if (token) {
          fetch('/api/reader/bookmarks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              bookId,
              pageNumber: pageNum,
              note: newBm.note
            })
          })
            .then(res => res.json())
            .then(json => {
              if (json.data?.id) {
                setBookmarks(current =>
                  current.map(b => (b.id === tempId ? { ...b, id: json.data.id } : b))
                );
              }
            })
            .catch(() => {});
        }

        return [...prev, newBm];
      }
    });
  }, []);

  const isCurrentPageBookmarked = bookmarks.some(
    b => b.bookId === activeBookId && b.page === currentPage
  );

  const changeFontSize = (delta: number) => {
    setFontSize(prev => Math.max(14, Math.min(28, prev + delta)));
  };

  const changeZoom = (delta: number) => {
    setZoom(prev => Math.max(50, Math.min(300, prev + delta)));
  };

  return (
    <ReaderContext.Provider value={{
      theme,
      setTheme,
      fontSize,
      setFontSize,
      changeFontSize,
      fontFamily,
      setFontFamily,
      lineHeight,
      setLineHeight,
      margin,
      setMargin,
      isSettingsOpen,
      setIsSettingsOpen,
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

export const useReader = () => {
  const context = useContext(ReaderContext);
  if (!context) {
    return {
      theme: 'dark',
      setTheme: () => {},
      fontSize: 18,
      setFontSize: () => {},
      changeFontSize: () => {},
      fontFamily: 'Literata, Georgia, serif',
      setFontFamily: () => {},
      lineHeight: 1.6,
      setLineHeight: () => {},
      margin: 'normal' as const,
      setMargin: () => {},
      isSettingsOpen: false,
      setIsSettingsOpen: () => {},
      activeBookId: '',
      setActiveBookId: () => {},
      currentPage: 1,
      setCurrentPage: () => {},
      totalPages: 1,
      setTotalPages: () => {},
      zoom: 100,
      setZoom: () => {},
      changeZoom: () => {},
      viewMode: 'single' as const,
      setViewMode: () => {},
      fitMode: 'fit-width' as const,
      setFitMode: () => {},
      showToc: false,
      setShowToc: () => {},
      isSavedProgress: false,
      isHighlighterActive: false,
      setIsHighlighterActive: () => {},
      highlighterColor: '#fef08a',
      setHighlighterColor: () => {},
      highlighterSize: 20,
      setHighlighterSize: () => {},
      highlighterMode: 'draw' as const,
      setHighlighterMode: () => {},
      highlighterShape: 'rect' as const,
      setHighlighterShape: () => {},
      highlights: {},
      addHighlightStroke: () => {},
      removeHighlightStroke: () => {},
      clearPageHighlights: () => {},
      bookmarks: [],
      toggleBookmark: () => {},
      isCurrentPageBookmarked: false,
      currentChapter: 1,
      setCurrentChapter: () => {},
      readingProgress: 0,
      setReadingProgress: () => {}
    };
  }
  return context;
};
