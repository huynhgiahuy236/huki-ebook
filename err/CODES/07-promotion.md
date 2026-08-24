# Promotion Service Error Codes

Voucher, Banner, Flash Sale errors.

## VOUCHER_* - Voucher

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| VOUCHER_NOT_FOUND | 404 | Mã giảm giá không tìm thấy | Check voucher code |
| VOUCHER_EXPIRED | 400 | Mã giảm giá đã hết hạn | - |
| VOUCHER_NOT_STARTED | 400 | Mã giảm giá chưa có hiệu lực | Wait for start date |
| VOUCHER_EXHAUSTED | 400 | Mã giảm giá đã hết lượt sử dụng | - |
| VOUCHER_LIMIT_REACHED | 400 | Bạn đã sử dụng hết lượt | - |
| VOUCHER_NOT_APPLICABLE | 400 | Mã giảm giá không áp dụng cho đơn hàng này | Check eligibility |
| VOUCHER_MIN_ORDER_NOT_MET | 400 | Đơn hàng chưa đạt giá trị tối thiểu | Add more items |
| VOUCHER_STACKING_NOT_ALLOWED | 400 | Không thể áp dụng cùng lúc với mã khác | Remove other voucher |
| VOUCHER_CODE_EXISTS | 409 | Mã giảm giá đã tồn tại | Use different code |

## BANNER_* - Banner

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| BANNER_NOT_FOUND | 404 | Banner không tìm thấy | Check banner ID |
| BANNER_INVALID_DATE_RANGE | 400 | Ngày bắt đầu phải trước ngày kết thúc | Fix date range |

## FLASH_SALE_* - Flash Sale

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| FLASH_SALE_NOT_FOUND | 404 | Flash sale không tìm thấy | Check flash sale ID |
| FLASH_SALE_NOT_ACTIVE | 400 | Flash sale không hoạt động | Wait for active period |
| FLASH_SALE_ITEM_NOT_FOUND | 404 | Sản phẩm flash sale không tìm thấy | Check item ID |
| FLASH_SALE_STOCK_EXHAUSTED | 400 | Hết hàng flash sale | Wait for restock |
| FLASH_SALE_USER_LIMIT_REACHED | 400 | Bạn đã mua hết số lượng cho phép | - |
