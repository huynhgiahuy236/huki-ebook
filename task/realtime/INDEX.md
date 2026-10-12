# ⚡ HUKI EBOOK - MASTER REALTIME ROADMAP & CROSS-ROLE ARCHITECTURE

> **Cam kết cốt lõi:** Đảm bảo **100% THỜI GIAN THỰC (REALTIME)** trên toàn bộ hệ thống cho **CẢ 4 ĐỐI TƯỢNG VAI TRÒ**:
> 1. **ADMIN** (Ban Quản Trị Hệ Thống Sàn)
> 2. **SELLER** (Chủ Gian Hàng / Kênh Người Bán)
> 3. **BUYER / USER** (Khách Mua Hàng & Bạn Đọc Sách Số)
> 4. **SHIPPER** (Đội Ngũ Bưu Tá Vận Chuyển HuKi Express)
>
> **Nguyên tắc thi công:** **LÀM TỪ TỪ - THEO TỪNG NHỊP ĐỘC LẬP - KIỂM THỬ CHẶT CHẼ - BÁO CÁO LIÊN TỤC - KHÔNG LÀM Ồ ẠT TRÁNH LỖI HỆ THỐNG.**

---

## 🏛️ 1. BẢN ĐỒ REALTIME THEO 4 VAI TRÒ (4-PILLARS BREAKDOWN)

```
                       +-----------------------------------+
                       |    HUKI REALTIME EVENT BUS        |
                       |  (Socket.io / Redis / Outbox DB)  |
                       +-----------------------------------+
                         ▲          ▲          ▲          ▲
                         │          │          │          │
            ┌────────────┴──┐ ┌─────┴──────┐ ┌─┴────────┐ ┌┴────────────┐
            │     ADMIN     │ │   SELLER   │ │  BUYER   │ │   SHIPPER   │
            │  (Quản trị)   │ │ (Gian hàng)│ │ (Bạn đọc)│ │  (Bưu tá)   │
            └───────────────┘ └────────────┘ └──────────┘ └─────────────┘
```

---

### 🅰️ Phân Hệ 1: ADMIN PORTAL (Ban Quản Trị Hệ Thống)
* **1.1. Bảng Điều Hành & KPI Sàn:** GMV, tổng số đơn, doanh thu phí sàn 15%, số user online nảy số thời gian thực (`RT-02`).
* **1.2. Xét Duyệt Đối Tác (KYC):** Tiếp nhận hồ sơ doanh nghiệp mới, duyệt/từ chối KYC cập nhật tức thì (`RT-01`).
* **1.3. Điều Khiển Tính Năng Seller (Realtime Switch):** Gạt công tắc bảo trì $\to$ Toàn bộ Seller bị mờ/khóa chức năng ngay lập tức (`RT-04`).
* **1.4. Kho Khóa DRM Vault:** Giám sát số lượng bạn đọc trực tuyến (`activeReaders`), nút hủy giấy phép từ xa đối với tài khoản đọc lậu (`RT-05`).
* **1.5. Kế Toán Kép & Duyệt Rút Tiền:** Tiếp nhận lệnh Payout từ ví Seller, bấm duyệt chuyển khoản ngân hàng $\to$ Cập nhật sổ cái tức thì (`RT-06`).
* **1.6. Trọng Tài Khiếu Nại (Dispute Desk):** Tiếp nhận ca tranh chấp hàng lỗi, phán quyết "Buyer Wins" / "Seller Wins" kích hoạt hoàn tiền tự động (`RT-08`).
* **1.7. Điều Phối Bưu Tá & Nợ COD:** Theo dõi danh sách shipper online, tổng nợ COD đang lưu thông ngoài thị trường (`RT-09`, `RT-10`).
* **1.8. Phát Sóng Thông Báo (Broadcast):** Bắn thông báo khẩn toàn sàn tới hàng nghìn tài khoản đồng thời (`RT-01`).

---

