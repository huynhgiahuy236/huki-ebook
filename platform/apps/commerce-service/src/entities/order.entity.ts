import { Column, Entity, Index, OneToMany } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { CatalogBaseEntity } from './catalog-base.entity';
import { OrderStatus, PaymentMethod, PaymentStatus } from './order.enums';
import { SellerOrder } from './seller-order.entity';

export interface ShippingAddress {
  recipientName: string; phone: string; line1: string;
  ward?: string; district?: string; province: string;
}

@Entity('orders')
@Index('uq_orders_user_idempotency', ['userId', 'idempotencyKey'], { unique: true })
@Index('uq_orders_code', ['code'], { unique: true })
@Index('idx_orders_user_created', ['userId', 'createdAt'])
export class Order extends CatalogBaseEntity {
  @Column({ name: 'user_id', type: 'uuid' }) userId: string;
  @Column({ type: 'varchar', length: 40 }) code: string;
  @Column({ name: 'idempotency_key', type: 'varchar', length: 100 }) idempotencyKey: string;
  @Column({ name: 'item_subtotal', type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer }) itemSubtotal: number;
  @Column({ name: 'shipping_total', type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer }) shippingTotal: number;
  @Column({ name: 'discount_total', type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer, default: 0 }) discountTotal: number;
  @Column({ name: 'grand_total', type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer }) grandTotal: number;
  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod }) paymentMethod: PaymentMethod;
  @Column({ name: 'payment_provider', type: 'varchar', length: 50, nullable: true }) paymentProvider: string | null;
  @Column({ name: 'payment_status', type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }) paymentStatus: PaymentStatus;
  @Column({ type: 'enum', enum: OrderStatus }) status: OrderStatus;
  @Column({ name: 'shipping_address', type: 'jsonb', nullable: true }) shippingAddress: ShippingAddress | null;
  @Column({ type: 'text', nullable: true }) note: string | null;
  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true }) cancelledAt: Date | null;
  @Column({ name: 'cancel_reason', type: 'varchar', length: 500, nullable: true }) cancelReason: string | null;
  @OneToMany(() => SellerOrder, (sellerOrder) => sellerOrder.order) sellerOrders: SellerOrder[];
}

