import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../../../../libs/shared/src/decorators/roles.decorator';
import { throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, 'User not authenticated');
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT, `Access denied. Required roles: ${requiredRoles.join(', ')}`);
      return false;
    }

    return true;
  }
}
