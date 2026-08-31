# HUKI EBOOK Web

Next.js App Router frontend của HUKI. Web chạy ở port `3100`; API Gateway chạy ở port `3000`.

## Bắt đầu ở đây

### 1. Chạy backend

```powershell
cd E:\HuKi
docker compose up -d postgres mongo redis rabbitmq

cd E:\HuKi\platform
npm run dev
```

Kiểm tra: `http://localhost:3000/api/v1/health/services`.

### 2. Chạy web

```powershell
cd E:\HuKi\web
npm install
npm run dev
```

Mở `http://localhost:3100`.

### 3. Kiểm tra trước khi bàn giao

```powershell
npm run check
npm run build
```

## Việc cần làm tiếp theo

1. Hoàn thành cấu trúc shared UI và route groups.
2. Tạo API response/error contract trong `src/lib/api`.
3. Làm auth proof-of-concept login -> refresh -> logout với backend thật.
4. Chốt ADR dùng BFF/HttpOnly cookie hoặc Bearer adapter tạm thời.
5. Bắt đầu `AUT-001 Login` sau khi foundation pass.

## Project structure

```text
src/
├── app/          # Routes, layouts, loading/error boundaries
├── components/   # ui/ và shared/
├── features/     # auth, catalog, cart, orders, seller, admin...
├── lib/          # api, auth, query, config
├── hooks/        # Reusable hooks
├── types/        # Shared frontend types
└── test/         # Test utilities và MSW
```

Chỉ tạo folder khi có code thật; không tạo hàng loạt directory rỗng.

## Nguồn công việc

- Screen inventory: `../task/web/screens/SCREEN-INVENTORY.md`
- Screen template: `../task/web/screens/SCREEN-TEMPLATE.md`
- Master plan: `../task/web/PHASES-PLAN.md`
- Swagger: `http://localhost:3000/api/docs`
- Generated OpenAPI: `../res/openapi/huki-ebook-openapi.generated.json`

## Hai người cùng làm

- Owner A: public, auth, buyer, community và `components/ui`.
- Owner B: seller, admin, system, `lib/api` và `lib/auth`.
- Mỗi feature dùng branch ngắn; người còn lại review trước khi đổi screen sang `✅ VERIFIED`.
