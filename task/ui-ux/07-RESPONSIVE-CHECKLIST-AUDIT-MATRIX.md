# MA TRẬN KIỂM ĐỊNH TOÀN DIỆN 141 URL FRONTEND (RESPONSIVE & ANTI-AI AUDIT MATRIX)

> **Phạm vi kiểm định:** Đúng 100% toàn bộ **141 URLs giao diện** (tương ứng với 141 tệp `page.tsx` thực tế trong mã nguồn `web/src/app`), không bỏ sót bất kỳ trang nào.
> **Tiêu chuẩn áp dụng:** Thu nhỏ kích thước compact, bỏ viền màu mè, loại bỏ hoàn toàn emoji, responsive trên cả 3 kích thước thiết bị.

---

## 1. Bảng Tổng Hợp Số Lượng Tuyến Đường Theo Phân Hệ

| Phân hệ | Số lượng URL thực tế | Tỷ lệ bao phủ | Trạng thái chuẩn hóa |
| :--- | :--- | :--- | :--- |
| **Guest / Public** | **22 URLs** | **100%** | Đã lập đặc tả chi tiết |
| **Buyer / User** | **30 URLs** | **100%** | Đã lập đặc tả chi tiết |
| **Seller** | **44 URLs** | **100%** | Đã lập đặc tả chi tiết |
| **Shipper** | **10 URLs** | **100%** | Đã lập đặc tả chi tiết |
| **Admin** | **35 URLs** | **100%** | Đã lập đặc tả chi tiết |
| **TỔNG CỘNG** | **141 URLs** | **100.0%** | **HOÀN TOÀN KHÉP KÍN** |

---

## 2. Phân Hệ KHÁCH VÃNG LAI (GUEST / PUBLIC) - 22 URLs

| STT | URL Tuyến Đường | Tên Trang / Chức Năng | Mobile (< 640px) | Tablet (640-1024px) | Desktop (>= 1024px) | Tiêu Chuẩn Anti-AI | Trạng Thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `/` | **Trang chủ nền tảng** | Carousel 16:9, grid 2 cột, category pill scroll | Grid 3-4 cột, tab thể loại ngang | Grid 5-6 cột, max-w-7xl, hover nâng nhẹ | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 2 | `/books` | **Tìm kiếm & Danh mục sách** | Bottom Sheet lọc trượt từ đáy, thẻ sách list/grid | Sidebar lọc trượt, grid 3 cột | Sidebar cố định 240px, grid 4-5 cột | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 3 | `/book/[id]` | **Chi tiết sản phẩm sách** | Sticky bar mua hàng đáy màn hình, swipe ảnh bìa | Bố cục 2 cột cân đối, preview sách popup | Cột trái ảnh 40%, cột phải thông số 60% | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 4 | `/book/[id]/preview` | **Đọc thử sách mẫu** | Toàn màn hình, lật trang swipe, thanh trang nhỏ | Khung đọc 700px căn giữa, phím mũi tên | Chế độ đọc Zen Mode, phím mũi tên ← / → | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 5 | `/author/[id]` | **Hồ sơ tác giả** | Avatar 64px, tiểu sử cuộn, grid 2 cột | Avatar 80px, grid sách tác giả 3 cột | Header tác giả chuẩn mực, grid sách 4-5 cột | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 6 | `/stores` | **Danh sách nhà sách** | Thẻ shop 1 cột, avatar 40px | Grid shop 2 cột, thông tin tóm tắt | Grid shop 3-4 cột, sách tiêu biểu | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 7 | `/shop/[id]` | **Gian hàng người bán** | Banner shop 96px, avatar 48px, tab trượt ngang | Header shop 120px, grid sách 3 cột | Header chuẩn brand, grid sách 4-5 cột | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 8 | `/flash-sale` | **Sự kiện Flash sale** | Đồng hồ đếm ngược compact, grid 2 cột | Đồng hồ ngang, grid 3-4 cột | Banner flash sale, grid 5 cột | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 9 | `/vouchers` | **Kho voucher công khai** | Thẻ voucher cuộn dọc, nút lưu compact | Grid voucher 2 cột | Grid voucher 3 cột, tab lọc theo phân loại | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 10 | `/policy` | **Mục lục chính sách** | Danh sách link dọc, icon chevron | 2 cột nhóm chính sách | 3 cột phân loại chính sách | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 11 | `/policy/[slug]` | **Nội dung điều khoản** | Chữ 13px dễ đọc, mục lục trượt | Khung đọc 720px căn giữa | Sidebar mục lục trái, nội dung phải | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 12 | `/maintenance` | **Trang bảo trì** | Thông báo compact, đồng hồ đếm ngược | Card căn giữa 480px | Card căn giữa 520px, nút kiểm tra lại | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 13 | `/r/[shortCode]` | **Chuyển hướng Affiliate** | Spinner xoay nhẹ, chuyển hướng trong 0.5s | Chuyển hướng tức thì | Chuyển hướng tức thì | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 14 | `/[...slug]` | **Catch-all / 404** | Trang 404 gọn, nút về trang chủ 36px | Card 404 căn giữa | Bố cục 404 tinh giản | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 15 | `/auth/login` | **Đăng nhập** | Form full-width padding 16px, bàn phím số | Form căn giữa 380px, nền trung tính | Form căn giữa 380px, bóng mờ nhẹ | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 16 | `/auth/register` | **Đăng ký** | Form tối giản, kiểm tra mật khẩu inline | Form căn giữa 380px, nút Google chuẩn | Form căn giữa 380px, điều khoản thu gọn | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 17 | `/auth/forgot-password` | **Quên mật khẩu** | Nhập email/SĐT, nút gửi OTP | Card căn giữa 380px | Card căn giữa 380px | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 18 | `/auth/reset-password` | **Đặt lại mật khẩu** | Nhập mật khẩu mới, kiểm tra độ mạnh | Card căn giữa 380px | Card căn giữa 380px | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 19 | `/auth/verify` | **Xác thực OTP** | 6 ô nhập số auto-focus, bàn phím số | Card căn giữa 380px | Card căn giữa 380px | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 20 | `/auth/change-password` | **Đổi mật khẩu** | 3 ô nhập mật khẩu, nút lưu 36px | Card căn giữa 400px | Card căn giữa 400px | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 21 | `/auth/status` | **Trạng thái tài khoản** | Thông báo kích hoạt compact | Card căn giữa 400px | Card căn giữa 400px | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 22 | `/auth/onboarding` | **Khởi đầu tài khoản** | Chọn 3 sở thích đọc sách dạng chip | Lưới chủ đề 3 cột | Lưới chủ đề 4 cột | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |

---

## 3. Phân Hệ NGƯỜI MUA (BUYER / USER) - 30 URLs

| STT | URL Tuyến Đường | Tên Trang / Chức Năng | Mobile (< 640px) | Tablet (640-1024px) | Desktop (>= 1024px) | Tiêu Chuẩn Anti-AI | Trạng Thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `/cart` | **Giỏ hàng** | Sticky bar tổng tiền đáy, thẻ shop bo nhẹ | Bố cục 2 cột (70/30), bảng giỏ hàng rõ ràng | Cột trái giỏ hàng, cột phải card tóm tắt cố định | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 2 | `/checkout` | **Thanh toán & Ký quỹ** | Form cuộn dọc, nút Đặt hàng cố định đáy | Bố cục 2 cột, selector địa chỉ gọn | Cột trái nhận/thanh toán, cột phải đơn hàng | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 3 | `/checkout/payment/[orderId]` | **Cổng thanh toán đơn** | QR Pay hoặc nút chuyển ngân hàng | Card thanh toán 480px căn giữa | Khung thanh toán chuẩn VNPAY/Ví | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 4 | `/order/success` | **Đặt hàng thành công** | Biên nhận dạng receipt, nút tra cứu đơn | Card biên nhận căn giữa 480px | Card biên nhận căn giữa 520px | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 5 | `/order-success` | **Thành công (Alias)** | Đồng bộ giao diện với /order/success | Đồng bộ giao diện | Đồng bộ giao diện | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 6 | `/orders` | **Danh sách đơn mua** | Tab trạng thái cuộn ngang, thẻ đơn hàng compact | Bảng danh sách đơn, lọc theo ngày | Bảng đơn hàng có bộ lọc nâng cao và tìm kiếm | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 7 | `/orders/[id]` | **Chi tiết đơn mua** | Timeline dọc, nút gọi shipper một chạm | Timeline vận chuyển chi tiết, thông tin kiện | Timeline kết hợp bản đồ hành trình bưu tá | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 8 | `/orders/[id]/invoice` | **Hóa đơn điện tử** | Bản xem hóa đơn rút gọn, nút tải PDF | Khổ A4 chuẩn hiển thị trên màn hình | Hóa đơn A4 chuẩn in ấn và lưu trữ | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 9 | `/orders/[id]/review` | **Đánh giá đã mua** | Bộ chọn 5 sao vàng ấm, nút chụp ảnh nhỏ | Khung đánh giá chia cột ảnh và nhận xét | Khung đánh giá tiêu chuẩn có gắn Verified | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 10 | `/orders/[id]/return` | **Yêu cầu hoàn tiền RMA** | Dropdown lý do chuẩn, tải ảnh chụp lỗi | Form đối chiếu 2 cột, ước tính tiền hoàn | Form chuẩn RMA e-commerce, chọn phương thức hoàn | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 11 | `/library` | **Tủ sách số cá nhân** | Grid sách số 3 cột, thanh tiến độ 3px đáy bìa | Grid sách 5 cột, lọc Ebook / Audiobook | Grid sách 6-7 cột, lọc theo tủ sách và tác giả | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 12 | `/library/[id]` | **Chi tiết sách trong tủ** | Bìa sách, nút đọc ngay 36px, tải offline | 2 cột: Bìa + Mục lục và ghi chú | Giao diện tủ sách cao cấp, đồng bộ vị trí đọc | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 13 | `/library/devices` | **Quản lý thiết bị DRM** | Danh sách thiết bị (tối đa 5), nút hủy cấp phép | Bảng thiết bị, ngày đăng ký | Bảng quản lý chứng chỉ thiết bị | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 14 | `/reader` | **Trình đọc DRM WebReader** | Zen Mode tự ẩn thanh công cụ, chạm giữa mở menu | Căn chỉnh lề trang sách như máy đọc Kindle | Đọc 2 trang song song (Spread View) tùy chọn | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 15 | `/audiobooks` | **Trình nghe sách nói** | Mini-player ở đáy, bảng điều khiển tốc độ | Trình phát 2 cột: Audio + Mục lục | Giao diện phát âm thanh chuyên nghiệp | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 16 | `/following` | **Đang theo dõi** | Danh sách shop/tác giả, nút Bỏ theo dõi | Grid 2 cột shop đã theo dõi | Grid 3 cột kèm sách mới của shop | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 17 | `/messages` | **Hộp thư tin nhắn** | Khung chat toàn màn hình, thanh nhập đáy | 2 cột: Danh sách chat + Khung chat | 2 cột chuẩn mực, tích hợp gắn thẻ sản phẩm | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 18 | `/account/messages` | **Tin nhắn tài khoản** | Đồng bộ giao diện chat | Đồng bộ giao diện chat | Đồng bộ giao diện chat | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 19 | `/profile` | **Hồ sơ người dùng** | Avatar, form thông tin cá nhân dạng card | Bố cục 2 cột: Sidebar menu + Form | Sidebar tài khoản cố định + Khung cấu hình | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 20 | `/profile/addresses` | **Sổ địa chỉ** | Thẻ địa chỉ, nút Thêm địa chỉ mới | Grid 2 cột địa chỉ | Bảng địa chỉ, đặt mặc định | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 21 | `/profile/wallet` | **Ví HuKi & Số dư** | Thẻ số dư phẳng xanh sẫm #003B2B, lịch sử rút gọn | Thẻ số dư kèm biểu đồ dòng tiền | Bảng sao kê đầy đủ, bộ lọc tiền vào/tiền ra | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 22 | `/profile/security` | **Bảo mật tài khoản** | Bật xác thực 2FA, đổi mật khẩu | Card cài đặt bảo mật | Quản lý phiên đăng nhập & Lịch sử truy cập | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 23 | `/profile/reviews` | **Đánh giá của tôi** | Danh sách nhận xét đã gửi | Bảng đánh giá kèm phản hồi của Shop | Bảng quản lý đánh giá | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 24 | `/onboarding` | **Sở thích độc giả** | Chọn chủ đề đọc sách yêu thích | Lưới sở thích 3 cột | Lưới sở thích 4 cột | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 25 | `/affiliate` | **Giới thiệu Tiếp thị** | Trang thông tin chương trình đối tác | Bố cục 2 cột giới thiệu | Landing page tiếp thị liên kết | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 26 | `/account/affiliate/register` | **Đăng ký đối tác** | Form nộp hồ sơ tiếp thị | Form căn giữa 500px | Form 500px chuẩn KYC | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 27 | `/account/affiliate/application` | **Hồ sơ xét duyệt** | Trạng thái duyệt hồ sơ | Card trạng thái căn giữa | Card trạng thái kèm hướng dẫn | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 28 | `/account/affiliate/marketplace` | **Chợ sách tiếp thị** | Grid sách kèm % hoa hồng rõ ràng | Grid 3 cột sách tiếp thị | Bảng sách tiếp thị, nút tạo link 1 chạm | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 29 | `/account/affiliate/links` | **Quản lý link tiếp thị** | Danh sách link rút gọn, nút copy | Bảng link kèm số click | Bảng quản lý link + Tỷ lệ chuyển đổi | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 30 | `/account/affiliate/dashboard` | **Dashboard hoa hồng** | Thẻ hoa hồng tạm tính & thực nhận | Biểu đồ click và đơn hàng | Bảng thống kê hiệu suất tiếp thị | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |

---

## 4. Phân Hệ KÊNH NGƯỜI BÁN (SELLER) - 44 URLs

| STT | URL Tuyến Đường | Tên Trang / Chức Năng | Mobile (< 640px) | Tablet (640-1024px) | Desktop (>= 1024px) | Tiêu Chuẩn Anti-AI | Trạng Thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `/seller` | **Cổng người bán** | Chuyển hướng dashboard | Chuyển hướng dashboard | Chuyển hướng dashboard | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 2 | `/seller/dashboard` | **Dashboard KPI Shop** | 4 thẻ chỉ số 2x2 compact, việc cần làm | 4 thẻ chỉ số ngang, biểu đồ mỏng | Multi-metric grid, cảnh báo kho | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 3 | `/seller/products` | **Danh sách sản phẩm** | Thẻ sản phẩm kèm toggle bật bán | Bảng sản phẩm, sửa kho inline | Bảng đầy đủ: Bìa 32px, SKU, Kho, Giá, Thao tác | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 4 | `/seller/products/create` | **Tạo sản phẩm chung** | Bộ chọn định dạng sách | Wizard 3 bước tạo sách | Wizard tạo sản phẩm đa định dạng | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 5 | `/seller/product/create` | **Tạo sách (Alias)** | Đồng bộ quy trình tạo sách | Đồng bộ quy trình tạo sách | Đồng bộ quy trình tạo sách | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 6 | `/seller/product/create-physical` | **Thêm sách giấy** | Form thông tin sách, số trang, cân nặng | Form 2 cột chia nhóm thông số | Form xuất bản sách giấy chuyên nghiệp | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 7 | `/seller/product/create-ebook` | **Thêm Ebook DRM** | Upload file EPUB/PDF, đặt giá bán | Khung kéo thả tệp, kiểm tra DRM | Cấu hình bảo mật khóa DRM & Tải tệp số | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 8 | `/seller/product/create-hybrid` | **Thêm Combo Hybrid** | Ghép sách giấy + Ebook tặng kèm | Bảng định giá combo | Cấu hình gói lai Giấy + Số | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 9 | `/seller/product/edit-hybrid` | **Sửa Combo Hybrid** | Cập nhật giá và thành phần combo | Form sửa combo 2 cột | Quản lý gói lai | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 10 | `/seller/product/[id]/edit` | **Sửa sản phẩm** | Form sửa nhanh trên điện thoại | Form chỉnh sửa 2 cột | Giao diện chỉnh sửa chi tiết sản phẩm | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 11 | `/seller/products/[id]/edit` | **Sửa sách (Alias)** | Đồng bộ giao diện sửa sách | Đồng bộ giao diện sửa sách | Đồng bộ giao diện sửa sách | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 12 | `/seller/product/correction` | **Sửa theo kiểm duyệt** | Xem ghi chú Admin và sửa lỗi | Đối chiếu lý do từ chối và sửa | Split view: Lý do Admin vs Form sửa | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 13 | `/seller/products/[id]/correct` | **Sửa lỗi (Alias)** | Đồng bộ giao diện sửa lỗi kiểm duyệt | Đồng bộ giao diện sửa lỗi | Đồng bộ giao diện sửa lỗi | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 14 | `/seller/inventory` | **Quản lý kho hàng** | Danh sách SKU cảnh báo đỏ khi sắp hết | Bảng tồn kho kèm bộ lọc kho | Bảng tồn kho mật độ cao, nhập số lượng loạt | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 15 | `/seller/orders` | **Xử lý đơn bán** | Thẻ đơn cuộn dọc, nút xác nhận nhanh | Bảng đơn hàng có checkbox, lọc kênh | Bảng mật độ cao, Bulk Action bar ở đáy | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 16 | `/seller/orders/[id]` | **Chi tiết & In nhãn gửi** | Xem thông tin đơn, nút in nhãn | Chi tiết kiện hàng, xem trước nhãn | Xem trước nhãn nhiệt A6, in mã vạch 1 chạm | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 17 | `/seller/replacement-orders` | **Đơn đổi trả bù** | Danh sách đơn gửi bù cho khách | Bảng đơn đổi hàng | Quản lý đơn bù sau bảo hành | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 18 | `/seller/returns` | **Khiếu nại trả hàng RMA** | Thẻ khiếu nại kèm ảnh lỗi từ khách | Bố cục chia đôi: Bằng chứng vs Thao tác | Split-view: Bằng chứng khách vs Bằng chứng Shop | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 19 | `/seller/returns/[id]` | **Chi tiết ca trả hàng** | Bấm chấp thuận hoàn hoặc khiếu nại | 2 cột đối chiếu ca tranh chấp | Giao diện xử lý khiếu nại dứt điểm | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 20 | `/seller/appeals` | **Kháng cáo phán quyết** | Gửi đơn khiếu nại lên Admin | Form kháng cáo kèm tải biên lai | Bàn kháng cáo quyết định trọng tài | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 21 | `/seller/promotions/vouchers` | **Mã giảm giá shop** | Danh sách voucher, nút tạo mã | Bảng voucher, tỷ lệ dùng | Cấu hình chiết khấu voucher thông minh | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 22 | `/seller/vouchers` | **Voucher Shop (Alias)** | Đồng bộ giao diện voucher | Đồng bộ giao diện voucher | Đồng bộ giao diện voucher | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 23 | `/seller/promotions/flash-sale` | **Đăng ký Flash sale** | Chọn khung giờ tham gia | Bảng sách đăng ký flash sale | Cấu hình số lượng mở bán giá sốc | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 24 | `/seller/promotions/discounts` | **Chiết khấu combo** | Tạo khuyến mãi mua kèm deal sốc | Bảng chương trình giảm giá | Quản lý chiến dịch khuyến mãi | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 25 | `/seller/wallet` | **Ví doanh thu Shop** | Thẻ tiền khả dụng và tiền Escrow tạm giữ | Bảng quyết toán đơn hàng chi tiết | Bảng sao kê tài chính, xuất Excel | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 26 | `/seller/finance` | **Tài chính & Quyết toán** | Lệnh rút tiền về ngân hàng | Lịch sử dòng tiền và đối soát | Báo cáo tài chính doanh nghiệp | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 27 | `/seller/revenue` | **Báo cáo doanh số** | Biểu đồ doanh thu tuần/tháng | Phân tích kênh bán và tăng trưởng | Báo cáo chi tiết GMV, lợi nhuận ròng | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 28 | `/seller/transactions` | **Lịch sử giao dịch** | Danh sách biến động số dư | Bảng giao dịch kèm mã tham chiếu | Sao kê chi tiết có bộ lọc nâng cao | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 29 | `/seller/escrow` | **Quản trị Ký quỹ Escrow** | Danh sách đơn đang giữ tiền bảo vệ | Lịch trình tự động giải phóng tiền | Bảng đối chiếu tiền Escrow thời gian thực | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 30 | `/seller/reviews` | **Phản hồi đánh giá** | Đọc nhận xét khách, nút trả lời nhanh | Bảng đánh giá kèm bộ lọc sao | Quản lý uy tín shop, mẫu câu trả lời sẵn | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 31 | `/seller/chat` | **Chat CSKH người bán** | Hộp chat toàn màn hình, gửi ảnh hàng | 2 cột: Khách hàng + Khung chat | Giao diện CSKH chuyên nghiệp, ghim đơn hàng | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 32 | `/seller/notifications` | **Thông báo Shop** | Danh sách thông báo compact clean | Lọc thông báo theo Đơn/Ví/Hệ thống | Trung tâm thông báo Kênh Người Bán | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 33 | `/seller/business/notifications` | **Thông báo DN (Alias)** | Đồng bộ thông báo | Đồng bộ thông báo | Đồng bộ thông báo | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 34 | `/seller/business` | **Hồ sơ pháp lý Shop** | Xem thông tin giấy phép kinh doanh | Form cập nhật thông tin DN | Quản lý pháp nhân & Giấy phép xuất bản | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 35 | `/seller/stores` | **Danh sách kho & shop** | Danh sách chi nhánh | Bảng kho hàng và địa chỉ lấy hàng | Quản lý chuỗi chi nhánh và kho bãi | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 36 | `/seller/stores/new` | **Thêm kho mới** | Form nhập địa chỉ kho lấy hàng | Form 2 cột thông tin kho | Thiết lập kho bưu tá đến lấy | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 37 | `/seller/stores/setup` | **Thiết lập gian hàng** | Cài đặt logo, banner shop | Trình xem trước giao diện shop | Tùy biến nhận diện gian hàng | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 38 | `/seller/staff` | **Phân quyền nhân viên** | Danh sách nhân viên shop | Bảng phân quyền: Đóng gói / Kế toán | Quản lý tài khoản phụ (Sub-accounts) | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 39 | `/seller/followers` | **Độc giả theo dõi** | Số lượng follower và danh sách | Bảng phân tích độc giả trung thành | Báo cáo tệp khách hàng tiềm năng | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 40 | `/seller/profile` | **Cài đặt tài khoản shop** | Sửa tên shop, SĐT liên hệ | Cài đặt thông tin tài khoản | Trung tâm cấu hình gian hàng | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 41 | `/seller/register` | **Đăng ký bán hàng** | Quy trình 3 bước đăng ký mở shop | Form đăng ký doanh nghiệp | Quy trình xét duyệt gian hàng | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 42 | `/seller/pending` | **Chờ xét duyệt** | Màn hình theo dõi tiến độ duyệt | Card thông báo thời gian phản hồi | Trang chờ duyệt hồ sơ bán hàng | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 43 | `/seller/reports` | **Xuất báo cáo thuế** | Tải file báo cáo doanh thu | Xem trước số liệu kinh doanh | Xuất báo cáo tài chính và thuế | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 44 | `/seller/affiliate` | **Chính sách hoa hồng** | Bật/tắt chia hoa hồng cho sách | Cài đặt % hoa hồng cho từng đầu sách | Chiến dịch tiếp thị liên kết cho shop | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |

---

## 5. Phân Hệ CỔNG BƯU TÁ (SHIPPER) - 10 URLs

| STT | URL Tuyến Đường | Tên Trang / Chức Năng | Mobile (< 640px) | Tablet (640-1024px) | Desktop (>= 1024px) | Tiêu Chuẩn Anti-AI | Trạng Thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `/shipper` | **Cổng bưu tá** | Chuyển hướng nhận đơn | Chuyển hướng nhận đơn | Chuyển hướng nhận đơn | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 2 | `/shipper/login` | **Đăng nhập bưu tá** | Bàn phím số tự bật, nhập OTP/PIN 4-6 số | Tương tự mobile | Giao diện quản lý đội xe bưu cục | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 3 | `/shipper/available-orders` | **Kho đơn chờ nhận** | Radar đơn quanh đây, cự ly và phí rõ | Danh sách đơn theo cụm bưu cục | Bản đồ phân bổ mật độ đơn | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 4 | `/shipper/active-deliveries` | **Lộ trình đang giao** | Runsheet tối ưu, nút Gọi & Bản đồ 1 chạm | Danh sách đơn dạng bảng kiểm | Bảng điều phối chuyến xe | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 5 | `/shipper/history` | **Lịch sử giao hàng** | Danh sách các cuốc đã phát thành công | Bảng thống kê số cuốc trong ngày | Bảng tổng kết chuyến phát | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 6 | `/shipper/returns` | **Lấy hàng hoàn trả** | Danh sách đơn cần lấy từ khách về kho | Lộ trình lấy hàng ngược | Quản trị luồng logistics ngược | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 7 | `/shipper/remit-cod` | **Nộp tiền COD về ví** | Hạn mức COD đang giữ, mã VietQR nộp tiền | Bảng kê các món COD đã thu | Đối soát tiền mặt bưu tá nộp về kho | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 8 | `/shipper/wallet` | **Ví thu nhập bưu tá** | Số dư ví ký quỹ, tiền công mỗi đơn | Bảng kê thu nhập theo tuần | Bảng lương và phí giao nhận | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 9 | `/shipper/wallet/remit` | **Lệnh nộp tiền ví** | Tải ảnh biên lai chuyển tiền nộp COD | Form xác nhận nộp tiền | Đối soát giao dịch chuyển khoản | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 10 | `/shipper/profile` | **Hồ sơ tài xế** | Xem thông tin xe, tuyến đường phụ trách | Cài đặt thông tin bưu tá | Hồ sơ định danh tài xế | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |

---

## 6. Phân Hệ QUẢN TRỊ VIÊN (ADMIN) - 35 URLs

| STT | URL Tuyến Đường | Tên Trang / Chức Năng | Mobile (< 640px) | Tablet (640-1024px) | Desktop (>= 1024px) | Tiêu Chuẩn Anti-AI | Trạng Thái |
| :---: | :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | `/admin` | **Cổng Admin** | Chuyển hướng dashboard | Chuyển hướng dashboard | Chuyển hướng dashboard | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 2 | `/admin/dashboard` | **Executive Dashboard** | Thu gọn các widget chỉ số chính | Lưới chỉ số 2x2, nhật ký hệ thống | 5 thẻ KPI cấp cao, thông lượng realtime | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 3 | `/admin/accounts` | **Quản lý tài khoản** | Danh sách tài khoản thu gọn | Bảng tài khoản, phân vai trò | Bảng RBAC đầy đủ, gán quyền chi tiết | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 4 | `/admin/users` | **Người dùng toàn sàn** | Tìm kiếm người dùng theo SĐT/Email | Bảng người dùng, trạng thái kích hoạt | Quản trị hồ sơ độc giả, khóa/mở khóa | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 5 | `/admin/businesses` | **Quản trị doanh nghiệp** | Danh sách pháp nhân nhà sách | Bảng doanh nghiệp và mã số thuế | Quản lý hồ sơ đối tác xuất bản | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 6 | `/admin/business-requests` | **Duyệt mở gian hàng** | Danh sách đơn xin mở shop | Bảng duyệt hồ sơ đăng ký | Quy trình thẩm định và cấp phép bán | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 7 | `/admin/publishers` | **Nhà xuất bản** | Danh bạ các NXB đối tác | Bảng NXB, số lượng đầu sách | Quản lý quan hệ đối tác xuất bản | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 8 | `/admin/publisher-leads` | **Khách hàng tiềm năng** | Danh sách NXB đang liên hệ | Bảng tiến độ hợp tác | CRM quản lý đối tác xuất bản mới | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 9 | `/admin/shippers` | **Quản trị bưu tá** | Đội ngũ tài xế đang trực tuyến | Bảng bưu tá, tỷ lệ giao thành công | Quản lý bưu tá, duyệt hồ sơ tài xế | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 10 | `/admin/stores` | **Danh sách gian hàng** | Danh sách shop trên sàn | Bảng gian hàng, cảnh báo vi phạm | Quản lý toàn bộ storefront trên sàn | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 11 | `/admin/affiliates` | **Mạng lưới Tiếp thị** | Danh sách đối tác affiliate | Bảng affiliate, doanh số mang lại | Quản lý đối tác tiếp thị liên kết | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 12 | `/admin/book-moderation` | **Bàn duyệt sách & ISBN** | Xem nhanh thông tin sách chờ duyệt | Bảng danh sách chờ duyệt rút gọn | Dual-pane split view: Hồ sơ + Xem PDF | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 13 | `/admin/books` | **Quản lý kho sách sàn** | Tìm kiếm sách theo mã ISBN | Bảng sách toàn sàn, lọc trạng thái | Kho dữ liệu sách trung tâm, gỡ sách vi phạm | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 14 | `/admin/categories` | **Cây danh mục sách** | Cây thể loại sách thu gọn | Quản lý cây danh mục 2 cấp | Kéo thả sắp xếp danh mục và thể loại | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 15 | `/admin/drm-vault` | **Kho khóa số DRM Vault** | Trạng thái cụm máy chủ mã hóa | Bảng theo dõi máy chủ cấp phép DRM | Công cụ giải mã Forensic Watermark | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 16 | `/admin/ai-audiobooks` | **Cụm AI Audiobook** | Hàng đợi chuyển văn bản thành tiếng | Bảng tiến độ render âm thanh | Giám sát cụm máy chủ AI TTS Audio | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 17 | `/admin/disputes` | **Trọng tài tranh chấp** | Xem tóm tắt tranh chấp | Bảng phân xử 2 bên | 3-Column Arbitration Desk: Khách vs Shop | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 18 | `/admin/appeals` | **Xử lý kháng cáo** | Danh sách đơn kháng cáo | Bảng kháng cáo phán quyết | Tái thẩm định khiếu nại tranh chấp | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 19 | `/admin/return-requests` | **Duyệt trả hàng cấp cao** | Yêu cầu trả hàng cần Admin can thiệp | Bảng duyệt trả hàng khi shop từ chối | Phán quyết hoàn tiền bảo vệ quyền lợi | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 20 | `/admin/escrow` | **Sổ cái Escrow ký quỹ** | Tra cứu mã giao dịch ký quỹ | Bảng tổng hợp dòng tiền trung gian | Sổ cái Escrow chi tiết, giải phóng quỹ | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 21 | `/admin/finance` | **Tài chính & Quyết toán** | Tổng doanh thu và phí sàn thu về | Bảng đối soát dòng tiền cổng thanh toán | Báo cáo tài chính sàn, doanh thu thuần | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 22 | `/admin/promotions/vouchers` | **Voucher toàn sàn** | Danh sách mã ưu đãi HuKi | Bảng voucher, ngân sách tài trợ | Cấu hình mã giảm giá toàn hệ thống | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 23 | `/admin/vouchers` | **Voucher (Alias)** | Đồng bộ quản lý voucher | Đồng bộ quản lý voucher | Đồng bộ quản lý voucher | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 24 | `/admin/promotions/flash-sale` | **Chiến dịch Flash sale** | Xem khung giờ flash sale tới | Bảng phê duyệt sản phẩm flash sale | Lên lịch chiến dịch giảm giá giờ vàng | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 25 | `/admin/flash-sales` | **Flash sale (Alias)** | Đồng bộ flash sale | Đồng bộ flash sale | Đồng bộ flash sale | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 26 | `/admin/marketing` | **Quản trị Banner & Marketing** | Danh sách banner trang chủ | Bảng vị trí hiển thị quảng cáo | Quản lý banner sự kiện, popup thông báo | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 27 | `/admin/notifications` | **Phát thông báo Broadcast** | Gửi thông báo đẩy khẩn cấp | Mẫu thông báo cho từng nhóm đối tượng | Hệ thống gửi tin nhắn & thông báo toàn sàn | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 28 | `/admin/support` | **Trung tâm hỗ trợ CSKH** | Vé hỗ trợ cần xử lý | Bảng ticket CSKH, phân công nhân viên | Hệ thống giải quyết khiếu nại độc giả | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 29 | `/admin/seller-features` | **Cấu hình tính năng Shop** | Bật/tắt tính năng theo gói người bán | Bảng ma trận tính năng gian hàng | Feature Flags quản trị quyền lợi người bán | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 30 | `/admin/calendar` | **Lịch phát hành xuất bản** | Xem lịch sự kiện trong tuần | Lịch phát hành sách mới dạng lưới | Lịch xuất bản & Hội sách toàn quốc | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 31 | `/admin/reports` | **Báo cáo tổng hợp BI** | Tải báo cáo số liệu kinh doanh | Bảng phân tích tăng trưởng | Báo cáo kinh doanh thông minh (BI) | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 32 | `/admin/integrations` | **Cấu hình cổng tích hợp** | Trạng thái kết nối VNPAY/GHTK | Bảng API Keys các dịch vụ đối tác | Cấu hình Webhook, SMS Gateway, VNPAY | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 33 | `/admin/health` | **Sức khỏe vi dịch vụ** | Đèn trạng thái container Docker | Danh sách 7 microservice PM2 | Bảng chi tiết CPU, RAM, Uptime, Gateway | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 34 | `/admin/maintenance` | **Bật/Tắt bảo trì** | Nút kích hoạt chế độ bảo trì | Cấu hình thời gian dự kiến mở lại | Quản trị trang bảo trì & IP ngoại lệ | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |
| 35 | `/admin/settings` | **Cấu hình hệ thống** | Cài đặt cơ bản tên sàn, hotline | Form cấu hình hệ thống | Tham số toàn cục, phí sàn, hạn mức | Compact, Zero-Emoji, Viền slate-200 | `CHỜ DUYỆT` |

---

## 7. Tiêu Chí Nghiệm Thu Bắt Buộc Khi Refactor Từng URL (Definition of Done)

Mỗi URL trong danh sách 141 trang trên chỉ được chuyển trạng thái sang `ĐÃ HOÀN TẤT` khi đáp ứng đủ 5 điều kiện:
1. **Size Scale Compact:** Nút bấm cao tối đa 36px (`h-9`), ô input cao tối đa 36px, card padding từ 14px đến 16px.
2. **Zero Emoji:** 100% mã nguồn trang không chứa emoji trong tiêu đề, placeholder, badge.
3. **Subtle Hairline Borders:** 100% đường viền sử dụng `border-slate-200/80` (hoặc `border-zinc-800` ở dark mode), không viền neon/gradient.
4. **Single Badge Rule:** Tối đa 1 nhãn trạng thái duy nhất trên mỗi khối phần tử, bỏ các badge chồng chéo.
5. **Responsive Test Passed:** Hoạt động hoàn hảo trên Mobile (375-390px), Tablet (768-820px) và Desktop (1440-1920px), không bị vỡ layout hay tràn ngang.
