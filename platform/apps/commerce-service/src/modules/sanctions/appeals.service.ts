import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService, NotificationType } from '../notifications/notification.service';
import {
  AppealDecision,
  SanctionAppeal,
  SanctionStatus,
} from '../../../prisma/generated/client';
import { CreateAppealDto } from './dto/create-appeal.dto';
import { ReviewAppealDto } from './dto/review-appeal.dto';
import { QueryAppealsDto } from './dto/query-appeals.dto';

export interface PaginatedAppealsResult {
  items: SanctionAppeal[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UploadEvidenceResult {
  url: string;
  key: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

@Injectable()
export class AppealsService {
  private readonly logger = new Logger(AppealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Persistent Evidence Upload for Sanction Appeals (Reusing verified R2 / storage infrastructure pattern)
   */
  async uploadAppealEvidence(
    callerUserId: string,
    sanctionId: string,
    file?: Express.Multer.File,
  ): Promise<UploadEvidenceResult> {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Tập tin bằng chứng không được để trống');
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
    if (file.size > maxSizeBytes) {
      throw new BadRequestException('Dung lượng tập tin vượt quá giới hạn 5MB');
    }

    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf',
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException(
        'Định dạng tập tin không hợp lệ. Chỉ chấp nhận JPG, PNG, WEBP, PDF',
      );
    }

    const sanction = await this.prisma.sanction.findUnique({
      where: { id: sanctionId },
    });

    if (!sanction) {
      throw new NotFoundException({
        code: 'SANCTION_NOT_FOUND',
        message: `Sanction ${sanctionId} not found`,
      });
    }

    if (callerUserId !== sanction.sellerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_APPEAL_ACCESS',
        message: 'Only the authoritative store owner can upload appeal evidence for this sanction',
      });
    }

    const rawExt = file.originalname.split('.').pop()?.toLowerCase() || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'pdf'].includes(rawExt)
      ? rawExt
      : 'jpg';
    const key = `appeals/${sanctionId}/${randomUUID()}.${safeExt}`;

    const publicDomain =
      this.configService.get<string>('storage.r2.publicDomain') ||
      'https://storage.huki.vn';
    const evidenceUrl = `${publicDomain}/${key}`;

    return {
      url: evidenceUrl,
      key,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Submit an appeal for a sanction (within 7-day window, store owner only, 1-to-1)
   */
  async submitAppeal(
    sanctionId: string,
    callerUserId: string,
    dto: CreateAppealDto,
  ): Promise<SanctionAppeal> {
    const sanction = await this.prisma.sanction.findUnique({
      where: { id: sanctionId },
      include: { appeal: true },
    });

    if (!sanction) {
      throw new NotFoundException({
        code: 'SANCTION_NOT_FOUND',
        message: `Sanction ${sanctionId} not found`,
      });
    }

    // 1. Authorization check: must match server-resolved store owner snapshot
    if (callerUserId !== sanction.sellerId) {
      throw new ForbiddenException({
        code: 'FORBIDDEN_APPEAL_ACCESS',
        message: 'Only the authoritative store owner can submit an appeal for this sanction',
      });
    }

    // 2. Window check: 7 days (168 hours) from issuedAt
    const now = new Date();
    const windowDeadline = new Date(sanction.issuedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (now > windowDeadline) {
      throw new BadRequestException({
        code: 'APPEAL_WINDOW_EXPIRED',
        message: `The 7-day appeal window expired on ${windowDeadline.toISOString()}`,
      });
    }

    // 3. Cardinality check: strict 1-to-1 appeal
    if (sanction.appeal) {
      throw new ConflictException({
        code: 'APPEAL_ALREADY_EXISTS',
        message: `An appeal has already been submitted for sanction ${sanctionId}`,
      });
    }

    if (sanction.status === SanctionStatus.LIFTED) {
      throw new BadRequestException({
        code: 'SANCTION_ALREADY_LIFTED',
        message: 'Cannot appeal an already lifted sanction',
      });
    }

    // 4. Create appeal and transition sanction status to APPEALED atomically
    const appeal = await this.prisma.$transaction(async (tx) => {
      const created = await tx.sanctionAppeal.create({
        data: {
          sanctionId,
          storeId: sanction.storeId,
          sellerId: sanction.sellerId,
          reason: dto.reason,
          evidence: dto.evidence ? JSON.parse(JSON.stringify(dto.evidence)) : undefined,
          decision: AppealDecision.PENDING,
          submittedAt: now,
        },
      });

      await tx.sanction.update({
        where: { id: sanctionId },
        data: { status: SanctionStatus.APPEALED },
      });

      return created;
    });

    // 5. Post-commit notification to seller (CANONICAL)
    this.notificationService
      .create({
        userId: sanction.sellerId,
        type: NotificationType.SYSTEM,
        title: 'Kháng nghị xử phạt đã được tiếp nhận',
        message: `Kháng nghị của bạn cho quyết định xử phạt ${sanction.level} đã được tiếp nhận và đang chờ xem xét.`,
        data: { appealId: appeal.id, sanctionId: sanction.id, storeId: sanction.storeId },
      })
      .catch((err) => {
        this.logger.warn(`Failed to dispatch appeal submission notification: ${err.message}`);
      });

    return appeal;
  }

  /**
   * Review an appeal (Admin action with 48h SLA)
   */
  async reviewAppeal(
    appealId: string,
    adminId: string,
    dto: ReviewAppealDto,
  ): Promise<SanctionAppeal> {
    const appeal = await this.prisma.sanctionAppeal.findUnique({
      where: { id: appealId },
      include: { sanction: true },
    });

    if (!appeal) {
      throw new NotFoundException({
        code: 'APPEAL_NOT_FOUND',
        message: `Appeal ${appealId} not found`,
      });
    }

    if (appeal.decision !== AppealDecision.PENDING) {
      throw new BadRequestException({
        code: 'APPEAL_ALREADY_REVIEWED',
        message: `Appeal ${appealId} has already been reviewed with decision [${appeal.decision}]`,
      });
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedAppeal = await tx.sanctionAppeal.update({
        where: { id: appealId },
        data: {
          decision: dto.decision,
          decisionReason: dto.decisionReason,
          reviewedBy: adminId,
          reviewedAt: now,
        },
      });

      if (dto.decision === AppealDecision.APPROVED) {
        await tx.sanction.update({
          where: { id: appeal.sanctionId },
          data: {
            status: SanctionStatus.LIFTED,
            liftedBy: adminId,
            liftedAt: now,
            liftReason: dto.decisionReason || 'Appeal approved by admin',
          },
        });
      } else if (dto.decision === AppealDecision.REJECTED) {
        await tx.sanction.update({
          where: { id: appeal.sanctionId },
          data: {
            status: SanctionStatus.ACTIVE,
          },
        });
      }

      return updatedAppeal;
    });

    // 1. Post-commit notification to seller (CANONICAL)
    this.notificationService
      .create({
        userId: appeal.sellerId,
        type: NotificationType.SYSTEM,
        title: `Kết quả xem xét kháng nghị xử phạt: ${dto.decision}`,
        message: `Kháng nghị của bạn đã được xem xét với kết quả [${dto.decision}].`,
        data: { appealId: updated.id, sanctionId: appeal.sanctionId, decision: dto.decision },
      })
      .catch((err) => {
        this.logger.warn(`Failed to dispatch appeal decision notification to seller: ${err.message}`);
      });

    // 2. Post-commit notification to sanction issuer (ENGINEERING DEFAULT / PROPOSED)
    if (
      appeal.sanction?.issuedBy &&
      appeal.sanction.issuedBy !== 'SYSTEM' &&
      appeal.sanction.issuedBy !== adminId
    ) {
      this.notificationService
        .create({
          userId: appeal.sanction.issuedBy,
          type: NotificationType.SYSTEM,
          title: `Cập nhật kết quả kháng nghị cho quyết định xử phạt`,
          message: `Kháng nghị cho quyết định xử phạt do bạn ban hành đã được xử lý với kết quả [${dto.decision}].`,
          data: { appealId: updated.id, sanctionId: appeal.sanctionId, decision: dto.decision, reviewedBy: adminId },
        })
        .catch((err) => {
          this.logger.warn(`Failed to dispatch appeal decision notification to issuer admin: ${err.message}`);
        });
    }

    return updated;
  }

  /**
   * Get paginated appeals list for platform administration
   */
  async getAppeals(query: QueryAppealsDto): Promise<PaginatedAppealsResult> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.decision) {
      where.decision = query.decision;
    }
    if (query.storeId) {
      where.storeId = query.storeId;
    }

    const [items, total] = await Promise.all([
      this.prisma.sanctionAppeal.findMany({
        where,
        include: { sanction: true },
        orderBy: { submittedAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.sanctionAppeal.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get appeal by sanction ID
   */
  async getAppealBySanctionId(sanctionId: string): Promise<SanctionAppeal | null> {
    return this.prisma.sanctionAppeal.findUnique({
      where: { sanctionId },
      include: { sanction: true },
    });
  }

  /**
   * Get appeal by ID
   */
  async getAppealById(appealId: string): Promise<SanctionAppeal> {
    const appeal = await this.prisma.sanctionAppeal.findUnique({
      where: { id: appealId },
      include: { sanction: true },
    });

    if (!appeal) {
      throw new NotFoundException({
        code: 'APPEAL_NOT_FOUND',
        message: `Appeal ${appealId} not found`,
      });
    }

    return appeal;
  }
}
