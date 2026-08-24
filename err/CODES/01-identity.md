# Identity Service Error Codes

User, Session errors.

## USER_* - User

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| USER_NOT_FOUND | 404 | Người dùng không tồn tại | Check user ID |
| USER_EMAIL_EXISTS | 409 | Email đã được sử dụng | Use different email |
| USER_PHONE_EXISTS | 409 | Số điện thoại đã được sử dụng | Use different phone |
| USER_PROFILE_INCOMPLETE | 400 | Hồ sơ chưa hoàn thiện | Complete profile |
| USER_BLOCKED | 403 | Tài khoản đã bị khóa | Contact support |

## SESSION_* - Session

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| SESSION_NOT_FOUND | 404 | Phiên không tồn tại | Login again |
| SESSION_EXPIRED | 404 | Phiên đã hết hạn | Login again |
| SESSION_DEVICE_MISMATCH | 401 | Thiết bị không khớp | Verify device |
