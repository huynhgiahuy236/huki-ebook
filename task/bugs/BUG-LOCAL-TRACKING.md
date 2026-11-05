# SỔ TAY THEO DÕI VÀ BÓC TÁCH LỖI MÔI TRƯỜNG LOCAL
## (BUG LOCAL TRACKING & ARCHITECTURAL RESOLUTION)

> **Nhánh làm việc:** `fix/local-fixes`  
> **Mục tiêu:** Ghi nhận tuần tự, bóc tách nguyên nhân gốc rễ, phân tích ảnh hưởng dây chuyền và đề xuất giải pháp kiến trúc chuyên nghiệp cho từng lỗi môi trường Local do người dùng cung cấp.  
> 
> **NGUYÊN TẮC BẮT BUỘC:**
> 1. **Tuyệt đối KHÔNG mock data:** Sử dụng dữ liệu thật từ cơ sở dữ liệu và API; tôn trọng tính toàn vẹn nghiệp vụ (không bypass, không làm biến mất lỗi một cách tạm bợ).
> 2. **Chú ý tiểu tiết & hiệu ứng dây chuyền (Domino Effect):** Phân tích xem lỗi này có liên đới đến các bảng DB, service khác, giỏ hàng, thanh toán, DRM hay hiển thị liên quan hay không.
> 3. **Quy trình:** Phân tích Nguyên nhân -> Giải pháp dứt khoát -> Chờ người dùng chỉ thị/duyệt -> Mới tiến hành can thiệp code.
> 4. **Quản lý Git:** Xong tác vụ nào thì commit cục bộ (`git commit`) với message chuẩn Conventional Commits; **TUYỆT ĐỐI KHÔNG PUSH**.
> 5. **Đóng tiến trình dứt điểm sau khi chạy (Process Hygiene):** Tuyệt đối không để script chạy ngầm / treo tiến trình (luôn đảm bảo đóng kết nối DB, ngắt server hoặc `process.exit(0)` trong `finally`). Phải tắt/kill ngay lập tức mọi background task sau khi hoàn thành, không để nghẽn hàng đợi hoặc làm đứng yêu cầu của người dùng.
> 6. **Tập trung hóa thư mục `scripts/` (Code Hygiene):** Toàn bộ script hỗ trợ, migration, verification hoặc chạy thử nghiệm phải được đặt 100% trong thư mục `scripts/`. Tuyệt đối không tạo file script rải rác ngoài thư mục gốc hay trong `task/`, giữ cho codebase luôn gọn gàng và sạch sẽ.
> 7. **Dọn sạch file tạm & JSON dump sau khi dùng (Artifact Cleanup):** Các file `.json` dump dữ liệu quét thô, cache trung gian sau khi đã nạp hoặc tổng hợp xong vào báo cáo chính thức phải được xóa bỏ ngay, tuyệt đối không để lưu cữu gây rối mắt và làm bẩn cây thư mục dự án.

---

## 📋 BẢNG TỔNG HỢP TIẾN ĐỘ THEO DÕI CÁC LỖI (TRACKING MATRIX)

| STT | Mã Lỗi | Mô Tả Tóm Tắt | Phạm Vi / Phân Hệ | Mức Độ | Trạng Thái Phân Tích | Trạng Thái Xử Lý & Commit |
| :---: | :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | **BUG-LOC-001** | Voucher dải banner trang chủ load lại bị mất trạng thái "Đã lưu"; Chưa đồng bộ ví `user_saved_vouchers` | `web/src/app/page.tsx` + `promotion-service` | Major | ✅ Đã bóc tách gốc rễ & Giải pháp | ⏳ Chờ lệnh duyệt code |
| 2 | **BUG-LOC-002** | Rà soát & Thẩm định Bộ lọc `/books` (`@Max(1000)`) và 7 Kịch bản Edge Cases Thanh toán | `commerce-service` + `promotion-service` + `web` | Blocker | ✅ Đã kiểm tra thực tế trong code & Thẩm định đạt chuẩn | ℹ️ Đã có sẵn trong code (Commit `f4ff6a3`, `cd3789d`) |

---

## 🔍 CHI TIẾT PHÂN TÍCH TỪNG LỖI

---

### [BUG-LOC-001] Dải Gom Voucher Trang Chủ Load Lại Mất Trạng Thái "Đã Lưu", Chưa Đồng Bộ Ví `user_saved_vouchers` & Nguồn Gốc Dữ Liệu

