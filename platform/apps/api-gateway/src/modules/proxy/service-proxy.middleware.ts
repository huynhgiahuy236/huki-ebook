import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IncomingHttpHeaders, request as httpRequest } from 'node:http';
import { Request, Response, NextFunction } from 'express';

type ServiceName = 'identity' | 'business' | 'commerce' | 'shipping' | 'community' | 'promotion';

const ROUTES: Record<string, ServiceName> = {
  auth: 'identity',
  users: 'identity',
  sessions: 'identity',
  businesses: 'business',
  stores: 'business',
  members: 'business',
  books: 'commerce',
  categories: 'commerce',
  authors: 'commerce',
  publishers: 'commerce',
  catalog: 'commerce',
  cart: 'commerce',
  orders: 'commerce',
  payments: 'commerce',
  'seller': 'commerce',
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

    const host = this.config.get<string>(`services.${service}.host`);
    const port = this.config.get<number>(`services.${service}.port`);
    if (!host || !port) return next(new Error(`No target configured for ${service}`));

    const headers = this.forwardHeaders(req.headers);
    const body = this.serializeBody(req);
    if (body) headers['content-length'] = Buffer.byteLength(body).toString();

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
    // Route /admin/* → community
    if (firstSegment === 'admin') {
      return 'community';
    }

    // Route /reviews/* → community
    if (firstSegment === 'reviews') {
      return 'community';
    }

    // Standard first-segment routing
    return ROUTES[firstSegment];
  }

  private serializeBody(req: Request): string | undefined {
    if (!req.body || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return undefined;
    if (req.is('application/json') || req.is('application/*+json')) return JSON.stringify(req.body);
    return undefined;
  }

  private forwardHeaders(headers: IncomingHttpHeaders): IncomingHttpHeaders {
    const forwarded = { ...headers };
    delete forwarded.host;
    delete forwarded['content-length'];
    delete forwarded.connection;
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
