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
import { numericTransformer } from '../common/numeric.transformer';
import { Book } from './book.entity';

@Entity('physical_book_details')
@Index('uq_physical_book_details_book', ['bookId'], { unique: true })
export class PhysicalBookDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'book_id', type: 'uuid' })
  bookId: string;

  @OneToOne(() => Book, (book) => book.physicalDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ type: 'int', default: 0 })
  reserved: number;

  @Column({
    type: 'int',
    asExpression: 'stock - reserved',
    generatedType: 'STORED',
  })
  available: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, transformer: numericTransformer })
  weight: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, transformer: numericTransformer })
  length: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, transformer: numericTransformer })
  width: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, transformer: numericTransformer })
  height: number;

  @Column({ name: 'physical_enabled', type: 'boolean', default: false })
  physicalEnabled: boolean;

  @Column({ name: 'low_stock_threshold', type: 'int', default: 10 })
  lowStockThreshold: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
