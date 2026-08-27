# HUKI EBOOK - Memory

## Recent Tasks

### sw-001: Sprint 20 Integration Tests - INCOMPLETE
**Status:** Partial (T20.1-T20.3, T20.9, T20.10 done, T20.4-T20.8 pending)

**What was done:**
- Unit tests pass: Commerce (30), Identity (1), Shipping (12), Community (47), Gateway (6)
- Integration tests: 8 gateway tests pass
- Manual verification: Auth, Business CRUD, Commerce public endpoints work

**What's missing:**
- T20.4: Cart flow integration test (add, update, remove, clear via API)
- T20.5: Checkout + COD flow integration test
- T20.6: Order & Payment (PayOS mock) integration test
- T20.7: Shipping address flow integration test
- T20.8: Voucher/Flash sale integration test

**Scope for sw-001:**
1. Create integration tests for Cart flow (T20.4)
2. Create integration tests for Checkout + COD (T20.5)
3. Create integration tests for Order & Payment (T20.6)
4. Create integration tests for Shipping address (T20.7)
5. Create integration tests for Voucher/Flash sale (T20.8)
6. Run all integration tests via `npm run test:integration`

**Files to create/modify:**
- `platform/test/integration/cart.integration-spec.ts`
- `platform/test/integration/checkout.integration-spec.ts`
- `platform/test/integration/order-payment.integration-spec.ts`
- `platform/test/integration/shipping.integration-spec.ts`
- `platform/test/integration/voucher.integration-spec.ts`

## Project Context

### Services Running (2026-08-27)
- API Gateway: 3000
- Identity: 3001
- Business: 3002
- Commerce: 3003
- Shipping: 3004
- Community: 3005
- Promotion: 3007

### Key Fixes Applied
1. Database names aligned with docker-compose (huki_*)
2. Duplicate migrations removed
3. JWT_SECRET config fixed (jwt.secret → JWT_SECRET)
4. Missing column email_verification_expires_at added
5. Child .env files removed

## References
- [Phase 5 Status](task/05-PHASE5-INTEGRATION.md)
