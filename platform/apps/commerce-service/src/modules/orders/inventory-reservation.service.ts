import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CartItemFormat } from '@prisma/client';

@Injectable()
export class InventoryReservationService {
  constructor(private readonly prisma: PrismaService) {}

  async reserve(tx: Prisma.TransactionClient, orderId: string, items: any[]): Promise<void> {
    const physical = items
      .filter((item) => item.format === CartItemFormat.PHYSICAL)
      .sort((a, b) => a.bookId.localeCompare(b.bookId));

    for (const item of physical) {
      const details = await tx.physicalBookDetails.findUnique({
        where: { bookId: item.bookId },
      });

      if (!details || !details.physicalEnabled) {
        throw new ConflictException(`Book ${item.bookId} physical edition is unavailable`);
      }

      const available = details.stock - details.reserved;
      if (available < item.quantity) {
        throw new ConflictException(`Insufficient stock for book ${item.bookId}`);
      }

      // Update reserved
      await tx.physicalBookDetails.update({
        where: { bookId: item.bookId },
        data: { reserved: { increment: item.quantity } },
      });

      // Create reservation record
      await tx.inventoryReservation.create({
        data: {
          orderId,
          orderItemId: item.id,
          bookId: item.bookId,
          quantity: item.quantity,
          status: 'ACTIVE',
        },
      });
    }
  }

  async release(tx: Prisma.TransactionClient, orderId: string, itemIds?: string[]): Promise<void> {
    const where: any = { orderId, status: 'ACTIVE' };
    if (itemIds) {
      where.orderItemId = { in: itemIds };
    }

    const reservations = await tx.inventoryReservation.findMany({ where });

    for (const reservation of reservations.sort((a, b) => a.bookId.localeCompare(b.bookId))) {
      // Update reserved count
      await tx.physicalBookDetails.update({
        where: { bookId: reservation.bookId },
        data: { reserved: { decrement: reservation.quantity } },
      });

      // Update reservation status
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
    }
  }

  async commit(tx: Prisma.TransactionClient, orderId: string, itemIds: string[]): Promise<void> {
    const reservations = await tx.inventoryReservation.findMany({
      where: {
        orderId,
        orderItemId: { in: itemIds },
        status: 'ACTIVE',
      },
    });

    for (const reservation of reservations.sort((a, b) => a.bookId.localeCompare(b.bookId))) {
      const details = await tx.physicalBookDetails.findUnique({
        where: { bookId: reservation.bookId },
      });

      if (!details || details.stock < reservation.quantity || details.reserved < reservation.quantity) {
        throw new ConflictException('Reserved stock is inconsistent');
      }

      // Decrease both stock and reserved
      await tx.physicalBookDetails.update({
        where: { bookId: reservation.bookId },
        data: {
          stock: { decrement: reservation.quantity },
          reserved: { decrement: reservation.quantity },
        },
      });

      // Update reservation status
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'COMMITTED', committedAt: new Date() },
      });
    }
  }
}