### 🅱️ Phân Hệ 2: SELLER PORTAL (Kênh Người Bán)
* **2.1. Chuông Báo Nổ Đơn Hàng Mới:** Khi khách thanh toán thành công $\to$ Chuông "tinh tinh" reo, đơn hàng xuất hiện ở dòng đầu tiên mà không cần F5 (`RT-02`).
* **2.2. Quản Lý Tồn Kho 3 Tầng:** Cột `Reserved` tăng khi khách checkout, cột `Available` giảm tức thì, nhả kho tự động khi đơn hủy (`RT-03`).
* **2.3. Trò Chuyện Trực Tiếp (Live Chat):** Nhận tin nhắn khách hàng, chỉ báo đối phương đang gõ (`typing...`), trạng thái đã xem (`RT-07`).
* **2.4. Ví Người Bán & Escrow 85/15:** Tiền hàng từ Escrow tự động nổ vào số dư khả dụng khi hết hạn đổi trả; số dư trừ ngay khi tạo lệnh rút tiền có mã PIN (`RT-06`).
* **2.5. Xử Lý Yêu Cầu Đổi Trả (RMA):** Nhận thông báo khiếu nại kèm ảnh lỗi từ khách, nút chấp thuận hoàn tiền cập nhật tại chỗ (`RT-08`).
* **2.6. Khóa/Mở Tính Năng Tức Thì:** Giao diện tự động làm mờ và chặn thao tác khi Admin bật bảo trì (`RT-04`).
* **2.7. Gọi Bưu Tá Lấy Hàng:** Bấm "Đã đóng gói" $\to$ Đơn bắn ngay sang sàn của Shipper (`RT-10`).

---

### 🅲 Phân Hệ 3: BUYER / USER (Khách Mua & Bạn Đọc Sách Số)
* **3.1. Cổng Thanh Toán PayOS (VietQR):** Quét mã QR chuyển khoản $\to$ Màn hình tự động chuyển sang trang Hoàn tất đơn hàng trong **< 500ms** (không cần bấm "Tôi đã thanh toán") (`RT-02`).
* **3.2. Cập Nhật Tồn Kho Realtime:** Nút "Mua ngay" tự động khóa nếu cuốn sách cuối cùng vừa bị khách khác đặt (chống oversell) (`RT-03`).
* **3.3. Hành Trình Giao Hàng (Live Timeline):** Mốc giao hàng 5 bước tự động sáng đèn xanh theo từng hành động của shipper (`RT-09`, `RT-10`).
* **3.4. Trình Đọc Sách Số (Web Reader DRM):** Gửi heartbeat giữ phiên đọc, hiển thị watermark canvas chống chụp lén, tự động khóa nếu giấy phép bị thu hồi (`RT-05`).
* **3.5. Nhắn Tin Tư Vấn Shop:** Chat trực tiếp với người bán hỏi về nội dung sách (`RT-07`).
* **3.6. Thông Báo & Tiến Trình Hoàn Tiền:** Nhận thông báo toast khi đơn được giao, khi phán quyết khiếu nại thành công (`RT-01`, `RT-08`).

---

### 🅳 Phân Hệ 4: SHIPPER PORTAL (Bưu Tá HuKi Express)
* **4.1. Sàn Đơn Hàng Chờ Nhận:** Ngay khi shop bấm đóng gói xong $\to$ Đơn nổ chuông trên app bưu tá kèm cước phí và địa chỉ lấy hàng (`RT-10`).
* **4.2. Tranh Đơn Hàng Nguyên Tử (Atomic Claim):** Shipper bấm "Nhận đơn" $\to$ Đơn lập tức biến mất khỏi màn hình các shipper khác trong **< 50ms**, chống trùng đơn (`RT-10`).
* **4.3. Quản Lý Đơn Đang Giao:** Cập nhật các mốc "Đã lấy hàng" $\to$ "Đang giao" $\to$ "Giao thành công" (`RT-09`, `RT-10`).
* **4.4. Ví Thu Nhập & Quản Lý Nợ COD:** Giao đơn thu tiền mặt COD $\to$ Con số nợ COD và tiền công tự động nhảy số trên ví tài xế (`RT-10`).
* **4.5. Trạng Thái Trực Tuyến (Online Toggle):** Gạt nút Online để nhận đơn, gạt Offline để nghỉ ngơi (`RT-10`).

