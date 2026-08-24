# Prisma standard

Từ 2026-08-21, toàn bộ service dùng PostgreSQL được chuẩn hóa sang Prisma:

| Service | Database URL |
|---|---|
| Identity | `IDENTITY_DATABASE_URL` |
| Business | `BUSINESS_DATABASE_URL` |
| Commerce | `COMMERCE_DATABASE_URL` |
| Shipping | `SHIPPING_DATABASE_URL` |
| Promotion | `PROMOTION_DATABASE_URL` |

`community-service` dùng MongoDB/Mongoose theo thiết kế và không thuộc nhóm PostgreSQL. API Gateway không truy cập database trực tiếp.

Mỗi PostgreSQL service generate client vào `apps/<service>/prisma/generated/client`. Không dùng chung `@prisma/client` đã generate bởi một schema khác vì client cuối cùng sẽ ghi đè model của service trước.

## Thiết lập

Điền đủ năm URL trong `.env`. Giá trị ở `.env.example` chỉ là mẫu; không commit credentials thật.

```bash
cd platform
npm install
npm run prisma:generate
```

## Database mới

Các baseline migrations nằm trong `apps/*/prisma/migrations/20260821000000_init`.

```bash
npm run prisma:migrate:deploy
```

Lệnh này chạy lần lượt migrations của Identity, Business, Commerce, Shipping và Promotion.

## Database cũ đã tạo bằng ORM trước đây

Không chạy baseline `init` trực tiếp trên database đang có bảng. Chọn một trong hai cách:

1. Local/dev không cần giữ dữ liệu: backup nếu cần, tạo lại năm database rỗng rồi chạy `npm run prisma:migrate:deploy`.
2. Có dữ liệu cần giữ: backup, tạo migration chuyển tiếp bằng `prisma migrate diff` giữa database thật và `schema.prisma`, review SQL, chạy thử trên bản sao rồi mới deploy. Không đánh dấu baseline là applied nếu schema thật chưa có các cột/bảng Sprint 9.

Không dùng `prisma db push` cho production vì thao tác đó không tạo lịch sử migration có thể review.

## Kiểm tra

```bash
npx prisma validate --schema apps/commerce-service/prisma/schema.prisma
npx tsc -p apps/commerce-service/tsconfig.app.json --noEmit
npm run test:commerce -- --runInBand
```

Lặp `prisma validate` cho từng schema khi thay đổi model.
