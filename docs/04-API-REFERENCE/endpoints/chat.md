# 💬 Chat API

> **Implementation status:** Sprint 13 hoàn thành ngày 2026-08-22. REST API và Socket.IO đều yêu cầu access token hợp lệ; người gọi phải là participant của conversation.

## GET /chat/conversations

Get list of user's conversations.

### Request

```http
GET /api/v1/chat/conversations
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": [
    {
      "id": "conv-uuid",
      "type": "USER_TO_STORE",
      "user": {
        "id": "user-uuid",
        "fullName": "Nguyen Van A",
        "avatar": "https://example.com/avatar.jpg"
      },
      "store": {
        "id": "store-uuid",
        "name": "Tech Books Store",
        "logo": "https://example.com/logo.jpg"
      },
      "lastMessage": {
        "id": "msg-uuid",
        "content": "Cảm ơn bạn đã phản hồi!",
        "senderType": "USER",
        "createdAt": "2026-08-14T11:30:00.000Z"
      },
      "unreadCount": 2,
      "context": {
        "type": "ORDER",
        "id": "order-uuid"
      },
      "updatedAt": "2026-08-14T11:30:00.000Z"
    }
  ]
}
```

---

## GET /chat/conversations/:id

Get conversation details with messages.

### Request

```http
GET /api/v1/chat/conversations/conv-uuid?page=1&limit=50
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "id": "conv-uuid",
    "type": "USER_TO_STORE",
    "user": {
      "id": "user-uuid",
      "fullName": "Nguyen Van A",
      "avatar": "https://example.com/avatar.jpg"
    },
    "store": {
      "id": "store-uuid",
      "name": "Tech Books Store",
      "logo": "https://example.com/logo.jpg"
    },
    "status": "ACTIVE",
    "context": {
      "type": "ORDER",
      "id": "order-uuid"
    },
    "messages": [
      {
        "id": "msg-uuid-1",
        "senderType": "USER",
        "senderId": "user-uuid",
        "senderName": "Nguyen Van A",
        "content": "Cho tôi hỏi về sách Clean Code",
        "messageType": "TEXT",
        "status": "READ",
        "createdAt": "2026-08-14T10:00:00.000Z"
      },
      {
        "id": "msg-uuid-2",
        "senderType": "BUSINESS",
        "senderId": "staff-uuid",
        "senderName": "Store Staff",
        "content": "Xin chào! Cuốn Clean Code hiện còn hàng.",
        "messageType": "TEXT",
        "status": "READ",
        "createdAt": "2026-08-14T10:05:00.000Z"
      },
      {
        "id": "msg-uuid-3",
        "senderType": "BUSINESS",
        "senderId": "staff-uuid",
        "senderName": "Store Staff",
        "content": "https://example.com/book.jpg",
        "messageType": "IMAGE",
        "attachments": [
          {
            "type": "image",
            "url": "https://example.com/book.jpg",
            "thumbnail": "https://example.com/book-thumb.jpg"
          }
        ],
        "status": "READ",
        "createdAt": "2026-08-14T10:06:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25,
      "hasNext": false
    }
  }
}
```

---

## GET /chat/conversations/:id/messages

Get paginated messages without conversation metadata. Results are returned in chronological order within the requested page.

```http
GET /api/v1/chat/conversations/66c8109ebf5d9342a772dabc/messages?page=1&limit=50
Authorization: Bearer <access_token>
```

The response contains `data` and `pagination` using the same message and pagination structures shown by the conversation detail endpoint.

---

## POST /chat/conversations

Create or get existing conversation.

### Request

```http
POST /api/v1/chat/conversations
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "storeId": "store-uuid",
  "contextType": "BOOK",
  "contextId": "book-uuid",
  "initialMessage": "Cho tôi hỏi về sách này"
}
```

### Response 201

```json
{
  "message": "Conversation created",
  "data": {
    "id": "conv-uuid",
    "messages": [
      {
        "id": "msg-uuid",
        "content": "Cho tôi hỏi về sách này",
        "messageType": "TEXT",
        "status": "SENT",
        "createdAt": "2026-08-14T10:00:00.000Z"
      }
    ]
  }
}
```

---

