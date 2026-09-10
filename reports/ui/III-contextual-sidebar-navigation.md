# HUKI SHARED COMPONENT SYSTEM — PLATE III

## Complete Contextual Sidebar Navigation

Hãy tạo **một ảnh component showcase khổ dọc rất dài duy nhất** dành riêng cho toàn bộ hệ thống Sidebar của HUKI EBOOK.

Đây là phần tiếp nối trực tiếp của những layout và bảng quy chuẩn HUKI đã thiết kế trước đó. Hãy kế thừa chính xác visual foundation hiện có: màu thương hiệu, semantic colors, typography, spacing, border radius, shadow, icon style, active state, badge và mật độ bố cục. Không tạo lại design tokens, không đổi phong cách thương hiệu và không biến ảnh này thành một visual-foundation board mới.

Sidebar là hệ thống điều hướng quan trọng nhất của Buyer Account, Seller Center và Admin Operations. Vì vậy kết quả phải đủ chi tiết để dùng làm nguồn chuẩn cho tất cả màn hình về sau, không được chỉ tạo vài mockup tượng trưng.

Sidebar bắt buộc dùng mô hình đã cung cấp:

- Một **compact icon rail** hẹp luôn nằm bên trái.
- Một **contextual sidebar panel** mở bên cạnh icon rail.
- Icon rail dùng để chuyển chức năng chính.
- Panel mở rộng hiển thị toàn bộ chức năng nhỏ của module đang chọn.
- Khi panel đóng, icon rail vẫn hiển thị và có tooltip khi hover.
- Hai phần này thuộc cùng một navigation system, không phải hai Sidebar đầy đủ đặt cạnh nhau.

Ảnh phải thể hiện cụ thể toàn bộ chức năng Sidebar, không chỉ minh họa chung chung. Mỗi panel phải có tên thật, mục con thật, badge thật, active item, quick action và trạng thái liên quan. Toàn bộ nội dung sử dụng tiếng Việt tự nhiên, không dùng Lorem Ipsum và chỉ trình bày desktop.

---

## Phần đầu ảnh

- Nhãn nhỏ: `HUKI EBOOK — SHARED COMPONENT SYSTEM`
- Tiêu đề lớn: `III. HỆ THỐNG SIDEBAR THEO NGỮ CẢNH`
- Tiêu đề tiếng Anh nhỏ: `Complete Contextual Sidebar Navigation`
- Mô tả: `25 nhóm chức năng chính · 138 chức năng nhỏ · Seller, Buyer và Admin`
- Nhãn phiên bản: `Desktop · Expandable · Role-based Navigation`

---

## VISUAL CONTRACT — Quy chuẩn bắt buộc cho toàn bộ Plate III

### 1. Tinh thần thiết kế

Sidebar phải thể hiện đúng phong cách:

`Literary Salon & Modern Vietnamese Bookshop`

Kết hợp ba đặc tính:

- `Warm Editorial Precision` — ấm áp, tinh tế, có chất xuất bản.
- `Tactile Softness` — surface mềm, bo góc vừa phải, shadow dịu.
- `Professional Navigation` — phân cấp rõ, dễ quét, không trang trí dư thừa.

Sidebar không được giống navigation của fintech, gaming dashboard hoặc enterprise template lạnh lẽo.

### 2. Màu sắc sử dụng

- Canvas toàn board: warm ivory `#F8F6F0`.
- Contextual panel: warm white hoặc paper surface gần `#FFFFFF`/`#FAF9F5`.
- Surface phụ: `#F2EFE8`.
- Icon rail: brand pine green `#006953` hoặc sắc xanh đậm tương ứng trong visual foundation.
- Active navigation: green-tinted surface rất nhẹ, chữ/icon xanh HUKI đậm.
- Commerce accent `#AC2C19`: chỉ dùng tiết chế cho hành động mua hàng hoặc cảnh báo thương mại quan trọng; không dùng làm active navigation mặc định.
- Gold `#FEA619`: rating, promotion hoặc attention accent nhỏ.
- Text chính: warm ink `#17201F`.
- Text phụ: muted ink `#6B7280` nhưng vẫn đủ tương phản.
- Border: hairline warm neutral `#E8E5DF`, chỉ dùng khi cần xác định ranh giới.
- Success, warning, error và information dùng semantic token riêng, luôn đi cùng icon/dot/label.

