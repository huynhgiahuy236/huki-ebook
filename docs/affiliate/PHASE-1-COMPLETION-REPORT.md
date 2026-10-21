# Báo Cáo Rà Soát & Làm Sạch Giai Đoạn 1 — UX Contract, Validation Contract và Clean Runtime UI

> **Dự án:** HuKi E-Commerce & Content Platform  
> **Tính năng:** Tiếp Thị Liên Kết (Affiliate Marketing)  
> **Giai đoạn:** Giai đoạn 1 (UX Contract, Prototype và Validation Contract)  
> **Thời điểm cập nhật:** 2026-10-21  
> **Trạng thái:** `[~]` ĐÃ LÀM SẠCH TOÀN BỘ MOCK RUNTIME — CHUYỂN SANG HONEST UNAVAILABLE STATE — SẴN SÀNG CHO KIỂM TRA  

---

## 1. Hành Động Khắc Phục & Dọn Sạch Mock Runtime

Theo yêu cầu nghiêm ngặt từ chủ dự án, toàn bộ mock data, fake API và hành vi giả lập đã được gỡ bỏ hoàn toàn khỏi production runtime:

| STT | Yêu cầu bắt buộc | Hành động thực hiện | Minh chứng kiểm tra |
|---|---|---|---|
| 1 | **Xóa hoàn toàn `mockApi.ts` và mọi mock constants** | Đã xóa file `web/src/lib/affiliate/mockApi.ts`. Đã xóa triệt để `mockAffiliateApi`, `MOCK_DASHBOARD_KPIS`, `MOCK_DAILY_CHART`, `MOCK_RECENT_COMMISSIONS`, `MOCK_AFFILIATE_LINKS`. | File không còn tồn tại trên disk. Tìm kiếm toàn bộ `web/src` cho kết quả `No results found`. Kiểm tra tự động bằng Vitest test `TC-VAL-19`. |
| 2 | **Xóa `setTimeout`, `Math.random` giả lập request/idempotency/success** | Đã gỡ bỏ toàn bộ `setTimeout` và `Math.random` trong form đăng ký, dashboard và application page. | `grep_search` kiểm tra `Math.random` và `setTimeout` trong code thực thi của `web/src/app/account/affiliate` trả về 0 kết quả. |
| 3 | **Gỡ bỏ prototype state switcher/toolbar khỏi UI người dùng** | Đã xóa toàn bộ toolbar chuyển đổi trạng thái giả lập trên Dashboard và Application page. | UI không còn bất kỳ nút mô phỏng hay state switcher nào. |
| 4 | **Registration: Không giả duyệt code/hồ sơ, nút submit disabled khi API chưa có** | Form giữ nguyên layout responsive và Zod validation 4 bước; mã CTV chỉ kiểm tra định dạng regex client-side (không giả AVAILABLE); Step 4 có nút "Kiểm Tra Tính Hợp Lệ (Zod Contract)" để rà soát lỗi và nút nộp hồ sơ bị khóa (`disabled`) với nhãn rõ ràng: *"Nộp Hồ Sơ (Chưa Kích Hoạt)"*. Tuyệt đối không redirect giả, không toast giả. | E2E Test #2 xác nhận nút submit disabled và thông báo cổng đăng ký chưa mở. |
| 5 | **Dashboard & Application: Unavailable/not-configured state trung thực** | Dashboard và Application page chuyển sang giao diện thông báo trung thực: tính năng đang trong lộ trình phát triển kỹ thuật (Backend Giai đoạn 3 & 9). Liệt kê đặc tả 7 KPI dưới dạng tài liệu chính sách, không hiển thị bất kỳ số tiền hay giao dịch giả mạo nào. | E2E Test #3 & #4 xác nhận không có dữ liệu tài chính giả và không có state switcher. |
| 6 | **BookAffiliateCard: Gỡ khỏi route thật `/book/[id]`** | Đã unmount `BookAffiliateCard` khỏi `web/src/app/book/[id]/page.tsx`. Component được chuyển thành presentational độc lập ở trạng thái chưa kích hoạt, không sinh/copy link giả. | E2E Test #6 xác nhận trên `/book/1` không còn mount BookAffiliateCard. |
| 7 | **Route `/r/[shortCode]`: Xóa redirect cứng về `/book/1` và nonce tự sinh** | Thay thế bằng trang thông báo trung thực: *"Liên Kết Chưa Được Kích Hoạt"* giải thích rõ dịch vụ phân giải short link đang được phát triển ở Giai đoạn 5. Không tạo nonce giả, không giả lập attribution session. | E2E Test #5 xác nhận hiển thị trang thông báo unactivated rõ ràng. |
| 8 | **Navigation: Không dẫn người dùng tới dashboard/application giả** | `AccountLayout.tsx` chỉ điều hướng đến `/affiliate` (Trang giới thiệu chính sách chương trình), không đưa người dùng tới dashboard hay application khi backend chưa sẵn sàng. | `AccountLayout.tsx` chỉ còn mục "Giới Thiệu Chương Trình" trỏ về `/affiliate`. |

