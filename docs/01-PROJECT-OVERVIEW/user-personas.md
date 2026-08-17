# 👥 User Personas & Use Cases

Mô tả các nhóm người dùng và use cases.

## 🎯 User Personas

### 1. Guest (Khách)

**Mô tả:** Người dùng chưa đăng nhập, chỉ muốn xem nội dung công khai.

**Mục tiêu:**
- Xem danh mục sách
- Tìm kiếm sách
- Xem thông tin cửa hàng
- Đọc review/publication

**Use Cases:**
| Use Case | Description |
|----------|-------------|
| Browse Books | Xem danh sách sách, filter, sort |
| Search Books | Tìm kiếm sách theo tên, tác giả |
| View Book Detail | Xem chi tiết sách, giá, mô tả |
| View Store | Xem thông tin cửa hàng, review |
| Read Forum | Xem bài viết forum công khai |
| Sign Up | Đăng ký tài khoản mới |

---

### 2. Buyer (Người mua - USER)

**Mô tả:** Người dùng đã đăng nhập, muốn mua sách và đọc ebook.

**Mô tả chi tiết:**
- Tuổi: 18-45
- Quan tâm đến sách (học tập, giải trí)
- Có thể dùng web hoặc mobile
- Muốn trải nghiệm mua sách nhanh chóng

**Mục tiêu:**
- Mua sách vật lý và ebook
- Đọc ebook đã mua
- Theo dõi đơn hàng
- Thảo luận, đánh giá sách

**Use Cases:**

| Use Case | Description | Priority |
|----------|-------------|----------|
| Login | Đăng nhập vào hệ thống | P0 |
| Manage Profile | Cập nhật thông tin cá nhân | P1 |
| Browse Catalog | Xem, filter, tìm kiếm sách | P0 |
| Add to Cart | Thêm sách vào giỏ hàng | P0 |
| Checkout | Thanh toán đơn hàng | P0 |
| View Orders | Xem lịch sử đơn hàng | P0 |
| Track Shipping | Theo dõi trạng thái giao hàng | P1 |
| Read Ebook | Đọc ebook trong kho sách | P0 |
| Sync Progress | Đồng bộ tiến độ đọc | P1 |
| Rate & Review | Đánh giá sách và cửa hàng | P1 |
| Forum Discussion | Tham gia thảo luận | P2 |
| Chat with Seller | Nhắn tin với cửa hàng | P2 |
| Manage Favorites | Quản lý sách yêu thích | P1 |
| Apply Voucher | Sử dụng mã giảm giá | P1 |

---

### 3. Business Owner (Chủ doanh nghiệp - BUSINESS)

**Mô tả:** Người dùng sở hữu hoặc quản lý cửa hàng sách trên nền tảng.

**Mô tả chi tiết:**
- Sở hữu nhà sách hoặc là quản lý
- Cần quản lý đơn hàng, tồn kho
- Muốn tiếp cận khách hàng qua nền tảng
- Quan tâm đến đánh giá và feedback

**Mục tiêu:**
- Đăng ký và quản lý Business
- Tạo và quản lý Store
- Đăng bán sách
- Xử lý đơn hàng
- Theo dõi doanh thu

**Use Cases:**

| Use Case | Description | Priority |
|----------|-------------|----------|
| Register Business | Đăng ký doanh nghiệp với verification | P0 |
| Manage Store | Cấu hình cửa hàng | P0 |
| Add Book | Thêm sách mới vào catalog | P0 |
| Manage Inventory | Quản lý tồn kho | P0 |
| Update Book | Cập nhật thông tin sách | P1 |
| View Orders | Xem và xử lý đơn hàng | P0 |
| Process Return | Xử lý đổi trả | P1 |
| View Analytics | Xem báo cáo doanh thu | P1 |
| Manage Vouchers | Tạo và quản lý voucher | P2 |
| Reply Reviews | Phản hồi đánh giá | P2 |
| Chat with Customer | Trả lời tin nhắn khách hàng | P2 |
| Invite Members | Mời nhân viên vào Business | P1 |

**Business Roles:**

| Role | Permissions |
|------|-------------|
| OWNER | Toàn quyền quản lý Business |
| MANAGER | Quản lý orders, books, staff |
| ORDER_STAFF | Xử lý đơn hàng, đổi trả |
| CONTENT_STAFF | Quản lý sách, nội dung |

