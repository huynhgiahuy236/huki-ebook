# PHASE 1: SELLER ONBOARDING
## HUKI EBOOK - Seller Registration & KYC

---

## MỤC TIÊU

Hoàn thiện luồng đăng ký seller từ đầu đến cuối, bao gồm KYC verification và phân quyền staff.

---

## TASKS

### Task 8: Seller Registration Wizard - DONE ✅
**Priority:** P0 | **Effort:** 3 days | **Owner:** Frontend
**Completion Date:** 2026-09-17

**Files:**
- `web/src/ui/pages/seller/SellerRegisterPage.jsx` - 6-step form
- Auto MST lookup, validation, file upload, AML compliance

---

### Task 9: Admin KYC Approval/Reject Workflow - DONE ✅
**Priority:** P0 | **Effort:** 3 days | **Owner:** Backend + Frontend
**Completion Date:** 2026-09-17

**Files:**
- `web/src/ui/pages/admin/AdminBusinessesPage.jsx` - Full KYC audit panel
- 33-field audit, approve/reject, document preview

---

### Task 10: Real-time Notification - DONE ✅
**Priority:** P0 | **Effort:** 3 days | **Owner:** Backend + Frontend
**Completion Date:** 2026-09-17

**Files:**
- `platform/apps/commerce-service/src/modules/notifications/notification.service.ts`
- `web/src/hooks/useNotificationBadge.ts`

---

### Task 11: Red-Dot Notification System - DONE ✅
**Priority:** P0 | **Effort:** 1 day | **Owner:** Frontend
**Completion Date:** 2026-09-17

**Files:**
- `web/src/ui/components/common/RedDotBadge.tsx`
- `web/src/hooks/useNotificationBadge.ts`

---

### Task 12: Staff RBAC - Verify Implementation - DONE ✅
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend
**Completion Date:** 2026-09-17

**Files:**
- `platform/apps/commerce-service/src/modules/staff/permission.service.ts`
- 13 permissions implemented: VIEW/MANAGE for Orders, Products, Inventory, Reviews, Analytics, Finance, Staff, Settings

---

### Task 13: Staff Audit Log - DONE ✅
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend
**Completion Date:** 2026-09-17

**Files:**
- `platform/apps/commerce-service/src/modules/staff/audit-log.service.ts`
- Tracks: staff created, permission changes, role changes, deactivations

---

### Task 14: Session Timeout Policy - DONE ✅
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend
**Completion Date:** 2026-09-17

**Files:**
- `platform/apps/identity-service/src/modules/session/session-timeout.middleware.ts`
- 30-minute timeout, 5-minute warning, 7-day remember me

**Mô tả:**
Verify và hoàn thiện Seller Registration Wizard UI (4-step form).

**Deliverables:**
```
✓ 4-Step Wizard Form:
  Step 1: Basic Info
    - Business name (required, 2-100 chars)
    - Business type (Individual/Company)
    - Tax ID / MST (required, unique)
    - Business registration number
    
  Step 2: Contact Info
    - Email (required, valid format)
    - Phone (required, VN format)
    - Address (required, detailed)
    
  Step 3: Bank Account
    - Bank name (required, dropdown)
    - Bank account number (required)
    - Account holder name (required)
    - Bank name matching validation (anti-fraud)
    
  Step 4: Verification
    - Upload business license (PDF/JPG, max 5MB)
    - Upload tax certificate (PDF/JPG, max 5MB)
    - Terms acceptance checkbox
    
✓ Validation:
  - All 33 KYC fields
  - Real-time validation on blur
  - Error messages tiếng Việt
  - Progress indicator
  
✓ UX:
  - Can save draft (localStorage/temp DB)
  - Step navigation (back/next)
  - Auto-save on field change
  
✓ File Upload:
  - Drag & drop support
  - Image preview
  - File type validation
  - Size limit enforcement
```

**Files cần verify/create:**
- `web/src/ui/pages/seller/SellerRegistrationPage.tsx` (verify existing)
- `web/src/ui/components/seller/WizardStep*.tsx` (create if missing)
- `web/src/hooks/useSellerRegistration.ts`
- `web/src/services/sellerApi.ts`

**API Endpoints cần verify:**
```
POST /api/sellers/register
GET  /api/sellers/kyc/status/:sellerId
POST /api/sellers/kyc/resubmit
```

---