## POST /chat/conversations/:id/messages

Send a message.

### Request

```http
POST /api/v1/chat/conversations/conv-uuid/messages
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "content": "Cảm ơn bạn!",
  "messageType": "TEXT"
}
```

### With Attachment

```http
POST /api/v1/chat/conversations/conv-uuid/messages
Authorization: Bearer <access_token>
Content-Type: multipart/form-data

content: "Đây là hình ảnh sách"
messageType: IMAGE
attachments: <file>
```

The `attachments` field accepts up to 10 files, each at most 10 MB. Images and files are uploaded to Cloudinary using the configured `CLOUDINARY_*` environment variables. JSON clients may also provide pre-uploaded attachment metadata (`type`, `url`, `name`, `thumbnail`, `size`).

### Response 201

```json
{
  "message": "Message sent",
  "data": {
    "id": "msg-uuid",
    "senderType": "USER",
    "senderId": "user-uuid",
    "senderName": "Nguyen Van A",
    "content": "Cảm ơn bạn!",
    "messageType": "TEXT",
    "status": "SENT",
    "createdAt": "2026-08-14T10:00:00.000Z"
  }
}
```

---

## PATCH /chat/conversations/:id/read

Mark all messages as read.

### Request

```http
PATCH /api/v1/chat/conversations/conv-uuid/read
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Marked as read"
}
```

---

## POST /chat/conversations/:id/close

Close a conversation.

### Request

```http
POST /api/v1/chat/conversations/conv-uuid/close
Authorization: Bearer <access_token>
```

---

## WebSocket Events

### Connect

```javascript
// Socket.IO uses the Community Service HTTP port and /chat namespace
const socket = io('http://localhost:3005/chat', {
  auth: {
    token: 'user_access_token'
  }
});
```

### Events

```javascript
// Receive new message
socket.on('message:new', (message) => {
  console.log('New message:', message);
  // Update UI
});

// Message read notification
socket.on('message:read', (data) => {
  console.log('Messages read:', data.messageIds);
});

// Typing indicator
socket.on('typing:user', (data) => {
  console.log('User typing:', data.conversationId);
});

// Online status
socket.on('user:online', (data) => {
  console.log('User online:', data.userId);
});
```

### Emit Events

```javascript
// Join conversation room
socket.emit('conversation:join', { conversationId: '66c8109ebf5d9342a772dabc' });

// Leave conversation room
socket.emit('conversation:leave', { conversationId: '66c8109ebf5d9342a772dabc' });

// Send typing indicator
socket.emit('typing:start', { conversationId: '66c8109ebf5d9342a772dabc' });
socket.emit('typing:stop', { conversationId: '66c8109ebf5d9342a772dabc' });

// Send message (alternative to REST)
socket.emit('message:send', {
  conversationId: '66c8109ebf5d9342a772dabc',
  content: 'Hello!',
  messageType: 'TEXT'
});

// Mark incoming messages as read
socket.emit('message:read', {
  conversationId: '66c8109ebf5d9342a772dabc'
});
```

Legacy aliases `join_conversation`, `leave_conversation`, `send_message`, `typing`, `new_message`, `message_read`, `user_typing` and `user_online` remain supported for older clients.

### Connection Handling

```javascript
// Handle disconnect
socket.on('disconnect', () => {
  console.log('Disconnected');
});

// Handle reconnect
socket.on('connect', () => {
  console.log('Connected');
  // Rejoin rooms if needed
});

// Handle auth error
socket.on('connect_error', (error) => {
  if (error.message === 'Authentication error') {
    // Redirect to login
    window.location.href = '/login';
  }
});
```

---

## Message Types

| Type | Description |
|------|-------------|
| TEXT | Text message |
| IMAGE | Image attachment |
| FILE | File attachment |
| ORDER | Order reference |
| BOOK | Book reference |
| SYSTEM | System message |

---

## Conversation Status

| Status | Description |
|--------|-------------|
| ACTIVE | Đang hoạt động |
| CLOSED | Đã đóng |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /chat/conversations/:id/messages | 60 | 1 minute |
| GET /chat/conversations | 60 | 1 minute |
| GET /chat/conversations/:id/messages | 60 | 1 minute |
