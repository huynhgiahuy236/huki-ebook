# MOD-04: Cổng Giao Hàng & Đối Soát COD (Shipper & Logistics Portal)

> **Phạm vi kiểm thử toàn diện:** Gồm đầy đủ **10 Màn hình & Luồng vận hành thực địa, 3 Phân hệ điều phối bưu tá, Hệ thống theo dõi công nợ COD và Chế độ trực ca Online/Offline** của HUKI Express (`/shipper/*`).  
> **Cam kết:** 
> 1. Không tự ý sửa bất kỳ dòng code nào.
> 2. Ghi nhận và bóc tách lỗi chi tiết khi kiểm thử vào file bug riêng biệt (`tasks/bug-mod04.md`).
> 3. Trình kế hoạch chi tiết này và **chờ người dùng phê duyệt trước khi bắt đầu thực hiện kiểm thử**.

---

## 🎨 BỘ TIÊU CHUẨN THIẾT KẾ ANTI-AI & GIAO DIỆN THỰC ĐỊA BƯU TÁ (FIELD LOGISTICS & HIGH-AFFORDANCE UX)

Dựa trên bộ kỹ năng `skill/.gemini/skills/ui-ux-pro-max`, Cổng Giao Hàng & Logistics HUKI Express là ứng dụng chuyên dụng cho tài xế/bưu tá di chuyển ngoài trời, đòi hỏi tính thực dụng cực cao, hoàn toàn loại bỏ các thiết kế màu mè kiểu "AI mockup":

1. **🚫 Triệt Tiêu Tuyệt Đối Các Yếu Tố AI Cliché Thiếu Thực Tế:**
   - **Không dùng chữ xám mờ / tương phản kém:** Cấm dùng text màu xám nhạt (`text-gray-400`, `text-slate-400`) trên nền trắng. Bưu tá xem màn hình ngoài trời nắng gắt yêu cầu độ tương phản tối đa (High Contrast WCAG AAA $\ge 7:1$), chữ màu đen than (`text-slate-900`) hoặc xanh đậm (`text-[#003B2B]`).
   - **Không nút bấm nhỏ, viền mỏng manh khó bấm:** Cấm các nút bấm kích thước nhỏ hơn 48px. Khi chạy xe máy hoặc đeo găng tay, touch target tối thiểu phải là `h-12` đến `h-14` (48px - 56px), padding ngón tay hào phóng.
   - **Không dùng hiệu ứng đổ bóng mờ ảo, hiệu ứng kính mờ (Glassmorphism):** Hiệu ứng kính mờ `backdrop-blur` làm giảm độ đọc ngoài trời. Thay bằng các thẻ trắng đặc (`bg-white`), viền dứt khoát (`border border-slate-200`) và bóng đổ cứng nhẹ (`shadow-sm`).
   - **Không dùng Emoji Text thô cho giao nhận:** Cấm dùng `📞`, `📦`, `📸`, `💵`. Phải dùng Google Material Symbols vector chuyên dụng (`call`, `local_shipping`, `photo_camera`, `payments`).

2. **⚡ Bảng Màu Tương Phản Ngoài Trời & Trạng Thái Trực Ca:**
   - **Chế độ Trực Ca (Online/Offline Toggle):**
     - Trực ca sẵn sàng: Nền xanh lá nhận diện cao `bg-emerald-600 text-white font-bold`, có chỉ báo trạng thái rõ rệt.
     - Tạm nghỉ: Nền Slate trung tính `bg-slate-200 text-slate-700`.
   - **Phân định rạch ròi Tiền COD vs Thu nhập cá nhân:**
     - Tiền thu hộ COD (Nợ công ty): Hiển thị màu cảnh báo rõ ràng `text-amber-700 bg-amber-50 border border-amber-200`, kèm nhãn "Tiền nộp về sàn".
     - Thu nhập ròng bưu tá (Tiền của tài xế): Hiển thị màu xanh thịnh vượng `text-emerald-700 bg-emerald-50 border border-emerald-200`.

3. **📱 Typography Công Thái Học Di Động (Mobile Ergonomics):**
   - **Số tiền COD cần thu:** Cỡ chữ siêu lớn `font-mono text-2xl font-black text-slate-900`, không bao giờ để bưu tá nhìn nhầm số tiền lẻ.
   - **Số điện thoại khách hàng & Địa chỉ:** Dạng link bấm gọi điện trực tiếp `tel:...` và link mở Google Maps / Apple Maps trực tiếp `geo:...` mà không cần copy paste thủ công.

