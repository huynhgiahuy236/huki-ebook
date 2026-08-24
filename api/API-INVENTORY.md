# HUKI EBOOK - API Inventory

> Thống kê tất cả APIs trong hệ thống
> Generated: 2026-08-24
> Branch: develop

---

## 📊 TỔNG QUAN

| Service | Controllers | Endpoints | Hoàn thiện |
|---------|-------------|-----------|------------|
| Identity Service | 3 | 15 | ✅ ~95% |
| Business Service | 3 | 18 | ✅ ~90% |
| Commerce Service | 11 | 45 | ✅ ~85% |
| Shipping Service | 4 | 12 | ✅ ~80% |
| Community Service | 5 | 35 | ✅ ~85% |
| Promotion Service | 3 | 18 | ✅ ~75% |
| **TỔNG** | **29** | **143** | **~85%** |

---

## 🎯 LEGEND

| Symbol | Ý nghĩa |
|--------|----------|
| ✅ | Hoàn thành, có code + test |
| 🟡 | Có code nhưng chưa test kỹ |
| 🔧 | Đang phát triển |
| ❌ | Chưa có code |
| 📋 | Cần tài liệu chi tiết |

---

## 1️⃣ IDENTITY SERVICE

**Base Path:** `/api/identity`

### 1.1 Auth Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/auth/register` | Đăng ký tài khoản mới | ✅ |
| POST | `/auth/login` | Đăng nhập | ✅ |
| POST | `/auth/logout` | Đăng xuất | ✅ |
| POST | `/auth/logout-all` | Đăng xuất tất cả thiết bị | ✅ |
| POST | `/auth/refresh` | Làm mới token | ✅ |
| GET | `/auth/me` | Lấy thông tin user hiện tại | ✅ |
| POST | `/auth/forgot-password` | Quên mật khẩu | ✅ |
| POST | `/auth/reset-password` | Đặt lại mật khẩu | ✅ |
| PATCH | `/auth/change-password` | Đổi mật khẩu | ✅ |

### 1.2 User Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/users/profile` | Lấy profile | ✅ |
| PATCH | `/users/profile` | Cập nhật profile | ✅ |

### 1.3 Session Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/sessions` | Lấy tất cả sessions | ✅ |
| DELETE | `/sessions/:sessionId` | Xóa 1 session | ✅ |
| DELETE | `/sessions` | Xóa tất cả sessions | ✅ |

**Identity Service:** ✅ ~95% hoàn thành

---

## 2️⃣ BUSINESS SERVICE

**Base Path:** `/api/business`

### 2.1 Business Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/businesses` | Đăng ký doanh nghiệp | ✅ |
| GET | `/businesses/my` | Lấy doanh nghiệp của tôi | ✅ |
| GET | `/businesses/:id` | Lấy doanh nghiệp theo ID | ✅ |
| GET | `/businesses` | Danh sách doanh nghiệp (public) | ✅ |
| PATCH | `/businesses/:id` | Cập nhật doanh nghiệp | ✅ |
| POST | `/businesses/:id/approve` | Duyệt doanh nghiệp (admin) | ✅ |
| POST | `/businesses/:id/reject` | Từ chối doanh nghiệp (admin) | ✅ |

### 2.2 Store Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/stores` | Tạo cửa hàng | ✅ |
| GET | `/stores/my` | Lấy cửa hàng của tôi | ✅ |
| GET | `/stores` | Danh sách cửa hàng (public) | ✅ |
| GET | `/stores/:id` | Lấy cửa hàng theo ID | ✅ |
| GET | `/stores/slug/:slug` | Lấy cửa hàng theo slug | ✅ |
| PATCH | `/stores/:id` | Cập nhật cửa hàng | ✅ |
| DELETE | `/stores/:id` | Xóa cửa hàng | ✅ |
| POST | `/stores/:id/approve` | Duyệt cửa hàng (admin) | ✅ |
| POST | `/stores/:id/reject` | Từ chối cửa hàng (admin) | ✅ |

