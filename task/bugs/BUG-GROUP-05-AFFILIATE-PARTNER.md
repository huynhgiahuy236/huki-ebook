# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Tiếp Thị Liên Kết (Affiliate & Content Creator Ecosystem)

> **Mã phân hệ:** `BUG-GROUP-05`  
> **Đối tượng người dùng:** Người làm tiếp thị liên kết (Affiliate Marketer), KOC/KOL Reviewer sách, Các nhà sáng tạo nội dung cộng đồng.  
> **Phạm vi kiểm thử:** Toàn bộ 9 màn hình phân hệ Affiliate (`/account/affiliate/*`, `/affiliate/*`, `/r/*`), gồm quy trình đăng ký đối tác, tạo link rút gọn, gắn mã tracking cookie, chợ chiến dịch hoa hồng, thống kê chuyển đổi và rút hoa hồng.  
> **Nguyên tắc kỹ thuật:** Bám sát mô hình tiếp thị đa kênh, bảo vệ tính toàn vẹn của mã tracking, loại bỏ hoàn toàn URL hardcode localhost, giải pháp kỹ thuật duy nhất.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (AFFILIATE PARTNER)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **AF-001** | Tạo link & Nộp hồ sơ (`/account/affiliate/application`) | Nút **"Tạo Link Chia Sẻ"** & **"Sao Chép"** | Cấu Hình / URL | **P0 (Blocker)** | ✅ **PASS** (Đã chuyển sang `getAffiliateSiteOrigin()` động) |
| **AF-002** | Chợ chiến dịch (`/account/affiliate/marketplace`) | Nút **"Lấy Link Tiếp Thị Ngay"** | Cấu Hình / URL | **P0 (Blocker)** | ✅ **PASS** (Đã đồng bộ domain chuẩn qua `getAffiliateSiteOrigin()`) |
| **AF-003** | Đăng ký đối tác (`/account/affiliate/application`) | Nút **"Đăng Nhập Ngay"** (Guest State) | Điều Hướng / Auth | **P1 (Critical)** | ✅ **PASS** (Đã sửa link chuyển tiếp sang `/auth/login?redirect=...`) |
| **AF-004** | Chuyển hướng link (`/r/[shortCode]`) | Xử lý Cookie **Mã Giới Thiệu (Attribution)** | Bảo Mật / Cookie | **P0 (Blocker)** | ✅ **PASS** (Đã thêm `SameSite=Lax`, `Secure` & lưu kép localStorage) |
| **AF-005** | Chợ chiến dịch (`/account/affiliate/marketplace`) | Nút phân trang **Next / Previous** | Logic / Điều Hướng | **P2 (Major)** | ✅ **PASS** (Khóa nút khi loading, chặn click disabled đúng chuẩn CSS) |
| **AF-006** | Yêu cầu rút hoa hồng (`/account/affiliate/dashboard`) | Nút **"Xác Nhận Rút Tiền"** | Form & Validation | **P1 (Critical)** | ✅ **PASS** (Xây dựng Payout Modal, khóa chống double submit & Idempotency) |

---

## CHI TIẾT KỸ THUẬT TỪNG LỖI CỤ THỂ

---

