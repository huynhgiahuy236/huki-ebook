# BÁO CÁO KHẢO SÁT TOÀN DIỆN 6 TRỤC (6-AXIS AUDIT)
## TIER 3 & TIER 4: COMMUNITY-SERVICE, ANALYTICS-SERVICE & WEB FRONTEND

---

## 1. TỔNG QUAN PHẠM VI KHẢO SÁT
Báo cáo này hoàn tất chuỗi khảo sát chuyên sâu cấp kiến trúc và mã nguồn cho 3 mắt xích cuối cùng trong hệ thống HuKi Ebook:
1. **`community-service` (Tier 3 - Port 3005)**: WebSocket Chat (`Socket.IO`), Thông báo đẩy (`Firebase Cloud Messaging`), Đánh giá & nhận xét sách (`Verified Purchase`), Trợ lý thông minh HUKI AI (`Google Gemini RAG`).
2. **`analytics-service` (Tier 3 - Port 3008)**: Thu thập sự kiện Telemetry (`/api/v1/events`), Job tổng hợp doanh thu ngày (`DailyRollupJob`) theo múi giờ `Asia/Ho_Chi_Minh` (UTC+7), Job cập nhật độ tương đồng người dùng (`RecalculateAffinityJob`).
3. **`web` (Tier 4 - Port 3100)**: Frontend Next.js 16 + React 19 App Router. Cơ chế Silent Token Refresh trong `apiClient.ts`, an toàn Hydration SSR/Client, và bảo mật biến môi trường (Zero Secret Leakage sang Client Bundle).

---

## 2. MA TRẬN KHẢO SÁT 6 TRỤC CHI TIẾT

### TRỤC 1: XÁC THỰC, PHÂN QUYỀN & BẢO VỆ DỮ LIỆU ĐÁNH GIÁ (COMMUNITY-SERVICE)
- **Tệp rà soát**: `platform/apps/community-service/src/modules/reviews/review-verification.service.ts`, `reviews.service.ts`
- **Hiện trạng & Lỗ hổng**:
  + Tại `review-verification.service.ts` hàm `bookPurchase()`:
    ```typescript
    const isDone = (status: string) => {
      const s = String(status || "").toUpperCase();
      return (
        s === "COMPLETED" ||
        s === "DELIVERED" ||
        s === "PROCESSING" ||
        s === "CONFIRMED" ||
        s === "PAID" ||
        s === "SHIPPED" ||
        s === "SUCCESS"
      );
    };
    ```
    Hàm `isDone` chấp nhận cả các trạng thái đơn `PROCESSING`, `CONFIRMED`, `PAID`, `SHIPPED`. Điều này dẫn tới việc người mua vừa mới thanh toán hoặc đơn hàng vừa được người bán xác nhận đóng gói (chưa hề giao đến tay khách hàng) đã có thể đăng bài đánh giá review sách!
  + Vi phạm nguyên tắc **Verified Purchase**: Chỉ những đơn hàng đã hoàn tất giao (`DELIVERED` hoặc `COMPLETED`) mới đủ điều kiện đánh giá trải nghiệm sản phẩm.
- **Giải pháp**:
  + Chuẩn hóa hàm `isDone(status)` chỉ chấp nhận `COMPLETED`, `DELIVERED`, và `SUCCESS`.
  + Nếu đơn hàng chưa ở trạng thái `DELIVERED`/`COMPLETED` hoặc người dùng chưa từng mua cuốn sách, từ chối tạo đánh giá với lỗi chuẩn `REVIEW_PURCHASE_REQUIRED` (HTTP 400/403).

---

