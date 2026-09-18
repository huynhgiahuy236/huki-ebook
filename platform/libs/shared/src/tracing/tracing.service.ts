// OpenTelemetry Tracing Service
// Shared module for distributed tracing

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// Trace context for correlation
export const TRACE_HEADER = 'x-trace-id';

@Injectable()
export class TracingService implements OnModuleInit, OnModuleDestroy {
  private sdk: any = null;
  private serviceName: string;

  constructor() {
    this.serviceName = process.env.OTEL_SERVICE_NAME || 'huki-service';
  }

  async onModuleInit() {
    const isEnabled = process.env.OTEL_ENABLED === 'true';

    if (!isEnabled) {
      console.log('📊 Tracing disabled (OTEL_ENABLED=false)');
      return;
    }

    try {
      const dynamicRequire = (mod: string) => require(mod);
      const { NodeSDK } = dynamicRequire('@opentelemetry/sdk-node');
      const { OTLPTraceExporter } = dynamicRequire('@opentelemetry/exporter-trace-otlp-grpc');
      const { Resource } = dynamicRequire('@opentelemetry/resources');
      const { SemanticResourceAttributes } = dynamicRequire('@opentelemetry/semantic-conventions');
      const { BatchSpanProcessor } = dynamicRequire('@opentelemetry/sdk-trace-base');
      const { HttpInstrumentation } = dynamicRequire('@opentelemetry/instrumentation-http');
      const { ExpressInstrumentation } = dynamicRequire('@opentelemetry/instrumentation-express');
      const { PrismaInstrumentation } = dynamicRequire('@opentelemetry/instrumentation-prisma');
      const { RedisInstrumentation } = dynamicRequire('@opentelemetry/instrumentation-redis-4');
      const { RabbitMQInstrumentation } = dynamicRequire('@opentelemetry/instrumentation-amqplib');

      // Configure OTLP exporter (Tempo)
      const otlpExporter = new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
      });

      this.sdk = new NodeSDK({
        resource: new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
        }),
        spanProcessor: new BatchSpanProcessor(otlpExporter),
        instrumentations: [
          new HttpInstrumentation({
            ignoreIncomingRequestHook: (req: any) => {
              return req.url === '/health' || req.url === '/api/v1/health';
            },
            requestHook: (span: any) => {
              span.setAttribute('http.request_id', uuidv4());
            },
          }),
          new ExpressInstrumentation(),
          new PrismaInstrumentation({
            middleware: true,
          }),
          new RedisInstrumentation(),
          new RabbitMQInstrumentation(),
        ],
      });

      await this.sdk.start();
      console.log(`📊 Tracing initialized for ${this.serviceName}`);
      console.log(`📊 OTEL endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`);
    } catch (error) {
      console.error('📊 Failed to initialize tracing:', error);
    }
  }

  // Generate trace ID for correlation
  generateTraceId(): string {
    return uuidv4().replace(/-/g, '');
  }

  // Get current trace ID
  getCurrentTraceId(): string | undefined {
    return undefined;
  }

  async onModuleDestroy() {
    if (this.sdk && typeof this.sdk.shutdown === 'function') {
      await this.sdk.shutdown();
    }
  }
}

