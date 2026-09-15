# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 8
## CHỒNG MÃ GIẢM GIÁ ĐA TẦNG (VOUCHER STACKING: SHOP VOUCHER + PLATFORM VOUCHER + FREESHIP VOUCHER)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện engine tính toán và áp dụng đồng thời 3 tầng voucher độc lập (`Shop Voucher`, `Platform Voucher`, `Freeship Voucher`) trong một đơn hàng. Đảm bảo công thức toán học trừ tuần tự chính xác tuyệt đối, khóa lượt dùng nguyên tử chống lạm dụng, tự động hoàn trả khi hủy đơn và hạch toán tài chính Escrow minh bạch giữa Sàn và Nhà bán hàng.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `promotion-service`: Module `VouchersModule`, `VouchersService`, `VoucherCalculationEngine`.
    * `order-service`: Tích hợp bước xác thực voucher khi tạo đơn, lưu chi tiết chiết khấu vào `orders`.
    * `escrow-service` / `payment-service`: Hạch toán doanh thu thực nhận cho Seller và chi phí tài trợ chiết khấu của Sàn Huki.
  * **Frontend (Admin, Seller & Storefront)**:
    * `web/src/ui/pages/admin/AdminVouchersPage.jsx`: Quản trị tạo mã Platform Voucher và Freeship Voucher toàn sàn.
    * `web/src/ui/pages/seller/SellerVouchersPage.jsx`: Giao diện Seller tạo mã khuyến mãi riêng của Gian hàng.
    * `web/src/ui/components/checkout/VoucherSelectionModal.jsx`: Modal chọn voucher 3 tầng thông minh với tính năng tự động gợi ý mã tối ưu nhất (Auto Best Match).
    * `web/src/ui/pages/checkout/CheckoutPage.jsx`: Bảng tóm tắt chi phí phân bổ chiết khấu chi tiết từng tầng.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 8
                                           │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  CALCULATION ENGINE    BACKEND APIS &        FRONTEND UI &    TESTING SUITE &
DATA MODEL       & ATOMIC USAGE LOCK   ESCROW SETTLEMENT     SELECTION MODAL  FINANCIAL AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA VOUCHERS

### 📌 Mục tiêu:
Thiết lập cấu trúc bảng lưu trữ thông tin voucher và lịch sử sử dụng chi tiết trên PostgreSQL.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `vouchers`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `code`: String, Unique, Index.
    * `voucher_type`: Enum (`SHOP_VOUCHER`, `PLATFORM_VOUCHER`, `FREESHIP_VOUCHER`).
    * `business_id`: UUID (Nullable - chỉ có giá trị nếu là `SHOP_VOUCHER`).
    * `discount_type`: Enum (`PERCENT`, `FIXED_AMOUNT`).
    * `discount_value`: Decimal.
    * `max_discount_amount`: Decimal (Nullable).
    * `min_order_value`: Decimal (Default: 0).
    * `total_usage_limit`: Int.
    * `used_count`: Int (Default: 0).
    * `per_user_limit`: Int (Default: 1).
    * `valid_from`: DateTime, `valid_to`: DateTime.
    * `is_active`: Boolean (Default: true).

* **Task 1.2: Thiết kế Bảng `voucher_usages` (Audit Trail)**
  * Định nghĩa bảng lịch sử sử dụng:
    * `id`: UUID, Primary Key.
    * `voucher_id`: UUID, FK `vouchers`.
    * `user_id`: UUID, Index.
    * `order_id`: UUID, Index.
    * `discount_amount`: Decimal.
    * `used_at`: DateTime.

---

## PHẦN 2: PHÁT TRIỂN THUẬT TOÁN TÍNH TOÁN GIẢM TRỪ 3 TẦNG & ATOMIC USAGE LOCK

### 📌 Mục tiêu:
Xây dựng engine tính toán chiết khấu tuần tự, đảm bảo không bao giờ giảm âm tiền và khóa lượt dùng an toàn trên Redis.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Xây dựng Module `VoucherCalculationEngine`**
  * Hàm `calculateStackingDiscount(cartItems, shippingFee, selectedVouchers)`:
    * Bước 1: Tính giảm giá Shop Voucher trên tổng giá trị hàng của riêng từng Shop.
    * Bước 2: Tính giảm giá Platform Voucher trên phần tiền hàng còn lại toàn đơn:
      $$\text{PlatformDiscount} = \min(\text{RemainingSubtotal}, \text{CalculatedDiscount})$$
    * Bước 3: Tính giảm giá Freeship Voucher trên phí vận chuyển:
      $$\text{ShippingDiscount} = \min(\text{OriginalShippingFee}, \text{FreeshipValue})$$
    * Bước 4: Trả về chi tiết các khoản giảm và tổng tiền thanh toán cuối cùng.

* **Task 2.2: Khóa Lượt Dùng Nguyên Tử Bằng Redis Lua Script (`reserve_vouchers.lua`)**
  * Kiểm tra và tăng số lượt đã dùng của mã và của từng người dùng trong cùng một thao tác atomic:
    * `HINCRBY voucher:{id} used_count 1`.
    * `HINCRBY voucher:{id}:users {userId} 1`.
  * Nếu vượt hạn mức: Rollback ngay lập tức và trả về mã lỗi `ERR_VOUCHER_LIMIT_EXCEEDED`.

---

## PHẦN 3: XÂY DỰNG BACKEND APIS & TÍCH HỢP HẠCH TOÁN ESCROW

