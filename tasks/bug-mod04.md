# Danh Sách Lỗi Toàn Diện (Comprehensive Bug Tracking) - Module 04: Cổng Giao Hàng & Logistics (Shipper Portal)

> **Phạm Vi & Tiêu Chuẩn Áp Dụng:**  
> 1. Multi-Spectrum Audit: Kiểm thử thực tế qua 10 màn hình và luồng giao vận trên 3 kích thước Viewport (**Mobile 390px - Môi trường thực địa chính**, **Tablet 768px**, **Desktop 1440px**), ghi nhận 30 lượt chạy Playwright với tài khoản bưu tá thật (**Bưu Tá Nguyễn Văn Vận - `DELIVERY_STAFF`**).  
> 2. Field Logistics & High-Affordance Standards (Đảm bảo Touch Target $\ge 48px$ thao tác ngoài trời khi đeo găng tay, tương phản cao tránh chói nắng, loại bỏ mock data, yêu cầu bằng chứng giao hàng POD).  
> 3. **Cam Kết Nghiêm Ngặt:** Tuyệt đối không tự ý sửa bất kỳ dòng code nào của ứng dụng khi chưa có sự phê duyệt và chỉ định trực tiếp từ người dùng.

---

## 📑 MỤC LỤC DANH SÁCH LỖI MOD-04

| Mã Bug | Phân Loại | Màn Hình / Vị Trí Ảnh Hưởng | Tóm Tắt Hiện Tượng & Mức Độ Nghiêm Trọng |
| :---: | :---: | :--- | :--- |
| **[BUG-04-001]** | **Network Leak & Console Spam** | **Toàn Bộ Cổng Bưu Tá (`/shipper/*`)** | Provider đọc sách độc giả bị rò rỉ chạy ngầm làm spam `GET /api/reader/bookmarks/... 404` (hơn 57 lần). |
| **[BUG-04-002]** | **Công Thái Học Thực Địa (Touch Target)** | **Thanh Header Bưu Tá (`ShipperLayout.tsx`)** | Các nút điều hướng chính (Hamburger menu, Thông báo, Đăng xuất) chỉ cao 32px - 36px ($< 48px$). |
| **[BUG-04-003]** | **Nghiệp Vụ Giao Vận (POD)** | **Lộ Trình Giao Hàng (`/shipper/active-deliveries`)** | Nút "Giao hàng thành công" bấm là hoàn tất ngay, thiếu bước chụp ảnh bằng chứng giao hàng (Proof of Delivery). |
| **[BUG-04-004]** | **Dữ Liệu Giả Lập (Mock Data)** | **Hồ Sơ & Phương Tiện Bưu Tá (`ShipperContext.tsx`)** | Nhúng cứng ảnh Unsplash và chuỗi xe máy mẫu (`Honda Wave Alpha 110cc`, `66-F1 987.65`) thay vì đọc DB thật. |
| **[BUG-04-005]** | **Anti-AI Design** | **Thanh Thông Tin Tài Xế (`ShipperLayout.tsx`)** | Dùng ký tự text unicode thô `★` cho điểm đánh giá tài xế thay vì icon vector Material Symbols. |
| **[BUG-04-006]** | **Giao Diện Thừa (Residual Demo UI)** | **Chân Sidebar Bưu Tá (`ShipperLayout.tsx`)** | Tồn tại nút "Khôi Phục Dữ Liệu" (Reset Demo Data) gọi `alert(...)` trình duyệt thô sơ trên giao diện thật. |
| **[BUG-04-007]** | **Tiện Ích Bản Đồ Thực Địa** | **Đơn Chờ Lấy & Lộ Trình Giao** | Địa chỉ kho NXB và khách hàng chỉ có link gọi điện thoại (`tel:`), thiếu liên kết mở Google Maps / Apple Maps trực tiếp. |
| **[BUG-04-008]** | **Thị Giác Ngoài Trời (Daylight Contrast)** | **Lộ Trình Giao Hàng & Thu Tiền COD** | Số tiền thu hộ COD hiển thị cỡ chữ nhỏ, thiếu kiểu chữ Monospace siêu đậm tương phản cao ngoài trời nắng. |
| **[BUG-04-009]** | **Kiến Trúc Điều Hướng** | **Đối Soát Công Nợ COD** | Trùng lặp 2 đường dẫn cùng một chức năng nộp tiền mặt COD (`/shipper/wallet/remit` và `/shipper/remit-cod`). |
| **[BUG-04-010]** | **P0 Concurrency & Atomic Claim** | **Nhận Đơn & Điều Phối (`ShipperContext.tsx` & `orders.service.ts`)** | `claimedOrderIdsInMemory` lưu trong biến RAM cục bộ bị mất khi F5; backend không lưu `shipperId` vào đơn hàng dẫn đến xung đột đa tài xế. |
| **[BUG-04-011]** | **P1 Phân Quyền RBAC Barrier** | **Quản Trị Bưu Tá (`delivery-staff.controller.ts`)** | API `GET /delivery-staff` yêu cầu `PlatformAdminGuard` khiến bưu tá vai trò `DELIVERY_STAFF` bị cấm truy cập (HTTP 403 Forbidden). |
| **[BUG-04-012]** | **P1 Missing View / Routing** | **Cổng Đăng Nhập Riêng Biệt Bưu Tá (`/shipper/login`)** | File `page.tsx` chỉ có 5 dòng redirect sang `/auth/login`, không có giao diện đăng nhập chuyên dụng Logistics HUKI Express. |
| **[BUG-04-013]** | **P1 Disconnected State** | **Công Tắc Trực Ca Online/Offline (`ShipperContext.tsx`)** | Nút Bật/Tắt trực ca chỉ đổi biến cờ React client, không gửi API cập nhật trạng thái hoạt động của bưu tá về backend. |

