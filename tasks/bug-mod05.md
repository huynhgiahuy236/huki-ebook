# BÁO CÁO TOÀN DIỆN LỖI KIỂM THỬ MOD-05: HỆ SINH THÁI TIẾP THỊ LIÊN KẾT (AFFILIATE & TRACKING ECOSYSTEM)

> **Mã Module:** `MOD-05`  
> **Tên Phân Hệ:** Hệ Sinh Thái Tiếp Thị Liên Kết & Theo Dõi Chuyển Đổi (Affiliate, Creator Commerce, Attribution Tracking & Settled Payouts)  
> **Quy Chuẩn Đối Soát:** `skill/.gemini/skills/ui-ux-pro-max` (Anti-AI Design & Editorial Polish) & `tasks/module-05-affiliate-ecosystem.md` (Creator Commerce Specification)  
> **Công Cụ & Phương Pháp Kiểm Thử:** Robot Playwright tự động hóa đa viewport (Mobile 390x844, Tablet 768x1024, Desktop 1440x900) kết hợp quét DOM, Network Interceptor, Console Error Catcher & Kiểm tra mã nguồn chi tiết.  
> **Phiên Xác Thực Thực Nghiệm:**  
> - Tài khoản KOC Tiếp thị: `tiepthilienket@gmail.com` (UUID: `4993e78c-2850-4ec4-9d27-2da9bae1fe2b`, Affiliate Code: `HUKI_HUY2026`)  
> - Tài khoản Nhà Xuất Bản / Seller: `seller@gmail.com` (Doanh nghiệp FAHASA: `d2caa7b1-1b82-49b9-be65-1fc6be42e472`)  
> - Tài khoản Quản Trị Sàn: `adminhuki@gmail.com` (Super Admin, Role: `PLATFORM_ADMIN`)  
> **Nguyên Tắc Bất Di Bất Dịch:** **Tuyệt đối KHÔNG tự ý sửa bất kỳ dòng code ứng dụng nào** (`web/src/*`, `platform/*`). Báo cáo này ghi nhận toàn diện **17 lỗi xác thực thực tế** (11 lỗi UI/UX & Responsive + 6 lỗi Chức Năng Sâu, Routing & Quyết Toán) để trình người dùng phê duyệt trước khi xử lý.

---

## 📊 BẢNG TỔNG HỢP DANH MỤC LỖI MOD-05

| Mã Bug | Mức Độ | Màn Hình / Vị Trí | Hiện Tượng Chính | Trạng Thái |
| :--- | :---: | :--- | :--- | :---: |
| **BUG-MOD05-01** | **P0** | Global Header Topbar (Tablet 768px) | Tràn thanh cuộn ngang Tablet +283px trên toàn bộ các route Affiliate (`scrollWidth: 1051px`) | **OPEN** |
| **BUG-MOD05-02** | **P0** | `/account/affiliate/links` (Mobile 390px) | Vỡ giao diện nghiêm trọng +623px do bảng dữ liệu link không có wrapper cuộn ngang | **OPEN** |
| **BUG-MOD05-03** | **P0** | Modal QR Code (`links` & `marketplace`) | Mã QR là icon giả lập, thiếu thư viện sinh QR code thật & thiếu nút tải ảnh vector cho KOC | **OPEN** |
| **BUG-MOD05-04** | **P1** | `/seller/affiliate` (Mobile 390px) | Thanh Tab Navigation và bảng hoa hồng Seller tràn màn hình +264px | **OPEN** |
| **BUG-MOD05-05** | **P1** | `/account/affiliate/marketplace` (Mobile 390px) | Tiêu đề Header kết hợp icon không ngắt dòng gây tràn lề ngang +40px | **OPEN** |
| **BUG-MOD05-06** | **P1** | `/affiliate` (Landing Giới Thiệu) | Mâu thuẫn trực tiếp giữa thông báo mở tiếp nhận hồ sơ và chú thích đóng cổng đăng ký | **OPEN** |
| **BUG-MOD05-07** | **P1** | Modal KYC Rút Tiền (`AffiliateKycModal.tsx`) | Hardcode ngày cấp/nơi cấp CCCD và thiếu hoàn toàn tính năng tải ảnh CCCD 2 mặt | **OPEN** |
| **BUG-MOD05-08** | **P1** | `/r/[shortCode]` (Redirect Engine) | Cookie attribution thiếu thuộc tính `Secure` và redirect client-side gây giật lag màn hình | **OPEN** |
| **BUG-MOD05-09** | **P2** | `BookAffiliateCard.tsx` (Card sách tiếp thị) | Dùng ngôn từ đa cấp rẻ tiền ("Tiếp Thị & Kiếm Tiền") vi phạm tiêu chuẩn Anti-AI | **OPEN** |
| **BUG-MOD05-10** | **P2** | `/account/affiliate/dashboard` & `links` | Lạm dụng hiệu ứng nhấp nháy `animate-pulse` trên badge trạng thái online | **OPEN** |
| **BUG-MOD05-11** | **P1** | Universal Defect (Tất cả 9 màn hình Affiliate) | Rò rỉ lỗi gọi API Reader Bookmarks 404 (`/api/reader/bookmarks/con-duong-phia-truoc`) | **OPEN** |
| **BUG-MOD05-12** | **P0** | `AffiliateAdminController` (`admin/affiliates`) | Route `@Get(':id')` đè tất cả các API tĩnh (Dashboard, Reconciliation, Payouts, Fraud, Health) với lỗi 404 Entity Not Found | **OPEN** |
| **BUG-MOD05-13** | **P0** | Trình tạo Link CTV (`/account/affiliate/links`) | `createLink` chỉ query `id: UUID`, crash 404 khi người dùng dán link dạng slug SEO thực tế (`/book/dac-nhan-tam`) | **OPEN** |
| **BUG-MOD05-14** | **P0** | Modal KYC Rút Tiền (`AffiliateKycModal.tsx`) | Frontend không gửi `frontImageUrl` và `backImageUrl`, backend ném 400 Validation Error chặn toàn bộ quy trình KYC & rút tiền | **OPEN** |
| **BUG-MOD05-15** | **P1** | Bàn Quản Trị Admin (`AdminAffiliatesView.tsx`) | Thiếu hoàn toàn giao diện & client API duyệt lệnh rút tiền Payouts, xét duyệt hồ sơ KYC và xử lý gian lận Fraud | **OPEN** |
| **BUG-MOD05-16** | **P0** | Vòng đời hoa hồng (`AffiliateLifecycleService`) | Khi đơn hàng bị hủy hoặc hoàn trả, hàm hủy hoa hồng `handleOrderCancelled` / `handleOrderItemRefunded` không bao giờ được gọi | **OPEN** |
| **BUG-MOD05-17** | **P1** | Card Tiếp Thị Sách (`BookAffiliateCard.tsx`) | API `commission-card` chỉ nhận UUID không nhận slug, đồng thời component bị cô lập không được nhúng vào trang `/book/[id]` | **OPEN** |

