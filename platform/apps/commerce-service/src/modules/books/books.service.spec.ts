import { NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service';
import { PublishersService } from '../publishers/publishers.service';
import {
  MAJOR_VN_ISSUING_COMPANIES,
  OFFICIAL_VN_PUBLISHERS,
} from '../publishers/publishing-master-data';

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

  it('exposes issuingCompany, translator, publishingLicenseNumber, language, and integer pageCount', async () => {
    const prismaWithRelations = {
      ...prisma,
      book: {
        ...prisma.book,
        findUnique: jest.fn().mockResolvedValue({
          id: 'book-pub-1',
          storeId: 'store-1',
          ownerUserId: 'owner-1',
          title: 'Nghĩ Lớn Để Thành Công',
          slug: 'nghi-lon-de-thanh-cong',
          isbn: '978-604-58-9999-9',
          publishingLicenseNumber: '2456/QĐ-NXBTH',
          language: 'Tiếng Việt',
          description: 'Sách kinh doanh & lãnh đạo',
          price: 115000,
          format: 'BOTH',
          status: 'PUBLISHED',
          coverUrl: null,
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          viewCount: 10,
          category: { id: 'cat-1', name: 'Kinh doanh & Lãnh đạo' },
          author: { id: 'auth-1', name: 'Donald J. Trump & Bill Zanker' },
          publisher: { id: 'pub-1', name: 'NXB Tổng hợp TP.HCM' },
          issuingCompany: { id: 'iss-1', name: 'First News - Trí Việt' },
          translator: { id: 'tr-1', name: 'Nguyễn Văn Dịch' },
          physicalDetails: { stock: 25, reserved: 0, pageCount: 456, weight: 400 },
          digitalDetails: null,
          affiliateSetting: null,
        }),
      },
      orderItem: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 5 } }),
      },
    };
    const svc = new BooksService(prismaWithRelations as any);
    const result = await svc.findOne('book-pub-1');

    expect(result.publisher?.name).toBe('NXB Tổng hợp TP.HCM');
    expect(result.issuingCompany?.name).toBe('First News - Trí Việt');
    expect(result.translator?.name).toBe('Nguyễn Văn Dịch');
    expect(result.publishingLicenseNumber).toBe('2456/QĐ-NXBTH');
    expect(result.language).toBe('Tiếng Việt');
    expect(result.pageCount).toBe(456);
  });

  it('seeds ~60 official VN publishers and issuing companies master data idempotently', async () => {
    const pubCreateMany = jest.fn().mockResolvedValue({ count: OFFICIAL_VN_PUBLISHERS.length });
    const issuingCreateMany = jest.fn().mockResolvedValue({ count: MAJOR_VN_ISSUING_COMPANIES.length });
    const mockPrisma = {
      publisher: { createMany: pubCreateMany },
      issuingCompany: { createMany: issuingCreateMany },
    };
    const mockRedis = { get: jest.fn(), set: jest.fn(), delPattern: jest.fn() };
    const pubService = new PublishersService(mockPrisma as any, mockRedis as any);

    await pubService.seedPublishingMasterData();

    expect(OFFICIAL_VN_PUBLISHERS.length).toBeGreaterThanOrEqual(55);
    expect(MAJOR_VN_ISSUING_COMPANIES.length).toBeGreaterThanOrEqual(15);
    expect(pubCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    expect(issuingCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
  });
});
