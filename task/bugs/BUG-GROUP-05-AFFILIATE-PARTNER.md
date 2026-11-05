# Báo Cáo Kiểm Thử & Danh Sách Lỗi: Nhóm Tiếp Thị Liên Kết (Affiliate & Content Creator Ecosystem)

> **Mã phân hệ:** `BUG-GROUP-05`  
> **Đối tượng người dùng:** Người làm tiếp thị liên kết (Affiliate Marketer), KOC/KOL Reviewer sách, Các nhà sáng tạo nội dung cộng đồng.  
> **Phạm vi kiểm thử:** Toàn bộ 9 màn hình phân hệ Affiliate (`/account/affiliate/*`, `/affiliate/*`, `/r/*`), gồm quy trình đăng ký đối tác, tạo link rút gọn, gắn mã tracking cookie, chợ chiến dịch hoa hồng, thống kê chuyển đổi và rút hoa hồng.  
> **Nguyên tắc kỹ thuật:** Bám sát mô hình tiếp thị đa kênh, bảo vệ tính toàn vẹn của mã tracking, loại bỏ hoàn toàn URL hardcode localhost, giải pháp kỹ thuật duy nhất.

---

## BẢNG TỔNG HỢP CÁC LỖI TRÊN TỪNG NÚT BẤM & TỪNG MÀN HÌNH (AFFILIATE PARTNER)

| Mã Lỗi | Màn Hình / Route | Nút Bấm / Thành Phần Tương Tác | Phân Loại | Mức Độ | Trạng Thái Kiểm Thử |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **AF-001** | Tạo link & Nộp hồ sơ (`/account/affiliate/application`) | Nút **"Tạo Link Chia Sẻ"** & **"Sao Chép"** | Cấu Hình / URL | **P0 (Blocker)** | ❌ **FAIL** (Hardcode link `http://localhost:3100` trên UAT/Prod) |
| **AF-002** | Chợ chiến dịch (`/account/affiliate/marketplace`) | Nút **"Lấy Link Tiếp Thị Ngay"** | Cấu Hình / URL | **P0 (Blocker)** | ❌ **FAIL** (Hardcode link `http://localhost:3100` thay vì domain thật) |
| **AF-003** | Đăng ký đối tác (`/account/affiliate/application`) | Nút **"Đăng Nhập Ngay"** (Guest State) | Điều Hướng / Auth | **P1 (Critical)** | ❌ **FAIL** (Gãy link `/login` $\rightarrow$ 404) |
| **AF-004** | Chuyển hướng link (`/r/[shortCode]`) | Xử lý Cookie **Mã Giới Thiệu (Attribution)** | Bảo Mật / Cookie | **P0 (Blocker)** | ❌ **FAIL** (Cookie thiếu `SameSite=Lax` bị chặn khi click từ Facebook/TikTok) |
| **AF-005** | Chợ chiến dịch (`/account/affiliate/marketplace`) | Nút phân trang **Next / Previous** | Logic / Điều Hướng | **P2 (Major)** | ❌ **FAIL** (Lỗi cú pháp so sánh làm mất trạng thái disabled trang cuối) |
| **AF-006** | Yêu cầu rút hoa hồng (`/account/affiliate/dashboard`) | Nút **"Xác Nhận Rút Tiền"** | Form & Validation | **P1 (Critical)** | ❌ **FAIL** (Cho phép bấm submit liên tục gây duplicate transaction) |

---

## CHI TIẾT KỸ THUẬT TỪNG LỖI CỤ THỂ

---

