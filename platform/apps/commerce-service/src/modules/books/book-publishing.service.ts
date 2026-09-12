import { ConflictException, ForbiddenException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { BookActor } from '../../common/book-auth.guard';
import { BooksService } from './books.service';
import { BookFormat, BookStatus } from '../../../prisma/generated/client';

export interface PublishValidationError {
  field: string;
  message: string;
}

@Injectable()
export class BookPublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly booksService: BooksService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async publish(bookId: string, actor: BookActor) {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        category: true,
        author: true,
        publisher: true,
        physicalDetails: true,
        digitalDetails: true,
      },
    });

    if (!book) throw new ConflictException('Book not found');
    await this.booksService.findForWrite(bookId, actor);
    if (!(new Set<BookStatus>([BookStatus.DRAFT, BookStatus.HIDDEN])).has(book.status)) {
      throw new ConflictException(`Cannot publish a book with status ${book.status}`);
    }

    const errors = this.validateForPublish(book);
    if (errors.length) {
      throw new UnprocessableEntityException({
        message: 'Book is not ready to publish',
        errors,
      });
    }

    const saved = await this.prisma.book.update({
      where: { id: bookId },
      data: {
        status: BookStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    this.eventEmitter.emit('book.published', {
      bookId: book.id,
      storeId: book.storeId,
      title: book.title,
      publishedAt: saved.publishedAt,
    });

    return saved;
  }

  async hide(bookId: string, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new ConflictException('Book not found');
    await this.booksService.findForWrite(bookId, actor);
    if (book.status !== BookStatus.PUBLISHED) {
      throw new ConflictException('Only published books can be hidden');
    }
    return this.prisma.book.update({
      where: { id: bookId },
      data: { status: BookStatus.HIDDEN },
    });
  }

  async archive(bookId: string, actor: BookActor) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new ConflictException('Book not found');
    await this.booksService.findForWrite(bookId, actor);
    if (!(new Set<BookStatus>([BookStatus.DRAFT, BookStatus.HIDDEN, BookStatus.PUBLISHED])).has(book.status)) {
      throw new ConflictException(`Cannot archive a book with status ${book.status}`);
    }
    return this.prisma.book.update({
      where: { id: bookId },
      data: { status: BookStatus.ARCHIVED },
    });
  }

  async suspend(bookId: string, actor: BookActor) {
    if (actor.role !== 'PLATFORM_ADMIN') {
      throw new ForbiddenException('Only platform administrators can suspend books');
    }
    return this.prisma.book.update({
      where: { id: bookId },
      data: { status: BookStatus.SUSPENDED },
    });
  }

  validateForPublish(book: any): PublishValidationError[] {
    const errors: PublishValidationError[] = [];

    if (book.title?.trim().length < 2) errors.push({ field: 'title', message: 'Title is required' });
    if (book.description?.trim().length < 5) {
      errors.push({ field: 'description', message: 'Description must have at least 5 characters' });
    }
    if (Number(book.price) < 0) errors.push({ field: 'price', message: 'Price cannot be negative' });
    if (book.categoryId && !book.category?.isActive) errors.push({ field: 'categoryId', message: 'Active category is required' });
    if (book.authorId && !book.author?.isActive) errors.push({ field: 'authorId', message: 'Active author is required' });
    if (book.publisherId && !book.publisher?.isActive) {
      errors.push({ field: 'publisherId', message: 'Active publisher is required' });
    }

    if ([BookFormat.PHYSICAL, BookFormat.BOTH].includes(book.format)) {
      const physical = book.physicalDetails;
      if (!physical) {
        errors.push({ field: 'physicalDetails', message: 'Physical details are required' });
      }
    }

    if ([BookFormat.DIGITAL, BookFormat.BOTH].includes(book.format)) {
      const digital = book.digitalDetails;
      if (!digital) {
        errors.push({ field: 'digitalDetails', message: 'Digital details are required' });
      }
    }

    return errors;
  }
}
