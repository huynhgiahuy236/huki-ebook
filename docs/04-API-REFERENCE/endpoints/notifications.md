# 🔔 Notification API

**Trạng thái:** ✅ Sprint 15 hoàn thành ngày 2026-08-22<br>
**Base URL:** `/api/v1`<br>
Tất cả REST endpoint và WebSocket handshake đều yêu cầu access token.

## GET /notifications

Lấy notification của người dùng hiện tại, mới nhất trước.

```http
GET /api/v1/notifications?page=1&limit=20&isRead=false&type=ORDER_STATUS
Authorization: Bearer <access_token>
```

| Query | Quy tắc |
|---|---|
| `page` | Số nguyên từ 1, mặc định 1 |
| `limit` | Từ 1 đến 100, mặc định 20 |
| `isRead` | `true` hoặc `false` |
| `type` | Một notification type hợp lệ |

```json
{
  "data": [
    {
      "id": "66bdce20493f476fec2eab10",
      "type": "ORDER_STATUS",
      "title": "Đơn hàng đã được xác nhận",
      "message": "Đơn hàng HUK202608140001 đã được xác nhận.",
      "payload": {
        "orderId": "11111111-1111-4111-8111-111111111111",
        "status": "CONFIRMED"
      },
      "actionUrl": "/orders/11111111-1111-4111-8111-111111111111",
      "isRead": false,
      "createdAt": "2026-08-22T10:00:00.000Z",
      "updatedAt": "2026-08-22T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 },
  "unreadCount": 1
}
```

`unreadCount` luôn tính toàn bộ notification chưa đọc của người dùng, không phụ thuộc bộ lọc trang hiện tại.

## GET /notifications/:id

Lấy chi tiết một notification thuộc người dùng hiện tại. `id` là MongoDB ObjectId.

```http
GET /api/v1/notifications/66bdce20493f476fec2eab10
Authorization: Bearer <access_token>
```

## PATCH /notifications/:id/read

Đánh dấu đã đọc theo cách idempotent và phát `notification_read` đến các thiết bị đang kết nối.

```http
PATCH /api/v1/notifications/66bdce20493f476fec2eab10/read
Authorization: Bearer <access_token>
```

## POST /notifications/read-all

Đánh dấu tất cả notification của người dùng là đã đọc.

```http
POST /api/v1/notifications/read-all
Authorization: Bearer <access_token>
```

```json
{
  "message": "All notifications marked as read",
  "data": { "unreadCount": 0 }
}
```

## DELETE /notifications/:id

Xóa một notification thuộc người dùng hiện tại.

## DELETE /notifications/clear-all

Xóa tất cả notification thuộc người dùng hiện tại và trả về `deletedCount`.

## GET /notifications/settings

Lấy settings; document mặc định được tạo idempotent ở lần truy cập đầu tiên.

```json
{
  "data": {
    "orderUpdates": true,
    "promotions": true,
    "newReviews": true,
    "chatMessages": true,
    "forumActivity": true,
    "emailNotifications": {
      "orderUpdates": true,
      "promotions": false,
      "newsletter": true
    },
    "pushNotifications": {
      "enabled": true,
      "orderUpdates": true,
      "chatMessages": true
    }
  }
}
```

## PATCH /notifications/settings

Cập nhật một phần settings. Các object lồng nhau được merge theo từng trường, không ghi đè sibling không có trong request.

```http
PATCH /api/v1/notifications/settings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "promotions": false,
  "pushNotifications": { "orderUpdates": false }
}
```

## POST /notifications/device

Đăng ký hoặc refresh một FCM device token. Token unique được chuyển sang user hiện tại khi đăng ký lại.

```http
POST /api/v1/notifications/device
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "deviceToken": "fcm_device_token_with_at_least_20_characters",
  "deviceType": "ANDROID",
  "appVersion": "1.0.0"
}
```

`deviceType`: `ANDROID`, `IOS` hoặc `WEB`.

## DELETE /notifications/device/:token

Hủy token nếu token đó thuộc người dùng hiện tại.

## Realtime Socket.IO

Kết nối cùng cổng Community Service tại namespace `/notifications`:

```javascript
const socket = io('http://localhost:3005/notifications', {
  auth: { token: accessToken },
  transports: ['websocket'],
});

socket.on('notification', (notification) => {});
socket.on('notification_read', ({ notificationId }) => {});
socket.on('notification_read_all', ({ unreadCount }) => {});
```

Socket chỉ join room `user:<sub>` lấy từ JWT; client không được tự chọn recipient room.

## Notification types

| Type | Nguồn hiện tại |
|---|---|
| `ORDER_STATUS` | Order created/confirmed/shipped/cancelled/completed |
| `PAYMENT_SUCCESS`, `PAYMENT_FAILED` | Payment/order events |
| `SHIPPING_UPDATE` | Shipping status/staff assignment |
| `NEW_MESSAGE` | `chat.message.sent` |
| `NEW_REVIEW` | `review.created` |
| `FORUM_MENTION` | Comment/reply activity |
| `ORDER_MESSAGE`, `NEW_REPLY`, `VOUCHER_EXPIRING`, `VOUCHER_NEW`, `SYSTEM`, `BOOK_ACCESS` | Dành cho producer tương ứng khi được triển khai |

## Delivery và idempotency

1. RabbitMQ consumer tạo `sourceKey = eventId:recipientId:type`.
2. Nếu preferences cho loại đó bị tắt, notification không được tạo.
3. MongoDB upsert unique bảo đảm event redelivery không tạo hoặc phát lại notification.
4. Sau khi lưu thành công, Community phát realtime và gửi FCM nếu push được bật.
5. FCM chia tối đa 500 token mỗi batch; token không hợp lệ bị chuyển `enabled=false`.
6. Khi Firebase credentials thiếu hoặc còn placeholder, FCM được tắt an toàn; in-app và realtime vẫn hoạt động.
