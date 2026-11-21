# BÁO CÁO THẨM ĐỊNH LỖI & KẾ HOẠCH BẢO TRÌ SPRINT 3 (100% ZERO MOCK - PRODUCTION READY)

> **Dự án:** HuKi Ebook & Print-on-Demand Marketplace  
> **Tài liệu tham chiếu:** [`readme-bug.md`](file:///e:/HuKi/readme-bug.md) (Quy trình chuẩn hóa 12 bước)  
> **Môi trường mục tiêu:** Staging UAT (`https://huki-uat.duckdns.org`)  
> **Nhánh thực thi:** `fix-bug-sprint3`  
> **Ngày khởi tạo:** 22/11/2026

---

## 📌 BẢNG TỔNG HỢP DANH MỤC LỖI SPRINT 3

| Mã Bug | Phân Hệ | Mô Tả Lỗi Thực Tế | Mức Độ | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-028** | Catalog / Navigation | Danh mục sách bên trái trang chủ (`DANH MỤC SÁCH`) click lọc không hoạt động do lệch query param / category slug giữa trang chủ (`page.tsx`) và bộ lọc `/books`. | **Cao (P1)** | ✅ Đã khắc phục & Đạt kiểm toán 100% |
| **BUG-029** | Admin Marketing / Homepage | Banner admin xóa xong vẫn còn hiển thị (do fallback cứng) + Thiếu tính năng chọn vị trí hiển thị (Hero Slider, Sub Top, Sub Bottom) và validation chống trùng slot. | **Cao (P1)** | ✅ Đã khắc phục & Đạt kiểm toán 100% |
| **BUG-030** | Orders UI / Design System | UI nút lổm chổm, màu sắc lệch chuẩn: Nút Chat đỏ hồng lạc điệu, các nút Mở Tủ Sách, Đọc Ngay, Hủy Đơn, In Biên Lai, Dặn Dò Shop chưa thống nhất border-top, chiều cao h-9. | **Trung bình (P2)** | ✅ Đã khắc phục & Đạt kiểm toán 100% |
| **BUG-031** | Checkout / Order Success | Trang `order-success` dùng token Material 3 cũ tạo nền màu vàng/kem cũ kỹ, lệch hoàn toàn so với tông màu trắng / slate hiện đại của dự án. | **Thấp (P3)** | ✅ Đã khắc phục & Đạt kiểm toán 100% |

---

## 🏗️ BƯỚC 2: PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ 4 TẦNG & MA TRẬN RỦI RO DOMINO

### 1. Phân Tích Chi Tiết Từng Lỗi

#### 🔍 BUG-028: Lệch Slug / Category Mapping Giữa Trang Chủ Và `/books`
* **Tầng 1 (Database):** Bảng `categories` lưu 5 danh mục chuẩn:
  1. `kinh-doanh-tech` (Kinh doanh & Tech)
  2. `manga-comic-khac` (Manga & Khác)
  3. `tri-thuc` (Tri thức & Khoa học)
  4. `tam-ly-ky-nang` (Tâm lý & Kỹ năng)
  5. `van-hoc` (Văn học)
* **Tầng 4 (Frontend Client):**
  - Trang chủ `web/src/app/page.tsx` tạo link: `/books?category=${c.slug}` (ví dụ: `/books?category=kinh-doanh-tech`).
  - Trang `/books/page.tsx` ánh xạ danh mục sách trong `allBooks` sang 5 từ khóa tiếng Anh cứng (`business`, `technology`, `literature`, `children`, `selfhelp`).
  - Trong logic lọc (`filteredBooks`), `catMap['kinh-doanh-tech']` bị `undefined`, dẫn đến so sánh `'business' === 'kinh-doanh-tech'` => `FALSE`! Kết quả: Toàn bộ danh sách sách trả về rỗng (0 cuốn).
  - Thanh bên trái của `/books` cũng hiển thị cứng 4 danh mục tiếng Anh, không đồng bộ với 5 danh mục thực tế từ cơ sở dữ liệu.

#### 🔍 BUG-029: Banner Fallback Cứng & Thiếu Quản Lý Vị Trí Hiển Thị (Slot)
* **Tầng 2 (Backend Services - Promotion Service):**
  - Entity `Banner` có trường `position: Int` nhưng chưa phân định rõ vị trí hiển thị trên giao diện (Hero Slider giữa vs 2 Banner Phụ bên phải).
* **Tầng 4 (Frontend Client):**
  - `web/src/app/page.tsx` line 429 có `setCustomBanners(ADMIN_DEFAULT_BANNERS);` khi API trả về rỗng (`items.length === 0`). Khi admin xóa hết banner hoặc xóa banner, hệ thống tự động fallback về banner mẫu làm banner cũ xuất hiện lại như ma.
  - Cột phải trên trang chủ (2 banner phụ: "Tuyển Tập Được Đọc Nhiều Nhất" và "Đọc Mọi Lúc Mọi Nơi") bị fix cứng tĩnh bằng thẻ `<Link>` tại `page.tsx` (lines 1279-1325), admin không thể thay đổi hay chọn vị trí hiển thị trong `AdminMarketingView`.
  - Admin form chưa có dropdown chọn vị trí: `HERO_SLIDER` (Banner chính giữa), `SUB_TOP` (Banner phụ trên), `SUB_BOTTOM` (Banner phụ dưới) và chưa có validation chống trùng vị trí cho các banner phụ.

#### 🔍 BUG-030: Giao Diện Nút Thao Tác Đơn Hàng Lổm Chổm & Lệch Chuẩn
* **Tầng 4 (Frontend Client):**
  - Nút Chat với Shop tại đầu card đơn hàng (`orders/page.tsx:651`) dùng class `bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200`, tạo vệt màu hồng/đỏ lạc điệu bên cạnh tên Shop.
  - Kiện hàng Ebook (`orders/[id]/page.tsx`): Nút "Mở Tủ Sách" dùng màu tím indigo (`bg-indigo-50 text-indigo-700`), nút "Đọc Ngay" dùng màu xanh tím (`bg-indigo-600 text-white`), nút "Mở Tủ Sách Cá Nhân" dùng màu xanh lá to bản không đồng bộ.
  - Các nút hành động đơn hàng ("Dặn Dò Shop", "In Biên Lai", "Hủy Đơn", "Hủy Kiện Này"): Nút Hủy Đơn dùng border đỏ thô, icon không đồng nhất về kích thước và khoảng cách.

#### 🔍 BUG-031: Tông Màu Vàng/Kem Lạc Điệu Tại Trang `order-success`
* **Tầng 4 (Frontend Client):**
  - Trang `web/src/app/order-success/page.tsx` sử dụng các class Material 3 cũ: `bg-surface-container-low`, `bg-surface-container-lowest`, `border-surface-variant`, `bg-primary hover:bg-[#922313]` khiến các card "Hành Trình Đọc Của Bạn Bắt Đầu Từ Đây" hiển thị màu kem/vàng úa, nút bấm màu đỏ nâu.
  - Cần quy chuẩn hóa về tông nền trắng tinh (`bg-white`), viền xám mảnh (`border-slate-200`), chữ đậm (`text-slate-900`) và điểm nhấn xanh ngọc HuKi (`#003B2B`).

---

### 2. Ma Trận Rủi Ro Domino (Domino Impact Assessment)

| Vùng Thay Đổi | Phân Hệ Liên Quan | Rủi Ro Tiềm Ẩn | Biện Pháp Kiểm Soát |
| :--- | :--- | :--- | :--- |
| Chuẩn hóa bộ lọc danh mục `/books` | URL SearchParams, Header search, Mobile drawer | Lệch tham số query giữa `cat` và `category` làm trang sách không hiển thị đúng | Hỗ trợ song song cả 2 tham số `category` và `cat`, so sánh linh hoạt qua cả slug, id và tên không dấu |
| Quản lý vị trí Banner trong Admin | API `/banners`, Trang chủ `page.tsx`, Cache LocalStorage | Xung đột vị trí hiển thị giữa Hero và Side banners; trang chủ bị trống banner nếu chưa cấu hình | Bổ sung quy chuẩn position encoding: `1..99` cho Hero Slider, `101` cho Sub Top, `102` cho Sub Bottom; nếu trống thì hiển thị placeholder tinh tế, không hồi sinh banner cũ |
| Chuẩn hóa UI Button đơn hàng | `orders/page.tsx`, `orders/[id]/page.tsx` | Mất tính năng modal xác nhận hủy hoặc link chat | Giữ nguyên 100% logic event handler & modal, chỉ tái cấu trúc Tailwind classes |
| Chuyển màu `order-success` sang tông trắng | In hóa đơn (`window.print`), Reader link | Vỡ giao diện khi in ấn hoặc vỡ responsive trên mobile | Giữ nguyên cấu trúc lưới và padding, chỉ thay thế palette màu nền và viền |

---

## 🎯 PHÂN CHIA GIAI ĐOẠN THỰC THI (TUÂN THỦ TỐI ĐA 3 BUG/CHẶNG)

* **Chặng 1 (Tính Năng & Logic Hệ Thống):**
  - **BUG-028:** Sửa triệt để bộ lọc danh mục sách từ trang chủ sang `/books`.
  - **BUG-029:** Quản lý vị trí hiển thị Banner (Hero Slider, Sub Top, Sub Bottom), validation chống trùng và xóa bỏ hoàn toàn fallback cứng.
* **Chặng 2 (Giao Diện & Chuẩn Hóa Design System):**
  - **BUG-030:** Chuẩn hóa toàn bộ UI nút thao tác đơn hàng (Nút Chat, Ebook actions, Hủy đơn/kiện).
  - **BUG-031:** Chuẩn hóa trang `order-success` sang tông màu trắng / slate đồng bộ với hệ sinh thái HuKi.

---

## 🧪 KẾT QUẢ THỰC HIỆN VÀ KIỂM THỬ E2E LOCAL (BƯỚC 4 & BƯỚC 5)

### 1. Chặng 1 E2E Test Suite (`scripts/test_e2e_sprint3_chang1.js`)
* **BUG-028 (Category SSOT):**
  - Dynamic fetch `catalogApi.getCategories()` lưu vào component state.
  - Đồng bộ `categoryId`, `categorySlug`, `categoryName` vào `CatalogBookItem`.
  - `aliasMap` hỗ trợ mapping 2 chiều linh hoạt: `kinh-doanh-tech`, `manga-comic-khac`, `tri-thuc`, `tam-ly-ky-nang`, `van-hoc`.
  - Sidebar `/books` hiển thị danh mục động theo DB với số lượng sản phẩm realtime.
* **BUG-029 (Banner Position Slot & Zero Fallback):**
  - Position slot encoding: `HERO_SLIDER` (1..99), `SUB_TOP` (101), `SUB_BOTTOM` (102).
  - Form Studio có dropdown chọn vị trí, hiển thị badge trực quan (`Phụ Trên`, `Phụ Dưới`).
  - Validation chống trùng vị trí: Cảnh báo và tự động chuyển banner cũ sang `hidden` khi người dùng phê duyệt thay thế.
  - Loại bỏ hoàn toàn fallback cứng `ADMIN_DEFAULT_BANNERS`, đảm bảo xóa banner là biến mất vĩnh viễn trên trang chủ.
* **Kết quả:** 8/8 Tests PASS (100%).

### 2. Chặng 2 E2E Test Suite (`scripts/test_e2e_sprint3_chang2.js`)
* **BUG-030 (Button Design System Standardization):**
  - Nút Chat tại `/orders`: Thay thế `bg-rose-50 text-rose-700` bằng `bg-emerald-50/80 text-[#003B2B] border-emerald-200`.
  - Action bar `/orders/[id]`: Chuẩn hóa nút "Dặn Dò Shop" đạt chiều cao chuẩn `h-9`, viền `border-slate-200` đồng bộ với "In Biên Lai" và "Hủy Đơn".
  - Kiện hàng Ebook: Banner DRM chuyển sang nền `bg-emerald-50/60`, nút "Mở Tủ Sách" dùng `bg-[#003B2B]`.
  - Nút "Đọc Ngay" dùng `h-8 bg-[#003B2B]`, nút "Hết Hạn Đổi Trả" dùng `h-8 bg-slate-100 text-slate-400 border-slate-200 opacity-60`.
  - Nút "Hủy Kiện Này": Chuyển sang `h-8 px-3 border-rose-200 text-rose-600 hover:bg-rose-50`.
  - Nút "Mở Tủ Sách Cá Nhân": Chuẩn hóa `h-9 bg-[#003B2B] text-white`.
* **BUG-031 (`order-success` Palette Cleanup):**
  - Xóa bỏ 100% token Material 3 cũ (`bg-surface-container`, `border-surface-variant`, `text-tertiary`).
  - Toàn bộ khối chi tiết kiện hàng, thanh tóm tắt chuyển sang thẻ trắng `bg-white border border-slate-200/80 rounded-2xl shadow-2xs`.
  - 3 bước hướng dẫn "Hành Trình Đọc Của Bạn Bắt Đầu Từ Đây" chuyển thành thẻ trắng, badge số xanh `bg-emerald-50 text-[#003B2B] border-emerald-200/80`.
  - Nút "Đăng Lên Bảng Tin Huki": Chuyển từ màu đỏ sang màu xanh thương hiệu HuKi `bg-[#003B2B]`.
* **Kết quả:** 9/9 Tests PASS (100%).

---

## 🛡️ BƯỚC 6: BỘ 4 CỔNG KIỂM SOÁT CHẤT LƯỢNG MÔ PHỎNG CI/CD (LOCAL CI/CD QUALITY GATES)

1. **Gate 1 - Vệ sinh Git & Whitespace:**
   - `git diff --check`: 0 whitespace errors, working tree sạch sẽ.
2. **Gate 2 - Lược đồ Prisma Đa Dịch Vụ:**
   - `npx prisma validate --schema apps/promotion-service/prisma/schema.prisma`: Hợp lệ 100% 🚀.
3. **Gate 3 - Backend Unit & Contract Tests:**
   - `npm --prefix platform test -- apps/promotion-service/src/modules/banners/banners.service.spec.ts`: 13/13 test cases PASS (100%).
4. **Gate 4 - Frontend Typecheck & Production Build:**
   - `npm --prefix web run typecheck`: 0 errors.
   - `npm --prefix web run build`: 141/141 static & dynamic routes compiled thành công trong 7.1s.
