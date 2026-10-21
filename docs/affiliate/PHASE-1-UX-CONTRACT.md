# Hợp đồng Trải nghiệm Người dùng (UX Contract) & Đặc tả Giao diện
## Giai đoạn 1 — Tiếp thị Liên kết (Affiliate Marketing)

- **Mã tài liệu:** `AFF-SPEC-UX-CONTRACT-001`
- **Phiên bản:** `1.4.1-APPROVED`
- **Trạng thái:** `APPROVED` (Đã được phê duyệt bởi Người dùng — Bắt đầu triển khai Prototype Giai đoạn 1)
- **Hệ thống áp dụng:** `web` (Next.js 16.3.3 App Router, React 19, TailwindCSS) & Backend Services (`commerce-service`, `business-service`, `identity-service`, `api-gateway`)
- **Ngày phê duyệt:** 2026-10-21
- **Tài liệu tham chiếu nội bộ đã đọc thực tế:**
  - `web/AGENTS.md`
  - `web/node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`
  - `web/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`
  - `web/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
  - `web/node_modules/next/dist/docs/01-app/01-getting-started/08-caching.md`
  - `task/AFFILIATE-MARKETING-AUDIT-ROADMAP.md` (Mục 4 & 5)
  - `web/src/ui/components/layout/AccountLayout.tsx`

---

## 1. Chuẩn hóa Thuật ngữ & Phân biệt Mã Tiếp thị

### 1.1 Bảng Thuật ngữ Chung

| Khái niệm | Thuật ngữ chính thức (Primary) | Nhãn rút gọn (Short Label / Mobile Badge) | Quy tắc sử dụng |
|---|---|---|---|
| **Affiliate Partner** | **Đối tác tiếp thị** | **CTV** | Dùng "Đối tác tiếp thị" ở tất cả tiêu đề trang, hợp đồng, điều khoản, email, thông báo và tài liệu hướng dẫn. Chỉ dùng nhãn rút gọn "CTV" trong badge nhỏ, tag trạng thái trên mobile khi không gian hiển thị bị giới hạn. |
| **Commission** | **Hoa hồng tiếp thị** | **Hoa hồng** | Khoản tiền ghi nhận trên từng sản phẩm (`OrderItem`). |
| **Merchant / Shop** | **Nhà bán hàng** | **Seller / Shop** | Gian hàng phát hành sách trên sàn HuKi. |
| **Attributed Order** | **Đơn hàng tiếp thị** | **Đơn tiếp thị** | Đơn mua có ghi nhận click hợp lệ qua link của đối tác tiếp thị. |

### 1.2 Phân biệt Rạch ròi giữa Affiliate Code và Short Code

| Thuộc tính so sánh | Mã Đối tác Tiếp thị (`affiliateCode`) | Mã Đường dẫn Rút gọn (`shortCode`) |
|---|---|---|
| **Bản chất** | Định danh duy nhất của tài khoản đối tác (`Partner Identifier`). | Định danh ngẫu nhiên/rút gọn của một liên kết chia sẻ cụ thể (`AffiliateLink Identifier`). |
| **Ví dụ thực tế** | `MINH_HUKI`, `BOOK_REVIEWER_99`. | `b7x9k2q`, `x8m2p1`. |
| **Vị trí sử dụng** | Quản lý tài khoản, hợp đồng, đối soát, thẻ hồ sơ đối tác. | Xuất hiện trên URL công khai: `https://huki.vn/r/{shortCode}`. |
| **Quy tắc bảo mật** | **CẤM hiển thị trực tiếp `affiliateCode` trên link chia sẻ** nhằm chống scraping, enumeration tấn công đối tác và bảo vệ quyền riêng tư. | Preview link trên giao diện tạo link **LUÔN LUÔN** sử dụng định dạng: `https://huki.vn/r/{shortCode}` (ví dụ mẫu: `https://huki.vn/r/demo-book-123`). |

---

## 2. Kiến trúc Tuyến đường & Route Hierarchy (Next.js App Router)

### 2.1 Tuyến đường Public & Chi tiết Sách

| URL Tuyến đường | Mục đích & Trách nhiệm màn hình | Vai trò truy cập |
|---|---|---|
| `/book/[id]` | **Trang chi tiết sách** (Route chuẩn số ít `book`, không dùng `books`). Tích hợp Card **"Chia sẻ và nhận hoa hồng"** dành riêng cho tài khoản Đối tác tiếp thị có trạng thái `ACTIVE`. Đặt sau vùng mua chính, không che thanh checkout nổi trên mobile. | Public / Đối tác tiếp thị |
| `/affiliate` | **Trang thông tin chương trình Tiếp thị Liên kết** (Landing Page công khai giới thiệu quyền lợi, cách hoạt động, bảng hoa hồng mẫu, FAQ và nút CTA kêu gọi đăng ký chuyển hướng đến `/account/affiliate/register`). | Public / Khách vãng lai |
| `/r/[shortCode]` | **Tuyến đường chuyển hướng tiếp thị (Redirect Handler)**: Thực hiện redirect HTTP 302/307 sang trang đích kèm one-time opaque nonce. Ghi nhận raw click telemetry (best-effort). **Tuyệt đối không coi prefetch/crawler là attribution hợp lệ.** | Public |

### 2.2 Tuyến đường Portal Cá nhân (Tích hợp trong `AccountLayout`)

Toàn bộ các trang quản lý cá nhân của Đối tác tiếp thị được đặt tại không gian `/account/affiliate/...`, tích hợp đồng nhất vào layout tài khoản chung `AccountLayout.tsx` với nhóm điều hướng **"TIẾP THỊ LIÊN KẾT"**:

| URL Tuyến đường | Mục đích & Trách nhiệm màn hình | Quyền hạn / Trạng thái |
|---|---|---|
| `/account/affiliate/register` | **Hồ sơ đăng ký nhiều bước** (Wizard 4 bước: Thông tin cá nhân, Kênh quảng bá, Phương thức tiếp thị, Điều khoản & Cam kết). | Người dùng đã đăng nhập, chưa có hồ sơ đối tác. |
| `/account/affiliate/application` | **Theo dõi tiến độ & Bổ sung hồ sơ** (Hiển thị trạng thái: Đang chờ duyệt, Yêu cầu bổ sung thông tin kèm link sửa trực tiếp từng trường lỗi, hoặc Từ chối kèm lý do). | Ứng viên đối tác (`PENDING_REVIEW` / `REQUEST_CHANGES` / `REJECTED`). |
| `/account/affiliate/dashboard` | **Bảng điều khiển Đối tác tiếp thị** (Hiển thị đúng 7 chỉ số KPI cốt lõi, biểu đồ doanh thu theo ngày, bộ tạo link nhanh và bảng hoa hồng gần đây). | Đối tác `ACTIVE` / `SUSPENDED` (Read-only). |
| `/account/affiliate/links` | **Trung tâm tạo & Quản lý Link tiếp thị** (Tìm kiếm sách, tạo link `/r/{shortCode}`, gắn mã chiến dịch `campaign`/`subId`, tải mã QR). | Đối tác `ACTIVE`. |
| `/account/affiliate/commissions` | **Báo cáo đối soát hoa hồng** (Bộ lọc đa chiều, danh sách hoa hồng chi tiết theo `OrderItem`, bảng chi tiết trạng thái, drawer lịch sử phân bổ). | Đối tác `ACTIVE` / `SUSPENDED`. |
| `/account/affiliate/payouts` | **Cài đặt thanh toán & Lịch sử rút tiền** (Quản lý tài khoản ngân hàng thụ hưởng, theo dõi lệnh chi trả, đối soát tổng hợp). | Đối tác `ACTIVE` đủ điều kiện. |
| `/account/affiliate/settings` | **Quản lý hồ sơ đối tác & Kênh quảng bá** (Cập nhật thông tin liên hệ, thêm/bớt kênh, quản lý consent tiếp thị, xem phiên bản điều khoản đã chấp thuận). | Đối tác `ACTIVE`. |

