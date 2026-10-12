# 🛵 RT-10: REALTIME SHIPPER DISPATCH, ROUTE TRACKING & COD WALLET

> **Mục tiêu tối thượng:** Cung cấp trải nghiệm thời gian thực toàn diện cho **Đội ngũ Bưu tá / Shipper (HuKi Express)** và liên kết liền mạch dòng tiền với **Kênh Người Bán (`RT-06`)** & **Quản Trị Sàn Admin**:
> 1. Khi Seller bấm "Đóng gói xong / Sẵn sàng giao" $\to$ Đơn hàng nổ chuông "Bíp bíp" trên Sàn Đơn Chờ Nhận (`/shipper/available-orders`) của bưu tá toàn khu vực mà không cần F5.
> 2. Khi Shipper bấm "Nhận đơn" $\to$ Khóa tranh đơn nguyên tử (`Atomic Claim`) đưa đơn vào mục "Đơn Đang Giao" trong **< 50ms**, đồng thời tự động xóa đơn khỏi màn hình của các tài xế khác.
> 3. Khi Shipper bấm "Đã lấy hàng" (`PICKED_UP`) $\to$ Đơn bên Seller tự động nhảy sang tab `Đang giao hàng`, Timeline bên Buyer sáng đèn bước 3.
> 4. Khi Shipper bấm "Giao thành công & Thu COD" (`DELIVERED`):
>    - Tiền nợ COD (`codDebt`) và tiền công bưu tá (`earnings`) nảy số ngay lập tức trên Ví Bưu Tá (`/shipper/wallet`).
>    - **Kích hoạt tức thì đồng hồ đếm ngược 2 phút đổi trả (`02:00` $\to$ `01:59`...) trên Ví Seller (`RT-06`) mà không cần F5.**
> 5. Khi Shipper quét mã VietQR PayOS nộp tiền COD về sàn $\to$ Nợ COD về 0, Admin Finance tự động đối soát cân đối tài khoản trung gian `COD_CLEARING`.

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG & MA TRẬN 4 BÊN TOÀN DIỆN (CROSS-ROLE IMPACT MATRIX)

Mọi thao tác của Shipper trên app điều phối đều tạo ra xung nhịp đồng bộ tức thì tới toàn bộ hệ sinh thái:

| Nghiệp vụ Bưu tá & Giao vận | SHIPPER (Bưu tá HuKi Express) | BUYER (Khách Mua / Bạn Đọc) | SELLER (Chủ Gian Hàng) | ADMIN (Quản Trị Hệ Thống Sàn) |
|:---|:---|:---|:---|:---|
| **1. Trực tuyến / Ngoại tuyến (`Online Toggle`)** | Gạt công tắc `Trực tuyến` $\to$ Bắt đầu nhận tín hiệu đơn mới trong bán kính hoạt động | Không thấy trực tiếp | Thấy số lượng bưu tá sẵn sàng gom hàng trong khu vực | Giám sát danh sách fleet trực tuyến tại `AdminShippersView` |
| **2. Bắn đơn lên Sàn chờ nhận (`Broadcast`)** | Âm thanh "Bíp bíp" reo, thẻ đơn mới nổ ở đầu bảng kèm địa chỉ lấy/giao và tiền công | Mốc 2: *"Shop đã chuẩn bị xong, đang điều phối bưu tá"* | Đơn chuyển sang tab `Chờ lấy hàng` kèm mã vận đơn AWB | Giám sát mật độ đơn hàng chưa có người nhận gom |
| **3. Tranh đơn nguyên tử (`Atomic Claim`)** | Tài xế bấm "Nhận đơn" $\to$ Đơn chuyển vào tab `Đang Giao`; biến mất khỏi các tài xế khác trong **< 50ms** | Nhận thông báo: *"Bưu tá [Tên] ([SĐT]) đang di chuyển đến lấy sách"* | Thông báo: *"Bưu tá [Tên] đã nhận vận chuyển đơn #ORD-xxxx"* | Hệ thống gán `assignedStaffId`, khóa trách nhiệm đơn hàng |
| **4. Đến kho lấy hàng (`PICKED_UP`)** | Bưu tá quét mã AWB / Bấm "Đã lấy hàng" $\to$ Chuyển trạng thái sang `Đang đi giao` | Mốc 3 sáng xanh: *"Đã xuất kho shop, đang vận chuyển"* | Đơn tự động nhảy từ tab `Chờ lấy hàng` sang `Đang giao hàng` | Tăng chỉ số khối lượng hàng đang luân chuyển trên mạng lưới |
| **5. Phát hàng & Thu COD (`DELIVERED`)** | Thu tiền mặt khách $\to$ Bấm "Giao thành công": Nợ COD `+tiền mặt`, Tiền công `+30.000đ` vào ví | Nhận thông báo giao thành công; mở quyền Đánh giá sách & Yêu cầu đổi trả | **Kích hoạt ngay đồng hồ 2 phút đếm ngược Ký Quỹ Đổi Trả (`RT-06`)** | Cập nhật sổ cái công nợ COD của đội ngũ bưu tá |
| **6. Giao thất bại / Boom hàng (`FAILED`)** | Chọn lý do (Không liên lạc được / Sai địa chỉ) $\to$ Đơn chuyển sang hoàn hàng | Nhận thông báo lý do giao không thành công; nút hẹn lại giờ | Nhận thông báo giao hàng thất bại; cập nhật tình trạng kiện sách | Ghi nhận tỷ lệ hoàn trả; xử lý hàng quay đầu |
| **7. Nộp tiền COD về Sàn (`COD Remittance`)** | Quét mã VietQR PayOS nộp tiền $\to$ Nợ COD trên ví giảm về 0, mở tiếp hạn mức nhận đơn | Không bị ảnh hưởng | Khi hết 2 phút đổi trả $\to$ Tiền nổ vào `Số Dư Khả Dụng` của Shop | Sàn đối soát cân đối tài khoản trung gian `COD_CLEARING` |

