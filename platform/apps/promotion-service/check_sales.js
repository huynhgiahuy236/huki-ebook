const { PrismaClient } = require('./prisma/generated/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:postgres123@localhost:5432/huki_promotion'
    }
  }
});

async function main() {
  const sales = await prisma.flashSale.findMany({
    include: { items: true }
  });
  console.log('FlashSales count:', sales.length);
  sales.forEach(s => {
    console.log({
      id: s.id,
      name: s.name,
      scope: s.scope,
      status: s.status,
      startsAt: s.startsAt,
      endsAt: s.endsAt,
      registrationStartsAt: s.registrationStartsAt,
      registrationEndsAt: s.registrationEndsAt,
      itemCount: s.items.length
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
