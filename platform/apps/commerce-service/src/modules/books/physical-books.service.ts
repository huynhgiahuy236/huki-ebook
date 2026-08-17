import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookActor } from '../../common/book-auth.guard';
import {
  Book,
  BookFormat,
  BookStatus,
  InventoryLog,
  InventoryOperation,
  PhysicalBookDetails,
} from '../../entities';
import { BooksService } from './books.service';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { UpdatePhysicalDetailsDto } from './dto/update-physical-details.dto';

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
    @InjectRepository(PhysicalBookDetails)
    private readonly physicalRepository: Repository<PhysicalBookDetails>,
    private readonly booksService: BooksService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async get(bookId: string, actor: BookActor) {
    await this.booksService.findForWrite(bookId, actor);
    const details = await this.physicalRepository.findOne({ where: { bookId } });
    if (!details) throw new NotFoundException('Physical book details not found');
    return details;
  }

  async update(bookId: string, dto: UpdatePhysicalDetailsDto, actor: BookActor) {
    const book = await this.booksService.findForWrite(bookId, actor);
    this.assertPhysicalFormat(book);
    if (book.status === BookStatus.PUBLISHED) {
      throw new ConflictException('Hide the book before changing physical settings');
    }
    const details = await this.get(bookId, actor);
    Object.assign(details, dto);
    return this.physicalRepository.save(details);
  }

  async updateInventory(bookId: string, dto: UpdateInventoryDto, actor: BookActor) {
    const book = await this.booksService.findForWrite(bookId, actor);
    this.assertPhysicalFormat(book);
    if (dto.operation !== InventoryOperation.SET && dto.quantity === 0) {
      throw new ConflictException('ADD and SUBTRACT quantity must be greater than zero');
    }

    const result = await this.physicalRepository.manager.transaction(async (manager) => {
      const details = await manager.getRepository(PhysicalBookDetails).findOne({
        where: { bookId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!details) throw new NotFoundException('Physical book details not found');

      const stockBefore = details.stock;
      const stockAfter = this.calculateStock(stockBefore, dto);
      if (stockAfter < details.reserved) {
        throw new ConflictException('Stock cannot be lower than reserved quantity');
      }

      details.stock = stockAfter;
      await manager.getRepository(PhysicalBookDetails).save(details);
      await manager.getRepository(InventoryLog).save(
        manager.getRepository(InventoryLog).create({
          bookId,
          performedBy: actor.sub,
          operation: dto.operation,
          reason: dto.reason,
          quantity: dto.quantity,
          stockBefore,
          stockAfter,
        }),
      );
      return { details, available: stockAfter - details.reserved };
    });

    if (result.available <= result.details.lowStockThreshold) {
      this.eventEmitter.emit('stock.low', {
        bookId,
        storeId: book.storeId,
        title: book.title,
        available: result.available,
        threshold: result.details.lowStockThreshold,
      } satisfies StockLowEvent);
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

  private assertPhysicalFormat(book: Book) {
    if (![BookFormat.PHYSICAL, BookFormat.BOTH].includes(book.format)) {
      throw new ConflictException('Book does not support physical format');
    }
  }
}
