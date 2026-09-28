# HUKI EBOOK — PHASE 2
# ADMIN & SELLER HISTORY + MANAGEMENT UI AUDIT REPORT

- **Project:** HUKI EBOOK Platform
- **Phase:** Phase 2 — Admin & Seller History + Management UI Standardization Audit
- **Mode:** READ-ONLY / NO CODE / NO REFACTOR
- **Architectural Constraints:** 100% Phase 0.1 & Phase 1 compliance (No new brokers, No Kafka in Phase 2, No ClickHouse, No separate Audit Service, No DB merging, Canonical RBAC locked on `business-service.Member`).
- **Date:** 2026-09-28
- **Status:** **DISCOVERY & AUDIT COMPLETE — SPECIFICATION LOCKED**

---

## 1. EXECUTIVE SUMMARY

Phase 1 established the backend Governance Audit Log foundation with isolated service databases, sanitized diffing, and locked action taxonomies. 

Phase 2 performs a deep, read-only audit of the entire Admin and Seller frontend codebase (`E:\HuKi\web`) to establish a unified UI standard before any frontend implementation begins.

### Key Discovery Findings
1. **Audit History Gap:** While some pages have rudimentary **Domain Logs** (e.g. `OrderStatusHistory`, `InventoryLog`, `WalletSecurityAuditLog`), **ZERO Admin or Seller pages currently display Governance Audit Logs** (WHO performed WHAT mutation on WHICH resource, actor role, before/after states, changed fields, IP, and Request Correlation ID).
2. **DataTable Inconsistencies:** The current [`DataTable.tsx`](file:///E:/HuKi/web/src/ui/components/common/DataTable.tsx) is a basic HTML table wrapper that **lacks nested grouped rows (Parent &rarr; Child hierarchy)**, row expansion/collapse, row multi-selection, and built-in pagination.
3. **No-Popup Architecture Progress:** Most critical views (`AdminBusinessesView`, `AdminDisputesView`, `SellerOrdersView`, `SellerStaffView`) have successfully adopted in-page collapsible panels (`useSmartFormCollapse`) or side drawers (`OrderDetailDrawer`), but still rely on Modals for complex workflows like `InventoryLogsModal` and `WithdrawalPinModal`.
4. **Pagination Inconsistencies:** While `AdminPagination` and `SellerPagination` default to 10 items/page, several sub-tables and API calls use inconsistent limits (5, 20, 50, 100) or omit pagination controls entirely on child tables.
5. **Financial Traceability Gap:** Financial pages (`AdminFinanceView`, `AdminEscrowView`, `SellerFinancePage`) do not display atomic before/after balances, actor identification for admin overrides, or ledger journal correlation references.

---

## 2. CURRENT ADMIN UI AUDIT

Admin views are located in [`web/src/app/admin/`](file:///E:/HuKi/web/src/app/admin/) and [`web/src/ui/components/admin/`](file:///E:/HuKi/web/src/ui/components/admin/).

| Admin View / Page | Route | Current Behavior | History Present? | Popup Violation? | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AdminBusinessesView** | `/admin/businesses` | Lists enterprises, 33-field profile preview, manual tax verification, Approve/Reject/Suspend actions. | ❌ None (No log of who approved/rejected/suspended) | ⚠️ Partial (Image preview modal) | `HIGH` |
| **AdminBusinessUpdateRequestsView** | `/admin/business-update-requests` | Reviews pending partner profile edits with requested data diff. | ❌ None (No review history table) | ✅ None (In-page collapse) | `MEDIUM` |
| **AdminAccountsView / AdminUsersView** | `/admin/accounts`, `/admin/users` | Lists users/customers, role filtering, lock/unlock toggle, customer creation. | ❌ None (No log of lock/unlock actor or role changes) | ⚠️ User modal on create | `HIGH` |
| **AdminBooksView / AdminBookModerationView** | `/admin/books`, `/admin/book-moderation` | Moderation queue for books, status update (Draft, Published, Suspended, Archived). | ❌ None (No status transition history) | ✅ None (In-page detail) | `MEDIUM` |
| **AdminFinanceView** | `/admin/finance` | Payout approval queue, EOD reconciliation runs, periodic publisher settlement. | ⚠️ Domain only (EOD Run stats, Outbox payload) | ✅ None (In-page review box) | `CRITICAL` |
| **AdminEscrowView** | `/admin/escrow` | Item-level escrow tracking (Holding, Frozen, Released, Refunded). | ⚠️ Domain only (Escrow status string) | ✅ None | `HIGH` |
| **AdminDisputesView** | `/admin/disputes` | Arbitrates buyer-seller disputes with ruling actions (`BUYER_WINS`, `SELLER_WINS`). | ⚠️ Domain only (Dispute notes) | ✅ None (In-page panel) | `CRITICAL` |
| **AdminReturnRequestsView** | `/admin/return-requests` | Return requests management and arbitration. | ⚠️ Domain only (Return status) | ✅ None | `HIGH` |
| **AdminVouchersView / AdminFlashSaleView** | `/admin/vouchers`, `/admin/flash-sales` | Global voucher & flash sale slot management. | ❌ None (No creation/mutation history) | ⚠️ Creation modals | `MEDIUM` |
| **AdminShippersView** | `/admin/shippers` | Delivery staff listing, status toggles, zone assignments. | ❌ None | ✅ None | `LOW` |

---

## 3. CURRENT SELLER UI AUDIT

Seller views are located in [`web/src/app/seller/`](file:///E:/HuKi/web/src/app/seller/) and [`web/src/ui/components/seller/`](file:///E:/HuKi/web/src/ui/components/seller/).

| Seller View / Page | Route | Current Behavior | History Present? | Popup Violation? | Priority |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **SellerOrdersView** | `/seller/orders` | Order management tabs, Ship/Cancel in-page actions, multi-order selection. | ❌ None in table | ✅ None | `HIGH` |
| **SellerOrderDetailPage** | `/seller/orders/[id]` | Full order detail, shipping address, buyer details, action boxes. | ⚠️ Domain only (`OrderStatusHistory` timeline) | ✅ None (Dedicated page) | `HIGH` |
| **SellerProductsView** | `/seller/products` | Catalog listing, format filtering, status toggles, stock visibility. | ❌ None | ✅ None | `MEDIUM` |
| **SellerInventoryPage** | `/seller/inventory` | Stock adjustments (Add, Subtract, Set), stock level badges. | ⚠️ Domain only (`InventoryLog` list) | ❌ VIOLATION (`InventoryLogsModal.tsx`) | `HIGH` |
| **SellerFinancePage / Wallet** | `/seller/finance`, `/seller/wallet` | Wallet balance overview, escrow countdowns, recent 5 transactions. | ⚠️ Domain only (5 transaction records) | ❌ VIOLATION (`WithdrawalPinModal.tsx` handles PIN & Payout) | `CRITICAL` |
| **SellerStaffView** | `/seller/staff` | Staff member management, role presets, granular permissions toggle, reset password. | ❌ None (No audit of who invited or changed permissions) | ✅ None (In-page collapse forms) | `CRITICAL` |
| **SellerVouchersView / Discounts** | `/seller/vouchers`, `/seller/promotions` | Store voucher creation and book-level discount management. | ❌ None | ⚠️ Modal on create | `MEDIUM` |
| **SellerAppealsView / Returns** | `/seller/appeals`, `/seller/returns` | Sanction appeals and buyer return review. | ⚠️ Domain only | ✅ None | `HIGH` |

---

## 4. HISTORY COVERAGE MATRIX

| Module / Resource | Sub-Module | Governance Audit Required? | Domain History Required? | UI Delivery Format Recommendation |
| :--- | :--- | :---: | :---: | :--- |
| **Admin - Doanh Nghiệp** | Business KYC & Approvals | YES (`APPROVE`, `REJECT`, `SUSPEND`) | Optional | **Tab "Lịch sử duyệt"** trong Business Detail View |
| **Admin - Doanh Nghiệp** | Profile Update Requests | YES (`APPROVE`, `REJECT`) | Optional | **In-Page Timeline** trong Update Request Detail |
| **Admin - Tài Khoản** | User Governance | YES (`BLOCK`, `UNBLOCK`, `ROLE_CHANGE`) | Optional | **Tab "Lịch sử quản trị"** trong User Detail Drawer |
| **Admin - Tài Chính** | Payout Review | YES (`PAYOUT_REVIEW`) | YES (`LedgerEntry`) | **Expandable Row + History Tab** trong `/admin/finance` |
| **Admin - Tài Chính** | Reconciliation Runs | YES (`RECONCILIATION_RUN`) | YES (`Discrepancies`) | **Dedicated Run History Page** `/admin/finance/reconciliation/runs/[id]` |
| **Admin - Trọng Tài** | Disputes & Returns | YES (`ARBITRATE`) | YES (`OrderStatusHistory`) | **Activity Timeline** bên trong Dispute Resolution Panel |
| **Admin - Catalog** | Book Moderation | YES (`APPROVE`, `REJECT`, `SUSPEND`) | Optional | **History Drawer** trên Catalog Moderation Table |
| **Admin - Ưu Đãi** | Vouchers & Flash Sales | YES (`CREATE`, `UPDATE`, `DELETE`) | Optional | **Tab "Lịch sử tác vụ"** trong Promotion Detail |
| **Seller - Đơn Hàng** | Order Processing | YES (`CONFIRM`, `SHIP`, `CANCEL`) | YES (`OrderStatusHistory`) | **Domain Timeline + Audit Meta Tooltip** tại Order Detail |
| **Seller - Sản Phẩm** | Product Lifecycle | YES (`CREATE`, `UPDATE`, `STATUS_CHANGE`) | Optional | **Tab "Lịch sử chỉnh sửa"** tại Edit Product View |
| **Seller - Kho Hàng** | Inventory Adjustments | YES (`ADJUST_INVENTORY`) | YES (`InventoryLog`) | **In-Page Expandable Row / Drawer** (Thay thế `InventoryLogsModal`) |
| **Seller - Ví & Payout** | Financial Withdrawals | YES (`PAYOUT_REQUEST`, `PIN_CHANGE`) | YES (`WalletTransaction`) | **Dedicated History Tab** "Lịch sử rút tiền" tại `/seller/finance` |
| **Seller - Nhân Viên** | Staff RBAC | YES (`INVITE`, `ROLE_CHANGE`, `PERMISSION_CHANGE`) | Optional | **Tab "Lịch sử phân quyền"** tại `/seller/staff` |
| **Seller - Khuyến Mãi** | Store Vouchers | YES (`CREATE`, `UPDATE`, `DELETE`) | Optional | **In-Page History Drawer** tại `/seller/vouchers` |

---

## 5. DATA TABLE GAP MATRIX

Detailed evaluation of the current shared [`DataTable.tsx`](file:///E:/HuKi/web/src/ui/components/common/DataTable.tsx) against system requirements:

| Capability | Current State | Expected Standard | Gap Severity |
| :--- | :--- | :--- | :--- |
| **Reusable Across Views** | ✅ Supported | Single unified component for all tables | None |
| **Expandable Row (`expandableRowRender`)** | ❌ Missing | Row expands inline with chevron icon to show sub-details without popup | `CRITICAL` |
| **Grouped Table (Parent &rarr; Child)** | ❌ Missing | Master Order &rarr; Sub-Orders hierarchy with indented child rows | `CRITICAL` |
| **Horizontal Scroll** | ✅ Basic (`overflow-x-auto`) | Structured horizontal scroll with sticky key columns (ID, Actions) | `MEDIUM` |
| **Loading / Empty / Error State** | ⚠️ Partial (Loading + Empty only) | Explicit Retry Error State with error messages and action triggers | `HIGH` |
| **Built-in Pagination** | ❌ None (Separated) | Integrated bottom pagination bar locked at 10 items/page | `HIGH` |
| **Row Selection (Checkboxes)** | ❌ None | Checkbox per row + Header "Select All" with counter | `HIGH` |
| **Bulk Actions Bar** | ❌ None | Floating or top toolbar appearing on row selection | `HIGH` |
| **Column Sorting** | ❌ None | Clickable column headers with sort indicator (`asc`/`desc`) | `MEDIUM` |

---

## 6. PAGINATION INCONSISTENCIES

### Locked Rule
**Every management table across HUKI Admin and Seller must enforce 10 items per page.**
If total items &le; 10, Page 1 **MUST STILL BE VISIBLE** with disabled navigation buttons.

### Audit Findings
1. [`SellerFinancePage.tsx`](file:///E:/HuKi/web/src/app/seller/finance/page.tsx#L107): Hardcoded `limit: 5` without pagination component. &rarr; **Violates standard.**
2. [`SellerInventoryPage.tsx`](file:///E:/HuKi/web/src/app/seller/inventory/page.tsx#L88): Requests `limit: 100` and performs client-side slicing without persistent pagination props.
3. [`AdminBusinessesView.tsx`](file:///E:/HuKi/web/src/ui/components/admin/AdminBusinessesView.tsx#L1044): Uses 10 items/page, but child update request lists default to 50 or 100.
4. [`DataTable.tsx`](file:///E:/HuKi/web/src/ui/components/common/DataTable.tsx): Lacks embedded pagination entirely, leaving individual pages to implement their own ad-hoc pagination UI.

---

## 7. FILTER & SEARCH GAPS

| Page / View | Search Input | Status Filter | Date Range | Actor / Role Filter | Store Filter | Amount Range | Reset Button |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Admin Businesses** | ✅ Name/Tax/Email | ✅ Tabs | ❌ Missing | ❌ Missing | N/A | N/A | ❌ Missing |
| **Admin Accounts/Users** | ✅ Name/Email/Phone | ⚠️ Role only | ❌ Missing | ❌ Missing | ❌ Missing | N/A | ❌ Missing |
| **Admin Finance (Payouts)** | ⚠️ Keyword only | ✅ Tabs | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing |
| **Admin Escrow** | ⚠️ Order Code | ✅ Tabs | ❌ Missing | ❌ Missing | ⚠️ Store Dropdown | ❌ Missing | ❌ Missing |
| **Admin Disputes** | ⚠️ Text Search | ✅ Tabs | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing | ❌ Missing |
| **Seller Orders** | ✅ Code/Buyer/Book | ✅ Tabs | ❌ Missing | ❌ Missing | N/A | ❌ Missing | ❌ Missing |
| **Seller Products** | ✅ Title/ISBN | ⚠️ Format only | ❌ Missing | ❌ Missing | N/A | ❌ Missing | ❌ Missing |
| **Seller Inventory** | ✅ Title/ISBN | ⚠️ Stock level | ❌ Missing | ❌ Missing | N/A | N/A | ❌ Missing |
| **Seller Staff** | ✅ Name/Email | ⚠️ Status only | ❌ Missing | ❌ Missing | N/A | N/A | ❌ Missing |

---

## 8. BULK ACTION OPPORTUNITIES

| View / Module | Candidate Operation | Recommended Bulk Action | Business Justification |
| :--- | :--- | :--- | :--- |
| **Seller Orders** | Order Confirmation | `[Xác nhận hàng loạt]` | High volume physical book orders awaiting packing confirmation. |
| **Seller Orders** | Ready to Ship | `[Bàn giao vận chuyển hàng loạt]` | Bulk assignment of carrier and batch dispatch. |
| **Seller Products** | Status Toggle | `[Tạm ngưng bán]` / `[Kích hoạt bán]` | Batch inventory activation/deactivation during promotions or stockout. |
| **Admin Accounts** | User Moderation | `[Khóa tài khoản hàng loạt]` | Spam wave or malicious registration suppression. |
| **Admin Book Moderation** | Catalog Approval | `[Duyệt sách hàng loạt]` | Trusted publisher batches where individual manual review is cleared. |

---

## 9. FINANCIAL HISTORY GAPS

### Strict Financial Display Standard
Financial audit logs and ledger transactions must **NEVER** aggregate distinct financial concepts into a single column. Every financial ledger view must display:
1. **Amount** (`VND` formatted)
2. **Transaction Type** (`PAYOUT`, `ESCROW_RELEASE`, `ESCROW_FREEZE`, `REFUND`, `COMMISSION_FEE`)
3. **Status** (`PENDING`, `COMPLETED`, `FAILED`, `CANCELLED`)
4. **Actor** (`Actor ID` + `Actor Role`)
5. **Timestamp** (`DD/MM/YYYY HH:mm:ss`)
6. **Reference Code** (`Order Code`, `Payout Reference`, `Bank Transaction Ref`)
7. **Before Balance** & **After Balance**
8. **Rejection / Failure Reason** (if applicable)

### Gaps in Current Financial UI
1. **Seller Wallet View:** Lacks Before/After balance columns. Transactions only show net amount without ledger breakdown.
2. **Admin Payout Queue:** Bank Account numbers are masked in UI, but the reviewer's IP and Request Correlation ID are hidden from the reviewer.
3. **Escrow Management:** The countdown timer is shown, but the exact ledger journal entry ID linked to the escrow reservation is not accessible.

---

## 10. LABEL & ACTION CONSISTENCY

| Current UI Text | Inconsistency Found | Standardized Governance Label | Standard Action Type |
| :--- | :--- | :--- | :--- |
| `Phê duyệt hồ sơ này` / `Duyệt` | Inconsistent phrasing across admin | **`[Phê Duyệt]`** | `APPROVE` |
| `Từ chối` / `Xác nhận từ chối` / `Bác bỏ` | Inconsistent phrasing | **`[Từ Chối]`** | `REJECT` |
| `Tạm ngưng` / `Tạm khóa` / `Khóa` | Conflation between suspend and permanent block | **`[Tạm Ngưng]`** (temp) / **`[Khóa Tài Khoản]`** (block) | `SUSPEND` / `BLOCK` |
| `Mở khóa` / `Bỏ chặn` | Inconsistent wording | **`[Mở Khóa]`** | `UNBLOCK` / `UNSUSPEND` |
| `Xác nhận đơn` / `Nhận đơn` | Inconsistent seller order action | **`[Xác Nhận Đơn]`** | `CONFIRM` |
| `Bàn giao ĐVVC` / `Giao hàng` / `Ship` | Mixed English and Vietnamese | **`[Giao Cho ĐVVC]`** | `SHIP` |
| `Hủy đơn` / `Hủy đơn hàng` | Inconsistent cancellation | **`[Hủy Đơn Hàng]`** | `CANCEL` |
| `Phán quyết` / `Trọng tài` | Mixed dispute terminology | **`[Phán Quyết Trọng Tài]`** | `ARBITRATE` |

---

## 11. ROUTER & PAGE BOUNDARY SPECIFICATION

| Domain | Entity | List Page Route | Detail Page Route | In-Page Tab / Drawer / Panel |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Business | `/admin/businesses` | In-Page Detail + Tab | Tabs: `[Hồ Sơ Doanh Nghiệp]`, `[Gian Hàng Liên Kết]`, `[Lịch Sử Quản Trị]` |
| **Admin** | Business Update | `/admin/business-update-requests` | In-Page Collapse | Comparison Diff View |
| **Admin** | Users / Accounts | `/admin/accounts` | Drawer (`UserDetailDrawer`) | Tabs: `[Thông Tin]`, `[Đơn Hàng]`, `[Lịch Sử Thao Tác]` |
| **Admin** | Finance Payouts | `/admin/finance` | In-Page Review Panel | Sub-Tabs: `[Yêu Cầu Rút Tiền]`, `[Đối Soát EOD]`, `[Lịch Sử Quyết Toán]` |
| **Admin** | EOD Runs | `/admin/finance` | `/admin/finance/reconciliation/[id]` | Full diagnostic breakdown |
| **Admin** | Disputes | `/admin/disputes` | In-Page Resolution Panel | Timeline: Buyer Evidence &rarr; Seller Defense &rarr; Admin Ruling |
| **Seller** | Orders | `/seller/orders` | `/seller/orders/[id]` | Tabs: `[Chi Tiết Đơn Hàng]`, `[Lịch Sử Trạng Thái]`, `[Nhật Ký Tác Vụ]` |
| **Seller** | Products | `/seller/products` | `/seller/product/[id]` | Tabs: `[Thông Tin Sách]`, `[Kho & Tồn Kho]`, `[Lịch Sử Cập Nhật]` |
| **Seller** | Inventory | `/seller/inventory` | In-Page Drawer | Stock Adjustment Form + `InventoryLog` Table |
| **Seller** | Staff | `/seller/staff` | In-Page Drawer | Member Permissions Matrix + `AuditLog` Timeline |
| **Seller** | Finance | `/seller/finance` | In-Page Section | Tabs: `[Tổng Quan Ví]`, `[Giao Dịch Ví]`, `[Lịch Sử Yêu Cầu Rút]` |

---

## 12. POPUP / MODAL VIOLATIONS

| Finding ID | Component File | Current Violation Behavior | Expected Compliant Behavior | Priority |
| :--- | :--- | :--- | :--- | :--- |
| **MODAL-01** | [`InventoryLogsModal.tsx`](file:///E:/HuKi/web/src/ui/components/seller/InventoryLogsModal.tsx) | Opens a large modal window to render historical inventory adjustments. | Replace with **In-Page Slide-Over Drawer** or **Expandable Row** in `SellerInventoryPage`. | `HIGH` |
| **MODAL-02** | [`WithdrawalPinModal.tsx`](file:///E:/HuKi/web/src/ui/components/seller/WithdrawalPinModal.tsx) | Handles complete withdrawal request, 2FA challenge, bank selection, and PIN verification in a multi-step popup. | Keep PIN entry as a **lightweight Confirmation Modal**, but move Payout Request history and form to **dedicated In-Page Section**. | `HIGH` |
| **MODAL-03** | [`AdminBusinessesView.tsx`](file:///E:/HuKi/web/src/ui/components/admin/AdminBusinessesView.tsx#L811) | Image preview uses fixed full-screen modal. | Replace with **In-Page Document Viewer Drawer**. | `LOW` |

---

## 13. GOVERNANCE AUDIT VS DOMAIN HISTORY MAPPING

The frontend must clearly distinguish and consume data from three distinct history layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       HUKI FRONTEND UI HISTORY LAYERS                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
     ┌─────────────────────────────────┼────────────────────────────────┐
     ▼                                 ▼                                ▼
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│ A. GOVERNANCE AUDIT     │  │ B. DOMAIN HISTORY       │  │ C. USER ACTIVITY        │
├─────────────────────────┤  ├─────────────────────────┤  ├─────────────────────────┤
│ • Table: audit_logs     │  │ • OrderStatusHistory    │  │ • User notifications    │
│ • Source: AuditService  │  │ • InventoryLog          │  │ • Buyer tracking bar    │
│ • Actor: Admin / Staff  │  │ • WalletSecurityAuditLog│  │ • Delivery progress     │
│ • Data: Who, What, When,│  │ • LedgerTransaction     │  │ • Simple readable text  │
│   IP, RequestID, Diff   │  │ • Business specific     │  │   for non-technical end │
│ • Target: Admin/Owner   │  │ • Target: Workflows     │  │   users                 │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

### UI Mapping Rules
1. **Admin Governance Tabs** (`/admin/businesses`, `/admin/accounts`, `/admin/finance`): Read from **`AuditLog`** endpoints.
2. **Seller Management Tabs** (`/seller/staff`, `/seller/products`): Read from **`AuditLog`** endpoints filtered by `storeId`.
3. **Workflow Timelines** (Order delivery timeline, stock movements): Read from **`OrderStatusHistory`** and **`InventoryLog`**.

---

## 14. REQUIRED COMPONENTS TO BUILD IN IMPLEMENTATION

1. **`GroupedDataTable<T>`** (`web/src/ui/components/common/GroupedDataTable.tsx`):
   - Replaces basic table with support for expandable rows (`expandableRowRender`).
   - Supports parent-child hierarchies (e.g., Parent Order &rarr; Seller Orders).
   - Built-in horizontal scroll with sticky key columns.
   - Built-in multi-selection checkboxes and top Bulk Action toolbar.
   - Locked 10 items/page pagination.
2. **`AuditHistoryTab` / `AuditHistoryTimeline`** (`web/src/ui/components/common/AuditHistoryTimeline.tsx`):
   - Standard reusable viewer for `AuditLog` records.
   - Displays Actor ID, Actor Role badge, Action badge, Resource, Timestamp, IP, Request ID.
   - Expandable diff view showing Before/After sanitized JSON and highlighted `changedFields`.
3. **`FinancialTransactionTable`** (`web/src/ui/components/common/FinancialTransactionTable.tsx`):
   - Dedicated table for wallet/ledger history with separated columns (Amount, Type, Status, Reference, Actor, Before Balance, After Balance, Reason).

---

## 15. REQUIRED API GAPS (BACKEND ENDPOINTS FOR AUDIT QUERIES)

To allow the frontend to display audit logs without breaking service boundaries, each microservice requires read-only audit query endpoints:

| Service | Required Query Endpoint | Query Parameters | Authorization |
| :--- | :--- | :--- | :--- |
| **identity-service** | `GET /api/v1/admin/audit-logs` | `actorId`, `resource`, `resourceId`, `page`, `limit` | `PLATFORM_ADMIN` |
| **business-service** | `GET /api/v1/businesses/:id/audit-logs` | `module`, `action`, `page`, `limit` | `OWNER`, `PLATFORM_ADMIN` |
| **commerce-service** | `GET /api/v1/seller/audit-logs` | `storeId`, `module`, `action`, `resourceId`, `page`, `limit` | `OWNER`, `MANAGER`, `PLATFORM_ADMIN` |
| **commerce-service** | `GET /api/v1/admin/audit-logs` | `module`, `action`, `resource`, `page`, `limit` | `PLATFORM_ADMIN` |

---

## 16. RECOMMENDED IMPLEMENTATION ROADMAP

1. **Step 1 — Common Component Foundation:**
   - Implement `GroupedDataTable` with expandable rows, multi-selection, and locked 10-item pagination.
   - Implement `AuditHistoryTimeline` for rendering before/after diffs and correlation metadata.
2. **Step 2 — Admin Governance UI:**
   - Add "Lịch sử duyệt" tab to `AdminBusinessesView`.
   - Add "Lịch sử thao tác" tab to `AdminAccountsView`.
   - Standardize `AdminFinanceView` (payout review audit & expandable EOD discrepancies).
   - Add dispute audit timeline to `AdminDisputesView`.
3. **Step 3 — Seller Management UI:**
   - Add "Lịch sử phân quyền" to `SellerStaffView`.
   - Replace `InventoryLogsModal` with In-Page Drawer in `SellerInventoryPage`.
   - Refactor `SellerFinancePage` transactions table with 10-item pagination and before/after balances.
   - Add audit info to `SellerOrderDetailPage`.
4. **Step 4 — Read-Only Audit API Gateways:**
   - Expose read-only audit query endpoints in respective services.
5. **Step 5 — Verification & End-to-End Testing:**
   - Verify zero popup violations, locked pagination, and proper diff rendering.

---

## 17. RISKS & MITIGATIONS

| Risk | Description | Mitigation Strategy |
| :--- | :--- | :--- |
| **Performance on Large Diffs** | Large state diffs (e.g. 33-field business profile) might slow down rendering. | Render collapsed summary by default (`changedFields` pills) and expand full JSON diff only on click. |
| **UI Table Clutter** | Displaying all 15 audit fields in a single flat row causes severe horizontal overflow. | Use primary columns (`Timestamp`, `Actor`, `Role`, `Action`, `Resource`) with an expandable drawer for IP, Request ID, and JSON Diffs. |
| **Permission Leaks** | Seller staff viewing audit logs belonging to another store. | Enforce strict `storeId` validation on all audit query endpoints via `JwtAuthGuard` and `MemberRole` checks. |

---

## 18. FILES REQUIRING MODIFICATION UPON IMPLEMENTATION

### New Files to Create:
1. `web/src/ui/components/common/GroupedDataTable.tsx`
2. `web/src/ui/components/common/AuditHistoryTimeline.tsx`
3. `web/src/ui/components/common/FinancialTransactionTable.tsx`
4. `web/src/ui/api/auditApi.ts`

### Existing Files to Modify:
1. `web/src/ui/components/common/DataTable.tsx`
2. `web/src/ui/components/admin/AdminBusinessesView.tsx`
3. `web/src/ui/components/admin/AdminAccountsView.tsx`
4. `web/src/ui/components/admin/AdminFinanceView.tsx`
5. `web/src/ui/components/admin/AdminDisputesView.tsx`
6. `web/src/ui/components/admin/AdminEscrowView.tsx`
7. `web/src/ui/components/seller/SellerStaffView.tsx`
8. `web/src/ui/components/seller/SellerOrdersView.tsx`
9. `web/src/app/seller/orders/[id]/page.tsx`
10. `web/src/app/seller/inventory/page.tsx`
11. `web/src/app/seller/finance/page.tsx`
12. `web/src/ui/components/seller/SellerUI.tsx`
13. `web/src/ui/components/admin/AdminUI.tsx`

---

**Report Saved At:** `res/audit-log/PHASE-2-UI-AUDIT-REPORT.md`  
**Execution Conclusion:** Read-only audit complete. No source code was altered. Ready for planning review.
