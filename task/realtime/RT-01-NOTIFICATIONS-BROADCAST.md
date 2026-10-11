# 📢 RT-01: REALTIME NOTIFICATIONS & SYSTEM BROADCAST (ĐÃ CHỐT UI/UX)

> **Mục tiêu:** Đồng bộ thông báo thời gian thực đa chiều (Admin phát thông báo $\to$ Seller nhận tức thì $\to$ Khách mua nhận thông báo đơn hàng), cập nhật badge số đỏ và popup toast không cần tải lại trang.
> **Trạng thái UI/UX:** ✅ Đã duyệt chốt quy chuẩn giao diện (Accordion Menu, Top-Right Toast, Notification Popover 380px, Audio Chime).

---

## 🎨 1. QUY CHUẨN UI/UX ĐÃ CHỐT VỚI NGƯỜI DÙNG

### A. Thanh Menu Điều Hướng (Sidebar Accordion)
* **Cấu trúc:** Áp dụng mô hình **Accordion** thu gọn / bung mở cho cả Admin và Seller theo **7 phân hệ chuyên biệt**.
* **Cơ chế hoạt động:**
  * Mỗi nhóm lớn có Icon + Tiêu đề + Mũi tên chevron (`›`).
  * Mặc định tự động mở nhóm phân hệ của trang đang active, các nhóm khác thu gọn lại gọn gàng.
  * Bấm vào tiêu đề nhóm $\to$ Bung các mục con bên trong với animation trượt mượt mà (smooth accordion height transition).
  * Badge thông báo số đỏ (ví dụ: `2` ở Thông báo, `97` ở Sách) hiển thị nổi bật trên cả nhóm cha lẫn mục con.

### B. Popup Toast Thông Báo Realtime (Top-Right Toast Container)
* **Vị trí cố định:** Góc trên bên phải màn hình (`fixed top-5 right-5 z-50 flex flex-col gap-3`).
* **Quy cách Card Toast:**
  * Kích thước: Rộng `360px`, bo góc tròn `rounded-2xl`, viền mảnh `border border-white/20`, đổ bóng mềm `shadow-2xl`.
  * Hiệu ứng: Trượt vào từ bên phải (`animate-in slide-in-from-right-8 duration-300`).
  * Icon nhận diện theo màu chủ đề:
    * 📦 **Xanh lục (Emerald):** Đơn hàng mới, thanh toán PayOS thành công.
    * 📢 **Tím (Indigo):** Thông báo phát sóng khẩn từ Admin.
    * 💰 **Vàng kim (Amber):** Biến động số dư ví, tiền Escrow về.
    * ⚠️ **Đỏ (Rose):** Cảnh báo vi phạm, thông báo bảo trì tính năng.
  * **Thanh đếm ngược tự đóng (Progress Bar):** Chạy vơi dần từ 100% về 0% trong vòng **5 giây**, hết thời gian thẻ tự đóng.
  * Nút "Xem chi tiết" dẫn thẳng tới trang nghiệp vụ + Nút "✕" đóng thủ công.

### C. Âm Thanh Thông Báo (Audio Chime) & Nút Mute trên Header
* Sử dụng file âm thanh chuẩn `notification-chime.mp3` nhẹ nhàng, tinh tế (âm sắc ding êm ái, âm lượng 40% để không giật mình).
* **Nút Mute/Unmute trên Top Header:**
  * Nằm cạnh Quả chuông thông báo (Icon Loa có sóng âm 🔊 / Loa gạch chéo 🔇).
  * Lưu trạng thái tắt/bật chuông vào `localStorage` để ghi nhớ tùy chọn của người dùng.

### D. Hộp Thông Báo Thả Xuống (Notification Center Popover)
* Kích thước: Khung dropdown rộng `380px`, đổ bóng sâu.
* Cấu trúc 3 Tab:
  * `[Tất cả]` — Hiển thị toàn bộ lịch sử thông báo.
  * `[Đơn hàng]` — Chỉ lọc các thông báo liên quan đến đơn hàng và thanh toán.
  * `[Hệ thống]` — Các cảnh báo sàn, thông báo bảo trì từ Admin.
* Header có nút: **"Đánh dấu tất cả đã đọc"** (click vào $\to$ Xóa toàn bộ chấm xanh và trừ hết badge số đỏ trên Sidebar).

---

## 🔍 2. PHẠM VI ẢNH HƯỞNG (SCOPE & IMPACT ANALYSIS)

### A. Frontend (Giao diện người dùng)
* `AdminLayout.tsx`: Nâng cấp Sidebar Accordion 7 phân hệ + Quả chuông Popover + Nút Mute loa.
* `SellerSidebar.tsx`: Nâng cấp Sidebar Accordion 7 phân hệ + Nảy số đỏ badge.
* `GlobalToastContainer.tsx`: Component quản lý danh sách Toast nổi góc trên bên phải.

### B. Backend (Microservices)
* `community-service`: Quản lý `NotificationGateway` (`/notifications` namespace).
* `commerce-service`: Bắn event khi có đơn hàng mới, cập nhật trạng thái tiền bạc.
* CSDL: Bảng `notifications` (PostgreSQL) lưu vết lịch sử thông báo, cờ `is_read`.

---

## 🛠️ 3. CÁC BƯỚC THI CÔNG CHI TIẾT (STEP-BY-STEP EXECUTION)

1. **Bước 1 (Âm thanh & Toast Component):** Tạo component `ToastNotification.tsx` và hook phát âm thanh `useAudioChime.ts`.
2. **Bước 2 (Nâng cấp Sidebar Accordion):** Cập nhật `AdminLayout.tsx` và `SellerSidebar.tsx` sang dạng 7 nhóm có thể đóng/mở mượt mà.
3. **Bước 3 (Backend Socket Broadcast):** Hoàn thiện `NotificationGateway` tại `community-service` hỗ trợ emit tới room `user_{id}`, `store_{id}` và `broadcast_all`.
4. **Bước 4 (Tích hợp Notification Popover):** Nối quả chuông Header với API đọc thông báo thật và realtime listener.
5. **Bước 5 (Kiểm thử thực tế trên Browser):** Mở 2 tab Admin và Seller $\to$ Bắn thử thông báo $\to$ Quan sát Toast nảy, âm thanh kêu, badge nảy số.

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ & KẾT QUẢ NGHIỆM THU (TESTING & ACCEPTANCE)

* [x] **Test Case 1:** Admin & Seller Sidebar Accordion 7 nhóm: Các phân hệ nhóm tự động bung nhóm chứa active route, đóng/mở mượt mà không xung đột layout.
* [x] **Test Case 2:** Bấm nút Mute/Unmute trên Top Header: Lưu trạng thái vào `localStorage`, âm thanh Web Audio API (`SoundEffectsManager`) bật/tắt chính xác mà không phụ thuộc file mp3 ngoài.
* [x] **Test Case 3:** Hệ thống Toast thời gian thực góc trên bên phải (Top-Right): Hỗ trợ thanh Progress Bar đếm ngược 5s, Stack tối đa 3 toast, hỗ trợ chuyển hướng nhanh qua nút CTA.
* [x] **Test Case 4:** Đồng bộ Realtime Broadcast qua `realtimeSyncBus` và Cross-tab storage: Seller nhận thông báo nảy Toast ngay lập tức khi Admin phát sóng thông báo mới.

> **Trạng thái:** ✅ **HOÀN THÀNH (COMPLETED)** — Đã qua kiểm thử thực tế trên trình duyệt và biên dịch TypeScript thành công 100%.
