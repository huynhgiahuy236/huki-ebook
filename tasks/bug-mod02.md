# Danh Sách Lỗi Toàn Diện (Comprehensive Bug Tracking) - Module 02: Kênh Người Bán & Nhà Xuất Bản

> **Phạm Vi & Tiêu Chuẩn Áp Dụng:**  
> 1. Multi-Spectrum Audit: Kiểm thử thực tế qua 42 màn hình và luồng vận hành trên 3 kích thước Viewport (**Desktop 1440px**, **Tablet 768px**, **Mobile 390px**), ghi nhận 126 lượt chạy Playwright với tài khoản doanh nghiệp thực tế (**FAHASA Official - NXB Kim Đồng**).  
> 2. Editorial B2B Workspace & Anti-AI Standards (Loại bỏ triệt để các khối cầu phát sáng `blur-3xl`, hạn chế spam polling, xử lý tràn ngang bảng dữ liệu, chuẩn hóa typography doanh nghiệp).  
> 3. **Cam Kết Nghiêm Ngặt:** Tuyệt đối không tự ý sửa bất kỳ dòng code nào của ứng dụng khi chưa có sự phê duyệt và chỉ định trực tiếp từ người dùng.

---

## 📑 MỤC LỤC DANH SÁCH LỖI MOD-02

| Mã Bug | Phân Loại | Màn Hình / Vị Trí Ảnh Hưởng | Tóm Tắt Hiện Tượng & Mức Độ Nghiêm Trọng |
| :---: | :---: | :--- | :--- |
| **[BUG-02-001]** | **Hiệu Năng & Rate Limit** | **Thanh Header Toàn Gian Hàng** | Polling tin nhắn CSKH liên tục gây bão request `429 Too Many Requests` (bị nghẽn 89 lần). |
| **[BUG-02-002]** | **Responsive (Tablet)** | **Đăng Ký Flash Sale (`/promotions/flash-sale`)** | **Tablet 768px:** Khung chọn khung giờ và nút đăng ký rộng 885px $\rightarrow$ **Tràn ngang +117px**. |
| **[BUG-02-003]** | **Responsive (Mobile)** | **Quản Lý Voucher Shop (`/promotions/vouchers`)** | **Mobile 390px:** Thanh công cụ tạo mã giảm giá rộng 413px $\rightarrow$ **Tràn ngang +23px**. |
| **[BUG-02-004]** | **Responsive (Mobile)** | **Đánh Giá Khách Hàng (`/seller/reviews`)** | **Mobile 390px:** Hàng nút lọc theo số sao trải dài 606px thiếu cuộn $\rightarrow$ **Tràn ngang +7px**. |
| **[BUG-02-005]** | **Responsive (Mobile)** | **Cấu Hình Affiliate (`/seller/affiliate`)** | **Mobile 390px:** Thanh phân loại hoa hồng NXB dài 537px $\rightarrow$ **Tràn ngang +5px**. |
| **[BUG-02-006]** | **Responsive (Mobile)** | **Đăng Bán Sách Mới (`/seller/products/create`)** | **Mobile 390px:** Thanh tiến trình các bước Stepper bị phình to $\rightarrow$ **Tràn ngang +4px**. |
| **[BUG-02-007]** | **Runtime Crash / SSR** | **Trung Tâm Thông Báo (`/seller/notifications`)** | Lỗi React Hydration Mismatch do dùng `Date.now()` và locale vi-VN trực tiếp trong SSR tree. |
| **[BUG-02-008]** | **Network & Auth** | **Xử Lý Vi Phạm & Kháng Nghị (`/seller/appeals`)** | API kiểm tra điểm phạt gian hàng `POST/GET /api/seller/penalties` bị lỗi `401 Unauthorized`. |
| **[BUG-02-009]** | **Network & API** | **Đăng Sách Điện Tử Ebook DRM** | API cấu hình gói thuyết minh AI Audio `GET /api/v1/ai-audio/plans` trả về `401 Unauthorized`. |
| **[BUG-02-010]** | **Network Leak** | **Toàn Bộ Kênh Người Bán (`/seller/*`)** | Provider đọc sách độc giả chạy ngầm trong Seller Portal làm spam `GET /api/reader/bookmarks/... 404` (hơn 214 lần). |
| **[BUG-02-011]** | **Anti-AI Design** | **Khuyến Mãi & Hồ Sơ Pháp Nhân** | Còn sót lại các khối cầu phát sáng `blur-3xl` tại `/seller/promotions`, `/seller/business`, `/seller/profile`. |
| **[BUG-02-012]** | **Trải Nghiệm Nghiệp Vụ** | **Quản Lý Đơn Hàng (`/seller/orders`)** | Chuyển đổi giữa các tab trạng thái đơn làm reset trang 1 nhưng không cập nhật query URL `status`. |
| **[BUG-02-013]** | **Kiến Trúc Điều Hướng** | **Bảo Vệ Luồng Onboarding (`SellerRouteLayout`)** | Nguy cơ vòng lặp chuyển hướng (Redirect Loop) nếu NXB chưa điền đủ chi nhánh ngân hàng. |
| **[BUG-02-014]** | **UI/UX Bảng Kế Toán** | **Ký Quỹ Đơn Hàng Escrow (`/seller/escrow`)** | Bảng sổ cái giữ tiền đơn hàng thiếu chỉ báo cuộn ngang trên tablet khiến các cột số dư bị che khuất. |
| **[BUG-02-015]** | **Chức Năng (P0)** | Danh Sách Cửa Hàng (`/stores/my`) | API `GET /stores/my` bị crash HTTP 500 do Prisma ném lỗi khi thiếu query `businessId`. |
| **[BUG-02-016]** | **Chức Năng (P1)** | Quản Lý Đơn Hàng (`/seller/orders`) | Sai lệch enum `SellerOrderStatus` giữa tài liệu kiểm thử và backend gây lỗi 400 Bad Request khi lọc trạng thái. |
| **[BUG-02-017]** | **Chức Năng (P1)** | Flash Sale Seller (`/flash-sales/seller`) | Route `GET /flash-sales/seller` bị shadow bởi param `:id` của controller công khai gây lỗi 400 Bad Request. |
| **[BUG-02-018]** | **Chức Năng (P1)** | Khuyến Mãi Gian Hàng | Sai prefix route giữa Voucher và Discounts (`seller/vouchers` vs `vouchers/seller`). |

---

## 🔍 CHI TIẾT BÓC TÁCH TỪNG LỖI (DEEP TECHNICAL SPECIFICATION)

---

### [BUG-02-001] Cơ chế Polling tin nhắn CSKH trên Thanh Header gây bão request lỗi `429 Too Many Requests`
- **1. Vị trí chính xác:**
  - Màn hình: Toàn bộ Kênh Người Bán (Thanh `SellerHeader.tsx`)
  - File mã nguồn: [web/src/ui/components/layout/SellerHeader.tsx](file:///e:/HuKi/web/src/ui/components/layout/SellerHeader.tsx)
  - Endpoint bị ảnh hưởng: `GET /api/v1/chat/conversations?storeId=d2caa7b1-1b82-49b9-be65-1fc6be42e472`
  - Viewport ảnh hưởng: Tất cả viewports (Desktop, Tablet, Mobile).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Trong quá trình quét tự động 42 màn hình, robot ghi nhận tới **89 lần lỗi HTTP 429 (Too Many Requests)** xuất hiện dày đặc trong tab Console và tab Network:
    ```http
    GET http://localhost:3000/api/v1/chat/conversations?storeId=d2caa7b1-1b82-49b9-be65-1fc6be42e472 429 (Too Many Requests)
    {"status":"error","statusCode":429,"code":"TOO_MANY_REQUESTS","message":"Quá nhiều yêu cầu từ client, vui lòng thử lại sau giây lát."}
    ```
  - Cột badge số tin nhắn chưa đọc trên Header bị nhấp nháy đỏ liên tục, làm quá tải Gateway và gây chậm các API quan trọng khác như danh sách đơn hàng hoặc doanh thu ví.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Hook đếm tin nhắn CSKH chưa đọc sử dụng vòng lặp `setInterval` với tần suất quá dày (1.5s - 2s/lần) và không có cơ chế dừng khi tab trình duyệt ở chế độ nền (tab inactive).
  - Thiếu giải pháp WebSocket Realtime Event Bus hoặc cơ chế Exponential Backoff khi phát hiện request bị trả về mã 429.
- **4. Cách khắc phục đề xuất:**
  - Thay cơ chế polling dồn dập bằng lắng nghe sự kiện WebSocket qua RabbitMQ/Socket.io (`chat:new_message`).
  - Nếu duy trì HTTP polling dự phòng, nâng chu kỳ lên tối thiểu `15s` hoặc `30s`, đồng thời tự động dừng polling khi trang chuyển sang trạng thái ẩn (`document.hidden`).
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-002] [Responsive Tablet 768px] Màn hình Đăng Ký Flash Sale (`/promotions/flash-sale`) tràn lề ngang +117px
- **1. Vị trí chính xác:**
  - Màn hình: Đăng Ký Khung Giờ Flash Sale (`http://localhost:3100/seller/promotions/flash-sale`)
  - File mã nguồn: [web/src/ui/components/seller/SellerFlashSaleView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerFlashSaleView.tsx)
  - Selector phần tử lỗi: `div.flex.flex-col.sm:items-end` kết hợp nút `button.px-5.py-3.rounded-2xl`
  - Viewport ảnh hưởng: **Tablet (768 x 1024 px)** (kích thước iPad tiêu chuẩn).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi xem trang Flash Sale trên iPad (768px), chiều rộng cuộn thực tế của trang bị phình to lên tới **885px**, gây **tràn ngang +117px** (`scrollWidth: 885px > innerWidth: 768px`).
  - Cột bên phải chứa các nút *"Đăng ký suất bán"*, *"Xem thể lệ"* và thông tin khung giờ vàng bị đẩy tuột ra khỏi mép phải màn hình, xuất hiện thanh cuộn ngang khó chịu.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Vùng điều khiển thẻ khung giờ Flash Sale áp dụng class `min-w-[600px]` hoặc dàn ngang nhiều cột cố định không tự động co lại ở breakpoint `md:` (768px - 1023px).
