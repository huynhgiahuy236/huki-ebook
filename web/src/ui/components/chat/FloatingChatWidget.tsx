"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { useToast } from '@/ui/context/ToastContext';
import { useChatSocket } from '@/ui/hooks/useChatSocket';
import { chatService, type ChatMessage, type ChatConversation, type ChatAttachment } from '@/ui/services/chatService';
import { voucherApi } from '@/ui/api/voucherApi';
import { playChatPopSound, playMessageSentSound } from '@/ui/utils/chatSound';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';

export interface FloatingChatWidgetProps {
  initialStoreId?: string;
  initialStoreName?: string;
}

interface FilePreviewItem {
  file: File;
  url: string;
  isVideo: boolean;
  name: string;
  size: number;
}

export default function FloatingChatWidget({ initialStoreId, initialStoreName }: FloatingChatWidgetProps) {
  const { showToast } = useToast();
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

  // Media files attachment states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreviewItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Fullscreen Lightbox for image viewing
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Voucher claim & copy states
  const [savedVouchers, setSavedVouchers] = useState<Record<string, boolean>>({});
  const [claimingVoucherId, setClaimingVoucherId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeStore = useMemo(() => {
    const conv = conversations.find((c) => c.id === activeConversationId);
    return {
      name: conv?.store?.name || conv?.store?.fullName || initialStoreName || 'Cửa Hàng Sách HuKi',
      avatar: conv?.store?.avatar || conv?.store?.logo || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=150&q=80',
      id: conv?.store?.id || initialStoreId || 'store-huki-default',
    };
  }, [conversations, activeConversationId, initialStoreName, initialStoreId]);

  // Load user's saved wallet vouchers to track claimed state
  useEffect(() => {
    if (!user) return;
    voucherApi.getWalletVouchers()
      .then((res) => {
        if (res.success && res.data) {
          const map: Record<string, boolean> = {};
          const all = [
            ...(res.data.platform?.all || []),
            ...(res.data.platform?.freeship || []),
            ...(res.data.platform?.discount || []),
          ];
          all.forEach((v) => {
            if (v.id) map[v.id] = true;
            if (v.code) map[v.code] = true;
          });
          setSavedVouchers(map);
        }
      })
      .catch(() => {});
  }, [user]);

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
  }, [messages, isStoreTyping, filePreviews.length]);

  // File selection & validation
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setMediaError(null);
    const validFiles: File[] = [];
    const newPreviews: FilePreviewItem[] = [];

    for (const file of files) {
      const isImg = file.type.startsWith('image/');
      const isVid = file.type.startsWith('video/');

      if (!isImg && !isVid) {
        setMediaError('Chỉ hỗ trợ đính kèm tệp hình ảnh hoặc video ngắn.');
        continue;
      }

      // Max size: 15MB for images, 30MB for videos
      if (isImg && file.size > 15 * 1024 * 1024) {
        setMediaError(`Ảnh "${file.name}" vượt quá 15MB.`);
        continue;
      }
      if (isVid && file.size > 30 * 1024 * 1024) {
        setMediaError(`Video "${file.name}" vượt quá 30MB.`);
        continue;
      }

      validFiles.push(file);
      newPreviews.push({
        file,
        url: URL.createObjectURL(file),
        isVideo: isVid,
        name: file.name,
        size: file.size,
      });
    }

    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      const target = prev[index];
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Claim voucher into user wallet
  const handleClaimVoucher = async (voucherId?: string, voucherCode?: string) => {
    const idToUse = voucherId || voucherCode;
    if (!idToUse) return;

    setClaimingVoucherId(idToUse);
    try {
      if (voucherId) {
        await voucherApi.saveVoucher(voucherId);
      }
      setSavedVouchers((prev) => ({
        ...prev,
        [idToUse]: true,
        ...(voucherCode ? { [voucherCode]: true } : {}),
      }));
      playChatPopSound();
      realtimeSyncBus.publish('VOUCHER_CLAIMED', { voucherId, voucherCode });
    } catch (err) {
      console.error('Lỗi khi lưu voucher:', err);
    } finally {
      setClaimingVoucherId(null);
    }
  };

  // Copy voucher code
  const handleCopyCode = (code: string) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const content = (customText || messageText).trim();
    const hasFiles = selectedFiles.length > 0;

    if (!content && !hasFiles) return;

    let targetConvId = activeConversationId;

    if (!targetConvId) {
      // Auto-create conversation with default store
      try {
        const createRes = await chatService.createConversation({
          storeId: activeStore.id,
          storeName: activeStore.name,
          initialMessage: content || 'Xin chào shop!',
        });
        if (createRes.success && (createRes.data as any)) {
          const newConv = (createRes.data as any).data || createRes.data;
          if (newConv?.id) {
            setConversations((prev) => [newConv, ...prev]);
            setActiveConversationId(newConv.id);
            targetConvId = newConv.id;
          }
        }
      } catch {
        // fallback
      }
    }

    if (!targetConvId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticAttachments: ChatAttachment[] = filePreviews.map((p) => ({
      type: p.isVideo ? 'VIDEO' : 'IMAGE',
      url: p.url,
      name: p.name,
      size: p.size,
    }));

    const hasVideo = filePreviews.some((p) => p.isVideo);
    const hasImage = filePreviews.some((p) => !p.isVideo);
    const resolvedType = hasVideo ? 'VIDEO' : hasImage ? 'IMAGE' : 'TEXT';

    const optimisticMsg: ChatMessage = {
      id: tempId,
      conversationId: targetConvId,
      senderType: 'USER',
      senderId: user?.id || 'current-user',
      senderName: user?.name || 'Bạn',
      content: content || (hasVideo ? '[Video đính kèm]' : hasImage ? '[Hình ảnh đính kèm]' : ''),
      messageType: resolvedType,
      attachments: optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setMessageText('');
    setTyping(targetConvId, false);
    playMessageSentSound();

    const filesToUpload = [...selectedFiles];
    setSelectedFiles([]);
    setFilePreviews([]);
    setMediaError(null);

    try {
      if (filesToUpload.length > 0) {
        setIsUploading(true);
        const res = await chatService.sendMessage(
          targetConvId,
          {
            content: content || (hasVideo ? '[Video đính kèm]' : hasImage ? '[Hình ảnh đính kèm]' : 'Tệp đính kèm'),
            messageType: resolvedType,
          },
          filesToUpload
        );
        const sentMsg = (res.data as any)?.data || res.data;
        if (res.success && sentMsg) {
          setMessages((prev) => prev.map((m) => (m.id === tempId ? sentMsg : m)));
        } else {
          showToast?.((res as any)?.message || (res as any)?.error?.message || 'Không thể tải ảnh/video lên máy chủ.', 'error');
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
        }
      } else {
        if (isConnected) {
          await sendMessage(targetConvId, content);
        } else {
          await chatService.sendMessage(targetConvId, { content });
        }
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn buyer:', err);
    } finally {
      setIsUploading(false);
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
        <div className="fixed bottom-4 right-3 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[410px] max-w-[440px] h-[550px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                  Hỏi về tình trạng sách, ảnh thực tế, gửi video kiểm tra sách hoặc xin mã giảm giá.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderType === 'USER';
                const timeStr = msg.createdAt
                  ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';
                const isVoucher = msg.messageType === 'VOUCHER';
                const vCode = msg.metadata?.voucherCode || msg.metadata?.code;
                const vId = msg.metadata?.voucherId || vCode;
                const isVoucherSaved = vId ? savedVouchers[vId] || (vCode ? savedVouchers[vCode] : false) : false;

                const imageAttachments = msg.attachments?.filter((a) => a.type === 'IMAGE') || [];
                const videoAttachments = msg.attachments?.filter((a) => a.type === 'VIDEO') || [];

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    {/* 1. VOUCHER INTERACTIVE CARD */}
                    {isVoucher ? (
                      <div className="w-[85%] max-w-[280px] p-3.5 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white shadow-md border border-amber-300/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                            <span className="material-symbols-outlined text-[13px]">confirmation_number</span>
                            <span>VOUCHER TẶNG BẠN</span>
                          </span>
                          <span className="text-[9.5px] text-amber-100 font-bold">ĐỘC QUYỀN SHOP</span>
                        </div>

                        {/* Code box */}
                        <div className="bg-white/15 backdrop-blur-xs p-2.5 rounded-xl border border-dashed border-white/40 flex items-center justify-between">
                          <div>
                            <div className="font-mono font-black text-xs tracking-widest text-amber-50">
                              {vCode || 'HUKIVIP'}
                            </div>
                            <p className="text-[10.5px] font-medium text-amber-100 mt-0.5">
                              {msg.metadata?.discountText || msg.content}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(vCode || '')}
                            className="p-1 hover:bg-white/20 rounded-lg transition-colors cursor-pointer text-amber-100 hover:text-white"
                            title="Sao chép mã"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              {copiedCode === vCode ? 'check' : 'content_copy'}
                            </span>
                          </button>
                        </div>

                        {/* Expiry */}
                        {msg.metadata?.expiresAt && (
                          <div className="flex items-center gap-1 text-[9.5px] text-amber-200">
                            <span className="material-symbols-outlined text-[12px]">schedule</span>
                            <span>HSD: {new Date(msg.metadata.expiresAt).toLocaleDateString('vi-VN')}</span>
                          </div>
                        )}

                        {/* Action: Lưu vào ví thật */}
                        <div className="pt-0.5">
                          {isVoucherSaved ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 py-1.5 px-2 rounded-xl bg-white/25 text-center text-[11px] font-bold text-white flex items-center justify-center gap-1">
                                <span className="material-symbols-outlined text-[14px] text-emerald-300">check_circle</span>
                                <span>Đã Lưu Vào Ví</span>
                              </div>
                              <Link
                                href="/cart"
                                className="py-1.5 px-3 rounded-xl bg-white text-amber-900 text-[11px] font-black shadow-xs hover:bg-amber-50 transition-colors"
                              >
                                Dùng Ngay
                              </Link>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleClaimVoucher(msg.metadata?.voucherId, vCode)}
                              disabled={claimingVoucherId === vId}
                              className="w-full py-1.5 rounded-xl bg-white text-amber-950 hover:bg-amber-50 active:scale-98 text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                            >
                              {claimingVoucherId === vId ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-amber-900 border-t-transparent rounded-full animate-spin"></span>
                                  <span>Đang lưu vào ví...</span>
                                </>
                              ) : (
                                <>
                                  <span className="material-symbols-outlined text-[15px]">savings</span>
                                  <span>Lưu Ngay Vào Ví</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* 2. STANDARD TEXT & MEDIA BUBBLE */
                      <div
                        className={`max-w-[82%] px-3 py-2 rounded-2xl shadow-2xs break-words leading-relaxed ${
                          isMe
                            ? 'bg-[#00875A] text-white rounded-br-xs'
                            : 'bg-white text-gray-800 border border-[#E2E8F0] rounded-bl-xs'
                        }`}
                      >
                        {/* Video player attachments */}
                        {videoAttachments.length > 0 && (
                          <div className="space-y-1.5 my-1">
                            {videoAttachments.map((vid, idx) => (
                              <div key={idx} className="relative rounded-xl overflow-hidden bg-black max-w-[260px]">
                                <video
                                  src={vid.url}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="w-full max-h-52 object-contain rounded-xl"
                                />
                                <div className="px-2 py-0.5 bg-black/70 text-[9px] text-white/90 flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[12px] text-emerald-400">videocam</span>
                                    <span className="truncate max-w-[140px]">{vid.name || 'Video cận cảnh'}</span>
                                  </span>
                                  {vid.size && <span>{(vid.size / (1024 * 1024)).toFixed(1)} MB</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Image gallery attachments */}
                        {imageAttachments.length > 0 && (
                          <div
                            className={`grid gap-1.5 my-1 max-w-[260px] ${
                              imageAttachments.length > 1 ? 'grid-cols-2' : 'grid-cols-1'
                            }`}
                          >
                            {imageAttachments.map((img, idx) => (
                              <div
                                key={idx}
                                onClick={() => setPreviewMediaUrl(img.url)}
                                className="relative group cursor-pointer overflow-hidden rounded-xl bg-slate-100 border border-black/5"
                              >
                                <img
                                  src={img.thumbnail || img.url}
                                  alt={img.name || 'Ảnh đính kèm'}
                                  className="w-full h-28 object-cover transition-transform duration-200 group-hover:scale-105"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <span className="material-symbols-outlined text-lg">zoom_in</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Message content text */}
                        {msg.content && (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    )}

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
            {[
              'Sách này còn hàng không shop?',
              'Gửi mình xin ảnh thật của sách',
              'Khi nào giao đến nơi?',
              'Shop có mã giảm giá không?',
            ].map((chip) => (
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

          {/* Selected Files Preview Tray */}
          {filePreviews.length > 0 && (
            <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
              {filePreviews.map((preview, idx) => (
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
                    onClick={() => handleRemoveFile(idx)}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs cursor-pointer hover:bg-rose-700"
                    title="Xóa tệp"
                  >
                    <span className="material-symbols-outlined text-[10px]">close</span>
                  </button>
                </div>
              ))}
              <span className="text-[10px] text-slate-500 font-medium">
                {filePreviews.length} tệp đính kèm
              </span>
            </div>
          )}

          {/* Media Error alert */}
          {mediaError && (
            <div className="px-3 py-1 bg-rose-50 border-t border-rose-200 text-rose-700 text-[10.5px] flex items-center justify-between">
              <span>{mediaError}</span>
              <button type="button" onClick={() => setMediaError(null)} className="font-bold">✕</button>
            </div>
          )}

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-1.5">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Media upload button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-xl text-slate-500 hover:text-[#00875A] hover:bg-emerald-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Gửi ảnh hoặc video cận cảnh sách"
            >
              <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
            </button>

            <input
              type="text"
              value={messageText}
              onChange={(e) => handleTypingInput(e.target.value)}
              placeholder={filePreviews.length > 0 ? "Thêm ghi chú cho tệp..." : "Nhập tin nhắn..."}
              className="flex-1 px-3 py-2 text-xs bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl text-gray-900 focus:outline-hidden focus:border-[#00875A] focus:bg-white"
            />

            <button
              type="submit"
              disabled={(!messageText.trim() && filePreviews.length === 0) || isUploading}
              className="w-8 h-8 rounded-xl bg-[#00875A] hover:bg-[#003B2B] text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs shrink-0"
              title="Gửi tin"
            >
              {isUploading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <span className="material-symbols-outlined text-[18px]">send</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* 3. LIGHTBOX FULLSCREEN PREVIEW MODAL */}
      {previewMediaUrl && (
        <div
          onClick={() => setPreviewMediaUrl(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewMediaUrl}
              alt="Phóng to ảnh"
              className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl"
            />
            <div className="mt-3 flex items-center gap-3">
              <a
                href={previewMediaUrl}
                download="huki-chat-media"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Tải ảnh gốc</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewMediaUrl(null)}
                className="px-4 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
