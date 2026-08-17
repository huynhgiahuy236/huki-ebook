# 🚨 Error Codes

Danh sách mã lỗi chi tiết.

## Error Code Format

```
{domain}_{type}
```

Example: `AUTH_TOKEN_INVALID`, `BOOK_NOT_FOUND`

## Authentication Errors (AUTH_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| AUTH_TOKEN_INVALID | 401 | Token không hợp lệ |
| AUTH_TOKEN_EXPIRED | 401 | Token đã hết hạn |
| AUTH_TOKEN_MISSING | 401 | Vui lòng đăng nhập |
| AUTH_TOKEN_REFRESH_FAILED | 401 | Không thể làm mới token |
| AUTH_LOGIN_FAILED | 401 | Đăng nhập thất bại |
| AUTH_LOGIN_INVALID_CREDENTIALS | 401 | Email hoặc mật khẩu không đúng |
| AUTH_LOGIN_ACCOUNT_BLOCKED | 401 | Tài khoản đã bị khóa |
| AUTH_LOGIN_ACCOUNT_PENDING | 401 | Tài khoản đang chờ xác minh |
| AUTH_REGISTER_FAILED | 400 | Đăng ký thất bại |
| AUTH_EMAIL_EXISTS | 409 | Email đã được sử dụng |
| AUTH_PASSWORD_WEAK | 400 | Mật khẩu không đủ mạnh |
| AUTH_PASSWORD_INCORRECT | 400 | Mật khẩu hiện tại không đúng |
| AUTH_PASSWORD_SAME | 400 | Mật khẩu mới trùng với mật khẩu cũ |
| AUTH_RESET_TOKEN_INVALID | 400 | Liên kết đặt lại mật khẩu không hợp lệ |
| AUTH_RESET_TOKEN_EXPIRED | 400 | Liên kết đặt lại mật khẩu đã hết hạn |

## Authorization Errors (AUTHZ_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| AUTHZ_FORBIDDEN | 403 | Bạn không có quyền thực hiện thao tác này |
| AUTHZ_ROLE_INSUFFICIENT | 403 | Vai trò không đủ quyền |
| AUTHZ_NOT_OWNER | 403 | Bạn không phải chủ sở hữu |
| AUTHZ_NOT_MEMBER | 403 | Bạn không phải thành viên của doanh nghiệp này |
| AUTHZ_BUSINESS_SUSPENDED | 403 | Doanh nghiệp đang bị tạm ngưng |

## User Errors (USER_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| USER_NOT_FOUND | 404 | Người dùng không tồn tại |
| USER_EMAIL_EXISTS | 409 | Email đã được sử dụng |
| USER_PHONE_EXISTS | 409 | Số điện thoại đã được sử dụng |
| USER_PROFILE_INCOMPLETE | 400 | Hồ sơ chưa hoàn thiện |
| USER_BLOCKED | 403 | Tài khoản đã bị khóa |

## Business Errors (BUSINESS_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| BUSINESS_NOT_FOUND | 404 | Doanh nghiệp không tồn tại |
| BUSINESS_ALREADY_EXISTS | 409 | Doanh nghiệp đã tồn tại |
| BUSINESS_REGISTRY_NOT_FOUND | 400 | Mã doanh nghiệp không tìm thấy trong hệ thống |
| BUSINESS_REGISTRY_MISMATCH | 400 | Thông tin không khớp với đăng ký kinh doanh |
| BUSINESS_TAX_CODE_EXISTS | 409 | Mã số thuế đã được sử dụng |
| BUSINESS_ENTERPRISE_CODE_EXISTS | 409 | Mã doanh nghiệp đã được sử dụng |
| BUSINESS_NOT_APPROVED | 400 | Doanh nghiệp chưa được duyệt |
| BUSINESS_SUSPENDED | 403 | Doanh nghiệp đang bị tạm ngưng |
| BUSINESS_CANNOT_DELETE | 400 | Không thể xóa doanh nghiệp đang hoạt động |
| BUSINESS_LEGAL_INFO_LOCKED | 400 | Thông tin pháp lý đã bị khóa |

## Store Errors (STORE_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| STORE_NOT_FOUND | 404 | Cửa hàng không tồn tại |
| STORE_ALREADY_EXISTS | 409 | Cửa hàng đã tồn tại |
| STORE_SLUG_EXISTS | 409 | URL cửa hàng đã được sử dụng |
| STORE_NOT_ACTIVE | 400 | Cửa hàng không hoạt động |
| STORE_SUSPENDED | 403 | Cửa hàng đang bị tạm ngưng |
| STORE_CANNOT_DELETE | 400 | Không thể xóa cửa hàng có đơn hàng |