4. **📸 Luồng Tải Ảnh Bằng Chứng Giao Hàng Siêu Tốc (Proof of Delivery UX):**
   - Hỗ trợ chụp trực tiếp từ camera di động, tự động nén ảnh client-side xuống $< 500KB$ để upload tức thì ngay cả khi mạng 4G chập chờn trên đường phố.
   - Hiển thị thumbnail xem trước tức thời kèm dấu tích xanh `verified` khi upload thành công.

---

## 🔍 TIÊU CHUẨN KIỂM THỬ ĐA CHIỀU (MULTI-SPECTRUM AUDIT SPECIFICATION)

Mỗi màn hình bưu tá và luồng giao nhận trong danh sách dưới đây đều bắt buộc trải qua **4 chiều kiểm thử toàn diện** bằng robot Playwright và tương tác thực tế:

| Chiều Kiểm Thử | Công Cụ & Cơ Chế | Nội Dung Kiểm Tra Chuyên Sâu |
| :--- | :--- | :--- |
| 📱 **Responsive 3 Viewports** | Playwright Multi-Device Matrix | • **Mobile (390 x 844 px):** Đây là giao diện chính yếu của Shipper thực địa. Bắt buộc: Nút gọi điện, nút chụp ảnh bằng chứng giao hàng, nút xác nhận COD to rõ, không bị tràn viền, thao tác 1 tay dễ dàng.<br>• **Tablet (768 x 1024 px):** Co giãn bản đồ định vị và danh sách đơn trên thiết bị tablet.<br>• **Desktop (1440 x 900 px):** Layout dự phòng và giao diện bưu cục. |
| 🔴 **Console Error & Runtime** | `page.on('console')`<br>`page.on('pageerror')` | • Lỗi React Hydration Mismatch.<br>• Lỗi `TypeError` khi render dữ liệu địa chỉ khách / đơn hàng COD.<br>• Cảnh báo memory leak từ việc đồng bộ vị trí GPS / timer trực ca. |
| 🌐 **Network & Exception Log** | `page.on('response')`<br>Backend Server Logs | • Bắt toàn bộ lỗi HTTP: `400` (Lỗi tham số nhận đơn), `401` (Hết hạn Token bưu tá), `403` (Sai vai trò `DELIVERY_STAFF`), `404` (API bưu cục), `429` (Rate limit khi refresh đơn), `500` (Server crash). |
| 🎨 **UI/UX & Tương Tác** | Bounding Box & DOM Inspection | • Kiểm tra công tắc Online/Offline đổi màu rõ ràng.<br>• Bảng tiền nợ COD tách biệt rành mạch với số dư thu nhập bưu tá.<br>• Hiển thị tiếng Việt rõ ràng, tương phản cao ngoài trời nắng. |

---

## 🧭 LƯỢC ĐỒ VẬN HÀNH GIAO VẬN HUKI EXPRESS

```
[Kho Seller: READY_FOR_PICKUP] ──> [/shipper/available-orders (Bưu Tá Nhận Đơn Lấy)]
                                                   │
                                                   ▼
[Đang Giao: /shipper/active-deliveries] ◄── [Bưu Tá Đã Lấy: PICKED_UP]
        │
        ├──────────────────────────────────────────┐
        ▼ (Giao Thành Công)                        ▼ (Giao Thất Bại / Hẹn Lại)
[Thu Tiền Mặt COD: DELIVERED]             [Lập Lịch Giao Lại Lần 2, 3]
        │                                          │ (Quá 3 Lần)
        ▼                                          ▼
[/shipper/wallet (Ghi Nợ COD)]            [/shipper/returns (Trả Hàng Về Kho)]
        │
        ▼
[/shipper/remit-cod (Nộp Tiền Mặt Đối Soát Về Sàn HUKI)]
```

---

## 🗺️ BẢN ĐỒ CHI TIẾT CÁC MÀN HÌNH VẬN HÀNH BƯU TÁ (10 MÀN HÌNH)

