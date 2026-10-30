# 📘 PHASE 1: KHÁM PHÁ SẢN PHẨM, TÌM KIẾM & XEM CHI TIẾT SÁCH (BUYER DISCOVERY)

## 🎯 Mục tiêu
Kiểm thử toàn diện hành trình đầu tiên của khách mua hàng (Buyer) từ trang chủ, tìm kiếm, lọc sách đến xem trang chi tiết và trang Gian hàng NXB/Shop.

---

## 🔍 Checklist Kiểm Thử Chi Tiết (Không Mock Data)

### 1.1 Khám phá Trang Chủ (Storefront Discovery)
- [ ] `GET /api/v1/categories/tree`: Trả về đúng danh sách danh mục đa tầng từ database.
- [ ] `GET /api/v1/books?limit=24`: Trả về danh sách sách thật, có đầy đủ các trường: `title`, `price`, `cover`, `author`, `publisher`, `format`.
- [ ] `GET /api/v1/flash-sales/active`: Kiểm tra Flash Sale đang hoạt động, có danh sách sách giảm giá hợp lệ và thời gian đếm ngược.
- [ ] `GET /api/v1/authors?limit=8`: Danh sách tác giả thật từ cơ sở dữ liệu.
- [ ] `GET /api/v1/publishers?limit=6`: Danh sách NXB / Đối tác thật.

### 1.2 Tìm kiếm & Bộ Lọc Nâng Cao (Search & Faceted Filters - Chuẩn Shopee)
- [ ] `GET /api/v1/books?search=Kinh` hoặc `GET /api/v1/catalog/search?q=Kinh`: Tìm kiếm từ khóa theo tên sách, trả về danh sách có liên quan.
- [ ] `GET /api/v1/books?categoryId={id}`: Lọc theo danh mục cụ thể.
- [ ] `GET /api/v1/books?format=DIGITAL` hoặc `format=PHYSICAL`: Lọc chính xác theo định dạng Sách giấy / Ebook DRM.
- [ ] `GET /api/v1/books?minPrice=50000&maxPrice=200000`: Lọc theo khoảng giá.
- [ ] `GET /api/v1/books?sort=price_asc` hoặc `sort=price_desc`: Sắp xếp theo giá tăng dần/giảm dần.

### 1.3 Trang Chi Tiết Sách (Product Detail Page)
- [ ] `GET /api/v1/books/{id}`: Lấy thông tin chi tiết một cuốn sách cụ thể bằng ID thật.
- [ ] Kiểm tra tính toàn vẹn thông tin:
  - Giá Sách Giấy vs Giá Ebook vs Giá Combo Hybrid.
  - Số lượng tồn kho thật (`inventoryQuantity` hoặc `stock`).
  - Tên tác giả, Nhà xuất bản, Giới thiệu nội dung, Mục lục (nếu có).
  - Đánh giá trung bình và số lượt đánh giá thật.
- [ ] `GET /api/v1/books/{id}/reviews`: Danh sách đánh giá & bình luận thực tế từ độc giả.

### 1.4 Trang Gian Hàng Người Bán / NXB (Storefront Page)
- [ ] `GET /api/v1/stores/{slug}` hoặc `GET /api/v1/publishers/{id}`: Thông tin hồ sơ gian hàng (Tên shop, avatar, số người theo dõi, số lượng sách).
- [ ] Danh sách sách thuộc riêng gian hàng đó.

---

## 🛠️ Script thực thi
Script: [scripts/e2e-phase1-discovery.mjs](file:///e:/HuKi/scripts/e2e-phase1-discovery.mjs)
Lệnh chạy: `node scripts/e2e-phase1-discovery.mjs`
