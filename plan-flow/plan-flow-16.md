# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 16
## THỦY ẤN ĐỘNG CHỐNG PHÁT TÁN LẬU (DYNAMIC FORENSIC WATERMARKING: BUYER IDENTITY OVERLAY)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng engine tạo và kết xuất thủy ấn động giám định pháp y (Dynamic Forensic Watermark) phủ kín bề mặt các trang sách trên Web DRM Reader. Lớp thủy ấn in chìm mờ 5 thông tin định danh của người mua (Email, SĐT, User ID, Order ID, Timestamp), áp dụng thuật toán dịch chuyển vi mô ngẫu nhiên (Micro-Jittering) mỗi 30 giây để chống phần mềm AI xóa watermark và tích hợp cơ chế phòng thủ `MutationObserver` nhằm ngắt hiển thị sách nếu có hành vi can thiệp gỡ bỏ lớp Canvas khỏi DOM.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `drm-service`: Module `WatermarkPayloadService` (trích xuất thông tin người mua từ Token phiên và đóng gói chuỗi Stencil mã hóa).
  * **Frontend (Web Reader App)**:
    * `web/src/ui/components/reader/DynamicWatermarkCanvas.jsx`: Component Canvas phủ kín trang sách render ma trận lưới nghiêng $-30^\circ$.
    * `web/src/ui/components/reader/WatermarkTamperGuard.jsx`: Bộ giám sát MutationObserver theo dõi sự toàn vẹn của phần tử Canvas.
    * `web/src/ui/hooks/useWatermarkJitter.ts`: Custom Hook điều khiển chu kỳ dịch chuyển vi mô $\pm 5\text{px}$ và cập nhật Timestamp thời gian thực.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 16
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
BACKEND PAYLOAD  CANVAS STENCIL         MICRO-JITTERING &      DOM TAMPER GUARD FORENSIC AUDIT &
& CONFIG SERVICE RENDER ENGINE          ADAPTIVE THEMING       & AUTO-BLANKING  ANTI-REMOVAL TEST
```

---

## PHẦN 1: PHÁT TRIỂN BACKEND WATERMARK PAYLOAD & CẤU HÌNH HỆ THỐNG

### 📌 Mục tiêu:
Trích xuất dữ liệu định danh người mua từ Token phiên bản quyền và cung cấp bảng cấu hình thủy ấn linh hoạt.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Triển khai Module `WatermarkPayloadService` trong `drm-service`**
  * Khi client gọi `POST /api/v1/drm/session/init`:
    * Trích xuất thông tin từ tài khoản người dùng: `email`, `phone` (che 3 số giữa: `098***1234`), `userId`, `orderCode`.
    * Đóng gói cấu trúc Payload:
      ```json
      {
        "watermarkText": "HukiEbook • {email} • UID:{userId} • {orderCode}",
        "config": {
          "rotation": -30,
          "gridX": 280,
          "gridY": 160,
          "opacity": { "light": 0.08, "dark": 0.06, "sepia": 0.07 }
        }
      }
      ```

---

## PHẦN 2: THIẾT KẾ COMPONENT CANVAS RENDER LƯỚI MA TRẬN NGHIÊNG

### 📌 Mục tiêu:
Xây dựng component Canvas trong suốt lồng ghép phía trên trang sách và thuật toán vẽ lưới ma trận chữ nghiêng $-30^\circ$.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Xây dựng Component ([`DynamicWatermarkCanvas.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/reader/DynamicWatermarkCanvas.jsx))**
  * Khởi tạo thẻ `<canvas id="drm-forensic-canvas" />`:
    * `position: absolute; top: 0; left: 0; width: 100%; height: 100%;`
    * `pointer-events: none !important; z-index: 10;`
  * Đồng bộ kích thước Canvas theo kích thước thực tế của vùng hiển thị sách (`ResizeObserver`).

* **Task 2.2: Thuật toán Vẽ Ma Trận Lưới Nghiêng (Tiled Grid Drawing Algorithm)**:
  * Hàm `drawWatermarkGrid(ctx, text, theme, offset)`:
    1. Xóa sạch Canvas cũ bằng `ctx.clearRect()`.
    2. Lưu trạng thái `ctx.save()`.
    3. Xoay góc nghiêng `ctx.rotate((-30 * Math.PI) / 180)`.
    4. Thiết lập font: `13px Roboto, sans-serif`.
    5. Thiết lập màu chữ và độ trong suốt thích ứng theo Theme hiện tại.
    6. Lặp qua các tọa độ $X, Y$ với bước nhảy $280\text{px} \times 160\text{px}$ để in đều chuỗi chữ kèm Dấu thời gian.
    7. Khôi phục trạng thái `ctx.restore()`.

---

