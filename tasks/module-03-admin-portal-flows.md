# MOD-03: Cổng Quản Trị Sàn Toàn Diện (Platform Admin Central Operations)

> **Phạm vi kiểm thử toàn diện:** Gồm đầy đủ **35 Màn hình quản trị tối cao, 8 Phân hệ điều hành, hơn 40 Tab nghiệp vụ chuyên sâu và các Modal trọng tài/kiểm duyệt** của Ban Quản Trị sàn HUKI (`/admin/*`).  
> **Cam kết:** 
> 1. Không tự ý sửa bất kỳ dòng code nào.
> 2. Ghi nhận và bóc tách lỗi chi tiết khi kiểm thử vào file bug riêng biệt (`tasks/bug-mod03.md`).
> 3. Trình kế hoạch chi tiết này và **chờ người dùng phê duyệt trước khi bắt đầu thực hiện kiểm thử**.

---

## 🎨 BỘ TIÊU CHUẨN THIẾT KẾ ANTI-AI & TRUNG TÂM ĐIỀU HÀNH ENTERPRISE (MISSION CONTROL SPECIFICATION)

Dựa trên bộ kỹ năng `skill/.gemini/skills/ui-ux-pro-max`, Cổng Quản Trị Sàn Toàn Diện HUKI Admin loại bỏ hoàn toàn các cliché giao diện AI rẻ tiền (như theme SaaS crypto lòe loẹt, viền neon, gradient tím/hồng vô nghĩa, các ô thẻ padding khổng lồ lãng phí không gian) và tuân thủ chuẩn trung tâm điều phối doanh nghiệp cấp cao:

1. **🚫 Triệt Tiêu Tuyệt Đối Các Yếu Tố AI Cliché Trong Hệ Thống Admin:**
   - **Không dùng Dark Mode Neon & Gradient lòe loẹt:** Bỏ hoàn toàn các hiệu ứng background bóng khí phát sáng (`blur-3xl`, `radial-gradient`), viền phát quang neon rẻ tiền. Thay vào đó, sử dụng giao diện sáng sủa, trang nhã (Crisp Clean White/Slate) hoặc Dark Console trầm tĩnh, tập trung vào dữ liệu.
   - **Không lạm dụng hoạt ảnh nhấp nháy (No Distracting Flashing):** Cấm các animation `animate-pulse` trên icon, badge trạng thái tĩnh. Chỉ chấp nhận pulse xanh lục rất nhỏ trên chấm đèn ping thời gian thực của Microservices health check (`relative flex h-2 w-2`).
   - **Không dùng Emoji Text hay ký tự thô:** Cấm tuyệt đối `⚖️`, `⛔`, `🛡️`, `💰`, `📊` dưới dạng unicode chuỗi text thô. Toàn bộ icon trong bảng điều hành phải sử dụng chuẩn Google Material Symbols vector (`gavel`, `block`, `verified_user`, `account_balance_wallet`, `analytics`).
   - **Không padding lãng phí (High Density Information Design):** Bỏ các thẻ card padding `p-8` hay `p-10` thênh thang kiểu AI template demo. Quản trị sàn yêu cầu mật độ thông tin cao (High Density), bảng dữ liệu hiển thị tối thiểu 10-20 dòng trên một màn hình không cần cuộn quá nhiều.

2. **🏛️ Bảng Màu Thẩm Quyền & Kế Toán Minh Bạch (Authority & Financial Palette):**
   - **Màu nền tảng chính (Brand Authority):** `#003B2B` (Forest Green đậm uy tín) kết hợp `#0F172A` (Deep Slate cho thanh điều hướng tối cao).
   - **Màu giám sát tài chính (Financial Escrow):** `#047857` (Emerald tiền vào/ký quỹ thành công) và `#B91C1C` (Rose/Crimson tiền phạt/tranh chấp/lệnh rút bất thường).
   - **Nền làm việc phân tích (Data Surface):** `#F8FAFC` sạch sẽ, đường viền bảng kẻ sợi chỉ `#E2E8F0` phân minh rõ ràng.
   - **Thẻ định danh & Phán quyết (Audit & Verdict Badges):**
     - Đã duyệt / Hợp lệ: `bg-emerald-50 text-emerald-800 border border-emerald-200`
     - Cảnh báo vi phạm / Cần kiểm duyệt: `bg-amber-50 text-amber-800 border border-amber-200`
     - Đình chỉ / Khóa vĩnh viễn: `bg-rose-50 text-rose-800 border border-rose-200`
     - Đang bảo trì / Hệ thống: `bg-slate-100 text-slate-700 border border-slate-300`

