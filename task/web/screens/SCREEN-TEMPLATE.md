# {SCREEN_ID} — {Screen name}

## Control

| Field | Value |
|---|---|
| Persona | `GUEST/USER/BUSINESS_OWNER/BUSINESS_ADMIN/PLATFORM_ADMIN` |
| Happy case | `YES/NO` |
| Priority | `P0/P1/DEFERRED` |
| Phase | `{PHASE}` |
| Route | `{ROUTE}` |
| Owner | `{NAME/UNASSIGNED}` |
| Reviewer | `{NAME/UNASSIGNED}` |
| Work | `🔴 TODO` |
| Started at | `YYYY-MM-DD/-` |
| Last updated | `YYYY-MM-DD` |
| Depends on | `{SCREEN/API/NONE}` |

## Track checklist

- [ ] 🔴 Spec approved
- [ ] 🔴 UI implemented
- [ ] 🔴 API integrated
- [ ] 🔴 Role/business scope/permission enforced
- [ ] 🔴 Loading/empty/success/error/forbidden completed
- [ ] 🔴 Responsive verified
- [ ] 🔴 Accessibility verified
- [ ] 🔴 Tests passed
- [ ] 🔴 API matrix updated
- [ ] 🔴 Reviewer approved

Đang làm đổi đúng track thành `🟢 IN_PROGRESS`; có một phần dùng `🟡 PARTIAL`; hoàn thành dùng `- [x] ✅`. Screen `DEFERRED` không được code nếu chưa đổi scope.

## User outcome

Kết quả cụ thể persona đạt được.

## Access contract

| Check | Requirement |
|---|---|
| Authentication | Public hoặc signed-in |
| Global role | Role cho phép |
| Business scope | `businessId` được phép |
| Permissions | Danh sách permission bắt buộc |
| Failure | Redirect/login/403/404 behavior |

Đối với Admin con, kiểm tra từng permission; không dùng tên chức danh thay permission. Owner có toàn quyền trong business nhưng không có quyền platform.

## Navigation

- Entry points.
- Success destination.
- Cancel/back/deep-link behavior.
- Menu/action bị ẩn hoặc khóa khi thiếu permission.

## API mapping

| Method | Endpoint | Client function | Trigger | Consumer | Auth/permission | Test ID | Status |
|---|---|---|---|---|---|---|---|
| GET | `/example` | `exampleApi.list()` | Load | BROWSER | `{permission}` | `E2E-...` | 🔴 TODO |

Internal/webhook/callback liên quan phải ghi `BROWSER_FORBIDDEN`.

## Contracts

Ghi params/query/body, response fields thật sự dùng, pagination, idempotency và error codes. Không đoán theo UI mock.

## UI/UX states

### Loading

### Empty

### Success

### Validation/error/retry

### Forbidden/blocked/suspended

## Responsive/accessibility

- 360px, 768px, 1280px+.
- Keyboard/focus/label/contrast/reduced-motion.
- Async announcement và disabled semantics.

## Security

- Tenant isolation theo `businessId`.
- Permission enforced ở backend.
- Token/PII/password handling.
- Admin con bắt đổi mật khẩu lần đầu.
- Không log credential tạm hoặc secret.

## Tests/evidence

| Layer | Evidence | Status |
|---|---|---|
| Unit/component | | 🔴 TODO |
| API/contract | | 🔴 TODO |
| Positive E2E | | 🔴 TODO |
| Negative RBAC/permission | | 🔴 TODO |
| Responsive/A11y | | 🔴 TODO |

## Notes/blockers

Ghi quyết định, blocker và người có thể gỡ chặn.

## Change log

| Date | Person | Track | From | To | Evidence/note |
|---|---|---|---|---|---|
| YYYY-MM-DD | `{NAME}` | `{TRACK}` | 🔴 TODO | 🟢 IN_PROGRESS | |
n