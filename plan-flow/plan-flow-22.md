# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 22
## BÁO CÁO DOANH THU TOÀN SÀN & CHẾ TÀI XỬ PHẠT GIAN HÀNG (GMV ANALYTICS & STORE SANCTIONS / MODERATION)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng trung tâm điều hành phân tích dữ liệu kinh doanh (Admin BI & GMV Analytics Dashboard) tổng hợp số liệu giao dịch toàn sàn, cơ cấu doanh thu 3 định dạng xuất bản, bảng xếp hạng Top Seller / Top Sách bán chạy, và phát triển hệ thống chế tài xử phạt vi phạm bản quyền / chính sách đa cấp độ kèm quy trình giải trình kháng cáo 7 ngày dành cho đối tác Nhà xuất bản.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `analytics-service`: Module `AnalyticsModule`, `DailyRollupCronWorker`, `RevenueAggregatorService`.
    * `moderation-service`: Module `SanctionsModule`, `SanctionsService`, `AppealsService`.
    * `catalog-service` / `business-service`: Đồng bộ trạng thái khóa gian hàng (`SUSPENDED`, `BANNED`) và ẩn sách vi phạm (`BLOCKED_VIOLATION`).
    * Prisma Schema: Bảng `platform_daily_stats`, `store_sanctions`, `sanction_appeals`.
  * **Frontend (Admin Portal & Seller Portal)**:
    * `web/src/ui/pages/admin/AdminAnalyticsPage.jsx`: Dashboard biểu đồ trực quan GMV, doanh thu hoa hồng 15%, cơ cấu định dạng và bảng xếp hạng.
    * `web/src/ui/pages/admin/AdminSanctionsPage.jsx`: Giao diện Admin ban hành quyết định xử phạt và thẩm định đơn kháng cáo.
    * `web/src/ui/pages/seller/SellerSanctionsPage.jsx`: Giao diện Seller nhận thông báo vi phạm và nộp tài liệu giải trình bản quyền.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 22
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  ANALYTICS ENGINE       SANCTIONS & APPEAL     ADMIN BI DASHBOARD TESTING SUITE &
MODELS           & DAILY ROLLUP CRON    WORKFLOW ENGINE        & SELLER APPEAL UI PLATFORM AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA THỐNG KÊ & CHẾ TÀI

### 📌 Mục tiêu:
Thiết lập bảng lưu trữ chỉ số thống kê tổng hợp `platform_daily_stats`, hồ sơ xử phạt `store_sanctions` và đơn kháng cáo `sanction_appeals` trên PostgreSQL.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `platform_daily_stats`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `stat_date`: Date, Unique Index.
    * `total_gmv`: Decimal.
    * `platform_net_revenue`: Decimal (Hoa hồng 15%).
    * `total_orders_count`: Int.
    * `physical_revenue`: Decimal, `ebook_revenue`: Decimal, `hybrid_revenue`: Decimal.
    * `active_sellers_count`: Int.
    * `created_at`: DateTime.

* **Task 1.2: Thiết kế Bảng `store_sanctions` & `sanction_appeals`**
  * `store_sanctions`:
    * `id`: UUID, Primary Key.
    * `business_id`: UUID, FK `businesses`, Index.
    * `sanction_level`: Enum (`WARNING_TAKEDOWN_BOOK`, `TEMP_SUSPEND_7D`, `TEMP_SUSPEND_30D`, `PERMANENT_BAN`).
    * `reason_code`: Enum (`COPYRIGHT_INFRINGEMENT`, `PROHIBITED_CONTENT`, `FAKE_ORDERS`, `HIGH_CANCEL_RATE`).
    * `violation_details`: Text.
    * `targeted_book_id`: UUID (Nullable, FK `books`).
    * `applied_by`: UUID (FK `users`).
    * `status`: Enum (`ACTIVE`, `APPEAL_PENDING`, `REVOKED`, `EXPIRED`).
    * `start_at`: DateTime, `end_at`: DateTime (Nullable).
  * `sanction_appeals`:
    * `id`: UUID, Primary Key.
    * `sanction_id`: UUID, FK `store_sanctions`.
    * `business_id`: UUID, FK `businesses`.
    * `appeal_reason`: Text.
    * `evidence_documents`: String[] (Text[]).
    * `status`: Enum (`PENDING_REVIEW`, `APPROVED_UNBAN`, `REJECTED`).
    * `reviewed_by`: UUID (Nullable, FK `users`).
    * `reviewed_at`: DateTime (Nullable).

