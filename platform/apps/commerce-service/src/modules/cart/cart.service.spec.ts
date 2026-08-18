import { BadRequestException, ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  Book,
  BookFormat,
  BookStatus,
  Cart,
  CartItem,
  CartItemFormat,
} from '../../entities';
import { CartService } from './cart.service';

describe('CartService', () => {
  const cart = { id: 'cart-id', userId: 'user-id', items: [], updatedAt: new Date() } as unknown as Cart;
  const book = {
    id: 'book-id',
    storeId: 'store-id',
    title: 'Book',
    slug: 'book',
    coverUrl: null,
    price: 100,
    status: BookStatus.PUBLISHED,
    format: BookFormat.BOTH,
    physicalDetails: { physicalEnabled: true, available: 2 },
    digitalDetails: { digitalEnabled: true },
  } as unknown as Book;
  const carts = {
    findOne: jest.fn().mockResolvedValue(cart),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => value),
  } as unknown as Repository<Cart>;
  const items = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => value),
  } as unknown as Repository<CartItem>;
  const books = { findOne: jest.fn().mockResolvedValue(book) } as unknown as Repository<Book>;
  const manager = {
    getRepository: jest.fn((entity) => entity === Cart ? carts : entity === CartItem ? items : books),
    save: jest.fn(async (value) => value),
  };
  const dataSource = { transaction: jest.fn((callback) => callback(manager)) } as unknown as DataSource;
  const service = new CartService(carts, items, books, dataSource);

  beforeEach(() => jest.clearAllMocks());

  it('adds a physical item when stock is available', async () => {
    (items.findOne as jest.Mock).mockResolvedValue(null);
    jest.spyOn(service, 'getCart').mockResolvedValue({} as never);
    await service.add('user-id', {
      bookId: 'book-id',
      format: CartItemFormat.PHYSICAL,
      quantity: 2,
    });
    expect(items.save).toHaveBeenCalledWith(expect.objectContaining({ quantity: 2 }));
  });

  it('rejects a physical quantity above available stock', async () => {
    await expect(
      service.add('user-id', {
        bookId: 'book-id',
        format: CartItemFormat.PHYSICAL,
        quantity: 3,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects digital quantity other than one', async () => {
    const validator = service as unknown as {
      validateAvailability(book: Book, format: CartItemFormat, quantity: number): void;
    };
    expect(() => validator.validateAvailability(book, CartItemFormat.DIGITAL, 2)).not.toThrow();
    const digitalItem = { id: 'item-id', format: CartItemFormat.DIGITAL, book } as CartItem;
    (items.findOne as jest.Mock).mockResolvedValue(digitalItem);
    await expect(service.update('user-id', 'item-id', 2)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
