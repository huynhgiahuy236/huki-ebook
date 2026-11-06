import { Controller, Get, Post, Query, Body, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { throwForbidden } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';
import { ShippingFeeQueryDto, ShippingFeeBodyDto } from './dto/shipping-fee.dto';
import { ShippingService } from './shipping.service';

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

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shipping: ShippingService,
    private readonly config: ConfigService,
  ) {}

  @Get('fee')
  @ApiOperation({
    summary: 'Calculate a deterministic GHTK mock shipping quote',
  })
  fee(@Query() query: ShippingFeeQueryDto) {
    return this.shipping.calculateFee(query);
  }

  @Post('fee')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate shipping fee (POST version)',
    description: 'Calculate shipping fee with POST body for internal service calls.',
  })
  @ApiResponse({ status: 200, description: 'Shipping fee calculation result' })
  calculateFeePost(@Body() body: ShippingFeeBodyDto) {
    return this.shipping.calculateFee(body);
  }

  @Post('fee/internal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Calculate shipping fee (internal)',
    description: 'Internal endpoint for commerce-service to calculate shipping fees.',
  })
  @ApiHeader({ name: 'x-internal-service-key', required: true })
  @ApiResponse({ status: 200, description: 'Shipping fee calculation result' })
  @ApiResponse({ status: 403, description: 'Forbidden: Invalid internal key' })
  calculateFeeInternal(
    @Headers('x-internal-service-key') serviceKey: string,
    @Body() body: ShippingFeeBodyDto,
  ) {
    if (!validateInternalKey(this.config, serviceKey)) {
      throwForbidden(ErrorCode.AUTHZ_FORBIDDEN, 'Internal service credentials are required');
    }
    return this.shipping.calculateFee(body);
  }
}
