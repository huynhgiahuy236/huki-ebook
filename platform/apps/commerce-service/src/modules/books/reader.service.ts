/**
 * HUKI EBOOK - Reader Service (Task 53: Bookmark & Progress Sync)
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookAccessService } from './book-access.service';
import { CreateBookmarkDto, SaveProgressDto } from './dto/reader.dto';

@Injectable()
export class ReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookAccessService: BookAccessService,
  ) {}

  /**
   * Resolve and validate bookId from input
   */
  private async resolveBook(bookOrProductId?: string) {
    if (!bookOrProductId) {
      throw new BadRequestException('bookId hoặc productId là bắt buộc');
    }

    const book = await this.prisma.book.findFirst({
      where: {
        OR: [{ id: bookOrProductId }, { slug: bookOrProductId }],
      },
      include: {
        digitalDetails: true,
        physicalDetails: true,
      },
    });

    if (!book) {
      throw new NotFoundException('Không tìm thấy sách yêu cầu');
    }

    return book;
  }

  /**
   * Thêm dấu trang (Bookmark)
   */
  async addBookmark(userId: string, dto: CreateBookmarkDto) {
    const rawId = dto.bookId || dto.productId;
    const book = await this.resolveBook(rawId);

    // Kiểm tra quyền đọc
    const access = await this.bookAccessService.checkAccess(userId, book.id);
    if (!access.allowed) {
      throw new ForbiddenException(access.message || 'Bạn không có quyền đọc sách này');
    }

    const bookmark = await this.prisma.readerBookmark.upsert({
      where: {
        userId_bookId_pageNumber: {
          userId,
          bookId: book.id,
          pageNumber: dto.pageNumber,
        },
      },
      update: {
        note: dto.note || `Dấu trang tại Trang ${dto.pageNumber}`,
        updatedAt: new Date(),
      },
      create: {
        userId,
        bookId: book.id,
        pageNumber: dto.pageNumber,
        note: dto.note || `Dấu trang tại Trang ${dto.pageNumber}`,
      },
    });

    return bookmark;
  }

  /**
   * Lấy danh sách bookmark của user cho một cuốn sách
   */
  async getBookmarks(userId: string, bookOrProductId: string) {
    const book = await this.resolveBook(bookOrProductId);

    const access = await this.bookAccessService.checkAccess(userId, book.id);
    if (!access.allowed) {
      throw new ForbiddenException(access.message || 'Bạn không có quyền đọc sách này');
    }

    return this.prisma.readerBookmark.findMany({
      where: {
        userId,
        bookId: book.id,
      },
      orderBy: {
        pageNumber: 'asc',
      },
    });
  }

  /**
   * Xóa một bookmark theo ID (có kiểm tra quyền sở hữu IDOR)
   */
  async deleteBookmark(userId: string, bookmarkId: string) {
    const bookmark = await this.prisma.readerBookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!bookmark) {
      throw new NotFoundException('Không tìm thấy dấu trang');
    }

    if (bookmark.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa dấu trang của người khác');
    }

    await this.prisma.readerBookmark.delete({
      where: { id: bookmarkId },
    });

    return { message: 'Đã xóa dấu trang thành công' };
  }

  /**
   * Lưu hoặc cập nhật tiến độ đọc sách (Reading Progress)
   */
  async saveProgress(userId: string, dto: SaveProgressDto) {
    const rawId = dto.bookId || dto.productId;
    const book = await this.resolveBook(rawId);

    const access = await this.bookAccessService.checkAccess(userId, book.id);
    if (!access.allowed) {
      throw new ForbiddenException(access.message || 'Bạn không có quyền đọc sách này');
    }

    let percentage = dto.percentage;
    if (percentage === undefined || percentage === null) {
      // Calculate percentage if book has pageCount
      const total = book.physicalDetails?.pageCount || 100;
      percentage = Math.min(100, Math.round((dto.currentPage / total) * 10000) / 100);
    }

    const now = new Date();

    const progress = await this.prisma.readingProgress.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId: book.id,
        },
      },
      update: {
        currentPage: dto.currentPage,
        percentage,
        lastReadAt: now,
        updatedAt: now,
      },
      create: {
        userId,
        bookId: book.id,
        currentPage: dto.currentPage,
        percentage,
        lastReadAt: now,
      },
    });

    // Đồng bộ vào BookAccess nếu có record
    await this.prisma.bookAccess.updateMany({
      where: {
        userId,
        bookId: book.id,
      },
      data: {
        readingProgress: Math.round(Number(percentage)),
        lastReadAt: now,
      },
    });

    return progress;
  }

  /**
   * Lấy tiến độ đọc sách hiện tại
   */
  async getProgress(userId: string, bookOrProductId: string) {
    const book = await this.resolveBook(bookOrProductId);

    const access = await this.bookAccessService.checkAccess(userId, book.id);
    if (!access.allowed) {
      throw new ForbiddenException(access.message || 'Bạn không có quyền đọc sách này');
    }

    const progress = await this.prisma.readingProgress.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: book.id,
        },
      },
    });

    if (!progress) {
      return {
        bookId: book.id,
        currentPage: 1,
        percentage: 0,
        lastReadAt: null,
      };
    }

    return progress;
  }
}
