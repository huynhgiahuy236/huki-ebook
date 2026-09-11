import React, { useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useReader } from '../../context/ReaderContext';
import { booksData } from '../../data/mockData';
import PdfReaderHeader from '../../components/reader/PdfReaderHeader';
import PdfReaderFooter from '../../components/reader/PdfReaderFooter';
import PdfThumbnailList from '../../components/reader/PdfThumbnailList';
import PdfCanvasViewer from '../../components/reader/PdfCanvasViewer';
import PdfHighlightToolbar from '../../components/reader/PdfHighlightToolbar';

export default function ReaderPage() {
  const { id: paramBookId } = useParams();
  const location = useLocation();
  const {
    activeBookId,
    setActiveBookId,
    currentPage,
    setCurrentPage,
    setTotalPages,
    isHighlighterActive
  } = useReader();

  // Xác định sách cần đọc từ URL param hoặc query param
  const queryBookId = new URLSearchParams(location.search).get('book');
  const targetBookId = paramBookId || queryBookId || 'con-duong-phia-truoc';

  // Lấy dữ liệu sách
  const currentBook = useMemo(() => {
    return booksData.find(b => b.id === targetBookId) || booksData[0];
  }, [targetBookId]);

  // Cập nhật sách đang đọc và khôi phục tiến độ đọc từ localStorage
  useEffect(() => {
    setActiveBookId(currentBook.id);
    setTotalPages(currentBook.pages || 166);

    const queryPage = new URLSearchParams(location.search).get('page');
    if (queryPage) {
      const p = parseInt(queryPage, 10);
      if (!isNaN(p) && p >= 1 && p <= (currentBook.pages || 166)) {
        setCurrentPage(p);
        return;
      }
    }

    try {
      const savedProgress = localStorage.getItem(`huki_progress_${currentBook.id}`);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        if (parsed.page && parsed.page >= 1 && parsed.page <= (currentBook.pages || 166)) {
          setCurrentPage(parsed.page);
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc tiến độ:', e);
    }
  }, [currentBook, location.search, setActiveBookId, setTotalPages, setCurrentPage]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#121212] select-none text-white">
      {/* Top Header Navigation */}
      <PdfReaderHeader
        bookTitle={currentBook.title}
        bookAuthor={currentBook.author}
        bookId={currentBook.id}
      />

      {/* Main Reading Viewport & Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Drawer: 166 Trang thu nhỏ */}
        <PdfThumbnailList
          toc={currentBook.toc}
          totalPages={currentBook.pages || 166}
          bookId={currentBook.id}
        />

        {/* Floating Highlighter Toolbar */}
        {isHighlighterActive && (
          <div className="absolute top-3 right-6 z-40 animate-fade-in">
            <PdfHighlightToolbar
              bookId={currentBook.id}
              pageNum={currentPage}
            />
          </div>
        )}

        {/* Center PDF Canvas Viewport */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#121212]">
          <PdfCanvasViewer
            pdfUrl={currentBook.pdfUrl || '/books/Con_duong_phia_truoc__Bill_Gates.pdf'}
            bookTitle={currentBook.title}
            bookId={currentBook.id}
          />
        </main>
      </div>

      {/* Bottom Status & Shortcut Bar */}
      <PdfReaderFooter />
    </div>
  );
}