### 2.3 Member Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/businesses/:businessId/members/invite` | Mời thành viên | ✅ |
| POST | `/invitations/accept` | Chấp nhận lời mời | ✅ |
| GET | `/businesses/:businessId/members` | Danh sách thành viên | ✅ |
| GET | `/businesses/:businessId/members/:memberId` | Lấy 1 thành viên | ✅ |
| PATCH | `/businesses/:businessId/members/:memberId/role` | Cập nhật vai trò | ✅ |
| DELETE | `/businesses/:businessId/members/:memberId` | Xóa thành viên | ✅ |
| POST | `/businesses/:businessId/leave` | Rời doanh nghiệp | ✅ |

**Business Service:** ✅ ~90% hoàn thành

---

## 3️⃣ COMMERCE SERVICE

**Base Path:** `/api/commerce`

### 3.1 Books Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/books` | Danh sách sách (public) | ✅ |
| GET | `/books/slug/:slug` | Lấy sách theo slug | 🟡 |
| GET | `/books/:id` | Lấy sách theo ID | 🟡 |
| POST | `/books` | Tạo sách mới (seller) | ✅ |
| PATCH | `/books/:id` | Cập nhật sách (seller) | ✅ |
| DELETE | `/books/:id` | Xóa sách mềm (seller) | ✅ |

### 3.2 Book Publishing Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/books/:bookId/publish` | Xuất bản sách | ✅ |
| POST | `/books/:bookId/hide` | Ẩn sách | ✅ |
| POST | `/books/:bookId/archive` | Lưu trữ sách | ✅ |
| POST | `/books/:bookId/suspend` | Tạm ngưng sách (admin) | ✅ |

### 3.3 Book Physical Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/books/:bookId/physical` | Lấy chi tiết vật lý | ✅ |
| PATCH | `/books/:bookId/physical` | Cập nhật chi tiết vật lý | ✅ |
| PATCH | `/books/:bookId/inventory` | Cập nhật tồn kho | ✅ |

### 3.4 Book Digital Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/books/:bookId/digital` | Lấy chi tiết số | ✅ |
| PATCH | `/books/:bookId/digital` | Cập nhật chi tiết số | ✅ |

### 3.5 Book Uploads Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/books/:bookId/cover` | Upload ảnh bìa | ✅ |
| POST | `/books/:bookId/file` | Upload file PDF gốc | ✅ |
| POST | `/books/:bookId/preview` | Upload file PDF preview | ✅ |

### 3.6 Cart Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/cart` | Lấy giỏ hàng | ✅ |
| POST | `/cart/items` | Thêm vào giỏ | ✅ |
| PATCH | `/cart/items/:itemId` | Cập nhật số lượng | ✅ |
| DELETE | `/cart/items/:itemId` | Xóa khỏi giỏ | ✅ |
| DELETE | `/cart` | Xóa toàn bộ giỏ | ✅ |

### 3.7 Checkout Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/cart/checkout/preview` | Xem trước checkout | 🟡 |
| POST | `/cart/checkout/confirm` | Xác nhận checkout | 🟡 |

### 3.8 Orders Controller (Buyer)

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/orders` | Danh sách đơn hàng | ✅ |
| GET | `/orders/:id` | Chi tiết đơn hàng | ✅ |
| GET | `/orders/:id/tracking` | Theo dõi đơn hàng | ✅ |
| GET | `/orders/:id/history` | Lịch sử đơn hàng | ✅ |
| POST | `/orders/:id/cancel` | Hủy đơn hàng | ✅ |

### 3.9 Seller Orders Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/seller/orders` | Danh sách đơn bán (seller) | ✅ |
| GET | `/seller/orders/:id` | Chi tiết đơn bán | ✅ |
| PATCH | `/seller/orders/:id/confirm` | Xác nhận đơn | ✅ |
| PATCH | `/seller/orders/:id/prepare` | Bắt đầu chuẩn bị | ✅ |
| PATCH | `/seller/orders/:id/ship` | Giao hàng | ✅ |
| PATCH | `/seller/orders/:id/deliver` | Đã giao | ✅ |
| PATCH | `/seller/orders/:id/cancel` | Hủy đơn | ✅ |

