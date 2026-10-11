# 🛵 RT-10: REALTIME SHIPPER DISPATCH, ROUTE TRACKING & COD WALLET

> **Mục tiêu:** Cung cấp trải nghiệm thời gian thực toàn diện cho **Đội ngũ Bưu tá / Shipper (HuKi Express)**: Khi Seller bấm "Sẵn sàng giao" $\to$ Đơn hàng nổ chuông trên "Sàn Đơn Chờ Nhận" của Bưu tá; khi Shipper bấm "Nhận đơn" $\to$ Đơn biến mất khỏi sàn chung và nhảy vào "Đơn Đang Giao"; khi giao thành công $\to$ Tiền nợ COD và ví thu nhập của Shipper nảy số tức thì.

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG (SCOPE & IMPACT ANALYSIS)

### A. Frontend (Giao diện người dùng)
* **Shipper Portal (`/shipper`):**
  * `ShipperLayout.tsx`:
    * Badge số đơn chờ nhận cạnh mục *"Sàn Đơn Chờ Nhận"* (`/shipper/available-orders`).
    * Badge số đơn đang giao cạnh *"Đơn Đang Giao"* (`/shipper/active-deliveries`).
    * Con số nợ COD trên menu *"Ví Tiền & Nợ COD"* (`/shipper/wallet`).
    * Nút gạt Toggle trạng thái tài xế `isOnline` (Trực tuyến / Nghỉ ngơi).
  * Trang `shipper/available-orders/page.tsx`: Danh sách đơn hàng mới nổi lên ngay lập tức khi shop đóng gói xong, có nút "Nhận Đơn Ngay".
  * Trang `shipper/active-deliveries/page.tsx`: Cập nhật trạng thái từng đơn (Đã lấy hàng tại shop $\to$ Đang giao $\to$ Khách đã nhận & Thu tiền COD).
* **Buyer Web:**
  * Thông báo đẩy: *"Tài xế [Tên] đang giao sách đến bạn, chuẩn bị [Số tiền] COD"*.
* **Seller Portal:**
  * Trạng thái đơn đổi sang: *"Bưu tá [Tên] đã tiếp nhận và đang trên đường đến lấy hàng"*.
* **Admin Portal:**
  * Trang `admin/shippers`: Giám sát danh sách bưu tá đang online, vị trí và số tiền COD các tài xế đang giữ.

### B. Backend (Microservices)
* `shipping-service`:
  * Module `dispatch`: Điều phối đơn hàng cho shipper.
  * Module `delivery-staff`: Quản lý tài xế, tọa độ vị trí và nợ COD.
* `commerce-service`: Đồng bộ trạng thái đơn hàng `SellerOrder`.
* CSDL: Bảng `shipments`, `delivery_staff`, `delivery_logs`, `wallets`.

### C. Mức độ rủi ro & Biện pháp phòng ngừa
* **Rủi ro:** Hai shipper bấm nút "Nhận đơn" cùng một lúc cho một đơn hàng hời (Race condition giành đơn).
* **Phòng ngừa:** Áp dụng khóa bi quan (Pessimistic Locking / Atomic Update):
  ```sql
  UPDATE shipments 
  SET assigned_staff_id = :staffId, status = 'ASSIGNED' 
  WHERE id = :shipmentId AND assigned_staff_id IS NULL;
  ```
  Shipper nào nhận thành công sẽ có ACK socket trả về `SUCCESS`, shipper bấm sau nhận thông báo *"Đơn hàng đã được bưu tá khác tiếp nhận"*.

---

## 🛠️ 2. THIẾT KẾ KỸ THUẬT & CÁCH LÀM (IMPLEMENTATION PLAN)

### A. Kênh Socket & Định danh Room
```
Namespace: /shipper
Rooms:
  ├── shipper_pool_online         (Toàn bộ bưu tá đang bật trạng thái Online)
  ├── shipper_personal_{staffId}   (Kênh riêng của từng tài xế nhận thông báo điều phối)
  └── active_delivery_{shipmentId} (Kênh theo dõi lộ trình đơn hàng giữa Khách - Shop - Shipper)
```

### B. Các Sự Kiện Chuẩn (Shipper Events)
1. `delivery:available_broadcast`: Shop đóng gói xong $\to$ Bắn đơn lên Sàn Đơn Chờ Nhận cho toàn bộ shipper khu vực.
2. `delivery:claimed_by_shipper`: Một shipper đã nhận đơn $\to$ Xóa đơn đó khỏi màn hình các shipper khác trong **< 50ms**.
3. `delivery:status_updated`: Shipper cập nhật mốc giao (`PICKED_UP`, `IN_TRANSIT`, `DELIVERED`, `FAILED`).
4. `shipper:cod_debt_changed`: Hoàn tất đơn COD $\to$ Số tiền nợ COD của tài xế tăng lên trên màn hình ví.

### C. Các bước thực hiện chi tiết
1. **Bước 1 (Backend Dispatcher):** Khi Seller đổi trạng thái sang `PREPARED / READY_FOR_PICKUP` $\to$ `shipping-service` phát socket event `delivery:available_broadcast` vào room `shipper_pool_online`.
2. **Bước 2 (Shipper Context Integration):** Nâng cấp `ShipperContext.tsx`:
   * Lắng nghe event $\to$ Phát tiếng chuông "Bíp bíp - Đơn giao mới!" $\to$ Cập nhật mảng `availableOrders`.
   * Khi shipper bấm nhận $\to$ Gửi event `claim_order` $\to$ Chuyển đơn sang `activeDeliveries`.
3. **Bước 3 (COD Debt Live Sync):** Khi shipper bấm "Giao thành công & Đã thu COD" $\to$ Nợ COD trên header tự động nhảy số mà không cần tải lại trang.

---

## 🎯 3. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED OUTCOME)

1. Seller đóng gói sách xong bấm "Gọi bưu tá" $\to$ Điện thoại/máy tính của Shipper đang online reo chuông, xuất hiện đơn hàng mới kèm tiền cước và địa chỉ lấy hàng trong **< 150ms**.
2. Khi Shipper A bấm "Nhận đơn" $\to$ Màn hình của Shipper B đơn hàng biến mất ngay lập tức; màn hình Seller hiện: *"Bưu tá A đang đến lấy sách"*.
3. Khi Shipper giao sách và thu 250.000đ tiền mặt $\to$ Mục "Ví Tiền & Nợ COD" của Shipper tự động cộng `+250.000đ` nợ COD và cộng tiền công giao hàng ngay lập tức.

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ (TESTING & VERIFICATION CADENCE)

* **Test Case 1 (Order Broadcast & Audio Alert):** Seller tạo đơn và bấm gọi bưu tá $\to$ Màn hình Shipper Portal nảy số badge và phát chuông báo đơn mới.
* **Test Case 2 (Atomic Claim Race Test):** Mở 2 tab Shipper (Shipper 1 và Shipper 2) cùng nhìn thấy 1 đơn $\to$ Bấm nhận đồng thời $\to$ Xác nhận chỉ 1 tab nhận thành công, tab còn lại hiển thị thông báo đã có người nhận.
* **Test Case 3 (Full Delivery to Wallet):** Shipper bấm hoàn tất giao hàng $\to$ Kiểm tra số dư nợ COD và tiền công cập nhật đúng trên UI mà không cần F5.
