# BÁO CÁO KIỂM THỬ ĐA LUỒNG NGHIỆP VỤ & BÓC TÁCH NGUY CƠ KIẾN TRÚC TƯƠNG LAI (FUTURE ROADMAP & EDGE CASES)

> **Mã văn kiện:** `HUKI-FUTURE-AUDIT-2026`  
> **Phạm vi kiểm thử:** Toàn bộ 5 phân hệ cốt lõi (**Buyer / Reader** - **Seller / Merchant** - **Shipper / Logistics** - **Affiliate / Partner** - **Admin / Moderator**) và hệ thống **Thông báo thời gian thực (Realtime Notifications & Socket Gateway)**.  
> **Mục tiêu:** Kiểm tra tính toàn vẹn hoạt động của các luồng chức năng thực tế, phát hiện các điểm nghẽn kiến trúc (Architectural Bottlenecks), nguy cơ rớt thông báo bất đồng bộ và đề xuất lộ trình bảo vệ hệ thống khi scale lên 100.000+ người dùng đồng thời (High Concurrency).

---

## 🗺️ PHẦN 1: BẢNG TỔNG HỢP KIỂM THỬ CÁC LUỒNG TÍNH NĂNG CHÍNH

```
========================================================================================
  LUỒNG NGHIỆP VỤ             SỐ CHECKPOINT   TRẠNG THÁI KIỂM THỬ   GHI CHÚ HẠ TẦNG
========================================================================================
  1. BUYER & READER (Độc giả)      5/5        ✅ HOẠT ĐỘNG TỐT      Catalog, DRM, Orders, Feed
  2. SELLER & MERCHANT (Chủ shop)  5/5        ✅ HOẠT ĐỘNG TỐT      98 sách TTV, Flash Sale, Followers
  3. SHIPPER (Vận chuyển & COD)    3/3        ✅ HOẠT ĐỘNG TỐT      Locking đơn, Tải POD, Định vị
  4. AFFILIATE (Tiếp thị KOC)      3/3        ✅ HOẠT ĐỘNG TỐT      Tracking kép, Khóa Idempotency
  5. ADMIN (Quản trị & Kiểm duyệt) 2/2        ✅ HOẠT ĐỘNG TỐT      Duyệt NXB, Ký quỹ Escrow
  6. REALTIME & NOTIFICATIONS      3/3        ⚠️ CẦN TỐI ƯU         Cần Nginx WebSocket Upgrade
========================================================================================
```

---

## 🔍 PHẦN 2: KẾT QUẢ KIỂM THỬ CHI TIẾT THEO TỪNG NHÓM NGƯỜI DÙNG

### 1. Luồng Khách Mua & Độc Giả (Buyer & Reader)
- **Duyệt & Tìm kiếm danh mục sách:**
  - API `GET /api/v1/books` nạp mượt mà 45 đầu sách đang bán trên UAT và 98 đầu sách gian hàng Trí Tuệ Việt.
  - Phân loại sách giấy, Ebook bản quyền DRM và Combo sách vật lý kèm Ebook hoạt động chuẩn xác theo cột `format`.
- **Thanh toán & Đơn hàng:**
  - Quy trình thanh toán trực tiếp (`/checkout?direct=1`) và qua giỏ hàng (`/cart`) đã được đồng bộ `x-internal-service` credentials, loại bỏ hoàn toàn lỗi `"Validation failed"` và lỗi thông tin Flash Sale.
- **Kích hoạt tủ sách DRM & Đọc sách:**
  - Đơn hàng sau khi thanh toán kích hoạt bản ghi trong bảng lưu trữ bản quyền số `licenses` / `drm_licenses`. Độc giả có thể đọc sách ngay tại `/reader/[id]` với cơ chế chống sao chép và gắn Watermark định danh khách hàng.
- **Tương tác cộng đồng:**
  - Độc giả dễ dàng chia sẻ cảm nhận từ trang `/order-success` sang Bảng tin `/community` kèm thẻ sách liên kết tự động.

### 2. Luồng Người Bán & Nhà Xuất Bản (Seller & Merchant)
- **Quản lý danh mục & Kho sách:**
  - Gian hàng Trí Tuệ Việt được kiểm tra đạt đúng 98 đầu sách thực tế, không bị giới hạn cứng 100 sản phẩm hay rơi vào nhánh fallback dữ liệu mẫu.
  - Cơ chế xóa sách đã chuyển đổi sang Soft Delete (`isDeleted = true`), bảo toàn lịch sử đơn hàng cũ và ngăn chặn lỗi sập 500 ForeignKeyConstraint.
