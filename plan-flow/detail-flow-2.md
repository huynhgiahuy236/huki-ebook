# TÀI LIỆU ĐẶC TẢ CHI TIẾT NGHIỆP VỤ - LUỒNG 2
## YÊU CẦU CHỈNH SỬA HỒ SƠ DOANH NGHIỆP & CƠ CHẾ ĐỒNG BỘ THÔNG BÁO CHẤM ĐỎ / VIỀN ĐỎ (BUSINESS PROFILE UPDATE & NOTIFICATIONS SYNC)

---

## I. MỤC TIÊU & PHẠM VI NGHIỆP VỤ

* **Mục tiêu**: Thiết lập quy trình kiểm soát chặt chẽ việc thay đổi thông tin pháp lý của doanh nghiệp (Tên pháp nhân, MST, Hotline, Email, Danh sách trụ sở/chi nhánh, Thông tin gian hàng). Mọi thay đổi đều phải được Admin sàn thẩm định trước khi ghi đè vào Cơ sở dữ liệu chính thức. Đồng thời, triển khai cơ chế thông báo chấm đỏ (Red Dot) và viền đỏ (Red Border) đồng bộ thời gian thực 2 chiều giữa Seller và Admin.
* **Các bên tham gia (Actors)**:
  1. **Chủ doanh nghiệp / Nhà bán hàng (Seller / Business Owner)**: Gửi yêu cầu chỉnh sửa, theo dõi phản hồi, xem chi tiết và quản lý xóa thông báo.
  2. **Ban quản trị Sàn (Platform Admin)**: Nhận thông báo yêu cầu mới, đối chiếu dữ liệu cũ vs mới, phê duyệt cập nhật DB hoặc từ chối kèm lý do.
  3. **Hệ thống Backend & Cơ sở dữ liệu**: `business-service` (quản lý bảng `businesses`, `business_update_requests`), bộ đếm Cooldown 2 phút (120 giây).

---

## II. ĐẶC TẢ DỮ LIỆU YÊU CẦU CẬP NHẬT (UPDATE REQUEST SCHEMA)

Bản ghi yêu cầu cập nhật được lưu trữ trong bảng `business_update_requests`:

| Tên Cột (Field) | Kiểu Dữ Liệu | Ràng Buộc & Mô Tả |
|---|---|---|
| `id` | UUID (Primary Key) | Mã định danh duy nhất của yêu cầu (VD: `c9b1a2e3-...`) |
| `business_id` | UUID (Foreign Key) | Khóa ngoại liên kết đến bảng `businesses(id)` |
| `requested_data` | JSONB | Chứa toàn bộ dữ liệu mới đề xuất (Tên, MST, Loại hình, Hotline, Email, Mảng danh sách trụ sở `headquarters: []`, Tên gian hàng, Mô tả) |
| `status` | Enum (`PENDING`, `APPROVED`, `REJECTED`) | Trạng thái thẩm định của yêu cầu |
| `rejection_reason`| Text (Nullable) | Lý do từ chối cụ thể do Admin nhập nếu bị từ chối |
| `reviewed_by` | UUID (Nullable) | ID tài khoản Admin thực hiện thẩm định |
| `reviewed_at` | Timestamp (Nullable) | Thời điểm Admin bấm duyệt hoặc từ chối |
| `created_at` | Timestamp | Thời điểm Seller bấm gửi yêu cầu |

---

## III. SƠ ĐỒ TRÌNH TỰ ĐỒNG BỘ 2 CHIỀU (SEQUENCE DIAGRAM)

