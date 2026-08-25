import { NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';

describe('BooksService (Prisma)', () => {
  const prisma = {
    book: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    $transaction: jest.fn(),
  };
  const service = new BooksService(prisma as any);
  beforeEach(() => jest.clearAllMocks());

  it('maps a missing Prisma book to a not-found error', async () => {
    prisma.book.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('normalizes API sort direction for Prisma', async () => {
    prisma.book.findMany.mockReturnValue('books-query');
    prisma.book.count.mockReturnValue('count-query');
    prisma.$transaction.mockResolvedValue([[], 0]);

    await service.findAll({
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      order: 'DESC',
    } as any);

    expect(prisma.book.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' } }),
    );
  });
});