#### 1. Hiện Tượng Thực Tế
- Trên dải voucher dưới banner Flash Sale ở Trang chủ (`/`), hiển thị danh sách các mã ưu đãi (`GIẢM 30.000Đ`, `GIẢM 20%`, `GIẢM 15%`, `GIẢM 10%...`).
- Người dùng bấm nút **"Lưu mã"**, nút chuyển sang **"Đã lưu"**. Tuy nhiên khi F5 / tải lại trang:
  - Nút lại trở về trạng thái **"Lưu mã"** ban đầu.
  - Trong khi đó, mở Profile / Ví voucher cá nhân thì voucher thực tế đã tồn tại.

#### 2. Nguồn Gốc Dữ Liệu & Tính Xác Thực ("Nó từ đâu ra? Có người thật việc thật không?")
- **Dữ liệu hoàn toàn là THẬT 100%**:
  - Dữ liệu nằm trực tiếp trong bảng `vouchers` của database `huki_promotion` (PostgreSQL qua Microservice `promotion-service` cổng 3004).
  - Kiểm tra trực tiếp DB `huki_promotion` có 10 vouchers đang hoạt động (`status = 'ACTIVE'`). Các voucher trên ảnh bao gồm:
    1. `vouch-FREESHIP` (Code `FREESHIP`): Giảm 30.000đ cho đơn từ 80.000đ - Voucher toàn sàn do Quản trị viên khởi tạo cho chiến dịch miễn phí vận chuyển.
    2. `5b26c79d-...` (Code `HUKINEW`): Giảm 20% cho đơn từ 50.000đ - Voucher do chủ gian hàng Trí Tuệ Việt (Store ID `3094e54e-...`) tạo riêng cho Người theo dõi (`target_audience = 'FOLLOWERS_ONLY'`).
    3. `vouch-SHOP15` (Code `SHOP15`): Giảm 15% cho đơn từ 90.000đ - Voucher toàn sàn.
    4. `08dc04dd-...` (Code `HUKIE2E10`): Giảm 10% cho đơn từ 100.000đ - Voucher toàn sàn.
    5. `vouch-HUKI10` (Code `HUKI10`): Giảm 10% cho đơn từ 100.000đ - Voucher tri ân độc giả.
    6. `6eeb3aba-...` (Code `SDSSDSASD`): Giảm 10% cho đơn từ 100.000đ - Voucher của gian hàng Alpha Books (Store ID `501ece69-...`).
  - Về ví người dùng: Trong bảng `user_saved_vouchers` của DB `huki_promotion`, các user thật từ `huki_identity` (như user `8d501a4d...`) đã có các bản ghi lưu voucher này thực tế.

#### 3. Khả Năng Áp Dụng Thực Tế ("Có áp dụng được thiệt không?")
- **CÓ ÁP DỤNG ĐƯỢC 100%**:
  - Trong quy trình thanh toán `/checkout`, hệ thống gọi `voucherApi.getWalletVouchers()` để nạp toàn bộ voucher mà user đã lưu trong ví.
  - Backend `commerce-service` (`pricing-calculator.service.ts`) kết nối sang `promotion-service` qua endpoint `POST /vouchers/validate` để kiểm tra điều kiện nghiêm ngặt:
    + Giá trị đơn hàng đạt mức tối thiểu (`minOrderAmount`).
    + Ngày đặt hàng nằm trong khung thời gian hợp lệ (`startsAt` <= now <= `expiresAt`).
    + Không vượt quá giới hạn lượt dùng (`totalUsage`, `maxUsagePerUser`).
    + Khớp điều kiện đối tượng (ví dụ: `FOLLOWERS_ONLY` thì user phải đang theo dõi gian hàng đó).
  - Khi thỏa mãn, hệ thống chiết khấu trực tiếp vào tổng tiền đơn hàng và khi đặt hàng thành công sẽ tự động tạo bản ghi `voucher_usages` để trừ số lượt sử dụng.

#### 4. Nguyên Nhân Gốc Rễ Gây Lỗi Hiển Thị
Vấn đề nằm tại mã nguồn `web/src/app/page.tsx`:
1. **Thiếu nạp danh sách ví khi khởi tạo**:
   - Dòng 71: `const [savedVouchers, setSavedVouchers] = useState<string[]>([]);`
   - Trong `useEffect` khi load trang chủ, code chỉ gọi `voucherApi.getAvailableVouchers()` để lấy danh sách voucher hiển thị, **HOÀN TOÀN KHÔNG gọi `voucherApi.getWalletVouchers()`** để đồng bộ những mã mà người dùng đã lưu trước đó. Do đó, mỗi khi load lại trang, `savedVouchers` luôn bị reset về `[]`.
