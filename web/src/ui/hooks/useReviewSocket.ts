'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '../api/tokenStorage';
import type { ReviewItemData, ReviewReplyItem, ReviewSummaryData } from '../api/reviewApi';

export interface ReviewSocketEventPayload {
  targetType?: string;
  targetId?: string;
  storeId?: string;
  storeOwnerId?: string;
  authorId?: string;
  reviewId?: string;
  helpfulCount?: number;
  review?: ReviewItemData;
  reply?: ReviewReplyItem;
  summary?: ReviewSummaryData;
}

export interface UseReviewSocketOptions {
  bookId?: string;
  storeId?: string;
  enabled?: boolean;
  onReviewCreated?: (payload: ReviewSocketEventPayload) => void;
  onReviewUpdated?: (payload: ReviewSocketEventPayload) => void;
  onReviewReplied?: (payload: ReviewSocketEventPayload) => void;
  onReviewHelpful?: (payload: ReviewSocketEventPayload) => void;
}

function resolveSocketBaseUrl(): string {
  let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3005';
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    if (socketUrl.includes('localhost') || socketUrl.includes('127.0.0.1')) {
      socketUrl = window.location.origin;
    }
  }
  return socketUrl;
}

export function useReviewSocket({
  bookId,
  storeId,
  enabled = true,
  onReviewCreated,
  onReviewUpdated,
  onReviewReplied,
  onReviewHelpful,
}: UseReviewSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const callbacksRef = useRef({
    onReviewCreated,
    onReviewUpdated,
    onReviewReplied,
    onReviewHelpful,
  });

  useEffect(() => {
    callbacksRef.current = {
      onReviewCreated,
      onReviewUpdated,
      onReviewReplied,
      onReviewHelpful,
    };
  }, [onReviewCreated, onReviewUpdated, onReviewReplied, onReviewHelpful]);

  useEffect(() => {
    if (!enabled) return;
    if (!bookId && !storeId) return;

    const token = tokenStorage.getAccessToken();
    const socketUrl = resolveSocketBaseUrl();

    const socket = io(`${socketUrl}/notifications`, {
      transports: ['polling', 'websocket'],
      ...(token ? { auth: { token } } : {}),
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    socketRef.current = socket;

    const joinRooms = () => {
      if (bookId) {
        socket.emit('join_book', { bookId });
      }
      if (storeId) {
        for (const id of storeId.split(',').map((s) => s.trim()).filter(Boolean)) {
          socket.emit('join_store', { storeId: id });
        }
      }
    };

    socket.on('connect', () => {
      setIsConnected(true);
      joinRooms();
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('review:created', (payload: ReviewSocketEventPayload) => {
      callbacksRef.current.onReviewCreated?.(payload);
    });

    socket.on('review:updated', (payload: ReviewSocketEventPayload) => {
      callbacksRef.current.onReviewUpdated?.(payload);
    });

    socket.on('review:replied', (payload: ReviewSocketEventPayload) => {
      callbacksRef.current.onReviewReplied?.(payload);
    });

    socket.on('review:helpful', (payload: ReviewSocketEventPayload) => {
      callbacksRef.current.onReviewHelpful?.(payload);
    });

    if (socket.connected) {
      joinRooms();
    }

    return () => {
      if (bookId && socket.connected) {
        socket.emit('leave_book', { bookId });
      }
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, bookId, storeId]);

  return { isConnected };
}
