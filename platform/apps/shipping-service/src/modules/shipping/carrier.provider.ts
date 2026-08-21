export const CARRIER_PROVIDER = Symbol('CARRIER_PROVIDER');
export interface CarrierFeeInput {
  province: string;
  district: string;
  weight: number;
  codAmount?: number;
}
export interface CarrierFeeQuote {
  carrier: string;
  service: string;
  shippingFee: number;
  codFee: number;
  totalFee: number;
  estimatedDays: { min: number; max: number };
}
export interface CarrierShipmentInput extends CarrierFeeInput {
  sellerOrderId: string;
}
export interface CarrierShipmentResult {
  trackingNumber: string;
  estimatedDeliveryAt: Date;
}
export interface CarrierProvider {
  calculateFee(input: CarrierFeeInput): Promise<CarrierFeeQuote>;
  createShipment(input: CarrierShipmentInput): Promise<CarrierShipmentResult>;
  cancelShipment(trackingNumber: string): Promise<void>;
}
