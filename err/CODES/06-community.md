# Community Service Error Codes

Forum, Chat, Review, Notification, Moderation errors.

## FORUM_* - Forum

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| FORUM_POST_NOT_FOUND | 404 | Bài viết không tìm thấy | Check post ID |
| FORUM_POST_LOCKED | 400 | Bài viết đã bị khóa | - |
| FORUM_POST_DELETED | 410 | Bài viết đã bị xóa | - |
| FORUM_COMMENT_NOT_FOUND | 404 | Bình luận không tìm thấy | Check comment ID |
| FORUM_REPORT_EXISTS | 409 | Bạn đã báo cáo rồi | - |

## CHAT_* - Chat

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| CHAT_CONVERSATION_NOT_FOUND | 404 | Cuộc trò chuyện không tìm thấy | Check conversation ID |
| CHAT_MESSAGE_NOT_FOUND | 404 | Tin nhắn không tìm thấy | Check message ID |
| CHAT_BLOCKED | 403 | Bạn đã bị chặn | Contact user |
| CHAT_BUSINESS_SUSPENDED | 403 | Cửa hàng đang bị tạm ngưng | - |
| CHAT_MESSAGE_TOO_LONG | 400 | Tin nhắn quá dài (max 2000 chars) | Shorten message |

## REVIEW_* - Review

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| REVIEW_NOT_FOUND | 404 | Đánh giá không tìm thấy | Check review ID |
| REVIEW_ALREADY_EXISTS | 409 | Bạn đã đánh giá rồi | Update existing review |
| REVIEW_PURCHASE_REQUIRED | 400 | Bạn cần mua sách trước khi đánh giá | - |
| REVIEW_CANNOT_EDIT | 400 | Không thể sửa đánh giá | - |
| REVIEW_MODERATED | 400 | Đánh giá đang được kiểm duyệt | Wait for approval |

## NOTIFICATION_* - Notification

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| NOTIFICATION_NOT_FOUND | 404 | Thông báo không tìm thấy | Check notification ID |
| NOTIFICATION_PREFERENCE_NOT_FOUND | 404 | Tùy chọn thông báo không tìm thấy | Check preference ID |
| NOTIFICATION_DEVICE_NOT_FOUND | 404 | Thiết bị thông báo không tìm thấy | Check device ID |

## MODERATION_* - Moderation

| Code | HTTP | Vietnamese Message | Recovery Action |
|------|------|-------------------|----------------|
| MODERATION_REPORT_NOT_FOUND | 404 | Báo cáo không tìm thấy | Check report ID |
| MODERATION_REPORT_ALREADY_EXISTS | 409 | Bạn đã báo cáo nội dung này rồi | - |
| MODERATION_CONTENT_DELETED | 410 | Nội dung đã bị xóa | - |
