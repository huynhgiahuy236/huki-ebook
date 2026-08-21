import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
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
  ) {}

  async get(bookId: string, actor: BookActor) {
    await this.booksService.findForWrite(bookId, actor);
    const details = await this.prisma.physicalBookDetails.findUnique({ where: { bookId } });
    if (!details) throw new NotFoundException('Physical book details not found');
    return details;
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

      // Create inventory log
      await tx.inventoryLog.create({
        data: {
          bookId,
          change: dto.operation === InventoryOperation.ADD ? dto.quantity : -dto.quantity,
          balance: stockAfter,
          reason: dto.reason ?? '',
          orderId: dto.orderId ?? null,
        },
      });

      return { details: updated, available: stockAfter - details.reserved };
    });

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