---

## PHẦN 2: XÂY DỰNG ANALYTICS ENGINE & DAILY ROLLUP CRON WORKER

### 📌 Mục tiêu:
Xây dựng tiến trình tự động tổng hợp số liệu giao dịch định kỳ và cung cấp API báo cáo kinh doanh theo các mốc thời gian.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai Cron Job Tổng Hợp Hàng Ngày (`DailyRollupCronWorker`)**
  * Tự động chạy lúc `00:05` hàng ngày:
    * Quét toàn bộ các đơn hàng hoàn tất trong ngày hôm trước.
    * Tính tổng GMV, Phí hoa hồng Sàn (15%), Phân bổ doanh số theo Sách Giấy / Ebook / Hybrid.
    * Ghi / Cập nhật bản ghi trong `platform_daily_stats`.

* **Task 2.2: Triển khai API Báo Cáo Phân Tích Tổng Hợp (Admin Analytics API)**
  * **Endpoint**: `GET /api/v1/admin/analytics/overview`
  * **Query**: `?period=today|7d|30d|this_month|custom&from=...&to=...`
  * **Trả về**:
    * Chỉ số KPI vĩ mô: GMV, Doanh thu thuần, Số đơn, Số sách bán.
    * Chuỗi dữ liệu biểu đồ đường thời gian (Time-series data).
    * Tỷ lệ cơ cấu định dạng (Doughnut chart data).
    * Top 10 Gian hàng và Top 10 Sách bán chạy nhất.

---

## PHẦN 3: PHÁT TRIỂN MODULE CHẾ TÀI XỬ PHẠT & QUY TRÌNH KHÁNG CÁO

### 📌 Mục tiêu:
Xây dựng logic ban hành quyết định xử phạt, tự động khóa tài nguyên vi phạm và quy trình xét duyệt đơn kháng cáo.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: API Ban Hành Quyết Định Xử Phạt (Admin)**
  * **Endpoint**: `POST /api/v1/admin/sanctions/apply`
  * **Body**: `{ businessId, sanctionLevel, reasonCode, violationDetails, targetedBookId? }`
  * **Xử lý theo cấp độ**:
    * Nếu `WARNING_TAKEDOWN_BOOK`: Cập nhật `books.status = 'BLOCKED_VIOLATION'`.
    * Nếu `TEMP_SUSPEND_7D` / `30D`: Cập nhật `businesses.status = 'SUSPENDED'`, đóng băng rút tiền.
    * Nếu `PERMANENT_BAN`: Cập nhật `businesses.status = 'BANNED'`.
    * Gửi email thông báo chính thức và hạn kháng cáo 7 ngày cho Seller.

* **Task 3.2: API Nộp Đơn Kháng Cáo (Seller)**
  * **Endpoint**: `POST /api/v1/seller/sanctions/:sanctionId/appeal`
  * **Body**: `{ appealReason: "...", evidenceDocuments: [...] }`
  * **Xử lý**: Kiểm tra trong hạn 7 ngày, tạo bản ghi `sanction_appeals` (`status: PENDING_REVIEW`), chuyển `store_sanctions.status = 'APPEAL_PENDING'`.

* **Task 3.3: API Thẩm Định Kháng Cáo & Gỡ Phạt (Admin)**
  * **Endpoint**: `POST /api/v1/admin/appeals/:id/resolve`
  * **Body**: `{ action: 'APPROVE_UNBAN' | 'REJECT', decisionNotes: "..." }`
  * **Xử lý**: Nếu `APPROVE_UNBAN` &rarr; Khôi phục `businesses.status = 'ACTIVE'`, mở lại sách `PUBLISHED`, chuyển sanction sang `REVOKED`.

---

## PHẦN 4: GIAO DIỆN ADMIN BI DASHBOARD & TRANG KHÁNG CÁO SELLER

