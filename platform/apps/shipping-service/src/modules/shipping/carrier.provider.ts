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
  /** Stable idempotency key: retries for a seller order must return its existing waybill. */
  sellerOrderId: string;
}
export interface CarrierShipmentResult {
  trackingNumber: string;
  estimatedDeliveryAt: Date;
}
export interface CarrierProvider {
  calculateFee(input: CarrierFeeInput): Promise<CarrierFeeQuote>;
  /** Implementations must deduplicate repeated requests using input.sellerOrderId. */
  createShipment(input: CarrierShipmentInput): Promise<CarrierShipmentResult>;
  /** Repeated cancellation of the same tracking number must be safe. */
  cancelShipment(trackingNumber: string): Promise<void>;
}