---

## 🔍 CHI TIẾT BÓC TÁCH TỪNG LỖI (DEEP TECHNICAL SPECIFICATION)

---

### [BUG-04-001] Provider Đọc Sách Độc Giả chạy ngầm trong Cổng Bưu Tá gây bão lỗi 404 hơn 57 lần
- **1. Vị trí chính xác:**
  - Màn hình: Toàn bộ các trang bưu tá (`http://localhost:3100/shipper/*`)
  - File mã nguồn: [web/src/ui/components/reader/ReaderSyncProvider.tsx](file:///e:/HuKi/web/src/ui/components/reader/ReaderSyncProvider.tsx)
  - Endpoints bị spam:
    - `GET /api/reader/bookmarks/con-duong-phia-truoc` (404 Not Found - 57 lần)
    - `PUT /api/reader/progress` (404 Not Found - 21 lần)
  - Viewport ảnh hưởng: Tất cả viewports (Mobile, Tablet, Desktop).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi bưu tá đang thao tác nhận đơn hoặc giao hàng trên điện thoại, tab Network liên tục gửi request lỗi 404 về API đọc sách Ebook của độc giả.
  - Hậu quả: Gây lãng phí băng thông mạng di động 4G của tài xế và làm ô nhiễm console log ứng dụng.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - `ReaderSyncProvider` chưa được kiểm tra loại trừ đường dẫn phân hệ giao vận (`!pathname.startsWith('/shipper')`).
- **4. Cách khắc phục đề xuất:**
  - Chặn provider tự động chạy khi URL bắt đầu bằng `/shipper`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-002] [Công Thái Học Thực Địa] Kích thước nút bấm trên Mobile quá nhỏ ($< 48px$), khó thao tác khi đeo găng tay
