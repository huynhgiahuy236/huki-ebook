import { apiClient } from './apiClient';
import { tokenStorage } from './tokenStorage';
import type { ApiResponse, LoginResponseData, UserSession, AuthTokens } from './types';

export interface LoginPayload {
  emailOrPhone?: string;
  email?: string;
  password?: string;
}

export interface RegisterPayload {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
}

export interface ChangePasswordPayload {
  currentPassword?: string;
  newPassword?: string;
}

export const authApi = {
  /**
   * Đăng nhập tài khoản với email + password (Khớp DTO Backend LoginDto)
   */
  async login(payload: LoginPayload): Promise<ApiResponse<LoginResponseData>> {
    const email = payload.email || payload.emailOrPhone || '';
    return apiClient<LoginResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password: payload.password,
      }),
      skipAuth: true,
    });
  },

  /**
   * Đăng ký tài khoản người dùng mới (Khớp DTO Backend RegisterDto)
   */
  async register(payload: RegisterPayload): Promise<ApiResponse<LoginResponseData>> {
    const body: Record<string, string> = {
      email: payload.email,
      password: payload.password || '',
      fullName: payload.fullName,
    };
    if (payload.phone) {
      body.phone = payload.phone;
    }

    return apiClient<LoginResponseData>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
      skipAuth: true,
    });
  },

  /**
   * Lấy thông tin người dùng hiện tại (Session bootstrap)
   */
  async getMe(): Promise<ApiResponse<UserSession>> {
    return apiClient<UserSession>('/auth/me', {
      method: 'GET',
    });
  },

  /**
   * Làm mới Access Token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    return apiClient<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuth: true,
    });
  },

  /**
   * Đăng xuất hệ thống
   */
  async logout(): Promise<ApiResponse<{ message: string }>> {
    const refreshToken = tokenStorage.getRefreshToken() || '';
    return apiClient<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  /**
   * Đổi mật khẩu tài khoản
   */
  async changePassword(payload: ChangePasswordPayload): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>('/auth/change-password', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Xác thực Email tài khoản
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string; user?: UserSession }>> {
    return apiClient<{ message: string; user?: UserSession }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
      skipAuth: true,
    });
  },

  /**
   * Gửi lại email xác thực
   */
  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  }
};