### [AF-001] Nút "Tạo Link Chia Sẻ" Hardcode Địa Chỉ `http://localhost:3100`
- **Vị trí chính xác:**
  - Màn hình: Hồ sơ tiếp thị liên kết (`/account/affiliate/application`)
  - File mã nguồn: [web/src/app/account/affiliate/application/page.tsx](file:///e:/HuKi/web/src/app/account/affiliate/application/page.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Tạo link tiếp thị"` và nút `"Sao chép liên kết"`.
- **Hiện tượng lỗi ban đầu:**
  - Khi triển khai trên môi trường UAT (`https://huki-uat.duckdns.org`) hoặc Production, SSR hoặc fallback tự động sinh link `http://localhost:3100/r/...`, khiến khách hàng click link trên mạng xã hội bị lỗi không tìm thấy máy chủ (`ERR_CONNECTION_REFUSED`).
- **Nguyên nhân gốc rễ:**
  - Hardcode chuỗi `'http://localhost:3100'` làm fallback trong component.
- **Giải pháp dứt khoát đã triển khai:**
  - Xây dựng hàm tiện ích trung tâm `getAffiliateSiteOrigin()` và `generateAffiliateUrl()` trong `web/src/lib/affiliate/affiliateApi.ts`:
    Ưu tiên `window.location.origin` (nếu khác localhost) hoặc đọc `process.env.NEXT_PUBLIC_SITE_URL`, fallback tự động về domain máy chủ triển khai thật.
  - Thay thế toàn bộ biến `origin` và `originUrl` tại `application/page.tsx` sang `getAffiliateSiteOrigin()`.

---

### [AF-002] Nút "Lấy Link Tiếp Thị Ngay" Trong Marketplace Bị Hardcode Localhost
- **Vị trí chính xác:**
  - Màn hình: Chợ chiến dịch hoa hồng sách (`/account/affiliate/marketplace`)
  - File mã nguồn: [web/src/app/account/affiliate/marketplace/page.tsx](file:///e:/HuKi/web/src/app/account/affiliate/marketplace/page.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Lấy liên kết chiến dịch"` trên từng thẻ sách.
- **Hiện tượng lỗi ban đầu:**
  - Modal và Clipboard nhận link rút gọn có tiền tố `http://localhost:3100/r/...`.
- **Nguyên nhân gốc rễ:**
  - Lập trình viên sử dụng trực tiếp chuỗi fallback `http://localhost:3100`.
- **Giải pháp dứt khoát đã triển khai:**
  - Áp dụng `getAffiliateSiteOrigin()` đồng bộ hóa với hệ thống tiếp thị chung.

---

### [AF-003] Nút "Đăng Nhập Ngay" Dành Cho Khách Vãng Lai Trỏ Sai URL Gây Lỗi 404
- **Vị trí chính xác:**
  - Màn hình: Trang hồ sơ tiếp thị đối tác (`/account/affiliate/application`)
  - File mã nguồn: [web/src/app/account/affiliate/application/page.tsx](file:///e:/HuKi/web/src/app/account/affiliate/application/page.tsx#L304)
- **Nút bấm / Thao tác:**
  - Nút: `"Đăng Nhập Ngay"` khi người dùng chưa đăng nhập.
- **Hiện tượng lỗi ban đầu:**
  - Nút chuyển hướng tới route cũ `/login` không tồn tại trong hệ thống (Next.js trả về 404 Not Found).
- **Nguyên nhân gốc rễ:**
  - Next.js route chuẩn của HuKi là `/auth/login`.
- **Giải pháp dứt khoát đã triển khai:**
  - Cập nhật đường dẫn chuẩn: `href="/auth/login?redirect=/account/affiliate/application"`, đảm bảo sau khi đăng nhập tài khoản sẽ tự động quay lại đúng trang đăng ký đối tác tiếp thị.

---

### [AF-004] Link Chuyển Hướng `/r/[shortCode]` Bị Chặn Cookie Khi Click Từ Mạng Xã Hội
- **Vị trí chính xác:**
  - Tuyến đường: `web/src/app/r/[shortCode]/page.tsx`
  - File mã nguồn:
    - [web/src/app/r/[shortCode]/page.tsx](file:///e:/HuKi/web/src/app/r/[shortCode]/page.tsx)
    - [web/src/ui/api/checkoutApi.ts](file:///e:/HuKi/web/src/ui/api/checkoutApi.ts)
- **Nút bấm / Thao tác:**
  - Người mua bấm vào link tiếp thị chia sẻ trên Facebook, TikTok, Zalo, YouTube.
- **Hiện tượng lỗi ban đầu:**
  - Trình duyệt nhúng (In-App Browser) chặn cookie bên thứ ba nếu thiếu cấu hình `SameSite=Lax` và cờ `Secure`, dẫn đến khi khách thanh toán đơn hàng thì mất dấu mã tiếp thị.
- **Nguyên nhân gốc rễ:**
  - Chỉ ghi nhận một trường `huki_aff_click` mà không ghi `huki_aff_code`, thiếu dự phòng đa tầng cho các trình duyệt hạn chế cookie.
- **Giải pháp dứt khoát đã triển khai:**
  1. Ghi nhận cả cookie `huki_aff_click` (token) và `huki_aff_code` (mã giới thiệu) với đầy đủ `path=/; max-age=...; SameSite=Lax` kèm cờ `; Secure` trên giao thức HTTPS.
  2. Ghi nhận dự phòng song song vào `localStorage` (`huki_aff_click` và `huki_aff_code`).
  3. Cập nhật `checkoutApi.ts` để đọc đối soát cả 2 khóa từ cookie lẫn `localStorage` trước khi gửi đơn hàng lên máy chủ.

---

### [AF-005] Nút Phân Trang Next / Previous Trong Marketplace Không Disable Đúng Khi Đang Tải
- **Vị trí chính xác:**
  - Màn hình: Chợ chiến dịch hoa hồng (`/account/affiliate/marketplace`)
  - File mã nguồn: [web/src/app/account/affiliate/marketplace/page.tsx](file:///e:/HuKi/web/src/app/account/affiliate/marketplace/page.tsx)
- **Nút bấm / Thao tác:**
  - Nút: `"Trang trước"` và `"Trang sau"`.
- **Hiện tượng lỗi ban đầu:**
  - Người dùng bấm liên tục nút "Trang sau" khi mạng chậm, các request gối đầu nhau gây lệch số trang; đồng thời khi disabled con trỏ chuột vẫn hiển thị `cursor: pointer`.
- **Nguyên nhân gốc rễ:**
  - Thuộc tính `disabled` chỉ kiểm tra `page <= 1` hoặc `page >= totalPages` mà không kết hợp cờ `loading`, CSS thiếu `disabled:cursor-not-allowed disabled:pointer-events-none`.
- **Giải pháp dứt khoát đã triển khai:**
  - Cập nhật điều kiện: `disabled={loading || page <= 1}` và `disabled={loading || page >= totalPages}`.
  - Bổ sung class: `disabled:cursor-not-allowed disabled:pointer-events-none` triệt tiêu hoàn toàn sự kiện click thừa.

---

### [AF-006] Nút "Xác Nhận Rút Tiền" Bị Lỗi Double Submit Gây Trùng Lặp Giao Dịch
- **Vị trí chính xác:**
  - Màn hình: Bảng điều khiển đối tác (`/account/affiliate/dashboard`)
  - File mã nguồn:
    - [web/src/ui/components/affiliate/AffiliatePayoutModal.tsx](file:///e:/HuKi/web/src/ui/components/affiliate/AffiliatePayoutModal.tsx)
    - [web/src/app/account/affiliate/dashboard/page.tsx](file:///e:/HuKi/web/src/app/account/affiliate/dashboard/page.tsx)
    - [web/src/lib/affiliate/affiliateApi.ts](file:///e:/HuKi/web/src/lib/affiliate/affiliateApi.ts)
- **Nút bấm / Thao tác:**
  - Nút: `"Xác Nhận Rút Tiền"` trong modal rút hoa hồng khả dụng.
- **Hiện tượng lỗi ban đầu:**
  - Thiếu modal rút tiền trực tiếp trên giao diện Dashboard CTV; nếu click liên tiếp sẽ tạo nhiều yêu cầu payout trùng lặp.
- **Nguyên nhân gốc rễ:**
  - Chưa tích hợp `AffiliatePayoutModal` kết nối tới endpoint backend `POST /affiliate/payouts` và thiếu khóa trạng thái `isSubmitting`.
- **Giải pháp dứt khoát đã triển khai:**
  1. Xây dựng component `AffiliatePayoutModal.tsx` hoàn chỉnh:
     - Kiểm tra hạn mức rút: tối thiểu 100.000đ, tối đa 50.000.000đ hoặc toàn bộ hoa hồng khả dụng.
     - Tự động tính khấu trừ thuế TNCN (10% đối với khoản rút từ 2.000.000đ trở lên).
     - Hiển thị thông tin ngân hàng thụ hưởng đã xác thực qua KYC.
  2. Bổ sung cơ chế bảo vệ giao dịch:
     - Khóa ngay nút bấm với `disabled={isSubmitting || ...}` kèm trạng thái loading spinner.
     - Sinh mã `idempotencyKey` ngẫu nhiên duy nhất cho mỗi phiên gửi lệnh rút, tương thích với ràng buộc `profileId_idempotencyKey` của cơ sở dữ liệu backend.
  3. Gắn nút `"Rút Hoa Hồng"` tại Header và thẻ KPI `"Hoa hồng khả dụng"` trên Bảng điều khiển đối tác.
