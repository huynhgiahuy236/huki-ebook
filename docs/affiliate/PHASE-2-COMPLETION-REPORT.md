# Báo Cáo Nghiệm Thu Giai Đoạn 2: Data Model, Migration, Policy Engine & Audit Foundation

> **Dự án:** HuKi E-Commerce Platform — Hệ Thống Tiếp Thị Liên Kết (Affiliate Marketing)  
> **Thời điểm hoàn thành:** 2026-10-21  
> **Trạng thái:** Hoàn tất, 100% test pass, sẵn sàng cho Giai đoạn 3 (Registration & Admin Review).

---

## 1. Tóm Tắt Kết Quả Triển Khai Giai Đoạn 2

Giai đoạn 2 đã hoàn thành toàn bộ các hạng mục cốt lõi về tầng dữ liệu, migration, công cụ tính toán chính sách hoa hồng 3 cấp (Policy Engine), máy trạng thái hoa hồng (Commission State Machine) và nền tảng kiểm toán (Audit Foundation) theo đúng các quyết định kiến trúc đã khóa với chủ dự án.

### 1.1 Cơ Sở Dữ Liệu & Prisma Migration
- **Prisma Schema (`platform/apps/commerce-service/prisma/schema.prisma`):**
  - Mở rộng enum `LedgerAccountType` với 5 tài khoản kế toán kép:
    - `AFFILIATE_PAYABLE_PENDING`
    - `AFFILIATE_PAYABLE_AVAILABLE`
    - `AFFILIATE_PAYABLE_FROZEN`
    - `SELLER_COMMISSION_EXPENSE`
    - `AFFILIATE_PAYOUT_CLEARING`
  - Bổ sung 8 enum miền Affiliate:
    - `AffiliatePartnerStatus`, `AffiliateApplicantType`, `AffiliateChannelType`, `AffiliateFollowersRange`, `AffiliateCommissionStatus`, `AffiliateLinkTargetType`, `AffiliatePayoutStatus`, `AffiliateWalletTxType`.
  - Bổ sung 14 bảng quan hệ với đầy đủ khóa ngoại, chỉ mục hiệu năng và ràng buộc toàn vẹn:
    1. `affiliate_profiles` (Hồ sơ đối tác)
    2. `affiliate_channels` (Kênh quảng bá, cấm trùng URL trong cùng hồ sơ)
    3. `affiliate_consents` (Lưu vết chấp thuận điều khoản & marketing consent)
    4. `affiliate_policies` (Chính sách sàn toàn hệ thống)
    5. `store_affiliate_settings` (Cấu hình hoa hồng gian hàng)
    6. `book_affiliate_settings` (Ghi đè hoa hồng cấp cuốn sách)
    7. `affiliate_links` (Quản lý shortCode `/r/[shortCode]` và campaign/subId)
    8. `affiliate_attributions` (Attribution session bền vững với nonce & cookie token hash)
    9. `affiliate_commissions` (Snapshot hoa hồng từng item đơn hàng)
    10. `affiliate_wallets` (Ví riêng cho Affiliate cá nhân, tách bạch khỏi Store)
    11. `affiliate_wallet_transactions` (Lịch sử biến động ví có idempotency key)
    12. `affiliate_payout_requests` (Yêu cầu rút tiền đối tác)
    13. `affiliate_fraud_cases` (Hồ sơ gian lận & nghi vấn vi phạm)
    14. `affiliate_audit_logs` (Nhật ký kiểm toán hành vi quản trị)
- **Migration Đã Triển Khai:**
  - File migration: `platform/apps/commerce-service/prisma/migrations/20261021210000_affiliate_marketing_foundation/migration.sql`.
  - Đã chạy `prisma migrate deploy` vào cơ sở dữ liệu PostgreSQL `huki_commerce` thành công 100%.

---

## 2. Các Thành Phần Backend Đã Hiện Thực

### 2.1 Policy Resolver Service (`AffiliatePolicyResolverService`)
- Vị trí: `platform/apps/commerce-service/src/modules/affiliate/policy-engine/affiliate-policy-resolver.service.ts`.
- Thực thi đúng phân cấp ưu tiên 3 cấp:
  1. **Cấp 1 (Ưu tiên cao nhất):** `BookAffiliateSetting`. Nếu `isEligible = false`, trả về không đủ điều kiện (hoa hồng 0). Nếu có `customRate`, sử dụng tỷ lệ này.
  2. **Cấp 2:** `StoreAffiliateSetting`. Nếu `isEnabled = false`, trả về không đủ điều kiện. Phân tách tỷ lệ theo định dạng sách (`physicalRate`, `ebookRate`, `audioRate`).
  3. **Cấp 3:** `AffiliatePolicy` (Sàn). Tự động dùng tỷ lệ mặc định còn hiệu lực (`defaultPhysicalRate = 5%`, `defaultEbookRate = 10%`, `defaultAudioRate = 10%`).
