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
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // AUTH
  [ErrorCode.AUTH_TOKEN_INVALID]: 'Token không hợp lệ',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 'Token đã hết hạn',
  [ErrorCode.AUTH_TOKEN_MISSING]: 'Vui lòng đăng nhập',
  [ErrorCode.AUTH_LOGIN_INVALID_CREDENTIALS]: 'Email hoặc mật khẩu không đúng',
  [ErrorCode.AUTH_LOGIN_ACCOUNT_BLOCKED]: 'Tài khoản đã bị khóa',
  [ErrorCode.AUTH_REGISTER_FAILED]: 'Đăng ký thất bại',
  [ErrorCode.AUTH_EMAIL_EXISTS]: 'Email đã được sử dụng',

  // USER
  [ErrorCode.USER_NOT_FOUND]: 'Người dùng không tìm thấy',
  [ErrorCode.USER_EMAIL_EXISTS]: 'Email đã được sử dụng',

  // BOOK
  [ErrorCode.BOOK_NOT_FOUND]: 'Sách không tìm thấy',
  [ErrorCode.BOOK_NOT_PUBLISHED]: 'Sách chưa được xuất bản',
  [ErrorCode.BOOK_SLUG_EXISTS]: 'URL sách đã được sử dụng',
  [ErrorCode.BOOK_FORMAT_NOT_AVAILABLE]: 'Định dạng không khả dụng',
  [ErrorCode.BOOK_PRICE_INVALID]: 'Giá không hợp lệ',

  // CART
  [ErrorCode.CART_NOT_FOUND]: 'Giỏ hàng trống',
  [ErrorCode.CART_ITEM_NOT_FOUND]: 'Sản phẩm không có trong giỏ hàng',
  [ErrorCode.CART_DIGITAL_ALREADY_OWNED]: 'Bạn đã sở hữu sách này',
  [ErrorCode.CART_QUANTITY_INVALID]: 'Số lượng không hợp lệ',

  // CHECKOUT
  [ErrorCode.CHECKOUT_CART_EMPTY]: 'Giỏ hàng trống',
  [ErrorCode.CHECKOUT_SESSION_EXPIRED]: 'Phiên thanh toán đã hết hạn',
  [ErrorCode.CHECKOUT_SHIPPING_REQUIRED]: 'Vui lòng nhập địa chỉ giao hàng',
  [ErrorCode.CHECKOUT_DIGITAL_COD_NOT_ALLOWED]: 'Không hỗ trợ COD cho sách điện tử',

  // ORDER
  [ErrorCode.ORDER_NOT_FOUND]: 'Đơn hàng không tìm thấy',
  [ErrorCode.ORDER_ALREADY_PAID]: 'Đơn hàng đã thanh toán',
  [ErrorCode.ORDER_ALREADY_CANCELLED]: 'Đơn hàng đã bị hủy',
  [ErrorCode.ORDER_CANNOT_CANCEL]: 'Không thể hủy đơn hàng',

  // PAYMENT
  [ErrorCode.PAYMENT_NOT_FOUND]: 'Thanh toán không tìm thấy',
  [ErrorCode.PAYMENT_FAILED]: 'Thanh toán thất bại',
  [ErrorCode.PAYMENT_TIMEOUT]: 'Hết thời gian thanh toán',
  [ErrorCode.PAYMENT_SIGNATURE_INVALID]: 'Chữ ký thanh toán không hợp lệ',

  // REFUND
  [ErrorCode.REFUND_NOT_FOUND]: 'Yêu cầu hoàn tiền không tìm thấy',
  [ErrorCode.REFUND_EXCEEDS_PAID]: 'Số tiền hoàn vượt quá số đã thanh toán',

  // INVENTORY
  [ErrorCode.INVENTORY_INSUFFICIENT]: 'Số lượng trong kho không đủ',
  [ErrorCode.INVENTORY_RESERVATION_EXPIRED]: 'Thời gian giữ hàng đã hết',

  // VALIDATION
  [ErrorCode.VALIDATION_ERROR]: 'Dữ liệu không hợp lệ',
  [ErrorCode.VALIDATION_REQUIRED]: 'Trường bắt buộc',
  [ErrorCode.VALIDATION_EMAIL]: 'Email không hợp lệ',

  // SYSTEM
  [ErrorCode.SYSTEM_ERROR]: 'Có lỗi xảy ra',
  [ErrorCode.SYSTEM_INTERNAL_ERROR]: 'Lỗi nội bộ',

  // Fallback
  [ErrorCode.SYSTEM_ERROR]: 'Có lỗi xảy ra',
} as const;

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
      return 400;
    case 'BOOK':
    case 'ORDER':
    case 'PAYMENT':
    case 'CART':
    case 'USER':
      return 404;
    default:
      return 400;
  }
}

/**
 * Throw helper - Usage: throwNotFound(ErrorCode.BOOK_NOT_FOUND)
 */
export function throwNotFound(code: ErrorCode, customMessage?: string) {
  throw new HttpException(
    { message: customMessage ?? ERROR_MESSAGES[code] ?? code, code },
    getStatusForCode(code)
  );
}

/**
 * Throw helper for BadRequest - Usage: throwBadRequest(ErrorCode.VALIDATION_REQUIRED, 'Name is required')
 */
export function throwBadRequest(code: ErrorCode, customMessage?: string) {
  throw new HttpException(
    { message: customMessage ?? ERROR_MESSAGES[code] ?? code, code },
    400
  );
}

/**
 * Throw helper for Conflict - Usage: throwConflict(ErrorCode.BOOK_SLUG_EXISTS)
 */
export function throwConflict(code: ErrorCode, customMessage?: string) {
  throw new HttpException(
    { message: customMessage ?? ERROR_MESSAGES[code] ?? code, code },
    409
  );
}

/**
 * Throw helper for Forbidden - Usage: throwForbidden(ErrorCode.AUTHZ_NOT_OWNER)
 */
export function throwForbidden(code: ErrorCode, customMessage?: string) {
  throw new HttpException(
    { message: customMessage ?? ERROR_MESSAGES[code] ?? code, code },
    403
  );
}

/**
 * Throw helper for Unauthorized - Usage: throwUnauthorized(ErrorCode.AUTH_TOKEN_EXPIRED)
 */
export function throwUnauthorized(code: ErrorCode, customMessage?: string) {
  throw new HttpException(
    { message: customMessage ?? ERROR_MESSAGES[code] ?? code, code },
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
