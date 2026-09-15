# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 18
## KHIẾU NẠI, TRẢ HÀNG & TRỌNG TÀI PHÂN XỬ CỦA ADMIN (RETURN/REFUND DISPUTES & ADMIN ARBITRATION)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện phân hệ quản lý khiếu nại, trả hàng và phân xử tranh chấp (Return / Refund Dispute System). Tự động đóng băng dòng tiền ví Escrow khi phát sinh tranh chấp, cung cấp phòng đối chất trực tuyến 2 chiều có giới hạn thời gian 48 giờ, phát triển giao diện thẩm định bằng chứng dành cho Quản trị viên Sàn (Admin Arbitration Dashboard), kích hoạt luồng hoàn tiền tự động và thu hồi giấy phép bản quyền số (`user_ebook_licenses.status = 'REVOKED'`).
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `commerce-service` / `dispute-service`: Module `DisputesModule`, `DisputesService`, `DisputeChatService`.
    * `escrow-service`: Xử lý khóa tạm thời (`freezeFunds`) và giải phóng/hoàn trả (`unfreezeFunds` / `refundFunds`).
    * `drm-service`: Hàm `revokeLicense(userId, bookId)` ngắt quyền đọc sách điện tử.
    * Prisma Schema: Bảng `disputes`, `dispute_evidences`, `dispute_messages`.
  * **Frontend (Storefront, Seller & Admin)**:
    * `web/src/ui/pages/user/CreateDisputePage.jsx`: Form tạo khiếu nại tải lên ảnh/video bằng chứng mở hộp.
    * `web/src/ui/components/dispute/DisputeChatRoom.jsx`: Phòng chat đối chất 2 chiều giữa Khách và Shop.
    * `web/src/ui/pages/seller/SellerDisputesPage.jsx`: Giao diện Seller quản lý các đơn bị khiếu nại.
    * `web/src/ui/pages/admin/AdminDisputesPage.jsx`: Dashboard Trọng tài Admin xem video/ảnh và ra phán quyết ràng buộc.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 18
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  ESCROW FREEZE          ADMIN ARBITRATION      FRONTEND UI &    TESTING SUITE &
DISPUTE MODEL    & CHAT ROOM 48H        & DRM REVOCATION       ADMIN DASHBOARD  ARBITRATION AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA TRANH CHẤP

### 📌 Mục tiêu:
Thiết lập các bảng lưu trữ hồ sơ tranh chấp, tệp tin bằng chứng và lịch sử trao đổi đối chất trên PostgreSQL.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `disputes`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `dispute_code`: String, Unique, Index (VD: `DSP-8899`).
    * `order_id`: UUID, FK `orders`.
    * `sub_order_id`: UUID, FK `sub_orders`, Index.
    * `buyer_id`: UUID, FK `users`.
    * `business_id`: UUID, FK `businesses`.
    * `dispute_type`: Enum (`PHYSICAL_DAMAGED`, `WRONG_BOOK`, `MISSING_PAGES`, `EBOOK_FILE_CORRUPTED`, `OTHER`).
    * `refund_amount`: Decimal.
    * `status`: Enum (`OPENED`, `SELLER_NEGOTIATING`, `ESCALATED_TO_ADMIN`, `RESOLVED_REFUND_BUYER`, `RESOLVED_REJECTED`, `CLOSED`).
    * `escrow_frozen`: Boolean (Default: true).
    * `admin_decision`: Enum (`BUYER_WIN`, `SELLER_WIN`, `PARTIAL_SPLIT`).
    * `admin_notes`: Text (Nullable).
    * `arbitrated_by`: UUID (Nullable, FK `users`).
    * `negotiate_deadline`: DateTime (Mốc 48h).
    * `resolved_at`: DateTime (Nullable).

* **Task 1.2: Thiết kế Bảng `dispute_evidences` & `dispute_messages`**
  * `dispute_evidences`: `id`, `dispute_id`, `uploader_role`, `file_type` (`IMAGE`/`VIDEO`), `file_url`, `description`.
  * `dispute_messages`: `id`, `dispute_id`, `sender_id`, `sender_role`, `message_text`, `attachments` (Text[]), `created_at`.

---

## PHẦN 2: ESCROW FREEZE ENGINE & PHÒNG CHAT ĐỐI CHẤT 48H

### 📌 Mục tiêu:
Tự động khóa dòng tiền trong ví Shop ngay khi nhận đơn khiếu nại và cung cấp kênh giao tiếp bảo mật 2 chiều.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai API Mở Khiếu Nại & Khóa Tiền Escrow**
  * **Endpoint**: `POST /api/v1/disputes`
  * **Xử lý**:
    * Kiểm tra đơn đã giao $\le 3\text{ ngày}$.
    * Lưu hồ sơ tranh chấp và danh sách file ảnh/video bằng chứng.
    * Gọi `escrowService.freezeSubOrderFunds(subOrderId)`: Đóng băng tiền treo của đơn này trong ví của Seller.
    * Đẩy Delayed Job 48h vào BullMQ: Nếu sau 48h 2 bên chưa thống nhất &rarr; Tự động chuyển hồ sơ lên Admin (`ESCALATED_TO_ADMIN`).

* **Task 2.2: Xây dựng Module Chat Đối Chất (`DisputeChatService`)**
  * `GET /api/v1/disputes/:id/messages`: Lấy lịch sử chat.
  * `POST /api/v1/disputes/:id/messages`: Gửi tin nhắn / bằng chứng bổ sung trong phòng đối chất (hỗ trợ WebSocket sync).

