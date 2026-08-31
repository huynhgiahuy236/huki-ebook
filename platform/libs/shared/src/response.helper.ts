/**
 * HUKI EBOOK - HTTP Response Helpers
 *
 * Standard response format for all API responses.
 * P3: Response Contract Standardization
 */

import { HttpStatus } from './http-status';

/**
 * Pagination metadata - complete spec
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Validation error item
 */
export interface ValidationErrorItem {
  field: string;
  code: string;
  message: string;
}

/**
 * Build paginated meta from raw values
 */
export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Build error response
 * Note: Does NOT include stack trace or sensitive data
 */
export function responseError(
  message: string,
  statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
  options?: {
    code?: string;
    details?: any;
    path?: string;
    requestId?: string;
  },
) {
  const timestamp = new Date().toISOString();
  const response: any = {
    status: 'error',
    statusCode,
    code: options?.code,
    message,
    path: options?.path,
    requestId: options?.requestId,
    timestamp,
  };

  if (options?.details !== undefined) {
    response.details = options.details;
  }

  return response;
}

/**
 * Create validation error details
 */
export function createValidationErrors(
  errors: Array<{ field: string; message: string; code?: string }>,
): ValidationErrorItem[] {
  return errors.map((e) => ({
    field: e.field,
    code: e.code ?? 'VALIDATION_ERROR',
    message: e.message,
  }));
}
