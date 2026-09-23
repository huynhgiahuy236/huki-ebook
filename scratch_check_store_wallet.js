const { PrismaClient } = require('d:/doan_huki_ebook/huki-ebook/platform/apps/commerce-service/src/prisma/generated/client');
const prisma = new PrismaClient();

async function check() {
  const storeId = 'a6f56336-c876-481a-9c29-9898d638fb42';
  console.log('Checking store in commerce_db:', storeId);
  const wallet = await prisma.wallet.findUnique({ where: { storeId } });
  console.log('Wallet:', wallet);

  const security = await prisma.walletSecurity.findUnique({ where: { storeId } });
  console.log('WalletSecurity:', security);

  const allWallets = await prisma.wallet.findMany();
  console.log('Total wallets in DB:', allWallets.length);
  for (const w of allWallets) {
    console.log(`- Wallet storeId: ${w.storeId}, ownerUserId: ${w.ownerUserId}, available: ${w.availableBalance}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
