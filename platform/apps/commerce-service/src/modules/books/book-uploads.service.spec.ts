import { ConflictException } from '@nestjs/common';
import { BookUploadsService } from './book-uploads.service';

describe('BookUploadsService (Prisma)', () => {
  const prisma = { book: { findUnique: jest.fn(), update: jest.fn() } };
  const coverStorage = { upload: jest.fn(), delete: jest.fn() };
  const service = new BookUploadsService(prisma as any, {} as any, {} as any, coverStorage as any, {} as any);
  beforeEach(() => jest.clearAllMocks());

  it('rejects an upload for a missing Prisma book', async () => {
    prisma.book.findUnique.mockResolvedValue(null);
    await expect(service.uploadCover('missing', {} as any, {} as any)).rejects.toBeInstanceOf(ConflictException);
  });
});