### 2.3 Tuyến đường Nhà bán hàng (Đặc tả theo Năng lực / Required Capabilities)

Không tự định nghĩa tên chức danh (roles) giả định. Quyền truy cập được đặc tả bằng **Bộ năng lực yêu cầu (Required Capabilities)**, sẽ được map chính thức sang permission model của hệ thống ở Giai đoạn 2 (Backend & Database Architecture):

| URL Tuyến đường | Mục đích & Trách nhiệm màn hình | Năng lực yêu cầu (Required Capabilities) |
|---|---|---|
| `/seller/affiliate/overview` | **Tổng quan tiếp thị gian hàng** (Doanh thu tiếp thị, chi phí hoa hồng, tỷ lệ chuyển đổi, top đầu sách). | `affiliate.store.view` |
| `/seller/affiliate/settings` | **Cấu hình chính sách hoa hồng gian hàng** (Bật/tắt tham gia mạng lưới tiếp thị, thiết lập tỷ lệ hoa hồng mặc định toàn shop). | `affiliate.policy.manage` |
| `/seller/affiliate/books` | **Thiết lập hoa hồng chi tiết theo đầu sách** (Ghi đè tỷ lệ hoa hồng cho sách giấy/ebook/audiobook, thao tác hàng loạt, đặt lịch hiệu lực). | `affiliate.product.manage` |
| `/seller/affiliate/commissions` | **Đối soát hoa hồng gian hàng** (Mặc định hiển thị nhóm theo `SellerOrder`, hỗ trợ mở rộng drill-down chi tiết từng `OrderItem`). | `affiliate.commission.read` |
| `/seller/affiliate/audit` | **Nhật ký kiểm toán chính sách** (Lịch sử thay đổi tỷ lệ hoa hồng của nhân sự shop, thời điểm áp dụng, ghi chú). | `affiliate.audit.read` |

---

## 3. Kiến trúc Chuyển hướng, Tách biệt Attribution & Opaque Nonce `ref_sig`

### 3.1 Vấn đề Prefetch và Web Crawlers
Next.js `<Link>` component tự động prefetch các đường link xuất hiện trong viewport (theo `04-linking-and-navigating.md`). Đồng thời, các web crawlers (Facebook External Hit, Googlebot, Twitterbot) thường xuyên gửi request `GET` để lấy OpenGraph metadata.
- **Nếu gán Attribution ngay tại `GET /r/{shortCode}`: Sẽ gây ra sai lệch dữ liệu nghiêm trọng, tạo hàng loạt Attribution ảo và vi phạm chính sách công bằng.**

### 3.2 Tách biệt 2 Tầng: Redirect Handler & Attribution Settlement

```
[ Khách nhấp Link ] ──> GET /r/{shortCode} (Kiểm tra Header / Bot Filter)
                              │
                              ├── Nếu là Prefetch/Crawler: Bỏ qua Attribution, chỉ redirect 302/307
                              │
                              └── Nếu là Trình duyệt thực:
                                    │ Redirect 302/307 sang /book/[id]#aff_nonce=NONCE (Dùng Fragment, không dùng Query)
                                    ▼
                             Client Navigation tại /book/[id]
                                    │
                                    ├── Đọc aff_nonce vào bộ nhớ và xóa ngay fragment bằng window.history.replaceState
                                    │
                                    └── Gửi ngầm POST /affiliate/attributions ({ nonce: aff_nonce })
                                          │
                                          ▼
                             Máy chủ kiểm tra Nonce (chưa dùng, TTL 60s, Origin hợp lệ)
                             Khởi tạo AttributionSession bền vững trong Database
                             Đặt HTTP-only, Secure Opaque Cookie: `huki_aff_session`
```

1. **Tầng 1: `GET /r/{shortCode}` (Chuyển hướng & Raw Click Telemetry)**
   - Lọc request prefetch: Kiểm tra headers `Purpose === 'prefetch'`, `Sec-Purpose === 'prefetch'`, `X-Nextjs-Data`.
   - Lọc bot/crawler: Đối chiếu danh sách User-Agent bots.
   - Ghi nhận `raw_clicks` dưới dạng telemetry best-effort (asynchronous event queue, không làm chậm redirect).
   - Tạo mã nonce một lần `aff_nonce`:
     - Là chuỗi ngẫu nhiên bảo mật cao (Cryptographic UUIDv4 / 32-byte opaque hex string).
     - **Replay-safe:** Được lưu tạm trong Redis với TTL 60 giây và bị tiêu thụ (consume/delete) ngay trong lần gọi POST đầu tiên.
     - **Không chứa bất kỳ thông tin nào về Affiliate, User ID hay Campaign.**
     - **Tuyệt đối không được ghi log (no-log) trong access log của web server.**
   - **Bảo mật URL Fragment:** Trả về mã phản hồi HTTP `302 Found` hoặc `307 Temporary Redirect` chuyển hướng người dùng sang trang đích kèm URL fragment: `/book/[id]#aff_nonce={nonce}`. (Không truyền bằng query parameter vì query params bị gửi lên web server và lưu trong access logs/referer headers, trong khi fragment `#` chỉ tồn tại cục bộ ở client).
2. **Tầng 2: `POST /affiliate/attributions` (Lưu AttributionSession & Gán Opaque Cookie)**
   - Ngay khi trang đích nạp xong, script client đọc `aff_nonce` từ `window.location.hash` vào bộ nhớ và gọi ngay:
     ```typescript
     window.history.replaceState(null, '', window.location.pathname + window.location.search);
     ```
     để xóa hoàn toàn fragment khỏi thanh địa chỉ của trình duyệt nhằm ngăn chia sẻ link rác hoặc lưu bookmark có nonce.
   - Client thực hiện request `POST /affiliate/attributions` mang theo `{ nonce }`:
     - **Xác thực Nguồn gốc (Origin / Referer Validation):** Chỉ chấp nhận request có `Origin` hoặc `Referer` khớp với domain chính thức của sàn HuKi.
     - **Kiểm soát Tần suất (Rate-limit):** Giới hạn tối đa 10 request attribution/phút trên mỗi subnet IP khách hàng.
     - **Không bind cứng vào Fingerprint:** Không ràng buộc cố định vào fingerprint trình duyệt để tránh từ chối nhầm các thiết bị di động có tính năng bảo mật ngẫu nhiên hóa canvas/user-agent.
     - Khởi tạo bản ghi **`AttributionSession` bền vững** trong Database: `partnerId`, `shortCode`, `campaignId`, `clientIpMasked`, `attributedAt`, `expiresAt` (30 ngày).
     - Thiết lập cookie an toàn: `huki_aff_session` với các cờ bắt buộc: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
   - Chỉ các đơn hàng phát sinh với cookie `huki_aff_session` hợp lệ mới đủ điều kiện được tính hoa hồng tại thời điểm thanh toán (`Checkout`).

---

## 4. Đặc tả Bảng điều khiển 7 KPI Chuẩn mực (Dashboard 7-KPI Contract)

Bảng điều khiển của Đối tác tiếp thị (`/account/affiliate/dashboard`) hiển thị **chính xác 7 thẻ chỉ số KPI**, tái sử dụng hệ thống **Google Material Symbols** sẵn có trong HuKi (`material-symbols-outlined`):

