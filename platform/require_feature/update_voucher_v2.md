# ĐẶC TẢ NGHIỆP VỤ & KẾ HOẠCH TRIỂN KHAI: HỆ THỐNG TÍNH GIÁ & ÁP DỤNG VOUCHER ĐA TẦNG V2

> **Tài liệu quy chuẩn kỹ thuật và kế hoạch thực hiện phân hệ Checkout & Voucher V2**  
> **Dự án:** HUKI EBOOK Platform  
> **Vị trí tài liệu:** `platform/require_feature/update_voucher_v2.md`  
> **Trạng thái:** Quy chuẩn nghiệp vụ & Kế hoạch thực thi (Normative Specification & Action Plan)  
> **Mục tiêu:** Xử lý chuẩn xác 100% việc áp dụng voucher cho cả 2 trường hợp: **Nhiều sản phẩm cùng 1 Shop** và **Nhiều sản phẩm từ Nhiều Shop khác nhau** theo mô hình 3 tầng phân cấp (Shopee-Style), đảm bảo đồng bộ Frontend và Backend, không lệch dòng tiền ví Seller.

---

## I. TỔNG QUAN YÊU CẦU NGHIỆP VỤ (BUSINESS SPECIFICATION)

### 1. Nguyên Tắc Cốt Lõi Về 3 Tầng Giảm Giá (3-Tier Discount Model)
Hệ thống tính toán thanh toán của HUKI tuân thủ nghiêm ngặt mô hình phân tầng độc lập từ dưới lên:

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                GIỎ HÀNG THANH TOÁN                                │
└───────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│  TẦNG 1: VOUCHER TỪNG CỬA HÀNG (SHOP VOUCHERS)                                    │
│  - Xét điều kiện riêng trên tổng tiền hàng của từng Shop                          │
│  - Áp dụng giảm giá độc lập cho từng Shop (trừ trực tiếp vào doanh thu của Shop)  │
│  - Tiền hàng còn lại của Shop = max(0, Subtotal_Shop - Voucher_Shop)              │
└───────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│  TẦNG 2: VOUCHER TOÀN SÀN / THANH TOÁN (HUKI PLATFORM VOUCHERS)                  │
│  - Tổng tiền hàng đủ điều kiện = Tổng tiền còn lại của tất cả các Shop sau Tầng 1  │
│  - Xét điều kiện đơn tối thiểu của Voucher Sàn trên tổng tiền hàng này             │
│  - Phân bổ số tiền giảm sàn theo tỷ lệ giá trị của từng shop                      │
└───────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│  TẦNG 3: PHÍ VẬN CHUYỂN & MÃ FREESHIP (SHIPPING & FREESHIP VOUCHERS)              │
│  - Tính phí ship riêng cho các kiện hàng vật lý của từng Shop                     │
│  - Áp dụng mã giảm phí vận chuyển (Freeship) vào tổng phí ship                    │
└───────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│  TỔNG THANH TOÁN = Tiền hàng sau Voucher Tầng 1 & 2 + Phí Ship sau Freeship Tầng 3 │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2. Chi Tiết Hai Trường Hợp Thanh Toán Cụ Thể

#### 🟢 TRƯỜNG HỢP 1: Mua từ 2 sản phẩm trở lên của CÙNG 1 CỬA HÀNG
1. **Gom nhóm sản phẩm (Store Grouping):**
   - Tất cả các sản phẩm thuộc cùng 1 gian hàng được tự động gộp chung vào 1 nhóm đại diện duy nhất.
   - Tổng tiền hàng của gian hàng ($\text{StoreSubtotal}$) là tổng giá trị của toàn bộ các sản phẩm đó trong giỏ:
     $$\text{StoreSubtotal} = \sum_{i=1}^{n} (\text{Price}_i \times \text{Quantity}_i)$$
