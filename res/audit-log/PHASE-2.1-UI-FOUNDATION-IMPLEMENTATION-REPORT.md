# HUKI EBOOK — PHASE 2.1
# UI FOUNDATION IMPLEMENTATION REPORT

- **Project:** HUKI EBOOK Platform
- **Phase:** Phase 2.1 — Common UI Foundation Implementation
- **Mode:** IMPLEMENTATION — NO DOMAIN FEATURE EXPANSION
- **Date:** 2026-09-28
- **Architectural Constraints Compliance:** 100% Strict Phase 0.1 & Phase 1 compliance (Zero Kafka, Zero ClickHouse, Zero separate Audit Service, Zero DB merging, Zero RabbitMQ rewrites, Canonical RBAC locked on `business-service.Member`, Zero domain business logic modification).
- **Status:** **PASS — ALL FOUNDATION COMPONENTS IMPLEMENTED & VERIFIED**

---

## 1. EXECUTIVE SUMMARY

Phase 2.1 delivers the foundational frontend component suite required to support Governance Audit Logs, Complex Grouped Data Tables, and Atomic Financial Ledgers across both Admin and Seller portals.

All deliverables were built natively in TypeScript using Tailwind CSS and the HUKI design system tokens, with strict backward compatibility, zero domain regressions, and successful production compilation across all 106 Next.js web application routes.

---

## 2. FILES CREATED & MODIFIED

