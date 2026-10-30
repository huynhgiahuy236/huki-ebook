# 📖 PHASE 8: TÀI SẢN SỐ EBOOK BẢN QUYỀN DRM & WEBREADER ĐỘC QUYỀN

## 🎯 Mục tiêu
Kiểm thử tính năng độc quyền cốt lõi của HuKi Ebook: Cấp quyền đọc Ebook tức thì sau khi thanh toán, bảo vệ bản quyền bằng DRM Watermark (Chữ ký số Buyer ID) và trải nghiệm đọc trên trình đọc WebReader.

---

## 🔍 Checklist Kiểm Thử Chi Tiết

### 8.1 Cấp Quyền Đọc Số (Instant License Provisioning)
- [ ] Ngay sau khi đơn hàng có sản phẩm Ebook được thanh toán thành công:
- [ ] Hệ thống cấp giấy phép số (`digital_licenses` / `user_library`).
- [ ] Cuốn sách lập tức xuất hiện trong **Tủ Sách Cá Nhân** của Buyer (`GET /api/v1/books/library/my-books`) mà không cần chờ vận chuyển vật lý.
- [ ] Kiểm tra quyền truy cập bản số: `GET /api/v1/books/{id}/access`.

### 8.2 Cơ Chế Bảo Vệ DRM & Watermark Bản Quyền
- [ ] Yêu cầu đọc sách gửi lên server: Xác thực JWT token của đúng chủ tài khoản sở hữu license.
- [ ] Server chèn Watermark động: `HuKi Ebook - Bản quyền thuộc về [User Email/Phone] - Không sao chép`.
- [ ] Ngăn chặn tải file trực tiếp hoặc in ấn trái phép nếu không có quyền.

### 8.3 Trình Đọc WebReader & Đồng Bộ Tiến Độ (Reading Sync)
- [ ] Mở trình đọc `/reader/{bookId}` tải mượt mà các trang sách (PDF/EPUB).
- [ ] Đồng bộ trang sách đang đọc dở về database (`PUT /api/v1/reader/progress`), khi mở lại sách trên thiết bị khác sẽ tự động cuộn đến đúng trang đó (`GET /api/v1/reader/progress/{bookId}`).
- [ ] Quản lý dấu trang đọc: `POST /api/v1/reader/bookmarks` và `GET /api/v1/reader/bookmarks/{bookId}`.

---

## 🛠️ Script thực thi
Script: [scripts/e2e-phase8-ebook-drm-reader.mjs](file:///e:/HuKi/scripts/e2e-phase8-ebook-drm-reader.mjs)
Lệnh chạy: `node scripts/e2e-phase8-ebook-drm-reader.mjs`
