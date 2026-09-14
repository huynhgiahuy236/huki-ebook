import type { AuthTokens } from './types';

const ACCESS_TOKEN_COOKIE = 'huki_access_token';
const REFRESH_TOKEN_COOKIE = 'huki_refresh_token';

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
    const accessToken = getCookie(ACCESS_TOKEN_COOKIE);
    const refreshToken = getCookie(REFRESH_TOKEN_COOKIE);
    return accessToken && refreshToken ? { accessToken, refreshToken } : null;
  },

  setTokens(tokens: AuthTokens): void {
    setCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, 7);
    setCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, 30);
  },

  clearTokens(): void {
    deleteCookie(ACCESS_TOKEN_COOKIE);
    deleteCookie(REFRESH_TOKEN_COOKIE);
  },

  getAccessToken(): string | null {
    return getCookie(ACCESS_TOKEN_COOKIE);
  },

  getRefreshToken(): string | null {
    return getCookie(REFRESH_TOKEN_COOKIE);
  },
};
