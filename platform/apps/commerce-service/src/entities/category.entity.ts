import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { CatalogBaseEntity } from './catalog-base.entity';

@Entity('categories')
@Index('idx_categories_slug', ['slug'], { unique: true })
@Index('idx_categories_parent', ['parentId'])
@Index('idx_categories_active_sort', ['isActive', 'sortOrder'])
export class Category extends CatalogBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'normalized_name', type: 'varchar', length: 255 })
  normalizedName: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Category, (category) => category.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Category | null;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @Column({ type: 'smallint', default: 0 })
  depth: number;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
