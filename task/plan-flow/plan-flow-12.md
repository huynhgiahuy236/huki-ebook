# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 12
## VÒNG ĐỜI XỬ LÝ ĐƠN & SINH MÃ VẬN ĐƠN TỰ ĐỘNG (AWB GENERATION & ORDER FULFILLMENT LIFECYCLE)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện máy trạng thái vòng đời xử lý đơn hàng 5 giai đoạn (`PENDING` $\rightarrow$ `PACKING` $\rightarrow$ `READY_TO_SHIP` $\rightarrow$ `SHIPPING` $\rightarrow$ `DELIVERED`), phát triển engine tự động sinh mã vận đơn điện tử chuẩn AWB (Air Waybill) tích hợp Barcode Code 128 / QR Code, module tạo và in phiếu giao hàng chuẩn khổ A6 ($100 \times 150\text{mm}$) trực tiếp trên trình duyệt, cùng cơ chế tự động khấu trừ tồn kho thực tế khi bàn giao cho Shipper.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `shipping-service`: Module `ShipmentsModule`, `ShipmentsService`, `AwbGeneratorService`, `ShippingLabelRenderer`.
    * `order-service` / `inventory-service`: Đồng bộ chuyển trạng thái và khấu trừ tồn kho thực tế `on_hand_stock`.
    * Prisma Schema: Bảng `shipments` (liên kết `sub_orders`).
  * **Frontend (Seller Portal)**:
    * [`SellerOrdersPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerOrdersPage.jsx): Giao diện quản trị đơn hàng phân theo các tab trạng thái (Chờ xác nhận, Chờ đóng gói, Đang giao, Đã giao, Hoàn hàng).
    * `web/src/ui/components/shipping/ShippingLabelModal.jsx`: Modal xem trước và in phiếu giao hàng A6 chuẩn Barcode.
    * `web/src/ui/components/shipping/PackingSlipModal.jsx`: Phiếu soạn hàng (Picking List) cho nhân viên kho.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 12
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  AWB GENERATOR &        STATE MACHINE &        SELLER UI &      TESTING SUITE &
SHIPMENT MODEL   LABEL PDF RENDERER     BACKEND APIS           PRINTABLE LABELS FULFILLMENT AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA VẬN ĐƠN (SHIPMENTS)

### 📌 Mục tiêu:
Thiết lập bảng lưu trữ chi tiết kiện hàng `shipments` liên kết với đơn hàng con `sub_orders` trên PostgreSQL.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `shipments` trong Prisma Schema**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `sub_order_id`: UUID, Unique, FK `sub_orders` (onDelete: Cascade).
    * `business_id`: UUID, FK `businesses`.
    * `tracking_code`: String, Unique, Index (Mã AWB).
    * `carrier_name`: String (VD: "Giao Hàng Nhanh", "Viettel Post").
    * `service_type`: Enum (`STANDARD`, `EXPRESS`).
    * `weight_in_grams`: Int.
    * `shipping_label_url`: String (Nullable).
    * `status`: Enum (`READY_TO_SHIP`, `PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`, `RETURNED`).
    * `pickup_at`: DateTime (Nullable).
    * `delivered_at`: DateTime (Nullable).
    * `delivery_attempts`: Int (Mặc định: 0).
    * `created_at`, `updated_at`.

---

## PHẦN 2: PHÁT TRIỂN AWB GENERATOR & MODULE TẠO TEM NHÃN IN A6

### 📌 Mục tiêu:
Xây dựng thuật toán sinh mã vận đơn duy nhất và engine render tem nhãn giao hàng khổ A6 có mã vạch chuẩn.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai Module `AwbGeneratorService`**
  * Hàm `generateTrackingCode(carrierCode)`:
    * Quy tắc sinh mã: `HUKI-${CARRIER}-${HEX_TIME}-${RANDOM_2DIGITS}`.
    * Đảm bảo tính duy nhất $100\%$ không bao giờ trùng lặp trên toàn hệ thống.

* **Task 2.2: Triển khai Engine Render Tem Nhãn Giao Hàng (`ShippingLabelRenderer`)**
  * Sử dụng thư viện `jsbarcode` / `qrcode` và `pdfmake` (hoặc HTML Canvas chuẩn in):
    * Khổ in: Tiêu chuẩn Decal nhiệt A6 ($100 \times 150\text{mm}$).
    * Nội dung tem nhãn:
      * Logo Huki Ebook + Mã AWB dạng Barcode Code 128 sắc nét.
      * Thông tin Shop gửi (Tên Shop, Địa chỉ kho, SĐT).
      * Thông tin Người nhận (Tên, SĐT che 3 số giữa, Địa chỉ 3 cấp chi tiết).
      * Danh sách tựa sách, trọng lượng, mã đơn hàng.
      * Ghi chú giao hàng: *"Cho xem hàng, không đọc thử"*.

---

## PHẦN 3: XÂY DỰNG MÁY TRẠNG THÁI & BỘ BACKEND APIS VẬN HÀNH

### 📌 Mục tiêu:
Phát triển các RESTful endpoints điều khiển vòng đời đơn hàng và liên kết khấu trừ tồn kho thực tế.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: API Tạo Vận Đơn & Sinh Mã AWB**
  * **Endpoint**: `POST /api/v1/shipping/shipments/create`
  * **Body**: `{ subOrderId: "uuid" }`
  * **Xử lý**:
    * Kiểm tra đơn đang ở trạng thái `CONFIRMED`.
    * Sinh mã AWB, tạo bản ghi `shipments` với trạng thái `READY_TO_SHIP`.
    * Cập nhật `sub_orders.tracking_code` và `sub_orders.status = 'PACKING'`.

* **Task 3.2: API Cập Nhật Bàn Giao Shipper & Khấu Trừ Tồn Kho**
  * **Endpoint**: `PATCH /api/v1/shipping/shipments/:id/handover`
  * **Xử lý**:
    * Chuyển trạng thái shipment sang `PICKED_UP` và `sub_orders.status = 'SHIPPING'`.
    * Gọi `inventory-service` khấu trừ tồn kho thực tế: `on_hand_stock -= qty` và `reserved_stock -= qty`.

* **Task 3.3: API Xác Nhận Giao Thành Công / Thất Bại**
  * **Endpoint**: `PATCH /api/v1/shipping/shipments/:id/delivery-status`
  * **Body**: `{ status: 'DELIVERED' | 'FAILED', failureReason?: string }`
  * **Xử lý**:
    * Nếu `DELIVERED`: Cập nhật `delivered_at = NOW()`, kích hoạt luồng Escrow.
    * Nếu `FAILED`: Tăng `delivery_attempts += 1`. Nếu $\ge 3$ lần &rarr; Chuyển sang `RETURNED`.

---

## PHẦN 4: GIAO DIỆN QUẢN LÝ ĐƠN SELLER & TÍNH NĂNG IN TEM NHÃN A6

### 📌 Mục tiêu:
Tối ưu hóa bảng quản trị đơn hàng cho Seller với các thao tác 1 chạm và tính năng in tem nhãn trực tiếp.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Nâng cấp Bảng Quản Trị Đơn Hàng ([`SellerOrdersPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerOrdersPage.jsx))**
  * Thanh điều hướng Tab trạng thái:
    * `Tất Cả`, `Chờ Xác Nhận (N)`, `Đang Đóng Gói (N)`, `Đang Giao (N)`, `Đã Giao (N)`, `Hủy / Hoàn (N)`.
  * Các nút hành động thông minh theo trạng thái:
    * Ở tab Chờ xác nhận: Nút **"Xác nhận đơn"**.
    * Ở tab Đang đóng gói: Nút **"In phiếu đóng gói"** và **"Chuẩn bị hàng xong (Sinh mã AWB)"**.
    * Ở tab Đang giao: Nút **"In tem nhãn A6"** và **"Xem hành trình"**.

