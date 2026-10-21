"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useToast } from '@/ui/context/ToastContext';
import { useAuth } from '@/ui/context/AuthContext';
import UserAvatar from '@/ui/components/common/UserAvatar';
import { chatService, type ChatConversation, type ChatMessage, type ChatAttachment } from '@/ui/services/chatService';
import { chatQuickReplyService, type QuickReply } from '@/ui/services/chatQuickReplyService';
import { voucherApi, type Voucher } from '@/ui/api/voucherApi';
import { useChatSocket } from '@/ui/hooks/useChatSocket';
import { playChatPopSound, playMessageSentSound } from '@/ui/utils/chatSound';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

export interface SellerChatMessage {
  id: string | number;
  sender: 'customer' | 'seller';
  text: string;
  time: string;
  status?: 'read' | 'delivered' | 'sent';
  type?: 'text' | 'voucher' | 'order_update' | 'product_card' | 'media';
  attachments?: ChatAttachment[];
  voucherId?: string;
  voucherCode?: string;
  discountText?: string;
  minOrderAmount?: number;
  expiresAt?: string;
  orderId?: string;
}

export interface SellerChatCustomer {
  id: string;
  userId?: string;
  storeId?: string;
  name: string;
  email?: string;
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

  const storeAliases = useMemo(() => {
    const ids = new Set<string>();
    if (activeBusinessId) ids.add(activeBusinessId);
    const biz = user?.business as any;
    if (biz?.id) ids.add(biz.id);
    if (biz?.taxCode) ids.add(biz.taxCode);
    if (biz?.slug) ids.add(biz.slug);
    if (Array.isArray(user?.memberships)) {
      user.memberships.forEach((m) => {
        if (m.businessId) ids.add(m.businessId);
      });
    }
    const bizStores = biz?.stores;
    if (Array.isArray(bizStores)) {
      bizStores.forEach((s: any) => {
        if (s.id) ids.add(s.id);
        if (s.slug) ids.add(s.slug);
      });
    }
    return Array.from(ids).filter(Boolean);
  }, [activeBusinessId, user]);

  const storeId = useMemo(() => storeAliases.join(','), [storeAliases]);
  const primaryStoreId = useMemo(() => storeAliases[0] || activeBusinessId || user?.business?.id || '', [storeAliases, activeBusinessId, user]);
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

  // Media upload states for seller
  const [selectedSellerFiles, setSelectedSellerFiles] = useState<File[]>([]);
  const [sellerFilePreviews, setSellerFilePreviews] = useState<Array<{ file: File; url: string; isVideo: boolean; name: string; size: number }>>([]);
  const [isSellerUploading, setIsSellerUploading] = useState(false);
  const [sellerMediaError, setSellerMediaError] = useState<string | null>(null);
  const sellerFileInputRef = useRef<HTMLInputElement>(null);
  const [sellerPreviewMediaUrl, setSellerPreviewMediaUrl] = useState<string | null>(null);

  // Voucher picker modal states
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [shopVouchers, setShopVouchers] = useState<Voucher[]>([]);
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');

  // Quick reply (/mã phím tắt) states (Lưu DB MongoDB + Cache Redis)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isLoadingQuickReplies, setIsLoadingQuickReplies] = useState(false);
  const [isQuickReplyModalOpen, setIsQuickReplyModalOpen] = useState(false);
  const [editingQuickReply, setEditingQuickReply] = useState<QuickReply | null>(null);
  const [quickReplyForm, setQuickReplyForm] = useState({ shortcut: '', title: '', content: '' });
  const [isSavingQuickReply, setIsSavingQuickReply] = useState(false);

  // Slash autocomplete popover states
  const [isSlashOpen, setIsSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashIndex, setSlashIndex] = useState(0);



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
    const aliasList = currentStoreId ? currentStoreId.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const isSeller =
      msg.senderType === 'BUSINESS' ||
      (aliasList.length > 0 && aliasList.includes(msg.senderId)) ||
      (Boolean(currentStoreId) && msg.senderId === currentStoreId);
    const timeStr = msg.createdAt
      ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
    const statusStr: 'read' | 'delivered' | 'sent' =
      msg.status === 'READ' ? 'read' : msg.status === 'DELIVERED' ? 'delivered' : 'sent';

    const typeStr: 'text' | 'voucher' | 'order_update' | 'product_card' | 'media' =
      msg.messageType === 'VOUCHER'
        ? 'voucher'
        : msg.messageType === 'ORDER'
          ? 'order_update'
          : msg.messageType === 'BOOK'
            ? 'product_card'
            : msg.attachments && msg.attachments.length > 0
              ? 'media'
              : 'text';

