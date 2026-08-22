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
  participants: [String],
  type: String, // USER_USER, USER_BUSINESS
  lastMessage: {
    content: String,
    senderId: String,
    sentAt: Date,
  },
  unreadCount: Map, // userId -> count
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date,
}

db.conversations.createIndex({ participants: 1, updatedAt: -1 });
```

### messages

```javascript
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: String,
  content: String,
  type: String, // TEXT, IMAGE, FILE, SYSTEM
  attachments: [{
    type: String,
    url: String,
    name: String,
  }],
  readBy: [String],
  status: String, // SENT, DELIVERED, READ
  createdAt: Date,
}

db.messages.createIndex({ conversationId: 1, createdAt: 1 });
```

### reviews

```javascript
{
  _id: ObjectId,
  authorId: String,
  targetType: String, // BOOK, STORE
  targetId: String,
  rating: Number, // 1-5
  title: String,
  content: String,
  images: [String],
  verified: Boolean, // Verified purchase
  helpful: [String],
  helpfulCount: Number,
  response: {
    content: String,
    respondedAt: Date,
  },
  status: String,
  createdAt: Date,
  updatedAt: Date,
}

db.reviews.createIndex({ targetId: 1, targetType: 1, createdAt: -1 });
```

### notifications

```javascript
{
  _id: ObjectId,
  recipientId: String,
  type: String, // ORDER, CHAT, FORUM, REVIEW, SYSTEM
  title: String,
  body: String,
  data: Object,
  imageUrl: String,
  actionUrl: String,
  isRead: Boolean,
  readAt: Date,
  createdAt: Date,
}

db.notifications.createIndex({ recipientId: 1, createdAt: -1 });
db.notifications.createIndex({ recipientId: 1, isRead: 1 });
```

## Notes

- Document-based for flexibility
- Full-text search via text indexes
- Soft delete via `status` field
- Aggregation pipelines for analytics
