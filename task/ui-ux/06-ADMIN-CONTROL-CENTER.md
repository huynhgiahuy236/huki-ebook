# QUY TRÌNH UI/UX & RESPONSIVE TRUNG TÂM ĐIỀU HÀNH QUẢN TRỊ (ADMIN CONTROL CENTER)

> **Phân hệ:** Quản Trị Viên Hệ Thống, Trọng Tài Pháp Lý & Kiểm Duyệt Nội Dung (Admin & Operations).  
> **Nguyên tắc cốt lõi:** Thiết kế chuẩn SaaS chuyên nghiệp (tương đương Linear / Stripe / GitHub), mật độ thông tin cực cao (High Information Density), điều hướng bằng phím tắt, hỗ trợ màn hình chia đôi (Split View) để đối chiếu duyệt sách và phân xử tranh chấp, hoàn toàn không sử dụng màu mè hoạt hình.

---

## 1. Danh Sách URL Phân Hệ Admin

```
1. Tổng quan hệ thống (Executive Dashboard) : /admin/dashboard
2. Kiểm duyệt sách & Bản quyền xuất bản       : /admin/book-moderation, /admin/books
3. Kho khóa số DRM & Truy vết Watermark    : /admin/drm-vault
4. Trọng tài tranh chấp & Khiếu nại RMA     : /admin/disputes, /admin/return-requests
5. Ký quỹ Escrow & Đối soát tài chính       : /admin/escrow, /admin/finance
6. Quản trị người dùng & Phân quyền RBAC    : /admin/accounts, /admin/users
7. Quản lý nhà xuất bản & Gian hàng         : /admin/publishers, /admin/businesses, /admin/stores
8. Quản lý đội ngũ bưu tá                   : /admin/shippers
9. Chương trình tiếp thị liên kết           : /admin/affiliates
10. Sức khỏe vi dịch vụ & Nhật ký bảo trì   : /admin/health, /admin/maintenance, /admin/settings
11. Chiến dịch khuyến mãi toàn sàn          : /admin/promotions, /admin/flash-sales, /admin/vouchers
```

---

## 2. Đặc Tả Chi Tiết Từng URL & Quy Chuẩn Desktop High-Density

### 2.1. URL: `/admin/dashboard` (Trung Tâm Chỉ Huy Tổng Thể)
* **Mục tiêu:** Giám sát thời gian thực GMV toàn sàn, số lượng đơn hàng khớp lệnh, trạng thái dòng tiền ký quỹ Escrow và tỷ lệ lỗi vi dịch vụ.
* **Quy chuẩn UX:**
  - **Lưới Chỉ Số Cấp Cao (Executive KPI Grid):**
    - 5 thẻ chỉ số ngang đỉnh trang (`grid-cols-5 gap-3`):
      1. `Tổng GMV hôm nay`: `184.500.000 đ`
      2. `Đơn hàng phát sinh`: `1.420 đơn`
      3. `Tiền Escrow đang giữ bảo vệ`: `340.000.000 đ`
      4. `Sách mới chờ duyệt bản quyền`: `18 đầu sách` (chip cảnh báo vàng)
      5. `Tranh chấp RMA cần xử lý`: `3 vụ việc` (chip cảnh báo đỏ)
  - **Bản Đồ Hoạt Động & Biểu Đồ:**
    - Biểu đồ thời gian thực (Realtime throughput chart): Hiển thị số lượng giao dịch/giây và thời gian phản hồi API Gateway.

---

### 2.2. URL: `/admin/book-moderation` (Bàn Kiểm Duyệt Bản Quyền & Nội Dung Sách)
* **Mục tiêu:** Kiểm tra giấy phép xuất bản, quyết định phát hành, mã số ISBN và nội dung file tệp số trước khi cho phép bán ra thị trường.
* **Lỗi AI cần loại bỏ:**
  - ❌ Danh sách sách duyệt hiển thị dạng card to chiếm diện tích.
  - ❌ Thiếu công cụ xem trước tài liệu trực tiếp, phải tải về máy thủ công.