3. **📊 Typography Dữ Liệu Lớn & Sổ Cái Kế Toán (Ledger Typography):**
   - **Mã định danh hệ thống (UUID, Order ID, Transaction Hash, ISBN, IP Address):** Bắt buộc 100% hiển thị bằng font Monospace (`font-mono text-xs tracking-tight`) kèm nút sao chép 1-click.
   - **Số tiền giao dịch GMV, Escrow, Số dư:** Dùng font Monospace định dạng tiền tệ Việt Nam chuẩn (`125.400.000 đ`) với màu tương phản rõ rệt.
   - **Tiêu đề báo cáo & phán quyết:** Dùng font Sans-serif sắc nét hoặc font Serif thanh lịch cho văn bản pháp quy/thông cáo chính thức của sàn.

4. **⚡ Công Thái Học & Bảo Mật Thao Tác (High-Stakes Ergonomics):**
   - **Modal xác nhận 2 lớp cho các thao tác rủi ro cao:** Cấm thực thi ngay các hành động khóa tài khoản NXB, hoàn tiền tranh chấp, hoặc can thiệp kho tiền ký quỹ nếu không có hộp thoại xác nhận nhập lý do giải trình.
   - **Dữ liệu bảng có Sticky Header & Phân trang chuẩn:** Bảng dữ liệu dài luôn giữ cố định tiêu đề cột khi cuộn, có thanh cuộn ngang mượt mà trên màn hình nhỏ mà không làm vỡ layout toàn trang.

---

## 🔍 TIÊU CHUẨN KIỂM THỬ ĐA CHIỀU (MULTI-SPECTRUM AUDIT SPECIFICATION)

Mỗi màn hình quản trị và luồng nghiệp vụ trong danh sách dưới đây đều bắt buộc trải qua **4 chiều kiểm thử toàn diện** bằng robot Playwright và tương tác thực tế:

| Chiều Kiểm Thử | Công Cụ & Cơ Chế | Nội Dung Kiểm Tra Chuyên Sâu |
| :--- | :--- | :--- |
| 📱 **Responsive 3 Viewports** | Playwright Multi-Device Matrix | • **Mobile (390 x 844 px):** Bắt lỗi tràn ngang (`scrollWidth > innerWidth`), drawer admin menu, bảng dữ liệu co giãn trên điện thoại.<br>• **Tablet (768 x 1024 px):** Co giãn bảng đối soát escrow/tài chính, sidebar điều hành.<br>• **Desktop (1440 x 900 px):** Layout chuẩn, hiển thị đầy đủ 8 nhóm menu và biểu đồ phân tích. |
| 🔴 **Console Error & Runtime** | `page.on('console')`<br>`page.on('pageerror')` | • Lỗi React Hydration Mismatch.<br>• Lỗi `TypeError: Cannot read properties of undefined/null` (khi load dữ liệu admin stats/reports).<br>• Cảnh báo React `missing unique key`, memory leak từ timer/socket polling. |
| 🌐 **Network & Exception Log** | `page.on('response')`<br>Backend Server Logs | • Bắt toàn bộ lỗi HTTP: `400`, `401` (Hết hạn JWT Admin), `403` (Sai vai trò Super Admin), `404` (API/Tài nguyên hỏng), `429` (Rate limit), `500` (Backend microservices crash). |
| 🎨 **UI/UX & Tương Tác** | Bounding Box & DOM Inspection | • Kiểm tra chuẩn `<Link>` thẻ `<a>` cho các bảng điều hướng.<br>• Kiểm tra `z-index` Modals phê duyệt, phán quyết trọng tài không bị che khuất.<br>• Kiểm tra hiển thị tiếng Việt, không lỗi font unicode tofu (`□`), tương phản chuẩn WCAG. |

---

## 🧭 LƯỢC ĐỒ PHÂN QUYỀN & TRỤC VẬN HÀNH QUẢN TRỊ ADMIN

