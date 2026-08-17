import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
} from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { Author } from './author.entity';
import { CatalogBaseEntity } from './catalog-base.entity';
import { Category } from './category.entity';
import { DigitalBookDetails } from './digital-book-details.entity';
import { PhysicalBookDetails } from './physical-book-details.entity';
import { Publisher } from './publisher.entity';

export enum BookFormat {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
  BOTH = 'BOTH',
}

export enum BookStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  HIDDEN = 'HIDDEN',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

@Entity('books')
@Index('uq_books_store_slug', ['storeId', 'slug'], { unique: true })
@Index('idx_books_store_status', ['storeId', 'status'])
@Index('idx_books_owner', ['ownerUserId'])
@Index('idx_books_category', ['categoryId'])
@Index('idx_books_author', ['authorId'])
@Index('idx_books_publisher', ['publisherId'])
@Index('idx_books_status_price', ['status', 'price'])
export class Book extends CatalogBaseEntity {
  @Column({ name: 'store_id', type: 'uuid' })
  storeId: string;

  @Column({ name: 'owner_user_id', type: 'uuid' })
  ownerUserId: string;

  @Column({ type: 'varchar', length: 500 })
  title: string;

  @Column({ name: 'normalized_title', type: 'varchar', length: 500 })
  normalizedTitle: string;

  @Column({ type: 'varchar', length: 500 })
  slug: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  isbn: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, transformer: numericTransformer })
  price: number;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId: string;

  @ManyToOne(() => Author, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'author_id' })
  author: Author;

  @Column({ name: 'publisher_id', type: 'uuid' })
  publisherId: string;

  @ManyToOne(() => Publisher, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'publisher_id' })
  publisher: Publisher;

  @Column({ type: 'enum', enum: BookFormat })
  format: BookFormat;

  @Column({ name: 'cover_url', type: 'varchar', length: 500, nullable: true })
  coverUrl: string | null;

  @Column({ name: 'cover_public_id', type: 'varchar', length: 500, nullable: true })
  coverPublicId: string | null;

  @Column({ type: 'enum', enum: BookStatus, default: BookStatus.DRAFT })
  status: BookStatus;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @OneToOne(() => PhysicalBookDetails, (details) => details.book)
  physicalDetails: PhysicalBookDetails | null;

  @OneToOne(() => DigitalBookDetails, (details) => details.book)
  digitalDetails: DigitalBookDetails | null;
}
