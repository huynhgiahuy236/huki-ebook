import { AuditDiffHelper } from './audit-diff.helper';

describe('AuditDiffHelper', () => {
  it('should compute changed fields correctly and sanitize both states', () => {
    const before = {
      id: 'biz-101',
      name: 'Old Business Name',
      status: 'PENDING_APPROVAL',
      password: 'RawPassword123',
    };

    const after = {
      id: 'biz-101',
      name: 'New Business Name',
      status: 'APPROVED',
      password: 'NewRawPassword456',
    };

    const diff = AuditDiffHelper.computeDiff(before, after);

    expect(diff.changedFields).toContain('name');
    expect(diff.changedFields).toContain('status');
    expect(diff.beforeState?.status).toBe('PENDING_APPROVAL');
    expect(diff.afterState?.status).toBe('APPROVED');
    expect(diff.beforeState?.password).toBe('[REDACTED]');
    expect(diff.afterState?.password).toBe('[REDACTED]');
  });

  it('should handle creation (null beforeState)', () => {
    const after = {
      id: 'voucher-1',
      code: 'SUMMER2026',
      discount: 20,
    };

    const diff = AuditDiffHelper.computeDiff(null, after);

    expect(diff.beforeState).toBeNull();
    expect(diff.afterState?.code).toBe('SUMMER2026');
    expect(diff.changedFields).toEqual(['id', 'code', 'discount']);
  });
});
