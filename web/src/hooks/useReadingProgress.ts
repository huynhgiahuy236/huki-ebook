'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseReadingProgressOptions {
  bookId: string;
  currentPage: number;
  totalPages: number;
  onRestore?: (page: number) => void;
}

export function useReadingProgress({
  bookId,
  currentPage,
  totalPages,
  onRestore
}: UseReadingProgressOptions) {
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSavedPage, setLastSavedPage] = useState<number>(currentPage);
  const [percentage, setPercentage] = useState<number>(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasRestoredRef = useRef<boolean>(false);

  // Compute percentage
  useEffect(() => {
    if (totalPages > 0 && currentPage > 0) {
      const calc = Math.min(100, Math.round((currentPage / totalPages) * 100));
      setPercentage(calc);
    }
  }, [currentPage, totalPages]);

  // Save to local cache
  const saveLocalProgress = useCallback((page: number, pct: number) => {
    try {
      localStorage.setItem(`huki_progress_${bookId}`, JSON.stringify({
        page,
        totalPages,
        percentage: pct,
        updatedAt: new Date().toISOString()
      }));
    } catch {
      // ignore
    }
  }, [bookId, totalPages]);

  // Sync progress to backend
  const syncProgressToServer = useCallback(async (page: number, pct: number) => {
    if (!bookId || page < 1) return;
    try {
      setIsSyncing(true);
      const token = typeof window !== 'undefined' ? localStorage.getItem('huki_token') || localStorage.getItem('token') : null;
      if (token) {
        await fetch('/api/reader/progress', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            bookId,
            currentPage: page,
            percentage: pct
          })
        });
      }
      setIsSaved(true);
      setLastSavedPage(page);
    } catch (e) {
      console.warn('Could not sync progress to server:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [bookId]);

  // Restore progress on book mount
  const restoreProgress = useCallback(async () => {
    if (!bookId || hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    let restoredPage = 1;

    // 1. Try local cache first for instant UX
    try {
      const saved = localStorage.getItem(`huki_progress_${bookId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.page && parsed.page >= 1 && parsed.page <= (totalPages || 500)) {
          restoredPage = parsed.page;
          if (onRestore) onRestore(restoredPage);
        }
      }
    } catch {
      // ignore
    }

    // 2. Fetch authoritative progress from backend API
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('huki_token') || localStorage.getItem('token') : null;
      if (token) {
        const res = await fetch(`/api/reader/progress/${bookId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.currentPage && json.data.currentPage >= 1) {
            const serverPage = json.data.currentPage;
            // Only update if server progress is further or more authoritative
            if (serverPage !== restoredPage && onRestore) {
              onRestore(serverPage);
              restoredPage = serverPage;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch progress from server:', e);
    }
  }, [bookId, totalPages, onRestore]);

  // Initialize restore on bookId change
  useEffect(() => {
    hasRestoredRef.current = false;
    restoreProgress();
  }, [bookId, restoreProgress]);

  // Debounced auto-save on page change
  useEffect(() => {
    if (currentPage < 1 || !bookId) return;

    setIsSaved(false);
    const calcPct = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;

    // Instant local save
    saveLocalProgress(currentPage, calcPct);

    // Debounced remote save (500ms)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      syncProgressToServer(currentPage, calcPct);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [currentPage, totalPages, bookId, saveLocalProgress, syncProgressToServer]);

  // Flush on unmount / window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (currentPage >= 1 && bookId) {
        const calcPct = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0;
        saveLocalProgress(currentPage, calcPct);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentPage, totalPages, bookId, saveLocalProgress]);

  return {
    isSaved,
    isSyncing,
    percentage,
    lastSavedPage,
    saveProgress: (p: number) => {
      const pct = totalPages > 0 ? Math.min(100, Math.round((p / totalPages) * 100)) : 0;
      saveLocalProgress(p, pct);
      syncProgressToServer(p, pct);
    },
    restoreProgress
  };
}