---

## 🏗️ 2. DANH SÁCH TỆP TIN & PHÂN HỆ CAN THIỆP (AFFECTED FILES & CODE AREAS)

### A. Frontend Web App (`web/src/`):
1. **Context & State:**
   - [`web/src/ui/context/ShipperContext.tsx`](file:///e:/HuKi/web/src/ui/context/ShipperContext.tsx): Đăng ký lắng nghe `realtimeSyncBus`, phát âm thanh khi có đơn mới, xử lý tranh đơn và cập nhật ví nợ COD thời gian thực.
   - [`web/src/ui/services/realtimeSyncBus.ts`](file:///e:/HuKi/web/src/ui/services/realtimeSyncBus.ts): Định nghĩa các Event Types mới:
     - `SHIPPER_AVAILABLE_ORDER_BROADCAST`: Khi shop đóng gói xong hoặc đơn mới được tạo.
     - `SHIPPER_ORDER_CLAIMED`: Khi 1 bưu tá nhận đơn $\to$ xóa khỏi các máy khác.
     - `SHIPPER_PICKED_UP`: Khi bưu tá lấy hàng từ kho shop.
     - `SHIPPER_DELIVERED`: Khi bưu tá giao thành công $\to$ kích hoạt 2 phút Escrow của Seller.
     - `SHIPPER_COD_REMITTED`: Khi bưu tá nộp tiền COD qua PayOS VietQR $\to$ cập nhật Admin Finance.
2. **Giao diện Bưu tá (Shipper Views):**
   - [`web/src/ui/components/shipper/ShipperAvailableOrdersView.tsx`](file:///e:/HuKi/web/src/ui/components/shipper/ShipperAvailableOrdersView.tsx): Tự động nạp đơn mới nổ chuông, hiệu ứng biến mất khi đơn bị tranh, nút nhận đơn phản hồi < 50ms.
   - [`web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx`](file:///e:/HuKi/web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx): Nút thao tác nhanh `Đã Lấy Hàng`, `Đang Giao`, `Đã Giao & Thu COD`.
   - [`web/src/ui/components/shipper/ShipperWalletView.tsx`](file:///e:/HuKi/web/src/ui/components/shipper/ShipperWalletView.tsx): Đồng hồ nợ COD nảy số, lịch sử giao dịch tăng giảm số dư thời gian thực.
   - [`web/src/ui/components/shipper/ShipperRemitCodView.tsx`](file:///e:/HuKi/web/src/ui/components/shipper/ShipperRemitCodView.tsx): Quét QR PayOS thanh toán nợ COD về sàn, tự động cập nhật khi PayOS xác nhận.
3. **Giao diện Khách hàng & Người bán:**
   - [`web/src/app/checkout/page.tsx`](file:///e:/HuKi/web/src/app/checkout/page.tsx): Đồng bộ giá cước vận chuyển chuẩn (20.000đ tiêu chuẩn vs 35.000đ hỏa tốc) giữa thẻ bên trái và tóm tắt bên phải.
   - [`web/src/app/seller/orders/page.tsx`](file:///e:/HuKi/web/src/app/seller/orders/page.tsx): Tự động nhảy tab `Chờ lấy hàng` $\to$ `Đang giao hàng` $\to$ `Đã giao` khi bưu tá thao tác.
   - [`web/src/app/seller/reports/page.tsx`](file:///e:/HuKi/web/src/app/seller/reports/page.tsx) & [`web/src/app/seller/escrow/page.tsx`](file:///e:/HuKi/web/src/app/seller/escrow/page.tsx): Kích hoạt tức thì `EscrowTableBadge` đếm ngược 2 phút khi Shipper bấm `DELIVERED`.
4. **Giao diện Quản trị Admin:**
   - [`web/src/ui/components/admin/AdminShippersView.tsx`](file:///e:/HuKi/web/src/ui/components/admin/AdminShippersView.tsx): Bảng điều phối bưu tá nảy số đơn hoàn thành và nợ COD thời gian thực.
   - [`web/src/ui/components/admin/AdminFinanceView.tsx`](file:///e:/HuKi/web/src/ui/components/admin/AdminFinanceView.tsx): Quản lý tài khoản ký quỹ thu hộ `COD_CLEARING`.

### B. Backend Microservices (`platform/apps/`):
1. [`platform/apps/commerce-service/src/modules/orders/shipper-orders.controller.ts`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/shipper-orders.controller.ts): Bổ sung endpoint atomic claim `PATCH /orders/shipper/orders/:id/claim`.
2. [`platform/apps/commerce-service/src/modules/orders/orders.service.ts`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/orders.service.ts):
   - Xử lý câu lệnh khóa nguyên tử chống tranh đơn `UPDATE ... WHERE assigned_staff_id IS NULL`.
   - Cập nhật `completedAt` và ghi nhận lịch sử trạng thái khi shipper giao thành công.
   - Bắn sự kiện socket / outbox event khi có biến động giao nhận.

---

## 🛠️ 3. THIẾT KẾ KỸ THUẬT & KIẾN TRÚC SỰ KIỆN CHI TIẾT

### A. Kênh Socket & Định Danh Room
```
Namespace: /shipper
Rooms:
  ├── shipper_pool_online         (Toàn bộ bưu tá đang bật công tắc Trực tuyến)
  ├── shipper_personal_{staffId}   (Kênh riêng của tài xế: thông báo điều phối, nợ COD cá nhân)
  └── active_delivery_{shipmentId} (Kênh theo dõi lộ trình đơn hàng giữa Khách - Shop - Shipper)
```

### B. Giải Thuật Tranh Đơn Nguyên Tử (Pessimistic Atomic Claim)
Khi 2 shipper cùng nhìn thấy 1 đơn sách và cùng bấm "Nhận đơn", hệ thống sử dụng khóa mức hàng CSDL:
```sql
UPDATE seller_orders
SET 
  assigned_shipper_id = :shipperId,
  assigned_shipper_name = :shipperName,
  assigned_shipper_phone = :shipperPhone,
  status = 'PICKING_UP',
  updated_at = NOW()
WHERE id = :sellerOrderId 
  AND (assigned_shipper_id IS NULL OR status = 'READY_FOR_PICKUP');
```
* **Tài xế bấm trước (affectedRows = 1):** Thành công $\to$ Bắn socket `SHIPPER_ORDER_CLAIMED` xóa đơn khỏi room chung của các tài xế khác.
* **Tài xế bấm sau (affectedRows = 0):** Thất bại $\to$ Trả về mã lỗi 409 `ORDER_ALREADY_CLAIMED` $\to$ Giao diện hiển thị: *"Đơn hàng vừa được bưu tá khác tiếp nhận!"*.

### C. Cơ Chế Thu Tiền Mặt COD & Nợ Sàn (COD Debt Accounting)
1. **Thu tiền mặt từ khách:**
   - Ví dụ đơn sách trị giá 138.000đ (Sách 108.000đ + Ship 30.000đ):
   - Shipper thu trọn 138.000đ tiền mặt từ khách.
   - Shipper được giữ lại 30.000đ tiền công giao hàng.
   - Shipper ghi nhận **Nợ COD phải nộp sàn:** $138.000đ - 30.000đ = 108.000đ$.
2. **Nộp tiền COD về sàn (`COD Remittance`):**
   - Shipper quét mã VietQR PayOS nộp 108.000đ về quỹ sàn HuKi.
   - Nợ COD trên ví Shipper giảm về 0đ.
   - Sàn ghi nhận tiền về tài khoản trung gian `COD_CLEARING`.
3. **Kích hoạt giải ngân Escrow cho Seller:**
   - Ngay thời điểm Shipper bấm `DELIVERED`, Seller nhận tín hiệu `ORDER_DELIVERED`.
   - Tiền hàng 108.000đ bắt đầu đếm ngược 2 phút `Ký Quỹ Đổi Trả (02:00)` tại `RT-06`.
   - Hết 2 phút, tiền 95% (179.550đ) tự động chuyển sang `Số Dư Khả Dụng` để Shop có thể rút ra tài khoản ngân hàng.

---

## 🎯 4. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED ACCEPTANCE OUTCOMES)

1. **Chuông Báo Tức Thì (Zero Lag):** Khi Seller bấm chuẩn bị xong hàng, toàn bộ Shipper trực tuyến nghe tiếng chuông báo đơn mới, đơn xuất hiện ngay đầu bảng mà không cần F5.
2. **Tranh Đơn Không Trùng Lặp (Zero Conflict):** Bưu tá A nhận đơn $\to$ Màn hình bưu tá B đơn tự động biến mất trong vòng **< 50ms**.
3. **Timeline Tự Nhảy Nấc:** Khách hàng mở trang xem chi tiết đơn hàng thấy từng nấc chuyển từ `Chờ lấy hàng` $\to$ `Đang giao hàng` $\to$ `Đã giao` theo đúng thao tác bưu tá.
4. **Kích Hoạt Escrow Đúng Chuẩn Shopee:** Tiền hàng của Seller chỉ bắt đầu đếm ngược đổi trả khi và chỉ khi Shipper đã xác nhận giao thành công tận tay người nhận.
5. **Ví Nợ COD Chuẩn Xác:** Shipper giao xong đơn nào thì nợ COD và tiền ship cộng dồn chuẩn xác đơn đó; nộp tiền qua PayOS thì nợ tự động xóa bỏ.

---

## 🧪 5. KỊCH BẢN KIỂM THỬ THỰC TẾ (TESTING & VERIFICATION MATRIX)

* [ ] **Test Case 1 (Order Broadcast & Chime Alert):**
  - Mở 1 tab Seller và 1 tab Shipper (`/shipper/available-orders`).
  - Seller bấm xác nhận gói hàng xong $\to$ Màn hình Shipper phát âm thanh "Bíp bíp", thẻ đơn mới xuất hiện ngay đầu danh sách mà không cần reload F5.
* [ ] **Test Case 2 (Atomic Claim Race Test):**
  - Mở 2 tab Shipper A và B cùng xem Sàn Đơn Chờ Nhận.
  - Cả 2 cùng bấm "Nhận đơn" cho cùng 1 đơn hàng $\to$ Tab A nhận thành công và nhảy sang "Đơn Đang Giao", tab B nhận thông báo "Đơn đã được nhận" và tự động ẩn đơn.
* [ ] **Test Case 3 (Delivery Handover to Escrow Countdown):**
  - Shipper bấm "Đã lấy hàng" $\to$ Tab Seller nhảy sang tab `Đang giao hàng`.
  - Shipper bấm "Giao thành công & Thu COD" $\to$ Tab Seller chuyển sang `Ký Quỹ Đổi Trả (02:00)` và bắt đầu đếm ngược thời gian thực.
  - Hết 2 phút (00:00) $\to$ Tiền tự động nhảy sang `Số Dư Khả Dụng` của Seller.
* [ ] **Test Case 4 (COD Debt Live Ledger):**
  - Kiểm tra ví Shipper (`/shipper/wallet`) sau khi giao đơn COD: Tiền nợ COD tăng đúng bằng giá trị tiền mặt trừ cước ship; tiền công tăng 30.000đ.
  - Shipper quét mã VietQR nộp tiền $\to$ Nợ COD tự động về 0đ.
* [ ] **Test Case 5 (Checkout Shipping Fee Consistency):**
  - Kiểm tra trang Checkout: Chọn "Tiêu chuẩn (2-3 ngày) 20.000đ" $\to$ Cột tổng kết bên phải hiển thị đúng phí ship 20.000đ (khớp 100% giữa 2 bên).