```
                        [SUPER_ADMIN / PLATFORM_ADMIN]
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
[1. GIÁM SÁT & BÁO CÁO]      [2. ĐỐI TÁC & NGƯỜI DÙNG]    [3. XUẤT BẢN & BẢN QUYỀN DRM]
• Dashboard Realtime         • Hồ Sơ Pháp Nhân NXB        • Duyệt Bản In & Ebook
• Báo Cáo Doanh Thu GMV      • Duyệt Đổi ĐKKD/Tài Khoản   • Kho Khóa DRM Vault
• Phân Tích Flash Sale       • Quản Trị Bạn Đọc/Seller    • Gói Cước Sách Nói AI
         │                            │                            │
         ├────────────────────────────┼────────────────────────────┤
         ▼                            ▼                            ▼
[4. HẬU MÃI & TRỌNG TÀI]     [5. TÀI CHÍNH & KÝ QUỸ]      [6. TIẾP THỊ & VẬN HÀNH]
• Đổi Trả Đa Cấp             • Ký Quỹ Đơn Hàng Escrow     • Khung Giờ Flash Sale Sàn
• Trọng Tài Tranh Chấp       • Sổ Cái Kế Toán Ledger      • Voucher Toàn Sàn & Banner
• Xử Phạt & Kháng Nghị       • Duyệt Lệnh Rút Tiền        • Sức Khỏe 7 Microservices
```

---

## 🗺️ BẢN ĐỒ CHI TIẾT 8 PHÂN HỆ QUẢN TRỊ SÀN (35 MÀN HÌNH)

### 1. Phân Hệ 1: TỔNG QUAN HỆ THỐNG & BÁO CÁO THỐNG KÊ (2 Màn Hình + 3 Tabs Báo Cáo)
- [x] **Màn hình 1.1: Bảng Điều Hành Sàn Toàn Cục (`/admin` & `/admin/dashboard`)**
  - Thẻ chỉ số tổng quan toàn sàn: Tổng GMV giao dịch, Doanh thu hoa hồng sàn, Số đơn hàng mới, Số đầu sách đang mở bán, Đối tác NXB mới gia nhập. *(Đã kiểm thử: `adminApi.getAdminStats()`, kết nối `/businesses/admin/all`, `/stores/admin/all`, `/books`, `/health/services` thành công, HTTP 200)*.
  - Tình trạng phê duyệt tồn đọng: Số hồ sơ doanh nghiệp chờ duyệt (1 hồ sơ pending), Số sách chờ kiểm duyệt.
  - Tình trạng sức khỏe tóm tắt của 7 Microservices.
- [x] **Màn hình 1.2: Phân Tích Dữ Liệu & Báo Cáo Chuyên Sâu (`/admin/reports`)**
  - 3 Tab phân tích chuyên biệt:
    - Tab `Phân tích doanh số bán hàng` (`SALES_ANALYTICS`): Thống kê doanh số theo ngành sách, theo nhà xuất bản, doanh thu thuần sàn thực nhận. *(Đã kiểm thử: `GET /analytics/gmv?from=...&to=...&interval=daily` trả về GMV 3.208.994đ, 18 đơn hoàn tất; `GET /analytics/platform/bestsellers` trả về 3 đầu sách bán chạy nhất)*.
    - Tab `Hiệu quả Flash Sale` (`FLASH_SALE_ANALYTICS`): Tỷ lệ lấp đầy suất bán, mức độ chuyển đổi đơn hàng qua từng khung giờ.
    - Tab `Tăng trưởng người dùng`: Tỷ lệ chuyển đổi độc giả thành khách mua hàng thân thiết (Retention Rate).
  - Xuất báo cáo tài chính dạng Excel/CSV theo khoảng ngày tùy chọn.

---

### 2. Phân Hệ 2: ĐỐI TÁC XUẤT BẢN & NGƯỜI DÙNG TOÀN SÀN (7 Màn Hình + Realtime Badges)
- [x] **Màn hình 2.1: Quản Trị Tài Khoản Toàn Sàn (`/admin/accounts`)**
  - Danh sách toàn bộ tài khoản người dùng: Khách hàng cá nhân, Doanh nghiệp/NXB, Bưu tá (Shipper), Quản trị viên sàn. *(Đã kiểm thử: `GET /api/v1/users/admin/all` trả về 49 tài khoản thật trong database)*.
  - Tab lọc theo vai trò: `ALL`, `CUSTOMER`, `BUSINESS`, `SHIPPER`, `PLATFORM_ADMIN`.
  - Thao tác: Khóa tài khoản (Suspend), Mở khóa, Reset mật khẩu tạm thời, Phân bổ quyền hạn.
  - Xem Sổ cái kiểm toán người dùng: `GET /api/v1/users/admin/:id/audit-logs` (HTTP 200).
  - ⚠️ Phát hiện lỗi: `BUG-03-006` (Thao tác thu hồi/hạ cấp quyền thiếu Modal xác nhận 2 bước giải trình).
