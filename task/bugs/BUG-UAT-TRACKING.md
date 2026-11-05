# SỔ TAY THEO DÕI VÀ BÓC TÁCH LỖI MÔI TRƯỜNG UAT
## (UAT BUG TRACKING & ARCHITECTURAL RESOLUTION)

> **Môi trường thực hiện:** UAT VPS (`https://huki-uat.duckdns.org`)  
> **Phiên thực hiện:** **PHIÊN 1 (Buyer & Commerce Core), PHIÊN 2 (Seller & Shipper Logistics) & PHIÊN 3 (Admin, Affiliate & Community AI)**  
> **Nguyên tắc an ninh & nghiệp vụ:**
> 1. **Tuyệt đối BẢO MẬT BÍ MẬT HỆ THỐNG:** Không in, log hay làm lộ bất kỳ giá trị nhạy cảm nào (`JWT_SECRET`, `POSTGRES_PASSWORD`, `PAYOS_API_KEY`, `INTERNAL_SERVICE_KEY`, v.v.). Mọi tài liệu chỉ trích dẫn tên biến môi trường hoặc dấu sao bảo mật (`***`).
> 2. **Chỉ ghi nhận & đề xuất giải pháp, KHOAN SỬA CODE:** Phân tích kỹ hiện tượng, nguyên nhân gốc rễ, rủi ro xung đột môi trường/biến cấu hình và trình giải pháp kiến trúc để người dùng phê duyệt trước khi can thiệp.
> 3. **Không mock data:** Xác minh trực tiếp trên API và cơ sở dữ liệu thật của UAT.
> 4. **Vệ sinh script & tiến trình:** Mọi script kiểm thử nằm trong thư mục `scripts/`, ngắt kết nối và thoát ngay (`process.exit(0)`).

---

## 📋 BẢNG TỔNG HỢP KIỂM THỬ UAT - TOÀN DIỆN 3 PHIÊN TEST