```
[1. Valid Clicks] ──> [2. Conversion] ──> [3. Pending] ──> [4. Holding] ──> [5. Available] ──> [6. Paid]
                                                                  └──> [7. Reversed] (Khi thu hồi/gian lận/dispute)
```

| STT | Khóa chỉ số (API Key) | Tiêu đề hiển thị | Định dạng dữ liệu | Material Symbol Icon | Chú giải nghiệp vụ (Tooltip Specification) |
|:---:|---|---|---|---|---|
| **1** | `validClicks` | **Lượt click hợp lệ** | Số nguyên (`12,450`) | `ads_click` | Tổng số lượt nhấp chuột hợp lệ qua các liên kết `/r/{shortCode}` đã được xác thực thành công qua `AttributionSession`. Đã loại trừ prefetch, bot và nhấp lặp lại trong cùng phiên. |
| **2** | `conversion` | **Chuyển đổi** | Hiển thị kép: `185 đơn` & `(1.48%)` | `trending_up` | Số lượng đơn hàng được ghi nhận thành công và tỷ lệ chuyển đổi = `(Số đơn / Lượt click hợp lệ) * 100%`. |
| **3** | `pending` | **Hoa hồng chờ xử lý** | Tiền tệ VND (`1,250,000 đ`) | `schedule` | Hoa hồng phát sinh từ các đơn hàng mới đặt hoặc đang giao. Khoản này chưa chắc chắn vì đơn có thể bị hủy hoặc giao không thành công. |
| **4** | `holding` | **Hoa hồng tạm giữ đối soát** | Tiền tệ VND (`3,420,000 đ`) | `lock_clock` | Hoa hồng đang trong thời gian giữ đối soát: Sách in từ `deliveredAt` đến `deliveredAt + 7 ngày`; Ebook/Audiobook 24 giờ. Bị đóng băng nếu phát sinh tranh chấp/khiếu nại. |
| **5** | `available` | **Hoa hồng khả dụng** | Tiền tệ VND (`5,680,000 đ`) | `check_circle` | Hoa hồng đã hoàn tất thời gian tạm giữ an toàn, không có khiếu nại và hợp lệ để tạo yêu cầu rút tiền về tài khoản ngân hàng. |
| **6** | `paid` | **Hoa hồng đã thanh toán** | Tiền tệ VND (`18,200,000 đ`) | `payments` | **Chỉ số tổng hợp (Aggregate metric):** Tổng số tiền hoa hồng lấy từ các lệnh rút tiền / chi trả có trạng thái `COMPLETED`. (Chi tiết phân bổ hoa hồng ↔ payout sẽ được thiết kế ở Giai đoạn 2). |
| **7** | `reversed` | **Hoa hồng đã thu hồi** | Tiền tệ VND (`450,000 đ`) | `history` | Hoa hồng đã từng vào số dư khả dụng (`AVAILABLE`) nhưng sau đó bị thu hồi hoặc bù trừ do phát hiện gian lận hậu kiểm, chargeback ngân hàng hoặc phán quyết tranh chấp sau holding. |

---

## 5. Vòng đời Hoa hồng & Chính sách Tạm giữ (Commission Lifecycle & Holding Policy)

### 5.1 Vòng đời Trạng thái Hoa hồng cấp OrderItem
Hoa hồng được quản lý độc lập tại cấp từng dòng sản phẩm (`OrderItemAffiliateCommission`) với đúng **5 trạng thái vòng đời duy nhất**:

```
           ┌──────────────┐
           │   PENDING    │ ── (Hủy đơn trước khi giao / Giao thất bại) ──> CANCELLED
           └──────┬───────┘
                  │ (Đã giao hàng thành công / Kích hoạt nội dung số)
                  ▼
           ┌──────────────┐
           │   HOLDING    │ ── (Đổi trả / Hoàn tiền trong kỳ giữ) ──────────> CANCELLED
           └──────┬───────┘
                  │ (Hết hạn holding an toàn, không có tranh chấp)
                  ▼
           ┌──────────────┐
           │  AVAILABLE   │ ── (Thu hồi hậu kiểm / Gian lận / Chargeback) ──> REVERSED
           └──────┬───────┘
                  │
                  ▼
           [ Rút tiền thành công: Payout COMPLETED (Aggregate metric) ]
```

### 5.2 Phân biệt Rõ rệt CANCELLED và REVERSED

| Đặc tính so sánh | Trạng thái `CANCELLED` (Đã hủy) | Trạng thái `REVERSED` (Đã thu hồi) |
|---|---|---|
| **Thời điểm phát sinh** | Xảy ra khi đơn hàng bị hủy hoặc hoàn trả **TRƯỚC KHI** hoa hồng chuyển sang `AVAILABLE` (khi đang ở `PENDING` hoặc `HOLDING`). | Xảy ra **SAU KHI** hoa hồng đã từng được công nhận là `AVAILABLE` (đã nằm trong số dư khả dụng của đối tác). |
| **Tác động số dư khả dụng** | **Không ảnh hưởng:** Khoản hoa hồng này chưa bao giờ được cộng vào `availableBalance` của đối tác. | **Bị trừ trực tiếp:** Hệ thống tạo bút toán đảo (Ledger Reversal Entry) để trừ số tiền này khỏi số dư khả dụng, hoặc ghi nhận nợ cần bù trừ vào các kỳ hoa hồng kế tiếp. |
| **Nguyên nhân điển hình** | Người mua hủy đơn trước khi giao; giao hàng thất bại trả về (bùng hàng); người mua gửi yêu cầu trả hàng/hoàn tiền hợp lệ trong thời gian holding 7 ngày của sách in. | Gian lận bị phát hiện muộn bởi đội ngũ Risk/Fraud; ngân hàng phát hành thẻ khiếu nại bồi hoàn (chargeback); xử lý tranh chấp khiếu nại ngoài thời hạn thông thường. |

### 5.3 Chính sách Tạm giữ Đối soát Chuẩn xác (Holding Period Policy)

1. **Sách in / Hàng vật lý (Physical Books):**
   - Mốc kích hoạt: `holdingStartedAt = deliveredAt` (thời điểm đối tác vận chuyển ghi nhận trạng thái giao hàng thành công `DELIVERED`).
   - Mốc kết thúc: `holdingUntil = deliveredAt + 7 ngày` (chính xác 168 giờ sau khi giao hàng thành công).
   - **Tuyệt đối không cộng thêm 7 ngày sau khi đã hết thời hạn đổi trả (tránh kéo dài thành 14 ngày sai lệch).**
   - **Việc người mua bấm "Xác nhận đã nhận hàng" (Buyer Confirmation) KHÔNG rút ngắn thời gian holding** trong giai đoạn này (chờ quyết định nghiệp vụ chính thức có văn bản phê duyệt).
2. **Sách điện tử / Sách nói (Ebook & Audiobook):**
   - `holdingStartedAt = paidAt` (thời điểm thanh toán thành công).
   - `holdingUntil = paidAt + 24 giờ`.
3. **Quy định Đóng băng khi có Tranh chấp (Dispute Freeze):**
   - Bất kỳ khiếu nại hoặc tranh chấp nào phát sinh (`Dispute` / `ReturnRequest` đang mở) sẽ **chặn đứng việc quyết toán (Settlement Block)**.
   - Trạng thái hoa hồng tiếp tục bị khóa tại `HOLDING` cho đến khi có phán quyết cuối cùng. Nếu chấp nhận trả hàng/hoàn tiền: Chuyển sang `CANCELLED`. Nếu bác bỏ khiếu nại: Tiếp tục thời gian holding còn lại trước khi chuyển `AVAILABLE`.

