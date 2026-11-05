# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Cộng Đồng, Chat Trực Tuyến & Trợ Lý Bé Cáo AI

> **Mã phân hệ:** `BUG-GROUP-06`  
> **Đối tượng người dùng:** Độc giả tham gia diễn đàn sách, Khách hàng chat tư vấn với Shop, Người dùng tương tác với Trợ lý AI Bé Cáo.  
> **Phạm vi kiểm thử:** Toàn bộ màn hình và widget tương tác thời gian thực (`/messages`, `/seller/chat`, `/community`, widget Bé Cáo AI toàn sàn), bao gồm gửi tin nhắn, đính kèm sách, chia sẻ đơn hàng lên bảng tin, bình luận bài viết và hỏi đáp gợi ý sách thông minh qua Gemini API.  
> **Nguyên tắc kỹ thuật:** Kết nối WebSocket ổn định không ngắt quãng, xử lý streaming mượt mà, loại bỏ triệt để mock data, đưa ra 1 giải pháp kỹ thuật duy nhất.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (COMMUNITY, CHAT & AI)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **CA-001** | Toàn bộ màn hình Chat (`/messages`, `/seller/chat`) | Nút **"Gửi Tin Nhắn"** (`send`) | Realtime / Socket | **P0 (Blocker)** | ✅ **PASS** (Đã đồng bộ socketUrl động theo hostname & UAT gateway) |
| **CA-002** | Widget Bé Cáo AI (Toàn sàn) | Nút **"Gửi Câu Hỏi Cho Bé Cáo"** | Trí Tuệ Nhân Tạo / API | **P1 (Critical)** | ✅ **PASS** (Đã thêm AbortController 15s timeout & nút dừng phản hồi) |
| **CA-003** | Bảng tin cộng đồng (`/community`) | Nút **"Đăng Lên Bảng Tin Huki"** (Từ Order Success) | Tương Tác / Feed | **P1 (Critical)** | ✅ **PASS** (Đã tạo trang `/community` & đồng bộ query params chia sẻ đơn) |
| **CA-004** | Diễn đàn sách (`/community`) | Nút **"Bình Luận"** trên bài viết | Form / UI | **P2 (Major)** | ✅ **PASS** (Chặn gửi comment rỗng, loại bỏ nhấp nháy form) |
| **CA-005** | Khung chat người bán (`/seller/chat`) | Nút **"Đính Kèm Sách Tư Vấn"** | UI / Modal | **P1 (Critical)** | ✅ **PASS** (Xây dựng `ChatBookPickerModal` với debounce tìm kiếm & phân trang) |
| **CA-006** | Widget Bé Cáo AI (Toàn sàn) | Các thẻ **"Gợi Ý Sách Thông Minh"** | Dữ Liệu / Link | **P1 (Critical)** | ✅ **PASS** (Sửa bóc tách payload `json.data.items` từ catalog service) |

---

## CHI TIẾT KỸ THUẬT TỪNG LỖI CỤ THỂ

---

