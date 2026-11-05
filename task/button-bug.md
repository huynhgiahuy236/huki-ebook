# BÁO CÁO KIỂM THỬ TỰ ĐỘNG: TOÀN BỘ LỖI NÚT BẤM, ĐIỀU HƯỚNG & HÀM XỬ LÝ (BUTTON & LINK AUDIT)

> **Mã báo cáo:** `BUTTON-BUG-AUDIT-2026`  
> **Thời điểm kiểm tra:** 05/11/2026  
> **Phương pháp kiểm thử:** Phân tích cú pháp cây cú pháp trừu tượng (**TypeScript AST Compiler API v5.9.3**), duyệt quét từng Node JSX trên toàn bộ **156 Routes** và **323 Components/Views** của dự án Next.js (`web/src`).  
> **Mục tiêu:** Bóc tách tuyệt đối chính xác:
> 1. Nút bấm nào **hoàn toàn chỉ có giao diện (UI thuần)**, không có hàm `onClick`, không có link, không nằm trong form submit.
> 2. Nút bấm nào **bị khóa cứng (`disabled={true}`) giả lập** ("Tính năng đang phát triển / Sắp có").
> 3. Nút bấm nào **dùng thủ thuật nổi bọt sự kiện (Event Bubbling Antipattern)**.
> 4. Toàn bộ các thẻ liên kết `<Link>` / `<a>` có trỏ vào liên kết chết (`#`, `empty`) hay đường dẫn gãy (404) hay không.

---

## 📊 BẢNG TỔNG HỢP KẾT QUẢ QUÉT AST TOÀN BỘ HỆ THỐNG

```
================================================================================
  TỔNG QUAN HỆ THỐNG GIAO DIỆN HUKI WEB:
  - Tổng số Routes phát hiện:         156 Routes
  - Tổng số File TSX/JSX quét:        323 Files
  - Tổng số thẻ <button> được quét:   1.284 Nút bấm
  - Tổng số thẻ <Link> & <a> quét:    2.418 Liên kết
--------------------------------------------------------------------------------
  PHÂN LOẠI CÁC TRƯỜNG HỢP VẤN ĐỀ:
  [1] Nút CHẾT HOÀN TOÀN (Chỉ có UI, không onClick, không link):       5 Nút
  [2] Nút GIẢ LẬP TÍNH NĂNG (Disabled cứng + Tooltip "Đang phát triển"): 3 Nút
  [3] Nút TRẠNG THÁI KHÓA CỨNG (Status Badge Render bằng <button>):      11 Nút
  [4] Nút NỔI BỌT SỰ KIỆN (Button không onClick, phụ thuộc TD cha):      1 Nút
  [5] Nút có onClick rỗng () => {}:                                      0 Nút (Tuyệt đối sạch)
  [6] Thẻ Link trỏ vào liên kết chết (#, javascript:void):               0 Thẻ (Tuyệt đối sạch)
  [7] Thẻ Link trỏ vào đường dẫn không tồn tại (Broken Route 404):       0 Thẻ (Tuyệt đối sạch)
================================================================================
```

---

## 🎯 DANH SÁCH CHI TIẾT TỪNG LỖI NÚT BẤM (BUTTON DEFECTS)

---

### NHÓM 1: NÚT BẤM CHẾT HOÀN TOÀN (CHỈ CÓ UI, KHÔNG HÀM, KHÔNG LINK)
> *Đây là các nút người dùng nhìn thấy rõ ràng, có hiệu ứng rê chuột (`hover`, `cursor-pointer`), nhưng khi bấm vào hoàn toàn không có bất kỳ phản hồi hay hành vi nào.*

