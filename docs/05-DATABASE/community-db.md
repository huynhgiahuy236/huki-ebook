# 🗄️ Community Database Schema (MongoDB)

Chi tiết collections cho Community Service (MongoDB).

## Collections Overview

```javascript
// Forum Posts
db.forums.insertOne({
  _id: ObjectId(),
  title: "Review sách Clean Code",
  content: "Tôi vừa đọc xong...",
  authorId: UUID,
  authorName: "Nguyen Van A",
  authorAvatar: "url",
  categoryId: ObjectId(), // Ref to forum_categories
  tags: ["clean-code", "programming"],
  likes: [UUID],
  viewCount: 1250,
  likeCount: 45,
  commentCount: 23,
  status: "PUBLISHED",
  isPinned: false,
  isLocked: false,
  moderatedBy: UUID,
  moderatedAt: ISODate(),
  moderationNote: "Approved",
  createdAt: ISODate(),
  updatedAt: ISODate()
});

// Forum Categories
db.forum_categories.insertOne({
  _id: ObjectId(),
  name: "Review sách",
  slug: "reviews",
  icon: "📚",
  sortOrder: 2,
  isActive: true,
  createdAt: ISODate(),
  updatedAt: ISODate()
});

// Comments
db.comments.insertOne({
  _id: ObjectId(),
  postId: ObjectId(),
  parentId: ObjectId(), // For replies
  content: "Bài viết rất hay!",
  authorId: UUID,
  authorName: "Tran Thi B",
  authorAvatar: "url",
  likes: [UUID],
  likeCount: 5,
  status: "PUBLISHED",
  createdAt: ISODate(),
  updatedAt: ISODate()
});

// Conversations (Chat)
db.conversations.insertOne({
  _id: ObjectId(),
  participants: [
    { type: "USER", id: UUID, name: "Nguyen Van A", avatar: "url" },
    { type: "BUSINESS", id: UUID, name: "Tech Books Store", avatar: "url" }
  ],
  type: "USER_TO_STORE",
  context: {
    type: "BOOK",
    id: UUID
  },
  status: "ACTIVE",
  lastMessage: {
    id: ObjectId(),
    content: "Cảm ơn bạn!",
    senderType: "USER",
    createdAt: ISODate()
  },
  unreadCount: {
    "user-uuid": 2,
    "store-uuid": 0
  },
  createdAt: ISODate(),
  updatedAt: ISODate()
});

// Messages
db.messages.insertOne({
  _id: ObjectId(),
  conversationId: ObjectId(),
  senderType: "USER",
  senderId: UUID,
  senderName: "Nguyen Van A",
  senderAvatar: "url",
  content: "Cho tôi hỏi về sách này",
  messageType: "TEXT",
  attachments: [{
    type: "image",
    url: "url",
    thumbnail: "thumb-url",
    size: 12345
  }],
  status: "DELIVERED",
  readBy: [UUID],
  deliveredAt: ISODate(),
  readAt: ISODate(),
  createdAt: ISODate()
});

// Reviews
db.reviews.insertOne({
  _id: ObjectId(),
  targetType: "BOOK", // BOOK, STORE
  targetId: UUID,
  rating: 5,
  title: "Sách hay",
  content: "Nội dung chi tiết...",
  authorId: UUID,
  authorName: "Nguyen Van A",
  authorAvatar: "url",
  format: "DIGITAL", // For book reviews
  verifiedPurchase: true,
  orderId: UUID,
  sellerOrderId: UUID,
  storeId: UUID,
  storeOwnerId: UUID, // Snapshot used by notification routing
  images: [{
    url: "url",
    thumbnail: "thumb-url"
  }],
  helpful: [UUID],
  helpfulCount: 20,
  status: "PUBLISHED",
  moderatedBy: UUID,
  moderatedAt: ISODate(),
  moderationNote: "Approved",
  createdAt: ISODate(),
  updatedAt: ISODate()
});

// Review Replies
db.review_replies.insertOne({
  _id: ObjectId(),
  reviewId: ObjectId(),
  businessId: UUID,
  storeId: UUID,
  responderId: UUID,
  businessName: "Tech Books Store",
  content: "Cảm ơn bạn đã phản hồi!",
  status: "ACTIVE",
  createdAt: ISODate(),
  updatedAt: ISODate()
});

// Notifications
db.notifications.insertOne({
  _id: ObjectId(),
  recipientId: UUID,
  sourceKey: "event-id:user-id:ORDER_STATUS",
  recipientType: "USER",
  type: "ORDER_STATUS",
  title: "Đơn hàng đã được xác nhận",
  message: "Đơn hàng HUK202608140001 đã được xác nhận",
  payload: {
    orderId: UUID,
    status: "CONFIRMED"
  },
  imageUrl: null,
  actionUrl: "/orders/order-uuid",
  isRead: false,
  readAt: null,
  expiresAt: ISODate(),
  createdAt: ISODate(),
  updatedAt: ISODate()
});

// Notification Preferences
db.notification_preferences.insertOne({
  recipientId: UUID,
  orderUpdates: true,
  promotions: true,
  newReviews: true,
  chatMessages: true,
  forumActivity: true,
  emailNotifications: {
    orderUpdates: true,
    promotions: false,
    newsletter: true
  },
  pushNotifications: {
    enabled: true,
    orderUpdates: true,
    chatMessages: true
  },
  createdAt: ISODate(),
  updatedAt: ISODate()
});

// FCM Devices
db.notification_devices.insertOne({
  recipientId: UUID,
  deviceToken: "fcm-token",
  deviceType: "ANDROID", // ANDROID, IOS, WEB
  appVersion: "1.0.0",
  enabled: true,
  lastSeenAt: ISODate(),
  createdAt: ISODate(),
  updatedAt: ISODate()
});

// Reports
db.reports.insertOne({
  _id: ObjectId(),
  reporterId: UUID,
  targetType: "POST", // POST, COMMENT, REVIEW, USER, STORE
  targetId: UUID,
  reason: "SPAM",
  description: "Nội dung quảng cáo",
  status: "PENDING",
  reviewedBy: UUID,
  reviewedAt: ISODate(),
  resolution: "DELETED",
  resolutionNote: "Content violates community guidelines",
  createdAt: ISODate()
});
```