- **4. Cách khắc phục đề xuất:**
  - Bổ sung `w-full max-w-full overflow-hidden` cho khung bao bọc thẻ Flash Sale.
  - Chuyển bố cục nút hành động từ dàn ngang sang dạng cột dọc linh hoạt (`flex-col sm:flex-row`) khi chiều rộng màn hình $< 1024px$.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-003] [Responsive Mobile 390px] Màn hình Voucher Shop (`/seller/promotions/vouchers`) tràn ngang +23px
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Voucher Gian Hàng (`http://localhost:3100/seller/promotions/vouchers`)
  - File mã nguồn: [web/src/ui/components/seller/SellerVouchersView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerVouchersView.tsx)
  - Selector phần tử lỗi: `div.flex.items-center.gap-2.5` và nút `button.px-4.py-2.rounded-xl`
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)** (iPhone chuẩn).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Mở trang Voucher gian hàng trên điện thoại di động (390px): Chiều rộng cuộn của trang đạt **413px**, gây **tràn ngang +23px**.
  - Nút bấm *"Tạo Mã Khuyến Mãi Mới"* và nút lọc loại mã bị tràn ra ngoài cạnh phải màn hình, chữ trên nút bị cắt cụt.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Thanh Header công cụ của trang Voucher sử dụng flex row không bẻ dòng (`flex items-center gap-2.5 whitespace-nowrap`), với tổng độ rộng các nút vượt quá 390px.
- **4. Cách khắc phục đề xuất:**
  - Thêm `flex-wrap gap-2` cho container công cụ trên mobile:
    ```tsx
    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 w-full">
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-004] [Responsive Mobile 390px] Màn hình Đánh Giá Khách Hàng (`/seller/reviews`) tràn ngang +7px do thanh nút lọc sao
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Đánh Giá & Nhận Xét (`http://localhost:3100/seller/reviews`)
  - File mã nguồn: [web/src/ui/components/seller/SellerReviewsView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerReviewsView.tsx)
  - Selector phần tử lỗi: `button.px-3.5.py-1.5.rounded-full` (dãy nút 5 sao, 4 sao, 3 sao, 2 sao, 1 sao, có phản hồi).
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)**.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Chiều rộng trang đo được là **397px**, tràn ra mép màn hình di động **+7px**.
  - Dãy nút bấm lọc sao (Tất cả, 5★, 4★, 3★, 2★, 1★) trải dài từ tọa độ x=0 đến x=606px mà không có cơ chế cuộn ngang cảm ứng, làm biến dạng khung chứa đánh giá bên dưới.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Thanh nút lọc sao thiếu class `overflow-x-auto no-scrollbar` và `w-full max-w-full`.
- **4. Cách khắc phục đề xuất:**
  - Bọc cụm nút lọc sao trong thẻ `<div className="w-full overflow-x-auto no-scrollbar pb-1 flex items-center gap-2">`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-005] [Responsive Mobile 390px] Trang Cấu Hình Hoa Hồng Affiliate (`/seller/affiliate`) tràn ngang +5px
