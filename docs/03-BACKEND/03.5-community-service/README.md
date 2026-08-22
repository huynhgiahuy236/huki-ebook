# 💬 Community Service

**Port:** 3005
**Database:** MongoDB (community_db)

## Overview

The Community Service handles all social features: forum discussions, real-time chat, reviews, and notifications.

Sprint 12 Forum, Sprint 13 Chat và Sprint 14 Reviews & Ratings hoàn thành ngày 2026-08-22. Notification CRUD/realtime và Moderation vẫn thuộc các sprint tiếp theo.

Community lấy `sub`, `fullName`, `avatar` và `role` từ access token do Identity phát hành để lưu author snapshot; access token cũ thiếu profile claims sẽ fallback về email.

## Responsibilities

- Forum (posts, comments, likes)
- Real-time chat (Socket.IO)
- Reviews & ratings
- Notifications
- Reports & moderation
- Content search

## Tech Stack

- **Framework:** NestJS
- **Database:** MongoDB with Mongoose
- **Real-time:** Socket.IO
- **Cache:** Redis; adapter Socket.IO dùng khi triển khai nhiều instance
- **Push Notifications:** Firebase Cloud Messaging

## Architecture

```
┌─────────────────────────────────────────────┐
│         Community Service (3005)            │
├─────────────────────────────────────────────┤
│                                             │
│   ┌─────────┐ �─────────┐ ┌─────────┐     │
│   │ Forum   │ │  Chat   │ │ Reviews │     │
│   │ Module  │ │ Module  │ │ Module  │     │
│   └─────────┘ └─────────┘ └─────────┘     │
│        │           │           │           │
│        ▼           ▼           ▼           │
│   ┌─────────────────────────────────┐     │
│   │      Notifications Module        │     │
│   └─────────────────────────────────�     │
│        │                                   │
│        ▼                                   │
│   ┌─────────────────────────────────┐     │
│   │     Socket.IO + Mongoose         │     │
│   └─────────────────────────────────┘     │
│        │                                   │
│        ▼                                   │
│   ┌─────────────────────────────┐         │
│   │   MongoDB + Redis           │         │
│   └─────────────────────────────┘         │
│                                             │
└─────────────────────────────────────────────┘
```

## Database Schema (MongoDB Collections)

### Forums Collection

```javascript
{
  _id: ObjectId,
  title: String,
  slug: String,
  content: String,         // HTML/Markdown
  authorId: String,        // UUID from Identity
  authorName: String,
  authorAvatar: String,
  categoryId: ObjectId,    // Ref to forum_categories
  tags: [String],
  bookId: String,          // Optional: related book
  storeId: String,         // Optional: related store
  likes: [String],         // Array of user IDs
  likeCount: Number,
  commentCount: Number,
  viewCount: Number,
  isPinned: Boolean,
  isLocked: Boolean,
  status: String,          // PUBLISHED, HIDDEN, DELETED
  attachments: [{
    type: String,          // IMAGE, FILE
    url: String,
  }],
  createdAt: Date,
  updatedAt: Date,
}

// Indexes
db.forums.createIndex({ authorId: 1, createdAt: -1 });
db.forums.createIndex({ bookId: 1, createdAt: -1 });
db.forums.createIndex({ categoryId: 1, status: 1, createdAt: -1 });
db.forums.createIndex({ title: 'text', content: 'text', tags: 'text' }, { name: 'forums_text_search' });
```

### Forum Categories Collection

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String,       // unique
  description: String,
  icon: String,
  sortOrder: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
}
```

### Comments Collection

```javascript
{
  _id: ObjectId,
  postId: ObjectId,        // Ref to forums
  authorId: String,
  authorName: String,
  content: String,
  parentId: ObjectId,      // For nested comments
  likes: [String],
  likeCount: Number,
  isEdited: Boolean,
  status: String,
  createdAt: Date,
  updatedAt: Date,
}

db.comments.createIndex({ postId: 1, createdAt: 1 });
db.comments.createIndex({ authorId: 1 });
```

### Conversations Collection

```javascript
{
  _id: ObjectId,
  participants: [{
    type: String,          // USER, BUSINESS
    id: String,            // Identity/store UUID
    name: String,
    avatar: String,
  }],
  type: String,            // USER_TO_STORE
  context: {
    type: String,          // BOOK, ORDER
    id: String,
  },
  status: String,          // ACTIVE, CLOSED
  lastMessage: {
    id: ObjectId,
    content: String,
    senderType: String,
    senderId: String,
    createdAt: Date,
  },
  unreadCount: Map,        // participant UUID -> count
  createdAt: Date,
  updatedAt: Date,
}

