# PHASE 2.2 — ADMIN GOVERNANCE UI INTEGRATION REPORT

**Repository:** HUKI EBOOK  
**Scope:** Admin Governance UI Integration (Admin Only)  
**Execution Mode:** Implementation — Admin Only / No Seller / No Backend Rewrite  
**Date:** 2026-09-28  

---

## 1. EXECUTIVE SUMMARY

Phase 2.2 đã hoàn thành việc tích hợp các UI Foundation components từ Phase 2.1 (`GroupedDataTable`, `AuditHistoryTimeline`, và bảng tài chính nguyên tử) vào 4 module quản trị Admin cốt lõi:
1. `/admin/businesses` (Quản lý hồ sơ doanh nghiệp & gian hàng)
2. `/admin/accounts` & `/admin/users` (Quản trị tài khoản & độc giả)
3. `/admin/finance` (Quản trị tài chính, rút tiền, đối soát EOD & quyết toán)
4. `/admin/disputes` (Xử lý khiếu nại & phán quyết trọng tài)

Tất cả các trang đã tuân thủ triệt để:
- **Zero Popup cho History:** Lịch sử quản trị (Audit History) và Domain Timeline được hiển thị in-page inspector/sub-tabs, không dùng popup modal.
- **Phân tách rạch ròi 2 lớp:** Phân biệt rõ Domain History (tiến trình nghiệp vụ đơn/dispute/business) và Governance Audit History (Ai làm gì vào thời điểm nào trên resource nào).
- **Pagination Standard:** Khóa chuẩn 10 items/page, luôn hiển thị thanh phân trang.
- **Financial Column Standard:** Tách riêng 10 trường tài chính nguyên tử, không gộp Amount/Type/Balance.
- **Zero Mock / Fake Data:** Không chế tạo dữ liệu kiểm toán giả. Dữ liệu thực tế được kết nối, khi thiếu API query kiểm toán thì hiển thị empty state trung thực và báo cáo gap.

---

## 2. FILES CHANGED & CREATED

### Files Created
- `res/audit-log/PHASE-2.2-ADMIN-GOVERNANCE-IMPLEMENTATION-REPORT.md` (Báo cáo tổng kết Phase 2.2)

### Files Modified
1. `web/src/ui/components/admin/AdminBusinessesView.tsx`
   - Thay thế table tự tạo bằng `GroupedDataTable<any>`.
   - Chuẩn hóa pagination `pageSize: 10`.
   - Xây dựng in-page Inspector với 3 tab: `[Hồ Sơ Doanh Nghiệp]`, `[Gian Hàng Liên Kết]`, `[Lịch Sử Quản Trị]`.
   - Tích hợp `AuditHistoryTimeline` hiển thị các mutation `APPROVE`, `REJECT`, `SUSPEND`, `UNSUSPEND`, `UPDATE`.
   - Chuẩn hóa terminology: `[Phê Duyệt]`, `[Từ Chối]`, `[Tạm Ngưng]`, `[Kích Hoạt Lại]`.

2. `web/src/ui/components/admin/AdminAccountsView.tsx`
   - Thay thế table cũ bằng `GroupedDataTable<any>`.
   - Chuẩn hóa pagination `pageSize: 10`.
   - Tạo in-page Inspector với 2 sub-tab: `[Thông Tin Tài Khoản]` và `[Lịch Sử Thao Tác]`.
   - Tích hợp `AuditHistoryTimeline` cho các thao tác quản trị tài khoản (`BLOCK`, `UNBLOCK`, `ROLE_CHANGE`, `UPDATE`).
   - Chuẩn hóa terminology: `[Khóa Tài Khoản]`, `[Mở Khóa]`.

3. `web/src/ui/components/admin/AdminUsersView.tsx`
   - Thay thế table cũ bằng `GroupedDataTable<AdminUser>`.
   - Chuẩn hóa pagination `pageSize: 10`.
   - Tích hợp in-page Inspector với sub-tab `[Lịch Sử Thao Tác]` sử dụng `AuditHistoryTimeline`.

4. `web/src/ui/components/admin/AdminFinanceView.tsx`
   - Tái cấu trúc 3 tab chính: `[Yêu Cầu Rút Tiền]`, `[Đối Soát EOD]`, `[Lịch Sử Quyết Toán]`.
   - Tích hợp `GroupedDataTable` với locked pagination 10 items/page cho cả 3 bảng.
   - Tách biệt rõ 10 cột tài chính nguyên tử: Mã giao dịch, Thời gian, Loại giao dịch, Số tiền, Số dư trước, Số dư sau, Trạng thái, Người thực hiện, Mã tham chiếu, Ghi chú.
   - Không gộp Amount + Type hay Before + After.

