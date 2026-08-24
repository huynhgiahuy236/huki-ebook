# Login Flow

## Overview

Authentication flow cho user login.

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                               │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───▶│ Validate │───▶│  Check   │───▶│ Generate │
│  Request │    │ Credentials│   │  Status  │    │  Tokens  │
└──────────┘    └──────────┘    └────┬─────┘    └────┬─────┘
                                    │                │
                          ┌─────────┼─────────┐      │
                          │         │         │      │
                          ▼         ▼         ▼      ▼
                    ┌──────────┐ ┌────────┐ ┌──────────┐
                    │ ACTIVE   │ │BLOCKED │ │ PENDING  │
                    │ Proceed  │ │ Reject │ │  Reject  │
                    └──────────┘ └────────┘ └──────────┘
```

## Login Process

### 1. Standard Login

```typescript
// POST /api/v1/auth/login
async login(dto: LoginDto) {
  // 1. Find user by email
  const user = await this.prisma.user.findUnique({
    where: { email: dto.email }
  });
  
  // 2. Verify password
  const isValid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isValid) {
    throwError.unauthorized(
      ErrorCode.AUTH_LOGIN_INVALID_CREDENTIALS,
      'Email hoặc mật khẩu không đúng'
    );
  }
  
  // 3. Check account status
  if (user.status === 'BLOCKED') {
    throwError.forbidden(
      ErrorCode.AUTH_LOGIN_ACCOUNT_BLOCKED,
      'Tài khoản đã bị khóa'
    );
  }
  
  if (user.status === 'PENDING') {
    throwError.forbidden(
      ErrorCode.AUTH_LOGIN_ACCOUNT_PENDING,
      'Tài khoản đang chờ xác minh'
    );
  }
  
  // 4. Generate tokens
  const accessToken = this.jwtService.sign({
    sub: user.id,
    email: user.email,
    role: user.role
  }, { expiresIn: '15m' });
  
  const refreshToken = this.jwtService.sign({
    sub: user.id,
    type: 'refresh'
  }, { expiresIn: '7d' });
  
  // 5. Store session
  await this.prisma.session.create({
    data: {
      userId: user.id,
      refreshToken,
      userAgent: dto.userAgent,
      ipAddress: dto.ipAddress
    }
  });
  
  return {
    accessToken,
    refreshToken,
    expiresIn: 900 // 15 minutes
  };
}
```

### 2. Token Refresh

```typescript
// POST /api/v1/auth/refresh
async refresh(dto: RefreshTokenDto) {
  // 1. Verify refresh token
  const payload = this.jwtService.verify(dto.refreshToken);
  
  if (payload.type !== 'refresh') {
    throwError.unauthorized(
      ErrorCode.AUTH_TOKEN_INVALID,
      'Invalid token type'
    );
  }
  
  // 2. Find session
  const session = await this.prisma.session.findFirst({
    where: {
      userId: payload.sub,
      refreshToken: dto.refreshToken
    }
  });
  
  if (!session) {
    throwError.unauthorized(
      ErrorCode.AUTH_TOKEN_INVALID,
      'Session not found'
    );
  }
  
  // 3. Get user
  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub }
  });
  
  // 4. Generate new access token
  const accessToken = this.jwtService.sign({
    sub: user.id,
    email: user.email,
    role: user.role
  }, { expiresIn: '15m' });
  
  return { accessToken, expiresIn: 900 };
}
```

## User Status

| Status | Description | Login Allowed |
|--------|-------------|--------------|
| ACTIVE | Verified account | ✅ |
| PENDING | Awaiting verification | ❌ |
| BLOCKED | Suspended account | ❌ |

## Token Structure

### Access Token Payload

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "USER",
  "iat": 1724496000,
  "exp": 1724496900
}
```

### Refresh Token Payload

```json
{
  "sub": "user-uuid",
  "type": "refresh",
  "iat": 1724496000,
  "exp": 1725100800
}
```

## Error Handling

| Error | Code | Message |
|-------|------|---------|
| Invalid credentials | AUTH_LOGIN_INVALID_CREDENTIALS | Email hoặc mật khẩu không đúng |
| Account blocked | AUTH_LOGIN_ACCOUNT_BLOCKED | Tài khoản đã bị khóa |
| Account pending | AUTH_LOGIN_ACCOUNT_PENDING | Tài khoản đang chờ xác minh |
| Token expired | AUTH_TOKEN_EXPIRED | Token đã hết hạn |
| Token invalid | AUTH_TOKEN_INVALID | Token không hợp lệ |

## Key Files

| File | Description |
|------|-------------|
| `identity-service/.../auth.service.ts` | Auth logic |
| `identity-service/.../jwt.strategy.ts` | JWT verification |
| `identity-service/.../auth.controller.ts` | Auth API |
