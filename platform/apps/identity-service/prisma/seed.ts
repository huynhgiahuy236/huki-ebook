import { PrismaClient, UserRole, UserStatus } from './generated/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding identity database...');

  const users = [
    {
      id: 'usr0-0000-4000-8000-000000000001',
      email: process.env.USER_SEED_EMAIL || 'user@huki.com', password: process.env.USER_INITIAL_PASSWORD || 'User123!',
      fullName: 'Nguyễn Văn An (Test Buyer)',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
    {
      id: 'biz0-0000-4000-8000-000000000002',
      email: process.env.BUSINESS_SEED_EMAIL || 'business@huki.com', password: process.env.BUSINESS_INITIAL_PASSWORD || 'Business123!',
      fullName: 'Alpha Books Official (Test Business)',
      role: UserRole.BUSINESS,
      status: UserStatus.ACTIVE,
    },
    {
      id: 'adm0-0000-4000-8000-000000000001',
      email: process.env.ADMIN_SEED_EMAIL || 'admin@huki.com', password: process.env.ADMIN_INITIAL_PASSWORD || 'Admin123!',
      fullName: 'HUKI Platform Admin',
      role: UserRole.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
    },
    {
      id: 'ship-0000-4000-8000-000000000003',
      email: process.env.SHIPPER_SEED_EMAIL || 'shipper@huki.com', password: process.env.SHIPPER_INITIAL_PASSWORD || 'Shipper123!',
      fullName: 'Nguyễn Văn Giao (Shipper HUKI)',
      role: UserRole.DELIVERY_STAFF,
      status: UserStatus.ACTIVE,
    },
    {
      id: 'aff0-0000-4000-8000-000000000004',
      email: process.env.AFFILIATE_SEED_EMAIL || 'affiliate@huki.com', password: process.env.AFFILIATE_INITIAL_PASSWORD || 'Affiliate123!',
      fullName: 'Trần Review Sách (Top KOC)',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
  ];

  for (const userData of users) {
    const passwordHash = await bcrypt.hash(userData.password, 12);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        status: UserStatus.ACTIVE,
        passwordHash,
      },
      create: {
        id: userData.id,
        email: userData.email,
        passwordHash,
        fullName: userData.fullName,
        role: userData.role,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Seeded user: ${userData.email} (${userData.role}) [${userData.id}]`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
