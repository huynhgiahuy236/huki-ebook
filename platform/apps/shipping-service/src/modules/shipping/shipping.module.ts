import { Module } from '@nestjs/common';
import { CARRIER_PROVIDER } from './carrier.provider';
import { GhtkMockProvider } from './ghtk-mock.provider';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
@Module({
  controllers: [ShippingController],
  providers: [
    ShippingService,
    GhtkMockProvider,
    { provide: CARRIER_PROVIDER, useExisting: GhtkMockProvider },
  ],
  exports: [CARRIER_PROVIDER],
})
export class ShippingModule {}