### 1. Phân Hệ 1: ĐIỀU PHỐI ĐƠN HÀNG THỰC ĐỊA (5 Màn Hình)
- [x] **Màn hình 1.1: Bảng Điều Hành Bưu Tá (`/shipper`)**
  - Công tắc chuyển đổi trạng thái trực ca: `Sẵn sàng nhận đơn` (`Online`) $\leftrightarrow$ `Tạm nghỉ` (`Offline`).
  - Thẻ tóm tắt ngày làm việc: Số đơn đã giao thành công hôm nay, Thu nhập tạm tính, Tiền mặt COD đang giữ trong túi, Điểm đánh giá dịch vụ.
  - Cảnh báo giới hạn nợ COD: Nhắc nhở nộp tiền khi số tiền mặt cầm vượt ngưỡng sàn cho phép.
  - Danh sách các đơn hàng khẩn cấp cần phát ngay trong ca trực.
  - ⚠️ Phát hiện lỗi: `BUG-04-001` (Spam 404 ReaderSyncProvider), `BUG-04-002` (Nút header $< 48px$), `BUG-04-005` (Unicode `★`), `BUG-04-006` (Nút Reset Demo Data), `BUG-04-013` (Công tắc trực ca chỉ đổi biến React client không gọi backend).
- [x] **Màn hình 1.2: Danh Sách Đơn Chờ Lấy Tại Kho Người Bán (`/shipper/available-orders`)**
  - Danh sách các gói hàng đóng gói xong đang ở trạng thái `READY_FOR_PICKUP` tại các nhà sách/kho NXB. *(Đã kiểm thử: `GET /api/v1/orders/shipper/available-orders` trả về 69 đơn hàng thực tế trong database)*.
  - Bộ lọc theo: Khoảng cách bán kính (km), Quận/Huyện phụ trách, Loại hàng.
  - Chi tiết điểm lấy hàng: Tên Shop, Địa chỉ kho chính xác, Số điện thoại thủ kho, Số lượng cuốn sách trong kiện.
  - Thao tác: **"Tiếp Nhận Đơn Lấy" (Accept Order)** $\rightarrow$ Gọi `PATCH /orders/shipper/orders/:id/claim`.
  - ⚠️ Phát hiện lỗi P0: `BUG-04-010` (Biến RAM `claimedOrderIdsInMemory` bị xóa khi F5; backend không lưu `shipperId` vào đơn hàng dẫn đến xung đột đa tài xế).
  - ⚠️ Phát hiện lỗi: `BUG-04-007` (Thiếu liên kết mở Google Maps / Apple Maps trực tiếp).
- [x] **Màn hình 1.3: Lộ Trình Giao Hàng & Phát Hàng Đến Tay Khách (`/shipper/active-deliveries`)**
  - 3 Tab trạng thái hành trình: `ALL`, `PICKING_UP` (Đang trên đường đến lấy tại kho), `IN_TRANSIT` (Đang chở trên xe đi phát cho khách).
  - Xác nhận đã lấy hàng từ kho NXB: `PATCH /orders/shipper/orders/:id/pickup` (Cập nhật `SellerOrderStatus.SHIPPED` và ghi nhật ký `OrderStatusHistory`).
  - Thao tác gọi điện nhanh: Bấm nút gọi trực tiếp cho người nhận qua số điện thoại trên đơn (`tel:`).
  - **Trường hợp Giao Thành Công:**
    - Kiểm tra số tiền cần thu hộ COD. Gọi `PATCH /orders/shipper/orders/:id/deliver` (Cập nhật `DELIVERED`, tính nợ COD, giải ngân escrow hoa hồng).
    - ⚠️ Phát hiện lỗi: `BUG-04-003` (Nút hoàn tất giao hàng không có bước bắt buộc chụp ảnh bằng chứng POD).
    - ⚠️ Phát hiện lỗi: `BUG-04-008` (Số tiền thu hộ COD hiển thị cỡ chữ nhỏ, thiếu kiểu chữ Monospace siêu đậm tương phản cao ngoài trời nắng).
  - **Trường hợp Giao Thất Bại:**
    - Báo giao thất bại qua `PATCH /orders/shipper/orders/:id/fail` (Cập nhật `CANCELLED` kèm lý do giải trình).
- [x] **Màn hình 1.4: Quy Trình Lấy & Hoàn Sách Trả Về Kho (`/shipper/returns`)**
  - 3 Tab điều phối thu hồi sách hoàn (Reverse Logistics): `ALL`, `STEP_1` (Đến nhà người mua lấy lại sách lỗi), `STEP_2` (Vận chuyển sách trả về kho người bán).
  - *(Đã kiểm thử: `orders.service.ts` tích hợp truy vấn bảng `ReturnRequest`, bưu tá xác nhận lấy hàng hoàn cập nhật `replacementStatus: RETURNING`, giao về kho cập nhật `RETURNED_TO_STORE` và ghi Sổ Cái `OrderStatusHistory` minh bạch)*.
