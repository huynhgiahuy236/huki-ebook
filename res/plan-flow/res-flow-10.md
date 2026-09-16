# BÁO CÁO ĐÁNH GIÁ NGHIỆM THU - LUỒNG 10 (FLOW 10)
## TÁCH ĐƠN HÀNG ĐA GIAN HÀNG (MULTI-VENDOR ORDER SPLITTING: MASTER ORDER & SUB-ORDERS)

---

### 👤 Người thực hiện đánh giá: Project Manager (PM Audit)
### 📅 Ngày đánh giá: 16/09/2026
### 📦 Hệ thống kiểm thử: `commerce-service` (Port 3003), `web` Next.js (Port 3100), PostgreSQL, Redis

---

## I. TỔNG QUAN ĐÁNH GIÁ CHUNG (EXECUTIVE SUMMARY)

| Chỉ Số | Đánh Giá | Ghi Chú |
|---|:---:|---|
| **Mức độ hoàn thành** | **97%** | Kiến trúc Master Order & Sub-Orders độc lập, hủy từng kiện, phân tách Ebook/Physical hoàn tất |
| **Độ ổn định Backend** | 🟢 **Đạt** | Checkout Splitting Engine + Partial Cancel API + Escrow Settlement hoạt động chính xác |
| **Trải nghiệm Frontend** | 🟢 **Đạt** | Chi tiết đơn phân tách từng kiện hàng kèm badge trạng thái và nút "Hủy Kiện Này" |
| **Đối chiếu E-Commerce** | 🟢 **Tương đồng Shopee/Tiki** | Chuẩn cơ chế Master-Sub Order và tách luồng giao hàng độc lập |

---

## II. CHI TIẾT KẾT QUẢ ĐẠT ĐƯỢC (DELIVERABLES AUDIT)

### 🟢 1. CÁC TÍNH NĂNG ĐÃ HOÀN THÀNH & ĐẠT CHUẨN (PASSED)
* 🟢 **Phân tách Đơn hàng Mẹ & Đơn hàng Con (Master Order & Sub-Orders)**:
  * Người mua chỉ thanh toán 1 lần duy nhất cho toàn bộ giỏ hàng (`#ORD-...`).
  * Backend tự động phân tách thành các `SellerOrder` tương ứng với từng gian hàng: `#ORD-...-S1`, `#ORD-...-S2`...
* 🟢 **Xử lý Độc lập giữa Kiện Sách Giấy & Kiện Ebook Số (Digital Package)**:
  * Kiện Ebook số được tự động miễn phí ship 100%, tự động chuyển sang `COMPLETED` sau khi thanh toán và mở khóa ngay Tủ Sách / Web Reader.
  * Kiện Sách giấy chuyển sang trạng thái `PENDING_CONFIRMATION` để Người bán tiếp nhận, đóng gói và nhập mã vận đơn.
* 🟢 **Khả năng Hủy từng kiện hàng riêng biệt (`cancelBuyerSubOrder`)**:
  * Người mua có thể chọn hủy riêng 1 kiện hàng vật lý chưa giao mà không làm ảnh hưởng đến các kiện hàng khác trong cùng đơn.
  * Tự động giải phóng tồn kho (Inventory Reservation Release) và hoàn trả hạn mức Flash Sale chỉ cho các sản phẩm trong kiện bị hủy.
  * Master Order tự động cập nhật trạng thái `PARTIALLY_CANCELLED` (Hủy một phần).
* 🟢 **Định danh tên Gian hàng chính xác trên từng kiện hàng**:
  * Hiển thị đúng tên Nhà Xuất Bản tại mỗi kiện hàng trong trang Chi tiết đơn hàng của người mua.
* 🟢 **Cơ chế Bảo chứng Tạm giữ 2 phút (2-Minute Escrow Holding)**:
  * Đồng hồ đếm ngược bảo chứng tự động giải phóng tiền thanh toán cho Người bán sau thời gian xác nhận giao hàng thành công.

---

## III. SO SÁNH ĐỐI CHIẾU VỚI SHOPEE / TIKI / LAZADA

| Tiêu Chí Đánh Giá | Shopee / Lazada / Tiki | HUKI Ebook (Hiện Tại) | Đánh Giá PM |
|---|---|---|:---:|
| **Tách đơn hàng đa Shop** | Tách thành các kiện hàng riêng có mã vận đơn độc lập | Tách thành `SellerOrder` (#ORD-S1, S2) độc lập | 🟢 **Đạt chuẩn 100%** |
| **Phí ship từng kiện hàng** | Tính phí ship riêng từ kho từng Shop | Hỗ trợ tính phí riêng theo từng kiện hàng vật lý | 🟢 **Chính xác** |
| **Hủy đơn từng kiện riêng biệt** | Shopee cho phép hủy kiện của 1 Shop trước khi giao | HUKI hỗ trợ nút "Hủy Kiện Này" kèm modal xác nhận | 🟢 **Rất tốt** |
| **Tách riêng luồng số (Digital)** | Tiki tách riêng Ebook số không tính ship | Tách riêng Kiện Ebook số, mở khóa DRM tức thì | 🟢 **Tối ưu trải nghiệm** |
| **Theo dõi hành trình bưu tá** | Tích hợp webhook cập nhật từng chặng của GHN/GHTK | Hiển thị Stepper trạng thái 5 bước + Tên hãng & Mã vận đơn | 🔵 **Khuyến nghị tích hợp Tracking API hãng bưu chính** |

---

## IV. RỦI RO, GAPS & KHUYẾN NGHỊ NÂNG CẤP (RISKS & RECOMMENDATIONS)

* 🔵 **Khuyến nghị 1 (Tích hợp Webhook Hãng Vận Chuyển Realtime)**:
  * Hiện tại Seller tự nhập Mã vận đơn (`trackingCode`) và Tên đơn vị vận chuyển (`carrier`). Trong tương lai có thể tích hợp API trực tiếp với GHTK / GHN / ViettelPost để tự động cập nhật trạng thái "Đang giao" & "Đã giao".
* 🔴 **Lưu ý 1 (Chính sách Hoàn tiền khi hủy đơn đã thanh toán trước)**:
  * Khi người mua hủy 1 kiện trong đơn PayOS đã thanh toán, hệ thống ghi nhận trạng thái `REFUND_PENDING` cho kiện đó. Cần đảm bảo cổng thanh toán tự động kích hoạt lệnh hoàn tiền một phần (Partial Refund) qua PayOS API.

---

## V. MA TRẬN TEST CASES (TC CHECKLIST)

| Mã Test Case | Nội Dung Kiểm Thử | Trạng Thái |
|:---:|---|:---:|
| **TC_SPLIT_01** | Giỏ hàng đa gian hàng & Phí ship riêng lẻ từng kiện | 🟢 **PASS** |
| **TC_SPLIT_02** | Tạo đơn hàng Master & Phân tách Sub-Orders (#ORD-S1, S2) | 🟢 **PASS** |
| **TC_SPLIT_03** | Đơn hàng hỗn hợp Sách giấy + Ebook số (Ebook mở khóa tức thì) | 🟢 **PASS** |
| **TC_SPLIT_04** | Người mua Hủy 1 kiện hàng độc lập (Trạng thái PARTIALLY_CANCELLED) | 🟢 **PASS** |
| **TC_SPLIT_05** | Người bán xử lý đơn theo từng Sub-Order độc lập trong Seller Portal | 🟢 **PASS** |
| **TC_SPLIT_06** | Hủy toàn bộ đơn hàng (CANCELLED) & Hoàn trả toàn bộ tồn kho | 🟢 **PASS** |
