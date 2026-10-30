# 💰 PHASE 7: TIẾP THỊ LIÊN KẾT & ĐỐI SOÁT HOA HỒNG (AFFILIATE MARKETING)

## 🎯 Mục tiêu
Kiểm thử toàn bộ luồng Tiếp thị liên kết (Shopee Affiliate style): đăng ký cộng tác viên, tạo link ref chia sẻ, theo dõi lượt click/chuyển đổi, ghi nhận hoa hồng tạm tính và đối soát hoa hồng thực tế khi đơn hàng thành công.

---

## 🔍 Checklist Kiểm Thử Chi Tiết

### 7.1 Đăng Ký & Quản Lý Link Ref (Affiliate Link Generation)
- [ ] Người dùng gửi đơn đăng ký Tiếp thị liên kết (`POST /api/v1/affiliate/applications`).
- [ ] Admin duyệt hồ sơ affiliate (`POST /api/v1/admin/affiliates/{id}/approve`).
- [ ] Tạo link tiếp thị cho cuốn sách cụ thể (`POST /api/v1/affiliate/links`).
- [ ] Phân giải link tiếp thị (`GET /api/v1/affiliate/resolve/{shortCode}`).

### 7.2 Ghi Nhận Lượt Truy Cập & Đặt Hàng (Click & Order Attribution)
- [ ] Khách hàng khác mở qua link tiếp thị, hệ thống ghi nhận attribution.
- [ ] Khách hàng đặt hàng thành công: Hệ thống liên kết mã tiếp thị vào đơn hàng.
- [ ] Tỷ lệ hoa hồng (% Commission) được tính toán chính xác theo sản phẩm/gian hàng.

### 7.3 Hạch Toán Hoa Hồng (Commission Settlement)
- [ ] Trạng thái hoa hồng ban đầu: `PENDING` (Tạm giữ) – Kiểm tra qua (`GET /api/v1/affiliate/wallet`).
- [ ] Khi đơn hàng chuyển sang trạng thái `COMPLETED`: Hoa hồng được tính toán chuyển sang khả dụng sau đối soát (`POST /api/v1/admin/affiliates/settlement/trigger`).
- [ ] Người làm affiliate có thể gửi yêu cầu rút tiền (`POST /api/v1/affiliate/payouts`).

---

## 🛠️ Script thực thi
Script: [scripts/e2e-phase7-affiliate-commission.mjs](file:///e:/HuKi/scripts/e2e-phase7-affiliate-commission.mjs)
Lệnh chạy: `node scripts/e2e-phase7-affiliate-commission.mjs`
