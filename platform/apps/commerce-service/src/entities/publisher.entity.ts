import { Column, Entity, Index } from 'typeorm';
import { CatalogBaseEntity } from './catalog-base.entity';

@Entity('publishers')
@Index('idx_publishers_slug', ['slug'], { unique: true })
@Index('idx_publishers_normalized_name', ['normalizedName'], { unique: true })
@Index('idx_publishers_active', ['isActive'])
export class Publisher extends CatalogBaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'normalized_name', type: 'varchar', length: 255 })
  normalizedName: string;

  @Column({ type: 'varchar', length: 255 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  website: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
