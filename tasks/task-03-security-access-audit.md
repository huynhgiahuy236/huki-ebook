# Task 03: Kiểm Thử Bảo Mật & Kiểm Soát Quyền Truy Cập (Security & Access Control Audit)

> **Mục tiêu:** Kiểm tra toàn diện các lỗ hổng bảo mật về phân quyền (RBAC), kiểm soát biên giới API Gateway, rò rỉ dữ liệu chéo (IDOR), bảo mật xác thực (JWT/Session) và bảo mật giao dịch tài chính trên Local.

---

## 1. Kiểm tra Biên giới Phân quyền (RBAC & Privilege Escalation)
- [ ] **Người dùng chưa đăng nhập (Unauthenticated):**
  - Thử gọi các endpoint nhạy cảm (`/api/v1/users/me`, `/api/v1/orders`, `/api/v1/seller/products`, `/api/v1/admin/users`) $\rightarrow$ Phải trả về `401 Unauthorized` ngay tại API Gateway.
- [ ] **Khách mua (Buyer / Normal User):**
  - Thử gọi trực tiếp vào các route của Seller (`/api/v1/seller/...`) $\rightarrow$ Phải bị chặn `403 Forbidden`.
  - Thử gọi vào các route Admin (`/api/v1/admin/...`, `/api/v1/businesses/moderate`) $\rightarrow$ Phải bị chặn `403 Forbidden`.
- [ ] **Người bán (Seller):**
  - Thử gọi vào các API duyệt hồ sơ doanh nghiệp hoặc duyệt sách của Admin $\rightarrow$ Phải bị chặn `403 Forbidden`.
- [ ] **Nhân viên giao hàng (Shipper):**
  - Thử can thiệp giá bán sách hoặc sửa thông tin user $\rightarrow$ Phải bị chặn `403 Forbidden`.

---

## 2. Kiểm tra Truy cập Trái phép Dữ liệu chéo (IDOR - Insecure Direct Object Reference)
- [ ] **Xâm nhập đơn hàng của người khác:**
  - Buyer A tạo đơn hàng `#ORDER_123`.
  - Buyer B đăng nhập và gửi request `GET /api/v1/orders/ORDER_123` $\rightarrow$ Phải trả về `403 Forbidden` hoặc `404 Not Found` (không được trả dữ liệu của Buyer A).
- [ ] **Xâm nhập sản phẩm / gian hàng của Seller khác:**
  - Seller A cố tình gửi request `PUT /api/v1/books/{BOOK_OF_SELLER_B}` $\rightarrow$ Phải bị từ chối sửa đổi.
- [ ] **Xâm nhập tủ sách Ebook (DRM Access):**
  - User chưa mua sách thử gọi trực tiếp link tải file PDF mã hóa hoặc endpoint đọc DRM $\rightarrow$ Phải bị từ chối cấp quyền truy cập.

---

## 3. Bảo mật Xác thực & Quản lý Phiên (Authentication & Token Lifecycle)
- [ ] **Kiểm tra JWT Expiration:** Token hết hạn có bị từ chối ngay lập tức không.
- [ ] **Kiểm tra Refresh Token Rotation:** Khi Refresh Token được dùng để cấp Access Token mới, Refresh Token cũ có bị vô hiệu hóa để chống tái sử dụng (Replay Attack) không.
- [ ] **Kiểm tra Logout Revocation:** Khi người dùng bấm Đăng xuất, token có được dọn dẹp khỏi cookie/storage và đưa vào blacklist Redis không.
- [ ] **Kiểm tra Cookie Security:** Các cookie nhạy cảm có gắn cờ `HttpOnly`, `SameSite`, `Path=/` hợp lý không.

---

## 4. Bảo mật Giao dịch Ví & Rút tiền (Wallet & Financial Security)
- [ ] **Bảo vệ mã PIN Ví:**
  - Nhập sai mã PIN liên tiếp 5 lần $\rightarrow$ Tài khoản ví phải bị tạm khóa trong thời gian quy định (Brute-force protection).
  - PIN gửi lên server có được băm (hash bằng bcrypt/argon2) trước khi lưu DB không (không được lưu plaintext).
- [ ] **Xác thực bước 2 (Step-Up 2FA):**
  - Lệnh rút tiền vượt ngưỡng hoặc rút tiền lần đầu bắt buộc phải có mã xác thực OTP gửi qua email/SMS.
- [ ] **Chống trùng lặp lệnh rút tiền (Idempotency / Race Condition):**
  - Thử gửi 2 request rút tiền cùng 1 mili-giây với số dư chỉ đủ cho 1 lần $\rightarrow$ Phải đảm bảo không bị trừ âm tiền (Database Transaction Lock / Isolation Level).

---

## 5. Quét Mã nguồn & Phụ thuộc (Vulnerability & Secrets Scan)
- [ ] Chạy `npm audit` kiểm tra các lỗ hổng đã biết trong các package bên thứ ba.
- [ ] Quét mã nguồn kiểm tra các chuỗi nhạy cảm hardcode (như Private Key, Secret, API Key chưa đưa vào biến môi trường).
- [ ] Kiểm tra cơ chế chống SQL Injection (Prisma ORM parameterization) và NoSQL Injection trong MongoDB.

