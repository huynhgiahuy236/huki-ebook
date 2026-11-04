# BÁO CÁO PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ & GIẢI PHÁP KHẮC PHỤC DỨT KHOÁT (MÔI TRƯỜNG LOCAL)

> **Nguyên tắc xử lý:**
> 1. Tập trung 100% vào môi trường **Local** trên nhánh `feature/fix-bug-local`.
> 2. **Tuyệt đối không can thiệp code** khi chưa có chỉ đạo phê duyệt phương án.
> 3. Phân tích nguyên nhân đến tận gốc rễ (Root Cause) ở cả Frontend và Backend.
> 4. **Giải pháp dứt khoát duy nhất:** Ưu tiên logic nghiệp vụ toàn vẹn lên hàng đầu, không loại bỏ tính năng, không đưa ra phương án phụ A/B.
> 5. **Chủ động tìm kiếm lỗi liên đới:** Xem xét A dính tới B và quét toàn bộ các pattern lỗi tương tự trên hệ thống.

---

## 1. DANH SÁCH 11 LỖI ĐÃ XÁC ĐỊNH & PHÂN TÍCH CHI TIẾT

---

### LỖI 01: Bấm "Theo dõi gian hàng" báo lỗi "Vui lòng đăng nhập tài khoản để thực hiện chức năng này" dù đã đăng nhập
* **Vị trí phát sinh:** 
  - Frontend: `web/src/app/shop/[id]/page.tsx` (`handleFollowStore` dòng 96-114).
  - API Client: `web/src/ui/api/apiClient.ts` (dòng 196, 506).
  - Backend Gateway: `platform/apps/api-gateway/src/modules/proxy/service-proxy.middleware.ts` (dòng 151).
  - Backend Service: `platform/apps/business-service/src/modules/business/business.controller.ts` (dòng 158-168).
* **Tại sao có lỗi này:**
  1. Khi người dùng vào trang shop theo slug `/shop/nha-sach-huki-official`, hàm lấy thông tin gán `businessData.id = store.businessId || store.id`. Khi `store.businessId` bị thiếu trong payload trả về của store, biến `business.id` ở client thực chất mang giá trị của `StoreId` chứ không phải `BusinessId`.
  2. Endpoint gọi tới Gateway là `POST /api/v1/businesses/{id}/follow`. Gateway classify route này là `AUTHENTICATED`. Nếu client chạy ở local và gửi request qua `apiClient`, khi token chưa được truyền đúng header do cơ chế cookie/localStorage không đồng bộ với Gateway port `3000`, Gateway trả về 401 `AUTH_TOKEN_MISSING` với nội dung *"Authentication token is required"*.
  3. Khi vượt qua Gateway đến `business-service`, `business-service` tìm bản ghi theo `Business.id`. Do nhận nhầm `store.id`, truy vấn Prisma trả về `BUSINESS_NOT_FOUND`.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Dính tới Lỗi 10 (Đăng ký doanh nghiệp bước 5):** Cả hai đều bị chặn bởi cơ chế decode token Gateway $\rightarrow$ header `x-user-id` không được `business-service` công nhận qua Passport `JwtAuthGuard` truyền thống nếu service tự verify độc lập.
  - **Trang chi tiết sách (`/book/[id]`):** Nút "Theo dõi gian hàng" ở trang chi tiết sách cũng dùng chung hàm `businessApi.followBusiness(targetBizId)` và bị văng cùng lỗi này.
  - **Trang danh sách theo dõi (`/following`):** Khi load các shop đã follow, API `getMyFollowedBusinessIds()` trả về mảng rỗng khiến UI luôn hiển thị trạng thái chưa theo dõi.
* **Cách khắc phục dứt khoát duy nhất:**
  - Tại `web/src/app/shop/[id]/page.tsx`: Chuẩn hóa dữ liệu nhận dạng cửa hàng luôn lấy chính xác `businessId` gốc từ quan hệ Store-Business.
  - Tại `platform/apps/business-service/src/modules/business/business.service.ts`: Bổ sung fallback tìm kiếm thông minh: nếu `businessId` truyền vào không khớp bảng `Business`, tự động truy vấn bảng `Store` lấy trường `businessId` tương ứng để thực hiện ghi nhận `BusinessFollower`.
  - Tại `platform/apps/business-service/src/modules/auth/guards/jwt-auth.guard.ts`: Đồng bộ cơ chế nhận diện người dùng từ header tin cậy nội bộ `x-user-id` do Gateway đã xác thực chuyển tiếp sang.

