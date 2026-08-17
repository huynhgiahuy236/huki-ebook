import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCartTables1724140800000 implements MigrationInterface {
  name = 'CreateCartTables1724140800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE cart_item_format AS ENUM ('PHYSICAL', 'DIGITAL')`);
    await queryRunner.query(`
      CREATE TABLE carts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL UNIQUE,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp
      )
    `);
    await queryRunner.query(`
      CREATE TABLE cart_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cart_id uuid NOT NULL,
        book_id uuid NOT NULL,
        format cart_item_format NOT NULL,
        quantity integer NOT NULL CHECK (quantity > 0),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamp,
        CONSTRAINT cart_items_cart_fk FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
        CONSTRAINT cart_items_book_fk FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
        CONSTRAINT uq_cart_items_cart_book_format UNIQUE (cart_id, book_id, format)
      )
    `);
    await queryRunner.query('CREATE INDEX idx_cart_items_cart ON cart_items(cart_id)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS cart_items');
    await queryRunner.query('DROP TABLE IF EXISTS carts');
    await queryRunner.query('DROP TYPE IF EXISTS cart_item_format');
  }
}