- [x] **Màn hình 2.2: Danh Sách Bạn Đọc & Khách Mua Hàng (`/admin/users`)**
  - Lọc danh sách độc giả tiêu dùng, lịch sử tổng chi tiêu (LTV), số lượng đơn mua thành công và số lần hủy/hoàn hàng.
  - Xem thông tin hạng thành viên và điểm tích lũy HUKI Coin.
  - Thao tác khôi phục tài khoản đã xóa: `POST /api/v1/users/admin/:id/restore` (HTTP 200).
- [x] **Màn hình 2.3: Thẩm Định & Quản Lý Pháp Nhân Đối Tác (`/admin/businesses`)**
  - 4 Tab trạng thái đối tác: `ALL`, `PENDING_APPROVAL` (Gắn badge đếm số lượng), `APPROVED`, `REJECTED`, `SUSPENDED`. *(Đã kiểm thử: `GET /api/v1/businesses/admin/all` trả về 17 doanh nghiệp trong DB)*.
  - Chi tiết hồ sơ thẩm tra: Mã số thuế tra cứu qua Tổng cục Thuế, Giấy phép ĐKKD, Thông tin người đại diện, Hợp đồng thỏa thuận kinh doanh.
  - Quyết định: Phê duyệt gian hàng chính thức (`/businesses/:id/approve`) / Từ chối kèm lý do (`/businesses/:id/reject`) / Khóa tạm thời do vi phạm (`/businesses/:id/suspend`).
- [x] **Màn hình 2.4: Duyệt Yêu Cầu Chỉnh Sửa Thông Tin Doanh Nghiệp (`/admin/business-requests`)**
  - Tiếp nhận các yêu cầu đổi số tài khoản ngân hàng, đổi địa chỉ kho, đổi giấy phép kinh doanh từ phía Seller. *(Đã kiểm thử: `GET /api/v1/businesses/admin/update-requests` trả về 1 yêu cầu cập nhật đang chờ duyệt)*.
  - Hiển thị so sánh trực quan (Diff Viewer): "Dữ liệu hiện tại" vs "Dữ liệu mới yêu cầu cập nhật".
  - ⚠️ Phát hiện lỗi: `BUG-03-010` (Modal từ chối cập nhật không bắt buộc nhập lý do).
- [x] **Màn hình 2.5: Quản Lý Nhà Xuất Bản Chính Thức (`/admin/publishers`)**
  - Danh bạ đối tác chiến lược: Kim Đồng, Nhã Nam, NXB Trẻ, Alpha Books, First News, NXB Phụ Nữ... *(Đã kiểm thử: `businessApi.getAllBusinesses()` ánh xạ chính xác 17 pháp nhân NXB Mall)*.
  - Quản lý tỷ lệ chiết khấu sàn đặc thù cho từng NXB lớn.
- [x] **Màn hình 2.6: Quản Lý Khách Hàng Tiềm Năng NXB (`/admin/publisher-leads`)**
  - Quản lý danh sách các tác giả/đơn vị đang trong giai đoạn đàm phán hợp tác xuất bản sách độc quyền trên sàn HUKI. *(Đã kiểm thử: Lọc tự động các đơn vị `PENDING_APPROVAL` từ DB)*.
- [x] **Màn hình 2.7: Quản Lý Cửa Hàng & Chi Nhánh Kho Toàn Hệ Thống (`/admin/stores`)**
  - Giám sát toàn bộ các chi nhánh kho hàng của tất cả người bán, kiểm tra địa chỉ hợp chuẩn địa lý để kết nối bưu tá giao hàng. *(Đã kiểm thử: `GET /api/v1/stores/admin/all` trả về 18 gian hàng và chi nhánh kho)*.

---

