import { ConflictException } from '@nestjs/common';
import { InventoryReservationService } from './inventory-reservation.service';

describe('InventoryReservationService (Prisma)', () => {
  const redis = {
    reserveStockAtomic: jest.fn().mockResolvedValue(1),
    releaseStockAtomic: jest.fn().mockResolvedValue(1),
    syncStock: jest.fn().mockResolvedValue(undefined),
  };
  const prismaMock = {
    inventoryReservation: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    physicalBookDetails: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inventoryLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => cb(prismaMock)),
  };

  const service = new InventoryReservationService(prismaMock as any, redis as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function transaction(details: any, reservations: any[] = []) {
    return {
      physicalBookDetails: {
        findUnique: jest.fn().mockResolvedValue(details),
        update: jest.fn().mockResolvedValue(details),
      },
      inventoryReservation: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue(reservations),
        update: jest.fn(),
      },
      inventoryLog: { create: jest.fn() },
    };
  }

  it('reserves physical stock through a transaction client', async () => {
    const tx = transaction({ id: 'phys-id', stock: 5, reserved: 1, physicalEnabled: true });
    await service.reserve(tx as any, 'order-id', [
      { id: 'item-id', bookId: 'book-id', quantity: 2, format: 'PHYSICAL' },
    ]);
    expect(tx.physicalBookDetails.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { reserved: { increment: 2 } } }),
    );
    expect(tx.inventoryReservation.create).toHaveBeenCalled();
    expect(tx.inventoryLog.create).toHaveBeenCalled();
  });

  it('rejects an insufficient physical stock reservation', async () => {
    const tx = transaction({ id: 'phys-id', stock: 5, reserved: 4, physicalEnabled: true });
    await expect(
      service.reserve(tx as any, 'order-id', [
        { id: 'item-id', bookId: 'book-id', quantity: 2, format: 'PHYSICAL' },
      ]),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  describe('Task 61: Inventory Release Verification', () => {
    it('releases active reservations and restores Redis counter and PostgreSQL reserved stock', async () => {
      const tx = transaction(
        { id: 'phys-id', stock: 10, reserved: 3, physicalEnabled: true },
        [
          {
            id: 'res-1',
            orderId: 'order-1',
            orderItemId: 'item-1',
            bookId: 'book-1',
            quantity: 2,
            status: 'ACTIVE',
          },
        ],
      );

      const result = await service.release(tx as any, 'order-1', ['item-1'], {
        reason: 'ORDER_CANCELLED',
        initiator: 'BUYER',
      });

      expect(result.releasedCount).toBe(1);
      expect(result.totalQuantity).toBe(2);
      expect(tx.physicalBookDetails.update).toHaveBeenCalledWith({
        where: { bookId: 'book-1' },
        data: { reserved: 1 }, // 3 - 2 = 1 (never negative)
      });
      expect(redis.releaseStockAtomic).toHaveBeenCalledWith('book-1', 2);
      expect(tx.inventoryReservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'res-1' },
          data: expect.objectContaining({ status: 'RELEASED' }),
        }),
      );
      expect(tx.inventoryLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookId: 'phys-id',
            change: 2,
            reason: 'ORDER_CANCELLED',
          }),
        }),
      );
    });

    it('ensures reserved count never becomes negative upon release', async () => {
      const tx = transaction(
        { id: 'phys-id', stock: 10, reserved: 1, physicalEnabled: true },
        [
          {
            id: 'res-1',
            orderId: 'order-1',
            orderItemId: 'item-1',
            bookId: 'book-1',
            quantity: 5,
            status: 'ACTIVE',
          },
        ],
      );

      await service.release(tx as any, 'order-1');

      expect(tx.physicalBookDetails.update).toHaveBeenCalledWith({
        where: { bookId: 'book-1' },
        data: { reserved: 0 }, // Math.max(0, 1 - 5) = 0
      });
    });

    it('is idempotent: duplicate release on already RELEASED reservations does nothing', async () => {
      const tx = transaction(
        { id: 'phys-id', stock: 10, reserved: 1, physicalEnabled: true },
        [], // No ACTIVE reservations found
      );

      const result = await service.release(tx as any, 'order-1');

      expect(result.releasedCount).toBe(0);
      expect(result.totalQuantity).toBe(0);
      expect(tx.physicalBookDetails.update).not.toHaveBeenCalled();
      expect(redis.releaseStockAtomic).not.toHaveBeenCalled();
    });

    it('verifyOrderRelease returns verified=true when all reservations are released', async () => {
      prismaMock.inventoryReservation.findMany.mockResolvedValueOnce([
        { id: 'res-1', status: 'RELEASED' },
        { id: 'res-2', status: 'RELEASED' },
      ]);

      const verification = await service.verifyOrderRelease('order-1');
      expect(verification.verified).toBe(true);
      expect(verification.hasActiveReservations).toBe(false);
      expect(verification.activeCount).toBe(0);
      expect(verification.releasedCount).toBe(2);
    });

    it('verifyOrderRelease returns verified=false when active reservations remain', async () => {
      prismaMock.inventoryReservation.findMany.mockResolvedValueOnce([
        { id: 'res-1', status: 'ACTIVE' },
        { id: 'res-2', status: 'RELEASED' },
      ]);

      const verification = await service.verifyOrderRelease('order-1');
      expect(verification.verified).toBe(false);
      expect(verification.hasActiveReservations).toBe(true);
      expect(verification.activeCount).toBe(1);
      expect(verification.releasedCount).toBe(1);
    });

    it('reconcileBookStock detects and auto-heals discrepancy between DB reserved and active reservations', async () => {
      prismaMock.physicalBookDetails.findUnique.mockResolvedValueOnce({
        id: 'phys-id',
        bookId: 'book-1',
        stock: 50,
        reserved: 10, // Stale reserved in DB
      });

      prismaMock.inventoryReservation.aggregate.mockResolvedValueOnce({
        _sum: { quantity: 4 }, // Actual active reservations sum = 4
      });

      const reconciliation = await service.reconcileBookStock('book-1');

      expect(reconciliation.discrepancy).toBe(true);
      expect(reconciliation.previousReserved).toBe(10);
      expect(reconciliation.actualReserved).toBe(4);
      expect(reconciliation.available).toBe(46); // 50 - 4 = 46

      expect(prismaMock.physicalBookDetails.update).toHaveBeenCalledWith({
        where: { bookId: 'book-1' },
        data: { reserved: 4 },
      });
      expect(redis.syncStock).toHaveBeenCalledWith('book-1', 46);
    });
  });
});