### Task 9: Admin KYC Approval/Reject Workflow
**Priority:** P0 | **Effort:** 3 days | **Owner:** Backend + Frontend

**Mô tả:**
Hoàn thiện Admin workflow để approve/reject KYC applications.

**Deliverables:**
```
✓ Admin KYC Queue Page:
  - List pending applications
  - Sort by date (oldest first)
  - Filter by status (pending/approved/rejected)
  - Search by business name/MST
  
✓ KYC Detail Modal:
  - View all 33 fields
  - Preview uploaded documents
  - View audit trail
  
✓ Approval Flow:
  - Approve button → Auto-create Store + Wallet
  - Transaction: all-or-nothing
  - Notification to seller (email/in-app)
  
✓ Rejection Flow:
  - Reject button → Require reason
  - Reason templates:
    - "MST không hợp lệ"
    - "Tài khoản ngân hàng không khớp"
    - "Giấy phép kinh doanh không rõ ràng"
    - "Lý do khác..."
  - Notification to seller with reason
  
✓ Anti-fraud:
  - Bank name matching (account holder vs business name)
  - Duplicate MST detection
  - Suspicious pattern flagging
```

**Files cần verify/create:**
- `web/src/ui/pages/admin/AdminKYCPanel.tsx`
- `web/src/ui/pages/admin/KYCApprovalModal.tsx`
- `commerce-service/src/services/KYCService.ts`
- `commerce-service/src/routes/admin.kyc.ts`

**Database Tables:**
```sql
-- Verify existing or create
CREATE TABLE kyc_audit_logs (
  id UUID PRIMARY KEY,
  seller_id UUID REFERENCES sellers(id),
  admin_id UUID REFERENCES admins(id),
  action VARCHAR(20), -- 'APPROVE' | 'REJECT'
  previous_status VARCHAR(20),
  new_status VARCHAR(20),
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Task 10: Real-time Notification - Replace LocalStorage
**Priority:** P0 | **Effort:** 3 days | **Owner:** Backend + Frontend

**Mô tả:**
Thay thế LocalStorage-based notification bằng server-side notification system.

**Deliverables:**
```
✓ Notification Service:
  - Database notification storage
  - REST API endpoints
  - Webhook support for future
  
✓ Notification Types:
  - KYC_APPROVED
  - KYC_REJECTED
  - NEW_ORDER
  - ORDER_SHIPPED
  - DISPUTE_OPENED
  - PAYMENT_RECEIVED
  - STOCK_LOW
  - REVIEW_RECEIVED
  
✓ API Endpoints:
  GET  /api/notifications (list, paginated)
  GET  /api/notifications/unread-count
  PUT  /api/notifications/:id/read
  PUT  /api/notifications/read-all
  DELETE /api/notifications/:id
  
✓ WebSocket Events (future):
  - notification:new
  - notification:read
  
✓ Admin Red-Dot:
  - Badge count on bell icon
  - Real-time update when new KYC application
  - Click → Navigate to queue
```

**Files cần create:**
- `commerce-service/src/services/NotificationService.ts`
- `commerce-service/src/models/Notification.ts`
- `commerce-service/src/routes/notifications.ts`
- `web/src/services/notificationApi.ts`
- `web/src/contexts/NotificationContext.tsx`
- `web/src/ui/components/common/NotificationBell.tsx`

**Database Schema:**
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread 
ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

---

### Task 11: Red-Dot Notification System
**Priority:** P0 | **Effort:** 1 day | **Owner:** Frontend

**Mô tả:**
Implement red-dot notification UI cho các trang Admin.

**Deliverables:**
```
✓ Red-Dot Components:
  - Global notification bell (Admin header)
  - KYC queue badge (số pending)
  - Order alerts badge
  
✓ Red-Dot Behavior:
  - Hiện badge khi có notification chưa đọc
  - Số hiển thị = số notification chưa đọc (max 99+)
  - Tự động update khi có notification mới
  - Giảm badge khi đọc notification
  
✓ Pages cần implement:
  - Admin Dashboard
  - Admin KYC Panel
  - Admin Orders Panel
  - Seller Dashboard