```mermaid
sequenceDiagram
    autonumber
    actor Seller as Nhà Bán Hàng (Seller)
    participant SellerWeb as Giao Diện Seller (React)
    participant BizService as Business Microservice
    participant AdminWeb as Giao Diện Admin (React)
    actor Admin as Ban Quản Trị (Admin)

    Note over Seller,SellerWeb: GIAI ĐOẠN 1: SELLER GỬI YÊU CẦU CHỈNH SỬA
    Seller->>SellerWeb: Vào /seller/business -> Bấm "Cập nhật thông tin"
    Seller->>SellerWeb: Nhập Tên mới, MST, Thêm Trụ sở 2, 3... -> Bấm "Gửi yêu cầu"
    SellerWeb->>BizService: POST /api/v1/business/update-request (Payload JSON)
    BizService->>BizService: Kiểm tra Cooldown 120s (Rate-limit)
    BizService->>BizService: Tạo bản ghi business_update_requests (status: PENDING)
    BizService-->>SellerWeb: { success: true, cooldownRemaining: 120 }
    SellerWeb-->>Seller: Thông báo gửi thành công, nút chuyển sang đếm ngược 120s

    Note over AdminWeb,Admin: GIAI ĐOẠN 2: ADMIN NHẬN CHẤM ĐỎ & THẨM ĐỊNH
    BizService-->>AdminWeb: Event / API cập nhật số lượng PENDING
    AdminWeb->>AdminWeb: Hiển thị CHẤM ĐỎ trên Sidebar "Yêu Cầu Chỉnh Sửa"
    Admin->>AdminWeb: Bấm vào Sidebar -> Chuyển sang /admin/business-update-requests
    AdminWeb-->>Admin: Bảng danh sách: Hàng yêu cầu mới có VIỀN ĐỎ & badge "MỚI"
    Admin->>AdminWeb: Bấm "Xem so sánh" -> Mở Modal đối chiếu 2 cột (Cũ vs Mới)
    AdminWeb->>AdminWeb: Đánh dấu đã xem -> Hàng MẤT VIỀN ĐỎ, Chấm đỏ Sidebar giảm đi

    alt TRƯỜNG HỢP A: ADMIN PHÊ DUYỆT (APPROVE)
        Admin->>AdminWeb: Bấm "Chấp nhận & Cập nhật DB"
        AdminWeb->>BizService: POST /api/v1/business/update-requests/{id}/approve
        BizService->>BizService: Transaction: Ghi đè requested_data vào bảng businesses
        BizService->>BizService: Cập nhật status = 'APPROVED', reviewed_at = now()
        BizService-->>AdminWeb: Phê duyệt thành công
    else TRƯỜNG HỢP B: ADMIN TỪ CHỐI (REJECT)
        Admin->>AdminWeb: Bấm "Từ chối" & Nhập lý do bắt buộc
        AdminWeb->>BizService: POST /api/v1/business/update-requests/{id}/reject (rejectionReason)
        BizService->>BizService: Cập nhật status = 'REJECTED', lưu rejection_reason
        BizService-->>AdminWeb: Đã từ chối yêu cầu
    end

    Note over SellerWeb,Seller: GIAI ĐOẠN 3: SELLER NHẬN PHẢN HỒI QUA CHẤM ĐỎ
    BizService-->>SellerWeb: Đồng bộ trạng thái yêu cầu đã xử lý
    SellerWeb->>SellerWeb: Hiển thị CHẤM ĐỎ trên 🔔 Chuông & trên Menu Sidebar Seller
    Seller->>SellerWeb: Bấm vào Chuông -> Chuyển sang Trang /seller/business/notifications
    SellerWeb-->>Seller: Thẻ thông báo mới có VIỀN ĐỎ & badge "MỚI"
    Seller->>SellerWeb: Bấm vào thẻ thông báo -> Mở Modal chi tiết nội dung
    SellerWeb->>SellerWeb: Đánh dấu ĐÃ ĐỌC -> Thẻ MẤT VIỀN ĐỎ
    SellerWeb->>SellerWeb: Hết thông báo đỏ -> CHẤM ĐỎ TRÊN CHUÔNG & SIDEBAR ẨN HOÀN TOÀN

    Note over Seller,SellerWeb: GIAI ĐOẠN 4: QUẢN LÝ XÓA THÔNG BÁO
    Seller->>SellerWeb: Bấm biểu tượng 🗑️ xóa từng thông báo (hoặc chọn tất cả -> Xóa hàng loạt)
    SellerWeb->>SellerWeb: Cập nhật danh sách, tính toán lại chấm đỏ
```

