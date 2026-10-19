import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators';
import { ErrorCode } from '../errors/error-code';
import { throwUnauthorized, throwForbidden } from '../errors/throw-helpers';

/**
 * Guard to enforce role-based access control
 * Must be used after JwtAuthGuard to ensure user is authenticated
 *
 * Uses ErrorCode contract for consistent error responses:
 * - AUTH_TOKEN_INVALID (401) when user not authenticated
 * - AUTHZ_ROLE_INSUFFICIENT (403) when user lacks required role
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    let user = request.user;

    // 1. Try extracting from Gateway forwarded headers
    if (!user && request.headers) {
      const headerUserId = request.headers['x-user-id'];
      const headerRole = request.headers['x-user-role'];
      const headerEmail = request.headers['x-user-email'];
      if (headerUserId) {
        user = {
          id: String(headerUserId),
          role: String(headerRole || ''),
          email: headerEmail ? String(headerEmail) : undefined,
        };
        request.user = user;
      }
    }

    // 2. Try decoding Authorization Bearer JWT
    if (!user && request.headers?.authorization) {
      const [type, token] = String(request.headers.authorization).split(' ');
      if (type === 'Bearer' && token) {
        try {
          const jwt = require('jsonwebtoken');
          const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
          const payload = jwt.verify(token, secret) as any;
          user = {
            id: payload.sub || payload.id,
            email: payload.email,
            role: payload.role || payload.userType,
          };
          request.user = user;
        } catch {
          try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(token) as any;
            if (decoded && (decoded.sub || decoded.id)) {
              user = {
                id: decoded.sub || decoded.id,
                email: decoded.email,
                role: decoded.role || decoded.userType,
              };
              request.user = user;
            }
          } catch {
            user = undefined;
          }
        }
      }
    }

    // Check if user is authenticated
    if (!user) {
      throwUnauthorized(ErrorCode.AUTH_TOKEN_INVALID);
    }

    // Check if user has required role
    const userRole = user.role || user.userType;
    if (!userRole || !requiredRoles.includes(userRole)) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT);
    }

    return true;
  }
}