---

### LỖI 02: Seller "Nhà sách HuKi Official" có danh mục sản phẩm khác với danh sách sản phẩm hiển thị ngoài trang Shop của khách
* **Vị trí phát sinh:**
  - Frontend Seller: `web/src/app/seller/products/page.tsx`.
  - Frontend Shop Khách: `web/src/app/shop/[id]/page.tsx` (dòng 235-330).
  - Backend Service: `platform/apps/commerce-service/src/modules/books/books.service.ts` (`findAll` / query catalog).
* **Tại sao có lỗi này:**
  - Bên Seller Portal (`/seller/products`), hệ thống lọc sách theo `businessId` của phiên đăng nhập chủ gian hàng (`activeBusinessId`).
  - Bên Khách hàng (`/shop/[id]`), trang shop query sách từ Catalog API với tham số `storeId`. Nhưng trong database, khi sách được tạo, nhiều bản ghi chỉ lưu `businessId` mà trường `storeId` bị `NULL` (hoặc lưu `storeId` mặc định khác với cửa hàng đại diện của doanh nghiệp). Do đó, bộ lọc `WHERE storeId = ...` ngoài storefront bỏ sót toàn bộ các sách này.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Thống kê tổng số sản phẩm trên Header của Shop:** Bị hiển thị sai lệch số lượng (ví dụ header báo 12 sản phẩm nhưng bên dưới chỉ render 4 sản phẩm).
  - **Bộ lọc danh mục (Categories Filter) của Shop:** Các tab "Tất cả", "Sách nói", "Ebook", "Sách giấy" hiển thị danh mục trống vì không có sản phẩm map đúng `storeId`.
* **Cách khắc phục dứt khoát duy nhất:**
  - Cập nhật hàm query sản phẩm của gian hàng trong `commerce-service` (`books.service.ts`): Khi truy vấn sách của một gian hàng, điều kiện tìm kiếm bắt buộc phải truy vấn theo cả cặp quan hệ: `OR: [{ storeId: targetStoreId }, { businessId: targetBusinessId }]` và kết hợp trạng thái hiển thị `status: 'ACTIVE'`, `deletedAt: null`.

---

### LỖI 03: Sách "Atomic Habits" gắn gian hàng Alpha Books nhưng bấm vào Shop thì không có sản phẩm nào
* **Vị trí phát sinh:**
  - Frontend: `web/src/app/book/[id]/page.tsx` và `web/src/app/shop/[id]/page.tsx`.
  - Backend: Seeder dữ liệu `platform/scripts/seed-complete-ecosystem.cjs` & `commerce-service`.
* **Tại sao có lỗi này:**
  1. Dữ liệu seed và DTO tạo sách gán cứng thông tin hiển thị text `publisher: 'Alpha Books'` nhưng trường khoá ngoại `businessId` và `storeId` trong bảng `books` lại trỏ về ID của một Business khác (hoặc ID seed tạm không tồn tại trong bảng `businesses`/`stores`).
  2. Slug gian hàng ở trang chi tiết sách được tạo tự động từ tên nhà xuất bản text (`alpha-books-official`), nhưng trong database chỉ có slug `nha-sach-huki-official` hoặc `nha-nam-official`. Khi khách bấm vào URL slug không tồn tại, hàm `getStoreBySlug` trả về null và rơi vào nhánh empty state.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Breadcrumbs navigation:** Đường dẫn điều hướng `Trang chủ > NXB > Tên Sách` trỏ về trang chết 404/Empty.
  - **Tìm kiếm theo NXB:** Bộ lọc tìm kiếm sách theo Nhà Xuất Bản bên trang tìm kiếm `/search?publisher=...` trả về kết quả rỗng.
* **Cách khắc phục dứt khoát duy nhất:**
  - Chuẩn hóa quan hệ dữ liệu: Mọi sách khi lưu vào hệ thống bắt buộc phải liên kết với một `businessId` và `storeId` thực sự hợp lệ đang tồn tại trong hệ thống.
  - Tại trang chi tiết sách `web/src/app/book/[id]/page.tsx`: Link điều hướng đến gian hàng phải ưu tiên lấy theo `book.business.slug` hoặc `book.store.slug` thực tế từ cơ sở dữ liệu thay vì tự sinh slug từ chuỗi text tên NXB.

