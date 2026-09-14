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
   * Xác thực Email / OTP tài khoản
   */
  async verifyEmail(token: string): Promise<ApiResponse<{ message: string; user?: UserSession }>> {
    return apiClient<{ message: string; user?: UserSession }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
      skipAuth: true,
    });
  },

  /**
   * Gửi lại mã OTP / email xác thực
   */
  async resendVerification(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  },

  /**
   * Quên mật khẩu: Yêu cầu gửi mã OTP đặt lại mật khẩu qua email
   */
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
      skipAuth: true,
    });
  },

  /**
   * Đặt lại mật khẩu mới với mã OTP xác thực
   */
  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return apiClient<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
      skipAuth: true,
    });
  },
};

/**
 * Chuyển đổi mã lỗi hệ thống và phản hồi Backend thành thông điệp thuần 100% Tiếng Việt
 */
export function formatAuthError(error: unknown): string {
  if (!error) return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
  const errorObject = typeof error === 'object' ? error as Record<string, unknown> : null;
  const errorMessage = typeof errorObject?.message === 'string'
    ? errorObject.message
    : typeof errorObject?.error === 'string'
      ? errorObject.error
      : JSON.stringify(error);
  const raw = (typeof error === 'string' ? error : errorMessage).toLowerCase();

  if (raw.includes('email_exists') || raw.includes('email already exists') || raw.includes('email đã tồn tại')) {
    return 'Email này đã được sử dụng trên hệ thống. Vui lòng đăng nhập hoặc dùng email khác.';
  }
  if (raw.includes('phone_exists') || raw.includes('phone number already exists')) {
    return 'Số điện thoại này đã được đăng ký bởi tài khoản khác.';
  }
  if (raw.includes('invalid credentials') || raw.includes('invalid_credentials') || raw.includes('sai email hoặc mật khẩu')) {
    return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
  }
  if (raw.includes('unverified') || raw.includes('not verified') || raw.includes('chưa kích hoạt')) {
    return 'Tài khoản chưa được kích hoạt. Vui lòng xác thực mã OTP qua email.';
  }
  if (raw.includes('locked') || raw.includes('blocked') || raw.includes('tạm khóa')) {
    return 'Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau.';
  }
  if (raw.includes('expired') || raw.includes('invalid token') || raw.includes('mã không hợp lệ')) {
    return 'Mã xác thực OTP không chính xác hoặc đã hết hạn. Vui lòng yêu cầu mã mới.';
  }
  if (raw.includes('network') || raw.includes('failed to fetch') || raw.includes('kết nối')) {
    return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại kết nối mạng.';
  }

  return typeof error === 'string'
    ? error
    : typeof errorObject?.message === 'string'
      ? errorObject.message
      : 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}