---

## 🔎 CHI TIẾT KỸ THUẬT 17 LỖI KIỂM THỬ XÁC THỰC THỰC TẾ

```
==================================================================================================
MÃ LỖI: BUG-MOD05-01 (Mức độ: P0 - Khẩn cấp)
VỊ TRÍ: web/src/ui/components/layout/Header.tsx
        Áp dụng trên toàn bộ 7 route có Header chung tại độ phân giải Tablet (768 x 1024):
        - /affiliate
        - /account/affiliate/register
        - /account/affiliate/application
        - /account/affiliate/dashboard
        - /account/affiliate/links
        - /account/affiliate/marketplace
        - /r/[shortCode]
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/ui/components/layout/Header.tsx (Container topbar điều hướng trên màn hình Tablet).
   - Selector phần tử vi phạm: div.flex.items-center.gap-3 (thuộc phần topbar header bên phải).
   - Breakpoint vi phạm: Tablet Portrait (Viewport 768 x 1024 px).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi robot Playwright kiểm tra bất kỳ màn hình nào trong 7 màn hình công khai/tài khoản Affiliate ở độ phân giải Tablet (768px), toàn bộ trang xuất hiện thanh cuộn ngang gây xô lệch giao diện với độ tràn +283px:
     * Chiều rộng cửa sổ (windowWidth): 768px.
     * Chiều rộng cuộn thực tế (scrollWidth): 1051px.
     * Độ tràn phát hiện (overflowPx): +283px.
   - Bằng chứng DOM Inspection từ Playwright Analyzer:
     * Phần tử: `div.flex.items-center.gap-3` có width: 527px, toạ độ right: 1051px (vượt 283px).
     * Phần tử con: `a.hover:text-[var(--theme-header-top-accent,#94f5d6)].transition-colors.flex` có toạ độ right: 1008px (vượt 240px).
     * Phần tử con: `span.material-symbols-outlined.text-[13px]` có toạ độ right: 922px (vượt 154px).
   - Người dùng sử dụng iPad/tablet khi truy cập sẽ bị giật khung hình và vuốt ngang ngoài ý muốn.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Thanh tiện ích phụ trên đầu trang Header (Topbar) chứa các liên kết tiện ích (Trung tâm trợ giúp, Tải ứng dụng, Kết nối tiếp thị, Tài khoản) được định dạng bằng `flex items-center gap-3` với chiều rộng nội dung tối thiểu vượt quá khoảng trống khả dụng ở kích thước 768px.
   - Lớp CSS responsive trên thẻ chưa áp dụng `hidden lg:flex` mà vẫn giữ `flex` ở breakpoint `md` (768px), đồng thời thẻ `<header>` hoặc `<nav>` bên ngoài không có thuộc tính cắt tràn `overflow-x-clip`, dẫn đến việc đẩy toàn bộ khung trang web ra 1051px.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Tại `web/src/ui/components/layout/Header.tsx`, gắn class ẩn responsive `hidden lg:flex` cho khối liên kết phụ trên topbar, chỉ hiển thị lại khi màn hình đạt từ `lg` (1024px) trở lên.
   - Bổ sung `overflow-x-clip` hoặc `max-w-full overflow-hidden` trên container bao ngoài của Top Header để ngăn triệt để hiện tượng dãn trang trên tablet.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng để tiến hành sửa code).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-02 (Mức độ: P0 - Nghiêm trọng)
VỊ TRÍ: web/src/app/account/affiliate/links/page.tsx (Dòng 411 - 500)
        Màn hình: Quản Lý & Tạo Link Rút Gọn Tiếp Thị (/account/affiliate/links)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/account/affiliate/links/page.tsx
   - Component: `AffiliateLinksPage` bọc trong `AccountLayout` và `GroupedDataTable<AffiliateLinkItem>`.
   - Breakpoint vi phạm: Mobile Portrait (Viewport 390 x 844 px).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi KOC / Bạn đọc truy cập trang quản lý link trên điện thoại di động (390px), toàn bộ trang bị kéo dãn nghiêm trọng ra tới 1013px (+623px chiều rộng tràn):
     * Chiều rộng cửa sổ (windowWidth): 390px.
     * Chiều rộng cuộn thực tế (scrollWidth): 1013px.
     * Mức độ tràn: +623px (gấp hơn 2.5 lần màn hình điện thoại).
   - Bằng chứng DOM Inspection từ Playwright:
     * `main.flex-1.min-w-0.bg-white`: width = 999px, right = 1013px (vượt 623px).
     * `div.w-full.space-y-6.font-sans`: width = 997px, right = 1012px (vượt 622px).
     * `div.flex.flex-col.sm:flex-row`: width = 981px, right = 1004px (vượt 614px).
   - Hậu quả: Giao diện trên điện thoại bị vỡ hoàn toàn, các nút bấm tạo link và filter bị trôi dạt ra xa màn hình, thao tác cảm ứng gần như tê liệt.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Bảng dữ liệu `GroupedDataTable` hiển thị 5 cột nghiệp vụ với độ rộng cố định: `shortCode` (200px) + `target` (minWidth 240px) + `campaign` (170px) + `performance` (170px) + `actions` (130px) cùng 2 cột checkbox chọn hàng và nút mũi tên mở rộng (~100px) $\rightarrow$ Tổng chiều rộng thực tế của bảng đạt xấp xỉ 1010px.
   - Thẻ `<GroupedDataTable>` trong `AffiliateLinksPage` được đặt trực tiếp trong container `div.w-full` mà không có thẻ bọc cuộn ngang chuyên dụng (`overflow-x-auto min-w-0 max-w-full`). Đồng thời `AccountLayout` không giới hạn `max-w-full`, khiến bảng kéo dãn toàn bộ thẻ `main` của ứng dụng.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Bọc thẻ `<GroupedDataTable>` bên trong một container cuộn độc lập:
     ```tsx
     <div className="w-full max-w-full overflow-x-auto min-w-0 rounded-2xl border border-slate-200">
       <GroupedDataTable<AffiliateLinkItem> ... />
     </div>
     ```
   - Tối ưu hóa trải nghiệm BookToker trên Mobile: Trên màn hình `< 640px`, chuyển bảng sang hiển thị dạng danh sách thẻ thu gọn (Mobile Creator Link Cards) với nút copy 1 chạm và mã QR hiển thị trực quan, không bắt buộc người dùng điện thoại phải cuộn ngang bảng table máy tính.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-03 (Mức độ: P0 - Lỗi Nghiệp Vụ & Specification)
VỊ TRÍ: web/src/app/account/affiliate/links/page.tsx (Dòng 611 - 618) &
        web/src/app/account/affiliate/marketplace/page.tsx (Dòng 518 - 540)
        Màn hình: Modal Hiển Thị Mã QR Tiếp Thị (QR Code Sharing Modal)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/account/affiliate/links/page.tsx (Modal `qrModalLink`).
   - File: web/src/app/account/affiliate/marketplace/page.tsx (Modal `qrModalData`).
   - Component: Hộp thoại chia sẻ QR Code khi KOC bấm "Mở Mã QR".

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Theo tài liệu đặc tả Creator Commerce Specification (`tasks/module-05-affiliate-ecosystem.md`, Mục 3, Dòng 28):
     *"Tải ảnh QR Code sắc nét: Tạo mã QR Code độ phân giải cao vector (SVG/PNG 1000px) có nhúng logo HUKI ở tâm, sẵn sàng cho KOC in ấn hoặc chèn vào video review sách."*
   - Thực tế kiểm thử trên mã nguồn và UI:
     * Hộp thoại QR chỉ hiển thị một biểu tượng font chữ thô:
       `<span className="material-symbols-outlined text-6xl text-emerald-800">qr_code_2</span>`
       cùng dòng text mã link `/r/{shortCode}` bên dưới.
     * Hoàn toàn KHÔNG có bất kỳ ma trận điểm ảnh 2D QR Code thực tế nào được sinh ra. Camera điện thoại và ứng dụng quét mã Zalo/Ngân hàng không thể nhận diện hay quét được đường dẫn.
     * Hoàn toàn thiếu nút bấm "Tải ảnh QR (PNG/SVG 1000px)" phục vụ BookToker và Reviewer sách tải về chèn vào clip hoặc in bookmark.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Developer xây dựng khung giao diện tạm thời (stub placeholder) bằng icon Material Symbol mà chưa tích hợp module/thư viện render mã vạch QR thực thụ dạng Canvas hoặc SVG vector.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Cài đặt/Tích hợp module render QR Code SVG chuẩn (như `qrcode.react` hoặc endpoint `/api/qr?url=...` nội bộ).
   - Cấu hình nhúng logo HuKi vào tâm ma trận QR với tỷ lệ tương phản đạt chuẩn WCAG AA.
   - Thêm nút hành động "Tải Ảnh QR Sắc Nét (PNG 1000px)" cho phép KOC tải ngay ảnh về máy với 1 cú click chuột.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-04 (Mức độ: P1 - Giao Diện & Tương Tác)
VỊ TRÍ: web/src/app/seller/affiliate/page.tsx (Dòng 759 - 793)
        Màn hình: Cấu Hình Hoa Hồng & Tiếp Thị Từ Kênh NXB (/seller/affiliate)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/seller/affiliate/page.tsx
   - Component: Thanh chuyển tab điều hướng (`DASHBOARD` | `BOOKS` | `SETTINGS`) và bảng danh mục chiết khấu sách NXB.
   - Breakpoint vi phạm: Mobile (390 x 844 px).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Trên Mobile (390px), giao diện quản lý tiếp thị của Nhà Xuất Bản bị tràn màn hình +264px:
     * Chiều rộng cuộn thực tế: 654px vs Chiều rộng khung nhìn: 390px.
     * Element gây tràn phát hiện:
       - Tab button 1: `button.px-5.py-3.text-sm` (width: 107px, right: 395px, tràn 5px).
       - Tab button 2: `button.px-5.py-3.text-sm` ("Danh mục sách & Trạng thái hoa hồng", right: 537px, tràn 147px).
       - Bảng dữ liệu sách: `table.w-full.text-left.text-xs` (width: 613px, right: 654px, tràn 264px).
   - Thanh điều hướng tab bị cắt cụt, người dùng trên điện thoại không nhìn thấy nút chuyển sang tab "Cấu hình gian hàng" nếu không vô tình vuốt ngang toàn bộ trang web.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Khung chứa các nút bấm tab:
     `<div className="flex border-b border-slate-200">`
     không khai báo `overflow-x-auto`, không có `scrollbar-none`, và các nút `<button>` con không có thuộc tính chống co giãn `shrink-0`. Tổng độ rộng văn bản của 3 tab (~640px) vượt xa kích thước 390px của điện thoại.
   - Bảng danh mục sách bên dưới thiếu container bọc `w-full overflow-x-auto`.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Cập nhật container tab thành:
     ```tsx
     <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none flex-nowrap w-full -mx-2 px-2 sm:mx-0 sm:px-0">
       <button className="... shrink-0">Hiệu quả tiếp thị (Dashboard)</button>
       <button className="... shrink-0">Danh mục sách ({totalBooks})</button>
       <button className="... shrink-0">Cấu hình gian hàng</button>
     </div>
     ```
   - Bọc toàn bộ bảng dữ liệu sách trong thẻ cuộn `overflow-x-auto` tiêu chuẩn B2B.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-05 (Mức độ: P1 - Giao Diện)
VỊ TRÍ: web/src/app/account/affiliate/marketplace/page.tsx (Dòng 160 - 166)
        Màn hình: Chợ Chiến Dịch Sách Tiếp Thị Hoa Hồng Cao (/account/affiliate/marketplace)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/account/affiliate/marketplace/page.tsx
   - Phần tử: Thẻ tiêu đề h1 kết hợp icon trong khối Header trang.
   - Breakpoint vi phạm: Mobile Portrait (390 x 844 px).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Trên Mobile 390px, trang bị tràn nhẹ thanh cuộn ngang +40px:
     * Chiều rộng cuộn thực tế: 430px vs Cửa sổ: 390px.
   - Báo cáo Playwright chỉ rõ:
     `h1.text-xl.sm:text-2xl.font-bold` có width: 398px, right: 421px (+31px overflow) do chứa chuỗi ký tự dài: *"Kho Sách Tiếp Thị & Mức Hoa Hồng Thực Tế"* kết hợp icon `storefront` trên cùng một hàng flex không ngắt dòng, cộng với padding lề trang khiến tiêu đề đẩy lề phải ra ngoài 40px.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Thẻ `<h1>` không có class `min-w-0` và `break-words`, đồng thời container cha `flex items-center gap-2` thiếu `flex-wrap`, ép text hiển thị trên một hàng thẳng khi màn hình hẹp.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Điều chỉnh cấu trúc tiêu đề:
     ```tsx
     <h1 className="text-lg sm:text-2xl font-bold text-gray-900 flex items-center gap-2 min-w-0 flex-wrap">
       <span className="material-symbols-outlined text-emerald-700 text-[24px] shrink-0">storefront</span>
       <span className="break-words">Kho Sách Tiếp Thị &amp; Hoa Hồng Thực Tế</span>
     </h1>
     ```

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-06 (Mức độ: P1 - Nội Dung & Sự Nhất Quán)
VỊ TRÍ: web/src/app/affiliate/page.tsx (Dòng 75 vs Dòng 220 - 239)
        Màn hình: Landing Giới Thiệu Đối Tác Tiếp Thị (/affiliate)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/affiliate/page.tsx
   - Khối Notice Banner đầu trang (dòng 72-77) và Khối Bottom CTA Banner đáy trang (dòng 220-240).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Tồn tại sự mâu thuẫn trực tiếp và khó hiểu về thông tin cổng tiếp nhận đối tác:
     * Ở Notice Banner đầu trang (dòng 75):
       `"Cổng Đối Tác Mở Tiếp Nhận: Đăng ký tham gia mạng lưới Tiếp thị liên kết HuKi Ebook — Nhận hoa hồng đến 20%, đối soát minh bạch, duyệt hồ sơ trong 24h–48h."`
     * Ở Hero Section (dòng 119):
       Nút bấm hành động: `"Đăng Ký Tham Gia Ngay"` trỏ tới `/account/affiliate/register`.
     * Nhưng ở Bottom CTA Banner đáy trang (dòng 230-238):
       Tiêu đề: `"Tìm Hiểu Chương Trình Đối Tác Tiếp Thị HuKi"`
       Mô tả: `"Xem trước quy trình 4 bước chuẩn bị hồ sơ... trước khi cổng đăng ký mở chính thức."`
       Nút bấm: `"Xem trước mẫu đăng ký"`
       Dòng chú thích: `"**(Cổng đăng ký chưa mở tiếp nhận chính thức)**"`
   - Người dùng và KOC khi đọc trang web sẽ hoang mang, không rõ chương trình tiếp thị đã chính thức hoạt động hay mới chỉ là bản thử nghiệm chưa mở.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Đoạn mã banner ở chân trang là tàn dư từ giai đoạn phát triển sơ khai (draft phase) chưa được cập nhật đồng bộ khi hoàn thiện tính năng đăng ký và xét duyệt đối tác.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Xóa bỏ hoàn toàn dòng text `(Cổng đăng ký chưa mở tiếp nhận chính thức)` và câu văn `trước khi cổng đăng ký mở chính thức`.
   - Đồng bộ nội dung Bottom CTA Banner:
     * Tiêu đề: "Sẵn Sàng Lan Tỏa Văn Hóa Đọc Cùng HuKi Partner?"
     * Mô tả: "Đăng ký hồ sơ trực tuyến hoàn toàn miễn phí, nhận mã đối tác và bắt đầu tạo link tiếp thị sách bản quyền ngay hôm nay."
     * Nút bấm: "Đăng Ký Tham Gia Ngay" trỏ thẳng về `/account/affiliate/register`.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-07 (Mức độ: P1 - Lỗi Nghiệp Vụ Định Danh Tài Chính)
VỊ TRÍ: web/src/ui/components/affiliate/AffiliateKycModal.tsx (Dòng 76 - 85)
        Component: Hộp Thoại KYC & Cài Đặt Tài Khoản Ngân Hàng Rút Hoa Hồng
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/ui/components/affiliate/AffiliateKycModal.tsx
   - Hàm xử lý: `handleSubmit` khi gửi dữ liệu KYC tài khoản ngân hàng đối tác.

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi người dùng hoàn thành biểu mẫu KYC và bấm "Lưu thông tin", mã nguồn gửi payload hardcode cố định:
     ```ts
     idCardIssueDate: '2023-01-15',
     idCardIssuePlace: 'Cục Cảnh sát QLHC về TTXH',
     ```
   - Không có trường nhập liệu thực tế cho ngày cấp và nơi cấp CCCD.
   - Biểu mẫu hoàn toàn KHÔNG có 2 khung tải ảnh CCCD/CMND mặt trước và mặt sau, vi phạm trực tiếp đặc tả Creator Commerce Spec (`module-05-affiliate-ecosystem.md`, Dòng 81):
     *"Modal xác thực danh tính KYC (AffiliateKycModal.tsx): Kiểm tra tải ảnh CCCD 2 mặt đảm bảo danh tính minh bạch."*
   - Hậu quả: Hệ thống lưu dữ liệu giả lập cho mọi đối tác, gây rủi ro pháp lý và tranh chấp về thuế TNCN khi quyết toán chi trả hoa hồng thực tế.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Developer xây dựng modal theo dạng biểu mẫu rút gọn để test nhanh luồng nhập số tài khoản ngân hàng, chưa tích hợp các trường thông tin pháp lý CCCD và component upload ảnh tài liệu.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Bổ sung 2 trường nhập: Ngày cấp CCCD (`idCardIssueDate` - date picker) và Nơi cấp (`idCardIssuePlace` - text input).
   - Tích hợp 2 khung kéo thả ảnh tài liệu: Ảnh mặt trước CCCD (`idCardFrontImage`) và Ảnh mặt sau CCCD (`idCardBackImage`) có tính năng xem trước (preview thumbnail sắc nét) và giới hạn dung lượng tải lên an toàn (tối đa 5MB, định dạng JPG/PNG/WebP).

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-08 (Mức độ: P1 - Tracking Attribution & Hiệu Năng)
VỊ TRÍ: web/src/app/r/[shortCode]/page.tsx (Dòng 37 - 39 & Dòng 61 - 69)
        Màn hình: Bộ Định Tuyến Rút Gọn Link & Lưu Trữ Cookie Đối Soát (/r/[shortCode])
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/r/[shortCode]/page.tsx
   - Logic lưu cookie phân bổ (`document.cookie`) và chuyển hướng trang đích (`router.replace`).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Mã nguồn ghi nhận cookie lưu trữ phiên tiếp thị bằng Javascript client-side:
     ```ts
     document.cookie = `huki_aff_click=${encodeURIComponent(
       token,
     )}; path=/; max-age=${maxAge}; SameSite=Lax`;
     ```
   - Lỗ hổng 1: Chuỗi cookie thiếu cờ `; Secure`. Trong môi trường thực tế, khi KOC BookTok đặt link trong bio TikTok, Instagram hoặc video YouTube, người dùng mở link trong trình duyệt nhúng (In-App Browser/WebView) chạy HTTPS. Việc thiếu cờ `Secure` có thể khiến trình duyệt chặn hoặc không gửi kèm cookie khi người dùng hoàn tất giỏ hàng thanh toán sau đó.
   - Lỗ hổng 2: Sử dụng Client Component với `setTimeout(..., 400)` để chuyển hướng:
     Người mua click vào link rút gọn sẽ bị giữ lại 400ms trên một trang trắng với vòng xoay loading, gây giảm tỷ lệ chuyển đổi (drop-off rate). Trong môi trường thương mại điện tử, redirect rút gọn link cần diễn ra dưới 50ms thông qua HTTP 302 Found Server-side.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Tuyến đường `/r/[shortCode]` được triển khai dưới dạng Next.js Client Page thay vì tận dụng Next.js Route Handler / Middleware để trả về HTTP Header `Set-Cookie` và `Location` trực tiếp từ server.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Bổ sung cờ `; Secure` vào chuỗi cookie client-side nếu chạy trên HTTPS:
     ```ts
     const secureFlag = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
     document.cookie = `huki_aff_click=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
     ```
   - Khuyến nghị nâng cấp: Chuyển logic giải mã shortCode sang `web/src/app/r/[shortCode]/route.ts` (Next.js App Router Route Handler) để trả về phản hồi 302 Redirect tức thì kèm header `Set-Cookie: huki_aff_click=...; Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly`.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-09 (Mức độ: P2 - Tiêu Chuẩn Thiết Kế Anti-AI & Thẩm Mỹ)
VỊ TRÍ: web/src/ui/components/affiliate/BookAffiliateCard.tsx (Dòng 236)
        Component: Thẻ Tiếp Thị Gắn Trên Trang Chi Tiết Sách (/book/[slug])
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/ui/components/affiliate/BookAffiliateCard.tsx
   - Khối Banner dành cho khách vãng lai hoặc độc giả chưa đăng ký CTV (dòng 228-257).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Đối với người dùng chưa đăng nhập, thẻ hiển thị tiêu đề:
     `<h4 className="text-xs font-bold text-gray-900 truncate">Tiếp Thị &amp; Kiếm Tiền</h4>`
     kèm icon bao tải tiền hoạt hình `<span className="material-symbols-outlined text-[16px]">monetization_on</span>`.
   - Vi phạm tiêu chuẩn thiết kế Anti-AI Creator Commerce (`tasks/module-05-affiliate-ecosystem.md`, Dòng 15-18):
     *"Cấm các hiệu ứng pháo hoa, vệt sáng chói chang lấp lánh kiểu AI, các biểu tượng bao tải tiền hoạt hình lòe loẹt. Tiếp thị sách HUKI hướng đến tính trí tuệ, lan tỏa văn hóa đọc, giao diện phải thanh lịch, tao nhã."*
   - Cụm từ "Tiếp Thị & Kiếm Tiền" mang sắc thái của các nền tảng đa cấp / crypto AI rẻ tiền, làm giảm uy tín của sàn sách bản quyền cao cấp.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Soạn thảo văn bản giao diện ban đầu theo quán tính copywriting thương mại thông thường, chưa áp dụng chuẩn mực biên tập tri thức (Knowledge Editorial Voice).

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Thay đổi tiêu đề thành: `"Lan Tỏa Sách Hay & Nhận Hoa Hồng"` hoặc `"Chương Trình Giới Thiệu Sách HuKi Partner"`.
   - Thay icon `monetization_on` thành `menu_book` hoặc `auto_stories` với tông màu Forest Green `#003B2B` thanh nhã.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-10 (Mức độ: P2 - Tiêu Chuẩn Thiết Kế Anti-AI)
VỊ TRÍ: web/src/app/account/affiliate/dashboard/page.tsx (Dòng 175) &
        web/src/app/account/affiliate/links/page.tsx
        Màn hình: Bảng Điều Khiển CTV & Quản Lý Liên Kết Tiếp Thị
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/account/affiliate/dashboard/page.tsx (dòng 175).
   - Phần tử: Huy hiệu trạng thái "Đang hoạt động" của tài khoản CTV.

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Huy hiệu sử dụng chấm tròn với hiệu ứng nhấp nháy liên tục không dừng:
     `<span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1 animate-pulse"></span>`
   - Hiệu ứng `animate-pulse` nhấp nháy lặp đi lặp lại vô tận trên trang quản trị tạo cảm giác xao nhãng mắt, mất tập trung cho người dùng và là dấu hiệu điển hình của các template AI dựng sẵn.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Lạm dụng utility class animation của Tailwind CSS để biểu thị trạng thái online thay vì sử dụng thiết kế chấm tròn tĩnh thanh lịch.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Loại bỏ class `animate-pulse`, chuyển thành chấm tròn màu xanh ngọc tĩnh:
     `<span className="w-2 h-2 rounded-full bg-[#00875A] mr-1.5 shrink-0 inline-block"></span>`

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-11 (Mức độ: P1 - Universal Cross-Portal Defect)
VỊ TRÍ: web/src/ui/context/ReaderSyncProvider.tsx
        Xuất hiện trên toàn bộ 9 màn hình của Hệ Sinh Thái Tiếp Thị Liên Kết:
        - /affiliate
        - /account/affiliate/register
        - /account/affiliate/application
        - /account/affiliate/dashboard
        - /account/affiliate/links
        - /account/affiliate/marketplace
        - /r/[shortCode]
        - /seller/affiliate
        - /admin/affiliates
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/ui/context/ReaderSyncProvider.tsx (Được khai báo toàn cục trong `RootLayout`).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Trong quá trình robot Playwright kiểm thử 27 lượt truy cập trên cả 3 viewport (Mobile, Tablet, Desktop) của MOD-05, console trình duyệt liên tục bắt được các chuỗi lỗi mạng đỏ rực:
     `Failed to load resource: the server responded with a status of 404 (Not Found)`
     `GET /api/reader/bookmarks/con-duong-phia-truoc 404 (Not Found)`
     `GET /api/reader/progress 404 (Not Found)`
   - Tổng cộng hơn 50 lượt gọi request lỗi vô nghĩa tới API reader bookmarks mặc dù người dùng đang ở trang quản trị tiếp thị, sàn chợ sách KOC hoặc trang quản trị admin.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - `ReaderSyncProvider` được bọc ngoài cùng tại `app/layout.tsx` cho toàn bộ ứng dụng HuKi. Hook `useEffect` bên trong provider tự động bắn API lấy tiến độ đọc và bookmark của cuốn sách demo `con-duong-phia-truoc` mà hoàn toàn không kiểm tra xem URL hiện tại có thuộc phân hệ đọc sách (`/reader/*`) hay không.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Tại `web/src/ui/context/ReaderSyncProvider.tsx`, sử dụng hook `usePathname()` của Next.js:
     ```tsx
     const pathname = usePathname();
     if (!pathname || !pathname.startsWith('/reader')) {
       return <>{children}</>;
     }
     ```
   - Đây là lỗi dùng chung đã được ghi nhận trên cả 5 phân hệ (MOD-01, MOD-02, MOD-03, MOD-04, MOD-05).

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Được gộp vào danh mục xử lý nền tảng cốt lõi).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-12 (Mức độ: P0 - Routing Mismatch & Backend Route Shadowing)
VỊ TRÍ: platform/apps/commerce-service/src/modules/affiliate/controllers/affiliate-admin.controller.ts (Dòng 76)
        Áp dụng cho toàn bộ các endpoint GET quản trị:
        - GET /api/v1/admin/affiliates/dashboard
        - GET /api/v1/admin/affiliates/reconciliation
        - GET /api/v1/admin/affiliates/payouts
        - GET /api/v1/admin/affiliates/fraud
        - GET /api/v1/admin/affiliates/health
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: platform/apps/commerce-service/src/modules/affiliate/controllers/affiliate-admin.controller.ts
   - Khai báo route wildcard: Dòng 76 `@Get(':id') getApplicationDetail(@Param('id') id: string)`.
   - Các route tĩnh bị che phủ: Dòng 262 (`reconciliation`), Dòng 279 (`dashboard`), Dòng 328 (`payouts`), Dòng 372 (`fraud`), Dòng 413 (`health`).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi Super Admin hoặc hệ thống gửi request GET tới các API nghiệp vụ quan trọng của Admin Affiliate:
     * `GET /api/v1/admin/affiliates/dashboard`
     * `GET /api/v1/admin/affiliates/reconciliation`
     * `GET /api/v1/admin/affiliates/payouts`
     * `GET /api/v1/admin/affiliates/fraud`
     * `GET /api/v1/admin/affiliates/health`
   - Toàn bộ các request này đều thất bại với HTTP 404 Entity Not Found:
     ```json
     {
       "status": "error",
       "statusCode": 404,
       "code": "SYSTEM_ERROR",
       "message": "Không tìm thấy hồ sơ đối tác với ID: dashboard",
       "path": "/api/v1/admin/affiliates/dashboard",
       "requestId": "e6691c1b-e282-4660-a6ce-1e91a9638ebd",
       "timestamp": "2026-11-03T22:51:15.647Z"
     }
     ```
   - Hậu quả: Bàn điều khiển tổng quan Admin Affiliate, báo cáo đối soát EOD, danh sách hàng đợi yêu cầu rút tiền của CTV, danh sách cảnh báo gian lận và health check hệ thống hoàn toàn bị tê liệt 100%.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Trong framework NestJS / Express, cơ chế định tuyến (router) khớp đường dẫn theo thứ tự khai báo từ trên xuống dưới trong controller.
   - Route tham số biến đổi `@Get(':id')` được đặt ở dòng 76, trong khi các route tĩnh như `@Get('dashboard')`, `@Get('payouts')`, `@Get('reconciliation')` lại được đặt ở các dòng 260 - 415. Khi một request tới `/admin/affiliates/dashboard`, router lập tức coi `"dashboard"` là giá trị của param `:id` và gọi hàm `getApplicationDetail("dashboard")`, thay vì chạy hàm `getAdminDashboard()`.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Di chuyển định nghĩa `@Get(':id')` và các route con của nó xuống cuối cùng của file `AffiliateAdminController`, đặt sau tất cả các route tĩnh cụ thể (`dashboard`, `reconciliation`, `payouts`, `fraud`, `health`, `reports/export`, `wallets/:profileId`).

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Đã xác minh thực nghiệm trên live service).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-13 (Mức độ: P0 - Lỗi Nghiệp Vụ Sinh Link Tiếp Thị)
VỊ TRÍ: platform/apps/commerce-service/src/modules/affiliate/services/affiliate-link.service.ts (Dòng 74 - 93 & Dòng 685 - 692)
        Màn hình: Trình Tạo Link Rút Gọn Tiếp Thị (/account/affiliate/links)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: platform/apps/commerce-service/src/modules/affiliate/services/affiliate-link.service.ts
   - Hàm phân tích URL: `parseTargetUrl` (dòng 685-692) và hàm tạo link: `createLink` (dòng 82-93).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi KOC / BookToker sao chép đường dẫn sách thực tế từ thanh địa chỉ trình duyệt (ví dụ: `https://huki.vn/book/dac-nhan-tam` hoặc `https://huki.vn/book/con-duong-hoi-giao`) và dán vào form "Tạo link tiếp thị", hệ thống lập tức báo lỗi đỏ và từ chối:
     `Status: 404 Not Found`
     ```json
     {
       "status": "error",
       "statusCode": 404,
       "code": "SYSTEM_ERROR",
       "message": "Sách không tồn tại trong hệ thống",
       "path": "/api/v1/affiliate/links"
     }
     ```
   - Trong khi đó, nếu người dùng dán đường dẫn chứa UUID nội bộ `https://huki.vn/book/b0000002-0000-4000-8000-000000000002` thì lại tạo thành công (HTTP 201 Created, sinh ra shortCode `dac_nhan_tam_2026`).
   - Người dùng thông thường và KOC trên sàn KHÔNG BAO GIỜ biết hoặc nhìn thấy UUID dạng `b0000002-...`, họ chỉ có thể copy đường dẫn có chứa slug SEO `dac-nhan-tam`. Do đó, 100% người dùng thực tế đều bị lỗi 404 khi tạo link tiếp thị cho bất kỳ cuốn sách nào!

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Regex `clean.match(/\/(?:book|books)\/([a-zA-Z0-9_-]+)/)` trích xuất chuỗi slug (ví dụ: `'dac-nhan-tam'`) và gán vào `targetBookId`.
   - Tại `createLink` (dòng 83), service chỉ thực hiện duy nhất câu lệnh:
     `this.prisma.book.findUnique({ where: { id: parsedTarget.targetBookId } })`
     mà hoàn toàn KHÔNG kiểm tra trường `slug`:
     `this.prisma.book.findFirst({ where: { OR: [{ id: parsedTarget.targetBookId }, { slug: parsedTarget.targetBookId }] } })`.
   - Do chuỗi slug không khớp với bất kỳ khóa chính `id` nào trong bảng `books`, câu lệnh trả về `null` và ném ra lỗi `NotFoundException('Sách không tồn tại trong hệ thống')`.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Sửa logic tìm sách trong `affiliate-link.service.ts`:
     ```typescript
     const book = await this.prisma.book.findFirst({
       where: {
         OR: [
           { id: parsedTarget.targetBookId },
           { slug: parsedTarget.targetBookId },
         ],
       },
       include: { affiliateSetting: true },
     });
     ```
   - Đồng thời khi lưu bản ghi `affiliateLink`, gán `targetBookId: book.id` (UUID thực sự của sách) để đảm bảo toàn vẹn dữ liệu quan hệ khóa ngoại.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Đã xác minh thực nghiệm trên live service).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-14 (Mức độ: P0 - Lỗi Khóa Chặn Định Danh KYC & Rút Tiền)
