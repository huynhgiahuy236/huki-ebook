import { Inject, Injectable } from '@nestjs/common';
import { CARRIER_PROVIDER, CarrierProvider } from './carrier.provider';
import { ShippingFeeQueryDto } from './dto/shipping-fee.dto';
@Injectable()
export class ShippingService {
  constructor(
    @Inject(CARRIER_PROVIDER) private readonly carrier: CarrierProvider,
  ) {}
  calculateFee(query: ShippingFeeQueryDto) {
    return this.carrier.calculateFee(query);
  }
}
