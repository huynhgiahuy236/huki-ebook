# Báo Cáo Rà Soát & Hoàn Thiện Giai Đoạn 1 — UX Contract, Validation Contract và Clean Runtime UI

> **Dự án:** HuKi E-Commerce & Content Platform  
> **Tính năng:** Tiếp Thị Liên Kết (Affiliate Marketing)  
> **Giai đoạn:** Giai đoạn 1 (UX Contract, Prototype và Validation Contract)  
> **Thời điểm cập nhật:** 2026-10-21  
> **Trạng thái:** `[~]` ĐÃ HOÀN TẤT DỌN SẠCH RUNTIME & CHUẨN HÓA Wording — DỪNG CHỜ NGHIỆM THU  

---

## 1. Tổng Kết Các Điểm Chỉnh Sửa & Chuẩn Hóa Cuối Cùng

| STT | Nội dung yêu cầu | Trạng thái | Chi tiết thực hiện |
|---|---|:---:|---|
| 1 | **Cập nhật roadmap `task/AFFILIATE-MARKETING-AUDIT-ROADMAP.md`** | **HOÀN THÀNH** | Xóa toàn bộ mô tả API mock; xóa thông tin mount trên `/book/[id]`; xóa thông tin redirect attribution trên `/r/[shortCode]`; ghi nhận đúng 19 affiliate validation tests, Vitest 41/41, Playwright 6/6, typecheck pass; mô tả trung thực trạng thái unavailable; giữ `[~]`, chưa tự ý đánh `[x]`. |
| 2 | **Xóa thuật ngữ kỹ thuật/nội bộ khỏi UI người dùng** | **HOÀN THÀNH** | Đổi nút *"Kiểm Tra Tính Hợp Lệ (Zod Contract)"* thành *"Kiểm tra thông tin"*; xóa triệt để các từ ngữ nội bộ như "Backend", "Giai đoạn 3", "Giai đoạn 8 & 9"; thay bằng câu văn trung tính, chuyên nghiệp: *"Tính năng đang được hoàn thiện và chưa mở chính thức"*. |
| 3 | **Application page không phán đoán người dùng có hay không có hồ sơ** | **HOÀN THÀNH** | Đổi badge thành *"Chưa thể tra cứu"*, đổi tiêu đề thành *"Chưa Thể Tải Trạng Thái Hồ Sơ"* và thông báo rõ dịch vụ tra cứu chưa được kích hoạt; không đưa ra kết luận người dùng có hay không có hồ sơ. |
| 4 | **BookAffiliateCard: Xóa default price/rate, không tính hoa hồng khi thiếu dữ liệu** | **HOÀN THÀNH** | Đã xóa giá trị mặc định `price=150000` và `estimatedRatePercent=10`; `price` và `estimatedRatePercent` là props `number \| null`; không tính toán hay hiển thị hoa hồng khi `!isActivated` hoặc thiếu dữ liệu xác thực; giữ nguyên việc không mount vào route sách production. |
| 5 | **Landing: Đổi CTA và làm rõ cổng đăng ký chưa mở** | **HOÀN THÀNH** | Đổi CTA thành *"Xem trước mẫu đăng ký"*; nêu rõ thông báo cổng tiếp nhận chưa mở trước khi người dùng vào form; loại bỏ hoàn toàn cảm giác có thể nộp hồ sơ thật. |
| 6 | **Kiểm thử độc lập toàn diện** | **HOÀN THÀNH** | Chạy lại `npm run test` (41/41 passed), `npm run typecheck` (0 errors), `npx playwright test e2e/affiliate.spec.ts` (9/9 passed bao gồm mobile 390x844 responsive và a11y smoke). |

---

## 2. Danh Mục Mã Nguồn & Vị Trí Lưu Trữ

1. **UX Contract:** `docs/affiliate/PHASE-1-UX-CONTRACT.md` (v1.4.1-APPROVED).
2. **Domain Types:** `web/src/types/affiliate.ts`.
3. **Zod Validation Schemas:** `web/src/lib/affiliate/schemas.ts` (100% Zod 4.6.5 compatible, immutability với `.transform()`, phone normalization E.164, strict avatar allowlist).
4. **Validation & Hygiene Tests:** `web/src/lib/affiliate/__tests__/affiliate-validation.test.ts` (19 test cases, bao gồm `TC-VAL-19` quét toàn bộ production source để bảo đảm không chứa mock API hay mock fixtures).
5. **Giao diện Người dùng (Clean Runtime UI):**
   - Landing page: `web/src/app/affiliate/page.tsx`
   - Form đăng ký 4 bước: `web/src/app/account/affiliate/register/page.tsx` (Khóa nút nộp, nút "Kiểm tra thông tin")
   - Tra cứu tiến độ hồ sơ: `web/src/app/account/affiliate/application/page.tsx` (Trạng thái chưa thể tra cứu)
   - Bảng điều khiển đối tác: `web/src/app/account/affiliate/dashboard/page.tsx` (Chưa mở chính thức, liệt kê đặc tả 7 KPI)
   - Route liên kết rút gọn: `web/src/app/r/[shortCode]/page.tsx` (Thông báo liên kết chưa kích hoạt)
   - Presentational component: `web/src/ui/components/affiliate/BookAffiliateCard.tsx` (Thuần túy unactivated, không tính tiền, không mount trên production)
   - Khung điều hướng: `web/src/ui/components/layout/AccountLayout.tsx` (Chỉ dẫn đến Giới thiệu chương trình)
