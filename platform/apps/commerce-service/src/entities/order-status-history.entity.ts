import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { HistoryActorType } from './order.enums';

@Entity('order_status_history')
@Index('idx_order_history_order_created', ['orderId', 'createdAt'])
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'order_id', type: 'uuid' }) orderId: string;
  @Column({ name: 'seller_order_id', type: 'uuid', nullable: true }) sellerOrderId: string | null;
  @Column({ name: 'from_status', type: 'varchar', length: 50, nullable: true }) fromStatus: string | null;
  @Column({ name: 'to_status', type: 'varchar', length: 50 }) toStatus: string;
  @Column({ type: 'varchar', length: 150 }) title: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ name: 'actor_type', type: 'enum', enum: HistoryActorType }) actorType: HistoryActorType;
  @Column({ name: 'actor_id', type: 'uuid', nullable: true }) actorId: string | null;
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, unknown> | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}

