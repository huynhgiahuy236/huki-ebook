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
| 07 | Backend Completion | ✅ DONE (100%) |
| 08 | Production | 📋 PLANNED |

---

## Phase 07: Backend Completion (COMPLETE ✅)

| Sprint | Task | Status |
|--------|------|--------|
| 27 | API completeness | ✅ |
| 28 | Error codes | ✅ |
| 29 | Swagger docs | ✅ |
| 23 | Health checks | ✅ |
| 24 | Outbox pattern | ✅ |
| 25 | Unit tests | ✅ |
| 30 | Performance | ✅ |

---

## Statistics

| Metric | Count |
|--------|-------|
| Total Endpoints | 199 |
| Unit Tests | 180+ |
| Integration Tests | 27 |
| Total Tests | 207+ |

---

## Services Running

| Service | Port |
|---------|------|
| Gateway | 3000 |
| Identity | 3001 |
| Business | 3002 |
| Commerce | 3003 |
| Shipping | 3004 |
| Community | 3005 |
| Promotion | 3007 |

---

## Files Changed (chưa commit)

Backend Phase 07: ~50+ files

Xem chi tiết trong `task/` folder

---

## References
- API Inventory: `api/API-INVENTORY.md`
- Errors: `err/README.md`
- Flows: `flow/README.md`
- Docs: `docs/README.md`
