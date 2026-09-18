/**
 * Voucher Module - Commerce Service
 * Provides voucher client and pricing calculator for checkout
 */

import { Module, Global } from '@nestjs/common';
import { VoucherClientService } from './voucher-client.service';
import { PricingCalculatorService } from './pricing-calculator.service';

@Global()
@Module({
  providers: [VoucherClientService, PricingCalculatorService],
  exports: [VoucherClientService, PricingCalculatorService],
})
export class VoucherModule {}