Không bao quanh mọi menu item bằng border. Phân cấp chủ yếu bằng surface, spacing, typography, active indicator và elevation.

### 3. Typography

- Tất cả navigation label, badge, tooltip, metadata và action dùng `Be Vietnam Pro`.
- Không dùng serif cho menu item hoặc số lượng.
- Có thể dùng `Newsreader` rất tiết chế cho tiêu đề lớn của component board, không dùng cho Sidebar navigation.
- Module title: rõ, semibold, không uppercase toàn bộ.
- Group label: uppercase nhỏ, tracking vừa phải, không quá nhạt.
- Navigation item: dễ đọc ở kích thước desktop thực tế.
- Badge và metadata không nhỏ đến mức mất dấu tiếng Việt.
- Số lượng dùng tabular figures để không làm badge thay đổi chiều rộng bất thường.

### 4. Shape và độ mềm mại

- Icon rail là một khối hẹp, sạch, có thể bo nhẹ ở cạnh ngoài theo style HUKI hiện tại.
- Contextual panel có surface ấm, cạnh phân tách rất nhẹ và shadow dịu.
- Navigation item bo mềm vừa phải; không biến mọi item thành pill.
- Active item dùng green-tinted background, không dùng khung cứng.
- Badge dùng pill shape.
- Popover tạo nhanh và tooltip có bo góc, shadow level cao hơn panel.
- Không tạo card lồng nhiều lớp bên trong Sidebar.

### 5. Icon system

Chỉ dùng một icon family SVG duy nhất đã được chọn trong các layout HUKI trước đó, ưu tiên Phosphor hoặc Lucide. Không trộn hai hệ icon trong cùng ảnh và không dùng emoji.

Icon mapping phải nhất quán:

- Dashboard — gauge/grid.
- Store — storefront.
- Products — books/package.
- Orders — receipt/clipboard.
- Promotions — ticket/megaphone.
- Performance — chart line.
- Messages — chat bubble.
- Notifications — bell.
- Members — users.
- Profile — user circle.
- Security — shield/lock.
- Help — question circle.
- Settings — gear.
- Logout — sign out.
- Expand/collapse — panel arrow.

Mỗi icon có cùng optical size, stroke weight và vùng click. Icon active không được đổi sang một phong cách filled hoàn toàn khác nếu icon còn lại là outline.

### 6. Kích thước và mật độ

- Icon rail phải đủ hẹp để tiết kiệm không gian nhưng vùng tương tác của mỗi icon vẫn tối thiểu khoảng 44×44px.
- Khoảng cách giữa các icon tối thiểu 8px hoặc theo spacing token tương ứng.
- Contextual panel rộng đủ để đọc label dài như `Yêu cầu hoàn tiền` và hiển thị badge mà không bị cắt.
- Panel không rộng đến mức chiếm phần lớn màn hình.
- Menu item có chiều cao nhất quán và đủ thoáng.
- Seller dùng density `standard`.
- Buyer dùng density `comfortable`.
- Admin có thể dùng density `standard/compact` nhưng vẫn phải đọc rõ.
- Không thu nhỏ component chỉ để nhét tất cả vào một hàng showcase.

### 7. Quy tắc hành vi

- Click icon rail mở panel đúng module.
- Click lại icon đang active có thể thu gọn panel.
- Chuyển icon khác thay nội dung trong cùng vùng panel, không mở thêm panel thứ hai.
- Panel giữ nguyên module đang chọn khi chuyển page con.
- Item active phản ánh route hiện tại.
- Badge phản ánh số việc chưa đọc hoặc cần xử lý, không phải số trang tĩnh.
- Tooltip chỉ xuất hiện khi panel đóng hoặc label không hiển thị.
- Tooltip không thay thế click; primary navigation phải hoạt động bằng click và keyboard.
- Khi panel mở/đóng, dùng transition mềm 200–300ms, không animate gây giật main content.
- Focus state phải rõ cho icon, item, store selector, nút `+` và collapse control.

