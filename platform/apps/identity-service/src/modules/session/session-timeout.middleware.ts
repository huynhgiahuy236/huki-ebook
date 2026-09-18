/**
 * Session Timeout Middleware
 * Enforces session timeout policy for staff accounts
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SessionService } from './session.service';

export interface SessionTimeoutConfig {
  /** Default session timeout in milliseconds (default: 30 minutes) */
  defaultTimeout: number;
  /** Warning before timeout in milliseconds (default: 5 minutes) */
  warningBefore: number;
  /** Extended timeout for "remember me" in milliseconds (default: 7 days) */
  extendedTimeout: number;
}

@Injectable()
export class SessionTimeoutMiddleware implements NestMiddleware {
  constructor(private readonly sessionService: SessionService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    // Skip for non-authenticated routes
    const publicPaths = ['/health', '/api/health', '/api/v1/health'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Get session from request (set by auth middleware)
    const session = (req as any).session;
    if (!session?.id) {
      return next();
    }

    // Check if session is expired
    const now = new Date();
    const sessionExpiry = new Date(session.expiresAt);

    if (now > sessionExpiry) {
      // Session expired - send timeout response
      return res.status(401).json({
        success: false,
        error: {
          code: 'SESSION_TIMEOUT',
          message: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
        },
      });
    }

    // Check if approaching timeout (within warning period)
    const warningBefore = 5 * 60 * 1000; // 5 minutes
    const timeRemaining = sessionExpiry.getTime() - now.getTime();

    if (timeRemaining < warningBefore && timeRemaining > 0) {
      // Add header to indicate warning
      res.setHeader('X-Session-Warning', 'true');
      res.setHeader('X-Session-Expires-In', String(Math.floor(timeRemaining / 1000)));
    }

    // Update last active timestamp (async, don't wait)
    this.sessionService.updateLastActive(session.id).catch(() => {
      // Silently ignore errors
    });

    next();
  }
}

/**
 * Session Timeout Configuration
 */
export const SESSION_TIMEOUT_CONFIG: SessionTimeoutConfig = {
  defaultTimeout: 30 * 60 * 1000, // 30 minutes
  warningBefore: 5 * 60 * 1000, // 5 minutes
  extendedTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Session refresh endpoint handler
 */
export async function handleSessionRefresh(sessionService: SessionService, sessionId: string): Promise<{
  expiresAt: Date;
  timeRemaining: number;
}> {
  const now = new Date();
  const newExpiry = new Date(now.getTime() + SESSION_TIMEOUT_CONFIG.defaultTimeout);

  // Update session expiry
  await sessionService.updateSessionExpiry(sessionId, newExpiry);

  return {
    expiresAt: newExpiry,
    timeRemaining: SESSION_TIMEOUT_CONFIG.defaultTimeout,
  };
}