5. `web/src/ui/components/admin/AdminDisputesView.tsx`
   - Thay thế table bằng `GroupedDataTable<DisputeItem>` với pagination 10 items/page.
   - Bỏ toàn bộ popup/modal xem lịch sử.
   - Resolution panel tích hợp 3 sub-tab in-page:
     1. `[Chứng Cứ & Thẩm Định]`
     2. `[Tiến Trình Đơn Hàng (Domain)]` (Order Status History & Dispute Timeline)
     3. `[Lịch Sử Trọng Tài & Quản Trị]` (Tích hợp `AuditHistoryTimeline` cho action `ARBITRATE`)

---

## 3. ROUTES CHANGED

| Route | View Component | Status |
|---|---|---|
| `/admin/businesses` | `AdminBusinessesView.tsx` | INTEGRATED & VERIFIED |
| `/admin/accounts` | `AdminAccountsView.tsx` | INTEGRATED & VERIFIED |
| `/admin/users` | `AdminUsersView.tsx` | INTEGRATED & VERIFIED |
| `/admin/finance` | `AdminFinanceView.tsx` | INTEGRATED & VERIFIED |
| `/admin/disputes` | `AdminDisputesView.tsx` | INTEGRATED & VERIFIED |

---

## 4. COMPONENTS INTEGRATED

- `web/src/ui/components/common/GroupedDataTable.tsx`: Dùng làm chuẩn bảng dữ liệu cho tất cả 4 màn hình Admin với sorting, filter, responsive table scroll và fixed 10 items pagination.
- `web/src/ui/components/common/AuditHistoryTimeline.tsx`: Dùng hiển thị Governance Audit Logs trong Inspector panels/tabs của Doanh nghiệp, Tài khoản, và Khiếu nại.
- `web/src/ui/components/common/FinancialTransactionTable.tsx`: Foundation đối chiếu cho bảng đối soát và giao dịch tài chính.

---

## 5. AUDIT SOURCES VS DOMAIN HISTORY SOURCES

| Module | Governance Audit Source (WHO did WHAT on WHICH) | Domain History Source (Business State Transition) |
|---|---|---|
| **Admin Businesses** | `AuditHistoryTimeline` (`action`: APPROVE / REJECT / SUSPEND / UNSUSPEND, `actorId`, `role`, `changedFields`, `stateBefore`/`After`) | `business.stores[]`, `business.status`, `createdAt`, `updatedAt` |
| **Admin Accounts / Users** | `AuditHistoryTimeline` (`action`: BLOCK / UNBLOCK / ROLE_CHANGE / UPDATE, `actorId`, `role`) | `user.sessions[]`, `user.deviceCount`, `user.registeredAt`, `user.lastLoginAt` |
| **Admin Finance** | `AuditLog` correlation trên `reconciliation_batch` / `payout_batch` (action: APPROVE_PAYOUT, RECONCILE_EOD) | `payout.status`, `eod.variance`, `eod.completedAt`, `eod.ordersReconciled` |
| **Admin Disputes** | `AuditHistoryTimeline` (`action`: ARBITRATE, `actorId`: admin_id, `role`: ADMIN, `notes`: resolution reason) | `dispute.timeline[]`, `order.statusHistory[]`, `dispute.buyerEvidence`, `dispute.sellerDefense` |

---

## 6. FINANCIAL ATOMIC FIELDS INTEGRATION

Trong `AdminFinanceView.tsx`, 10 trường tài chính đã được tách nguyên tử hoàn toàn:
1. **Mã giao dịch / Batch ID**: Cột riêng (Mono badge / Link)
2. **Thời gian**: Cột riêng format chuẩn `DD/MM/YYYY HH:mm`
3. **Loại giao dịch / Phân loại**: Cột riêng (Rút tiền ví / Đối soát cuối ngày / Quyết toán)
4. **Số tiền**: Cột riêng format tiền tệ VND
5. **Số dư trước**: Cột riêng
6. **Số dư sau**: Cột riêng
7. **Trạng thái**: Cột riêng với Status Badge
8. **Người thực hiện / Shop / Kênh**: Cột riêng (Tên + ID)
9. **Mã tham chiếu / Tham chiếu ngân hàng**: Cột riêng
10. **Lý do / Ghi chú / Lệch toán**: Cột riêng

---

## 7. PAGINATION COMPLIANCE

