# BÁO CÁO KIỂM THỬ ROBOT PLAYWRIGHT QUÉT TỰ ĐỘNG TOÀN SÀN (MOD-08: AUTOMATED UI/UX SCANNER)

> **Phạm vi kiểm thử:** Toàn bộ 102 tuyến đường dẫn (Routes) của nền tảng HUKI trên môi trường Local (`http://localhost:3100`), bao gồm 5 phân hệ: Cổng Độc giả (Group A), Kênh Người bán (Group B), Kênh Quản trị sàn (Group C), Cổng Giao vận Shipper (Group D), Kênh Tiếp thị liên kết & Cộng đồng (Group E).  
> **Cơ chế kiểm thử tự động:** Robot Playwright Headless Browser quét độc lập trên cả 3 kích thước màn hình tiêu chuẩn: **Mobile (390x844)**, **Tablet (768x1024)**, **Desktop (1440x900)**. Tự động lắng nghe và phân tích: Tràn viền ngang (Horizontal Overflow), Lỗi mạng/Ảnh hỏng (Broken Asset Sniffer), Lỗi đỏ Console & Crash (React Runtime / Hydration Mismatch).  
> **Nguyên tắc:** Báo cáo ghi nhận chi tiết lỗi kèm bằng chứng thực nghiệm; **tuyệt đối không tự ý sửa code sản phẩm** khi chưa có chỉ đạo từ người dùng.

---

## TỔNG HỢP KẾT QUẢ KIỂM THỬ PLAYWRIGHT (MOD-08)

| Chỉ Số Đánh Giá | Số Lượng Ghi Nhận | Đánh Giá & Hiện Trạng |
| :--- | :---: | :--- |
| **Tổng số Routes đã quét thực tế** | **102 Routes** | Quét 100% các trang thực tế có trong Next.js App Router |
| **Số Routes đạt chuẩn Responsive sạch (Passed)** | **68 Routes** | Layout co giãn chuẩn xác, không lỗi tràn viền trên mọi kích thước |
| **Số lỗi Tràn viền ngang (Horizontal Overflow)** | **40 Trường hợp** | 12 lỗi trên Mobile (390px), 28 lỗi trên Tablet (768px), 0 lỗi Desktop |
| **Số lỗi Runtime Crash / Hydration Mismatch** | **1 Lỗi nghiêm trọng** | Trang `/admin/maintenance` bị lỗi Hydration SSR lệch timestamp |
| **Lỗi mạng rác toàn cục (Phantom API Storm)** | **102/102 Routes** | Toàn bộ các trang trên sàn đều bị bắn request 404 dấu trang sách ảo |

---

## BẢNG PHÂN LOẠI CÁC LỖ HỔNG XÁC NHẬN TẠI MOD-08

| Mã Lỗi | Tên Lỗi & Vị Trí Phát Hiện | Phân Loại & Mức Độ | Trạng Thái |
| :---: | :--- | :---: | :---: |
| **BUG-MOD08-01** | Tràn viền ngang 284px hệ thống trên 28 màn hình Độc giả & Tiếp thị ở Tablet (`768px`) | **P1 (High)** / Layout Breakage | `Chờ duyệt sửa` |
| **BUG-MOD08-02** | Vỡ layout nghiêm trọng trên Mobile (`390px`): Chiều rộng tràn từ 410px đến 1092px | **P0 (Critical)** / Mobile UX Destruction | `Chờ duyệt sửa` |
| **BUG-MOD08-03** | Bão request rác 404 toàn sàn: `GET /api/reader/bookmarks/con-duong-phia-truoc` | **P1 (High)** / Network Waste & Performance | `Chờ duyệt sửa` |
| **BUG-MOD08-04** | Lỗi React Hydration Mismatch gây sập và tái dựng DOM trên `/admin/maintenance` | **P1 (High)** / React Runtime Error | `Chờ duyệt sửa` |
| **BUG-MOD08-05** | Tràn viền cục bộ 4px đến 120px trên các biểu mẫu người bán (Ebook, Hybrid, Flash Sale) | **P2 (Medium)** / Responsive Polishing | `Chờ duyệt sửa` |

---

## CHI TIẾT CÁC LỖI ĐƯỢC XÁC NHẬN (5 CẤU PHẦN KỸ THUẬT)

