import { ConflictException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CartItemFormat, OrderItem, PhysicalBookDetails } from '../../entities';
import { InventoryReservationService } from './inventory-reservation.service';

describe('InventoryReservationService', () => {
  const service = new InventoryReservationService();

  function managerWith(details: Partial<PhysicalBookDetails>) {
    const physical = { findOne: jest.fn().mockResolvedValue(details) };
    const reservation = { create: jest.fn((value) => value) };
    return {
      getRepository: jest.fn((entity) => entity === PhysicalBookDetails ? physical : reservation),
      save: jest.fn(async (value) => value),
      create: jest.fn((_entity, value) => value),
    } as unknown as EntityManager;
  }

  it('locks and increments reserved stock', async () => {
    const details = { stock: 5, reserved: 1, physicalEnabled: true };
    const manager = managerWith(details);
    await service.reserve(manager, 'order-id', [{ id: 'item-id', bookId: 'book-id', quantity: 2, format: CartItemFormat.PHYSICAL } as OrderItem]);
    expect(details.reserved).toBe(3);
    expect(manager.getRepository(PhysicalBookDetails).findOne).toHaveBeenCalledWith(expect.objectContaining({ lock: { mode: 'pessimistic_write' } }));
  });

  it('rejects checkout when available stock is insufficient', async () => {
    const manager = managerWith({ stock: 5, reserved: 4, physicalEnabled: true });
    await expect(service.reserve(manager, 'order-id', [{ id: 'item-id', bookId: 'book-id', quantity: 2, format: CartItemFormat.PHYSICAL } as OrderItem])).rejects.toBeInstanceOf(ConflictException);
  });
});