### 3.10 Payments Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/payments/orders/:orderId/initiate` | Khởi tạo thanh toán | 🟡 |
| GET | `/payments/orders/:orderId` | Trạng thái thanh toán | 🟡 |
| POST | `/payments/orders/:orderId/refunds` | Yêu cầu hoàn tiền | 🟡 |
| POST | `/payments/refunds/:refundId/settle` | Xử lý hoàn tiền (admin) | 🟡 |
| POST | `/payments/webhooks/payos` | Webhook PayOS | ✅ |

### 3.11 Categories Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/categories` | Danh sách danh mục | ✅ |
| GET | `/categories/tree` | Cây danh mục | ✅ |
| GET | `/categories/:id` | Chi tiết danh mục | ✅ |
| POST | `/categories` | Tạo danh mục (admin) | ✅ |
| PATCH | `/categories/:id` | Cập nhật danh mục (admin) | ✅ |
| DELETE | `/categories/:id` | Xóa danh mục (admin) | ✅ |

### 3.12 Authors Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/authors` | Danh sách tác giả | ✅ |
| GET | `/authors/:id` | Chi tiết tác giả | ✅ |
| POST | `/authors` | Tạo tác giả (admin) | ✅ |
| PATCH | `/authors/:id` | Cập nhật tác giả (admin) | ✅ |
| DELETE | `/authors/:id` | Xóa tác giả (admin) | ✅ |

### 3.13 Publishers Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/publishers` | Danh sách nhà xuất bản | ✅ |
| GET | `/publishers/:id` | Chi tiết nhà xuất bản | ✅ |
| POST | `/publishers` | Tạo nhà xuất bản (admin) | ✅ |
| PATCH | `/publishers/:id` | Cập nhật nhà xuất bản (admin) | ✅ |
| DELETE | `/publishers/:id` | Xóa nhà xuất bản (admin) | ✅ |

### 3.14 Catalog Search Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/catalog/search` | Tìm kiếm toàn văn | 🟡 |

**Commerce Service:** ✅ ~85% hoàn thành

---

## 4️⃣ SHIPPING SERVICE

**Base Path:** `/api/shipping`

### 4.1 Shipments Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/shipments` | Danh sách vận đơn | ✅ |
| GET | `/shipments/tracking/:trackingNumber` | Theo dõi vận đơn | ✅ |
| PATCH | `/shipments/:id/status` | Cập nhật trạng thái | ✅ |
| GET | `/shipments/:id` | Chi tiết vận đơn | ✅ |

### 4.2 Internal Shipments Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/internal/shipments/from-order` | Tạo vận đơn từ đơn hàng | ✅ |
| POST | `/internal/shipments/:sellerOrderId/cancel` | Hủy vận đơn | ✅ |

### 4.3 Shipping Controller (Public)

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/shipping/fee` | Tính phí ship | ✅ |

### 4.4 GHTK Callback Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/callbacks/ghtk` | Webhook GHTK | ✅ |

### 4.5 Addresses Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/shipping/address` | Danh sách địa chỉ | ✅ |
| POST | `/shipping/address` | Tạo địa chỉ | ✅ |
| PATCH | `/shipping/address/:id` | Cập nhật địa chỉ | ✅ |
| DELETE | `/shipping/address/:id` | Xóa địa chỉ | ✅ |

### 4.6 Delivery Staff Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/delivery-staff` | Tạo nhân viên giao hàng | ✅ |
| GET | `/delivery-staff` | Danh sách nhân viên | ✅ |
| PATCH | `/delivery-staff/:id` | Cập nhật nhân viên | ✅ |
| POST | `/shipments/:id/assign` | Gán vận đơn cho nhân viên | ✅ |

**Shipping Service:** ✅ ~80% hoàn thành

---

## 5️⃣ COMMUNITY SERVICE

**Base Path:** `/api/community`

