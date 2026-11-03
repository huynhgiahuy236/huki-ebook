# MOD-08: Robot Playwright Quét Tự Động 141 Màn Hình (Automated Full-Spectrum UI/UX Scanner)

> **Mục tiêu:** Tự động hóa 100% quá trình kiểm tra toàn bộ 141 màn hình giao diện của sàn HUKI trên môi trường Local (`http://localhost:3100`).  
> **Cơ chế:** Dùng Playwright Headless Browser duyệt qua từng trang ở cả 3 kích thước màn hình (**Mobile 390px, Tablet 768px, Desktop 1440px**). Tự động thu thập bằng chứng lỗi (Log & Screenshot) và xuất báo cáo vào [bug.md](file:///e:/HuKi/tasks/bug.md).

---

## 1. Cơ Chế Bắt Lỗi Tự Động (Automated Defect Detectors)

### 🔴 Detector 1: Bắt Lỗi Tràn Viền Ngang (Horizontal Scroll Overflow)
```javascript
// Phát hiện element làm vỡ layout điện thoại
const isOverflowing = await page.evaluate(() => {
  return document.documentElement.scrollWidth > window.innerWidth;
});
```

### 🔴 Detector 2: Bắt Ảnh Chết & Tài Nguyên Lỗi 404/500 (Broken Asset Sniffer)
```javascript
// Bắt mọi request ảnh, font, script bị 404 hoặc 500
page.on('response', response => {
  if (response.status() >= 400) {
    recordBrokenAsset(response.url(), response.status());
  }
});
```

### 🔴 Detector 3: Lắng Nghe Lỗi Console Ẩn (React Runtime Error Listener)
```javascript
// Bắt lỗi đỏ của React (Hydration mismatch, Cannot read properties of undefined...)
page.on('console', msg => {
  if (msg.type() === 'error') {
    recordConsoleError(msg.text());
  }
});
page.on('pageerror', err => {
  recordPageCrash(err.message, err.stack);
});
```

### 🔴 Detector 4: Chụp Ảnh Bằng Chứng (Automated Defect Screenshots)
- Mỗi khi phát hiện trang bị lỗi vỡ layout hoặc lỗi đỏ, tự động chụp ảnh màn hình lưu vào thư mục `tasks/audit-screenshots/[tên-lỗi].png`.

---

## 2. Kế Hoạch Quét Phân Nhóm 141 Màn Hình

| Nhóm | Số Lượng Màn Hình | Khu Vực Quét |
| :---: | :---: | :--- |
| **Nhóm A** | 45 Màn hình | Trang chủ, Catalog sách, Chi tiết sách, Đọc thử Ebook, Giỏ hàng, Checkout, Lịch sử đơn hàng, Tủ sách cá nhân, Hồ sơ tài khoản. |
| **Nhóm B** | 35 Màn hình | Kênh Người Bán: Dashboard, Đăng sách (Giấy, Ebook, Hybrid), Kho hàng, Xử lý đơn, Trả hàng, Ví & Rút tiền, Khuyến mãi, Chat. |
| **Nhóm C** | 33 Màn hình | Kênh Quản Trị: Dashboard, Duyệt sách, Thẩm định gian hàng, Escrow, Phân xử tranh chấp, Báo cáo GMV, DRM Vault, Quản lý người dùng. |
| **Nhóm D** | 10 Màn hình | Cổng Shipper: Nhận đơn kho, Lộ trình giao hàng, Xác nhận COD, Nộp tiền đối soát, Đơn hoàn. |
| **Nhóm E** | 18 Màn hình | Cổng Tiếp thị liên kết (Affiliate), Trang chính sách, Diễn đàn, Tin nhắn. |

---

## 3. Quy Trình Chạy & Dọn Dẹp An Toàn (Clean Execution)
1. Robot chạy hoàn toàn độc lập thông qua script Node.js / Playwright chuyên dụng.
2. Quét xong ghi nhận toàn bộ lỗi vào bảng theo dõi.
3. Tự động dọn dẹp các tiến trình trình duyệt tạm, **tuyệt đối không làm thay đổi hay hư hại code nguồn dự án**.

