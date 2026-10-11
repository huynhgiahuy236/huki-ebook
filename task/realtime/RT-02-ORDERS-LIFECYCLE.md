# 📦 RT-02: REALTIME ORDERS LIFECYCLE & SUB-ORDER SPLITTING

> **Mục tiêu:** Cập nhật thời gian thực toàn bộ chu trình đơn hàng: Khách bấm "Đặt Hàng / Thanh Toán" $\to$ Sub-Orders tự động nổ chuông "tinh tinh" bên màn hình Seller $\to$ Trạng thái chuyển dịch mượt mà giữa các bên (Chờ thanh toán $\to$ Chờ xác nhận $\to$ Đang giao $\to$ Hoàn thành) mà không cần F5.

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG (SCOPE & IMPACT ANALYSIS)

### A. Frontend (Giao diện người dùng)
* **Seller Portal:**
  * Trang `seller/orders/page.tsx`: Bảng danh sách đơn hàng con tự động chèn thêm dòng mới lên đầu trang khi có đơn mới nổ.
  * Tab đếm số lượng: Các tab `PENDING_CONFIRMATION`, `CONFIRMED`, `SHIPPED` tự động nảy số lượng badge trên tab header.
  * Chi tiết đơn hàng `seller/orders/[id]`: Trạng thái đơn tự động đổi màu khi có thanh toán thành công từ PayOS.
* **Buyer Web:**
  * Trang `user/orders/page.tsx` và `checkout/success/page.tsx`: Tự động nhảy từ "Chờ thanh toán (QR)" sang "Thanh toán thành công" ngay khi PayOS báo webhook.
* **Admin Portal:**
  * Trang `admin/dashboard`: Chỉ số GMV và Tổng đơn hàng nảy số thời gian thực.

### B. Backend (Microservices)
* `commerce-service`:
  * `OrdersService` (tạo đơn, cập nhật trạng thái).
  * `PaymentsService` (nhận webhook PayOS $\to$ cập nhật đơn Master và Sub-Orders).
* `community-service`: Tiếp nhận socket broadcast qua namespace `/orders`.
* CSDL: Các bảng `orders`, `seller_orders`, `order_status_history`.

### C. Mức độ rủi ro & Biện pháp phòng ngừa
* **Rủi ro:** Khi có nhiều đơn hàng cùng lúc (Flash Sale), việc bắn quá nhiều sự kiện socket có thể gây lag trình duyệt hoặc làm xáo trộn thứ tự render.
* **Phòng ngừa:** Phía Client áp dụng kỹ thuật Debounce/Throttle đối với danh sách và chỉ cập nhật trực tiếp bản ghi nếu ID trùng khớp; nếu có trên 10 đơn mới cùng lúc thì hiển thị nút *"Có 12 đơn hàng mới - Bấm để tải lại"*.

---

## 🛠️ 2. THIẾT KẾ KỸ THUẬT & CÁCH LÀM (IMPLEMENTATION PLAN)

### A. Kênh Socket & Định danh Room
```
Namespace: /orders
Rooms:
  ├── seller_orders_{storeId}   (Nhận tất cả sự kiện đơn hàng của shop đó)
  ├── user_orders_{userId}       (Khách mua theo dõi đơn hàng của chính mình)
  └── admin_orders_monitor       (Admin giám sát toàn sàn)
```

### B. Các Sự Kiện Chuẩn (Event Names)
1. `order:created`: Đơn hàng mới được tạo (Master Order + N Sub-Orders).
2. `order:payment_succeeded`: Khách đã quét mã VietQR PayOS thành công $\to$ Đơn chuyển sang `PROCESSING / PENDING_CONFIRMATION`.
3. `order:status_changed`: Đơn hàng được xác nhận, giao cho bưu tá, hoặc hoàn thành.
4. `order:cancelled`: Đơn bị hủy (do khách hủy hoặc hết hạn TTL 15 phút).

