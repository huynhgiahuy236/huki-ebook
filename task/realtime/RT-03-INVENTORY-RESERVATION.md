# 📊 RT-03: REALTIME 3-TIER INVENTORY & ATOMIC RESERVATION

> **Mục tiêu:** Cập nhật thời gian thực biến động tồn kho 3 tầng (`Total`, `Reserved`, `Available`). Khi khách hàng vào giỏ hàng hoặc bắt đầu Checkout $\to$ Khoản tạm giữ (Reserved) tăng lên, Sẵn sàng bán (Available) giảm xuống ngay lập tức trên màn hình Seller và trang chi tiết sách của khách khác, loại bỏ hoàn toàn rủi ro bán vượt tồn kho (Overselling).

---

## 🔍 1. PHẠM VI ẢNH HƯỞNG (SCOPE & IMPACT ANALYSIS)

### A. Frontend (Giao diện người dùng)
* **Seller Portal:**
  * Trang `seller/inventory/page.tsx` (Quản lý tồn kho 3 tầng): Ba cột số lượng `Total`, `Reserved`, `Available` cập nhật số động mà không cần tải lại trang.
* **Buyer Web:**
  * Trang chi tiết sách `/book/[slug]`: Nút "Mua ngay" / "Thêm vào giỏ" tự động chuyển sang trạng thái "Hết hàng" (Disabled) nếu cuốn cuối cùng vừa bị khách khác đặt giữ chỗ (Reserved).
* **Admin Portal:**
  * Giám sát cảnh báo tồn kho thấp toàn sàn.

### B. Backend (Microservices)
* `commerce-service`:
  * Module `inventory`: Thực hiện khóa tồn kho trong Database Transaction (`PhysicalBookDetails`, `InventoryReservation`).
  * Module `cron / ttl`: Tự động giải phóng tồn kho (Release Reservation) sau 15 phút nếu đơn hàng không được thanh toán.
* CSDL: Các bảng `physical_book_details`, `inventory_reservations`, `inventory_logs`.

### C. Mức độ rủi ro & Biện pháp phòng ngừa
* **Rủi ro:** Đây là nghiệp vụ tài sản và kinh doanh nhạy cảm nhất. Nếu bắn sự kiện realtime không đồng bộ với Transaction trong Database có thể dẫn tới hiển thị sai lệch giữa giao diện và CSDL thực tế.
* **Phòng ngừa:** Sự kiện socket `inventory:updated` CHỈ ĐƯỢC BẮN SAU KHI Transaction trong PostgreSQL đã Commit thành công (`$transaction` hoàn tất). Dữ liệu gửi đi bao gồm cả snapshot số dư mới nhất từ DB.

---

## 🛠️ 2. THIẾT KẾ KỸ THUẬT & CÁCH LÀM (IMPLEMENTATION PLAN)

### A. Kênh Socket & Định danh Room
```
Namespace: /inventory
Rooms:
  ├── store_inventory_{storeId}   (Seller theo dõi toàn bộ kho của mình)
  └── book_stock_{bookId}         (Khách đang xem trang chi tiết cuốn sách này)
```

### B. Cấu trúc Payload Sự kiện
```typescript
interface InventoryUpdatePayload {
  bookId: string;
  storeId: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  action: 'RESERVED' | 'COMMITTED' | 'RELEASED' | 'MANUAL_ADJUST';
  quantityDelta: number;
  updatedAt: string;
}
```

### C. Các bước thực hiện chi tiết
1. **Bước 1 (Backend Hook):** Trong `inventory.service.ts`, sau các hàm `reserveStock()`, `commitStock()`, `releaseReservation()` $\to$ Gọi `socketEmitter.emit('inventory:updated', payload)`.
2. **Bước 2 (Seller UI Hook):** Viết Hook `useRealtimeInventory.ts` tại trang quản lý kho Seller:
   * Khi nhận event `inventory:updated` $\to$ Cập nhật dòng sản phẩm tương ứng và làm nổi bật màu xanh/vàng (highlight animation 1 giây).
3. **Bước 3 (Product Detail Hook):** Tại trang `book/[slug]`, hook lắng nghe `book_stock_{bookId}` $\to$ Nếu `availableStock === 0` $\to$ Khóa nút mua ngay lập tức và hiển thị nhãn "Vừa hết hàng".

---

## 🎯 3. KẾT QUẢ ĐẠT ĐƯỢC (EXPECTED OUTCOME)

1. Khi khách hàng A đặt cuốn sách giấy duy nhất còn lại:
   * Màn hình của Seller: Cột **Reserved** nhảy từ 0 lên 1, cột **Available** nhảy từ 1 về 0.
   * Màn hình của khách hàng B đang xem cùng cuốn sách: Nút "Thêm vào giỏ hàng" lập tức bị vô hiệu hóa kèm thông báo *"Sản phẩm đang được giữ chỗ trong đơn hàng khác"*.
2. Nếu sau 15 phút khách A không thanh toán:
   * Cột **Reserved** tự động giảm về 0, **Available** tăng lại thành 1.
   * Nút mua trên trang khách B tự động mở khóa trở lại.

---

## 🧪 4. KẾ HOẠCH KIỂM THỬ & KẾT QUẢ NGHIỆM THU (TESTING & ACCEPTANCE)

* [x] **Test Case 1 (Race Condition Check & Atomic Reservation):**
  * Tích hợp 2 tầng khóa: Redis atomic counter (`reserveStockAtomic`) + PostgreSQL transaction (`PhysicalBookDetails.reserved`).
  * Unit test `InventoryReservationService` và `PhysicalBooksService` đạt 100% test pass (8/8 tests).
* [x] **Test Case 2 (Seller Inventory Realtime Monitor):**
  * Tích hợp hook `useRealtimeInventory.ts` vào `seller/inventory/page.tsx`.
  * Khi có sự kiện `INVENTORY_UPDATED` (đặt hàng, hủy đơn, điều chỉnh thủ công), 3 cột chỉ số `Total`, `Reserved`, `Available` nhảy số ngay lập tức.
  * Hàng sản phẩm biến động được gắn nhãn `⚡ Vừa biến động` và kích hoạt hiệu ứng pulse màu hổ phách/lục.
* [x] **Test Case 3 (Buyer Book Detail Realtime Lock):**
  * Trang `book/[id]` lắng nghe `INVENTORY_UPDATED` tương ứng với cuốn sách đang xem.
  * Khi `availableStock === 0` (hoặc bị giữ chỗ hết), nút "Thêm vào giỏ hàng" và "Mua ngay" tự động bị vô hiệu hóa (disabled), hiển thị nhãn nổi bật *"Tạm hết hàng (Đang có người giữ chỗ)"*.
* [x] **Test Case 4 (Cancellation & Release Propagation):**
  * Khi đơn hàng bị hủy từ phía Người mua hoặc Người bán (`orderApi.cancelSellerOrder`, `cancelBuyerOrder`, `cancelBuyerSubOrder`) $\to$ Tự động phát `INVENTORY_UPDATED` với action `RELEASED` $\to$ Cả giao diện Seller và Buyer lập tức cập nhật lại số lượng khả dụng.

> **Trạng thái:** ✅ **HOÀN THÀNH (COMPLETED)** — Đã qua kiểm thử TypeScript, Jest unit tests đạt 100% và tích hợp đầy đủ hai chiều Client-Server.
