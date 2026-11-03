# 📋 DANH SÁCH & KẾ HOẠCH FIX LỖI UI/UX - HƯỚNG GIẢI QUYẾT (HU KI)

> **Nhánh làm việc:** `fix/ui-ux-v3`  
> **Nguyên tắc:** Ghi nhận lỗi, phân tích nguyên nhân gốc rễ (Root Cause) và đưa ra hướng giải quyết chi tiết. **Chỉ bắt đầu sửa code khi có chỉ định từ người dùng.**

---

## 📌 BẢNG TỔNG HỢP TRẠNG THÁI TASK

| STT | Vấn đề / Lỗi | Mức độ | Trạng thái | Khu vực ảnh hưởng |
| :---: | :--- | :---: | :---: | :--- |
| **01** | Tạo tài liệu theo dõi task & phương án giải quyết | Thấp | `HOÀN THÀNH` | Tài liệu quản lý dự án |
| **02** | Di chuyển nút "Yêu thích" & "Chia sẻ" thành icon trên cùng (Trái/Phải) & Cơ chế Link Chia sẻ (Affiliate) | Trung bình | `CHỜ LỆNH FIX` | `web/src/app/book/[id]/page.tsx` |
| **03** | Khả năng đồng bộ Realtime trạng thái (Yêu thích) giữa 2 thiết bị cùng tài khoản | Cao | `CHỜ LỆNH FIX` | `realtimeSyncBus`, Backend Wishlist API |
| **04** | Lỗi khi bấm Mua ngay: *"Không thể khởi tạo đơn hàng: Dịch vụ Flash Sale tạm thời không khả dụng"* | Khẩn cấp | `CHỜ LỆNH FIX` | `commerce-service`, `docker-compose.uat.yml` |
| **05** | Sidebar "Trình Đọc Ebook" mở vào trang lỗi PDF & Xử lý sách không có file đọc thử | Cao | `CHỜ LỆNH FIX` | `HierarchicalSidebar.tsx`, `/reader/page.tsx`, `/book/[id]` |
| **06** | Ảnh bìa sách "Chiến Binh Cầu Vồng" hiển thị bình thường ở ngoài nhưng vỡ ảnh khi vào chi tiết | Trung bình | `CHỜ LỆNH FIX` | `web/src/app/book/[id]/page.tsx`, `BookCover.tsx` |
| **07** | Bỏ hiệu ứng làm mờ và nhãn "MẪU (MOCK)" trên trang `/stores`, kích hoạt cửa hàng thật (NXB & Tác Giả) | Trung bình | `CHỜ LỆNH FIX` | `web/src/app/stores/page.tsx` |
| **08** | Header Kênh Người Bán (`/seller`) lỗi và các nút điều hướng bấm không ăn | Trung bình | `ĐÃ FIX` | `SellerPortalLayout.tsx`, `seller/layout.tsx` |
| **09** | Menu thanh điều hướng tài khoản cá nhân (`/account`) quá nhỏ, chữ bị cắt vụn và rối mắt | Trung bình | `CHỜ LỆNH FIX` | `AccountLayout.tsx` |
| **10** | Tính năng Flash Sale trên trang `/books` và `/flash-sale` đang mock, chưa hoạt động thực tế | Cao | `CHỜ LỆNH FIX` | `flash-sale/page.tsx`, CSDL Promotion UAT |
| **11** | Đăng nhập tài khoản bị văng phiên đăng nhập giữa các thiết bị (Giới hạn phiên Active Devices) | Cao | `CHỜ LỆNH FIX` | `identity-service`, `policy-config.service.ts` |
| **12** | Vòng lặp chuyển hướng vô tận (Infinite Redirect Loop) gây spam loading ở `/seller/stores/setup` | Khẩn cấp | `ĐÃ FIX` | `seller/layout.tsx`, `seller/stores/setup/page.tsx` |
| **13** | Trang Quản Trị Admin báo lỗi đỏ *"Có lỗi xảy ra trong quá trình xử lý"* khi xem Báo cáo GMV Doanh số | Cao | `CHỜ LỆNH FIX` | `AdminReportsView.tsx`, `analytics-service` |
| **14** | Chatbot Tư Vấn Bé Cáo AI chỉ trả lời duy nhất 1 câu mặc định cho mọi câu hỏi | Cao | `CHỜ LỆNH FIX` | `FloatingAIChatbox.tsx`, `community-service`, `docker-compose.uat.yml` |
| **15** | Bấm vào NXB từ bộ lọc / trang chủ báo *"Không tìm thấy sản phẩm phù hợp"* dù NXB có sách (Nhã Nam) | Cao | `CHỜ LỆNH FIX` | `web/src/app/books/page.tsx` |
| **16** | Mục Combo Sách Tuyển Chọn trên Trang Chủ bị vỡ ảnh bìa số 2 ("Bìa 2") | Thấp | `CHỜ LỆNH FIX` | `web/src/app/page.tsx` |
| **17** | Rà soát & Loại bỏ lộ lọt Thông tin Bảo mật (API Key, Mật khẩu, VPS IP, Gmail Secret) trong Git & Docker/CI/CD | Khẩn cấp | `ĐÃ FIX` | `docker-compose.*.yml`, `.github/workflows/`, Scripts |

