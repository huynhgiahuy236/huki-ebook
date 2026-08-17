import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookActor } from '../../common/book-auth.guard';
import { Book, BookFormat, BookStatus, DigitalBookDetails } from '../../entities';
import { BooksService } from './books.service';
import { UpdateDigitalDetailsDto } from './dto/update-digital-details.dto';

export function serializeDigitalDetails(details: DigitalBookDetails) {
  return {
    id: details.id,
    bookId: details.bookId,
    digitalEnabled: details.digitalEnabled,
    allowOnlineRead: details.allowOnlineRead,
    allowDownload: details.allowDownload,
    hasSourceFile: !!details.sourcePdfKey,
    hasPreviewFile: !!details.previewPdfKey,
    hasEpubFile: !!details.epubKey,
    fileSize: details.fileSize,
    mimeType: details.mimeType,
    createdAt: details.createdAt,
    updatedAt: details.updatedAt,
  };
}

@Injectable()
export class DigitalBooksService {
  constructor(
    @InjectRepository(DigitalBookDetails)
    private readonly digitalRepository: Repository<DigitalBookDetails>,
    private readonly booksService: BooksService,
  ) {}

  async get(bookId: string, actor: BookActor) {
    await this.booksService.findForWrite(bookId, actor);
    return serializeDigitalDetails(await this.findDetails(bookId));
  }

  async update(bookId: string, dto: UpdateDigitalDetailsDto, actor: BookActor) {
    const book = await this.booksService.findForWrite(bookId, actor);
    this.assertDigitalFormat(book);
    if (book.status === BookStatus.PUBLISHED) {
      throw new ConflictException('Hide the book before changing digital settings');
    }
    const details = await this.findDetails(bookId);
    Object.assign(details, dto);
    return serializeDigitalDetails(await this.digitalRepository.save(details));
  }

  async findPrivateDetails(bookId: string): Promise<DigitalBookDetails> {
    return this.findDetails(bookId);
  }

  private async findDetails(bookId: string) {
    const details = await this.digitalRepository.findOne({ where: { bookId } });
    if (!details) throw new NotFoundException('Digital book details not found');
    return details;
  }

  private assertDigitalFormat(book: Book) {
    if (![BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format)) {
      throw new ConflictException('Book does not support digital format');
    }
  }
}
