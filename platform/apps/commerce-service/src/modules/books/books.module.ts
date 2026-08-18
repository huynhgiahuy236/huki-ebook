import { Module } from '@nestjs/common';
import { BookWriteGuard, OptionalBookAuthGuard } from '../../common/book-auth.guard';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { PhysicalBooksController } from './physical-books.controller';
import { PhysicalBooksService } from './physical-books.service';
import { DigitalBooksController } from './digital-books.controller';
import { DigitalBooksService } from './digital-books.service';
import { BookUploadsController } from './book-uploads.controller';
import { BookUploadsService } from './book-uploads.service';
import { CloudinaryCoverStorage } from './storage/cloudinary-cover.storage';
import { R2EbookStorage } from './storage/r2-ebook.storage';
import { COVER_STORAGE, EBOOK_STORAGE } from './storage/storage.interfaces';
import { BookPublishingController } from './book-publishing.controller';
import { BookPublishingService } from './book-publishing.service';

@Module({
  controllers: [
    BooksController,
    PhysicalBooksController,
    DigitalBooksController,
    BookUploadsController,
    BookPublishingController,
  ],
  providers: [
    BooksService,
    PhysicalBooksService,
    DigitalBooksService,
    BookUploadsService,
    BookPublishingService,
    CloudinaryCoverStorage,
    R2EbookStorage,
    { provide: COVER_STORAGE, useExisting: CloudinaryCoverStorage },
    { provide: EBOOK_STORAGE, useExisting: R2EbookStorage },
    BookWriteGuard,
    OptionalBookAuthGuard,
  ],
  exports: [BooksService],
})
export class BooksModule {}
