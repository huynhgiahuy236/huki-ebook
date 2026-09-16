import type { AuthTokens } from './types';

const ACCESS_TOKEN_KEY = 'huki_access_token';
const REFRESH_TOKEN_KEY = 'huki_refresh_token';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')}=([^;]*)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 7): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export const tokenStorage = {
  getTokens(): AuthTokens | null {
    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (typeof window !== 'undefined' && window.localStorage) {
      accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    }

    if (!accessToken || !refreshToken) {
      accessToken = accessToken || getCookie(ACCESS_TOKEN_KEY);
      refreshToken = refreshToken || getCookie(REFRESH_TOKEN_KEY);
    }

    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },

  setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (tokens.accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      if (tokens.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    if (tokens.accessToken) setCookie(ACCESS_TOKEN_KEY, tokens.accessToken, 7);
    if (tokens.refreshToken) setCookie(REFRESH_TOKEN_KEY, tokens.refreshToken, 30);
  },

  clearTokens(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);
  },

  getAccessToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (token) return token;
    }
    return getCookie(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const token = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (token) return token;
    }
    return getCookie(REFRESH_TOKEN_KEY);
  },
};

