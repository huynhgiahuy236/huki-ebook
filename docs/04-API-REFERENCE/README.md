# 📚 API Reference

## Base URL

```
Development: http://localhost:3000/api/v1
Staging: https://staging.huki-ebook.com/api/v1
Production: https://api.huki-ebook.com/api/v1
```

## Authentication

All protected endpoints require Bearer token:

```http
Authorization: Bearer <access_token>
```

## Endpoints

### [Auth](endpoints/auth.md)
- POST /auth/register - Register new user
- POST /auth/login - Login
- POST /auth/logout - Logout
- POST /auth/refresh - Refresh token
- POST /auth/forgot-password - Forgot password
- POST /auth/reset-password - Reset password
- PATCH /auth/password - Change password

### [Business](endpoints/business.md)
- POST /businesses - Register business
- GET /businesses/my - Get my business
- GET /businesses/:id - Get business
- PATCH /businesses/:id - Update business
- POST /businesses/:id/stores - Create store
- GET /businesses/:id/stores - Get stores
- POST /businesses/:id/members/invite - Invite member
- GET /businesses/:id/members - Get members
- POST /invitations/:token/accept - Accept invitation

### [Catalog](endpoints/catalog.md)
- GET /categories - List categories
- GET /categories/:id - Get category
- POST /categories - Create category (Admin)
- GET /authors - List authors
- GET /authors/:slug - Get author
- POST /authors - Create author
- GET /publishers - List publishers
- GET /publishers/:slug - Get publisher
- POST /publishers - Create publisher
- GET /search - Search catalog

### [Books](endpoints/books.md)
- GET /books - List books
- GET /books/:slug - Get book
- POST /books - Create book
- PATCH /books/:id - Update book
- DELETE /books/:id - Delete book
- POST /books/:id/publish - Publish book
- PATCH /books/:id/inventory - Update inventory
- GET /books/:id/read - Get reading URL (Digital)

### [Cart](endpoints/cart.md)
- GET /cart - Get cart
- POST /cart/items - Add to cart
- PATCH /cart/items/:bookId - Update quantity
- DELETE /cart/items/:bookId - Remove from cart
- DELETE /cart - Clear cart
- POST /cart/merge - Merge guest cart

### [Orders](endpoints/orders.md)
- POST /orders - Create order
- GET /orders - List user orders
- GET /orders/:id - Get order details
- POST /orders/:id/cancel - Cancel order
- GET /seller/orders - List seller orders
- PATCH /seller/orders/:id/status - Update order status

### [Payment](endpoints/payment.md)
- POST /payments/orders/:orderId/initiate - Create/reuse PayOS payment link
- POST /payments/webhooks/payos - Signed PayOS webhook
- GET /payments/orders/:orderId - Get payment/refund status
- POST /payments/orders/:orderId/refunds - Request refund
- POST /payments/refunds/:refundId/settle - Admin refund reconciliation

### [Shipping](endpoints/shipping.md)
- GET /shipping/fee - Calculate shipping fee
- POST /shipping/address - Save address
- GET /shipping/address - Get addresses
- PATCH /shipping/address/:id - Update address
- DELETE /shipping/address/:id - Delete address
- GET /shipments - Get shipments
- GET /shipments/tracking/:trackingNumber - Track shipment
- GET /shipments/:id - Get shipment details
- PATCH /shipments/:id/status - Update shipment status
- POST /shipments/:id/assign - Assign delivery staff (Admin)
- POST /delivery-staff - Create delivery staff (Admin)
- GET /delivery-staff - List delivery staff (Admin)
- PATCH /delivery-staff/:id - Update delivery staff (Admin)
- POST /callbacks/ghtk - Signed carrier callback

### [Vouchers](endpoints/vouchers.md)
- GET /vouchers - List vouchers
- POST /vouchers - Create voucher (Admin/Seller)
- GET /vouchers/:code - Get voucher by code
- POST /vouchers/:code/validate - Validate voucher

### [Forum](endpoints/forum.md)
- GET /forum/posts - List posts
- POST /forum/posts - Create post
- GET /forum/posts/:id - Get post
- PATCH /forum/posts/:id - Update post
- DELETE /forum/posts/:id - Delete post
- POST /forum/posts/:id/like - Like post
- GET /forum/posts/:id/comments - Get comments
- POST /forum/posts/:id/comments - Add comment

### [Chat](endpoints/chat.md)
- GET /chat/conversations - List conversations
- POST /chat/conversations - Start conversation
- GET /chat/conversations/:id - Conversation detail
- GET /chat/conversations/:id/messages - Get messages
- POST /chat/conversations/:id/messages - Send message
- PATCH /chat/conversations/:id/read - Mark messages as read
- POST /chat/conversations/:id/close - Close conversation
- WS /chat - WebSocket connection

### [Reviews](endpoints/reviews.md)
- POST /reviews - Create review
- GET /reviews/book/:bookId - Get book reviews
- GET /reviews/store/:storeId - Get store reviews
- PATCH /reviews/:id - Update review
- DELETE /reviews/:id - Delete review

### [Notifications](endpoints/notifications.md)
- GET /notifications - Get notifications
- PATCH /notifications/:id/read - Mark as read
- PATCH /notifications/read-all - Mark all as read
- DELETE /notifications/:id - Delete notification

## Common Responses

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-08-14T08:00:00.000Z"
}
```

### Error Response

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [...]
}
```

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| Auth | 10 requests/minute |
| Cart | 100 requests/minute |
| Orders | 50 requests/minute |
| Others | 100 requests/minute |

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource not found |
| 409 | Conflict - Duplicate resource |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |
