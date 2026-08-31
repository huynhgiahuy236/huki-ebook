# Web Control Center — Đọc file này trước

Đây là điểm bắt đầu duy nhất khi làm HUKI Web. Không cần mở và đọc toàn bộ tài liệu mỗi lần bắt đầu task.

## 1. Trình tự đọc

### Khi mới vào project

1. Đọc file này.
2. Đọc [`PHASES-PLAN.md`](PHASES-PLAN.md) để hiểu kiến trúc và thứ tự tổng thể.
3. Đọc đúng **một Phase đang làm**.
4. Chọn screen đỏ trong [`screens/SCREEN-INVENTORY.md`](screens/SCREEN-INVENTORY.md).
5. Copy [`screens/SCREEN-TEMPLATE.md`](screens/SCREEN-TEMPLATE.md) để tạo screen spec.
6. Tra API tương ứng trong [`API-COVERAGE-MATRIX.md`](API-COVERAGE-MATRIX.md), Swagger và OpenAPI generated.

### Khi làm việc hằng ngày

Chỉ cần đọc theo thứ tự:

```text
00-START-HERE
→ Phase hiện tại
→ SCREEN-INVENTORY
→ Screen spec đang nhận
→ API-COVERAGE-MATRIX
```

Không đọc lại 9 Phase nếu task chỉ thuộc một màn hình.

## 2. Thứ tự ưu tiên

### P0 — MVP bắt buộc

1. Phase 01: Foundation, API client và auth proof-of-concept.
2. Phase 02: Register/login/profile/session.
3. Phase 03: Home/catalog/search/book/store.
4. Phase 04: Cart/address/shipping fee/COD checkout.
5. Phase 05: Buyer orders/tracking/notifications cơ bản.
6. Phase 07: Business/store/product/seller orders.

### P1 — Hoàn thiện sản phẩm

7. Phase 06: Forum/reviews/chat.
8. Phase 08: Admin/moderation/operations.

### P2 — Sau MVP hoặc cần môi trường thật

9. Phase 09: Full coverage, quality và launch.
10. PayOS production, email delivery, push notification, load test sâu.

Không làm P1/P2 nếu P0 foundation/auth contract chưa ổn.

## 3. Nguồn chuẩn

Khi tài liệu mâu thuẫn, dùng thứ tự:

1. Controller, DTO, guard và Gateway trong `platform/apps`.
2. Runtime OpenAPI: `res/openapi/huki-ebook-openapi.generated.json`.
3. Swagger local: `http://localhost:3000/api/docs`.
4. Postman: `postman/HUKI_EBOOK_API.postman_collection.json`.
5. `API-COVERAGE-MATRIX.md` và screen spec.
6. Các mô tả cũ khác.

Không tự đoán request/response từ tên màn hình.

## 4. Quy tắc API cho mỗi screen

Trước khi chuyển screen sang `DESIGN_APPROVED`, phải ghi đủ:

| Field bắt buộc | Ý nghĩa |
|---|---|
| Method + path | API thật qua Gateway |
| Consumer type | `BROWSER`, `INTERNAL`, `WEBHOOK`, `CALLBACK`, `HEALTH`, `SOCKET` |
| Auth/role | Public, buyer, seller, admin hoặc delivery |
| Request | Params/query/body và validation |
| Success response | Field trong `data`, pagination và status code |
| Error response | 400/401/403/404/409/429/503 liên quan |
| Client function | Tên hàm frontend sẽ gọi |
| Trigger | Page load, submit, pagination, socket... |
| Test ID | Unit/component/E2E evidence |

Browser tuyệt đối không gọi `INTERNAL`, `WEBHOOK` hoặc `CALLBACK`.

## 5. Quy tắc checkbox

```markdown
- [ ] 🔴 Chưa VERIFIED
- [x] ✅ Đã VERIFIED
```

UI tĩnh, mock-only hoặc code chưa review vẫn là `🔴`.

Một screen chỉ được `✅` khi:

- Route/navigation hoạt động.
- Auth và RBAC đúng.
- API backend thật hoạt động.
- Request/response/error mapping đúng.
- Loading/empty/success/error/retry đầy đủ.
- Responsive 360/768/1280+.
- Accessibility cơ bản đạt.
- Test pass.
- Người còn lại review.
- API coverage matrix đã cập nhật.

## 6. Quy tắc hai người

| Phạm vi | Owner | Reviewer |
|---|---|---|
| Public/Auth/Buyer/Community | A | B |
| Seller/Admin/System | B | A |
| `components/ui` | A | B |
| `lib/api`, `lib/auth`, RBAC | B | A |
| Shared architecture | Task riêng | Review chéo |

- Không cùng sửa một screen/route trong cùng thời điểm.
- Branch ngắn theo feature; không giữ branch cả Phase.
- Người không code feature là người review.
- Shared file phải có task/owner rõ trước khi sửa.

## 7. Quy trình nhận một task

1. Chọn một screen `🔴` đúng Phase ưu tiên.
2. Ghi owner và chuyển status `SPEC_WRITING`.
3. Tạo screen spec từ template.
4. Reviewer kiểm tra UX/API/RBAC và duyệt design.
5. Implement vertical slice: route + UI + API + states + test.
6. Chạy `npm run check` và test liên quan.
7. Reviewer chạy lại với backend thật.
8. Cập nhật matrix, status `VERIFIED`, rồi mới tích `✅`.

## 8. Lệnh chạy

```powershell
# Backend
cd E:\HuKi
docker compose up -d postgres mongo redis rabbitmq
cd E:\HuKi\platform
npm run dev

# Web — terminal khác
cd E:\HuKi\web
npm run dev

# Quality gate
npm run check
npm run build
```

URLs:

```text
Web:      http://localhost:3100
API:      http://localhost:3000/api/v1
Swagger:  http://localhost:3000/api/docs
Health:   http://localhost:3000/api/v1/health/services
```

## 9. File nào dùng để làm gì

| File | Mục đích | Khi đọc |
|---|---|---|
| `00-START-HERE.md` | Luật và trình tự | Luôn đọc trước |
| `PHASES-PLAN.md` | Kiến trúc/roadmap tổng | Onboarding hoặc đổi Phase |
| `01..09-PHASE*.md` | Scope từng Phase | Chỉ Phase hiện tại |
| `screens/SCREEN-INVENTORY.md` | Chọn task và xem tiến độ | Mỗi ngày |
| `screens/SCREEN-TEMPLATE.md` | Tạo đặc tả màn hình | Trước khi code screen |
| `screens/README.md` | Luật riêng cho screen | Khi cập nhật trạng thái |
| `API-COVERAGE-MATRIX.md` | Mapping API -> consumer/flow | Khi thiết kế và verify API |

## 10. Task đầu tiên

Task kế tiếp không phải tạo 90 page rỗng. Làm lần lượt:

1. Foundation folder/layout/UI primitives.
2. API response và error contract.
3. Auth proof-of-concept login -> refresh -> logout.
4. Chốt ADR token/cookie.
5. Tạo spec và triển khai `AUT-001 Login`.