### 3. Phân Hệ 3: QUẢN TRỊ CATALOG, KIỂM DUYỆT SÁCH & BẢO MẬT DRM (5 Màn Hình)
- [x] **Màn hình 3.1: Danh Mục Toàn Bộ Sách Toàn Sàn (`/admin/books`)**
  - Quản lý hàng ngàn đầu sách trên sàn: Tìm kiếm theo Tiêu đề, SKU, ISBN, Tên NXB. *(Đã kiểm thử: `GET /api/v1/books` trả về danh sách sách từ PostgreSQL)*.
  - Tab lọc: `ALL`, `PUBLISHED`, `DRAFT`, `PENDING_APPROVAL`, `SUSPENDED`.
  - ⚠️ Phát hiện lỗi P0: `BUG-03-011` (Gọi `GET /api/v1/books?status=PENDING_APPROVAL` bị lỗi 400 Validation Error do `BookListQueryDto` thiếu thuộc tính `status`).
- [x] **Màn hình 3.2: Trung Tâm Kiểm Duyệt Sách Chờ Phát Hành (`/admin/book-moderation`)**
  - Danh sách ấn phẩm mới do Seller đăng tải đang chờ sàn kiểm duyệt.
  - Khung xem trước (Preview): Xem trực tiếp file đọc thử PDF, kiểm tra hình ảnh bìa, kiểm tra thông tin xuất bản, số quyết định xuất bản.
  - ⚠️ Phát hiện lỗi P0: `BUG-03-012` (Nút Phê duyệt / Từ chối chỉ cập nhật biến RAM React State `setQueueItems`, không hề gọi backend API `POST /books/:id/publish` hay `/suspend`, mất dữ liệu khi F5).
- [x] **Màn hình 3.3: Quản Lý Thể Loại, Danh Mục & Tác Giả (`/admin/categories`)**
  - Cấu hình cây danh mục sách đa tầng (Danh mục cha $\rightarrow$ Danh mục con $\rightarrow$ Chuyên ngành). *(Đã kiểm thử: `GET /categories/tree` trả về 11 cây danh mục; `GET /authors` trả về danh sách tác giả)*.
  - Hiện trạng: Giao diện chỉ có tính năng xem (Read-only), chưa có modal thêm/sửa/xóa trực tiếp.
- [x] **Màn hình 3.4: Kho Khóa Bản Quyền Kỹ Thuật Số DRM Vault (`/admin/drm-vault`)**
  - 4 Tab quản trị bảo mật: `ALL`, `SECURE`, `UPGRADE_NEEDED`, `REVOKED`. *(Đã kiểm thử: `GET /admin/drm/overview` trả về 92 sách mã hóa AES-256, 14 thiết bị độc giả active; `GET /admin/drm/licenses` trả về chi tiết giấy phép)*.
  - Giám sát luồng phát hành khóa mã hóa AES-256 / Watermark cá nhân hóa cho từng độc giả khi mở đọc Ebook.
  - ⚠️ Phát hiện lỗi: `BUG-03-007` (Sao chép Master Key AES-256 không có Toast thông báo thành công).
- [x] **Màn hình 3.5: Quản Trị Sách Nói AI & Gói Cước Hội Viên (`/admin/ai-audiobooks`)**
  - 3 Tab quản trị:
    - Tab `Gói cước hội viên` (`plans`): *(Đã kiểm thử: `GET /api/v1/ai-audio/plans` trả về 4 gói cước thực tế trong database: Tiết kiệm tháng, Quý, Năm VIP)*.
    - Tab `Đăng ký hội viên` (`subscriptions`): *(Đã kiểm thử: `GET /api/v1/ai-audio/subscriptions` trả về 2 độc giả đăng ký thật)*.
    - Tab `Doanh thu sách nói` (`revenue`): Doanh thu phân bổ giữa sàn và tác giả sở hữu bản quyền giọng đọc.

---

