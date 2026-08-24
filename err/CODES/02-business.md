# Business Service Error Codes

Business, Store, Member errors.

## BUSINESS_* - Business

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| BUSINESS_NOT_FOUND | 404 | Doanh nghiệp không tồn tại | Check business ID |
| BUSINESS_ALREADY_EXISTS | 409 | Doanh nghiệp đã tồn tại | - |
| BUSINESS_REGISTRY_NOT_FOUND | 400 | Mã doanh nghiệp không tìm thấy | Verify registry code |
| BUSINESS_REGISTRY_MISMATCH | 400 | Thông tin không khớp với đăng ký kinh doanh | Verify info |
| BUSINESS_TAX_CODE_EXISTS | 409 | Mã số thuế đã được sử dụng | Use different code |
| BUSINESS_ENTERPRISE_CODE_EXISTS | 409 | Mã doanh nghiệp đã được sử dụng | Use different code |
| BUSINESS_NOT_APPROVED | 400 | Doanh nghiệp chưa được duyệt | Wait for approval |
| BUSINESS_SUSPENDED | 403 | Doanh nghiệp đang bị tạm ngưng | Contact support |
| BUSINESS_CANNOT_DELETE | 400 | Không thể xóa doanh nghiệp đang hoạt động | Close business first |
| BUSINESS_LEGAL_INFO_LOCKED | 400 | Thông tin pháp lý đã bị khóa | Contact support |

## STORE_* - Store

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| STORE_NOT_FOUND | 404 | Cửa hàng không tồn tại | Check store ID |
| STORE_ALREADY_EXISTS | 409 | Cửa hàng đã tồn tại | - |
| STORE_SLUG_EXISTS | 409 | URL cửa hàng đã được sử dụng | Use different slug |
| STORE_NOT_ACTIVE | 400 | Cửa hàng không hoạt động | Activate store |
| STORE_SUSPENDED | 403 | Cửa hàng đang bị tạm ngưng | Contact support |
| STORE_CANNOT_DELETE | 400 | Không thể xóa cửa hàng có đơn hàng | Complete orders first |

## MEMBER_* - Member

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| MEMBER_NOT_FOUND | 404 | Thành viên không tồn tại | Check member ID |
| MEMBER_ALREADY_EXISTS | 409 | Thành viên đã tồn tại | - |
| MEMBER_INVITATION_EXPIRED | 400 | Lời mời đã hết hạn | Request new invitation |
| MEMBER_INVITATION_INVALID | 400 | Lời mời không hợp lệ | Check invitation |
| MEMBER_CANNOT_LEAVE | 400 | Không thể rời khỏi | Owner cannot leave |
| MEMBER_ROLE_IMMUTABLE | 400 | Không thể thay đổi vai trò | - |
