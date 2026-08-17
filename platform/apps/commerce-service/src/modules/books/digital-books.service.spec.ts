import { Repository } from 'typeorm';
import { BookFormat, DigitalBookDetails } from '../../entities';
import { BooksService } from './books.service';
import { DigitalBooksService } from './digital-books.service';

describe('DigitalBooksService', () => {
  const privateDetails = {
    id: 'digital-id',
    bookId: 'book-id',
    sourcePdfKey: 'private/source.pdf',
    previewPdfKey: 'private/preview.pdf',
    epubKey: null,
    digitalEnabled: true,
    allowOnlineRead: true,
    allowDownload: false,
    fileSize: '1000',
    mimeType: 'application/pdf',
    checksum: 'secret-checksum',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as DigitalBookDetails;
  const repository = {
    findOne: jest.fn().mockResolvedValue(privateDetails),
    save: jest.fn(async (value: DigitalBookDetails) => value),
  } as unknown as Repository<DigitalBookDetails>;
  const booksService = {
    findForWrite: jest.fn().mockResolvedValue({ format: BookFormat.DIGITAL }),
  } as unknown as BooksService;
  const service = new DigitalBooksService(repository, booksService);

  it('never exposes private R2 keys or checksum', async () => {
    const result = await service.get('book-id', { sub: 'owner-id', role: 'BUSINESS' });
    expect(result).toMatchObject({ hasSourceFile: true, hasPreviewFile: true });
    expect(result).not.toHaveProperty('sourcePdfKey');
    expect(result).not.toHaveProperty('previewPdfKey');
    expect(result).not.toHaveProperty('checksum');
  });
});
