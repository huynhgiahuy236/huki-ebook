const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres123@localhost:5432/huki_promotion'
    }
  }
});

async function main() {
  const now = new Date();
  const startsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
  const endsAt = new Date(now.getTime() + 10 * 60 * 60 * 1000);  // 10 hours from now
  const regStartsAt = new Date(now.getTime() - 4 * 60 * 60 * 1000);
  const regEndsAt = new Date(now.getTime() - 2 * 60 * 60 * 1000);

  const updated = await prisma.flashSale.update({
    where: { id: 'f5a1e2d3-c4b5-4a6f-8e9d-0c1b2a3f4e5d' },
    data: {
      status: 'ACTIVE',
      startsAt,
      endsAt,
      registrationStartsAt: regStartsAt,
      registrationEndsAt: regEndsAt,
    }
  });
  console.log('Updated flash sale slot:', updated);
}

main().catch(console.error).finally(() => prisma.$disconnect());
