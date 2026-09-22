# ĐẶC TẢ TÍNH NĂNG: QUẢN LÝ ƯU ĐÃI & GIẢM GIÁ TỰ DO (DISCOUNT FREE)

> **Tài liệu quy chuẩn yêu cầu và đặc tả kỹ thuật tính năng Giảm Giá Tự Do (Seller Discount)**  
> **Dự án:** HUKI EBOOK Platform  
> **Trạng thái:** Đặc tả chuẩn để thực hiện (Specification & Implementation Standards)  
> **Lưu ý triển khai:** Tái sử dụng tối đa component/design token có sẵn của dự án, giữ nguyên tính toàn vẹn của các tính năng khác, tuyệt đối không tự chế hoặc phỏng đoán khi chưa rõ ràng.

---

## I. MỤC TIÊU & TỔNG QUAN YÊU CẦU

Tích hợp phân hệ **"Quản lý ưu đãi"** cho cả 2 phân quyền quản trị (**Admin Seller** và **Admin Platform**), trong đó:
1. **Admin Platform (Sàn):** Tạo khung menu Quản lý ưu đãi gồm 2 mục con (*Voucher giảm giá*, *Flash Sale*) nhưng tạm thời **Disable (khóa)** kèm nhãn "Sắp ra mắt" để phục vụ mở rộng trong tương lai.
2. **Admin Seller (Người bán/Doanh nghiệp):** Tạo khung menu Quản lý ưu đãi gồm 3 mục con (*Giảm giá tự do*, *Voucher giảm giá*, *Flash Sale*), trong đó:
   - Khóa (*Disable / Sắp ra mắt*) 2 mục: *Voucher giảm giá* và *Flash Sale*.
   - Triển khai **hoàn chỉnh 100%** mục: **Giảm giá tự do** (Free/Custom Discount theo sách).
3. **Đồng bộ dữ liệu giá thật:** Khi Seller thiết lập giảm giá cho sách, hệ thống lưu vào DB (`promotion_db` &rarr; `book_discounts`), cập nhật ngay lập tức giao diện Seller và đồng bộ hiển thị giá đã giảm thật phía User/Reader (trang danh sách sách, chi tiết sách, giỏ hàng).

---

## II. CHI TIẾT GIAO DIỆN & LUỒNG NGƯỜI DÙNG (UI/UX)

### 1. Cấu trúc Menu Điều Hướng (Sidebar)

#### A. Admin Seller Sidebar (`SellerSidebar.tsx`)
* **Thêm nhóm menu mới:** `QUẢN LÝ ƯU ĐÃI` (hoặc `ƯU ĐÃI & KHUYẾN MÃI`).
* **Các mục con:**
  1. **Giảm giá tự do (`/seller/promotions/discounts`):**
     - Trạng thái: **Active (Khả dụng)**.
     - Icon: `percent` hoặc `sell` hoặc `local_offer`.
     - Cho phép click truy cập vào trang quản lý giảm giá sách.
  2. **Voucher giảm giá (`/seller/promotions/vouchers`):**
     - Trạng thái: **Disabled (isDeferred: true)**.
     - Icon: `loyalty` hoặc `confirmation_number`.
     - Hiển thị badge: `Sắp ra mắt`, độ mờ `opacity-45`, `cursor-not-allowed`, không cho click.
  3. **Flash sale (`/seller/promotions/flash-sale`):**
     - Trạng thái: **Disabled (isDeferred: true)**.
     - Icon: `bolt` hoặc `flash_on`.
     - Hiển thị badge: `Sắp ra mắt`, độ mờ `opacity-45`, `cursor-not-allowed`, không cho click.

#### B. Admin Platform Sidebar (`AdminLayout.tsx`)
* **Thêm nhóm menu mới:** `QUẢN LÝ ƯU ĐÃI`.
* **Các mục con:**
  1. **Voucher giảm giá:** Trạng thái **Disabled** (hiển thị badge "Sắp ra mắt", không cho click).
  2. **Flash sale:** Trạng thái **Disabled** (hiển thị badge "Sắp ra mắt", không cho click).

---

### 2. Trang Quản Lý "Giảm Giá Tự Do" Của Seller (`SellerDiscountsView.tsx`)

#### A. Tiêu đề & Bộ lọc
* Tiêu đề: **Quản Lý Giảm Giá Sách (Giảm giá tự do)**.
* Mô tả ngắn: *Thiết lập chương trình giảm giá theo % hoặc giá tiền cụ thể cho các đầu sách đã xuất bản của cửa hàng.*
* Tự động lấy danh sách toàn bộ sách có trạng thái `PUBLISHED` thuộc `storeId` / `businessId` của Seller hiện tại.

#### B. Cấu trúc Bảng Danh Sách Sách (Table 4 cột)

