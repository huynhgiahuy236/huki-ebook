import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface UserSessionItem {
  id: string;
  deviceType?: string;
  deviceName?: string;
  location?: string;
  icon?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export const sessionApi = {
  /**
   * Lấy danh sách các phiên đăng nhập đang hoạt động của người dùng
   */
  async getSessions(): Promise<ApiResponse<UserSessionItem[]>> {
    return apiClient<UserSessionItem[]>('/sessions', {
      method: 'GET',
    });
  },

  /**
   * Đăng xuất / Thu hồi một phiên đăng nhập cụ thể
   */
  async revokeSession(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>(`/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Đăng xuất khỏi tất cả các thiết bị khác (ngoại trừ thiết bị hiện tại)
   */
  async revokeAllOtherSessions(): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>('/sessions', {
      method: 'DELETE',
    });
  },
};

