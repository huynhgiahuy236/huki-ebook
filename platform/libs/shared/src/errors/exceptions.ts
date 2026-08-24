/**
 * HUKI EBOOK - Custom Exceptions
 *
 * Standardized exceptions with error codes for all services.
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-code';

// ============================================
// Exception Factory
// ============================================

export interface ErrorResponse {
  message: string;
  code: ErrorCode;
  statusCode: number;
  details?: any;
}

export function createError(
  code: ErrorCode,
  message: string,
  statusCode: number,
  details?: any,
): ErrorResponse {
  return { message, code, statusCode, details };
}

// ============================================
// 400 Bad Request
// ============================================

export class BadRequestExceptionWithCode extends HttpException {
  constructor(code: ErrorCode, message: string, details?: any) {
    super(createError(code, message, HttpStatus.BAD_REQUEST, details), HttpStatus.BAD_REQUEST);
  }
}

export class ValidationException extends BadRequestExceptionWithCode {
  constructor(message: string, details?: any) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
  }
}

export class ConflictExceptionWithCode extends HttpException {
  constructor(code: ErrorCode, message: string, details?: any) {
    super(createError(code, message, HttpStatus.CONFLICT, details), HttpStatus.CONFLICT);
  }
}

// ============================================
// 401 Unauthorized
// ============================================

export class UnauthorizedExceptionWithCode extends HttpException {
  constructor(code: ErrorCode, message: string) {
    super(createError(code, message, HttpStatus.UNAUTHORIZED), HttpStatus.UNAUTHORIZED);
  }
}

// ============================================
// 403 Forbidden
// ============================================

export class ForbiddenExceptionWithCode extends HttpException {
  constructor(code: ErrorCode, message: string) {
    super(createError(code, message, HttpStatus.FORBIDDEN), HttpStatus.FORBIDDEN);
  }
}

// ============================================
// 404 Not Found
// ============================================

export class NotFoundExceptionWithCode extends HttpException {
  constructor(code: ErrorCode, message: string) {
    super(createError(code, message, HttpStatus.NOT_FOUND), HttpStatus.NOT_FOUND);
  }
}

// ============================================
// 409 Conflict
// ============================================

// ConflictExceptionWithCode already defined above

// ============================================
// 422 Unprocessable Entity
// ============================================

export class UnprocessableExceptionWithCode extends HttpException {
  constructor(code: ErrorCode, message: string, details?: any) {
    super(createError(code, message, HttpStatus.UNPROCESSABLE_ENTITY, details), HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

// ============================================
// 429 Too Many Requests
// ============================================

export class TooManyRequestsExceptionWithCode extends HttpException {
  constructor(code: ErrorCode, message: string, retryAfter?: number) {
    super(
      createError(code, message, HttpStatus.TOO_MANY_REQUESTS, { retryAfter }),
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

// ============================================
// 500 Internal Server Error
// ============================================

export class InternalServerErrorExceptionWithCode extends HttpException {
  constructor(code: ErrorCode = ErrorCode.SYSTEM_INTERNAL_ERROR, message: string = 'Có lỗi xảy ra') {
    super(createError(code, message, HttpStatus.INTERNAL_SERVER_ERROR), HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

// ============================================
// 503 Service Unavailable
// ============================================

export class ServiceUnavailableExceptionWithCode extends HttpException {
  constructor(code: ErrorCode, message: string) {
    super(createError(code, message, HttpStatus.SERVICE_UNAVAILABLE), HttpStatus.SERVICE_UNAVAILABLE);
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Quick throw for common errors
 */
export const throwError = {
  badRequest: (code: ErrorCode, message: string, details?: any) => {
    throw new BadRequestExceptionWithCode(code, message, details);
  },

  unauthorized: (code: ErrorCode, message: string) => {
    throw new UnauthorizedExceptionWithCode(code, message);
  },

  forbidden: (code: ErrorCode, message: string) => {
    throw new ForbiddenExceptionWithCode(code, message);
  },

  notFound: (code: ErrorCode, message: string) => {
    throw new NotFoundExceptionWithCode(code, message);
  },

  conflict: (code: ErrorCode, message: string, details?: any) => {
    throw new ConflictExceptionWithCode(code, message, details);
  },

  unprocessable: (code: ErrorCode, message: string, details?: any) => {
    throw new UnprocessableExceptionWithCode(code, message, details);
  },

  rateLimit: (code: ErrorCode, message: string, retryAfter?: number) => {
    throw new TooManyRequestsExceptionWithCode(code, message, retryAfter);
  },

  internal: (message: string = 'Có lỗi xảy ra') => {
    throw new InternalServerErrorExceptionWithCode(ErrorCode.SYSTEM_INTERNAL_ERROR, message);
  },
};