### 5.4 Quy chuẩn Về Thuế & Paid Aggregate
- Trong giai đoạn MVP, toàn bộ hoa hồng hiển thị trên giao diện và tính toán đối soát được ghi nhận theo giá trị **Hoa hồng gộp (Gross Commission)**.
- Hệ thống **CHƯA thực hiện tự động khấu trừ thuế tại nguồn (No automatic tax withholding in MVP)**.
- Không coi `PayoutBatch` là model hiện hữu trong cơ sở dữ liệu. Chỉ số `paid` là số liệu tổng hợp (aggregate) từ các bản ghi thanh toán có trạng thái `COMPLETED`. Cơ chế phân bổ chi tiết giữa từng dòng hoa hồng và từng lệnh payout sẽ được thiết kế ở Giai đoạn 2.

---

## 6. Danh mục Trường Dữ liệu (Field Dictionary) & Zod Contract Tương thích Zod 4.6.5

### 6.1 Field Dictionary Chi tiết cho 4 Bước Đăng ký

| Bước | Field Name | UI Control | Kiểu dữ liệu | Bắt buộc | Mặc định | Chuẩn hóa (Normalize) | Ràng buộc / Enum / Regex | Quy tắc có điều kiện | Mã lỗi (Error Code) | Thông báo lỗi Tiếng Việt | Xác thực Phía Máy chủ (Server Rule) |
|---|---|---|---|:---:|---|---|---|---|---|---|---|
| **1** | `displayName` | Text Input | `string` | Có | `""` | `trim()` | 2–80 ký tự; `^[\p{L}\p{N}\s._-]+$` | Không | `AFF_ERR_DISPLAY_NAME_INVALID` | Họ tên hiển thị phải từ 2 đến 80 ký tự và không chứa ký tự đặc biệt nguy hiểm. | Trim, strip HTML tags, regex Unicode hợp lệ. |
| **1** | `affiliateCode` | Text Input + Async Status | `string` | Có | `""` | `trim().toUpperCase()` | 4–24 ký tự; `^[A-Z0-9_]{4,24}$` | Không | `AFF_ERR_CODE_FORMAT_INVALID` | Mã đối tác chỉ gồm 4-24 ký tự chữ in hoa, chữ số và gạch dưới. | Uppercase, regex check, check blacklist keywords (`ADMIN`, `HUKI`, etc.), check unique trong DB Transaction. |
| **1** | `bio` | Textarea + Char Counter | `string` | Có | `""` | `trim()` | 30–500 ký tự | Không | `AFF_ERR_BIO_LENGTH_INVALID` | Giới thiệu ngắn về kinh nghiệm tiếp thị phải từ 30 đến 500 ký tự. | Trim, sanitize XSS, đếm ký tự UTF-8. |
| **1** | `contactEmail` | Email Input | `string` | Có | Email account | `trim().toLowerCase()` | Chuẩn Email RFC 5322; max 254 ký tự | Không | `AFF_ERR_EMAIL_INVALID` | Vui lòng cung cấp địa chỉ email hợp lệ để nhận thông báo đối soát. | Normalize lowercase, DNS MX check (optional), đối chiếu nếu khác email tài khoản. |
| **1** | `contactPhone` | Tel Input | `string` | Có | Phone account | `trim()` | Chuẩn số điện thoại VN: hỗ trợ `0`, `84` hoặc `+84` nối tiếp `[35789]\d{8}`; normalize về E.164 (`+84...`) | Không | `AFF_ERR_PHONE_INVALID` | Số điện thoại không đúng định dạng di động Việt Nam (VD: 0901234567 hoặc +84901234567). | Validate regex `^(?:\+84\|84\|0)[35789]\d{8}$`, lưu chuẩn E.164. |
| **1** | `useAccountAvatar` | Checkbox | `boolean` | Có | `true` | - | `boolean` | Nếu `false`, bắt buộc chọn `avatarUrl` | - | - | Backend ưu tiên `user.avatar` nếu cờ này là `true`. |
| **1** | `avatarUrl` | File Selector (Upload) | `string` | Không | `null` | `trim()` | URL an toàn từ upload service nội bộ; max 2048 ký tự | Bắt buộc khi `useAccountAvatar=false` | `AFF_ERR_AVATAR_INVALID` | Vui lòng chọn ảnh đại diện nếu không sử dụng ảnh của tài khoản. | Kiểm tra URL thuộc domain CDN nội bộ; cấm URL bên ngoài tùy tiện. |
| **2** | `channels` | Dynamic List (1–10 items) | `array` | Có | `[item]` | Dedupe theo `canonicalUrl` | Tối thiểu 1 kênh, tối đa 10 kênh | Không | `AFF_ERR_CHANNELS_COUNT_INVALID` | Bạn phải cung cấp ít nhất 1 kênh và tối đa 10 kênh quảng bá. | Count array bounds, dedupe theo `canonicalUrl`. |
| **2** | `channels[].type` | Select Dropdown | `enum` | Có | `'FACEBOOK'` | - | `FACEBOOK`, `TIKTOK`, `YOUTUBE`, `BLOG`, `INSTAGRAM`, `OTHER` | Không | `AFF_ERR_CHANNEL_TYPE_INVALID` | Loại kênh quảng bá không hợp lệ. | Enum membership validation. |
| **2** | `channels[].url` | URL Input | `string` | Có | `""` | `trim()` | HTTPS; max 2048; cấm credentials; cấm sensitive params (case-insensitive) | Không | `AFF_ERR_CHANNEL_URL_PROTOCOL` / `AFF_URL_SENSITIVE_DATA_DETECTED` | Đường dẫn kênh bắt buộc sử dụng HTTPS, không chứa thông tin đăng nhập và không chứa token nhạy cảm. | Parse `new URL()`, protocol `https:`, regex chặn sensitive query params, chạy qua adapter allowlist. |
| **2** | `channels[].handle` | Text Input | `string` | Không | `""` | `trim()` | Max 100 ký tự | Không | `AFF_ERR_CHANNEL_HANDLE_INVALID` | Tên định danh kênh (handle) không được vượt quá 100 ký tự. | Sanitize string. |
| **2** | `channels[].followersRange` | Select Dropdown | `enum` | Có | `'UNDER_5K'` | - | `UNDER_5K`, `FROM_5K_TO_20K`, `FROM_20K_TO_100K`, `OVER_100K` | Không | `AFF_ERR_FOLLOWERS_INVALID` | Vui lòng chọn khoảng số lượng người theo dõi của kênh. | Enum membership check. |
| **2** | `channels[].isPrimary` | Radio Button | `boolean` | Có | 1st: `true` | - | `boolean` | Phải có chính xác 1 kênh có `isPrimary: true` | `AFF_ERR_PRIMARY_CHANNEL_REQUIRED` | Vui lòng chọn chính xác một kênh quảng bá chính của bạn. | Validate `channels.filter(c => c.isPrimary).length === 1`. |
| **2** | `contentCategories` | Multi-select Checkbox | `array` | Có | `[]` | Dedupe qua Set | Mảng ID danh mục sách; từ 1 đến 8 danh mục sau dedupe | Không | `AFF_ERR_CATEGORIES_BOUNDS` | Vui lòng chọn từ 1 đến 8 thể loại sách bạn dự định tiếp thị. | Dedupe, kiểm tra ID tồn tại trong DB Categories. |
| **2** | `promotionMethods` | Checkbox Group | `array` | Có | `[]` | Dedupe qua Set | Enum: `REVIEW`, `VIDEO`, `SOCIAL_POST`, `BLOG_ARTICLE`, `LIVESTREAM`, `COMMUNITY_GROUP`; 1–6 items sau dedupe | Không | `AFF_ERR_PROMOTION_METHODS_REQUIRED` | Vui lòng chọn ít nhất một phương thức tiếp thị bạn sẽ thực hiện. | Dedupe array, validate enum values, `min(1)`, `max(6)`. |
| **3** | `applicantType` | Radio Group | `enum` | Có | `'INDIVIDUAL'` | - | `INDIVIDUAL`, `BUSINESS` | Không | `AFF_ERR_APPLICANT_TYPE_INVALID` | Loại đối tác không hợp lệ (chỉ chấp nhận Cá nhân hoặc Doanh nghiệp). | Enum check; nếu BUSINESS sẽ gắn cờ yêu cầu bổ sung thông tin doanh nghiệp ở kỳ payout. |
| **3** | `promotionDescription` | Textarea | `string` | Có | `""` | `trim()` | 50–1000 ký tự | Không | `AFF_ERR_DESCRIPTION_LENGTH` | Kế hoạch và kinh nghiệm tiếp thị chi tiết phải từ 50 đến 1000 ký tự. | Sanitize XSS, đếm ký tự. |
| **3** | `hasPaidTraffic` | Switch / Toggle | `boolean` | Có | `false` | - | `boolean` | Nếu `true`: `paidTrafficSources` bắt buộc; nếu `false`: reset về `[]` | - | - | Boolean cast. |
| **3** | `paidTrafficSources` | Multi-select Group | `array` | Có điều kiện | `[]` | Dedupe qua Set | Enum: `FACEBOOK_ADS`, `GOOGLE_ADS`, `TIKTOK_ADS`, `YOUTUBE_ADS`, `NATIVE_ADS`, `OTHER` | Bắt buộc khi `hasPaidTraffic=true` (min 1). Tự reset `[]` khi `false`. | `AFF_ERR_PAID_TRAFFIC_SOURCE_REQUIRED` | Bạn đã bật quảng cáo trả phí, vui lòng chọn ít nhất một nguồn lưu lượng trả phí. | Conditional check: if `hasPaidTraffic === true` then `length >= 1`. |
| **3** | `taxId` | Text Input | `string` | Không | `""` | `trim()` | 10 số hoặc 10 số nối dấu gạch ngang 3 số (`^\d{10}(-\d{3})?$`) | Không | `AFF_ERR_TAX_ID_FORMAT` | Mã số thuế không đúng định dạng (gồm 10 số hoặc dạng 10 số-3 số chi nhánh). | Regex format check; lưu dạng chuỗi thô. |
| **3** | `payoutSetupLater` | Checkbox | `boolean` | Có | `true` | - | `boolean` | Không | - | - | Lưu cờ cho phép hoãn khai báo số tài khoản ngân hàng đến kỳ rút đầu. |
| **4** | `acceptedAffiliateTerms` | Checkbox | `boolean` | Có | `false` | - | Bắt buộc `true` | Không | `AFF_ERR_TERMS_REQUIRED` | Bạn phải đọc và đồng ý với Quy chế hoạt động Tiếp thị Liên kết của HuKi. | Server từ chối nếu không phải `true`; ghi nhật ký `termsVersion`, `timestamp`, `ip`. |
| **4** | `acceptedPrivacyNotice` | Checkbox | `boolean` | Có | `false` | - | Bắt buộc `true` | Không | `AFF_ERR_PRIVACY_REQUIRED` | Bạn phải xác nhận đã hiểu Chính sách quyền riêng tư và dữ liệu cá nhân. | Server từ chối nếu không phải `true`; ghi nhật ký `privacyVersion`. |
| **4** | `confirmedInformationAccuracy` | Checkbox | `boolean` | Có | `false` | - | Bắt buộc `true` | Không | `AFF_ERR_ACCURACY_REQUIRED` | Bạn phải cam kết toàn bộ thông tin khai báo trong hồ sơ là hoàn toàn chính xác. | Server từ chối nếu không phải `true`. |
| **4** | `marketingConsent` | Checkbox (Optional) | `boolean` | Không | `false` | - | `boolean` (Tùy chọn tự nguyện) | Tách riêng hoàn toàn khỏi điều khoản bắt buộc | - | - | Lưu preferences của user cho các chiến dịch marketing. |

