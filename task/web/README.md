# HUKI Web — Happy-case workspace

> Bắt đầu tại [`00-START-HERE.md`](00-START-HERE.md). Chỉ nhận việc thuộc happy case và có trạng thái `🔴 TODO` hoặc `🟢 IN_PROGRESS`.

## Mục tiêu hiện tại

```text
User đăng ký → đăng ký doanh nghiệp → Admin HUKI duyệt
→ Admin doanh nghiệp tạo store và sách → Admin HUKI duyệt store
→ Guest tìm sách → User checkout COD
→ Admin doanh nghiệp/Admin con xử lý đơn → User xem trạng thái
```

## Năm persona chính thức

| Persona | Định danh/quyền |
|---|---|
| Guest | Chưa đăng nhập |
| User/Buyer | Global role `USER` |
| Admin doanh nghiệp | `BUSINESS` + membership `OWNER`; bắt đầu từ User đăng ký doanh nghiệp và được Admin HUKI duyệt |
| Admin con doanh nghiệp | Tài khoản do Owner trực tiếp tạo; quyền là tập con tùy chọn trong `permissions` |
| Admin HUKI | Global role `PLATFORM_ADMIN` |

Admin con không dùng invitation và không cần Admin HUKI duyệt. Owner tạo tài khoản, cung cấp thông tin đăng nhập, hệ thống bắt đổi mật khẩu lần đầu rồi chỉ cho truy cập chức năng đã cấp.

## Trạng thái

| Badge | Ý nghĩa |
|---|---|
| `- [x] ✅ DONE` | UI + API thật + permission + UX states + test + review đã đạt |
| `- [ ] 🟢 IN_PROGRESS` | Đang có owner thực hiện |
| `- [ ] 🟡 PARTIAL` | Có UI mock hoặc backend nhưng chưa thành vertical slice |
| `- [ ] 🔴 TODO` | Thuộc happy case và phải làm |
| `⚪ DEFERRED` | Ngoài happy case, không phát triển hiện tại |
| `⛔ BLOCKED` | Có blocker và dependency được ghi rõ |

## Baseline 2026-09-09

- Next.js build/typecheck đạt; prototype được giữ tại `web/src/legacy`.
- Backend Gateway + 6 microservice đang healthy; unit test đạt `209/209`.
- Frontend chưa có API client thật; API family verified từ browser vẫn `0`.
- UI mock không được tính là `DONE`.
- Community, GHTK, PayOS, promotion, refund, realtime notification và DRM đang `DEFERRED`.

## Tài liệu điều phối

| File | Công dụng |
|---|---|
| [`00-START-HERE.md`](00-START-HERE.md) | Luật nhận việc và bước tiếp theo |
| [`PHASES-PLAN.md`](PHASES-PLAN.md) | Roadmap theo persona và dependency |
| [`screens/SCREEN-INVENTORY.md`](screens/SCREEN-INVENTORY.md) | Danh sách màn hình happy case/deferred |
| [`screens/SCREEN-TEMPLATE.md`](screens/SCREEN-TEMPLATE.md) | Checklist UI/API/permission/test |
| [`API-COVERAGE-MATRIX.md`](API-COVERAGE-MATRIX.md) | Mapping API theo flow và consumer |

Không tự mở lại hạng mục `DEFERRED`. Nếu scope thay đổi, cập nhật roadmap và inventory trước khi code.
