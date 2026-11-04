import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: string;
  email: string;
  role: string;
}

/**
 * Get current authenticated user from request
 * Usage: @CurrentUser() or @CurrentUser('id')
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    let user = request.user as CurrentUserData;

    if (!user && request.headers?.['x-user-id']) {
      user = {
        id: request.headers['x-user-id'],
        email: request.headers['x-user-email'] || '',
        role: request.headers['x-user-role'] || 'USER',
      };
    }

    if (!user) {
      return null;
    }

    if (data) {
      return user[data];
    }

    return user;
  },
);