---

### LỖI 04: Bấm nhắn tin cho Shop thì bị đổi thành tài khoản "Độc Giả HUKI", Seller không nhận được tin nhắn
* **Vị trí phát sinh:**
  - Frontend: `web/src/app/account/messages/page.tsx` và `web/src/ui/components/seller/SellerChatView.tsx`.
  - Backend: `platform/apps/community-service/src/modules/chat/chat.service.ts` (`createOrGetConversation`, `sendMessage`).
* **Tại sao có lỗi này:**
  1. Khi từ trang shop bấm "Nhắn tin", URL mở ra dạng `/account/messages?shop={storeId}&storeName={storeName}`. Component chat đọc query param và khởi tạo cuộc hội thoại nhưng truyền nhầm `userId` của chính người mua làm `participant` đối ứng thay vì ID người dùng chủ sở hữu (`ownerId`) của gian hàng đó.
  2. Do đó, hệ thống tạo phòng chat giữa Người mua và chính Người mua, tự gán nhãn tên hiển thị của chính mình thành "Độc Giả HUKI".
  3. Tin nhắn gửi đi chỉ lưu trong phòng chat cá nhân này nên tài khoản Seller của chủ shop không hề nhận được WebSocket event và không thấy tin nhắn trong Seller Portal.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Hệ thống Thông báo tin nhắn (Notification Gateway):** Chuông thông báo của Seller không nhảy số tin nhắn mới.
  - **Chatbot / Hỗ trợ tự động:** Tin nhắn gửi vào phòng chat rác làm sai lệch luồng CSKH của shop.
* **Cách khắc phục dứt khoát duy nhất:**
  - Tại nút "Nhắn tin" trang shop: Truyền tham số `businessOwnerId` (User ID thực sự của chủ gian hàng) vào URL điều hướng.
  - Tại `platform/apps/community-service/src/modules/chat/chat.service.ts`: Khi nhận yêu cầu chat với shop theo `storeId`/`businessId`, backend tự động truy vấn tìm `ownerId` của Business đó để làm `recipientId` cho cuộc trò chuyện, bảo đảm phòng chat luôn kết nối giữa `Buyer.userId` và `SellerOwner.userId`.

---

### LỖI 05: Đọc sách Ebook DRM báo lỗi "Chưa có bản đọc số"
* **Vị trí phát sinh:**
  - Frontend: `web/src/app/reader/[id]/page.tsx` và `web/src/ui/api/libraryApi.ts`.
  - Backend: `platform/apps/commerce-service/src/modules/books/book-access.service.ts` (`getReadingSession`, `streamDecryptedSegment`).
  - Storage: `platform/apps/commerce-service/src/modules/books/storage/r2-ebook.storage.ts`.
* **Tại sao có lỗi này:**
  1. Ở môi trường Local, service đang trỏ tệp Ebook DRM lên Cloudflare R2 hoặc thư mục mock không tồn tại đường dẫn file PDF thật.
  2. Trong `book-access.service.ts`, hàm kiểm tra quyền đọc bản mẫu (Sample/Trial) yêu cầu cờ `hasDigital = true` và `trialFileUrl` hợp lệ. Nhưng dữ liệu sách seed ở local chỉ có file sách giấy hoặc link URL dummy không tải được stream dữ liệu.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Tủ sách cá nhân (`/library`):** Sách đã mua thành công nhưng bấm "Đọc ngay" bị văng lỗi trắng màn hình (Reader Crash).
  - **Trình đọc WebReader:** Canvas PDF.js không nhận được byte stream mã hoá dẫn tới infinite loading spinner.
* **Cách khắc phục dứt khoát duy nhất:**
  - Tại `platform/apps/commerce-service/src/modules/books/storage/local-ebook.storage.ts`: Thiết lập bộ lưu trữ Storage Driver Local chuẩn xác, trỏ vào thư mục lưu trữ file mẫu PDF DRM nội bộ trên máy (`e:/HuKi/platform/uploads/ebooks/sample.pdf`).
  - Trong `book-access.service.ts`: Nếu môi trường là Local và không có kết nối R2 Cloudflare, hệ thống tự động fallback đọc file sample PDF cục bộ có sẵn để đảm bảo toàn bộ luồng WebReader/DRM mở đọc trơn tru.

