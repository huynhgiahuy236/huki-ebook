# Web Control Center — Đọc trước khi làm

## 1. Việc đang tập trung

`Phase 01` đang `🟢 IN_PROGRESS`: typed API client, session/auth thật và permission contract. Không mở rộng mock UI trước khi foundation này chạy được.

| Hạng mục | Status | Việc tiếp theo |
|---|---|---|
| Next.js shell/UI baseline | 🟡 PARTIAL | Giữ parity, tách dần khỏi compatibility layer |
| Backend runtime | ✅ DONE | Dùng Gateway `http://localhost:3000/api/v1` |
| Typed API client | 🔴 TODO | Response envelope, error mapping, auth headers/cookie |
| Auth browser integration | 🔴 TODO | Login → `/auth/me` → refresh → logout |
| Granular business permission | 🔴 TODO | Chốt permission catalog và enforcement |
| Happy-case screen verified | 🔴 TODO | Hiện `0` screen đạt DoD |

## 2. Happy case duy nhất

```text
Guest/User → đăng ký/đăng nhập → xem sách → giỏ hàng + địa chỉ
→ checkout COD → xem đơn

Admin doanh nghiệp → đăng ký doanh nghiệp → được Admin HUKI duyệt
→ tạo store/sản phẩm → tạo Admin con + chọn permissions → xử lý đơn

Admin HUKI → duyệt business/store → quản trị catalog → xem system health
```

## 3. Ngoài scope

`⚪ DEFERRED`: Community/forum, review, chat, notification realtime, GHTK/shipment/delivery staff, PayOS/VNPay/MoMo, voucher/banner/flash sale, refund/return, Wallet/reward, WebReader/DRM và recovery/security nâng cao không chặn happy case.

Không gọi các API `INTERNAL`, `WEBHOOK`, `CALLBACK` từ browser.

## 4. Trình tự nhận việc

1. Đọc [`PHASES-PLAN.md`](PHASES-PLAN.md) và đúng một phase đang làm.
2. Chọn dòng happy case `🔴 TODO`/`🟡 PARTIAL` trong [`screens/SCREEN-INVENTORY.md`](screens/SCREEN-INVENTORY.md).
3. Ghi owner, ngày và đổi `Work = 🟢 IN_PROGRESS` trước khi sửa code.
4. Dùng [`screens/SCREEN-TEMPLATE.md`](screens/SCREEN-TEMPLATE.md) để khóa route, persona, permission và API.
5. Implement UI + API thật + states + permission + test.
6. Người khác review bằng backend thật.
7. Cập nhật screen inventory và [`API-COVERAGE-MATRIX.md`](API-COVERAGE-MATRIX.md).
8. Chỉ reviewer chuyển thành `- [x] ✅ DONE`.

## 5. Quy tắc phối hợp

- Không sửa screen/track đang `IN_PROGRESS` bởi người khác.
- Admin doanh nghiệp và Admin HUKI là hai scope tuyệt đối tách biệt.
- Admin con chỉ có permission được Owner cấp; ẩn UI không thay thế kiểm tra `403` ở backend.
- Không dùng invitation cho Admin con. Owner trực tiếp provision tài khoản và nhân viên đổi mật khẩu lần đầu.
- Không hạ trạng thái đã đạt nếu không ghi lý do/evidence.

## 6. Nguồn chuẩn

1. Controller/DTO/guard trong `platform/apps`.
2. Runtime OpenAPI và Swagger.
3. API coverage matrix.
4. Screen spec.
5. Prototype UI chỉ là tham chiếu thiết kế.

## 7. Definition of Done

- Route và persona đúng; API thật qua Gateway.
- Backend kiểm tra role, business membership và từng permission.
- Loading, empty, success, error, retry và forbidden đầy đủ.
- Responsive 360/768/1280+ và accessibility đạt.
- Typecheck/build/test đạt; reviewer khác owner xác nhận.

## 8. Lệnh và URL

```powershell
cd E:\HuKi\platform
npm run dev

cd E:\HuKi\web
npm run dev
npm run typecheck
npm run build
```

```text
Web: http://localhost:3100
API: http://localhost:3000/api/v1
Swagger: http://localhost:3000/api/docs
Health: http://localhost:3000/api/v1/health/services
```

## 9. Task kế tiếp

1. Typed API client.
2. Auth/session vertical slice.
3. Permission catalog và contract tạo Admin con.
4. `AUT-001 Login` nối backend thật.
5. Business registration → Admin HUKI approval.
