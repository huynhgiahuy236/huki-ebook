# Common Error Codes

Authentication, Validation, System errors.

## AUTH_* - Authentication (401)

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| AUTH_TOKEN_INVALID | 401 | Token không hợp lệ | Refresh token |
| AUTH_TOKEN_EXPIRED | 401 | Token đã hết hạn | Refresh token |
| AUTH_TOKEN_MISSING | 401 | Vui lòng đăng nhập | Redirect login |
| AUTH_TOKEN_REFRESH_FAILED | 401 | Không thể làm mới token | Redirect login |
| AUTH_LOGIN_FAILED | 401 | Đăng nhập thất bại | Check credentials |
| AUTH_LOGIN_INVALID_CREDENTIALS | 401 | Email hoặc mật khẩu không đúng | Check credentials |
| AUTH_LOGIN_ACCOUNT_BLOCKED | 401 | Tài khoản đã bị khóa | Contact support |
| AUTH_LOGIN_ACCOUNT_PENDING | 401 | Tài khoản đang chờ xác minh | Check email verification |
| AUTH_REGISTER_FAILED | 400 | Đăng ký thất bại | Retry registration |
| AUTH_EMAIL_EXISTS | 409 | Email đã được sử dụng | Use different email |
| AUTH_PASSWORD_WEAK | 400 | Mật khẩu không đủ mạnh | Provide stronger password |
| AUTH_PASSWORD_INCORRECT | 400 | Mật khẩu hiện tại không đúng | Retry with correct password |
| AUTH_PASSWORD_SAME | 400 | Mật khẩu mới trùng với mật khẩu cũ | Choose different password |
| AUTH_RESET_TOKEN_INVALID | 400 | Liên kết đặt lại mật khẩu không hợp lệ | Request new reset link |
| AUTH_RESET_TOKEN_EXPIRED | 400 | Liên kết đặt lại mật khẩu đã hết hạn | Request new reset link |

## AUTHZ_* - Authorization (403)

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| AUTHZ_FORBIDDEN | 403 | Bạn không có quyền thực hiện thao tác này | Request permission |
| AUTHZ_ROLE_INSUFFICIENT | 403 | Vai trò không đủ quyền | Upgrade role |
| AUTHZ_NOT_OWNER | 403 | Bạn không phải chủ sở hữu | - |
| AUTHZ_NOT_MEMBER | 403 | Bạn không phải thành viên của doanh nghiệp này | Join business |
| AUTHZ_BUSINESS_SUSPENDED | 403 | Doanh nghiệp đang bị tạm ngưng | Contact support |

## VALIDATION_* - Validation (400)

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| VALIDATION_ERROR | 400 | Dữ liệu không hợp lệ | Fix input |
| VALIDATION_REQUIRED | 400 | Trường bắt buộc | Fill required field |
| VALIDATION_EMAIL | 400 | Email không hợp lệ | Enter valid email |
| VALIDATION_PHONE | 400 | Số điện thoại không hợp lệ | Enter valid phone |
| VALIDATION_URL | 400 | URL không hợp lệ | Enter valid URL |
| VALIDATION_MIN_LENGTH | 400 | Quá ngắn | Enter longer value |
| VALIDATION_MAX_LENGTH | 400 | Quá dài | Enter shorter value |
| VALIDATION_MIN_VALUE | 400 | Giá trị quá nhỏ | Enter larger value |
| VALIDATION_MAX_VALUE | 400 | Giá trị quá lớn | Enter smaller value |
| VALIDATION_PATTERN | 400 | Định dạng không hợp lệ | Match required format |

## RATE_LIMIT_* - Rate Limit (429)

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| RATE_LIMIT_EXCEEDED | 429 | Quá nhiều yêu cầu | Wait and retry |
| RATE_LIMIT_LOGIN | 429 | Đăng nhập thất bại nhiều lần | Wait 15 minutes |
| RATE_LIMIT_REGISTER | 429 | Đăng ký quá nhiều lần | Wait 15 minutes |

## SYSTEM_* - System (5xx)

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| SYSTEM_ERROR | 500 | Có lỗi xảy ra | Retry later |
| SYSTEM_MAINTENANCE | 503 | Hệ thống đang bảo trì | Check status page |
| SYSTEM_UNAVAILABLE | 503 | Dịch vụ tạm thời không khả dụng | Retry later |
| SYSTEM_DATABASE_ERROR | 500 | Lỗi cơ sở dữ liệu | Retry later |
| SYSTEM_EXTERNAL_SERVICE_ERROR | 502 | Dịch vụ bên ngoài không khả dụng | Retry later |
| SYSTEM_INTERNAL_ERROR | 500 | Lỗi nội bộ | Contact support |
