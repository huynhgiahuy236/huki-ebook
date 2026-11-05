# BÁO CÁO PHÂN TÍCH TOÀN DIỆN LỖI MÔI TRƯỜNG LOCAL (BUG-LOCAL)
> **Mục tiêu:** Phân tích nguyên nhân gốc rễ, ảnh hưởng dây chuyền và giải pháp dứt khoát duy nhất cho 12 vấn đề trong file docx trên Desktop.  
> **Nguyên tắc:** Tập trung 100% vào logic hệ thống và dữ liệu thật tại **Local (nhánh `feature/fix-bug-local`)**; không áp dụng phương án chắp vá, không loại bỏ tính năng, không dùng phương án A/B mơ hồ.

---

## TỔNG HỢP VÀ BẢN ĐỒ DÂY CHUYỀN LỖI (DOMINO EFFECT)

Qua phân tích sâu mã nguồn (`web`, `platform`) và toàn bộ 6 cơ sở dữ liệu PostgreSQL / MongoDB nội bộ, 12 vấn đề của người dùng xuất phát từ **3 cụm lỗi cốt lõi**:

1. **Cụm Dữ Liệu Seed Bị Dị Tật (105 sách mang ID `s2-...`, 73 sách thiếu tác giả, 77 sách thiếu NXB):**
   - Script seed nhân bản dữ liệu cho Store 2 (Nhã Nam) đã thêm tiền tố `s2-` vào ID sách. Chuỗi này không phải UUID chuẩn RFC 4122.
   - Khi ID không phải UUID:
     - Backend NestJS `findOne` (`books.controller.ts:120`) coi ID là `slug` -> Tìm không thấy -> Trả về 404.
     - Frontend `book/[id]/page.tsx` nhận 404 -> Auto fallback về `booksData[0]` ("Con Đường Phía Trước").
     - Frontend `checkout/page.tsx` và `CartContext.tsx` dùng regex UUID lọc bỏ -> Giỏ hàng rỗng, báo lỗi "Ấn phẩm thử nghiệm demo" hoặc "Validation failed".
     - Dữ liệu `author_id` và `publisher_id` bị null -> Frontend tự động fallback thành "Tác giả HUKI" và "HUKI Digital Publishing" trong khi bìa sách ghi tên tác giả thật.

2. **Cụm Lệch Môi Trường & Kết Nối Socket / Gateway (Port 3000 vs 3005):**
   - `web/.env` cấu hình `NEXT_PUBLIC_SOCKET_URL=http://localhost:3000`. API Gateway chạy cổng 3000 không có WebSocket server cho Chat. WebSocket nằm tại `community-service:3005`.
   - Kết nối Socket luôn thất bại -> Chat không gửi được tin nhắn thời gian thực -> Thoát ra là mất hết tin nhắn, không có thông báo.

3. **Cụm Logic UI/Filter/Storefront Cứng Nhắc:**
   - Bộ lọc định dạng gom sách `BOTH` thành `hybrid` độc quyền, dẫn đến số đếm Ebook = 0 và không lọc được Ebook.
   - API lấy sách theo gian hàng dùng điều kiện `ownerUserId` kéo nhầm 10 cuốn sách của gian hàng Alpha Books vào gian hàng HUKI Store.
   - Trang `/seller/finance` gửi sai Store ID và kích hoạt các hàm tạo kết nối PostgreSQL thủ công dồn dập, làm sập connection pool và văng lỗi 503 ("Dịch vụ máy chủ tạm thời phản hồi chậm").
   - Banner trang `/books` và slot Flash Sale trang chủ hardcode chữ và fallback chuỗi rác `#b00000` thay vì bóc tách metadata thật từ API.

---

## CHI TIẾT 12 VẤN ĐỀ VÀ GIẢI PHÁP DỨT KHOÁT

---

### Vấn đề 1: Flash Sale trang chủ hiển thị mock data ("Tác phẩm Flash Sale #b00000", ảnh chung, tác giả "Tác giả HUKI") lệch hoàn toàn với trang `/flash-sale`
- **Ảnh minh chứng:** `image1.png` (Mục "FLASH SALE ĐANG LIVE" hiển thị 6 thẻ sách `#b00000`, `#08b405`, `#764dee`, ảnh hero library, tác giả HUKI).
- **Vị trí mã nguồn:**
  - `web/src/app/page.tsx` (dòng 415 - 440)
  - `web/src/app/flash-sale/page.tsx` (dòng 204 - 230)
