# Danh Sách Lỗi Toàn Diện (Comprehensive Bug Tracking) - Module 03: Cổng Quản Trị Sàn Toàn Diện

> **Phạm Vi & Tiêu Chuẩn Áp Dụng:**  
> 1. Multi-Spectrum Audit: Kiểm thử thực tế qua 31 màn hình điều hành trung tâm trên 3 kích thước Viewport (**Desktop 1440px**, **Tablet 768px**, **Mobile 390px**), ghi nhận 93 lượt chạy Playwright với tài khoản Quản trị viên tối cao (**HuKi Super Admin - `PLATFORM_ADMIN`**).  
> 2. Enterprise Mission Control & Anti-AI Standards (Loại bỏ triệt để emoji thô, gradient neon rẻ tiền, bão request spam polling, lỗi hydration SSR, chuẩn hóa typography sổ cái và bảo mật thao tác trọng tài).  
> 3. **Cam Kết Nghiêm Ngặt:** Tuyệt đối không tự ý sửa bất kỳ dòng code nào của ứng dụng khi chưa có sự phê duyệt và chỉ định trực tiếp từ người dùng.

---

## 📑 MỤC LỤC DANH SÁCH LỖI MOD-03

| Mã Bug | Phân Loại | Màn Hình / Vị Trí Ảnh Hưởng | Tóm Tắt Hiện Tượng & Mức Độ Nghiêm Trọng |
| :---: | :---: | :--- | :--- |
| **[BUG-03-001]** | **Network Leak & Console Spam** | **Toàn Bộ Cổng Admin (`/admin/*`)** | Provider đọc sách độc giả bị rò rỉ chạy ngầm làm spam `GET /api/reader/bookmarks/... 404` (hơn 124 lần). |
| **[BUG-03-002]** | **Runtime Crash / SSR** | **Bảo Trì Hệ Thống (`/admin/maintenance`)** | Lỗi React Hydration Mismatch do dùng `toLocaleTimeString('vi-VN')` trực tiếp trong cây render SSR. |
| **[BUG-03-003]** | **Network & Auth** | **Quản Lý Điểm Phạt (`/admin/appeals`)** | Endpoint nội bộ `GET /api/seller/penalties` trả về lỗi `401 Unauthorized` do thiếu token forward. |
| **[BUG-03-004]** | **Anti-AI Design** | **Khung Giờ Flash Sale (`/admin/flash-sales`)** | Dùng emoji text thô `⌛` trong tiêu đề mục và 4 hoạt ảnh `animate-pulse` nhấp nháy liên tục. |
| **[BUG-03-005]** | **Mobile Usability & UX** | **Thanh Điều Hướng Admin (`AdminLayout.tsx`)** | Drawer menu điều hành trên Mobile (390px) thiếu lớp phủ backdrop click-out để đóng nhanh. |
| **[BUG-03-006]** | **Bảo Mật Thao Tác (High-Stakes)** | **Phân Quyền Admin (`/admin/accounts`)** | Thao tác hạ cấp quyền hạn hoặc thu hồi tài khoản thiếu hộp thoại giải trình lý do 2 bước bắt buộc. |
| **[BUG-03-007]** | **Tương Tác Vi Mô (Micro-feedback)** | **Kho Khóa Bản Quyền (`/admin/drm-vault`)** | Sao chép Master Key AES-256 mã hóa DRM không có Toast thông báo bảo mật thành công. |
| **[BUG-03-008]** | **State & URL Sync** | **Ký Quỹ Đơn Hàng Escrow (`/admin/escrow`)** | Bộ lọc thời gian và đối soát tiền giữ đơn không đồng bộ vào URL query params, cản trở kiểm toán viên chia sẻ link. |
| **[BUG-03-009]** | **Hiệu Năng Hạ Tầng** | **Giám Sát Hạ Tầng (`/admin/health`)** | Polling ping 7 microservices chu kỳ 3s cố định thiếu độ trễ ngẫu nhiên (Jitter), gây xung đột tải CPU container. |
| **[BUG-03-010]** | **Quy Trình Nghiệp Vụ** | **Duyệt Hồ Sơ Doanh Nghiệp (`/admin/business-requests`)** | Form từ chối yêu cầu đổi giấy phép kinh doanh không bắt buộc nhập lý do giải trình, dẫn đến gửi thông báo rỗng cho NXB. |
| **[BUG-03-011]** | **P0 Backend DTO Validation** | **Kho Sách Toàn Sàn (`/admin/books`)** | Lọc sách theo trạng thái (`?status=PENDING_APPROVAL`) bị lỗi HTTP 400 Bad Request do `BookListQueryDto` thiếu thuộc tính `status`. |
| **[BUG-03-012]** | **P0 Functional Trap (Mock State)** | **Kiểm Duyệt Sách (`/admin/book-moderation`)** | Nút Phê duyệt / Từ chối xuất bản sách chỉ đổi RAM React State, không hề gọi backend API (`/books/:id/publish`), mất sạch khi reload trang. |
| **[BUG-03-013]** | **P0 NestJS Route Shadowing** | **Quản Trị Tiếp Thị Liên Kết (`/admin/affiliates`)** | Route wildcard `@Get(':id')` đặt trước các endpoint tĩnh (`/dashboard`, `/reconciliation`, `/reports/export`), khiến tất cả báo cáo admin bị lỗi 404. |
| **[BUG-03-014]** | **P0 Gateway Dead Code Misrouting** | **Phát Sóng Thông Báo Sàn (`/admin/notifications`)** | Gateway `service-proxy.middleware.ts` trả về `'community'` trước khi kiểm tra `/admin/broadcast-notifications`, làm misroute sang community gây 404. |
| **[BUG-03-015]** | **P1 Disconnected Backend UI** | **Quản Trị Banner Sàn (`/admin/marketing`)** | Giao diện lưu và đọc Hero Banners từ `localStorage` trình duyệt, hoàn toàn tách rời khỏi API backend `promotion-service` (`/banners`). |
| **[BUG-03-016]** | **P1 Disconnected Backend UI** | **Thông Báo Toàn Sàn (`/admin/notifications`)** | Giao diện đọc và phát sóng thông báo qua `adminNotificationService` (RAM/localStorage), bỏ qua microservice `business-service`. |
| **[BUG-03-017]** | **P1 Disconnected Backend UI** | **Công Tắc Tính Năng Kênh Người Bán (`/admin/seller-features`)** | Bật/tắt tính năng lưu trong LocalStorage client thay vì đồng bộ API `/seller/feature-flags`, không tác động đến tài khoản Seller thật. |
| **[BUG-03-018]** | **P1 Disconnected Backend UI** | **Bảo Trì Hệ Thống Khẩn Cấp (`/admin/maintenance`)** | Bật/tắt chế độ bảo trì lưu trong LocalStorage client thay vì gọi `POST /api/v1/system/maintenance` trên identity-service. |
| **[BUG-03-019]** | **P2 Pure Mock State UI** | **Lịch Sàn, Hỗ Trợ, Cài Đặt, Tích Hợp (`/admin/calendar`, `/support`, `/settings`, `/integrations`)** | 4 màn hình điều hành sử dụng 100% dữ liệu tĩnh cứng (hardcoded), không có controller backend hay cơ sở dữ liệu lưu trữ. |

