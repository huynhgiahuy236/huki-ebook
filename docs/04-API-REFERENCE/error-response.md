# ❌ Error Response Format

Chi tiết về error response format.

## Error Response Structure

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "email must be a valid email",
      "code": "INVALID_EMAIL"
    }
  ],
  "timestamp": "2026-08-14T10:00:00.000Z",
  "path": "/api/v1/auth/register",
  "requestId": "req-uuid-xxx"
}
```

## HTTP Status Codes

### 2xx Success

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Successful GET, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |

### 4xx Client Errors

| Code | Description | Usage |
|------|-------------|-------|
| 400 | Bad Request | Validation error, invalid input |
| 401 | Unauthorized | Missing or invalid token |
| 403 | Forbidden | Valid token but no permission |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate resource |
| 422 | Unprocessable Entity | Valid format but business logic error |
| 429 | Too Many Requests | Rate limit exceeded |

### 5xx Server Errors

| Code | Description | Usage |
|------|-------------|-------|
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Service unavailable |
| 503 | Service Unavailable | Maintenance |
| 504 | Gateway Timeout | Service timeout |

## Error Codes

### Authentication Errors (401)

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token",
  "code": "AUTH_TOKEN_INVALID"
}
```

| Code | Message |
|------|---------|
| AUTH_TOKEN_INVALID | Invalid or expired token |
| AUTH_TOKEN_MISSING | Authorization header missing |
| AUTH_TOKEN_EXPIRED | Token has expired |
| AUTH_REFRESH_FAILED | Failed to refresh token |

### Authorization Errors (403)

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "You do not have permission to access this resource",
  "code": "FORBIDDEN"
}
```

| Code | Message |
|------|---------|
| FORBIDDEN | No permission |
| FORBIDDEN_ROLE | Insufficient role |
| FORBIDDEN_BUSINESS | Not a member of this business |
| FORBIDDEN_OWNER | Not the owner of this resource |

### Validation Errors (400)

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "email must be a valid email",
      "code": "INVALID_EMAIL"
    },
    {
      "field": "password",
      "message": "password must be at least 8 characters",
      "code": "PASSWORD_TOO_SHORT"
    }
  ]
}
```

| Code | Message |
|------|---------|
| VALIDATION_ERROR | General validation error |
| INVALID_EMAIL | Invalid email format |
| INVALID_PASSWORD | Invalid password format |
| PASSWORD_TOO_SHORT | Password must be at least 8 characters |
| PASSWORD_WEAK | Password too weak |
| INVALID_FORMAT | Invalid format |
| REQUIRED_FIELD | This field is required |

### Not Found Errors (404)

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Book not found",
  "code": "BOOK_NOT_FOUND"
}
```

| Code | Message |
|------|---------|
| USER_NOT_FOUND | User not found |
| BOOK_NOT_FOUND | Book not found |
| ORDER_NOT_FOUND | Order not found |
| STORE_NOT_FOUND | Store not found |
| BUSINESS_NOT_FOUND | Business not found |
| RESOURCE_NOT_FOUND | Resource not found |

### Conflict Errors (409)

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Email already exists",
  "code": "EMAIL_EXISTS"
}
```

| Code | Message |
|------|---------|
| EMAIL_EXISTS | Email already registered |
| BOOK_EXISTS | Book already exists |
| ORDER_EXISTS | Order already exists |
| CART_ITEM_EXISTS | Item already in cart |
| ALREADY_PURCHASED | Already purchased this book |
| REVIEW_EXISTS | Review already exists |

### Business Logic Errors (422)

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Insufficient stock",
  "code": "INSUFFICIENT_STOCK"
}
```

| Code | Message |
|------|---------|
| INSUFFICIENT_STOCK | Not enough stock |
| VOUCHER_EXPIRED | Voucher has expired |
| VOUCHER_LIMIT_REACHED | Voucher usage limit reached |
| VOUCHER_NOT_APPLICABLE | Voucher not applicable to this order |
| ORDER_CANCELLED | Order has been cancelled |
| ORDER_COMPLETED | Order already completed |
| PAYMENT_FAILED | Payment failed |
| PAYMENT_TIMEOUT | Payment timeout |

### Rate Limit Errors (429)

```json
{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

### Server Errors (5xx)

```json
{
  "statusCode": 500,
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "code": "INTERNAL_ERROR",
  "requestId": "req-uuid-xxx"
}
```

## Client-Side Error Handling

### JavaScript Example

```typescript
async function apiRequest(url: string, options: RequestInit) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      // Handle specific errors
      switch (data.code) {
        case 'AUTH_TOKEN_EXPIRED':
          // Refresh token or redirect to login
          await refreshToken();
          return apiRequest(url, options);

        case 'RATE_LIMIT_EXCEEDED':
          // Wait and retry
          await sleep(data.retryAfter * 1000);
          return apiRequest(url, options);

        case 'INSUFFICIENT_STOCK':
          // Show error message
          showNotification(data.message);
          return null;

        default:
          throw new Error(data.message);
      }
    }

    return data;
  } catch (error) {
    // Network error or unexpected error
    console.error('API Error:', error);
    showNotification('Có lỗi xảy ra. Vui lòng thử lại.');
    throw error;
  }
}
```

### React Query Error Handling

```typescript
const { data, error, isLoading } = useQuery({
  queryKey: ['books', bookId],
  queryFn: () => api.get(`/books/${bookId}`),
  retry: (failureCount, error) => {
    // Don't retry on client errors
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return false;
    }
    return failureCount < 3;
  },
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

// Display error
if (error) {
  return <ErrorMessage error={error} />;
}
```

## Error Messages in Vietnamese

| Error | Vietnamese Message |
|-------|-------------------|
| AUTH_TOKEN_INVALID | Token không hợp lệ hoặc đã hết hạn |
| AUTH_TOKEN_MISSING | Vui lòng đăng nhập |
| FORBIDDEN | Bạn không có quyền thực hiện thao tác này |
| EMAIL_EXISTS | Email đã được sử dụng |
| BOOK_NOT_FOUND | Không tìm thấy sách |
| INSUFFICIENT_STOCK | Số lượng trong kho không đủ |
| VOUCHER_EXPIRED | Mã giảm giá đã hết hạn |
| RATE_LIMIT_EXCEEDED | Quá nhiều yêu cầu. Vui lòng đợi |
