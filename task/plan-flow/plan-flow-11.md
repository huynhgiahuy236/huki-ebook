# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 11
## TÍNH PHÍ VẬN CHUYỂN ĐỘNG THEO ĐỊA CHỈ 3 CẤP & TRỌNG LƯỢNG (DYNAMIC SHIPPING FEE CALCULATION: 3-TIER ADDRESS & GRAM WEIGHT)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng module tính cước vận chuyển động (Dynamic Shipping Fee Calculation) có khả năng tự động phân vùng định tuyến (Nội tỉnh, Nội miền, Liên miền) dựa trên dữ liệu địa giới 3 cấp hành chính Việt Nam, tự động tổng hợp trọng lượng kiện hàng sách in và tính toán biểu phí lũy tiến theo từng nấc $500\text{g}$, đồng thời hỗ trợ miễn phí vận chuyển $0đ$ cho ấn bản số Ebook.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `shipping-service`: Module `ShippingModule`, `ShippingCalculatorService`, `ShippingRateService`.
    * `location-service` / Location Data: Danh mục 63 Tỉnh/Thành phố, Quận/Huyện, Phường/Xã chuẩn Tổng Cục Thống Kê kèm phân vùng 3 miền (Bắc, Trung, Nam).
    * Prisma Schema: Bảng `addresses`, `shipping_rate_zones`.
  * **Frontend (Storefront & User Profile)**:
    * `web/src/ui/components/address/AddressSelectorModal.jsx`: Bộ chọn địa chỉ 3 cấp mượt mà với 3 dropdown liên hoàn.
    * `web/src/ui/pages/checkout/CheckoutPage.jsx`: Tích hợp tính phí tự động khi đổi địa chỉ và hiển thị các gói giao hàng (Tiêu chuẩn / Hỏa tốc).
    * `web/src/ui/pages/user/UserAddressesPage.jsx`: Quản lý sổ địa chỉ giao hàng của người dùng.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 11
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  LOCATION REGISTRY &    SHIPPING ENGINE &      FRONTEND UI &    TESTING SUITE &
DATA MODEL       ZONE CLASSIFIER        BACKEND APIS           CHECKOUT SYNC    ACCURACY AUDIT
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA ĐỊA CHỈ & BIỂU CƯỚC

### 📌 Mục tiêu:
Thiết lập cấu trúc bảng lưu trữ sổ địa chỉ người dùng và bảng ma trận biểu phí vận chuyển chuẩn theo vùng trên PostgreSQL.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `addresses` (Sổ Địa Chỉ 3 Cấp)**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `user_id`: UUID, FK `users`.
    * `recipient_name`: String (Họ tên người nhận).
    * `phone_number`: String (Số điện thoại 10 số).
    * `province_id`: String, `province_name`: String.
    * `district_id`: String, `district_name`: String.
    * `ward_id`: String, `ward_name`: String.
    * `street_address`: String (Số nhà, tên đường).
    * `is_default`: Boolean (Mặc định: false).
    * `created_at`, `updated_at`.

* **Task 1.2: Thiết kế Bảng `shipping_rate_zones` (Ma Trận Biểu Phí)**
  * Định nghĩa bảng biểu phí:
    * `id`: UUID, Primary Key.
    * `zone_type`: Enum (`INTRA_PROVINCE`, `INTRA_REGION`, `INTER_REGION`).
    * `base_weight_grams`: Int (Mặc định: 500).
    * `base_fee`: Decimal (VD: 16.500đ, 24.000đ, 32.000đ).
    * `step_weight_grams`: Int (Mặc định: 500).
    * `step_fee`: Decimal (VD: 3.000đ, 5.000đ, 8.000đ).
    * `estimated_delivery_days`: String (VD: "1-2 ngày", "2-3 ngày", "3-5 ngày").

---

## PHẦN 2: XÂY DỰNG DỮ LIỆU ĐỊA GIỚI & BỘ PHÂN LOẠI VÙNG (ZONE CLASSIFIER)

### 📌 Mục tiêu:
Chuẩn hóa danh mục hành chính 63 Tỉnh/Thành phố và phát triển hàm phân loại tuyến vận chuyển tự động.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Nạp Dữ Liệu Địa Giới Hành Chính Chuẩn (Vietnamese Administrative Divisions)**
  * Tích hợp tệp dữ liệu JSON chuẩn hóa gồm:
    * Danh sách 63 Tỉnh/Thành phố phân theo 3 miền:
      * **Miền Bắc**: Hà Nội, Hải Phòng, Quảng Ninh, Bắc Ninh...
      * **Miền Trung**: Đà Nẵng, Thừa Thiên Huế, Quảng Nam, Khánh Hòa...
      * **Miền Nam**: TP. Hồ Chí Minh, Bình Dương, Cần Thơ, Đồng Nai...
    * Toàn bộ danh mục Quận/Huyện và Phường/Xã tương ứng.

* **Task 2.2: Triển khai Module Phân Tuyến `ZoneClassifier`**
  * Hàm `classifyZone(originProvinceId, destProvinceId)`:
    * Nếu `originProvinceId === destProvinceId` $\rightarrow$ Trả về `INTRA_PROVINCE`.
    * Nếu `getRegion(origin) === getRegion(dest)` $\rightarrow$ Trả về `INTRA_REGION`.
    * Nếu khác vùng miền $\rightarrow$ Trả về `INTER_REGION`.

---

## PHẦN 3: PHÁT TRIỂN ENGINE TÍNH CƯỚC LŨY TIẾN & BACKEND APIS

