import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

function context(statusCode = 200): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ originalUrl: '/api/v1/books' }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('wraps plain data in the success contract', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context(), { handle: () => of({ id: 'book-1' }) }),
    );

    expect(result).toEqual(expect.objectContaining({
      status: 'success',
      statusCode: 200,
      message: 'Thành công',
      data: { id: 'book-1' },
      path: '/api/v1/books',
    }));
  });

  it('promotes business message and pagination without nesting data', async () => {
    const pagination = { page: 1, limit: 10, total: 12, totalPages: 2 };
    const result = await lastValueFrom(
      interceptor.intercept(context(), {
        handle: () => of({ message: 'Lấy danh sách thành công', data: [{ id: 1 }], pagination }),
      }),
    );

    expect(result).toEqual(expect.objectContaining({
      message: 'Lấy danh sách thành công',
      data: [{ id: 1 }],
      pagination,
    }));
  });

  it('does not double-wrap an existing standard response', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context(201), {
        handle: () => of({ status: 'success', statusCode: 201, message: 'Created', data: { id: 1 } }),
      }),
    );

    expect(result.data).toEqual({ id: 1 });
    expect(result.message).toBe('Created');
  });
});