- **Nguyên nhân gốc rễ:**
  1. API `GET /flash-sales?scope=PLATFORM` từ `promotion-service` đã trả về đầy đủ metadata thật của từng item: `bookTitle`, `bookSlug`, `coverUrl`, `author`, `salePrice`, `originalPrice`, `discountPercent`.
  2. Trang `/flash-sale` sử dụng hàm `mapItemData` đọc trực tiếp `item.bookTitle`, `item.coverUrl`, `item.author` nên hiển thị sách thật đầy đủ ("Đắc Nhân Tâm", "Nhà Giả Kim", "Tư Duy Nhanh Và Chậm").
  3. Tuy nhiên, trên trang chủ `web/src/app/page.tsx`, hàm map chỉ tìm `book = realBooks.find((entry) => entry.id === item.bookId)`. Danh sách `realBooks` được lấy từ `catalogApi.getPublicBooks({ limit: 100 })` chỉ gồm 100 cuốn đầu tiên của sàn. Các sách flash sale không nằm trong top 100 này nên `book` là `undefined`.
  4. Khi `book` bị `undefined`, code rơi vào fallback cứng:
     ```ts
     title: book?.title || `Tác phẩm Flash Sale #${item.bookId.slice(0, 6)}`,
     author: book?.author?.name || "Tác giả HUKI",
     cover: book?.coverUrl || "/banners/hero-library.jpg",
     ```
     Dẫn đến việc toàn bộ card flash sale trên trang chủ bị biến thành dữ liệu rác `#b00000`.
- **Ảnh hưởng dây chuyền:** Mọi chiến dịch Flash Sale dù thiết lập chuẩn trên DB cũng sẽ bị vỡ giao diện trên trang chủ nếu sách không nằm trong 100 cuốn public đầu tiên.
- **Giải pháp dứt khoát duy nhất:**
  - Sửa `web/src/app/page.tsx`: Trong hàm `allFlashSale`, ưu tiên trích xuất metadata trực tiếp từ item flash sale nếu `book` không có trong danh sách 100 cuốn:
    ```ts
    title: book?.title || item.bookTitle || (item as any).book?.title,
    author: book?.author?.name || (item as any).author || (item as any).authorName || 'Tác giả',
    cover: book?.coverUrl || item.coverUrl || (item as any).cover || (item as any).coverImage,
    slug: book?.slug || item.bookSlug || item.bookId,
    ```
  - Tuyệt đối loại bỏ hoàn toàn các chuỗi fallback giả lập `Tác phẩm Flash Sale #${...}` và ảnh `/banners/hero-library.jpg`.

---

### Vấn đề 2: Đặt hàng dính lỗi validation ("Đặt hàng không thành công. Validation failed"), đơn được đơn không, cuốn demo chưa loại bỏ
- **Ảnh minh chứng:** `image2.png` (Đặt hàng cuốn "Nhà Giả Kim (The Alchemist) x1 - BOTH Flash Sale" báo lỗi đỏ: "Đặt hàng không thành công - Validation failed").
- **Vị trí mã nguồn:**
  - `web/src/app/checkout/page.tsx` (dòng 1118 - 1143)
  - `platform/apps/commerce-service/src/modules/orders/checkout.service.ts`
  - `platform/apps/commerce-service/src/modules/orders/dto/create-order.dto.ts`
  - Database `huki_commerce`, bảng `books`
- **Nguyên nhân gốc rễ:**
  1. Trong cơ sở dữ liệu `huki_commerce`, có 105/248 cuốn sách mang ID có tiền tố `s2-` (ví dụ `s2-b0000003...` - chính là cuốn Nhà Giả Kim của gian hàng Nhã Nam).
  2. Tại `checkout/page.tsx`, code áp dụng regex kiểm tra UUID chuẩn:
     ```ts
     const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(directItem.bookId);
     ```
     Chuỗi `s2-...` bị coi là không hợp lệ -> Client chặn hoặc ném toast cảnh báo demo.
  3. Khi gửi payload xuống Commerce Service, DTO `previewCheckout` và `createOrder` có trường `@IsUUID()` trên `bookId`. NestJS `ValidationPipe` phát hiện `s2-...` không phải UUID chuẩn nên ném ra `BadRequestException` ("Validation failed").
  4. Cuốn nào có ID UUID chuẩn (thuộc Store 1) thì đặt hàng thành công; cuốn nào có ID `s2-...` (thuộc Store 2) thì luôn thất bại -> Tạo ra hiện tượng "đơn được đơn không".
- **Ảnh hưởng dây chuyền:** Làm tê liệt toàn bộ quy trình mua sắm đối với 105 đầu sách của gian hàng Nhã Nam và các đơn hàng liên quan đến Store 2.
- **Giải pháp dứt khoát duy nhất:**
  - **Database Migration:** Chạy script chuẩn hóa toàn bộ 105 ID dạng `s2-...` trong bảng `books` thành UUID chuẩn RFC 4122 (bằng cách cắt bỏ tiền tố `s2-` hoặc sinh UUID v4 mới và cập nhật cascade toàn bộ các bảng con: `physical_book_details`, `digital_book_details`, `order_items`, `cart_items`, `flash_sale_items`).
  - **Frontend `checkout/page.tsx`:** Loại bỏ rào cản regex UUID cứng trên client, đảm bảo mọi sách có trong DB đều được gửi đi thanh toán bình thường.

---

