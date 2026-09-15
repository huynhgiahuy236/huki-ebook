# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 2
## YÊU CẦU CHỈNH SỬA HỒ SƠ DOANH NGHIỆP & CƠ CHẾ ĐỒNG BỘ THÔNG BÁO CHẤM ĐỎ / VIỀN ĐỎ (BUSINESS PROFILE UPDATE & NOTIFICATIONS SYNC)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng trọn vẹn quy trình gửi yêu cầu cập nhật hồ sơ doanh nghiệp (có cơ chế rate-limit cooldown 2 phút), thẩm định đối chiếu dữ liệu 2 cột phía Admin, tự động ghi đè dữ liệu mới vào DB khi duyệt, và triển khai cơ chế thông báo chấm đỏ (Red Dot) & viền đỏ (Red Border) đồng bộ thời gian thực hai chiều giữa Seller và Admin.
* **Các tệp và thành phần liên quan**:
  * **Backend**:
    * Schema Prisma: Bảng `businesses`, `business_update_requests`, `stores`.
    * Controller & Service: `business.controller.ts`, `business.service.ts`.
  * **Frontend Seller**:
    * [`SellerBusinessProfilePage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerBusinessProfilePage.jsx): Màn hình hồ sơ, chế độ chỉnh sửa, nút chuông thông báo 🔔 kèm chấm đỏ, quản lý trụ sở động.
    * [`SellerBusinessNotificationsPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerBusinessNotificationsPage.jsx): Trang thông báo dạng Page chuyên dụng, viền đỏ thông báo mới, modal chi tiết, xóa đơn lẻ/hàng loạt.
    * [`SellerSidebar.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/layout/SellerSidebar.jsx): Badge chấm đỏ trên mục "Hồ Sơ Cửa Hàng & Doanh Nghiệp".
  * **Frontend Admin**:
    * [`AdminBusinessUpdateRequestsPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/admin/AdminBusinessUpdateRequestsPage.jsx): Bảng yêu cầu có viền đỏ & badge `MỚI`, modal so sánh 2 cột Before vs After, duyệt cập nhật DB, từ chối kèm lý do.
    * [`AdminLayout.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/layout/AdminLayout.jsx): Chấm đỏ nhấp nháy trên mục "Yêu Cầu Chỉnh Sửa".

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 2
                                           │
    ┌────────────────┬─────────────────────┼─────────────────────┬────────────────┐
    ▼                ▼                     ▼                     ▼                ▼
 PHẦN 1:          PHẦN 2:               PHẦN 3:               PHẦN 4:          PHẦN 5:
DATABASE &       SELLER PROFILE &      SELLER NOTIFICATIONS  ADMIN REVIEW &   EVENT SYNC &
BACKEND APIS     COOLDOWN 120S         PAGE & XÓA BỘ LỌC     CHẤM ĐỎ SIDEBAR  KIỂM THỬ E2E
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & XÂY DỰNG BACKEND APIS

### 📌 Mục tiêu:
Xây dựng bảng lưu trữ `business_update_requests` và hoàn thiện 5 endpoint API phục vụ cho quy trình gửi yêu cầu, kiểm soát cooldown 2 phút, lấy danh sách, phê duyệt cập nhật DB và từ chối.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Hoàn thiện Schema Prisma Bảng `business_update_requests`**
  * Định nghĩa các trường: `id` (UUID), `business_id` (FK), `requested_data` (JSONB), `status` (Enum: `PENDING`, `APPROVED`, `REJECTED`), `rejection_reason` (Text), `reviewed_by` (UUID), `reviewed_at` (Timestamp), `created_at` (Timestamp).
  * Đánh chỉ mục (Index) trên `business_id` và `status` để truy vấn tốc độ cao.

* **Task 1.2: API Gửi Yêu Cầu Cập Nhật Hồ Sơ (Kèm Cooldown 120s)**
  * **Endpoint**: `POST /api/v1/business/update-request`
  * **Xử lý Logic**:
    1. Kiểm tra yêu cầu gần nhất của doanh nghiệp này trong DB. Nếu thời gian gửi cách hiện tại $< 120\text{s}$ &rarr; Trả về lỗi `429 Too Many Requests` kèm số giây còn lại cần chờ.
    2. Validate dữ liệu gửi lên: Tên pháp nhân không được rỗng, mảng `headquarters` có ít nhất 1 trụ sở.
    3. Tạo bản ghi mới trong `business_update_requests` với `status = 'PENDING'`.
    4. Trả về `{ success: true, message: "Đã gửi yêu cầu thành công", cooldownRemaining: 120 }`.

* **Task 1.3: API Lấy Danh Sách Yêu Cầu Phía Seller**
  * **Endpoint**: `GET /api/v1/business/my-update-requests`
  * **Xử lý Logic**: Lấy toàn bộ lịch sử yêu cầu của doanh nghiệp hiện tại, sắp xếp giảm dần theo `created_at`, tính toán thời gian `cooldownRemaining`.

* **Task 1.4: API Lấy Danh Sách Yêu Cầu Toàn Sàn Phía Admin**
  * **Endpoint**: `GET /api/v1/business/update-requests`
  * **Query**: `status=PENDING&page=1&limit=50&search=`
  * **Xử lý Logic**: Hỗ trợ Admin lọc theo trạng thái và tìm kiếm theo tên doanh nghiệp hoặc mã yêu cầu.

* **Task 1.5: API Phê Duyệt Cập Nhật & Ghi Đè Database (Approve)**
  * **Endpoint**: `POST /api/v1/business/update-requests/:id/approve`
  * **Xử lý Logic (Transaction)**:
    1. Trích xuất `requested_data` từ bản ghi yêu cầu.
    2. Cập nhật bảng `businesses`: Ghi đè Tên pháp nhân, MST, Hotline, Email, Loại hình, và chuyển mảng `headquarters` thành chuỗi JSON lưu vào cột `address`.
    3. Cập nhật bảng `stores`: Đồng bộ Tên gian hàng và Mô tả gian hàng.
    4. Cập nhật bản ghi yêu cầu: `status = 'APPROVED'`, `reviewed_at = now()`.

* **Task 1.6: API Từ Chối Cập Nhật (Reject)**
  * **Endpoint**: `POST /api/v1/business/update-requests/:id/reject`
  * **Body**: `{ "reason": "Lý do cụ thể..." }`
  * **Xử lý Logic**: Kiểm tra `reason` không được để trống, cập nhật `status = 'REJECTED'`, lưu `rejection_reason`.

---

## PHẦN 2: XÂY DỰNG GIAO DIỆN HỒ SƠ PHÍA SELLER (`SellerBusinessProfilePage.jsx`)

### 📌 Mục tiêu:
Cung cấp giao diện quản lý thông tin pháp nhân trực quan, hỗ trợ chế độ chỉnh sửa Inline, quản lý danh sách nhiều trụ sở chi nhánh, đếm ngược Cooldown và icon Chuông thông báo 🔔.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Chế Độ Chỉnh Sửa Inline (Edit Mode)**
  * Nút **"Cập nhật thông tin"** chuyển đổi trạng thái giữa Xem và Sửa.
  * Khi bật Sửa: Các ô text chuyển thành Input/Select, xuất hiện banner cảnh báo màu vàng: *"Đang ở chế độ chỉnh sửa thông tin doanh nghiệp"*.
  * Hai nút hành động: *"Hủy bỏ"* (phục hồi dữ liệu) và *"Gửi yêu cầu"*.

* **Task 2.2: Quản Lý Danh Sách Trụ Sở Động (Dynamic Headquarters)**
  * Nút **"+ Thêm trụ sở [N]"** sinh thêm ô nhập liệu với nhãn tự động tăng dần (*Trụ sở 2, Trụ sở 3...*).
  * Nút **"Xóa"** màu đỏ ở góc từng trụ sở phụ (Trụ sở 1 chính không cho xóa).

* **Task 2.3: Bộ Đếm Ngược Cooldown 120 Giây (Rate-limit UI)**
  * Hook `useEffect` đếm ngược từng giây khi `cooldownSeconds > 0`.
  * Khóa nút và đổi text thành: `Đợi 120s`, `Đợi 119s`... ngăn chặn người dùng bấm liên tục.

* **Task 2.4: Biểu Tượng Chuông 🔔 Thông Báo Kèm Chấm Đỏ**
  * Nút icon Chuông 🔔 đặt trang trọng trên thanh tiêu đề.
  * Hiển thị **chấm đỏ / badge số lượng** phản hồi chưa đọc (`unreadNotiCount > 0`).
  * Bấm vào Chuông &rarr; Chuyển hướng trực tiếp sang trang `/seller/business/notifications`.

---

## PHẦN 3: XÂY DỰNG TRANG THÔNG BÁO CHUYÊN DỤNG PHÍA SELLER (`SellerBusinessNotificationsPage.jsx`)

### 📌 Mục tiêu:
Thay thế hoàn toàn popup tạm thời bằng trang chuyên dụng (Dạng Page), hiển thị danh sách phản hồi từ Admin với cơ chế viền đỏ thông báo mới, modal xem chi tiết và công cụ xóa thông báo.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Cấu Trúc Giao Diện Dạng Page**
  * Breadcrumb điều hướng: `Kênh Người Bán` &bull; `Hồ Sơ Doanh Nghiệp` &bull; `Thông Báo Phản Hồi Từ Sàn`.
  * Bộ lọc trạng thái theo Tab: `Tất cả`, `Đã duyệt (APPROVED)`, `Bị từ chối (REJECTED)`, `Đang chờ (PENDING)`.
  * Thanh tìm kiếm theo mã yêu cầu hoặc từ khóa lý do từ chối.

* **Task 3.2: Hiển Thị Thẻ Thông Báo Mới (Viền Đỏ & Huy Hiệu MỚI)**
  * Nếu thông báo chưa đọc (`!readMap[req.id]`):
    * Áp dụng **viền đỏ nổi bật (`border-2 border-rose-500`)**, nền ửng hồng nhẹ và viền ngoài glow (`ring-4 ring-rose-500/10`).
    * Huy hiệu **`MỚI`** nhấp nháy góc thẻ.
  * Nếu thông báo đã đọc: Áp dụng viền chuẩn (viền xanh lá cho Đã duyệt, viền xám cho Từ chối).

* **Task 3.3: Modal Chi Tiết & Tự Động Đổi Màu Viền Khi Xem**
  * Bấm vào thẻ hoặc bấm nút *"Xem chi tiết nội dung đã gửi"* &rarr; Mở Modal xem đầy đủ thông tin pháp lý, danh sách trụ sở 1, 2, 3... và lý do từ chối.
  * Đồng thời: Đánh dấu `readMap[req.id] = true`, thẻ **lập tức mất viền đỏ**, kích hoạt event `huki_noti_updated` giảm số đếm trên Chuông 🔔 và Sidebar.

* **Task 3.4: Bộ Công Cụ Xóa Thông Báo (Single & Bulk Delete)**
  * Nút xóa thùng rác 🗑️ trên từng thẻ thông báo.
  * Checkbox chọn trên từng thẻ + Checkbox **"Chọn tất cả (N thông báo)"** trên thanh công cụ.
  * Nút màu đỏ: **"Xóa các thông báo đã chọn (N)"**.
  * Lưu trữ danh sách đã xóa vào `deletedMap` trong `localStorage`, tự động trừ số lượng unread tương ứng.

---

## PHẦN 4: XÂY DỰNG GIAO DIỆN THẨM ĐỊNH PHÍA ADMIN (`AdminBusinessUpdateRequestsPage.jsx` & `AdminLayout.jsx`)

### 📌 Mục tiêu:
Cung cấp cho Admin công cụ theo dõi qua chấm đỏ trên Sidebar, xem bảng yêu cầu có viền đỏ, modal đối chiếu 2 cột và nút phê duyệt cập nhật trực tiếp vào DB.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Chấm Đỏ Trên Sidebar Admin (`AdminLayout.jsx`)**
  * Tính toán số lượng yêu cầu `PENDING` chưa đọc.
  * Hiển thị **chấm đỏ (badge số lượng)** nhấp nháy trên mục *"Yêu Cầu Chỉnh Sửa"* (nhóm *XÉT DUYỆT ĐỐI TÁC*).
  * Hỗ trợ chấm đỏ nhỏ khi Sidebar ở chế độ thu gọn (Collapsed).

* **Task 4.2: Bảng Danh Sách Yêu Cầu (Viền Đỏ Phía Admin)**
  * Các hàng yêu cầu mới chưa xem có **viền đỏ bên trái (`border-l-4 border-l-rose-500`)** và huy hiệu **`MỚI`**.
  * Khi Admin bấm vào hàng hoặc bấm *"Xem so sánh"* &rarr; Hàng đó chuyển sang viền bình thường, chấm đỏ Sidebar Admin giảm đi ngay.

* **Task 4.3: Modal Đối Chiếu Trực Quan Before vs After**
  * **Cột 1 (Dữ liệu Hiện Tại Trong DB)**: Tên pháp nhân cũ, MST cũ, Địa chỉ cũ.
  * **Cột 2 (Đề Xuất Mới)**: Tên pháp nhân mới (nổi bật), MST mới, Danh sách các trụ sở mới 1, 2, 3...

* **Task 4.4: Thao Tác Phê Duyệt / Từ Chối**
  * Nút **"Chấp nhận & Cập nhật DB"**: Gọi API duyệt, cập nhật CSDL ngay lập tức.
  * Nút **"Từ chối yêu cầu"**: Mở popup bắt buộc nhập lý do từ chối cụ thể.

---

## PHẦN 5: ĐỒNG BỘ EVENT REAL-TIME & KẾ HOẠCH NGHIỆM THU

### 📌 Mục tiêu:
Đảm bảo cơ chế chấm đỏ và viền đỏ đồng bộ tức thì giữa các component (Chuông, Sidebar, Danh sách) mà không cần tải lại trang (No F5 Reload).

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Thiết Lập Cơ Chế Event Dispatcher**
  * Sử dụng Custom Event `window.dispatchEvent(new CustomEvent('huki_noti_updated'))` phía Seller.
  * Sử dụng Custom Event `window.dispatchEvent(new CustomEvent('huki_admin_noti_updated'))` phía Admin.
  * Lắng nghe sự kiện `storage` để đồng bộ ngay cả khi người dùng mở nhiều tab trình duyệt.

* **Task 5.2: Lưu Trữ Phân Lập Theo Doanh Nghiệp (Multi-Tenant LocalStorage)**
  * Key đã đọc: `huki_read_req_noti_{businessId}`.
  * Key đã xóa: `huki_deleted_req_noti_{businessId}`.
  * Đảm bảo khi chuyển đổi giữa các tài khoản Seller khác nhau không bị lẫn lộn dữ liệu thông báo.

---

## III. BẢNG TIẾN ĐỘ THỰC HIỆN (TIMELINE & MILESTONES)

| Giai Đoạn | Đầu Việc Chính | Output Cần Đạt | Thời Gian |
|---|---|---|:---:|
| **Giai đoạn 1** | Schema DB & Backend APIs | 5 Endpoint API hoạt động, Cooldown 120s | 1.0 ngày |
| **Giai đoạn 2** | Giao diện Seller Profile & Cooldown | Form Inline Edit, quản lý trụ sở động, Chuông 🔔 | 1.0 ngày |
| **Giai đoạn 3** | Giao diện Thông Báo Seller Page & Xóa | Trang Page riêng, viền đỏ, modal chi tiết, xóa bulk | 1.0 ngày |
| **Giai đoạn 4** | Giao diện Thẩm định Admin & Đối chiếu | Chấm đỏ Sidebar Admin, viền đỏ bảng, modal 2 cột | 1.0 ngày |
| **Giai đoạn 5** | Event Realtime & Kiểm thử E2E | Đồng bộ 2 chiều tức thì, Pass 7 Test Cases | 0.5 ngày |
| **Tổng cộng** | **Toàn bộ Luồng 2 Hoàn Chỉnh** | **Nghiệm thu 7/7 Test Cases Pass 100%** | **4.5 ngày làm việc** |

---

## IV. TIÊU CHÍ NGHIỆM THU CUỐI CÙNG (DEFINITION OF DONE)

1. ✅ Seller gửi yêu cầu chỉnh sửa thành công, có Cooldown đếm ngược 120s chống spam.
2. ✅ Admin thấy chấm đỏ trên Sidebar, xem được bảng yêu cầu có viền đỏ và badge `MỚI`.
3. ✅ Admin xem đối chiếu 2 cột trực quan (Hiện tại vs Đề xuất mới) và duyệt ghi đè CSDL chính xác.
4. ✅ Seller nhận thông báo qua chấm đỏ trên Chuông 🔔 và Sidebar, xem trên trang Page riêng biệt.
5. ✅ Thẻ thông báo mới có viền đỏ, bấm vào xem chi tiết thì chuyển sang viền chuẩn và chấm đỏ giảm/ẩn hoàn toàn.
6. ✅ Thao tác xóa thông báo đơn lẻ và xóa hàng loạt (Bulk Delete) hoạt động mượt mà, không bị mất trạng thái khi F5.
