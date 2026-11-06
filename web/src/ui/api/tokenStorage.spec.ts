import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStorage } from './tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = '';
  });

    it('saves access token and refresh token to storage and cookies', () => {
      tokenStorage.setTokens({
        accessToken: 'test_access_token_123',
        refreshToken: 'test_refresh_token_456',
      });

      expect(tokenStorage.getAccessToken()).toBe('test_access_token_123');
      expect(localStorage.getItem('huki_access_token')).toBe('test_access_token_123');
      expect(localStorage.getItem('huki_refresh_token')).toBe('test_refresh_token_456');
      expect(tokenStorage.getRefreshToken()).toBe('test_refresh_token_456');
    });

    it('clears all tokens and legacy entries on clearTokens()', () => {
      tokenStorage.setTokens({
        accessToken: 'token_to_clear',
        refreshToken: 'refresh_to_clear',
      });

      expect(tokenStorage.getAccessToken()).toBe('token_to_clear');
      expect(tokenStorage.getRefreshToken()).toBe('refresh_to_clear');

      tokenStorage.clearTokens();

      expect(tokenStorage.getAccessToken()).toBeNull();
      expect(tokenStorage.getRefreshToken()).toBeNull();
      expect(localStorage.getItem('huki_access_token')).toBeNull();
      expect(localStorage.getItem('huki_refresh_token')).toBeNull();
    });

      it('retrieves tokens object with access token and refresh token', () => {
        tokenStorage.setTokens({
          accessToken: 'valid_access_token',
          refreshToken: 'valid_refresh_token',
        });

        const tokens = tokenStorage.getTokens();
        expect(tokens).toEqual({
          accessToken: 'valid_access_token',
          refreshToken: 'valid_refresh_token',
        });
      });

      it('returns null when no token is present', () => {
        tokenStorage.clearTokens();
        expect(tokenStorage.getTokens()).toBeNull();
        expect(tokenStorage.getAccessToken()).toBeNull();
      });
    });
