# Báo cáo Hoàn Thành Giai Đoạn 11 — Observability, Infrastructure và Performance

## 1. Tổng quan Giai đoạn 11
Giai đoạn 11 trang bị hệ thống giám sát hoạt động (Observability), thu thập chỉ số vận hành chuẩn Prometheus (Metrics), hệ thống phát cảnh báo khẩn cấp (P1/P2 Alerting via Webhook & Structured Logs), kiểm tra trạng thái sức khỏe nghiệp vụ (Affiliate Operational Probes & Health Sanity), và cơ chế dừng tiến trình an toàn (Graceful Shutdown) cho phân hệ Affiliate Marketing nền tảng HuKi.

Toàn bộ quy trình tuân thủ nghiêm ngặt nguyên tắc **Zero Mock Data** trong runtime sản phẩm, kiểm soát chặt chẽ che giấu thông tin cá nhân (PII Sanitization) trong nhật ký log, và đảm bảo mục tiêu chất lượng dịch vụ (SLO) cam kết.

---

## 2. Các Quyết Định Kiến Trúc Đã Chốt (Decision Log)

| ID | Ngày | Quyết định | Nội dung chi tiết |
|---|---|---|---|
| **AFF-DEC-019** | 2026-10-22 | Mục tiêu SLO & Latency Target | Cam kết 99.9% availability cho Link Tracking & Checkout (< 150ms p95 latency); 99.5% availability cho Dashboard & Reporting queries (< 500ms p95 latency). |
| **AFF-DEC-020** | 2026-10-22 | Kênh cảnh báo sự cố P1/P2 | Tích hợp Webhook (Slack/Discord/Telegram) kết hợp Structured Stderr Logs định dạng JSON cho toàn bộ sự cố P1/P2 (Lệch sổ cái Ledger, nghẽn Outbox queue > 1000 events, Settlement worker crash). |
| **AFF-DEC-021** | 2026-10-22 | Chính sách lưu vết & kiểm toán | 90 ngày hot storage (Prometheus/Loki/Elasticsearch) + Lưu trữ tối thiểu 365 ngày cho dữ liệu kiểm toán tài chính và biến động số dư (`AffiliateAuditLog`, `LedgerTransaction`). |

---

## 3. Kiến Trúc & Các Module Kỹ Thuật Đã Triển Khai

### 3.1 Nhật Ký Có Cấu Trúc & Che Giấu PII (`AffiliateStructuredLogger`)
- **Tập tin:** [affiliate-structured-logger.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/affiliate/monitoring/affiliate-structured-logger.ts)
- **Đặc tính kỹ thuật:**
  - Định dạng JSON chuẩn OpenTelemetry/ELK: `{ timestamp, service, subsystem, level, action, traceId, durationMs, userId, storeId, metadata, error }`.
  - Hàm làm sạch `maskPii(obj)` tự động nhận diện và che giấu:
    - Số CCCD/CMND: giữ 3 số đầu và 4 số cuối (`079****1234`).
    - Số tài khoản ngân hàng: giữ 4 số đầu và 2 số cuối (`1012****90`).
    - Số điện thoại: giữ 3 số đầu và 3 số cuối (`090****567`).
    - Email: che giấu tên hộp thư (`n***@domain.com`).
    - Token, secret, password: thay thế bằng `[REDACTED]`.

