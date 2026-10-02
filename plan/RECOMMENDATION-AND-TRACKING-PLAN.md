# HUKI EBOOK - Kế Hoạch Triển Khai Gợi Ý Sách & Ghi Dấu Người Dùng (DB - Backend - Frontend)

## 📌 Tổng Quan
Tài liệu quy hoạch kiến trúc toàn diện cho tính năng **Ghi dấu chân người dùng (User Footprint Tracking)** và **Hệ thống gợi ý sách cá nhân hóa (Personalized Book Recommendation Engine)**.
- **Tiếp cận:** Sử dụng In-Memory Batch Buffer + PostgreSQL (cho giai đoạn hiện tại, mở rộng sang Kafka/ClickHouse khi đạt scale hàng triệu DAU).
- **Trạng thái Dữ liệu:** Đã tạo sẵn **50 cuốn sách thật chuẩn HD (10 cuốn/thể loại)** thuộc tài khoản `phuongthuy@gmail.com`.

### ⚠️ Edge Cases Đã Cân Nhắc
- **Anonymous users:** Tracking với `sessionId` tạm, không yêu cầu login
- **User delete account:** Cascade xóa footprint data (GDPR compliance)
- **Concurrent instances:** Redis-based distributed lock cho buffer flush
- **Scroll spam:** Client-side debounce/throttle ở tracker SDK

---

## 🗄️ TẦNG 1: DATABASE LAYER (Prisma & PostgreSQL `huki_analytics`)

### 1.1 Schema bổ sung trong `platform/apps/analytics-service/prisma/schema.prisma`
```prisma
// Điểm sở thích theo thể loại sách của từng người dùng
// Tách riêng viewScore và purchaseScore để đánh giá chính xác hơn
model UserCategoryAffinity {
  id                 String   @id @default(uuid())
  userId             String   @map("user_id")
  categoryId         String   @map("category_id")
  viewScore          Decimal  @default(0) @map("view_score") @db.Decimal(10, 2)   // Điểm từ view events
  purchaseScore      Decimal  @default(0) @map("purchase_score") @db.Decimal(10, 2) // Điểm từ purchase events (trọng số cao hơn)
  totalAffinintyScore Decimal @default(0) @map("total_affinity_score") @db.Decimal(10, 2) // viewScore * 0.3 + purchaseScore * 0.7
  interactionCount   Int      @default(0) @map("interaction_count")
  lastInteractedAt   DateTime @default(now()) @map("last_interacted_at")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  @@unique([userId, categoryId], name: "unique_user_category")
  @@index([userId, totalAffinintyScore(sort: Desc)])
  @@map("user_category_affinities")
}

// Điểm yêu thích theo tác giả của từng người dùng
// Tách riêng viewScore và purchaseScore để đánh giá chính xác hơn
model UserAuthorAffinity {
  id                 String   @id @default(uuid())
  userId             String   @map("user_id")
  authorId           String   @map("author_id")
  viewScore          Decimal  @default(0) @map("view_score") @db.Decimal(10, 2)
  purchaseScore      Decimal  @default(0) @map("purchase_score") @db.Decimal(10, 2)
  totalAffinintyScore Decimal @default(0) @map("total_affinity_score") @db.Decimal(10, 2)
  interactionCount   Int      @default(0) @map("interaction_count")
  lastInteractedAt   DateTime @default(now()) @map("last_interacted_at")
  createdAt          DateTime @default(now()) @map("created_at")
  updatedAt          DateTime @updatedAt @map("updated_at")

  @@unique([userId, authorId], name: "unique_user_author")
  @@index([userId, totalAffinintyScore(sort: Desc)])
  @@map("user_author_affinities")
}
```

---

## ⚙️ TẦNG 2: BACKEND LAYER (`analytics-service` & `api-gateway`)

### 2.0 Cơ Chế Đồng Bộ (Distributed Lock)
- **Redis-based Lock:** Dùng Redlock algorithm để đảm bảo chỉ 1 instance flush buffer tại 1 thời điểm
- **Lock key:** `analytics:flush:lock` với TTL 10 giây
- **Fallback:** Nếu Redis không khả dụng, fallback về single-instance (không buffer)

