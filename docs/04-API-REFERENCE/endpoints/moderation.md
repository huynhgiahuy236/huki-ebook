# 🛡️ Moderation API

**Trạng thái:** ✅ Sprint 16 hoàn thành ngày 2026-08-22<br>
**Base URL:** `/api/v1`<br>
**Quyền admin:** mọi endpoint `/admin/moderation/*` yêu cầu JWT role `PLATFORM_ADMIN`.

## Report workflow

`PENDING → REVIEWING → RESOLVED | DISMISSED`

User gửi report qua các endpoint:

- `POST /forum/posts/:id/report`
- `POST /forum/comments/:id/report`
- `POST /reviews/:id/report`

Body dùng `reason`: `SPAM`, `HARASSMENT`, `OFFENSIVE`, `MISINFORMATION`, `COPYRIGHT`, `OTHER`; `description` tùy chọn từ 3 đến 2.000 ký tự. Mỗi user chỉ được report một lần cho cùng loại và ID nội dung.

## GET /admin/moderation/reports

Lấy danh sách report, mới nhất trước.

```http
GET /api/v1/admin/moderation/reports?page=1&limit=20&status=PENDING&targetType=POST
Authorization: Bearer <admin_access_token>
```

Query `status`: `PENDING`, `REVIEWING`, `RESOLVED`, `DISMISSED`. Query `targetType`: `POST`, `COMMENT`, `REVIEW`, `USER`, `STORE`.

## GET /admin/moderation/reports/:id

Trả chi tiết report và snapshot hiện tại của content target nếu target là post, comment hoặc review.

## PATCH /admin/moderation/reports/:id/review

Nhận xử lý một report `PENDING`. API idempotent với chính admin đã nhận; report ở trạng thái khác trả `409`.

## PATCH /admin/moderation/reports/:id/resolve

```http
PATCH /api/v1/admin/moderation/reports/66bdce20493f476fec2eab10/resolve
Authorization: Bearer <admin_access_token>
Content-Type: application/json

{
  "outcome": "RESOLVED",
  "action": "HIDE",
  "note": "Nội dung vi phạm quy tắc cộng đồng"
}
```

- `outcome`: `RESOLVED` hoặc `DISMISSED`.
- `action`: `NONE`, `WARN`, `HIDE`, `DELETE`, `BAN`.
- `DISMISSED` bắt buộc dùng `NONE`.
- `HIDE` và `DELETE` chỉ áp dụng cho content target.
- `WARN` và `BAN` phát `user.moderation.requested` để Identity Service xử lý tài khoản, không ghi trực tiếp database Identity.
- Khi vẫn còn report mở cho cùng target, dismiss một report không tự xuất bản lại nội dung.

## GET /admin/moderation/queue

```http
GET /api/v1/admin/moderation/queue?page=1&limit=20&targetType=REVIEW&status=FLAGGED
Authorization: Bearer <admin_access_token>
```

Hàng đợi gồm post, comment và review có trạng thái `PENDING_REVIEW` hoặc `FLAGGED`, sắp mới nhất trước.

## PATCH /admin/moderation/content/:targetType/:id

Duyệt trực tiếp nội dung trong hàng đợi. `targetType`: `POST`, `COMMENT`, `REVIEW`.

```json
{
  "action": "APPROVE",
  "note": "Nội dung phù hợp"
}
```

Action hỗ trợ `APPROVE`, `HIDE`, `DELETE`. Quyết định được lưu vào `moderatedBy`, `moderatedAt`, `moderationNote`; các report đang mở của target cũng được kết thúc tương ứng.

## Auto-moderation và rate limit

- Từ khóa cấm, từ khóa lừa đảo, từ ba URL trở lên hoặc ký tự lặp bất thường sẽ bị auto-flag.
- Post/review sạch vẫn vào `PENDING_REVIEW`; comment sạch được xuất bản ngay.
- Tạo post: 20 request/giờ; comment/reply: 30 request/giờ; tạo/cập nhật review và report: 10 request/giờ.
