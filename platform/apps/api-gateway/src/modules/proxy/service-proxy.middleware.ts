import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingHttpHeaders, request as httpRequest } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import {
  classifyRoute,
  isInternalRoute,
  isPaymentWebhookRoute,
  ADMIN_ROLES,
  SELLER_ROLES,
} from './route-classification';

type ServiceName = 'identity' | 'business' | 'commerce' | 'shipping' | 'community' | 'promotion' | 'analytics';

const ROUTES: Record<string, ServiceName> = {
  'socket.io': 'community',
  auth: 'identity',
  users: 'identity',
  sessions: 'identity',
  businesses: 'business',
  stores: 'business',
  members: 'business',
  books: 'commerce',
  'ai-audio': 'commerce',
  reader: 'commerce',
  forensics: 'commerce',
  categories: 'commerce',
  authors: 'commerce',
  publishers: 'commerce',
  catalog: 'commerce',
  cart: 'commerce',
  orders: 'commerce',
  payments: 'commerce',
  wallet: 'commerce',
  payout: 'commerce',
  ledger: 'commerce',
  seller: 'commerce',
  shipping: 'shipping',
  shipments: 'shipping',
  'delivery-staff': 'shipping',
  callbacks: 'shipping',
  forum: 'community',
  chat: 'community',
  reviews: 'community',
  notifications: 'community',
  moderation: 'community',
  admin: 'community',
  vouchers: 'promotion',
  banners: 'promotion',
  'flash-sales': 'promotion',
  discounts: 'promotion',
  sanctions: 'commerce',
  'broadcast-notifications': 'business',
  'seller-features': 'business',
  'seller-penalties': 'business',
  'system-maintenance': 'identity',
  system: 'identity',
  maintenance: 'identity',
  affiliate: 'commerce',
  events: 'analytics',
  analytics: 'analytics',
};

const RETRYABLE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);