---

### LỖI 06: Trang Thanh Toán (`/checkout?direct=1`) báo "Vui lòng kiểm tra và điền đầy đủ các thông tin bắt buộc..." dù đã điền đủ
* **Vị trí phát sinh:**
  - Frontend: `web/src/app/checkout/page.tsx` (`handlePlaceOrder`).
  - Form validation: Kiểm tra schema form địa chỉ và người nhận.
  - Backend: `platform/apps/commerce-service/src/modules/orders/checkout.service.ts` (`confirmCheckout`).
* **Tại sao có lỗi này:**
  1. Khi thanh toán Ebook DRM hoặc mua ngay (`direct=1`), form ẩn bớt các trường địa chỉ giao hàng vật lý (Phường/Xã/Quận/Huyện).
  2. Tuy nhiên hàm validate ở frontend `validateForm()` vẫn áp đặt rule kiểm tra bắt buộc của đơn hàng sách giấy truyền thống: đòi hỏi `addressId` hoặc bộ 4 trường địa chỉ cụ thể.
  3. Đồng thời, regex kiểm tra số điện thoại người nhận đang chặn các đầu số hợp lệ của Việt Nam hoặc yêu cầu tiền tố `+84` cứng.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Áp dụng Voucher:** Khách hàng không thể bấm áp dụng voucher thanh toán vì form checkout luôn ở trạng thái `invalid`.
  - **Tích hợp Cổng thanh toán (VNPay/MoMo/COD):** Luồng tạo URL thanh toán bị chặn đứng hoàn toàn.
* **Cách khắc phục dứt khoát duy nhất:**
  - Tại `web/src/app/checkout/page.tsx`: Phân tách rành mạch logic validation theo loại hình giỏ hàng:
    - Nếu đơn hàng **100% là Ebook/Sản phẩm số**: Chỉ yêu cầu Tên, Email nhận sách, Số điện thoại liên hệ; bỏ qua toàn bộ validation địa chỉ giao hàng và phương thức vận chuyển.
    - Nếu đơn hàng **có Sách giấy**: Bắt buộc đầy đủ địa chỉ giao hàng chuẩn xác.

---

### LỖI 07: Seller tạo Voucher báo lỗi "Dịch vụ máy chủ tạm thời phản hồi chậm..."
* **Vị trí phát sinh:**
  - Frontend: `web/src/app/seller/promotions/vouchers/page.tsx`.
  - Backend: `platform/apps/promotion-service/src/modules/vouchers/vouchers.service.ts` (`createVoucher`).
  - Database: Schema Prisma `promotion-service` thiếu đồng bộ cột `target_audience`.
* **Tại sao có lỗi này:**
  1. Frontend gửi lên payload tạo voucher có trường `targetAudience` (dành cho người theo dõi, khách mới, hoặc toàn sàn).
  2. Backend `promotion-service` thực hiện câu lệnh Prisma insert trực tiếp trường này vào DB. Tuy nhiên cơ sở dữ liệu `huki_promotion` ở local chưa được chạy migration bổ sung cột `target_audience`, dẫn đến Prisma ném exception lỗi cú pháp SQL và Gateway timeout/500 sau thời gian chờ.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Khách lưu voucher ở Shop (`/shop/[id]`):** Không hiển thị được danh sách voucher của gian hàng.
  - **Trang quản lý khuyến mãi Seller:** Danh sách voucher bị đơ hoặc tải chậm do service dính lỗi unhandled exception.
* **Cách khắc phục dứt khoát duy nhất:**
  - Chạy migration đồng bộ schema cho cơ sở dữ liệu `promotion-service` trên local (`npx prisma migrate deploy` hoặc `push`).
  - Tại `vouchers.service.ts`: Xử lý validate và sanitize DTO đầu vào, đảm bảo trường `targetAudience` có giá trị fallback mặc định `ALL` nếu DB chưa có cấu hình tương thích.

---