### Vấn đề 3: Có một số cuốn bấm xem chi tiết tự động nhảy sang cuốn "Con Đường Phía Trước (The Road Ahead)"
- **Ảnh minh chứng:** `image3.png` (Trang chi tiết sách hiển thị "Con Đường Phía Trước", Bill Gates, HUKI Digital Publishing, giá 0đ).
- **Vị trí mã nguồn:**
  - `web/src/app/book/[id]/page.tsx` (dòng 217 - 262 và dòng 660 - 671)
  - `web/src/ui/data/mockData.ts` (dòng 3 - 43)
  - `platform/apps/commerce-service/src/modules/books/books.controller.ts` (dòng 113 - 125)
- **Nguyên nhân gốc rễ:**
  1. Trong `books.controller.ts`:
     ```ts
     const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
     if (isUuid) {
       return { data: await this.booksService.findOne(id, actor) };
     }
     return { data: await this.booksService.findBySlug(id, actor) };
     ```
     Khi người dùng click vào cuốn sách có ID `s2-...`, biến `isUuid` trả về `false` -> Backend tưởng đây là `slug` và gọi `findBySlug('s2-...')`. Nhưng trong DB, slug của sách là `nn-hoang-tu-be`, còn `s2-...` là ID -> Backend không tìm thấy, trả về 404 `BOOK_NOT_FOUND`.
  2. Tại `web/src/app/book/[id]/page.tsx`: Khi API trả về 404, `realBook` nhận giá trị `null`.
  3. Dòng 660-661 trong `book/[id]/page.tsx` viết fallback:
     ```ts
     const found = booksData.find((b: any) => b.id === id);
     const baseBook = (found || booksData[0]) as any;
     ```
     `booksData[0]` trong file `web/src/ui/data/mockData.ts` chính là cuốn **"Con Đường Phía Trước (The Road Ahead)" của Bill Gates, NXB HUKI Digital Publishing, giá 0đ**!
- **Ảnh hưởng dây chuyền:** Bất kỳ đầu sách nào có ID không khớp UUID hoặc bị lỗi mạng/404 đều biến thành cuốn "Con Đường Phía Trước", gây hiểu lầm nghiêm trọng cho người dùng.
- **Giải pháp dứt khoát duy nhất:**
  - Sửa `books.controller.ts` và `books.service.ts`: Trong `findOne`, truy vấn tìm theo `id` trước; nếu không có bản ghi mới truy vấn theo `slug`. Không dùng regex UUID để suy đoán logic.
  - Sửa `web/src/app/book/[id]/page.tsx`: Xóa bỏ hoàn toàn việc import `booksData` và lệnh fallback `booksData[0]`. Nếu sách không tồn tại trong DB, hiển thị giao diện báo lỗi 404 rõ ràng, không bao giờ lấy dữ liệu mock đè lên.

---

### Vấn đề 4: Xóa bỏ dữ liệu mock/demo, không lấy PDF demo "Con Đường Phía Trước", không có PDF thật thì xóa luôn khỏi DB
- **Ảnh minh chứng:** `image4.png` (Checkout hiển thị thông báo: "Ấn phẩm thử nghiệm: Cuốn sách này là dữ liệu mẫu demo...").
- **Vị trí mã nguồn:**
  - `web/src/app/checkout/page.tsx` (dòng 1120 - 1126)
  - `platform/apps/commerce-service/src/modules/books/books.service.ts` (dòng 890 - 941)
  - Cơ sở dữ liệu `huki_commerce`, bảng `books` và `digital_book_details`
- **Nguyên nhân gốc rễ:**
  1. Frontend `checkout/page.tsx` gán nhãn sách là "Ấn phẩm thử nghiệm demo" khi ID không vượt qua regex UUID.
  2. Trong Commerce Service hàm `streamPdf`, hệ thống có cơ chế fallback trỏ ngầm sang các file tĩnh local:
     - `platform/apps/commerce-service/assets/default-ebook.pdf`
     - `web/public/ebooks/Con_duong_phia_truoc__Bill_Gates.pdf`
     Khiến người dùng đọc thử bất kỳ cuốn sách nào cũng bị tải ra file PDF của Bill Gates.
  3. Một số đầu sách seed ban đầu có định dạng `DIGITAL` hoặc `BOTH` nhưng không có tệp PDF thực tế gắn kèm trong `digital_book_details`.
- **Ảnh hưởng dây chuyền:** Vi phạm bản quyền, hiển thị sai nội dung sách, gây bức xúc khi trải nghiệm đọc sách số (DRM Reader).
- **Giải pháp dứt khoát duy nhất:**
  - **Loại bỏ cơ chế fallback ngầm:** Trong `books.service.ts`, xóa bỏ danh sách candidates trỏ về `Con_duong_phia_truoc__Bill_Gates.pdf`. Nếu sách số không có `pdfKey` thực sự, trả về mã lỗi nghiệp vụ `NO_PDF_AVAILABLE` ("Tác phẩm này hiện chưa có bản đọc số điện tử").
  - **Làm sạch Database:** Quét toàn bộ bảng `books` trong `huki_commerce`. Cuốn nào chỉ có định dạng `DIGITAL` mà không có PDF thật trong hệ thống lưu trữ thì chuyển sang trạng thái `ARCHIVED` hoặc xóa triệt để; cuốn nào là `BOTH` thì chuyển về `PHYSICAL` (chỉ bán sách giấy). Không để tồn tại sách số "ảo".

