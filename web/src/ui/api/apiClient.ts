import { tokenStorage } from './tokenStorage';
import type { ApiResponse, ApiError, AuthTokens } from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api/v1';

let refreshPromise: Promise<string | null> | null = null;

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { skipAuth = false, headers: customHeaders, ...restOptions } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const correlationId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-correlation-id': correlationId,
    ...(customHeaders as Record<string, string>),
  };

  if (!skipAuth) {
    const accessToken = tokenStorage.getAccessToken();
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  }

  try {
    const response = await fetch(url, {
      ...restOptions,
      headers,
    });

    // Handle 401 Unauthorized & Token Refresh
    if (response.status === 401 && !skipAuth && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/login')) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (refreshToken) {
        if (!refreshPromise) {
          refreshPromise = (async () => {
            try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-correlation-id': correlationId,
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (refreshRes.ok) {
              const refreshBody = await refreshRes.json();
              const refreshData = refreshBody.data || refreshBody;
              const newTokens: AuthTokens = refreshData.tokens || refreshData;
              const newAccessToken = newTokens?.accessToken || refreshData?.accessToken;
              const newRefreshToken = newTokens?.refreshToken || refreshData?.refreshToken;

              if (newAccessToken && newRefreshToken) {
                tokenStorage.setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
                return newAccessToken;
              } else {
                throw new Error('Invalid refresh response');
              }
            } else {
              throw new Error('Refresh failed');
            }
            } catch {
              tokenStorage.clearTokens();
              return null;
            }
          })().finally(() => {
            refreshPromise = null;
          });
        }

        const retryToken = await refreshPromise;

        if (retryToken) {
          headers['Authorization'] = `Bearer ${retryToken}`;
          const retryRes = await fetch(url, { ...restOptions, headers });
          return await parseResponse<T>(retryRes);
        } else {
          return {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
              statusCode: 401,
            },
          };
        }
      }
    }

    return await parseResponse<T>(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Không thể kết nối đến máy chủ API Gateway.';
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message,
        statusCode: 0,
      },
    };
  }
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.ok) {
    if (body && typeof body === 'object') {
      const obj = body as Record<string, unknown>;
      // NestJS TransformInterceptor wraps in { status: "success", data: ... }
      const isSuccess = obj.status === 'success' || obj.success === true;
      const extractedData = obj.data !== undefined ? obj.data : body;

      if (isSuccess || response.ok) {
        return {
          success: true,
          data: extractedData as T,
          meta: (obj.meta || obj.pagination) as ApiResponse<T>['meta'],
        };
      }
    }

    return {
      success: true,
      data: body as T,
    };
  }

  const errorObj = (body as { error?: ApiError; message?: string; code?: string }) || {};
  const message = errorObj.error?.message || errorObj.message || `Lỗi HTTP ${response.status}`;
  const code = errorObj.error?.code || errorObj.code || `HTTP_${response.status}`;

  return {
    success: false,
    error: {
      code,
      message,
      statusCode: response.status,
      details: errorObj.error?.details,
    },
  };
}
