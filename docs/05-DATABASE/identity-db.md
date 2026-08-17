# 🗄️ Identity Database Schema

Chi tiết database schema cho Identity Service.

## ERD Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                              USERS                                    │
├─────────────────────────────────────────────────────────────────────┤
│ id                    │ UUID (PK)                                    │
│ email                 │ VARCHAR(255) UNIQUE NOT NULL                 │
│ password_hash         │ VARCHAR(255) NOT NULL                        │
│ full_name             │ VARCHAR(255) NOT NULL                         │
│ phone                 │ VARCHAR(20)                                   │
│ avatar                │ VARCHAR(500)                                  │
│ role                  │ VARCHAR(50) NOT NULL DEFAULT 'USER'           │
│ status                │ VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'        │
│ email_verified_at     │ TIMESTAMP                                     │
│ created_at            │ TIMESTAMP DEFAULT NOW()                       │
│ updated_at            │ TIMESTAMP DEFAULT NOW()                       │
│ deleted_at            │ TIMESTAMP                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           AUTH_SESSIONS                               │
├─────────────────────────────────────────────────────────────────────┤
│ id                    │ UUID (PK)                                    │
│ user_id               │ UUID (FK → users.id) NOT NULL               │
│ refresh_token_hash    │ VARCHAR(255) NOT NULL                        │
│ user_agent            │ VARCHAR(500)                                  │
│ ip_address            │ VARCHAR(100)                                 │
│ expires_at            │ TIMESTAMP NOT NULL                            │
│ created_at            │ TIMESTAMP DEFAULT NOW()                       │
│ revoked_at            │ TIMESTAMP                                     │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            REFRESH_TOKENS                              │
├─────────────────────────────────────────────────────────────────────┤
│ id                    │ UUID (PK)                                    │
│ session_id            │ UUID (FK → auth_sessions.id) NOT NULL       │
│ token_family          │ UUID NOT NULL                                │
│ token_hash            │ VARCHAR(255) NOT NULL                        │
│ token_type            │ VARCHAR(50) DEFAULT 'REFRESH'                │
│ expires_at            │ TIMESTAMP NOT NULL                            │
│ created_at            │ TIMESTAMP DEFAULT NOW()                       │
│ revoked_at            │ TIMESTAMP                                     │
│ replaced_by_token_id  │ UUID (FK → refresh_tokens.id)                │
└─────────────────────────────────────────────────────────────────────┘
```

## Table: users

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    avatar VARCHAR(500),
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    email_verified_at TIMESTAMP,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires_at TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    
    CONSTRAINT users_email_unique UNIQUE (email)
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
CREATE INDEX idx_users_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;

-- Comments
COMMENT ON TABLE users IS 'User accounts table';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password with cost factor 12';
COMMENT ON COLUMN users.role IS 'USER, BUSINESS, DELIVERY_STAFF, PLATFORM_ADMIN';
COMMENT ON COLUMN users.status IS 'ACTIVE, BLOCKED, PENDING, DELETED';
COMMENT ON COLUMN users.locked_until IS 'Account lockout until this timestamp';
```

## Table: auth_sessions

```sql
-- Authentication sessions
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    user_agent VARCHAR(500),
    ip_address VARCHAR(100),
    device_type VARCHAR(50),
    device_name VARCHAR(255),
    location VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    last_active_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP,
    
    CONSTRAINT auth_sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX idx_sessions_refresh_token ON auth_sessions(refresh_token_hash);
CREATE INDEX idx_sessions_expires_at ON auth_sessions(expires_at);
CREATE INDEX idx_sessions_user_active ON auth_sessions(user_id, revoked_at) WHERE revoked_at IS NULL;
```

## Table: refresh_tokens

```sql
-- Refresh tokens with rotation support
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES auth_sessions(id) ON DELETE CASCADE,
    token_family UUID NOT NULL,  -- Group tokens for rotation
    token_hash VARCHAR(255) NOT NULL,
    token_type VARCHAR(50) DEFAULT 'REFRESH',
    device_info VARCHAR(500),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP,
    revoked_reason VARCHAR(100),
    replaced_by_token_id UUID REFERENCES refresh_tokens(id),
    
    CONSTRAINT refresh_tokens_session_fk FOREIGN KEY (session_id) REFERENCES auth_sessions(id)
);

-- Indexes
CREATE INDEX idx_refresh_tokens_session ON refresh_tokens(session_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_family ON refresh_tokens(token_family);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
```

## Enum Types

```sql
-- Create enum types
CREATE TYPE user_role AS ENUM (
    'USER',
    'BUSINESS',
    'DELIVERY_STAFF',
    'PLATFORM_ADMIN'
);

CREATE TYPE user_status AS ENUM (
    'ACTIVE',
    'BLOCKED',
    'PENDING',
    'DELETED'
);

-- Apply enums
ALTER TABLE users 
    ALTER COLUMN role TYPE user_role USING role::user_role,
    ALTER COLUMN status TYPE user_status USING status::user_status;
```

## Triggers

```sql
-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Soft delete user
CREATE OR REPLACE FUNCTION soft_delete_user()
RETURNS TRIGGER AS $$
BEGIN
    NEW.deleted_at = NOW();
    NEW.status = 'DELETED';
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER soft_delete_users
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION soft_delete_user();
```

## Sample Data

```sql
-- Admin user
INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@huki.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.VQ1aJMgQUPwUqK', -- Admin123!
    'System Admin',
    'PLATFORM_ADMIN',
    'ACTIVE',
    NOW()
);

-- Test user
INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'user@huki.com',
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36ZjqK8E1gJf0U.EM0gQKy', -- User123!
    'Test User',
    'USER',
    'ACTIVE',
    NOW()
);

-- Business user
INSERT INTO users (id, email, password_hash, full_name, role, status, email_verified_at)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    'business@huki.com',
    '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Business123!
    'Business Owner',
    'BUSINESS',
    'ACTIVE',
    NOW()
);
```

## Query Examples

```sql
-- Get active users with session count
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    COUNT(s.id) AS active_sessions
FROM users u
LEFT JOIN auth_sessions s ON u.id = s.user_id AND s.revoked_at IS NULL
WHERE u.status = 'ACTIVE' AND u.deleted_at IS NULL
GROUP BY u.id, u.email, u.full_name, u.role;

-- Get user's login history
SELECT 
    s.created_at,
    s.ip_address,
    s.device_type,
    s.user_agent,
    s.location
FROM auth_sessions s
WHERE s.user_id = 'user-uuid'
ORDER BY s.created_at DESC
LIMIT 10;

-- Count failed login attempts
SELECT 
    email,
    failed_login_attempts,
    locked_until
FROM users
WHERE failed_login_attempts >= 5 
    AND locked_until > NOW();
```
