import { ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import {
  BookFormat,
  InventoryLog,
  InventoryOperation,
  InventoryReason,
  PhysicalBookDetails,
} from '../../entities';
import { BooksService } from './books.service';
import { PhysicalBooksService } from './physical-books.service';

describe('PhysicalBooksService inventory', () => {
  const book = {
    id: 'book-id',
    storeId: 'store-id',
    ownerUserId: 'owner-id',
    title: 'Book',
    format: BookFormat.PHYSICAL,
  };
  const booksService = { findForWrite: jest.fn().mockResolvedValue(book) } as unknown as BooksService;
  const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
  const detailsRepository = {
    findOne: jest.fn(),
    save: jest.fn(async (value: PhysicalBookDetails) => value),
  };
  const logRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
  };
  const manager = {
    getRepository: jest.fn((entity) =>
      entity === PhysicalBookDetails ? detailsRepository : logRepository,
    ),
  };
  const physicalRepository = {
    manager: { transaction: jest.fn(async (callback) => callback(manager)) },
  } as unknown as Repository<PhysicalBookDetails>;
  const service = new PhysicalBooksService(physicalRepository, booksService, eventEmitter);
  const actor = { sub: 'owner-id', role: 'BUSINESS' };

  beforeEach(() => jest.clearAllMocks());

  it('uses a transaction, writes an audit log and emits low stock', async () => {
    detailsRepository.findOne.mockResolvedValue({
      bookId: 'book-id',
      stock: 5,
      reserved: 2,
      lowStockThreshold: 10,
    });

    const result = await service.updateInventory(
      'book-id',
      { operation: InventoryOperation.ADD, quantity: 2, reason: InventoryReason.RESTOCK },
      actor,
    );

    expect(result).toMatchObject({ stock: 7, available: 5 });
    expect(manager.getRepository).toHaveBeenCalledWith(InventoryLog);
    expect(logRepository.save).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith('stock.low', expect.any(Object));
  });

  it('rejects stock below the reserved quantity', async () => {
    detailsRepository.findOne.mockResolvedValue({
      bookId: 'book-id',
      stock: 5,
      reserved: 4,
      lowStockThreshold: 1,
    });
    await expect(
      service.updateInventory(
        'book-id',
        { operation: InventoryOperation.SET, quantity: 3, reason: InventoryReason.ADJUSTMENT },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a subtraction that makes stock negative', async () => {
    detailsRepository.findOne.mockResolvedValue({
      bookId: 'book-id',
      stock: 1,
      reserved: 0,
      lowStockThreshold: 1,
    });
    await expect(
      service.updateInventory(
        'book-id',
        { operation: InventoryOperation.SUBTRACT, quantity: 2, reason: InventoryReason.SALE },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
