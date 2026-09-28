import {
  AuditSanitizer,
  AuditDiffHelper,
  AuditAction,
  AuditContextExtractor,
  AuditActorContext,
} from './index';

describe('Audit Foundation Comprehensive Suite', () => {
  describe('1. Sanitization & Redaction Requirements', () => {
    it('should redact sensitive password and token fields in camelCase and snake_case', () => {
      const payload = {
        password: 'RawPassword123!',
        passwordHash: '$2b$12$securehashvalue',
        password_hash: '$2b$12$securehashvalue_snake',
        refreshToken: 'rt_token_value',
        refresh_token: 'rt_snake_token',
        accessToken: 'at_jwt_token',
        access_token: 'at_snake_token',
        token: 'generic_token',
        pin: '123456',
        pinHash: '$2b$10$pinhash',
        pin_hash: '$2b$10$pinhash_snake',
        otp: '654321',
        secret: 'client_secret_xyz',
        apiKey: 'api_key_123',
        api_key: 'api_key_snake',
        authorization: 'Bearer eyJhbGciOi...',
        cookie: 'session_cookie=abc',
        publicField: 'safe_data',
      };

      const sanitized = AuditSanitizer.sanitize(payload);

      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.passwordHash).toBe('[REDACTED]');
      expect(sanitized.password_hash).toBe('[REDACTED]');
      expect(sanitized.refreshToken).toBe('[REDACTED]');
      expect(sanitized.refresh_token).toBe('[REDACTED]');
      expect(sanitized.accessToken).toBe('[REDACTED]');
      expect(sanitized.access_token).toBe('[REDACTED]');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.pin).toBe('[REDACTED]');
      expect(sanitized.pinHash).toBe('[REDACTED]');
      expect(sanitized.pin_hash).toBe('[REDACTED]');
      expect(sanitized.otp).toBe('[REDACTED]');
      expect(sanitized.secret).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.api_key).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.cookie).toBe('[REDACTED]');
      expect(sanitized.publicField).toBe('safe_data');
    });

    it('should recursively sanitize deeply nested objects and arrays', () => {
      const nestedPayload = {
        level1: {
          user: {
            id: 'usr-1',
            credentials: {
              passwordHash: '$2b$12$hashed',
              security: {
                pinHash: '1234',
                tokens: ['token1', 'token2', { secretKey: 'secret_val' }],
              },
            },
          },
        },
      };

      const sanitized = AuditSanitizer.sanitize(nestedPayload) as any;

      expect(sanitized.level1.user.credentials.passwordHash).toBe('[REDACTED]');
      expect(sanitized.level1.user.credentials.security.pinHash).toBe('[REDACTED]');
      expect(sanitized.level1.user.credentials.security.tokens[2].secretKey).toBe('[REDACTED]');
      expect(sanitized.level1.user.id).toBe('usr-1');
    });

    it('should mask bank account numbers while preserving prefix and suffix', () => {
      const bankData = {
        bankAccountNumber: '00112233892',
        account_number: '19034567890123',
        accountNumber: '1234',
      };

      const sanitized = AuditSanitizer.sanitize(bankData);

      expect(sanitized.bankAccountNumber).toBe('0011****3892');
      expect(sanitized.account_number).toBe('1903******0123');
      expect(sanitized.accountNumber).toBe('****');
    });
  });

  describe('2. Diff Helper & Changed Fields', () => {
    it('should accurately detect updated fields between before and after states', () => {
      const before = {
        status: 'PENDING_APPROVAL',
        name: 'Publisher ABC',
        phone: '0901234567',
        taxCode: '0312345678',
      };

      const after = {
        status: 'APPROVED',
        name: 'Publisher ABC',
        phone: '0909999999',
        taxCode: '0312345678',
      };

      const diff = AuditDiffHelper.computeDiff(before, after);

      expect(diff.changedFields).toEqual(['status', 'phone']);
      expect(diff.beforeState?.status).toBe('PENDING_APPROVAL');
      expect(diff.afterState?.status).toBe('APPROVED');
    });

    it('should sanitize both before and after states in diff results', () => {
      const before = {
        id: 'usr-1',
        passwordHash: 'old_hash',
        role: 'USER',
      };

      const after = {
        id: 'usr-1',
        passwordHash: 'new_hash',
        role: 'BUSINESS',
      };

      const diff = AuditDiffHelper.computeDiff(before, after);

      expect(diff.changedFields).toEqual(['role']); // both hashes sanitized to [REDACTED] so no plain leaks
      expect(diff.beforeState?.passwordHash).toBe('[REDACTED]');
      expect(diff.afterState?.passwordHash).toBe('[REDACTED]');
    });
  });

  describe('3. Actor Context Extraction', () => {
    it('should extract actorId, role, storeId, requestId, and ip from request headers & user', () => {
      const mockReq = {
        user: {
          id: 'admin-uuid-123',
          role: 'PLATFORM_ADMIN',
          email: 'admin@huki.vn',
        },
        headers: {
          'x-request-id': 'req-corr-999',
          'x-forwarded-for': '203.0.113.195, 70.41.3.18',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      };

      const context = AuditContextExtractor.extract(mockReq);

      expect(context.actorId).toBe('admin-uuid-123');
      expect(context.actorRole).toBe('PLATFORM_ADMIN');
      expect(context.actorEmail).toBe('admin@huki.vn');
      expect(context.requestId).toBe('req-corr-999');
      expect(context.ipAddress).toBe('203.0.113.195');
      expect(context.userAgent).toContain('Mozilla/5.0');
    });

    it('should handle unauthenticated requests gracefully', () => {
      const mockReq = {
        headers: {
          'x-request-id': 'public-req-1',
        },
        ip: '127.0.0.1',
      };

      const context = AuditContextExtractor.extract(mockReq);

      expect(context.actorId).toBe('ANONYMOUS');
      expect(context.actorRole).toBeUndefined();
      expect(context.requestId).toBe('public-req-1');
      expect(context.ipAddress).toBe('127.0.0.1');
    });
  });

  describe('4. Standard Governance Action Taxonomy', () => {
    it('should include all Phase 1 locked actions', () => {
      expect(AuditAction.CREATE).toBe('CREATE');
      expect(AuditAction.UPDATE).toBe('UPDATE');
      expect(AuditAction.DELETE).toBe('DELETE');
      expect(AuditAction.APPROVE).toBe('APPROVE');
      expect(AuditAction.REJECT).toBe('REJECT');
      expect(AuditAction.SUSPEND).toBe('SUSPEND');
      expect(AuditAction.BLOCK).toBe('BLOCK');
      expect(AuditAction.UNBLOCK).toBe('UNBLOCK');
      expect(AuditAction.PAYOUT_REQUEST).toBe('PAYOUT_REQUEST');
      expect(AuditAction.PAYOUT_REVIEW).toBe('PAYOUT_REVIEW');
      expect(AuditAction.PIN_CHANGE).toBe('PIN_CHANGE');
      expect(AuditAction.CONFIRM).toBe('CONFIRM');
      expect(AuditAction.SHIP).toBe('SHIP');
      expect(AuditAction.CANCEL).toBe('CANCEL');
      expect(AuditAction.INVITE).toBe('INVITE');
      expect(AuditAction.ROLE_CHANGE).toBe('ROLE_CHANGE');
      expect(AuditAction.PERMISSION_CHANGE).toBe('PERMISSION_CHANGE');
    });
  });
});
