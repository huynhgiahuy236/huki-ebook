# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 21
## RÚT TIỀN DOANH NGHIỆP VỚI MÃ PIN 6 SỐ & ĐỐI SOÁT CHUYỂN KHOẢN (MANUAL PAYOUT WITH 6-DIGIT PIN & ADMIN RECONCILIATION)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện phân hệ rút tiền doanh thu (Seller Payout / Withdrawal System) với lớp bảo mật 2FA bắt buộc bằng **Mã PIN bảo mật 6 số**, cơ chế chống dò mã Brute-force qua Redis (khóa 24h khi sai 5 lần), khấu trừ tức thì số dư khả dụng (`available_balance`), và giao diện Quản trị viên Sàn (Admin) đối soát tài khoản ngân hàng chính chủ KYC, nhập mã giao dịch chuyển khoản ngân hàng và tải lên biên lai ủy nhiệm chi.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `commerce-service` / `payout-service`: Module `PayoutsModule`, `PayoutsService`, `PinSecurityService`, `AdminPayoutsController`.
    * `escrow-service` / `ledger-service`: Thực thi hàm tạm khấu trừ `holdBalanceForWithdrawal()` và hoàn trả `refundHoldBalance()`.
    * Prisma Schema: Bảng `payout_requests`.
  * **Frontend (Seller Portal & Admin Portal)**:
    * `web/src/ui/components/finance/WithdrawModal.jsx`: Modal nhập số tiền và 6 ô nhập mã PIN bảo mật ẩn mật khẩu.
    * `web/src/ui/pages/admin/AdminPayoutsPage.jsx`: Dashboard Admin đối soát danh sách lệnh rút tiền, nhập mã FT và upload ảnh biên lai.
    * `web/src/ui/pages/seller/SellerFinancePage.jsx`: Hiển thị lịch sử các lệnh rút tiền kèm trạng thái và biên lai đính kèm.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 21
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  PIN SECURITY &         BACKEND APIS &         FRONTEND UI &    TESTING SUITE &
PAYOUT MODEL     RATE LIMITER 24H       WALLET HOLD ENGINE     ADMIN RECONCILE  SECURITY AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA LỆNH RÚT TIỀN

### 📌 Mục tiêu:
Thiết lập bảng lưu trữ các yêu cầu rút tiền `payout_requests` trên PostgreSQL bằng Prisma ORM.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `payout_requests`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `payout_code`: String, Unique, Index (VD: `WD-2026-8899`).
    * `business_id`: UUID, FK `businesses`, Index.
    * `wallet_id`: UUID, FK `seller_wallets`.
    * `amount`: Decimal (Check $\ge 100.000\text{đ}$).
    * `bank_name`: String.
    * `bank_account_number`: String.
    * `bank_account_holder`: String.
    * `status`: Enum (`PENDING_APPROVAL`, `PROCESSING`, `COMPLETED`, `REJECTED`).
    * `bank_reference_code`: String (Nullable - Mã FT giao dịch ngân hàng).
    * `receipt_image_url`: String (Nullable - Ảnh chụp biên lai).
    * `admin_note`: String (Nullable).
    * `processed_by`: UUID (Nullable, FK `users`).
    * `created_at`: DateTime.
    * `processed_at`: DateTime (Nullable).

---

## PHẦN 2: ENGINE XÁC THỰC MÃ PIN 6 SỐ & BẢO VỆ CHỐNG BRUTE-FORCE

### 📌 Mục tiêu:
Xây dựng module xác thực mã PIN bảo mật đã mã hóa bằng `bcrypt` và bộ đếm giới hạn số lần thử trên Redis.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai `PinSecurityService`**
  * Hàm `verifySecurityPin(businessId, plainPin)`:
    * Lấy `security_pin` mã hóa từ bảng `businesses`.
    * Kiểm tra bộ đếm trên Redis `pin_fail_count:biz:{id}`: Nếu $\ge 5$ &rarr; Ném lỗi `ERR_PIN_LOCKED_24H` ("Tính năng rút tiền đã bị tạm khóa 24 giờ").
    * So khớp bằng `bcrypt.compare(plainPin, hashedPin)`:
      * Nếu đúng &rarr; Xóa bộ đếm thất bại trên Redis và trả về `true`.
      * Nếu sai &rarr; Tăng bộ đếm `INCR pin_fail_count:...` (TTL 24h) và ném lỗi `ERR_INVALID_PIN` kèm số lần thử còn lại.

---

## PHẦN 3: PHÁT TRIỂN BACKEND APIS RÚT TIỀN & XỬ LÝ KHẤU TRỪ VÍ

### 📌 Mục tiêu:
Xây dựng các RESTful endpoints tạo lệnh rút tiền, trừ số dư khả dụng tức thì và xử lý duyệt/từ chối của Admin.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: API Tạo Yêu Cầu Rút Tiền (Seller)**
  * **Endpoint**: `POST /api/v1/seller/payouts`
  * **Body**: `{ amount: 5000000, securityPin: "123456" }`
  * **Xử lý**:
    * Xác thực mã PIN qua `PinSecurityService`.
    * Mở Transaction: Kiểm tra `available_balance >= amount` &rarr; Trừ `available_balance -= amount` &rarr; Tạo bản ghi `payout_requests` (`status: PENDING_APPROVAL`) &rarr; Ghi log `WITHDRAW_REQUEST` vào sổ cái `wallet_transactions`.

