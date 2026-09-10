# HUKI SHARED COMPONENT SYSTEM — PLATE I

## Headers & Application Shell

Hãy tạo **một ảnh component showcase khổ dọc dài duy nhất** cho toàn bộ nhóm Header, điều hướng cấp cao và Application Shell của HUKI EBOOK.

Đây không phải một màn hình ứng dụng hoàn chỉnh và không phải thiết kế lại giao diện HUKI. Hãy căn cứ trực tiếp vào toàn bộ layout, màu sắc, typography, icon, border, radius, spacing, shadow và phong cách trình bày mà bạn đã thiết kế trước đó cho HUKI. Giữ nguyên ngôn ngữ thị giác hiện tại, chỉ chuẩn hóa lại nội dung và cấu trúc component theo yêu cầu dưới đây.

Ảnh phải mang hình thức một **design-system reference board** giống các component showcase trước: có header giới thiệu ở đầu ảnh, chia thành nhiều section rõ ràng theo chữ cái, mỗi section chứa nhiều component hoặc variant đặt trong card riêng, có tên component và chú thích ngắn. Bố cục phải sạch, dễ quét, đủ khoảng thở và không cắt mất component.

Toàn bộ nội dung UI sử dụng **tiếng Việt tự nhiên**, không dùng Lorem Ipsum. Chỉ trình bày giao diện desktop; không thiết kế hoặc minh họa phiên bản mobile. Không dựng thành mockup laptop hay điện thoại.

---

## Phần đầu ảnh

Hiển thị:

- Nhãn nhỏ: `HUKI EBOOK — SHARED COMPONENT SYSTEM`
- Tiêu đề lớn: `I. HEADER & KHUNG ỨNG DỤNG`
- Tiêu đề tiếng Anh nhỏ: `Headers & Application Shell`
- Mô tả ngắn: `Hệ thống Header và khung trang nhất quán cho Marketplace, Tài khoản, Seller Center và Admin.`
- Nhãn phiên bản nhỏ: `Desktop-first · Shared UI · Component Reference`

Không sử dụng số `19.x` vì đây là bộ shared component độc lập.

---

## SECTION A — Public Header

Trình bày một Public Header hoàn chỉnh và một vài trạng thái nhỏ liên quan.

### Nội dung Header chính

- Logo `HUKI EBOOK` ở bên trái.
- Navigation ngắn gọn gồm:
  - `Trang chủ`
  - `Sách`
  - `Danh mục`
  - `Cửa hàng`
  - `Diễn đàn`
- Thanh tìm kiếm với placeholder: `Tìm sách, tác giả, nhà xuất bản...`
- Khu vực hành động bên phải:
  - Giỏ hàng, badge `3`
  - Tin nhắn, badge `2`
  - Thông báo, badge `5`
  - Avatar người dùng

Tin nhắn và Thông báo là hai chức năng độc lập, phải dùng hai icon khác nhau và có tooltip/label dễ hiểu. Header chỉ giữ các hành động thường xuyên; không đưa quá nhiều chữ hoặc liên kết phụ lên Header.

### Variant cần minh họa

1. `Guest` — thay avatar bằng `Đăng nhập` và nút `Đăng ký`.
2. `Logged in` — có Giỏ hàng, Tin nhắn, Thông báo và Avatar.
3. `Search focused` — thanh tìm kiếm đang focus, có gợi ý ngắn:
   - `Nhà giả kim`
   - `Nguyễn Nhật Ánh`
   - `NXB Trẻ`

Không hiển thị VIP, trạng thái đồng bộ đám mây, tải ứng dụng, đổi giao diện, chính sách, trợ giúp hoặc nút Đăng bài trong Public Header mặc định.

---

## SECTION B — User Avatar Menu & Quick Actions

Trình bày dropdown mở từ Avatar, kích thước vừa phải.

### Phần định danh

- Avatar
- Tên: `Minh Trí`
- Email: `minhtri@huki.vn`

### Menu

- `Hồ sơ cá nhân`
- `Đơn hàng của tôi`
- `Địa chỉ của tôi`
- `Tin nhắn` — badge `2`
- `Thông báo` — badge `5`
- Divider
- `Seller Center`
- `Cài đặt`
- `Đăng xuất`

Minh họa thêm ba quick-action icon riêng có label:

- `Giỏ hàng`
- `Tin nhắn`
- `Thông báo`

Thể hiện trạng thái mặc định, hover và có badge; không làm section quá lớn.

---

## SECTION C — Seller Header

Trình bày Seller Header dùng trong Seller Center.

### Nội dung

