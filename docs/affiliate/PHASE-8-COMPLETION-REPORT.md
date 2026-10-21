# BÁO CÁO HOÀN THÀNH GIAI ĐOẠN 8: WALLET/LEDGER SETTLEMENT VÀ RECONCILIATION

**Thời gian hoàn thành:** 21/10/2026  
**Trạng thái:** ✅ **HOÀN THÀNH 100% - ĐẠT CHUẨN AUDIT**  
**Hệ thống thực thi:** NestJS Commerce Service, Prisma ORM, Double-Entry General Ledger, Scheduled Batch Worker  

---

## 1. TỔNG QUAN CÁC QUYẾT ĐỊNH ĐÃ KHÓA (LOCKED ARCHITECTURAL DECISIONS)

Tuân thủ nghiêm ngặt 3 quyết định cốt lõi đã chốt với người dùng:

1. **Mô hình ví Affiliate chuyên biệt (Affiliate Wallet Architecture):**
   - Ví riêng biệt gắn liền với hồ sơ CTV (`AffiliateWallet`), phân định minh bạch các nhóm số dư:
     - `availableBalance`: Số dư khả dụng thực tế (có thể âm nếu phát sinh nợ thu hồi).
     - `netAvailableBalance`: Số dư có thể rút (`Math.max(0, availableBalance)`).
     - `debtBalance`: Công nợ cần cấn trừ (`availableBalance < 0 ? Math.abs(availableBalance) : 0`).
     - `holdingBalance`: Số dư đang trong thời gian giữ đối soát (7 ngày sách giấy / 24h sách số).
     - `pendingBalance`: Hoa hồng vừa phát sinh từ đơn hàng mới.
     - `frozenBalance`: Tiền đang tạm giữ cho các yêu cầu rút tiền đang chờ xử lý.
     - `lifetimeEarned` & `lifetimePaid`: Lũy kế thu nhập trọn đời và lũy kế đã thanh toán.

2. **Chu kỳ quét và giải ngân đối soát tự động (Settlement Worker Schedule):**
   - Chạy theo lô (Batch) **1 lần mỗi ngày vào đúng 00:00 (Nửa đêm theo giờ Việt Nam - múi giờ Asia/Ho_Chi_Minh, tức 17:00 UTC)** bằng `@Cron('0 17 * * *')`.
   - Quét toàn bộ hoa hồng ở trạng thái `HOLDING` có `holdingUntil <= NOW()` và `disputeBlocked = false`.
   - Tự động chuyển trạng thái hoa hồng sang `AVAILABLE`, cộng số dư ví khả dụng, và ghi nhận bút toán kép Double-Entry Ledger.
   - Hỗ trợ cơ chế khóa chống chạy đồng thời (`isRunning` mutex) và trigger thủ công từ Admin endpoint.

3. **Quy trình phê duyệt đối soát và xử lý sai lệch (Reconciliation & Journal Approval):**
   - Giải ngân chu kỳ 00:00 diễn ra hoàn toàn tự động theo chính sách hệ thống.
   - Bắt buộc tuân thủ nguyên tắc **Maker-Checker (Người tạo lệnh không được tự duyệt lệnh)** đối với các thao tác điều chỉnh số dư ví thủ công (`Manual Balance Adjustment`).
   - Lệnh điều chỉnh số dư phát sinh bút toán sổ cái đối ứng tương ứng:
     - **Cộng tiền (CREDIT):** Ghi nợ Chi phí Marketing sàn (`PLATFORM_MARKETING_EXPENSE`) / Ghi có Phải trả CTV (`AFFILIATE_PAYABLE_AVAILABLE`).
     - **Trừ tiền (DEBIT):** Ghi nợ Phải trả CTV (`AFFILIATE_PAYABLE_AVAILABLE`) / Ghi có Chi phí Marketing sàn (`PLATFORM_MARKETING_EXPENSE`).
   - Công cụ kiểm toán đối soát (`AffiliateReconciliationService`) đối chiếu tự động 3 chiều: Tổng hoa hồng giải ngân - Hoàn trả vs Số dư ví CTV vs Số dư tài khoản Sổ cái (`AFFILIATE_PAYABLE_AVAILABLE`), tự động phát hiện và cảnh báo sai lệch (mismatch detection).

---

## 2. KIẾN TRÚC VÀ FILE CODE ĐÃ TRIỂN KHAI