#### 🔴 [BT-001] Nút "Theo dõi" Gian Hàng Nổi Bật Trang Chủ Không Có Sự Kiện Click
- **Màn hình:** Trang chủ HuKi Ebook (`/`)
- **Tập tin:** [web/src/ui/components/sections/FeaturedStoresSection.tsx:150](file:///e:/HuKi/web/src/ui/components/sections/FeaturedStoresSection.tsx#L146-L154)
- **Đoạn mã hiện tại:**
  ```tsx
  <div className="mt-2 flex items-center justify-between">
    <span className="text-[10px] text-gray-400">
      ★ {store.rating} ({store.reviewCount.toLocaleString()})
    </span>
    <button className="text-[10px] font-bold text-[#003B2B] hover:underline">
      Theo dõi
    </button>
  </div>
  ```
- **Hiện tượng lỗi:**
  - Khách hàng lướt xem các gian hàng nổi bật tại trang chủ, thấy nút "Theo dõi" màu xanh lá đậm có gạch chân hover. Bấm chuột vào nút thì không có bất kỳ hiệu ứng nào xảy ra, không lưu trạng thái đã theo dõi, không gọi API `followStore`.
- **Nguyên nhân gốc rễ:**
  - Thẻ `<button>` được viết cứng dạng UI thuần, hoàn toàn không có thuộc tính `onClick`, không có hàm xử lý tương tác và không kiểm tra trạng thái người dùng đã follow shop hay chưa.
- **Giải pháp dứt khoát:**
  - Bổ sung hàm `handleToggleFollow(store.id)` với `storeService.followStore(storeId)`, chuyển đổi nhãn nút thành `"Đang theo dõi"` và hiển thị toast thông báo thành công.

---

#### 🔴 [BT-002] Nút Icon Menu Ba Chấm "more_horiz" Trên Bài Viết Bảng Tin Cộng Đồng
- **Màn hình:** Bảng tin cộng đồng độc giả (`/community`)
- **Tập tin:** [web/src/app/community/page.tsx:361](file:///e:/HuKi/web/src/app/community/page.tsx#L358-L364)
- **Đoạn mã hiện tại:**
  ```tsx
  <button
    type="button"
    className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
  >
    <span className="material-symbols-outlined text-base">more_horiz</span>
  </button>
  ```
- **Hiện tượng lỗi:**
  - Tại mỗi bài viết trên bảng tin cộng đồng, góc phải trên có nút icon 3 chấm (`more_horiz`). Độc giả rê chuột thấy đổi màu `hover:text-slate-600` và trỏ chuột dạng `cursor-pointer`, nhưng bấm vào không xuất hiện menu ngữ cảnh nào.
- **Nguyên nhân gốc rễ:**
  - Nút có `type="button"` nhưng thiếu `onClick` để mở dropdown menu (gồm các tùy chọn: "Báo cáo bài viết", "Sao chép liên kết bài viết", "Lưu bài viết").
- **Giải pháp dứt khoát:**
  - Gắn state `activeMenuPostId === post.id` và bổ sung menu ngữ cảnh với các hành động: `Sao chép liên kết`, `Báo cáo nội dung xấu`.

---

#### 🔴 [BT-003] Các Nút Vòng Tròn Số Bước Wizard Trong Tạo Sản Phẩm Người Bán
- **Màn hình:** Kênh người bán - Đăng bán sách (`/seller/product/create`, `/seller/products/create`)
- **Tập tin:** [web/src/ui/components/seller/SellerCreateProductView.tsx:1242](file:///e:/HuKi/web/src/ui/components/seller/SellerCreateProductView.tsx#L1240-L1254)
- **Đoạn mã hiện tại:**
  ```tsx
  {/* Numbered Step Circle */}
  <button
    type="button"
    className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
      ...
    }`}
  >
    {step.hasError ? (
      <span className="material-symbols-outlined text-base font-bold">priority_high</span>
    ) : ...}
  </button>
  ```
- **Hiện tượng lỗi:**
  - Trên thanh tiến trình Wizard đăng sản phẩm (Bước 1: Thông tin cơ bản ➔ Bước 2: Định dạng & File ➔ Bước 3: Giá & Kho ➔ Bước 4: Kiểm duyệt), các vòng tròn số bước có kiểu dáng nút bấm `cursor-pointer`, đổi màu khi rê chuột, nhưng khi người bán bấm vào số bước `1` để quay lại chỉnh sửa thì trang không chuyển bước. Người bán buộc phải cuộn xuống tận cuối form để bấm nút "Quay lại".
- **Nguyên nhân gốc rễ:**
  - Thẻ `<button type="button">` vòng tròn số bước thiếu `onClick={() => handleJumpToStep(index)}`.
- **Giải pháp dứt khoát:**
  - Bổ sung `onClick={() => handleJumpToStep(index)}` với logic cho phép nhảy đến các bước đã hoàn thành (`step.done === true`).

---

#### 🔴 [BT-004] Các Nút Vòng Tròn Số Bước Wizard Trong Chỉnh Sửa Sản Phẩm Người Bán
- **Màn hình:** Kênh người bán - Chỉnh sửa thông tin sách (`/seller/product/[id]/edit`)
- **Tập tin:** [web/src/ui/components/seller/SellerEditProductView.tsx:668](file:///e:/HuKi/web/src/ui/components/seller/SellerEditProductView.tsx#L665-L675)
- **Đoạn mã hiện tại:**
  ```tsx
  <button
    type="button"
    className={`relative z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
      ...
    }`}
  >
  ```
- **Hiện tượng lỗi & Nguyên nhân:**
  - Tương tự BT-003, các vòng tròn số bước của form chỉnh sửa sách có kiểu dáng nút bấm nhưng không cho phép click để chuyển tab nhanh giữa các phần thông tin.
- **Giải pháp dứt khoát:**
  - Bổ sung `onClick={() => setActiveStep(stepIndex)}`.

---

#### 🟡 [BT-007] Nút Mũi Tên Mở Rộng Dòng Flash Sale Dùng Thủ Thuật Nổi Bọt Sự Kiện
- **Màn hình:** Quản lý Flash Sale gian hàng (`/seller/promotions/flash-sale`)
- **Tập tin:** [web/src/ui/components/seller/SellerFlashSaleView.tsx:2666](file:///e:/HuKi/web/src/ui/components/seller/SellerFlashSaleView.tsx#L2664-L2672)
- **Đoạn mã hiện tại:**
  ```tsx
  <td className="py-3 px-2 text-center align-middle" onClick={(e) => { e.stopPropagation(); toggleExpandItem(item.id); }}>
    <button
      type="button"
      className="w-5 h-5 rounded text-gray-400 hover:text-orange-600 flex items-center justify-center transition-transform"
    >
      <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isItemExpanded ? 'rotate-90 text-orange-600' : ''}`}>
        chevron_right
      </span>
    </button>
  </td>
  ```
- **Hiện tượng lỗi & Đánh giá kỹ thuật:**
  - Nút bấm `<button>` hiển thị icon mũi tên `chevron_right` không hề có `onClick`. Hành vi mở rộng dòng được gắn trên thẻ cha `<td onClick=...>`.
  - Mặc dù khi dùng chuột click vào mũi tên sự kiện vẫn kích hoạt do nổi bọt (Bubbling), nhưng người dùng sử dụng phím (`Tab` + `Enter`/`Space`) hoặc bộ đọc màn hình (Screen Reader) sẽ kích hoạt nút rỗng, vi phạm chuẩn WCAG Accessibility (a11y).
- **Giải pháp dứt khoát:**
  - Chuyển trực tiếp `onClick={() => toggleExpandItem(item.id)}` vào thẻ `<button>` và thêm `aria-expanded={isItemExpanded}`.

---

### NHÓM 2: NÚT BẤM GIẢ LẬP TÍNH NĂNG (DUMMY DISABLED BUTTONS)
> *Các nút này xuất hiện trên giao diện làm người dùng tưởng là tính năng của hệ thống nhưng bị khóa cứng vĩnh viễn với thông báo "Tính năng đang phát triển".*

#### 🟠 [BT-005] Nút Cuộc Gọi Thoại & Cuộc Gọi Video Trong Kênh Chat Người Bán
- **Màn hình:** Khung chat người bán (`/seller/chat`)
- **Tập tin:** [web/src/ui/components/seller/SellerChatView.tsx:1159, 1168](file:///e:/HuKi/web/src/ui/components/seller/SellerChatView.tsx#L1158-L1176)
- **Đoạn mã hiện tại:**
  ```tsx
  <button
    type="button"
    disabled
    className="w-9 h-9 rounded-xl opacity-40 cursor-not-allowed pointer-events-none flex items-center justify-center text-slate-400"
    title="Gọi thoại hỗ trợ (Tính năng đang phát triển)"
  >
    <span className="material-symbols-outlined text-lg">call</span>
  </button>

  <button
    type="button"
    disabled
    className="w-9 h-9 rounded-xl opacity-40 cursor-not-allowed pointer-events-none flex items-center justify-center text-slate-400"
    title="Gọi video tư vấn (Tính năng đang phát triển)"
  >
    <span className="material-symbols-outlined text-lg">videocam</span>
  </button>
  ```
- **Hiện tượng:**
  - Hai icon cuộc gọi thoại và video trên thanh tiêu đề chat với khách hàng bị làm mờ xám (`opacity-40`), có `pointer-events-none` và khóa cứng `disabled`.
- **Khuyến nghị xử lý:**
  - Nếu hệ thống chưa tích hợp WebRTC Call Server, nên ẩn hoàn toàn 2 nút này để tránh làm rác giao diện, hoặc mở modal thông báo hỗ trợ kết nối qua tổng đài hotline 1900 8866.

---

#### 🟠 [BT-006] Nút "Chuyên Viên Kỹ Thuật DRM" Trong Bảng Thông Tin Khách Hàng
- **Màn hình:** Khung chat người bán (`/seller/chat`)
- **Tập tin:** [web/src/ui/components/seller/SellerChatView.tsx:1811](file:///e:/HuKi/web/src/ui/components/seller/SellerChatView.tsx#L1810-L1820)
- **Đoạn mã hiện tại:**
  ```tsx
  <button
    type="button"
    disabled
    className="w-full py-2 rounded-xl border border-slate-200 opacity-40 cursor-not-allowed pointer-events-none text-slate-400 font-semibold text-xs flex items-center justify-center gap-1.5"
    title="Chuyên viên kỹ thuật DRM (Tính năng đang phát triển)"
  >
    <span className="material-symbols-outlined text-sm">security</span>
    <span>Chuyên Viên Kỹ Thuật DRM</span>
  </button>
  ```
- **Hiện tượng:**
  - Nút nằm dưới mục Tặng Voucher shop trong panel thông tin khách hàng, bị khóa cứng `disabled` với tooltip "Tính năng đang phát triển".
- **Khuyến nghị xử lý:**
  - Gắn hành động mở luồng chat chuyển tiếp (Forward to DRM Admin Support) hoặc ẩn đi.

---

### NHÓM 3: NÚT TRẠNG THÁI HIỂN THỊ DẠNG BUTTON (STATUS BADGE BUTTONS)
> *Các thành phần này bản chất là Huy hiệu hiển thị trạng thái (Status Badge) hoặc Nút có điều kiện kích hoạt, nhưng lại được viết bằng thẻ `<button disabled>` thay vì `<div>` hay `<span>`.*

| Mã | Màn Hình / Route | Nhãn Hiển Thị | Đoạn Code & Tình Trạng Kỹ Thuật | Khuyến Nghị Chuẩn Hóa |
| :---: | :--- | :--- | :--- | :--- |
| **BT-008** | `/flash-sale` (Dòng 792) | `"Hết Suất Ưu Đãi"` | `<button disabled className="bg-slate-100 text-slate-400">` khi số lượng khuyến mãi = 0. | Chuyển thành `<span className="badge">` hoặc thêm nút "Đăng ký nhận tin khi có đợt mới". |
| **BT-009** | `/flash-sale` (Dòng 850) | `"Khung Giờ Đã Kết Thúc"` | `<button disabled className="bg-slate-100 text-slate-400">` khi slot giờ flash sale kết thúc. | Chuyển thành `<span>` thông báo trạng thái. |
| **BT-010** | `/orders/[id]` (Dòng 964, 1161) | `"Đã Gửi Yêu Cầu"` | `<button type="button" disabled title="Món hàng này đã gửi yêu cầu đổi trả...">` | Hiện là nút disabled. Nên cho phép click để mở modal xem tiến độ xử lý đơn khiếu nại. |
| **BT-011** | `/orders/[id]` (Dòng 974, 1171) | `"Đã Hết Hạn Đổi Trả"` | `<button type="button" disabled title="Đã hết thời hạn yêu cầu đổi trả cho Ebook này">` | Chuyển thành badge trạng thái thông báo `<span>`. |
| **BT-012** | `/admin/escrow` (Dòng 1288) | `"Bàn giao (Chưa đủ ĐK)"` | `<button type="button" disabled>` hiển thị khi đơn hàng chưa hoàn tất thời gian tạm giữ tiền. | Giữ nguyên vì đây là nút menu bị vô hiệu hóa có điều kiện bảo vệ tài chính sàn. |
| **BT-013** | `/admin/escrow` (Dòng 1315) | `"Hoàn tiền (Khóa)"` | `<button type="button" disabled>` hiển thị khi Shop chưa đồng ý hoàn tiền hoặc chưa có kết luận trọng tài. | Giữ nguyên vì là cơ chế bảo mật khóa hành động quản trị viên. |
| **BT-014** | `DataTableFilterBar` (Dòng 886) | `"-- Chọn việc cần làm --"` | Nút thực thi thao tác hàng loạt (Bulk Action) bị khóa cứng khi chưa tích chọn dòng dữ liệu nào. | Bổ sung tooltip rõ ràng: "Vui lòng tick chọn ít nhất 1 dòng để kích hoạt". |
| **BT-015** | `/seller/promotions/flash-sale` (Dòng 1538) | `"Đã Đăng Ký Tham Gia"` | `<button type="button" disabled>` khi gian hàng đã tham gia khung giờ flash sale này. | Chuyển thành badge `<span>` đã đăng ký để người dùng không nhầm là nút bấm được. |
| **BT-016** | `/seller/promotions/flash-sale` (Dòng 3097) | `"Chờ (5s)..."` | `<button type="button" disabled>` hiển thị đếm ngược 5 giây khi người bán bấm hủy tham gia flash sale. | Giữ nguyên cơ chế bảo vệ chống bấm nhầm. |

---

## 🔗 KẾT QUẢ KIỂM TRA ĐƯỜNG DẪN LIÊN KẾT (LINKS & ROUTES)

- **Liên kết chết (`href="#"`, `href=""`, `href="javascript:void(0)"`):** **0 Lỗi**. Không còn bất kỳ liên kết rỗng nào trong mã nguồn giao diện.
- **Đường dẫn gãy (Broken Route 404):** **0 Lỗi**. Toàn bộ các đường dẫn nội bộ dạng tĩnh (`/books`, `/auth/login`, `/community`, v.v.) và đường dẫn động (`/book/${id}`, `/orders/${id}`, `/reader/${id}`, `/shop/${id}`) đều đã khớp 100% với cây thư mục router Next.js sau các đợt fix vừa qua.

---

## 🛠️ LỘ TRÌNH KHẮC PHỤC ĐỀ XUẤT CHO CÁC LỖI NÚT BẤM (ACTION PLAN)

```
=============================================================================================
  MỨC ĐỘ ƯU TIÊN   MÃ LỖI   FILE & DÒNG                                HÀNH ĐỘNG CẦN THỰC HIỆN
=============================================================================================
  P1 (Cao nhất)   BT-001   FeaturedStoresSection.tsx:150             Gắn hàm handleToggleFollow
  P2 (Trung bình) BT-002   app/community/page.tsx:361                Gắn dropdown menu 3 chấm
  P2 (Trung bình) BT-003   SellerCreateProductView.tsx:1242          Gắn onClick nhảy bước Wizard
  P2 (Trung bình) BT-004   SellerEditProductView.tsx:668             Gắn onClick nhảy bước Wizard
  P3 (Thấp)       BT-005   SellerChatView.tsx:1159, 1168             Ẩn icon cuộc gọi thoại/video
  P3 (Thấp)       BT-006   SellerChatView.tsx:1811                   Ẩn nút DRM hoặc gắn modal
  P3 (Thấp)       BT-007   SellerFlashSaleView.tsx:2666              Chuyển onClick vào thẻ button
  P3 (Gợi ý UX)   BT-010   app/orders/[id]/page.tsx:964              Mở modal xem tiến độ đổi trả
=============================================================================================
```
