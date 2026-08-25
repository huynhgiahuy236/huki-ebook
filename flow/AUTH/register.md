# Register Flow

## Overview

Registration flow cho user mới trên platform. User phải xác thực email trước khi có thể đăng nhập.

## Flow Diagram

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Enter  │───▶│ Validate │───▶│  Check   │───▶│ Generate │
│  Data   │    │  Input   │    │  Email   │    │  Verify  │
└──────────┘    └──────────┘    └──────────┘    │  Token   │
                                                  └────┬─────┘
                                                       │
                         ┌─────────────────────────────┼─────────────────────────────┐
                         │                             │                             │
                         ▼                             ▼                             ▼
                   ┌──────────┐                 ┌──────────┐                 ┌──────────┐
                   │  Email   │                 │  User    │                 │  Error   │
                   │  Exists  │                 │  Status  │                 │  Return  │
                   │  Return  │                 │  =       │                 │  409     │
                   │  409     │                 │  PENDING │                 │          │
                   └──────────┘                 └────┬─────┘                 └──────────┘
                                                     │
                                                     ▼
                                              ┌──────────┐
                                              │  Send    │
                                              │  Verify  │
                                              │  Email   │
                                              └────┬─────┘
                                                     │
                                                     ▼
                                              ┌──────────┐
                                              │  Return  │
                                              │  Success │
                                              │  (No     │
                                              │  Tokens) │
                                              └──────────┘
```

## Register Process

```typescript
async register(dto: RegisterDto) {
  // 1. Validate input (password: 8+ chars, uppercase, number, special)
  await this.validateRegisterInput(dto);

  // 2. Check if email exists
  const existingUser = await this.prisma.user.findUnique({
    where: { email: dto.email }
  });
  if (existingUser) {
    throwError.conflict(ErrorCode.AUTH_EMAIL_EXISTS);
  }

  // 3. Generate email verification token
  const emailVerificationToken = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60_1000);

  // 4. Create user with PENDING status
  const user = await this.prisma.user.create({
    data: {
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 12),
      fullName: dto.fullName,
      phone: dto.phone,
      status: 'PENDING', // Requires email verification
      emailVerificationToken,
      emailVerificationExpiresAt: expiresAt,
    }
  });

  // 5. Send verification email
  await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);

  // 6. Publish USER_REGISTERED event
  this.eventEmitter.emit(USER_EVENTS.REGISTERED, {
    userId: user.id,
    email: user.email,
    timestamp: new Date().toISOString(),
  });

  return {
    user: this.sanitizeUser(user),
    message: 'Registration successful. Please verify your email.',
    requiresVerification: true,
  };
}
```

## Email Verification Process

```typescript
async verifyEmail(token: string) {
  // 1. Find user with valid token
  const user = await this.prisma.user.findFirst({
    where: {
      emailVerificationToken: token,
      emailVerificationExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throwBadRequest(ErrorCode.AUTH_RESET_TOKEN_INVALID);
  }

  // 2. Update user to ACTIVE
  const updatedUser = await this.prisma.user.update({
    where: { id: user.id },
    data: {
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  // 3. Publish USER_EMAIL_VERIFIED event
  this.eventEmitter.emit(USER_EVENTS.EMAIL_VERIFIED, {
    userId: updatedUser.id,
    timestamp: new Date().toISOString(),
  });

  return {
    message: 'Email verified successfully. You can now login.',
    user: this.sanitizeUser(updatedUser),
  };
}
```

## Validation Rules

| Field | Rules | Error Code |
|-------|-------|------------|
| email | Required, valid email format, unique | AUTH_EMAIL_EXISTS, VALIDATION_EMAIL |
| password | Min 8 chars, 1 uppercase, 1 number, 1 special (@$!%*?&) | AUTH_PASSWORD_WEAK |
| fullName | Required, min 2 chars | VALIDATION_REQUIRED |
| phone | Optional | - |

## Password Requirements

```typescript
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
// - At least 8 characters
// - At least 1 uppercase letter
// - At least 1 number
// - At least 1 special character (@$!%*?&)
```

## User Status After Register

| Status | Description | Can Login | Need Verify |
|--------|-------------|-----------|-------------|
| PENDING | Awaiting email verification | ❌ | ✅ |
| ACTIVE | Verified account | ✅ | ❌ |
| BLOCKED | Suspended account | ❌ | - |

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/verify-email` | Verify email with token |
| POST | `/auth/resend-verification` | Resend verification email |

## Key Files

| File | Description |
|------|-------------|
| `identity-service/src/modules/auth/auth.service.ts` | Registration & verification logic |
| `identity-service/src/modules/auth/auth.controller.ts` | Registration API endpoints |
| `identity-service/src/modules/auth/dto/register.dto.ts` | Registration DTOs |