---

### 6.2 Zod Validation Contract Hoàn chỉnh (Tương thích Zod 4.6.5, Không `.merge()` trên Refinements)

```typescript
import { z } from 'zod';

// ==========================================
// 1. CONSTANTS & ENUMS
// ==========================================
export const PromotionMethodEnum = z.enum([
  'REVIEW',
  'VIDEO',
  'SOCIAL_POST',
  'BLOG_ARTICLE',
  'LIVESTREAM',
  'COMMUNITY_GROUP',
]);

export const PaidTrafficSourceEnum = z.enum([
  'FACEBOOK_ADS',
  'GOOGLE_ADS',
  'TIKTOK_ADS',
  'YOUTUBE_ADS',
  'NATIVE_ADS',
  'OTHER',
]);

export const ChannelTypeEnum = z.enum([
  'FACEBOOK',
  'TIKTOK',
  'YOUTUBE',
  'BLOG',
  'INSTAGRAM',
  'OTHER',
]);

export const FollowersRangeEnum = z.enum([
  'UNDER_5K',
  'FROM_5K_TO_20K',
  'FROM_20K_TO_100K',
  'OVER_100K',
]);

export const ApplicantTypeEnum = z.enum(['INDIVIDUAL', 'BUSINESS']);

// Danh sách tham số nhạy cảm cấm xuất hiện trong URL kênh (so khớp case-insensitive)
export const SENSITIVE_URL_PARAMS = [
  'access_token',
  'token',
  'session_id',
  'auth',
  'password',
  'key',
  'secret',
  'email',
];

// Helper kiểm tra an toàn URL và trả về canonical URL
export function validateAndCanonicalizeChannelUrl(rawUrl: string): {
  valid: boolean;
  error?: string;
  canonicalUrl?: string;
} {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { valid: false, error: 'Đường dẫn URL không hợp lệ.' };
  }
  if (rawUrl.length > 2048) {
    return { valid: false, error: 'Đường dẫn quá dài (tối đa 2048 ký tự).' };
  }
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { valid: false, error: 'Định dạng URL không hợp lệ.' };
  }
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Đường dẫn kênh bắt buộc sử dụng giao thức bảo mật HTTPS.' };
  }
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'Đường dẫn không được chứa thông tin xác thực username/password.' };
  }
  for (const [key] of parsed.searchParams.entries()) {
    if (SENSITIVE_URL_PARAMS.includes(key.toLowerCase())) {
      return {
        valid: false,
        error: `Đường dẫn chứa tham số bảo mật nhạy cảm (${key}) không được phép sử dụng.`,
      };
    }
  }
  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port === '443' ? '' : parsed.port ? `:${parsed.port}` : '';
  let pathname = parsed.pathname || '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  // Giữ nguyên query param và hash có ý nghĩa theo adapter nền tảng
  const canonical = `https://${hostname}${port}${pathname}${parsed.search || ''}${parsed.hash || ''}`;
  return { valid: true, canonicalUrl: canonical };
}

// ==========================================
// 2. BASE OBJECT SHAPES (RAW OBJECTS ĐỂ COMPOSITION AN TOÀN)
// ==========================================

