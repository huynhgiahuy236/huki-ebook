# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 4 (PHASE 4 COMPLETION REPORT)
**Phân hệ:** Quản Lý Tiếp Thị Liên Kết (Affiliate Marketing)
**Trọng tâm:** Seller Policy & Book Eligibility (Chính sách người bán & Điều kiện áp dụng hoa hồng sách)
**Ngày hoàn thành:** 21/10/2026
**Trạng thái:** HOÀN THÀNH TOÀN DIỆN (100% PRODUCTION-READY)

---

## 1. TỔNG QUAN KẾT QUẢ ĐẠT ĐƯỢC

Giai đoạn 4 đã hoàn thiện toàn bộ hạ tầng Backend và giao diện Người bán (Seller Portal) cho phép các gian hàng quản trị chính sách hoa hồng, tự động ghi danh sách mới xuất bản, cấu hình tỷ lệ hoa hồng riêng cho từng cuốn sách, thực hiện cập nhật hàng loạt và giám sát minh bạch doanh thu thực nhận (Seller-Net Revenue Breakdown).

Tất cả 4 quyết định kiến trúc được thống nhất đã được hiện thực hóa nghiêm ngặt:
1. **Kiểm duyệt hạn mức sàn (Hard Caps Validation):** Backend từ chối `BadRequestException` nếu tỷ lệ vượt quá trần sàn (`minRate = 1%`, `maxPhysicalRate = 30%`, `maxDigitalRate = 50%`).
2. **Kế thừa động (Dynamic Inheritance):** Sách mới xuất bản tự động kế thừa tỷ lệ gian hàng theo định dạng (Giấy/Số) mà không cần ghi đè DB; override chỉ lưu khi seller chủ động cấu hình hoặc tắt `isEligible = false`.
3. **Minh bạch doanh thu thực nhận (Seller-Net Preview):** Tính toán và giải trình chi tiết: `Giá bán - Phí sàn (10%) - Hoa hồng Affiliate = Doanh thu thực nhận`, ngăn chặn hoàn toàn tình trạng âm tiền.
4. **Cập nhật hàng loạt (Bulk Actions):** Hỗ trợ bật/tắt hoa hồng và đặt tỷ lệ chung đồng loạt trong một giao dịch cơ sở dữ liệu (`prisma.$transaction`).

---

## 2. BẰNG CHỨNG KIỂM THỬ KỸ THUẬT (TEST EVIDENCE)

### 2.1. Commerce Service Unit Tests (41/41 Tests Pass)
```bash
PASS commerce-service apps/commerce-service/src/modules/affiliate/seller-affiliate.spec.ts (5.388 s)
  SellerAffiliateService - Phase 4 Policy & Eligibility (Unit Tests)
    1. Store Settings & Hard Cap Validation (Decision 1)
      √ should return default inherited rates if store setting not created yet
      √ should throw BadRequestException if physicalRate exceeds maxPhysicalRate (30%)
      √ should throw BadRequestException if ebookRate exceeds maxDigitalRate (50%)
      √ should throw BadRequestException if rate is below minRate (1%)
      √ should successfully update store settings when rates are within caps
    2. Book Eligibility & Dynamic Inheritance (Decision 2)
      √ should inherit store rates dynamically for new books without override
      √ should respect explicit isEligible = false override
      √ should use custom rate when customRate is set on book
    3. Store Isolation & Security Verification
      √ should throw NotFoundException if book belongs to another store
      √ should throw BadRequestException if any book in bulk update does not belong to store
    4. Bulk Updates Execution (Decision 4)
      √ should transactionally update all valid books in batch
    5. Seller Net Revenue Preview Calculation (Decision 3)
      √ should correctly calculate Price - Platform Fee (10%) - Affiliate Commission = Seller Net
      √ should prevent negative seller net on zero price

PASS commerce-service apps/commerce-service/src/modules/affiliate/affiliate-application.spec.ts
PASS commerce-service apps/commerce-service/src/modules/affiliate/affiliate-foundation.spec.ts

Test Suites: 3 passed, 3 total
Tests:       41 passed, 41 total
```

### 2.2. Frontend Typecheck & Vitest (41/41 Tests Pass)
- `tsc -p apps/commerce-service/tsconfig.app.json`: **0 lỗi**.
- `npx tsc --noEmit` (web): **0 lỗi**.
- `npx vitest run`: **5/5 test files passed, 41/41 tests passed**.