### 3.2 Bộ Chỉ Số Prometheus (`AffiliateMetricsService`)
- **Tập tin:** [affiliate-metrics.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/affiliate/monitoring/affiliate-metrics.service.ts)
- **Chỉ số theo dõi trực tiếp:**
  1. `huki_affiliate_link_clicks_total` (Counter): Theo dõi lượt click link affiliate theo `store_id` và trạng thái `VALID | BOT | INVALID_STORE | RATE_LIMITED`.
  2. `huki_affiliate_commissions_created_total` (Counter): Số lượng bản ghi hoa hồng tạo mới theo `store_id` và trạng thái.
  3. `huki_affiliate_commission_amount_vnd_total` (Counter): Tổng giá trị hoa hồng tích lũy phát sinh (VND).
  4. `huki_affiliate_commissions_settled_total` (Counter): Lượt quyết toán hoa hồng theo chiều `CREDIT` (ví CTV) hoặc `REVERSAL`.
  5. `huki_affiliate_payout_requests_total` (Counter): Lượt yêu cầu rút tiền theo trạng thái `PENDING | COMPLETED | REJECTED`.
  6. `huki_affiliate_outbox_lag` (Gauge): Số lượng sự kiện Outbox đang chờ xử lý của phân hệ Affiliate.
  7. `huki_affiliate_ledger_reconciliation_status` (Gauge): Trạng thái đối soát sổ cái kép (1 = Cân bằng, 0 = Lệch sổ cái).
  8. `huki_affiliate_settlement_duration_seconds` (Histogram): Thời gian thực thi chu kỳ quyết toán 00:00 UTC+7 hàng ngày.
  9. `huki_affiliate_api_latency_seconds` (Histogram): Độ trễ các endpoint API affiliate (buckets đo lường p95 < 150ms).

### 3.3 Dịch Vụ Cảnh Báo Sự Cố Khẩn Cấp (`AffiliateAlertService`)
- **Tập tin:** [affiliate-alert.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/affiliate/monitoring/affiliate-alert.service.ts)
- **Cơ chế hoạt động:**
  - Phát sự cố khẩn cấp P1/P2 qua Webhook và Structured Stderr Logs.
  - Tự động gắn đường dẫn Runbook vận hành tương ứng (`runbookUrl`).
  - Các kịch bản cảnh báo chuẩn hóa:
    - **P1_CRITICAL - `LEDGER_IMBALANCE_DETECTED`:** Kích hoạt ngay khi phát hiện số dư Ví khác biệt so với số liệu Sổ cái kép.
    - **P1_CRITICAL / P2_HIGH - `OUTBOX_QUEUE_BACKLOG`:** Kích hoạt P1 khi hàng đợi Outbox tồn đọng >= 1000 events, P2 khi tồn đọng >= 200 events.
    - **P1_CRITICAL - `SETTLEMENT_WORKER_CRASH`:** Kích hoạt khi tiến trình quyết toán 00:00 gặp lỗi chưa xử lý.

### 3.4 Kiểm Tra Sức Khỏe & Sanity Check (`AffiliateHealthService`)
- **Tập tin:** [affiliate-health.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/affiliate/monitoring/affiliate-health.service.ts)
- **Cung cấp endpoint:**
  - `GET /admin/affiliates/health` trên [affiliate-admin.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/affiliate/controllers/affiliate-admin.controller.ts).
  - `GET /health/affiliate` trên [health.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/health.controller.ts).
- **Kiểm tra 4 thành phần:**
  1. Kết nối Database trên các bảng Affiliate.
  2. Tồn đọng Outbox lag queue (< 200: ok, 200-999: warning, >= 1000: critical).
  3. Tính toàn vẹn Sổ cái kép (so sánh số dư ví và tổng nợ phải trả Affiliate Payable).
  4. Trạng thái và thời điểm chạy gần nhất của Settlement Worker.

### 3.5 Tối Ưu Hiệu Năng & Graceful Shutdown (`AffiliateSettlementWorker`)
- **Tập tin:** [affiliate-settlement-worker.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/affiliate/services/affiliate-settlement-worker.service.ts)
- Triển khai interface `OnApplicationShutdown`: Khi nhận tín hiệu tắt hệ thống (`SIGTERM`/`SIGINT`), worker chủ động từ chối chạy đợt batch mới (`SKIPPED_SHUTTING_DOWN`), ngăn chặn tình trạng đứt gãy giao dịch tài chính dở dang.

---

## 4. Bằng Chứng Kiểm Thử Kỹ Thuật (Test Evidence)

