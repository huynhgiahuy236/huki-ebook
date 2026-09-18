/**
 * Staff Audit Log Service
 * Records all staff-related changes for compliance and security
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export enum AuditAction {
  STAFF_CREATED = 'STAFF_CREATED',
  STAFF_UPDATED = 'STAFF_UPDATED',
  STAFF_DEACTIVATED = 'STAFF_DEACTIVATED',
  STAFF_REACTIVATED = 'STAFF_REACTIVATED',
  PERMISSION_CHANGED = 'PERMISSION_CHANGED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  LOGIN_FAILED = 'LOGIN_FAILED',
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  targetStaffId: string;
  targetEmail: string;
  action: AuditAction;
  changes: Record<string, { before: any; after: any }>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface CreateAuditLogDto {
  actorId: string;
  actorEmail: string;
  targetStaffId: string;
  targetEmail: string;
  action: AuditAction;
  changes?: Record<string, { before: any; after: any }>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilter {
  targetStaffId?: string;
  actorId?: string;
  action?: AuditAction;
  startDate?: Date;
  endDate?: Date;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async create(dto: CreateAuditLogDto) {
    return (this.prisma as any).staffAuditLog.create({
      data: {
        actorId: dto.actorId,
        actorEmail: dto.actorEmail,
        targetStaffId: dto.targetStaffId,
        targetEmail: dto.targetEmail,
        action: dto.action,
        changes: dto.changes ? JSON.parse(JSON.stringify(dto.changes)) : undefined,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
  }

  /**
   * Get audit logs with filtering
   */
  async findAll(filter: AuditLogFilter, pagination: { limit: number; offset: number }) {
    const where: any = {};

    if (filter.targetStaffId) {
      where.targetStaffId = filter.targetStaffId;
    }
    if (filter.actorId) {
      where.actorId = filter.actorId;
    }
    if (filter.action) {
      where.action = filter.action;
    }
    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    const [items, total] = await Promise.all([
      (this.prisma as any).staffAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: pagination.limit,
        skip: pagination.offset,
      }),
      (this.prisma as any).staffAuditLog.count({ where }),
    ]);

    return {
      items,
      total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: pagination.offset + items.length < total,
    };
  }

  /**
   * Get audit logs for a specific staff member
   */
  async getStaffAuditHistory(staffId: string, limit = 50) {
    return (this.prisma as any).staffAuditLog.findMany({
      where: { targetStaffId: staffId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // ============================================
  // Convenience methods for common audit events
  // ============================================

  /**
   * Log staff creation
   */
  async logStaffCreated(
    actorId: string,
    actorEmail: string,
    staffId: string,
    staffEmail: string,
    role: string,
    permissions: string[],
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.create({
      actorId,
      actorEmail,
      targetStaffId: staffId,
      targetEmail: staffEmail,
      action: AuditAction.STAFF_CREATED,
      changes: {
        role: { before: null, after: role },
        permissions: { before: null, after: permissions },
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log permission change
   */
  async logPermissionChange(
    actorId: string,
    actorEmail: string,
    staffId: string,
    staffEmail: string,
    before: string[],
    after: string[],
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.create({
      actorId,
      actorEmail,
      targetStaffId: staffId,
      targetEmail: staffEmail,
      action: AuditAction.PERMISSION_CHANGED,
      changes: {
        permissions: { before, after },
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log role change
   */
  async logRoleChange(
    actorId: string,
    actorEmail: string,
    staffId: string,
    staffEmail: string,
    before: string,
    after: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.create({
      actorId,
      actorEmail,
      targetStaffId: staffId,
      targetEmail: staffEmail,
      action: AuditAction.ROLE_CHANGED,
      changes: {
        role: { before, after },
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log staff deactivation
   */
  async logStaffDeactivated(
    actorId: string,
    actorEmail: string,
    staffId: string,
    staffEmail: string,
    reason?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.create({
      actorId,
      actorEmail,
      targetStaffId: staffId,
      targetEmail: staffEmail,
      action: AuditAction.STAFF_DEACTIVATED,
      changes: {
        isActive: { before: true, after: false },
        reason: { before: null, after: reason },
      },
      ipAddress,
      userAgent,
    });
  }

  /**
   * Get action labels for UI
   */
  static getActionLabels(): Record<AuditAction, string> {
    return {
      [AuditAction.STAFF_CREATED]: 'Tạo nhân viên mới',
      [AuditAction.STAFF_UPDATED]: 'Cập nhật nhân viên',
      [AuditAction.STAFF_DEACTIVATED]: 'Vô hiệu hóa nhân viên',
      [AuditAction.STAFF_REACTIVATED]: 'Kích hoạt lại nhân viên',
      [AuditAction.PERMISSION_CHANGED]: 'Thay đổi quyền hạn',
      [AuditAction.ROLE_CHANGED]: 'Thay đổi vai trò',
      [AuditAction.PASSWORD_RESET]: 'Đặt lại mật khẩu',
      [AuditAction.LOGIN_FAILED]: 'Đăng nhập thất bại',
    };
  }
}
