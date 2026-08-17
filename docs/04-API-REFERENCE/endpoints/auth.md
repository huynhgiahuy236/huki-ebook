# 🔐 Authentication API

## POST /auth/register

Register a new user account.

### Request

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "fullName": "Nguyen Van A",
  "phone": "0912345678"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Min 8 chars, 1 uppercase, 1 number |
| fullName | string | Yes | User's full name |
| phone | string | No | Vietnamese phone number |

### Response 201

```json
{
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "fullName": "Nguyen Van A",
      "role": "USER",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

### Response 400

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

### Response 409

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Email already exists"
}
```

---

## POST /auth/login

Login with email and password.

### Request

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}
```

### Response 200

```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "fullName": "Nguyen Van A",
      "role": "USER",
      "status": "ACTIVE",
      "avatar": "https://example.com/avatar.jpg"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  }
}
```

### Response 401

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid email or password"
}
```

---

## POST /auth/logout

Logout and revoke refresh token.

### Request

```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Logout successful"
}
```

---

## POST /auth/refresh

Refresh access token.

### Request

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Response 200

```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

### Response 401

```json
{
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired refresh token"
}
```

---

## GET /auth/me

Get current user profile.

### Request

```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "phone": "0912345678",
    "role": "USER",
    "status": "ACTIVE",
    "avatar": "https://example.com/avatar.jpg",
    "emailVerified": true,
    "createdAt": "2026-08-14T00:00:00.000Z"
  }
}
```

---

## POST /auth/forgot-password

Request password reset.

### Request

```http
POST /api/v1/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### Response 200

```json
{
  "message": "Password reset email sent"
}
```

---

## POST /auth/reset-password

Reset password with token.

### Request

```http
POST /api/v1/auth/reset-password
Content-Type: application/json

{
  "token": "reset-token-xxx",
  "newPassword": "NewPassword123!"
}
```

### Response 200

```json
{
  "message": "Password reset successful"
}
```

---

## PATCH /auth/change-password

Change password while logged in.

### Request

```http
PATCH /api/v1/auth/change-password
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

### Response 200

```json
{
  "message": "Password changed successfully"
}
```

### Response 400

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Current password is incorrect"
}
```

---

## POST /auth/logout-all

Logout from all devices.

### Request

```http
POST /api/v1/auth/logout-all
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Logged out from all devices"
}
```