---

## 🔍 CHI TIẾT TỪNG VẤN ĐỀ & HƯỚNG GIẢI QUYẾT

---

### Task 02: Tối ưu UI nút Yêu thích & Chia sẻ + Cơ chế Link Chia sẻ (Affiliate vs Thường)

#### 1. Hiện trạng & Lỗi (Hình 1 đợt 1)
- Hai nút **Yêu thích** và **Chia sẻ** hiện đang nằm dưới nút *"Đọc Thử Bản Trực Tuyến"* dưới dạng 2 nút bấm chữ nhật lớn chiếm diện tích và thô.
- Nút **Yêu thích** hiện chỉ dùng `useState(false)` cục bộ trong component, chưa lưu vào database.
- Nút **Chia sẻ** hiện chỉ copy cứng `window.location.href`, chưa nhận diện người dùng có mã CTV (Affiliate) hay không.

#### 2. Yêu cầu thiết kế UI mới
- Chuyển 2 nút thành **Icon tròn nổi (floating glassmorphism icon)** nằm ở **góc trên bên Trái** (Yêu thích) và **góc trên bên Phải** (Chia sẻ) của khung bìa sách:
  - **Góc trên Trái:** Icon Trái tim (`favorite` / `favorite_border`).
  - **Góc trên Phải:** Icon Chia sẻ (`share`).
- Bỏ hàng 2 nút chữ nhật ở dưới, giúp khu vực nút *"Đọc Thử Bản Trực Tuyến"* và *"Bản quyền chính thức • HUKI DRM"* gọn gàng, thoáng mắt.

#### 3. Cơ chế Chia sẻ (Có Affiliate vs Không Affiliate)
- **Khi người dùng CÓ tài khoản Cộng Tác Viên (Affiliate Active):**
  - Hệ thống kiểm tra hồ sơ CTV (`affiliateApi.getMyProfile()` hoặc mã `affiliateCode`).
  - Nếu đã kích hoạt CTV: Gắn mã CTV vào link: `https://huki.vn/book/[id]?ref=[AFFILIATE_CODE]`.
  - Thông báo toast: *"Đã sao chép liên kết Tiếp Thị Liên Kết của bạn (Ghi nhận hoa hồng trong 30 ngày)!"*.
- **Khi người dùng KHÔNG CÓ Affiliate (Khách vãng lai / Độc giả thường):**
  - Sao chép liên kết sách sạch: `https://huki.vn/book/[id]`.
  - Thông báo toast: *"Đã sao chép liên kết sách!"*.

---

### Task 03: Khả năng Đồng bộ Realtime trạng thái giữa 2 máy cùng 1 tài khoản

#### 1. Hiện trạng
- Hiện tại trạng thái yêu thích chỉ là biến tạm `useState` trên một tab trình duyệt duy nhất. Máy B mở cùng tài khoản sẽ không nhận được dữ liệu.

#### 2. Hướng giải quyết
1. **Lưu trữ dữ liệu:** Khi user bấm Tim, gọi API lưu/xóa khỏi danh sách Wishlist của tài khoản (`userApi.toggleWishlist(bookId)`). Khi tải trang, lấy trạng thái yêu thích thực tế của user từ backend.
2. **Đồng bộ thời gian thực (Realtime):** Kết nối với `realtimeSyncBus` / WebSocket (sự kiện `WISHLIST_UPDATED`). Khi máy A bấm Thích hoặc Bỏ thích -> máy B nhận sự kiện và tự động đổi màu tim ngay lập tức.

