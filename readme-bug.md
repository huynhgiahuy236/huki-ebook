# 📘 QUY TRÌNH KỸ THUẬT XỬ LÝ BUG & KIỂM THỬ E2E (README-BUG)
> **Tài liệu tham chiếu chuẩn cho toàn bộ chu kỳ phát triển, sửa lỗi và nghiệm thu hệ thống HuKi Platform.**  
> **Áp dụng cho:** Tất cả các phân hệ Monorepo (`web: 141 routes`, `platform: 7 microservices`, `databases: Postgres, MongoDB, Redis, RabbitMQ`).

---

## 🧭 TÔN CHỈ & NGUYÊN TẮC CỐT LÕI (CORE PRINCIPLES)

1. **Tuyệt đối không mock data trên giao diện - Không làm qua loa:**
   - Sửa tận gốc rễ cơ sở dữ liệu và logic nghiệp vụ. Không áp dụng các giải pháp chắp vá (workaround tạm bợ) để che giấu lỗi giao diện.
2. **Kiểm thử 100% trên môi trường & dữ liệu thật:**
   - Frontend chạy thật (`http://localhost:3100`), Backend Gateway thật (`http://localhost:3000`), microservices thật và cơ sở dữ liệu thật.
3. **Nguồn dữ liệu chân lý duy nhất (Single Source of Truth):**
   - Mọi số liệu thống kê (tồn kho, doanh thu, hoa hồng, trạng thái đơn) phải tính toán trực tiếp từ bảng cơ sở dữ liệu quan hệ, không hardcode, không tính độc lập ở Client.
4. **Bảo mật & Kiểm soát phòng thủ tại Backend (Defensive Backend):**
   - Mọi quy tắc nghiệp vụ, chống gian lận (Anti-Fraud, Self-referral, phân quyền RBAC) phải thực thi tại Backend Services. Frontend chỉ phản chiếu trạng thái để tối ưu trải nghiệm (UX).
