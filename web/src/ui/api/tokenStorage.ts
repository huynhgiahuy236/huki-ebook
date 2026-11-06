import type { AuthTokens } from './types';

const ACCESS_TOKEN_KEY = 'huki_access_token';
const REFRESH_TOKEN_KEY = 'huki_refresh_token';
const USER_SESSION_KEY = 'huki_session';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1')}=([^;]*)`)
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
    const refreshToken = this.getRefreshToken() || '';
    return accessToken ? { accessToken, refreshToken } : null;
  },

  setTokens(tokens: AuthTokens): void {
    if (tokens.accessToken) setCookie(ACCESS_TOKEN_KEY, tokens.accessToken, 7);
    if (tokens.refreshToken) setCookie(REFRESH_TOKEN_KEY, tokens.refreshToken, 7);
    if (typeof window !== 'undefined' && window.localStorage) {
      if (tokens.accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      if (tokens.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      localStorage.removeItem('token');
      localStorage.removeItem('huki_user');
    }
  },

  clearTokens(): void {
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);
    deleteCookie(USER_SESSION_KEY);
    deleteCookie('token');
    deleteCookie('huki_user');
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_SESSION_KEY);
      localStorage.removeItem('token');
      localStorage.removeItem('huki_user');
    }
  },

  getAccessToken(): string | null {
    return (
      getCookie(ACCESS_TOKEN_KEY) ||
      getCookie('token') ||
      (typeof window !== 'undefined' && window.localStorage ? localStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem('token') : null)
    );
  },

  getRefreshToken(): string | null {
    return (
      getCookie(REFRESH_TOKEN_KEY) ||
      getCookie('refreshToken') ||
      (typeof window !== 'undefined' && window.localStorage ? localStorage.getItem(REFRESH_TOKEN_KEY) : null)
    );
  },

  getUserSession(): any | null {
    const raw = getCookie(USER_SESSION_KEY) || getCookie('huki_user');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // fallback to storage
      }
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(USER_SESSION_KEY) || localStorage.getItem('huki_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          return null;
        }
      }
    }
    return null;
  },

  setUserSession(userData: any): void {
    if (!userData) return;
    const sanitized = {
      id: userData.id,
      email: userData.email,
      fullName: userData.fullName || userData.name,
      name: userData.name || userData.fullName,
      role: userData.role,
      avatar: userData.avatar,
      status: userData.status,
      hasApprovedBusiness: userData.hasApprovedBusiness,
      business: userData.business ? {
        id: userData.business.id,
        name: userData.business.name,
        status: userData.business.status,
      } : undefined,
    };
    const serialized = JSON.stringify(sanitized);
    setCookie(USER_SESSION_KEY, serialized, 7);
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(USER_SESSION_KEY, serialized);
      localStorage.removeItem('huki_user');
    }
  },
};
