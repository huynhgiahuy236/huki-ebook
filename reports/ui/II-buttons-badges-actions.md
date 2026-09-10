# HUKI SHARED COMPONENT SYSTEM — PLATE II

## Buttons, Badges & Actions

Hãy tạo **một ảnh component showcase khổ dọc dài duy nhất** cho toàn bộ nhóm Buttons, Badges & Actions của HUKI EBOOK.

Đây là phần tiếp nối trực tiếp của `PLATE I — Navigation & Application Shell`. Hãy căn cứ vào toàn bộ giao diện HUKI đã thiết kế trước đó và giữ nguyên design language hiện tại: màu sắc, typography, icon style, border, radius, spacing, shadow, mật độ nội dung và cách chia section. Không thiết kế lại thương hiệu và không chuyển sang phong cách UI mới.

Mục tiêu của ảnh là tạo một bảng tham chiếu thống nhất cho các nút, badge, menu hành động và trạng thái tương tác dùng xuyên suốt Marketplace, Buyer Account, Seller Center và Admin.

Ảnh phải là một **design-system reference board**, không phải một màn hình ứng dụng hoàn chỉnh. Chia ảnh thành các section theo chữ cái; mỗi section có tiêu đề, mô tả ngắn và các component được đặt trong card showcase rõ ràng. Toàn bộ nội dung sử dụng tiếng Việt tự nhiên, không dùng Lorem Ipsum.

---

## Phần đầu ảnh

Hiển thị:

- Nhãn nhỏ: `HUKI EBOOK — SHARED COMPONENT SYSTEM`
- Tiêu đề lớn: `II. NÚT, NHÃN TRẠNG THÁI & HÀNH ĐỘNG`
- Tiêu đề tiếng Anh nhỏ: `Buttons, Badges & Actions`
- Mô tả: `Hệ thống hành động và trạng thái nhất quán cho Marketplace, Buyer, Seller và Admin.`
- Nhãn phiên bản: `Interactive States · Commerce Status · Shared UI`

---

## SECTION A — Button Hierarchy

Trình bày hệ thống button cơ bản theo cùng kích thước và cùng nội dung mẫu để dễ so sánh.

### Button variants

1. `Primary` — nội dung `Thêm sản phẩm`
2. `Secondary` — nội dung `Lưu bản nháp`
3. `Outline` — nội dung `Xem trước`
4. `Ghost` — nội dung `Hủy`
5. `Danger` — nội dung `Xóa sản phẩm`
6. `Text/Link` — nội dung `Xem chi tiết`

Mỗi variant thể hiện bốn state:

- Default
- Hover
- Focus
- Disabled

Primary phải là hành động nổi bật nhất. Secondary và Outline không được cạnh tranh thị giác với Primary. Danger chỉ dùng cho hành động phá hủy hoặc khó hoàn tác.

---

## SECTION B — Button Sizes & Icon Placement

Trình bày button theo ba kích thước:

- `Large` — `Tiếp tục`
- `Medium` — `Lưu thay đổi`
- `Small` — `Chỉnh sửa`

Trình bày các cách đặt icon:

1. Icon bên trái — `Thêm sản phẩm`
2. Icon bên phải — `Tiếp tục`
3. Chỉ có icon — Edit
4. Chỉ có icon — More actions
5. Chỉ có icon — Close
6. Full-width button — `Xác nhận đơn hàng`

Icon-only button phải có tooltip minh họa để người dùng hiểu chức năng. Không dùng icon trang trí không có ý nghĩa.

---

## SECTION C — Loading, Success & Disabled Buttons

Trình bày các trạng thái xử lý thường gặp trong HUKI:

1. `Đang lưu...` — có spinner
2. `Đang tải lên 68%` — có progress nhỏ
3. `Đang xác nhận...`
4. `Đã lưu` — có check icon
5. `Đã xuất bản` — trạng thái thành công ngắn
6. `Không thể thao tác` — disabled
7. `Mất kết nối` — disabled kèm biểu tượng offline

Loading button phải giữ nguyên chiều rộng để giao diện không bị nhảy. Khi đang xử lý, không hiển thị nhiều spinner hoặc animation gây nhiễu.

---

## SECTION D — Button Groups & Common Action Sets

Trình bày các nhóm hành động thực tế dưới dạng component cards riêng.

### 1. Product Editor Actions

- Ghost: `Hủy`
- Secondary: `Lưu bản nháp`
- Outline: `Xem trước`
- Primary: `Gửi duyệt`

### 2. Published Product Actions

- Outline: `Xem sản phẩm`
- Secondary: `Chỉnh sửa`
- More-actions icon

### 3. Rejected Product Actions

- Outline: `Xem lý do`
- Primary: `Khắc phục ngay`

### 4. Buyer Order Actions