### 8. Cách trình bày trên ảnh dài

- Mỗi section phải có một contextual panel ở kích thước đủ lớn để đọc được.
- Khi một section có hai hoặc ba panel, đặt thành grid nhưng không thu nhỏ chữ quá mức.
- Giữa các section có khoảng thở lớn và divider rất nhẹ.
- Mỗi panel có label `Default`, `Active`, `Permission`, `Pending` hoặc `Suspended` khi phù hợp.
- Dùng annotation ngắn để giải thích anatomy; không viết paragraph dài bên trong hình.
- Có thể tăng chiều cao board tùy ý. Không cắt panel và không bỏ item.

---

## SECTION A — Cấu tạo Sidebar và Global Icon Rail

Trình bày một component anatomy có chú thích ngắn cho:

1. Avatar/logo cửa hàng.
2. Status dot.
3. Compact icon rail.
4. Icon mặc định.
5. Icon hover có tooltip.
6. Icon active.
7. Numeric badge.
8. Unread dot.
9. Contextual panel.
10. Tiêu đề module.
11. Nút tạo nhanh `+`.
12. Navigation group.
13. Active item.
14. Nút thu gọn panel.
15. Khu vực tiện ích cuối Sidebar.

### Seller icon rail

- Dashboard
- Xem cửa hàng
- Sản phẩm — warning dot
- Đơn hàng — badge `5`
- Khuyến mãi
- Hiệu suất
- Tin nhắn — badge `2`
- Thông báo — badge `3`
- Thành viên
- Thông tin cửa hàng
- Trợ giúp
- Cài đặt
- Đăng xuất

Hiển thị tooltip mẫu cho `Sản phẩm`, `Tin nhắn`, `Cài đặt` và `Thu gọn sidebar`.

Thể hiện thêm ba trạng thái icon rail:

1. `Panel closed` — chỉ icon rail, tooltip đang mở.
2. `Panel expanded` — icon rail và contextual panel cùng hiển thị.
3. `Module switching` — module mới active, panel thay nội dung nhưng giữ nguyên vị trí.

Khu vực avatar/logo trên icon rail mở Store/User Switcher, không điều hướng trực tiếp đến Profile.

---

## SECTION B — Seller Dashboard Panel

Icon rail active tại `Dashboard`. Contextual panel hiển thị:

- `Tổng quan`
- `Công việc cần xử lý` — badge `12`
- `Hoạt động gần đây`
- `Hiệu suất cửa hàng`
- `Thông báo vận hành`

Thêm khối tóm tắt nhỏ trong panel:

- `5 đơn chờ xác nhận`
- `3 sản phẩm bị từ chối`
- `4 sản phẩm sắp hết hàng`

Hiển thị `Tổng quan` đang active. Các số liệu chỉ là shortcut điều hướng, không biến Sidebar thành dashboard thu nhỏ quá phức tạp.

Quick summary dùng ba compact action row có icon, label và số lượng. Không dùng chart hoặc KPI card lớn trong Sidebar.

---

## SECTION C — Seller Store Panel

Icon rail active tại `Thông tin cửa hàng`.

### Store identity

- Logo cửa hàng
- `Nhà sách Minh Trí`
- Badge `Đang hoạt động`
- Store selector

Store selector khi mở hiển thị:

- `Nhà sách Minh Trí` — đang chọn.
- `HUKI Book Corner` — đang hoạt động.
- `Gian hàng mới` — chờ duyệt.
- Action `Quản lý cửa hàng`.
- Action `Tạo cửa hàng mới`.

### Navigation

