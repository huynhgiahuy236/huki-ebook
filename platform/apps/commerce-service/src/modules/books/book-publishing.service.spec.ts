import { ConflictException } from '@nestjs/common';
import { BookPublishingService } from './book-publishing.service';

describe('BookPublishingService (Prisma)', () => {
  const prisma = { book: { findUnique: jest.fn() } };
  const service = new BookPublishingService(prisma as any, {} as any, { emit: jest.fn() } as any);
  beforeEach(() => jest.clearAllMocks());

  it('rejects publishing an absent Prisma book', async () => {
    prisma.book.findUnique.mockResolvedValue(null);
    await expect(service.publish('missing', {} as any)).rejects.toBeInstanceOf(ConflictException);
  });
});