---

### Vấn đề 5: Yêu thích sách bấm 1 cuốn rồi bấm thêm cuốn khác thì số lượng yêu thích tụt về 0
- **Vị trí mã nguồn:**
  - `web/src/app/library/page.tsx` (dòng 63 - 119 và dòng 190 - 206)
  - `web/src/ui/components/common/BookCard.tsx` (dòng 154 - 195)
- **Nguyên nhân gốc rễ:**
  1. Trong `library/page.tsx`, danh sách sách yêu thích ngoài sàn (`externalWishlistBooks`) được nạp qua `catalogApi.getPublicBooks({ limit: 100 })`.
  2. Tại dòng 105-114 của `library/page.tsx`:
     ```ts
     const validIds = [
       ...books.filter((b) => wishlistIds.includes(b.bookId || b.id)).map((b) => b.bookId || b.id),
       ...matched.map((m) => m.id),
     ];
     if (validIds.length > 0 && validIds.length !== wishlistIds.length) {
       setWishlistIds(validIds);
       localStorage.setItem('huki_wishlist_ids', JSON.stringify(validIds));
     }
     ```
  3. Khi người dùng thích cuốn sách 1, rồi thích tiếp cuốn sách 2 (mà cuốn sách 2 có ID `s2-...` hoặc nằm ngoài 100 cuốn đầu tiên của `getPublicBooks`), mảng `matched` không tìm thấy cuốn sách đó.
  4. Lệnh lọc `validIds` coi cuốn sách đó là "ID rác" và tự động lọc bỏ, kích hoạt state cập nhật lại `wishlistIds`.
  5. Sự xung đột giữa việc update `localStorage` trong `BookCard.tsx` và việc lọc đè của `library/page.tsx` dẫn đến `allFavoriteBooks` bị rỗng và `counts.favorite` tụt về 0.
- **Ảnh hưởng dây chuyền:** Làm sai lệch Tủ sách cá nhân, mất sách yêu thích của người dùng khi duyệt sàn, badge số lượng trên header bị nhảy sai.
- **Giải pháp dứt khoát duy nhất:**
  - Bỏ cơ chế tự ý lọc đè `validIds` dựa trên API giới hạn 100 cuốn trong `web/src/app/library/page.tsx`.
  - Quản lý `wishlist` qua danh sách ID nhất quán, lưu đồng thời vào `localStorage` và `userApi.updateProfile({ wishlist })`.
  - Khi cần tải dữ liệu chi tiết của các sách trong `wishlistIds`, gọi API lấy sách theo danh sách ID cụ thể (`/books?ids=...`) thay vì duyệt mảng 100 cuốn public.

---

### Vấn đề 6: Toàn bộ Nhà Xuất Bản hiển thị thành "HUKI Digital Publishing", không đúng nhà xuất bản thực tế
- **Vị trí mã nguồn:**
  - Database `huki_commerce`, bảng `books` và `publishers`
  - `web/src/app/book/[id]/page.tsx` (dòng 675 - 700)
  - `web/src/ui/components/common/BookCard.tsx`
- **Nguyên nhân gốc rễ:**
  1. Trong cơ sở dữ liệu `huki_commerce`, hiện có **77 cuốn sách bị để `publisher_id = NULL`** do dữ liệu seed không liên kết khóa ngoại.
  2. Khi `publisher_id` là `NULL`, backend trả về `publisher: null`.
  3. Trên frontend, các component hiển thị sách fallback:
     ```ts
     publisher: book?.publisher?.name || 'HUKI Digital Publishing' // hoặc 'Gian Hàng HUKI'
     ```
     Khiến người dùng thấy toàn bộ sách đều mang danh "HUKI Digital Publishing", bất kể sách của Kim Đồng, Trẻ hay Nhã Nam.
- **Ảnh hưởng dây chuyền:** Sai lệch thông tin sở hữu trí tuệ, bộ lọc theo Nhà Xuất Bản trên trang danh mục không thể lọc trúng các cuốn sách này.
- **Giải pháp dứt khoát duy nhất:**
  - **Database Migration:** Viết script SQL cập nhật dứt điểm `publisher_id` cho 77 cuốn sách này, liên kết chính xác về các NXB thực tế đã có trong bảng `publishers` (Nhã Nam: `p0000003...`, Kim Đồng: `p0000002...`, NXB Trẻ: `0df2754d...`, Trí Tuệ Việt: `p0000001...`, Alpha Books: `6d9c682e...`).
  - **Backend Logic:** Trong `commerce-service` `books.service.ts`, nếu sách chưa có `publisherId`, tự động suy diễn từ `storeId`/`businessId` của sách thay vì để trả về null.

---

