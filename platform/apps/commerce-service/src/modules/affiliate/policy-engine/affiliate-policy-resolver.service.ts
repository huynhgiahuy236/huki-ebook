import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export type BookFormatType = 'PHYSICAL' | 'DIGITAL' | 'EBOOK' | 'AUDIO';

export interface ResolveCommissionParams {
  bookId: string;
  storeId: string;
  format: BookFormatType | string;
  itemPrice: number | string | Decimal;
  quantity: number;
  sellerDiscountAllocated?: number | string | Decimal;
}

export interface ResolvedCommissionResult {
  isEligible: boolean;
  ratePercent: number;
  commissionBase: number;
  commissionAmount: number;
  sourceTier: 'BOOK' | 'STORE' | 'PLATFORM' | 'NONE';
  holdingDurationHours: number;
  holdingRule: 'PHYSICAL_DAYS_AFTER_DELIVERY' | 'DIGITAL_HOURS_AFTER_PAYMENT';
  policySnapshot: {
    resolvedAt: string;
    sourceTier: 'BOOK' | 'STORE' | 'PLATFORM' | 'NONE';
    bookId: string;
    storeId: string;
    format: string;
    itemPrice: number;
    quantity: number;
    sellerDiscountAllocated: number;
    commissionBase: number;
    ratePercent: number;
    commissionAmount: number;
    holdingDurationHours: number;
    policyVersion?: number;
  };
}

@Injectable()
export class AffiliatePolicyResolverService {
  private readonly logger = new Logger(AffiliatePolicyResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves commission rate and holding policy using 3-tier hierarchy:
   * Tier 1 (Highest): BookAffiliateSetting
   * Tier 2: StoreAffiliateSetting
   * Tier 3: AffiliatePolicy (Platform default)
   */
  async resolveCommission(params: ResolveCommissionParams, tx?: any): Promise<ResolvedCommissionResult> {
    const client = tx || this.prisma;
    const nowIso = new Date().toISOString();

    const unitPrice = new Decimal(params.itemPrice.toString());
    const qty = new Decimal(params.quantity);
    const grossItemAmount = unitPrice.mul(qty);
    const discount = new Decimal((params.sellerDiscountAllocated || 0).toString());

    // commissionBase = grossItemAmount - sellerDiscountAllocated (floored at 0)
    const commissionBaseDec = Decimal.max(0, grossItemAmount.sub(discount));
    const commissionBase = commissionBaseDec.toNumber();

    const normalizedFormat = (params.format || 'PHYSICAL').toUpperCase();

    // 1. Tier 1: Check BookAffiliateSetting override
    const bookSetting = await client.bookAffiliateSetting.findUnique({
      where: { bookId: params.bookId },
    });

    if (bookSetting) {
      if (!bookSetting.isEligible) {
        return this.buildResult({
          isEligible: false,
          ratePercent: 0,
          commissionBase,
          commissionAmount: 0,
          sourceTier: 'BOOK',
          holdingDurationHours: 0,
          format: normalizedFormat,
          params,
          nowIso,
        });
      }

      if (bookSetting.customRate !== null && bookSetting.customRate !== undefined) {
        const rate = new Decimal(bookSetting.customRate.toString()).toNumber();
        return this.computeFinalAmount({
          ratePercent: rate,
          commissionBaseDec,
          sourceTier: 'BOOK',
          format: normalizedFormat,
          params,
          nowIso,
          client,
        });
      }
    }

    // 2. Tier 2: Check StoreAffiliateSetting
    const storeSetting = await client.storeAffiliateSetting.findUnique({
      where: { storeId: params.storeId },
    });

    if (storeSetting) {
      if (!storeSetting.isEnabled) {
        return this.buildResult({
          isEligible: false,
          ratePercent: 0,
          commissionBase,
          commissionAmount: 0,
          sourceTier: 'STORE',
          holdingDurationHours: 0,
          format: normalizedFormat,
          params,
          nowIso,
        });
      }

      let storeRateDec: Decimal | null = null;
      if (normalizedFormat === 'PHYSICAL' && storeSetting.physicalRate !== null) {
        storeRateDec = new Decimal(storeSetting.physicalRate.toString());
      } else if ((normalizedFormat === 'DIGITAL' || normalizedFormat === 'EBOOK') && storeSetting.ebookRate !== null) {
        storeRateDec = new Decimal(storeSetting.ebookRate.toString());
      } else if (normalizedFormat === 'AUDIO' && storeSetting.audioRate !== null) {
        storeRateDec = new Decimal(storeSetting.audioRate.toString());
      }

      if (storeRateDec !== null && storeRateDec !== undefined) {
        return this.computeFinalAmount({
          ratePercent: storeRateDec.toNumber(),
          commissionBaseDec,
          sourceTier: 'STORE',
          format: normalizedFormat,
          params,
          nowIso,
          client,
        });
      }
    }

    // 3. Tier 3: Fallback to Platform Active AffiliatePolicy
    const activePolicy = await client.affiliatePolicy.findFirst({
      where: {
        isActive: true,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date() } },
        ],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    let platformRate = 5.0; // Default 5% for physical
    let holdingHours = 7 * 24; // 7 days default
    let holdingRule: 'PHYSICAL_DAYS_AFTER_DELIVERY' | 'DIGITAL_HOURS_AFTER_PAYMENT' = 'PHYSICAL_DAYS_AFTER_DELIVERY';

    if (activePolicy) {
      if (normalizedFormat === 'PHYSICAL') {
        platformRate = new Decimal(activePolicy.defaultPhysicalRate.toString()).toNumber();
        holdingHours = activePolicy.physicalHoldingDays * 24;
        holdingRule = 'PHYSICAL_DAYS_AFTER_DELIVERY';
      } else if (normalizedFormat === 'AUDIO') {
        platformRate = new Decimal(activePolicy.defaultAudioRate.toString()).toNumber();
        holdingHours = activePolicy.digitalHoldingHours;
        holdingRule = 'DIGITAL_HOURS_AFTER_PAYMENT';
      } else {
        // EBOOK or DIGITAL
        platformRate = new Decimal(activePolicy.defaultEbookRate.toString()).toNumber();
        holdingHours = activePolicy.digitalHoldingHours;
        holdingRule = 'DIGITAL_HOURS_AFTER_PAYMENT';
      }
    } else {
      if (normalizedFormat === 'AUDIO' || normalizedFormat === 'EBOOK' || normalizedFormat === 'DIGITAL') {
        platformRate = 10.0;
        holdingHours = 24;
        holdingRule = 'DIGITAL_HOURS_AFTER_PAYMENT';
      }
    }

    const commissionAmountDec = commissionBaseDec.mul(new Decimal(platformRate)).div(100);
    const flooredAmount = Math.floor(commissionAmountDec.toNumber());
    const finalAmount = Math.max(0, Math.min(flooredAmount, commissionBaseDec.toNumber()));

    return {
      isEligible: finalAmount > 0,
      ratePercent: platformRate,
      commissionBase: commissionBaseDec.toNumber(),
      commissionAmount: finalAmount,
      sourceTier: 'PLATFORM',
      holdingDurationHours: holdingHours,
      holdingRule,
      policySnapshot: {
        resolvedAt: nowIso,
        sourceTier: 'PLATFORM',
        bookId: params.bookId,
        storeId: params.storeId,
        format: normalizedFormat,
        itemPrice: unitPrice.toNumber(),
        quantity: params.quantity,
        sellerDiscountAllocated: discount.toNumber(),
        commissionBase: commissionBaseDec.toNumber(),
        ratePercent: platformRate,
        commissionAmount: finalAmount,
        holdingDurationHours: holdingHours,
        policyVersion: activePolicy?.version || 1,
      },
    };
  }

  private async computeFinalAmount(opts: {
    ratePercent: number;
    commissionBaseDec: Decimal;
    sourceTier: 'BOOK' | 'STORE';
    format: string;
    params: ResolveCommissionParams;
    nowIso: string;
    client: any;
  }): Promise<ResolvedCommissionResult> {
    const rawAmountDec = opts.commissionBaseDec.mul(new Decimal(opts.ratePercent)).div(100);
    const flooredAmount = Math.floor(rawAmountDec.toNumber());
    const finalAmount = Math.max(0, Math.min(flooredAmount, opts.commissionBaseDec.toNumber()));

    // Get holding duration from active policy
    const activePolicy = await opts.client.affiliatePolicy.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });

    const isPhysical = opts.format === 'PHYSICAL';
    const holdingHours = isPhysical
      ? (activePolicy?.physicalHoldingDays ?? 7) * 24
      : (activePolicy?.digitalHoldingHours ?? 24);

    return {
      isEligible: finalAmount > 0,
      ratePercent: opts.ratePercent,
      commissionBase: opts.commissionBaseDec.toNumber(),
      commissionAmount: finalAmount,
      sourceTier: opts.sourceTier,
      holdingDurationHours: holdingHours,
      holdingRule: isPhysical ? 'PHYSICAL_DAYS_AFTER_DELIVERY' : 'DIGITAL_HOURS_AFTER_PAYMENT',
      policySnapshot: {
        resolvedAt: opts.nowIso,
        sourceTier: opts.sourceTier,
        bookId: opts.params.bookId,
        storeId: opts.params.storeId,
        format: opts.format,
        itemPrice: new Decimal(opts.params.itemPrice.toString()).toNumber(),
        quantity: opts.params.quantity,
        sellerDiscountAllocated: new Decimal((opts.params.sellerDiscountAllocated || 0).toString()).toNumber(),
        commissionBase: opts.commissionBaseDec.toNumber(),
        ratePercent: opts.ratePercent,
        commissionAmount: finalAmount,
        holdingDurationHours: holdingHours,
        policyVersion: activePolicy?.version,
      },
    };
  }

  private buildResult(opts: {
    isEligible: boolean;
    ratePercent: number;
    commissionBase: number;
    commissionAmount: number;
    sourceTier: 'BOOK' | 'STORE' | 'PLATFORM' | 'NONE';
    holdingDurationHours: number;
    format: string;
    params: ResolveCommissionParams;
    nowIso: string;
  }): ResolvedCommissionResult {
    return {
      isEligible: opts.isEligible,
      ratePercent: opts.ratePercent,
      commissionBase: opts.commissionBase,
      commissionAmount: opts.commissionAmount,
      sourceTier: opts.sourceTier,
      holdingDurationHours: opts.holdingDurationHours,
      holdingRule: opts.format === 'PHYSICAL' ? 'PHYSICAL_DAYS_AFTER_DELIVERY' : 'DIGITAL_HOURS_AFTER_PAYMENT',
      policySnapshot: {
        resolvedAt: opts.nowIso,
        sourceTier: opts.sourceTier,
        bookId: opts.params.bookId,
        storeId: opts.params.storeId,
        format: opts.format,
        itemPrice: Number(opts.params.itemPrice),
        quantity: opts.params.quantity,
        sellerDiscountAllocated: Number(opts.params.sellerDiscountAllocated || 0),
        commissionBase: opts.commissionBase,
        ratePercent: opts.ratePercent,
        commissionAmount: opts.commissionAmount,
        holdingDurationHours: opts.holdingDurationHours,
      },
    };
  }
}
