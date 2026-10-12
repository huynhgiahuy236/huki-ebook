# 💬 RT-07: REALTIME LIVE CHAT & CONVERSATION MESSAGING

> **Mục tiêu:** Cung cấp trải nghiệm nhắn tin thời gian thực mượt mà giữa Người mua (Buyer) và Chủ gian hàng (Seller): Tin nhắn gửi đi xuất hiện tức thì, hiển thị trạng thái đang soạn tin (Typing indicator), xác nhận đã nhận/đã đọc (Delivered/Read receipts) và thông báo tin nhắn mới ngoài màn hình.

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG (SCOPE & IMPACT ANALYSIS)

### A. Frontend (Giao diện người dùng)
* **Buyer Web:**
  * Khung Chat nổi góc phải màn hình (`FloatingChatWidget.tsx`) hoặc trang tin nhắn chi tiết.
* **Seller Portal:**
  * Trang `seller/chat/page.tsx`: Danh sách hội thoại khách hàng, khung chat chính, thông tin đơn hàng của khách đang tư vấn.
  * Sidebar Seller: Badge số tin nhắn chưa đọc cạnh mục *"Tin Nhắn & Chat"*.

### B. Backend (Microservices)
* `community-service`:
  * Module `chat` (`ChatGateway`, `ChatService`).
  * WebSocket Gateway tại namespace `/chat`.
* CSDL: MongoDB / PostgreSQL lưu trữ lịch sử tin nhắn, hình ảnh đính kèm và trạng thái hội thoại.

### C. Mức độ rủi ro & Biện pháp phòng ngừa
* **Rủi ro:** Khi mạng chập chờn, tin nhắn có thể bị gửi trùng (duplicate message) hoặc mất kết nối giữa chừng khi đang gõ.
* **Phòng ngừa:** Phía Client sinh mã `clientMessageId` duy nhất (UUID v4) cho mỗi tin nhắn; phía Server kiểm tra idempotency trước khi lưu. Nếu mất kết nối, tin nhắn chuyển sang trạng thái "Đang gửi..." và tự động gửi lại khi có mạng.

---

## 🛠️ 2. THIẾT KẾ KỸ THUẬT & CÁCH LÀM (IMPLEMENTATION PLAN)

### A. Kênh Socket & Định danh Room
```
Namespace: /chat
Rooms:
  ├── conversation_{conversationId}   (Phòng chat cụ thể giữa 1 khách và 1 shop)
  └── user_chat_inbox_{userId}        (Kênh lắng nghe tin nhắn mới tổng của người dùng)
```

### B. Các Sự Kiện Chuẩn (Chat Protocol)
1. `chat:send_message`: Khách hoặc Shop gửi tin nhắn mới kèm nội dung text/ảnh.
2. `chat:message_received`: Tin nhắn được đẩy đến người nhận trong room.
3. `chat:typing`: Báo hiệu đối phương đang nhập văn bản (tự tắt sau 3 giây không gõ).
4. `chat:mark_as_read`: Đánh dấu đã xem toàn bộ tin nhắn trong hội thoại.

### C. Các bước thực hiện chi tiết
1. **Bước 1 (Backend Gateway):** Chuẩn hóa `ChatGateway` xác thực JWT của cả Buyer và Seller, quản lý danh sách người dùng đang online trong hội thoại.
2. **Bước 2 (Optimistic UI Update):** Khi người dùng bấm nút Gửi $\to$ Tin nhắn hiện ngay lập tức trong khung chat với icon đồng hồ (Pending) $\to$ Nhận ACK từ socket server đổi sang dấu tích (Sent).
3. **Bước 3 (Badge & In-App Toast):** Nếu Seller đang ở trang khác (ví dụ đang xem Bảng điều khiển) mà khách nhắn tin $\to$ Hiển thị Toast nổi góc trên và tăng badge tin nhắn chưa đọc trên Sidebar.

---

## 🎯 3. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED OUTCOME)

