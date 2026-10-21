import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface ServerBookmark {
  id: string;
  bookId: string;
  pageNumber: number;
  note?: string;
  createdAt: string;
}

export interface ServerReadingProgress {
  bookId: string;
  currentPage: number;
  totalPages?: number;
  percentage?: number;
  lastReadAt?: string;
}

export const readerApi = {
  /**
   * Lấy danh sách bookmark của một cuốn sách
   */
  getBookmarks: async (bookId: string): Promise<ApiResponse<ServerBookmark[]>> => {
    return apiClient<ServerBookmark[]>(`/reader/bookmarks/${encodeURIComponent(bookId)}`, {
      method: 'GET',
    });
  },

  /**
   * Tạo một bookmark mới
   */
  addBookmark: async (payload: {
    bookId: string;
    pageNumber: number;
    note?: string;
  }): Promise<ApiResponse<ServerBookmark>> => {
    return apiClient<ServerBookmark>('/reader/bookmarks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Xóa một bookmark theo ID
   */
  deleteBookmark: async (bookmarkId: string): Promise<ApiResponse<{ message?: string }>> => {
    return apiClient<{ message?: string }>(`/reader/bookmarks/${encodeURIComponent(bookmarkId)}`, {
      method: 'DELETE',
    });
  },

  /**
   * Lấy tiến độ đọc sách từ máy chủ
   */
  getProgress: async (bookId: string): Promise<ApiResponse<ServerReadingProgress>> => {
    return apiClient<ServerReadingProgress>(`/reader/progress/${encodeURIComponent(bookId)}`, {
      method: 'GET',
    });
  },

  /**
   * Lưu tiến độ đọc sách lên máy chủ
   */
  saveProgress: async (payload: {
    bookId: string;
    currentPage: number;
    totalPages?: number;
    percentage?: number;
  }): Promise<ApiResponse<ServerReadingProgress>> => {
    return apiClient<ServerReadingProgress>('/reader/progress', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};
