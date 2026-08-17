import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { numericTransformer } from '../common/numeric.transformer';
import { CartItemFormat } from './cart-item.entity';
import { CatalogBaseEntity } from './catalog-base.entity';
import { SellerOrder } from './seller-order.entity';

@Entity('order_items')
@Index('idx_order_items_seller_order', ['sellerOrderId'])
export class OrderItem extends CatalogBaseEntity {
  @Column({ name: 'seller_order_id', type: 'uuid' }) sellerOrderId: string;
  @ManyToOne(() => SellerOrder, (sellerOrder) => sellerOrder.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_order_id' }) sellerOrder: SellerOrder;
  @Column({ name: 'book_id', type: 'uuid' }) bookId: string;
  @Column({ name: 'book_title', type: 'varchar', length: 500 }) bookTitle: string;
  @Column({ name: 'book_cover_url', type: 'varchar', length: 500, nullable: true }) bookCoverUrl: string | null;
  @Column({ name: 'book_isbn', type: 'varchar', length: 20, nullable: true }) bookIsbn: string | null;
  @Column({ type: 'enum', enum: CartItemFormat }) format: CartItemFormat;
  @Column({ type: 'int' }) quantity: number;
  @Column({ name: 'unit_price', type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer }) unitPrice: number;
  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: numericTransformer }) subtotal: number;
}

