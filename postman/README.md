# HUKI EBOOK API - Postman

Collection này dùng để phát triển frontend và kiểm thử API qua API Gateway.

## Files

- `HUKI_EBOOK_API.postman_collection.json`: 145 requests, gồm API public, admin, internal, webhook và hai flow E2E.
- `HUKI-Local.postman_environment.json`: biến môi trường local; không chứa secret thật.

## Chạy local

1. Từ thư mục `platform`, chạy backend:

   ```bash
   npm run dev
   ```

2. Import cả hai file JSON vào Postman và chọn environment `HUKI-Local`.
3. Chạy `00 Setup & Health`, sau đó chạy `01 Authentication > Login` để tự lưu access/refresh token.
4. Chạy từng folder nghiệp vụ. Những request cần dữ liệu có sẵn sử dụng các biến như `bookId`, `storeId`, `addressId` và `orderId`.

Các URL local:

```text
API:          http://localhost:3000/api/v1
Swagger UI:   http://localhost:3000/api/docs
OpenAPI JSON: http://localhost:3000/api/openapi.json
```

## Cấu trúc collection

| Folder | Requests |
|---|---:|
| Setup & Health | 2 |
| Authentication | 6 |
| Profile & Sessions | 4 |
| Business | 4 |
| Stores & Members | 9 |
| Catalog | 4 |
| Books & Uploads | 9 |
| Cart & Checkout | 6 |
| Orders & Seller Orders | 12 |
| Payments & Refunds | 4 |
| Shipping & Addresses | 11 |
| Forum | 10 |
| Reviews | 9 |
| Chat | 7 |
| Notifications | 10 |
| Promotion | 11 |
| Admin & Moderation | 7 |
| Internal APIs | 5 |
| Webhooks & Callbacks | 2 |
| Complete E2E Flows | 10 |
| Negative Tests | 3 |
| **Tổng** | **145** |

PayOS webhook và GHTK callback có request mẫu nhưng muốn nhận kết quả thành công cần chữ ký hợp lệ. Các request internal cần `internalApiKey`. Các trường hợp này được tách riêng để không làm hỏng smoke flow frontend.

## Newman (tuỳ chọn)

Sau khi cài Newman:

```bash
newman run postman/HUKI_EBOOK_API.postman_collection.json -e postman/HUKI-Local.postman_environment.json --folder "00 Setup & Health"
```

Không chạy full collection trên production. Flow tạo dữ liệu cần account/role và ID phù hợp trong environment.

## Response contract P3

Success:

```json
{
  "status": "success",
  "statusCode": 200,
  "message": "Thành công",
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-08-31T00:00:00.000Z"
  }
}
```

Error:

```json
{
  "status": "error",
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Thông báo lỗi",
  "details": [],
  "path": "/api/v1/...",
  "requestId": "uuid",
  "timestamp": "2026-08-31T00:00:00.000Z"
}
```

Không lưu access token, refresh token, API key hoặc thông tin đăng nhập thật vào collection/environment trước khi commit.
