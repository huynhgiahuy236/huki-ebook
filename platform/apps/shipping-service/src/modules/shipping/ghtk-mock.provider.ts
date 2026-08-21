import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import {
  CarrierFeeInput,
  CarrierFeeQuote,
  CarrierProvider,
  CarrierShipmentInput,
  CarrierShipmentResult,
} from './carrier.provider';

@Injectable()
export class GhtkMockProvider implements CarrierProvider {
  constructor(private readonly config: ConfigService) {}
  async calculateFee(input: CarrierFeeInput): Promise<CarrierFeeQuote> {
    const baseFee = this.numberConfig('GHTK_MOCK_BASE_FEE', 15_000);
    const extraWeightFee = this.numberConfig('GHTK_MOCK_EXTRA_500G_FEE', 5_000);
    const interProvinceFee = this.numberConfig(
      'GHTK_MOCK_INTER_PROVINCE_FEE',
      10_000,
    );
    const pickupProvince = this.normalize(
      this.config.get('GHTK_PICKUP_PROVINCE') ?? 'Hồ Chí Minh',
    );
    const sameProvince = this.normalize(input.province) === pickupProvince;
    const extraUnits = Math.max(0, Math.ceil((input.weight - 500) / 500));
    const shippingFee =
      baseFee +
      extraUnits * extraWeightFee +
      (sameProvince ? 0 : interProvinceFee);
    const codFee = input.codAmount
      ? Math.round(
          input.codAmount * this.numberConfig('GHTK_MOCK_COD_RATE', 0.005),
        )
      : 0;
    return {
      carrier: 'GHTK',
      service: 'STANDARD',
      shippingFee,
      codFee,
      totalFee: shippingFee + codFee,
      estimatedDays: sameProvince ? { min: 1, max: 2 } : { min: 3, max: 5 },
    };
  }
  async createShipment(
    input: CarrierShipmentInput,
  ): Promise<CarrierShipmentResult> {
    const quote = await this.calculateFee(input);
    const suffix = createHash('sha256')
      .update(input.sellerOrderId)
      .digest('hex')
      .slice(0, 12)
      .toUpperCase();
    const estimatedDeliveryAt = new Date();
    estimatedDeliveryAt.setUTCDate(
      estimatedDeliveryAt.getUTCDate() + quote.estimatedDays.max,
    );
    return { trackingNumber: `GHTK${suffix}`, estimatedDeliveryAt };
  }
  async cancelShipment(_trackingNumber: string): Promise<void> {
    return;
  }
  private numberConfig(key: string, fallback: number) {
    const value = Number(this.config.get(key));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }
  private normalize(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }
}
