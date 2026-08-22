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

### Sprint 13: Chat (1 tuần)

| Task | Người | Priority | Mô tả |
|------|-------|---------|--------|
| T13.1 | KIEN | HIGH | MongoDB collections: conversations, messages |
| T13.2 | KIEN | HIGH | Conversation management |
| T13.3 | KIEN | HIGH | Send/receive messages |
| T13.4 | KIEN | HIGH | Socket.IO integration |
| T13.5 | KIEN | HIGH | Real-time message delivery |
| T13.6 | HUY | HIGH | Read receipts |
| T13.7 | KIEN | MEDIUM | Typing indicators |

---

### Sprint 14: Reviews & Ratings (0.5 tuần)

| Task | Người | Priority | Mô tả |
|------|-------|---------|--------|
| T14.1 | HUY | HIGH | MongoDB collections: reviews, reviewReplies |
| T14.2 | HUY | HIGH | Book reviews CRUD |
| T14.3 | HUY | HIGH | Store reviews CRUD |
| T14.4 | HUY | HIGH | Rating aggregation |
| T14.5 | HUY | MEDIUM | Verified purchase badge |

---

### Sprint 15: Notifications (0.5 tuần)

| Task | Người | Priority | Mô tả |
|------|-------|---------|--------|
| T15.1 | KIEN | HIGH | MongoDB collection: notifications |
| T15.2 | KIEN | HIGH | In-app notifications |
| T15.3 | KIEN | HIGH | Notification preferences |
| T15.4 | HUY | MEDIUM | Firebase Cloud Messaging setup |
| T15.5 | KIEN | MEDIUM | Push notification triggers |

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
⬜ Sprint 13: Chat
⬜ Sprint 14: Reviews & Ratings
⬜ Sprint 15: Notifications
⬜ Sprint 16: Moderation

📦 Deliverables Phase 4:
- [x] Forum với comments
- [ ] Real-time Chat
- [ ] Reviews & Ratings
- [ ] In-app Notifications
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