### Vấn đề 7: Chat thoát ra là mất không còn lưu cuộc trò chuyện, tin nhắn cũ mất hết toàn bộ, có tin nhắn không có thông báo
- **Vị trí mã nguồn:**
  - `web/.env`
  - `web/src/ui/hooks/useChatSocket.ts` (dòng 54 - 60 và 168 - 197)
  - `web/src/app/account/messages/page.tsx` (dòng 540 - 640)
  - `platform/apps/community-service/src/modules/chat/chat.gateway.ts`
- **Nguyên nhân gốc rễ:**
  1. Trong file `web/.env`: Biến `NEXT_PUBLIC_SOCKET_URL` được đặt là `http://localhost:3000` (cổng của API Gateway). Tuy nhiên API Gateway không hỗ trợ proxy WebSocket cho namespace `/chat`. Máy chủ Socket.io thực tế chạy ở `community-service` trên cổng **3005**.
  2. Do đó, Socket ở client (`useChatSocket.ts`) không bao giờ kết nối được (`socketRef.current.connected` luôn bằng `false`).
  3. Khi người dùng bấm gửi tin nhắn trong `web/src/app/account/messages/page.tsx`:
     ```ts
     const serverMsg = await sendSocketMessage(realConversationId, content);
     ```
     Hàm này ném lỗi `Error('Socket chưa được kết nối')`. Khối catch nuốt lỗi mà không có fallback sang gọi REST API `chatService.sendMessage(...)`.
  4. Tin nhắn chỉ tồn tại tạm thời trong bộ nhớ React State (`messagesMap`). Tin nhắn chưa từng được lưu vào MongoDB `community_db`. Khi người dùng thoát ra hoặc F5, toàn bộ tin nhắn biến mất hoàn toàn.
  5. Vì Socket không kết nối, các sự kiện `message:new` không hoạt động -> Không có âm thanh, không có thông báo (notification).
- **Ảnh hưởng dây chuyền:** Làm tê liệt hoàn toàn hệ thống nhắn tin CSKH, hỏi thông tin sách, trao đổi đơn hàng giữa Người mua và Người bán.
- **Giải pháp dứt khoát duy nhất:**
  - **Cấu hình môi trường:** Đặt `NEXT_PUBLIC_SOCKET_URL=http://localhost:3005` trong `web/.env` để client kết nối trực tiếp vào Socket Gateway của `community-service` ở local.
  - **Cơ chế Fallback REST API:** Sửa `web/src/app/account/messages/page.tsx`: Khi gửi tin nhắn, nếu Socket chưa kết nối hoặc gửi socket thất bại, tự động gọi REST API `chatService.sendMessage(conversationId, { content })` để đảm bảo 100% tin nhắn được ghi bền vững vào cơ sở dữ liệu MongoDB.

---

### Vấn đề 8: Trang gian hàng shop/1079fc76... dù đã ẩn nhưng vẫn hiện đủ 100 cuốn trong khi Seller thấy đang bán chỉ có 98
- **Vị trí mã nguồn:**
  - `platform/apps/commerce-service/src/modules/books/books.service.ts` (dòng 230 - 250)
  - Cơ sở dữ liệu `huki_commerce`, bảng `books`
- **Nguyên nhân gốc rễ:**
  1. Trong database `huki_commerce`, Store HUKI Official (`3094e54e-2549-42cc-92fb-14a8f8589277`) thực tế có 95 cuốn `PUBLISHED` và 3 cuốn `HIDDEN` (tổng cộng 98 cuốn). Seller Portal hiển thị 98 cuốn là hoàn toàn chính xác.
  2. Tuy nhiên, trong Commerce Service hàm `findAll`:
     ```ts
     if (bizVal === '1079fc76-a467-48a9-8034-b072aaa5afea') {
       storeOrConditions.push(
         { storeId: '3094e54e-2549-42cc-92fb-14a8f8589277' },
         { ownerUserId: '8d501a4d-d846-45bd-8f15-fda4e30cf826' } // <--- NGUYÊN NHÂN LỖI
       );
     }
     ```
  3. Tài khoản `8d501a4d-d846-45bd-8f15-fda4e30cf826` lại là chủ sở hữu của 10 cuốn sách thuộc Store Alpha Books (`51c48059-37be-46a2-b4a6-04a8365f8cbd`).
  4. Điều kiện `ownerUserId` đã gom cả 10 cuốn sách của Alpha Books vào kết quả tìm kiếm của HUKI Store: 95 cuốn HUKI + 10 cuốn Alpha Books = 105 cuốn -> Bị giới hạn `limit=100` cắt bớt nên trang web luôn luôn hiển thị đúng 100 cuốn. Dù seller có ẩn thêm sách, tổng số vẫn trên 100 nên số lượng hiển thị không hề suy giảm.
- **Ảnh hưởng dây chuyền:** Chức năng ẩn sản phẩm của người bán hoàn toàn vô tác dụng; sản phẩm của gian hàng này bị hiển thị lẫn vào gian hàng khác.
- **Giải pháp dứt khoát duy nhất:**
  - Trong `commerce-service` `books.service.ts`: Khi khách hàng xem gian hàng công khai theo `business` hoặc `store`, chỉ lọc theo đúng `storeId` của gian hàng đó (`where.storeId = '3094e54e-2549-42cc-92fb-14a8f8589277'`). Tuyệt đối không thêm điều kiện OR `ownerUserId` vào truy vấn Storefront công khai.

