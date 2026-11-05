# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Cộng Đồng, Chat Trực Tuyến & Trợ Lý Bé Cáo AI

> **Mã phân hệ:** `BUG-GROUP-06`  
> **Đối tượng người dùng:** Độc giả tham gia diễn đàn sách, Khách hàng chat tư vấn với Shop, Người dùng tương tác với Trợ lý AI Bé Cáo.  
> **Phạm vi kiểm thử:** Toàn bộ 8 màn hình và widget tương tác thời gian thực (`/messages`, `/seller/chat`, `/community`, widget Bé Cáo AI toàn sàn), bao gồm gửi tin nhắn, đính kèm sách, thả tim/bình luận diễn đàn và hỏi đáp gợi ý sách thông minh qua Gemini API.  
> **Nguyên tắc kỹ thuật:** Kết nối WebSocket ổn định không ngắt quãng, xử lý streaming mượt mà, loại bỏ triệt để mock data, đưa ra 1 giải pháp kỹ thuật duy nhất.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (COMMUNITY, CHAT & AI)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **CA-001** | Toàn bộ màn hình Chat (`/messages`, `/seller/chat`) | Nút **"Gửi Tin Nhắn"** (`send`) | Realtime / Socket | **P0 (Blocker)** | ❌ **FAIL** (Lệch cấu hình cổng Socket làm mất kết nối ngầm) |
| **CA-002** | Widget Bé Cáo AI (Toàn sàn) | Nút **"Gửi Câu Hỏi Cho Bé Cáo"** | Trí Tuệ Nhân Tạo / API | **P1 (Critical)** | ❌ **FAIL** (Thiếu cờ timeout khiến khung chat bị đóng băng khi API nghẽn) |
| **CA-003** | Bảng tin cộng đồng (`/community`) | Nút **"Chia Sẻ Lên Bảng Tin"** (Từ Order Success) | Tương Tác / Feed | **P1 (Critical)** | ❌ **FAIL** (Nút chết không trigger tạo bài viết tự động) |
| **CA-004** | Diễn đàn sách (`/community`) | Nút **"Bình Luận"** trên bài viết | Form / UI | **P2 (Major)** | ❌ **FAIL** (Bấm gửi khi ô nhập rỗng làm nhấp nháy form lỗi) |
| **CA-005** | Khung chat người bán (`/seller/chat`) | Nút **"Đính Kèm Sách Tư Vấn"** | UI / Modal | **P1 (Critical)** | ❌ **FAIL** (Modal chọn sách chỉ hiển thị 10 cuốn đầu, thiếu phân trang) |
| **CA-006** | Widget Bé Cáo AI (Toàn sàn) | Các thẻ **"Gợi Ý Sách Thông Minh"** | Dữ Liệu / Link | **P1 (Critical)** | ❌ **FAIL** (AI trả về tên sách không khớp với database sàn) |

---

## CHI TIẾT KỸ THUẬT TỪNG LỖI CỤ THỂ

---

