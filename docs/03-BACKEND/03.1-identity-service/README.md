# 🔐 Identity Service

**Port:** 3001
**Database:** PostgreSQL (identity_db)

## Overview

The Identity Service handles all authentication, authorization, and user management for the HUKI EBOOK platform.

## Responsibilities

- User registration & login
- JWT token issuance (access + refresh)
- Password management (forgot, reset, change)
- Session management
- Role-based access control (RBAC)
- Account security (rate limiting, account locking)

## Tech Stack

- **Framework:** NestJS
- **Database:** PostgreSQL with Prisma
- **Cache:** Redis (sessions, rate limiting)
- **Auth:** JWT (Access 15min + Refresh 7 days)

## Architecture

```
┌─────────────────────────────────────────────┐
│           Identity Service (3001)           │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────────┐    ┌─────────────┐       │
│   │   Auth      │───▶│   User      │       │
│   │  Module     │    │  Module     │       │
│   └─────────────┘    └─────────────┘       │
│          │                  │               │
│          ▼                  ▼               │
│   ┌─────────────┐    ┌─────────────┐       │
│   │  Session    │    │   Prisma    │       │
│   │  Module     │    │  Service    │       │
│   └─────────────┘    └─────────────┘       │
│          │                  │               │
│          ▼                  ▼               │
│       ┌─────────┐       ┌─────────┐        │
│       │  Redis  │       │ Postgres │        │
│       └─────────┘       └─────────┘        │
│                                             │
└─────────────────────────────────────────────┘
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar TEXT,
  role VARCHAR(50) DEFAULT 'USER',  -- USER, BUSINESS, DELIVERY_STAFF, PLATFORM_ADMIN
  status VARCHAR(50) DEFAULT 'ACTIVE',  -- ACTIVE, BLOCKED, PENDING, DELETED

  -- Email verification
  email_verified_at TIMESTAMP,
  email_verification_token VARCHAR(255),

  -- Password reset
  password_reset_token VARCHAR(255),
  password_reset_expires_at TIMESTAMP,

  -- Security
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
```

### Auth Sessions Table

```sql
CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash VARCHAR(255) NOT NULL,
  user_agent TEXT,
  ip_address VARCHAR(45),
  device_type VARCHAR(50),
  device_name VARCHAR(255),
  location VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  last_active_at TIMESTAMP,
  revoked_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id_revoked ON auth_sessions(user_id, revoked_at);
```

### Refresh Tokens Table

```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
  token_family UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  token_type VARCHAR(50) DEFAULT 'REFRESH',
  device_info TEXT,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  revoked_reason VARCHAR(255),
  replaced_by_token_id UUID,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_session_id ON refresh_tokens(session_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_token_family ON refresh_tokens(token_family);
```

## API Endpoints

See [Identity API Reference](../../04-API-REFERENCE/endpoints/identity.md) for detailed API documentation.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login |
| POST | /auth/logout | Logout |
| POST | /auth/refresh | Refresh token |
| POST | /auth/forgot-password | Forgot password |
| POST | /auth/reset-password | Reset password |
| PATCH | /auth/password | Change password |
| GET | /users/me | Get profile |
| PATCH | /users/me | Update profile |
| GET | /sessions | List sessions |
| DELETE | /sessions/:id | Revoke session |

## Key Features

### JWT Authentication

- **Access Token:** 15 minutes expiry
- **Refresh Token:** 7 days expiry
- Token rotation on refresh
- Token family tracking (detect token theft)

### Account Security

- **Rate Limiting:** 10 login attempts/min per IP
- **Account Locking:** After 5 failed attempts, lock for 15 minutes
- **Password Hashing:** Bcrypt with 12 rounds
- **Password Requirements:** Min 8 chars, 1 uppercase, 1 number

### Session Management

- Track all active sessions per user
- Show device, location, IP
- Revoke individual or all sessions
- Auto-cleanup expired sessions

## Events Emitted

| Event | When |
|-------|------|
| `user.registered` | New user registers |
| `user.login` | Successful login |
| `user.logout` | User logs out |
| `user.password_changed` | Password changed |
| `user.password_reset` | Password reset |
| `user.locked` | Account locked |
| `session.revoked` | Session revoked |

## Configuration

```env
# JWT
JWT_SECRET=your-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Bcrypt
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# Database
DATABASE_URL=postgresql://postgres:postgres123@localhost:5432/identity_db

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Start service
npm run start:dev
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## Related Documentation

- [API Reference](../../04-API-REFERENCE/endpoints/identity.md)
- [Security Guide](../../14-SECURITY/README.md)
- [Database Schema](../../05-DATABASE/identity-db/README.md)