- [x] **Màn hình 1.5: Sổ Nhật Ký Lịch Sử Giao Hàng (`/shipper/history`)**
  - Toàn bộ danh sách các cuốc giao đã hoàn thành theo từng ngày/tháng.
  - Chi tiết từng chuyến: Mã vận đơn, Tiền công giao nhận thực nhận, Đánh giá sao kèm nhận xét từ người mua.

---

### 2. Phân Hệ 2: TÀI CHÍNH, VÍ BƯU TÁ & ĐỐI SOÁT COD (3 Màn Hình)
- [x] **Màn hình 2.1: Quản Lý Ví Bưu Tá & Công Nợ Tiền Mặt COD (`/shipper/wallet`)**
  - 2 Số dư tài chính độc lập:
    - **Số dư thu nhập bưu tá (Earning Balance):** Tiền công vận chuyển tích lũy có thể rút về tài khoản cá nhân.
    - **Nợ tiền mặt thu hộ COD (COD Debt):** Tổng số tiền mặt đã thu của khách đang giữ trong người.
  - 5 Tab biến động tài chính: `ALL`, `EARNING`, `COD_COLLECT`, `COD_REMITTANCE`, `WITHDRAWAL`.
  - Cảnh báo: Tự động khóa quyền nhận thêm đơn mới nếu nợ COD vượt hạn mức.
- [x] **Màn hình 2.2: Luồng Nộp Tiền Mặt COD Đối Soát Về Sàn (`/shipper/remit-cod` & `/shipper/wallet/remit`)**
  - Lập phiếu nộp tiền COD: Chọn nộp toàn bộ hoặc nộp một phần công nợ. *(Đã kiểm thử: `POST /orders/shipper/remit-cod` trả về HTTP 201 nộp tiền thành công và cập nhật 7 đơn hàng liên quan)*.
  - Lịch sử nộp tiền COD: *(Đã kiểm thử: `GET /orders/shipper/remittances` trả về 17 lượt nộp tiền trong DB)*.
  - ⚠️ Phát hiện lỗi: `BUG-04-009` (Trùng lặp 2 đường dẫn cùng một chức năng nộp tiền mặt COD `/shipper/wallet/remit` và `/shipper/remit-cod`).

---

### 3. Phân Hệ 3: HỒ SƠ TÀI XẾ & CỔNG ĐĂNG NHẬP RIÊNG BIỆT (2 Màn Hình)
- [x] **Màn hình 3.1: Hồ Sơ Bưu Tá & Phương Tiện Xe Giao (`/shipper/profile`)**
  - Thông tin cá nhân: Họ tên, Mã nhân viên bưu tá, Số CCCD, Ảnh chân dung đại diện.
  - ⚠️ Phát hiện lỗi: `BUG-04-004` (`ShipperContext.tsx` dùng cứng `INITIAL_PROFILE` với tên `Nguyễn Văn Hưng`, xe `Honda Wave Alpha`, `66-F1 987.65` thay vì đọc thông tin thật của tài xế đang đăng nhập `shipper@huki.vn` / `Bưu Tá Nguyễn Văn Vận`).
  - ⚠️ Phát hiện lỗi P1: `BUG-04-011` (`GET /delivery-staff` yêu cầu `PlatformAdminGuard` khiến bưu tá bị HTTP 403 Forbidden).
- [x] **Màn hình 3.2: Cổng Đăng Nhập Riêng Biệt Bưu Tá (`/shipper/login`)**
  - ⚠️ Phát hiện lỗi P1: `BUG-04-012` (File `page.tsx` chỉ có 5 dòng redirect sang `/auth/login`, không có giao diện đăng nhập thương hiệu Logistics HUKI Express).

---

## 📊 TỔNG HỢP QUY MÔ KIỂM THỬ MOD-04
- **Tổng số Màn hình & Luồng vận hành:** **10 Màn hình**
- **Tổng số Phân hệ:** **3 Phân hệ giao vận**
- **Quy trình trọng tâm:** Nhận đơn tại kho $\rightarrow$ Phát sách tận tay $\rightarrow$ Thu tiền mặt COD $\rightarrow$ Nộp tiền đối soát $\rightarrow$ Trả hàng khi thất bại.
- **Tài khoản kiểm thử:** Nhân viên bưu tá HUKI Express (Role: `DELIVERY_STAFF` / `SHIPPER`).