- Tính toán tiền hoa hồng:
  - `commissionBase = Math.max(0, (itemPrice * quantity) - sellerDiscountAllocated)`.
  - `commissionAmount = Math.floor(commissionBase * ratePercent / 100)` (làm tròn số nguyên VND theo AFF-DEC, chặn trần không vượt quá commissionBase).
- Quy tắc Holding:
  - Sách giấy (Physical): 7 ngày sau khi giao hàng thành công (`deliveredAt + 7 days`).
  - Sách số / Audio: 24 giờ sau khi thanh toán (`paidAt + 24 hours`).

### 2.2 Commission State Machine (`AffiliateCommissionStateMachineService`)
- Vị trí: `platform/apps/commerce-service/src/modules/affiliate/state-machine/affiliate-commission-state-machine.service.ts`.
- Quản lý vòng đời trạng thái hoa hồng và tính toán kế toán kép:
  - `PENDING -> HOLDING`: Khởi tạo chu kỳ holding và ghi nhận vào `holdingBalance` của `AffiliateWallet`.
  - `HOLDING -> AVAILABLE` (Settlement):
    - Chặn giải ngân nếu `disputeBlocked === true` (đang có khiếu nại chưa giải quyết).
    - Chặn giải ngân nếu chưa đến hạn `holdingUntil`.
    - Ghi nhận bút toán kế toán kép cân bằng vào `ledger_transactions` và `ledger_entries`:
      - **Nợ (DEBIT):** `SELLER_COMMISSION_EXPENSE` (storeId)
      - **Có (CREDIT):** `AFFILIATE_PAYABLE_AVAILABLE`
    - Cập nhật số dư `AffiliateWallet`: chuyển `holdingBalance -> availableBalance`, cộng dồn `lifetimeEarned`.
    - Đảm bảo tính Idempotent tuyệt đối (gọi lại nhiều lần không nhân đôi tiền).
  - `PENDING / HOLDING -> CANCELLED`: Hủy hoa hồng khi đơn hàng bị hủy/hoàn trước khi giải ngân, hoàn trả số dư holding của ví.
  - `AVAILABLE -> REVERSED`: Xử lý hoàn tiền / đảo bút toán sau giải ngân:
    - **Nợ (DEBIT):** `AFFILIATE_PAYABLE_AVAILABLE`
    - **Có (CREDIT):** `SELLER_COMMISSION_EXPENSE` (storeId)
    - Khấu trừ `availableBalance` của ví.
  - Cơ chế kiểm soát tranh chấp (`blockDispute` / `unblockDispute`).

### 2.3 Audit Service (`AffiliateAuditService`)
- Vị trí: `platform/apps/commerce-service/src/modules/affiliate/audit/affiliate-audit.service.ts`.
- Ghi nhận đầy đủ thông tin kiểm toán vào `affiliate_audit_logs` đồng thời chuyển tiếp sang `audit_logs` chung của hệ thống với khử trùng PII (`AuditSanitizer`) và tính toán `changedFields`.

---

## 3. Bằng Chứng Kiểm Thử (Test Evidence)

### 3.1 Unit & Integration Tests Mới (Affiliate Foundation)
- File: `platform/apps/commerce-service/src/modules/affiliate/affiliate-foundation.spec.ts`
- Kết quả: **13/13 tests pass (100%)**
  - Kiểm tra 3 cấp phân cấp chính sách (Book override, Store settings, Platform fallback).
  - Kiểm tra khấu trừ discount, phép làm tròn `Math.floor` VND và chặn trần số tiền hoa hồng.
  - Kiểm tra chuyển trạng thái `PENDING -> HOLDING`, `HOLDING -> AVAILABLE`, `HOLDING -> CANCELLED`, `AVAILABLE -> REVERSED`.
  - Kiểm tra chặn settlement khi có tranh chấp (`disputeBlocked`) hoặc chưa hết holding.
  - Kiểm tra bút toán cân bằng Double-Entry Ledger (Nợ Chi phí Seller / Có Phải trả Affiliate).
  - Kiểm tra tính Idempotent khi gọi settlement nhiều lần.

### 3.2 Kiểm Thử Toàn Bộ Hệ Thống Commerce (Regression Test)
- Lệnh: `npm run test:commerce` (Jest)
- Kết quả: **28/28 Test Suites pass, 338/338 Tests pass, 0 failures!**
- Thời gian chạy: ~51 giây.

### 3.3 Kiểm Thử Biên Dịch Mã Nguồn & Frontend Hygiene
- Platform TypeScript build (`npm run build:commerce`): **0 errors**.
- Web Frontend typecheck (`npm run typecheck`): **0 errors**.

---

## 4. Trạng Thái & Bước Tiếp Theo

- **Giai đoạn 2:** Đã hoàn thành toàn bộ, cơ sở dữ liệu đã migrate và hoạt động thực tế.
- **Tuân thủ nguyên tắc:** **DỪNG LẠI CHỜ LỆNH CỦA CHỦ DỰ ÁN** trước khi khởi động Giai đoạn 3 (Registration và Admin review end-to-end).
