import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryLogs1724054400000 implements MigrationInterface {
  name = 'CreateInventoryLogs1724054400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE inventory_operation AS ENUM ('SET', 'ADD', 'SUBTRACT')`);
    await queryRunner.query(`CREATE TYPE inventory_reason AS ENUM ('RESTOCK', 'ADJUSTMENT', 'RETURN', 'SALE')`);
    await queryRunner.query(`
      CREATE TABLE inventory_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        book_id uuid NOT NULL,
        performed_by uuid NOT NULL,
        operation inventory_operation NOT NULL,
        reason inventory_reason NOT NULL,
        quantity integer NOT NULL CHECK (quantity >= 0),
        stock_before integer NOT NULL CHECK (stock_before >= 0),
        stock_after integer NOT NULL CHECK (stock_after >= 0),
        created_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT inventory_logs_book_fk FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX idx_inventory_logs_book_created ON inventory_logs(book_id, created_at DESC)',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS inventory_logs');
    await queryRunner.query('DROP TYPE IF EXISTS inventory_reason');
    await queryRunner.query('DROP TYPE IF EXISTS inventory_operation');
  }
}
