# ĐẶC TẢ TÍNH NĂNG & KẾ HOẠCH TRIỂN KHAI: NÂNG CẤP PHÂN HỆ FLASH SALE V2 (PLATFORM & SHOPS FLASH SALE)

> **Tài liệu quy chuẩn yêu cầu, kiến trúc kỹ thuật và kế hoạch thực hiện chi tiết cho phân hệ Flash Sale V2**  
> **Dự án:** HUKI EBOOK Platform  
> **Vị trí tài liệu:** `platform/require_feature/flash_sale_v2.md`  
> **Trạng thái:** Tài liệu quy chuẩn chuẩn bị thực hiện (Specification & Implementation Plan)  

---

## I. TỔNG QUAN YÊU CẦU NGHIỆP VỤ (BUSINESS REQUIREMENTS)

### 1. Phân định nguồn gốc & Phạm vi Flash Sale
Hệ thống HUKI EBOOK duy trì phân định rõ ràng 2 phạm vi tổ chức Flash Sale:
* **Huki Flash Sale (Sàn tổ chức - `scope = PLATFORM`):** Các sự kiện khuyến mãi giờ vàng toàn sàn do Ban Quản Trị Sàn (Admin) khởi tạo, tài trợ và điều phối các Cửa hàng (Sellers) đăng ký tham gia.
* **Shops Flash Sale (Cửa hàng tự tổ chức - `scope = SHOP`):** Các đợt Flash Sale do từng Shop tự khởi tạo, thiết lập giá bán và quota sách trong phạm vi gian hàng của mình.

---

### 2. Quy chuẩn chi tiết: Flash Sale do Sàn tổ chức (`scope = PLATFORM`)

#### A. Thiết lập bộ 4 mốc thời gian của Sàn:
Khi Admin thiết lập một khung giờ Flash Sale mới toàn sàn, form cấu hình bắt buộc bao gồm 4 mốc thời gian rõ ràng:
1. **Thời gian bắt đầu mở đăng ký (`registrationStartsAt`):** Thời điểm Sàn chính thức mở cổng thông báo và cho phép các Cửa hàng (Sellers) chọn sách trong kho để nộp đăng ký tham gia.
2. **Thời gian kết thúc đăng ký (`registrationEndsAt`):** Thời điểm Sàn đóng cổng đăng ký. Sau mốc này, Seller không thể đăng ký thêm hoặc sửa sách tham gia.
3. **Thời gian bắt đầu áp dụng / Mở bán (`startsAt`):** Thời điểm bắt đầu mở bán giảm giá cho người mua trên toàn sàn.
   - **Ràng buộc cứng:** `startsAt` phải sau `registrationEndsAt` **ít nhất 2 phút** (`startsAt >= registrationEndsAt + 2 phút`). Khoảng thời gian từ `registrationEndsAt` đến `startsAt` là khoảng đệm công bố trước (Teaser Buffer), Admin có thể thiết lập dài hơn 2 phút tùy nhu cầu chiến dịch.
4. **Thời gian kết thúc Flash Sale (`endsAt`):** Thời điểm đợt Flash Sale của Sàn khép lại (`endsAt > startsAt`).

#### B. Cấu hình Trợ giá & Giới hạn mua do Sàn thiết lập:
Admin thiết lập 2 thông số trợ giá quy chuẩn áp dụng đồng bộ cho toàn bộ sách tham gia đợt Flash Sale của Sàn:
1. **Số phần trăm trợ giá toàn sàn (`discountPercent` / `subsidyPercent`):**
   - **Ràng buộc cứng:** Tối thiểu **20%** và tối đa **80%** (`20 <= discountPercent <= 80`).
   - Mọi sách của các Shop nộp vào đợt Flash Sale của Sàn sẽ tự động được tính giá bán theo mức giảm này: `Giá Flash Sale = Giá niêm yết * (1 - discountPercent / 100)`.
