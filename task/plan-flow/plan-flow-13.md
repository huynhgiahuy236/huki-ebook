# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 13
## THEO DÕI HÀNH TRÌNH ĐƠN HÀNG TRỰC QUAN (REALTIME ORDER TIMELINE TRACKING UI)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện tính năng theo dõi dòng thời gian hành trình đơn hàng theo thời gian thực (Realtime Order Timeline Tracking). Phát triển cổng tiếp nhận Webhook chuẩn hóa từ các đối tác giao vận (GHN, Viettel Post), module ghi vết lịch sử sự kiện bưu chính, tích hợp WebSocket Server đẩy sự kiện tức thì lên giao diện người dùng và thiết kế component Timeline Stepper 7 mốc sinh động, mượt mà trên cả máy tính và thiết bị di động.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `shipping-service`: Module `TrackingModule`, `TrackingService`, `CarrierWebhookController`.
    * `WebSocket Gateway`: Phát sự kiện `SHIPMENT_TRACKING_UPDATED` đến phòng người dùng (`user_room`).
    * Prisma Schema: Bảng `shipment_tracking_events` (liên kết `shipments`).
  * **Frontend (Storefront & Public Portal)**:
    * `web/src/ui/pages/user/OrderTimelinePage.jsx`: Trang chi tiết hành trình kiện hàng dành cho người mua đã đăng nhập.
    * `web/src/ui/pages/public/PublicTrackingPage.jsx`: Trang tra cứu hành trình công khai bằng mã vận đơn AWB không cần đăng nhập.
    * `web/src/ui/components/shipping/OrderTimelineStepper.jsx`: Component hiển thị dòng thời gian dọc với các trạng thái màu sắc, icon động và thông tin bưu cục chi tiết.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 13
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  CARRIER WEBHOOK        WEBSOCKET GATEWAY      FRONTEND TIMELINE TESTING SUITE &
DATA MODEL       INGESTION ENGINE       & REALTIME PUSH        UI & PUBLIC PAGE LATENCY AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA LỊCH SỬ HÀNH TRÌNH

### 📌 Mục tiêu:
Thiết lập bảng lưu trữ các sự kiện biến động của kiện hàng `shipment_tracking_events` trên PostgreSQL bằng Prisma ORM.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `shipment_tracking_events`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `shipment_id`: UUID, FK `shipments` (onDelete: Cascade).
    * `tracking_code`: String, Index.
    * `event_code`: Enum (`ORDER_PLACED`, `PAYMENT_CONFIRMED`, `PACKED`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED`).
    * `title`: String.
    * `description`: String.
    * `location`: String (Nullable).
    * `courier_name`: String (Nullable).
    * `event_time`: DateTime.
    * `created_at`: DateTime.
    * Index: `[shipment_id, event_time]`.

---

## PHẦN 2: XÂY DỰNG CARRIER WEBHOOK INGESTION ENGINE

### 📌 Mục tiêu:
Phát triển endpoint bảo mật tiếp nhận Webhook từ các hãng vận chuyển GHN / Viettel Post và chuẩn hóa dữ liệu thành các sự kiện nội bộ.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai Controller Tiếp Nhận Webhook Đối Tác**
  * **Endpoint**: `POST /api/v1/shipping/webhooks/carrier`
  * **Bảo mật**: Xác thực chữ ký `HMAC-SHA256` trên Header `X-Carrier-Signature`.
  * **Xử lý Logic**:
    * Tìm kiếm bản ghi `shipments` theo `tracking_code`.
    * Ánh xạ mã sự kiện của đối tác sang mã `event_code` nội bộ của Huki Ebook.
    * Ghi bản ghi mới vào bảng `shipment_tracking_events`.
    * Cập nhật trạng thái `shipments.status` và `sub_orders.status`.

* **Task 2.2: Tự Động Tạo Các Sự Kiện Khởi Đầu Nội Bộ**
  * Khi đơn tạo và thanh toán: Tự động ghi 2 sự kiện đầu tiên: `ORDER_PLACED` và `PAYMENT_CONFIRMED`.
  * Khi Seller bấm chuẩn bị hàng: Tự động ghi sự kiện `PACKED`.

---

## PHẦN 3: TRIỂN KHAI WEBSOCKET GATEWAY & REALTIME EVENT DISPATCHER

### 📌 Mục tiêu:
Cung cấp kênh truyền thông thời gian thực giữa máy chủ và giao diện người dùng để cập nhật mốc hành trình ngay lập tức.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Xây dựng Module `TrackingGateway` (Socket.io / WS)**
  * Quản lý các phòng (Rooms): `room_order_{orderId}` và `room_user_{userId}`.
  * Phương thức `emitTrackingUpdate(orderId, eventData)`: Phát thông điệp sự kiện mới đến tất cả các client đang mở trang chi tiết đơn hàng đó.

* **Task 3.2: Tích hợp Đẩy Thông Báo Khẩn Cấp (Notification Push)**
  * Khi sự kiện là `OUT_FOR_DELIVERY`: Tự động gọi `notification-service` gửi thông báo đẩy đến điện thoại/trình duyệt của khách hàng.

---

## PHẦN 4: GIAO DIỆN TIMELINE TRACKING & TRANG TRA CỨU CÔNG KHAI

### 📌 Mục tiêu:
Xây dựng giao diện dòng thời gian trực quan, mượt mà và trang tra cứu mã vận đơn công khai tiện lợi.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Component Dòng Thời Gian ([`OrderTimelineStepper.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/shipping/OrderTimelineStepper.jsx))**
  * Dạng dòng thời gian dọc (Vertical Timeline):
    * Node hoàn thành: Màu xanh lá cây kèm icon tích $\checkmark$.
    * Node đang thực hiện: Màu xanh dương kèm hiệu ứng sóng nhấp nháy Pulse.
    * Node chưa tới: Màu xám nhạt nét đứt.
    * Node sự cố: Màu cam kèm icon cảnh báo ⚠️.
  * Hiển thị chi tiết: Thời gian (Giờ : Phút - Ngày/Tháng), Tiêu đề mốc, Vị trí bưu cục luân chuyển và Tên/SĐT Shipper.

