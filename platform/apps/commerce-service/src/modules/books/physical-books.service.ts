import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BookActor } from '../../common/book-auth.guard';
import { BooksService } from './books.service';
import { UpdateInventoryDto, InventoryOperation } from './dto/update-inventory.dto';
import { UpdatePhysicalDetailsDto } from './dto/update-physical-details.dto';
import { BookFormat, BookStatus } from '../../../prisma/generated/client';

export interface StockLowEvent {
  bookId: string;
  storeId: string;
  title: string;
  available: number;
  threshold: number;
}

@Injectable()
export class PhysicalBooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly booksService: BooksService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
  ) {}

  async get(bookId: string, actor: BookActor) {
    await this.booksService.findForWrite(bookId, actor);
    const details = await this.prisma.physicalBookDetails.findUnique({ where: { bookId } });
    if (!details) throw new NotFoundException('Physical book details not found');
    const available = Math.max(0, details.stock - details.reserved);
    return { ...details, available };
  }

  async update(bookId: string, dto: UpdatePhysicalDetailsDto, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    this.assertPhysicalFormat(book);

    if (book.status === BookStatus.PUBLISHED) {
      throw new ConflictException('Hide the book before changing physical settings');
    }

    const details = await this.prisma.physicalBookDetails.findUnique({ where: { bookId } });
    if (!details) throw new NotFoundException('Physical book details not found');

    return this.prisma.physicalBookDetails.update({
      where: { bookId },
      data: {
        weight: dto.weight ?? details.weight,
        physicalEnabled: dto.physicalEnabled ?? details.physicalEnabled,
      },
    });
  }

  async updateInventory(bookId: string, dto: UpdateInventoryDto, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    this.assertPhysicalFormat(book);

    if (dto.operation !== InventoryOperation.SET && dto.quantity === 0) {
      throw new ConflictException('ADD and SUBTRACT quantity must be greater than zero');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const details = await tx.physicalBookDetails.findUnique({ where: { bookId } });
      if (!details) throw new NotFoundException('Physical book details not found');

      const stockBefore = details.stock;
      const stockAfter = this.calculateStock(stockBefore, dto);

      if (stockAfter < details.reserved) {
        throw new ConflictException('Stock cannot be lower than reserved quantity');
      }

      // Update stock
      const updated = await tx.physicalBookDetails.update({
        where: { bookId },
        data: { stock: stockAfter },
      });

      const changeQty =
        dto.operation === InventoryOperation.SET
          ? stockAfter - stockBefore
          : dto.operation === InventoryOperation.ADD
            ? dto.quantity
            : -dto.quantity;

      // Create inventory log
      await tx.inventoryLog.create({
        data: {
          bookId: details.id,
          change: changeQty,
          balance: stockAfter,
          reason: dto.reason ?? 'MANUAL_ADJUSTMENT',
          note: dto.note ?? null,
          orderId: dto.orderId ?? null,
        },
      });

      const available = stockAfter - details.reserved;
      return { details: updated, available };
    });

    // Synchronize available stock to Redis atomic counter
    await this.redisService.syncStock(bookId, result.available);

    if (result.available <= (result.details as any).lowStockThreshold) {
      this.eventEmitter.emit('stock.low', {
        bookId,
        storeId: book.storeId,
        title: book.title,
        available: result.available,
        threshold: (result.details as any).lowStockThreshold,
      } as StockLowEvent);
    }

    return { ...result.details, available: result.available };
  }

  async getInventoryLogs(bookId: string, actor: BookActor, query?: { page?: number; limit?: number }) {
    await this.booksService.findForWrite(bookId, actor);
    const details = await this.prisma.physicalBookDetails.findUnique({ where: { bookId } });
    if (!details) throw new NotFoundException('Physical book details not found');

    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
    const skip = (page - 1) * limit;

    const logWhere = {
      OR: [{ bookId: details.id }, { bookId: bookId }],
    };

    const [total, logs] = await Promise.all([
      this.prisma.inventoryLog.count({ where: logWhere }),
      this.prisma.inventoryLog.findMany({
        where: logWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }


  private calculateStock(current: number, dto: UpdateInventoryDto): number {
    const value =
      dto.operation === InventoryOperation.SET
        ? dto.quantity
        : dto.operation === InventoryOperation.ADD
          ? current + dto.quantity
          : current - dto.quantity;
    if (value < 0) throw new ConflictException('Stock cannot be negative');
    return value;
  }

  private assertPhysicalFormat(book: any) {
    if (!(new Set<BookFormat>([BookFormat.PHYSICAL, BookFormat.BOTH])).has(book.format)) {
      throw new ConflictException('Book does not support physical format');
    }
  }
}