### [CA-001] Nút "Gửi Tin Nhắn" Thất Bại Ngầm Do Lệch Cấu Hình Cổng WebSocket
- **Vị trí chính xác:**
  - Màn hình: Tin nhắn khách hàng (`http://localhost:3100/messages`) và Kênh chat người bán (`http://localhost:3100/seller/chat`)
  - File mã nguồn: [web/src/ui/context/ChatContext.tsx](file:///e:/HuKi/web/src/ui/context/ChatContext.tsx), `web/.env`
- **Nút bấm / Thao tác:**
  - Nút: Icon mũi tên gửi tin nhắn `send` bên cạnh ô nhập nội dung chat.
- **Hiện tượng lỗi:**
  - Người mua gõ tin nhắn hỏi shop về tình trạng sách và bấm nút gửi: Tin nhắn hiện trên màn hình của người gửi (Optimistic UI), nhưng người bán hoàn toàn không nhận được tin nhắn. Khi người gửi tải lại trang (F5), toàn bộ tin nhắn vừa gửi biến mất hoàn toàn. Console báo lỗi: `WebSocket connection to 'ws://localhost:3000/socket.io/' failed`.
- **Nguyên nhân gốc rễ:**
  - Biến môi trường `NEXT_PUBLIC_SOCKET_URL` bị trỏ nhầm vào API Gateway cổng `3000`. API Gateway là NestJS HTTP reverse proxy, không chạy WebSocket Gateway. WebSocket Gateway thực tế chạy tại `community-service` trên cổng `3005` (ở local) hoặc qua đường dẫn chuẩn `/socket.io` được gateway định tuyến đúng.
- **Giải pháp dứt khoát duy nhất:**
  - Cấu hình chuẩn xác `NEXT_PUBLIC_SOCKET_URL=http://localhost:3005` cho môi trường local và `https://huki-uat.duckdns.org` cho môi trường UAT. Đảm bảo `io(socketUrl, { transports: ['websocket', 'polling'] })` bắt tay thành công ngay khi mount.

---

### [CA-002] Nút Gửi Câu Hỏi Cho Bé Cáo AI Bị Đóng Băng Khi Gemini API Quá Tải
- **Vị trí chính xác:**
  - Thành phần: Widget trợ lý AI Bé Cáo nổi góc phải dưới toàn sàn.
  - File mã nguồn: [web/src/ui/components/ai/BeCaoChatWidget.tsx](file:///e:/HuKi/web/src/ui/components/ai/BeCaoChatWidget.tsx)
- **Nút bấm / Thao tác:**
  - Nút: Icon `auto_awesome` / `send` gửi câu hỏi tư vấn sách cho Bé Cáo AI.
- **Hiện tượng lỗi:**
  - Khi người dùng gửi câu hỏi phức tạp hoặc khi mạng chập chờn, nút chuyển sang trạng thái loading chấm ba chấm nhưng không bao giờ hoàn tất, không thể gõ câu hỏi mới, không có nút hủy bỏ (Cancel/Abort request). Khung chat bị khóa vĩnh viễn cho đến khi người dùng phải F5 trang web.
- **Nguyên nhân gốc rễ:**
  - Hàm `fetch` gọi endpoint `/api/v1/ai/chat` không sử dụng `AbortController` và không thiết lập `timeout`. Khi backend upstream gặp timeout từ Google Gemini API, kết nối HTTP bị treo lơ lửng.
- **Giải pháp dứt khoát duy nhất:**
  - Bổ sung `AbortController` với thời gian chờ tối đa 15 giây. Nếu quá 15 giây chưa có stream trả về, tự động hủy request, mở khóa lại nút gửi và hiển thị câu thông báo thân thiện: *"Bé Cáo đang bị quá tải suy nghĩ một chút, bạn bấm thử lại nhé!"*.

---

### [CA-003] Modal Chọn Sách Trong Khung Chat Người Bán Bị Giới Hạn 10 Cuốn
- **Vị trí chính xác:**
  - Màn hình: Quản lý chat gian hàng (`http://localhost:3100/seller/chat`)
  - File mã nguồn: [web/src/ui/components/chat/ChatBookPickerModal.tsx](file:///e:/HuKi/web/src/ui/components/chat/ChatBookPickerModal.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Đính kèm sách"` (`menu_book`) để gửi nhanh link sách cho khách đang hỏi mua.
- **Hiện tượng lỗi:**
  - Gian hàng có 98 đầu sách (như Trí Tuệ Việt), nhưng khi chủ shop bấm nút đính kèm sách, danh sách mở ra chỉ có đúng 10 cuốn sách đầu tiên. Không có ô tìm kiếm sách, không có thanh cuộn tải thêm, khiến chủ shop không thể gửi được các cuốn sách khác cho khách.
- **Nguyên nhân gốc rễ:**
  - Modal gọi `catalogApi.getStoreBooks(storeId)` với giá trị ngầm định `limit=10` và không truyền `search` query hay phân trang.
- **Giải pháp dứt khoát duy nhất:**
  - Bổ sung thanh tìm kiếm gõ tên sách (`searchQuery` với debounce 300ms) và phân trang hoặc Infinite Scroll trong modal chọn sách.

