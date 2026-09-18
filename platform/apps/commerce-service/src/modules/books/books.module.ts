import { Module } from '@nestjs/common';
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
import { BookAccessService } from './book-access.service';
import { ReaderController } from './reader.controller';
import { ReaderService } from './reader.service';
import { ForensicTrackingController } from './forensic-tracking.controller';
import { ForensicTrackingService } from './forensic-tracking.service';

@Module({
  controllers: [
    BooksController,
    PhysicalBooksController,
    DigitalBooksController,
    BookUploadsController,
    BookPublishingController,
    ReaderController,
    ForensicTrackingController,
  ],
  providers: [
    BooksService,
    PhysicalBooksService,
    DigitalBooksService,
    BookUploadsService,
    BookPublishingService,
    BookAccessService,
    ReaderService,
    ForensicTrackingService,
    CloudinaryCoverStorage,
    R2EbookStorage,
    { provide: COVER_STORAGE, useExisting: CloudinaryCoverStorage },
    { provide: EBOOK_STORAGE, useExisting: R2EbookStorage },
  ],
  exports: [BooksService, BookAccessService, ReaderService, ForensicTrackingService],
})
export class BooksModule {}