### 5.1 Forum Posts Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/forum/posts` | Danh sách bài viết | ✅ |
| GET | `/forum/posts/popular` | Bài viết phổ biến | ✅ |
| GET | `/forum/posts/:id` | Chi tiết bài viết | ✅ |
| GET | `/forum/posts/:id/comments` | Bình luận của bài viết | ✅ |
| POST | `/forum/posts` | Tạo bài viết | ✅ |
| PATCH | `/forum/posts/:id` | Cập nhật bài viết | ✅ |
| DELETE | `/forum/posts/:id` | Xóa bài viết | ✅ |
| POST | `/forum/posts/:id/like` | Thích bài viết | ✅ |
| DELETE | `/forum/posts/:id/like` | Bỏ thích | ✅ |
| POST | `/forum/posts/:id/comments` | Thêm bình luận | ✅ |

### 5.2 Forum Comments Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/forum/comments/:id/replies` | Trả lời bình luận | ✅ |
| DELETE | `/forum/comments/:id` | Xóa bình luận | ✅ |
| POST | `/forum/comments/:id/like` | Thích bình luận | ✅ |
| DELETE | `/forum/comments/:id/like` | Bỏ thích | ✅ |

### 5.3 Forum Categories Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/forum/categories` | Danh sách danh mục | ✅ |

### 5.4 Reviews Controller

#### Book Reviews
| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/books/:id/reviews` | Danh sách đánh giá sách | ✅ |
| POST | `/books/:id/reviews` | Tạo đánh giá sách | ✅ |

#### Store Reviews
| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/stores/:id/reviews` | Danh sách đánh giá cửa hàng | ✅ |
| POST | `/stores/:id/reviews` | Tạo đánh giá cửa hàng | ✅ |

#### Reviews Management
| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| PATCH | `/reviews/:id` | Cập nhật đánh giá | ✅ |
| DELETE | `/reviews/:id` | Xóa đánh giá | ✅ |
| POST | `/reviews/:id/helpful` | Đánh dấu hữu ích | ✅ |
| DELETE | `/reviews/:id/helpful` | Bỏ đánh dấu | ✅ |
| POST | `/reviews/:id/reply` | Trả lời đánh giá | ✅ |

### 5.5 Chat Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/chat/conversations` | Danh sách cuộc trò chuyện | ✅ |
| POST | `/chat/conversations` | Tạo cuộc trò chuyện | ✅ |
| GET | `/chat/conversations/:id` | Chi tiết cuộc trò chuyện | ✅ |
| GET | `/chat/conversations/:id/messages` | Tin nhắn cuộc trò chuyện | ✅ |
| POST | `/chat/conversations/:id/messages` | Gửi tin nhắn | ✅ |
| PATCH | `/chat/conversations/:id/read` | Đánh dấu đã đọc | ✅ |
| POST | `/chat/conversations/:id/close` | Đóng cuộc trò chuyện | ✅ |

### 5.6 Notifications Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/notifications` | Danh sách thông báo | ✅ |
| GET | `/notifications/:id` | Chi tiết thông báo | ✅ |
| PATCH | `/notifications/:id/read` | Đánh dấu đã đọc | ✅ |
| DELETE | `/notifications/:id` | Xóa thông báo | ✅ |
| POST | `/notifications/read-all` | Đọc tất cả | ✅ |
| DELETE | `/notifications/clear-all` | Xóa tất cả | ✅ |
| GET | `/notifications/settings` | Cài đặt thông báo | ✅ |
| PATCH | `/notifications/settings` | Cập nhật cài đặt | ✅ |
| POST | `/notifications/device` | Đăng ký thiết bị | ✅ |
| DELETE | `/notifications/device/:token` | Xóa thiết bị | ✅ |

### 5.7 Reports Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/forum/posts/:id/report` | Báo cáo bài viết | ✅ |
| POST | `/forum/comments/:id/report` | Báo cáo bình luận | ✅ |
| POST | `/reviews/:id/report` | Báo cáo đánh giá | ✅ |

