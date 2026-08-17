import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { OutboxStatus } from './order.enums';

@Entity('outbox_events')
@Index('idx_outbox_status_occurred', ['status', 'occurredAt'])
export class OutboxEvent {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'event_id', type: 'uuid', unique: true }) eventId: string;
  @Column({ type: 'varchar', length: 100 }) type: string;
  @Column({ name: 'aggregate_id', type: 'uuid' }) aggregateId: string;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ type: 'enum', enum: OutboxStatus, default: OutboxStatus.PENDING }) status: OutboxStatus;
  @CreateDateColumn({ name: 'occurred_at' }) occurredAt: Date;
  @Column({ name: 'published_at', type: 'timestamp', nullable: true }) publishedAt: Date | null;
}
