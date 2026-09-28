/**
 * Core Governance Audit Types & Interfaces
 */

import { AuditActionType } from './audit-action';

export interface AuditActorContext {
  actorId: string;
  actorRole?: string;
  actorEmail?: string;
  storeId?: string;
  requestId?: string;
  ipAddress?: string;
  ip?: string;
  userAgent?: string;
}

export interface CreateAuditRecordInput {
  actorId: string;
  actorRole?: string;
  service: string;
  module: string;
  action: AuditActionType | string;
  resource: string;
  resourceId?: string;
  beforeState?: Record<string, any> | null;
  afterState?: Record<string, any> | null;
  changedFields?: string[] | null;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  storeId?: string;
  metadata?: Record<string, any> | null;
}

export interface AuditRecordDto extends CreateAuditRecordInput {
  id: string;
  createdAt: Date;
}
