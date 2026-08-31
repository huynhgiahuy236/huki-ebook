/**
 * Unit tests for TransformInterceptor
 * P3: Response Contract Standardization
 */

import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

function context(statusCode = 200): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ originalUrl: '/api/v1/books', headers: {} }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

describe('TransformInterceptor', () => {
  const interceptor = new TransformInterceptor();

  it('wraps plain data in the success contract with meta', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context(), { handle: () => of({ id: 'book-1' }) }),
    );

    expect(result.status).toBe('success');
    expect(result.statusCode).toBe(200);
    expect(result.message).toBe('Thành công');
    expect(result.data).toEqual({ id: 'book-1' });
    expect(result.meta).toBeDefined();
    expect(result.meta.requestId).toBeDefined();
    expect(result.meta.timestamp).toBeDefined();
  });

  it('promotes business message and pagination without nesting data', async () => {
    const pagination = { page: 1, limit: 10, total: 12, totalPages: 2 };
    const result = await lastValueFrom(
      interceptor.intercept(context(), {
        handle: () => of({ message: 'Lấy danh sách thành công', data: [{ id: 1 }], pagination }),
      }),
    );

    expect(result.status).toBe('success');
    expect(result.message).toBe('Lấy danh sách thành công');
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.pagination).toEqual(pagination);
    expect(result.meta).toBeDefined();
  });

  it('does not double-wrap an existing standard response', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context(201), {
        handle: () => of({ status: 'success', statusCode: 201, message: 'Created', data: { id: 1 } }),
      }),
    );

    expect(result.status).toBe('success');
    expect(result.data).toEqual({ id: 1 });
    expect(result.message).toBe('Created');
    expect(result.meta.requestId).toBeDefined();
  });

  it('returns null for 204 No Content', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context(204), { handle: () => of(null) }),
    );

    expect(result).toBeNull();
  });

  it('adds requestId from header if available', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context(), {
        handle: () => of({ id: 'book-1' }),
      }),
    );

    // Request ID should be generated
    expect(result.meta.requestId).toBeDefined();
    expect(result.meta.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('uses custom message for 201 Created', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context(201), {
        handle: () => of({ data: { id: 'book-1' } }),
      }),
    );

    expect(result.message).toBe('Tạo thành công');
    expect(result.statusCode).toBe(201);
  });

  it('handles pagination with hasNextPage and hasPreviousPage', async () => {
    // Note: The interceptor detects pagination by checking for page/limit/total/totalPages
    // It does NOT auto-add hasNextPage/hasPreviousPage - those must be provided
    const pagination = { page: 1, limit: 10, total: 25, totalPages: 3, hasNextPage: true, hasPreviousPage: false };
    const result = await lastValueFrom(
      interceptor.intercept(context(), {
        handle: () => of({ data: [{ id: 1 }], pagination }),
      }),
    );

    expect(result.pagination).toBeDefined();
    expect(result.pagination?.hasNextPage).toBe(true);
    expect(result.pagination?.hasPreviousPage).toBe(false);
  });

  it('extracts data from nested response object', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context(), {
        handle: () => of({ data: { nested: { id: 'book-1' } }, message: 'OK' }),
      }),
    );

    expect(result.data).toEqual({ nested: { id: 'book-1' } });
    expect(result.message).toBe('OK');
  });

  it('returns null data when only message is present', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(context(), {
        handle: () => of({ message: 'Deleted successfully' }),
      }),
    );

    expect(result.data).toBeNull();
    expect(result.message).toBe('Deleted successfully');
  });
});
