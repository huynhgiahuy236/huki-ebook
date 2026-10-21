import {
  getJwtSecret,
  assertProductionSecurity,
  DEFAULT_DEV_JWT_SECRET,
} from './jwt-security.config';

describe('jwt-security.config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('in development / test mode', () => {
    it('returns default secret when JWT_SECRET is unset', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';
      expect(getJwtSecret()).toBe(DEFAULT_DEV_JWT_SECRET);
    });

    it('returns configured JWT_SECRET when set', () => {
      process.env.JWT_SECRET = 'custom-dev-secret';
      process.env.NODE_ENV = 'development';
      expect(getJwtSecret()).toBe('custom-dev-secret');
    });

    it('does not throw in assertProductionSecurity during development', () => {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'development';
      expect(() => assertProductionSecurity()).not.toThrow();
    });
  });

  describe('in production mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('fails fast when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      expect(() => getJwtSecret()).toThrow(/JWT_SECRET environment variable is required/);
      expect(() => assertProductionSecurity()).toThrow(/JWT_SECRET environment variable is required/);
    });

    it('fails fast when JWT_SECRET is empty string', () => {
      process.env.JWT_SECRET = '   ';
      expect(() => getJwtSecret()).toThrow(/JWT_SECRET environment variable is required/);
    });

    it('fails fast when JWT_SECRET is the default dev placeholder', () => {
      process.env.JWT_SECRET = DEFAULT_DEV_JWT_SECRET;
      expect(() => getJwtSecret()).toThrow(/Insecure or too short/);
    });

    it('fails fast when JWT_SECRET is shorter than 32 characters', () => {
      process.env.JWT_SECRET = 'too-short-secret-key-12345';
      expect(() => getJwtSecret()).toThrow(/minimum 32 characters required/);
    });

    it('accepts a strong 32+ character JWT_SECRET in production', () => {
      const strongSecret = 'super-secret-secure-production-jwt-key-2026-very-long';
      process.env.JWT_SECRET = strongSecret;
      expect(getJwtSecret()).toBe(strongSecret);
      expect(() => assertProductionSecurity()).not.toThrow();
    });
  });
});
