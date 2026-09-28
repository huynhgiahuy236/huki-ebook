/**
 * Audit Diff Helper
 * Computes state differences between before and after mutation snapshots.
 */

import { AuditSanitizer } from './audit-sanitizer';

export interface AuditDiffResult {
  beforeState: Record<string, any> | null;
  afterState: Record<string, any> | null;
  changedFields: string[];
}

export class AuditDiffHelper {
  /**
   * Compare two state snapshots and compute changed field names.
   * Both states are sanitized before being returned.
   */
  static getChangedFields(
    before: Record<string, any> | null | undefined,
    after: Record<string, any> | null | undefined,
  ): string[] {
    return this.computeDiff(before, after).changedFields;
  }

  static computeDiff(
    before: Record<string, any> | null | undefined,
    after: Record<string, any> | null | undefined,
  ): AuditDiffResult {
    const sanitizedBefore = before ? AuditSanitizer.sanitize(before) : null;
    const sanitizedAfter = after ? AuditSanitizer.sanitize(after) : null;

    if (!sanitizedBefore && !sanitizedAfter) {
      return { beforeState: null, afterState: null, changedFields: [] };
    }

    if (!sanitizedBefore && sanitizedAfter) {
      return {
        beforeState: null,
        afterState: sanitizedAfter,
        changedFields: Object.keys(sanitizedAfter),
      };
    }

    if (sanitizedBefore && !sanitizedAfter) {
      return {
        beforeState: sanitizedBefore,
        afterState: null,
        changedFields: Object.keys(sanitizedBefore),
      };
    }

    const changedFields: string[] = [];
    const allKeys = new Set([
      ...Object.keys(sanitizedBefore!),
      ...Object.keys(sanitizedAfter!),
    ]);

    for (const key of allKeys) {
      const valBefore = sanitizedBefore![key];
      const valAfter = sanitizedAfter![key];

      if (!this.areEqual(valBefore, valAfter)) {
        changedFields.push(key);
      }
    }

    return {
      beforeState: sanitizedBefore,
      afterState: sanitizedAfter,
      changedFields,
    };
  }

  private static areEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || b === null || a === undefined || b === undefined) return a === b;

    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }

    if (typeof a === 'object' && typeof b === 'object') {
      try {
        return JSON.stringify(a) === JSON.stringify(b);
      } catch {
        return false;
      }
    }

    return false;
  }
}
