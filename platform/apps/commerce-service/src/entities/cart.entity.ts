import { Column, Entity, Index, OneToMany } from 'typeorm';
import { CatalogBaseEntity } from './catalog-base.entity';
import { CartItem } from './cart-item.entity';

@Entity('carts')
@Index('uq_carts_user', ['userId'], { unique: true })
export class Cart extends CatalogBaseEntity {
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @OneToMany(() => CartItem, (item) => item.cart)
  items: CartItem[];
}
