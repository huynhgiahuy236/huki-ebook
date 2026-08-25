# CLAUDE → CODEX HANDOFF

> Phase 5 Integration Issues Found
> Generated: 2026-08-25
> From: Claude (feature/phase5-claude)
> To: Codex

---

## 🚨 CRITICAL ISSUES (Runtime - Codex Owns)

### Issue #1: Gateway Error Response Format Mismatch

**Service:** API Gateway
**File:** `platform/apps/api-gateway/src/common/filters/http-exception.filter.ts`
**Severity:** HIGH
**Category:** runtime/error-infrastructure

**Expected (Phase 5 contract):**
```json
{
  "status": "error",
  "statusCode": 400,
  "message": "...",
  "code": "ERROR_CODE",
  "details": [],
  "timestamp": "...",
  "path": "/api/v1/books"
}
```

**Actual Gateway filter output:**
```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "...",
  "code": "ERROR_CODE",
  "details": [],
  "timestamp": "...",
  "path": "/api/v1/books",
  "method": "POST"
}
```

**Problems:**
1. Missing `"status": "error"` at root level
2. Uses `"error": "Bad Request"` instead of consistent format
3. Extra `"method"` field

**Suggested Fix:** Align Gateway filter with `platform/libs/shared/src/filters/http-exception.filter.ts`

---

### Issue #2: Hardcoded Business Errors (20+ instances)

**Severity:** MEDIUM
**Category:** error-code-adoption

**Files with raw `throw new BadRequest/NotFoundException`:**

1. `commerce-service/src/modules/books/book-uploads.service.ts` (6 instances)
   - `'Cover file is required'`
   - `'Cover file is too large'`
   - `'Cover must be JPEG or PNG'`
   - `'PDF file is required'`
   - `'PDF file is too large'`
   - `'Invalid PDF file signature'`

2. `commerce-service/src/modules/books/digital-books.service.ts` (2 instances)
   - `'Book not found'`
   - `'Digital book details not found'`

3. `commerce-service/src/modules/books/physical-books.service.ts` (6 instances)
   - Multiple `'Book not found'`
   - `'Physical book details not found'`

4. `commerce-service/src/modules/catalog-search/catalog-search.service.ts` (1 instance)
   - `'Search query must contain at least 2 searchable characters'`

5. `commerce-service/src/modules/orders/order-completion.service.ts` (1 instance)
   - `throw new NotFoundException(...)`

6. `identity-service/src/modules/session/session.service.ts` (1 instance)
   - `'Session not found'`

7. `identity-service/src/modules/user/user.service.ts` (1 instance)
   - `'User not found'`

8. `shipping-service/src/modules/addresses/addresses.service.ts` (1 instance)
   - `'Address not found'`

9. `shipping-service/src/modules/delivery-staff/delivery-staff.service.ts` (2 instances)
   - `'Shipment not found'`
   - `'Delivery staff not found'`

**Suggested Fix:** Replace with `throwBadRequest(ErrorCode.XXX)` or `throwNotFound(ErrorCode.XXX)`

---

### Issue #3: T17.10 Timeout/Retry Policy

**File:** `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts`
**Status:** 30s timeout implemented, retry policy pending
**Priority:** MEDIUM

**Current:**
- ✅ Timeout: 30s
- ❌ Retry: Not implemented

---

### Issue #4: T20.x Integration Tests

**Status:** ⬜ TODO
**Priority:** HIGH
**Owner:** Codex

All Sprint 20 tasks are pending:
- T20.1: Test auth flow
- T20.2: Test Business & Store CRUD
- T20.3: Test Book catalog
- T20.4: Test Cart flow
- T20.5: Test Checkout + COD
- T20.6: Test Order & Payment (mock)
- T20.7: Test Shipping
- T20.8: Test Voucher/Flash sale
- T20.9: Test Forum & Chat
- T20.10: Test error scenarios

---

## 📋 COMPLETED BY CLAUDE (Phase 5 Sprint 19 & 21)

### T19.8: .env.example Files
✅ Created 5 missing `.env.example` files:
- `identity-service/.env.example`
- `business-service/.env.example`
- `shipping-service/.env.example`
- `community-service/.env.example`
- `promotion-service/.env.example`

### T21.1: API Inventory Verification
✅ Updated `api/API-INVENTORY.md`:
- Verified 199 actual endpoints from code
- Updated controller counts
- Note: Previous estimate was 143 endpoints

### T21.2: Error Code Audit
✅ Identified 20+ hardcoded errors needing ErrorCode migration
⚠️ Flagged for Codex to fix (runtime infrastructure)

### T21.3: DTO Validation
✅ Sample audit shows DTOs have proper validators
⚠️ Full audit needed (not blocking)

### T21.5: Build Verification
⏳ npm install in progress (for TypeScript verification)

---

## 📊 STATS

| Metric | Before | After |
|--------|--------|-------|
| .env.example files | 3/8 | 8/8 |
| ErrorCode usage | 190+ | 190+ (needs more) |
| Hardcoded errors | 20+ | 20+ (needs fix) |
| Endpoint count (docs) | 143 | 199 (verified) |

---

## 🔗 FILES MODIFIED BY CLAUDE

```
Modified:
- api/API-INVENTORY.md (updated endpoint counts)

Created:
- platform/apps/identity-service/.env.example
- platform/apps/business-service/.env.example
- platform/apps/shipping-service/.env.example
- platform/apps/community-service/.env.example
- platform/apps/promotion-service/.env.example
- .agent/CLAUDE_HANDOFF.md (this file)
```

---

## ⚠️ CONFLICT RISK

**Shared files that Codex may also modify:**
- `platform/apps/api-gateway/src/common/filters/http-exception.filter.ts` (Issue #1)

**Recommendation:** Codex should align Gateway filter to match shared library format.

---

## 📅 NEXT STEPS FOR CODEX

1. Fix Gateway HttpExceptionFilter (Issue #1)
2. Migrate hardcoded errors to ErrorCode (Issue #2)
3. Implement T17.10 retry policy (Issue #3)
4. Implement Sprint 20 integration tests (Issue #4)
5. Run TypeScript verification after npm install completes

---

*Generated by Claude on feature/phase5-claude*
*Date: 2026-08-25*
