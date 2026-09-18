# Distributed Tracing Setup Guide - HUKI EBOOK

## Overview

OpenTelemetry provides distributed tracing across all microservices for end-to-end visibility.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Services   │────▶│  OpenTelemetry│────▶│   Tempo    │
│  (Auto-instrumented)│  SDK        │     │  (Storage) │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   Grafana   │
                                        │  (Traces)   │
                                        └─────────────┘
```

## Prerequisites

1. OpenTelemetry packages:
   ```bash
   npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-grpc @opentelemetry/resources @opentelemetry/semantic-conventions
   ```

2. Tempo running at port 3200

## Quick Start

### 1. Start Tempo

```bash
docker-compose -f docker/tempo.docker-compose.yml up -d
```

### 2. Enable Tracing in Services

```bash
# Set environment variable
export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_SERVICE_NAME=commerce-service

# Restart service
npm run start:commerce
```

### 3. Access Traces in Grafana

1. Go to http://localhost:3001
2. Navigate to **Explore**
3. Select **Tempo** datasource
4. Search for traces by service, operation, or trace ID

## Services Instrumented

| Service | Status | Port |
|---------|--------|------|
| api-gateway | ✅ Ready | 3000 |
| identity-service | ✅ Ready | 3001 |
| business-service | ✅ Ready | 3002 |
| commerce-service | ✅ Ready | 3003 |
| shipping-service | ✅ Ready | 3004 |
| community-service | ✅ Ready | 3005 |
| promotion-service | ✅ Ready | 3006 |

## Trace Context Propagation

### HTTP Headers

Traces are automatically propagated via HTTP headers:

```
x-trace-id: <trace-id>
b3: <b3-header> (Zipkin compatibility)
```

### RabbitMQ Messages

Traces are propagated in message headers:
```json
{
  "traceparent": "00-<trace-id>-<span-id>-01",
  "tracestate": ""
}
```

## Key Spans Captured

### HTTP
- Request method, path, status code
- Request/response size
- Latency

### Database (Prisma)
- Query type (SELECT, INSERT, UPDATE, DELETE)
- Query duration
- Number of rows affected

### Redis
- Command type
- Key pattern
- Duration

### RabbitMQ
- Exchange, queue, routing key
- Message ID
- Publish/consume duration

## Common Trace Queries

```logql
# Traces by service
{ service="commerce-service" }

# Traces with errors
{ service="commerce-service" } | status = error

# Trace by ID
{ service=~".*" } | trace_id = "550e8400-e29b-41d4-a716-446655440000"

# Slow traces (> 1s)
{ service="commerce-service" } | duration > 1000ms

# Order creation trace
{ service="commerce-service" } | operation = "POST /orders"
```

## Grafana Features

### Service Graph
Visual dependency graph between services

### Trace View
- Flame graph
- Span timeline
- Resource attributes
- Events and logs

### Service Level Objectives (SLOs)
- P50, P90, P99 latency
- Error rate per service

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| OTEL_ENABLED | false | Enable/disable tracing |
| OTEL_EXPORTER_OTLP_ENDPOINT | localhost:4317 | OTLP endpoint |
| OTEL_SERVICE_NAME | huki-service | Service name |
| OTEL_TRACES_SAMPLER | always_on | Sampler type |
| OTEL_TRACES_SAMPLER_ARG | 1.0 | Sample rate |

### Sampling

For production, use probabilistic sampling:
```bash
export OTEL_TRACES_SAMPLER=traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1  # 10% of traces
```

## Troubleshooting

### No traces appearing

1. Check Tempo is running: `curl http://localhost:3200/ready`
2. Check OTEL_ENABLED=true
3. Check OTEL_EXPORTER_OTLP_ENDPOINT
4. Check service logs for tracing errors

### High memory usage

Reduce sampling rate:
```bash
export OTEL_TRACES_SAMPLER_ARG=0.01  # 1%
```

## Best Practices

1. **Use trace IDs in logs** for correlation
2. **Add custom spans** for business logic
3. **Set appropriate sampling** for production
4. **Use baggage** for cross-service context
5. **Monitor span sizes** - avoid logging large payloads

## Next Steps

- [ ] Add custom spans for key business operations
- [ ] Set up SLOs and alerts
- [ ] Configure sampling policies
- [ ] Integrate with error tracking (Sentry)
