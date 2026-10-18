"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../api/apiClient';
import { personalizationService } from '../../services/personalizationService';

export interface SuggestedBookItem {
  id: string;
  title: string;
  author: string;
  price: number;
  originalPrice?: number;
  coverUrl: string;
  slug?: string;
  format?: string;
  soldCount?: number;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  suggestedBooks?: SuggestedBookItem[];
}

const QUICK_PROMPTS = [
  '🔥 Sách nào đang bán chạy nhất?',
  '📖 Sách Ebook DRM đọc như thế nào?',
  '🚚 Thời gian và phí giao hàng?',
  '💳 Chính sách đổi trả & hoàn tiền?',
];

const AI_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 phút không hoạt động thì tự động làm mới phiên chat

const DEFAULT_WELCOME_MESSAGE: AIMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Xin chào bạn! 👋 Tôi là **Bé Cáo AI HUKI**.\nTôi có thể giúp bạn tìm sách thật trong kho, hướng dẫn đọc Ebook DRM hoặc giải đáp mọi thắc mắc về đơn hàng. Bạn cần mình tư vấn điều gì hôm nay?',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export default function FloatingAIChatbox() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([DEFAULT_WELCOME_MESSAGE]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo và khôi phục lịch sử chat với cơ chế Smart Session Inactivity Timeout (30 phút)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const lastActiveStr = localStorage.getItem('huki_ai_chat_last_active');
      const lastActive = lastActiveStr ? Number(lastActiveStr) : 0;
      const now = Date.now();
      const isExpired = !lastActive || (now - lastActive > AI_SESSION_TIMEOUT_MS);

      if (isExpired) {
        // Đã quá 30 phút không hoạt động -> Làm mới phiên và xóa sạch tin nhắn cũ
        localStorage.removeItem('huki_ai_chat_messages');
        localStorage.removeItem('huki_ai_chat_last_active');
        const newSid = `sess_${now}_${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem('huki_ai_session_id', newSid);
        setSessionId(newSid);
        setMessages([DEFAULT_WELCOME_MESSAGE]);
      } else {
        // Vẫn trong 30 phút -> Khôi phục tin nhắn và duy trì phiên
        const saved = localStorage.getItem('huki_ai_chat_messages');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
          }
        }
        let sid = localStorage.getItem('huki_ai_session_id');
        if (!sid) {
          sid = `sess_${now}_${Math.random().toString(36).substring(2, 7)}`;
          localStorage.setItem('huki_ai_session_id', sid);
        }
        setSessionId(sid);
      }
    } catch {
      // ignore
    }
  }, []);

  // Tự động lưu tin nhắn và cập nhật thời điểm hoạt động gần nhất vào localStorage khi có thay đổi
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (messages.length > 1) {
        localStorage.setItem('huki_ai_chat_messages', JSON.stringify(messages));
        localStorage.setItem('huki_ai_chat_last_active', Date.now().toString());
      }
    } catch {
      // ignore
    }
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages, scrollToBottom]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: AIMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    // Ghi nhận ngay câu hỏi / chủ đề của user cho gợi ý cá nhân hóa
    try {
      personalizationService.recordSearch(text);
    } catch {}

    try {
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome' && m.id !== 'welcome-reset')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await apiClient<{
        reply: string;
        extractedInterests?: string[];
        suggestedBooks?: SuggestedBookItem[];
        isFallback: boolean;
      }>('/chat/ai', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          sessionId: sessionId || undefined,
        }),
        skipAuth: true,
      });

      const replyText =
        res.data?.reply ||
        (res as any)?.reply ||
        'Dạ mình đã nhận được câu hỏi của bạn rồi nè! Bạn muốn tìm hiểu thêm về tựa sách nào nữa không ạ? 📚';

      // Tự động ghi nhận sở thích đọc sách do Bé Cáo AI trích xuất để cập nhật mục cá nhân hóa
      const interests = res.data?.extractedInterests || (res as any)?.extractedInterests;
      if (Array.isArray(interests) && interests.length > 0) {
        personalizationService.recordAiInterests(interests);
      }

      const suggestedBooks = res.data?.suggestedBooks || (res as any)?.suggestedBooks;

      const assistantMsg: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        suggestedBooks: Array.isArray(suggestedBooks) ? suggestedBooks : undefined,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Lỗi khi gọi API AI Chat backend:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: 'assistant',
          content: 'Xin lỗi bạn nhé, hệ thống đang bận một chút. Bạn vui lòng thử lại sau giây lát nha!',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChat = () => {
    if (typeof window !== 'undefined') {
      try {
        const lastActiveStr = localStorage.getItem('huki_ai_chat_last_active');
        const lastActive = lastActiveStr ? Number(lastActiveStr) : 0;
        const now = Date.now();
        if (lastActive && now - lastActive > AI_SESSION_TIMEOUT_MS) {
          // Phiên đã quá 30 phút không hoạt động -> tự động dọn dẹp và làm mới
          localStorage.removeItem('huki_ai_chat_messages');
          localStorage.removeItem('huki_ai_chat_last_active');
          const newSid = `sess_${now}_${Math.random().toString(36).substring(2, 7)}`;
          localStorage.setItem('huki_ai_session_id', newSid);
          setSessionId(newSid);
          setMessages([DEFAULT_WELCOME_MESSAGE]);
        }
      } catch {}
    }
    setIsOpen(true);
  };

  const handleResetChat = () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('huki_ai_chat_messages');
        localStorage.removeItem('huki_ai_chat_last_active');
        const newSid = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        localStorage.setItem('huki_ai_session_id', newSid);
        setSessionId(newSid);
      } catch {}
    }
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content:
          'Dạ Bé Cáo đã làm mới cuộc trò chuyện rồi nè! 🦊 Bạn cần mình tư vấn thêm tựa sách hay chủ đề nào cứ nhắn cho mình nhé!',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  /**
   * Phân tích Markdown để biến [Tên sách](/book/id) thành link bấm ra sách ngay lập tức!
   */
  const renderMessageTextWithLinks = (text: string) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(text)) !== null) {
      const start = match.index;
      const end = linkRegex.lastIndex;

      if (start > lastIndex) {
        parts.push(text.slice(lastIndex, start));
      }

      const title = match[1];
      const targetUrl = match[2];

      parts.push(
        <button
          key={`link-${start}-${targetUrl}`}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (targetUrl.startsWith('/book/')) {
              router.push(targetUrl);
            } else if (targetUrl.startsWith('http')) {
              window.open(targetUrl, '_blank');
            } else {
              router.push(targetUrl);
            }
          }}
          className="text-emerald-700 hover:text-emerald-950 font-bold underline underline-offset-2 hover:bg-emerald-100/60 px-1 py-0.5 rounded cursor-pointer transition-colors inline-block"
          title={`Bấm để mở xem ${title}`}
        >
          {title} ↗
        </button>
      );

      lastIndex = end;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <aside aria-label="Trợ lý Bé Cáo AI">
      {/* 1. FLOATING 3D MASCOT TRIGGER CHARACTER (Đặt cao hơn nút ScrollToTop để không bị đè) */}
      {!isOpen && (
        <div className="fixed bottom-24 sm:bottom-28 right-4 sm:right-6 z-40 flex flex-col items-end pointer-events-auto select-none">
          {/* Floating Speech Bubble Callout */}
          <div
            onClick={handleOpenChat}
            className="mb-1.5 cursor-pointer bg-white text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-emerald-500/20 flex items-center gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-300 hover:scale-105 active:scale-95 transition-all hover:border-emerald-500/50"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tracking-tight text-[#003B2B]">Hỏi Bé Cáo AI nè! ✨</span>
          </div>

          {/* Mascot Floating 3D Character Container */}
          <button
            type="button"
            onClick={handleOpenChat}
            className="relative group cursor-pointer flex flex-col items-center focus:outline-none transition-transform duration-300 hover:scale-110 active:scale-95"
            title="Trò chuyện cùng Bé Cáo AI HUKI"
            aria-label="Mở Trợ Lý AI HUKI"
          >
            {/* Sparkle Badge */}
            <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white flex items-center justify-center shadow-md z-10 animate-sparkle-pulse border border-white">
              <span className="material-symbols-outlined text-[13px] font-bold">auto_awesome</span>
            </div>

            {/* Mascot Image with 3D Float Animation */}
            <div className="animate-float-huki relative w-[78px] h-[86px] sm:w-[94px] sm:h-[102px]">
              <img
                src="/ai_huki.png"
                alt="Bé Cáo AI HUKI"
                className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,59,43,0.22)] group-hover:brightness-105 transition-all"
              />
            </div>

            {/* Dynamic Ground Shadow */}
            <div className="w-12 sm:w-16 h-2 rounded-full bg-slate-900/35 blur-[2.5px] animate-shadow-huki mt-[-2px]" />
          </button>
        </div>
      )}

      {/* 2. CHATBOX POPUP WINDOW (Góc dưới bên phải như cũ) */}
      {isOpen && (
        <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-50 w-[92vw] sm:w-[390px] max-w-[430px] h-[550px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 font-sans">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#003B2B] via-[#004d38] to-[#006953] text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              {/* Mascot Avatar */}
              <div className="w-9 h-9 rounded-full bg-white/15 border border-white/25 p-0.5 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
                <img
                  src="/ai_huki.png"
                  alt="Bé Cáo AI HUKI"
                  className="w-full h-full object-contain transform scale-110"
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs tracking-tight">Bé Cáo AI HUKI</h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[10px] text-emerald-200/90 font-medium">
                  Trợ lý kho sách thật HUKI • Cache Redis
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleResetChat}
                className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Làm mới cuộc trò chuyện"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/15 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Thu nhỏ khung chat"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#F8FAFC] custom-scrollbar text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200/70 p-0.5 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs overflow-hidden">
                    <img
                      src="/ai_huki.png"
                      alt="Bé Cáo AI HUKI"
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl shadow-2xs ${
                    msg.role === 'user'
                      ? 'bg-[#003B2B] text-white rounded-br-xs font-normal'
                      : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line leading-relaxed">
                    {renderMessageTextWithLinks(msg.content)}
                  </div>

                  {/* THẺ SÁCH GỢI Ý BẤM RA NGAY TRANG CHI TIẾT SÁCH */}
                  {msg.suggestedBooks && msg.suggestedBooks.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
                      <div className="text-[10px] font-bold text-[#003B2B] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[13px] text-amber-500">menu_book</span>
                        <span>Sách trong kho HUKI (bấm xem ngay):</span>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        {msg.suggestedBooks.map((book) => (
                          <div
                            key={book.id}
                            onClick={() => router.push(`/book/${book.id}`)}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 hover:bg-emerald-50/80 border border-slate-200/80 hover:border-emerald-300 transition-all cursor-pointer group shadow-2xs"
                          >
                            <img
                              src={book.coverUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80'}
                              alt={book.title}
                              className="w-10 h-13 object-cover rounded-md shadow-2xs shrink-0 group-hover:scale-105 transition-transform"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-[11px] text-slate-900 group-hover:text-[#003B2B] truncate transition-colors">
                                {book.title}
                              </h4>
                              <p className="text-[10px] text-slate-500 truncate">{book.author}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="font-bold text-[11px] text-[#003B2B]">
                                  {book.price.toLocaleString('vi-VN')}đ
                                </span>
                                <span className="text-[9.5px] text-emerald-800 bg-emerald-100/80 group-hover:bg-[#003B2B] group-hover:text-white px-2 py-0.5 rounded-full font-bold transition-all flex items-center gap-0.5">
                                  <span>Xem sách</span>
                                  <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`text-[9px] mt-1.5 text-right ${
                      msg.role === 'user' ? 'text-white/60' : 'text-slate-400'
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2 items-center text-slate-400 text-xs py-1">
                <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200/70 p-0.5 flex items-center justify-center shrink-0 shadow-2xs animate-pulse overflow-hidden">
                  <img
                    src="/ai_huki.png"
                    alt="Bé Cáo AI HUKI"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003B2B] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003B2B] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003B2B] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-slate-500 font-medium ml-1">Bé Cáo đang tra kho sách...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt)}
                className="px-2.5 py-1 rounded-full bg-slate-50 hover:bg-emerald-50 hover:text-[#003B2B] border border-slate-200 text-[10.5px] font-semibold text-slate-600 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box Footer */}
          <div className="p-2.5 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 focus-within:border-[#003B2B] focus-within:ring-2 focus-within:ring-[#003B2B]/10 transition-all"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Hỏi Bé Cáo về tác phẩm, tác giả, đơn hàng..."
                disabled={isLoading}
                className="flex-1 bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400"
              />

              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="w-7 h-7 rounded-full bg-[#003B2B] disabled:opacity-40 text-white flex items-center justify-center shrink-0 hover:bg-[#00281d] transition-all cursor-pointer active:scale-95"
                title="Gửi tin nhắn"
              >
                <span className="material-symbols-outlined text-sm">send</span>
              </button>
            </form>

            <div className="mt-1 text-center">
              <span className="text-[9.5px] text-slate-400 flex items-center justify-center gap-1">
                <span className="material-symbols-outlined text-[11px] text-emerald-600">verified_user</span>
                Bảo mật & Trực tiếp qua Backend Service (Cache Redis)
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
