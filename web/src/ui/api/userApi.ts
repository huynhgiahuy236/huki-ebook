import { realtimeSyncBus } from '../services/realtimeSyncBus';
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
  deletionScheduledAt?: string | null;
  deletionRequestedAt?: string | null;
  deletionCount?: number;
  remainingDays?: number | null;
  primaryGoals?: string[];
  favoriteGenres?: string[];
  preferredCategories?: string[];
  preferredFormats?: string[];
  preferredTheme?: string;
  dailyMinutesGoal?: number;
  yearlyBooksTarget?: number;
  preferredReadingTime?: string;
  readingHabits?: {
    dailyMinutes?: number;
    yearlyBooksTarget?: number;
    preferredTime?: string;
  };
  wishlist?: string[];
  hasCompletedOnboarding?: boolean;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  avatar?: string;
  primaryGoals?: string[];
  favoriteGenres?: string[];
  preferredCategories?: string[];
  preferredFormats?: string[];
  preferredTheme?: string;
  dailyMinutesGoal?: number;
  yearlyBooksTarget?: number;
  preferredReadingTime?: string;
  readingHabits?: {
    dailyMinutes?: number;
    yearlyBooksTarget?: number;
    preferredTime?: string;
  };
  wishlist?: string[];
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

  /**
   * Gửi mã OTP xác thực xóa tài khoản về email
   */
  async requestDeletionOtp(): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>('/users/request-deletion-otp', {
      method: 'POST',
    });
  },

  /**
   * Xác nhận yêu cầu xóa tài khoản (GitHub-style text + OTP + 7 ngày ân hạn)
   */
  async confirmDeletion(payload: { confirmationText: string; otp: string; reason?: string }): Promise<ApiResponse<{
    status: string;
    deletionScheduledAt: string;
    deletionCount: number;
    remainingDays: number;
  }>> {
    const res = await apiClient<any>('/users/confirm-deletion', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.success) {
      realtimeSyncBus.publish('USER_STATUS_UPDATED', { status: 'PENDING_DELETION' });
    }
    return res;
  },

  /**
   * Hủy yêu cầu xóa tài khoản trong thời gian ân hạn 7 ngày
   */
  async cancelDeletion(): Promise<ApiResponse<{ message: string; data?: { status: string } }>> {
    const res = await apiClient<any>('/users/cancel-deletion', {
      method: 'POST',
    });
    if (res.success) {
      realtimeSyncBus.publish('USER_STATUS_UPDATED', { status: 'ACTIVE' });
    }
    return res;
  },

  /**
   * Xóa tài khoản người dùng hiện tại (Legacy fallback)
   */
  async deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>('/users/profile', {
      method: 'DELETE',
    });
  },
};
