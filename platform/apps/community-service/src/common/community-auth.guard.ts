import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { throwUnauthorized, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

export interface CommunityActor {
  sub: string;
  email?: string;
  fullName?: string;
  avatar?: string;
  role: string;
}

export type CommunityRequest = Request & { user?: CommunityActor };

async function authenticate(
  request: CommunityRequest,
  jwt: JwtService,
  optional: boolean,
): Promise<boolean> {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  if (!token && optional) return true;
  if (type !== 'Bearer' || !token) {
    throwUnauthorized(ErrorCode.AUTH_TOKEN_MISSING, 'Bearer token is required');
    return false;
  }
  const secrets = [
    process.env.JWT_SECRET,
    '0521ab048d035a99b2c967bcadd4fb2bea5c6ed05b4dc7fe5cc129fe50051890d79a031d1a8c036b29e5b74dc82ab6b1e67cd5be3fb6a0838cb6bb9080f818c0',
    'your-super-secret-jwt-key',
  ].filter(Boolean) as string[];

  for (const secret of secrets) {
    try {
      request.user = await jwt.verifyAsync<CommunityActor>(token, { secret });
      return true;
    } catch {
      // try next secret candidate
    }
  }

  throwUnauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid or expired access token');
  return false;
}

@Injectable()
export class AuthenticatedCommunityGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(context: ExecutionContext): Promise<boolean> {
    return authenticate(
      context.switchToHttp().getRequest<CommunityRequest>(),
      this.jwt,
      false,
    );
  }
}

@Injectable()
export class OptionalCommunityAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(context: ExecutionContext): Promise<boolean> {
    return authenticate(
      context.switchToHttp().getRequest<CommunityRequest>(),
      this.jwt,
      true,
    );
  }
}

@Injectable()
export class PlatformAdminCommunityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const actor = context.switchToHttp().getRequest<CommunityRequest>().user;
    if (actor?.role !== 'PLATFORM_ADMIN') {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT, 'Platform administrator role is required');
      return false;
    }
    return true;
  }
}
