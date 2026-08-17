import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookTables1723968000000 implements MigrationInterface {
  name = 'CreateBookTables1723968000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE book_format AS ENUM ('PHYSICAL', 'DIGITAL', 'BOTH')`,
    );
    await queryRunner.query(
      `CREATE TYPE book_status AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN', 'SUSPENDED', 'ARCHIVED')`,
    );
    await queryRunner.query(`
      CREATE TABLE books (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        store_id uuid NOT NULL,
        owner_user_id uuid NOT NULL,
        title varchar(500) NOT NULL,
        normalized_title varchar(500) NOT NULL,
        slug varchar(500) NOT NULL,
        isbn varchar(20),
        description text NOT NULL,
        price decimal(12,2) NOT NULL CHECK (price >= 0),
        category_id uuid NOT NULL,
        author_id uuid NOT NULL,
        publisher_id uuid NOT NULL,
        format book_format NOT NULL,
        cover_url varchar(500),
        cover_public_id varchar(500),
        status book_status NOT NULL DEFAULT 'DRAFT',
        published_at timestamp,
        view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
        search_vector tsvector GENERATED ALWAYS AS (
          to_tsvector('simple', normalized_title || ' ' || COALESCE(isbn, ''))
        ) STORED,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp,
        CONSTRAINT books_category_fk FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        CONSTRAINT books_author_fk FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE RESTRICT,
        CONSTRAINT books_publisher_fk FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE RESTRICT,
        CONSTRAINT uq_books_store_slug UNIQUE (store_id, slug)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_books_store_status ON books(store_id, status)');
    await queryRunner.query('CREATE INDEX idx_books_owner ON books(owner_user_id)');
    await queryRunner.query('CREATE INDEX idx_books_category ON books(category_id)');
    await queryRunner.query('CREATE INDEX idx_books_author ON books(author_id)');
    await queryRunner.query('CREATE INDEX idx_books_publisher ON books(publisher_id)');
    await queryRunner.query('CREATE INDEX idx_books_status_price ON books(status, price)');
    await queryRunner.query('CREATE INDEX idx_books_created ON books(created_at DESC)');
    await queryRunner.query('CREATE INDEX idx_books_isbn ON books(isbn) WHERE isbn IS NOT NULL');
    await queryRunner.query('CREATE INDEX idx_books_fts ON books USING GIN(search_vector)');
    await queryRunner.query('CREATE INDEX idx_books_title_trgm ON books USING GIN(normalized_title gin_trgm_ops)');

    await queryRunner.query(`
      CREATE TABLE physical_book_details (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id uuid NOT NULL UNIQUE,
        stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
        reserved integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
        available integer GENERATED ALWAYS AS (stock - reserved) STORED,
        weight decimal(8,2) NOT NULL CHECK (weight > 0),
        length decimal(8,2) NOT NULL CHECK (length > 0),
        width decimal(8,2) NOT NULL CHECK (width > 0),
        height decimal(8,2) NOT NULL CHECK (height > 0),
        physical_enabled boolean NOT NULL DEFAULT false,
        low_stock_threshold integer NOT NULL DEFAULT 10 CHECK (low_stock_threshold >= 0),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT physical_book_details_book_fk FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        CONSTRAINT physical_book_stock_check CHECK (reserved <= stock)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_physical_available ON physical_book_details(available)');

    await queryRunner.query(`
      CREATE TABLE digital_book_details (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id uuid NOT NULL UNIQUE,
        source_pdf_key varchar(500),
        preview_pdf_key varchar(500),
        epub_key varchar(500),
        digital_enabled boolean NOT NULL DEFAULT false,
        allow_online_read boolean NOT NULL DEFAULT true,
        allow_download boolean NOT NULL DEFAULT false,
        file_size bigint,
        mime_type varchar(100),
        checksum varchar(64),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT digital_book_details_book_fk FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        CONSTRAINT digital_file_size_check CHECK (file_size IS NULL OR file_size >= 0)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS digital_book_details');
    await queryRunner.query('DROP TABLE IF EXISTS physical_book_details');
    await queryRunner.query('DROP TABLE IF EXISTS books');
    await queryRunner.query('DROP TYPE IF EXISTS book_status');
    await queryRunner.query('DROP TYPE IF EXISTS book_format');
  }
}