- `Thông tin cửa hàng`
- `Trạng thái phê duyệt`
- `Địa chỉ lấy hàng`
- `Chính sách cửa hàng`
- `Thiết lập vận chuyển`
- `Xem cửa hàng công khai`

Hiển thị thêm hai mini state:

1. Store `Chờ duyệt` — publishing bị disabled.
2. Store `Tạm ngưng` — có nút `Xem lý do`.

Khi Store chờ duyệt hoặc tạm ngưng, chỉ disable những chức năng không hợp lệ; không khóa Tin nhắn, Trợ giúp, Hồ sơ hoặc Bảo mật.

---

## SECTION D — Seller Products Panel

Icon rail active tại `Sản phẩm`.

### Header

- Tiêu đề `Sản phẩm`
- Nút tạo nhanh `+`
- Nút thu gọn panel

### Navigation

- `Tất cả sản phẩm` — `48`
- `Đang bán` — `25`
- `Bản nháp` — `8`
- `Chờ duyệt` — `4`
- `Bị từ chối` — warning badge `3`
- `Đã ẩn` — `8`
- `Kho hàng` — warning badge `4`
- `Tệp Ebook`
- `Danh mục sản phẩm`

### Quick-create popover

- `Thêm sách vật lý`
- `Thêm Ebook`
- `Thêm Physical + Ebook`
- `Nhập danh sách sản phẩm`

Mỗi action có icon và mô tả một dòng:

- Sách vật lý — `Quản lý giá, tồn kho và vận chuyển.`
- Ebook — `Tải lên EPUB/PDF và thiết lập giá bán.`
- Physical + Ebook — `Bán hai định dạng trong cùng sản phẩm.`
- Nhập danh sách — `Tạo nhiều sản phẩm từ tệp dữ liệu.`

Hiển thị `Tất cả sản phẩm` active. Thêm một variant nhỏ khi `Bị từ chối` active để Stitch thể hiện warning navigation state.

---

## SECTION E — Seller Orders Panel

Icon rail active tại `Đơn hàng`.

- `Tất cả đơn hàng` — `32`
- `Chờ xác nhận` — badge `5`
- `Đã xác nhận` — `4`
- `Đang chuẩn bị` — `7`
- `Chờ lấy hàng` — `3`
- `Đang giao` — `9`
- `Đã giao` — `10`
- `Đã hủy` — `1`
- `Giao thất bại` — warning badge `2`
- `Yêu cầu hoàn tiền` — warning badge `3`

Hiển thị `Chờ xác nhận` active. Phân biệt rõ badge số lượng bình thường và badge cần xử lý.

Thêm một control nhỏ `Lọc theo cửa hàng` ở đầu panel khi seller quản lý nhiều cửa hàng. Đây là selector compact, không phải một form filter phức tạp.

---

## SECTION F — Seller Promotions & Performance Panels

Trình bày hai contextual panel cạnh nhau.

### Khuyến mãi

- `Tổng quan khuyến mãi`
- `Campaign`
- `Voucher`
- `Banner`
- `Flash Sale`

Nút `+` mở quick actions:

- `Tạo Voucher`
- `Tạo Campaign`
- `Tạo Flash Sale`

### Hiệu suất

- `Tổng quan`
- `Doanh thu`
- `Hiệu suất sản phẩm`
- `Hiệu suất đơn hàng`
- `Tồn kho`

Không tự thêm báo cáo tài chính, lợi nhuận, thuế hoặc biểu đồ nâng cao chưa có trong nội dung yêu cầu.

Hiển thị item `Tồn kho` có warning dot khi tồn kho thấp. Không đặt số doanh thu trực tiếp trong icon rail.

---

## SECTION G — Seller Messages & Notifications Panels

Trình bày hai panel độc lập cạnh nhau. Tin nhắn và Thông báo phải dùng hai icon khác nhau.

### Tin nhắn

- Tiêu đề `Tin nhắn`
- Nút `+` tạo cuộc trò chuyện
- `Tất cả cuộc trò chuyện` — `12`
- `Chưa đọc` — badge `2`
- `Người mua`
- `Hỗ trợ HUKI`

