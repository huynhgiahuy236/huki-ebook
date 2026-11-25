'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '../api/tokenStorage';
import { chatService, type ChatMessage } from '../services/chatService';
import { realtimeSyncBus } from '../services/realtimeSyncBus';

export interface UseChatSocketOptions {
  storeId?: string;
  onMessageReceived?: (message: ChatMessage) => void;
  onMessageRead?: (receipt: { conversationId: string; readerId: string; messageIds: string[]; readAt: string }) => void;
  onMessageDelivered?: (receipt: { conversationId: string; messageId?: string; messageIds?: string[] }) => void;
  onUserTyping?: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  onConversationClosed?: (data: { conversationId: string }) => void;
}

interface SharedSocketEntry {
  socket: Socket;
  subscribers: Set<{
    callbacksRef: React.MutableRefObject<UseChatSocketOptions>;
    setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
  }>;
  joinedRooms: Map<string, string | undefined>;
  joinedShops: Map<string, number>;
  seenMessageIds: Set<string>;
  cleanupTimer?: ReturnType<typeof setTimeout>;
}

const sharedChatSockets = new Map<string, SharedSocketEntry>();

function resolveChatSocketUrl(): string {
  let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3005';
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    if (socketUrl.includes('localhost') || socketUrl.includes('127.0.0.1')) {
      socketUrl = window.location.origin;
    }
  }
  return socketUrl;
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
  const poolKeyRef = useRef<string | null>(null);
  const joinedRoomsRef = useRef<Map<string, string | undefined>>(new Map());

  // Lưu callbacks vào ref để tránh re-subscribe liên tục
  const callbacksRef = useRef<UseChatSocketOptions>({
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

    const socketUrl = resolveChatSocketUrl();
    const poolKey = `${socketUrl}::${token}`;
    poolKeyRef.current = poolKey;

    let entry = sharedChatSockets.get(poolKey);
    if (!entry) {
      const socket = io(`${socketUrl}/chat`, {
        transports: ['polling', 'websocket'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 12,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.4,
        timeout: 10000,
      });

      entry = {
        socket,
        subscribers: new Set(),
        joinedRooms: new Map(),
        joinedShops: new Map(),
        seenMessageIds: new Set(),
      };

      const poolEntry = entry;

      socket.on('connect', () => {
        poolEntry.subscribers.forEach((sub) => sub.setIsConnected(true));
        poolEntry.joinedShops.forEach((count, shopId) => {
          if (count > 0 && shopId) {
            socket.emit('shop:join', { storeId: shopId });
          }
        });
        poolEntry.joinedRooms.forEach((roomStoreId, convId) => {
          socket.emit('conversation:join', {
            conversationId: convId,
            storeId: roomStoreId,
          });
        });
      });

      socket.on('disconnect', (reason) => {
        poolEntry.subscribers.forEach((sub) => sub.setIsConnected(false));
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      socket.on('connect_error', (err) => {
        poolEntry.subscribers.forEach((sub) => sub.setIsConnected(false));
        console.warn('[useChatSocket] Kết nối socket chat đang chờ thử lại:', err?.message || err);
      });

      const handleNewMessage = (msg: any) => {
        const msgId = String(msg?.id || msg?._id || '');
        if (msgId) {
          if (poolEntry.seenMessageIds.has(msgId)) return;
          poolEntry.seenMessageIds.add(msgId);
          setTimeout(() => poolEntry.seenMessageIds.delete(msgId), 5000);
        }
        poolEntry.subscribers.forEach((sub) => sub.callbacksRef.current.onMessageReceived?.(msg));
        realtimeSyncBus.publish('CHAT_MESSAGE_RECEIVED', msg);
      };
      socket.on('message:new', handleNewMessage);
      socket.on('new_message', handleNewMessage);

      const handleRead = (receipt: any) => {
        poolEntry.subscribers.forEach((sub) => sub.callbacksRef.current.onMessageRead?.(receipt));
        realtimeSyncBus.publish('CHAT_UNREAD_COUNT_CHANGED', receipt);
      };
      socket.on('message:read', handleRead);
      socket.on('message_read', handleRead);
      socket.on('conversation:read', handleRead);
      socket.on('conversation_read', handleRead);

      const handleDelivered = (receipt: any) => {
        poolEntry.subscribers.forEach((sub) => sub.callbacksRef.current.onMessageDelivered?.(receipt));
      };
      socket.on('message:delivered', handleDelivered);
      socket.on('message_delivered', handleDelivered);

      const handleTyping = (data: any) => {
        poolEntry.subscribers.forEach((sub) => sub.callbacksRef.current.onUserTyping?.(data));
      };
      socket.on('typing:user', handleTyping);
      socket.on('user_typing', handleTyping);

      socket.on('conversation:closed', (data: any) => {
        poolEntry.subscribers.forEach((sub) => sub.callbacksRef.current.onConversationClosed?.(data));
      });

      sharedChatSockets.set(poolKey, poolEntry);
    }

    if (entry.cleanupTimer) {
      clearTimeout(entry.cleanupTimer);
      entry.cleanupTimer = undefined;
    }

    const subscriber = { callbacksRef, setIsConnected };
    entry.subscribers.add(subscriber);
    socketRef.current = entry.socket;
    setIsConnected(entry.socket.connected);

    if (storeId) {
      const prevCount = entry.joinedShops.get(storeId) || 0;
      entry.joinedShops.set(storeId, prevCount + 1);
      if (entry.socket.connected) {
        entry.socket.emit('shop:join', { storeId });
      }
    }

    joinedRoomsRef.current.forEach((roomStoreId, convId) => {
      entry!.joinedRooms.set(convId, roomStoreId || storeId);
      if (entry!.socket.connected) {
        entry!.socket.emit('conversation:join', {
          conversationId: convId,
          storeId: roomStoreId || storeId,
        });
      }
    });

    const handleFocusOrOnline = () => {
      if (typeof window !== 'undefined' && entry?.socket && !entry.socket.connected) {
        entry.socket.connect();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleFocusOrOnline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleFocusOrOnline);
      }
      entry!.subscribers.delete(subscriber);
      if (storeId) {
        const currentCount = entry!.joinedShops.get(storeId) || 0;
        if (currentCount <= 1) {
          entry!.joinedShops.delete(storeId);
          if (entry!.socket.connected) {
            entry!.socket.emit('shop:leave', { storeId });
          }
        } else {
          entry!.joinedShops.set(storeId, currentCount - 1);
        }
      }
      if (entry!.subscribers.size === 0) {
        entry!.cleanupTimer = setTimeout(() => {
          if (entry!.subscribers.size === 0) {
            entry!.socket.disconnect();
            sharedChatSockets.delete(poolKey);
          }
        }, 1500);
      }
    };
  }, [storeId]);

  const isValidConversationId = (id?: string): boolean => {
    if (!id || typeof id !== 'string') return false;
    const trimmed = id.trim();
    if (!trimmed || trimmed.startsWith('temp-')) return false;
    // Support 24-char Mongo ObjectId, standard UUID, or alphanumeric prefixed channel ID (e.g., store_xxx, order_xxx)
    return /^[0-9a-fA-F]{24}$/.test(trimmed) ||
           /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i.test(trimmed) ||
           /^[a-zA-Z0-9_\-:]{3,64}$/.test(trimmed);
  };

  // Join vào room hội thoại cụ thể (tự động xếp hàng nếu socket chưa kết nối xong)
  const joinConversation = useCallback((conversationId: string, currentStoreId?: string) => {
    if (!isValidConversationId(conversationId)) return;
    const effectiveStoreId = currentStoreId || storeId;
    joinedRoomsRef.current.set(conversationId, effectiveStoreId);
    const entry = poolKeyRef.current ? sharedChatSockets.get(poolKeyRef.current) : undefined;
    if (entry) entry.joinedRooms.set(conversationId, effectiveStoreId);
    if (socketRef.current?.connected) {
      socketRef.current.emit('conversation:join', {
        conversationId,
        storeId: effectiveStoreId,
      });
    }
  }, [storeId]);

  // Rời khỏi room hội thoại
  const leaveConversation = useCallback((conversationId: string, currentStoreId?: string) => {
    if (!isValidConversationId(conversationId)) return;
    joinedRoomsRef.current.delete(conversationId);
    const entry = poolKeyRef.current ? sharedChatSockets.get(poolKeyRef.current) : undefined;
    if (entry) entry.joinedRooms.delete(conversationId);
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
      if (!isValidConversationId(conversationId)) {
        reject(new Error('Mã hội thoại chưa sẵn sàng trong cơ sở dữ liệu'));
        return;
      }

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

  // Đánh dấu đã đọc qua Socket & REST API (BUG-MOD06-14)
  const markAsRead = useCallback((conversationId: string, currentStoreId?: string) => {
    if (!isValidConversationId(conversationId)) return;
    if (socketRef.current?.connected) {
      socketRef.current.emit('message:read', {
        conversationId,
        storeId: currentStoreId || storeId,
      });
      socketRef.current.emit('conversation:read', {
        conversationId,
        storeId: currentStoreId || storeId,
      });
    }
    // Đồng bộ REST API để backend cập nhật database và broadcast cho các thiết bị khác
    chatService.markAsRead(conversationId).catch(() => {});
  }, [storeId]);

  // Báo trạng thái đang soạn tin (typing)
  const setTyping = useCallback((conversationId: string, isTyping: boolean, currentStoreId?: string) => {
    if (!isValidConversationId(conversationId)) return;
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