| Cột | Tên Cột | Mô Tả & Quy Chuẩn Hiển Thị |
| :---: | :--- | :--- |
| **1** | **ID Sách** | Hiển thị mã `id` (hoặc 8 ký tự rút gọn kèm nút copy/toàn bộ khi hover) của sách. |
| **2** | **Tên Sách** | - **Ảnh bìa (Avatar):** Căn chỉnh vừa vặn (tỷ lệ sách 3:4 hoặc 1:1 thu nhỏ `w-10 h-14` bo góc `rounded-md`, `object-cover`), có fallback ảnh mặc định nếu null.<br>- **Tên sách:** Nếu độ dài vượt quá 10 ký tự &rarr; Cắt và thêm `...` (Ví dụ: `"Đắc Nhân Tâm..."`). Khi hover chuột vào &rarr; Hiển thị Tooltip/Popover đầy đủ tên sách bên dưới. |
| **3** | **Tác Giả** | Tên tác giả (hoặc nhiều tác giả). Nếu độ dài vượt quá 10 ký tự &rarr; Cắt và thêm `...` (Ví dụ: `"Nguyễn Nhật..."`). Khi hover chuột vào &rarr; Hiển thị Tooltip/Popover đầy đủ tên tác giả bên dưới. |
| **4** | **Giảm Giá** | - Nếu sách **chưa có giảm giá** đang chạy: Hiển thị tag `"Giá gốc: XXX.XXXđ"` + Nút **"Thiết lập"**.<br>- Nếu sách **đang có giảm giá**: Hiển thị tag nổi bật (ví dụ: `"-10%"` hoặc `"-20.000đ"`, thời gian hiệu lực) + Nút **"Thiết lập lại / Chỉnh sửa"**. |

---

### 3. Modal / Popup Thiết Lập Giảm Giá

Khi Seller bấm nút **"Thiết lập"** ở một cuốn sách, Modal mở ra với các thành phần và quy tắc kiểm tra nghiêm ngặt:

#### A. Thông tin Header Popup
* Ảnh bìa + Tên đầy đủ của cuốn sách.
* Giá gốc niêm yết hiện tại của sách (Ví dụ: `150.000đ`).

#### B. Lựa chọn hình thức giảm giá (2 options - Radio/Toggle Button)
1. **Lựa chọn 1: Giảm theo phần trăm (%)**
   - Input nhập số `%` muốn giảm (Ví dụ: nhập `5` &rarr; tương ứng giảm 5%).
   - Preview số tiền giảm: Tự động tính ra số tiền giảm tương ứng (Ví dụ: $150.000 \times 5\% = 7.500đ$) và giá bán sau giảm (`142.500đ`).
2. **Lựa chọn 2: Giảm theo giá tự thiết lập (VNĐ)**
   - Input tự nhập số tiền muốn giảm (Ví dụ: nhập `10000` &rarr; giảm 10.000đ).
   - Preview giá bán sau giảm: Tự động tính ra giá bán mới (`140.000đ`).

#### C. Lựa chọn khung thời gian áp dụng
* **Ngày & Giờ bắt đầu (`startsAt`):** Input datetime (HTML5 `datetime-local` hoặc Date/Time Picker chuẩn giao diện).
* **Ngày & Giờ kết thúc (`expiresAt`):** Input datetime.

#### D. Ràng Buộc & Validation Realtime (Bắt buộc)
1. **Chặn ký tự chữ:** Input giá trị giảm **chỉ cho phép nhập ký tự số [0-9]**, ngăn chặn nhập chữ cái hoặc ký tự đặc biệt (`-`, `+`, `e`).
2. **Không được để trống:** Tất cả các trường (Giá trị giảm, Ngày bắt đầu, Ngày kết thúc) không được để trống.
3. **Giới hạn giá trị giảm:**
   - Nếu chọn `%`: Giá trị phải nằm trong khoảng $1\% \le \text{value} \le 100\%$. **Không được nhập quá 100%**.
   - Nếu chọn `giá tiền (VNĐ)`: Giá trị phải $> 0$ và $\le \text{giá gốc của sách}$. **Không được nhập số tiền vượt quá giá gốc**.
4. **Giới hạn thời gian:**
   - Ngày & Giờ bắt đầu **không được nằm trong quá khứ** so với thời điểm hiện tại (`startsAt >= now - 1 phút`).
   - Ngày & Giờ bắt đầu và Ngày & Giờ kết thúc **không được trùng nhau** (`startsAt != expiresAt`).
   - Ngày bắt đầu phải diễn ra trước ngày kết thúc (`startsAt < expiresAt`).
5. **Nút "Áp dụng":**
   - Trạng thái mặc định: **Disabled** (mờ, không thể bấm).
   - Chỉ chuyển sang trạng thái **Active (sáng lên và cho phép bấm)** khi và chỉ khi form thỏa mãn **100% các điều kiện validation trên**.

