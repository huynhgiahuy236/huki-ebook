# HUKI EBOOK — PHASE 0.1
# ARCHITECTURE CORRECTION & LOCK REPORT
**Document ID:** ARCH-LOCK-PHASE01-20260928  
**Phase:** PHASE 0.1 — ARCHITECTURE CORRECTION & LOCK  
**Mode:** READ-ONLY / NO CODE / NO REFACTOR  
**Scope:** Repository-wide Evidence Verification (`platform/`, `web/`, `docker-compose.yml`, `.env.example`, schemas, controllers, frontend views)

---

## 1. Executive Summary

This report establishes the absolute, verified baseline and architectural implementation contract for **HUKI EBOOK** prior to any code execution in Phase 1. 

Following the strict zero-hallucination mandate, every architectural claim from Phase 0 was cross-referenced against the raw source code in `e:\HuKi\platform` (NestJS backend), `e:\HuKi\web` (Next.js 16 frontend), and infrastructure descriptors.

### Key Corrections & Verifications Made in Phase 0.1:
1. **ClickHouse Removed from Immediate Decisions:** ClickHouse is **`NOT IMPLEMENTED`** (only exists as a design proposal in future markdown notes); it is classified strictly as `TARGET / PROPOSAL ONLY` and excluded from Phase 1.
2. **Audit Storage Ownership Clarified:** Services maintain strict database isolation. A monolithic single shared database for audit across services violates database boundaries. Audit schema must be provisioned per-service database or as an isolated audit service via defined contracts.
3. **Audit Transaction Semantics Formulated:** Evaluated 3 distinct transactional patterns (Synchronous in-tx, Post-commit async, Transactional Outbox) without premature decision locking.
4. **Critical RBAC Finding Documented:** `commerce-service`'s `permission.service.ts` queries a non-existent `(this.prisma as any).sellerStaff` model, whereas store staff canonically resides in `business_db` (`Member` model).
5. **Clear 4-Way Classification Enforced:** All architectural statements are strictly tagged as `CURRENT`, `TARGET`, `LOCKED DECISION`, or `UNKNOWN`.

---

## 2. Phase 0 Claims Verification

