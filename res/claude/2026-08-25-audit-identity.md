# 🔍 AUDIT REPORT: IDENTITY SERVICE

> Audit Date: 2026-08-25
> Branch: `feature/project-completion-audit`
> Auditor: Claude

---

## 📊 TỔNG QUAN

| Metric | Status |
|--------|--------|
| Code Files | ✅ 31 files |
| Controllers | ✅ 3 (Auth, User, Session) |
| Services | ✅ 3 |
| Endpoints | ✅ 15 endpoints |
| Spec Tests | ❌ 0 files |
| Docs Updated | ⚠️ Cần cập nhật |

---

## ✅ ĐÃ KHỚP (Code = Docs)

### 1. API Endpoints ✅
| Endpoint | Code | API-INVENTORY |
|----------|------|---------------|
| POST /auth/register | ✅ | ✅ |
| POST /auth/login | ✅ | ✅ |
| POST /auth/logout | ✅ | ✅ |
| POST /auth/logout-all | ✅ | ✅ |
| POST /auth/refresh | ✅ | ✅ |
| GET /auth/me | ✅ | ✅ |
| POST /auth/forgot-password | ✅ | ✅ |
| POST /auth/reset-password | ✅ | ✅ |
| PATCH /auth/change-password | ✅ | ✅ |
| GET /users/profile | ✅ | ✅ |
| PATCH /users/profile | ✅ | ✅ |
| GET /sessions | ✅ | ✅ |
| DELETE /sessions/:id | ✅ | ✅ |
| DELETE /sessions | ✅ | ✅ |

### 2. Prisma Schema ✅
- User model đầy đủ fields
- AuthSession model đầy đủ
- RefreshToken model đầy đủ

### 3. Events ✅
- USER_EVENTS định nghĩa đầy đủ trong `libs/shared/src/events/domain-event.ts`

---

## ⚠️ KHÔNG KHỚP (Code ≠ Docs)

### ❌ Issue #1: Password Validation (HIGH)
**Docs:** `flow/AUTH/register.md`
```typescript
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
// Yêu cầu: 8+ chars, 1 uppercase, 1 number
```

**Code:** `src/modules/auth/dto/register.dto.ts`
```typescript
@IsString()
@MinLength(8)
password: string;
// ❌ KHÔNG CÓ uppercase/number validation!
```

**Action:** Thêm `@Matches()` decorator hoặc custom validator.

---

### ❌ Issue #2: User Status After Register (MEDIUM)
**Docs:** `flow/AUTH/register.md`
```
| Status   | Can Login |
|----------|-----------|
| PENDING  | ❌         | ← Sau register nên là PENDING
| ACTIVE   | ✅         |
```

**Code:** `auth.service.ts:40-41`
```typescript
status: UserStatus.ACTIVE, // ❌ Code set ACTIVE, docs nói PENDING
```

**Action:** Hoặc đổi code thành PENDING, hoặc update docs.

---

### ❌ Issue #3: Error Codes Không Sử Dụng Shared System (HIGH)
**Docs:** `err/CODES/01-identity.md`
```
USER_NOT_FOUND      → 404
USER_EMAIL_EXISTS   → 409
SESSION_EXPIRED     → 404
```

**Code:** `auth.service.ts`
```typescript
throw new ConflictException('Email already exists'); // ❌ Dùng message trực tiếp
throw new UnauthorizedException('Invalid email or password'); // ❌ Không dùng ErrorCode
```

**Action:** Sử dụng shared error helpers từ `@huki/shared/errors`.

---

### ❌ Issue #4: Device Info Trong Session (LOW)
**Docs:** `flow/AUTH/register.md:85-92`
```typescript
await this.prisma.session.create({
  data: {
    userId: user.id,
    refreshToken: tokens.refreshToken,
    userAgent: dto.userAgent,    // ✅ Có
    ipAddress: dto.ipAddress,    // ✅ Có
    deviceType: dto.deviceType,  // ⚠️ Docs có
    deviceName: dto.deviceName,  // ⚠️ Docs có
  }
});
```

**Code:** `auth.service.ts:196-206`
```typescript
await this.prisma.authSession.create({
  data: {
    userId: user.id,
    refreshTokenHash: tokenHash,
    userAgent: deviceInfo?.userAgent,  // ✅ Có
    ipAddress: deviceInfo?.ipAddress,  // ✅ Có
    // ❌ deviceType, deviceName KHÔNG có
  }
});
```

**Action:** Thêm deviceType, deviceName vào DTO hoặc remove khỏi docs.

---

### ❌ Issue #5: Email Verification Chưa Implement (MEDIUM)
**Docs:** `flow/AUTH/register.md:76-79`
```typescript
// 5. Send verification email (if needed)
if (dto.sendVerificationEmail) {
  await this.emailService.sendVerification(user);
}
```

**Code:** `auth.service.ts` - KHÔNG CÓ email verification logic!

**Action:** Implement email verification hoặc update docs.

---

### ❌ Issue #6: Identity Service Không Publish Events (MEDIUM)
**Docs:** `domain-event.ts` có định nghĩa `USER_EVENTS`:
```typescript
export const USER_EVENTS = {
  REGISTERED: 'USER_REGISTERED',
  LOGGED_IN: 'USER_LOGGED_IN',
  // ...
};
```

**Code:** `identity-service` - KHÔNG publish event nào!

