"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useCart } from '@/ui/context/CartContext';
import { useToast } from '@/ui/context/ToastContext';
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

export interface AiChatAction {
  type: 'ADD_TO_CART' | 'BUY_NOW' | 'TRACK_ORDER' | 'VIEW_BOOK';
  bookId?: string;
  bookTitle?: string;
  format?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  suggestedBooks?: SuggestedBookItem[];
  action?: AiChatAction;
}

const QUICK_PROMPTS = [
  'Sách bán chạy nhất',
  'Hướng dẫn đọc Ebook DRM',
  'Thời gian & phí giao hàng',
  'Chính sách đổi trả & hoàn tiền',
];

const AI_SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 phút không hoạt động thì tự động làm mới phiên chat

const DEFAULT_WELCOME_MESSAGE: AIMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Dạ Bé Cáo chào bạn nha! 🦊✨ Mình là trợ lý thủ thư thông thái của sàn sách HUKI.\nMình có thể giúp bạn tìm sách theo thể loại hay ngân sách, tóm tắt nội dung, hướng dẫn đọc Ebook DRM hoặc giải đáp thắc mắc về đơn hàng. Hôm nay bạn cần Bé Cáo hỗ trợ điều gì nè?',
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

export default function FloatingAIChatbox() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const [addingBookId, setAddingBookId] = useState<string | null>(null);
  const [addedBookIds, setAddedBookIds] = useState<Record<string, boolean>>({});
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<AIMessage[]>([DEFAULT_WELCOME_MESSAGE]);

  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const activePrompts = useMemo(() => {
    if (lastAssistantMsg?.suggestedBooks && lastAssistantMsg.suggestedBooks.length > 0) {
      return [
        'Còn cuốn khác không?',
        'Cuốn đầu tiên nói về gì?',
        'Có cuốn nào rẻ hơn không?',
        'Có bản Ebook không?',
      ];
    }
    if (lastAssistantMsg?.content?.includes('giá niêm yết') || lastAssistantMsg?.content?.includes('nói về')) {
      return [
        'Có bản Ebook không?',
        'Tìm sách rẻ hơn đi',
        'Còn cuốn khác không?',
        'Hướng dẫn đọc Ebook DRM',
      ];
    }
    return [
      'Sách nào hay?',
      'Có cuốn nào về kinh doanh không?',
      'Hướng dẫn đọc Ebook DRM',
      'Thời gian & phí giao hàng',
    ];
  }, [lastAssistantMsg]);

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

  const handleAddToCartItem = async (book: SuggestedBookItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    try {
      setAddingBookId(book.id);
      await addToCart({
        id: book.id,
        bookId: book.id,
        title: book.title,
        price: book.price,
        originalPrice: book.originalPrice,
        cover: book.coverUrl,
        format: book.format || 'Sách giấy',
        type: book.format?.toLowerCase().includes('ebook') ? 'ebook' : 'physical',
        storeId: 'huki-official',
      });
      try {
        personalizationService.recordBookInteraction(book.id);
      } catch {}
      setAddedBookIds((prev) => ({ ...prev, [book.id]: true }));
      showToast({
        type: 'success',
        title: 'Đã thêm vào giỏ hàng',
        message: `Cuốn "${book.title}" đã được thêm vào giỏ hàng!`,
      });
      setTimeout(() => {
        setAddedBookIds((prev) => ({ ...prev, [book.id]: false }));
      }, 3000);
    } catch (err) {
      console.error('Lỗi khi thêm giỏ hàng từ chat:', err);
    } finally {
      setAddingBookId(null);
    }
  };

  const handleBuyNowItem = async (book: SuggestedBookItem, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await handleAddToCartItem(book);
    router.push('/cart');
  };

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
        action?: AiChatAction;
        isFallback: boolean;
      }>('/chat/ai', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          sessionId: sessionId || undefined,
          userId: user?.id || undefined,
          currentPage: pathname || undefined,
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
      const action = res.data?.action || (res as any)?.action;

      const assistantMsg: AIMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: replyText,
        suggestedBooks: Array.isArray(suggestedBooks) ? suggestedBooks : undefined,
        action,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if (action?.type === 'ADD_TO_CART' && action.bookId) {
        const bookToAdd = Array.isArray(suggestedBooks)
          ? suggestedBooks.find((b: SuggestedBookItem) => b.id === action.bookId)
          : undefined;
        if (bookToAdd) {
          handleAddToCartItem(bookToAdd);
        }
      }
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
    <aside aria-label="Tư vấn khách hàng HUKI">
      {/* 1. FLOATING SUPPORT TRIGGER BUTTON (Gọn gàng, chuẩn thương mại điện tử) */}
      {!isOpen && (
        <div className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-40 flex items-center pointer-events-auto select-none">
          <button
            type="button"
            onClick={handleOpenChat}
            className="group flex items-center gap-2 bg-[#003B2B] hover:bg-[#00281d] text-white px-3.5 py-2.5 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer active:scale-95 border border-white/20"
            title="Nhắn tin tư vấn & hỗ trợ trực tuyến"
            aria-label="Mở tư vấn HUKI"
          >
            <span className="material-symbols-outlined text-[20px] text-emerald-300 group-hover:scale-110 transition-transform">
              support_agent
            </span>
            <span className="text-xs font-semibold tracking-tight pr-1 hidden sm:inline">
              Tư vấn trực tuyến
            </span>
            <span className="w-2 h-2 rounded-full bg-[#00875A] shrink-0 inline-block" />
          </button>
        </div>
      )}

      {/* 2. CHATBOX POPUP WINDOW (Góc dưới bên phải) */}
      {isOpen && (
        <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-50 w-[92vw] sm:w-[390px] max-w-[430px] h-[550px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200 font-sans">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-[#003B2B] via-[#004d38] to-[#006953] text-white flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px] text-emerald-300">support_agent</span>
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xs tracking-tight">Tư Vấn Khách Hàng HUKI</h3>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00875A] shrink-0 inline-block" />
                </div>
                <p className="text-[10px] text-emerald-200/90 font-medium">
                  Tra cứu sách, đơn hàng &amp; bản quyền DRM
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
                  <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200/70 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <span className="material-symbols-outlined text-[15px] text-[#003B2B]">support_agent</span>
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

                  {/* THẺ SÁCH GỢI Ý BẤM RA NGAY TRANG CHI TIẾT SÁCH HOẶC LÊN ĐƠN TRỰC TIẾP */}
                  {msg.suggestedBooks && msg.suggestedBooks.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col gap-2">
                      <div className="text-[10px] font-bold text-[#003B2B] flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-amber-500">menu_book</span>
                          <span>Sách trong kho HUKI (mua & xem ngay):</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {msg.suggestedBooks.map((book) => (
                          <div
                            key={book.id}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-300 transition-all shadow-2xs group"
                          >
                            <div
                              onClick={() => {
                                try { personalizationService.recordBookInteraction(book.id); } catch {}
                                router.push(`/book/${book.id}`);
                              }}
                              className="flex items-center gap-2.5 cursor-pointer"
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
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="font-bold text-[11px] text-[#003B2B]">
                                    {book.price.toLocaleString('vi-VN')}đ
                                  </span>
                                  {book.format && (
                                    <span className="text-[9px] bg-slate-200/80 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                                      {book.format}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons: Thêm giỏ & Mua ngay */}
                            <div className="flex items-center justify-end gap-1.5 mt-2 pt-2 border-t border-slate-200/60">
                              <button
                                type="button"
                                onClick={(e) => handleAddToCartItem(book, e)}
                                disabled={addingBookId === book.id}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-all cursor-pointer ${
                                  addedBookIds[book.id]
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-emerald-100 text-emerald-900 hover:bg-[#003B2B] hover:text-white'
                                }`}
                                title="Thêm vào giỏ hàng"
                              >
                                <span className="material-symbols-outlined text-[12px]">
                                  {addedBookIds[book.id] ? 'check' : 'add_shopping_cart'}
                                </span>
                                <span>{addedBookIds[book.id] ? 'Đã thêm' : '+ Giỏ hàng'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleBuyNowItem(book, e)}
                                className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#003B2B] hover:bg-[#00281d] text-white flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                                title="Mua ngay cuốn sách này"
                              >
                                <span className="material-symbols-outlined text-[12px]">bolt</span>
                                <span>Mua ngay</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NÚT HÀNH ĐỘNG TRA CỨU ĐƠN HÀNG */}
                  {msg.action?.type === 'TRACK_ORDER' && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-start">
                      <button
                        type="button"
                        onClick={() => router.push('/account/orders')}
                        className="text-[10.5px] font-bold px-3 py-1.5 rounded-lg bg-[#003B2B] hover:bg-[#00281d] text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">local_shipping</span>
                        <span>Xem chi tiết danh sách Đơn hàng ↗</span>
                      </button>
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
                <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200/70 flex items-center justify-center shrink-0 shadow-2xs">
                  <span className="material-symbols-outlined text-[15px] text-[#003B2B]">support_agent</span>
                </div>
                <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl rounded-bl-xs flex items-center gap-1.5 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003B2B] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003B2B] animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#003B2B] animate-bounce [animation-delay:0.4s]" />
                  <span className="text-[11px] text-slate-500 font-medium ml-1">Đang tra cứu hệ thống kho sách...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {activePrompts.map((prompt, idx) => (
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
                placeholder="Tra cứu sách, tác giả, đơn hàng..."
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
