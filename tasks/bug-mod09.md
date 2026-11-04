# Module 09: System Audit, UI/UX Hotfixes, OAuth & Real Data Integrity

## Bối Cảnh & Nguyên Tắc Vận Hành Của Dự Án
- **Không mock dữ liệu:** 100% dữ liệu hiển thị (sách, flash sale, voucher, đơn hàng, người dùng) phải được truy vấn từ Database thật (PostgreSQL / MongoDB) qua API Backend. Không sử dụng fallback dữ liệu giả (mock data) hoặc múa lửa ở Frontend.
- **Bảo mật tuyệt đối:** Không lưu cứng (hardcode) secrets, Client ID, API keys trong Git repository, Docker Compose hay frontend bundle. Tất cả đưa vào biến môi trường `.env`.
- **Độ tin cậy CI/CD:** Đảm bảo toàn bộ test, lint, typecheck và build chạy trơn tru, không bị nghẽn (hang/timeout/OOM) trên GitHub Actions Runner.
- **Trải nghiệm khách hàng:** Giao diện trực quan, tính toán chính xác minh bạch, thông điệp pháp lý/học tập rõ ràng và trợ lý AI thông minh, ngắn gọn, đúng trọng tâm.

---

## Danh Sách 9 Vấn Đề Cần Xử Lý (Phân Tích Chi Tiết)

### Vấn Đề 1: Nút Dropdown Tài Khoản Trên Header Bị Liệt / Không Bấm Được
- **Hiện tượng (Hình 1):** Người dùng bấm vào nút hiển thị tài khoản cá nhân (`Huỳnh Gia Huy` có avatar và mũi tên dropdown) trên Header nhưng menu không xuất hiện, trông như bị liệt/không bấm được.
- **Nguyên nhân kỹ thuật:**
  - Vị trí: `web/src/ui/components/layout/StoreHeader.tsx` (dòng 423).
  - Thẻ cha bao bọc toàn bộ thanh điều hướng chính được khai báo:
    `<div className="h-[50px] sm:h-[52px] w-full max-w-full overflow-hidden flex items-center justify-between px-2 sm:px-4 md:px-6 shrink-0">`
  - Vì container có thuộc tính `overflow-hidden` và chiều cao cố định `h-[50px]`, khi người dùng bấm nút kích hoạt `showUserMenu = true`, dropdown menu được render với class `absolute right-0 top-full mt-1.5` nằm ngoài phạm vi 50px của cha. Thuộc tính `overflow-hidden` đã cắt bỏ hoàn toàn (clip) phần menu này ra khỏi khung nhìn, khiến người dùng không thể nhìn thấy hay tương tác được.
- **Giải pháp xử lý:**
  - Thay đổi `overflow-hidden` trên container chính của Header thành `overflow-visible` hoặc xử lý `overflow-x-clip` ở cấp độ phù hợp để dropdown tài khoản (và các popup tương tự) hiển thị nổi đè lên trên trang (`z-50`) mà không làm tràn khung ngang.

---

### Vấn Đề 2: Lộ Google OAuth Client ID Trong Docker UAT & Hướng Dẫn Cập Nhật VPS
- **Hiện tượng:** Google gửi cảnh báo bảo mật về việc phát hiện Google OAuth Client ID bị lộ trong mã nguồn công khai / repository.
- **Nguyên nhân kỹ thuật:**
  - Vị trí: `docker-compose.uat.yml` (dòng 81, 298) và `docker-compose.prod.yml` (dòng 152).
  - Cấu hình đang gán giá trị mặc định hardcode dạng:
    `GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:-133752145943-qlneica38ablgn1js0hg1an8d9gmsi47.apps.googleusercontent.com}`
    `NEXT_PUBLIC_GOOGLE_CLIENT_ID: ${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-133752145943-qlneica38ablgn1js0hg1an8d9gmsi47.apps.googleusercontent.com}`
  - Các công cụ quét bảo mật tự động của Google và GitHub Secret Scanning quét qua file YAML và phát hiện chuỗi Client ID này.