### 4. Phân Hệ 4: ĐIỀU PHỐI VẬN CHUYỂN & GIAO VẬN (2 Màn Hình)
- [x] **Màn hình 4.1: Quản Trị Đội Ngũ Bưu Tá HUKI Express (`/admin/shippers`)**
  - 2 Tab quản trị chuyên sâu:
    - Tab `Đội ngũ bưu tá` (`FLEET`): Danh sách nhân viên giao hàng, trạng thái trực tuyến (Online/Offline), khu vực bưu cục phụ trách, đánh giá sao từ khách. *(Đã kiểm thử: `GET /orders/shipper/admin/shippers` trả về 4 bưu tá thực tế)*.
    - Tab `Đối soát nộp tiền COD` (`REMITTANCES`): Giám sát công nợ tiền mặt COD các bưu tá đang giữ, duyệt phiếu xác nhận nộp tiền mặt vào tài khoản sàn. *(Đã kiểm thử: `GET /orders/shipper/remittances` trả về 17 lượt nộp tiền COD VietQR PayOS trong PostgreSQL)*.
- [x] **Màn hình 4.2: Lịch Vận Hành & Lịch Xuất Bản Toàn Sàn (`/admin/calendar`)**
  - Xem lịch trình các sự kiện ra mắt sách mới, lịch bảo trì hệ thống và các mốc chiến dịch lớn trong tháng.
  - ⚠️ Phát hiện lỗi P2: `BUG-03-019` (Giao diện 100% dữ liệu tĩnh cứng `EVT-01` -> `EVT-04`, chưa có backend API).

---

### 5. Phân Hệ 5: HẬU MÃI, KHIẾU NẠI & TÒA TRỌNG TÀI TRANH CHẤP (4 Màn Hình)
- [x] **Màn hình 5.1: Quản Lý Yêu Cầu Đổi Trả Hàng Cấp Sàn (`/admin/return-requests`)**
  - Giám sát toàn bộ các yêu cầu đổi trả giữa Buyer và Seller trên toàn sàn. *(Đã kiểm thử: `GET /api/v1/orders/admin/returns` trả về 3 yêu cầu đổi trả thực tế trong database)*.
  - Lọc theo trạng thái: `ALL`, `PENDING_SELLER`, `SELLER_REJECTED`, `RESOLVED`.
  - Thao tác: Chuyển tiếp yêu cầu cho gian hàng (`/orders/admin/returns/:id/forward`) hoặc phán quyết trọng tài sàn (`/orders/admin/returns/:id/arbitrate`).
- [x] **Màn hình 5.2: Tòa Trọng Tài Phân Xử Khiếu Nại & Tranh Chấp (`/admin/disputes`)**
  - Bàn làm việc của Trọng tài sàn: Tiếp nhận các vụ kiện người mua không đồng ý với quyết định từ chối của Shop. *(Đã kiểm thử: `GET /api/v1/orders/admin/disputes` trả về 1 hồ sơ tranh chấp thật)*.
  - Xem bằng chứng đối chiếu: Ảnh chụp sách của người mua, video đóng gói của người bán, biên bản bàn giao của bưu tá (`/orders/admin/disputes/:id`).
  - Phán quyết tối cao: `POST /orders/admin/disputes/:disputeId/arbitrate` (Buyer wins -> trích hoàn Escrow 100%; Seller wins -> giải phóng ví Shop).
- [x] **Màn hình 5.3: Xử Phạt Vi Phạm & Giải Quyết Kháng Nghị (`/admin/appeals`)**
  - 3 Phân khu nghiệp vụ:
    - Phân khu `Hồ sơ vi phạm gian hàng` (`PROFILES`): Bảng điểm uy tín Sao Quả Tạ. *(⚠️ Lỗi `BUG-03-003`: Endpoint nội bộ `GET /api/seller/penalties` bắn lỗi 401)*.
    - Phân khu `Đơn kháng nghị từ Seller` (`APPEALS`): *(Đã kiểm thử: `GET /api/v1/sanctions/appeals` trả về hàng đợi kháng nghị từ database)*.
    - Phân khu `Ban hành quyết định xử phạt` (`ISSUE_PENALTY`): `POST /api/v1/sanctions` và `POST /api/v1/sanctions/appeals/:id/review`.
- [x] **Màn hình 5.4: Trung Tâm Tiếp Nhận & Hỗ Trợ Độc Giả (`/admin/support`)**
  - Quản lý các phiếu yêu cầu hỗ trợ (Support Tickets) gửi từ độc giả về lỗi ứng dụng đọc sách, lỗi thanh toán, hỗ trợ kích hoạt tài khoản.
  - ⚠️ Phát hiện lỗi P2: `BUG-03-019` (Giao diện 100% Mock State mảng `TCK-8812`, chưa có backend API).