### 📌 Mục tiêu:
Xây dựng giao diện trực quan hóa dữ liệu kinh doanh hiện đại và trang quản lý chế tài, kháng cáo chuyên nghiệp.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Dashboard Phân Tích Kinh Doanh ([`AdminAnalyticsPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/admin/AdminAnalyticsPage.jsx))**
  * **4 Thẻ chỉ số chính**: Tổng GMV, Doanh thu thuần Sàn (15%), Tổng Đơn hàng, Tổng Sách đã bán.
  * **Biểu đồ đường (Line Chart)**: Xu hướng tăng trưởng doanh thu theo ngày/tháng (Sử dụng Chart.js / Recharts).
  * **Biểu đồ tròn (Doughnut Chart)**: Cơ cấu 3 hình thái xuất bản (Sách Giấy $55\%$, Ebook $30\%$, Hybrid $15\%$).
  * **Bảng xếp hạng (Leaderboards)**: Top 10 NXB doanh số khủng & Top 10 Best-Sellers.

* **Task 4.2: Xây dựng Trang Quản Trị Chế Tài Admin ([`AdminSanctionsPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/admin/AdminSanctionsPage.jsx))**
  * Tab 1: Danh sách các gian hàng đang bị phạt (Tên Shop, Mức phạt, Lý do, Hạn phạt).
  * Tab 2: Danh sách đơn kháng cáo chờ duyệt kèm trình xem trước tài liệu bản quyền PDF.
  * Modal ban hành xử phạt: Chọn Shop, Chọn mức phạt, Nhập mô tả vi phạm.

* **Task 4.3: Giao diện Quản Lý Vi Phạm & Kháng Cáo Seller ([`SellerSanctionsPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerSanctionsPage.jsx))**
  * Thông báo trạng thái tài khoản (nếu bị Suspend): Hiển thị đồng hồ đếm ngược ngày mở khóa.
  * Form nộp đơn kháng cáo: Khung nhập giải trình và nút tải lên tệp tài liệu chứng minh.

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ ĐỘ CHÍNH XÁC THỐNG KÊ (TEST SUITE)

### 📌 Mục tiêu:
Đảm bảo độ chính xác $100\%$ của số liệu thống kê và các quy trình xử phạt, gỡ phạt.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit & Integration Test Analytics Rollup**
  * Test Case tổng hợp doanh thu 100 đơn hàng &rarr; Xác nhận GMV và hoa hồng 15% tính chính xác.
  * Test Case tỷ trọng 3 định dạng sách &rarr; Xác nhận tổng tỷ lệ bằng đúng $100\%$.

* **Task 5.2: Kiểm thử Luồng Xử Phạt & Kháng Cáo**
  * Test Case Admin gỡ sách vi phạm &rarr; Xác nhận sách biến mất khỏi Storefront.
  * Test Case Admin tạm khóa Shop 30 ngày &rarr; Xác nhận Shop không đăng được sách mới.
  * Test Case Admin duyệt kháng cáo &rarr; Xác nhận Shop và sách được khôi phục hoạt động bình thường.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `platform_daily_stats`, `store_sanctions`, `sanction_appeals` | ⏳ Sẵn sàng | Backend Team |
| **Analytics Engine**| Daily Rollup Cron Worker & APIs Thống kê GMV / Doanh thu 15% | ⏳ Sẵn sàng | Backend Team |
| **Sanctions Logic** | Xử phạt 3 cấp độ, tự động khóa gian hàng & ẩn sách vi phạm | ⏳ Sẵn sàng | Backend Team |
| **Appeals Workflow**| Quy trình nộp đơn giải trình 7 ngày & Admin duyệt gỡ phạt | ⏳ Sẵn sàng | Fullstack Team |
| **Frontend UI** | Giao diện `AdminAnalyticsPage.jsx`, `AdminSanctionsPage.jsx` & Seller Panel | ⏳ Sẵn sàng | Frontend Team |
| **Platform Audit** | Vượt qua 100% Ma trận kiểm thử thống kê & chế tài (TC_MOD_01 đến 06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 22 thuộc Nền tảng Sách Huki Ebook.*