db.conversations.createIndex({ "participants.id": 1, status: 1 });
db.conversations.createIndex({ "participants.id": 1, updatedAt: -1 });
db.conversations.createIndex({ type: 1, status: 1 });
db.conversations.createIndex({ "participants.id": 1, "context.type": 1, "context.id": 1 });
```

### Messages Collection

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderType: String,      // USER, BUSINESS
  senderId: String,
  senderName: String,
  senderAvatar: String,
  content: String,
  messageType: String,     // TEXT, IMAGE, FILE, ORDER, BOOK, SYSTEM
  attachments: [{
    type: String,
    url: String,
    name: String,
    thumbnail: String,
    size: Number,
  }],
  readBy: [String],        // User IDs who read
  status: String,          // SENT, DELIVERED, READ
  deliveredAt: Date,
  readAt: Date,
  createdAt: Date,
  updatedAt: Date,
}

db.messages.createIndex({ conversationId: 1, createdAt: -1 });
db.messages.createIndex({ senderId: 1, createdAt: -1 });
db.messages.createIndex({ conversationId: 1, status: 1, createdAt: -1 });
```

### Reviews Collection

```javascript
{
  _id: ObjectId,
  targetType: String,      // BOOK, STORE
  targetId: String,
  rating: Number,          // 1-5
  title: String,
  content: String,
  authorId: String,        // UUID from Identity
  authorName: String,
  authorAvatar: String,
  format: String,          // PHYSICAL, DIGITAL; book review only
  verifiedPurchase: Boolean,
  orderId: String,
  sellerOrderId: String,
  storeId: String,
  images: [{ url: String, thumbnail: String }],
  helpful: [String],       // User UUIDs; hidden by default
  helpfulCount: Number,
  status: String,          // PENDING_REVIEW, PUBLISHED, HIDDEN, DELETED, FLAGGED
  moderatedBy: String,
  moderatedAt: Date,
  moderationNote: String,
  createdAt: Date,
  updatedAt: Date,
}

db.reviews.createIndex({ targetType: 1, targetId: 1, status: 1, createdAt: -1 });
db.reviews.createIndex({ targetType: 1, targetId: 1, status: 1, rating: 1 });
db.reviews.createIndex({ authorId: 1, status: 1, createdAt: -1 });
db.reviews.createIndex({ storeId: 1, status: 1, createdAt: -1 });
```

### Review Replies Collection

```javascript
{
  _id: ObjectId,
  reviewId: ObjectId,
  businessId: String,
  storeId: String,
  responderId: String,
  businessName: String,
  content: String,
  status: String,          // ACTIVE, DELETED
  createdAt: Date,
  updatedAt: Date,
}

db.review_replies.createIndex({ reviewId: 1, status: 1, createdAt: 1 });
db.review_replies.createIndex({ businessId: 1, createdAt: -1 });
```

### Notifications Collection

```javascript
{
  _id: ObjectId,
  recipientId: String,
  type: String,            // ORDER, CHAT, FORUM, REVIEW, SYSTEM
  title: String,
  body: String,
  data: Object,            // Additional payload
  imageUrl: String,
  actionUrl: String,       // Deep link
  isRead: Boolean,
  readAt: Date,
  createdAt: Date,
}

db.notifications.createIndex({ recipientId: 1, createdAt: -1 });
db.notifications.createIndex({ recipientId: 1, isRead: 1 });
```

### Reports Collection

```javascript
{
  _id: ObjectId,
  reporterId: String,
  targetType: String,      // FORUM, COMMENT, REVIEW, USER, STORE
  targetId: String,
  reason: String,
  description: String,
  status: String,          // PENDING, REVIEWING, RESOLVED, DISMISSED
  resolvedBy: String,
  resolvedAt: Date,
  action: String,          // NONE, WARN, HIDE, DELETE, BAN
  createdAt: Date,
  updatedAt: Date,
}

db.reports.createIndex({ status: 1, createdAt: -1 });
```

## Real-time Features (Socket.IO)

### Connection

```typescript
const socket = io('https://api.huki-ebook.com/chat', {
  auth: { token: accessToken },
  transports: ['websocket'],
});
```

### Events

#### Client → Server
- `conversation:join` - Join conversation
- `conversation:leave` - Leave conversation
- `message:send` - Send message
- `typing:start` - Start typing
- `typing:stop` - Stop typing
- `message:read` - Mark messages as read

