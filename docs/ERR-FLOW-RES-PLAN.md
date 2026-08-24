# 📋 KẾ HOẠCH: ERR / FLOW / RES STRUCTURE

**Date:** 2026-08-24
**Status:** Planning
**Purpose:** Tạo tài liệu rules cho developers kiểm soát lỗi, luồng, và kết quả

---

## 🎯 MỤC TIÊU

| Folder | Purpose | Content |
|--------|---------|---------|
| `err/` | Error Rules | Mã lỗi, xử lý, response format |
| `flow/` | Business Flows | Luồng nghiệp vụ, state machine |
| `res/` | Results/Resources | API responses, schemas, contracts |

---

## 📁 PROPOSED STRUCTURE

```
HuKi/
├── err/                          # Error Rules
│   ├── README.md                 # Overview
│   ├── CODES/                   # Error Codes by Domain
│   │   ├── 00-common.md        # AUTH, VALIDATION, SYSTEM
│   │   ├── 01-identity.md      # USER, SESSION
│   │   ├── 02-business.md       # BUSINESS, STORE, MEMBER
│   │   ├── 03-commerce.md       # BOOK, CART, CHECKOUT, ORDER
│   │   ├── 04-payment.md       # PAYMENT, REFUND
│   │   ├── 05-shipping.md       # SHIPMENT, ADDRESS
│   │   ├── 06-community.md      # FORUM, CHAT, REVIEW
│   │   ├── 07-promotion.md     # VOUCHER, BANNER, FLASH_SALE
│   │   └── 99-template.md       # Template for new errors
│   ├── HANDLERS/                # Error Handler Rules
│   │   ├── http-status.md       # HTTP Status mapping
│   │   ├── exception-patterns.md # NestJS patterns
│   │   └── client-handling.md   # Frontend handling
│   └── TESTS/                   # Error Testing Rules
│       └── error-scenarios.md   # Test cases
│
├── flow/                        # Business Flows
│   ├── README.md                 # Overview
│   ├── AUTH/                    # Authentication Flows
│   │   ├── login.md
│   │   ├── register.md
│   │   ├── refresh-token.md
│   │   └── password-reset.md
│   ├── COMMERCE/               # Commerce Flows
│   │   ├── add-to-cart.md
│   │   ├── checkout.md
│   │   ├── payment.md
│   │   └── order-completion.md
│   ├── SHIPPING/               # Shipping Flows
│   │   ├── create-shipment.md
│   │   ├── update-status.md
│   │   └── delivery.md
│   ├── COMMUNITY/              # Community Flows
│   │   ├── create-post.md
│   │   ├── send-message.md
│   │   └── write-review.md
│   └── PROMOTION/              # Promotion Flows
│       ├── apply-voucher.md
│       └── flash-sale.md
│
├── res/                         # Results & Resources
│   ├── README.md                 # Overview
│   ├── API/                     # API Response Schemas
│   │   ├── success.md
│   │   ├── error.md
│   │   └── pagination.md
│   ├── DOMAIN/                  # Domain Schemas
│   │   ├── user.md
│   │   ├── book.md
│   │   ├── order.md
│   │   └── ...
│   └── CONTRACTS/              # Inter-service Contracts
│       ├── event-schema.md
│       └── internal-api.md
│
└── docs/                        # Existing docs (keep)
```

---

## 📊 ANALYSIS: CODE vs DOCS DISCREPANCY

### Issue 1: Error Code Format

**Docs (11-COMMON/error-codes.md):**
```
AUTH_TOKEN_INVALID
BOOK_NOT_FOUND
ORDER_NOT_FOUND
```

**Code (Actual):**
```typescript
throw new NotFoundException('Book not found');
throw new BadRequestException('Cửa hàng không tồn tại');
throw new ConflictException('Digital book is already in the cart');
```

**Discrepancy:** Code không throw error code, chỉ throw message

**Recommendation:** 
- [x] Option A: Docs đúng (code cần refactor)
- [ ] Option B: Code đúng (docs lỗi thời)

### Issue 2: Event Naming

**Docs (06-EVENTS/overview.md) - BEFORE:**
```
shipment.created
shipment.staff-assigned
```

**Code (Actual):**
```
SHIPMENT_CREATED
SHIPMENT_STAFF_ASSIGNED
```

**Status:** ✅ Đã fix 2026-08-24 - Docs đã update

### Issue 3: Order Code Format