2. **Số lượng sản phẩm tối đa cho mỗi khách hàng (`maxPerUser`):**
   - Số lượng tối đa mà mỗi tài khoản khách hàng được mua với giá Flash Sale cho 1 loại sản phẩm (mặc định 1 cuốn).
   - Áp dụng tự động và cố định cho mọi sách nộp vào đợt của Sàn.

#### C. Giới hạn số lượng cửa hàng tham gia (`minStores = 1`, `maxStores = 10`):
- **Tối thiểu:** 1 cửa hàng (`minStores = 1`). Chỉ cần từ 1 gian hàng nộp sách tham gia thành công là đợt Flash Sale của Sàn sẽ diễn ra bình thường khi hết hạn đăng ký.
- **Tối đa:** 10 cửa hàng (`maxStores = 10`, `1 <= minStores <= maxStores <= 10`).
- **Cơ chế kiểm soát quota Shop:** Hệ thống đếm chính xác số lượng cửa hàng duy nhất (`unique storeId`) nộp sách vào đợt của Sàn và cập nhật thời gian thực trên cả giao diện Admin và Seller (`X / Y Shop`).

#### D. Quy tắc hiển thị phía Khách hàng theo từng giai đoạn (Customer Visibility Lifecycle):
1. **Giai đoạn Mở đăng ký cho Cửa hàng (`now >= registrationStartsAt && now < registrationEndsAt`):**
   - **Ẩn hoàn toàn phía Khách hàng:** Giao diện khách hàng (trang `/flash-sale` và widget trang chủ) **tuyệt đối không hiển thị bất kỳ thông tin nào** về đợt Flash Sale này của Sàn.
   - Chỉ hiển thị trong Kênh Quản trị Admin và Kênh Người Bán (mục *"Tham Gia Huki Flash Sale"*).
2. **Mốc kết thúc đăng ký (`now >= registrationEndsAt`):**
   - **Trường hợp KHÔNG CÓ Shop nào tham gia (`distinctStores < minStores`, tức 0 Shop):**
     - Hệ thống **tự động HỦY (`CANCELLED`)** đợt Flash Sale của Sàn.
     - Hiển thị thông báo trạng thái Đã Hủy trên Admin View (`"Đã hủy - Không có Shop nào tham gia"`).
     - Khách hàng không nhìn thấy đợt Flash Sale bị hủy này.
   - **Trường hợp ĐỦ số lượng Shop tham gia (`distinctStores >= minStores`, tức >= 1 Shop):**
     - Đợt Flash Sale bước vào giai đoạn **Đệm Công Bố Trước (Teaser Buffer)** từ `registrationEndsAt` đến `startsAt`.
     - Phía Khách hàng (tab Huki Flash Sale tại `/flash-sale`) hiển thị **1 thẻ dài (Teaser Card/Banner)**:
       - Huy hiệu: `[SẮP MỞ BÁN - CÔNG BỐ TRƯỚC]`.
       - Tên chương trình Flash Sale của Sàn.
       - Đồng hồ đếm ngược thời gian thực đến `startsAt` (*"Mở bán chính thức sau: MM:SS"*).
       - Mức % giảm giá trợ giá (*"Giảm giá lên đến {discountPercent}%"*).
       - **Ẩn hoàn toàn danh sách sản phẩm sách** (không để lộ sách trước giờ mở bán).
3. **Giai đoạn Đang Mở Bán (`now >= startsAt && now <= endsAt`):**
   - Thẻ tự động chuyển sang trạng thái **Đang Mở Bán ⚡**.
   - Lưới sản phẩm sách xuất hiện kèm giá giảm, số lượng kho, kích hoạt nút `Mua Ngay` và `Thêm vào giỏ hàng`.

#### E. Quy định tính duy nhất của Flash Sale Toàn Sàn:
- Tại một thời điểm, toàn sàn **chỉ được phép có duy nhất 1 chương trình Flash Sale chưa kết thúc hoặc chưa hủy** (`scope = PLATFORM` và `endsAt > now` và `status NOT IN [ENDED, CANCELLED]`).
- Khi có 1 đợt Sàn đang tồn tại, nút `+ Thiết Lập Khung Giờ Flash Sale Mới Toàn Sàn` trên Admin View sẽ bị **Disable (xám + khóa 🔒)**. Khi đợt cũ đã `ENDED` hoặc `CANCELLED`, nút sẽ tự động được mở lại.

