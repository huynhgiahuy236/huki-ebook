import { IPolicyConfig, IPolicyConfigMetadata } from './policy-config.interface';

/**
 * HUKI EBOOK - Engineering Defaults & Fallback Values
 * 
 * CAUTION: These values are strictly ENGINEERING DEFAULTS / PLACEHOLDERS
 * intended to allow software infrastructure to function before formal
 * Product Owner approvals. They MUST NOT be construed as business-approved values.
 */

export const DEFAULT_POLICY_CONFIG: Readonly<IPolicyConfig> = {
  // DEC-001: 120s dev/test default (Proposed Production: 900s)
  orderPaymentTtlSeconds: 120,

  // DEC-002: Platform commission rate 5%
  platformCommissionPercent: 5,

  // DEC-002: Engineering placeholder for fee basis
  commissionCalculationBasis: 'NET_PAID',

  // DEC-003: Engineering placeholder for VAT invoicing mode
  vatInvoiceMode: 'MANUAL',

  // DEC-004: Engineering placeholder: 1.0 (100% platform subsidy)
  platformVoucherSubsidyRate: 1.0,

  // DEC-005: Engineering placeholder: false (Disabled during initial launch)
  featureCoinEnabled: false,

  // DEC-006: Proposed 48h merchant dispatch deadline
  merchantDispatchDeadlineHours: 48,

  // DEC-006: Engineering placeholder: false (Warning only, no auto-cancel)
  autoCancelOnDispatchTimeout: false,

  // DEC-007: Engineering default: 3 devices
  drmMaxActiveDevices: 3,

  // DEC-008: Engineering placeholder: FLAT_RATE
  shippingPricingModel: 'FLAT_RATE',
};

export const POLICY_DECISION_METADATA: ReadonlyArray<IPolicyConfigMetadata> = [
  {
    decisionId: 'DEC-001',
    parameterName: 'orderPaymentTtlSeconds',
    envKey: 'ORDER_PAYMENT_TTL_SECONDS',
    governanceStatus: 'ENGINEERING_DEFAULT',
    businessApprovalStatus: 'PENDING_PO_APPROVAL',
    description: 'Payment countdown timer TTL in seconds (Dev: 120s, Prod proposed: 900s)',
  },
  {
    decisionId: 'DEC-002',
    parameterName: 'platformCommissionPercent',
    envKey: 'PLATFORM_COMMISSION_PERCENT',
    governanceStatus: 'PROPOSED',
    businessApprovalStatus: 'PENDING_PO_APPROVAL',
    description: 'Platform commission fee percentage (Proposed: 15%)',
  },
  {
    decisionId: 'DEC-002',
    parameterName: 'commissionCalculationBasis',
    envKey: 'COMMISSION_CALCULATION_BASIS',
    governanceStatus: 'ENGINEERING_DEFAULT',
    businessApprovalStatus: 'PENDING_PO_APPROVAL',
    description: 'Fee calculation basis: SUBTOTAL vs NET_PAID',
  },
  {
    decisionId: 'DEC-003',
    parameterName: 'vatInvoiceMode',
    envKey: 'VAT_INVOICE_MODE',
    governanceStatus: 'ENGINEERING_DEFAULT',
    businessApprovalStatus: 'PENDING_PO_APPROVAL',
    description: 'VAT invoice generation workflow: MANUAL vs E_INVOICE_API',
  },
  {
    decisionId: 'DEC-004',
    parameterName: 'platformVoucherSubsidyRate',
    envKey: 'PLATFORM_VOUCHER_SUBSIDY_RATE',
    governanceStatus: 'ENGINEERING_DEFAULT',
    businessApprovalStatus: 'PENDING_PO_APPROVAL',
    description: 'Platform subsidy rate for platform vouchers (0.0 to 1.0)',
  },
  {
    decisionId: 'DEC-005',
    parameterName: 'featureCoinEnabled',
    envKey: 'FEATURE_COIN_ENABLED',
    governanceStatus: 'ENGINEERING_DEFAULT',
    businessApprovalStatus: 'PENDING_PO_APPROVAL',
    description: 'Feature flag to enable/disable Huki Coin reward system',
  },
  {
    decisionId: 'DEC-006',
    parameterName: 'merchantDispatchDeadlineHours',
    envKey: 'MERCHANT_DISPATCH_DEADLINE_HOURS',
    governanceStatus: 'PROPOSED',
    businessApprovalStatus: 'PENDING_PO_APPROVAL',
    description: 'Merchant dispatch SLA deadline in hours (Proposed: 48h)',
  },
  {
    decisionId: 'DEC-006',
    parameterName: 'autoCancelOnDispatchTimeout',
    envKey: 'AUTO_CANCEL_ON_DISPATCH_TIMEOUT',
    governanceStatus: 'ENGINEERING_DEFAULT',
    businessApprovalStatus: 'PENDING_PO_APPROVAL',
    description: 'Auto-cancel sub-orders exceeding dispatch SLA deadline',
  },
  {
    decisionId: 'DEC-007',
    parameterName: 'drmMaxActiveDevices',
    envKey: 'DRM_MAX_ACTIVE_DEVICES',
    governanceStatus: 'ENGINEERING_DEFAULT',
    businessApprovalStatus: 'PENDING_PO_APPROVAL',
    description: 'Maximum active reading devices per account (3 vs 5)',
  },
  {
    decisionId: 'DEC-008',
    parameterName: 'shippingPricingModel',
    envKey: 'SHIPPING_PRICING_MODEL',
    governanceStatus: 'ENGINEERING_DEFAULT',
    businessApprovalStatus: 'PENDING_PO_APPROVAL',
    description: 'Shipping pricing model: FLAT_RATE vs THIRD_PARTY_API',
  },
];
