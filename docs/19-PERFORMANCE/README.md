# ⚡ Performance Benchmarks

Performance guidelines và benchmarks.

## 📊 Performance Targets

### Backend

| Metric | Target | Critical |
|--------|--------|----------|
| API Response Time (p95) | < 200ms | < 500ms |
| API Response Time (p99) | < 500ms | < 1s |
| Database Query Time | < 50ms | < 100ms |
| API Gateway Latency | < 10ms | < 20ms |
| Message Queue Processing | < 100ms | < 500ms |
| Error Rate | < 0.1% | < 1% |

### Frontend Web

| Metric | Target | Critical |
|--------|--------|----------|
| First Contentful Paint (FCP) | < 1.5s | < 3s |
| Largest Contentful Paint (LCP) | < 2.5s | < 4s |
| First Input Delay (FID) | < 100ms | < 300ms |
| Time to Interactive (TTI) | < 3.5s | < 5s |
| Cumulative Layout Shift (CLS) | < 0.1 | < 0.25 |
| Bundle Size (Initial) | < 200KB | < 500KB |

### Frontend Mobile

| Metric | Target | Critical |
|--------|--------|----------|
| App Launch (Cold) | < 2s | < 5s |
| App Launch (Warm) | < 1s | < 2s |
| Screen Transition | < 300ms | < 500ms |
| API Call (with loading) | < 2s | < 5s |
| Image Load | < 1s | < 3s |
| Memory Usage | < 150MB | < 300MB |

## 🔥 Load Testing

### API Load Testing

```yaml
# k6-load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 200 },   // Spike
    { duration: '5m', target: 200 },  // Steady state
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/v1/books?page=1&limit=20');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

### Running Load Tests

```bash
# Install k6
brew install k6  # macOS
# or: https://k6.io/docs/getting-started/installation/

# Run load test
k6 run k6-load-test.js

# Run with environment
k6 run -e TARGET_URL=https://staging-api.huki-ebook.com k6-load-test.js
```

## 🚀 Optimization Guidelines

### Database Optimization

#### Indexes

```sql
-- Create indexes for frequently queried columns
CREATE INDEX idx_books_store_id ON books(store_id);
CREATE INDEX idx_books_category_id ON books(category_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_created_at ON books(created_at DESC);

-- Composite indexes
CREATE INDEX idx_books_catalog ON books(status, category_id, created_at DESC);

-- Full-text search index
CREATE INDEX idx_books_search ON books USING gin(to_tsvector('english', title || ' ' || description));

-- Index for pagination
CREATE INDEX idx_books_cursor ON books(created_at DESC, id);
```

#### Query Optimization

```sql
-- ❌ Bad: SELECT *
SELECT * FROM books WHERE id = '123';

-- ✅ Good: SELECT specific columns
SELECT id, title, price, cover_url 
FROM books 
WHERE id = '123';

-- ❌ Bad: N+1 queries
-- (In application code)
for (const book of books) {
  const author = await db.findAuthor(book.author_id);
}

-- ✅ Good: JOIN or eager load
SELECT b.*, a.name as author_name 
FROM books b
LEFT JOIN authors a ON b.author_id = a.id
WHERE b.store_id = 'store-uuid';
```

### API Optimization

#### Caching

```typescript
// Redis caching
const CACHE_TTL = 60 * 5; // 5 minutes

async getBooks(params: BooksQuery) {
  const cacheKey = `books:${JSON.stringify(params)}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Query database
  const books = await this.bookRepo.find(params);
  
  // Store in cache
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(books));
  
  return books;
}

// Cache invalidation
async invalidateBooksCache() {
  const keys = await redis.keys('books:*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

#### Pagination

```typescript
// ❌ Bad: Offset pagination (slow for large datasets)
const books = await db.findAll({
  offset: (page - 1) * limit,
  limit: limit,
});

// ✅ Good: Cursor pagination (fast)
const books = await db.findAll({
  where: { createdAt: { $lt: cursor } },
  order: { createdAt: 'DESC' },
  limit: limit + 1, // Fetch one extra to check if there's more
});
```

### Frontend Optimization

#### Code Splitting

```typescript
// Next.js - Dynamic imports
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false, // Disable SSR for client-only components
});

// Lazy load routes
const BookDetail = dynamic(() => import('./pages/books/[slug]'));
```

#### Image Optimization

```tsx
// Next.js Image component
import Image from 'next/image';

<Image
  src={book.coverUrl}
  alt={book.title}
  width={200}
  height={300}
  placeholder="blur"
  blurDataURL={book.blurUrl}
  priority={isAboveFold}
/>
```

#### Bundle Size

```typescript
// Check bundle size
npm run analyze

// Reduce bundle
// 1. Tree shaking
import { debounce } from 'lodash-es'; // ESM imports only
// Instead of: import _ from 'lodash'; _.debounce()

// 2. Dynamic imports for large libraries
const PDFReader = dynamic(() => import('./PDFReader'), { ssr: false });

// 3. Use lighter alternatives
// ❌ moment.js (67KB)
// ✅ date-fns (tree-shakeable) or dayjs (2KB)
import { format } from 'date-fns';
```

### Caching Strategy

| Data Type | Cache Duration | Invalidation |
|-----------|---------------|--------------|
| Book Catalog | 5-15 minutes | On book create/update/delete |
| Book Detail | 15-30 minutes | On book update |
| User Profile | 1-5 minutes | On profile update |
| Cart | No cache | Real-time |
| Order Status | No cache | Real-time |
| Search Results | 1-5 minutes | On catalog change |

## 📈 Monitoring

### Key Metrics to Track

```typescript
// Custom metrics with Prometheus
import { Counter, Histogram, Gauge } from 'prom-client';

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 10],
});

const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of active users',
});

// Use in middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    httpRequestDuration
      .labels(req.method, req.route.path, res.statusCode.toString())
      .observe((Date.now() - start) / 1000);
  });
  next();
});
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | > 0.5% | > 1% |
| Response Time (p95) | > 300ms | > 500ms |
| CPU Usage | > 70% | > 85% |
| Memory Usage | > 80% | > 90% |
| Disk Usage | > 80% | > 90% |
| Queue Depth | > 1000 | > 5000 |
