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
   - **Ràng buộc cứng:** `startsAt` phải sau `registrationEndsAt` **ít nhất 2 phút** (`startsAt >= registrationEndsAt + 2 phút`).
4. **Thời gian kết thúc Flash Sale (`endsAt`):** Thời điểm đợt Flash Sale của Sàn khép lại.

#### B. Cơ chế 2 phút đệm công bố cho khách hàng:
- Khoảng thời gian từ `registrationEndsAt` đến `startsAt` (tối thiểu 2 phút) là **giai đoạn đếm ngược công bố trước**:
  - Tại giao diện khách hàng (tab **Huki Flash Sale** tại `/flash-sale`):
    - **Ẩn hoàn toàn danh sách sản phẩm** (không để lộ sách tham gia trước giờ mở bán).
    - **Chỉ hiển thị 1 thẻ dài (Teaser Card/Banner)** với thiết kế bắt mắt gồm:
      - Badge: `[SẮP MỞ BÁN - CÔNG BỐ TRƯỚC]`.
      - Tên chương trình Flash Sale của Sàn.
      - Đồng hồ đếm ngược thời gian thực đến `startsAt` (*"Mở bán chính thức sau: MM:SS"*).
      - Mức % giảm giá tối đa (*"Giảm giá lên đến ...%"*).
  - Khi đồng hồ đếm ngược chạm mốc `startsAt`:
    - Thẻ tự động chuyển sang trạng thái **Đang Mở Bán ⚡**.
    - Lưới toàn bộ sản phẩm sách lập tức xuất hiện kèm giá giảm, số lượng kho, kích hoạt nút `Mua Ngay` và `Thêm vào giỏ hàng`.

#### C. Quy định tính duy nhất của Flash Sale Toàn Sàn:
- **Nguyên tắc:** Tại một thời điểm, toàn sàn **chỉ được phép có duy nhất 1 chương trình Flash Sale chưa kết thúc** (`scope = PLATFORM` và `endsAt > now` và `status != ENDED`).
- **Chặn tạo mới:** Không cho phép Admin tạo chương trình mới nếu chương trình hiện tại vẫn đang ở bất kỳ giai đoạn nào:
  1. Giai đoạn mở đăng ký cho cửa hàng (`now >= registrationStartsAt && now < registrationEndsAt`)
  2. Giai đoạn chờ áp dụng / đếm ngược công bố (`now >= registrationEndsAt && now < startsAt`)
  3. Giai đoạn đang mở bán áp dụng (`now >= startsAt && now <= endsAt`)
- **Phía Giao diện Admin:** Nút `+ Thiết Lập Khung Giờ Flash Sale Mới Toàn Sàn` sẽ bị **Disable (xám + khóa 🔒)** và hiển thị dòng chữ đỏ thông báo lý do bên dưới.
- **Phía Backend API:** Chặn bằng validation và ném ngoại lệ rõ ràng nếu đã có 1 đợt Sàn đang tồn tại.

#### D. Giới hạn số lượng cửa hàng tham gia (`minStores = 3`, `maxStores = 10`):
- Trong form tạo Flash Sale Toàn Sàn, Admin thiết lập trường **"Giới hạn số lượng cửa hàng tham gia"** (`maxStores` / `storeLimit`).
- **Ràng buộc cứng:**
  - **Tối thiểu:** 3 cửa hàng (`min = 3`).
  - **Tối đa:** 10 cửa hàng (`max = 10`).
  - Admin không được phép nhập giá trị nhỏ hơn 3 hoặc lớn hơn 10 (ràng buộc validation cả Frontend và Backend).
- **Cơ chế kiểm soát quota Shop:**
  - Hệ thống đếm số lượng cửa hàng duy nhất (`unique storeId`) nộp sách vào đợt của Sàn.
  - Khi số lượng cửa hàng đã đạt mức giới hạn (VD: 5/5 Shop), hệ thống tự động khóa cổng đăng ký đối với các Shop mới tiếp theo (báo *"Đã đủ số lượng Shop tham gia"*).

---

### 3. Quy chuẩn chi tiết: Kênh Người Bán (Seller Flash Sale)

