/**
 * HUKI EBOOK - HTTP Exception Filter
 *
 * Standardizes all error responses.
 * P3: Response Contract Standardization
 *
 * Error codes use ErrorCode enum from @huki/shared/errors
 * Messages are in Vietnamese
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ErrorCode } from '../errors/error-code';

/**
 * P3 Error Response Format
 */
export interface P3ErrorResponse {
  status: 'error';
  statusCode: number;
  code: string;
  message: string;
  details?: any;
  path: string;
  requestId: string;
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).id ?? (request.headers as any)?.['x-request-id'] ?? uuidv4();
    const path = request.originalUrl ?? request.url;

    let status: number;
    let message: string;
    let code: string;
    let details: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.defaultCode(status);
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, any>;

        // Extract code and message from structured response
        code = responseObj.code ?? this.defaultCode(status);
        details = responseObj.details;

        // Handle validation errors from class-validator
        if (Array.isArray(responseObj.message)) {
          message = 'Validation failed';
          details = this.formatValidationErrors(responseObj.message);
        } else {
          message = responseObj.message || exception.message;
        }
      } else {
        message = exception.message;
        code = this.defaultCode(status);
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      code = ErrorCode.SYSTEM_INTERNAL_ERROR;

      // Log internal errors but don't expose details
      this.logger.error(
        `Internal error: ${exception.message}`,
        exception.stack,
      );
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      code = ErrorCode.SYSTEM_INTERNAL_ERROR;
    }

    // Build error response (P3 format)
    const errorResponse: P3ErrorResponse = {
      status: 'error',
      statusCode: status,
      code,
      message,
      path,
      requestId,
      timestamp: new Date().toISOString(),
    };

    // Only include details for validation errors and client-safe errors
    if (details !== undefined && this.shouldIncludeDetails(status)) {
      errorResponse.details = details;
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Format validation errors from class-validator
   */
  private formatValidationErrors(messages: string[]): Array<{
    field: string;
    code: string;
    message: string;
  }> {
    return messages.map((msg) => {
      // Try to extract field name from message
      // Format: "fieldname must be..."
      const match = msg.match(/^(\w+)\s/);
      const field = match ? match[1] : 'unknown';

      return {
        field,
        code: ErrorCode.VALIDATION_ERROR,
        message: msg,
      };
    });
  }

  /**
   * Only include details for 4xx errors (client-safe)
   */
  private shouldIncludeDetails(status: number): boolean {
    return status >= 400 && status < 500;
  }

  /**
   * Map HTTP status to default ErrorCode
   */
  private defaultCode(status: number): string {
    const codes: Partial<Record<number, ErrorCode>> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.AUTH_TOKEN_INVALID,
      [HttpStatus.FORBIDDEN]: ErrorCode.AUTHZ_FORBIDDEN,
      [HttpStatus.NOT_FOUND]: ErrorCode.SYSTEM_ERROR,
      [HttpStatus.CONFLICT]: ErrorCode.SYSTEM_ERROR,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
      [HttpStatus.BAD_GATEWAY]: ErrorCode.SYSTEM_EXTERNAL_SERVICE_ERROR,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SYSTEM_UNAVAILABLE,
      [HttpStatus.GATEWAY_TIMEOUT]: ErrorCode.SYSTEM_UNAVAILABLE,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.SYSTEM_INTERNAL_ERROR,
    };
    return codes[status] ?? ErrorCode.SYSTEM_ERROR;
  }
}
