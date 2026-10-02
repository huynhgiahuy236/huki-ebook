const bcrypt = require('bcrypt');
const { PrismaClient } = require('../apps/identity-service/prisma/generated/client');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Password123!', 10);
  await prisma.user.upsert({
    where: { email: 'huy@gmail.com' },
    update: { passwordHash: hash, status: 'ACTIVE', role: 'USER' },
    create: { email: 'huy@gmail.com', passwordHash: hash, status: 'ACTIVE', role: 'USER', fullName: 'Huỳnh Gia Huy' }
  });
  await prisma.user.updateMany({
    where: { email: { in: ['phuongthuy@gmail.com', 'adminhuki@gmail.com', 'huynh@gmail.com', 'giahuy123@gmail.com'] } },
    data: { passwordHash: hash, status: 'ACTIVE' }
  });
  console.log('PASSWORDS_SYNCHRONIZED_SUCCESS');
}

main().catch(console.error).finally(() => prisma.$disconnect());