- **Các vị trí cần cấu hình biến môi trường (`.env`):**
  1. **Dưới máy Local:**
     - Frontend: `web/.env` (hoặc `web/.env.local`) $\rightarrow$ khai báo `NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Client_ID_Mới>`
     - Backend: `platform/.env` (hoặc `platform/apps/identity-service/.env`) $\rightarrow$ khai báo:
       `GOOGLE_CLIENT_ID=<Client_ID_Mới>`
       `GOOGLE_CLIENT_SECRET=<Client_Secret_Mới>`
  2. **Trên máy chủ VPS:**
     - File `.env` (hoặc `.env.uat`) nằm tại thư mục gốc dự án HuKi trên VPS.
- **Quy trình & Tổ hợp phím thao tác cập nhật trên VPS:**
  - **Bước 1: Mở file `.env` bằng trình soạn thảo `nano`:**
    ```bash
    cd /path/to/huki
    nano .env
    ```
  - **Bước 2: Tìm và thay thế các dòng:**
    ```env
    GOOGLE_CLIENT_ID=your-new-google-client-id.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=your-new-google-client-secret
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-new-google-client-id.apps.googleusercontent.com
    ```
  - **Bước 3: Tổ hợp phím lưu và thoát trên `nano`:**
    1. Nhấn **`Ctrl + O`** (WriteOut: Lưu file).
    2. Nhấn phím **`Enter`** (để xác nhận lưu đúng tên file `.env`).
    3. Nhấn **`Ctrl + X`** (Exit: Thoát khỏi nano ra lại terminal).
  - *(Ghi chú nếu VPS dùng `vim`/`vi`)*:
    - Nhấn phím **`i`** để vào chế độ chỉnh sửa (Insert).
    - Sửa xong nhấn phím **`Esc`**.
    - Gõ **`:wq`** rồi nhấn **`Enter`** (Write & Quit: Lưu và thoát).
    - Nếu lỡ gõ sai muốn thoát không lưu: Nhấn **`Esc`**, gõ **`:q!`** rồi nhấn **`Enter`**.
  - **Bước 4: Chạy lệnh cập nhật container mà không làm gián đoạn hệ thống:**
    ```bash
    cd ~/huki
    docker compose -f docker-compose.uat.yml up -d --no-deps identity-service-uat web-uat
    ```

---

### Vấn Đề 3: GitHub Actions CI/CD Bị Treo & Cancel Ở Bước Lint Frontend (Hình 2 & 3)
- **Hiện tượng (Hình 2 & 3):**
  - Workflow `Deploy backend to Staging Environment #26` thành công (34m 8s).
  - Workflow `Continuous Integration (CI) Quality Gates #31` bị hủy (canceled) sau 15m 21s tại bước:
    `Run frontend lint and TypeScript typecheck` -> `npm run check` -> `npm run lint` (`eslint src`).
- **Nguyên nhân kỹ thuật:**
  - Trong `.github/workflows/ci.yml` (dòng 128), job chạy `npm run check` gọi `eslint src`.
  - Trên Next.js 16 + ESLint 9 Flat Config (`eslint.config.mjs`), lệnh `eslint src` thực hiện phân tích cú pháp AST toàn bộ hàng trăm component TypeScript mà không có cờ `--cache` hoặc tối ưu phạm vi, dẫn đến việc tiêu tốn CPU/RAM và chạy vượt quá giới hạn thời gian (hang/timeout) trên GitHub Runner 2 vCPU.
- **Giải pháp xử lý:**
  - Thêm cờ `--cache --cache-strategy content` vào script `lint` trong `web/package.json` hoặc sử dụng `next lint` có cache chuẩn của Next.js.
  - Tách bước `typecheck` và `lint` độc lập trong CI workflow, áp dụng timeout cụ thể cho từng bước để CI chạy nhanh dưới 2-3 phút thay vì bị treo đến 15 phút.

---