Nhóm `GẦN ĐÂY`:

- `Nguyễn Văn An` — unread dot
- `Trần Minh Anh`
- `HUKI Support`

Mỗi conversation row có avatar, tên, preview một dòng, thời gian và unread dot khi cần. Đây là preview navigation compact, không hiển thị toàn bộ nội dung chat.

### Thông báo

- `Tất cả thông báo` — `18`
- `Chưa đọc` — badge `3`
- `Đơn hàng`
- `Sản phẩm`
- `Cửa hàng`
- `Tin nhắn`
- `Khuyến mãi`
- `Hệ thống`
- `Bảo mật`

Header Notification panel có compact action `Đánh dấu tất cả đã đọc`.

---

## SECTION H — Seller Members & Settings Panels

Trình bày hai panel độc lập.

### Thành viên

- `Tất cả thành viên` — `6`
- `Chủ sở hữu` — `1`
- `Quản lý` — `2`
- `Nhân viên` — `3`
- `Lời mời đang chờ` — badge `2`
- `Vai trò và quyền hạn`

Header có nút `+ Mời thành viên`.

Khi user hiện tại không có quyền quản lý thành viên, nút mời bị ẩn hoặc disabled có tooltip; không để nút hoạt động giả.

### Cài đặt và hỗ trợ

- `Hồ sơ seller`
- `Bảo mật`
- `Phiên đăng nhập`
- `Cài đặt thông báo`
- `Trợ giúp`
- `Đăng xuất`

Thêm item disabled có lock icon và tooltip: `Bạn không có quyền truy cập mục này.`

---

## SECTION I — Buyer Overview & Profile Panels

Dùng cùng hệ thống icon rail + contextual panel, nhưng thay nội dung theo Buyer Account.

### Buyer icon rail

- Tổng quan
- Hồ sơ
- Địa chỉ
- Giỏ hàng — badge `3`
- Đơn hàng
- Tin nhắn — badge `2`
- Thông báo — badge `5`
- Bảo mật
- Cài đặt

Buyer icon rail sử dụng avatar người dùng thay cho logo cửa hàng. Không hiển thị Store Selector trong Buyer Sidebar.

### Tổng quan

- `Tóm tắt tài khoản`
- `Đơn hàng gần đây`
- `Thông báo mới`
- `Truy cập nhanh`

### Hồ sơ

- `Thông tin cá nhân`
- `Chỉnh sửa hồ sơ`
- `Email và số điện thoại`
- `Ảnh đại diện`

User summary:

- Avatar
- `Minh Trí`
- `minhtri@huki.vn`

---

## SECTION J — Buyer Address, Cart & Orders Panels

Trình bày ba panel theo cùng chiều cao showcase hợp lý.

### Địa chỉ

- `Tất cả địa chỉ`
- `Địa chỉ mặc định`
- `Thêm địa chỉ`
- `Địa chỉ lấy hóa đơn`

### Giỏ hàng

- `Sản phẩm trong giỏ` — badge `3`
- `Sản phẩm đã chọn` — `2`
- Primary shortcut: `Tiếp tục Checkout`

`Tiếp tục Checkout` là compact action ở cuối panel, không dùng một Primary button quá lớn làm Sidebar mất cân bằng.

### Đơn hàng

- `Tất cả đơn hàng`
- `Chờ xác nhận`
- `Đang chuẩn bị`
- `Chờ lấy hàng`
- `Đang giao`
- `Đã giao`
- `Đã hủy`
- `Yêu cầu hoàn tiền`
- `Theo dõi vận chuyển`

Hiển thị `Đang giao` active và có badge `2`.

---

## SECTION K — Buyer Messages, Notifications & Security Panels

### Tin nhắn

- `Tất cả cuộc trò chuyện`
- `Chưa đọc` — badge `2`
- `Người bán`
- `Hỗ trợ HUKI`

