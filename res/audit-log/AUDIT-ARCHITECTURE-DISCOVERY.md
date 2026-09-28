# HUKI EBOOK — ARCHITECTURE DISCOVERY & AUDIT BASELINE REPORT
**Document ID:** ARCH-DISCOVERY-PHASE0-20260928  
**Phase:** PHASE 0 — DISCOVERY & ARCHITECTURE LOCK  
**Status:** COMPLETE — LOCKED FOR REVIEW  
**Scope:** Full Repository Audit (Backend Microservices, Databases, Auth/RBAC, Messaging, Logging, Frontend Admin/Seller, Mock Data Inventory, Audit Baseline)

---

## 1. Executive Summary

A comprehensive architectural discovery and code-level audit was conducted across the entire **HUKI EBOOK** repository (`e:\HuKi`). The system is architected as an event-driven e-commerce and digital reading platform structured as a multi-service monorepo managed with **Nx** and built on **NestJS (v10.3)** for backend services, **Prisma (v5.22)** for PostgreSQL ORM, **Mongoose (v8.1)** for MongoDB persistence, **Next.js (v16.3)** with **React (v19.2)** and **TailwindCSS (v3.4)** for frontend web applications.

### Core Architectural Mandate (Locked)
The platform strictly segregates three asynchronous and persistence responsibilities:
1. **PostgreSQL Audit:** Authoritative, transactional, legally verifiable governance and non-repudiation audit trail (*Who did what, when, on which resource, with state before/after*).
2. **RabbitMQ:** Cross-service asynchronous domain messaging, orchestration, and reliable workflow delivery with dead-letter queue (DLQ) retry mechanisms.
3. **Kafka:** Real-time event streaming for high-throughput behavioral analytics, telemetry, user preference tracking, and recommendation engines.

### Key Discovery Findings
* **Backend Microservices:** 8 distinct services (`api-gateway`, `identity-service`, `business-service`, `commerce-service`, `shipping-service`, `community-service`, `promotion-service`, `analytics-service`).
* **Databases:** Polyglot architecture consisting of 6 isolated PostgreSQL databases (`huki_identity`, `huki_business`, `huki_commerce`, `huki_shipping`, `huki_promotion`, `huki_analytics`), 1 MongoDB instance (`community_db`), and Redis for caching/sessions.
* **Current RabbitMQ Status:** Fully integrated via `@huki/shared` (`RabbitMqEventBus`), with transactional Outbox patterns implemented in 5 PostgreSQL services, and direct AMQP publisher/consumers in `commerce-service`, `shipping-service`, and `community-service`.
* **Current Kafka Status:** **`NOT IMPLEMENTED`** (Zero producers, zero consumers, zero brokers configured in `docker-compose.yml` or `package.json`).
* **Current Audit Status:** **`PARTIAL`** — Localized logging exists (`WalletSecurityAuditLog`, `DeliveryLog`, `OrderStatusHistory`), but unified cross-service platform audit logging in PostgreSQL is not yet implemented.

---

## 2. Current Architecture

```
                                 +-------------------------+
                                 |   Next.js 16 Frontend   |
                                 | (Port 3100: Buyer/Admin/|
                                 |  Seller/Shipper/Reader) |
                                 +------------+------------+
                                              |
                                     HTTP / REST API
                                              v
                                 +-------------------------+
                                 |    API Gateway (3000)   |
                                 | (ServiceProxyMiddleware)|
                                 +------------+------------+
                                              |
        +------------------+------------------+------------------+------------------+
        |                  |                  |                  |                  |
        v                  v                  v                  v                  v
+---------------+  +---------------+  +---------------+  +---------------+  +---------------+
|Identity (3001)|  |Business (3002)|  |Commerce (3003)|  |Shipping (3004)|  |Community(3005)|
|  identity_db  |  |  business_db  |  |  commerce_db  |  |  shipping_db  |  | community_db  |
|  (PostgreSQL) |  |  (PostgreSQL) |  |  (PostgreSQL) |  |  (PostgreSQL) |  |   (MongoDB)   |
+-------+-------+  +-------+-------+  +-------+-------+  +-------+-------+  +-------+-------+
        |                  |                  |                  |                  |
        | (Outbox)         | (Outbox)         | (Outbox/Consumer)| (Outbox/Consumer)| (Consumer)
        +------------------+------------------+------------------+------------------+
                                              |
                                              v
                              +-------------------------------+
                              |    RabbitMQ Broker (5672)     |
                              | Topic Exchange: "huki.events" |
                              +---------------+---------------+
                                              |
                                              v
                              +-------------------------------+
                              |   Promotion Service (3007)    |
                              |   promotion_db (PostgreSQL)   |
                              +-------------------------------+
                              +-------------------------------+
                              |   Analytics Service (3008)    |
                              |   analytics_db (PostgreSQL)   |
                              +-------------------------------+
```

---

## 3. Backend Services

