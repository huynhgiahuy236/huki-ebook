# POL-17 — Tax, Financial Invoicing & Compliance Policy

## 1. Purpose
Quy định về cấu trúc dữ liệu và quy trình xuất hóa đơn giá trị gia tăng điện tử (Electronic VAT Invoice) cho người mua hàng, nghĩa vụ thuế đối với phí dịch vụ sàn của Sàn Huki, và cơ chế khấu trừ/kê khai thuế thu nhập của thương nhân theo quy định của pháp luật thuế Việt Nam.

## 2. Scope
- Áp dụng cho các yêu cầu xuất hóa đơn VAT từ người mua doanh nghiệp hoặc cá nhân trên HUKI EBOOK.
- Áp dụng cho kế toán tài chính của Sàn Huki đối với phần doanh thu thu phí dịch vụ sàn (`POL-14`).

## 3. Actors
- **Invoice Requester (Buyer)**: Khách hàng có nhu cầu nhận hóa đơn GTGT điện tử cho đơn hàng.
- **Merchant (Product Seller)**: Người bán có nghĩa vụ xuất hóa đơn tiền hàng cho khách (hoặc ủy quyền cho sàn nếu có thỏa thuận).
- **Platform Finance Team**: Bộ phận kế toán sàn xuất hóa đơn phí dịch vụ sàn cho Merchant.
- **E-Invoice Gateway (Proposed)**: Cổng hóa đơn điện tử tích hợp tự động (VNPT/Viettel/MISA E-Invoice).

## 4. Definitions
- **Electronic VAT Invoice (Hóa đơn GTGT điện tử)**: Hóa đơn có mã hoặc không có mã của cơ quan thuế được phát hành theo Nghị định 123/2020/NĐ-CP và Thông tư 78/2021/TT-BTC.
- **Platform Fee Invoice**: Hóa đơn GTGT do Sàn Huki xuất cho Merchant đối với khoản phí dịch vụ sàn 15% đã khấu trừ.
- **Tax Data Schema**: Tập hợp các trường dữ liệu bắt buộc để xuất hóa đơn: Tên công ty, Mã số thuế (MST), Địa chỉ trụ sở, Email nhận hóa đơn.

## 5. Preconditions
- Sub-Order của khách hàng đã ở trạng thái hoàn thành `COMPLETED` (`POL-07`, `POL-14`) và không có khiếu nại đổi trả.
- Khách hàng đã tích chọn "Yêu cầu xuất hóa đơn GTGT" và điền đầy đủ thông tin hóa đơn tại bước Checkout.

## 6. Business Rules

### TAX-001: Sub-Order Level VAT Invoice Request Structure
- **Rule Status**: `CANONICAL` (Cấu trúc trường dữ liệu) / `PROPOSED` (Quy trình tự động xuất hóa đơn theo `DEC-003`)
- **Evidence Status**: `PASS`
- Khách hàng có quyền yêu cầu xuất hóa đơn GTGT cho từng Sub-Order riêng biệt.
- Hệ thống bắt buộc lưu trữ trường dữ liệu `invoice_request` gắn liền với Sub-Order bao gồm:
  - `company_name`: Tên đơn vị mua hàng (Tối đa 255 ký tự).
  - `tax_id`: Mã số thuế doanh nghiệp hợp lệ (10 hoặc 13 chữ số).
  - `company_address`: Địa chỉ trụ sở ghi trên ĐKKD.
  - `recipient_email`: Email chính thức nhận file hóa đơn điện tử XML/PDF.
- Giá trị ghi trên hóa đơn GTGT tiền hàng là số tiền thực tế khách hàng đã thanh toán cho sản phẩm (`Net Paid Amount`), không bao gồm các khoản giảm giá do Sàn tài trợ trừ khi có quy định bù trừ riêng.

### TAX-002: Platform Commission VAT & Tax Compliance
- **Rule Status**: `CANONICAL` (Kê khai phí sàn) / `PROPOSED` (Khấu trừ thuế sàn theo `GAP-005`)
- **Evidence Status**: `PASS`
- Đối với khoản Phí hoa hồng sàn 15% (`FEE-001` trong `POL-14`), Sàn Huki có nghĩa vụ xuất hóa đơn GTGT dịch vụ sàn cho Merchant:
  - Thuế suất VAT dịch vụ sàn: Theo quy định hiện hành (8% hoặc 10%).
  - Hóa đơn phí dịch vụ sàn được tổng hợp định kỳ hàng tháng (Monthly Statement) và gửi về Email đăng ký của Merchant.
- Tuân thủ trách nhiệm cung cấp thông tin thương nhân và doanh thu định kỳ cho Tổng cục Thuế theo Nghị định 126/2020/NĐ-CP và Thông tư 100/2021/TT-BTC.

