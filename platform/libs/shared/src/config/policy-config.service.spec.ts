import { PolicyConfigService } from './policy-config.service';
import { DEFAULT_POLICY_CONFIG } from './policy-config.defaults';

describe('PolicyConfigService', () => {
  let service: PolicyConfigService;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    service = new PolicyConfigService();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return engineering default values when env vars are not set', () => {
    delete process.env.ORDER_PAYMENT_TTL_SECONDS;
    delete process.env.PLATFORM_COMMISSION_PERCENT;
    delete process.env.COMMISSION_CALCULATION_BASIS;
    delete process.env.VAT_INVOICE_MODE;
    delete process.env.PLATFORM_VOUCHER_SUBSIDY_RATE;
    delete process.env.FEATURE_COIN_ENABLED;
    delete process.env.MERCHANT_DISPATCH_DEADLINE_HOURS;
    delete process.env.AUTO_CANCEL_ON_DISPATCH_TIMEOUT;
    delete process.env.DRM_MAX_ACTIVE_DEVICES;
    delete process.env.SHIPPING_PRICING_MODEL;

    expect(service.orderPaymentTtlSeconds).toBe(DEFAULT_POLICY_CONFIG.orderPaymentTtlSeconds);
    expect(service.platformCommissionPercent).toBe(DEFAULT_POLICY_CONFIG.platformCommissionPercent);
    expect(service.commissionCalculationBasis).toBe(DEFAULT_POLICY_CONFIG.commissionCalculationBasis);
    expect(service.vatInvoiceMode).toBe(DEFAULT_POLICY_CONFIG.vatInvoiceMode);
    expect(service.platformVoucherSubsidyRate).toBe(DEFAULT_POLICY_CONFIG.platformVoucherSubsidyRate);
    expect(service.featureCoinEnabled).toBe(DEFAULT_POLICY_CONFIG.featureCoinEnabled);
    expect(service.merchantDispatchDeadlineHours).toBe(DEFAULT_POLICY_CONFIG.merchantDispatchDeadlineHours);
    expect(service.autoCancelOnDispatchTimeout).toBe(DEFAULT_POLICY_CONFIG.autoCancelOnDispatchTimeout);
    expect(service.drmMaxActiveDevices).toBe(DEFAULT_POLICY_CONFIG.drmMaxActiveDevices);
    expect(service.shippingPricingModel).toBe(DEFAULT_POLICY_CONFIG.shippingPricingModel);
  });

  it('should load custom configured values from environment variables correctly', () => {
    process.env.ORDER_PAYMENT_TTL_SECONDS = '900';
    process.env.PLATFORM_COMMISSION_PERCENT = '12.5';
    process.env.COMMISSION_CALCULATION_BASIS = 'SUBTOTAL';
    process.env.VAT_INVOICE_MODE = 'E_INVOICE_API';
    process.env.PLATFORM_VOUCHER_SUBSIDY_RATE = '0.5';
    process.env.FEATURE_COIN_ENABLED = 'true';
    process.env.MERCHANT_DISPATCH_DEADLINE_HOURS = '72';
    process.env.AUTO_CANCEL_ON_DISPATCH_TIMEOUT = 'true';
    process.env.DRM_MAX_ACTIVE_DEVICES = '5';
    process.env.SHIPPING_PRICING_MODEL = 'THIRD_PARTY_API';

    expect(service.orderPaymentTtlSeconds).toBe(900);
    expect(service.platformCommissionPercent).toBe(12.5);
    expect(service.commissionCalculationBasis).toBe('SUBTOTAL');
    expect(service.vatInvoiceMode).toBe('E_INVOICE_API');
    expect(service.platformVoucherSubsidyRate).toBe(0.5);
    expect(service.featureCoinEnabled).toBe(true);
    expect(service.merchantDispatchDeadlineHours).toBe(72);
    expect(service.autoCancelOnDispatchTimeout).toBe(true);
    expect(service.drmMaxActiveDevices).toBe(5);
    expect(service.shippingPricingModel).toBe('THIRD_PARTY_API');
  });

  it('should return snapshot object with all 10 decision parameters', () => {
    const snapshot = service.getSnapshot();
    expect(snapshot).toBeDefined();
    expect(Object.keys(snapshot).length).toBe(10);
  });

  it('should provide metadata array with 10 pending decisions mapped', () => {
    const meta = service.getMetadata();
    expect(meta.length).toBe(10);
    expect(meta.every((m) => m.businessApprovalStatus === 'PENDING_PO_APPROVAL')).toBe(true);
  });
});
