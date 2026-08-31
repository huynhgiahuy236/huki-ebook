/**
 * Unit tests for RolesGuard
 * Tests: no token => 401, USER/BUSINESS => 403, PLATFORM_ADMIN => allowed
 */

import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  function createMockContext(user?: { id: string; role?: string; userType?: string }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  }

  describe('when no roles are required', () => {
    it('should allow access when no roles are set', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const context = createMockContext({ id: 'user-1' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when empty roles array', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
      const context = createMockContext({ id: 'user-1' });
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('authentication checks', () => {
    it('should throw 401 (AUTH_TOKEN_INVALID) when user is not authenticated', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PLATFORM_ADMIN']);
      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow();
      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getStatus()).toBe(401);
        expect(e.getResponse().code).toBe('AUTH_TOKEN_INVALID');
      }
    });

    it('should throw 403 (AUTHZ_ROLE_INSUFFICIENT) when user object exists but no role', () => {
      // User is authenticated (user object exists) but lacks required role
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PLATFORM_ADMIN']);
      const context = createMockContext({ id: 'user-1' });

      expect(() => guard.canActivate(context)).toThrow();
      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getStatus()).toBe(403);
        expect(e.getResponse().code).toBe('AUTHZ_ROLE_INSUFFICIENT');
      }
    });
  });

  describe('authorization checks', () => {
    it('should throw 403 (AUTHZ_ROLE_INSUFFICIENT) when user has USER role but PLATFORM_ADMIN required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PLATFORM_ADMIN']);
      const context = createMockContext({ id: 'user-1', role: 'USER' });

      expect(() => guard.canActivate(context)).toThrow();
      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getStatus()).toBe(403);
        expect(e.getResponse().code).toBe('AUTHZ_ROLE_INSUFFICIENT');
      }
    });

    it('should throw 403 (AUTHZ_ROLE_INSUFFICIENT) when user has BUSINESS role but PLATFORM_ADMIN required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PLATFORM_ADMIN']);
      const context = createMockContext({ id: 'user-1', role: 'BUSINESS' });

      expect(() => guard.canActivate(context)).toThrow();
      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getStatus()).toBe(403);
        expect(e.getResponse().code).toBe('AUTHZ_ROLE_INSUFFICIENT');
      }
    });

    it('should throw 403 (AUTHZ_ROLE_INSUFFICIENT) when user has DELIVERY_STAFF role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PLATFORM_ADMIN']);
      const context = createMockContext({ id: 'user-1', role: 'DELIVERY_STAFF' });

      expect(() => guard.canActivate(context)).toThrow();
      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getStatus()).toBe(403);
        expect(e.getResponse().code).toBe('AUTHZ_ROLE_INSUFFICIENT');
      }
    });
  });

  describe('successful authorization', () => {
    it('should allow access when user has PLATFORM_ADMIN role', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PLATFORM_ADMIN']);
      const context = createMockContext({ id: 'admin-1', role: 'PLATFORM_ADMIN' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has any of the required roles', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PLATFORM_ADMIN', 'ADMIN']);
      const context = createMockContext({ id: 'user-1', role: 'ADMIN' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has USER role for USER-allowed endpoint', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['USER', 'BUSINESS']);
      const context = createMockContext({ id: 'user-1', role: 'USER' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should allow access when user has BUSINESS role for BUSINESS-allowed endpoint', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['BUSINESS', 'PLATFORM_ADMIN']);
      const context = createMockContext({ id: 'user-1', role: 'BUSINESS' });
      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe('userType fallback', () => {
    it('should allow access when user has correct userType', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PLATFORM_ADMIN']);
      const context = createMockContext({ id: 'admin-1', userType: 'PLATFORM_ADMIN' });
      expect(guard.canActivate(context)).toBe(true);
    });

    it('should throw 403 when userType does not match', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['PLATFORM_ADMIN']);
      const context = createMockContext({ id: 'user-1', userType: 'USER' });

      expect(() => guard.canActivate(context)).toThrow();
      try {
        guard.canActivate(context);
      } catch (e: any) {
        expect(e.getStatus()).toBe(403);
        expect(e.getResponse().code).toBe('AUTHZ_ROLE_INSUFFICIENT');
      }
    });
  });
});
