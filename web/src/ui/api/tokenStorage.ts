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
    const accessToken = this.getAccessToken();
    return accessToken ? { accessToken, refreshToken: '' } : null;
  },

  setTokens(tokens: AuthTokens): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (tokens.accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      // Security: Do not store refreshToken in localStorage; clean up legacy key
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
    if (tokens.accessToken) setCookie(ACCESS_TOKEN_KEY, tokens.accessToken, 7);
    deleteCookie(REFRESH_TOKEN_KEY);
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
    // Refresh token is maintained exclusively in HttpOnly cookies by the browser.
    return null;
  },
};