---

## 🔍 CHI TIẾT BÓC TÁCH TỪNG LỖI (DEEP TECHNICAL SPECIFICATION)

---

### [BUG-03-001] Provider Đọc Sách Độc Giả chạy ngầm trong Cổng Admin làm bão lỗi 404 hơn 124 lần
- **1. Vị trí chính xác:**
  - Màn hình: Toàn bộ 31 màn hình quản trị sàn (`http://localhost:3100/admin/*`)
  - File mã nguồn: [web/src/ui/components/reader/ReaderSyncProvider.tsx](file:///e:/HuKi/web/src/ui/components/reader/ReaderSyncProvider.tsx)
  - Endpoints bị spam: 
    - `GET /api/reader/bookmarks/con-duong-phia-truoc` (404 Not Found - 124 lần)
    - `PUT /api/reader/progress` (404 Not Found - 15 lần)
  - Viewport ảnh hưởng: Tất cả viewports (Desktop, Tablet, Mobile).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Ngay cả khi Quản trị viên tối cao đang làm việc trong các màn hình điều hành bảo mật cấp cao (như `/admin/health`, `/admin/finance`, `/admin/escrow`), tab Console và tab Network liên tục đỏ rực bởi hàng trăm request 404 xuất phát từ một component đọc sách của bạn đọc.
  - Hậu quả: Gây ô nhiễm nghiêm trọng log console quản trị sàn, cản trở việc debug các lỗi vận hành thực tế của các microservices.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Component `ReaderSyncProvider` được đặt ở cấp Root Layout chung (`web/src/app/layout.tsx`) mà không có cơ chế chặn các route phân hệ đặc thù (`pathname.startsWith('/admin')` hoặc `pathname.startsWith('/seller')`).
- **4. Cách khắc phục đề xuất:**
  - Thêm điều kiện kiểm tra đường dẫn ngay ở đầu hook `ReaderSyncProvider`:
    ```typescript
    const pathname = usePathname() || '';
    if (pathname.startsWith('/admin') || pathname.startsWith('/seller') || pathname.startsWith('/shipper')) {
      return <>{children}</>;
    }
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-002] Lỗi React Hydration Mismatch tại Trang Bảo Trì & Kill-Switch (`/admin/maintenance`)
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Trạng Thái Bảo Trì Sàn (`http://localhost:3100/admin/maintenance`)
  - File mã nguồn: [web/src/ui/components/admin/AdminMaintenanceView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminMaintenanceView.tsx)
  - Viewport ảnh hưởng: Tất cả viewports (Desktop, Tablet, Mobile).
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Mở trang Bảo trì hệ thống, Console xuất hiện lỗi đỏ React Hydration Mismatch:
    ```
    PAGE_ERROR: Hydration failed because the server rendered text didn't match the client. 
    As a result this tree will be regenerated on the client.
    ```
  - Cây component bị giật và tải lại từ đầu, làm trễ thao tác bật tắt công tắc bảo vệ hệ thống khẩn cấp (Emergency Kill-Switch).
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Dòng hiển thị thời gian cập nhật cấu hình:
    ```tsx
    <span className="text-[11px] text-slate-400">
      Lần cập nhật cuối: {new Date(config.updatedAt).toLocaleTimeString('vi-VN')} ({config.updatedBy})
    </span>
    ```
  - `toLocaleTimeString('vi-VN')` khi render trên Server Node container sinh ra định dạng múi giờ UTC/en khác biệt so với múi giờ GMT+7 và locale trình duyệt của Super Admin.
- **4. Cách khắc phục đề xuất:**
  - Bọc phần hiển thị thời gian trong cờ kiểm tra client-mount:
    ```tsx
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    // Trong JSX:
    <span>{mounted ? new Date(config.updatedAt).toLocaleTimeString('vi-VN') : '--:--'}</span>
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-003] API Kiểm Tra Điểm Phạt Gian Hàng trong Admin (`/admin/appeals`) bị lỗi `401 Unauthorized`
- **1. Vị trí chính xác:**
  - Màn hình: Trung Tâm Giải Quyết Kháng Nghị Gian Hàng (`/admin/appeals`)
  - Endpoint bị ảnh hưởng: `GET /api/seller/penalties`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi Ban Quản Trị xem xét danh sách các gian hàng bị trừ điểm vi phạm để thẩm định đơn kháng nghị, hệ thống bắn lỗi `401 Unauthorized` 6 lần. Bảng dữ liệu điểm phạt không tải được.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Route Handler `/api/seller/penalties` chỉ chấp nhận phiên token doanh nghiệp (`role: BUSINESS`) mà quên bổ sung quyền quản trị tối cao (`role: PLATFORM_ADMIN`).
- **4. Cách khắc phục đề xuất:**
  - Cập nhật điều kiện xác thực tại Route Handler cho phép cả `PLATFORM_ADMIN` và `SUPER_ADMIN` truy xuất lịch sử điểm phạt của các đối tác.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-004] [Anti-AI Design Flaw] Khung Giờ Flash Sale Sàn (`/admin/flash-sales`) dùng emoji text thô `⌛` và 4 hoạt ảnh nhấp nháy `animate-pulse`
- **1. Vị trí chính xác:**
  - Màn hình: Điều Phối Khung Giờ Flash Sale (`http://localhost:3100/admin/flash-sales`)
  - File mã nguồn: [web/src/ui/components/admin/AdminFlashSaleView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminFlashSaleView.tsx#L216)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Tiêu đề mục quản lý lịch sử flash sale nhúng chuỗi unicode emoji:
    ```typescript
    title: '⌛ Phiên Flash Sale Đã Kết Thúc (Lịch Sử)',
    ```
  - Đồng thời 4 khung giờ đang chạy kích hoạt liên tục lớp `animate-pulse` tạo hiệu ứng rung nhấp nháy gây mất tập trung thị giác của quản trị viên.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Vi phạm quy tắc loại bỏ emoji thô và hạn chế animation gây xao nhãng của chuẩn Mission Control / UI/UX Pro Max.
- **4. Cách khắc phục đề xuất:**
  - Thay ký tự `⌛` bằng icon vector chuẩn:
    ```tsx
    <span className="material-symbols-outlined text-sm text-slate-500 mr-1.5">history</span>
    Phiên Flash Sale Đã Kết Thúc (Lịch Sử)
    ```
  - Loại bỏ các lớp `animate-pulse` trên khung giờ tĩnh; chỉ hiển thị chấm xanh lục tĩnh hoặc badge `bg-emerald-50 text-emerald-700 border border-emerald-200`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-005] [Mobile UX] Thanh Điều Hướng Admin (`AdminLayout.tsx`) thiếu lớp phủ Backdrop click-out trên điện thoại
- **1. Vị trí chính xác:**
  - Màn hình: Toàn bộ Cổng Admin trên thiết bị di động
  - File mã nguồn: [web/src/ui/components/layout/AdminLayout.tsx](file:///e:/HuKi/web/src/ui/components/layout/AdminLayout.tsx)
  - Viewport ảnh hưởng: **Mobile (390 x 844 px)**.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi xem bảng điều hành Admin trên điện thoại (390px), bấm nút Hamburger Menu để mở Drawer danh sách 8 phân hệ quản trị.
  - Khi muốn đóng menu mà không chọn link nào, bấm vào khoảng trống bên ngoài thì menu không tự đóng lại. Quản trị viên bắt buộc phải tìm và bấm lại đúng nút Hamburger ở góc trên cùng, gây bất tiện trong thao tác một tay trên thực địa.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Vùng phủ mờ (Backdrop overlay) thiếu sự kiện `onClick={() => setIsMobileMenuOpen(false)}`.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung overlay chuẩn:
    ```tsx
    {isMobileMenuOpen && (
      <div 
        className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity" 
        onClick={() => setIsMobileMenuOpen(false)} 
      />
    )}
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-006] [Bảo Mật Thao Tác] Phân Quyền Quản Trị Viên (`/admin/accounts`) thiếu hộp thoại xác nhận giải trình 2 bước
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Phân Quyền Admin Nội Bộ (`http://localhost:3100/admin/accounts`)
  - File mã nguồn: `web/src/ui/components/admin/AdminAccountsView.tsx`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Thao tác khóa tài khoản kiểm duyệt viên hoặc thu hồi quyền truy cập phân hệ tài chính được thực thi ngay lập tức chỉ với 1 cú click hoặc hộp thoại `window.confirm` đơn sơ.
  - Không có trường nhập bắt buộc *"Lý do đình chỉ quyền"* để lưu vào Sổ Cái Nhật Ký Kiểm Toán (Audit Log) theo tiêu chuẩn bảo mật doanh nghiệp.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Chưa tích hợp Modal xác nhận hành động rủi ro cao (High-Stakes Dual Confirmation Dialog) kèm lý do giải trình.
- **4. Cách khắc phục đề xuất:**
  - Thiết kế modal xác nhận chuyên dụng yêu cầu nhập tối thiểu 10 ký tự lý do trước khi kích hoạt nút *"Xác Nhận Thu Hồi Quyền"*.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-007] [Tương Tác Vi Mô] Kho Khóa DRM Vault (`/admin/drm-vault`) sao chép Master Key AES-256 không có Toast phản hồi
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Khóa Mã Hóa Bản Quyền DRM (`http://localhost:3100/admin/drm-vault`)
  - File mã nguồn: `web/src/ui/components/admin/AdminDrmVaultView.tsx`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Bấm nút sao chép chuỗi mã khóa cấp phép Ebook DRM (Master License Key 64 ký tự hex): Mã khóa đã được copy vào clipboard nhưng giao diện im lặng hoàn toàn, không có Toast thông báo bảo mật.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Thiếu trigger `showToast({ message: 'Đã sao chép DRM Master Key vào bộ nhớ tạm!', type: 'success' })`.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung Toast thông báo thành công và hiệu ứng đổi icon sang màu xanh lục trong 2 giây.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-008] Sổ Cái Ký Quỹ Đơn Hàng Escrow (`/admin/escrow`) không đồng bộ bộ lọc vào URL Query Params