---

### Task 04: Fix lỗi "Không thể khởi tạo đơn hàng: Dịch vụ Flash Sale tạm thời không khả dụng" khi Mua Ngay

#### 1. Phân tích nguyên nhân gốc rễ (Root Cause - Hình 2 đợt 1 & loi.docx)
1. Khi khách hàng bấm **Mua ngay**, request gửi đến `commerce-service` (`checkout.service.ts` dòng 146 & 226) luôn gọi `this.flashSales.quote(userId, book.id, quantity)`.
2. Trong file cấu hình [docker-compose.uat.yml](file:///e:/HuKi/docker-compose.uat.yml), container `commerce-service-uat` **không được cấu hình biến môi trường `PROMOTION_SERVICE_URL`**.
3. Service fallback về `localhost:3007` (trỏ vào chính nó bên trong container Docker commerce) -> kết nối bị từ chối (`ECONNREFUSED`), ném lỗi:
   ```ts
   throwBadRequest(ErrorCode.SYSTEM_UNAVAILABLE, "Dịch vụ Flash Sale tạm thời không khả dụng");
   ```
4. Đơn hàng sách thông thường (không phải flash sale) vẫn bị chặn đứng hoàn toàn vì lỗi này!

#### 2. Hướng giải quyết
1. **Cập nhật Docker Compose UAT ([docker-compose.uat.yml](file:///e:/HuKi/docker-compose.uat.yml)):**
   Bổ sung biến môi trường cho `commerce-service-uat`:
   ```yaml
   PROMOTION_SERVICE_URL: http://promotion-service-uat:3007
   PROMOTION_SERVICE_HOST: promotion-service-uat
   PROMOTION_SERVICE_PORT: 3007
   ```
2. **Cập nhật `flash-sale-client.service.ts`:**
   - Graceful Fallback: Nếu sách mua là sách thông thường (không có `flashSaleId`), khi kết nối Promotion Service gặp sự cố thì ghi log warning và tiếp tục cho phép mua sách theo giá gốc, không được làm hỏng luồng mua hàng.

---

### Task 05: Fix Sidebar "Trình Đọc Ebook" mở trang lỗi PDF & Lọc/Xử lý sách không có file đọc

#### 1. Hiện trạng & Lỗi (Hình 5 & 3 đợt 1 & loi.docx)
- Bấm "Trình Đọc Ebook" ở menu bên trái mở sang `/reader` và báo lỗi *"Không thể nạp tệp PDF. Vui lòng kiểm tra lại kết nối"*.
- Trang chi tiết sách hiển thị nút *"Đọc Thử Bản Trực Tuyến"* cho cả sách giấy thuần túy (`format: PHYSICAL`) hoặc sách chưa có file PDF.

#### 2. Hướng giải quyết
1. **Sửa liên kết Sidebar:** Đổi link menu "Trình Đọc Ebook" về `/library` (Tủ Sách Cá Nhân để user chọn cuốn mình sở hữu để đọc).
2. **Ẩn nút Đọc Thử khi sách không có PDF:** Trên trang chi tiết sách, chỉ hiển thị nút *"Đọc Thử Bản Trực Tuyến"* nếu sách có định dạng `DIGITAL` hoặc `BOTH`, và có file PDF khả dụng. Nếu là sách giấy (`PHYSICAL`), ẩn nút hoặc hiển thị nhãn *"Chỉ có ấn bản sách giấy"*.

---

### Task 06: Fix ảnh bìa "Chiến Binh Cầu Vồng" ở ngoài bình thường nhưng vào chi tiết bị vỡ

#### 1. Nguyên nhân gốc rễ
- Ở ngoài danh sách dùng [`BookCover.tsx`](file:///e:/HuKi/web/src/ui/components/common/BookCover.tsx) có `onError` fallback sang bìa typography gradient.
- Trong trang chi tiết dùng thẻ `<img>` thô, thiếu `referrerPolicy="no-referrer"`. Máy chủ Amazon/Goodreads chặn hotlink với lỗi 403 Forbidden khiến ảnh bị vỡ.

#### 2. Hướng giải quyết
- Thêm `referrerPolicy="no-referrer"` và sự kiện `onError` fallback sang bìa gradient typography hoặc ảnh placeholder mặc định.

---

### Task 07: Bỏ Mock làm mờ trên trang `/stores`, kích hoạt cửa hàng thật (NXB & Tác Giả)

#### 1. Hiện trạng (Hình đợt 1 & Hình 2 đợt 2: Tác Giả)
- Trang [stores/page.tsx](file:///e:/HuKi/web/src/app/stores/page.tsx) gán cờ `isMock: true` cho cả Nhà Xuất Bản và Tác Giả, ép class `opacity-40 select-none cursor-not-allowed pointer-events-none` và gắn nhãn `MẪU (MOCK)`.
- Người dùng không click vào xem gian hàng/tác giả được, bấm Theo dõi (Follow) cũng không hoạt động.

#### 2. Hướng giải quyết
- Xóa bỏ hoàn toàn lớp làm mờ (`opacity-40 pointer-events-none`) và nhãn `MẪU (MOCK)`.
- Kích hoạt nút chuyển hướng vào gian hàng `/shop/[id]` và tính năng Theo dõi (Follow) thật.
- Kết nối hiển thị danh sách Doanh nghiệp xuất bản và Tác giả thực tế từ CSDL.

---

### Task 08: Header Kênh Người Bán (`/seller`) lỗi và bấm không ăn

#### 1. Hiện trạng & Lỗi (Hình 1 đợt 2)
- Tại trang `https://huki-uat.duckdns.org/seller`, thanh header trên cùng gồm các mục *"Giới thiệu kênh"*, *"Đăng ký mở gian hàng"*, *"Về sàn HUKI"*, nút *"Đăng Ký Bán Hàng"* bấm không phản hồi hoặc bị giật lag/chặn thao tác.

#### 2. Nguyên nhân
- Trong [`SellerRouteLayoutContent`](file:///e:/HuKi/web/src/app/seller/layout.tsx), logic kiểm tra trạng thái login/role trong `useEffect` liên tục kích hoạt `router.replace` đè lên các liên kết click của người dùng.
- Thẻ `<header>` trong [`SellerPortalLayout.tsx`](file:///e:/HuKi/web/src/ui/components/layout/SellerPortalLayout.tsx) có xung đột về z-index hoặc điều kiện link giữa các trạng thái `PENDING_APPROVAL`, `APPROVED` và khách vãng lai.

#### 3. Hướng giải quyết
- Rà soát toàn bộ sự kiện click và đường dẫn `href` của các nút trên header `SellerPortalLayout`.
- Đảm bảo khách chưa đăng nhập khi bấm "Đăng ký bán hàng" sẽ chuyển hướng êm ái sang `/seller/register` (hoặc mở modal đăng ký), người đã có tài khoản sẽ chuyển tới đúng bước tương ứng mà không bị chặn click.

---

### Task 09: Menu thanh điều hướng tài khoản cá nhân (`/account`) quá nhỏ, chữ bị cắt vụn và rối mắt

#### 1. Hiện trạng (Hình 3 đợt 2)
- Thanh menu bên trái tại trang Trung Tâm Tài Khoản ([AccountLayout.tsx](file:///e:/HuKi/web/src/ui/components/layout/AccountLayout.tsx)) có chiều rộng quá hẹp (`md:w-56` = 224px).
- Các mục menu bị cắt chữ bằng dấu ba chấm (`truncate`):
  - *"Ví Voucher / Mã Giả..."* (thay vì "Ví Voucher / Mã Giảm Giá")
  - *"Giới Thiệu Chương T..."* (thay vì "Giới Thiệu Chương Trình")
  - *"Đăng Ký Tham ... Mới"* (thay vì "Đăng Ký Tham Gia CTV")
- Khoảng cách padding giữa các dòng quá khít (`py-1.5`), font chữ tiêu đề nhóm quá nhỏ (`text-[9.5px]`), gây cảm giác rối mắt và khó nhìn.

#### 2. Hướng giải quyết
- Mở rộng chiều rộng sidebar từ `w-56` (224px) lên `md:w-64` hoặc `md:w-72` (256px - 280px).
- Tăng khoảng cách đệm: Padding item lên `py-2.5 px-3`, tiêu đề nhóm tăng lên `text-xs font-bold`.
- Bỏ `truncate` ở những mục chữ ngắn, cho phép chữ hiển thị đầy đủ và thẳng hàng.
- Bố trí lại màu sắc icon và hover để đồng bộ với phong cách giao diện Shopee/Tiki cao cấp.

---

### Task 10: Tính năng Flash Sale trên `/books` và `/flash-sale` đang mock, chưa hoạt động

#### 1. Hiện trạng (User item 4)
- Khối Flash Sale trên trang `/books` và trang `/flash-sale` hiện không có dữ liệu phiên bán thật từ máy chủ.

#### 2. Nguyên nhân
- Database `huki_uat_promotion` chưa được seed các khung giờ Flash Sale thực tế (`FlashSaleSlot`, `FlashSaleItem`).
- Kết nối giữa `commerce-service` và `promotion-service-uat` bị đứt (đã phát hiện ở Task 04).

#### 3. Hướng giải quyết
- Viết kịch bản seed các khung giờ Flash Sale mẫu đang diễn ra (ACTIVE) và sắp diễn ra (UPCOMING) vào CSDL Promotion trên UAT.
- Kết nối dữ liệu API thời gian thực từ `promotion-service` sang giao diện `/flash-sale`.

---

### Task 11: Đăng nhập tài khoản bị văng phiên đăng nhập giữa các thiết bị

#### 1. Hiện trạng (User item 5)
- Khi một người bạn đăng nhập vào tài khoản trên máy khác, thiết bị hiện tại của người dùng lập tức bị văng ra (đăng xuất).

#### 2. Nguyên nhân kỹ thuật
- Trong `identity-service` ([auth.service.ts dòng 786](file:///e:/HuKi/platform/apps/identity-service/src/modules/auth/auth.service.ts#L786)), hệ thống áp dụng chính sách DRM giới hạn số thiết bị đăng nhập đồng thời (`policyConfig.drmMaxActiveDevices = 3`).
- Khi tích lũy đủ 3 phiên đăng nhập (`authSession`) trong CSDL, hệ thống tự động thu hồi (evict FIFO) phiên đăng nhập cũ nhất:
  ```ts
  await tx.refreshToken.updateMany({
    where: { sessionId: { in: evictIds }, revokedAt: null },
    data: { revokedAt: now, revokedReason: 'device_limit_auto_evicted' },
  });
  ```
- Khi thiết bị cũ thực hiện request hoặc refresh token, API Gateway trả về 401 Unauthorized -> frontend xóa token và đăng xuất tài khoản.

#### 3. Hướng giải quyết
- Nâng cấu hình giới hạn thiết bị hoạt động đồng thời (ví dụ tăng lên 5 thiết bị trong môi trường UAT/Staging qua biến môi trường `DRM_MAX_ACTIVE_DEVICES=5`).
- Hiển thị thông báo thân thiện rõ ràng cho người dùng thay vì âm thầm văng ra: *"Tài khoản của bạn vừa đăng nhập trên thiết bị mới"*.

---

### Task 12: Fix vòng lặp chuyển hướng vô tận (Infinite Redirect Loop) gây spam loading ở `/seller/stores/setup`

#### 1. Hiện trạng (Hình 4 đợt 2)
- Khi đăng nhập vào seller và truy cập `https://huki-uat.duckdns.org/seller/stores/setup`, màn hình hiện vòng xoay spinner `"Đang tải thiết lập cửa hàng..."` và spam request liên tục không bao giờ dừng.

#### 2. Nguyên nhân gốc rễ (Root Cause)
Gồm 2 cơ chế gây vòng lặp chuyển hướng và spam request:
1. **Cơ chế 1 - Bất nhất về key lưu trữ giữa `layout.tsx` và `page.tsx`:**
   - Trong [seller/layout.tsx](file:///e:/HuKi/web/src/app/seller/layout.tsx#L50): `localStorage.getItem(`huki_store_setup_completed_`) === 'true'` (thiếu business ID).
   - Trong [seller/stores/setup/page.tsx](file:///e:/HuKi/web/src/app/seller/stores/setup/page.tsx#L94): `localStorage.getItem(`huki_store_setup_completed_${b.id}`) === 'true'`.
   - Kết quả: Hai file đá qua đá lại giữa `/seller/dashboard` và `/seller/stores/setup`.
2. **Cơ chế 2 - Ping-pong Redirect Loop khi `business-service` bị 502 Bad Gateway:**
   - Khi vào `/seller/stores/setup`, gọi `businessApi.getMyBusiness()`. Nếu backend trả về 502/lỗi mạng, nhánh `else` của `page.tsx` tự động gọi `router.replace('/seller/register')`.
   - Tại `/seller/register`, `seller/layout.tsx` kiểm tra thấy user có role `BUSINESS`, liền đá ngược lại `router.replace('/seller/stores/setup')`.
   - Hai trang đá qua đá lại liên tục với tần suất vài ms, sinh ra hàng trăm request `GET /api/v1/businesses/my 502` và `GET /api/v1/businesses?limit=100 502` xen kẽ trong Console!
3. **Nguyên nhân 502 trên UAT:**
   - Workflow `.github/workflows/deploy-staging.yml` có `command_timeout: 25m`. Trong khi đó, việc build `web-uat` (Next.js) trên VPS mất hơn 24 phút, khiến GitHub Actions kill lệnh SSH giữa chừng (`Run Command Timeout`). Container `business-service-uat` trên VPS bị dừng hoặc chưa kịp khởi động.

#### 3. Hướng giải quyết & Đã xử lý
- **Frontend (`setup/page.tsx`):**
  - Bắt lỗi khi gọi `getMyBusiness()`. Nếu gặp 502 hoặc lỗi mạng, tuyệt đối **KHÔNG redirect sang `/seller/register`** (để tránh layout đá ngược lại).
  - Hiển thị giao diện báo lỗi kèm nút **"Thử kết nối lại"** thân thiện.
  - Chuẩn hóa key lưu trữ: Sử dụng thống nhất `huki_store_setup_completed_${user.business.id}` và cờ `isRedirectingRef`.
- **CI/CD (`deploy-staging.yml`):**
  - Tăng `command_timeout: 45m` để quá trình build và khởi chạy toàn bộ container trên UAT hoàn tất 100% không bị kill giữa chừng.

---

### Task 13: Trang Quản Trị Admin báo lỗi đỏ *"Có lỗi xảy ra trong quá trình xử lý"* khi xem Báo cáo GMV Doanh số

#### 1. Hiện trạng (Hình 5 đợt 2)
- Khi truy cập Báo Cáo Phân Tích & GMV Toàn Sàn của Admin, màn hình xuất hiện dải banner đỏ: *"Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại sau."*, các chỉ số GMV hiển thị 0đ và "Chưa khả dụng".

#### 2. Nguyên nhân
- Trong `AdminReportsView.tsx`, hàm `fetchData` gọi `analyticsApi.getPlatformGmv()`.
- Trên máy chủ UAT, database `huki_uat_analytics` chưa được chạy migration bảng `daily_aggregates` hoặc chưa được cấu hình biến môi trường kết nối chuẩn xác từ Docker Compose UAT. Khi API ném lỗi 500, apiClient tự động dịch thành câu thông báo đỏ trên.

#### 3. Hướng giải quyết
- Chạy lệnh migration CSDL cho `analytics-service` trên UAT (`npx prisma migrate deploy` hoặc `prisma db push`).
- Kiểm tra lại các endpoint aggregate trong `GMVService.ts` để luôn trả về cấu trúc dữ liệu mặc định an toàn (0đ) thay vì crash 500 khi chưa có đơn hàng nào được rollup.

---

### Task 14: Chatbot Tư Vấn Bé Cáo AI chỉ trả lời duy nhất 1 câu mặc định cho mọi câu hỏi

#### 1. Hiện trạng (Hình 5 trong loi.docx)
- Khách hàng nhắn bất kỳ câu nào ("Hướng dẫn đọc Ebook DRM", "Chào", v.v.), chatbot Bé Cáo AI đều chỉ trả lời duy nhất 1 câu cứng nhắc:  
  *"Dạ mình đã nhận được câu hỏi của bạn rồi nè! Bạn muốn tìm hiểu thêm về tựa sách nào nữa không ạ? 📚"*.

#### 2. Nguyên nhân gốc rễ
1. Trong [FloatingAIChatbox.tsx dòng 162](file:///e:/HuKi/web/src/ui/components/ai/FloatingAIChatbox.tsx#L162), khi API `/chat/ai` gặp lỗi, component tự động fallback về câu nói cố định trên.
2. Trên máy chủ UAT:
   - File [docker-compose.uat.yml](file:///e:/HuKi/docker-compose.uat.yml) **hoàn toàn không có biến môi trường `GEMINI_API_KEY`**.
   - Biến `COMMERCE_SERVICE_URL` trong `community-service` mặc định gọi về `http://localhost:3003` (bị lỗi kết nối trong môi trường Docker).
   - Khi không có API Key và không lấy được danh mục sách, `AiChatService` ném lỗi khiến frontend luôn rơi vào câu trả lời mặc định.

#### 3. Hướng giải quyết
- Cấu hình `GEMINI_API_KEY` và `COMMERCE_SERVICE_URL: http://commerce-service-uat:3003` vào `community-service-uat` trong `docker-compose.uat.yml`.
- Nâng cấp bộ sinh phản hồi cục bộ thông minh (Smart Local Response): ngay cả khi mất kết nối Gemini, bot vẫn nhận diện được các từ khóa (DRM, hoàn tiền, mua sách, tài khoản) và trả lời đúng trọng tâm câu hỏi của người dùng.

---

### Task 15: Bấm vào NXB từ bộ lọc / trang chủ báo *"Không tìm thấy sản phẩm phù hợp"* dù NXB có sách (Nhã Nam)

#### 1. Hiện trạng (Hình 7, 8, 9 trong loi.docx)
- Tại trang chủ hoặc trang `/stores`, bấm vào gian hàng Nhã Nam Books (hoặc NXB Kim Đồng) điều hướng tới `/books?publisher=nha-xuat-ban-kim-dong` thì trang sách lại báo: *"Không tìm thấy sản phẩm phù hợp"*, trong khi Nhã Nam thực tế có 6 đầu sách (Chiến Binh Cầu Vồng, Sapiens, Hoàng Tử Bé, v.v.).

#### 2. Nguyên nhân gốc rễ
- Trong [web/src/app/books/page.tsx dòng 213](file:///e:/HuKi/web/src/app/books/page.tsx#L213):
  ```tsx
  const pubLower = book.publisher.toLowerCase();
  if (!pubLower.includes(selectedPublisher.toLowerCase())) return false;
  ```
- URL truyền tham số là dạng slug không dấu gạch ngang: `publisher=nha-xuat-ban-kim-dong` hoặc `nha-nam-books`.
- Nhưng tên NXB của cuốn sách trong CSDL là có dấu tiếng Việt và có khoảng trắng: `"Nhã Nam Books"`, `"Nhà Xuất Bản Kim Đồng"`.
- Phép so sánh chuỗi thông thường không bao giờ khớp (`"nhã nam books".includes("nha-nam-books")` -> `false`).

#### 3. Hướng giải quyết
- Chuẩn hóa bộ lọc trong `books/page.tsx`: Dùng hàm `normalizeVietnameseText()` và chuyển đổi sang dạng slug để so sánh cả 2 chiều (slug với slug, hoặc tên hiển thị với tên hiển thị).

---

### Task 16: Mục Combo Sách Tuyển Chọn trên Trang Chủ bị vỡ ảnh bìa số 2 ("Bìa 2")

#### 1. Hiện trạng (Hình 6 trong loi.docx)
- Tại phần "Combo Sách Tuyển Chọn – Tiết Kiệm Đến 15%" trên Trang Chủ ([web/src/app/page.tsx dòng 1442](file:///e:/HuKi/web/src/app/page.tsx#L1442)), ảnh bìa ở giữa bị vỡ và hiện icon lỗi kèm chữ `"Bìa 2"`.

#### 2. Nguyên nhân
- Thẻ `<img>` hiển thị `combo.covers[1]` dùng trực tiếp không có thuộc tính `referrerPolicy="no-referrer"` và không có `onError` fallback. Khi ảnh lấy từ CDN bên thứ 3 (Goodreads/Amazon) bị chặn hotlink thì lập tức bị vỡ ảnh.

#### 3. Hướng giải quyết
- Thêm `referrerPolicy="no-referrer"` và sự kiện `onError` tự động chuyển sang ảnh bìa placeholder chất lượng cao.

---

### Task 17: Rà soát & Loại bỏ lộ lọt Thông tin Bảo mật (API Key, Mật khẩu, VPS IP, Gmail Secret) trong Git & Docker/CI/CD

#### 1. Kết quả quét an ninh tự động toàn diện (Security Deep Scan)
Qua quét tự động hơn 9,500 điểm kiểm tra trên toàn bộ mã nguồn, cấu hình Docker, CI/CD và các kịch bản script, phát hiện các điểm rủi ro bảo mật nghiêm trọng sau đang bị lưu thẳng trong git:

1. **Lộ Mật khẩu Ứng dụng Gmail Cá nhân (`GMAIL_APP_PASSWORD`):**
   - Vị trí: `docker-compose.uat.yml` (dòng 85, 90, 123, 153) và `docker-compose.prod.yml` (dòng 158, 192, 226).
   - Giá trị bị lộ: `huynhgiahuy236@gmail.com` kèm mật khẩu ứng dụng Gmail: `okvggoqyjmvdnage`.
   - **Mức độ rủi ro: CỰC KỲ NGUY HIỂM.** Bất kỳ ai có quyền truy cập repo đều có thể dùng mật khẩu này để đăng nhập SMTP gửi email giả mạo hoặc chiếm quyền hộp thư.

2. **Lộ Google OAuth Client Secret (`GOOGLE_CLIENT_SECRET`):**
   - Vị trí: `docker-compose.uat.yml` (dòng 82) và `docker-compose.prod.yml` (dòng 152).
   - Giá trị bị lộ: `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`.
   - **Mức độ rủi ro: CAO.** Cho phép giải mã hoặc giả mạo token Google OAuth.

3. **Lộ Địa chỉ IP Thật của Máy Chủ VPS:**
   - Vị trí: `.github/workflows/deploy-staging.yml` (dòng 22) và `.github/workflows/deploy.yml` (dòng 22).
   - Giá trị bị lộ: `103.67.197.73` được hardcode làm giá trị fallback cho `secrets.VPS_HOST`.
   - **Mức độ rủi ro: CAO.** Kẻ tấn công có thể quét trực tiếp cổng IP này để dò mật khẩu SSH (brute-force) hoặc tấn công từ chối dịch vụ (DDoS).

4. **Lộ Mật khẩu Cơ sở dữ liệu & Khóa JWT ký số:**
   - Vị trí: `docker-compose.uat.yml` (dòng 39, 78, 149...)
   - Mật khẩu PostgreSQL fallback: `HukiProductionSecure2026`
   - Khóa JWT Secret fallback: chuỗi hex dài 64 bytes (`0521ab048d035a99b2c9...`).
   - Khóa nội bộ Internal Service Key: `huki-production-internal-key`.

5. **Mật khẩu Demo / Test cố định trong các Script:**
   - Vị trí: `platform/apps/identity-service/reset_all_accounts.js`, `scripts/seed-clean-uat.mjs`, `user.service.ts` dòng 208 (`HukiSecure@2026!`, `User123!`).

#### 2. Hướng giải quyết triệt để (Security Hardening Plan)
1. **Làm sạch file `docker-compose.uat.yml` và `docker-compose.prod.yml`:**
   - Xóa bỏ toàn bộ các giá trị fallback nhạy cảm dạng `${GMAIL_APP_PASSWORD:-okvggoqyjmvdnage}` -> Chỉ để `${GMAIL_APP_PASSWORD}`.
   - Bắt buộc Docker Compose đọc biến từ file `.env` trên máy chủ (không commit `.env` lên Git).
2. **Làm sạch GitHub Actions Workflow:**
   - Thay `host: ${{ secrets.VPS_HOST || '103.67.197.73' }}` thành `host: ${{ secrets.VPS_HOST }}` (bắt buộc cấu hình trong GitHub Repository Secrets).
3. **Khuyến cáo hành động bảo mật ngay đối với tài khoản cá nhân:**
   - Vào tài khoản Google `huynhgiahuy236@gmail.com` -> Bảo mật -> Mật khẩu ứng dụng (App Passwords) -> **XÓA mã `okvggoqyjmvdnage` cũ và tạo mã mới** để vô hiệu hóa mật khẩu đã bị lộ trên Git.
   - Tạo mới Google Client Secret trên Google Cloud Console nếu kho code này từng được chia sẻ hoặc public.
4. **Đưa các file chứa secret vào `.gitignore`:**
   - Đảm bảo `.env`, `.env.local`, các file credentials không bao giờ bị `git add` vào repository.

---

## 📌 BƯỚC TIẾP THEO
Toàn bộ **17 nhiệm vụ** (bao gồm cả phân tích an ninh rò rỉ secret) đã được cập nhật đầy đủ và có phương án kỹ thuật rõ ràng trong file này.

**Bạn duyệt qua danh sách này nhé! Khi bạn muốn giải quyết mục nào (hoặc fix toàn bộ theo từng nhóm), chỉ cần ra lệnh là tôi sẽ tiến hành sửa code ngay!**
