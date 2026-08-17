# 🔥 First API Call

Hướng dẫn test API đầu tiên.

## 📋 Prerequisites

- ✅ Backend services đang chạy
- ✅ API Gateway: http://localhost:3000
- ✅ Database đã migrated

## 🧪 Test Auth Flow

### 1. Register User

```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "fullName": "Test User",
    "phone": "0912345678"
  }'
```

**Expected Response (201):**

```json
{
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "uuid-xxx",
      "email": "test@example.com",
      "fullName": "Test User",
      "role": "USER",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 900
    }
  }
}
```

### 2. Login

```bash
# Login with credentials
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

**Expected Response (200):**

```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "uuid-xxx",
      "email": "test@example.com",
      "fullName": "Test User",
      "role": "USER",
      "status": "ACTIVE",
      "avatar": null
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 900
    }
  }
}
```

### 3. Get Current User

```bash
# Replace YOUR_ACCESS_TOKEN with the token from login response
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**

```json
{
  "data": {
    "id": "uuid-xxx",
    "email": "test@example.com",
    "fullName": "Test User",
    "role": "USER",
    "status": "ACTIVE",
    "avatar": null,
    "createdAt": "2026-08-14T00:00:00.000Z"
  }
}
```

### 4. Refresh Token

```bash
# Replace YOUR_REFRESH_TOKEN with the refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

### 5. Logout

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📚 Public Endpoints

### Browse Books

```bash
# Get all books
curl -X GET "http://localhost:3000/api/v1/books?page=1&limit=10"

# Search books
curl -X GET "http://localhost:3000/api/v1/books?search=javascript&category=programming"

# Get book detail
curl -X GET http://localhost:3000/api/v1/books/{bookId}
```

### Browse Stores

```bash
# Get all stores
curl -X GET "http://localhost:3000/api/v1/stores?page=1&limit=10"

# Get store detail
curl -X GET http://localhost:3000/api/v1/stores/{storeId}
```

## 🔐 Protected Endpoints

### Get User Profile

```bash
curl -X GET http://localhost:3000/api/v1/users/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Add to Cart

```bash
curl -X POST http://localhost:3000/api/v1/cart/items \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bookId": "book-uuid",
    "format": "DIGITAL",
    "quantity": 1
  }'
```

### Create Order (Checkout)

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "receiverName": "Test User",
      "phone": "0912345678",
      "addressLine": "123 Main St",
      "ward": "Ward 1",
      "province": "Ho Chi Minh City"
    },
    "paymentMethod": "ONLINE_PAYMENT"
  }'
```

## ❌ Error Handling

### 400 Bad Request

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "email must be a valid email"
    }
  ]
}
```

### 401 Unauthorized

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden

```json
{
  "statusCode": 403,
  "error": "Forbidden",
  "message": "You do not have permission to access this resource"
}
```

### 404 Not Found

```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 409 Conflict

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Email already exists"
}
```

## 🛠️ Using Thunder Client (VS Code)

Import collection:

```json
{
  "info": {
    "name": "HUKI EBOOK API",
    "schema": "https://schema.getThunder.cloud/v1"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Register",
          "request": {
            "method": "POST",
            "url": "http://localhost:3000/api/v1/auth/register",
            "header": [{"key": "Content-Type", "value": "application/json"}],
            "body": {"mode": "json", "raw": "{\n  \"email\": \"test@example.com\",\n  \"password\": \"Password123!\",\n  \"fullName\": \"Test User\"\n}"}
          }
        }
      ]
    }
  ]
}
```

## 📖 Tiếp theo

- [API Reference](../04-API-REFERENCE/) - Tất cả API endpoints
- [Architecture](../02-ARCHITECTURE/) - Hiểu kiến trúc
- [Database](../05-DATABASE/) - Xem data models
