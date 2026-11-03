# BÁO CÁO TOÀN DIỆN LỖI KIỂM THỬ MOD-06: CỘNG ĐỒNG ĐỘC GIẢ, TIN NHẮN TRỰC TIẾP & TRỢ LÝ BÉ CÁO AI (COMMUNITY & AI)

> **Mã Module:** `MOD-06`  
> **Tên Phân Hệ:** Cộng Đồng Độc Giả, Tin Nhắn Trực Tiếp Người Mua - Người Bán & Trợ Lý Đọc Sách Bé Cáo AI (Community, Realtime Direct Messages, Book Reviews & AI Assistant)  
> **Quy Chuẩn Đối Soát:** `skill/.gemini/skills/ui-ux-pro-max` (Anti-AI Design & Editorial Polish) & `tasks/module-06-ai-community-chat.md` (Editorial Community Specification)  
> **Công Cụ & Phương Pháp Kiểm Thử:** Robot Playwright tự động hóa đa viewport (Mobile 390x844, Tablet 768x1024, Desktop 1440x900) kết hợp DOM Evaluation, Network Interceptor, Console Error Catcher & Kiểm tra mã nguồn chi tiết.  
> **Phiên Xác Thực Thực Nghiệm:**  
> - Tài khoản Độc Giả: `user@huki.com` (UUID: `e549dff1-8b84-47c2-be7b-2600ee12ce9e`, Role: `USER`)  
> - Tài khoản Nhà Xuất Bản: `seller@gmail.com` (Doanh nghiệp FAHASA: `d2caa7b1-1b82-49b9-be65-1fc6be42e472`, Role: `BUSINESS`)  
> - Tài khoản Quản Trị Sàn: `adminhuki@gmail.com` (Super Admin, Role: `PLATFORM_ADMIN`)  
> **Nguyên Tắc Bất Di Bất Dịch:** **Tuyệt đối KHÔNG tự ý sửa bất kỳ dòng code ứng dụng nào** (`web/src/*`, `platform/*`). Báo cáo này ghi nhận toàn diện 14 lỗi xác thực thực tế (10 lỗi UI/UX + 4 lỗi Chức Năng Nghiệp Vụ) để trình người dùng phê duyệt trước khi xử lý.

---

## 📊 BẢNG TỔNG HỢP DANH MỤC LỖI MOD-06

| Mã Bug | Mức Độ | Màn Hình / Vị Trí Vi Phạm | Hiện Tượng Chính | Trạng Thái |
| :--- | :---: | :--- | :--- | :---: |
| **BUG-MOD06-01** | **P0** | `/profile/reviews` (Mobile 390px) | Vỡ layout nghiêm trọng +703px do container đánh giá không bọc giới hạn cuộn | **OPEN** |
| **BUG-MOD06-02** | **P0** | `/book/[slug]` (Trang Chi Tiết Sách) | Nút "Nhắn tin" với Shop bị vô hiệu hóa ("Sắp ra mắt") dù đã có `FloatingChatWidget` | **OPEN** |
| **BUG-MOD06-03** | **P0** | `/book/[slug]` (API Đánh Giá) | Lỗi gọi API Review trả về HTTP 400 Bad Request do truyền Slug sách thay vì UUID | **OPEN** |
| **BUG-MOD06-04** | **P1** | `/seller/reviews` (Mobile 390px) | Thanh Filter Pills đánh giá của NXB tràn lề màn hình Mobile +216px | **OPEN** |
| **BUG-MOD06-05** | **P1** | `/seller/reviews` & `/account/messages` | Hardcode ký tự sao Unicode thô (`★`) vi phạm tiêu chuẩn thiết kế Anti-AI | **OPEN** |
| **BUG-MOD06-06** | **P1** | `/orders/[id]/review` (Viết Nhận Xét) | Lưu chuỗi ảnh Base64 DataURL khổng lồ vào database khi API upload dispute lỗi | **OPEN** |
| **BUG-MOD06-07** | **P1** | `/orders/[id]/review` & `/profile/reviews` | Lạm dụng URL ảnh mẫu Unsplash bên ngoài làm ảnh fallback thay vì asset nội bộ | **OPEN** |
| **BUG-MOD06-08** | **P1** | Global Header Topbar (Tablet 768px) | Tràn thanh cuộn ngang Tablet +284px trên toàn bộ các trang Đánh giá (`scroll: 1052px`) | **OPEN** |
| **BUG-MOD06-09** | **P2** | `FloatingAIChatbox.tsx` & `SellerChatView.tsx` | Lạm dụng hiệu ứng nhấp nháy `animate-pulse` trên nút kích hoạt và popup Bé Cáo AI | **OPEN** |
| **BUG-MOD06-10** | **P1** | Universal Defect (Tất cả 8 màn hình MOD-06) | Rò rỉ lỗi gọi API Reader Bookmarks 404 (`/api/reader/bookmarks/con-duong-phia-truoc`) | **OPEN** |
| **BUG-MOD06-11** | **P0** | `FloatingAIChatbox.tsx` & Gateway Proxy | Bé Cáo AI bị chặn lỗi HTTP 401 Unauthorized đối với mọi khách vãng lai chưa đăng nhập | **OPEN** |
| **BUG-MOD06-12** | **P0** | Admin Portal & `community-service` | Thiếu hoàn toàn giao diện bàn kiểm duyệt báo cáo vi phạm nội dung (Moderation Queue) | **OPEN** |
| **BUG-MOD06-13** | **P1** | `/book/[slug]` (Chi Tiết Đánh Giá Sách) | Thiếu nút "Báo Cáo Bình Luận" (Report Review) để độc giả gửi phản ánh nội dung xấu | **OPEN** |
| **BUG-MOD06-14** | **P1** | `/account/messages` & `useChatSocket` | Thiếu cơ chế cập nhật trạng thái đã đọc (Read Receipts) trực tiếp qua WebSocket | **OPEN** |