**Action:** Publish `USER_REGISTERED`, `USER_LOGGED_IN` events khi thực hiện.

---

## 📋 TODO LIST

| # | Task | Priority | Effort | Type |
|---|------|---------|--------|------|
| 1 | Fix password validation (thêm uppercase/number) | HIGH | LOW | Code |
| 2 | Sử dụng shared error codes thay vì message | HIGH | MEDIUM | Code |
| 3 | Decide: User status sau register = PENDING hay ACTIVE? | MEDIUM | LOW | Decision |
| 4 | Implement email verification | MEDIUM | HIGH | Feature |
| 5 | Publish USER_REGISTERED, USER_LOGGED_IN events | MEDIUM | MEDIUM | Events |
| 6 | Thêm deviceType/deviceName hoặc xóa khỏi docs | LOW | LOW | Cleanup |
| 7 | Thêm unit tests cho auth service | MEDIUM | MEDIUM | Tests |

---

## 🔧 ĐỀ XUẤT SỬA ĐỔI

### 1. Fix Password Validation
```typescript
// src/modules/auth/dto/register.dto.ts
import { Matches } from 'class-validator';

export class RegisterDto {
  // ...
  
  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    { message: 'Password must contain: 8+ chars, 1 uppercase, 1 number, 1 special' }
  )
  password: string;
}
```

### 2. Use Shared Error Codes
```typescript
// src/modules/auth/auth.service.ts
import { throwError } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

async register(dto: RegisterDto) {
  // ...
  if (await this.prisma.user.findUnique({ where: { email } })) {
    throwError.conflict(ErrorCode.USER_EMAIL_EXISTS);
  }
}
```

### 3. Publish Events
```typescript
// src/modules/auth/auth.service.ts
import { EventEmitter2 } from '@nestjs/event-emitter';
import { USER_EVENTS } from '@huki/shared/events';

async register(dto: RegisterDto) {
  // ... create user ...
  this.eventEmitter.emit(USER_EVENTS.REGISTERED, {
    userId: user.id,
    email: user.email,
  });
  // ...
}
```

---

## 📁 FILES CẦN UPDATE

### Docs Updates
- [ ] `flow/AUTH/register.md` - Update status flow
- [ ] `err/CODES/01-identity.md` - Add AUTH_* codes

### Code Updates
- [ ] `apps/identity-service/src/modules/auth/dto/register.dto.ts`
- [ ] `apps/identity-service/src/modules/auth/auth.service.ts`
- [ ] `apps/identity-service/src/modules/auth/auth.module.ts` (add EventEmitter)

---

## ⏭️ NEXT: BUSINESS SERVICE

Sau khi xác nhận từ user, sẽ tiếp tục audit Business Service.

---

---

## ✅ FIXES APPLIED

### 1. Password Validation ✅
- Thêm `@Matches()` decorator với regex yêu cầu uppercase, number, special char
- File: `register.dto.ts`

### 2. User Status = PENDING ✅
- Sau register: `status: UserStatus.PENDING`
- File: `auth.service.ts`

### 3. Email Verification ✅
- Thêm `POST /auth/verify-email` endpoint
- Thêm `POST /auth/resend-verification` endpoint
- Token expires sau 24h
- Prisma schema: thêm `emailVerificationExpiresAt`
- Files: `auth.service.ts`, `auth.controller.ts`, `schema.prisma`

### 4. Error Codes ✅
- Sử dụng `throwUnauthorized()`, `throwConflict()`, `throwBadRequest()`, `throwNotFound()`
- Thêm error messages cho tất cả ErrorCodes
- File: `auth.service.ts`, `throw-helpers.ts`, `error-code.ts`

### 5. Events ✅
- Publish `USER_REGISTERED`, `USER_LOGGED_IN`, `USER_EMAIL_VERIFIED`
- Sử dụng EventEmitter2
- File: `auth.service.ts`, `auth.module.ts`

### 6. Docs Updated ✅
- `flow/AUTH/register.md` - Thêm email verification flow
- `flow/AUTH/login.md` - Thêm security checks
- `api/API-INVENTORY.md` - Thêm 2 endpoints mới

---

## 📋 FILES CHANGED

| File | Change |
|------|--------|
| `identity-service/prisma/schema.prisma` | +emailVerificationExpiresAt |
| `identity-service/src/modules/auth/auth.service.ts` | Full rewrite với email verification |
| `identity-service/src/modules/auth/auth.controller.ts` | +verify-email, +resend-verification |
| `identity-service/src/modules/auth/auth.module.ts` | +EventEmitterModule |
| `identity-service/src/modules/auth/dto/register.dto.ts` | +password validation |
| `libs/shared/src/errors/error-code.ts` | +USER_EMAIL_NOT_VERIFIED |
| `libs/shared/src/errors/throw-helpers.ts` | Complete rewrite với all error messages |
| `libs/shared/src/errors/index.ts` | +throw-helpers export |
| `libs/shared/src/events/domain-event.ts` | +EMAIL_VERIFIED |
| `flow/AUTH/register.md` | Full rewrite |
| `flow/AUTH/login.md` | Full rewrite |
| `api/API-INVENTORY.md` | +2 endpoints |

---

## ⏭️ NEXT: BUSINESS SERVICE

*Generated: 2026-08-25*
*Status: Completed ✅*