---

## 2. Chi Tiết Danh Mục File Đã Xóa / Đã Sửa

### 2.1 File đã xóa
- `web/src/lib/affiliate/mockApi.ts` (Xóa hoàn toàn khỏi repository).

### 2.2 File đã sửa đổi
1. `web/src/app/book/[id]/page.tsx`: Gỡ bỏ hoàn toàn `BookAffiliateCard` và import tương ứng khỏi trang chi tiết sách production.
2. `web/src/ui/components/affiliate/BookAffiliateCard.tsx`: Chuyển thành pure presentational component ở trạng thái chưa kích hoạt, không gọi mock API, không sinh short link hay copy link giả.
3. `web/src/app/r/[shortCode]/page.tsx`: Xóa logic redirect `/book/1` và UUID nonce tự sinh; thay bằng trang thông báo unactivated trung thực.
4. `web/src/app/account/affiliate/register/page.tsx`: Giữ nguyên UI 4 bước & Zod contract; bỏ async check giả; khóa nút nộp hồ sơ (`disabled`); thêm nút kiểm tra tính hợp lệ Zod schema độc lập; không redirect giả; không toast giả.
5. `web/src/app/account/affiliate/dashboard/page.tsx`: Xóa sạch mock data tài chính, số dư, link, và thanh công cụ đổi UI state; hiển thị giao diện thông báo dịch vụ đang phát triển và đặc tả 7 chỉ số KPI.
6. `web/src/app/account/affiliate/application/page.tsx`: Xóa mock profile và thanh công cụ đổi status; hiển thị giao diện chưa có hồ sơ và quy trình xét duyệt SLA tiêu chuẩn.
7. `web/src/app/affiliate/page.tsx`: Bỏ nút dẫn tới dashboard giả; cập nhật thông báo chương trình đang chuẩn bị kỹ thuật.
8. `web/src/ui/components/layout/AccountLayout.tsx`: Chỉ liên kết tới `/affiliate` (Giới thiệu chương trình), gỡ bỏ các liên kết tới dashboard/application chưa hoàn thiện.
9. `web/src/lib/affiliate/__tests__/affiliate-validation.test.ts`: Bổ sung test case `TC-VAL-19` tự động quét production source code để khẳng định 100% không import `mockApi` hay bất kỳ mock fixture nào.
10. `web/e2e/affiliate.spec.ts`: Cập nhật toàn bộ 6 kịch bản E2E kiểm tra môi trường runtime trung thực (Landing policy, Registration disabled submission & Zod validation, Application honest unactivated state, Dashboard honest in-development state & 7 KPI specs, Route `/r/` unactivated link message, Book page unmounted card).
11. `task/AFFILIATE-MARKETING-AUDIT-ROADMAP.md`: Đổi trạng thái Giai đoạn 1 thành `[~]` trong lúc thực hiện và cập nhật nội dung chi tiết.

---

## 3. Bằng Chứng Kiểm Thử Sau Khi Làm Sạch (Test Evidence)