### [CA-001] Nút "Gửi Tin Nhắn" Thất Bại Ngầm Do Lệch Cấu Hình Cổng WebSocket
- **Vị trí chính xác:**
  - Màn hình: Tin nhắn khách hàng (`/messages`) và Kênh chat người bán (`/seller/chat`)
  - File mã nguồn: [web/src/ui/hooks/useChatSocket.ts](file:///e:/HuKi/web/src/ui/hooks/useChatSocket.ts), [web/src/ui/hooks/useRealtimeNotifications.ts](file:///e:/HuKi/web/src/ui/hooks/useRealtimeNotifications.ts)
- **Nút bấm / Thao tác:**
  - Nút: Icon mũi tên gửi tin nhắn `send` bên cạnh ô nhập nội dung chat.
- **Hiện tượng lỗi ban đầu:**
  - Người mua gõ tin nhắn hỏi shop về tình trạng sách và bấm nút gửi: Tin nhắn hiện trên màn hình của người gửi (Optimistic UI), nhưng người bán hoàn toàn không nhận được tin nhắn. Khi người gửi tải lại trang (F5), toàn bộ tin nhắn vừa gửi biến mất hoàn toàn. Console báo lỗi: `WebSocket connection to 'ws://localhost:3000/socket.io/' failed`.
- **Nguyên nhân gốc rễ:**
  - Biến môi trường `NEXT_PUBLIC_SOCKET_URL` trỏ về API Gateway cổng 3000 hoặc hardcode localhost khi chạy trên domain deploy UAT/Production. Gateway HTTP không forward trực tiếp socket handshake nếu không qua đường dẫn định tuyến, gây đứt kết nối ngầm.
- **Giải pháp dứt khoát đã triển khai:**
  - Bổ sung cơ chế phân giải URL động trong `useChatSocket.ts` và `useRealtimeNotifications.ts`:
    - Nếu chạy trên browser với domain khác localhost (UAT/Production), tự động chuyển socket URL thành `window.location.origin` (qua Nginx reverse proxy định tuyến `/socket.io`).
    - Fallback chuẩn về `http://localhost:3005` (cổng trực tiếp của `community-service` microservice khi chạy dev local).

---

### [CA-002] Nút Gửi Câu Hỏi Cho Bé Cáo AI Bị Đóng Băng Khi Gemini API Quá Tải
- **Vị trí chính xác:**
  - Thành phần: Widget trợ lý AI Bé Cáo nổi góc phải dưới toàn sàn.
  - File mã nguồn: [web/src/ui/components/ai/FloatingAIChatbox.tsx](file:///e:/HuKi/web/src/ui/components/ai/FloatingAIChatbox.tsx)
- **Nút bấm / Thao tác:**
  - Nút: Icon `send` gửi câu hỏi tư vấn sách cho Bé Cáo AI.
- **Hiện tượng lỗi ban đầu:**
  - Khi người dùng gửi câu hỏi phức tạp hoặc khi mạng chập chờn, nút chuyển sang trạng thái loading chấm ba chấm nhưng không bao giờ hoàn tất, không thể gõ câu hỏi mới, không có nút hủy bỏ (Cancel/Abort request). Khung chat bị khóa vĩnh viễn cho đến khi người dùng phải F5 trang web.
- **Nguyên nhân gốc rễ:**
  - Hàm `fetch` gọi endpoint `/api/v1/ai/chat` không sử dụng `AbortController` và không thiết lập `timeout`. Khi backend upstream gặp timeout từ Google Gemini API, kết nối HTTP bị treo lơ lửng.
- **Giải pháp dứt khoát đã triển khai:**
  - Tích hợp `AbortController` với thời gian chờ tối đa 15 giây qua `setTimeout`.
  - Hiển thị nút **"Dừng phản hồi"** (`stop`) màu đỏ nổi bật khi `isLoading === true` cho phép người dùng chủ động ngắt truy vấn bất cứ lúc nào.
  - Bắt lỗi `AbortError` và hiển thị phản hồi thân thiện: *"Bé Cáo đang bị quá tải suy nghĩ một chút, bạn bấm thử lại nhé! 🦊"*, đồng thời tự động mở khóa ô nhập liệu.

---

### [CA-003] Nút "Đăng Lên Bảng Tin Huki" Từ Màn Hình Order Success Bị 404
- **Vị trí chính xác:**
  - Màn hình: Đặt hàng thành công (`/order-success`) và Bảng tin cộng đồng (`/community`)
  - File mã nguồn: [web/src/app/order-success/page.tsx](file:///e:/HuKi/web/src/app/order-success/page.tsx), [web/src/app/community/page.tsx](file:///e:/HuKi/web/src/app/community/page.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Đăng Lên Bảng Tin Huki"` tại banner chia sẻ thành quả mua sách.
- **Hiện tượng lỗi ban đầu:**
  - Người dùng hoàn tất thanh toán đơn hàng, bấm nút "Đăng Lên Bảng Tin Huki" thì trang điều hướng tới `/community` bị lỗi 404 Not Found do route cộng đồng chưa được định nghĩa trang đích.
- **Nguyên nhân gốc rễ:**
  - Thiếu trang Page router `web/src/app/community/page.tsx` và nút bấm tại `order-success` chỉ trỏ tới `/community` tĩnh mà không truyền thông tin đơn hàng hay tự động khởi tạo form chia sẻ.
- **Giải pháp dứt khoát đã triển khai:**
  - Tạo trang hoàn chỉnh `web/src/app/community/page.tsx` hỗ trợ bảng tin sách, đăng bài cảm nhận, thả tim, bình luận và chia sẻ sách.
  - Cập nhật link tại `order-success/page.tsx` kèm các query params: `action=share_order`, `orderCode`, `bookTitle`, `bookId`, `cover`.
  - Trang `/community` tự động phát hiện tham số chia sẻ đơn hàng để điền trước nội dung chia sẻ sách vừa mua và đính kèm thẻ sách nổi bật.

---

### [CA-004] Nút "Bình Luận" Gửi Nội Dung Rỗng Làm Nhấp Nháy Form Lỗi
- **Vị trí chính xác:**
  - Màn hình: Bảng tin cộng đồng (`/community`)
  - File mã nguồn: [web/src/app/community/page.tsx](file:///e:/HuKi/web/src/app/community/page.tsx)
- **Nút bấm / Thao tác:**
  - Nút: Icon mũi tên gửi bình luận trên từng bài viết.
- **Hiện tượng lỗi ban đầu:**
  - Người dùng bấm nút gửi khi ô nhập bình luận chỉ chứa dấu cách hoặc rỗng: form chớp nháy, gửi request không hợp lệ và gây giật khung bài viết.
- **Nguyên nhân gốc rễ:**
  - Thiếu kiểm tra điều kiện đầu vào `text.trim()` và nút gửi không bị disable khi ô nhập rỗng.
- **Giải pháp dứt khoát đã triển khai:**
  - Thiết lập thuộc tính `disabled={!commentText.trim()}` cho nút gửi bình luận.
  - Bổ sung guard clause kiểm tra `if (!commentText.trim()) return;` trong hàm xử lý submit `handleAddComment`.

---

### [CA-005] Modal Chọn Sách Trong Khung Chat Người Bán Bị Giới Hạn 10 Cuốn
- **Vị trí chính xác:**
  - Màn hình: Quản lý chat gian hàng (`/seller/chat`)
  - File mã nguồn: [web/src/ui/components/chat/ChatBookPickerModal.tsx](file:///e:/HuKi/web/src/ui/components/chat/ChatBookPickerModal.tsx), [web/src/ui/components/seller/SellerChatView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerChatView.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Đính kèm sách"` (`menu_book`) trên thanh công cụ chat.
- **Hiện tượng lỗi ban đầu:**
  - Gian hàng có hàng chục đầu sách, nhưng khi chủ shop bấm nút đính kèm sách, danh sách mở ra chỉ có đúng 10 cuốn sách đầu tiên. Không có ô tìm kiếm sách, không có nút chuyển trang, khiến chủ shop không thể gửi được các cuốn sách khác cho khách.
- **Nguyên nhân gốc rễ:**
  - Không có modal chọn sách riêng biệt tích hợp tìm kiếm và phân trang từ API kho sách của người bán.
- **Giải pháp dứt khoát đã triển khai:**
  - Xây dựng component `ChatBookPickerModal.tsx` hoàn chỉnh:
    - Hỗ trợ ô tìm kiếm sách theo tên/tác giả với cơ chế debounce 300ms.
    - Phân trang đầy đủ (Previous / Next) với hiển thị tổng số kết quả.
    - Hiển thị ảnh bìa, giá bán, định dạng (Ebook/Sách giấy) và tồn kho thực tế.
  - Tích hợp nút `menu_book` vào thanh công cụ `SellerChatView.tsx` và hàm `handleSendBook` để đẩy thẻ sách trực tiếp vào luồng tin nhắn WebSocket với messageType `BOOK`.

---

### [CA-006] Widget Bé Cáo AI Trả Về Thẻ Sách Không Khớp Dữ Liệu Thực
- **Vị trí chính xác:**
  - Thành phần: Microservice Trợ lý AI Bé Cáo
  - File mã nguồn: [platform/apps/community-service/src/modules/chat/ai-chat.service.ts](file:///e:/HuKi/platform/apps/community-service/src/modules/chat/ai-chat.service.ts)
- **Hiện tượng lỗi ban đầu:**
  - Người dùng hỏi Bé Cáo AI về gợi ý sách phát triển bản thân hoặc tài chính, trợ lý trả về các cuốn sách tĩnh (placeholder fallback) thay vì danh mục sách đang bán thực tế trên sàn HuKi.
- **Nguyên nhân gốc rễ:**
  - Trong `ai-chat.service.ts`, hàm `fetchBooksCatalog` gọi `commerce-service` endpoint `/api/v1/books`. Endpoint này trả về object phân trang `{ items: [...], total, page, limit }`, được `TransformInterceptor` bọc thành `{ success: true, data: { items: [...] } }`.
  - Code cũ kiểm tra `Array.isArray(json.data)`, điều kiện này luôn trả về `false`, khiến `rawBooks` rỗng và microservice luôn rơi vào nhánh `getFallbackStaticBooks()`.
- **Giải pháp dứt khoát đã triển khai:**
  - Sửa lại logic trích xuất danh sách sách từ response:
    ```typescript
    const rawBooks = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.data?.items)
      ? json.data.items
      : Array.isArray(json.items)
      ? json.items
      : [];
    ```
  - Đảm bảo AI Chat Service luôn nạp đúng danh mục sách thực tế từ database sàn và cung cấp cho Gemini context prompt chính xác 100%.
