# 🚀 SIÊU KẾ HOẠCH TEST TOÀN DIỆN E2E SÀN HUKI EBOOK (CHUẨN SHOPEE / LAZADA)

> **Mục tiêu:** Kiểm thử toàn bộ mọi tính năng, ngóc ngách của nền tảng HuKi Ebook theo đúng hành trình thực tế của người dùng và người bán trên các sàn TMĐT lớn (Shopee, Lazada, Tiki).
> **Nguyên tắc bất di bất dịch:**
> 1. ❌ **KHÔNG MOCK DATA:** 100% dữ liệu thực từ PostgreSQL, Redis, Microservices và API Gateway trên `http://localhost:3000/api/v1`.
> 2. ❌ **KHÔNG TEST QUA LOA:** Kiểm tra sâu từng trường dữ liệu, status code, tính toán tiền tệ, quota mã giảm giá, tồn kho.
> 3. 📂 **SCRIPT TẬP TRUNG TẠI FOLDER:** `e:\HuKi\scripts\`.
> 4. 🛑 **HƯ LÀ BÁO NGAY:** Nếu gặp lỗi, ghi nhận chính xác mã lỗi / HTTP status / payload và dừng lại báo cáo người dùng. KHÔNG tự ý sửa code khi chưa có lệnh!
> 5. 🔒 **KHÔNG ĐỤNG VÀO GIT:** Không commit, không checkout, không can thiệp git history.
> 6. 🛒 **ÁP DỤNG CHUẨN LOGIC SHOPEE / LAZADA:** Luồng mua hàng, phân cụm giỏ hàng theo Store, gom mã giảm giá sàn + shop, ví Escrow đảm bảo, đơn vị vận chuyển, RMA trả hàng và hoa hồng Affiliate.
> 7. 🎯 **CHẠY TỪNG BƯỚC VÀ DỪNG LẠI:** Chạy xong mỗi Phase thì dừng lại để người dùng trực tiếp kiểm tra trên trình duyệt `http://localhost:3100`.
> 8. 📊 **ĐÁNH GIÁ TỔNG THỂ WEB:** Sau khi hoàn tất toàn bộ các bước, tiến hành tổng kết và chấm điểm toàn diện chất lượng sàn HuKi.

---

## 🗺️ MA TRẬN 8 GIAI ĐOẠN KIỂM THỬ (PHASE 1 -> 8)

