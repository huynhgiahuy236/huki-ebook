'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { extractPdfPageText } from '../../utils/pdfLoader';

export interface AiVoiceNarratorBarProps {
  bookTitle?: string;
  bookAuthor?: string;
  bookId?: string;
  pdfUrl?: string;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onClose?: () => void;
  autoPlay?: boolean;
}

export default function AiVoiceNarratorBar({
  bookTitle = 'Sách số',
  bookAuthor = 'Tác giả',
  bookId,
  pdfUrl = '/books/Con_duong_phia_truoc__Bill_Gates.pdf',
  currentPage = 1,
  totalPages = 166,
  onPageChange,
  onClose,
  autoPlay = false
}: AiVoiceNarratorBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  // Tốc độ thong thả tự nhiên (0.85x)
  const [rate, setRate] = useState<number>(0.85);
  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState<number>(0);
  const [pageText, setPageText] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Sẵn sàng');
  const [autoTurnPage, setAutoTurnPage] = useState<boolean>(true);
  const [isLoadingText, setIsLoadingText] = useState<boolean>(false);
  // Dùng arrowdown để giấu/mở rộng tính năng nâng cao (tốc độ, chọn giọng, phụ đề)
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showVoiceMenu, setShowVoiceMenu] = useState<boolean>(false);
  
  const isPlayingRef = useRef(false);
  const rateRef = useRef(0.85);
  const autoTurnPageRef = useRef(true);
  const currentPageRef = useRef(currentPage);
  const totalPagesRef = useRef(totalPages);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  isPlayingRef.current = isPlaying;
  rateRef.current = rate;
  autoTurnPageRef.current = autoTurnPage;
  currentPageRef.current = currentPage;
  totalPagesRef.current = totalPages;

  // 1. Tải danh sách giọng nói tiếng Việt từ hệ thống / trình duyệt
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      const viVoices = voices.filter(v => v.lang.toLowerCase().includes('vi'));
      const combined = viVoices.length > 0 ? viVoices : voices;
      setVoiceList(combined);

      // Ưu tiên chọn giọng tiếng Việt tự nhiên (Hoài My / Nam Minh / Google)
      const naturalVi = combined.findIndex(v => 
        (v.name.includes('Natural') || v.name.includes('Online') || v.name.includes('Google') || v.name.includes('HoaiMy') || v.name.includes('NamMinh') || v.name.includes('An')) &&
        v.lang.toLowerCase().includes('vi')
      );
      if (naturalVi >= 0) {
        setSelectedVoiceIndex(naturalVi);
      } else if (viVoices.length > 0) {
        setSelectedVoiceIndex(0);
      }
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;

    // Ping chống pause ngầm của Chrome Web Speech API
    const keepAliveTimer = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 10000);

    return () => {
      clearInterval(keepAliveTimer);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // 2. Trích xuất nội dung văn bản THẬT từ trang PDF hiện tại
  const loadAndReadPage = useCallback(async (pageNum: number, startSpeaking: boolean) => {
    if (typeof window === 'undefined') return;
    setIsLoadingText(true);
    setStatusMessage(`Đang nạp trang ${pageNum}...`);

    try {
      const rawText = await extractPdfPageText(pdfUrl, pageNum);
      let textToRead = rawText.trim();

      if (!textToRead || textToRead.length < 15) {
        textToRead = `Trang ${pageNum}. Bìa hoặc hình ảnh tác phẩm ${bookTitle}. Tác giả ${bookAuthor}.`;
      }

      setPageText(textToRead);
      setIsLoadingText(false);

      if (startSpeaking) {
        speakContent(textToRead, pageNum);
      } else {
        setStatusMessage(`Sẵn sàng đọc trang ${pageNum}`);
      }
    } catch (err) {
      console.warn('Lỗi đọc trang PDF:', err);
      setIsLoadingText(false);
      const fallback = `Trang ${pageNum} tác phẩm ${bookTitle}.`;
      setPageText(fallback);
      if (startSpeaking) {
        speakContent(fallback, pageNum);
      }
    }
  }, [pdfUrl, bookTitle, bookAuthor]);

  // 3. Hàm phát âm thanh đọc trang
  const speakContent = useCallback((text: string, pageNum: number) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rateRef.current; // Tốc độ thong thả (mặc định 0.85x)
    utter.pitch = 1.0;
    utter.lang = 'vi-VN';

    if (voiceList[selectedVoiceIndex]) {
      utter.voice = voiceList[selectedVoiceIndex];
    }

    utter.onstart = () => {
      setIsPlaying(true);
      setStatusMessage(`Đang đọc trang ${pageNum}`);
    };

    // Khi đọc HẾT trang hiện tại -> TỰ ĐỘNG LẬT SANG TRANG TIẾP THEO!
    utter.onend = () => {
      const cur = currentPageRef.current;
      const total = totalPagesRef.current;

      if (autoTurnPageRef.current && cur < total) {
        setStatusMessage(`Xong trang ${cur}. Chuyển sang ${cur + 1}...`);
        setTimeout(() => {
          if (isPlayingRef.current) {
            onPageChange?.(cur + 1);
          }
        }, 800);
      } else {
        setIsPlaying(false);
        setStatusMessage(`Đã xong trang ${cur}`);
      }
    };

    utter.onerror = (e) => {
      console.warn('Speech error:', e);
      setIsPlaying(false);
      setStatusMessage('Đã dừng');
    };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [voiceList, selectedVoiceIndex, onPageChange]);

  // 4. Theo dõi khi trang thay đổi
  useEffect(() => {
    if (isPlaying) {
      loadAndReadPage(currentPage, true);
    } else {
      loadAndReadPage(currentPage, false);
    }
  }, [currentPage]);

  // 5. Autoplay khi mở từ trang audiobooks
  useEffect(() => {
    if (autoPlay) {
      const timer = setTimeout(() => {
        loadAndReadPage(currentPage, true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay]);

  const handlePlayPause = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setStatusMessage('Đã tạm dừng');
    } else {
      if (pageText) {
        speakContent(pageText, currentPage);
      } else {
        loadAndReadPage(currentPage, true);
      }
    }
  };

  const handleRateChange = (newRate: number) => {
    setRate(newRate);
    rateRef.current = newRate;
    if (isPlaying && pageText) {
      window.speechSynthesis.cancel();
      setTimeout(() => {
        speakContent(pageText, currentPage);
      }, 100);
    }
  };

  const handleStop = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setStatusMessage('Đã dừng');
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange?.(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange?.(currentPage + 1);
    }
  };

  const selectedVoice = voiceList[selectedVoiceIndex];
  const voiceRawName = selectedVoice ? selectedVoice.name : '';
  const isVietnameseVoice = selectedVoice ? selectedVoice.lang.toLowerCase().includes('vi') : false;

  const currentVoiceShort = selectedVoice
    ? (voiceRawName.includes('HoaiMy') || voiceRawName.includes('Hoài My')
        ? 'Hoài My'
        : voiceRawName.includes('NamMinh') || voiceRawName.includes('Nam Minh')
        ? 'Nam Minh'
        : voiceRawName.includes('An') && isVietnameseVoice
        ? 'An'
        : voiceRawName.includes('Google')
        ? 'Google'
        : voiceRawName.split(' ')[0])
    : 'AI';

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center select-none pointer-events-auto">
      {/* 1. Ngăn mở rộng tùy chỉnh (Hiển thị phía trên khi bấm arrow) */}
      {isExpanded && (
        <div className="mb-2 w-[92vw] max-w-lg bg-[#18181b]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3.5 shadow-2xl text-white space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {/* Header ngăn tùy chỉnh */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2 text-xs">
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="material-symbols-outlined text-sm">tune</span>
              <span>Tùy chỉnh Giọng đọc AI</span>
            </div>
            <span className="text-[11px] text-zinc-400">
              {statusMessage}
            </span>
          </div>

          {/* Dòng 1: Tốc độ đọc & Tự lật trang */}
          <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
            {/* Tốc độ đọc */}
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-[11px] font-medium">Tốc độ:</span>
              <div className="flex items-center gap-1 bg-zinc-800/90 p-0.5 rounded-lg border border-zinc-700/80">
                {[
                  { val: 0.75, label: '0.75x' },
                  { val: 0.85, label: '0.85x' },
                  { val: 1.0, label: '1.0x' },
                  { val: 1.25, label: '1.25x' },
                ].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleRateChange(val)}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition-all cursor-pointer ${
                      rate === val
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                    title={val === 0.85 ? 'Tốc độ đọc thong thả chuẩn' : `Tốc độ ${label}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle Tự lật trang */}
            <button
              type="button"
              onClick={() => setAutoTurnPage(!autoTurnPage)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                autoTurnPage
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-zinc-800/80 text-zinc-400 border-zinc-700'
              }`}
              title="Tự lật trang khi đọc xong"
            >
              <span className="material-symbols-outlined text-[14px]">
                {autoTurnPage ? 'auto_stories' : 'menu_book'}
              </span>
              <span>{autoTurnPage ? 'Tự lật: Bật' : 'Tự lật: Tắt'}</span>
            </button>
          </div>

          {/* Dòng 2: Chọn giọng đọc */}
          {voiceList.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Giọng đọc hệ thống:</span>
                <span className="text-emerald-400 text-[10px]">{voiceList.length} giọng sẵn có</span>
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-28 overflow-y-auto pr-1">
                {voiceList.slice(0, 8).map((voice, idx) => {
                  const isVi = voice.lang.toLowerCase().includes('vi');
                  const cleanName = voice.name.includes('HoaiMy') || voice.name.includes('Hoài My')
                    ? 'Hoài My (Nữ)'
                    : voice.name.includes('NamMinh') || voice.name.includes('Nam Minh')
                    ? 'Nam Minh (Nam)'
                    : voice.name.includes('An') && isVi
                    ? 'An (Tiếng Việt)'
                    : voice.name.includes('Google')
                    ? 'Google Tiếng Việt'
                    : voice.name.slice(0, 16);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedVoiceIndex(idx);
                        if (isPlaying && pageText) {
                          window.speechSynthesis.cancel();
                          setTimeout(() => speakContent(pageText, currentPage), 100);
                        }
                      }}
                      className={`text-left px-2 py-1 rounded-lg text-[11px] transition-all truncate border cursor-pointer ${
                        selectedVoiceIndex === idx
                          ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-200 font-bold'
                          : 'bg-zinc-800/60 border-transparent text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {cleanName} {isVi && '★'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dòng 3: Xem trước văn bản trang PDF đang đọc */}
          {pageText && (
            <div className="bg-zinc-900/80 rounded-xl p-2 border border-zinc-800 text-[11px] text-zinc-300">
              <span className="text-emerald-400 font-bold mr-1.5">Trang {currentPage}:</span>
              <span className="italic line-clamp-2">{pageText}</span>
            </div>
          )}
        </div>
      )}

      {/* 2. Thanh điều khiển chính (Cực kỳ nhẹ nhàng, thanh thoát, không che trang sách) */}
      <div className="flex items-center gap-2 bg-[#18181b]/90 hover:bg-[#18181b]/95 backdrop-blur-xl border border-white/10 rounded-full px-3.5 py-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-white transition-all">
        {/* Equalizer mini */}
        <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
          {isPlaying ? (
            <div className="flex items-end gap-[2px] h-3">
              <span className="w-[2px] bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms] h-3" />
              <span className="w-[2px] bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms] h-1.5" />
              <span className="w-[2px] bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms] h-3.5" />
            </div>
          ) : (
            <span className="material-symbols-outlined text-[15px]">record_voice_over</span>
          )}
        </div>

        {/* Thông tin gọn gàng: Trang X/Y • Giọng */}
        <div className="flex items-center gap-1.5 text-xs px-1">
          <span className="font-bold text-white whitespace-nowrap">
            Trang {currentPage}
          </span>
          <span className="text-zinc-500">/</span>
          <span className="text-zinc-400 text-[11px] whitespace-nowrap">
            {totalPages}
          </span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-emerald-400 text-[11px] font-medium hidden sm:inline truncate max-w-[80px]">
            {isLoadingText ? '...' : currentVoiceShort}
          </span>
        </div>

        {/* Nút lùi trang */}
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="w-7 h-7 rounded-full hover:bg-white/10 disabled:opacity-20 text-zinc-300 flex items-center justify-center transition-all cursor-pointer"
          title="Lùi về trang trước"
        >
          <span className="material-symbols-outlined text-base">skip_previous</span>
        </button>

        {/* Nút Play / Pause tròn thanh lịch */}
        <button
          type="button"
          onClick={handlePlayPause}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer ${
            isPlaying
              ? 'bg-emerald-500 text-zinc-950 font-bold hover:scale-105'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold hover:scale-105'
          }`}
          title={isPlaying ? 'Tạm dừng đọc' : 'Bắt đầu đọc'}
        >
          <span className="material-symbols-outlined text-xl">
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        {/* Nút tiến trang */}
        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="w-7 h-7 rounded-full hover:bg-white/10 disabled:opacity-20 text-zinc-300 flex items-center justify-center transition-all cursor-pointer"
          title="Sang trang sau"
        >
          <span className="material-symbols-outlined text-base">skip_next</span>
        </button>

        <div className="w-[1px] h-4 bg-white/10 mx-0.5" />

        {/* Nút Arrow Down / Up để ẩn / mở rộng tính năng theo ý người dùng */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={`p-1 rounded-full transition-colors flex items-center justify-center cursor-pointer ${
            isExpanded
              ? 'bg-white/15 text-emerald-400'
              : 'hover:bg-white/10 text-zinc-400 hover:text-white'
          }`}
          title={isExpanded ? 'Thu gọn tùy chỉnh' : 'Mở rộng tùy chỉnh (Tốc độ, giọng đọc, tự lật)'}
        >
          <span className="material-symbols-outlined text-lg">
            {isExpanded ? 'keyboard_arrow_down' : 'keyboard_arrow_up'}
          </span>
        </button>

        {/* Nút Đóng thanh đọc */}
        <button
          type="button"
          onClick={() => {
            handleStop();
            onClose?.();
          }}
          className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Đóng thanh đọc"
        >
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
    </div>
  );
}
