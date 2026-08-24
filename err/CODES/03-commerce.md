# Commerce Service Error Codes

Book, Cart, Checkout, Order, Inventory errors.

## BOOK_* - Book

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| BOOK_NOT_FOUND | 404 | Sách không tìm thấy | Check book ID |
| BOOK_NOT_PUBLISHED | 400 | Sách chưa được xuất bản | - |
| BOOK_ARCHIVED | 400 | Sách đã bị lưu trữ | - |
| BOOK_HIDDEN | 400 | Sách đang bị ẩn | - |
| BOOK_SUSPENDED | 403 | Sách đang bị khóa | - |
| BOOK_SLUG_EXISTS | 409 | URL sách đã được sử dụng | Use different slug |
| BOOK_ISBN_EXISTS | 409 | ISBN đã được sử dụng | Use different ISBN |
| BOOK_NOT_FROM_STORE | 403 | Sách không thuộc cửa hàng này | Check book ownership |
| BOOK_FORMAT_NOT_AVAILABLE | 400 | Định dạng không khả dụng | Select available format |
| BOOK_COVER_REQUIRED | 400 | Vui lòng tải lên ảnh bìa | Upload cover |
| BOOK_FILE_REQUIRED | 400 | Vui lòng tải lên file sách | Upload file |
| BOOK_PRICE_INVALID | 400 | Giá không hợp lệ | Enter valid price |

## INVENTORY_* - Inventory

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| INVENTORY_NOT_FOUND | 404 | Không tìm thấy thông tin tồn kho | - |
| INVENTORY_INSUFFICIENT | 422 | Số lượng trong kho không đủ | Reduce quantity |
| INVENTORY_NEGATIVE | 422 | Số lượng không thể âm | Fix inventory |
| INVENTORY_RESERVATION_FAILED | 422 | Không thể giữ hàng | Retry |
| INVENTORY_RESERVATION_EXPIRED | 400 | Thời gian giữ hàng đã hết | Restart checkout |

## CART_* - Cart

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| CART_NOT_FOUND | 404 | Giỏ hàng trống | Add items |
| CART_ITEM_NOT_FOUND | 404 | Sản phẩm không có trong giỏ hàng | - |
| CART_ITEM_EXISTS | 409 | Sản phẩm đã có trong giỏ hàng | Update quantity |
| CART_DIGITAL_ALREADY_OWNED | 409 | Bạn đã sở hữu sách này | - |
| CART_MAX_ITEMS | 400 | Số lượng sản phẩm vượt quá giới hạn | Remove items |
| CART_QUANTITY_INVALID | 400 | Số lượng không hợp lệ | Enter valid quantity |

## CHECKOUT_* - Checkout

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| CHECKOUT_CART_EMPTY | 400 | Giỏ hàng trống | Add items |
| CHECKOUT_SESSION_EXPIRED | 400 | Phiên thanh toán đã hết hạn | Start new checkout |
| CHECKOUT_SHIPPING_REQUIRED | 400 | Vui lòng nhập địa chỉ giao hàng | Enter address |
| CHECKOUT_SHIPPING_INVALID | 400 | Địa chỉ giao hàng không hợp lệ | Fix address |
| CHECKOUT_QUOTE_EXPIRED | 400 | Báo giá vận chuyển đã hết hạn | Get new quote |
| CHECKOUT_QUOTE_UNAVAILABLE | 400 | Dịch vụ vận chuyển không khả dụng | Select different service |
| CHECKOUT_PAYMENT_REQUIRED | 400 | Vui lòng chọn phương thức thanh toán | Select payment method |
| CHECKOUT_DIGITAL_COD_NOT_ALLOWED | 400 | Không hỗ trợ COD cho sách điện tử | Select online payment |
| CHECKOUT_IDEMPOTENCY_CONFLICT | 409 | Yêu cầu đã được xử lý | Use existing order |

## ORDER_* - Order

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| ORDER_NOT_FOUND | 404 | Đơn hàng không tìm thấy | Check order ID |
| ORDER_ALREADY_PAID | 400 | Đơn hàng đã thanh toán | - |
| ORDER_ALREADY_CANCELLED | 400 | Đơn hàng đã bị hủy | - |
| ORDER_ALREADY_COMPLETED | 400 | Đơn hàng đã hoàn thành | - |
| ORDER_CANNOT_CANCEL | 400 | Không thể hủy đơn hàng | Check order status |
| ORDER_NOT_FROM_USER | 403 | Đơn hàng không thuộc về bạn | - |
| ORDER_NOT_FROM_STORE | 403 | Đơn hàng không thuộc cửa hàng này | - |
| ORDER_STATUS_TRANSITION_INVALID | 400 | Trạng thái đơn hàng không hợp lệ | - |
| SELLER_ORDER_NOT_FOUND | 404 | Đơn hàng của cửa hàng không tìm thấy | Check seller order ID |
| SELLER_ORDER_CANNOT_CANCEL | 400 | Không thể hủy đơn hàng của cửa hàng | Check status |

## CATEGORY_* - Category

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| CATEGORY_NOT_FOUND | 404 | Danh mục không tìm thấy | Check category ID |
| CATEGORY_HAS_CHILDREN | 400 | Danh mục có danh mục con | Delete children first |

## AUTHOR_* - Author

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| AUTHOR_NOT_FOUND | 404 | Tác giả không tìm thấy | Check author ID |
| AUTHOR_SLUG_EXISTS | 409 | URL tác giả đã được sử dụng | Use different slug |

## PUBLISHER_* - Publisher

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| PUBLISHER_NOT_FOUND | 404 | Nhà xuất bản không tìm thấy | Check publisher ID |
| PUBLISHER_SLUG_EXISTS | 409 | URL nhà xuất bản đã được sử dụng | Use different slug |

## LIBRARY_* - Book Access

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| LIBRARY_ACCESS_DENIED | 403 | Bạn không có quyền truy cập sách này | Purchase book |
| LIBRARY_BOOK_NOT_FOUND | 404 | Sách không có trong thư viện | - |
| LIBRARY_ALREADY_GRANTED | 409 | Bạn đã có quyền truy cập sách này | - |
| LIBRARY_ACCESS_REVOKED | 403 | Quyền truy cập đã bị thu hồi | Contact support |
| LIBRARY_FILE_NOT_FOUND | 404 | File sách không tìm thấy | Contact support |
