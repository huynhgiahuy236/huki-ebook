import { useEffect, useState, useCallback, useRef } from 'react';
import { realtimeSyncBus, InventoryUpdatePayload, SyncMessage } from '../services/realtimeSyncBus';

export interface UseRealtimeInventoryOptions {
  storeId?: string;
  bookId?: string;
  onUpdate?: (payload: InventoryUpdatePayload) => void;
  highlightDurationMs?: number;
}

export function useRealtimeInventory(options: UseRealtimeInventoryOptions = {}) {
  const { storeId, bookId, onUpdate, highlightDurationMs = 2000 } = options;
  const [lastUpdate, setLastUpdate] = useState<InventoryUpdatePayload | null>(null);
  const [highlightedBooks, setHighlightedBooks] = useState<
    Record<string, { action: string; timestamp: number }>
  >({});

  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    const handleSyncMessage = (msg: SyncMessage) => {
      if (msg.type === 'INVENTORY_UPDATED' && msg.payload) {
        const payload = msg.payload as InventoryUpdatePayload;

        // Check if event matches target bookId or storeId (if specified)
        if (bookId && payload.bookId !== bookId) {
          return;
        }
        if (storeId && payload.storeId && payload.storeId !== storeId) {
          return;
        }

        setLastUpdate(payload);

        // Highlight this book for visual feedback
        setHighlightedBooks((prev) => ({
          ...prev,
          [payload.bookId]: { action: payload.action, timestamp: Date.now() },
        }));

        // Auto remove highlight after duration
        setTimeout(() => {
          setHighlightedBooks((prev) => {
            const next = { ...prev };
            delete next[payload.bookId];
            return next;
          });
        }, highlightDurationMs);

        if (onUpdateRef.current) {
          onUpdateRef.current(payload);
        }
      }
    };

    const unsubscribe = realtimeSyncBus.subscribe(handleSyncMessage);
    return () => {
      unsubscribe();
    };
  }, [bookId, storeId, highlightDurationMs]);

  const broadcastUpdate = useCallback((payload: InventoryUpdatePayload) => {
    realtimeSyncBus.publish('INVENTORY_UPDATED', payload);
  }, []);

  return {
    lastUpdate,
    highlightedBooks,
    broadcastUpdate,
  };
}
