import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface ShippingActor {
  sub: string;
  email?: string;
  role: string;
}
export type ShippingRequest = Request & { user?: ShippingActor };

@Injectable()
export class AuthenticatedGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ShippingRequest>();
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token)
      throw new UnauthorizedException('Bearer token is required');
    try {
      request.user = await this.jwt.verifyAsync<ShippingActor>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const actor = context.switchToHttp().getRequest<ShippingRequest>().user;
    if (actor?.role !== 'PLATFORM_ADMIN')
      throw new ForbiddenException('Platform administrator role is required');
    return true;
  }
}

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}
  canActivate(context: ExecutionContext) {
    const expected = this.config.get<string>('SHIPPING_INTERNAL_API_KEY');
    const provided = context
      .switchToHttp()
      .getRequest<Request>()
      .header('x-internal-api-key');
    if (!expected || provided !== expected)
      throw new UnauthorizedException('Invalid internal API key');
    return true;
  }
}