### 5.8 Admin Moderation Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/admin/moderation/reports` | Danh sách báo cáo | ✅ |
| GET | `/admin/moderation/reports/:id` | Chi tiết báo cáo | ✅ |
| PATCH | `/admin/moderation/reports/:id/review` | Bắt đầu xem xét | ✅ |
| PATCH | `/admin/moderation/reports/:id/resolve` | Giải quyết báo cáo | ✅ |
| GET | `/admin/moderation/queue` | Hàng đợi kiểm duyệt | ✅ |
| PATCH | `/admin/moderation/content/:targetType/:id` | Kiểm duyệt nội dung | ✅ |

**Community Service:** ✅ ~85% hoàn thành

---

## 6️⃣ PROMOTION SERVICE

**Base Path:** `/api/promotion`

### 6.1 Vouchers Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/vouchers` | Tạo voucher (admin) | ✅ |
| GET | `/vouchers` | Danh sách vouchers | ✅ |
| GET | `/vouchers/:id` | Chi tiết voucher | ✅ |
| GET | `/vouchers/code/:code` | Tìm voucher theo code | ✅ |
| PATCH | `/vouchers/:id` | Cập nhật voucher (admin) | ✅ |
| DELETE | `/vouchers/:id` | Xóa voucher (admin) | ✅ |
| POST | `/vouchers/validate` | Kiểm tra voucher | 🟡 |

### 6.2 Banners Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/banners` | Tạo banner | ✅ |
| GET | `/banners` | Danh sách banners | ✅ |
| GET | `/banners/active` | Banners đang hoạt động | ✅ |
| GET | `/banners/:id` | Chi tiết banner | ✅ |
| PATCH | `/banners/:id` | Cập nhật banner | ✅ |
| DELETE | `/banners/:id` | Xóa banner | ✅ |

### 6.3 Flash Sales Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| POST | `/flash-sales` | Tạo flash sale (admin) | ✅ |
| GET | `/flash-sales` | Danh sách flash sales | ✅ |
| GET | `/flash-sales/active` | Flash sales đang hoạt động | ✅ |
| GET | `/flash-sales/items` | Danh sách sản phẩm flash sale | ✅ |
| GET | `/flash-sales/price/:bookId` | Giá flash sale của sách | 🟡 |
| GET | `/flash-sales/:id` | Chi tiết flash sale | ✅ |
| POST | `/flash-sales/items` | Thêm sản phẩm vào flash sale | ✅ |
| PATCH | `/flash-sales/:id/status` | Cập nhật trạng thái | ✅ |
| PATCH | `/flash-sales/items/:itemId/stock` | Cập nhật tồn kho | ✅ |
| DELETE | `/flash-sales/:id` | Xóa flash sale | ✅ |

**Promotion Service:** ✅ ~75% hoàn thành

---

## 7️⃣ API GATEWAY

### 7.1 Health Controller

| Method | Endpoint | Mô tả | Status |
|--------|----------|--------|--------|
| GET | `/health` | Health check | ✅ |

---

## 📋 TODOs & IMPROVEMENTS

### High Priority

| # | Task | Service | Status |
|---|------|---------|--------|
| 1 | Thêm unit tests cho Cart, Checkout | Commerce | ❌ |
| 2 | Thêm integration tests cho Payments | Commerce | ❌ |
| 3 | Thêm validation DTOs cho Flash Sales | Promotion | ❌ |
| 4 | Thêm subscription APIs | Commerce | 🔧 |

### Medium Priority

| # | Task | Service | Status |
|---|------|---------|--------|
| 1 | Thêm file upload validation | Commerce | ❌ |
| 2 | Thêm search với Elasticsearch | Commerce | ❌ |
| 3 | Thêm real-time notifications (WebSocket) | Community | 🔧 |

### Low Priority

| # | Task | Service | Status |
|---|------|---------|--------|
| 1 | Thêm API versioning | All | ❌ |
| 2 | Thêm rate limiting tùy chỉnh | All | ❌ |
| 3 | Thêm API analytics | All | ❌ |

---

## 📁 FILES GENERATED

- File này: `api/API-INVENTORY.md`
- Thư mục: `api/`

## 🔄 UPDATE LOG

| Date | Change |
|------|--------|
| 2026-08-24 | Initial version |

---

*Generated by Claude Code*