- **Quy chuẩn:** Bắt buộc 10 items/page.
- **Thực thi:**
  - `AdminBusinessesView`: `pageSize = 10`
  - `AdminAccountsView`: `pageSize = 10`
  - `AdminUsersView`: `pageSize = 10`
  - `AdminFinanceView` (cả 3 tabs): `pageSize = 10`
  - `AdminDisputesView`: `pageSize = 10`
- **Hiển thị:** Thanh phân trang luôn hiển thị kể cả khi total records <= 10.

---

## 8. POPUP VIOLATION STATUS

- **Lịch sử kiểm toán (Audit History):** 0 Modal / Popup. Hiển thị qua in-page Inspector Tabs.
- **Lịch sử đơn hàng / domain (Domain History):** 0 Modal / Popup. Hiển thị qua in-page Timeline.
- **Chi tiết doanh nghiệp / khiếu nại:** 0 Modal / Popup. Sử dụng In-page Drawer / Split Panel.
- **Modal duy nhất được giữ:** Confirmation Dialog khi thực hiện Sensitive Mutation (Khóa tài khoản, Phê duyệt / Từ chối rút tiền, Phán quyết hoàn tiền).

---

## 9. BACKEND API GAPS IDENTIFIED

Tuân thủ nghiêm ngặt nguyên tắc **STOP CONDITION & NO BACKEND INVENT**, các thiếu sót về backend API query đã được ghi nhận:

### Gap 1: Audit Log Query API for Admin Businesses
- **Service:** `business-service`
- **Endpoint thiếu:** `GET /api/v1/admin/businesses/:id/audit-logs`
- **Tình trạng:** Backend Phase 1 đã lưu `AuditLog` vào PostgreSQL của `business-service` khi thực hiện `approveBusiness()`, `suspendBusiness()`, v.v., nhưng API Gateway / Business Service chưa mở query route để UI fetch danh sách log theo `businessId`.
- **Frontend Contract yêu cầu:**
  ```typescript
  GET /api/v1/admin/businesses/:id/audit-logs?page=1&limit=10
  Response: {
    items: Array<{
      id: string;
      action: string;
      actorId: string;
      actorRole: string;
      resourceId: string;
      resourceType: string;
      stateBefore: Record<string, any> | null;
      stateAfter: Record<string, any> | null;
      changedFields: string[];
      createdAt: string;
      requestId?: string;
      ipAddress?: string;
    }>;
    total: number;
  }
  ```

### Gap 2: Audit Log Query API for Admin Accounts & Users
- **Service:** `auth-service` / `user-service`
- **Endpoint thiếu:** `GET /api/v1/admin/users/:id/audit-logs`
- **Tình trạng:** Backend đã lưu audit khi `blockUser()`, `changeRole()`, nhưng chưa có REST endpoint cho phép Admin truy vấn lịch sử thao tác của từng tài khoản.

### Gap 3: Ledger-Level Balance Correlation in EOD Reconciliation
- **Service:** `finance-service`
- **Endpoint hiện tại:** `GET /api/v1/finance/reconciliations/eod`
- **Thiếu sót:** Bảng EOD batch chỉ trả về tổng số tiền khớp và chênh lệch tổng (`variance`), chưa đính kèm snapshot số dư trước/sau (`beforeBalance`, `afterBalance`) trên từng dòng chi tiết đơn hàng trong response list.

---

## 10. QUALITY GATES & VERIFICATION

### 1. TypeScript Typecheck
- **Command:** `npm run typecheck` (`tsc --noEmit`)
- **Result:** **PASS (0 errors)**

### 2. Next.js Production Build
- **Command:** `npm run build`
- **Result:** **PASS (106/106 routes generated successfully in 2.4s)**

### 3. Regression Check
- Tất cả các action của Admin (Phê duyệt doanh nghiệp, Khóa user, Phán quyết tranh chấp, Phê duyệt rút tiền) vẫn giữ nguyên kết nối với backend API client hiện hữu.

---

## 11. SCOPE COMPLIANCE & BOUNDARIES

- ❌ **Seller UI:** Tuyệt đối không can thiệp.
- ❌ **Kafka / ClickHouse / New Service:** Không triển khai.
- ❌ **Prisma Schema / DB Merge:** Không sửa đổi.
- ❌ **RabbitMQ Rewrite:** Không thay đổi.
- ❌ **Mock / Fake Audit Data:** Không tạo dữ liệu giả.

---

## 12. FINAL STATUS

**PHASE 2.2 STATUS: PASS WITH BACKEND GAPS**

*(Giao diện Governance Admin đã tích hợp hoàn hảo với UI Foundation Phase 2.1, build thành công 100%, sẵn sàng hiển thị đầy đủ khi các backend query endpoint của Phase 3 được bổ sung).*
