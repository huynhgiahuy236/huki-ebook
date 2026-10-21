import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuditSanitizer, AuditDiffHelper } from '@huki/shared';

export interface AffiliateAuditParams {
  actorId: string;
  actorRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  beforeState?: any;
  afterState?: any;
  reason?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class AffiliateAuditService {
  private readonly logger = new Logger(AffiliateAuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly generalAuditService: AuditService,
  ) {}

  /**
   * Log affiliate domain action to both dedicated affiliate_audit_logs and global audit_logs
   */
  async log(params: AffiliateAuditParams, tx?: any): Promise<void> {
    const client = tx || this.prisma;

    try {
      let changedFields: string[] | undefined;
      if (params.beforeState && params.afterState) {
        changedFields = AuditDiffHelper.getChangedFields(params.beforeState, params.afterState);
      }

      const sanitizedBefore = params.beforeState ? AuditSanitizer.sanitize(params.beforeState) : undefined;
      const sanitizedAfter = params.afterState ? AuditSanitizer.sanitize(params.afterState) : undefined;
      const sanitizedMeta = params.metadata ? AuditSanitizer.sanitize(params.metadata) : undefined;

      // 1. Write to specialized AffiliateAuditLog
      await client.affiliateAuditLog.create({
        data: {
          actorId: params.actorId,
          actorRole: params.actorRole,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          beforeState: sanitizedBefore,
          afterState: sanitizedAfter,
          changedFields: changedFields ? JSON.stringify(changedFields) : undefined,
          reason: params.reason,
          requestId: params.requestId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: sanitizedMeta,
        },
      });

      // 2. Also forward to general commerce AuditLog for unified observability
      await this.generalAuditService.log(
        {
          actorId: params.actorId,
          actorRole: params.actorRole,
          module: 'affiliate',
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          beforeState: sanitizedBefore,
          afterState: sanitizedAfter,
          changedFields,
          requestId: params.requestId,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          metadata: {
            ...sanitizedMeta,
            reason: params.reason,
          },
        },
        tx,
      );
    } catch (err: any) {
      this.logger.error(`Failed to record affiliate audit log: ${err.message}`, err.stack);
    }
  }
}