---

### 3. Quy chuẩn chi tiết: Kênh Người Bán (Seller Flash Sale)

#### A. Tinh gọn giao diện Kênh Người Bán:
- Bỏ khu vực *"Khung Giờ Flash Sale Trong Ngày"* và các bảng lặp lại của slot Sàn ở phía dưới trang Seller.
- Phân chia bố cục trang Seller thành 2 khu vực rõ ràng:
  1. Khu vực nổi bật trên cùng: **"Tham Gia Huki Flash Sale"** (Chương trình tài trợ từ Sàn).
  2. Khu vực bên dưới: **"Flash Sale Của Shop"** (Danh sách các đợt Flash Sale do chính Shop tạo và quản lý).

#### B. Quy tắc Studio Chọn Sách Hàng Loạt:
1. **Khi nộp sách vào Flash Sale của SÀN:**
   - Cố định mức `% Giảm` và `Số lượng tối đa / khách hàng` theo giá trị Sàn đã cấu hình (`discountPercent` và `maxPerUser`).
   - Khung công cụ chỉnh % giảm và Max/Khách sẽ bị **Disable / Readonly** kèm thông báo: *"Áp dụng theo mức trợ giá {discountPercent}% và giới hạn {maxPerUser} cuốn/khách của Sàn"*.
   - Cột Giá Flash Sale và % Giảm trong bảng tự động tính toán chính xác và cố định. Seller chỉ cần nhập số lượng tồn kho (`stock`) muốn nộp vào Flash Sale.
2. **Khi tạo Flash Sale RIÊNG CỦA SHOP:**
   - Shop được toàn quyền tự do nhập mức % giảm giá, điều chỉnh giá bán và thiết lập giới hạn mua cho từng sản phẩm như bình thường.

#### C. Khóa cứng nút Đăng ký & Nút "Xem Chi Tiết":
1. **Khóa nút Đăng ký khi Shop đã tham gia:**
   - Ngay khi Shop xác nhận nộp sách vào đợt của Sàn thành công: Nút đăng ký chuyển sang **Disable (ổ khóa 🔒 `Đã Đăng Ký Tham Gia`)**.
   - Không cho phép đăng ký lại hoặc nộp thêm sách vào slot Sàn đó.
2. **Bổ sung Nút "🔍 Xem Chi Tiết":**
   - Xuất hiện ngay cạnh thẻ trạng thái đăng ký của Sàn.
   - Khi bấm vào: Mở giao diện hiển thị danh sách toàn bộ các cuốn sách mà **chính gian hàng đó đã nộp vào đợt Flash Sale của Sàn** (kèm Tựa sách, Ảnh bìa, Giá gốc, Giá trợ giá Flash Sale, Tồn kho nộp, Số lượng đã bán, Trạng thái và Thời gian của đợt Sàn).

#### D. Độc lập Quota giữa Flash Sale Sàn và Flash Sale của Shop:
- Việc Shop tham gia Flash Sale của Sàn **KHÔNG TÍNH** vào hạn mức 1 đợt Flash Sale riêng của Shop.
- Shop hoàn toàn có quyền vừa tham gia Flash Sale của Sàn, vừa tự tạo 1 đợt Flash Sale riêng của Shop mình.

#### E. Quy tắc Xung đột ở cấp độ Sản phẩm / Sách (Product-Level Conflict Rule):
- Sách đã đăng ký trong Flash Sale Sàn trong khung giờ `[startsAt, endsAt]` thì **KHÔNG ĐƯỢC** đăng ký vào Flash Sale riêng của Shop có khung giờ trùng lặp, và ngược lại.
- Trong Studio, sách bị xung đột sẽ bị **Disable checkbox** và hiển thị huy hiệu `[Đang tham gia Flash Sale Sàn]` hoặc `[Đang tham gia Flash Sale Shop]`.

---