- Ghost: `Liên hệ người bán`
- Outline: `Theo dõi đơn hàng`
- Primary: `Đã nhận được hàng`

### 5. Seller Order Actions

- Outline: `Xem chi tiết`
- Primary: `Xác nhận đơn`

### 6. Form Actions

- Ghost: `Hủy`
- Primary: `Lưu thay đổi`

Mỗi nhóm phải cho thấy rõ đâu là Primary action. Không đặt hai Primary button cạnh nhau trong cùng một nhóm.

---

## SECTION E — Product Format Badges

Trình bày hệ badge phân loại định dạng sản phẩm:

1. `Sách vật lý`
2. `Ebook`
3. `Sách vật lý + Ebook`

Thêm các badge phụ liên quan đến sản phẩm:

- `Còn hàng`
- `Sắp hết hàng`
- `Hết hàng`
- `Giảm 20%`
- `Mới`
- `Bán chạy`
- `Độc quyền`
- `Đã xác minh`

Product format badge phải dễ phân biệt nhưng không dùng màu quá rực. Discount và warning badge có thể nổi bật hơn vì mang tính thương mại hoặc cảnh báo.

---

## SECTION F — Product Status Badges

Tạo một status matrix rõ ràng cho vòng đời sản phẩm Seller.

Bao gồm:

1. `Bản nháp` — Draft
2. `Đang xử lý` — Processing
3. `Chờ duyệt` — Pending review
4. `Đang bán` — Published
5. `Bị từ chối` — Rejected
6. `Đã ẩn` — Hidden
7. `Bị tạm ngưng` — Suspended
8. `Đã lưu trữ` — Archived
9. `Xử lý thất bại` — Processing failed

Mỗi badge có:

- Status dot hoặc icon nhỏ phù hợp
- Nhãn tiếng Việt
- Màu nền nhạt
- Màu chữ đủ tương phản
- Border nhẹ nếu cần

Không dùng cùng một màu đỏ giống hệt cho mọi trạng thái tiêu cực. `Bị từ chối`, `Bị tạm ngưng` và `Xử lý thất bại` cần nhận diện khác nhau bằng icon hoặc sắc độ, nhưng vẫn thuộc nhóm cảnh báo nghiêm trọng.

---

## SECTION G — Order, Payment & Shipping Status Badges

Chia thành ba hàng hoặc ba card nhỏ.

### Order status

- `Chờ xác nhận`
- `Đã xác nhận`
- `Đang chuẩn bị`
- `Đang giao`
- `Đã giao`
- `Đã hủy`
- `Hoàn tất`
- `Đang hoàn tiền`
- `Đã hoàn tiền`

### Payment status

- `Chưa thanh toán`
- `Đã thanh toán`
- `Thanh toán thất bại`
- `COD`
- `Đang hoàn tiền`
- `Đã hoàn tiền`

### Shipping status

- `Chờ lấy hàng`
- `Đã lấy hàng`
- `Đang vận chuyển`
- `Giao hàng thành công`
- `Giao hàng thất bại`
- `Đã hoàn hàng`

Badge phải có logic màu nhất quán giữa ba nhóm: pending, processing, success, warning và destructive.

---

## SECTION H — Store, Business & Member Status Badges

### Store/Business status

- `Chờ duyệt`
- `Đang hoạt động`
- `Bị từ chối`
- `Tạm ngưng`
- `Đã đóng`

### Member status

- `Chủ sở hữu`
- `Quản lý`
- `Nhân viên`
- `Đang chờ tham gia`
- `Đã vô hiệu hóa`

### System and account status

- `Đang trực tuyến`
- `Ngoại tuyến`
- `Chưa xác minh`
- `Đã xác minh`
- `Bị khóa`

Role badge và lifecycle status badge phải khác nhau về hình thức để tránh hiểu nhầm vai trò là trạng thái hệ thống.

---

## SECTION I — Count, Notification & Utility Badges

Trình bày các badge nhỏ dùng trong navigation và dữ liệu:

1. Numeric badge: `3`
2. Numeric badge lớn: `99+`
3. Unread dot
4. `5 mới`
5. `3 cần xử lý`
6. `HOT`
7. `Beta`
8. `Mặc định`
9. `Đã đọc`
10. `Chưa đọc`
11. `Đã chọn`
12. `Bắt buộc`

Minh họa badge được đặt trên:

- Icon Tin nhắn
- Icon Thông báo
- Icon Giỏ hàng
- Sidebar item Sản phẩm
- Sidebar item Đơn hàng

Badge phải nhỏ gọn, không che icon và vẫn đọc được ở kích thước thực tế.

---

## SECTION J — Action Menu

Trình bày menu ba chấm dùng cho Product, Order, Address và Member.

### Product Action Menu