---

### Vấn đề 9: Trang tài chính Seller (`/seller/finance`) liên tục bị lỗi "Dịch vụ máy chủ tạm thời phản hồi chậm" và mất số dư tiền
- **Ảnh minh chứng:** `image5.png` (Trang Tài chính hiển thị khung đỏ: "Dịch vụ máy chủ tạm thời phản hồi chậm. Vui lòng thử lại sau giây lát." và nút "Rút 0đ Về STK").
- **Vị trí mã nguồn:**
  - `web/src/app/seller/finance/page.tsx` (dòng 62 và dòng 165 - 190)
  - `platform/apps/commerce-service/src/modules/wallet/wallet.service.ts` (dòng 107 - 157)
  - `platform/apps/commerce-service/src/common/seller-scope.util.ts` (dòng 28 - 79 và 82 - 118)
- **Nguyên nhân gốc rễ:**
  1. Trong `web/src/app/seller/finance/page.tsx:62`:
     `const storeId = user?.business?.id || ...`
     Biến này truyền Business ID (`1079fc76...`) thay vì Store ID (`3094e54e...`).
  2. Khi trang load, frontend gọi đồng thời 5 API: `getStoreWallet`, `getSellerEscrowItems`, `getStoreWalletTransactions`, `getPayoutRequests`, `getStatus`.
  3. Trong `seller-scope.util.ts`: Các hàm `resolveStoreAndBusinessIds` và `getSellerScope` mỗi lần thực thi lại tạo một đối tượng `new Client({ connectionString: bizDbUrl })` kết nối trực tiếp vào PostgreSQL `huki_business` rồi đóng lại. 5 request đồng thời tạo ra hàng chục kết nối mở đóng liên tục, gây nghẽn kết nối và quá tải.
  4. Hậu quả là request bị timeout, API Gateway trả về mã lỗi 503 `SERVICE_UNAVAILABLE`.
  5. `apiClient.ts` bắt mã lỗi `SYSTEM_UNAVAILABLE` và dịch thành thông báo: *"Dịch vụ máy chủ tạm thời phản hồi chậm. Vui lòng thử lại sau giây lát."*, đồng thời state số dư không nạp được và hiển thị 0đ.
- **Ảnh hưởng dây chuyền:** Người bán không thể theo dõi dòng tiền, không thể xem tiền ký quỹ đang giữ và không thể thực hiện lệnh rút tiền về tài khoản ngân hàng.
- **Giải pháp dứt khoát duy nhất:**
  - **Frontend `seller/finance/page.tsx`:** Lấy Store ID chính xác: `user?.business?.stores?.[0]?.id || user?.business?.id`.
  - **Backend `commerce-service`:** Tối ưu hóa `seller-scope.util.ts`: Sử dụng connection pool dùng chung hoặc Prisma client thay vì `new Client()` riêng lẻ cho mỗi hàm gọi, chấm dứt tình trạng nghẽn connection pool PostgreSQL.

---

### Vấn đề 10: Tác giả và Nhà xuất bản "treo đầu dê bán thịt chó" (bộ lọc bên trái hiển thị đúng nhưng thẻ sách hiển thị "Tác giả HUKI")
- **Ảnh minh chứng:** `image7.png` (Bộ lọc bên trái hiển thị tác giả Tô Hoài, Napoleon Hill, NXB Kim Đồng, Nhã Nam... nhưng toàn bộ thẻ sách bên phải đều ghi "Tác giả HUKI").
- **Vị trí mã nguồn:**
  - Cơ sở dữ liệu `huki_commerce`, bảng `books`, `authors`, `publishers`
  - `web/src/app/books/page.tsx` (dòng 160 - 162)
  - `web/src/ui/components/common/BookCard.tsx`
- **Nguyên nhân gốc rễ:**
  1. Trong cơ sở dữ liệu `huki_commerce`, hiện có **73 cuốn sách bị `author_id = NULL`** và **77 cuốn bị `publisher_id = NULL`**.
  2. Bìa sách vẽ hình rõ ràng tác giả (ví dụ: Dale Carnegie, Napoleon Hill, Paulo Coelho, Antoine de Saint-Exupéry, Brian Tracy...), nhưng trường trong DB lại để trống.
  3. Trên giao diện, code kiểm tra nếu không có author thì fallback thành `"Tác giả HUKI"`.
  4. Trong khi đó, sidebar bên trái lọc ra các tác giả thực tế từ bảng `authors`. Người dùng nhìn thấy tên tác giả ở bộ lọc nhưng click vào thì sách biến mất hoặc trên thẻ sách lại ghi tên người khác.
- **Ảnh hưởng dây chuyền:** Phá hỏng trải nghiệm người dùng, vi phạm nghiêm trọng tính minh bạch của tác phẩm trên sàn sách.
- **Giải pháp dứt khoát duy nhất:**
  - **Database Data Alignment:** Chạy script chuẩn hóa, tự động map tiêu đề sách sang bảng `authors` và `publishers` để điền đầy đủ `author_id` và `publisher_id` thật cho toàn bộ 73 cuốn sách đang bị null.

