import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCatalogTables1723881600000 implements MigrationInterface {
  name = 'CreateCatalogTables1723881600000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

    await queryRunner.query(`
      CREATE TABLE categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        normalized_name varchar(255) NOT NULL,
        slug varchar(255) NOT NULL UNIQUE,
        description text,
        parent_id uuid,
        depth smallint NOT NULL DEFAULT 0 CHECK (depth BETWEEN 0 AND 4),
        sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
        is_active boolean NOT NULL DEFAULT true,
        search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', normalized_name)) STORED,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp,
        CONSTRAINT categories_parent_fk FOREIGN KEY (parent_id)
          REFERENCES categories(id) ON DELETE RESTRICT,
        CONSTRAINT categories_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_categories_parent_normalized_name
      ON categories (COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), normalized_name)
      WHERE deleted_at IS NULL
    `);
    await queryRunner.query('CREATE INDEX idx_categories_parent ON categories(parent_id)');
    await queryRunner.query('CREATE INDEX idx_categories_active_sort ON categories(is_active, sort_order)');
    await queryRunner.query('CREATE INDEX idx_categories_search ON categories USING GIN (normalized_name gin_trgm_ops)');
    await queryRunner.query('CREATE INDEX idx_categories_fts ON categories USING GIN (search_vector)');

    await queryRunner.query(`
      CREATE TABLE authors (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        normalized_name varchar(255) NOT NULL,
        slug varchar(255) NOT NULL UNIQUE,
        bio text,
        avatar_url varchar(500),
        is_active boolean NOT NULL DEFAULT true,
        search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', normalized_name)) STORED,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp,
        CONSTRAINT authors_normalized_name_unique UNIQUE (normalized_name)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_authors_active ON authors(is_active)');
    await queryRunner.query('CREATE INDEX idx_authors_search ON authors USING GIN (normalized_name gin_trgm_ops)');
    await queryRunner.query('CREATE INDEX idx_authors_fts ON authors USING GIN (search_vector)');

    await queryRunner.query(`
      CREATE TABLE publishers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(255) NOT NULL,
        normalized_name varchar(255) NOT NULL,
        slug varchar(255) NOT NULL UNIQUE,
        description text,
        logo_url varchar(500),
        website varchar(500),
        is_active boolean NOT NULL DEFAULT true,
        search_vector tsvector GENERATED ALWAYS AS (to_tsvector('simple', normalized_name)) STORED,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp,
        CONSTRAINT publishers_normalized_name_unique UNIQUE (normalized_name)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_publishers_active ON publishers(is_active)');
    await queryRunner.query('CREATE INDEX idx_publishers_search ON publishers USING GIN (normalized_name gin_trgm_ops)');
    await queryRunner.query('CREATE INDEX idx_publishers_fts ON publishers USING GIN (search_vector)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS publishers');
    await queryRunner.query('DROP TABLE IF EXISTS authors');
    await queryRunner.query('DROP TABLE IF EXISTS categories');
  }
}
