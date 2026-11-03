# MOD-02: Kênh Người Bán & Nhà Xuất Bản (Seller & Publisher Portal)

> **Phạm vi kiểm thử toàn diện:** Bao gồm **tất cả 48 Màn hình, Route, Tab con, Modal bảo mật, Ngăn kéo (Drawer) và Luồng nghiệp vụ** có trong toàn bộ mã nguồn Kênh Người Bán HUKI (`/seller/*`), kết hợp giữa **Kiểm thử Giao diện (Responsive 3 Viewports, Anti-AI)** và **Kiểm thử Chức năng Nghiệp vụ Chuyên Sâu (Store Setup, Books CRUD, Order State Machine, 3-Tier Wallet, Flash Sale Slots, Vouchers, Staff & RBAC)**.  
> **Trạng thái thực tế:** **ĐÃ HOÀN TẤT KIỂM THỬ THỰC TẾ 2 PHA (UI VIEWPORT + CHỨC NĂNG NGHIỆP VỤ & LOGS)**.  
> **Kết quả kiểm thử:** Phát hiện và bóc tách thành công **18 lỗi xác thực chi tiết (14 lỗi UI/UX + 4 lỗi Chức Năng Nghiệp Vụ & Network)** lưu tại [tasks/bug-mod02.md](file:///e:/HuKi/tasks/bug-mod02.md).  
> **Cam kết cốt lõi:** **Tuyệt đối không tự ý sửa code sản phẩm** (`web/src/*`, `platform/*`) trước khi có sự phê duyệt từ người dùng.

---

## 🎨 BỘ TIÊU CHUẨN THIẾT KẾ ANTI-AI & GIAO DIỆN B2B XUẤT BẢN TINH TẾ (EDITORIAL B2B WORKSPACE)

Dựa trên bộ kỹ năng `skill/.gemini/skills/ui-ux-pro-max`, Kênh Người Bán & Nhà Xuất Bản HUKI tuân thủ nghiêm ngặt các nguyên tắc thiết kế B2B chuyên nghiệp, loại bỏ hoàn toàn các phong cách "AI template rẻ tiền":

1. **🚫 Triệt Tiêu Tuyệt Đối Các Yếu Tố AI Cliché & Rẻ Tiền:**
   - **Không lạm dụng Blur & Gradient phát sáng:** Cấm tuyệt đối các khối cầu `blur-3xl`, `bg-yellow-400/20 blur-3xl`, gradient màu tím/hồng neon lơ lửng gây cảm giác "AI demo template".
   - **Không nhấp nháy chuyển động vô nghĩa:** Loại bỏ triệt để `animate-pulse` trên các thẻ thông số tĩnh, nhãn trạng thái hoặc biểu tượng cố định. Chỉ sử dụng chuyển động vi mô (micro-interactions) tinh tế (`transition-all duration-200`) khi tương tác hover hoặc tải dữ liệu.
   - **Không dùng emoji text hoặc raw unicode symbols thô:** Cấm dùng `★`, `☆`, `⌛`, `👉`, `📦`, `⚠️`, `✅` dạng chuỗi ký tự unicode (dễ bị vỡ font tofu `□` hoặc biến thành emoji đồ chơi nhiều màu). Luôn dùng biểu tượng vector chuẩn Google Material Symbols (`inventory_2`, `local_shipping`, `verified`, `star`, `cancel`, `schedule`).
   - **Không để thẻ lọt thỏm giữa màn hình trống:** Cấm các layout co cụm `max-w-md` trơ trọi giữa khoảng trắng mênh mông. Luôn tổ chức bố cục B2B có cấu trúc: sidebar cố định, bảng dữ liệu cân đối, thẻ KPI có nhịp điệu (metric card grid).
   - **Không nhúng dữ liệu mock/placeholder tĩnh:** Loại bỏ toàn bộ "Lorem ipsum", dữ liệu sách giả lập ("Atomic Habits", ảnh Unsplash ngẫu nhiên). Luôn kết nối API thực tế từ DB hoặc hiển thị Empty State tao nhã với chỉ dẫn hành động rõ ràng.

2. **🌿 Bảng Màu B2B Xuất Bản Tri Thức & Sách Bản Quyền:**
   - **Màu thương hiệu chính (Primary):** `#003B2B` (Forest Green đậm tri thức, thể hiện sự tin cậy, thâm niên và chuyên nghiệp của ngành xuất bản).
   - **Màu nhấn thương mại (Accent):** `#00875A` (Emerald tăng trưởng), `#D97706` / `#F59E0B` (Amber gold cho đơn chờ xử lý, cảnh báo kho).
   - **Màu nền không gian làm việc (Workspace Surface):** Slate nhã nhặn `#F8FAFC` kết hợp giấy in ngà `#FBF9F5` (Book Cream) giúp làm việc nhiều giờ không mỏi mắt.
   - **Đường viền phân tách (Hairline Borders):** `#E2E8F0` siêu mảnh (1px), dứt khoát, mang lại cảm giác công cụ quản trị B2B tinh xảo (Fintech & ERP grade).
   - **Hệ thống Huy hiệu trạng thái (Status Pills):**
     - Đã duyệt / Thành công: `bg-emerald-50 text-emerald-700 border border-emerald-200`
     - Chờ duyệt / Đang xử lý: `bg-amber-50 text-amber-700 border border-amber-200`
     - Từ chối / Đã hủy: `bg-rose-50 text-rose-700 border border-rose-200`
     - Lưu nháp: `bg-slate-100 text-slate-600 border border-slate-200`

3. **📖 Typography Chuẩn Biên Tập & Số Liệu Doanh Nghiệp (Editorial & Monospace Hierarchy):**
   - **Tiêu đề phân hệ & Tên ấn phẩm:** Dùng font Serif (`font-editorial` / `font-serif`) thể hiện sự trang trọng, phẩm giá của sách.
   - **Văn bản biểu mẫu & Hướng dẫn (Body):** Dùng font Sans-serif trung tính, tương phản chuẩn WCAG AA ($\ge 4.5:1$).
   - **Mã đơn hàng, Mã ISBN, SKU sách, Doanh thu & Tồn kho:** Bắt buộc dùng font Monospace (`font-mono`) cho độ căn chỉnh số học tuyệt đối và chuyên nghiệp.

4. **✨ Công Thái Học & Tương Tác B2B (High-Density Usability):**
   - **Mọi nút bấm và dòng bảng:** Có `cursor-pointer`, hiệu ứng hover nhẹ nhàng `hover:bg-slate-50 transition-colors`.
   - **Điều hướng chuẩn SEO & Đa nhiệm:** Luôn dùng `<Link href="...">` để người bán có thể mở nhiều tab con (chuột giữa / Ctrl+Click) khi quản lý nhiều đơn cùng lúc.
   - **Phản hồi tức thì (Instant Feedback):** Mọi hành động sao chép mã đơn, cập nhật tồn kho, đổi trạng thái đều kích hoạt Toast thông báo ("Đã sao chép mã đơn", "Đã cập nhật số lượng tồn").

---

## 🔍 TIÊU CHUẨN KIỂM THỬ ĐA CHIỀU (MULTI-SPECTRUM AUDIT SPECIFICATION)

Mỗi màn hình và luồng nghiệp vụ trong danh sách dưới đây đều bắt buộc trải qua **4 chiều kiểm thử toàn diện** bằng robot Playwright và tương tác thực tế:

| Chiều Kiểm Thử | Công Cụ & Cơ Chế | Nội Dung Kiểm Tra Chuyên Sâu |
| :--- | :--- | :--- |
| 📱 **Responsive 3 Viewports** | Playwright Multi-Device Matrix | • **Mobile (390 x 844 px):** Bắt lỗi tràn ngang (`scrollWidth > innerWidth`), vỡ flexbox/grid, menu drawer di động, nút bị che.<br>• **Tablet (768 x 1024 px):** Co giãn bảng dữ liệu đơn hàng/sách, thanh điều hướng sidebar.<br>• **Desktop (1440 x 900 px):** Layout chuẩn, hiển thị đầy đủ 7 nhóm Accordion và bảng số liệu rộng. |
| 🔴 **Console Error & Runtime** | `page.on('console')`<br>`page.on('pageerror')` | • Lỗi React Hydration Mismatch giữa server và client.<br>• Lỗi `TypeError: Cannot read properties of undefined/null`.<br>• Cảnh báo React `missing unique key`, memory leak từ timer/socket polling. |
| 🌐 **Network & Exception Log** | `page.on('response')`<br>Backend Server Logs | • Bắt toàn bộ lỗi HTTP: `400` (Sai UUID/query), `401` (Thiếu/hết hạn Token), `403` (Sai RBAC), `404` (API/Ảnh/Font hỏng), `429` (Spam request polling), `500` (Server crash). |
| 🎨 **UI/UX & Tương Tác** | Bounding Box & DOM Inspection | • Kiểm tra chuẩn `<Link>` (tránh dùng `<div onClick>` làm mất SEO và cản trở mở tab mới).<br>• Kiểm tra `z-index` Modals, Drawers, Tooltip không che khuất nút hành động.<br>• Kiểm tra hiển thị tiếng Việt, không lỗi font unicode tofu (`□`), tương phản chuẩn WCAG. |

---

## 🧭 LƯỢC ĐỒ KIẾN TRÚC & VÒNG ĐỜI GIAN HÀNG (SELLER LIFECYCLE)

```
[Khách / Độc Giả] ──> [/seller (Giới Thiệu)] ──> [/seller/register (Nộp Hồ Sơ Pháp Nhân)]
                                                              │
                                                              ▼
[Đang Hoạt Động (Approved Seller)] ◄── [/seller/stores/setup] ◄── [/seller/pending (Chờ Admin Duyệt)]
        │                               (Cấu Hình Ngân Hàng & Kho)
        ├──> Phân Hệ 1: Bảng Tổng Quan & Gian Hàng Công Khai
        ├──> Phân Hệ 2: Quản Lý Đơn Hàng & Đổi Trả Toàn Trình
        ├──> Phân Hệ 3: Quản Lý Sản Phẩm, Đăng Sách Đa Định Dạng & Tồn Kho
        ├──> Phân Hệ 4: Chăm Sóc Khách Hàng, Đánh Giá & Chat Realtime
        ├──> Phân Hệ 5: Marketing, Flash Sale, Voucher & Tiếp Thị Liên Kết
        ├──> Phân Hệ 6: Ví Doanh Nghiệp, Ký Quỹ Escrow, Quyết Toán & Báo Cáo
        └──> Phân Hệ 7: Pháp Nhân Doanh Nghiệp, Chi Nhánh & Phân Quyền RBAC
```

---

## 🗺️ BẢN ĐỒ CHI TIẾT TOÀN BỘ CÁC MỤC KIỂM THỬ TRONG SELLER PORTAL

### 0. Phân Hệ 0: Onboarding, Gia Nhập & Thiết Lập Ban Đầu (4 Màn Hình)
- [ ] **Màn hình 0.1: Landing Kênh Người Bán (`/seller`)**
  - Giới thiệu giải pháp số hóa sách in, Ebook DRM, Audio AI, chính sách chiết khấu sàn, câu hỏi thường gặp FAQ.
  - Kiểm tra các nút CTA: "Đăng ký mở gian hàng", "Đăng nhập kênh người bán", "Xem biểu phí sàn".
- [ ] **Màn hình 0.2: Đăng Ký Pháp Nhân Đối Tác (`/seller/register`)**
  - Wizard 4 bước: 
    1. Thông tin liên hệ & người đại diện pháp luật.
    2. Hồ sơ doanh nghiệp (Tên công ty/NXB, Mã số thuế MST, Giấy phép ĐKKD, Địa chỉ trụ sở).
    3. Thông tin thanh toán (Ngân hàng, Số tài khoản, Tên chủ thụ hưởng).
    4. Cam kết bản quyền tác phẩm & Điều khoản sàn $\rightarrow$ Gửi thẩm định.
  - Kiểm tra xác thực form, upload giấy phép PDF/JPG, bắt lỗi trùng mã số thuế.
- [ ] **Màn hình 0.3: Trạng Thái Chờ Duyệt Thẩm Định (`/seller/pending`)**
  - Hiển thị timeline tiến độ duyệt của Ban Quản Trị sàn HUKI (SLA: 24h - 48h).
  - Trạng thái hồ sơ: `PENDING_APPROVAL`, `NEEDS_CORRECTION` (yêu cầu bổ sung tài liệu), `REJECTED`.
  - Luồng cập nhật bổ sung giấy tờ khi bị yêu cầu chỉnh sửa mà không cần đăng ký lại từ đầu.
- [ ] **Màn hình 0.4: Thiết Lập Gian Hàng & Kho Ban Đầu (`/seller/stores/setup`)**
  - Bắt buộc hoàn tất sau khi được Admin duyệt trước khi vào Dashboard.
  - Cấu hình thông tin kho gửi hàng mặc định, số điện thoại vận đơn, liên kết tài khoản ngân hàng nhận tiền.
  - Kiểm tra cơ chế ngăn chặn vòng lặp chuyển hướng (Infinite Redirect Loop Prevention).

---

### 1. Phân Hệ 1: TỔNG QUAN GIAN HÀNG & THÔNG BÁO (3 Màn Hình + Realtime Sync)
- [ ] **Màn hình 1.1: Bảng Tổng Quan Vận Hành (`/seller/dashboard`)**
  - Thẻ chỉ số KPI chính: Doanh thu thực tế, Số đơn hàng mới cần xác nhận, Tổng sản phẩm đang bán, Đánh giá trung bình.
  - Biểu đồ doanh thu theo khung thời gian linh hoạt (Hôm nay, 7 ngày qua, 30 ngày qua, Tuần này, Tháng này).
  - Danh sách đơn hàng mới nhất cần đóng gói xử lý ngay.
  - Top 5 sách bán chạy nhất của gian hàng (Sách in vs Ebook).
- [ ] **Màn hình 1.2: Trung Tâm Thông Báo Gian Hàng (`/seller/notifications`)**
  - 5 Tab phân loại thông báo chuyên sâu:
    - Tab `Tất cả` (`all`): Toàn bộ thông báo từ hệ thống.
    - Tab `Cảnh báo vận hành / SLA` (`sla`): Cảnh báo đơn trễ hạn xác nhận, giao hàng chậm.
    - Tab `Đơn hàng` (`orders`): Thông báo nổ đơn mới, khách hủy đơn, khách yêu cầu đổi trả.
    - Tab `Tài chính` (`finance`): Tiền escrow giải phóng, lệnh rút tiền thành công/thất bại.
    - Tab `Ban quản trị` (`admin`): Thông báo bảo trì hệ thống, chính sách chiết khấu mới từ sàn.
  - Thao tác: Đánh dấu đã đọc từng tin, đánh dấu đã đọc tất cả, xóa thông báo.
- [ ] **Màn hình 1.3: Xem Gian Hàng Công Khai (`/shop/[slug]` hoặc `/shop/[businessId]`)**
  - Kiểm tra mở tab mới từ nút "Xem Gian Hàng" trên Sidebar.
  - Hiển thị đầy đủ nhận diện thương hiệu: Banner shop, Logo, Tên NXB/Shop, Mô tả, Đánh giá sao, Bộ sưu tập sách, Bộ lọc danh mục sách của riêng shop.

---

### 2. Phân Hệ 2: QUẢN LÝ ĐƠN HÀNG & ĐỔI TRẢ TOÀN TRÌNH (5 Màn Hình + 6 Tabs Chuẩn + Drawers)
- [ ] **Màn hình 2.1: Quản Trị Đơn Hàng Tập Trung (`/seller/orders`)**
  - [x] **6 Tab lọc trạng thái đơn hàng chuẩn Prisma `SellerOrderStatus`:**
    - Tab `Tất cả` (`ALL`)
    - Tab `Chờ xác nhận` (`PENDING_CONFIRMATION` - gắn badge đếm số lượng realtime)
    - Tab `Đang chuẩn bị hàng` (`PREPARING` - đã xác thực API Status 200)
    - Tab `Đang giao hàng` (`SHIPPING` / `SHIPPED` - đã xác thực API Status 200)
    - Tab `Hoàn tất giao dịch` (`COMPLETED`)
    - Tab `Hủy & Hoàn tiền` (`CANCELLED`)
  - [ ] **LỖI LỆCH TÀI LIỆU & ĐẶC TẢ ENUM (`BUG-02-016` - P1):** Tài liệu cũ liệt kê các tab `PROCESSING`, `READY_FOR_PICKUP` khiến khi gọi API lọc đơn bị HTTP 400 Bad Request do sai enum `SellerOrderStatus` của PostgreSQL.
  - [x] **Bộ lọc:** Lọc theo khoảng ngày đặt, theo phương thức thanh toán (COD / Thẻ / Ví HUKI), theo loại sách (Sách giấy / Ebook / Combo Hybrid).
  - [x] **Tìm kiếm nâng cao theo:** Mã đơn hàng, Tên người nhận, Số điện thoại nhận hàng, Tựa sách.
  - [ ] **Lỗi cập nhật query URL (`BUG-02-012` - P2):** Chuyển đổi giữa các tab trạng thái đơn làm reset trang 1 nhưng không cập nhật query URL `status`.
- [ ] **Màn hình 2.2: Luồng Xử Lý Đơn & In Vận Đơn (`/seller/orders?tab=PENDING_CONFIRMATION`)**
  - Thao tác duyệt/xác nhận đơn hàng: Đơn chuyển sang `PROCESSING`.
  - Thao tác in phiếu đóng gói (Packing Slip) và nhãn vận chuyển (Shipping Label).
  - Thao tác xác nhận đã đóng gói xong $\rightarrow$ Sinh mã vận đơn GHN/GHTK/ViettelPost $\rightarrow$ Chuyển `READY_FOR_PICKUP`.
- [ ] **Màn hình 2.3: Ngăn Kéo & Trang Chi Tiết Đơn Hàng (`OrderDetailDrawer` & `/seller/orders/[id]`)**
  - Thông tin người mua, địa chỉ nhận hàng chi tiết, ghi chú giao hàng của khách.
  - Danh sách từng cuốn sách trong đơn: Tựa sách, Bìa, Phân loại (Bìa mềm/Bìa cứng/Ebook kèm theo), Đơn giá, Số lượng, Thành tiền.
  - Bóc tách tài chính chi tiết: Tạm tính, Phí vận chuyển, Voucher shop tài trợ, Voucher sàn tài trợ, Chiết khấu nền tảng, Doanh thu thực nhận của Shop.
  - Dòng thời gian trạng thái đơn (Timeline Stepper) từ lúc đặt hàng đến khi giao xong.
  - Nút in hóa đơn/phiếu giao hàng trực tiếp.
- [ ] **Màn hình 2.4: Quản Lý Yêu Cầu Đổi Trả (`/seller/returns` & `/seller/returns/[id]`)**
  - 5 Tab trạng thái: `ALL`, `PENDING` (Chờ Shop xử lý), `APPROVED` (Đã đồng ý đổi trả), `REJECTED` (Từ chối), `RESOLVED` (Đã hoàn tất đổi mới/hoàn tiền).
  - Xem bằng chứng khách tải lên: Lý do đổi trả (Sách rách trang, in mờ, gãy bìa, sai tựa), ảnh chụp thực tế và video mở hộp.
  - Quyết định của Shop: Chấp thuận nhận lại sách / Gửi sách mới bù / Từ chối (bắt buộc nhập lý do từ chối rõ ràng gửi cho người mua và Admin sàn).
- [ ] **Màn hình 2.5: Quản Lý Đơn Giao Đổi Mới (`/seller/replacement-orders`)**
  - 3 Tab trạng thái: `ALL`, `WAITING_SHIP` (Chờ gửi sách bù), `SHIPPED` (Đã phát hàng đổi mới).
  - Luồng tạo đơn vận chuyển bù hàng 0đ cho khách, nhập mã vận đơn giao bù và theo dõi hành trình trả hàng - nhận hàng.

---

### 3. Phân Hệ 3: SẢN PHẨM, ĐĂNG SÁCH ĐA ĐỊNH DẠNG & TỒN KHO (11 Màn Hình/Luồng + Modals)
- [ ] **Màn hình 3.1: Danh Mục Quản Trị Sản Phẩm (`/seller/products`)**
  - 6 Tab trạng thái sách:
    - Tab `Tất cả` (`ALL`)
    - Tab `Đang mở bán` (`PUBLISHED`)
    - Tab `Bản nháp` (`DRAFT`)
    - Tab `Chờ sàn duyệt` (`PENDING_APPROVAL`)
    - Tab `Sắp hết hàng` (`LOW_STOCK`)
    - Tab `Bị khóa / Vi phạm` (`SUSPENDED`)
  - Lọc theo định dạng sách: `HYBRID` (Sách giấy + Ebook), `PHYSICAL` (Sách giấy thuần), `DIGITAL` (Ebook thuần).
  - Thao tác nhanh tại chỗ: Bật/Tắt công tắc kinh doanh (Active/Inactive Toggle), Sửa nhanh giá bán, Nhân bản thông tin sách (Duplicate), Xóa sách nháp.
- [ ] **Màn hình 3.2: Đăng Sách Đa Định Dạng Hybrid (`/seller/product/create-hybrid`)**
  - Bước 1: Thông tin xuất bản (Tựa sách, Tác giả, Dịch giả, Nhà xuất bản, Năm XB, Số trang, Ngôn ngữ, Thể loại/Danh mục).
  - Bước 2: Thông số sách in vật lý (Giá bìa niêm yết, Giá bán ưu đãi, Khối lượng gram, Kích thước Dài x Rộng x Cao để tính phí ship, Tồn kho ban đầu).
  - Bước 3: Tích hợp Ebook số hóa DRM (Tải file PDF bản quyền, thiết lập số trang cho phép Đọc Thử Miễn Phí, cấu hình watermark chống chụp màn hình).
  - Bước 4: Thiết lập Tiếp thị liên kết (Tỷ lệ hoa hồng cho Affiliate Creator) $\rightarrow$ Gửi thẩm định xuất bản.
- [ ] **Màn hình 3.3: Đăng Sách Giấy Thuần Túy (`/seller/product/create-physical`)**
  - Giao diện tối ưu hóa cho sách in truyền thống, quản lý số lượng tồn kho theo từng kho hàng, cấu hình kích thước đóng gói tiêu chuẩn.
- [ ] **Màn hình 3.4: Đăng Sách Điện Tử Ebook DRM (`/seller/product/create-ebook`)**
  - Đăng sách chỉ phân phối số: Cấu hình định dạng file, kiểm tra tính hợp lệ file sách số, cấu hình giá bán Ebook vĩnh viễn hoặc gói thuê đọc theo kỳ.
- [ ] **Màn hình 3.5: Trình Đăng Sách Tổng Hợp & Routing Fallback (`/seller/product/create` & `/seller/products/create`)**
  - Kiểm tra điều hướng đúng đến luồng đăng phù hợp theo định dạng sách mong muốn mà không gây đứt gãy luồng người dùng.
- [ ] **Màn hình 3.6: Chỉnh Sửa Sách Đang Bán (`/seller/product/[id]/edit`, `/seller/products/[id]/edit`, `/seller/product/edit-hybrid`)**
  - Cập nhật giá bán, sửa đổi mô tả chi tiết cuốn sách, tải thêm ảnh chụp góc cạnh thực tế của sách.
  - Kiểm tra cơ chế tự động gửi duyệt lại đối với các thông tin nhạy cảm (Tựa sách, bản quyền Ebook) và cập nhật tức thì đối với tồn kho/mô tả.
- [ ] **Màn hình 3.7: Danh Sách Sách Cần Sửa Đổi & Sách Nháp (`/seller/product/correction`)**
  - Danh sách các sách bị Admin sàn từ chối phê duyệt kèm lý do cụ thể (sai thể loại, thiếu giấy phép xuất bản, chất lượng bản scan kém).
  - Thao tác sửa đổi bổ sung và gửi yêu cầu duyệt lại (Resubmit).
- [ ] **Màn hình 3.8: Khắc Phục Lỗi Sách Chi Tiết (`/seller/products/[id]/correct`)**
  - Form chuyên biệt hiển thị khung đối chiếu: "Nội dung cũ" vs "Ghi chú của kiểm duyệt viên sàn" vs "Khung nhập nội dung khắc phục".
- [ ] **Màn hình 3.9: Trung Tâm Khiếu Nại Bản Quyền & Xử Lý Vi Phạm (`/seller/appeals`)**
  - Quản trị các lệnh xử phạt vi phạm bản quyền hoặc vi phạm chính sách của Shop.
  - 4 Tab mức độ: `ALL`, `WARNING` (Cảnh cáo), `PENALTY` (Phạt điểm), `SUSPENSION` (Tạm dừng quyền đăng sách).
  - Form tạo kháng nghị (Appeal Submission): Tải giấy chứng nhận quyền tác giả, hợp đồng nhượng quyền phân phối sách.
- [ ] **Màn hình 3.10: Quản Lý Kho & Sổ Ghi Nhật Ký Tồn Kho (`/seller/inventory`)**
  - 5 Tab theo dõi tồn kho:
    - Tab `Tất cả` (`ALL`)
    - Tab `Còn hàng` (`IN_STOCK`)
    - Tab `Cảnh báo sắp hết` (`LOW_STOCK` - dưới ngưỡng cấu hình)
    - Tab `Hết hàng` (`OUT_OF_STOCK`)
    - Tab `Đang giữ chỗ` (`RESERVED` - số lượng sách đã được khách đặt nhưng chưa xuất kho)
  - Thao tác: Điều chỉnh tồn kho tại chỗ (Quick Inline Stock Update), Điều chỉnh kho thủ công kèm lý do (Nhập hàng mới, Hàng hỏng/Hao hụt).
- [ ] **Màn hình 3.11: Lịch Sử Biến Động Kho (`InventoryLogsModal`)**
  - Modal kiểm toán chi tiết lịch sử xuất/nhập/hoàn hàng của từng SKU: Thời gian, Loại biến động (Bán hàng, Hoàn trả, Nhập kho, Điều chỉnh tay), Số lượng thay đổi, Tồn kho trước & sau, Người thực hiện.

---

### 4. Phân Hệ 4: CHĂM SÓC KHÁCH HÀNG & CỘNG ĐỒNG (3 Màn Hình + WebSocket Chat)
- [ ] **Màn hình 4.1: Hệ Thống Tin Nhắn & Hỗ Trợ Độc Giả Realtime (`/seller/chat`)**
  - Giao diện chat thời gian thực qua WebSocket (`useChatSocket`):
    - Danh sách hội thoại khách hàng bên trái, kèm bộ lọc theo người mua có đơn gần đây, tin nhắn chưa trả lời.
    - Cửa sổ tin nhắn: Gửi tin văn bản, gửi hình ảnh chụp sách thật, gửi gợi ý mua sách kèm thẻ sản phẩm tương tác (Book Card).
    - Cột thông tin khách hàng bên phải: Lịch sử mua hàng của khách tại shop, các đơn hàng gần nhất.
    - Bộ tin nhắn mẫu trả lời nhanh (Quick Responses): Lời chào, Thông báo thời gian giao hàng, Hướng dẫn đọc Ebook.
- [ ] **Màn hình 4.2: Quản Trị Đánh Giá & Nhận Xét Sách (`/seller/reviews`)**
  - 8 Tab lọc đánh giá:
    - Tab `Tất cả` (`ALL`)
    - Lọc theo số sao: `5 Sao`, `4 Sao`, `3 Sao`, `2 Sao`, `1 Sao`
    - Tab `Có hình ảnh/video thực tế` (`WITH_IMAGE`)
    - Tab `Chưa phản hồi` (`UNREPLIED`)
  - Thao tác: Phản hồi công khai nhận xét của khách hàng, Sửa phản hồi, Báo cáo đánh giá sai sự thật/vi phạm thuần phong mỹ tục lên Admin sàn.
- [ ] **Màn hình 4.3: Quản Lý Độc Giả Theo Dõi Gian Hàng (`/seller/followers`)**
  - Thống kê tổng số lượng người bấm Theo dõi (Followers) và tốc độ tăng trưởng fan.
  - Danh sách người theo dõi kèm avatar, thời gian bấm theo dõi.
  - Công cụ gửi tin nhắn ưu đãi hoặc voucher tri ân dành riêng cho người theo dõi.

---

### 5. Phân Hệ 5: CÔNG CỤ MARKETING & CHIẾN DỊCH (5 Màn Hình + 4 Tabs Chuyên Sâu)
- [ ] **Màn hình 5.1: Chương Trình Giảm Giá Tự Do (`/seller/promotions/discounts`)**
  - 4 Tab trạng thái chương trình: `ALL`, `ACTIVE` (Đang diễn ra), `UPCOMING` (Sắp diễn ra), `EXPIRED` (Đã kết thúc).
  - Luồng tạo đợt giảm giá: Đặt tên chương trình, cài đặt thời gian bắt đầu & kết thúc, chọn danh sách sách áp dụng, thiết lập mức giảm theo % hoặc theo số tiền VNĐ cố định.
  - Kiểm tra quy tắc bảo vệ: Giá sau giảm không được thấp hơn ngưỡng sàn cho phép.
- [ ] **Màn hình 5.2: Quản Lý Mã Giảm Giá Shop Voucher (`/seller/promotions/vouchers` & `/seller/vouchers`)**
  - 5 Tab voucher: `ALL`, `ACTIVE`, `UPCOMING`, `INACTIVE`, `EXPIRED`.
  - Luồng tạo mã Voucher riêng của Shop:
    - Mã voucher (Ví dụ: `HUKIKIMDONG20K`), Tên mã.
    - Loại ưu đãi: Giảm theo số tiền, Giảm theo %, Hỗ trợ phí vận chuyển (Freeship Extra).
    - Điều kiện áp dụng: Giá trị đơn hàng tối thiểu, Mức giảm tối đa.
    - Giới hạn: Tổng số lượt dùng toàn sàn, Số lượt tối đa cho mỗi khách hàng.
    - Phạm vi áp dụng: Toàn bộ sách trong shop hoặc chỉ một số đầu sách chỉ định.
- [ ] **Màn hình 5.3: Đăng Ký Flash Sale Gian Hàng (`/seller/promotions/flash-sale`)**
  - 4 Tab khung giờ: `ALL`, `UPCOMING`, `ACTIVE`, `ENDED`.
  - Xem danh sách các khung giờ Flash Sale của sàn HUKI (Ví dụ: 0h-9h, 9h-12h, 12h-18h, 20h-24h).
  - Đăng ký sách tham gia Flash Sale: Cấu hình giá sốc, cam kết số lượng tồn kho riêng cho đợt Flash Sale.
  - Theo dõi tỷ lệ bán hết (Progress Bar: Đã bán x% số lượng suất Flash Sale).
- [ ] **Màn hình 5.4: Quản Lý Tiếp Thị Liên Kết Sàn (`/seller/affiliate`)**
  - 3 Tab quản trị:
    - Tab `Tổng quan chiến dịch` (`DASHBOARD`): Doanh thu mang lại từ đối tác Affiliate, Tổng hoa hồng đã chi trả, Số đơn hàng tiếp thị thành công.
    - Tab `Cấu hình hoa hồng sách` (`BOOKS`): Cài đặt tỷ lệ hoa hồng riêng cho từng đầu sách (từ 5% đến 35%) để thu hút các Book Reviewer / KOC.
    - Tab `Cài đặt chung` (`SETTINGS`): Bật/Tắt chế độ nhận tiếp thị liên kết tự động, tỷ lệ hoa hồng mặc định cho toàn bộ sách mới.

---

### 6. Phân Hệ 6: VÍ DOANH NGHIỆP, KÝ QUỸ ESCROW & TÀI CHÍNH (6 Màn Hình + 3 Modals Bảo Mật)
- [ ] **Màn hình 6.1: Trung Tâm Tài Chính & Rút Tiền (`/seller/finance`)**
  - Hiển thị 3 con số tài chính cốt lõi: Số dư khả dụng có thể rút ngay, Tiền đang chờ quyết toán (Ký quỹ Escrow), Tổng tiền đã rút về tài khoản ngân hàng.
  - 3 Tab dữ liệu:
    - Tab `Tiền chờ quyết toán` (`ESCROW`)
    - Tab `Lịch sử thanh toán & Rút tiền` (`PAYOUTS` - bảng `SellerPayoutGroupedTable`)
    - Tab `Biến động số dư` (`TRANSACTIONS`)
  - Nút "Yêu Cầu Rút Tiền" (Tạo lệnh rút tiền về tài khoản ngân hàng đã liên kết).
- [ ] **Màn hình 6.2: Modal Xác Thực Mã PIN Rút Tiền (`WithdrawalPinModal`)**
  - Nhập mã PIN bảo mật 6 số trước khi cho phép tạo lệnh rút tiền ra khỏi sàn.
  - Kiểm tra xác thực mã PIN, cơ chế khóa tạm thời khi nhập sai quá số lần quy định.
- [ ] **Màn hình 6.3: Modal Cài Đặt & Đổi Mã PIN Ví (`UpdatePinModal`)**
  - Thiết lập mã PIN lần đầu hoặc đổi mã PIN qua mã OTP gửi về Email/Số điện thoại của chủ doanh nghiệp.
- [ ] **Màn hình 6.4: Modal Cập Nhật Tài Khoản Ngân Hàng Thụ Hưởng (`UpdateBankModal`)**
  - Cập nhật số tài khoản nhận tiền, tên chủ tài khoản (bắt buộc trùng khớp tên pháp nhân/chủ shop), chọn ngân hàng từ danh mục NAPAS 50+ ngân hàng Việt Nam.
- [ ] **Màn hình 6.5: Theo Dõi Ký Quỹ Đơn Hàng Escrow (`/seller/escrow`)**
  - Danh sách chi tiết tiền bán của từng đơn hàng đang được giữ trong tài khoản ký quỹ trung gian của sàn HUKI.
  - Trạng thái dòng tiền: `HOLDING` (Đang giữ trong thời gian khiếu nại đổi trả 7 ngày), `RELEASED` (Đã giải phóng vào số dư khả dụng), `REFUNDED` (Đã hoàn lại cho khách do đơn hủy/đổi trả).
- [ ] **Màn hình 6.6: Báo Cáo Doanh Thu, Phí Sàn & Thuế (`/seller/reports`, `/seller/revenue`, `/seller/transactions`)**
  - 3 Tab báo cáo chuyên sâu:
    - Tab `Báo cáo sản phẩm` (`ITEMS`): Số lượng bán, doanh thu, lợi nhuận gộp theo từng đầu sách.
    - Tab `Báo cáo giao dịch chi tiết` (`TRANSACTIONS`): Bảng đối soát từng mã giao dịch, chiết khấu nền tảng, phí vận chuyển hỗ trợ.
    - Tab `Báo cáo quyết toán` (`PAYOUTS`): Bảng đối soát thuế và chứng từ thanh toán.
  - Bộ lọc thời gian tùy chỉnh và chức năng xuất file Excel/CSV báo cáo tài chính.
- [ ] **Màn hình 6.7: Ví Người Bán Route Phụ (`/seller/wallet`)**
  - Kiểm tra điều hướng đồng bộ với `/seller/finance`.

---

### 7. Phân Hệ 7: THIẾT LẬP SHOP, CHI NHÁNH & QUẢN TRỊ NHÂN VIÊN (6 Màn Hình + Ma Trận RBAC)
- [ ] **Màn hình 7.1: Hồ Sơ Pháp Nhân Gian Hàng (`/seller/business` & `/seller/profile`)**
  - Thông tin doanh nghiệp: Tên pháp nhân, Tên gian hàng hiển thị, Mã số thuế, Giấy phép kinh doanh, Logo & Banner đại diện.
  - Thông tin liên hệ: Người đại diện pháp luật, Email nhận thông báo, Hotline hỗ trợ.
  - Thông tin kho lấy hàng: Địa chỉ lấy hàng mặc định, Phường/Xã, Quận/Huyện, Tỉnh/Thành phố.
  - Luồng nộp yêu cầu cập nhật hồ sơ (Business Profile Update Request) $\rightarrow$ Gửi lên Ban Quản Trị sàn phê duyệt lại khi thay đổi thông tin pháp nhân.
- [ ] **Màn hình 7.2: Lịch Sử Thông Báo Duyệt Hồ Sơ Pháp Nhân (`/seller/business/notifications`)**
  - 4 Tab lọc: `ALL`, `APPROVED`, `REJECTED`, `PENDING`.
  - Xem phản hồi chính thức từ Admin sàn về các yêu cầu cập nhật giấy phép kinh doanh / thay đổi thông tin công ty.
- [ ] **Màn hình 7.3: Quản Lý Đa Chi Nhánh & Cửa Hàng Con (`/seller/stores`)**
  - Danh sách các chi nhánh/kho hàng trực thuộc doanh nghiệp (`SellerStoresView`).
  - Thao tác chuyển đổi qua lại giữa các cửa hàng con để quản lý kho và đơn hàng riêng biệt.
- [ ] **Màn hình 7.4: Thêm Chi Nhánh / Cửa Hàng Mới (`/seller/stores/new`)**
  - Tạo mới chi nhánh kho sách: Đặt tên chi nhánh, số điện thoại phụ trách, địa chỉ định vị trên bản đồ để tối ưu tuyến đường giao hàng.
- [ ] **Màn hình 7.5: Danh Sách & Mời Nhân Viên Quản Trị (`/seller/staff`)**
  - Bảng danh sách nhân sự của Shop: Họ tên, Email, Số điện thoại, Vai trò (Quản trị viên, Thủ kho, Kế toán, Nhân viên CSKH), Trạng thái (Đang hoạt động, Đã vô hiệu hóa).
  - Thao tác: Mời nhân viên mới qua Email, Khóa tài khoản nhân viên, Thu hồi quyền truy cập.
- [ ] **Màn hình 7.6: Ma Trận Phân Quyền Nhân Viên RBAC (`/seller/staff?action=provision`)**
  - Cấu hình phân quyền chi tiết (Granular RBAC Matrix) cho từng nhân viên:
    - Quyền xem/xử lý đơn hàng (`ORDER_VIEW`, `ORDER_PROCESS`, `ORDER_CANCEL`)
    - Quyền thêm/sửa sách (`PRODUCT_VIEW`, `PRODUCT_CREATE`, `PRODUCT_UPDATE`)
    - Quyền quản lý kho (`INVENTORY_UPDATE`)
    - Quyền xem tài chính & rút tiền (`FINANCE_VIEW`, `FINANCE_MANAGE`)
    - Quyền chat với khách hàng (`STORE_VIEW`, `CHAT_REPLY`)
    - Quyền quản lý thành viên (`MEMBER_VIEW`, `MEMBER_MANAGE`)
  - Kiểm tra chặn truy cập tự động khi nhân viên không có quyền tương ứng.

---

### 8. Phân Hệ 8: HEADER TOÀN CỤC, SIDEBAR RESPONSIVE & REALTIME SERVICES
- [ ] **Thanh Tiêu Đề Header (`SellerHeader.tsx`)**
  - Nút thu gọn / mở rộng Sidebar trên Desktop và nút mở Drawer trên Mobile.
  - Huy hiệu hiển thị tên doanh nghiệp & tag "Đối tác" (tự động cắt ngắn text nếu tên quá dài).
  - Thanh tìm kiếm nhanh toàn cục: Tra cứu nhanh theo Mã đơn hàng, Mã SKU sách hoặc Tựa sách.
  - Chuông thông báo realtime (`UniversalNotificationBell` & `SellerNotificationBell`).
  - Nút bật/tắt âm thanh chuông thông báo & nổ đơn (`soundEffects.toggleMute`).
  - Nút mở nhanh hộp thư khách hàng kèm huy hiệu số tin chưa đọc (`unreadChatCount`).
  - Nút tắt "Thêm Sản Phẩm Mới" nhanh.
  - Nút liên kết "Về Sàn" (Mở trang mua sắm trong tab mới).
- [ ] **Thanh Điều Hướng Sidebar (`SellerSidebar.tsx`)**
  - 7 Nhóm Accordion có tính năng đóng/mở độc lập, tự động nhận diện và mở nhóm chứa màn hình đang xem.
  - Huy hiệu đếm số lượng động (Dynamic Badges):
    - Đơn hàng mới cần xác nhận (`badges.pendingOrders`)
    - Tổng đơn hàng (`badges.orders`)
    - Tổng sản phẩm đang quản lý (`badges.products`)
    - Tin nhắn khách hàng chưa đọc (`badges.unreadChat`)
    - Thông báo cập nhật hồ sơ (`badges.businessUpdates`)
    - Thông báo từ ban quản trị (`unreadAdminNotifs`)
  - Cơ chế kiểm soát cờ tính năng (Feature Flags):
    - Tự động hiển thị nhãn "Giới hạn" hoặc "Bảo trì" khi sàn khóa tạm thời tính năng.
    - Hiển thị tooltip giải thích nguyên nhân bảo trì khi rê chuột.
  - Chế độ Responsive: Hiển thị dạng Drawer trượt trên thiết bị di động, tự động đóng khi bấm chọn link.

---

## 📊 TỔNG HỢP QUY MÔ KIỂM THỬ MOD-02
- **Tổng số Route & Màn hình:** **48 Màn hình / Luồng nghiệp vụ**
- **Tổng số Nhóm tính năng:** **8 Phân Hệ (0 đến 8)**
- **Tổng số Tab trạng thái:** **32 Tabs chuyên sâu**
- **Tổng số Modals & Ngăn kéo:** **8 Modals / Drawers**