---

### Vấn đề 11: Thêm vào giỏ hàng bấm vô thì trống trơn, lúc lại có, bấm thanh toán báo lỗi "Không thể khởi tạo đơn hàng: Giỏ hàng trống"
- **Ảnh minh chứng:** `image6.png` (Trang thanh toán có 2 sản phẩm: "Nghĩ Lớn Để Thành Công" và "Nghệ Thuật Bán Hàng Bậc Cao", tổng 242.000đ nhưng bấm Đặt Hàng lại ném toast: "Không thể khởi tạo đơn hàng: Giỏ hàng trống").
- **Vị trí mã nguồn:**
  - `web/src/ui/context/CartContext.tsx` (dòng 479 và 503 - 515)
  - `web/src/app/checkout/page.tsx` (dòng 1138 - 1155)
  - `platform/apps/commerce-service/src/modules/orders/checkout.service.ts`
- **Nguyên nhân gốc rễ:**
  1. Khi thêm 105 cuốn sách có ID `s2-...` vào giỏ: `isUUID` bị `false`, nên frontend bỏ qua việc gọi API lưu vào server `cartApi.addToCart(...)`, chỉ lưu ở Local Storage với ID dạng `${book.id}-${format}-${Date.now()}`.
  2. Khi chuyển trang hoặc F5, `fetchServerCart()` chạy và đồng bộ từ server về. Do server không có sản phẩm này, state giỏ hàng bị đè làm sản phẩm biến mất ("bấm vô thì trống trơn"), sau đó gặp lỗi lại lấy từ local storage ("lúc lại có").
  3. Khi vào trang Checkout (`web/src/app/checkout/page.tsx:1140`):
     ```ts
     previewPayload.cartItemIds = checkedItems
       .map((it: any) => it.id)
       .filter((id: any) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
     ```
     ID tạm của item không phải UUID nên bị regex lọc sạch, biến `cartItemIds` thành mảng rỗng `[]`.
  4. Backend `checkout.service.ts` nhận mảng rỗng và trả về lỗi: `Giỏ hàng trống`. Frontend ném toast: "Không thể khởi tạo đơn hàng: Giỏ hàng trống" dù giao diện đang hiển thị 2 sản phẩm và tổng tiền 242.000đ.
- **Ảnh hưởng dây chuyền:** Người dùng không thể mua bất kỳ sản phẩm nào thuộc cụm 105 sách của Store 2 qua giỏ hàng.
- **Giải pháp dứt khoát duy nhất:**
  - Chuẩn hóa 100% ID sách trong DB thành UUID chuẩn để `cartApi.addToCart` lưu bền vững trên backend.
  - Sửa `CartContext.tsx` và `checkout/page.tsx`: Không lọc bỏ ID cart item nếu giỏ hàng đang dùng ID client, đồng thời hỗ trợ gửi danh sách item trực tiếp (`items: [{ bookId, quantity, format }]`) trong payload preview checkout khi item chưa đồng bộ kịp lên server.

---

### Vấn đề 12: Bộ lọc định dạng sách không có Ebook (Ebook = 0), Banner Flash Sale 50% set cứng dữ liệu tào lao
- **Ảnh minh chứng:** `image7.png` (Bộ lọc định dạng ghi: Tất cả định dạng (100), Sách giấy (6), Combo (94), còn Ebook Bản Quyền DRM bị để trống/0. Banner trên cùng ghi: "ĐẠI TIỆC TRI THỨC - ĐỒNG GIÁ TỪ 9.000Đ & VOUCHER BẢN QUYỀN GIẢM 50%").
- **Vị trí mã nguồn:**
  - `web/src/app/books/page.tsx` (dòng 149 - 152, dòng 206 - 210, dòng 281 - 288 và dòng 368 - 371)
- **Nguyên nhân gốc rễ:**
  1. Trong `web/src/app/books/page.tsx:149-152`:
     ```ts
     const hasEb = Boolean(rawRb.hasEbook || rawRb.priceEbook || rb.digitalDetails?.digitalEnabled || rb.format === 'DIGITAL' || rb.format === 'BOTH');
     const hasPa = Boolean(rawRb.hasPaper || rawRb.pricePaper || rb.physicalDetails?.physicalEnabled || rb.format === 'PHYSICAL' || rb.format === 'BOTH');
     const fmtType: 'ebook' | 'physical' | 'hybrid' = hasEb && hasPa ? 'hybrid' : hasEb ? 'ebook' : 'physical';
     ```
     Đa số sách trong DB có `format = 'BOTH'` (vừa có bản in vừa có bản ebook). Code xếp toàn bộ các sách này thành loại `hybrid` độc quyền. Hậu quả là `counts.formats.ebook` bị tính thành `0`.
  2. Khi người dùng click lọc "Ebook Bản Quyền DRM", điều kiện `selectedFormat === 'ebook' && book.formatType !== 'ebook'` loại bỏ toàn bộ sách, làm trang sách trắng tinh.
  3. Banner `ĐẠI TIỆC TRI THỨC - ĐỒNG GIÁ TỪ 9.000Đ & VOUCHER BẢN QUYỀN GIẢM 50%` là chuỗi text fix cứng trong JSX, không có chiến dịch hay voucher 50% nào thực tế tương ứng trong DB.
