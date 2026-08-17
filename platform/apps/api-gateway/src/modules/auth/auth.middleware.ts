import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor() {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.user = undefined;
      return next();
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      req.user = undefined;
      return next();
    }

    try {
      const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
      const payload = jwt.verify(token, secret) as any;

      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      next();
    } catch (error) {
      // Token invalid but don't block - let the specific route handle auth
      req.user = undefined;
      next();
    }
  }
}
