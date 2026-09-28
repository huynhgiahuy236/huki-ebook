# HUKI EBOOK — PHASE 4 FULL HISTORY & AUDIT UI INTEGRATION AUDIT REPORT

**Document Version:** 1.0.0  
**Timestamp:** 2026-09-28T23:14:00+07:00  
**Project Root:** `E:\HuKi`  
**Execution Mode:** AUDIT FIRST → COMPREHENSIVE SYSTEM SCAN (READ-ONLY)  
**Status:** **AUDIT COMPLETE — READY FOR TARGETED PHASE 4.1 - 4.5 IMPLEMENTATION**

---

## 1. Executive Summary

Phase 4 conducted an exhaustive, multi-service audit across the entire HUKI repository (`web/src/app`, `web/src/ui`, `platform/apps`), covering all Admin and Seller operational modules.

The primary objective was to verify:
1. **Domain History Coverage:** Tracking business entity status lifecycles (Orders, Disputes, Payouts, Escrow, Sanctions, Book Status, Return Requests).
2. **Governance Audit Coverage:** Tracking administrative and store-level actions (who performed what action, when, before/after states, diffs, IP, actor role).
3. **Data Integrity & Traceability:** Ensuring all history and audit representations are backed by real database models without synthetic or mock fallbacks.
4. **UI Architecture Compliance:** Ensuring history/audit views are rendered in-page (drawers, tabs, inspectors, timelines) and avoiding modal/popup anti-patterns for logs.

### Key Audit Findings:
- **Admin Governance & Finance:** Following Phase 3, Admin Businesses, Admin Accounts, Admin Users, Admin Finance, and Admin Disputes are **COMPLETE** with live database-backed audit logs, atomic balance ledgers, and in-page timelines.
- **Seller Order History:** **COMPLETE** via `OrderStatusHistory` in `commerce-service` and rendered in `OrderDetailDrawer.tsx`.
- **Seller Inventory History:** **COMPLETE BACKEND & API**, but **UI GAP**: `InventoryLogsModal.tsx` currently uses a popup modal (`createPortal`) instead of an in-page drawer/tab, violating the In-Page History rule.
- **Seller Financial Transactions:** **COMPLETE** via `WalletTransaction` (10 atomic fields) and `SellerTransactionsPage`.
- **Seller Staff & Member Governance Audit:** **PARTIAL / API GAP**. Mutations are recorded in `business_db.audit_logs`, but the query API is currently restricted to Platform Admin (`/businesses/admin/:id/audit-logs`). Store Owners lack a scoped query endpoint (`/members/store/:storeId/audit-logs`) to view staff permission change logs in `SellerStaffView.tsx`.
- **Seller Product Metadata History:** **CURRENT STATE ONLY**. Product creation/update modifies the row directly; non-inventory metadata history (price revisions, title changes) has no historical revision table. Inventory mutations are tracked in `InventoryLog`.

---

## 2. Admin Module Coverage Matrix

