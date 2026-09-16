import { ConflictException } from '@nestjs/common';
import { InventoryReservationService } from './inventory-reservation.service';

describe('InventoryReservationService (Prisma)', () => {
  const redis = {
    reserveStockAtomic: jest.fn().mockResolvedValue(1),
    releaseStockAtomic: jest.fn().mockResolvedValue(1),
    syncStock: jest.fn().mockResolvedValue(undefined),
  };
  const service = new InventoryReservationService({} as any, redis as any);
  function transaction(details: any) {
    return {
      physicalBookDetails: { findUnique: jest.fn().mockResolvedValue(details), update: jest.fn() },
      inventoryReservation: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
      inventoryLog: { create: jest.fn() },
    };
  }
  it('reserves physical stock through a transaction client', async () => {
    const tx = transaction({ id: 'phys-id', stock: 5, reserved: 1, physicalEnabled: true });
    await service.reserve(tx as any, 'order-id', [{ id: 'item-id', bookId: 'book-id', quantity: 2, format: 'PHYSICAL' }]);
    expect(tx.physicalBookDetails.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reserved: { increment: 2 } } }));
    expect(tx.inventoryReservation.create).toHaveBeenCalled();
    expect(tx.inventoryLog.create).toHaveBeenCalled();
  });
  it('rejects an insufficient physical stock reservation', async () => {
    const tx = transaction({ id: 'phys-id', stock: 5, reserved: 4, physicalEnabled: true });
    await expect(service.reserve(tx as any, 'order-id', [{ id: 'item-id', bookId: 'book-id', quantity: 2, format: 'PHYSICAL' }])).rejects.toBeInstanceOf(ConflictException);
  });
});

