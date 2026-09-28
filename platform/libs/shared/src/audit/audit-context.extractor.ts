/**
 * Audit Context Extractor
 * Safely extracts actor, client, and correlation context from incoming HTTP requests.
 */

import { Request } from 'express';
import { AuditActorContext } from './audit-types';

export class AuditContextExtractor {
  static extract(req: any): AuditActorContext {
    return this.extractFromRequest(req);
  }

  static extractFromRequest(req: any): AuditActorContext {
    if (!req) {
      return { actorId: 'SYSTEM' };
    }

    const user = (req as any).user || {};
    const actorId = user.id || user.sub || user.userId || 'ANONYMOUS';
    const actorRole = user.role || user.userType;
    const actorEmail = user.email;
    const storeId = user.storeId || (req.headers['x-store-id'] as string);

    // Correlation / Request ID from OpenTelemetry headers or custom headers
    const requestId =
      (req.headers['x-request-id'] as string) ||
      (req.headers['x-correlation-id'] as string) ||
      (req as any).traceId ||
      (req.headers['x-trace-id'] as string);

    // IP address extraction considering reverse proxies (API Gateway)
    const forwardedFor = req.headers['x-forwarded-for'];
    const ipAddress = (
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : req.ip || req.socket?.remoteAddress || '127.0.0.1'
    ) as string;

    const userAgent = (req.headers['user-agent'] as string) || undefined;

    return {
      actorId: String(actorId),
      actorRole: actorRole ? String(actorRole) : undefined,
      actorEmail: actorEmail ? String(actorEmail) : undefined,
      storeId: storeId ? String(storeId) : undefined,
      requestId: requestId ? String(requestId) : undefined,
      ipAddress,
      userAgent,
    };
  }
}
