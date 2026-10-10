"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import { catalogApi, BookFormat } from '@/ui/api/catalogApi';
import SellerEditProductView from './SellerEditProductView';

export interface StudioBookItem {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  price?: number;
  format?: BookFormat;
  status: 'REJECTED' | 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  coverUrl?: string;
  submittedAt?: string;
  reviewDate?: string;
  reviewer?: string;
  issuesCount?: number;
  fixedCount?: number;
  rejectionReason?: string;
  editorNote?: string;
}

// Danh sách sách mẫu hỗ trợ trực quan ngay cả khi Seller chưa có sách trong DB
const MOCK_STUDIO_BOOKS: StudioBookItem[] = [
  {
    id: 'mock-atomic-habits',
    title: 'Atomic Habits – Thay Đổi Tí Hon, Hiệu Quả Bất Ngờ',
    author: 'James Clear',
    publisher: 'NXB Thế Giới',
    isbn: '978-604-58-9123-4',
    price: 189000,
    format: 'BOTH',
    status: 'REJECTED',
    coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
    submittedAt: '06/09/2026 · 14:32',
    reviewDate: '07/09/2026 · 08:15',
    reviewer: 'Thẩm định viên HUKI #08',
    issuesCount: 3,
    fixedCount: 1,
    rejectionReason: 'Ảnh bìa vỡ nét, mô tả quá ngắn chưa đạt chuẩn SEO và tệp Ebook PDF có mật khẩu khóa DRM.',
    editorNote: 'Ảnh bìa bị vỡ nét và viền trắng dày; phần giới thiệu sách còn quá sơ sài chưa đủ thông tin cho độc giả; tệp Ebook PDF có cài mật khẩu khiến hệ thống DRM không thể mã hóa đọc thử. Vui lòng cập nhật để HUKI tái thẩm định trong vòng 4-8 giờ làm việc.'
  },
  {
    id: 'mock-psychology-money',
    title: 'Tâm Lý Học Về Tiền (The Psychology of Money)',
    author: 'Morgan Housel',
    publisher: 'NXB Trẻ',
    isbn: '978-604-1-17482-5',
    price: 145000,
    format: 'DIGITAL',
    status: 'REJECTED',
    coverUrl: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=400&q=80',
    submittedAt: '05/09/2026 · 09:20',
    reviewDate: '06/09/2026 · 10:45',
    reviewer: 'Thẩm định viên HUKI #03',
    issuesCount: 2,
    fixedCount: 0,
    rejectionReason: 'Thiếu giấy phép ủy quyền phát hành sách số Ebook từ NXB Trẻ và định dạng mục lục EPUB bị lỗi.',
    editorNote: 'Đơn vị phát hành chưa tải lên tệp đính kèm văn bản chứng minh quyền phát hành kỹ thuật số. Đồng thời tệp EPUB tải lên bị thiếu file toc.ncx chuẩn.'
  },
  {
    id: 'mock-dac-nhan-tam',
    title: 'Đắc Nhân Tâm (Bản Tái Bản Đặc Biệt 2026)',
    author: 'Dale Carnegie',
    publisher: 'NXB Tổng Hợp TP.HCM',
    isbn: '978-604-58-4521-8',
    price: 98000,
    format: 'PHYSICAL',
    status: 'DRAFT',
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80',
    submittedAt: 'Chưa gửi',
    issuesCount: 0,
    fixedCount: 0,
    rejectionReason: ''
  },
  {
    id: 'mock-nha-gia-kim',
    title: 'Nhà Giả Kim (The Alchemist)',
    author: 'Paulo Coelho',
    publisher: 'NXB Hội Nhà Văn',
    isbn: '978-604-53-7890-1',
    price: 79000,
    format: 'BOTH',
    status: 'PUBLISHED',
    coverUrl: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?w=400&q=80',
    submittedAt: '01/09/2026 · 11:00',
    issuesCount: 0,
    fixedCount: 0,
    rejectionReason: ''
  }
];

