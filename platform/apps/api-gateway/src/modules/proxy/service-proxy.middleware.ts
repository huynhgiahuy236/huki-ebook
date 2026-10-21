import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingHttpHeaders, request as httpRequest } from 'node:http';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import {
  classifyRoute,
  ADMIN_ROLES,
  SELLER_ROLES,
} from './route-classification';

type ServiceName = 'identity' | 'business' | 'commerce' | 'shipping' | 'community' | 'promotion' | 'analytics';

const ROUTES: Record<string, ServiceName> = {
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

  constructor(private readonly config: ConfigService) {
    this.timeoutMs = this.positiveNumber('PROXY_TIMEOUT_MS', 30_000);
    this.maxRetries = this.nonNegativeInteger('PROXY_MAX_RETRIES', 1);
    this.retryDelayMs = this.nonNegativeInteger('PROXY_RETRY_DELAY_MS', 100);
  }

  use(req: Request, res: Response, next: NextFunction) {
    // Nest strips the matched route from req.path for wildcard middleware.
    // originalUrl retains the client path, including the global /api/v1 prefix.
    const service = this.resolveService(req.originalUrl);
    if (!service) return next();

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
      if (authError && req.headers.authorization) {
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
        res.status(statusCode).json({
          status: 'error',
          statusCode,
          code: 'SYSTEM_UNAVAILABLE',
          message: timedOut
            ? `Service ${service} timed out`
            : `Service ${service} is unavailable`,
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
        });
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

  private sendUnauthorized(res: Response, req: Request, code: string, message: string) {
    res.status(401).json({
      status: 'error',
      statusCode: 401,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
  }

  private sendForbidden(res: Response, req: Request, code: string, message: string) {
    res.status(403).json({
      status: 'error',
      statusCode: 403,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
    });
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
    // Route /admin/finance/* or /admin/drm/* → commerce
    if (firstSegment === 'admin') {
      if (path.includes('/admin/finance') || path.includes('/admin/drm')) {
        return 'commerce';
      }
      return 'community';
    }

    // Route /reviews/* → community
    if (firstSegment === 'reviews') {
      return 'community';
    }

    // Route /seller/vouchers/* or /seller/discounts/* → promotion
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

    // 1. Strip all incoming identity headers from untrusted client
    for (const key of Object.keys(forwarded)) {
      const lower = key.toLowerCase();
      if (
        lower.startsWith('x-user-') ||
        lower === 'x-business-id' ||
        lower === 'x-store-id' ||
        lower === 'x-internal-service' ||
        lower === 'x-roles'
      ) {
        delete forwarded[key];
      }
    }

    // 2. Propagate or generate correlation ID
    const correlationId =
      (headers['x-correlation-id'] as string) ||
      (headers['x-request-id'] as string) ||
      randomUUID();
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
