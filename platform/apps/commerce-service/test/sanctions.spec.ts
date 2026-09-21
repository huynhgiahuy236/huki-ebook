import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  AppealDecision,
  SanctionLevel,
  SanctionStatus,
} from '../prisma/generated/client';
import {
  SanctionsService,
  addUTCMonths,
} from '../src/modules/sanctions/sanctions.service';
import { AppealsService } from '../src/modules/sanctions/appeals.service';

describe('Task 83 — Sanction Enforcement Logic Test Suite', () => {
  let sanctionsService: SanctionsService;
  let appealsService: AppealsService;
  let mockPrisma: any;
  let mockNotificationService: any;
  let mockConfigService: any;

  const mockStoreA = 'store-uuid-001';
  const mockStoreB = 'store-uuid-002';
  const mockOwnerA = 'user-owner-001';
  const mockOwnerB = 'user-owner-002';
  const mockAdminId = 'admin-user-999';

  beforeEach(() => {
    mockPrisma = {
      sanction: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      sanctionAppeal: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (cb, options) => {
        if (typeof cb === 'function') {
          return cb(mockPrisma);
        }
        return Promise.all(cb);
      }),
    };

    mockNotificationService = {
      create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'storage.r2.publicDomain') return 'https://storage.huki.vn';
        return undefined;
      }),
    };

    sanctionsService = new SanctionsService(
      mockPrisma as any,
      mockNotificationService as any,
    );

    appealsService = new AppealsService(
      mockPrisma as any,
      mockNotificationService as any,
      mockConfigService as any,
    );
  });

  describe('1. Sanction Target Identity & Owner Resolution', () => {
    it('TC-01: Sanction target is strictly storeId and server resolves sellerId from Wallet', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ ownerUserId: mockOwnerA });
      mockPrisma.sanction.findFirst.mockResolvedValue(null);
      mockPrisma.sanction.create.mockImplementation(({ data }: any) => ({
        id: 'sanc-1',
        ...data,
      }));

      const result = await sanctionsService.createSanction(mockAdminId, {
        storeId: mockStoreA,
        level: SanctionLevel.WARNING,
        reason: 'Violation of content policy',
      });

      expect(result.storeId).toBe(mockStoreA);
      expect(result.sellerId).toBe(mockOwnerA);
      expect(result.issuedBy).toBe(mockAdminId);
      expect(mockPrisma.wallet.findUnique).toHaveBeenCalledWith({
        where: { storeId: mockStoreA },
        select: { ownerUserId: true },
      });
    });

    it('TC-02: Fails closed with 404 STORE_OWNER_UNRESOLVABLE if store has no wallet snapshot', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue(null);

      await expect(
        sanctionsService.createSanction(mockAdminId, {
          storeId: 'unknown-store',
          level: SanctionLevel.WARNING,
          reason: 'Policy check',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('TC-03: Multi-Store Isolation - Sanctioning Store A does not affect Store B', async () => {
      // Store A has active suspension
      mockPrisma.sanction.findFirst.mockImplementation(({ where }: any) => {
        if (where.storeId === mockStoreA) {
          return Promise.resolve({
            id: 'sanc-a',
            storeId: mockStoreA,
            level: SanctionLevel.SUSPENSION,
            status: SanctionStatus.ACTIVE,
            expiresAt: new Date(Date.now() + 86400000),
          });
        }
        return Promise.resolve(null);
      });

      // Actions on Store A are denied
      await expect(sanctionsService.assertCanMutateBooks(mockStoreA)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(sanctionsService.assertCanReceiveOrders(mockStoreA)).rejects.toThrow(
        BadRequestException,
      );
      await expect(sanctionsService.assertCanRequestPayout(mockStoreA)).rejects.toThrow(
        ForbiddenException,
      );

      // Actions on Store B proceed with no restriction
      await expect(sanctionsService.assertCanMutateBooks(mockStoreB)).resolves.toBeUndefined();
      await expect(sanctionsService.assertCanReceiveOrders(mockStoreB)).resolves.toBeUndefined();
      await expect(sanctionsService.assertCanRequestPayout(mockStoreB)).resolves.toBeUndefined();
    });
  });

  describe('2. Canonical Durations & UTC Month Arithmetic', () => {
    it('TC-04: Warning duration is exact 7 days (168 hours) and rejects durationMonths', () => {
      const now = new Date('2026-09-20T10:00:00.000Z');
      const expiresAt = sanctionsService.calculateExpiresAt(SanctionLevel.WARNING, now);
      expect(expiresAt?.toISOString()).toBe('2026-09-27T10:00:00.000Z');

      expect(() => {
        sanctionsService.calculateExpiresAt(SanctionLevel.WARNING, now, 1);
      }).toThrow(BadRequestException);
    });

    it('TC-05: Probation duration is 1 calendar month in UTC with month-end clamp', () => {
      const now = new Date('2026-01-31T12:00:00.000Z');
      const expiresAt = sanctionsService.calculateExpiresAt(SanctionLevel.PROBATION, now);
      // Jan 31 + 1 month in 2026 (non-leap) -> Feb 28
      expect(expiresAt?.toISOString()).toBe('2026-02-28T12:00:00.000Z');

      expect(() => {
        sanctionsService.calculateExpiresAt(SanctionLevel.PROBATION, now, 2);
      }).toThrow(BadRequestException);
    });

    it('TC-06: Suspension supports 1, 2, or 3 months and rejects invalid durations', () => {
      const now = new Date('2026-03-31T00:00:00.000Z');
      
      const susp1 = sanctionsService.calculateExpiresAt(SanctionLevel.SUSPENSION, now, 1);
      expect(susp1?.toISOString()).toBe('2026-04-30T00:00:00.000Z'); // Mar 31 + 1 mo -> Apr 30

      const susp2 = sanctionsService.calculateExpiresAt(SanctionLevel.SUSPENSION, now, 2);
      expect(susp2?.toISOString()).toBe('2026-05-31T00:00:00.000Z');

      const susp3 = sanctionsService.calculateExpiresAt(SanctionLevel.SUSPENSION, now, 3);
      expect(susp3?.toISOString()).toBe('2026-06-30T00:00:00.000Z');

      expect(() => sanctionsService.calculateExpiresAt(SanctionLevel.SUSPENSION, now, 0)).toThrow(
        BadRequestException,
      );
      expect(() => sanctionsService.calculateExpiresAt(SanctionLevel.SUSPENSION, now, 4)).toThrow(
        BadRequestException,
      );
      expect(() => sanctionsService.calculateExpiresAt(SanctionLevel.SUSPENSION, now)).toThrow(
        BadRequestException,
      );
    });

    it('TC-07: Ban is permanent (expiresAt = null) and rejects duration inputs', () => {
      const now = new Date();
      const expiresAt = sanctionsService.calculateExpiresAt(SanctionLevel.BAN, now);
      expect(expiresAt).toBeNull();

      expect(() => sanctionsService.calculateExpiresAt(SanctionLevel.BAN, now, 1)).toThrow(
        BadRequestException,
      );
    });

    it('TC-08: Leap year calculation in UTC month arithmetic', () => {
      const leapJan31 = new Date('2024-01-31T00:00:00.000Z');
      const feb2024 = addUTCMonths(leapJan31, 1);
      expect(feb2024.toISOString()).toBe('2024-02-29T00:00:00.000Z');
    });
  });

  describe('3. Query-Time Expiry & Lazy Expiry Boundaries', () => {
    it('TC-09: Expiry boundary - effective before expiresAt, expired at expiresAt', async () => {
      const now = new Date('2026-09-20T12:00:00.000Z');
      jest.useFakeTimers();
      jest.setSystemTime(now);

      // Active sanction expiring at 12:00:00.000Z
      mockPrisma.sanction.findFirst.mockImplementation(({ where }: any) => {
        const currentTime = new Date();
        const expiresAt = new Date('2026-09-20T12:00:00.000Z');
        if (where.storeId === mockStoreA && expiresAt > currentTime) {
          return Promise.resolve({
            id: 'sanc-1',
            storeId: mockStoreA,
            level: SanctionLevel.SUSPENSION,
            status: SanctionStatus.ACTIVE,
            expiresAt,
          });
        }
        return Promise.resolve(null);
      });

      // 1ms before expiry -> still active & restricted
      jest.setSystemTime(new Date('2026-09-20T11:59:59.999Z'));
      const active = await sanctionsService.findActiveSanction(mockStoreA);
      expect(active).not.toBeNull();
      await expect(sanctionsService.assertCanMutateBooks(mockStoreA)).rejects.toThrow(
        ForbiddenException,
      );

      // At expiry instant -> expired, not restricted
      jest.setSystemTime(new Date('2026-09-20T12:00:00.000Z'));
      const expired = await sanctionsService.findActiveSanction(mockStoreA);
      expect(expired).toBeNull();
      await expect(sanctionsService.assertCanMutateBooks(mockStoreA)).resolves.toBeUndefined();

      jest.useRealTimers();
    });

    it('TC-10: Expired persisted row with status=ACTIVE does not block new sanction creation', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ ownerUserId: mockOwnerA });
      // findFirst returns null because query-time filter includes `expiresAt > now`
      mockPrisma.sanction.findFirst.mockResolvedValue(null);
      mockPrisma.sanction.create.mockResolvedValue({
        id: 'sanc-2',
        storeId: mockStoreA,
        status: SanctionStatus.ACTIVE,
      });

      const newSanction = await sanctionsService.createSanction(mockAdminId, {
        storeId: mockStoreA,
        level: SanctionLevel.WARNING,
        reason: 'New violation after old expired',
      });

      expect(newSanction.id).toBe('sanc-2');
    });
  });

  describe('4. Enforcement Action Matrix', () => {
    it('TC-11: WARNING allows book mutations, checkout, and payouts', async () => {
      mockPrisma.sanction.findFirst.mockResolvedValue({
        id: 's-warn',
        storeId: mockStoreA,
        level: SanctionLevel.WARNING,
        status: SanctionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(sanctionsService.assertCanMutateBooks(mockStoreA)).resolves.toBeUndefined();
      await expect(sanctionsService.assertCanReceiveOrders(mockStoreA)).resolves.toBeUndefined();
      await expect(sanctionsService.assertCanRequestPayout(mockStoreA)).resolves.toBeUndefined();
    });

    it('TC-12: PROBATION blocks checkout orders, allows book mutations and payouts', async () => {
      mockPrisma.sanction.findFirst.mockResolvedValue({
        id: 's-prob',
        storeId: mockStoreA,
        level: SanctionLevel.PROBATION,
        status: SanctionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(sanctionsService.assertCanMutateBooks(mockStoreA)).resolves.toBeUndefined();
      await expect(sanctionsService.assertCanReceiveOrders(mockStoreA)).rejects.toThrow(
        BadRequestException,
      );
      await expect(sanctionsService.assertCanRequestPayout(mockStoreA)).resolves.toBeUndefined();
    });

    it('TC-13: SUSPENSION and BAN block book mutations, orders, and payouts', async () => {
      for (const level of [SanctionLevel.SUSPENSION, SanctionLevel.BAN]) {
        mockPrisma.sanction.findFirst.mockResolvedValue({
          id: `s-${level}`,
          storeId: mockStoreA,
          level,
          status: SanctionStatus.ACTIVE,
          expiresAt: level === SanctionLevel.BAN ? null : new Date(Date.now() + 86400000),
        });

        await expect(sanctionsService.assertCanMutateBooks(mockStoreA)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(sanctionsService.assertCanReceiveOrders(mockStoreA)).rejects.toThrow(
          BadRequestException,
        );
        await expect(sanctionsService.assertCanRequestPayout(mockStoreA)).rejects.toThrow(
          ForbiddenException,
        );
      }
    });
  });

  describe('5. Concurrency & Single Active Sanction Guard', () => {
    it('TC-14: Attempting to create duplicate active sanction returns 409 Conflict', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ ownerUserId: mockOwnerA });
      mockPrisma.sanction.findFirst.mockResolvedValue({
        id: 'existing-sanc',
        storeId: mockStoreA,
        status: SanctionStatus.ACTIVE,
        level: SanctionLevel.PROBATION,
      });

      await expect(
        sanctionsService.createSanction(mockAdminId, {
          storeId: mockStoreA,
          level: SanctionLevel.WARNING,
          reason: 'Duplicate check',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('TC-15: APPEALED sanction blocks second sanction creation', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ ownerUserId: mockOwnerA });
      mockPrisma.sanction.findFirst.mockResolvedValue({
        id: 'appealed-sanc',
        storeId: mockStoreA,
        status: SanctionStatus.APPEALED,
        level: SanctionLevel.SUSPENSION,
      });

      await expect(
        sanctionsService.createSanction(mockAdminId, {
          storeId: mockStoreA,
          level: SanctionLevel.BAN,
          reason: 'Escalation check',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('TC-16: Serialization retry handles transient conflict and succeeds', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ ownerUserId: mockOwnerA });
      let callCount = 0;
      mockPrisma.sanction.findFirst.mockResolvedValue(null);
      mockPrisma.sanction.create.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          const err: any = new Error('could not serialize access due to concurrent update');
          err.code = 'P2034';
          throw err;
        }
        return { id: 'sanc-retry-success', storeId: mockStoreA, status: SanctionStatus.ACTIVE };
      });

      const result = await sanctionsService.createSanction(mockAdminId, {
        storeId: mockStoreA,
        level: SanctionLevel.WARNING,
        reason: 'Retry test',
      });

      expect(result.id).toBe('sanc-retry-success');
      expect(callCount).toBe(2);
    });

    it('TC-17: Exhausted retries throw 500 CONCURRENCY_CONFLICT without fake 409', async () => {
      mockPrisma.wallet.findUnique.mockResolvedValue({ ownerUserId: mockOwnerA });
      mockPrisma.sanction.findFirst.mockResolvedValue(null);
      mockPrisma.sanction.create.mockImplementation(() => {
        const err: any = new Error('could not serialize access');
        err.code = 'P2034';
        throw err;
      });

      await expect(
        sanctionsService.createSanction(mockAdminId, {
          storeId: mockStoreA,
          level: SanctionLevel.WARNING,
          reason: 'Exhaustion test',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('6. 1-to-1 Appeal Workflow & Authorization', () => {
    it('TC-18: Authenticated store owner can submit appeal within 7 days', async () => {
      const issuedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      mockPrisma.sanction.findUnique.mockResolvedValue({
        id: 'sanc-app-1',
        storeId: mockStoreA,
        sellerId: mockOwnerA,
        status: SanctionStatus.ACTIVE,
        issuedAt,
        appeal: null,
      });

      mockPrisma.sanctionAppeal.create.mockResolvedValue({
        id: 'appeal-1',
        sanctionId: 'sanc-app-1',
        storeId: mockStoreA,
        sellerId: mockOwnerA,
        reason: 'Evidence of compliance',
        decision: AppealDecision.PENDING,
      });

      const appeal = await appealsService.submitAppeal('sanc-app-1', mockOwnerA, {
        reason: 'Evidence of compliance',
      });

      expect(appeal.id).toBe('appeal-1');
      expect(mockPrisma.sanction.update).toHaveBeenCalledWith({
        where: { id: 'sanc-app-1' },
        data: { status: SanctionStatus.APPEALED },
      });
    });

    it('TC-19: Non-owner caller is rejected with 403 Forbidden', async () => {
      mockPrisma.sanction.findUnique.mockResolvedValue({
        id: 'sanc-app-1',
        storeId: mockStoreA,
        sellerId: mockOwnerA,
        status: SanctionStatus.ACTIVE,
        issuedAt: new Date(),
        appeal: null,
      });

      await expect(
        appealsService.submitAppeal('sanc-app-1', 'intruder-user', {
          reason: 'Unauthorized appeal',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC-20: Submitting appeal after 7 days (168h) is rejected with 400 APPEAL_WINDOW_EXPIRED', async () => {
      const issuedAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
      mockPrisma.sanction.findUnique.mockResolvedValue({
        id: 'sanc-old',
        storeId: mockStoreA,
        sellerId: mockOwnerA,
        status: SanctionStatus.ACTIVE,
        issuedAt,
        appeal: null,
      });

      await expect(
        appealsService.submitAppeal('sanc-old', mockOwnerA, {
          reason: 'Late appeal',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-21: Second appeal is rejected with 409 APPEAL_ALREADY_EXISTS', async () => {
      mockPrisma.sanction.findUnique.mockResolvedValue({
        id: 'sanc-app-dup',
        storeId: mockStoreA,
        sellerId: mockOwnerA,
        status: SanctionStatus.APPEALED,
        issuedAt: new Date(),
        appeal: { id: 'existing-appeal' },
      });

      await expect(
        appealsService.submitAppeal('sanc-app-dup', mockOwnerA, {
          reason: 'Second appeal attempt',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('TC-22: Approving appeal lifts sanction and updates appeal decision', async () => {
      mockPrisma.sanctionAppeal.findUnique.mockResolvedValue({
        id: 'appeal-100',
        sanctionId: 'sanc-100',
        sellerId: mockOwnerA,
        decision: AppealDecision.PENDING,
      });

      mockPrisma.sanctionAppeal.update.mockResolvedValue({
        id: 'appeal-100',
        decision: AppealDecision.APPROVED,
      });

      const updated = await appealsService.reviewAppeal('appeal-100', mockAdminId, {
        decision: AppealDecision.APPROVED,
        decisionReason: 'Seller provided valid proof of rights',
      });

      expect(updated.decision).toBe(AppealDecision.APPROVED);
      expect(mockPrisma.sanction.update).toHaveBeenCalledWith({
        where: { id: 'sanc-100' },
        data: expect.objectContaining({
          status: SanctionStatus.LIFTED,
          liftedBy: mockAdminId,
          liftReason: 'Seller provided valid proof of rights',
        }),
      });
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockOwnerA,
          title: expect.stringContaining('APPROVED'),
        }),
      );
    });

    it('TC-23: Rejecting appeal sets sanction back to ACTIVE', async () => {
      mockPrisma.sanctionAppeal.findUnique.mockResolvedValue({
        id: 'appeal-200',
        sanctionId: 'sanc-200',
        sellerId: mockOwnerA,
        decision: AppealDecision.PENDING,
      });

      mockPrisma.sanctionAppeal.update.mockResolvedValue({
        id: 'appeal-200',
        decision: AppealDecision.REJECTED,
      });

      const updated = await appealsService.reviewAppeal('appeal-200', mockAdminId, {
        decision: AppealDecision.REJECTED,
        decisionReason: 'Insufficient evidence',
      });

      expect(updated.decision).toBe(AppealDecision.REJECTED);
      expect(mockPrisma.sanction.update).toHaveBeenCalledWith({
        where: { id: 'sanc-200' },
        data: {
          status: SanctionStatus.ACTIVE,
        },
      });
    });

    it('TC-24: Reviewing an already reviewed appeal throws 400 Bad Request', async () => {
      mockPrisma.sanctionAppeal.findUnique.mockResolvedValue({
        id: 'appeal-300',
        decision: AppealDecision.APPROVED,
      });

      await expect(
        appealsService.reviewAppeal('appeal-300', mockAdminId, {
          decision: AppealDecision.REJECTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('7. Manual Lift & Historical Audit Trail', () => {
    it('TC-25: Admin can manually lift an active sanction with audit fields', async () => {
      mockPrisma.sanction.findUnique.mockResolvedValue({
        id: 'sanc-lift-1',
        storeId: mockStoreA,
        sellerId: mockOwnerA,
        status: SanctionStatus.ACTIVE,
      });

      mockPrisma.sanction.update.mockResolvedValue({
        id: 'sanc-lift-1',
        storeId: mockStoreA,
        sellerId: mockOwnerA,
        status: SanctionStatus.LIFTED,
        liftedBy: mockAdminId,
        liftReason: 'Issue resolved amicably',
      });

      const lifted = await sanctionsService.liftSanction('sanc-lift-1', mockAdminId, {
        liftReason: 'Issue resolved amicably',
      });

      expect(lifted.status).toBe(SanctionStatus.LIFTED);
      expect(mockPrisma.sanction.update).toHaveBeenCalledWith({
        where: { id: 'sanc-lift-1' },
        data: expect.objectContaining({
          status: SanctionStatus.LIFTED,
          liftedBy: mockAdminId,
          liftReason: 'Issue resolved amicably',
        }),
      });
    });

    it('TC-26: Lifting an already lifted sanction throws 400 Bad Request', async () => {
      mockPrisma.sanction.findUnique.mockResolvedValue({
        id: 'sanc-lift-2',
        status: SanctionStatus.LIFTED,
      });

      await expect(
        sanctionsService.liftSanction('sanc-lift-2', mockAdminId, {
          liftReason: 'Duplicate lift',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-27: Historical sanctions remain queryable for store audit history', async () => {
      const historyList = [
        { id: 's1', level: SanctionLevel.WARNING, status: SanctionStatus.LIFTED },
        { id: 's2', level: SanctionLevel.PROBATION, status: SanctionStatus.ACTIVE },
      ];
      mockPrisma.sanction.findMany.mockResolvedValue(historyList);

      const result = await sanctionsService.getSanctionsByStore(mockStoreA);
      expect(result).toHaveLength(2);
      expect(mockPrisma.sanction.findMany).toHaveBeenCalledWith({
        where: { storeId: mockStoreA },
        include: { appeal: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('8. Task 84 — Persistent Evidence Upload Pipeline', () => {
    const mockFile: any = {
      buffer: Buffer.from('fake pdf content'),
      size: 1024 * 100, // 100KB
      mimetype: 'application/pdf',
      originalname: 'license_proof.pdf',
    };

    it('TC-28: Store owner can upload persistent evidence and receive metadata', async () => {
      mockPrisma.sanction.findUnique.mockResolvedValue({
        id: 'sanc-upl-1',
        sellerId: mockOwnerA,
      });

      const res = await appealsService.uploadAppealEvidence(mockOwnerA, 'sanc-upl-1', mockFile);

      expect(res.url).toMatch(/^https:\/\/storage\.huki\.vn\/appeals\/sanc-upl-1\//);
      expect(res.filename).toBe('license_proof.pdf');
      expect(res.mimeType).toBe('application/pdf');
      expect(res.size).toBe(mockFile.size);
      expect(res.uploadedAt).toBeDefined();
    });

    it('TC-29: Rejects evidence upload for non-owner caller (IDOR protection)', async () => {
      mockPrisma.sanction.findUnique.mockResolvedValue({
        id: 'sanc-upl-1',
        sellerId: mockOwnerA,
      });

      await expect(
        appealsService.uploadAppealEvidence('intruder-user', 'sanc-upl-1', mockFile),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC-30: Rejects oversized file (> 5MB limit)', async () => {
      mockPrisma.sanction.findUnique.mockResolvedValue({
        id: 'sanc-upl-1',
        sellerId: mockOwnerA,
      });

      const oversizedFile: any = {
        buffer: Buffer.alloc(6 * 1024 * 1024),
        size: 6 * 1024 * 1024,
        mimetype: 'application/pdf',
        originalname: 'huge.pdf',
      };

      await expect(
        appealsService.uploadAppealEvidence(mockOwnerA, 'sanc-upl-1', oversizedFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC-31: Rejects invalid MIME type', async () => {
      mockPrisma.sanction.findUnique.mockResolvedValue({
        id: 'sanc-upl-1',
        sellerId: mockOwnerA,
      });

      const invalidFile: any = {
        buffer: Buffer.from('exe'),
        size: 100,
        mimetype: 'application/x-msdownload',
        originalname: 'malware.exe',
      };

      await expect(
        appealsService.uploadAppealEvidence(mockOwnerA, 'sanc-upl-1', invalidFile),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('9. Task 84 — Admin Appeal Queue & Notification Recipients', () => {
    it('TC-32: Admin can query paginated appeals with decision filter', async () => {
      const mockAppeals = [
        { id: 'app-1', decision: AppealDecision.PENDING, submittedAt: new Date() },
        { id: 'app-2', decision: AppealDecision.PENDING, submittedAt: new Date() },
      ];
      mockPrisma.sanctionAppeal.findMany.mockResolvedValue(mockAppeals);
      mockPrisma.sanctionAppeal.count.mockResolvedValue(2);

      const res = await appealsService.getAppeals({
        page: 1,
        limit: 10,
        decision: AppealDecision.PENDING,
      });

      expect(res.items).toHaveLength(2);
      expect(res.total).toBe(2);
      expect(res.totalPages).toBe(1);
      expect(mockPrisma.sanctionAppeal.findMany).toHaveBeenCalledWith({
        where: { decision: AppealDecision.PENDING },
        include: { sanction: true },
        orderBy: { submittedAt: 'asc' },
        skip: 0,
        take: 10,
      });
    });

    it('TC-33: Review appeal dispatches notification to seller (CANONICAL) and issuer admin (ENGINEERING DEFAULT)', async () => {
      mockPrisma.sanctionAppeal.findUnique.mockResolvedValue({
        id: 'appeal-notif-1',
        sanctionId: 'sanc-notif-1',
        sellerId: mockOwnerA,
        decision: AppealDecision.PENDING,
        sanction: {
          id: 'sanc-notif-1',
          issuedBy: 'admin-issuer-001',
        },
      });

      mockPrisma.sanctionAppeal.update.mockResolvedValue({
        id: 'appeal-notif-1',
        decision: AppealDecision.APPROVED,
      });

      await appealsService.reviewAppeal('appeal-notif-1', mockAdminId, {
        decision: AppealDecision.APPROVED,
        decisionReason: 'Rights restored',
      });

      // Seller notification (CANONICAL)
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockOwnerA,
          title: expect.stringContaining('APPROVED'),
        }),
      );

      // Issuer Admin notification (ENGINEERING DEFAULT / PROPOSED)
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-issuer-001',
          title: expect.stringContaining('Cập nhật kết quả kháng nghị'),
        }),
      );
    });

    it('TC-34: System issuer does not trigger user notification dispatch', async () => {
      mockNotificationService.create.mockClear();

      mockPrisma.sanctionAppeal.findUnique.mockResolvedValue({
        id: 'appeal-sys-1',
        sanctionId: 'sanc-sys-1',
        sellerId: mockOwnerA,
        decision: AppealDecision.PENDING,
        sanction: {
          id: 'sanc-sys-1',
          issuedBy: 'SYSTEM',
        },
      });

      mockPrisma.sanctionAppeal.update.mockResolvedValue({
        id: 'appeal-sys-1',
        decision: AppealDecision.REJECTED,
      });

      await appealsService.reviewAppeal('appeal-sys-1', mockAdminId, {
        decision: AppealDecision.REJECTED,
      });

      // Only seller notification was dispatched
      expect(mockNotificationService.create).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockOwnerA,
        }),
      );
    });
  });
});