export default function SellerCorrectionView() {
  const searchParams = useSearchParams();
  const urlBookId = searchParams.get('id') || searchParams.get('bookId');
  const urlMode = searchParams.get('mode');

  const { showToast } = useToast();
  const { user, activeBusinessId } = useAuth();

  // Danh sách sách
  const [books, setBooks] = useState<StudioBookItem[]>(MOCK_STUDIO_BOOKS);
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Cuốn sách đang chọn
  const [selectedBookId, setSelectedBookId] = useState<string>(urlBookId || MOCK_STUDIO_BOOKS[0].id);

  // Chế độ xem: 'CORRECTION' (Khắc phục lỗi), 'FULL_EDIT' (Chỉnh sửa sâu), 'OVERVIEW' (Kanban tổng quan)
  const [viewMode, setViewMode] = useState<'CORRECTION' | 'FULL_EDIT' | 'OVERVIEW'>(
    urlMode === 'edit' ? 'FULL_EDIT' : urlMode === 'overview' ? 'OVERVIEW' : 'CORRECTION'
  );

  // Trạng thái modal / flyout chọn sách
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState('');
  const [switcherTab, setSwitcherTab] = useState<'ALL' | 'REJECTED' | 'DRAFT' | 'PUBLISHED'>('ALL');

  // Form state cho chế độ khắc phục (Correction)
  const [activeSection, setActiveSection] = useState('sec-description');
  const [descText, setDescText] = useState(
    'Atomic Habits là cuốn sách bán chạy toàn cầu của James Clear về việc xây dựng thói quen tốt và từ bỏ thói quen xấu thông qua 4 định luật cốt lõi: Khiến nó rõ ràng, Khiến nó hấp dẫn, Khiến nó dễ dàng, và Khiến nó thỏa mãn. Tác giả dẫn chứng bằng các nghiên cứu tâm lý học hành vi thực tiễn và bài học từ các vận động viên đoạt huy chương Olympic, các nghệ sĩ và doanh nhân xuất chúng.'
  );
  const [isCoverFixed, setIsCoverFixed] = useState(true);
  const [isDrmFixed, setIsDrmFixed] = useState(false);
  const [isSubmittingResubmit, setIsSubmittingResubmit] = useState(false);

  // Tải danh sách sách thực tế từ Seller API
  useEffect(() => {
    let isMounted = true;
    const fetchSellerBooks = async () => {
      try {
        setLoadingBooks(true);
        const bizId = user?.business?.id || activeBusinessId;
        const res = await catalogApi.getSellerBooks({ limit: 100, ...(bizId ? { business: bizId } : {}) });

        if (res.success && res.data) {
          const rawItems = Array.isArray(res.data)
            ? res.data
            : (res.data as any)?.items || (res.data as any)?.data || [];

          if (rawItems.length > 0) {
            const mapped: StudioBookItem[] = rawItems.map((b: any) => ({
              id: b.id,
              title: b.title || 'Sách chưa đặt tên',
              author: typeof b.author === 'string' ? b.author : b.author?.name || 'Tác giả',
              publisher: typeof b.publisher === 'string' ? b.publisher : b.publisher?.name || 'NXB',
              isbn: b.isbn || 'Chưa có ISBN',
              price: b.price != null ? Number(b.price) : 0,
              format: (b.format as BookFormat) || 'PHYSICAL',
              status: (b.status as any) || 'PUBLISHED',
              coverUrl: b.coverUrl || b.coverImage || b.cover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&q=80',
              submittedAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString('vi-VN') : 'Gần đây',
              issuesCount: b.status === 'REJECTED' ? 2 : 0,
              fixedCount: 0,
              rejectionReason: b.status === 'REJECTED' ? 'Cần cập nhật lại thông số và bản quyền.' : '',
              editorNote: b.status === 'REJECTED' ? 'Vui lòng bổ sung đầy đủ thông tin kiểm duyệt theo yêu cầu.' : ''
            }));

            // Ghép sách thực tế với mock mẫu nếu thiếu sách rejected để đảm bảo trải nghiệm đầy đủ
            const hasRejected = mapped.some(m => m.status === 'REJECTED');
            const combined = hasRejected ? mapped : [...MOCK_STUDIO_BOOKS.filter(m => m.status === 'REJECTED'), ...mapped];

            if (isMounted) {
              setBooks(combined);
              if (urlBookId && combined.some(b => b.id === urlBookId)) {
                setSelectedBookId(urlBookId);
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not load real books, using mock studio books:', err);
      } finally {
        if (isMounted) setLoadingBooks(false);
      }
    };

    fetchSellerBooks();
    return () => { isMounted = false; };
  }, [user, activeBusinessId, urlBookId]);

  // Cuốn sách hiện hành
  const currentBook = useMemo(() => {
    return books.find(b => b.id === selectedBookId) || books[0] || MOCK_STUDIO_BOOKS[0];
  }, [books, selectedBookId]);

  // Thống kê sách
  const stats = useMemo(() => {
    const rejected = books.filter(b => b.status === 'REJECTED');
    const drafts = books.filter(b => b.status === 'DRAFT');
    const published = books.filter(b => b.status === 'PUBLISHED');
    return {
      rejectedCount: rejected.length,
      draftCount: drafts.length,
      publishedCount: published.length,
      total: books.length
    };
  }, [books]);

  // Danh sách sách trong switcher theo tab và tìm kiếm
  const filteredSwitcherBooks = useMemo(() => {
    return books.filter(b => {
      const matchSearch =
        b.title.toLowerCase().includes(switcherSearch.toLowerCase()) ||
        b.author.toLowerCase().includes(switcherSearch.toLowerCase()) ||
        (b.isbn && b.isbn.toLowerCase().includes(switcherSearch.toLowerCase()));

      if (!matchSearch) return false;
      if (switcherTab === 'ALL') return true;
      return b.status === switcherTab;
    });
  }, [books, switcherSearch, switcherTab]);

  // Tính số lượng từ của mô tả
  const descWordCount = useMemo(() => {
    return descText.trim().split(/\s+/).filter(Boolean).length;
  }, [descText]);
  const isDescValid = descWordCount >= 50; // Chuẩn hóa yêu cầu từ

  // Tính số vấn đề đã giải quyết
  const currentIssuesResolved = useMemo(() => {
    let resolved = 0;
    if (isCoverFixed) resolved += 1;
    if (isDescValid) resolved += 1;
    if (isDrmFixed) resolved += 1;
    return resolved;
  }, [isCoverFixed, isDescValid, isDrmFixed]);

  const canResubmit = currentIssuesResolved === 3;

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectBook = (book: StudioBookItem) => {
    setSelectedBookId(book.id);
    setIsSwitcherOpen(false);

    // Tự động chuyển mode phù hợp: Nếu bị từ chối thì vào Correction, ngược lại vào Full Edit
    if (book.status === 'REJECTED') {
      setViewMode('CORRECTION');
    } else {
      setViewMode('FULL_EDIT');
    }
    showToast?.(`Đã chuyển sang biên tập cuốn: "${book.title}"`, 'info');
  };

  const handleResubmit = async () => {
    if (!canResubmit) return;
    setIsSubmittingResubmit(true);
    try {
      await new Promise(r => setTimeout(r, 1000));
      showToast?.(`Đã gửi hồ sơ tái thẩm định cuốn "${currentBook.title}" đến Ban biên tập HUKI thành công!`, 'success');
      // Đổi trạng thái hiển thị
      setBooks(prev => prev.map(b => b.id === currentBook.id ? { ...b, status: 'DRAFT' as const, issuesCount: 0 } : b));
      setViewMode('OVERVIEW');
    } catch {
      showToast?.('Không thể gửi thẩm định lại, vui lòng thử lại sau.', 'error');
    } finally {
      setIsSubmittingResubmit(false);
    }
  };

  const navItems = [
    { id: 'sec-basic', label: '01 Thông Tin Cơ Bản', status: 'done' },
    { id: 'sec-description', label: '02 Mô Tả Sách', status: isDescValid ? 'fixed' : 'error' },
    { id: 'sec-category', label: '03 Phân Loại & Tác Giả', status: 'done' },
    { id: 'sec-media', label: '04 Ảnh Bìa & Media', status: isCoverFixed ? 'fixed' : 'error' },
    { id: 'sec-pricing', label: '05 Giá Bán Kép', status: 'done' },
    { id: 'sec-inventory', label: '06 Kho Sách Giấy', status: 'done' },
    { id: 'sec-drm', label: '07 Nội Dung Ebook DRM', status: isDrmFixed ? 'fixed' : 'error' },
    { id: 'sec-publish', label: '08 Xuất Bản', status: canResubmit ? 'ready' : 'pending' }
  ];

  return (
    <div className="w-full bg-[#F8FAFC] text-slate-800 antialiased min-h-screen py-5 pb-24 font-sans">
      <main className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 space-y-5">

        {/* 1. TOP STUDIO CONTROL BAR & QUICK BOOK SWITCHER */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Breadcrumb & Studio Title */}
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5 font-medium">
                <Link href="/seller/dashboard" className="hover:text-emerald-700 transition-colors">Kênh Người Bán</Link>
                <span>/</span>
                <Link href="/seller/products" className="hover:text-emerald-700 transition-colors">Sản Phẩm</Link>
                <span>/</span>
                <span className="text-emerald-700 font-bold">Trung Tâm Chỉnh Sửa & Khắc Phục Sách</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <span className="material-symbols-outlined text-2xl">edit_document</span>
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-serif">
                    Studio Chỉnh Sửa & Biên Tập Sách
                  </h1>
                  <p className="text-xs text-slate-500">
                    Không gian tập trung xử lý sách bị từ chối kiểm duyệt, hoàn thiện bản nháp và cập nhật ấn bản.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Quick Switcher Button & Mode Segmented Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Quick Book Switcher Button */}
              <button
                type="button"
                onClick={() => setIsSwitcherOpen(true)}
                className="relative flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/90 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 transition-all shadow-2xs group cursor-pointer"
              >
                <div className="w-7 h-9 rounded bg-slate-200 overflow-hidden shrink-0 shadow-2xs border border-slate-300">
                  <img src={currentBook.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                </div>
                <div className="text-left max-w-[180px] sm:max-w-[220px]">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Đang thao tác:</div>
                  <div className="truncate font-bold text-slate-900 text-xs">{currentBook.title}</div>
                </div>
                <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-emerald-700 transition-colors">
                  swap_vert
                </span>

                {/* Badge số sách cần xử lý */}
                {stats.rejectedCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white shadow-xs animate-pulse">
                    {stats.rejectedCount}
                  </span>
                )}
              </button>

              {/* Mode Segmented Controls */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setViewMode('CORRECTION')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'CORRECTION'
                      ? 'bg-white text-rose-700 font-bold shadow-xs border border-rose-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Chế độ xử lý lỗi bị kiểm duyệt từ chối"
                >
                  <span className="material-symbols-outlined text-sm">gavel</span>
                  <span>Khắc Phục Lỗi</span>
                  {currentBook.status === 'REJECTED' && (
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('FULL_EDIT')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'FULL_EDIT'
                      ? 'bg-white text-emerald-800 font-bold shadow-xs border border-emerald-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Chế độ chỉnh sửa thông số sâu toàn diện"
                >
                  <span className="material-symbols-outlined text-sm">tune</span>
                  <span>Sửa Toàn Diện</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('OVERVIEW')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'OVERVIEW'
                      ? 'bg-white text-indigo-700 font-bold shadow-xs border border-indigo-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Xem danh sách tất cả sách cần biên tập"
                >
                  <span className="material-symbols-outlined text-sm">dashboard</span>
                  <span>Tổng Quan Hub</span>
                </button>
              </div>

            </div>
          </div>
        </div>

        {/* 2. CHẾ ĐỘ 1: XỬ LÝ LỖI KIỂM DUYỆT (CORRECTION WORKFLOW) */}
        {viewMode === 'CORRECTION' && (
          <div className="space-y-6">
            
            {/* Top Rejection Details Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-serif">
                    {currentBook.title}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    currentBook.status === 'REJECTED'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : currentBook.status === 'DRAFT'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {currentBook.status === 'REJECTED' ? 'TỪ CHỐI DUYỆT' : currentBook.status === 'DRAFT' ? 'BẢN NHÁP' : 'ĐANG BÁN'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-1.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">person</span>
                    Tác giả: <strong className="text-slate-800">{currentBook.author}</strong>
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">upload_file</span>
                    Gửi duyệt: <strong className="text-slate-800">{currentBook.submittedAt || '06/09/2026'}</strong>
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="flex items-center gap-1 text-rose-600 font-semibold">
                    <span className="material-symbols-outlined text-sm">rate_review</span>
                    Phản hồi kiểm duyệt: <strong>{currentBook.reviewDate || '07/09/2026 · 08:15'}</strong>
                  </span>
                  <span className="text-slate-300 hidden sm:inline">•</span>
                  <span className="text-emerald-700 font-semibold">{currentBook.reviewer || 'Thẩm định viên HUKI #08'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                <Link
                  href={`/book/${currentBook.id}`}
                  target="_blank"
                  className="px-3 py-2 bg-white border border-slate-200 hover:border-emerald-600 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  <span>Xem Bản Preview</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setViewMode('FULL_EDIT')}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  <span>Mở Form Sửa Toàn Diện</span>
                </button>
              </div>
            </div>

            {/* Rejection Summary Banner */}
            <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 flex items-center justify-center shrink-0 text-rose-700 shadow-2xs">
                  <span className="material-symbols-outlined text-2xl">error</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-rose-950">
                      Ấn Phẩm Cần Được Khắc Phục Trước Khi Mở Bán
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-200/80 text-rose-900 border border-rose-300">
                        3 Vấn đề
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {currentIssuesResolved} Đã xử lý
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        {3 - currentIssuesResolved} Chưa xử lý
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-rose-900/90 mt-1.5 leading-relaxed">
                    Hệ thống HUKI chưa thể phê duyệt xuất bản ấn phẩm này do một số nội dung và tệp đính kèm chưa đạt tiêu chuẩn kiểm duyệt nội dung số. Vui lòng khắc phục các vấn đề bên dưới theo hướng dẫn của ban biên tập để gửi thẩm định lại.
                  </p>

                  <div className="mt-3.5 p-4 bg-white/95 border-l-4 border-rose-600 rounded-r-xl text-xs text-slate-800 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900 text-[11px] uppercase tracking-wider mb-1">
                      <span className="material-symbols-outlined text-sm text-rose-600">record_voice_over</span>
                      Ghi chú từ Biên tập viên HUKI:
                    </div>
                    <p className="italic text-slate-600 leading-relaxed">
                      "{currentBook.editorNote || currentBook.rejectionReason || 'Vui lòng kiểm tra và bổ sung đầy đủ thông tin.'}"
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-rose-900">
                      <span>Tiến Độ Khắc Phục:</span>
                      <strong className="text-slate-900">{currentIssuesResolved} / 3 vấn đề đã xử lý</strong>
                      <span className="text-slate-500">({Math.round((currentIssuesResolved / 3) * 100)}%)</span>
                    </div>
                    <div className="w-full sm:w-64 bg-rose-200/70 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${(currentIssuesResolved / 3) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Form Layout Grid */}
            <div className="grid grid-cols-12 gap-6 items-start">
              
              {/* Left Sub-Nav (8 Steps) */}
              <nav className="col-span-12 lg:col-span-3 sticky top-24 bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs space-y-1.5">
                <p className="px-2.5 py-1 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  MỤC KIỂM DUYỆT (8 BƯỚC)
                </p>
                {navItems.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600 font-bold shadow-2xs'
                          : item.status === 'error'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200 font-bold'
                          : item.status === 'fixed'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.status === 'error' ? (
                        <span className="material-symbols-outlined text-rose-600 text-xs animate-bounce">priority_high</span>
                      ) : item.status === 'fixed' || item.status === 'done' ? (
                        <span className="material-symbols-outlined text-emerald-600 text-xs">check_circle</span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* Middle Correction Sections */}
              <div className="col-span-12 lg:col-span-6 space-y-6">

                {/* Section 1: Thông Tin Cơ Bản */}
                <section className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4" id="sec-basic">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">01</span>
                      <h3 className="text-sm font-bold text-slate-900">Thông Tin Cơ Bản</h3>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Hợp lệ (Đã duyệt)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="md:col-span-2">
                      <label className="block font-bold text-slate-700 mb-1">Tên Tựa Sách Chính Thức</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-semibold focus:outline-none"
                        type="text"
                        defaultValue={currentBook.title}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Mã Chuẩn Quốc Tế (ISBN-13)</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono"
                        type="text"
                        defaultValue={currentBook.isbn || '978-604-58-9123-4'}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Ngôn Ngữ Phát Hành</label>
                      <input
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900"
                        type="text"
                        defaultValue="Tiếng Việt (Bản dịch có bản quyền)"
                      />
                    </div>
                  </div>
                </section>

                {/* Section 2: Mô Tả Sách - Issue 1 */}
                <section className={`bg-white rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 border-2 ${
                  isDescValid ? 'border-emerald-300' : 'border-rose-300'
                }`} id="sec-description">
                  <div className={`flex items-center justify-between pb-3 border-b ${
                    isDescValid ? 'border-emerald-100' : 'border-rose-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                        isDescValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                      }`}>02</span>
                      <h3 className="text-sm font-bold text-slate-900">Mô Tả Sản Phẩm</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${
                      isDescValid
                        ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                        : 'text-rose-700 bg-rose-100 border-rose-300'
                    }`}>
                      <span className="material-symbols-outlined text-sm">{isDescValid ? 'check_circle' : 'error'}</span>
                      {isDescValid ? 'VẤN ĐỀ 1: ĐÃ KHẮC PHỤC' : 'VẤN ĐỀ 1: CẦN CHỈNH SỬA'}
                    </span>
                  </div>

                  <div className="bg-rose-50/90 border-l-4 border-rose-600 p-4 rounded-r-xl text-xs space-y-1.5 text-rose-950">
                    <div className="flex items-center gap-1.5 text-rose-900 font-bold mb-1">
                      <span className="material-symbols-outlined text-rose-600 text-base">announcement</span>
                      <span>PHẢN HỒI TỪ BAN BIÊN TẬP HUKI (NGÀY 07/09/2026)</span>
                    </div>
                    <p>
                      <strong className="font-semibold text-rose-900">Lý do từ chối:</strong> Mô tả sách ban đầu quá ngắn, thiếu phần tóm lược các chương chính và đối tượng độc giả hướng tới.
                    </p>
                    <p className="pt-1 text-rose-800">
                      <strong className="font-semibold">Gợi ý khắc phục:</strong> Bổ sung nội dung giới thiệu chi tiết (tối thiểu 50 từ).
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-bold text-slate-800 text-xs flex items-center gap-1">
                        <span>Nội Dung Giới Thiệu Cuốn Sách</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setDescText('Atomic Habits của James Clear là cuốn cẩm nang toàn diện và thực tế nhất về cách thay đổi thói quen. Sách chia nhỏ quy trình thành 4 bước dễ áp dụng: Rõ ràng, Hấp dẫn, Dễ dàng, và Thỏa mãn. Phù hợp cho mọi độc giả muốn tối ưu hóa hiệu suất cá nhân và xây dựng lối sống khoa học.');
                          showToast?.('Đã chèn nội dung mẫu chuẩn SEO HUKI!', 'success');
                        }}
                        className="text-emerald-700 hover:text-emerald-800 text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                        Gợi ý mẫu mô tả chuẩn SEO
                      </button>
                    </div>

                    <div className="border border-slate-300 rounded-t-xl bg-slate-50 px-3 py-2 flex items-center gap-2 border-b">
                      <button className="p-1 hover:bg-slate-200 rounded font-bold text-xs" type="button">B</button>
                      <button className="p-1 hover:bg-slate-200 rounded italic text-xs" type="button">I</button>
                      <button className="p-1 hover:bg-slate-200 rounded underline text-xs" type="button">U</button>
                      <span className="h-4 w-px bg-slate-300 mx-1"></span>
                      <span className={`text-[11px] font-bold ml-auto ${
                        isDescValid ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {descWordCount} / 50 từ tối thiểu ({isDescValid ? '✓ Đạt chuẩn' : 'Chưa đạt'})
                      </span>
                    </div>

                    <textarea
                      value={descText}
                      onChange={(e) => setDescText(e.target.value)}
                      className={`w-full bg-white border-x border-b rounded-b-xl p-3 text-xs text-slate-800 focus:outline-none leading-relaxed resize-none ${
                        isDescValid ? 'border-emerald-300 focus:ring-2 focus:ring-emerald-500' : 'border-rose-300 focus:ring-2 focus:ring-rose-500'
                      }`}
                      rows={4}
                    />

                    {!isDescValid && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-rose-700">
                        <span className="material-symbols-outlined text-sm text-rose-600 mt-0.5">warning</span>
                        <span>Cảnh báo: Bạn cần viết thêm ít nhất {50 - descWordCount} từ để đạt chuẩn gửi duyệt.</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Section 4: Ảnh Bìa & Media - Issue 2 */}
                <section className={`bg-white rounded-2xl p-5 sm:p-6 shadow-xs space-y-4 border-2 ${
                  isCoverFixed ? 'border-emerald-300' : 'border-rose-300'
                }`} id="sec-media">
                  <div className={`flex items-center justify-between pb-3 border-b ${
                    isCoverFixed ? 'border-emerald-100' : 'border-rose-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">04</span>
                      <h3 className="text-sm font-bold text-slate-900">Ảnh Bìa & Media</h3>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300 uppercase tracking-wide">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      VẤN ĐỀ 2: ĐÃ KHẮC PHỤC
                    </span>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-950 flex items-start justify-between">
                    <div className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-emerald-700 text-lg shrink-0 mt-0.5">verified</span>
                      <div>
                        <div className="font-bold text-emerald-900">Đã cập nhật ảnh bìa đạt chuẩn 1600x2400px (WebP).</div>
                        <p className="text-emerald-800 mt-0.5">Hệ thống đã nhận diện tỷ lệ khung hình chuẩn 1:1.5 cho phiên bản Ebook DRM.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsCoverFixed(!isCoverFixed)}
                      className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold"
                    >
                      {isCoverFixed ? 'Thay đổi' : 'Xác nhận lại'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-rose-200 rounded-xl p-3.5 bg-rose-50/30 flex flex-col items-center text-center">
                      <div className="w-full flex items-center justify-between mb-2 text-[11px]">
                        <span className="font-bold text-rose-800">BẢN CŨ BỊ TỪ CHỐI</span>
                        <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-bold">480 x 720 px</span>
                      </div>
                      <div className="w-24 h-36 relative rounded-lg overflow-hidden shadow-xs border-2 border-dashed border-rose-300 mb-2 p-1 bg-white">
                        <img className="w-full h-full object-cover filter blur-[1px] opacity-75" alt="Old cover" src={currentBook.coverUrl} />
                      </div>
                      <span className="text-[11px] text-rose-600 font-medium">Đã lưu trữ lịch sử</span>
                    </div>

                    <div className="border-2 border-emerald-400 rounded-xl p-3.5 bg-emerald-50/30 flex flex-col items-center text-center relative">
                      <div className="w-full flex items-center justify-between mb-2 text-[11px]">
                        <span className="font-bold text-emerald-900 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-emerald-600">check</span>
                          BẢN MỚI TẢI LÊN
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">1600 x 2400 px</span>
                      </div>
                      <div className="w-24 h-36 relative rounded-lg overflow-hidden shadow-md border-2 border-emerald-500 mb-2">
                        <img className="w-full h-full object-cover" alt="New high res cover" src={currentBook.coverUrl} />
                      </div>
                      <span className="text-[11px] text-emerald-700 font-bold">✓ Đạt chuẩn hiển thị HD</span>
                    </div>
                  </div>
                </section>

                {/* Section 7: Tệp Ebook DRM - Issue 3 */}
                <section className={`bg-white rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 border-2 ${
                  isDrmFixed ? 'border-emerald-300' : 'border-rose-300'
                }`} id="sec-drm">
                  <div className={`flex items-center justify-between pb-3 border-b ${
                    isDrmFixed ? 'border-emerald-100' : 'border-rose-100'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                        isDrmFixed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                      }`}>07</span>
                      <h3 className="text-sm font-bold text-slate-900">Tệp Ebook & Bản Quyền DRM</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${
                      isDrmFixed
                        ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                        : 'text-rose-700 bg-rose-100 border-rose-300'
                    }`}>
                      <span className="material-symbols-outlined text-sm">{isDrmFixed ? 'check_circle' : 'error'}</span>
                      {isDrmFixed ? 'VẤN ĐỀ 3: ĐÃ KHẮC PHỤC' : 'VẤN ĐỀ 3: CẦN CHỈNH SỬA'}
                    </span>
                  </div>

                  <div className="bg-rose-50/90 border-l-4 border-rose-600 p-4 rounded-r-xl text-xs space-y-1.5 text-rose-950">
                    <div className="flex items-center gap-1.5 text-rose-900 font-bold mb-1">
                      <span className="material-symbols-outlined text-rose-600 text-base">lock_clock</span>
                      <span>PHẢN HỒI TỪ HỆ THỐNG KỸ THUẬT DRM HUKI</span>
                    </div>
                    <p>
                      <strong className="font-semibold text-rose-900">Lý do từ chối:</strong> Tệp PDF tải lên bị khóa mã hóa bằng mật khẩu. Máy chủ DRM HUKI không thể bóc tách nội dung và gắn Watermark động theo người dùng.
                    </p>
                    <p className="pt-1 text-rose-800">
                      <strong className="font-semibold">Gợi ý khắc phục:</strong> Vui lòng xuất bản lại tệp PDF Master không đặt mật khẩu mở tệp.
                    </p>
                  </div>

                  {isDrmFixed ? (
                    <div className="border border-emerald-300 bg-emerald-50/60 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
                          <span className="material-symbols-outlined text-2xl">verified_user</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900 font-mono">Atomic-Habits-Master-Unlocked.pdf</span>
                            <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded">Không Mật Khẩu</span>
                          </div>
                          <div className="text-[11px] text-emerald-800 mt-0.5">
                            Dung lượng: 34.6 MB · Đã vượt qua kiểm định DRM Watermark
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsDrmFixed(false)}
                        className="text-xs text-slate-500 hover:text-slate-800 underline font-semibold"
                      >
                        Tải lại tệp khác
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="border border-rose-300 bg-rose-50/40 rounded-xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700">
                            <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 font-mono">Atomic-Habits-Locked.pdf</span>
                              <span className="bg-rose-200 text-rose-900 text-[10px] font-bold px-2 py-0.5 rounded">Có Mật Khẩu</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Dung lượng: 48.2 MB · Tải lên ngày: 06/09/2026
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-rose-700">Cần gỡ bỏ</span>
                      </div>

                      <div
                        onClick={() => {
                          setIsDrmFixed(true);
                          showToast?.('Đã tải lên tệp PDF Master Unlocked mới!', 'success');
                        }}
                        className="border-2 border-dashed border-emerald-400 hover:border-emerald-600 rounded-2xl p-6 text-center bg-emerald-50/30 transition-all cursor-pointer group"
                      >
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-2xl">upload_file</span>
                        </div>
                        <div className="text-xs font-bold text-slate-800">
                          <span className="text-emerald-700 underline">Bấm vào đây để tải lên tệp PDF Master Unlocked (Không Mật Khẩu)</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Hỗ trợ định dạng PDF, EPUB Master không khóa bảo vệ. Dung lượng tối đa: 100MB.
                        </p>
                      </div>
                    </div>
                  )}
                </section>

              </div>

              {/* Right Aside: Real-Time Checklist */}
              <aside className="col-span-12 lg:col-span-3 sticky top-24 space-y-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-900">Checklist Khắc Phục</h4>
                    <span className={`text-[11px] font-bold ${
                      canResubmit ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {currentIssuesResolved} / 3 hoàn tất
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5">check_circle</span>
                      <div>
                        <div className="font-bold text-emerald-950">1. Ảnh bìa chính</div>
                        <div className="text-[11px] text-emerald-800">Đã cập nhật bản HD 1600x2400</div>
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                      isDescValid ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                    }`}>
                      <span className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${
                        isDescValid ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isDescValid ? 'check_circle' : 'cancel'}
                      </span>
                      <div>
                        <div className={`font-bold ${isDescValid ? 'text-emerald-950' : 'text-rose-950'}`}>
                          2. Mô tả sản phẩm
                        </div>
                        <div className={`text-[11px] ${isDescValid ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {isDescValid ? 'Đã đạt độ dài chuẩn' : `Còn thiếu từ (hiện có ${descWordCount}/50)`}
                        </div>
                      </div>
                    </div>

                    <div className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                      isDrmFixed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                    }`}>
                      <span className={`material-symbols-outlined text-base shrink-0 mt-0.5 ${
                        isDrmFixed ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {isDrmFixed ? 'check_circle' : 'cancel'}
                      </span>
                      <div>
                        <div className={`font-bold ${isDrmFixed ? 'text-emerald-950' : 'text-rose-950'}`}>
                          3. Tệp Ebook DRM
                        </div>
                        <div className={`text-[11px] ${isDrmFixed ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {isDrmFixed ? 'Đã gắn tệp Master Unlocked' : 'Tệp PDF cũ bị khóa mật khẩu'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Hỗ Trợ Nhanh */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-emerald-700">support_agent</span>
                    Hỗ Trợ Kiểm Duyệt HUKI
                  </div>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Nếu bạn có thắc mắc về tiêu chuẩn bản quyền hoặc cần giải trình đặc thù, hãy liên hệ trực tiếp với Thẩm định viên phụ trách qua kênh trò chuyện nội bộ.
                  </p>
                  <Link
                    href="/seller/appeals"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:underline"
                  >
                    <span>Mở đơn khiếu nại / phúc khảo</span>
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </Link>
                </div>
              </aside>

            </div>

            {/* Sticky Bottom Bar */}
            <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 sm:px-8 py-3.5 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] flex flex-wrap items-center justify-between gap-4 rounded-2xl">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className={`w-2.5 h-2.5 rounded-full ${
                  canResubmit ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                }`}></span>
                <span className="text-slate-800">
                  Tiến độ: <strong>{currentIssuesResolved}/3</strong> vấn đề đã giải quyết
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setViewMode('OVERVIEW')}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Đổi Sách Khác
                </button>
                <button
                  type="button"
                  onClick={() => showToast?.('Đã lưu tiến độ bản nháp khắc phục.', 'info')}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all shadow-xs cursor-pointer"
                >
                  Lưu Tiến Độ Nháp
                </button>

                <button
                  type="button"
                  onClick={handleResubmit}
                  disabled={!canResubmit || isSubmittingResubmit}
                  className={`px-6 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
                    canResubmit
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 active:scale-98'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  {isSubmittingResubmit ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      <span>Đang Gửi Tái Thẩm Định...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">send</span>
                      <span>GỬI DUYỆT LẠI ({canResubmit ? 'Đủ Điều Kiện' : `Còn ${3 - currentIssuesResolved} Vấn Đề`})</span>
                    </>
                  )}
                </button>
              </div>
            </footer>

          </div>
        )}

        {/* 3. CHẾ ĐỘ 2: CHỈNH SỬA TOÀN DIỆN (FULL PRODUCT EDIT VIEW) */}
        {viewMode === 'FULL_EDIT' && (
          <div className="space-y-4">
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 px-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-700 text-lg">tune</span>
                <span className="font-semibold text-emerald-950">
                  Bạn đang ở chế độ <strong>Chỉnh Sửa Toàn Diện</strong> cho cuốn: <strong>{currentBook.title}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {currentBook.status === 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => setViewMode('CORRECTION')}
                    className="text-rose-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">gavel</span>
                    <span>Quay lại sửa lỗi kiểm duyệt</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewMode('OVERVIEW')}
                  className="text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer ml-3"
                >
                  Đổi sách khác
                </button>
              </div>
            </div>

            {/* Nhúng toàn bộ Form chuyên sâu của SellerEditProductView */}
            <SellerEditProductView productId={currentBook.id} />
          </div>
        )}

        {/* 4. CHẾ ĐỘ 3: TỔNG QUAN HUB (WORKSPACE KANBAN / OVERVIEW) */}
        {viewMode === 'OVERVIEW' && (
          <div className="space-y-6">
            
            {/* Header & Stats Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">Tổng Sách Trong Studio</span>
                  <span className="material-symbols-outlined text-slate-400">auto_stories</span>
                </div>
                <div className="text-2xl font-black text-slate-900 mt-2">{stats.total}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Sách trong danh mục người bán</div>
              </div>

              <div className="bg-rose-50/80 rounded-2xl p-4 border border-rose-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-800">Cần Khắc Phục Gấp</span>
                  <span className="material-symbols-outlined text-rose-600">gavel</span>
                </div>
                <div className="text-2xl font-black text-rose-950 mt-2">{stats.rejectedCount}</div>
                <div className="text-[11px] text-rose-700 mt-0.5">Bị kiểm duyệt từ chối lên sàn</div>
              </div>

              <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-800">Bản Nháp Chưa Xong</span>
                  <span className="material-symbols-outlined text-amber-600">draft</span>
                </div>
                <div className="text-2xl font-black text-amber-950 mt-2">{stats.draftCount}</div>
                <div className="text-[11px] text-amber-700 mt-0.5">Chưa gửi duyệt xuất bản</div>
              </div>

              <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800">Đang Mở Bán</span>
                  <span className="material-symbols-outlined text-emerald-600">storefront</span>
                </div>
                <div className="text-2xl font-black text-emerald-950 mt-2">{stats.publishedCount}</div>
                <div className="text-[11px] text-emerald-700 mt-0.5">Đã công khai trên sàn HUKI</div>
              </div>
            </div>

            {/* 3 Cột Trạng Thái Sách (Kanban) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Cột 1: Sách Bị Từ Chối (Ưu Tiên 1) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
                    <h3 className="font-bold text-slate-900 text-sm">Cần Khắc Phục Gấp</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    {stats.rejectedCount}
                  </span>
                </div>

                <div className="space-y-3">
                  {books.filter(b => b.status === 'REJECTED').map(book => (
                    <div
                      key={book.id}
                      className="bg-white rounded-2xl p-4 border-2 border-rose-200 hover:border-rose-400 shadow-xs hover:shadow-md transition-all space-y-3 group"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-22 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                          <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                            Bị Từ Chối
                          </span>
                          <h4 className="font-bold text-slate-900 text-xs mt-1 line-clamp-2 group-hover:text-rose-700 transition-colors">
                            {book.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Tác giả: {book.author}</p>
                          <div className="text-[11px] font-mono font-bold text-rose-700 mt-1">
                            {book.price ? book.price.toLocaleString('vi-VN') + ' đ' : 'Chưa định giá'}
                          </div>
                        </div>
                      </div>

                      {book.rejectionReason && (
                        <div className="bg-rose-50/80 rounded-xl p-2.5 text-[11px] text-rose-900 border border-rose-200/80 line-clamp-2">
                          <strong>Lý do:</strong> {book.rejectionReason}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookId(book.id);
                            setViewMode('CORRECTION');
                          }}
                          className="flex-1 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">gavel</span>
                          <span>Khắc Phục Ngay</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookId(book.id);
                            setViewMode('FULL_EDIT');
                          }}
                          className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                          title="Sửa toàn diện"
                        >
                          <span className="material-symbols-outlined text-sm">tune</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cột 2: Sách Bản Nháp */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <h3 className="font-bold text-slate-900 text-sm">Bản Nháp Đang Soạn</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {stats.draftCount}
                  </span>
                </div>

                <div className="space-y-3">
                  {books.filter(b => b.status === 'DRAFT').map(book => (
                    <div
                      key={book.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-amber-400 shadow-xs hover:shadow-md transition-all space-y-3 group"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-22 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                          <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                            Bản Nháp
                          </span>
                          <h4 className="font-bold text-slate-900 text-xs mt-1 line-clamp-2 group-hover:text-amber-700 transition-colors">
                            {book.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Tác giả: {book.author}</p>
                          <div className="text-[11px] font-mono font-bold text-slate-700 mt-1">
                            {book.price ? book.price.toLocaleString('vi-VN') + ' đ' : 'Chưa định giá'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookId(book.id);
                            setViewMode('FULL_EDIT');
                          }}
                          className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">edit</span>
                          <span>Tiếp Tục Soạn Thảo</span>
                        </button>
                      </div>
                    </div>
                  ))}
                  {books.filter(b => b.status === 'DRAFT').length === 0 && (
                    <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      Không có bản nháp nào đang chờ
                    </div>
                  )}
                </div>
              </div>

              {/* Cột 3: Sách Đang Mở Bán */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <h3 className="font-bold text-slate-900 text-sm">Sách Đang Kinh Doanh</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {stats.publishedCount}
                  </span>
                </div>

                <div className="space-y-3">
                  {books.filter(b => b.status === 'PUBLISHED').map(book => (
                    <div
                      key={book.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all space-y-3 group"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-22 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                          <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                            Đang Bán
                          </span>
                          <h4 className="font-bold text-slate-900 text-xs mt-1 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                            {book.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Tác giả: {book.author}</p>
                          <div className="text-[11px] font-mono font-bold text-emerald-700 mt-1">
                            {book.price ? book.price.toLocaleString('vi-VN') + ' đ' : 'Chưa định giá'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookId(book.id);
                            setViewMode('FULL_EDIT');
                          }}
                          className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">tune</span>
                          <span>Cập Nhật Thông Số</span>
                        </button>
                        <Link
                          href={`/book/${book.id}`}
                          target="_blank"
                          className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
                          title="Xem trang bán hàng"
                        >
                          <span className="material-symbols-outlined text-sm">storefront</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* 5. MODAL / FLYOUT CHỌN SÁCH NHANH (QUICK BOOK SWITCHER) */}
      {isSwitcherOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleUp">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-emerald-700 text-2xl">auto_stories</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Chọn Sách Cần Biên Tập</h3>
                  <p className="text-xs text-slate-500">Chuyển đổi ngữ cảnh làm việc ngay lập tức không mất dữ liệu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSwitcherOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Search & Filter Tabs */}
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 space-y-3">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  value={switcherSearch}
                  onChange={(e) => setSwitcherSearch(e.target.value)}
                  placeholder="Tìm theo tên sách, tác giả, ISBN..."
                  className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-medium"
                  autoFocus
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSwitcherTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    switcherTab === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Tất cả ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setSwitcherTab('REJECTED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    switcherTab === 'REJECTED'
                      ? 'bg-rose-700 text-white font-bold'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                  }`}
                >
                  🔴 Cần Khắc Phục ({stats.rejectedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSwitcherTab('DRAFT')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    switcherTab === 'DRAFT'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                  }`}
                >
                  🟡 Bản Nháp ({stats.draftCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSwitcherTab('PUBLISHED')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    switcherTab === 'PUBLISHED'
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                  }`}
                >
                  🟢 Đang Bán ({stats.publishedCount})
                </button>
              </div>
            </div>

            {/* Modal Book Items List */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1 divide-y divide-slate-100">
              {filteredSwitcherBooks.map((book) => {
                const isSelected = book.id === selectedBookId;
                return (
                  <div
                    key={book.id}
                    onClick={() => handleSelectBook(book)}
                    className={`pt-2.5 first:pt-0 p-3 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 border-2 border-emerald-500 shadow-2xs'
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-16 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-300 shadow-2xs">
                        <img src={book.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                            book.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : book.status === 'DRAFT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {book.status === 'REJECTED' ? 'Bị Từ Chối' : book.status === 'DRAFT' ? 'Bản Nháp' : 'Đang Bán'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{book.isbn}</span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-xs mt-0.5 truncate max-w-[320px] sm:max-w-[400px]">
                          {book.title}
                        </h4>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span>Tác giả: {book.author}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">{book.price ? book.price.toLocaleString('vi-VN') + ' đ' : 'Chưa định giá'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isSelected ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center gap-1 shadow-2xs">
                          <span className="material-symbols-outlined text-xs">check</span>
                          <span>Đang Chọn</span>
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-slate-400 hover:text-emerald-700">
                          chevron_right
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredSwitcherBooks.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs space-y-1">
                  <span className="material-symbols-outlined text-3xl">search_off</span>
                  <p>Không tìm thấy cuốn sách nào khớp với từ khóa tìm kiếm</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>Đang hiển thị {filteredSwitcherBooks.length} cuốn sách</span>
              <button
                type="button"
                onClick={() => setIsSwitcherOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