#### Server → Client
- `message:new` - New message received
- `message:delivered` - Message delivered
- `message:read` - Message read
- `typing:user` - User typing
- `user:online` - User online
- `user:offline` - User offline

Các alias `join_conversation`, `leave_conversation`, `send_message`, `typing`, `new_message`, `message_read` và `user_typing` vẫn được hỗ trợ để tương thích client theo tài liệu API cũ. Socket.IO chạy cùng cổng HTTP của Community Service tại namespace `/chat`; Redis adapter chỉ cần khi scale nhiều instance.

### Scaling with Redis Adapter

```typescript
// For multiple instances
import { RedisAdapter } from '@socket.io/redis-adapter';

await app.useWebSocketAdapter(new RedisAdapter(redisClient, redisClient.duplicate()));
```

## API Endpoints

### Forum
- GET /forum/posts - List posts
- GET /forum/posts/popular - Popular published posts
- POST /forum/posts - Create post
- GET /forum/posts/:id - Get post
- PATCH /forum/posts/:id - Update post
- DELETE /forum/posts/:id - Delete post
- POST /forum/posts/:id/like - Like post
- GET /forum/posts/:id/comments - Get comments
- POST /forum/posts/:id/comments - Add comment
- POST/DELETE /forum/comments/:id/like - Like/unlike comment
- POST /forum/comments/:id/replies - Reply to comment
- DELETE /forum/comments/:id - Soft-delete own comment
- GET /forum/categories - List active categories

### Chat
- GET /chat/conversations - List conversations
- POST /chat/conversations - Start conversation
- GET /chat/conversations/:id - Conversation detail with paginated messages
- GET /chat/conversations/:id/messages - Get messages
- POST /chat/conversations/:id/messages - Send message
- PATCH /chat/conversations/:id/read - Mark incoming messages as read
- POST /chat/conversations/:id/close - Close conversation

### Reviews
- GET/POST /books/:id/reviews - List/create book review
- GET/POST /stores/:id/reviews - List/create store review
- PATCH /reviews/:id - Update review
- DELETE /reviews/:id - Delete review
- POST/DELETE /reviews/:id/helpful - Mark/unmark helpful
- POST /reviews/:id/reply - Reply as owning business

Review creation gọi Commerce Service để xác minh đơn hoàn thành. Business reply gọi Business Service để xác minh thành viên thuộc cửa hàng. Review mới/sau chỉnh sửa giữ `PENDING_REVIEW`; report và publish/hide thuộc Sprint 16.

### Notifications
- GET /notifications - Get notifications
- PATCH /notifications/:id/read - Mark as read
- PATCH /notifications/read-all - Mark all as read

## Content Moderation

- Auto-flag posts with profanity
- Manual review queue for reported content
- Admin actions: warn, hide, delete, ban
- Rate limiting for posts/comments

## Events

### Emitted
- `forum.post.created`
- `forum.comment.created`
- `chat.message.sent`
- `review.created`
- `notification.created`
- `user.reported`

### Received
- `ORDER_COMPLETED` → Send review request notification
- `ORDER_CREATED`, `ORDER_PAID`, `ORDER_CANCELLED`, `SELLER_ORDER_CONFIRMED`, `SELLER_ORDER_CANCELLED`, `PAYMENT_FAILED` → Save idempotent order confirmation notifications
- `business.approved` → Welcome notification

Sprint 11 chỉ triển khai consumer và lưu notification xác nhận đơn idempotent. Notification CRUD, preferences, realtime và Firebase vẫn thuộc Sprint 15.

## Configuration

```env
MONGODB_URI=mongodb://localhost:27017/community_db
RABBITMQ_URL=amqp://guest:guest123@localhost:5672
RABBITMQ_EXCHANGE=huki.events
REDIS_HOST=localhost
REDIS_PORT=6379

# Chat attachments
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY=xxx
FIREBASE_CLIENT_EMAIL=xxx

# Socket.IO (same port as Community Service)
SOCKET_CORS_ORIGIN=*

# Review purchase/business verification
COMMERCE_SERVICE_URL=http://localhost:3003
BUSINESS_SERVICE_URL=http://localhost:3002
```

## Local Development

```bash
npm install
npm run test:community
npm run start:community
```

## Related Documentation

- [API Reference](../../04-API-REFERENCE/endpoints/forum.md)
- [API Reference - Chat](../../04-API-REFERENCE/endpoints/chat.md)
- [API Reference - Reviews](../../04-API-REFERENCE/endpoints/reviews.md)
- [Database Schema](../../05-DATABASE/community-db/README.md)
