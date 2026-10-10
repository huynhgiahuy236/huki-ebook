'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useCart } from '@/ui/context/CartContext';
import { useToast } from '@/ui/context/ToastContext';
import { useLayout } from '@/ui/components/layout/AppLayout';
import { catalogApi, BookData } from '@/ui/api/catalogApi';
import { aiAudioService } from '@/ui/services/aiAudioService';

interface TrackInfo {
  bookId: string;
  title: string;
  author: string;
  narrator: string;
  cover?: string;
  sampleText?: string;
}

export default function AudiobooksPage() {
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isSidebarCollapsed } = useLayout();

  const [books, setBooks] = useState<BookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<TrackInfo | null>(null);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);

  // Lấy danh sách đăng ký AI thật
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [subscribedBookIds, setSubscribedBookIds] = useState<Set<string>>(new Set());

  const refreshSubscriptions = async () => {
    try {
      const subs = await aiAudioService.getSubscriptions();
      const activeSubs = subs.filter(
        (s) => s.status === 'ACTIVE' && new Date(s.expiresAt).getTime() > Date.now()
      );
      setActiveSubscriptions(activeSubs);
      const activeIds = new Set<string>();
      activeSubs.forEach((s) => {
        if (s.bookId) activeIds.add(s.bookId);
      });
      setSubscribedBookIds(activeIds);
    } catch (e) {
      console.warn('Lỗi tải subscriptions:', e);
    }
  };

  useEffect(() => {
    refreshSubscriptions();
    const handleSync = () => refreshSubscriptions();
    window.addEventListener('huki_ai_audio_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('huki_ai_audio_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  // Fetch sách thật từ Catalog API
  useEffect(() => {
    let isMounted = true;
    async function fetchRealBooks() {
      setLoading(true);
      try {
        const res = await catalogApi.getPublicBooks({ limit: 40 });
        if (res.success && res.data && isMounted) {
          const digitalEligible = res.data.filter(
            (b) => b.format === 'DIGITAL' || b.format === 'BOTH'
          );
          setBooks(digitalEligible.length > 0 ? digitalEligible : res.data);
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách sách catalog:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchRealBooks();
    return () => {
      isMounted = false;
    };
  }, []);

  // Speech Synthesis Real Voice Reader
  const speakText = (text: string, rate: number = 1.0) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      showToast('Trình duyệt không hỗ trợ phát giọng đọc tự động.', 'info');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'vi-VN';
    utterance.rate = rate;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  };

  const togglePlay = (track?: TrackInfo) => {
    if (track) {
      setCurrentTrack(track);
      setShowMiniPlayer(true);
      const textToRead = track.sampleText || `Đang phát sách nói: ${track.title}. Tác giả: ${track.author}. Đọc bằng công nghệ Huki AI Audio.`;
      speakText(textToRead, speechRate);
      showToast(`Đang phát giọng đọc AI: ${track.title}`, 'info');
    } else {
      if (isPlaying) {
        stopSpeaking();
      } else if (currentTrack) {
        const textToRead = currentTrack.sampleText || currentTrack.title;
        speakText(textToRead, speechRate);
      }
    }
  };

  const handleRateChange = (newRate: number) => {
    setSpeechRate(newRate);
    if (isPlaying && currentTrack) {
      speakText(currentTrack.sampleText || currentTrack.title, newRate);
    }
    showToast(`Tốc độ đọc: ${newRate}x`, 'info');
  };

  // CHỈ HIỂN THỊ CÁC TÁC PHẨM ĐÃ ĐĂNG KÝ VÀ KÍCH HOẠT GÓI GIỌNG ĐỌC AI (KHÔNG LẪN EBOOK THƯỜNG)
  const aiAudiobooks = useMemo(() => {
    // 1. Lọc từ catalog books những cuốn có AI active
    const fromCatalog = books.filter(
      (b) => subscribedBookIds.has(b.id) || (b.slug && subscribedBookIds.has(b.slug))
    );

    // 2. Những cuốn có active subscription từ DB mà có thể chưa nằm trong kết quả limit của Catalog
    const catalogBookIds = new Set(fromCatalog.map((b) => b.id));
    const extraSubs: any[] = [];

    activeSubscriptions.forEach((sub) => {
      if (!catalogBookIds.has(sub.bookId)) {
        extraSubs.push({
          id: sub.bookId,
          title: sub.bookTitle || 'Tác phẩm Sách Nói AI',
          author: { name: 'Tác giả HUKI' },
          coverUrl: sub.coverUrl || undefined,
          coverImage: sub.coverUrl || undefined,
          price: sub.planPrice || 0,
          description: `Tác phẩm đã kích hoạt bản quyền ${sub.planName || 'Gói AI Voice'}. Phát thanh công nghệ HUKI Studio.`,
          format: 'DIGITAL',
          status: 'PUBLISHED',
          planName: sub.planName,
          totalListens: sub.totalListens,
        });
      }
    });

    const combined = [...fromCatalog, ...extraSubs];

    if (activeCategory !== 'all') {
      return combined.filter((b) => b.category?.slug === activeCategory);
    }
    return combined;
  }, [books, subscribedBookIds, activeSubscriptions, activeCategory]);

  const spotlightBook = useMemo(() => {
    return aiAudiobooks.length > 0 ? aiAudiobooks[0] : null;
  }, [aiAudiobooks]);

  const isSpotlightSubscribed = spotlightBook ? true : false;

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 font-body-md">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-body-sm text-slate-500 mb-6 flex-wrap">
        <Link href="/" className="hover:text-[#00875A] transition-colors">
          Trang chủ
        </Link>
        <span>/</span>
        <Link href="/books" className="hover:text-[#00875A] transition-colors">
          Sàn TMĐT
        </Link>
        <span>/</span>
        <span className="text-[#003B2B] font-semibold">
          Sách Nói &amp; Giọng Đọc AI Bản Quyền (HUKI Studio)
        </span>
      </nav>

      {/* Featured Audiobook Spotlight Hero Banner */}
      {spotlightBook ? (
        <section
          className="rounded-3xl p-6 sm:p-10 text-white shadow-xl mb-10 relative overflow-hidden border border-white/15"
          style={{
            background:
              'linear-gradient(135deg, #003B2B 0%, #005A3E 50%, #00271E 100%)',
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 flex flex-col justify-center space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-white/15 text-[#94F5D6] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  🎧 SÁCH NÓI AI HUKI STUDIO 2026
                </span>
                {isSpotlightSubscribed ? (
                  <span className="bg-[#00875A] text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 shadow-xs">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                    Đã Kích Hoạt Bản Quyền AI
                  </span>
                ) : (
                  <span className="text-xs text-emerald-200/80 font-medium">
                    Chuẩn Âm Thanh AI Tự Nhiên Tiếng Việt
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black leading-tight text-white line-clamp-2">
                {spotlightBook.title}
              </h1>

              <div className="text-xs sm:text-sm text-gray-200 space-y-1">
                <p>
                  <strong className="text-white">Tác giả:</strong>{' '}
                  {spotlightBook.author?.name || 'Đang cập nhật'} |{' '}
                  <strong className="text-white">Định dạng:</strong>{' '}
                  {spotlightBook.format === 'BOTH' ? 'Combo Sách Giấy & Ebook' : 'Ebook DRM Kỹ Thuật Số'} |{' '}
                  <strong className="text-white">Giá niêm yết:</strong>{' '}
                  {(spotlightBook.price || 0).toLocaleString('vi-VN')} đ
                </p>
                <p className="text-xs text-gray-300 line-clamp-2 pt-1">
                  {spotlightBook.description || 'Tác phẩm được bảo hộ bản quyền DRM trên sàn HUKI.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={`/reader?book=${spotlightBook.id}&autoplay=true`}
                  className="bg-[#94F5D6] hover:bg-white text-[#003B2B] px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">record_voice_over</span>
                  <span>Đọc &amp; Nghe Giọng Đọc AI (Lật Trang PDF)</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    addToCart(
                      {
                        id: spotlightBook.id,
                        title: spotlightBook.title,
                        price: spotlightBook.price || 0,
                        coverUrl: spotlightBook.coverUrl || spotlightBook.coverImage,
                        publisher: spotlightBook.publisher?.name || 'HUKI',
                      },
                      'ebook',
                      1
                    );
                    showToast('Đã thêm tác phẩm vào giỏ hàng!', 'success');
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/25 px-5 py-3 rounded-xl font-semibold text-xs sm:text-sm backdrop-blur-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">shopping_cart</span>
                  Mua Ebook Bản Quyền: {(spotlightBook.price || 0).toLocaleString('vi-VN')} đ
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 flex justify-center items-center">
              <Link
                href={`/reader?book=${spotlightBook.id}&autoplay=true`}
                className="w-52 h-64 sm:w-60 sm:h-72 rounded-2xl shadow-2xl ring-4 ring-white/20 overflow-hidden relative group cursor-pointer bg-slate-800 block"
                title="Bấm để vào trang đọc và phát giọng đọc AI"
              >
                {spotlightBook.coverUrl || spotlightBook.coverImage ? (
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src={spotlightBook.coverUrl || spotlightBook.coverImage}
                    alt={spotlightBook.title}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-emerald-950 text-emerald-200">
                    <span className="material-symbols-outlined text-5xl mb-2">menu_book</span>
                    <span className="text-xs font-bold line-clamp-3">{spotlightBook.title}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#00875A] text-white flex items-center justify-center shadow-lg transform scale-95 group-hover:scale-100 transition-transform">
                    <span className="material-symbols-outlined text-3xl">record_voice_over</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* Filter Category & Exclusivity Notice */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#003B2B] text-white shadow-xs">
            <span className="material-symbols-outlined text-sm text-[#94F5D6]">graphic_eq</span>
            <span>Kho Sách Nói AI ({aiAudiobooks.length} Tác Phẩm)</span>
          </div>

          <Link
            href="/books"
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
            title="Xem danh mục Ebook và sách giấy đọc chữ thông thường"
          >
            <span className="material-symbols-outlined text-sm text-slate-400">menu_book</span>
            <span>Tủ Ebook Chữ (Chưa có giọng đọc)</span>
          </Link>
        </div>

        <div className="text-xs text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80 font-medium flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-emerald-600">verified</span>
          <span>Chuyên mục riêng: 100% tác phẩm đã kích hoạt bản quyền Giọng đọc AI</span>
        </div>
      </div>

      {/* Grid Danh Sách Sách Nói AI Thật */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00875A]">record_voice_over</span>
            <span>Danh Sách Sách Nói Đã Kích Hoạt Giọng Đọc AI</span>
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
            {aiAudiobooks.length} tác phẩm sẵn sàng nghe
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl animate-spin mb-2">progress_activity</span>
            <p className="text-xs font-medium">Đang tải danh sách sách từ hệ thống...</p>
          </div>
        ) : aiAudiobooks.length === 0 ? (
          <div className="bg-slate-50 rounded-3xl p-10 text-center border border-dashed border-slate-200">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">graphic_eq</span>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Chưa có cuốn sách nào được đăng ký gói giọng đọc AI
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Khu vực này được bảo hộ chuyên biệt cho các tác phẩm Ebook có Giọng đọc AI Studio bản quyền. Các tác giả và nhà xuất bản có thể đăng ký gói cước AI Voice từ 100K/tháng tại Kênh Người Bán để tác phẩm xuất hiện tại đây.
            </p>
            <Link
              href="/seller/product/create-ebook"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#00875A] text-white text-xs font-bold rounded-xl hover:bg-[#007048] transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Đăng ký phát hành Sách Nói AI
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {aiAudiobooks.map((book) => {
              const isTrackPlaying = isPlaying && currentTrack?.bookId === book.id;

              return (
                <div
                  key={book.id}
                  className="bg-white border border-emerald-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
                  <div>
                    <Link
                      href={`/reader?book=${book.id}&autoplay=true`}
                      className="block relative w-full aspect-square rounded-xl overflow-hidden mb-3 bg-slate-100 flex items-center justify-center cursor-pointer group/cover"
                      title="Bấm để vào đọc và nghe giọng đọc AI lật trang"
                    >
                      {book.coverUrl || (book as any).coverImage ? (
                        <img
                          className="w-full h-full object-cover group-hover/cover:scale-105 transition-transform duration-300"
                          src={book.coverUrl || (book as any).coverImage}
                          alt={book.title}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400">
                          <span className="material-symbols-outlined text-4xl mb-1">menu_book</span>
                          <span className="text-[10px] line-clamp-2">{book.title}</span>
                        </div>
                      )}

                      <span className="absolute top-2 left-2 bg-[#00875A] text-white text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-xs">
                        <span className="material-symbols-outlined text-[12px]">record_voice_over</span>
                        Giọng Đọc AI Studio
                      </span>

                      {(book as any).planName && (
                        <span className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[9.5px] px-2 py-0.5 rounded-md font-medium truncate text-center">
                          {(book as any).planName}
                        </span>
                      )}

                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/cover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[#00875A] text-white flex items-center justify-center shadow-lg">
                          <span className="material-symbols-outlined text-2xl">record_voice_over</span>
                        </div>
                      </div>
                    </Link>

                    <Link
                      href={`/reader?book=${book.id}&autoplay=true`}
                      className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 mb-1 hover:text-[#00875A] transition-colors block"
                    >
                      {book.title}
                    </Link>

                    <p className="text-[11px] text-slate-500 mb-2 truncate">
                      {book.author?.name || 'Tác giả HUKI'}
                    </p>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mb-3">
                      {book.description || 'Tác phẩm đã kích hoạt giọng đọc AI bản quyền.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-black text-[#00875A] text-xs sm:text-sm">
                        {(book.price || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/reader?book=${book.id}`}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1"
                        title="Vào xem sách"
                      >
                        <span className="material-symbols-outlined text-sm">auto_stories</span>
                        <span>Đọc</span>
                      </Link>

                      <Link
                        href={`/reader?book=${book.id}&autoplay=true`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#00875A] hover:bg-[#00704A] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Vào đọc và nghe AI phát thanh lật từng trang PDF"
                      >
                        <span className="material-symbols-outlined text-sm">record_voice_over</span>
                        <span>Đọc &amp; Nghe AI</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Floating Mini Audio Player Bar */}
      {showMiniPlayer && currentTrack && (
        <div
          className={`fixed bottom-4 z-40 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-3 sm:p-3.5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 transition-all duration-300 left-4 right-4 ${
            isSidebarCollapsed ? 'lg:left-[76px] lg:right-6' : 'lg:left-[236px] lg:right-6'
          }`}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#003B2B] text-[#94F5D6] flex items-center justify-center shrink-0 shadow-2xs">
              <span className="material-symbols-outlined text-xl">headphones</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-xs sm:text-[13px] text-slate-900 truncate">
                {currentTrack.title}
              </h4>
              <p className="text-[11px] text-slate-500 truncate">
                {currentTrack.author} • {currentTrack.narrator}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
            {/* Speed toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5 text-xs font-bold">
              {[1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleRateChange(rate)}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    speechRate === rate ? 'bg-white text-[#003B2B] shadow-2xs' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={() => togglePlay()}
              className="w-9 h-9 rounded-full bg-[#003B2B] hover:bg-[#00271E] text-white flex items-center justify-center shadow-xs cursor-pointer transition-colors"
            >
              <span className="material-symbols-outlined text-xl">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                setShowMiniPlayer(false);
              }}
              className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
              title="Tắt trình phát"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
