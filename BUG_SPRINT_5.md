# BÁO CÁO THẨM ĐỊNH LỖI & KẾ HOẠCH BẢO TRÌ SPRINT 5 (100% ZERO MOCK - PRODUCTION READY)

> **Dự án:** HuKi Ebook & Print-on-Demand Marketplace  
> **Tài liệu tham chiếu:** [`readme-bug.md`](file:///e:/HuKi/readme-bug.md) (Quy trình chuẩn hóa 12 bước)  
> **Môi trường mục tiêu:** Staging UAT (`https://huki-uat.duckdns.org`)  
> **Nhánh thực thi:** `fix-bug-sprint5`  
> **Ngày khởi tạo:** 22/11/2026

---

## 📌 BẢNG TỔNG HỢP DANH MỤC LỖI SPRINT 5

| Mã Bug | Phân Hệ | Mô Tả Lỗi Thực Tế | Mức Độ | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-035** | Performance / Gateway | Bão request ngầm `POST /api/analytics/events/batch` trả về 404 liên tục mỗi 3 giây, làm tràn log console, ngốn băng thông và CPU; Socket.IO retry 502 khi kết nối websocket. | **Cao (P1)** | Đang thẩm định |
| **BUG-036** | UI/UX / Navigation | Header Mobile: Các nút icon (Tìm kiếm, Giỏ hàng, Chuông thông báo, Hộp thư, Avatar) bị bọc từng khung viền xám rời rạc (`border border-slate-200`) thô kệch, thiếu đồng bộ thẩm mỹ di động hiện đại. | **Trung bình (P2)** | Đang thẩm định |
| **BUG-037** | UI/UX / Community Reviews | Giao diện Đánh Giá & Bình Luận (`ReviewCard` & khu vực tổng quan đánh giá tại trang chi tiết sách) khô cứng, thô kệch, vỡ bố cục trên mobile khi có nút sửa; ảnh đính kèm lỗi 403 / broken link không có fallback làm xấu giao diện. | **Cao (P1)** | Đang thẩm định |

---

## 🏗️ BƯỚC 2: PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ 4 TẦNG & MA TRẬN RỦI RO DOMINO

### 1. Phân Tích Chi Tiết Từng Lỗi

#### 🔍 BUG-035: Bão Request Ngầm 404 & Vòng Lặp Retry Thiếu Exponential Backoff
* **Tầng 3 (Gateway & Proxy - `docker/nginx/uat-nginx.conf` & `api-gateway`):**
  - Trong `uat-nginx.conf`, chỉ thị `location /api/` chặn và chuyển tiếp toàn bộ request bắt đầu bằng `/api/` tới `api-gateway-uat:3000`.
  - Trong khi đó, `api-gateway` sử dụng tiền tố toàn cục `/api/v1`. Endpoint `/api/analytics/events/batch` không có `/v1` nên bị Gateway từ chối với mã 404 Not Found.
  - Ngoài ra, trong `route-classification.ts`, route `/events` và `/analytics` chưa được phân loại là `PUBLIC`, dẫn đến việc kiểm tra quyền bị sai lệch đối với khách vãng lai.
* **Tầng 4 (Frontend Client - `web/src/lib/tracker.ts`):**
  - Tại dòng 263-266 của `tracker.ts`, khi nhận phản hồi lỗi từ server (`!response.ok`), code thực hiện chèn ngược toàn bộ sự kiện trở lại hàng đợi: `this.buffer = [...events, ...this.buffer]`.
  - Hàng đợi không bao giờ được dọn sạch, và cứ mỗi `flushIntervalMs = 3000` (3 giây), `setInterval` lại tiếp tục gửi request lên server.
  - Vòng lặp vô tận này lặp lại liên tục, sinh ra hàng trăm request 404 trong Console, gây quá tải CPU và tắc nghẽn network thread của trình duyệt.
  - Thiếu hoàn toàn cơ chế Circuit Breaker, Exponential Backoff và hủy buffer khi gặp lỗi không thể phục hồi (404/403/400).

#### 🔍 BUG-036: Header Mobile Bị Đóng Khung Viền Từng Icon Gây Thô Kệch
* **Tầng 4 (Frontend Client - `web/src/ui/components/layout/StoreHeader.tsx` & `UniversalNotificationBell.tsx`):**
  - Từng phần tử icon trên Header (Nút tìm kiếm mobile dòng 679, Giỏ hàng dòng 692, Chuông thông báo, Hộp thư dòng 715, Avatar dòng 737) đều áp dụng class `w-9 h-9 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white shadow-2xs`.
  - Trên màn hình di động chật hẹp, các khung viền xám nằm san sát nhau tạo cảm giác bị chia cắt như các "ô hộp" cứng nhắc, phá vỡ phong cách thiết kế tối giản, mềm mại chuẩn sàn thương mại điện tử hiện đại (như Shopee, Tiki, Apple).

#### 🔍 BUG-037: Khu Vực Đánh Giá / Bình Luận Cứng Nhắc, Thiếu Mềm Mại & Lỗi Ảnh Vỡ
* **Tầng 4 (Frontend Client - `web/src/ui/components/review/ReviewCard.tsx` & `web/src/app/book/[id]/page.tsx`):**
  - **Khô cứng về mặt thị giác:** Các thẻ đánh giá sử dụng viền xám cơ bản, thiếu các lớp đổ bóng mềm (soft ambient shadow), thanh phân bổ sao dùng màu đơn sắc thô ráp, thiếu các đường nét bo tròn thoải mái (`rounded-2xl`, `rounded-3xl`).
  - **Vỡ bố cục trên Mobile:** Khi người dùng xem đánh giá của chính mình, thẻ có thêm nút "Sửa đánh giá" đặt cạnh hàng 5 ngôi sao trong cùng hàng ngang flexbox, làm co ép tên người dùng và huy hiệu "Đã mua hàng", khiến chữ bị tràn hoặc ngắt dòng lộn xộn.
  - **Lỗi hiển thị ảnh đính kèm (Broken Images):** Thẻ `<img>` ảnh đánh giá dòng 257 không có `referrerPolicy="no-referrer"` và không có xử lý `onError`. Khi ảnh từ các nguồn ngoài (như Goodreads/Amazon CDN chặn hotlink bằng 403 Forbidden hoặc đường dẫn ảnh không tồn tại), trình duyệt hiển thị biểu tượng ảnh vỡ thô kệch `alt="Ảnh chụp"` làm mất thiện cảm người dùng.

---

### 2. Ma Trận Rủi Ro Domino (Domino Impact Assessment)

| Vùng Thay Đổi | Phân Hệ Liên Quan | Rủi Ro Tiềm Ẩn | Biện Pháp Kiểm Soát |
| :--- | :--- | :--- | :--- |
| Sửa `tracker.ts` & định tuyến Gateway | Toàn bộ các trang Frontend thu thập hành vi người dùng (Tracking) | Mất dữ liệu sự kiện phân tích nếu hạ tần suất gửi | Dùng cơ chế Exponential Backoff (3s -> 10s -> 30s); nếu gặp 404 hủy hàng đợi và tự động tắt tracker để bảo vệ CPU |
| Tinh chỉnh Header Mobile Icons | Trải nghiệm giao diện trên toàn bộ các route trang khách hàng | Nút bấm không viền có thể khó nhận biết vùng bấm (touch target) | Giữ nguyên vùng bấm chuẩn W3C tối thiểu 38x38px, thêm hover/active feedback mềm mại (`active:scale-90 hover:bg-slate-100/80`) |
| Tái thiết kế `ReviewCard` & Book Reviews Tab | Trang chi tiết sách (`/book/[id]`), trang xem đánh giá (`/reviews/[id]`), trang hồ sơ người dùng (`/profile/reviews`) | Giao diện mới có thể lệch kích thước hoặc không tương thích Dark Mode | Sử dụng CSS Variables chuẩn hệ thống thiết kế (`var(--theme-surface)`, `var(--theme-border)`), kiểm tra tương thích 100% trên cả Desktop và Mobile viewport |

---

## 🎯 TIÊU CHUẨN NGHIỆM THU (ACCEPTANCE CRITERIA - AC)

### BUG-035 (Chấm dứt Spam 404 & Giảm tải CPU)
- **Given** Khách hàng hoặc người dùng đăng nhập truy cập bất kỳ trang nào trên Web.
- **When** Tracker thu thập các sự kiện hành vi và gửi lên máy chủ.
- **Then** Request gửi thành công tới endpoint hợp lệ của Gateway (`/api/v1/events/batch`); nếu server trả về lỗi 404/403/500, tracker tự động hủy retry loop và không spam console; CPU trình duyệt hoạt động ổn định < 5%.

### BUG-036 (Header Mobile Tinh Gọn, Mềm Mại)
- **Given** Người dùng truy cập bằng thiết bị di động (viewport < 768px).
- **When** Quan sát thanh Header ở phía trên cùng.
- **Then** Các nút Tìm kiếm, Giỏ hàng, Thông báo, Tin nhắn và Tài khoản hiển thị dưới dạng icon mềm mại, không có viền hộp xám bao quanh từng nút, có hiệu ứng chạm nhẹ nhàng, huy hiệu số lượng nằm gọn gàng góc trên.

### BUG-037 (Giao Diện Bình Luận Sang Trọng, Mềm Mại Chuẩn Shopee Luxury)
- **Given** Người dùng xem tab "Đánh Giá" tại trang chi tiết sách trên Desktop hoặc Mobile.
- **When** Đọc danh sách nhận xét và điểm số tổng quan.
- **Then**:
  1. Thẻ đánh giá có các góc bo tròn mềm mại (`rounded-2xl`), đường viền tinh tế, bóng đổ nhẹ (soft drop shadow).
  2. Huy hiệu "Đã mua hàng" và "Định dạng sách" được thiết kế thanh lịch, không bị xô lệch trên màn hình nhỏ.
  3. Khi có nút "Sửa đánh giá", bố cục tự động thích ứng mượt mà trên mobile mà không đè lên hàng sao hay tên độc giả.
  4. Nếu ảnh đính kèm gặp lỗi (403/404), hệ thống tự động ẩn hoặc thay thế bằng ảnh placeholder nhẹ nhàng, không bao giờ để lộ biểu tượng ảnh vỡ.

---

## 🛠️ BƯỚC 4: THỰC HIỆN SỬA ĐỔI MÃ NGUỒN (ZERO-MOCK REAL CODE)

1. **`web/src/lib/tracker.ts`:**
   - Thay đổi default endpoint thành `/api/v1/events/batch`.
   - Nâng khoảng thời gian `flushIntervalMs` từ 3s lên 15s để tiết kiệm CPU và pin thiết bị di động.
   - Bổ sung **Circuit Breaker**: Khi response nhận mã `404`, `400`, `403` hoặc đạt 3 lần thất bại liên tiếp, toàn bộ buffer bị xóa sạch (drop buffer) và tracker tự động ngắt (`isSuspended = true`) trong 2 phút (120s), triệt tiêu hoàn toàn hiện tượng bão request ngầm làm treo console và ngốn CPU.
   - Thêm cơ chế bảo toàn tối đa 10 sự kiện gần nhất khi gặp lỗi mạng tạm thời thay vì dồn tích lũy vô hạn.

2. **`web/src/app/api/analytics/events/batch/route.ts`:**
   - Cập nhật URL upstream gateway chuyển tiếp sang `${gatewayUrl}/api/v1/events/batch`.

3. **`platform/apps/api-gateway/src/modules/proxy/route-classification.ts`:**
   - Đăng ký các route telemetry: `/events`, `/events/*`, `/analytics/events`, `/analytics/events/*` thuộc nhóm `PUBLIC` (hỗ trợ mọi phương thức bao gồm `POST` từ client vãng lai).
   - Đăng ký `/socket.io` handshake là `PUBLIC`.

4. **`web/src/ui/components/layout/StoreHeader.tsx` & `UniversalNotificationBell.tsx`:**
   - Xóa bỏ toàn bộ khung viền `border border-slate-200` và `rounded-xl` đóng hộp cứng ngắc trên từng nút action.
   - Chuyển đổi thành **Ghost Icon Buttons**: `w-9 h-9 sm:w-9.5 sm:h-9.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 hover:text-[#00875A] active:scale-90 transition-all`.
   - Duy trì chuẩn touch target W3C 38px, huy hiệu badge đỏ nổi bật góc trên với viền trắng ring sắc nét.

5. **`web/src/ui/components/review/ReviewCard.tsx`:**
   - Thay thế toàn bộ layout container sang phong cách Shopee Luxury: `bg-gradient-to-b from-white to-[#faf9f6]/40 dark:from-zinc-900 dark:to-zinc-900/60 rounded-3xl border border-slate-100 dark:border-zinc-800/80 p-5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]`.
   - **Responsive Header:** Tự động chuyển dạng cột trên mobile `flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4`, tách bạch rõ ràng giữa khối avatar/tên/huy hiệu và khối sao/nút sửa, loại bỏ hoàn toàn hiện tượng xô lệch, co kéo chữ.
   - **Chống lỗi ảnh 403 Forbidden / Broken:** Thêm `referrerPolicy="no-referrer"` và `onError={(e) => { (e.currentTarget.parentElement as HTMLElement)?.remove(); }}` để tự động ẩn container nếu ảnh từ CDN ngoài bị lỗi, không để lộ icon ảnh vỡ.
   - Nút "Hữu ích" và "Báo cáo" nâng cấp lên chuẩn pill chip mềm mại, có active scale feedback.

6. **`web/src/app/book/[id]/page.tsx`:**
   - Hộp tổng quan đánh giá tái thiết kế chuẩn Luxury Soft: `bg-gradient-to-br from-[#faf9f6] via-white to-[#f0f6f4] rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_4px_24px_-6px_rgba(0,0,0,0.04)]`.
   - Thanh tiến độ rating dạng gradient hổ phách ấm áp `from-amber-400 to-amber-500` với bo tròn mềm mại.
   - Nút lọc theo sao chuyển sang pill chip với active state `#003B2B`.
   - Banner cam kết minh bạch POL-13 nâng cấp lên bo góc `rounded-2xl` với nền gradient emerald ngọc lục bảo tinh tế.

---

## 🧪 BƯỚC 5: KIỂM THỬ TỰ ĐỘNG CÔ LẬP (E2E AUTOMATION TEST)

- **Script kiểm thử:** [`scripts/test_e2e_sprint5_tracker_reviews.js`](file:///e:/HuKi/scripts/test_e2e_sprint5_tracker_reviews.js)
- **Kết quả thực thi:** **14/14 TEST CASES PASS (100%)**
  - ✅ Tracker Circuit Breaker drops buffer and suspends immediately on 404
  - ✅ Tracker Circuit Breaker suspends on 3 consecutive network failures
  - ✅ Route classification explicitly marks /events and /analytics/events as PUBLIC
  - ✅ Route classification explicitly marks /socket.io as PUBLIC
  - ✅ StoreHeader mobile search button uses borderless ghost icon styling
  - ✅ StoreHeader cart icon uses borderless ghost icon styling
  - ✅ StoreHeader chat button uses borderless ghost icon styling
  - ✅ UniversalNotificationBell uses borderless ghost icon styling
  - ✅ ReviewCard uses luxury rounded-3xl soft shadow card styling
  - ✅ ReviewCard header adapts responsively on mobile without squeezing author info
  - ✅ ReviewCard review image has referrerPolicy="no-referrer" to prevent 403 CDN blocks
  - ✅ ReviewCard review image has onError handler to remove broken images cleanly
  - ✅ Book detail page rating summary uses soft luxury rounded-3xl gradient styling
  - ✅ Book detail page Verified Purchase banner uses rounded-2xl soft emerald gradient

---

## 🛡️ BƯỚC 6: LOCAL QUALITY GATES CHUẨN HÓA

| Gate | Mô Tả Kiểm Tra | Kết Quả |
| :--- | :--- | :--- |
| **Gate 1** | `git diff --check` (Whitespace & Git syntax) | **PASS** (Zero errors) |
| **Gate 2** | `npm --prefix platform test -- route-classification.spec.ts service-proxy.middleware.spec.ts` | **PASS** (27/27 unit tests pass) |
| **Gate 3** | `npm --prefix web run typecheck` (`tsc --noEmit`) | **PASS** (Zero TypeScript compilation errors) |
| **Gate 4** | `npm --prefix web run build` (`next build` Turbopack) | **PASS** (141 routes compiled & prerendered successfully) |
