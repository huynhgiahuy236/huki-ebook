# 🚚 RT-09: REALTIME MULTI-VENDOR LOGISTICS & AWB TRACKING

> **Mục tiêu:** Cập nhật thời gian thực hành trình giao hàng và định vị vận đơn: Khi Shipper/Bưu tá lấy hàng (`PICKED_UP`) $\to$ Đang giao (`SHIPPING`) $\to$ Giao thành công (`DELIVERED`) $\to$ Tiến trình trên thanh Timeline đơn hàng của Khách và Seller tự động nhảy mốc mà không cần F5.

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG (SCOPE & IMPACT ANALYSIS)

### A. Frontend (Giao diện người dùng)
* **Buyer Web:**
  * Trang chi tiết đơn hàng `user/orders/[id]`: Thanh Timeline giao hàng 5 bước (`Đặt hàng` $\to$ `Đóng gói` $\to$ `Xuất kho` $\to$ `Đang giao` $\to$ `Đã nhận`) tự động đổi xanh khi có sự kiện từ shipper.
* **Seller Portal:**
  * Trang `seller/orders?tab=PENDING_CONFIRMATION`: Đơn hàng tự động chuyển sang tab `SHIPPED` ngay khi bưu tá quét mã vận đơn AWB tại kho.
* **Shipper Mobile / Web Portal:**
  * Giao diện dành cho bưu tá bấm "Đã lấy hàng" hoặc "Giao thành công".

### B. Backend (Microservices)
* `shipping-service`:
  * Quản lý `Shipment`, `DeliveryLog`, `DeliveryStaff`.
  * Webhook tiếp nhận sự kiện từ đối tác vận chuyển bên ngoài (GHTK / GHN API).
* `commerce-service`: Đồng bộ trạng thái của `SellerOrder` tương ứng.
* CSDL: Các bảng `shipments`, `delivery_logs`, `seller_orders`.

### C. Mức độ rủi ro & Biện pháp phòng ngừa
* **Rủi ro:** Webhook từ hãng vận chuyển có thể gửi trễ hoặc gửi nhiều lần (Duplicate Webhooks).
* **Phòng ngừa:** `shipping-service` áp dụng Idempotency Key theo cặp `(trackingNumber, shipmentStatus)` để đảm bảo mỗi nấc trạng thái chỉ kích hoạt cập nhật và bắn socket duy nhất 1 lần.

---

## 🛠️ 2. THIẾT KẾ KỸ THUẬT & CÁCH LÀM (IMPLEMENTATION PLAN)

### A. Kênh Socket & Định danh Room
```
Namespace: /shipping
Rooms:
  ├── tracking_{trackingNumber}   (Khách và Shop theo dõi vận đơn này)
  └── store_deliveries_{storeId}  (Toàn bộ đơn hàng đang giao của shop)
```

### B. Các Sự Kiện Chuẩn (Logistics Events)
1. `shipment:picked_up`: Bưu tá đã đến kho lấy kiện hàng.
2. `shipment:in_transit`: Kiện hàng đang luân chuyển qua các bưu cục.
3. `shipment:out_for_delivery`: Bưu tá đang đi phát hàng tới địa chỉ người nhận.
4. `shipment:delivered`: Giao thành công (ký nhận gói hàng).
5. `shipment:delivery_failed`: Giao không thành công (khách không nghe máy, hẹn lại).

### C. Các bước thực hiện chi tiết
1. **Bước 1 (Backend Webhook Handler):** `shipping-service` nhận webhook cập nhật từ hãng vận chuyển $\to$ Cập nhật bảng `shipments` $\to$ Emit socket event `shipment:status_changed`.
2. **Bước 2 (Cross-service Sync):** Phát event nội bộ sang `commerce-service` cập nhật `SellerOrder.status = DELIVERED`.
3. **Bước 3 (Buyer Order Timeline Animation):** Tại trang xem đơn hàng của Buyer, thanh tiến trình hiển thị icon xe tải di chuyển mượt mà tới nấc tiếp theo kèm thông báo đẩy.

---

## 🎯 3. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED OUTCOME)

1. Khi bưu tá quét mã xác nhận "Đã lấy hàng":
   * Màn hình của Seller: Đơn hàng tự động biến mất khỏi tab "Chờ Giao Hàng" và nhảy sang tab "Đang Giao".
   * Màn hình của Khách mua: Nấc "Đã giao cho đơn vị vận chuyển" tự động sáng đèn xanh.
2. Khi bưu tá bấm "Đã giao thành công":
   * Đơn hàng chuyển sang trạng thái "Giao thành công" tức thì.
   * Kích hoạt tự động thời gian đếm ngược 7 ngày đổi trả (POL-11) và chuyển tiền Escrow (POL-14).

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ (TESTING & VERIFICATION CADENCE)

* **Test Case 1 (Status Progression Test):** Giả lập tuần tự 4 nấc trạng thái giao hàng $\to$ Quan sát thanh Timeline của Buyer cập nhật từng nấc không cần F5.
* **Test Case 2 (Seller Order Tab Migration):** Kiểm tra đơn hàng di chuyển tự động giữa các tab trạng thái trên Kênh Người Bán.
* **Test Case 3 (Idempotency Protection):** Bắn cùng 1 webhook "Đã giao hàng" 3 lần liên tiếp $\to$ Kiểm tra socket chỉ kích hoạt 1 lần duy nhất, không tạo log trùng lặp.