| Admin Module | Domain History | Governance Audit | Existing DB Model | Existing Query API | UI Component | Status |
|:---|:---|:---|:---|:---|:---|:---:|
| **Businesses** (`/admin/businesses`) | `PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED` | Approval, Rejection, Suspension, Profile Updates | `business_db.audit_logs`, `businesses` | `GET /businesses/admin/:id/audit-logs` | `AdminBusinessesView` (Tab "Lịch Sử Quản Trị") | **COMPLETE** |
| **Accounts** (`/admin/accounts`) | `active`, `warning`, `locked` | Lock/Unlock, Role Change, Customer Updates | `identity_db.audit_logs`, `users` | `GET /users/admin/:id/audit-logs` | `AdminAccountsView` (Tab "Lịch Sử Quản Trị") | **COMPLETE** |
| **Users / Readers** (`/admin/users`) | Reader profile tiers, DRM device counts | Lock/Unlock, DRM Device Revocation, Reward points | `identity_db.audit_logs`, `users` | `GET /users/admin/:id/audit-logs` | `AdminUsersView` (Tab "Lịch Sử Quản Trị") | **COMPLETE** |
| **Finance / Payouts** (`/admin/finance`) | `PENDING`, `APPROVED`, `COMPLETED`, `FAILED`, `REJECTED` | Payout Review, Disbursement, EOD Trigger | `wallet_transactions`, `payout_requests`, `ledger_transactions`, `finance_reconciliation_runs` | `GET /payout/admin/requests`, `GET /admin/finance/reconciliation/runs`, `GET /wallet/admin/transactions` | `AdminFinanceView` (`FinancialTransactionTable`, `GroupedDataTable`) | **COMPLETE** |
| **Disputes / Appeals** (`/admin/disputes`) | `PENDING_REVIEW`, `FORWARDED`, `ARBITRATED` | Ruling Issuance, Refund Ratio, Escrow Allocation | `return_requests`, `sanction_appeals` | `GET /disputes`, `GET /disputes/:id` | `AdminDisputesView` (Evidence, Domain Timeline, Governance Tabs) | **COMPLETE** |
| **Return Requests** (`/admin/return-requests`) | `PENDING_REVIEW`, `SELLER_ACCEPTED`, `ARBITRATED`, `REFUNDED`, `REPLACED` | Dispute Resolution, Replacement Package tracking | `return_requests` | `GET /orders/admin/returns` | `AdminReturnRequestsView` | **COMPLETE** |
| **Books / Moderation** (`/admin/books`, `/admin/book-moderation`) | `DRAFT`, `PUBLISHED`, `HIDDEN`, `SUSPENDED` | Content Moderation, Suspension, Review | `books`, `audit_logs` | `GET /books`, `GET /books/:id` | `AdminBooksView` | **PARTIAL** (Metadata audit API missing) |
| **Stores** (`/admin/stores`) | `PENDING_APPROVAL`, `APPROVED`, `SUSPENDED`, `CLOSED` | Store Approval, Store Lock, Category Assignment | `stores`, `audit_logs` | `GET /stores` | `AdminStoresView` | **COMPLETE** |
| **Escrow & Settlement** (`/admin/escrow`) | `HELD`, `RELEASED`, `REFUNDED` | Escrow Holding, Scheduled Settlement | `ledger_transactions`, `ledger_entries` | `GET /ledger/escrow` | `AdminEscrowView` | **COMPLETE** |
| **System Health** (`/admin/health`) | `ok`, `degraded`, `unavailable` | Service Health Diagnostics | Real-time health probes | `GET /health` across 8 microservices | `AdminHealthView` | **COMPLETE** |

---

## 3. Seller Module Coverage Matrix

| Seller Module | Domain History | Governance Audit | Existing DB Model | Existing Query API | UI Component | Status |
|:---|:---|:---|:---|:---|:---|:---:|
| **Dashboard** (`/seller/dashboard`) | Sales trends, Order volume metrics | N/A (Analytical View) | Aggregate queries | `GET /seller/analytics`, `GET /seller/orders` | `SellerDashboardView` | **COMPLETE** |
| **Orders & Sub-orders** (`/seller/orders`, `/seller/orders/[id]`) | `PENDING_CONFIRMATION`, `CONFIRMED`, `PREPARING`, `SHIPPED`, `DELIVERED`, `COMPLETED`, `CANCELLED` | Action by Seller Staff / Store Owner (`actorType`, `actorId`, timestamp) | `seller_orders`, `order_status_history` | `GET /seller/orders`, `GET /seller/orders/:id` (returns `timeline`) | `OrderDetailDrawer.tsx` (In-Page Drawer) | **COMPLETE** |
| **Inventory** (`/seller/inventory`) | Stock additions, Reductions, Order deductions, Returns, Manual adjustments | Actor, Reason, Note, Previous/New Balance | `physical_book_details`, `inventory_logs` | `GET /books/:bookId/inventory-logs` | `InventoryLogsModal.tsx` | **PARTIAL (UI GAP: Modal $\rightarrow$ Drawer/Tab)** |
| **Wallet & Balance** (`/seller/wallet`, `/seller/transactions`) | Operational balance transitions (Available, Pending, Frozen) | Reference ID, Type, Reason, Atomic Before/After | `wallets`, `wallet_transactions` | `GET /wallet/store/:storeId/transactions` | `SellerTransactionsPage`, `SellerWalletPage` | **COMPLETE** |
| **Payout Requests** (`/seller/finance`) | `PENDING`, `APPROVED`, `REJECTED`, `PROCESSING`, `COMPLETED`, `FAILED` | Requested by, Reviewed by, Rejection reason, Bank snapshot | `payout_requests` | `GET /payout/my-requests` | `SellerFinanceView`, `WithdrawalPinModal` | **COMPLETE** |
| **Products / Catalog** (`/seller/products`) | `DRAFT`, `PUBLISHED`, `HIDDEN`, `SUSPENDED`, `ARCHIVED` | Creation, Updates, Price Revisions | `books` (Current State only), `inventory_logs` (Stock only) | `GET /books/owned`, `GET /books/:id` | `SellerProductsPage`, `SellerEditProductView` | **PARTIAL** (Metadata change history missing) |
| **Staff & Roles** (`/seller/staff`) | Staff status (`ACTIVE`, `INACTIVE`, `INVITED`) | Staff Added, Role Changed, Permissions Modified, Removed | `business_db.members`, `business_db.audit_logs` | `GET /members/business/:id` (Logs endpoint missing for Seller) | `SellerStaffView.tsx` | **PARTIAL (BACKEND API GAP)** |
| **Appeals & Sanctions** (`/seller/appeals`) | `WARNING`, `PROBATION`, `SUSPENSION`, `BAN`, Appeal: `PENDING`, `APPROVED`, `REJECTED` | Decision reason, Reviewed by, Timestamp, Evidence | `sanctions`, `sanction_appeals` | `GET /sanctions/my-store`, `GET /sanctions/appeals` | `SellerAppealsView.tsx` | **COMPLETE** |
| **Returns & Refunds** (`/seller/returns`) | `PENDING_REVIEW`, `FORWARDED`, `SELLER_ACCEPTED`, `ARBITRATED` | Seller Evidence, Dispute Submission, Replacement Dispatch | `return_requests` | `GET /orders/seller/returns` | `SellerReturnsView.tsx` | **COMPLETE** |
| **Reviews & Feedback** (`/seller/reviews`) | Customer reviews, Ratings, Feedback dates | Seller Replies, Moderation flags | `community_db.reviews`, `review_replies` | `GET /reviews/store/:storeId` | `SellerReviewsView.tsx` | **COMPLETE** |
| **Customer Chat** (`/seller/chat`) | Customer-Seller message threads, Timestamps | Message sent, Read status | `community_db.chat_messages`, `chat_threads` | `GET /chat/threads`, `GET /chat/messages` | `SellerChatView.tsx` | **COMPLETE** |
| **Vouchers & Discounts** (`/seller/promotions`) | Campaign validity, Usage counts, Status | Campaign creation, Edit, Deactivation | `promotion_db.vouchers`, `flash_sales` | `GET /vouchers/store/:storeId` | `SellerVouchersView`, `SellerFlashSaleView` | **COMPLETE** |
| **Store Profiles** (`/seller/stores`, `/seller/profile`) | Store metadata, Address, Banking info | Profile updates, Verification status | `business_db.stores` | `GET /stores/my-store`, `GET /stores/:id` | `SellerStoresView`, `SellerProfileView` | **COMPLETE** |