* **Task 4.2: Xây dựng Modal In Tem Nhãn Giao Hàng (`ShippingLabelModal.jsx`)**
  * Hiển thị bản xem trước tem A6 rõ nét.
  * Tích hợp nút **"In Tem Nhãn"** gọi lệnh `window.print()` chuẩn tỉ lệ không bị lệch trang.

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ ĐỘ TIN CẬY (TEST SUITE)

### 📌 Mục tiêu:
Đảm bảo 100% các bước chuyển đổi trạng thái và logic khấu trừ kho hoạt động hoàn hảo.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit & Integration Test Máy Trạng Thái Đơn Hàng**
  * Test Case chuyển tuần tự: `PENDING` &rarr; `CONFIRMED` &rarr; `PACKING` &rarr; `SHIPPING` &rarr; `DELIVERED`.
  * Xác nhận tồn kho thực tế `on_hand_stock` chỉ bị trừ khi chuyển sang `SHIPPING`.

* **Task 5.2: Kiểm thử Tạo Mã AWB & Định Dạng Tem In**
  * Xác nhận mã AWB sinh ra không trùng lặp và Barcode quét được bằng thiết bị di động.
  * Xác nhận tem A6 in ra đầy đủ thông tin bảo mật.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `shipments` liên kết `sub_orders` | ⏳ Sẵn sàng | Backend Team |
| **AWB Generator**| Thuật toán sinh mã AWB duy nhất & Renderer tem in A6 Barcode | ⏳ Sẵn sàng | Backend Team |
| **Backend APIs** | APIs Tạo vận đơn, Bàn giao Shipper, Cập nhật trạng thái giao hàng | ⏳ Sẵn sàng | Backend Team |
| **Inventory Sync**| Khấu trừ tồn kho thực tế `on_hand_stock` chính xác khi xuất kho | ⏳ Sẵn sàng | Backend Team |
| **Seller UI** | Giao diện Tab trạng thái `SellerOrdersPage.jsx` & Modal in tem A6 | ⏳ Sẵn sàng | Frontend Team |
| **Quality Audit** | Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_AWB_01 đến TC_AWB_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 12 thuộc Nền tảng Sách Huki Ebook.*