---

## PHẦN 3: MODULE TRỌNG TÀI ADMIN & THU HỒI BẢN QUYỀN SỐ

### 📌 Mục tiêu:
Xây dựng logic phân xử tối cao của Admin, kích hoạt hoàn tiền và thu hồi giấy phép bản quyền Ebook.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Triển khai API Phán Quyết Trọng Tài Admin**
  * **Endpoint**: `POST /api/v1/admin/disputes/:id/arbitrate`
  * **Body**: `{ decision: 'BUYER_WIN' | 'SELLER_WIN', adminNotes: "...", refundPercentage: 100 }`
  * **Xử lý nhánh `BUYER_WIN`**:
    * Gọi `autoRefundService.processOrderRefund()` hoàn tiền cho khách.
    * Nếu là đơn có Ebook: Gọi `drmService.revokeLicense(buyerId, bookId)`.
    * Cập nhật `disputes.status = 'RESOLVED_REFUND_BUYER'`.
  * **Xử lý nhánh `SELLER_WIN`**:
    * Gọi `escrowService.unfreezeFunds(subOrderId)` mở khóa tiền vào ví khả dụng của Shop.
    * Cập nhật `disputes.status = 'RESOLVED_REJECTED'`.

* **Task 3.2: Triển khai Logic Thu Hồi Bản Quyền trong `drm-service`**
  * Cập nhật `user_ebook_licenses.status = 'REVOKED'`.
  * Xóa cache bản quyền trên Redis `DEL license:user:{userId}:book:{bookId}`.
  * Ngắt kết nối các phiên đọc Web Reader đang mở của cuốn sách đó.

---

## PHẦN 4: GIAO DIỆN KHIẾU NẠI BUYER, SELLER & DASHBOARD TRỌNG TÀI ADMIN

### 📌 Mục tiêu:
Xây dựng giao diện tạo khiếu nại kèm trình tải video mở hộp và Dashboard thẩm định bằng chứng chuyên nghiệp cho Admin.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Giao diện Mở Khiếu Nại Dành Cho Người Mua (`CreateDisputePage.jsx`)**
  * Form lựa chọn lý do lỗi trực quan (Sách rách, ướt, giao sai, Ebook lỗi file).
  * Bộ tải đa tệp (Multi-upload): Tải từ 2-5 ảnh chụp góc lỗi và 1 video mở hộp (Unboxing video dung lượng $\le 100\text{MB}$).
  * Khung nhập số tiền yêu cầu hoàn lại và mô tả sự việc.

* **Task 4.2: Phòng Chat Đối Chất Trực Tuyến ([`DisputeChatRoom.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/dispute/DisputeChatRoom.jsx))**
  * Khung chat phong cách hiện đại giữa Khách và Shop:
    * Đồng hồ đếm ngược 48h hòa giải.
    * Khung xem ảnh/video phóng to sắc nét.
    * Nút hành động nhanh dành cho Seller: **"Chấp nhận hoàn tiền 100%"** và **"Từ chối & Chuyển Admin phân xử"**.

* **Task 4.3: Bảng Quản Trị Trọng Tài Admin ([`AdminDisputesPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/admin/AdminDisputesPage.jsx))**
  * Bảng danh sách các vụ tranh chấp đang chờ xử lý.
  * **Khung thẩm định song song (Side-by-side Evidence Player)**:
    * Cột 1: Video mở hộp & ảnh bằng chứng của Người Mua.
    * Cột 2: Video đóng gói & phiếu xuất kho của Người Bán.
  * Hộp thoại nhập kết luận lập luận phân xử & nút ra phán quyết: 🟢 **Khách Thắng** / 🔴 **Shop Thắng**.

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ TÍNH TOÀN VẸN PHÂN XỬ (TEST SUITE)

### 📌 Mục tiêu:
Đảm bảo các luồng đóng băng tiền, phân xử Admin và thu hồi bản quyền hoạt động chính xác 100%.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit & Integration Test Luồng Khiếu Nại**
  * Test Case tạo khiếu nại &rarr; Xác nhận tiền Escrow bị khóa `FROZEN` ngay lập tức.
  * Test Case Admin duyệt Khách thắng &rarr; Xác nhận tiền hoàn về tài khoản khách.
  * Test Case Admin duyệt Shop thắng &rarr; Xác nhận tiền Escrow chuyển vào ví khả dụng của Shop.

* **Task 5.2: Kiểm thử Thu Hồi Bản Quyền Ebook (DRM Revocation Test)**
  * Khiếu nại Ebook được duyệt hoàn tiền &rarr; Xác nhận sách biến mất khỏi Tủ sách và không thể mở trên Web Reader.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `disputes`, `dispute_evidences`, `dispute_messages` | ⏳ Sẵn sàng | Backend Team |
| **Escrow Freeze**| Khóa tiền ví Escrow tức thì khi có khiếu nại | ⏳ Sẵn sàng | Backend Team |
| **Chat Room** | Phòng đối chất trực tuyến 2 chiều kèm đếm ngược 48h | ⏳ Sẵn sàng | Fullstack Team |
| **Admin Panel** | Dashboard thẩm định video song song `AdminDisputesPage.jsx` | ⏳ Sẵn sàng | Frontend Team |
| **DRM Revocation**| Thu hồi giấy phép bản quyền số Ebook khi hoàn tiền | ⏳ Sẵn sàng | Backend Team |
| **Arbitration Audit**| Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_DIS_01 đến TC_DIS_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 18 thuộc Nền tảng Sách Huki Ebook.*