### LỖI 08: Seller đã có sản phẩm nhưng khi tạo Flash Sale thì không có sản phẩm nào để thêm
* **Vị trí phát sinh:**
  - Frontend: `web/src/ui/components/seller/SellerFlashSaleView.tsx` (`fetchSellerProducts`).
  - Backend: `platform/apps/commerce-service/src/modules/books/books.controller.ts` & `books.service.ts`.
* **Tại sao có lỗi này:**
  - Khi mở popup chọn sản phẩm đưa vào Flash Sale, frontend gọi API lấy danh sách sách của shop với điều kiện filter quá ngặt: yêu cầu đồng thời `status = 'ACTIVE'`, `moderationStatus = 'APPROVED'`, `stock > 0` và `format = 'PHYSICAL'`.
  - Các sách mới đăng của seller ở local đang mang trạng thái chờ duyệt hoặc trường `moderationStatus` là `PENDING`/`DRAFT`, khiến truy vấn lọc trả về mảng rỗng `[]`.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Tạo chiến dịch Flash Sale:** Không thể hoàn tất bước 2 của việc tạo chiến dịch Flash Sale gian hàng.
  - **Khuyến mãi giảm giá (`/seller/promotions/discounts`):** Gặp lỗi tương tự khi áp dụng giảm giá trực tiếp theo sản phẩm.
* **Cách khắc phục dứt khoát duy nhất:**
  - Cập nhật API lấy sản phẩm cho khuyến mãi trong `books.service.ts`: Trả về toàn bộ danh sách sản phẩm hợp lệ thuộc sở hữu của Seller (`businessId`), hiển thị kèm nhãn trạng thái (Đủ điều kiện / Chưa duyệt / Hết hàng) trên giao diện thay vì giấu tiệt sản phẩm, và cho phép áp dụng Flash Sale cho cả sách giấy lẫn Ebook có bản quyền.

---

### LỖI 09: Thêm sách Hybrid thì giá sách bìa mềm và sách Ebook bị sai lệch so với giá Seller nhập
* **Vị trí phát sinh:**
  - Frontend: `web/src/ui/components/seller/SellerCreateProductView.tsx` (`handleSubmit`).
  - Backend: `platform/apps/commerce-service/src/modules/books/dto/create-book.dto.ts` & `books.service.ts`.
* **Tại sao có lỗi này:**
  1. Khi người bán chọn định dạng Hybrid (vừa sách giấy bìa mềm, vừa Ebook DRM), giao diện hiển thị 2 ô nhập giá: Giá sách giấy và Giá Ebook.
  2. Tuy nhiên DTO backend `CreateBookDto` ban đầu chỉ có một trường `price` duy nhất. Frontend khi gửi payload đã gán `price = paperPrice` và đẩy `ebookPrice` vào một trường mở rộng hoặc metadata.
  3. Khi sách được lưu vào database, service chỉ lưu giá bìa mềm vào trường `price`, khiến sách Ebook ngoài giao diện khách hàng hiển thị giá bằng 0đ hoặc bằng giá sách giấy.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Thêm vào giỏ hàng (`CartContext`):** Khách chọn mua bản Ebook nhưng bị tính tiền theo giá sách giấy bìa mềm (hoặc ngược lại).
  - **Doanh thu & Quyết toán hoa hồng Seller:** Tính sai lệch tiền thực nhận của đơn hàng hybrid.
* **Cách khắc phục dứt khoát duy nhất:**
  - Chuẩn hóa cấu trúc dữ liệu Model `Book` và DTO `CreateBookDto`: Bổ sung rõ ràng 2 trường dữ liệu độc lập:
    - `paperPrice` (Giá sách vật lý bìa mềm).
    - `digitalPrice` (Giá bản quyền Ebook DRM).
  - Khi hiển thị ngoài Storefront & Giỏ hàng, hệ thống căn cứ chính xác định dạng khách chọn mua để lấy đúng giá tiền tương ứng.

---

### LỖI 10: User bấm "Gửi hồ sơ đăng ký doanh nghiệp" ở bước 5 luôn báo "Vui lòng đăng nhập..." dù vừa đăng nhập
* **Vị trí phát sinh:**
  - Frontend: `web/src/ui/components/seller/SellerRegisterView.tsx` (`handleSubmit` dòng 383-500).
  - API Client: `web/src/ui/api/businessApi.ts` (`registerBusiness`).
  - Backend: `platform/apps/api-gateway/src/modules/proxy/route-classification.ts` (dòng 163-169).
  - Backend: `platform/apps/business-service/src/modules/business/business.controller.ts` (`registerBusiness` dòng 46-60).
