const gateway = process.env.GATEWAY_URL ?? 'http://localhost:3000/api/v1';

interface ApiResponse {
  status: 'success' | 'error';
  statusCode: number;
  message: string;
  data?: unknown;
  code?: string;
  details?: unknown;
  path?: string;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

async function call(path: string, init?: RequestInit) {
  const response = await fetch(`${gateway}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
    signal: AbortSignal.timeout(10_000),
  });
  const body = await response.json() as ApiResponse;
  expect(body.statusCode).toBe(response.status);
  expect(typeof body.message).toBe('string');
  return { response, body };
}

describe('Phase 5 Gateway local integration', () => {
  beforeAll(async () => {
    try {
      const response = await fetch(`${gateway}/health/services`, {
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) throw new Error(`health returned ${response.status}`);
    } catch (error) {
      throw new Error(`Gateway/services are not ready at ${gateway}: ${(error as Error).message}`);
    }
  });

  it('reports all six downstream services healthy', async () => {
    const { response, body } = await call('/health/services');
    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.data).toEqual(expect.objectContaining({
      status: 'ok',
      services: expect.arrayContaining([
        expect.objectContaining({ service: 'identity', status: 'ok' }),
        expect.objectContaining({ service: 'business', status: 'ok' }),
        expect.objectContaining({ service: 'commerce', status: 'ok' }),
        expect.objectContaining({ service: 'shipping', status: 'ok' }),
        expect.objectContaining({ service: 'community', status: 'ok' }),
        expect.objectContaining({ service: 'promotion', status: 'ok' }),
      ]),
    }));
  });

  it('proxies Identity validation errors with structured details', async () => {
    const { response, body } = await call('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'invalid', password: 'x' }),
    });
    expect(response.status).toBe(400);
    expect(body).toMatchObject({ status: 'error', code: 'VALIDATION_ERROR' });
    expect(Array.isArray(body.details)).toBe(true);
  });

  it('proxies Business authorization errors', async () => {
    const { response, body } = await call('/businesses/my');
    expect(response.status).toBe(401);
    expect(body.status).toBe('error');
    expect(typeof body.code).toBe('string');
  });

  it('proxies Commerce pagination', async () => {
    const { response, body } = await call('/books?page=1&limit=2');
    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toMatchObject({ page: 1, limit: 2 });
    expect(typeof body.pagination?.total).toBe('number');
    expect(typeof body.pagination?.totalPages).toBe('number');
  });

  it('proxies Shipping fee calculation', async () => {
    const { response, body } = await call('/shipping/fee?province=Hanoi&district=Ba%20Dinh&weight=750');
    expect(response.status).toBe(200);
    expect(body).toEqual(expect.objectContaining({ status: 'success', data: expect.any(Object) }));
  });

  it('proxies Community pagination', async () => {
    const { response, body } = await call('/forum/posts?page=1&limit=2');
    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toBeDefined();
  });

  it('proxies Promotion public banners', async () => {
    const { response, body } = await call('/banners/active');
    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('normalizes not-found errors through the Gateway', async () => {
    const { response, body } = await call('/books/00000000-0000-0000-0000-000000000000');
    expect(response.status).toBe(404);
    expect(body).toEqual(expect.objectContaining({
      status: 'error', code: 'BOOK_NOT_FOUND', path: expect.any(String),
    }));
  });
});
