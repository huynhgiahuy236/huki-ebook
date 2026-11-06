import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { throwForbidden, ErrorCode } from '@huki/shared';

@Injectable()
export class InternalAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers?.['x-internal-service-key'];
    const expectedKey = process.env.INTERNAL_SERVICE_KEY;

    if (!providedKey || !expectedKey || providedKey !== expectedKey) {
      if (typeof throwForbidden === 'function' && ErrorCode?.AUTHZ_FORBIDDEN) {
        throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, 'Invalid or missing internal service key');
      }
      throw new ForbiddenException('Invalid or missing internal service key');
    }

    return true;
  }
}