- Nút thu gọn/mở Sidebar.
- Breadcrumb: `Seller Center / Sản phẩm / Thêm sản phẩm`
- Store Selector:
  - Logo cửa hàng nhỏ
  - `Nhà sách Minh Trí`
  - Status `Đang hoạt động`
  - Chevron dropdown
- Trạng thái autosave: `Đã lưu lúc 10:42`
- Nút phụ: `Xem cửa hàng`
- Tin nhắn, badge `2`
- Thông báo, badge `3`
- Avatar seller

Tạo thêm hai autosave state nhỏ:

- `Đang lưu...`
- `Có thay đổi chưa lưu`

Header phải gọn, chuyên nghiệp và ưu tiên breadcrumb, cửa hàng đang chọn cùng các hành động nhanh. Không đưa toàn bộ menu quản lý lên Header.

---

## SECTION D — Admin Header

Trình bày phần Header dành cho khu vực quản trị.

- Nút Sidebar.
- Breadcrumb: `Admin / Phê duyệt / Doanh nghiệp`
- Tiêu đề ngắn: `Phê duyệt doanh nghiệp`
- Alert hệ thống nhỏ nếu cần.
- Thông báo.
- Avatar quản trị viên.

Không đặt search bar toàn hệ thống nếu làm Header bị chật.

---

## SECTION E — Breadcrumb, Page Header & Tabs

Trình bày các component điều hướng phụ dưới dạng component cards riêng.

### Breadcrumb variants

1. `Trang chủ / Sách / Văn học / Nhà giả kim`
2. `Seller Center / Sản phẩm / Thêm sản phẩm`
3. `Tài khoản / Đơn hàng / #HUKI-240817`

### Page Header

Ví dụ Seller Products:

- Breadcrumb: `Seller Center / Sản phẩm`
- Tiêu đề: `Sản phẩm`
- Mô tả: `Quản lý sách vật lý và Ebook trong cửa hàng của bạn.`
- Nút phụ: `Nhập danh sách`
- Nút chính: `Thêm sản phẩm`

### Tabs

- `Tất cả 48`
- `Đang bán 25`
- `Bản nháp 8`
- `Chờ duyệt 4`
- `Bị từ chối 3`
- `Đã ẩn 8`

Thể hiện trạng thái default, hover và active. Số lượng dùng badge nhỏ, không làm tab quá nặng.

---

## SECTION F — Application Shell Overview

Kết thúc ảnh bằng bốn sơ đồ shell thu nhỏ, giúp xác định component nào đi cùng nhau.

1. `Public Marketplace`
   - Public Header
   - Main Content
   - Footer

2. `Buyer Account`
   - Public Header
   - Sidebar Region
   - Account Content

3. `Seller Center`
   - Sidebar Region
   - Seller Header
   - Seller Content

4. `Admin Operations`
   - Sidebar Region
   - Admin Header
   - Admin Content

Chỉ dùng wireframe có màu và nhãn component, không cần nội dung trang chi tiết.

---

## Footer của component board

Hiển thị nhỏ gọn:

- `HUKI EBOOK`
- `Shared Headers & Application Shells`
- `Public · Buyer · Seller · Admin`
- Dòng ghi chú: `Một hệ thống nhất quán, nội dung thay đổi theo vai trò và khu vực sử dụng.`

---

## Yêu cầu bắt buộc

- Chỉ xuất **một ảnh dọc dài duy nhất** cho Plate I.
- Tất cả section A–F phải nằm trong cùng ảnh.
- Đây là component showcase, không phải một dashboard duy nhất.
- Kế thừa nguyên phong cách UI HUKI đã làm trước đó.
- Giữ Header gọn; thông tin ít dùng đưa vào Sidebar hoặc Avatar Menu.
- Bắt buộc có `Tin nhắn` bên cạnh `Thông báo` ở những Header dành cho người dùng đã đăng nhập.
- Không thiết kế chi tiết Sidebar trong Plate I; toàn bộ Sidebar được tách sang một Plate độc lập.
- Dùng icon cùng một hệ, nét rõ ràng, có label hoặc tooltip khi cần.
- Badge số lượng phải nhỏ, dễ đọc và không lấn át nội dung.
- Active, hover, focus, collapsed và unread state phải nhất quán.
- Nội dung phải đúng chính tả tiếng Việt và không dùng Lorem Ipsum.
- Không tự thêm module mới ngoài nội dung được yêu cầu.
- Không thêm VIP, Cloud Sync, reading challenge hoặc chức năng chưa thuộc phạm vi hiện tại.
- Không tạo mobile header, mobile drawer, bottom navigation hoặc mockup điện thoại.
- Không lặp lại cùng một component quá nhiều lần chỉ để lấp đầy ảnh.
- Bảo đảm chữ đủ lớn để đọc được khi xem toàn bộ ảnh dọc.
