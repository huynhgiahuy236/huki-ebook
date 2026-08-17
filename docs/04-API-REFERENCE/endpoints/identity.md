# 👤 Identity API

## POST /auth/register

Register a new user.

### Request

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "Nguyen Van A"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Valid email address |
| password | string | Yes | Min 8 chars, 1 uppercase, 1 number |
| fullName | string | Yes | User's full name |

### Response 201

```json
{
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "fullName": "Nguyen Van A",
      "role": "USER"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  }
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
  "password": "SecurePass123!"
}
```

### Response 200

```json
{
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "user@example.com",
      "fullName": "Nguyen Van A",
      "role": "USER",
      "avatar": "https://example.com/avatar.jpg"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
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

Logout and revoke tokens.

### Request

```http
POST /api/v1/auth/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Response 200

```json
{
  "message": "Logged out successfully"
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
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### Response 200

```json
{
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
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
  "message": "Password reset link sent to email"
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
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePass123!"
}
```

### Response 200

```json
{
  "message": "Password reset successfully"
}
```

---

## PATCH /auth/password

Change password (authenticated).

### Request

```http
PATCH /api/v1/auth/password
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

---

## GET /users/me

Get current user profile.

### Request

```http
GET /api/v1/users/me
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "fullName": "Nguyen Van A",
    "phone": "0912345678",
    "avatar": "https://example.com/avatar.jpg",
    "role": "USER",
    "createdAt": "2026-08-01T08:00:00.000Z"
  }
}
```

---

## PATCH /users/me

Update user profile.

### Request

```http
PATCH /api/v1/users/me
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "fullName": "Nguyen Van B",
  "phone": "0987654321"
}
```

### Response 200

```json
{
  "message": "Profile updated",
  "data": {
    "id": "user-uuid",
    "fullName": "Nguyen Van B",
    "phone": "0987654321"
  }
}
```

---

## GET /sessions

Get active sessions.

### Request

```http
GET /api/v1/sessions
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": [
    {
      "id": "session-uuid",
      "deviceType": "WEB",
      "deviceName": "Chrome on Windows",
      "location": "Ho Chi Minh City, Vietnam",
      "ipAddress": "192.168.1.1",
      "lastActiveAt": "2026-08-14T08:00:00.000Z",
      "createdAt": "2026-08-10T08:00:00.000Z",
      "isCurrent": true
    },
    {
      "id": "session-uuid-2",
      "deviceType": "MOBILE",
      "deviceName": "iPhone 15 Pro",
      "location": "Ho Chi Minh City, Vietnam",
      "lastActiveAt": "2026-08-13T15:00:00.000Z",
      "createdAt": "2026-08-08T10:00:00.000Z",
      "isCurrent": false
    }
  ]
}
```

---

## DELETE /sessions/:sessionId

Revoke a specific session.

### Request

```http
DELETE /api/v1/sessions/session-uuid
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Session revoked"
}
```

---

## DELETE /sessions

Revoke all sessions except current.

### Request

```http
DELETE /api/v1/sessions
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "All other sessions revoked"
}
```
