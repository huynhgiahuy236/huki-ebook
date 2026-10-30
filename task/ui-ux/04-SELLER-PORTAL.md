# QUY TRÌNH UI/UX & RESPONSIVE KÊNH NGƯỜI BÁN (SELLER PORTAL)

> **Phân hệ:** Kênh Dành Cho Nhà Sách, Tác Giả & Nhà Xuất Bản (Seller Portal).  
> **Nguyên tắc cốt lõi:** Mật độ thông tin cao (High Density), tối ưu hóa tốc độ đóng gói và xử lý hàng nghìn đơn/ngày, quản trị kho và doanh thu minh bạch, không dùng các bảng biểu màu mè hay card to cồng kềnh.

---

## 1. Danh Sách URL Phân Hệ Seller

```
1. Dashboard Tổng Quan              : /seller/dashboard
2. Quản lý danh sách sản phẩm       : /seller/products
3. Thêm mới sách giấy               : /seller/product/create-physical
4. Thêm mới sách điện tử (Ebook)    : /seller/product/create-ebook
5. Thêm gói sách lai (Hybrid Pack)  : /seller/product/create-hybrid
6. Chỉnh sửa sản phẩm               : /seller/products/[id]/edit
7. Quản lý tồn kho & Cảnh báo SKU   : /seller/inventory
8. Danh sách đơn hàng cần xử lý     : /seller/orders
9. Chi tiết đơn & In phiếu gửi hàng : /seller/orders/[id]
10. Quản lý khiếu nại & Trả hàng    : /seller/returns, /seller/returns/[id]
11. Chương trình khuyến mãi & Mã giảm giá : /seller/promotions, /seller/vouchers
12. Ví doanh thu & Quyết toán Escrow : /seller/wallet, /seller/finance
13. Đánh giá từ khách hàng          : /seller/reviews
14. Tin nhắn & Chăm sóc khách hàng  : /seller/chat
15. Cấu hình gian hàng & Nhân viên  : /seller/profile, /seller/staff, /seller/stores
```

---

## 2. Đặc Tả Chi Tiết Từng URL & Quy Chuẩn Responsive

### 2.1. URL: `/seller/dashboard` (Bảng Điều Khiển Tổng Quan)
* **Mục tiêu:** Nắm bắt tức thì 4 chỉ số sống còn: Đơn hàng mới cần đóng gói, Doanh thu hôm nay, Số lượng sách sắp hết hàng, Tỷ lệ giao thành công.
* **Lỗi AI cần loại bỏ:**
  - ❌ Các card số liệu khổng lồ cao 200px với hình vẽ vector 3D robot hay tên lửa.
  - ❌ Các biểu đồ hình tròn/cột màu mè lòe loẹt làm chậm máy.
* **Quy chuẩn Responsive:**
  * **Lưới Thẻ Chỉ Số Nhanh (Metric Cards):**
    - 4 thẻ xếp ngang trên Desktop (`grid-cols-4 gap-3.5`), 2 cột trên Tablet/Mobile (`grid-cols-2 gap-2.5`).
    - Kích thước compact: Chiều cao chỉ `80px - 90px`, padding `p-3.5`.
    - Cấu trúc thẻ:
      - Nhãn chỉ số: `text-[11px] font-medium text-slate-500` (ví dụ: `Đơn chờ chuẩn bị`)
      - Giá trị chính: `text-xl sm:text-2xl font-bold text-slate-900 dark:text-white`
      - Biến động so với hôm qua: Chữ nhỏ `text-[10px] font-semibold text-emerald-600 flex items-center` (`+12.5%`)
  * **Bảng Việc Cần Làm Ngay (Action Items Table):**
    - Đơn chờ xác nhận: `[ 12 ] đơn` kèm nút *"Xử lý ngay"*
    - Đơn shipper đang chờ lấy: `[ 5 ] đơn`
    - Khiếu nại RMA cần phản hồi trong 24h: `[ 1 ] đơn` (nền cam nhạt `bg-amber-50 text-amber-800 text-xs px-2 py-1 rounded`)
  * **Biểu Đồ Doanh Thu:**
    - Biểu đồ đường mỏng (Line Chart) 1px màu xanh ngọc `#00875A`, vùng diện tích dưới dốc màu nhạt mờ, trục tọa độ mảnh không gây rối mắt.

---

### 2.2. URL: `/seller/orders` & `/seller/orders/[id]` (Quy Trình Xử Lý Đơn Hàng)
* **Mục tiêu:** Luồng hoàn tất đơn hàng tốc độ cao: `Xác nhận` -> `In nhãn đóng gói (Airway Bill)` -> `Bàn giao shipper`.
* **Lỗi AI cần loại bỏ:**
  - ❌ Mỗi đơn hàng hiển thị như một card to đùng chiếm cả trang, khiến xem 10 đơn phải cuộn 10 màn hình.
  - ❌ Nút thao tác to 50px cho mỗi trạng thái.