```

**Files cần create:**
- `web/src/ui/components/common/RedDotBadge.tsx`
- `web/src/ui/components/common/NotificationPanel.tsx`
- `web/src/hooks/useNotificationBadge.ts`

---

### Task 12: Staff RBAC - Verify Implementation
**Priority:** P0 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Verify và fix Staff RBAC implementation.

**Deliverables:**
```
✓ Verify 13 Permissions:
  1. VIEW_ORDERS
  2. MANAGE_ORDERS
  3. VIEW_PRODUCTS
  4. MANAGE_PRODUCTS
  5. VIEW_INVENTORY
  6. MANAGE_INVENTORY
  7. VIEW_REVIEWS
  8. MANAGE_REVIEWS
  9. VIEW_ANALYTICS
  10. VIEW_FINANCE (Owner only)
  11. MANAGE_FINANCE (Owner only)
  12. MANAGE_STAFF (Owner only)
  13. MANAGE_SETTINGS

✓ Permission Checks:
  - Route guard (frontend)
  - API guard (backend)
  - Database-level permission check
  
✓ Verify:
  - Owner có toàn quyền
  - Staff bị giới hạn theo permission
  - Finance page chỉ Owner được xem
```

**Files cần verify:**
- `commerce-service/src/middleware/rbac.ts`
- `commerce-service/src/services/PermissionService.ts`
- `web/src/middleware/authGuard.tsx`
- `web/src/config/permissions.ts`

---

### Task 13: Staff Audit Log
**Priority:** P1 | **Effort:** 2 days | **Owner:** Backend

**Mô tả:**
Thêm audit log cho permission changes.

**Deliverables:**
```
✓ Audit Events:
  - Staff created
  - Staff permission changed
  - Staff deactivated
  - Staff role changed
  
✓ Audit Log Fields:
  - Actor (who made the change)
  - Target (affected staff)
  - Action
  - Changes (before/after JSON)
  - IP address
  - Timestamp
  
✓ API:
  GET /api/admin/audit-logs
  - Filter by staff_id
  - Filter by action
  - Filter by date range
```

**Database Schema:**
```sql
CREATE TABLE staff_audit_logs (
  id UUID PRIMARY KEY,
  actor_id UUID NOT NULL,
  target_staff_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changes JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### Task 14: Session Timeout Policy
**Priority:** P1 | **Effort:** 1 day | **Owner:** Backend

**Mô tả:**
Implement session timeout cho staff accounts.

**Deliverables:**
```
✓ Session Config:
  - Default timeout: 30 minutes
  - Activity-based refresh
  - Remember device option (7 days)
  
✓ Behavior:
  - Auto-logout khi timeout
  - Warning modal 5 minutes before
  - Session extension on activity
  
✓ Storage:
  - Redis session store
  - Session invalidation on logout
  - Session invalidation on permission change
```

---

## DEPENDENCIES

- Task 8 (Seller Wizard) → Task 9 (Admin Approval)
- Task 9 (Admin Approval) → Task 10 (Notifications)
- Task 10 (Notifications) → Task 11 (Red-Dot UI)
- Task 12 (RBAC) → Task 13 (Audit Log)

---

## SUCCESS CRITERIA

- [x] Seller có thể đăng ký qua 6-step wizard ✅
- [x] Admin nhận notification khi có KYC mới ✅
- [x] Admin approve/reject KYC với lý do ✅
- [x] Seller nhận notification khi được duyệt/từ chối ✅
- [x] Red-dot badge hiển thị số notification chưa đọc ✅
- [x] Staff bị chặn truy cập page không có permission ✅
- [x] Audit log ghi lại mọi thay đổi permission ✅

---

## TEST CASES

```
TC_REG_01: Seller đăng ký 33 trường thành công
TC_REG_02: MST trùng lặp bị chặn
TC_REG_03: Bank name mismatch bị phát hiện
TC_REG_04: Admin approve tạo Store + Wallet
TC_REG_05: Admin reject kèm lý do
TC_REG_06: Seller bị chặn nếu chưa approve
TC_RBAC_01: Owner tạo staff account
TC_RBAC_02: Staff bị chặn Finance page
TC_RBAC_03: Owner thu hồi permissions
TC_NOTIF_01: Red-dot hiển thị khi có notification mới
TC_NOTIF_02: Click notification → mark as read
```

---

## NOTES

- Form data nên save vào temporary database thay vì localStorage
- Uploaded files nên upload lên S3/MinIO, không lưu local
- KYC review nên có 2-step approval cho company accounts
- Notification nên có email integration trong phase tiếp theo