@Injectable()
export class ServiceProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ServiceProxyMiddleware.name);
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  private readonly authAttempts = new Map<string, number[]>();

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || req.ip || 'unknown';
  }

  private isRateLimited(ip: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const timestamps = (this.authAttempts.get(ip) || []).filter((t) => now - t < windowMs);
    if (timestamps.length >= limit) {
      this.authAttempts.set(ip, timestamps);
      return true;
    }
    timestamps.push(now);
    this.authAttempts.set(ip, timestamps);
    return false;
  }

  constructor(private readonly config: ConfigService) {
    this.timeoutMs = this.positiveNumber('PROXY_TIMEOUT_MS', 30_000);
    this.maxRetries = this.nonNegativeInteger('PROXY_MAX_RETRIES', 1);
    this.retryDelayMs = this.nonNegativeInteger('PROXY_RETRY_DELAY_MS', 100);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // 0. Ingress Hard Shielding: Block any attempt to access internal service-to-service endpoints
    if (isInternalRoute(req.originalUrl)) {
      return this.sendGatewayError(
        res,
        req,
        404,
        'SYSTEM_ERROR',
        `Cannot ${req.method} ${req.originalUrl}`,
      );
    }

    // Nest strips the matched route from req.path for wildcard middleware.
    // originalUrl retains the client path, including the global /api/v1 prefix.
    const service = this.resolveService(req.originalUrl);
    if (!service) return next();

    // Rate Limiting on Authentication Endpoints (BUG-MOD07-04)
    if (req.method === 'POST' && req.originalUrl.includes('/auth/login')) {
      const clientIp = this.getClientIp(req);
      const isLoopback =
        clientIp === '127.0.0.1' ||
        clientIp === '::1' ||
        clientIp === '::ffff:127.0.0.1' ||
        clientIp === 'localhost' ||
        clientIp === 'unknown';
      const isDev = process.env.NODE_ENV !== 'production';

      const bodyEmail = (req.body && typeof req.body.email === 'string')
        ? req.body.email.trim().toLowerCase()
        : '';
      const rateLimitKey = bodyEmail ? `${clientIp}:${bodyEmail}` : clientIp;
      const limit = isDev && isLoopback ? 100 : 10;

      if (this.isRateLimited(rateLimitKey, limit, 60_000)) {
        res.setHeader('Retry-After', '60');
        return this.sendGatewayError(
          res,
          req,
          429,
          'RATE_LIMIT_EXCEEDED',
          'Bạn đã thử đăng nhập tài khoản này quá nhiều lần. Vui lòng thử lại sau 60 giây.',
        );
      }
    }

    // 1. Route tier classification & authorization enforcement
    const tier = classifyRoute(req.method, req.originalUrl);
    const authError = (req as any).authError;
    const user = (req as any).user;

    if (tier === 'ADMIN') {
      if (authError) {
        return this.sendUnauthorized(res, req, authError.code, authError.message);
      }
      if (!user) {
        return this.sendUnauthorized(res, req, 'AUTH_TOKEN_MISSING', 'Authentication token is required');
      }
      if (!ADMIN_ROLES.has(user.role)) {
        return this.sendForbidden(res, req, 'AUTHZ_ROLE_INSUFFICIENT', 'Access denied. Administrator role required.');
      }
    } else if (tier === 'SELLER') {
      if (authError) {
        return this.sendUnauthorized(res, req, authError.code, authError.message);
      }
      if (!user) {
        return this.sendUnauthorized(res, req, 'AUTH_TOKEN_MISSING', 'Authentication token is required');
      }
      if (!SELLER_ROLES.has(user.role)) {
        return this.sendForbidden(res, req, 'AUTHZ_ROLE_INSUFFICIENT', 'Access denied. Seller or administrator role required.');
      }
    } else if (tier === 'AUTHENTICATED') {
      if (authError) {
        return this.sendUnauthorized(res, req, authError.code, authError.message);
      }
      if (!user) {
        return this.sendUnauthorized(res, req, 'AUTH_TOKEN_MISSING', 'Authentication token is required');
      }
    } else if (tier === 'PUBLIC') {
      // If the client explicitly sent an invalid/expired Bearer token to a public route,
      // return 401 so the client can trigger refresh instead of proceeding with an ambiguous session.
      // EXEMPTION: Payment & logistics webhooks must NOT be blocked by token verification failures!
      const isWebhook = isPaymentWebhookRoute(req.originalUrl);
      if (!isWebhook && authError && req.headers.authorization) {
        return this.sendUnauthorized(res, req, authError.code, authError.message);
      }
    }

    const host = this.config.get<string>(`services.${service}.host`);
    const port = this.config.get<number>(`services.${service}.port`);
    if (!host || !port) return next(new Error(`No target configured for ${service}`));

    const headers = this.forwardHeaders(req.headers, req, res);
    const body = this.serializeBody(req);
    if (body) {
      headers['content-length'] = Buffer.byteLength(body).toString();
    } else if (req.headers['content-length']) {
      headers['content-length'] = req.headers['content-length'];
    }

    const canRetry = RETRYABLE_METHODS.has(req.method.toUpperCase());
    const attempts = canRetry ? this.maxRetries + 1 : 1;

    const proxy = (attempt: number) => {
      let timedOut = false;
      const upstream = httpRequest(
        {
          host,
          port,
          method: req.method,
          path: req.originalUrl,
          headers,
          timeout: this.timeoutMs,
        },
        (upstreamResponse) => {
          const statusCode = upstreamResponse.statusCode ?? 502;
          if (
            canRetry &&
            attempt < attempts &&
            RETRYABLE_STATUS_CODES.has(statusCode)
          ) {
            upstreamResponse.resume();
            this.scheduleRetry(proxy, attempt, service, req);
            return;
          }

          res.status(statusCode);
          for (const [name, value] of Object.entries(upstreamResponse.headers)) {
            // Strip upstream CORS headers to preserve API Gateway's edge CORS policies
            if (name.toLowerCase().startsWith('access-control-')) {
              continue;
            }
            if (value !== undefined) res.setHeader(name, value);
          }
          upstreamResponse.pipe(res);
        },
      );

      upstream.on('timeout', () => {
        timedOut = true;
        upstream.destroy(new Error(`Upstream ${service} timed out after ${this.timeoutMs}ms`));
      });
      upstream.on('error', (error) => {
        if (res.headersSent || res.writableEnded) return;
        if (canRetry && attempt < attempts) {
          this.scheduleRetry(proxy, attempt, service, req, error);
          return;
        }

        const statusCode = timedOut ? 504 : 502;
        this.logger.warn(
          `Proxy ${req.method} ${req.originalUrl} to ${service} failed after ${attempt} attempt(s): ${error.message}`,
        );
        return this.sendGatewayError(
          res,
          req,
          statusCode,
          'SYSTEM_UNAVAILABLE',
          timedOut
            ? `Service ${service} timed out`
            : `Service ${service} is unavailable`,
        );
      });

      if (body) {
        upstream.end(body);
      } else if (canRetry) {
        // Safe methods have no request body to replay between attempts.
        upstream.end();
      } else {
        // Mutation bodies such as multipart uploads are streamed exactly once.
        req.pipe(upstream);
      }
    };

    proxy(1);
  }

  private getOrCreateCorrelationId(req?: Request, res?: Response, headers?: IncomingHttpHeaders): string {
    const reqHeaders = req?.headers || headers || {};
    const correlationId =
      (reqHeaders['x-correlation-id'] as string) ||
      (reqHeaders['x-request-id'] as string) ||
      (res && typeof res.getHeader === 'function' && !res.headersSent ? (res.getHeader('x-correlation-id') as string) : null) ||
      randomUUID();
    return correlationId;
  }

  private sendGatewayError(
    res: Response,
    req: Request,
    statusCode: number,
    code: string,
    message: string,
  ) {
    const correlationId = this.getOrCreateCorrelationId(req, res);
    if (!res.headersSent) {
      res.setHeader('x-correlation-id', correlationId);
    }
    return res.status(statusCode).json({
      status: 'error',
      statusCode,
      code,
      message,
      path: req.originalUrl,
      requestId: correlationId,
      timestamp: new Date().toISOString(),
    });
  }

  private sendUnauthorized(res: Response, req: Request, code: string, message: string) {
    return this.sendGatewayError(res, req, 401, code, message);
  }

  private sendForbidden(res: Response, req: Request, code: string, message: string) {
    return this.sendGatewayError(res, req, 403, code, message);
  }

  private scheduleRetry(
    proxy: (attempt: number) => void,
    attempt: number,
    service: ServiceName,
    req: Request,
    error?: Error,
  ) {
    this.logger.warn(
      `Retrying proxy ${req.method} ${req.originalUrl} to ${service} ` +
      `(attempt ${attempt + 1})${error ? ` after ${error.message}` : ''}`,
    );
    setTimeout(() => proxy(attempt + 1), this.retryDelayMs);
  }

  private resolveService(path: string): ServiceName | undefined {
    // Route /socket.io/* → community
    if (path.startsWith('/socket.io')) {
      return 'community';
    }

    // Match first segment
    const match = path.match(/^\/(?:api\/v1\/)?([^/?]+)/);
    if (!match) return undefined;

    const firstSegment = match[1];

    // Check for nested paths: /{first}/{id}/{second} or /{first}/{second}
    const nestedMatch = path.match(/^\/(?:api\/v1\/)?[^/]+\/[^/?]+\/([^/?]+)/);
    const secondNestedSegment = nestedMatch ? nestedMatch[1] : null;

    // Route /books/:id/reviews → community
    if (secondNestedSegment === 'reviews') {
      return 'community';
    }

    // Route /stores/:id/reviews → community
    // Route /admin/* routing (BUG-03-014)
    if (firstSegment === 'admin') {
      if (path.includes('/admin/broadcast-notifications')) {
        return 'business';
      }
      if (
        path.includes('/admin/finance') ||
        path.includes('/admin/drm') ||
        path.includes('/admin/affiliates')
      ) {
        return 'commerce';
      }
      return 'community';
    }

    // Route /reviews/* → community
    if (firstSegment === 'reviews') {
      return 'community';
    }

    // Route /seller/feature-flags or /seller/features → business
    if (firstSegment === 'seller' && (path.includes('/seller/feature-flags') || path.includes('/seller/features'))) {
      return 'business';
    }

    // Route /seller/penalties → business
    if (firstSegment === 'seller' && path.includes('/seller/penalties')) {
      return 'business';
    }

    // Route /system/maintenance → identity
    if (firstSegment === 'system' && path.includes('/system/maintenance')) {
      return 'identity';
    }

    if (firstSegment === 'seller' && (path.includes('/seller/vouchers') || path.includes('/seller/discounts'))) {
      return 'promotion';
    }

    // Standard first-segment routing
    return ROUTES[firstSegment];
  }

  private serializeBody(req: Request): string | undefined {
    if (!req.body || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return undefined;
    if (req.is('application/json') || req.is('application/*+json')) return JSON.stringify(req.body);
    return undefined;
  }

  private forwardHeaders(
    headers: IncomingHttpHeaders,
    req?: Request,
    res?: Response,
  ): IncomingHttpHeaders {
    const forwarded = { ...headers };
    delete forwarded.host;
    delete forwarded['content-length'];
    delete forwarded.connection;

    // Forward accurate client IP for downstream throttlers (BUG-MOD07-04)
    if (req) {
      const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip;
      if (clientIp) {
        forwarded['x-forwarded-for'] = Array.isArray(clientIp) ? clientIp.join(', ') : String(clientIp);
      }
    }

    // 1. Strip all incoming identity & internal service headers from untrusted client
    for (const key of Object.keys(forwarded)) {
      const lower = key.toLowerCase();
      if (
        lower.startsWith('x-user-') ||
        lower.startsWith('x-internal-') ||
        lower === 'x-internal-service' ||
        lower === 'x-business-id' ||
        lower === 'x-store-id' ||
        lower === 'x-roles'
      ) {
        delete forwarded[key];
      }
    }

    // 2. Propagate or generate correlation ID
    const correlationId = this.getOrCreateCorrelationId(req, res, headers);
    forwarded['x-correlation-id'] = correlationId;
    if (res && !res.headersSent) {
      res.setHeader('x-correlation-id', correlationId);
    }

    // 3. Only generate identity headers from verified user decoded from valid JWT
    if (req && (req as any).user) {
      const user = (req as any).user;
      if (user.id) forwarded['x-user-id'] = user.id;
      if (user.role) forwarded['x-user-role'] = user.role;
      if (user.email) forwarded['x-user-email'] = user.email;
      if (user.businessId) forwarded['x-business-id'] = user.businessId;
      if (!forwarded['authorization'] && (req as any).token) {
        forwarded['authorization'] = `Bearer ${(req as any).token}`;
      }
    }

    return forwarded;
  }

  private positiveNumber(key: string, fallback: number): number {
    const value = Number(this.config.get(key) ?? fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private nonNegativeInteger(key: string, fallback: number): number {
    const value = Number(this.config.get(key) ?? fallback);
    return Number.isInteger(value) && value >= 0 ? value : fallback;
  }
}