---

## 🔎 CHI TIẾT KỸ THUẬT 14 LỖI KIỂM THỬ XÁC THỰC THỰC TẾ

```
==================================================================================================
MÃ LỖI: BUG-MOD06-01 (Mức độ: P0 - Vỡ Layout Khẩn Cấp)
VỊ TRÍ: web/src/app/profile/reviews/page.tsx (Dòng 182 - 245)
        Màn hình: Quản Lý Đánh Giá Của Tôi (/profile/reviews)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/profile/reviews/page.tsx
   - Component: `MyReviewsPage` bọc trong `AccountLayout`.
   - Breakpoint vi phạm: Mobile Portrait (Viewport 390 x 844 px).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi độc giả truy cập trang xem lại các bài đánh giá của mình trên điện thoại di động (390px), toàn bộ trang web bị kéo dãn nghiêm trọng ra tới 1093px:
     * Chiều rộng cửa sổ (windowWidth): 390px.
     * Chiều rộng cuộn thực tế (scrollWidth): 1093px.
     * Mức độ tràn: +703px (gấp gần 3 lần màn hình điện thoại).
   - Bằng chứng DOM Inspection từ Playwright Analyzer:
     * `main.flex-1.min-w-0.bg-white`: width = 1079px, right = 1093px (vượt 703px).
     * `div.space-y-6`: width = 1077px, right = 1092px (vượt 702px).
     * `div.bg-white.p-5.sm:p-6`: width = 1077px, right = 1092px (vượt 702px).
     * `div.flex.flex-col.sm:flex-row`: width = 1035px, right = 1071px (vượt 681px).
     * `h1.text-xl.sm:text-2xl.font-bold`: width = 1035px, right = 1071px (vượt 681px).
   - Hậu quả: Giao diện trên điện thoại bị vỡ nát hoàn toàn, người dùng bị vuốt ngang mất kiểm soát, các nút chuyển tab "Đã đánh giá" và "Chờ đánh giá" bị trôi xa khỏi tầm mắt.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Thẻ `div.bg-white.p-5.sm:p-6` chứa phần Header và 3 thẻ KPI Thống kê đánh giá (`grid grid-cols-1 sm:grid-cols-3 gap-3.5`).
   - Khối tiêu đề `flex flex-col sm:flex-row sm:items-center justify-between` thiếu thuộc tính `w-full min-w-0 max-w-full`. Khi kết hợp với các thẻ con bên dưới không có cơ chế `overflow-x-clip`, phần tử `h1` và container cha bị kéo dãn ra theo kích thước desktop khiến toàn bộ thẻ `main` trong `AccountLayout` bị bung độ rộng ra 1079px.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Bổ sung `w-full min-w-0 max-w-full overflow-hidden` trên container bao ngoài `div.space-y-6` trong `MyReviewsPage`.
   - Bổ sung `min-w-0 break-words` trên thẻ `h1` và bọc khối 3 thẻ thống kê trong `w-full overflow-hidden`.
   - Đảm bảo thanh cuộn tabs pill (`custom-scrollbar`) có `w-full overflow-x-auto` độc lập mà không truyền lực kéo dãn lên layout cha.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng để tiến hành sửa code).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-02 (Mức độ: P0 - Tính Năng Bị Chặn Hoàn Toàn)
VỊ TRÍ: web/src/app/book/[id]/page.tsx (Dòng 1465 - 1477)
        Component liên quan: web/src/ui/components/chat/FloatingChatWidget.tsx
        Màn hình: Trang Chi Tiết Sách (/book/[slug])
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/book/[id]/page.tsx (Khối tương tác thông tin gian hàng / publisher profile, dòng 1465-1477).
   - Component chưa được kết nối: `web/src/ui/components/chat/FloatingChatWidget.tsx`.

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Theo đặc tả kiến trúc MOD-06 (`tasks/module-06-ai-community-chat.md`, Mục 2, Dòng 23-25):
     *"Khách hàng từ trang chi tiết sách bấm 'Chat với Shop' $\rightarrow$ Mở hộp thoại chat với đúng Shop đó kèm thẻ sách đang xem."*
   - Tuy nhiên, trong mã nguồn thực tế tại trang chi tiết sách `web/src/app/book/[id]/page.tsx`:
     ```tsx
     {/* Option 1: Nhắn tin (disabled) */}
     <div
       className="w-full px-3 py-2 rounded-lg text-xs font-medium text-gray-400 flex items-center justify-between cursor-not-allowed select-none bg-gray-50/50 mb-1"
       title="Chức năng nhắn tin đang được phát triển"
     >
       <div className="flex items-center gap-2">
         <span className="material-symbols-outlined text-sm text-gray-400">chat</span>
         <span>Nhắn tin</span>
       </div>
       <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-bold">
         Sắp ra mắt
       </span>
     </div>
     ```
   - Nút "Nhắn tin" với chủ gian hàng bị vô hiệu hóa bằng `cursor-not-allowed` và gắn nhãn "Sắp ra mắt".
   - Trong khi đó, component `FloatingChatWidget.tsx` (dài hơn 36KB, hỗ trợ chat đa phương tiện thời gian thực qua socket) và trang `/account/messages` đã được xây dựng hoàn chỉnh nhưng **hoàn toàn không được import hoặc kích hoạt ở bất kỳ đâu**.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Developer để lại nút giao diện mockup tĩnh ban đầu mà chưa tích hợp sự kiện mở `FloatingChatWidget` hoặc chuyển hướng sang trung tâm tin nhắn `/account/messages?shop=${storeId}&bookId=${bookId}`.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Chuyển thẻ `div` bị disabled thành thẻ `<button>` tương tác chính thức:
     ```tsx
     <button
       type="button"
       onClick={() => handleOpenShopChat(publisherProfile.id, publisherProfile.name, book)}
       className="w-full px-3 py-2 rounded-lg text-xs font-semibold text-emerald-800 hover:bg-emerald-50 flex items-center justify-between transition-colors cursor-pointer mb-1"
     >
       <div className="flex items-center gap-2">
         <span className="material-symbols-outlined text-sm text-emerald-700">chat</span>
         <span>Chat với Shop</span>
       </div>
       <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
         Trực tuyến
       </span>
     </button>
     ```
   - Tích hợp `FloatingChatWidget` hoặc điều hướng sang `/account/messages?shop=${publisherProfile.id}&bookId=${book.id}` kèm thẻ xem trước cuốn sách ngữ cảnh.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-03 (Mức độ: P0 - Lỗi Gọi API Mạng 400 Bad Request)
VỊ TRÍ: web/src/app/book/[id]/page.tsx (hoặc component gọi reviewApi)
        Màn hình: Trang Chi Tiết Sách (/book/con-duong-phia-truoc)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/book/[id]/page.tsx
   - API Endpoint: `GET /api/v1/books/[slug]/reviews?limit=20`

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi người dùng truy cập trang chi tiết sách thông qua đường dẫn slug thân thiện SEO:
     `http://localhost:3100/book/con-duong-phia-truoc`
   - Playwright Network Interceptor bắt được 2 request bị lỗi HTTP 400 đỏ rực trong Console:
     * Request 1: `400 /api/v1/books/con-duong-phia-truoc/reviews?limit=20`
     * Request 2: `400 /api/v1/books/con-duong-phia-truoc/reviews?limit=20`
   - Phần đánh giá nhận xét của độc giả trên trang chi tiết sách bị treo ở trạng thái loading hoặc không hiển thị được danh sách đánh giá.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Microservice backend `community-service` định nghĩa route đánh giá sách theo UUID:
     `@Get(':bookId/reviews')` với validation pipe yêu cầu `:bookId` phải là định dạng `@IsUUID()`.
   - Phía frontend Next.js, component lấy trực tiếp tham số route `params.id` (vốn đang là chuỗi slug `"con-duong-phia-truoc"`) để bắn request lấy review trước khi backend phân giải xong UUID của sách, dẫn đến việc validation pipe từ chối request với mã lỗi `400 Bad Request`.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Chỉ gọi API `reviewApi.getBookReviews(bookId)` sau khi đã fetch thành công dữ liệu sách và có được UUID thực tế (`book.id`):
     ```tsx
     useEffect(() => {
       if (!book?.id) return;
       fetchReviews(book.id);
     }, [book?.id]);
     ```

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-04 (Mức độ: P1 - Giao Diện & Cuộn Tràn)
VỊ TRÍ: web/src/ui/components/seller/SellerReviewsView.tsx (Dòng 768 - 775)
        Màn hình: Quản Lý Đánh Giá Gian Hàng Của NXB (/seller/reviews)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/ui/components/seller/SellerReviewsView.tsx
   - Component: Thanh lọc tab `DataTableFilterBar` chứa 8 nút pill lọc theo số sao.
   - Breakpoint vi phạm: Mobile Portrait (390 x 844 px).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Trên Mobile (390px), danh sách 8 nút bấm lọc đánh giá của Seller bị tràn ngang ra khỏi màn hình:
     * Chiều rộng cuộn thực tế: 606px vs Viewport: 390px (+216px tràn lề).
     * Bằng chứng DOM Inspection từ Playwright:
       - Nút 1: `button.px-3.5.py-1.5.rounded-full` (width: 124px, right: 396px, tràn 6px).
       - Nút 2: `button.px-3.5.py-1.5.rounded-full` (width: 99px, right: 501px, tràn 111px).
       - Nút 3: `button.px-3.5.py-1.5.rounded-full` (width: 99px, right: 606px, tràn 216px).
   - Người quản lý gian hàng trên điện thoại không thể bấm vào các nút lọc 3 sao, 2 sao, 1 sao nếu không cuộn ngang toàn bộ trang web.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Mảng `filterTabs` gồm 8 tabs ("Tất Cả", "Chưa Phản Hồi", "Đã Phản Hồi", "5 Sao", "4 Sao", "3 Sao", "2 Sao", "1 Sao") được render trong `DataTableFilterBar` mà container bao quanh không có class `overflow-x-auto scrollbar-none flex-nowrap`, khiến hàng nút dài đẩy chiều rộng của thẻ cha vượt quá 390px.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Thêm class `w-full overflow-x-auto scrollbar-none flex-nowrap` vào container chứa danh sách tabs trong `DataTableFilterBar`, bổ sung `shrink-0` cho các nút bấm pill.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-05 (Mức độ: P1 - Vi Phạm Tiêu Chuẩn Thiết Kế Anti-AI)
