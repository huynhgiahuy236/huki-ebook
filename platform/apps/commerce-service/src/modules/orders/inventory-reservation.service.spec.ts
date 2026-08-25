import { ConflictException } from '@nestjs/common';
import { InventoryReservationService } from './inventory-reservation.service';

describe('InventoryReservationService (Prisma)', () => {
  const service = new InventoryReservationService({} as any);
  function transaction(details: any) {
    return { physicalBookDetails: { findUnique: jest.fn().mockResolvedValue(details), update: jest.fn() }, inventoryReservation: { create: jest.fn(), findMany: jest.fn(), update: jest.fn() } };
  }
  it('reserves physical stock through a transaction client', async () => {
    const tx = transaction({ stock: 5, reserved: 1, physicalEnabled: true });
    await service.reserve(tx as any, 'order-id', [{ id: 'item-id', bookId: 'book-id', quantity: 2, format: 'PHYSICAL' }]);
    expect(tx.physicalBookDetails.update).toHaveBeenCalledWith(expect.objectContaining({ data: { reserved: { increment: 2 } } }));
    expect(tx.inventoryReservation.create).toHaveBeenCalled();
  });
  it('rejects an insufficient physical stock reservation', async () => {
    const tx = transaction({ stock: 5, reserved: 4, physicalEnabled: true });
    await expect(service.reserve(tx as any, 'order-id', [{ id: 'item-id', bookId: 'book-id', quantity: 2, format: 'PHYSICAL' }])).rejects.toBeInstanceOf(ConflictException);
  });
});
