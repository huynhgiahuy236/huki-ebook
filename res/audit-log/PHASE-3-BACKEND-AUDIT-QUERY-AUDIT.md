# PHASE 3 — BACKEND AUDIT QUERY & FINANCIAL TRACEABILITY AUDIT

**Repository:** HUKI EBOOK  
**Scope:** Backend Audit Query & Financial Traceability (Read-Only Audit / No Code First)  
**Date:** 2026-09-28  
**Architecture Baseline:** Phase 1 (Audit Foundation) + Phase 2.1 (UI Foundation) + Phase 2.2 (Admin UI Integration)  

---

## 1. ARCHITECTURAL BASELINE & LOCK VERIFICATION

Khảo sát mã nguồn thực tế tại `E:\HuKi\platform` và `E:\HuKi\web` đã xác nhận tính nhất quán và nguyên vẹn của các quyết định kiến trúc đã khóa:

- **Kiến trúc Microservices độc lập:** 
  - `identity-service` (Port 3001, Database: `identity_db`)
  - `business-service` (Port 3002, Database: `business_db`)
  - `commerce-service` (Port 3003, Database: `commerce_db`)
  - `shipping-service` (Port 3004, Database: `shipping_db`)
  - `community-service` (Port 3005, Database: `community_db`)
  - `promotion-service` (Port 3007, Database: `promotion_db`)
  - `analytics-service` (Port 3006)
  - `api-gateway` (Port 3000)
- **Zero Centralized Audit Service / Zero DB Merge:** Mỗi microservice sở hữu một schema `AuditLog` cục bộ trong database PostgreSQL riêng biệt.
- **Canonical RBAC:** `business-service.Member` là Single Source of Truth cho phân quyền Seller Staff và Store Owner; `identity-service.User.role` quản lý quyền tài khoản người dùng (`USER`, `BUSINESS`, `DELIVERY_STAFF`, `PLATFORM_ADMIN`).
- **Zero Kafka / Zero ClickHouse / Zero RabbitMQ Rewrite:** Kiến trúc hàng đợi Outbox/RabbitMQ được bảo toàn nguyên vẹn.

---

## 2. GAP 1 FINDINGS — BUSINESS AUDIT QUERY

### 2.1. Hiện trạng Service & Data Owner
- **Service sở hữu:** `business-service` (`platform/apps/business-service`).
- **Database:** `business_db`.
- **Prisma Model:** `AuditLog` đã tồn tại tại `apps/business-service/prisma/schema.prisma` (lines 247-271):
  - Khóa chính `id` (UUID), `actorId`, `actorRole`, `service`, `module`, `action`, `resource`, `resourceId`, `beforeState` (Json), `afterState` (Json), `changedFields` (Json), `requestId`, `ipAddress`, `userAgent`, `storeId`, `metadata`, `createdAt`.
  - Đã có Index tối ưu: `@@index([resource, resourceId])`, `@@index([storeId, createdAt])`, `@@index([actorId, createdAt])`.
- **Nơi đang ghi Audit Log:**
  - `approveBusiness()`: ghi `action: APPROVE` / `REJECT`, `resource: 'Business'`, `resourceId: id`, `beforeState`, `afterState`, `changedFields`.
  - `rejectBusiness()`: ghi `action: REJECT`, `resource: 'Business'`, `resourceId: id`.
  - `suspendBusiness()`: ghi `action: SUSPEND`, `resource: 'Business'`, `resourceId: id`.
  - `approveUpdateRequest()`, `rejectUpdateRequest()`: ghi `action: APPROVE` / `REJECT`.
- **Hiện trạng `AuditService`:** Chỉ có các hàm ghi `record()` / `log()` (ghi một chiều vào DB qua Prisma), **chưa có hàm `query()`**.

