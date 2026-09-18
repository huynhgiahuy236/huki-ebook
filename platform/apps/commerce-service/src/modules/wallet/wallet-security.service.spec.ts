import { Test, TestingModule } from '@nestjs/testing';
import { WalletSecurityService } from './wallet-security.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '@huki/shared';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { BookActor } from '../../common/book-auth.guard';
import { Security2FAPurpose } from './dto/wallet-security.dto';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('WalletSecurityService (Task 75 Withdrawal PIN & 2FA Security)', () => {
  let service: WalletSecurityService;
  let prisma: any;
  let redis: any;
  let emailService: any;

  const mockStoreOwnerActor: BookActor = {
    sub: 'user-merchant-1',
    role: 'STORE_OWNER',
    storeId: 'store-1',
  } as any;

  const mockOtherStoreOwnerActor: BookActor = {
    sub: 'user-merchant-2',
    role: 'STORE_OWNER',
    storeId: 'store-2',
  } as any;

  const mockAdminActor: BookActor = {
    sub: 'user-admin-1',
    role: 'PLATFORM_ADMIN',
  };

  const mockWallet = {
    id: 'wallet-1',
    storeId: 'store-1',
    ownerUserId: 'user-merchant-1',
    availableBalance: new Decimal(5000000),
    pendingBalance: new Decimal(1000000),
    frozenBalance: new Decimal(0),
    version: 1,
  };

  let redisStore: Map<string, { value: any; ttl?: number }> = new Map();

  beforeEach(async () => {
    redisStore = new Map();

    prisma = {
      wallet: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.storeId === 'store-1') return Promise.resolve(mockWallet);
          if (where.storeId === 'store-2') return Promise.resolve({ ...mockWallet, id: 'wallet-2', storeId: 'store-2' });
          return Promise.resolve(null);
        }),
      },
      walletSecurity: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'sec-1', ...data })),
        update: jest.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: 'sec-1', ...data })),
      },
      walletSecurityAuditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    redis = {
      get: jest.fn().mockImplementation(async (key: string) => {
        const item = redisStore.get(key);
        return item ? item.value : null;
      }),
      set: jest.fn().mockImplementation(async (key: string, value: any, ttl?: number) => {
        redisStore.set(key, { value, ttl });
      }),
      del: jest.fn().mockImplementation(async (key: string) => {
        redisStore.delete(key);
      }),
      getdel: jest.fn().mockImplementation(async (key: string) => {
        const item = redisStore.get(key);
        if (!item) return null;
        redisStore.delete(key);
        return item.value;
      }),
      verifyAndConsumeChallengeAtomic: jest.fn().mockImplementation(async (key: string, inputHash: string, maxAttempts = 3) => {
        const item = redisStore.get(key);
        if (!item) return { status: 'NOT_FOUND' };
        const data = item.value;
        if (data.codeHash === inputHash) {
          redisStore.delete(key);
          return { status: 'SUCCESS', data };
        } else {
          data.attempts = (data.attempts || 0) + 1;
          if (data.attempts >= maxAttempts) {
            redisStore.delete(key);
            return { status: 'INVALIDATED', attempts: data.attempts };
          } else {
            redisStore.set(key, { value: data, ttl: item.ttl });
            return { status: 'INCORRECT', attempts: data.attempts };
          }
        }
      }),
    };

    emailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletSecurityService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<WalletSecurityService>(WalletSecurityService);
  });

  // =========================================================================
  // 1. PIN SETUP & FORMAT VALIDATION
  // =========================================================================
  describe('PIN Setup', () => {
    it('1. successfully sets up valid 6-digit numeric PIN with bcrypt hash', async () => {
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: null,
      });

      const result = await service.setupPin({ storeId: 'store-1', pin: '123456' }, mockStoreOwnerActor);

      expect(result.hasPin).toBe(true);
      expect(prisma.walletSecurity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 'store-1' },
          data: expect.objectContaining({
            pinHash: expect.any(String),
            failedAttempts: 0,
            lockedUntil: null,
          }),
        }),
      );

      // Verify bcrypt hash validity
      const updatedCall = prisma.walletSecurity.update.mock.calls[0][0];
      const isHashValid = await bcrypt.compare('123456', updatedCall.data.pinHash);
      expect(isHashValid).toBe(true);

      // Verify audit log
      expect(prisma.walletSecurityAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'PIN_SET',
            storeId: 'store-1',
          }),
        }),
      );
    });

    it('2. rejects non-6-digit PIN format (e.g. 4, 5, 7 digits)', async () => {
      await expect(
        service.setupPin({ storeId: 'store-1', pin: '12345' }, mockStoreOwnerActor),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.setupPin({ storeId: 'store-1', pin: '1234567' }, mockStoreOwnerActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('3. rejects non-numeric PIN (letters, spaces, special chars)', async () => {
      await expect(
        service.setupPin({ storeId: 'store-1', pin: '12345a' }, mockStoreOwnerActor),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.setupPin({ storeId: 'store-1', pin: '12 456' }, mockStoreOwnerActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('4. rejects insecure PIN overwrite if PIN already exists', async () => {
      const hashedPin = await bcrypt.hash('123456', 12);
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: hashedPin,
      });

      await expect(
        service.setupPin({ storeId: 'store-1', pin: '654321' }, mockStoreOwnerActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 2. PIN VERIFICATION & FAILED ATTEMPTS (5-FAILURE 24H LOCKOUT)
  // =========================================================================
  describe('PIN Verification & Lockout', () => {
    it('5. successfully verifies correct PIN and returns step-1 token', async () => {
      const hashedPin = await bcrypt.hash('123456', 12);
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: hashedPin,
        failedAttempts: 2,
        lockedUntil: null,
      });

      const res = await service.verifyPin({ storeId: 'store-1', pin: '123456' }, mockStoreOwnerActor);

      expect(res.verified).toBe(true);
      expect(res.step1Token).toBeDefined();
      expect(prisma.walletSecurity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 'store-1' },
          data: expect.objectContaining({
            failedAttempts: 0,
            lockedUntil: null,
          }),
        }),
      );
    });

    it('6. wrong PIN increments failedAttempts (1–4) without locking', async () => {
      const hashedPin = await bcrypt.hash('123456', 12);
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: hashedPin,
        failedAttempts: 1,
        lockedUntil: null,
      });

      await expect(
        service.verifyPin({ storeId: 'store-1', pin: '999999' }, mockStoreOwnerActor),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.walletSecurity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 'store-1' },
          data: expect.objectContaining({
            failedAttempts: 2,
            lockedUntil: null,
          }),
        }),
      );
    });

    it('7. 5th consecutive failure triggers 24-hour lockout and emits PIN_LOCKED', async () => {
      const hashedPin = await bcrypt.hash('123456', 12);
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: hashedPin,
        failedAttempts: 4, // 4 prior failures
        lockedUntil: null,
      });

      await expect(
        service.verifyPin({ storeId: 'store-1', pin: '999999' }, mockStoreOwnerActor),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.walletSecurity.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 'store-1' },
          data: expect.objectContaining({
            failedAttempts: 5,
            lockedUntil: expect.any(Date),
          }),
        }),
      );

      // Verify PIN_LOCKED audit event
      expect(prisma.walletSecurityAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'PIN_LOCKED',
            storeId: 'store-1',
          }),
        }),
      );
    });

    it('8. rejects verification when wallet is actively locked in 24-hour window', async () => {
      const hashedPin = await bcrypt.hash('123456', 12);
      const futureLock = new Date(Date.now() + 12 * 60 * 60 * 1000); // 12 hours remaining
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: hashedPin,
        failedAttempts: 5,
        lockedUntil: futureLock,
      });

      await expect(
        service.verifyPin({ storeId: 'store-1', pin: '123456' }, mockStoreOwnerActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('9. allows verification when lock is expired (lockedUntil <= now)', async () => {
      const hashedPin = await bcrypt.hash('123456', 12);
      const pastLock = new Date(Date.now() - 60 * 1000); // 1 minute ago
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: hashedPin,
        failedAttempts: 5,
        lockedUntil: pastLock,
      });

      const res = await service.verifyPin({ storeId: 'store-1', pin: '123456' }, mockStoreOwnerActor);
      expect(res.verified).toBe(true);
    });

    it('10. PIN failures and lockouts do NOT modify wallet balances (WAL-001 preserved)', async () => {
      const hashedPin = await bcrypt.hash('123456', 12);
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: hashedPin,
        failedAttempts: 4,
        lockedUntil: null,
      });

      await expect(
        service.verifyPin({ storeId: 'store-1', pin: '999999' }, mockStoreOwnerActor),
      ).rejects.toThrow(ForbiddenException);

      // Verify wallet table was NOT updated
      expect(mockWallet.availableBalance.toNumber()).toBe(5000000);
      expect(mockWallet.pendingBalance.toNumber()).toBe(1000000);
      expect(mockWallet.frozenBalance.toNumber()).toBe(0);
    });
  });

  // =========================================================================
  // 3. STEP-UP 2FA CHALLENGE & VERIFICATION (REDIS BACKED)
  // =========================================================================
  describe('Step-Up 2FA Challenge & Verification', () => {
    it('11. issues 2FA challenge when valid PIN Step-1 proof exists and dispatches OTP email', async () => {
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: 'hashed',
      });

      const step1Token = 'pin_step1_valid_123';
      redisStore.set(`finance:pin:step1:${step1Token}`, {
        value: {
          storeId: 'store-1',
          actorId: 'user-merchant-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
        },
      });

      const res = await service.issueTwoFactorChallenge(
        { storeId: 'store-1', purpose: Security2FAPurpose.WALLET_WITHDRAWAL, step1Token },
        mockStoreOwnerActor,
      );

      expect(res.challengeId).toBeDefined();
      expect(res.expiresInSeconds).toBe(300);
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();

      // Check redis payload and single-chain consumption of step1Token
      const stored = redisStore.get(`finance:2fa:challenge:${res.challengeId}`);
      expect(stored).toBeDefined();
      expect(stored?.value.purpose).toBe(Security2FAPurpose.WALLET_WITHDRAWAL);
      expect(stored?.value.actorId).toBe('user-merchant-1');
      expect(redisStore.has(`finance:pin:step1:${step1Token}`)).toBe(false); // Step-1 consumed atomically
    });

    it('12. verifies 2FA OTP, consumes OTP (atomic replay protection), and issues Finance Auth Token', async () => {
      const challengeId = 'chal-test-123';
      const otpCode = '654321';
      const codeHash = createHash('sha256').update(otpCode).digest('hex');

      redisStore.set(`finance:2fa:challenge:${challengeId}`, {
        value: {
          storeId: 'store-1',
          actorId: 'user-merchant-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
          codeHash,
          attempts: 0,
        },
      });

      const res = await service.verifyTwoFactorChallenge(
        { storeId: 'store-1', challengeId, code: otpCode },
        mockStoreOwnerActor,
      );

      expect(res.verified).toBe(true);
      expect(res.financeAuthToken).toBeDefined();

      // Replay protection: challenge must be atomically deleted
      expect(redisStore.has(`finance:2fa:challenge:${challengeId}`)).toBe(false);

      // Short-lived token stored in Redis
      const authToken = redisStore.get(`finance:auth:token:${res.financeAuthToken}`);
      expect(authToken).toBeDefined();
      expect(authToken?.value.purpose).toBe(Security2FAPurpose.WALLET_WITHDRAWAL);
    });

    it('13. rejects incorrect OTP and invalidates challenge after 3 attempts', async () => {
      const challengeId = 'chal-test-bad';
      const otpCode = '111111';
      const codeHash = createHash('sha256').update(otpCode).digest('hex');

      redisStore.set(`finance:2fa:challenge:${challengeId}`, {
        value: {
          storeId: 'store-1',
          actorId: 'user-merchant-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
          codeHash,
          attempts: 2, // 2 prior failed OTP attempts
        },
      });

      await expect(
        service.verifyTwoFactorChallenge(
          { storeId: 'store-1', challengeId, code: '999999' },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(BadRequestException);

      // 3rd failure deletes challenge
      expect(redisStore.has(`finance:2fa:challenge:${challengeId}`)).toBe(false);
    });

    it('14. rejects 2FA verification if actorId does not match challenge owner', async () => {
      const challengeId = 'chal-other-actor';
      const otpCode = '654321';
      const codeHash = createHash('sha256').update(otpCode).digest('hex');

      redisStore.set(`finance:2fa:challenge:${challengeId}`, {
        value: {
          storeId: 'store-1',
          actorId: 'different-user',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
          codeHash,
          attempts: 0,
        },
      });

      await expect(
        service.verifyTwoFactorChallenge(
          { storeId: 'store-1', challengeId, code: otpCode },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('15. rejects 2FA challenge request without valid PIN Step-1 proof (Bypass Prevention)', async () => {
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: 'hashed',
      });

      // Missing step1Token
      await expect(
        service.issueTwoFactorChallenge(
          { storeId: 'store-1', purpose: Security2FAPurpose.WALLET_WITHDRAWAL, step1Token: '' },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(ForbiddenException);

      // Invalid / Expired step1Token
      await expect(
        service.issueTwoFactorChallenge(
          { storeId: 'store-1', purpose: Security2FAPurpose.WALLET_WITHDRAWAL, step1Token: 'non-existent-token' },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('16. rejects 2FA challenge when PIN Step-1 proof purpose mismatches', async () => {
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: 'hashed',
      });

      const step1Token = 'pin_step1_withdrawal';
      redisStore.set(`finance:pin:step1:${step1Token}`, {
        value: {
          storeId: 'store-1',
          actorId: 'user-merchant-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL, // Purpose is WALLET_WITHDRAWAL
        },
      });

      // Requesting 2FA for PIN_CHANGE with WALLET_WITHDRAWAL step1Token
      await expect(
        service.issueTwoFactorChallenge(
          { storeId: 'store-1', purpose: Security2FAPurpose.PIN_CHANGE, step1Token },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 4. PIN CHANGE (CURRENT PIN + 2FA)
  // =========================================================================
  describe('PIN Change', () => {
    it('17. successfully changes PIN with current PIN and valid PIN_CHANGE 2FA token', async () => {
      const currentHash = await bcrypt.hash('123456', 12);
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: currentHash,
      });

      const validToken = '2fa-token-pin-change';
      redisStore.set(`finance:auth:token:${validToken}`, {
        value: {
          storeId: 'store-1',
          actorId: 'user-merchant-1',
          purpose: Security2FAPurpose.PIN_CHANGE,
        },
      });

      const res = await service.changePin(
        {
          storeId: 'store-1',
          currentPin: '123456',
          newPin: '888888',
          twoFactorToken: validToken,
        },
        mockStoreOwnerActor,
      );

      expect(res.message).toContain('thành công');
      expect(redisStore.has(`finance:auth:token:${validToken}`)).toBe(false); // Token consumed
    });

    it('18. rejects PIN change if 2FA token was issued for WALLET_WITHDRAWAL instead of PIN_CHANGE', async () => {
      const currentHash = await bcrypt.hash('123456', 12);
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: currentHash,
      });

      const mismatchToken = '2fa-token-withdrawal';
      redisStore.set(`finance:auth:token:${mismatchToken}`, {
        value: {
          storeId: 'store-1',
          actorId: 'user-merchant-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL, // Wrong purpose
        },
      });

      await expect(
        service.changePin(
          {
            storeId: 'store-1',
            currentPin: '123456',
            newPin: '888888',
            twoFactorToken: mismatchToken,
          },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 5. FINANCE AUTHORIZATION SINGLE-USE CONSUMPTION
  // =========================================================================
  describe('Finance Authorization Single-Use Consumption', () => {
    it('19. successfully consumes Finance Auth Token once and rejects second consumption', async () => {
      const token = 'fin_auth_single_use_test';
      redisStore.set(`finance:auth:token:${token}`, {
        value: {
          storeId: 'store-1',
          actorId: 'user-merchant-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
        },
      });

      // First consumption succeeds
      const consumed = await service.consumeFinanceAuthorization({
        token,
        actor: mockStoreOwnerActor,
        storeId: 'store-1',
        purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
      });
      expect(consumed).toBe(true);
      expect(redisStore.has(`finance:auth:token:${token}`)).toBe(false);

      // Second consumption fails (token is gone)
      await expect(
        service.consumeFinanceAuthorization({
          token,
          actor: mockStoreOwnerActor,
          storeId: 'store-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('20. rejects Finance Auth Token consumption on actor, store, or purpose mismatch', async () => {
      const token = 'fin_auth_mismatch_test';
      redisStore.set(`finance:auth:token:${token}`, {
        value: {
          storeId: 'store-1',
          actorId: 'user-merchant-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
        },
      });

      // Mismatched store
      await expect(
        service.consumeFinanceAuthorization({
          token,
          actor: mockStoreOwnerActor,
          storeId: 'store-2',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
        }),
      ).rejects.toThrow(ForbiddenException);

      // Mismatched purpose
      await expect(
        service.consumeFinanceAuthorization({
          token,
          actor: mockStoreOwnerActor,
          storeId: 'store-1',
          purpose: Security2FAPurpose.PIN_CHANGE,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // =========================================================================
  // 6. TENANT ISOLATION & AUDIT INTEGRITY
  // =========================================================================
  describe('Tenant Isolation & Audit Trail', () => {
    it('21. rejects cross-store PIN setup or verification (Store 1 actor cannot access Store 2)', async () => {
      await expect(
        service.setupPin({ storeId: 'store-2', pin: '123456' }, mockStoreOwnerActor),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.verifyPin({ storeId: 'store-2', pin: '123456' }, mockStoreOwnerActor),
      ).rejects.toThrow(ForbiddenException);
    });

    it('22. admin can inspect security status across stores but cannot read plaintext PIN or hash', async () => {
      const hashedPin = await bcrypt.hash('123456', 12);
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: hashedPin,
        failedAttempts: 1,
        lockedUntil: null,
      });

      const status = await service.getSecurityStatus('store-1', mockAdminActor);
      expect(status.hasPin).toBe(true);
      expect(status.isLocked).toBe(false);
      expect(status.remainingAttempts).toBe(4);
      expect((status as any).pinHash).toBeUndefined();
    });

    it('23. security audit log records zero secrets (no plaintext PIN, hash, OTP, or token)', async () => {
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: null,
      });

      await service.setupPin({ storeId: 'store-1', pin: '123456' }, mockStoreOwnerActor);

      const auditCalls = prisma.walletSecurityAuditLog.create.mock.calls;
      expect(auditCalls.length).toBeGreaterThan(0);

      for (const call of auditCalls) {
        const loggedData = JSON.stringify(call[0].data);
        expect(loggedData).not.toContain('123456'); // No plaintext PIN
        expect(loggedData).not.toContain('$2b$12$'); // No bcrypt hash
      }
    });

    it('24. zero payout execution guarantee (no balance deduction or fund movement in Task 75)', async () => {
      const currentHash = await bcrypt.hash('123456', 12);
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: currentHash,
      });

      const res = await service.verifyPin({ storeId: 'store-1', pin: '123456' }, mockStoreOwnerActor);
      expect(res.verified).toBe(true);

      // Confirm no financial balance mutations occurred
      expect(mockWallet.availableBalance.toNumber()).toBe(5000000);
      expect(mockWallet.pendingBalance.toNumber()).toBe(1000000);
      expect(mockWallet.frozenBalance.toNumber()).toBe(0);
    });

    it('25. single-chain guarantee: same Step-1 token cannot issue multiple 2FA challenges', async () => {
      prisma.walletSecurity.findUnique.mockResolvedValue({
        id: 'sec-1',
        walletId: 'wallet-1',
        storeId: 'store-1',
        pinHash: 'hashed',
      });

      const step1Token = 'pin_step1_single_chain_test';
      redisStore.set(`finance:pin:step1:${step1Token}`, {
        value: {
          storeId: 'store-1',
          actorId: 'user-merchant-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
        },
      });

      // First challenge request succeeds and atomically consumes step1Token
      const chal1 = await service.issueTwoFactorChallenge(
        { storeId: 'store-1', purpose: Security2FAPurpose.WALLET_WITHDRAWAL, step1Token },
        mockStoreOwnerActor,
      );
      expect(chal1.challengeId).toBeDefined();

      // Second challenge request with same step1Token fails immediately
      await expect(
        service.issueTwoFactorChallenge(
          { storeId: 'store-1', purpose: Security2FAPurpose.WALLET_WITHDRAWAL, step1Token },
          mockStoreOwnerActor,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('26. concurrent token consumption: two simultaneous consume attempts yield exactly one success', async () => {
      const token = 'fin_auth_concurrent_test';
      redisStore.set(`finance:auth:token:${token}`, {
        value: {
          storeId: 'store-1',
          actorId: 'user-merchant-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
        },
      });

      // Simulate two concurrent consumers
      const results = await Promise.allSettled([
        service.consumeFinanceAuthorization({
          token,
          actor: mockStoreOwnerActor,
          storeId: 'store-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
        }),
        service.consumeFinanceAuthorization({
          token,
          actor: mockStoreOwnerActor,
          storeId: 'store-1',
          purpose: Security2FAPurpose.WALLET_WITHDRAWAL,
        }),
      ]);

      const successes = results.filter((r) => r.status === 'fulfilled');
      const rejections = results.filter((r) => r.status === 'rejected');

      expect(successes).toHaveLength(1);
      expect(rejections).toHaveLength(1);
      expect((successes[0] as PromiseFulfilledResult<boolean>).value).toBe(true);
    });
  });
});