- **1. Vị trí chính xác:**
  - Màn hình: Ký Quỹ Đơn Hàng & Đối Soát Tiền NXB (`http://localhost:3100/admin/escrow`)
  - File mã nguồn: `web/src/ui/components/admin/AdminEscrowView.tsx`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi kiểm toán viên sàn lọc danh sách các đơn hàng đang bị tạm giữ ký quỹ trên 7 ngày (`status=HELD&days=7`), bảng dữ liệu lọc đúng nhưng URL trình duyệt vẫn giữ nguyên `/admin/escrow`.
  - Không thể copy link gửi cho kế toán trưởng duyệt mở khóa tiền hàng; khi refresh trang bộ lọc bị reset về mặc định.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Lập trình viên lưu bộ lọc thuần túy trong React State cục bộ mà không sử dụng `useSearchParams` và `router.replace`.
- **4. Cách khắc phục đề xuất:**
  - Đồng bộ trạng thái lọc vào URL (`/admin/escrow?status=HELD&minDays=7`).
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-009] Bảng Giám Sát Hạ Tầng (`/admin/health`) Polling 7 Microservices dồn dập chu kỳ 3s thiếu Jitter
- **1. Vị trí chính xác:**
  - Màn hình: Tình Trạng Sức Khỏe Hệ Thống Microservices (`http://localhost:3100/admin/health`)
  - File mã nguồn: `web/src/ui/components/admin/AdminHealthView.tsx`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Trang liên tục gửi đồng thời 7 request ping tới endpoint `/api/health` của 7 microservices mỗi 3 giây chính xác, tạo ra xung đột tải CPU theo chu kỳ trên Docker/Kubernetes container.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Vòng lặp `setInterval(fetchHealth, 3000)` không bổ sung khoảng trễ ngẫu nhiên (Jitter) và chu kỳ ping quá ngắn đối với bảng giám sát nội bộ.
