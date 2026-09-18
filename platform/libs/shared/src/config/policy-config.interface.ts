/**
 * HUKI EBOOK - Policy Configuration Interface
 * 
 * Defines the contract for all Decision-dependent configuration parameters
 * across the 8 Pending Business Decisions (DEC-001 -> DEC-008).
 * 
 * IMPORTANT: Values loaded from this contract are marked as
 * ENGINEERING DEFAULT / PLACEHOLDER until formally approved by Product Owner.
 */

export type CommissionCalculationBasis = 'SUBTOTAL' | 'NET_PAID';
export type VatInvoiceMode = 'MANUAL' | 'E_INVOICE_API';
export type ShippingPricingModel = 'FLAT_RATE' | 'THIRD_PARTY_API';

export interface IPolicyConfig {
  /**
   * DEC-001: Payment Countdown TTL in seconds
   * Engineering Default: 120s (Dev/Test) | Proposed Prod: 900s (15m)
   * Decision Status: PENDING_PO_APPROVAL
   */
  orderPaymentTtlSeconds: number;

  /**
   * DEC-002: Platform commission fee percentage
   * Proposed Rate: 15% | Decision Status: PENDING_PO_APPROVAL
   */
  platformCommissionPercent: number;

  /**
   * DEC-002: Fee calculation basis
   * Option A: SUBTOTAL (Original price before discount)
   * Option B: NET_PAID (Actual amount after shop discount)
   * Decision Status: PENDING_PO_APPROVAL
   */
  commissionCalculationBasis: CommissionCalculationBasis;

  /**
   * DEC-003: Electronic VAT invoice issuance workflow
   * Option A: E_INVOICE_API (Automated VNPT/Viettel API)
   * Option B: MANUAL (Portal export for accounting)
   * Decision Status: PENDING_PO_APPROVAL
   */
  vatInvoiceMode: VatInvoiceMode;

  /**
   * DEC-004: Platform voucher funding subsidy rate (0.0 to 1.0)
   * Engineering Default: 1.0 (100% platform subsidized)
   * Decision Status: PENDING_PO_APPROVAL
   */
  platformVoucherSubsidyRate: number;

  /**
   * DEC-005: Feature flag for Huki Coin reward system
   * Engineering Default: false (Disabled during initial launch)
   * Decision Status: PENDING_PO_APPROVAL
   */
  featureCoinEnabled: boolean;

  /**
   * DEC-006: Merchant dispatch SLA deadline in hours
   * Proposed Rate: 48h | Decision Status: PENDING_PO_APPROVAL
   */
  merchantDispatchDeadlineHours: number;

  /**
   * DEC-006: Auto-cancel sub-orders exceeding dispatch deadline
   * Option A: true (Auto-cancel & 100% refund)
   * Option B: false (Reputation penalty warning only)
   * Engineering Default: false | Decision Status: PENDING_PO_APPROVAL
   */
  autoCancelOnDispatchTimeout: boolean;

  /**
   * DEC-007: Maximum simultaneous active reader devices per ebook account
   * Option A: 3 devices | Option B: 5 devices
   * Engineering Default: 3 | Decision Status: PENDING_PO_APPROVAL
   */
  drmMaxActiveDevices: number;

  /**
   * DEC-008: Shipping pricing calculation model
   * Option A: FLAT_RATE (15k/25k/35k)
   * Option B: THIRD_PARTY_API (GHN/GHTK/ViettelPost real-time)
   * Engineering Default: FLAT_RATE | Decision Status: PENDING_PO_APPROVAL
   */
  shippingPricingModel: ShippingPricingModel;
}

export interface IPolicyConfigMetadata {
  decisionId: string;
  parameterName: keyof IPolicyConfig;
  envKey: string;
  governanceStatus: 'ENGINEERING_DEFAULT' | 'PROPOSED' | 'APPROVED';
  businessApprovalStatus: 'PENDING_PO_APPROVAL' | 'APPROVED';
  description: string;
}