VỊ TRÍ: web/src/ui/components/affiliate/AffiliateKycModal.tsx (Dòng 76 - 85) &
        platform/apps/commerce-service/src/modules/affiliate/dto/affiliate-payout.dto.ts (Dòng 30 - 37)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - Frontend: `web/src/ui/components/affiliate/AffiliateKycModal.tsx` (Hàm `handleSubmit`).
   - Backend DTO: `platform/apps/commerce-service/src/modules/affiliate/dto/affiliate-payout.dto.ts` (`SubmitKycDto`).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi CTV mở modal KYC từ `/account/affiliate/dashboard` hoặc `/account/affiliate/application`, điền đầy đủ số tài khoản ngân hàng và bấm "Lưu thông tin", hệ thống báo lỗi thất bại:
     `Status: 400 Bad Request`
     ```json
     {
       "status": "error",
       "statusCode": 400,
       "code": "VALIDATION_ERROR",
       "message": "Validation failed",
       "path": "/api/v1/affiliate/kyc",
       "details": [
         { "field": "frontImageUrl", "code": "VALIDATION_ERROR", "message": "frontImageUrl should not be empty" },
         { "field": "frontImageUrl", "code": "VALIDATION_ERROR", "message": "frontImageUrl must be a string" },
         { "field": "backImageUrl", "code": "VALIDATION_ERROR", "message": "backImageUrl should not be empty" },
         { "field": "backImageUrl", "code": "VALIDATION_ERROR", "message": "backImageUrl must be a string" }
       ]
     }
     ```
   - Hậu quả nghiêm trọng: Do KYC bị lỗi 400 và không thể hoàn tất, điều kiện tiên quyết trong `AffiliatePayoutService.createPayoutRequest`:
     `if (!kycStatus.isVerified || !kycStatus.bankSnapshot) throw new ForbiddenException('Bạn cần hoàn tất xác minh danh tính và tài khoản ngân hàng (KYC) trước khi tạo yêu cầu rút tiền')`
     luôn luôn chặn đứng mọi yêu cầu rút tiền của toàn bộ mạng lưới CTV!

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Backend `SubmitKycDto` khai báo bắt buộc phải có 2 trường ảnh CCCD:
     `@IsString() @IsNotEmpty() frontImageUrl: string;`
     `@IsString() @IsNotEmpty() backImageUrl: string;`
   - Nhưng frontend `AffiliateKycModal.tsx` chỉ là form rút gọn gửi thông tin tài khoản ngân hàng, hoàn toàn không có component upload ảnh và không truyền `frontImageUrl`, `backImageUrl` trong payload gửi lên API.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Bổ sung 2 component upload ảnh (mặt trước & mặt sau CCCD) trên `AffiliateKycModal.tsx` với tính năng chọn file ảnh, tải lên cloud storage (hoặc S3/MinIO bucket) và lấy URL gán vào `frontImageUrl`, `backImageUrl`.
   - Trong trường hợp CTV chỉ muốn cập nhật thông tin tài khoản ngân hàng nhận tiền mà chưa KYC CCCD đầy đủ, tách thành 2 DTO/API riêng biệt: `UpdateBankPayoutAccountDto` (chỉ cập nhật STK) và `SubmitKycDto` (xác thực pháp lý CCCD kèm ảnh).

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Đã xác minh thực nghiệm trên live service).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-15 (Mức độ: P1 - Thiếu Tính Năng Quản Trị & API Client Quyết Toán)
VỊ TRÍ: web/src/ui/components/admin/AdminAffiliatesView.tsx &
        web/src/lib/affiliate/affiliateApi.ts
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - Frontend Component: `web/src/ui/components/admin/AdminAffiliatesView.tsx`.
   - API Client: `web/src/lib/affiliate/affiliateApi.ts`.

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Theo tài liệu đặc tả `tasks/module-05-affiliate-ecosystem.md`, Screen 3.3 quy định Ban Quản Trị sàn có trách nhiệm:
     * Duyệt đơn đăng ký CTV mới.
     * Duyệt chi lệnh rút tiền hoa hồng của CTV (Payouts queue & approval).
     * Phê duyệt hồ sơ định danh KYC CCCD.
     * Giám sát và xử lý cảnh báo gian lận (Fraud Detection & Self-referral cases).
   - Thực tế kiểm thử trên giao diện Admin:
     * `AdminAffiliatesView.tsx` chỉ có 1 bảng duy nhất hiển thị danh sách hồ sơ đăng ký (`applications`). Hoàn toàn KHÔNG CÓ tab, modal hoặc giao diện nào để:
       - Xem danh sách yêu cầu rút tiền (`/admin/affiliates/payouts`).
       - Bấm nút Duyệt/Từ chối chi trả hoa hồng.
       - Xem ảnh CCCD để duyệt KYC đối tác (`/admin/affiliates/kyc/:profileId/review`).
       - Xem danh sách vụ việc gian lận (`/admin/affiliates/fraud`).
     * Trong file `affiliateApi.ts`, hoàn toàn thiếu các hàm gọi các endpoint này: `adminListPayouts`, `adminApprovePayout`, `adminRejectPayout`, `adminReviewKyc`, `adminListFraudCases`.
   - Hậu quả: Khi CTV yêu cầu rút hoa hồng, yêu cầu đó nằm vĩnh viễn trong database mà admin không có cách nào thao tác trên portal để duyệt chi.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Đội ngũ phát triển mới chỉ xây dựng Phase 1 (duyệt đơn CTV) trên giao diện admin, bỏ quên việc tích hợp các API Phase 7, 8, 9 (Payouts, Fraud, KYC Review) vào frontend.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Bổ sung 3 tab nghiệp vụ mới vào `AdminAffiliatesView.tsx`:
     1. Tab `ĐỐI TÁC CTV` (Quản lý hồ sơ hiện tại).
     2. Tab `YÊU CẦU RÚT TIỀN` (Hiển thị hàng đợi Payouts, số tiền, thông tin ngân hàng, nút "Duyệt chi" và "Từ chối").
     3. Tab `GIÁM SÁT GIAN LẬN` (Hiển thị các case nghi vấn self-referral hoặc spam click bất thường).
   - Bổ sung các phương thức client tương ứng trong `web/src/lib/affiliate/affiliateApi.ts`.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-16 (Mức độ: P0 - Thất Thoát Tài Chính & Lỗi Toàn Vẹn Quyết Toán)