## Indexes

```javascript
// Forums indexes
db.forums.createIndex({ authorId: 1 });
db.forums.createIndex({ categoryId: 1, status: 1, createdAt: -1 });
db.forums.createIndex({ tags: 1 });
db.forums.createIndex({ status: 1, viewCount: -1 });
db.forums.createIndex(
  { title: "text", content: "text", tags: "text" },
  { name: "forums_text_search", weights: { title: 10, tags: 5, content: 1 } }
);

// Forum category indexes
db.forum_categories.createIndex({ slug: 1 }, { unique: true });
db.forum_categories.createIndex({ isActive: 1, sortOrder: 1, name: 1 });

// Comments indexes
db.comments.createIndex({ postId: 1, status: 1, createdAt: 1 });
db.comments.createIndex({ parentId: 1 });
db.comments.createIndex({ authorId: 1 });

// Conversations indexes
db.conversations.createIndex({ "participants.id": 1, status: 1 });
db.conversations.createIndex({ "participants.id": 1, updatedAt: -1 });
db.conversations.createIndex({ type: 1, status: 1 });
db.conversations.createIndex({ "participants.id": 1, "context.type": 1, "context.id": 1 });

// Messages indexes
db.messages.createIndex({ conversationId: 1, createdAt: -1 });
db.messages.createIndex({ senderId: 1, createdAt: -1 });
db.messages.createIndex({ conversationId: 1, status: 1, createdAt: -1 });

// Reviews indexes
db.reviews.createIndex({ targetType: 1, targetId: 1, status: 1, createdAt: -1 });
db.reviews.createIndex({ targetType: 1, targetId: 1, status: 1, rating: 1 });
db.reviews.createIndex({ authorId: 1, status: 1, createdAt: -1 });
db.reviews.createIndex({ storeId: 1, status: 1, createdAt: -1 });
db.reviews.createIndex(
  { authorId: 1, targetType: 1, targetId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ["PENDING_REVIEW", "PUBLISHED", "HIDDEN", "FLAGGED"] }
    }
  }
);

// Review replies indexes
db.review_replies.createIndex({ reviewId: 1, status: 1, createdAt: 1 });
db.review_replies.createIndex({ businessId: 1, createdAt: -1 });
db.review_replies.createIndex(
  { reviewId: 1, storeId: 1 },
  { unique: true, partialFilterExpression: { status: "ACTIVE" } }
);

// Notifications indexes
db.notifications.createIndex({ sourceKey: 1 }, { unique: true });
db.notifications.createIndex({ recipientId: 1, createdAt: -1 });
db.notifications.createIndex({ recipientId: 1, isRead: 1, createdAt: -1 });
db.notifications.createIndex({ recipientId: 1, type: 1, createdAt: -1 });
db.notifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.notification_preferences.createIndex({ recipientId: 1 }, { unique: true });
db.notification_devices.createIndex({ deviceToken: 1 }, { unique: true });
db.notification_devices.createIndex({ recipientId: 1, enabled: 1 });

// Reports indexes
db.reports.createIndex({ status: 1, createdAt: 1 });
db.reports.createIndex({ targetType: 1, targetId: 1 });
```

## Aggregation Examples

```javascript
// Get posts with pagination and sorting
db.forums.aggregate([
  { $match: { status: "PUBLISHED", isDeleted: false } },
  { $sort: { isPinned: -1, createdAt: -1 } },
  { $skip: 0 },
  { $limit: 20 },
  {
    $lookup: {
      from: "users",
      localField: "authorId",
      foreignField: "_id",
      as: "author"
    }
  },
  { $unwind: "$author" },
  {
    $project: {
      title: 1,
      content: 1,
      authorName: 1,
      authorAvatar: 1,
      viewCount: 1,
      likeCount: 1,
      commentCount: 1,
      tags: 1,
      createdAt: 1
    }
  }
]);

// Get review summary for a book
db.reviews.aggregate([
  { $match: { targetId: UUID, targetType: "BOOK", status: "PUBLISHED" } },
  {
    $group: {
      _id: null,
      averageRating: { $avg: "$rating" },
      totalReviews: { $sum: 1 },
      rating5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
      rating4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
      rating3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
      rating2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
      rating1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } }
    }
  }
]);

// Search posts
db.forums.find({
  $text: { $search: "javascript clean code" }
}, {
  score: { $meta: "textScore" }
}).sort({
  score: { $meta: "textScore" }
});
```

## Data Migration Examples

```javascript
// Add isDeleted field to existing posts
db.forums.updateMany(
  { isDeleted: { $exists: false } },
  { $set: { isDeleted: false } }
);

// Add createdAt if missing
db.notifications.updateMany(
  { createdAt: { $exists: false } },
  { $set: { createdAt: new Date() } }
);

// Clean up old expired notifications
db.notifications.deleteMany({
  expiresAt: { $lt: new Date() }
});
```
