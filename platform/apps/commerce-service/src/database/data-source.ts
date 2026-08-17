import 'dotenv/config';
import { DataSource } from 'typeorm';
import {
  Author,
  Book,
  Category,
  DigitalBookDetails,
  PhysicalBookDetails,
  Publisher,
  InventoryLog,
} from '../entities';
import { CreateCatalogTables1723881600000 } from '../migrations/1723881600000-CreateCatalogTables';
import { CreateBookTables1723968000000 } from '../migrations/1723968000000-CreateBookTables';
import { CreateInventoryLogs1724054400000 } from '../migrations/1724054400000-CreateInventoryLogs';

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres123',
  database: process.env.COMMERCE_DB_NAME || 'commerce_db',
  entities: [
    Category,
    Author,
    Publisher,
    Book,
    PhysicalBookDetails,
    DigitalBookDetails,
    InventoryLog,
  ],
  migrations: [
    CreateCatalogTables1723881600000,
    CreateBookTables1723968000000,
    CreateInventoryLogs1724054400000,
  ],
  synchronize: false,
});