### 2.1 In-Memory Buffer Ingestor (`EventCollector.ts`)
- **API Endpoint:** `POST /events/batch` (nhận tối đa 50 events/lần).
- **Cơ chế:** Đẩy events vào mảng bộ nhớ đệm `RAM buffer` và phản hồi HTTP 200 ngay lập tức ($<5\text{ms}$).
- **Flush Timer:** Cứ mỗi **3 giây** (hoặc khi buffer đạt 100 events), chạy `prisma.analyticsEvent.createMany()` và kích hoạt `AffinityScoringService`.

### 2.2 Trọng số tính điểm hành vi (`AffinityScoringService.ts`)

#### 2.2.1 Trọng số cho View Events (tích lũy vào `viewScore`)
| Hành vi | Trọng số ($W_{view}$) | Ghi chú |
|---|:---:|---|
| Xem sách $>15$s (`PRODUCT_VIEW_LONG`) | **+3** | Đọc mô tả chi tiết |
| Đọc thử chương 1-2 (`READ_SAMPLE`) | **+5** | Hứng thú văn phong |
| Tìm kiếm thể loại (`SEARCH_QUERY`) | **+2** | Nhu cầu chủ động |
| Xem $<3$s rồi thoát (`BOUNCE`) | **-1** | Giảm bớt đề xuất không hợp gu |
| Theo dõi tác giả (`FOLLOW_AUTHOR`) | **+4** | Quan tâm đến phong cách viết |

#### 2.2.2 Trọng số cho Purchase Events (tích lũy vào `purchaseScore`)
| Hành vi | Trọng số ($W_{purchase}$) | Ghi chú |
|---|:---:|---|
| Mua sách / Đặt hàng (`PURCHASE_BOOK`) | **+10** | Cam kết cao nhất |
| Đọc sách / Tiến độ đọc (`READING_PROGRESS`) | **+8** | Tương tác nội dung thực tế |
| Thêm vào giỏ (`ADD_TO_CART`) | **+6** | Ý định mua cao |
| Yêu thích / Lưu (`SAVE_WISHLIST`) | **+5** | Quan tâm sản phẩm |

#### 2.2.3 Công thức tính Total Affinity Score
```
totalAffinityScore = (viewScore * 0.3) + (purchaseScore * 0.7)
```
**Giải thích:** Purchase intent weight cao hơn 2.3 lần so với view behavior.

### 2.3 Điểm Tương Tự Sách (`SimilarBooksService.ts`)
- **Cơ sở:** Cùng category + cùng author (similar to existing approach)
- **Nâng cao:** Collaborative Filtering đơn giản:
  - Lấy Top 5 users có affinity score tương tự với user hiện tại
  - Tìm các sách họ đã mua mà user hiện tại chưa mua
  - Ranking: `(so_luong_user_cung_mua * 2) + (cung_category * 1) + (cung_author * 1)`

### 2.4 Cron Job Định Kỳ (`RecalculateAffinityJob.ts`)
- **Tần suất:** Chạy mỗi ngày lúc 3:00 AM (off-peak)
- **Mục đích:** Re-calculate total affinity scores để đảm bảo accuracy
- **Logic:**
  1. Query tất cả `UserCategoryAffinity` records
  2. Recalculate: `totalAffinityScore = viewScore * 0.3 + purchaseScore * 0.7`
  3. Decay factor cho old interactions: giảm 5% mỗi tháng nếu không có tương tác mới
  4. Update batch vào DB

### 2.5 GDPR Compliance (`FootprintService.ts`)
- **Endpoint:** `DELETE /analytics/footprint/:userId`
- **Logic:**
  1. Xóa tất cả `AnalyticsEvent` của user
  2. Xóa `UserCategoryAffinity` và `UserAuthorAffinity`
  3. Trả về confirmation với timestamp

### 2.6 Endpoints Đề Xuất Sách (`routes/recommendations.ts`)
1. `GET /analytics/recommendations/for-you`
   - Lấy Top 3 `categoryId` có điểm affinity cao nhất của `userId`.
   - Query danh sách sách thuộc các danh mục này từ Database (trừ các sách đã mua).
   - **Cold Start:** Nếu user mới (chưa có điểm), ưu tiên lấy các thể loại user đã chọn trong **Onboarding** → nếu chưa có thì lấy **Bestsellers**.