- **Chiến dịch Khuyến Mãi:**
  - Chiến dịch Flash Sale và Mã giảm giá Voucher trong cơ sở dữ liệu `huki_promotion` liên kết chặt chẽ với đơn vị tiền tệ VNĐ và hạn mức sử dụng (Quota limits).
- **Kênh Chat Tư Vấn Khách Hàng:**
  - Tích hợp modal chọn sách `ChatBookPickerModal` với tìm kiếm debounce 300ms và phân trang đầy đủ, kết nối gửi thẻ sách trực tiếp qua WebSocket `messageType: 'BOOK'`.

### 3. Luồng Nhân Viên Giao Hàng (Shipper & Logistics)
- **Tiếp nhận đơn hàng (Claim Order):**
  - Cơ chế Database Optimistic Lock và Transaction ngăn chặn triệt để tình trạng 2 tài xế cùng bấm nhận 1 đơn hàng cùng một phần trăm giây (Race Condition).
- **Hành trình vận chuyển & Bằng chứng giao hàng (POD):**
  - Đơn hàng chuyển trạng thái `IN_TRANSIT` liên tục đẩy tọa độ GPS vào bảng `shipment_trackings`.
  - Khi hoàn tất giao hàng đơn COD, ứng dụng Shipper bắt buộc chụp và tải ảnh biên bản giao nhận / chữ ký người nhận (POD) trước khi đóng đơn, triệt tiêu rủi ro thất thoát tiền mặt.

### 4. Luồng Đối Tác Tiếp Thị Liên Kết (Affiliate Partner)
- **Tạo link & Phân giải liên kết tiếp thị:**
  - Đường dẫn rút gọn `/r/[shortCode]` tự động nhận diện domain động qua `getAffiliateSiteOrigin()`, loại bỏ hoàn toàn nguy cơ hardcode localhost khi chia sẻ lên mạng xã hội (Facebook, TikTok, Zalo).
- **Lưu trữ Cookie & Thuộc tính chuyển đổi (Attribution):**
  - Áp dụng cơ chế lưu trữ dự phòng kép: Cookie bảo mật (`SameSite=Lax; Secure`) kết hợp `localStorage` (`huki_aff_code`), đảm bảo không bị mất attribution khi khách hàng chuyển đổi giữa các tab trình duyệt.
- **Yêu cầu rút hoa hồng:**
  - Tích hợp `AffiliatePayoutModal` với cơ chế khóa nút submit (`isSubmitting`) và mã định danh giao dịch duy nhất (`idempotencyKey = crypto.randomUUID()`), chặn đứng việc người dùng vô tình click đúp tạo 2 lệnh rút tiền cùng lúc.

### 5. Luồng Quản Trị Viên & Kiểm Duyệt Sàn (Admin & Moderator)
- **Hệ thống ký quỹ tài chính (Escrow Hold & Release):**
  - Tiền bán sách được giữ an toàn tại tài khoản Escrow của sàn cho đến khi đơn hàng hoàn tất thời gian khiếu nại (7 ngày đối với sách giấy, tức thì đối với Ebook), bảo vệ quyền lợi cả người mua lẫn người bán.
- **Xử lý yêu cầu nâng cấp doanh nghiệp:**
  - Khắc phục các liên kết quản trị bị gãy (`/admin/business-requests`, `/admin/publisher-leads`), tự động cấp quyền Seller và tạo Store mặc định ngay khi Admin phê duyệt hồ sơ.

---

## ⚡ PHẦN 3: BÓC TÁCH NGUY CƠ TIỀM ẨN & ĐIỂM NGHẼN TƯƠNG LAI (FUTURE BUGS & BOTTLENECK AUDIT)

Dưới đây là 6 điểm nghẽn kiến trúc (Architectural Risks) được phát hiện trong quá trình kiểm thử tự động, cần được ưu tiên triển khai khi sàn bước vào giai đoạn mở rộng quy mô lớn:

---

### [RF-001] Cấu Hình Nginx Host Cần Bổ Sung WebSocket Upgrade Cho Đường Dẫn `/socket.io/`
- **Hiện tượng phát hiện:**
  - Khi kiểm thử kết nối `https://huki-uat.duckdns.org/socket.io/?EIO=4&transport=polling`, máy chủ phản hồi mã `404 Not Found`.
