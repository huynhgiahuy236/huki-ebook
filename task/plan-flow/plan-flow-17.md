# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 17
## CHÍNH SÁCH HỦY ĐƠN HÀNG PHÂN CẤP & HOÀN TIỀN TỰ ĐỘNG (MULTI-STAGE ORDER CANCELLATION & AUTOMATED REFUND)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện máy trạng thái hủy đơn hàng phân cấp 4 giai đoạn (Tự hủy 1 chạm $\rightarrow$ Gửi yêu cầu duyệt $\rightarrow$ Khóa nút hủy khi đang giao $\rightarrow$ Ngoại lệ Ebook), tích hợp Worker tự động duyệt sau 24h nếu Seller không phản hồi, phát triển engine gọi API hoàn tiền tự động $100\%$ qua cổng PayOS / Ngân hàng và tự động giải phóng tồn kho cũng như hoàn trả voucher cho khách hàng.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `commerce-service` / `order-service`: Module `CancellationModule`, `CancellationService`, `CancellationController`.
    * `payment-service`: Module `AutoRefundService` (tích hợp API PayOS Refund / Bank Refund).
    * `inventory-service`: Triển khai hàm hoàn kho nguyên tử `releaseReservedStock()` / `restockAfterCancel()`.
    * BullMQ Worker: `CancelAutoApproveProcessor` (quét và xử lý tự động duyệt sau 24h).
    * Prisma Schema: Bảng `cancellation_requests`.
  * **Frontend (Storefront & Seller Portal)**:
    * `web/src/ui/components/orders/CancelOrderModal.jsx`: Modal hủy đơn dành cho người mua (tự hủy hoặc gửi form lý do).
    * `web/src/ui/pages/seller/SellerCancellationRequestsPage.jsx`: Giao diện duyệt / từ chối yêu cầu hủy đơn dành cho Seller kèm đồng hồ đếm ngược 24h.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 17
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  CANCELLATION STATE     AUTO-REFUND ENGINE     FRONTEND UI &    TESTING SUITE &
REQUEST MODEL    MACHINE & 24H WORKER   & INVENTORY RELEASE    SELLER APPROVAL  REFUND AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA YÊU CẦU HỦY ĐƠN

### 📌 Mục tiêu:
Thiết lập bảng lưu trữ các yêu cầu hủy đơn `cancellation_requests` trên PostgreSQL bằng Prisma ORM.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `cancellation_requests`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `order_id`: UUID, FK `orders`.
    * `sub_order_id`: UUID, FK `sub_orders`, Index.
    * `user_id`: UUID, FK `users`.
    * `business_id`: UUID, FK `businesses`.
    * `stage_at_cancel`: Enum (`STAGE_1_PENDING`, `STAGE_2_PACKING`).
    * `reason_code`: Enum (`CHANGE_MIND`, `WRONG_ADDRESS`, `FOUND_CHEAPER`, `FORGOT_VOUCHER`, `OTHER`).
    * `reason_detail`: String (Nullable).
    * `status`: Enum (`PENDING_SELLER_APPROVAL`, `APPROVED`, `REJECTED`, `AUTO_APPROVED`).
    * `seller_reject_reason`: String (Nullable).
    * `refund_status`: Enum (`NOT_REQUIRED`, `PENDING_REFUND`, `REFUNDED`).
    * `auto_approve_at`: DateTime (Mốc 24h).
    * `resolved_at`: DateTime (Nullable).
    * `created_at`, `updated_at`: DateTime.

---

## PHẦN 2: MÁY TRẠNG THÁI HỦY ĐƠN & WORKER TỰ ĐỘNG DUYỆT 24H

### 📌 Mục tiêu:
Phát triển logic phân luồng hủy đơn theo từng giai đoạn và Worker nền tự động phê duyệt sau 24 giờ.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai Logic Hủy Đơn 1 Chạm (Giai đoạn 1)**
  * Kiểm tra nếu đơn con đang mang trạng thái `PENDING_PAYMENT` hoặc `PENDING_CONFIRMATION`:
    * Chuyển trạng thái sang `CANCELLED`.
    * Gọi `inventory-service` nhả kho tạm giữ (`releaseReservedStock`).
    * Hoàn trả voucher cho khách.

* **Task 2.2: Triển khai Logic Gửi Yêu Cầu Hủy Đơn (Giai đoạn 2)**
  * Nếu đơn đang mang trạng thái `CONFIRMED` / `PACKING`:
    * Tạo bản ghi `cancellation_requests` với `status: 'PENDING_SELLER_APPROVAL'`.
    * Đẩy Delayed Job vào BullMQ: `delay = 24 * 60 * 60 * 1000` (24 giờ).
    * Bắn thông báo khẩn cấp đến Seller qua WebSocket và chuông thông báo.

* **Task 2.3: Triển khai Worker Xử Lý Timeout 24 Giờ (`CancelAutoApproveProcessor`)**
  * Khi Job 24h kích hoạt:
    * Kiểm tra nếu yêu cầu vẫn là `PENDING_SELLER_APPROVAL`:
    * Cập nhật `status = 'AUTO_APPROVED'`, chuyển đơn hàng sang `CANCELLED` và kích hoạt lệnh hoàn tiền tự động.

