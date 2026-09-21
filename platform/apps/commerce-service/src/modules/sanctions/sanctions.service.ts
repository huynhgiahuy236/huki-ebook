import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService, NotificationType } from '../notifications/notification.service';
import {
  Prisma,
  Sanction,
  SanctionLevel,
  SanctionStatus,
} from '../../../prisma/generated/client';
import { CreateSanctionDto } from './dto/create-sanction.dto';
import { LiftSanctionDto } from './dto/lift-sanction.dto';

export function addUTCMonths(date: Date, months: number): Date {
  const currentYear = date.getUTCFullYear();
  const currentMonth = date.getUTCMonth();
  const currentDay = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  const targetMonth = currentMonth + months;
  const targetYear = currentYear + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;

  const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(currentDay, daysInTargetMonth);

  return new Date(Date.UTC(targetYear, normalizedMonth, targetDay, hours, minutes, seconds, ms));
}

@Injectable()
export class SanctionsService {
  private readonly logger = new Logger(SanctionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Calculate server-authoritative expiresAt date
   */
  calculateExpiresAt(
    level: SanctionLevel,
    issuedAt: Date,
    durationMonths?: number,
  ): Date | null {
    if (level === SanctionLevel.WARNING) {
      if (durationMonths !== undefined) {
        throw new BadRequestException({
          code: 'INVALID_SANCTION_DURATION',
          message: 'Duration parameter is not allowed for WARNING sanctions (fixed 7 days)',
        });
      }
      return new Date(issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    if (level === SanctionLevel.PROBATION) {
      if (durationMonths !== undefined) {
        throw new BadRequestException({
          code: 'INVALID_SANCTION_DURATION',
          message: 'Duration parameter is not allowed for PROBATION sanctions (fixed 1 calendar month)',
        });
      }
      return addUTCMonths(issuedAt, 1);
    }

    if (level === SanctionLevel.SUSPENSION) {
      if (!durationMonths || durationMonths < 1 || durationMonths > 3) {
        throw new BadRequestException({
          code: 'INVALID_SANCTION_DURATION',
          message: 'SUSPENSION requires durationMonths of 1, 2, or 3',
        });
      }
      return addUTCMonths(issuedAt, durationMonths);
    }

    if (level === SanctionLevel.BAN) {
      if (durationMonths !== undefined) {
        throw new BadRequestException({
          code: 'INVALID_SANCTION_DURATION',
          message: 'Duration parameter is not allowed for BAN sanctions (permanent)',
        });
      }
      return null;
    }

    return null;
  }

  /**
   * Create a sanction with Serializable transaction and bounded retry
   */
  async createSanction(adminId: string, dto: CreateSanctionDto): Promise<Sanction> {
    const MAX_RETRIES = 3;
    let attempt = 0;

    // Pre-validate duration
    const testNow = new Date();
    this.calculateExpiresAt(dto.level, testNow, dto.durationMonths);

    while (attempt < MAX_RETRIES) {
      attempt++;
      try {
        const sanction = await this.prisma.$transaction(
          async (tx) => {
            // 1. Resolve Store Owner from primary Wallet snapshot
            const wallet = await tx.wallet.findUnique({
              where: { storeId: dto.storeId },
              select: { ownerUserId: true },
            });

            if (!wallet) {
              throw new NotFoundException({
                code: 'STORE_OWNER_UNRESOLVABLE',
                message: `Store ${dto.storeId} has no registered wallet snapshot in commerce database`,
              });
            }

            const now = new Date();

            // 2. Authoritative Effective Active Query
            const existingActive = await tx.sanction.findFirst({
              where: {
                storeId: dto.storeId,
                status: { in: [SanctionStatus.ACTIVE, SanctionStatus.APPEALED] },
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            });

            if (existingActive) {
              throw new ConflictException({
                code: 'ACTIVE_SANCTION_EXISTS',
                message: `Store ${dto.storeId} already has an active sanction (${existingActive.id})`,
              });
            }

            const expiresAt = this.calculateExpiresAt(dto.level, now, dto.durationMonths);

            return tx.sanction.create({
              data: {
                storeId: dto.storeId,
                sellerId: wallet.ownerUserId,
                level: dto.level,
                status: SanctionStatus.ACTIVE,
                reason: dto.reason,
                violationCode: dto.violationCode,
                issuedBy: adminId,
                issuedAt: now,
                expiresAt,
                evidence: dto.evidence ? JSON.parse(JSON.stringify(dto.evidence)) : undefined,
              },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          },
        );

        // 3. Post-Commit Side Effect: Best-Effort In-app Notification
        this.dispatchNotification(
          sanction.sellerId,
          NotificationType.SYSTEM,
          `Thông báo xử phạt cửa hàng: ${sanction.level}`,
          `Cửa hàng của bạn đã nhận quyết định xử phạt mức [${sanction.level}]. Lý do: ${sanction.reason}`,
          { sanctionId: sanction.id, level: sanction.level, storeId: sanction.storeId },
        ).catch((err) => {
          this.logger.warn(`Failed to dispatch sanction notification for ${sanction.id}: ${err.message}`);
        });

        return sanction;
      } catch (err: any) {
        if (
          err instanceof ConflictException ||
          err instanceof NotFoundException ||
          err instanceof BadRequestException
        ) {
          throw err;
        }

        const isSerializationConflict =
          err.code === 'P2034' ||
          (err.message && err.message.includes('could not serialize access'));

        if (isSerializationConflict && attempt < MAX_RETRIES) {
          this.logger.warn(
            `Serialization conflict creating sanction for store ${dto.storeId} (attempt ${attempt}/${MAX_RETRIES}), retrying...`,
          );
          continue;
        }

        if (isSerializationConflict) {
          throw new InternalServerErrorException({
            code: 'CONCURRENCY_CONFLICT',
            message: 'Unable to process sanction creation due to high concurrency. Please retry.',
          });
        }

        throw err;
      }
    }

    throw new InternalServerErrorException({
      code: 'CONCURRENCY_CONFLICT',
      message: 'Sanction creation retry limit exceeded.',
    });
  }

  /**
   * Manually lift an active sanction
   */
  async liftSanction(sanctionId: string, adminId: string, dto: LiftSanctionDto): Promise<Sanction> {
    const sanction = await this.prisma.sanction.findUnique({
      where: { id: sanctionId },
    });

    if (!sanction) {
      throw new NotFoundException({
        code: 'SANCTION_NOT_FOUND',
        message: `Sanction ${sanctionId} not found`,
      });
    }

    if (sanction.status === SanctionStatus.LIFTED) {
      throw new BadRequestException({
        code: 'SANCTION_ALREADY_LIFTED',
        message: `Sanction ${sanctionId} has already been lifted`,
      });
    }

    const updated = await this.prisma.sanction.update({
      where: { id: sanctionId },
      data: {
        status: SanctionStatus.LIFTED,
        liftedBy: adminId,
        liftedAt: new Date(),
        liftReason: dto.liftReason,
      },
    });

    this.dispatchNotification(
      updated.sellerId,
      NotificationType.SYSTEM,
      `Xử phạt cửa hàng đã được gỡ bỏ`,
      `Quyết định xử phạt cho cửa hàng của bạn đã được gỡ bỏ. Lý do: ${dto.liftReason}`,
      { sanctionId: updated.id, storeId: updated.storeId },
    ).catch((err) => {
      this.logger.warn(`Failed to dispatch lift notification for ${updated.id}: ${err.message}`);
    });

    return updated;
  }

  /**
   * Find effectively active sanction for a store
   */
  async findActiveSanction(storeId: string): Promise<Sanction | null> {
    const now = new Date();
    return this.prisma.sanction.findFirst({
      where: {
        storeId,
        status: { in: [SanctionStatus.ACTIVE, SanctionStatus.APPEALED] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }

  /**
   * Assertion hook: Denies book creation/updating if store is suspended or banned
   */
  async assertCanMutateBooks(storeId: string): Promise<void> {
    const active = await this.findActiveSanction(storeId);
    if (!active) return;

    if (active.level === SanctionLevel.SUSPENSION || active.level === SanctionLevel.BAN) {
      throw new ForbiddenException({
        code: 'STORE_MUTATION_RESTRICTED',
        message: `Store ${storeId} is currently under ${active.level} sanction and cannot create or modify listings`,
        sanctionLevel: active.level,
      });
    }
  }

  /**
   * Assertion hook: Denies new orders at checkout if store is probation, suspension, or ban
   */
  async assertCanReceiveOrders(storeId: string): Promise<void> {
    const active = await this.findActiveSanction(storeId);
    if (!active) return;

    if (
      active.level === SanctionLevel.PROBATION ||
      active.level === SanctionLevel.SUSPENSION ||
      active.level === SanctionLevel.BAN
    ) {
      throw new BadRequestException({
        code: 'STORE_ORDERS_ON_HOLD',
        message: `Store ${storeId} is currently under ${active.level} sanction and cannot accept new orders`,
        sanctionLevel: active.level,
        storeId,
      });
    }
  }

  /**
   * Assertion hook: Denies payout requests if store is suspended or banned
   */
  async assertCanRequestPayout(storeId: string): Promise<void> {
    const active = await this.findActiveSanction(storeId);
    if (!active) return;

    if (active.level === SanctionLevel.SUSPENSION || active.level === SanctionLevel.BAN) {
      throw new ForbiddenException({
        code: 'STORE_PAYOUT_RESTRICTED',
        message: `Store ${storeId} is currently under ${active.level} sanction and payout requests are restricted`,
        sanctionLevel: active.level,
      });
    }
  }

  /**
   * Get all sanctions for a store (active & historical)
   */
  async getSanctionsByStore(storeId: string): Promise<Sanction[]> {
    return this.prisma.sanction.findMany({
      where: { storeId },
      include: { appeal: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get sanction by id
   */
  async getSanctionById(id: string): Promise<Sanction> {
    const sanction = await this.prisma.sanction.findUnique({
      where: { id },
      include: { appeal: true },
    });

    if (!sanction) {
      throw new NotFoundException({
        code: 'SANCTION_NOT_FOUND',
        message: `Sanction ${id} not found`,
      });
    }

    return sanction;
  }

  private async dispatchNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    await this.notificationService.create({
      userId,
      type,
      title,
      message,
      data,
    });
  }
}
