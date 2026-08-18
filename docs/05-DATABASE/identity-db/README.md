# 🗄️ Identity Database (identity_db)

**Engine:** PostgreSQL
**ORM:** Prisma
**Service:** Identity Service (3001)

## Overview

Stores all user authentication, profile, and session data.

## Tables

| Table | Purpose |
|-------|---------|
| users | User accounts |
| auth_sessions | Active login sessions |
| refresh_tokens | JWT refresh token management |

## Schema

### users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  avatar TEXT,

  role VARCHAR(50) DEFAULT 'USER', -- USER, BUSINESS, DELIVERY_STAFF, PLATFORM_ADMIN
  status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, BLOCKED, PENDING, DELETED

  email_verified_at TIMESTAMP,
  email_verification_token VARCHAR(255),

  password_reset_token VARCHAR(255),
  password_reset_expires_at TIMESTAMP,

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

### auth_sessions

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

CREATE INDEX idx_sessions_user_revoked ON auth_sessions(user_id, revoked_at);
```

### refresh_tokens

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

CREATE INDEX idx_refresh_session_id ON refresh_tokens(session_id);
CREATE INDEX idx_refresh_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_token_family ON refresh_tokens(token_family);
```

## Relationships

```
users (1) ──< (N) auth_sessions (1) ──< (N) refresh_tokens
```

## Cross-Service References

- `users.id` referenced by `businesses.owner_id` (Business Service)
- `users.id` referenced by `members.user_id` (Business Service)
- `users.id` referenced by `addresses.user_id` (Shipping Service)

## Migrations

```bash
npx prisma migrate dev --name init
```

## Backup

```bash
pg_dump -U postgres -d identity_db > identity_backup.sql
```

## Notes

- Soft delete via `deleted_at`
- Password hashed with bcrypt (12 rounds)
- JWT tokens stored hashed (not plaintext)
- Token rotation on every refresh