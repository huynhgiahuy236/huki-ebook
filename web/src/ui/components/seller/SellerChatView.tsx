"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import UserAvatar from '@/ui/components/common/UserAvatar';
import { chatService, type ChatConversation, type ChatMessage } from '@/ui/services/chatService';
import { useChatSocket } from '@/ui/hooks/useChatSocket';
import { playChatPopSound, playMessageSentSound } from '@/ui/utils/chatSound';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

export interface SellerChatMessage {
  id: string | number;
  sender: 'customer' | 'seller';
  text: string;
  time: string;
  status?: 'read' | 'delivered' | 'sent';
  type?: 'text' | 'voucher' | 'order_update' | 'product_card';
  voucherCode?: string;
  discountText?: string;
  orderId?: string;
}

export interface SellerChatCustomer {
  id: string;
  userId?: string;
  name: string;
  tier?: 'VIP Gold' | 'VIP Bạc' | 'Khách mới' | 'VIP Platinum';
  avatar?: string;
  isOnline: boolean;
  lastMsg: string;
  lastTime: string;
  unread: number;
  hasOrder: boolean;
  isVip: boolean;
  orderCount?: number;
  totalSpent?: string;
  orderId?: string;
  orderStatus?: string;
  product?: {
    id?: string;
    title: string;
    price: number;
    format: string;
    cover: string;
  };
}

export interface SellerChatViewProps {
  initialCustomers?: SellerChatCustomer[];
}

