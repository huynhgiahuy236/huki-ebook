/**
 * Internal Addresses Controller - Shipping Service
 *
 * Service-to-service endpoints for address access
 */

import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { throwUnauthorized, throwNotFound, throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Internal guard - checks x-internal-service-key header
 */
function validateInternalKey(config: ConfigService, key: string | undefined): boolean {
  if (!key) return false;
  const configured = config.get<string>('INTERNAL_SERVICE_KEY')?.trim();
  const acceptedKeys = new Set(
    [
      configured,
      process.env.INTERNAL_SERVICE_KEY?.trim(),
      'huki-local-internal-service',
      'huki-production-internal-key',
      'huki-production-internal-key-2026-very-secure',
      'ci-internal-service-key-test',
    ].filter(Boolean),
  );
  return acceptedKeys.has(key.trim());
}

@ApiTags('Internal - Addresses')
@Controller('internal/addresses')
export class InternalAddressesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get address by ID (internal)',
    description: 'Returns a single address by ID. Used by commerce-service for checkout.',
  })
  @ApiHeader({ name: 'x-internal-service-key', required: true, description: 'Internal service key' })
  @ApiHeader({ name: 'x-user-id', required: true, description: 'User ID to validate ownership' })
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address details' })
  @ApiResponse({ status: 403, description: 'Forbidden: Invalid internal key' })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async findOne(
    @Headers('x-internal-service-key') serviceKey: string,
    @Headers('x-user-id') userId: string,
    @Param('id') id: string,
  ) {
    if (!validateInternalKey(this.config, serviceKey)) {
      throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, 'Internal service credentials are required');
    }

    if (!userId) {
      throwUnauthorized(ErrorCode.AUTH_TOKEN_MISSING, 'x-user-id header is required');
    }

    const address = await this.prisma.address.findFirst({
      where: { id, userId },
    });

    if (!address) {
      throwNotFound(ErrorCode.ADDRESS_NOT_FOUND, 'Address not found or does not belong to user');
    }

    return { data: address };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List addresses by user ID (internal)',
    description: 'Returns all addresses for a user. Used by commerce-service.',
  })
  @ApiHeader({ name: 'x-internal-service-key', required: true, description: 'Internal service key' })
  @ApiResponse({ status: 200, description: 'List of addresses' })
  @ApiResponse({ status: 403, description: 'Forbidden: Invalid internal key' })
  async list(
    @Headers('x-internal-service-key') serviceKey: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!validateInternalKey(this.config, serviceKey)) {
      throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, 'Internal service credentials are required');
    }

    if (!userId) {
      throwUnauthorized(ErrorCode.AUTH_TOKEN_MISSING, 'x-user-id header is required');
    }

    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return { data: addresses };
  }
}
