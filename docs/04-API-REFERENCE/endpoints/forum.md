# 💬 Forum API

## GET /forum/posts

Get list of forum posts.

### Request

```http
GET /api/v1/forum/posts?page=1&limit=20&category=general&search=javascript
Authorization: Bearer <access_token> (Optional)
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| limit | integer | Items per page |
| category | string | Filter by category |
| search | string | Search in title/content |
| sort | string | Sort field (created_at, view_count, like_count) |
| order | string | Sort order (asc, desc) |

### Response 200

```json
{
  "data": [
    {
      "id": "post-uuid",
      "title": "Review sách Clean Code",
      "content": "Tôi vừa đọc xong cuốn Clean Code...",
      "author": {
        "id": "user-uuid",
        "fullName": "Nguyen Van A",
        "avatar": "https://example.com/avatar.jpg"
      },
      "category": {
        "id": "cat-uuid",
        "name": "Review sách"
      },
      "tags": ["clean-code", "programming"],
      "viewCount": 1250,
      "likeCount": 45,
      "commentCount": 23,
      "status": "PUBLISHED",
      "isLiked": false,
      "createdAt": "2026-08-14T10:00:00.000Z",
      "updatedAt": "2026-08-14T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## GET /forum/posts/:id

Get post details with comments.

### Request

```http
GET /api/v1/forum/posts/post-uuid
Authorization: Bearer <access_token> (Optional)
```

### Response 200

```json
{
  "data": {
    "id": "post-uuid",
    "title": "Review sách Clean Code",
    "content": "Tôi vừa đọc xong cuốn Clean Code...",
    "author": {
      "id": "user-uuid",
      "fullName": "Nguyen Van A",
      "avatar": "https://example.com/avatar.jpg"
    },
    "category": {
      "id": "cat-uuid",
      "name": "Review sách"
    },
    "tags": ["clean-code", "programming"],
    "coverImage": "https://example.com/post-cover.jpg",
    "viewCount": 1251,
    "likeCount": 45,
    "commentCount": 23,
    "status": "PUBLISHED",
    "isLiked": true,
    "createdAt": "2026-08-14T10:00:00.000Z",
    "updatedAt": "2026-08-14T10:00:00.000Z",
    "comments": [
      {
        "id": "comment-uuid",
        "content": "Bài viết rất hay, cảm ơn bạn!",
        "author": {
          "id": "user-uuid-2",
          "fullName": "Tran Thi B",
          "avatar": "https://example.com/avatar2.jpg"
        },
        "likeCount": 5,
        "isLiked": false,
        "createdAt": "2026-08-14T11:00:00.000Z",
        "replies": [
          {
            "id": "reply-uuid",
            "content": "Cảm ơn bạn đã phản hồi!",
            "author": {
              "id": "user-uuid",
              "fullName": "Nguyen Van A"
            },
            "createdAt": "2026-08-14T12:00:00.000Z"
          }
        ]
      }
    ]
  }
}
```

---

## POST /forum/posts

Create a new post.

### Request

```http
POST /api/v1/forum/posts
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Review sách Clean Code",
  "content": "Tôi vừa đọc xong cuốn Clean Code...",
  "categoryId": "cat-uuid",
  "tags": ["clean-code", "programming"],
  "coverImage": "https://example.com/post-cover.jpg"
}
```

### Validation Rules

| Field | Rules |
|-------|-------|
| title | Required, 10-200 characters |
| content | Required, 50-50000 characters |
| categoryId | Required, must exist |
| tags | Optional, max 5 tags |
| coverImage | Optional, valid URL |

### Response 201

```json
{
  "message": "Post created successfully",
  "data": {
    "id": "post-uuid",
    "title": "Review sách Clean Code",
    "status": "PENDING_REVIEW",
    "createdAt": "2026-08-14T10:00:00.000Z"
  }
}
```

---

## PATCH /forum/posts/:id

Update a post.

### Request

```http
PATCH /api/v1/forum/posts/post-uuid
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "title": "Updated title",
  "content": "Updated content...",
  "tags": ["updated-tags"]
}
```

### Response 200

```json
{
  "message": "Post updated successfully",
  "data": {
    "id": "post-uuid",
    "title": "Updated title",
    "updatedAt": "2026-08-14T11:00:00.000Z"
  }
}
```

---

## DELETE /forum/posts/:id

Delete a post.

### Request

```http
DELETE /api/v1/forum/posts/post-uuid
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Post deleted successfully"
}
```

---

## POST /forum/posts/:id/like

Like a post.

### Request

```http
POST /api/v1/forum/posts/post-uuid/like
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "isLiked": true,
    "likeCount": 46
  }
}
```

---

## DELETE /forum/posts/:id/like

Unlike a post.

### Request

```http
DELETE /api/v1/forum/posts/post-uuid/like
Authorization: Bearer <access_token>
```

---

## POST /forum/posts/:id/comments

Add comment to a post.

### Request

```http
POST /api/v1/forum/posts/post-uuid/comments
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": "Bài viết rất hay, cảm ơn bạn!"
}
```

### Response 201

```json
{
  "message": "Comment added",
  "data": {
    "id": "comment-uuid",
    "content": "Bài viết rất hay, cảm ơn bạn!",
    "likeCount": 0,
    "createdAt": "2026-08-14T11:00:00.000Z"
  }
}
```

---

## POST /forum/comments/:id/replies

Reply to a comment.

### Request

```http
POST /api/v1/forum/comments/comment-uuid/replies
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": "Cảm ơn bạn đã phản hồi!"
}
```

---

## DELETE /forum/comments/:id

Delete a comment.

### Request

```http
DELETE /api/v1/forum/comments/comment-uuid
Authorization: Bearer <access_token>
```

---

## POST /forum/posts/:id/report

Report a post.

### Request

```http
POST /api/v1/forum/posts/post-uuid/report
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "SPAM",
  "description": "Bài viết chứa nội dung quảng cáo"
}
```

### Response 201

```json
{
  "message": "Report submitted",
  "data": {
    "reportId": "report-uuid"
  }
}
```

---

## Categories

### GET /forum/categories

Get all categories.

### Response 200

```json
{
  "data": [
    {
      "id": "cat-uuid-1",
      "name": "Thảo luận chung",
      "slug": "general",
      "postCount": 150,
      "icon": "💬"
    },
    {
      "id": "cat-uuid-2",
      "name": "Review sách",
      "slug": "reviews",
      "postCount": 85,
      "icon": "📚"
    },
    {
      "id": "cat-uuid-3",
      "name": "Hỏi đáp",
      "slug": "qa",
      "postCount": 42,
      "icon": "❓"
    }
  ]
}
```

---

## Forum Post Status

| Status | Description |
|--------|-------------|
| PENDING_REVIEW | Chờ kiểm duyệt |
| PUBLISHED | Đã xuất bản |
| HIDDEN | Bị ẩn (tạm thời) |
| DELETED | Đã xóa |
| FLAGGED | Bị báo cáo |

---

## Report Reasons

| Reason | Description |
|--------|-------------|
| SPAM | Spam, quảng cáo |
| HARASSMENT | Quấy rối, lăng mạ |
| OFFENSIVE | Nội dung phản cảm |
| MISINFORMATION | Thông tin sai lệch |
| COPYRIGHT | Vi phạm bản quyền |
| OTHER | Lý do khác |