1. Người mua gửi tin nhắn hỏi sách $\to$ Màn hình chat của Seller nhận tin nhắn trong vòng **< 100ms** kèm tiếng "pop" nhẹ.
2. Người mua nhìn thấy dấu 3 chấm "..." nhấp nháy khi nhân viên shop đang gõ câu trả lời.
3. Khi đối phương mở xem tin nhắn $\to$ Trạng thái chuyển từ "Đã gửi" sang "Đã xem" tức thì.

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ (TESTING & VERIFICATION CADENCE)

* **Test Case 1 (Bidirectional Messaging):** Mở 2 trình duyệt (1 tài khoản Buyer, 1 tài khoản Seller) $\to$ Chat qua lại liên tục 10 tin nhắn $\to$ Xác nhận không tin nào bị trễ hoặc nhảy lộn xộn thứ tự.
* **Test Case 2 (Typing Indicator Throttle):** Gõ chữ liên tục $\to$ Xác nhận event typing chỉ bắn cách nhau 1.5 giây (không spam socket).
* **Test Case 3 (Reconnection & Message Queue):** Ngắt mạng tab Buyer khi đang gửi tin $\to$ Bật lại mạng $\to$ Tin nhắn tự động được gửi đi thành công mà không cần người dùng nhập lại.

---

## ✅ 5. KẾT QUẢ TRIỂN KHAI THỰC TẾ (COMPLETED IMPLEMENTATION)

1. **Floating Buyer Chat Widget ([FloatingChatWidget.tsx](file:///e:/HuKi/web/src/ui/components/chat/FloatingChatWidget.tsx)):**
   - Tích hợp trực tiếp vào layout toàn sàn ([AppLayout.tsx](file:///e:/HuKi/web/src/ui/components/layout/AppLayout.tsx)) với nút nổi phía góc dưới bên phải (`bottom-44 right-6`, xếp ngay ngắn trên Mascot Bé Cáo AI).
   - Badge đỏ đếm tin nhắn chưa đọc thời gian thực.
   - Hỗ trợ câu hỏi nhanh (Quick Reply Chips), thanh nhập tin nhắn nhạy bén, trạng thái kết nối Socket.IO trực tiếp.

2. **Seller Chat Portal ([SellerChatView.tsx](file:///e:/HuKi/web/src/ui/components/seller/SellerChatView.tsx)):**
   - Kết nối `useChatSocket` với đầy đủ sự kiện `onUserTyping`, `setTyping`, `markAsRead`.
   - Hiển thị animation 3 chấm nhấp nháy *"Khách hàng đang soạn tin..."* tức thì khi khách gõ.
   - Nhận diện và cập nhật trạng thái tin nhắn 3 tầng: `Đã gửi (done)` $\to$ `Đã nhận (done_all)` $\to$ `Đã xem (done_all xanh)`.
   - Phát âm thanh pop tự nhiên ([chatSound.ts](file:///e:/HuKi/web/src/ui/utils/chatSound.ts)) qua Web Audio API khi có tin nhắn mới mà không cần nạp file audio ngoài.

3. **Buyer Account Messenger ([account/messages/page.tsx](file:///e:/HuKi/web/src/app/account/messages/page.tsx)):**
   - Tích hợp typing indicator của Shop (*"Shop đang soạn tin..."*).
   - Debounce gõ phím 2.0 giây để không gây nghẽn socket.
   - Hiệu ứng âm thanh khi gửi và nhận tin nhắn.

4. **Seller Sidebar Unread Badge ([SellerSidebar.tsx](file:///e:/HuKi/web/src/ui/components/layout/SellerSidebar.tsx)):**
   - Đếm số tin nhắn chưa đọc từ `chatService.listConversations(bizId)`.
   - Lắng nghe sự kiện `CHAT_MESSAGE_RECEIVED` và `CHAT_UNREAD_COUNT_CHANGED` trên `realtimeSyncBus` để tự động làm mới số badge đỏ cạnh mục *"Tin Nhắn & Chat"*.

5. **Kết quả chạy kiểm thử thực tế qua kịch bản tự động (`scripts/test-realtime-live-chat.mjs`):**
   ```
   ======================================================================
   🎉 ALL RT-07 REALTIME LIVE CHAT TEST CASES PASSED SUCCESSFULLY!
      - Bi-directional Latency: 8ms (< 100ms threshold)
      - Typing Indicator: 4ms
      - Read Receipts: Verified
   ======================================================================
   ```

