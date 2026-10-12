# 🚚 RT-09: REALTIME MULTI-VENDOR LOGISTICS & AWB TRACKING

> **Mục tiêu:** Cập nhật thời gian thực hành trình giao hàng và định vị vận đơn AWB: Khi Shipper/Bưu tá lấy hàng (`PICKED_UP`) $\to$ Đang giao (`SHIPPING` / `OUT_FOR_DELIVERY`) $\to$ Giao thành công (`DELIVERED`) $\to$ Tiến trình trên thanh Timeline đơn hàng của Khách (`/user/orders/[id]`) và Seller (`/seller/orders/[id]`) tự động nhảy nấc mượt mà mà không cần F5, đồng thời **chốt mốc `deliveredAt` để kích hoạt chính xác bộ đếm ngược đổi trả 2 phút tại `RT-06`**.

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG & MA TRẬN 4 BÊN (CROSS-ROLE IMPACT MATRIX)

Khi Shipper thực hiện bất kỳ thao tác nào trên tuyến đường, toàn bộ 4 bên liên quan đều nhận biến động tức thì:

| Trạng thái Logistics | SHIPPER (Bưu tá HuKi Express) | BUYER (Khách Mua / Bạn Đọc) | SELLER (Gian hàng / Shop) | ADMIN (Quản trị Sàn) |
|:---|:---|:---|:---|:---|
| **1. Sẵn sàng lấy hàng (`READY_FOR_PICKUP`)** | Đơn nổ chuông trên Sàn đơn chờ nhận (`/shipper/available-orders`) | Timeline hiển thị: *"Shop đã chuẩn bị xong, chờ bưu tá lấy"* | Đơn nằm tại tab `Chờ lấy hàng` kèm thông tin mã vận đơn AWB | Giám sát mật độ đơn chờ gom tại từng khu vực |
| **2. Bưu tá tiếp nhận (`ASSIGNED`)** | Đơn chuyển vào mục *"Đơn Đang Giao"* của tài xế | Thông báo: *"Bưu tá [Tên] đang đến lấy sách"* | Trạng thái hiển thị: *"Bưu tá [Tên] đang đến shop lấy hàng"* | Gán trách nhiệm bưu tá trong hệ thống dispatch |
| **3. Đã lấy hàng (`PICKED_UP`)** | Bưu tá quét mã vạch AWB hoặc bấm "Đã lấy hàng" | Mốc 3 trên Timeline sáng xanh: *"Đã xuất kho shop, đang vận chuyển"* | Đơn tự động nhảy từ tab `Chờ lấy hàng` $\to$ `Đang giao hàng` | Tăng chỉ số đơn đang luân chuyển trên mạng lưới |
| **4. Đang giao hàng (`OUT_FOR_DELIVERY`)** | Cập nhật định vị chặng cuối phát hàng | Thông báo đẩy: *"Shipper đang giao tới bạn, chuẩn bị [Số tiền] COD"* | Hiển thị: *"Đang giao tới người nhận"* | Giám sát KPI tỷ lệ giao đúng hạn trong ngày |
| **5. Giao thành công (`DELIVERED`)** | Nợ COD (nếu có) nảy số trên ví tài xế; tiền công cộng ví | Thông báo giao thành công; mở quyền Đánh giá sách & Yêu cầu đổi trả | **Kích hoạt ngay đồng hồ đếm ngược 2 phút đổi trả (`RT-06`)** | Đối soát công nợ giao vận; chuyển trạng thái Escrow |
| **6. Giao không thành công (`FAILED`)** | Ghi nhận lý do và số lần giao hàng thất bại | Nhận lý do giao thất bại; hiển thị hướng dẫn hẹn lại giờ giao | Nhận cảnh báo giao hàng không thành công; theo dõi kiện sách | Đưa vào danh sách theo dõi tỷ lệ hoàn hàng của khu vực |

---

## 🏗️ 2. DANH SÁCH TỆP TIN & PHÂN HỆ CAN THIỆP (AFFECTED FILES & CODE AREAS)