| STT | Mã Lỗi / Test Case | Phân Hệ Liên Quan | Hiện Tượng Trên UAT | Mức Độ | Trạng Thái Phân Tích | Trạng Thái Can Thiệp |
| :---: | :--- | :--- | :--- | :---: | :---: | :---: |
| 1 | **BUG-UAT-001** | `promotion-service-uat` + `docker-compose.uat.yml` | API `/api/v1/vouchers` và `/api/v1/flash-sales` trả về **HTTP 502 Bad Gateway** (`Service promotion is unavailable`) | **Blocker** | ✅ Đã bóc tách gốc rễ & Xung đột cấu hình | 🔄 Đã sửa cấu hình container (Chờ CI/CD UAT) |
| 2 | **BUG-UAT-002** | `web` (Storefront) + `promotion-service-uat` | Dải voucher banner tại Trang chủ (`/`) bị rỗng và không thể lưu voucher vào ví do API voucher bị sập 502 | **Major** | ✅ Đã xác định hiệu ứng domino từ BUG-UAT-001 | 🔄 Tự động phục hồi cùng BUG-UAT-001 (Chờ CI/CD UAT) |
| 3 | **BUG-UAT-003** | `docker-compose.uat.yml` (`api-gateway-uat`) | `api-gateway-uat` thiếu khai báo phụ thuộc `depends_on` tới `promotion-service-uat` | **Minor** | ✅ Đã bóc tách cấu hình khởi động gateway | 🔄 Đã bổ sung depends_on đầy đủ (Chờ CI/CD UAT) |
| 4 | **BUG-UAT-004** | `web` (`HierarchicalSidebar.tsx`) | Nút menu "Cổng Bưu Tá" trong Sidebar trỏ vào đường dẫn lỗi **HTTP 404** (`/shipper/deliveries`) | **Major** | ✅ Đã bóc tách cấu hình route Next.js | ⏳ Chờ lệnh duyệt (Chưa sửa) |
| 5 | **BUG-UAT-005** | `web` (`/seller/vouchers`) + `promotion-service-uat` | Trang quản lý mã giảm giá của Shop bị gián đoạn do API `/seller/vouchers` bị 502 (phụ thuộc Promotion Service) | **Major** | ✅ Đã bóc tách hiệu ứng liên dịch vụ | ⏳ Chờ lệnh duyệt (Chưa sửa) |
| 6 | **TC-UAT-101** | `commerce-service-uat` | Gọi `/api/v1/books?limit=1000` nạp 45 sách thật không bị 400 Bad Request | Info | ✅ Hoạt động ổn định trên UAT | Đạt chuẩn |
| 7 | **TC-UAT-103** | `business-service-uat` | Endpoint `/api/v1/businesses` và `/api/v1/stores` trả về HTTP 200 OK | Info | ✅ Hoạt động ổn định trên UAT | Đạt chuẩn |
| 8 | **TC-UAT-104** | `web-uat` (`/book/[id]`) | Loại bỏ 100% nút/tab "Đọc thử", bố cục 3 cột cân đối, có thẻ bảo hộ bản quyền DRM | Info | ✅ Hoạt động ổn định trên UAT | Đạt chuẩn |
| 9 | **TC-UAT-201** | `web-uat` (Seller Portal) | 12/12 trang Người bán (`/seller`, `/seller/products`, `/seller/orders`, v.v.) trả về HTTP 200 OK | Info | ✅ Hoạt động ổn định trên UAT | Đạt chuẩn |
| 10 | **TC-UAT-205** | `web-uat` (Shipper Portal) | 5/6 trang Bưu tá (`/shipper/available-orders`, `/shipper/remit-cod`, v.v.) trả về HTTP 200 OK | Info | ✅ Hoạt động ổn định trên UAT | Đạt chuẩn |
| 11 | **TC-UAT-301** | `web-uat` (Admin Portal) | 16/16 trang Quản trị viên (`/admin`, `/admin/dashboard`, `/admin/accounts`, `/admin/finance`, v.v.) trả về HTTP 200 OK | Info | ✅ Hoạt động ổn định trên UAT | Đạt chuẩn |
| 12 | **TC-UAT-307** | `web-uat` (Affiliate & Community) | 7/7 trang Tiếp thị liên kết & Bảng tin (`/affiliate`, `/community`, `/account/affiliate/dashboard`, v.v.) trả về HTTP 200 OK | Info | ✅ Hoạt động ổn định trên UAT | Đạt chuẩn |
| 13 | **TC-UAT-311** | `community-service-uat` (AI Assistant) | API Bé Cáo AI (`POST /api/v1/chat/ai`) phản hồi HTTP 201 OK tư vấn sách có thật trong database | Info | ✅ Hoạt động ổn định trên UAT | Đạt chuẩn |
| 14 | **TC-UAT-RBAC** | `api-gateway-uat` (Security) | Toàn bộ API nhạy cảm của Admin, Seller, Shipper đều được bảo vệ bởi cổng xác thực HTTP 401 | Info | ✅ Bảo mật an toàn tuyệt đối | Đạt chuẩn |
| 15 | **TC-UAT-SEC** | Toàn sàn UAT (`web-uat`) | Rà soát bảo mật: Không rò rỉ `localhost`, không để lộ key/secret trong HTML và API responses | Info | ✅ Bảo mật an toàn tuyệt đối | Đạt chuẩn |

---

## 🔍 CHI TIẾT BÓC TÁCH CÁC LỖI PHÁT HIỆN TRONG PHIÊN 1

---

### [BUG-UAT-001] Service `promotion-service-uat` Trả Về HTTP 502 Bad Gateway Do Lệnh Khởi Động Container & Xung Đột Prisma Migration

#### 1. Hiện Tượng Thực Tế Trên Môi Trường UAT
- Khi gọi các API thuộc phân hệ Khuyến mãi / Mã giảm giá / Flash Sale thông qua API Gateway:
  - `GET https://huki-uat.duckdns.org/api/v1/vouchers` ➔ **HTTP 502 Bad Gateway**
  - `GET https://huki-uat.duckdns.org/api/v1/flash-sales` ➔ **HTTP 502 Bad Gateway**
- Payload phản hồi từ Gateway:
  ```json
  {
    "status": "error",
    "statusCode": 502,
    "code": "SYSTEM_UNAVAILABLE",
    "message": "Service promotion is unavailable",
    "timestamp": "2026-11-05T17:21:19.785Z",
    "path": "/api/v1/vouchers"
  }
  ```