- **1. Vị trí chính xác:**
  - Màn hình: Tiếp Thị Liên Kết Sách Bản Quyền (`http://localhost:3100/seller/affiliate`)
  - File mã nguồn: `web/src/app/seller/affiliate/page.tsx`
  - Selector phần tử lỗi: `button.px-3.5.py-1.5.rounded-full` (nhóm nút chọn mức chiết khấu 10%, 15%, 20%, 25%, 30%).
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)**.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Chiều rộng trang là **395px**, tràn mép phải **+5px**. Dãy nút chọn tỷ lệ hoa hồng kéo dãn đến tọa độ x=537px.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Nhóm nút mức hoa hồng sử dụng `flex-nowrap` mà thiếu `overflow-x-auto`.
- **4. Cách khắc phục đề xuất:**
  - Áp dụng `flex-wrap` hoặc thanh cuộn ngang cảm ứng mềm `overflow-x-auto`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-006] [Responsive Mobile 390px] Thanh Tiến Trình Đăng Sách (`/seller/products/create`) tràn ngang +4px
- **1. Vị trí chính xác:**
  - Màn hình: `/seller/products/create`, `/seller/product/create-ebook`, `/seller/product/create-hybrid`
  - File mã nguồn: [web/src/ui/components/seller/SellerCreateProductView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerCreateProductView.tsx)
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)**.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Chiều rộng trang là **394px**, tràn mép phải **+4px**.
  - Thanh Stepper 4 bước (1. Thông tin cơ bản $\rightarrow$ 2. Định dạng & Giá $\rightarrow$ 3. Tồn kho & Kho gửi $\rightarrow$ 4. Bản quyền & Xuất bản) bị tràn nhẹ ở hai bên viền padding.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Khung bao ngoài áp dụng `px-6` (24px) cố định trên cả mobile khiến tổng chiều rộng nội dung vượt quá kích thước 390px.
- **4. Cách khắc phục đề xuất:**
  - Điều chỉnh padding đáp ứng: `px-3 sm:px-6`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-007] Lỗi React Hydration Mismatch tại Trung Tâm Thông Báo Đối Tác (`/seller/notifications`)
- **1. Vị trí chính xác:**
  - Màn hình: Trung Tâm Thông Báo Gian Hàng (`http://localhost:3100/seller/notifications`)
  - File mã nguồn: [web/src/ui/components/seller/SellerNotificationsView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerNotificationsView.tsx)
  - Viewport ảnh hưởng: Tất cả viewports (Desktop, Tablet, Mobile).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Mở trang thông báo, tab Console lập tức bắn lỗi đỏ React Hydration Mismatch nghiêm trọng:
    ```
    PAGE_ERROR: Hydration failed because the server rendered text didn't match the client. 
    As a result this tree will be regenerated on the client.
    ```
  - Khi lỗi xảy ra, toàn bộ cây component bị hủy và vẽ lại từ đầu ở phía client, gây giật màn hình và làm chậm tốc độ tải trang (TBT - Total Blocking Time tăng cao).
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Hàm định dạng thời gian `formatTime(isoString)` trong component gọi trực tiếp:
    ```typescript
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    return date.toLocaleDateString('vi-VN', ...);
    ```
  - Giá trị `Date.now()` trên Server (thời điểm chạy SSR trên Docker Container) khác với thời điểm Client mount trên trình duyệt.
  - Ngoài ra, hàm `toLocaleDateString('vi-VN')` trên môi trường Node.js Alpine container bị thiếu gói `full-icu`, sinh ra chuỗi ngày tháng dạng tiếng Anh (`11/4/2026`), trong khi trên trình duyệt của người dùng lại sinh ra chuỗi tiếng Việt (`04/11/2026`), dẫn đến lệch text giữa Server và Client.
