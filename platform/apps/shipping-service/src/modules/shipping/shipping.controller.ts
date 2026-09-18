import { Controller, Get, Post, Query, Body, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { throwUnauthorized } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';
import { ShippingFeeQueryDto, ShippingFeeBodyDto } from './dto/shipping-fee.dto';
import { ShippingService } from './shipping.service';

function validateInternalKey(config: ConfigService, key: string | undefined): boolean {
  const expected = config.get<string>('INTERNAL_SERVICE_KEY') || 'huki-local-internal-service';
  return key === expected;
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
  @ApiResponse({ status: 401, description: 'Invalid internal key' })
  calculateFeeInternal(
    @Headers('x-internal-service-key') serviceKey: string,
    @Body() body: ShippingFeeBodyDto,
  ) {
    if (!validateInternalKey(this.config, serviceKey)) {
      throwUnauthorized(ErrorCode.AUTH_INTERNAL_API_KEY_INVALID, 'Invalid internal service key');
    }
    return this.shipping.calculateFee(body);
  }
}
