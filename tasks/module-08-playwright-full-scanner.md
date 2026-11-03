# MOD-08: Robot Playwright Quét Tự Động Toàn Sàn (Automated Full-Spectrum UI/UX Scanner)

> **Mục tiêu:** Tự động hóa 100% quá trình kiểm tra toàn bộ các màn hình giao diện của sàn HUKI trên môi trường Local (`http://localhost:3100`).  
> **Cơ chế:** Dùng Playwright Headless Browser duyệt qua từng trang ở cả 3 kích thước màn hình (**Mobile 390px, Tablet 768px, Desktop 1440px**). Tự động thu thập bằng chứng lỗi (Log & Screenshot) và xuất báo cáo vào [bug-mod08.md](file:///e:/HuKi/tasks/bug-mod08.md).  
> **Trạng thái thực tế:** `ĐÃ HOÀN THÀNH QUÉT 102 ROUTES (5 BUGS ĐƯỢC TỔNG HỢP VÀO BUG-MOD08.MD)`.

---

## 1. Cơ Chế Bắt Lỗi Tự Động (Automated Defect Detectors)

- [x] **🔴 Detector 1: Bắt Lỗi Tràn Viền Ngang (Horizontal Scroll Overflow)**
  - Tự động phát hiện element làm vỡ layout: `document.documentElement.scrollWidth > window.innerWidth`.
  - **Kết quả:** Phát hiện 12 lỗi tràn viền trên Mobile (390px) và 28 lỗi tràn viền hệ thống trên Tablet (768px). Không có lỗi trên Desktop (1440px).
- [x] **🔴 Detector 2: Bắt Ảnh Chết & Tài Nguyên Lỗi 404/500 (Broken Asset Sniffer)**
  - Bắt mọi request ảnh, font, script bị 404 hoặc 500.
  - **Kết quả:** Bắt được lỗi bão request rác `GET /api/reader/bookmarks/con-duong-phia-truoc` (HTTP 404) xảy ra trên 100% các trang do `ReaderProvider` bọc ở Root Layout.
- [x] **🔴 Detector 3: Lắng Nghe Lỗi Console Ẩn (React Runtime Error Listener)**
  - Bắt lỗi đỏ của React (Hydration mismatch, Cannot read properties of undefined...).
  - **Kết quả:** Bắt được lỗi React Hydration Mismatch trên trang `/admin/maintenance` do render thời gian SSR lệch client.
- [x] **🔴 Detector 4: Chụp Ảnh Bằng Chứng (Automated Defect Screenshots)**
  - Tự động chụp và lưu ảnh bằng chứng các trang lỗi vào thư mục scratch an toàn, giữ workspace hoàn toàn sạch sẽ.

---

## 2. Kế Hoạch Quét Phân Nhóm 102 Màn Hình

| Nhóm | Số Lượng Đã Quét | Khu Vực Quét | Kết Quả Robot Ghi Nhận |
| :---: | :---: | :--- | :--- |
| **Nhóm A** | 28 Routes | Cổng Độc Giả: Trang chủ, Catalog sách, Chi tiết sách, Đọc thử Ebook, Giỏ hàng, Checkout, Lịch sử đơn hàng, Hồ sơ tài khoản, Tủ sách cá nhân. | Bị tràn viền 284px ở Tablet (768px) do Top Utility Bar; tràn viền 1092px trên mobile ở `/profile/reviews`. |
| **Nhóm B** | 25 Routes | Kênh Người Bán: Dashboard, Đăng sách (Giấy, Ebook, Hybrid), Kho hàng, Xử lý đơn, Trả hàng, Ví & Rút tiền, Khuyến mãi, Chat. | Tràn viền 4px trên form tạo Ebook/Hybrid; tràn viền 120px ở Flash Sale tablet; tràn viền 224px ở `/seller/affiliate`. |
| **Nhóm C** | 30 Routes | Kênh Quản Trị: Dashboard, Duyệt sách, Thẩm định gian hàng, Escrow, Báo cáo GMV, DRM Vault, Quản lý người dùng, Cài đặt sàn. | Đạt chuẩn responsive sạch trên 29/30 routes. Phát hiện lỗi Hydration Crash tại `/admin/maintenance`. |
| **Nhóm D** | 10 Routes | Cổng Shipper: Nhận đơn kho, Lộ trình giao hàng, Xác nhận COD, Nộp tiền đối soát, Đơn hoàn. | **100% Passed** - Layout co giãn mượt mà trên cả 3 kích thước màn hình. |
| **Nhóm E** | 9 Routes | Cổng Tiếp thị liên kết (Affiliate), Trang chính sách, Diễn đàn, Tin nhắn. | Bị tràn viền 886px trên mobile ở `/account/affiliate/links` do bảng dữ liệu thiếu bọc responsive. |

---

## 3. Quy Trình Chạy & Dọn Dẹp An Toàn (Clean Execution)
1. Robot Playwright chạy hoàn toàn độc lập thông qua script chuyên dụng trong thư mục scratch.
2. Quét xong ghi nhận toàn bộ lỗi vào **[bug-mod08.md](file:///e:/HuKi/tasks/bug-mod08.md)**.
3. Tự động đóng toàn bộ tiến trình trình duyệt, **workspace `e:\HuKi` giữ sạch 100%, không dính file rác**.
