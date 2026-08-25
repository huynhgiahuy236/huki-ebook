import { NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';

describe('BooksService (Prisma)', () => {
  const prisma = { book: { findUnique: jest.fn() } };
  const service = new BooksService(prisma as any);
  beforeEach(() => jest.clearAllMocks());

  it('maps a missing Prisma book to a not-found error', async () => {
    prisma.book.findUnique.mockResolvedValue(null);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
