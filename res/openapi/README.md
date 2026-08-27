# OpenAPI artifacts

- `huki-ebook-openapi.generated.json` là contract tổng hợp chuẩn, được sinh từ Swagger controller của các service qua API Gateway.
- `huki-ebook-openapi.yaml` là tài liệu legacy thủ công và không còn được dùng để kiểm tra coverage.

Khởi động đầy đủ Gateway và sáu service, sau đó chạy tại `platform/`:

```bash
npm run openapi:sync
npm run openapi:check
```

CI chạy `openapi:check`. Nếu controller hoặc Swagger decorator thay đổi nhưng artifact chưa được cập nhật, lệnh sẽ thất bại. Có thể đặt `OPENAPI_GATEWAY_URL` để trỏ tới môi trường integration khác.