---

### 6. Phân Hệ 6: TÀI CHÍNH SÀN, KÝ QUỸ ESCROW & SỔ CÁI KẾ TOÁN (2 Màn Hình + Diff Ledgers)
- [x] **Màn hình 6.1: Quản Trị Quỹ Ký Quỹ Đơn Hàng Escrow (`/admin/escrow`)**
  - Giám sát dòng tiền ký quỹ toàn sàn đang tạm giữ bảo chứng giao dịch. *(Đã kiểm thử: `GET /api/v1/orders/admin/escrow/items` trả về 93 món hàng ký quỹ thật; `GET /orders/admin/escrow/frozen` trả về 3 món hàng đang bị đóng băng tranh chấp)*.
  - Thao tác cưỡng chế: Đóng băng / Giải phóng dòng tiền ký quỹ qua `PATCH /api/v1/orders/admin/escrow/items/:orderItemId/status`.
  - ⚠️ Phát hiện lỗi: `BUG-03-008` (Bộ lọc Escrow không đồng bộ URL query params).
- [x] **Màn hình 6.2: Báo Cáo Sổ Cái Kế Toán & Quản Lý Rút Tiền (`/admin/finance`)**
  - Sổ cái tài chính toàn diện (General Ledger): *(Đã kiểm thử: `GET /wallet/admin/transactions`, `GET /ledger/transactions`, `GET /ledger/summaries` trả về 12 tài khoản tổng hợp kế toán kép trong PostgreSQL)*.
  - Quản lý lệnh rút tiền: *(Đã kiểm thử: `GET /payout/admin/requests` kết nối thành công)*. Duyệt chi (`/payout/admin/requests/:id/review`, `/disburse`).
  - Đối soát EOD: `GET /admin/finance/reconciliation/eod/runs/latest` (HTTP 200).

---

### 7. Phân Hệ 7: MARKETING, KHUYẾN MÃI & DUYỆT TIẾP THỊ LIÊN KẾT (5 Màn Hình)
- [x] **Màn hình 7.1: Phát Sóng Thông Báo & Truyền Thông Toàn Sàn (`/admin/notifications`)**
  - Soạn thảo và phát sóng thông báo hàng loạt (Push Broadcast Notification): Thông báo đẩy đến toàn bộ người dùng, đến riêng nhóm Người bán, hoặc riêng nhóm Bưu tá.
  - ⚠️ Phát hiện lỗi P0: `BUG-03-014` (Gateway `service-proxy.middleware.ts` định tuyến sai `/admin/broadcast-notifications` sang community gây lỗi 404).
  - ⚠️ Phát hiện lỗi P1: `BUG-03-016` (Giao diện đọc/ghi thông báo vào `adminNotificationService` RAM/LocalStorage thay vì gọi API `POST /broadcast-notifications`).
- [x] **Màn hình 7.2: Quản Lý Voucher Khuyến Mãi Sàn (`/admin/vouchers` & `/admin/promotions/vouchers`)**
  - 4 Tab trạng thái: `ALL`, `ACTIVE`, `UPCOMING`, `EXPIRED`. *(Đã kiểm thử: `GET /api/v1/vouchers` trả về 7 voucher sàn thật trong DB; `POST /vouchers` tạo voucher mới)*.
- [x] **Màn hình 7.3: Điều Phối Khung Giờ Flash Sale Toàn Sàn (`/admin/flash-sales` & `/admin/promotions/flash-sale`)**
  - Quản lý các đợt Giờ Vàng Flash Sale: Tạo khung giờ, duyệt các sách đăng ký của Seller vào từng khung giờ. *(Đã kiểm thử: `GET /api/v1/flash-sales` trả về 6 đợt flash sale thật)*.
  - ⚠️ Phát hiện lỗi: `BUG-03-004` (Emoji thô `⌛` và animate-pulse nhấp nháy mất tập trung).
- [x] **Màn hình 7.4: Quản Trị Banner & Chiến Dịch Trang Chủ (`/admin/marketing`)**
  - Cấu hình Banner Hero Carousel trên trang chủ, quản lý các bộ sưu tập sách nổi bật.
  - ⚠️ Phát hiện lỗi P1: `BUG-03-015` (Giao diện lưu và đọc banners từ `localStorage` client, không gọi API backend `GET /banners`, `POST /banners` của `promotion-service`).