### A. Frontend Web App (`web/src/`):
1. **Khách hàng theo dõi đơn (Buyer Tracking):**
   - [`web/src/ui/components/order/OrderTrackingTimeline.tsx`](file:///e:/HuKi/web/src/ui/components/order/OrderTrackingTimeline.tsx) hoặc các khối Timeline trong [`web/src/app/orders/[id]/page.tsx`](file:///e:/HuKi/web/src/app/orders/[id]/page.tsx): Lắng nghe `ORDER_STATUS_CHANGED` và `SHIPPER_STATUS_UPDATED` để tự động làm sáng đèn từng bước giao hàng mà không cần F5.
2. **Kênh Người Bán (Seller Management):**
   - [`web/src/app/seller/orders/page.tsx`](file:///e:/HuKi/web/src/app/seller/orders/page.tsx) & [`web/src/app/seller/orders/[id]/page.tsx`](file:///e:/HuKi/web/src/app/seller/orders/[id]/page.tsx): Cập nhật trạng thái `SHIPPED` khi bưu tá quét lấy hàng, và `DELIVERED` khi giao xong.
   - [`web/src/ui/components/seller/EscrowTableBadge.tsx`](file:///e:/HuKi/web/src/ui/components/seller/EscrowTableBadge.tsx): Hiển thị `Đang Giao Hàng (Tạm Giữ)` khi đơn đang trên đường đi, và chuyển ngay sang `Ký Quỹ Đổi Trả (02:00)` khi Shipper hoàn tất giao hàng.
3. **Kênh Bưu Tá (Shipper App):**
   - [`web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx`](file:///e:/HuKi/web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx): Cung cấp các nút tương tác 1-chạm (`Xác nhận đã lấy hàng`, `Đang phát hàng`, `Giao thành công & Thu COD`).
   - [`web/src/ui/api/orderApi.ts`](file:///e:/HuKi/web/src/ui/api/orderApi.ts): Kết nối các hàm gọi API bưu tá (`shipperPickup`, `shipperDeliver`, `shipperFail`) kèm phát xung `realtimeSyncBus`.
4. **Hệ Thống Sự Kiện Realtime:**
   - [`web/src/ui/services/realtimeSyncBus.ts`](file:///e:/HuKi/web/src/ui/services/realtimeSyncBus.ts): Đảm bảo các sự kiện `SHIPPER_PICKED_UP`, `SHIPPER_DELIVERED`, `ORDER_DELIVERED` được broadcast tức thì xuyên suốt các tab và vai trò.

### B. Backend Microservices (`platform/apps/`):
1. [`platform/apps/commerce-service/src/modules/orders/orders.service.ts`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/orders.service.ts):
   - Hàm `shipperPickupOrder`: Cập nhật trạng thái `SellerOrder` sang `SHIPPED`, thiết lập `shippedAt = now()`.
   - Hàm `shipperDeliverOrder`: Cập nhật trạng thái `SellerOrder` sang `DELIVERED`, thiết lập `completedAt = now()`.
   - Hàm `shipperFailOrder`: Ghi nhận lý do thất bại và cập nhật trạng thái hủy/hoàn hàng.
2. CSDL: Các bảng `seller_orders`, `orders`, `order_status_history`.

---

## 🛠️ 3. THIẾT KẾ KỸ THUẬT & KIẾN TRÚC SỰ KIỆN

### A. Kênh Socket & Định Danh Room
```
Namespace: /shipping
Rooms:
  ├── tracking_{trackingNumber}     (Room theo dõi vận đơn cụ thể giữa Khách - Shop - Shipper)
  ├── store_deliveries_{storeId}    (Toàn bộ đơn hàng đang giao của một gian hàng)
  ├── user_orders_{userId}          (Thông báo cá nhân cho người mua)
  └── admin_logistics_desk          (Bàn điều phối trung tâm của Sàn)
```

### B. Các Sự Kiện Logistics Chuẩn (Logistics Events)
1. `shipment:assigned`: Bưu tá nhận đơn $\to$ Cập nhật thông tin tên bưu tá, SĐT cho Shop và Khách.
2. `shipment:picked_up`: Bưu tá đã lấy hàng thành công tại kho shop $\to$ Chuyển tab đơn bên Shop sang `Đang giao`.
3. `shipment:out_for_delivery`: Bắt đầu chặng phát hàng cuối cùng tới khách $\to$ Gửi thông báo chuẩn bị tiền mặt COD.
4. `shipment:delivered`: Giao hàng thành công $\to$ Bắn tín hiệu sang `commerce-service` chốt mốc `completedAt` để `RT-06` bắt đầu đếm 2 phút.
5. `shipment:delivery_failed`: Giao không thành công $\to$ Ghi nhận lý do và cập nhật cảnh báo.

### C. Cơ Chế Bàn Giao Dòng Tiền Sang RT-06 (Escrow Handover):
* **Trước khi `DELIVERED`:**
  - Khách thanh toán trước (PayOS): Tiền nằm trong Escrow với trạng thái `Đang Giao Hàng (Tạm Giữ)`.
  - Khách thanh toán COD: Tiền chưa thu, hiển thị trạng thái `Chờ Thu COD Khi Giao`.
* **Ngay khi nhận `shipment:delivered`:**
  1. `commerce-service` cập nhật `SellerOrder.status = DELIVERED` và ghi nhận mốc `completedAt = now()`.
  2. Bắn sự kiện `ORDER_DELIVERED` qua `realtimeSyncBus`.
  3. Màn hình Seller (`/seller/reports` và `/seller/escrow`) lập tức kích hoạt bộ đếm thời gian thực `Ký Quỹ Đổi Trả (02:00)` $\to$ `(01:59)` $\to$ `...` mà không cần F5.
  4. Sau 2 phút (00:00) không có khiếu nại $\to$ Tự động chuyển 85% vào `availableBalance` của Shop.

---

## 🎯 4. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED OUTCOME)

1. **Khách mua:** Theo dõi đơn hàng thấy thanh Timeline 5 bước nhảy nấc mượt mà theo từng thao tác của bưu tá.
2. **Seller:** Không bao giờ phải F5 để biết bưu tá đã đến lấy hàng hay chưa, tab đơn tự động dịch chuyển.
3. **Minh bạch dòng tiền:** Giải quyết triệt để vấn đề "hàng chưa giao mà đã đếm ngược đổi trả" nhờ chốt chặn mốc thời gian `DELIVERED` từ bưu tá.

---

## 🧪 5. KẾ HOẠCH KIỂM THỬ (TESTING & VERIFICATION CADENCE)

* **Test Case 1 (4-Party Sync):** Shipper bấm lần lượt `PICKED_UP` $\to$ `DELIVERED` $\to$ Xác nhận đồng thời cả 4 màn hình (Buyer, Seller, Shipper, Admin) cập nhật đúng trong < 300ms.
* **Test Case 2 (Escrow Handover):** Khi Shipper bấm `DELIVERED`, kiểm tra màn hình Seller bắt đầu đếm ngược 120 giây đổi trả ngay lập tức mà không cần reload F5.
* **Test Case 3 (Idempotent Delivery Event):** Giả lập shipper bấm xác nhận giao nhiều lần $\to$ Hệ thống chỉ xử lý và chốt mốc `completedAt` duy nhất 1 lần.
