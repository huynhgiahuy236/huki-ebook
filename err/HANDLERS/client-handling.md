# Client Error Handling Guide

Frontend error handling patterns.

## Error Response Format

```json
{
  "statusCode": 400,
  "message": "Sách không tìm thấy",
  "code": "BOOK_NOT_FOUND",
  "timestamp": "2026-08-24T10:00:00.000Z",
  "path": "/api/v1/books/123",
  "details": {}
}
```

## TypeScript Types

```typescript
interface ApiError {
  statusCode: number;
  message: string;
  code: string;
  timestamp: string;
  path: string;
  details?: any;
}

// Error code enum
enum ErrorCode {
  BOOK_NOT_FOUND = 'BOOK_NOT_FOUND',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  // ...
}
```

## React Hook Error Handler

```typescript
import { useState, useCallback } from 'react';

interface ApiError {
  statusCode: number;
  message: string;
  code: string;
}

export function useApiError() {
  const [error, setError] = useState<ApiError | null>(null);

  const handleError = useCallback((error: any) => {
    if (error.response?.data) {
      const apiError: ApiError = {
        statusCode: error.response.data.statusCode,
        message: error.response.data.message,
        code: error.response.data.code,
      };
      setError(apiError);
      return apiError;
    }
    // Network error
    setError({
      statusCode: 0,
      message: 'Không thể kết nối server',
      code: 'NETWORK_ERROR',
    });
    return null;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { error, handleError, clearError };
}
```

## Error Handling by Code

### Authentication Errors (401, AUTH_*)

```typescript
async function apiRequest(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    // Handle auth errors
    if (data.code?.startsWith('AUTH_')) {
      if (data.code === 'AUTH_TOKEN_EXPIRED') {
        // Redirect to login
        await refreshToken();
        return apiRequest(url, options);
      }
      if (data.code === 'AUTH_TOKEN_INVALID') {
        // Force logout
        logout();
        return;
      }
    }
    throw new Error(data.message);
  }
  return data;
}
```

### Rate Limit (429)

```typescript
async function handleRateLimit(error: ApiError) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    const retryAfter = error.details?.retryAfter ?? 60;
    showNotification(`Vui lòng đợi ${retryAfter} giây`);
    await sleep(retryAfter * 1000);
    return true; // Retry
  }
  return false;
}
```

### Validation Errors (400)

```typescript
function handleValidationError(error: ApiError) {
  if (error.code === 'VALIDATION_ERROR' && error.details) {
    const fieldErrors = error.details;
    return fieldErrors.map((e: any) => ({
      field: e.field,
      message: e.message,
    }));
  }
  return [{ field: '', message: error.message }];
}
```

### Not Found (404)

```typescript
function handleNotFound(error: ApiError) {
  if (error.statusCode === 404) {
    showNotification('Không tìm thấy dữ liệu');
    return null;
  }
}
```

### Forbidden (403)

```typescript
function handleForbidden(error: ApiError) {
  if (error.statusCode === 403) {
    if (error.code === 'AUTHZ_NOT_OWNER') {
      showNotification('Bạn không có quyền thực hiện thao tác này');
    } else {
      showNotification('Tài khoản của bạn không có quyền');
    }
    return false;
  }
  return true;
}
```

## React Query Integration

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

function useBooks() {
  return useQuery({
    queryKey: ['books'],
    queryFn: () => api.get('/books'),
    retry: (failureCount, error) => {
      // Don't retry on client errors
      if (error.statusCode >= 400 && error.statusCode < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

function useCheckout() {
  return useMutation({
    mutationFn: (data) => api.post('/checkout/confirm', data),
    onError: (error) => {
      if (error.code === 'CHECKOUT_SESSION_EXPIRED') {
        // Refresh checkout session
        refetchCheckoutSession();
      }
    },
  });
}
```

## Global Error Handler

```typescript
// error-handler.ts
export function handleApiError(error: any, showNotification: (msg: string) => void) {
  // Network error
  if (!error.response) {
    showNotification('Không thể kết nối server');
    return;
  }

  const { statusCode, message, code } = error.response.data;

  switch (statusCode) {
    case 401:
      if (code === 'AUTH_TOKEN_EXPIRED') {
        refreshToken();
      } else {
        logout();
      }
      break;

    case 403:
      showNotification(message);
      break;

    case 404:
      showNotification('Không tìm thấy dữ liệu');
      break;

    case 422:
      if (code === 'INVENTORY_INSUFFICIENT') {
        showNotification('Số lượng trong kho không đủ');
      }
      break;

    case 429:
      const retryAfter = error.response.data.details?.retryAfter ?? 60;
      showNotification(`Vui lòng đợi ${retryAfter} giây`);
      break;

    default:
      showNotification(message || 'Có lỗi xảy ra');
  }
}
```
