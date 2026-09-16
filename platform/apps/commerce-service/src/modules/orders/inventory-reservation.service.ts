import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Prisma, CartItemFormat } from '../../../prisma/generated/client';

@Injectable()
export class InventoryReservationService {
  private readonly logger = new Logger(InventoryReservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

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

      // Layer 1: Atomic Redis check & reserve
      let redisResult = await this.redisService.reserveStockAtomic(item.bookId, item.quantity);
      if (redisResult === -1) {
        // Key was missing in Redis -> initialize cache from DB and retry
        await this.redisService.syncStock(item.bookId, available);
        redisResult = await this.redisService.reserveStockAtomic(item.bookId, item.quantity);
      }

      if (redisResult === 0) {
        throw new ConflictException(`Sách đã hết hàng hoặc không đủ số lượng (Book ${item.bookId})`);
      }

      // Layer 2: PostgreSQL reservation update
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

      // Audit trail in inventory_logs
      await tx.inventoryLog.create({
        data: {
          bookId: details.id,
          change: -item.quantity,
          balance: details.stock,
          reason: 'RESERVE',
          orderId,
          note: `Khóa tạm giữ ${item.quantity} cuốn cho đơn hàng ${orderId}`,
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
      const details = await tx.physicalBookDetails.findUnique({
        where: { bookId: reservation.bookId },
      });

      if (details) {
        // Update reserved count
        await tx.physicalBookDetails.update({
          where: { bookId: reservation.bookId },
          data: { reserved: { decrement: reservation.quantity } },
        });

        // Layer 1: Restore Redis atomic counter
        await this.redisService.releaseStockAtomic(reservation.bookId, reservation.quantity);

        // Audit trail in inventory_logs
        await tx.inventoryLog.create({
          data: {
            bookId: details.id,
            change: reservation.quantity,
            balance: details.stock,
            reason: 'RELEASE',
            orderId,
            note: `Giải phóng ${reservation.quantity} cuốn từ đơn hàng ${orderId}`,
          },
        });
      }

      // Update reservation status
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
    }
  }

  async commit(tx: Prisma.TransactionClient, orderId: string, itemIds?: string[]): Promise<void> {
    const where: any = {
      orderId,
      status: { in: ['ACTIVE', 'RELEASED'] },
    };
    if (itemIds && itemIds.length > 0) {
      where.orderItemId = { in: itemIds };
    }

    const reservations = await tx.inventoryReservation.findMany({ where });

    for (const reservation of reservations.sort((a, b) => a.bookId.localeCompare(b.bookId))) {
      const details = await tx.physicalBookDetails.findUnique({
        where: { bookId: reservation.bookId },
      });

      if (!details) continue;

      const wasActive = reservation.status === 'ACTIVE';
      const reservedDec = wasActive
        ? Math.min(details.reserved, reservation.quantity)
        : 0;

      // Decrease physical stock and reserved lock
      const updated = await tx.physicalBookDetails.update({
        where: { bookId: reservation.bookId },
        data: {
          stock: { decrement: reservation.quantity },
          ...(reservedDec > 0 && { reserved: { decrement: reservedDec } }),
        },
      });

      // Synchronize available stock to Redis
      const available = Math.max(0, updated.stock - updated.reserved);
      await this.redisService.syncStock(reservation.bookId, available);

      // Update reservation status
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'COMMITTED', committedAt: new Date() },
      });

      // Audit trail in inventory_logs
      await tx.inventoryLog.create({
        data: {
          bookId: details.id,
          change: -reservation.quantity,
          balance: updated.stock,
          reason: 'SALE_DEDUCT',
          orderId,
          note: `Trừ kho thực tế khi đơn hàng ${orderId} thanh toán thành công`,
        },
      });
    }
  }
}

