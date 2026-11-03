# MOD-06: Cộng Đồng Độc Giả, Tin Nhắn Trực Tiếp & Trợ Lý Bé Cáo AI (Community, Realtime Chat & AI Assistant)

> **Phạm vi kiểm thử toàn diện:** Gồm 8 Màn hình & Luồng hệ thống kết hợp giữa **Kiểm thử Giao diện (UI/UX 3 Viewports)** và **Kiểm thử Chức năng Nghiệp Vụ Sâu (Functional & Business Logic)**: Chatbot trợ lý Bé Cáo AI (`FloatingAIChatbox.tsx`), Khung chat trực tiếp Người Mua & Người Bán (`/messages`, `FloatingChatWidget.tsx`), Quản trị hội thoại NXB (`/seller/chat`), Viết đánh giá sau khi nhận sách (`/orders/[id]/review`), Quản lý đánh giá độc giả (`/profile/reviews`), Quản lý phản hồi gian hàng (`/seller/reviews`), Bàn kiểm duyệt báo cáo vi phạm (`/admin/moderation`, `/admin/reports`), và Module đánh giá trên trang chi tiết sách (`/book/[slug]`).  
> **Trạng thái thực tế:** **ĐÃ HOÀN TẤT KIỂM THỬ THỰC TẾ 2 PHA (UI VIEWPORT + CHỨC NĂNG NGHIỆP VỤ)**.  
> **Kết quả kiểm thử:** Phát hiện và lập hồ sơ chi tiết **15 lỗi xác thực (10 lỗi UI/UX + 5 lỗi Chức Năng Nghiệp Vụ nghiêm trọng)** lưu tại [bug-mod06.md](file:///e:/HuKi/tasks/bug-mod06.md).  
> **Cam kết cốt lõi:** **Tuyệt đối không tự ý sửa code sản phẩm** (`web/src/*`, `platform/*`) trước khi có sự phê duyệt từ người dùng.

---

## 🎨 BỘ TIÊU CHUẨN THIẾT KẾ ANTI-AI & GIAO TIẾP VĂN HÓA ĐỌC (EDITORIAL COMMUNITY SPECIFICATION)

Dựa trên bộ kỹ năng `skill/.gemini/skills/ui-ux-pro-max`, Phân hệ Cộng Đồng & AI HuKi phục vụ bạn đọc yêu sách, tác giả và nhà xuất bản; tuyệt đối bài trừ phong cách "chatbot AI generic / tương tác đa cấp rẻ tiền":

1. **🚫 Triệt Tiêu Tuyệt Đối Các Yếu Tố AI Cliché & Đồ Họa Robot Viễn Tưởng Lố Lăng:**
   - **Không dùng hình ảnh Robot Neon / Vệt sáng Cyberpunk:** Trợ lý Bé Cáo AI mang hình tượng linh vật Cáo HuKi ấm áp, thông minh, yêu sách. Cấm các hiệu ứng ánh sáng neon, hào quang xanh lam vũ trụ kiểu AI giả tạo.
   - **Không câu trả lời rập khuôn cứng nhắc (No Robotic Platitudes):** Cấm câu trả lời cụt lủn: *"Tôi là AI, tôi không biết..."*. Khi mất kết nối hoặc hết quota, Bé Cáo tự động chuyển sang bộ phản hồi cục bộ theo từ khóa thông minh (DRM sách số, quy trình hoàn tiền, mẹo chọn sách hay) kèm link điều hướng thật.
   - **Không dùng Unicode Emoji thô:** Cấm dùng `🤖`, `⭐`, `💬`, `👍`, `⚠️`. Toàn bộ icon dùng Google Material Symbols vector chuẩn (`smart_toy`, `star`, `chat_bubble`, `thumb_up`, `verified`).

2. **🌿 Màu Sắc Giao Diện Hội Thoại Thanh Lịch & Dễ Đọc:**
   - **Bong bóng tin nhắn Người gửi (Buyer/Seller):** Màu xanh Forest Green `#003B2B` hoặc Emerald `#00875A` với chữ trắng tương phản cao.
   - **Bong bóng tin nhắn Đối tác & Bé Cáo:** Nền Book Cream `#F8F6F0` hoặc xám ấm `#F1F5F9` với chữ than đậm `#0F172A`.
   - **Huy hiệu "Đã Mua Hàng Tại HuKi":** Emerald nhạt `#ECFDF5`, viền `#A7F3D0`, chữ `#065F46` tinh tế, chứng thực minh bạch.

3. **💬 Trải Nghiệm Chat Thời Gian Thực Chuẩn Mực B2C/B2B (Zero Jitter, No 429 Loops):**
   - **Không tạo vòng lặp spam request 429 (Rate Limit Guard):** Quản lý kết nối WebSocket / Polling chặt chẽ, tự động giãn thời gian thử lại (Exponential Backoff), tuyệt đối không để xảy ra spam `GET /api/v1/chat/... 429 Too Many Requests`.
   - **Gắn thẻ sách đang xem vào cuộc trò chuyện (Product In-Context Preview):** Khi bấm "Chat với Shop" từ trang sách, tự động gửi kèm thumbnail, tựa sách, giá bán để chủ shop tư vấn chính xác.

4. **📱 Tối Ưu Hóa Trải Nghiệm Chat & Đánh Giá Trên Điện Thoại (Mobile Responsive):**
   - Khung chat nổi không che khuất nút mua hàng / thêm vào giỏ hàng.
   - Bàn phím ảo trên mobile mở lên không làm vỡ layout hoặc đẩy thanh nhập liệu mất khỏi màn hình.

---

## 🔍 TIÊU CHUẨN KIỂM THỬ ĐA CHIỀU (MULTI-SPECTRUM AUDIT SPECIFICATION)

| Chiều Kiểm Thử | Công Cụ & Cơ Chế | Nội Dung Kiểm Tra Chuyên Sâu |
| :--- | :---: | :--- |
| 📱 **Responsive 3 Viewports** | Playwright Matrix | • **Mobile (390 x 844 px):** Khung chat full-height, không tràn thanh cuộn ngang; form gửi review unbox sách dễ bấm.<br>• **Tablet (768 x 1024 px):** Giao diện danh sách hội thoại và khung chat chia đôi (Split layout).<br>• **Desktop (1440 x 900 px):** Bảng quản trị tin nhắn NXB `/seller/chat` và bàn duyệt báo cáo vi phạm. |
| ⚡ **Chức Năng Nghiệp Vụ (Functional)** | API & E2E Verification | • Bé Cáo AI (RAG kho sách thật, fallback nội bộ, session Redis, quyền truy cập công khai).<br>• Realtime Chat WebSocket (truyền nhận tin nhắn, âm thanh chime, read receipts, quick reply).<br>• Reviews & Moderation (ràng buộc đơn `DELIVERED` POL-13, vote Hữu ích, tự động lọc từ ngữ thô tục, hàng đợi duyệt vi phạm). |
| 🔴 **Console Error & Runtime** | `page.on('console')`<br>`page.on('pageerror')` | • Bắt lỗi WebSocket connection failure, React Hydration mismatch, rò rỉ token hoặc memory leak từ event listener. |
| 🌐 **Network & Exception Log** | `page.on('response')`<br>Backend Server Logs | • Bắt toàn bộ lỗi HTTP: `400` (Review truyền sai định dạng/slug), `401` (Bé Cáo AI chặn khách), `409` (Đã review rồi), `429` (Rate limit chat). |

---

## 🗺️ BẢN ĐỒ CHI TIẾT 8 MÀN HÌNH & KIỂM THỬ CHỨC NĂNG NGHIỆP VỤ MOD-06

### 1. Phân Hệ 1: TRỢ LÝ ĐỌC SÁCH BÉ CÁO AI & TIN NHẮN SHOP (3 Màn Hình / Widget)

- [ ] **Màn hình 1.1: Trợ Lý Đọc Sách Bé Cáo AI Nổi (`FloatingAIChatbox.tsx`)**
  - [x] **Kiểm thử Giao diện (UI/UX 3 Viewports):** Đã kiểm tra mở/đóng widget trên Mobile (390px), Tablet (768px), Desktop (1440px). Phát hiện hiệu ứng nhấp nháy `animate-pulse` vi phạm tiêu chuẩn thiết kế (lỗi `BUG-MOD06-09`).
  - [ ] **Chức năng Hỏi - Đáp Gợi Ý Sách Thông Minh (Gemini AI RAG):** Đã kiểm thử API `POST /api/v1/chat/ai`. Trợ lý trích xuất sách thật từ cơ sở dữ liệu và trả về link Markdown `[Tên Sách](/book/{id})`.
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (BUG-MOD06-11 - P0):** Widget Bé Cáo AI trên Frontend gọi `skipAuth: true`, nhưng API Gateway chặn khách với mã lỗi `401 AUTH_TOKEN_MISSING`. Mọi độc giả vãng lai hoặc chưa đăng nhập bấm chat đều bị lỗi hệ thống!
  - [x] **Cơ chế Fallback Thông Minh Cục Bộ:** Khi không có Google Gemini API Key hoặc mất kết nối, hệ thống kích hoạt bộ phản hồi dự phòng thông minh (giải đáp chính sách giao hàng, đổi trả, định dạng Ebook DRM).
  - [x] **Quản lý Phiên Chat (Session Inactivity Timeout):** Cơ chế dọn dẹp sau 30 phút không hoạt động và lưu tối đa 20 tin nhắn gần nhất vào Redis/localStorage hoạt động chính xác.

- [ ] **Màn hình 1.2: Hộp Thoại Chat Trực Tiếp Với Gian Hàng (`FloatingChatWidget.tsx` & `/book/[slug]`)**
  - [x] **Kiểm thử Giao diện (UI/UX 3 Viewports):** Kiểm tra khung chat nổi mini khi duyệt sách.
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (BUG-MOD06-02 - P0):** Nút "Nhắn tin" (Chat với Shop) trên trang chi tiết sách `web/src/app/book/[id]/page.tsx` bị hardcode `cursor-not-allowed` kèm nhãn "Sắp ra mắt" và title "Chức năng nhắn tin đang được phát triển", làm tê liệt hoàn toàn luồng kết nối giữa Người mua và Shop.
  - [ ] **Gắn Thẻ Sách Ngữ Cảnh (Book Context Card):** Tự động đính kèm thông tin cuốn sách đang xem vào tin nhắn đầu tiên gửi tới nhà xuất bản.

- [ ] **Màn hình 1.3: Trung Tâm Tin Nhắn Người Mua (`/account/messages` - Redirect từ `/messages`)**
  - [x] **Kiểm thử Giao diện (UI/UX 3 Viewports):** Đã kiểm tra Responsive 3 kích thước. Phát hiện hardcode sao Unicode thô `★` (lỗi `BUG-MOD06-05`).
  - [x] **Chức năng Lấy Danh Sách Hội Thoại (`GET /api/v1/chat/conversations`):** Đã kiểm thử thực tế với tài khoản người mua, trả về mã HTTP 200 kèm danh sách tin nhắn từ MongoDB.
  - [ ] **Kết nối WebSocket Thời Gian Thực (`useChatSocket.ts`):** Kết nối Socket Gateway, truyền nhận tin nhắn 2 chiều giữa Người mua và Nhân viên CSKH.
  - [ ] **Âm Thanh Thông Báo (Chime):** Kiểm tra hàm `playChatPopSound` và `playMessageSentSound` (`chatSound.ts`) khi có tin nhắn mới.
  - [ ] **Đánh Dấu Đã Đọc (Read Receipts):** Cập nhật trạng thái `status: 'READ'` khi mở cuộc trò chuyện.

---

### 2. Phân Hệ 2: KÊNH QUẢN TRỊ TIN NHẮN NHÀ XUẤT BẢN (1 Màn Hình)

- [ ] **Màn hình 2.1: Quản Trị Hội Thoại Khách Hàng NXB (`/seller/chat`)**
  - [x] **Kiểm thử Giao diện (UI/UX 3 Viewports):** Layout chia đôi (Split Column) hiển thị danh sách khách hàng và khung chat. Phát hiện hiệu ứng nhấp nháy `animate-pulse` (lỗi `BUG-MOD06-09`).
  - [ ] **Quản trị Tin Nhắn Khách Hàng:** Phản hồi tin nhắn người mua, xem thông tin đơn hàng của khách liên kết với cuộc trò chuyện.
  - [ ] **Mẫu Câu Trả Lời Nhanh (Quick Reply Templates):** Nạp danh sách câu trả lời mẫu từ `chatQuickReplyService.ts` và chèn vào ô nhập tin nhắn.
  - [ ] **Cơ Chế Chống Spam (Rate Limit Guard 429):** Đảm bảo không tạo vòng lặp gửi yêu cầu polling dồn dập gây sập dịch vụ chat.

---

### 3. Phân Hệ 3: HỆ THỐNG ĐÁNH GIÁ, BÌNH LUẬN & KIỂM DUYỆT (4 Màn Hình)

- [ ] **Màn hình 3.1: Viết Đánh Giá & Nhận Xét Sau Mua Hàng (`/orders/[id]/review`)**
  - [x] **Kiểm thử Giao diện (UI/UX 3 Viewports):** Form chấm điểm sao, nhập nội dung cảm nhận và tải ảnh unbox sách.
  - [x] **Xác Thực Người Mua Thực Tế (POL-13 Purchase Verification):** Đã kiểm thử API `POST /api/v1/books/{id}/reviews`. Backend kiểm tra nghiêm ngặt: Nếu tài khoản chưa từng mua sách hoặc đơn hàng chưa hoàn tất (`DELIVERED`/`COMPLETED`), API từ chối với lỗi HTTP 400 `REVIEW_PURCHASE_REQUIRED` ("Bạn cần mua sách trước khi đánh giá").
  - [x] **Chặn Đánh Giá Trùng Lặp:** Khi người dùng đã đánh giá cuốn sách này trước đó, hệ thống trả về mã HTTP 409 `REVIEW_ALREADY_EXISTS`.
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (BUG-MOD06-14 - P1):** Form đánh giá gọi sai API `orderApi.uploadDisputeEvidence` để tải ảnh unbox sách; khi thất bại tự động fall back lưu chuỗi Base64 DataURL khổng lồ vào database.
  - [x] **Lạm Dụng Ảnh Unsplash Ngoài (BUG-MOD06-07 - P1):** Form review dùng URL ảnh mẫu Unsplash bên ngoài làm fallback thay vì ảnh bìa nội bộ của sách.

- [ ] **Màn hình 3.2: Quản Lý Đánh Giá Của Tôi (`/profile/reviews`)**
  - [ ] **LỖI VỠ LAYOUT NGHIÊM TRỌNG (BUG-MOD06-01 - P0):** Tràn màn hình điện thoại Mobile (390px) lên tới +703px (`scrollWidth: 1093px`), làm vỡ toàn bộ giao diện tài khoản người dùng.
  - [x] **Chức năng Tải Danh Sách Đánh Giá Cá Nhân (`GET /api/v1/reviews/me`):** Đã kiểm thử thực tế với tài khoản người mua, trả về mã HTTP 200 kèm danh sách đánh giá đã viết, phản hồi từ NXB và số lượt bấm Hữu ích.

- [ ] **Màn hình 3.3: Quản Lý Đánh Giá Từ Độc Giả Cho Gian Hàng (`/seller/reviews`)**
  - [ ] **LỖI VỠ GIAO DIỆN MOBILE (BUG-MOD06-04 - P1):** Thanh lọc sao (Filter Pills) tràn lề ngang màn hình điện thoại +216px (`scrollWidth: 606px`).
  - [x] **Tiêu Chuẩn Thiết Kế Anti-AI (BUG-MOD06-05 - P1):** Hardcode ký tự sao Unicode thô `★` thay vì icon vector Material Symbols.
  - [ ] **Chức Năng Gian Hàng Trả Lời Đánh Giá (Shop Reply):** Đã kiểm thử API `POST /api/v1/reviews/:id/reply`. Gian hàng gửi phản hồi công khai tới độc giả.

- [ ] **Màn hình 3.4: Bàn Kiểm Duyệt Báo Cáo Vi Phạm & Lọc Nội Dung Xấu (`/admin/moderation`, `community-service`)**
  - [x] **Bộ Lọc Từ Ngữ Thô Tục Tự Động (Auto-Moderation):** `AutoModerationService` tự động phát hiện và gắn cờ các từ khóa tục tĩu (`BLOCKED_PHRASES`), spam link quá mức (`EXCESSIVE_LINKS`), và ký tự lặp vô nghĩa (`REPEATED_CHARACTERS`).
  - [x] **Chức Năng Báo Cáo Đánh Giá Vi Phạm (`POST /api/v1/reviews/:id/report`):** Đã kiểm thử thực tế. Người dùng gửi báo cáo vi phạm, tạo bản ghi với trạng thái `PENDING`.
  - [x] **Quy Trình Kiểm Duyệt Của Quản Trị Viên (Admin Moderation Lifecycle):** Đã kiểm thử thực tế:
    - Admin xem danh sách báo cáo: `GET /api/v1/admin/moderation/reports` (Status 200).
    - Admin tiếp nhận xử lý: `PATCH /api/v1/admin/moderation/reports/:id/review` -> chuyển trạng thái `REVIEWING`.
    - Admin ra quyết định: `PATCH /api/v1/admin/moderation/reports/:id/resolve` (Hành động: `NONE`, `WARN`, `HIDE`, `DELETE`, `BAN`) -> chuyển trạng thái `RESOLVED`/`DISMISSED`.
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (BUG-MOD06-12 - P0):** Admin Portal hoàn toàn **KHÔNG CÓ GIAO DIỆN** cho kiểm duyệt nội dung cộng đồng (`/admin/moderation`). Trang `/admin/reports` hiện tại là màn hình báo cáo doanh thu tài chính GMV, khiến Admin không có cách nào xem hoặc xử lý các báo cáo vi phạm trên giao diện web!
  - [ ] **LỖI CHỨC NĂNG NGHIÊM TRỌNG (BUG-MOD06-13 - P1):** Trên giao diện đọc đánh giá tại trang chi tiết sách `/book/[slug]`, hoàn toàn thiếu nút "Báo cáo bình luận" (Report Review) để người đọc gửi phản ánh vi phạm lên hệ thống.

---

### 4. Phân Hệ Bổ Trợ: Module Đánh Giá Trên Trang Chi Tiết Sách (`/book/[slug]`)

- [ ] **Màn hình 4.1: Khối Đánh Giá & Bình Luận Trên Trang Chi Tiết Sách**
  - [ ] **LỖI GỌI API BAD REQUEST (BUG-MOD06-03 - P0):** Trang chi tiết sách truyền Slug sách thay vì Book UUID vào API `GET /api/v1/books/{id}/reviews`, gây lỗi HTTP 400 Bad Request trên toàn bộ các trang sách có URL dạng slug (như `/book/con-duong-phia-truoc`).
  - [x] **Chức Năng Bấm "Hữu Ích" (Helpful Vote):** Đã kiểm thử API `POST /api/v1/reviews/:id/helpful` và `DELETE /api/v1/reviews/:id/helpful`. Hệ thống tăng/giảm số lượt `helpfulCount` và đánh dấu `isHelpful: true/false` thành công (Status 201).
  - [x] **Huy Hiệu "Đã Mua Hàng Tại HUKI" (Verified Purchase Badge):** Hiển thị nhãn chứng thực khi bản ghi đánh giá có cờ `verifiedPurchase: true`.
