# Register Flow

## Overview

Registration flow cho user mới trên platform.

## Flow Diagram

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Enter  │───▶│ Validate │───▶│  Check   │───▶│ Create   │
│  Data   │    │  Input   │    │  Email   │    │  User    │
└──────────┘    └──────────┘    └──────────┘    └────┬─────┘
                                                       │
                         ┌─────────────────────────────┼─────────────────────────────┐
                         │                             │                             │
                         ▼                             ▼                             ▼
                   ┌──────────┐                 ┌──────────┐                 ┌──────────┐
                   │  Email   │                 │  Email   │                 │  Error   │
                   │  Exists  │                 │  Not     │                 │  Return  │
                   │  Return  │                 │  Exists  │                 │  Error   │
                   │  409     │                 │  Proceed │                 │  400     │
                   └──────────┘                 └────┬─────┘                 └──────────┘
                                                     │
                                                     ▼
                                              ┌──────────┐
                                              │  Hash    │
                                              │  Password│
                                              └────┬─────┘
                                                     │
                                                     ▼
                                              ┌──────────┐
                                              │  Create  │
                                              │  Session │
                                              └────┬─────┘
                                                     │
                                                     ▼
                                              ┌──────────┐
                                              │  Return  │
                                              │  Tokens  │
                                              └──────────┘
```

## Process

```typescript
async register(dto: RegisterDto) {
  // 1. Validate input
  await this.validateRegisterInput(dto);

  // 2. Check if email exists
  const existingUser = await this.prisma.user.findUnique({
    where: { email: dto.email }
  });
  if (existingUser) {
    throwError.conflict(
      ErrorCode.AUTH_EMAIL_EXISTS,
      'Email đã được sử dụng'
    );
  }

  // 3. Hash password
  const passwordHash = await bcrypt.hash(dto.password, 12);

  // 4. Create user
  const user = await this.prisma.user.create({
    data: {
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      phone: dto.phone,
      status: 'PENDING', // or 'ACTIVE' if no email verification
    }
  });

  // 5. Send verification email (if needed)
  if (dto.sendVerificationEmail) {
    await this.emailService.sendVerification(user);
  }

  // 6. Generate tokens
  const tokens = await this.generateTokens(user);

  // 7. Create session
  await this.prisma.session.create({
    data: {
      userId: user.id,
      refreshToken: tokens.refreshToken,
      userAgent: dto.userAgent,
      ipAddress: dto.ipAddress,
    }
  });

  return {
    user: this.userView(user),
    ...tokens,
  };
}
```

## Validation Rules

| Field | Rules | Error Code |
|-------|-------|------------|
| email | Required, valid email format, unique | AUTH_EMAIL_EXISTS, VALIDATION_EMAIL |
| password | Min 8 chars, 1 uppercase, 1 number | AUTH_PASSWORD_WEAK |
| fullName | Required, min 2 chars | VALIDATION_REQUIRED |
| phone | Optional, valid Vietnam format | VALIDATION_PHONE |

## Password Requirements

```typescript
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
// - At least 8 characters
// - At least 1 uppercase letter
// - At least 1 number
```

## User Status After Register

| Status | Description | Can Login | Need Verify |
|--------|-------------|-----------|-------------|
| PENDING | Awaiting email verification | ❌ | ✅ |
| ACTIVE | Verified account | ✅ | ❌ |
| BLOCKED | Suspended account | ❌ | - |

## Key Files

| File | Description |
|------|-------------|
| `identity-service/.../auth.service.ts` | Registration logic |
| `identity-service/.../auth.controller.ts` | Registration API |
