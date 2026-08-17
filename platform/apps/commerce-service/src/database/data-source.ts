import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Author, Category, Publisher } from '../entities';
import { CreateCatalogTables1723881600000 } from '../migrations/1723881600000-CreateCatalogTables';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres123',
  database: process.env.COMMERCE_DB_NAME || 'commerce_db',
  entities: [Category, Author, Publisher],
  migrations: [CreateCatalogTables1723881600000],
  synchronize: false,
});
