'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bookmark } from '@/ui/context/ReaderContext';

interface UseBookmarksOptions {
  bookId: string;
  currentPage: number;
}

export function useBookmarks({ bookId, currentPage }: UseBookmarksOptions) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Load from local storage cache first
  const loadLocalBookmarks = useCallback(() => {
    try {
      const saved = localStorage.getItem(`huki_bookmarks_${bookId}`);
      if (saved) {
        return JSON.parse(saved) as Bookmark[];
      }
      // Check legacy global bookmarks
      const legacy = localStorage.getItem('huki_reader_bookmarks');
      if (legacy) {
        const parsed = JSON.parse(legacy) as Bookmark[];
        return parsed.filter(b => b.bookId === bookId);
      }
    } catch {
      // ignore
    }
    return [];
  }, [bookId]);

  // Save to local storage cache
  const saveLocalBookmarks = useCallback((list: Bookmark[]) => {
    try {
      localStorage.setItem(`huki_bookmarks_${bookId}`, JSON.stringify(list));
      // Also update global legacy cache for cross-compatibility
      const legacy = localStorage.getItem('huki_reader_bookmarks');
      const all: Bookmark[] = legacy ? JSON.parse(legacy) : [];
      const others = all.filter(b => b.bookId !== bookId);
      localStorage.setItem('huki_reader_bookmarks', JSON.stringify([...others, ...list]));
    } catch {
      // ignore
    }
  }, [bookId]);

  // Fetch bookmarks from backend API with fallback
  const fetchBookmarks = useCallback(async () => {
    if (!bookId) return;
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('huki_token') || localStorage.getItem('token') : null;
      const res = await fetch(`/api/reader/bookmarks/${bookId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        const json = await res.json();
        const serverBookmarks: Bookmark[] = (json.data || []).map((b: any) => ({
          id: b.id,
          bookId: b.bookId,
          page: b.pageNumber,
          note: b.note || `Dấu trang tại Trang ${b.pageNumber}`,
          timestamp: b.createdAt || new Date().toISOString()
        }));
        setBookmarks(serverBookmarks);
        saveLocalBookmarks(serverBookmarks);
      } else {
        // Fallback to local cache
        const local = loadLocalBookmarks();
        setBookmarks(local);
      }
    } catch {
      const local = loadLocalBookmarks();
      setBookmarks(local);
    } finally {
      setIsLoading(false);
    }
  }, [bookId, loadLocalBookmarks, saveLocalBookmarks]);

  // Initialize on mount
  useEffect(() => {
    const cached = loadLocalBookmarks();
    if (cached.length > 0) {
      setBookmarks(cached);
    }
    fetchBookmarks();
  }, [bookId, fetchBookmarks, loadLocalBookmarks]);

  // Toggle bookmark for page
  const toggleBookmark = useCallback(async (pageNum: number, note?: string) => {
    const existing = bookmarks.find(b => b.page === pageNum);

    if (existing) {
      // Delete bookmark
      const updated = bookmarks.filter(b => b.id !== existing.id);
      setBookmarks(updated);
      saveLocalBookmarks(updated);

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('huki_token') || localStorage.getItem('token') : null;
        if (token && !existing.id.startsWith('local_')) {
          await fetch(`/api/reader/bookmarks/${existing.id}`, {
            method: 'DELETE',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
          });
        }
      } catch (e) {
        console.warn('Could not sync bookmark deletion to server:', e);
      }
    } else {
      // Add bookmark
      const tempId = `local_${Date.now()}`;
      const defaultNote = note || `Dấu trang tại Trang ${pageNum}`;
      const newBm: Bookmark = {
        id: tempId,
        bookId,
        page: pageNum,
        note: defaultNote,
        timestamp: new Date().toISOString()
      };

      const updated = [...bookmarks, newBm].sort((a, b) => a.page - b.page);
      setBookmarks(updated);
      saveLocalBookmarks(updated);

      try {
        setIsSyncing(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem('huki_token') || localStorage.getItem('token') : null;
        if (token) {
          const res = await fetch('/api/reader/bookmarks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              bookId,
              pageNumber: pageNum,
              note: defaultNote
            })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.data?.id) {
              setBookmarks(prev => prev.map(b => b.id === tempId ? { ...b, id: json.data.id } : b));
            }
          }
        }
      } catch (e) {
        console.warn('Could not sync new bookmark to server:', e);
      } finally {
        setIsSyncing(false);
      }
    }
  }, [bookId, bookmarks, saveLocalBookmarks]);

  // Explicit delete by ID
  const deleteBookmark = useCallback(async (bookmarkId: string) => {
    const updated = bookmarks.filter(b => b.id !== bookmarkId);
    setBookmarks(updated);
    saveLocalBookmarks(updated);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('huki_token') || localStorage.getItem('token') : null;
      if (token && !bookmarkId.startsWith('local_')) {
        await fetch(`/api/reader/bookmarks/${bookmarkId}`, {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
      }
    } catch (e) {
      console.warn('Could not sync bookmark delete to server:', e);
    }
  }, [bookmarks, saveLocalBookmarks]);

  const isCurrentPageBookmarked = bookmarks.some(b => b.page === currentPage);

  return {
    bookmarks,
    isLoading,
    isSyncing,
    toggleBookmark,
    deleteBookmark,
    isCurrentPageBookmarked,
    refetch: fetchBookmarks
  };
}
