import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function host() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const value = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/books', originalUrl: '/api/v1/books' }),
    }),
  } as unknown as ArgumentsHost;
  return { value, response };
}

describe('HttpExceptionFilter', () => {
  const cases = [
    [new UnauthorizedException(), 401, 'AUTH_TOKEN_INVALID'],
    [new ForbiddenException(), 403, 'AUTHZ_FORBIDDEN'],
    [new NotFoundException(), 404, 'SYSTEM_ERROR'],
    [new InternalServerErrorException(), 500, 'SYSTEM_INTERNAL_ERROR'],
  ] as const;

  it.each(cases)('normalizes %p', (exception, statusCode, code) => {
    const { value, response } = host();
    new HttpExceptionFilter().catch(exception, value);

    expect(response.status).toHaveBeenCalledWith(statusCode);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      statusCode,
      code,
      path: '/api/v1/books',
    }));
  });

  it('keeps validation errors as structured details', () => {
    const { value, response } = host();
    new HttpExceptionFilter().catch(
      new BadRequestException(['title must be a string', 'price must be positive']),
      value,
    );

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      status: 'error',
      statusCode: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: ['title must be a string', 'price must be positive'],
    }));
  });
});
