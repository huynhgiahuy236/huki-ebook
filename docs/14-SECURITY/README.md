# 🔒 Security Guidelines

Hướng dẫn bảo mật cho dự án.

## 📋 Security Checklist

### Authentication

- [ ] Password hashing with bcrypt (cost factor >= 12)
- [ ] JWT token expiration (Access: 15min, Refresh: 7 days)
- [ ] Secure token storage (HttpOnly cookies)
- [ ] Account lockout after failed attempts
- [ ] Password reset with secure tokens

### Authorization

- [ ] Role-based access control (RBAC)
- [ ] Resource ownership verification
- [ ] API endpoint protection
- [ ] Admin privilege separation

### Data Protection

- [ ] Input validation and sanitization
- [ ] SQL injection prevention (Parameterized queries)
- [ ] XSS prevention (Output encoding)
- [ ] CSRF protection
- [ ] Sensitive data encryption at rest

### API Security

- [ ] Rate limiting
- [ ] Request validation
- [ ] CORS configuration
- [ ] API versioning
- [ ] Security headers

## 🔐 Password Policy

```typescript
const passwordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  preventCommonPasswords: true,
  preventReuse: 5, // Last 5 passwords
};
```

### Password Validation

```typescript
import z from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
  .refine((password) => !commonPasswords.includes(password), {
    message: 'Password is too common',
  });
```

## 🛡️ Input Validation

### Zod Schemas

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .max(255)
    .transform((email) => email.toLowerCase().trim()),
  
  password: passwordSchema,
  
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100)
    .trim(),
  
  phone: z
    .string()
    .regex(/^(0[0-9]{9})$/, 'Invalid phone number')
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
```

### SQL Injection Prevention

```typescript
// ❌ Bad: String concatenation
const query = `SELECT * FROM users WHERE id = '${userId}'`;

// ✅ Good: Parameterized query
const query = `SELECT * FROM users WHERE id = $1`;
await db.query(query, [userId]);

// Using Prisma (values are parameterized)
const user = await prisma.user.findUnique({
  where: { id: userId }, // Safe
});
```

### XSS Prevention

```typescript
// ❌ Bad: Direct HTML insertion
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Good: Output encoding
// React auto-escapes, but for custom rendering:
import DOMPurify from 'dompurify';

const sanitized = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong'],
  ALLOWED_ATTR: [],
});
```

## 🚫 CSRF Protection

```typescript
// Using csurf or similar
import { csrfProtection } from '@/lib/middleware/csrf';

// Apply to mutation endpoints
router.post('/api/v1/orders', csrfProtection, orderController.create);

// Or use SameSite cookies
res.cookie('session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
});
```

## 🔑 API Security

### Rate Limiting

```typescript
// Using express-rate-limit
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests',
});

// Apply
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/', apiLimiter);
```

### Security Headers

```typescript
// helmet.js
import helmet from 'helmet';

app.use(helmet());

// Or custom headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

### CORS Configuration

```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));
```

## 📊 Logging & Monitoring

### Security Event Logging

```typescript
interface SecurityLog {
  event: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PASSWORD_RESET' | 'ACCOUNT_LOCKED';
  userId?: string;
  email?: string;
  ip: string;
  userAgent: string;
  timestamp: Date;
  details?: Record<string, any>;
}

// Log security events
await securityLogService.log({
  event: 'LOGIN_FAILED',
  email: credentials.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  details: { attemptCount: 3 },
});
```

### Audit Trail

```typescript
interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes?: Record<string, { before: any; after: any }>;
  ip: string;
  timestamp: Date;
}

// Create audit log for sensitive operations
await auditLogService.create({
  userId: currentUser.id,
  action: 'UPDATE',
  resource: 'user',
  resourceId: userId,
  changes: { role: { before: 'USER', after: 'ADMIN' } },
  ip: req.ip,
});
```

## 🔒 Secrets Management

### Environment Variables

```bash
# .env (DO NOT COMMIT)
DATABASE_PASSWORD=super_secret_password
JWT_SECRET=your_jwt_secret_key_change_this
API_KEYS=secret_keys_here

# .env.example (COMMIT)
DATABASE_PASSWORD=
JWT_SECRET=
API_KEYS=
```

### Production Secrets

```yaml
# kubernetes/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: huki-secrets
type: Opaque
stringData:
  database-password: ${DB_PASSWORD}
  jwt-secret: ${JWT_SECRET}
  api-keys: ${API_KEYS}
```

## 🛡️ DDoS Protection

```typescript
// Cloudflare or similar
// Or implement basic protection

const ddosProtection = rateLimit({
  windowMs: 1000, // 1 second
  max: 10, // 10 requests per second per IP
  keyGenerator: (req) => req.ip,
  skip: (req) => process.env.NODE_ENV === 'development',
});
```

## 🔍 Security Testing

### OWASP ZAP Integration

```yaml
# In CI/CD
- name: Security Scan
  run: |
    docker run -t owasp/zap2docker-stable zap-baseline.py \
      -t https://staging-api.huki-ebook.com \
      -J zap-report.json
```

### Dependency Scanning

```bash
# npm audit
npm audit

# Snyk
npx snyk test

# GitHub Dependabot
# Automatically enabled on GitHub
```
