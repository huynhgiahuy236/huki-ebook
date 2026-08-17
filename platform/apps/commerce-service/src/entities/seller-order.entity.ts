import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { CatalogBaseEntity } from './catalog-base.entity';
import { Order } from './order.entity';
import { OrderItem } from './order-item.entity';
import { SellerOrderStatus } from './order.enums';

@Entity('seller_orders')
@Index('uq_seller_orders_code', ['code'], { unique: true })
@Index('idx_seller_orders_owner_status', ['ownerUserId', 'status'])
export class SellerOrder extends CatalogBaseEntity {
  @Column({ name: 'order_id', type: 'uuid' }) orderId: string;
  @ManyToOne(() => Order, (order) => order.sellerOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' }) order: Order;
  @Column({ type: 'varchar', length: 50 }) code: string;
  @Column({ name: 'store_id', type: 'uuid' }) storeId: string;
  @Column({ name: 'owner_user_id', type: 'uuid' }) ownerUserId: string;
  @Column({ name: 'requires_shipping', type: 'boolean' }) requiresShipping: boolean;
  @Column({ name: 'item_subtotal', type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer }) itemSubtotal: number;
  @Column({ name: 'shipping_fee', type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer }) shippingFee: number;
  @Column({ name: 'grand_total', type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer }) grandTotal: number;
  @Column({ type: 'enum', enum: SellerOrderStatus }) status: SellerOrderStatus;
  @Column({ name: 'carrier', type: 'varchar', length: 100, nullable: true }) carrier: string | null;
  @Column({ name: 'tracking_code', type: 'varchar', length: 100, nullable: true }) trackingCode: string | null;
  @Column({ name: 'confirmed_at', type: 'timestamp', nullable: true }) confirmedAt: Date | null;
  @Column({ name: 'shipped_at', type: 'timestamp', nullable: true }) shippedAt: Date | null;
  @Column({ name: 'completed_at', type: 'timestamp', nullable: true }) completedAt: Date | null;
  @Column({ name: 'cancelled_at', type: 'timestamp', nullable: true }) cancelledAt: Date | null;
  @Column({ name: 'cancel_reason', type: 'varchar', length: 500, nullable: true }) cancelReason: string | null;
  @OneToMany(() => OrderItem, (item) => item.sellerOrder) items: OrderItem[];
}

