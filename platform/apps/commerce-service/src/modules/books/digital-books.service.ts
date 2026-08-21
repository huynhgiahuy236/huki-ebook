import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookActor } from '../../common/book-auth.guard';
import { BooksService } from './books.service';
import { UpdateDigitalDetailsDto } from './dto/update-digital-details.dto';
import { BookFormat, BookStatus } from '../../../prisma/generated/client';

export function serializeDigitalDetails(details: any) {
  return {
    id: details.id,
    bookId: details.bookId,
    digitalEnabled: details.digitalEnabled,
    hasSourceFile: !!details.pdfKey,
    hasPreviewFile: !!details.previewPdfKey,
    hasEpubFile: !!details.epubKey,
    createdAt: details.createdAt,
    updatedAt: details.updatedAt,
  };
}

@Injectable()
export class DigitalBooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly booksService: BooksService,
  ) {}

  async get(bookId: string, actor: BookActor) {
    await this.booksService.findForWrite(bookId, actor);
    return this.findDetails(bookId);
  }

  async update(bookId: string, dto: UpdateDigitalDetailsDto, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    this.assertDigitalFormat(book);

    if (book.status === BookStatus.PUBLISHED) {
      throw new ConflictException('Hide the book before changing digital settings');
    }

    const details = await this.findDetails(bookId);
    return this.prisma.digitalBookDetails.update({
      where: { bookId },
      data: {
        digitalEnabled: dto.digitalEnabled ?? details.digitalEnabled,
      },
    });
  }

  private async findDetails(bookId: string) {
    const details = await this.prisma.digitalBookDetails.findUnique({ where: { bookId } });
    if (!details) throw new NotFoundException('Digital book details not found');
    return serializeDigitalDetails(details);
  }

  private assertDigitalFormat(book: any) {
    if (!(new Set<BookFormat>([BookFormat.DIGITAL, BookFormat.BOTH])).has(book.format)) {
      throw new ConflictException('Book does not support digital format');
    }
  }
}