### 3.1 Vitest Unit & Hygiene Tests
- **Lệnh chạy:** `npm run test` (trong thư mục `web`)
- **Kết quả:** **41/41 tests PASSED (5/5 test files, 100% xanh)**
- **Test file affiliate validation:** `src/lib/affiliate/__tests__/affiliate-validation.test.ts` (19/19 tests PASSED):
  - 18 tests kiểm tra toàn diện Zod schemas (Phone normalization E.164, URL canonicalization, credential/token stripping, Step 1-4 validation, immutable paid traffic transform).
  - 1 test `TC-VAL-19` kiểm tra vệ sinh mã nguồn: xác nhận file `mockApi.ts` không tồn tại và toàn bộ source code production trong `src/app/account/affiliate`, `src/app/affiliate`, `src/app/r`, `src/ui/components/affiliate` không chứa bất kỳ import hoặc symbol mock nào.

```text
 ✓ src/ui/api/tokenStorage.spec.ts (4 tests) 22ms
 ✓ src/ui/api/apiClient.spec.ts (8 tests) 22ms
 ✓ src/ui/context/CartContext.spec.tsx (5 tests) 40ms
 ✓ src/lib/affiliate/__tests__/affiliate-validation.test.ts (19 tests) 25ms
 ✓ src/app/onboarding/onboarding.spec.tsx (5 tests) 826ms

 Test Files  5 passed (5)
      Tests  41 passed (41)
   Duration  2.45s
```

### 3.2 TypeScript Typecheck
- **Lệnh chạy:** `npm run typecheck` (trong thư mục `web`)
- **Kết quả:** **0 errors (tsc --noEmit passed clean)**

### 3.3 Playwright E2E Clean Runtime Tests
- **Lệnh chạy:** `npx playwright test e2e/affiliate.spec.ts` (trong thư mục `web`)
- **Kết quả:** **6/6 tests PASSED (100% xanh)**

```text
Running 6 tests using 1 worker

  ok 1 [chromium] › e2e\affiliate.spec.ts:4:7 › Affiliate Marketing - Phase 1 Honest Verification (No Mock Runtime) › 1. Landing page (/affiliate) loads and displays program policy and CTA (4.1s)
  ok 2 [chromium] › e2e\affiliate.spec.ts:23:7 › Affiliate Marketing - Phase 1 Honest Verification (No Mock Runtime) › 2. Registration page (/account/affiliate/register) validates steps and disables submission when API is unavailable (2.3s)
  ok 3 [chromium] › e2e\affiliate.spec.ts:80:7 › Affiliate Marketing - Phase 1 Honest Verification (No Mock Runtime) › 3. Application status page (/account/affiliate/application) displays honest unactivated state without fake profile (1.2s)
  ok 4 [chromium] › e2e\affiliate.spec.ts:97:7 › Affiliate Marketing - Phase 1 Honest Verification (No Mock Runtime) › 4. Dashboard (/account/affiliate/dashboard) displays honest in-development state and 7 core KPI specifications (1.2s)
  ok 5 [chromium] › e2e\affiliate.spec.ts:120:7 › Affiliate Marketing - Phase 1 Honest Verification (No Mock Runtime) › 5. Route /r/[shortCode] renders honest unactivated link message (no fake redirect) (4.2s)
  ok 6 [chromium] › e2e\affiliate.spec.ts:128:7 › Affiliate Marketing - Phase 1 Honest Verification (No Mock Runtime) › 6. Production book detail page (/book/[id]) does not mount unconfirmed affiliate card (1.3s)

  6 passed (15.1s)
```

---

## 4. Kết Luận & Dừng Lại Chờ Kiểm Tra

- Toàn bộ mock data, fake API, hardcoded financial numbers, và prototype state switchers đã được dọn sạch hoàn toàn khỏi production runtime.
- Không có bất kỳ thay đổi nào vào backend, Prisma schemas, migrations, Wallet, Ledger, Checkout hay API Gateway.
- Trạng thái Giai đoạn 1 trong roadmap đang giữ ở mức `[~]`.
- **DỪNG LẠI TẠI ĐÂY CHỜ KIỂM TRA VÀ Ý KIẾN CHỈ ĐẠO CỦA BẠN TRƯỚC KHI TIẾN HÀNH BƯỚC TIẾP THEO.**
