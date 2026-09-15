# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 19
## ĐÁNH GIÁ MUA HÀNG XÁC THỰC & PHẢN HỒI CỦA GIAN HÀNG (VERIFIED PURCHASE REVIEWS & SELLER REPLY)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện hệ thống đánh giá sản phẩm sách xác thực $100\%$ (Verified Purchase Reviews). Đảm bảo chỉ độc giả đã nhận hàng thành công mới được viết bài, hỗ trợ tải ảnh thực tế và video mở hộp, tự động lọc từ ngữ nhạy cảm (Profanity Filter), tự động cập nhật điểm sao trung bình (`average_rating`) ra ngoài Storefront, cung cấp tính năng phản hồi chính thức cho Nhà bán hàng và hệ sinh thái tương tác bình chọn "Hữu ích".
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `commerce-service` / `review-service`: Module `ReviewsModule`, `ReviewsService`, `ReviewsController`.
    * `catalog-service`: Cập nhật trường `average_rating` và `review_count` trên bảng `books`.
    * Prisma Schema: Bảng `book_reviews`, `review_helpful_votes`.
  * **Frontend (Storefront & Seller Portal)**:
    * `web/src/ui/components/reviews/CreateReviewModal.jsx`: Modal viết đánh giá, chọn số sao, tải nhiều ảnh & video.
    * `web/src/ui/components/reviews/BookReviewsSection.jsx`: Khối hiển thị đánh giá trên trang chi tiết sách (`BookDetailPage.jsx`) kèm bộ lọc sao và hình ảnh.
    * `web/src/ui/pages/seller/SellerReviewsPage.jsx`: Giao diện Seller xem đánh giá của khách và viết phản hồi chính thức.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 19
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  PURCHASE VALIDATOR     BACKEND APIS &         STOREFRONT UI &  TESTING SUITE &
REVIEW MODEL     & RATING ENGINE        SELLER REPLY LOGIC     SELLER DASHBOARD ANTI-SPAM AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA ĐÁNH GIÁ

### 📌 Mục tiêu:
Thiết lập bảng lưu trữ các bài đánh giá `book_reviews` và lượt bình chọn `review_helpful_votes` trên PostgreSQL.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `book_reviews`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `book_id`: UUID, Index, FK `books`.
    * `user_id`: UUID, Index, FK `users`.
    * `order_id`: UUID, Index, FK `orders`.
    * `business_id`: UUID, FK `businesses`.
    * `purchased_format`: Enum (`PHYSICAL`, `EBOOK`, `HYBRID`).
    * `rating`: Int (Check $1 \le \text{rating} \le 5$).
    * `content`: Text (Tối thiểu 10 ký tự).
    * `images`: String[] (Mảng URL ảnh).
    * `video_url`: String (Nullable).
    * `is_verified_purchase`: Boolean (Mặc định: true).
    * `seller_reply_text`: Text (Nullable).
    * `seller_replied_at`: DateTime (Nullable).
    * `helpful_count`: Int (Mặc định: 0).
    * `status`: Enum (`PUBLISHED`, `HIDDEN_VIOLATION`).
    * `created_at`, `updated_at`: DateTime.
    * Unique Index: `[order_id, book_id]`.

* **Task 1.2: Thiết kế Bảng `review_helpful_votes`**
  * Định nghĩa bảng vote:
    * `id`: UUID, Primary Key.
    * `review_id`: UUID, FK `book_reviews`.
    * `user_id`: UUID, FK `users`.
    * `created_at`: DateTime.
    * Unique Index: `[review_id, user_id]`.

---

## PHẦN 2: BỘ XÁC THỰC MUA HÀNG & THUẬT TOÁN TÍNH ĐIỂM SAO TRUNG BÌNH

### 📌 Mục tiêu:
Xác thực điều kiện đơn hàng đã hoàn tất trước khi cho phép tạo bài đánh giá và tự động tính toán lại điểm số sao.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai Module `VerifiedPurchaseGuard`**
  * Kiểm tra hợp lệ:
    1. Đơn hàng `orderId` thuộc sở hữu của `userId` hiện tại.
    2. Đơn con chứa `bookId` phải mang trạng thái `DELIVERED`.
    3. Cuốn sách đó chưa từng được đánh giá trong đơn hàng này (`[order_id, book_id]` duy nhất).

* **Task 2.2: Triển khai Thuật toán Tính Điểm Trung Bình (`RatingCalculator`)**
  * Khi có bài đánh giá mới hoặc cập nhật số sao:
    * Lấy tổng điểm và số lượng:
      $$\text{AvgRating} = \text{round}\left(\frac{\text{sum}(\text{rating})}{\text{count}(\text{reviews})}, 1\right)$$
    * Cập nhật tức thì vào bảng `books`: `average_rating = AvgRating`, `review_count = count`.

---

## PHẦN 3: PHÁT TRIỂN BACKEND APIS ĐÁNH GIÁ, PHẢN HỒI & VOTE HỮU ÍCH

### 📌 Mục tiêu:
Xây dựng các RESTful endpoints phục vụ người mua, người bán và độc giả tương tác.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: API Tạo & Chỉnh Sửa Đánh Giá (Buyer)**
  * **Endpoint**: `POST /api/v1/reviews`
  * **Body**: `{ orderId, bookId, rating: 5, content: "...", images: [...], videoUrl?: "..." }`
  * **Xử lý**: Kiểm tra qua `VerifiedPurchaseGuard`, quét bộ lọc từ ngữ thô tục (Profanity Filter), lưu CSDL và cập nhật điểm sao sách.

