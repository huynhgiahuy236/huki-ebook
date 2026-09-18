import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReaderService } from './reader.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookAccessService } from './book-access.service';
import { AccessReason } from '../../../../../libs/shared/src/enums';

describe('ReaderService (Task 53: Bookmark & Progress Sync)', () => {
  let service: ReaderService;
  let prisma: any;
  let bookAccessService: any;

  const mockBook = {
    id: 'book-uuid-1',
    slug: 'con-duong-phia-truoc',
    title: 'Con Đường Phía Trước',
    digitalDetails: {
      digitalEnabled: true,
    },
    physicalDetails: {
      pageCount: 166,
    },
  };

  beforeEach(async () => {
    prisma = {
      book: {
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where?.OR?.some((cond: any) => cond.id === 'book-uuid-1' || cond.slug === 'con-duong-phia-truoc')) {
            return Promise.resolve(mockBook);
          }
          return Promise.resolve(null);
        }),
      },
      readerBookmark: {
        upsert: jest.fn().mockImplementation(({ create, update }) => {
          return Promise.resolve({
            id: 'bm-1',
            ...create,
            ...update,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'bm-1',
            userId: 'user-1',
            bookId: 'book-uuid-1',
            pageNumber: 15,
            note: 'Dấu trang chương 2',
          },
        ]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'bm-1') {
            return Promise.resolve({
              id: 'bm-1',
              userId: 'user-1',
              bookId: 'book-uuid-1',
              pageNumber: 15,
            });
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn().mockResolvedValue({ id: 'bm-1' }),
      },
      readingProgress: {
        upsert: jest.fn().mockImplementation(({ create, update }) => {
          return Promise.resolve({
            id: 'prog-1',
            ...create,
            ...update,
            lastReadAt: new Date(),
          });
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where?.userId_bookId?.userId === 'user-1') {
            return Promise.resolve({
              id: 'prog-1',
              userId: 'user-1',
              bookId: 'book-uuid-1',
              currentPage: 42,
              percentage: 25.3,
              lastReadAt: new Date(),
            });
          }
          return Promise.resolve(null);
        }),
      },
      bookAccess: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    bookAccessService = {
      checkAccess: jest.fn().mockResolvedValue({
        allowed: true,
        reason: AccessReason.OWNED,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReaderService,
        { provide: PrismaService, useValue: prisma },
        { provide: BookAccessService, useValue: bookAccessService },
      ],
    }).compile();

    service = module.get<ReaderService>(ReaderService);
  });

  describe('addBookmark', () => {
    it('should add a bookmark when user has valid access', async () => {
      const res = await service.addBookmark('user-1', {
        bookId: 'book-uuid-1',
        pageNumber: 15,
        note: 'Dấu trang chương 2',
      });

      expect(res).toBeDefined();
      expect(res.pageNumber).toBe(15);
      expect(prisma.readerBookmark.upsert).toHaveBeenCalled();
    });

    it('should reject adding bookmark if user access is revoked / not allowed', async () => {
      bookAccessService.checkAccess.mockResolvedValueOnce({
        allowed: false,
        reason: AccessReason.ACCESS_REVOKED,
        message: 'Quyền đọc sách đã bị thu hồi',
      });

      await expect(
        service.addBookmark('user-1', {
          bookId: 'book-uuid-1',
          pageNumber: 15,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteBookmark', () => {
    it('should allow owner to delete bookmark', async () => {
      const res = await service.deleteBookmark('user-1', 'bm-1');
      expect(res.message).toContain('thành công');
      expect(prisma.readerBookmark.delete).toHaveBeenCalledWith({
        where: { id: 'bm-1' },
      });
    });

    it('should reject deletion if user is not the owner (IDOR protection)', async () => {
      await expect(
        service.deleteBookmark('user-attacker', 'bm-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if bookmark does not exist', async () => {
      await expect(
        service.deleteBookmark('user-1', 'non-existing-id'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveProgress', () => {
    it('should save and sync reading progress and update BookAccess', async () => {
      const res = await service.saveProgress('user-1', {
        bookId: 'book-uuid-1',
        currentPage: 42,
        percentage: 25.3,
      });

      expect(res.currentPage).toBe(42);
      expect(prisma.readingProgress.upsert).toHaveBeenCalled();
      expect(prisma.bookAccess.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          bookId: 'book-uuid-1',
        },
        data: expect.objectContaining({
          readingProgress: 25,
        }),
      });
    });

    it('should auto-compute percentage if not provided', async () => {
      const res = await service.saveProgress('user-1', {
        bookId: 'book-uuid-1',
        currentPage: 83,
      });

      expect(res.percentage).toBe(50); // 83 / 166 = 50%
    });
  });

  describe('getProgress', () => {
    it('should return saved reading progress for book', async () => {
      const res = await service.getProgress('user-1', 'book-uuid-1');
      expect(res.currentPage).toBe(42);
      expect(res.percentage).toBe(25.3);
    });

    it('should return default position 1 if user has no prior progress', async () => {
      const res = await service.getProgress('user-new', 'book-uuid-1');
      expect(res.currentPage).toBe(1);
      expect(res.percentage).toBe(0);
    });
  });
});