### 📌 Mục tiêu:
Phát triển các RESTful APIs quản trị voucher và tích hợp logic phân bổ dòng tiền thanh toán cho Seller.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Bộ API Quản Trị Voucher Cho Admin & Seller**
  * `POST /api/v1/promotions/vouchers`: Tạo mã voucher mới (Admin tạo Sàn/Freeship, Seller tạo Shop Voucher).
  * `GET /api/v1/promotions/vouchers/my-vouchers`: Seller xem danh sách mã của gian hàng kèm số lượt đã dùng.
  * `PATCH /api/v1/promotions/vouchers/:id/toggle`: Bật / Tắt kích hoạt voucher.

* **Task 3.2: API Kiểm Tra & Tự Động Gợi Ý Mã Tối Ưu Nhất (Storefront)**
  * **Endpoint**: `POST /api/v1/promotions/vouchers/applicable`
  * **Body**: `{ items: [...], shippingFee: 30000 }`
  * **Logic**: Trả về danh sách tất cả các mã hợp lệ và tự động đánh dấu 3 mã tối ưu nhất (`is_best_combination: true`).

* **Task 3.3: Tích hợp Hạch toán Doanh thu Escrow trong `escrow-service`**
  * Khi đơn hàng hoàn tất:
    * Doanh thu ghi nhận vào ví Seller = `Subtotal - ShopDiscount`.
    * Phần giảm giá của Sàn (`PlatformDiscount` + `ShippingDiscount`) được hạch toán vào mục chi phí tiếp thị của Sàn Huki, không bị trừ vào tiền của Shop.

* **Task 3.4: Tự Động Hoàn Trả Lượt Dùng Khi Hủy Đơn**
  * Lắng nghe sự kiện `ORDER_CANCELLED`:
    * Giảm `used_count` của các voucher liên quan.
    * Xóa bản ghi trong `voucher_usages`.

---

## PHẦN 4: GIAO DIỆN QUẢN TRỊ & MODAL CHỌN VOUCHER TẠI STOREFRONT

### 📌 Mục tiêu:
Xây dựng giao diện chọn mã thông minh, tiện lợi cho độc giả và bảng quản trị voucher chuyên nghiệp cho người bán.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Giao diện Quản Lý Voucher Seller ([`SellerVouchersPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerVouchersPage.jsx))**
  * Bảng danh sách mã: Mã code, Hình thức giảm (`20%` / `30k`), Đơn tối thiểu, Lượt dùng (`45/100`), Hạn dùng và Trạng thái.
  * Form tạo mới: Hỗ trợ tạo mã giảm theo % (kèm chặn mức giảm tối đa) hoặc mã giảm tiền cố định.

* **Task 4.2: Xây dựng Modal Chọn Voucher 3 Tầng ([`VoucherSelectionModal.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/checkout/VoucherSelectionModal.jsx))**
  * Chia 3 khu vực rõ ràng:
    * 🏪 **Mã Giảm Giá Shop**: Danh sách mã của các Shop có trong giỏ.
    * 🌐 **Mã Toàn Sàn Huki**: Danh sách mã Sàn giảm sâu.
    * 🚚 **Mã Miễn Phí Vận Chuyển**: Danh sách mã Freeship.
  * Nút bấm nhanh: **"Áp dụng mã tốt nhất"** (Tự động chọn 3 mã giảm nhiều nhất).

* **Task 4.3: Bảng Phân Bổ Chiết Khấu Trên Trang Checkout (`CheckoutPage.jsx`)**
  * Hiển thị bảng tổng kết tiền minh bạch:
    * Tiền hàng gốc: `350.000đ`
    * Giảm giá Shop (`NHANAM10K`): `-10.000đ`
    * Giảm giá Sàn (`HUKISALE30`): `-30.000đ`
    * Phí vận chuyển: `32.000đ` (Đã giảm `-25.000đ` Freeship &rarr; `7.000đ`)
    * **Tổng tiền thanh toán**: `317.000đ` (Tiết kiệm `65.000đ`).

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ TÍNH TOÀN VẸN TÀI CHÍNH (TEST SUITE)

### 📌 Mục tiêu:
Đảm bảo tính chính xác 100% của thuật toán tính toán và không xảy ra sai lệch tài chính trong hạch toán.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit Test Thuật Toán Giảm Trừ 3 Tầng**
  * Kiểm tra đầy đủ các tổ hợp: Chỉ có mã Shop, Chỉ có mã Sàn, Cả 3 mã, Trường hợp giảm giá vượt quá giá trị đơn (chặn mức âm tiền).

* **Task 5.2: Integration Test Khóa Lượt Dùng & Hoàn Trả**
  * Đặt hàng thành công &rarr; Lượt dùng tăng +1.
  * Hủy đơn &rarr; Lượt dùng hoàn lại -1, khách hàng đặt lại được ngay.

* **Task 5.3: Kiểm Toán Đối Soát Doanh Thu Escrow**
  * Xác nhận số tiền chuyển vào ví của Seller bằng đúng số tiền sau khi trừ mã Shop, hoàn toàn không bị ảnh hưởng bởi mã Sàn.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `vouchers`, `voucher_usages` | ⏳ Sẵn sàng | Backend Team |
| **Calculation Engine** | Thuật toán giảm trừ tuần tự 3 tầng không âm tiền | ⏳ Sẵn sàng | Backend Team |
| **Backend APIs** | APIs Quản trị Admin/Seller, API tính toán & Hoàn trả khi hủy | ⏳ Sẵn sàng | Backend Team |
| **Escrow Settlement**| Hạch toán phân bổ dòng tiền minh bạch giữa Sàn và Seller | ⏳ Sẵn sàng | Backend Team |
| **Frontend UI** | Giao diện `SellerVouchersPage.jsx`, `VoucherSelectionModal.jsx` & Checkout | ⏳ Sẵn sàng | Frontend Team |
| **Financial Audit** | Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_VOU_01 đến TC_VOU_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 8 thuộc Nền tảng Sách Huki Ebook.*
