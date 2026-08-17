import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { BookActor } from '../../common/book-auth.guard';
import { Book, BookFormat, DigitalBookDetails } from '../../entities';
import { BooksService } from './books.service';
import { serializeDigitalDetails } from './digital-books.service';
import {
  COVER_STORAGE,
  CoverStorage,
  EBOOK_STORAGE,
  EbookStorage,
} from './storage/storage.interfaces';

export enum PdfFileKind {
  SOURCE = 'SOURCE',
  PREVIEW = 'PREVIEW',
}

@Injectable()
export class BookUploadsService {
  private readonly logger = new Logger(BookUploadsService.name);

  constructor(
    @InjectRepository(Book) private readonly bookRepository: Repository<Book>,
    @InjectRepository(DigitalBookDetails)
    private readonly digitalRepository: Repository<DigitalBookDetails>,
    private readonly booksService: BooksService,
    private readonly configService: ConfigService,
    @Inject(COVER_STORAGE) private readonly coverStorage: CoverStorage,
    @Inject(EBOOK_STORAGE) private readonly ebookStorage: EbookStorage,
  ) {}

  async uploadCover(bookId: string, file: Express.Multer.File | undefined, actor: BookActor) {
    const book = await this.booksService.findForWrite(bookId, actor);
    this.validateCover(file);
    const oldKey = book.coverPublicId;
    const key = `huki/books/${book.storeId}/${book.id}/cover-${randomUUID()}`;
    const uploaded = await this.coverStorage.upload(file!.buffer, key);

    try {
      book.coverUrl = uploaded.url;
      book.coverPublicId = uploaded.key;
      await this.bookRepository.save(book);
    } catch (error) {
      await this.safeDeleteCover(uploaded.key);
      throw error;
    }
    if (oldKey) await this.safeDeleteCover(oldKey);
    return { coverUrl: uploaded.url };
  }

  async uploadPdf(
    bookId: string,
    kind: PdfFileKind,
    file: Express.Multer.File | undefined,
    actor: BookActor,
  ) {
    const book = await this.booksService.findForWrite(bookId, actor);
    if (![BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format)) {
      throw new ConflictException('Book does not support digital format');
    }
    this.validatePdf(file);
    const details = await this.digitalRepository.findOne({ where: { bookId } });
    if (!details) throw new ConflictException('Digital book details not found');

    const part = kind === PdfFileKind.SOURCE ? 'source' : 'preview';
    const key = `stores/${book.storeId}/books/${book.id}/${part}-${randomUUID()}.pdf`;
    const oldKey =
      kind === PdfFileKind.SOURCE ? details.sourcePdfKey : details.previewPdfKey;
    const checksum = createHash('sha256').update(file!.buffer).digest('hex');
    await this.ebookStorage.upload(file!.buffer, key, 'application/pdf');

    try {
      if (kind === PdfFileKind.SOURCE) {
        details.sourcePdfKey = key;
        details.fileSize = String(file!.size);
        details.mimeType = 'application/pdf';
        details.checksum = checksum;
      } else {
        details.previewPdfKey = key;
      }
      await this.digitalRepository.save(details);
    } catch (error) {
      await this.safeDeleteEbook(key);
      throw error;
    }
    if (oldKey) await this.safeDeleteEbook(oldKey);
    return serializeDigitalDetails(details);
  }

  private validateCover(file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Cover file is required');
    const max = this.configService.get<number>('storage.coverMaxBytes', 5 * 1024 * 1024);
    if (file.size > max) throw new BadRequestException('Cover file is too large');
    const bytes = file.buffer;
    const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
    if (!jpeg && !png && !webp) throw new BadRequestException('Cover must be JPEG, PNG or WebP');
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