2. **Hàm `handleSaveVoucher` chưa chuẩn nghiệp vụ**:
   - Dòng 790-794:
     ```ts
     const handleSaveVoucher = (code: string) => {
       if (savedVouchers.includes(code)) return;
       setSavedVouchers((prev) => [...prev, code]);
       showToast(`Đã lưu voucher ${code} vào ví thành công!`, "success");
     };
     ```
   - Hàm này chỉ `setSavedVouchers` tạm bợ vào bộ nhớ React State của trình duyệt, **không hề gọi API `voucherApi.saveVoucher(voucher.id)`** lên máy chủ.
   - Khi người dùng bấm lưu ở Trang chủ, voucher chưa hề được lưu vào DB. Khi reload trang, state biến mất khiến nút quay lại thành "Lưu mã". Còn nếu voucher đã có trong Profile (do người dùng lưu ở trang `/vouchers` hoặc `/shop/[id]`), trang chủ cũng không đọc được vì không fetch ví về.
3. **Thiếu thông tin `id` trong `voucherList`**:
   - Mảng `voucherList` (dòng 378) chỉ map `code`, không truyền `id` của voucher, trong khi API backend `POST /vouchers/:id/save` bắt buộc nhận `voucherId` dạng UUID.

#### 5. Ảnh Hưởng Dây Chuyền (Domino Effect)
- **Tâm lý người dùng**: Tưởng rằng voucher chưa được lưu nên bấm lưu nhiều lần, hoặc nghi ngờ hệ thống bị lỗi / voucher ảo.
- **Voucher có điều kiện Follower (`HUKINEW`)**: Nếu bấm lưu mà chưa follow gian hàng, backend sẽ trả về lỗi không đủ điều kiện (`FOLLOWERS_ONLY`), nhưng frontend trang chủ nếu không gọi API sẽ không hiển thị thông báo yêu cầu follow gian hàng như bên trang `/shop/[id]`.

#### 6. Giải Pháp Kỹ Thuật Chuẩn Nghiệp Vụ (Đề Xuất Trước Khi Code)
1. **Bổ sung `id` vào `voucherList`** trong `web/src/app/page.tsx`:
   - Giữ nguyên `id: v.id` cùng với `code` để phục vụ gọi API lưu mã.
2. **Đồng bộ Ví Voucher khi người dùng đăng nhập**:
   - Trong `useEffect` của `web/src/app/page.tsx`, khi phát hiện người dùng đã đăng nhập (`tokenStorage.getAccessToken()`), gọi đồng thời `voucherApi.getWalletVouchers()`.
   - Trích xuất toàn bộ `code` từ `wallet.platform.all` và `wallet.stores[].vouchers` để khởi tạo `setSavedVouchers(savedCodes)`. Khi đó, vừa vào trang chủ hoặc sau khi F5, toàn bộ các mã đã có trong ví sẽ hiển thị ngay trạng thái **"Đã lưu"** và disabled nút.
3. **Nâng cấp hàm `handleSaveVoucher(v: VoucherItem)`**:
   - Kiểm tra đăng nhập: nếu chưa đăng nhập -> hiển thị toast cảnh báo và hướng dẫn đăng nhập.
   - Kiểm tra nếu voucher là `FOLLOWERS_ONLY` và người dùng chưa follow shop -> kích hoạt follow shop trước hoặc thông báo yêu cầu theo dõi shop.
   - Gọi API thực tế: `await voucherApi.saveVoucher(v.id)`.
   - Khi API backend phản hồi thành công (`res.success`) -> mới thêm code vào `savedVouchers` và toast thành công.
   - Nếu API báo lỗi (hết hạn, hết lượt, không đủ điều kiện) -> hiển thị thông báo lỗi thật từ backend.

---

### [BUG-LOC-002] Thẩm Định Hiện Trạng Bộ Lọc Danh Mục `/books` & 7 Kịch Bản Edge Cases Thanh Toán

#### 1. Yêu Cầu Của Người Dùng
- Kiểm tra xem các nội dung phân tích ở phiên trước về **Lỗi Bộ Lọc trang `/books`** và **7 kịch bản Edge Cases trong Thanh toán** đã thực sự được làm vào mã nguồn hay chỉ là phân tích trên lý thuyết.
- Đánh giá xem các biện pháp kỹ thuật được đề xuất có đúng đắn, chuẩn nghiệp vụ và toàn diện hay chưa.

#### 2. Kết Quả Kiểm Tra Trực Tiếp Trong Mã Nguồn Thực Tế

