// OpenTelemetry Tracing Module
import { Module, Global } from '@nestjs/common';
import { TracingService } from './tracing.service';
import { TracingMiddleware } from './tracing.middleware';

@Global()
@Module({
  providers: [TracingService, TracingMiddleware],
  exports: [TracingService, TracingMiddleware],
})
export class TracingModule {}

// Export the trace header name for use in HTTP clients
export { TRACE_HEADER } from './tracing.service';