### Thông báo

- `Tất cả`
- `Chưa đọc` — badge `5`
- `Đơn hàng`
- `Vận chuyển`
- `Tin nhắn`
- `Khuyến mãi`
- `Hệ thống`
- `Bảo mật`

### Bảo mật và cài đặt

- `Đổi mật khẩu`
- `Phiên đăng nhập`
- `Cài đặt thông báo`
- `Quyền riêng tư`
- `Trợ giúp`
- `Đăng xuất`

Không thêm Tủ sách, tiến độ đọc, Thử thách đọc, Thống kê đọc, Nhãn cá nhân, Cloud Sync hoặc VIP vào Buyer Sidebar hiện tại.

Nếu sau này có Ebook Library, phải tạo module độc lập sau khi backend entitlement và reading progress được xác nhận; không chèn âm thầm vào Buyer Sidebar của phiên bản này.

---

## SECTION L — Admin Approval, Catalog & Moderation Panels

### Admin icon rail

- Dashboard
- Phê duyệt — badge `12`
- Danh mục
- Kiểm duyệt — badge `12`
- Vận hành
- Khuyến mãi
- Hệ thống
- Cài đặt

Khu vực đầu Admin icon rail dùng logo/mark HUKI Admin hoặc avatar quản trị viên, không dùng logo cửa hàng.

### Phê duyệt

- `Doanh nghiệp` — badge `8`
- `Cửa hàng` — badge `4`
- `Sản phẩm` — chỉ thể hiện nếu có trạng thái duyệt
- `Yêu cầu hoàn tiền` — badge `3`
- `Lịch sử phê duyệt`

`Sản phẩm` chỉ xuất hiện dưới Phê duyệt khi product-review workflow chính thức tồn tại. Nếu chưa có contract, trình bày item ở trạng thái `Planned` bằng annotation của design board, không giả vờ là chức năng production đã hoàn tất.

### Danh mục

- `Sách`
- `Danh mục`
- `Tác giả`
- `Nhà xuất bản`
- `Cửa hàng`

### Kiểm duyệt

- `Hàng đợi kiểm duyệt` — badge `12`
- `Bài viết bị báo cáo`
- `Bình luận bị báo cáo`
- `Review bị báo cáo`

Hiển thị `Doanh nghiệp` active trong Approval panel và `Hàng đợi kiểm duyệt` active trong Moderation panel.

---

## SECTION M — Admin Operations, Promotions & System Panels

### Vận hành

- `Đơn hàng`
- `Hoàn tiền`
- `Shipment`
- `Theo dõi vận chuyển`
- `Nhân viên giao hàng`
- `Vấn đề giao hàng` — warning badge `2`

### Khuyến mãi

- `Voucher`
- `Banner`
- `Flash Sale`
- `Campaign`

### Hệ thống

- `Tổng quan dịch vụ`
- `Identity Service`
- `Business Service`
- `Commerce Service`
- `Shipping Service`
- `Community Service`
- `Promotion Service`

Service khỏe dùng status dot xanh; service có cảnh báo dùng amber; không trình bày biểu đồ monitoring phức tạp bên trong Sidebar.

Không dùng status đỏ cho service chỉ vì chưa có dữ liệu. Red chỉ dành cho outage hoặc lỗi được xác nhận; trạng thái chưa kiểm tra dùng neutral/unknown.

---

## SECTION N — Interaction, Permission & Dimensions

Kết thúc ảnh bằng một reference matrix nhỏ nhưng cụ thể.

### Interaction states

- Icon default.
- Icon hover có tooltip.
- Icon active.
- Item default.
- Item hover.
- Item active.
- Item có unread dot.
- Item có numeric badge.
- Item có warning badge.
- Item disabled có lock icon.
- Panel expanded.
- Panel collapsed.

### Permission states

1. `Không có quyền` — tooltip và item disabled.
2. `Cửa hàng chờ duyệt` — Product publishing bị disabled.
3. `Cửa hàng tạm ngưng` — warning strip và `Xem lý do`.

