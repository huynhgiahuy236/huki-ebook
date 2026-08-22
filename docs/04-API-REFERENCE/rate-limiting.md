# 🚦 Rate Limiting

Chi tiết rate limiting cho API.

## Overview

Rate limiting được áp dụng ở API Gateway level để ngăn chặn abuse và đảm bảo fair usage.

## Rate Limit Headers

Mọi response sẽ chứa các headers sau:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1692028800
```

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Số request tối đa trong window |
| X-RateLimit-Remaining | Số request còn lại |
| X-RateLimit-Reset | Unix timestamp khi limit reset |

## Rate Limits by Endpoint

### Public Endpoints

| Endpoint | Limit | Window | Description |
|----------|-------|--------|-------------|
| GET /api/v1/books | 60 | 1 minute | Browse catalog |
| GET /api/v1/books/:id | 120 | 1 minute | View book detail |
| GET /api/v1/stores | 60 | 1 minute | Browse stores |
| GET /api/v1/stores/:id | 120 | 1 minute | View store detail |
| GET /api/v1/categories | 60 | 1 minute | Browse categories |
| GET /api/v1/search | 30 | 1 minute | Search |
| GET /api/v1/banners | 60 | 1 minute | Get banners |

### Authentication Endpoints

| Endpoint | Limit | Window | Description |
|----------|-------|--------|-------------|
| POST /api/v1/auth/register | 5 | 1 hour | Registration |
| POST /api/v1/auth/login | 10 | 1 minute | Login attempts |
| POST /api/v1/auth/refresh | 30 | 1 minute | Token refresh |
| POST /api/v1/auth/forgot-password | 3 | 1 hour | Password reset |

### User Endpoints

| Endpoint | Limit | Window | Description |
|----------|-------|--------|-------------|
| GET /api/v1/auth/me | 100 | 1 minute | Get profile |
| PATCH /api/v1/users/profile | 30 | 1 minute | Update profile |
| GET /api/v1/orders | 60 | 1 minute | List orders |
| GET /api/v1/orders/:id | 60 | 1 minute | Order detail |

### Cart Endpoints

| Endpoint | Limit | Window | Description |
|----------|-------|--------|-------------|
| GET /api/v1/cart | 60 | 1 minute | Get cart |
| POST /api/v1/cart/items | 30 | 1 minute | Add to cart |
| PATCH /api/v1/cart/items/:id | 30 | 1 minute | Update cart |
| DELETE /api/v1/cart/items/:id | 30 | 1 minute | Remove item |
| POST /api/v1/cart/checkout/preview | 20 | 1 minute | Preview checkout |
| POST /api/v1/cart/checkout/confirm | 10 | 1 minute | Confirm checkout |

### Business Endpoints

| Endpoint | Limit | Window | Description |
|----------|-------|--------|-------------|
| POST /api/v1/business/register | 3 | 1 hour | Register business |
| POST /api/v1/stores | 10 | 1 hour | Create store |
| POST /api/v1/books | 20 | 1 hour | Create book |
| PATCH /api/v1/books/:id | 30 | 1 hour | Update book |
| POST /api/v1/books/:id/cover | 10 | 1 hour | Upload cover |
| POST /api/v1/books/:id/file | 5 | 1 hour | Upload ebook |
| GET /api/v1/seller/orders | 60 | 1 minute | List seller orders |
| PATCH /api/v1/seller/orders/:id | 30 | 1 minute | Update order |

### Review & Forum Endpoints

| Endpoint | Limit | Window | Description |
|----------|-------|--------|-------------|
| POST /api/v1/books/:id/reviews | 10 | 1 hour | Create book review |
| POST /api/v1/stores/:id/reviews | 10 | 1 hour | Create store review |
| PATCH /api/v1/reviews/:id | 10 | 1 hour | Edit review |
| POST /api/v1/forum/posts | 20 | 1 hour | Create post |
| POST /api/v1/forum/posts/:id/comments | 30 | 1 hour | Add comment |
| POST /api/v1/forum/comments/:id/replies | 30 | 1 hour | Add reply |
| POST /*/report | 10 | 1 hour | Report post/comment/review |

### Chat Endpoints

| Endpoint | Limit | Window | Description |
|----------|-------|--------|-------------|
| POST /api/v1/chat/messages | 60 | 1 minute | Send message |
| GET /api/v1/chat/conversations | 60 | 1 minute | List conversations |
| GET /api/v1/chat/messages | 60 | 1 minute | Get messages |

## Rate Limit Response

Khi vượt quá rate limit:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "statusCode": 429,
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

## Best Practices

### 1. Implement Retry with Backoff

```typescript
async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After') || 60;
        await sleep(retryAfter * 1000);
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

### 2. Cache Responses

```typescript
// Cache catalog data
const catalogCache = new Map();
const CACHE_TTL = 60000; // 1 minute

function getCachedCatalog(key: string) {
  const cached = catalogCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}
```

### 3. Batch Requests

```typescript
// Instead of multiple individual requests
// ❌ Bad
for (const bookId of bookIds) {
  await fetch(`/api/v1/books/${bookId}`);
}

// ✅ Good - Use search with IDs
await fetch(`/api/v1/books?ids=${bookIds.join(',')}`);
```

### 4. Handle Rate Limit Gracefully

```typescript
async function handleRateLimit(response: Response) {
  if (response.status === 429) {
    const retryAfter = parseInt(
      response.headers.get('Retry-After') || '60'
    );
    
    // Show user-friendly message
    showNotification(`Vui lòng đợi ${retryAfter} giây`);
    
    // Wait and retry
    await sleep(retryAfter * 1000);
    return fetch(originalRequest);
  }
}
```

## Unauthenticated Limits

Người dùng chưa đăng nhập có giới hạn thấp hơn:

| Endpoint | Limit | Window |
|----------|-------|--------|
| GET /api/v1/books | 30 | 1 minute |
| GET /api/v1/search | 10 | 1 minute |

## IP-based Limits

Để prevent DDoS, có thêm IP-level limits:

| Limit | Window | Description |
|-------|--------|-------------|
| 500 requests | 1 minute | All endpoints combined |
| 50 requests | 1 minute | Authentication endpoints |