---

## 🔄 2. MA TRẬN TƯƠNG TÁC CHÉO 4 BÊN (CROSS-ROLE EVENT FLOW)

Dưới đây là ví dụ minh họa cách một sự kiện đơn hàng luân chuyển thời gian thực qua cả 4 vai trò:

| Bước | Hành Động | BUYER (Khách) | SELLER (Shop) | SHIPPER (Bưu tá) | ADMIN (Sàn) |
|:---:|:---|:---|:---|:---|:---|
| **1** | Khách quét mã VietQR PayOS | 🟢 Tự động chuyển trang Thành công | 🔔 Chuông nổ đơn tinh tinh + Thêm dòng đơn mới | ⏳ (Chưa nhận tin) | 📈 GMV nhảy số + Đơn nổ trong danh sách sàn |
| **2** | Tồn kho biến động | 🔒 Khóa nút Mua nếu hết hàng | 📊 Cột Reserved tăng, Available giảm | ⏳ (Chưa nhận tin) | 📋 Cập nhật tồn kho toàn sàn |
| **3** | Shop đóng gói sách xong | 📦 Nhận tin "Shop đã chuẩn bị hàng" | 🚚 Đơn chuyển sang Chờ bưu tá | 🔔 Reo chuông trên Sàn Đơn Chờ Nhận | 👁️ Giám sát đơn đang chuẩn bị |
| **4** | Shipper bấm Nhận Đơn | 🛵 Nhận tin "Bưu tá [Tên] đang đến lấy" | 🛵 Nhận thông báo tên bưu tá | 📋 Đơn nhảy vào Đơn Đang Giao | 📍 Giám sát lộ trình điều phối |
| **5** | Giao thành công & Thu COD | 🎉 Nhận thông báo giao thành công + Mở đọc ebook | ⏳ Tiền 85% vào Tiền Ký Quỹ Escrow | 💵 Nợ COD và tiền công cộng vào ví | 💰 Sổ cái ghi nhận doanh thu sàn 15% |
| **6** | Hết 7 ngày đổi trả (Hoàn tất) | ⭐️ Gợi ý đánh giá sách | 💰 Tiền tự động chuyển sang Ví Khả Dụng | ✅ Hoàn tất đối soát COD | 🏛️ Đóng hồ sơ đơn hàng |

---

## 📑 3. DANH SÁCH 10 FILE ĐẶC TẢ KỸ THUẬT CHI TIẾT (RT-01 → RT-10)

Hệ thống được bóc tách thành **10 Module độc lập**, mỗi module có file tài liệu kỹ thuật hoàn chỉnh:

