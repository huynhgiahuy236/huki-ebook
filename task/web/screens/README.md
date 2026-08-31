# Web Screens Workspace

Thư mục này là nguồn theo dõi chính thức cho 90 màn hình web HUKI.

## Quy ước checkbox

- `- [ ] 🔴` — chưa đạt Definition of Done.
- `- [x] ✅` — đã hoàn thành code, API thật, responsive, accessibility và test theo screen spec.

Không tích xanh khi mới có UI tĩnh. Nếu đang làm hoặc bị chặn, checkbox vẫn đỏ và ghi trạng thái chi tiết trong screen spec.

## Trạng thái chi tiết

`PLANNED -> SPEC_WRITING -> DESIGN_APPROVED -> IMPLEMENTING -> REVIEW -> VERIFIED`

Chỉ `VERIFIED` mới được đổi thành `- [x] ✅` trong inventory. `BLOCKED` vẫn là `- [ ] 🔴` và phải có lý do.

## Files

- `SCREEN-INVENTORY.md`: checklist 90 màn hình.
- `SCREEN-TEMPLATE.md`: template bắt buộc cho từng screen spec.

## Owner

- `A`: Customer Experience — public, auth, buyer và community.
- `B`: Business Operations — seller, admin và system.
- `A+B`: quyết định shared architecture hoặc review chéo.

Mỗi màn hình có một owner thực hiện và người còn lại review.

## Quy trình đóng một screen

1. Tạo spec từ `SCREEN-TEMPLATE.md`.
2. Map API và xác nhận không gọi system API từ browser.
3. Reviewer chuyển spec sang `DESIGN_APPROVED`.
4. Implement route, UI, API, UX states và test.
5. Chạy responsive/accessibility check.
6. Reviewer chạy với backend thật.
7. Cập nhật API matrix.
8. Chuyển `VERIFIED`, sau đó mới đổi inventory thành `- [x] ✅`.

## Definition of Done ngắn

- Route, navigation, auth và role đúng.
- API thật cùng request/response/error mapping đúng.
- Loading, empty, success, error và retry đầy đủ.
- Responsive, accessibility và test đạt.
- Reviewer khác owner xác nhận.
