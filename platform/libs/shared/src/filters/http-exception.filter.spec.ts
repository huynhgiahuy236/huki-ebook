/**
 * Unit tests for HttpExceptionFilter
 * P3: Response Contract Standardization
 */

import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

function host() {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const value = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/books', originalUrl: '/api/v1/books', headers: {} }),
    }),
  } as unknown as ArgumentsHost;
  return { value, response };
}

describe('HttpExceptionFilter', () => {
  describe('standard HTTP exceptions', () => {
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
        requestId: expect.any(String),
        timestamp: expect.any(String),
      }));
    });
  });

  describe('structured exception responses', () => {
    it('uses code and message from structured response', () => {
      const { value, response } = host();
      new HttpExceptionFilter().catch(
        new NotFoundException({ code: 'BOOK_NOT_FOUND', message: 'Sách không tìm thấy' }),
        value,
      );

      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        statusCode: 404,
        code: 'BOOK_NOT_FOUND',
        message: 'Sách không tìm thấy',
      }));
    });

    it('uses code from ForbiddenException with structured response', () => {
      const { value, response } = host();
      new HttpExceptionFilter().catch(
        new ForbiddenException({ code: 'AUTHZ_ROLE_INSUFFICIENT', message: 'Vai trò không đủ quyền' }),
        value,
      );

      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        statusCode: 403,
        code: 'AUTHZ_ROLE_INSUFFICIENT',
        message: 'Vai trò không đủ quyền',
      }));
    });

    it('includes details when present in structured response', () => {
      const { value, response } = host();
      new HttpExceptionFilter().catch(
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          details: [{ field: 'email', code: 'VALIDATION_EMAIL', message: 'Email không hợp lệ' }],
        }),
        value,
      );

      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'error',
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu không hợp lệ',
        details: [{ field: 'email', code: 'VALIDATION_EMAIL', message: 'Email không hợp lệ' }],
      }));
    });
  });

  describe('validation errors', () => {
    it('formats class-validator array messages', () => {
      const { value, response } = host();
      new HttpExceptionFilter().catch(
        new BadRequestException(['title must be a string', 'price must be positive']),
        value,
      );

      const jsonCall = response.json.mock.calls[0][0];
      expect(jsonCall.status).toBe('error');
      expect(jsonCall.statusCode).toBe(400);
      expect(jsonCall.code).toBe('VALIDATION_ERROR');
      expect(jsonCall.message).toBe('Validation failed');
      expect(jsonCall.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title', code: 'VALIDATION_ERROR', message: 'title must be a string' }),
          expect.objectContaining({ field: 'price', code: 'VALIDATION_ERROR', message: 'price must be positive' }),
        ]),
      );
    });
  });

  describe('P3 format compliance', () => {
    it('does NOT include stack trace in error response', () => {
      const { value, response } = host();
      new HttpExceptionFilter().catch(
        new InternalServerErrorException('Something went wrong'),
        value,
      );

      const jsonCall = response.json.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('stack');
      expect(jsonCall).not.toHaveProperty('password');
      expect(jsonCall).not.toHaveProperty('secret');
    });

    it('does NOT include details for 5xx errors', () => {
      const { value, response } = host();
      new HttpExceptionFilter().catch(
        new InternalServerErrorException({ message: 'Internal error', details: { internal: 'data' } }),
        value,
      );

      const jsonCall = response.json.mock.calls[0][0];
      expect(jsonCall).not.toHaveProperty('details');
    });

    it('includes all required P3 error fields', () => {
      const { value, response } = host();
      new HttpExceptionFilter().catch(
        new NotFoundException({ code: 'BOOK_NOT_FOUND', message: 'Không tìm thấy sách' }),
        value,
      );

      const jsonCall = response.json.mock.calls[0][0];
      expect(jsonCall).toHaveProperty('status', 'error');
      expect(jsonCall).toHaveProperty('statusCode', 404);
      expect(jsonCall).toHaveProperty('code', 'BOOK_NOT_FOUND');
      expect(jsonCall).toHaveProperty('message', 'Không tìm thấy sách');
      expect(jsonCall).toHaveProperty('path', '/api/v1/books');
      expect(jsonCall).toHaveProperty('requestId');
      expect(jsonCall).toHaveProperty('timestamp');
    });
  });
});