* **Task 3.2: API Xác Nhận Chuyển Tiền Thành Công (Admin)**
  * **Endpoint**: `PATCH /api/v1/admin/payouts/:id/complete`
  * **Body**: `{ bankReferenceCode: "FT998811", receiptImageUrl: "https://..." }`
  * **Xử lý**: Cập nhật `status = 'COMPLETED'`, `processed_at = NOW()`, tăng `seller_wallets.total_withdrawn += amount`.

* **Task 3.3: API Từ Chối Lệnh Rút Tiền (Admin)**
  * **Endpoint**: `PATCH /api/v1/admin/payouts/:id/reject`
  * **Body**: `{ rejectReason: "Thông tin số tài khoản không hợp lệ" }`
  * **Xử lý**: Cập nhật `status = 'REJECTED'`, tự động hoàn trả `available_balance += amount` vào ví của Seller.

---

## PHẦN 4: GIAO DIỆN RÚT TIỀN SELLER & DASHBOARD ĐỐI SOÁT ADMIN

### 📌 Mục tiêu:
Xây dựng giao diện nhập mã PIN 6 số tiện dụng cho Seller và trang quản trị đối soát chuyển khoản ngân hàng cho Admin.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Component Modal Rút Tiền ([`WithdrawModal.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/finance/WithdrawModal.jsx))**
  * Hiển thị thông tin tài khoản ngân hàng cố định đã duyệt KYC (Tên ngân hàng, Số TK, Chủ TK).
  * Ô nhập số tiền cần rút kèm số dư khả dụng hiện có.
  * **Component 6 Ô Nhập Mã PIN**:
    * Tự động nhảy con trỏ sang ô tiếp theo khi nhập số.
    * Ẩn ký tự dạng chấm tròn bảo mật $(\bullet)$.
    * Nút bấm: **"Xác Nhận Rút Tiền"**.

* **Task 4.2: Xây dựng Dashboard Đối Soát Admin ([`AdminPayoutsPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/admin/AdminPayoutsPage.jsx))**
  * Bảng danh sách các lệnh rút tiền: Mã lệnh, Tên Shop, Số tiền, Thông tin Ngân hàng nhận, Thời gian yêu cầu.
  * Nút thao tác:
    * 🟢 **"Xác Nhận Đã Chuyển Khoản"**: Mở Modal nhập Mã giao dịch ngân hàng (Mã FT) và Tải lên ảnh Biên lai chuyển tiền.
    * 🔴 **"Từ Chối"**: Mở Modal nhập lý do từ chối.

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ AN TOÀN BẢO MẬT (TEST SUITE)

### 📌 Mục tiêu:
Xác thực tính toàn vẹn dữ liệu tài chính và độ an toàn chống tấn công của mã PIN 6 số.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit & Integration Test Rút Tiền & Mã PIN**
  * Test Case nhập đúng PIN &rarr; Trừ số dư khả dụng, tạo lệnh thành công.
  * Test Case nhập sai PIN &rarr; Báo lỗi, bộ đếm thất bại tăng.
  * Test Case nhập sai PIN 5 lần &rarr; Khóa 24h, từ chối mọi request tiếp theo.
  * Test Case Admin duyệt hoàn tất &rarr; Ghi nhận `COMPLETED` và tăng `total_withdrawn`.
  * Test Case Admin từ chối &rarr; Số dư được hoàn trả chính xác $100\%$.

* **Task 5.2: Kiểm thử Chống Race Condition Khi Rút Tiền Đồng Thời**
  * Cho 2 request rút tiền cùng lúc khi số dư chỉ đủ cho 1 lệnh &rarr; Xác nhận chỉ duy nhất 1 lệnh thành công, không bao giờ bị âm ví.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `payout_requests` | ⏳ Sẵn sàng | Backend Team |
| **PIN Security** | Xác thực bcrypt PIN 6 số & Redis Rate Limiter khóa 24h khi sai 5 lần | ⏳ Sẵn sàng | Backend Team |
| **Backend APIs** | APIs Tạo lệnh rút, Khấu trừ ví, Admin Complete/Reject | ⏳ Sẵn sàng | Backend Team |
| **Admin Panel** | Dashboard `AdminPayoutsPage.jsx` đối soát & upload ảnh biên lai | ⏳ Sẵn sàng | Frontend Team |
| **Seller UI** | Modal `WithdrawModal.jsx` với 6 ô nhập PIN bảo mật | ⏳ Sẵn sàng | Frontend Team |
| **Security Audit**| Vượt qua 100% Ma trận kiểm thử an toàn rút tiền (TC_PAY_01 đến 06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 21 thuộc Nền tảng Sách Huki Ebook.*
