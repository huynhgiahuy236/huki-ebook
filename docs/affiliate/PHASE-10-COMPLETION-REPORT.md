# Báo cáo Hoàn Thành Giai Đoạn 10 — KYC, Payout và Fraud Operations

## 1. Tổng quan Giai đoạn 10
Giai đoạn 10 hiện thực hóa toàn bộ quy trình định danh đối tác (KYC), vòng đời rút tiền hoa hồng (Payout Request Lifecycle) tích hợp sổ cái kép (Double-Entry General Ledger) chuẩn mực ngân hàng, cùng hệ thống kiểm soát và điều tra gian lận (Fraud Operations Queue & Gating).

Toàn bộ quy trình tuân thủ nghiêm ngặt nguyên tắc **Zero Mock Data** trong runtime sản phẩm, kiểm soát chặt chẽ rò rỉ dữ liệu cá nhân (PII), và bảo đảm sự cân bằng bất biến của dòng tiền nền tảng HuKi.

---

## 2. Các Quyết Định Kiến Trúc Đã Chốt (Decision Log)

| ID | Ngày | Quyết định | Nội dung chi tiết |
|---|---|---|---|
| **AFF-DEC-016** | 2026-10-21 | Quy trình KYC & Xác minh Ngân hàng | Xác minh bán tự động (Semi-automated): CTV tải lên CCCD 2 mặt kèm tài khoản ngân hàng chính chủ. Hệ thống tự động kiểm tra trùng khớp họ tên (case-insensitive & trim); Admin phòng nghiệp vụ xét duyệt và kích hoạt quyền rút tiền lần đầu. |
| **AFF-DEC-017** | 2026-10-21 | Hạn mức & Tần suất rút tiền | Hạn mức tối thiểu 100.000 VND, tối đa 50.000.000 VND/giao dịch; tối đa 1 lệnh rút tiền trong vòng 24 giờ cho mỗi CTV. Nền tảng miễn phí 100% phí rút tiền. |
| **AFF-DEC-018** | 2026-10-21 | Khấu trừ thuế TNCN & Chặn gian lận | Tự động tính và khấu trừ 10% thuế TNCN cho các giao dịch rút tiền gross >= 2.000.000 VND (theo quy định thuế đối với cá nhân vãng lai không ký HĐLĐ). Tự động khóa tính năng rút tiền đối với đối tác đang có hồ sơ nghi vấn gian lận ở trạng thái `OPEN`. |

---

## 3. Kiến Trúc & Các Module Kỹ Thuật Đã Triển Khai

### 3.1 DTOs Validation & Idempotency (`affiliate-payout.dto.ts`)
- **`SubmitKycDto`**: Xác thực số CCCD (12 số chuẩn), ngày cấp, nơi cấp, URL ảnh 2 mặt, mã ngân hàng (từ danh mục Napas/VietQR), số tài khoản, và tên chủ tài khoản.
- **`ReviewKycDto`**: Trạng thái `APPROVED` hoặc `REJECTED` (yêu cầu lý do tối thiểu 5 ký tự).
- **`CreatePayoutRequestDto`**: Số tiền rút (min 100.000 VND, max 50.000.000 VND), `idempotencyKey` ngăn chặn gửi lệnh trùng lặp.
- **`ReviewPayoutDto`**: Trạng thái `APPROVED` hoặc `REJECTED`, mã giao dịch đối tác ngân hàng `providerRef`.
- **`CreateFraudCaseDto`** & **`ResolveFraudCaseDto`**: Quản lý điều tra rủi ro (risk score 0-100, lý do nghi vấn, chứng cứ).

### 3.2 Dịch Vụ Rút Tiền & Sổ Cái Kép (`AffiliatePayoutService`)
1. **`submitKyc(userId, dto)`**:
   - Kiểm tra đối chiếu họ tên CCCD và chủ tài khoản ngân hàng.
   - Lưu trữ audit log bảo mật với trạng thái `PENDING_REVIEW`.
2. **`reviewKyc(profileId, reviewerId, dto)`**:
   - Admin phê duyệt hoặc từ chối kèm lý do; phát sinh audit log định danh người duyệt.
