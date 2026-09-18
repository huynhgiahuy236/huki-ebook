import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * CurrentBusiness decorator
 * Extracts business info from JWT token
 */
export const CurrentBusiness = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return {
      id: user.businessId || user.business?.id,
      userId: user.id || user.sub,
      role: user.role,
      email: user.email,
      // Also include full user object for reference
      ...user,
    };
  },
);