- `Xem trước`
- `Chỉnh sửa`
- `Nhân bản`
- `Ẩn sản phẩm`
- `Lưu trữ`
- Divider
- `Xóa sản phẩm`

### Order Action Menu

- `Xem chi tiết`
- `In đơn hàng`
- `Liên hệ người mua`
- `Xem vận chuyển`
- Divider
- `Hủy đơn hàng`

### Address Action Menu

- `Chỉnh sửa`
- `Đặt làm mặc định`
- Divider
- `Xóa địa chỉ`

### Member Action Menu

- `Xem thông tin`
- `Thay đổi vai trò`
- `Vô hiệu hóa`
- Divider
- `Xóa thành viên`

Các destructive action phải nằm cuối menu, có divider và dùng màu cảnh báo. Không để tất cả action cùng mức độ nhấn mạnh.

---

## SECTION K — Dropdown, Popover & Tooltip

Trình bày compact showcase cho ba component.

### Dropdown Menu

Ví dụ menu `Sắp xếp theo`:

- `Cập nhật gần nhất`
- `Mới tạo`
- `Tên A–Z`
- `Giá thấp đến cao`
- `Giá cao đến thấp`

Đánh dấu `Cập nhật gần nhất` đang được chọn.

### Popover

Ví dụ notification preview:

- Tiêu đề: `Thông báo mới`
- `Sản phẩm “Nhà giả kim” đã được duyệt.`
- Thời gian: `5 phút trước`
- Link: `Xem tất cả thông báo`

### Tooltip

Minh họa tooltip cho:

- `Tin nhắn`
- `Thông báo`
- `Chỉnh sửa`
- `Sao chép liên kết`
- `Thu gọn sidebar`

Dropdown và Popover không được quá lớn. Tooltip phải ngắn, rõ và không lặp lại đoạn mô tả dài.

---

## SECTION L — Selection & Destructive Actions

Trình bày các trạng thái hành động khi chọn nhiều dữ liệu.

### Bulk selection bar

- Checkbox đã chọn
- Text: `Đã chọn 4 sản phẩm`
- `Hiển thị`
- `Ẩn`
- `Lưu trữ`
- `Bỏ chọn`

### Destructive confirmation trigger

- Danger button: `Xóa 4 sản phẩm`
- Warning text nhỏ: `Hành động này cần xác nhận.`

### Undo action

- Toast-like action strip: `Đã lưu trữ 4 sản phẩm`
- Action: `Hoàn tác`
- Close icon

Phần này chỉ minh họa trigger/action component; modal xác nhận đầy đủ sẽ nằm ở Plate VIII.

---

## SECTION M — Accessibility & Interaction Reference

Kết thúc phần component bằng một card tham chiếu nhỏ thể hiện:

1. Focus ring rõ ràng trên Primary button.
2. Keyboard-selected menu item.
3. Disabled button có độ tương phản phù hợp.
4. Icon-only button có tooltip.
5. Loading state không làm thay đổi kích thước button.
6. Status badge không chỉ phân biệt bằng màu mà còn có icon hoặc label.

Dùng chú thích ngắn, không biến section này thành tài liệu nhiều chữ.

---

## Footer của component board

Hiển thị nhỏ gọn:

- `HUKI EBOOK`
- `Shared Buttons, Badges & Actions`
- `Marketplace · Buyer · Seller · Admin`
- Dòng ghi chú: `Phân cấp hành động rõ ràng, trạng thái nhất quán và dễ nhận biết.`

---

## Yêu cầu bắt buộc

- Chỉ xuất **một ảnh dọc dài duy nhất** cho Plate II.
- Tất cả section A–M phải nằm trong cùng ảnh.
- Đây là component showcase, không phải một dashboard hoặc một trang Product Editor hoàn chỉnh.
- Kế thừa chính xác phong cách UI HUKI đã thiết kế trước đó.
- Không tự thay đổi palette, typography hoặc phong cách icon.
- Dùng cùng một hệ spacing, radius, border và shadow như các layout HUKI trước.
- Mỗi nhóm phải có label component và chú thích ngắn, nhưng không nhồi quá nhiều văn bản.
- Nội dung phải đúng chính tả tiếng Việt, không dùng Lorem Ipsum.
- Không đặt hai Primary button cạnh nhau trong cùng một action group.
- Danger chỉ dành cho hành động phá hủy hoặc khó hoàn tác.
- Loading button phải giữ nguyên kích thước.
- Icon-only button phải có tooltip.
- Badge không được quá lớn hoặc lấn át nội dung chính.
- Trạng thái không được chỉ dựa vào màu sắc; dùng thêm icon, dot hoặc label khi cần.
- Không tự thêm chức năng ngoài danh sách.
- Không lặp component chỉ để lấp đầy ảnh.
- Bảo đảm chữ và trạng thái vẫn đọc rõ khi xem toàn bộ ảnh dọc.

