import { Column, Entity, Index } from 'typeorm';
import { CatalogBaseEntity } from './catalog-base.entity';

@Entity('checkout_sessions')
@Index('idx_checkout_sessions_user', ['userId', 'expiresAt'])
export class CheckoutSession extends CatalogBaseEntity {
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column({ name: 'cart_id', type: 'uuid' }) cartId: string;
  @Column({ name: 'cart_updated_at', type: 'timestamp' }) cartUpdatedAt: Date;
  @Column({ type: 'jsonb' }) snapshot: Record<string, unknown>;
  @Column({ name: 'expires_at', type: 'timestamp' }) expiresAt: Date;
  @Column({ name: 'consumed_at', type: 'timestamp', nullable: true }) consumedAt: Date | null;
}