VỊ TRÍ: web/src/ui/components/seller/SellerReviewsView.tsx (Dòng 307 - 311 & Dòng 734) &
        web/src/app/account/messages/page.tsx (Dòng 1551)
        Màn hình: Quản Lý Đánh Giá NXB & Tin Nhắn Độc Giả
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/ui/components/seller/SellerReviewsView.tsx (dòng 307-311 và dòng 734).
   - File: web/src/app/account/messages/page.tsx (dòng 1551).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Robot Playwright kích hoạt cờ cảnh báo `hasUnicodeStars: true` trên cả 2 màn hình.
   - Bằng chứng mã nguồn:
     * Trong `SellerReviewsView.tsx`:
       ```ts
       { id: '5_STAR', label: '5 Sao ★', count: stats.starCounts[5] },
       { id: '4_STAR', label: '4 Sao ★', count: stats.starCounts[4] },
       { id: '3_STAR', label: '3 Sao ★', count: stats.starCounts[3] },
       { id: '2_STAR', label: '2 Sao ★', count: stats.starCounts[2] },
       { id: '1_STAR', label: '1 Sao ★', count: stats.starCounts[1] },
       ...
       {stats.starCounts[5] + stats.starCounts[4]} đánh giá 4★ & 5★
       ```
     * Trong `messages/page.tsx`:
       ```tsx
       <strong className="text-gray-900 font-bold">★ {activeChannelData.rating}</strong>
       ```
   - Ký tự sao đen `★` unicode thô hiển thị không đồng nhất trên các hệ điều hành khác nhau (trên iOS hiển thị thành emoji vàng viền đen, trên Windows hiển thị thành text font đen thô), gây mất tính thẩm mỹ cao cấp của nền tảng sách bản quyền.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Sử dụng ký tự unicode thô trực tiếp trong chuỗi nhãn văn bản thay vì sử dụng component icon vector Google Material Symbol chuẩn hóa.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Thay thế các nhãn chuỗi có ký tự sao bằng component hiển thị nhãn kết hợp vector icon:
     ```tsx
     <span className="flex items-center gap-1">
       <span>5 Sao</span>
       <span className="material-symbols-outlined text-[14px] text-[#FEA619]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
     </span>
     ```

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-06 (Mức độ: P1 - Lỗi Kiến Trúc Dữ Liệu & Hiệu Năng)
VỊ TRÍ: web/src/app/orders/[id]/review/page.tsx (Dòng 151 - 169)
        Màn hình: Viết Đánh Giá Đơn Hàng (/orders/[id]/review)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/orders/[id]/review/page.tsx
   - Hàm xử lý: `handleFileUpload` (dòng 151 - 169).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi độc giả tải ảnh unbox sách thực tế, đoạn code xử lý như sau:
     ```ts
     if (rawId) {
       try {
         const res = await orderApi.uploadDisputeEvidence(rawId, file);
         if (res?.success && res.data?.url) {
           uploadedUrls.push(res.data.url);
           continue;
         }
       } catch {
         // Fallback to local DataURL
       }
     }
     const url = await new Promise<string>((resolve) => {
       const reader = new FileReader();
       reader.onload = (ev) => resolve(ev.target?.result as string);
       reader.readAsDataURL(file);
     });
     uploadedUrls.push(url);
     ```
   - Lỗi 1: Gọi nhầm API `orderApi.uploadDisputeEvidence` (đây là API khiếu nại tranh chấp đơn hàng của shipper/seller, không phải API review).
   - Lỗi 2: Khi API này trả về lỗi hoặc không dùng được, mã nguồn tự động chuyển sang đọc file thành chuỗi Base64 DataURL: `data:image/jpeg;base64,...` dung lượng từ 2MB đến 10MB và nhồi trực tiếp vào payload gửi lên API tạo đánh giá (`reviewApi.createBookReview`).
   - Hậu quả: Làm nghẽn đường truyền mạng, gây lỗi `413 Request Entity Too Large` trên server NGINX / Gateway, hoặc làm phình to cơ sở dữ liệu MongoDB/PostgreSQL khi lưu các chuỗi Base64 hàng chục triệu ký tự.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Thiếu service upload ảnh đánh giá chuyên biệt kết nối với S3/Cloud Storage, dẫn đến giải pháp tạm thời (workaround) bằng Base64 DataURL.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Đấu nối đúng endpoint upload ảnh media đánh giá: `POST /api/v1/reviews/upload` hoặc `POST /api/v1/storage/upload` trả về URL ảnh dạng CDN: `https://storage.huki.vn/reviews/...webp`.
   - Chặn tuyệt đối việc gửi chuỗi Base64 DataURL trong mảng `images` lên cơ sở dữ liệu.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-07 (Mức độ: P1 - Vi Phạm Bản Quyền & Phụ Thuộc Tài Nguyên Ngoài)
