# 🔔 Notification API

## GET /notifications

Get user's notifications.

### Request

```http
GET /api/v1/notifications?page=1&limit=20&isRead=false
Authorization: Bearer <access_token>
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| page | integer | Page number |
| limit | integer | Items per page |
| isRead | boolean | Filter by read status |
| type | string | Filter by notification type |

### Response 200

```json
{
  "data": [
    {
      "id": "notif-uuid",
      "type": "ORDER_STATUS",
      "title": "Đơn hàng đã được xác nhận",
      "message": "Đơn hàng HUK202608140001 đã được xác nhận bởi Tech Books Store",
      "payload": {
        "orderId": "order-uuid",
        "orderCode": "HUK202608140001",
        "status": "CONFIRMED"
      },
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-08-14T10:00:00.000Z"
    },
    {
      "id": "notif-uuid-2",
      "type": "NEW_REVIEW",
      "title": "Có đánh giá mới",
      "message": "Người dùng đã đánh giá sách của bạn 5 sao",
      "payload": {
        "reviewId": "review-uuid",
        "bookId": "book-uuid",
        "rating": 5
      },
      "isRead": true,
      "readAt": "2026-08-14T11:00:00.000Z",
      "createdAt": "2026-08-14T09:00:00.000Z"
    }
  ],
  "pagination": {...},
  "unreadCount": 15
}
```

---

## GET /notifications/:id

Get notification details.

### Request

```http
GET /api/v1/notifications/notif-uuid
Authorization: Bearer <access_token>
```

---

## PATCH /notifications/:id/read

Mark notification as read.

### Request

```http
PATCH /api/v1/notifications/notif-uuid/read
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "id": "notif-uuid",
    "isRead": true,
    "readAt": "2026-08-14T12:00:00.000Z"
  }
}
```

---

## POST /notifications/read-all

Mark all notifications as read.

### Request

```http
POST /api/v1/notifications/read-all
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "All notifications marked as read",
  "data": {
    "unreadCount": 0
  }
}
```

---

## DELETE /notifications/:id

Delete a notification.

### Request

```http
DELETE /api/v1/notifications/notif-uuid
Authorization: Bearer <access_token>
```

---

## DELETE /notifications/clear-all

Clear all notifications.

### Request

```http
DELETE /api/v1/notifications/clear-all
Authorization: Bearer <access_token>
```

---

## GET /notifications/settings

Get notification settings.

### Request

```http
GET /api/v1/notifications/settings
Authorization: Bearer <access_token>
```

### Response 200

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

---

## PATCH /notifications/settings

Update notification settings.

### Request

```http
PATCH /api/v1/notifications/settings
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "promotions": false,
  "emailNotifications": {
    "promotions": true
  },
  "pushNotifications": {
    "orderUpdates": false
  }
}
```

---

## FCM Device Registration

### POST /notifications/device

Register a device for push notifications.

### Request

```http
POST /api/v1/notifications/device
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "deviceToken": "fcm_device_token_xxx",
  "deviceType": "ANDROID",
  "appVersion": "1.0.0"
}
```

### Response 200

```json
{
  "message": "Device registered"
}
```

---

## DELETE /notifications/device/:token

Unregister a device.

### Request

```http
DELETE /api/v1/notifications/device/fcm_device_token_xxx
Authorization: Bearer <access_token>
```

---

## Notification Types

| Type | Description | Payload |
|------|-------------|---------|
| ORDER_STATUS | Cập nhật trạng thái đơn hàng | orderId, status |
| ORDER_MESSAGE | Tin nhắn từ người bán | orderId, message |
| PAYMENT_SUCCESS | Thanh toán thành công | orderId |
| PAYMENT_FAILED | Thanh toán thất bại | orderId |
| SHIPPING_UPDATE | Cập nhật vận chuyển | shipmentId, status |
| NEW_REVIEW | Đánh giá mới | reviewId, rating |
| NEW_REPLY | Phản hồi đánh giá | reviewId |
| NEW_MESSAGE | Tin nhắn mới | conversationId |
| VOUCHER_EXPIRING | Voucher sắp hết hạn | voucherId |
| VOUCHER_NEW | Voucher mới | voucherId |
| FORUM_MENTION | Được nhắc đến | postId |
| SYSTEM | Thông báo hệ thống | - |
| BOOK_ACCESS | Cấp quyền đọc sách | bookId |

---

## WebSocket Events (Real-time)

```javascript
// Receive notification in real-time
socket.on('notification', (notification) => {
  console.log('New notification:', notification);
  // Update UI or show toast
});

// Notification read by another device
socket.on('notification_read', (data) => {
  console.log('Notification read:', data.notificationId);
});
```

---

## Push Notification Format

### Android

```json
{
  "notification": {
    "title": "Đơn hàng đã được xác nhận",
    "body": "Đơn hàng HUK202608140001 đã được xác nhận",
    "click_action": "OPEN_ORDER_DETAIL",
    "data": {
      "orderId": "order-uuid",
      "type": "ORDER_STATUS"
    }
  }
}
```

### iOS

```json
{
  "aps": {
    "alert": {
      "title": "Đơn hàng đã được xác nhận",
      "body": "Đơn hàng HUK202608140001 đã được xác nhận"
    },
    "sound": "default",
    "badge": 1,
    "click_action": "OPEN_ORDER_DETAIL"
  },
  "orderId": "order-uuid",
  "type": "ORDER_STATUS"
}
```
