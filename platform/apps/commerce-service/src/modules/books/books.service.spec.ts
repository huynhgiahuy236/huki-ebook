import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  Author,
  Book,
  BookFormat,
  BookStatus,
  Category,
  Publisher,
} from '../../entities';
import { BooksService } from './books.service';

function bookFixture(overrides: Partial<Book> = {}): Book {
  return {
    id: 'book-id',
    storeId: '00000000-0000-0000-0000-000000000001',
    ownerUserId: 'owner-id',
    title: 'Book',
    normalizedTitle: 'book',
    slug: 'book',
    isbn: null,
    description: 'A valid book description',
    price: 100,
    categoryId: 'category-id',
    category: {} as Category,
    authorId: 'author-id',
    author: {} as Author,
    publisherId: 'publisher-id',
    publisher: {} as Publisher,
    format: BookFormat.PHYSICAL,
    coverUrl: null,
    coverPublicId: null,
    status: BookStatus.DRAFT,
    publishedAt: null,
    viewCount: 0,
    physicalDetails: null,
    digitalDetails: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

describe('BooksService CRUD rules', () => {
  const listBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    setParameters: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  };
  const bookRepository = {
    findOne: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(() => listBuilder),
  } as unknown as Repository<Book>;
  const service = new BooksService(
    bookRepository,
    {} as Repository<Category>,
    {} as Repository<Author>,
    {} as Repository<Publisher>,
  );
  const formatValidator = service as unknown as {
    validateFormatPayload(format: BookFormat, physical?: object, digital?: object): void;
  };

  beforeEach(() => jest.clearAllMocks());

  it.each([
    [BookFormat.PHYSICAL, {}, undefined],
    [BookFormat.DIGITAL, undefined, {}],
    [BookFormat.BOTH, {}, {}],
  ])('accepts the required %s details', (format, physical, digital) => {
    expect(() => formatValidator.validateFormatPayload(format, physical, digital)).not.toThrow();
  });

  it('rejects BOTH without digital details', () => {
    expect(() => formatValidator.validateFormatPayload(BookFormat.BOTH, {}, undefined)).toThrow(
      ConflictException,
    );
  });

  it('allows only the owner to access a draft', async () => {
    (bookRepository.findOne as jest.Mock).mockResolvedValue(bookFixture());
    await expect(
      service.findOne('book-id', { sub: 'other-id', role: 'BUSINESS' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.findOne('book-id', { sub: 'owner-id', role: 'BUSINESS' }),
    ).resolves.toMatchObject({ id: 'book-id' });
  });

  it('blocks another business from writing the book', async () => {
    (bookRepository.findOne as jest.Mock).mockResolvedValue(bookFixture());
    await expect(
      service.findForWrite('book-id', { sub: 'other-id', role: 'BUSINESS' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an inverted price range', async () => {
    await expect(
      service.findAll({ page: 1, limit: 20, minPrice: 200, maxPrice: 100 } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists only published books with pagination and format filters', async () => {
    const result = await service.findAll({
      page: 2,
      limit: 10,
      format: BookFormat.PHYSICAL,
      sortBy: 'createdAt',
      order: 'DESC',
    } as never);
    expect(listBuilder.where).toHaveBeenCalledWith('book.status = :status', {
      status: BookStatus.PUBLISHED,
    });
    expect(listBuilder.andWhere).toHaveBeenCalledWith('book.format IN (:...formats)', {
      formats: [BookFormat.PHYSICAL, BookFormat.BOTH],
    });
    expect(listBuilder.skip).toHaveBeenCalledWith(10);
    expect(result.pagination).toMatchObject({ page: 2, limit: 10, total: 0 });
  });

  it('normalizes Vietnamese search and adds PostgreSQL ranking', async () => {
    await service.findAll({
      page: 1,
      limit: 20,
      search: 'Nguyễn Nhật',
      sortBy: 'createdAt',
      order: 'DESC',
    } as never);
    expect(listBuilder.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('websearch_to_tsquery'),
      expect.objectContaining({ search: 'nguyen nhat', searchPrefix: 'nguyen nhat%' }),
    );
    expect(listBuilder.addSelect).toHaveBeenCalledWith(
      expect.stringContaining('similarity'),
      'search_rank',
    );
    expect(listBuilder.orderBy).toHaveBeenCalledWith('search_rank', 'DESC');
  });
});
