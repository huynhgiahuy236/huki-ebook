import { Injectable } from '@nestjs/common';
import {
  IPolicyConfig,
  CommissionCalculationBasis,
  VatInvoiceMode,
  ShippingPricingModel,
} from './policy-config.interface';
import { DEFAULT_POLICY_CONFIG, POLICY_DECISION_METADATA } from './policy-config.defaults';

/**
 * HUKI EBOOK - Policy Configuration Helper & Service
 * 
 * Provides unified access to decision-dependent parameters,
 * loading from environment variables with safe fallback to engineering defaults.
 */

@Injectable()
export class PolicyConfigService implements IPolicyConfig {
  get orderPaymentTtlSeconds(): number {
    const val = process.env.ORDER_PAYMENT_TTL_SECONDS;
    if (val !== undefined && val !== '') {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return DEFAULT_POLICY_CONFIG.orderPaymentTtlSeconds;
  }

  get platformCommissionPercent(): number {
    const val = process.env.PLATFORM_COMMISSION_PERCENT;
    if (val !== undefined && val !== '') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) return parsed;
    }
    return DEFAULT_POLICY_CONFIG.platformCommissionPercent;
  }

  get commissionCalculationBasis(): CommissionCalculationBasis {
    const val = process.env.COMMISSION_CALCULATION_BASIS?.toUpperCase();
    if (val === 'SUBTOTAL' || val === 'NET_PAID') {
      return val;
    }
    return DEFAULT_POLICY_CONFIG.commissionCalculationBasis;
  }

  get vatInvoiceMode(): VatInvoiceMode {
    const val = process.env.VAT_INVOICE_MODE?.toUpperCase();
    if (val === 'MANUAL' || val === 'E_INVOICE_API') {
      return val;
    }
    return DEFAULT_POLICY_CONFIG.vatInvoiceMode;
  }

  get platformVoucherSubsidyRate(): number {
    const val = process.env.PLATFORM_VOUCHER_SUBSIDY_RATE;
    if (val !== undefined && val !== '') {
      const parsed = parseFloat(val);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
    }
    return DEFAULT_POLICY_CONFIG.platformVoucherSubsidyRate;
  }

  get featureCoinEnabled(): boolean {
    const val = process.env.FEATURE_COIN_ENABLED?.toLowerCase();
    if (val === 'true' || val === '1') return true;
    if (val === 'false' || val === '0') return false;
    return DEFAULT_POLICY_CONFIG.featureCoinEnabled;
  }

  get merchantDispatchDeadlineHours(): number {
    const val = process.env.MERCHANT_DISPATCH_DEADLINE_HOURS;
    if (val !== undefined && val !== '') {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return DEFAULT_POLICY_CONFIG.merchantDispatchDeadlineHours;
  }

  get autoCancelOnDispatchTimeout(): boolean {
    const val = process.env.AUTO_CANCEL_ON_DISPATCH_TIMEOUT?.toLowerCase();
    if (val === 'true' || val === '1') return true;
    if (val === 'false' || val === '0') return false;
    return DEFAULT_POLICY_CONFIG.autoCancelOnDispatchTimeout;
  }

  get drmMaxActiveDevices(): number {
    const val = process.env.DRM_MAX_ACTIVE_DEVICES;
    if (val !== undefined && val !== '') {
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return DEFAULT_POLICY_CONFIG.drmMaxActiveDevices;
  }

  get shippingPricingModel(): ShippingPricingModel {
    const val = process.env.SHIPPING_PRICING_MODEL?.toUpperCase();
    if (val === 'FLAT_RATE' || val === 'THIRD_PARTY_API') {
      return val;
    }
    return DEFAULT_POLICY_CONFIG.shippingPricingModel;
  }

  /**
   * Returns metadata for all pending decisions and their current configuration status.
   */
  getMetadata() {
    return POLICY_DECISION_METADATA;
  }

  /**
   * Returns a snapshot of all active policy configurations.
   */
  getSnapshot(): IPolicyConfig {
    return {
      orderPaymentTtlSeconds: this.orderPaymentTtlSeconds,
      platformCommissionPercent: this.platformCommissionPercent,
      commissionCalculationBasis: this.commissionCalculationBasis,
      vatInvoiceMode: this.vatInvoiceMode,
      platformVoucherSubsidyRate: this.platformVoucherSubsidyRate,
      featureCoinEnabled: this.featureCoinEnabled,
      merchantDispatchDeadlineHours: this.merchantDispatchDeadlineHours,
      autoCancelOnDispatchTimeout: this.autoCancelOnDispatchTimeout,
      drmMaxActiveDevices: this.drmMaxActiveDevices,
      shippingPricingModel: this.shippingPricingModel,
    };
  }
}

/**
 * Singleton instance for non-DI utility contexts
 */
export const policyConfig = new PolicyConfigService();
