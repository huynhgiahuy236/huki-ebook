# QUY TRÌNH UI/UX & RESPONSIVE CỔNG BƯU TÁ (SHIPPER PORTAL)

> **Phân hệ:** Cổng Dành Cho Tài Xế & Bưu Tá Giao Vận (Shipper / Delivery Partner).  
> **Nguyên tắc cốt lõi:** Thiết kế ưu tiên 100% cho điện thoại di động (Mobile-First Ergonomics), tương tác thuận tiện bằng 1 tay khi đi ngoài đường (One-Hand Usage), độ tương phản cao chống chói nắng, nút bấm thao tác nhanh gọn (Gọi điện 1 chạm, Mở bản đồ 1 chạm, Chụp ảnh POD ký nhận 1 chạm).

---

## 1. Danh Sách URL Phân Hệ Shipper

```
1. Đăng nhập bưu tá               : /shipper/login
2. Kho đơn có thể nhận            : /shipper/available-orders
3. Danh sách đơn đang giao (Runsheet): /shipper/active-deliveries
4. Lịch sử các cuốc giao          : /shipper/history
5. Đơn hoàn trả (Lấy từ khách)    : /shipper/returns
6. Nộp tiền COD về nền tảng       : /shipper/remit-cod, /shipper/wallet/remit
7. Ví ký quỹ & Thu nhập bưu tá    : /shipper/wallet
8. Thông tin cá nhân & Tuyến xe   : /shipper/profile
```

---

## 2. Đặc Tả Chi Tiết Từng URL & Quy Chuẩn Mobile-First

### 2.1. URL: `/shipper/login` (Đăng Nhập Nhanh Bằng Số Điện Thoại & OTP/Mã PIN)
* **Mục tiêu:** Bưu tá đăng nhập nhanh trên điện thoại trong 5 giây mà không cần gõ mật khẩu phức tạp.
* **Quy chuẩn UX:**
  - Bàn phím số tự kích hoạt (`input type="tel"`).
  - Nhập 4 số PIN hoặc 6 số OTP tự động chuyển tiếp giữa các ô (`auto-focus next input`).
  - Nút *"Đăng nhập"* to vừa vặn ngón cái (`h-11 w-full bg-[#003B2B] text-white font-semibold rounded-xl text-sm`).

---

### 2.2. URL: `/shipper/active-deliveries` (Lộ Trình Đang Giao - Runsheet)
* **Mục tiêu:** Màn hình chính tài xế sử dụng suốt cả ngày: Xem danh sách các gói hàng cần phát theo thứ tự tối ưu quãng đường, gọi điện cho người nhận, chụp ảnh ký nhận thành công hoặc báo giao thất bại.
* **Lỗi AI cần loại bỏ:**
  - ❌ Các hình hoạt họa bưu tá lái xe máy đồ chơi chiếm diện tích.
  - ❌ Bảng chữ nhỏ li ti khiến tài xế đi ngoài nắng không nhìn rõ.
* **Quy chuẩn Responsive & Ergonomics:**
  * **Thanh Trạng Thái Trên Cùng (Top Status Banner):**
    - `bg-slate-900 text-white p-3 rounded-b-2xl flex items-center justify-between text-xs`:
      - Số đơn còn lại: `Đang giao: 8 đơn`
      - Tiền COD cần thu: `1.850.000 đ`
      - Nút chuyển trạng thái nhanh: `[ Đang trực tuyến (Sẵn sàng nhận đơn) ]`
  * **Thẻ Kiện Hàng Đang Giao (Delivery Parcel Card):**
    - Chiều rộng `w-full bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 p-3.5 mb-2.5 shadow-xs`.
    - **Hàng 1:** Số thứ tự đơn `#1` (vòng tròn xanh ngọc), Mã vận đơn `#HUK-SHIP-4921`, Tiền COD nổi bật: `Thu tiền: 235.000 đ` (chữ đỏ đậm nếu có COD, xanh lá nếu đã thanh toán online).
    - **Hàng 2:** Tên người nhận và địa chỉ đầy đủ (font đậm `text-xs leading-snug`).
    - **Hàng 3 - Cụm nút thao tác 1 tay (Quick Action Row):**
      - Nút **Gọi điện** (`h-9 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg flex items-center gap-1 text-xs font-semibold`): Bấm một chạm gọi thẳng qua số điện thoại khách hàng.
      - Nút **Bản đồ** (`h-9 px-3 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg flex items-center gap-1 text-xs font-semibold`): Mở Google Maps điều hướng thẳng tới tọa độ nhà khách.
      - Nút **Giao hàng** (`h-9 px-4 bg-[#003B2B] text-white rounded-lg flex items-center gap-1 text-xs font-semibold flex-1 justify-center`): Mở cửa sổ xác nhận giao thành công.

---

### 2.3. Modal: Chụp Ảnh Xác Thực Giao Hàng (Proof of Delivery - POD Modal)
* **Mục tiêu:** Ghi lại bằng chứng đã giao hàng hợp lệ (chụp ảnh kiện hàng đặt tại cửa hoặc khách nhận, ký tên trên màn hình cảm ứng).
* **Quy chuẩn UX:**
  - Cửa sổ Bottom Sheet trượt từ dưới lên chiếm 85% màn hình:
    - **Khung chụp ảnh trực tiếp:** Tích hợp camera điện thoại, hiển thị khung căn chỉnh ảnh kiện hàng và nhãn bưu tá.
    - **Khung chữ ký số (Signature Canvas):** Vùng cảm ứng `h-32 border border-dashed border-slate-300 rounded-lg bg-slate-50` cho phép khách hàng ký tên bằng ngón tay.
    - **Xác nhận số tiền COD đã thu:** Ô kiểm tra số tiền khớp với thực tế khách đưa.
    - Nút bấm *"Xác nhận giao thành công"* (`h-11 w-full bg-emerald-600 text-white font-bold rounded-xl text-sm shadow-md`).

---

### 2.4. URL: `/shipper/remit-cod` & `/shipper/wallet` (Quản Lý Tiền Thu Hộ & Nộp Tiền)
* **Mục tiêu:** Tài xế kiểm tra tổng số tiền COD mặt đã thu trong ca làm việc và thực hiện nộp tiền về tài khoản ngân hàng của HuKi để giải tỏa hạn mức ví bưu tá.
* **Quy chuẩn UX:**
  - Hạn mức ký quỹ bưu tá: `Tiền COD đang giữ: 3.200.000 đ / Hạn mức tối đa: 5.000.000 đ`.
  - Thanh cảnh báo tiến độ: Nếu vượt 80% hạn mức, hiển thị nhắc nhở nộp tiền màu vàng cam.
  - Hướng dẫn nộp tiền: Hiển thị mã QR ngân hàng động (VietQR) chứa sẵn số tiền cần nộp và nội dung chuyển khoản chuẩn `HUKICOD [Mã bưu tá]`.
  - Nút tải lên biên lai chuyển khoản (ảnh chụp sao kê ngân hàng).

