# 🗄️ Database Seeders

Dữ liệu mẫu cho development.

## 📁 Seeder Files

```
database/
├── seeders/
│   ├── index.ts              # Run all seeders
│   ├── 01-users.ts          # User seeders
│   ├── 02-businesses.ts     # Business seeders
│   ├── 03-stores.ts          # Store seeders
│   ├── 04-books.ts           # Book seeders
│   ├── 05-categories.ts      # Category seeders
│   ├── 06-authors.ts         # Author seeders
│   ├── 07-vouchers.ts        # Voucher seeders
│   ├── 08-forums.ts          # Forum seeders
│   └── 09-reviews.ts          # Review seeders
│
├── factories/                # Factory files
│   ├── user.factory.ts
│   ├── book.factory.ts
│   └── ...
│
└── data/                    # Static data
    ├── categories.json
    ├── provinces.json
    ├── mock-registry.json
    └── ...
```

## Running Seeders

```bash
# Run all seeders
npm run seed:all

# Run specific seeder
npm run seed:users
npm run seed:books
npm run seed:vouchers

# Seed with specific count
npm run seed:books -- --count=100

# Reset and seed
npm run db:reset
npm run seed:all

# Seed specific environment
NODE_ENV=staging npm run seed:all
```

## Seeder Data

### Users

| Type | Email | Password | Role |
|------|-------|----------|------|
| Admin | admin@huki.com | Admin123! | PLATFORM_ADMIN |
| Business Owner | business@huki.com | Business123! | BUSINESS |
| Delivery Staff | delivery@huki.com | Delivery123! | DELIVERY_STAFF |
| Regular User | user@huki.com | User123! | USER |

### Categories

```json
[
  { "name": "Programming", "slug": "programming", "parent": null },
  { "name": "Web Development", "slug": "web-development", "parent": "programming" },
  { "name": "Mobile Development", "slug": "mobile-development", "parent": "programming" },
  { "name": "Fiction", "slug": "fiction", "parent": null },
  { "name": "Science Fiction", "slug": "science-fiction", "parent": "fiction" },
  { "name": "Business", "slug": "business", "parent": null },
  { "name": "Self-Help", "slug": "self-help", "parent": null },
  { "name": "Biography", "slug": "biography", "parent": null },
  { "name": "History", "slug": "history", "parent": null },
  { "name": "Science", "slug": "science", "parent": null }
]
```

### Sample Books

```typescript
// Generate 100+ books with realistic data
const books = [
  {
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "978-0132350884",
    price: 250000,
    category: "programming",
    store: "tech-books",
    format: ["PHYSICAL", "DIGITAL"],
    stock: 50
  },
  {
    title: "JavaScript: The Good Parts",
    author: "Douglas Crockford",
    isbn: "978-0596517748",
    price: 149000,
    category: "web-development",
    store: "tech-books",
    format: ["DIGITAL"],
    stock: 0
  },
  // ... 98 more books
]
```

### Mock Business Registry

```json
[
  {
    "enterprise_code": "MST001",
    "tax_code": "0123456789",
    "legal_name": "Công Ty TNHH Tech Books Việt Nam",
    "enterprise_type": "TNHH",
    "province": "Ho Chi Minh City",
    "business_status": "ACTIVE"
  },
  {
    "enterprise_code": "MST002",
    "tax_code": "9876543210",
    "legal_name": "Công Ty CP Sách Văn Hóa",
    "enterprise_type": "Cổ phần",
    "province": "Hà Nội",
    "business_status": "ACTIVE"
  },
  // ... 98 more mock businesses
]
```

## Sample Images

Download from:
- https://picsum.photos (random images)
- https://covers.openlibrary.org (book covers)

## Implementation Example

```typescript
// apps/identity-service/prisma/seed.ts
import { PrismaClient } from './generated/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedUsers() {
  
  const users = [
    {
      email: 'admin@huki.com',
      passwordHash: await bcrypt.hash('Admin123!', 12),
      fullName: 'Admin User',
      role: 'PLATFORM_ADMIN',
      status: 'ACTIVE',
    },
    {
      email: 'user@huki.com',
      passwordHash: await bcrypt.hash('User123!', 12),
      fullName: 'Test User',
      role: 'USER',
      status: 'ACTIVE',
    },
    {
      email: 'business@huki.com',
      passwordHash: await bcrypt.hash('Business123!', 12),
      fullName: 'Business Owner',
      role: 'BUSINESS',
      status: 'ACTIVE',
    },
    {
      email: 'delivery@huki.com',
      passwordHash: await bcrypt.hash('Delivery123!', 12),
      fullName: 'Delivery Staff',
      role: 'DELIVERY_STAFF',
      status: 'ACTIVE',
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      create: user,
      update: {},
    });
  }
}
```

## Environment-Specific Seeders

```typescript
// database/seeders/index.ts
import { dataSource } from './data-source';
import { seedUsers } from './01-users';
import { seedBusinesses } from './02-businesses';
import { seedBooks } from './04-books';

async function seed() {
  const args = process.argv.slice(2);
  const env = process.env.NODE_ENV || 'development';

  console.log(`Seeding in ${env} environment...`);

  await dataSource.initialize();

  if (args.includes('--users') || args.includes('--all')) {
    await seedUsers(dataSource);
  }

  if (args.includes('--businesses') || args.includes('--all')) {
    await seedBusinesses(dataSource);
  }

  if (args.includes('--books') || args.includes('--all')) {
    const count = parseInt(
      args.find(arg => arg.startsWith('--count='))?.split('=')[1] || '50'
    );
    await seedBooks(dataSource, count);
  }

  await dataSource.destroy();
  console.log('Seeding completed!');
}

seed();
```

## Factories (for Testing)

```typescript
// test/factories/book.factory.ts
import { faker } from '@faker-js/faker';

export const makeBook = () => ({
  title: faker.commerce.productName(),
  slug: faker.helpers.slugify(faker.commerce.productName()).toLowerCase(),
  price: faker.number.float({ min: 10000, max: 500000, multipleOf: 1000 }),
  description: faker.lorem.paragraph(),
  isbn: faker.helpers.replaceSymbols('###-#########'),
  status: 'PUBLISHED',
  stock: faker.number.int({ min: 0, max: 100 }),
});

// Usage in tests
const books = await Promise.all(
  Array.from({ length: 10 }, () => prisma.book.create({ data: makeBook() })),
);
```
