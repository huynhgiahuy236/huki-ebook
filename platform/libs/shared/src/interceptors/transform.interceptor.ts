import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  status: 'success';
  statusCode: number;
  message: string;
  data: T;
  timestamp: string;
  path: string;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
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

    return next.handle().pipe(
      map((data) => {
        const path = request.originalUrl ?? request.url;
        if (this.isStandardResponse(data)) {
          return {
            ...data,
            statusCode: data.statusCode ?? response.statusCode,
            message: data.message ?? this.defaultMessage(response.statusCode),
            timestamp: data.timestamp ?? new Date().toISOString(),
            path: data.path ?? path,
          } as ApiResponse<T>;
        }

        const envelope = this.extractEnvelope(data);
        return {
          status: 'success' as const,
          statusCode: response.statusCode,
          message: envelope.message ?? this.defaultMessage(response.statusCode),
          data: envelope.data,
          ...(envelope.pagination ? { pagination: envelope.pagination } : {}),
          timestamp: new Date().toISOString(),
          path,
        };
      }),
    );
  }

  private isStandardResponse(data: unknown): data is Partial<ApiResponse<T>> & { status: 'success' } {
    return Boolean(
      data &&
        typeof data === 'object' &&
        (data as Record<string, unknown>).status === 'success',
    );
  }

  private extractEnvelope(data: T): {
    message?: string;
    data: T;
    pagination?: ApiResponse<T>['pagination'];
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
        message: hasMessage ? (value.message as string) : undefined,
        data: value.data as T,
        pagination,
      };
    }

    if (hasMessage) {
      const { message, ...rest } = value;
      return {
        message: message as string,
        data: (Object.keys(rest).length ? rest : null) as T,
      };
    }

    return { data };
  }

  private isPagination(value: unknown): value is ApiResponse<T>['pagination'] {
    if (!value || typeof value !== 'object') return false;
    const pagination = value as Record<string, unknown>;
    return ['page', 'limit', 'total', 'totalPages'].every(
      (key) => typeof pagination[key] === 'number',
    );
  }

  private defaultMessage(statusCode: number): string {
    return statusCode === 201 ? 'Tạo thành công' : 'Thành công';
  }
}