#### E. Hành vi khi bấm "Áp dụng"
1. Hiển thị loading indicator trên nút.
2. Gửi request đến Backend (`promotion-service` API).
3. Khi thành công:
   - Đóng popup, hiển thị thông báo Toast thành công (sử dụng Toast component có sẵn).
   - Tự động load lại dữ liệu trên bảng của Seller để cập nhật mức giảm mới.
   - Giá mới có hiệu lực ngay cho khách hàng (User/Reader) khi truy cập sách.

---

## III. THIẾT KẾ KỸ THUẬT & KIẾN TRÚC BACKEND

### 1. Cơ Sở Dữ Liệu (PostgreSQL - `promotion_db`)
Sử dụng model **`BookDiscount`** đã có sẵn trong `platform/apps/promotion-service/prisma/schema.prisma`:

```prisma
model BookDiscount {
  id          String         @id @default(uuid())
  bookId      String         @map("book_id")
  type        DiscountType   // PERCENTAGE | FIXED_AMOUNT
  value       Float
  minQuantity Int?           @map("min_quantity")
  startsAt    DateTime       @map("starts_at")
  expiresAt   DateTime       @map("expires_at")
  status      DiscountStatus @default(ACTIVE) // ACTIVE | EXPIRED | CANCELLED
  createdAt   DateTime       @default(now()) @map("created_at")
  updatedAt   DateTime       @updatedAt @map("updated_at")

  @@index([bookId])
  @@index([expiresAt])
  @@map("book_discounts")
}
```

### 2. Module Backend Cần Bổ Sung Trong `promotion-service`
Tạo module `BookDiscountsModule` gồm:
* **`CreateBookDiscountDto` / `UpdateBookDiscountDto`:**
  - `bookId`: string (UUID)
  - `type`: `PERCENTAGE` | `FIXED_AMOUNT`
  - `value`: number (> 0)
  - `startsAt`: ISO Date string
  - `expiresAt`: ISO Date string
* **APIs Cung Cấp:**
  1. `POST /api/v1/seller/discounts`: Tạo hoặc cập nhật giảm giá cho sách (Kiểm tra quyền sở hữu sách của Seller).
  2. `GET /api/v1/seller/discounts/books/:bookId`: Lấy thông tin giảm giá của 1 sách.
  3. `GET /api/v1/seller/discounts`: Lấy danh sách toàn bộ discount đang có của các sách thuộc Seller.
  4. `DELETE /api/v1/seller/discounts/:id`: Hủy chương trình giảm giá của sách.
  5. `GET /api/v1/discounts/active/:bookId` (Internal API): Trả về discount đang ACTIVE (`startsAt <= NOW() <= expiresAt`) để `commerce-service` tính toán giá.

### 3. Tích Hợp Vào `commerce-service` (Tính Toán Giá Sách Thật)
* Mở rộng hàm `resolveBookPrice(bookId, basePrice)` trong `commerce-service/src/modules/cart/cart.service.ts` và API chi tiết sách:
  1. Kiểm tra Flash Sale active trước (ưu tiên cao nhất nếu có).
  2. Nếu không có Flash Sale, kiểm tra `BookDiscount` active từ `promotion-service`:
     - Nếu `type === 'PERCENTAGE'`: $\text{salePrice} = \text{basePrice} \times (1 - \text{value} / 100)$
     - Nếu `type === 'FIXED_AMOUNT'`: $\text{salePrice} = \max(0, \text{basePrice} - \text{value})$
  3. Trả về `unitPrice: salePrice` và `originalPrice: basePrice`.

---

## IV. NGUYÊN TẮC & QUY CHUẨN THỰC HIỆN

1. **Tái sử dụng component có sẵn:**
   - Dùng chung layout `SellerLayout`, `SellerSidebar`, `AdminLayout`.
   - Dùng chung UI components: Buttons, Modals, Inputs, Badge, Tooltip/Popover, Toast notification, Loading spinners.
   - Tuân thủ bảng màu chuẩn của dự án (Theme Primary `#00875A`, Surface, Border, On-surface tokens).

2. **Không ảnh hưởng tính năng không liên quan:**
   - Không làm thay đổi cấu trúc bảng hay luồng xác thực (`auth-service`, `business-service`).
   - Giữ nguyên các chức năng quản lý sách (`BookCatalog`, `BookUploads`) và đơn hàng (`Orders`).

3. **Nguyên tắc xử lý khi phân vân / chưa rõ:**
   - Bất kỳ điểm nào liên quan đến nghiệp vụ chưa rõ ràng hoặc có nhiều phương án xử lý thì **dừng lại hỏi ý kiến người dùng**, không tự phỏng đoán hay tự chế mã nguồn.

---
*Tài liệu này được tạo làm căn cứ kỹ thuật chính thức cho các bước triển khai tiếp theo.*
