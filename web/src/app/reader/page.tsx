'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useReader } from '@/ui/context/ReaderContext';
import { booksData } from '@/ui/data/mockData';
import PdfReaderHeader from '@/ui/components/reader/PdfReaderHeader';
import PdfReaderFooter from '@/ui/components/reader/PdfReaderFooter';
import PdfThumbnailList from '@/ui/components/reader/PdfThumbnailList';
import PdfCanvasViewer from '@/ui/components/reader/PdfCanvasViewer';
import PdfHighlightToolbar from '@/ui/components/reader/PdfHighlightToolbar';
import ReaderSettingsPanel from '@/ui/components/reader/ReaderSettingsPanel';
import DRMGuard from '@/ui/components/reader/DRMGuard';

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
    isHighlighterActive,
  } = useReader();

  const [accessStatus, setAccessStatus] = useState<'LOADING' | 'ALLOWED' | 'REVOKED' | 'UNAUTHORIZED'>('ALLOWED');
  const [accessMessage, setAccessMessage] = useState<string>('');

  const currentBook = useMemo(() => {
    return booksData.find(b => b.id === targetBookId) || booksData[0];
  }, [targetBookId]);

  useEffect(() => {
    setActiveBookId(currentBook.id);
    setTotalPages(currentBook.pages || 166);

    // Check if query or storage indicates revoked state for demo/integration
    const isRevoked = searchParams.get('revoked') === 'true';
    if (isRevoked) {
      setAccessStatus('REVOKED');
      setAccessMessage('Quyền truy cập sách này đã bị thu hồi do đơn hàng đã được hoàn tiền.');
      return;
    }

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

  // Handle Access Revoked state (Task 50 / POL-04 EC-002)
  if (accessStatus === 'REVOKED') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#121212] text-white p-6 text-center">
        <div className="max-w-md w-full bg-[#1e1e1e] border border-red-500/30 rounded-3xl p-8 shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-4xl">block</span>
          </div>
          <h2 className="font-editorial text-2xl font-bold text-white">Quyền Đọc Sách Đã Bị Thu Hồi</h2>
          <p className="text-sm text-gray-400 leading-relaxed">
            {accessMessage || 'Bản quyền số của tài khoản cho cuốn sách này đã bị thu hồi do đơn hàng đã hoàn tiền hoặc hết hạn quyền truy cập.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/library"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">auto_stories</span>
              Về Tủ Sách
            </Link>
            <Link
              href="/store"
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md"
            >
              <span className="material-symbols-outlined text-sm">shopping_bag</span>
              Khám Phá Sách Khác
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DRMGuard bookTitle={currentBook.title}>
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

        {/* Typography & Appearance Settings Drawer (Task 52) */}
        <ReaderSettingsPanel />
      </div>
    </DRMGuard>
  );
}

export default function ReaderPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-[#121212] text-white">Đang tải trình đọc sách...</div>}>
      <ReaderContent />
    </Suspense>
  );
}
