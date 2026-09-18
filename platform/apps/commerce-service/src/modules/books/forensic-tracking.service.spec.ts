import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ForensicTrackingService } from './forensic-tracking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BookAccessService } from './book-access.service';
import { ForensicStatus } from '../../../prisma/generated/client';

describe('ForensicTrackingService (Task 57: Watermark Forensic Tracking)', () => {
  let service: ForensicTrackingService;
  let prisma: any;
  let bookAccessService: any;

  const mockEvidence = {
    id: 'evidence-1',
    watermarkText: 'HUKI • UID: 94b8...e21a • P.42 • 2026-09-18 23:50 UTC',
    matchedUserId: '94b80000-0000-0000-0000-00000000e21a',
    matchedBookId: 'book-1',
    pageNumber: 42,
    status: ForensicStatus.CONFIRMED_PIRACY,
    confidenceScore: 0.95,
    notes: 'Auto correlated',
    investigatorId: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      book: {
        findFirst: jest.fn().mockResolvedValue({ id: 'book-1', title: 'Con Đường Phía Trước', slug: 'con-duong-phia-truoc' }),
      },
      bookAccess: {
        findMany: jest.fn().mockResolvedValue([
          { userId: '94b80000-0000-0000-0000-00000000e21a', status: 'ACTIVE' },
        ]),
      },
      forensicEvidence: {
        create: jest.fn().mockResolvedValue(mockEvidence),
        findMany: jest.fn().mockResolvedValue([mockEvidence]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'evidence-1') return Promise.resolve(mockEvidence);
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ where, data }) => {
          return Promise.resolve({
            ...mockEvidence,
            ...data,
          });
        }),
      },
    };

    bookAccessService = {
      revokeAccess: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ForensicTrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: BookAccessService, useValue: bookAccessService },
      ],
    }).compile();

    service = module.get<ForensicTrackingService>(ForensicTrackingService);
  });

  describe('decodeWatermark', () => {
    it('should decode a standard forensic watermark string', () => {
      const res = service.decodeWatermark({
        watermarkText: 'HUKI • r***r@gmail.com • P.42 • 2026-09-18 23:50 UTC',
      });

      expect(res.header).toBe('HUKI');
      expect(res.rawIdentifier).toBe('r***r@gmail.com');
      expect(res.pageNumber).toBe(42);
      expect(res.timestamp).toContain('2026-09-18');
      expect(res.isValidHukiWatermark).toBe(true);
    });

    it('should decode UID and Vietnamese page prefix', () => {
      const res = service.decodeWatermark({
        watermarkText: 'HUKI • UID: 94b8...e21a • Trang 15 • 2026-09-18 23:50 UTC',
      });

      expect(res.rawIdentifier).toBe('UID: 94b8...e21a');
      expect(res.pageNumber).toBe(15);
      expect(res.isValidHukiWatermark).toBe(true);
    });

    it('should throw BadRequestException if watermark text is empty', () => {
      expect(() =>
        service.decodeWatermark({ watermarkText: '   ' }),
      ).toThrow(BadRequestException);
    });
  });

  describe('investigatePiracy', () => {
    it('should correlate watermark with candidate users and persist evidence', async () => {
      const res = await service.investigatePiracy('admin-1', {
        watermarkText: 'HUKI • UID: 94b8...e21a • P.42 • 2026-09-18 23:50 UTC',
        bookId: 'book-1',
        reportedUrl: 'https://leak.site/book.pdf',
        autoRevokeAccess: true,
      });

      expect(res).toBeDefined();
      expect(res.id).toBe('evidence-1');
      expect(prisma.forensicEvidence.create).toHaveBeenCalled();
      expect(bookAccessService.revokeAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          bookId: 'book-1',
          userId: '94b80000-0000-0000-0000-00000000e21a',
        }),
      );
    });
  });

  describe('listEvidence and getEvidence', () => {
    it('should list all evidence records', async () => {
      const res = await service.listEvidence();
      expect(res).toHaveLength(1);
      expect(res[0].id).toBe('evidence-1');
    });

    it('should get evidence by id', async () => {
      const res = await service.getEvidence('evidence-1');
      expect(res.id).toBe('evidence-1');
    });

    it('should throw NotFoundException if evidence does not exist', async () => {
      await expect(service.getEvidence('non-existing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateEvidenceStatus', () => {
    it('should update evidence status and optionally revoke access', async () => {
      const res = await service.updateEvidenceStatus('admin-1', 'evidence-1', {
        status: ForensicStatus.SANCTIONED,
        notes: 'Confirmed piracy and sanctioned user',
        revokeAccess: true,
      });

      expect(res.status).toBe(ForensicStatus.SANCTIONED);
      expect(prisma.forensicEvidence.update).toHaveBeenCalled();
      expect(bookAccessService.revokeAccess).toHaveBeenCalled();
    });
  });
});