- **4. Cách khắc phục đề xuất:**
  - Nâng chu kỳ kiểm tra sức khỏe lên `15s` - `30s`, hoặc kích hoạt chế độ On-demand (Chỉ ping khi Admin bấm nút *"Làm Mới Trạng Thái"*).
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-010] Form Thẩm Định Hồ Sơ NXB (`/admin/business-requests`) không bắt buộc nhập lý do khi Từ Chối
- **1. Vị trí chính xác:**
  - Màn hình: Duyệt Yêu Cầu Cập Nhật Pháp Nhân Doanh Nghiệp (`/admin/business-requests`)
  - File mã nguồn: `web/src/ui/components/admin/AdminBusinessRequestsView.tsx`
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi Admin bấm nút *"Từ chối cập nhật"* đối với một hồ sơ đổi giấy phép kinh doanh của NXB, modal cho phép bấm nút gửi ngay cả khi ô lý do để trống hoàn toàn.
  - Phía NXB nhận được thông báo: *"Yêu cầu cập nhật hồ sơ của bạn đã bị từ chối. Lý do: [Trống]"*, khiến đối tác hoang mang không biết cần bổ sung giấy tờ gì.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Thiếu validation `if (!rejectionReason.trim()) return setError('Vui lòng nhập lý do từ chối cụ thể!')`.