### TRỤC 2: WEBSOCKET CHAT LIFECYCLE & HẠN MỨC TRỢ LÝ AI (COMMUNITY-SERVICE)
- **Tệp rà soát**: `platform/apps/community-service/src/modules/chat/chat.gateway.ts`, `ai-chat.service.ts`, `ai-chat.controller.ts`
- **Hiện trạng**:
  + **WebSocket Gateway**: `ChatGateway` lắng nghe kết nối namespace `/chat`, xác thực Bearer JWT token khi handshake, tham gia phòng `userRoom(actor.sub)`. Khi ngắt kết nối (`handleDisconnect`), gateway kiểm tra socket còn lại qua `fetchSockets()` và phát sự kiện `user:offline` nếu không còn client active nào, giải phóng tài nguyên room sạch sẽ.
  + **AiChatController**: Đã áp dụng `ThrottlerGuard` với `@Throttle({ default: { limit: 30, ttl: 60_000 } })` ngăn chặn spam gọi trợ lý AI.
  + **AiChatService (Google Gemini RAG)**:
    + Gọi API `https://generativelanguage.googleapis.com/v1beta/models/...:generateContent` thiếu `signal: AbortSignal.timeout(8000)`. Khi mạng quốc tế nghẽn hoặc Gemini phản hồi chậm, request có thể bị treo vô hạn làm cạn kiệt connection pool.
    + Khi không cấu hình `GEMINI_API_KEY` hoặc khi gọi Google Gemini gặp lỗi/timeout, dịch vụ tự động fallback sang `generateSmartLocalResponseWithContext()` phân tích intent và gợi ý sách từ cơ sở dữ liệu local một cách mượt mà không làm gián đoạn người dùng.
- **Giải pháp**:
  + Bổ sung timeout kiểm soát `AbortSignal.timeout(Number(process.env.GEMINI_TIMEOUT_MS || 8000))` cho mọi fetch call gửi tới Google Gemini.

---

### TRỤC 3: MÚI GIỜ & BIÊN ĐỘ TÍNH DOANH THU NGÀY (ANALYTICS-SERVICE)
- **Tệp rà soát**: `platform/apps/analytics-service/src/jobs/DailyRollupJob.ts`, `DailyRollupService.ts`
- **Hiện trạng & Phân tích múi giờ**:
  + Việt Nam nằm ở múi giờ Đông Dương (ICT = UTC+7, `Asia/Ho_Chi_Minh`).
  + Tại `DailyRollupService.ts`:
    ```typescript
    private getDateWindow(dateStr: string): { start: Date; end: Date; businessDate: Date } {
      const [year, month, day] = dateStr.split('-').map(Number);
      const start = new Date(Date.UTC(year, month - 1, day, 0 - 7, 0, 0, 0));
      const end = new Date(Date.UTC(year, month - 1, day, 23 - 7, 59, 59, 999));
      const businessDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      return { start, end, businessDate };
    }
    ```
    Khoảng thời gian cho ngày `YYYY-MM-DD` tại ICT:
    - Bắt đầu lúc `00:00:00 ICT` (tương ứng `17:00:00 UTC` ngày hôm trước).
    - Kết thúc lúc `23:59:59.999 ICT` (tương ứng `16:59:59.999 UTC` ngày hôm đó).
  + Kiểm thử biên múi giờ:
    - Một sự kiện xảy ra lúc `23:59:59 ICT` ngày D rơi vào `16:59:59 UTC` ngày D -> thuộc đúng cửa sổ ngày D.
    - Một sự kiện xảy ra lúc `00:00:01 ICT` ngày D+1 rơi vào `17:00:01 UTC` ngày D -> thuộc đúng cửa sổ ngày D+1.
  + Tại `DailyRollupJob.ts`:
    Cron chạy lúc `05 0 * * *` (00:05 mỗi ngày theo múi giờ `Asia/Ho_Chi_Minh`).
    Hàm `getPreviousBusinessDate()` cộng 7 giờ rồi trừ 1 ngày calendar:
    Khi chạy lúc `00:05 ICT` ngày D+1, hàm trả về đúng chuỗi ngày `D` đã kết thúc.
- **Đánh giá**: Logic tính toán múi giờ hoàn toàn chính xác và bảo toàn tính nhất quán tài chính cho các báo cáo GMV và telemetry.

---

