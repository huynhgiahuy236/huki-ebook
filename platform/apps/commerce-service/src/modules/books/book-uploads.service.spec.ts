import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Book, BookFormat, DigitalBookDetails } from '../../entities';
import { BookUploadsService, PdfFileKind } from './book-uploads.service';
import { BooksService } from './books.service';
import { CoverStorage, EbookStorage } from './storage/storage.interfaces';

function file(buffer: Buffer, mimetype = 'application/pdf'): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'book.pdf',
    encoding: '7bit',
    mimetype,
    size: buffer.length,
    destination: '',
    filename: '',
    path: '',
    buffer,
    stream: undefined as never,
  };
}

describe('BookUploadsService', () => {
  const book = {
    id: 'book-id',
    storeId: 'store-id',
    format: BookFormat.DIGITAL,
    coverPublicId: null,
  } as Book;
  const details = { bookId: 'book-id', sourcePdfKey: null, previewPdfKey: null } as DigitalBookDetails;
  const bookRepository = { save: jest.fn() } as unknown as Repository<Book>;
  const digitalRepository = {
    findOne: jest.fn().mockResolvedValue(details),
    save: jest.fn(),
  } as unknown as Repository<DigitalBookDetails>;
  const booksService = { findForWrite: jest.fn().mockResolvedValue(book) } as unknown as BooksService;
  const config = { get: jest.fn((_key, fallback) => fallback) } as unknown as ConfigService;
  const coverStorage = { upload: jest.fn(), delete: jest.fn() } as unknown as CoverStorage;
  const ebookStorage = {
    upload: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  } as unknown as EbookStorage;
  const service = new BookUploadsService(
    bookRepository,
    digitalRepository,
    booksService,
    config,
    coverStorage,
    ebookStorage,
  );
  const actor = { sub: 'owner-id', role: 'BUSINESS' };

  beforeEach(() => jest.clearAllMocks());

  it('rejects a fake PDF before uploading', async () => {
    await expect(
      service.uploadPdf('book-id', PdfFileKind.SOURCE, file(Buffer.from('not a pdf')), actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ebookStorage.upload).not.toHaveBeenCalled();
  });

  it('deletes the new R2 object when the database update fails', async () => {
    (digitalRepository.save as jest.Mock).mockRejectedValueOnce(new Error('database failed'));
    await expect(
      service.uploadPdf(
        'book-id',
        PdfFileKind.SOURCE,
        file(Buffer.from('%PDF-1.7 content')),
        actor,
      ),
    ).rejects.toThrow('database failed');
    expect(ebookStorage.upload).toHaveBeenCalled();
    expect(ebookStorage.delete).toHaveBeenCalledWith(expect.stringMatching(/source-.*\.pdf$/));
  });
});
