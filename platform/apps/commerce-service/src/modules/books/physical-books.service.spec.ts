import { NotFoundException } from '@nestjs/common';
import { PhysicalBooksService } from './physical-books.service';

describe('PhysicalBooksService (Prisma)', () => {
  const prisma = { physicalBookDetails: { findUnique: jest.fn() } };
  const books = { findForWrite: jest.fn() };
  const service = new PhysicalBooksService(prisma as any, books as any, {} as any);
  beforeEach(() => jest.clearAllMocks());

  it('returns physical details from Prisma after write authorization', async () => {
    books.findForWrite.mockResolvedValue({});
    prisma.physicalBookDetails.findUnique.mockResolvedValue({ bookId: 'book', stock: 2 });
    await expect(service.get('book', {} as any)).resolves.toMatchObject({ stock: 2 });
  });

  it('rejects a missing physical detail record', async () => {
    books.findForWrite.mockResolvedValue({});
    prisma.physicalBookDetails.findUnique.mockResolvedValue(null);
    await expect(service.get('book', {} as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});
