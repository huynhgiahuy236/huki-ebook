/**
 * HUKI EBOOK - Throw Helpers
 *
 * Convenience functions for throwing exceptions with ErrorCode.
 * Use these instead of direct exception constructors.
 */

import { HttpException } from '@nestjs/common';
import { ErrorCode } from '../errors/error-code';

/**
 * Vietnamese error messages mapped from ErrorCode
 * Extend this map as needed
 */
const ERROR_MESSAGES: Partial<Record<ErrorCode, string>> = {
  // AUTH
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Token không hợp lệ',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Token đã hết hạn',
  [ErrorCode.AUTH_TOKEN_MISSING]: 'Vui lòng đăng nhập',
  [ErrorCode.AUTH_TOKEN_REFRESH_FAILED]: 'Làm mới token thất bại',
  [ErrorCode.AUTH_LOGIN_FAILED]: 'Đăng nhập thất bại',
  [ErrorCode.AUTH_LOGIN_INVALID_CREDENTIALS]: 'Email hoặc mật khẩu không đúng',
  [ErrorCode.AUTH_LOGIN_ACCOUNT_BLOCKED]: 'Tài khoản đã bị khóa',
  [ErrorCode.AUTH_LOGIN_ACCOUNT_PENDING]: 'Vui lòng xác thực email trước',
  [ErrorCode.AUTH_REGISTER_FAILED]: 'Đăng ký thất bại',
  [ErrorCode.AUTH_EMAIL_EXISTS]: 'Email đã được sử dụng',
  [ErrorCode.AUTH_PASSWORD_WEAK]: 'Mật khẩu yếu',
  [ErrorCode.AUTH_PASSWORD_INCORRECT]: 'Mật khẩu hiện tại không đúng',
  [ErrorCode.AUTH_PASSWORD_SAME]: 'Mật khẩu mới phải khác mật khẩu hiện tại',
  [ErrorCode.AUTH_RESET_TOKEN_INVALID]: 'Token không hợp lệ',
  [ErrorCode.AUTH_RESET_TOKEN_EXPIRED]: 'Token đã hết hạn',

  // AUTHZ
  [ErrorCode.AUTHZ_FORBIDDEN]: 'Không có quyền truy cập',
  [ErrorCode.AUTHZ_ROLE_INSUFFICIENT]: 'Vai trò không đủ quyền',
  [ErrorCode.AUTHZ_NOT_OWNER]: 'Bạn không phải chủ sở hữu',
  [ErrorCode.AUTHZ_NOT_MEMBER]: 'Bạn không phải thành viên',
  [ErrorCode.AUTHZ_BUSINESS_SUSPENDED]: 'Doanh nghiệp đã bị tạm ngưng',

  // USER
  [ErrorCode.USER_NOT_FOUND]: 'Người dùng không tìm thấy',
  [ErrorCode.USER_EMAIL_EXISTS]: 'Email đã được sử dụng',
  [ErrorCode.USER_PHONE_EXISTS]: 'Số điện thoại đã được sử dụng',
  [ErrorCode.USER_PROFILE_INCOMPLETE]: 'Hồ sơ chưa hoàn thiện',
  [ErrorCode.USER_BLOCKED]: 'Tài khoản đã bị khóa',
  [ErrorCode.USER_EMAIL_NOT_VERIFIED]: 'Vui lòng xác thực email trước',

  // BOOK
  [ErrorCode.BOOK_NOT_FOUND]: 'Sách không tìm thấy',
  [ErrorCode.BOOK_NOT_PUBLISHED]: 'Sách chưa được xuất bản',
  [ErrorCode.BOOK_ARCHIVED]: 'Sách đã được lưu trữ',
  [ErrorCode.BOOK_HIDDEN]: 'Sách đang bị ẩn',
  [ErrorCode.BOOK_SUSPENDED]: 'Sách đã bị tạm ngưng',
  [ErrorCode.BOOK_SLUG_EXISTS]: 'URL sách đã được sử dụng',
  [ErrorCode.BOOK_ISBN_EXISTS]: 'ISBN đã được sử dụng',
  [ErrorCode.BOOK_NOT_FROM_STORE]: 'Sách không thuộc cửa hàng này',
  [ErrorCode.BOOK_FORMAT_NOT_AVAILABLE]: 'Định dạng không khả dụng',
  [ErrorCode.BOOK_COVER_REQUIRED]: 'Vui lòng tải lên ảnh bìa',
  [ErrorCode.BOOK_FILE_REQUIRED]: 'Vui lòng tải lên file sách',
  [ErrorCode.BOOK_PRICE_INVALID]: 'Giá không hợp lệ',

  // INVENTORY
  [ErrorCode.INVENTORY_NOT_FOUND]: 'Không tìm thấy tồn kho',
  [ErrorCode.INVENTORY_INSUFFICIENT]: 'Số lượng trong kho không đủ',
  [ErrorCode.INVENTORY_NEGATIVE]: 'Số lượng không được âm',
  [ErrorCode.INVENTORY_RESERVATION_FAILED]: 'Giữ hàng thất bại',
  [ErrorCode.INVENTORY_RESERVATION_EXPIRED]: 'Thời gian giữ hàng đã hết',

  // CART
  [ErrorCode.CART_NOT_FOUND]: 'Giỏ hàng trống',
  [ErrorCode.CART_ITEM_NOT_FOUND]: 'Sản phẩm không có trong giỏ hàng',
  [ErrorCode.CART_ITEM_EXISTS]: 'Sản phẩm đã có trong giỏ hàng',
  [ErrorCode.CART_DIGITAL_ALREADY_OWNED]: 'Bạn đã sở hữu sách này',
  [ErrorCode.CART_MAX_ITEMS]: 'Giỏ hàng đã đầy',
  [ErrorCode.CART_QUANTITY_INVALID]: 'Số lượng không hợp lệ',

  // CHECKOUT
  [ErrorCode.CART_EMPTY]: 'Giỏ hàng trống',
  [ErrorCode.CHECKOUT_SESSION_NOT_FOUND]: 'Phiên thanh toán không tìm thấy',
  [ErrorCode.CHECKOUT_SESSION_CONSUMED]: 'Phiên thanh toán đã được sử dụng',
  [ErrorCode.CHECKOUT_SESSION_EXPIRED]: 'Phiên thanh toán đã hết hạn',
  [ErrorCode.CHECKOUT_SHIPPING_REQUIRED]: 'Vui lòng nhập địa chỉ giao hàng',
  [ErrorCode.CHECKOUT_SHIPPING_INVALID]: 'Địa chỉ giao hàng không hợp lệ',
  [ErrorCode.CHECKOUT_QUOTE_EXPIRED]: 'Báo giá đã hết hạn',
  [ErrorCode.CHECKOUT_QUOTE_UNAVAILABLE]: 'Báo giá không còn khả dụng',
  [ErrorCode.CHECKOUT_PAYMENT_REQUIRED]: 'Vui lòng chọn phương thức thanh toán',
  [ErrorCode.CHECKOUT_DIGITAL_COD_NOT_ALLOWED]: 'Không hỗ trợ COD cho sách điện tử',
  [ErrorCode.CHECKOUT_IDEMPOTENCY_CONFLICT]: 'Yêu cầu đã được xử lý',

  // ORDER
  [ErrorCode.ORDER_NOT_FOUND]: 'Đơn hàng không tìm thấy',
  [ErrorCode.ORDER_ALREADY_PAID]: 'Đơn hàng đã thanh toán',
  [ErrorCode.ORDER_ALREADY_CANCELLED]: 'Đơn hàng đã bị hủy',
  [ErrorCode.ORDER_ALREADY_COMPLETED]: 'Đơn hàng đã hoàn thành',
  [ErrorCode.ORDER_CANNOT_CANCEL]: 'Không thể hủy đơn hàng',
  [ErrorCode.ORDER_NOT_FROM_USER]: 'Đơn hàng không thuộc về bạn',
  [ErrorCode.ORDER_NOT_FROM_STORE]: 'Đơn hàng không thuộc cửa hàng này',
  [ErrorCode.ORDER_STATUS_TRANSITION_INVALID]: 'Trạng thái đơn hàng không hợp lệ',
  [ErrorCode.SELLER_ORDER_NOT_FOUND]: 'Không tìm thấy đơn bán',
  [ErrorCode.SELLER_ORDER_CANNOT_CANCEL]: 'Không thể hủy đơn bán',

  // PAYMENT
  [ErrorCode.PAYMENT_NOT_FOUND]: 'Thanh toán không tìm thấy',
  [ErrorCode.PAYMENT_FAILED]: 'Thanh toán thất bại',
  [ErrorCode.PAYMENT_TIMEOUT]: 'Hết thời gian thanh toán',
  [ErrorCode.PAYMENT_CANCELLED]: 'Thanh toán đã bị hủy',
  [ErrorCode.PAYMENT_ALREADY_PROCESSED]: 'Thanh toán đã được xử lý',
  [ErrorCode.PAYMENT_AMOUNT_MISMATCH]: 'Số tiền không khớp',
  [ErrorCode.PAYMENT_SIGNATURE_INVALID]: 'Chữ ký thanh toán không hợp lệ',
  [ErrorCode.PAYMENT_WEBHOOK_FAILED]: 'Webhook thanh toán thất bại',
  [ErrorCode.PAYMENT_PROVIDER_ERROR]: 'Lỗi từ nhà cung cấp thanh toán',

  // REFUND
  [ErrorCode.REFUND_NOT_FOUND]: 'Yêu cầu hoàn tiền không tìm thấy',
  [ErrorCode.REFUND_NOT_ALLOWED]: 'Không được phép hoàn tiền',
  [ErrorCode.REFUND_AMOUNT_INVALID]: 'Số tiền hoàn không hợp lệ',
  [ErrorCode.REFUND_EXCEEDS_PAID]: 'Số tiền hoàn vượt quá số đã thanh toán',
  [ErrorCode.REFUND_ALREADY_PROCESSED]: 'Yêu cầu hoàn tiền đã được xử lý',

  // SHIPMENT
  [ErrorCode.SHIPMENT_NOT_FOUND]: 'Vận đơn không tìm thấy',
  [ErrorCode.SHIPMENT_STATUS_TRANSITION_INVALID]: 'Trạng thái vận đơn không hợp lệ',
  [ErrorCode.SHIPMENT_CANNOT_CANCEL]: 'Không thể hủy vận đơn',
  [ErrorCode.SHIPMENT_STAFF_NOT_FOUND]: 'Không tìm thấy nhân viên giao hàng',
  [ErrorCode.SHIPMENT_STAFF_INACTIVE]: 'Nhân viên giao hàng không hoạt động',
  [ErrorCode.SHIPMENT_STAFF_ASSIGNED]: 'Vận đơn đã được gán',
  [ErrorCode.SHIPMENT_CARRIER_ERROR]: 'Lỗi từ đơn vị vận chuyển',

  // ADDRESS
  [ErrorCode.ADDRESS_NOT_FOUND]: 'Không tìm thấy địa chỉ',
  [ErrorCode.ADDRESS_DEFAULT_INVALID]: 'Địa chỉ mặc định không hợp lệ',

  // VOUCHER
  [ErrorCode.VOUCHER_NOT_FOUND]: 'Không tìm thấy voucher',
  [ErrorCode.VOUCHER_EXPIRED]: 'Voucher đã hết hạn',
  [ErrorCode.VOUCHER_NOT_STARTED]: 'Voucher chưa bắt đầu',
  [ErrorCode.VOUCHER_EXHAUSTED]: 'Voucher đã hết lượt sử dụng',
  [ErrorCode.VOUCHER_LIMIT_REACHED]: 'Bạn đã sử dụng hết lượt sử dụng voucher',
  [ErrorCode.VOUCHER_NOT_APPLICABLE]: 'Voucher không áp dụng cho đơn hàng này',
  [ErrorCode.VOUCHER_MIN_ORDER_NOT_MET]: 'Đơn hàng chưa đạt giá trị tối thiểu',
  [ErrorCode.VOUCHER_STACKING_NOT_ALLOWED]: 'Voucher không thể kết hợp',
  [ErrorCode.VOUCHER_CODE_EXISTS]: 'Mã voucher đã tồn tại',

  // FLASH SALE
  [ErrorCode.FLASH_SALE_NOT_FOUND]: 'Không tìm thấy flash sale',
  [ErrorCode.FLASH_SALE_NOT_ACTIVE]: 'Flash sale không hoạt động',
  [ErrorCode.FLASH_SALE_ITEM_NOT_FOUND]: 'Không tìm thấy sản phẩm flash sale',
  [ErrorCode.FLASH_SALE_STOCK_EXHAUSTED]: 'Hết hàng flash sale',
  [ErrorCode.FLASH_SALE_USER_LIMIT_REACHED]: 'Bạn đã đạt giới hạn mua flash sale',

  // REVIEW
  [ErrorCode.REVIEW_NOT_FOUND]: 'Không tìm thấy đánh giá',
  [ErrorCode.REVIEW_ALREADY_EXISTS]: 'Bạn đã đánh giá rồi',
  [ErrorCode.REVIEW_PURCHASE_REQUIRED]: 'Bạn cần mua sách trước khi đánh giá',
  [ErrorCode.REVIEW_CANNOT_EDIT]: 'Không thể sửa đánh giá',
  [ErrorCode.REVIEW_MODERATED]: 'Đánh giá đã bị kiểm duyệt',

  // FORUM
  [ErrorCode.FORUM_POST_NOT_FOUND]: 'Không tìm thấy bài viết',
  [ErrorCode.FORUM_POST_LOCKED]: 'Bài viết đã bị khóa',
  [ErrorCode.FORUM_POST_DELETED]: 'Bài viết đã bị xóa',
  [ErrorCode.FORUM_COMMENT_NOT_FOUND]: 'Không tìm thấy bình luận',
  [ErrorCode.FORUM_REPORT_EXISTS]: 'Bạn đã báo cáo bài viết này rồi',

  // CHAT
  [ErrorCode.CHAT_CONVERSATION_NOT_FOUND]: 'Không tìm thấy cuộc trò chuyện',
  [ErrorCode.CHAT_MESSAGE_NOT_FOUND]: 'Không tìm thấy tin nhắn',
  [ErrorCode.CHAT_BLOCKED]: 'Bạn đã bị chặn',
  [ErrorCode.CHAT_BUSINESS_SUSPENDED]: 'Doanh nghiệp đã bị tạm ngưng',
  [ErrorCode.CHAT_MESSAGE_TOO_LONG]: 'Tin nhắn quá dài',

  // NOTIFICATION
  [ErrorCode.NOTIFICATION_NOT_FOUND]: 'Không tìm thấy thông báo',
  [ErrorCode.NOTIFICATION_PREFERENCE_NOT_FOUND]: 'Không tìm thấy cài đặt thông báo',
  [ErrorCode.NOTIFICATION_DEVICE_NOT_FOUND]: 'Không tìm thấy thiết bị',

  // MODERATION
  [ErrorCode.MODERATION_REPORT_NOT_FOUND]: 'Không tìm thấy báo cáo',
  [ErrorCode.MODERATION_REPORT_ALREADY_EXISTS]: 'Báo cáo đã tồn tại',
  [ErrorCode.MODERATION_CONTENT_DELETED]: 'Nội dung đã bị xóa',

  // VALIDATION
  [ErrorCode.VALIDATION_ERROR]: 'Dữ liệu không hợp lệ',
  [ErrorCode.VALIDATION_REQUIRED]: 'Trường bắt buộc',
  [ErrorCode.VALIDATION_EMAIL]: 'Email không hợp lệ',
  [ErrorCode.VALIDATION_PHONE]: 'Số điện thoại không hợp lệ',
  [ErrorCode.VALIDATION_URL]: 'URL không hợp lệ',
  [ErrorCode.VALIDATION_MIN_LENGTH]: 'Quá ngắn',
  [ErrorCode.VALIDATION_MAX_LENGTH]: 'Quá dài',
  [ErrorCode.VALIDATION_MIN_VALUE]: 'Giá trị quá nhỏ',
  [ErrorCode.VALIDATION_MAX_VALUE]: 'Giá trị quá lớn',
  [ErrorCode.VALIDATION_PATTERN]: 'Định dạng không đúng',

  // RATE LIMIT
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Quá nhiều yêu cầu',
  [ErrorCode.RATE_LIMIT_LOGIN]: 'Đăng nhập quá nhiều lần',
  [ErrorCode.RATE_LIMIT_REGISTER]: 'Đăng ký quá nhiều lần',

  // SYSTEM
  [ErrorCode.SYSTEM_ERROR]: 'Có lỗi xảy ra',
  [ErrorCode.SYSTEM_MAINTENANCE]: 'Hệ thống đang bảo trì',
  [ErrorCode.SYSTEM_UNAVAILABLE]: 'Hệ thống không khả dụng',
  [ErrorCode.SYSTEM_DATABASE_ERROR]: 'Lỗi cơ sở dữ liệu',
  [ErrorCode.SYSTEM_EXTERNAL_SERVICE_ERROR]: 'Lỗi dịch vụ bên ngoài',
  [ErrorCode.SYSTEM_INTERNAL_ERROR]: 'Lỗi nội bộ',

  // SESSION
  [ErrorCode.SESSION_NOT_FOUND]: 'Phiên không tồn tại',
  [ErrorCode.SESSION_EXPIRED]: 'Phiên đã hết hạn',
  [ErrorCode.SESSION_DEVICE_MISMATCH]: 'Thiết bị không khớp',

  // CATEGORY / AUTHOR / PUBLISHER
  [ErrorCode.CATEGORY_NOT_FOUND]: 'Không tìm thấy danh mục',
  [ErrorCode.CATEGORY_HAS_CHILDREN]: 'Danh mục có danh mục con',
  [ErrorCode.AUTHOR_NOT_FOUND]: 'Không tìm thấy tác giả',
  [ErrorCode.AUTHOR_SLUG_EXISTS]: 'URL tác giả đã tồn tại',
  [ErrorCode.PUBLISHER_NOT_FOUND]: 'Không tìm thấy nhà xuất bản',
  [ErrorCode.PUBLISHER_SLUG_EXISTS]: 'URL nhà xuất bản đã tồn tại',

  // BANNER
  [ErrorCode.BANNER_NOT_FOUND]: 'Không tìm thấy banner',
  [ErrorCode.BANNER_INVALID_DATE_RANGE]: 'Ngày không hợp lệ',

  // BUSINESS
  [ErrorCode.BUSINESS_NOT_FOUND]: 'Không tìm thấy doanh nghiệp',
  [ErrorCode.BUSINESS_ALREADY_EXISTS]: 'Doanh nghiệp đã tồn tại',
  [ErrorCode.BUSINESS_REGISTRY_NOT_FOUND]: 'Không tìm thấy đăng ký kinh doanh',
  [ErrorCode.BUSINESS_REGISTRY_MISMATCH]: 'Đăng ký kinh doanh không khớp',
  [ErrorCode.BUSINESS_TAX_CODE_EXISTS]: 'Mã số thuế đã tồn tại',
  [ErrorCode.BUSINESS_ENTERPRISE_CODE_EXISTS]: 'Mã doanh nghiệp đã tồn tại',
  [ErrorCode.BUSINESS_NOT_APPROVED]: 'Doanh nghiệp chưa được duyệt',
  [ErrorCode.BUSINESS_SUSPENDED]: 'Doanh nghiệp đã bị tạm ngưng',
  [ErrorCode.BUSINESS_CANNOT_DELETE]: 'Không thể xóa doanh nghiệp',
  [ErrorCode.BUSINESS_LEGAL_INFO_LOCKED]: 'Thông tin pháp lý đã bị khóa',

  // STORE
  [ErrorCode.STORE_NOT_FOUND]: 'Không tìm thấy cửa hàng',
  [ErrorCode.STORE_ALREADY_EXISTS]: 'Cửa hàng đã tồn tại',
  [ErrorCode.STORE_SLUG_EXISTS]: 'URL cửa hàng đã tồn tại',
  [ErrorCode.STORE_NOT_ACTIVE]: 'Cửa hàng không hoạt động',
  [ErrorCode.STORE_SUSPENDED]: 'Cửa hàng đã bị tạm ngưng',
  [ErrorCode.STORE_CANNOT_DELETE]: 'Không thể xóa cửa hàng',

  // MEMBER
  [ErrorCode.MEMBER_NOT_FOUND]: 'Không tìm thấy thành viên',
  [ErrorCode.MEMBER_ALREADY_EXISTS]: 'Thành viên đã tồn tại',
  [ErrorCode.MEMBER_INVITATION_EXPIRED]: 'Lời mời đã hết hạn',
  [ErrorCode.MEMBER_INVITATION_INVALID]: 'Lời mời không hợp lệ',
  [ErrorCode.MEMBER_CANNOT_LEAVE]: 'Không thể rời doanh nghiệp',
  [ErrorCode.MEMBER_ROLE_IMMUTABLE]: 'Vai trò không thể thay đổi',

  // LIBRARY
  [ErrorCode.LIBRARY_ACCESS_DENIED]: 'Không có quyền truy cập sách',
  [ErrorCode.LIBRARY_BOOK_NOT_FOUND]: 'Không tìm thấy sách trong thư viện',
  [ErrorCode.LIBRARY_ALREADY_GRANTED]: 'Bạn đã có quyền truy cập sách này',
  [ErrorCode.LIBRARY_ACCESS_REVOKED]: 'Quyền truy cập đã bị thu hồi',
  [ErrorCode.LIBRARY_FILE_NOT_FOUND]: 'Không tìm thấy file sách',
};