* **Quy chuẩn UX Chia Đôi Màn Hình (Dual-Pane Split View):**
  - **Cột Trái (35%):** Danh sách hàng chờ kiểm duyệt (Moderation Queue) dạng bảng compact:
    - Bìa sách nhỏ 32px, Tên sách, Tác giả, Nhà xuất bản gửi duyệt, Thời gian nộp hồ sơ.
    - Phím tắt bàn phím: `J` (chuyển sách tiếp theo), `K` (sách trước đó), `A` (Phê duyệt), `R` (Từ chối).
  - **Cột Phải (65%):** Khung đối chiếu tài liệu chi tiết:
    - Tab 1: **Hồ sơ pháp lý:** Ảnh chụp Giấy phép xuất bản, Quyết định phát hành, Tra cứu mã ISBN tự động từ Cục Xuất Bản.
    - Tab 2: **Trình xem trước tệp số (PDF/EPUB Viewer tích hợp):** Xem lướt mục lục và 20 trang đầu để phát hiện nội dung vi phạm thuần phong mỹ tục hoặc đạo văn.
    - Thanh công cụ duyệt ở đáy:
      - Nút xanh: `[ Phê duyệt xuất bản (Phím A) ]`
      - Nút đỏ: `[ Từ chối kèm lý do (Phím R) ]` (hiển thị popup chọn lý do mẫu: Sai ISBN, Thiếu giấy phép, Chất lượng scan mờ, Vi phạm bản quyền).

---

### 2.3. URL: `/admin/drm-vault` (Kho Khóa Bảo Mật DRM & Giải Mã Watermark)
* **Mục tiêu:** Giám sát cụm máy chủ mã hóa khóa DRM AES-256-GCM, quản lý số lượng chứng chỉ thiết bị của người dùng, giải mã dấu vân tay số (Forensic Watermark Decoder).
* **Quy chuẩn UX:**
  - **Công Cụ Giải Mã Dấu Vết Rò Rỉ (Forensic Decoder Tool):**
    - Khung kéo thả tài liệu Ebook bị rò rỉ trên mạng hoặc dán chuỗi hash watermark được trích xuất.
    - Kết quả giải mã hiển thị trong 0.2 giây:
      - ID người dùng đã mua bản sao đó (`User ID: #4892`).
      - Tên người dùng, SĐT, Email đăng ký.
      - Địa chỉ IP lúc tải sách và thời điểm phát hành.
      - Nút hành động tức thì: `[ Đóng băng tài khoản ngay ]` và `[ Xuất báo cáo pháp lý ]`.

---

### 2.4. URL: `/admin/disputes` & `/admin/return-requests` (Bàn Trọng Tài Tranh Chấp RMA)
* **Mục tiêu:** Admin đóng vai trò quan tòa tối cao phân xử khi Người mua và Người bán không thống nhất được việc trả hàng hoàn tiền.
* **Quy chuẩn Bố Cục Ba Cột (3-Column Arbitration Desk):**
  - **Cột 1 (30%):** Bằng chứng và khiếu nại của **Người Mua** (Lý do trả hàng, ảnh chụp sách lỗi, video unbox, số tiền yêu cầu hoàn).
  - **Cột 2 (30%):** Bằng chứng đối ứng của **Người Bán** (Ảnh chụp kiện hàng trước khi giao bưu tá, phiếu cân nặng khi gửi, biên bản bàn giao bưu cục).
  - **Cột 3 (40%):** Quyết định phán quyết của **Admin**:
    - Tóm tắt giá trị tranh chấp và tiền ký quỹ Escrow đang đóng băng.
    - **Các nút phán quyết dứt điểm:**
      1. `Phán quyết 1: Hoàn tiền 100% cho Người Mua` (Người bán nhận lại hàng lỗi hoặc chịu phạt nếu cố tình gửi hàng rác).
      2. `Phán quyết 2: Bác bỏ khiếu nại - Giải phóng tiền cho Người Bán` (Người mua tráo hàng hoặc không có bằng chứng hợp lệ).
      3. `Phán quyết 3: Đền bù một phần (Partial Refund)` (Thỏa thuận chia sẻ chi phí).
    - Ô nhập ghi chú phán quyết bắt buộc để lưu vào nhật ký kiểm toán (Audit Trail).

---

### 2.5. URL: `/admin/escrow` & `/admin/finance` (Sổ Cái Dòng Tiền Ký Quỹ)
* **Mục tiêu:** Kiểm toán toàn bộ dòng tiền ký quỹ trung gian, đảm bảo tiền bán sách luôn được an toàn và tự động quyết toán đúng hạn.
* **Quy chuẩn UX:**
  - Bảng sổ cái tài chính thời gian thực: Mã giao dịch Escrow, Mã đơn hàng, Tên người mua, Tên shop, Số tiền tạm giữ, Thời điểm giải phóng dự kiến (sau 72h giao thành công), Nút can thiệp thủ công (Đóng băng tạm thời nếu phát hiện gian lận).

