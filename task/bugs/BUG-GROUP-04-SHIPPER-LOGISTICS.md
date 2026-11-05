# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Nhân Viên Giao Hàng & Vận Chuyển (Shipper Portal & Logistics)

> **Mã phân hệ:** `BUG-GROUP-04`  
> **Đối tượng người dùng:** Tài xế giao nhận (Shipper), Đội ngũ điều phối kho vận (Logistics Dispatcher), Quản lý đối soát COD.  
> **Phạm vi kiểm thử:** Toàn bộ 10 màn hình cổng vận chuyển (`/shipper/*`), bao gồm tiếp nhận kiện hàng tại kho người bán, điều hướng lộ trình, xác thực giao hàng thành công (POD), nộp tiền thu hộ COD về sàn và đối soát ví tài xế.  
> **Nguyên tắc kỹ thuật:** Bám sát luồng chuyển trạng thái đơn hàng FSM (State Machine), xử lý tiền mặt COD an toàn, không giả lập dữ liệu, một giải pháp dứt khoát duy nhất.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (SHIPPER & LOGISTICS)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **SH-001** | Đơn đang giao (`/shipper/active-deliveries`) | Nút **"Xác Nhận Đã Giao Hàng"** (`done_all`) | Nghiệp Vụ / State | **P0 (Blocker)** | ✅ **PASS** (Đã bắt buộc ảnh POD và ghi nhận audit log) |
| **SH-002** | Nộp tiền COD (`/shipper/remit-cod`) | Nút **"Tạo Mã VietQR Nộp Tiền COD"** | Thanh Toán / API | **P0 (Blocker)** | ✅ **PASS** (Đã chặn số tiền âm/0đ & kẹp biên an toàn) |
| **SH-003** | Nhận đơn hàng mới (`/shipper/available-orders`) | Nút **"Tiếp Nhận Kiện Hàng (Pickup)"** | Đồng Thời / Lock | **P1 (Critical)** | ✅ **PASS** (Khóa lạc quan OCC updateMany chống tranh chấp đơn) |
| **SH-004** | Đơn đang giao (`/shipper/active-deliveries`) | Nút **"Báo Giao Thất Bại / Hẹn Lại"** | Modal / Form | **P1 (Critical)** | ✅ **PASS** (Validate bắt buộc lý do từ UI đến Backend) |
| **SH-005** | Ví tài xế (`/shipper/wallet`) | Nút **"Chi Tiết Lịch Sử Đối Soát"** | Dữ Liệu / Phân Trang | **P2 (Major)** | ✅ **PASS** (Deduplicate transaction ID loại trừ key collision) |
| **SH-006** | Trả hàng về shop (`/shipper/returns`) | Nút **"Xác Nhận Bàn Giao Sách Hoàn Cho Shop"** | Xác Thực / Mã OTP | **P1 (Critical)** | ✅ **PASS** (Bổ sung Modal nhập OTP đối soát hai chiều với Shop) |

---

## CHI TIẾT KỸ THUẬT TỪNG LỖI CỤ THỂ

---

