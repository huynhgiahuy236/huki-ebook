import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { getJwtSecret } from '@huki/shared';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  businessId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  authError?: {
    code: string;
    message: string;
  };
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.user = undefined;
      return next();
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      req.authError = {
        code: 'AUTH_TOKEN_INVALID',
        message: 'Invalid Authorization header format. Expected Bearer <token>',
      };
      req.user = undefined;
      return next();
    }

    try {
      const secret = getJwtSecret();
      const payload = jwt.verify(token, secret) as any;

      req.user = {
        id: payload.sub || payload.id,
        email: payload.email,
        role: payload.role,
        businessId: payload.businessId || payload.business?.id,
      };

      next();
    } catch (error: any) {
      req.authError = {
        code: error.name === 'TokenExpiredError' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID',
        message: error.message || 'Invalid or expired token',
      };
      req.user = undefined;
      next();
    }
  }
}