3. **`getKycStatus(userId)`**:
   - Truy vấn trạng thái KYC phục vụ giao diện CTV (`NOT_SUBMITTED`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`).
4. **`createPayoutRequest(userId, dto)`**:
   - **Gating 1 (KYC)**: Yêu cầu KYC đã được duyệt và có snapshot tài khoản ngân hàng hợp lệ.
   - **Gating 2 (Fraud)**: Tự động từ chối nếu CTV có hồ sơ nghi vấn gian lận đang mở (`OPEN`).
   - **Gating 3 (Tần suất)**: Tối đa 1 lệnh rút tiền trong vòng 24 giờ.
   - **Gating 4 (Số dư ví)**: Số dư khả dụng (`availableBalance`) phải lớn hơn hoặc bằng số tiền gross yêu cầu.
   - **Khấu trừ thuế**: Tính toán thuế TNCN 10% khi số tiền >= 2.000.000 VND; tính toán số tiền thực nhận (net amount).
   - **Giao dịch nguyên tử (Atomic Transaction)**:
     - Khấu trừ `availableBalance` và tăng `frozenBalance` tương ứng.
     - Tạo bản ghi `AffiliatePayoutRequest` ở trạng thái `PENDING`.
     - Tạo biến động số dư ví `FREEZE_AVAILABLE`.
     - Ghi nhận bút toán sổ cái kép:
       - `DEBIT: AFFILIATE_PAYABLE_AVAILABLE`
       - `CREDIT: AFFILIATE_PAYABLE_FROZEN`
     - Bắn sự kiện Outbox `AFFILIATE_PAYOUT_REQUESTED`.
5. **`approvePayout(payoutId, reviewerId, providerRef)`**:
   - Kiểm tra trạng thái `PENDING`.
   - Giảm `frozenBalance` và tăng `lifetimePaid` trên ví.
   - Tạo biến động ví `DEBIT_FROZEN_FOR_PAYOUT`.
   - Ghi nhận bút toán tất toán sổ cái:
     - `DEBIT: AFFILIATE_PAYABLE_FROZEN`
     - `CREDIT: AFFILIATE_PAYOUT_CLEARING`
   - Cập nhật trạng thái `COMPLETED` kèm mốc thời gian giải ngân và mã đối tác chuyển khoản (`providerRef`).
   - Bắn sự kiện Outbox `AFFILIATE_PAYOUT_COMPLETED`.
6. **`rejectPayout(payoutId, reviewerId, reason)`**:
   - Giải phóng số dư đóng băng hoàn trả về số dư khả dụng (`availableBalance`).
   - Tạo biến động ví `UNFREEZE_TO_AVAILABLE`.
   - Ghi nhận bút toán đảo sổ cái cân bằng:
     - `DEBIT: AFFILIATE_PAYABLE_FROZEN`
     - `CREDIT: AFFILIATE_PAYABLE_AVAILABLE`
   - Cập nhật trạng thái `REJECTED` kèm lý do từ chối.
7. **`listPayoutRequests(options)`**:
   - Hỗ trợ phân trang, lọc theo `profileId` hoặc trạng thái `AffiliatePayoutStatus`.

### 3.3 Dịch Vụ Kiểm Soát Gian Lận (`AffiliateFraudService`)
1. **`createFraudCase(dto, createdBy)`**: Khởi tạo hồ sơ điều tra gian lận (risk score, lý do, bằng chứng lưu lượng/đơn hàng) kèm audit log.
2. **`resolveFraudCase(caseId, reviewerId, dto)`**:
   - `CONFIRMED`: Xác nhận gian lận -> tự động đình chỉ đối tác (`status = SUSPENDED`), ghi nhận lý do và audit log bảo mật.
   - `DISMISSED`: Bác bỏ nghi vấn -> gỡ phong tỏa, xóa cờ cảnh báo.
3. **`listFraudCases(options)`**: Hàng đợi điều tra gian lận cho Admin với phân trang và chi tiết đối tác.
4. **`isProfileGatedForFraud(profileId)`**: Kiểm tra hồ sơ có đang bị chặn rút tiền do gian lận hay không.

### 3.4 API Endpoints Mở Rộng
- **CTV Endpoints (`AffiliateController`)**:
  - `POST /api/v1/affiliate/kyc`: Nộp hồ sơ CCCD & tài khoản ngân hàng.
  - `GET /api/v1/affiliate/kyc`: Tra cứu tình trạng duyệt KYC.
  - `POST /api/v1/affiliate/payouts`: Tạo lệnh rút tiền hoa hồng.
  - `GET /api/v1/affiliate/payouts`: Lịch sử các lệnh rút tiền cá nhân.
- **Admin Endpoints (`AffiliateAdminController`)**:
  - `POST /api/v1/admin/affiliates/kyc/:profileId/review`: Duyệt hoặc từ chối hồ sơ KYC.
  - `GET /api/v1/admin/affiliates/payouts`: Danh sách yêu cầu rút tiền toàn hệ thống.
  - `POST /api/v1/admin/affiliates/payouts/:id/approve`: Duyệt lệnh và xác nhận giải ngân.
  - `POST /api/v1/admin/affiliates/payouts/:id/reject`: Từ chối lệnh và hoàn trả số dư ví.
  - `GET /api/v1/admin/affiliates/fraud`: Hàng đợi điều tra gian lận.
  - `POST /api/v1/admin/affiliates/fraud`: Mở hồ sơ điều tra gian lận.
  - `POST /api/v1/admin/affiliates/fraud/:id/resolve`: Xử lý kết luận hồ sơ gian lận.

---

## 4. Bằng Chứng Kiểm Thử Kỹ Thuật (Test Evidence)

### 4.1 Unit & Integration Test Suite (`affiliate-payout-fraud.spec.ts`)
- **Kết quả:** `18 passed / 18 total (100%)`
  1. `submitKyc`: Kiểm tra tên CCCD trùng khớp với tên chủ tài khoản ngân hàng (Pass).
  2. `submitKyc`: Chặn nộp hồ sơ khi tên trên CCCD không trùng chủ tài khoản ngân hàng (Pass).
  3. `reviewKyc`: Admin phê duyệt hồ sơ KYC (Pass).
  4. `reviewKyc`: Admin từ chối hồ sơ kèm lý do (Pass).
  5. `getKycStatus`: Trả về trạng thái KYC kèm snapshot ngân hàng (Pass).
  6. `createPayoutRequest`: Chặn rút tiền khi chưa hoàn tất KYC (Pass).
  7. `createPayoutRequest`: Chặn rút tiền khi có hồ sơ nghi vấn gian lận đang mở `OPEN` (Pass).
  8. `createPayoutRequest`: Chặn rút tiền vượt tần suất 1 lần trong 24 giờ (Pass).
  9. `createPayoutRequest`: Chặn rút tiền vượt số dư khả dụng (Pass).
  10. `createPayoutRequest`: Khấu trừ thuế 10% khi rút >= 2.000.000 VND & ghi sổ cái đóng băng (Pass).
  11. `createPayoutRequest`: Miễn khấu trừ thuế (thuế = 0) khi rút < 2.000.000 VND (Pass).
  12. `approvePayout`: Duyệt giải ngân, trừ số dư đóng băng và ghi sổ cái chuyển khoản `CLEARING` (Pass).
  13. `rejectPayout`: Từ chối giải ngân, hoàn trả số dư về khả dụng và đảo bút toán sổ cái (Pass).
  14. `approvePayout`/`rejectPayout`: Chặn thao tác trùng lặp trên lệnh đã hoàn tất (Pass).
  15. `createFraudCase`: Tạo hồ sơ gian lận và ghi nhận audit log (Pass).
  16. `resolveFraudCase`: Kết luận `CONFIRMED` -> tự động khóa đối tác `SUSPENDED` (Pass).
  17. `resolveFraudCase`: Kết luận `DISMISSED` -> giải phóng cờ cảnh báo (Pass).
  18. `isProfileGatedForFraud`: Kiểm tra chính xác trạng thái cấm rút tiền của đối tác (Pass).

### 4.2 Tổng Hợp Toàn Bộ Test Suites Commerce Service
- **Lệnh thực thi:** `npx jest apps/commerce-service/src/modules/affiliate/`
- **Kết quả:** **9 passed / 9 test suites, 114 passed / 114 tests (100%)**
  - `affiliate-checkout.spec.ts`: 12 tests passed
  - `affiliate-dashboard.spec.ts`: 6 tests passed
  - `affiliate-lifecycle.spec.ts`: 10 tests passed
  - `affiliate-payout-fraud.spec.ts`: 18 tests passed
  - `affiliate-wallet-settlement.spec.ts`: 13 tests passed
  - `affiliate-link.spec.ts`: 11 tests passed
  - `affiliate-foundation.spec.ts`: 16 tests passed
  - `seller-affiliate.spec.ts`: 14 tests passed
  - `affiliate-application.spec.ts`: 14 tests passed

### 4.3 Playwright End-to-End Suite
- **Lệnh thực thi:** `npx playwright test e2e/affiliate.spec.ts` (tại thư mục `web`)
- **Kết quả:** **16 passed / 16 tests (100%)**
- **Thời gian chạy:** 34.4s

### 4.4 Build & Typecheck
- `npm run build:commerce`: **0 errors** (TypeScript biên dịch thành công `tsc -p apps/commerce-service/tsconfig.app.json`).
- `npx tsc --noEmit` (tại thư mục `web`): **0 errors**.

---

## 5. Điểm Dừng Nghiệp Vụ
Đã hoàn thành toàn bộ công việc theo yêu cầu của **Giai đoạn 10**.

**DỪNG LẠI CHỜ LỆNH CHỦ DỰ ÁN TRƯỚC KHI BẮT ĐẦU GIAI ĐOẠN 11 (Observability, infrastructure và performance).**