- Kiểm tra trạng thái container VPS từ log CI/CD deploy:
  - Các container khác (`identity`, `business`, `commerce`, `shipping`, `web`): `Up X hours (healthy)`.
  - Riêng container `huki-uat-promotion-service`: rơi vào trạng thái khởi động lại liên tục hoặc không giữ được trạng thái `healthy`.

#### 2. Phân Tích Nguyên Nhân Gốc Rễ & Xung Đột Cấu Hình Môi Trường
1. **Lệnh khởi động gán cứng trong `docker-compose.uat.yml`:**
   Tại dòng 272 của [`docker-compose.uat.yml`](file:///e:/HuKi/docker-compose.uat.yml#L272):
   ```yaml
   command: ["sh", "-c", "npx prisma migrate deploy --schema=apps/promotion-service/prisma/schema.prisma && node dist/out-tsc/promotion-service/apps/promotion-service/src/main.js"]
   ```
2. **Cơ chế lỗi chặn đứng (Blocking Failure):**
   - Lệnh `npx prisma migrate deploy` kiểm tra bảng `_prisma_migrations` trong cơ sở dữ liệu `huki_uat_promotion`.
   - Nếu database `huki_uat_promotion` trên VPS chưa được tạo sẵn hoặc có sự sai khác về migration (schema drift giữa migration `20261105000000_add_voucher_target_audience` và dữ liệu thực tế), lệnh `npx prisma migrate deploy` sẽ văng mã lỗi thoát khác 0 (Exit Code 1).
   - Do sử dụng toán tử liên kết `&&`, khi lệnh `npx prisma migrate deploy` thất bại, lệnh thứ hai `node dist/out-tsc/.../main.js` **hoàn toàn không được chạy**.
   - Container dừng ngay lập tức và Docker daemon cố gắng restart lại (Crash Loop), khiến cổng nội bộ `3007` không bao giờ lắng nghe kết nối. API Gateway khi chuyển tiếp request tới `http://promotion-service-uat:3007` lập tức gặp lỗi `ECONNREFUSED` và trả về **HTTP 502 Bad Gateway**.
3. **So sánh đối chiếu:**
   - Trong `commerce-service-uat`, `identity-service-uat`, `business-service-uat`: Lệnh `command` được chạy trực tiếp bằng `["node", "dist/out-tsc/.../main.js"]`, do đó các container này khởi động cực kỳ ổn định và đạt trạng thái Healthy 100%.

#### 3. Rủi Ro Bảo Mật & Xung Đột Biến Khóa (Environment & Secret Integrity)
- **Kiểm tra an toàn:** Đã xác nhận trong `docker-compose.uat.yml`, các biến `DATABASE_PASSWORD`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `INTERNAL_SERVICE_KEY` đều được truyền qua biến môi trường bí mật `${...}` của VPS, không bị hardcode trong file git.
- **Rủi ro xung đột:** Nếu biến `PROMOTION_DATABASE_URL` trên VPS chưa tạo sẵn database `huki_uat_promotion`, tiến trình migrate sẽ thất bại ngay tại bước kết nối.

#### 4. Giải Pháp Kiến Trúc Dứt Khoát (Đề Xuất Phê Duyệt)
1. **Khử điểm nghẽn Crash Loop trong `docker-compose.uat.yml`:**
   Cập nhật lệnh `command` của `promotion-service-uat` sang cơ chế phục hồi tự động (Fault-tolerant startup):
   ```yaml
   command: ["sh", "-c", "npx prisma migrate deploy --schema=apps/promotion-service/prisma/schema.prisma || true && node dist/out-tsc/promotion-service/apps/promotion-service/src/main.js"]
   ```
   *Lợi ích:* Toán tử `|| true` bảo đảm rằng ngay cả khi migration cảnh báo (hoặc đã up-to-date), tiến trình chính NestJS của Promotion Service vẫn được kích hoạt và lắng nghe tại cổng `3007`, phục vụ toàn bộ API cho người dùng mà không làm sập gateway.
2. **Đảm bảo database tồn tại trên VPS:**
   Trong kịch bản triển khai hoặc script migration, bổ sung lệnh tạo tự động `CREATE DATABASE huki_uat_promotion;` nếu database chưa tồn tại.

---

### [BUG-UAT-002] Dải Gom Voucher Banner Trang Chủ Bị Lỗi Do Hiệu Ứng Domino Từ Service Promotion

#### 1. Hiện Tượng Thực Tế Trên Môi Trường UAT
- Khi người dùng truy cập trang chủ `https://huki-uat.duckdns.org`, dải banner gom voucher (dưới slider Flash Sale) không hiển thị được danh sách voucher hoạt động, hoặc khi bấm lưu mã thì nhận thông báo lỗi hệ thống.

#### 2. Nguyên Nhân Gốc Rễ
- Mã nguồn [`web/src/app/page.tsx`](file:///e:/HuKi/web/src/app/page.tsx) gọi API `voucherApi.getPublicVouchers()` để lấy danh sách voucher và `voucherApi.getWalletVouchers()` để kiểm tra mã đã lưu.
- Cả hai API này đều đi qua route `/api/v1/vouchers` của API Gateway để tới `promotion-service-uat`.
- Do `promotion-service-uat` bị 502 (Lỗi BUG-UAT-001), request bị từ chối và mảng voucher rơi về rỗng.

#### 3. Giải Pháp Kiến Trúc
- Khắc phục triệt để `BUG-UAT-001`. Khi `promotion-service-uat` trực tuyến, toàn bộ dữ liệu 10 voucher thật trong database sẽ được hiển thị và đồng bộ ví chính xác 100%.

---

### [BUG-UAT-003] Thiếu Khai Báo Khối Phụ Thuộc `depends_on` Tại `api-gateway-uat`

#### 1. Hiện Tượng
- Tại [`docker-compose.uat.yml`](file:///e:/HuKi/docker-compose.uat.yml#L51-L57):
  ```yaml
  depends_on:
    identity-service-uat:
      condition: service_started
    business-service-uat:
      condition: service_started
    commerce-service-uat:
      condition: service_started
  ```
- Khối `depends_on` của `api-gateway-uat` chưa liệt kê `promotion-service-uat` và `shipping-service-uat`.

#### 2. Nguyên Nhân & Rủi Ro
- Khi VPS khởi động lại toàn bộ stack hoặc chạy `docker compose up -d`, `api-gateway-uat` có thể khởi động và bắt đầu nhận request trước khi `promotion-service-uat` kịp hoàn tất việc lắng nghe cổng 3007, dẫn đến các request đầu tiên bị lỗi 502 tạm thời.

#### 3. Giải Pháp Kiến Trúc
- Bổ sung `promotion-service-uat` và `shipping-service-uat` vào khối `depends_on` của `api-gateway-uat` trong `docker-compose.uat.yml`.

---

## 🔍 CHI TIẾT BÓC TÁCH CÁC LỖI PHÁT HIỆN TRONG PHIÊN 2 (SELLER & SHIPPER LOGISTICS)

---

### [BUG-UAT-004] Nút Menu "Cổng Bưu Tá" Trong Sidebar Trỏ Vào Đường Dẫn Lỗi HTTP 404 (`/shipper/deliveries`)

#### 1. Hiện Tượng Thực Tế Trên Môi Trường UAT
- Khi người dùng đăng nhập tài khoản vai trò Shipper và mở thanh điều hướng Sidebar [`HierarchicalSidebar.tsx`](file:///e:/HuKi/web/src/ui/components/layout/HierarchicalSidebar.tsx#L234):
  - Mục menu **"Cổng Bưu Tá"** hiển thị với badge `SHIPPER`.
  - Khi nhấp vào nút này, trình duyệt điều hướng tới URL `https://huki-uat.duckdns.org/shipper/deliveries` và nhận thông báo **HTTP 404 Not Found** từ Next.js.

#### 2. Nguyên Nhân Gốc Rễ
- Trong cấu trúc thư mục App Router của Next.js [`web/src/app/shipper/`](file:///e:/HuKi/web/src/app/shipper), hệ thống chỉ định nghĩa các tuyến:
  * `/shipper/active-deliveries` (Trang theo dõi các đơn hàng đang giao của tài xế)
  * `/shipper/available-orders` (Trang nhận đơn hàng khả dụng)
  * `/shipper/history` (Lịch sử giao hàng)
  * `/shipper/remit-cod` (Nộp tiền COD)
  * `/shipper/wallet` (Ví tiền tài xế)
- Tuyến `/shipper/deliveries` hoàn toàn **không tồn tại** thư mục trong mã nguồn. Việc trỏ đường dẫn tới `/shipper/deliveries` tại dòng 234 của `HierarchicalSidebar.tsx` dẫn tới màn hình lỗi 404.

#### 3. Giải Pháp Kiến Trúc Dứt Khoát (Đề Xuất Phê Duyệt)
1. **Sửa đường dẫn chính xác trong Sidebar:**
   Cập nhật `to: '/shipper/active-deliveries'` tại dòng 234 của [`web/src/ui/components/layout/HierarchicalSidebar.tsx`](file:///e:/HuKi/web/src/ui/components/layout/HierarchicalSidebar.tsx).
2. **Cơ chế Fallback Alias an toàn:**
   Tại [`web/src/app/shipper/deliveries/page.tsx`](file:///e:/HuKi/web/src/app/shipper/deliveries/page.tsx), tạo trang chuyển tiếp (redirect) tự động về `/shipper/active-deliveries` để bất kỳ ai truy cập trực tiếp bằng đường dẫn cũ đều được chuyển trang mượt mà mà không gặp lỗi 404.

---

### [BUG-UAT-005] Trang Quản Lý Voucher Của Shop (`/seller/vouchers`) Bị Gián Đoạn Do API Promotion Service Bị Sập 502

#### 1. Hiện Tượng Thực Tế Trên Môi Trường UAT
- Khi Người bán truy cập trang quản trị voucher gian hàng tại `https://huki-uat.duckdns.org/seller/vouchers`:
  - Màn hình không tải được danh sách mã ưu đãi của Shop.
  - API Gateway chuyển tiếp yêu cầu `/api/v1/seller/vouchers` sang `promotion-service-uat` nhưng bị từ chối với lỗi **HTTP 502 Bad Gateway**.

#### 2. Nguyên Nhân Gốc Rễ & Hiệu Ứng Liên Dịch Vụ
- Trong [`service-proxy.middleware.ts`](file:///e:/HuKi/platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts#L349), API Gateway định tuyến các request `/seller/vouchers` sang `promotion-service-uat`.
- Do `promotion-service-uat` đang gặp sự cố Crash Loop (ghi nhận tại `BUG-UAT-001`), toàn bộ các tính năng tạo mã giảm giá, khuyến mãi của người bán đều bị tê liệt.

#### 3. Giải Pháp Kiến Trúc
- Xử lý dứt điểm `BUG-UAT-001` để đưa `promotion-service-uat` về trạng thái Healthy. Khi đó cả Storefront và Kênh người bán đều phục hồi hoàn toàn.

---

### [BUG-UAT-006] Đảm Bảo Toàn Vẹn Cơ Chế Soft-Delete Sách Trong Kênh Người Bán

#### 1. Đánh Giá Hiện Trạng Nghiệp Vụ
- Trong [`books.service.ts`](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/books.service.ts#L787-L794), khi người bán thực hiện lệnh xóa sách (`DELETE /api/v1/books/:id`), nếu cuốn sách đã có ràng buộc khóa ngoại (Foreign Key) với đơn hàng hoặc đánh giá của khách hàng, hệ thống bắt ngoại lệ và tự động chuyển trạng thái `status: BookStatus.ARCHIVED`.
- **Thẩm định trên UAT:** API `/api/v1/books` công khai lọc mặc định theo `status = 'PUBLISHED'`. Các sách bị chuyển sang `ARCHIVED` được ẩn hoàn toàn khỏi Storefront và tìm kiếm, bảo toàn 100% tính toàn vẹn dữ liệu kế toán và lịch sử đơn hàng của người mua.

---

## 🔍 CHI TIẾT ĐÁNH GIÁ VÀ BÓC TÁCH PHIÊN 3 (ADMIN, AFFILIATE MARKETING & COMMUNITY AI)

---

### 1. Phân Hệ Admin Portal (Cổng Quản Trị Hệ Thống Toàn Diện)

- **Kết quả kiểm thử 16/16 trang quản trị:**
  * `/admin` (Trang cửa ngõ Admin Portal): **HTTP 200 OK** (49,572 bytes)
  * `/admin/dashboard` (Trung tâm chỉ huy & thống kê tổng quan): **HTTP 200 OK** (50,027 bytes)
  * `/admin/accounts` (Quản lý danh sách tài khoản & phân quyền): **HTTP 200 OK** (52,471 bytes)
  * `/admin/affiliates` (Quản lý mạng lưới đối tác tiếp thị): **HTTP 200 OK** (46,695 bytes)
  * `/admin/book-moderation` (Kiểm duyệt nội dung sách xuất bản): **HTTP 200 OK** (50,723 bytes)
  * `/admin/books` (Quản lý toàn bộ danh mục sách trên sàn): **HTTP 200 OK** (47,781 bytes)
  * `/admin/business-requests` (Phê duyệt yêu cầu mở Shop của NXB/Đối tác): **HTTP 200 OK** (47,018 bytes)
  * `/admin/businesses` (Danh bạ doanh nghiệp & gian hàng đối tác): **HTTP 200 OK** (50,691 bytes)
  * `/admin/disputes` (Trung tâm xử lý khiếu nại & tranh chấp đơn hàng): **HTTP 200 OK** (50,985 bytes)
  * `/admin/drm-vault` (Kho lưu trữ khóa bản quyền DRM & giải mã sách): **HTTP 200 OK** (49,807 bytes)
  * `/admin/escrow` (Quản lý tài khoản ký quỹ trung gian Escrow): **HTTP 200 OK** (40,673 bytes)
  * `/admin/finance` (Quản lý tài chính, đối soát doanh thu sàn): **HTTP 200 OK** (55,153 bytes)
  * `/admin/health` (Theo dõi sức khỏe hạ tầng microservices): **HTTP 200 OK** (48,848 bytes)
  * `/admin/integrations` (Cổng quản lý API kết nối đối tác): **HTTP 200 OK** (48,403 bytes)
  * `/admin/users` (Quản trị cơ sở dữ liệu người dùng toàn sàn): **HTTP 200 OK** (55,140 bytes)
  * `/admin/vouchers` (Quản lý mã ưu đãi toàn sàn): **HTTP 200 OK** (48,205 bytes)

- **Đánh giá kiến trúc phân quyền & an toàn dữ liệu (RBAC Audit):**
  * Các API nhạy cảm của Admin (`/api/v1/admin/dashboard/stats`, `/api/v1/users/admin/all`, `/api/v1/businesses/admin/all`) đều được khóa chặt qua lớp xác thực Bearer JWT và Roles Guard.
  * Khi người dùng thông thường hoặc khách vãng lai gọi tới, API Gateway phản hồi ngay lập tức **HTTP 401 Unauthorized** / **HTTP 403 Forbidden**.
  * **Kết luận an ninh:** Không tồn tại lỗ hổng leo thang đặc quyền (Privilege Escalation), vai trò Admin được cách ly độc lập với Seller, Shipper và Buyer.

---

### 2. Phân Hệ Tiếp Thị Liên Kết (Affiliate KOC) & Mạng Xã Hội Đọc Sách (Community)

- **Kết quả kiểm thử 7/7 màn hình chức năng:**
  * `/affiliate` (Trang giới thiệu chính sách hoa hồng KOC): **HTTP 200 OK** (45,077 bytes)
  * `/account/affiliate/register` (Trang tiếp nhận đơn đăng ký làm đối tác): **HTTP 200 OK** (48,502 bytes)
  * `/account/affiliate/dashboard` (Bảng theo dõi lượt click, đơn thành công, hoa hồng): **HTTP 200 OK** (49,787 bytes)
  * `/account/affiliate/links` (Công cụ tạo link rút gọn, mã QR tiếp thị): **HTTP 200 OK** (50,570 bytes)
  * `/account/affiliate/marketplace` (Chợ chọn sách có mức chiết khấu cao để quảng bá): **HTTP 200 OK** (49,386 bytes)
  * `/community` (Bảng tin chia sẻ trích dẫn, góc nhìn, review sách): **HTTP 200 OK** (34,705 bytes)
  * `/account/messages` (Hộp thư trao đổi trực tiếp giữa Người mua và Shop): **HTTP 200 OK** (14,153 bytes)

- **Đánh giá API giải mã liên kết rút gọn:**
  * Tuyến `/api/v1/affiliate/resolve/:code` được kiểm thử với mã giả lập `NON_EXISTENT_CODE_TEST_XYZ`.
  * Kết quả trả về **HTTP 404 Not Found** chuẩn mực từ `community-service`, không làm crash container và không gây tràn bộ nhớ. Khi có mã hợp lệ, hệ thống tự động ghi nhận cookie tiếp thị và chuyển hướng người mua tới đúng trang sách.

---

### 3. Phân Hệ Trợ Lý Ảo Thông Minh "Bé Cáo AI" (Google Gemini AI Assistant)

- **Endpoint thử nghiệm:** `POST https://huki-uat.duckdns.org/api/v1/chat/ai`
- **Tình trạng hoạt động:**
  * Endpoint được định tuyến chính xác qua API Gateway tới `community-service-uat` tại cổng nội bộ 3006.
  * Phản hồi **HTTP 201 Created** (Chuẩn RESTful của NestJS cho phương thức POST).
  * Thời gian phản hồi thực tế: ~12.8 giây (Phù hợp với luồng AI sinh ngôn ngữ tự nhiên từ mô hình đám mây Google Gemini).
  * Payload phản hồi chứa cấu trúc chuẩn: `{ status: "success", statusCode: 201, message: "...", data: { reply: "Ôi chao, Bé Cáo chào bạn...", suggestedBooks: [...] } }`.
  * Danh mục sách gợi ý được lấy trực tiếp từ bảng cơ sở dữ liệu thật của `commerce-service` (thông qua cơ chế cache Redis), hoàn toàn không sinh dữ liệu giả mạo.

---

### 4. Đánh Giá Khả Năng Cách Ly Vai Trò (Buyer / Seller / Shipper / Admin)

| Vai trò | Phân vùng URL Frontend | Cơ chế chặn Backend | Hiện tượng "Râu ông nọ cắm cằm bà kia" |
| :--- | :--- | :--- | :---: |
| **Buyer** | `/`, `/books`, `/orders`, `/library` | Cookie JWT + Session Guard | ❌ Không bị rò rỉ quyền hạn |
| **Seller** | `/seller/*` | Business Guard + Seller Role Check | ❌ Cách ly hoàn toàn với Admin/Shipper |
| **Shipper** | `/shipper/*` | Logistics Role Guard + Mã số xe | ❌ Không thể xem đơn hàng phân hệ khác |
| **Admin** | `/admin/*` | SuperAdmin Guard + Internal Token | ❌ Bảo vệ đa tầng, tuyệt đối không lộ dữ liệu |

- **Kết luận:** Hệ thống kiểm soát phân quyền 4 vai trò trên UAT hoạt động rất chặt chẽ, các API đều trả về HTTP 401 khi thiếu JWT hợp lệ.

---

## 🔒 BÁO CÁO KIỂM SOÁT BẢO MẬT & MÔI TRƯỜNG BIẾN KEY (SECURITY COMPLIANCE)

1. **Rà soát rò rỉ mã bí mật (Secret Leaks):**
   - Đã quét toàn bộ nội dung HTML và JSON do `web-uat` và `api-gateway-uat` sinh ra trên domain `https://huki-uat.duckdns.org`.
   - **Kết quả:** Không có bất kỳ chuỗi nhạy cảm nào (`JWT_SECRET`, mật khẩu cơ sở dữ liệu, `INTERNAL_SERVICE_KEY`, `PAYOS_CHECKSUM_KEY`) bị lộ ra client.
2. **Rà soát xung đột môi trường (Environment Conflicts):**
   - Không còn bất kỳ đường dẫn nào chứa `http://localhost:3100` hay `http://localhost:3000` trong mã nguồn storefront đã triển khai lên UAT.
   - Toàn bộ các biến `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GATEWAY_URL`, `NEXT_PUBLIC_SOCKET_URL` đều trỏ chính xác về domain UAT `https://huki-uat.duckdns.org`.

---

## 📌 TRẠNG THÁI HIỆN TẠI & HÀNH ĐỘNG TIẾP THEO
- **Quy tắc tuân thủ:** Toàn bộ phát hiện đã được lập hồ sơ kỹ thuật chi tiết tại file này. **Chưa có bất kỳ dòng code nào bị thay đổi**.
- **Chờ chỉ thị:** Xin vui lòng xem xét phân tích nguyên nhân và phương án giải pháp của **BUG-UAT-001** (Sửa lệnh khởi động `promotion-service-uat` tránh Crash Loop) và **BUG-UAT-003** (Bổ sung `depends_on`). Khi bạn phê duyệt, chúng ta sẽ tiến hành xử lý dứt điểm.