---

## PHẦN 3: ENGINE HOÀN TIỀN TỰ ĐỘNG & GIẢI PHÓNG TỒN KHO

### 📌 Mục tiêu:
Tự động gọi API hoàn tiền về tài khoản ngân hàng gốc và hoàn trả tồn kho khả dụng.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Triển khai Module Hoàn Tiền Tự Động (`AutoRefundService`)**
  * Hàm `processOrderRefund(subOrderId, amount)`:
    * Kiểm tra giao dịch ban đầu trong `payment_transactions`.
    * Gọi API cổng PayOS / Ngân hàng thực hiện lệnh hoàn tiền $100\%$.
    * Cập nhật `cancellation_requests.refund_status = 'REFUNDED'`.
    * Gửi email biên lai hoàn tiền xác nhận cho khách hàng.

* **Task 3.2: Tích hợp Hoàn Tồn Kho và Voucher**
  * Lắng nghe sự kiện `ORDER_CANCEL_COMPLETED`:
    * Hoàn trả số lượng sách về `on_hand_stock` và tăng bộ đếm Redis.
    * Đánh dấu voucher khả dụng trở lại để khách có thể sử dụng cho đơn tiếp theo.

---

## PHẦN 4: GIAO DIỆN HỦY ĐƠN BUYER & BẢNG XÉT DUYỆT SELLER

### 📌 Mục tiêu:
Xây dựng giao diện thân thiện cho độc giả gửi yêu cầu hủy và bảng điều khiển trực quan cho Seller xử lý.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Modal Hủy Đơn Dành Cho Người Mua ([`CancelOrderModal.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/orders/CancelOrderModal.jsx))**
  * Dropdown chọn lý do hủy: *"Đổi ý không mua nữa"*, *"Muốn đổi địa chỉ"*, *"Quên áp mã voucher"*, *"Tìm thấy nơi khác rẻ hơn"*.
  * Ô nhập ghi chú bổ sung.
  * Hiển thị thông báo minh bạch: *"Nếu đơn đã thanh toán, tiền sẽ được tự động hoàn lại 100% vào tài khoản trong 5-15 phút sau khi duyệt."*.

* **Task 4.2: Xây dựng Giao diện Quản Lý Yêu Cầu Hủy Seller ([`SellerCancellationRequestsPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerCancellationRequestsPage.jsx))**
  * Danh sách các yêu cầu hủy: Mã đơn con, Tên khách, Lý do hủy, Thời gian gửi.
  * **Đồng hồ đếm ngược 24h**: Hiển thị thời gian còn lại trước khi hệ thống tự động duyệt.
  * Hai nút hành động:
    * 🟢 **"Đồng ý hủy đơn"**: Xác nhận hủy và kích hoạt hoàn tiền.
    * 🔴 **"Từ chối hủy"**: Mở modal nhập lý do từ chối (VD: "Đã đóng gói hoàn tất").

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ CHẤT LƯỢNG HOÀN TIỀN (TEST SUITE)

### 📌 Mục tiêu:
Đảm bảo 100% các nhánh nghiệp vụ hủy đơn và dòng tiền hoàn trả hoạt động chính xác tuyệt đối.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit & Integration Test Ma Trận Hủy Đơn**
  * Test Case Giai đoạn 1 &rarr; Xác nhận đơn hủy ngay, kho nhả tức thì.
  * Test Case Giai đoạn 2 Shop duyệt &rarr; Xác nhận hoàn tiền tự động 100%.
  * Test Case Giai đoạn 2 Shop từ chối &rarr; Xác nhận đơn tiếp tục giao.
  * Test Case Giai đoạn 2 Timeout 24h &rarr; Xác nhận tự động duyệt `AUTO_APPROVED`.
  * Test Case Giai đoạn 3 (Đang giao) &rarr; Xác nhận nút hủy bị khóa.

* **Task 5.2: Kiểm Toán Dòng Tiền Hoàn Trả (Refund Audit)**
  * Xác nhận số tiền hoàn trả khớp chính xác $100\%$ số tiền khách đã trả, ghi log đầy đủ vào `payment_transactions`.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `cancellation_requests` | ⏳ Sẵn sàng | Backend Team |
| **State Machine**| Phân luồng ma trận hủy đơn 4 giai đoạn | ⏳ Sẵn sàng | Backend Team |
| **Auto-Approve** | BullMQ Delayed Job tự động duyệt hủy sau 24 giờ | ⏳ Sẵn sàng | Backend Team |
| **Auto-Refund** | API Hoàn tiền tự động 100% qua PayOS / Ngân hàng | ⏳ Sẵn sàng | Backend Team |
| **Frontend UI** | Modal hủy đơn cho Buyer & Trang xét duyệt cho Seller | ⏳ Sẵn sàng | Frontend Team |
| **Refund Audit** | Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_CAN_01 đến TC_CAN_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 17 thuộc Nền tảng Sách Huki Ebook.*