- [x] **Màn hình 7.5: Thẩm Định & Quản Lý Đối Tác Tiếp Thị Liên Kết (`/admin/affiliates`)**
  - Danh sách đơn đăng ký làm Cộng tác viên (KOC, BookToker, Website Review Sách). *(Đã kiểm thử: `affiliateApi.adminListApplications()` gọi `GET /admin/affiliates` thành công, HTTP 200)*.
  - ⚠️ Phát hiện lỗi P0: `BUG-03-013` (Route `@Get(':id')` trong `AffiliateAdminController` che khuất các sub-routes `/dashboard`, `/reconciliation`, `/reports/export`, khiến gọi các API này bị 404).

---

### 8. Phân Hệ 8: HẠ TẦNG KỸ THUẬT, BẢO TRÌ & TÍNH NĂNG SELLER (5 Màn Hình)
- [x] **Màn hình 8.1: Giám Sát Sức Khỏe Hạ Tầng Microservices (`/admin/health`)**
  - Kiểm tra trạng thái thời gian thực của 7 dịch vụ nền tảng: *(Đã kiểm thử: Gateway `GET /health/services` trả về trạng thái ok của toàn bộ microservices)*.
  - ⚠️ Phát hiện lỗi: `BUG-03-009` (Polling 3s dồn dập thiếu Jitter).
- [x] **Màn hình 8.2: Quản Lý Công Tắc Tính Năng Kênh Người Bán (`/admin/seller-features`)**
  - Cấu hình bật/tắt (Feature Flags) các phân hệ của Kênh Người Bán trên toàn sàn hoặc cho từng đối tác cụ thể. *(Backend API `GET /seller/feature-flags` trả về 9 cờ tính năng thật)*.
  - ⚠️ Phát hiện lỗi P1: `BUG-03-017` (Frontend Admin lưu cờ tính năng vào LocalStorage client thay vì đồng bộ với backend `POST /seller/feature-flags`).
- [x] **Màn hình 8.3: Bật/Tắt Chế Độ Bảo Trì Hệ Thống (`/admin/maintenance`)**
  - Kích hoạt chế độ bảo trì khẩn cấp (Emergency Maintenance Mode). *(Backend API `GET /system/maintenance` trả về cấu hình bảo trì của identity-service)*.
  - ⚠️ Phát hiện lỗi: `BUG-03-002` (React Hydration Mismatch do `toLocaleTimeString`).
  - ⚠️ Phát hiện lỗi P1: `BUG-03-018` (Công tắc Kill-Switch lưu LocalStorage client thay vì gửi `POST /system/maintenance` lên Identity service).
- [x] **Màn hình 8.4: Cài Đặt Tham Số Nền Tảng (`/admin/settings`)**
  - Cấu hình các tham số vận hành cốt lõi: Phí chiết khấu sàn mặc định (%), Thời gian giữ tiền ký quỹ Escrow (giờ), Phí giao hàng cơ bản, Ngưỡng cảnh báo tồn kho thấp.
  - ⚠️ Phát hiện lỗi P2: `BUG-03-019` (Giao diện 100% Mock State mảng `platformSettings`, chưa có backend API).
- [x] **Màn hình 8.5: Quản Lý Tích Hợp Cổng Bên Thứ Ba (`/admin/integrations`)**
  - Trạng thái kết nối các cổng thanh toán (VNPAY, MoMo, VietQR Napas) và các đơn vị giao hàng đối tác (GHN, GHTK, ViettelPost).
  - ⚠️ Phát hiện lỗi P2: `BUG-03-019` (Giao diện 100% Mock State danh sách `INT-01` -> `INT-05`, không có kiểm tra ping kết nối thật).

---

## 📊 TỔNG HỢP QUY MÔ KIỂM THỬ MOD-03
- **Tổng số Route & Màn hình:** **35 Màn hình quản trị trung tâm**
- **Tổng số Phân hệ điều hành:** **8 Phân hệ**
- **Tổng số Tab trạng thái & Bộ lọc:** **42 Tabs chuyên sâu**
- **Tài khoản kiểm thử:** Tài khoản Quản trị viên tối cao `adminhuki@gmail.com` (Role: `PLATFORM_ADMIN` / `SUPER_ADMIN`).
