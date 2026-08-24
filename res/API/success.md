# API Response Schemas

## Success Response

### Single Resource

```json
{
  "data": {
    "id": "uuid",
    "field1": "value1",
    "field2": "value2",
    "createdAt": "2026-08-24T10:00:00.000Z",
    "updatedAt": "2026-08-24T10:00:00.000Z"
  }
}
```

### Multiple Resources (List)

```json
{
  "data": [
    { "id": "uuid1", ... },
    { "id": "uuid2", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Create Response (201)

```json
{
  "data": {
    "id": "uuid",
    ...
  },
  "message": "Tạo thành công"
}
```

### Update Response (200)

```json
{
  "data": {
    "id": "uuid",
    ...
  },
  "message": "Cập nhật thành công"
}
```

### Delete Response (204)

No body.

## HTTP Status Codes

| Status | Meaning | Body |
|--------|---------|------|
| 200 | OK | data |
| 201 | Created | data, message |
| 204 | No Content | - |
| 400 | Bad Request | error |
| 401 | Unauthorized | error |
| 403 | Forbidden | error |
| 404 | Not Found | error |
| 409 | Conflict | error |
| 422 | Unprocessable | error |
| 429 | Rate Limited | error |
| 500 | Server Error | error |

## Field Naming

- Use `camelCase` for all field names
- Use `snake_case` in database, transform to camelCase in API
- Dates: ISO 8601 format (`2026-08-24T10:00:00.000Z`)
- UUIDs: Lowercase with hyphens

## Null Handling

- Omit null fields in responses
- Use `undefined` instead of `null` in TypeScript
- Arrays: Return `[]` not `null`

## Example: User Response

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "fullName": "Nguyễn Văn A",
    "phone": "0909123456",
    "avatarUrl": "https://...",
    "role": "USER",
    "status": "ACTIVE",
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-08-24T10:00:00.000Z"
  }
}
```

## Example: Book Response

```json
{
  "data": {
    "id": "uuid",
    "title": "Sách hay",
    "slug": "sach-hay",
    "description": "...",
    "price": 150000,
    "coverUrl": "https://...",
    "format": "PHYSICAL",
    "status": "PUBLISHED",
    "store": {
      "id": "uuid",
      "name": "Tên cửa hàng",
      "slug": "ten-cua-hang"
    },
    "category": {
      "id": "uuid",
      "name": "Tiểu thuyết"
    },
    "author": {
      "id": "uuid",
      "name": "Tác giả"
    }
  }
}
```
