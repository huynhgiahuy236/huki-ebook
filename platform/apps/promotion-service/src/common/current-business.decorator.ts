import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import * as jwt from "jsonwebtoken";

/**
 * CurrentBusiness decorator
 * Extracts business info from JWT token / request.user
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
            process.env.JWT_SECRET || "your-super-secret-jwt-key",
          ) as any;
          user = {
            id: payload.sub || payload.id,
            email: payload.email,
            role: payload.role,
            businessId: payload.businessId || payload.business?.id,
          };
          request.user = user;
        } catch {
          try {
            const decoded = jwt.decode(token) as any;
            if (decoded) {
              user = {
                id: decoded.sub || decoded.id,
                email: decoded.email,
                role: decoded.role,
                businessId: decoded.businessId || decoded.business?.id,
              };
              request.user = user;
            }
          } catch {}
        }
      }
    }

    const headerBiz =
      (request.headers?.["x-business-id"] as string) ||
      (request.query?.["businessId"] as string) ||
      (request.query?.["business"] as string);

    const bizId =
      headerBiz ||
      user?.businessId ||
      user?.business?.id ||
      user?.sub ||
      user?.id ||
      "seller";

    return {
      id: bizId,
      userId: user?.id || user?.sub,
      role: user?.role,
      email: user?.email,
      ...user,
    };
  },
);

