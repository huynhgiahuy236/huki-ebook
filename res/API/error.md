# Error Response Schema

## Standard Error Response

```json
{
  "statusCode": 400,
  "message": "Sách không tìm thấy",
  "code": "BOOK_NOT_FOUND",
  "timestamp": "2026-08-24T10:00:00.000Z",
  "path": "/api/v1/books/uuid-not-found"
}
```

## With Details

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "email",
      "message": "email must be a valid email"
    },
    {
      "field": "password",
      "message": "password must be at least 8 characters"
    }
  ],
  "timestamp": "2026-08-24T10:00:00.000Z",
  "path": "/api/v1/auth/register"
}
```

## With Retry Info (429)

```json
{
  "statusCode": 429,
  "message": "Quá nhiều yêu cầu",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retryAfter": 60
  },
  "timestamp": "2026-08-24T10:00:00.000Z",
  "path": "/api/v1/auth/login"
}
```

## Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| statusCode | number | HTTP status code |
| message | string | Human-readable message (Vietnamese) |
| code | string | Machine-readable error code |
| timestamp | string | ISO 8601 timestamp |
| path | string | Request path |
| details | object | Additional error details (optional) |

## Error Code Format

```
{DOMAIN}_{SPECIFIC_ERROR}
```

Examples:
- `AUTH_TOKEN_INVALID`
- `BOOK_NOT_FOUND`
- `ORDER_ALREADY_CANCELLED`
- `PAYMENT_FAILED`

## Client Handling

```typescript
// TypeScript interface
interface ApiError {
  statusCode: number;
  message: string;
  code: string;
  timestamp: string;
  path: string;
  details?: any;
}

// Usage
async function handleError(error: ApiError) {
  switch (error.code) {
    case 'AUTH_TOKEN_EXPIRED':
      await refreshToken();
      break;
    case 'BOOK_NOT_FOUND':
      showNotification('Sách không tìm thấy');
      break;
    case 'RATE_LIMIT_EXCEEDED':
      await sleep(error.details.retryAfter * 1000);
      break;
  }
}
```
