import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { CatalogBaseEntity } from './catalog-base.entity';

export enum AccessStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

@Entity('book_accesses')
@Index('uq_book_accesses_user_book', ['userId', 'bookId'], { unique: true })
@Index('idx_book_accesses_user', ['userId'])
@Index('idx_book_accesses_book', ['bookId'])
export class BookAccess extends CatalogBaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'book_id', type: 'uuid' })
  bookId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'seller_order_id', type: 'uuid', nullable: true })
  sellerOrderId: string | null;

  @Column({ name: 'access_key', type: 'varchar', length: 500, nullable: true })
  accessKey: string | null;

  @Column({ name: 'signed_url_expires_at', type: 'timestamp', nullable: true })
  signedUrlExpiresAt: Date | null;

  @Column({ name: 'reading_progress', type: 'int', default: 0 })
  readingProgress: number;

  @Column({ name: 'last_read_at', type: 'timestamp', nullable: true })
  lastReadAt: Date | null;

  @Column({ type: 'enum', enum: AccessStatus, default: AccessStatus.ACTIVE })
  status: AccessStatus;

  @Column({ name: 'download_count', type: 'int', default: 0 })
  downloadCount: number;
}
