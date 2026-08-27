import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

export const ROLES_KEY = 'roles';

export function Roles(...roles: string[]) {
  return (
    target: any,
    propertyKey?: string,
    descriptor?: PropertyDescriptor,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value);
    } else {
      Reflect.defineMetadata(ROLES_KEY, roles, target);
    }
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, 'User not authenticated');
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT, 'Insufficient permissions');
      return false;
    }

    return true;
  }
}
