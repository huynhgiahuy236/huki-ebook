import { Column, Entity, Index } from 'typeorm';
import { CatalogBaseEntity } from './catalog-base.entity';

@Entity('authors')
@Index('idx_authors_slug', ['slug'], { unique: true })
@Index('idx_authors_normalized_name', ['normalizedName'], { unique: true })
@Index('idx_authors_active', ['isActive'])
export class Author extends CatalogBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'normalized_name', type: 'varchar', length: 255 })
  normalizedName: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
