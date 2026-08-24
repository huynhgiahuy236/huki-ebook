/**
 * HUKI EBOOK - HTTP Response Helpers
 *
 * Standard response format for all API responses.
 * Inspired by Express reference project.
 */

import { HttpStatus } from './http-status';

/**
 * Standard success response
 */
export interface SuccessResponse<T = any> {
  /** Always "success" for successful responses */
  status: 'success';
  /** HTTP status code */
  statusCode: number;
  /** Human-readable message */
  message?: string;
  /** Response data */
  data?: T;
  /** Pagination info (if applicable) */
  pagination?: PaginationMeta;
}

/**
 * Standard error response
 */
export interface ApiErrorResponse {
  /** Always "error" for error responses */
  status: 'error';
  /** HTTP status code */
  statusCode: number;
  /** Error message */
  message: string;
  /** Error code for client handling */
  code?: string;
  /** Additional error details */
  details?: any;
  /** Stack trace (development only) */
  stack?: string;
  /** Request path */
  path?: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Build success response
 */
export function responseSuccess<T>(
  data: T,
  message?: string,
  statusCode: number = HttpStatus.OK,
): SuccessResponse<T> {
  return {
    status: 'success',
    statusCode,
    message,
    data,
  };
}

/**
 * Build success response with pagination
 */
export function responseSuccessPaginated<T>(
  data: T[],
  pagination: PaginationMeta,
  message?: string,
): SuccessResponse<T[]> {
  return {
    status: 'success',
    statusCode: HttpStatus.OK,
    message,
    data,
    pagination,
  };
}

/**
 * Build error response
 */
export function responseError(
  message: string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  options?: {
    code?: string;
    details?: any;
    stack?: string;
    path?: string;
  },
): ApiErrorResponse {
  return {
    status: 'error',
    statusCode,
    message,
    code: options?.code,
    details: options?.details,
    stack: process.env.NODE_ENV === 'development' ? options?.stack : undefined,
    path: options?.path,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Response creators for common patterns
 */
export const responses = {
  /** 200 OK */
  ok: <T>(data: T, message?: string) =>
    responseSuccess(data, message, HttpStatus.OK),

  /** 201 Created */
  created: <T>(data: T, message?: string) =>
    responseSuccess(data, message ?? 'Tạo thành công', HttpStatus.CREATED),

  /** 204 No Content */
  noContent: () => null,

  /** Paginated response */
  paginated: <T>(data: T[], pagination: PaginationMeta, message?: string) =>
    responseSuccessPaginated(data, pagination, message),
};