/**
 * HTTP Status mapping from ErrorCode prefix
 */
function getStatusForCode(code: ErrorCode): number {
  const prefix = code.split('_')[0];
  switch (prefix) {
    case 'AUTH':
      return 401;
    case 'AUTHZ':
      return 403;
    case 'VALIDATION':
    case 'CHECKOUT':
    case 'VOUCHER':
    case 'FLASH':
      return 400;
    case 'BOOK':
    case 'ORDER':
    case 'PAYMENT':
    case 'CART':
    case 'USER':
    case 'BUSINESS':
    case 'STORE':
    case 'MEMBER':
    case 'VOUCHER':
    case 'FLASH':
    case 'REVIEW':
    case 'FORUM':
    case 'CHAT':
    case 'SHIPMENT':
    case 'ADDRESS':
    case 'INVENTORY':
    case 'REFUND':
    case 'SESSION':
    case 'NOTIFICATION':
    case 'MODERATION':
    case 'CATEGORY':
    case 'AUTHOR':
    case 'PUBLISHER':
    case 'BANNER':
    case 'LIBRARY':
      return 404;
    default:
      return 400;
  }
}

function getMessage(code: ErrorCode, customMessage?: string): string {
  return customMessage ?? ERROR_MESSAGES[code] ?? code;
}

