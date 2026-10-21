# BÁO CÁO NGHIỆM THU GIAI ĐOẠN 6: CHECKOUT CALCULATION VÀ PENDING SNAPSHOT

**Ngày nghiệm thu:** 21/10/2026  
**Dự án:** HuKi Ebook — Hệ thống Tiếp thị liên kết (Affiliate Marketing)  
**Trạng thái:** HOÀN THÀNH TOÀN DIỆN (100% Tests Pass, 0 Lỗi TypeScript, 0 Mock Data)

---

## 1. TỔNG QUAN VÀ CÁC QUYẾT ĐỊNH KIẾN TRÚC ĐÃ KHÓA

Trước khi triển khai mã nguồn, 4 quyết định thiết kế cốt lõi đã được xác nhận và khóa thống nhất:

1. **Cơ sở tính hoa hồng (Commission Base):**  
   Tính trên giá thực tế của sách sau khi trừ chiết khấu trực tiếp của Shop (Shop Discount/Flash Sale); tuyệt đối không bị trừ bởi Voucher trợ giá từ Sàn HuKi chịu.
2. **Phạm vi ghi nhận (Attribution Scope):**  
   Cơ chế Line-item attribution:
   - Link cấp sách (`targetType = 'BOOK'`): Chỉ ghi nhận hoa hồng cho đúng cuốn sách được gắn link.
   - Link cấp gian hàng (`targetType = 'STORE'`): Ghi nhận cho tất cả sách hợp lệ cùng Shop trong đơn hàng.
   - Link toàn sàn / chiến dịch (`targetType = 'HOME'`): Ghi nhận cho toàn bộ sách hợp lệ được đặt.
3. **Thời điểm tạo Snapshot hoa hồng PENDING (COD & Online Payment):**  
   Snapshot được tạo ngay trong Transaction đặt hàng thành công (`Order Placed`) ở trạng thái `PENDING`. Khi đơn hàng giao thành công (`DELIVERED`) hoặc thanh toán xong (đối với sách số), State Machine ở Giai đoạn 7 sẽ kích hoạt chuyển sang `HOLDING` (7 ngày với sách giấy, 24h với sách số).
4. **Minh bạch và bảo vệ quyền riêng tư người mua (Buyer Disclosure & Anonymity):**  
   Phía người mua được bảo mật thông tin tuyệt đối (Opaque/Ẩn danh hoàn toàn theo chuẩn Shopee/TikTok Shop): Không rò rỉ bất kỳ danh tính, mã CTV hay số tiền hoa hồng đối tác nào trong phản hồi checkout gửi về trình duyệt của Buyer.

---

## 2. CÁC HẠNG MỤC ĐÃ TRIỂN KHAI

### 2.1 Backend Commerce Service (`commerce-service`)
- **Dịch vụ `AffiliateCheckoutService`:**
  - `resolveAttribution`: Xác thực token hoặc session nonce từ cookie/header; kiểm tra thời hạn hiệu lực (`expiresAt`), trạng thái liên kết (`isActive`), trạng thái đối tác (`profile.status === 'ACTIVE'`).
  - **Cơ chế chống tự mua (Anti-Fraud Self-Referral):** Chặn hoàn toàn việc đối tác tự bấm link của chính mình để mua hàng (`buyerUserId === profile.userId`).
  - `createPendingCommissions`: Tính toán cơ sở hoa hồng, gọi `AffiliatePolicyResolverService` để lấy tỷ lệ hoa hồng có hiệu lực theo 3 cấp phân cấp, ghi nhận snapshot hoa hồng vào bảng `affiliate_commissions` với trạng thái `PENDING`.
  - Tự động đánh dấu chuyển đổi `isConverted = true`, tăng `conversionCount` của link và phát sinh Outbox Event `AFFILIATE_COMMISSION_CREATED`.
- **Tích hợp vào `CheckoutService.confirm`:**
  - Inject `AffiliateCheckoutService` vào transaction đặt hàng.
  - Phân bổ chiết khấu Shop theo tỷ trọng từng dòng sản phẩm (`sellerDiscountAllocated`).
  - Tạo snapshot hoa hồng nguyên tử (Atomic) trong cùng transaction với `order`, `sellerOrder`, `orderItem`.
- **Nâng cấp `CheckoutController.confirm` & DTO:**
  - Mở rộng `CheckoutConfirmDto` chấp nhận `affiliateToken`.
  - Tự động fallback trích xuất token từ header `x-affiliate-token` hoặc cookie `huki_aff_click`.

### 2.2 Web Frontend (`web`)
- **Nâng cấp `checkoutApi.confirmCheckout`:**
  - Tự động đọc cookie `huki_aff_click` và đính kèm vào header `x-affiliate-token` cũng như request payload khi Buyer xác nhận thanh toán.
  - Đảm bảo phản hồi Checkout không để lộ PII của CTV cho Buyer.

### 2.3 Sửa lỗi mạng & CORS Gateway
- Sửa triệt để lỗi `LỖI HỆ THỐNG - Đăng nhập thất bại: Không thể kết nối đến máy chủ`:
  - Loại bỏ header `access-control-*` từ upstream microservices trả về trong `service-proxy.middleware.ts` để không ghi đè cấu hình CORS của API Gateway (ngăn chặn xung đột wildcard `*` với `credentials: 'include'`).
  - Cập nhật whitelist CORS động tại `api-gateway/src/main.ts` hỗ trợ đầy đủ `localhost` và `127.0.0.1` trên các cổng phát triển.

---

## 3. BẰNG CHỨNG KIỂM THỬ KỸ THUẬT

| Hạng mục kiểm thử | Công cụ | Số lượng | Kết quả |
|---|---|---|---|
| **API Gateway Unit Tests** | Jest | 2 suites / 27 tests | **27/27 PASS (100%)** |
| **Commerce Affiliate Unit Tests** | Jest | 5 suites / 65 tests | **65/65 PASS (100%)** |
| **Checkout Service Unit Tests** | Jest | 1 suite / 3 tests | **3/3 PASS (100%)** |
| **Web Frontend Vitest Tests** | Vitest | 5 suites / 41 tests | **41/41 PASS (100%)** |
| **Playwright End-to-End Suite** | Playwright | 1 suite / 16 tests | **16/16 PASS (100%)** |
| **TypeScript Typecheck** | `tsc --noEmit` | `web` & `platform` | **0 ERRORS** |

---

## 4. KẾT LUẬN & SẴN SÀNG CHO GIAI ĐOẠN 7

Toàn bộ nghiệp vụ tính toán hoa hồng tại Checkout, phân bổ chiết khấu, ghi nhận snapshot PENDING và ngăn chặn gian lận tự mua đã hoàn tất và được kiểm chứng tự động.

Theo lộ trình `task/AFFILIATE-MARKETING-AUDIT-ROADMAP.md`:
> **DỪNG LẠI CHỜ LỆNH CỦA NGƯỜI DÙNG TRƯỚC KHI BƯỚC VÀO GIAI ĐOẠN 7.**
