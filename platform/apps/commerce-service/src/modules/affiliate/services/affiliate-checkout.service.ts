import { Injectable, Logger, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { AffiliatePolicyResolverService } from '../policy-engine/affiliate-policy-resolver.service';
import { ConfigService } from '@nestjs/config';

export interface CheckoutCommissionItem {
  orderItemId: string;
  bookId: string;
  storeId: string;
  title: string;
  format: string;
  quantity: number;
  unitPrice: number;
  sellerDiscountAllocated?: number;
}

export interface CreatePendingCommissionsParams {
  orderId: string;
  orderCode: string;
  buyerUserId: string;
  items: CheckoutCommissionItem[];
  affiliateToken?: string;
  tx?: any;
}

@Injectable()
export class AffiliateCheckoutService {
  private readonly logger = new Logger(AffiliateCheckoutService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly policyResolver: AffiliatePolicyResolverService,
    @Optional() private readonly configService?: ConfigService,
  ) {}

  /**
   * Resolves attribution record from plain token or session nonce.
   * Performs validation: emergency kill-switch, expiration, active link, active affiliate profile, and self-referral check.
   */
  async resolveAttribution(
    tokenOrNonce?: string,
    buyerUserId?: string,
    tx?: any,
  ) {
    // 0. Emergency Kill-Switch Check (Decision AFF-DEC-024)
    const isEnabled =
      this.configService?.get<string>('AFFILIATE_PROGRAM_ENABLED') ??
      process.env.AFFILIATE_PROGRAM_ENABLED;

    if (isEnabled === 'false') {
      this.logger.warn(
        '[Kill Switch Active] Affiliate program is disabled via AFFILIATE_PROGRAM_ENABLED=false. Gracefully bypassing attribution.',
      );
      return null;
    }

    if (!tokenOrNonce || !tokenOrNonce.trim()) {
      return null;
    }

    const client = tx || this.prisma;
    const cleanToken = tokenOrNonce.trim();
    const tokenHash = crypto.createHash('sha256').update(cleanToken).digest('hex');

    const attribution = await client.affiliateAttribution.findFirst({
      where: {
        OR: [
          { cookieTokenHash: tokenHash },
          { sessionNonce: cleanToken },
        ],
      },
      include: {
        link: true,
        profile: true,
      },
    });

    if (!attribution) {
      return null;
    }

    // Check expiration
    if (attribution.expiresAt && attribution.expiresAt < new Date()) {
      this.logger.debug(`[Attribution Expired] id=${attribution.id} expiredAt=${attribution.expiresAt}`);
      return null;
    }

    // Check link status
    if (!attribution.link || !attribution.link.isActive) {
      this.logger.debug(`[Link Inactive] id=${attribution.linkId}`);
      return null;
    }

    // Check profile status
    if (!attribution.profile || attribution.profile.status !== 'ACTIVE') {
      this.logger.debug(`[Affiliate Inactive] profileId=${attribution.profileId}`);
      return null;
    }

    // Anti-fraud: Self-referral prevention (Affiliate cannot earn on own orders)
    if (buyerUserId && attribution.profile.userId === buyerUserId) {
      this.logger.warn(
        `[Self-Referral Blocked] Affiliate ${attribution.profile.id} attempted purchase with own referral link`,
      );
      return null;
    }

    return attribution;
  }

  /**
   * Creates PENDING commission snapshots for eligible checkout items.
   * Follows Phase 6 decisions:
   * 1. Commission Base: Net book price after shop discount (no deduction for platform vouchers).
   * 2. Line-item attribution: Matches book/store target scope.
   * 3. Snapshot created immediately on Order Placed (PENDING state).
   */
  async createPendingCommissions(params: CreatePendingCommissionsParams) {
    const client = params.tx || this.prisma;

    if (!params.items || !params.items.length) {
      return [];
    }

    const attribution = await this.resolveAttribution(
      params.affiliateToken,
      params.buyerUserId,
      client,
    );

    if (!attribution) {
      return [];
    }

    const link = attribution.link;
    const createdCommissions: any[] = [];

    for (const item of params.items) {
      // 1. Line-item attribution scope check
      if (link.targetType === 'BOOK' && link.targetBookId && link.targetBookId !== item.bookId) {
        continue;
      }
      if (link.targetType === 'STORE' && link.targetStoreId && link.targetStoreId !== item.storeId) {
        continue;
      }

      // 2. Resolve policy and calculate commission
      const resolved = await this.policyResolver.resolveCommission(
        {
          bookId: item.bookId,
          storeId: item.storeId,
          format: item.format,
          itemPrice: item.unitPrice,
          quantity: item.quantity,
          sellerDiscountAllocated: item.sellerDiscountAllocated || 0,
        },
        client,
      );

      if (!resolved.isEligible || resolved.commissionAmount <= 0) {
        continue;
      }

      // 3. Create PENDING commission snapshot
      const commission = await client.affiliateCommission.create({
        data: {
          profileId: attribution.profileId,
          orderId: params.orderId,
          orderItemId: item.orderItemId,
          storeId: item.storeId,
          bookId: item.bookId,
          bookTitle: item.title,
          bookFormat: item.format,
          quantity: item.quantity,
          itemPrice: item.unitPrice,
          discountAllocated: item.sellerDiscountAllocated || 0,
          commissionBase: resolved.commissionBase,
          commissionRate: resolved.ratePercent,
          commissionAmount: resolved.commissionAmount,
          currency: 'VND',
          status: 'PENDING',
          policySnapshot: resolved.policySnapshot as any,
          attributionId: attribution.id,
        },
      });

      createdCommissions.push(commission);
    }

    // 4. If any commissions were created, record conversion & fire outbox event
    if (createdCommissions.length > 0) {
      await client.affiliateAttribution.update({
        where: { id: attribution.id },
        data: {
          isConverted: true,
          convertedAt: new Date(),
          convertedOrderId: params.orderId,
          buyerUserId: params.buyerUserId,
        },
      });

      await client.affiliateLink.update({
        where: { id: link.id },
        data: {
          conversionCount: { increment: 1 },
        },
      });

      await client.outboxEvent.create({
        data: {
          eventId: crypto.randomBytes(16).toString('hex'),
          type: 'AFFILIATE_COMMISSION_CREATED',
          aggregateId: params.orderId,
          payload: {
            orderId: params.orderId,
            orderCode: params.orderCode,
            profileId: attribution.profileId,
            attributionId: attribution.id,
            commissionsCount: createdCommissions.length,
            totalCommissionAmount: createdCommissions.reduce(
              (sum, c) => sum + Number(c.commissionAmount),
              0,
            ),
          },
        },
      });

      this.logger.log(
        `[Affiliate Conversion] Order ${params.orderCode} created ${createdCommissions.length} PENDING commissions for affiliate ${attribution.profileId}`,
      );
    }

    return createdCommissions;
  }
}
