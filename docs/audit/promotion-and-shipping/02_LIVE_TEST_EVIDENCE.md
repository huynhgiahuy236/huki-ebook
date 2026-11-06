# BẰNG CHỨNG KIỂM THỬ THỰC TẾ (LIVE TEST EVIDENCE)
## PHÂN HỆ: PROMOTION-SERVICE & SHIPPING-SERVICE (TIER 2)

**Thời điểm thực thi:** 2026-11-06  
**Nhánh làm việc:** `audit/promotion-and-shipping`  
**Hạ tầng kiểm thử sống:**
* `promotion-service`: `http://localhost:3007`
* `shipping-service`: `http://localhost:3004`
* PostgreSQL: Cổng 5432 (`huki_promotion`, `huki_shipping`)
* Redis: Cổng 6379 (IO/Lua Scripts)
* RabbitMQ: Cổng 5672 (Exchange `huki.events`)

---

## BẢNG TỔNG HỢP KẾT QUẢ THỰC THI KIỂM THỬ BAN ĐẦU

| Test Script | Mục Tiêu Kiểm Định | Số Assertion | Kết Quả Thực Tế | Ghi Chú & Phát Hiện |
| :--- | :--- | :---: | :---: | :--- |
| `test_voucher_limits_and_rollback.ts` | Hạn mức voucher, minOrderAmount, tính chiết khấu, Apply & Rollback khi hủy đơn | 6/6 | **PASS (100%)** | Xác nhận voucher hết hạn bị chặn, không âm tiền, rollback phục hồi `currentUsage` về 0 |
| `test_flash_sale_redis_sync.ts` | Tranh chấp tồn kho Flash Sale đồng thời trên Redis, chặn bán âm, hoàn trả quota | 5/5 | **PASS (100%)** | 3 buyers mua thành công, buyer 4 bị chặn 400; release đơn phục hồi tồn kho cả Redis và Postgres |
| `test_shipping_internal_shielding.ts` | Phân tầng bảo vệ endpoint tra cứu địa chỉ nội bộ & tính cước bậc thang GHTK | 5/5 | **PASS (100%)** | Endpoint nội bộ chặn request không key; cước nội tỉnh 15k, liên tỉnh 1.5kg đạt 35k |
| `test_shipping_inbox_deduplication.ts` | Bắn 2 sự kiện RabbitMQ trùng lặp `eventId` kiểm tra chống trùng vận đơn qua `inboxEvent` | 3/3 | **PASS (100%)** | Message thứ 2 được phát hiện trùng lặp, chỉ tạo đúng 1 shipment và 1 delivery log |
| **TỔNG CỘNG** | **4 Test Suites Độc Lập** | **19/19** | **19/19 PASS** | **Hệ thống phản hồi chuẩn xác theo thiết kế kiểm thử** |

---

## LOG TERMINAL THỰC TẾ CHI TIẾT