### Vấn Đề 4: Rà Soát & Triệt Tiêu Toàn Bộ Các Lỗi Console Đỏ (Hình 4 & Hình Mới Cập Nhật)

#### 4.1. Lỗi Console Đỏ: `POST /api/v1/auth/refresh 401 (Unauthorized)`
- **Hiện tượng (Hình 4):** Console DevTools báo lỗi đỏ: `POST http://localhost:3000/api/v1/auth/refresh 401 (Unauthorized) apiClient.ts:44`.
- **Nguyên nhân kỹ thuật:**
  - Trong `web/src/ui/api/apiClient.ts` (dòng 51-65): Khi có một access token cũ/hết hạn nằm trong `localStorage` (`huki_access_token`), điều kiện `hadToken = Boolean(tokenStorage.getAccessToken())` là `true`. Khi API trả về 401, `apiClient` cố gắng gọi `POST /api/v1/auth/refresh`.
  - Trong `web/src/ui/api/tokenStorage.ts` (dòng 58), phương thức `getRefreshToken()` trả về `null` vì refresh token được quản lý qua cookie HttpOnly. Khi cookie này không tồn tại (phiên khách vãng lai, hoặc môi trường dev cổng khác biệt, hoặc cookie đã hết hạn), `apiClient` gửi request với body rỗng `{}`.
  - Backend `identity-service` ném `UnauthorizedException('Refresh token không tồn tại')` (401), làm trình duyệt in dòng log lỗi màu đỏ.
- **Giải pháp xử lý:**
  - Thêm kiểm tra điều kiện an toàn trong `apiClient.ts`: Nếu không có `refreshToken` và refresh thất bại lần đầu, lập tức xóa sạch token hỏng trong `tokenStorage`, tránh gọi lặp lại.
  - Không bắn request làm mới token nếu trình duyệt không có dấu hiệu tồn tại của refresh token.
  - Đảm bảo các component công khai/khách không tự động kích hoạt API dành riêng cho người dùng đã đăng nhập.

#### 4.2. Lỗi Console Đỏ: `POST /api/v1/cart/merge 400 (Bad Request)`
- **Hiện tượng (Hình mới cập nhật):** Console DevTools báo lỗi đỏ: `Failed to load resource: the server responded with a status of 400 (Bad Request) :3000/api/v1/cart/merge:1`.
- **Nguyên nhân kỹ thuật:**
  - Vị trí: `web/src/ui/context/CartContext.tsx` (dòng 249-275).
  - Khi người dùng đăng nhập (hoặc refresh trang với session sẵn có), `CartContext` tự động quét các sản phẩm còn lưu trong `localStorage` (`huki_cart_guest` và `huki_cart`) để gộp giỏ hàng khách lên tài khoản qua API `cartApi.mergeCart(payloadItems)`.
  - Trong DTO Backend `platform/apps/commerce-service/src/modules/cart/dto/merge-cart.dto.ts`, các trường được validate nghiêm ngặt:
    - `@IsUUID() bookId: string;` (bắt buộc phải là định dạng UUID).
    - `@IsEnum(CartItemFormat) format: CartItemFormat;` (`PHYSICAL` hoặc `DIGITAL`).
  - Nếu trong `localStorage` của trình duyệt còn sót dữ liệu rác từ các bản thử nghiệm cũ (ví dụ `bookId` lưu dạng slug như `"dac-nhan-tam"`, `"item_1"`, ID tạm `"saved-xxx"`, hoặc format viết thường `"physical"`), NestJS `ValidationPipe` lập tức chặn lại và quăng lỗi `400 Bad Request`.
  - Đồng thời, khi gặp lỗi 400, `CartContext` lại không xóa dữ liệu rác trong `localStorage`, dẫn đến việc mỗi lần F5 hoặc đăng nhập, request lỗi này lại bị bắn liên tục lên server.
