import { Column, Entity, Index, JoinColumn, OneToOne } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { CatalogBaseEntity } from './catalog-base.entity';
import { Order } from './order.entity';
import { PaymentMethod, PaymentStatus } from './order.enums';

@Entity('payments')
@Index('uq_payments_order', ['orderId'], { unique: true })
@Index('idx_payments_transaction', ['transactionId'])
export class Payment extends CatalogBaseEntity {
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @OneToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'amount', type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer })
  amount: number;

  @Column({ name: 'method', type: 'enum', enum: PaymentMethod })
  method: PaymentMethod;

  @Column({ name: 'status', type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Column({ name: 'provider', type: 'varchar', length: 50, nullable: true })
  provider: string | null;

  @Column({ name: 'transaction_id', type: 'varchar', length: 100, nullable: true })
  transactionId: string | null;

  @Column({ name: 'payos_order_id', type: 'varchar', length: 100, nullable: true })
  payosOrderId: string | null;

  @Column({ name: 'payos_payment_link_id', type: 'varchar', length: 100, nullable: true })
  payosPaymentLinkId: string | null;

  @Column({ name: 'payos_return_code', type: 'varchar', length: 50, nullable: true })
  payosReturnCode: string | null;

  @Column({ name: 'callback_data', type: 'jsonb', nullable: true })
  callbackData: Record<string, unknown> | null;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'failed_at', type: 'timestamp', nullable: true })
  failedAt: Date | null;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason: string | null;
}
