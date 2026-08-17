import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

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
    throw new UnauthorizedException('Bearer token is required');
  }
  try {
    const actor = await jwtService.verifyAsync<BookActor>(token);
    request.user = actor;
    return actor;
  } catch {
    throw new UnauthorizedException('Invalid or expired access token');
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
      throw new ForbiddenException('Business or platform administrator role is required');
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