* **Task 4.2: Xây dựng Trang Chi Tiết Hành Trình (`OrderTimelinePage.jsx`)**
  * Khối thông tin kiện hàng: Tên Shop, Mã AWB (kèm nút Copy), Tên ĐVVC, Dự kiến giao hàng.
  * Khung Stepper hành trình chi tiết.
  * Khối thông tin người nhận và danh sách sách trong kiện.

* **Task 4.3: Xây dựng Trang Tra Cứu AWB Công Khai (`PublicTrackingPage.jsx`)**
  * Ô nhập mã vận đơn AWB &rarr; Bấm "Tra Cứu".
  * Hiển thị toàn bộ dòng thời gian luân chuyển của bưu kiện mà không tiết lộ số điện thoại hay địa chỉ nhà riêng của khách hàng (Bảo mật quyền riêng tư).

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ ĐỘ TRỄ ĐỒNG BỘ (TEST SUITE)

### 📌 Mục tiêu:
Đảm bảo luồng Webhook và hiển thị Realtime hoạt động chính xác với độ trễ $< 500\text{ms}$.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit & Integration Test Webhook Ingestion**
  * Giả lập gửi payload Webhook từ GHN &rarr; Xác nhận ghi đúng vào bảng `shipment_tracking_events`.
  * Xác nhận chữ ký bảo mật chặn đứng 100% request giả mạo không có secret key.

* **Task 5.2: Kiểm thử WebSocket Realtime UI**
  * Mở trang Timeline trên trình duyệt &rarr; Kích hoạt sự kiện từ Backend &rarr; Xác nhận dòng thời gian tự động thêm mốc mới mà không cần F5 trang.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `shipment_tracking_events` | ⏳ Sẵn sàng | Backend Team |
| **Carrier Webhook**| Endpoint tiếp nhận & chuẩn hóa sự kiện GHN/Viettel Post | ⏳ Sẵn sàng | Backend Team |
| **WebSocket** | Realtime Gateway phát sự kiện `SHIPMENT_TRACKING_UPDATED` | ⏳ Sẵn sàng | Backend Team |
| **Frontend UI** | Component `OrderTimelineStepper.jsx`, Trang chi tiết & Trang tra cứu AWB | ⏳ Sẵn sàng | Frontend Team |
| **Privacy Security**| Che thông tin nhạy cảm trên trang tra cứu công khai | ⏳ Sẵn sàng | Frontend Team |
| **Latency Audit** | Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_TRACK_01 đến TC_TRACK_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 13 thuộc Nền tảng Sách Huki Ebook.*