---

### 4. Delivery Staff (Nhân viên giao hàng)

**Mô tả:** Nhân viên chịu trách nhiệm giao hàng cho các đơn Physical.

**Mục tiêu:**
- Nhận và giao đơn hàng
- Cập nhật trạng thái giao hàng
- Xem lịch sử giao hàng

**Use Cases:**

| Use Case | Description | Priority |
|----------|-------------|----------|
| View Assigned Shipments | Xem đơn hàng được phân công | P0 |
| Update Status | Cập nhật trạng thái giao hàng | P0 |
| Complete Delivery | Xác nhận giao hàng thành công | P0 |
| Report Issue | Báo cáo giao hàng thất bại | P1 |

---

### 5. Platform Admin (ADMIN)

**Mô tả:** Quản trị viên nền tảng HUKI EBOOK.

**Mục tiêu:**
- Duyệt đăng ký doanh nghiệp
- Kiểm duyệt nội dung
- Quản lý người dùng
- Giám sát hệ thống

**Use Cases:**

| Use Case | Description | Priority |
|----------|-------------|----------|
| Approve Business | Duyệt/từ chối đăng ký Business | P0 |
| Suspend Business | Tạm ngưng Business vi phạm | P0 |
| Block User | Khóa tài khoản người dùng | P0 |
| Moderate Content | Kiểm duyệt Forum, Reviews | P0 |
| Manage Banners | Quản lý banner, campaign | P1 |
| View Reports | Xem báo cáo hệ thống | P1 |
| Manage Delivery Staff | Quản lý delivery staff | P1 |

---

## 📊 Use Case Diagram

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Guest  │────▶│  User   │────▶│Business │────▶│Delivery │────▶│  Admin  │
└─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
                      │                │               │
                      ▼                ▼               ▼
               ┌───────────┐    ┌───────────┐   ┌───────────┐
               │  Browse   │    │  Manage   │   │  Manage   │
               │  Books    │    │  Store    │   │  System   │
               └───────────┘    └───────────┘   └───────────┘
                      │                │               │
                      ▼                ▼               ▼
               ┌───────────┐    ┌───────────┐   ┌───────────┐
               │  Checkout │    │  Upload   │   │ Moderate  │
               │  Order    │    │  Books    │   │  Content  │
               └───────────┘    └───────────┘   └───────────┘
                      │                │               │
                      ▼                ▼               ▼
               ┌───────────┐    ┌───────────┐   ┌───────────┐
               │   Read    │    │  Handle   │   │  Approve  │
               │   Ebook   │    │  Orders   │   │ Business  │
               └───────────┘    └───────────┘   └───────────┘
```

## 🔄 User Journey Examples

### Journey 1: Mua sách vật lý

```
1. User đăng nhập
2. Browses catalog, tìm sách
3. Xem book detail, chọn format PHYSICAL
4. Add to cart
5. Tiếp tục mua thêm hoặc checkout
6. Nhập/chọn địa chỉ giao hàng
7. Chọn phương thức thanh toán
8. Thanh toán ONLINE_PAYMENT
9. Đợi webhook xác nhận
10. Order tạo thành công
11. Seller xác nhận đơn
12. Shipping tạo shipment
13. Delivery staff nhận đơn
14. Giao hàng thành công
15. User nhận hàng
16. User để lại review
```

### Journey 2: Mua và đọc ebook

```
1. User đăng nhập
2. Browses catalog
3. Tìm sách digital
4. Add to cart
5. Checkout
6. Thanh toán thành công
7. BookAccess được cấp
8. Book xuất hiện trong User Library
9. User mở ebook reader
10. Đọc sách, progress được sync
11. Đóng app, mở lại trên thiết bị khác
12. Progress được đồng bộ
13. Hoàn thành đọc
```

### Journey 3: Business đăng bán sách mới

```
1. User đăng ký Business
2. Cung cấp thông tin pháp lý
3. Hệ thống verify qua Mock Registry
4. Business ở trạng thái PENDING
5. Admin duyệt → APPROVED
6. Business tạo Store
7. Business thêm Book mới (DRAFT)
8. Upload cover, thông tin sách
9. Nếu digital: upload PDF lên R2
10. Nếu physical: thiết lập inventory
11. Publish Book → ACTIVE
12. Book xuất hiện trên catalog
```