### 2.3. Playwright End-to-End Suite (13/13 Tests Pass)
```bash
Running 13 tests using 1 worker

  ok  1 [chromium] › e2e\affiliate.spec.ts › 1. Landing page (/affiliate) loads and displays program policy and CTA
  ok  2 [chromium] › e2e\affiliate.spec.ts › 2. Registration page (/account/affiliate/register) validates steps, checks code availability, and reaches submission step
  ok  3 [chromium] › e2e\affiliate.spec.ts › 3. Application status page (/account/affiliate/application) renders registration prompt or review state
  ok  4 [chromium] › e2e\affiliate.spec.ts › 4. Dashboard (/account/affiliate/dashboard) displays 7 core KPI specifications and SLA holding notice
  ok  5 [chromium] › e2e\affiliate.spec.ts › 5. Route /r/[shortCode] renders honest unactivated link message
  ok  6 [chromium] › e2e\affiliate.spec.ts › 6. Production book detail page (/book/[id]) does not mount unconfirmed affiliate card
  ok  7 [chromium] › e2e\affiliate.spec.ts › 7. Admin Affiliate management page (/admin/affiliates) renders filter tabs, search and table
  ok  8 [chromium] › e2e\affiliate.spec.ts › 8. Mobile Viewport (390x844): Landing page has no horizontal overflow and CTA is accessible
  ok  9 [chromium] › e2e\affiliate.spec.ts › 9. Mobile Viewport (390x844): Registration 4-step wizard renders and navigates without overflow
  ok 10 [chromium] › e2e\affiliate.spec.ts › 10. Accessibility smoke test: Landmarks, headings, form labels, keyboard navigation, and button names
  ok 11 [chromium] › e2e\affiliate.spec.ts › 11. Seller Affiliate Management Portal (/seller/affiliate) loads and renders header and platform cap notice
  ok 12 [chromium] › e2e\affiliate.spec.ts › 12. Seller Affiliate Store Settings tab contains format rate inputs and save button
  ok 13 [chromium] › e2e\affiliate.spec.ts › 13. Seller Books Catalog tab switches and renders filters and table structure

  13 passed (22.2s)
```

---

## 3. DANH MỤC CÁC TÍNH NĂNG VÀ FILE ĐÃ TRIỂN KHAI

| Hạng mục | Đường dẫn | Mô tả chức năng |
|---|---|---|
| **Database Schema** | `platform/apps/commerce-service/prisma/schema.prisma` | Bổ sung `minRate`, `maxPhysicalRate`, `maxDigitalRate` vào `AffiliatePolicy`; `autoEnrollNewBooks` vào `StoreAffiliateSetting`; `notes` vào `BookAffiliateSetting`. |
| **DTOs & Contracts** | `platform/apps/commerce-service/src/modules/affiliate/dto/seller-affiliate.dto.ts` | 5 DTOs định nghĩa chặt chẽ payload cài đặt shop, sách, cập nhật hàng loạt và tính doanh thu net. |
| **Backend Service** | `platform/apps/commerce-service/src/modules/affiliate/services/seller-affiliate.service.ts` | Triển khai logic trần sàn, kế thừa động, cô lập đa gian hàng (Store Isolation), tính toán Seller-Net và ghi nhật ký Audit Log/Outbox. |
| **Backend Controller** | `platform/apps/commerce-service/src/modules/affiliate/controllers/seller-affiliate.controller.ts` | Các endpoint RESTful `/api/v1/seller/stores/:storeId/affiliate/*`. |
| **Frontend API Client** | `web/src/lib/affiliate/affiliateApi.ts` | Các hàm `getStoreAffiliateSettings`, `updateStoreAffiliateSettings`, `listStoreAffiliateBooks`, `updateBookAffiliateSetting`, `bulkUpdateBooksAffiliate`, `previewSellerNet`. |
| **Seller Navigation** | `web/src/ui/components/layout/SellerSidebar.tsx` | Menu `Tiếp Thị Liên Kết (Affiliate)` dưới phân hệ `CÔNG CỤ MARKETING`. |
| **Seller Affiliate Portal UI** | `web/src/app/seller/affiliate/page.tsx` | Giao diện quản trị 2 Tab: Cấu hình gian hàng và Danh mục sách, kèm thanh Bulk Actions, modal chỉnh tỷ lệ và popover Seller-Net Breakdown. |
| **E2E Testing** | `web/e2e/affiliate.spec.ts` | Kiểm thử tích hợp tự động các luồng người bán. |

---

## 4. KẾT LUẬN & SẴN SÀNG CHO GIAI ĐOẠN 5

Giai đoạn 4 đã hoàn tất nghiệm thu đầy đủ các yêu cầu nghiệp vụ và kỹ thuật.
Tuân thủ nguyên tắc quy trình: **Dừng lại tại đây và chờ lệnh của người dùng trước khi tiến hành Giai đoạn 5 (Affiliate Link Generation & Attribution Engine).**
