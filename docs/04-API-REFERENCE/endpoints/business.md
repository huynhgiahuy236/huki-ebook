# 🏢 Business API

## POST /businesses

Register a new business.

### Request

```http
POST /api/v1/businesses
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Cong Ty TNHH Nha Sach Viet",
  "email": "contact@nhuasachviet.vn",
  "phone": "02812345678",
  "address": "123 Ly Thuong Kiet, District 1",
  "taxCode": "0123456789",
  "businessType": "CORPORATION"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Business name |
| email | string | Yes | Contact email |
| phone | string | No | Contact phone |
| address | string | No | Business address |
| taxCode | string | No | Tax identification number |
| businessType | string | Yes | INDIVIDUAL, PARTNERSHIP, CORPORATION, LLC |

### Response 201

```json
{
  "message": "Business registered successfully",
  "data": {
    "id": "business-uuid",
    "name": "Cong Ty TNHH Nha Sach Viet",
    "email": "contact@nhuasachviet.vn",
    "status": "PENDING_APPROVAL",
    "businessType": "CORPORATION",
    "createdAt": "2026-08-14T08:00:00.000Z"
  }
}
```

---

## GET /businesses/my

Get current user's business.

### Request

```http
GET /api/v1/businesses/my
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": {
    "id": "business-uuid",
    "name": "Cong Ty TNHH Nha Sach Viet",
    "email": "contact@nhuasachviet.vn",
    "status": "APPROVED",
    "businessType": "CORPORATION",
    "stores": [
      {
        "id": "store-uuid",
        "name": "Nha Sach Viet - Chi Nhanh 1",
        "slug": "nha-sach-viet-chi-nhanh-1",
        "status": "APPROVED",
        "totalProducts": 150,
        "rating": 4.5
      }
    ],
    "members": [
      {
        "id": "member-uuid",
        "userId": "user-uuid",
        "role": "OWNER",
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

## GET /businesses/:id

Get business details.

### Request

```http
GET /api/v1/businesses/business-uuid
```

### Response 200

```json
{
  "data": {
    "id": "business-uuid",
    "name": "Cong Ty TNHH Nha Sach Viet",
    "email": "contact@nhuasachviet.vn",
    "status": "APPROVED",
    "stores": [...],
    "createdAt": "2026-08-14T08:00:00.000Z"
  }
}
```

---

## PATCH /businesses/:id

Update business info.

### Request

```http
PATCH /api/v1/businesses/business-uuid
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "phone": "02887654321",
  "address": "456 Nguyen Hue, District 1"
}
```

### Response 200

```json
{
  "message": "Business updated",
  "data": {...}
}
```

---

## GET /businesses/:businessId/stores

Get stores of a business.

### Request

```http
GET /api/v1/businesses/business-uuid/stores
```

### Response 200

```json
{
  "data": [
    {
      "id": "store-uuid",
      "name": "Nha Sach Viet - Chi Nhanh 1",
      "slug": "nha-sach-viet-chi-nhanh-1",
      "logo": "https://example.com/logo.jpg",
      "status": "APPROVED",
      "totalProducts": 150,
      "rating": 4.5
    }
  ]
}
```

---

## POST /businesses/:businessId/stores

Create a new store.

### Request

```http
POST /api/v1/businesses/business-uuid/stores
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Nha Sach Viet - Chi Nhanh 2",
  "slug": "nha-sach-viet-chi-nhanh-2",
  "email": "cn2@nhuasachviet.vn",
  "phone": "02899999999",
  "address": "789 Dien Bien Phu, District 3",
  "categoryIds": ["cat-uuid-1", "cat-uuid-2"]
}
```

### Response 201

```json
{
  "message": "Store created",
  "data": {
    "id": "store-uuid-2",
    "name": "Nha Sach Viet - Chi Nhanh 2",
    "slug": "nha-sach-viet-chi-nhanh-2",
    "status": "PENDING_APPROVAL"
  }
}
```

---

## PATCH /businesses/:businessId/stores/:storeId

Update store.

### Request

```http
PATCH /api/v1/businesses/business-uuid/stores/store-uuid
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "description": "Chi nhanh sach vo",
  "banner": "https://example.com/banner.jpg"
}
```

---

## GET /businesses/:businessId/members

Get business members.

### Request

```http
GET /api/v1/businesses/business-uuid/members
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "data": [
    {
      "id": "member-uuid-1",
      "userId": "owner-uuid",
      "role": "OWNER",
      "status": "ACTIVE",
      "acceptedAt": "2026-08-14T08:00:00.000Z"
    },
    {
      "id": "member-uuid-2",
      "userId": "staff-uuid",
      "role": "CONTENT_STAFF",
      "status": "ACTIVE",
      "acceptedAt": "2026-08-15T10:00:00.000Z"
    }
  ]
}
```

---

## POST /businesses/:businessId/members/invite

Invite a new member.

### Request

```http
POST /api/v1/businesses/business-uuid/members/invite
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "email": "staff@nhuasachviet.vn",
  "role": "CONTENT_STAFF"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Member email |
| role | string | Yes | OWNER, MANAGER, ORDER_STAFF, CONTENT_STAFF, FINANCE_STAFF |

### Response 201

```json
{
  "message": "Invitation sent",
  "data": {
    "id": "invitation-uuid",
    "email": "staff@nhuasachviet.vn",
    "role": "CONTENT_STAFF",
    "expiresAt": "2026-08-21T08:00:00.000Z"
  }
}
```

---

## POST /invitations/:token/accept

Accept invitation.

### Request

```http
POST /api/v1/invitations/invitation-token/accept
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Invitation accepted",
  "data": {
    "memberId": "member-uuid",
    "businessId": "business-uuid",
    "role": "CONTENT_STAFF"
  }
}
```

---

## PATCH /businesses/:businessId/members/:memberId/role

Update member role (Owner only).

### Request

```http
PATCH /api/v1/businesses/business-uuid/members/member-uuid/role
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "role": "MANAGER"
}
```

---

## DELETE /businesses/:businessId/members/:memberId

Remove member (Owner only).

### Request

```http
DELETE /api/v1/businesses/business-uuid/members/member-uuid
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Member removed"
}
```

---

## POST /businesses/:businessId/leave

Leave a business.

### Request

```http
POST /api/v1/businesses/business-uuid/leave
Authorization: Bearer <access_token>
```

### Response 200

```json
{
  "message": "Left business successfully"
}
```