---

## 4. Detailed History Classification (Domain History vs. Governance Audit)

### A. DOMAIN HISTORY (Business State Machine)
- **Order Lifecycle:** `PENDING_PAYMENT` $\rightarrow$ `PENDING_CONFIRMATION` $\rightarrow$ `CONFIRMED` $\rightarrow$ `PREPARING` $\rightarrow$ `SHIPPED` $\rightarrow$ `DELIVERED` $\rightarrow$ `COMPLETED` / `CANCELLED` / `REFUNDED`.
- **Payout Lifecycle:** `PENDING` $\rightarrow$ `APPROVED` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` / `FAILED` / `REJECTED`.
- **Dispute / Return Lifecycle:** `PENDING_REVIEW` $\rightarrow$ `FORWARDED_TO_SELLER` $\rightarrow$ `SELLER_ACCEPTED` / `SELLER_DISPUTED` $\rightarrow$ `ARBITRATED_BUYER_WINS` / `ARBITRATED_SELLER_WINS` $\rightarrow$ `REFUNDED` / `REPLACED`.
- **Sanction / Appeal Lifecycle:** `ACTIVE` (Warning/Suspension) $\rightarrow$ `APPEALED` $\rightarrow$ `APPROVED` (Lifted) / `REJECTED`.
- **EOD Reconciliation Lifecycle:** `RUNNING` $\rightarrow$ `COMPLETED_PASS` / `COMPLETED_WARNING` / `COMPLETED_FAIL`.

### B. GOVERNANCE AUDIT (Who, What, When, Impact)
- **Identity / User Governance:** Lock/unlock accounts, password resets, session terminations, device revocations.
- **Enterprise / Business Governance:** Approval of legal tax profiles, rejection with statutory preset reasons, suspension.
- **Store & Staff Governance:** Role assignments, granular permission updates (e.g. `ORDER_PROCESS`, `PRODUCT_UPDATE`), staff removal.
- **Arbitration & Judicial Governance:** Platform Admin arbitration rulings, Escrow split ratios (e.g. 70/30), justification memos.
- **Financial & Wallet Governance:** Balance debits/credits, ledger entry postings, reconciliation override runs.

---

## 5. Identified Gaps & Required Actions

### GAP 1: Seller Staff Governance Audit Query (Backend + Frontend Gap)
- **Module:** Seller Staff Management (`/seller/staff`)
- **Service:** `business-service`
- **Data Status:** `business_db.audit_logs` already stores audit records for `Member` mutations (`INVITE_MEMBER`, `UPDATE_MEMBER_ROLE`, `REMOVE_MEMBER`, `TOGGLE_MEMBER_STATUS`).
- **Gap:** Store Owners have no scoped query endpoint. `GET /api/v1/businesses/admin/:id/audit-logs` requires `PLATFORM_ADMIN`.
- **Required Endpoint:** `GET /api/v1/members/business/:businessId/audit-logs` (enforcing Store Owner / Member authorization).
- **Frontend Target:** Add "Lịch Sử Thao Tác Phân Quyền" timeline tab into `SellerStaffView.tsx`.
- **Priority:** High.

### GAP 2: Seller Inventory Logs UI Pattern (UI Architectural Gap)
- **Module:** Seller Inventory (`/seller/inventory`)
- **Data Status:** `PhysicalBookDetails.inventoryLogs` and API `GET /books/:bookId/inventory-logs` are **100% complete and working**.
- **Gap:** `InventoryLogsModal.tsx` uses a modal popup (`createPortal` fixed overlay), violating Rule 1 & Rule 7 ("KHÔNG dùng modal cho History/Audit; History phải hiển thị IN-PAGE").
- **Required Action:** Refactor `InventoryLogsModal.tsx` into an In-Page Drawer or Expandable Table Row in `SellerInventoryView`.
- **Priority:** Medium.

### GAP 3: Product Metadata Change History (Architectural Clarification)
- **Module:** Products & Books (`/admin/books`, `/seller/products`)
- **Data Status:** Stock changes are fully tracked in `InventoryLog`. Metadata changes (title, price, category) update the row in-place without a historical snapshot table.
- **Decision:** As per Rule 1 & Hard Lock, **NO Prisma schema changes or table creation** in this phase. Product history is documented as **CURRENT STATE ONLY + INVENTORY MUTATION AUDIT**.

---

## 6. Authorization & Tenant Isolation Analysis

1. **Canonical RBAC (`business-service.Member`):**
   - Verified as the sole source of truth for Store Owner and Staff permissions (`DASHBOARD_VIEW`, `ORDER_VIEW`, `ORDER_PROCESS`, `PRODUCT_UPDATE`, `FINANCE_VIEW`, etc.).
   - `identity-service.User.role` is strictly used for Platform Admin (`PLATFORM_ADMIN`) and Account-level access.
2. **Tenant Isolation:**
   - All Seller endpoints enforce `getSellerScope(actor)` ensuring merchants can only query data belonging to their owned `storeId` or authorized `businessId`.
   - Admin audit queries enforce `JwtAuthGuard` + `RolesGuard` + `@Roles('PLATFORM_ADMIN')`.

---

## 7. Recommended Implementation Sequence (Phase 4.1 — Phase 4.4)

1. **Phase 4.1: Seller Staff Governance Audit Endpoint & UI Integration**
   - Expose `GET /api/v1/members/business/:businessId/audit-logs` in `business-service` with Seller Scope authorization.
   - Route via `api-gateway`.
   - Integrate `AuditHistoryTimeline` tab into `SellerStaffView.tsx`.
2. **Phase 4.2: Seller Inventory In-Page Drawer Refactoring**
   - Transition `InventoryLogsModal.tsx` from fixed popup to In-Page Drawer/Expandable Panel within `web/src/app/seller/inventory/page.tsx`.
3. **Phase 4.3: Admin Return Request & Appeal History Verification**
   - Ensure `AdminReturnRequestsView` and `AdminAppealsView` utilize `AuditHistoryTimeline` for arbitration logs.
4. **Phase 4.4: Quality Gates & Full Verification**
   - Execute `npm run typecheck`, `npm run build` (web 106/106 routes), `npm run build` (backend 8 services), and unit test suites.

---

## 8. Final Compliance Statement

- **Kafka added:** `0`
- **ClickHouse added:** `0`
- **Central Audit Service added:** `0`
- **Database merge:** `0`
- **Prisma migration executed:** `0`
- **RabbitMQ rewrite:** `0`
- **Mock/fake audit data:** `0`
- **Modal history anti-patterns identified for cleanup:** `1` (`InventoryLogsModal.tsx`)
- **Backend gaps cleanly isolated:** `1` (Seller Member Audit Query)