## 7. State Machine
```
[CHECKOUT_INVOICE_REQUESTED]
             |
   (Sub-Order Completed - POL-07)
             |
             v
   [INVOICE_PENDING_ISSUANCE]
             |
             +---> (Automated E-Invoice API - DEC-003 Option A) ---> [INVOICE_ISSUED] (PDF/XML Sent)
             |
             +---> (Manual Merchant Portal - DEC-003 Option B) ----> [MERCHANT_UPLOADED_INVOICE]
```

## 8. Validation Rules
- Mã số thuế phải vượt qua hàm kiểm tra thuật toán định dạng của Tổng cục Thuế (10 số hoặc 13 số có dấu gạch nối).
- Email nhận hóa đơn phải đúng chuẩn RFC 5322.

## 9. Financial Impact
- **Impact Level**: `DIRECT`
- Quyết định việc hạch toán thuế GTGT đầu ra, thuế GTGT đầu vào và đối soát nghĩa vụ thuế với cơ quan nhà nước.

## 10. Edge Cases
- **EC-001**: Khách hàng yêu cầu hủy đơn hoặc trả hàng sau khi hóa đơn GTGT đã được phát hành. Merchant và Sàn phải tiến hành lập Biên bản điều chỉnh/hủy hóa đơn điện tử theo quy định của Thông tư 78/2021/TT-BTC trước khi thực hiện hoàn tiền.
- **EC-002**: Thông tin MST của khách hàng bị sai lệch không tra cứu được trên cổng Tổng cục Thuế. Đơn hàng vẫn được giao bình thường nhưng trạng thái hóa đơn chuyển sang `INVOICE_INFO_INVALID`, thông báo khách hàng cập nhật lại trong 48 giờ.

## 11. Security & Fraud
- Kiểm tra tính xác thực của mã số thuế qua cơ sở dữ liệu doanh nghiệp để ngăn ngừa hành vi sử dụng MST của đơn vị khác để hợp thức hóa chi phí.

## 12. SLA / Timing
- Thời hạn xuất và gửi hóa đơn điện tử cho khách hàng: Trong vòng 72 giờ làm việc kể từ khi Sub-Order chuyển trạng thái `COMPLETED`.
- Thời hạn gửi bảng kê hóa đơn phí dịch vụ sàn cho Merchant: Ngày 05 hàng tháng cho kỳ doanh thu tháng trước.

## 13. Notifications
- Gửi Email đính kèm đường link tra cứu và tải file hóa đơn điện tử (.pdf và .xml) cho khách hàng.

## 14. Audit & Compliance
- Tuân thủ Luật Quản lý thuế số 38/2019/QH14, Nghị định 123/2020/NĐ-CP và Nghị định 126/2020/NĐ-CP.
- Lưu trữ dữ liệu hóa đơn điện tử tối thiểu 10 năm theo Luật Kế toán.

## 15. Dependencies
- **Upstream**: `POL-07` (Sub-Order Completed Net Amount), `POL-14` (Escrow Settlement & Fee Deduction).
- **Downstream**: `POL-15` (Seller Financial Reporting).

## 16. Canonical Source
- **Legacy Policy**: POL-18 (Financial Invoicing & Tax Compliance).
- **Business Flows**: `res-flow-18.md` (VAT Invoicing & Tax Compliance Workflow).
- **Engineering Phase**: `PHASE-08-FINANCE.md`, `PHASE-10-PRODUCTION.md`.
- **Source Modules**: `platform/src/modules/finance/tax/`, `platform/src/modules/invoices/`.

## 17. Related Flows
- `res-flow-18.md`: Luồng thu thập thông tin hóa đơn, xuất hóa đơn điện tử và báo cáo thuế.

## 18. Related Engineering Phases
- `PHASE-08-FINANCE.md`: Triển khai Invoice Request Data Schema và Monthly Commission Statement Generator.
- `PHASE-10-PRODUCTION.md`: Tích hợp E-Invoice API Gateway.

## 19. Open Decisions
- **DEC-003**: Phương thức xuất hóa đơn điện tử tự động qua API cổng trung gian vs Xuất thủ công trên portal (`Status: DECISION_REQUIRED`).
- **GAP-005**: Quy trình khấu trừ và kê khai thuế TNCN/GTGT hộ thương nhân cá nhân trên sàn TMĐT theo Thông tư 40/2021/TT-BTC (`Status: DECISION_REQUIRED`).

## 20. Change History
- **Version**: 1.0
- **Status**: CANONICAL DOCUMENT CREATED
- **Source**: CANONICAL POLICY ID MAP v1.1