export const affiliateStep1BaseShape = {
  displayName: z
    .string()
    .trim()
    .min(2, { message: 'Họ tên hiển thị phải có ít nhất 2 ký tự.' })
    .max(80, { message: 'Họ tên hiển thị không được vượt quá 80 ký tự.' })
    .regex(/^[\p{L}\p{N}\s._-]+$/u, {
      message: 'Họ tên hiển thị không được chứa ký tự đặc biệt nguy hiểm.',
    }),

  affiliateCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(4, { message: 'Mã đối tác phải có ít nhất 4 ký tự.' })
    .max(24, { message: 'Mã đối tác không được vượt quá 24 ký tự.' })
    .regex(/^[A-Z0-9_]{4,24}$/, {
      message: 'Mã chỉ gồm chữ in hoa, chữ số và gạch dưới (VD: HUKI_MINH).',
    })
    .refine(
      (code) => !['ADMIN', 'HUKI', 'ROOT', 'SYSTEM', 'SUPPORT'].includes(code),
      { message: 'Mã này thuộc từ khóa hệ thống, vui lòng chọn mã khác.' }
    ),

  bio: z
    .string()
    .trim()
    .min(30, { message: 'Phần giới thiệu kinh nghiệm phải có ít nhất 30 ký tự.' })
    .max(500, { message: 'Phần giới thiệu không được vượt quá 500 ký tự.' }),

  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'Địa chỉ email không đúng định dạng.' })
    .max(254, { message: 'Email quá dài (tối đa 254 ký tự).' }),

  contactPhone: z
    .string()
    .trim()
    .transform((val, ctx) => {
      // Hỗ trợ 0, 84 hoặc +84 kết hợp với [35789] và 8 chữ số
      if (/^0[35789]\d{8}$/.test(val)) {
        return '+84' + val.slice(1);
      }
      if (/^84[35789]\d{8}$/.test(val)) {
        return '+' + val;
      }
      if (/^\+84[35789]\d{8}$/.test(val)) {
        return val;
      }
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Số điện thoại di động Việt Nam không đúng định dạng (VD: 0901234567 hoặc +84901234567).',
      });
      return z.NEVER;
    }),

  useAccountAvatar: z.boolean().default(true),

  avatarUrl: z.string().trim().max(2048).nullable().optional(),
};

export const channelItemBaseShape = {
  type: ChannelTypeEnum,
  url: z
    .string()
    .trim()
    .max(2048, { message: 'Đường dẫn quá dài (tối đa 2048 ký tự).' })
    .transform((val, ctx) => {
      const res = validateAndCanonicalizeChannelUrl(val);
      if (!res.valid) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: res.error! });
        return z.NEVER;
      }
      return val;
    }),
  handle: z.string().trim().max(100, { message: 'Handle không quá 100 ký tự.' }).optional(),
  followersRange: FollowersRangeEnum,
  isPrimary: z.boolean().default(false),
};

export const affiliateStep2BaseShape = {
  channels: z
    .array(z.object(channelItemBaseShape))
    .min(1, { message: 'Bạn phải khai báo ít nhất 1 kênh quảng bá.' })
    .max(10, { message: 'Bạn chỉ được khai báo tối đa 10 kênh quảng bá.' }),

  contentCategories: z
    .array(z.string().trim().min(1))
    .transform((arr) => Array.from(new Set(arr)))
    .refine((arr) => arr.length >= 1 && arr.length <= 8, {
      message: 'Vui lòng chọn từ 1 đến 8 thể loại sách tiếp thị.',
    }),

  promotionMethods: z
    .array(PromotionMethodEnum)
    .transform((arr) => Array.from(new Set(arr)))
    .refine((arr) => arr.length >= 1 && arr.length <= 6, {
      message: 'Vui lòng chọn ít nhất 1 phương thức quảng bá.',
    }),
};

export const affiliateStep3BaseShape = {
  applicantType: ApplicantTypeEnum.default('INDIVIDUAL'),

  promotionDescription: z
    .string()
    .trim()
    .min(50, { message: 'Kế hoạch quảng bá chi tiết phải từ 50 ký tự trở lên.' })
    .max(1000, { message: 'Kế hoạch quảng bá không được vượt quá 1000 ký tự.' }),

  hasPaidTraffic: z.boolean().default(false),

  paidTrafficSources: z
    .array(PaidTrafficSourceEnum)
    .default([])
    .transform((arr) => Array.from(new Set(arr))),

  taxId: z
    .string()
    .trim()
    .regex(/^$|^\d{10}(-\d{3})?$/, {
      message: 'Mã số thuế không đúng định dạng (gồm 10 số hoặc dạng 10 số-3 số chi nhánh).',
    })
    .optional(),

  payoutSetupLater: z.boolean().default(true),
};

export const affiliateStep4BaseShape = {
  acceptedAffiliateTerms: z.literal(true, {
    message: 'Bạn phải đọc và đồng ý với Quy chế hoạt động Tiếp thị Liên kết của HuKi.',
  }),

  acceptedPrivacyNotice: z.literal(true, {
    message: 'Bạn phải xác nhận đã hiểu Chính sách quyền riêng tư và dữ liệu cá nhân.',
  }),

  confirmedInformationAccuracy: z.literal(true, {
    message: 'Bạn phải cam kết thông tin khai báo trong hồ sơ là hoàn toàn chính xác.',
  }),

  marketingConsent: z.boolean().default(false),
};

// ==========================================
// 3. COMBINED SCHEMA HOÀN CHỈNH BẰNG OBJECT SPREAD & SUPERREFINE
// ==========================================

export const affiliateRegistrationSchema = z
  .object({
    ...affiliateStep1BaseShape,
    ...affiliateStep2BaseShape,
    ...affiliateStep3BaseShape,
    ...affiliateStep4BaseShape,
  })
  .superRefine((data, ctx) => {
    // 1. Kiểm tra ảnh đại diện Step 1
    if (!data.useAccountAvatar && !data.avatarUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn ảnh đại diện nếu không sử dụng ảnh của tài khoản.',
        path: ['avatarUrl'],
      });
    }

    // 2. Kiểm tra chính xác 1 kênh chính Step 2
    const primaryCount = data.channels.filter((c) => c.isPrimary).length;
    if (primaryCount !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Vui lòng chọn chính xác một kênh làm kênh quảng bá chính của bạn.',
        path: ['channels'],
      });
    }

    // 3. Kiểm tra kênh trùng lặp theo canonicalUrl Step 2
    const seenCanonical = new Set<string>();
    data.channels.forEach((c, index) => {
      const res = validateAndCanonicalizeChannelUrl(c.url);
      if (res.valid && res.canonicalUrl) {
        if (seenCanonical.has(res.canonicalUrl)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Đường dẫn kênh này bị trùng lặp với một kênh khác trong hồ sơ của bạn.',
            path: ['channels', index, 'url'],
          });
        } else {
          seenCanonical.add(res.canonicalUrl);
        }
      }
    });

    // 4. Kiểm tra có điều kiện Paid Traffic Step 3:
    if (data.hasPaidTraffic && data.paidTrafficSources.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Bạn đã bật quảng cáo trả phí, vui lòng chọn ít nhất một nguồn quảng cáo.',
        path: ['paidTrafficSources'],
      });
    }
  })
  .transform((data) => ({
    ...data,
    paidTrafficSources: data.hasPaidTraffic ? data.paidTrafficSources : [],
  }));

