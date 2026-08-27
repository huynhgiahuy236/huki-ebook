import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { throwUnauthorized, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

export interface BookActor {
  sub: string;
  email?: string;
  role: 'BUSINESS' | 'PLATFORM_ADMIN' | string;
}

export type BookRequest = Request & { user?: BookActor };

async function authenticate(
  request: BookRequest,
  jwtService: JwtService,
  optional: boolean,
): Promise<BookActor | null> {
  const [type, token] = request.headers.authorization?.split(' ') ?? [];
  if (!token && optional) return null;
  if (type !== 'Bearer' || !token) {
    throwUnauthorized(ErrorCode.AUTH_TOKEN_MISSING, 'Bearer token is required');
  }
  try {
    const actor = await jwtService.verifyAsync<BookActor>(token);
    request.user = actor;
    return actor;
  } catch {
    throwUnauthorized(ErrorCode.AUTH_TOKEN_INVALID, 'Invalid or expired access token');
    return null; // unreachable but satisfies TS
  }
}

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await authenticate(
      context.switchToHttp().getRequest<BookRequest>(),
      this.jwtService,
      false,
    );
    return true;
  }
}

@Injectable()
export class BookWriteGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const actor = await authenticate(
      context.switchToHttp().getRequest<BookRequest>(),
      this.jwtService,
      false,
    );
    if (!actor || !['BUSINESS', 'PLATFORM_ADMIN'].includes(actor.role)) {
      throwForbidden(ErrorCode.AUTHZ_ROLE_INSUFFICIENT, 'Business or platform administrator role is required');
    }
    return true;
  }
}

@Injectable()
export class OptionalBookAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await authenticate(
      context.switchToHttp().getRequest<BookRequest>(),
      this.jwtService,
      true,
    );
    return true;
  }
}