2. **Xét điều kiện Voucher Shop:**
   - Hệ thống so sánh $\text{StoreSubtotal}$ với $\text{minOrderAmount}$ của voucher.
   - Nếu $\text{StoreSubtotal} \ge \text{minOrderAmount} \implies$ **Đủ điều kiện áp dụng**.
3. **Ví dụ thực tế:**
   - Khách mua tại **Shop A**: Sách 1 giá $60.000đ$, Sách 2 giá $50.000đ$.
   - Tổng tiền hàng Shop A = $110.000đ$.
   - Shop A có Voucher `SHOP10K` (Giảm $10.000đ$ cho đơn từ $100.000đ$).
   - $\rightarrow 110.000đ \ge 100.000đ \implies$ Áp dụng thành công, giảm $10.000đ$. Tiền hàng Shop A còn $100.000đ$.

---

#### 🟢 TRƯỜNG HỢP 2: Mua nhiều sản phẩm từ NHIỀU CỬA HÀNG KHÁC NHAU
1. **Ví dụ kịch bản:**
   - **Shop A:** Mua Sách A giá $150.000đ$. Shop A có Voucher: Giảm $20.000đ$ cho đơn từ $100.000đ$.
   - **Shop B:** Mua Sách B giá $250.000đ$. Shop B có Voucher: Giảm $30.000đ$ cho đơn từ $200.000đ$.
2. **Quy trình xử lý tuần tự qua 3 tầng:**
   - **Bước 1 (Xét Tầng Shop độc lập):**
     - Shop A: $150.000đ \ge 100.000đ \implies$ Giảm $20.000đ$. Tiền còn lại Shop A = $130.000đ$.
     - Shop B: $250.000đ \ge 200.000đ \implies$ Giảm $30.000đ$. Tiền còn lại Shop B = $220.000đ$.
   - **Bước 2 (Tổng tiền hàng sau khi trừ voucher từng shop):**
     $$\text{Tổng tiền hàng Tầng 1} = 130.000đ + 220.000đ = 350.000đ$$
   - **Bước 3 (Xét Voucher Sàn / Phương thức thanh toán):**
     - Sàn có Voucher `HUKIPLAT20` giảm $20.000đ$ cho tổng đơn từ $300.000đ$.
     - Xét: $350.000đ \ge 300.000đ \implies$ Đạt điều kiện. Giảm thêm $20.000đ$.
     - Tổng tiền hàng thực thu của cả đơn = $350.000đ - 20.000đ = 330.000đ$.
   - **Bước 4 (Phí Vận Chuyển & Freeship):**
     - Tính phí ship cho từng kiện hàng từ kho Shop A và Shop B.
     - Áp dụng mã Freeship trừ trực tiếp vào tổng phí vận chuyển.
3. **Nguyên tắc phân bổ tài chính về Ví Seller:**
   - **Shop A:** Tự chịu khoản giảm $20.000đ$ do chính mình phát hành.
   - **Shop B:** Tự chịu khoản giảm $30.000đ$ do chính mình phát hành.
   - **Phần giảm $20.000đ$ của Sàn:** Do Sàn HUKI chi trả/tài trợ, phân bổ theo tỷ lệ tiền hàng của từng Shop và **không** làm giảm tiền thực nhận của Seller.

---

## II. ĐỀ XUẤT KIẾN TRÚC & GIẢI PHÁP KỸ THUẬT (TECHNICAL PROPOSAL)

### 1. Phía Frontend (`web/src/app/checkout/page.tsx` & `CartContext.tsx`)

#### A. Chuẩn hóa định danh Store (`Canonical Store ID Resolution`)
* **Thực trạng cũ:** Đưa tất cả `storeId`, `businessId`, `book.storeId` vào `Set` khiến `activeStoreIds` bị phình to ảo (1 shop bị đếm thành 2 shop).
* **Giải pháp:**
  - Viết hàm quy chuẩn `getCanonicalStoreId(item)`: Thống nhất lấy ID đại diện chuẩn của Gian Hàng (`item.storeId || item.book?.storeId || item.businessId`).
  - Phân nhóm `checkedItems` theo từng Cửa hàng đại diện. Mỗi Cửa hàng là một khối rõ ràng với danh sách sách, tổng tiền phụ (`storeSubtotal`), và nút chọn voucher của riêng shop đó.

