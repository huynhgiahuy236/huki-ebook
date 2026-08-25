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
        PROXY_TIMEOUT_MS: 30_000,
        PROXY_MAX_RETRIES: 1,
        PROXY_RETRY_DELAY_MS: 0,
      };
      return key in values ? values[key] : defaults[key];
    }),
  } as unknown as ConfigService;
}

function request(method: string): Request {
  return {
    method,
    originalUrl: '/api/v1/auth/profile',
    headers: {},
    body: method === 'POST' ? { name: 'test' } : undefined,
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
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      statusCode: 502,
      code: 'SYSTEM_UNAVAILABLE',
    }));
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'never retries mutation method %s',
    (method) => {
      requestMock.mockImplementation(() => {
        const client = new ClientRequestStub();
        setImmediate(() => client.emit('error', new Error('ECONNREFUSED')));
        return client as never;
      });
      const req = request(method);
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