VỊ TRÍ: web/src/app/orders/[id]/review/page.tsx (Dòng 92, 111, 126) &
        web/src/app/profile/reviews/page.tsx (Dòng 120)
        Màn hình: Viết Đánh Giá Đơn Hàng & Quản Lý Đánh Giá Của Tôi
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/orders/[id]/review/page.tsx (dòng 92, 111, 126).
   - File: web/src/app/profile/reviews/page.tsx (dòng 120).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi một cuốn sách trong đơn hàng không có ảnh bìa hoặc đang tải, mã nguồn sử dụng URL ảnh mẫu cố định từ dịch vụ Unsplash bên ngoài:
     `'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=300'`
   - Ảnh này là ảnh chụp một người đọc sách ngẫu nhiên trên mạng, hoàn toàn không phải ấn phẩm sách của HuKi, gây hiểu lầm cho người mua hàng.
   - Việc gọi ảnh từ domain `images.unsplash.com` gây vi phạm chính sách bảo mật nội dung (CSP), làm chậm tốc độ tải trang khi mạng quốc tế có sự cố.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Lập trình viên để lại link ảnh mockup từ giai đoạn phát triển ban đầu mà không tạo component placeholder nội bộ.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Thay thế toàn bộ các chuỗi URL Unsplash bằng đường dẫn asset nội bộ: `/images/book-cover-placeholder.webp` hoặc render component icon sách thanh lịch với nền màu Forest Green `#003B2B`.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-08 (Mức độ: P1 - Tràn Giao Diện Tablet)