## PHẦN 3: THUẬT TOÁN DỊCH CHUYỂN VI MÔ (MICRO-JITTERING) & HÒA TRỘN THEME

### 📌 Mục tiêu:
Triển khai cơ chế nhảy tọa độ ngẫu nhiên định kỳ chống công cụ AI xóa watermark và hòa trộn màu sắc thích ứng.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Xây dựng Hook `useWatermarkJitter.ts`**
  * Quản lý State: `offset = { x: 0, y: 0 }`, `currentTimestamp = new Date()`.
  * Thiết lập `setInterval` chu kỳ **30 giây**:
    * Sinh tọa độ ngẫu nhiên: $\Delta X \in [-5, +5]\text{px}$, $\Delta Y \in [-5, +5]\text{px}$.
    * Cập nhật `currentTimestamp` thành thời gian thực tế mới nhất.
    * Kích hoạt render lại Canvas với tọa độ mới.

* **Task 3.2: Bộ Thích Ứng Màu Sắc Theo Chế Độ Nền (Adaptive Color Blend)**
  * Chế độ **Light Mode**: Màu chữ `#757575`, `Opacity = 0.08`.
  * Chế độ **Dark Mode**: Màu chữ `#E0E0E0`, `Opacity = 0.06`.
  * Chế độ **Sepia Mode**: Màu chữ `#8D6E63`, `Opacity = 0.07`.
  * Tự động phản hồi tức thì khi độc giả chuyển Theme trong bảng cài đặt Reader Settings.

---

## PHẦN 4: LÁ CHẮN GIÁM SÁT DOM CHỐNG GỠ BỎ (ANTI-TAMPERING SHIELD)

### 📌 Mục tiêu:
Bảo vệ phần tử Canvas khỏi các hành vi can thiệp, ẩn hoặc gỡ bỏ qua DevTools / Console.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Module Giám Sát `WatermarkTamperGuard.jsx`**
  * Khởi tạo `MutationObserver` lắng nghe phần tử cha của Canvas:
    * Giám sát: `childList: true, attributes: true, subtree: true`.
  * Kiểm tra tính toàn vẹn:
    1. Nếu thẻ `<canvas id="drm-forensic-canvas">` bị xóa khỏi DOM.
    2. Nếu thẻ Canvas bị thay đổi thuộc tính: `display === 'none'`, `visibility === 'hidden'`, `opacity === '0'`.
  * Hành động phản ứng tức thì:
    * Ngắt hiển thị nội dung sách ngay lập tức (Content Blanking).
    * Hiển thị màn hình đen khóa phiên đọc kèm thông báo: *"⚠️ Lớp phủ bản quyền bị can thiệp trái phép. Phiên đọc đã bị tạm dừng!"*.

---

## PHẦN 5: KIỂM THỬ GIÁM ĐỊNH PHÁP Y & ĐÁNH GIÁ TRUY VẾT NGUỒN LẬU (TEST SUITE)

### 📌 Mục tiêu:
Xác thực khả năng giám định và truy vết nguồn gốc phát tán lậu từ ảnh chụp màn hình thực tế.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Kiểm thử Can Thiệp DOM Trực Tiếp (Tamper Resistance Test)**
  * Dùng DevTools chỉnh CSS `display: none` của Canvas &rarr; Xác nhận màn hình sách lập tức bị khóa và ngắt hiển thị.

* **Task 5.2: Thử Nghiệm Tăng Tương Phản Truy Vết (Forensic Traceability Test)**
  * Chụp ảnh màn hình ở cả 3 chế độ (Light, Dark, Sepia).
  * Đưa ảnh vào công cụ xử lý tăng độ tương phản (Auto-Levels / High Pass Filter) &rarr; Xác nhận chuỗi Email, UID và OrderCode hiện lên rõ nét $100\%$.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Backend Payload** | Trích xuất thông tin định danh 5 yếu tố từ Token phiên | ⏳ Sẵn sàng | Backend Team |
| **Canvas Engine** | Render ma trận lưới nghiêng $-30^\circ$ phủ kín trang sách | ⏳ Sẵn sàng | Frontend Team |
| **Micro-Jittering** | Chu kỳ dịch chuyển ngẫu nhiên $\pm 5\text{px}$ mỗi 30 giây | ⏳ Sẵn sàng | Frontend Team |
| **Adaptive Blend** | Tự động hòa trộn màu sắc thích ứng theo 3 chế độ nền | ⏳ Sẵn sàng | Frontend Team |
| **DOM Tamper Guard**| `MutationObserver` ngắt hiển thị sách khi Canvas bị can thiệp | ⏳ Sẵn sàng | Frontend Team |
| **Forensic Audit** | Vượt qua 100% Ma trận kiểm thử giám định pháp y (TC_WM_01 đến 06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 16 thuộc Nền tảng Sách Huki Ebook.*
