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
  vouchers: 'promotion',
  banners: 'promotion',
  'flash-sales': 'promotion',
};

@Injectable()
export class ServiceProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ServiceProxyMiddleware.name);
  private readonly timeoutMs: number;

  constructor(private readonly config: ConfigService) {
    this.timeoutMs = Number(this.config.get('PROXY_TIMEOUT_MS') ?? 30_000);
  }

  use(req: Request, res: Response, next: NextFunction) {
    const service = this.resolveService(req.path);
    if (!service) return next();

    const host = this.config.get<string>(`services.${service}.host`);
    const port = this.config.get<number>(`services.${service}.port`);
    if (!host || !port) return next(new Error(`No target configured for ${service}`));

    const headers = this.forwardHeaders(req.headers);
    const body = this.serializeBody(req);
    if (body) headers['content-length'] = Buffer.byteLength(body).toString();

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
        res.status(upstreamResponse.statusCode ?? 502);
        for (const [name, value] of Object.entries(upstreamResponse.headers)) {
          if (value !== undefined) res.setHeader(name, value);
        }
        upstreamResponse.pipe(res);
      },
    );

    upstream.on('timeout', () => {
      upstream.destroy(new Error(`Upstream ${service} timed out after ${this.timeoutMs}ms`));
    });
    upstream.on('error', (error) => {
      if (res.headersSent) return;
      this.logger.warn(`Proxy ${req.method} ${req.originalUrl} to ${service} failed: ${error.message}`);
      res.status(502).json({
        status: 'error',
        statusCode: 502,
        code: 'SYSTEM_UNAVAILABLE',
        message: `Service ${service} is unavailable`,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
      });
    });

    if (body) {
      upstream.end(body);
    } else {
      req.pipe(upstream);
    }
  }

  private resolveService(path: string): ServiceName | undefined {
    const match = path.match(/^\/api\/v1\/([^/?]+)/);
    return match ? ROUTES[match[1]] : undefined;
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
}