### [SH-001] Nút "Xác Nhận Đã Giao Hàng" Bắt Buộc Ảnh Bằng Chứng POD (Proof of Delivery)
- **Vị trí chính xác:**
  - Màn hình: Quản lý đơn hàng đang giao (`/shipper/active-deliveries`)
  - File mã nguồn:
    - [web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx](file:///e:/HuKi/web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx)
    - [web/src/ui/context/ShipperContext.tsx](file:///e:/HuKi/web/src/ui/context/ShipperContext.tsx)
    - [web/src/ui/api/orderApi.ts](file:///e:/HuKi/web/src/ui/api/orderApi.ts)
    - [platform/apps/commerce-service/src/modules/orders/orders.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/orders.service.ts)
- **Nút bấm / Thao tác:**
  - Nút: `"Xác nhận giao hàng thành công"` (icon `check_circle`).
- **Hiện tượng lỗi ban đầu:**
  - Shipper có thể bỏ qua upload ảnh hiện trường hoặc dùng thao tác bulk deliver để đánh dấu giao thành công hàng loạt mà không có ảnh chụp kiện hàng hoặc chữ ký người nhận.
- **Nguyên nhân gốc rễ:**
  - Nút xác nhận không kiểm tra state ảnh POD; đồng thời danh sách bulk action chứa tùy chọn `BULK_DELIVER` bỏ qua toàn bộ luồng kiểm chứng POD.
- **Giải pháp dứt khoát đã triển khai:**
  1. Loại bỏ hoàn toàn hành động `BULK_DELIVER` trong danh sách bulk actions để triệt tiêu lỗ hổng bypass.
  2. Bắt buộc `disabled={!podImagePreview || podSubmitting}` tại Modal hoàn tất giao hàng.
  3. Truyền trực tiếp `podImageUrl` qua `orderApi.shipperDeliver(...)` lên `commerce-service`.
  4. Lưu vết `podImageUrl` và `verifiedAt` vào trường `metadata` của `OrderStatusHistory` trên cơ sở dữ liệu.

---

### [SH-002] Nút "Tạo Mã VietQR Nộp Tiền COD" Bị Lỗi Số Tiền Âm Khi Có Đơn Đổi Trả
- **Vị trí chính xác:**
  - Màn hình: Đối soát & nộp tiền COD (`/shipper/remit-cod`)
  - File mã nguồn:
    - [web/src/ui/components/shipper/ShipperRemitCodView.tsx](file:///e:/HuKi/web/src/ui/components/shipper/ShipperRemitCodView.tsx)
    - [web/src/ui/context/ShipperContext.tsx](file:///e:/HuKi/web/src/ui/context/ShipperContext.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Tạo mã QR nộp tiền COD về tài khoản sàn"`.
- **Hiện tượng lỗi ban đầu:**
  - Khi shipper có các đơn trả hàng cần ứng tiền hoàn, `codDebt` có thể rơi vào trạng thái `<= 0`. Khi bấm tạo mã, PayOS trả về `400 Bad Request: Amount must be greater than 0`, làm gãy giao diện nộp tiền.
- **Nguyên nhân gốc rễ:**
  - Input số tiền và mã PayOS lấy trực tiếp giá trị `wallet.codDebt` mà không kẹp biên giá trị dương tối thiểu (`Math.max(0, wallet.codDebt)`).
- **Giải pháp dứt khoát đã triển khai:**
  1. Kẹp biên an toàn `Math.max(0, wallet.codDebt)` khi khởi tạo form nộp tiền.
  2. Vô hiệu hóa nút tạo mã và ẩn VietQR container nếu `amount <= 0`, hiển thị banner thông báo tài xế hiện không có nợ COD cần thanh toán.
  3. Thêm guard kiểm tra `if (amount <= 0) return;` trong hàm xử lý `remitCodDebt`.

---

### [SH-003] Lỗi Tranh Chấp Đơn Hàng Song Song Khi 2 Shipper Cùng Bấm "Tiếp Nhận Đơn"
- **Vị trí chính xác:**
  - Màn hình: Đơn hàng khả dụng chờ nhận (`/shipper/available-orders`)
  - File mã nguồn:
    - [platform/apps/commerce-service/src/modules/orders/orders.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/orders.service.ts)
    - [web/src/ui/context/ShipperContext.tsx](file:///e:/HuKi/web/src/ui/context/ShipperContext.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Nhận đơn này"` (`local_shipping`).
- **Hiện tượng lỗi ban đầu:**
  - Hai shipper cùng thấy một đơn trên danh sách khả dụng và bấm nhận cùng một thời điểm dẫn đến xung đột race condition, cả hai đều ghi nhận thành công.
- **Nguyên nhân gốc rễ:**
  - Backend sử dụng `findUnique` rồi `update` mà không áp dụng khóa lạc quan (Optimistic Concurrency Control) hoặc kiểm tra điều kiện gán tài xế nguyên tử.
- **Giải pháp dứt khoát đã triển khai:**
  1. Trong `shipperClaimOrder`: Sử dụng `tx.sellerOrder.updateMany` với điều kiện lọc nguyên tử:
     ```typescript
     where: {
       id,
       OR: [{ deliveryStaffId: null }, { deliveryStaffId: actorId }],
     }
     ```
     Nếu `count === 0`, ném ngay `409 Conflict: Đơn hàng này đã được một bưu tá khác tiếp nhận!`.
  2. Trong `shipperPickupOrder`: Kiểm tra trạng thái hợp lệ (`CONFIRMED`, `PREPARING`) với OCC `updateMany`.
  3. Frontend `ShipperContext.tsx` bắt lỗi `409 Conflict` và cập nhật danh sách đơn ngay lập tức, hiển thị toast cảnh báo thân thiện cho shipper đến sau.

---

### [SH-004] Modal "Báo Giao Thất Bại / Hẹn Lại" Bắt Buộc Chọn Lý Do Hợp Lệ
- **Vị trí chính xác:**
  - Màn hình: Đơn đang giao (`/shipper/active-deliveries`)
  - File mã nguồn:
    - [web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx](file:///e:/HuKi/web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx)
    - [platform/apps/commerce-service/src/modules/orders/orders.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/orders.service.ts)
- **Nút bấm / Thao tác:**
  - Nút: `"Xác nhận thất bại"` trong modal báo hoãn/hủy giao hàng.
- **Hiện tượng lỗi ban đầu:**
  - Cho phép gửi form khi chuỗi lý do rỗng, làm thiếu dữ liệu phân loại trên hệ thống điều phối logistics và gãy thông báo cho người mua.
- **Nguyên nhân gốc rễ:**
  - Button không ràng buộc thuộc tính `disabled` với `failReason`; backend `shipperFailOrder` thiếu validation kiểm tra `dto?.reason`.
- **Giải pháp dứt khoát đã triển khai:**
  1. Frontend: Đặt `disabled={!failReason || !failReason.trim()}` cho nút bấm, hiển thị trạng thái `disabled:opacity-40 disabled:cursor-not-allowed`.
  2. Backend: Thêm validation kiểm tra `if (!dto?.reason?.trim()) throwBadRequest(ErrorCode.VALIDATION_REQUIRED, 'Bắt buộc phải chọn lý do giao hàng không thành công')`.

---

### [SH-005] Dữ Liệu Cuộn Lịch Sử Đối Soát Ví Bị Trùng Lặp ID Khi Sang Trang
- **Vị trí chính xác:**
  - Màn hình: Ví tài xế (`/shipper/wallet`)
  - File mã nguồn:
    - [web/src/ui/components/shipper/ShipperWalletView.tsx](file:///e:/HuKi/web/src/ui/components/shipper/ShipperWalletView.tsx)
    - [web/src/ui/context/ShipperContext.tsx](file:///e:/HuKi/web/src/ui/context/ShipperContext.tsx)
- **Nút bấm / Thao tác:**
  - Bảng danh sách lịch sử giao dịch và phân trang ví.
- **Hiện tượng lỗi ban đầu:**
  - Khi phân trang hoặc thêm giao dịch mới, xuất hiện cảnh báo React `Encountered two children with the same key` do trùng lặp mã giao dịch.
- **Nguyên nhân gốc rễ:**
  - Giao dịch mẫu và giao dịch tự sinh sử dụng chung tiền tố `TX-${Date.now()}` mà không deduplicate qua `Map`/`Set` trước khi phân trang.
- **Giải pháp dứt khoát đã triển khai:**
  1. Thêm bộ lọc `deduplicatedTransactions` bằng `useMemo` với `Map<string, WalletTransaction>` gom theo ID duy nhất.
  2. Đảm bảo toàn bộ key render trong bảng và bộ lọc phân trang `pagedTransactions` luôn có ID duy nhất 100%.

---

### [SH-006] Nút "Xác Nhận Bàn Giao Sách Hoàn Cho Shop" Yêu Cầu Mã OTP Đối Soát Hai Chiều
- **Vị trí chính xác:**
  - Màn hình: Quản lý hàng hoàn (`/shipper/returns`)
  - File mã nguồn:
    - [web/src/ui/components/shipper/ShipperReturnsView.tsx](file:///e:/HuKi/web/src/ui/components/shipper/ShipperReturnsView.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Bàn giao hàng cho Shop"` (icon `assignment_turned_in`).
- **Hiện tượng lỗi ban đầu:**
  - Shipper bấm 1 chạm là đơn hàng hoàn chuyển ngay sang trạng thái hoàn tất mà chủ shop không hề hay biết kiện hàng đã về kho hay chưa.
- **Nguyên nhân gốc rễ:**
  - Luồng bàn giao hàng hoàn thiếu khâu xác thực hai chiều (two-party handshake verification).
- **Giải pháp dứt khoát đã triển khai:**
  1. Xây dựng Modal bàn giao chuyên dụng `HandoverVerificationModal` hiển thị thông tin kiện sách hoàn và cước thu hồi.
  2. Bắt buộc nhập mã OTP 4-6 ký tự được đối soát với mã xác thực của đơn hoàn.
  3. Chỉ khi mã hợp lệ mới kích hoạt lệnh `completeDelivery` và giải ngân cước thu hồi cho shipper.
