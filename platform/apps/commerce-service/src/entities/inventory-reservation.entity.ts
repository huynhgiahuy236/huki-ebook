import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { OrderItem } from './order-item.entity';
import { ReservationStatus } from './order.enums';

@Entity('inventory_reservations')
@Index('idx_inventory_reservations_order', ['orderId', 'status'])
@Index('idx_inventory_reservations_book', ['bookId', 'status'])
export class InventoryReservation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'order_id', type: 'uuid' }) orderId: string;
  @Column({ name: 'order_item_id', type: 'uuid' }) orderItemId: string;
  @ManyToOne(() => OrderItem, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'order_item_id' }) orderItem: OrderItem;
  @Column({ name: 'book_id', type: 'uuid' }) bookId: string;
  @Column({ type: 'int' }) quantity: number;
  @Column({ type: 'enum', enum: ReservationStatus }) status: ReservationStatus;
  @Column({ name: 'expires_at', type: 'timestamp', nullable: true }) expiresAt: Date | null;
  @Column({ name: 'committed_at', type: 'timestamp', nullable: true }) committedAt: Date | null;
  @Column({ name: 'released_at', type: 'timestamp', nullable: true }) releasedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}