- **4. Cách khắc phục đề xuất:**
  - Chỉ render thời gian tương đối sau khi component đã mount ở client:
    ```typescript
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => setIsMounted(true), []);
    // Trong render:
    <span>{isMounted ? formatTime(n.createdAt) : ''}</span>
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-008] API Kiểm Tra Điểm Phạt Gian Hàng (`/seller/appeals`) bị lỗi `401 Unauthorized`
- **1. Vị trí chính xác:**
  - Màn hình: Trung Tâm Kháng Nghị & Điểm Vi Phạm (`/seller/appeals`)
  - File mã nguồn: `web/src/ui/services/sellerPenaltyService.ts`, `web/src/app/api/seller/penalties/route.ts`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Truy cập trang `/seller/appeals`: Bảng điểm sao quả tạ (Penalty Points) và danh sách hành vi vi phạm hiển thị trống rỗng hoặc báo lỗi kết nối máy chủ.
  - Console và Network ghi nhận liên tiếp:
    ```http
    POST http://localhost:3100/api/seller/penalties 401 (Unauthorized)
    GET http://localhost:3100/api/seller/penalties 401 (Unauthorized)
    ```
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Next.js Route Handler tại `web/src/app/api/seller/penalties/route.ts` yêu cầu xác thực phiên nhưng hàm gọi trong `sellerPenaltyService.ts` không truyền token ủy quyền từ cookie hoặc header `Authorization`.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung header xác thực trong `sellerPenaltyService.ts`:
    ```typescript
    const token = tokenStorage.getAccessToken();
    headers: { 'Authorization': `Bearer ${token}` }
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-009] API Cấu Hình Gói AI Audio (`/seller/product/create-ebook`) trả về `401 Unauthorized`
- **1. Vị trí chính xác:**
  - Màn hình: Đăng Sách Điện Tử & Audio AI (`/seller/product/create-ebook`)
  - File mã nguồn: `web/src/ui/components/seller/SellerCreateProductView.tsx`
  - Endpoint bị ảnh hưởng: `GET /api/v1/ai-audio/plans`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi NXB chọn tính năng *"Chuyển đổi sách chữ thành Audio AI"*, danh sách các gói cước giọng đọc AI (Gói Tiêu chuẩn, Giọng đọc Truyền cảm, Giọng Hà Nội/Sài Gòn) không tải được, hiển thị vòng xoay vô tận.
  - Network tab ghi nhận lỗi: `GET http://localhost:3000/api/v1/ai-audio/plans 401 (Unauthorized)`.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Endpoint `/ai-audio/plans` được phân quyền cho khách mua và đối tác NXB, nhưng service backend kiểm tra quyền thiếu role `BUSINESS`, chỉ chấp nhận role `USER` hoặc `PLATFORM_ADMIN`.
- **4. Cách khắc phục đề xuất:**
  - Cập nhật decorator phân quyền trong `platform/apps/commerce-service` hoặc `api-gateway` cho phép vai trò `BUSINESS` truy cập danh sách gói cước AI Audio.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-010] Provider Dấu Trang Đọc Sách của Bạn Đọc bị rò rỉ chạy ngầm trong Seller Portal (Spam lỗi 404 hơn 214 lần)
- **1. Vị trí chính xác:**
  - Màn hình: Toàn bộ Kênh Người Bán (`/seller/*`)
  - File mã nguồn: [web/src/ui/components/reader/ReaderSyncProvider.tsx](file:///e:/HuKi/web/src/ui/components/reader/ReaderSyncProvider.tsx)
  - Endpoint bị spam: `GET /api/reader/bookmarks/con-duong-phia-truoc (404 Not Found)`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Trong suốt quá trình duyệt các trang của Kênh Người Bán, tab Network ghi nhận tới **214 request lỗi 404** gửi liên tục về URL `/api/reader/bookmarks/con-duong-phia-truoc`.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Component `ReaderSyncProvider` được đặt ở `RootLayout` (`web/src/app/layout.tsx`) hoặc layout cấp cao nhưng không kiểm tra route hiện tại. Khi người dùng đang ở kênh B2B của người bán (`/seller/*`), hook này vẫn tự động kích hoạt tiến trình đồng bộ dấu trang cho một cuốn sách mẫu.
- **4. Cách khắc phục đề xuất:**
  - Thêm điều kiện kiểm tra đường dẫn trước khi kích hoạt logic đồng bộ:
    ```typescript
    const pathname = usePathname();
    if (!pathname.startsWith('/reader') && !pathname.startsWith('/read/')) {
      return null;
    }
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-011] [Anti-AI Design Flaw] Tồn tại các khối cầu phát sáng `blur-3xl` tại Trung Tâm Khuyến Mãi và Hồ Sơ Pháp Nhân
- **1. Vị trí chính xác:**
  - Màn hình: `/seller/promotions`, `/seller/business`, `/seller/profile`
  - File mã nguồn: [web/src/app/seller/business/page.tsx](file:///e:/HuKi/web/src/app/seller/business/page.tsx#L583), `web/src/app/seller/promotions/page.tsx`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Các trang quản trị đối tác xuất hiện các khối cầu màu vàng kích thước lớn được làm mờ:
    ```html
    <div className="absolute top-0 right-0 w-80 h-80 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>
    ```
  - Các khối blur này tạo cảm giác giao diện demo AI tự sinh, làm mất đi tính trang nghiêm, minh bạch và chính xác của một hệ thống quản trị pháp nhân và tài chính xuất bản B2B.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Chưa được làm sạch theo đúng quy chuẩn Editorial B2B Workspace của HUKI.
- **4. Cách khắc phục đề xuất:**
  - Xóa bỏ toàn bộ các thẻ chứa `blur-3xl` và `blur-2xl`. Thay nền bằng tông Slate `#F8FAFC` sạch sẽ và đường viền mảnh dứt khoát `#E2E8F0`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-012] Quản Lý Đơn Hàng (`/seller/orders`): Chuyển đổi tab trạng thái làm mất đồng bộ URL query parameter
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Đơn Hàng (`http://localhost:3100/seller/orders`)
  - File mã nguồn: `web/src/ui/components/seller/SellerGroupedOrderTable.tsx`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi chủ shop bấm chuyển từ tab *"Tất cả"* sang tab *"Chờ xác nhận"*, danh sách đơn được lọc bằng state cục bộ nhưng URL trình duyệt không được cập nhật thành `/seller/orders?status=PENDING`.
  - Khi người bán copy link gửi cho nhân viên kho hoặc refresh lại trang, hệ thống lại quay về tab *"Tất cả"*, buộc người dùng phải click chọn lại.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Hàm `handleTabChange` chỉ gọi `setActiveTab(tab)` mà thiếu `router.push(`/seller/orders?status=${tab}`, { scroll: false })`.
- **4. Cách khắc phục đề xuất:**
  - Đồng bộ trạng thái tab vào URL Search Params để hỗ trợ chia sẻ link và lưu lịch sử duyệt.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-013] Nguy cơ vòng lặp chuyển hướng (Infinite Redirect Loop) tại luồng Onboarding Seller