VỊ TRÍ: web/src/ui/components/layout/Header.tsx
        Áp dụng trên các trang của MOD-06 tại độ phân giải Tablet (768 x 1024):
        - /orders/[id]/review
        - /profile/reviews
        - /book/con-duong-phia-truoc
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/ui/components/layout/Header.tsx (Topbar Navigation Header trên Tablet).
   - Breakpoint vi phạm: Tablet Portrait (768 x 1024 px).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi kiểm tra các trang đánh giá và trang sách ở độ phân giải Tablet 768px, toàn bộ màn hình bị tràn ngang +284px:
     * Chiều rộng cuộn thực tế: 1052px vs Cửa sổ: 768px.
     * Mức độ tràn phát hiện: +284px.
   - Thanh tiện ích topbar bên phải đẩy khung trang ra ngoài 284px, tạo thanh cuộn ngang gây giật màn hình khi lướt đọc trên iPad/máy tính bảng.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Đã ghi nhận tại BUG-MOD05-01 (Lỗi dùng chung của Header trên tablet do khối tiện ích phụ chưa áp dụng `hidden lg:flex`).

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Gắn `hidden lg:flex` cho thanh liên kết topbar trên Header và bọc `overflow-x-clip` trên thẻ `<header>`.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-09 (Mức độ: P2 - Tiêu Chuẩn Thiết Kế Anti-AI)
VỊ TRÍ: web/src/ui/components/ai/FloatingAIChatbox.tsx (Dòng 307 & Dòng 325) &
        web/src/ui/components/seller/SellerChatView.tsx
        Component: Widget Trợ Lý Đọc Sách Bé Cáo AI Nổi & Khung Chat NXB
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/ui/components/ai/FloatingAIChatbox.tsx (dòng 307 và dòng 325).
   - Phần tử: Chấm tròn trạng thái trên nút kích hoạt nổi và thanh tiêu đề popup chat Bé Cáo.

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Nút mở Bé Cáo AI sử dụng chấm xanh nhấp nháy liên tục không ngừng:
     `<span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />`
   - Tiêu đề popup chat cũng sử dụng:
     `<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />`
   - Hiệu ứng `animate-pulse` nhấp nháy lặp đi lặp lại vô tận tạo cảm giác giật mắt khó chịu và mang đậm dấu ấn "AI chatbot template" rẻ tiền, vi phạm quy tắc Anti-AI (không dùng chuyển động giả tạo làm phân tán sự tập trung của bạn đọc).

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Lạm dụng class animation mặc định của Tailwind CSS thay vì sử dụng thiết kế chấm tròn tĩnh thanh lịch.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Loại bỏ class `animate-pulse`, chuyển thành chấm tròn tĩnh màu xanh ngọc bích `#00875A`.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-10 (Mức độ: P1 - Universal Cross-Portal Defect)
VỊ TRÍ: web/src/ui/context/ReaderSyncProvider.tsx (Global RootLayout)
        Xuất hiện trên toàn bộ 8 màn hình của MOD-06
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/ui/context/ReaderSyncProvider.tsx

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Tất cả 24 lượt quét của MOD-06 trên 3 viewports đều ghi nhận các lỗi 404 console:
     `GET /api/reader/bookmarks/con-duong-phia-truoc 404 (Not Found)`
     `GET /api/reader/progress 404 (Not Found)`
   - Gây ô nhiễm log và lãng phí băng thông mạng trên các màn hình chat, xem đánh giá và kiểm duyệt nội dung.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Provider dấu trang gắn global trong layout cha mà không kiểm tra URL path.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Bổ sung điều kiện `if (!pathname.startsWith('/reader')) return;` trước khi fetch bookmark.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Được gộp vào danh mục xử lý nền tảng cốt lõi).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-11 (Mức độ: P0 - Lỗi Chức Năng Nghiệp Vụ Nghiêm Trọng)