    return {
      id: msg.id,
      sender: isSeller ? 'seller' : 'customer',
      text: msg.content,
      time: timeStr,
      status: statusStr,
      type: typeStr,
      attachments: msg.attachments,
      voucherId: msg.metadata?.voucherId,
      voucherCode: msg.metadata?.voucherCode || msg.metadata?.code,
      discountText: msg.metadata?.discountText || msg.metadata?.discountDescription,
      minOrderAmount: msg.metadata?.minOrderAmount,
      expiresAt: msg.metadata?.expiresAt,
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
            const contextOrder = (conv.context?.type === 'ORDER' && conv.context.id && conv.context.id !== 'GENERAL') ? conv.context.id : undefined;

            let displayName: string = custUser?.fullName?.trim() || 'Khách Hàng';
            if (displayName.includes('@')) {
              const prefix = displayName.split('@')[0];
              displayName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
            }

            return {
              id: conv.id,
              userId: custUser?.id,
              storeId: conv.store?.id,
              name: displayName,
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

  // File selection for seller
  const handleSellerFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setSellerMediaError(null);
    const valid: File[] = [];
    const previews: Array<{ file: File; url: string; isVideo: boolean; name: string; size: number }> = [];

    for (const f of files) {
      const isImg = f.type.startsWith('image/');
      const isVid = f.type.startsWith('video/');
      if (!isImg && !isVid) {
        setSellerMediaError('Chỉ hỗ trợ tệp hình ảnh hoặc video ngắn.');
        continue;
      }
      if (isImg && f.size > 15 * 1024 * 1024) {
        setSellerMediaError(`Ảnh "${f.name}" vượt quá 15MB.`);
        continue;
      }
      if (isVid && f.size > 30 * 1024 * 1024) {
        setSellerMediaError(`Video "${f.name}" vượt quá 30MB.`);
        continue;
      }
      valid.push(f);
      previews.push({
        file: f,
        url: URL.createObjectURL(f),
        isVideo: isVid,
        name: f.name,
        size: f.size,
      });
    }

    setSelectedSellerFiles((prev) => [...prev, ...valid]);
    setSellerFilePreviews((prev) => [...prev, ...previews]);
    if (sellerFileInputRef.current) sellerFileInputRef.current.value = '';
  };

  const handleRemoveSellerFile = (index: number) => {
    setSelectedSellerFiles((prev) => prev.filter((_, i) => i !== index));
    setSellerFilePreviews((prev) => {
      const target = prev[index];
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // 1. Tải danh sách phím tắt (/mã) từ DB (được cache qua Redis)
  const targetStoreForQuickReply = useMemo(() => {
    return primaryStoreId || (storeAliases.length > 0 ? storeAliases[0] : storeId) || 'store-default';
  }, [primaryStoreId, storeAliases, storeId]);

  const loadQuickReplies = useCallback(async () => {
    if (!targetStoreForQuickReply) return;
    setIsLoadingQuickReplies(true);
    try {
      const res = await chatQuickReplyService.list(targetStoreForQuickReply);
      if (res.success && Array.isArray(res.data)) {
        setQuickReplies(res.data);
      }
    } catch (err) {
      console.warn('Lỗi tải tin nhắn nhanh:', err);
    } finally {
      setIsLoadingQuickReplies(false);
    }
  }, [targetStoreForQuickReply]);

  useEffect(() => {
    loadQuickReplies();
  }, [loadQuickReplies]);

  // Bộ lọc phím tắt khi gõ /
  const filteredQuickReplies = useMemo(() => {
    if (!slashQuery) return quickReplies;
    const q = slashQuery.toLowerCase();
    return quickReplies.filter(
      (qr) =>
        qr.shortcut.toLowerCase().includes(q) ||
        qr.title.toLowerCase().includes(q) ||
        qr.content.toLowerCase().includes(q)
    );
  }, [quickReplies, slashQuery]);

  // Chọn phím tắt từ popover
  const handleSelectQuickReply = (qr: QuickReply) => {
    const words = messageInput.split(/\s+/);
    if (words.length > 0 && words[words.length - 1].startsWith('/')) {
      words.pop();
    }
    const prefix = words.length > 0 ? words.join(' ') + ' ' : '';
    setMessageInput(prefix + qr.content);
    setIsSlashOpen(false);

    if (qr.id || qr._id) {
      chatQuickReplyService.markUsed(qr.id || qr._id || '', targetStoreForQuickReply);
    }
  };

  // Lưu hoặc cập nhật phím tắt trong modal cài đặt
  const handleSaveQuickReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanShortcut = quickReplyForm.shortcut.replace(/^\/+/, '').trim();
    if (!cleanShortcut || !quickReplyForm.title.trim() || !quickReplyForm.content.trim()) {
      showToast?.('Vui lòng điền đầy đủ mã phím tắt, tiêu đề và nội dung.', 'error');
      return;
    }

    setIsSavingQuickReply(true);
    try {
      if (editingQuickReply && (editingQuickReply.id || editingQuickReply._id)) {
        const id = editingQuickReply.id || editingQuickReply._id || '';
        const res = await chatQuickReplyService.update(id, targetStoreForQuickReply, {
          shortcut: cleanShortcut,
          title: quickReplyForm.title.trim(),
          content: quickReplyForm.content.trim(),
        });
        if (res.success) {
          showToast?.(`Đã cập nhật phím tắt /${cleanShortcut} thành công!`, 'success');
          await loadQuickReplies();
          setEditingQuickReply(null);
          setQuickReplyForm({ shortcut: '', title: '', content: '' });
        } else {
          showToast?.(res.error?.message || 'Không thể cập nhật phím tắt.', 'error');
        }
      } else {
        const res = await chatQuickReplyService.create({
          storeId: targetStoreForQuickReply,
          shortcut: cleanShortcut,
          title: quickReplyForm.title.trim(),
          content: quickReplyForm.content.trim(),
        });
        if (res.success) {
          showToast?.(`Đã thêm mới phím tắt /${cleanShortcut} vào hệ thống!`, 'success');
          await loadQuickReplies();
          setQuickReplyForm({ shortcut: '', title: '', content: '' });
        } else {
          showToast?.(res.error?.message || 'Không thể thêm phím tắt.', 'error');
        }
      }
    } catch (err) {
      console.error('Lỗi lưu phím tắt:', err);
      showToast?.('Có lỗi xảy ra khi lưu tin nhắn nhanh.', 'error');
    } finally {
      setIsSavingQuickReply(false);
    }
  };

  // Xóa phím tắt
  const handleDeleteQuickReply = async (id?: string) => {
    if (!id) return;
    try {
      const res = await chatQuickReplyService.delete(id, targetStoreForQuickReply);
      if (res.success) {
        showToast?.('Đã xóa phím tắt thành công.', 'info');
        await loadQuickReplies();
        if (editingQuickReply && (editingQuickReply.id === id || editingQuickReply._id === id)) {
          setEditingQuickReply(null);
          setQuickReplyForm({ shortcut: '', title: '', content: '' });
        }
      }
    } catch (err) {
      console.error('Lỗi xóa phím tắt:', err);
      showToast?.('Không thể xóa phím tắt.', 'error');
    }
  };

  // Open voucher modal & fetch real shop vouchers
  const handleOpenVoucherModal = async () => {
    setIsVoucherModalOpen(true);
    setIsLoadingVouchers(true);
    try {
      const targetStoreId = primaryStoreId || (storeAliases.length > 0 ? storeAliases[0] : storeId);
      if (targetStoreId) {
        const res = await voucherApi.getVouchersByStore(targetStoreId);
        const list = Array.isArray(res.data)
          ? res.data
          : (Array.isArray((res.data as any)?.data)
            ? (res.data as any).data
            : ((res.data as any)?.items || []));
        if (res.success && list.length > 0) {
          setShopVouchers(list);
          setSelectedVoucherId(list[0].id);
          setIsLoadingVouchers(false);
          return;
        }
      }
      const allRes = await voucherApi.getAllVouchers({ scope: 'STORE', status: 'ACTIVE' });
      const fallbackList = Array.isArray(allRes.data)
        ? allRes.data
        : (Array.isArray((allRes.data as any)?.data)
          ? (allRes.data as any).data
          : ((allRes.data as any)?.items || []));
      if (allRes.success && fallbackList.length > 0) {
        setShopVouchers(fallbackList);
        if (fallbackList.length > 0) {
          setSelectedVoucherId(fallbackList[0].id);
        }
      }
    } catch (err) {
      console.error('Lỗi tải danh sách voucher:', err);
    } finally {
      setIsLoadingVouchers(false);
    }
  };

  // Send real voucher to customer
  const handleConfirmSendVoucher = async () => {
    const voucher = shopVouchers.find((v) => v.id === selectedVoucherId) || shopVouchers[0];
    if (!voucher || !currentCustomer) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const voucherCode = voucher.code;
    const discountText = voucher.type === 'PERCENTAGE'
      ? `Giảm ${voucher.value}%${voucher.maxDiscountAmount ? ` tối đa ${(voucher.maxDiscountAmount).toLocaleString('vi-VN')}đ` : ''}`
      : `Giảm ${(voucher.value).toLocaleString('vi-VN')}đ`;
    const content = `Shop gửi tặng bạn mã Voucher độc quyền "${voucherCode}" (${discountText}) cho đơn hàng tiếp theo!`;

    const voucherMsg: SellerChatMessage = {
      id: `voucher-${Date.now()}`,
      sender: 'seller',
      text: content,
      time: timeStr,
      status: 'sent',
      type: 'voucher',
      voucherId: voucher.id,
      voucherCode,
      discountText,
      minOrderAmount: voucher.minOrderAmount,
      expiresAt: voucher.expiresAt,
    };

    setMessagesByCustomer((prev) => ({
      ...prev,
      [currentCustomer.id]: [...(prev[currentCustomer.id] || []), voucherMsg],
    }));

    setIsVoucherModalOpen(false);

    try {
      const metadata = {
        voucherId: voucher.id,
        voucherCode,
        discountText,
        minOrderAmount: voucher.minOrderAmount,
        expiresAt: voucher.expiresAt,
        type: voucher.type,
        value: voucher.value,
      };

      const replyStoreId = currentCustomer?.storeId || primaryStoreId || storeId;
      if (isConnected) {
        await sendSocketMessage(currentCustomer.id, content, {
          storeId: replyStoreId,
          messageType: 'VOUCHER',
          metadata,
        });
      } else {
        await chatService.sendMessage(currentCustomer.id, {
          content,
          storeId: replyStoreId,
          messageType: 'VOUCHER',
          metadata,
        });
      }
      playMessageSentSound();
      showToast?.(`Đã gửi tặng mã voucher ${voucherCode} đến ${currentCustomer.name}!`, 'success');
    } catch (err) {
      console.error('Lỗi gửi voucher seller:', err);
      showToast?.('Không thể gửi mã voucher. Vui lòng thử lại!', 'error');
    }
  };

  // Gửi tin nhắn (Hỗ trợ text và tệp ảnh / video)
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || messageInput).trim();
    const hasFiles = selectedSellerFiles.length > 0;
    if (!content && !hasFiles) return;
    if (!currentCustomer) return;

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const tempId = `temp-${Date.now()}`;

    const optimisticAttachments: ChatAttachment[] = sellerFilePreviews.map((p) => ({
      type: p.isVideo ? 'VIDEO' : 'IMAGE',
      url: p.url,
      name: p.name,
      size: p.size,
    }));

    const hasVideo = sellerFilePreviews.some((p) => p.isVideo);
    const hasImage = sellerFilePreviews.some((p) => !p.isVideo);
    const resolvedType = hasVideo ? 'VIDEO' : hasImage ? 'IMAGE' : 'TEXT';

    const newMsg: SellerChatMessage = {
      id: tempId,
      sender: 'seller',
      text: content || (hasVideo ? '[Video gửi từ shop]' : hasImage ? '[Hình ảnh gửi từ shop]' : ''),
      time: timeStr,
      status: 'sent',
      type: (hasVideo || hasImage) ? 'media' : 'text',
      attachments: optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
    };

    setMessagesByCustomer((prev) => ({
      ...prev,
      [currentCustomer.id]: [...(prev[currentCustomer.id] || []), newMsg],
    }));

    setCustomers((prev) =>
      prev.map((c) =>
        c.id === currentCustomer.id ? { ...c, lastMsg: content || '[Tệp đính kèm]', lastTime: timeStr, unread: 0 } : c
      )
    );

    setMessageInput('');
    playMessageSentSound();
    const replyStoreId = currentCustomer?.storeId || primaryStoreId || storeId;
    setTyping(currentCustomer.id, false, replyStoreId);
    if (sellerTypingTimeoutRef.current) clearTimeout(sellerTypingTimeoutRef.current);

    const filesToUpload = [...selectedSellerFiles];
    setSelectedSellerFiles([]);
    setSellerFilePreviews([]);
    setSellerMediaError(null);

    try {
      if (filesToUpload.length > 0) {
        setIsSellerUploading(true);
        const resolvedContent = content || (hasVideo ? '[Video gửi từ shop]' : hasImage ? '[Hình ảnh gửi từ shop]' : 'Tệp đính kèm');
        const res = await chatService.sendMessage(
          currentCustomer.id,
          {
            content: resolvedContent,
            storeId: replyStoreId,
            messageType: resolvedType,
          },
          filesToUpload
        );
        const sentMsg = (res.data as any)?.data || res.data;
        if (res.success && sentMsg) {
          setMessagesByCustomer((prev) => ({
            ...prev,
            [currentCustomer.id]: (prev[currentCustomer.id] || []).map((m) =>
              m.id === tempId ? mapApiMessageToSellerMessage(sentMsg, storeId) : m
            ),
          }));
        } else {
          showToast?.((res as any)?.message || (res as any)?.error?.message || 'Không thể tải ảnh/video lên máy chủ.', 'error');
          setMessagesByCustomer((prev) => ({
            ...prev,
            [currentCustomer.id]: (prev[currentCustomer.id] || []).filter((m) => m.id !== tempId),
          }));
        }
      } else {
        if (isConnected) {
          await sendSocketMessage(currentCustomer.id, content, {
            storeId: replyStoreId,
            messageType: 'TEXT',
          });
        } else {
          await chatService.sendMessage(currentCustomer.id, {
            content,
            storeId: replyStoreId,
            messageType: 'TEXT',
          });
        }
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn seller:', err);
      showToast?.('Không thể gửi tin nhắn. Vui lòng kiểm tra lại kết nối!', 'error');
    } finally {
      setIsSellerUploading(false);
    }
  };

  const handleTypingInput = (val: string) => {
    setMessageInput(val);
    if (!currentCustomer) return;

    // Phát hiện gõ /mã phím tắt
    const lastWord = val.split(/\s+/).pop() || '';
    if (lastWord.startsWith('/')) {
      const q = lastWord.slice(1).toLowerCase();
      setSlashQuery(q);
      setIsSlashOpen(true);
      setSlashIndex(0);
    } else {
      setIsSlashOpen(false);
    }

    setTyping(currentCustomer.id, true, storeId);
    if (sellerTypingTimeoutRef.current) clearTimeout(sellerTypingTimeoutRef.current);
    sellerTypingTimeoutRef.current = setTimeout(() => {
      setTyping(currentCustomer.id, false, storeId);
    }, 2000);
  };

  return (
    <div className="w-full h-screen flex flex-col bg-[#F8FAFC] text-slate-800 antialiased overflow-hidden font-sans select-none">
      {/* TOP BAR GỌN GÀNG & HIỆN ĐẠI */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <Link
            href="/seller/dashboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#003B2B] hover:text-white text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer shadow-2xs group"
            title="Quay lại Kênh Người Bán"
          >
            <span className="material-symbols-outlined text-sm group-hover:-translate-x-0.5 transition-transform">arrow_back</span>
            <span>Về Kênh Người Bán</span>
          </Link>

          <span className="h-4 w-px bg-slate-200 hidden sm:inline" />

          <h1 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Tin Nhắn Khách Hàng</span>
            {customers.some((c) => c.unread > 0) && (
              <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold animate-pulse">
                {customers.filter((c) => c.unread > 0).length} mới
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700">{storeName}</span>
        </div>
      </header>

      {/* MAIN 3-COLUMN MESSENGER WORKSPACE */}
      <div className="flex-1 flex overflow-hidden">
        {/* ----------------- COLUMN 1: DANH SÁCH HỘI THOẠI (LEFT) ----------------- */}
        <aside className={`${activeCustomerId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-88 border-r border-slate-200 bg-white flex-col shrink-0 h-full`}>

          {/* Search Box & Quick Filter Tabs */}
          <div className="p-3 border-b border-slate-100 space-y-2.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khách hàng, mã đơn..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#003B2B] focus:bg-white font-medium transition-all"
              />
            </div>

            {/* Filter Tabs gọn gàng */}
            <div className="flex items-center gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer text-xs ${
                  filterTab === 'all'
                    ? 'bg-[#003B2B] text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Tất cả ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('unread')}
                className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer text-xs flex items-center justify-center gap-1 ${
                  filterTab === 'unread'
                    ? 'bg-[#003B2B] text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>Chưa đọc</span>
                {customers.filter((c) => c.unread > 0).length > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('orders')}
                className={`flex-1 py-1 rounded-lg text-center transition-all cursor-pointer text-xs ${
                  filterTab === 'orders'
                    ? 'bg-[#003B2B] text-white font-bold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Có đơn
              </button>
            </div>
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
                    setCustomers((prev) =>
                      prev.map((c) => (c.id === cust.id ? { ...c, unread: 0 } : c))
                    );
                  }}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-emerald-50/70 border-l-4 border-l-[#003B2B]'
                      : 'hover:bg-slate-50 bg-white'
                  }`}
                >
                  {/* Customer Avatar & Status */}
                  <div className="relative shrink-0">
                    <UserAvatar
                      src={cust.avatar}
                      name={cust.name}
                      size="w-10 h-10"
                    />
                    {cust.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
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
                          <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded shrink-0 ${
                            cust.tier === 'VIP Gold'
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

                    <p className={`text-xs truncate ${cust.unread > 0 ? 'font-bold text-slate-900' : 'text-slate-500'}`}>
                      {cust.lastMsg}
                    </p>

                    {/* Book Inquired By Customer */}
                    {cust.product && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-800 font-semibold truncate bg-emerald-50 px-1.5 py-0.5 rounded">
                        <span className="material-symbols-outlined text-xs shrink-0">menu_book</span>
                        <span className="truncate">{cust.product.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Unread Badge */}
                  {cust.unread > 0 && (
                    <span className="min-w-4.5 h-4.5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 self-center">
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
                    disabled
                    className="w-9 h-9 rounded-xl opacity-40 cursor-not-allowed pointer-events-none flex items-center justify-center text-slate-400"
                    title="Gọi thoại hỗ trợ (Tính năng đang phát triển)"
                  >
                    <span className="material-symbols-outlined text-lg">call</span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="w-9 h-9 rounded-xl opacity-40 cursor-not-allowed pointer-events-none flex items-center justify-center text-slate-400"
                    title="Gọi video tư vấn (Tính năng đang phát triển)"
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
                      onClick={handleOpenVoucherModal}
                      className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">confirmation_number</span>
                      <span>Tặng Voucher Shop</span>
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
                  const imageAttachments = msg.attachments?.filter((a) => a.type === 'IMAGE') || [];
                  const videoAttachments = msg.attachments?.filter((a) => a.type === 'VIDEO') || [];

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
                          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-md space-y-2 border border-amber-300/40 min-w-[240px]">
                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                              <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                                <span className="material-symbols-outlined text-sm">confirmation_number</span>
                                <span>Voucher Gian Hàng Độc Quyền</span>
                              </span>
                              <span className="text-[10px] text-amber-100">Đã tặng</span>
                            </div>
                            <div className="bg-white/20 p-2 rounded-xl text-center font-mono font-black text-sm tracking-widest border border-dashed border-white/40">
                              {msg.voucherCode || 'HUKIVIP'}
                            </div>
                            <p className="text-[11px] text-amber-50 font-medium">{msg.discountText}</p>
                            {msg.expiresAt && (
                              <div className="flex items-center gap-1 text-[9.5px] text-amber-200">
                                <span className="material-symbols-outlined text-[12px]">schedule</span>
                                <span>HSD: {new Date(msg.expiresAt).toLocaleDateString('vi-VN')}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Standard Text & Media Bubble */
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed ${isSeller
                                ? 'bg-emerald-800 text-white rounded-br-xs shadow-xs'
                                : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-2xs'
                              }`}
                          >
                            {/* Videos */}
                            {videoAttachments.length > 0 && (
                              <div className="space-y-1.5 my-1">
                                {videoAttachments.map((vid, idx) => (
                                  <div key={idx} className="relative rounded-xl overflow-hidden bg-black max-w-[280px]">
                                    <video
                                      src={vid.url}
                                      controls
                                      playsInline
                                      preload="metadata"
                                      className="w-full max-h-56 object-contain rounded-xl"
                                    />
                                    <div className="px-2 py-0.5 bg-black/70 text-[9px] text-white/90 flex items-center justify-between">
                                      <span className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[12px] text-emerald-400">videocam</span>
                                        <span className="truncate max-w-[150px]">{vid.name || 'Video cận cảnh'}</span>
                                      </span>
                                      {vid.size && <span>{(vid.size / (1024 * 1024)).toFixed(1)} MB</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Images */}
                            {imageAttachments.length > 0 && (
                              <div
                                className={`grid gap-1.5 my-1 max-w-[280px] ${
                                  imageAttachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                                }`}
                              >
                                {imageAttachments.map((img, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => setSellerPreviewMediaUrl(img.url)}
                                    className="relative group cursor-pointer overflow-hidden rounded-xl bg-slate-100 border border-black/5"
                                  >
                                    <img
                                      src={img.thumbnail || img.url}
                                      alt={img.name || 'Ảnh đính kèm'}
                                      className="w-full h-32 object-cover transition-transform duration-200 group-hover:scale-105"
                                      loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                      <span className="material-symbols-outlined text-lg">zoom_in</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
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
                  onClick={handleOpenVoucherModal}
                  className="px-3 py-1 rounded-full bg-amber-50 border border-amber-300 hover:border-amber-500 text-[11px] text-amber-900 font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 shadow-2xs"
                >
                  Kho Voucher Shop
                </button>
              </div>

              {/* Selected Files Preview Tray for Seller */}
              {sellerFilePreviews.length > 0 && (
                <div className="px-5 py-2 bg-slate-100 border-t border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {sellerFilePreviews.map((preview, idx) => (
                    <div key={idx} className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-slate-300 bg-white group">
                      {preview.isVideo ? (
                        <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center text-white">
                          <span className="material-symbols-outlined text-[20px] text-emerald-400">play_circle</span>
                          <span className="text-[8px] font-bold">VIDEO</span>
                        </div>
                      ) : (
                        <img src={preview.url} alt={preview.name} className="w-full h-full object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveSellerFile(idx)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs cursor-pointer hover:bg-rose-700"
                        title="Xóa tệp"
                      >
                        <span className="material-symbols-outlined text-[10px]">close</span>
                      </button>
                    </div>
                  ))}
                  <span className="text-[11px] text-slate-600 font-medium">
                    {sellerFilePreviews.length} tệp đính kèm (Ảnh / Video sách)
                  </span>
                </div>
              )}

              {/* Seller Media Error banner */}
              {sellerMediaError && (
                <div className="px-5 py-1.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                  <span>{sellerMediaError}</span>
                  <button type="button" onClick={() => setSellerMediaError(null)} className="font-bold">✕</button>
                </div>
              )}

              {/* Message Input Box */}
              <div className="p-4 bg-white border-t border-slate-200/90 relative">
                {/* 1. SLASH AUTOCOMPLETE POPOVER (/MÃ) */}
                {isSlashOpen && filteredQuickReplies.length > 0 && (
                  <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden z-40 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white px-3.5 py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="material-symbols-outlined text-sm text-indigo-300">bolt</span>
                        <span>Phím Tắt Tin Nhắn Nhanh</span>
                        <span className="text-[10px] text-indigo-300 font-normal">
                          (Dùng ↑ ↓ và Enter để chọn nhanh)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingQuickReply(null);
                          setQuickReplyForm({ shortcut: '', title: '', content: '' });
                          setIsQuickReplyModalOpen(true);
                          setIsSlashOpen(false);
                        }}
                        className="text-[10.5px] text-indigo-200 hover:text-white flex items-center gap-1 underline transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[13px]">tune</span>
                        <span>Cài đặt phím tắt</span>
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 p-1">
                      {filteredQuickReplies.map((qr, idx) => {
                        const isHighlighted = idx === slashIndex;
                        return (
                          <div
                            key={qr.id || qr._id || idx}
                            onClick={() => handleSelectQuickReply(qr)}
                            onMouseEnter={() => setSlashIndex(idx)}
                            className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-start gap-2.5 ${
                              isHighlighted ? 'bg-indigo-50/90 text-indigo-950' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <span className="shrink-0 px-2 py-0.5 rounded-lg bg-indigo-600 text-white font-mono font-black text-xs tracking-wider shadow-2xs">
                              /{qr.shortcut}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs flex items-center gap-2">
                                <span className="truncate">{qr.title}</span>
                                {qr.usageCount !== undefined && qr.usageCount > 0 && (
                                  <span className="text-[9.5px] text-slate-400 font-normal">
                                    • dùng {qr.usageCount} lần
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                                {qr.content}
                              </p>
                            </div>
                            <span className="shrink-0 text-[10px] text-indigo-600 font-bold opacity-0 group-hover:opacity-100 flex items-center">
                              Enter ↵
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5">
                  {/* Hidden file input */}
                  <input
                    ref={sellerFileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleSellerFileSelect}
                    className="hidden"
                  />

                  {/* Button: Đính kèm ảnh / video */}
                  <button
                    type="button"
                    onClick={() => sellerFileInputRef.current?.click()}
                    className="w-9 h-9 rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer"
                    title="Đính kèm ảnh hoặc video cận cảnh sách"
                  >
                    <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                  </button>

                  {/* Button: Tặng voucher shop */}
                  <button
                    type="button"
                    onClick={handleOpenVoucherModal}
                    className="w-9 h-9 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center transition-colors cursor-pointer"
                    title="Chọn voucher của shop để tặng"
                  >
                    <span className="material-symbols-outlined text-xl">confirmation_number</span>
                  </button>

                  {/* Button: Cài đặt phím tắt tin nhắn nhanh (/mã) */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingQuickReply(null);
                      setQuickReplyForm({ shortcut: '', title: '', content: '' });
                      setIsQuickReplyModalOpen(true);
                      setIsSlashOpen(false);
                    }}
                    className="w-9 h-9 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center transition-colors cursor-pointer"
                    title="Cài đặt phím tắt tin nhắn nhanh (/mã)"
                  >
                    <span className="material-symbols-outlined text-xl">tune</span>
                  </button>

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => handleTypingInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (isSlashOpen && filteredQuickReplies.length > 0) {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSlashIndex((prev) => (prev + 1) % filteredQuickReplies.length);
                          return;
                        }
                        if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSlashIndex((prev) => (prev - 1 + filteredQuickReplies.length) % filteredQuickReplies.length);
                          return;
                        }
                        if (e.key === 'Enter' || e.key === 'Tab') {
                          e.preventDefault();
                          const selected = filteredQuickReplies[slashIndex] || filteredQuickReplies[0];
                          if (selected) {
                            handleSelectQuickReply(selected);
                          }
                          return;
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          setIsSlashOpen(false);
                          return;
                        }
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={
                      sellerFilePreviews.length > 0
                        ? "Thêm ghi chú đính kèm... (Gõ / để mở phím tắt)"
                        : "Nhập nội dung tư vấn... (Gõ / để mở phím tắt tin nhắn nhanh)"
                    }
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white font-medium transition-all"
                  />

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={(!messageInput.trim() && sellerFilePreviews.length === 0) || isSellerUploading}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                      (messageInput.trim() || sellerFilePreviews.length > 0) && !isSellerUploading
                        ? 'bg-emerald-800 hover:bg-emerald-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                  >
                    {isSellerUploading ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>Gửi</span>
                        <span className="material-symbols-outlined text-sm">send</span>
                      </>
                    )}
                  </button>
                </div>
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
                  <span className="text-[11px] text-slate-400 font-mono">
                    KH-{(currentCustomer.userId || currentCustomer.id).slice(-6).toUpperCase()}
                  </span>
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
                onClick={handleOpenVoucherModal}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-sm">confirmation_number</span>
                <span>Tặng Voucher Độc Quyền</span>
              </button>

              <button
                type="button"
                disabled
                className="w-full py-2 rounded-xl border border-slate-200 opacity-40 cursor-not-allowed pointer-events-none text-slate-400 font-semibold text-xs flex items-center justify-center gap-1.5"
                title="Chuyên viên kỹ thuật DRM (Tính năng đang phát triển)"
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

      {/* 4. MODAL CHỌN VOUCHER GIAN HÀNG ĐỂ TẶNG */}
      {isVoucherModalOpen && (
        <div
          onClick={() => setIsVoucherModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95"
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-2xl">confirmation_number</span>
                <div>
                  <h3 className="font-bold text-sm">Kho Voucher Gian Hàng Của Bạn</h3>
                  <p className="text-[11px] text-amber-100">
                    Chọn mã giảm giá đang hoạt động để gửi tặng khách {currentCustomer?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-slate-50">
              {isLoadingVouchers ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <span className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></span>
                  <span className="text-xs">Đang tải danh sách voucher thật của shop...</span>
                </div>
              ) : shopVouchers.length === 0 ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">savings</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-800">Chưa có voucher khả dụng</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Gian hàng hiện chưa tạo mã giảm giá hoặc mã đã hết hạn sử dụng.
                    </p>
                  </div>
                  <Link
                    href="/seller/vouchers"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs"
                  >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    <span>Tạo Voucher Gian Hàng Mới</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {shopVouchers.map((v) => {
                    const isSelected = selectedVoucherId === v.id;
                    const discountLabel =
                      v.type === 'PERCENTAGE'
                        ? `Giảm ${v.value}%${v.maxDiscountAmount ? ` tối đa ${(v.maxDiscountAmount).toLocaleString('vi-VN')}đ` : ''}`
                        : `Giảm ${(v.value).toLocaleString('vi-VN')}đ`;

                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVoucherId(v.id)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-500/30 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/20'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <span className="material-symbols-outlined text-lg">local_activity</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs text-slate-900 tracking-wider">
                                {v.code}
                              </span>
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 text-emerald-800">
                                {v.status === 'ACTIVE' ? 'ĐANG CHẠY' : v.status}
                              </span>
                            </div>
                            <p className="text-xs font-bold text-amber-800 mt-0.5">{discountLabel}</p>
                            <div className="flex items-center gap-3 text-[10.5px] text-slate-500 mt-1">
                              {v.minOrderAmount ? (
                                <span>Đơn tối thiểu: {(v.minOrderAmount).toLocaleString('vi-VN')}đ</span>
                              ) : (
                                <span>Mọi giá trị đơn</span>
                              )}
                              {v.expiresAt && (
                                <span>HSD: {new Date(v.expiresAt).toLocaleDateString('vi-VN')}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <input
                            type="radio"
                            name="selectedVoucher"
                            checked={isSelected}
                            onChange={() => setSelectedVoucherId(v.id)}
                            className="w-4 h-4 text-amber-600 focus:ring-amber-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between">
              <Link
                href="/seller/vouchers"
                className="text-xs text-slate-500 hover:text-emerald-700 font-medium flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">settings</span>
                <span>Quản lý kho voucher</span>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSendVoucher}
                  disabled={!selectedVoucherId || shopVouchers.length === 0}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                  <span>Gửi Tặng Khách Hàng</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. FULLSCREEN LIGHTBOX PREVIEW MODAL CHO SELLER */}
      {sellerPreviewMediaUrl && (
        <div
          onClick={() => setSellerPreviewMediaUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={sellerPreviewMediaUrl}
              alt="Phóng to ảnh"
              className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={sellerPreviewMediaUrl}
                download="huki-seller-media"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Tải ảnh gốc</span>
              </a>
              <button
                type="button"
                onClick={() => setSellerPreviewMediaUrl(null)}
                className="px-4 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL CÀI ĐẶT TIN NHẮN NHANH (/PHÍM TẮT) (LƯU DB MONGODB + CACHE REDIS) */}
      {isQuickReplyModalOpen && (
        <div
          onClick={() => setIsQuickReplyModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl text-indigo-300">tune</span>
                </div>
                <div>
                  <h3 className="font-bold text-sm">Cài Đặt Tin Nhắn Nhanh (/phím tắt)</h3>
                  <p className="text-[11px] text-indigo-200">
                    Cấu hình các mẫu câu phản hồi tự động (Lưu vĩnh viễn trên Database và Cache Redis tốc độ cao)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickReplyModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-slate-50">
              {/* Form Thêm mới / Sửa phím tắt */}
              <form onSubmit={handleSaveQuickReply} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-indigo-600">
                      {editingQuickReply ? 'edit_note' : 'add_circle'}
                    </span>
                    <span>{editingQuickReply ? `Chỉnh sửa phím tắt /${editingQuickReply.shortcut}` : 'Thêm phím tắt tin nhắn mới'}</span>
                  </span>
                  {editingQuickReply && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingQuickReply(null);
                        setQuickReplyForm({ shortcut: '', title: '', content: '' });
                      }}
                      className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Hủy chỉnh sửa
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Mã phím tắt (gõ /mã để dùng):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-mono font-bold text-indigo-600">/</span>
                      <input
                        type="text"
                        value={quickReplyForm.shortcut}
                        onChange={(e) => setQuickReplyForm({ ...quickReplyForm, shortcut: e.target.value.replace(/^\/+/, '') })}
                        placeholder="chao, ship, voucher..."
                        required
                        className="w-full pl-6 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tiêu đề ngắn gợi nhớ:
                    </label>
                    <input
                      type="text"
                      value={quickReplyForm.title}
                      onChange={(e) => setQuickReplyForm({ ...quickReplyForm, title: e.target.value })}
                      placeholder="Chào khách hàng, Báo còn hàng..."
                      required
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Nội dung tin nhắn mẫu đầy đủ:
                  </label>
                  <textarea
                    value={quickReplyForm.content}
                    onChange={(e) => setQuickReplyForm({ ...quickReplyForm, content: e.target.value })}
                    placeholder="Nhập nội dung tin nhắn sẽ tự động điền khi gõ /mã..."
                    rows={3}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600 focus:bg-white font-normal"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingQuickReply}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {isSavingQuickReply ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">save</span>
                    )}
                    <span>{editingQuickReply ? 'Lưu Thay Đổi' : 'Thêm Phím Tắt'}</span>
                  </button>
                </div>
              </form>

              {/* Danh sách các phím tắt hiện có */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Danh Sách Phím Tắt Của Gian Hàng ({quickReplies.length})</span>
                  <span className="text-[10.5px] text-slate-400 font-normal">
                    Lưu trên DB + Cache Redis
                  </span>
                </div>

                {isLoadingQuickReplies ? (
                  <div className="py-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-xs">Đang tải phím tắt từ hệ thống...</span>
                  </div>
                ) : quickReplies.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
                    Chưa có phím tắt nào. Hãy tạo phím tắt đầu tiên ở form trên.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {quickReplies.map((qr) => (
                      <div
                        key={qr.id || qr._id}
                        className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs flex items-start justify-between gap-3 hover:border-indigo-300 transition-colors"
                      >
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono font-black text-xs">
                              /{qr.shortcut}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{qr.title}</span>
                            {qr.usageCount !== undefined && qr.usageCount > 0 && (
                              <span className="text-[10px] text-slate-400">
                                • {qr.usageCount} lượt dùng
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                            {qr.content}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingQuickReply(qr);
                              setQuickReplyForm({
                                shortcut: qr.shortcut,
                                title: qr.title,
                                content: qr.content,
                              });
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa phím tắt"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteQuickReply(qr.id || qr._id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa phím tắt"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-emerald-600">bolt</span>
                <span>Gõ <strong>/</strong> trong ô chat để gọi nhanh các mẫu câu trên</span>
              </span>
              <button
                type="button"
                onClick={() => setIsQuickReplyModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
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
export default SellerChatView;
