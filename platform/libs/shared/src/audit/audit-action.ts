/**
 * Standardized Governance Audit Action Taxonomy
 * Phase 1 Implementation Contract
 */

export const AuditAction = {
  // Lifecycle / Standard CRUD
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',

  // Administrative Governance & Account Management
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  SUSPEND: 'SUSPEND',
  UNSUSPEND: 'UNSUSPEND',
  BLOCK: 'BLOCK',
  UNBLOCK: 'UNBLOCK',

  // Financial, Payout & Escrow Operations
  FREEZE: 'FREEZE',
  UNFREEZE: 'UNFREEZE',
  PAYOUT_REQUEST: 'PAYOUT_REQUEST',
  PAYOUT_REVIEW: 'PAYOUT_REVIEW',
  PIN_CHANGE: 'PIN_CHANGE',
  RECONCILIATION_RUN: 'RECONCILIATION_RUN',

  // Fulfillment, Orders & Inventory
  CONFIRM: 'CONFIRM',
  SHIP: 'SHIP',
  CANCEL: 'CANCEL',
  ARBITRATE: 'ARBITRATE',
  ADJUST_INVENTORY: 'ADJUST_INVENTORY',

  // Team, Staff & RBAC
  INVITE: 'INVITE',
  ROLE_CHANGE: 'ROLE_CHANGE',
  PERMISSION_CHANGE: 'PERMISSION_CHANGE',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];
export type AuditAction = AuditActionType;

