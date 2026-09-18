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

  async release(
    tx: Prisma.TransactionClient,
    orderId: string,
    itemIds?: string[],
    options?: { reason?: string; initiator?: string },
  ): Promise<{ releasedCount: number; totalQuantity: number }> {
    const where: any = { orderId, status: 'ACTIVE' };
    if (itemIds && itemIds.length > 0) {
      where.orderItemId = { in: itemIds };
    }

    const reservations = await tx.inventoryReservation.findMany({ where });
    let totalQuantity = 0;

    for (const reservation of reservations.sort((a, b) => a.bookId.localeCompare(b.bookId))) {
      totalQuantity += reservation.quantity;
      const details = await tx.physicalBookDetails.findUnique({
        where: { bookId: reservation.bookId },
      });

      if (details) {
        // Safe non-negative reserved update (POL-05 INV-001)
        const newReserved = Math.max(0, details.reserved - reservation.quantity);
        await tx.physicalBookDetails.update({
          where: { bookId: reservation.bookId },
          data: { reserved: newReserved },
        });

        // Layer 1: Restore Redis atomic counter
        await this.redisService.releaseStockAtomic(reservation.bookId, reservation.quantity);

        // Audit trail in inventory_logs
        const logNote = options?.initiator
          ? `Giải phóng ${reservation.quantity} cuốn từ đơn hàng ${orderId} (Bởi: ${options.initiator})`
          : `Giải phóng ${reservation.quantity} cuốn từ đơn hàng ${orderId}`;

        await tx.inventoryLog.create({
          data: {
            bookId: details.id,
            change: reservation.quantity,
            balance: details.stock,
            reason: options?.reason || 'RELEASE',
            orderId,
            note: logNote,
          },
        });
      }

      // Update reservation status
      await tx.inventoryReservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
    }

    return { releasedCount: reservations.length, totalQuantity };
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

  /**
   * Verify whether all inventory reservations for an order/items have been released (Task 61 Deliverables)
   */
  async verifyOrderRelease(
    orderId: string,
    itemIds?: string[],
  ): Promise<{
    verified: boolean;
    hasActiveReservations: boolean;
    totalReservations: number;
    activeCount: number;
    releasedCount: number;
    committedCount: number;
  }> {
    const where: any = { orderId };
    if (itemIds && itemIds.length > 0) {
      where.orderItemId = { in: itemIds };
    }

    const reservations = await this.prisma.inventoryReservation.findMany({ where });
    const activeCount = reservations.filter((r) => r.status === 'ACTIVE').length;
    const releasedCount = reservations.filter((r) => r.status === 'RELEASED').length;
    const committedCount = reservations.filter((r) => r.status === 'COMMITTED').length;

    return {
      verified: activeCount === 0,
      hasActiveReservations: activeCount > 0,
      totalReservations: reservations.length,
      activeCount,
      releasedCount,
      committedCount,
    };
  }

  /**
   * Reconciliation job: compare active reservation sum vs physicalBookDetails.reserved (Task 61 Consistency Check)
   */
  async reconcileBookStock(bookId: string): Promise<{
    bookId: string;
    stock: number;
    actualReserved: number;
    previousReserved: number;
    available: number;
    discrepancy: boolean;
  }> {
    const details = await this.prisma.physicalBookDetails.findUnique({
      where: { bookId },
    });

    if (!details) {
      throw new ConflictException(`Book ${bookId} physical details not found`);
    }

    const activeAgg = await this.prisma.inventoryReservation.aggregate({
      where: { bookId, status: 'ACTIVE' },
      _sum: { quantity: true },
    });

    const actualReserved = activeAgg._sum.quantity || 0;
    const previousReserved = details.reserved;
    const discrepancy = actualReserved !== previousReserved;

    if (discrepancy) {
      this.logger.warn(
        `[INVENTORY RECONCILIATION] Discrepancy detected for book ${bookId}: DB reserved=${previousReserved}, actual active reservations=${actualReserved}. Auto-healing...`,
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.physicalBookDetails.update({
          where: { bookId },
          data: { reserved: actualReserved },
        });

        await tx.inventoryLog.create({
          data: {
            bookId: details.id,
            change: previousReserved - actualReserved,
            balance: details.stock,
            reason: 'RECONCILIATION',
            note: `Tự động đối soát tồn kho: điều chỉnh reserved từ ${previousReserved} thành ${actualReserved}`,
          },
        });
      });
    }

    const available = Math.max(0, details.stock - actualReserved);
    await this.redisService.syncStock(bookId, available);

    return {
      bookId,
      stock: details.stock,
      actualReserved,
      previousReserved,
      available,
      discrepancy,
    };
  }
}