### 1. BUG-MOD08-01: Tràn viền ngang 284px hệ thống trên 28 màn hình Độc giả & Tiếp thị ở Tablet (768px)
- **VỊ TRÍ (Location):**
  - Component: `web/src/ui/components/layout/StoreHeader.tsx` (Dòng 361).
  - Xuất hiện đồng loạt trên **28 routes** dùng chung `StoreHeader`: `/`, `/books`, `/book/[id]`, `/book/[id]/preview`, `/cart`, `/checkout`, `/orders`, `/profile`, `/profile/addresses`, `/profile/reviews`, `/profile/security`, `/profile/wallet`, `/library`, `/audiobooks`, `/flash-sale`, `/vouchers`, `/stores`, `/shop/[id]`, `/policy`, `/policy/terms`, `/following`, `/affiliate`, `/account/affiliate/*`.
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Trên kích thước máy tính bảng (Tablet 768px), thanh cuộn ngang xuất hiện trên toàn bộ các trang mua sắm và đọc sách.
  - `document.documentElement.scrollWidth` đo được là **1052px** (vượt quá chiều rộng màn hình 768px đến **284px**).
  - Người dùng vuốt màn hình tablet bị trôi lệch sang phải, làm lộ khoảng trắng trống rỗng và méo mó tỷ lệ giao diện.
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - Trong `StoreHeader.tsx` (dòng 361), thanh tiện ích trên cùng (Top Utility Bar) được cấu hình:
    ```tsx
    <div className="hidden md:flex h-[28px] ... whitespace-nowrap ...">
    ```
  - Trong Tailwind CSS, breakpoint `md:` kích hoạt từ `768px`. Tuy nhiên, nội dung bên trong thanh tiện ích này (chứa slogan, hotline, mã giảm giá, flash sale, tiếp thị liên kết, bảng quản trị sàn) được đặt nằm ngang với cờ `whitespace-nowrap`, có tổng chiều rộng tự nhiên lên tới **1052px**.
  - Kết quả là trên tablet 768px, thanh này đã được hiển thị (`md:flex`) nhưng không đủ không gian chứa, làm xô lệch toàn bộ chiều rộng của trang web ra 1052px.
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  - Thay đổi breakpoint hiển thị từ `md:flex` sang `lg:flex`:
    ```tsx
    // Chỉ hiển thị Top Utility Bar trên màn hình Desktop (từ 1024px trở lên), ẩn trên Tablet (768px) và Mobile
    <div className="hidden lg:flex h-[28px] bg-[var(--theme-header-top,#003b2b)] ...">
    ```
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 2. BUG-MOD08-02: Vỡ layout nghiêm trọng trên Mobile (390px): Chiều rộng tràn từ 410px đến 1092px
- **VỊ TRÍ (Location):**
  - `/profile/reviews`: Chiều rộng tràn lên tới **1092px** (gấp 2.8 lần màn hình điện thoại 390px).
  - `/account/affiliate/links`: Chiều rộng tràn lên tới **886px** (gấp 2.3 lần màn hình điện thoại).
  - `/seller/affiliate`: Chiều rộng tràn lên tới **614px** (tràn 224px).
  - `/orders`: Chiều rộng tràn lên tới **613px** (tràn 223px).
  - `/profile/addresses`: Chiều rộng tràn lên tới **600px** (tràn 210px).
  - `/book/[id]/preview`: Chiều rộng tràn lên tới **580px** (tràn 190px).
  - `/stores`: Chiều rộng tràn lên tới **537px** (tràn 147px).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Trên điện thoại di động (Viewport iPhone 12/13/14: 390px), giao diện các trang này bị vỡ nát hoàn toàn. Bảng biểu, card địa chỉ và danh sách đơn hàng bị tràn ra ngoài rìa màn hình.
  - Người dùng không thể thao tác các nút bấm ở cột bên phải, phải cuộn ngang liên tục gây trải nghiệm cực kỳ ức chế.
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  1. Tại `/account/affiliate/links` và `/profile/reviews`: Bảng dữ liệu HTML `<table>` không được bọc trong container `div.overflow-x-auto.w-full` và các ô `<th>`, `<td>` thiếu class `whitespace-nowrap` kèm `min-w-[...]`.
  2. Tại `/seller/affiliate`: Dropdown bộ lọc `select` được cố định độ rộng bằng `min-w-[500px]` hoặc flexbox không cho phép `flex-wrap`.
  3. Tại `/orders` và `/profile/addresses`: Thẻ `<main className="flex-1 min-w-0 ...">` chứa các component con có chiều rộng tối thiểu vượt quá màn hình mobile (ví dụ các nút thao tác `flex gap-4` không wrap).
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  1. Bao bọc toàn bộ các bảng dữ liệu bằng:
     ```tsx
     <div className="w-full overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
       <table className="min-w-full divide-y ...">...</table>
     </div>
     ```
  2. Chuyển các container chứa nút bấm từ `flex` sang `flex flex-col sm:flex-row` hoặc thêm `flex-wrap`.
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 3. BUG-MOD08-03: Bão request rác 404 toàn sàn: `GET /api/reader/bookmarks/con-duong-phia-truoc`
- **VỊ TRÍ (Location):**
  - File cấu hình Provider gốc: `web/src/app/providers.tsx` (Dòng 8, 18).
  - Context: `web/src/ui/context/ReaderContext.tsx` (Dòng 103).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Khi người dùng truy cập **bất kỳ trang nào** trên toàn bộ website (từ Trang chủ, Giỏ hàng, Trang sản phẩm, Hồ sơ người dùng cho đến Kênh người bán):
  - Trình duyệt tự động âm thầm gửi một request ngầm:
    ```http
    GET http://localhost:3100/api/reader/bookmarks/con-duong-phia-truoc
    ```
  - Request này luôn trả về **HTTP 404 Not Found**, xuất hiện dày đặc màu đỏ trong Console của trình duyệt trên 100% các trang.
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - Trong `providers.tsx`, component `<ReaderProvider>` được bọc ở cấp cao nhất (Root Layout Provider) bao trùm toàn bộ ứng dụng:
    ```tsx
    <AuthProvider>
      <CartProvider>
        <ReaderProvider>   {/* <-- Gây ô nhiễm toàn sàn */}
          <AppRouteShell>{children}</AppRouteShell>
        </ReaderProvider>
      </CartProvider>
    </AuthProvider>
    ```
  - Trong `ReaderContext.tsx`, state khởi tạo mặc định là cuốn sách mẫu:
    ```tsx
    const [activeBookId, setActiveBookId] = useState('con-duong-phia-truoc');
    ```
  - Khi `ReaderProvider` khởi tạo, hook `useEffect` lập tức gọi API tải danh sách dấu trang của cuốn sách giả định này ngay cả khi người dùng chỉ đang xem giỏ hàng hoặc đọc tin tức!
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  1. Gỡ bỏ `<ReaderProvider>` khỏi `web/src/app/providers.tsx`.
  2. Chỉ bọc `<ReaderProvider>` cục bộ bên trong các màn hình đọc sách thực thụ (`/reader` và `/book/[id]/preview`).
  3. Hoặc trong `ReaderContext.tsx`, không tự động kích hoạt fetch bookmark nếu `activeBookId` chưa được người dùng chọn thực tế (`if (!activeBookId || activeBookId === 'none') return;`).
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 4. BUG-MOD08-04: Lỗi React Hydration Mismatch gây sập và tái dựng DOM trên `/admin/maintenance`
- **VỊ TRÍ (Location):**
  - Trang: `web/src/app/admin/maintenance/page.tsx` / `AdminMaintenanceView.tsx`.
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Khi truy cập trang quản trị bảo trì hệ thống `/admin/maintenance`, trình duyệt báo lỗi đỏ nghiêm trọng:
    ```
    Hydration failed because the server rendered text didn't match the client.
    - Server: 01:19:59
    + Client: 06:06:11
    ```
  - React buộc phải vứt bỏ toàn bộ cây DOM đã render từ SSR (Server-Side Rendering) và dựng lại toàn bộ cây DOM trên client, gây chớp nháy giao diện và giảm hiệu năng tải trang.
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - Component hiển thị đồng hồ hoặc thời gian bảo trì render trực tiếp hàm lấy giờ hiện tại (ví dụ: `new Date().toLocaleTimeString()`) ngay trong JSX mà không thông qua `useEffect` hoặc thiếu cờ `suppressHydrationWarning`. Do thời gian của máy chủ render khác với thời gian thực tế của trình duyệt client, chuỗi text kết quả không trùng khớp.
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  - Đảm bảo chỉ render thời gian động sau khi component đã mount trên client:
    ```tsx
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null; // Hoặc render skeleton
    ```
  - Hoặc gắn thêm thuộc tính `suppressHydrationWarning` trên thẻ `<span>` hiển thị thời gian.
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