---

## IV. PHÂN RÃ CHI TIẾT TỪNG BƯỚC THỰC HIỆN (STEP-BY-STEP BREAKDOWN)

---

### BƯỚC 1: SELLER THỰC HIỆN CHỈNH SỬA & GỬI YÊU CẦU

* **Bước 1.1: Mở chế độ chỉnh sửa**:
  * Seller đăng nhập tài khoản đối tác, truy cập trang **Hồ Sơ Doanh Nghiệp & Cửa Hàng** (`/seller/business`).
  * Bấm nút **"Cập nhật thông tin"** trên thanh tiêu đề &rarr; Toàn bộ các trường dữ liệu tĩnh chuyển sang dạng Input/Select cho phép chỉnh sửa, xuất hiện banner cảnh báo màu vàng: *"Đang ở chế độ chỉnh sửa thông tin doanh nghiệp"*.
* **Bước 1.2: Chỉnh sửa các trường thông tin**:
  * *Thông tin pháp lý*: Sửa Tên pháp nhân, MST, Loại hình doanh nghiệp, Hotline CSKH, Email nhận thông báo.
  * *Thông tin trụ sở & kho hàng*:
    * Bấm nút **"+ Thêm trụ sở [N]"** &rarr; Hệ thống tự sinh thêm một thẻ nhập liệu mới với nhãn đếm tăng dần (*Trụ sở 2, Trụ sở 3...*).
    * Bấm nút **"Xóa"** màu đỏ ở góc từng trụ sở phụ để loại bỏ bớt chi nhánh không còn hoạt động (Trụ sở 1 chính không được xóa).
  * *Thông tin gian hàng*: Sửa Tên gian hàng hiển thị và Mô tả giới thiệu.
* **Bước 1.3: Kiểm tra ràng buộc & Gửi yêu cầu**:
  * Người dùng bấm nút **"Gửi yêu cầu"** (hoặc nút *"Hủy bỏ"* nếu muốn khôi phục dữ liệu ban đầu).
  * *Kiểm tra tại chỗ (Client Validation)*:
    * Tên doanh nghiệp không được để trống.
    * Bắt buộc có ít nhất 1 địa chỉ trụ sở hợp lệ.
  * Gửi request `POST /api/v1/business/update-request` lên server.
* **Bước 1.4: Kích hoạt Cooldown 2 phút (Chống Spam)**:
  * Ngay khi gửi thành công, hệ thống khóa nút gửi và chuyển sang trạng thái đếm ngược: `Đợi 120s`, `Đợi 119s`...
  * Trong thời gian 120 giây này, người dùng không thể gửi thêm bất kỳ yêu cầu mới nào.

---

### BƯỚC 2: ADMIN NHẬN CHẤM ĐỎ & THẨM ĐỊNH ĐỐI CHIẾU 2 CỘT

* **Bước 2.1: Hiển thị Chấm Đỏ trên Sidebar Admin**:
  * Khi có ít nhất 1 yêu cầu mới ở trạng thái `PENDING` mà Admin chưa xem:
  * Menu **"Yêu Cầu Chỉnh Sửa"** trên Sidebar Admin (`AdminLayout.jsx`) xuất hiện **chấm đỏ (kèm số lượng)** nhấp nháy.
  * Khi Sidebar ở chế độ thu gọn (collapsed), xuất hiện chấm đỏ nhỏ góc biểu tượng.
