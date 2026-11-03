# MOD-07: Kiểm Thử An Ninh Chuyên Sâu & Phân Quyền (Security & Access Control Audit)

> **Phạm vi:** Kiểm tra bảo mật toàn diện trên Local (`:3000` API Gateway và các microservices), đảm bảo các nguyên tắc an ninh phần mềm chuẩn OWASP Top 10.  
> **Mục tiêu:** Kiểm thử thực tế các kịch bản tấn công vượt quyền, leo thang đặc quyền, rò rỉ dữ liệu nhạy cảm chéo và gian lận tài chính.

---

## 1. Kiểm Thử Phân Quyền & Vượt Quyền (RBAC & Privilege Escalation)
- [ ] **Khách vãng lai (Unauthenticated Guest):**
  - Gửi request `GET /api/v1/users/me` $\rightarrow$ Chặn `401 Unauthorized`.
  - Gửi request `GET /api/v1/orders` $\rightarrow$ Chặn `401 Unauthorized`.
  - Gửi request `POST /api/v1/books` $\rightarrow$ Chặn `401 Unauthorized`.
  - Gửi request `GET /api/v1/admin/users` $\rightarrow$ Chặn `401 Unauthorized`.
- [ ] **Khách Mua Hàng (Buyer / Normal User):**
  - Gửi token Buyer gọi API Seller: `POST /api/v1/books`, `GET /api/v1/seller/orders` $\rightarrow$ Bắt buộc trả về `403 Forbidden`.
  - Gửi token Buyer gọi API Admin: `GET /api/v1/admin/finance`, `POST /api/v1/businesses/moderate` $\rightarrow$ Bắt buộc trả về `403 Forbidden`.
- [ ] **Người Bán (Seller):**
  - Gửi token Seller gọi API Admin duyệt sách hoặc can thiệp cài đặt sàn $\rightarrow$ Bắt buộc trả về `403 Forbidden`.
- [ ] **Nhân Viên Giao Hàng (Shipper):**
  - Chỉ được thao tác trên các đơn hàng được gán cho chính Shipper đó. Thử gọi API sửa giá bán sách hoặc sửa thông tin user $\rightarrow$ Chặn `403 Forbidden`.

---

## 2. Kiểm Thử Xâm Nhập Dữ Liệu Chéo (IDOR - Insecure Direct Object Reference)
- [ ] **Đánh Cắp Đơn Hàng:**
  - Buyer 1 tạo đơn hàng `ORDER_AAA`.
  - Buyer 2 dùng Access Token của mình gọi `GET /api/v1/orders/ORDER_AAA` $\rightarrow$ Bắt buộc trả về `403 Forbidden` hoặc `404 Not Found`.
- [ ] **Can Thiệp Sản Phẩm Của Seller Khác:**
  - Seller 1 có sách ID `BOOK_111`.
  - Seller 2 gửi request `PUT /api/v1/books/BOOK_111` sửa giá bán về 0đ $\rightarrow$ Bắt buộc chặn quyền sửa sản phẩm của gian hàng khác.
- [ ] **Đọc Trộm Sách Ebook DRM:**
  - Tài khoản chưa mua sách thử gọi trực tiếp link tải file PDF mã hóa hoặc endpoint giải mã trang sách $\rightarrow$ Chặn `403 Forbidden`.

---

## 3. Bảo Mật Xác Thực & Quản Lý Phiên (Token Lifecycle & Storage)
- [ ] **JWT Token Expiration:** Khi token hết hạn (sau 15 phút), gọi API phải bị chặn `401` và kích hoạt luồng silent refresh token.
- [ ] **Refresh Token Rotation (Chống Tái Sử Dụng):**
  - Khi refresh token được dùng để lấy cặp token mới, refresh token cũ bị vô hiệu hóa ngay lập tức.
  - Thử dùng lại refresh token cũ $\rightarrow$ Hệ thống phát hiện nghi vấn tấn công và thu hồi toàn bộ phiên đăng nhập của tài khoản đó.
- [ ] **Đăng Xuất Triệt Để:** Bấm đăng xuất $\rightarrow$ Xóa token khỏi Storage, hủy cookie HttpOnly, đưa token vào Blacklist Redis.
- [ ] **Cấu Hình Cookie An Toàn:** Cờ `HttpOnly: true`, `SameSite: Lax/None`, `Secure: true` (trên HTTPS).

---

## 4. Bảo Mật Tài Chính & Giao Dịch Ví (Wallet, PIN & Anti-Fraud)
- [ ] **Mã PIN Ví Bắt Buộc:** Mọi thao tác rút tiền hoặc thanh toán bằng ví đều bắt buộc nhập mã PIN 6 số.
- [ ] **Khóa Ví Tự Động (Brute-Force Protection):** Nhập sai mã PIN 5 lần liên tiếp $\rightarrow$ Tự động khóa ví trong 24 giờ.
- [ ] **Xác Thực 2FA Bước 2:** Lệnh rút tiền gửi mã OTP xác nhận về email.
- [ ] **Chống Rút Tiền Âm (Race Condition / Idempotency):**
  - Giả lập gửi 2 request rút tiền cùng 1 mili-giây với số dư chỉ đủ cho 1 lần $\rightarrow$ Đảm bảo Transaction Lock trong DB không bao giờ để số dư bị âm.

---

## 5. Rà Soát Lộ Lọt Thông Tin & Quét Lỗ Hổng (Vulnerability & Secrets Audit)
- [ ] Kiểm tra các file `.env`, scripts xem còn sót mật khẩu thật hoặc IP máy chủ nào không.
- [ ] Chạy `npm audit` kiểm tra danh sách CVE của các thư viện npm.
- [ ] Kiểm tra khả năng chống SQL Injection (Prisma ORM parameterized queries) và NoSQL Injection trong MongoDB.

