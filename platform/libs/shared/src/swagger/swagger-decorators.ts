import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  PaginationMetaDto,
  ResponseMetaDto,
  ValidationErrorDto,
} from './common.dto';

/**
 * Class representation of P3 Error Response for Swagger schema generation.
 * Matches HttpExceptionFilter output without altering runtime behavior.
 */
export class P3ErrorResponseDto {
  @ApiProperty({ example: 'error', enum: ['error'] })
  status!: 'error';

  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;

  @ApiPropertyOptional({ type: () => [ValidationErrorDto] })
  details?: ValidationErrorDto[];

  @ApiProperty({ example: '/api/v1/auth/login' })
  path!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  requestId!: string;

  @ApiProperty({ example: '2026-11-28T08:00:00.000Z' })
  timestamp!: string;
}

export interface ApiSuccessResponseOptions {
  status?: number;
  description?: string;
  isArray?: boolean;
  messageExample?: string;
}

/**
 * Documents a standard P3 success response envelope:
 * { status: 'success', statusCode, message?, data, meta }
 */
export function ApiSuccessResponse<TModel extends Type<any>>(
  model?: TModel,
  options: ApiSuccessResponseOptions = {},
) {
  const status = options.status ?? 200;
  const description = options.description ?? 'Thành công';
  const messageExample = options.messageExample ?? 'Thành công';

  const dataSchema = model
    ? options.isArray
      ? { type: 'array', items: { $ref: getSchemaPath(model) } }
      : { $ref: getSchemaPath(model) }
    : options.isArray
      ? { type: 'array', items: { type: 'object' } }
      : { type: 'object' };

  const extraModels: Type<any>[] = [ResponseMetaDto];
  if (model) extraModels.push(model);

  return applyDecorators(
    ApiExtraModels(...extraModels),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['status', 'statusCode', 'data', 'meta'],
        properties: {
          status: { type: 'string', example: 'success' },
          statusCode: { type: 'number', example: status },
          message: { type: 'string', example: messageExample },
          data: dataSchema,
          meta: { $ref: getSchemaPath(ResponseMetaDto) },
        },
      },
    }),
  );
}

/**
 * Documents a standard P3 paginated response envelope:
 * { status: 'success', statusCode, message?, data: T[], pagination, meta }
 */
export function ApiPaginatedResponse<TModel extends Type<any>>(
  model: TModel,
  options: Omit<ApiSuccessResponseOptions, 'isArray'> = {},
) {
  const status = options.status ?? 200;
  const description = options.description ?? 'Lấy danh sách thành công';
  const messageExample = options.messageExample ?? 'Thành công';

  return applyDecorators(
    ApiExtraModels(ResponseMetaDto, PaginationMetaDto, model),
    ApiResponse({
      status,
      description,
      schema: {
        type: 'object',
        required: ['status', 'statusCode', 'data', 'pagination', 'meta'],
        properties: {
          status: { type: 'string', example: 'success' },
          statusCode: { type: 'number', example: status },
          message: { type: 'string', example: messageExample },
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(model) },
          },
          pagination: { $ref: getSchemaPath(PaginationMetaDto) },
          meta: { $ref: getSchemaPath(ResponseMetaDto) },
        },
      },
    }),
  );
}

export interface ErrorResponseSpec {
  status: number;
  code?: string;
  description?: string;
  message?: string;
}

const DEFAULT_ERROR_META: Record<
  number,
  { code: string; description: string; message: string }
> = {
  400: {
    code: 'VALIDATION_ERROR',
    description: 'Dữ liệu đầu vào không hợp lệ',
    message: 'Validation failed',
  },
  401: {
    code: 'UNAUTHORIZED',
    description: 'Chưa xác thực hoặc token không hợp lệ',
    message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.',
  },
  403: {
    code: 'FORBIDDEN',
    description: 'Không có quyền thực hiện thao tác này',
    message: 'Bạn không có quyền truy cập tài nguyên này.',
  },
  404: {
    code: 'NOT_FOUND',
    description: 'Không tìm thấy tài nguyên yêu cầu',
    message: 'Không tìm thấy dữ liệu yêu cầu.',
  },
  409: {
    code: 'CONFLICT',
    description: 'Xung đột trạng thái hoặc dữ liệu đã tồn tại',
    message: 'Dữ liệu đã tồn tại hoặc trạng thái không hợp lệ.',
  },
  422: {
    code: 'UNPROCESSABLE_ENTITY',
    description: 'Vi phạm quy tắc nghiệp vụ',
    message: 'Không thể xử lý yêu cầu theo quy tắc nghiệp vụ.',
  },
  429: {
    code: 'RATE_LIMIT_EXCEEDED',
    description: 'Vượt quá giới hạn số lần gọi API',
    message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.',
  },
  500: {
    code: 'SYSTEM_INTERNAL_ERROR',
    description: 'Lỗi hệ thống nội bộ',
    message: 'Có lỗi xảy ra trong quá trình xử lý. Vui lòng thử lại sau.',
  },
};

/**
 * Documents one or more standard P3 error responses on a route.
 * Accepts status codes (e.g. 400, 401, 404) or detailed ErrorResponseSpec objects.
 */
export function ApiStandardErrors(
  ...specs: Array<number | ErrorResponseSpec>
) {
  const normalized = specs.map((item) =>
    typeof item === 'number' ? { status: item } : item,
  );

  const decorators = normalized.map((spec) => {
    const defaults = DEFAULT_ERROR_META[spec.status] ?? {
      code: 'ERROR',
      description: `Lỗi HTTP ${spec.status}`,
      message: 'Yêu cầu không thành công.',
    };
    const code = spec.code ?? defaults.code;
    const description = spec.description ?? defaults.description;
    const message = spec.message ?? defaults.message;

    return ApiResponse({
      status: spec.status,
      description,
      schema: {
        allOf: [{ $ref: getSchemaPath(P3ErrorResponseDto) }],
        example: {
          status: 'error',
          statusCode: spec.status,
          code,
          message,
          ...(spec.status === 400
            ? {
                details: [
                  {
                    field: 'fieldName',
                    code: 'VALIDATION_ERROR',
                    message: 'Thông báo lỗi chi tiết',
                  },
                ],
              }
            : {}),
          path: '/api/v1/...',
          requestId: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2026-11-28T08:00:00.000Z',
        },
      },
    });
  });

  return applyDecorators(
    ApiExtraModels(P3ErrorResponseDto, ValidationErrorDto),
    ...decorators,
  );
}
