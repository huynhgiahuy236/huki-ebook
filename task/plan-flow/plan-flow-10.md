# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 10
## TÁCH ĐƠN HÀNG ĐA GIAN HÀNG (MULTI-VENDOR ORDER SPLITTING: MASTER ORDER & SUB-ORDERS)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng kiến trúc phân tách đơn hàng đa gian hàng (Multi-Vendor Order Splitting). Cho phép người mua gom nhiều cuốn sách từ các Nhà xuất bản / Nhà bán hàng khác nhau vào một giỏ hàng, chỉ cần quét 1 mã PayOS VietQR duy nhất để thanh toán, sau đó hệ thống tự động tách thành các Đơn hàng con (Sub-orders) độc lập theo từng `business_id` để các Shop chuẩn bị hàng và giao nhận độc lập.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `commerce-service` / `order-service`: Module `OrdersModule`, `OrderSplittingEngine`, `SubOrdersService`.
    * `shipping-service`: Module `ShippingCalculatorService` (tính cước vận chuyển riêng cho từng kiện hàng từ địa chỉ kho xuất của từng Shop).
    * `payment-service`: Điều phối thanh toán PayOS tập trung cho Master Order và phân phối sự kiện `PAYMENT_SUCCESS` đến các Sub-orders.
    * Prisma Schema: Bảng `orders` (Master), `sub_orders`, `order_items`.
  * **Frontend (Seller Portal & Storefront)**:
    * [`SellerOrdersPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerOrdersPage.jsx): Quản trị đơn hàng của Seller (chỉ hiển thị các Sub-orders thuộc quyền sở hữu của `business_id` hiện tại).
    * `web/src/ui/pages/public/OrderDetailPage.jsx`: Giao diện chi tiết đơn hàng của người mua hiển thị danh sách từng kiện hàng (Package tracking) với trạng thái và mã vận đơn riêng biệt.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 10
                                           │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  SPLITTING ENGINE &    BACKEND APIS &        SELLER & BUYER   TESTING SUITE &
DATA MODEL       SHIPPING ROUTING      PAYMENT ORCHESTRATION TRACKING UI      ISOLATION AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA ORDERS / SUB-ORDERS

### 📌 Mục tiêu:
Thiết lập mối quan hệ phân cấp $1 - N$ giữa Master Order và các Sub-orders trên PostgreSQL bằng Prisma ORM.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `orders` (Master Order)**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `order_code`: String, Unique, Index.
    * `user_id`: UUID, FK `users`.
    * `total_items_amount`: Decimal (Tổng tiền sách).
    * `total_shipping_fee`: Decimal (Tổng cước ship các gói).
    * `total_platform_discount`: Decimal, `total_freeship_discount`: Decimal.
    * `final_payment_amount`: Decimal (Tổng thực trả).
    * `payment_status`: Enum (`PENDING`, `PAID`, `CANCELLED`).
    * `payment_method`: Enum (`PAYOS_QR`, `COD`, `VNPAY`).
    * `shipping_address`: Json (Địa chỉ nhận hàng đầy đủ).
    * `created_at`, `updated_at`.

* **Task 1.2: Thiết kế Bảng `sub_orders` (Đơn Hàng Con)**
  * Định nghĩa bảng đơn con:
    * `id`: UUID, Primary Key.
    * `master_order_id`: UUID, FK `orders` (onDelete: Cascade).
    * `sub_order_code`: String, Unique, Index (VD: `ORD-8899-S1`).
    * `business_id`: UUID, Index, FK `businesses`.
    * `subtotal`: Decimal (Tiền hàng riêng Shop).
    * `shipping_fee`: Decimal (Cước ship riêng gói này).
    * `shop_voucher_discount`: Decimal.
    * `allocated_platform_discount`: Decimal.
    * `seller_payout_amount`: Decimal (Doanh thu ví Shop thực nhận).
    * `status`: Enum (`PENDING`, `CONFIRMED`, `PACKING`, `SHIPPING`, `DELIVERED`, `CANCELLED`).
    * `tracking_code`: String (Mã vận đơn AWB).
    * `shipping_carrier`: String (Đơn vị vận chuyển).

* **Task 1.3: Thiết kế Bảng `order_items`**
  * Liên kết trực tiếp với `sub_order_id`:
    * `id`: UUID, Primary Key.
    * `sub_order_id`: UUID, FK `sub_orders`.
    * `book_id`: UUID, FK `books`.
    * `format`: Enum (`PHYSICAL`, `EBOOK`, `HYBRID`).
    * `quantity`: Int, `unit_price`: Decimal.

---

## PHẦN 2: THUẬT TOÁN TÁCH ĐƠN HÀNG & TÍCH HỢP TÍNH SHIP ĐỘC LẬP

### 📌 Mục tiêu:
Xây dựng engine tự động nhóm các sản phẩm theo `business_id`, tính cước phí vận chuyển từ địa chỉ kho xuất của từng Shop và phân bổ chiết khấu Sàn.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai Module `OrderSplittingEngine`**
  * Hàm `splitCartIntoSubOrders(cartItems, buyerAddress, vouchers)`:
    * Nhóm sản phẩm theo `business_id`.
    * Với mỗi nhóm: Lấy địa chỉ kho của Shop &rarr; Gọi `shippingCalculator.calculateFee(shopWarehouse, buyerAddress, totalWeight)`.
    * Tính tiền hàng `subtotal` và giảm giá `shop_voucher_discount` của từng Shop.
    * Phân bổ `platform_voucher` theo tỷ lệ:
      $$\text{AllocatedDiscount}_i = \text{round}\left(\text{PlatformDiscount} \times \frac{\text{Subtotal}_i}{\text{TotalSubtotal}}\right)$$
    * Tính `seller_payout_amount = subtotal - shop_voucher_discount`.

* **Task 2.2: Khởi tạo Giao dịch Database Nguyên tử (Atomic Checkout Transaction)**
  * Thực thi trong 1 `prisma.$transaction`:
    1. Tạo Master Order.
    2. Tạo danh sách Sub-orders.
    3. Tạo danh sách Order Items.
    4. Trừ tồn kho tạm giữ (Reserved Stock) cho từng sản phẩm của từng Shop.
    5. Xóa các sản phẩm đã mua khỏi giỏ hàng `cart_items`.

---

## PHẦN 3: XÂY DỰNG BACKEND APIS & ĐIỀU PHỐI THANH TOÁN TẬP TRUNG

### 📌 Mục tiêu:
Xây dựng các RESTful endpoints quản trị đơn hàng cho Seller, Buyer và bộ xử lý Webhook PayOS kích hoạt đồng loạt Sub-orders.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: API Tạo Đơn Hàng Checkout Tập Trung**
  * **Endpoint**: `POST /api/v1/orders/checkout`
  * **Logic**: Nhận payload giỏ hàng &rarr; Tách đơn &rarr; Tạo Master Order & Sub-orders &rarr; Gọi PayOS tạo Payment Link &rarr; Trả về mã VietQR Code tổng duy nhất.

* **Task 3.2: Bộ API Quản Lý Đơn Hàng Phân Quyền Seller**
  * `GET /api/v1/seller/orders`: Lấy danh sách Sub-orders thuộc về `business_id` của Seller đăng nhập (Sử dụng middleware `SellerScopeGuard` bảo mật tuyệt đối).
  * `PATCH /api/v1/seller/orders/:subOrderId/confirm`: Shop bấm xác nhận đơn hàng.
  * `PATCH /api/v1/seller/orders/:subOrderId/ship`: Shop cập nhật mã vận đơn và bàn giao cho Shipper.

* **Task 3.3: Xử lý Webhook Thanh Toán PayOS (`PaymentOrchestrator`)**
  * Lắng nghe Webhook thanh toán thành công:
    * Cập nhật `orders.payment_status = 'PAID'`.
    * Chuyển tất cả `sub_orders` con:
      * Nếu là Ebook: Chuyển thẳng sang `DELIVERED` & Mở khóa bản quyền số tức thì.
      * Nếu là Sách giấy: Chuyển sang `CONFIRMED`.
    * Bắn thông báo Realtime (WebSocket) đến từng Seller riêng biệt.

---

## PHẦN 4: GIAO DIỆN QUẢN TRỊ SELLER & THEO DÕI KIỆN HÀNG STOREFRONT

### 📌 Mục tiêu:
Cung cấp giao diện quản lý đơn con chuyên nghiệp cho Seller và trải nghiệm theo dõi từng kiện hàng trực quan cho độc giả.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Nâng cấp Màn hình Quản Trị Người Bán ([`SellerOrdersPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerOrdersPage.jsx))**
  * Hiển thị bảng danh sách Sub-orders: Mã đơn con (`#S1`), Ngày đặt, Tên sách, Tổng tiền hàng của Shop, Tiền cước ship, Trạng thái đơn, Nút thao tác (Xác nhận / Đóng gói / In phiếu).
  * Đảm bảo Seller không nhìn thấy các đơn con của Shop khác.

