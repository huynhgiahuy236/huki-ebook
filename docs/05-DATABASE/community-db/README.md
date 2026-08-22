# 🗄️ Community Database (community_db)

**Engine:** MongoDB
**ODM:** Mongoose
**Service:** Community Service (3005)

## Overview

Stores forum, chat, reviews, and notifications.

## Collections

| Collection | Purpose |
|------------|---------|
| forums | Forum posts |
| forum_categories | Forum post categories |
| comments | Post comments |
| conversations | Chat conversations |
| messages | Chat messages |
| reviews | Reviews & ratings |
| notifications | User notifications |
| reports | Content reports |

## Schemas

### forums

```javascript
{
  _id: ObjectId,
  title: String,
  slug: String,
  content: String,
  authorId: String,
  authorName: String,
  authorAvatar: String,
  categoryId: ObjectId, // Ref to forum_categories
  tags: [String],
  bookId: String,
  storeId: String,
  likes: [String],
  likeCount: Number,
  commentCount: Number,
  viewCount: Number,
  isPinned: Boolean,
  isLocked: Boolean,
  status: String, // PUBLISHED, HIDDEN, DELETED
  attachments: [{
    type: String, // IMAGE, FILE
    url: String,
  }],
  createdAt: Date,
  updatedAt: Date,
}

// Indexes
db.forums.createIndex({ authorId: 1, createdAt: -1 });
db.forums.createIndex({ bookId: 1 });
db.forums.createIndex({ categoryId: 1, status: 1, createdAt: -1 });
db.forums.createIndex({ status: 1, viewCount: -1, likeCount: -1 });
db.forums.createIndex({ title: 'text', content: 'text', tags: 'text' }, { name: 'forums_text_search' });
```

### forum_categories

```javascript
{
  _id: ObjectId,
  name: String,
  slug: String, // unique
  description: String,
  icon: String,
  sortOrder: Number,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
}

db.forum_categories.createIndex({ slug: 1 }, { unique: true });
db.forum_categories.createIndex({ isActive: 1, sortOrder: 1, name: 1 });
```

### comments

```javascript
{
  _id: ObjectId,
  postId: ObjectId,
  authorId: String,
  authorName: String,
  content: String,
  parentId: ObjectId, // Nested comments
  likes: [String],
  likeCount: Number,
  isEdited: Boolean,
  status: String,
  createdAt: Date,
  updatedAt: Date,
}

db.comments.createIndex({ postId: 1, createdAt: 1 });
db.comments.createIndex({ parentId: 1 });
db.comments.createIndex({ authorId: 1, createdAt: -1 });
```

### conversations

```javascript
{
  _id: ObjectId,
  participants: [{
    type: String, // USER, BUSINESS
    id: String,
    name: String,
    avatar: String,
  }],
  type: String, // USER_TO_STORE
  context: {
    type: String, // BOOK, ORDER
    id: String,
  },
  status: String, // ACTIVE, CLOSED
  lastMessage: {
    id: ObjectId,
    content: String,
    senderType: String,
    senderId: String,
    createdAt: Date,
  },
  unreadCount: Map, // participant UUID -> count
  createdAt: Date,
  updatedAt: Date,
}

db.conversations.createIndex({ "participants.id": 1, status: 1 });
db.conversations.createIndex({ "participants.id": 1, updatedAt: -1 });
db.conversations.createIndex({ type: 1, status: 1 });
db.conversations.createIndex({ "participants.id": 1, "context.type": 1, "context.id": 1 });
```

### messages

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderType: String,
  senderId: String,
  senderName: String,
  senderAvatar: String,
  content: String,
  messageType: String, // TEXT, IMAGE, FILE, ORDER, BOOK, SYSTEM
  attachments: [{
    type: String,
    url: String,
    name: String,
    thumbnail: String,
    size: Number,
  }],
  readBy: [String],
  status: String, // SENT, DELIVERED, READ
  deliveredAt: Date,
  readAt: Date,
  createdAt: Date,
  updatedAt: Date,
}

db.messages.createIndex({ conversationId: 1, createdAt: -1 });
db.messages.createIndex({ senderId: 1, createdAt: -1 });
db.messages.createIndex({ conversationId: 1, status: 1, createdAt: -1 });
```

### reviews

```javascript
{
  _id: ObjectId,
  targetType: String, // BOOK, STORE
  targetId: String,
  rating: Number, // 1-5
  title: String,
  content: String,
  authorId: String,
  authorName: String,
  authorAvatar: String,
  format: String, // PHYSICAL, DIGITAL
  verifiedPurchase: Boolean,
  orderId: String,
  sellerOrderId: String,
  storeId: String,
  storeOwnerId: String,
  images: [{ url: String, thumbnail: String }],
  helpful: [String],
  helpfulCount: Number,
  status: String, // PENDING_REVIEW, PUBLISHED, HIDDEN, DELETED, FLAGGED
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

### review_replies

```javascript
{
  _id: ObjectId,
  reviewId: ObjectId,
  businessId: String,
  storeId: String,
  responderId: String,
  businessName: String,
  content: String,
  status: String, // ACTIVE, DELETED
  createdAt: Date,
  updatedAt: Date,
}

db.review_replies.createIndex({ reviewId: 1, status: 1, createdAt: 1 });
db.review_replies.createIndex({ businessId: 1, createdAt: -1 });
```

### notifications

```javascript
{
  _id: ObjectId,
  recipientId: String,
  sourceKey: String, // unique eventId:recipientId:type
  recipientType: String, // USER, BUSINESS, DELIVERY, ADMIN
  type: String,
  title: String,
  message: String,
  payload: Object,
  imageUrl: String,
  actionUrl: String,
  isRead: Boolean,
  readAt: Date,
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date,
}

db.notifications.createIndex({ recipientId: 1, createdAt: -1 });
db.notifications.createIndex({ recipientId: 1, isRead: 1, createdAt: -1 });
db.notifications.createIndex({ recipientId: 1, type: 1, createdAt: -1 });
db.notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

### notification_preferences

```javascript
{
  recipientId: String, // unique
  orderUpdates: Boolean,
  promotions: Boolean,
  newReviews: Boolean,
  chatMessages: Boolean,
  forumActivity: Boolean,
  emailNotifications: { orderUpdates, promotions, newsletter },
  pushNotifications: { enabled, orderUpdates, chatMessages },
  createdAt: Date,
  updatedAt: Date,
}
```

### notification_devices

```javascript
{
  recipientId: String,
  deviceToken: String, // unique
  deviceType: String, // ANDROID, IOS, WEB
  appVersion: String,
  enabled: Boolean,
  lastSeenAt: Date,
  createdAt: Date,
  updatedAt: Date,
}

db.notification_devices.createIndex({ recipientId: 1, enabled: 1 });
```

## Notes

- Document-based for flexibility
- Full-text search via text indexes
- Soft delete via `status` field
- Aggregation pipelines for analytics
