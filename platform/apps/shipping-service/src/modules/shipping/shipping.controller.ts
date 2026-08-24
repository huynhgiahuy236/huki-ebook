import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShippingFeeQueryDto } from './dto/shipping-fee.dto';
import { ShippingService } from './shipping.service';
@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}
  @Get('fee')
  @ApiOperation({
    summary: 'Calculate a deterministic GHTK mock shipping quote',
  })
  fee(@Query() query: ShippingFeeQueryDto) {
    return this.shipping.calculateFee(query);
  }
}