/**
 * Throw helper - Usage: throwNotFound(ErrorCode.BOOK_NOT_FOUND)
 */
export function throwNotFound(code: ErrorCode, customMessage?: string) {
  throw new HttpException(
    { code, message: getMessage(code, customMessage) },
    getStatusForCode(code)
  );
}

/**
 * Throw helper for BadRequest - Usage: throwBadRequest(ErrorCode.VALIDATION_REQUIRED, 'Name is required')
 */
export function throwBadRequest(code: ErrorCode, customMessage?: string) {
  throw new HttpException(
    { code, message: getMessage(code, customMessage) },
    400
  );
}

/**
 * Throw helper for Conflict - Usage: throwConflict(ErrorCode.BOOK_SLUG_EXISTS)
 */
export function throwConflict(code: ErrorCode, customMessage?: string) {
  throw new HttpException(
    { code, message: getMessage(code, customMessage) },
    409
  );
}

/**
 * Throw helper for Forbidden - Usage: throwForbidden(ErrorCode.AUTHZ_NOT_OWNER)
 */
export function throwForbidden(code: ErrorCode, customMessage?: string) {
  throw new HttpException(
    { code, message: getMessage(code, customMessage) },
    403
  );
}

/**
 * Throw helper for Unauthorized - Usage: throwUnauthorized(ErrorCode.AUTH_TOKEN_EXPIRED)
 */
export function throwUnauthorized(code: ErrorCode, customMessage?: string) {
  throw new HttpException(
    { code, message: getMessage(code, customMessage) },
    401
  );
}

/**
 * Example usage in service:
 *
 * // Before
 * throw new NotFoundException('Book not found');
 *
 * // After
 * throwNotFound(ErrorCode.BOOK_NOT_FOUND);
 * // or
 * throwNotFound(ErrorCode.BOOK_NOT_FOUND, 'Custom message here');
 */