### 📌 Mục tiêu:
Xây dựng thuật toán tính cước vận chuyển chuẩn xác và cung cấp API tính phí thời gian thực cho quy trình Checkout.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Triển khai Thuật toán Tính Cước `ShippingCalculatorService`**
  * Hàm `calculatePackageShippingFee(warehouseAddress, recipientAddress, items)`:
    * Bước 1: Tính tổng khối lượng sách in $\text{BookWeight} = \sum (\text{weight\_in\_grams} \times \text{qty})$.
    * Bước 2: Nếu $\text{BookWeight} == 0$ (Đơn hàng chỉ có Ebook) $\rightarrow$ Trả về `fee = 0`, `estimatedDays = "Mở khóa ngay"`.
    * Bước 3: Cộng phụ phí bao bì đóng gói chuẩn: $\text{TotalWeight} = \text{BookWeight} + 50\text{g}$.
    * Bước 4: Gọi `ZoneClassifier` xác định tuyến $\rightarrow$ Lấy biểu phí từ `shipping_rate_zones`.
    * Bước 5: Tính toán:
      $$\text{ExtraUnits} = \max\left(0, \left\lceil \frac{\text{TotalWeight} - 500}{500} \right\rceil\right)$$
      $$\text{Fee} = \text{BaseFee} + (\text{ExtraUnits} \times \text{StepFee})$$
    * Bước 6: Trả về kết quả gồm: Đơn vị vận chuyển, Chi phí cước và Thời gian giao hàng dự kiến.

* **Task 3.2: Xây dựng Bộ API Vận Chuyển Chuẩn RESTful**
  * `POST /api/v1/shipping/calculate-fee`: Nhận danh sách sản phẩm và `addressId`, trả về cước phí chi tiết từng kiện hàng của từng Shop.
  * `GET /api/v1/shipping/addresses`: Lấy danh sách địa chỉ nhận hàng của người dùng.
  * `POST /api/v1/shipping/addresses`: Thêm mới địa chỉ nhận hàng.
  * `PATCH /api/v1/shipping/addresses/:id/set-default`: Đặt làm địa chỉ mặc định.

---

## PHẦN 4: GIAO DIỆN BỘ CHỌN ĐỊA CHỈ 3 CẤP & TÍCH HỢP CHECKOUT

### 📌 Mục tiêu:
Xây dựng giao diện chọn địa chỉ tiện dụng cho độc giả và cập nhật cước phí vận chuyển tức thì khi thay đổi địa chỉ nhận hàng.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Xây dựng Component Bộ Chọn Địa Chỉ ([`AddressSelectorModal.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/components/address/AddressSelectorModal.jsx))**
  * Form gồm 3 dropdown liên kết dữ liệu động:
    * Dropdown 1: Tỉnh / Thành phố.
    * Dropdown 2: Quận / Huyện (Tự động nạp danh sách theo Tỉnh).
    * Dropdown 3: Phường / Xã (Tự động nạp danh sách theo Quận).
  * Ô nhập: Họ tên, Số điện thoại và Địa chỉ chi tiết (Số nhà/đường).
  * Checkbox: "Đặt làm địa chỉ mặc định".

* **Task 4.2: Tích hợp Tính Cước Tự Động Trên Trang Checkout (`CheckoutPage.jsx`)**
  * Hiển thị khối **Địa Chỉ Nhận Hàng**:
    * Hiển thị Tên người nhận, SĐT, Địa chỉ đầy đủ 3 cấp, Nút "Thay đổi".
  * Mỗi khi người dùng đổi địa chỉ hoặc thay đổi số lượng sách trong giỏ:
    * Tự động gọi API tính lại cước phí vận chuyển với hiệu ứng Loading nhẹ.
    * Cập nhật ngay lập tức dòng "Phí vận chuyển" và "Tổng thanh toán" mà không cần tải lại trang.

---

## PHẦN 5: KIỂM THỬ TOÀN TRÌNH & ĐÁNH GIÁ ĐỘ CHÍNH XÁC CƯỚC PHÍ (TEST SUITE)

### 📌 Mục tiêu:
Xác thực độ chính xác 100% của thuật toán tính cước trên toàn bộ ma trận vùng và trọng lượng.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit Test Thuật Toán Phân Vùng & Tính Cước**
  * Test Case Nội Tỉnh $\le 500\text{g}$ &rarr; Xác nhận đúng 16.500đ.
  * Test Case Nội Miền & Liên Miền có trọng lượng lũy tiến ($1.200\text{g}, 1.850\text{g}$) &rarr; Xác nhận đúng công thức làm tròn nấc $500\text{g}$.
  * Test Case Đơn hàng Ebook &rarr; Xác nhận phí ship $= 0đ$.

* **Task 5.2: Integration Test Thay Đổi Địa Chỉ Trên Giao Diện**
  * Thao tác đổi địa chỉ từ Hà Nội sang TP.HCM &rarr; Xác nhận cước phí cập nhật từ 16.500đ lên 32.000đ ngoài giao diện Checkout.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `addresses`, `shipping_rate_zones` | ⏳ Sẵn sàng | Backend Team |
| **Location Data**| Dữ liệu chuẩn 63 Tỉnh/Thành phân theo 3 Miền | ⏳ Sẵn sàng | Backend Team |
| **Shipping Engine**| Thuật toán phân vùng và tính cước lũy tiến $500\text{g}$ | ⏳ Sẵn sàng | Backend Team |
| **Backend APIs** | API Tính cước động và CRUD Sổ địa chỉ 3 cấp | ⏳ Sẵn sàng | Backend Team |
| **Frontend UI** | Giao diện `AddressSelectorModal.jsx` & Tích hợp Checkout Page | ⏳ Sẵn sàng | Frontend Team |
| **Accuracy Audit**| Vượt qua 100% Ma trận kiểm thử 6 kịch bản (TC_SHIP_01 đến TC_SHIP_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 11 thuộc Nền tảng Sách Huki Ebook.*