- **1. Vị trí chính xác:**
  - File mã nguồn: [web/src/app/seller/layout.tsx](file:///e:/HuKi/web/src/app/seller/layout.tsx#L55-L65)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi tài khoản NXB đã được Ban Quản Trị duyệt (`status: 'APPROVED'`), nhưng chưa điền đầy đủ cả 2 trường `bankAccountNumber` và `bankName`, hệ thống ép chuyển hướng về `/seller/stores/setup`.
  - Tại trang setup, nếu người dùng bấm nút *"Lưu thông tin"* mà API trả về chậm hoặc người dùng refresh trang, logic kiểm tra `isSetupCompleted` có thể bị đánh giá sai giữa server và client, dẫn đến việc trình duyệt bị chuyển hướng qua lại liên tục giữa `/seller/dashboard` $\leftrightarrow$ `/seller/stores/setup`.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Biến `isSetupCompleted` phụ thuộc đồng thời vào dữ liệu trong `user.business` và cờ lưu tạm trong `localStorage`. Khi một trong hai bên chưa kịp đồng bộ, middleware layout sẽ kích hoạt chuyển hướng lặp.
- **4. Cách khắc phục đề xuất:**
  - Chỉ dựa vào trường chuẩn xác từ backend: `user.business.isSetupCompleted` hoặc kiểm tra `user.business.stores.length > 0`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-014] Bảng Sổ Cái Ký Quỹ Escrow (`/seller/escrow`) thiếu chỉ báo cuộn ngang trên Tablet
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Tiền Ký Quỹ Đơn Hàng (`http://localhost:3100/seller/escrow`)
  - File mã nguồn: `web/src/ui/components/seller/SellerEscrowView.tsx`
  - Viewport ảnh hưởng: **Tablet (768px)** và **Mobile (390px)**.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Bảng đối soát Escrow gồm 8 cột (Mã đơn, Ngày phát sinh, Giá trị đơn, Phí sàn, Ký quỹ tạm giữ, Ngày mở khóa dự kiến, Trạng thái, Hành động).
  - Trên màn hình Tablet 768px, bảng bị ép hẹp lại, các cột số tiền và ngày mở khóa bị tràn ra ngoài khung nhìn nhưng không có thanh cuộn ngang rõ ràng, người dùng không biết là có thể kéo sang phải để xem số tiền sàn đang giữ.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Container bảng thiếu lớp `overflow-x-auto` kèm thanh cuộn có thanh trượt tương phản cao (scrollbar styled).
