import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookActor } from '../../common/book-auth.guard';
import { Book, BookFormat, BookStatus } from '../../entities';
import { serializeBook } from './book-response.util';
import { BooksService } from './books.service';

export interface PublishValidationError {
  field: string;
  message: string;
}

@Injectable()
export class BookPublishingService {
  constructor(
    @InjectRepository(Book) private readonly bookRepository: Repository<Book>,
    private readonly booksService: BooksService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async publish(bookId: string, actor: BookActor) {
    const book = await this.booksService.findForWrite(bookId, actor);
    if (![BookStatus.DRAFT, BookStatus.HIDDEN].includes(book.status)) {
      throw new ConflictException(`Cannot publish a book with status ${book.status}`);
    }
    const errors = this.validateForPublish(book);
    if (errors.length) {
      throw new UnprocessableEntityException({
        message: 'Book is not ready to publish',
        errors,
      });
    }
    book.status = BookStatus.PUBLISHED;
    book.publishedAt = new Date();
    const saved = await this.bookRepository.save(book);
    this.eventEmitter.emit('book.published', {
      bookId: book.id,
      storeId: book.storeId,
      title: book.title,
      publishedAt: book.publishedAt,
    });
    return serializeBook(saved, true);
  }

  async hide(bookId: string, actor: BookActor) {
    const book = await this.booksService.findForWrite(bookId, actor);
    if (book.status !== BookStatus.PUBLISHED) {
      throw new ConflictException('Only published books can be hidden');
    }
    book.status = BookStatus.HIDDEN;
    return serializeBook(await this.bookRepository.save(book), true);
  }

  async archive(bookId: string, actor: BookActor) {
    const book = await this.booksService.findForWrite(bookId, actor);
    if (![BookStatus.DRAFT, BookStatus.HIDDEN, BookStatus.PUBLISHED].includes(book.status)) {
      throw new ConflictException(`Cannot archive a book with status ${book.status}`);
    }
    book.status = BookStatus.ARCHIVED;
    return serializeBook(await this.bookRepository.save(book), true);
  }

  async suspend(bookId: string, actor: BookActor) {
    if (actor.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform administrators can suspend books');
    }
    const book = await this.booksService.findForWrite(bookId, actor);
    book.status = BookStatus.SUSPENDED;
    return serializeBook(await this.bookRepository.save(book), true);
  }

  validateForPublish(book: Book): PublishValidationError[] {
    const errors: PublishValidationError[] = [];
    if (book.title.trim().length < 2) errors.push({ field: 'title', message: 'Title is required' });
    if (book.description.trim().length < 10) {
      errors.push({ field: 'description', message: 'Description must have at least 10 characters' });
    }
    if (book.price < 0) errors.push({ field: 'price', message: 'Price cannot be negative' });
    if (!book.coverUrl) errors.push({ field: 'coverUrl', message: 'Cover image is required' });
    if (!book.category?.isActive) errors.push({ field: 'categoryId', message: 'Active category is required' });
    if (!book.author?.isActive) errors.push({ field: 'authorId', message: 'Active author is required' });
    if (!book.publisher?.isActive) {
      errors.push({ field: 'publisherId', message: 'Active publisher is required' });
    }

    if ([BookFormat.PHYSICAL, BookFormat.BOTH].includes(book.format)) {
      const physical = book.physicalDetails;
      if (!physical) {
        errors.push({ field: 'physicalDetails', message: 'Physical details are required' });
      } else {
        if (!physical.physicalEnabled) {
          errors.push({ field: 'physicalDetails.physicalEnabled', message: 'Physical format must be enabled' });
        }
        for (const field of ['weight', 'length', 'width', 'height'] as const) {
          if (physical[field] <= 0) {
            errors.push({ field: `physicalDetails.${field}`, message: `${field} must be greater than zero` });
          }
        }
      }
    }

    if ([BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format)) {
      const digital = book.digitalDetails;
      if (!digital) {
        errors.push({ field: 'digitalDetails', message: 'Digital details are required' });
      } else {
        if (!digital.digitalEnabled) {
          errors.push({ field: 'digitalDetails.digitalEnabled', message: 'Digital format must be enabled' });
        }
        if (!digital.sourcePdfKey) {
          errors.push({ field: 'digitalDetails.sourcePdfKey', message: 'Source PDF is required' });
        }
        if (!digital.previewPdfKey) {
          errors.push({ field: 'digitalDetails.previewPdfKey', message: 'Preview PDF is required' });
        }
        if (!digital.allowOnlineRead && !digital.allowDownload) {
          errors.push({
            field: 'digitalDetails.permissions',
            message: 'Online reading or download must be enabled',
          });
        }
      }
    }
    return errors;
  }
}