### 4.1 Unit & Integration Test Suite (`affiliate-observability.spec.ts`)
- **Kết quả:** `15 passed / 15 total (100%)`
  1. `AffiliateStructuredLogger`: Định dạng đầy đủ traceId, durationMs, action và metadata (Pass).
  2. `AffiliateStructuredLogger`: Làm sạch dữ liệu PII CCCD, ngân hàng, SĐT, email, tokens (Pass).
  3. `AffiliateMetricsService`: Tăng counter click link với nhãn store và trạng thái (Pass).
  4. `AffiliateMetricsService`: Tăng counter hoa hồng và tích lũy doanh số hoa hồng VND (Pass).
  5. `AffiliateMetricsService`: Cập nhật gauge độ trễ Outbox và trạng thái Sổ cái (Pass).
  6. `AffiliateMetricsService`: Quan sát thời gian quyết toán bằng histogram (Pass).
  7. `AffiliateAlertService`: Phát cảnh báo P1 khi phát hiện chênh lệch Sổ cái (Pass).
  8. `AffiliateAlertService`: Phân loại chính xác ngưỡng cảnh báo Outbox Backlog (>= 1000 là P1, < 1000 là P2) (Pass).
  9. `AffiliateAlertService`: Phát cảnh báo P1 khi Settlement Worker gặp sự cố (Pass).
  10. `AffiliateHealthService`: Trả về trạng thái `ok` và bộ chỉ số SLO khi hệ thống lành mạnh (Pass).
  11. `AffiliateHealthService`: Trả về trạng thái `degraded` khi Outbox tồn đọng từ 200 đến 999 sự kiện (Pass).
  12. `AffiliateHealthService`: Trả về trạng thái `error` và tự động kích hoạt cảnh báo khi Sổ cái lệch (Pass).
  13. `AffiliateSettlementWorker`: Thực thi quyết toán, ghi nhận metric và nhật ký kiểm toán (Pass).
  14. `AffiliateSettlementWorker`: Từ chối thực thi và trả về `SKIPPED_SHUTTING_DOWN` khi nhận tín hiệu tắt máy (Pass).
  15. `AffiliateSettlementWorker`: Bắt ngoại lệ và kích hoạt cảnh báo P1 nếu quá trình xử lý thất bại (Pass).

### 4.2 Tổng Hợp Toàn Bộ Test Suites Commerce Service
- **Lệnh thực thi:** `npx jest apps/commerce-service/src/modules/affiliate/`
- **Kết quả:** **10 passed / 10 test suites, 129 passed / 129 tests (100%)**
  - `affiliate-checkout.spec.ts`: 12 tests passed
  - `affiliate-dashboard.spec.ts`: 6 tests passed
  - `affiliate-lifecycle.spec.ts`: 10 tests passed
  - `affiliate-payout-fraud.spec.ts`: 18 tests passed
  - `affiliate-observability.spec.ts`: 15 tests passed
  - `affiliate-wallet-settlement.spec.ts`: 13 tests passed
  - `affiliate-link.spec.ts`: 11 tests passed
  - `affiliate-foundation.spec.ts`: 16 tests passed
  - `seller-affiliate.spec.ts`: 14 tests passed
  - `affiliate-application.spec.ts`: 14 tests passed

### 4.3 Playwright End-to-End Suite
- **Lệnh thực thi:** `npx playwright test e2e/affiliate.spec.ts` (tại thư mục `web`)
- **Kết quả:** **16 passed / 16 tests (100%)**
- **Thời gian chạy:** 31.2s

### 4.4 Build & Typecheck
- `npm run build:commerce`: **0 errors** (TypeScript biên dịch sạch toàn bộ `apps/commerce-service`).
- `npx tsc --noEmit` (tại thư mục `web`): **0 errors**.

---

## 5. Điểm Dừng Nghiệp Vụ
Đã hoàn thành toàn bộ công việc theo yêu cầu của **Giai đoạn 11**.

**DỪNG LẠI CHỜ LỆNH CHỦ DỰ ÁN TRƯỚC KHI BẮT ĐẦU GIAI ĐOẠN 12 (Full UAT, rollout và hậu kiểm).**
