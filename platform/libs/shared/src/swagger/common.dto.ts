/**
 * HUKI EBOOK - Shared Swagger DTOs
 *
 * P3 Response Contract - Swagger/OpenAPI definitions
 * These schemas match the TransformInterceptor and HttpExceptionFilter
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response metadata (included in all responses)
 */
export class ResponseMetaDto {
  @ApiProperty({ description: 'Unique request ID for tracing' })
  requestId: string;

  @ApiProperty({ description: 'ISO-8601 timestamp' })
  timestamp: string;
}

/**
 * Pagination metadata
 */
export class PaginationMetaDto {
  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Items per page', example: 20 })
  limit: number;

  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Total number of pages', example: 5 })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page', example: true })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Whether there is a previous page', example: false })
  hasPreviousPage: boolean;
}

/**
 * Validation error detail
 */
export class ValidationErrorDto {
  @ApiProperty({ description: 'Field name', example: 'email' })
  field: string;

  @ApiProperty({ description: 'Error code', example: 'VALIDATION_ERROR' })
  code: string;

  @ApiProperty({ description: 'Error message', example: 'email must be an email' })
  message: string;
}

/**
 * Pagination query parameters
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  limit?: number = 20;
}

/**
 * Sort query parameters
 */
export class SortQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Sort field', example: 'createdAt' })
  sort?: string;

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], example: 'desc' })
  order?: 'asc' | 'desc';
}

/**
 * Search query parameters
 */
export class SearchQueryDto extends SortQueryDto {
  @ApiPropertyOptional({ description: 'Search keyword' })
  search?: string;
}

/**
 * Common status filter
 */
export class StatusQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by status' })
  status?: string;
}

/**
 * Base success response envelope - for reference in controllers
 * Note: The TransformInterceptor wraps responses automatically
 */
export interface SuccessResponseDto<T> {
  status: 'success';
  statusCode: number;
  message?: string;
  data: T;
  pagination?: PaginationMetaDto;
  meta: ResponseMetaDto;
}

/**
 * Base error response envelope - for reference in controllers
 */
export interface ErrorResponseDto {
  status: 'error';
  statusCode: number;
  code: string;
  message: string;
  details?: ValidationErrorDto[];
  path: string;
  requestId: string;
  timestamp: string;
}
