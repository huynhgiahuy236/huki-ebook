import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../../../../libs/shared/src/decorators/roles.decorator';

// Role hierarchy
export enum UserRole {
  USER = 'USER',
  BUSINESS = 'BUSINESS',
  DELIVERY_STAFF = 'DELIVERY_STAFF',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const userRole = user.role;

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => userRole === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${userRole}`,
      );
    }

    return true;
  }
}

// Optional: Higher-order guard for admin-only routes
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}

// Guard for user-only routes (non-business, non-admin)
@Injectable()
export class UserOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role !== UserRole.USER) {
      throw new ForbiddenException('This route is for regular users only');
    }

    return true;
  }
}
