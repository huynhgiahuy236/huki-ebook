'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '../api/tokenStorage';
import type { ChatMessage } from '../services/chatService';

export interface UseChatSocketOptions {
  storeId?: string;
  onMessageReceived?: (message: ChatMessage) => void;
  onMessageRead?: (receipt: { conversationId: string; readerId: string; messageIds: string[]; readAt: string }) => void;
  onMessageDelivered?: (receipt: { conversationId: string; messageId?: string; messageIds?: string[] }) => void;
  onUserTyping?: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  onConversationClosed?: (data: { conversationId: string }) => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}) {
  const {
    storeId,
    onMessageReceived,
    onMessageRead,
    onMessageDelivered,
    onUserTyping,
    onConversationClosed,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  // Lưu callbacks vào ref để tránh re-subscribe liên tục
  const callbacksRef = useRef({
    onMessageReceived,
    onMessageRead,
    onMessageDelivered,
    onUserTyping,
    onConversationClosed,
  });

  useEffect(() => {
    callbacksRef.current = {
      onMessageReceived,
      onMessageRead,
      onMessageDelivered,
      onUserTyping,
      onConversationClosed,
    };
  }, [onMessageReceived, onMessageRead, onMessageDelivered, onUserTyping, onConversationClosed]);

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3005';
    const socket = io(`${socketUrl}/chat`, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Nếu là seller trực chat cho shop, tự động join room của shop
      if (storeId) {
        socket.emit('shop:join', { storeId });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Lắng nghe tin nhắn mới (dedup nếu server phát cả message:new và new_message)
    const seenMessageIds = new Set<string>();
    const handleNewMessage = (msg: any) => {
      const msgId = String(msg?.id || msg?._id || '');
      if (msgId) {
        if (seenMessageIds.has(msgId)) return;
        seenMessageIds.add(msgId);
        setTimeout(() => seenMessageIds.delete(msgId), 5000);
      }
      callbacksRef.current.onMessageReceived?.(msg);
    };
    socket.on('message:new', handleNewMessage);
    socket.on('new_message', handleNewMessage);

    // Lắng nghe đã đọc
    const handleRead = (receipt: any) => {
      callbacksRef.current.onMessageRead?.(receipt);
    };
    socket.on('message:read', handleRead);
    socket.on('message_read', handleRead);

    // Lắng nghe đã nhận
    const handleDelivered = (receipt: any) => {
      callbacksRef.current.onMessageDelivered?.(receipt);
    };
    socket.on('message:delivered', handleDelivered);
    socket.on('message_delivered', handleDelivered);

    // Lắng nghe typing
    const handleTyping = (data: any) => {
      callbacksRef.current.onUserTyping?.(data);
    };
    socket.on('typing:user', handleTyping);
    socket.on('user_typing', handleTyping);

    // Lắng nghe đóng hội thoại
    socket.on('conversation:closed', (data: any) => {
      callbacksRef.current.onConversationClosed?.(data);
    });

    return () => {
      if (storeId) {
        socket.emit('shop:leave', { storeId });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [storeId]);

  // Join vào room hội thoại cụ thể
  const joinConversation = useCallback((conversationId: string, currentStoreId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('conversation:join', {
        conversationId,
        storeId: currentStoreId || storeId,
      });
    }
  }, [storeId]);

  // Rời khỏi room hội thoại
  const leaveConversation = useCallback((conversationId: string, currentStoreId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('conversation:leave', {
        conversationId,
        storeId: currentStoreId || storeId,
      });
    }
  }, [storeId]);

  // Gửi tin nhắn qua Socket
  const sendMessage = useCallback((
    conversationId: string,
    content: string,
    extra?: {
      messageType?: string;
      metadata?: Record<string, any>;
      attachments?: any[];
      storeId?: string;
    }
  ): Promise<ChatMessage | null> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('Socket chưa được kết nối'));
        return;
      }

      socketRef.current.emit(
        'message:send',
        {
          conversationId,
          content,
          messageType: extra?.messageType || 'TEXT',
          metadata: extra?.metadata,
          attachments: extra?.attachments,
          storeId: extra?.storeId || storeId,
        },
        (response: any) => {
          if (response?.error) {
            reject(new Error(response.error));
          } else {
            resolve(response as ChatMessage);
          }
        }
      );
    });
  }, [storeId]);

  // Đánh dấu đã đọc qua Socket
  const markAsRead = useCallback((conversationId: string, currentStoreId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:read', {
        conversationId,
        storeId: currentStoreId || storeId,
      });
    }
  }, [storeId]);

  // Báo trạng thái đang soạn tin (typing)
  const setTyping = useCallback((conversationId: string, isTyping: boolean, currentStoreId?: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(isTyping ? 'typing:start' : 'typing:stop', {
        conversationId,
        storeId: currentStoreId || storeId,
      });
    }
  }, [storeId]);

  return {
    isConnected,
    joinConversation,
    leaveConversation,
    sendMessage,
    markAsRead,
    setTyping,
  };
}
