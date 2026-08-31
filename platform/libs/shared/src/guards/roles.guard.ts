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
    const user = request.user;

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
