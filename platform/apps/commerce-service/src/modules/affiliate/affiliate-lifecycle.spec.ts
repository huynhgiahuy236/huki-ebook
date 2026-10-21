import { Test, TestingModule } from '@nestjs/testing';
import { AffiliateLifecycleService } from './services/affiliate-lifecycle.service';
import { AffiliateCommissionStateMachineService } from './state-machine/affiliate-commission-state-machine.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AffiliateCommissionStatus } from '../../../prisma/generated/client';

describe('AffiliateLifecycleService (Phase 7 Lifecycle, Dispute, Cancel & Reversal)', () => {
  let service: AffiliateLifecycleService;
  let stateMachine: AffiliateCommissionStateMachineService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      affiliateCommission: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation((args) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      outboxEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    const mockStateMachine = {
      transitionToHolding: jest.fn().mockImplementation((id, hours, startedAt) => {
        const start = startedAt || new Date();
        return Promise.resolve({
          id,
          status: AffiliateCommissionStatus.HOLDING,
          holdingStartedAt: start,
          holdingUntil: new Date(start.getTime() + hours * 3600 * 1000),
        });
      }),
      settleCommission: jest.fn().mockImplementation((id, now) => {
        return Promise.resolve({
          commissionId: id,
          previousStatus: AffiliateCommissionStatus.HOLDING,
          newStatus: AffiliateCommissionStatus.AVAILABLE,
          settledAt: now || new Date(),
          ledgerTransactionId: `LTX-${id}`,
          amount: 25000,
        });
      }),
      cancelCommission: jest.fn().mockImplementation((id, reason) => {
        return Promise.resolve({
          id,
          status: AffiliateCommissionStatus.CANCELLED,
          cancelReason: reason,
        });
      }),
      reverseCommission: jest.fn().mockImplementation((id, reason) => {
        return Promise.resolve({
          commissionId: id,
          previousStatus: AffiliateCommissionStatus.AVAILABLE,
          newStatus: AffiliateCommissionStatus.REVERSED,
          reversedAt: new Date(),
          reversalLedgerTransactionId: `LTX-REV-${id}`,
          amount: 25000,
        });
      }),
      blockDispute: jest.fn().mockImplementation((id) => {
        return Promise.resolve({ id, disputeBlocked: true });
      }),
      unblockDispute: jest.fn().mockImplementation((id) => {
        return Promise.resolve({ id, disputeBlocked: false });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AffiliateLifecycleService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AffiliateCommissionStateMachineService,
          useValue: mockStateMachine,
        },
      ],
    }).compile();

    service = module.get<AffiliateLifecycleService>(AffiliateLifecycleService);
    stateMachine = module.get<AffiliateCommissionStateMachineService>(
      AffiliateCommissionStateMachineService,
    );
  });

  describe('handleOrderDelivered (Decision 1)', () => {
    it('moves physical book commission to HOLDING with 7-day (168 hours) period', async () => {
      prisma.affiliateCommission.findMany.mockResolvedValue([
        {
          id: 'comm-phys-1',
          orderId: 'ord-1',
          bookFormat: 'PHYSICAL',
          status: AffiliateCommissionStatus.PENDING,
        },
      ]);

      const deliveryDate = new Date('2026-10-21T10:00:00Z');
      const results = await service.handleOrderDelivered('ord-1', undefined, deliveryDate);

      expect(results).toHaveLength(1);
      expect(stateMachine.transitionToHolding).toHaveBeenCalledWith(
        'comm-phys-1',
        168, // 7 days = 168 hours
        deliveryDate,
      );
    });

    it('moves digital book commission to HOLDING with 24-hour period', async () => {
      prisma.affiliateCommission.findMany.mockResolvedValue([
        {
          id: 'comm-dig-1',
          orderId: 'ord-1',
          bookFormat: 'DIGITAL',
          status: AffiliateCommissionStatus.PENDING,
        },
      ]);

      const deliveryDate = new Date('2026-10-21T10:00:00Z');
      const results = await service.handleOrderDelivered('ord-1', undefined, deliveryDate);

      expect(results).toHaveLength(1);
      expect(stateMachine.transitionToHolding).toHaveBeenCalledWith(
        'comm-dig-1',
        24, // 24 hours for digital
        deliveryDate,
      );
    });
  });

  describe('handleDigitalOrderPaid', () => {
    it('initiates 24-hour holding countdown immediately upon digital order payment', async () => {
      prisma.affiliateCommission.findMany.mockResolvedValue([
        {
          id: 'comm-ebook-1',
          orderId: 'ord-dig',
          bookFormat: 'EBOOK',
          status: AffiliateCommissionStatus.PENDING,
        },
      ]);

      const paymentDate = new Date('2026-10-21T12:00:00Z');
      const results = await service.handleDigitalOrderPaid('ord-dig', paymentDate);

      expect(results).toHaveLength(1);
      expect(stateMachine.transitionToHolding).toHaveBeenCalledWith(
        'comm-ebook-1',
        24,
        paymentDate,
      );
    });
  });

  describe('handleBuyerConfirmReceipt (Decision 2 - Buyer-Confirm Shortcut)', () => {
    it('shortens remaining holding duration to 24 hours when buyer confirms early', async () => {
      const now = new Date('2026-10-21T10:00:00Z');
      const sevenDaysLater = new Date(now.getTime() + 7 * 86400000);
      const target24hLater = new Date(now.getTime() + 24 * 3600 * 1000);

      prisma.affiliateCommission.findMany.mockResolvedValue([
        {
          id: 'comm-long-holding',
          orderId: 'ord-confirmed',
          status: AffiliateCommissionStatus.HOLDING,
          holdingUntil: sevenDaysLater,
        },
      ]);

      const updated = await service.handleBuyerConfirmReceipt('ord-confirmed', now);

      expect(updated).toHaveLength(1);
      expect(prisma.affiliateCommission.update).toHaveBeenCalledWith({
        where: { id: 'comm-long-holding' },
        data: expect.objectContaining({
          holdingUntil: target24hLater,
        }),
      });
    });

    it('does not extend holding if already expiring in less than 24 hours', async () => {
      const now = new Date('2026-10-21T10:00:00Z');
      const twelveHoursLater = new Date(now.getTime() + 12 * 3600 * 1000);

      prisma.affiliateCommission.findMany.mockResolvedValue([
        {
          id: 'comm-expiring-soon',
          orderId: 'ord-confirmed',
          status: AffiliateCommissionStatus.HOLDING,
          holdingUntil: twelveHoursLater,
        },
      ]);

      const updated = await service.handleBuyerConfirmReceipt('ord-confirmed', now);
      expect(updated).toHaveLength(0);
      expect(prisma.affiliateCommission.update).not.toHaveBeenCalled();
    });
  });

  describe('handleOrderCancelled (Decision 3)', () => {
    it('cancels all PENDING and HOLDING commissions when order is cancelled', async () => {
      prisma.affiliateCommission.findMany.mockResolvedValue([
        { id: 'comm-1', status: AffiliateCommissionStatus.PENDING },
        { id: 'comm-2', status: AffiliateCommissionStatus.HOLDING },
      ]);

      const cancelled = await service.handleOrderCancelled('ord-cancel', 'Buyer changed mind');

      expect(cancelled).toHaveLength(2);
      expect(stateMachine.cancelCommission).toHaveBeenCalledWith('comm-1', 'Buyer changed mind');
      expect(stateMachine.cancelCommission).toHaveBeenCalledWith('comm-2', 'Buyer changed mind');
    });
  });

  describe('handleOrderItemRefunded (Decision 4 - Line-Item Level Refund)', () => {
    it('cancels commission if line-item refunded while PENDING', async () => {
      prisma.affiliateCommission.findUnique.mockResolvedValue({
        id: 'comm-item-pend',
        orderItemId: 'oi-refund-1',
        status: AffiliateCommissionStatus.PENDING,
      });

      await service.handleOrderItemRefunded('oi-refund-1', 'Item out of stock');

      expect(stateMachine.cancelCommission).toHaveBeenCalledWith('comm-item-pend', 'Item out of stock');
      expect(stateMachine.reverseCommission).not.toHaveBeenCalled();
    });

    it('cancels commission if line-item refunded while in HOLDING', async () => {
      prisma.affiliateCommission.findUnique.mockResolvedValue({
        id: 'comm-item-hold',
        orderItemId: 'oi-refund-2',
        status: AffiliateCommissionStatus.HOLDING,
      });

      await service.handleOrderItemRefunded('oi-refund-2', 'Damaged in transit');

      expect(stateMachine.cancelCommission).toHaveBeenCalledWith('comm-item-hold', 'Damaged in transit');
      expect(stateMachine.reverseCommission).not.toHaveBeenCalled();
    });

    it('reverses commission (posts reversal ledger & debits wallet) if line-item refunded after AVAILABLE', async () => {
      prisma.affiliateCommission.findUnique.mockResolvedValue({
        id: 'comm-item-avail',
        orderItemId: 'oi-refund-3',
        status: AffiliateCommissionStatus.AVAILABLE,
      });

      await service.handleOrderItemRefunded('oi-refund-3', 'Late defect warranty return');

      expect(stateMachine.reverseCommission).toHaveBeenCalledWith(
        'comm-item-avail',
        'Late defect warranty return',
      );
      expect(stateMachine.cancelCommission).not.toHaveBeenCalled();
    });
  });

  describe('Dispute Gating (handleDisputeOpened & handleDisputeDismissed)', () => {
    it('blocks commissions from settlement when dispute is opened', async () => {
      prisma.affiliateCommission.findMany.mockResolvedValue([
        { id: 'comm-dispute-1' },
        { id: 'comm-dispute-2' },
      ]);

      await service.handleDisputeOpened('ord-dispute');

      expect(stateMachine.blockDispute).toHaveBeenCalledWith('comm-dispute-1');
      expect(stateMachine.blockDispute).toHaveBeenCalledWith('comm-dispute-2');
    });

    it('unblocks commissions when dispute is dismissed', async () => {
      prisma.affiliateCommission.findMany.mockResolvedValue([
        { id: 'comm-dispute-1', disputeBlocked: true },
      ]);

      await service.handleDisputeDismissed('ord-dispute');

      expect(stateMachine.unblockDispute).toHaveBeenCalledWith('comm-dispute-1');
    });
  });

  describe('processMaturedHoldings (Settlement Worker)', () => {
    it('settles only eligible matured holdings and publishes outbox events', async () => {
      const now = new Date('2026-10-21T15:00:00Z');
      prisma.affiliateCommission.findMany.mockResolvedValue([
        {
          id: 'comm-matured-1',
          profileId: 'prof-1',
          orderId: 'ord-1',
          orderItemId: 'oi-1',
          status: AffiliateCommissionStatus.HOLDING,
          disputeBlocked: false,
          holdingUntil: new Date('2026-10-21T14:00:00Z'),
        },
      ]);

      const result = await service.processMaturedHoldings(50, now);

      expect(result.processedCount).toBe(1);
      expect(result.settledCommissions).toHaveLength(1);
      expect(stateMachine.settleCommission).toHaveBeenCalledWith('comm-matured-1', now);
      expect(prisma.outboxEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'AFFILIATE_COMMISSION_AVAILABLE',
            aggregateId: 'comm-matured-1',
          }),
        }),
      );
    });
  });
});