---

### 5. BUG-MOD08-05: Tràn viền cục bộ 4px đến 120px trên các biểu mẫu người bán
- **VỊ TRÍ (Location):**
  - `/seller/product/create-ebook`: Tràn viền 4px trên Mobile (`scrollWidth 394px > 390px`).
  - `/seller/product/create-hybrid`: Tràn viền 4px trên Mobile (`scrollWidth 394px > 390px`).
  - `/seller/promotions/flash-sale`: Tràn viền 120px trên Tablet (`scrollWidth 888px > 768px`).
  - `/seller/promotions/vouchers`: Tràn viền 23px trên Mobile (`scrollWidth 413px > 390px`).
  - `/seller/reviews`: Tràn viền 7px trên Mobile (`scrollWidth 397px > 390px`).
- **MÔ TẢ HIỆN TƯỢNG (Symptoms):**
  - Xuất hiện thanh cuộn ngang nhỏ (từ 4px đến 23px) trên các form đăng sách Ebook và Sách Hybrid trên mobile, khiến người dùng vuốt nhẹ ngón tay thì màn hình bị xê dịch ngang nhẹ.
  - Trên trang Flash Sale người bán ở Tablet 768px, bảng danh sách sản phẩm tham gia flash sale bị tràn 120px.
- **NGUYÊN NHÂN GỐC RỄ (Root Cause):**
  - Các nút bấm lưu nháp / xuất bản (`BUTTON.px-3.sm:px-6`) và thanh tab trạng thái không có class `shrink-0` hoặc container cha thiếu `max-w-full.overflow-hidden`.
- **CÁCH KHẮC PHỤC TRIỆT ĐỂ (Remediation):**
  - Bổ sung `max-w-full` và điều chỉnh padding responsive: `px-2.5 sm:px-4` thay vì cố định padding lớn trên màn hình nhỏ.
- **TRẠNG THÁI:** `Chờ duyệt sửa (Pending Approval)`.