* **Bước 2.2: Truy cập Trang Quản Lý Yêu Cầu**:
  * Admin bấm vào menu &rarr; Chuyển đến trang `/admin/business-update-requests`.
  * Hàng yêu cầu mới chưa xem hiển thị **viền đỏ nổi bật bên trái (`border-l-4 border-l-rose-500`)**, nền hồng nhạt và gắn huy hiệu **`MỚI`**.
* **Bước 2.3: Mở Modal Đối Chiếu Trực Quan (Before vs After)**:
  * Admin bấm vào hàng hoặc bấm nút **"Xem so sánh"**:
  * Hệ thống ghi nhận Admin đã xem yêu cầu này &rarr; Lưu vào `localStorage (huki_admin_read_update_requests)` và phát event `huki_admin_noti_updated`.
  * Hàng đó lập tức **mất viền đỏ** và mất chữ `MỚI`; số lượng trên chấm đỏ Sidebar Admin **giảm đi tương ứng**.
  * Modal đối chiếu 2 cột mở ra:
    * **Cột 1 (Dữ liệu Hiện Tại)**: Lấy dữ liệu thực tế đang có trong bảng `businesses` của DB.
    * **Cột 2 (Đề Xuất Mới)**: Hiển thị các thông tin mới do Seller gửi duyệt (Tên mới, MST mới, danh sách các trụ sở mới 1, 2, 3...).

---

### BƯỚC 3: QUYẾT ĐỊNH THẨM ĐỊNH CỦA ADMIN

#### 🔹 TRƯỜNG HỢP 3A: PHÊ DUYỆT CẬP NHẬT (APPROVE)
* **Bước 3A.1**: Admin bấm nút xanh **"Chấp nhận & Cập nhật DB"**.
* **Bước 3A.2**: Backend `business-service` thực thi chuỗi giao dịch Database (Transaction):
  ```sql
  UPDATE businesses 
  SET name = requested_data->>'name',
      tax_code = requested_data->>'taxCode',
      business_type = requested_data->>'businessType',
      phone = requested_data->>'phone',
      email = requested_data->>'email',
      address = requested_data->'headquarters'::text,
      updated_at = NOW()
  WHERE id = business_id;
  
  UPDATE business_update_requests 
  SET status = 'APPROVED', 
      reviewed_by = admin_id, 
      reviewed_at = NOW() 
  WHERE id = request_id;
  ```
* **Bước 3A.3**: Cập nhật đồng bộ tên và mô tả của Gian hàng (`stores`) liên kết.
* **Bước 3A.4**: Đóng modal và hiển thị toast thông báo: *"Đã phê duyệt và cập nhật thông tin doanh nghiệp vào Database thành công!"*.

#### 🔸 TRƯỜNG HỢP 3B: TỪ CHỐI CẬP NHẬT (REJECT)
* **Bước 3B.1**: Admin bấm nút đỏ **"Từ chối yêu cầu"**.
* **Bước 3B.2**: Hộp thoại popup yêu cầu Admin nhập **Lý do từ chối (Bắt buộc)** (Ví dụ: *"Mã số thuế mới không tồn tại trên Cổng thông tin Tổng cục Thuế, vui lòng kiểm tra lại"*).
* **Bước 3B.3**: Bấm *"Xác nhận từ chối"*:
  * Backend cập nhật `business_update_requests.status = 'REJECTED'` và lưu `rejection_reason`.
  * Dữ liệu trong bảng `businesses` giữ nguyên không thay đổi.

---

### BƯỚC 4: SELLER NHẬN THÔNG BÁO, XEM CHI TIẾT & ĐỒNG BỘ CHẤM ĐỎ

* **Bước 4.1: Hiển thị Chấm Đỏ phía Seller**:
  * Khi Admin đã duyệt hoặc từ chối yêu cầu:
  * Trên trang Hồ sơ (`/seller/business`), biểu tượng 🔔 **Chuông thông báo** hiển thị **chấm đỏ kèm số lượng** thông báo chưa đọc.
  * Trên Sidebar Seller, mục **"Hồ Sơ Cửa Hàng & Doanh Nghiệp"** cũng xuất hiện **badge đỏ**.
