const { PrismaClient } = require('./apps/commerce-service/prisma/generated/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce'
    }
  }
});

async function main() {
  const wallets = await prisma.wallet.findMany();
  console.log(`Found ${wallets.length} wallets in commerce db.`);
  const defaultPinHash = await bcrypt.hash('123456', 10);

  for (const wallet of wallets) {
    const sec = await prisma.walletSecurity.findUnique({
      where: { storeId: wallet.storeId }
    });
    if (!sec) {
      await prisma.walletSecurity.create({
        data: {
          walletId: wallet.id,
          storeId: wallet.storeId,
          pinHash: defaultPinHash,
          pinSetAt: new Date(),
          failedAttempts: 0
        }
      });
      console.log(`Created WalletSecurity with PIN 123456 for store ${wallet.storeId}`);
    } else if (!sec.pinHash) {
      await prisma.walletSecurity.update({
        where: { storeId: wallet.storeId },
        data: {
          pinHash: defaultPinHash,
          pinSetAt: new Date()
        }
      });
      console.log(`Updated PIN to 123456 for store ${wallet.storeId}`);
    } else {
      console.log(`Store ${wallet.storeId} already has PIN set`);
    }
  }
  console.log('Done checking and setting default PIN 123456.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