#### A. Mục "Tham Gia Huki Flash Sale" (Chương trình Sàn):
- Trên trang quản trị Flash Sale của Seller ([`SellerFlashSaleView.tsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/seller/SellerFlashSaleView.tsx)), thiết kế một khu vực riêng biệt mang tên **"Tham Gia Huki Flash Sale"**.
- **Khi Sàn mở đăng ký (`now >= registrationStartsAt && now <= registrationEndsAt`):**
  - Hiển thị thẻ thông báo nổi bật: Tên chương trình Sàn, thời hạn đóng đăng ký còn lại, tiến độ số lượng Shop tham gia (VD: *Đã tham gia: 4/10 Shop*).
  - Có nút **`⚡ Đăng Ký Tham Gia Ngay`** để Seller chọn sách trong kho nộp vào đợt của Sàn.
- **Khi hết hạn hoặc đã đủ số lượng Shop:**
  - Hiển thị thông báo: *"Đã đóng cổng đăng ký (Đã đủ số lượng Shop tham gia / Đã hết thời gian đăng ký)"* và khóa nút nộp sách.

#### B. Flash Sale riêng của Shop (`scope = SHOP`):
- **Giới hạn 1 đợt duy nhất:** Mỗi Shop chỉ được tạo và duy trì tối đa **1 đợt Flash Sale** đang hoạt động hoặc chuẩn bị diễn ra (`endsAt > now`).
- **Thời gian công bố tối thiểu 2 phút:** Thời gian bắt đầu `startsAt` phải sau thời điểm tạo tối thiểu 2 phút (`startsAt >= now + 2 phút`).
- **Trạng thái nút tạo:** Nút `⚡ Tạo Flash Sale & Đăng Ký Sách` tự động chuyển sang trạng thái **Disable (màu xám, có ổ khóa 🔒)** kèm dòng chữ đỏ cảnh báo lý do nếu Shop đã có 1 đợt đang hoạt động.
- **Bộ lọc tab tinh gọn:** Chỉ duy trì đúng 3 tab:
  1. `Tất Cả Khung Giờ` (`ALL`)
  2. `Đang Mở Bán ⚡` (`ACTIVE` - bao gồm cả các đợt đang đếm ngược chuẩn bị mở bán)
  3. `Đã Kết Thúc 🏁` (`ENDED`)

---

### 4. Quy chuẩn chi tiết: Giao diện Khách Hàng (`/flash-sale`)

- **Tab Huki Flash Sale:**
  - Khi đợt sale của Sàn trong 2 phút đệm (`now >= registrationEndsAt && now < startsAt`): Hiển thị **Teaser Card dài** với tên đợt, đếm ngược `Mở bán chính thức sau: MM:SS` và mức % giảm tối đa; **ẩn toàn bộ lưới sách**.
  - Khi `now >= startsAt`: Hiển thị danh sách sách đang mở bán kèm các nút `Mua Ngay` và `Thêm vào giỏ`.
- **Tab Shops Flash Sale:**
  - Đối với từng đợt sale của Shop đang trong giai đoạn `upcoming`: Hiển thị **Teaser Card dài** đếm ngược và % giảm giá; **ẩn danh sách sách**.
  - Khi chuyển sang `active`: Tự động mở lưới sách với giá giảm và nút mua hàng.

---

## II. THIẾT KẾ CƠ SỞ DỮ LIỆU & KIẾN TRÚC KỸ THUẬT

### 1. Cơ sở dữ liệu (`promotion-service` – Prisma Schema)

Cập nhật model `FlashSale` trong file `platform/apps/promotion-service/prisma/schema.prisma`:

```prisma
enum FlashSaleScope {
  PLATFORM
  SHOP
}

enum FlashSaleStatus {
  SCHEDULED
  ACTIVE
  ENDED
}

model FlashSale {
  id                   String         @id @default(uuid())
  name                 String
  description          String?
  bannerUrl            String?        @map("banner_url")

  // Scope & Ownership
  scope                FlashSaleScope @default(PLATFORM)
  storeId              String?        @map("store_id")

  // Timeline 4 mốc cho Platform Flash Sale (Nullable để tương thích Shop Flash Sale)
  registrationStartsAt DateTime?      @map("registration_starts_at")
  registrationEndsAt   DateTime?      @map("registration_ends_at")
  startsAt             DateTime       @map("starts_at")
  endsAt               DateTime       @map("ends_at")

  // Giới hạn số lượng Shop tham gia (Dành riêng cho Platform Flash Sale)
  minStores            Int            @default(3) @map("min_stores")
  maxStores            Int            @default(10) @map("max_stores")

  status               FlashSaleStatus @default(SCHEDULED)

  createdAt            DateTime       @default(now()) @map("created_at")
  updatedAt            DateTime       @updatedAt @map("updated_at")

  items                FlashSaleItem[]

  @@index([scope, status])
  @@index([storeId, status])
  @@map("flash_sales")
}
```

---

### 2. Backend Logic (`promotion-service`)

#### A. DTOs Cập nhật (`create-flash-sale.dto.ts`):
```typescript
export class CreateFlashSaleDto {
  name: string;
  description?: string;
  bannerUrl?: string;
  scope?: FlashSaleScope;
  storeId?: string;

  // 4 mốc thời gian
  registrationStartsAt?: string;
  registrationEndsAt?: string;
  startsAt: string;
  endsAt: string;

  // Giới hạn số lượng cửa hàng tham gia
  minStores?: number;
  maxStores?: number;
}
```

#### B. Validation trong `FlashSalesService.create`:
1. **Kiểm tra tính duy nhất của Flash Sale Sàn (`scope === PLATFORM`):**
   ```typescript
   if (dto.scope === FlashSaleScope.PLATFORM || !dto.storeId) {
     const existingPlatformSlot = await this.prisma.flashSale.findFirst({
       where: {
         scope: FlashSaleScope.PLATFORM,
         endsAt: { gt: now },
         status: { not: FlashSaleStatus.ENDED },
       },
     });
     if (existingPlatformSlot) {
       throw new BadRequestException(
         `Sàn hiện đã có 1 chương trình Flash Sale chưa kết thúc ("${existingPlatformSlot.name}"). Mỗi thời điểm chỉ được phép có tối đa 1 chương trình Flash Sale toàn sàn.`
       );
     }
   }
   ```
2. **Kiểm tra tính hợp lệ của 4 mốc thời gian (Flash Sale Sàn):**
   ```typescript
   if (dto.scope === FlashSaleScope.PLATFORM) {
     const regStart = new Date(dto.registrationStartsAt || now);
     const regEnd = new Date(dto.registrationEndsAt || 0);
     const start = new Date(dto.startsAt);
     const end = new Date(dto.endsAt);

     if (regEnd <= regStart) {
       throw new BadRequestException("Thời gian kết thúc đăng ký phải sau thời gian mở đăng ký.");
     }
     if (start.getTime() < regEnd.getTime() + 2 * 60 * 1000 - 5000) {
       throw new BadRequestException("Thời gian bắt đầu áp dụng phải sau thời gian kết thúc đăng ký ít nhất 2 phút (thời gian công bố trước cho khách hàng).");
     }
     if (end <= start) {
       throw new BadRequestException("Thời gian kết thúc Flash Sale phải sau thời gian bắt đầu áp dụng.");
     }
   }
   ```
3. **Kiểm tra giới hạn số lượng cửa hàng (`minStores`, `maxStores`):**
   ```typescript
   if (dto.scope === FlashSaleScope.PLATFORM) {
     const maxStores = Number(dto.maxStores ?? 10);
     if (maxStores < 3 || maxStores > 10) {
       throw new BadRequestException("Số lượng cửa hàng tham gia Flash Sale của Sàn phải từ 3 đến tối đa 10 cửa hàng.");
     }
   }
   ```
4. **Kiểm tra khi Seller đăng ký sách vào slot Sàn (`sellerRegisterItem` / `sellerRegisterBatch`):**
   - Kiểm tra thời gian hiện tại: `now >= slot.registrationStartsAt && now <= slot.registrationEndsAt`. Nếu ngoài khoảng ➔ Báo lỗi *"Khung giờ Sàn đã đóng cổng đăng ký sách"*.
   - Kiểm tra số lượng Shop tham gia: Đếm số lượng Shop đã có sách trong slot. Nếu Shop hiện tại là Shop mới và số lượng Shop đã đạt `maxStores` ➔ Báo lỗi *"Khung giờ Flash Sale của Sàn đã đủ số lượng cửa hàng tham gia (tối đa {maxStores} Shop)"*.

---

## III. NGUYÊN TẮC THIẾT KẾ UI/UX & GIAO DIỆN HIỆN CÓ

1. **Sử dụng component và tokens có sẵn:**
   - Sử dụng hệ thống component sẵn có trong `@/ui/components/seller/SellerUI` và `@/ui/components/admin/AdminUI`.
   - Sử dụng `ToastContext` (`showToast`) để hiển thị phản hồi tức thì cho người dùng.
2. **Chuẩn phong cách màu sắc và typography của dự án:**
   - **Sàn Huki (Platform):** Màu đỏ thương hiệu (`#ac2c19`, `#c73924`), huy hiệu Amber/Gold (`#F59E0B`).
   - **Cửa hàng (Shops):** Xanh lục bảo đậm (`#003B2B`, `#005a41`), gradient Emerald.
   - Font chữ chuẩn `font-sans`, icon chuẩn từ `material-symbols-outlined`.
3. **Responsive và căn chỉnh giao diện:**
   - Hỗ trợ hiển thị mượt mà trên cả Mobile, Tablet và Desktop (`sm:`, `md:`, `lg:`, `xl:`).
   - Thiết kế dạng thẻ ngang, bảng có thanh cuộn ngang khi danh sách nhiều cột, không vỡ khung hay tràn viền.
4. **Tuyệt đối không ảnh hưởng phân hệ khác:**
   - Không can thiệp vào các logic ngoài phân hệ Flash Sale (Cart, Checkout, Catalog, Order Management).
5. **Nguyên tắc xử lý thông tin chưa rõ:**
   - Trường hợp có bất kỳ yêu cầu nào phát sinh chưa rõ ràng, cần xác nhận lại với người dùng trước khi triển khai, không tự ý suy đoán.

---

## IV. KẾ HOẠCH TRIỂN KHAI CHI TIẾT TỪNG BƯỚC

### Giai đoạn 1: Cơ sở dữ liệu & Backend (`platform/apps/promotion-service`)
- [ ] **Bước 1.1:** Cập nhật file `prisma/schema.prisma` bổ sung `registrationStartsAt`, `registrationEndsAt`, `minStores`, `maxStores` vào model `FlashSale`.
- [ ] **Bước 1.2:** Chạy `prisma db push` / generate client cho `promotion-service`.
- [ ] **Bước 1.3:** Cập nhật DTOs (`create-flash-sale.dto.ts`, `seller-register-item.dto.ts`).
- [ ] **Bước 1.4:** Cập nhật hàm `create` trong `flash-sales.service.ts`:
  - Thêm validation 1 chương trình Sàn duy nhất (`scope = PLATFORM`, `endsAt > now`).
  - Thêm validation 4 mốc thời gian (`startsAt >= registrationEndsAt + 2 phút`).
  - Thêm validation `3 <= maxStores <= 10`.
- [ ] **Bước 1.5:** Cập nhật hàm `sellerRegisterItem` / `sellerRegisterBatch`:
  - Kiểm tra thời gian đăng ký hợp lệ `[registrationStartsAt, registrationEndsAt]`.
  - Kiểm tra quota số lượng shop tham gia (`unique stores <= maxStores`).
- [ ] **Bước 1.6:** Cập nhật `getTimeSlots`, `getActiveFlashSales`, `getSellerSlots` trả về đầy đủ các trường mới và số lượng Shop đã tham gia.
- [ ] **Bước 1.7:** Kiểm tra build backend: `npm run build:promotion`.

---

### Giai đoạn 2: Giao diện Quản trị Admin (`web/src/ui/components/admin/AdminFlashSaleView.tsx`)
- [ ] **Bước 2.1:** Cập nhật API client `web/src/ui/api/flashSaleApi.ts` với các trường mới của `CreateFlashSalePayload` và `FlashSaleSlot`.
- [ ] **Bước 2.2:** Cập nhật Form *"Thiết Lập Khung Giờ Flash Sale Mới Toàn Sàn"*:
  - Thêm 2 trường: `Thời Gian Mở Đăng Ký` và `Thời Gian Đóng Đăng Ký`.
  - Thêm trường `Giới Hạn Số Lượng Cửa Hàng Tham Gia` (input number `min="3" max="10"`, mặc định 10).
  - Tự động gán `startsAt` tối thiểu sau `registrationEndsAt` 2 phút.
- [ ] **Bước 2.3:** Kiểm tra đợt Sàn đang hoạt động:
  - Nếu đã có 1 đợt Sàn chưa kết thúc: Disable nút `+ Thiết Lập Khung Giờ Mới` và hiển thị dòng chữ đỏ thông báo nguyên nhân bên dưới.
- [ ] **Bước 2.4:** Hiển thị thông tin tiến độ số lượng Shop tham gia trên danh sách các khung giờ Flash Sale của Admin.

---

### Giai đoạn 3: Kênh Người Bán Seller (`web/src/ui/components/seller/SellerFlashSaleView.tsx`)
- [ ] **Bước 3.1:** Xây dựng mục chuyên biệt **"Tham Gia Huki Flash Sale"** ở vị trí nổi bật:
  - Hiển thị banner chương trình Sàn đang mở đăng ký.
  - Hiển thị thời gian đếm ngược đến hạn chót đăng ký (`registrationEndsAt`).
  - Hiển thị tiến độ: `Đã có {currentStores}/{maxStores} Shop tham gia`.
  - Nút `⚡ Đăng Ký Tham Gia Ngay` mở Studio chọn sách nộp vào đợt của Sàn.
- [ ] **Bước 3.2:** Khóa nút đăng ký khi đã quá `registrationEndsAt` hoặc đã đủ `maxStores` Shop tham gia kèm thông báo lý do rõ ràng.
- [ ] **Bước 3.3:** Giữ vững quy chuẩn Flash Sale riêng của Shop:
  - Giới hạn 1 đợt, công bố tối thiểu 2 phút, disable nút tạo khi đã có 1 đợt hoạt động.
  - Duy trì đúng 3 tab bộ lọc: `Tất Cả Khung Giờ`, `Đang Mở Bán ⚡`, `Đã Kết Thúc 🏁`.

---

### Giai đoạn 4: Giao diện Khách Hàng (`web/src/app/flash-sale/page.tsx`)
- [ ] **Bước 4.1:** Hoàn thiện hiển thị tab **Huki Flash Sale**:
  - Khi trong giai đoạn đếm ngược 2 phút công bố trước (`now >= registrationEndsAt && now < startsAt`):
    - Hiển thị duy nhất 1 Teaser Card dài nổi bật với tên đợt, đếm ngược `Mở bán sau: MM:SS` và mức % giảm tối đa.
    - Ẩn toàn bộ lưới sách.
  - Khi chạm mốc `startsAt`: Tự động chuyển sang Đang Mở Bán và hiển thị đầy đủ sách với nút `Mua Ngay` và `Thêm vào giỏ`.
- [ ] **Bước 4.2:** Đồng bộ hiển thị tương tự cho tab **Shops Flash Sale**.

---

### Giai đoạn 5: Kiểm thử Toàn Diện & Nghiệm Thu
- [ ] **Bước 5.1:** Kiểm tra TypeScript build: `npx tsc --noEmit` (web) và `npm run build:promotion` (backend).
- [ ] **Bước 5.2:** Kiểm thử tạo Flash Sale Sàn với 4 mốc thời gian và giới hạn Shop (3 - 10).
- [ ] **Bước 5.3:** Kiểm thử Seller đăng ký vào Flash Sale Sàn và kiểm tra tự động khóa khi đủ số lượng Shop.
- [ ] **Bước 5.4:** Kiểm thử giai đoạn 2 phút công bố trước trên trang khách hàng và chuyển đổi trạng thái khi hết giờ.
- [ ] **Bước 5.5:** Kiểm thử tính duy nhất (chặn tạo đợt thứ 2 khi đợt 1 chưa kết thúc trên cả Admin và Seller).
