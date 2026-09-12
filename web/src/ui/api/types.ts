export interface ApiError {
  code: string;
  message: string;
  statusCode?: number;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface BusinessMembership {
  businessId: string;
  businessName?: string;
  role: 'OWNER' | 'MEMBER';
  permissions: string[];
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
}

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: 'USER' | 'BUSINESS' | 'PLATFORM_ADMIN';
  mustChangePassword?: boolean;
  memberships?: BusinessMembership[];
  avatarUrl?: string;
}

export interface LoginResponseData {
  tokens: AuthTokens;
  user: UserSession;
}