### C. Các bước thực hiện chi tiết
1. **Bước 1 (Backend Dispatch):** Khi `orders.service.ts` hoàn tất transaction tạo đơn hàng hoặc khi webhook `PayOS` báo thành công $\to$ Gửi payload sự kiện sang Socket Server.
2. **Bước 2 (Seller UI Integration):** Tạo Hook `useSellerRealtimeOrders.ts`:
   * Lắng nghe `order:created` $\to$ Phát âm thanh "Đơn hàng mới!" (Audio tone) $\to$ Thêm đơn vào đầu mảng state.
   * Lắng nghe `order:status_changed` $\to$ Cập nhật dòng tương ứng tại chỗ.
3. **Bước 3 (Buyer UI Integration):** Tại trang Checkout QR, Hook `usePaymentStatusWatcher.ts` lắng nghe `order:payment_succeeded` $\to$ Tự động chuyển hướng sang trang Hoàn tất đơn hàng.

---

## 🎯 3. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED OUTCOME)

1. Khách mua quét mã QR PayOS $\to$ Trong vòng **500ms** màn hình điện thoại/máy tính của khách tự động chuyển sang trang thành công (không cần bấm nút "Tôi đã chuyển khoản").
2. Màn hình máy tính của Seller đang mở danh sách đơn hàng nổ chuông và hiện thông báo toast: *"Bạn có 1 đơn hàng mới #ORD-xxxx trị giá 350.000đ!"*
3. Đơn hàng mới xuất hiện ngay dòng đầu tiên mà Seller không cần nhấn F5.

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ & KẾT QUẢ NGHIỆM THU (TESTING & ACCEPTANCE)

* [x] **Test Case 1 (End-to-End Flow & Sound Alert):**
  * Buyer đặt hàng COD hoặc thanh toán PayOS $\to$ Phát sự kiện qua `realtimeSyncBus` (0ms) kết hợp Smart Polling Heartbeat (4s) đảm bảo nhận đơn đa thiết bị / tab ẩn danh.
  * Toàn bộ Seller Portal (`SellerLayout` & `seller/orders`) lập tức phát chuông Web Audio API (`soundEffects.playOrderChime()`) và hiển thị Toast nổi bật: *"Nổ đơn hàng mới! [Xử lý ngay]"*.
* [x] **Test Case 2 (Auto-update Orders Table without F5):**
  * Trang `seller/orders` tiếp nhận realtime update $\to$ Tự động tải lại và cập nhật tab badge `Chờ Xác Nhận` mà không yêu cầu người dùng phải reload F5.
* [x] **Test Case 3 (Zero-Touch Ebook Activation - Kích hoạt tự động không cần duyệt):**
  * Khi khách hàng thanh toán thành công đơn Ebook / Sách số $\to$ Backend lập tức chuyển `SellerOrder` sang `COMPLETED`, cấp quyền đọc `bookAccess: ACTIVE`.
  * Không để ở `PENDING_CONFIRMATION`, không bắt Seller bấm duyệt hay thao tác thủ công.
* [x] **Test Case 4 (Guaranteed Payment Redirect):**
  * Trang `checkout/payment/[orderId]` chuyển hướng tin cậy sang `/order-success` sau khi phát tín hiệu đồng bộ qua bus.
* [x] **Test Case 5 (Seller Status Transitions Propagation):**
  * Khi người bán bấm Xác Nhận, Đóng Gói, Giao Hàng hoặc Hủy đơn $\to$ Phát `ORDER_STATUS_CHANGED` $\to$ Cả trang chi tiết đơn của Khách (`orders/[id]`) và Seller (`seller/orders/[id]`) tự động đồng bộ trạng thái mới.

> **Trạng thái:** ✅ **HOÀN THÀNH (COMPLETED)** — Đã hoàn tất và kiểm thử thành công toàn bộ luồng nhận đơn COD & Online, tự động kích hoạt sách số và nổ chuông thời gian thực.