- **1. Vị trí chính xác:**
  - Màn hình: Thanh Header di động trên toàn bộ các trang `/shipper/*`
  - File mã nguồn: [web/src/ui/components/layout/ShipperLayout.tsx](file:///e:/HuKi/web/src/ui/components/layout/ShipperLayout.tsx#L215-L220)
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)** (kích thước smartphone thực địa).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Nút Menu Hamburger (`w-9 h-9` tức 36px $\times$ 36px), chuông thông báo (36px $\times$ 36px) và nút Đăng xuất (`w-8 h-8` tức 32px $\times$ 32px) có diện tích tiếp xúc ngón tay quá nhỏ.
  - Bưu tá khi đang chạy xe máy ngoài đường hoặc đeo găng tay chống nắng thường xuyên bấm hụt hoặc bấm nhầm sang phần tử kế bên, vi phạm nghiêm trọng chuẩn WCAG 2.5.5 Target Size ($\ge 44px \times 44px$, tối ưu thực địa là $48px \times 48px$).
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Sử dụng class kích thước `w-9 h-9` / `w-8 h-8` của giao diện Desktop mang xuống Mobile.
- **4. Cách khắc phục đề xuất:**
  - Nâng touch target của các nút bấm trên thanh Header di động lên tối thiểu `min-w-[48px] min-h-[48px]` với padding ngón tay rộng rãi:
    ```tsx
    <button className="w-12 h-12 flex items-center justify-center rounded-xl ...">
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-003] [Nghiệp Vụ Giao Vận] Nút "Giao hàng thành công" thiếu bước bắt buộc Chụp ảnh bằng chứng (Proof of Delivery)
- **1. Vị trí chính xác:**
  - Màn hình: Lộ Trình Phát Hàng Cho Khách (`http://localhost:3100/shipper/active-deliveries`)
  - File mã nguồn: [web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx](file:///e:/HuKi/web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx#L125-L135)
  - Viewport ảnh hưởng: Tất cả viewports (đặc biệt là Mobile).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi bưu tá phát xong kiện sách đến địa chỉ người mua, bấm nút *"Giao xong"* hoặc *"Giao Hàng Thành Công"*: Đơn hàng lập tức chuyển ngay sang trạng thái `DELIVERED` và ghi nhận thu nợ COD vào ví mà không yêu cầu tài xế chụp ảnh gói hàng đã trao tay hoặc ảnh chữ ký người nhận.
  - Rủi ro cực kỳ nghiêm trọng: Khách hàng khiếu nại chưa nhận được sách mà bưu tá đã bấm hoàn thành sẽ dẫn đến tranh chấp pháp lý và sàn không có bằng chứng đối chiếu.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Hàm `completeDelivery(row.id)` gọi trực tiếp API đổi trạng thái mà thiếu bước mở Modal chụp ảnh POD (`ProofOfDeliveryModal`) kèm client-side image compression.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung modal chụp ảnh bắt buộc:
    ```tsx
    const handleCompleteWithProof = (orderId: string) => {
      setSelectedOrderId(orderId);
      setIsProofModalOpen(true); // Yêu cầu tải lên ảnh chụp gói hàng trước khi gửi API
    };
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-004] [Dữ Liệu Giả Lập] Thông tin xe máy và ảnh đại diện bưu tá bị nhúng cứng dữ liệu mẫu Unsplash
- **1. Vị trí chính xác:**
  - File mã nguồn: [web/src/ui/context/ShipperContext.tsx](file:///e:/HuKi/web/src/ui/context/ShipperContext.tsx#L42-L45)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Mọi tài xế đăng nhập vào hệ thống đều thấy chung một thông tin xe và ảnh mẫu:
    ```typescript
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde...',
    vehicleType: 'Xe máy Honda Wave Alpha 110cc',
    licensePlate: '66-F1 987.65',
    ```
  - Thông tin này không khớp với hồ sơ thực tế của tài xế được lưu trong cơ sở dữ liệu `huki_shipping`.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Dữ liệu demo fallback của quá trình dựng giao diện chưa được thay bằng API `GET /api/v1/shipper/profile`.
- **4. Cách khắc phục đề xuất:**
  - Kết nối dữ liệu phương tiện và biển số xe thật từ bảng `shippers` trong DB.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-005] [Anti-AI Design Flaw] Thanh thông tin tài xế dùng ký tự unicode text thô `★`
- **1. Vị trí chính xác:**
  - File mã nguồn: [web/src/ui/components/layout/ShipperLayout.tsx](file:///e:/HuKi/web/src/ui/components/layout/ShipperLayout.tsx#L300)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Huy hiệu điểm đánh giá tài xế trên Header hiển thị: `★ {profile.rating} • {profile.licensePlate}`.
  - Chuỗi unicode `★` bị thô và không đồng bộ màu sắc với các icon Material Symbols khác trên sàn.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Dùng chuỗi text emoji thay vì icon vector.
- **4. Cách khắc phục đề xuất:**
  - Thay bằng `<span className="material-symbols-outlined text-[13px] text-amber-400 fill-current align-middle">star</span>`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-006] [Giao Diện Thừa] Nút "Khôi Phục Dữ Liệu" (Reset Demo) gọi browser `alert(...)` xuất hiện ở chân Sidebar
- **1. Vị trí chính xác:**
  - File mã nguồn: [web/src/ui/components/layout/ShipperLayout.tsx](file:///e:/HuKi/web/src/ui/components/layout/ShipperLayout.tsx#L410-L435)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Ở góc dưới chân thanh menu Sidebar xuất hiện nút bấm *"Khôi Phục Dữ Liệu"*. Khi bưu tá vô tình bấm vào, trình duyệt bật popup `alert('Đã khôi phục dữ liệu mẫu bưu tá thành công!')` và xóa sạch dữ liệu cache đơn hàng thật đang xử lý trong `localStorage`.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Phím tiện ích debug của môi trường dev chưa được ẩn hoặc bọc trong cờ `process.env.NODE_ENV === 'development'`.
- **4. Cách khắc phục đề xuất:**
  - Xóa bỏ hoặc ẩn hoàn toàn nút Reset Demo này khỏi môi trường chạy thực tế.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-007] [Tiện Ích Bản Đồ] Địa chỉ kho lấy hàng và địa chỉ khách giao thiếu liên kết mở App Bản Đồ (Maps Navigation)
- **1. Vị trí chính xác:**
  - Màn hình: `/shipper/available-orders`, `/shipper/active-deliveries`
  - File mã nguồn: `web/src/ui/components/shipper/ShipperActiveDeliveriesView.tsx`, `ShipperAvailableOrdersView.tsx`
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)**.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Trên thẻ đơn hàng có nút gọi điện thoại nhanh (`<a href="tel:...">`), nhưng địa chỉ kho gửi hàng và địa chỉ giao sách cho khách chỉ là chuỗi text thuần túy.
  - Bưu tá đang đi xe máy không thể bấm 1 chạm để mở Google Maps / Apple Maps chỉ đường, buộc phải bôi đen sao chép địa chỉ thủ công, gây nguy hiểm khi tham gia giao thông.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Thiếu liên kết deep-link định vị bản đồ dạng `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung nút bấm vector `directions` hoặc bọc địa chỉ bằng liên kết mở Google Maps trực tiếp.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-008] [Thị Giác Ngoài Trời] Tiền mặt COD cần thu hiển thị cỡ chữ nhỏ, thiếu tương phản cao ngoài trời nắng