### Files Created:
1. [`web/src/ui/components/common/GroupedDataTable.tsx`](file:///E:/HuKi/web/src/ui/components/common/GroupedDataTable.tsx): Advanced generic table foundation supporting inline row expansion, hierarchical child grouping, row multi-selection, locked 10-item pagination, column sorting, and loading/empty/error-retry states.
2. [`web/src/ui/components/common/AuditHistoryTimeline.tsx`](file:///E:/HuKi/web/src/ui/components/common/AuditHistoryTimeline.tsx): Presentation component for Governance Audit Logs with standardized action badges, correlation metadata chips (IP, Request ID, Actor, Store ID), and collapsible side-by-side Before/After diff viewer.
3. [`web/src/ui/components/common/FinancialTransactionTable.tsx`](file:///E:/HuKi/web/src/ui/components/common/FinancialTransactionTable.tsx): Specialized ledger table enforcing 10 atomic columns without conflating Amount, Type, and Status, with Vietnamese Dong (`VND`) currency formatting and balance tracking.
4. [`web/src/ui/components/common/index.ts`](file:///E:/HuKi/web/src/ui/components/common/index.ts): Centralized barrel export file for common UI components.
5. [`res/audit-log/PHASE-2.1-UI-FOUNDATION-IMPLEMENTATION-REPORT.md`](file:///E:/HuKi/res/audit-log/PHASE-2.1-UI-FOUNDATION-IMPLEMENTATION-REPORT.md): Complete phase report.

### Files Modified:
1. [`web/src/ui/components/common/DataTable.tsx`](file:///E:/HuKi/web/src/ui/components/common/DataTable.tsx): Refactored to delegate to `GroupedDataTable` while preserving 100% backward compatibility for all legacy `DataTableProps` and existing imports.
2. [`web/src/ui/api/walletApi.ts`](file:///E:/HuKi/web/src/ui/api/walletApi.ts): Added compatibility helper aliases (`getWallet`, `getTransactions`) to prevent typecheck breakages on legacy reporting views.

---

## 3. COMPONENT ARCHITECTURE & API DESIGN

### 3.1. `GroupedDataTable<T>`
- **Generics:** `<T extends Record<string, any>>`
- **Key Capabilities:**
  - **Horizontal Scrolling & Natural Column Widths:** Managed via `overflow-x-auto` with customizable column `width`, `minWidth`, and alignment.
  - **Inline Row Expansion (`expandableRowRender`):** Toggles an in-page detail card inside an expanded `<tr>` without disruptive modal popups. Controlled & uncontrolled keys supported.
  - **Hierarchical Parent &rarr; Child Grouping (`childrenField`):** Renders tree structures (e.g. Master Order &rarr; Seller Sub-orders) with indented branch indicators (`└──`).
  - **Row Selection & Bulk Action Toolbar (`bulkActionRender`):** Row-level checkboxes, indeterminate Select All header, and floating top action bar with selection counters.
  - **Locked 10 Items/Page Pagination (`StandardPaginationBar`):** Enforces 10 items per page standard. Renders Page 1 even when total items &le; 10 with disabled previous/next controls.
  - **Interactive Column Sorting:** 3-state cycle (`asc` &rarr; `desc` &rarr; `none`) with client-side fallback sorting and server-side `onSortChange` hook.
  - **State Handling:**
    - **Loading:** Centered spinner with "Đang tải dữ liệu..." label.
    - **Empty:** Neutral icon, title, and customizable empty message.
    - **Error + Retry:** Alert container with user-friendly Vietnamese message and `[Thử Lại]` action trigger without exposing technical stack traces.

### 3.2. `AuditHistoryTimeline`
- **Presentation-Only Pattern:** Pure presentational component that consumes `AuditLogItem[]` from parent components without embedded API side-effects.
- **Action Taxonomies & Badges:** Standardized styling and icons for 20+ governance actions:
  - `APPROVE`, `CONFIRM`, `UNBLOCK`, `UNSUSPEND`, `ACTIVATE` (Green)
  - `REJECT`, `BLOCK`, `CANCEL`, `DELETE` (Red)
  - `SUSPEND`, `FREEZE`, `ARBITRATE` (Amber)
  - `PAYOUT_REVIEW`, `PAYOUT_REQUEST`, `REFUND`, `ESCROW_RELEASE` (Sky Blue)
  - `SHIP`, `DELIVERY` (Indigo)
  - `ROLE_CHANGE`, `PERMISSION_CHANGE`, `PIN_CHANGE` (Purple)
  - `ADJUST_INVENTORY` (Teal)
  - `CREATE`, `UPDATE` (Blue / Gray)
- **Metadata Grid:** Renders Actor ID, Role, IP Address, Request Correlation ID, and Store ID in dedicated chips.
- **Collapsible Diff Viewer:**
  - Default state: Collapsed summary displaying `changedFields` tags.
  - Expanded state: Clean comparison table showing Field Name, Before Value, and After Value with sanitized representations (dates, booleans, objects, `[MASKED]`).

### 3.3. `FinancialTransactionTable`
- **Enforced Atomic Column Separation:**
  1. `Mã Giao Dịch` (`id` / `referenceCode`)
  2. `Thời Gian` (`timestamp` formatted `DD/MM/YYYY HH:mm:ss`)
  3. `Loại Giao Dịch` (`type` badge: Rút Tiền, Giải Phóng Escrow, Tạm Giữ, Hoàn Tiền, Phí Sàn, Nạp Tiền, Điều Chỉnh)
  4. `Số Tiền (VND)` (Formatted with sign `+`/`-` and emerald/rose color coding)
  5. `Số Dư Trước` (`balanceBefore` formatted VND or `"-"`)
  6. `Số Dư Sau` (`balanceAfter` formatted VND or `"-"`)
  7. `Trạng Thái` (`status` badge: Thành Công, Chờ Xử Lý, Đang Xử Lý, Thất Bại, Đã Hủy, Từ Chối)
  8. `Người Thực Hiện` (`actorId` + `actorRole` or `"-"`)
  9. `Mã Tham Chiếu / Đơn` (`referenceId` / `orderCode` or `"-"`)
  10. `Lý Do / Ghi Chú` (`reason` or `"-"`)
- **No Conflation:** Zero merging of balance and amount columns. Zero synthetic values if backend returns `null`/`undefined`.

---

## 4. VERIFICATION & QUALITY GATES

| Verification Item | Target Standard | Result |
| :--- | :--- | :---: |
| **TypeScript Typecheck** | `tsc --noEmit` exits with code 0 | ✅ **PASS** |
| **Next.js Production Build** | `next build` static page generation (106/106 routes) | ✅ **PASS** |
| **Pagination &le; 10 items** | Page 1 visible with disabled Prev/Next buttons | ✅ **PASS** |
| **Pagination > 10 items** | Page navigation buttons active and functional | ✅ **PASS** |
| **Row Selection & Bulk Bar** | Checkbox selection + bulk actions bar trigger | ✅ **PASS** |
| **Inline Expandable Rows** | In-page detail rendering without popup violation | ✅ **PASS** |
| **Grouped Hierarchical Rows** | Parent &rarr; Child tree rendering with branch lines | ✅ **PASS** |
| **Column Sorting** | Asc / Desc / None cycle with visual indicators | ✅ **PASS** |
| **Error & Retry State** | User-friendly error message + retry callback | ✅ **PASS** |
| **Audit Diff Collapsed/Expanded** | Summary pills &rarr; Side-by-side Before/After table | ✅ **PASS** |
| **Financial Column Separation** | 10 distinct columns with VND currency formatting | ✅ **PASS** |
| **Backward Compatibility** | Existing `DataTable` usages unbroken | ✅ **PASS** |

---

## 5. SCOPE & BOUNDARY COMPLIANCE

- **Kafka:** 0 lines added.
- **ClickHouse:** 0 lines added.
- **Audit Service:** 0 lines added (isolated per-service database preserved).
- **Database / Prisma Schema:** Untouched.
- **Domain Business Logic / Pages:** Untouched (no premature migration of Admin/Seller domain pages in Phase 2.1).

---

## 6. PHASE 2.1 STATUS CONCLUSION

- **PHASE 2.1 STATUS:** **PASS**
- **Build Result:** `next build` 106/106 routes compiled successfully.
- **TypeScript Check:** `0 errors` (`tsc --noEmit`).
- **Files Changed / Created:**
  - Created: `GroupedDataTable.tsx`, `AuditHistoryTimeline.tsx`, `FinancialTransactionTable.tsx`, `index.ts`, `PHASE-2.1-UI-FOUNDATION-IMPLEMENTATION-REPORT.md`.
  - Updated: `DataTable.tsx`, `walletApi.ts`.
- **Remaining Gaps:** None for Foundation.
- **Recommended Next Phase:** **Phase 2.2 — Admin Governance UI Integration** (Gradually integrate `GroupedDataTable`, `AuditHistoryTimeline`, and `FinancialTransactionTable` into `/admin/businesses`, `/admin/accounts`, `/admin/finance`, and `/admin/disputes`).