VỊ TRÍ: platform/apps/commerce-service/src/modules/orders/orders.service.ts &
        platform/apps/commerce-service/src/modules/affiliate/services/affiliate-lifecycle.service.ts (Dòng 170 - 240)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - Service xử lý đơn hàng: `platform/apps/commerce-service/src/modules/orders/orders.service.ts` (các luồng hủy đơn hàng và hoàn tiền).
   - Service vòng đời hoa hồng: `platform/apps/commerce-service/src/modules/affiliate/services/affiliate-lifecycle.service.ts` (`handleOrderCancelled`, `handleOrderItemRefunded`).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi một đơn hàng đã được ghi nhận tiếp thị liên kết (có hoa hồng ở trạng thái `PENDING` hoặc `HOLDING`) bị Người mua hủy đơn (`CANCELLED`) hoặc Người mua trả hàng hoàn tiền (`REFUNDED`):
     * Trạng thái đơn hàng trong bảng `orders` chuyển sang `CANCELLED` hoặc `REFUNDED`.
     * Tuy nhiên, bản ghi hoa hồng trong bảng `affiliate_commissions` HOÀN TOÀN KHÔNG BỊ HỦY. Nó vẫn tiếp tục giữ nguyên trạng thái `PENDING` hoặc `HOLDING`.
     * Khi worker quyết toán `AffiliateSettlementWorker` chạy quét định kỳ (hoặc cron 00:00 hàng ngày), các hoa hồng này vẫn được chuyển sang trạng thái `AVAILABLE` và cộng tiền vào ví CTV!
   - Hậu quả: Sàn HUKI bị thất thoát tiền thật — trả hoa hồng cho CTV trên những đơn hàng mà khách hàng đã hủy hoặc đã nhận lại tiền hoàn.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Trong `orders.service.ts` và `escrow.service.ts`, logic hủy đơn hàng và hoàn tiền chỉ cập nhật bảng `orders`, `order_items`, `ledger` của seller/buyer mà hoàn toàn KHÔNG inject hoặc gọi `AffiliateLifecycleService.handleOrderCancelled(orderId, reason)` hay `handleOrderItemRefunded(orderItemId, reason)`.
   - Các phương thức xử lý hủy hoa hồng này hiện chỉ được gọi trong file unit test `affiliate-lifecycle.spec.ts` mà chưa hề được nối dây (wire-up) vào luồng thực tế của hệ thống thương mại.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Inject `AffiliateLifecycleService` vào `OrdersService` (hoặc lắng nghe qua Outbox / Event Bus `ORDER_CANCELLED`, `ORDER_REFUNDED`).
   - Trong hàm hủy đơn hàng (`cancelOrder`), thêm lệnh gọi:
     ```typescript
     if (this.affiliateLifecycleService) {
       await this.affiliateLifecycleService.handleOrderCancelled(orderId, `Order cancelled: ${reason}`, tx);
     }
     ```
   - Trong hàm hoàn tiền từng món sách (`refundOrderItem`), gọi:
     ```typescript
     if (this.affiliateLifecycleService) {
       await this.affiliateLifecycleService.handleOrderItemRefunded(orderItemId, `Item refunded: ${reason}`, tx);
     }
     ```

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Đã xác minh phân tích luồng code thực tế).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD05-17 (Mức độ: P1 - Không Nhận Diện Slug & Component Bị Cô Lập)
VỊ TRÍ: platform/apps/commerce-service/src/modules/affiliate/controllers/affiliate-link.controller.ts (Dòng 93 - 109) &
        web/src/ui/components/affiliate/BookAffiliateCard.tsx &
        web/src/app/book/[id]/page.tsx
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - Backend Controller: `platform/apps/commerce-service/src/modules/affiliate/controllers/affiliate-link.controller.ts` (API `GET books/:bookId/commission-card`).
   - Frontend Component: `web/src/ui/components/affiliate/BookAffiliateCard.tsx`.
   - Frontend Page: `web/src/app/book/[id]/page.tsx`.

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Lỗi 1 (Slug incompatibility): Khi gọi API lấy thông tin hoa hồng sách bằng slug:
     `GET /api/v1/affiliate/books/dac-nhan-tam/commission-card`
     Hệ thống trả về HTTP 404: `{"status":"error","statusCode":404,"message":"Sách không tồn tại"}` vì backend chỉ query `where: { id: bookId }` (UUID), trong khi toàn bộ URL công khai trên web đều sử dụng slug.
   - Lỗi 2 (Orphan Component): Component `BookAffiliateCard.tsx` được thiết kế để hiển thị tỷ lệ hoa hồng và nút "Lấy Link Tiếp Thị" 1-click ngay trên trang chi tiết sách (`/book/[slug]`). Tuy nhiên trên thực tế, component này HOÀN TOÀN KHÔNG ĐƯỢC NHÚNG vào file `web/src/app/book/[id]/page.tsx`.
   - Hậu quả: Độc giả và BookToker khi đang lướt xem một cuốn sách hay không hề thấy bất kỳ thông tin nào về hoa hồng tiếp thị hoặc nút lấy link nhanh, làm mất đi 70% cơ hội chuyển đổi độc giả thành CTV tiếp thị.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Backend `getBookCommissionForAffiliate` chưa hỗ trợ tìm kiếm kép `{ OR: [{ id: bookId }, { slug: bookId }] }`.
   - Frontend page `web/src/app/book/[id]/page.tsx` khi dựng giao diện chưa import và đặt thẻ `<BookAffiliateCard bookId={book.id} />` vào cột bên phải (Sidebar hành động mua hàng).

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Sửa `AffiliateLinkService.getBookCommissionForAffiliate` để hỗ trợ tìm sách theo cả `id` lẫn `slug`.
   - Nhúng `<BookAffiliateCard bookId={book.id} book={book} />` vào phần thông tin sản phẩm tại `web/src/app/book/[id]/page.tsx` (ngay dưới nút "Thêm vào giỏ hàng" và "Mua ngay").

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

