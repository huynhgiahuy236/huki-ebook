import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStorage } from './tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    document.cookie = '';
  });

  it('saves access token to localStorage and cookie, and never stores refreshToken', () => {
    // Pre-populate legacy refresh token in localStorage to test cleanup
    localStorage.setItem('huki_refresh_token', 'legacy_refresh_secret');

    tokenStorage.setTokens({
      accessToken: 'test_access_token_123',
      refreshToken: 'should_not_be_stored',
    });

    expect(tokenStorage.getAccessToken()).toBe('test_access_token_123');
    expect(localStorage.getItem('huki_access_token')).toBe('test_access_token_123');
    expect(localStorage.getItem('huki_refresh_token')).toBeNull();
    expect(tokenStorage.getRefreshToken()).toBeNull();
  });

  it('clears all tokens and legacy entries on clearTokens()', () => {
    tokenStorage.setTokens({
      accessToken: 'token_to_clear',
      refreshToken: '',
    });

    expect(tokenStorage.getAccessToken()).toBe('token_to_clear');

    tokenStorage.clearTokens();

    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(localStorage.getItem('huki_access_token')).toBeNull();
    expect(localStorage.getItem('huki_refresh_token')).toBeNull();
  });

  it('retrieves tokens object with access token and empty client refresh token', () => {
    tokenStorage.setTokens({
      accessToken: 'valid_access_token',
      refreshToken: 'server_cookie_only',
    });

    const tokens = tokenStorage.getTokens();
    expect(tokens).toEqual({
      accessToken: 'valid_access_token',
      refreshToken: '',
    });
  });

  it('returns null when no token is present', () => {
    tokenStorage.clearTokens();
    expect(tokenStorage.getTokens()).toBeNull();
    expect(tokenStorage.getAccessToken()).toBeNull();
  });
});
