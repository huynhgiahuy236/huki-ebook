import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../errors/error-code';

interface ErrorResponse {
  status: 'error';
  statusCode: number;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

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
        if (Array.isArray(responseObj.message)) {
          message = 'Validation failed';
          details = responseObj.details ?? responseObj.message;
        } else {
          message = responseObj.message || exception.message;
          details = responseObj.details;
        }
        code = responseObj.code ?? this.defaultCode(status);
      } else {
        message = exception.message;
        code = this.defaultCode(status);
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      code = ErrorCode.SYSTEM_INTERNAL_ERROR;

      this.logger.error(`Unexpected error: ${exception.message}`, exception.stack);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Có lỗi xảy ra. Vui lòng thử lại sau.';
      code = ErrorCode.SYSTEM_INTERNAL_ERROR;
    }

    const errorResponse: ErrorResponse = {
      status: 'error',
      statusCode: status,
      message,
      code,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    };

    if (details !== undefined) errorResponse.details = details;

    response.status(status).json(errorResponse);
  }

  private defaultCode(status: number): ErrorCode {
    const codes: Partial<Record<number, ErrorCode>> = {
      [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_ERROR,
      [HttpStatus.UNAUTHORIZED]: ErrorCode.AUTH_TOKEN_INVALID,
      [HttpStatus.FORBIDDEN]: ErrorCode.AUTHZ_FORBIDDEN,
      [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
      [HttpStatus.BAD_GATEWAY]: ErrorCode.SYSTEM_EXTERNAL_SERVICE_ERROR,
      [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.SYSTEM_UNAVAILABLE,
      [HttpStatus.GATEWAY_TIMEOUT]: ErrorCode.SYSTEM_UNAVAILABLE,
      [HttpStatus.INTERNAL_SERVER_ERROR]: ErrorCode.SYSTEM_INTERNAL_ERROR,
    };
    return codes[status] ?? ErrorCode.SYSTEM_ERROR;
  }
}