## 📈 TỔNG KẾT BẢNG THEO DÕI KIỂM THỬ HỆ THỐNG HUKI (MOD-01 ĐẾN MOD-06)

| Phân Hệ Nghiệp Vụ | Số Màn Hình / Luồng | Số Lượt Kiểm Thử Viewports | Số Lượng Lỗi Bóc Tách | Trạng Thái Tài Liệu |
| :--- | :---: | :---: | :---: | :---: |
| **MOD-01: Public & Buyer Journey** | 45 màn hình | 135 lượt test | **26 lỗi** | `tasks/bug-mod01.md` (Hoàn tất) |
| **MOD-02: Seller & Publisher Portal** | 42 màn hình | 126 lượt test | **18 lỗi** | `tasks/bug-mod02.md` (Hoàn tất) |
| **MOD-03: Platform Admin Operations** | 31 màn hình | 93 lượt test | **19 lỗi** | `tasks/bug-mod03.md` (Hoàn tất) |
| **MOD-04: Shipper & Logistics Hub** | 10 màn hình | 30 lượt test | **13 lỗi** | `tasks/bug-mod04.md` (Hoàn tất) |
| **MOD-05: Affiliate & Creator Ecosystem** | 9 màn hình | 27 lượt test | **17 lỗi** | `tasks/bug-mod05.md` (Hoàn tất) |
| **MOD-06: AI Community & Direct Chat** | 8 màn hình | 24 lượt test | **14 lỗi** | `tasks/bug-mod06.md` (Hoàn tất) |
| **TỔNG CỘNG TOÀN HỆ THỐNG** | **145 màn hình** | **435 lượt kiểm thử** | **107 lỗi xác thực** | **Sẵn sàng báo cáo phê duyệt** |