* **Task 4.2: Xây dựng Giao diện Theo Dõi Kiện Hàng Người Mua (`OrderDetailPage.jsx`)**
  * Hiển thị danh sách theo **Từng Kiện Hàng (Packages)**:
    * 📦 **Kiện 1 (Nhã Nam Official)**: Danh sách sách, Phí ship, Mã vận đơn `GHN_123456`, Thanh trạng thái *Đang giao hàng*.
    * 📦 **Kiện 2 (NXB Trẻ)**: Danh sách sách, Phí ship, Mã vận đơn `VTP_987654`, Thanh trạng thái *Người bán đang chuẩn bị hàng*.
    * 📱 **Kiện 3 (Ebook Bản Quyền)**: Nút bấm màu xanh **"Đọc Sách Ngay"** chuyển đến Web Reader.

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ TÍNH ĐỘC LẬP VẬN HÀNH (TEST SUITE)

### 📌 Mục tiêu:
Đảm bảo tính độc lập tuyệt đối giữa các đơn con và luồng thanh toán tập trung hoạt động hoàn hảo.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Kiểm thử Tạo Đơn Đa Gian Hàng (Multi-Vendor E2E Test)**
  * Đặt giỏ hàng gồm 3 Shop &rarr; Xác nhận tạo 1 Master Order và 3 Sub-orders chính xác về mặt dữ liệu.
  * Quét mã PayOS QR &rarr; Xác nhận Webhook kích hoạt đồng loạt 3 đơn con thành công.