## Book Errors (BOOK_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| BOOK_NOT_FOUND | 404 | Sách không tìm thấy |
| BOOK_NOT_PUBLISHED | 400 | Sách chưa được xuất bản |
| BOOK_ARCHIVED | 400 | Sách đã bị lưu trữ |
| BOOK_HIDDEN | 400 | Sách đang bị ẩn |
| BOOK_SUSPENDED | 403 | Sách đang bị khóa |
| BOOK_SLUG_EXISTS | 409 | URL sách đã được sử dụng |
| BOOK_ISBN_EXISTS | 409 | ISBN đã được sử dụng |
| BOOK_NOT_FROM_STORE | 403 | Sách không thuộc cửa hàng này |
| BOOK_FORMAT_NOT_AVAILABLE | 400 | Định dạng không khả dụng |
| BOOK_COVER_REQUIRED | 400 | Vui lòng tải lên ảnh bìa |
| BOOK_FILE_REQUIRED | 400 | Vui lòng tải lên file sách |
| BOOK_PRICE_INVALID | 400 | Giá không hợp lệ |

## Inventory Errors (INVENTORY_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| INVENTORY_NOT_FOUND | 404 | Không tìm thấy thông tin tồn kho |
| INVENTORY_INSUFFICIENT | 422 | Số lượng trong kho không đủ |
| INVENTORY_NEGATIVE | 422 | Số lượng không thể âm |
| INVENTORY_RESERVATION_FAILED | 422 | Không thể giữ hàng |
| INVENTORY_RESERVATION_EXPIRED | 400 | Thời gian giữ hàng đã hết |

## Cart Errors (CART_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| CART_NOT_FOUND | 404 | Giỏ hàng trống |
| CART_ITEM_NOT_FOUND | 404 | Sản phẩm không có trong giỏ hàng |
| CART_ITEM_EXISTS | 409 | Sản phẩm đã có trong giỏ hàng |
| CART_DIGITAL_ALREADY_OWNED | 409 | Bạn đã sở hữu sách này |
| CART_MAX_ITEMS | 400 | Số lượng sản phẩm vượt quá giới hạn |
| CART_QUANTITY_INVALID | 400 | Số lượng không hợp lệ |

## Checkout Errors (CHECKOUT_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| CHECKOUT_CART_EMPTY | 400 | Giỏ hàng trống |
| CHECKOUT_SESSION_EXPIRED | 400 | Phiên thanh toán đã hết hạn |
| CHECKOUT_SHIPPING_REQUIRED | 400 | Vui lòng nhập địa chỉ giao hàng |
| CHECKOUT_SHIPPING_INVALID | 400 | Địa chỉ giao hàng không hợp lệ |
| CHECKOUT_QUOTE_EXPIRED | 400 | Báo giá vận chuyển đã hết hạn |
| CHECKOUT_QUOTE_UNAVAILABLE | 400 | Dịch vụ vận chuyển không khả dụng |
| CHECKOUT_PAYMENT_REQUIRED | 400 | Vui lòng chọn phương thức thanh toán |
| CHECKOUT_DIGITAL_COD_NOT_ALLOWED | 400 | Không hỗ trợ COD cho sách điện tử |

## Order Errors (ORDER_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| ORDER_NOT_FOUND | 404 | Đơn hàng không tìm thấy |
| ORDER_ALREADY_PAID | 400 | Đơn hàng đã thanh toán |
| ORDER_ALREADY_CANCELLED | 400 | Đơn hàng đã bị hủy |
| ORDER_ALREADY_COMPLETED | 400 | Đơn hàng đã hoàn thành |
| ORDER_CANNOT_CANCEL | 400 | Không thể hủy đơn hàng |
| ORDER_NOT_FROM_USER | 403 | Đơn hàng không thuộc về bạn |
| ORDER_NOT_FROM_STORE | 403 | Đơn hàng không thuộc cửa hàng này |
| ORDER_STATUS_TRANSITION_INVALID | 400 | Trạng thái đơn hàng không hợp lệ |

## Payment Errors (PAYMENT_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| PAYMENT_NOT_FOUND | 404 | Thanh toán không tìm thấy |
| PAYMENT_FAILED | 400 | Thanh toán thất bại |
| PAYMENT_TIMEOUT | 400 | Hết thời gian thanh toán |
| PAYMENT_CANCELLED | 400 | Thanh toán đã bị hủy |
| PAYMENT_ALREADY_PROCESSED | 400 | Thanh toán đã được xử lý |
| PAYMENT_AMOUNT_MISMATCH | 400 | Số tiền không khớp |
| PAYMENT_SIGNATURE_INVALID | 400 | Chữ ký thanh toán không hợp lệ |
| PAYMENT_WEBHOOK_FAILED | 500 | Không thể xử lý thanh toán |

## Refund Errors (REFUND_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| REFUND_NOT_FOUND | 404 | Yêu cầu hoàn tiền không tìm thấy |
| REFUND_NOT_ALLOWED | 400 | Không cho phép hoàn tiền |
| REFUND_AMOUNT_INVALID | 400 | Số tiền hoàn không hợp lệ |
| REFUND_EXCEEDS_PAID | 400 | Số tiền hoàn vượt quá số đã thanh toán |
| REFUND_ALREADY_PROCESSED | 400 | Hoàn tiền đã được xử lý |