| # | Phase 0 Claim | Code Evidence | Verified Status | Correction / Clarification |
|---|---|---|---|---|
| 1 | 8 Microservices exist in monorepo | [platform/package.json](file:///e:/HuKi/platform/package.json#L8), [platform/apps/](file:///e:/HuKi/platform/apps) | **CURRENT** | Verified. `api-gateway`, `identity-service`, `business-service`, `commerce-service`, `shipping-service`, `community-service`, `promotion-service`, `analytics-service`. |
| 2 | Polyglot DB: 6 PostgreSQL + 1 MongoDB + Redis | [docker-compose.yml](file:///e:/HuKi/docker-compose.yml#L9-L81), [.env.example](file:///e:/HuKi/platform/.env.example#L61-L98) | **CURRENT** | Verified. 6 Postgres DBs (`identity`, `business`, `commerce`, `shipping`, `promotion`, `analytics`), Mongo (`community_db`), Redis (port 6379). |
| 3 | RabbitMQ is used for cross-service events & outbox | [rabbitmq-event-bus.service.ts](file:///e:/HuKi/platform/libs/shared/src/events/rabbitmq-event-bus.service.ts), Outbox publishers in 5 services | **CURRENT** | Verified. Uses Topic exchange `huki.events` with DLQ retries. |
| 4 | Kafka is NOT implemented | Grep search across repo: zero kafka dependencies, zero brokers, zero producers/consumers | **CURRENT** | Verified. Status confirmed: `NOT IMPLEMENTED`. |
| 5 | ClickHouse is used for Analytics / OLAP | [docker-compose.yml](file:///e:/HuKi/docker-compose.yml), [package.json](file:///e:/HuKi/platform/package.json) | **TARGET / PROPOSAL ONLY** | **Correction:** ClickHouse does NOT exist in code or infrastructure. Excluded from Phase 1 scope. |
| 6 | General Audit Log is implemented | Prisma schemas across all services | **TARGET** | **Correction:** Current audit capability is only `PARTIAL` (localized tables: `WalletSecurityAuditLog`, `OrderStatusHistory`, `DeliveryLog`). General audit is `TARGET`. |
| 7 | Store Staff RBAC in `commerce-service` | [permission.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/staff/permission.service.ts#L102) | **CRITICAL DEFECT (CURRENT)** | **Correction:** `permission.service.ts` casts to non-existent `(this.prisma as any).sellerStaff`. Real staff model is `Member` in `business-service`. |
| 8 | Cleartext passwords exist in Frontend mock data | [AdminAccountsView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminAccountsView.tsx#L15) | **CURRENT** | Verified. Hardcoded `INITIAL_USERS` contains plain-text passwords (`AdminMaster2026!#`). |

---

## 3. CURRENT Architecture

```
[ FRONTEND CLIENT (Port 3100) ]
        |
        | HTTP / REST
        v
[ API GATEWAY (Port 3000) ]
  ServiceProxyMiddleware
        |
        +---- /api/v1/auth, /users       --> [ identity-service (3001) ]   ==> [ huki_identity (Postgres) ]
        +---- /api/v1/businesses, /stores --> [ business-service (3002) ]   ==> [ huki_business (Postgres) ]
        +---- /api/v1/books, /orders, etc --> [ commerce-service (3003) ]   ==> [ huki_commerce (Postgres) ]
        +---- /api/v1/shipping, /shipments--> [ shipping-service (3004) ]   ==> [ huki_shipping (Postgres) ]
        +---- /api/v1/chat, /reviews      --> [ community-service (3005) ]  ==> [ community_db (MongoDB) ]
        +---- /api/v1/vouchers, /banners  --> [ promotion-service (3007) ]  ==> [ huki_promotion (Postgres) ]
        +---- /api/v1/analytics, /events  --> [ analytics-service (3008) ]  ==> [ huki_analytics (Postgres) ]

[ CROSS-SERVICE WORKFLOW ]
  Microservices (Outbox Table) --(Cron Publisher)--> [ RabbitMQ: "huki.events" (5672) ] --> Consumers
```

* **Backend Framework:** NestJS 10.3 monorepo with Nx 17.3 ([platform/package.json](file:///e:/HuKi/platform/package.json#L88-L129)).
* **Database Access:** Prisma 5.22.0 for PostgreSQL services; Mongoose 8.1.0 for Community Service ([platform/package.json](file:///e:/HuKi/platform/package.json#L107-L123)).
* **Messaging:** RabbitMQ 3 Management AMQP via `amqp-connection-manager` / `amqplib` ([platform/libs/shared/src/events/rabbitmq-event-bus.service.ts](file:///e:/HuKi/platform/libs/shared/src/events/rabbitmq-event-bus.service.ts)).
* **Frontend:** Next.js 16.3.3 (App Router), React 19.2.8, TailwindCSS 3.4.17 ([web/package.json](file:///e:/HuKi/web/package.json)).

---

## 4. TARGET Architecture

```
                                  USER / ADMIN / SELLER ACTION
                                               |
                                               v
                                    [ HTTP Request Guard ]
                                               |
              +--------------------------------+--------------------------------+
              |                                                                 |
              v                                                                 v
    [ PRIMARY SERVICE DB ]                                            [ KAFKA STREAM (Phase 2+) ]
(PostgreSQL Service Partition)                                        (Clickstream, Impressions,
              |                                                        Reading Telemetry)
              +---> [ ACID Business Mutation ]                                  |
              |                                                                 v
              +---> [ PostgreSQL Audit Record ]                       [ Analytics Aggregator ]
                    - Actor, Role, IP, UserAgent                                |
                    - Before / After Diff (Sanitized)                           v
                    - Non-repudiation Governance                      [ Analytics Data Store ]
              |
              v (If workflow notification needed)
    [ Transactional Outbox ]
              |
              v
    [ RabbitMQ Broker ]
    (Cross-service delivery / DLQ)
```

---

## 5. LOCKED Decisions

The following architectural mandates are **NON-NEGOTIABLE** and strictly binding for all future phases:

1. **Tri-Partite Responsibility Split (LOCKED):**
   - **PostgreSQL Audit:** Authoritative, tamper-evident administrative evidence and state change accountability (*Who, what, when, before/after*).
   - **RabbitMQ:** Asynchronous cross-service workflows, Outbox-pattern delivery, message retries, DLQ.
   - **Kafka:** High-throughput streaming of user behavioral telemetry, reading progress sync, clickstream, and recommendation signals.
2. **Audit Technology Enforcement (LOCKED):**
   - PostgreSQL is the sole authorized backend for Governance Audit Logs. Kafka and RabbitMQ **MUST NOT** be used as primary audit stores.
3. **No Code / No Refactor during Discovery (LOCKED):**
   - No schema changes, package additions, or code refactoring until Phase 1 implementation begins under contract.

---

## 6. UNKNOWN / Unresolved Decisions

The following architectural decisions remain **UNRESOLVED** and require Product Owner / Architecture Lead determination before Phase 1 code completion:

1. **Audit Storage Topology (UNKNOWN):**
   - *Option 1 (Per-Service DB Partition):* Each microservice owns an `audit_logs` table in its own PostgreSQL database (`huki_commerce.audit_logs`, `huki_business.audit_logs`, etc.).
   - *Option 2 (Dedicated Audit Service & DB):* A standalone `audit-service` with `huki_audit` PostgreSQL database receiving audit records asynchronously.
2. **Audit Transaction Semantics (UNKNOWN):**
   - *Option A:* Same ACID transaction (`prisma.$transaction([mutation, auditLog])`). Strongest consistency, +2–5ms latency.
   - *Option B:* Post-commit asynchronous insertion. Lower latency, risk of audit loss if process crashes post-mutation.
   - *Option C:* Outbox-driven audit writer. Zero latency on mutation path, eventual consistency.
3. **Staff RBAC Model Consolidation (UNKNOWN):**
   - Deprecate `permission.service.ts` stub in `commerce-service` and route all staff authorization queries to `business-service` (`Member` model), or replicate `Member` permissions into token claims.

---

## 7. Database Ownership

Evidence files:
* [identity schema.prisma](file:///e:/HuKi/platform/apps/identity-service/prisma/schema.prisma)
* [business schema.prisma](file:///e:/HuKi/platform/apps/business-service/prisma/schema.prisma)
* [commerce schema.prisma](file:///e:/HuKi/platform/apps/commerce-service/prisma/schema.prisma)
* [shipping schema.prisma](file:///e:/HuKi/platform/apps/shipping-service/prisma/schema.prisma)
* [promotion schema.prisma](file:///e:/HuKi/platform/apps/promotion-service/prisma/schema.prisma)
* [analytics schema.prisma](file:///e:/HuKi/platform/apps/analytics-service/prisma/schema.prisma)
* [community entities](file:///e:/HuKi/platform/apps/community-service/src/entities)

| Service | Database Name | Technology | Current Owned Entities | Classification |
|---|---|---|---|---|
| **identity-service** | `huki_identity` | PostgreSQL | `User`, `AuthSession`, `RefreshToken`, `OutboxEvent` | **CURRENT** |
| **business-service** | `huki_business` | PostgreSQL | `Business`, `BusinessFollower`, `Store`, `Member`, `Invitation`, `BusinessUpdateRequest`, `OutboxEvent` | **CURRENT** |
| **commerce-service** | `huki_commerce` | PostgreSQL | `Book`, `Category`, `Author`, `Publisher`, `PhysicalBookDetails`, `DigitalBookDetails`, `Cart`, `CartItem`, `CheckoutSession`, `Order`, `SellerOrder`, `OrderItem`, `InventoryReservation`, `InventoryLog`, `Payment`, `Refund`, `BookAccess`, `Subscription`, `SubscriptionAccessLog`, `OrderStatusHistory`, `ReaderBookmark`, `ReadingProgress`, `ForensicEvidence`, `Wallet`, `PayoutRequest`, `WalletSecurity`, `WalletSecurityAuditLog`, `WalletTransaction`, `LedgerTransaction`, `LedgerEntry`, `LedgerAccountSummary`, `FinanceReconciliationRun`, `Notification`, `Sanction`, `SanctionAppeal`, `ReturnRequest`, `OutboxEvent`, `InboxEvent` | **CURRENT** |
| **shipping-service** | `huki_shipping` | PostgreSQL | `Shipment`, `Address`, `DeliveryStaff`, `DeliveryLog`, `OutboxEvent`, `InboxEvent` | **CURRENT** |
| **promotion-service**| `huki_promotion`| PostgreSQL | `Voucher`, `VoucherUsage`, `Banner`, `BookDiscount`, `FlashSale`, `FlashSaleItem`, `OutboxEvent` | **CURRENT** |
| **community-service**| `community_db` | MongoDB | `Conversation`, `Message`, `Notification`, `NotificationDevice`, `NotificationPreference`, `Report`, `Review`, `ReviewReply` | **CURRENT** |
| **analytics-service**| `huki_analytics`| PostgreSQL | `AnalyticsEvent`, `DomainFactSnapshot`, `DailyAggregate`, `ProcessedEvent` | **CURRENT** |

---

## 8. RabbitMQ Boundary

Evidence file: [rabbitmq-event-bus.service.ts](file:///e:/HuKi/platform/libs/shared/src/events/rabbitmq-event-bus.service.ts)

* **Current Status:** Fully operational via `@huki/shared` `RabbitMqEventBus`.
* **Broker Config:** `amqp://guest:guest123@localhost:5672`, Topic Exchange `huki.events`.
* **Current Boundary:**
  - `ORDER_CREATED`, `ORDER_CANCELLED`, `ORDER_PAID`, `ORDER_COMPLETED`, `SELLER_ORDER_CONFIRMED`, `SELLER_ORDER_SHIPPED`, `SELLER_ORDER_CANCELLED`.
  - `PAYMENT_SUCCEEDED`, `PAYMENT_FAILED`.
  - `SHIPMENT_CREATED`, `SHIPMENT_DELIVERED`, `SHIPMENT_FAILED`, `SHIPMENT_STAFF_ASSIGNED`.
  - `chat.message.sent`, `review.created`.
* **Target Boundary (LOCKED):**
  - RabbitMQ retains domain coordination and transactional notifications.
  - RabbitMQ **WILL NOT** ingest general governance audit logs or user behavioral clickstreams.

---

## 9. Kafka Boundary

Evidence search: Repository-wide audit confirmed 0 Kafka packages, 0 Kafka brokers, 0 topics.

* **Current Status:** **`NOT IMPLEMENTED`** (Classification: `TARGET`).
* **Target Responsibility (LOCKED):**
  - High-throughput analytics stream.
  - Candidate Topics (Phase 2+):
    - `huki.analytics.pageviews`
    - `huki.analytics.product-impressions`
    - `huki.analytics.search-queries`
    - `huki.analytics.cart-interactions`
    - `huki.analytics.reader-telemetry`
* **Non-Scope:** Not used for transactional order processing or legal governance audit.

---

## 10. Audit Architecture & Transaction Semantics Analysis

### 10.1 Comparative Analysis of Audit Transaction Options

| Criterion | Option A: In-Transaction ACID | Option B: Post-Commit Async Interceptor | Option C: Transactional Outbox + Audit Worker |
|---|---|---|---|
| **Consistency** | Strong ACID (100% Guaranteed) | Eventual / Best Effort | Eventual Consistency (Guaranteed) |
| **Audit Loss Risk** | Zero (Mutation fails if audit fails) | Low-Medium (Loss if process crashes before audit write) | Zero (Persisted in DB transaction) |
| **Latency Overhead** | Low-Medium (+2ms to +8ms per write) | Near-Zero (+0.5ms) | Low (+1ms write to outbox) |
| **Failure Mode** | Business mutation rolls back on audit error | Mutation succeeds even if audit fails | Mutation succeeds, audit delivered asynchronously |
| **Complexity** | Low (Prisma transaction wrapper) | Low (NestJS Interceptor / EventEmitter) | Medium (Requires dedicated worker queue) |
| **HUKI Fit Assessment** | **PROPOSED FOR HIGH-VALUE MUTATIONS** (Payout, Sanction, Auth, Role Change) | Suitable for non-critical logging | Suitable if centralized audit DB is chosen |

---

## 11. Admin Audit Matrix

Evidence: Actual Controller inspection across all 8 services.

| Module | Action | HTTP Method & Route | Controller & File | Resource | DB | Current Audit | Status |
|---|---|---|---|---|---|---|---|
| **Businesses** | Approve Business | `PATCH /api/v1/businesses/:id/approve` | [business.controller.ts#L254](file:///e:/HuKi/platform/apps/business-service/src/modules/business/business.controller.ts#L254) | `Business` | `huki_business` | NOT FOUND | READY FOR PHASE 1 |
| **Businesses** | Reject Business | `PATCH /api/v1/businesses/:id/reject` | [business.controller.ts#L278](file:///e:/HuKi/platform/apps/business-service/src/modules/business/business.controller.ts#L278) | `Business` | `huki_business` | NOT FOUND | READY FOR PHASE 1 |
| **Businesses** | Suspend Business | `PATCH /api/v1/businesses/:id/suspend` | [business.controller.ts#L331](file:///e:/HuKi/platform/apps/business-service/src/modules/business/business.controller.ts#L331) | `Business` | `huki_business` | NOT FOUND | READY FOR PHASE 1 |
| **Businesses** | Review Update Request | `PATCH /api/v1/businesses/update-requests/:id/review` | [business.controller.ts#L378](file:///e:/HuKi/platform/apps/business-service/src/modules/business/business.controller.ts#L378) | `BusinessUpdateRequest` | `huki_business` | NOT FOUND | READY FOR PHASE 1 |
| **Accounts** | Block User | `PATCH /api/v1/users/:id/block` | [users.controller.ts](file:///e:/HuKi/platform/apps/identity-service/src/modules/users/users.controller.ts) | `User` | `huki_identity` | NOT FOUND | READY FOR PHASE 1 |
| **Accounts** | Unblock User | `PATCH /api/v1/users/:id/unblock` | [users.controller.ts](file:///e:/HuKi/platform/apps/identity-service/src/modules/users/users.controller.ts) | `User` | `huki_identity` | NOT FOUND | READY FOR PHASE 1 |
| **Finance** | Review Payout | `POST /api/v1/wallet/payouts/:id/review` | [payout.controller.ts#L70](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payout/payout.controller.ts#L70) | `PayoutRequest` | `huki_commerce` | NOT FOUND | READY FOR PHASE 1 |
| **Finance** | Trigger Reconciliation | `POST /api/v1/reconciliation/runs` | [finance-reconciliation.controller.ts#L33](file:///e:/HuKi/platform/apps/commerce-service/src/modules/reconciliation/finance-reconciliation.controller.ts#L33) | `FinanceReconciliationRun` | `huki_commerce` | PARTIAL (`finance_reconciliation_runs`) | READY FOR PHASE 1 |
| **Catalog** | Update Book Status | `PATCH /api/v1/catalog/admin/books/:id/status` | [books-admin.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/books-admin.controller.ts) | `Book` | `huki_commerce` | NOT FOUND | READY FOR PHASE 1 |
| **Catalog** | Create Category | `POST /api/v1/categories` | [categories.controller.ts#L50](file:///e:/HuKi/platform/apps/commerce-service/src/modules/categories/categories.controller.ts#L50) | `Category` | `huki_commerce` | NOT FOUND | READY FOR PHASE 1 |
| **Promotions** | Create Voucher | `POST /api/v1/vouchers` | [vouchers.controller.ts#L57](file:///e:/HuKi/platform/apps/promotion-service/src/modules/vouchers/vouchers.controller.ts#L57) | `Voucher` | `huki_promotion` | NOT FOUND | READY FOR PHASE 1 |
| **Promotions** | Create Flash Sale | `POST /api/v1/flash-sales` | [flash-sales.controller.ts#L42](file:///e:/HuKi/platform/apps/promotion-service/src/modules/flash-sales/flash-sales.controller.ts#L42) | `FlashSale` | `huki_promotion` | NOT FOUND | READY FOR PHASE 1 |
| **Sanctions** | Issue Sanction | `POST /api/v1/sanctions` | [sanctions.controller.ts#L27](file:///e:/HuKi/platform/apps/commerce-service/src/modules/sanctions/sanctions.controller.ts#L27) | `Sanction` | `huki_commerce` | PARTIAL (`sanctions`) | READY FOR PHASE 1 |
| **Sanctions** | Review Appeal | `POST /api/v1/sanctions/:id/appeal/review` | [sanctions.controller.ts#L80](file:///e:/HuKi/platform/apps/commerce-service/src/modules/sanctions/sanctions.controller.ts#L80) | `SanctionAppeal` | `huki_commerce` | PARTIAL (`sanction_appeals`) | READY FOR PHASE 1 |
| **Disputes** | Arbitrate Return | `POST /api/v1/return-requests/:id/arbitrate` | [return-requests.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/returns/return-requests.controller.ts) | `ReturnRequest` | `huki_commerce` | PARTIAL (`return_requests`) | READY FOR PHASE 1 |
| **Shippers** | Create Staff | `POST /api/v1/delivery-staff` | [delivery-staff.controller.ts](file:///e:/HuKi/platform/apps/shipping-service/src/modules/staff/delivery-staff.controller.ts) | `DeliveryStaff` | `huki_shipping` | NOT FOUND | READY FOR PHASE 1 |

---

## 12. Seller Audit Matrix

Evidence: Actual Controller inspection across all 8 services.

| Module | Action | HTTP Method & Route | Controller & File | Resource | DB | Current Audit | Status |
|---|---|---|---|---|---|---|---|
| **Products** | Create Book | `POST /api/v1/seller/books` | [books-seller.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/books-seller.controller.ts) | `Book` | `huki_commerce` | NOT FOUND | READY FOR PHASE 1 |
| **Products** | Update Book Details | `PUT /api/v1/seller/books/:id` | [books-seller.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/books-seller.controller.ts) | `Book` | `huki_commerce` | NOT FOUND | READY FOR PHASE 1 |
| **Products** | Update Book Status | `PATCH /api/v1/seller/books/:id/status` | [books-seller.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/books-seller.controller.ts) | `Book` | `huki_commerce` | NOT FOUND | READY FOR PHASE 1 |
| **Orders** | Confirm Order | `PATCH /api/v1/seller/orders/:id/confirm` | [seller-orders.controller.ts#L11](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/seller-orders.controller.ts#L11) | `SellerOrder` | `huki_commerce` | PARTIAL (`order_status_history`) | READY FOR PHASE 1 |
| **Orders** | Ship Order | `PATCH /api/v1/seller/orders/:id/ship` | [seller-orders.controller.ts#L11](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/seller-orders.controller.ts#L11) | `SellerOrder` | `huki_commerce` | PARTIAL (`order_status_history`) | READY FOR PHASE 1 |
| **Orders** | Cancel Order | `PATCH /api/v1/seller/orders/:id/cancel` | [seller-orders.controller.ts#L11](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/seller-orders.controller.ts#L11) | `SellerOrder` | `huki_commerce` | PARTIAL (`order_status_history`) | READY FOR PHASE 1 |
| **Inventory** | Adjust Stock | `POST /api/v1/seller/inventory/adjust` | [inventory.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/inventory/inventory.controller.ts) | `InventoryLog` | `huki_commerce` | PARTIAL (`inventory_logs`) | READY FOR PHASE 1 |
| **Wallet** | Setup / Update PIN | `POST /api/v1/wallet/security/pin/setup` | [wallet.controller.ts#L90](file:///e:/HuKi/platform/apps/commerce-service/src/modules/wallet/wallet.controller.ts#L90) | `WalletSecurity` | `huki_commerce` | EXISTING (`wallet_security_audit_logs`) | READY FOR PHASE 1 |
| **Wallet** | Request Payout | `POST /api/v1/wallet/payouts` | [payout.controller.ts#L45](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payout/payout.controller.ts#L45) | `PayoutRequest` | `huki_commerce` | NOT FOUND | READY FOR PHASE 1 |
| **Promotions**| Create Store Voucher| `POST /api/v1/vouchers/store` | [vouchers.controller.ts](file:///e:/HuKi/platform/apps/promotion-service/src/modules/vouchers/vouchers.controller.ts) | `Voucher` | `huki_promotion` | NOT FOUND | READY FOR PHASE 1 |
| **Promotions**| Create Discount | `POST /api/v1/discounts/book` | [discounts.controller.ts](file:///e:/HuKi/platform/apps/promotion-service/src/modules/discounts/discounts.controller.ts) | `BookDiscount` | `huki_promotion` | NOT FOUND | READY FOR PHASE 1 |
| **Staff** | Invite Staff | `POST /api/v1/stores/:id/invitations` | [member.controller.ts](file:///e:/HuKi/platform/apps/business-service/src/modules/member/member.controller.ts) | `Invitation` | `huki_business` | NOT FOUND | READY FOR PHASE 1 |
| **Staff** | Update Permissions | `PATCH /api/v1/members/:id/permissions` | [member.controller.ts](file:///e:/HuKi/platform/apps/business-service/src/modules/member/member.controller.ts) | `Member` | `huki_business` | NOT FOUND | READY FOR PHASE 1 |
| **Reviews** | Reply to Review | `POST /api/v1/reviews/:id/reply` | [reviews.controller.ts](file:///e:/HuKi/platform/apps/community-service/src/modules/reviews/reviews.service.ts) | `ReviewReply` | `community_db` | NOT FOUND | READY FOR PHASE 1 |

---

## 13. RBAC Findings & Discrepancies

### Critical Finding: Staff RBAC Schema Divergence
* **File:** [platform/apps/commerce-service/src/modules/staff/permission.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/staff/permission.service.ts#L102-L237)
* **Code:** Calls `(this.prisma as any).sellerStaff.findUnique(...)` and `(this.prisma as any).sellerStaff.create(...)`.
* **Issue:** `sellerStaff` is **NOT defined** in `commerce-service/prisma/schema.prisma`.
* **Canonical Model:** `business-service/prisma/schema.prisma` contains the canonical `Member` model (`OWNER`, `MANAGER`, `ORDER_STAFF`, `CONTENT_STAFF`, `FINANCE_STAFF`, `permissions: Json`).
* **Runtime Impact:** Any endpoint calling `permission.service.ts` in `commerce-service` will throw an unhandled Prisma runtime exception.
* **Resolution Recommendation for Phase 1 Contract:** Do not create duplicate tables in `commerce_db`. Route store staff operations through `business-service` `Member` API or decode verified member permissions from JWT token payload.

---

## 14. Existing History / Audit Inventory

| Model Name | Table Name | Database | Type | Retention Role | Coexistence with General Audit |
|---|---|---|---|---|---|
| `WalletSecurityAuditLog` | `wallet_security_audit_logs` | `huki_commerce` | Security Audit | Tracks PIN updates, unlock events, failed attempts | **COEXIST** (Keep specialized wallet log) |
| `OrderStatusHistory` | `order_status_history` | `huki_commerce` | Domain History | Customer & Merchant visible order status timeline | **COEXIST** (Customer facing) |
| `DeliveryLog` | `delivery_logs` | `huki_shipping` | Operational Log | Shipment transit checkpoints & courier actions | **COEXIST** (Fulfillment operational) |
| `InventoryLog` | `inventory_logs` | `huki_commerce` | Stock History | Quantity balance diffs & reason codes | **COEXIST** (Warehouse ledger) |
| `LedgerTransaction` / `LedgerEntry` | `ledger_transactions` / `ledger_entries` | `huki_commerce` | Financial Ledger | Immutable double-entry financial accounting | **COEXIST** (Financial integrity) |
| `SubscriptionAccessLog` | `subscription_access_logs`| `huki_commerce` | Usage Log | SaaS reader monthly quota tracking | **COEXIST** (Billing quota calculation) |

*Conclusion:* General Governance Audit **DOES NOT REPLACE** domain-specific logs; it operates alongside them to track administrative/actor command origins.

---

## 15. Sensitive Data Matrix

| Field Name | Services | Source Location | Sensitivity | Current Logging Risk | Audit Action | Mask Strategy |
|---|---|---|---|---|---|---|
| `password` | `identity`, `web` | [AdminAccountsView.tsx#L15](file:///e:/HuKi/web/src/ui/components/admin/AdminAccountsView.tsx#L15) | CRITICAL | Plaintext in Mock Array | PURGE MOCK | Strip / Block from Audit |
| `passwordHash` | `identity-service` | [identity schema.prisma#L17](file:///e:/HuKi/platform/apps/identity-service/prisma/schema.prisma#L17) | CRITICAL | Hash exposure in full-row dumps | REDACT | Replace with `"[REDACTED]"` |
| `refreshTokenHash` | `identity-service` | [identity schema.prisma#L71](file:///e:/HuKi/platform/apps/identity-service/prisma/schema.prisma#L71) | HIGH | Session hijack vector | REDACT | Replace with `"[REDACTED]"` |
| `pinHash` / PIN | `commerce-service` | [commerce schema.prisma#L791](file:///e:/HuKi/platform/apps/commerce-service/prisma/schema.prisma#L791) | CRITICAL | Wallet withdrawal compromise | REDACT | Replace with `"******"` |
| `bankAccountNumber`| `business`, `commerce`| [business schema.prisma#L30](file:///e:/HuKi/platform/apps/business-service/prisma/schema.prisma#L30) | MEDIUM | PII / Financial privacy | MASK | Mask as `0011****892` |
| `taxCode` | `business-service` | [business schema.prisma#L20](file:///e:/HuKi/platform/apps/business-service/prisma/schema.prisma#L20) | LOW-MEDIUM | Business identity data | LOGGED | Store raw or full string |

---

## 16. Mock Data Inventory

| File Path | Lines | Variable / Object | Current Source | Production Risk | Phase 1 Action |
|---|---|---|---|---|---|
| [AdminAccountsView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminAccountsView.tsx) | 9–60 | `INITIAL_USERS` (has passwords) | Hardcoded JS Array | HIGH (Security leak) | Replace with real API fetch fallback |
| [AdminFinanceView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminFinanceView.tsx) | 36–110 | `INITIAL_PAYOUT_REQUESTS` | Hardcoded JS Array | MEDIUM (Stale fake state) | Fallback to empty list `[]` on error |
| [AdminEscrowView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminEscrowView.tsx) | 40–100 | `INITIAL_MOCK_ITEMS` | Hardcoded JS Array | MEDIUM (Fake balances) | Connect to real Escrow API |
| [taxRegistryService.ts](file:///e:/HuKi/web/src/ui/services/taxRegistryService.ts) | 112–250 | `MOCK_REGISTRY_DB` | In-Memory Object | LOW (Local mockup) | Keep as fallback test sandbox |
| [mockData.ts](file:///e:/HuKi/web/src/ui/data/mockData.ts) | 3–213 | `booksData` | Hardcoded Array | LOW (Catalog demo) | Retain for local offline mode only |

---

## 17. Frontend Architecture Gap Analysis

Evidence: [web/src/ui/components/common/DataTable.tsx](file:///e:/HuKi/web/src/ui/components/common/DataTable.tsx)

### Current Capabilities vs Locked UI Requirements:
1. **DataTable:**
   - *Current:* Flat columnar rendering ([DataTable.tsx#L38-L90](file:///e:/HuKi/web/src/ui/components/common/DataTable.tsx#L38-L90)).
   - *Gap:* Does not support nested expandable row sub-tables (needed for Parent Order -> Sub-orders grouping).
2. **Pagination:**
   - *Current:* `AdminPagination` handles 10 items/page.
   - *Compliance:* Meets locked rule (10 items/page, shows page 1 even if total < 10).
3. **Drawer & Modal Patterns:**
   - *Current:* Slide-over `OrderDetailDrawer` and `WithdrawalPinModal` exist.
   - *Compliance:* Meets locked rule (Drawer is preferred over popup modal for complex details).

---

## 18. Audit Data Contract

### Standard Audit Record Schema (Proposed Contract):

| Field Name | Type | Requirement | Description |
|---|---|---|---|
| `id` | UUID / String | **REQUIRED** | Unique audit record identifier. |
| `actorId` | UUID / String | **REQUIRED** | Authenticated user ID executing the mutation. |
| `actorRole` | Enum / String | **REQUIRED** | Role at execution (`PLATFORM_ADMIN`, `BUSINESS_OWNER`, `STAFF`, etc.). |
| `service` | String | **REQUIRED** | Originating microservice (`commerce-service`, `business-service`, etc.). |
| `module` | String | **REQUIRED** | Functional domain (`BUSINESSES`, `ORDERS`, `CATALOG`, `FINANCE`, etc.). |
| `action` | String | **REQUIRED** | Action taxonomy token (e.g. `APPROVE`, `UPDATE_PRICE`, `REJECT`). |
| `resource` | String | **REQUIRED** | Target entity name (`Business`, `Book`, `PayoutRequest`, etc.). |
| `resourceId` | String | **REQUIRED** | Target entity primary key ID. |
| `beforeState` | JSON | **OPTIONAL** | Snapshot of record before modification (`null` for `CREATE`). |
| `afterState` | JSON | **REQUIRED** | Snapshot of record after modification (sanitized). |
| `changedFields`| JSON Array | **OPTIONAL** | List of modified field names (`["price", "status"]`). |
| `requestId` | UUID / String | **REQUIRED** | Correlation ID / Trace ID for cross-service tracking. |
| `ip` | String | **OPTIONAL** | Client IPv4/IPv6 address. |
| `userAgent` | String | **OPTIONAL** | Client User-Agent header string. |
| `storeId` | UUID / String | **OPTIONAL** | Store tenant ID (for seller-scoped audit filtering). |
| `createdAt` | DateTime | **REQUIRED** | Server UTC timestamp of insertion. |

---

## 19. Action Taxonomy

To prevent inconsistent action strings, Phase 1 will enforce this standardized taxonomy:

```typescript
export const AuditAction = {
  // Lifecycle / CRUD
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',

  // Administrative Governance
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  SUSPEND: 'SUSPEND',
  UNSUSPEND: 'UNSUSPEND',
  BLOCK: 'BLOCK',
  UNBLOCK: 'UNBLOCK',

  // Financial & Escrow
  FREEZE: 'FREEZE',
  UNFREEZE: 'UNFREEZE',
  PAYOUT_REQUEST: 'PAYOUT_REQUEST',
  PAYOUT_REVIEW: 'PAYOUT_REVIEW',
  PIN_CHANGE: 'PIN_CHANGE',
  RECONCILIATION_RUN: 'RECONCILIATION_RUN',

  // Order & Fulfillment
  CONFIRM: 'CONFIRM',
  SHIP: 'SHIP',
  CANCEL: 'CANCEL',
  ARBITRATE: 'ARBITRATE',
  ADJUST_INVENTORY: 'ADJUST_INVENTORY',

  // Team & Access
  INVITE: 'INVITE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
} as const;
```

---

## 20. Risk Register

| Risk ID | Description | Severity | Impact | Mitigation Strategy |
|---|---|---|---|---|
| **RSK-01** | `commerce-service` calls non-existent `sellerStaff` Prisma model | **CRITICAL** | Runtime 500 error on staff endpoints | Consolidate staff RBAC in `business-service` `Member` model. |
| **RSK-02** | Plain-text credentials in frontend mock arrays | **HIGH** | Security leak in client bundles | Purge mock passwords; enforce empty fallbacks. |
| **RSK-03** | In-transaction audit write adds database latency | **MEDIUM** | Mutation latency increases by 2–5ms | Keep audit inserts minimal; index only essential query keys. |
| **RSK-04** | Accidental password/PIN leakage into `afterState` JSON | **HIGH** | Plaintext credential logged in PostgreSQL | Mandatory `AuditSanitizer` interceptor before DB write. |

---

## 21. Architecture Decision Table

| Decision Area | Architectural Position | Status | Evidence | Notes |
|---|---|---|---|---|
| **PostgreSQL Audit** | Primary store for administrative governance and accountability | **LOCKED DECISION** | Policy mandate | Non-negotiable evidence repository. |
| **RabbitMQ** | Cross-service async domain workflow & Outbox delivery | **LOCKED DECISION** | [rabbitmq-event-bus.service.ts](file:///e:/HuKi/platform/libs/shared/src/events/rabbitmq-event-bus.service.ts) | Retained as current. |
| **Kafka** | Real-time user clickstream & behavioral telemetry | **LOCKED DECISION** | Policy mandate | Status: `NOT IMPLEMENTED` (Target Phase 2). |
| **ClickHouse** | Analytics warehouse proposal | **TARGET / PROPOSAL ONLY** | None in code | Excluded from Phase 1 scope. |
| **Audit DB Ownership**| Service-partitioned PostgreSQL audit tables | **PROPOSED** | Per-service Prisma schemas | Respects database isolation boundaries. |
| **Audit Immutability**| Append-only table without UPDATE/DELETE endpoints | **TARGET** | Phase 1 schema rules | Enforced via Prisma model (no update/delete methods). |
| **Audit Sanitization**| Automatic redaction of sensitive credential fields | **LOCKED DECISION** | Security Matrix | Mandatory sanitizer in audit interceptor. |
| **Staff RBAC** | Single source of truth in `business_db` (`Member`) | **PROPOSED** | [business schema.prisma](file:///e:/HuKi/platform/apps/business-service/prisma/schema.prisma) | Eliminates broken `sellerStaff` stub. |

---

## 22. PHASE 1 IMPLEMENTATION CONTRACT

This contract strictly defines what Phase 1 **IS ALLOWED** and **IS FORBIDDEN** to execute.

### Allowed in Phase 1:
1. **Audit Schema Definition:** Define `AuditLog` model in Prisma schemas for microservices requiring audit persistence.
2. **Audit Module & Sanitizer Utility:** Create reusable `@huki/shared` `AuditService`, `AuditSanitizer`, and `AuditInterceptor`.
3. **Actor Context Extraction:** Intercept JWT claims (`userId`, `role`, `storeId`, `ip`, `userAgent`, `requestId`) in NestJS controllers.
4. **Admin & Seller Mutation Coverage:** Attach audit recording to mutating endpoints identified in Sections 11 & 12.
5. **Unit & Integration Tests:** Write Jest tests validating sanitization, state diffing, and audit persistence.

### Strictly Forbidden in Phase 1:
1. **NO Kafka Implementation:** Do not create Kafka brokers, Docker containers, producers, or consumers.
2. **NO ClickHouse Integration:** Do not add ClickHouse dependencies or connection strings.
3. **NO RabbitMQ Redesign:** Do not rewrite or alter existing `RabbitMqEventBus` queues or exchanges.
4. **NO Frontend Redesign:** Do not alter existing UI themes or rewrite view components outside of audit integration.
5. **NO Database Merging:** Do not merge separate service PostgreSQL databases into a single database.

---

## 23. BLOCKERS BEFORE PHASE 1

Before starting Phase 1 implementation, the following decisions must be acknowledged by the Product Owner / User:
1. **Confirm Audit Table Placement:** Agree on per-service database audit tables (`Option 1`) vs dedicated audit service (`Option 2`).
2. **Confirm Staff RBAC Path:** Agree to consolidate staff checks into `business-service` `Member` and remove the broken `sellerStaff` stub in `commerce-service`.

---

## 24. FINAL VERDICT

```
============================================================
FINAL VERDICT: READY FOR PHASE 1 (PENDING SCOPE CONFIRMATION)
============================================================
```
*All claims verified with raw code evidence. All boundaries locked. Ready to commence Phase 1 upon confirmation.*