### 2.1. Affiliate Wallet Service
- **Đường dẫn:** `platform/apps/commerce-service/src/modules/affiliate/services/affiliate-wallet.service.ts`
- **Chức năng:**
  - `getWalletByUserId(userId)` / `getWalletByProfileId(profileId)`: Truy vấn số dư ví với các chỉ số tính toán `debtBalance` và `netAvailableBalance`.
  - `getTransactions(userId, query)`: Lịch sử biến động số dư ví phân trang, lọc theo loại giao dịch (`AffiliateWalletTxType`) và khoảng thời gian.
  - `requestManualAdjustment(dto)` (Maker): Tạo yêu cầu điều chỉnh số dư trạng thái `PENDING_APPROVAL` lưu vào `AffiliateAuditLog`.
  - `approveManualAdjustment(adjustmentId, approvedBy)` (Checker): Kiểm tra vi phạm Maker-Checker (`requestedBy !== approvedBy`), cập nhật số dư ví, phát sinh giao dịch ví (`MANUAL_ADJUSTMENT_CREDIT` / `MANUAL_ADJUSTMENT_DEBIT`), và ghi sổ cái Ledger.
  - `rejectManualAdjustment(adjustmentId, rejectedBy, reason)`: Từ chối yêu cầu điều chỉnh và lưu lý do.

### 2.2. Affiliate Settlement Worker
- **Đường dẫn:** `platform/apps/commerce-service/src/modules/affiliate/services/affiliate-settlement-worker.service.ts`
- **Chức năng:**
  - Cron Job `@Cron('0 17 * * *')`: Khởi động giải ngân tự động nửa đêm giờ Việt Nam.
  - `runSettlementBatch(cutoffDate, batchSize)`: Điều phối quét mẻ hoa hồng đủ điều kiện, ghi nhận log kiểm toán hệ thống `SETTLEMENT_BATCH_COMPLETED`.

### 2.3. Affiliate Reconciliation Service
- **Đường dẫn:** `platform/apps/commerce-service/src/modules/affiliate/services/affiliate-reconciliation.service.ts`
- **Chức năng:**
  - `runReconciliationAudit()`: Tổng hợp số liệu 3 lớp (Commissions, Wallets, LedgerAccountSummary), phát hiện sai lệch số học (`walletVsLedgerMismatch`) và dị thường ở từng ví CTV cá nhân, trả về báo cáo chẩn đoán trạng thái `BALANCED` hoặc `MISMATCH_DETECTED`.

### 2.4. Endpoints API Controller
- **CTV Endpoints (`AffiliateController`):**
  - `GET /api/v1/affiliate/wallet`: CTV kiểm tra số dư ví cá nhân.
  - `GET /api/v1/affiliate/wallet/transactions`: CTV xem lịch sử biến động số dư.
- **Admin Endpoints (`AffiliateAdminController`):**
  - `GET /api/v1/admin/affiliates/wallets/:profileId`: Admin tra cứu ví CTV.
  - `POST /api/v1/admin/affiliates/wallets/adjustments`: Maker đề xuất lệnh điều chỉnh.
  - `POST /api/v1/admin/affiliates/wallets/adjustments/:id/approve`: Checker duyệt lệnh điều chỉnh.
  - `POST /api/v1/admin/affiliates/wallets/adjustments/:id/reject`: Checker từ chối lệnh điều chỉnh.
  - `GET /api/v1/admin/affiliates/reconciliation`: Xem báo cáo đối soát sổ cái.
  - `POST /api/v1/admin/affiliates/settlement/trigger`: Kích hoạt mẻ giải ngân thủ công.

---

## 3. BẰNG CHỨNG KIỂM THỬ KỸ THUẬT

| Hạng mục kiểm thử | Công cụ | Số lượng | Kết quả |
|---|---|---|---|
| **Phase 8 Wallet & Settlement Suite** | Jest | 1 suite / 13 tests | **13/13 PASS (100%)** |
| **Toàn bộ Commerce Affiliate Suites** | Jest | 7 suites / 90 tests | **90/90 PASS (100%)** |
| **Commerce Service Build** | `tsc -p tsconfig.app.json` | Commerce Service | **0 ERRORS** |
| **Playwright End-to-End Suite** | Playwright | 1 suite / 16 tests | **16/16 PASS (100%)** |
| **TypeScript Typecheck** | `tsc --noEmit` | `web` & `platform` | **0 ERRORS** |

---

## 4. KẾT LUẬN & SẴN SÀNG CHO GIAI ĐOẠN 9

Giai đoạn 8 đã hoàn thành xuất sắc toàn bộ nghiệp vụ quản lý ví chuyên biệt Affiliate, cơ chế tự động giải ngân theo lô vào 00:00 hằng ngày, quy trình Maker-Checker nghiêm ngặt đối với can thiệp số dư thủ công, và công cụ đối soát sổ cái tự động phát hiện sai lệch 3 chiều.

Tuân thủ nguyên tắc quy trình: **Dừng lại tại đây và chờ lệnh của người dùng trước khi tiến hành Giai đoạn 9 (Dashboard, reporting và production realtime).**
