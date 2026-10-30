# QUY TRÌNH UI/UX & RESPONSIVE PHÂN HỆ KHÁCH VÃNG LAI (GUEST / PUBLIC)

> **Phân hệ:** Khách vãng lai chưa đăng nhập (Guest / Public User).  
> **Nguyên tắc cốt lõi:** Tốc độ tải trang nhanh, hiển thị sách rõ ràng, tối ưu tỷ lệ chuyển đổi, tuyệt đối không dùng banner sặc sỡ kiểu hoạt hình hay nút bấm khổng lồ.

---

## 1. Danh Sách URL Phân Hệ Guest

```
1. Trang chủ                      : /
2. Tìm kiếm & Danh mục sách       : /books
3. Chi tiết sách                  : /book/[id]
4. Đọc thử sách điện tử           : /book/[id]/preview
5. Danh sách nhà sách             : /stores
6. Trang gian hàng người bán      : /shop/[id]
7. Đăng nhập                      : /auth/login
8. Đăng ký tài khoản              : /auth/register
9. Quên & Khôi phục mật khẩu      : /auth/forgot-password, /auth/reset-password
10. Khuyến mãi & Flash Sale       : /flash-sale, /vouchers
11. Điều khoản & Chính sách       : /policy/[slug]
```

---

## 2. Đặc Tả Chi Tiết Từng URL & Quy Chuẩn Responsive

### 2.1. URL: `/` (Trang Chủ Nền Tảng)
* **Mục tiêu:** Giới thiệu bộ sưu tập sách nổi bật, chương trình flash sale sách thật có bản quyền, điều hướng mượt mà.
* **Lỗi AI cần loại bỏ:**
  - ❌ Bỏ banner hero cao 600px với hình vẽ 3D đồ chơi hoặc chữ chạy lòe loẹt.
  - ❌ Bỏ các huy hiệu hình sao lửa `🔥 HOT 🔥` to đùng chèn lên bìa sách.
  - ❌ Bỏ các thẻ thể loại to khổng lồ chiếm 3 hàng màn hình.
* **Quy chuẩn Responsive:**
  * **📱 Mobile (360px - 480px):**
    - Search Bar: Thu gọn thành icon kính lúp trên Top App Bar, hoặc thanh tìm kiếm compact `h-8 text-xs` bo tròn nhẹ.
    - Hero Carousel: Tỷ lệ vàng `16:9` hoặc `21:9`, chiều cao tối đa `180px`, vuốt chạm (swipeable).
    - Thể loại (Genres): Thanh trượt ngang (horizontal scroll) chứa các pill `h-7 px-3 text-xs bg-slate-100 dark:bg-zinc-800 rounded-full`.
    - Danh sách sách: Lưới 2 cột (`grid-cols-2 gap-2.5 p-2.5`). Thẻ sách gọn gàng: Bìa sách tỷ lệ `3:4`, tên sách `text-xs font-medium line-clamp-2`, giá tiền `text-[13px] font-bold text-rose-600`.
  * **💻 Tablet (768px - 1024px):**
    - Lưới sách 3 đến 4 cột (`grid-cols-3 md:grid-cols-4 gap-3.5`).
    - Bổ sung thanh lọc nhanh thể loại dạng dropdown hoặc tabbar.
  * **🖥️ Desktop (1280px - 1920px):**
    - Bố cục container `max-w-7xl mx-auto px-6`.
    - Lưới sách 5 đến 6 cột (`grid-cols-5 xl:grid-cols-6 gap-4`).
    - Hiệu ứng hover sách: Nâng nhẹ `translate-y-[-2px] shadow-sm`, không dùng viền phát sáng neon.

---

### 2.2. URL: `/books` (Danh Mục Tìm Kiếm & Lọc Sách)
* **Mục tiêu:** Tìm kiếm theo tác giả, nhà xuất bản, định dạng (Sách giấy / Ebook / Sách nói), khoảng giá và đánh giá.
* **Lỗi AI cần loại bỏ:**
  - ❌ Bỏ các thanh kéo khoảng giá (price slider) thô kệch với nút tròn to tướng.
  - ❌ Bỏ checkbox màu mè nhiều sắc thái cầu vồng.
* **Quy chuẩn Responsive:**
  * **📱 Mobile (360px - 480px):**
    - Bộ lọc hiển thị dạng **Bottom Sheet (Drawer)** kích hoạt bởi nút *"Bộ lọc (3)"* `h-8 px-3 text-xs bg-white border border-slate-200 rounded-lg flex items-center gap-1`.
    - Khi mở Drawer: Nền mờ `backdrop-blur-xs`, các mục lọc xếp dọc, nút bấm áp dụng ghim cố định ở đáy: `Áp dụng bộ lọc (24 sản phẩm)`.
    - Danh sách kết quả: Lưới 2 cột hoặc danh sách dọc compact (1 cột dạng list view: bìa bên trái 70px, thông tin bên phải).
  * **💻 Tablet (768px - 1024px):**
    - Sidebar lọc có thể thu gọn vào nút trượt bên trái, dành không gian hiển thị 3 cột sách.
  * **🖥️ Desktop (1280px - 1920px):**
    - Cấu trúc 2 cột: Sidebar cố định bên trái rộng `240px`, khu vực sách bên phải `flex-1`.
    - Mật độ thông tin: Sidebar dùng text `text-xs font-medium`, checkbox nhỏ `w-3.5 h-3.5 rounded border-slate-300 text-[#003B2B]`.
    - Thanh sắp xếp trên đỉnh: `Sắp xếp: Phổ biến nhất | Mới nhất | Bán chạy | Giá tăng/giảm` dạng nút segment tối giản.

---

