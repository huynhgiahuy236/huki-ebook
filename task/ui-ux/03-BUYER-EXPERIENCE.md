# QUY TRÌNH UI/UX & RESPONSIVE PHÂN HỆ NGƯỜI MUA (BUYER / USER)

> **Phân hệ:** Khách hàng đã đăng nhập (Buyer / End-User).  
> **Nguyên tắc cốt lõi:** Luồng thanh toán nhanh gọn và minh bạch, quản lý đơn hàng chuẩn xác, giao diện đọc sách số (Ebook WebReader) tập trung cao độ, không quảng cáo hay yếu tố gây xao nhãng.

---

## 1. Danh Sách URL Phân Hệ Buyer

```
1. Giỏ hàng                       : /cart
2. Đặt hàng & Thanh toán          : /checkout
3. Xác nhận đơn & Trạng thái thanh toán : /checkout/payment/[orderId], /order/success
4. Danh sách đơn mua              : /orders
5. Chi tiết đơn hàng              : /orders/[id]
6. Hóa đơn điện tử                : /orders/[id]/invoice
7. Đánh giá sản phẩm đã mua       : /orders/[id]/review
8. Yêu cầu trả hàng & hoàn tiền   : /orders/[id]/return
9. Tủ sách số cá nhân             : /library, /library/[id]
10. Trình đọc sách số DRM WebReader: /reader
11. Trình nghe sách nói Audiobook : /audiobooks
12. Hồ sơ & Địa chỉ giao hàng     : /profile, /profile/addresses
13. Ví HuKi & Lịch sử giao dịch   : /profile/wallet
14. Bảo mật tài khoản             : /profile/security
15. Cổng tiếp thị liên kết        : /account/affiliate/*
```

---

## 2. Đặc Tả Chi Tiết Từng URL & Quy Chuẩn Responsive

### 2.1. URL: `/cart` (Giỏ Hàng)
* **Mục tiêu:** Gom nhóm sản phẩm theo từng Shop người bán, điều chỉnh số lượng, áp mã giảm giá Shop và mã sàn, tính tổng tiền.
* **Lỗi AI cần loại bỏ:**
  - ❌ Nút tăng/giảm số lượng `+` `-` to tướng chiếm hết nửa ô sản phẩm.
  - ❌ Các hộp quà tặng hoạt hình nhảy múa (lottie animation) lòe loẹt.
* **Quy chuẩn Responsive:**
  * **📱 Mobile (360px - 480px):**
    - Sản phẩm nhóm theo Shop: Mỗi shop là một card riêng biệt (`bg-white rounded-xl border border-slate-200/80 p-3 mb-2.5`).
    - Bố cục mỗi dòng sản phẩm:
      - Checkbox chọn hàng: `w-4 h-4 rounded text-[#003B2B]`
      - Bìa sách: `w-14 h-19 rounded object-cover border border-slate-100 shrink-0`
      - Nội dung: Tên sách `text-xs font-medium line-clamp-1`, phân loại `text-[11px] text-slate-500` (Bìa mềm / Ebook), giá bán `text-xs font-bold text-rose-600`.
      - Bộ chỉnh số lượng: Nút `-` và `+` nhỏ gọn `w-6 h-6 bg-slate-100 rounded flex items-center justify-center text-xs`, ô số `w-8 text-center text-xs`.
      - Nút xóa: Icon thùng rác nhỏ `w-6 h-6 text-slate-400 hover:text-rose-500`.
    - **Thanh tổng tiền cố định đáy màn hình (Sticky Bottom Bar):**
      - Chiều cao `h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 flex items-center justify-between z-30`.
      - Checkbox *"Chọn tất cả"* bên trái.
      - Phải: Tổng tiền `text-sm font-bold text-[#ac2c19]` kèm nút *"Mua hàng (3)"* (`h-9 px-4 bg-[#003B2B] text-white text-xs font-semibold rounded-lg`).
  * **💻 Tablet & 🖥️ Desktop:**
    - Cột trái (70%): Bảng danh sách giỏ hàng phân chia theo Shop.
    - Cột phải (30% - Sticky Sidebar): Card tóm tắt đơn hàng (`Tạm tính`, `Giảm giá Voucher`, `Ước tính phí vận chuyển`, `Tổng thanh toán`), ô nhập mã giảm giá và nút tiến hành thanh toán.

---

### 2.2. URL: `/checkout` (Thanh Toán & Ký Quỹ Escrow)
* **Mục tiêu:** Chọn địa chỉ giao hàng, phương thức thanh toán (COD, VNPay, Ví HuKi), xác thực cơ chế bảo vệ tiền Escrow, chốt đơn hàng.
* **Lỗi AI cần loại bỏ:**
  - ❌ Các huy hiệu bảo mật hình khiên màu vàng/tím lòe loẹt "Bảo hiểm 100% tỷ đô".
  - ❌ Form nhập địa chỉ trải dài 10 trường nhập liệu không cần thiết.
