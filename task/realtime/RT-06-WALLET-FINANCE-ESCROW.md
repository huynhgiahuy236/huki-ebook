# 💰 RT-06: REALTIME SELLER WALLET, ESCROW & PAYOUT AUDIT

> **Mục tiêu:** Cập nhật thời gian thực biến động tài chính của Người bán: Khi đơn hàng giao thành công $\to$ Tiền Escrow tự động chia 85/15 nổ vào Số dư ví khả dụng (`availableBalance`); khi Admin duyệt lệnh rút tiền (Payout) $\to$ Trạng thái chuyển `APPROVED / COMPLETED` và số dư ví trừ tức thì trên màn hình Seller.

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG (SCOPE & IMPACT ANALYSIS)

### A. Frontend (Giao diện người dùng)
* **Seller Portal:**
  * Trang `seller/finance/page.tsx` (Số dư ví & Rút tiền): Thẻ số dư khả dụng (`availableBalance`), tiền tạm giữ (`pendingBalance`) cập nhật số động kèm hiệu ứng tăng số (Counter animation).
  * Trang `seller/escrow/page.tsx`: Danh sách các khoản ký quỹ đang chờ đối soát.
  * Trang `seller/transactions/page.tsx`: Bảng lịch sử giao dịch tự động chèn dòng mới khi có tiền về.
* **Admin Portal:**
  * Trang `admin/finance/page.tsx` (Tài chính & Kế toán): Danh sách yêu cầu rút tiền (`payout_requests`) chuyển trạng thái ngay khi ngân hàng báo chuyển khoản thành công.
  * Bảng tổng hợp số dư sổ cái kế toán kép (`LedgerAccountSummary`).

### B. Backend (Microservices)
* `commerce-service`:
  * Module `wallets`: Xử lý giao dịch nạp/rút/chuyển trạng thái số dư.
  * Module `double-entry-ledger`: Ghi chép nợ/có song song.
  * Module `payout-requests`: Xử lý duyệt chi tiền.
* CSDL: Các bảng `wallets`, `wallet_transactions`, `payout_requests`, `ledger_transactions`, `ledger_entries`.

### C. Mức độ rủi ro & Biện pháp phòng ngừa
* **Rủi ro:** Tiền bạc là nghiệp vụ nhạy cảm tuyệt đối. Sự cố race condition hoặc sai lệch số hiển thị sẽ gây hoang mang cho người bán.
* **Phòng ngừa:** Không bao giờ tính toán số dư phía Client. Sự kiện socket chỉ gửi bản tin thông báo kèm giá trị số dư chính xác lấy từ bản ghi CSDL đã khóa dòng (`SELECT FOR UPDATE`). Client chỉ việc áp dụng số dư chính thức từ server.

---

## 🛠️ 2. THIẾT KẾ KỸ THUẬT & CÁCH LÀM (IMPLEMENTATION PLAN)

### A. Kênh Socket & Định danh Room
```
Namespace: /finance
Rooms:
  ├── wallet_{walletId}          (Ví của người bán cụ thể)
  ├── store_finance_{storeId}    (Toàn bộ nhân sự phụ trách tài chính của gian hàng)
  └── admin_finance_desk         (Bàn làm việc của Kế toán sàn Admin)
```

### B. Các Sự Kiện Tài Chính Chuẩn (Financial Events)
1. `wallet:balance_credited`: Tiền hàng được giải phóng từ Escrow $\to$ Cộng vào số dư khả dụng.
2. `wallet:payout_status_changed`: Lệnh rút tiền được duyệt (`APPROVED`) hoặc bị từ chối (`REJECTED`).
3. `escrow:holding_created`: Khách thanh toán đơn mới $\to$ Khoản tạm giữ 85% xuất hiện trong Escrow.

### C. Các bước thực hiện chi tiết
1. **Bước 1 (Backend Transaction Hook):** Trong `SellerWalletService`, sau khi thực hiện ghi tăng/giảm số dư và hoàn tất Ledger Entry $\to$ Gửi payload:
   ```typescript
   interface WalletBalanceUpdatedPayload {
     walletId: string;
     storeId: string;
     availableBalance: number;
     pendingBalance: number;
     frozenBalance: number;
     transaction: {
       id: string;
       type: string;
       amount: number;
       description: string;
       createdAt: string;
     };
   }
   ```
2. **Bước 2 (Seller UI Hook):** Viết Hook `useRealtimeSellerWallet.ts`:
   * Khi nhận sự kiện $\to$ Phát âm thanh "Ting ting" tiền về nhẹ nhàng.
   * Cập nhật số dư trên thanh Header và bảng kê lịch sử giao dịch.
3. **Bước 3 (Admin Payout Desk):** Khi Seller gửi yêu cầu rút tiền mới $\to$ Màn hình duyệt Payout của Admin nảy thêm một hàng mới kèm badge `Chờ Duyệt`.

---

## 🎯 3. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED OUTCOME)

1. Khi khách hàng xác nhận nhận hàng hoặc hết thời hạn khiếu nại 7 ngày:
   * Màn hình Ví của Seller nổ số dư: Số tiền từ "Tiền Ký Quỹ Đang Giữ" tự động nhảy sang "Số Dư Khả Dụng" trong vòng **< 100ms**.
   * Bảng lịch sử giao dịch thêm 1 dòng: `+425.000đ - Tiền hàng đơn #ORD-xxxx (85%)`.
2. Khi Seller tạo lệnh rút tiền $\to$ Màn hình Admin Kế Toán xuất hiện ngay lập tức yêu cầu rút tiền mới mà Admin không cần F5.
3. Khi Admin bấm "Phê duyệt chuyển khoản" $\to$ Trạng thái trên màn hình Seller đổi sang màu xanh `ĐÃ GIẢI NGÂN`.

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ (TESTING & VERIFICATION CADENCE)

* **Test Case 1 (Escrow Release to Available):** Giả lập hoàn thành đơn hàng $\to$ Quan sát số dư ví Seller trên UI tự động tăng lên.
* **Test Case 2 (Payout Lifecycle Sync):**
  * Seller nhập mã PIN 6 số tạo yêu cầu rút 1.000.000đ.
  * Admin mở màn hình Duyệt Payout $\to$ Xác nhận thấy đơn xuất hiện ngay.
  * Admin bấm Duyệt $\to$ Seller thấy trạng thái đổi sang Thành công tức thì.
* **Test Case 3 (Double-entry Integrity):** Kiểm tra đối soát sổ cái sau khi nhận event realtime, đảm bảo tổng Nợ = tổng Có.
