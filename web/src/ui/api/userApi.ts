import { apiClient } from './apiClient';
import type { ApiResponse } from './types';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  avatar?: string | null;
  role?: string;
  status?: string;
  preferredCategories?: string[];
  preferredFormats?: string[];
  dailyMinutesGoal?: number;
  yearlyBooksTarget?: number;
  preferredReadingTime?: string;
  hasCompletedOnboarding?: boolean;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  avatar?: string;
  preferredCategories?: string[];
  preferredFormats?: string[];
  dailyMinutesGoal?: number;
  yearlyBooksTarget?: number;
  preferredReadingTime?: string;
  hasCompletedOnboarding?: boolean;
}

export const userApi = {
  /**
   * Lấy thông tin hồ sơ người dùng hiện tại
   */
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return apiClient<UserProfile>('/users/profile', {
      method: 'GET',
    });
  },

  /**
   * Cập nhật thông tin hồ sơ người dùng (Họ tên, SĐT, Avatar)
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<ApiResponse<UserProfile>> {
    return apiClient<UserProfile>('/users/profile', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
