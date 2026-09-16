import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import * as jwt from "jsonwebtoken";
import { throwForbidden } from "@huki/shared/errors";
import { ErrorCode } from "@huki/shared/errors";

export const ROLES_KEY = "roles";

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
    let user = request.user;

    if (!user) {
      const authorization = request.headers?.authorization;
      const [type, token] = String(authorization || "").split(" ");
      if (type === "Bearer" && token) {
        try {
          const payload = jwt.verify(
            token,
            process.env.JWT_SECRET || "your-super-secret-jwt-key",
          ) as any;
          user = {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
          };
          request.user = user;
        } catch {
          user = undefined;
        }
      }
    }

    if (!user) {
      throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, "User not authenticated");
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    if (!hasRole) {
      throwForbidden(
        ErrorCode.AUTHZ_ROLE_INSUFFICIENT,
        "Insufficient permissions",
      );
      return false;
    }

    return true;
  }
}
