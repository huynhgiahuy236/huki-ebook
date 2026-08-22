# ⭐ Review API

**Trạng thái:** ✅ Sprint 14 hoàn thành ngày 2026-08-22<br>
**Base URL:** `/api/v1`

Review được lưu tại Community Service. ID sách, cửa hàng và đơn hàng là UUID; ID review/reply là MongoDB ObjectId. API danh sách chỉ hiển thị review `PUBLISHED` và luôn tính rating summary trên toàn bộ review đã xuất bản, không phụ thuộc bộ lọc `rating` của trang hiện tại.

## GET /books/:id/reviews

Lấy review đã xuất bản của sách. Access token không bắt buộc; nếu có token, `isHelpful` được tính theo người dùng hiện tại.

```http
GET /api/v1/books/11111111-1111-4111-8111-111111111111/reviews?page=1&limit=10&rating=5
Authorization: Bearer <access_token> (optional)
```

Query: `page >= 1`, `limit` từ 1 đến 100, `rating` tùy chọn từ 1 đến 5.

```json
{
  "data": [
    {
      "id": "66bdce20493f476fec2eab10",
      "targetType": "BOOK",
      "targetId": "11111111-1111-4111-8111-111111111111",
      "rating": 5,
      "title": "Sách hay nên đọc",
      "content": "Cuốn sách rất chi tiết và dễ hiểu.",
      "author": {
        "id": "22222222-2222-4222-8222-222222222222",
        "fullName": "Nguyen Van A",
        "avatar": "https://example.com/avatar.jpg"
      },
      "verifiedPurchase": true,
      "format": "DIGITAL",
      "orderId": "33333333-3333-4333-8333-333333333333",
      "helpfulCount": 25,
      "isHelpful": false,
      "images": [{ "url": "https://example.com/review.jpg" }],
      "replies": [],
      "status": "PUBLISHED",
      "createdAt": "2026-08-22T10:00:00.000Z",
      "updatedAt": "2026-08-22T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 },
  "summary": {
    "averageRating": 4.5,
    "totalReviews": 128,
    "ratingDistribution": { "1": 8, "2": 8, "3": 16, "4": 32, "5": 64 }
  }
}
```

## POST /books/:id/reviews

Tạo review sách. Chỉ role `USER` được gửi và người dùng phải có seller order `COMPLETED` chứa đúng sách cùng `format` đã chọn. Mỗi người chỉ có một review chưa xóa cho mỗi sách.

```http
POST /api/v1/books/11111111-1111-4111-8111-111111111111/reviews
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 5,
  "title": "Sách hay nên đọc",
  "content": "Cuốn sách rất chi tiết và dễ hiểu.",
  "format": "DIGITAL",
  "images": ["https://example.com/review.jpg"]
}
```

Review hợp lệ được lưu ở trạng thái chờ Sprint 16 kiểm duyệt:

```json
{
  "message": "Review submitted",
  "data": {
    "id": "66bdce20493f476fec2eab10",
    "status": "PENDING_REVIEW",
    "verifiedPurchase": true,
    "createdAt": "2026-08-22T10:00:00.000Z"
  }
}
```

Lỗi nghiệp vụ:

- `400 REVIEW_PURCHASE_REQUIRED`: không tìm thấy giao dịch hoàn thành phù hợp.
- `409 REVIEW_ALREADY_EXISTS`: đã có review chưa xóa cho sách này.

## GET /stores/:id/reviews

Giống API danh sách review sách nhưng `targetType` là `STORE`.

```http
GET /api/v1/stores/44444444-4444-4444-8444-444444444444/reviews?page=1&limit=10
```

## POST /stores/:id/reviews

Tạo review cửa hàng. `orderId` phải là đơn của chính người dùng, đơn và seller order của đúng cửa hàng phải `COMPLETED`.

```http
POST /api/v1/stores/44444444-4444-4444-8444-444444444444/reviews
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 4,
  "title": "Cửa hàng tốt",
  "content": "Giao hàng nhanh và đóng gói cẩn thận.",
  "orderId": "33333333-3333-4333-8333-333333333333",
  "images": []
}
```

## PATCH /reviews/:id

Chỉ tác giả được sửa review chưa xóa. Các trường cho phép: `rating`, `title`, `content`, `images`. Sau khi sửa, review trở lại `PENDING_REVIEW` và thông tin kiểm duyệt cũ được xóa.

```http
PATCH /api/v1/reviews/66bdce20493f476fec2eab10
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "rating": 4,
  "title": "Đánh giá sau khi đọc lại",
  "content": "Nội dung đánh giá đã được cập nhật đầy đủ."
}
```

## DELETE /reviews/:id

Chỉ tác giả được soft-delete. Các reply đang hoạt động của review cũng được chuyển sang `DELETED`.

```http
DELETE /api/v1/reviews/66bdce20493f476fec2eab10
Authorization: Bearer <access_token>
```

## POST /reviews/:id/helpful

Đánh dấu một review `PUBLISHED` là hữu ích. Thao tác idempotent.

```http
POST /api/v1/reviews/66bdce20493f476fec2eab10/helpful
Authorization: Bearer <access_token>
```

```json
{ "data": { "helpfulCount": 26, "isHelpful": true } }
```

## DELETE /reviews/:id/helpful

Bỏ đánh dấu hữu ích. Thao tác idempotent.

```http
DELETE /api/v1/reviews/66bdce20493f476fec2eab10/helpful
Authorization: Bearer <access_token>
```

## POST /reviews/:id/reply

Chỉ role `BUSINESS` là thành viên của business sở hữu cửa hàng gắn với review được phản hồi. Mỗi cửa hàng có tối đa một reply `ACTIVE` trên một review.

```http
POST /api/v1/reviews/66bdce20493f476fec2eab10/reply
Authorization: Bearer <business_access_token>
Content-Type: application/json

{ "content": "Cảm ơn bạn đã phản hồi!" }
```

## Trạng thái review

| Status | Mô tả |
|---|---|
| `PENDING_REVIEW` | Chờ kiểm duyệt |
| `PUBLISHED` | Đã xuất bản và được tính rating |
| `HIDDEN` | Bị ẩn |
| `DELETED` | Đã xóa mềm |
| `FLAGGED` | Bị đánh dấu để xử lý |

## POST /reviews/:id/report

Yêu cầu đăng nhập. Chỉ report được review đang `PUBLISHED` hoặc vừa được `FLAGGED`; không thể tự report và không thể report trùng cùng target.

```http
POST /api/v1/reviews/66bdce20493f476fec2eab10/report
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "reason": "OFFENSIVE",
  "description": "Review có nội dung phản cảm"
}
```

Response `201` trả `reportId` và trạng thái `PENDING`. Luồng xử lý phía admin được mô tả tại [Moderation API](moderation.md).