- **4. Cách khắc phục đề xuất:**
  - Bổ sung `overflow-x-auto` và shadow mờ bên phải để báo hiệu cho người dùng biết bảng còn dữ liệu cuộn sang ngang.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-015] [Chức Năng - P0] Endpoint `GET /api/v1/stores/my` Crash HTTP 500 do Prisma ném unhandled exception khi thiếu query `businessId`
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Gian Hàng & Chi Nhánh NXB (`/seller/stores`, `/seller/dashboard`)
  - File mã nguồn Backend: `platform/apps/business-service/src/modules/store/store.controller.ts` (dòng 68-82) & `store.service.ts` (dòng 266-273)
  - Endpoint: `GET /api/v1/stores/my`
  - Viewport ảnh hưởng: Toàn bộ nền tảng.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi client gọi `GET /api/v1/stores/my` (hoặc khi component mount mà chưa kịp nạp `businessId` từ localStorage vào URL query):
    ```http
    GET http://localhost:3000/api/v1/stores/my 500 (Internal Server Error)
    ```
    ```json
    {
      "status": "error",
      "statusCode": 500,
      "code": "SYSTEM_INTERNAL_ERROR",
      "message": "Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại sau.",
      "path": "/api/v1/stores/my"
    }
    ```
  - Hậu quả: Toàn bộ widget chọn gian hàng đang vận hành của NXB trên Header và trang `/seller/stores` bị văng lỗi máy chủ, không tải được thông tin shop.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Tại `store.controller.ts`, hàm `getMyStores(@Query('businessId') businessId: string, @CurrentUser('id') userId: string)` nhận `businessId` là tham số query không bắt buộc.
  - Khi gọi hàm `storeService.getStoresByBusiness(businessId, userId)`, service thực hiện lệnh Prisma:
    ```ts
    await this.prisma.member.findUnique({
      where: { businessId_userId: { businessId, userId } }
    });
    ```
  - Do `businessId` mang giá trị `undefined`, Prisma ném ngoại lệ nghiêm trọng vì compound key `businessId_userId` bắt buộc cả 2 trường phải là chuỗi hợp lệ, làm sập toàn bộ request với HTTP 500.
- **4. Cách khắc phục đề xuất:**
  - Thêm validation kiểm tra sớm trong controller:
    ```ts
    if (!businessId) {
      throwBadRequest(ErrorCode.VALIDATION_ERROR, 'Tham số businessId là bắt buộc');
    }
    ```
  - Hoặc nếu không có query `businessId`, tự động tìm kiếm doanh nghiệp đầu tiên mà `userId` đang sở hữu làm giá trị mặc định.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-016] [Chức Năng - P1] Sai lệch định nghĩa enum `SellerOrderStatus` giữa tài liệu kiểm thử và backend gây lỗi HTTP 400 Bad Request
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Đơn Hàng NXB (`/seller/orders`)
  - File mã nguồn Backend: `platform/apps/commerce-service/prisma/schema.prisma` (`enum SellerOrderStatus`) & `orders/dto/order-query.dto.ts`
  - Viewport ảnh hưởng: Toàn bộ viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi người bán lọc đơn hàng theo các trạng thái `PROCESSING` hoặc `SHIPPING`:
    ```http
    GET http://localhost:3000/api/v1/seller/orders?status=PROCESSING 400 (Bad Request)
    GET http://localhost:3000/api/v1/seller/orders?status=SHIPPING 400 (Bad Request)
    ```
  - Backend trả về lỗi: `Validation failed: status must be one of the following values: PENDING_PAYMENT, PENDING_CONFIRMATION, CONFIRMED, PREPARING, SHIPPED, DELIVERED, COMPLETED, CANCELLED`.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Có sự nhầm lẫn giữa enum `OrderStatus` của người mua (`PROCESSING`, `SHIPPING`) và enum `SellerOrderStatus` của người bán (`PREPARING`, `SHIPPED`).
  - Giao diện và tài liệu kiểm thử cũ sử dụng sai enum khiến các request lọc đơn theo trạng thái chuẩn bị và đang giao bị lỗi 400.
