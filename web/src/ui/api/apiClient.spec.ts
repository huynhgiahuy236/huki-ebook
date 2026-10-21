import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { apiClient, extractHumanErrorMessage } from './apiClient';
import { tokenStorage } from './tokenStorage';

describe('apiClient', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    tokenStorage.clearTokens();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('injects Bearer token and correlation id on standard requests', async () => {
    tokenStorage.setTokens({ accessToken: 'valid_jwt_token', refreshToken: '' });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { id: 'book-1', title: 'Sách Hay' } }),
    });
    globalThis.fetch = mockFetch;

    const res = await apiClient<{ id: string; title: string }>('/catalog/books/book-1');

    expect(res.success).toBe(true);
    expect(res.data?.title).toBe('Sách Hay');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer valid_jwt_token');
    expect(headers['x-correlation-id']).toBeDefined();
    expect(callArgs[1]?.credentials).toBe('include');
  });

  it('skips Authorization header when skipAuth is true', async () => {
    tokenStorage.setTokens({ accessToken: 'valid_jwt_token', refreshToken: '' });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { public: true } }),
    });
    globalThis.fetch = mockFetch;

    await apiClient('/public/ping', { skipAuth: true });

    const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('automatically refreshes token on 401 and retries original request', async () => {
    tokenStorage.setTokens({ accessToken: 'expired_token', refreshToken: '' });

    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      callCount++;
      if (url.includes('/auth/refresh')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            success: true,
            data: { accessToken: 'new_refreshed_access_token' },
          }),
        });
      }

      if (callCount === 1) {
        // First attempt fails with 401
        return Promise.resolve({
          ok: false,
          status: 401,
          text: async () => JSON.stringify({ message: 'Token expired' }),
        });
      }

      // Retry attempt succeeds
      return Promise.resolve({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ success: true, data: { secretData: 'secret_value' } }),
      });
    });
    globalThis.fetch = mockFetch;

    const res = await apiClient<{ secretData: string }>('/user/secret-profile');

    expect(res.success).toBe(true);
    expect(res.data?.secretData).toBe('secret_value');
    expect(tokenStorage.getAccessToken()).toBe('new_refreshed_access_token');
    expect(mockFetch).toHaveBeenCalledTimes(3); // 1: original, 2: refresh, 3: retried original
  });

  it('clears tokens and returns UNAUTHORIZED error when token refresh fails', async () => {
    tokenStorage.setTokens({ accessToken: 'expired_token', refreshToken: '' });

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/auth/refresh')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: async () => ({ message: 'Refresh token invalid' }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Token expired' }),
      });
    });
    globalThis.fetch = mockFetch;

    const res = await apiClient('/user/secret-profile');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it('catches network errors and returns standardized NETWORK_ERROR object', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const res = await apiClient('/catalog/books');

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('NETWORK_ERROR');
    expect(res.error?.message).toBe('Failed to fetch');
    expect(res.error?.statusCode).toBe(0);
  });
});

describe('extractHumanErrorMessage', () => {
  it('translates HTTP status codes to human-friendly Vietnamese messages', () => {
    const error404 = extractHumanErrorMessage(null, 404);
    expect(error404.code).toBe('NOT_FOUND');
    expect(error404.message).toContain('không tồn tại hoặc đã bị gỡ bỏ');

    const error429 = extractHumanErrorMessage(null, 429);
    expect(error429.code).toBe('TOO_MANY_REQUESTS');
    expect(error429.title).toBe('Thao tác quá nhanh');
    expect(error429.message).toContain('Hệ thống nhận nhiều yêu cầu liên tiếp');

    const error500 = extractHumanErrorMessage(null, 500);
    expect(error500.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('translates NestJS Class Validator array messages into readable text', () => {
    const body = {
      message: ['email must be an email', 'phone must be a valid phone number'],
      error: 'Bad Request',
      statusCode: 400,
    };
    const translated = extractHumanErrorMessage(body, 400);

    expect(translated.code).toBe('VALIDATION_ERROR');
    expect(translated.message).toContain('Email không đúng định dạng');
    expect(translated.message).toContain('Số điện thoại không hợp lệ');
  });

  it('translates known business error codes accurately', () => {
    const body = {
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    };
    const translated = extractHumanErrorMessage(body, 401);

    expect(translated.code).toBe('AUTH_INVALID_CREDENTIALS');
    expect(translated.message).toContain('Email hoặc mật khẩu không chính xác');
  });
});