### TRỤC 4: TỰ ĐỘNG LÀM MỚI TOKEN (SILENT TOKEN REFRESH) & CHỐNG RACE CONDITION (WEB)
- **Tệp rà soát**: `web/src/ui/api/apiClient.ts`, `tokenStorage.ts`
- **Hiện trạng & Rủi ro**:
  + `apiClient.ts` quản lý `refreshPromise` duy nhất để gộp các request bị 401 đồng thời.
  + Tuy nhiên, khi nhiều request gửi đi cùng lúc với token cũ:
    Nếu request 1 nhận 401 và làm mới token thành công, `refreshPromise` hoàn thành và được gán lại `null`.
    Request 2 (hoặc request 3) hoàn tất trễ hơn một chút và nhận 401 từ server đối với token cũ lúc ban đầu. Lúc này `refreshPromise === null`, request 2 kiểm tra `hadToken` và có thể kích hoạt lần refresh thứ 2 không cần thiết, gây lãng phí tài nguyên hoặc lỗi refresh token đơn lượt.
- **Giải pháp**:
  + Bổ sung kiểm tra trước khi tạo `refreshPromise`: Nếu token hiện tại trong `tokenStorage.getAccessToken()` đã khác với token đã gửi trong request bị 401, request lập tức sử dụng token mới để retry mà không gọi lại `/auth/refresh`.
  + Đảm bảo cơ chế hàng đợi xử lý trơn tru, không gây reload trang hoặc vòng lặp redirect vô tận.

---

### TRỤC 5: PHÒNG NGỪA LỖI HYDRATION TRÊN NEXT.JS 16 & REACT 19 (WEB)
- **Tệp rà soát**: `web/src/app/layout.tsx`, `web/src/app/page.tsx`
- **Hiện trạng & Điểm nhạy cảm**:
  + `web/src/app/layout.tsx` đã thiết lập `suppressHydrationWarning` trên các thẻ `<html>` và `<body>`.
  + Tại `web/src/app/page.tsx`:
    - Dòng 418: `new Date(v.expiresAt).toLocaleDateString('vi-VN')`
    - Dòng 1613: `new Date(rev.createdAt).toLocaleDateString('vi-VN')`
    Định dạng ngày theo locale của máy chủ Node.js (mặc định có thể là UTC hoặc định dạng hệ điều hành máy chủ khác máy khách) có nguy cơ gây lỗi không đồng nhất HTML giữa Server Side Rendering và Client Rehydration (React Error #418).
- **Giải pháp**:
  + Bổ sung thuộc tính `suppressHydrationWarning` trên các thẻ `<span>` bọc các đoạn text hiển thị ngày tháng động.
  + Đảm bảo toàn bộ việc đọc `localStorage` hoặc `window` chỉ được thực thi bên trong `useEffect` (đã tuân thủ chuẩn xác).

---

### TRỤC 6: RÀ SOÁT RÒ RỈ BIẾN MÔI TRƯỜNG & SECRET SANITIZATION (WEB)
- **Tệp rà soát**: `web/.env*`, `web/src/**/*`
- **Kết quả khảo sát**:
  + Toàn bộ các biến môi trường có tiền tố `NEXT_PUBLIC_` chỉ bao gồm các đường dẫn công khai:
    - `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1`
    - `NEXT_PUBLIC_GATEWAY_URL=http://localhost:3000`
    - `NEXT_PUBLIC_SITE_URL=http://localhost:3100`
    - `NEXT_PUBLIC_SOCKET_URL=http://localhost:3005`
    - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
  + Hoàn toàn **KHÔNG CÓ** bất kỳ thông tin nhạy cảm nào bị phơi bày:
    - Không có `INTERNAL_SERVICE_KEY`.
    - Không có `PAYOS_CHECKSUM_KEY`.
    - Không có `DATABASE_URL` hay mật khẩu cơ sở dữ liệu.
    - Không có private IP hay credentials quản trị.
  + Đạt chuẩn an toàn bảo mật 100% cho client bundle.

---

## 3. KẾT LUẬN & ĐỊNH HƯỚNG BƯỚC TIẾP THEO
1. Sửa mã nguồn tại `review-verification.service.ts` để chặn triệt để review sách chưa được giao (`DELIVERED`/`COMPLETED`).
2. Tối ưu hóa `signal: AbortSignal.timeout(...)` trong `ai-chat.service.ts`.
3. Hoàn thiện cơ chế chống refresh trùng lặp trong `apiClient.ts` và gán `suppressHydrationWarning` tại `page.tsx`.
4. Soạn thảo và thực thi 4 kịch bản kiểm thử độc lập tại `scriptstest/audit/tier3-tier4-convergence/`.
