import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { throwUnauthorized, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

export interface ShippingActor {
  sub: string;
  email?: string;
  role: string;
}
export type ShippingRequest = Request & { user?: ShippingActor };

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ShippingRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throwUnauthorized(ErrorCode.AUTH_TOKEN_MISSING, 'Bearer token is required');
      return false;
    }
    try {
      request.user = await this.jwt.verifyAsync<ShippingActor>(token);
      return true;
    } catch {
      throwUnauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid or expired access token');
      return false;
    }
  }
}

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const actor = context.switchToHttp().getRequest<ShippingRequest>().user;
    if (actor?.role !== 'PLATFORM_ADMIN') {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT, 'Platform administrator role is required');
      return false;
    }
    return true;
  }
}

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('SHIPPING_INTERNAL_API_KEY');
    const provided = context
      .switchToHttp()
      .getRequest<Request>()
      .header('x-internal-api-key');
    if (!expected || provided !== expected) {
      throwUnauthorized(ErrorCode.AUTH_INTERNAL_API_KEY_INVALID, 'Invalid internal API key');
      return false;
    }
    return true;
  }
}
