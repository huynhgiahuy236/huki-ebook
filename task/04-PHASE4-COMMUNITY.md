# 📋 PHASE 4: Community & Communication
**Thời gian ước tính: 3-4 tuần**

## Mục tiêu
- Community Service (Forum, Chat, Reviews)
- Notifications
- Real-time features (Socket.IO)

---

## 🐙 Tasks

### Sprint 12: Forum (1 tuần) — Hoàn thành 2026-08-22

| Task | Người | Priority | Mô tả | Trạng thái |
|------|-------|---------|--------|---|
| T12.1 | HUY | HIGH | MongoDB collections: forums, comments | ✅ |
| T12.2 | HUY | HIGH | Forum posts CRUD | ✅ |
| T12.3 | HUY | HIGH | Comments & replies | ✅ |
| T12.4 | HUY | HIGH | Like/unlike posts và comments | ✅ |
| T12.5 | KIEN | HIGH | Post categories | ✅ |
| T12.6 | HUY | MEDIUM | View count, popular posts | ✅ |
| T12.7 | KIEN | MEDIUM | Search posts | ✅ |

#### Luồng Forum đã triển khai

1. Ba collection `forums`, `comments`, `forum_categories` dùng Mongoose, UUID Identity được lưu dạng string và quan hệ nội bộ MongoDB dùng ObjectId.
2. Public đọc bài `PUBLISHED`; tác giả hoặc platform admin được đọc/sửa/xóa mềm nội dung thuộc phạm vi quyền. Bài mới bắt đầu ở `PENDING_REVIEW` để Sprint 16 kiểm duyệt.
3. Comment/reply hỗ trợ cây nhiều cấp; bài bị khóa không nhận bình luận mới.
4. Like/unlike post và comment dùng toán tử atomic, chống tăng/giảm count khi request lặp.
5. Category mặc định được seed idempotent; `postCount` tính từ bài đã xuất bản.
6. Detail tăng `viewCount`; popular sắp theo pin, lượt xem, like và bình luận.
7. Search dùng weighted text index trên title, tags và content; list hỗ trợ category, pagination và sort.

---

### Sprint 13: Chat (1 tuần) — Hoàn thành 2026-08-22

| Task | Người | Priority | Mô tả | Trạng thái |
|------|-------|---------|--------|---|
| T13.1 | KIEN | HIGH | MongoDB collections: conversations, messages | ✅ |
| T13.2 | KIEN | HIGH | Conversation management | ✅ |
| T13.3 | KIEN | HIGH | Send/receive messages | ✅ |
| T13.4 | KIEN | HIGH | Socket.IO integration | ✅ |
| T13.5 | KIEN | HIGH | Real-time message delivery | ✅ |
| T13.6 | HUY | HIGH | Read receipts | ✅ |
| T13.7 | KIEN | MEDIUM | Typing indicators | ✅ |

#### Luồng Chat đã triển khai

1. Hai collection `conversations` và `messages` dùng Mongoose; UUID liên service lưu dạng string, quan hệ conversation-message nội bộ dùng ObjectId.
2. Mọi REST API và WebSocket handshake đều xác thực JWT; chỉ participant của conversation được xem, gửi, đóng, join room, đánh dấu đọc hoặc phát typing.
3. Conversation hỗ trợ tạo/lấy lại theo user-store-context, danh sách theo người dùng, chi tiết kèm lịch sử phân trang và trạng thái `ACTIVE/CLOSED`.
4. Message hỗ trợ `TEXT`, `IMAGE`, `FILE`, `ORDER`, `BOOK`, `SYSTEM`; ghi MongoDB trước khi cập nhật `lastMessage`, unread count và phát realtime.
5. Socket.IO chạy cùng Community Service tại namespace `/chat`, room theo user và conversation; có message delivery, online/offline và alias tương thích tài liệu API cũ.
6. Read receipt cập nhật atomic các message chưa đọc, `readAt`, `readBy`, status `READ` và reset unread count của đúng người đọc.
7. Typing start/stop chỉ phát realtime cho participant còn lại, không lưu MongoDB. Sự kiện `chat.message.sent` được phát qua RabbitMQ cho Sprint 15.

---

### Sprint 14: Reviews & Ratings (0.5 tuần) — Hoàn thành 2026-08-22

