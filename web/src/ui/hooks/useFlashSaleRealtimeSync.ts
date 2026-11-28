'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { realtimeSyncBus } from '@/ui/services/realtimeSyncBus';
import { invalidateFlashSaleCache } from '@/ui/api/flashSaleApi';
import { tokenStorage } from '@/ui/api/tokenStorage';

let activeNotificationSockets = 0;
let sharedGuestSocket: Socket | null = null;
let guestSocketRefCount = 0;
let guestConnectTimer: ReturnType<typeof setTimeout> | null = null;

function resolveNotificationsSocketUrl(): string {
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

function teardownFallbackSocket() {
  if (guestConnectTimer) {
    clearTimeout(guestConnectTimer);
    guestConnectTimer = null;
  }
  if (sharedGuestSocket) {
    sharedGuestSocket.disconnect();
    sharedGuestSocket = null;
  }
}

export function markNotificationSocketActive(active: boolean) {
  if (active) {
    activeNotificationSockets += 1;
    teardownFallbackSocket();
  } else {
    activeNotificationSockets = Math.max(0, activeNotificationSockets - 1);
  }
}

function ensureFallbackSocket() {
  if (
    typeof window === 'undefined' ||
    activeNotificationSockets > 0 ||
    sharedGuestSocket ||
    guestConnectTimer
  ) {
    return;
  }
  guestConnectTimer = setTimeout(() => {
    guestConnectTimer = null;
    if (activeNotificationSockets > 0 || guestSocketRefCount <= 0 || sharedGuestSocket) {
      return;
    }
    const token = tokenStorage.getAccessToken();
    const socket = io(`${resolveNotificationsSocketUrl()}/notifications`, {
      transports: ['polling', 'websocket'],
      ...(token ? { auth: { token } } : {}),
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });
    socket.on('flash_sale:updated', (payload: any) => {
      invalidateFlashSaleCache();
      realtimeSyncBus.publish('FLASH_SALE_UPDATED', payload);
    });
    socket.on('book:moderated', (payload: any) => {
      realtimeSyncBus.publish('BOOK_MODERATED', payload);
    });
    sharedGuestSocket = socket;
  }, 200);
}

export interface FlashSaleRealtimePayload {
  eventType?: string;
  flashSaleId?: string;
  flashSaleName?: string;
  endsAt?: string;
  bookId?: string;
  bookIds?: string[];
  [key: string]: any;
}

export interface UseFlashSaleRealtimeSyncOptions {
  enabled?: boolean;
  bookIds?: string[];
  onUpdate: (payload?: FlashSaleRealtimePayload) => void;
}

function doesPayloadMatchBooks(
  payload: FlashSaleRealtimePayload | undefined,
  bookIds?: string[],
): boolean {
  if (!bookIds || bookIds.length === 0 || !payload) return true;
  const affected: string[] = [];
  if (payload.bookId) affected.push(String(payload.bookId));
  if (Array.isArray(payload.bookIds)) {
    for (const id of payload.bookIds) {
      if (id) affected.push(String(id));
    }
  }
  if (affected.length === 0) return true;
  return affected.some((id) => bookIds.includes(id));
}

export function useFlashSaleRealtimeSync({
  enabled = true,
  bookIds,
  onUpdate,
}: UseFlashSaleRealtimeSyncOptions) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  const bookIdsRef = useRef(bookIds);
  bookIdsRef.current = bookIds;

  const lastVisibilitySyncAtRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!enabled) return undefined;

    guestSocketRefCount += 1;
    ensureFallbackSocket();

    const triggerIfRelevant = (payload?: FlashSaleRealtimePayload) => {
      if (!doesPayloadMatchBooks(payload, bookIdsRef.current)) return;
      invalidateFlashSaleCache();
      onUpdateRef.current(payload);
    };

    const unsubscribe = realtimeSyncBus.subscribe((msg) => {
      if (msg.type === 'FLASH_SALE_UPDATED') {
        triggerIfRelevant(msg.payload as FlashSaleRealtimePayload);
        return;
      }
      if (msg.type === 'NOTIFICATIONS_UPDATED' || msg.type === 'ADMIN_NOTIFICATIONS_UPDATED') {
        const notiPayload = (msg.payload as any)?.payload || (msg.payload as any);
        const notiType = String((msg.payload as any)?.type || '').toUpperCase();
        const eventType = String(notiPayload?.eventType || '');
        if (eventType.startsWith('flash_sale.') || notiType === 'PROMOTION' || notiType.includes('FLASH_SALE')) {
          triggerIfRelevant(notiPayload);
        }
      }
    });

    const handleDomUpdate = (evt: Event) => {
      const detail = (evt as CustomEvent<FlashSaleRealtimePayload>)?.detail;
      triggerIfRelevant(detail);
    };
    window.addEventListener('huki_flash_sale_updated', handleDomUpdate);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastVisibilitySyncAtRef.current >= 15_000) {
          lastVisibilitySyncAtRef.current = now;
          triggerIfRelevant(undefined);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubscribe();
      window.removeEventListener('huki_flash_sale_updated', handleDomUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      guestSocketRefCount = Math.max(0, guestSocketRefCount - 1);
      if (guestSocketRefCount === 0) {
        teardownFallbackSocket();
      }
    };
  }, [enabled]);
}