### Layout behavior

- Icon rail luôn cố định.
- Chỉ một contextual panel được mở tại một thời điểm.
- Khi panel đóng, vùng nội dung chính mở rộng.
- Tooltip mở sang bên phải icon rail.
- Contextual panel đủ rộng cho label và badge nhưng không lấn át nội dung chính.

### Keyboard behavior

- Tab đi qua Store/User Switcher, icon rail, panel header, navigation items và utility actions theo đúng thứ tự thị giác.
- Enter/Space kích hoạt icon hoặc item đang focus.
- Escape đóng quick-action popover, tooltip hoặc Store Switcher; không tự đóng toàn bộ Sidebar khi người dùng đang điều hướng.
- Focus được chuyển hợp lý vào panel khi module được mở bằng keyboard.
- Collapse button có label `Thu gọn thanh điều hướng`.

### Truncation behavior

- Ưu tiên wrap label dài tối đa hai dòng trong contextual panel.
- Nếu bắt buộc truncate, dùng ellipsis và tooltip chứa đầy đủ nội dung.
- Không truncate số lượng, status badge hoặc tên chức năng quan trọng mà không có cách xem đầy đủ.

---

## Footer của component board

- `HUKI EBOOK`
- `Complete Contextual Sidebar Navigation`
- `Seller · Buyer · Admin`
- Ghi chú: `Một icon rail nhất quán, panel chi tiết thay đổi theo chức năng và vai trò.`

---

## Yêu cầu bắt buộc

- Chỉ xuất **một ảnh dọc rất dài duy nhất** cho Plate III.
- Tất cả section A–N phải nằm trong cùng ảnh.
- Không bỏ qua panel chỉ vì ảnh dài; có thể tăng chiều cao ảnh để hiển thị đầy đủ.
- Đây là component showcase, không phải dashboard hay màn hình ứng dụng hoàn chỉnh.
- Kế thừa chính xác visual foundation và UI HUKI đã thiết kế trước đó.
- Không tạo lại hoặc thay đổi palette, typography, radius, shadow và icon system.
- Chỉ thiết kế desktop; không tạo mobile drawer, bottom navigation hoặc mockup điện thoại.
- Bắt buộc dùng compact icon rail kết hợp contextual expandable panel.
- Icon rail và panel mở rộng là hai lớp của cùng một hệ thống.
- Chỉ một contextual panel được mở tại một thời điểm.
- Giữ icon rail xanh HUKI và active navigation dùng green-tinted surface; không dùng đỏ gốm làm active state mặc định.
- Dùng `Be Vietnam Pro` cho toàn bộ label, badge, tooltip và metadata của Sidebar.
- Dùng cùng một SVG icon family; không trộn Phosphor và Lucide trong cùng kết quả.
- Vùng tương tác icon không nhỏ hơn khoảng 44×44px và khoảng cách giữa các target tối thiểu 8px.
- Có đầy đủ hover, focus-visible, active, expanded, collapsed, disabled, unread, warning, pending và suspended state.
- Tất cả panel phải hiển thị ở kích thước đủ đọc; tăng chiều cao ảnh thay vì thu nhỏ chữ.
- Mỗi panel phải có nội dung cụ thể, badge, active item và quick action tương ứng.
- Tin nhắn và Thông báo là hai chức năng độc lập.
- Active state không được chỉ dựa vào đổi màu icon.
- Badge nhỏ gọn, không che icon hoặc làm lệch label.
- Icon-only item phải có tooltip khi panel đóng.
- Nội dung phải đúng chính tả tiếng Việt, không dùng Lorem Ipsum.
- Không thêm VIP, Cloud Sync, reading challenge hoặc chức năng ngoài phạm vi hiện tại.
- Không tự thêm báo cáo hoặc dữ liệu quản trị không được yêu cầu.
- Không lặp component chỉ để lấp đầy ảnh.
- Chữ và badge phải đọc được khi xem toàn bộ ảnh dài.
