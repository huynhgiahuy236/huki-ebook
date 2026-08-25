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
        const isPaginated = data && Array.isArray(data.data) && data.pagination;
        return {
          status: 'success' as const,
          statusCode: response.statusCode,
          data: isPaginated ? data.data : data,
          ...(isPaginated ? { pagination: data.pagination } : {}),
          timestamp: new Date().toISOString(),
          path: request.originalUrl ?? request.url,
        };
      }),
    );
  }
}