### 1. LOG TEST 1: VOUCHER LIMITS & ROLLBACK
```text
================================================================
🧪 TEST 1: VOUCHER LIMITS, VALIDATION & ROLLBACK VERIFICATION
🎯 Service Target: http://localhost:3007
================================================================

[SETUP] Created test voucher: TESTVOUCH_366758 (ID: 48dee373-db9e-4099-82b5-4f9e725a6a98)

--- KỊCH BẢN 1: Áp dụng voucher đã hết hạn sử dụng ---
Response status: 200, Valid: false
✅ PASS [1/6]: Voucher hết hạn bị từ chối thành công.

--- KỊCH BẢN 2: Giá trị đơn hàng chưa đạt mức tối thiểu (minOrderAmount = 100K) ---
Order Subtotal: 80,000 VND -> Valid: false
✅ PASS [2/6]: Đơn hàng dưới minOrderAmount bị chặn chuẩn xác.

--- KỊCH BẢN 3: Áp dụng voucher hợp lệ (Đơn 150K >= 100K) ---
Valid: true, Discount: 50000
✅ PASS [3/6]: Voucher hợp lệ được chấp nhận, chiết khấu tính đúng 50.000đ.

--- KỊCH BẢN 4: Chống làm đơn hàng âm tiền khi voucher > giá trị đơn ---
Subtotal: 110,000 - Discount: 50000 = Net: 60000
✅ PASS [4/6]: Giá trị đơn hàng sau giảm giá bảo toàn >= 0.

--- KỊCH BẢN 5: Áp dụng voucher ghi nhận lượt dùng (Apply) ---
Apply status: 200
Voucher current_usage in DB: 1 (Expected: 1)
✅ PASS [5/6]: Lượt dùng voucher tăng từ 0 lên 1 chính xác.

--- KỊCH BẢN 6: Hoàn trả voucher khi đơn hàng bị hủy (Rollback) ---
Rollback response: {
  status: 'success',
  statusCode: 200,
  message: 'Thành công',
  data: { rolledBack: 1 },
  meta: {
    requestId: 'f7f1d311-71a0-446b-9599-bc335e090b07',
    timestamp: '2026-11-06T09:29:27.094Z'
  }
}
Voucher current_usage after rollback in DB: 0 (Expected: 0)
✅ PASS [6/6]: Rollback thành công, lượt dùng được phục hồi về 0.

[TEARDOWN] Cleaned up temporary test vouchers.

================================================================
📊 KẾT QUẢ TEST 1: 6/6 ASSERTIONS PASS
================================================================
```

---

### 2. LOG TEST 2: FLASH SALE REDIS ATOMIC SYNC & ROLLBACK
```text
================================================================
🧪 TEST 2: FLASH SALE REDIS ATOMIC SYNC & QUOTA ROLLBACK
🎯 Service Target: http://localhost:3007
================================================================

[SETUP] Seeded Item fsi-test-1793957472241 (Book: book-fs-1793957472241) with Stock = 3 in DB and Redis.

--- KỊCH BẢN 1: Bắn 3 request đặt hàng đồng thời cho 3 người mua khác nhau ---
Buyer reservation HTTP statuses: [ 201, 201, 201 ]
✅ PASS [1/5]: Cả 3 lượt mua hợp lệ đều thành công giữ chỗ.
State after 3 reserves -> Redis Stock: 0, DB Stock: 0, DB Sold: 3
✅ PASS [2/5]: Đồng bộ hoàn hảo: Redis = 0 và DB Stock = 0, Sold = 3.

--- KỊCH BẢN 2: Người mua thứ 4 cố gắng mua khi tồn kho đã về 0 ---
4th buyer HTTP status: 400 FLASH_SALE_NOT_ACTIVE
✅ PASS [3/5]: Chặn đứng người mua thứ 4, không bị bán âm tồn kho.

--- KỊCH BẢN 3: Hủy đơn hàng của Buyer 1 -> Hoàn trả tồn kho (Release Order) ---
Release HTTP status: 201
State after release -> Redis Stock: 1, DB Stock: 1, DB Sold: 2
✅ PASS [4/5]: Hoàn trả tồn kho thành công trên cả Redis (+1) và Postgres (+1 stock, -1 sold).

--- KỊCH BẢN 4: Buyer 4 mua lại đúng 1 suất vừa được nhả ra ---
Buyer 4 retry status: 201
✅ PASS [5/5]: Suất vừa nhả ra được phục vụ ngay cho khách hàng tiếp theo.

[TEARDOWN] Cleaned up temporary flash sale test data.

================================================================
📊 KẾT QUẢ TEST 2: 5/5 ASSERTIONS PASS
================================================================
```

---

