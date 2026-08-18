import { BadRequestException, ConflictException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { BookActor } from '../../common/book-auth.guard';
import { BooksService } from './books.service';
import { serializeDigitalDetails } from './digital-books.service';
import { COVER_STORAGE, CoverStorage, EBOOK_STORAGE, EbookStorage } from './storage/storage.interfaces';
import { BookFormat } from '@prisma/client';

export enum PdfFileKind {
  SOURCE = 'SOURCE',
  PREVIEW = 'PREVIEW',
}

@Injectable()
export class BookUploadsService {
  private readonly logger = new Logger(BookUploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly booksService: BooksService,
    private readonly configService: ConfigService,
    @Inject(COVER_STORAGE) private readonly coverStorage: CoverStorage,
    @Inject(EBOOK_STORAGE) private readonly ebookStorage: EbookStorage,
  ) {}

  async uploadCover(bookId: string, file: Express.Multer.File | undefined, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new ConflictException('Book not found');

    this.validateCover(file);

    const key = `huki/books/${book.storeId}/${book.id}/cover-${randomUUID()}`;
    const uploaded = await this.coverStorage.upload(file!.buffer, key);

    try {
      await this.prisma.book.update({
        where: { id: bookId },
        data: {
          coverUrl: uploaded.url,
          coverPublicId: uploaded.key,
        },
      });
    } catch (error) {
      await this.safeDeleteCover(uploaded.key);
      throw error;
    }

    if (book.coverPublicId) await this.safeDeleteCover(book.coverPublicId);

    return { coverUrl: uploaded.url };
  }

  async uploadPdf(bookId: string, kind: PdfFileKind, file: Express.Multer.File | undefined, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new ConflictException('Book not found');

    if (![BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format)) {
      throw new ConflictException('Book does not support digital format');
    }

    this.validatePdf(file);

    const details = await this.prisma.digitalBookDetails.findUnique({ where: { bookId } });
    if (!details) throw new ConflictException('Digital book details not found');

    const part = kind === PdfFileKind.SOURCE ? 'pdf' : 'preview';
    const key = `stores/${book.storeId}/books/${book.id}/${part}-${randomUUID()}.pdf`;
    await this.ebookStorage.upload(file!.buffer, key, 'application/pdf');

    try {
      const data: any = {};
      if (kind === PdfFileKind.SOURCE) {
        data.pdfKey = key;
        data.fileSize = String(file!.size);
        data.mimeType = 'application/pdf';
      } else {
        data.previewPdfKey = key;
      }

      await this.prisma.digitalBookDetails.update({
        where: { bookId },
        data,
      });

      const oldKey = kind === PdfFileKind.SOURCE ? details.pdfKey : details.previewPdfKey;
      if (oldKey) await this.safeDeleteEbook(oldKey);
    } catch (error) {
      await this.safeDeleteEbook(key);
      throw error;
    }

    return serializeDigitalDetails(await this.prisma.digitalBookDetails.findUnique({ where: { bookId } }));
  }

  private validateCover(file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Cover file is required');
    const max = this.configService.get<number>('storage.coverMaxBytes', 5 * 1024 * 1024);
    if (file.size > max) throw new BadRequestException('Cover file is too large');
    const bytes = file.buffer;
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!jpeg && !png) throw new BadRequestException('Cover must be JPEG or PNG');
  }

  private validatePdf(file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('PDF file is required');
    const max = this.configService.get<number>('storage.pdfMaxBytes', 100 * 1024 * 1024);
    if (file.size > max) throw new BadRequestException('PDF file is too large');
    if (file.buffer.subarray(0, 5).toString() !== '%PDF-') {
      throw new BadRequestException('Invalid PDF file signature');
    }
  }

  private async safeDeleteCover(key: string) {
    try {
      await this.coverStorage.delete(key);
    } catch (error) {
      this.logger.warn(`Failed to remove Cloudinary object ${key}: ${String(error)}`);
    }
  }

  private async safeDeleteEbook(key: string) {
    try {
      await this.ebookStorage.delete(key);
    } catch (error) {
      this.logger.warn(`Failed to remove R2 object ${key}: ${String(error)}`);
    }
  }
}
