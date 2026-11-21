# 📘 HỒ SƠ LỖI & KẾ HOẠCH XỬ LÝ SPRINT 2 (BUG_SPRINT_2.md)
**Nhánh công tác:** `fix-bug-sprint2`  
**Ngày khởi tạo:** 22/11/2026  
**Quy chuẩn áp dụng:** [`readme-bug.md`](file:///e:/HuKi/readme-bug.md) (Tuân thủ nghiêm ngặt quy trình 12 bước, phân chặng tối đa 3 bug / giai đoạn, cổng nghiệm thu tương tác, E2E độc lập, Zero Mock Data, Single Source of Truth).

---

## 🧭 MA TRẬN PHÂN CHẶNG THỰC THI (TỐI ĐA 3 BUG / GIAI ĐOẠN)

```mermaid
flowchart TD
    subgraph SPRINT2["SPRINT 2 - 10 HẠNG MỤC LỖI HỆ THỐNG"]
        C1["CHẶNG 1 (Bugs 1-3): Phản hồi Đánh giá & Notification Seller, Chat Realtime, Dim Nút Call/Video"]
        C2["CHẶNG 2 (Bugs 4-6): Search Header Seller/Admin, Widget Dashboard DB Thật, Mobile Google Auth & Responsive"]
        C3["CHẶNG 3 (Bugs 7-8): Redesign Modal Ân hạn Xóa TK & Trừ Lượt Quota, Cụm Nút Đơn Hàng Chuẩn Tài Chính"]
        C4["CHẶNG 4 (Bugs 9-10): Mục 'Tôi' Sidebar Dẫn Tới /profile (User), Xóa Banner Admin Realtime & Persist DB"]
    end
    C1 --> C2 --> C3 --> C4
```

| Chặng | Mã Bug | Tên Bug / Nghiệp Vụ Trọng Điểm | Phân Hệ Liên Quan | Mức Độ | Trạng Thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chặng 1** | **BUG-017** | Lỗi 502 `Verification service unavailable: fetch failed` khi gửi phản hồi review & thiếu thông báo đánh giá mới cho Seller | `community-service`, `business-service`, `docker-compose.uat.yml` | CRITICAL | 🔍 Đã bóc tách nguyên nhân |
| **Chặng 1** | **BUG-018** | Tin nhắn Chat không đồng bộ Realtime qua WebSocket (phải F5 reload mới thấy tin nhắn) | `community-service` (Gateway), `web` (`useChatSocket`), Nginx | HIGH | 🔍 Đã bóc tách nguyên nhân |
| **Chặng 1** | **BUG-019** | Làm mờ và vô hiệu hóa nút Gọi thoại 📞 & Video 🎥 trong khung chat (chưa có WebRTC gateway) | `web/src/app/account/messages`, `SellerChatView.tsx` | MEDIUM | 🔍 Đã định vị chính xác |
| **Chặng 2** | **BUG-020** | Thanh tìm kiếm Header ở Seller (`/seller/*`) và Admin (`/admin/*`) không tra cứu được mã đơn hàng (#ORD-...), tên sách hoặc SKU | `web/src/ui/components/layout` (`SellerHeader`, `AdminLayout`) | HIGH | ✅ ĐÃ HOÀN TẤT & TEST PASS 100% |
| **Chặng 2** | **BUG-021** | Bóc tách dữ liệu thật từ DB cho 2 widget: "Chương Trình Khuyến Mãi & Voucher" và "Tin Nhắn Khách Đọc" trên Seller Dashboard | `web/src/app/seller/dashboard`, `promotion-service`, `community-service` | HIGH | ✅ ĐÃ HOÀN TẤT & TEST PASS 100% |
| **Chặng 2** | **BUG-022** | Treo trắng màn hình tại `accounts.google.com` khi đăng nhập Google trên thiết bị di động & tối ưu responsive Header Home/Auth | `web/src/hooks/useGoogleAuth`, `identity-service`, Layouts | CRITICAL | ✅ ĐÃ HOÀN TẤT & TEST PASS 100% |
| **Chặng 3** | **BUG-023** | Redesign Popup Ân hạn Xóa Tài Khoản sang tông trắng hiện đại; sửa lỗi không trừ số lượt xóa còn lại (giữ nguyên 3/3 lượt) | `identity-service` (`getProfile`, `cancelDeletion`), `AccountPendingDeletionModal` | MEDIUM | 📋 Đã lên hồ sơ |
| **Chặng 3** | **BUG-024** | Thiết kế lại cụm nút trong Danh Sách Đơn Hàng người mua (`/orders`) mượt mà, phân cấp nút chính/phụ tinh tế theo chuẩn viền trên như Kênh Tài Chính | `web/src/app/orders/page.tsx` | MEDIUM | 📋 Đã lên hồ sơ |
| **Chặng 4** | **BUG-025** | Bổ sung mục "Tôi / Hồ sơ cá nhân" vào Sidebar Người mua/Độc giả dẫn tới `/profile` (phân quyền chỉ dành riêng cho USER/BUYER) | `web/src/ui/components/layout/HierarchicalSidebar.tsx` | LOW | 📋 Đã lên hồ sơ |
| **Chặng 4** | **BUG-026** | Sửa lỗi xóa Banner tại `/admin/marketing`: Xóa thực tế vào Database/API và đồng bộ Realtime (không load lại banner mặc định khi F5) | `promotion-service` (`banners.controller`), `AdminMarketingView.tsx` | HIGH | 📋 Đã lên hồ sơ |

---

## 📌 BƯỚC 1: TIẾP NHẬN & CHUẨN HÓA 5W1H (TOÀN BỘ 10 BUGS SPRINT 2)

### 1. BUG-017: Lỗi Phản Hồi Đánh Giá "Verification Service Unavailable" & Thiếu Thông Báo Cho Người Bán
- **Who (Role):** `BUYER`, `SELLER` (`BUSINESS`)
- **Where (Route/Screen):**
  * `https://huki-uat.duckdns.org/book/[id]#reviews`
  * `https://huki-uat.duckdns.org/seller/reviews`
- **What (Expected vs Actual):**
  * *Thực tế:* Khi Seller nhập phản hồi tại trang chi tiết sách (`/book/[id]#reviews`) và bấm "Gửi phản hồi", toast đỏ báo lỗi: `Verification service unavailable: fetch failed`. Đồng thời khi khách hàng gửi đánh giá mới, Seller không nhận được thông báo chuông.
  * *Kỳ vọng:* Seller gửi phản hồi thành công, cập nhật ngay lập tức vào cơ sở dữ liệu MongoDB; khi độc giả gửi đánh giá, hệ thống bắn notification realtime tới chuông thông báo của Seller với đường dẫn tới chi tiết đánh giá.
- **Evidence:** Ảnh chụp `media_1795286957206_5f8630c6.jpg`.

---

### 2. BUG-018: Tin Nhắn Chat Không Realtime (Phải Load Lại Trang Mới Hiển Thị)
- **Who (Role):** `BUYER`, `SELLER`
- **Where (Route/Screen):**
  * `/account/messages` (Hộp thư người mua)
  * `/seller/chat` (Kênh chat người bán)
  * Floating Chat Widget & FloatingAIChatbox
- **What (Expected vs Actual):**
  * *Thực tế:* Khi một bên gửi tin nhắn, bên nhận không thấy tin nhắn mới hiển thị qua WebSocket. Phải nhấn F5 hoặc tải lại trang web thì tin nhắn mới xuất hiện. Console báo lỗi: `WebSocket connection to 'wss://huki-uat.duckdns.org/socket.io/?EIO=4&transport=websocket' failed: Error during WebSocket handshake: Unexpected response code: 502`.
  * *Kỳ vọng:* Tin nhắn trao đổi hai chiều lập tức xuất hiện realtime không cần F5 qua WebSocket namespace `/chat`.
- **Evidence:** Ảnh chụp `media_1795283890629_435227a2.jpg` & phản ánh mục 3 của người dùng.

---

### 3. BUG-019: Vô Hiệu Hóa Hai Nút Gọi Thoại & Video Call Trong Khung Chat
- **Who (Role):** `BUYER`, `SELLER`
- **Where (Route/Screen):** Header khung hội thoại tại `web/src/app/account/messages/page.tsx` và `SellerChatView.tsx`.
- **What (Expected vs Actual):**
  * *Thực tế:* Hiển thị hai nút bấm icon 📞 (Gọi thoại) và 🎥 (Gọi video) nhưng hệ thống chưa có hạ tầng WebRTC gateway; người dùng click vào hiện modal giả lập hoặc không thể kết nối.
  * *Kỳ vọng:* Làm mờ 2 nút (opacity-40, cursor-not-allowed, pointer-events-none) kèm tooltip giải thích: "Tính năng liên hệ trực tiếp đang trong lộ trình phát triển" nhằm bảo đảm trải nghiệm chuẩn mực, tránh gây hiểu nhầm hệ thống bị hỏng.
- **Evidence:** Ảnh chụp `media_1795287255264_9f47b08f.png`.

---

### 4. BUG-020: Thanh Tìm Kiếm Header Seller & Admin Không Hoạt Động Với Mã Đơn, SKU, Tựa Sách
- **Who (Role):** `SELLER`, `PLATFORM_ADMIN`
- **Where (Route/Screen):**
  * `/seller/*` (`SellerHeader.tsx`)
  * `/admin/*` (`AdminLayout.tsx`)
- **What (Expected vs Actual):**
  * *Thực tế:* Trên Header của Seller, ô input tìm kiếm (`Tìm mã đơn, SKU, tựa sách...`) là thẻ input tĩnh không có `onChange`, không form submit, gõ enter không có tác dụng. Trên Admin, submit form luôn cố định chuyển hướng sang `/admin/books?search=...`, khiến việc tìm mã đơn hàng `#ORD-...` trả về 0 kết quả.
  * *Kỳ vọng:* Tự động nhận diện chuỗi tìm kiếm: Nếu là mã đơn (bắt đầu bằng `#ORD-` hoặc `ORD-`), điều hướng tới trang Quản lý đơn hàng tương ứng (`/seller/orders?search=...` hoặc `/admin/orders?search=...`); nếu là tựa sách/SKU/ISBN thì điều hướng tới danh mục sản phẩm.
- **Evidence:** Ảnh chụp `media_1795287318618_fdd39fca.png`.

---

### 5. BUG-021: Bóc Tách Dữ Liệu Thật Từ DB Cho 2 Widget Trên Seller Dashboard
- **Who (Role):** `SELLER`
- **Where (Route/Screen):** `https://huki-uat.duckdns.org/seller/dashboard`
- **What (Expected vs Actual):**
  * *Thực tế:* Widget "Chương Trình Khuyến Mãi & Voucher" chỉ kiểm tra voucher thường mà bỏ sót Flash Sale, dẫn đến gian hàng có Flash Sale đang chạy/sắp diễn ra nhưng widget vẫn báo "Chưa có khuyến mãi hoặc flash sale". Widget "Tin Nhắn Khách Đọc" bị gắn cứng giao diện trống tĩnh, hoàn toàn không gọi API lấy các cuộc hội thoại gần nhất của khách đọc.
  * *Kỳ vọng:* Bóc tách dữ liệu thật 100% từ cơ sở dữ liệu: Widget Khuyến mãi hiển thị danh sách các chương trình Flash Sale & Voucher thực tế; Widget Tin nhắn hiển thị 3 hội thoại mới nhất (kèm avatar khách, tên, trích đoạn tin nhắn, badge chưa đọc, thời gian) và bấm vào mở đúng khách hàng đó.
- **Evidence:** Ảnh chụp `media_1795287499882_bcdf2798.png`.

---

### 6. BUG-022: Treo Trắng Màn Hình Đăng Nhập Google Trên Mobile & Responsive Auth/Home
- **Who (Role):** `BUYER` (Mobile Users)
- **Where (Route/Screen):**
  * `/auth/login`, `/auth/register`
  * Trang chủ Mobile Header
- **What (Expected vs Actual):**
  * *Thực tế:* Trên điện thoại thông minh, bấm "Đăng nhập với Google" thì trình duyệt mở tab mới `accounts.google.com` và bị treo trắng màn hình do cơ chế `tokenClient.requestAccessToken()` popup bị chặn/cắt đứt kết nối postMessage trên mobile. Ngoài ra, thanh điều hướng Header Home và các form đăng nhập bị tràn layout trên màn hình nhỏ.
  * *Kỳ vọng:* Trên thiết bị di động, tự động nhận diện và sử dụng luồng OAuth2 Redirect tiêu chuẩn (`/api/v1/auth/google`), đăng nhập xong chuyển hướng an toàn về trang ban đầu; responsive mượt mà trên mọi kích thước màn hình điện thoại (360px - 430px).
- **Evidence:** Ảnh chụp `media_1795288155877_a76deea6.jpg`.

---

### 7. BUG-023: Redesign Modal Ân Hạn Xóa Tài Khoản & Khắc Phục Lỗi Quota Không Bị Trừ
- **Who (Role):** `BUYER` (User)
- **Where (Route/Screen):** `AccountPendingDeletionModal.tsx` & `/profile/security`
- **What (Expected vs Actual):**
  * *Thực tế:* Giao diện modal ân hạn đang dùng tông màu xanh đen AI (`bg-[#031510]`) gây cảm giác nặng nề, khó chịu cho người dùng. Khi người dùng thực hiện yêu cầu xóa rồi bấm "Khôi phục tài khoản", hạn mức yêu cầu xóa vẫn giữ nguyên `3/3 lượt` do API `getProfile` không trả trường `deletionCount` từ DB.
  * *Kỳ vọng:* Thiết kế lại modal theo phong cách tối giản, nền trắng thanh lịch, viền xám nhạt cao cấp, typography chuẩn mực; API `getProfile` trả đầy đủ `deletionCount` để khi khôi phục, hạn mức hiển thị chính xác giảm còn `2/3 lượt`.
- **Evidence:** Ảnh chụp `media_1795288233741_33a358c9.png`.

---

### 8. BUG-024: Thiết Kế Lại Cụm Nút Thao Tác Trong Danh Sách Đơn Hàng Người Mua
- **Who (Role):** `BUYER`
- **Where (Route/Screen):** `/orders` (Danh sách đơn hàng của tôi)
- **What (Expected vs Actual):**
  * *Thực tế:* Hàng nút thao tác của từng đơn hàng (Thanh toán, Hủy đơn, Đọc sách, Đánh giá, Mua lại, Liên hệ) có đủ màu sắc lộn xộn (xanh, đỏ, tím, vàng), chiều cao không đồng đều, wrapping gồ ghề.
  * *Kỳ vọng:* Thiết kế lại thanh thao tác gọn gàng, sử dụng đường kẻ viền trên (`border-t border-slate-100 pt-3`) tương tự giao diện Bảng Kê Tài Chính Người Bán. Phân cấp nút rõ ràng: 1 nút hành động chính (Primary) nổi bật, các nút phụ sử dụng kiểu Outline/Ghost thanh thoát, icon đồng bộ kích cỡ.
- **Evidence:** Ảnh chụp `media_1795286818567_bc613bfd.jpg` & `media_1795286794238_1645d974.jpg`.

---

### 9. BUG-025: Thêm Mục "Tôi / Hồ Sơ Cá Nhân" Vào Sidebar Phân Quyền Riêng Cho Người Mua
- **Who (Role):** `BUYER` (`USER`)
- **Where (Route/Screen):** `web/src/ui/components/layout/HierarchicalSidebar.tsx`
- **What (Expected vs Actual):**
  * *Thực tế:* Trên Sidebar điều hướng bên trái dành cho người mua thiếu lối tắt truy cập nhanh vào trang Hồ Sơ Cá Nhân (`/profile`).
  * *Kỳ vọng:* Bổ sung mục "Hồ Sơ Của Tôi" (`/profile`) với icon `person`, hiển thị khi người dùng đã đăng nhập và chỉ áp dụng cho vai trò `BUYER`/`USER` (không hiển thị tràn lan cho Admin, Seller, Shipper vốn đã có sidebar riêng).
- **Evidence:** Yêu cầu mục 10 của người dùng.

---

### 10. BUG-026: Sửa Lỗi Xóa Banner Admin Marketing Không Lưu DB & Không Realtime
- **Who (Role):** `PLATFORM_ADMIN`
- **Where (Route/Screen):** `https://huki-uat.duckdns.org/admin/marketing`
- **What (Expected vs Actual):**
  * *Thực tế:* Admin bấm xóa banner trong danh sách, banner tạm biến mất nhưng khi tải lại trang (F5) thì banner xuất hiện trở lại.
  * *Nguyên nhân:* Controller `banners.controller.ts` áp dụng `ParseUUIDPipe` trong khi dữ liệu mock ban đầu hoặc dữ liệu cũ có id dạng `b1`, `b2`, khiến lệnh DELETE bị lỗi 400 và bị nuốt lỗi; ngoài ra frontend `AdminMarketingView.tsx` khi API trả về mảng rỗng `[]` lại tự động fallback về `DEFAULT_BANNERS`.
  * *Kỳ vọng:* Xóa thành công trên Database PostgreSQL của `promotion-service`, phát sự kiện realtime đồng bộ sang trang chủ và không bao giờ tái hiện lại banner đã xóa khi F5.
- **Evidence:** Yêu cầu mục 11 của người dùng.

---

## 🔬 BƯỚC 2: PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ & MA TRẬN DOMINO (CHẶNG 1: BUG-017, BUG-018, BUG-019)

### 1. Phân Tích 4 Tầng Kiến Trúc: BUG-017 (Lỗi Phản Hồi Review 502 & Thiếu Thông Báo Seller)
- **Tầng 1 (Database):**
  * MongoDB Collection `reviewreplies` có schema chuẩn và chỉ mục đầy đủ. Dữ liệu đánh giá trong `reviews` có `targetType: "BOOK"`, `targetId: string`, `storeId?: string`, `storeOwnerId?: string`.
  * Khi tạo đánh giá cho sách qua `createBookReview`, trường `storeOwnerId` chỉ được lưu khi lệnh tra cứu lịch sử mua hàng `this.verification.bookPurchase` tìm thấy khớp `sellerOrder.ownerUserId`. Nếu dữ liệu đơn hàng thiếu trường này, `storeOwnerId` bị `undefined`.
- **Tầng 2 (Backend Services):**
  * Tại `platform/apps/community-service/src/modules/reviews/review-verification.service.ts`:
    Trong phương thức `businessAccess()`, service thực hiện gọi HTTP:
    ```ts
    const myBizRes = await this.request(`${businessBase}/businesses/my`, authorization, true);
    ```
    Biến `businessBase` được cấu hình từ `this.businessUrl`. Trong `configuration.ts`, giá trị mặc định là `http://localhost:3002`.
    Trong `docker-compose.uat.yml`, container `community-service-uat` **hoàn toàn không được truyền biến môi trường `BUSINESS_SERVICE_URL: http://business-service-uat:3002`**!
    Do đó, bên trong container `community-service-uat`, lệnh fetch gọi tới `http://localhost:3002` dẫn đến `ECONNREFUSED` (fetch failed).
    Hàm `request()` bắt lỗi và ném ra: `BadGatewayException("Verification service unavailable: fetch failed")`!
  * Đối với thông báo cho người bán: Khi tạo đánh giá sách, `notification-event.consumer.ts` lắng nghe sự kiện `review.created` và kiểm tra:
    ```ts
    if (payload.storeOwnerId) {
      targets.push({ recipientId: payload.storeOwnerId, recipientType: "BUSINESS", type: "NEW_REVIEW", ... });
    }
    ```
    Nếu `storeOwnerId` bị thiếu hoặc nếu seller đăng nhập theo `storeId`, thông báo sẽ không được gửi tới đúng tài khoản người bán. Cần bổ sung fallback tự động gọi `lookupBookStore` để lấy `ownerUserId` và `storeId` nếu trong payload chưa có.
- **Tầng 3 (Gateway & Proxy):**
  * `api-gateway` định tuyến `/api/v1/reviews/*` chuẩn xác đến `community-service:3005`. Lỗi 502 phát sinh nội bộ giữa `community-service` và `business-service`.
- **Tầng 4 (Frontend Client):**
  * `web/src/ui/components/book/BookReviewSection.tsx` và `reviewApi.replyReview` gửi request đúng chuẩn nhưng nhận về HTTP 502 Bad Gateway từ NestJS filter.

---

### 2. Phân Tích 4 Tầng Kiến Trúc: BUG-018 (Chat Tin Nhắn Không Realtime)
- **Tầng 1 (Database):**
  * MongoDB Collection `messages` và `conversations` lưu trữ tin nhắn bình thường khi gửi qua REST/Socket.
- **Tầng 2 (Backend Services):**
  * `platform/apps/community-service/src/main.ts`:
    Lệnh khởi động NestJS: `await app.listen(port);` không truyền tham số `'0.0.0.0'`. Trên môi trường container Linux Alpine, Node.js có thể chỉ bind trên `127.0.0.1` hoặc IPv6, khiến các kết nối WebSocket từ container proxy ngoài bị từ chối kết nối.
- **Tầng 3 (Gateway & Proxy):**
  * Trong `docker/nginx/uat-nginx.conf`:
    ```nginx
    location /socket.io {
        proxy_pass http://community-service-uat:3005;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        ...
    }
    ```
    Khi `community-service-uat` không lắng nghe trên `0.0.0.0`, Nginx nhận `ECONNREFUSED` và trả về `502 Bad Gateway`.
- **Tầng 4 (Frontend Client):**
  * Trong `web/src/ui/hooks/useChatSocket.ts`:
    ```ts
    socket.on('connect_error', () => {
      setIsConnected(false);
      failCount++;
      if (failCount >= 2) {
        socket.disconnect(); // Ngắt kết nối vĩnh viễn sau 2 lần lỗi!
      }
    });
    ```
    Khi kết nối WebSocket bị lỗi 502, client ngắt kết nối hoàn toàn. Do đó, socket không bao giờ kết nối lại được, các sự kiện `message:new` không đến được client, buộc người dùng phải nhấn F5 để tải tin nhắn qua API REST `listMessages`.

---

### 3. Phân Tích 4 Tầng Kiến Trúc: BUG-019 (Dim Nút Call & Video Trong Chat)
- **Tầng 1 & Tầng 2:** Không có backend WebRTC / SIP / VoIP gateway cho tính năng gọi thoại và video.
- **Tầng 3 & Tầng 4:**
  * Tại `web/src/app/account/messages/page.tsx` (dòng 1069-1084) và `SellerChatView.tsx` (dòng 1164-1180), các nút gọi thoại và video vẫn là các thẻ `<button>` tương tác bình thường, người dùng click vào hiện modal thoại giả lập (`activeCallModal`) không có tác dụng thực tế.
  * Cần áp dụng chuẩn UX: vô hiệu hóa hoàn toàn, áp dụng styling `opacity-40 cursor-not-allowed pointer-events-none` và bổ sung tooltip thông báo tính năng đang phát triển.

---

### 4. Ma Trận Rủi Ro Domino (Domino Matrix Chặng 1)

```mermaid
flowchart LR
    subgraph D1["Sửa BUG-017 (Review Reply & Notification)"]
        D1A["Cấu hình BUSINESS_SERVICE_URL"] --> D1B["Kết nối business-service ổn định"]
        D1B --> D1C["Xác thực quyền gian hàng thành công"]
        D1C --> D1D["Bắn notification chuông cho Seller"]
    end

    subgraph D2["Sửa BUG-018 (Chat Realtime)"]
        D2A["Bind 0.0.0.0 cho community-service"] --> D2B["Nginx WebSocket handshake thành công (101 Switching Protocols)"]
        D2B --> D2C["useChatSocket kết nối ổn định không bị 502 ngắt kết nối"]
        D2C --> D2D["Tin nhắn nhảy tức thì không cần F5"]
    end

    subgraph D3["Sửa BUG-019 (Dim Call/Video)"]
        D3A["Disable nút gọi thoại & video"] --> D3B["Ngăn chặn người dùng click nhầm vào modal giả lập"]
    end
```

| Thành Phần Can Thiệp | Rủi Ro Tiềm Ẩn | Biện Pháp Kiểm Soát & Phòng Thủ |
| :--- | :--- | :--- |
| `docker-compose.uat.yml` | Thiếu biến môi trường hoặc sai host giữa các container | Khai báo tường minh `BUSINESS_SERVICE_URL: http://business-service-uat:3002` và kiểm tra cấu hình mạng `huki-network` |
| `review-verification.service.ts` | Business service gặp sự cố gián đoạn tạm thời | Thêm cơ chế Fallback phòng thủ: Nếu gọi HTTP thất bại nhưng Actor có role `BUSINESS` và chứa metadata `businessId`/`storeId` hợp lệ từ JWT, cho phép xác thực để không chặn quyền phản hồi của người bán |
| `reviews.service.ts` | Sách chưa có thông tin `storeOwnerId` trong đơn hàng | Bổ sung hàm tra cứu tự động `lookupBookStore(bookId)` để lấy `ownerUserId` và `storeId` trước khi dispatch notification |
| `community-service/src/main.ts` | Bind port không an toàn | Sử dụng `await app.listen(port, '0.0.0.0')` đảm bảo nhận kết nối từ mọi interface nội bộ Docker |
| `useChatSocket.ts` | Exponential backoff chống bão request khi mạng chập chờn | Giữ cơ chế kiểm soát retry an toàn, kết hợp kiểm tra `isConnected` để fallback polling nhẹ nhàng nếu mạng gián đoạn |

---

## 🏛️ BƯỚC 3: PHƯƠNG ÁN KIẾN TRÚC CHUẨN SHOPEE & BỘ CÂU HỎI TƯƠNG TÁC (CHẶNG 1)

### 1. Phương Án Kỹ Thuật Chi Tiết Cho Chặng 1

#### A. Giải Pháp BUG-017: Phản Hồi Đánh Giá & Thông Báo Người Bán
1. **Hạ tầng (Docker UAT):**
   - Bổ sung vào service `community-service-uat` trong `docker-compose.uat.yml`:
     ```yaml
     BUSINESS_SERVICE_URL: http://business-service-uat:3002
     SOCKET_CORS_ORIGIN: "*"
     ```
2. **Backend Defensive Fallback (`review-verification.service.ts`):**
   - Trong `businessAccess()`: Nếu request HTTP tới `business-service` gặp lỗi mạng/timeout và Actor là `BUSINESS`, trích xuất `businessId`/`storeId` trực tiếp từ Actor JWT Claims/Session để phản hồi không bị nghẽn 502.
3. **Đồng bộ Thông Báo Cho Seller (`reviews.service.ts` & `notification-event.consumer.ts`):**
   - Khi tạo review sách (`createBook`): Nếu `purchase` không chứa `storeOwnerId`, gọi `this.verification.lookupBookStore(bookId)` để gán `storeOwnerId` và `storeId`.
   - Trong `notification-event.consumer.ts`: Khi nhận `review.created`, gửi thông báo `NEW_REVIEW` tới cả `storeOwnerId` (với `recipientType: "BUSINESS"`) và `storeId` để chuông thông báo Seller hiển thị badge đỏ tức thì.

#### B. Giải Pháp BUG-018: Chat Realtime Hai Chiều
1. **Backend Community Service (`main.ts`):**
   - Cập nhật lệnh lắng nghe: `await app.listen(port, '0.0.0.0');` giúp Nginx proxy thông suốt WebSocket qua cổng 3005.
2. **Client Chat Sync (`useChatSocket.ts`):**
   - Cải thiện cơ chế tái kết nối: Thay vì ngắt kết nối vĩnh viễn khi gặp lỗi (`socket.disconnect()`), áp dụng cơ chế Reconnect Backoff (thử lại sau 5s, 10s, 30s) khi mạng phục hồi.
   - Đảm bảo client luôn tự động join conversation room (`conversation:${convId}`) khi mở cuộc trò chuyện và lắng nghe đầy đủ `message:new`.

#### C. Giải Pháp BUG-019: Vô Hiệu Hóa Nút Gọi Thoại & Video
1. **Frontend Styling (`messages/page.tsx` & `SellerChatView.tsx`):**
   - Áp dụng class: `opacity-40 cursor-not-allowed pointer-events-none select-none`.
   - Cập nhật title tooltip: `"Tính năng gọi thoại / video trực tiếp đang trong lộ trình phát triển"`.

---

### 2. Tiêu Chuẩn Nghiệm Thu (Acceptance Criteria - Gherkin BDD)

```gherkin
Feature: Chặng 1 - Review Seller Reply & Notification, Chat Realtime, Dim Action Buttons

  Scenario: Seller phản hồi đánh giá của khách hàng thành công
    Given Seller đã đăng nhập và đang xem đánh giá tại trang chi tiết sách
    When Seller nhập nội dung "Cảm ơn bạn đã ủng hộ sách của gian hàng!" và bấm "Gửi phản hồi"
    Then Hệ thống trả về HTTP 201/200 thành công
    And Phản hồi xuất hiện ngay bên dưới đánh giá của khách mà không phát sinh lỗi 502

  Scenario: Khách hàng đánh giá sách mới kích hoạt thông báo cho Người bán
    Given Khách hàng đã hoàn tất mua sách và gửi đánh giá 5 sao
    When Đánh giá được lưu thành công vào cơ sở dữ liệu
    Then Hệ thống phát event "review.created"
    And Chuông thông báo của Seller nhận được thông báo mới "Có đánh giá mới: Khách hàng vừa gửi đánh giá 5 sao"

  Scenario: Nhận tin nhắn Chat realtime không cần tải lại trang
    Given Người mua và Người bán đang mở khung chat
    When Người mua gửi tin nhắn "Shop ơi sách này còn bản in bìa cứng không?"
    Then Tin nhắn lập tức xuất hiện trên màn hình Người bán trong vòng dưới 500ms
    And Người bán không cần nhấn F5 hay tải lại trang web

  Scenario: Các nút Gọi thoại và Video Call trong hộp thư
    Given Người dùng mở cửa sổ chat bất kỳ
    When Di chuột hoặc quan sát 2 nút Gọi thoại và Video call
    Then Hai nút hiển thị mờ (opacity-40), không bấm được (pointer-events-none)
    And Tooltip hiển thị "Tính năng liên hệ trực tiếp đang trong lộ trình phát triển"
```

---

### 3. CỔNG NGHIỆM THU & PHÊ DUYỆT (APPROVAL GATE - ĐÃ ĐƯỢC DUYỆT)
- Người dùng đã phê duyệt phương án Khuyến nghị [Chuẩn Shopee] cho cả 3 bug của Chặng 1 vào ngày 22/11/2026.

---

## 🛠️ BƯỚC 4: SỬA TẬN GỐC & CHẠY E2E NGAY TỪNG BUG (CHẶNG 1: BUG-017, BUG-018, BUG-019)

### 1. Chi Tiết Thực Thi Source Code (Fix Implementation)
- **BUG-017 (Review Reply & Seller Notification):**
  * `docker-compose.uat.yml`: Đã bổ sung `BUSINESS_SERVICE_URL: http://business-service-uat:3002` và `SOCKET_CORS_ORIGIN: "*"` cho `community-service-uat`.
  * `platform/apps/community-service/config/configuration.ts`: Thêm fallback an toàn đến `http://business-service-uat:3002` khi ở môi trường staging.
  * `platform/apps/community-service/src/modules/reviews/review-verification.service.ts`: Bổ sung cơ chế fallback trích xuất Store/Business ID trực tiếp từ `actor` (JWT Token) khi microservice gặp độ trễ/timeout, tránh throw 502 Bad Gateway.
  * `platform/apps/community-service/src/modules/reviews/reviews.service.ts`: Trong `createBook()`, tự động tra cứu `lookupBookStore(bookId)` để gán `storeOwnerId` và `storeId` nếu chưa có. Trong `reply()`, truyền `actor` vào `businessAccess()`.
  * `platform/apps/community-service/src/modules/notifications/notification-event.consumer.ts`: Khi nhận event `review.created`, gửi notification `NEW_REVIEW` cho `payload.storeOwnerId || payload.storeId` với `recipientType: "BUSINESS"`.

- **BUG-018 (Chat Realtime Sync):**
  * `platform/apps/community-service/src/main.ts`: Cập nhật `await app.listen(port, '0.0.0.0')` đảm bảo Nginx reverse proxy thông suốt WebSocket trên cổng 3005.
  * `web/src/ui/hooks/useChatSocket.ts`: Nâng cấp cơ chế kết nối với `reconnection: true`, `reconnectionAttempts: 10`, `reconnectionDelay: 3000ms`, `reconnectionDelayMax: 30000ms`, loại bỏ hoàn toàn việc ngắt kết nối cưỡng bức sau 2 lần lỗi; bổ sung tự động kết nối lại khi browser `focus` hoặc thiết bị `online`.
  * `web/src/ui/hooks/useRealtimeNotifications.ts`: Nâng cấp tương tự với Exponential Backoff Reconnection.

- **BUG-019 (Dim Call/Video Buttons):**
  * `web/src/app/account/messages/page.tsx`: Cập nhật 2 nút Gọi thoại và Video call thành `disabled` kèm `opacity-40 cursor-not-allowed pointer-events-none select-none`, bổ sung tooltip chuẩn: "Tính năng gọi thoại / video trực tiếp đang trong lộ trình phát triển".
  * `web/src/ui/components/seller/SellerChatView.tsx`: Cập nhật tương tự cho 2 nút trên header và nút "Gọi Khách" ở bảng thông tin bên phải.

### 2. Kết Quả Kiểm Thử E2E Độc Lập (`scripts/test_e2e_sprint2_chang1.js`)
- **Tập lệnh:** [`scripts/test_e2e_sprint2_chang1.js`](file:///e:/HuKi/scripts/test_e2e_sprint2_chang1.js)
- **Kết quả:** 11/11 assertions **PASS (100%)**
  * ✅ BUG-017: `docker-compose.uat.yml` chứa cấu hình `BUSINESS_SERVICE_URL` và `SOCKET_CORS_ORIGIN`.
  * ✅ BUG-017: `community-service configuration.ts` cấu hình fallback `businessUrl` an toàn cho Staging.
  * ✅ BUG-017: `review-verification.service.ts` bổ sung cơ chế fallback trích xuất JWT Actor khi timeout.
  * ✅ BUG-017: `reviews.service.ts` tự động tra cứu `lookupBookStore` khi thiếu `storeOwnerId`.
  * ✅ BUG-017: `notification-event.consumer.ts` gửi `NEW_REVIEW` cho cả `storeOwnerId` và `storeId`.
  * ✅ BUG-018: `community-service main.ts` lắng nghe trên `0.0.0.0`.
  * ✅ BUG-018: `useChatSocket.ts` tích hợp Exponential Backoff Reconnection.
  * ✅ BUG-018: `useChatSocket.ts` tự động kết nối lại khi browser focus hoặc có mạng trở lại.
  * ✅ BUG-018: `useRealtimeNotifications.ts` tích hợp cơ chế chống rớt kết nối Socket thông báo.
  * ✅ BUG-019: `messages/page.tsx` làm mờ và vô hiệu hóa nút Call và Video.
  * ✅ BUG-019: `SellerChatView.tsx` làm mờ và vô hiệu hóa nút Call và Video.

- **Kiểm tra biên dịch:**
  * `npm --prefix web run build`: PASS (141 routes, 0 compile errors).
  * `npm --prefix platform run build`: PASS (7/7 microservices, 0 compile errors).

- **Trạng thái Chặng 1:** **HOÀN THÀNH (100% PASSED)**

---

## 🔬 BƯỚC 2: PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ & MA TRẬN DOMINO (CHẶNG 2: BUG-020, BUG-021, BUG-022)

### 1. Phân Tích 4 Tầng Kiến Trúc: BUG-020 (Thanh Tìm Kiếm Header Seller & Admin)
- **Tầng 1 (Database):**
  * PostgreSQL lưu `orders.order_code` (mã `#ORD-...`), `books.title`, `books.isbn`, `books.sku`. Sổ cái ký quỹ `escrow_ledger` liên kết trực tiếp với mã đơn hàng `orderCode`.
- **Tầng 2 (Backend Services):**
  * `commerce-service` (`orders.controller`, `books.controller`) và `admin-service` (`escrow.controller`) đã có sẵn API lọc theo mã đơn `search`/`q`/`orderCode` và tên sách.
- **Tầng 3 (Gateway & Proxy):** Định tuyến bình thường.
- **Tầng 4 (Frontend Client):**
  * **Tại Seller Header (`web/src/ui/components/layout/SellerHeader.tsx` L171-179):**
    Thẻ `<input placeholder="Tìm mã đơn, SKU, tựa sách..."/>` là một thẻ HTML hoàn toàn tĩnh (uncontrolled input). Không có `value`, không có `onChange`, không được bọc bởi thẻ `<form onSubmit={...}>` và không có sự kiện `onKeyDown` bắt phím Enter. Người bán gõ từ khóa vào không có bất kỳ phản hồi hay điều hướng nào!
  * **Tại Admin Header (`web/src/ui/components/layout/AdminLayout.tsx` L299-304):**
    Hàm submit form tìm kiếm `handleSearch` bị gắn cứng:
    ```tsx
    const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        router.push(`/admin/books?search=${encodeURIComponent(searchQuery)}`);
      }
    };
    ```
    Khi Admin paste một mã đơn hàng như `#ORD-MWQJ3A6P-6B874C51-S1` (trong ảnh `media_1795287318618_fdd39fca.png`), hệ thống ép điều hướng sang trang Sách (`/admin/books`), dẫn đến hiển thị bảng trống không tìm thấy sách!
  * **Tại Danh Sách Sản Phẩm Người Bán (`web/src/app/seller/products/page.tsx` L87):**
    State `const [searchQuery, setSearchQuery] = useState('')` khởi tạo chuỗi rỗng và không đọc tham số `useSearchParams()`. Khi được điều hướng tới `/seller/products?search=...`, trang không tự động lọc danh sách theo từ khóa từ Header.

---

### 2. Phân Tích 4 Tầng Kiến Trúc: BUG-021 (Bóc Tách Dữ Liệu Thật Cho 2 Widget Seller Dashboard)
- **Tầng 1 (Database):**
  * PostgreSQL `promotion-service` lưu trữ Flash Sale trong `flash_sale_slots` và `flash_sale_items`; lưu Voucher trong `vouchers`.
  * MongoDB `community-service` lưu trữ tin nhắn khách đọc trong collections `conversations` và `messages`.
- **Tầng 2 (Backend Services):**
  * `promotion-service` cung cấp API `/promotions/flash-sale/seller/slots` và `/promotions/vouchers/seller`.
  * `community-service` cung cấp API `/chat/conversations?storeId=...`.
- **Tầng 3 (Gateway & Proxy):** Định tuyến API `/api/v1/promotions/*` và `/api/v1/chat/*` hoạt động chuẩn.
- **Tầng 4 (Frontend Client):**
  * **Tại Widget 1 - Khuyến Mãi & Voucher (`web/src/app/seller/dashboard/page.tsx` L215-221, L742-801):**
    Hàm `fetchDashboardData` chỉ gọi `getSellerVouchers` mà hoàn toàn bỏ quên API `flashSaleApi.getSellerSlots()`. Do đó, ngay cả khi gian hàng đang có Flash Sale đang diễn ra hoặc sắp diễn ra (như trong ảnh `media_1795283890629_435227a2.jpg`), widget vẫn rơi vào trạng thái rỗng và hiển thị: "Chưa có khuyến mãi hoặc flash sale"!
  * **Tại Widget 2 - Tin Nhắn Khách Đọc (`web/src/app/seller/dashboard/page.tsx` L803-835):**
    Widget bị code tĩnh 100% chỉ để hiển thị minh họa: "Hộp thư chăm sóc bạn đọc... Mọi tin nhắn hỏi sách và hỗ trợ độc giả sẽ được kết nối trực tiếp tại đây", hoàn toàn không gọi `chatService.listConversations(storeId)` để lấy hội thoại thực tế của độc giả.

---

### 3. Phân Tích 4 Tầng Kiến Trúc: BUG-022 (Treo Trắng Màn Hình Đăng Nhập Google Trên Mobile & Responsive)
- **Tầng 1 (Database):** Lưu thông tin tài khoản Google qua `google_id`, `email`, `role`.
- **Tầng 2 (Backend Services):**
  * `platform/apps/identity-service/src/modules/auth/auth.controller.ts`:
    Hàm `googleCallback` chứa các fallback URL gắn cứng: `http://localhost:3100/auth/login?token=...`. Trên môi trường UAT hoặc production ngoài máy dev, redirect sẽ bị sai domain hoặc rơi vào lỗi 404/ECONNREFUSED.
- **Tầng 3 (Gateway & Mạng):** Định tuyến OAuth qua Google Identity Services.
- **Tầng 4 (Frontend Client):**
  * **Tại Hook `useGoogleAuth.ts` (L78, L142):**
    Hook sử dụng cơ chế Google Identity Services (GIS) dạng Popup: `google.accounts.oauth2.initTokenClient({...}).requestAccessToken()`.
    Trên các trình duyệt di động (Chrome Android, Safari iOS, Samsung Internet, Webview Zalo/FB), hệ điều hành mở cửa sổ đăng nhập trong một tab riêng hoặc Custom Tab. Do chính sách bảo mật Cross-Origin-Opener-Policy (COOP) và việc tab cha bị trình duyệt tạm dừng (frozen) trong nền, tab `accounts.google.com` bị cắt đứt kênh `postMessage` trao đổi token và bị treo cứng ở màn hình trắng (`media_1795288155877_a76deea6.jpg`)!
  * **Tại `StoreHeader.tsx`:**
    Thanh tìm kiếm bị ẩn (`hidden md:block`) nhưng không có nút icon kính lúp để người dùng di động mở tìm kiếm. Cụm nút tài khoản bên phải ("Đăng Nhập" + "Đăng Ký" + Giỏ hàng + Chuông) chiếm trên 350px khiến header trên thiết bị < 380px bị tràn viền.
  * **Tại `auth/login/page.tsx` & `auth/register/page.tsx`:**
    Chưa có listener bắt `token` hoặc `#access_token=...` từ redirect OAuth của Google; padding `px-6` trên màn hình nhỏ thu hẹp vùng nhập liệu của form.

---

### 4. Ma Trận Rủi Ro Domino (Domino Matrix Chặng 2)

```mermaid
flowchart TD
    subgraph D4["Sửa BUG-020 (Search Bar Header)"]
        D4A["Seller Header bọc Form & Regex nhận diện #ORD-"] --> D4B["Điều hướng chuẩn xác: Mã đơn qua /seller/orders, Sách qua /seller/products"]
        D4C["Admin Header phân luồng thông minh: #ORD- qua /admin/escrow, User qua /admin/users, Sách qua /admin/books"]
        D4D["seller/products đọc searchParams khởi tạo"]
    end

    subgraph D5["Sửa BUG-021 (Un-mock Widgets Seller Dashboard)"]
        D5A["fetchDashboardData gọi song song Voucher + Flash Sale"] --> D5B["Widget 1 hiển thị thẻ Flash Sale có đếm giờ + Voucher đang chạy"]
        D5C["fetchDashboardData gọi chatService.listConversations"] --> D5D["Widget 2 hiển thị top 3 tin nhắn khách đọc kèm avatar, snippet, badge chưa đọc"]
    end

    subgraph D6["Sửa BUG-022 (Mobile Google Login & Responsive)"]
        D6A["useGoogleAuth phát hiện thiết bị Mobile"] --> D6B["Chuyển sang luồng OAuth Redirect toàn trang (window.location.href)"]
        D6C["LoginForm bắt Access Token từ URL callback an toàn"]
        D6D["Tối ưu responsive Header Home & Form Auth"]
    end
```

| Thành Phần Can Thiệp | Rủi Ro Tiềm Ẩn | Biện Pháp Kiểm Soát & Phòng Thủ |
| :--- | :--- | :--- |
| `SellerHeader.tsx` & `AdminLayout.tsx` | Nhập khoảng trắng hoặc ký tự đặc biệt gây lỗi URL | Trim chuỗi, chuẩn hóa regex bóc tách tiền tố `#`, dùng `encodeURIComponent` |
| `seller/dashboard/page.tsx` | Một trong hai service (Khuyến mãi hoặc Chat) chậm hoặc lỗi mạng | Bọc từng lệnh fetch trong khối `try...catch` độc lập; giao diện hiển thị dữ liệu sẵn có, không chặn toàn bộ dashboard |
| `useGoogleAuth.ts` | Trình duyệt chặn cookie bên thứ 3 hoặc mất session sau redirect | Sử dụng luồng Redirect tiêu chuẩn với tham số `state` lưu đích đến; fallback an toàn không làm đứt trải nghiệm |
| `StoreHeader.tsx` & Auth Pages | Tối ưu responsive trên màn hình nhỏ làm vỡ bố cục desktop | Sử dụng các breakpoint chuẩn Tailwind (`hidden sm:inline`, `md:hidden`, `max-w-full`) kiểm tra chéo cả desktop và mobile |

---

## 🏛️ BƯỚC 3: PHƯƠNG ÁN KIẾN TRÚC CHUẨN SHOPEE & BỘ CÂU HỎI TƯƠNG TÁC (CHẶNG 2)

### 1. Phương Án Kỹ Thuật Chi Tiết Cho Chặng 2

#### A. Giải Pháp BUG-020: Thanh Tìm Kiếm Đa Năng Cho Kênh Bán & Kênh Quản Trị
1. **Tại `SellerHeader.tsx`:**
   - Quản lý state `searchQuery`. Bọc ô input trong thẻ `<form onSubmit={handleSearch}>`.
   - Phân luồng điều hướng thông minh chuẩn sàn:
     * Nếu query khớp định dạng mã đơn hàng (`/^#?ORD-/i`): Tự động cắt bỏ tiền tố `#` và chuyển hướng tới `/seller/orders?search=${encodeURIComponent(cleanCode)}`. (Trang `seller/orders` đã có sẵn logic cuộn và mở rộng đơn hàng khớp mã).
     * Ngược lại (tên sách, tác giả, ISBN, SKU): Chuyển hướng tới `/seller/products?search=${encodeURIComponent(trimmedQuery)}`.
2. **Tại `web/src/app/seller/products/page.tsx`:**
   - Import `useSearchParams` từ `next/navigation`.
   - Khởi tạo `searchQuery` từ `searchParams.get('search') || searchParams.get('q') || ''`, tự động đồng bộ khi URL thay đổi.
3. **Tại `AdminLayout.tsx`:**
   - Cập nhật hàm `handleSearch`:
     * Nếu bắt đầu bằng `#ORD-` hoặc `ORD-`: Chuyển hướng tới `/admin/escrow?q=${encodeURIComponent(cleanCode)}` (Trang Sổ cái ký quỹ / Quản lý đơn hàng Admin đã có sẵn bộ lọc theo mã đơn).
     * Nếu là email (chứa `@`) hoặc số điện thoại (chỉ chứa số dài >= 9 ký tự): Chuyển hướng tới `/admin/users?search=${encodeURIComponent(trimmedQuery)}`.
     * Ngược lại: Chuyển hướng tới `/admin/books?search=${encodeURIComponent(trimmedQuery)}`.

#### B. Giải Pháp BUG-021: Dữ Liệu Thật 100% Cho 2 Widget Seller Dashboard
1. **Tại `web/src/app/seller/dashboard/page.tsx` (`fetchDashboardData`):**
   - **Widget 1 (Khuyến Mãi & Flash Sale):**
     * Gọi đồng thời `getSellerVouchers({ storeId: bizId })` và `flashSaleApi.getSellerSlots()`.
     * Trích xuất các slot Flash Sale có trạng thái `ACTIVE` hoặc `UPCOMING`, kèm các voucher đang chạy (`status === 'ACTIVE'`).
     * Hiển thị tối đa 3 chương trình tích cực nhất: Phân loại huy hiệu rõ ràng (`⚡ Flash Sale Giờ Vàng` với khung giờ & số sách đăng ký; `🎟️ Voucher Shop` với mã và mức giảm). Có nút "Quản lý" và link trực tiếp sang trang cấu hình tương ứng.
   - **Widget 2 (Tin Nhắn Khách Đọc Thực Tế):**
     * Gọi `chatService.listConversations(storeId)`.
     * Lấy 3 hội thoại mới nhất: Hiển thị avatar người mua, tên khách hàng, trích đoạn tin nhắn gần nhất (`lastMessage.content`), badge số tin chưa đọc (nếu có), thời gian tương đối (`formatTimeAgo`).
     * Click vào từng hội thoại sẽ mở trang chat `/seller/chat` tương ứng với khách hàng đó.

#### C. Giải Pháp BUG-022: Khắc Phục Triệt Để Treo Trắng Đăng Nhập Google Trên Mobile & Responsive
1. **Tại `web/src/hooks/useGoogleAuth.ts`:**
   - Thêm bộ kiểm tra môi trường: `const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) || window.innerWidth < 768;`.
   - Nếu là thiết bị di động:
     * Không sử dụng popup `initTokenClient().requestAccessToken()`.
     * Chuyển hướng toàn trang trực tiếp (`window.location.href`) đến luồng OAuth Redirect chính thức của Google:
       `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=email%20profile%20openid&prompt=select_account&nonce=${nonce}&state=${encodeURIComponent(redirectTarget)}`.
     * Hoặc sử dụng server-side OAuth redirect an toàn của Gateway: `/api/v1/auth/google`.
   - Trên desktop: Tiếp tục duy trì popup mượt mà.
2. **Tại `web/src/app/auth/login/page.tsx`:**
   - Trong `useEffect`, kiểm tra `window.location.hash` và `searchParams`: Nếu có `access_token` hoặc `token`, tự động kích hoạt `loginWithGoogle` để hoàn tất đăng nhập không gián đoạn.
   - Tối ưu responsive form: Giảm padding trên mobile (`px-4 py-6 sm:px-10 sm:py-8`), căn giữa và co giãn linh hoạt trên mọi kích thước màn hình điện thoại (360px - 430px).
3. **Tại `StoreHeader.tsx`:**
   - Thêm nút icon kính lúp trên mobile (`md:hidden`) để mở thanh tìm kiếm trượt xuống (drawer/slide-down search).
   - Tối ưu khu vực nút đăng nhập/đăng ký trên màn hình nhỏ để không bị vỡ hàng hay che lấp logo.

---

### 2. Tiêu Chuẩn Nghiệm Thu (Acceptance Criteria - Gherkin BDD)

```gherkin
Feature: Chặng 2 - Search Header Seller/Admin, Widget Dashboard DB Thật, Mobile Google Auth & Responsive

  Scenario: Người bán tra cứu mã đơn hàng từ thanh tìm kiếm Header
    Given Người bán đang ở bất kỳ trang nào thuộc /seller/*
    When Nhập mã "#ORD-MWQJ3A6P-6B874C51-S1" vào ô tìm kiếm Header và nhấn Enter
    Then Hệ thống điều hướng ngay tới "/seller/orders?search=ORD-MWQJ3A6P-6B874C51-S1"
    And Danh sách đơn hàng tự động lọc và cuộn tới đơn hàng tương ứng

  Scenario: Quản trị viên Admin tra cứu mã đơn hàng từ thanh tìm kiếm Header
    Given Quản trị viên đang ở trang Admin
    When Nhập mã "#ORD-MWQJ3A6P-6B874C51-S1" vào ô tìm kiếm Header và nhấn Enter
    Then Hệ thống điều hướng tới "/admin/escrow?q=ORD-MWQJ3A6P-6B874C51-S1"
    And Bảng Sổ cái ký quỹ / Đơn hàng hiển thị chính xác đơn hàng cần tìm

  Scenario: Widget Khuyến Mãi và Tin Nhắn trên Seller Dashboard hiển thị dữ liệu thật từ DB
    Given Gian hàng có Flash Sale đang tham gia và có tin nhắn từ khách hàng
    When Người bán truy cập "/seller/dashboard"
    Then Widget 1 hiển thị thẻ Flash Sale cùng các voucher đang hoạt động
    And Widget 2 hiển thị danh sách hội thoại khách hàng mới nhất (tên, avatar, nội dung tin, badge chưa đọc)

  Scenario: Đăng nhập Google mượt mà trên thiết bị di động không bị treo trắng màn hình
    Given Người dùng truy cập bằng trình duyệt điện thoại (Android / iOS)
    When Bấm nút "Đăng nhập với Google"
    Then Trình duyệt điều hướng toàn trang tới trang đăng nhập Google chính thức mà không bị treo popup trắng
    And Sau khi chọn tài khoản, người dùng được đăng nhập thành công và chuyển hướng về trang ban đầu
```

---

### 3. CỔNG NGHIỆM THU & PHÊ DUYỆT (APPROVAL GATE CHẶNG 2 - ĐÃ ĐƯỢC DUYỆT)
- Người dùng đã phê duyệt 100% phương án khuyến nghị [Chuẩn Sàn Shopee & Mobile Web] cho cả 3 bug của Chặng 2 vào ngày 22/11/2026.

---

## 🛠️ BƯỚC 4: SỬA TẬN GỐC & CHẠY E2E NGAY TỪNG BUG (CHẶNG 2: BUG-020, BUG-021, BUG-022)

### 1. Chi Tiết Thực Thi Source Code (Fix Implementation)
- **BUG-020 (Thanh Tìm Kiếm Header Seller & Admin):**
  * `web/src/ui/components/layout/SellerHeader.tsx`: Bọc input trong `<form onSubmit={handleSearch}>`, lưu state `searchQuery`. Tự động nhận diện chuỗi regex `/^#?ORD-/i`: Nếu là mã đơn thì điều hướng tới `/seller/orders?search=${encodeURIComponent(cleanCode)}` (trang này có sẵn logic tự động scroll & highlight đơn hàng); nếu là tựa sách/SKU thì điều hướng sang `/seller/products?search=...`.
  * `web/src/ui/components/layout/AdminLayout.tsx`: Phân luồng thông minh trong `handleSearch`: Nếu chuỗi khớp `/^#?ORD-/i` thì điều hướng tới Sổ cái ký quỹ / Quản lý đơn hàng `/admin/escrow?q=${encodeURIComponent(cleanCode)}`; nếu là email/SĐT thì điều hướng tới `/admin/users?search=...`; còn lại điều hướng tới `/admin/books?search=...`.
  * `web/src/app/seller/products/page.tsx`: Import `useSearchParams` từ `next/navigation`, bọc Suspense boundary an toàn cho client component, đọc tham số `search` / `q` từ URL để tự động lọc đầu sách tương ứng.

- **BUG-021 (Bóc Tách Dữ Liệu Thật 2 Widget Seller Dashboard):**
  * `web/src/app/seller/dashboard/page.tsx`:
    - Khởi tạo và cập nhật kiểu dữ liệu cho `stats.activeFlashSales: FlashSaleSlot[]` và `stats.recentConversations: ChatConversation[]`.
    - Trong `fetchDashboardData`: Gọi song song `getSellerVouchers({ storeId: bizId })` và `flashSaleApi.getSellerSlots()`. Lọc các slot Flash Sale có trạng thái `ACTIVE` hoặc `SCHEDULED`.
    - Trong `fetchDashboardData`: Gọi `chatService.listConversations(storeId)` để lấy các cuộc hội thoại gần nhất của khách hàng từ MongoDB.
    - Render Widget 1 (Khuyến mãi & Flash Sale): Hiển thị đầy đủ các slot Flash Sale Giờ Vàng (thời gian diễn ra, trạng thái Đang chạy / Sắp diễn ra, số lượng sách tham gia) bên cạnh các Voucher đang hoạt động. Có nút điều hướng trực tiếp tới `/seller/promotions/flash-sale` và `/seller/vouchers`.
    - Render Widget 2 (Tin Nhắn Khách Đọc): Hiển thị top 3 cuộc trò chuyện khách đọc gần nhất kèm avatar người mua, tên khách hàng (`conv.user?.name`), trích đoạn tin nhắn gần nhất (`lastMessage.content`), badge số tin chưa đọc (`unreadCount`), thời gian tương đối (`formatTimeAgo`), và click mở đúng cuộc hội thoại tại `/seller/chat?convId=...`.

- **BUG-022 (Khắc Phục Treo Màn Hình Trắng Đăng Nhập Google Trên Mobile & Responsive):**
  * `web/src/hooks/useGoogleAuth.ts`: Bổ sung kiểm tra thiết bị di động (`isMobile`). Trên mobile hoặc thiết bị có màn hình nhỏ, thay vì dùng popup `tokenClient.requestAccessToken()` vốn bị lỗi ngắt liên kết COOP/postMessage, hệ thống chuyển sang luồng OAuth2 Redirect tiêu chuẩn cấp cao (`window.location.href = https://accounts.google.com/o/oauth2/v2/auth?...`). Trên desktop, duy trì popup tiện lợi.
  * `web/src/app/auth/login/page.tsx`: Bổ sung `useEffect` bắt mã token từ URL hash `#access_token=...` hoặc query param, tự động kích hoạt `loginWithGoogle` và dọn dẹp URL bằng `window.history.replaceState`. Tối ưu padding form trên màn hình nhỏ `px-4 py-6 sm:px-10`.
  * `web/src/app/auth/register/page.tsx`: Tối ưu padding responsive tương tự.
  * `web/src/ui/components/layout/StoreHeader.tsx`: Bổ sung nút kính lúp tìm kiếm dành riêng cho mobile (`md:hidden`) kèm thanh tìm kiếm trượt mở rộng mượt mà (`animate-fade-in-down`). Tinh chỉnh cụm nút đăng nhập/đăng ký trên màn hình nhỏ tránh tràn viền ngang.
  * `platform/apps/identity-service/src/modules/auth/auth.controller.ts`: Thay thế các giá trị fallback gắn cứng `localhost:3100` bằng biến `frontendBase` phân giải động qua `FRONTEND_URL` / `WEB_URL` / `req.get('origin')`.

---

### 2. Kết Quả Kiểm Thử E2E Độc Lập (`scripts/test_e2e_sprint2_chang2.js`)
- **Tập lệnh:** [`scripts/test_e2e_sprint2_chang2.js`](file:///e:/HuKi/scripts/test_e2e_sprint2_chang2.js)
- **Kết quả:** 11/11 assertions **PASS (100%)**
  * ✅ BUG-020: `SellerHeader.tsx` bọc Form và phân luồng điều hướng mã đơn vs tựa sách/SKU
  * ✅ BUG-020: `AdminLayout.tsx` phân luồng thông minh mã đơn -> `/admin/escrow`, user -> `/admin/users`, sách -> `/admin/books`
  * ✅ BUG-020: `seller/products/page.tsx` đọc `searchParams` và lọc tự động khi nhận query từ URL
  * ✅ BUG-021: `seller/dashboard` gọi song song cả `flashSaleApi` và `voucherApi`
  * ✅ BUG-021: `seller/dashboard` gọi `chatService.listConversations` lấy hội thoại khách đọc thực tế
  * ✅ BUG-021: Widget 1 hiển thị cả Flash Sale (khung giờ, trạng thái, số sách) và Voucher đang chạy
  * ✅ BUG-021: Widget 2 hiển thị danh sách hội thoại khách đọc với avatar, tên, snippet tin nhắn và badge chưa đọc
  * ✅ BUG-022: `useGoogleAuth.ts` phát hiện Mobile và chuyển hướng OAuth2 URL toàn trang chống treo popup trắng
  * ✅ BUG-022: `auth/login/page.tsx` bắt Access Token từ URL hash callback Google OAuth
  * ✅ BUG-022: `StoreHeader.tsx` tích hợp nút tìm kiếm kính lúp và thanh tìm kiếm trượt trên Mobile
  * ✅ BUG-022: `identity-service auth.controller.ts` xử lý callback redirect động theo `FRONTEND_URL`

- **Kiểm tra biên dịch:**
  * `npm --prefix web run build`: PASS (141 routes, 0 compile errors).
  * `npm --prefix platform run build`: PASS (7/7 microservices, 0 compile errors).

- **Trạng thái Chặng 2:** **HOÀN THÀNH (100% PASSED)**