- **4. Cách khắc phục đề xuất:**
  - Bổ sung validate bắt buộc nhập tối thiểu 10 ký tự lý do giải trình trước khi kích hoạt nút Từ chối.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-011] [P0 Functional - DTO Validation] Lọc sách theo trạng thái (`?status=PENDING_APPROVAL`) bị lỗi HTTP 400 Bad Request
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Kho Sách Toàn Sàn (`/admin/books`)
  - File mã nguồn: [platform/apps/commerce-service/src/modules/books/dto/book-list-query.dto.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/books/dto/book-list-query.dto.ts)
  - Endpoint bị lỗi: `GET /api/v1/books?status=PENDING_APPROVAL` (hoặc `status=SUSPENDED`, `status=PUBLISHED`)
  - HTTP Status: `400 Bad Request`
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi Admin chọn tab trạng thái để kiểm tra sách chờ duyệt hoặc sách đang bị khóa:
    ```json
    {
      "status": "error",
      "statusCode": 400,
      "code": "VALIDATION_ERROR",
      "message": "Validation failed",
      "details": [{ "field": "property", "code": "VALIDATION_ERROR", "message": "property status should not exist" }]
    }
    ```
  - Quản trị viên không thể lọc hoặc tìm kiếm các cuốn sách theo trạng thái phê duyệt trên bảng điều hành.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - NestJS sử dụng `ValidationPipe` toàn cục với `whitelist: true, forbidNonWhitelisted: true`.
  - Class DTO `BookListQueryDto` không khai báo thuộc tính `@IsOptional() @IsEnum(BookStatus) status?: BookStatus;`, dẫn đến việc bất kỳ request nào gửi kèm `status` đều bị chặn với mã lỗi 400.
- **4. Cách khắc phục đề xuất:**
  - Khai báo thuộc tính `status` trong `BookListQueryDto`:
    ```typescript
    @ApiPropertyOptional({ enum: BookStatus, description: 'Filter books by status' })
    @IsOptional()
    @IsEnum(BookStatus)
    status?: BookStatus;
    ```
  - Cập nhật hàm `findAll` trong `BooksService` để áp dụng điều kiện `where.status = query.status`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-012] [P0 Functional - Mock State Trap] Nút Duyệt / Từ Chối Sách trong `/admin/book-moderation` chỉ đổi biến RAM React
- **1. Vị trí chính xác:**
  - Màn hình: Trung Tâm Kiểm Duyệt Sách Chờ Phát Hành (`/admin/book-moderation`)
  - File mã nguồn: [web/src/ui/components/admin/AdminBookModerationView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminBookModerationView.tsx#L154-L220)
  - Viewport ảnh hưởng: Tất cả viewports.
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Khi Admin bấm nút *"Phê duyệt"* hoặc *"Từ chối xuất bản"* (đơn lẻ hoặc hàng loạt):
    ```typescript
    setQueueItems(prev => prev.map(item => {
      if (item.id === bookId) {
        return { ...item, status: 'rejected', statusLabel: 'Từ chối phát hành', rejectReason: finalReason };
      }
      return item;
    }));
    showToast?.(`Đã từ chối phát hành tựa sách: ${finalReason}`, 'warning');
    ```
  - Giao diện hiện Toast xanh báo thành công nhưng trong Network tab không có bất kỳ request API nào gửi về backend.
  - Khi Admin nhấn F5 hoặc mở lại trang kiểm duyệt, sách vẫn giữ nguyên trạng thái cũ trong database, việc kiểm duyệt bị vô hiệu hóa hoàn toàn.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Hàm `handleRejectBook` và `handleExecuteBulkAction` chỉ thao tác trên bộ nhớ tạm cục bộ của component (`setQueueItems`) mà không gọi các API nghiệp vụ có sẵn của backend:
    - Phê duyệt: `POST /api/v1/books/:bookId/publish`
    - Đình chỉ / Từ chối: `POST /api/v1/books/:bookId/suspend`
- **4. Cách khắc phục đề xuất:**
  - Tích hợp `adminApi.activateBook(bookId)` cho thao tác Duyệt và `adminApi.suspendBook(bookId)` cho thao tác Từ chối vào các hàm xử lý sự kiện trong `AdminBookModerationView.tsx`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-013] [P0 Backend - Route Shadowing] Route Wildcard `@Get(':id')` che khuất toàn bộ sub-routes trong `AffiliateAdminController`