| Task | Người | Priority | Mô tả |
|------|-------|---------|--------|
| T14.1 | HUY | HIGH | ✅ MongoDB collections: `reviews`, `review_replies` |
| T14.2 | HUY | HIGH | ✅ Book reviews CRUD |
| T14.3 | HUY | HIGH | ✅ Store reviews CRUD và business reply |
| T14.4 | HUY | HIGH | ✅ Rating aggregation, lọc theo sao và helpful |
| T14.5 | HUY | MEDIUM | ✅ Verified purchase badge qua Commerce Service |

**Luồng đã hoàn thành:**

1. Người dùng gửi review sách/cửa hàng; Community Service xác thực access token và từ chối review trùng đang hoạt động.
2. Community gọi Commerce Service bằng token hiện tại để xác nhận đơn và seller order đã `COMPLETED`; review sách còn phải đúng format đã mua.
3. Review hợp lệ được lưu `PENDING_REVIEW`, có snapshot tác giả, mã đơn/seller order/store và `verifiedPurchase=true`, sau đó phát `review.created`.
4. API công khai chỉ trả review `PUBLISHED`, hỗ trợ phân trang/lọc số sao, rating summary, helpful idempotent và business reply.
5. Business chỉ được phản hồi review gắn với cửa hàng mà thành viên đó thuộc về; báo cáo/duyệt nội dung thuộc Sprint 16.

---

### Sprint 15: Notifications (0.5 tuần) — Hoàn thành 2026-08-22

| Task | Người | Priority | Mô tả |
|------|-------|---------|--------|
| T15.1 | KIEN | HIGH | ✅ MongoDB collections: notifications, preferences, devices |
| T15.2 | KIEN | HIGH | ✅ In-app notifications REST API và Socket.IO |
| T15.3 | KIEN | HIGH | ✅ Notification preferences |
| T15.4 | HUY | MEDIUM | ✅ Firebase Cloud Messaging setup |
| T15.5 | KIEN | MEDIUM | ✅ Push notification triggers |

#### Luồng Notifications đã triển khai

1. Community Service nhận event RabbitMQ từ Order, Payment, Shipping, Chat, Review và Forum; `sourceKey = eventId:recipientId:type` chống tạo trùng khi event được gửi lại.
2. Preferences được kiểm tra trước khi lưu. Notification hợp lệ được lưu MongoDB, phát realtime tại namespace `/notifications`, sau đó mới gửi FCM đến các device token đang hoạt động.
3. Người dùng có thể phân trang/lọc notification, xem chi tiết, đánh dấu đọc một/tất cả, xóa một/tất cả và theo dõi `unreadCount`; mọi thao tác đều giới hạn theo `sub` trong JWT.
4. Settings hỗ trợ nhóm in-app, email và push; device token unique được đăng ký lại cho thiết bị/người dùng hiện tại và token FCM không hợp lệ sẽ bị vô hiệu hóa.
5. Firebase tự tắt an toàn ở local khi credentials thiếu hoặc còn placeholder; khi cấu hình thật, SDK gửi theo batch tối đa 500 token.

---

### Sprint 16: Moderation (0.5 tuần)

| Task | Người | Priority | Mô tả |
|------|-------|---------|--------|
| T16.1 | HUY | HIGH | Report system |
| T16.2 | HUY | HIGH | Content moderation workflow |
| T16.3 | HUY | MEDIUM | Admin moderation tools |
| T16.4 | HUY | MEDIUM | Auto-moderation (basic) |

---

## 📊 Progress Tracking

```
✅ Sprint 12: Forum
✅ Sprint 13: Chat
✅ Sprint 14: Reviews & Ratings
✅ Sprint 15: Notifications
⬜ Sprint 16: Moderation

📦 Deliverables Phase 4:
- [x] Forum với comments
- [x] Real-time Chat
- [x] Reviews & Ratings
- [x] In-app Notifications
- [ ] Content moderation
```

---

## 🔗 Dependencies

- Sprint 12-16 có thể chạy song song với Phase 3
- Sprint 15 cần Sprint 13 (Chat) xong cho notification events

---

## 📝 Notes

**KIEN:** Real-time (Chat, Socket.IO), Notifications
**HUY:** Forum, Reviews, Moderation