### 2.3. URL: `/book/[id]` (Trang Chi Tiết Sách)
* **Mục tiêu:** Hiển thị thông tin xuất bản, trích dẫn, chọn phiên bản (Bìa mềm / Ebook DRM / Audiobook), đánh giá thực tế và kêu gọi mua hàng.
* **Lỗi AI cần loại bỏ:**
  - ❌ Nút "Thêm vào giỏ" và "Mua ngay" to đùng choáng hết nửa màn hình điện thoại.
  - ❌ Các huy hiệu bảo hành giả tạo như "Cam kết vũ trụ", "Đảm bảo 1000%".
  - ❌ Bảng thuộc tính sách dùng font chữ 16px to tướng.
* **Quy chuẩn Responsive:**
  * **📱 Mobile (360px - 480px):**
    - Ảnh bìa sách: Trình chiếu ảnh swipeable ở trên cùng, có chỉ báo trang `1/5`.
    - Bộ chọn định dạng (Format Toggle): Segmented control 3 nút nhỏ:
      `[ Bìa mềm - 120.000đ ] [ Ebook - 45.000đ ] [ Audio - 50.000đ ]`
    - Bảng thông số: 2 cột gọn gàng (`Nhà xuất bản`, `Năm phát hành`, `Số trang`, `Mã ISBN`) với chữ `text-[11px] text-slate-500` và giá trị `text-xs font-medium text-slate-800`.
    - **Sticky Action Bar ở đáy màn hình (Bottom Fixed Bar):**
      - Chiều cao `h-14 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 flex items-center gap-2 z-40`.
      - Trái: Nút Chat với Shop & Nút Yêu thích (icon compact `w-9 h-9 border border-slate-200 rounded-lg`).
      - Phải: Nút *"Thêm giỏ"* (`h-9 px-3.5 text-xs font-semibold border border-[#003B2B] text-[#003B2B] rounded-lg`) và nút *"Mua ngay"* (`h-9 px-4 text-xs font-semibold bg-[#003B2B] text-white rounded-lg flex-1`).
  * **💻 Tablet & 🖥️ Desktop:**
    - Cột trái (40%): Thư viện ảnh bìa sách chất lượng cao kèm nút *"Đọc thử 15 trang đầu"*.
    - Cột phải (60%): Tiêu đề sách (font có chân `text-xl font-bold font-serif`), tên tác giả, xếp hạng sao thực tế, box chọn định dạng và khối nút mua hàng chuẩn mực.
    - Phần đánh giá bên dưới: Phân chia đánh giá có xác thực mua hàng (`Verified Purchase`), hình ảnh thực tế của người đọc.

---

### 2.4. URL: `/book/[id]/preview` (Trình Đọc Thử Sách Mẫu)
* **Mục tiêu:** Cho phép khách đọc thử một số trang đầu (chế độ bảo vệ không cho sao chép) trước khi quyết định mua.
* **Quy chuẩn Responsive:**
  * Toàn màn hình (Distraction-Free Mode): Ẩn toàn bộ header và footer chính của website.
  * Chỉ giữ thanh điều khiển nổi phía trên: Nút quay lại, thanh chỉ số trang đọc thử (`Trang 3 / 15 (Bản đọc thử)`), nút *"Mua bản quyền đầy đủ"* nhỏ gọn ở góc phải.
  * Hỗ trợ chạm lật trang (swipe) trên Mobile và phím mũi tên `← / →` trên Desktop.

---

### 2.5. URL: `/stores` & `/shop/[id]` (Gian Hàng Người Bán)
* **Mục tiêu:** Hiển thị danh mục toàn bộ sách của một nhà sách/nhà xuất bản cụ thể, tỷ lệ phản hồi, đánh giá gian hàng.
* **Quy chuẩn Responsive:**
  * Header gian hàng: Banner chiều cao vừa phải (`h-24 sm:h-32`), avatar tròn 56px, tên shop `text-sm font-bold`, nhãn xác thực `Chính hãng` hoặc `Đối tác ủy quyền` (màu xanh navy nhã nhặn, không dùng hoa văn rườm rà).
  * Thống kê shop dạng inline: `4.9 ★ (1.2k đánh giá) · Tỷ lệ phản hồi 98% · 240 đầu sách`.
  * Thanh tab nội dung: `[ Tất cả sách ] [ Sách bán chạy ] [ Ebook số ] [ Hồ sơ nhà sách ]`.

---

### 2.6. URL: `/auth/login` & `/auth/register` (Đăng Nhập / Đăng Ký)
* **Mục tiêu:** Đăng nhập an toàn, hỗ trợ Google OAuth, Email/Mật khẩu hoặc OTP.
* **Lỗi AI cần loại bỏ:**
  - ❌ Card đăng nhập chiếm trọn màn hình với hình nền phi hành gia/vũ trụ không liên quan đến sách.
  - ❌ Các ô input cao tới 56px với viền phát sáng chói mắt.
* **Quy chuẩn Responsive:**
  * Card form nhỏ gọn căn giữa: Chiều rộng tối đa `max-w-[380px] w-full p-6 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200/80 dark:border-zinc-800 shadow-sm`.
  * Input fields: `h-9 px-3 text-xs rounded-lg border border-slate-200 focus:border-[#003B2B] focus:ring-1 focus:ring-[#003B2B]`.
  * Nút đăng nhập: `h-9 w-full bg-[#003B2B] hover:bg-[#00271E] text-white text-xs font-semibold rounded-lg transition-colors`.
  * Nút Google: `h-9 w-full border border-slate-200 text-xs font-medium text-slate-700 rounded-lg flex items-center justify-center gap-2 hover:bg-slate-50`.