## II. THIẾT KẾ CƠ SỞ DỮ LIỆU & KIẾN TRÚC KỸ THUẬT

### 1. Cơ sở dữ liệu (`promotion-service` – Prisma Schema)

```prisma
enum FlashSaleScope {
  PLATFORM
  SHOP
}

enum FlashSaleStatus {
  SCHEDULED
  ACTIVE
  ENDED
  CANCELLED
}

model FlashSale {
  id                   String         @id @default(uuid())
  name                 String
  description          String?
  bannerUrl            String?        @map("banner_url")

  // Scope & Ownership
  scope                FlashSaleScope @default(PLATFORM)
  storeId              String?        @map("store_id")

  // Timeline 4 mốc cho Platform Flash Sale
  registrationStartsAt DateTime?      @map("registration_starts_at")
  registrationEndsAt   DateTime?      @map("registration_ends_at")
  startsAt             DateTime       @map("starts_at")
  endsAt               DateTime       @map("ends_at")

  // Giới hạn số lượng Shop tham gia (Dành cho Platform Flash Sale)
  minStores            Int            @default(1) @map("min_stores")
  maxStores            Int            @default(10) @map("max_stores")

  // Cấu hình trợ giá và giới hạn mua toàn sàn
  discountPercent      Float?         @default(30) @map("discount_percent")
  maxPerUser           Int?           @default(1) @map("max_per_user")

  status               FlashSaleStatus @default(SCHEDULED)

  createdAt            DateTime       @default(now()) @map("created_at")
  updatedAt            DateTime       @updatedAt @map("updated_at")

  items                FlashSaleItem[]

  @@index([scope, status])
  @@index([storeId, status])
  @@map("flash_sales")
}

model FlashSaleItem {
  id          String  @id @default(uuid())
  flashSaleId String  @map("flash_sale_id")
  bookId      String  @map("book_id")
  storeId     String? @map("store_id")

  originalPrice Float @map("original_price")
  salePrice     Float @map("sale_price")

  // Limits
  stock      Int
  sold       Int @default(0)
  maxPerUser Int @default(1) @map("max_per_user")

  createdAt DateTime @default(now()) @map("created_at")

  flashSale FlashSale @relation(fields: [flashSaleId], references: [id])

  @@index([flashSaleId])
  @@index([bookId])
  @@index([storeId])
  @@map("flash_sale_items")
}
```

---

## III. KẾ HOẠCH TRIỂN KHAI CHI TIẾT TỪNG BƯỚC

### Giai đoạn 1: Cơ sở dữ liệu & Backend (`platform/apps/promotion-service`)
- [x] **Bước 1.1:** Cập nhật model `FlashSale` trong `prisma/schema.prisma` bổ sung `discountPercent` (Float), `maxPerUser` (Int), cập nhật mặc định `minStores = 1`.
- [x] **Bước 1.2:** Bổ sung trường `storeId` vào model `FlashSaleItem` và chạy `prisma db push` / `prisma generate`.
- [x] **Bước 1.3:** Cập nhật DTOs (`create-flash-sale.dto.ts`) validate `discountPercent` (20-80%), `maxPerUser` (>=1), `minStores` (1-10).
- [x] **Bước 1.4:** Cập nhật `flash-sales.service.ts`:
  - `findAll()`: Bổ sung tính toán `participatingStoresCount` và enrich sách đầy đủ cho view Admin.
  - `create()` lưu `discountPercent`, `maxPerUser`, `minStores`.
  - Tối ưu `getParticipatingStoreIds()` đếm chính xác 100% số lượng Shop đã tham gia dựa trên `storeId`.
  - `sellerRegisterItem` / `sellerRegisterBatch`: Khi nộp vào slot Sàn, tự động áp dụng `discountPercent` và `maxPerUser` của Sàn, đồng thời lưu `storeId: businessId`.
  - Chặn Shop đăng ký lại nếu đã nộp sách vào slot Sàn.
- [x] **Bước 1.5:** Kiểm tra build: `npm run build:promotion`.

---

