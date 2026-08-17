import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Book } from './book.entity';

@Entity('digital_book_details')
@Index('uq_digital_book_details_book', ['bookId'], { unique: true })
export class DigitalBookDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'book_id', type: 'uuid' })
  bookId: string;

  @OneToOne(() => Book, (book) => book.digitalDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ name: 'source_pdf_key', type: 'varchar', length: 500, nullable: true })
  sourcePdfKey: string | null;

  @Column({ name: 'preview_pdf_key', type: 'varchar', length: 500, nullable: true })
  previewPdfKey: string | null;

  @Column({ name: 'epub_key', type: 'varchar', length: 500, nullable: true })
  epubKey: string | null;

  @Column({ name: 'digital_enabled', type: 'boolean', default: false })
  digitalEnabled: boolean;

  @Column({ name: 'allow_online_read', type: 'boolean', default: true })
  allowOnlineRead: boolean;

  @Column({ name: 'allow_download', type: 'boolean', default: false })
  allowDownload: boolean;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
