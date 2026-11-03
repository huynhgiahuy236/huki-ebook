# Task 02: Tự Động Quét Lỗi Giao Diện & Responsive (Playwright UI/UX Audit)

> **Mục tiêu:** Sử dụng Playwright Automation chạy quét tự động toàn bộ giao diện hệ thống trên Local (`http://localhost:3100`), phát hiện 100% các lỗi vỡ layout, tràn màn hình ngang, lỗi font, ảnh hỏng và lỗi console của React. Sau khi quét xong tự động dọn dẹp không làm ảnh hưởng mã nguồn.

---

## 1. Cấu hình kiểm thử đa màn hình (Multi-Viewport Matrix)
- 📱 **Mobile Phone (390 x 844 px):** Giả lập iPhone 14 / Safari & Chrome Mobile.
- 📱 **Tablet (768 x 1024 px):** Giả lập iPad Mini / Portrait & Landscape.
- 💻 **Desktop Chuẩn (1440 x 900 px):** Màn hình máy tính xách tay & màn hình rộng.

---

## 2. Danh mục 5 nhóm lỗi UI/UX được máy tự động bắt (Automated Checks)

### Nhóm 1: Lỗi Tràn Màn Hình Ngang (Horizontal Scroll Overflow)
- **Cơ chế:** Kiểm tra thuộc tính `document.documentElement.scrollWidth > window.innerWidth` trên từng trang ở kích thước Mobile.
- **Mục tiêu:** Tìm ra chính xác phần tử HTML nào có `width` cố định (ví dụ `w-[600px]`, `min-w-full`, bảng rộng) làm vỡ giao diện điện thoại.

### Nhóm 2: Lỗi Tài nguyên chết (Broken Assets & 404s)
- **Cơ chế:** Lắng nghe toàn bộ network response của trình duyệt.
- **Mục tiêu:** Bắt tất cả các file ảnh (`.png`, `.jpg`, `.svg`, `.webp`), font (`.woff2`), script `.js` trả về status `404 Not Found` hoặc `500 Internal Error`.

### Nhóm 3: Lỗi Runtime Console & Hydration Mismatch
- **Cơ chế:** Lắng nghe sự kiện `page.on('console', msg => ...)` và `page.on('pageerror', err => ...)`.
- **Mục tiêu:**
  - Bắt các lỗi đỏ của React (Hydration Mismatch giữa server và client).
  - Bắt các lỗi `TypeError: Cannot read properties of undefined`.
  - Bắt các cảnh báo `Warning: Each child in a list should have a unique "key" prop`.

### Nhóm 4: Lỗi Phần tử Tương tác (Interactive Obstruction)
- **Cơ chế:** Kiểm tra tọa độ click và bounding box của các nút chính (Nút Mua ngay, Nút Đăng ký, Nút Thêm giỏ hàng, Nút Xác nhận).
- **Mục tiêu:** Phát hiện các trường hợp nút bị `z-index` thấp che khuất, bị dính dưới bottom bar hoặc thanh điều hướng.

### Nhóm 5: Tính khả dụng & Hiển thị Tiếng Việt (Typography & Contrast)
- Kiểm tra các text tiếng Việt bị lỗi font (tofu character `□` hoặc font fallback chữ to chữ nhỏ).
- Kiểm tra text màu xám nhạt trên nền trắng không đủ độ tương phản theo chuẩn WCAG AA.

---

## 3. Danh sách các màn hình cần quét (Audit Route Scope)

### Cổng Người dùng & Khách (Public & Buyer)
- [ ] Trang chủ (`/`)
- [ ] Trang tìm kiếm & danh mục sách (`/books`)
- [ ] Trang chi tiết sách (`/book/[id]`)
- [ ] Trang Flash Sale (`/flash-sale`)
- [ ] Trang Tủ sách cá nhân (`/library`)
- [ ] Bộ đọc sách Ebook (`/reader`)
- [ ] Giỏ hàng (`/cart`) & Trang thanh toán (`/checkout`)
- [ ] Trang Quản lý tài khoản (`/profile`, `/orders`, `/messages`)
- [ ] Cổng đăng ký / đăng nhập (`/auth/login`, `/auth/register`, `/auth/forgot-password`)

### Cổng Quản lý Gian hàng (Seller Portal)
- [ ] Trang tổng quan doanh số (`/seller/dashboard`)
- [ ] Danh sách sản phẩm (`/seller/products`)
- [ ] Form tạo sách mới (`/seller/product/create`, `/seller/product/create-ebook`)
- [ ] Quản lý đơn hàng (`/seller/orders`)
- [ ] Tài chính & Rút tiền ví (`/seller/finance`, `/seller/wallet`)
- [ ] Cài đặt gian hàng (`/seller/stores`, `/seller/stores/setup`)

### Cổng Quản trị Viên (Admin Portal)
- [ ] Bảng điều khiển quản trị (`/admin/dashboard`)
- [ ] Duyệt ấn phẩm sách (`/admin/book-moderation`)
- [ ] Quản lý người dùng & tài khoản (`/admin/users`, `/admin/accounts`)
- [ ] Quản lý đơn hàng & Escrow ký quỹ (`/admin/finance`, `/admin/escrow`)

### Cổng Giao hàng (Shipper Portal)
- [ ] Trang đăng nhập Shipper (`/shipper/login`)
- [ ] Danh sách đơn cần lấy (`/shipper/available-orders`)
- [ ] Lịch sử giao hàng & Đối soát COD (`/shipper/remit-cod`)

