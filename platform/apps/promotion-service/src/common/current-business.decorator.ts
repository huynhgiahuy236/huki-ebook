import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { getJwtSecret } from "@huki/shared";

/**
 * CurrentBusiness decorator
 * Extracts business info from verified JWT token / request.user
 * Enforces business boundary: only administrators may specify an arbitrary businessId.
 */
export const CurrentBusiness = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    let user = request.user;

    if (!user) {
      const authorization = request.headers?.authorization;
      const [type, token] = String(authorization || "").split(" ");
      if (type === "Bearer" && token) {
        try {
          const payload = jwt.verify(
            token,
            getJwtSecret(),
          ) as any;
          user = {
            id: payload.sub || payload.id,
            email: payload.email,
            role: payload.role,
            businessId: payload.businessId || payload.business?.id,
          };
          request.user = user;
        } catch {
          user = undefined;
        }
      }
    }

    const headerBiz = request.headers?.["x-business-id"] as string;
    const queryBiz =
      (request.query?.["businessId"] as string) ||
      (request.query?.["business"] as string);
    const requestedBiz = headerBiz || queryBiz;

    const isAdmin =
      user?.role === 'PLATFORM_ADMIN' ||
      user?.role === 'ADMIN' ||
      user?.role === 'SUPER_ADMIN';

    // Platform admins may target a specific business via header or query.
    // Sellers and other roles are strictly confined to their verified business identity.
    let bizId: string;
    if (isAdmin && requestedBiz) {
      bizId = requestedBiz;
    } else {
      bizId =
        user?.businessId ||
        user?.business?.id ||
        user?.sub ||
        user?.id ||
        "seller";
    }

    return {
      id: bizId,
      userId: user?.id || user?.sub,
      role: user?.role,
      email: user?.email,
      ...user,
    };
  },
);
