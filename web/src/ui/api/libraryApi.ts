import { apiClient } from './apiClient';

export interface UserLibraryBook {
  accessId: string;
  bookId: string;
  id: string;
  title: string;
  slug: string;
  author: string;
  publisher?: string;
  category?: string;
  categorySlug?: string;
  coverUrl?: string;
  cover?: string;
  format: string;
  price: number;
  readingProgress: number; // 0 - 100
  lastReadAt?: string;
  pdfKey?: string;
  epubKey?: string;
  accessType?: string;
  status: string;
}

export const libraryApi = {
  async getMyLibrary(userId?: string): Promise<UserLibraryBook[]> {
    if (!userId) {
      return [];
    }
    try {
      const q = `?userId=${encodeURIComponent(userId)}`;
      const res = await apiClient<UserLibraryBook[]>(`/books/library/my-books${q}`, { skipAuth: false });
      if (res && res.data && Array.isArray(res.data)) {
        return res.data;
      }
      if (Array.isArray(res)) {
        return res;
      }
    } catch (err) {
      console.warn('apiClient getMyLibrary failed, trying direct fallback:', err);
    }

    // Fallback directly to commerce-service port 3003 if needed
    try {
      const u = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const direct = await fetch(`http://localhost:3003/api/v1/books/library/my-books${u}`);
      const json = await direct.json();
      if (json && json.data && Array.isArray(json.data)) {
        return json.data as UserLibraryBook[];
      }
    } catch (e) {
      console.error('Direct commerce-service library fetch error:', e);
    }
    return [];
  }
};