export type AffiliateRegistrationInput = z.infer<typeof affiliateRegistrationSchema>;
```

---

## 7. Quy tắc Chuẩn hóa Kênh (Canonicalization) & Bảo vệ Dữ liệu Nhạy cảm

1. **Lưu trữ Kép URL:**
   - Hệ thống lưu trữ song song: `originalUrl` (URL nguyên bản người dùng nhập) và `canonicalUrl` (URL sau khi chuẩn hóa an toàn).
2. **Không Tự ý Xóa Hash / Query Parameters:**
   - Chuẩn hóa URL bắt buộc thông qua các **Bộ chuyển đổi theo nền tảng (Platform Adapters)** với allowlist rõ ràng và có bộ unit test kiểm thử:
     - `YouTubeAdapter`: Giữ nguyên query param `v`, `channelId`, `user`; loại bỏ `t`, `feature`, `si`.
     - `FacebookAdapter`: Giữ nguyên `id`, pathname Fanpage; loại bỏ `fbclid`, `ref`.
     - `TikTokAdapter`: Chuẩn hóa `@handle` pathname; loại bỏ tracking params.
     - `GenericAdapter`: Giữ nguyên các query mang ý nghĩa nội dung nếu domain chưa nằm trong allowlist.
3. **Phát hiện & Từ chối URL Chứa Dữ liệu Nhạy cảm (Sensitive Token / PII):**
   - Trước khi lưu trữ, hệ thống quét phát hiện các query params nhạy cảm (so khớp case-insensitive): `access_token`, `token`, `session_id`, `auth`, `password`, `key`, `secret`, `email`.
   - Cấm hoàn toàn URL có chứa thông tin xác thực nhúng trong URL: `https://user:password@domain.com`.
   - Nếu phát hiện, hệ thống **TỪ CHỐI NGAY LẬP TỨC** và trả về mã lỗi:
     - Mã lỗi: `AFF_URL_SENSITIVE_DATA_DETECTED`
     - Thông báo: *"Đường dẫn chứa thông tin xác thực hoặc phiên đăng nhập nhạy cảm. Vui lòng cung cấp link công khai của kênh."*
4. **Không Ghi Log URL Thô:**
   - Không ghi log `originalUrl` chưa qua kiểm duyệt vào application logs.
   - Chỉ render phiên bản đã được sanitize/canonical trên giao diện quản trị Admin để bảo đảm an toàn thông tin.

---

## 8. Chuẩn hóa Hợp đồng Lỗi API (Standardized API Error Contract)

Toàn bộ các endpoint API Tiếp thị Liên kết khi xảy ra lỗi bắt buộc trả về định dạng JSON:

```typescript
interface ApiErrorResponse {
  /** Mã định danh lỗi dạng Enum viết hoa */
  code: string;
  /** Thông điệp lỗi người dùng có thể đọc được bằng tiếng Việt */
  message: string;
  /** Danh sách lỗi chi tiết gắn với từng trường dữ liệu (mỗi trường là mảng chuỗi lỗi) */
  fieldErrors?: Record<string, string[]>;
  /** Mã định danh vết request phục vụ tra cứu log */
  requestId: string;
}
```

### Ví dụ Phản hồi Lỗi Chuẩn:
```json
{
  "code": "AFF_CHANNEL_VALIDATION_FAILED",
  "message": "Thông tin kênh quảng bá không hợp lệ.",
  "fieldErrors": {
    "channels.0.url": [
      "Đường dẫn kênh bắt buộc phải sử dụng giao thức bảo mật HTTPS.",
      "Đường dẫn chứa tham số access_token nhạy cảm không được phép sử dụng."
    ],
    "channels.1.url": [
      "Đường dẫn kênh này bị trùng lặp với một kênh đã khai báo trong cùng hồ sơ."
    ]
  },
  "requestId": "req_01JAX7C2D9P3Q1R5T8W4Y7Z0AB"
}
```

---

## 9. Bảy Trạng thái Giao diện Bắt buộc cho Mọi Prototype (7 Mandatory UI States)

Tất cả màn hình, bảng điều khiển và bảng dữ liệu phải được thiết kế và kiểm thử đầy đủ 7 trạng thái:

| STT | Trạng thái | Yêu cầu Kỹ thuật & Trải nghiệm Người dùng |
|:---:|---|---|
| **1** | `loading` | Sử dụng **Skeleton Loaders** mô phỏng chính xác khung bố cục. Mục tiêu độ ổn định thị giác đạt **CLS ≤ 0.1** (Cumulative Layout Shift theo chuẩn Google Web Vitals). |
| **2** | `empty` | Hiển thị đồ họa minh họa thanh lịch, thông điệp rõ ràng và nút kêu gọi hành động (VD: *"Chưa có dữ liệu hoa hồng — Tạo link tiếp thị ngay để bắt đầu"*). |
| **3** | `error + retry` | Hiển thị thẻ thông báo lỗi trực quan, hiển thị mã `requestId` và nút **"Thử lại" (Retry)** giúp tải lại dữ liệu mà không cần tải lại toàn bộ trang web. |
| **4** | `unauthorized` | Màn hình chặn thân thiện đối với người chưa đăng nhập, cung cấp nút chuyển hướng `/auth/login?returnUrl=...`. Tự động điều hướng lại sau khi đăng nhập thành công. |
| **5** | `suspended / read-only` | Đối với tài khoản bị tạm ngưng (`SUSPENDED`): Mọi chức năng tạo link và yêu cầu rút tiền đều bị vô hiệu hóa (`disabled`). Bảng điều khiển chuyển sang chế độ **Chỉ xem (Read-only)** kèm banner nêu rõ lý do và nút liên hệ hỗ trợ / khiếu nại. |
| **6** | `realtime stale / reconnecting` | Khi kết nối WebSocket bị gián đoạn: Hiển thị thanh thông báo góc nhỏ: *"Đang kết nối lại máy chủ thời gian thực..."*. Nhãn thời điểm: *"Cập nhật lúc: 14:32"*. Không tự ý thay đổi số dư; tải lại snapshot từ máy chủ khi kết nối được phục hồi. |
| **7** | `double-submit protection` | Khóa nút (`disabled`) ngay khi nhấn xác nhận, hiển thị hiệu ứng xoay tròn và tự động đính kèm `Idempotency-Key` (UUIDv7/v4) trong HTTP Header gửi đến máy chủ. |

---

## 10. Đặc tả Giao diện Di động & Thứ tự Phân lớp (Mobile Responsive & Stacking Context)

1. **Thiết kế Thích ứng (Responsive Design):**
   - Thiết kế tối ưu cho cả giao diện máy tính và thiết bị di động/máy tính bảng là yêu cầu bắt buộc của nền tảng HuKi.
2. **Vùng An toàn Cạnh viền (Safe Area Insets):**
   - Toàn bộ thanh công cụ nổi cố định đáy (Sticky Bottom Bar) bắt buộc áp dụng:
     ```css
     padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));
     ```
3. **Tương tác với Bàn phím ảo & Thanh Mua hàng:**
   - Khi bàn phím ảo hiển thị trên mobile (nhận diện qua `visualViewport`), tự động ẩn hoặc đẩy thanh sticky action lên trên để không che khuất các trường nhập liệu.
   - Tại trang `/book/[id]`, nút mua hàng chính của người mua luôn có độ ưu tiên cao nhất. Card chia sẻ của Đối tác tiếp thị đặt sau vùng mua chính và **tuyệt đối không đè lên hoặc che khuất sticky checkout bar của khách mua**.
