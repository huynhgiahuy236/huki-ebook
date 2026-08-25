import { NotFoundException } from '@nestjs/common';
import { DigitalBooksService } from './digital-books.service';

describe('DigitalBooksService (Prisma)', () => {
  const prisma = { digitalBookDetails: { findUnique: jest.fn() } };
  const books = { findForWrite: jest.fn() };
  const service = new DigitalBooksService(prisma as any, books as any);
  beforeEach(() => jest.clearAllMocks());

  it('returns a serialized digital detail record from Prisma', async () => {
    books.findForWrite.mockResolvedValue({});
    prisma.digitalBookDetails.findUnique.mockResolvedValue({ id: 'details', bookId: 'book', digitalEnabled: true, pdfKey: 'source', previewPdfKey: null, epubKey: null, createdAt: new Date(), updatedAt: new Date() });
    await expect(service.get('book', {} as any)).resolves.toMatchObject({ hasSourceFile: true });
  });

  it('rejects a missing digital detail record', async () => {
    books.findForWrite.mockResolvedValue({});
    prisma.digitalBookDetails.findUnique.mockResolvedValue(null);
    await expect(service.get('book', {} as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});