##### A. Về Lỗi Bộ Lọc Danh Mục (`/books`):
- **Trạng thái thực tế: ĐÃ ĐƯỢC CODE VÀ COMMIT VÀO HỆ THỐNG (Commit `f4ff6a3`)**.
- **Chi tiết kiểm chứng:**
  1. Backend `commerce-service`:
     - File `BookListQueryDto` (`platform/apps/commerce-service/src/modules/books/dto/book-list-query.dto.ts:43`): Đã được cập nhật `@Max(1000)`.
     - File `PageQueryDto` (`platform/apps/commerce-service/src/common/dto/page-query.dto.ts:17`): Đã được cập nhật `@Max(1000)`.
     - -> API `GET /api/v1/books?limit=1000` không còn bị ném lỗi 400 Bad Request nữa, trả về toàn bộ 248 cuốn sách trong DB.
  2. Frontend Next.js:
     - File `web/src/app/books/page.tsx:67-85`: Đã cài đặt cơ chế 2 lớp: gọi `limit: 1000`, nếu lỗi hoặc rỗng tự động fallback sang `limit: 100`.
     - Thuật toán phân loại thể loại thông minh theo từ khóa (`kinh tế`, `công nghệ`, `văn học`) tại dòng 168-178 đã hoạt động.
     - Bộ đếm định dạng tại dòng 306-309: `ebook: allBooks.filter((b) => b.hasEbook).length`, `physical: allBooks.filter((b) => b.hasPaper).length` -> Không còn bị đếm Ebook = 0.
- **Thẩm định giải pháp:** Biện pháp này **HOÀN TOÀN CHÍNH XÁC VÀ ĐẠT CHUẨN**. Việc nâng limit query lên 1000 kết hợp fallback an toàn đảm bảo giao diện luôn có dữ liệu. *(Lưu ý: 73 cuốn sách bị null author_id và 77 cuốn null publisher_id trong DB huki_commerce sẽ được giải quyết khi chạy script migration data).*

##### B. Về 7 Kịch Bản Edge Cases Thanh Toán:
- **Trạng thái thực tế: CẢ 7 TRƯỜNG HỢP ĐỀU ĐÃ ĐƯỢC XÂY DỰNG TRỰC TIẾP TRONG CODE**.
- **Chi tiết kiểm chứng từng kịch bản:**
  1. **Ebook DRM vs Sách giấy:**
     - Đã có tại `web/src/app/checkout/page.tsx:135-152` và `1867-1916`.
     - Khi đơn thuần Ebook (`!effectiveHasPhysical`), phí vận chuyển tự động = 0đ, tự động chuyển phương thức sang `ONLINE_PAYMENT`, khóa cứng nút chọn COD kèm tooltip giải thích rõ ràng.
  2. **Khóa liên dịch vụ `INTERNAL_SERVICE_KEY`:**
     - Đã có tại commit `cd3789d` trong `platform/apps/promotion-service` và `shipping-service`.
     - Đảm bảo header `x-internal-service` được chấp nhận đồng nhất giữa các microservices, triệt tiêu lỗi 403 Forbidden.
  3. **Chống bán vượt tồn kho Flash Sale (Atomic Redis Lua Script):**
     - Đã có tại `platform/apps/promotion-service/src/modules/flash-sales/flash-sales.service.ts:400-450`.
     - Sử dụng `redis.eval(...)` với kịch bản Lua Script thực thi nguyên tử trên Redis để kiểm tra quota người dùng và trừ tồn kho trong cùng 1 chu kỳ, loại bỏ Race Condition.
  4. **Cơ chế Auto-Rollback khi lỗi:**
     - Đã có hàm `releaseOrder()` trong `flash-sales.service.ts:480-530` để giải phóng đặt trước và hoàn lại quota nếu transaction tạo đơn bị rollback.
  5. **Đơn hàng 0đ (Free Order):**
     - Đã có tại `web/src/app/checkout/page.tsx:1256-1276`.
     - Khi `orderData.grandTotal <= 0` hoặc `paymentStatus === 'SUCCEEDED'`, hệ thống bỏ qua cổng thanh toán PayOS và chuyển thẳng sang `/order-success?paymentMethod=FREE`, kích hoạt sách ngay vào Tủ Sách.
  6. **Thanh toán VietQR động (PayOS):**
     - Đã có tại `web/src/app/checkout/page.tsx:1278-1287` chuyển sang route `/checkout/payment/[orderId]` với countdown 15 phút và WebSocket xác nhận tức thì.
  7. **Đơn hàng đa gian hàng (Multi-Store Cart):**
     - Đã có tại `checkoutApi.confirmCheckout` tạo danh sách `sellerOrders` độc lập cho từng chủ shop.

- **Thẩm định giải pháp:** Mô hình xử lý 7 kịch bản này là **chuẩn mực kiến trúc TMĐT phân tán (Enterprise Distributed E-commerce)**. Toàn bộ logic đã có sẵn trong codebase hiện tại của nhánh `fix/local-fixes`.
