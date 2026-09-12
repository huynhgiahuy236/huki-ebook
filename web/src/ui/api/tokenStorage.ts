import type { AuthTokens } from './types';

const ACCESS_TOKEN_KEY = 'huki.auth.access_token';
const REFRESH_TOKEN_KEY = 'huki.auth.refresh_token';

export const tokenStorage = {
  getTokens(): AuthTokens | null {
    if (typeof window === 'undefined') return null;
    try {
      const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (accessToken && refreshToken) {
        return { accessToken, refreshToken };
      }
    } catch {
      // Return null on storage access error
    }
    return null;
  },

  setTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    } catch {
      // Quota or private mode fallback
    }
  },

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {
      // Ignore errors
    }
  },

  getAccessToken(): string | null {
    return this.getTokens()?.accessToken || null;
  },

  getRefreshToken(): string | null {
    return this.getTokens()?.refreshToken || null;
  }
};