- **Giải pháp xử lý:**
  - Tại `CartContext.tsx`:
    1. Kiểm tra regex UUID chuẩn `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` cho `item.bookId` trước khi đưa vào danh sách merge. Loại bỏ các item rác không hợp lệ.
    2. Chuẩn hóa `format` thành chữ in hoa (`'PHYSICAL'` / `'DIGITAL'`).
    3. Nếu API `mergeCart` trả về lỗi (400 hoặc thất bại do item không tồn tại), tự động dọn dẹp sạch `localStorage` guest cart để cắt đứt vòng lặp lỗi.
  - Tại backend `commerce-service`: Trong hàm `mergeGuestCart`, bỏ qua các phần tử không tồn tại thay vì làm đứt gãy toàn bộ luồng merge.

#### 4.3. Cảnh Báo Console: `WebSocket connection to 'ws://localhost:3005' failed`
- **Hiện tượng (Hình mới cập nhật):** `WebSocket connection to 'ws://localhost:3005/socket.io/?EIO=4&transport=websocket' failed: WebSocket is closed before the connection is established. useRealtimeNotifications.ts:320`.
- **Nguyên nhân kỹ thuật:**
  - Vị trí: `web/src/ui/hooks/useRealtimeNotifications.ts` (dòng 247).
  - Code đang fallback cứng: `const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3005'`.
  - Trong kiến trúc microservices HuKi, cổng 3005 là cổng nội bộ của `community-service`. Khi người dùng chạy local hoặc ở môi trường không mở trực tiếp cổng 3005, hoặc khi access token handshake bị từ chối/hết hạn, WebSocket đóng ngay lập tức làm Socket.IO in cảnh báo kết nối.
- **Giải pháp xử lý:**
  - Khai báo biến `NEXT_PUBLIC_SOCKET_URL` chuẩn trong file môi trường `.env`.
  - Tại `useRealtimeNotifications.ts`, cấu hình Socket.IO với cơ chế reconnection graceful và tắt log lỗi ồn ào khi service realtime chưa sẵn sàng, ưu tiên fallback sang HTTP Polling êm dịu.

---

### Vấn Đề 5: Lỗi Tính Toán Giỏ Hàng Flash Sale & Áp Dụng Voucher (Hình 5)
- **Hiện tượng (Hình 5):**
  - Giỏ hàng có 3 sản phẩm: Tạm tính ghi 424.200đ.
  - Dòng giảm giá Flash Sale ghi: `-12.800đ`.
  - Dòng Tạm tính cuối cùng vẫn ghi: `424.200đ` (không hề trừ 12.800đ).
  - Áp dụng voucher `HUKIE2E10` nhưng tổng tiền không giảm, chỉ hiện dòng thông báo `Mã HUKIE2E10 áp dụng khi thanh toán`.
  - Trang giỏ hàng chứa dữ liệu giả hardcode `MOCK_AVAILABLE_VOUCHERS`.
- **Nguyên nhân kỹ thuật:**
  - Trong `web/src/app/cart/page.tsx`:
    - `checkedSubtotal` được tính dựa trên `item.price`. Tuy nhiên, với sản phẩm Flash Sale, `item.price` đã là giá đã giảm (115.200đ thay vì giá gốc 128.000đ).
    - Biến `productDiscount` tính chênh lệch `(originalPrice - price) * quantity` = 12.800đ.
    - Giao diện in ra: Tạm tính (424.200đ) -> Giảm giá (-12.800đ) -> Tạm tính (424.200đ). Người dùng nhìn vào thấy 424.200đ trừ 12.800đ vẫn bằng 424.200đ là hoàn toàn sai lệch về mặt toán học.
    - Đúng bản chất: Tổng tiền niêm yết ban đầu phải là `437.000đ`, Giảm Flash Sale `-12.800đ`, Tạm tính sau giảm là `424.200đ`.
    - Voucher: Trang giỏ hàng chỉ lưu mã voucher vào state mà không tính toán số tiền giảm trừ voucher vào bảng tóm tắt đơn hàng của giỏ hàng, khiến người dùng lầm tưởng voucher không hoạt động.