- **1. Vị trí chính xác:**
  - Phân hệ: Quản Trị Tiếp Thị Liên Kết Affiliate
  - File mã nguồn: [platform/apps/commerce-service/src/modules/affiliate/controllers/affiliate-admin.controller.ts](file:///e:/HuKi/platform/apps/commerce-service/src/modules/affiliate/controllers/affiliate-admin.controller.ts#L76)
  - Endpoints bị hỏng:
    - `GET /api/v1/admin/affiliates/dashboard` (HTTP 404)
    - `GET /api/v1/admin/affiliates/reconciliation` (HTTP 404)
    - `GET /api/v1/admin/affiliates/reports/export` (HTTP 404)
    - `GET /api/v1/admin/affiliates/payouts` (HTTP 404)
    - `GET /api/v1/admin/affiliates/fraud` (HTTP 404)
    - `GET /api/v1/admin/affiliates/health` (HTTP 404)
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Gửi request `GET /api/v1/admin/affiliates/dashboard`:
    ```json
    {
      "status": "error",
      "statusCode": 404,
      "code": "SYSTEM_ERROR",
      "message": "Không tìm thấy hồ sơ đối tác với ID: dashboard",
      "path": "/api/v1/admin/affiliates/dashboard"
    }
    ```
  - Bảng điều khiển phân tích số liệu affiliate và xuất báo cáo đối soát doanh thu toàn sàn bị tê liệt.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Trong NestJS / Express, route param `@Get(':id')` được khai báo ở dòng 76, trước các route tĩnh `@Get('dashboard')` (dòng 279), `@Get('reconciliation')` (dòng 262), `@Get('reports/export')` (dòng 287).
  - Trình phân giải route xem chuỗi `"dashboard"` là giá trị của param `:id` và gọi hàm `getApplicationDetail("dashboard")` của Prisma `findUnique`, dẫn đến lỗi 404 Entity Not Found.
- **4. Cách khắc phục đề xuất:**
  - Di chuyển khai báo `@Get(':id')` xuống phía sau tất cả các route tĩnh cụ thể (`dashboard`, `reconciliation`, `payouts`, `fraud`, `health`, `reports/export`).
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-014] [P0 Gateway - Dead Code Misrouting] `service-proxy.middleware.ts` trả về `'community'` trước khi kiểm tra `/admin/broadcast-notifications`
- **1. Vị trí chính xác:**
  - Phân hệ: Cổng Điều Phối API Gateway
  - File mã nguồn: [platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts](file:///e:/HuKi/platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts#L269-L289)
  - Endpoint bị ảnh hưởng: `GET /api/v1/admin/broadcast-notifications` (HTTP 404)
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Gửi request `GET /api/v1/admin/broadcast-notifications`:
    ```json
    {
      "status": "error",
      "statusCode": 404,
      "code": "SYSTEM_ERROR",
      "message": "Cannot GET /api/v1/admin/broadcast-notifications",
      "path": "/api/v1/admin/broadcast-notifications"
    }
    ```
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Tại `service-proxy.middleware.ts`:
    ```typescript
    if (firstSegment === 'admin') {
      if (path.includes('/admin/finance') || path.includes('/admin/drm') || path.includes('/admin/affiliates')) {
        return 'commerce';
      }
      return 'community'; // <-- Luôn trả về community ở dòng 277!
    }
    ...
    // Dòng 287 trở thành Dead Code không bao giờ được chạm tới:
    if (firstSegment === 'admin' && path.includes('/admin/broadcast-notifications')) {
      return 'business';
    }
    ```
  - Request bị chuyển hướng sai sang `community-service` (cổng 3004) thay vì `business-service` (cổng 3001), dẫn đến phản hồi 404 Not Found.
- **4. Cách khắc phục đề xuất:**
  - Chuyển điều kiện kiểm tra `/admin/broadcast-notifications` lên bên trong khối `if (firstSegment === 'admin')` trước dòng `return 'community'`:
    ```typescript
    if (firstSegment === 'admin') {
      if (path.includes('/admin/broadcast-notifications')) {
        return 'business';
      }
      if (path.includes('/admin/finance') || path.includes('/admin/drm') || path.includes('/admin/affiliates')) {
        return 'commerce';
      }
      return 'community';
    }
    ```
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-015] [P1 Disconnected UI] Quản trị Banner Hero (`/admin/marketing`) lưu vào `localStorage` thay vì gọi backend `promotion-service`
- **1. Vị trí chính xác:**
  - Màn hình: Quản Trị Banner & Chiến Dịch Tiếp Thị (`/admin/marketing`)
  - File mã nguồn: [web/src/ui/components/admin/AdminMarketingView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminMarketingView.tsx#L131-L165)
  - Endpoint backend bị bỏ quên: `GET /api/v1/banners`, `POST /api/v1/banners`, `PATCH /api/v1/banners/:id`
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Mọi thao tác thêm mới, đổi ảnh, thay đổi thứ tự và bật/tắt banner trên trang chủ chỉ được lưu trong `localStorage.getItem("huki_admin_marketing_banners")`.
  - Khách hàng (Buyer) truy cập trang chủ trên thiết bị khác hoặc trình duyệt ẩn danh không nhìn thấy các banner do Super Admin đã cấu hình, vì backend database hoàn toàn rỗng (`GET /banners -> []`).
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - `AdminMarketingView.tsx` chưa được tích hợp với `promotion-service` (BannersController) mà dùng LocalStorage tạm thời.
- **4. Cách khắc phục đề xuất:**
  - Thay thế việc đọc/ghi LocalStorage bằng việc gọi `bannerApi.getBanners()`, `bannerApi.createBanner()`, `bannerApi.updateBanner()` vào PostgreSQL database.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-016] [P1 Disconnected UI] Quản trị Thông Báo Toàn Sàn (`/admin/notifications`) dùng `adminNotificationService` ảo
