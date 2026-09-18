/**
 * Shipping Module - Commerce Service
 * Provides shipping client for checkout
 */

import { Module, Global } from '@nestjs/common';
import { ShippingClientService } from './shipping-client.service';

@Global()
@Module({
  providers: [ShippingClientService],
  exports: [ShippingClientService],
})
export class ShippingModule {}