* **Task 5.2: Kiểm thử Hủy Đơn Cục Bộ (Partial Cancellation Test)**
  * Khách yêu cầu hủy Sub-order 1 &rarr; Xác nhận Sub-order 1 chuyển `CANCELLED`, Sub-order 2 và 3 vẫn hoạt động bình thường.

* **Task 5.3: Kiểm thử Bảo Mật Phân Quyền Dữ Liệu Seller**
  * Seller A đăng nhập &rarr; Gọi API lấy đơn &rarr; Xác nhận chỉ nhận đúng các đơn con có `business_id` của Seller A.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `orders`, `sub_orders`, `order_items` | ⏳ Sẵn sàng | Backend Team |
| **Splitting Engine** | Thuật toán gom nhóm Shop, tính ship riêng và phân bổ Voucher Sàn | ⏳ Sẵn sàng | Backend Team |
| **Payment Webhook** | Xử lý PayOS Webhook tập trung kích hoạt đồng loạt Sub-orders | ⏳ Sẵn sàng | Backend Team |
| **Seller Security** | Middleware `SellerScopeGuard` bảo mật dữ liệu Sub-orders theo `business_id` | ⏳ Sẵn sàng | Backend Team |
| **Storefront UI** | Giao diện theo dõi từng kiện hàng `OrderDetailPage.jsx` | ⏳ Sẵn sàng | Frontend Team |
| **Quality Audit** | Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_SPLIT_01 đến TC_SPLIT_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 10 thuộc Nền tảng Sách Huki Ebook.*