2. `GET /analytics/recommendations/similar/:bookId`
   - Lấy sách tương tự cùng thể loại/tác giả cho trang chi tiết sách.
3. `DELETE /analytics/footprint/:userId` (GDPR)
   - Xóa toàn bộ footprint data của user.

---

## 💻 TẦNG 3: FRONTEND LAYER (`web`)

### 3.1 Client Tracker SDK (`web/src/lib/tracker.ts`)
- Quản lý `sessionId` ẩn danh qua `sessionStorage`.
- **Debounce/Throttle:**
  - Scroll events: debounce 500ms (không spam khi user scroll nhanh)
  - View events: throttle 1 event/5s cho cùng 1 book
- Gom nhóm các event ở Client: tự động flush sau mỗi 3 giây hoặc gom đủ 10 events.
- Sử dụng `navigator.sendBeacon` khi user tắt trình duyệt (`beforeunload`) để không bao giờ rớt event.

### 3.2 Tích hợp Tracking
- **Trang Chi Tiết Sách (`web/src/app/books/[id]/page.tsx`):** Track `PRODUCT_VIEW`, thời gian ở lại trang, và `READ_SAMPLE`.
- **Giỏ Hàng (`CartContext.tsx`):** Track `ADD_TO_CART`.
- **Tìm Kiếm (`SearchPage`):** Track `SEARCH_QUERY`.

### 3.3 Hiển thị UI Gợi Ý
- Hook: `usePersonalizedBooks()`
- Component Trang chủ: `<PersonalizedForYouSection />` hiển thị hàng sách *"✨ Dành riêng cho bạn"*.
- Component Trang chi tiết: `<SimilarBooksSection />` hiển thị *"📚 Độc giả cùng gu cũng đọc"*.

---

## 📚 TỔNG HỢP 50 CUỐN SÁCH THẬT ĐÃ TẠO (10 CUỐN / THỂ LOẠI)
**Chủ gian hàng:** `phuongthuy@gmail.com` | **Trạng thái:** `PUBLISHED`

1. **Văn học (10 cuốn):** Cây Cam Ngọt Của Tôi, Nhà Giả Kim, Hoàng Tử Bé, Chiến Binh Cầu Vồng, Tôi Thấy Hoa Vàng Trên Cỏ Xanh, Rừng Na Uy, Hai Số Phận, Điều Kỳ Diệu Ở Tiệm Tạp Hóa Namiya, Giết Con Chim Nhại, Những Người Khốn Khổ.
2. **Tâm lý & Kỹ năng (10 cuốn):** Atomic Habits, Đắc Nhân Tâm, Tâm Lý Học Về Tiền, Tư Duy Nhanh Và Chậm, Nghệ Thuật Tinh Tế Của Việc "Kệ Mẹ Nó", Deep Work, Can't Hurt Me, Khéo Ăn Nói Sẽ Có Được Thiên Hạ, Bí Mật Của May Mắn, Dám Bị Ghét.
3. **Kinh doanh & Tech (10 cuốn):** Zero To One, Khởi Nghiệp Tinh Gọn, Clean Code, Clean Architecture, Designing Data-Intensive Applications, The Pragmatic Programmer, Tỷ Phú Bán Giày, Nguyên Tắc (Ray Dalio), Trí Tuệ Nhân Tạo 2041, Marketing Giỏi Phải Kiếm Được Tiền.
4. **Tri thức & Khoa học (10 cuốn):** Sapiens – Lược Sử Loài Người, Homo Deus, 21 Bài Học Cho Thế Kỷ 21, Vũ Trụ (Cosmos), Lược Sử Thời Gian, Súng Vi Trùng Và Thép, Muôn Kiếp Nhân Sinh (Tập 1), Hành Trình Về Phương Đông, Đại Việt Sử Ký Toàn Thư, Thế Giới Phẳng.
5. **Manga & Khác (10 cuốn):** Doraemon (Tập 1), Thám Tử Lừng Danh Conan (Tập 1), One Piece (Tập 1), Dragon Ball (Tập 1), Spy x Family (Tập 1), Jujutsu Kaisen (Tập 1), Kimetsu No Yaiba (Tập 1), Your Name (Light Novel), Dế Mèn Phiêu Lưu Ký, Chuyện Con Mèo Dạy Hải Âu Bay.