- **4. Cách khắc phục đề xuất:**
  - Đồng bộ hóa các tab lọc trong `SellerOrdersView` và `tasks/module-02-seller-portal-flows.md` sang đúng chuẩn: `PREPARING` (Đang chuẩn bị hàng) và `SHIPPED` (Đang giao hàng).
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-017] [Chức Năng - P1] Route Flash Sale của Seller bị chặn bởi param `:id` của controller công khai gây lỗi HTTP 400 Bad Request
- **1. Vị trí chính xác:**
  - Màn hình: Đăng Ký Flash Sale Gian Hàng (`/seller/promotions/flash-sale`)
  - File mã nguồn Backend: `platform/apps/promotion-service/src/modules/flash-sales/flash-sales.controller.ts` vs `seller-flash-sales.controller.ts`
  - Viewport ảnh hưởng: Toàn bộ nền tảng.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi client gọi `GET /api/v1/flash-sales/seller`, Gateway định tuyến sang `flash-sales.controller.ts`.
  - Endpoint `@Get(':id')` bắt chuỗi `'seller'` làm tham số ID và pipe `ParseUUIDPipe` ném lỗi HTTP 400:
    ```json
    {
      "status": "error",
      "statusCode": 400,
      "code": "VALIDATION_ERROR",
      "message": "Validation failed (uuid is expected)",
      "path": "/api/v1/flash-sales/seller"
    }
    ```
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Đường dẫn root `/flash-sales/seller` bị trùng tiền tố với route dynamic `:id` của Flash Sale công khai. Để lấy dữ liệu của seller, backend yêu cầu gọi vào các sub-route cụ thể: `/flash-sales/seller/slots`, `/flash-sales/seller/my-slots`, `/flash-sales/seller/my-items`.
- **4. Cách khắc phục đề xuất:**
  - Đảm bảo client gọi đúng các endpoint chuyên biệt `/flash-sales/seller/slots` hoặc `/flash-sales/seller/my-items`.
  - Trong `flash-sales.controller.ts`, đặt các route tĩnh trước route `:id` động để tránh nuốt nhầm request.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-02-018] [Chức Năng - P1] Bất đồng bộ tiền tố Controller giữa Voucher và Giảm Giá của Kênh Người Bán
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Khuyến Mãi Shop (`/seller/promotions/*`)
  - File mã nguồn Backend: `platform/apps/promotion-service/src/modules/vouchers/seller-vouchers.controller.ts` (`@Controller('seller/vouchers')`) và `discounts/seller-discounts.controller.ts` (`@Controller('seller/discounts')`)
  - Viewport ảnh hưởng: Toàn bộ nền tảng.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Có sự không đồng nhất về mặt kiến trúc URL:
    * Flash Sale dùng prefix: `/flash-sales/seller/...`
    * Voucher shop dùng prefix: `/seller/vouchers`
    * Giảm giá sách dùng prefix: `/seller/discounts`
  - Khi client nhầm lẫn gọi theo kiểu `/vouchers/seller` hoặc `/discounts/seller`, request lập tức bị lỗi 400 hoặc 404 do controller không khớp.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Tiêu chuẩn đặt tên URL endpoint của các microservices trong phân hệ Khuyến mãi chưa được chuẩn hóa đồng bộ giữa các controller của Người bán.
- **4. Cách khắc phục đề xuất:**
  - Chuẩn hóa toàn bộ endpoint của kênh người bán theo tiền tố thống nhất: `/seller/promotions/vouchers`, `/seller/promotions/flash-sales`, `/seller/promotions/discounts`, hoặc bổ sung alias định tuyến tại API Gateway.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

## 📊 TỔNG HỢP THEO DÕI TIẾN ĐỘ MOD-02
- **Tổng số lỗi đã bóc tách chi tiết:** **18 Lỗi**
  - Lỗi Responsive tràn layout màn hình: 5 Lỗi (1 Tablet, 4 Mobile)
  - Lỗi Hiệu năng & Rate Limit (HTTP 429): 1 Lỗi nghiêm trọng (Chat polling bão 89 lần)
  - Lỗi Runtime, React Hydration Mismatch: 1 Lỗi (Trang thông báo)
  - Lỗi Network, API & Phân quyền Microservices: 3 Lỗi (Penalty 401, AI Audio 401, Bookmark leak 404)
  - Lỗi Anti-AI & Thẩm mỹ B2B: 1 Lỗi (Blur blobs)
  - Lỗi Nghiệp vụ, UX & Điều hướng: 3 Lỗi (Tab query, Redirect loop, Escrow scroll)
  - Lỗi Chức Năng Nghiệp Vụ Cốt Lõi (Store 500, Order Enums 400, Flash Sale/Voucher Route 400): 4 Lỗi mới
- **Cam kết tuân thủ:** 100% chưa can thiệp sửa code, đã kiểm thử thực tế trên phiên đăng nhập đối tác thật.
