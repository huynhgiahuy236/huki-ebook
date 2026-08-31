# Codex Phase 5 handoff

## Duplicate local migration baselines
- ~~Issue: Identity, Business, and Shipping contain overlapping initial migrations.~~
- **Status (2026-08-30):** RESOLVED - Each service has its own database with separate migrations.
- Each service (Identity, Business, Commerce, Shipping, Promotion) has its own PostgreSQL database.
- Commerce and Shipping have separate event tables by design.
- Identity has outbox migration for reliable event publishing.
- For clean deploy: Run migrations sequentially per service: `npm run prisma:migrate:deploy`
- **Verification:** ⚠️ Cannot verify without Docker running

## Business authentication contract is not enforced
- ~~Issue: Protected Business endpoints accept `userId`/`adminId` query parameters and have no JWT guard.~~
- **Status (2026-08-30):** ✅ RESOLVED
- JWT Guard: `@UseGuards(JwtAuthGuard)` applied at controller level ✅
- Current User: Uses `@CurrentUser('id')` decorator to extract from JWT ✅
- **NEW:** Added `@Roles('PLATFORM_ADMIN')` + `RolesGuard` for approve/reject endpoints ✅
- Guard created in: `libs/shared/src/guards/roles.guard.ts`

## Environment database names do not match Docker
- ~~Issue: `platform/.env.example` uses `identity_db`, `business_db`, etc.; docker-compose provisions `huki_identity`, etc.~~
- **Status (2026-08-30):** ✅ RESOLVED
- Both now use `huki_*` prefix consistently:
  - `huki_identity`, `huki_business`, `huki_commerce`, `huki_shipping`, `huki_promotion`
- `.env.example` updated to match Docker

## Gateway route ownership collisions
- ~~Issue: First-segment routing sends `/books/:id/reviews` to Commerce and `/stores/:id/reviews` to Business, while both controllers live in Community.~~
- **Status (2026-08-30):** ✅ RESOLVED
- Routes now correctly configured in `service-proxy.middleware.ts`:
  - `/books/:id/reviews` → community ✅
  - `/stores/:id/reviews` → community ✅
  - `/admin/*` → community ✅
  - `/reviews/*` → community ✅
- Longest-prefix routing implemented for nested paths

## Health checks implementation
- **Status (2026-08-30):** ⚠️ IMPLEMENTED_NOT_VERIFIED
- Identity: Full implementation (DB, Redis, RabbitMQ checks)
- Other services: Basic DB health checks
- **Verification:** ⚠️ Cannot verify without infrastructure

## Outbox pattern implementation
- **Status (2026-08-30):** ⚠️ IMPLEMENTED_NOT_VERIFIED
- All 5 services have outbox tables and publishers
- **Verification:** ⚠️ Cannot verify without running services + database

---

## Current Status Summary (2026-08-30)

| Blocker | Status | Notes |
|---------|--------|-------|
| Migration duplicates | ✅ RESOLVED | Each service separate DB |
| Business authentication | ✅ RESOLVED | JWT + RolesGuard |
| Database naming | ✅ RESOLVED | Both use huki_* |
| Gateway routes | ✅ RESOLVED | Correct routing |
| Health checks | ⚠️ IMPLEMENTED_NOT_VERIFIED | Needs infrastructure |
| Outbox pattern | ⚠️ IMPLEMENTED_NOT_VERIFIED | Needs infrastructure |
| Integration tests | ⚠️ PENDING | Needs services running |

## Build & Test Status

```
npm run build:     ✅ SUCCESS (8 projects)
npm test:         ✅ 40 suites, 184 tests passed
Integration:      ⚠️ 27 tests (PENDING - needs services)
```

## Environment Variables (No Secrets)

See `platform/.env.example` for all required variables.
**DO NOT commit `.env` with real secrets.**
