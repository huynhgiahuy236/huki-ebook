import { EventEmitter } from 'node:events';
import { request as httpRequest } from 'node:http';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { ServiceProxyMiddleware } from './service-proxy.middleware';

jest.mock('node:http', () => ({ request: jest.fn() }));

class ClientRequestStub extends EventEmitter {
  end = jest.fn();
  destroy = jest.fn((error?: Error) => {
    if (error) this.emit('error', error);
  });
}

const requestMock = httpRequest as jest.MockedFunction<typeof httpRequest>;

function config(values: Record<string, unknown> = {}) {
  return {
    get: jest.fn((key: string) => {
      const defaults: Record<string, unknown> = {
        'services.identity.host': 'localhost',
        'services.identity.port': 3001,
        'services.commerce.host': 'localhost',
        'services.commerce.port': 3003,
        'services.community.host': 'localhost',
        'services.community.port': 3005,
        PROXY_TIMEOUT_MS: 30_000,
        PROXY_MAX_RETRIES: 1,
        PROXY_RETRY_DELAY_MS: 0,
      };
      return key in values ? values[key] : defaults[key];
    }),
  } as unknown as ConfigService;
}

function request(
  method: string,
  url = '/api/v1/catalog',
  user?: { id: string; role: string; email?: string; businessId?: string },
  headers: Record<string, string> = {},
  authError?: { code: string; message: string },
): Request {
  return {
    method,
    originalUrl: url,
    headers: { ...headers },
    body: method === 'POST' ? { name: 'test' } : undefined,
    user,
    authError,
    is: jest.fn().mockReturnValue(method === 'POST'),
    pipe: jest.fn(),
  } as unknown as Request;
}

function response(): Response {
  const res = {
    headersSent: false,
    writableEnded: false,
    status: jest.fn(),
    json: jest.fn(),
    setHeader: jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response;
}

describe('ServiceProxyMiddleware retry policy', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    requestMock.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retries a failed GET once and returns the final gateway error', () => {
    requestMock.mockImplementation(() => {
      const client = new ClientRequestStub();
      client.end.mockImplementation(() => client.emit('error', new Error('ECONNRESET')));
      return client as never;
    });
    const res = response();

    new ServiceProxyMiddleware(config()).use(request('GET'), res, jest.fn());
    jest.runAllTimers();

    expect(requestMock).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'error',
        statusCode: 502,
        code: 'SYSTEM_UNAVAILABLE',
      }),
    );
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'never retries mutation method %s',
    (method) => {
      requestMock.mockImplementation(() => {
        const client = new ClientRequestStub();
        setImmediate(() => client.emit('error', new Error('ECONNREFUSED')));
        return client as never;
      });
      const req = request(method, '/api/v1/cart', { id: 'user-1', role: 'USER' });
      const res = response();

      new ServiceProxyMiddleware(config()).use(req, res, jest.fn());
      jest.runAllTimers();

      expect(requestMock).toHaveBeenCalledTimes(1);
    },
  );

  it('returns 504 after an upstream timeout without configured retries', () => {
    requestMock.mockImplementation(() => {
      const client = new ClientRequestStub();
      client.end.mockImplementation(() => client.emit('timeout'));
      return client as never;
    });
    const res = response();

    new ServiceProxyMiddleware(
      config({ PROXY_MAX_RETRIES: 0 }),
    ).use(request('GET'), res, jest.fn());

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(504);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 504 }));
  });
});