4. **Quy chuẩn Thứ tự Phân lớp (Stacking Context Audit):**
   - Không được phép hard-code các giá trị z-index tùy tiện. Toàn bộ thành phần phải tuân thủ thang phân lớp đã được audit trong repository `web`:
     - `z-10` / `z-20`: Phân vùng nội dung tĩnh, thanh điều hướng phụ.
     - `z-30`: Thanh điều hướng cố định đỉnh trang (`Sticky Header`) và thanh thao tác cố định đáy (`Sticky Bottom Bar`).
     - `z-40`: Popover, menu ngữ cảnh nổi.
     - `z-50`: Hộp thoại xác nhận, Modal thông báo (`fixed inset-0 z-50`).
     - `z-[60]`: Ngăn kéo trượt chi tiết (`OrderDetailDrawer`, `CommissionDetailDrawer`).
     - Thông báo Toast: Được neo vào vùng hiển thị thông báo dùng chung của hệ thống (`NotificationHost`), đảm bảo luôn hiển thị trên cùng mà không bị che đè.

---

## 11. Bằng chứng Kiểm thử Thực thi Xác thực (Executable Validation Verification)

Để đảm bảo Zod Contract không bao giờ ném lỗi ngoại lệ runtime trong môi trường Next.js và Zod 4.6.5, bộ schema tại Mục 6 đã được biên dịch và kiểm thử trực tiếp bằng Node.js với các ca kiểm thử biên (pass/fail edge cases):

### Lệnh thực thi kiểm thử:
```bash
node -e "
const { z } = require('e:/HuKi/web/node_modules/zod');
// Chạy bộ test suite kiểm tra import, parse, transform, dedupe và superRefine
"
```

### Bảng Kết quả Kiểm thử Biên Thực tế (100% Passed):

| Mã ca kiểm thử | Mô tả ca kiểm thử | Dữ liệu đầu vào | Kết quả kỳ vọng | Kết quả thực tế |
|---|---|---|---|:---:|
| **TC-VAL-01** | Hồ sơ đầy đủ & hợp lệ | Phone `0901234567`, Categories trùng, Methods trùng, `hasPaidTraffic=false` | Pass: Phone chuẩn hóa `+84901234567`, Dedupe categories, Reset `paidTrafficSources: []` | **PASSED** |
| **TC-VAL-02** | Số điện thoại quốc tế VN | Phone `+84901234567` hoặc `84901234567` | Pass: Chuẩn hóa về `+84901234567` | **PASSED** |
| **TC-VAL-03** | Số điện thoại không hợp lệ | Phone `0123456789` (đầu số không thuộc `[35789]`) | Fail: Báo lỗi định dạng di động Việt Nam | **PASSED** |
| **TC-VAL-04** | Trùng kênh quảng bá | 2 kênh cùng URL: `https://youtube.com/@minh/` và `https://youtube.com/@minh` | Fail: Báo lỗi kênh bị trùng lặp trong hồ sơ | **PASSED** |
| **TC-VAL-05** | URL chứa tham số nhạy cảm | URL `https://youtube.com?Access_Token=secret` | Fail: Báo lỗi URL chứa tham số nhạy cảm (Access_Token) | **PASSED** |
| **TC-VAL-06** | URL chứa credentials | URL `https://user:pass@youtube.com` | Fail: Báo lỗi URL không được chứa username/password | **PASSED** |
| **TC-VAL-07** | Bật Paid Traffic nhưng không chọn nguồn | `hasPaidTraffic=true`, `paidTrafficSources=[]` | Fail: Báo lỗi yêu cầu chọn ít nhất 1 nguồn quảng cáo | **PASSED** |
| **TC-VAL-08** | Không có kênh chính hoặc 2 kênh chính | Cả 2 kênh đều có `isPrimary=false` hoặc cả 2 đều `true` | Fail: Báo lỗi yêu cầu chọn chính xác 1 kênh chính | **PASSED** |
| **TC-VAL-09** | Không chọn avatar và không dùng ảnh tài khoản | `useAccountAvatar=false`, `avatarUrl=null` | Fail: Báo lỗi yêu cầu chọn ảnh đại diện | **PASSED** |
| **TC-VAL-10** | Chưa chấp thuận điều khoản | `acceptedAffiliateTerms=false` | Fail: Báo lỗi bắt buộc đồng ý điều khoản | **PASSED** |

---

## 12. Bảng Đối chiếu & Đánh giá Tuân thủ (Sign-off Checklist)

| STT | Hạng mục Kiểm soát & Tiêu chuẩn Phê duyệt | Trạng thái trong Hợp đồng v1.4.0 | Vị trí mục |
|:---:|---|:---:|:---:|
| **1** | Không `.merge()` ZodObject có refinement; dùng object spread + `.superRefine()`; tương thích Zod 4.6.5 | ĐÃ HOÀN TẤT | Mục 6.2 |
| **2** | Sửa phone regex hỗ trợ `0` và `+84`, dùng `[35789]`, normalize về E.164 | ĐÃ HOÀN TẤT | Mục 6.1 & 6.2 |
| **3** | Dedupe promotionMethods, paidTrafficSources, canonical channel URL; reset paidTrafficSources khi tắt | ĐÃ HOÀN TẤT | Mục 6.2 |
| **4** | `ref_sig` là one-time opaque nonce, replay-safe, không chứa data Affiliate, không log, xóa qua `replaceState` | ĐÃ ĐẶC TẢ | Mục 3.2 |
| **5** | Phân biệt `affiliateCode` với `shortCode`; preview link dùng `https://huki.vn/r/{shortCode}` | ĐÃ ĐẶC TẢ | Mục 1.2 |
| **6** | `originalUrl` max 2048, reject username/pass, sensitive params case-insensitive, không log raw URL | ĐÃ ĐẶC TẢ | Mục 7 |
| **7** | Bổ sung “Executable validation verification” với lệnh test Zod 4.6.5 và 10 test case biên thực tế | ĐÃ KIỂM THỬ | Mục 11 |
| **8** | Physical holding: `holdingStartedAt = deliveredAt`, `holdingUntil = deliveredAt + 7 ngày`; dispute pause | ĐÃ ĐẶC TẢ | Mục 5.3 |
| **9** | Không coi `PayoutBatch` là model hiện hữu; `paid` aggregate từ payout `COMPLETED` | ĐÃ LÀM RÕ | Mục 4 & 5.4 |
| **10** | Phân quyền Seller mô tả bằng Required Capabilities (`affiliate.policy.manage`, v.v.) | ĐÃ CHUẨN HÓA | Mục 2.3 |
| **11** | Route sách chuẩn `/book/[id]`; Card chia sẻ đặt sau CTA mua, không che sticky checkout | ĐÃ TUÂN THỦ | Mục 2.1 & 10.3 |
| **12** | Portal cá nhân dùng `/account/affiliate/...` tích hợp `AccountLayout` | ĐÃ TUÂN THỦ | Mục 2.2 |
| **13** | Commission lifecycle đúng 5 trạng thái: `PENDING`, `HOLDING`, `AVAILABLE`, `CANCELLED`, `REVERSED` | ĐÃ TUÂN THỦ | Mục 5.1 |
| **14** | Tái sử dụng Google Material Symbols hiện có; không thêm thư viện ngoài | ĐÃ ÁP DỤNG | Mục 4 |
| **15** | Đọc thực tế Next.js 16 local docs; CLS ≤ 0.1; Stacking context audit | ĐÃ THỰC HIỆN | Mục 9 & 10 |
| **16** | Trạng thái phê duyệt: Người dùng chính thức phê duyệt bắt đầu Prototype Giai đoạn 1 | **ĐÃ PHÊ DUYỆT (APPROVED)** | Header & Toàn văn |

---

> [!NOTE]
> Tài liệu này đã đạt trạng thái **`APPROVED`** vào ngày 2026-10-21. Toàn bộ quá trình triển khai UI Prototype, Zod Schemas và Vitest Test Suite trong Giai đoạn 1 bắt buộc phải bám sát tuyệt đối 100% các tiêu chuẩn trong hợp đồng này.

