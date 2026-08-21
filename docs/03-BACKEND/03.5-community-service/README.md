# 💬 Community Service

**Port:** 3005
**Database:** MongoDB (community_db)

## Overview

The Community Service handles all social features: forum discussions, real-time chat, reviews, and notifications.

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
- **Cache:** Redis (Socket.IO adapter)
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
  category: String,        // BOOK_DISCUSSION, GENERAL, ANNOUNCEMENT
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
db.forums.createIndex({ category: 1, createdAt: -1 });
db.forums.createIndex({ title: 'text', content: 'text', tags: 'text' });
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
  participants: [String],  // Array of user IDs
  type: String,            // USER_USER, USER_BUSINESS
  lastMessage: {
    content: String,
    senderId: String,
    sentAt: Date,
  },
  unreadCount: Map,        // userId -> count
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
}

db.conversations.createIndex({ participants: 1, updatedAt: -1 });
```

### Messages Collection

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: String,
  content: String,
  type: String,            // TEXT, IMAGE, FILE, SYSTEM
  attachments: [{
    type: String,
    url: String,
    name: String,
  }],
  readBy: [String],        // User IDs who read
  status: String,          // SENT, DELIVERED, READ
  createdAt: Date,
}

db.messages.createIndex({ conversationId: 1, createdAt: 1 });
```

### Reviews Collection

```javascript
{
  _id: ObjectId,
  authorId: String,
  targetType: String,      // BOOK, STORE
  targetId: String,
  rating: Number,          // 1-5
  title: String,
  content: String,
  images: [String],
  verified: Boolean,       // Verified purchase
  helpful: [String],
  helpfulCount: Number,
  response: {              // Store/Business reply
    content: String,
    respondedAt: Date,
  },
  status: String,
  createdAt: Date,
  updatedAt: Date,
}

db.reviews.createIndex({ targetId: 1, targetType: 1, createdAt: -1 });
db.reviews.createIndex({ authorId: 1 });
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

### Scaling with Redis Adapter

```typescript
// For multiple instances
import { RedisAdapter } from '@socket.io/redis-adapter';

await app.useWebSocketAdapter(new RedisAdapter(redisClient, redisClient.duplicate()));
```

## API Endpoints

### Forum
- GET /forum/posts - List posts
- POST /forum/posts - Create post
- GET /forum/posts/:id - Get post
- PATCH /forum/posts/:id - Update post
- DELETE /forum/posts/:id - Delete post
- POST /forum/posts/:id/like - Like post
- GET /forum/posts/:id/comments - Get comments
- POST /forum/posts/:id/comments - Add comment

### Chat
- GET /chat/conversations - List conversations
- POST /chat/conversations - Start conversation
- GET /chat/conversations/:id/messages - Get messages
- POST /chat/conversations/:id/messages - Send message

### Reviews
- POST /reviews - Create review
- GET /reviews/book/:bookId - Get book reviews
- GET /reviews/store/:storeId - Get store reviews
- PATCH /reviews/:id - Update review
- DELETE /reviews/:id - Delete review

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

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=xxx
FIREBASE_PRIVATE_KEY=xxx
FIREBASE_CLIENT_EMAIL=xxx

# Socket.IO
SOCKET_PORT=3005
SOCKET_CORS_ORIGIN=*
```

## Local Development

```bash
npm install
npm run start:community
```

## Related Documentation

- [API Reference](../../04-API-REFERENCE/endpoints/forum.md)
- [API Reference - Chat](../../04-API-REFERENCE/endpoints/chat.md)
- [API Reference - Reviews](../../04-API-REFERENCE/endpoints/reviews.md)
- [Database Schema](../../05-DATABASE/community-db/README.md)