### Giai đoạn 2: Giao diện Quản trị Admin (`web/src/ui/components/admin/AdminFlashSaleView.tsx`)
- [x] **Bước 2.1:** Cập nhật API client `flashSaleApi.ts` với `discountPercent` và `maxPerUser`.
- [x] **Bước 2.2:** Thêm 2 trường input vào Form tạo Flash Sale Sàn (`% Trợ giá toàn sàn` 20-80%, `Max/Khách` >= 1, `minStores` 1-10).
- [x] **Bước 2.3:** Lọc nghiêm ngặt `scope = PLATFORM` để Admin chỉ hiển thị và quản lý các phiên Flash Sale do Sàn tổ chức, không hiển thị phiên của Shop.
- [x] **Bước 2.4:** Hiển thị thông số `% Trợ giá`, `Max/Khách` và tiến độ Shop tham gia chính xác (`X / 10 Shop`).

---

### Giai đoạn 3: Kênh Người Bán Seller (`web/src/ui/components/seller/SellerFlashSaleView.tsx`)
- [x] **Bước 3.1:** Bỏ phần *"Khung Giờ Flash Sale Trong Ngày"* và bảng slot sàn lặp lại ở phía dưới.
- [x] **Bước 3.2:** Khóa nút đăng ký (Disable 🔒 `Đã Đăng Ký Tham Gia`) ngay khi Shop đã nộp sách tham gia.
- [x] **Bước 3.3:** Bổ sung nút **`🔍 Xem Chi Tiết`** hiển thị danh sách các sách mà chính Shop đã nộp vào đợt Flash Sale của Sàn.
- [x] **Bước 3.4:** Cập nhật Studio Đăng Ký Sách Hàng Loạt:
  - Khi nộp vào slot Sàn: Tự động khóa cố định % Giảm và Max/Khách theo cấu hình của Sàn, tự động tính giá bán đã trợ giá.
  - Khi tạo Flash Sale riêng của Shop: Cho phép tự do chỉnh sửa như bình thường.

---

### Giai đoạn 4: Giao diện Khách Hàng (`web/src/app/flash-sale/page.tsx`) & API Doanh Nghiệp (`business-service`)
- [x] **Bước 4.1:** Đảm bảo hiển thị mức % giảm giá trợ giá chính xác trên Teaser Card và nhãn Flash Sale.
- [x] **Bước 4.2:** Chuẩn hóa API Doanh nghiệp `business-service` (`business.service.ts` -> `getAllBusinesses`):
  - Bổ sung `slug`, `logo`, `banner` vào quan hệ `stores` (`select: { id: true, name: true, slug: true, logo: true, banner: true }`) để cung cấp đầy đủ thông tin định danh gian hàng cho các dịch vụ khác.
- [x] **Bước 4.3:** Hiển thị chuẩn xác tên và chuyển hướng Gian hàng trong khung Header của tab *Shops Flash Sale*:
  - Đồng bộ việc tải danh sách Doanh nghiệp và Flash Sale bằng `Promise.all` để tránh trường hợp render khi danh sách Doanh nghiệp chưa tải xong.
  - Lấy đúng tên chính thức trong cơ sở dữ liệu `Business` / `Store` (`store.name` / `business.name`).
  - Lấy đúng ảnh Avatar/Logo gian hàng (`store.logo` / `business.logo`). Nếu chưa có ảnh đại diện, tự động hiển thị **chữ cái đầu tiên** của tên gian hàng viết hoa trên nền gradient thương hiệu.
  - Nút *"Xem Gian Hàng →"* trỏ đúng đường dẫn slug chính thức của gian hàng (`/shop/{store.slug}` hoặc `/shop/{business.slug}`).

---

### Giai đoạn 5: Kiểm thử Build & Nghiệm Thu
- [x] **Bước 5.1:** Kiểm tra TypeScript `web`: `npx tsc --noEmit` (0 lỗi).
- [x] **Bước 5.2:** Kiểm tra build `business-service`: `npm run build:business` (0 lỗi).
- [x] **Bước 5.3:** Kiểm tra build `promotion-service`: `npm run build:promotion` (0 lỗi).