VỊ TRÍ: web/src/ui/components/ai/FloatingAIChatbox.tsx (Dòng 144 - 157)
        platform/apps/api-gateway/src/modules/proxy/route-classification.ts (Dòng 182)
        Màn hình: Trợ Lý Đọc Sách Bé Cáo AI (FloatingAIChatbox)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File Frontend: web/src/ui/components/ai/FloatingAIChatbox.tsx
   - File Backend: platform/apps/api-gateway/src/modules/proxy/route-classification.ts
   - API Endpoint: `POST /api/v1/chat/ai`

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Trên Frontend, component `FloatingAIChatbox` xuất hiện ở góc dưới mọi trang công cộng để tư vấn sách cho mọi độc giả (kể cả khách vãng lai chưa đăng nhập).
   - Khi gọi API, client đặt cờ bỏ qua xác thực:
     ```ts
     const res = await apiClient('/chat/ai', {
       method: 'POST',
       body: JSON.stringify({ message: text, history: historyPayload, sessionId }),
       skipAuth: true,
     });
     ```
   - Tuy nhiên, trong API Gateway `route-classification.ts`, endpoint `POST /chat/ai` không nằm trong danh mục các đường dẫn công khai (dòng 60-81). Do đó, Gateway tự động phân loại route này thành `AUTHENTICATED` (dòng 182).
   - Khi khách vãng lai hoặc người dùng chưa có token bấm chat và gửi câu hỏi, Gateway lập tức từ chối và trả về HTTP 401 Unauthorized:
     ```json
     {
       "status": "error",
       "statusCode": 401,
       "code": "AUTH_TOKEN_MISSING",
       "message": "Authentication token is required",
       "path": "/api/v1/chat/ai"
     }
     ```
   - Client bắt ngoại lệ `catch (err)` và hiển thị cho người dùng: *"Xin lỗi bạn nhé, hệ thống đang bận một chút. Bạn vui lòng thử lại sau giây lát nha!"*.
   - Hậu quả: Toàn bộ độc giả chưa đăng nhập hoặc khách vãng lai khi click Bé Cáo AI để xin gợi ý sách đều bị báo lỗi hệ thống bận!

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Mâu thuẫn giữa chính sách bảo mật tại Gateway (`RouteTier: AUTHENTICATED`) và nghiệp vụ Frontend (`skipAuth: true`). Chatbot tư vấn sách cộng đồng phục vụ cho cả khách vãng lai chưa tạo tài khoản nên phải được mở quyền công khai tại Gateway.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Bổ sung `normPath === '/chat/ai'` vào danh sách route công khai tại `platform/apps/api-gateway/src/modules/proxy/route-classification.ts`.
   - Tại `FloatingAIChatbox.tsx`, cho phép truyền `skipAuth: false` để nếu người dùng đã đăng nhập thì tự động gắn token, còn nếu chưa đăng nhập thì Gateway vẫn cho phép xử lý câu hỏi mà không bắt buộc có Bearer token.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-12 (Mức độ: P0 - Thiếu Hoàn Toàn Giao Diện Kiểm Duyệt Báo Cáo)
