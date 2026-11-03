# Danh sách lỗi cần xử lý (Bug Tracking)

> **Quy tắc làm việc:**
> 1. Ghi nhận và phân loại toàn bộ lỗi được người dùng liệt kê vào file này.
> 2. **Tuyệt đối không tự ý fix trước.**
> 3. Chỉ khi người dùng nhắc/ghim file này và yêu cầu làm -> Hỏi lại xác nhận: *"Bạn có chắc chắn muốn tiến hành fix các lỗi này không?"*
> 4. Chỉ bắt đầu thực hiện sau khi người dùng xác nhận chắc chắn.

---

## 1. Danh sách lỗi đã ghi nhận

### [BUG-001] Thiếu file ảnh placeholder `/images/book-placeholder.png` gây vòng lặp vô hạn spam 404
- **Mô tả & Nguyên nhân:**
  - Ở `web/src/app/page.tsx` và `web/src/app/book/[id]/page.tsx` bắt sự kiện `onError` gán fallback `src = '/images/book-placeholder.png'`.
  - Do thư mục `web/public/images/` chưa có file `book-placeholder.png`, dẫn đến HTTP 404.
  - Khi fallback bị 404, trình duyệt tiếp tục bắn sự kiện `onError` lặp đi lặp lại tạo thành vòng lặp vô hạn spam request 404 liên tục mỗi mili-giây.
- **Vị trí ảnh hưởng:**
  - `web/src/app/page.tsx`
  - `web/src/app/book/[id]/page.tsx`
  - `web/src/ui/components/sections/FlashSaleSection.tsx`
  - `web/src/app/seller/affiliate/page.tsx`
  - `web/src/app/seller/products/page.tsx`
  - `web/public/images/book-placeholder.png`
  - `web/public/banners/book-placeholder.jpg`
- **Kết quả xử lý:**
  1. Tạo thư mục `web/public/images/` và sinh file ảnh bìa sách chuẩn `book-placeholder.png` (và `banners/book-placeholder.jpg`).
  2. Bổ sung `target.onerror = null;` tại tất cả các khối `onError` để triệt tiêu vĩnh viễn vòng lặp vô tận ngay cả trong trường hợp mất mạng.
  3. Cập nhật `.gitignore` để source control theo dõi thư mục `web/public/images/`.
- **Trạng thái:** [x] Đã hoàn thành (Resolved).

---

### [BUG-002] Lệch cấu hình RabbitMQ EventBus, CORS và Public URL giữa UAT và Production
- **Mô tả & Nguyên nhân:**
  - **RabbitMQ:** Toàn bộ Event Bus và Outbox Publisher trong `@huki/shared` đọc biến `RABBITMQ_URL`. Trong `docker-compose.prod.yml`, tất cả các microservices (`identity`, `business`, `commerce`, `shipping`, `community`, `promotion`) đều thiếu biến này, khiến code fallback về `localhost:5672` bên trong container $\rightarrow$ Toàn bộ message queue, bắn sự kiện đơn hàng, outbox sync và notifications trên Production sẽ bị đứt kết nối (Connection Refused).
  - Tương tự, ở `docker-compose.uat.yml`, 3 services (`business`, `community`, `promotion`) cũng thiếu `RABBITMQ_URL`.
  - **CORS & Gateway URL ở Prod:** `CORS_ORIGIN` ở `api-gateway` và `NEXT_PUBLIC_GATEWAY_URL` ở `web` mặc định fallback về `localhost:3100` và `http://api-gateway:3000`. Khi deploy lên domain production (`https://hukiebook.duckdns.org`), trình duyệt người dùng từ bên ngoài sẽ bị CORS Blocked hoặc gọi API vào domain ảo của Docker.
- **Vị trí ảnh hưởng:**
  - `docker-compose.prod.yml`
  - `docker-compose.uat.yml`
- **Kết quả xử lý:**
  1. Đã đồng bộ `RABBITMQ_URL: amqp://${RABBITMQ_USER:-guest}:${RABBITMQ_PASS:-guest123}@rabbitmq:5672` cho tất cả microservices trong cả `docker-compose.prod.yml` và `docker-compose.uat.yml`.
  2. Bổ sung `depends_on: rabbitmq: condition: service_healthy` để đảm bảo thứ tự khởi động chuẩn.
  3. Bổ sung `REDIS_HOST` và `REDIS_PORT` cho `community-service` trên Prod.
  4. Cấu hình fallback an toàn cho Prod: `CORS_ORIGIN` cho phép cả domain production và localhost, `NEXT_PUBLIC_GATEWAY_URL` và `NEXT_PUBLIC_SITE_URL` fallback về `https://hukiebook.duckdns.org`.
  5. Đã validate cú pháp bằng `docker compose config --quiet` (exit code 0).
- **Trạng thái:** [x] Đã hoàn thành (Resolved).

---

## 2. Trạng thái thực hiện
- [x] Xác nhận yêu cầu từ người dùng
- [x] Tiến hành xử lý
- [x] Kiểm thử & Hoàn thành
