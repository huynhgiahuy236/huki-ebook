# Web Screens — Quy tắc phối hợp

## Đọc trước khi nhận screen

- Chỉ nhận screen có `Happy case = YES` và status `🔴 TODO` hoặc `🟡 PARTIAL`.
- Trước khi code: ghi owner/ngày và đổi thành `🟢 IN_PROGRESS`.
- Không sửa screen đang do người khác giữ.
- Không mở lại `⚪ DEFERRED` nếu chưa cập nhật scope ở `PHASES-PLAN.md`.
- UI mock không phải feature hoàn thành.

## Status

| Ký hiệu | Dùng khi |
|---|---|
| `- [x] ✅ DONE` | Toàn bộ screen DoD đã được reviewer xác nhận |
| `- [ ] 🟢 IN_PROGRESS` | Có owner đang thực hiện |
| `- [ ] 🟡 PARTIAL` | Có UI/backend một phần, chưa integrated |
| `- [ ] 🔴 TODO` | Happy case cần làm nhưng chưa có implementation đáng kể |
| `⚪ DEFERRED` | Không phát triển trong happy case hiện tại |
| `⛔ BLOCKED` | Không thể tiếp tục; có blocker/owner gỡ chặn |

## Năm persona

- Guest: public browse và auth entry.
- User/Buyer: account, address, cart, COD và orders của mình.
- Admin doanh nghiệp: `BUSINESS + OWNER`, toàn quyền business.
- Admin con: Owner tạo trực tiếp và cấp tập con `permissions[]`.
- Admin HUKI: `PLATFORM_ADMIN`, approval/catalog/health.

Admin con không có invitation. Tài khoản dùng credential tạm, bắt đổi mật khẩu lần đầu. UI phải ẩn/khóa action không được cấp nhưng backend vẫn phải trả `403` nếu gọi vượt quyền.

## Tracks độc lập

Mỗi screen theo dõi `Spec`, `UI`, `API`, `Permission`, `UX states`, `Responsive/A11y`, `Tests`, `Review`. Tích xanh từng track khi có evidence; checkbox đầu screen chỉ xanh sau Review.

## Handoff

1. Owner nhận việc và khóa track.
2. Hoàn thành track, ghi evidence/test.
3. Chuyển `REVIEW` và gắn reviewer.
4. Reviewer chạy backend thật.
5. Cập nhật API matrix và inventory.
6. Chỉ reviewer chuyển `DONE`.

## Deferred hiện tại

Community, chat, reviews, notification realtime, GHTK/shipment/delivery, online payment, promotion, refund/return, Wallet/reward và Reader/DRM.
