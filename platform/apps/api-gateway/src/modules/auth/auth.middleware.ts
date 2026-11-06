import { randomUUID } from 'crypto';
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
    // 1. Strip denylist spoofed identity & internal keys from incoming client headers immediately
    for (const key of Object.keys(req.headers)) {
      const lower = key.toLowerCase();
      if (
        lower.startsWith('x-user-') ||
        lower.startsWith('x-internal-') ||
        lower === 'x-internal-service' ||
        lower === 'x-business-id' ||
        lower === 'x-store-id' ||
        lower === 'x-roles'
      ) {
        delete req.headers[key];
      }
    }

    // 2. Propagate or generate correlation ID early
    const correlationId =
      (req.headers['x-correlation-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      randomUUID();
    req.headers['x-correlation-id'] = correlationId;
    req.headers['x-request-id'] = correlationId;
    (req as any).id = correlationId;
    if (!res.headersSent) {
      res.setHeader('x-correlation-id', correlationId);
      res.setHeader('x-request-id', correlationId);
    }

    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const [type, t] = authHeader.split(' ');
      if (type !== 'Bearer' || !t) {
        req.authError = {
          code: 'AUTH_TOKEN_INVALID',
          message: 'Invalid Authorization header format. Expected Bearer <token>',
        };
        req.user = undefined;
        return next();
      }
      token = t;
    } else if ((req as any).cookies) {
      token = (req as any).cookies['huki_access_token'] || (req as any).cookies['token'] || (req as any).cookies['accessToken'];
    }

    if (!token && req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)(?:huki_access_token|token|accessToken)=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
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
