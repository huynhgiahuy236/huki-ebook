# Log Format Standard for HUKI EBOOK

## JSON Log Format

All services MUST log in the following JSON format:

```json
{
  "timestamp": "2026-09-17T10:30:00.123Z",
  "level": "info|warn|error|debug",
  "service": "commerce-service",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Human readable message",
  "metadata": {
    "key": "value"
  }
}
```

## Log Levels

| Level | Usage |
|-------|-------|
| `debug` | Detailed debugging information |
| `info` | General operational information |
| `warn` | Warning conditions (potential issues) |
| `error` | Error conditions (failures) |

## Required Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timestamp` | ISO8601 | ✅ | UTC timestamp with nanoseconds |
| `level` | string | ✅ | Log level |
| `service` | string | ✅ | Service name |
| `message` | string | ✅ | Human-readable message |
| `trace_id` | string | ⭐ | Correlation ID for tracing |
| `metadata` | object | ⭐ | Additional structured data |

## Example Logs

### HTTP Request
```json
{
  "timestamp": "2026-09-17T10:30:00.123Z",
  "level": "info",
  "service": "commerce-service",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "HTTP GET /api/v1/books completed",
  "metadata": {
    "method": "GET",
    "path": "/api/v1/books",
    "status": 200,
    "duration_ms": 45,
    "user_id": "user123"
  }
}
```

### Database Query
```json
{
  "timestamp": "2026-09-17T10:30:00.456Z",
  "level": "debug",
  "service": "commerce-service",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Database query executed",
  "metadata": {
    "query": "SELECT * FROM books WHERE active = true",
    "duration_ms": 12,
    "rows": 150
  }
}
```

### Error
```json
{
  "timestamp": "2026-09-17T10:30:00.789Z",
  "level": "error",
  "service": "commerce-service",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Payment processing failed",
  "metadata": {
    "error": "Payment gateway timeout",
    "order_id": "order123",
    "amount": 99000,
    "retry_count": 3
  }
}
```

### Business Event
```json
{
  "timestamp": "2026-09-17T10:30:01.000Z",
  "level": "info",
  "service": "commerce-service",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Order created successfully",
  "metadata": {
    "order_id": "order123",
    "customer_id": "customer456",
    "total_amount": 299000,
    "item_count": 3
  }
}
```

## Implementation in NestJS

```typescript
// Create a structured logger service
@Injectable()
export class StructuredLogger {
  log(level: LogLevel, message: string, metadata?: Record<string, any>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'commerce-service',
      trace_id: this.getTraceId(),
      message,
      metadata: metadata || {},
    };
    
    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }

  info(message: string, metadata?: Record<string, any>) {
    this.log('info', message, metadata);
  }

  error(message: string, metadata?: Record<string, any>) {
    this.log('error', message, metadata);
  }
}
```

## Loki Queries

### Common Log Queries

```logql
# All errors in last 5 minutes
{service=~"huki-.*", level="error"}

# Logs by trace ID
{service="commerce-service"} |= "550e8400-e29b-41d4-a716-446655440000"

# Slow requests (> 1s)
{service="commerce-service"} | json | duration_ms > 1000

# Payment failures
{service="commerce-service"} |= "Payment" and "failed"

# User-specific logs
{service="commerce-service"} | json | user_id = "user123"

# Error rate by service
sum by (service) (rate({level="error"}[5m])) / sum by (service) (rate({service=~"huki-.*"}[5m]))
```

### Metrics from Logs

```logql
# Request rate from logs
sum by (service, path) (rate({service=~"huki-.*"} | json [5m]))

# Error count by service
sum by (service) (count_over_time({level="error"}[1m]))
```

## Best Practices

1. **Always include trace_id** for correlation across services
2. **Use structured metadata** instead of embedding in message
3. **Keep messages concise** but descriptive
4. **Include relevant IDs** (order_id, user_id, etc.)
5. **Sanitize sensitive data** (passwords, tokens, PII)
6. **Use appropriate log levels** (don't log everything as error)
