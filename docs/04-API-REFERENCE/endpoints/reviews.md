# ⭐ Review API

## GET /books/:id/reviews

Get reviews for a book.

### Request

```http
GET /api/v1/books/book-uuid/reviews?page=1&limit=10&rating=5
```

### Response 200

```json
{
  "data": [
    {
      "id": "review-uuid",
      "rating": 5,
      "title": "Sách hay nên đọc",
      "content": "Cuốn sách rất chi tiết và dễ hiểu...",
      "author": {
        "id": "user-uuid",
        "fullName": "Nguyen Van A",
        "avatar": "https://example.com/avatar.jpg"
      },
      "verifiedPurchase": true,
      "format": "DIGITAL",
      "helpfulCount": 25,
      "isHelpful": false,
      "images": [
        {
          "url": "https://example.com/review-img.jpg",
          "thumbnail": "https://example.com/review-img-thumb.jpg"
        }
      ],
      "replies": [
        {
          "id": "reply-uuid",
          "content": "Cảm ơn bạn đã review!",
          "business": {
            "id": "store-uuid",
            "name": "Tech Books Store"
          },
          "createdAt": "2026-08-14T11:00:00.000Z"
        }
      ],
      "status": "PUBLISHED",
      "createdAt": "2026-08-14T10:00:00.000Z"
    }
  ],
  "pagination": {...},
  "summary": {
    "averageRating": 4.5,
    "totalReviews": 128,
    "ratingDistribution": {
      "5": 64,
      "4": 32,
      "3": 16,
      "2": 8,
      "1": 8
    }
  }
}
```

---

## POST /books/:id/reviews

Create a review for a book.

### Request

```http
POST /api/v1/books/book-uuid/reviews
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 5,
  "title": "Sách hay nên đọc",
  "content": "Cuốn sách rất chi tiết và dễ hiểu...",
  "format": "DIGITAL",
  "images": ["https://example.com/review-img.jpg"]
}
```

### Response 201

```json
{
  "message": "Review submitted",
  "data": {
    "id": "review-uuid",
    "status": "PENDING_REVIEW",
    "createdAt": "2026-08-14T10:00:00.000Z"
  }
}
```

### Response 409

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "You have already reviewed this book",
  "code": "REVIEW_ALREADY_EXISTS"
}
```

### Response 400

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Purchase verification required",
  "code": "REVIEW_PURCHASE_REQUIRED"
}
```

---

## PATCH /reviews/:id

Update own review.

### Request

```http
PATCH /api/v1/reviews/review-uuid
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 4,
  "title": "Updated title",
  "content": "Updated content..."
}
```

---

## DELETE /reviews/:id

Delete own review.

### Request

```http
DELETE /api/v1/reviews/review-uuid
Authorization: Bearer <access_token>
```

---

## POST /reviews/:id/helpful

Mark review as helpful.

### Request

```http
POST /api/v1/reviews/review-uuid/helpful
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "helpfulCount": 26,
    "isHelpful": true
  }
}
```

---

## DELETE /reviews/:id/helpful

Unmark review as helpful.

### Request

```http
DELETE /api/v1/reviews/review-uuid/helpful
Authorization: Bearer <access_token>
```

---

## POST /reviews/:id/report

Report a review.

### Request

```http
POST /api/v1/reviews/review-uuid/report
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "SPAM",
  "description": "Nội dung không liên quan"
}
```

---

## POST /reviews/:id/reply

Reply to a review (Business only).

### Request

```http
POST /api/v1/reviews/review-uuid/reply
Authorization: Bearer <access_token> (Business role)
Content-Type: application/json

{
  "content": "Cảm ơn bạn đã phản hồi!"
}
```

### Response 201

```json
{
  "message": "Reply added",
  "data": {
    "id": "reply-uuid",
    "content": "Cảm ơn bạn đã phản hồi!",
    "createdAt": "2026-08-14T11:00:00.000Z"
  }
}
```

---

## STORE REVIEWS

## GET /stores/:id/reviews

Get reviews for a store.

### Request

```http
GET /api/v1/stores/store-uuid/reviews?page=1&limit=10
```

### Response 200

```json
{
  "data": [
    {
      "id": "store-review-uuid",
      "rating": 4,
      "title": "Cửa hàng tốt",
      "content": "Giao hàng nhanh, đóng gói cẩn thận...",
      "author": {
        "id": "user-uuid",
        "fullName": "Nguyen Van A",
        "avatar": "https://example.com/avatar.jpg"
      },
      "orderId": "order-uuid",
      "helpfulCount": 15,
      "createdAt": "2026-08-14T10:00:00.000Z"
    }
  ],
  "pagination": {...},
  "summary": {
    "averageRating": 4.2,
    "totalReviews": 45,
    "ratingDistribution": {...}
  }
}
```

---

## POST /stores/:id/reviews

Create store review.

### Request

```http
POST /api/v1/stores/store-uuid/reviews
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 4,
  "title": "Cửa hàng tốt",
  "content": "Giao hàng nhanh, đóng gói cẩn thận...",
  "orderId": "order-uuid"
}
```

---

## Review Status

| Status | Description |
|--------|-------------|
| PENDING_REVIEW | Chờ kiểm duyệt |
| PUBLISHED | Đã xuất bản |
| HIDDEN | Bị ẩn |
| DELETED | Đã xóa |
| FLAGGED | Bị báo cáo |

---

## Review Report Reasons

| Reason | Description |
|--------|-------------|
| SPAM | Spam, quảng cáo |
| FAKE | Review giả mạo |
| OFFENSIVE | Nội dung phản cảm |
| IRRELEVANT | Không liên quan |
| OTHER | Lý do khác |
