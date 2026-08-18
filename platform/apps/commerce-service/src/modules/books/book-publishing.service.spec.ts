import { UnprocessableEntityException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Book, BookFormat, BookStatus } from '../../entities';
import { BookPublishingService } from './book-publishing.service';
import { BooksService } from './books.service';

function publishableBook(format = BookFormat.PHYSICAL): Book {
  return {
    id: 'book-id',
    storeId: 'store-id',
    ownerUserId: 'owner-id',
    title: 'Valid book',
    normalizedTitle: 'valid book',
    slug: 'valid-book',
    isbn: null,
    description: 'A description long enough',
    price: 100,
    categoryId: 'category-id',
    category: { isActive: true } as never,
    authorId: 'author-id',
    author: { isActive: true } as never,
    publisherId: 'publisher-id',
    publisher: { isActive: true } as never,
    format,
    coverUrl: 'https://cover.example/book.jpg',
    coverPublicId: 'cover-id',
    status: BookStatus.DRAFT,
    publishedAt: null,
    viewCount: 0,
    physicalDetails: {
      stock: 1,
      reserved: 0,
      available: 1,
      weight: 100,
      length: 10,
      width: 10,
      height: 2,
      physicalEnabled: true,
    } as never,
    digitalDetails: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe('BookPublishingService', () => {
  const repository = { save: jest.fn(async (book: Book) => book) } as unknown as Repository<Book>;
  const booksService = { findForWrite: jest.fn() } as unknown as BooksService;
  const events = { emit: jest.fn() } as unknown as EventEmitter2;
  const service = new BookPublishingService(repository, booksService, events);
  const actor = { sub: 'owner-id', role: 'BUSINESS' };

  beforeEach(() => jest.clearAllMocks());

  it('publishes a complete physical book and emits an event', async () => {
    (booksService.findForWrite as jest.Mock).mockResolvedValue(publishableBook());
    const result = await service.publish('book-id', actor);
    expect(result).toMatchObject({ status: BookStatus.PUBLISHED });
    expect(events.emit).toHaveBeenCalledWith('book.published', expect.any(Object));
  });

  it('returns 422 when a digital book has no files or permissions', async () => {
    const book = publishableBook(BookFormat.DIGITAL);
    book.physicalDetails = null;
    book.digitalDetails = {
      digitalEnabled: true,
      sourcePdfKey: null,
      previewPdfKey: null,
      allowOnlineRead: false,
      allowDownload: false,
    } as never;
    (booksService.findForWrite as jest.Mock).mockResolvedValue(book);
    await expect(service.publish('book-id', actor)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });
});
