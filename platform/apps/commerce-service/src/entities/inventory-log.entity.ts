import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Book } from './book.entity';

export enum InventoryOperation {
  SET = 'SET',
  ADD = 'ADD',
  SUBTRACT = 'SUBTRACT',
}

export enum InventoryReason {
  RESTOCK = 'RESTOCK',
  ADJUSTMENT = 'ADJUSTMENT',
  RETURN = 'RETURN',
  SALE = 'SALE',
}

@Entity('inventory_logs')
@Index('idx_inventory_logs_book_created', ['bookId', 'createdAt'])
export class InventoryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'book_id', type: 'uuid' })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ name: 'performed_by', type: 'uuid' })
  performedBy: string;

  @Column({ type: 'enum', enum: InventoryOperation })
  operation: InventoryOperation;

  @Column({ type: 'enum', enum: InventoryReason })
  reason: InventoryReason;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'stock_before', type: 'int' })
  stockBefore: number;

  @Column({ name: 'stock_after', type: 'int' })
  stockAfter: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
