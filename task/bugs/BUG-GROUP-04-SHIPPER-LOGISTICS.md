# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Nhân Viên Giao Hàng & Vận Chuyển (Shipper Portal & Logistics)

> **Mã phân hệ:** `BUG-GROUP-04`  
> **Đối tượng người dùng:** Tài xế giao nhận (Shipper), Đội ngũ điều phối kho vận (Logistics Dispatcher), Quản lý đối soát COD.  
> **Phạm vi kiểm thử:** Toàn bộ 10 màn hình cổng vận chuyển (`/shipper/*`), bao gồm tiếp nhận kiện hàng tại kho người bán, điều hướng lộ trình, xác thực giao hàng thành công (POD), nộp tiền thu hộ COD về sàn và đối soát ví tài xế.  
> **Nguyên tắc kỹ thuật:** Bám sát luồng chuyển trạng thái đơn hàng FSM (State Machine), xử lý tiền mặt COD an toàn, không giả lập dữ liệu, một giải pháp dứt khoát duy nhất.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (SHIPPER & LOGISTICS)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **SH-001** | Đơn đang giao (`/shipper/active-deliveries`) | Nút **"Xác Nhận Đã Giao Hàng"** (`done_all`) | Nghiệp Vụ / State | **P0 (Blocker)** | ❌ **FAIL** (Không kiểm tra upload ảnh bằng chứng POD) |
| **SH-002** | Nộp tiền COD (`/shipper/remit-cod`) | Nút **"Tạo Mã VietQR Nộp Tiền COD"** | Thanh Toán / API | **P0 (Blocker)** | ❌ **FAIL** (Mã VietQR cố định số tiền âm khi có hoàn đơn) |
| **SH-003** | Nhận đơn hàng mới (`/shipper/available-orders`) | Nút **"Tiếp Nhận Kiện Hàng (Pickup)"** | Đồng Thời / Lock | **P1 (Critical)** | ❌ **FAIL** (Lỗi tranh chấp đơn song song khi 2 shipper cùng bấm) |
| **SH-004** | Đơn đang giao (`/shipper/active-deliveries`) | Nút **"Báo Giao Thất Bại / Hẹn Lại"** | Modal / Form | **P1 (Critical)** | ❌ **FAIL** (Thiếu bắt buộc chọn lý do làm gãy webhook sàn) |
| **SH-005** | Ví tài xế (`/shipper/wallet`) | Nút **"Chi Tiết Lịch Sử Đối Soát"** | Dữ Liệu / Phân Trang | **P2 (Major)** | ❌ **FAIL** (Dữ liệu cuộn vô tận bị trùng lặp ID khi sang trang 2) |
| **SH-006** | Trả hàng về shop (`/shipper/returns`) | Nút **"Xác Nhận Bàn Giao Sách Hoàn Cho Shop"** | Xác Thực / Mã OTP | **P1 (Critical)** | ❌ **FAIL** (Thiếu mã OTP xác nhận giữa shipper và chủ shop) |

---

## CHI TIẾT KỸ THUẬT TỪNG LỖI CỤ THỂ

---