* **Quy chuẩn Responsive:**
  * **Hộp Địa Chỉ Nhận Hàng:** Card gọn gàng có icon vị trí `location_on`, tên người nhận và SĐT in đậm `text-xs font-semibold`, địa chỉ chi tiết `text-xs text-slate-600`, nút *"Thay đổi"* nhỏ gọn ở góc phải.
  * **Thông báo Ký quỹ Escrow (HuKi Guarantee Notice):**
    - Hộp thông báo màu xanh nhạt tối giản (`bg-emerald-50/60 border border-emerald-200/60 rounded-lg p-2.5 flex items-center gap-2 text-xs text-emerald-900`).
    - Nội dung: *"Khoản thanh toán của bạn được giữ an toàn bởi HuKi Escrow. Tiền chỉ chuyển cho người bán sau khi bạn bấm xác nhận đã nhận hàng hợp lệ."* (Không dùng icon to, không chớp nháy).
  * **Phương thức thanh toán:** Radio button danh sách dọc gọn gàng kèm logo thanh toán chuẩn kích thước `h-5 w-auto`:
    - `[•] Thanh toán khi nhận hàng (COD)`
    - `[ ] Cổng thanh toán VNPAY (ATM / Visa / QR Pay)`
    - `[ ] Số dư Ví HuKi (Khả dụng: 450.000đ)`
  * **Mobile:** Nút *"Đặt hàng"* ghim đáy màn hình hiển thị tổng số tiền cuối cùng.

---

### 2.3. URL: `/orders` & `/orders/[id]` (Quản Lý & Chi Tiết Đơn Mua)
* **Mục tiêu:** Theo dõi trạng thái đơn hàng theo thời gian thực (Realtime Timeline), xem chi tiết bưu tá vận chuyển, xác nhận nhận hàng hoặc yêu cầu trả hàng.
* **Lỗi AI cần loại bỏ:**
  - ❌ Các hình minh họa hoạt hình bưu tá lái xe to chiếm 400px màn hình.
  - ❌ Nhãn trạng thái nhấp nháy nhiều màu.
* **Quy chuẩn Responsive:**
  * **Thanh Tab Trạng Thái (Order Tabs):**
    - Trượt ngang trên Mobile: `[ Tất cả ] [ Chờ xác nhận ] [ Đang đóng gói ] [ Đang giao ] [ Hoàn tất ] [ Trả hàng/Hủy ]`.
    - Tab đang chọn: Gạch chân mảnh màu xanh ngọc `#003B2B font-semibold text-xs`.
  * **Thẻ Đơn Hàng (Order Item Card):**
    - Header thẻ: Tên Shop bên trái kèm link gian hàng; Trạng thái đơn bên phải dạng chip đơn sắc (`bg-blue-50 text-blue-700 text-[11px] font-medium px-2 py-0.5 rounded`).
    - Thân thẻ: Danh sách sách rút gọn. Nếu trên 2 cuốn thì hiển thị cuốn đầu + dòng *"và 2 sản phẩm khác"*.
    - Footer thẻ: Tổng tiền đơn hàng và hàng nút hành động nhỏ gọn:
      - Nút *"Xem chi tiết"* (`h-7.5 px-3 border border-slate-200 text-xs rounded-md`).
      - Nút *"Đã nhận hàng"* (`h-7.5 px-3 bg-[#003B2B] text-white text-xs font-medium rounded-md`).
      - Nút *"Trả hàng/Hoàn tiền"* (chỉ hiện khi đang giao hoặc vừa giao xong).
  * **Trang Chi Tiết Đơn (`/orders/[id]`):**
    - **Timeline Vận Chuyển:** Dòng thời gian dọc với các mốc: `Đơn đã đặt` -> `Người bán chuẩn bị hàng` -> `Đã bàn giao bưu tá` -> `Đang giao hàng` -> `Giao thành công`.
    - Thông tin bưu tá: Tên shipper, biển số xe, SĐT kèm nút gọi nhanh (`tel:...`).

---

### 2.4. URL: `/orders/[id]/review` (Đánh Giá Sản Phẩm)
* **Mục tiêu:** Người mua đã nhận hàng đánh giá chất lượng sách và dịch vụ giao hàng.
* **Quy chuẩn:**
  - Bộ chọn 5 sao màu vàng ấm (`#f59e0b`), không dùng hiệu ứng nổ hạt sao màu mè.
  - Khung nhập nhận xét: `min-h-[90px] text-xs p-2.5 rounded-lg border border-slate-200`.
  - Nút thêm ảnh/video chụp sách thật: Icon máy ảnh nhỏ gọn `w-14 h-14 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-[10px] text-slate-400`.

