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

    // Fallback via API Gateway if needed
    try {
      const u = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';
      const direct = await fetch(`${baseUrl}/books/library/my-books${u}`);
      const json = await direct.json();
      if (json && json.data && Array.isArray(json.data)) {
        return json.data as UserLibraryBook[];
      }
    } catch (e) {
      console.error('API Gateway library fetch error:', e);
    }
    return [];
  }
};