* **Quy chuẩn Responsive:**
  * **📱 Mobile (360px - 480px):**
    - Danh sách đơn dạng thẻ compact (`p-3 border-b border-slate-100`): Mã đơn `#ORD-8921` (font mono), tên người mua, tổng tiền, trạng thái.
    - Nút bấm gom vào menu `...` hoặc nút tắt nhanh *"Xác nhận nhanh"*.
  * **💻 Tablet & 🖥️ Desktop:**
    - **Bảng dữ liệu mật độ cao (Data Table):**
      - Header: Checkbox chọn nhiều đơn (bulk action) `w-4 h-4`, `Mã đơn`, `Sản phẩm`, `Người nhận`, `Đơn vị vận chuyển`, `Tổng tiền`, `Trạng thái`, `Thao tác`.
      - Hàng dữ liệu: Chiều cao `py-2.5 px-3`, chữ `text-xs`.
      - **Thanh Hành Động Hàng Loạt (Bulk Action Bar):** Khi tick chọn từ 2 đơn trở lên, thanh nổi xuất hiện ở đáy:
        `Đã chọn 8 đơn hàng -> [ Xác nhận hàng loạt ] [ In 8 phiếu gửi hàng ] [ Bàn giao shipper ]`.
  * **Trang In Phiếu Giao Hàng (`/seller/orders/[id]/print`):**
    - Định dạng chuẩn khổ A6 (`100mm x 150mm`) hoặc A5 phù hợp máy in nhiệt (thermal printer).
    - Có mã vạch Barcode (Code128) và mã QR để bưu tá bắn máy quét trong 0.5 giây.

---

### 2.3. URL: `/seller/products` & Thêm Sách Mới
* **Mục tiêu:** Quản lý kho đầu sách đa định dạng: Sách giấy truyền thống, Ebook DRM mã hóa bản quyền, Gói lai Hybrid (Giấy + Ebook).
* **Quy chuẩn UX:**
  * **Bảng Danh Sách Sách (`/seller/products`):**
    - Cột Bìa: Ảnh thumbnail `w-9 h-12 rounded object-cover`.
    - Cột Định dạng: Chip nhỏ `[ Sách giấy ]` (xanh dương), `[ Ebook DRM ]` (tím), `[ Hybrid ]` (xanh ngọc).
    - Sửa nhanh tồn kho & giá bán trực tiếp trên bảng (Inline Edit): Bấm đúp vào ô số lượng để gõ số mới và bấm Enter lưu ngay mà không cần mở trang sửa chi tiết.
  * **Form Thêm Sách Mới (`/seller/product/create-*`):**
    - Chia làm 3 bước rõ ràng (Step Wizard dạng thanh ngang mảnh): `1. Thông tin cơ bản` -> `2. Giá bán & Kho hàng` -> `3. Tệp tin số & Bản quyền`.
    - Khu vực kéo thả tệp Ebook (EPUB / PDF): Khung viền nét đứt mảnh `border border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50`, hỗ trợ kiểm tra tính hợp lệ của tệp tức thì (file integrity check).

---

### 2.4. URL: `/seller/returns` & `/seller/returns/[id]` (Xử Lý Tranh Chấp RMA)
* **Mục tiêu:** Tiếp nhận yêu cầu trả hàng từ người mua, kiểm tra hình ảnh chứng cứ, chấp thuận hoàn tiền hoặc gửi khiếu nại lên Admin nếu người mua gian lận.
* **Quy chuẩn Responsive:**
  * Chia đôi màn hình trên Desktop (Split View):
    - Cột trái (50%): Bằng chứng của khách hàng (Lý do trả hàng, ảnh chụp sách rách/lỗi mở hộp, video bóc hàng).
    - Cột phải (50%): Thông tin đơn hàng gốc + 2 nút quyết định dứt khoát:
      - Nút xanh: `[ Chấp thuận hoàn tiền ]` (tiền ký quỹ Escrow được trả về cho người mua).
      - Nút cam viền: `[ Khiếu nại lên HuKi Admin ]` (mở ô nhập lý do từ chối kèm ảnh bằng chứng đóng gói ban đầu của shop).

---

### 2.5. URL: `/seller/wallet` & `/seller/finance` (Ví Doanh Thu & Escrow)
* **Mục tiêu:** Minh bạch dòng tiền, kiểm soát số tiền đang ký quỹ (Escrow Hold) và số tiền đã được giải phóng có thể rút về ngân hàng.
* **Quy chuẩn:**
  - Bảng tổng hợp dòng tiền dạng thẻ 3 cột:
    - `Doanh thu khả dụng có thể rút`: `45.200.000 đ`
    - `Doanh thu đang chờ hoàn tất giao (Escrow Hold)`: `8.500.000 đ` (sẽ giải phóng sau khi khách nhận hàng hoặc sau 72h tự động)
    - `Phí nền tảng & hoa hồng đã khấu trừ`: `2.100.000 đ`
  - Bảng sao kê giao dịch chi tiết: Lọc theo khoảng ngày, xuất file Excel (`.xlsx`) phục vụ kế toán.