* **Bước 4.2: Truy cập Trang Danh Sách Thông Báo Riêng Biệt (Dạng Page)**:
  * Seller bấm vào biểu tượng Chuông 🔔 &rarr; Hệ thống chuyển hướng thẳng sang trang chuyên dụng: `/seller/business/notifications`.
  * *Bộ lọc theo Tab*: `Tất cả`, `Đã duyệt (APPROVED)`, `Bị từ chối (REJECTED)`, `Đang chờ (PENDING)`.
  * *Thanh tìm kiếm*: Tìm nhanh theo mã yêu cầu hoặc từ khóa lý do từ chối.
* **Bước 4.3: Nhận diện Thông Báo Mới (Viền Đỏ)**:
  * Các thông báo mới nhận phản hồi có **viền đỏ nổi bật (`border-2 border-rose-500`)**, nền ửng đỏ nhẹ và gắn huy hiệu **`MỚI`** nhấp nháy.
* **Bước 4.4: Bấm Vào Xem Chi Tiết & Tự Động Đổi Viền**:
  * Seller bấm vào thẻ thông báo hoặc bấm nút **"Xem chi tiết nội dung đã gửi"**:
  * Modal chi tiết mở lên hiển thị đầy đủ thông tin pháp lý, danh sách trụ sở 1, 2, 3... và lý do từ chối (nếu có).
  * Hệ thống lập tức:
    1. Đánh dấu thông báo này là **ĐÃ ĐỌC** trong `localStorage (huki_read_req_noti_{bizId})`.
    2. Thẻ thông báo lập tức **chuyển từ viền đỏ sang viền bình thường** (viền xanh nếu Đã duyệt, viền xám nếu Từ chối).
    3. Huy hiệu `MỚI` biến mất.
    4. Kích hoạt event `huki_noti_updated` &rarr; Số đếm trên 🔔 Chuông và trên Sidebar **giảm đi ngay lập tức**.
* **Bước 4.5: Ẩn Chấm Đỏ Hoàn Toàn**:
  * Khi Seller đã bấm xem hết tất cả các thông báo viền đỏ (hoặc bấm nút *"Đánh dấu tất cả đã đọc"*):
  * Số lượng unread $= 0$ &rarr; **Chấm đỏ trên Chuông 🔔 và trên Sidebar Seller biến mất hoàn toàn**.

---

### BƯỚC 5: THAO TÁC XÓA THÔNG BÁO (SINGLE & BULK DELETE)

* **Bước 5.1: Xóa từng thông báo**:
  * Trên góc phải mỗi thẻ thông báo có biểu tượng thùng rác 🗑️.
  * Seller bấm vào biểu tượng 🗑️ &rarr; Thông báo bị xóa ngay lập tức, lưu trạng thái vào `localStorage (huki_deleted_req_noti_{bizId})`, hiển thị toast *"Đã xóa 1 thông báo"*.
* **Bước 5.2: Xóa nhiều thông báo đã chọn (Bulk Delete)**:
  * Mỗi thẻ thông báo có 1 hộp chọn (Checkbox) ở góc trên bên trái.
  * Trên thanh công cụ có checkbox **"Chọn tất cả (N thông báo)"**:
    * Tick vào "Chọn tất cả" &rarr; Toàn bộ các thông báo đang hiển thị theo bộ lọc được chọn.
    * Xuất hiện nút màu đỏ: **"Xóa các thông báo đã chọn (N)"**.
  * Bấm nút xóa &rarr; Toàn bộ các mục đã tick biến mất khỏi danh sách.
* **Bước 5.3: Tự động cập nhật Chấm Đỏ sau khi xóa**:
  * Nếu thông báo bị xóa là thông báo chưa đọc (đang có viền đỏ), hệ thống tự động trừ số lượng và cập nhật chấm đỏ trên Chuông 🔔 và Sidebar ngay lập tức.

