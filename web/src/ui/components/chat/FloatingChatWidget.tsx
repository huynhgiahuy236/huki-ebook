"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useChatSocket } from '@/ui/hooks/useChatSocket';
import { chatService, type ChatMessage, type ChatConversation } from '@/ui/services/chatService';
import { playChatPopSound, playMessageSentSound } from '@/ui/utils/chatSound';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

export interface FloatingChatWidgetProps {
  initialStoreId?: string;
  initialStoreName?: string;
}

export default function FloatingChatWidget({ initialStoreId, initialStoreName }: FloatingChatWidgetProps) {
  const pathname = usePathname() || '';
  const { user } = useAuth();

  // Don't show floating widget on seller/admin/shipper/messages pages where full chat is already active
  const isExcludedRoute =
    pathname.startsWith('/seller') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/shipper') ||
    pathname.startsWith('/account/messages') ||
    pathname.startsWith('/messages');

  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isStoreTyping, setIsStoreTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeStore = useMemo(() => {
    const conv = conversations.find((c) => c.id === activeConversationId);
    return {
      name: conv?.store?.name || conv?.store?.fullName || initialStoreName || 'Cửa Hàng Sách HuKi',
      avatar: conv?.store?.avatar || conv?.store?.logo || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=150&q=80',
      id: conv?.store?.id || initialStoreId || 'store-huki-default',
    };
  }, [conversations, activeConversationId, initialStoreName, initialStoreId]);

  // Load conversations when opened or on mount
  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await chatService.listConversations();
      if (res.success && Array.isArray(res.data)) {
        setConversations(res.data);
        const totalUnread = res.data.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
        setUnreadCount(totalUnread);

        if (res.data.length > 0 && !activeConversationId) {
          setActiveConversationId(res.data[0].id);
        }
      }
    } catch {
      // ignore
    }
  }, [user, activeConversationId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages when active conversation changes
  const loadMessages = useCallback(async (convId: string) => {
    if (!convId) return;
    try {
      const res = await chatService.getMessages(convId);
      if (res.success && Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    }
  }, [activeConversationId, loadMessages]);

  // Socket setup
  const handleMessageReceived = useCallback(
    (msg: ChatMessage) => {
      if (msg.conversationId === activeConversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        setIsStoreTyping(false);
        if (msg.senderType === 'BUSINESS' && isOpen) {
          playChatPopSound();
        }
      } else {
        // Message from another store
        setUnreadCount((prev) => prev + 1);
        if (isOpen) {
          playChatPopSound();
        }
      }
    },
    [activeConversationId, isOpen]
  );

  const handleMessageRead = useCallback(
    (receipt: { conversationId: string; messageIds: string[] }) => {
      if (receipt.conversationId === activeConversationId) {
        setMessages((prev) =>
          prev.map((m) =>
            receipt.messageIds?.includes(m.id) || !receipt.messageIds
              ? { ...m, status: 'READ' }
              : m
          )
        );
      }
    },
    [activeConversationId]
  );

  const handleUserTyping = useCallback(
    (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.conversationId === activeConversationId) {
        setIsStoreTyping(data.isTyping);
        if (data.isTyping) {
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setIsStoreTyping(false);
          }, 3500);
        }
      }
    },
    [activeConversationId]
  );

  const { isConnected, sendMessage, joinConversation, leaveConversation, markAsRead, setTyping } = useChatSocket({
    onMessageReceived: handleMessageReceived,
    onMessageRead: handleMessageRead,
    onUserTyping: handleUserTyping,
  });

  useEffect(() => {
    if (activeConversationId) {
      joinConversation(activeConversationId);
      markAsRead(activeConversationId);
      return () => {
        leaveConversation(activeConversationId);
      };
    }
  }, [activeConversationId, joinConversation, leaveConversation, markAsRead]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStoreTyping]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const content = (customText || messageText).trim();
    if (!content) return;

    if (!activeConversationId) {
      // Auto-create conversation with default store
      try {
        const createRes = await chatService.createConversation({
          storeId: activeStore.id,
          storeName: activeStore.name,
          initialMessage: content,
        });
        if (createRes.success && createRes.data?.data) {
          const newConv = createRes.data.data;
          setConversations((prev) => [newConv, ...prev]);
          setActiveConversationId(newConv.id);
          setMessageText('');
          playMessageSentSound();
          return;
        }
      } catch {
        // fallback
      }
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: activeConversationId,
      senderType: 'USER',
      senderId: user?.id || 'current-user',
      senderName: user?.name || 'Bạn',
      content,
      messageType: 'TEXT',
      status: 'SENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText('');
    setTyping(activeConversationId, false);
    playMessageSentSound();

    try {
      if (isConnected) {
        await sendMessage(activeConversationId, content);
      } else {
        await chatService.sendMessage(activeConversationId, { content });
      }
    } catch {
      // keep optimistic
    }
  };

  const handleTypingInput = (val: string) => {
    setMessageText(val);
    if (!activeConversationId) return;

    setTyping(activeConversationId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(activeConversationId, false);
    }, 2000);
  };

  if (isExcludedRoute) return null;

  return (
    <>
      {/* 1. FLOATING CHAT TRIGGER BUTTON */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
          }}
          className="fixed bottom-44 right-4 sm:bottom-48 sm:right-6 z-40 w-12 h-12 rounded-full bg-[#00875A] hover:bg-[#003B2B] text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-200 cursor-pointer group"
          title="Chat trực tiếp với Shop"
        >
          <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">
            chat
          </span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* 2. LIVE CHAT MODAL WINDOW */}
      {isOpen && (
        <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 w-[92vw] sm:w-96 max-w-[420px] h-[520px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-[#003B2B] text-white px-4 py-3 flex items-center justify-between border-b border-emerald-900 shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <img
                  src={activeStore.avatar}
                  alt={activeStore.name}
                  className="w-8 h-8 rounded-full object-cover border border-emerald-500/50"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#003B2B] absolute -bottom-0.5 -right-0.5"></span>
              </div>
              <div className="leading-tight">
                <h3 className="text-xs font-bold truncate max-w-[170px]">{activeStore.name}</h3>
                <span className="text-[10px] text-emerald-300 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Đang trực tuyến • Sẵn sàng tư vấn</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/account/messages"
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-emerald-200 hover:text-white transition-colors"
                title="Mở toàn màn hình"
              >
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-emerald-200 hover:text-white transition-colors cursor-pointer"
                title="Thu nhỏ"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>

          {/* Quick FAQ / Helper notice */}
          <div className="bg-emerald-50/70 border-b border-emerald-100 px-3 py-1.5 text-[11px] text-emerald-900 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#00875A]">verified</span>
              <span>Shop phản hồi nhanh trong 1-2 phút</span>
            </span>
            <span className="text-[10px] text-emerald-700 font-bold">Live Socket ⚡</span>
          </div>

          {/* Message Stream */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#F8FAFC] text-xs">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400 space-y-2">
                <span className="material-symbols-outlined text-[36px] text-gray-300">forum</span>
                <p className="text-xs font-semibold text-gray-600">Bắt đầu trò chuyện với Shop</p>
                <p className="text-[11px] text-gray-400">
                  Hỏi về tình trạng sách, thời gian ship hoặc xin mã giảm giá trực tiếp.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderType === 'USER';
                const timeStr = msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}
                  >
                    <div
                      className={`max-w-[78%] px-3.5 py-2 rounded-2xl shadow-2xs break-words leading-relaxed ${
                        isMe
                          ? 'bg-[#00875A] text-white rounded-br-xs'
                          : 'bg-white text-gray-800 border border-[#E2E8F0] rounded-bl-xs'
                      }`}
                    >
                      {msg.content}
                    </div>
                    <div className="flex items-center gap-1 text-[9.5px] text-gray-400 px-1">
                      <span>{timeStr}</span>
                      {isMe && (
                        <span className="material-symbols-outlined text-[12px] text-[#00875A]">
                          {msg.status === 'READ' ? 'done_all' : 'done'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Live Typing Indicator */}
            {isStoreTyping && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 italic bg-white border border-gray-200 px-3 py-1.5 rounded-full w-fit shadow-2xs">
                <span className="w-1.5 h-1.5 bg-[#00875A] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[#00875A] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-[#00875A] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-[11px] ml-1">Shop đang soạn tin...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips */}
          <div className="px-3 py-1.5 bg-white border-t border-[#F1F5F9] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {['Sách này còn hàng không shop?', 'Khi nào giao đến nơi?', 'Có mã giảm giá không?'].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleSend(undefined, chip)}
                className="shrink-0 text-[10.5px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => handleTypingInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              className="flex-1 px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-gray-900 focus:outline-hidden focus:border-[#00875A] focus:bg-white"
            />
            <button
              type="submit"
              disabled={!messageText.trim()}
              className="w-8 h-8 rounded-xl bg-[#00875A] hover:bg-[#003B2B] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs shrink-0"
              title="Gửi tin"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