* **Task 3.2: API Phản Hồi Của Gian Hàng (Seller Official Reply)**
  * **Endpoint**: `POST /api/v1/seller/reviews/:id/reply`
  * **Body**: `{ replyText: "Nhã Nam xin cảm ơn bạn..." }`
  * **Xử lý**: Kiểm tra `business_id` của Seller có đúng là Shop sở hữu cuốn sách không, cập nhật `seller_reply_text` và `seller_replied_at = NOW()`.

* **Task 3.3: API Bình Chọn Hữu Ích (Helpful Vote Toggle)**
  * **Endpoint**: `POST /api/v1/reviews/:id/vote-helpful`
  * **Xử lý**: Thao tác Toggle: Nếu chưa vote &rarr; Tạo bản ghi và tăng `helpful_count += 1`; Nếu đã vote &rarr; Xóa bản ghi và giảm `helpful_count -= 1`.

---

## PHẦN 4: GIAO DIỆN ĐÁNH GIÁ STOREFRONT & QUẢN TRỊ SELLER

### 📌 Mục tiêu:
Xây dựng giao diện đánh giá chuyên nghiệp ngoài trang chi tiết sản phẩm và trang quản trị phản hồi cho Seller.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Modal Tạo Đánh Giá ([`CreateReviewModal.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/reviews/CreateReviewModal.jsx))**
  * Hàng chọn 5 ngôi sao tương tác đổi màu vàng kim.
  * Bộ tải đa ảnh (kéo thả 1 - 5 ảnh) kèm khung xem trước thu nhỏ và nút xóa ảnh.
  * Bộ tải video ngắn ($\le 30\text{s}$) xem trước.
  * Khung soạn thảo văn bản có bộ đếm ký tự (Tối thiểu 10 ký tự).

* **Task 4.2: Khối Hiển Thị Đánh Giá Trang Chi Tiết Tác Phẩm (`BookReviewsSection.jsx`)**
  * Bảng tổng quan điểm số lớn: `4.9 / 5.0 ⭐⭐⭐⭐⭐` (128 Đánh giá).
  * Bộ lọc linh hoạt: `Tất Cả`, `5 Sao`, `4 Sao`, `Có Ảnh/Video`, `Sách Giấy`, `Ebook`.
  * Thẻ đánh giá từng người dùng: Avatar, Tên (ẩn 3 ký tự đuôi `n***m`), Huy hiệu xanh 🛡 **"ĐÃ MUA HÀNG"**, Ngày đánh giá, Nội dung, Lưới ảnh phóng to được (Lightbox), Khung phản hồi lùi vào của Người Bán, Nút "👍 Hữu ích".

* **Task 4.3: Giao diện Quản Trị Đánh Giá Seller ([`SellerReviewsPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerReviewsPage.jsx))**
  * Bảng danh sách đánh giá của khách hàng về các tựa sách của gian hàng.
  * Lọc theo số sao ($1-2\star$ cần hỗ trợ gấp, $4-5\star$ khen ngợi).
  * Hộp thoại nhập phản hồi chính thức 1 chạm.

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ CHỐNG GIAN LẬN SEEDING (TEST SUITE)

### 📌 Mục tiêu:
Đảm bảo 100% đánh giá là từ người mua thật và tính toán điểm số chính xác tuyệt đối.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit & Integration Test Xác Thực Đơn Hàng**
  * Test Case tài khoản chưa mua cố tình gọi API tạo đánh giá &rarr; Xác nhận bị chặn mã 403.
  * Test Case tạo đánh giá thành công &rarr; Xác nhận điểm sao sách cập nhật đúng.
  * Test Case Shop phản hồi &rarr; Xác nhận hiển thị công khai ngoài Storefront.

* **Task 5.2: Kiểm thử Bình Chọn Hữu Ích Toggle & Bộ Lọc Đa Tiêu Chí**
  * Thao tác bấm vote/unvote &rarr; Xác nhận bộ đếm `helpful_count` tăng/giảm chính xác.
  * Lọc theo tab "Có hình ảnh" &rarr; Xác nhận chỉ hiện các đánh giá có đính kèm ảnh thực tế.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `book_reviews`, `review_helpful_votes` | ⏳ Sẵn sàng | Backend Team |
| **Purchase Guard**| Kiểm tra bắt buộc đơn `DELIVERED` & chống tạo trùng | ⏳ Sẵn sàng | Backend Team |
| **Rating Engine** | Tự động tính lại điểm sao trung bình và số lượng bài đánh giá | ⏳ Sẵn sàng | Backend Team |
| **Backend APIs** | APIs Đánh giá, Phản hồi của Seller, Vote hữu ích | ⏳ Sẵn sàng | Backend Team |
| **Frontend UI** | Giao diện `CreateReviewModal.jsx`, `BookReviewsSection.jsx` & Seller Panel | ⏳ Sẵn sàng | Frontend Team |
| **Anti-Spam Audit**| Vượt qua 100% Ma trận kiểm thử đánh giá xác thực (TC_REV_01 đến 06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 19 thuộc Nền tảng Sách Huki Ebook.*
