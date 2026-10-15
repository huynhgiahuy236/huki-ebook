'use client';

import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/ui/context/ToastContext';
import { useCart } from '@/ui/context/CartContext';
import { useAuth } from '@/ui/context/AuthContext';
import UserAvatar from '@/ui/components/common/UserAvatar';
import { chatService, type ChatConversation, type ChatMessage } from '@/ui/services/chatService';
import { useChatSocket } from '@/ui/hooks/useChatSocket';
import { playChatPopSound, playMessageSentSound } from '@/ui/utils/chatSound';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

interface PinnedBook {
  id: string;
  title: string;
  author: string;
  format: string;
  price: number;
  originalPrice: number;
  discount: string;
  cover: string;
}

interface OrderInfo {
  id: string;
  status: string;
  carrier: string;
  total: string;
}

interface Channel {
  id: string;
  storeId?: string;
  name: string;
  type: string;
  typeLabel: string;
  verified: boolean;
  avatar: string;
  isOnline: boolean;
  lastMsg: string;
  lastTime: string;
  unread: number;
  rating: string;
  reviewCount: string;
  responseTime: string;
  pinnedBook?: PinnedBook;
  orderInfo?: OrderInfo;
}

interface MessageItem {
  id: string | number;
  sender: 'user' | 'other';
  text?: string;
  type?: 'voucher' | 'order_status';
  voucherCode?: string;
  discountText?: string;
  minSpend?: string;
  expiry?: string;
  orderId?: string;
  statusText?: string;
  productName?: string;
  time: string;
  status: 'sent' | 'delivered' | 'read';
}