### [AF-001] Nút "Tạo Link Chia Sẻ" Hardcode Địa Chỉ `http://localhost:3100`
- **Vị trí chính xác:**
  - Màn hình: Hồ sơ tiếp thị liên kết (`http://localhost:3100/account/affiliate/application`)
  - File mã nguồn: [web/src/app/account/affiliate/application/page.tsx](file:///e:/HuKi/web/src/app/account/affiliate/application/page.tsx#L190-L239)
- **Nút bấm / Thao tác:**
  - Nút: `"Tạo link tiếp thị"` và nút `"Sao chép liên kết"`.
  - Đoạn code:
    ```tsx
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3100';
    ```
- **Hiện tượng lỗi:**
  - Khi triển khai trên môi trường UAT (`https://huki-uat.duckdns.org`) hoặc Production, trong quá trình Server-Side Rendering (SSR) hoặc hydration, hệ thống tự động sinh link fallback:
    `http://localhost:3100/r/ABC123XYZ`.
  - Affiliate copy link này gửi lên mạng xã hội, người theo dõi bấm vào link lập tức bị lỗi trình duyệt không tìm thấy máy chủ cục bộ (`ERR_CONNECTION_REFUSED`). Chiến dịch tiếp thị bị tê liệt hoàn toàn.
- **Nguyên nhân gốc rễ:**
  - Lập trình viên hardcode chuỗi `http://localhost:3100` làm giá trị mặc định thay vì đọc biến môi trường `process.env.NEXT_PUBLIC_SITE_URL`.
- **Giải pháp dứt khoát duy nhất:**
  - Thay đổi toàn bộ các vị trí sinh URL tiếp thị:
    ```tsx
    const origin = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_SITE_URL || 'https://huki-uat.duckdns.org');
    ```

---

### [AF-002] Nút "Lấy Link Tiếp Thị Ngay" Trong Marketplace Bị Hardcode Localhost Tương Tự
- **Vị trí chính xác:**
  - Màn hình: Chợ chiến dịch hoa hồng sách (`http://localhost:3100/account/affiliate/marketplace`)
  - File mã nguồn: [web/src/app/account/affiliate/marketplace/page.tsx](file:///e:/HuKi/web/src/app/account/affiliate/marketplace/page.tsx#L111)
- **Nút bấm / Thao tác:**
  - Nút: Bấm icon link `"Lấy liên kết chiến dịch"` trên từng card sách trong danh sách hoa hồng 15% - 20%.
- **Hiện tượng lỗi:**
  - Popup hiện ra link tiếp thị dạng `http://localhost:3100/r/...`.
- **Giải pháp dứt khoát duy nhất:**
  - Sử dụng chung hàm tiện ích chuẩn `generateAffiliateUrl(shortCode)` sử dụng `NEXT_PUBLIC_SITE_URL`.

---

### [AF-003] Link Chuyển Hướng `/r/[shortCode]` Bị Chặn Cookie Khi Click Từ Mạng Xã Hội
- **Vị trí chính xác:**
  - Tuyến đường: `web/src/app/r/[shortCode]/page.tsx`
  - File mã nguồn: `platform/apps/commerce-service/src/modules/affiliate/affiliate.controller.ts`
- **Nút bấm / Thao tác:**
  - Thao tác: Khách hàng click vào link tiếp thị từ bài post trên Facebook, TikTok hoặc Zalo.
- **Hiện tượng lỗi:**
  - Trình duyệt nhúng (In-App Browser) của Facebook/TikTok mở trang chi tiết sách, nhưng Cookie ghi nhận mã tiếp thị `huki_aff_code` không được lưu trữ. Khi khách hàng bấm "Mua ngay", đơn hàng hoàn toàn không được tính hoa hồng cho đối tác affiliate.
- **Nguyên nhân gốc rễ:**
  - Header `Set-Cookie` khi xử lý redirect thiếu thuộc tính `SameSite=Lax` và `Secure`, khiến các trình duyệt hiện đại chặn ghi cookie của bên thứ ba trong luồng chuyển tiếp cross-site.
- **Giải pháp dứt khoát duy nhất:**
  - Cấu hình cookie tracking: `Set-Cookie: huki_aff_code=...; Path=/; Max-Age=2592000; SameSite=Lax; Secure`. Đồng thời lưu mã affiliate vào `localStorage` ở phía frontend làm phương án dự phòng an toàn.