- **Ảnh hưởng dây chuyền:** Người dùng không thể tìm kiếm, lọc và mua sách điện tử Ebook DRM trên sàn; thông tin khuyến mãi trên banner là khuyến mãi "ảo".
- **Giải pháp dứt khoát duy nhất:**
  - **Sửa logic bộ lọc trong `web/src/app/books/page.tsx`:** Sách có `format = 'BOTH'` phải được tính vào cả danh mục Ebook lẫn danh mục Sách Giấy:
    ```ts
    // Đếm số lượng:
    ebook: allBooks.filter((b) => b.hasEbook || b.format === 'DIGITAL' || b.format === 'BOTH').length,
    physical: allBooks.filter((b) => b.hasPaper || b.format === 'PHYSICAL' || b.format === 'BOTH').length,
    hybrid: allBooks.filter((b) => b.format === 'BOTH').length,

    // Lọc sách:
    if (selectedFormat === 'ebook' && !(book.hasEbook || book.format === 'DIGITAL' || book.format === 'BOTH')) return false;
    if (selectedFormat === 'physical' && !(book.hasPaper || book.format === 'PHYSICAL' || book.format === 'BOTH')) return false;
    if (selectedFormat === 'hybrid' && book.format !== 'BOTH') return false;
    ```
  - **Banner động:** Tích hợp với `flashSaleApi` hoặc `bannerApi` từ Promotion Service để hiển thị đúng tên chiến dịch và tỷ lệ giảm giá thực tế của sàn. Nếu không có chiến dịch đặc biệt, hiển thị slogan chuẩn của HUKI Platform: *"Hệ Sinh Thái Sách Số Bản Quyền & Sách In HUKI"*.

---

## KẾ HOẠCH TRIỂN KHAI THEO THỨ TỰ LOGIC CHẶT CHẼ

Khi nhận lệnh code từ người dùng, các bước thực hiện sẽ tuân theo trình tự gốc rễ trước - ngọn sau:

1. **Bước 1 - Chuẩn hóa Cơ Sở Dữ Liệu (Gốc rễ của Lỗi 2, 3, 4, 6, 10, 11):**
   - Chạy script cập nhật 105 sách có ID `s2-...` về UUID chuẩn RFC 4122 (cập nhật đồng bộ các bảng con).
   - Điền đầy đủ `author_id` cho 73 sách và `publisher_id` cho 77 sách theo đúng thông tin tác phẩm.
   - Làm sạch sách số ảo: Cập nhật đúng đường dẫn PDF thật hoặc chuyển sang `PHYSICAL` nếu không có file PDF.

2. **Bước 2 - Sửa Backend Services (Gốc rễ của Lỗi 1, 3, 8, 9):**
   - `commerce-service`:
     - Sửa `findOne` trong `books.controller.ts` & `books.service.ts`: Tìm theo ID trước, sau đó tìm theo slug.
     - Sửa `findAll` trong `books.service.ts`: Chỉ lọc theo đúng `storeId`, bỏ điều kiện `ownerUserId` làm lẫn sách giữa các shop.
     - Sửa `seller-scope.util.ts`: Bỏ việc tạo `new Client()` thủ công dồn dập, giải quyết triệt để lỗi 503 ví tài chính seller.
     - Xóa bỏ việc fallback ngầm sang file PDF `Con Đường Phía Trước`.
   - `community-service` & `api-gateway`:
     - Đảm bảo Socket.io namespace `/chat` sẵn sàng nhận kết nối và lưu trữ tin nhắn bền vững vào MongoDB.

3. **Bước 3 - Sửa Frontend Web (Gốc rễ của Lỗi 1, 3, 5, 7, 9, 11, 12):**
   - `web/.env`: Trỏ `NEXT_PUBLIC_SOCKET_URL=http://localhost:3005`.
   - `web/src/app/page.tsx`: Map item Flash Sale từ metadata có sẵn của `promotion-service`, bỏ fallback `#b00000`.
   - `web/src/app/book/[id]/page.tsx`: Xóa bỏ import `booksData[0]` từ `mockData.ts`.
   - `web/src/app/books/page.tsx`: Sửa logic đếm và lọc Ebook (sách `BOTH` được tính cho cả Ebook và Sách giấy); gắn banner động.
   - `web/src/app/account/messages/page.tsx`: Thêm fallback REST API khi gửi tin nhắn phòng trường hợp socket gián đoạn.
   - `web/src/app/seller/finance/page.tsx`: Lấy chuẩn Store ID của gian hàng.
   - `web/src/app/checkout/page.tsx` & `CartContext.tsx`: Đồng bộ giỏ hàng và thanh toán trơn tru.
