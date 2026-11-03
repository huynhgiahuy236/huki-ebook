# Danh sách lỗi cần xử lý (Bug Tracking) - Kiểm Thử Toàn Diện MOD-02

> **Quy tắc làm việc:**
> 1. Ghi nhận và bóc tách toàn bộ lỗi phát hiện được trong quá trình kiểm thử chuyên sâu MOD-02 vào file này.
> 2. **Tuyệt đối không tự ý sửa code trước khi có chỉ đạo từ người dùng.**
> 3. Mọi lỗi phải có đầy đủ 3 cấu phần: Vị trí (Màn hình/API/Flow), Mô tả hiện tượng (HTTP status/Console error/Log) và Phân tích nguyên nhân gốc rễ (Root Cause).
> 4. Chỉ bắt tay vào sửa code sau khi người dùng phê duyệt và chỉ định lỗi cụ thể.

---

## 1. Danh Sách Lỗi Phát Hiện (MOD-02: Kênh Người Bán & Xuất Bản)

*(Đang tiến hành rà soát chuyên sâu 35 màn hình quản trị gian hàng đối tác và toàn bộ luồng nghiệp vụ `/seller/*`...)*

---

## 2. Bản Đồ Kiểm Thử Hệ Thống (Master Audit Map)
- 📘 **[MOD-01: Cổng Độc Giả & Khách Mua Hàng (45 màn hình)](file:///e:/HuKi/tasks/module-01-buyer-public-flows.md)** $\rightarrow$ **[Báo cáo lỗi MOD-01 (26 lỗi)](file:///e:/HuKi/tasks/bug-mod01.md)**
- 🏪 **[MOD-02: Kênh Người Bán & Xuất Bản (48 màn hình & luồng nghiệp vụ)](file:///e:/HuKi/tasks/module-02-seller-portal-flows.md)** $\rightarrow$ **[Báo cáo lỗi MOD-02 (18 lỗi)](file:///e:/HuKi/tasks/bug-mod02.md)**
- 👑 **[MOD-03: Cổng Quản Trị Sàn Toàn Diện (35 màn hình)](file:///e:/HuKi/tasks/module-03-admin-portal-flows.md)** $\rightarrow$ **[Báo cáo lỗi MOD-03 (19 lỗi)](file:///e:/HuKi/tasks/bug-mod03.md)**
- 🚚 **[MOD-04: Cổng Giao Hàng & Đối Soát COD (10 màn hình)](file:///e:/HuKi/tasks/module-04-shipper-portal-flows.md)** $\rightarrow$ **[Báo cáo lỗi MOD-04 (13 lỗi)](file:///e:/HuKi/tasks/bug-mod04.md)**
- 🤝 **[MOD-05: Hệ Sinh Thái Tiếp Thị Liên Kết Affiliate (9 màn hình)](file:///e:/HuKi/tasks/module-05-affiliate-ecosystem.md)** $\rightarrow$ **[Báo cáo lỗi MOD-05 (17 lỗi)](file:///e:/HuKi/tasks/bug-mod05.md)**
- 💬 **[MOD-06: Cộng Đồng Độc Giả, Chat & Bé Cáo AI (8 màn hình)](file:///e:/HuKi/tasks/module-06-ai-community-chat.md)** $\rightarrow$ **[Báo cáo lỗi MOD-06 (14 lỗi)](file:///e:/HuKi/tasks/bug-mod06.md)**
- 🛡️ **[MOD-07: Kiểm Thử An Ninh & Phân Quyền RBAC](file:///e:/HuKi/tasks/module-07-security-rbac-audit.md)**
- 🤖 **[MOD-08: Robot Playwright Quét Tự Động 141 Màn Hình](file:///e:/HuKi/tasks/module-08-playwright-full-scanner.md)**

---

## 3. Tiến Độ Thực Hiện MOD-02
- [x] Khởi tạo tài liệu theo dõi lỗi riêng biệt `tasks/bug-mod02.md`
- [x] Rà soát Phân hệ 1: Gia Nhập & Thiết Lập Doanh Nghiệp (`/seller/register`, `/seller/stores/setup`, `/seller/dashboard`)
- [x] Rà soát Phân hệ 2: Quản Lý Sản Phẩm & Đăng Sách Thật (Physical, Ebook DRM, Hybrid, Inventory)
- [x] Rà soát Phân hệ 3: Quản Lý Đơn Hàng & Vận Chuyển (`/seller/orders`, in vận đơn, đổi trả)
- [x] Rà soát Phân hệ 4: Marketing & Khuyến Mãi Gian Hàng (Voucher shop, Flash sale, giảm giá)
- [x] Rà soát Phân hệ 5: Tài Chính, Quyết Toán & Quản Trị Nhân Viên (`/seller/finance`, `/seller/wallet`, `/seller/staff`)
- [x] Báo cáo tổng thể MOD-02 (14 lỗi) và xin ý kiến chỉ đạo
- [ ] Báo cáo tổng thể MOD-02 và xin ý kiến chỉ đạo
