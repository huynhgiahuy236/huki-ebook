import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Book } from './book.entity';
import { Cart } from './cart.entity';
import { CatalogBaseEntity } from './catalog-base.entity';

export enum CartItemFormat {
  PHYSICAL = 'PHYSICAL',
  DIGITAL = 'DIGITAL',
}

@Entity('cart_items')
@Index('uq_cart_items_cart_book_format', ['cartId', 'bookId', 'format'], {
  unique: true,
})
export class CartItem extends CatalogBaseEntity {
  @Column({ name: 'cart_id', type: 'uuid' })
  cartId: string;

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @Column({ name: 'book_id', type: 'uuid' })
  bookId: string;

  @ManyToOne(() => Book, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ type: 'enum', enum: CartItemFormat })
  format: CartItemFormat;

  @Column({ type: 'int' })
  quantity: number;
}
