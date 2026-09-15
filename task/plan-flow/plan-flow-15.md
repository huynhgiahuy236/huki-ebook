# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 15
## TRÌNH ĐỌC WEB DRM READER AN TOÀN & BẢO MẬT (SECURE WEB DRM READER: ANTI-COPY, ANTI-F12 & CUSTOM READING MODES)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng ứng dụng Trình đọc sách điện tử trực tuyến (Web DRM Reader) hiệu năng cao, tối ưu trải nghiệm đọc sách với 3 chế độ màu nền (Light, Dark, Sepia), tùy biến font chữ, đánh dấu trang và tự động lưu tiến độ đọc. Đồng thời tích hợp lá chắn bảo mật bản quyền số đa tầng (DRM Shield) nhằm ngăn chặn tuyệt đối các hành vi sao chép nội dung, in ấn, mở mã nguồn F12/DevTools và trích xuất tệp sách trái phép.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `drm-service`: Module `DrmSessionModule`, `DrmStreamingService`, `DrmKeyExchangeService` (cấp Token phiên đọc ngắn hạn và truyền tải luồng mã hóa từng chương).
    * `reader-service`: Module `ReadingProgressService`, `BookmarksService` (lưu trữ và đồng bộ tiến độ đọc).
    * Prisma Schema: Bảng `reading_progress`, `book_bookmarks`.
  * **Frontend (Web Reader App)**:
    * `web/src/ui/pages/reader/WebReaderPage.jsx`: Màn hình chính của trình đọc sách toàn màn hình.
    * `web/src/ui/components/reader/DrmSecurityShield.jsx`: Component bảo vệ can thiệp DOM chặn phím tắt, bôi đen và phát hiện DevTools.
    * `web/src/ui/components/reader/ReaderSettingsDrawer.jsx`: Bảng điều khiển cài đặt giao diện đọc (Font, Size, Line Height, Theme).
    * `web/src/ui/components/reader/TableOfContentsDrawer.jsx`: Ngăn kéo hiển thị mục lục các chương và danh sách bookmark.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 15
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  DRM STREAMING ENGINE   CLIENT DRM SHIELD      WEB READER UI &  SECURITY TESTING
PROGRESS MODEL   & SESSION AUTH         & DEVTOOLS DETECTOR    CUSTOM UX MODES  & ANTI-COPY AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA TIẾN ĐỘ ĐỌC

### 📌 Mục tiêu:
Thiết lập bảng lưu trữ tiến độ đọc `reading_progress` và đánh dấu trang `book_bookmarks` trên PostgreSQL.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `reading_progress`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `user_id`: UUID, Index, FK `users`.
    * `book_id`: UUID, Index, FK `books`.
    * `current_cfi_or_page`: String (Vị trí định vị trang).
    * `progress_percentage`: Decimal (0 - 100%).
    * `current_chapter_title`: String (Nullable).
    * `last_read_at`: DateTime (Tự động cập nhật).
    * Unique Index: `[user_id, book_id]`.

* **Task 1.2: Thiết kế Bảng `book_bookmarks`**
  * Định nghĩa bảng bookmark:
    * `id`: UUID, Primary Key.
    * `user_id`: UUID, FK `users`.
    * `book_id`: UUID, FK `books`.
    * `cfi_or_page`: String.
    * `chapter_name`: String.
    * `highlighted_note`: String (Nullable).
    * `created_at`: DateTime.

---

## PHẦN 2: PHÁT TRIỂN DRM SESSION AUTH & CHUNKED DECRYPTION STREAMING

### 📌 Mục tiêu:
Xây dựng dịch vụ xác thực bản quyền, cấp mã phiên đọc an toàn và truyền tải luồng dữ liệu nhị phân từng chương.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: API Khởi Tạo Phiên Đọc Sách An Toàn**
  * **Endpoint**: `POST /api/v1/drm/session/init`
  * **Body**: `{ bookId: "uuid" }`
  * **Xử lý**:
    * Kiểm tra `user_ebook_licenses` xem có bản quyền `ACTIVE` hay không. Nếu không có &rarr; Trả về mã lỗi 403 Forbidden.
    * Lấy thông tin `reading_progress` cũ.
    * Sinh mã `SessionToken` bảo mật (TTL 30 phút, ký bằng JWT/AES).
    * Trả về: `{ sessionToken, lastCfi: "...", bookMetadata: {...} }`.

* **Task 2.2: API Truyền Tải Luồng Nội Dung Mã Hóa Theo Chương**
  * **Endpoint**: `GET /api/v1/drm/content/stream`
  * **Header**: `Authorization: Bearer <sessionToken>`, `X-Chapter-Index: <n>`
  * **Xử lý**:
    * Đọc dữ liệu chương thứ $N$ từ két an toàn DRM Vault.
    * Mã hóa bằng khóa phiên ngắn hạn (AES-128-GCM) và truyền tải luồng nhị phân (Binary Stream) về Client.
    * Đảm bảo Client không thể tải trọn gói toàn bộ cuốn sách trong một tệp tin.

---

## PHẦN 3: XÂY DỰNG LÁ CHẮN BẢO VỆ BẢN QUYỀN DRM (CLIENT SHIELD)