- **1. Vị trí chính xác:**
  - Màn hình: `/shipper/active-deliveries`, `/shipper/wallet`
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)**.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Con số tiền mặt cần thu từ khách (tiền COD) hiển thị với font chữ mảnh `text-sm font-semibold text-gray-800`.
  - Dưới ánh nắng gắt ngoài đường phố, độ tương phản này không đủ rõ nét, dễ dẫn đến việc bưu tá nhìn nhầm số tiền (ví dụ: nhầm lẫn giữa 245.000đ và 215.000đ).
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Chưa áp dụng quy chuẩn thiết kế thực địa (High-Affordance & Outdoor Typography).
- **4. Cách khắc phục đề xuất:**
  - Định dạng số tiền COD nổi bật với font Monospace cực đậm: `font-mono text-xl sm:text-2xl font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-009] Trùng lặp 2 đường dẫn cùng một chức năng nộp tiền mặt COD đối soát về sàn
- **1. Vị trí chính xác:**
  - File mã nguồn: `web/src/app/shipper/wallet/remit/page.tsx` và `web/src/app/shipper/remit-cod/page.tsx`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Hệ thống tồn tại song song 2 route `/shipper/wallet/remit` và `/shipper/remit-cod` cùng thực hiện một tác vụ là chuyển khoản nộp lại tiền mặt COD đã thu về tài khoản tổng của sàn HUKI.
  - Việc này làm phân tán luồng trải nghiệm của bưu tá và gây khó khăn khi đồng bộ lịch sử giao dịch nộp tiền.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Dư thừa file route trong cấu trúc thư mục Next.js.
- **4. Cách khắc phục đề xuất:**
  - Quy về 1 route chuẩn duy nhất: `/shipper/wallet/remit`. Tại route `/shipper/remit-cod`, chuyển hướng 301 tự động về route chuẩn:
    ```typescript
    redirect('/shipper/wallet/remit');
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-010] [P0 Concurrency & Atomic Claim] `claimedOrderIdsInMemory` lưu trong RAM cục bộ; Backend không lưu định danh Shipper nhận đơn
- **1. Vị trí chính xác:**
  - File frontend: [web/src/ui/context/ShipperContext.tsx](file:///e:/HuKi/web/src/ui/context/ShipperContext.tsx#L140-L293)
  - File backend: [platform/apps/commerce-service/src/modules/orders/orders.service.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/orders/orders.service.ts#L424-L445)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi bưu tá A bấm *"Tiếp Nhận Đơn Lấy"* (Claim Order):
    - Frontend lưu ID vào biến RAM `claimedOrderIdsInMemory = new Set<string>()`.
    - Khi bưu tá F5 hoặc mở lại trình duyệt trên điện thoại, Set này bị xóa sạch $\rightarrow$ đơn hàng vừa nhận bị biến mất khỏi danh sách đang giao hoặc nhảy ngược về danh sách chờ lấy.
    - Tại backend, hàm `shipperClaimOrder` chỉ cập nhật:
      ```typescript
      data: { carrier: 'HUKI_EXPRESS', trackingCode }
      ```
      hoàn toàn không lưu ID bưu tá nhận đơn (`shipperId` hoặc `driverUserId`).
    - Hậu quả: Bất kỳ bưu tá B nào khác đăng nhập vào hệ thống đều thấy đơn hàng đó hiển thị là *"Đơn của tôi"* vì logic kiểm tra là `o.carrier === 'HUKI_EXPRESS'`.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Bảng cơ sở dữ liệu `seller_orders` thiếu cột `shipper_id` / `delivery_staff_id` để gán quyền sở hữu đơn hàng cho tài xế nhận.
  - Frontend dùng state RAM tạm thời thay vì đồng bộ quan hệ sở hữu từ cơ sở dữ liệu.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung trường `deliveryStaffId` vào bảng `seller_orders` và cập nhật `shipperClaimOrder` gán `deliveryStaffId: actor.sub`.
  - Frontend chỉ hiển thị đơn của tài xế khi `order.deliveryStaffId === profile.id`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-011] [P1 Phân Quyền RBAC Barrier] Endpoint `GET /delivery-staff` chặn quyền bưu tá `DELIVERY_STAFF` với mã HTTP 403
- **1. Vị trí chính xác:**
  - Phân hệ: Dịch Vụ Vận Chuyển (`shipping-service`)
  - File mã nguồn: [platform/apps/shipping-service/src/modules/delivery-staff/delivery-staff.controller.ts](file:///e:/HuKi/platform/apps/shipping-service/src/modules/delivery-staff/delivery-staff.controller.ts#L37)
  - Endpoint bị ảnh hưởng: `GET /api/v1/delivery-staff`
  - HTTP Status: `403 Forbidden`
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Gửi request với Token bưu tá (`role: DELIVERY_STAFF`):
    ```json
    {
      "status": "error",
      "statusCode": 403,
      "code": "AUTHZ_ROLE_INSUFFICIENT",
      "message": "Platform administrator role required"
    }
    ```
  - Bưu tá không thể xem thông tin bưu cục, hồ sơ nhân sự đội ngũ vận chuyển hay cập nhật ca làm việc của mình thông qua shipping-service.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Toàn bộ `DeliveryStaffController` bị khóa cứng bởi `@UseGuards(AuthenticatedGuard, PlatformAdminGuard)` ở cấp Controller, không mở ngoại lệ cho vai trò bưu tá (`DELIVERY_STAFF`).
- **4. Cách khắc phục đề xuất:**
  - Tách riêng guard cho các action: Chỉ thao tác tạo bưu tá mới (`POST`) hoặc xóa bưu tá mới yêu cầu `PlatformAdminGuard`; còn thao tác xem hồ sơ cá nhân (`GET /delivery-staff/me`) cho phép vai trò `DELIVERY_STAFF`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-012] [P1 Thiếu Giao Diện] Cổng Đăng Nhập Riêng Biệt Bưu Tá (`/shipper/login`) chỉ là lệnh Redirect 5 dòng
- **1. Vị trí chính xác:**
  - Màn hình: Cổng Đăng Nhập Bưu Tá HUKI Express (`/shipper/login`)
  - File mã nguồn: [web/src/app/shipper/login/page.tsx](file:///e:/HuKi/web/src/app/shipper/login/page.tsx)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi bưu tá truy cập `/shipper/login`, file `page.tsx` chỉ chứa:
    ```typescript
    export default function ShipperLoginPage() {
      redirect('/auth/login?redirect=/shipper');
    }
    ```
  - Hoàn toàn không có giao diện đăng nhập thương hiệu HUKI Express với nhận diện thực địa (nhập mã bưu tá / số điện thoại tài xế / cảnh báo đăng nhập nhầm tài khoản người mua như đặc tả Màn hình 3.2).
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Màn hình đăng nhập bưu tá chưa được lập trình UI chuyên biệt mà mượn tạm form đăng nhập độc giả thông thường.
- **4. Cách khắc phục đề xuất:**
  - Xây dựng giao diện đăng nhập riêng biệt tại `/shipper/login` với tone màu Logistics HUKI Express nhận diện cao và hỗ trợ đăng nhập bằng Mã nhân viên bưu tá / Số điện thoại.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-04-013] [P1 Trạng Thái Mất Đồng Bộ] Công Tắc Bật/Tắt Trực Ca (Online/Offline) chỉ đổi state React client
- **1. Vị trí chính xác:**
  - Màn hình: Bảng Điều Hành Bưu Tá (`/shipper`)
  - File mã nguồn: [web/src/ui/context/ShipperContext.tsx](file:///e:/HuKi/web/src/ui/context/ShipperContext.tsx#L74-L75)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Bưu tá gạt công tắc *"Tạm nghỉ (Offline)"*: Chỉ có biến `isOnline` trong React State chuyển sang `false`.
  - Không có bất kỳ request API nào gửi về backend Gateway hay `shipping-service` để cập nhật trạng thái trực ca của tài xế vào cơ sở dữ liệu.
  - Hệ thống dispatch đơn hàng vẫn tiếp tục phân bổ các đơn hàng mới cho tài xế ngay cả khi tài xế đang trong thời gian nghỉ ngơi hoặc đã hết ca làm việc.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - `setIsOnline` thiếu lời gọi API đồng bộ trạng thái trực ca (`PATCH /api/v1/delivery-staff/:id/status` hoặc qua WebSocket realtime).
- **4. Cách khắc phục đề xuất:**
  - Tích hợp API cập nhật trạng thái trực ca của tài xế vào backend mỗi khi gạt công tắc Online/Offline.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

## 📊 TỔNG HỢP THEO DÕI TIẾN ĐỘ MOD-04
- **Tổng số lỗi đã bóc tách chi tiết:** **13 Lỗi**
  - **Lỗi P0 Nghiệp Vụ & Đa Tài Xế (Concurrency):** **1 Lỗi** (Mất đơn khi F5 & không lưu shipperId nhận đơn BUG-010)
  - **Lỗi P1 Phân Quyền & Đồng Bộ Backend:** **3 Lỗi** (RBAC 403 delivery-staff BUG-011, Thiếu giao diện đăng nhập bưu tá BUG-012, Công tắc trực ca không gọi backend BUG-013)
  - **Lỗi Quy Trình Vận Hành & Bằng Chứng POD:** **1 Lỗi** (Nút hoàn tất thiếu bước chụp ảnh bằng chứng giao hàng BUG-003)
  - **Lỗi Công Thái Học & Thực Địa Ngoài Trời:** **3 Lỗi** (Nút header $< 48px$ BUG-002, Thiếu link mở Google Maps BUG-007, Chữ số tiền COD nhỏ BUG-008)
  - **Lỗi Rò Rỉ Network & Console Spam:** **1 Lỗi** (404 Bookmarks spam 57 lần BUG-001)
  - **Lỗi Dữ Liệu Giả Lập & Demo:** **2 Lỗi** (Mock xe máy BUG-004, Nút reset demo BUG-006)
  - **Lỗi Anti-AI & Thẩm Mỹ:** **1 Lỗi** (Ký tự unicode thô `★` BUG-005)
  - **Lỗi Kiến Trúc Route Trùng Lặp:** **1 Lỗi** (Trùng `/shipper/wallet/remit` và `/remit-cod` BUG-009)
- **Cam kết tuân thủ:** 100% chưa can thiệp sửa code, đã kiểm thử thực tế trên phiên đăng nhập bưu tá thật (`shipper@huki.vn`).


