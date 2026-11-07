import { PrismaClient, UserRole, UserStatus } from './generated/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding identity database...');

  const users = [
    {
      email: process.env.USER_SEED_EMAIL || 'user@huki.com', password: process.env.USER_INITIAL_PASSWORD || 'User123!',
      fullName: 'Nguyễn Văn An (Test Buyer)',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
    {
      email: process.env.BUSINESS_SEED_EMAIL || 'business@huki.com', password: process.env.BUSINESS_INITIAL_PASSWORD || 'Business123!',
      fullName: 'Alpha Books Official (Test Business)',
      role: UserRole.BUSINESS,
      status: UserStatus.ACTIVE,
    },
    {
      email: process.env.ADMIN_SEED_EMAIL || 'admin@huki.com', password: process.env.ADMIN_INITIAL_PASSWORD || 'Admin123!',
      fullName: 'HUKI Platform Admin',
      role: UserRole.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
    },
    {
      email: process.env.STAFF_SEED_EMAIL || 'staff@huki.com', password: process.env.STAFF_INITIAL_PASSWORD || 'Staff123!',
      fullName: 'Trần Văn Nhân (Provisioned Admin Con)',
      role: UserRole.BUSINESS,
      status: UserStatus.ACTIVE,
    },
    {
      email: process.env.SHIPPER_SEED_EMAIL || 'shipper@huki.com', password: process.env.SHIPPER_INITIAL_PASSWORD || 'Shipper123!',
      fullName: 'Nguyễn Văn Giao (Shipper HUKI)',
      role: UserRole.DELIVERY_STAFF,
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
        email: userData.email,
        passwordHash,
        fullName: userData.fullName,
        role: userData.role,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });
    console.log(`Seeded user: ${userData.email} (${userData.role})`);
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