#### B. Cơ chế xác thực Voucher Shop linh hoạt (`handleApplyManualCode` & Drawer)
* Khi người dùng nhập mã thủ công:
  - Nếu giỏ hàng chỉ có **1 Cửa hàng duy nhất** $\rightarrow$ Tự động truyền đúng `storeId` của cửa hàng đó lên API `validateVoucher`.
  - Nếu giỏ hàng có **Nhiều Cửa hàng khác nhau** $\rightarrow$ Hệ thống tự động so khớp mã với từng Cửa hàng hiện diện trong giỏ hàng để gán mã vào đúng shop phát hành.
* Khi người dùng chọn từ Drawer:
  - Lưu vào `appliedStoreVouchers[canonicalStoreId]` theo đúng chuẩn mã cửa hàng.
  - Đảm bảo `storeSubtotal` gom đủ 100% tất cả các sản phẩm của shop đó để tính đúng điều kiện tối thiểu.

---

### 2. Phía Commerce Service (`pricing-calculator.service.ts` & `checkout.service.ts`)

#### A. Chuẩn hóa quy trình tính toán (`PricingCalculatorService`)
1. **Bước 1: `groupByStore`** gom nhóm các `PricingItem` theo `storeId` chuẩn.
2. **Bước 2: `applyStoreVouchers`**
   - Tính `itemSubtotal` từng shop.
   - Tra cứu mã voucher của shop từ `storeVoucherCodes[group.storeId]` hoặc liên kết `businessId`.
   - Gọi `VoucherClient` xác thực với `orderSubtotal = group.itemSubtotal`.
   - Gán `group.storeVoucherDiscount` và tính tiền còn lại của shop.
3. **Bước 3: `applyPlatformVoucher`**
   - Tính tổng tiền còn lại sau Tầng 1: $\text{totalAfterStoreDiscount} = \sum \max(0, \text{group.itemSubtotal} - \text{group.storeVoucherDiscount})$.
   - Gọi `VoucherClient` xác thực Voucher Sàn với `orderSubtotal = totalAfterStoreDiscount`.
   - Phân bổ giảm giá sàn theo tỷ lệ giá trị từng shop (`allocatedPlatformDiscount`).
4. **Bước 4: `applyShippingVoucher`**
   - Tính phí ship từng shop và áp dụng voucher miễn phí vận chuyển.
5. **Bước 5: Tổng kết `grandTotal` từng nhóm:**
   $$\text{group.grandTotal} = \text{group.itemSubtotal} - \text{group.storeVoucherDiscount} - \text{allocatedPlatformDiscount} + \text{group.shippingFee} - \text{group.shippingDiscount}$$

---

### 3. Phía Promotion Service (`vouchers.service.ts`)

#### Liên kết 2 chiều giữa `Store` và `Business`
- Trong hàm kiểm tra phạm vi `scope === 'STORE'`:
  - Luôn sử dụng hàm `getRelatedStoreAndBusinessIds(dto.storeId)` để nhận diện đầy đủ cả ID gian hàng (`storeId`) lẫn ID doanh nghiệp (`businessId`).
  - Đảm bảo không từ chối nhầm voucher khi client truyền ID theo format bảng liên kết.

---

## III. NGUYÊN TẮC THIẾT KẾ GIAO DIỆN & TÁC NGHIỆP BẮT BUỘC (CRITICAL GUIDELINES)

1. 🧩 **Tái sử dụng Component & Layout có sẵn:**
   - Sử dụng các component hiện có của dự án: `BookCard`, `AddressMapPreview`, drawer/modal components, v.v.
   - Không tự ý tạo thêm các thư viện bên ngoài hoặc thay đổi thư viện UI cốt lõi.
