import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateFraudCaseDto, ResolveFraudCaseDto } from '../dto/affiliate-payout.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class AffiliateFraudService {
  private readonly logger = new Logger(AffiliateFraudService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Create a Fraud Investigation Case
   * Gating: Open cases immediately block CTV payout operations
   */
  async createFraudCase(dto: CreateFraudCaseDto, createdBy: string = 'SYSTEM') {
    const profile = await this.prisma.affiliateProfile.findUnique({
      where: { id: dto.profileId },
    });

    if (!profile) {
      throw new NotFoundException(`Affiliate profile ${dto.profileId} not found`);
    }

    const fraudCase = await this.prisma.affiliateFraudCase.create({
      data: {
        profileId: dto.profileId,
        reasonCode: dto.reasonCode,
        riskScore: new Decimal(dto.riskScore),
        evidenceDetails: dto.evidenceDetails,
        status: 'OPEN',
      },
    });

    // Record Audit Log
    await this.prisma.affiliateAuditLog.create({
      data: {
        actorId: createdBy,
        actorRole: 'ADMIN',
        action: 'FRAUD_CASE_OPENED',
        resource: 'AFFILIATE_FRAUD_CASE',
        resourceId: fraudCase.id,
        reason: `Opened fraud case for reason: ${dto.reasonCode} (Risk: ${dto.riskScore})`,
        metadata: {
          profileId: dto.profileId,
          riskScore: dto.riskScore,
          reasonCode: dto.reasonCode,
        },
      },
    });

    return fraudCase;
  }

  /**
   * 2. Resolve Fraud Case (Admin Review)
   */
  async resolveFraudCase(caseId: string, reviewerId: string, dto: ResolveFraudCaseDto) {
    const fraudCase = await this.prisma.affiliateFraudCase.findUnique({
      where: { id: caseId },
      include: { profile: true },
    });

    if (!fraudCase) {
      throw new NotFoundException(`Fraud case ${caseId} not found`);
    }

    if (fraudCase.status !== 'OPEN') {
      throw new BadRequestException(`Fraud case ${caseId} is already resolved (${fraudCase.status})`);
    }

    const now = new Date();

    if (dto.resolution === 'CONFIRMED') {
      // Confirmed Fraud: Suspend partner profile
      await this.prisma.$transaction(async (tx) => {
        await tx.affiliateFraudCase.update({
          where: { id: caseId },
          data: {
            status: 'CONFIRMED',
            reviewedBy: reviewerId,
            resolutionNote: dto.note,
          },
        });

        await tx.affiliateProfile.update({
          where: { id: fraudCase.profileId },
          data: {
            status: 'SUSPENDED',
            suspendedAt: now,
            suspendedReason: `Suspended due to confirmed fraud: ${dto.note}`,
            version: { increment: 1 },
          },
        });

        await tx.affiliateAuditLog.create({
          data: {
            actorId: reviewerId,
            actorRole: 'ADMIN',
            action: 'FRAUD_CASE_CONFIRMED',
            resource: 'AFFILIATE_FRAUD_CASE',
            resourceId: caseId,
            reason: dto.note,
            metadata: {
              profileId: fraudCase.profileId,
              actionTaken: 'PARTNER_SUSPENDED',
            },
          },
        });
      });

      return {
        caseId,
        status: 'CONFIRMED',
        actionTaken: 'PARTNER_SUSPENDED',
        resolvedAt: now,
      };
    } else {
      // Dismissed: Clear case
      await this.prisma.$transaction(async (tx) => {
        await tx.affiliateFraudCase.update({
          where: { id: caseId },
          data: {
            status: 'DISMISSED',
            reviewedBy: reviewerId,
            resolutionNote: dto.note,
          },
        });

        await tx.affiliateAuditLog.create({
          data: {
            actorId: reviewerId,
            actorRole: 'ADMIN',
            action: 'FRAUD_CASE_DISMISSED',
            resource: 'AFFILIATE_FRAUD_CASE',
            resourceId: caseId,
            reason: dto.note,
            metadata: {
              profileId: fraudCase.profileId,
            },
          },
        });
      });

      return {
        caseId,
        status: 'DISMISSED',
        actionTaken: 'FLAG_CLEARED',
        resolvedAt: now,
      };
    }
  }

  /**
   * 3. List Fraud Cases (Admin Queue)
   */
  async listFraudCases(
    options: {
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) where.status = options.status;

    const [items, total] = await Promise.all([
      this.prisma.affiliateFraudCase.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: {
            select: {
              affiliateCode: true,
              displayName: true,
              contactEmail: true,
            },
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.affiliateFraudCase.count({ where }),
    ]);

    return {
      items: items.map((c) => ({
        id: c.id,
        profileId: c.profileId,
        affiliateCode: c.profile?.affiliateCode,
        displayName: c.profile?.displayName,
        contactEmail: c.profile?.contactEmail,
        reasonCode: c.reasonCode,
        riskScore: Number(c.riskScore),
        evidenceDetails: c.evidenceDetails,
        status: c.status,
        reviewedBy: c.reviewedBy,
        resolutionNote: c.resolutionNote,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 4. Check if a profile is currently gated by open fraud
   */
  async isProfileGatedForFraud(profileId: string): Promise<boolean> {
    const count = await this.prisma.affiliateFraudCase.count({
      where: {
        profileId,
        status: 'OPEN',
      },
    });
    return count > 0;
  }
}
