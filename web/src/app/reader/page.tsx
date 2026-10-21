'use client';

import React, { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useReader } from '@/ui/context/ReaderContext';
import { booksData } from '@/ui/data/mockData';
import { catalogApi, type BookData } from '@/ui/api/catalogApi';
import { adminDrmApi } from '@/ui/api/adminDrmApi';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
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

  const [realBook, setRealBook] = useState<BookData | null>(null);
  const [accessStatus, setAccessStatus] = useState<'LOADING' | 'ALLOWED' | 'REVOKED' | 'UNAUTHORIZED'>('ALLOWED');
  const [accessMessage, setAccessMessage] = useState<string>('');
  const [drmFingerprint, setDrmFingerprint] = useState<string>('');

  // Sách mock fallback nếu không tìm thấy sách thật trong DB
  const fallbackMockBook = useMemo(() => {
    return booksData.find(b => b.id === targetBookId) || booksData[0];
  }, [targetBookId]);

  // 1. Tải thông tin sách thật từ CSDL Commerce Service
  useEffect(() => {
    let isMounted = true;

    async function loadBookData() {
      try {
        let res = await catalogApi.getBookById(targetBookId);
        if (!res.data && res.error) {
          // Thử tìm theo slug nếu targetBookId là slug
          res = await catalogApi.getBookBySlug(targetBookId);
        }

        if (isMounted && res.data) {
          setRealBook(res.data);
        }
      } catch (err) {
        console.warn('Không thể nạp sách thật từ CSDL, fallback sang mock:', err);
      }
    }

    loadBookData();
    return () => {
      isMounted = false;
    };
  }, [targetBookId]);

  // Thông tin tổng hợp của cuốn sách (ưu tiên sách thật từ DB)
  const currentTitle = realBook?.title || fallbackMockBook.title;
  const currentAuthor = realBook?.author?.name || fallbackMockBook.author || 'Tác giả HUKI';
  const effectiveBookId = realBook?.id || fallbackMockBook.id;
  const currentPdfUrl = fallbackMockBook.pdfUrl || '/books/Con_duong_phia_truoc__Bill_Gates.pdf';

  // 2. Kích hoạt phiên đọc DRM, Heartbeat 30s & Cưỡng Chế Thu Hồi Bản Quyền Thời Gian Thực
  useEffect(() => {
    setActiveBookId(effectiveBookId);
    setTotalPages(fallbackMockBook.pages || 166);

    // Tạo deviceId ngẫu nhiên bền vững trong localStorage
    let deviceId = '';
    if (typeof window !== 'undefined') {
      deviceId = localStorage.getItem('huki_drm_device_id') || '';
      if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('huki_drm_device_id', deviceId);
      }
    }

    let isTerminated = false;

    // Gửi tín hiệu kích hoạt phiên đọc tới DRM Vault
    const sendJoinSession = async () => {
      try {
        const res = await adminDrmApi.startSession(effectiveBookId, {
          userId: 'reader_user',
          deviceId: deviceId || 'web_browser_01',
          deviceName: typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac') ? 'MacBook Pro Reader' : 'Windows PC Reader',
        });

        if (res.data?.isRevoked) {
          isTerminated = true;
          setAccessStatus('REVOKED');
          setAccessMessage(res.data.message || 'Quyền đọc tác phẩm đã bị thu hồi bởi Ban Quản Trị.');
          return;
        }

        if (res.data?.keyFingerprint) {
          setDrmFingerprint(res.data.keyFingerprint);
        }

        // Báo cho Admin DRM Vault qua bus realtime
        realtimeSyncBus.publish('DRM_READER_JOINED', {
          bookId: effectiveBookId,
          title: currentTitle,
          deviceId,
        });
      } catch (err) {
        console.warn('DRM session start failed:', err);
      }
    };

    sendJoinSession();

    // Heartbeat định kỳ mỗi 30 giây theo đặc tả RT-05
    const heartbeatTimer = setInterval(async () => {
      if (isTerminated) return;
      try {
        const res = await adminDrmApi.startSession(effectiveBookId, {
          userId: 'reader_user',
          deviceId: deviceId || 'web_browser_01',
        });

        if (res.data?.isRevoked) {
          isTerminated = true;
          clearInterval(heartbeatTimer);
          setAccessStatus('REVOKED');
          setAccessMessage(res.data.message || 'Quyền đọc tác phẩm đã bị thu hồi do phát hiện vi phạm bản quyền.');
        }
      } catch (e) {
        console.warn('DRM heartbeat error:', e);
      }
    }, 30000);

    // Lắng nghe lệnh Thu Hồi Bản Quyền từ xa (Instant Kill-Switch) từ Admin DRM Vault
    const unsubscribeBus = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'DRM_LICENSE_REVOKED') {
        const payload = msg.payload as any;
        const matchesBook = !payload?.bookId || payload.bookId === effectiveBookId;
        const matchesLicense = payload?.licenseId === effectiveBookId;
        if (matchesBook || matchesLicense || payload?.all) {
          isTerminated = true;
          clearInterval(heartbeatTimer);
          setAccessStatus('REVOKED');
          setAccessMessage(
            payload?.reason || 'Quyền đọc tác phẩm này đã bị thu hồi tức thì bởi Ban Quản Trị do phát hiện vi phạm bản quyền hoặc đọc lậu (POL-04).'
          );
        }
      } else if (msg.type === 'DRM_LICENSE_RESTORED') {
        const payload = msg.payload as any;
        if (!payload?.bookId || payload.bookId === effectiveBookId) {
          isTerminated = false;
          setAccessStatus('ALLOWED');
          setAccessMessage('');
        }
      }
    });

    // Xử lý khi người dùng đóng tab hoặc chuyển trang (pagehide / beforeunload)
    const handleLeave = () => {
      realtimeSyncBus.publish('DRM_READER_LEFT', {
        bookId: effectiveBookId,
        deviceId,
      });

      const leaveUrl = `/api/v1/admin/drm/licenses/${encodeURIComponent(effectiveBookId)}/session-leave`;
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        try {
          navigator.sendBeacon(leaveUrl, '');
        } catch {
          fetch(leaveUrl, { method: 'POST', keepalive: true }).catch(() => {});
        }
      } else {
        fetch(leaveUrl, { method: 'POST', keepalive: true }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleLeave);
    window.addEventListener('pagehide', handleLeave);

    // Giải phóng phiên đọc khi component unmount
    return () => {
      clearInterval(heartbeatTimer);
      unsubscribeBus();
      window.removeEventListener('beforeunload', handleLeave);
      window.removeEventListener('pagehide', handleLeave);
      handleLeave();
    };
  }, [effectiveBookId, currentTitle, setActiveBookId, setTotalPages, fallbackMockBook.pages]);

  // 3. Tiến độ đọc sách & khôi phục trang
  useEffect(() => {
    // Check if query or storage indicates revoked state
    const isRevoked = searchParams.get('revoked') === 'true';
    if (isRevoked) {
      setAccessStatus('REVOKED');
      setAccessMessage('Quyền truy cập sách này đã bị thu hồi do đơn hàng đã được hoàn tiền.');
      return;
    }

    const queryPage = searchParams.get('page');
    if (queryPage) {
      const p = parseInt(queryPage, 10);
      if (!isNaN(p) && p >= 1 && p <= (fallbackMockBook.pages || 166)) {
        setCurrentPage(p);
        return;
      }
    }

    try {
      const savedProgress = localStorage.getItem(`huki_progress_${effectiveBookId}`);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        if (parsed.page && parsed.page >= 1 && parsed.page <= (fallbackMockBook.pages || 166)) {
          setCurrentPage(parsed.page);
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc tiến độ:', e);
    }
  }, [effectiveBookId, searchParams, setCurrentPage, fallbackMockBook.pages]);

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
    <DRMGuard bookTitle={currentTitle}>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-[#121212] select-none text-white">
        {/* Top Header Navigation */}
        <PdfReaderHeader
          bookTitle={currentTitle}
          bookAuthor={currentAuthor}
          bookId={effectiveBookId}
          pdfUrl={currentPdfUrl}
        />

        {/* Main Reading Viewport & Drawer */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Drawer: 166 Trang thu nhỏ */}
          <PdfThumbnailList
            totalPages={fallbackMockBook.pages || 166}
            bookId={effectiveBookId}
          />

          {/* Floating Highlighter Toolbar */}
          {isHighlighterActive && (
            <div className="absolute top-3 right-6 z-40 animate-fade-in">
              <PdfHighlightToolbar
                bookId={effectiveBookId}
                pageNum={currentPage}
              />
            </div>
          )}

          {/* Center PDF Canvas Viewport */}
          <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-[#121212]">
            <PdfCanvasViewer
              pdfUrl={currentPdfUrl}
              bookTitle={currentTitle}
              bookId={effectiveBookId}
            />
          </main>
        </div>

        {/* Bottom Status & Shortcut Bar */}
        <PdfReaderFooter />

        {/* Typography & Appearance Settings Drawer */}
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