2. 🎨 **Đồng bộ Style, Màu sắc & Bố cục:**
   - Tuân thủ màu sắc nhận diện: Primary `var(--theme-primary, #003B2B)`, Nền `var(--theme-background, #F2FBF9)`, Viền `var(--theme-border, #e8e5df)`, Font chữ Editorial / Inter.
   - Sắp xếp giỏ hàng và danh sách voucher theo từng Shop mạch lạc, dễ nhìn, hiển thị rõ ràng số tiền giảm của từng shop và số tiền giảm của sàn.
3. 📱 **Đảm bảo Responsive & Trải nghiệm di động:**
   - Bố cục co giãn linh hoạt trên cả Mobile (< 640px), Tablet (640px - 1024px) và Desktop (> 1024px).
   - Nút bấm, ô nhập voucher và nhãn giảm giá vừa vặn, không vỡ layout hoặc tràn chữ.
4. 🛡️ **Bảo toàn tính năng & Không gây Side-Effect:**
   - Tuyệt đối không làm ảnh hưởng đến các màn hình khác: Trang chủ, Trang chi tiết sách, Trang ví người dùng, Trang quản trị Seller/Admin.
   - Giữ nguyên cấu trúc trả về của API cho các dịch vụ phụ thuộc.
5. ❓ **Quy tắc An Toàn & Minh Bạch:**
   - **Bất kỳ điểm nào chưa rõ ràng hoặc phân vân về mặt nghiệp vụ/luồng dữ liệu: Bắt buộc dừng lại để hỏi trực tiếp ý kiến của Người dùng, tuyệt đối không tự ý phỏng đoán, tự chế hoặc tự quyết định.**

---

## IV. KẾ HOẠCH TRIỂN KHAI CHI TIẾT (ACTION PLAN)

| Bước | Hạng mục thực hiện | Vị trí File liên quan | Mục tiêu đạt được |
| :---: | :--- | :--- | :--- |
| **1** | **Chuẩn hóa Gom nhóm Store tại Frontend** | `web/src/app/checkout/page.tsx`<br>`web/src/ui/context/CartContext.tsx` | Khắc phục triệt để lỗi `activeStoreIds` bị đếm sai; gom nhóm đúng các sản phẩm cùng shop vào 1 khối UI. |
| **2** | **Cập nhật Logic Áp dụng Voucher Shop** | `web/src/app/checkout/page.tsx` | Hỗ trợ nhập mã tay và chọn từ Drawer; tính đúng `storeSubtotal` cho cả đơn 1 shop nhiều sản phẩm và đơn nhiều shop. |
| **3** | **Đồng bộ Backend Pricing Calculator** | `platform/apps/commerce-service/src/modules/voucher/pricing-calculator.service.ts`<br>`platform/apps/commerce-service/src/modules/orders/checkout.service.ts` | Triển khai thứ tự tính giá 3 tầng chuẩn xác; phân bổ giảm giá sàn theo tỷ lệ; bảo toàn số dư ví Seller. |
| **4** | **Đồng bộ Promotion Service 2 Chiều** | `platform/apps/promotion-service/src/modules/vouchers/vouchers.service.ts` | Đảm bảo xác thực chéo `storeId` $\leftrightarrow$ `businessId` không bị lỗi phạm vi. |
| **5** | **Kiểm thử Thực tế (End-to-End Testing)** | Trực tiếp trên giao diện Checkout & API DB | 1. Test đơn 2 sản phẩm cùng 1 shop + áp mã shop.<br>2. Test đơn 2 sản phẩm từ 2 shop khác nhau + áp mã 2 shop + áp mã sàn + freeship.<br>3. Kiểm tra số tiền nhận về ví của từng Seller sau khi đơn hoàn tất. |

---

> **Cam kết:** Đây là tài liệu quy chuẩn duy nhất và chính xác nhất làm kim chỉ nam trong suốt quá trình phát triển tính năng Voucher V2.
