# {SCREEN_ID} — {Screen name}

## Checklist

- [ ] 🔴 Screen spec approved
- [ ] 🔴 UI implemented
- [ ] 🔴 API integrated
- [ ] 🔴 UX states completed
- [ ] 🔴 Responsive verified
- [ ] 🔴 Accessibility verified
- [ ] 🔴 Tests passed
- [ ] 🔴 API matrix updated
- [ ] 🔴 Reviewer approved

## Metadata

| Field | Value |
|---|---|
| Screen ID | `{SCREEN_ID}` |
| Route | `{ROUTE}` |
| Owner | `A` or `B` |
| Reviewer | `B` or `A` |
| Roles | `{ROLES}` |
| Phase/Sprint | `{PHASE_SPRINT}` |
| Priority | `P0/P1/P2` |
| Status | `PLANNED` |

## Mục tiêu người dùng

Mô tả một kết quả cụ thể mà người dùng đạt được trên màn hình.

## Điều kiện truy cập

- Authentication.
- Role/permission.
- Redirect hoặc forbidden behavior.
- Điều kiện dữ liệu đầu vào.

## Navigation

- Entry points.
- Success destination.
- Cancel/back behavior.
- Deep-link behavior.

## API mapping

| Method | Endpoint | Client function | Trigger | Auth/Role | Test ID |
|---|---|---|---|---|---|
| GET | `/example` | `exampleApi.list()` | Page load | Public | `E2E-...` |

Liệt kê rõ endpoint `INTERNAL`, `WEBHOOK`, `CALLBACK` liên quan nhưng đánh dấu `BROWSER_FORBIDDEN`; browser không được gọi trực tiếp.

## Request và response contract

Ghi type/schema màn hình thật sự sử dụng, pagination và error codes liên quan. Không copy toàn bộ OpenAPI nếu màn hình không dùng.

## Layout/wireframe

Mô tả desktop, tablet và mobile; liệt kê section và hierarchy chính.

## Components

- Shared components.
- Feature components.
- Component mới cần bổ sung.

## UI states

### Loading

### Empty

### Success

### Error và retry

### Permission/blocked

## Interaction và validation

- Form rules.
- Mutation behavior.
- Double-submit/idempotency.
- Cache invalidation hoặc optimistic rollback.

## Error mapping

| HTTP/code | UX behavior |
|---|---|
| 400 | Field/general validation |
| 401 | Refresh hoặc login |
| 403 | Forbidden state |
| 404 | Not-found state |
| 409 | Conflict recovery |
| 429 | Retry countdown |
| 503 | Service unavailable |

## Responsive và accessibility

- 360px, 768px, 1280px+.
- Keyboard/focus/label/contrast/reduced-motion.
- Screen-reader announcements cho async state.

## Security và privacy

- Token/PII handling.
- XSS/upload/input rules.
- Không log dữ liệu nhạy cảm.

## SEO và analytics

Ghi `index/noindex`, metadata, canonical và event không chứa PII nếu phù hợp.

## Tests

### Unit/component

### Integration/MSW

### E2E backend thật

## Notes/blockers

Ghi blocker, quyết định và link issue/ADR. Nếu có blocker, trạng thái phải là `BLOCKED` và inventory vẫn `🔴`.
