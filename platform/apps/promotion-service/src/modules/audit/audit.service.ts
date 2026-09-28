import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditSanitizer, AuditDiffHelper, AuditAction, AuditActorContext } from '@huki/shared';

export interface AuditRecordParams {
  actor?: Partial<AuditActorContext> | {
    actorId?: string;
    actorRole?: string;
    requestId?: string;
    ipAddress?: string;
    ip?: string;
    userAgent?: string;
    storeId?: string;
  };
  actorId?: string;
  actorRole?: string;
  service?: string;
  module: string;
  action: AuditAction | string;
  resource: string;
  resourceId?: string;
  beforeState?: any;
  afterState?: any;
  changedFields?: string[];
  requestId?: string;
  ipAddress?: string;
  ip?: string;
  userAgent?: string;
  storeId?: string;
  metadata?: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(params: AuditRecordParams, tx?: any): Promise<void> {
    return this.log(params, tx);
  }

  async log(params: AuditRecordParams, tx?: any): Promise<void> {
    const client = tx || this.prisma;
    try {
      const actorId = params.actorId || params.actor?.actorId || 'SYSTEM';
      const actorRole = params.actorRole || params.actor?.actorRole;
      const requestId = params.requestId || params.actor?.requestId;
      const ipAddress = params.ipAddress || params.ip || (params.actor as any)?.ipAddress || (params.actor as any)?.ip;
      const userAgent = params.userAgent || params.actor?.userAgent;
      const storeId = params.storeId || params.actor?.storeId;

      let changedFields = params.changedFields;
      if (!changedFields && params.beforeState && params.afterState) {
        changedFields = AuditDiffHelper.getChangedFields(params.beforeState, params.afterState);
      }

      await client.auditLog.create({
        data: {
          actorId,
          actorRole,
          service: params.service || 'promotion-service',
          module: params.module,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          beforeState: params.beforeState ? AuditSanitizer.sanitize(params.beforeState) : undefined,
          afterState: params.afterState ? AuditSanitizer.sanitize(params.afterState) : undefined,
          changedFields: changedFields || undefined,
          requestId,
          ipAddress,
          userAgent,
          storeId,
          metadata: params.metadata ? AuditSanitizer.sanitize(params.metadata) : undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist audit log [${params.action} on ${params.resource}:${params.resourceId}]:`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
