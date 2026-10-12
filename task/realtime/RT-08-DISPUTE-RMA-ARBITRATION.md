# ⚖️ RT-08: REALTIME RETURNS (RMA) & PLATFORM ARBITRATION DISPUTES

> **Mục tiêu:** Cập nhật thời gian thực quy trình Đổi trả hàng (RMA) và Trọng tài khiếu nại (Dispute Resolution): Khi Khách gửi yêu cầu trả hàng kèm bằng chứng ảnh $\to$ Seller nhận cảnh báo ngay; khi hai bên mâu thuẫn cần Admin can thiệp $\to$ Phán quyết trọng tài (Buyer Wins / Seller Wins) được công bố tức thì và kích hoạt luồng hoàn tiền tự động.

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG (SCOPE & IMPACT ANALYSIS)

### A. Frontend (Giao diện người dùng)
* **Buyer Web:**
  * Trang `user/returns/page.tsx`: Tiến trình xử lý đổi trả (Đang xem xét $\to$ Shop chấp nhận $\to$ Đang gửi hàng trả $\to$ Đã hoàn tiền).
* **Seller Portal:**
  * Trang `seller/returns/page.tsx`: Danh sách khiếu nại trả hàng; nút "Chấp nhận hoàn tiền" hoặc "Khiếu nại lên Sàn (Mở tranh chấp)".
* **Admin Portal:**
  * Trang `admin/disputes/page.tsx` (Trọng tài khiếu nại): Bàn đối chất hồ sơ vụ việc; form đưa ra phán quyết trọng tài (`arbitrationRuling`).

### B. Backend (Microservices)
* `commerce-service`:
  * Module `returns`: Quản lý vòng đời `ReturnRequest`.
  * Module `disputes`: Thẩm quyền ra phán quyết trọng tài của Admin.
* CSDL: Bảng `return_requests` (`PENDING_REVIEW`, `SELLER_ACCEPTED`, `SELLER_DISPUTED`, `ARBITRATED_BUYER_WINS`, `REFUNDED`...).

### C. Mức độ rủi ro & Biện pháp phòng ngừa
* **Rủi ro:** Khi Admin ra phán quyết "Buyer Wins" và kích hoạt hoàn tiền, nếu phía Seller không nhận được tín hiệu realtime có thể dẫn tới việc Seller vẫn gửi đơn hàng đổi mới hoặc nhầm lẫn về số tiền trong ví.
* **Phòng ngừa:** Sự kiện trọng tài phải được phát đồng thời tới cả 3 kênh: Kênh Buyer, Kênh Seller và Kênh Sổ cái Kế toán để khóa hoặc hoàn tiền ngay trong cùng một vòng đời sự kiện.

---

## 🛠️ 2. THIẾT KẾ KỸ THUẬT & CÁCH LÀM (IMPLEMENTATION PLAN)

### A. Kênh Socket & Định danh Room
```
Namespace: /disputes
Rooms:
  ├── dispute_case_{requestId}   (Phòng xử lý vụ việc cụ thể)
  ├── seller_returns_{storeId}   (Kênh nhận khiếu nại của riêng shop)
  └── buyer_returns_{userId}     (Kênh theo dõi khiếu nại của khách)
```

### B. Các Sự Kiện Chuẩn (Dispute Events)
1. `return:requested`: Khách hàng tạo yêu cầu đổi trả mới kèm ảnh bằng chứng.
2. `return:seller_responded`: Shop đồng ý hoặc từ chối yêu cầu.
3. `dispute:escalated_to_admin`: Chuyển vụ việc lên Ban Trọng Tài Sàn.
4. `dispute:ruling_issued`: Admin công bố phán quyết chính thức kèm ghi chú phân xử.

### C. Các bước thực hiện chi tiết
1. **Bước 1 (Backend Trigger):** Khi hàm `arbitrateReturnRequest()` trong `returns.service.ts` được Admin kích hoạt $\to$ Bắn socket event `dispute:ruling_issued` kèm phán quyết và số tiền hoàn trả.
2. **Bước 2 (Seller UI Update):** Trang `seller/returns` nhận event $\to$ Cập nhật trạng thái sang `ARBITRATED_BUYER_WINS` (màu đỏ) hoặc `ARBITRATED_SELLER_WINS` (màu xanh) ngay tại hàng tương ứng.
3. **Bước 3 (Buyer UI Update):** Màn hình của khách hàng hiện toast chúc mừng (nếu thắng kiện) và hiển thị thông báo tiền đang được hoàn về ví/tài khoản.

---

## 🎯 3. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED OUTCOME)

1. Khách bấm gửi yêu cầu đổi sách lỗi $\to$ Trên màn hình Seller xuất hiện badge đỏ và dòng khiếu nại mới trong **< 200ms**.
2. Khi hai bên tranh chấp, Admin mở màn hình Trọng tài và bấm **"Chấp thuận hoàn tiền cho Người mua"**:
   * Màn hình của Khách đổi trạng thái sang "Đã chấp thuận hoàn tiền".
   * Màn hình của Seller tự động cập nhật kết quả phân xử của Admin và lý do kèm theo.
   * Cả 3 bên đều nhìn thấy kết quả đồng nhất mà không cần tải lại trang.

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ (TESTING & VERIFICATION CADENCE)

* **Test Case 1 (Return Request Creation):** Buyer gửi yêu cầu $\to$ Seller nhận cảnh báo ngay lập tức trên trang `seller/returns`.
* **Test Case 2 (Admin Ruling Broadcast):** Admin chọn 1 vụ việc đang tranh chấp, click phán quyết "Buyer Wins" $\to$ Kiểm tra cả Buyer và Seller đều nhận được socket payload và giao diện đổi màu chuẩn.
* **Test Case 3 (Automated Refund Trigger):** Kiểm tra sau khi phán quyết nổ ra, event hoàn tiền bên module RT-06 (Ví & Tài chính) có tự động kích hoạt hay không.

---

## 🏆 5. KẾT QUẢ NGHIỆM THU (VERIFICATION RESULTS)
* **Trạng thái:** ✅ **HOÀN THÀNH 100% (VERIFIED)**
* **Script kiểm thử:** [`scripts/test-realtime-dispute-rma.mjs`](file:///e:/HuKi/scripts/test-realtime-dispute-rma.mjs)
* **Kênh Realtime Sync:** `realtimeSyncBus` (`RETURN_REQUESTED`, `RETURN_FORWARDED`, `RETURN_SELLER_ACCEPTED`, `RETURN_SELLER_DISPUTED`, `DISPUTE_ARBITRATED`, `RETURN_REPLACEMENT_SHIPPED`).
* **Hỗ trợ âm thanh & Toast:**
  - Seller nhận tiếng chuông báo khi có yêu cầu đổi trả hoặc chuyển tiếp từ Admin.
  - Buyer nhận Toast chúc mừng thắng kiện & thông báo hoàn tiền về ví khi Admin chọn `BUYER_WINS`.
  - Admin nhận Toast cảnh báo khi Seller phản biện yêu cầu để mở bàn trọng tài.
  - Escrow tự động unfreeze (`SELLER_WINS`) hoặc hoàn tiền (`BUYER_WINS`) theo phân xử.