| Phase | Tên Giai Đoạn | Nghiệp Vụ Cụ Thể (Chuẩn Shopee / Lazada) | Script Thực Thi | Tài Liệu Chi Tiết |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Khám phá & Tìm kiếm (Buyer Discovery)** | Trang chủ, danh mục cây, tìm kiếm full-text, bộ lọc đa tầng (giá, định dạng, đánh giá), trang chi tiết sách 3 định dạng (Giấy/Ebook/Combo), trang Shop NXB. | `scripts/e2e-phase1-discovery.mjs` | [PHASE-1-BUYER-DISCOVERY-SEARCH.md](file:///e:/HuKi/task/e2e/PHASE-1-BUYER-DISCOVERY-SEARCH.md) |
| **2** | **Giỏ hàng & Gom mã giảm giá (Cart & Voucher Stacking)** | Thêm sách vào giỏ, giỏ hàng phân cụm theo từng Shop, kiểm tra tồn kho realtime, áp mã giảm giá sàn (Flash sale/Voucher) + mã riêng của Shop, tính tiền tạm tính. | `scripts/e2e-phase2-cart-voucher.mjs` | [PHASE-2-CART-VOUCHER-CALCULATION.md](file:///e:/HuKi/task/e2e/PHASE-2-CART-VOUCHER-CALCULATION.md) |
| **3** | **Đặt hàng, Phí vận chuyển & Tiền Escrow (Checkout & Payment)** | Chọn địa chỉ giao hàng, tính phí vận chuyển theo khoảng cách/trọng lượng, chọn phương thức (COD, Ví HuKi, VNPay/MoMo), trừ tồn kho, giữ tiền ở trạng thái Escrow. | `scripts/e2e-phase3-checkout-payment.mjs` | [PHASE-3-CHECKOUT-PAYMENT-ESCROW.md](file:///e:/HuKi/task/e2e/PHASE-3-CHECKOUT-PAYMENT-ESCROW.md) |
| **4** | **Người bán xác nhận & Xuất kho (Seller Fulfillment)** | Shop nhận thông báo đơn mới realtime, xem chi tiết đơn hàng, in phiếu giao, đóng gói, bàn giao hàng cho Shipper, cập nhật trạng thái In-Transit. | `scripts/e2e-phase4-seller-fulfillment.mjs` | [PHASE-4-SELLER-ORDER-FULFILLMENT.md](file:///e:/HuKi/task/e2e/PHASE-4-SELLER-ORDER-FULFILLMENT.md) |
| **5** | **Giao hàng, Xác nhận & Giải ngân Escrow (Delivery & Release)** | Shipper cập nhật giao thành công, Buyer kiểm tra và bấm "Đã nhận được hàng", giải phóng tiền Escrow vào Ví Shop (đã trừ phí sàn), mở tính năng Đánh giá sao & bình luận. | `scripts/e2e-phase5-shipping-release.mjs` | [PHASE-5-SHIPPING-BUYER-ESCROW-RELEASE.md](file:///e:/HuKi/task/e2e/PHASE-5-SHIPPING-BUYER-ESCROW-RELEASE.md) |
| **6** | **Trả hàng, Hoàn tiền & Khiếu nại (RMA & Dispute)** | Buyer yêu cầu trả hàng kèm lý do và ảnh bằng chứng, Shop chấp nhận/khiếu nại, Admin can thiệp phân xử, hoàn tiền về Ví Buyer, hồi phục tồn kho. | `scripts/e2e-phase6-returns-refunds.mjs` | [PHASE-6-RETURNS-REFUNDS-DISPUTE.md](file:///e:/HuKi/task/e2e/PHASE-6-RETURNS-REFUNDS-DISPUTE.md) |
| **7** | **Tiếp thị liên kết (Affiliate & Commission Tracking)** | Tạo link chia sẻ, Buyer mua qua link ref, lưu trữ cookie attribution, ghi nhận hoa hồng Tạm giữ, đối soát hoa hồng thành công khi đơn hoàn tất. | `scripts/e2e-phase7-affiliate-commission.mjs` | [PHASE-7-AFFILIATE-MARKETING-COMMISSION.md](file:///e:/HuKi/task/e2e/PHASE-7-AFFILIATE-MARKETING-COMMISSION.md) |
| **8** | **Tài sản số Ebook DRM & WebReader** | Đơn hàng Ebook thanh toán xong cấp quyền đọc tức thì, gắn chữ ký số DRM (Watermark User ID), mở WebReader lật trang mượt mà, đồng bộ tiến độ đọc. | `scripts/e2e-phase8-ebook-drm-reader.mjs` | [PHASE-8-DIGITAL-ASSET-DRM-WEBREADER.md](file:///e:/HuKi/task/e2e/PHASE-8-DIGITAL-ASSET-DRM-WEBREADER.md) |
| **Tổng kết** | **Báo Cáo & Đánh Giá Toàn Bộ Website** | Bảng chấm điểm UX/UI, độ ổn định microservices, tốc độ phản hồi, bảo mật tài khoản & ví, so sánh hoàn thiện với Shopee/Lazada. | Báo cáo trực tiếp | [PHASE-9-FINAL-ECOMMERCE-EVALUATION.md](file:///e:/HuKi/task/e2e/PHASE-9-FINAL-ECOMMERCE-EVALUATION.md) |

---

## ⚙️ QUY TRÌNH THỰC HIỆN TỪNG BƯỚC:
1. **Khởi chạy script tương ứng của Phase đó.**
2. **Kiểm tra kết quả assertion tự động:**
   - Nếu **FAILED:** Báo ngay lỗi chính xác (Endpoint, Status code, Response body) ➡️ DỪNG LẠI và CHỜ LỆNH người dùng.
   - Nếu **PASSED:** In bảng tổng hợp các testcase thành công ➡️ Cung cấp link và hướng dẫn để người dùng test ngay trên UI.
3. **Người dùng xác nhận OK thì mới tiến hành Phase tiếp theo.**