VỊ TRÍ: web/src/app/admin/reports/page.tsx
        platform/apps/community-service/src/modules/moderation/moderation.controller.ts
        Màn hình: Quản Trị Kiểm Duyệt Nội Dung Sàn (/admin/moderation)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - Frontend: Khu vực Admin Portal (`web/src/app/admin/*`).
   - Backend: `platform/apps/community-service/src/modules/moderation/moderation.controller.ts`

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Backend `community-service` đã triển khai một hệ sinh thái kiểm duyệt nội dung độc giả hoàn chỉnh gồm các API:
     * `POST /api/v1/reviews/:id/report`: Người dùng gửi báo cáo vi phạm.
     * `GET /api/v1/admin/moderation/reports`: Admin lấy danh sách báo cáo vi phạm (Status 200).
     * `PATCH /api/v1/admin/moderation/reports/:id/review`: Admin tiếp nhận xử lý (`REVIEWING`).
     * `PATCH /api/v1/admin/moderation/reports/:id/resolve`: Admin xử lý báo cáo (`outcome: RESOLVED/DISMISSED`, `action: HIDE/DELETE/BAN/WARN/NONE`).
   - Tuy nhiên, trong mã nguồn Admin Portal (`web/src/app/admin/*`), mục `/admin/reports` thực chất là màn hình phân tích báo cáo tài chính doanh thu sàn GMV (`AdminReportsView.tsx`).
   - Toàn bộ giao diện Admin Portal **KHÔNG HỀ CÓ MÀN HÌNH KIỂM DUYỆT BÁO CÁO NỘI DUNG** (`/admin/moderation`).
   - Hậu quả: Khi độc giả báo cáo một bài đánh giá chứa từ ngữ thô tục hoặc spam link lừa đảo, báo cáo được lưu vào cơ sở dữ liệu MongoDB nhưng Quản trị viên sàn hoàn toàn không có giao diện web để theo dõi, duyệt ẩn hoặc xử lý vi phạm!

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Đội ngũ phát triển Frontend chưa xây dựng component giao diện cho phân hệ `ContentModerationView` và chưa tạo trang `/admin/moderation` kết nối tới các endpoint của `community-service`.

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Xây dựng trang `/admin/moderation` (hoặc tích hợp tab "Kiểm Duyệt Bình Luận & Báo Cáo" vào khu vực quản trị nội dung), hiển thị bảng danh sách các báo cáo vi phạm đang chờ xử lý (`PENDING`), chi tiết nội dung bị báo cáo, lý do vi phạm (`SPAM`, `PROFANITY`), và các nút hành động (Ẩn bình luận, Cảnh cáo tác giả, Bỏ qua báo cáo).

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-13 (Mức độ: P1 - Thiếu Tương Tác Nghiệp Vụ Báo Cáo Trên UI Đọc Sách)
VỊ TRÍ: web/src/app/book/[id]/page.tsx
        Màn hình: Chi Tiết Sách & Khối Bình Luận (/book/[slug])
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/app/book/[id]/page.tsx
   - Component: Khối hiển thị đánh giá độc giả (Reviews List Section).

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Trên giao diện chi tiết đánh giá sách của bạn đọc, mỗi bài đánh giá chỉ hiển thị nội dung, số sao, ngày đăng và nút "Hữu ích".
   - Hoàn toàn **không có nút hoặc menu Báo Cáo Vi Phạm** (Report / Flag) cho từng bài đánh giá, mặc dù backend đã cung cấp sẵn API `POST /api/v1/reviews/:id/report`.
   - Khi độc giả bắt gặp một bài đánh giá spam đường link độc hại hoặc xúc phạm tác giả, họ không có công cụ trực tiếp trên giao diện để gửi phản ánh tới ban quản trị sàn.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - UI Review Card trên trang chi tiết sách chưa được trang bị nút hành động phụ (Secondary Action: Report Icon Button).

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Thêm nút icon lá cờ `flag` (Google Material Symbols) bên cạnh nút "Hữu ích". Khi bấm vào, hiển thị hộp thoại popover cho phép chọn lý do vi phạm (`SPAM`, `OFFENSIVE`, `HARASSMENT`, `OTHER`) và gửi request tới `POST /api/v1/reviews/:id/report`.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