function MessengerContent() {
  const { showToast } = useToast();
  const { addToCart } = useCart();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const targetShopId = searchParams.get('shop') || searchParams.get('storeId') || searchParams.get('contact') || '';
  const targetStoreName = searchParams.get('storeName') || searchParams.get('shopName') || '';
  const targetOrderId = searchParams.get('orderId') || '';
  const targetBookTitle = searchParams.get('bookTitle') || '';
  const targetBookCover = searchParams.get('bookCover') || '';
  const targetBookPrice = searchParams.get('bookPrice') || '';

  // Channels & Messages (lấy từ DB và cập nhật qua Socket)
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [messagesMap, setMessagesMap] = useState<Record<string, MessageItem[]>>({});

  const [activeTabFilter, setActiveTabFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Collapse controls for Left & Right sidebars
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);

  // Accordion states in Right panel (Facebook Messenger style)
  const [expandedSection, setExpandedSection] = useState({
    storeInfo: true,
    media: true,
    privacy: false
  });

  const [messageInput, setMessageInput] = useState('');
  const [isStoreTyping, setIsStoreTyping] = useState(false);
  const storeTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buyerTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [savedVouchers, setSavedVouchers] = useState<Record<string, boolean>>({});
  const [activeCallModal, setActiveCallModal] = useState<'voice' | 'video' | null>(null);
  const [callTimer] = useState('00:24');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  const toggleSection = (section: 'storeInfo' | 'media' | 'privacy') => {
    setExpandedSection(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const activeChannelData = channels.find(c => c.id === activeChannel) || (channels.length > 0 ? channels[0] : null);
  const activeMessages = activeChannelData ? (messagesMap[activeChannelData.id] || []) : [];

  const lastMessage = activeMessages[activeMessages.length - 1];
  const lastMessageKey = lastMessage ? `${lastMessage.id}-${lastMessage.time}` : '';

  // Tự động cuộn xuống dưới cùng khi có tin nhắn mới hoặc chuyển phòng chat
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToBottom('smooth');
    }, 60);
    return () => clearTimeout(timer);
  }, [activeMessages.length, activeChannel, lastMessageKey, scrollToBottom]);

  // 1. Tải danh sách hội thoại từ API và tự động nhảy vào đúng NXB nếu có query param
  useEffect(() => {
    async function loadConversations() {
      try {
        const res = await chatService.listConversations();
        let mapped: Channel[] = [];
        if (res.success && Array.isArray(res.data)) {
          mapped = res.data.map((conv: ChatConversation) => ({
            id: conv.id,
            storeId: conv.store?.id,
            name: conv.store?.name || 'Gian Hàng HUKI',
            type: 'store',
            typeLabel: 'Nhà Xuất Bản',
            verified: true,
            avatar: conv.store?.logo || conv.store?.avatar || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80',
            isOnline: true,
            lastMsg: conv.lastMessage?.content || 'Chưa có tin nhắn',
            lastTime: conv.lastMessage?.createdAt
              ? new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            unread: conv.unreadCount || 0,
            rating: '5.0/5',
            reviewCount: 'CSKH',
            responseTime: '< 5p',
          }));
        }

        // Tự động nhảy vào NXB được chỉ định (FB Messenger style)
        if (targetShopId || targetStoreName) {
          const toSlug = (s?: string) =>
            (s || '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/đ/gi, 'd')
              .toLowerCase()
              .replace(/[^a-z0-9]/g, '');

          const shopSlug = toSlug(targetShopId);
          const nameSlug = toSlug(targetStoreName);

          const matched = mapped.find(c => {
            const cId = String(c.id || '');
            const cStoreId = String(c.storeId || '');
            const cNameSlug = toSlug(c.name);
            const cStoreSlug = toSlug(c.storeId);

            if (targetShopId && (cId === targetShopId || cStoreId === targetShopId)) return true;
            if (shopSlug && (cStoreSlug === shopSlug || cNameSlug === shopSlug)) return true;
            if (nameSlug && (cNameSlug === nameSlug || cStoreSlug === nameSlug)) return true;
            if (shopSlug && (cNameSlug.includes(shopSlug) || shopSlug.includes(cNameSlug))) return true;
            if (nameSlug && (cNameSlug.includes(nameSlug) || nameSlug.includes(cNameSlug))) return true;

            const keywords = [shopSlug, nameSlug].filter(Boolean);
            for (const kw of keywords) {
              const core = kw.replace(/^(nxb|nhaxuatban|store|shop)/, '');
              if (core && core.length >= 3 && (cNameSlug.includes(core) || cStoreSlug.includes(core))) {
                return true;
              }
            }
            return false;
          });

          if (matched) {
            if (targetBookTitle || targetOrderId) {
              matched.pinnedBook = targetBookTitle ? {
                id: 'pinned',
                title: targetBookTitle,
                author: matched.name,
                format: 'Sách In / Ebook',
                price: Number(targetBookPrice) || 0,
                originalPrice: Number(targetBookPrice) || 0,
                discount: '',
                cover: targetBookCover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80',
              } : undefined;
              matched.orderInfo = targetOrderId ? {
                id: targetOrderId,
                status: 'Đơn hàng',
                carrier: 'Vận chuyển nhanh',
                total: '',
              } : undefined;
            }
            setChannels(mapped);
            setActiveChannel(matched.id);
            return;
          }

          // Nếu chưa có cuộc trò chuyện trong DB: Gọi API tạo hoặc lấy sẵn hội thoại với NXB này
          try {
            const createRes = await chatService.createConversation({
              storeId: targetShopId || 'nxb-kim-dong',
              storeName: targetStoreName || 'NXB KIM ĐỒNG',
              contextType: 'ORDER',
              contextId: targetOrderId || 'GENERAL',
            });

            if (createRes.success && createRes.data) {
              const newConv: ChatConversation = (createRes.data as any).data || (createRes.data as any);
              const existingInMapped = mapped.find(c => 
                c.id === newConv.id || 
                (c as any)._id === newConv.id ||
                (newConv.store?.id && (c.storeId === newConv.store.id || c.id === newConv.store.id))
              );
              if (existingInMapped) {
                setChannels(mapped);
                setActiveChannel(existingInMapped.id);
                return;
              }
              const newChannel: Channel = {
                id: newConv.id,
                storeId: newConv.store?.id || targetShopId,
                name: newConv.store?.name || targetStoreName || 'NXB KIM ĐỒNG',
                type: 'store',
                typeLabel: 'Nhà Xuất Bản',
                verified: true,
                avatar: newConv.store?.logo || newConv.store?.avatar || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80',
                isOnline: true,
                lastMsg: 'Bắt đầu cuộc trò chuyện',
                lastTime: 'Vừa xong',
                unread: 0,
                rating: '5.0/5',
                reviewCount: 'CSKH',
                responseTime: '< 5p',
                pinnedBook: targetBookTitle ? {
                  id: 'pinned',
                  title: targetBookTitle,
                  author: targetStoreName || 'Nhà Xuất Bản',
                  format: 'Sách In / Ebook',
                  price: Number(targetBookPrice) || 0,
                  originalPrice: Number(targetBookPrice) || 0,
                  discount: '',
                  cover: targetBookCover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80',
                } : undefined,
                orderInfo: targetOrderId ? {
                  id: targetOrderId,
                  status: 'Đơn hàng',
                  carrier: 'Vận chuyển nhanh',
                  total: '',
                } : undefined,
              };
              setChannels([newChannel, ...mapped]);
              setActiveChannel(newChannel.id);
              return;
            }
          } catch (err) {
            console.warn('Tạo hội thoại ban đầu với NXB:', err);
          }

          // Fallback UI tức thì (tránh trùng lặp nếu mapped đã có channel)
          const similarInMapped = mapped.find(c => {
            const cNameSlug = toSlug(c.name);
            const cStoreSlug = toSlug(c.storeId);
            return (shopSlug && (cStoreSlug === shopSlug || cNameSlug === shopSlug)) ||
                   (nameSlug && (cNameSlug === nameSlug || cStoreSlug === nameSlug));
          });
          if (similarInMapped) {
            setChannels(mapped);
            setActiveChannel(similarInMapped.id);
            return;
          }

          const placeholderChannel: Channel = {
            id: targetShopId || 'temp-store',
            storeId: targetShopId,
            name: targetStoreName || 'NXB KIM ĐỒNG',
            type: 'store',
            typeLabel: 'Nhà Xuất Bản',
            verified: true,
            avatar: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80',
            isOnline: true,
            lastMsg: 'Chưa có tin nhắn',
            lastTime: 'Vừa xong',
            unread: 0,
            rating: '5.0/5',
            reviewCount: 'CSKH',
            responseTime: '< 5p',
            pinnedBook: targetBookTitle ? {
              id: 'pinned',
              title: targetBookTitle,
              author: targetStoreName || 'Nhà Xuất Bản',
              format: 'Sách In / Ebook',
              price: Number(targetBookPrice) || 0,
              originalPrice: Number(targetBookPrice) || 0,
              discount: '',
              cover: targetBookCover || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=160&q=80',
            } : undefined,
            orderInfo: targetOrderId ? {
              id: targetOrderId,
              status: 'Đơn hàng',
              carrier: 'Vận chuyển nhanh',
              total: '',
            } : undefined,
          };
          setChannels([placeholderChannel, ...mapped]);
          setActiveChannel(placeholderChannel.id);
          return;
        }

        setChannels(mapped);
        if (mapped.length > 0 && !activeChannel) {
          setActiveChannel(mapped[0].id);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách hội thoại:', err);
      }
    }
    loadConversations();
  }, [targetShopId, targetStoreName, targetOrderId, targetBookTitle, targetBookCover, targetBookPrice]);

  // 2. Kết nối Socket Realtime
  const { isConnected, joinConversation, leaveConversation, sendMessage: sendSocketMessage, markAsRead, setTyping } = useChatSocket({
    onMessageReceived: (newMsg: ChatMessage) => {
      const convId = String(newMsg.conversationId || (newMsg as any).conversation?._id || (newMsg as any).conversation?.id || '');
      const isMe =
        newMsg.senderType === 'USER' && (
          !newMsg.senderId ||
          newMsg.senderId === user?.id ||
          newMsg.senderId === (user as any)?._id ||
          newMsg.senderId === (user as any)?.sub ||
          activeChannelData?.type === 'store'
        );

      if (!isMe) {
        playChatPopSound();
        setIsStoreTyping(false);
        realtimeSyncBus.publish('CHAT_MESSAGE_RECEIVED', {
          messageId: String(newMsg.id || ''),
          conversationId: convId,
        });
      }

      const item: MessageItem = {
        id: (newMsg.id as any) || (newMsg as any)._id || Date.now(),
        sender: isMe ? 'user' : 'other',
        text: newMsg.content,
        type: newMsg.messageType === 'VOUCHER' ? 'voucher' : (newMsg.messageType === 'ORDER' ? 'order_status' : undefined),
        voucherCode: newMsg.metadata?.voucherCode,
        discountText: newMsg.metadata?.discountText,
        minSpend: newMsg.metadata?.minSpend,
        expiry: newMsg.metadata?.expiry,
        orderId: newMsg.metadata?.orderId,
        statusText: newMsg.metadata?.statusText,
        productName: newMsg.metadata?.productName,
        time: new Date(newMsg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: (newMsg.status?.toLowerCase() as any) || 'read',
      };

      setMessagesMap(prev => {
        const targetKey = (convId && prev[convId]) ? convId : (activeChannel && prev[activeChannel] ? activeChannel : (convId || activeChannel));
        const currentList = prev[targetKey] || [];

        // 1. Kiểm tra nếu tin nhắn với ID thực này đã có trong danh sách -> cập nhật
        const existingIndex = currentList.findIndex(m => String(m.id) === String(item.id));
        if (existingIndex !== -1) {
          const next = [...currentList];
          next[existingIndex] = item;
          return { ...prev, [targetKey]: next };
        }

        // 2. Nếu là tin nhắn từ chính user -> thay thế tin nhắn tạm (optimistic) có cùng nội dung
        if (isMe) {
          const optimisticIndex = currentList.findIndex(
            m => m.sender === 'user' && (String(m.id).startsWith('temp-') || typeof m.id === 'number') && (m.text?.trim() === item.text?.trim() || !item.text)
          );
          if (optimisticIndex !== -1) {
            const next = [...currentList];
            next[optimisticIndex] = item;
            // Lọc bỏ mọi tin nhắn tạm trùng lặp khác (tránh trường hợp người dùng bấm đúp nút gợi ý)
            const deduped = next.filter((m, idx) => idx === optimisticIndex || !(String(m.id).startsWith('temp-') && m.text?.trim() === item.text?.trim()));
            return { ...prev, [targetKey]: deduped };
          }

          // Kiểm tra xem đã có tin nhắn người gửi user với nội dung giống hệt và id trùng chưa
          const hasIdentical = currentList.some(
            m => m.sender === 'user' && m.text?.trim() === item.text?.trim() && String(m.id) === String(item.id)
          );
          if (hasIdentical) return prev;
        }

        return {
          ...prev,
          [targetKey]: [...currentList, item],
        };
      });

      setChannels(prev =>
        prev.map(c =>
            c.id === convId || c.id === activeChannel
            ? { ...c, lastMsg: newMsg.content, lastTime: item.time, unread: activeChannel === convId ? 0 : c.unread + 1 }
            : c
        )
      );

      if (activeChannel === convId) {
        markAsRead(convId);
      }

      setTimeout(() => scrollToBottom('smooth'), 50);
    },
    onMessageRead: (receipt) => {
      setMessagesMap(prev => {
        const msgs = prev[receipt.conversationId];
        if (!msgs) return prev;
        return {
          ...prev,
          [receipt.conversationId]: msgs.map(m => ({ ...m, status: 'read' })),
        };
      });
    },
    onUserTyping: (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.conversationId === activeChannel) {
        setIsStoreTyping(data.isTyping);
        if (data.isTyping) {
          if (storeTypingTimeoutRef.current) clearTimeout(storeTypingTimeoutRef.current);
          storeTypingTimeoutRef.current = setTimeout(() => {
            setIsStoreTyping(false);
          }, 3500);
        }
      }
    },
  });

  // 3. Tải tin nhắn của hội thoại đang mở & join socket room
  useEffect(() => {
    if (!activeChannel) return;
    async function loadMessages() {
      try {
        const res = await chatService.getMessages(activeChannel);
        const rawList: ChatMessage[] = Array.isArray(res.data)
          ? res.data
          : (Array.isArray((res.data as any)?.data)
            ? (res.data as any).data
            : (Array.isArray((res.data as any)?.messages) ? (res.data as any).messages : []));

        if (res.success && rawList) {
          const mappedMsgs: MessageItem[] = rawList.map((m: ChatMessage) => {
            const isMe = m.senderType === 'USER';
            return {
              id: (m.id as any) || (m as any)._id || Math.random().toString(),
              sender: isMe ? 'user' : 'other',
              text: m.content,
              type: m.messageType === 'VOUCHER' ? 'voucher' : (m.messageType === 'ORDER' ? 'order_status' : undefined),
              voucherCode: m.metadata?.voucherCode,
              discountText: m.metadata?.discountText,
              minSpend: m.metadata?.minSpend,
              expiry: m.metadata?.expiry,
              orderId: m.metadata?.orderId,
              statusText: m.metadata?.statusText,
              productName: m.metadata?.productName,
              time: new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: (m.status?.toLowerCase() as any) || 'sent',
            };
          });
          setMessagesMap(prev => ({ ...prev, [activeChannel]: mappedMsgs }));
          setTimeout(() => scrollToBottom('auto'), 80);
        }
      } catch (err) {
        console.error('Lỗi tải tin nhắn:', err);
      }
    }
    loadMessages();
    joinConversation(activeChannel);
    markAsRead(activeChannel);

    return () => {
      leaveConversation(activeChannel);
    };
  }, [activeChannel, joinConversation, leaveConversation, markAsRead, scrollToBottom]);

  // 4. Gửi tin nhắn qua Socket / REST API
  const handleSendMessageWithText = async (textToSend: string) => {
    const content = textToSend.trim();
    if (!content || !activeChannelData) return;

    // Ngăn chặn bấm nút gợi ý liên tục tạo nhiều tin nhắn trùng lặp
    if (isSendingRef.current) return;
    isSendingRef.current = true;
    setTimeout(() => {
      isSendingRef.current = false;
    }, 600);

    const tempId = `temp-${Date.now()}`;
    const newMsg: MessageItem = {
      id: tempId,
      sender: 'user',
      text: content,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
    };

    setMessagesMap(prev => ({
      ...prev,
      [activeChannelData.id]: [...(prev[activeChannelData.id] || []), newMsg],
    }));

    playMessageSentSound();
    setTyping(activeChannelData.id, false);
    if (buyerTypingTimeoutRef.current) clearTimeout(buyerTypingTimeoutRef.current);

    // Cuộn ngay lập tức khi xuất hiện bong bóng tin nhắn tạm
    setTimeout(() => scrollToBottom('smooth'), 40);

    let realConversationId = activeChannelData.id;

    // Nếu cuộc trò chuyện này là tạm thời (chưa có trong DB)
    if (
      activeChannelData.id.startsWith('temp-') ||
      activeChannelData.id === targetShopId ||
      !/^[0-9a-fA-F]{24}$/.test(activeChannelData.id)
    ) {
      try {
        const createRes = await chatService.createConversation({
          storeId: activeChannelData.storeId || targetShopId || 'nxb-kim-dong',
          storeName: activeChannelData.name || targetStoreName || 'NXB KIM ĐỒNG',
          contextType: 'ORDER',
          contextId: targetOrderId || 'GENERAL',
          initialMessage: content,
        });

        if (createRes.success && createRes.data) {
          const createdConv: ChatConversation = (createRes.data as any).data || (createRes.data as any);
          const createdId = createdConv.id;
          realConversationId = createdId;
          setChannels(prev => prev.map(c => c.id === activeChannelData.id ? { ...c, id: createdId } : c));
          setMessagesMap(prev => {
            const currentList = prev[activeChannelData.id] || [];
            const next = { ...prev };
            delete next[activeChannelData.id];
            next[createdId] = currentList;
            return next;
          });
          setActiveChannel(createdId);
          joinConversation(createdId);
          setTimeout(() => scrollToBottom('smooth'), 50);
          return;
        }
      } catch (err) {
        console.error('Lỗi khởi tạo hội thoại khi gửi tin:', err);
      }
    }

    try {
      const serverMsg = await sendSocketMessage(realConversationId, content);
      if (serverMsg) {
        const realId = (serverMsg.id as any) || (serverMsg as any)._id;
        if (realId) {
          setMessagesMap(prev => {
            const list = prev[realConversationId] || prev[activeChannelData.id] || [];
            return {
              ...prev,
              [realConversationId]: list.map(m => m.id === tempId ? { ...m, id: realId, status: 'sent' } : m),
            };
          });
        }
      }
    } catch {
      try {
        const res = await chatService.sendMessage(realConversationId, { content });
        if (res.success && res.data) {
          const msgObj = (res.data as any)?.data || res.data;
          const realId = msgObj?.id || msgObj?._id;
          if (realId) {
            setMessagesMap(prev => {
              const list = prev[realConversationId] || prev[activeChannelData.id] || [];
              return {
                ...prev,
                [realConversationId]: list.map(m => m.id === tempId ? { ...m, id: realId, status: 'sent' } : m),
              };
            });
          }
        }
      } catch (err) {
        console.error('Lỗi gửi tin nhắn qua REST fallback:', err);
      }
    } finally {
      setTimeout(() => scrollToBottom('smooth'), 50);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!messageInput.trim()) return;
    const text = messageInput.trim();
    setMessageInput('');
    await handleSendMessageWithText(text);
  };

  const handleBuyerTypingInput = (val: string) => {
    setMessageInput(val);
    if (!activeChannel) return;
    setTyping(activeChannel, true);
    if (buyerTypingTimeoutRef.current) clearTimeout(buyerTypingTimeoutRef.current);
    buyerTypingTimeoutRef.current = setTimeout(() => {
      setTyping(activeChannel, false);
    }, 2000);
  };

  const handleSaveVoucher = (code?: string) => {
    if (!code) return;
    setSavedVouchers(prev => ({ ...prev, [code]: true }));
    showToast(`Đã lưu mã [${code}] vào kho Voucher của bạn!`, 'success');
  };

  // Filter channels
  const filteredChannels = channels.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTabFilter === 'stores') return matchesSearch && (c.type === 'store' || c.type === 'author');
    if (activeTabFilter === 'readers') return matchesSearch && c.type === 'reader';
    if (activeTabFilter === 'support') return matchesSearch && c.type === 'support';
    return matchesSearch;
  });

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-white select-none font-sans">
      {/* ================= TOP APP HEADER: STANDARD HUKI BRAND & ACTIONS ================= */}
      <header className="h-14 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex flex-col group select-none">
            <span className="font-editorial text-lg md:text-xl font-black tracking-tight text-[#003B2B] leading-none">
              HUKI EBOOK
            </span>
            <span className="text-[7.5px] md:text-[8px] uppercase tracking-widest text-[#ac2c19] font-bold mt-0.5">
              Sách Số &amp; Sách In
            </span>
          </Link>

          <div className="h-4 w-px bg-gray-200 mx-2 hidden sm:block"></div>

          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#003B2B] px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Trang chủ</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/books"
            className="text-xs font-semibold text-gray-600 hover:text-[#003B2B] px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors hidden md:inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">menu_book</span>
            <span>Khám phá sách</span>
          </Link>
          <Link
            href="/cart"
            className="text-xs font-semibold text-gray-600 hover:text-[#003B2B] px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">shopping_cart</span>
            <span>Giỏ hàng</span>
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-2 p-1 pl-1 pr-2.5 rounded-full border border-gray-200 hover:border-[#003B2B] hover:bg-gray-50 transition-all cursor-pointer shadow-2xs group"
            title="Tài khoản cá nhân"
          >
            <UserAvatar user={user} size="sm" />
            <span className="text-xs font-bold text-gray-800 group-hover:text-[#003B2B] max-w-[130px] truncate transition-colors">
              {user?.fullName || user?.name || (user as any)?.username || (user?.email ? user.email.split('@')[0] : 'Tài khoản')}
            </span>
          </Link>
        </div>
      </header>

      {/* ================= 3-COLUMN MESSENGER BODY ================= */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* ================= 1. LEFT COLUMN: CONVERSATION LIST (COLLAPSIBLE) ================= */}
        <aside
          className={`border-r border-gray-200 bg-white flex flex-col shrink-0 transition-all duration-300 relative ${
            isLeftCollapsed ? 'w-[72px]' : 'w-[280px] lg:w-[320px]'
          }`}
        >
          {/* Left Header */}
          <div className="p-3.5 border-b border-gray-100 flex items-center justify-between shrink-0">
            {!isLeftCollapsed && (
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-xl font-bold text-gray-900 tracking-tight">Đoạn chat</h2>
              </div>
            )}

            {/* Toggle Collapse Left Button */}
            <button
              onClick={() => setIsLeftCollapsed(!isLeftCollapsed)}
              className={`p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors ${
                isLeftCollapsed ? 'mx-auto' : ''
              }`}
              title={isLeftCollapsed ? 'Mở rộng danh sách chat' : 'Thu gọn danh sách chat'}
            >
              <span className="material-symbols-outlined text-lg">
                {isLeftCollapsed ? 'chevron_right' : 'menu_open'}
              </span>
            </button>
          </div>

          {/* Search & Tabs (Visible only when expanded) */}
          {!isLeftCollapsed && (
            <div className="p-3 space-y-2.5 border-b border-gray-100 shrink-0">
              {/* Search Bar */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2 text-gray-400 text-lg">search</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm trên Messenger..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-gray-100/80 rounded-xl text-xs focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#006953] transition-all"
                />
              </div>

              {/* Filter Pills (Facebook Messenger style) */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar text-xs">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'stores', label: 'Shop & NXB' },
                  { id: 'readers', label: 'Bạn đọc' },
                  { id: 'support', label: 'Hỗ trợ' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabFilter(tab.id)}
                    className={`px-3 py-1 rounded-full font-semibold transition-all whitespace-nowrap text-xs ${
                      activeTabFilter === tab.id
                        ? 'bg-[#006953] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Channel Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredChannels.map((c) => {
              const isActive = activeChannel === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setActiveChannel(c.id)}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[#006953]/10 text-[#006953]'
                      : 'hover:bg-gray-100 text-gray-800'
                  } ${isLeftCollapsed ? 'justify-center p-2' : ''}`}
                  title={isLeftCollapsed ? c.name : undefined}
                >
                  {/* Avatar with Online Badge */}
                  <div className="relative shrink-0">
                    <img
                      src={c.avatar}
                      alt={c.name}
                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                    />
                    {c.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>

                  {/* Info Text (only when expanded) */}
                  {!isLeftCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`font-bold text-xs sm:text-sm truncate ${isActive ? 'text-[#006953]' : 'text-gray-900'}`}>
                            {c.name}
                          </span>
                          {c.verified && (
                            <span className="material-symbols-outlined text-xs text-[#006953] shrink-0">verified</span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 shrink-0">{c.lastTime}</span>
                      </div>

                      <p className="text-xs text-gray-500 truncate leading-tight">
                        {c.lastMsg}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredChannels.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400 space-y-2">
                <span className="material-symbols-outlined text-3xl text-gray-300">chat_bubble_outline</span>
                <p className="text-xs font-semibold text-gray-700">Chưa có đoạn chat nào</p>
                <p className="text-[11px] text-gray-400 max-w-[200px]">
                  Các cuộc trò chuyện với cửa hàng hoặc độc giả sẽ hiển thị tại đây khi được kết nối.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* ================= 2. MIDDLE COLUMN: SPACIOUS CHAT THREAD ================= */}
        <main className="flex-1 flex flex-col min-w-0 h-full bg-[#f6f8f7] relative">
          
          {activeChannelData ? (
            <>
              {/* Chat Thread Top Header Bar */}
              <div className="h-16 px-6 bg-white border-b border-gray-200 flex items-center justify-between shrink-0 shadow-2xs z-10">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <img
                      src={activeChannelData.avatar}
                      alt={activeChannelData.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200 shrink-0"
                    />
                    {activeChannelData.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>

                  <div className="min-w-0 truncate flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-sm text-gray-900 truncate">{activeChannelData.name}</h3>
                      {activeChannelData.verified && (
                        <span className="material-symbols-outlined text-sm text-[#006953]">verified</span>
                      )}
                      <span className="px-1.5 py-0.2 rounded bg-[#006953]/10 text-[#006953] text-[10px] font-bold">
                        {activeChannelData.typeLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-600 font-medium truncate">
                      {activeChannelData.isOnline ? 'Đang hoạt động' : 'Không hoạt động'}
                    </p>
                  </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setActiveCallModal('voice')}
                    className="p-2 text-gray-500 hover:text-[#006953] hover:bg-gray-100 rounded-full transition-colors"
                    title="Bắt đầu gọi thoại"
                  >
                    <span className="material-symbols-outlined text-xl">call</span>
                  </button>

                  <button
                    onClick={() => setActiveCallModal('video')}
                    className="p-2 text-gray-500 hover:text-[#006953] hover:bg-gray-100 rounded-full transition-colors"
                    title="Bắt đầu gọi video"
                  >
                    <span className="material-symbols-outlined text-xl">videocam</span>
                  </button>

                  {/* Toggle Right Info Panel Button (Facebook Messenger Style) */}
                  <button
                    onClick={() => setShowRightPanel(!showRightPanel)}
                    className={`p-2 rounded-full transition-colors ${
                      showRightPanel
                        ? 'bg-[#006953] text-white shadow-xs'
                        : 'text-gray-500 hover:text-[#006953] hover:bg-gray-100'
                    }`}
                    title={showRightPanel ? 'Đóng bảng thông tin bên phải' : 'Mở bảng thông tin bên phải'}
                  >
                    <span className="material-symbols-outlined text-xl">info</span>
                  </button>
                </div>
              </div>

              {/* Pinned Book Banner (if available) */}
              {activeChannelData.pinnedBook && (
                <div className="px-6 py-2.5 bg-white/90 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between text-xs z-10 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={activeChannelData.pinnedBook.cover}
                      alt={activeChannelData.pinnedBook.title}
                      className="w-8 h-11 object-cover rounded shadow-2xs border shrink-0"
                    />
                    <div className="min-w-0 truncate">
                      <span className="text-[10px] text-gray-400 block font-medium">Sản phẩm đang quan tâm:</span>
                      <strong className="text-gray-900 font-bold truncate block">{activeChannelData.pinnedBook.title}</strong>
                      <span className="font-bold text-[#006953]">{activeChannelData.pinnedBook.price.toLocaleString('vi-VN')} ₫</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/book/${activeChannelData.pinnedBook.id}`}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-xs transition-colors"
                    >
                      Xem Sách
                    </Link>
                    <button
                      onClick={() => {
                        if (activeChannelData.pinnedBook) {
                          addToCart({
                            id: activeChannelData.pinnedBook.id,
                            title: activeChannelData.pinnedBook.title,
                            price: activeChannelData.pinnedBook.price,
                            cover: activeChannelData.pinnedBook.cover,
                            format: 'paperback'
                          });
                          showToast('Đã thêm sách vào giỏ hàng!', 'success');
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#006953] hover:bg-[#00523c] text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">shopping_cart</span>
                      Thêm Giỏ
                    </button>
                  </div>
                </div>
              )}

              {/* Order Info Banner (if available) */}
              {activeChannelData.orderInfo && (
                <div className="px-6 py-2.5 bg-emerald-50/90 border-b border-emerald-200 flex items-center justify-between text-xs shrink-0 z-10">
                  <div className="flex items-center gap-2.5 text-emerald-950 font-medium">
                    <span className="material-symbols-outlined text-base text-emerald-700">receipt_long</span>
                    <span>
                      Đang liên hệ về đơn hàng: <strong className="font-mono text-emerald-900 font-bold">#{activeChannelData.orderInfo.id}</strong>
                    </span>
                  </div>
                  <Link
                    href="/orders"
                    className="text-emerald-800 hover:text-emerald-950 font-bold text-[11px] hover:underline"
                  >
                    Xem Đơn Hàng →
                  </Link>
                </div>
              )}

              {/* Messages Stream */}
              <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {activeMessages.map((msg) => {
                  const isMe = msg.sender === 'user';

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMe && (
                        <img
                          src={activeChannelData.avatar}
                          alt={activeChannelData.name}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                        />
                      )}

                      <div className="max-w-md lg:max-w-xl space-y-1">
                        {/* Normal Text Message */}
                        {msg.text && (
                          <div
                            className={`px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                              isMe
                                ? 'bg-[#006953] text-white rounded-2xl rounded-tr-xs'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-2xl rounded-tl-xs'
                            }`}
                          >
                            <p>{msg.text}</p>
                            <div
                              className={`text-[10px] mt-1 text-right flex items-center justify-end gap-1 ${
                                isMe ? 'text-emerald-100/70' : 'text-gray-400'
                              }`}
                            >
                              <span>{msg.time}</span>
                              {isMe && <span className="material-symbols-outlined text-xs">done_all</span>}
                            </div>
                          </div>
                        )}

                        {/* Voucher Card Message */}
                        {msg.type === 'voucher' && (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 shadow-sm space-y-2.5 max-w-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
                                Voucher Độc Quyền
                              </span>
                              <span className="text-[11px] text-gray-500 font-medium">{msg.expiry}</span>
                            </div>

                            <div>
                              <span className="text-xl font-black text-emerald-900 block">{msg.discountText}</span>
                              <span className="text-xs text-gray-600 font-medium">{msg.minSpend}</span>
                            </div>

                            <button
                              onClick={() => handleSaveVoucher(msg.voucherCode)}
                              disabled={msg.voucherCode ? savedVouchers[msg.voucherCode] : false}
                              className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                msg.voucherCode && savedVouchers[msg.voucherCode]
                                  ? 'bg-emerald-200 text-emerald-800 cursor-default'
                                  : 'bg-[#006953] hover:bg-[#00523c] text-white shadow-sm'
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {msg.voucherCode && savedVouchers[msg.voucherCode] ? 'check_circle' : 'bookmark_add'}
                              </span>
                              {msg.voucherCode && savedVouchers[msg.voucherCode] ? 'ĐÃ LƯU VOUCHER' : `LƯU MÃ [${msg.voucherCode}]`}
                            </button>
                          </div>
                        )}

                        {/* Order Status Message */}
                        {msg.type === 'order_status' && (
                          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-2 max-w-sm">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-gray-800">Đơn #{msg.orderId}</span>
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[11px]">
                                {msg.statusText}
                              </span>
                            </div>

                            <p className="text-xs text-gray-600">{msg.productName}</p>

                            <Link
                              href={`/orders/${msg.orderId}`}
                              className="block w-full py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-center text-xs font-bold text-gray-800 transition-colors"
                            >
                              Tra Cứu Lộ Trình Đơn Hàng →
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Live Store Typing Indicator */}
                {isStoreTyping && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 italic bg-white border border-gray-200 px-3 py-1.5 rounded-full w-fit shadow-2xs animate-in fade-in">
                    <span className="w-1.5 h-1.5 bg-[#00875A] rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-[#00875A] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-[#00875A] rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[11px] ml-1">Shop đang soạn tin...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />

                {activeMessages.length === 0 && (
                  <div className="py-20 text-center text-gray-400 space-y-2">
                    <span className="material-symbols-outlined text-4xl text-gray-300">mark_chat_unread</span>
                    <p className="text-xs font-semibold text-gray-600">Chưa có tin nhắn nào</p>
                    <p className="text-[11px] text-gray-400">Hãy gửi tin nhắn đầu tiên để bắt đầu trò chuyện với shop</p>
                  </div>
                )}
              </div>

              {/* Quick Suggestion Chips */}
              <div className="px-6 py-2 bg-white/80 border-t border-gray-200 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs shrink-0">
                <span className="text-[11px] text-gray-400 shrink-0 font-medium">Gợi ý:</span>
                {activeChannelData.orderInfo && (
                  <button
                    type="button"
                    onClick={() => handleSendMessageWithText(`Dạ em cần hỗ trợ về đơn hàng #${activeChannelData.orderInfo?.id} ạ`)}
                    className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-[#006953] transition-colors whitespace-nowrap text-xs shadow-2xs font-bold cursor-pointer"
                  >
                    Hỗ trợ đơn #{activeChannelData.orderInfo.id}
                  </button>
                )}
                {activeChannelData.pinnedBook && (
                  <button
                    type="button"
                    onClick={() => handleSendMessageWithText(`Sách "${activeChannelData.pinnedBook?.title}" bên mình còn hàng và giao ngay được không ạ?`)}
                    className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-[#006953] transition-colors whitespace-nowrap text-xs shadow-2xs font-bold cursor-pointer"
                  >
                    Sách này còn hàng không shop?
                  </button>
                )}
                {[
                  'Sách còn hàng sẵn không shop?',
                  'Thời gian giao hàng về TP.HCM?',
                  'Thời gian giao hàng về địa chỉ của mình?',
                  'Ebook DRM đọc offline như thế nào?',
                  'Shop tư vấn thêm giúp mình nhé!'
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessageWithText(chip)}
                    className="px-3 py-1 rounded-full bg-white border border-gray-200 hover:border-[#006953] hover:text-[#006953] text-gray-600 transition-colors whitespace-nowrap text-xs shadow-2xs font-medium cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Bottom Chat Input Form */}
              <form
                onSubmit={handleSendMessage}
                className="p-3.5 bg-white border-t border-gray-200 flex items-center gap-2.5 shrink-0"
              >
                <button
                  type="button"
                  onClick={() => showToast('Mở công cụ đính kèm file ảnh & tài liệu', 'info')}
                  className="p-2 text-gray-400 hover:text-[#006953] hover:bg-gray-100 rounded-full transition-colors"
                  title="Đính kèm tệp"
                >
                  <span className="material-symbols-outlined text-xl">add_circle</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMessageInput(prev => prev + ' 😊')}
                  className="p-2 text-gray-400 hover:text-[#006953] hover:bg-gray-100 rounded-full transition-colors"
                  title="Biểu tượng cảm xúc"
                >
                  <span className="material-symbols-outlined text-xl">mood</span>
                </button>

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => handleBuyerTypingInput(e.target.value)}
                  placeholder="Nhập nội dung tin nhắn... (Nhấn Enter để gửi)"
                  className="flex-1 px-4 py-2.5 bg-gray-100 border border-transparent rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-[#006953] focus:bg-white transition-all text-gray-900"
                />

                <button
                  type="submit"
                  disabled={!messageInput.trim()}
                  className="px-4 py-2.5 bg-[#006953] hover:bg-[#00523c] text-white rounded-2xl font-bold text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-30 disabled:hover:bg-[#006953]"
                >
                  <span>Gửi</span>
                  <span className="material-symbols-outlined text-base">send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-3xl">chat</span>
              </div>
              <h3 className="text-sm font-bold text-gray-800">Hộp thư tin nhắn</h3>
              <p className="text-xs max-w-sm text-gray-500 leading-relaxed">
                Bạn chưa chọn hoặc chưa có cuộc trò chuyện nào. Khi bạn nhắn tin với Người bán hoặc NXB từ trang sách, hội thoại sẽ xuất hiện ở đây.
              </p>
            </div>
          )}
        </main>

        {/* ================= 3. RIGHT COLUMN: FACEBOOK MESSENGER STYLE PROFILE & ACCORDION ================= */}
        {showRightPanel && activeChannelData && (
          <aside className="w-[300px] lg:w-[340px] border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-y-auto custom-scrollbar animate-fade-in">
            
            {/* Profile Header (Facebook Messenger style) */}
            <div className="p-6 text-center border-b border-gray-100 flex flex-col items-center">
              <div className="relative mb-3">
                <img
                  src={activeChannelData.avatar}
                  alt={activeChannelData.name}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 shadow-sm"
                />
                {activeChannelData.verified && (
                  <span className="absolute bottom-0 right-0 p-1 bg-[#006953] text-white rounded-full text-xs flex items-center justify-center">
                    <span className="material-symbols-outlined text-[13px]">verified</span>
                  </span>
                )}
              </div>

              <h4 className="font-bold text-base text-gray-900">{activeChannelData.name}</h4>
              <span className="mt-1 px-2.5 py-0.5 rounded-full bg-[#006953]/10 text-[#006953] font-bold text-[11px]">
                {activeChannelData.typeLabel} Chính Hãng
              </span>

              {/* Quick Action Icons */}
              <div className="flex items-center justify-center gap-6 mt-4 pt-2">
                <Link
                  href={`/shop/${activeChannelData.id}`}
                  className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#006953] group"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-[#006953]/10 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-lg">storefront</span>
                  </div>
                  <span className="text-[11px] font-medium">Gian hàng</span>
                </Link>

                <button
                  onClick={() => showToast('Đã tắt thông báo đoạn chat này trong 8 giờ', 'info')}
                  className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#006953] group"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-[#006953]/10 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-lg">notifications_off</span>
                  </div>
                  <span className="text-[11px] font-medium">Tắt báo</span>
                </button>

                <button
                  onClick={() => showToast('Mở tìm kiếm từ khóa trong hội thoại', 'info')}
                  className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#006953] group"
                >
                  <div className="w-9 h-9 rounded-full bg-gray-100 group-hover:bg-[#006953]/10 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-lg">search</span>
                  </div>
                  <span className="text-[11px] font-medium">Tìm kiếm</span>
                </button>
              </div>
            </div>

            {/* Accordion Sections (Facebook Messenger style) */}
            <div className="divide-y divide-gray-100 text-xs">
              
              {/* Section 1: Thông tin shop & Đơn hàng */}
              <div className="p-3">
                <button
                  onClick={() => toggleSection('storeInfo')}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 font-bold text-gray-800 transition-colors"
                >
                  <span>Thông tin &amp; Đơn hàng</span>
                  <span className="material-symbols-outlined text-lg text-gray-400 transition-transform">
                    {expandedSection.storeInfo ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {expandedSection.storeInfo && (
                  <div className="pt-2 px-2 space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 text-[10px] block">Đánh giá</span>
                        <strong className="text-gray-900 font-bold">★ {activeChannelData.rating}</strong>
                      </div>

                      <div className="p-2 rounded-xl bg-gray-50 border border-gray-100">
                        <span className="text-gray-400 text-[10px] block">Phản hồi</span>
                        <strong className="text-emerald-700 font-bold">{activeChannelData.responseTime}</strong>
                      </div>
                    </div>

                    {activeChannelData.orderInfo && (
                      <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-emerald-900">Đơn Gần Nhất</span>
                          <span className="text-[10px] bg-emerald-200 text-emerald-800 font-bold px-1.5 rounded">
                            {activeChannelData.orderInfo.status}
                          </span>
                        </div>
                        <p className="text-gray-600 font-mono text-[11px]">#{activeChannelData.orderInfo.id}</p>
                        <Link
                          href={`/orders/${activeChannelData.orderInfo.id}`}
                          className="block w-full py-1 bg-white border border-emerald-300 text-emerald-800 font-bold rounded text-center text-[11px] hover:bg-emerald-100 transition-colors"
                        >
                          Chi tiết đơn →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 2: File phương tiện và file (Media & Files) */}
              <div className="p-3">
                <button
                  onClick={() => toggleSection('media')}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 font-bold text-gray-800 transition-colors"
                >
                  <span>File phương tiện và file</span>
                  <span className="material-symbols-outlined text-lg text-gray-400 transition-transform">
                    {expandedSection.media ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {expandedSection.media && (
                  <div className="pt-2 px-2 text-center text-gray-400 text-xs py-4">
                    <span className="material-symbols-outlined text-2xl text-gray-300 block mb-1">perm_media</span>
                    <span className="text-[11px]">Chưa có hình ảnh hoặc file đính kèm</span>
                  </div>
                )}
              </div>

              {/* Section 3: Quyền riêng tư và hỗ trợ */}
              <div className="p-3">
                <button
                  onClick={() => toggleSection('privacy')}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 font-bold text-gray-800 transition-colors"
                >
                  <span>Quyền riêng tư và hỗ trợ</span>
                  <span className="material-symbols-outlined text-lg text-gray-400 transition-transform">
                    {expandedSection.privacy ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {expandedSection.privacy && (
                  <div className="pt-2 px-2 space-y-1">
                    <button
                      onClick={() => showToast('Đã gửi báo cáo đoạn chat tới bộ phận kiểm duyệt.', 'info')}
                      className="w-full text-left p-2 rounded hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">report</span>
                      <span>Báo cáo sự cố / vi phạm</span>
                    </button>
                    <button
                      onClick={() => showToast('Đã chuyển tiếp tới bộ phận CSKH HUKI 24/7', 'info')}
                      className="w-full text-left p-2 rounded hover:bg-gray-100 text-gray-700 flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">help</span>
                      <span>Trung tâm trợ giúp HUKI</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Voice / Video Call Modal */}
      {activeCallModal && activeChannelData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-[#18181b] text-white rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border border-zinc-700">
            <div className="relative mx-auto w-24 h-24">
              <img
                src={activeChannelData.avatar}
                alt={activeChannelData.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-xl"
              />
              <span className="absolute inset-0 rounded-full border-4 border-emerald-400 animate-ping opacity-25"></span>
            </div>

            <div>
              <h3 className="font-bold text-lg text-white">{activeChannelData.name}</h3>
              <p className="text-xs text-emerald-400 font-mono mt-1">
                {activeCallModal === 'voice' ? 'Cuộc gọi thoại HUKI' : 'Cuộc gọi Video HD'} • {callTimer}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => showToast('Đã bật/tắt Micro', 'info')}
                className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-xl">mic</span>
              </button>

              <button
                onClick={() => setActiveCallModal(null)}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
              >
                <span className="material-symbols-outlined text-2xl">call_end</span>
              </button>

              <button
                onClick={() => showToast('Đã bật/tắt Camera', 'info')}
                className="w-12 h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-xl">videocam</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessengerPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-white text-[#003B2B]">Đang tải tin nhắn...</div>}>
      <MessengerContent />
    </Suspense>
  );
}
