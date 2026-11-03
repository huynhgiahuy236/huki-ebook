# Task 01: Kiểm Thử Toàn Diện Luồng Liên Kết Đa Vai Trò (E2E Interconnected User Flows)

> **Mục tiêu:** Kiểm thử thực tế 100% trên Local (Database thật, Backend thật `:3000`, Frontend thật `:3100`), **tuyệt đối không mock data trên giao diện**. Luồng dữ liệu chạy liên thông xuyên suốt qua cả 4 vai trò: **Buyer $\rightarrow$ Seller $\rightarrow$ Shipper $\rightarrow$ Admin**.

---

## 1. Dữ liệu chuẩn bị thực tế (Local Environment)
- **File sách PDF thật:** `C:\Users\acer\Desktop\dac-nhan-tam.pdf` (Dung lượng: 2.58 MB) được dùng để upload khi Seller đăng bán ấn phẩm Digital / Ebook / Đọc thử.
- **Tài khoản kiểm thử đa vai trò (Real DB):**
  - **Admin:** `admin@huki.vn` (hoặc tài khoản admin local)
  - **Seller:** Gian hàng đối tác xuất bản / nhà sách
  - **Buyer (Khách mua):** Người dùng đọc sách & mua hàng
  - **Shipper:** Nhân viên giao hàng đối soát COD

---

## 2. Kịch bản kiểm thử liên hoàn 7 giai đoạn (7-Stage Journey)

### Giai đoạn 1: Quản trị & Cấu hình nền tảng (Admin)
- [ ] Đăng nhập quyền Admin (`/admin`).
- [ ] Kiểm tra danh mục sách, thể loại, phân cấp catalog.
- [ ] Cấu hình hạn mức duyệt sách, chính sách chiết khấu sàn, phí vận chuyển.
- [ ] Duyệt yêu cầu mở gian hàng của Seller mới (nếu có).

### Giai đoạn 2: Thiết lập gian hàng & Đăng bán sách thật (Seller)
- [ ] Seller đăng nhập vào Seller Portal (`/seller`).
- [ ] Tạo ấn phẩm mới:
  - Nhập tên sách: **Đắc Nhân Tâm**
  - Tác giả: Dale Carnegie
  - Thể loại: Tâm lý - Kỹ năng sống
  - Đính kèm file PDF thực tế từ `C:\Users\acer\Desktop\dac-nhan-tam.pdf`.
  - Cấu hình phiên bản: Sách giấy (Physical) + Bản điện tử DRM (Ebook).
  - Định giá bán, thiết lập tồn kho kho hàng.
- [ ] Gửi duyệt ấn phẩm lên hệ thống.
- [ ] Admin nhận thông báo, kiểm tra nội dung và **Duyệt phát hành sách** (`/admin/book-moderation`).

### Giai đoạn 3: Trải nghiệm người mua & Đặt hàng thực tế (Buyer)
- [ ] Buyer đăng nhập tài khoản đọc sách (`/auth/login`).
- [ ] Tìm kiếm sách "Đắc Nhân Tâm" trên thanh tìm kiếm và bộ lọc danh mục.
- [ ] Vào trang chi tiết sách (`/book/[id]`):
  - Kiểm tra thông tin tác giả, giá bán, số lượng tồn.
  - Đọc thử vài trang đầu của sách PDF qua bộ đọc `PdfCanvasViewer`.
- [ ] Thêm vào giỏ hàng (`/cart`) $\rightarrow$ Cập nhật số lượng.
- [ ] Tiến hành Checkout (`/checkout`):
  - Chọn địa chỉ giao hàng thật.
  - Áp dụng mã giảm giá / Voucher (nếu có).
  - Chọn phương thức thanh toán (COD hoặc Ví HUKI).
  - Tạo đơn hàng thành công $\rightarrow$ Ghi nhận mã `ORDER_...` vào PostgreSQL.

### Giai đoạn 4: Xử lý đơn hàng & Đóng gói (Seller)
- [ ] Seller nhận thông báo đơn hàng mới qua realtime sync.
- [ ] Vào danh sách đơn hàng (`/seller/orders`):
  - Kiểm tra thông tin đơn hàng, chi tiết sản phẩm.
  - Bấm **Xác nhận đơn** $\rightarrow$ Trạng thái chuyển `PROCESSING`.
  - Bấm **Chuẩn bị hàng / Sẵn sàng bàn giao** $\rightarrow$ Trạng thái `READY_FOR_PICKUP`.
  - In phiếu gửi hàng / mã vận đơn.

### Giai đoạn 5: Nhận đơn, Vận chuyển & Giao hàng COD (Shipper)
- [ ] Shipper đăng nhập cổng điều phối (`/shipper/login`).
- [ ] Nhận đơn hàng cần lấy tại kho Seller (`/shipper/available-orders`).
- [ ] Cập nhật trạng thái:
  - Bấm **Đã lấy hàng** $\rightarrow$ Trạng thái `PICKED_UP`.
  - Bấm **Đang giao hàng** $\rightarrow$ Trạng thái `IN_TRANSIT`.
  - Bấm **Giao thành công & Thu tiền COD** $\rightarrow$ Trạng thái `DELIVERED`.
- [ ] Shipper nộp tiền COD đối soát vào ví (`/shipper/remit-cod`).

### Giai đoạn 6: Đọc sách Ebook & Đánh giá Review (Buyer)
- [ ] Đơn hàng hoàn tất $\rightarrow$ Sách điện tử tự động mở khóa trong Tủ sách cá nhân (`/library`).
- [ ] Buyer mở sách trong Ebook Reader (`/reader`):
  - Kiểm tra mở file PDF `dac-nhan-tam.pdf` xem có bị đơ, vỡ canvas, lỗi tải trang không.
  - Đổi chế độ sáng/tối, zoom, nhảy trang, đánh dấu trang (bookmark).
- [ ] Buyer viết đánh giá 5 sao kèm nhận xét trên trang chi tiết sách.
- [ ] Kiểm tra đánh giá có hiển thị công khai ngay và cập nhật điểm trung bình không.

### Giai đoạn 7: Quyết toán tài chính, Ký quỹ & Rút tiền (Escrow & Finance)
- [ ] Tiền thanh toán của đơn hàng được chuyển từ Escrow (ký quỹ) sang Số dư khả dụng của Seller.
- [ ] Seller kiểm tra lịch sử biến động số dư ví (`/seller/finance`, `/seller/wallet`).
- [ ] Seller tạo lệnh rút tiền về tài khoản ngân hàng:
  - Nhập mã PIN bảo mật 6 số.
  - Xác nhận OTP 2FA.
- [ ] Admin duyệt lệnh chi tiền (`/admin/finance`, `/admin/escrow`).
- [ ] Kiểm tra tính toàn vẹn của sổ cái kế toán (Ledger).

---

## 3. Các chi tiết nhỏ & Edge Cases cần rà soát trong luồng
- [ ] Đặt hàng khi hết hàng trong kho (Out of stock handling).
- [ ] Hủy đơn hàng trước khi shipper lấy hàng $\rightarrow$ Hoàn kho tự động.
- [ ] Khách trả hàng / hoàn tiền (Return & Refund flow).
- [ ] Khi mạng chập chờn hoặc reload trang thanh toán không bị tạo 2 đơn trùng lặp (Idempotency).

