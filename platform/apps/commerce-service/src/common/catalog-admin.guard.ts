import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { throwUnauthorized, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

interface AccessTokenPayload {
  sub: string;
  role: string;
}

@Injectable()
export class CatalogAdminGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) {
      throwUnauthorized(ErrorCode.AUTH_TOKEN_MISSING, 'Bearer token is required');
    }

    let payload: AccessTokenPayload | undefined;
    try {
      payload = await this.jwtService.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throwUnauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid or expired access token');
      return false; // unreachable but satisfies TS
    }
    if (payload && payload.role !== 'PLATFORM_ADMIN') {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT, 'Platform administrator role is required');
    }
    if (payload) {
      (request as Request & { user?: AccessTokenPayload }).user = payload;
    }
    return true;
  }
}
