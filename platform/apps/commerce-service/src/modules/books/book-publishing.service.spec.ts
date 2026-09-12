import { ConflictException } from '@nestjs/common';
import { BookPublishingService } from './book-publishing.service';

describe('BookPublishingService (Prisma)', () => {
  const prisma = { book: { findUnique: jest.fn() } };
  const booksService = { findForWrite: jest.fn() };
  const service = new BookPublishingService(prisma as any, booksService as any, { emit: jest.fn() } as any);
  beforeEach(() => jest.clearAllMocks());

  it('rejects publishing an absent Prisma book', async () => {
    prisma.book.findUnique.mockResolvedValue(null);
    await expect(service.publish('missing', {} as any)).rejects.toBeInstanceOf(ConflictException);
  });

  it('checks ownership before publishing a draft', async () => {
    prisma.book.findUnique.mockResolvedValue({
      id: 'book-1', status: 'DRAFT', title: 'Sách thật', description: 'Mô tả sách',
      price: 1000, format: 'DIGITAL', digitalDetails: {}, categoryId: null,
      authorId: null, publisherId: null,
    });
    booksService.findForWrite.mockRejectedValue(new Error('forbidden'));

    await expect(service.publish('book-1', { sub: 'other' } as any)).rejects.toThrow('forbidden');
  });
});
