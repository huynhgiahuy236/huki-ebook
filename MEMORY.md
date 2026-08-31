# HUKI EBOOK - Memory

## ⚠️ QUY TẮC LÀM VIỆC

### KHÔNG commit hay push gì hết
- Làm code xong → Báo cáo cho user
- Để user tự review và commit
- **Lí do:** Tránh conflict, user control final code

---

## Project Structure

```
HuKi/
├── api/        ← API inventory
├── docs/       ← Documentation
├── err/        ← Error codes & handlers
├── flow/       ← Business flows
├── res/        ← Response schemas
├── task/       ← Task lists
├── postman/    ← Postman collection
├── platform/   ← Backend code
└── web/        ← Frontend code
```

---

## Backend Phases (Platform)

| Phase | Name | Status |
|-------|------|--------|
| 01 | Backend Setup | ✅ DONE |
| 02 | Commerce Catalog | ✅ DONE |
| 03 | Payment Shipping | ✅ DONE |
| 04 | Community | ✅ DONE |
| 05 | Integration | ✅ DONE |
| 07 | Backend Completion | 🔄 IN PROGRESS (85%) |
| 08 | Production | 📋 PLANNED |

---

## Phase 07: Backend Completion (IN PROGRESS - 85%)

| Sprint | Task | Status |
|--------|------|--------|
| 27 | API completeness | ✅ DONE (199 endpoints) |
| 28 | Error codes | ✅ DONE |
| 29 | Swagger docs | ✅ DONE |
| 23 | Health checks | ⚠️ IMPLEMENTED_NOT_VERIFIED |
| 24 | Outbox pattern | ⚠️ IMPLEMENTED_NOT_VERIFIED |
| 25 | Unit tests | ✅ DONE (184 tests) |
| 30 | Performance | ⬜ TODO |

---

## Statistics (Updated 2026-08-30)

| Metric | Count | Status |
|--------|-------|--------|
| Total Endpoints | 199 | ✅ Verified |
| Unit Tests | 184 | ✅ Verified |
| Test Suites | 40 | ✅ Verified |
| Integration Tests | 27 | ⚠️ PENDING (needs services) |
| Services | 7 (+ shared) | ✅ Verified |
| Controllers | 40 | ✅ Verified |

---

## Build & Test Commands

```bash
# Build all (8 projects)
npm run build

# Build individual
npm run build:gateway
npm run build:identity
npm run build:business
npm run build:commerce
npm run build:shipping
npm run build:community
npm run build:promotion

# Test all (no --passWithNoTests)
npm test

# Test individual
npm run test:gateway
npm run test:identity
npm run test:business
npm run test:commerce
npm run test:shipping
npm run test:community
npm run test:promotion
npm run test:contract
npm run test:integration  # needs services running

# Start (after build)
npm run start:gateway     # dist/out-tsc/api-gateway/apps/api-gateway/src/main.js
npm run start:identity
npm run start:business
npm run start:commerce
npm run start:shipping
npm run start:community
npm run start:promotion
```

---

## Services Running

| Service | Port | Build Output Path |
|---------|------|-------------------|
| Gateway | 3000 | dist/out-tsc/api-gateway/apps/api-gateway/src/main.js |
| Identity | 3001 | dist/out-tsc/identity-service/apps/identity-service/src/main.js |
| Business | 3002 | dist/out-tsc/business-service/apps/business-service/src/main.js |
| Commerce | 3003 | dist/out-tsc/commerce-service/apps/commerce-service/src/main.js |
| Shipping | 3004 | dist/out-tsc/shipping-service/apps/shipping-service/src/main.js |
| Community | 3005 | dist/out-tsc/community-service/apps/community-service/src/main.js |
| Promotion | 3007 | dist/out-tsc/promotion-service/apps/promotion-service/src/main.js |

---

## Blockers Status (Updated 2026-08-30)

| Blocker | Status | Notes |
|---------|--------|-------|
| Build failed | ✅ FIXED | Created project.json files |
| npm test = 0 projects | ✅ FIXED | Added jest project config |
| Database naming | ✅ ALIGNED | Both use huki_* prefix |
| Gateway routes | ✅ OK | Already correct |
| Migration verification | ⚠️ PENDING | Needs Docker |
| PLATFORM_ADMIN guard | ✅ FIXED | Added RolesGuard |
| Integration tests | ⚠️ PENDING | Needs services running |
| Health checks | ⚠️ IMPLEMENTED_NOT_VERIFIED | Needs infrastructure |
| Outbox pattern | ⚠️ IMPLEMENTED_NOT_VERIFIED | Needs infrastructure |

---

## Files Created/Modified (2026-08-30)

### Created
- `platform/apps/*/project.json` (8 files)
- `platform/libs/shared/tsconfig.lib.json`
- `platform/libs/shared/src/guards/roles.guard.ts`
- `platform/libs/shared/src/guards/index.ts`

### Modified
- `platform/package.json` (scripts, jest config, start paths)
- `platform/apps/*/tsconfig.app.json` (8 files)
- `platform/apps/business-service/src/modules/business/business.controller.ts`
- `platform/apps/business-service/src/modules/store/store.controller.ts`
- `platform/libs/shared/src/index.ts`

---

## References
- Audit Report: `task/platform/AUDIT-REPORT-2026-08-30.md`
- API Inventory: `api/API-INVENTORY.md`
- Errors: `err/README.md`
- Flows: `flow/README.md`
- Docs: `docs/README.md`
