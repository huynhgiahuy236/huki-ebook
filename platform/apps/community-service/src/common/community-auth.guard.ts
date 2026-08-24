import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

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
  if (type !== 'Bearer' || !token)
    throw new UnauthorizedException('Bearer token is required');
  try {
    request.user = await jwt.verifyAsync<CommunityActor>(token);
    return true;
  } catch {
    throw new UnauthorizedException('Invalid or expired access token');
  }
}

@Injectable()
export class AuthenticatedCommunityGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(context: ExecutionContext) {
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
  canActivate(context: ExecutionContext) {
    return authenticate(
      context.switchToHttp().getRequest<CommunityRequest>(),
      this.jwt,
      true,
    );
  }
}

@Injectable()
export class PlatformAdminCommunityGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const actor = context.switchToHttp().getRequest<CommunityRequest>().user;
    if (actor?.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Platform administrator role is required');
    }
    return true;
  }
}
