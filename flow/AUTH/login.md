# Login Flow

## Overview

Authentication flow cho user login. **Yêu cầu email đã được xác thực trước khi đăng nhập.**

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                               │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Login   │───▶│ Validate │───▶│  Check   │───▶│  Check   │
│  Request │    │ Credentials│   │  Status  │    │ Password │
└──────────┘    └──────────┘    └────┬─────┘    └────┬─────┘
                                     │                │
                           ┌─────────┼─────────┐      │
                           │         │         │      │
                           ▼         ▼         ▼      ▼
                     ┌──────────┐ ┌────────┐ ┌──────────┐
                     │ BLOCKED  │ │PENDING │ │   OK     │
                     │  Reject  │ │ Reject │ │ Continue │
                     │  (403)   │ │ (401)  │ │          │
                     └──────────┘ └────────┘ └────┬─────┘
                                                   │
                                                   ▼
                                            ┌──────────┐
                                            │Generate  │
                                            │ Tokens   │
                                            └────┬─────┘
                                                 │
                                                 ▼
                                            ┌──────────┐
                                            │ Publish  │
                                            │ LOGIN    │
                                            │ Event    │
                                            └────┬─────┘
                                                 │
                                                 ▼
                                            ┌──────────┐
                                            │ Return   │
                                            │ Tokens   │
                                            └──────────┘
```

## Login Process

```typescript
// POST /api/v1/auth/login
async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
  // 1. Find user by email
  const user = await this.prisma.user.findUnique({
    where: { email: dto.email }
  });

  if (!user) {
    throwUnauthorized(ErrorCode.AUTH_LOGIN_INVALID_CREDENTIALS);
  }

  // 2. Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throwUnauthorized(ErrorCode.AUTH_LOGIN_ACCOUNT_BLOCKED);
  }

  // 3. Check user status - PENDING means not verified
  if (user.status === 'PENDING') {
    throwUnauthorized(ErrorCode.AUTH_LOGIN_ACCOUNT_PENDING, 'Please verify your email first');
  }

  // 4. Check if account is blocked
  if (user.status === 'BLOCKED') {
    throwUnauthorized(ErrorCode.AUTH_LOGIN_ACCOUNT_BLOCKED);
  }

  // 5. Verify password
  if (!(await bcrypt.compare(dto.password, user.passwordHash))) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts,
        lockedUntil: failedLoginAttempts >= 5
          ? new Date(Date.now() + 30 * 60_1000)
          : null,
      },
    });
    throwUnauthorized(ErrorCode.AUTH_LOGIN_INVALID_CREDENTIALS);
  }

  // 6. Reset failed attempts on successful auth
  const activeUser = await this.prisma.user.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null },
  });

  // 7. Generate tokens
  const tokens = await this.generateTokens(activeUser, { userAgent, ipAddress });

  // 8. Publish USER_LOGGED_IN event
  this.eventEmitter.emit(USER_EVENTS.LOGGED_IN, {
    userId: activeUser.id,
    timestamp: new Date().toISOString(),
  });

  return {
    user: this.sanitizeUser(activeUser),
    ...tokens,
  };
}
```

## Token Refresh Process

```typescript
// POST /api/v1/auth/refresh
async refresh(dto: RefreshTokenDto) {
  // 1. Verify refresh token exists and is valid
  const token = await this.prisma.refreshToken.findFirst({
    where: { tokenHash: this.hashToken(dto.refreshToken), revokedAt: null },
    include: { session: { include: { user: true } } },
  });

  if (!token || token.expiresAt < new Date() || token.session.revokedAt) {
    throwUnauthorized(ErrorCode.AUTH_TOKEN_EXPIRED);
  }

  // 2. Revoke old token (rotation)
  await this.prisma.refreshToken.update({
    where: { id: token.id },
    data: { revokedAt: new Date(), revokedReason: 'token_rotation' },
  });

  // 3. Generate new access token
  return {
    accessToken: this.signAccessToken(token.session.user),
    expiresIn: 900, // 15 minutes
  };
}
```

## User Status

| Status | Description | Login Allowed | Action |
|--------|-------------|---------------|--------|
| ACTIVE | Verified account | ✅ | Proceed |
| PENDING | Awaiting email verification | ❌ | Show "verify email" message |
| BLOCKED | Suspended account | ❌ | Show "account blocked" message |

## Security: Failed Login Attempts

```typescript
// After 5 failed attempts, lock account for 30 minutes
if (failedLoginAttempts >= 5) {
  lockedUntil = new Date(Date.now() + 30 * 60_1000); // 30 minutes
}
```

## Event Publishing

```typescript
// Publish USER_LOGGED_IN event
this.eventEmitter.emit(USER_EVENTS.LOGGED_IN, {
  userId: user.id,
  timestamp: new Date().toISOString(),
});
```

## Error Handling

| Error | Code | HTTP | Message |
|-------|------|------|---------|
| Invalid credentials | AUTH_LOGIN_INVALID_CREDENTIALS | 401 | Email hoặc mật khẩu không đúng |
| Account locked | AUTH_LOGIN_ACCOUNT_BLOCKED | 401 | Tài khoản đã bị khóa tạm thời |
| Account pending | AUTH_LOGIN_ACCOUNT_PENDING | 401 | Vui lòng xác thực email trước |
| Token expired | AUTH_TOKEN_EXPIRED | 401 | Token đã hết hạn |

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login with email & password |
| POST | `/auth/logout` | Logout (revoke token) |
| POST | `/auth/logout-all` | Logout all devices |
| POST | `/auth/refresh` | Refresh access token |

## Key Files

| File | Description |
|------|-------------|
| `identity-service/src/modules/auth/auth.service.ts` | Auth logic |
| `identity-service/src/modules/auth/auth.controller.ts` | Auth API |
| `identity-service/src/modules/auth/strategies/jwt.strategy.ts` | JWT verification |
