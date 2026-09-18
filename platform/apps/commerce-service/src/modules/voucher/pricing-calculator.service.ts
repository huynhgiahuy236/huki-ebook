/**
 * Pricing Calculator Service
 * Single source of truth for all pricing calculations in checkout
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VoucherClientService, VoucherType, VoucherScope } from './voucher-client.service';
import { ShippingClientService, ShippingFeeQuote } from '../shipping/shipping-client.service';
import { throwBadRequest, throwConflict } from '@huki/shared/errors';
import { ErrorCode } from '@huki/shared/errors';

export interface PricingItem {
  cartItemId: string;
  bookId: string;
  storeId: string;
  ownerUserId: string;
  title: string;
  format: 'PHYSICAL' | 'DIGITAL';
  quantity: number;
  unitPrice: number;
  subtotal: number;
  weight: number; // grams, only for physical
}

export interface PricingStoreGroup {
  storeId: string;
  ownerUserId: string;
  requiresShipping: boolean;
  items: PricingItem[];
  itemSubtotal: number;
  shippingFee: number;
  shippingDiscount: number;
  storeVoucherDiscount: number;
  storeVoucherCode?: string;
  storeVoucherType?: VoucherType;
  grandTotal: number;
}

export interface VoucherSelection {
  platformVoucherCode?: string;
  storeVoucherCodes?: Record<string, string>; // storeId -> code
  shippingVoucherCode?: string;
}

export interface PricingResult {
  // Items
  items: PricingItem[];
  groups: PricingStoreGroup[];

  // Totals
  itemSubtotal: number;
  storeDiscountTotal: number;
  platformDiscountTotal: number;
  shippingDiscountTotal: number;
  discountTotal: number;
  shippingTotal: number;
  grandTotal: number;

  // Voucher details
  vouchers: {
    platform?: {
      code: string;
      type: VoucherType;
      value: number;
      discount: number;
    };
    stores: Array<{
      storeId: string;
      code: string;
      type: VoucherType;
      value: number;
      discount: number;
    }>;
    shipping?: {
      code: string;
      type: VoucherType;
      value: number;
      discount: number;
    };
  };

  // Address
  requiresShipping: boolean;
  shippingAddress?: {
    province: string;
    district: string;
    ward: string;
    address: string;
  };
}

@Injectable()
export class PricingCalculatorService {
  private readonly logger = new Logger(PricingCalculatorService.name);
  private readonly baseShippingFee: number;

  constructor(
    private readonly config: ConfigService,
    private readonly voucherClient: VoucherClientService,
    private readonly shippingClient: ShippingClientService,
  ) {
    this.baseShippingFee = Number(
      this.config.get('checkout.shippingBaseFee') ??
        process.env.CHECKOUT_SHIPPING_BASE_FEE ??
        30000,
    );
  }

  /**
   * Calculate full pricing with vouchers and shipping
   */
  async calculate(
    userId: string,
    items: PricingItem[],
    voucherSelection: VoucherSelection,
    shippingAddress?: {
      province: string;
      district: string;
      ward: string;
      address?: string;
    },
  ): Promise<PricingResult> {
    // Step 1: Group items by store
    const groups = this.groupByStore(items);

    // Step 2: Calculate base subtotals per store
    for (const group of groups) {
      group.itemSubtotal = group.items.reduce((sum, item) => sum + item.subtotal, 0);
      group.requiresShipping = group.items.some((item) => item.format === 'PHYSICAL');
    }

    // Step 3: Calculate shipping fees
    const shippingQuotes = await this.calculateShipping(groups, shippingAddress);
    for (const group of groups) {
      const quote = shippingQuotes.get(group.storeId);
      group.shippingFee = quote?.shippingFee ?? (group.requiresShipping ? this.baseShippingFee : 0);
    }

    // Step 4: Validate and apply store vouchers
    await this.applyStoreVouchers(userId, groups, voucherSelection.storeVoucherCodes);

    // Step 5: Calculate platform voucher discount
    const platformDiscount = await this.applyPlatformVoucher(
      userId,
      groups,
      voucherSelection.platformVoucherCode,
    );

    // Step 6: Apply shipping/freeship voucher
    const shippingDiscount = await this.applyShippingVoucher(
      userId,
      groups,
      voucherSelection.shippingVoucherCode,
    );

    // Step 7: Calculate grand totals per group
    for (const group of groups) {
      const afterStoreDiscount = group.itemSubtotal - group.storeVoucherDiscount;
      const afterPlatformDiscount = Math.max(0, afterStoreDiscount - this.allocatePlatformDiscount(group, platformDiscount));
      const afterShippingDiscount = Math.max(0, group.shippingFee - group.shippingDiscount);
      group.grandTotal = afterPlatformDiscount + afterShippingDiscount;
    }

    // Step 8: Calculate totals
    return this.buildPricingResult(groups, platformDiscount, shippingDiscount);
  }

  /**
   * Group items by store
   */
  private groupByStore(items: PricingItem[]): PricingStoreGroup[] {
    const groupMap = new Map<string, PricingStoreGroup>();

    for (const item of items) {
      let group = groupMap.get(item.storeId);
      if (!group) {
        group = {
          storeId: item.storeId,
          ownerUserId: item.ownerUserId,
          requiresShipping: false,
          items: [],
          itemSubtotal: 0,
          shippingFee: 0,
          shippingDiscount: 0,
          storeVoucherDiscount: 0,
          grandTotal: 0,
        };
        groupMap.set(item.storeId, group);
      }
      group.items.push(item);
    }

    return [...groupMap.values()];
  }

  /**
   * Calculate shipping fees for each store
   */
  private async calculateShipping(
    groups: PricingStoreGroup[],
    address?: { province: string; district: string },
  ): Promise<Map<string, ShippingFeeQuote>> {
    const quotes = new Map<string, ShippingFeeQuote>();

    if (!address) {
      return quotes;
    }

    // Calculate for each store with physical items
    const physicalGroups = groups.filter((g) => g.requiresShipping);

    for (const group of physicalGroups) {
      const totalWeight = group.items.reduce((sum, item) => sum + item.weight, 0);

      try {
        const quote = await this.shippingClient.calculateShippingFee({
          province: address.province,
          district: address.district,
          weight: Math.max(500, totalWeight), // Minimum 500g
        });
        quotes.set(group.storeId, quote);
      } catch (error) {
        // Fallback to base fee if shipping service unavailable
        this.logger.warn(`Shipping calculation failed for store ${group.storeId}, using fallback`);
        quotes.set(group.storeId, {
          carrier: 'FALLBACK',
          service: 'STANDARD',
          shippingFee: this.baseShippingFee,
          codFee: 0,
          totalFee: this.baseShippingFee,
          estimatedDays: { min: 3, max: 7 },
        });
      }
    }

    return quotes;
  }

  /**
   * Validate and apply store vouchers
   */
  private async applyStoreVouchers(
    userId: string,
    groups: PricingStoreGroup[],
    storeVoucherCodes?: Record<string, string>,
  ): Promise<void> {
    if (!storeVoucherCodes) return;

    for (const group of groups) {
      const voucherCode = storeVoucherCodes[group.storeId];
      if (!voucherCode) continue;

      try {
        const result = await this.voucherClient.validate(userId, {
          code: voucherCode,
          orderSubtotal: group.itemSubtotal,
          storeId: group.storeId,
        });

        if (result.valid && result.voucher) {
          // Check scope
          if (result.voucher.scope !== VoucherScope.STORE) {
            throwConflict(ErrorCode.VOUCHER_SCOPE_CONFLICT, 'Voucher không phải loại voucher cửa hàng');
          }

          // Check store match
          if (result.voucher.storeId && result.voucher.storeId !== group.storeId) {
            throwConflict(ErrorCode.VOUCHER_NOT_APPLICABLE, 'Voucher không áp dụng cho cửa hàng này');
          }

          group.storeVoucherDiscount = result.discount ?? 0;
          group.storeVoucherCode = voucherCode;
          group.storeVoucherType = result.voucher.type;
        } else {
          throwBadRequest(ErrorCode.VOUCHER_NOT_APPLICABLE, result.reason || 'Voucher không hợp lệ');
        }
      } catch (error: any) {
        if (error.status === 400 || error.status === 404) {
          throwBadRequest(ErrorCode.VOUCHER_NOT_APPLICABLE, error.message || 'Voucher không hợp lệ');
        }
        throw error;
      }
    }
  }

  /**
   * Validate and apply platform voucher
   */
  private async applyPlatformVoucher(
    userId: string,
    groups: PricingStoreGroup[],
    platformVoucherCode?: string,
  ): Promise<number> {
    if (!platformVoucherCode) return 0;

    // Calculate total after store discounts
    const totalAfterStoreDiscount = groups.reduce(
      (sum, g) => sum + (g.itemSubtotal - g.storeVoucherDiscount),
      0,
    );

    try {
      const result = await this.voucherClient.validate(userId, {
        code: platformVoucherCode,
        orderSubtotal: totalAfterStoreDiscount,
      });

      if (result.valid && result.voucher) {
        // Check scope
        if (result.voucher.scope !== VoucherScope.PLATFORM) {
          throwConflict(ErrorCode.VOUCHER_SCOPE_CONFLICT, 'Voucher không phải loại voucher nền tảng');
        }

        return result.discount ?? 0;
      } else {
        throwBadRequest(ErrorCode.VOUCHER_NOT_APPLICABLE, result.reason || 'Voucher không hợp lệ');
      }
    } catch (error: any) {
      if (error.status === 400 || error.status === 404) {
        throwBadRequest(ErrorCode.VOUCHER_NOT_APPLICABLE, error.message || 'Voucher không hợp lệ');
      }
      throw error;
    }
    return 0;
  }

  /**
   * Validate and apply shipping/freeship voucher
   */
  private async applyShippingVoucher(
    userId: string,
    groups: PricingStoreGroup[],
    shippingVoucherCode?: string,
  ): Promise<number> {
    if (!shippingVoucherCode) return 0;

    // Calculate total shipping
    const totalShipping = groups.reduce((sum, g) => sum + g.shippingFee, 0);
    if (totalShipping === 0) return 0; // No shipping to discount

    try {
      const result = await this.voucherClient.validate(userId, {
        code: shippingVoucherCode,
        orderSubtotal: totalShipping,
      });

      if (result.valid && result.voucher) {
        // Check type
        if (result.voucher.type !== VoucherType.FREE_SHIPPING) {
          throwConflict(ErrorCode.VOUCHER_SCOPE_CONFLICT, 'Voucher không phải loại miễn phí vận chuyển');
        }

        // Distribute shipping discount proportionally
        const discount = result.discount ?? Math.min(totalShipping, result.voucher.value);
        const shippingDiscount = discount;

        // Distribute proportionally across groups with shipping
        for (const group of groups) {
          if (group.requiresShipping && group.shippingFee > 0) {
            group.shippingDiscount = Math.round(shippingDiscount * (group.shippingFee / totalShipping));
          }
        }

        return shippingDiscount;
      } else {
        throwBadRequest(ErrorCode.VOUCHER_NOT_APPLICABLE, result.reason || 'Voucher không hợp lệ');
      }
    } catch (error: any) {
      if (error.status === 400 || error.status === 404) {
        throwBadRequest(ErrorCode.VOUCHER_NOT_APPLICABLE, error.message || 'Voucher không hợp lệ');
      }
      throw error;
    }
    return 0;
  }

  /**
   * Allocate platform discount proportionally to each store
   */
  private allocatePlatformDiscount(group: PricingStoreGroup, totalPlatformDiscount: number): number {
    if (totalPlatformDiscount <= 0) return 0;

    // Calculate total eligible for platform discount
    const totalEligible = group.itemSubtotal - group.storeVoucherDiscount;
    if (totalEligible <= 0) return 0;

    return totalPlatformDiscount; // Full platform discount applies to this store's eligible amount
  }

  /**
   * Build final pricing result
   */
  private buildPricingResult(
    groups: PricingStoreGroup[],
    platformDiscount: number,
    shippingDiscount: number,
  ): PricingResult {
    const items = groups.flatMap((g) => g.items);

    const itemSubtotal = groups.reduce((sum, g) => sum + g.itemSubtotal, 0);
    const storeDiscountTotal = groups.reduce((sum, g) => sum + g.storeVoucherDiscount, 0);
    const shippingTotal = groups.reduce((sum, g) => sum + g.shippingFee, 0);
    const grandTotal = groups.reduce((sum, g) => sum + g.grandTotal, 0);

    const vouchers: PricingResult['vouchers'] = {
      stores: [],
    };

    // Build voucher details
    for (const group of groups) {
      if (group.storeVoucherCode) {
        vouchers.stores.push({
          storeId: group.storeId,
          code: group.storeVoucherCode,
          type: group.storeVoucherType!,
          value: 0, // Will be filled from validation
          discount: group.storeVoucherDiscount,
        });
      }
    }

    const result: PricingResult = {
      items,
      groups,
      itemSubtotal,
      storeDiscountTotal,
      platformDiscountTotal: platformDiscount,
      shippingDiscountTotal: shippingDiscount,
      discountTotal: storeDiscountTotal + platformDiscount + shippingDiscount,
      shippingTotal,
      grandTotal,
      vouchers,
      requiresShipping: groups.some((g) => g.requiresShipping),
    };

    return result;
  }

  /**
   * Validate vouchers without calculating (for preview)
   */
  async validateVouchers(
    userId: string,
    voucherSelection: VoucherSelection,
    groups: PricingStoreGroup[],
  ): Promise<{
    valid: boolean;
    errors: Record<string, string>;
  }> {
    const errors: Record<string, string> = {};

    // Validate store vouchers
    if (voucherSelection.storeVoucherCodes) {
      for (const [storeId, code] of Object.entries(voucherSelection.storeVoucherCodes)) {
        const group = groups.find((g) => g.storeId === storeId);
        if (!group) continue;

        try {
          const result = await this.voucherClient.validate(userId, {
            code,
            orderSubtotal: group.itemSubtotal,
            storeId,
          });
          if (!result.valid) {
            errors[`store:${storeId}`] = result.reason || 'Voucher không hợp lệ';
          }
        } catch (error: any) {
          errors[`store:${storeId}`] = error.message || 'Lỗi xác thực voucher';
        }
      }
    }

    // Validate platform voucher
    if (voucherSelection.platformVoucherCode) {
      const totalAfterStoreDiscount = groups.reduce(
        (sum, g) => sum + (g.itemSubtotal - g.storeVoucherDiscount),
        0,
      );

      try {
        const result = await this.voucherClient.validate(userId, {
          code: voucherSelection.platformVoucherCode,
          orderSubtotal: totalAfterStoreDiscount,
        });
        if (!result.valid) {
          errors['platform'] = result.reason || 'Voucher không hợp lệ';
        }
      } catch (error: any) {
        errors['platform'] = error.message || 'Lỗi xác thực voucher';
      }
    }

    // Validate shipping voucher
    if (voucherSelection.shippingVoucherCode) {
      const totalShipping = groups.reduce((sum, g) => sum + g.shippingFee, 0);

      try {
        const result = await this.voucherClient.validate(userId, {
          code: voucherSelection.shippingVoucherCode,
          orderSubtotal: totalShipping,
        });
        if (!result.valid) {
          errors['shipping'] = result.reason || 'Voucher không hợp lệ';
        }
      } catch (error: any) {
        errors['shipping'] = error.message || 'Lỗi xác thực voucher';
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }
}