---

## V. MA TRẬN KIỂM THỬ TOÀN DIỆN (TEST CASES MATRIX)

| Mã Test Case | Tên Kịch Bản Kiểm Thử | Các Bước Thao Tác | Kết Quả Kỳ Vọng (Expected Result) | Đánh Giá |
|:---:|---|---|---|:---:|
| **TC_NOTI_01** | Seller gửi yêu cầu & kích hoạt Cooldown 2 phút | 1. Vào `/seller/business`, bấm Cập nhật.<br>2. Thêm Trụ sở 2 & bấm Gửi. | Gửi thành công, nút chuyển sang đếm ngược 120s, không cho gửi tiếp khi chưa hết giờ. | **PASS** |
| **TC_NOTI_02** | Chấm đỏ & Viền đỏ xuất hiện phía Admin | 1. Đăng nhập Admin.<br>2. Quan sát Sidebar & trang `/admin/business-update-requests`. | Sidebar hiện chấm đỏ. Trang danh sách hiện dòng yêu cầu có viền đỏ + huy hiệu `MỚI`. | **PASS** |
| **TC_NOTI_03** | Admin xem so sánh & mất viền đỏ | 1. Admin bấm *"Xem so sánh"* đối chiếu 2 cột. | Modal mở lên. Dòng yêu cầu mất viền đỏ, chấm đỏ trên Sidebar Admin giảm đi ngay. | **PASS** |
| **TC_NOTI_04** | Admin duyệt & Cập nhật trực tiếp vào DB | 1. Admin bấm *"Chấp nhận & Cập nhật DB"*. | Bảng `businesses` trong DB đổi sang Tên mới và danh sách Trụ sở mới 100%. | **PASS** |
| **TC_NOTI_05** | Chấm đỏ & Viền đỏ xuất hiện phía Seller | 1. Seller vào `/seller/business`.<br>2. Quan sát icon Chuông 🔔 và Sidebar. | Chuông 🔔 có chấm đỏ. Sidebar có badge đỏ. Bấm vào chuyển sang trang thông báo dạng page. | **PASS** |
| **TC_NOTI_06** | Seller xem thông báo -> Đổi viền & Ẩn chấm đỏ | 1. Seller bấm xem chi tiết thông báo viền đỏ. | Thẻ đổi sang viền bình thường. Xem hết thông báo thì chấm đỏ trên Chuông và Sidebar ẩn hoàn toàn. | **PASS** |
| **TC_NOTI_07** | Xóa đơn lẻ & Xóa hàng loạt thông báo | 1. Bấm nút 🗑️ xóa 1 mục.<br>2. Tick "Chọn tất cả" & bấm "Xóa mục đã chọn". | Các thông báo biến mất, reload lại trang không bị hiện lại, chấm đỏ tính lại chính xác. | **PASS** |

---

## VI. ĐIỀU KIỆN NGHIỆM THU HOÀN TẤT (DEFINITION OF DONE)

1. ✅ Luồng gửi yêu cầu có Cooldown 120 giây hoạt động mượt mà, chống spam hiệu quả.
2. ✅ Thông tin phê duyệt được cập nhật chính xác vào CSDL PostgreSQL (bảng `businesses` và `stores`).
3. ✅ Cơ chế Chấm đỏ (Red Dot) và Viền đỏ (Red Border) hoạt động đồng bộ 2 chiều (Seller & Admin) không có độ trễ.
4. ✅ Giao diện Thông báo phía Seller được thiết kế dạng Page riêng biệt (`/seller/business/notifications`), modal chỉ mở khi bấm xem chi tiết.
5. ✅ Tính năng xóa thông báo đơn lẻ và xóa hàng loạt (Bulk Delete) hoạt động ổn định và bền vững qua các phiên làm việc.
