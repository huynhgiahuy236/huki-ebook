const path = require('path');
const { PrismaClient } = require(path.resolve(__dirname, '../apps/commerce-service/prisma/generated/client'));
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' } },
});

async function run() {
  const updatedPayouts = await prisma.payoutRequest.updateMany({
    where: { status: { in: ['PENDING', 'APPROVED'] } },
    data: { status: 'COMPLETED', disbursedAt: new Date() },
  });
  console.log('Updated payouts to COMPLETED:', updatedPayouts.count);

  const updatedWallets = await prisma.wallet.updateMany({
    where: { frozenBalance: { gt: 0 } },
    data: { frozenBalance: 0 },
  });
  console.log('Reset frozen balance to 0 in wallets:', updatedWallets.count);

  const wallets = await prisma.wallet.findMany();
  console.log('Current Wallets after cleanup:');
  for (const w of wallets) {
    console.log(`- Wallet ${w.id}: storeId ${w.storeId}, Available: ${w.availableBalance}, Pending: ${w.pendingBalance}, Frozen: ${w.frozenBalance}`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