- **Giải pháp xử lý:**
  - Chuẩn hóa lại công thức hiển thị tại Giỏ hàng:
    - **Tổng tiền niêm yết (Gốc):** `437.000đ`
    - **Ưu đãi Flash Sale:** `-12.800đ`
    - **Tạm tính giỏ hàng:** `424.200đ`
  - Áp dụng tính năng tính tạm tính voucher ngay tại giỏ hàng nếu người dùng chọn voucher (hoặc hiển thị rõ ràng số tiền dự kiến được giảm).

---

### Vấn Đề 6: Tuyệt Đối Không Dùng Dữ Liệu Giả (Mock) - 100% Từ Database Thật
- **Nguyên nhân kỹ thuật:**
  - Tồn tại mảng dữ liệu giả `MOCK_AVAILABLE_VOUCHERS` trong `web/src/app/cart/page.tsx` khi API gặp lỗi.
  - Trạng thái `MOCK_PROVIDER_ONLY` trong `walletApi.ts`.
- **Giải pháp xử lý:**
  - Xóa bỏ triệt để toàn bộ các biến mock fallback trong `cart/page.tsx` và các component liên quan.
  - Nếu Database chưa có dữ liệu Flash Sale hoặc Voucher, giao diện phải hiển thị trạng thái trống (Empty State) chỉn chu: "Hiện chưa có mã giảm giá khả dụng" thay vì tự sinh ra dữ liệu ảo.
  - Chuẩn bị script seed chuẩn trong Database backend để nạp các chương trình khuyến mãi, flash sale, voucher thật phục vụ thử nghiệm và vận hành.

---

### Vấn Đề 7: Bé Cáo AI Chatbot - Tin Nhắn Quá Dài Dòng, Cứ Pushed Sách, UI Quá Tải
- **Hiện tượng:**
  - Người dùng hỏi chuyện bình thường nhưng bot liên tục đưa ra danh sách sách dài dằng dặc, tin nhắn dài như "sớ" khó đọc.
  - Cả tin nhắn chữ và thẻ card phía dưới đều lặp lại thông tin chi tiết của sách (giá, tác giả, mô tả dài dòng).
  - Khi hỏi những nội dung ngoài phạm vi, bot không giới hạn quyền hạn mà vẫn cố gắng đẩy sách.
- **Nguyên nhân kỹ thuật:**
  - Vị trí: `platform/apps/community-service/src/modules/chat/ai-chat.service.ts` và `web/src/ui/components/ai/FloatingAIChatbox.tsx`.
  - Trong `ai-chat.service.ts`, hàm `generateSmartLocalResponse` tự động ghép tên sách, tác giả, giá, lượt bán và trích đoạn mô tả dài vào trường `reply` văn bản; đồng thời trả về danh sách `suggestedBooks`.
  - UI `FloatingAIChatbox.tsx` vừa render tin nhắn chữ dài, vừa render danh sách thẻ sách to bên dưới, gây trùng lặp và quá tải thông tin.
- **Giải pháp xử lý:**
  1. **Tối giản nội dung văn bản (`reply`):**
     - Tin nhắn chữ chỉ phản hồi ngắn gọn 1-2 câu tự nhiên, súc tích trả lời đúng trọng tâm câu hỏi của người dùng.
     - Tuyệt đối không liệt kê lại thông tin chi tiết từng cuốn sách trong phần văn bản.
  2. **Xử lý phạm vi & quyền hạn:**
     - Nếu người dùng hỏi câu hỏi ngoài lề (không liên quan đến sách, đọc sách hoặc đơn hàng trên HUKI): Trả lời lịch sự, nhẹ nhàng thông báo Bé Cáo là thủ thư của HUKI nên chỉ có thể hỗ trợ các thông tin về sách, ebook và đơn hàng; sau đó mới gợi ý nhẹ nhàng chủ đề đọc sách liên quan.
  3. **Đơn giản hóa giao diện thẻ sách (UI Card):**
     - Thiết kế lại thẻ sách nhỏ gọn, chỉ hiển thị ảnh bìa, tên sách ngắn gọn, giá ưu đãi và giữ nguyên nút bấm **"Xem ngay"** để mở chi tiết sách.

