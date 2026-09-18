'use client';

import React, { useEffect, useMemo, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useReader } from '@/ui/context/ReaderContext';
import { booksData } from '@/ui/data/mockData';
import PdfReaderHeader from '@/ui/components/reader/PdfReaderHeader';
import PdfReaderFooter from '@/ui/components/reader/PdfReaderFooter';
import PdfThumbnailList from '@/ui/components/reader/PdfThumbnailList';
import PdfCanvasViewer from '@/ui/components/reader/PdfCanvasViewer';
import PdfHighlightToolbar from '@/ui/components/reader/PdfHighlightToolbar';

function ReaderContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const paramBookId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const queryBookId = searchParams.get('book');
  const targetBookId = paramBookId || queryBookId || 'con-duong-phia-truoc';

  const {
    activeBookId,
    setActiveBookId,
    currentPage,
    setCurrentPage,
    setTotalPages,
    isHighlighterActive
  } = useReader();

  const currentBook = useMemo(() => {
    return booksData.find(b => b.id === targetBookId) || booksData[0];
  }, [targetBookId]);

  useEffect(() => {
    setActiveBookId(currentBook.id);
    setTotalPages(currentBook.pages || 166);

    const queryPage = searchParams.get('page');
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
  }, [currentBook, searchParams, setActiveBookId, setTotalPages, setCurrentPage]);

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

export default function ReaderPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-[#121212] text-white">Đang tải trình đọc sách...</div>}>
      <ReaderContent />
    </Suspense>
  );
}