5. **Kiểm thử E2E độc lập, giữ sạch mã nguồn chính:**
   - Toàn bộ script kiểm thử tự động lưu tại thư mục [`scripts/`](file:///e:/HuKi/scripts/) (hoặc `scripts/uat-audit/`), tuyệt đối không chèn code test tạm bợ vào `src/`.
6. **Lập tài liệu giải pháp trước khi đụng code:**
   - Luôn phân tích nguyên nhân, đánh giá hiệu ứng domino và lập kế hoạch giải pháp duy nhất chuẩn sàn TMĐT (Shopee, Tiki, Amazon) trình duyệt trước khi sửa source code.

---

## 🔄 QUY TRÌNH 10 BƯỚC TỪ BUG LOCAL ĐẾN UAT CHO ĐẾN KHI DONE

```
[1. Phát hiện Bug] ──► [2. Phân tích Domino] ──► [3. Lập Kế hoạch Giải pháp]
                                                           │ (Chờ Duyệt)
                                                           ▼
[6. E2E Test Local] ◄── [5. Unit Test & Build] ◄── [4. Sửa Tận Gốc Local]
       │
       ▼
[7. Kiểm toán Ma trận Local vs UAT]
       │
       ▼
[8. Triển khai UAT & Test Live] ──► [9. Báo cáo Nghiệm thu] ──► [10. DONE & RELEASE]
```

---

### Bước 1: Phát hiện & Thu thập Lỗi Local (Bug Discovery & Ingestion)
- **Thao tác:**
  - Phát hiện qua kiểm thử giao diện thực tế, robot Playwright quét tự động, hoặc từ nhật ký Terminal / Console (`ECONNREFUSED`, lỗi Prisma, lỗi Hydration Mismatch, lỗi kết nối DB).
  - Thu thập đầy đủ bằng chứng kỹ thuật:
    - Ảnh chụp màn hình lỗi (`screenshots/`, `image.png`).
    - URL Route bị lỗi (ví dụ: `/checkout`, `/seller/orders`, `/r/:shortCode`).
    - Vai trò người dùng (Buyer, Seller, Admin, Shipper).
    - Mã phản hồi HTTP (400, 403, 404, 500, 503) và payload request/response.
  - Ghi nhận lỗi tập trung vào tài liệu backlog (ví dụ: [`BUG.md`](file:///e:/HuKi/BUG.md), [`task/bug-local.md`](file:///e:/HuKi/task/bug-local.md)).

---

### Bước 2: Phân tích Nguyên nhân Gốc rễ & Bản đồ Hiệu ứng Domino (Root Cause Analysis)
- **Thao tác:**
  - Không sửa triệu chứng bề mặt. Bóc tách nguyên nhân qua 4 tầng kiến trúc:
    1. *Tầng Cơ sở dữ liệu:* Sai schema, dữ liệu seed dị tật (ví dụ: ID mang tiền tố `s2-` không chuẩn UUID), thiếu index, thiếu migration.
    2. *Tầng Backend Services:* DTO validation lỗi, nuốt lỗi `try/catch`, thiếu Transaction (`tx`), đứt gãy Outbox / RabbitMQ event, sai cổng kết nối (Port 3000 vs 3005).
    3. *Tầng Gateway & Proxy:* Sai URL upstream, thiếu header xác thực nội bộ, lỗi CORS, đứt kết nối WebSocket.
    4. *Tầng Frontend Client:* Hydration mismatch giữa SSR và Client, race condition trong React state, fallback dữ liệu rác.
  - Đánh giá tác động dây chuyền: Lỗi này làm gãy những luồng nào khác (ví dụ: sách lỗi ID làm gãy luôn trang chi tiết, giỏ hàng, và checkout).

---

### Bước 3: Lập Tài liệu Kế hoạch Giải pháp Duy nhất (Architectural Solution Proposal)
- **Thao tác:**
  - Soạn thảo tài liệu giải pháp chi tiết (ví dụ: [`SOLUTION.md`](file:///e:/HuKi/SOLUTION.md), [`task/solutions-and-e2e-roadmap.md`](file:///e:/HuKi/task/solutions-and-e2e-roadmap.md)).
  - Đưa ra **đúng 1 phương án tối ưu duy nhất** chuẩn sàn TMĐT (Shopee, Tiki, Lazada, Amazon). Không đưa phương án A/B mơ hồ, không chấp nhận giải pháp tạm bợ.
  - Thiết lập tiêu chuẩn nghiệm thu (Acceptance Criteria): 0 lỗi console, HTTP 200, dữ liệu DB cập nhật đúng state.
  - **Tạm dừng:** Chờ User / Tech Lead duyệt kế hoạch trước khi chỉnh sửa mã nguồn.

---

### Bước 4: Sửa chữa Tận gốc trên Nhánh Local (`feature/...` hoặc `fix/...`)
- **Thao tác:**
  - *Tầng DB:* Tạo và chạy Prisma Migration (`npx prisma migrate deploy`) hoặc viết script chuẩn hóa dữ liệu thật. Tuyệt đối không sửa tay trực tiếp trong database để tránh drift schema.
  - *Tầng Backend:* Sửa logic nghiệp vụ, bọc trong Transaction (`tx`), đảm bảo tính Idempotent cho Consumer và xử lý đồng thời (Deadlock prevention, Row locking `FOR UPDATE`).
  - *Tầng Frontend:* Sửa SSR Hydration, chuyển Dialog/Modal sang React Portal (`createPortal(..., document.body)`), đồng bộ AuthContext, loại bỏ hoàn toàn các chuỗi fallback cứng giả lập.

---

### Bước 5: Kiểm thử Đơn vị & Kiểm tra Biên dịch Cục bộ (Unit Testing & Build Verification)
- **Thao tác:**
  - Chạy toàn bộ các test suite liên quan:
    ```bash
    npm --prefix platform run test:commerce
    npm --prefix platform run test:promotion
    npm --prefix platform run test:shipping
    npm --prefix platform run test:identity
    npm --prefix platform run test:business
    ```
  - **Tiêu chuẩn:** 100% test suites phải **PASS**, không dùng mock để gian lận test runner.
  - Biên dịch TypeScript sạch:
    ```bash
    npm --prefix platform run build:shared
    npm --prefix platform run build:commerce
    npm --prefix web run build
    ```
  - Chạy `git diff --check` để đảm bảo code sạch, không có whitespace thừa hoặc lỗi cú pháp.

---

### Bước 6: Kiểm thử E2E Độc lập tại Local (Isolated Local E2E Automation)
- **Thao tác:**
  - Chạy kịch bản kiểm thử E2E tự động lưu riêng tại [`scripts/`](file:///e:/HuKi/scripts/) (ví dụ: `scripts/e2e_test_bug_01_hydration.js`, Playwright script).
  - Kiểm thử trực tiếp trên Frontend thật (`http://localhost:3100`), Backend thật (`:3000`), và PostgreSQL thật.
  - Xác nhận đạt 100% Acceptance Criteria đã đề ra ở Bước 3.

---

### Bước 7: Kiểm toán Phân biệt Môi trường Local vs UAT (Environment Matrix Audit)
- **Thao tác:**
  - Phân loại rạch ròi giữa **"Lỗi cả Local & UAT đều bị"** (do code logic) và **"Lỗi chỉ UAT bị"** (do môi trường).
  - Rà soát các lỗi môi trường UAT thường gặp:
    - Thiếu biến môi trường trong `docker-compose.uat.yml` (`COMMERCE_SERVICE_URL`, `BUSINESS_DATABASE_URL`, `IDENTITY_DATABASE_URL`).
    - Cấu hình Nginx Reverse Proxy: Lỗi trailing slash `/socket.io/`, lỗi giới hạn tải ảnh `client_max_body_size 413`.
    - Chứng chỉ SSL / CORS / Cookie cross-domain (`SameSite=Lax`, `Secure`).

---

### Bước 8: Triển khai UAT Staging & Kiểm thử Trực tiếp (Live E2E Verification)
- **Thao tác:**
  - Merge code vào nhánh UAT và deploy lên máy chủ Staging (`https://huki-uat.duckdns.org`).
  - Chạy bộ script kiểm toán chuyên biệt UAT trong [`scripts/uat-audit/`](file:///e:/HuKi/scripts/uat-audit/).
  - Thực hiện kịch bản kiểm thử E2E liên thông đa phân hệ (Cross-portal E2E flows):
    * *Độc giả mua hàng* ➔ *Người bán nhận thông báo & đóng hàng* ➔ *Bưu tá lấy hàng & nộp ảnh POD* ➔ *Khách nhận hàng* ➔ *Escrow tự động giải ngân cho Shop sau 7 ngày* ➔ *CTV Affiliate nhận hoa hồng khả dụng*.

---

### Bước 9: Lập Báo cáo Kiểm toán Tổng hợp Nghiệm thu (Master Audit Report)
- **Thao tác:**
  - Cập nhật báo cáo tổng kết (ví dụ: [`task/uat-audit/MASTER-AUDIT-REPORT.md`](file:///e:/HuKi/task/uat-audit/MASTER-AUDIT-REPORT.md)).
  - Ghi nhận trạng thái: Đánh dấu `[ĐÃ SỬA]` kèm dẫn chứng commit, dòng mã xử lý, và script kiểm chứng thành công.
  - Phân tích các Rủi ro Lan truyền (Collateral Risks) còn tồn đọng: Hiệu năng, dung lượng DB, bảo mật thông tin OWASP, rò rỉ ranh giới vi dịch vụ.

---

### Bước 10: Hoàn tất & Sẵn sàng Release (Done Checklist & Production Readiness)
- **Thao tác:**
  - Rà soát checklist bảo đảm cuối cùng:
    - [x] Không còn chuỗi fallback key hardcode trong mã nguồn.
    - [x] Không còn kết nối SQL trực tiếp chéo cơ sở dữ liệu (`pg.Client`).
    - [x] Database Migrations đã được apply hoàn tất trên mọi database vi dịch vụ.
    - [x] Cơ chế phân quyền và chống gian lận (Anti-fraud, Self-referral, Role restriction) hoạt động chuẩn xác.
  - Đánh dấu task / bug là **DONE**, tạo Pull Request chính thức để merge vào nhánh chính (`develop` / `main`).

---

## 📂 BẢN ĐỒ TÀI LIỆU & THƯ MỤC LIÊN QUAN

| Tập tin / Thư mục | Mục đích sử dụng |
| :--- | :--- |
| [`readme-bug.md`](file:///e:/HuKi/readme-bug.md) | **Tài liệu này** — Quy trình chuẩn 10 bước từ Bug Local đến UAT Done |
| [`BUG.md`](file:///e:/HuKi/BUG.md) | Báo cáo rà soát lỗi chi tiết & các lỗ hổng đang mở |
| [`SOLUTION.md`](file:///e:/HuKi/SOLUTION.md) | Thiết kế kiến trúc giải pháp chuẩn Shopee cho các phân hệ cốt lõi |
| [`task/solutions-and-e2e-roadmap.md`](file:///e:/HuKi/task/solutions-and-e2e-roadmap.md) | Lộ trình và kịch bản chi tiết cho các bug giao diện & backend |
| [`task/uat-audit/MASTER-AUDIT-REPORT.md`](file:///e:/HuKi/task/uat-audit/MASTER-AUDIT-REPORT.md) | Báo cáo kiểm toán tổng hợp trên môi trường UAT Staging |
| [`scripts/`](file:///e:/HuKi/scripts/) | Thư mục chứa toàn bộ script kiểm thử tự động độc lập |
| [`scripts/uat-audit/`](file:///e:/HuKi/scripts/uat-audit/) | Thư mục script kiểm toán chuyên biệt cho UAT |