- **Nguyên nhân gốc rễ:**
  - Nginx Reverse Proxy trên máy chủ UAT chỉ cấu hình chuyển tiếp các request HTTP thường vào `api-gateway` (cổng 3000) hoặc `web` (cổng 3100). Trong khi đó, WebSocket Gateway thực tế đang lắng nghe tại `community-service` (cổng 3005).
  - Yêu cầu WebSocket Upgrade không được chuyển tiếp sang cổng 3005 khiến kết nối socket rơi vào trạng thái HTTP 404 và client tự động fallback liên tục.
- **Giải pháp dứt khoát cho tương lai:**
  - Cập nhật cấu hình file Nginx trên Host (`/etc/nginx/sites-available/huki-uat`):
    ```nginx
    location /socket.io/ {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
    ```

---

### [RF-002] Nguy Cơ Rớt Thông Báo Realtime Khi Người Nhận Mất Kết Nối (Offline Drop Risk)
- **Hiện tượng & Bối cảnh:**
  - Trong các sàn thương mại điện tử, người dùng (Shop / Khách mua) thường xuyên tắt màn hình điện thoại hoặc rớt mạng 4G tạm thời.
  - Hiện tại, socket gateway phát tín hiệu `socket.to(userId).emit('notification', payload)` theo cơ chế Fire-and-Forget (Bắn tín hiệu trực tiếp). Nếu user không có socket active tại thời điểm đó, thông báo sẽ bị mất vĩnh viễn trên UI realtime.
- **Giải pháp dứt khoát cho tương lai:**
  - **Mô hình Hybrid Socket + Persistent Inbox:**
    1. Khi có sự kiện (Đơn hàng mới, Tin nhắn mới), backend **luôn ghi bản ghi vào bảng `notifications` trong MongoDB/PostgreSQL trước**.
    2. Sau khi ghi thành công, mới bắn tín hiệu qua Socket.
    3. Khi client kết nối lại (`on('connect')`), frontend tự động gọi API `GET /api/v1/notifications/unread-count` để cập nhật số huy hiệu đỏ trên quả chuông và đồng bộ lại danh sách thông báo.

---

### [RF-003] Nguy Cơ Trễ Kích Hoạt Bản Quyền Ebook (DRM Latency) Trong Đợt Siêu Sale
- **Hiện tượng & Bối cảnh:**
  - Vào các dịp Mega Sale (11/11, Black Friday), hàng nghìn đơn Ebook được thanh toán thành công trong 1 phút.
  - Quá trình kích hoạt Ebook đòi hỏi: Ký chữ ký số mã hóa File PDF/EPUB, đóng dấu Watermark (Tên + SĐT độc giả), lưu trữ key giải mã vào DRM Vault.
  - Nếu thực hiện xử lý đồng bộ (Synchronous HTTP call) ngay trong luồng webhook thanh toán của PayOS/VNPay, request sẽ bị timeout quá 30 giây, dẫn đến PayOS báo lỗi giao dịch dù tiền đã trừ của khách.
- **Giải pháp dứt khoát cho tương lai:**
  - **Mô hình Message Queue Decoupling (RabbitMQ + Outbox Pattern):**
    1. Webhook thanh toán PayOS chỉ cập nhật trạng thái đơn hàng sang `PAID` và bắn message `order.paid` vào RabbitMQ trong vòng **200ms**.
    2. Microservice `commerce-service` và DRM worker tiêu thụ message bất đồng bộ (Async Worker), tiến hành đóng watermark và tạo khóa DRM trong background.
    3. Ngay khi worker hoàn tất, bắn socket event `LICENSE_ACTIVATED` để giao diện web tự động mở nút "Đọc Ngay" cho độc giả.
    4. Cấu hình **Dead-Letter Exchange (DLX)** để tự động retry tối đa 5 lần nếu worker gặp sự cố tạm thời.

---

### [RF-004] Nguy Cơ Gian Lận Hoàn Tiền Khi Đã Đọc Xong Ebook (DRM Revocation Leak)
- **Hiện tượng & Bối cảnh:**
  - Khách hàng mua Ebook, tải về máy hoặc mở Web Reader đọc hết nội dung trong vòng 24 giờ, sau đó bấm nút "Yêu cầu đổi trả / Hoàn tiền".
  - Nếu sàn hoàn tiền mà không có cơ chế thu hồi khóa giải mã (Token Revocation), khách hàng vẫn có thể tiếp tục mở file sách đã cache trên thiết bị offline.
