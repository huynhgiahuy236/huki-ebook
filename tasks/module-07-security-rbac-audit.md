# MOD-07: Kiểm Thử An Ninh Chuyên Sâu & Phân Quyền (Security & Access Control Audit)

> **Phạm vi:** Kiểm tra bảo mật toàn diện trên Local (`:3000` API Gateway và các microservices), đảm bảo các nguyên tắc an ninh phần mềm chuẩn OWASP Top 10 API Security 2023.  
> **Mục tiêu:** Kiểm thử thực tế các kịch bản tấn công vượt quyền, leo thang đặc quyền, rò rỉ dữ liệu nhạy cảm chéo và gian lận tài chính.  
> **Báo cáo lỗi chi tiết:** Xem tại [bug-mod07.md](file:///e:/HuKi/tasks/bug-mod07.md) (Gồm 8 lỗ hổng an ninh xác thực: 6 P0 Critical, 2 P1 High).

---

## 1. Kiểm Thử Phân Quyền & Vượt Quyền (RBAC & Privilege Escalation)
- [x] **Khách vãng lai (Unauthenticated Guest):**
  - Gửi request `GET /api/v1/users/profile` $\rightarrow$ Chặn `401 Unauthorized` (Đạt).
  - Gửi request `GET /api/v1/orders` $\rightarrow$ Chặn `401 Unauthorized` (Đạt).
  - Gửi request `POST /api/v1/books` $\rightarrow$ Chặn `401 Unauthorized` (Đạt).
  - Gửi request `GET /api/v1/users/admin/all` $\rightarrow$ Chặn `401 Unauthorized` (Đạt).
  - Gửi request `POST /api/v1/system/maintenance` $\rightarrow$ **LỖI P0: Trả về HTTP 201 Created cho phép guest can thiệp bảo trì** (Chi tiết: `BUG-MOD07-01`).
- [x] **Khách Mua Hàng (Buyer / Normal User):**
  - Gửi token Buyer gọi API Seller: `POST /api/v1/books` $\rightarrow$ Chặn `403 Forbidden` (Đạt).
  - Gửi token Buyer gọi API Admin: `GET /api/v1/admin/finance` $\rightarrow$ Chặn `403 Forbidden` (Đạt).
  - Gửi token Buyer gọi API Admin: `POST /api/v1/sanctions` $\rightarrow$ **LỖI P1: ValidationPipe chạy trước Guard trả về 400 thay vì 403** (Chi tiết: `BUG-MOD07-05`).
  - Gửi token Buyer gọi API Shipper: `GET /api/v1/orders/shipper/orders` $\rightarrow$ **LỖI P0: Trả về HTTP 200 OK rò rỉ toàn bộ PII đơn hàng** (Chi tiết: `BUG-MOD07-02`).
  - Gửi token Buyer gọi API Shipper: `POST /api/v1/orders/shipper/remit-cod` $\rightarrow$ **LỖI P0: Trả về HTTP 200 OK làm giả nộp COD** (Chi tiết: `BUG-MOD07-02`).
  - Gửi token Buyer gọi API Ví: `GET /api/v1/wallet/store/:id/security/status` $\rightarrow$ **LỖI P0: Trả về HTTP 200 OK lộ trạng thái PIN** (Chi tiết: `BUG-MOD07-06`).
- [x] **Người Bán (Seller):**
  - Gửi token Seller gọi API Admin duyệt sách $\rightarrow$ Chặn `403 Forbidden` (Đạt).
  - Gửi token Seller A gọi API Tiếp thị liên kết của Seller B $\rightarrow$ **LỖI P0: Trả về HTTP 200 OK ghi đè cài đặt gian hàng đối thủ** (Chi tiết: `BUG-MOD07-03`).
- [x] **Nhân Viên Giao Hàng (Shipper):**
  - Gửi token Shipper gọi API sửa sách hoặc sửa user $\rightarrow$ Chặn `403 Forbidden` (Đạt).

---

## 2. Kiểm Thử Xâm Nhập Dữ Liệu Chéo (IDOR - Insecure Direct Object Reference)
- [x] **Đánh Cắp Đơn Hàng:**
  - Buyer 1 tạo đơn hàng `ORDER_AAA`.
  - Buyer 2 dùng Access Token của mình gọi `GET /api/v1/orders/ORDER_AAA` $\rightarrow$ Chặn `404 Not Found` (Đạt - Bộ lọc user_id cô lập hoàn toàn).
- [x] **Can Thiệp Sản Phẩm Của Seller Khác:**
  - Seller 1 có sách ID `BOOK_111`.
  - Seller 2 gửi request `PATCH /api/v1/books/BOOK_111` sửa giá bán $\rightarrow$ Chặn `403 BOOK_UNAUTHORIZED` (Đạt - `BookWriteGuard` hoạt động tốt).
- [x] **Can Thiệp Cấu Hình Tiếp Thị Liên Kết Gian Hàng Khác:**
  - Seller 1 gửi request `PUT /api/v1/seller/stores/:seller2StoreId/affiliate/settings` $\rightarrow$ **LỖI P0: Trả về HTTP 200 OK ghi đè cấu hình gian hàng khác** (Chi tiết: `BUG-MOD07-03`).
- [x] **Đọc Lịch Sử Rút Tiền & Tài Khoản Ngân Hàng Gian Hàng Khác:**
  - Buyer/User lạ gửi request `GET /api/v1/payout/store/:victimStoreId/requests` $\rightarrow$ **LỖI P0: Trả về HTTP 200 OK rò rỉ dữ liệu ngân hàng** (Chi tiết: `BUG-MOD07-07`).
- [x] **Đọc Trộm Sách Ebook DRM:**
  - Tài khoản chưa mua sách thử gọi trực tiếp link tải file PDF mã hóa hoặc endpoint giải mã trang sách $\rightarrow$ Chặn `403 Forbidden` (Đạt).

---

## 3. Bảo Mật Xác Thực & Quản Lý Phiên (Token Lifecycle & Storage)
- [x] **JWT Token Expiration:** Khi token hết hạn (sau 15 phút), gọi API bị chặn `401 Unauthorized` (Đạt).
- [x] **Refresh Token Rotation (Chống Tái Sử Dụng):**
  - Khi refresh token được dùng để lấy cặp token mới, refresh token cũ bị đánh dấu `token_rotation` ngay lập tức (Đạt).
  - Tái sử dụng refresh token cũ $\rightarrow$ Hệ thống phát hiện tấn công replay (`reuse_detected`), lập tức hủy toàn bộ `authSession` (Đạt).
- [x] **Header Forgery & Spoofing Defense:**
  - Gửi request với các header giả lập `x-user-id`, `x-roles: PLATFORM_ADMIN` $\rightarrow$ Gateway tự động xóa sạch các header giả lập trước khi forward vào microservices (Đạt).
- [x] **Rate Limiting & Chống Brute-Force Đăng Nhập:**
  - Bắn 30 requests đăng nhập sai liên tiếp trong 1 giây $\rightarrow$ **LỖI P0: 100% request được chuyển tiếp tính toán bcrypt, không có mã 429 Too Many Requests** (Chi tiết: `BUG-MOD07-04`).

---

## 4. Bảo Mật Tài Chính & Giao Dịch Ví (Wallet, PIN & Anti-Fraud)
- [x] **Mã PIN Ví Bắt Buộc:** Mọi thao tác rút tiền hoặc giải ngân đều bắt buộc bước xác thực PIN 6 số (Đạt).
- [x] **Khóa Ví Tự Động (Brute-Force Protection):** Nhập sai mã PIN 5 lần liên tiếp $\rightarrow$ Tự động khóa ví trong 3 phút (Đạt).
- [x] **Lỗ Hổng DoS Khóa Ví Từ Xa:**
  - Kẻ tấn công bất kỳ có thể gọi endpoint kiểm tra PIN và ép ví gian hàng bị khóa tạm thời $\rightarrow$ **LỖI P0: Thiếu kiểm tra quyền sở hữu gian hàng** (Chi tiết: `BUG-MOD07-06`).
- [x] **Chống Rút Tiền Âm (Race Condition / Concurrency):**
  - Giao dịch rút tiền áp dụng `pg_advisory_xact_lock` kết hợp Database Transaction, đảm bảo tính nguyên tử (Atomic) chống gian lận số dư (Đạt).

---

## 5. Rà Soát Lộ Lọt Thông Tin & Quét Lỗ Hổng (Vulnerability & Secrets Audit)
- [x] Kiểm tra rò rỉ mật khẩu và hash trong API responses: Mật khẩu và chuỗi `$2b$` đều được lọc sạch (`sanitizeUser`), không bị phơi nhiễm trên `/users/profile` hay `/users/admin/all` (Đạt).
- [x] Kiểm tra phân loại route tại API Gateway: Thiếu bảo vệ cấp Gateway cho các endpoint quản trị thứ cấp $\rightarrow$ **LỖI P1** (Chi tiết: `BUG-MOD07-08`).