**Docs:**
```
HUK{timestamp}{sequence}
```

**Code:**
```
ORD-{timestamp}-{randomHex}
```

**Discrepancy:** Format khác nhau

**Recommendation:** Code đúng, docs cần update

---

## 📋 TODO LIST

### Phase 1: ERR Structure (Priority HIGH)

| # | Task | Action | Owner |
|---|------|--------|-------|
| 1 | Scan all services for exceptions | Grep + analyze | Claude |
| 2 | Create err/CODES/ structure | Create folders | Claude |
| 3 | Document AUTH errors | Write | Claude |
| 4 | Document COMMERCE errors | Write | Claude |
| 5 | Document SHIPPING errors | Write | Claude |
| 6 | Document COMMUNITY errors | Write | Claude |
| 7 | Document PROMOTION errors | Write | Claude |

### Phase 2: FLOW Structure (Priority HIGH)

| # | Task | Action | Owner |
|---|------|--------|-------|
| 1 | Identify key business flows | Analyze | Claude |
| 2 | Create flow/AUTH/ | Write | Claude |
| 3 | Create flow/COMMERCE/ | Write | Claude |
| 4 | Create flow/SHIPPING/ | Write | Claude |
| 5 | Create flow/COMMUNITY/ | Write | Claude |

### Phase 3: RES Structure (Priority MEDIUM)

| # | Task | Action | Owner |
|---|------|--------|-------|
| 1 | Document API response schemas | Write | Claude |
| 2 | Document domain schemas | Write | Claude |
| 3 | Document inter-service contracts | Write | Claude |

### Phase 4: Validation (Priority HIGH)

| # | Task | Action | Owner |
|---|------|--------|-------|
| 1 | Verify code matches err docs | Review | User |
| 2 | Verify flow matches code | Review | User |
| 3 | Fix discrepancies | Update | Claude |

---

## 🚨 DISCREPANCY REPORT

### Critical (Must Fix)

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| 1 | Error codes not in code | All services | Option B: Docs đúng → Refactor code |
| 2 | ORDER_CODE format mismatch | Docs vs Code | Code đúng → Update docs |

### Medium (Should Fix)

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| 3 | Voucher errors missing in code | commerce | Add voucher validation |

### Low (Nice to Have)

| # | Issue | Location | Recommendation |
|---|-------|----------|----------------|
| 4 | Docs for new features missing | promotion | Add docs |

---

## 📝 SAMPLE CONTENT

### err/CODES/01-identity.md (Sample)

```markdown
# Identity Service Error Codes

## AUTH_*
Authentication errors.

| Code | HTTP | Message | Action |
|------|------|---------|--------|
| AUTH_TOKEN_INVALID | 401 | Token không hợp lệ | Refresh token |
| AUTH_TOKEN_EXPIRED | 401 | Token đã hết hạn | Refresh token |
| AUTH_LOGIN_FAILED | 401 | Đăng nhập thất bại | Check credentials |

## USER_*
User errors.

| Code | HTTP | Message | Action |
|------|------|---------|--------|
| USER_NOT_FOUND | 404 | Người dùng không tồn tại | Check ID |
| USER_EMAIL_EXISTS | 409 | Email đã được sử dụng | Use different email |
```

### flow/COMMERCE/checkout.md (Sample)

```markdown
# Checkout Flow

## Flow Diagram

```
[Cart] → [Preview] → [Confirm] → [Payment] → [Order Created]
              ↓            ↓           ↓            ↓
         [Session]    [Validate]  [Lock Items]  [Inventory Reserve]
```

## States

| State | Description | Next |
|-------|-------------|------|
| PENDING | Checkout started | CONFIRMED, EXPIRED |
| CONFIRMED | Payment initiated | PAID, FAILED, CANCELLED |
| PAID | Payment successful | PROCESSING |
| EXPIRED | Session timeout | - |

## Error Scenarios

| Scenario | Error Code | Recovery |
|----------|------------|----------|
| Cart empty | CHECKOUT_CART_EMPTY | Add items |
| Session expired | CHECKOUT_SESSION_EXPIRED | Start new checkout |
| Payment failed | PAYMENT_FAILED | Retry payment |
```

---

## ✅ NEXT STEPS

1. [ ] User confirms this structure
2. [ ] Claude creates folders and initial docs
3. [ ] User reviews and provides feedback
4. [ ] Fix code/docs discrepancies

---

*Created: 2026-08-24*
