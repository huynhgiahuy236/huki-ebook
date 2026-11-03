# 🌊 BẢN ĐỒ TỔNG CHỈ HUY TOÀN BỘ HỆ THỐNG HUKI (MASTER ARCHITECTURE & AUDIT INDEX)

> **Quy mô dự án:** Monorepo gồm **141 màn hình giao diện (Routes)** + **7 Microservices Backend** + **Hệ thống hàng đợi RabbitMQ, Redis, PostgreSQL đa cơ sở dữ liệu, MongoDB**.
> **Mục tiêu:** Kiểm thử thực tế 100% trên Local (Database thật, Backend thật `:3000`, Frontend thật `:3100`), **không mock data trên giao diện**. Mọi lỗi phát hiện được sẽ tổng hợp vào [bug.md](file:///e:/HuKi/tasks/bug.md).

---

## 🗺️ BẢN ĐỒ CÁC MODULE CHỨC NĂNG CHUYÊN SÂU

| Mã Task | Phân Hệ / Module Chức Năng | Quy Mô Thực Tế | Tài Liệu Chi Tiết | Trạng Thái |
| :---: | :--- | :---: | :--- | :---: |
| **MOD-01** | **Cổng Độc Giả & Khách Mua (Public & Buyer Journey)** | 45 Màn hình | [module-01-buyer-public-flows.md](file:///e:/HuKi/tasks/module-01-buyer-public-flows.md) | `ĐÃ QUÉT XONG (26 BUGS)` |
| **MOD-02** | **Kênh Người Bán & Xuất Bản (Seller & Publisher Portal)** | 48 Màn hình / Luồng | [module-02-seller-portal-flows.md](file:///e:/HuKi/tasks/module-02-seller-portal-flows.md) | `ĐÃ QUÉT XONG (18 BUGS)` |
| **MOD-03** | **Cổng Quản Trị Sàn Toàn Diện (Admin Central Operations)** | 35 Màn hình | [module-03-admin-portal-flows.md](file:///e:/HuKi/tasks/module-03-admin-portal-flows.md) | `ĐÃ QUÉT XONG (19 BUGS)` |
| **MOD-04** | **Cổng Giao Hàng & Đối Soát COD (Shipper & Logistics)** | 10 Màn hình | [module-04-shipper-portal-flows.md](file:///e:/HuKi/tasks/module-04-shipper-portal-flows.md) | `ĐÃ QUÉT XONG (13 BUGS)` |
| **MOD-05** | **Hệ Sinh Thái Tiếp Thị Liên Kết (Affiliate & Tracking)** | 9 Màn hình | [module-05-affiliate-ecosystem.md](file:///e:/HuKi/tasks/module-05-affiliate-ecosystem.md) | `ĐÃ QUÉT XONG (17 BUGS)` |
| **MOD-06** | **Cộng Đồng Đọc Giả, Chat & Bé Cáo AI (Community & AI)** | 8 Màn hình | [module-06-ai-community-chat.md](file:///e:/HuKi/tasks/module-06-ai-community-chat.md) | `ĐÃ QUÉT XONG (14 BUGS)` |
| **MOD-07** | **Kiểm Thử An Ninh & Phân Quyền (Security & Access Audit)** | Toàn hệ thống | [module-07-security-rbac-audit.md](file:///e:/HuKi/tasks/module-07-security-rbac-audit.md) | `CHỜ TRIỂN KHAI` |
| **MOD-08** | **Robot Playwright Quét Tự Động Toàn Sàn (UI/UX Scanner)** | Toàn bộ Routes | [module-08-playwright-full-scanner.md](file:///e:/HuKi/tasks/module-08-playwright-full-scanner.md) | `CHỜ TRIỂN KHAI` |

---

## 📌 DANH SÁCH 17 TASK LỖI THỰC TẾ TRƯỚC ĐÓ
Toàn bộ 17 lỗi nghiệp vụ và UI/UX được người dùng theo dõi tại:
👉 **[fix-ui-ux-bugs.md](file:///e:/HuKi/tasks/fix-ui-ux-bugs.md)** (Gồm: Flash Sale quote, nút Yêu thích, Ebook DRM sidebar, vòng lặp redirect loop, lộ lọt secrets,...).

---

## 🎯 DANH SÁCH LỖI MỚI PHÁT SINH CẦN XỬ LÝ
Mọi lỗi phát sinh trong quá trình quét được lưu trữ tập trung tại:
👉 **[bug.md](file:///e:/HuKi/tasks/bug.md)** (Tuân thủ nghiêm ngặt: hỏi xác nhận từ người dùng trước khi sửa bất kỳ dòng code nào).

