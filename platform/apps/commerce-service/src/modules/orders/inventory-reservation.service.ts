import { ConflictException, Injectable } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { InventoryReservation, OrderItem, PhysicalBookDetails, ReservationStatus } from '../../entities';

@Injectable()
export class InventoryReservationService {
  async reserve(manager: EntityManager, orderId: string, items: OrderItem[]): Promise<void> {
    const physical = items.filter((item) => item.format === 'PHYSICAL').sort((a, b) => a.bookId.localeCompare(b.bookId));
    for (const item of physical) {
      const details = await manager.getRepository(PhysicalBookDetails).findOne({
        where: { bookId: item.bookId }, lock: { mode: 'pessimistic_write' },
      });
      if (!details || !details.physicalEnabled || details.stock - details.reserved < item.quantity) {
        throw new ConflictException(`Insufficient stock for book ${item.bookId}`);
      }
      details.reserved += item.quantity;
      await manager.save(details);
      await manager.save(manager.create(InventoryReservation, {
        orderId, orderItemId: item.id, bookId: item.bookId, quantity: item.quantity,
        status: ReservationStatus.ACTIVE, expiresAt: null, committedAt: null, releasedAt: null,
      }));
    }
  }

  async release(manager: EntityManager, orderId: string, itemIds?: string[]): Promise<void> {
    const where = itemIds ? { orderId, orderItemId: In(itemIds), status: ReservationStatus.ACTIVE } : { orderId, status: ReservationStatus.ACTIVE };
    const reservations = await manager.getRepository(InventoryReservation).find({ where, lock: { mode: 'pessimistic_write' } });
    for (const reservation of reservations.sort((a, b) => a.bookId.localeCompare(b.bookId))) {
      const details = await manager.getRepository(PhysicalBookDetails).findOneOrFail({ where: { bookId: reservation.bookId }, lock: { mode: 'pessimistic_write' } });
      details.reserved = Math.max(0, details.reserved - reservation.quantity);
      reservation.status = ReservationStatus.RELEASED;
      reservation.releasedAt = new Date();
      await manager.save([details, reservation]);
    }
  }

  async commit(manager: EntityManager, orderId: string, itemIds: string[]): Promise<void> {
    const reservations = await manager.getRepository(InventoryReservation).find({
      where: { orderId, orderItemId: In(itemIds), status: ReservationStatus.ACTIVE }, lock: { mode: 'pessimistic_write' },
    });
    for (const reservation of reservations.sort((a, b) => a.bookId.localeCompare(b.bookId))) {
      const details = await manager.getRepository(PhysicalBookDetails).findOneOrFail({ where: { bookId: reservation.bookId }, lock: { mode: 'pessimistic_write' } });
      if (details.stock < reservation.quantity || details.reserved < reservation.quantity) throw new ConflictException('Reserved stock is inconsistent');
      details.stock -= reservation.quantity;
      details.reserved -= reservation.quantity;
      reservation.status = ReservationStatus.COMMITTED;
      reservation.committedAt = new Date();
      await manager.save([details, reservation]);
    }
  }
}
