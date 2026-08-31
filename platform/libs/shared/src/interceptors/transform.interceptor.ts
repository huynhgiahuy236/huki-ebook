/**
 * HUKI EBOOK - Transform Interceptor
 *
 * Wraps all responses in standard envelope.
 * P3: Response Contract Standardization
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

/**
 * Standard API response envelope
 */
export interface ApiResponse<T> {
  status: 'success';
  statusCode: number;
  message?: string;
  data: T;
  pagination?: PaginationMeta;
  meta: ResponseMeta;
}

/**
 * Pagination metadata
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
 * Response metadata
 */
export interface ResponseMeta {
  requestId: string;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const requestId = (request as any).id ?? (request.headers as any)?.['x-request-id'] ?? uuidv4();
    const path = request.originalUrl ?? request.url;

    return next.handle().pipe(
      map((data): ApiResponse<T> => {
        // 204 No Content - return null
        if (data === null || data === undefined) {
          return null as unknown as ApiResponse<T>;
        }

        // Already wrapped with our envelope
        if (this.isApiResponse(data)) {
          const wrapped = data as ApiResponse<T>;
          return {
            ...wrapped,
            statusCode: wrapped.statusCode ?? response.statusCode,
            meta: {
              requestId: wrapped.meta?.requestId ?? requestId,
              timestamp: wrapped.meta?.timestamp ?? new Date().toISOString(),
            },
          };
        }

        // Extract data from various response formats
        const { data: extractedData, message, pagination } = this.extractData(data);

        const meta: ResponseMeta = {
          requestId,
          timestamp: new Date().toISOString(),
        };

        if (pagination) {
          return {
            status: 'success',
            statusCode: response.statusCode,
            message: message ?? this.defaultMessage(response.statusCode),
            data: extractedData as T,
            pagination,
            meta,
          };
        }

        return {
          status: 'success',
          statusCode: response.statusCode,
          message: message ?? this.defaultMessage(response.statusCode),
          data: extractedData as T,
          meta,
        };
      }),
    );
  }

  private isApiResponse(data: unknown): data is ApiResponse<unknown> & { meta?: ResponseMeta } {
    return Boolean(
      data &&
        typeof data === 'object' &&
        (data as Record<string, unknown>).status === 'success',
    );
  }

  private extractData(data: T): {
    data: unknown;
    message?: string;
    pagination?: PaginationMeta;
  } {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { data };
    }

    const value = data as Record<string, unknown>;
    const hasData = Object.prototype.hasOwnProperty.call(value, 'data');
    const hasMessage = typeof value.message === 'string';
    const pagination = this.isPagination(value.pagination)
      ? value.pagination
      : undefined;

    if (hasData || pagination) {
      return {
        data: value.data,
        message: hasMessage ? (value.message as string) : undefined,
        pagination,
      };
    }

    if (hasMessage) {
      const { message, ...rest } = value;
      return {
        data: Object.keys(rest).length > 0 ? rest : null,
        message: message as string,
      };
    }

    return { data };
  }

  private isPagination(value: unknown): value is PaginationMeta {
    if (!value || typeof value !== 'object') return false;
    const pagination = value as Record<string, unknown>;
    return (
      typeof pagination.page === 'number' &&
      typeof pagination.limit === 'number' &&
      typeof pagination.total === 'number' &&
      typeof pagination.totalPages === 'number'
    );
  }

  private defaultMessage(statusCode: number): string {
    switch (statusCode) {
      case 201:
        return 'Tạo thành công';
      case 204:
        return '';
      default:
        return 'Thành công';
    }
  }
}