---

### 2.5. URL: `/orders/[id]/return` (Yêu Cầu Hoàn Tiền & Trả Hàng RMA)
* **Mục tiêu:** Khiếu nại khi sách bị rách, giao sai sách, thiếu quà tặng kèm.
* **Quy chuẩn:**
  - Chọn lý do qua dropdown chuẩn (Không dùng radio button to tướng).
  - Tải lên tối thiểu 1 ảnh chụp rõ tình trạng kiện hàng và nhãn bưu tá dán ngoài hộp.
  - Chọn hình thức hoàn tiền: Hoàn về Ví HuKi (ngay lập tức) hoặc Chuyển khoản ngân hàng (1-2 ngày làm việc).

---

### 2.6. URL: `/library` (Tủ Sách Số Bản Quyền)
* **Mục tiêu:** Quản lý kho Ebook và Audiobook cá nhân đã mua, phân chia theo danh mục, tiếp tục đọc dở.
* **Quy chuẩn Responsive:**
  * Lưới sách số: 3 cột trên Mobile (`grid-cols-3 gap-2`), 5 cột trên Tablet, 7 cột trên Desktop.
  * Mỗi cuốn sách hiển thị:
    - Bìa sách có nhãn nhỏ góc trên: `EBOOK` hoặc `AUDIO`.
    - Thanh tiến độ đọc dở ở đáy bìa (progress bar mảnh 3px màu xanh ngọc: ví dụ `64%`).
    - Nút bấm trực tiếp vào sách để mở WebReader ngay lập tức.

---

### 2.7. URL: `/reader` (Trình Đọc Ebook DRM WebReader)
* **Mục tiêu:** Trải nghiệm đọc sách điện tử cao cấp, tuyệt đối chống sao chép và chống lộ lọt bản quyền, không gây mỏi mắt.
* **Lỗi AI cần loại bỏ:**
  - ❌ Thanh công cụ đọc sách to đùng chắn mất 30% diện tích trang sách.
  - ❌ Các nút lật trang hoạt hình màu mè.
* **Quy chuẩn UX Đọc Sách Chuyên Nghiệp:**
  * **Chế độ đọc toàn màn hình (Zen/Distraction-Free Mode):** Tự động ẩn thanh công cụ sau 3 giây không chạm màn hình. Chạm nhẹ vào giữa trang để gọi lại Menu điều khiển.
  * **Bộ Điều Khiển Đọc (Reader Toolbar):**
    - Ghim nhẹ nhàng ở đỉnh và đáy với nền bán trong suốt `bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm border-slate-200 dark:border-zinc-800`.
    - Bộ chọn cỡ chữ: `A-` và `A+` (phạm vi từ 12px đến 28px).
    - Bộ chọn font: Font Serif (`Merriweather`, `Times`) và Font Sans (`Inter`, `Roboto`).
    - Bộ 3 chủ đề màu nền (Themes):
      - `Sáng` (Nền trắng ngà `#ffffff`, chữ xám đen `#1a202c`)
      - `Sepia` (Nền màu giấy cũ dịu mắt `#fbf0d9`, chữ nâu sẫm `#433422`)
      - `Đêm` (Nền đen than `#121212`, chữ xám sáng `#e2e8f0`)
  * **Chỉ Báo Tiến Độ (Progress Bar):**
    - Thanh trượt mỏng 2px ở sát đáy màn hình.
    - Hiển thị số trang: `Trang 84 / 320 (26%) · Còn khoảng 1 giờ 15 phút đọc`.
  * **Bảo Vệ Bản Quyền (Forensic Watermark):**
    - Watermark mờ hiển thị ID tài khoản người dùng (`User #4892 · HuKi DRM`) nổi ngẫu nhiên với độ trong suốt `opacity-[0.04]` không gây cản trở việc đọc nhưng bảo đảm khả năng truy vết vi phạm tác quyền.

---

### 2.8. URL: `/profile/wallet` (Ví Điện Tử HuKi & Ký Quỹ)
* **Mục tiêu:** Quản lý số dư tiền hoàn, tiền nạp, tiền tiếp thị liên kết và rút tiền về tài khoản ngân hàng.
* **Quy chuẩn:**
  - Card số dư chính: Thiết kế phẳng tối giản, nền xanh lục bảo sẫm `#003B2B`, chữ màu trắng:
    - Số dư khả dụng: `1.250.000 đ`
    - Tiền đang tạm giữ (Escrow / Chờ duyệt hoàn tiền): `350.000 đ`
    - Nút *"Nạp tiền"* và *"Rút tiền"* nhỏ gọn màu trắng/viền bán trong suốt.
  - Bảng lịch sử biến động số dư: Danh sách compact với icon mũi tên xanh (tiền vào `+`) và đỏ (tiền ra `-`), ngày giờ rõ ràng.