---

### Vấn Đề 8: Xóa Bỏ Nút Tin Nhắn Trôi Nổi Góc Phải Dưới Màn Hình
- **Hiện tượng:** Ở góc phải dưới màn hình có một widget bong bóng tin nhắn chat tròn và nút "Tư vấn trực tuyến" trôi nổi, gây vướng víu và che khuất nội dung.
- **Nguyên nhân kỹ thuật:**
  - Trong `web/src/ui/components/layout/AppLayout.tsx` (dòng 147) có component `<FloatingChatWidget />` luôn được gắn vào layout chung của toàn bộ ứng dụng storefront.
  - Trong khi đó, tính năng chat đã có sẵn trên Header (icon Tin nhắn kèm badge đỏ số tin chưa đọc) và trên Thanh điều hướng Sidebar.
- **Giải pháp xử lý:**
  - Gỡ bỏ `<FloatingChatWidget />` khỏi `AppLayout.tsx` để giao diện góc dưới thoáng đãng, chỉ giữ lại icon chat trên Header và Sidebar đúng như thiết kế thống nhất.

---

### Vấn Đề 9: Rà Soát Checkbox Chính Sách & Đưa Thông Báo Học Tập Vào Trực Tiếp Nội Dung Chính Sách
- **Hiện tượng:**
  - Checkbox điều khoản tại trang đăng ký (`/auth/register`) bị tích sẵn (`agreeTerms: true`), và trang hoàn trả (`agreeReturnPolicy: true`).
  - Cần kiểm tra toàn bộ các checkbox chính sách trên website để đảm bảo người dùng tự tay tích chọn (không được tích sẵn).
  - Cần đưa thông báo rõ ràng, trang trọng, chuẩn nhận diện HUKI nhưng không dùng khung viền màu mè rời rạc bên dưới nút tích:
    `"Website thiết kế cho mục đích học tập không có mục đích thương mại"`
- **Vị trí rà soát & chuẩn hóa:**
  1. Trang đăng nhập: `web/src/app/auth/login/page.tsx` (sửa `rememberMe: false`).
  2. Trang đăng ký tài khoản: `web/src/app/auth/register/page.tsx` (sửa `agreeTerms: false`, bỏ khung box rời rạc).
  3. Trang yêu cầu đổi trả: `web/src/app/orders/[id]/return/page.tsx` (sửa `agreeReturnPolicy: false`).
  4. Trang thanh toán: `web/src/app/checkout/page.tsx` (bỏ khung box rời rạc bên dưới điều khoản).
  5. Trang đăng ký Đại sứ / Affiliate: `web/src/app/account/affiliate/register/page.tsx` (bỏ khung box rời rạc).
  6. Modal chính sách nhanh: `web/src/ui/components/policy/PolicyQuickModal.tsx` (tích hợp banner thông báo học tập ngay trong modal).
  7. Trang chính sách trung tâm & chi tiết: `web/src/app/policy/page.tsx`, `web/src/app/policy/[slug]/page.tsx` và văn bản pháp lý `web/src/ui/data/policiesData.ts`.
- **Giải pháp xử lý:**
  - Đảm bảo 100% checkbox đồng ý chính sách/điều khoản đều có giá trị mặc định là `false`.
  - Thay vì để một ô khung rời rạc dưới checkbox gây mất thẩm mỹ, tích hợp dòng chữ chuẩn nhận diện thương hiệu HUKI (`text-[#003B2B]` / `text-emerald-800`, font chữ rõ ràng, thanh lịch) trực tiếp vào nội dung các trang và modal chính sách.

---

## Trạng Thái: Chờ Người Dùng Duyệt (Không Can Thiệp Code Trong Turn Này)
Toàn bộ phân tích chi tiết đã được ghi nhận vào `tasks/bug-mod09.md`. Hệ thống giữ nguyên trạng thái code và sẵn sàng triển khai từng bước theo chỉ đạo của bạn.