6. **Playwright E2E Suite:** `web/e2e/affiliate.spec.ts` (9 scenarios kiểm tra runtime trung thực, mobile viewport 390x844 responsive, và accessibility smoke).
7. **Lộ trình dự án:** `task/AFFILIATE-MARKETING-AUDIT-ROADMAP.md` (Giai đoạn 1 ở mức `[~]`).

---

## 3. Bằng Chứng Kiểm Thử Độc Lập (Test Evidence)

### 3.1 Vitest Unit & Hygiene Tests
- **Lệnh chạy:** `npm run test` (trong thư mục `web`)
- **Kết quả:** **41/41 tests PASSED (100% xanh)**
- **Test file affiliate validation:** `src/lib/affiliate/__tests__/affiliate-validation.test.ts` (**19/19 tests PASSED**)

```text
 ✓ src/ui/api/tokenStorage.spec.ts (4 tests)
 ✓ src/ui/api/apiClient.spec.ts (8 tests)
 ✓ src/ui/context/CartContext.spec.tsx (5 tests)
 ✓ src/lib/affiliate/__tests__/affiliate-validation.test.ts (19 tests)
 ✓ src/app/onboarding/onboarding.spec.tsx (5 tests)

 Test Files  5 passed (5)
      Tests  41 passed (41)
   Duration  2.45s
```

### 3.2 TypeScript Typecheck
- **Lệnh chạy:** `npm run typecheck` (trong thư mục `web`)
- **Kết quả:** **0 errors (tsc --noEmit passed sạch)**

### 3.3 Playwright Clean Runtime & Mobile/A11y Tests
- **Lệnh chạy:** `npx playwright test e2e/affiliate.spec.ts` (trong thư mục `web`)
- **Kết quả:** **9/9 tests PASSED (100% xanh)**

```text
Running 9 tests using 1 worker

  ok 1 [chromium] › e2e\affiliate.spec.ts:4:7 › 1. Landing page (/affiliate) loads and displays program policy and preview CTA (1.5s)
  ok 2 [chromium] › e2e\affiliate.spec.ts:24:7 › 2. Registration page (/account/affiliate/register) validates steps and disables submission when API is unavailable (2.4s)
  ok 3 [chromium] › e2e\affiliate.spec.ts:81:7 › 3. Application status page (/account/affiliate/application) displays honest unactivated lookup state (1.2s)
  ok 4 [chromium] › e2e\affiliate.spec.ts:98:7 › 4. Dashboard (/account/affiliate/dashboard) displays honest in-development state and 7 core KPI specifications (1.3s)
  ok 5 [chromium] › e2e\affiliate.spec.ts:121:7 › 5. Route /r/[shortCode] renders honest unactivated link message (no fake redirect) (1.2s)
  ok 6 [chromium] › e2e\affiliate.spec.ts:129:7 › 6. Production book detail page (/book/[id]) does not mount unconfirmed affiliate card (1.1s)
  ok 7 [chromium] › e2e\affiliate.spec.ts:137:7 › 7. Mobile Viewport (390x844): Landing page has no horizontal overflow and CTA is accessible (1.2s)
  ok 8 [chromium] › e2e\affiliate.spec.ts:158:7 › 8. Mobile Viewport (390x844): Registration 4-step wizard renders and navigates without overflow (4.6s)
  ok 9 [chromium] › e2e\affiliate.spec.ts:211:7 › 9. Accessibility smoke test: Landmarks, headings, form labels, keyboard navigation, and button names (1.3s)

  9 passed (16.9s)
```

---

## 4. Trạng Thái Hiện Tại & Cam Kết Dừng Chờ

- Giai đoạn 1 đang được giữ ở mức `[~]` (Đang rà soát & chờ nghiệm thu), không tự ý đánh `[x]`.
- Tuyệt đối không thay đổi backend, Prisma schema, migration, Wallet, Ledger, Checkout hay API Gateway.
- Không tự ý chuyển sang Giai đoạn 2.
- **DỪNG LẠI TẠI ĐÂY CHỜ KIỂM TRA VÀ CHỈ ĐẠO NGHIỆM THU CỦA BẠN.**
