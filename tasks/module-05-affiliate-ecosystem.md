# MOD-05: Hệ Sinh Thái Tiếp Thị Liên Kết (Affiliate & Tracking Ecosystem)

> **Phạm vi kiểm thử toàn diện:** Gồm đầy đủ **9 Màn hình & Luồng phân bổ hoa hồng 3 bên (Sàn HUKI $\leftrightarrow$ Nhà Xuất Bản $\leftrightarrow$ Độc Giả/KOC BookTok)**, Cơ chế rút gọn link thông minh `/r/[shortCode]`, Lưu trữ Cookie Attribution 30 ngày và Quyết toán hoa hồng tự động.  
> **Trạng thái:** **ĐÃ HOÀN TẤT KIỂM THỬ THỰC TẾ TRÊN 3 VIEWPORTS (27 LƯỢT CHECK)**.  
> **Kết quả:** Bóc tách thành công **17 lỗi xác thực** (11 lỗi UI/UX & Responsive + 6 lỗi Chức Năng Sâu, Routing & Quyết Toán) lưu tại [bug-mod05.md](file:///e:/HuKi/tasks/bug-mod05.md).  
> **Cam kết:** **Tuyệt đối không tự ý sửa code sản phẩm** trước khi có sự phê duyệt từ người dùng.

---

## 🎨 BỘ TIÊU CHUẨN THIẾT KẾ ANTI-AI & TIẾP THỊ SÁCH BẢN QUYỀN MINH BẠCH (CREATOR COMMERCE SPECIFICATION)

Dựa trên bộ kỹ năng `skill/.gemini/skills/ui-ux-pro-max`, Hệ Sinh Thái Tiếp Thị Liên Kết HUKI Partner phục vụ các nhà sáng tạo nội dung văn hóa, KOC BookTok, Reviewer sách và cộng đồng bạn đọc; tuyệt đối bài trừ phong cách "làm giàu nhanh đa cấp / crypto AI":

1. **🚫 Triệt Tiêu Tuyệt Đối Các Yếu Tố AI Cliché & Đồ Họa Đa Cấp Rẻ Tiền:**
   - **Không dùng đồ họa làm giàu / pháo giấy / gradient vàng chói:** Cấm các hiệu ứng pháo hoa, vệt sáng chói chang lấp lánh kiểu AI, các biểu tượng bao tải tiền hoạt hình lòe loẹt. Tiếp thị sách HUKI hướng đến tính trí tuệ, lan tỏa văn hóa đọc, giao diện phải thanh lịch, tao nhã.
   - **Không lạm dụng số liệu ảo & bộ đếm giục giã (No Fake FOMO/Urgency):** Cấm các ticker đếm ngược giả lập, pop-up "vừa có người kiếm được 500k" gây khó chịu. Mọi số liệu hoa hồng, tỷ lệ click, doanh số giới thiệu phải 100% là dữ liệu thật từ hệ thống tracking.
   - **Không dùng Emoji Text thô:** Cấm dùng `🔗`, `💸`, `📈`, `🎁`, `🔥`. Toàn bộ icon hành động dùng Google Material Symbols vector chuẩn (`link`, `monetization_on`, `trending_up`, `redeem`, `local_fire_department`).
   - **Không giấu kín chính sách (Clear Attribution Transparency):** Minh bạch tuyệt đối cơ chế chia hoa hồng 3 bên, hiển thị rõ ràng thời hạn lưu trữ Cookie (30 ngày) và cơ chế First-Click / Last-Click attribution.

2. **🌿 Bảng Màu Tiếp Thị Tri Thức & Sáng Tạo:**
   - **Màu thương hiệu chính:** `#003B2B` (Forest Green đậm chất tri thức và bền vững).
   - **Màu hoa hồng & thành quả (Affiliate Earning Accent):** `#00875A` (Emerald thịnh vượng) và `#D97706` (Amber ấm áp).
   - **Nền thẻ chiến dịch:** `#FBF9F5` (Book Cream) hoặc `#FFFFFF` với viền siêu mảnh `#E2E8F0`.

3. **🔗 Tương Tác Vi Mô & Trải Nghiệm Tạo Link Siêu Tốc (1-Click Creator Flow):**
   - **Nút Copy Link thông minh:** Tích hợp phản hồi trực quan 2 lớp: đổi icon thành `check` xanh lục và hiển thị Toast thông báo tức thời: *"Đã sao chép link tiếp thị! Sẵn sàng chia sẻ."*
   - **Tải ảnh QR Code sắc nét:** Tạo mã QR Code độ phân giải cao vector (SVG/PNG 1000px) có nhúng logo HUKI ở tâm, sẵn sàng cho KOC in ấn hoặc chèn vào video review sách.
   - **Mã rút gọn thông minh:** Hiển thị link định dạng ngắn gọn thanh lịch `huki.vn/r/ABC12` với font Monospace dễ nhìn (`font-mono font-semibold`).

4. **📱 Tối Ưu Hóa Giao Diện Điện Thoại Cho BookToker & KOC:**
   - Đảm bảo thẻ danh mục chiến dịch sách có hoa hồng cao cuộn ngang mượt mà trên Mobile (390px), chạm vào là sao chép link ngay lập tức mà không cần qua nhiều trang trung gian.

---

## 🔍 TIÊU CHUẨN KIỂM THỬ ĐA CHIỀU (MULTI-SPECTRUM AUDIT SPECIFICATION)

Mỗi màn hình và luồng nghiệp vụ trong danh sách dưới đây đều bắt buộc trải qua **4 chiều kiểm thử toàn diện** bằng robot Playwright và tương tác thực tế:

| Chiều Kiểm Thử | Công Cụ & Cơ Chế | Nội Dung Kiểm Tra Chuyên Sâu |
| :--- | :--- | :--- |
| 📱 **Responsive 3 Viewports** | Playwright Multi-Device Matrix | • **Mobile (390 x 844 px):** Giao diện KOC tạo link và kiểm tra hoa hồng trên điện thoại; chợ chiến dịch thẻ sách vuốt mượt mà, không vỡ layout.<br>• **Tablet (768 x 1024 px):** Biểu đồ doanh số và bảng danh sách link tracking.<br>• **Desktop (1440 x 900 px):** Bảng quản trị hoa hồng NXB và bàn duyệt Admin. |
| 🔴 **Console Error & Runtime** | `page.on('console')`<br>`page.on('pageerror')` | • Lỗi React Hydration Mismatch.<br>• Lỗi `TypeError` khi parse dữ liệu thống kê lượt click / hoa hồng.<br>• Cảnh báo memory leak từ realtime sync bus khi cập nhật click mới. |
| 🌐 **Network & Exception Log** | `page.on('response')`<br>Backend Server Logs | • Bắt toàn bộ lỗi HTTP: `400` (Lỗi tạo link rút gọn), `401` (Hết hạn Token), `403` (Chưa được duyệt CTV), `404` (Mã shortCode không tồn tại), `500` (Engine redirect crash). |
| 🎨 **UI/UX & Tương Tác** | Bounding Box & DOM Inspection | • Nút Copy link 1-click có phản hồi tooltip "Đã sao chép".<br>• Modal KYC upload CCCD hiển thị ảnh xem trước sắc nét, không che nút bấm.<br>• Tải mã QR Code sắc nét, tương phản chuẩn. |

---

## 🧭 LƯỢC ĐỒ VÒNG ĐỜI TIẾP THỊ LIÊN KẾT (3-SIDED AFFILIATE FLOW)

```
[1. Kênh NXB: /seller/affiliate] ──> Thiết lập hoa hồng từng đầu sách (5% - 35%)
                                                      │
                                                      ▼
[2. KOC / Bạn Đọc: /account/affiliate] ──> Lấy link rút gọn thông minh: huki.vn/r/ABC12
                                                      │
                                                      ▼
[3. Người Mua Click: /r/[shortCode]] ──> Ghi nhận Cookie Attribution (30 ngày)
                                                      │
                                                      ▼
[4. Mua Hàng & Thanh Toán Thành Công] ──> Sau 7 ngày hết hạn đổi trả
                                                      │
                                                      ▼
[5. Quyết Toán: /admin/affiliates] ──> Tự động trích hoa hồng về Ví CTV & Cho phép Rút Tiền
```

---

## 🗺️ BẢN ĐỒ CHI TIẾT 9 MÀN HÌNH HỆ SINH THÁI AFFILIATE

### 1. Phân Hệ 1: CỔNG ĐĂNG KÝ & XÉT DUYỆT CỘNG TÁC VIÊN (3 Màn Hình)
- [x] **Màn hình 1.1: Landing Giới Thiệu Tiếp Thị HUKI Partner (`/affiliate`)**
  - Giới thiệu mô hình tiếp thị liên kết sách bản quyền: Biểu phí hoa hồng hấp dẫn (10% - 35%), hướng dẫn gắn link cho BookToker, YouTuber, Blogger sách.
  - Kiểm tra các nút CTA: "Đăng ký trở thành CTV ngay", "Xem chính sách hoa hồng", "Bảng xếp hạng thu nhập Top KOC".
- [x] **Màn hình 1.2: Hồ Sơ Đăng Ký Trở Thành Nhà Sáng Tạo Tiếp Thị (`/account/affiliate/register`)**
  - Form đăng ký 4 bước chuẩn hóa:
    1. Thông tin cá nhân & Số điện thoại định danh.
    2. Kênh truyền thông liên kết: Đường dẫn kênh TikTok, Kênh YouTube, Trang Facebook hoặc Blog review sách.
    3. Thông tin thụ hưởng hoa hồng: Tài khoản ngân hàng cá nhân, Mã số thuế TNCN (nếu có).
    4. Thỏa thuận điều khoản tiếp thị sách bản quyền $\rightarrow$ Gửi thẩm định.
  - Modal xác thực danh tính KYC (`AffiliateKycModal.tsx`): Kiểm tra tải ảnh CCCD 2 mặt đảm bảo danh tính minh bạch.
- [x] **Màn hình 1.3: Theo Dõi Tiến Độ Thẩm Định Hồ Sơ (`/account/affiliate/application`)**
  - Hiển thị tiến độ xét duyệt từ Ban Quản Trị sàn: `PENDING` (Đang thẩm định kênh), `APPROVED` (Đã cấp mã đối tác), `REJECTED` (Từ chối kèm lý do).
  - Cho phép người dùng chỉnh sửa và nộp lại hồ sơ bổ sung khi bị từ chối mà không cần tạo tài khoản mới.

---

### 2. Phân Hệ 2: BẢNG ĐIỀU HÀNH CTV & TRÌNH TẠO LINK RÚT GỌN (3 Màn Hình)
- [x] **Màn hình 2.1: Bảng Điều Khiển Doanh Số & Thu Nhập CTV (`/account/affiliate/dashboard`)**
  - 4 Thẻ chỉ số hiệu suất thời gian thực:
    - Tổng lượt click vào link tiếp thị (Clicks).
    - Số lượng đơn hàng phát sinh (Orders Created).
    - Tỷ lệ chuyển đổi đơn hàng (Conversion Rate %).
    - Tổng hoa hồng tích lũy & Hoa hồng khả dụng có thể rút.
  - Biểu đồ biến động lượt click và doanh số theo tuần/tháng.
  - Danh sách đơn hàng chuyển đổi gần nhất: Mã đơn, Thời gian mua, Tựa sách được mua, Hoa hồng nhận được.
- [x] **Màn hình 2.2: Trình Tạo & Quản Lý Link Rút Gọn Thông Minh (`/account/affiliate/links`)**
  - Công cụ sinh link tiếp thị: Dán bất kỳ đường dẫn sách nào trên sàn HUKI $\rightarrow$ Hệ thống tự động sinh link ngắn dạng `https://huki.vn/r/[shortCode]`.
  - Tùy biến tham số UTM: Cấu hình `utm_source` (TikTok, FB, Youtube) để theo dõi kênh nào đem lại nhiều đơn hàng nhất.
  - Bảng thống kê chi tiết từng link đã tạo: Tên chiến dịch, Số lượt click, Số đơn hàng thành công, Doanh thu hoa hồng theo từng link.
  - Nút Copy link nhanh và nút tải mã QR Code để in lên bookmark hoặc video review sách.
- [x] **Màn hình 2.3: Chợ Chiến Dịch Sách Hoa Hồng Cao (`/account/affiliate/marketplace`)**
  - Sàn giao dịch các đầu sách được Nhà Xuất Bản tài trợ mức hoa hồng đặc biệt (Flash Commission).
  - Bộ lọc theo: Thể loại sách, Tỷ lệ hoa hồng từ cao đến thấp (Top commission: 20%, 25%, 35%), Sách bán chạy nhất.
  - Thẻ sách tiếp thị tương tác (`BookAffiliateCard.tsx`): Hiển thị ảnh bìa, giá bán, số tiền hoa hồng thực nhận trên mỗi cuốn sách bán ra, nút "Lấy Link Tiếp Thị" 1-click.

---

### 3. Phân Hệ 3: CÔNG NGHỆ TRACKING ĐIỀU HƯỚNG & QUYẾT TOÁN 3 BÊN (3 Màn Hình / Engine)
- [x] **Màn hình 3.1: Động Cơ Điều Hướng & Ghi Nhận Cookie Attribution (`/r/[shortCode]`)**
  - Tiếp nhận truy cập từ người dùng click vào link ngắn.
  - Gọi API giải mã mã rút gọn (`affiliateApi.resolveShortCode`).
  - Ghi nhận Cookie theo dõi `huki_aff_click` với thời hạn lưu trữ 30 ngày (Last-Click Attribution Model) và lưu trữ dự phòng trên `localStorage`.
  - Phát sự kiện đồng bộ thời gian thực `AFFILIATE_CLICK_RECORDED` về Dashboard của CTV.
  - Tự động chuyển hướng (Redirect 302) mượt mà đến đúng trang chi tiết cuốn sách (`/book/[id]`).
- [x] **Màn hình 3.2: Kênh NXB Cấu Hình Hoa Hồng Bán Sách (`/seller/affiliate`)**
  - Phía Nhà Xuất Bản chủ động cấu hình chia sẻ doanh thu cho mạng lưới CTV:
    - Tab `DASHBOARD`: Doanh thu do mạng lưới CTV mang lại cho NXB.
    - Tab `BOOKS`: Cài đặt % hoa hồng riêng cho từng cuốn sách (ví dụ: Sách mới cần đẩy mạnh: 25%, Sách kinh điển: 10%).
    - Tab `SETTINGS`: Bật/tắt chế độ tự động nhận tiếp thị cho toàn bộ sách mới ra mắt.
- [x] **Màn hình 3.3: Ban Quản Trị Sàn Phê Duyệt & Quyết Toán Hoa Hồng (`/admin/affiliates`)**
  - Màn hình dành cho Admin sàn:
    - Danh sách duyệt đơn đăng ký CTV mới.
    - Giám sát gian lận (Fraud Detection): Phát hiện tự click link (Self-referral), đơn hàng ảo nhằm trục lợi hoa hồng.
    - Duyệt chi lệnh rút tiền hoa hồng của CTV về tài khoản ngân hàng định kỳ hàng tuần/tháng.

---

## 📊 TỔNG HỢP QUY MÔ KIỂM THỬ MOD-05
- **Tổng số Màn hình & Luồng nghiệp vụ:** **9 Màn hình toàn diện**
- **Quy trình 3 bên:** NXB cấu hình hoa hồng $\rightarrow$ KOC tạo link ngắn $\rightarrow$ Độc giả click mua sách $\rightarrow$ Cookie 30 ngày ghi nhận $\rightarrow$ Sàn HUKI quyết toán hoa hồng tự động.