## Voucher Errors (VOUCHER_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| VOUCHER_NOT_FOUND | 404 | Mã giảm giá không tìm thấy |
| VOUCHER_EXPIRED | 400 | Mã giảm giá đã hết hạn |
| VOUCHER_NOT_STARTED | 400 | Mã giảm giá chưa có hiệu lực |
| VOUCHER_EXHAUSTED | 400 | Mã giảm giá đã hết lượt sử dụng |
| VOUCHER_LIMIT_REACHED | 400 | Bạn đã sử dụng hết lượt |
| VOUCHER_NOT_APPLICABLE | 400 | Mã giảm giá không áp dụng cho đơn hàng này |
| VOUCHER_MIN_ORDER_NOT_MET | 400 | Đơn hàng chưa đạt giá trị tối thiểu |
| VOUCHER_STACKING_NOT_ALLOWED | 400 | Không thể áp dụng cùng lúc với mã khác |

## Library Errors (LIBRARY_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| LIBRARY_ACCESS_DENIED | 403 | Bạn không có quyền truy cập sách này |
| LIBRARY_BOOK_NOT_FOUND | 404 | Sách không có trong thư viện |
| LIBRARY_ALREADY_GRANTED | 409 | Bạn đã có quyền truy cập sách này |
| LIBRARY_ACCESS_REVOKED | 403 | Quyền truy cập đã bị thu hồi |
| LIBRARY_FILE_NOT_FOUND | 404 | File sách không tìm thấy |

## Review Errors (REVIEW_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| REVIEW_NOT_FOUND | 404 | Đánh giá không tìm thấy |
| REVIEW_ALREADY_EXISTS | 409 | Bạn đã đánh giá rồi |
| REVIEW_PURCHASE_REQUIRED | 400 | Bạn cần mua sách trước khi đánh giá |
| REVIEW_CANNOT_EDIT | 400 | Không thể sửa đánh giá |
| REVIEW_MODERATED | 400 | Đánh giá đang được kiểm duyệt |

## Forum Errors (FORUM_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| FORUM_POST_NOT_FOUND | 404 | Bài viết không tìm thạy |
| FORUM_POST_LOCKED | 400 | Bài viết đã bị khóa |
| FORUM_POST_DELETED | 410 | Bài viết đã bị xóa |
| FORUM_COMMENT_NOT_FOUND | 404 | Bình luận không tìm thấy |
| FORUM_REPORT_EXISTS | 409 | Bạn đã báo cáo rồi |

## Chat Errors (CHAT_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| CHAT_CONVERSATION_NOT_FOUND | 404 | Cuộc trò chuyện không tìm thấy |
| CHAT_MESSAGE_NOT_FOUND | 404 | Tin nhắn không tìm thấy |
| CHAT_BLOCKED | 403 | Bạn đã bị chặn |
| CHAT_BUSINESS_SUSPENDED | 403 | Cửa hàng đang bị tạm ngưng |
| CHAT_MESSAGE_TOO_LONG | 400 | Tin nhắn quá dài |

## Validation Errors (VALIDATION_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| VALIDATION_ERROR | 400 | Dữ liệu không hợp lệ |
| VALIDATION_REQUIRED | 400 | Trường bắt buộc |
| VALIDATION_EMAIL | 400 | Email không hợp lệ |
| VALIDATION_PHONE | 400 | Số điện thoại không hợp lệ |
| VALIDATION_URL | 400 | URL không hợp lệ |
| VALIDATION_MIN_LENGTH | 400 | Quá ngắn |
| VALIDATION_MAX_LENGTH | 400 | Quá dài |
| VALIDATION_MIN_VALUE | 400 | Giá trị quá nhỏ |
| VALIDATION_MAX_VALUE | 400 | Giá trị quá lớn |
| VALIDATION_PATTERN | 400 | Định dạng không hợp lệ |

## Rate Limit Errors (RATE_LIMIT_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| RATE_LIMIT_EXCEEDED | 429 | Quá nhiều yêu cầu. Vui lòng thử lại sau |
| RATE_LIMIT_LOGIN | 429 | Đăng nhập thất bại nhiều lần. Vui lòng thử lại sau |
| RATE_LIMIT_REGISTER | 429 | Đăng ký quá nhiều lần. Vui lòng thử lại sau |

## System Errors (SYSTEM_*)

| Code | HTTP Status | Vietnamese Message |
|------|-------------|-------------------|
| SYSTEM_ERROR | 500 | Có lỗi xảy ra. Vui lòng thử lại sau |
| SYSTEM_MAINTENANCE | 503 | Hệ thống đang bảo trì |
| SYSTEM_UNAVAILABLE | 503 | Dịch vụ tạm thời không khả dụng |
| SYSTEM_DATABASE_ERROR | 500 | Lỗi cơ sở dữ liệu |
| SYSTEM_EXTERNAL_SERVICE_ERROR | 502 | Dịch vụ bên ngoài không khả dụng |