### 2.2. Routing & Controller Hiện Tại
- `BusinessController` tại `business.controller.ts` gắn prefix `@Controller('businesses')`.
- Các route Admin hiện hữu:
  - `GET /api/v1/businesses/admin/all` (Liệt kê danh sách doanh nghiệp)
  - `POST /api/v1/businesses/:id/approve`
  - `POST /api/v1/businesses/:id/reject`
  - `GET /api/v1/businesses/admin/update-requests`
- **Routing Convention phù hợp:**
  ```http
  GET /api/v1/businesses/admin/:id/audit-logs
  ```
  hoặc
  ```http
  GET /api/v1/businesses/:id/audit-logs
  ```
  *(Được bảo vệ bởi `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('PLATFORM_ADMIN')`)*.

### 2.3. Query Parameters & Response Contract
- **Query Params:**
  - `page`: number (mặc định 1)
  - `limit`: number (mặc định 10)
  - `action`: string (tùy chọn: `APPROVE`, `REJECT`, `SUSPEND`, `UPDATE`...)
- **Response Contract (Khớp 100% với `AuditHistoryTimeline` UI Foundation):**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "uuid",
          "actorId": "admin-uuid",
          "actorRole": "PLATFORM_ADMIN",
          "service": "business-service",
          "module": "BUSINESS",
          "action": "APPROVE",
          "resource": "Business",
          "resourceId": "business-uuid",
          "beforeState": { "status": "PENDING_APPROVAL" },
          "afterState": { "status": "APPROVED" },
          "changedFields": ["status"],
          "requestId": "req-123",
          "ipAddress": "127.0.0.1",
          "userAgent": "Mozilla/5.0...",
          "storeId": "store-uuid",
          "metadata": null,
          "createdAt": "2026-09-28T10:00:00.000Z"
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 10
    }
  }
  ```

---

## 3. GAP 2 FINDINGS — USER / ACCOUNT AUDIT QUERY

### 3.1. Hiện trạng Service & Data Owner
- **Service sở hữu:** `identity-service` (`platform/apps/identity-service`).
- **Database:** `identity_db`.
- **Prisma Model:** `AuditLog` đã tồn tại tại `apps/identity-service/prisma/schema.prisma` (lines 141-165):
  - Trường dữ liệu đồng nhất với `business-service`, có Index `@@index([resource, resourceId])`.
- **Nơi đang ghi Audit Log:**
  - `createCustomerByAdmin()`: ghi `action: AuditAction.CREATE`, `resource: 'User'`, `resourceId: user.id`.
  - `updateUserByAdmin()`: ghi `action: AuditAction.ROLE_CHANGE` hoặc `AuditAction.UPDATE`, `resource: 'User'`, `beforeState`, `afterState`, `changedFields`.
  - `toggleLockByAdmin()`: ghi `action: AuditAction.BLOCK` hoặc `AuditAction.UNBLOCK`, `resource: 'User'`.
  - `deleteUserByAdmin()`: ghi `action: AuditAction.DELETE`, `resource: 'User'`.
- **Hiện trạng `AuditService`:** `apps/identity-service/src/modules/audit/audit.service.ts` chỉ có `log()`, chưa có hàm query.

### 3.2. Routing & Controller Hiện Tại
- `UserController` tại `user.controller.ts` gắn prefix `@Controller('users')`.
- Các route Admin hiện hữu:
  - `GET /api/v1/users/admin/all` (Liệt kê người dùng)
  - `POST /api/v1/users/admin/customer`
  - `PATCH /api/v1/users/admin/:id`
  - `POST /api/v1/users/admin/:id/toggle-lock`
  - `DELETE /api/v1/users/admin/:id`
- **Routing Convention phù hợp:**
  ```http
  GET /api/v1/users/admin/:id/audit-logs
  ```
  *(Được bảo vệ bởi `@UseGuards(JwtAuthGuard, RolesGuard)` và `@Roles('PLATFORM_ADMIN')`)*.

### 3.3. Response Mapping
- Trả về danh sách `AuditLog` với `resource = 'User'` và `resourceId = userId`, phân trang chuẩn `limit = 10`. Dữ liệu sanitize sạch sẽ, không lộ `passwordHash`, token hoặc secret.

---

## 4. GAP 3 FINDINGS — FINANCIAL TRACEABILITY

### 4.1. Hiện trạng Service & Models
- **Service sở hữu:** `commerce-service` (`platform/apps/commerce-service`).
- **Database:** `commerce_db`.
- **Các Models tài chính trọng yếu:**
  1. **`WalletTransaction` (Bảng biến động số dư ví thực tế):**
     - Đã có sẵn các trường số dư nguyên tử trong database:
       - `availableBefore`, `availableAfter`
       - `pendingBefore`, `pendingAfter`
       - `frozenBefore`, `frozenAfter`
       - `amount`, `type`, `referenceType`, `referenceId`, `description`, `createdAt`.
     - Index: `@@index([walletId, createdAt])`, `@@index([referenceType, referenceId])`.
  2. **`LedgerTransaction` & `LedgerEntry` (Kế toán kép Double-Entry Ledger):**
     - Bảng `ledger_transactions`: `transactionNumber`, `idempotencyKey`, `referenceType`, `referenceId`, `totalAmount`, `postedAt`.
     - Bảng `ledger_entries`: `accountType` (`ESCROW_HOLDING`, `SELLER_PENDING`, `SELLER_AVAILABLE`, `SELLER_FROZEN`, `PLATFORM_REVENUE`, `REFUND_CLEARING`, `PAYOUT_CLEARING`), `direction` (`DEBIT`, `CREDIT`), `amount`.
  3. **`PayoutRequest` (Lệnh rút tiền):**
     - Đầy đủ: `amount`, `status`, `bankSnapshot`, `requestedBy`, `reviewedBy`, `requestedAt`, `reviewedAt`, `disbursedAt`, `rejectionReason`, `provider`, `providerRef`, `idempotencyKey`.
  4. **`FinanceReconciliationRun` (Đối soát EOD cuối ngày):**
     - Đầy đủ: `runNumber`, `businessDate`, `status`, `summary`, `counts`, `discrepancies`, `durationMs`.

### 4.2. Khảo sát Endpoint & Traceability
- **Yêu cầu rút tiền:** Đã có `GET /api/v1/payout/admin/requests` trong `PayoutController`.
- **Đối soát EOD:** Đã có `GET /api/v1/admin/finance/reconciliation/eod/runs` và `GET /api/v1/admin/finance/reconciliation/eod/runs/:id` trong `FinanceReconciliationController`.
- **Lịch sử Quyết toán / Biến động số dư (Traceability Balance):**
  - Hiện tại `WalletController` chỉ có `GET /api/v1/wallet/store/:storeId/transactions` (theo storeId).
  - Cần thêm endpoint Admin toàn sàn:
    ```http
    GET /api/v1/wallet/admin/transactions
    ```
    hoặc
    ```http
    GET /api/v1/ledger/admin/transactions
    ```
    truy vấn từ bảng `WalletTransaction` với đầy đủ `availableBefore`, `availableAfter`, `pendingBefore`, `pendingAfter`, `referenceId`, `type`, `amount`, `createdAt`.
- **Đánh giá về số dư Trước/Sau (`beforeBalance` / `afterBalance`):**
  - **KẾT LUẬN:** Dữ liệu số dư Trước/Sau ĐÃ TỒN TẠI VÀ ĐƯỢC TÍNH TOÁN CHÍNH XÁC trong database `commerce_db` (bảng `wallet_transactions`). Không cần chế tạo số dư giả, chỉ cần expose endpoint cho Admin.

---

## 5. API GATEWAY ROUTING & PROXY ANALYSIS

Khảo sát middleware `ServiceProxyMiddleware` (`platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts`):

### 5.1. Findings về Route Mapping
1. **Route `payout` & `ledger`:** Hiện tại từ điển `ROUTES` trong `service-proxy.middleware.ts` chưa khai báo ánh xạ `payout: 'commerce'` và `ledger: 'commerce'`. Cần bổ sung để Gateway định tuyến chính xác đến `commerce-service` (Port 3003).
2. **Wildcard `admin` Route:** Hiện tại line 182-184 có rule:
   ```typescript
   if (firstSegment === 'admin') { return 'community'; }
   ```
   Điều này khiến các request bắt đầu bằng `/admin/finance/reconciliation` bị Gateway chuyển nhầm sang `community-service` thay vì `commerce-service`!
   Cần bổ sung exception trong Gateway để định tuyến đúng:
   - `/admin/finance/*` → `commerce-service`

### 5.2. Context & Header Propagation
Gateway đã cấu hình forward đầy đủ `Authorization: Bearer <token>`, `x-correlation-id`, IP client, `user-agent`. Không có vấn đề nghẽn context.

---

## 6. AUTHORIZATION & SECURITY ANALYSIS

1. **Role Protection:**
   - Tất cả các endpoint Audit Query và Admin Financial Transaction phải được gắn `@UseGuards(JwtAuthGuard, RolesGuard)` và kiểm tra role `PLATFORM_ADMIN` (hoặc `BookActor.role === 'ADMIN' | 'PLATFORM_ADMIN'`).
2. **Data Isolation:**
   - Đối với Admin: Được phép query audit logs của mọi resource hợp lệ.
   - Đối với Seller: Chỉ được query trong phạm vi `storeId` thuộc quyền sở hữu (`business-service.Member`).
3. **Data Sanitization:**
   - Sử dụng `AuditSanitizer.sanitize()` đã có sẵn trong `@huki/shared` để loại bỏ: passwords, hashes, tokens, OTPs, PINs, header secrets trước khi trả về client.

---

## 7. DATABASE & MIGRATION IMPACT

- **Prisma Schema Changes:** **0 (KHÔNG CẦN THAY ĐỔI SCHEMA)**.
- **Database Migrations:** **0 (KHÔNG CẦN CHẠY MIGRATION)**.
- **Lý do:** Các model `AuditLog`, `WalletTransaction`, `LedgerTransaction`, `PayoutRequest`, `FinanceReconciliationRun` đã có đầy đủ cấu trúc cột, JSON fields, và index từ Phase 1 & Phase 0.1.

---

## 8. BACKWARD COMPATIBILITY

- Tất cả các endpoint hiện tại (`POST approve`, `POST reject`, `GET my`, `POST toggle-lock`, `GET eod/runs`) giữ nguyên 100% signature và behavior.
- Các endpoint mới chỉ là `GET` query đọc dữ liệu audit log và financial transactions, không gây tác động phụ (side-effects) lên các luồng nghiệp vụ hiện hữu.

---

## 9. IMPLEMENTATION BOUNDARY

### 9.1. IMPLEMENT NOW (Phạm vi thực hiện của Phase 3 khi được phê duyệt)
1. **`business-service`:**
   - Thêm phương thức `findAuditLogs(params)` trong `AuditService`.
   - Thêm route `GET /api/v1/businesses/admin/:id/audit-logs` (hoặc `GET /api/v1/businesses/:id/audit-logs`) trong `BusinessController`.
2. **`identity-service`:**
   - Thêm phương thức `findAuditLogs(params)` trong `AuditService`.
   - Thêm route `GET /api/v1/users/admin/:id/audit-logs` trong `UserController`.
3. **`commerce-service`:**
   - Thêm phương thức `getAllTransactions(query)` trong `WalletService`.
   - Thêm route `GET /api/v1/wallet/admin/transactions` trong `WalletController`.
   - Thêm route query audit log cho khiếu nại tranh chấp `GET /api/v1/orders/admin/disputes/:id/audit-logs` nếu cần thiết.
4. **`api-gateway`:**
   - Cập nhật `service-proxy.middleware.ts`: thêm `payout: 'commerce'`, `ledger: 'commerce'`, và rule chuyển hướng `/admin/finance/*` sang `commerce-service`.
5. **`web` (Frontend Integration):**
   - Bổ sung methods trong `adminApi.ts` / `businessApi.ts` / `walletApi.ts` để gọi các endpoint backend mới.
   - Kết nối dữ liệu thực tế vào `AdminBusinessesView`, `AdminAccountsView`, `AdminUsersView`, `AdminFinanceView`.

### 9.2. EXISTING — NO CHANGE
- Các Prisma models: `AuditLog`, `Wallet`, `WalletTransaction`, `LedgerTransaction`, `PayoutRequest`, `FinanceReconciliationRun`.
- Toàn bộ backend logic ghi Audit Log (Phase 1).
- `AuditSanitizer` và `AuditDiffHelper` trong `@huki/shared`.
- UI Foundation components (Phase 2.1).

### 9.3. BLOCKED
- *Không có blocker nào*. Toàn bộ hạ tầng cơ sở dữ liệu và dữ liệu kiểm toán cục bộ đã sẵn sàng.

### 9.4. EXPLICIT OUT OF SCOPE
- ❌ Triển khai Apache Kafka / Event streaming.
- ❌ Triển khai ClickHouse / OLAP analytics data warehouse.
- ❌ Tạo microservice Audit tập trung (Centralized Audit Service).
- ❌ Hợp nhất các database riêng biệt của microservices.
- ❌ Sửa đổi Seller UI hoặc Seller Portal.
- ❌ Cài đặt Kubernetes / Service Mesh.

---

## 10. STEP-BY-STEP IMPLEMENTATION PLAN

```
Phase 3 Implementation:
├── STEP 1: business-service
│   ├── audit.service.ts: Implement queryAuditLogs({ resource, resourceId, page, limit, action })
│   └── business.controller.ts: Add GET admin/:id/audit-logs endpoint with PLATFORM_ADMIN guard
│
├── STEP 2: identity-service
│   ├── audit.service.ts: Implement queryAuditLogs({ resource, resourceId, page, limit, action })
│   └── user.controller.ts: Add GET admin/:id/audit-logs endpoint with PLATFORM_ADMIN guard
│
├── STEP 3: commerce-service
│   ├── wallet.service.ts: Implement getAdminTransactions({ page, limit, storeId, dateRange })
│   ├── wallet.controller.ts: Add GET admin/transactions endpoint with Admin guard
│   └── orders.controller.ts / audit.service.ts: Add dispute audit log query
│
├── STEP 4: api-gateway
│   └── service-proxy.middleware.ts: Update ROUTES mapping (payout, ledger, admin/finance routes)
│
├── STEP 5: web (Frontend Admin API Client Connection)
│   ├── businessApi.ts / adminApi.ts: Add getBusinessAuditLogs(), getUserAuditLogs()
│   ├── walletApi.ts: Add getAdminWalletTransactions()
│   └── Connect API calls to AdminBusinessesView, AdminAccountsView, AdminFinanceView
│
├── STEP 6: Quality Gates
│   ├── Backend unit / controller tests
│   ├── Frontend TypeScript typecheck (0 errors)
│   └── Next.js production build (106/106 routes)
└── STEP 7: Phase 3 Final Report
```

---

## 11. FINAL STATUS

**PHASE 3 AUDIT STATUS: READY FOR IMPLEMENTATION**

*(Backend hiện tại đã có đầy đủ mô hình dữ liệu và cơ chế ghi kiểm toán. Việc mở các query endpoint hoàn toàn khả thi, không đòi hỏi migration database và không vi phạm bất kỳ ràng buộc kiến trúc nào).*
