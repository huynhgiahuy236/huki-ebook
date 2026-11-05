# BÁO CÁO TỔNG CHỈ HUY KIỂM THỬ HỆ THỐNG TOÀN DIỆN TỪ A-Z (MASTER AUDIT REPORT)

> **Mục tiêu:** Rà soát và bóc tách toàn bộ các lỗi hiển thị, điều hướng, nút bấm và chức năng trên toàn bộ hệ thống HUKI Ebook (142 Routes giao diện + 7 Microservices Backend + Socket/Database) sau khi CI/CD hoàn tất.  
> **Nguyên tắc cốt lõi:**
> 1. Phân loại chi tiết và bóc tách thành **từng file báo cáo riêng biệt cho từng nhóm đối tượng người dùng (Personas)**.
> 2. Đi sâu đến **từng nút bấm, từng thao tác, từng màn hình**, chỉ rõ mã nguồn, hiện tượng, nguyên nhân gốc rễ và giải pháp dứt khoát duy nhất.
> 3. Tuyệt đối **không sử dụng mock data**, ưu tiên logic thực tế và tính toàn vẹn của hệ thống.
> 4. **Không tự ý sửa code** khi chưa có chỉ đạo phê duyệt cụ thể từ người dùng.

---

## 🗺️ BẢN ĐỒ TỔNG THỂ CÁC BÁO CÁO THEO TỪNG NHÓM NGƯỜI DÙNG