Evidence file: [package.json](file:///e:/HuKi/platform/package.json), [.env.example](file:///e:/HuKi/platform/.env.example)

| Service Name | Port | Framework | Main Responsibility | Primary Database | Database Technology |
|---|---|---|---|---|---|
| **api-gateway** | 3000 | NestJS 10.3 | Reverse proxy router, CORS, Swagger aggregation, Rate-limiting | None (Stateless) | None |
| **identity-service** | 3001 | NestJS 10.3 | User auth, JWT token rotation, Session management, Profiles | `huki_identity` | PostgreSQL (Prisma) |
| **business-service** | 3002 | NestJS 10.3 | Business onboarding, Store management, Member RBAC, KYC | `huki_business` | PostgreSQL (Prisma) |
| **commerce-service** | 3003 | NestJS 10.3 | Catalog, Orders, Payments (PayOS), Wallets, Ledger, DRM | `huki_commerce` | PostgreSQL (Prisma) |
| **shipping-service** | 3004 | NestJS 10.3 | Fulfillment, Delivery staff assignments, GHTK integration | `huki_shipping` | PostgreSQL (Prisma) |
| **community-service**| 3005 | NestJS 10.3 | Real-time chat (Socket.IO), Reviews, Push notifications | `community_db` | MongoDB (Mongoose) |
| **promotion-service**| 3007 | NestJS 10.3 | Vouchers, Banners, Discounts, Flash sale campaigns | `huki_promotion` | PostgreSQL (Prisma) |
| **analytics-service**| 3008 | NestJS 10.3 | Telemetry ingestion, Daily metric aggregation, Fact snapshots | `huki_analytics` | PostgreSQL (Prisma) |

---

## 4. Database Ownership

Evidence files:
* [identity-service/prisma/schema.prisma](file:///e:/HuKi/platform/apps/identity-service/prisma/schema.prisma)
* [business-service/prisma/schema.prisma](file:///e:/HuKi/platform/apps/business-service/prisma/schema.prisma)
* [commerce-service/prisma/schema.prisma](file:///e:/HuKi/platform/apps/commerce-service/prisma/schema.prisma)
* [shipping-service/prisma/schema.prisma](file:///e:/HuKi/platform/apps/shipping-service/prisma/schema.prisma)
* [promotion-service/prisma/schema.prisma](file:///e:/HuKi/platform/apps/promotion-service/prisma/schema.prisma)
* [analytics-service/prisma/schema.prisma](file:///e:/HuKi/platform/apps/analytics-service/prisma/schema.prisma)
* [community-service/src/entities](file:///e:/HuKi/platform/apps/community-service/src/entities)

| Service | Database Name | Technology | Main Entities / Models | Data Ownership Scope |
|---|---|---|---|---|
| **identity-service** | `huki_identity` | PostgreSQL | `User`, `AuthSession`, `RefreshToken`, `OutboxEvent` | User credentials, authentication sessions, token families, verification tokens. |
| **business-service** | `huki_business` | PostgreSQL | `Business`, `BusinessFollower`, `Store`, `Member`, `Invitation`, `BusinessUpdateRequest`, `OutboxEvent` | Enterprise registration, merchant profile, KYC bank accounts, store metadata, team members. |
| **commerce-service** | `huki_commerce` | PostgreSQL | `Book`, `Category`, `Author`, `Publisher`, `PhysicalBookDetails`, `DigitalBookDetails`, `Cart`, `CartItem`, `CheckoutSession`, `Order`, `SellerOrder`, `OrderItem`, `InventoryReservation`, `InventoryLog`, `Payment`, `Refund`, `BookAccess`, `Subscription`, `SubscriptionAccessLog`, `OrderStatusHistory`, `ReaderBookmark`, `ReadingProgress`, `ForensicEvidence`, `Wallet`, `PayoutRequest`, `WalletSecurity`, `WalletSecurityAuditLog`, `WalletTransaction`, `LedgerTransaction`, `LedgerEntry`, `LedgerAccountSummary`, `FinanceReconciliationRun`, `Notification`, `Sanction`, `SanctionAppeal`, `ReturnRequest`, `OutboxEvent`, `InboxEvent` | Complete transactional core: Books, inventory, checkout, orders, escrow, payments, double-entry financial ledger, seller wallets, payouts, return requests, forensic DRM piracy tracking. |
| **shipping-service** | `huki_shipping` | PostgreSQL | `Shipment`, `Address`, `DeliveryStaff`, `DeliveryLog`, `OutboxEvent`, `InboxEvent` | Shipping addresses, delivery staff allocations, carrier tracking, physical package delivery logs. |
| **promotion-service**| `huki_promotion`| PostgreSQL | `Voucher`, `VoucherUsage`, `Banner`, `BookDiscount`, `FlashSale`, `FlashSaleItem`, `OutboxEvent` | Promotional discounts, platform/store vouchers, banner slots, flash sale items. |
| **community-service**| `community_db` | MongoDB | `Conversation`, `Message`, `Notification`, `NotificationDevice`, `NotificationPreference`, `Report`, `Review`, `ReviewReply` | Forum conversations, 1-1 customer chat messages, push notification queues, book ratings and replies. |
| **analytics-service**| `huki_analytics`| PostgreSQL | `AnalyticsEvent`, `DomainFactSnapshot`, `DailyAggregate`, `ProcessedEvent` | Aggregated metrics, dimensional sales facts, ingested telemetry raw events. |

---

## 5. Authentication & Authorization

Evidence files:
* Guard: [roles.guard.ts](file:///e:/HuKi/platform/libs/shared/src/guards/roles.guard.ts)
* Decorator: [roles.decorator.ts](file:///e:/HuKi/platform/libs/shared/src/decorators/roles.decorator.ts)
* User Role Enum: [identity schema.prisma](file:///e:/HuKi/platform/apps/identity-service/prisma/schema.prisma#L54-L59)
* Business Member Role Enum: [business schema.prisma](file:///e:/HuKi/platform/apps/business-service/prisma/schema.prisma#L154-L160)
* Staff Permission Service: [permission.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/staff/permission.service.ts)

### 5.1 Roles Definition
* **System Roles (`UserRole` in `identity_db`):**
  - `PLATFORM_ADMIN`: Super admin with global access across platform modules.
  - `BUSINESS`: Enterprise / Merchant account owner.
  - `DELIVERY_STAFF`: Dedicated shipper and delivery logistics personnel.
  - `USER`: Standard end-user (reader / buyer).
* **Store Member Roles (`MemberRole` in `business_db`):**
  - `OWNER`: Business creator with full financial, staffing, and store authority.
  - `MANAGER`: Store supervisor with product, order, review, and analytics management.
  - `ORDER_STAFF`: Order fulfillment operator.
  - `CONTENT_STAFF`: Product catalog and book metadata editor.
  - `FINANCE_STAFF`: Dedicated finance and settlement auditor.

### 5.2 Authorization Mechanisms
* **Authentication Guard:** `JwtAuthGuard` verifies Bearer JWT tokens and attaches `req.user`.
* **Role Guard:** `RolesGuard` evaluates `@Roles(...)` metadata against `req.user.role`.
* **Tenant Isolation:**
  - In `commerce-service`, Seller endpoints filter records using `where: { storeId: user.storeId }` or `where: { ownerUserId: user.userId }` ([seller-orders.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/seller-orders.controller.ts)).
  - In `business-service`, store modifications check `business.ownerId === user.id`.
* **Discrepancy Note:** `permission.service.ts` in `commerce-service` attempts to query `(this.prisma as any).sellerStaff`, whereas team membership is canonically persisted in `business-service` (`Member` model in `business_db`).

---

## 6. Admin Modules & Existing Permissions

Evidence files:
* Controllers: `platform/apps/business-service/src/modules/business/business.controller.ts`, `platform/apps/commerce-service/src/modules/ledger/ledger.controller.ts`, `platform/apps/commerce-service/src/modules/reconciliation/finance-reconciliation.controller.ts`, `platform/apps/promotion-service/src/modules/vouchers/vouchers.controller.ts`
* Frontend Views: [web/src/ui/components/admin](file:///e:/HuKi/web/src/ui/components/admin)

| Admin Module | Status | Backend Service & Controller | Key Endpoints / Actions | Evidence File Path |
|---|---|---|---|---|
| **Businesses (Doanh nghiệp)** | EXISTING | `business-service` (`BusinessController`) | `GET /businesses`, `PATCH /businesses/:id/approve`, `PATCH /businesses/:id/reject`, `PATCH /businesses/:id/suspend` | [business.controller.ts](file:///e:/HuKi/platform/apps/business-service/src/modules/business/business.controller.ts#L82) |
| **Accounts / Users (Tài khoản)** | EXISTING | `identity-service` (`UsersController`) | `GET /users`, `PATCH /users/:id/block`, `PATCH /users/:id/unblock`, `GET /users/:id` | [users.controller.ts](file:///e:/HuKi/platform/apps/identity-service/src/modules/users/users.controller.ts) |
| **Finance / Payout (Tài chính)** | EXISTING | `commerce-service` (`PayoutController`, `FinanceReconciliationController`, `LedgerController`) | `GET /wallet/payouts/admin`, `POST /wallet/payouts/:id/review`, `POST /reconciliation/runs`, `GET /ledger/accounts` | [payout.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/payout/payout.controller.ts#L26), [finance-reconciliation.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/reconciliation/finance-reconciliation.controller.ts#L33) |
| **Products & Catalog (Sản phẩm/Danh mục)**| EXISTING | `commerce-service` (`BooksAdminController`, `CategoriesController`, `PublishersController`) | `GET /catalog/admin/books`, `PATCH /catalog/admin/books/:id/status`, `POST /categories`, `POST /publishers` | [categories.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/categories/categories.controller.ts#L50) |
| **Promotions & Flash Sales (Khuyến mãi)**| EXISTING | `promotion-service` (`VouchersController`, `FlashSalesController`, `BannersController`) | `POST /vouchers`, `POST /flash-sales`, `POST /banners` | [vouchers.controller.ts](file:///e:/HuKi/platform/apps/promotion-service/src/modules/vouchers/vouchers.controller.ts#L57) |
| **Sanctions & Moderation (Xử lý vi phạm)**| EXISTING | `commerce-service` (`SanctionsController`), `community-service` (`ModerationController`) | `POST /sanctions`, `PATCH /sanctions/:id/lift`, `POST /sanctions/:id/appeal/review` | [sanctions.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/sanctions/sanctions.controller.ts#L27) |
| **DRM Vault & Forensic (Bản quyền)** | EXISTING | `commerce-service` (`ForensicController`) | `GET /forensics/evidence`, `POST /forensics/evidence`, `PATCH /forensics/evidence/:id/status` | [forensics.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/forensics/forensics.controller.ts) |
| **Return & Arbitration (Đổi trả / Trọng tài)**| EXISTING | `commerce-service` (`ReturnRequestsController`) | `GET /return-requests`, `POST /return-requests/:id/arbitrate` | [return-requests.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/returns/return-requests.controller.ts) |
| **Delivery / Shippers (Vận chuyển)** | EXISTING | `shipping-service` (`DeliveryStaffController`, `ShipmentsController`) | `GET /delivery-staff`, `POST /delivery-staff`, `GET /shipments/admin` | [delivery-staff.controller.ts](file:///e:/HuKi/platform/apps/shipping-service/src/modules/staff/delivery-staff.controller.ts) |
| **System Settings (Cấu hình hệ thống)** | PARTIAL | `commerce-service` (`ConfigModule`) | Hardcoded in `.env` / Policy decision defaults (`ORDER_PAYMENT_TTL_SECONDS`, etc.); no dynamic admin config table in DB. | [.env.example](file:///e:/HuKi/platform/.env.example#L167-L200) |

---

## 7. Seller Modules & Existing Permissions

Evidence files:
* Controllers: `platform/apps/commerce-service/src/modules/orders/seller-orders.controller.ts`, `platform/apps/commerce-service/src/modules/wallet/wallet.controller.ts`, `platform/apps/business-service/src/modules/store/store.controller.ts`
* Frontend Views: [web/src/ui/components/seller](file:///e:/HuKi/web/src/ui/components/seller)

| Seller Module | Status | Backend Service & Controller | Key Endpoints / Actions | Evidence File Path |
|---|---|---|---|---|
| **Products & Books (Sản phẩm)** | EXISTING | `commerce-service` (`BooksSellerController`) | `GET /seller/books`, `POST /seller/books`, `PUT /seller/books/:id`, `PATCH /seller/books/:id/status` | [books-seller.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/books-seller.controller.ts) |
| **Orders (Đơn hàng)** | EXISTING | `commerce-service` (`SellerOrdersController`) | `GET /seller/orders`, `GET /seller/orders/:id`, `PATCH /seller/orders/:id/confirm`, `PATCH /seller/orders/:id/ship`, `PATCH /seller/orders/:id/cancel` | [seller-orders.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/seller-orders.controller.ts#L11) |
| **Inventory (Kho hàng)** | EXISTING | `commerce-service` (`InventoryController`) | `GET /seller/inventory`, `POST /seller/inventory/adjust`, `GET /seller/inventory/logs` | [inventory.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/inventory/inventory.controller.ts) |
| **Wallet & Payouts (Ví & Rút tiền)** | EXISTING | `commerce-service` (`WalletController`, `PayoutController`) | `GET /wallet`, `POST /wallet/security/pin/setup`, `POST /wallet/security/pin/verify`, `POST /wallet/payouts` | [wallet.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/wallet/wallet.controller.ts#L90) |
| **Vouchers & Discounts (Khuyến mãi)** | EXISTING | `promotion-service` (`VouchersController`, `BookDiscountsController`) | `GET /vouchers/store/:storeId`, `POST /vouchers/store`, `POST /discounts/book` | [vouchers.controller.ts](file:///e:/HuKi/platform/apps/promotion-service/src/modules/vouchers/vouchers.controller.ts) |
| **Customer Reviews (Đánh giá)** | EXISTING | `community-service` (`ReviewsController`) | `GET /reviews/store/:storeId`, `POST /reviews/:id/reply` | [reviews.controller.ts](file:///e:/HuKi/platform/apps/community-service/src/modules/reviews/reviews.service.ts) |
| **Customer Chat (Tin nhắn)** | EXISTING | `community-service` (`ChatController`, `ChatGateway`) | `GET /chat/conversations`, `POST /chat/messages`, WebSocket events | [chat.service.ts](file:///e:/HuKi/platform/apps/community-service/src/modules/chat/chat.service.ts) |
| **Store Staff & RBAC (Nhân viên)** | PARTIAL | `business-service` (`MembersController`) & `commerce-service` (`StaffController`) | `GET /stores/:id/members`, `POST /stores/:id/invitations`, `PATCH /members/:id/permissions` | [members.controller.ts](file:///e:/HuKi/platform/apps/business-service/src/modules/member/member.controller.ts) |
| **Store Settings (Cài đặt gian hàng)** | EXISTING | `business-service` (`StoreController`) | `GET /stores/my-store`, `PUT /stores/:id` | [store.controller.ts](file:///e:/HuKi/platform/apps/business-service/src/modules/store/store.controller.ts) |

---

## 8. Current RabbitMQ Architecture

Evidence files:
* Base implementation: [rabbitmq-event-bus.service.ts](file:///e:/HuKi/platform/libs/shared/src/events/rabbitmq-event-bus.service.ts)
* Domain events registry: [domain-event.ts](file:///e:/HuKi/platform/libs/shared/src/events/domain-event.ts)
* Outbox publishers:
  - `identity-outbox.publisher.ts`
  - `business-outbox.publisher.ts`
  - `commerce-outbox.publisher.ts`
  - `shipping-outbox.publisher.ts`
  - `promotion-outbox.publisher.ts`
* Event consumers:
  - `commerce-event.consumer.ts`
  - `shipping-order-event.consumer.ts`
  - `notification-event.consumer.ts`

### 8.1 RabbitMQ Configuration
* **Broker URL:** `process.env.RABBITMQ_URL` (`amqp://guest:guest123@localhost:5672`)
* **Topic Exchange:** `huki.events` (durable: `true`, type: `topic`)
* **Dead Letter Queue (DLQ):** `<queue_name>.dlq` with 2 automatic retries via `x-retry-count` header before moving failed messages to DLQ ([rabbitmq-event-bus.service.ts#L64-L114](file:///e:/HuKi/platform/libs/shared/src/events/rabbitmq-event-bus.service.ts#L64-L114)).

### 8.2 Service-to-Service Message Flows

```
+-------------------+        Topic: ORDER_CREATED, ORDER_CANCELLED
|  Commerce Service | -----------------------------------------------------> +--------------------+
| (Outbox Publisher)|                                                        |  Shipping Service  |
+-------------------+                                                        |  (Queue: shipping- |
        |                                                                    |   service.order-   |
        | Topic: ORDER_*, PAYMENT_*, SHIPPING_*, chat.*                      |   events)          |
        +----------------------------------------------------> +-----------+ +--------------------+
        |                                                      | Community |
        |                                                      |  Service  | (Queue: community-service.
        |                                                      +-----------+  order-confirmations)
        v
+-------------------+        Topic: SHIPPING_DELIVERED, PAYMENT_FAILED
|  Shipping Service | -----------------------------------------------------> +--------------------+
| (Outbox Publisher)|                                                        |  Commerce Service  |
+-------------------+                                                        | (Queue: commerce-  |
                                                                             |  service.inventory)|
                                                                             +--------------------+
```

---

## 9. Current Kafka Status

Evidence search: Grepped entire repository for `kafka`, `kafkajs`, `@nestjs/microservices` Kafka options.

* **Kafka Status:** **`NOT IMPLEMENTED`**
* **Kafka Dependency:** `NONE` in `platform/package.json` or `web/package.json`.
* **Kafka Broker:** `NONE` in `docker-compose.yml`.
* **Kafka Producer / Consumer:** Zero source code files implement Kafka client connections.
* **Telemetry Gap:** The platform currently relies on polling or direct HTTP endpoints for analytics (`analytics-service`), which cannot sustain high-throughput clickstream and browsing telemetry under production loads.

---

## 10. Current Logging Discovery

Evidence files:
* HTTP Logger Interceptor: [logging.interceptor.ts](file:///e:/HuKi/platform/libs/shared/src/interceptors/logging.interceptor.ts)
* HTTP Exception Filter: [http-exception.filter.ts](file:///e:/HuKi/platform/libs/shared/src/filters/http-exception.filter.ts)
* Tracing Context: [tracing.middleware.ts](file:///e:/HuKi/platform/libs/shared/src/tracing/tracing.middleware.ts)

### 10.1 Logging Taxonomy Comparison

| Log Category | Current Implementation | Target Storage | Purpose & Characteristics |
|---|---|---|---|
| **Application Log** | Standard NestJS `Logger` (`HTTP: METHOD /path STATUS - durationMs - ip - userAgent`) | stdout / Loki / Grafana | Ephemeral developer debugging, request duration diagnostics, server crashes. |
| **Audit Log** | Localized tables (`WalletSecurityAuditLog`, `DeliveryLog`, `OrderStatusHistory`) | PostgreSQL (`*_audit_logs` / `audit_db`) | **Mandatory, tamper-evident, permanent record of administrative and merchant state changes.** |
| **Business Event** | Outbox pattern (`OutboxEvent` table) + RabbitMQ (`huki.events`) | PostgreSQL Outbox + RabbitMQ | Reliable asynchronous event processing between microservices. |
| **Analytics Event** | `analytics-service` HTTP endpoint (`AnalyticsEvent` table) | Kafka Stream + ClickHouse / Olap | High-throughput behavioral clickstream, impressions, reading progress telemetry. |

---

## 11. Frontend Admin Structure

Evidence files: [web/src/app/admin](file:///e:/HuKi/web/src/app/admin), [web/src/ui/components/admin](file:///e:/HuKi/web/src/ui/components/admin)

* **Layout:** [web/src/app/admin/layout.tsx](file:///e:/HuKi/web/src/app/admin/layout.tsx) wrapping Admin Sidebar and Topbar navigation.
* **Core Views:**
  - `AdminBusinessesView.tsx` (65 KB): Business verification, KYC bank info inspection, approval/rejection modal.
  - `AdminFinanceView.tsx` (71 KB): Platform payout requests, EOD reconciliation runs, ledger balance views.
  - `AdminAccountsView.tsx` (61 KB): User account management, role assignment, lockout status.
  - `AdminEscrowView.tsx` (50 KB): Escrow funds monitor, release/freeze toggles.
  - `AdminBookModerationView.tsx` (42 KB): Book content moderation and publishing approval.
  - `AdminDisputesView.tsx` (33 KB): Order arbitration and refund dispute resolution.
  - `AdminAppealsView.tsx` (29 KB): Merchant sanction appeals.

---

## 12. Frontend Seller Structure

Evidence files: [web/src/app/seller](file:///e:/HuKi/web/src/app/seller), [web/src/ui/components/seller](file:///e:/HuKi/web/src/ui/components/seller)

* **Layout:** [web/src/app/seller/layout.tsx](file:///e:/HuKi/web/src/app/seller/layout.tsx) wrapping `SellerSidebar.tsx` and header.
* **Core Views:**
  - `SellerCreateProductView.tsx` (76 KB): Physical and digital book submission.
  - `SellerFlashSaleView.tsx` (98 KB): Flash sale campaign registration.
  - `SellerVouchersView.tsx` (64 KB): Store voucher configuration.
  - `SellerStaffView.tsx` (43 KB): Team member invitation and permission checklist.
  - `WithdrawalPinModal.tsx` (19 KB): Secure 6-digit PIN pad for wallet payout authorizations.
  - `OrderDetailDrawer.tsx` (10 KB): Slide-over drawer for order fulfillment.

---

## 13. Current DataTable / Form / Drawer Patterns

Evidence files:
* DataTable: [DataTable.tsx](file:///e:/HuKi/web/src/ui/components/common/DataTable.tsx)
* Form Hooks: `web/src/ui/utils/formHooks.ts` (`useSmartFormCollapse`)
* UI Components: `AdminUI.tsx`, `SellerUI.tsx`

### Existing UI Component Patterns
1. **DataTable (`DataTable.tsx`):**
   - Implements standard columnar rendering (`columns`, `data`, `keyField`, `loading`, `emptyMessage`, `onRowClick`).
   - Supports custom cell renderers and text alignment.
   - *Limitation:* Does not natively support nested sub-row grouping (e.g. Master-Detail parent order and sub-orders).
2. **Filter & Status Tabs:** Implemented via `AdminFilterTabs` with state badges (`AdminStatusBadge`).
3. **Pagination:** Implemented via `AdminPagination` controlling `page` and `limit` query parameters.
4. **Drawers & Modals:** Rendered conditionally as portal or fixed overlays (e.g. `OrderDetailDrawer`, `InventoryLogsModal`).

---

## 14. Mock / Fallback Data Inventory

Evidence files found in code inspection:

| File Path | Line | Variable / Data | Current Source | Status |
|---|---|---|---|---|
| [AdminAccountsView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminAccountsView.tsx) | 9–60 | `INITIAL_USERS` (including plain-text passwords!) | Hardcoded JS Array | **MOCK FALLBACK** |
| [AdminFinanceView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminFinanceView.tsx) | 36–110 | `INITIAL_PAYOUT_REQUESTS` | Hardcoded JS Array | **MOCK FALLBACK** |
| [AdminEscrowView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminEscrowView.tsx) | 40–100 | `INITIAL_MOCK_ITEMS` | Hardcoded JS Array | **MOCK FALLBACK** |
| [taxRegistryService.ts](file:///e:/HuKi/web/src/ui/services/taxRegistryService.ts) | 112–250 | `MOCK_REGISTRY_DB` (Pre-seeded Tax Codes) | In-Memory Object / LocalStorage | **MOCK SERVICE** |
| [mockData.ts](file:///e:/HuKi/web/src/ui/data/mockData.ts) | 3–213 | `booksData` | Hardcoded Catalog Items | **MOCK DATA** |
| [stores/page.tsx](file:///e:/HuKi/web/src/app/stores/page.tsx) | 49–120 | `INITIAL_AUTHORS` | Hardcoded Author Items | **MOCK FALLBACK** |
| [cart/page.tsx](file:///e:/HuKi/web/src/app/cart/page.tsx) | 16–40 | `MOCK_AVAILABLE_VOUCHERS` | Hardcoded Voucher Array | **MOCK FALLBACK** |

---

## 15. Current Audit Capability

### What Exists Today:
1. **Wallet Security Audit:** `WalletSecurityAuditLog` table in `commerce_db` recording PIN updates, login attempts, and actor metadata ([commerce schema.prisma#L806-L821](file:///e:/HuKi/platform/apps/commerce-service/prisma/schema.prisma#L806-L821)).
2. **Order Lifecycle History:** `OrderStatusHistory` table in `commerce_db` tracking status state changes (`fromStatus` -> `toStatus`, `actorType`, `actorId`) ([commerce schema.prisma#L581-L598](file:///e:/HuKi/platform/apps/commerce-service/prisma/schema.prisma#L581-L598)).
3. **Delivery History:** `DeliveryLog` table in `shipping_db` tracking courier movements and dispatch actions ([shipping schema.prisma#L121-L139](file:///e:/HuKi/platform/apps/shipping-service/prisma/schema.prisma#L121-L139)).
4. **Ledger Audit:** Immutable double-entry ledger in `commerce_db` (`ledger_transactions` and `ledger_entries`) with zero-deletion guarantee.

### What is Missing for Enterprise Audit:
* No generalized, structured **PostgreSQL Audit Log** capturing Admin and Seller CRUD operations across all modules with `beforeState`, `afterState`, `changedFields`, `requestId`, `ip`, and `userAgent`.
* No non-repudiation audit trail for business approval/rejection, voucher adjustments, content bans, or staff permission alterations.

---

## 16. Security Risks & Masking Requirements

### Critical Sensitive Fields Identified:
* **Authentication:** `password`, `passwordHash`, `emailVerificationToken`, `passwordResetToken` ([identity schema.prisma](file:///e:/HuKi/platform/apps/identity-service/prisma/schema.prisma))
* **Session Tokens:** `refreshTokenHash`, `tokenHash` ([identity schema.prisma](file:///e:/HuKi/platform/apps/identity-service/prisma/schema.prisma))
* **Financial PINs:** `pinHash`, raw PIN inputs ([commerce schema.prisma](file:///e:/HuKi/platform/apps/commerce-service/prisma/schema.prisma))
* **Banking KYC:** `bankAccountNumber`, `bankAccountHolderName`, `taxCode` ([business schema.prisma](file:///e:/HuKi/platform/apps/business-service/prisma/schema.prisma))
* **Frontend Leak Risk:** `INITIAL_USERS` in `AdminAccountsView.tsx` currently contains mock plain-text passwords in source code.

### Required Masking Policy for Phase 1:
All audit loggers must sanitize payload diffs, replacing values of matched sensitive keys with `"[REDACTED]"` or `"****"` prior to PostgreSQL insertion.

---

## 17. Performance Considerations

* **Transaction Overhead:** Audit logging must never lock or block high-frequency database transactions.
* **Asynchronous Audit Writes:** Database audit entries should be written in a post-commit transaction hook or decoupled queue.
* **Bulk Operations:** Read-only queries (`GET /catalog`, `GET /feed`) must **NOT** generate PostgreSQL audit records (only state-mutating commands `POST`, `PUT`, `PATCH`, `DELETE` are subject to Audit).
* **Latency Benchmark Status:** **`NOT MEASURED`** (to be profiled in Phase 1).

---

## 18. Recommended Audit Architecture (Target Design)

```
        ADMIN / SELLER ACTION (HTTP Mutation)
                        |
                        v
        +-------------------------------+
        |    NestJS Audit Interceptor   |
        |   (Captures Actor, IP, Trace) |
        +---------------+---------------+
                        |
       +----------------+----------------+
       |                                 |
       v                                 v
+--------------+                 +---------------+
|  Controller  |                 | Audit Service |
| & DB Service |                 | (Sanitizer)   |
+-------+------+                 +-------+-------+
        |                                |
        | (Transaction Commit)           | (Async Append)
        v                                v
+---------------+                +---------------+
| Service DB    |                | PostgreSQL    |
| (Primary State|                | Audit Table   |
+---------------+                +---------------+
```

### Required Audit Log Record Schema (Target):
* `id`: UUID (Primary Key)
* `actorId`: String (UUID of the user performing the action)
* `actorRole`: Enum (`PLATFORM_ADMIN`, `BUSINESS_OWNER`, `STORE_STAFF`, etc.)
* `module`: String (`BUSINESSES`, `ORDERS`, `CATALOG`, `FINANCE`, `VOUCHERS`, etc.)
* `action`: String (`CREATE`, `UPDATE`, `DELETE`, `APPROVE`, `REJECT`, `FREEZE`, etc.)
* `resource`: String (`Business`, `Order`, `Voucher`, `PayoutRequest`, etc.)
* `resourceId`: String (ID of the target entity)
* `beforeState`: JSON (Nullable snapshot before mutation)
* `afterState`: JSON (Snapshot after mutation, masked for sensitive keys)
* `changedFields`: JSON (Array of field names that were modified)
* `requestId`: String (UUID / Correlation ID)
* `ip`: String (Client IP address)
* `userAgent`: String (Client User Agent string)
* `service`: String (`commerce-service`, `business-service`, etc.)
* `createdAt`: Timestamp with timezone (Default `NOW()`)

---

## 19. Recommended Kafka Analytics Architecture (Target Design)

```
       USER INTERACTION / DOMAIN EVENT
                      |
                      v
      +-------------------------------+
      |    Kafka Analytics Producer   |
      +---------------+---------------+
                      |
                      v
      +-------------------------------+
      |      Kafka Broker (9092)      |
      | Topics:                       |
      |  - huki.telemetry.pageviews   |
      |  - huki.telemetry.impressions |
      |  - huki.telemetry.cart-events |
      |  - huki.telemetry.reading-sync|
      +---------------+---------------+
                      |
                      v
      +-------------------------------+
      |   Analytics Service Consumer  |
      |   (Batch Aggregation Engine)  |
      +---------------+---------------+
                      |
                      v
      +-------------------------------+
      | analytics_db / ClickHouse DB  |
      | (DailyAggregates, FactTables) |
      +-------------------------------+
```

---

## 20. RabbitMQ Responsibility

* **Primary Purpose:** Service-to-service orchestration, asynchronous workflow commands, and transactional Outbox event dispatching.
* **Guarantees:** At-least-once delivery, retry policies, Dead Letter Queue (DLQ) containment.
* **Non-Scope:** Not used for permanent governance audit trails or user clickstream telemetry.

---

## 21. PostgreSQL Audit Responsibility

* **Primary Purpose:** Legal compliance, administrative non-repudiation, financial dispute verification, fraud investigation.
* **Guarantees:** ACID consistency, immutable append-only logs, relational queryability, fine-grained entity state diffs.

---

## 22. Admin Audit Scope

Admin actions to be strictly audited across all operational modules:
1. **Businesses:** Approval, rejection with reason, suspension, enterprise update request decisions.
2. **Accounts:** Status locking, unlocking, role assignment, forced password resets.
3. **Finance & Payouts:** Payout approvals, rejections, manual reconciliation executions, ledger reversals.
4. **Catalog & Moderation:** Book status overrides (suspend/publish), category creation/deletion.
5. **Sanctions & Disputes:** Merchant penalties, arbitration rulings on return requests, appeal verdicts.
6. **Promotions:** Platform voucher creation, budget quota overrides, flash sale campaign approvals.

---

## 23. Seller Audit Scope

Seller actions to be strictly audited per store tenant:
1. **Products:** Product price modifications, digital file upload replacements, status toggles.
2. **Orders:** Manual order confirmations, order cancellations with reason, tracking code inputs.
3. **Inventory:** Stock adjustments and manual inventory corrections.
4. **Finance & Security:** Wallet withdrawal requests, bank account updates, PIN changes/verifications.
5. **Staff:** Staff invitations, role assignments, permission custom overrides, staff deactivations.
6. **Discounts & Vouchers:** Store voucher activations, discount campaign parameters.

---

## 24. Module-by-Module Audit Matrix

| Role | Module | Action | Resource | Current API | Current DB | Audit Exists | Kafka Event Exists | RabbitMQ Involved | Status |
|---|---|---|---|---|---|---|---|---|---|
| **Admin** | Businesses | Approve Business | `Business` | `PATCH /businesses/:id/approve` | `huki_business` | NOT FOUND | NOT FOUND | YES (Outbox) | READY FOR PHASE 1 |
| **Admin** | Businesses | Reject Business | `Business` | `PATCH /businesses/:id/reject` | `huki_business` | NOT FOUND | NOT FOUND | YES (Outbox) | READY FOR PHASE 1 |
| **Admin** | Businesses | Suspend Business | `Business` | `PATCH /businesses/:id/suspend` | `huki_business` | NOT FOUND | NOT FOUND | YES (Outbox) | READY FOR PHASE 1 |
| **Admin** | Accounts | Block User | `User` | `PATCH /users/:id/block` | `huki_identity` | NOT FOUND | NOT FOUND | YES (Outbox) | READY FOR PHASE 1 |
| **Admin** | Accounts | Unblock User | `User` | `PATCH /users/:id/unblock` | `huki_identity` | NOT FOUND | NOT FOUND | YES (Outbox) | READY FOR PHASE 1 |
| **Admin** | Finance | Review Payout | `PayoutRequest` | `POST /wallet/payouts/:id/review` | `huki_commerce` | NOT FOUND | NOT FOUND | NO | READY FOR PHASE 1 |
| **Admin** | Finance | Trigger Reconcile | `FinanceReconciliationRun` | `POST /reconciliation/runs` | `huki_commerce` | PARTIAL (Run table) | NOT FOUND | NO | READY FOR PHASE 1 |
| **Admin** | Sanctions | Issue Sanction | `Sanction` | `POST /sanctions` | `huki_commerce` | PARTIAL (Sanction table) | NOT FOUND | NO | READY FOR PHASE 1 |
| **Admin** | Disputes | Arbitrate Return | `ReturnRequest` | `POST /return-requests/:id/arbitrate` | `huki_commerce` | PARTIAL (Return table) | NOT FOUND | YES (Outbox) | READY FOR PHASE 1 |
| **Admin** | Catalog | Update Book Status | `Book` | `PATCH /catalog/admin/books/:id/status` | `huki_commerce` | NOT FOUND | NOT FOUND | NO | READY FOR PHASE 1 |
| **Admin** | Promotions | Create Platform Voucher | `Voucher` | `POST /vouchers` | `huki_promotion` | NOT FOUND | NOT FOUND | YES (Outbox) | READY FOR PHASE 1 |
| **Seller** | Products | Create Book | `Book` | `POST /seller/books` | `huki_commerce` | NOT FOUND | NOT FOUND | NO | READY FOR PHASE 1 |
| **Seller** | Products | Update Price/Details | `Book` | `PUT /seller/books/:id` | `huki_commerce` | NOT FOUND | NOT FOUND | NO | READY FOR PHASE 1 |
| **Seller** | Orders | Confirm Order | `SellerOrder` | `PATCH /seller/orders/:id/confirm` | `huki_commerce` | PARTIAL (Order History) | NOT FOUND | YES (Outbox) | READY FOR PHASE 1 |
| **Seller** | Orders | Cancel Order | `SellerOrder` | `PATCH /seller/orders/:id/cancel` | `huki_commerce` | PARTIAL (Order History) | NOT FOUND | YES (Outbox) | READY FOR PHASE 1 |
| **Seller** | Inventory | Manual Adjustment | `InventoryLog` | `POST /seller/inventory/adjust` | `huki_commerce` | PARTIAL (Inventory Log) | NOT FOUND | NO | READY FOR PHASE 1 |
| **Seller** | Wallet | Update PIN | `WalletSecurity` | `POST /wallet/security/pin/setup` | `huki_commerce` | EXISTING (`WalletSecurityAuditLog`) | NOT FOUND | NO | READY FOR PHASE 1 |
| **Seller** | Wallet | Request Payout | `PayoutRequest` | `POST /wallet/payouts` | `huki_commerce` | NOT FOUND | NOT FOUND | NO | READY FOR PHASE 1 |
| **Seller** | Staff | Invite Member | `Invitation` | `POST /stores/:id/invitations` | `huki_business` | NOT FOUND | NOT FOUND | NO | READY FOR PHASE 1 |
| **Seller** | Staff | Update Permissions | `Member` | `PATCH /members/:id/permissions` | `huki_business` | NOT FOUND | NOT FOUND | NO | READY FOR PHASE 1 |
| **Seller** | Promotions | Create Store Voucher | `Voucher` | `POST /vouchers/store` | `huki_promotion` | NOT FOUND | NOT FOUND | YES (Outbox) | READY FOR PHASE 1 |

---

## 25. Current vs Target Architecture Comparison

| Architectural Aspect | Current State (Discovered) | Target Architecture (Phase 1 & Phase 2) | Gap / Action Required |
|---|---|---|---|
| **Audit Persistence** | Fragmented across individual tables (`WalletSecurityAuditLog`, `OrderStatusHistory`, `DeliveryLog`). | Unified, queryable PostgreSQL Audit schema across all services. | Implement generic Audit Service and Prisma Audit models. |
| **Audit Scope** | Limited to specific wallet and order actions. | Complete Admin & Seller mutation coverage with before/after state diffing. | Interceptors on all Admin & Seller mutating endpoints. |
| **RabbitMQ Role** | Handles cross-service domain workflows (`huki.events`). | Continues as dedicated workflow messaging bus. | No changes to core RabbitMQ role. |
| **Kafka Role** | `NOT IMPLEMENTED`. | Dedicated high-throughput stream for user behavior & telemetry analytics. | Provision Kafka container, configure topic schemas, implement producer in Phase 2. |
| **Data Sanitization** | No automated redaction of sensitive credentials in logs. | Centralized Sanitizer utility stripping passwords, PINs, and full bank numbers. | Build sanitizer interceptor middleware. |
| **Frontend Fallbacks** | Hardcoded arrays in views (`INITIAL_USERS`, `INITIAL_PAYOUT_REQUESTS`). | 100% Real API integration with robust loading & error boundaries. | Purge mock fallbacks in frontend views. |

---

## 26. Risks & Unknowns

1. **Staff Model Schema Discrepancy:**
   - In `commerce-service` ([permission.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/staff/permission.service.ts)), code queries `(this.prisma as any).sellerStaff`, which is **NOT** defined in `commerce_db`'s schema.
   - The canonical staff model is `Member` located in `business_db` ([business schema.prisma](file:///e:/HuKi/platform/apps/business-service/prisma/schema.prisma#L129-L152)).
   - *Risk:* Calling staff endpoints in `commerce-service` will throw runtime Prisma exceptions.
2. **Frontend Plain-Text Password Leak in Mock Data:**
   - `AdminAccountsView.tsx` (lines 9–60) includes hardcoded cleartext password strings in `INITIAL_USERS`.
   - *Risk:* Security risk and bad practice if compiled into production bundles.
3. **Service Proxy Port Mapping Consistency:**
   - Gateway `ServiceProxyMiddleware` routes `analytics` to port 3008, but `.env.example` did not explicitly define `ANALYTICS_SERVICE_PORT`. The default fallback in `analytics-service`'s `main.ts` is 3008.

---

## 27. Phase 1 Prerequisites

Before writing any Phase 1 code:
* [x] Complete Phase 0 Discovery Report delivered without hallucinations.
* [ ] Product Owner alignment on unified PostgreSQL Audit table schema.
* [ ] Decision on whether to consolidate Store Staff management exclusively in `business-service` (`Member`) and deprecate `commerce-service`'s `permission.service.ts` stub.
* [ ] Formal confirmation of sensitive field masking rules.
* [ ] User approval to proceed to Phase 1.