* **Tại sao có lỗi này:**
  1. Trong `SellerRegisterView.tsx`, quá trình nhập liệu 5 bước diễn ra lâu, hoặc khi upload ảnh giấy phép/CCCD qua form multipart làm mất thông tin session.
  2. Điểm mấu chốt: Endpoint `POST /api/v1/businesses` được Gateway phân loại là route `AUTHENTICATED`. Nhưng trong `business-service`, controller `BusinessController` áp dụng `@UseGuards(JwtAuthGuard)` của Passport JWT. Guard này yêu cầu tự giải mã JWT từ header `Authorization`.
  3. Ở môi trường local, nếu key `JWT_SECRET` giữa Gateway và Business Service có sự sai lệch định dạng (hoặc service đọc thiếu env), Passport từ chối token và trả về 401.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Quy trình Onboarding đối tác bị tắc nghẽn:** Người dùng không thể nâng cấp tài khoản từ Độc giả lên Nhà bán hàng.
  - **Upload chứng từ e-KYC:** Các request upload file giấy phép kinh doanh ở bước 4 cũng bị từ chối 401.
* **Cách khắc phục dứt khoát duy nhất:**
  - Tại `platform/apps/business-service/src/modules/auth/guards/jwt-auth.guard.ts`: Cho phép guard chấp thuận identity từ header `x-user-id` đã được Gateway bảo chứng và xác thực hợp lệ.
  - Đồng bộ chuẩn xác cơ chế đọc `JWT_SECRET` qua thư viện dùng chung `@huki/shared` (`getJwtSecret()`) cho toàn bộ microservices nội bộ.

---

### LỖI 11: Trang "NXB & Tác Giả" (`/stores`) chỉ hiển thị duy nhất 1 gian hàng "Nhà sách HuKi Official", thiếu Nhã Nam Books
* **Vị trí phát sinh:**
  - Frontend: `web/src/app/stores/page.tsx` (`fetchStores`).
  - Backend: `platform/apps/business-service/src/modules/stores/stores.service.ts` & `business.service.ts` (`getPublicStores`).
* **Tại sao có lỗi này:**
  1. API `GET /api/v1/stores` trong `business-service` đang filter theo điều kiện cứng: chỉ lấy store có `status = 'ACTIVE'` VÀ `isVerified = true`. Gian hàng "Nhã Nam Books" trong database seed đang mang trạng thái `status = 'APPROVED'` hoặc `isVerified = false` (chưa bật cờ xác thực), dẫn đến câu truy vấn loại bỏ gian hàng này.
  2. Frontend trang `/stores` trước đây dính logic mock fallback nếu API trả về danh sách có độ dài $\le 1$, tự động ép về danh sách mặc định chỉ có HuKi Official.
* **Lỗi liên đới & Hiệu ứng Domino:**
  - **Thanh tìm kiếm header:** Tìm kiếm tên shop "Nhã Nam" không gợi ý ra kết quả.
  - **Phân trang gian hàng:** Số lượng tổng trang bị sai lệch (luôn là 1 trang).
* **Cách khắc phục dứt khoát duy nhất:**
  - Tại `platform/apps/business-service/src/modules/stores/stores.service.ts`: Chuẩn hóa điều kiện hiển thị công khai: mọi Store thuộc Business đã được duyệt (`status IN ['ACTIVE', 'APPROVED']`) và chưa bị khóa (`isSuspended = false`) đều phải được xuất hiện trên danh bạ `/stores`.
  - Tại `web/src/app/stores/page.tsx`: Xóa bỏ hoàn toàn logic mock fallback cục bộ, hiển thị dữ liệu thực 100% từ API Gateway.

---

## 2. PHẦN BỔ SUNG LỖI MỚI TỪ NGƯỜI DÙNG

*(Sẵn sàng tiếp nhận danh sách lỗi tiếp theo từ người dùng để phân tích sâu nguyên nhân, bắt mạch liên đới và đưa ra phương án xử lý dứt khoát duy nhất...)*