### [SH-001] Nút "Xác Nhận Đã Giao Hàng" Cho Phép Hoàn Tất Đơn Mà Không Cần Ảnh Bằng Chứng POD
- **Vị trí chính xác:**
  - Màn hình: Quản lý đơn hàng đang giao (`http://localhost:3100/shipper/active-deliveries`)
  - File mã nguồn: [web/src/app/shipper/active-deliveries/page.tsx](file:///e:/HuKi/web/src/app/shipper/active-deliveries/page.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Xác nhận giao hàng thành công"` (icon `check_circle`).
- **Hiện tượng lỗi:**
  - Shipper bấm nút xác nhận, hệ thống lập tức chuyển đơn sang `DELIVERED` và ghi nhận đã thu tiền COD mà không hề bắt buộc mở camera chụp ảnh chữ ký hoặc ảnh kiện hàng đã trao tận tay khách hàng (Proof of Delivery - POD).
  - Khi khách hàng khiếu nại chưa nhận được hàng, sàn hoàn toàn không có bằng chứng đối soát hình ảnh để bảo vệ quyền lợi người mua và người bán.
- **Nguyên nhân gốc rễ:**
  - Modal xác nhận giao hàng chỉ kiểm tra `orderId`, trường `evidenceImageUrl` được đặt là tùy chọn (`optional`), cho phép payload gửi lên API là `{ evidenceImageUrl: null }`.
- **Giải pháp dứt khoát duy nhất:**
  - Thiết lập thuộc tính `disabled` cho nút "Xác nhận đã giao" cho đến khi ảnh POD được upload thành công lên hệ thống lưu trữ và có URL hợp lệ.

---

### [SH-002] Nút "Tạo Mã VietQR Nộp Tiền COD" Bị Lỗi Số Tiền Âm Khi Có Đơn Đổi Trả
- **Vị trí chính xác:**
  - Màn hình: Đối soát & nộp tiền COD (`http://localhost:3100/shipper/remit-cod`)
  - File mã nguồn: [web/src/app/shipper/remit-cod/page.tsx](file:///e:/HuKi/web/src/app/shipper/remit-cod/page.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Tạo mã QR nộp tiền COD về tài khoản sàn"`.
- **Hiện tượng lỗi:**
  - Khi shipper trong ca làm việc vừa thu tiền COD của 1 đơn thành công (ví dụ +200.000đ), đồng thời chi tiền ứng trước hoàn trả cho 1 đơn khách trả hàng (ví dụ -300.000đ). Số dư COD hiển thị âm (-100.000đ).
  - Bấm tạo mã VietQR, PayOS trả về mã lỗi **HTTP 400 Bad Request: Amount must be greater than 0**. Giao diện vỡ, không tạo được mã thanh toán.
- **Nguyên nhân gốc rễ:**
  - Thiếu logic tách biệt giữa luồng Nộp tiền thu hộ (Cash Inflow) và luồng Quyết toán tiền ứng hoàn trả (Cash Outflow / Shipper Reimbursement).
- **Giải pháp dứt khoát duy nhất:**
  - Chỉ tính tổng các đơn giao thành công có thu COD dương (`amount > 0`) để tạo mã VietQR nộp tiền. Nếu sàn còn nợ tiền ứng của shipper, kích hoạt lệnh hoàn tiền tự động về ví shipper thay vì gộp chung vào một số dư âm.

---

### [SH-003] Lỗi Tranh Chấp Đơn Hàng Song Song Khi 2 Shipper Cùng Bấm "Tiếp Nhận Đơn"
- **Vị trí chính xác:**
  - Màn hình: Đơn hàng khả dụng chờ nhận (`http://localhost:3100/shipper/available-orders`)
  - File mã nguồn: `platform/apps/shipping-service/src/modules/shipments/shipments.service.ts`
- **Nút bấm / Thao tác:**
  - Nút: `"Nhận đơn này"` (`local_shipping`).
- **Hiện tượng lỗi:**
  - Khi 2 shipper cùng nhìn thấy một đơn hàng trên màn hình và cùng bấm nút nhận đơn gần như đồng thời: Cả 2 giao diện đều báo *"Nhận đơn thành công"*, cả 2 shipper cùng đến cùng một shop để lấy một kiện hàng duy nhất.
- **Nguyên nhân gốc rễ:**
  - Backend sử dụng câu lệnh `findUnique` rồi `update` mà không áp dụng khóa lạc quan (Optimistic Concurrency Control) hoặc `SELECT ... FOR UPDATE` trong transaction cơ sở dữ liệu.
- **Giải pháp dứt khoát duy nhất:**
  - Bọc thao tác nhận đơn vào Prisma Interactive Transaction với điều kiện `where: { id: orderId, shipperId: null, status: 'READY_FOR_PICKUP' }`. Nếu số bản ghi cập nhật bằng 0, ném ngay mã lỗi `409 Conflict: Đơn hàng đã được tài xế khác tiếp nhận` và hiển thị toast cảnh báo ngay trên giao diện shipper thứ hai.

