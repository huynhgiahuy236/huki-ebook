import { PrismaClient, UserRole, UserStatus } from './generated/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding identity database...');

  const users = [
    {
      email: 'user@huki.com',
      password: 'User123!',
      fullName: 'Nguyễn Văn An (Test Buyer)',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'business@huki.com',
      password: 'Business123!',
      fullName: 'Alpha Books Official (Test Business)',
      role: UserRole.BUSINESS,
      status: UserStatus.ACTIVE,
    },
    {
      email: 'admin@huki.com',
      password: 'Admin123!',
      fullName: 'HUKI Platform Admin',
      role: UserRole.PLATFORM_ADMIN,
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