| Phân Hệ | Nhóm Người Dùng / Chức Năng | Số Màn Hình | Số Lỗi Phát Hiện | File Báo Cáo Kỹ Thuật Chi Tiết |
| :---: | :--- | :---: | :---: | :--- |
| **GROUP-01** | **Khách Hàng / Độc Giả (Buyer & Reader)** | 45 Routes | **15 Lỗi** | 📘 [BUG-GROUP-01-BUYER-READER.md](file:///e:/HuKi/task/bugs/BUG-GROUP-01-BUYER-READER.md) |
| **GROUP-02** | **Người Bán / Chủ Shop (Seller & Merchant)** | 48 Routes | **11 Lỗi** | 🏪 [BUG-GROUP-02-SELLER-MERCHANT.md](file:///e:/HuKi/task/bugs/BUG-GROUP-02-SELLER-MERCHANT.md) |
| **GROUP-03** | **Quản Trị Viên & Kiểm Duyệt Sàn (Admin & Mod)** | 35 Routes | **10 Lỗi** | 👑 [BUG-GROUP-03-ADMIN-MODERATOR.md](file:///e:/HuKi/task/bugs/BUG-GROUP-03-ADMIN-MODERATOR.md) |
| **GROUP-04** | **Nhân Viên Giao Hàng & Vận Chuyển (Shipper)** | 10 Routes | **6 Lỗi** | 🚚 [BUG-GROUP-04-SHIPPER-LOGISTICS.md](file:///e:/HuKi/task/bugs/BUG-GROUP-04-SHIPPER-LOGISTICS.md) |
| **GROUP-05** | **Tiếp Thị Liên Kết (Affiliate Partner & KOC)** | 9 Routes | **6 Lỗi** | 🤝 [BUG-GROUP-05-AFFILIATE-PARTNER.md](file:///e:/HuKi/task/bugs/BUG-GROUP-05-AFFILIATE-PARTNER.md) |
| **GROUP-06** | **Cộng Đồng, Chat Trực Tuyến & Bé Cáo AI** | 8 Routes | **6 Lỗi** | 💬 [BUG-GROUP-06-COMMUNITY-CHAT-AI.md](file:///e:/HuKi/task/bugs/BUG-GROUP-06-COMMUNITY-CHAT-AI.md) |
| **TỔNG CỘNG** | **Toàn Bộ Hệ Thống Sàn HUKI** | **142 Routes** | **54 Lỗi Chi Tiết** | *(Được lưu trữ độc lập trong thư mục `task/bugs/`)* |

---

## 📊 THỐNG KÊ MỨC ĐỘ NGHIÊM TRỌNG (SEVERITY MATRIX)

```
  [P0 - Blocker (Chặn đứng luồng)]:  14 lỗi (26%)  █████████▒▒▒▒▒▒▒▒▒▒▒
  [P1 - Critical (Lỗi nghiêm trọng)]: 25 lỗi (46%)  ████████████████▒▒▒▒
  [P2 - Major (Lỗi giao diện/UX)]:    15 lỗi (28%)  ██████████▒▒▒▒▒▒▒▒▒▒
  ----------------------------------------------------------------------
  TỔNG SỐ LỖI ĐƯỢC BÓC TÁCH:         54 LỖI
```

### 1. Nhóm Lỗi P0 - Blocker (Cần Ưu Tiên Xử Lý Ngay)
1. **Lỗi nút "Đọc Ngay" trong Đơn hàng (`orders/[id]` & `/orders`)**: Dẫn sang route không tồn tại `/reader/${bookId}` gây lỗi 404, độc giả đã trả tiền nhưng không thể đọc sách.
2. **Lỗi sập dịch vụ Promotion trên UAT**: Container `huki-uat-promotion-service` bị restart loop, làm tê liệt toàn bộ API Flash Sale, Voucher sàn và Banner trang chủ (HTTP 502 Bad Gateway).
3. **Lỗi nút "Xem trên sàn" của Người bán (`/seller/products`)**: Viết nhầm thành số nhiều `/books/${id}` gây 404.
4. **Lỗi nút "Xóa sách" làm sập 500**: Do vi phạm khóa ngoại bảng `order_items` trong database khi xóa vật lý.
5. **Lỗi Hardcode `http://localhost:3100` trong phân hệ Affiliate**: Sinh link tiếp thị sai domain, người dùng click từ ngoài bị lỗi mất kết nối máy chủ cục bộ.
6. **Lỗi mất kết nối WebSocket Chat thời gian thực**: Do cấu hình nhầm cổng Gateway 3000 thay vì Community Service 3005.

### 2. Nhóm Lỗi P1 - Critical (Gãy Tính Năng & Điều Hướng)
1. **16 Liên kết nội bộ bị gãy (Broken Routes)**:
   - Các nút trỏ sang `/login` thay vì `/auth/login` (tại `/library`, `/following`, `/account/affiliate/application`, `/admin/reports`).
   - Nút "Cài đặt doanh nghiệp" trỏ sang `/seller/business/settings` (không tồn tại).
   - Nút "Xem yêu cầu cập nhật" trỏ sang `/admin/business-update-requests` thay vì `/admin/business-requests`.
   - Nút "Xem đầu mối xuất bản" trỏ sang `/admin/leads` thay vì `/admin/publisher-leads`.
   - Nút "Xem shop" trỏ sang `/stores/${slug}` thay vì `/shop/${id}`.
   - Nút "Trung tâm trợ giúp" trỏ sang `/help` (không tồn tại).
2. **Nút "Đăng Lên Bảng Tin Huki" tại `/order-success`**: Nút chết hoàn toàn, không có `onClick`, không có action.
3. **Nút "Nhắn tin" với Follower tại `/seller/followers`**: Bị khóa `disabled` với badge "Sắp có", không mở được khung chat.
4. **Nút thanh toán "Ví HUKI" tại `/checkout`**: Backend từ chối do thiếu enum trong DB.
5. **Nút xác nhận giao hàng Shipper**: Không bắt buộc tải ảnh POD, gây rủi ro thất thoát COD.

### 3. Nhóm Lỗi P2 - Major (Dữ Liệu & Hiển Thị UI/UX)
1. Còn sót fallback text `"Tác giả HUKI"` cứng trong `web/src/app/shop/[id]/page.tsx` và `web/src/app/page.tsx`.
2. Khung chat Bé Cáo AI thiếu cơ chế `AbortController` timeout, bị treo cứng khi Gemini API quá tải.
3. Modal đính kèm sách trong chat bị giới hạn cứng 10 cuốn sách đầu tiên, thiếu thanh tìm kiếm cho shop có nhiều sách.

---

## 🛠️ HƯỚNG DẪN KIỂM TRA & BƯỚC TIẾP THEO

Toàn bộ 6 file báo cáo chi tiết đã được biên soạn đầy đủ và sẵn sàng để người dùng kiểm tra từng dòng:
- 📖 [Báo cáo lỗi Khách hàng & Độc giả](file:///e:/HuKi/task/bugs/BUG-GROUP-01-BUYER-READER.md)
- 🏪 [Báo cáo lỗi Người bán & Nhà xuất bản](file:///e:/HuKi/task/bugs/BUG-GROUP-02-SELLER-MERCHANT.md)
- 👑 [Báo cáo lỗi Quản trị viên & Kiểm duyệt sàn](file:///e:/HuKi/task/bugs/BUG-GROUP-03-ADMIN-MODERATOR.md)
- 🚚 [Báo cáo lỗi Nhân viên giao hàng & Vận chuyển](file:///e:/HuKi/task/bugs/BUG-GROUP-04-SHIPPER-LOGISTICS.md)
- 🤝 [Báo cáo lỗi Đối tác tiếp thị liên kết](file:///e:/HuKi/task/bugs/BUG-GROUP-05-AFFILIATE-PARTNER.md)
- 💬 [Báo cáo lỗi Cộng đồng, Chat trực tuyến & Bé Cáo AI](file:///e:/HuKi/task/bugs/BUG-GROUP-06-COMMUNITY-CHAT-AI.md)

**Theo đúng quy tắc chỉ đạo:** Tôi đã hoàn thành việc rà soát, viết báo cáo bóc tách lỗi chi tiết và **giữ nguyên mã nguồn, chưa can thiệp sửa bất kỳ file code nào**. Xin ý kiến chỉ đạo từ bạn về thứ tự ưu tiên xử lý các nhóm lỗi này!