| Mã Tài Liệu | Tên Module Kỹ Thuật | Vai trò tham gia | Trọng tâm giải quyết | Trạng Thái |
|:---:|:---|:---:|:---|:---:|
| 📄 [**RT-01**](./RT-01-NOTIFICATIONS-BROADCAST.md) | **Hệ Thống Thông Báo & Cảnh Báo Sàn** | Admin, Seller, Buyer | Toast realtime, Bell badge, Broadcast toàn sàn | ✅ **Hoàn thành** |
| 📄 [**RT-02**](./RT-02-ORDERS-LIFECYCLE.md) | **Vòng Đời Đơn Hàng & Tách Đơn Con** | Admin, Seller, Buyer | Nổ chuông đơn mới, PayOS webhook nhảy trạng thái | ✅ **Hoàn thành** |
| 📄 [**RT-03**](./RT-03-INVENTORY-RESERVATION.md) | **Tồn Kho 3 Tầng & Khóa Tồn Kho** | Seller, Buyer | Khóa hàng khi checkout, nhả kho khi hủy, chống overselling | ✅ **Hoàn thành** |
| 📄 [**RT-04**](./RT-04-SELLER-FEATURES-TOGGLE.md) | **Bật/Tắt Tính Năng Seller (Switch)** | Admin, Seller | Làm mờ và chặn quyền Seller tức thì khi bảo trì | ✅ **Hoàn thành** |
| 📄 [**RT-05**](./RT-05-DRM-ACTIVE-READERS.md) | **Phiên Đọc Sách DRM & Active Readers** | Admin, Buyer | Heartbeat 30s, đếm bạn đọc online, hủy đọc lậu từ xa | ✅ **Hoàn thành** |
| 📄 [**RT-06**](./RT-06-WALLET-FINANCE-ESCROW.md) | **Ví Người Bán, Escrow & Duyệt Payout** | Admin, Seller | Nổ số dư ví 85/15, kế toán kép, duyệt rút tiền có mã PIN | ⏳ *Kế tiếp* |
| 📄 [**RT-07**](./RT-07-COMMUNITY-LIVE-CHAT.md) | **Hội Thoại Chat Trực Tiếp (Live Chat)** | Seller, Buyer | Nhắn tin tức thì, Typing indicator, trạng thái Đã xem | 📋 *Chờ duyệt* |
| 📄 [**RT-08**](./RT-08-DISPUTE-RMA-ARBITRATION.md) | **Đổi Trả Hàng (RMA) & Trọng Tài Sàn** | Admin, Seller, Buyer | Khiếu nại hàng lỗi, phán quyết Admin kích hoạt hoàn tiền | 📋 *Chờ duyệt* |
| 📄 [**RT-09**](./RT-09-SHIPPING-TRACKING.md) | **Hành Trình Giao Vận & Vận Đơn AWB** | Seller, Buyer, Shipper | Timeline giao hàng 5 bước, webhook hãng vận chuyển | 📋 *Chờ duyệt* |
| 📄 [**RT-10**](./RT-10-SHIPPER-DISPATCH-COD.md) | **Bưu Tá Điều Phối, Tranh Đơn & Ví COD** | Shipper, Seller, Admin | Sàn đơn chờ nhận, khóa tranh đơn nguyên tử, nợ COD | 📋 *Chờ duyệt* |

---

## 🛡️ 4. QUY TRÌNH THI CÔNG "LÀM TỪ TỪ - KHÔNG LỖI HỆ THỐNG"

Để đảm bảo hệ thống không bị gián đoạn hay phát sinh lỗi dây chuyền, chúng ta tuân thủ quy trình 5 bước nghiêm ngặt cho **MỖI NHỊP**:

```
[BƯỚC 1: XÁC LẬP PHẠM VI]
    └── Đọc kỹ file RT-xx.md tương ứng, chốt danh sách file sẽ can thiệp.
           │
           ▼
[BƯỚC 2: XÂY DỰNG BACKEND SOCKET EMITTER]
    └── Bổ sung Gateway / Emitter tại Microservice phụ trách.
    └── Đảm bảo Fallback về REST API nếu Socket ngắt kết nối.
           │
           ▼
[BƯỚC 3: KẾT NỐI FRONTEND HOOK]
    └── Tạo React Custom Hook (ví dụ `useRealtimeOrders.ts`).
    └── Cập nhật State cục bộ mượt mà (Optimistic UI Update).
           │
           ▼
[BƯỚC 4: KIỂM THỬ THỰC TẾ TRÊN BROWSER]
    └── Mở 2 - 3 cửa sổ trình duyệt song song (Admin, Seller, Buyer, Shipper).
    └── Chạy kịch bản test (Test cases đã ghi trong file RT-xx).
           │
           ▼
[BƯỚC 5: BÁO CÁO NGHIỆM THU]
    └── Báo cáo kết quả đạt được cho người dùng.
    └── Người dùng bấm duyệt $\to$ Mới chuyển sang nhịp tiếp theo!
```
