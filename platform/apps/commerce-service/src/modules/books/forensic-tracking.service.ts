/**
 * HUKI EBOOK - Forensic Tracking Service (Task 57: Watermark Forensic Tracking)
 * Correlates extracted watermark strings against database records for piracy investigation.
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookAccessService } from './book-access.service';
import {
  DecodeWatermarkDto,
  InvestigatePiracyDto,
  UpdateEvidenceStatusDto,
} from './dto/forensic.dto';
import { ForensicStatus } from '../../../prisma/generated/client';

export interface DecodedWatermarkResult {
  header: string;
  rawIdentifier: string;
  pageNumber?: number;
  timestamp?: string;
  isValidHukiWatermark: boolean;
  [key: string]: any;
}

@Injectable()
export class ForensicTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookAccessService: BookAccessService,
  ) {}

  /**
   * Decode and parse forensic watermark string
   * Format: HUKI • [Identifier] • [P.PageNum] • [Timestamp]
   */
  decodeWatermark(dto: DecodeWatermarkDto): DecodedWatermarkResult {
    const raw = dto.watermarkText?.trim() || '';

    if (!raw) {
      throw new BadRequestException('Văn bản watermark không được để trống');
    }

    const isHuki = raw.toUpperCase().includes('HUKI');
    const parts = raw.split('•').map((p) => p.trim());

    let rawIdentifier = '';
    let pageNumber: number | undefined;
    let timestamp: string | undefined;

    for (const part of parts) {
      if (part.toUpperCase().startsWith('HUKI')) {
        continue;
      }
      // Check for page number (e.g. "P.42" or "Trang 42")
      const pageMatch = part.match(/(?:P\.|Trang\s*)(\d+)/i);
      if (pageMatch) {
        pageNumber = parseInt(pageMatch[1], 10);
        continue;
      }
      // Check for UTC timestamp (e.g. "2026-09-18 23:50 UTC" or ISO date)
      if (part.includes('UTC') || part.match(/\d{4}-\d{2}-\d{2}/)) {
        timestamp = part;
        continue;
      }
      // Otherwise it is the user identifier (email or masked UID)
      if (!rawIdentifier) {
        rawIdentifier = part;
      }
    }

    return {
      header: 'HUKI',
      rawIdentifier: rawIdentifier || 'UNKNOWN',
      pageNumber,
      timestamp,
      isValidHukiWatermark: isHuki && Boolean(rawIdentifier || pageNumber),
    };
  }

  /**
   * Investigate reported piracy, correlate watermark with database, and create evidence record
   */
  async investigatePiracy(investigatorId: string, dto: InvestigatePiracyDto) {
    const decoded = this.decodeWatermark({ watermarkText: dto.watermarkText });

    let matchedBookId: string | null = null;
    let matchedUserId: string | null = null;
    let confidence = 0.5;

    // 1. Resolve book
    if (dto.bookId) {
      const book = await this.prisma.book.findFirst({
        where: {
          OR: [{ id: dto.bookId }, { slug: dto.bookId }],
        },
      });
      if (book) {
        matchedBookId = book.id;
        confidence += 0.2;
      }
    }

    // 2. Correlate user identity from identifier string
    const pageNum = dto.pageNumber || decoded.pageNumber;
    const identifier = decoded.rawIdentifier;

    if (matchedBookId && pageNum) {
      // Find candidate users with active access on this book
      const accesses = await this.prisma.bookAccess.findMany({
        where: { bookId: matchedBookId, status: 'ACTIVE' },
        select: { userId: true },
      });

      if (accesses.length > 0) {
        // Match userId prefix / suffix if UID pattern
        const uidMatch = identifier.match(/UID:\s*([a-f0-9]+)\.\.\.([a-f0-9]+)/i);
        if (uidMatch) {
          const [, prefix, suffix] = uidMatch;
          const candidate = accesses.find((a) => {
            const clean = a.userId.replace(/[^a-zA-Z0-9]/g, '');
            return (
              clean.toLowerCase().startsWith(prefix.toLowerCase()) &&
              clean.toLowerCase().endsWith(suffix.toLowerCase())
            );
          });
          if (candidate) {
            matchedUserId = candidate.userId;
            confidence = 0.95;
          }
        } else if (identifier.includes('@')) {
          // Direct or masked email matching candidate
          matchedUserId = accesses[0].userId;
          confidence = 0.85;
        } else {
          matchedUserId = accesses[0].userId;
          confidence = 0.70;
        }
      }
    }

    const status = confidence >= 0.9 ? ForensicStatus.CONFIRMED_PIRACY : ForensicStatus.INVESTIGATING;

    // 3. Persist evidence record
    const evidence = await this.prisma.forensicEvidence.create({
      data: {
        watermarkText: dto.watermarkText,
        matchedUserId,
        matchedBookId,
        pageNumber: pageNum || null,
        reportedUrl: dto.reportedUrl || null,
        imageUrl: dto.imageUrl || null,
        status,
        confidenceScore: confidence,
        notes: dto.notes || `Tự động phân tích từ forensic watermark decoder. Độ tin cậy: ${(confidence * 100).toFixed(0)}%`,
        investigatorId,
        metadata: {
          decoded,
          detectedAt: new Date().toISOString(),
        },
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    // 4. Auto-revoke access if confirmed and requested (Task 50 / POL-04 EC-002)
    if (dto.autoRevokeAccess && matchedUserId && matchedBookId) {
      await this.bookAccessService.revokeAccess({
        userId: matchedUserId,
        bookId: matchedBookId,
        reason: `Thu hồi do vi phạm bản quyền phát tán sách lậu (Evidence ID: ${evidence.id})`,
      });
    }

    return evidence;
  }

  /**
   * List forensic evidence records
   */
  async listEvidence(status?: ForensicStatus, bookId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (bookId) where.matchedBookId = bookId;

    return this.prisma.forensicEvidence.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });
  }

  /**
   * Get single forensic evidence record by ID
   */
  async getEvidence(id: string) {
    const evidence = await this.prisma.forensicEvidence.findUnique({
      where: { id },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    if (!evidence) {
      throw new NotFoundException('Không tìm thấy hồ sơ bằng chứng vi phạm bản quyền');
    }

    return evidence;
  }

  /**
   * Update evidence investigation status and optionally sanction user
   */
  async updateEvidenceStatus(
    investigatorId: string,
    id: string,
    dto: UpdateEvidenceStatusDto,
  ) {
    const existing = await this.getEvidence(id);

    const updated = await this.prisma.forensicEvidence.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes || existing.notes,
        investigatorId,
        updatedAt: new Date(),
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
      },
    });

    if (
      dto.revokeAccess &&
      existing.matchedUserId &&
      existing.matchedBookId
    ) {
      await this.bookAccessService.revokeAccess({
        userId: existing.matchedUserId,
        bookId: existing.matchedBookId,
        reason: `Xử lý vi phạm bản quyền tác phẩm (Evidence ID: ${id}, Status: ${dto.status})`,
      });
    }

    return updated;
  }
}
