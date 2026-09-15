# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 1
## ĐĂNG KÝ & THẨM ĐỊNH HỒ SƠ DOANH NGHIỆP (SELLER ONBOARDING & KYC 33 TRƯỜNG)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng hoàn chỉnh, khép kín và an toàn quy trình tiếp nhận hồ sơ đăng ký doanh nghiệp (33 trường chuẩn hóa), thẩm định pháp lý phía Admin và tự động phân quyền, khởi tạo gian hàng, khởi tạo ví đối soát sau khi phê duyệt.
* **Kiến trúc công nghệ liên quan**:
  * **Frontend**: React 19 / Next.js (TailwindCSS, Form State, Client-side Validation).
  * **Backend Microservices**:
    * `identity-service`: Quản lý tài khoản, JWT token, cập nhật quyền (`role: BUSINESS / SELLER`).
    * `business-service`: Quản trị thực thể `Business`, `Store`, `BusinessWallet`, mã hóa mã PIN 6 số, tiếp nhận hồ sơ KYC.
    * `commerce-service`: Đồng bộ phạm vi gian hàng (`seller-scope.util.ts`).
  * **Database**: PostgreSQL kết hợp Prisma ORM.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 1
                                           │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
DATABASE & DTO   BACKEND APIS         FRONTEND SELLER       FRONTEND ADMIN   ROUTE GUARDS & E2E
(Schema, Model)  (Register, Review)   (Wizard 4 Bước)       (Thẩm Định 33)   (Kiểm Thử & Pass)
```

---

## PHẦN 1: THIẾT KẾ & CỦNG CỐ CẤU TRÚC CƠ SỞ DỮ LIỆU (DATABASE & DTOS)

### 📌 Mục tiêu:
Đảm bảo Schema cơ sở dữ liệu lưu trữ đầy đủ 33 trường thông tin, các chỉ mục (indexes) và ràng buộc khóa ngoại (Foreign Keys) chính xác giữa `User`, `Business`, `Store`, `BusinessWallet`.

### 🔨 Các đầu việc cụ thể:
* **Task 1.1: Rà soát & Cập nhật Prisma Schema cho `Business`**
  * Đảm bảo bảng `businesses` chứa đầy đủ các cột tương ứng 33 trường:
    * Pháp lý: `tax_code` (Unique), `name`, `international_name`, `short_name`, `business_license_number`, `issue_date`, `issue_place`, `business_type`, `address`, `email`, `phone`, `website`, `doc_business_license`, `doc_publishing_permit`.
    * Đại diện: `rep_full_name`, `rep_position`, `rep_id_card_number`, `rep_id_card_issue_date`, `rep_id_card_issue_place`, `rep_phone`, `rep_email`, `rep_permanent_address`, `doc_cccd_front`, `doc_cccd_back`.
    * Tài chính: `bank_name`, `bank_branch`, `bank_account_number`, `bank_account_holder_name`.
    * Bảo mật & Cửa hàng: `withdrawal_pin` (Hashed), `status` (Enum: `PENDING_APPROVAL`, `APPROVED`, `REJECTED`, `SUSPENDED`), `rejection_reason`.
* **Task 1.2: Xây dựng DTO Validation (Data Transfer Object)**
  * Tạo `RegisterBusinessDto` sử dụng `class-validator` tại `business-service`:
    * Kiểm tra `@IsNotEmpty()`, `@Length(10, 13)` cho `tax_code`.
    * Kiểm tra `@IsEmail()` cho `email` và `rep_email`.
    * Kiểm tra `@IsPhoneNumber('VN')` cho `phone` và `rep_phone`.
    * Kiểm tra `@Length(6, 6)` cho `withdrawal_pin`.
    * Kiểm tra `@IsEnum(BusinessType)` cho `business_type`.
* **Task 1.3: Cấu hình Xử lý Lưu trữ Tệp Tài liệu (File Storage)**
  * Lưu trữ đường dẫn ảnh scan tài liệu (Giấy phép ĐKKD, Giấy phép xuất bản, CCCD 2 mặt, Logo) an toàn với giới hạn kích thước $\le 5\text{MB}$/tệp.

---

## PHẦN 2: XÂY DỰNG & TỐI ƯU CÁC API BACKEND (BUSINESS & ADMIN APIS)

### 📌 Mục tiêu:
Xây dựng chuỗi API giao tiếp chuẩn RESTful, xử lý Database Transaction an toàn, không để xảy ra tình trạng rò rỉ dữ liệu hoặc cập nhật thiếu bảng.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: API Đăng ký Hồ sơ Doanh nghiệp**
  * **Endpoint**: `POST /api/v1/business/register`
  * **Header**: `Authorization: Bearer <user_token>`
  * **Xử lý Logic**:
    1. Kiểm tra tài khoản người dùng đã sở hữu Business nào chưa.
    2. Kiểm tra `tax_code`, `email`, `phone` đã tồn tại trong DB chưa.
    3. Kiểm tra tính hợp lệ: Tên chủ tài khoản ngân hàng phải khớp tên pháp nhân doanh nghiệp.
    4. Băm mã PIN rút tiền 6 số bằng `bcrypt.hash(pin, 10)`.
    5. Tạo bản ghi `Business` với trạng thái mặc định `PENDING_APPROVAL`.
    6. Trả về `201 Created` kèm `businessId`.

* **Task 2.2: API Lấy Danh sách Hồ sơ Thẩm định Phía Admin**
  * **Endpoint**: `GET /api/v1/admin/businesses`
  * **Query Params**: `status=PENDING_APPROVAL&page=1&limit=20&search=`
  * **Xử lý Logic**:
    1. Lọc theo trạng thái hồ sơ.
    2. Hỗ trợ tìm kiếm nhanh theo Tên công ty, MST hoặc SĐT đại diện.
    3. Trả về mảng danh sách kèm phân trang và tổng số lượng chờ duyệt.

* **Task 2.3: API Phê Duyệt Hồ sơ Doanh nghiệp (Approve Transaction)**
  * **Endpoint**: `POST /api/v1/admin/businesses/:id/approve`
  * **Xử lý Logic (Chạy trong Prisma `$transaction`)**:
    1. Cập nhật `Business.status = 'APPROVED'`, gán `approvedAt = now()`.
    2. Tạo bản ghi `Store` mặc định với tên gian hàng `store_name`, mô tả và địa chỉ kho lấy hàng `warehouse_address`.
    3. Tạo bản ghi `BusinessWallet` với `available_balance = 0`, `pending_balance = 0`.
    4. Gửi yêu cầu cập nhật quyền sang `identity-service` nâng cấp `User.role = 'BUSINESS'` (hoặc `SELLER`).
    5. Ghi log kiểm toán (Audit Log) lưu ID của Admin vừa thao tác duyệt.

* **Task 2.4: API Từ chối Hồ sơ Doanh nghiệp (Reject)**
  * **Endpoint**: `POST /api/v1/admin/businesses/:id/reject`
  * **Body**: `{ "reason": "Lý do cụ thể..." }`
  * **Xử lý Logic**:
    1. Kiểm tra trường `reason` bắt buộc không được để trống.
    2. Cập nhật `Business.status = 'REJECTED'` và `Business.rejection_reason = reason`.
    3. Gửi thông báo đến tài khoản Seller.

---

## PHẦN 3: XÂY DỰNG GIAO DIỆN ĐĂNG KÝ PHÍA SELLER (`SellerRegisterPage.jsx`)

### 📌 Mục tiêu:
Tạo trải nghiệm người dùng (UX) trực quan, chia nhỏ form 33 trường thành 4 bước (Step Wizard), kiểm tra lỗi tại chỗ (Real-time Validation) để người dùng không bị quá tải.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Xây dựng Thanh Tiến Trình Wizard (Progress Stepper)**
  * Bước 1: *Thông Tin Pháp Lý* (25%) &rarr; Bước 2: *Đại Diện Pháp Luật* (50%) &rarr; Bước 3: *Ngân Hàng & Đối Soát* (75%) &rarr; Bước 4: *Gian Hàng & Mã PIN* (100%).
  * Nút chuyển bước *"Tiếp tục"* và *"Quay lại"*, tự động lưu trữ tạm (Draft State) để không bị mất dữ liệu khi chuyển bước.

* **Task 3.2: Xây dựng & Validate Form Từng Bước**
  * **Bước 1 Form**: Input MST (tự động gợi ý kiểm tra), Tên pháp nhân, Loại hình, Tải 2 file scan (có khung preview ảnh và nút xóa ảnh chọn lại).
  * **Bước 2 Form**: Input CCCD 12 số, Họ tên đại diện, Tải 2 ảnh CCCD mặt trước & mặt sau.
  * **Bước 3 Form**: Chọn Ngân hàng từ Select box chuẩn Napas, Số TK, Tên chủ TK (tự động so sánh chuỗi với Tên pháp nhân bước 1, báo cảnh báo đỏ nếu không trùng).
  * **Bước 4 Form**: Tên gian hàng, Mô tả, Tải Logo, Địa chỉ kho hàng, Ô nhập **Mã PIN 6 số** (ẩn ký tự kiểu `password` hoặc ô 6 ô vuông OTP).

* **Task 3.3: Màn Hình Trạng Thái Sau Khi Gửi Hồ Sơ**
  * Khi gửi thành công: Hiển thị màn hình thông báo trang trọng kèm huy hiệu `ĐANG CHỜ THẨM ĐỊNH`.
  * Có nút *"Xem lại thông tin đã nộp"* và nút *"Về trang chủ"*.
  * Nếu vào lại `/seller/register` hoặc `/seller/business` trong lúc chờ &rarr; Luôn hiển thị màn hình thông báo chờ duyệt 24h.

---

## PHẦN 4: XÂY DỰNG GIAO DIỆN THẨM ĐỊNH PHÍA ADMIN (`AdminBusinessesPage.jsx`)

### 📌 Mục tiêu:
Cung cấp cho Ban Quản Trị công cụ thẩm định chuyên nghiệp, dễ dàng đối chiếu thông tin và các bản scan giấy tờ pháp lý trước khi bấm duyệt.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Bảng Danh Sách Hồ Sơ Đối Tác**
  * Bảng danh sách phân tab rõ ràng: `Tất Cả`, `Chờ Xét Duyệt (PENDING)`, `Đã Phê Duyệt (APPROVED)`, `Đã Từ Chối (REJECTED)`.
  * Hiển thị tóm tắt: Thời gian nộp, Tên công ty, MST, Người đại diện, Trạng thái.

* **Task 4.2: Xây dựng Modal Thẩm Định Chi Tiết 33 Trường Dữ Liệu**
  * Bố cục 4 card thông tin tương ứng 4 nhóm.
  * Tích hợp **Trình xem & Phóng to ảnh (Image Lightbox Viewer)**:
    * Admin bấm vào ảnh Giấy phép ĐKKD, Giấy phép xuất bản, CCCD 2 mặt để phóng to đối chiếu số và chữ ký.

* **Task 4.3: Hộp Thoại Thao Tác Phê Duyệt / Từ Chối**
  * **Nút "Phê Duyệt"**: Hiển thị popup xác nhận: *"Xác nhận cấp phép hoạt động cho doanh nghiệp [Tên Cty]?"*.
  * **Nút "Từ Chối"**: Hiển thị popup bắt buộc nhập lý do từ chối (Textarea có validation không cho để trống), nút *"Xác nhận từ chối"*.

---

## PHẦN 5: BẢO VỆ ĐƯỜNG DẪN & TIẾP QUẢN KÊNH NGƯỜI BÁN (ROUTE GUARDS)

### 📌 Mục tiêu:
Đảm bảo an ninh hệ thống: Tài khoản chưa được duyệt tuyệt đối không được truy cập các tính năng bán hàng; tài khoản đã duyệt được tự động điều hướng mượt mà.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Thiết lập Route Guard Phía Frontend (`RouteGuards.jsx`)**
  * Tạo `SellerRouteGuard`:
    * Nếu `user.role !== 'BUSINESS'` hoặc `business.status !== 'APPROVED'`: Chặn truy cập `/seller/dashboard`, `/seller/products`, `/seller/orders`, `/seller/finance` &rarr; Chuyển hướng về `/seller/register` kèm thông báo phù hợp.
* **Task 5.2: Tự Động Chuyển Hướng Sau Khi Đăng Nhập**
  * Khi người dùng đã có Business `APPROVED` đăng nhập &rarr; Tự động kích hoạt toàn bộ menu Kênh Người Bán và cho phép vào thẳng Dashboard.
* **Task 5.3: Xử Lý Trường Hợp Bị Từ Chối (`REJECTED`)**
  * Cho phép người dùng truy cập lại màn hình chỉnh sửa để cập nhật lại thông tin/ảnh bị từ chối và nộp lại yêu cầu mới.

---

## III. BẢNG TIẾN ĐỘ THỰC HIỆN & PHÂN CÔNG (TIMELINE & MILESTONES)

| Giai Đoạn | Đầu Việc Chính | Output Cần Đạt | Thời Gian Ước Tính |
|---|---|---|:---:|
| **Giai đoạn 1** | Schema DB & Validation DTO | Prisma Migration & DTO 33 trường chuẩn | 0.5 ngày |
| **Giai đoạn 2** | Backend APIs (Register, Review, Transaction) | 4 Endpoint API hoạt động mượt mà | 1.0 ngày |
| **Giai đoạn 3** | Frontend Wizard Đăng ký (`SellerRegisterPage.jsx`) | Form 4 bước, validation tại chỗ, mã PIN 6 số | 1.0 ngày |
| **Giai đoạn 4** | Frontend Thẩm định Admin (`AdminBusinessesPage.jsx`) | Bảng duyệt, Modal 33 trường, Lightbox xem ảnh | 1.0 ngày |
| **Giai đoạn 5** | Route Guards & Tích hợp E2E | Phân quyền chuẩn, duyệt & tiếp quản Seller Portal | 0.5 ngày |
| **Tổng cộng** | **Toàn bộ Luồng 1 Hoàn Chỉnh** | **Nghiệm thu 6 Test Cases Pass 100%** | **4.0 ngày làm việc** |

---

## IV. TIÊU CHÍ NGHIỆM THU CUỐI CÙNG (DEFINITION OF DONE)

1. ✅ Người dùng mới có thể đăng ký tài khoản và điền trọn vẹn 33 trường thông tin pháp lý.
2. ✅ Không thể submit form nếu thiếu các trường bắt buộc hoặc ảnh scan không hợp lệ.
3. ✅ Hồ sơ gửi đi được lưu trữ an toàn trong DB với mã PIN được băm bảo mật.
4. ✅ Admin xem được toàn bộ 33 trường và phóng to 4 ảnh giấy tờ để đối chiếu.
5. ✅ Thao tác Phê duyệt tạo tự động `Store`, `BusinessWallet` và cấp quyền `BUSINESS`.
6. ✅ Thao tác Từ chối lưu lý do chính xác và hiển thị rõ ràng cho Seller nộp lại.
7. ✅ Chặn 100% quyền truy cập Seller Dashboard đối với tài khoản chưa được duyệt.