### 📌 Mục tiêu:
Triển khai module bảo vệ phía trình duyệt chặn đứng 100% các thao tác sao chép, chụp ảnh, in ấn và mở mã nguồn.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Triển khai Component Lá Chắn Bảo Vệ (`DrmSecurityShield.jsx`)**
  * **Anti-Copy**: CSS `-webkit-user-select: none !important; user-select: none !important;`.
  * **Keyboard Interceptor**: Lắng nghe sự kiện `keydown`, chặn:
    * `Ctrl+C`, `Cmd+C`, `Ctrl+A`, `Cmd+A`, `Ctrl+X`, `Ctrl+S`, `Ctrl+U`.
    * `Ctrl+P`, `Cmd+P` (Chặn in ấn).
    * `F12`, `Ctrl+Shift+I`, `Ctrl+Shift+J`, `Ctrl+Shift+C`.
  * **Anti-Context Menu**: Chặn sự kiện `contextmenu` (chuột phải).

* **Task 3.2: Triển khai Bộ Giám Sát & Phát Hiện DevTools (Anti-Debugger Hook)**
  * Giám sát kích thước trình duyệt và vòng lặp `debugger`:
    * Nếu phát hiện DevTools được kích hoạt: Tự động kích hoạt lớp phủ màu đen (Overlay Shield) che kín nội dung sách.
    * Hiển thị cảnh báo: *"⚠️ Phát hiện công cụ phát triển. Vui lòng đóng DevTools để tiếp tục đọc sách!"*.

---

## PHẦN 4: THIẾT KẾ GIAO DIỆN TRÌNH ĐỌC & TÙY BIẾN CHẾ ĐỘ ĐỌC

### 📌 Mục tiêu:
Xây dựng trình đọc sách toàn màn hình chuyên nghiệp với 3 chế độ màu nền và thanh công cụ tiện ích.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Trang Trình Đọc ([`WebReaderPage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/reader/WebReaderPage.jsx))**
  * Thanh Header nổi (Floating Toolbar - tự động ẩn khi đọc, hiện khi rê chuột):
    * Nút Thoát (Về Tủ sách), Tên sách, Tên chương hiện tại, Nút Mục lục, Nút Cài đặt hiển thị, Nút Đánh dấu trang 🔖.
  * Khung hiển thị nội dung sách hỗ trợ:
    * Chế độ lật trang (Page Flip) bằng phím mũi tên $\leftarrow / \rightarrow$ hoặc vuốt chạm trên Mobile.
    * Chế độ cuộn dọc liên tục (Continuous Scroll).

* **Task 4.2: Xây dựng Bảng Cài Đặt Giao Diện (`ReaderSettingsDrawer.jsx`)**
  * **3 Chủ đề màu nền**:
    * ☀️ **Light Mode**: Nền trắng `#FFFFFF`, chữ đen xám dịu mắt.
    * 🌙 **Dark Mode**: Nền đen tuyền `#121212`, chữ xám sáng `#E0E0E0`.
    * 📜 **Sepia Mode**: Nền vàng ngà sách cổ `#F8F1E3`, chữ nâu sẫm `#4A3B32`.
  * **Cài đặt Font & Cỡ chữ**:
    * Bộ font: `Merriweather`, `Roboto`, `Inter`, `Bookerly`.
    * Thanh trượt cỡ chữ ($14\text{px} - 30\text{px}$) và khoảng cách giãn dòng ($1.4 - 1.8$).

* **Task 4.3: Xây dựng Ngăn Kéo Mục Lục & Đánh Dấu Trang (`TableOfContentsDrawer.jsx`)**
  * Tab 1: Danh sách các chương/phần của cuốn sách (bấm để chuyển chương).
  * Tab 2: Danh sách các trang đã Bookmark kèm ghi chú.

---

## PHẦN 5: KIỂM THỬ BẢO MẬT & ĐÁNH GIÁ CHỐNG TRÍCH XUẤT LẬU (TEST SUITE)

### 📌 Mục tiêu:
Xác thực độ an toàn tuyệt đối của lá chắn DRM và độ mượt mà của trải nghiệm đọc sách.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Kiểm thử Xâm Nhập & Thử Nghiệm Sao Chép (Penetration Test)**
  * Thử bôi đen text, bấm `Ctrl+C`, click chuột phải &rarr; Xác nhận không lấy được ký tự nào.
  * Thử bấm `Ctrl+P` &rarr; Xác nhận trang in ra trống rỗng.
  * Thử bấm `F12` &rarr; Xác nhận bị chặn và màn hình tự động làm mờ khi mở Console.

* **Task 5.2: Kiểm thử Đồng Bộ Tiến Độ Đọc Xuyên Thiết Bị**
  * Đọc đến trang 40 trên Laptop &rarr; Đăng nhập trên Điện thoại mở lại: Xác nhận sách tự động mở đúng trang 40.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `reading_progress`, `book_bookmarks` | ⏳ Sẵn sàng | Backend Team |
| **DRM Vault** | API cấp SessionToken và truyền tải luồng mã hóa từng chương | ⏳ Sẵn sàng | Backend Team |
| **DRM Shield** | Client Shield chặn Copy, Chuột phải, In ấn, F12, DevTools Detector | ⏳ Sẵn sàng | Frontend Team |
| **Web Reader UI** | Giao diện toàn màn hình, 3 Theme màu (Light, Dark, Sepia) & TOC | ⏳ Sẵn sàng | Frontend Team |
| **Progress Sync**| Tự động lưu và mở lại đúng trang đang đọc dở | ⏳ Sẵn sàng | Fullstack Team |
| **Security Audit**| Vượt qua 100% Ma trận kiểm thử bảo mật bản quyền (TC_DRM_01 đến 06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 15 thuộc Nền tảng Sách Huki Ebook.*
