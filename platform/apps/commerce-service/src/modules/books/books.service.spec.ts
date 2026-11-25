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
      expect.objectContaining({
        where: expect.objectContaining({ status: 'PUBLISHED' }),
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('hides an unpublished book from a guest', async () => {
    prisma.book.findUnique.mockResolvedValue({ id: 'draft', status: 'DRAFT', ownerUserId: 'owner' });

    await expect(service.findOne('draft')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 404 NO_PDF_AVAILABLE when a book has no PDF key', async () => {
    const prismaWithFirst = {
      ...prisma,
      book: {
        ...prisma.book,
        findFirst: jest.fn().mockResolvedValue({
          id: 'book-no-pdf',
          slug: 'sach-khong-co-pdf',
          title: 'Sách Không Có PDF',
          digitalDetails: null,
        }),
      },
    };
    const svc = new BooksService(prismaWithFirst as any);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    await svc.streamPdf('sach-khong-co-pdf', { headers: {} }, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'NO_PDF_AVAILABLE' }),
    );
  });

  it('streams real PDF when book has an uploaded pdfKey on storage', async () => {
    const pipe = jest.fn();
    const ebookStorage = {
      upload: jest.fn(),
      delete: jest.fn(),
      getStream: jest.fn().mockResolvedValue({
        stream: { pipe },
        contentLength: 1024,
        contentType: 'application/pdf',
      }),
    };
    const prismaWithFirst = {
      ...prisma,
      book: {
        ...prisma.book,
        findFirst: jest.fn().mockResolvedValue({
          id: 'book-with-pdf',
          slug: 'sach-co-pdf',
          title: 'Sách Có PDF',
          digitalDetails: { pdfKey: 'stores/s1/books/b1/pdf-1.pdf' },
        }),
      },
    };
    const svc = new BooksService(prismaWithFirst as any, undefined, undefined, ebookStorage as any);
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    await svc.streamPdf('sach-co-pdf', { headers: {} }, res);

    expect(ebookStorage.getStream).toHaveBeenCalledWith('stores/s1/books/b1/pdf-1.pdf', undefined);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(pipe).toHaveBeenCalledWith(res);
  });
});
