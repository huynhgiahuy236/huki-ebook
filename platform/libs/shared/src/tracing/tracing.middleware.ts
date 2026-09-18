// OpenTelemetry Tracing Middleware
// Automatically propagates trace context across services

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TracingService, TRACE_HEADER } from './tracing.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TracingMiddleware implements NestMiddleware {
  constructor(private readonly tracingService: TracingService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Get trace ID from header or generate new one
    const traceId = (req.headers[TRACE_HEADER] as string) || this.tracingService.generateTraceId();

    // Attach to request for use in services
    (req as any).traceId = traceId;

    // Add trace ID to response header
    res.setHeader(TRACE_HEADER, traceId);

    // Add trace ID to logging context
    (req as any).logContext = {
      traceId,
      timestamp: new Date().toISOString(),
    };

    next();
  }
}
