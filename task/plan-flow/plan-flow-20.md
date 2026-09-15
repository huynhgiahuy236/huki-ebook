# KẾ HOẠCH CHI TIẾT THỰC HIỆN - LUỒNG 20
## QUẢN LÝ DÒNG TIỀN ESCROW & SỔ CÁI PHÂN LẬP GIAN HÀNG (MULTI-TENANT ESCROW & LEDGER WALLET ACCOUNTING)

---

## I. TỔNG QUAN KẾ HOẠCH & MỤC TIÊU KỸ THUẬT

* **Mục tiêu**: Xây dựng toàn diện phân hệ quản lý dòng tiền trung gian ký quỹ (Escrow Engine) và hệ thống kế toán sổ cái kép bất biến (Double-Entry Ledger) phân lập theo từng `business_id` (Gian hàng). Đảm bảo tự động hóa hoàn toàn quy trình nhận tiền vào số dư treo (`pending_balance`), tự động trích xuất phí hoa hồng Sàn (15%), xử lý đóng băng khi có tranh chấp (`frozen_balance`) và kết chuyển sang số dư khả dụng (`available_balance`) của Seller khi đơn hoàn tất.
* **Các tệp và thành phần liên quan**:
  * **Backend Microservices**:
    * `commerce-service` / `escrow-service`: Module `EscrowModule`, `EscrowService`, `LedgerService`, `WalletController`.
    * Middleware: `SellerScopeGuard` (bảo vệ quyền truy cập ví theo `business_id`).
    * Prisma Schema: Bảng `seller_wallets`, `wallet_transactions`.
  * **Frontend (Seller Portal)**:
    * [`SellerFinancePage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerFinancePage.jsx): Giao diện quản lý ví tài chính, thẻ 3 số dư lớn, biểu đồ doanh thu và bảng sao kê sổ cái chi tiết.
    * `web/src/ui/components/finance/LedgerTransactionsTable.jsx`: Bảng lịch sử bút toán sổ cái có bộ lọc theo ngày và loại giao dịch.

---

## II. KẾ HOẠCH PHÂN RÃ CÔNG VIỆC THÀNH CÁC PHẦN NHỎ (WBS)

```
                              KẾ HOẠCH TRIỂN KHAI LUỒNG 20
                                            │
    ┌────────────────┬──────────────────────┼──────────────────────┬────────────────┐
    ▼                ▼                      ▼                      ▼                ▼
 PHẦN 1:          PHẦN 2:                PHẦN 3:                PHẦN 4:          PHẦN 5:
SCHEMA & PRISMA  ESCROW STATE MACHINE   DOUBLE-ENTRY LEDGER    SELLER FINANCE   FINANCIAL AUDIT
WALLET MODEL     & 15% COMMISSION       & SECURITY GUARDS      UI & STATEMENT   & RECONCILIATION
```

---

## PHẦN 1: THIẾT KẾ CƠ SỞ DỮ LIỆU & SCHEMA PRISMA VÍ SỔ CÁI

### 📌 Mục tiêu:
Thiết lập bảng lưu trữ ví gian hàng `seller_wallets` và bảng bút toán lịch sử `wallet_transactions` trên PostgreSQL.

### 🔨 Các đầu việc cụ thể:

* **Task 1.1: Thiết kế Bảng `seller_wallets`**
  * Định nghĩa bảng trong `prisma/schema.prisma`:
    * `id`: UUID, Primary Key.
    * `business_id`: UUID, Unique Index, FK `businesses`.
    * `available_balance`: Decimal (Default: 0, Check $\ge 0$).
    * `pending_balance`: Decimal (Default: 0, Check $\ge 0$).
    * `frozen_balance`: Decimal (Default: 0, Check $\ge 0$).
    * `total_withdrawn`: Decimal (Default: 0).
    * `currency`: String (Default: 'VND').
    * `version`: BigInt (Default: 1 - Hỗ trợ Optimistic Lock).
    * `updated_at`: DateTime.

* **Task 1.2: Thiết kế Bảng `wallet_transactions` (Audit Ledger)**
  * Định nghĩa bảng lịch sử bút toán:
    * `id`: UUID, Primary Key.
    * `wallet_id`: UUID, FK `seller_wallets`.
    * `business_id`: UUID, Index, FK `businesses`.
    * `sub_order_id`: UUID (Nullable, FK `sub_orders`).
    * `entry_type`: Enum (`ORDER_ESCROW_IN`, `COMMISSION_DEDUCTION`, `PAYOUT_TO_AVAILABLE`, `FREEZE_DISPUTE`, `UNFREEZE_DISPUTE`, `REFUND_DEDUCTION`, `WITHDRAW_REQUEST`).
    * `amount`: Decimal (Số tiền $+/-$).
    * `balance_before`: Decimal.
    * `balance_after`: Decimal.
    * `description`: String.
    * `created_at`: DateTime.

---

## PHẦN 2: MÁY TRẠNG THÁI ESCROW & TỰ ĐỘNG KHẤU TRỪ HOA HỒNG 15%

### 📌 Mục tiêu:
Xây dựng logic điều phối dòng tiền theo vòng đời đơn hàng và công thức khấu trừ phí hoa hồng Sàn.

### 🔨 Các đầu việc cụ thể:

* **Task 2.1: Triển khai Hàm Ghi Nhận Số Dư Treo (`creditPendingBalance`)**
  * Khi đơn con được thanh toán:
    * Tính tiền treo: `PendingCredit = subtotal - shopVoucherDiscount`.
    * Tăng `pending_balance += PendingCredit` trong `seller_wallets`.
    * Ghi bút toán `ORDER_ESCROW_IN` vào `wallet_transactions`.

* **Task 2.2: Triển khai Hàm Kết Chuyển Khả Dụng & Trừ Hoa Hồng 15% (`releaseEscrowToAvailable`)**
  * Khi đơn hàng hoàn tất `DELIVERED` sau 3 ngày:
    * Giảm `pending_balance -= PendingCredit`.
    * Tính hoa hồng Sàn: $\text{Commission} = \text{subtotal} \times 15\%$.
    * Tính tiền thực nhận: $\text{NetPayout} = \text{PendingCredit} - \text{Commission}$.
    * Tăng `available_balance += NetPayout`.
    * Ghi đồng thời 2 bút toán: `COMMISSION_DEDUCTION` (-Commission) và `PAYOUT_TO_AVAILABLE` (+NetPayout).

* **Task 2.3: Triển khai Hàm Đóng Băng / Mở Đóng Băng Tranh Chấp**
  * Mở khiếu nại (L18): Chuyển tiền từ `pending_balance` sang `frozen_balance`.
  * Kết thúc khiếu nại: Xử lý giải phóng hoặc hoàn tiền theo phán quyết Admin.

---

## PHẦN 3: DỊCH VỤ SỔ CÁI BẤT BIẾN & BẢO VỆ PHÂN LẬP GIAN HÀNG

### 📌 Mục tiêu:
Đảm bảo tính toàn vẹn số liệu kế toán và ngăn chặn rò rỉ dữ liệu giữa các gian hàng.

### 🔨 Các đầu việc cụ thể:

* **Task 3.1: Triển khai `DoubleEntryLedgerService`**
  * Đảm bảo tính bất biến (Immutable): Không cung cấp phương thức UPDATE hay DELETE trên bảng `wallet_transactions`, chỉ có INSERT.
  * Mọi biến động số dư ví bắt buộc phải đi kèm bản ghi sổ cái tương ứng trong cùng một Database Transaction.

* **Task 3.2: Tích hợp `SellerScopeGuard` Bảo Mật Tuyệt Đối**
  * Áp dụng middleware trên tất cả các Controller tài chính:
    * Tự động lấy `business_id` từ JWT token của tài khoản đăng nhập.
    * Chặn 100% mọi request cố tình truyền `business_id` của Shop khác trong Query/Param.

---

## PHẦN 4: GIAO DIỆN QUẢN TRỊ TÀI CHÍNH SELLER & SAO KÊ SỔ CÁI

### 📌 Mục tiêu:
Xây dựng giao diện ví doanh nghiệp hiện đại, minh bạch từng đồng doanh thu và phí dịch vụ.

### 🔨 Các đầu việc cụ thể:

* **Task 4.1: Nâng cấp Trang Quản Trị Tài Chính ([`SellerFinancePage.jsx`](file:///d:/doan_huki_ebook/huki-ebook/web/src/ui/pages/seller/SellerFinancePage.jsx))**
  * **3 Thẻ số dư lớn bắt mắt**:
    * 🟢 **Số dư khả dụng**: Màu xanh lá (Kèm nút **"Rút Tiền"**).
    * ⏳ **Số dư chờ kết chuyển**: Màu xanh dương (Có tooltip giải thích: "Các đơn đang giao").
    * 🔒 **Đang đóng băng**: Màu cam (Các đơn có khiếu nại).
  * **Biểu đồ doanh thu 7 ngày / 30 ngày**: Hiển thị tổng doanh thu và phí hoa hồng sàn đã nộp.

* **Task 4.2: Xây dựng Bảng Sao Kê Sổ Cái (`LedgerTransactionsTable.jsx`)**
  * Bộ lọc: Lọc theo thời gian (Hôm nay, 7 ngày, Tháng này), Lọc theo loại biến động (Doanh thu, Phí sàn, Rút tiền).
  * Hiển thị bảng: Thời gian, Mã đơn hàng, Loại biến động (có badge màu), Số tiền ($+/-$), Số dư sau giao dịch và Diễn giải chi tiết.

---

## PHẦN 5: KIỂM TOÁN TÀI CHÍNH TOÀN TRÌNH & ĐỐI SOÁT (TEST SUITE)

### 📌 Mục tiêu:
Xác thực độ chính xác 100% của các phép tính tài chính và đối soát dòng tiền Escrow toàn sàn.

### 🔨 Các đầu việc cụ thể:

* **Task 5.1: Unit & Integration Test Luồng Tiền Ví**
  * Test Case nạp tiền vào `pending_balance` khi thanh toán.
  * Test Case khấu trừ chính xác hoa hồng 15% khi hoàn tất đơn.
  * Test Case đóng băng `frozen_balance` khi có tranh chấp.
  * Test Case phân lập dữ liệu giữa 2 Seller khác nhau.

* **Task 5.2: Kiểm Toán Đối Soát Bút Toán (Reconciliation Audit)**
  * Kiểm tra công thức đối soát toàn hệ thống:
    $$\text{Available} + \text{Pending} + \text{Frozen} = \sum (\text{Bút toán Ghi Có}) - \sum (\text{Bút toán Ghi Nợ})$$
  * Đảm bảo sai số tài chính bằng $0\text{ VNĐ}$.

---

## III. TIẾN ĐỘ & CHECKLIST NGHIỆM THU (DEFINITION OF DONE)

| Hạng Mục | Nhiệm Vụ Chi Tiết | Trạng Thái | Người Phụ Trách |
|---|---|:---:|:---:|
| **Database** | Prisma Schema bảng `seller_wallets`, `wallet_transactions` | ⏳ Sẵn sàng | Backend Team |
| **Escrow Engine**| Khấu trừ hoa hồng Sàn 15% & kết chuyển khả dụng tự động | ⏳ Sẵn sàng | Backend Team |
| **Ledger Service**| Sổ cái kép bất biến ghi nhận đầy đủ số dư trước/sau | ⏳ Sẵn sàng | Backend Team |
| **Security Guard**| `SellerScopeGuard` bảo mật phân lập dữ liệu theo `business_id` | ⏳ Sẵn sàng | Backend Team |
| **Frontend UI** | Giao diện `SellerFinancePage.jsx` & Bảng sao kê sổ cái | ⏳ Sẵn sàng | Frontend Team |
| **Financial Audit**| Vượt qua 100% Ma trận kiểm thử dòng tiền (TC_ESC_01 đến TC_ESC_06) | ⏳ Sẵn sàng | QA / QC Team |

---
*Tài liệu kế hoạch được biên soạn làm tiêu chuẩn kỹ thuật thực hiện cho Luồng 20 thuộc Nền tảng Sách Huki Ebook.*