describe('ServiceProxyMiddleware security boundary & identity protection', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('strips client-forged identity headers and does not forward them to upstream', () => {
    let forwardedHeaders: any = null;
    requestMock.mockImplementation((opts: any) => {
      forwardedHeaders = opts.headers;
      const client = new ClientRequestStub();
      return client as never;
    });

    const forgedHeaders = {
      'x-user-id': 'forged-attacker-id',
      'x-user-role': 'PLATFORM_ADMIN',
      'x-business-id': 'forged-business-id',
      'x-store-id': 'forged-store-id',
      'x-internal-service': 'true',
    };

    // Public catalog route accessed by guest
    const req = request('GET', '/api/v1/catalog', undefined, forgedHeaders);
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(forwardedHeaders['x-user-id']).toBeUndefined();
    expect(forwardedHeaders['x-user-role']).toBeUndefined();
    expect(forwardedHeaders['x-business-id']).toBeUndefined();
    expect(forwardedHeaders['x-store-id']).toBeUndefined();
    expect(forwardedHeaders['x-internal-service']).toBeUndefined();
  });

  it('only populates identity headers from verified req.user', () => {
    let forwardedHeaders: any = null;
    requestMock.mockImplementation((opts: any) => {
      forwardedHeaders = opts.headers;
      const client = new ClientRequestStub();
      return client as never;
    });

    const req = request(
      'GET',
      '/api/v1/cart',
      {
        id: 'verified-user-123',
        role: 'USER',
        email: 'user@example.com',
        businessId: 'biz-789',
      },
      {
        'x-user-id': 'untrusted-spoof',
        'x-user-role': 'PLATFORM_ADMIN',
      },
    );
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(forwardedHeaders['x-user-id']).toBe('verified-user-123');
    expect(forwardedHeaders['x-user-role']).toBe('USER');
    expect(forwardedHeaders['x-user-email']).toBe('user@example.com');
    expect(forwardedHeaders['x-business-id']).toBe('biz-789');
  });

  it('rejects access to ADMIN endpoint when no token is provided (401)', () => {
    const req = request('GET', '/api/v1/admin/finance/reconciliation', undefined, {
      'x-user-id': 'attacker',
      'x-user-role': 'PLATFORM_ADMIN',
    });
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'AUTH_TOKEN_MISSING',
      }),
    );
  });

  it('rejects access to ADMIN endpoint when token is invalid (401)', () => {
    const req = request(
      'GET',
      '/api/v1/admin/finance/reconciliation',
      undefined,
      { authorization: 'Bearer invalid-token' },
      { code: 'AUTH_TOKEN_INVALID', message: 'Invalid token' },
    );
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'AUTH_TOKEN_INVALID',
      }),
    );
  });

  it('rejects access to ADMIN endpoint when user lacks admin role (403)', () => {
    const req = request(
      'GET',
      '/api/v1/admin/finance/reconciliation',
      { id: 'user-1', role: 'USER' },
      { 'x-user-role': 'PLATFORM_ADMIN' }, // Attempted header forgery
    );
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'AUTHZ_ROLE_INSUFFICIENT',
      }),
    );
  });

  it('allows access to ADMIN endpoint for verified PLATFORM_ADMIN', () => {
    requestMock.mockImplementation(() => new ClientRequestStub() as never);
    const req = request('GET', '/api/v1/admin/finance/reconciliation', {
      id: 'admin-1',
      role: 'PLATFORM_ADMIN',
    });
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(401);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('rejects access to SELLER endpoint when user is regular buyer (403)', () => {
    const req = request('GET', '/api/v1/seller/orders', { id: 'buyer-1', role: 'USER' });
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'AUTHZ_ROLE_INSUFFICIENT',
      }),
    );
  });

  it('allows access to SELLER endpoint for verified BUSINESS user', () => {
    requestMock.mockImplementation(() => new ClientRequestStub() as never);
    const req = request('GET', '/api/v1/seller/orders', { id: 'seller-1', role: 'BUSINESS' });
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('propagates client correlation ID and sets it on response header', () => {
    let forwardedHeaders: any = null;
    requestMock.mockImplementation((opts: any) => {
      forwardedHeaders = opts.headers;
      return new ClientRequestStub() as never;
    });

    const req = request(
      'GET',
      '/api/v1/catalog',
      undefined,
      { 'x-correlation-id': 'client-corr-id-123' },
    );
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(forwardedHeaders['x-correlation-id']).toBe('client-corr-id-123');
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', 'client-corr-id-123');
  });

  it('generates a new correlation ID when client does not supply one', () => {
    let forwardedHeaders: any = null;
    requestMock.mockImplementation((opts: any) => {
      forwardedHeaders = opts.headers;
      return new ClientRequestStub() as never;
    });

    const req = request('GET', '/api/v1/catalog');
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).toHaveBeenCalledTimes(1);
    expect(forwardedHeaders['x-correlation-id']).toBeDefined();
    expect(typeof forwardedHeaders['x-correlation-id']).toBe('string');
    expect(res.setHeader).toHaveBeenCalledWith('x-correlation-id', forwardedHeaders['x-correlation-id']);
  });

  it('routes /admin/drm to commerce service', () => {
    let targetPort: number | null = null;
    requestMock.mockImplementation((opts: any) => {
      targetPort = opts.port;
      return new ClientRequestStub() as never;
    });

    const req = request(
      'GET',
      '/api/v1/admin/drm/overview',
      { id: 'admin-1', role: 'PLATFORM_ADMIN' },
    );
    const res = response();

    new ServiceProxyMiddleware(config()).use(req, res, jest.fn());

    expect(requestMock).toHaveBeenCalledTimes(1);
    // Port 3003 is commerce service
    expect(targetPort).toBe(3003);
  });
});