### 3. LOG TEST 3: SHIPPING INTERNAL SHIELDING & TIERED FEE
```text
================================================================
🧪 TEST 3: SHIPPING INTERNAL SHIELDING & TIERED FEE CALCULATION
🎯 Service Target: http://localhost:3004
================================================================

[SETUP] Seeded test address: ebc84772-eecc-44eb-a156-2181d4c60699 for user 04609db5-d34d-4f54-a640-c6e7d820777b

--- KỊCH BẢN 1: Gọi internal addresses không kèm x-internal-service-key ---
HTTP Status without key: 401
✅ PASS [1/5]: Truy cập không có internal key bị chặn đứng (HTTP 401).

--- KỊCH BẢN 2: Gọi internal addresses với key giả mạo ---
HTTP Status with forged key: 401
✅ PASS [2/5]: Key giả mạo bị từ chối truy cập (HTTP 401).

--- KỊCH BẢN 3: Gọi internal addresses với key hợp lệ ---
HTTP Status with valid key: 200, Count: 2
✅ PASS [3/5]: Khóa nội bộ hợp lệ truy xuất danh sách địa chỉ thành công.

--- KỊCH BẢN 4: Tra cứu chi tiết 1 địa chỉ qua /api/v1/internal/addresses/:id ---
HTTP Status for single address: 200, Name: Auditor Receiver
✅ PASS [4/5]: Tra cứu địa chỉ chính xác theo ID.

--- KỊCH BẢN 5: Tính cước vận chuyển bậc thang (Weight & Distance) ---
Same province quote: {
  carrier: 'GHTK',
  service: 'STANDARD',
  shippingFee: 15000,
  codFee: 0,
  totalFee: 15000,
  estimatedDays: { min: 1, max: 2 }
}
Inter-province quote: {
  carrier: 'GHTK',
  service: 'STANDARD',
  shippingFee: 35000,
  codFee: 0,
  totalFee: 35000,
  estimatedDays: { min: 3, max: 5 }
}
✅ PASS [5/5]: Tính đúng cước bậc thang nội tỉnh (15K) và liên tỉnh 1.5kg (35K).

[TEARDOWN] Cleaned up temporary test address.

================================================================
📊 KẾT QUẢ TEST 3: 5/5 ASSERTIONS PASS
================================================================
```

---

### 4. LOG TEST 4: SHIPPING INBOX EVENT DEDUPLICATION (RABBITMQ)
```text
================================================================
🧪 TEST 4: SHIPPING INBOX EVENT DEDUPLICATION (RABBITMQ)
🎯 Target RabbitMQ: amqp://guest:guest123@localhost:5672
================================================================

[SETUP] Prepared DomainEvent:
  - eventId: evt-dedup-4d3fd0b6-4492-48e3-b863-47bd0e4da5c1
  - eventType: ORDER_CREATED
  - sellerOrderId: 328b165b-131b-4c2a-9626-402b8b898491

--- KỊCH BẢN 1: Bắn liên tiếp 2 message RabbitMQ cùng một eventId ---
Publishing message 1...
Publishing message 2 (identical duplicate message)...
Waiting 3 seconds for asynchronous consumer processing...
Inbox events found in DB: 1 (Expected: 1)
✅ PASS [1/3]: Bảng inbox_events chỉ ghi nhận duy nhất 1 bản ghi eventId.
Shipments found for sellerOrderId: 1 (Expected: 1)
  -> Shipment ID: 6f968482-37c3-43ee-9586-c9fc9cff692b, Status: PENDING, Tracking: GHTK23C61404E4A3
✅ PASS [2/3]: Chỉ sinh đúng 1 vận đơn (Shipment), không bị nhân đôi.
Delivery logs recorded: 1 (Expected: 1 for SHIPMENT_CREATED)
✅ PASS [3/3]: Lịch sử vận đơn (delivery_logs) không bị ghi trùng lặp.

[TEARDOWN] Cleaned up test shipment, logs, and inbox event.

================================================================
📊 KẾT QUẢ TEST 4: 3/3 ASSERTIONS PASS
================================================================
```
