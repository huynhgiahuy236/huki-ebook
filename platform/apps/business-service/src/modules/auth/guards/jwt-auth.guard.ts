import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@huki/shared/decorators';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.headers?.['x-user-id'] as string;
    if (userId) {
      request.user = {
        id: userId,
        sub: userId,
        role: (request.headers['x-user-role'] as string) || 'USER',
        email: (request.headers['x-user-email'] as string) || '',
      };
      return true;
    }

    return super.canActivate(context);
  }
}