export function SellerChatView({ initialCustomers }: SellerChatViewProps) {
  const { showToast } = useToast();
  const { user, activeBusinessId } = useAuth();

  const storeId = activeBusinessId || user?.business?.id || user?.memberships?.[0]?.businessId || '';
  const storeName = user?.business?.name || 'Kênh Người Bán';

  // Danh sách khách hàng hội thoại (trống khi chưa có dữ liệu từ DB/API)
  const [customers, setCustomers] = useState<SellerChatCustomer[]>(initialCustomers || []);
  const [activeCustomerId, setActiveCustomerId] = useState<string>(initialCustomers?.[0]?.id || '');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'orders' | 'vip'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [messageInput, setMessageInput] = useState('');
  const [internalNote, setInternalNote] = useState('');

  // Typing indicators
  const [customerTyping, setCustomerTyping] = useState<Record<string, boolean>>({});
  const customerTypingTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});
  const sellerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Tin nhắn theo từng khách hàng (trống khi chưa có dữ liệu từ DB/API)
  const [messagesByCustomer, setMessagesByCustomer] = useState<Record<string, SellerChatMessage[]>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  // Helper map API message sang SellerChatMessage
  const mapApiMessageToSellerMessage = useCallback((msg: ChatMessage, currentStoreId?: string): SellerChatMessage => {
    const isSeller = msg.senderType === 'BUSINESS' || (Boolean(currentStoreId) && msg.senderId === currentStoreId);
    const timeStr = msg.createdAt
      ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const statusStr: 'read' | 'delivered' | 'sent' =
      msg.status === 'READ' ? 'read' : msg.status === 'DELIVERED' ? 'delivered' : 'sent';

    const typeStr: 'text' | 'voucher' | 'order_update' | 'product_card' =
      msg.messageType === 'VOUCHER'
        ? 'voucher'
        : msg.messageType === 'ORDER'
          ? 'order_update'
          : msg.messageType === 'BOOK'
            ? 'product_card'
            : 'text';

    return {
      id: msg.id,
      sender: isSeller ? 'seller' : 'customer',
      text: msg.content,
      time: timeStr,
      status: statusStr,
      type: typeStr,
      voucherCode: msg.metadata?.voucherCode,
      discountText: msg.metadata?.discountText,
      orderId: msg.metadata?.orderId,
    };
  }, []);

  // 1. Tải danh sách hội thoại từ DB
  useEffect(() => {
    async function loadSellerConversations() {
      if (!storeId) return;
      try {
        const res = await chatService.listConversations(storeId);
        if (res.success && Array.isArray(res.data)) {
          const mapped: SellerChatCustomer[] = res.data.map((conv: ChatConversation) => {
            const custUser = conv.user;
            const contextOrder = conv.context?.type === 'ORDER' ? conv.context.id : undefined;
            return {
              id: conv.id,
              userId: custUser?.id,
              name: custUser?.fullName || 'Khách Hàng',
              avatar: custUser?.avatar,
              tier: 'Khách mới',
              isOnline: true,
              lastMsg: conv.lastMessage?.content || 'Chưa có tin nhắn',
              lastTime: conv.lastMessage?.createdAt
                ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '',
              unread: conv.unreadCount || 0,
              hasOrder: Boolean(contextOrder),
              isVip: false,
              orderId: contextOrder,
              orderStatus: contextOrder ? 'Đang xử lý' : undefined,
            };
          });
          setCustomers(mapped);
          if (mapped.length > 0 && !activeCustomerId) {
            setActiveCustomerId(mapped[0].id);
          }
        }
      } catch (err) {
        console.error('Lỗi tải danh sách khách hàng:', err);
      }
    }
    loadSellerConversations();
  }, [storeId]);

  // 2. Realtime Socket
  const onMessageReceived = useCallback((incomingMsg: any) => {
    const convId = incomingMsg.conversationId || incomingMsg.conversation?._id || incomingMsg.conversation?.id;
    if (!convId) return;

    const sellerMsg = mapApiMessageToSellerMessage(incomingMsg, storeId);

    setMessagesByCustomer((prev) => {
      const list = prev[convId] || [];
      const existingIndex = list.findIndex((m) => String(m.id) === String(incomingMsg.id));
      if (existingIndex !== -1) {
        const next = [...list];
        next[existingIndex] = sellerMsg;
        return { ...prev, [convId]: next };
      }

      if (sellerMsg.sender === 'seller') {
        const optIndex = list.findIndex(
          (m) => m.sender === 'seller' && (String(m.id).startsWith('temp-') || String(m.id).startsWith('voucher-') || String(m.id).startsWith('msg-')) && m.text === sellerMsg.text
        );
        if (optIndex !== -1) {
          const next = [...list];
          next[optIndex] = sellerMsg;
          return { ...prev, [convId]: next };
        }
      }

      return {
        ...prev,
        [convId]: [...list, sellerMsg],
      };
    });

    setCustomers((prev) => {
      const exists = prev.some((c) => c.id === convId);
      if (!exists) {
        const custName = incomingMsg.senderType === 'USER' ? (incomingMsg.senderName || 'Khách Hàng') : 'Khách Hàng';
        const newCust: SellerChatCustomer = {
          id: convId,
          userId: incomingMsg.senderId,
          name: custName,
          avatar: incomingMsg.senderAvatar,
          tier: 'Khách mới',
          isOnline: true,
          lastMsg: incomingMsg.content || '',
          lastTime: new Date(incomingMsg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: convId === activeCustomerId ? 0 : 1,
          hasOrder: false,
          isVip: false,
        };
        return [newCust, ...prev];
      }

      return prev.map((c) => {
        if (c.id === convId) {
          const isCurrentActive = c.id === activeCustomerId;
          return {
            ...c,
            lastMsg: incomingMsg.content || c.lastMsg,
            lastTime: new Date(incomingMsg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: isCurrentActive ? 0 : c.unread + 1,
          };
        }
        return c;
      });
    });

    if (incomingMsg.senderType === 'USER' || incomingMsg.senderType !== 'BUSINESS') {
      playChatPopSound();
      realtimeSyncBus.publish('CHAT_MESSAGE_RECEIVED', {
        messageId: incomingMsg.id,
        conversationId: convId,
      });
      setCustomerTyping((prev) => ({ ...prev, [convId]: false }));
    }

    if (convId === activeCustomerId && incomingMsg.senderType === 'USER') {
      markAsRead(convId, storeId);
    }
  }, [storeId, activeCustomerId, mapApiMessageToSellerMessage]);

  const onMessageRead = useCallback((receipt: any) => {
    if (receipt?.conversationId) {
      setMessagesByCustomer((prev) => {
        const list = prev[receipt.conversationId];
        if (!list) return prev;
        return {
          ...prev,
          [receipt.conversationId]: list.map((m) =>
            m.sender === 'seller' ? { ...m, status: 'read' as const } : m
          ),
        };
      });
    }
  }, []);

  const onUserTyping = useCallback((data: { conversationId: string; userId: string; isTyping: boolean }) => {
    const convId = data.conversationId;
    if (!convId) return;
    setCustomerTyping((prev) => ({ ...prev, [convId]: data.isTyping }));
    if (data.isTyping) {
      if (customerTypingTimeoutRef.current[convId]) {
        clearTimeout(customerTypingTimeoutRef.current[convId]);
      }
      customerTypingTimeoutRef.current[convId] = setTimeout(() => {
        setCustomerTyping((prev) => ({ ...prev, [convId]: false }));
      }, 3500);
    }
  }, []);

  const { isConnected, joinConversation, leaveConversation, sendMessage: sendSocketMessage, markAsRead, setTyping } = useChatSocket({
    storeId,
    onMessageReceived,
    onMessageRead,
    onUserTyping,
  });

  // 3. Tải tin nhắn khi chọn khách hàng
  useEffect(() => {
    if (!activeCustomerId) return;
    async function loadConversationMessages() {
      try {
        const res = await chatService.getMessages(activeCustomerId, { storeId });
        if (res.success && Array.isArray(res.data)) {
          const mapped = res.data.map((m: ChatMessage) => mapApiMessageToSellerMessage(m, storeId));
          setMessagesByCustomer((prev) => ({
            ...prev,
            [activeCustomerId]: mapped,
          }));
          markAsRead(activeCustomerId, storeId);
        }
      } catch (err) {
        console.error('Lỗi tải tin nhắn khách hàng:', err);
      }
    }
    loadConversationMessages();
    joinConversation(activeCustomerId, storeId);
    return () => {
      leaveConversation(activeCustomerId, storeId);
    };
  }, [activeCustomerId, storeId, mapApiMessageToSellerMessage, joinConversation, leaveConversation, markAsRead]);

  // Khách hàng hiện tại đang mở chat
  const currentCustomer = useMemo(() => {
    if (!customers.length) return null;
    return customers.find((c) => c.id === activeCustomerId) || customers[0] || null;
  }, [customers, activeCustomerId]);

  // Tin nhắn của khách hàng hiện tại
  const currentMessages = useMemo(() => {
    return (currentCustomer ? messagesByCustomer[currentCustomer.id] : []) || [];
  }, [messagesByCustomer, currentCustomer]);

  const lastMsg = currentMessages[currentMessages.length - 1];
  const lastMsgKey = lastMsg ? `${lastMsg.id}-${lastMsg.time}` : '';

  // Tự động cuộn xuống dưới cùng khi có tin nhắn mới hoặc chuyển khách hàng
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom('smooth');
    }, 60);
    return () => clearTimeout(timer);
  }, [currentMessages.length, activeCustomerId, lastMsgKey, scrollToBottom]);

  // Bộ lọc danh sách khách hàng
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.orderId && c.orderId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.product && c.product.title.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (filterTab === 'unread') return c.unread > 0;
      if (filterTab === 'orders') return c.hasOrder;
      if (filterTab === 'vip') return c.isVip;
      return true;
    });
  }, [customers, searchQuery, filterTab]);

  // Gửi tin nhắn
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || messageInput).trim();
    if (!content || !currentCustomer) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const tempId = `temp-${Date.now()}`;

    const newMsg: SellerChatMessage = {
      id: tempId,
      sender: 'seller',
      text: content,
      time: timeStr,
      status: 'sent',
      type: 'text',
    };

    setMessagesByCustomer((prev) => ({
      ...prev,
      [currentCustomer.id]: [...(prev[currentCustomer.id] || []), newMsg],
    }));

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === currentCustomer.id ? { ...c, lastMsg: content, lastTime: timeStr, unread: 0 } : c
      )
    );

    setMessageInput('');
    playMessageSentSound();
    setTyping(currentCustomer.id, false, storeId);
    if (sellerTypingTimeoutRef.current) clearTimeout(sellerTypingTimeoutRef.current);

    try {
      if (isConnected) {
        await sendSocketMessage(currentCustomer.id, content, {
          storeId,
          messageType: 'TEXT',
        });
      } else {
        await chatService.sendMessage(currentCustomer.id, {
          content,
          storeId,
          messageType: 'TEXT',
        });
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn seller:', err);
      showToast?.('Không thể gửi tin nhắn. Vui lòng kiểm tra lại kết nối!', 'error');
    }
  };

  const handleTypingInput = (val: string) => {
    setMessageInput(val);
    if (!currentCustomer) return;
    setTyping(currentCustomer.id, true, storeId);
    if (sellerTypingTimeoutRef.current) clearTimeout(sellerTypingTimeoutRef.current);
    sellerTypingTimeoutRef.current = setTimeout(() => {
      setTyping(currentCustomer.id, false, storeId);
    }, 2000);
  };

  // Tặng voucher độc quyền
  const handleSendVoucher = async () => {
    if (!currentCustomer) return;
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const voucherCode = 'HUKIVIP15';
    const discountText = 'Giảm 15% tối đa 50.000đ';
    const content = 'Shop gửi tặng bạn mã Voucher độc quyền giảm 15% cho đơn hàng tiếp theo!';

    const voucherMsg: SellerChatMessage = {
      id: `voucher-${Date.now()}`,
      sender: 'seller',
      text: content,
      time: timeStr,
      status: 'sent',
      type: 'voucher',
      voucherCode,
      discountText,
    };

    setMessagesByCustomer((prev) => ({
      ...prev,
      [currentCustomer.id]: [...(prev[currentCustomer.id] || []), voucherMsg],
    }));

    try {
      if (isConnected) {
        await sendSocketMessage(currentCustomer.id, content, {
          storeId,
          messageType: 'VOUCHER',
          metadata: { voucherCode, discountText },
        });
      } else {
        await chatService.sendMessage(currentCustomer.id, {
          content,
          storeId,
          messageType: 'VOUCHER',
          metadata: { voucherCode, discountText },
        });
      }
      showToast?.(`Đã gửi mã voucher ${voucherCode} đến ${currentCustomer.name}!`, 'success');
    } catch (err) {
      console.error('Lỗi gửi voucher seller:', err);
      showToast?.('Không thể gửi mã voucher. Vui lòng thử lại!', 'error');
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#F8FAFC] text-slate-800 antialiased overflow-hidden font-sans select-none">
      {/* 1. STANDALONE TOP HEADER (SELLER MESSENGER BAR) */}
      <header className="h-14 sm:h-15 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-2xs z-30">
        {/* Left: Brand Logo & Navigation Back to Dashboard */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/seller/dashboard" className="flex items-center gap-2 group">
            <span className="font-editorial text-lg font-black tracking-tight text-[#003B2B] group-hover:text-emerald-700 transition-colors">
              HUKI EBOOK
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[#003B2B] text-white text-[10px] font-extrabold uppercase tracking-wider">
              SELLER CHAT
            </span>
          </Link>

          <span className="h-4 w-px bg-slate-200 hidden sm:block" />

          <Link
            href="/seller/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-800 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Về Kênh Người Bán</span>
          </Link>
        </div>

        {/* Center: Active Shop Identity */}
        <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-slate-50 border border-slate-200/90 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-800">{storeName}</span>
          <span className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Gian Hàng Trực Tuyến
          </span>
        </div>

        {/* Right: Quick Portal Links & User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/"
            target="_blank"
            className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-sm">storefront</span>
            <span>Về Sàn HUKI</span>
          </Link>

          <Link
            href="/seller/products"
            className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-2xs transition-all flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            <span className="hidden sm:inline">Quản Lý Sách</span>
          </Link>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <UserAvatar
              src={user?.avatar}
              name={user?.fullName || storeName}
              size="w-8 h-8"
            />
            <span className="text-xs font-bold text-slate-800 hidden sm:inline max-w-[120px] truncate">
              {user?.fullName || storeName}
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN 3-COLUMN MESSENGER WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* ----------------- COLUMN 1: CUSTOMERS & CONVERSATIONS (LEFT) ----------------- */}
        <aside className={`${activeCustomerId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-88 border-r border-slate-200/90 bg-white flex-col shrink-0 h-full`}>

          {/* Header & Unread Counter */}
          <div className="p-4 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight font-serif">
                Hộp Thư Khách Hàng
              </h2>
              {customers.some((c) => c.unread > 0) && (
                <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold animate-pulse">
                  {customers.filter((c) => c.unread > 0).length} mới
                </span>
              )}
            </div>

            <span className="text-xs text-slate-400 font-medium">
              {customers.length} hội thoại
            </span>
          </div>

          {/* Search Box */}
          <div className="p-3.5 pb-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khách hàng, mã đơn..."
                className="w-full bg-slate-50 border border-slate-200/90 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white font-medium transition-all"
              />
            </div>
          </div>

          {/* Filter Pills (All / Unread / Has Orders / VIP) */}
          <div className="px-3.5 pb-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${filterTab === 'all'
                  ? 'bg-emerald-800 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Tất Cả
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('unread')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${filterTab === 'unread'
                  ? 'bg-rose-600 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              <span>Chưa Đọc</span>
              {customers.filter((c) => c.unread > 0).length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('orders')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${filterTab === 'orders'
                  ? 'bg-emerald-800 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Có Đơn Hàng
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('vip')}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${filterTab === 'vip'
                  ? 'bg-amber-600 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              Khách VIP
            </button>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredCustomers.map((cust) => {
              const isActive = cust.id === activeCustomerId;
              return (
                <div
                  key={cust.id}
                  onClick={() => {
                    setActiveCustomerId(cust.id);
                    // Đánh dấu đã đọc khi click
                    setCustomers((prev) =>
                      prev.map((c) => (c.id === cust.id ? { ...c, unread: 0 } : c))
                    );
                  }}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${isActive
                      ? 'bg-emerald-50/70 border-r-3 border-emerald-700'
                      : 'hover:bg-slate-50'
                    }`}
                >
                  {/* Customer Avatar & Status */}
                  <div className="relative shrink-0">
                    <UserAvatar
                      src={cust.avatar}
                      name={cust.name}
                      size="w-11 h-11"
                    />
                    {cust.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
                    )}
                  </div>

                  {/* Customer Preview Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {cust.name}
                        </span>
                        {cust.tier && (
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded shrink-0 ${cust.tier === 'VIP Gold'
                              ? 'bg-amber-100 text-amber-800'
                              : cust.tier === 'VIP Bạc'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                            {cust.tier}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {cust.lastTime}
                      </span>
                    </div>

                    <p className={`text-xs truncate ${cust.unread > 0 ? 'font-bold text-slate-900' : 'text-slate-500'
                      }`}>
                      {cust.lastMsg}
                    </p>

                    {/* Book Inquired By Customer */}
                    {cust.product && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-800 font-semibold truncate bg-emerald-50/80 px-1.5 py-0.5 rounded">
                        <span className="material-symbols-outlined text-xs shrink-0">menu_book</span>
                        <span className="truncate">{cust.product.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Unread Badge */}
                  {cust.unread > 0 && (
                    <span className="w-4.5 h-4.5 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 self-center">
                      {cust.unread}
                    </span>
                  )}
                </div>
              );
            })}

            {filteredCustomers.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
                <span className="material-symbols-outlined text-3xl">chat_bubble_outline</span>
                <p className="text-xs font-semibold text-slate-700">Chưa có hội thoại nào</p>
                <p className="text-[11px] text-slate-400 max-w-[200px]">Khi khách hàng gửi tin nhắn hoặc hỏi sách, danh sách sẽ hiển thị ở đây.</p>
              </div>
            )}
          </div>

        </aside>

        {/* ----------------- COLUMN 2: ACTIVE CHAT VIEWPORT & TOOLS (CENTER) ----------------- */}
        <main className={`${!activeCustomerId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#F8FAFC] min-w-0 overflow-hidden relative h-full`}>

          {currentCustomer ? (
            <>
              {/* Customer Chat Header Bar */}
              <div className="h-16 bg-white border-b border-slate-200/90 px-4 sm:px-5 flex items-center justify-between shrink-0 shadow-2xs">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveCustomerId('')}
                    className="md:hidden w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-600 -ml-1 mr-0.5 shrink-0 cursor-pointer"
                    title="Quay lại danh sách hội thoại"
                  >
                    <span className="material-symbols-outlined text-xl">arrow_back</span>
                  </button>
                  <div className="relative shrink-0">
                    <UserAvatar
                      src={currentCustomer.avatar}
                      name={currentCustomer.name}
                      size="w-9 h-9 sm:w-10 sm:h-10"
                    />
                    {currentCustomer.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {currentCustomer.name}
                      </h3>
                      {currentCustomer.tier && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          {currentCustomer.tier}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>{currentCustomer.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Header Action Icons */}
                <div className="flex items-center gap-1.5 text-slate-600">
                  <button
                    type="button"
                    onClick={() => showToast?.('Đang kết nối cuộc gọi thoại hỗ trợ...', 'info')}
                    className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                    title="Gọi thoại hỗ trợ"
                  >
                    <span className="material-symbols-outlined text-lg">call</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => showToast?.('Đang kết nối video tư vấn sách...', 'info')}
                    className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                    title="Gọi video"
                  >
                    <span className="material-symbols-outlined text-lg">videocam</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRightPanel(!showRightPanel)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${showRightPanel ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-slate-100'
                      }`}
                    title="Thông tin khách hàng & Đơn hàng"
                  >
                    <span className="material-symbols-outlined text-lg">info</span>
                  </button>
                </div>
              </div>

              {/* Pinned Book Banner (Sản phẩm khách đang hỏi tư vấn) */}
              {currentCustomer.product && (
                <div className="bg-white/95 border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-13 rounded bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-2xs">
                      <img
                        src={currentCustomer.product.cover}
                        alt="Product Cover"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        Sản phẩm khách đang quan tâm:
                      </div>
                      <div className="font-bold text-xs text-slate-900 truncate">
                        {currentCustomer.product.title}
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-700">
                        {currentCustomer.product.price.toLocaleString('vi-VN')} ₫
                        <span className="text-slate-400 font-sans font-normal text-[11px] ml-1.5">
                          ({currentCustomer.product.format})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSendMessage(`Dạ cuốn "${currentCustomer.product?.title}" bên em hiện đang sẵn hàng và đóng gói gửi ngay trong ngày ạ!`)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Báo Còn Hàng
                    </button>
                    <button
                      type="button"
                      onClick={handleSendVoucher}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">confirmation_number</span>
                      <span>Tặng Voucher</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Message Stream History */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Timestamp Divider */}
                <div className="text-center my-2">
                  <span className="px-3 py-1 rounded-full bg-slate-200/70 text-slate-500 text-[11px] font-semibold">
                    Hôm nay, cuộc trò chuyện trực tiếp
                  </span>
                </div>

                {currentMessages.map((msg) => {
                  const isSeller = msg.sender === 'seller';
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${isSeller ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isSeller && (
                        <UserAvatar
                          src={currentCustomer.avatar}
                          name={currentCustomer.name}
                          size="w-7 h-7"
                        />
                      )}

                      <div className={`max-w-[70%] space-y-1.5 ${isSeller ? 'items-end' : 'items-start'}`}>

                        {/* Voucher Special Card */}
                        {msg.type === 'voucher' ? (
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md space-y-2">
                            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider">
                              <span className="material-symbols-outlined text-base">confirmation_number</span>
                              <span>Voucher Độc Quyền Dành Cho Khách Hàng</span>
                            </div>
                            <div className="bg-white/20 p-2 rounded-xl text-center font-mono font-black text-sm tracking-widest border border-white/30">
                              {msg.voucherCode}
                            </div>
                            <p className="text-[11px] text-amber-100">{msg.discountText}</p>
                          </div>
                        ) : (
                          /* Standard Text Bubble */
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${isSeller
                                ? 'bg-emerald-800 text-white rounded-br-xs shadow-xs'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-2xs'
                              }`}
                          >
                            {msg.text}
                          </div>
                        )}

                        <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${isSeller ? 'justify-end' : 'justify-start'
                          }`}>
                          <span>{msg.time}</span>
                          {isSeller && (
                            <span className="flex items-center gap-0.5 text-[9.5px]">
                              {msg.status === 'read' ? (
                                <>
                                  <span className="material-symbols-outlined text-[13px] text-emerald-600 font-bold">
                                    done_all
                                  </span>
                                  <span className="text-emerald-700 font-medium">Đã xem</span>
                                </>
                              ) : msg.status === 'delivered' ? (
                                <>
                                  <span className="material-symbols-outlined text-[13px] text-slate-400 font-bold">
                                    done_all
                                  </span>
                                  <span className="text-slate-400">Đã nhận</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[13px] text-slate-400">
                                    done
                                  </span>
                                  <span className="text-slate-400">Đã gửi</span>
                                </>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Live Typing Indicator */}
                {customerTyping[activeCustomerId] && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 italic bg-white border border-slate-200/80 px-3 py-1.5 rounded-full w-fit shadow-2xs animate-in fade-in">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[11px] font-medium ml-1">Khách hàng đang soạn tin...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />

                {currentMessages.length === 0 && (
                  <div className="py-20 text-center text-slate-400 space-y-2">
                    <span className="material-symbols-outlined text-4xl">mark_chat_unread</span>
                    <p className="text-xs font-semibold">Chưa có tin nhắn nào trong hội thoại này</p>
                    <p className="text-[11px]">Bấm vào các mẫu câu gợi ý bên dưới để bắt đầu tư vấn nhanh</p>
                  </div>
                )}
              </div>

              {/* Quick Seller Action Suggestion Chips (Gợi Ý Phản Hồi Nhanh) */}
              <div className="px-5 py-2 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  Gợi ý:
                </span>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Dạ bên em còn ấn bản kèm bookmark và quà tặng ạ!')}
                  className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-emerald-600 text-[11px] text-slate-700 hover:text-emerald-800 whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  Dạ bên em còn ấn bản kèm bookmark ạ!
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Ebook DRM đã kích hoạt trên Web Reader rồi ạ!')}
                  className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-emerald-600 text-[11px] text-slate-700 hover:text-emerald-800 whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  Ebook DRM đã kích hoạt trên Web Reader rồi ạ!
                </button>
                <button
                  type="button"
                  onClick={() => handleSendMessage('Đơn hàng đang đóng gói và gửi đi trong sáng nay ạ!')}
                  className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-emerald-600 text-[11px] text-slate-700 hover:text-emerald-800 whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  Đơn hàng đang đóng gói và gửi đi ngay ạ!
                </button>
                <button
                  type="button"
                  onClick={handleSendVoucher}
                  className="px-3 py-1 rounded-full bg-amber-50 border border-amber-300 hover:border-amber-500 text-[11px] text-amber-900 font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  Gửi voucher 15% cho khách VIP
                </button>
              </div>

              {/* Message Input Box */}
              <div className="p-4 bg-white border-t border-slate-200/90 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => showToast?.('Tính năng đính kèm ảnh sách từ kho.', 'info')}
                  className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
                  title="Đính kèm ảnh thực tế"
                >
                  <span className="material-symbols-outlined text-xl">image</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendVoucher}
                  className="w-9 h-9 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors cursor-pointer"
                  title="Gửi mã voucher độc quyền"
                >
                  <span className="material-symbols-outlined text-xl">confirmation_number</span>
                </button>

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => handleTypingInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Nhập nội dung tư vấn... (Nhấn Enter để gửi)"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white font-medium transition-all"
                />

                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!messageInput.trim()}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${messageInput.trim()
                      ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                >
                  <span>Gửi</span>
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined text-3xl">chat</span>
              </div>
              <h3 className="text-sm font-bold text-slate-700">Chưa có cuộc trò chuyện nào</h3>
              <p className="text-xs max-w-sm text-slate-500 leading-relaxed">
                Hộp thư hỗ trợ người bán trao đổi trực tiếp với khách hàng, tư vấn ấn bản sách, giải đáp thắc mắc đơn hàng và gửi voucher ưu đãi.
              </p>
            </div>
          )}

        </main>

        {/* ----------------- COLUMN 3: CUSTOMER CRM PANEL (RIGHT) ----------------- */}
        {showRightPanel && currentCustomer && (
          <aside className="hidden xl:flex w-80 lg:w-88 border-l border-slate-200/90 bg-white flex-col shrink-0 overflow-y-auto h-full">

            {/* Customer Big Profile Banner */}
            <div className="p-5 pb-4 text-center border-b border-slate-100 space-y-2">
              <div className="relative inline-block mx-auto">
                <UserAvatar
                  src={currentCustomer.avatar}
                  name={currentCustomer.name}
                  size="w-18 h-18"
                />
                {currentCustomer.isOnline && (
                  <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">{currentCustomer.name}</h4>
                <div className="flex items-center justify-center gap-1.5 mt-0.5">
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase">
                    {currentCustomer.tier || 'Thành Viên'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">#{currentCustomer.id}</span>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-center gap-4 pt-2 text-slate-600">
                <button
                  type="button"
                  onClick={() => showToast?.(`Đang gọi đến khách ${currentCustomer.name}...`, 'info')}
                  className="flex flex-col items-center gap-1 text-[10px] hover:text-emerald-800 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-base">call</span>
                  </div>
                  <span>Gọi Khách</span>
                </button>

                <button
                  type="button"
                  onClick={() => showToast?.('Đã tắt thông báo cho khách hàng này.', 'info')}
                  className="flex flex-col items-center gap-1 text-[10px] hover:text-slate-800 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-base">notifications_off</span>
                  </div>
                  <span>Tắt Báo</span>
                </button>

                <button
                  type="button"
                  onClick={() => showToast?.('Xem lịch sử mua sắm của khách.', 'info')}
                  className="flex flex-col items-center gap-1 text-[10px] hover:text-slate-800 cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
                    <span className="material-symbols-outlined text-base">history</span>
                  </div>
                  <span>Lịch Sử</span>
                </button>
              </div>
            </div>

            {/* CRM Stats (Tổng chi tiêu, số đơn tại shop) */}
            <div className="p-4 border-b border-slate-100 grid grid-cols-2 gap-2 text-center">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-semibold text-slate-400">Đơn thành công:</div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {currentCustomer.orderCount || 0} đơn
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div className="text-[10px] font-semibold text-slate-400">Tổng chi tiêu:</div>
                <div className="text-base font-black text-emerald-800 mt-0.5 font-mono">
                  {currentCustomer.totalSpent || '0 ₫'}
                </div>
              </div>
            </div>

            {/* Đơn Hàng Gần Nhất (Recent Order Card) */}
            {currentCustomer.orderId && (
              <div className="p-4 border-b border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    ĐƠN GẦN NHẤT
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    {currentCustomer.orderStatus}
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-900">
                    <span>#{currentCustomer.orderId}</span>
                    <span className="material-symbols-outlined text-sm text-slate-400">local_shipping</span>
                  </div>

                  {currentCustomer.product && (
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60">
                      <div className="w-8 h-10 rounded bg-white overflow-hidden shrink-0 border border-slate-200">
                        <img src={currentCustomer.product.cover} alt="Book" className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0 text-[11px]">
                        <div className="font-semibold text-slate-800 truncate">{currentCustomer.product.title}</div>
                        <div className="text-slate-400 text-[10px]">{currentCustomer.product.format}</div>
                      </div>
                    </div>
                  )}

                  <Link
                    href={`/seller/orders`}
                    className="block text-center py-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 hover:underline pt-1"
                  >
                    Xem Chi Tiết Đơn Hàng →
                  </Link>
                </div>
              </div>
            )}

            {/* Seller Action Buttons (Tặng Voucher & Hỗ Trợ DRM) */}
            <div className="p-4 border-b border-slate-100 space-y-2">
              <button
                type="button"
                onClick={handleSendVoucher}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-sm">confirmation_number</span>
                <span>Tặng Voucher Độc Quyền</span>
              </button>

              <button
                type="button"
                onClick={() => showToast?.('Chuyển kỹ thuật DRM hỗ trợ thiết bị độc giả.', 'info')}
                className="w-full py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">security</span>
                <span>Chuyên Viên Kỹ Thuật DRM</span>
              </button>
            </div>

            {/* Ghi Chú Nội Bộ Về Khách Hàng (Internal Notes) */}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Ghi chú nội bộ</span>
                <span className="text-[10px] text-slate-400">(Chỉ shop thấy)</span>
              </div>
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="VD: Khách thích bọc chống sốc kỹ, hay mua sách phát triển bản thân..."
                rows={2}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 focus:bg-white resize-none"
              />
              {internalNote && (
                <button
                  type="button"
                  onClick={() => showToast?.('Đã lưu ghi chú nội bộ về khách hàng.', 'success')}
                  className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[10px] font-bold float-right cursor-pointer"
                >
                  Lưu Ghi Chú
                </button>
              )}
            </div>

          </aside>
        )}

      </div>

    </div>
  );
}
export default SellerChatView;