```
==================================================================================================
MÃ LỖI: BUG-MOD06-14 (Mức độ: P1 - Thiếu Đồng Bộ Trạng Thái Đã Đọc Qua Socket Realtime)
VỊ TRÍ: web/src/ui/hooks/useChatSocket.ts
        web/src/app/account/messages/page.tsx
        Màn hình: Trung Tâm Tin Nhắn Độc Giả (/account/messages)
==================================================================================================
1. VỊ TRÍ CHÍNH XÁC:
   - File: web/src/ui/hooks/useChatSocket.ts
   - Component: `web/src/app/account/messages/page.tsx`

2. MÔ TẢ HIỆN TƯỢNG & BẰNG CHỨNG KIỂM THỬ:
   - Khi đối tác (NXB/Shop) gửi tin nhắn mới, WebSocket nhận sự kiện và tăng biến đếm tin nhắn chưa đọc (`unreadCount`).
   - Tuy nhiên, khi độc giả mở vào cuộc trò chuyện đó để đọc tin nhắn, sự kiện `conversation:read` không được socket gửi thông báo đồng bộ ngược lại cho danh sách kênh (channel list) và thanh điều hướng global topbar trong thời gian thực.
   - Người dùng vẫn thấy chấm đỏ chưa đọc (Unread badge) trên sidebar cho đến khi phải F5 / reload lại toàn bộ trang web.

3. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ (ROOT CAUSE):
   - Hook `useChatSocket` chưa tích hợp sự kiện phản hồi `message:read` hoặc `conversation:read` để tự động giảm `unreadCount = 0` cục bộ trên state khi hội thoại đang được kích hoạt (`activeChannelId === conversation.id`).

4. CÁCH KHẮC PHỤC ĐỀ XUẤT:
   - Bổ sung event listener `conversation:read` trong `useChatSocket.ts` và tự động cập nhật lại danh sách hội thoại trong `chatService` mà không cần gọi lại API toàn trang.

5. TRẠNG THÁI:
   - Trạng thái: OPEN (Chờ phê duyệt từ người dùng).
```

---

## 📈 TỔNG KẾT BẢNG THEO DÕI KIỂM THỬ TOÀN DIỆN HỆ THỐNG HUKI (MOD-01 ĐẾN MOD-06)

| Phân Hệ Nghiệp Vụ | Quy Mô Màn Hình | Số Lượt Kiểm Thử Viewports | Số Lượng Lỗi Bóc Tách | Trạng Thái Tài Liệu |
| :--- | :---: | :---: | :---: | :--- |
| **MOD-01: Public & Buyer Journey** | 45 màn hình | 135 lượt test | **21 lỗi** | [tasks/bug-mod01.md](file:///e:/HuKi/tasks/bug-mod01.md) (Hoàn tất) |
| **MOD-02: Seller & Publisher Portal** | 48 màn hình | 126 lượt test | **14 lỗi** | [tasks/bug-mod02.md](file:///e:/HuKi/tasks/bug-mod02.md) (Hoàn tất) |
| **MOD-03: Platform Admin Operations** | 35 màn hình | 93 lượt test | **10 lỗi** | [tasks/bug-mod03.md](file:///e:/HuKi/tasks/bug-mod03.md) (Hoàn tất) |
| **MOD-04: Shipper & Logistics Hub** | 10 màn hình | 30 lượt test | **9 lỗi** | [tasks/bug-mod04.md](file:///e:/HuKi/tasks/bug-mod04.md) (Hoàn tất) |
| **MOD-05: Affiliate & Creator Ecosystem** | 9 màn hình | 27 lượt test | **11 lỗi** | [tasks/bug-mod05.md](file:///e:/HuKi/tasks/bug-mod05.md) (Hoàn tất) |
| **MOD-06: Community, Chat & AI Assistant** | 8 màn hình | 24 lượt test | **14 lỗi** | [tasks/bug-mod06.md](file:///e:/HuKi/tasks/bug-mod06.md) (Hoàn tất) |
| **TỔNG CỘNG TOÀN BỘ 6 PHÂN HỆ** | **155 màn hình** | **435 lượt kiểm thử** | **79 lỗi xác thực** | **Sẵn sàng trình duyệt triển khai** |