- **Giải pháp dứt khoát cho tương lai:**
  - Khi đơn hoàn tiền được duyệt (`REFUNDED`):
    1. Cập nhật trạng thái License trong cơ sở dữ liệu sang `REVOKED`.
    2. Xóa Token giải mã trong Redis cache.
    3. Web Reader định kỳ kiểm tra heartbeat hợp lệ của phiên đọc (mỗi 10 phút). Nếu phát hiện License bị thu hồi, tự động khóa khung đọc sách và thông báo: *"Bản quyền ấn phẩm này đã được hoàn trả"*.

---

### [RF-005] Đồng Bộ Dữ Liệu Ngoại Tuyến Cho Shipper Tại Vùng Mất Sóng (Offline-First Logistics)
- **Hiện tượng & Bối cảnh:**
  - Shipper giao hàng tại các tầng hầm chung cư, thang máy hoặc vùng ngoại thành thường xuyên bị mất kết nối mạng di động.
  - Khi khách hàng ký nhận hoặc trả tiền mặt, Shipper bấm "Hoàn tất đơn" sẽ gặp lỗi `Network Error`, không thể chụp ảnh POD hoặc lưu dữ liệu.
- **Giải pháp dứt khoát cho tương lai:**
  - Áp dụng kiến trúc **Offline-First PWA / IndexDB**:
    1. Cho phép Shipper chụp ảnh POD và ký nhận ngay cả khi không có mạng; dữ liệu được mã hóa và lưu tạm vào `IndexedDB` trên trình duyệt/ứng dụng của tài xế.
    2. Cài đặt `Background Sync API`: ngay khi thiết bị có lại kết nối Internet, ứng dụng tự động đẩy dữ liệu lên máy chủ và đồng bộ trạng thái đơn hàng mà không cần tài xế phải thao tác lại.

---

### [RF-006] Race Condition Rút Ví Đồng Thời Của Đối Tác (Distributed Wallet Concurrency)
- **Hiện tượng & Bối cảnh:**
  - Khi Affiliate Marketer hoặc Chủ Shop có số dư ví 10.000.000đ, sử dụng 2 thiết bị khác nhau hoặc mở 2 tab trình duyệt và bấm nút "Xác nhận rút tiền" chính xác tại cùng một mili-giây.
  - Nếu backend kiểm tra số dư theo kiểu truyền thống (`SELECT balance ... -> UPDATE balance`), cả 2 giao dịch đều đọc thấy số dư 10 triệu và tạo ra 2 lệnh chuyển khoản với tổng số tiền 20 triệu (Double Spending).
- **Giải pháp dứt khoát cho tương lai:**
  - Áp dụng **Redis Distributed Lock (Redlock)** với TTL 5 giây theo cú pháp: `SET lock:wallet:{userId} {token} NX EX 5`.
  - Kết hợp câu lệnh cập nhật số dư có điều kiện tại Database:
    ```sql
    UPDATE wallets 
    SET balance = balance - :amount, updated_at = NOW() 
    WHERE user_id = :userId AND balance >= :amount;
    ```
  - Nếu số dòng bị ảnh hưởng = 0, lập tức từ chối giao dịch thứ hai.

---

## 🛠️ LỘ TRÌNH TRIỂN KHAI ĐỀ XUẤT (PRIORITIZED ROADMAP)

```
====================================================================================================
  GIAI ĐOẠN        MÃ RỦI RO   MÔ TẢ KỸ THUẬT                                 ĐỘ ƯU TIÊN   HẠ TẦNG
====================================================================================================
  Giai đoạn 1      RF-001      Cấu hình Nginx Host Reverse Proxy WebSocket    P0 (Ngay)    Nginx UAT
  Giai đoạn 1      RF-002      Persistent Inbox + Red Badge Sync Thông báo    P1 (Cao)     MongoDB
  Giai đoạn 2      RF-003      RabbitMQ Outbox Pattern cho Ebook DRM          P1 (Cao)     RabbitMQ
  Giai đoạn 2      RF-006      Redis Distributed Lock rút tiền Ví             P1 (Cao)     Redis
  Giai đoạn 3      RF-004      Heartbeat DRM Revocation khi hoàn tiền         P2 (Vừa)     Web Reader
  Giai đoạn 3      RF-005      IndexedDB Offline Sync cho Shipper giao hàng   P2 (Vừa)     PWA
====================================================================================================
```

Văn bản này đã được lưu trữ độc lập tại:
- [task/bug-future.md](file:///e:/HuKi/task/bug-future.md)
- [task/bugs/bug-future.md](file:///e:/HuKi/task/bugs/bug-future.md)