- **1. Vị trí chính xác:**
  - Màn hình: Phát Sóng Thông Báo Toàn Sàn (`/admin/notifications`)
  - File mã nguồn: [web/src/ui/components/admin/AdminNotificationsView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminNotificationsView.tsx#L55)
  - File service: [web/src/ui/services/adminNotificationService.ts](file:///e:/HuKi/web/src/ui/services/adminNotificationService.ts)
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Danh sách thông báo được khởi tạo từ `adminNotificationService.getAll()` đọc từ LocalStorage client.
  - Khi tạo thông báo mới, thông báo chỉ lưu trên máy admin mà không lưu vào bảng `broadcast_notifications` trong database của `business-service`, khiến Seller và Buyer trên toàn sàn không hề nhận được thông báo quan trọng.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Chưa kết nối `AdminNotificationsView` với endpoint `GET /broadcast-notifications` và `POST /broadcast-notifications` đã có sẵn trong `business-service`.
- **4. Cách khắc phục đề xuất:**
  - Đấu nối API trực tiếp từ frontend tới `/api/v1/broadcast-notifications`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-017] [P1 Disconnected UI] Quản lý Công Tắc Tính Năng Kênh Người Bán (`/admin/seller-features`) không đồng bộ Backend
- **1. Vị trí chính xác:**
  - Màn hình: Quản Lý Công Tắc Tính Năng Người Bán (`/admin/seller-features`)
  - File mã nguồn: [web/src/ui/components/admin/AdminSellerFeaturesView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminSellerFeaturesView.tsx)
  - File service: [web/src/ui/services/featureFlagsService.ts](file:///e:/HuKi/web/src/ui/services/featureFlagsService.ts)
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Admin bật/tắt hoặc đặt hẹn giờ bảo trì các tính năng người bán (như `CUSTOMER_CHAT`, `WITHDRAWALS`, `FLASH_SALE`): thao tác chỉ được ghi vào `localStorage` của trình duyệt admin.
  - Người bán (Seller) đăng nhập từ máy khác vẫn sử dụng các tính năng bình thường vì cơ sở dữ liệu backend `business-service` (`GET /seller/feature-flags`) không nhận được lệnh cập nhật.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - `AdminSellerFeaturesView` phụ thuộc vào `featureFlagsService` (chạy trên LocalStorage) thay vì gọi API `POST /api/v1/seller/feature-flags`.
- **4. Cách khắc phục đề xuất:**
  - Thay thế các lời gọi `featureFlagsService` bằng `apiClient('/seller/feature-flags', { method: 'POST', body: ... })`.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-018] [P1 Disconnected UI] Bật Chế Độ Bảo Trì Khẩn Cấp (`/admin/maintenance`) không gọi Identity Service
- **1. Vị trí chính xác:**
  - Màn hình: Bật/Tắt Chế Độ Bảo Trì Hệ Thống (`/admin/maintenance`)
  - File mã nguồn: [web/src/ui/components/admin/AdminMaintenanceView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminMaintenanceView.tsx)
  - File service: [web/src/ui/services/maintenanceService.ts](file:///e:/HuKi/web/src/ui/services/maintenanceService.ts)
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Admin kích hoạt công tắc Emergency Kill-Switch để bảo trì toàn hệ thống: ứng dụng hiển thị thông báo đã bật bảo trì nhưng chỉ lưu cấu hình vào `localStorage.getItem('huki_system_maintenance_config')`.
  - Toàn bộ 7 microservices và API Gateway vẫn mở cửa bình thường cho người dùng bên ngoài vì endpoint `POST /api/v1/system/maintenance` trên `identity-service` không được gọi.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - `maintenanceService.ts` chưa được gắn kết với backend API `/system/maintenance`.
- **4. Cách khắc phục đề xuất:**
  - Cập nhật `maintenanceService` gửi request `POST /api/v1/system/maintenance` với JWT Super Admin để đồng bộ trạng thái bảo trì sàn lên Redis/Gateway.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

### [BUG-03-019] [P2 Pure Mock UI] 4 Màn Hình Điều Hành Sàn Dùng 100% Dữ Liệu Tĩnh Cứng (Hardcoded Dummy)
- **1. Vị trí chính xác:**
  - Màn hình 1: Lịch Vận Hành Sàn (`/admin/calendar` - [AdminCalendarView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminCalendarView.tsx))
  - Màn hình 2: Tiếp Nhận & Hỗ Trợ Độc Giả (`/admin/support` - [AdminSupportView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminSupportView.tsx))
  - Màn hình 3: Cài Đặt Tham Số Nền Tảng (`/admin/settings` - [AdminSettingsView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminSettingsView.tsx))
  - Màn hình 4: Tích Hợp Cổng Bên Thứ Ba (`/admin/integrations` - [AdminIntegrationsView.tsx](file:///e:/HuKi/web/src/ui/components/admin/AdminIntegrationsView.tsx))
- **2. Mô tả hiện tượng & Bằng chứng:**
  - Cả 4 màn hình trên đều không có bất kỳ `useEffect`, `apiClient` hay kết nối mạng nào:
    - `/admin/calendar`: Chứa mảng tĩnh `const events = [{ id: 'EVT-01', ... }]`.
    - `/admin/support`: Chứa mảng tĩnh `const [tickets, setTickets] = useState([{ id: 'TCK-8812', ... }])`.
    - `/admin/settings`: Chứa mảng tĩnh `const [platformSettings] = useState(...)`, nút Lưu chỉ hiện Toast ảo.
    - `/admin/integrations`: Chứa mảng tĩnh `const services = [{ id: 'INT-01', ... }]` không có tính năng ping kiểm tra kết nối thực tế.
- **3. Phân tích nguyên nhân gốc rễ (Root Cause):**
  - Các phân hệ này mới dừng lại ở mức giao diện phác thảo (UI Prototype) ban đầu, chưa được thiết kế Schema Prisma, Controller hay Service ở tầng backend.
- **4. Cách khắc phục đề xuất:**
  - Giai đoạn ngắn hạn: Bổ sung nhãn thông báo *"Chế độ xem tĩnh (Preview Prototype)"* để quản trị viên không nhầm lẫn là dữ liệu thời gian thực.
  - Giai đoạn trung hạn: Thiết kế Schema Prisma và API endpoints tương ứng cho cấu hình sàn, phiếu hỗ trợ ticket, và lịch trình sự kiện.
- **5. Trạng thái:** [ ] Chờ chỉ đạo từ người dùng (Cam kết chưa sửa code).

---

## 📊 TỔNG HỢP THEO DÕI TIẾN ĐỘ MOD-03
- **Tổng số lỗi đã bóc tách chi tiết:** **19 Lỗi**
  - **Lỗi P0 Nghiệp Vụ & Backend/Gateway Critical:** **4 Lỗi** (DTO validation `status` BUG-011, Mock kiểm duyệt sách BUG-012, Route shadowing Affiliate BUG-013, Gateway misrouting BUG-014)
  - **Lỗi P1 Giao Diện Ngắt Kết Nối Backend (Disconnected UI):** **4 Lỗi** (Banner localStorage BUG-015, Broadcast notification mock BUG-016, Seller features mock BUG-017, Maintenance kill-switch mock BUG-018)
  - **Lỗi P2 Giao Diện Tĩnh (Prototype Only):** **1 Lỗi** (Lịch, Hỗ trợ, Cài đặt, Tích hợp BUG-019)
  - **Lỗi Runtime / SSR Crash & Rò rỉ Network:** **2 Lỗi** (Hydration Mismatch BUG-002, 404 ReaderSyncProvider spam BUG-001)
  - **Lỗi Phân quyền & Network API:** **1 Lỗi** (401 Penalties BUG-003)
  - **Lỗi Anti-AI & Thẩm mỹ Mission Control:** **1 Lỗi** (Emoji thô `⌛`, animate-pulse BUG-004)
  - **Lỗi Mobile Usability & Ergonomics:** **2 Lỗi** (Backdrop Drawer BUG-005, Dual confirmation BUG-006)
  - **Lỗi Nghiệp vụ & State URL:** **4 Lỗi** (DRM toast BUG-007, Escrow URL sync BUG-008, Health jitter BUG-009, Rejection reason BUG-010)
- **Cam kết tuân thủ:** 100% chưa can thiệp sửa code, đã kiểm thử thực tế trên phiên đăng nhập Super Admin thật.


